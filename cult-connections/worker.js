// ══════════════════════════════════════════════════════════
// CULT CONNECTIONS — Cloudflare Worker payment backend
// Handles: Stripe Checkout creation, webhook confirmation, token verification
//
// Required setup (see deployment steps provided separately):
//   - KV namespace bound as CC_TOKENS
//   - Secret: STRIPE_SECRET_KEY   (Stripe secret key, starts with sk_live_ or sk_test_)
//   - Secret: STRIPE_WEBHOOK_SECRET  (from the Stripe webhook endpoint, starts with whsec_)
//   - Var: APP_URL  (e.g. https://scvd-app.github.io/Cult-Connections)
// ══════════════════════════════════════════════════════════

const TIERS = {
  square_eyes:         { priceId: "price_1TvbPKKyyW3v9aYU8rIFbzx3", days: 30,  label: "Square Eyes" },
  couch_potato:        { priceId: "price_1TvbRDKyyW3v9aYUFHckF0pw", days: 182, label: "Couch Potato" },
  pop_culture_vulture: { priceId: "price_1TvbS0KyyW3v9aYUkoev77zQ", days: 365, label: "Pop Culture Vulture" },
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    try {
      if (url.pathname === "/create-checkout" && request.method === "POST") {
        return await createCheckout(request, env);
      }
      if (url.pathname === "/verify-token" && request.method === "POST") {
        return await verifyToken(request, env);
      }
      if (url.pathname === "/webhook" && request.method === "POST") {
        return await handleWebhook(request, env);
      }
      return json({ error: "Not found" }, 404);
    } catch (err) {
      console.error("Worker error:", err);
      return json({ error: "Internal error" }, 500);
    }
  },
};

// ── CREATE CHECKOUT ──
// Generates a unique, single-purpose token BEFORE payment, stores it as
// "pending" in KV, and asks Stripe to redirect back with that token attached.
// The token is only ever usable once it's flipped to "paid" by the webhook.
async function createCheckout(request, env) {
  const { tier } = await request.json();
  const tierConfig = TIERS[tier];

  if (!tierConfig) {
    return json({ error: "Unknown tier" }, 400);
  }

  const token = crypto.randomUUID();

  // Store as pending immediately — NOT valid until webhook confirms payment
  await env.CC_TOKENS.put(
    `cc_token:${token}`,
    JSON.stringify({ tier, status: "pending", created: Date.now() }),
    { expirationTtl: 60 * 60 * 24 } // pending tokens self-expire after 24h if never paid
  );

  const successUrl = `${env.APP_URL}/?cc_token=${token}`;
  const cancelUrl = `${env.APP_URL}/`;

  const params = new URLSearchParams({
    "mode": "payment",
    "line_items[0][price]": tierConfig.priceId,
    "line_items[0][quantity]": "1",
    "success_url": successUrl,
    "cancel_url": cancelUrl,
    "metadata[token]": token,
    "metadata[tier]": tier,
  });

  const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const session = await stripeRes.json();

  if (!stripeRes.ok) {
    console.error("Stripe checkout create failed:", session);
    return json({ error: "Could not create checkout session" }, 502);
  }

  return json({ url: session.url });
}

// ── VERIFY TOKEN ──
// Called by the client after redirect (or on manual token paste).
// Only returns valid:true if the webhook has already confirmed payment.
async function verifyToken(request, env) {
  const { token } = await request.json();

  if (!token) {
    return json({ valid: false, reason: "missing token" });
  }

  const raw = await env.CC_TOKENS.get(`cc_token:${token}`);
  if (!raw) {
    return json({ valid: false, reason: "not found or expired" });
  }

  const record = JSON.parse(raw);

  if (record.status !== "paid") {
    return json({ valid: false, reason: "payment not yet confirmed — try again in a few seconds" });
  }

  if (new Date(record.expiry).getTime() < Date.now()) {
    return json({ valid: false, reason: "unlock expired" });
  }

  return json({ valid: true, tier: record.tier, expiry: record.expiry });
}

// ── STRIPE WEBHOOK ──
// This is the source of truth for "did the money actually arrive."
// Verifies the Stripe signature, then flips the matching token from
// pending -> paid and sets its real expiry based on the tier purchased.
async function handleWebhook(request, env) {
  const signature = request.headers.get("stripe-signature");
  const body = await request.text();

  const isValid = await verifyStripeSignature(body, signature, env.STRIPE_WEBHOOK_SECRET);
  if (!isValid) {
    return json({ error: "Invalid signature" }, 400);
  }

  const event = JSON.parse(body);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const token = session.metadata?.token;
    const tier = session.metadata?.tier;
    const tierConfig = TIERS[tier];

    if (!token || !tierConfig) {
      console.error("Webhook missing token/tier metadata", session.id);
      return json({ received: true }); // ack anyway, nothing more we can do
    }

    if (session.payment_status !== "paid") {
      console.error("Webhook fired but payment_status not paid", session.id);
      return json({ received: true });
    }

    const expiry = new Date(Date.now() + tierConfig.days * 86400000).toISOString();

    await env.CC_TOKENS.put(
      `cc_token:${token}`,
      JSON.stringify({ tier, status: "paid", expiry, created: Date.now() }),
      { expirationTtl: tierConfig.days * 86400 + 86400 } // keep a day past expiry, then auto-clean
    );
  }

  return json({ received: true });
}

// ── STRIPE SIGNATURE VERIFICATION ──
// Confirms the webhook actually came from Stripe, not an attacker hitting
// /webhook directly to grant themselves a free unlock.
async function verifyStripeSignature(payload, signatureHeader, secret) {
  if (!signatureHeader) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((p) => p.split("="))
  );
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;

  const signedPayload = `${timestamp}.${payload}`;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuffer = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload));
  const expectedSignature = Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Constant-time-ish comparison
  if (expectedSignature.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expectedSignature.length; i++) {
    mismatch |= expectedSignature.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}
