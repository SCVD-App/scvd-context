// ── ECEG PROXY WORKER ─────────────────────────────────────────────────────────
// Cloudflare Worker for Easy Come Easy Go paywall
// Handles: Stripe checkout, HMAC token generation, token validation
// KV namespace: ECEG_KV (bind as ECEG_KV in wrangler.toml)
// Secrets: STRIPE_SECRET_KEY, HMAC_SECRET, STRIPE_WEBHOOK_SECRET, RESEND_API_KEY
//
// Recovered post data-crash (Session — see handoff.md for date), backed up
// here for the first time. Two hardening fixes applied vs. the recovered
// version, both flagged in review before being made:
//   1. /resend-token now rate-limited (1 per email per 5 min) — matches the
//      cooldown pattern used on Jumpin' Pin's /restore endpoint.
//   2. Webhook signature check now uses a constant-time comparison instead
//      of plain === — matches Mic Drop / Cult Connections / Jumpin' Pin.
// No other logic changed. Token scheme, tiers, KV keys, email templates all
// exactly as recovered.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Token durations in days per tier
const TIERS = {
  taster:  { days: 30,  label: "Taster",         price_env: "STRIPE_PRICE_TASTER"  },
  savvy:   { days: 180, label: "Savvy Investor",  price_env: "STRIPE_PRICE_SAVVY"   },
  tycoon:  { days: 365, label: "The Tycoon",      price_env: "STRIPE_PRICE_TYCOON"  },
};

const RESEND_TOKEN_RATE_LIMIT_SECONDS = 300; // 1 resend per email per 5 min

// ── HMAC TOKEN ────────────────────────────────────────────────────────────────
async function generateToken(tier, days, secret) {
  const nonceBytes = crypto.getRandomValues(new Uint8Array(8));
  const nonce = Array.from(nonceBytes).map(b => b.toString(16).padStart(2,"0")).join("");
  const payload = `eceg_${tier}_${days}_${nonce}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const hex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2,"0")).join("").slice(0, 32);
  return `${payload}_${hex}`;
}

async function verifyToken(token, secret) {
  // Format: eceg_[tier]_[days]_[nonce]_[hmac32]
  const parts = token.split("_");
  if (parts.length !== 5 || parts[0] !== "eceg") return null;
  const [, tier, daysStr, nonce, givenHex] = parts;
  const days = parseInt(daysStr);
  if (!TIERS[tier] || isNaN(days)) return null;

  const payload = `eceg_${tier}_${days}_${nonce}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const expectedHex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2,"0")).join("").slice(0, 32);

  if (givenHex !== expectedHex) return null;
  return { tier, days };
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function err(msg, status = 400) {
  return json({ error: msg }, status);
}

function resendRlKey(email) {
  return `resend_rl:${email.trim().toLowerCase()}`;
}

// Constant-time string comparison — avoids leaking match-length/position
// via response timing. Same approach as Mic Drop / Cult Connections /
// Jumpin' Pin's webhook verification.
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ── STRIPE API ────────────────────────────────────────────────────────────────
async function stripePost(path, body, secretKey) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(body)) params.append(k, v);

  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });
  return res.json();
}

async function stripeGet(path, secretKey) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  return res.json();
}

