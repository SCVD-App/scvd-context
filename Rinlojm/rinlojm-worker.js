// ══════════════════════════════════════════════════════════
// rinlojM — cross-portfolio admin grant tool
// One Worker, serves its own minimal frontend AND the gated API.
// Not linked from anywhere, not on GitHub Pages — obscurity is deliberate,
// but the PIN and secret phrase are checked HERE, server-side, precisely
// because obscurity alone (an unlisted workers.dev URL) is not security.
//
// Required setup in Cloudflare:
//   - KV namespace bound as RINLOJM (matches whatever variable name the binding actually uses in Cloudflare — check the Bindings tab if this ever needs changing) (rate-limit counters + grant log)
//   - Secret: RINLOJM_PIN              (4 digits, e.g. "7241")
//   - Secret: RINLOJM_PHRASE           (long random string — the real gate)
//   - Secret: MICDROP_ADMIN_KEY        (same value as Mic Drop's MICDROP_TOKEN_SECRET)
//   - Secret: CC_ADMIN_KEY             (same value as Cult Connections' ADMIN_KEY)
//   - Var:    MICDROP_URL              (e.g. https://mic-drop.<sub>.workers.dev)
//   - Var:    CC_URL                   (e.g. https://cult-connections.<sub>.workers.dev)
//
// Per-app config below is the ONLY place a new app's shape needs adding —
// everything else (PIN gate, phrase gate, rate limiting, audit log,
// frontend) is shared.
// ══════════════════════════════════════════════════════════

// ── PER-APP ADAPTERS ──
// Each entry knows how to turn (tier, email) into a real grant call against
// that app's own worker. Add a new app here only — nothing else changes.
const APPS = {
  micdrop: {
    label: "Mic Drop",
    tiers: [
      { id: "monthly",  label: "1 Month"  },
      { id: "biannual", label: "6 Months" },
      { id: "lifetime", label: "Lifetime" },
    ],
    grant: async (env, tier, email) => {
      const res = await fetch(`${env.MICDROP_URL}/admin/generate-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminKey: env.MICDROP_ADMIN_KEY, type: tier, days: tier === "lifetime" ? undefined : (tier === "monthly" ? 30 : 180) }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || `Mic Drop grant failed (${res.status})`);
      // Mic Drop's admin endpoint doesn't email — return the token directly
      // for you to relay, since there's no email/tier metadata attached here.
      return { token: data.token, emailSent: false, note: "Mic Drop admin tokens aren't emailed — copy this to the recipient directly." };
    },
  },
  cultconnections: {
    label: "Cult Connections",
    tiers: [
      { id: "square_eyes",         label: "Square Eyes — 1 Month"   },
      { id: "couch_potato",        label: "Couch Potato — 6 Months" },
      { id: "pop_culture_vulture", label: "Pop Culture Vulture — Lifetime" },
    ],
    grant: async (env, tier, email) => {
      const res = await fetch(`${env.CC_URL}/admin/grant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminKey: env.CC_ADMIN_KEY, tier, email }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || `Cult Connections grant failed (${res.status})`);
      return { token: data.token, emailSent: data.emailSent, note: null };
    },
  },
  // Wardens of Luminara: add here once its own Stripe integration and
  // admin-grant endpoint exist — nothing to call yet.
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...CORS } });
}

// ── RATE LIMITING ──
// Keyed by IP, tracked in KV. Locks out after 5 failed PIN attempts within
// 10 minutes — a 4-digit PIN has only 10,000 combinations, so an unthrottled
// endpoint would be brute-forceable in seconds.
async function checkRateLimit(env, ip) {
  const key = `fail:${ip}`;
  const raw = await env.RINLOJM.get(key);
  const record = raw ? JSON.parse(raw) : { count: 0, lockedUntil: 0 };
  if (record.lockedUntil > Date.now()) {
    return { locked: true, retryAfterSec: Math.ceil((record.lockedUntil - Date.now()) / 1000) };
  }
  return { locked: false, record };
}
async function recordFailure(env, ip, record) {
  const count = (record?.count || 0) + 1;
  const lockedUntil = count >= 5 ? Date.now() + 10 * 60 * 1000 : 0;
  await env.RINLOJM.put(`fail:${ip}`, JSON.stringify({ count, lockedUntil }), { expirationTtl: 900 });
}
async function clearFailures(env, ip) {
  await env.RINLOJM.delete(`fail:${ip}`);
}

