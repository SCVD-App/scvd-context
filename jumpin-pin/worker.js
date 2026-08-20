// ══════════════════════════════════════════════════════════
// JUMPIN' PIN — Cloudflare Worker payment backend
// Handles: Stripe Checkout, webhook confirmation, activation
// (capped at 10 uses per purchase), and email-gated restore.
//
// Design notes (read before touching the activation cap logic):
//
// - This is a ONE-TIME, PERPETUAL unlock. There is no day-count,
//   unlike Mic Drop's micdrop_[type]_[days]_[hmac] tokens. A
//   Jumpin' Pin token never expires on its own.
//
// - The token is a random UUID generated fresh per purchase and
//   stored as a KV record (pending -> paid, same pattern as Cult
//   Connections), NOT an HMAC of a fixed payload. This matters:
//   Mic Drop's token is identical for every buyer of the same
//   plan (it's just HMAC("micdrop_pro_30")), so an activation cap
//   would be meaningless there — everyone's token is the same
//   string. Here every purchase gets its own unique token, so a
//   per-token activation counter actually means something.
//
// - Activations are capped at 10 per token (see MAX_ACTIVATIONS).
//   This covers a household's realistic device count/upgrades
//   over years, while putting a hard ceiling on what a leaked/
//   shared token is worth if it ever ends up posted publicly.
//
// - Restore purchase is EMAIL-GATED and the token is never
//   returned in the API response — it's only ever emailed to the
//   address that paid. Typing in someone else's email just sends
//   mail to their inbox; it can't be used to fish for a free copy.
//
// Required setup (Cloudflare dashboard):
//   - KV namespace bound as JUMPINPIN_KV
//   - Secret: STRIPE_SECRET_KEY      (sk_live_... / sk_test_...)
//   - Secret: STRIPE_WEBHOOK_SECRET  (whsec_... from the webhook endpoint)
//   - Secret: RESEND_API_KEY         (re_... — same account as other SCVD apps)
//   - Var:    APP_URL                (https://scvd-app.github.io/Jumpin-Pin)
// ══════════════════════════════════════════════════════════

const PRICE_USD_CENTS = 400; // $4.00 USD, one-time
const MAX_ACTIVATIONS = 10;
const RESTORE_RATE_LIMIT_SECONDS = 300; // 1 restore request per email per 5 min

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

function emailKey(email) {
  return `jp_email:${email.trim().toLowerCase()}`;
}
function tokenKey(token) {
  return `jp_token:${token}`;
}
function restoreRlKey(email) {
  return `jp_restore_rl:${email.trim().toLowerCase()}`;
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
      if (url.pathname === "/activate" && request.method === "POST") {
        return await activate(request, env);
      }
      if (url.pathname === "/webhook" && request.method === "POST") {
        return await handleWebhook(request, env);
      }
      if (url.pathname === "/restore" && request.method === "POST") {
        return await restore(request, env);
      }
      return json({ error: "Not found" }, 404);
    } catch (err) {
      console.error("Worker error:", err);
      return json({ error: "Internal error" }, 500);
    }
  },
};