// ── MAIN HANDLER ──────────────────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS });
    }

    // ── POST /checkout ──────────────────────────────────────────────────────
    // Creates a Stripe Checkout session for the requested tier
    // Body: { tier: "taster"|"savvy"|"tycoon", email: string, origin: string }
    if (request.method === "POST" && path === "/checkout") {
      let body;
      try { body = await request.json(); } catch { return err("Invalid JSON"); }

      const { tier, email, origin } = body;
      if (!tier || !TIERS[tier]) return err("Invalid tier");
      if (!email || !email.includes("@")) return err("Valid email required");

      const tierConfig = TIERS[tier];
      const priceId = env[tierConfig.price_env];
      if (!priceId) return err("Price not configured", 500);

      const appUrl = origin || "https://scvd-app.github.io/Easy-Come-Easy-Go";

      const session = await stripePost("/checkout/sessions", {
        mode: "payment",
        "payment_method_types[]": "card",
        "line_items[0][price]": priceId,
        "line_items[0][quantity]": "1",
        customer_email: email,
        success_url: `${appUrl}?eceg_success=1`,
        cancel_url: `${appUrl}?eceg_cancel=1`,
        "metadata[tier]": tier,
        "metadata[days]": String(tierConfig.days),
        "metadata[email]": email,
      }, env.STRIPE_SECRET_KEY);

      if (session.error) {
        console.error("Stripe error:", session.error);
        return err(session.error.message, 500);
      }

      return json({ url: session.url });
    }

    // ── POST /webhook ───────────────────────────────────────────────────────
    // Handles Stripe payment_intent.succeeded / checkout.session.completed
    // Generates HMAC token, stores in KV, sends via Resend
    if (request.method === "POST" && path === "/webhook") {
      const sig = request.headers.get("stripe-signature");
      if (!sig) return err("No signature", 400);

      const rawBody = await request.text();

      // Verify Stripe webhook signature
      let event;
      try {
        event = await verifyStripeSignature(rawBody, sig, env.STRIPE_WEBHOOK_SECRET);
      } catch (e) {
        console.error("Webhook sig failed:", e.message);
        return err("Invalid signature", 400);
      }

      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const { tier, days, email } = session.metadata || {};

        if (!tier || !days || !email) {
          console.error("Missing metadata on session", session.id);
          return json({ received: true });
        }

        // Generate HMAC token
        const token = await generateToken(tier, days, env.HMAC_SECRET);

        // Store in KV: keyed by token (for validation) and email (for lookup)
        await env.ECEG_KV.put(`token:${token}`, JSON.stringify({
          tier, days: parseInt(days), email,
          issuedAt: Date.now(),
          stripeSession: session.id,
        }), { expirationTtl: parseInt(days) * 86400 + 86400 }); // +1 day buffer

        await env.ECEG_KV.put(`email:${email}`, token); // latest token per email

        // Send token via Resend
        await sendTokenEmail(email, token, tier, parseInt(days), env.RESEND_API_KEY);

        console.log(`Token issued: ${token} for ${email}`);
      }

      return json({ received: true });
    }

    // ── POST /validate ──────────────────────────────────────────────────────
    // Validates a token, returns tier + days remaining
    // Body: { token: string }
    if (request.method === "POST" && path === "/validate") {
      let body;
      try { body = await request.json(); } catch { return err("Invalid JSON"); }

      const { token } = body;
      if (!token) return err("Token required");

      // HMAC check first
      const decoded = await verifyToken(token, env.HMAC_SECRET);
      if (!decoded) return json({ valid: false, reason: "invalid_token" });

      // KV check — confirms it was actually issued and not expired
      const stored = await env.ECEG_KV.get(`token:${token}`);
      if (!stored) return json({ valid: false, reason: "token_not_found" });

      const data = JSON.parse(stored);
      const daysRemaining = Math.ceil((data.issuedAt + data.days * 86400000 - Date.now()) / 86400000);

      if (daysRemaining <= 0) return json({ valid: false, reason: "expired" });

      return json({ valid: true, tier: data.tier, days: data.days, daysRemaining, email: data.email });
    }

    // ── POST /resend-token ──────────────────────────────────────────────────
    // Resend a token to an email address (lookup by email).
    // Rate-limited to 1 request per email per 5 minutes — a paying customer
    // legitimately needs this at most a couple of times; unlimited resends
    // just makes this an inbox-spam lever against your own customers.
    if (request.method === "POST" && path === "/resend-token") {
      let body;
      try { body = await request.json(); } catch { return err("Invalid JSON"); }
      const { email } = body;
      if (!email) return err("Email required");

      const rlKey = resendRlKey(email);
      const rl = await env.ECEG_KV.get(rlKey);
      if (rl) {
        return json({ found: true, sent: false, reason: "rate_limited" });
      }
      await env.ECEG_KV.put(rlKey, "1", { expirationTtl: RESEND_TOKEN_RATE_LIMIT_SECONDS });

      const token = await env.ECEG_KV.get(`email:${email}`);
      if (!token) return json({ found: false });

      // Verify token still valid
      const stored = await env.ECEG_KV.get(`token:${token}`);
      if (!stored) return json({ found: false });
      const data = JSON.parse(stored);
      const daysRemaining = Math.ceil((data.issuedAt + data.days * 86400000 - Date.now()) / 86400000);
      if (daysRemaining <= 0) return json({ found: false, reason: "expired" });

      await sendTokenEmail(email, token, data.tier, data.days, env.RESEND_API_KEY);
      return json({ found: true, sent: true });
    }

    // ── GET /leaderboard ────────────────────────────────────────────────────
    if (request.method === "GET" && path === "/leaderboard") {
      const raw = await env.ECEG_KV.get("global_leaderboard");
      const board = raw ? JSON.parse(raw) : [];
      return json({ board });
    }

    // ── POST /leaderboard ───────────────────────────────────────────────────
    // Submit a score. Requires valid token in body.
    if (request.method === "POST" && path === "/leaderboard") {
      let body;
      try { body = await request.json(); } catch { return err("Invalid JSON"); }

      const { token, entry } = body;
      if (!token) return err("Token required");

      const decoded = await verifyToken(token, env.HMAC_SECRET);
      if (!decoded) return err("Invalid token");
      const stored = await env.ECEG_KV.get(`token:${token}`);
      if (!stored) return err("Token not found");

      // Validate entry shape
      if (!entry || typeof entry.score !== "number" || typeof entry.name !== "string") {
        return err("Invalid entry");
      }

      // Sanitise
      const safe = {
        name: entry.name.slice(0, 30),
        score: Math.round(entry.score * 10) / 10,
        winAmount: Math.round(entry.winAmount || 0),
        passive: Math.round(entry.passive || 0),
        strategy: (entry.strategy || "").slice(0, 40),
        difficulty: (entry.difficulty || "").slice(0, 10),
        timeStr: (entry.timeStr || "").slice(0, 20),
        date: new Date().toLocaleDateString("en-AU"),
        tier: decoded.tier,
      };

      // Load, add, sort, trim to 100
      const raw = await env.ECEG_KV.get("global_leaderboard");
      let board = raw ? JSON.parse(raw) : [];
      board.push(safe);
      board.sort(function(a, b) {
        if (a.score === null && b.score === null) return 0;
        if (a.score === null) return 1;
        if (b.score === null) return -1;
        return a.score - b.score;
      });
      board = board.slice(0, 100);
      await env.ECEG_KV.put("global_leaderboard", JSON.stringify(board));

      const rank = board.findIndex(function(e) { return e === safe; });
      return json({ success: true, rank: rank + 1, board: board.slice(0, 20) });
    }

    return err("Not found", 404);
  },
};

