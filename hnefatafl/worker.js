// ══════════════════════════════════════════════════════════
// HNEFATAFL WORKER — Stripe checkout + KV activation
//
// Pattern: per-purchase UUID token, KV pending → paid, activation cap
// per token, email-gated restore via Resend. Same shape as Jumpin' Pin's
// worker (reconstructed from the described pattern, not copied from the
// original file — paste that file if you've still got it and I'll true
// this up against the exact tested version).
//
// Two hardening lessons folded in from the ECEG crash-recovery session:
//   - /resend-token is rate-limited (1 request per email per 5 minutes)
//   - webhook signature comparison is constant-time, not `===`
//
// REQUIRED BINDINGS (set these in the Cloudflare dashboard or wrangler.toml
// — never commit actual values, wrangler.toml stays out of the repo):
//   KV namespace binding: HNEFATAFL_KV
//   Secret: STRIPE_SECRET_KEY      (sk_live_... or sk_test_...)
//   Secret: STRIPE_WEBHOOK_SECRET  (whsec_...)
//   Secret: RESEND_API_KEY
//
// Set secrets with:
//   wrangler secret put STRIPE_SECRET_KEY
//   wrangler secret put STRIPE_WEBHOOK_SECRET
//   wrangler secret put RESEND_API_KEY
// ══════════════════════════════════════════════════════════

const PRICE_AMOUNT_CENTS = 200; // $2.00 USD
const CURRENCY = "usd"; // standing SCVD decision — all games ship in USD, not AUD
const PRODUCT_NAME = "Hnefatafl — Unlimited Play (Lifetime)";
const ACTIVATION_CAP = 10; // max devices per purchased token, matches Jumpin' Pin
const RESEND_RATE_LIMIT_SECONDS = 300; // 1 request per email per 5 minutes
const FROM_EMAIL = "noreply@scvd.app";

// CORS is scoped to the actual GitHub Pages origin, not "*" — this worker
// handles payment tokens, no reason to accept requests from anywhere.
const ALLOWED_ORIGIN = "https://scvd-app.github.io";
// The actual game page — NOT the same as ALLOWED_ORIGIN above. That one is
// deliberately origin-only (no path) because CORS Access-Control-Allow-Origin
// headers can't contain a path. This one is the real redirect target. Mixing
// these up sends people back to the bare SCVD org root instead of the game
// after paying — exactly the bug that shipped here originally.
const GAME_URL = "https://scvd-app.github.io/Hnefatafl/";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}

function newToken() {
  return crypto.randomUUID();
}

// ---------- Constant-time comparison — the ECEG lesson ----------
function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

async function verifyStripeSignature(payload, sigHeader, secret) {
  if (!sigHeader) return false;
  const parts = Object.fromEntries(sigHeader.split(",").map((p) => p.split("=")));
  if (!parts.t || !parts.v1) return false;
  const signedPayload = `${parts.t}.${payload}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuffer = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload));
  const expected = [...new Uint8Array(sigBuffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return constantTimeEqual(expected, parts.v1);
}

// ---------- Stripe REST calls (fetch directly, no SDK — Workers don't
// need the Node-dependent stripe npm package for this, and it keeps the
// no-build-tools convention intact) ----------
async function stripeCreateCheckoutSession(env, token) {
  const body = new URLSearchParams({
    "payment_method_types[0]": "card",
    "line_items[0][price_data][currency]": CURRENCY,
    "line_items[0][price_data][product_data][name]": PRODUCT_NAME,
    "line_items[0][price_data][unit_amount]": String(PRICE_AMOUNT_CENTS),
    "line_items[0][quantity]": "1",
    "mode": "payment",
    "success_url": `${GAME_URL}?token=${token}&paid=1`,
    "cancel_url": `${GAME_URL}?token=${token}&cancelled=1`,
    "client_reference_id": token,
    "metadata[token]": token,
  });
  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Stripe checkout session creation failed: ${errText}`);
  }
  return res.json();
}

