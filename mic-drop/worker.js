// ── MIC DROP — CLOUDFLARE WORKER v5 ─────────────────────────────────────────
// Routes:
//   POST /recognize          — AudD track identification
//   POST /enrich             — Anthropic key/BPM/genre/tip enrichment
//   POST /ping               — session heartbeat → KV
//   GET  /active             — active user count from KV
//   POST /create-checkout    — Stripe Checkout session
//   POST /webhook            — Stripe webhook → HMAC token generation
//   POST /verify-token       — token validation + days remaining
//   POST /admin/generate-token — compensation token (admin only)
//   POST /coaching           — Claude Haiku vocal coaching tip
//   GET  /receipts           — fetch receipts for a token
//   POST /receipts           — save a receipt for a token
//   DELETE /receipts         — delete a single receipt by id
//   POST /spotify/exchange   — OAuth code → access/refresh token (Beta)
//   POST /spotify/refresh    — refresh an expired Spotify access token (Beta)
//
// Secrets required in Cloudflare dashboard:
//   AUDD_API_TOKEN
//   ANTHROPIC_API_KEY
//   STRIPE_SECRET_KEY        ← sk_live_... (paste in Cloudflare, never in code)
//   STRIPE_WEBHOOK_SECRET    ← whsec_... (from Stripe webhook dashboard)
//   MICDROP_TOKEN_SECRET     ← any long random string you choose (e.g. 40 char random)
//   RESEND_API_KEY           ← re_... from resend.com dashboard
//   SPOTIFY_CLIENT_SECRET    ← from developer.spotify.com/dashboard (Beta)
//
// KV binding: MICDROP_KV

const SPOTIFY_CLIENT_ID = "5cba2d3336ad4d08b63970ad40fc7814"; // not secret — same as index.html

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// ⚠ When flipping to live Stripe keys, update this PK too — it's not a secret but it must match sk_live_
const STRIPE_PK = "pk_live_51TeuPdKyyW3v9aYURVlqJcnHMBdW5UtMCvtH1BSpBS26HrhpueUMU1TJlEfXAY9lfjNSyRp98Fxi9OTiGQPvMAOJ00Fp8t8Wqi";

const MAX_RECEIPTS = 9;

// Plan definitions — must match index.html pricing
const PLANS = {
  monthly:  { days: 30,  amount:  299, label: "1 Month"  },
  quarter:  { days: 90,  amount:  799, label: "3 Months" },
  biannual: { days: 180, amount: 1499, label: "6 Months" },
  annual:   { days: 365, amount: 2499, label: "1 Year"   },
};

// ── HMAC TOKEN HELPERS ───────────────────────────────────────────────────────