// ── AUDIT LOG ──
async function logGrant(env, { app, tier, email, ip }) {
  const key = `grant:${Date.now()}:${crypto.randomUUID().slice(0, 8)}`;
  await env.RINLOJM.put(key, JSON.stringify({ app, tier, email, ip, ts: Date.now() }));
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });

    const url = new URL(request.url);
    const ip = request.headers.get("cf-connecting-ip") || "unknown";

    // ── GET / — the frontend itself ──
    if (url.pathname === "/" && request.method === "GET") {
      return new Response(FRONTEND_HTML, { headers: { "Content-Type": "text/html;charset=UTF-8" } });
    }

    // ── POST /api/unlock-pin ──
    if (url.pathname === "/api/unlock-pin" && request.method === "POST") {
      const { pin } = await request.json();
      const limit = await checkRateLimit(env, ip);
      if (limit.locked) return json({ ok: false, locked: true, retryAfterSec: limit.retryAfterSec });

      if (pin !== env.RINLOJM_PIN) {
        await recordFailure(env, ip, limit.record);
        return json({ ok: false });
      }
      await clearFailures(env, ip);
      // Return just the app list — no per-app details until the phrase is entered too.
      const apps = Object.entries(APPS).map(([id, a]) => ({ id, label: a.label }));
      return json({ ok: true, apps });
    }

    // ── POST /api/unlock-phrase ──
    // Re-checked independently of the PIN — a correct PIN alone never
    // reveals tier options, only the phrase does.
    if (url.pathname === "/api/unlock-phrase" && request.method === "POST") {
      const { phrase, app } = await request.json();
      const limit = await checkRateLimit(env, ip);
      if (limit.locked) return json({ ok: false, locked: true, retryAfterSec: limit.retryAfterSec });

      if (phrase.trim() !== (env.RINLOJM_PHRASE || "").trim() || !APPS[app]) {
        await recordFailure(env, ip, limit.record);
        return json({ ok: false });
      }
      await clearFailures(env, ip);
      return json({ ok: true, tiers: APPS[app].tiers });
    }

    // ── POST /api/grant ──
    // Phrase re-verified here too — never trust a client-side "already
    // unlocked" flag for the action that actually mints access.
    if (url.pathname === "/api/grant" && request.method === "POST") {
      const { phrase, app, tier, email } = await request.json();
      if (phrase.trim() !== (env.RINLOJM_PHRASE || "").trim() || !APPS[app]) {
        return json({ ok: false, error: "Unauthorised" }, 403);
      }
      if (!email || !tier) {
        return json({ ok: false, error: "Missing tier or email" }, 400);
      }
      try {
        const result = await APPS[app].grant(env, tier, email);
        await logGrant(env, { app, tier, email, ip });
        return json({ ok: true, ...result });
      } catch (e) {
        return json({ ok: false, error: e.message }, 502);
      }
    }

    return json({ error: "Not found" }, 404);
  },
};