// ── STRIPE WEBHOOK SIGNATURE VERIFICATION ────────────────────────────────────
async function verifyStripeSignature(payload, header, secret) {
  const parts = header.split(",");
  const tPart = parts.find(p => p.startsWith("t="));
  const v1Parts = parts.filter(p => p.startsWith("v1="));
  if (!tPart || !v1Parts.length) throw new Error("Malformed signature");

  const timestamp = tPart.slice(2);
  const signed = `${timestamp}.${payload}`;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signed));
  const computed = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");

  const valid = v1Parts.some(p => timingSafeEqual(p.slice(3), computed));
  if (!valid) throw new Error("Signature mismatch");

  // Reject events older than 5 minutes
  const age = Math.floor(Date.now() / 1000) - parseInt(timestamp);
  if (age > 300) throw new Error("Timestamp too old");

  return JSON.parse(payload);
}

// ── EMAIL DELIVERY VIA RESEND ─────────────────────────────────────────────────
async function sendTokenEmail(email, token, tier, days, resendApiKey) {
  const tierLabels = { taster: "Taster", savvy: "Savvy Investor", tycoon: "The Tycoon" };
  const tierLabel = tierLabels[tier] || tier;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="background:#0a0a0a;color:#f5f3ee;font-family:Georgia,serif;padding:2rem;max-width:560px;margin:0 auto;">
  <div style="border:1px solid #C9A84C44;border-radius:8px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#1a1200,#0d0d00);padding:1.5rem;text-align:center;border-bottom:1px solid #C9A84C33;">
      <div style="font-size:0.65rem;letter-spacing:0.3em;color:#C9A84C;text-transform:uppercase;margin-bottom:0.4rem;">Easy Come Easy Go</div>
      <div style="font-size:1.2rem;font-weight:bold;">Your Pro Token</div>
    </div>
    <div style="padding:1.75rem;">
      <p style="color:#aaa;font-size:0.9rem;line-height:1.7;">You're in. <strong style="color:#C9A84C;">${tierLabel}</strong> tier — ${days} days of access.</p>
      <p style="color:#aaa;font-size:0.9rem;line-height:1.7;">Enter this token in the game to unlock Pro features:</p>
      <div style="background:#111;border:1px solid #C9A84C44;border-radius:6px;padding:1.25rem;margin:1.25rem 0;text-align:center;">
        <div style="font-size:0.65rem;letter-spacing:0.2em;color:#555;text-transform:uppercase;margin-bottom:0.5rem;">Your Token</div>
        <div style="font-size:0.85rem;color:#C9A84C;word-break:break-all;letter-spacing:0.05em;font-family:monospace;">${token}</div>
      </div>
      <p style="color:#555;font-size:0.78rem;line-height:1.7;">Head to <a href="https://scvd-app.github.io/Easy-Come-Easy-Go" style="color:#C9A84C;">Ez C Ez G</a>, tap the 🏆 button, choose "Activate Pro", and paste this token. Keep this email — it's your receipt.</p>
      <p style="color:#444;font-size:0.75rem;margin-top:1.5rem;">One-time purchase. No auto-renewal. Same price for everyone.</p>
    </div>
    <div style="background:#0d0d00;border-top:1px solid #1a1a00;padding:1rem;text-align:center;">
      <div style="font-size:0.65rem;color:#444;">SCVD Apps · noreply@scvd.app · <a href="mailto:support@scvd.app" style="color:#555;">support@scvd.app</a></div>
    </div>
  </div>
</body>
</html>`;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Easy Come Easy Go <noreply@scvd.app>",
      to: [email],
      subject: `Your Ez C Ez G Pro Token — ${tierLabel}`,
      html,
    }),
  });
}