async function generateToken(type, days, secret) {
  const payload = `micdrop_${type}_${days}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const hex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
  return `${payload}_${hex}`;
}

async function verifyToken(token, secret) {
  const parts = token.trim().split("_");
  if (parts.length !== 4 || parts[0] !== "micdrop") return null;
  const [, type, daysStr, submittedHmac] = parts;
  const days = parseInt(daysStr);
  if (!days || days < 1 || days > 400) return null;
  const expected = await generateToken(type, days, secret);
  const expectedHmac = expected.split("_")[3];
  if (submittedHmac !== expectedHmac) return null;
  return { type, days };
}

// ── STRIPE HELPERS ───────────────────────────────────────────────────────────

async function stripeRequest(env, path, method, body) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers: {
      "Authorization": `Bearer ${env.STRIPE_SECRET_KEY}`,
      "Content-Type":  "application/x-www-form-urlencoded",
    },
    body: body ? new URLSearchParams(body).toString() : undefined,
  });
  return res.json();
}

async function verifyStripeSignature(payload, sigHeader, secret) {
  const parts = sigHeader.split(",").reduce((acc, part) => {
    const [k, v] = part.split("=");
    acc[k] = v;
    return acc;
  }, {});
  const timestamp = parts["t"];
  const sig       = parts["v1"];
  if (!timestamp || !sig) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const computed = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload));
  const computedHex = Array.from(new Uint8Array(computed)).map(b => b.toString(16).padStart(2, "0")).join("");

  if (computedHex.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < computedHex.length; i++) diff |= computedHex.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0;
}

// ── RESEND EMAIL ─────────────────────────────────────────────────────────────

async function sendTokenEmail(resendKey, toEmail, token, planLabel, days) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendKey}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify({
      from:    "Mic Drop <noreply@scvd.app>",
      to:      [toEmail],
      subject: "🎤 Your Mic Drop Pro Token",
      html: `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Courier New',monospace;">
  <div style="max-width:480px;margin:0 auto;padding:40px 24px;">
    <div style="text-align:center;margin-bottom:32px;">
      <div style="font-size:32px;margin-bottom:8px;">🎤</div>
      <div style="font-size:24px;font-weight:900;color:#fff;font-family:Georgia,serif;letter-spacing:0.1em;">MIC DROP PRO</div>
      <div style="font-size:12px;letter-spacing:0.3em;color:#444;margin-top:4px;">QUEENSLAND, AUSTRALIA</div>
    </div>
    <div style="background:rgba(201,168,76,0.08);border:1px solid rgba(201,168,76,0.3);border-radius:14px;padding:24px;margin-bottom:24px;text-align:center;">
      <div style="font-size:13px;letter-spacing:0.25em;color:#777;margin-bottom:16px;">YOUR ACCESS TOKEN</div>
      <div style="font-size:14px;font-weight:900;color:#C9A84C;font-family:'Courier New',monospace;word-break:break-all;letter-spacing:0.05em;line-height:1.6;background:#000;padding:14px;border-radius:8px;">
        ${token}
      </div>
      <div style="margin-top:16px;font-size:13px;color:#555;letter-spacing:0.1em;">
        ${planLabel} — ${days} days of Pro access
      </div>
    </div>
    <div style="background:#111;border:1px solid #1e1e1e;border-radius:14px;padding:20px;margin-bottom:24px;">
      <div style="font-size:13px;letter-spacing:0.2em;color:#555;margin-bottom:12px;">HOW TO ACTIVATE</div>
      <div style="font-size:13px;color:#777;line-height:1.9;">
        1. Open Mic Drop<br/>
        2. Scroll to the bottom of the app<br/>
        3. Tap <span style="color:#C9A84C;">✦ Have a token? Enter it here</span><br/>
        4. Paste your token and tap ✦<br/>
        5. Done — Pro unlocks immediately
      </div>
    </div>
    <div style="text-align:center;">
      <div style="font-size:12px;color:#333;line-height:1.9;">
        Opt-in only. No auto-renewal. No surprises.<br/>
        Need help? <a href="mailto:support@scvd.app" style="color:#555;text-decoration:none;">support@scvd.app</a>
      </div>
      <div style="margin-top:16px;font-size:11px;color:#1e1e1e;letter-spacing:0.2em;">
        🇦🇺 PROUDLY BUILT IN QUEENSLAND, AUSTRALIA
      </div>
    </div>
  </div>
</body>
</html>`,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend ${res.status}: ${err}`);
  }
  return res.json();
}

// ── KV RECEIPT HELPERS ───────────────────────────────────────────────────────

// Receipt KV key is derived from the token — no login needed, token IS the identity
function receiptKey(token) {
  // Use last 32 chars of token as key suffix — short, unique, not the full token
  const suffix = token.trim().slice(-32).replace(/[^a-z0-9]/gi, "");
  return `receipts:${suffix}`;
}