// ── FRONTEND ──
// Deliberately bare, per spec: no titles, no labels, no instructional text.
// App names and tier names ARE the content — those aren't "guidance," they're
// the actual options being chosen, same as a bare list of buttons on any UI.
const FRONTEND_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1">
<title>rinlojM</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0a0a0a; color: #eee; font-family: -apple-system, sans-serif; min-height: 100dvh; display: flex; align-items: center; justify-content: center; padding: 24px; }
  #app { width: 100%; max-width: 360px; }
  .keypad { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  .key { aspect-ratio: 1; border-radius: 50%; border: 1px solid #333; background: #151515; color: #eee; font-size: 22px; display: flex; align-items: center; justify-content: center; }
  .dots { display: flex; justify-content: center; gap: 14px; margin-bottom: 32px; }
  .dot { width: 12px; height: 12px; border-radius: 50%; border: 1px solid #555; }
  .dot.filled { background: #C9A84C; border-color: #C9A84C; }
  .list-item { padding: 18px; border-bottom: 1px solid #1e1e1e; font-size: 17px; }
  .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; padding: 24px; }
  .modal { background: #151515; border-radius: 12px; padding: 20px; width: 100%; max-width: 320px; }
  input[type=password], input[type=email] { width: 100%; background: #0a0a0a; border: 1px solid #333; border-radius: 8px; padding: 12px; color: #eee; font-size: 16px; margin-bottom: 12px; }
  .tier-btn { width: 100%; padding: 14px; margin-bottom: 8px; background: #1a1a1a; border: 1px solid #333; border-radius: 8px; color: #eee; font-size: 15px; text-align: left; }
  .tier-btn.selected { border-color: #C9A84C; color: #C9A84C; }
  .go-btn { width: 100%; padding: 14px; margin-top: 8px; background: #C9A84C; border: none; border-radius: 8px; color: #0a0a0a; font-weight: 700; font-size: 15px; }
  .result { font-size: 13px; color: #aaa; margin-top: 16px; word-break: break-all; }
</style>
</head>
<body>
<div id="app"></div>
<script>
let pinBuf = "";
let unlockedApps = null;
let currentApp = null;
let currentTiers = null;
let selectedTier = null;

const app = document.getElementById("app");

function renderPin(checking) {
  app.innerHTML = \`
    <div class="dots">\${[0,1,2,3].map(i => \`<div class="dot \${i < pinBuf.length ? "filled" : ""}"></div>\`).join("")}</div>
    <div class="keypad" style="\${checking ? "opacity:0.3;pointer-events:none;" : ""}">
      \${[1,2,3,4,5,6,7,8,9].map(n => \`<div class="key" onclick="pressKey('\${n}')">\${n}</div>\`).join("")}
      <div></div>
      <div class="key" onclick="pressKey('0')">0</div>
      <div class="key" onclick="pressKey('back')">⌫</div>
    </div>\`;
}

async function pressKey(k) {
  if (k === "back") { pinBuf = pinBuf.slice(0, -1); renderPin(); return; }
  if (pinBuf.length >= 4) return;
  pinBuf += k;
  renderPin();
  if (pinBuf.length === 4) {
    renderPin(true); // show a checking state so a slow response isn't mistaken for frozen
    try {
      const res = await fetch("/api/unlock-pin", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ pin: pinBuf }) }).then(r => r.json());
      pinBuf = "";
      if (res.locked) { app.innerHTML = \`<div style="text-align:center;color:#888;">\${res.retryAfterSec}s</div>\`; setTimeout(renderPin, res.retryAfterSec * 1000); return; }
      if (!res.ok) { renderPin(); return; }
      unlockedApps = res.apps;
      renderAppList();
    } catch (e) {
      pinBuf = "";
      app.innerHTML = \`<div style="text-align:center;color:#a55;padding-bottom:20px;">error — check Worker logs</div>\`;
      setTimeout(renderPin, 2000);
    }
  }
}

function renderAppList() {
  app.innerHTML = unlockedApps.map(a => \`<div class="list-item" onclick="openApp('\${a.id}')">\${a.label}</div>\`).join("");
}

function openApp(id) {
  currentApp = id;
  app.insertAdjacentHTML("beforeend", \`
    <div class="modal-backdrop" id="phraseModal">
      <div class="modal">
        <input type="password" id="phraseInput" autofocus autocapitalize="off" autocorrect="off" autocomplete="current-password" spellcheck="false">
        <button class="go-btn" onclick="submitPhrase()">→</button>
      </div>
    </div>\`);
  document.getElementById("phraseInput").addEventListener("keydown", e => { if (e.key === "Enter") submitPhrase(); });
}

async function submitPhrase() {
  const phrase = document.getElementById("phraseInput").value;
  try {
    const res = await fetch("/api/unlock-phrase", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ phrase, app: currentApp }) }).then(r => r.json());
    if (res.locked) { document.getElementById("phraseModal").remove(); app.innerHTML = \`<div style="text-align:center;color:#888;">\${res.retryAfterSec}s</div>\`; setTimeout(renderAppList, res.retryAfterSec * 1000); return; }
    if (!res.ok) { document.getElementById("phraseInput").value = ""; return; }
    window.__rinlojmPhrase = phrase; // held only in memory for this session, never persisted
    currentTiers = res.tiers;
    document.getElementById("phraseModal").remove();
    renderTiers();
  } catch (e) {
    document.getElementById("phraseModal").remove();
    app.innerHTML = \`<div style="text-align:center;color:#a55;padding-bottom:20px;">error — check Worker logs</div>\`;
    setTimeout(renderAppList, 2000);
  }
}

function renderTiers() {
  app.innerHTML = \`
    \${currentTiers.map(t => \`<div class="tier-btn" id="tier-\${t.id}" onclick="selectTier('\${t.id}')">\${t.label}</div>\`).join("")}
    <input type="email" id="emailInput" placeholder="">
    <button class="go-btn" onclick="submitGrant()">→</button>
    <div class="result" id="result"></div>\`;
}

function selectTier(id) {
  selectedTier = id;
  document.querySelectorAll(".tier-btn").forEach(el => el.classList.remove("selected"));
  document.getElementById("tier-" + id).classList.add("selected");
}

async function submitGrant() {
  const email = document.getElementById("emailInput").value;
  if (!selectedTier || !email) return;
  const resultEl = document.getElementById("result");
  resultEl.textContent = "…";
  try {
    const res = await fetch("/api/grant", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ phrase: window.__rinlojmPhrase, app: currentApp, tier: selectedTier, email }) }).then(r => r.json());
    if (!res.ok) { resultEl.textContent = res.error || "failed"; return; }
    resultEl.textContent = (res.emailSent ? "sent" : "") + (res.note ? " — " + res.note : "") + (res.token ? " — " + res.token : "");
  } catch (e) {
    resultEl.textContent = "error — check Worker logs";
  }
}

renderPin();
</script>
</body>
</html>`;