// ---------- Resend email ----------
async function sendRestoreEmail(env, email, token) {
  const restoreLink = `${GAME_URL}?restore=${token}`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: email,
      subject: "Your Hnefatafl unlock code",
      text: `Tap this link to unlock unlimited play on this device:\n${restoreLink}\n\nOr, if that link doesn't open right, open Hnefatafl, tap "have a code already?", and paste in this code instead:\n${token}\n\nThis works on up to ${ACTIVATION_CAP} devices.`,
    }),
  });
  return res.ok;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    // ---- POST /create-checkout — starts a new purchase ----
    if (url.pathname === "/create-checkout" && request.method === "POST") {
      const token = newToken();
      await env.HNEFATAFL_KV.put(
        token,
        JSON.stringify({ status: "pending", email: null, deviceIds: [], createdAt: Date.now(), paidAt: null })
      );
      try {
        const session = await stripeCreateCheckoutSession(env, token);
        return json({ checkoutUrl: session.url, token });
      } catch (e) {
        return json({ error: "Could not start checkout" }, 500);
      }
    }

    // ---- GET /check-status?token=... — webhook-lag polling after redirect ----
    if (url.pathname === "/check-status" && request.method === "GET") {
      const token = url.searchParams.get("token");
      if (!token) return json({ error: "Missing token" }, 400);
      const raw = await env.HNEFATAFL_KV.get(token);
      if (!raw) return json({ status: "unknown" }, 404);
      const record = JSON.parse(raw);
      return json({ status: record.status });
    }

    // ---- POST /activate — bind a paid token to this device ----
    if (url.pathname === "/activate" && request.method === "POST") {
      const { token, deviceId } = await request.json().catch(() => ({}));
      if (!token || !deviceId) return json({ error: "Missing token or deviceId" }, 400);
      const raw = await env.HNEFATAFL_KV.get(token);
      if (!raw) return json({ error: "Unknown token" }, 404);
      const record = JSON.parse(raw);
      if (record.status !== "paid") return json({ error: "Token not paid yet" }, 402);
      if (!record.deviceIds.includes(deviceId)) {
        if (record.deviceIds.length >= ACTIVATION_CAP) {
          return json({ error: "Activation limit reached for this token" }, 403);
        }
        record.deviceIds.push(deviceId);
        await env.HNEFATAFL_KV.put(token, JSON.stringify(record));
      }
      return json({ status: "activated" });
    }

    // ---- POST /resend-token — email-gated restore, rate-limited ----
    if (url.pathname === "/resend-token" && request.method === "POST") {
      const { email } = await request.json().catch(() => ({}));
      if (!email || !email.includes("@")) return json({ error: "Valid email required" }, 400);
      const normalizedEmail = email.trim().toLowerCase();

      const rateLimitKey = `ratelimit:resend:${normalizedEmail}`;
      const alreadySent = await env.HNEFATAFL_KV.get(rateLimitKey);
      if (alreadySent) {
        return json({ error: "Please wait a few minutes before requesting again" }, 429);
      }
      // Set the rate-limit marker before doing any work, so a retry storm
      // can't slip through while the lookup/send is in flight.
      await env.HNEFATAFL_KV.put(rateLimitKey, "1", { expirationTtl: RESEND_RATE_LIMIT_SECONDS });

      const tokenLookup = await env.HNEFATAFL_KV.get(`email:${normalizedEmail}`);
      if (!tokenLookup) {
        // Deliberately vague response either way — don't reveal whether
        // an email has a purchase on file.
        return json({ status: "if-found-email-sent" });
      }
      await sendRestoreEmail(env, normalizedEmail, tokenLookup);
      return json({ status: "if-found-email-sent" });
    }

    // ---- POST /stripe-webhook — Stripe calls this, not the frontend ----
    if (url.pathname === "/stripe-webhook" && request.method === "POST") {
      const payload = await request.text();
      const sig = request.headers.get("Stripe-Signature");
      const valid = await verifyStripeSignature(payload, sig, env.STRIPE_WEBHOOK_SECRET);
      if (!valid) return new Response("Invalid signature", { status: 400 });

      const event = JSON.parse(payload);
      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const token = session.client_reference_id || session.metadata?.token;
        const email = session.customer_details?.email || null;
        if (token) {
          const raw = await env.HNEFATAFL_KV.get(token);
          const record = raw ? JSON.parse(raw) : { status: "pending", deviceIds: [], createdAt: Date.now() };
          record.status = "paid";
          record.email = email;
          record.paidAt = Date.now();
          await env.HNEFATAFL_KV.put(token, JSON.stringify(record));
          if (email) {
            await env.HNEFATAFL_KV.put(`email:${email.trim().toLowerCase()}`, token);
          }
        }
      }
      return new Response("ok", { status: 200 });
    }

    return json({ error: "Not found" }, 404);
  },
};