async function getReceipts(env, token) {
  try {
    const raw = await env.MICDROP_KV.get(receiptKey(token));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

async function saveReceipts(env, token, receipts) {
  await env.MICDROP_KV.put(
    receiptKey(token),
    JSON.stringify(receipts),
    { expirationTtl: 60 * 60 * 24 * 400 } // 400 days
  );
}

// ── MAIN HANDLER ─────────────────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS });
    }

    const url      = new URL(request.url);
    const pathname = url.pathname;

    // ── GET /receipts ────────────────────────────────────────────────────────
    if (pathname === "/receipts" && request.method === "GET") {
      try {
        const token = url.searchParams.get("token");
        if (!token) return new Response(JSON.stringify({ error: "Missing token" }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });
        const valid = await verifyToken(token, env.MICDROP_TOKEN_SECRET);
        if (!valid) return new Response(JSON.stringify({ error: "Invalid token" }), { status: 403, headers: { ...CORS, "Content-Type": "application/json" } });
        const receipts = await getReceipts(env, token);
        return new Response(JSON.stringify({ receipts }), { headers: { ...CORS, "Content-Type": "application/json" } });
      } catch (e) {
        return new Response(JSON.stringify({ receipts: [] }), { headers: { ...CORS, "Content-Type": "application/json" } });
      }
    }

    // ── POST /receipts ───────────────────────────────────────────────────────
    if (pathname === "/receipts" && request.method === "POST") {
      try {
        const { token, receipt } = await request.json();
        if (!token || !receipt) return new Response(JSON.stringify({ error: "Missing token or receipt" }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });
        const valid = await verifyToken(token, env.MICDROP_TOKEN_SECRET);
        if (!valid) return new Response(JSON.stringify({ error: "Invalid token" }), { status: 403, headers: { ...CORS, "Content-Type": "application/json" } });
        const receipts = await getReceipts(env, token);
        // Newest first, cap at MAX_RECEIPTS
        const updated = [receipt, ...receipts.filter(r => r.id !== receipt.id)].slice(0, MAX_RECEIPTS);
        await saveReceipts(env, token, updated);
        return new Response(JSON.stringify({ ok: true, count: updated.length }), { headers: { ...CORS, "Content-Type": "application/json" } });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
      }
    }

    // ── DELETE /receipts ─────────────────────────────────────────────────────
    if (pathname === "/receipts" && request.method === "DELETE") {
      try {
        const { token, id } = await request.json();
        if (!token || !id) return new Response(JSON.stringify({ error: "Missing token or id" }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });
        const valid = await verifyToken(token, env.MICDROP_TOKEN_SECRET);
        if (!valid) return new Response(JSON.stringify({ error: "Invalid token" }), { status: 403, headers: { ...CORS, "Content-Type": "application/json" } });
        const receipts = await getReceipts(env, token);
        const updated = receipts.filter(r => r.id !== id);
        await saveReceipts(env, token, updated);
        return new Response(JSON.stringify({ ok: true }), { headers: { ...CORS, "Content-Type": "application/json" } });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
      }
    }

    // ── POST /recognize ──────────────────────────────────────────────────────
    if (pathname === "/recognize" && request.method === "POST") {
      try {
        const { audio, mimeType } = await request.json();
        const binary = Uint8Array.from(atob(audio), c => c.charCodeAt(0));
        const form   = new FormData();
        form.append("api_token", env.AUDD_API_TOKEN);
        form.append("return",    "apple_music,spotify");
        form.append("file",      new Blob([binary], { type: mimeType }), "audio.webm");
        const res  = await fetch("https://api.audd.io/", { method: "POST", body: form });
        const data = await res.json();
        return new Response(JSON.stringify(data), { headers: { ...CORS, "Content-Type": "application/json" } });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
      }
    }

    // ── POST /enrich ─────────────────────────────────────────────────────────
    if (pathname === "/enrich" && request.method === "POST") {
      try {
        const { title, artist } = await request.json();
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type":      "application/json",
            "x-api-key":         env.ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model:      "claude-haiku-4-5",
            max_tokens: 200,
            messages: [{
              role:    "user",
              content: `You are a music encyclopedia. For the song "${title}" by "${artist}", provide:
- key: the musical key (e.g. "C Major", "A Minor")
- bpm: the approximate tempo as a number (e.g. 120)
- genre: the primary genre in 1-3 words (e.g. "Pop Rock", "R&B")
- tip: a single practical singing tip for this specific song, 8-12 words, focused on technique or style

Return ONLY valid JSON with these four keys. No explanation, no markdown, no catalog checking.`,
            }],
          }),
        });
        const data = await res.json();
        const text = data.content?.[0]?.text || "{}";
        const clean = text.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(clean);
        return new Response(JSON.stringify(parsed), { headers: { ...CORS, "Content-Type": "application/json" } });
      } catch (e) {
        return new Response(JSON.stringify({ key: "—", bpm: "—", genre: "", tip: "" }), { headers: { ...CORS, "Content-Type": "application/json" } });
      }
    }

    // ── POST /ping ───────────────────────────────────────────────────────────
    if (pathname === "/ping" && request.method === "POST") {
      try {
        const { sessionId } = await request.json().catch(() => ({}));
        if (sessionId && env.MICDROP_KV) {
          await env.MICDROP_KV.put(`session:${sessionId}`, Date.now().toString(), { expirationTtl: 2100 });
        }
        return new Response(JSON.stringify({ ok: true }), { headers: { ...CORS, "Content-Type": "application/json" } });
      } catch {
        return new Response(JSON.stringify({ ok: true }), { headers: { ...CORS, "Content-Type": "application/json" } });
      }
    }

    // ── GET /active ──────────────────────────────────────────────────────────
    if (pathname === "/active" && request.method === "GET") {
      try {
        let count = 1;
        if (env.MICDROP_KV) {
          const list = await env.MICDROP_KV.list({ prefix: "session:" });
          count = Math.max(1, list.keys.length);
        }
        return new Response(JSON.stringify({ count }), { headers: { ...CORS, "Content-Type": "application/json" } });
      } catch {
        return new Response(JSON.stringify({ count: 1 }), { headers: { ...CORS, "Content-Type": "application/json" } });
      }
    }

    // ── POST /create-checkout ────────────────────────────────────────────────
    if (pathname === "/create-checkout" && request.method === "POST") {
      try {
        const { planId, successUrl, cancelUrl } = await request.json();
        const plan = PLANS[planId];
        if (!plan) return new Response(JSON.stringify({ error: "Invalid plan" }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });

        const session = await stripeRequest(env, "/checkout/sessions", "POST", {
          "payment_method_types[]":          "card",
          "mode":                            "payment",
          "line_items[0][price_data][currency]":                  "usd",
          "line_items[0][price_data][product_data][name]":        `Mic Drop Pro — ${plan.label}`,
          "line_items[0][price_data][product_data][description]": "Pitch monitoring & coaching. No auto-renewal.",
          "line_items[0][price_data][unit_amount]":               plan.amount.toString(),
          "line_items[0][quantity]":                              "1",
          "metadata[planId]":                planId,
          "metadata[days]":                  plan.days.toString(),
          "success_url":                     successUrl || "https://scvd-app.github.io/Mic-Drop/?payment=success",
          "cancel_url":                      cancelUrl  || "https://scvd-app.github.io/Mic-Drop/?payment=cancelled",
        });

        return new Response(JSON.stringify({
          url:       session.url,
          sessionId: session.id,
          stripePk:  STRIPE_PK,
        }), { headers: { ...CORS, "Content-Type": "application/json" } });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
      }
    }

    // ── POST /webhook ────────────────────────────────────────────────────────
    if (pathname === "/webhook" && request.method === "POST") {
      try {
        const rawBody   = await request.text();
        const sigHeader = request.headers.get("stripe-signature") || "";

        const valid = await verifyStripeSignature(rawBody, sigHeader, env.STRIPE_WEBHOOK_SECRET);
        if (!valid) return new Response("Invalid signature", { status: 400 });

        const event = JSON.parse(rawBody);

        if (event.type === "checkout.session.completed") {
          const session = event.data.object;
          const planId  = session.metadata?.planId;
          const days    = parseInt(session.metadata?.days || "30");
          const plan    = PLANS[planId];

          if (plan && env.MICDROP_TOKEN_SECRET) {
            const token = await generateToken("pro", days, env.MICDROP_TOKEN_SECRET);
            const email = session.customer_details?.email;

            if (env.MICDROP_KV) {
              await env.MICDROP_KV.put(
                `token:${session.id}`,
                JSON.stringify({ token, planId, days, email, ts: Date.now() }),
                { expirationTtl: 60 * 60 * 24 * 400 }
              );
            }

            if (email && env.RESEND_API_KEY) {
              try {
                await sendTokenEmail(env.RESEND_API_KEY, email, token, plan.label, days);
              } catch (emailErr) {
                console.error(`Email failed for ${email}: ${emailErr.message}`);
              }
            }
          }
        }

        return new Response(JSON.stringify({ received: true }), { headers: { ...CORS, "Content-Type": "application/json" } });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
      }
    }

    // ── POST /verify-token ───────────────────────────────────────────────────
    if (pathname === "/verify-token" && request.method === "POST") {
      try {
        const { token } = await request.json();
        if (!token) return new Response(JSON.stringify({ valid: false }), { headers: { ...CORS, "Content-Type": "application/json" } });
        const result = await verifyToken(token, env.MICDROP_TOKEN_SECRET);
        if (!result) return new Response(JSON.stringify({ valid: false, error: "Invalid token" }), { headers: { ...CORS, "Content-Type": "application/json" } });
        return new Response(JSON.stringify({ valid: true, days: result.days, type: result.type }), { headers: { ...CORS, "Content-Type": "application/json" } });
      } catch (e) {
        return new Response(JSON.stringify({ valid: false, error: e.message }), { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
      }
    }

    // ── POST /admin/generate-token ───────────────────────────────────────────
    if (pathname === "/admin/generate-token" && request.method === "POST") {
      try {
        const { adminKey, days, type } = await request.json();
        if (adminKey !== env.MICDROP_TOKEN_SECRET) {
          return new Response(JSON.stringify({ error: "Unauthorised" }), { status: 403, headers: { ...CORS, "Content-Type": "application/json" } });
        }
        const tokenDays = Math.min(400, Math.max(1, parseInt(days) || 90));
        const tokenType = type || "comp";
        const token = await generateToken(tokenType, tokenDays, env.MICDROP_TOKEN_SECRET);
        return new Response(JSON.stringify({ token, days: tokenDays, type: tokenType }), { headers: { ...CORS, "Content-Type": "application/json" } });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
      }
    }

    // ── POST /coaching ───────────────────────────────────────────────────────
    if (pathname === "/spotify/exchange" && request.method === "POST") {
      try {
        const { code, redirect_uri } = await request.json();
        if (!code || !redirect_uri) {
          return new Response(JSON.stringify({ error: "missing code or redirect_uri" }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });
        }
        const basicAuth = btoa(`${SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`);
        const res = await fetch("https://accounts.spotify.com/api/token", {
          method: "POST",
          headers: {
            "Content-Type":  "application/x-www-form-urlencoded",
            "Authorization": `Basic ${basicAuth}`,
          },
          body: new URLSearchParams({
            grant_type:   "authorization_code",
            code,
            redirect_uri,
          }).toString(),
        });
        const data = await res.json();
        if (!res.ok) {
          return new Response(JSON.stringify({ error: data.error_description || "token exchange failed" }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });
        }
        // access_token, refresh_token, expires_in (seconds), token_type, scope
        return new Response(JSON.stringify(data), { headers: { ...CORS, "Content-Type": "application/json" } });
      } catch (e) {
        return new Response(JSON.stringify({ error: "exchange failed" }), { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
      }
    }

    if (pathname === "/spotify/refresh" && request.method === "POST") {
      try {
        const { refresh_token } = await request.json();
        if (!refresh_token) {
          return new Response(JSON.stringify({ error: "missing refresh_token" }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });
        }
        const basicAuth = btoa(`${SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`);
        const res = await fetch("https://accounts.spotify.com/api/token", {
          method: "POST",
          headers: {
            "Content-Type":  "application/x-www-form-urlencoded",
            "Authorization": `Basic ${basicAuth}`,
          },
          body: new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token,
          }).toString(),
        });
        const data = await res.json();
        if (!res.ok) {
          return new Response(JSON.stringify({ error: data.error_description || "refresh failed" }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });
        }
        // Spotify sometimes omits refresh_token on refresh — caller should keep the old one if so
        return new Response(JSON.stringify(data), { headers: { ...CORS, "Content-Type": "application/json" } });
      } catch (e) {
        return new Response(JSON.stringify({ error: "refresh failed" }), { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
      }
    }

    if (pathname === "/coaching" && request.method === "POST") {
      try {
        const { title, artist, accuracy, pocket, sharp, flat } = await request.json();
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type":      "application/json",
            "x-api-key":         env.ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model:      "claude-haiku-4-5",
            max_tokens: 120,
            messages: [{
              role:    "user",
              content: `You are a vocal coach giving feedback to a singer using Mic Drop, a pitch monitoring app.

Song: "${title}" by ${artist}
Overall accuracy: ${accuracy}%
Time in pocket (±25 cents): ${pocket}%
Time sharp: ${sharp}%
Time flat: ${flat}%

Write 2 sentences of specific, encouraging coaching based on these numbers. Reference the actual song if relevant. Be direct and practical — no fluff, no generic advice. Focus on what the numbers reveal about their technique.`,
            }],
          }),
        });
        const data = await res.json();
        const tip  = data.content?.[0]?.text?.trim() || "Keep pushing — consistency builds over time.";
        return new Response(JSON.stringify({ tip }), { headers: { ...CORS, "Content-Type": "application/json" } });
      } catch (e) {
        return new Response(JSON.stringify({ tip: "Keep pushing — every session builds muscle memory." }), { headers: { ...CORS, "Content-Type": "application/json" } });
      }
    }

    return new Response("Not found", { status: 404, headers: CORS });
  },
};