// ── CREATE CHECKOUT ──
// Same pending-token-before-payment pattern as Cult Connections: generate
// the token up front, store it "pending", only flip to "paid" once the
// webhook confirms real money landed. Stripe collects the email natively
// (customer_email is left unset so Stripe's own checkout email field is
// used and lands in customer_details.email on the session).
async function createCheckout(request, env) {
  const token = crypto.randomUUID();

  await env.JUMPINPIN_KV.put(
    tokenKey(token),
    JSON.stringify({ status: "pending", activations: 0, deviceIds: [], created: Date.now() }),
    { expirationTtl: 60 * 60 * 24 } // pending tokens self-expire after 24h if never paid
  );

  const successUrl = `${env.APP_URL}/?jp_token=${token}`;
  const cancelUrl = `${env.APP_URL}/`;

  const params = new URLSearchParams({
    "mode": "payment",
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][product_data][name]": "Jumpin' Pin — Pro Unlock",
    "line_items[0][price_data][product_data][description]": "One-time purchase. All Pro boards and tones, forever. No auto-renewal.",
    "line_items[0][price_data][unit_amount]": PRICE_USD_CENTS.toString(),
    "line_items[0][quantity]": "1",
    "success_url": successUrl,
    "cancel_url": cancelUrl,
    "metadata[token]": token,
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
// Read-only status check. Safe to call repeatedly (e.g. polling right
// after a Stripe redirect while the webhook is still landing) — does
// NOT touch the activation counter.
async function verifyToken(request, env) {
  const { token } = await request.json();
  if (!token) return json({ valid: false, reason: "missing token" });

  const raw = await env.JUMPINPIN_KV.get(tokenKey(token));
  if (!raw) return json({ valid: false, reason: "not found or expired" });

  const record = JSON.parse(raw);
  if (record.status !== "paid") {
    return json({ valid: false, reason: "payment not yet confirmed — try again in a few seconds" });
  }

  return json({
    valid: true,
    activations: record.activations,
    remaining: Math.max(0, MAX_ACTIVATIONS - record.activations),
  });
}

// ── ACTIVATE ──
// Called ONCE by the client per device, only after verify-token has
// confirmed status === "paid" and the device doesn't already have a
// local "activated" flag. Increments the per-token activation counter.
// deviceId is a random UUID the client generates once and keeps in
// localStorage — used only to avoid double-counting the same device
// refreshing the success page, not as a security boundary.
async function activate(request, env) {
  const { token, deviceId } = await request.json();
  if (!token || !deviceId) return json({ activated: false, reason: "missing token or deviceId" });

  const raw = await env.JUMPINPIN_KV.get(tokenKey(token));
  if (!raw) return json({ activated: false, reason: "not found or expired" });

  const record = JSON.parse(raw);
  if (record.status !== "paid") {
    return json({ activated: false, reason: "payment not yet confirmed" });
  }

  if (record.deviceIds.includes(deviceId)) {
    // Already counted — re-activating the same device is free.
    return json({ activated: true, remaining: Math.max(0, MAX_ACTIVATIONS - record.activations) });
  }

  if (record.activations >= MAX_ACTIVATIONS) {
    return json({ activated: false, reason: "activation limit reached", remaining: 0 });
  }

  record.activations += 1;
  record.deviceIds.push(deviceId);
  await env.JUMPINPIN_KV.put(tokenKey(token), JSON.stringify(record), { expirationTtl: 60 * 60 * 24 * 3650 });

  return json({ activated: true, remaining: Math.max(0, MAX_ACTIVATIONS - record.activations) });
}

// ── STRIPE WEBHOOK ──
// Source of truth for "did the money actually arrive." Verifies the
// Stripe signature, flips the matching token pending -> paid, and
// records the token against the buyer's email for later restore.
async function handleWebhook(request, env) {
  const rawBody = await request.text();
  const sigHeader = request.headers.get("stripe-signature") || "";

  const valid = await verifyStripeSignature(rawBody, sigHeader, env.STRIPE_WEBHOOK_SECRET);
  if (!valid) return new Response("Invalid signature", { status: 400 });

  const event = JSON.parse(rawBody);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const token = session.metadata?.token;
    const email = session.customer_details?.email;

    if (token) {
      const raw = await env.JUMPINPIN_KV.get(tokenKey(token));
      const record = raw ? JSON.parse(raw) : { activations: 0, deviceIds: [] };
      record.status = "paid";
      record.email = email || null;
      record.paidAt = Date.now();
      // Perpetual — long TTL rather than none, just so genuinely abandoned
      // records don't sit in KV forever. 10 years is effectively forever
      // for a $2 app.
      await env.JUMPINPIN_KV.put(tokenKey(token), JSON.stringify(record), { expirationTtl: 60 * 60 * 24 * 3650 });

      if (email) {
        // Append-only list in case the same email buys more than once
        // (e.g. a genuine repurchase after somehow losing the original).
        const existingRaw = await env.JUMPINPIN_KV.get(emailKey(email));
        const tokens = existingRaw ? JSON.parse(existingRaw) : [];
        if (!tokens.includes(token)) tokens.push(token);
        await env.JUMPINPIN_KV.put(emailKey(email), JSON.stringify(tokens), { expirationTtl: 60 * 60 * 24 * 3650 });
      }
    }
  }

  return json({ received: true });
}

// ── RESTORE PURCHASE ──
// Email-gated. NEVER returns the token in the response — always emails
// it to the address on file. If the email doesn't match a paid purchase,
// the response is identical either way, so this can't be used to probe
// whether an email has bought the app.
async function restore(request, env) {
  const { email } = await request.json();
  if (!email || !email.includes("@")) {
    return json({ error: "Enter a valid email address" }, 400);
  }

  const rlKey = restoreRlKey(email);
  const rl = await env.JUMPINPIN_KV.get(rlKey);
  if (rl) {
    return json({ ok: true, message: "If that email has a purchase, a restore link is on its way." });
  }
  await env.JUMPINPIN_KV.put(rlKey, "1", { expirationTtl: RESTORE_RATE_LIMIT_SECONDS });

  const raw = await env.JUMPINPIN_KV.get(emailKey(email));
  const tokens = raw ? JSON.parse(raw) : [];

  // Same response either way — see function comment above.
  if (tokens.length > 0 && env.RESEND_API_KEY) {
    const mostRecentToken = tokens[tokens.length - 1];
    try {
      await sendRestoreEmail(env.RESEND_API_KEY, email, mostRecentToken);
    } catch (e) {
      console.error(`Restore email failed for ${email}: ${e.message}`);
    }
  }

  return json({ ok: true, message: "If that email has a purchase, a restore link is on its way." });
}

// ── STRIPE SIGNATURE VERIFICATION ──
async function verifyStripeSignature(payload, sigHeader, secret) {
  const parts = sigHeader.split(",").reduce((acc, part) => {
    const [k, v] = part.split("=");
    acc[k] = v;
    return acc;
  }, {});
  const timestamp = parts["t"];
  const sig = parts["v1"];
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
  const computedHex = Array.from(new Uint8Array(computed)).map((b) => b.toString(16).padStart(2, "0")).join("");

  if (computedHex.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < computedHex.length; i++) diff |= computedHex.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0;
}

// ── RESEND EMAIL ──
async function sendRestoreEmail(resendKey, toEmail, token) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Jumpin' Pin <noreply@scvd.app>",
      to: [toEmail],
      subject: "Your Jumpin' Pin Pro unlock",
      html: `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#10181c;font-family:'Segoe UI',system-ui,sans-serif;">
  <div style="max-width:480px;margin:0 auto;padding:40px 24px;">
    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-size:22px;font-weight:800;color:#ece7da;letter-spacing:1px;text-transform:uppercase;">Jumpin' Pin</div>
    </div>
    <div style="background:#1b262b;border:1px solid #2c3a40;border-radius:14px;padding:24px;margin-bottom:24px;text-align:center;">
      <div style="font-size:12px;letter-spacing:0.2em;color:#8b9a97;margin-bottom:14px;">YOUR PRO UNLOCK CODE</div>
      <div style="font-size:13px;font-weight:700;color:#35d0a0;font-family:'Courier New',monospace;word-break:break-all;background:#081012;padding:14px;border-radius:8px;">
        ${token}
      </div>
    </div>
    <div style="background:#1b262b;border:1px solid #2c3a40;border-radius:14px;padding:20px;margin-bottom:24px;">
      <div style="font-size:12px;letter-spacing:0.15em;color:#8b9a97;margin-bottom:10px;">TO RESTORE ON THIS DEVICE</div>
      <div style="font-size:13px;color:#c8c2b0;line-height:1.8;">
        1. Open Jumpin' Pin<br/>
        2. Tap Restore Purchase<br/>
        3. Paste this code<br/>
        4. Pro unlocks immediately
      </div>
    </div>
    <div style="text-align:center;font-size:11px;color:#546165;line-height:1.8;">
      One-time purchase. No auto-renewal. No surprises.<br/>
      Need help? <a href="mailto:support@scvd.app" style="color:#8b9a97;">support@scvd.app</a>
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
