// ---------- Ancient Games Bundle — Payments Worker ----------
//
// ONE $4 purchase unlocks BOTH games in the bundle (Royal Game of Ur +
// Nine Men's Morris) — "two games for the price of one", per the pricing
// call already made. Deliberately its own Worker, separate from the
// online-play Worker (ancient-games-online-worker.js) — no shared code,
// no shared KV. Payments and gameplay-state have no reason to share a
// blast radius.
//
// ---------- Required setup before this can process a single real cent ----------
// 1. Create this Worker in Cloudflare, then under Settings → Variables and
//    secrets add:
//      STRIPE_SECRET_KEY   (secret)  — from Stripe dashboard, starts with sk_
//      STRIPE_WEBHOOK_SECRET (secret) — from the webhook endpoint you create
//                                        in Stripe (step 3), starts with whsec_
//      RESEND_API_KEY      (secret)  — same Resend account used elsewhere
//      ALLOWED_ORIGIN      (text)    — https://scvd-app.github.io (origin only)
//      GAME_URL            (text)    — https://scvd-app.github.io/Two-Ancient-Classics/
//                                        (full path, trailing slash, EXACTLY matching
//                                        whatever the GitHub repo actually ends up named —
//                                        see the Hnefatafl handoff note on why this and
//                                        ALLOWED_ORIGIN must never be the same value:
//                                        conflating them once already cost two
//                                        real charges when Stripe's redirect
//                                        landed on the bare org root instead of
//                                        back inside the game)
//    No STRIPE_PRICE_ID needed — the $4 amount is defined inline in
//    handleCreateCheckout below (BUNDLE_PRICE_CENTS), not as a pre-created
//    Stripe Product. Nothing to set up in the Stripe catalog beforehand.
// 2. Under Bindings, create/attach two KV namespaces:
//      BUNDLE_EMAILS   — email:{email} = sessionId (most recent paid session)
//      BUNDLE_RESTORE  — restore:{token} = { sessionId, email, expiresAt }
// 3. In Stripe dashboard → Developers → Webhooks, add an endpoint pointing
//    at this Worker's URL + /webhook, subscribed to checkout.session.completed.
//    Copy its signing secret into STRIPE_WEBHOOK_SECRET (step 1).
// 4. Update BUNDLE_API_BASE in the bundle's index.html to this Worker's
//    real deployed URL.
// 5. CRITICAL — do a REAL Stripe test-mode purchase (test card
//    4242 4242 4242 4242) all the way through: checkout → redirect back →
//    confirm Pro actually activates → confirm the restore-by-email flow
//    also works, BEFORE switching Stripe to live keys. Same non-negotiable
//    step that caught the Hnefatafl redirect bug before it went live —
//    skipping this is how that bug shipped the first time.

function corsHeaders(env) {
  return {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}
function json(data, env, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...corsHeaders(env) } });
}
function randomToken(bytes = 20) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return [...arr].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ---------- Stripe REST calls (no SDK — plain fetch, Workers-friendly) ----------
async function stripeFetch(env, path, { method = "GET", body } = {}) {
  const headers = { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` };
  let fetchBody;
  if (body) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    fetchBody = new URLSearchParams(body).toString();
  }
  const res = await fetch(`https://api.stripe.com/v1/${path}`, { method, headers, body: fetchBody });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `Stripe API error (${res.status})`);
  return data;
}

// $4.00 USD, defined directly here rather than as a pre-created Stripe
// Product/Price — this matches how Hnefatafl's own checkout apparently
// already works (nothing shows up for it in the Product catalog, yet real
// purchases went through fine). Inline price_data means Stripe creates a
// throwaway price object for just this one checkout session — nothing to
// set up in the dashboard beforehand, and nothing that can silently drift
// out of sync with what the app actually charges. If the price ever
// changes, it changes right here, in the one place that actually matters.
//
// Bumped from $2 to $4 (20 Aug 2026) alongside Jumpin' Pin and Hnefatafl —
// preserves the "two games for the price of one" framing against their
// new $4 single-game rate.
const BUNDLE_PRICE_CENTS = 400;

async function handleCreateCheckout(request, env) {
  const session = await stripeFetch(env, "checkout/sessions", {
    method: "POST",
    body: {
      mode: "payment",
      "line_items[0][price_data][currency]": "usd",
      "line_items[0][price_data][unit_amount]": String(BUNDLE_PRICE_CENTS),
      "line_items[0][price_data][product_data][name]": "Two Ancient Classics — Pro Unlock",
      "line_items[0][price_data][product_data][description]": "Unlimited play in both Royal Game of Ur and Nine Men's Morris",
      "line_items[0][quantity]": "1",
      success_url: `${env.GAME_URL}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: env.GAME_URL,
    },
  });
  return json({ url: session.url }, env);
}

// Activation is decided by asking Stripe directly whether this session is
// genuinely paid — no local KV mirror of payment status to go stale or
// drift out of sync. A light per-session activation cap (not a hard block)
// guards against a sessionId being shared publicly to unlock the app for
// strangers off one $4 payment — legitimate multi-device use (phone,
// tablet, a reinstall) stays well under this.
const MAX_ACTIVATIONS_PER_SESSION = 8;

async function handleActivate(request, env) {
  let body;
  try { body = await request.json(); } catch (e) { return json({ error: "Bad request." }, env, 400); }
  const { sessionId } = body || {};
  if (!sessionId) return json({ error: "Missing sessionId." }, env, 400);

  let session;
  try { session = await stripeFetch(env, `checkout/sessions/${sessionId}`); }
  catch (e) { return json({ error: "Couldn't verify that session." }, env, 400); }

  if (session.payment_status !== "paid") return json({ activated: false, reason: "not_paid" }, env);

  const capKey = `activations:${sessionId}`;
  const raw = await env.BUNDLE_EMAILS.get(capKey);
  const count = raw ? parseInt(raw, 10) : 0;
  if (count >= MAX_ACTIVATIONS_PER_SESSION) return json({ activated: false, reason: "activation_limit" }, env);
  await env.BUNDLE_EMAILS.put(capKey, String(count + 1), { expirationTtl: 60 * 60 * 24 * 365 });

  return json({ activated: true }, env);
}

// ---------- Webhook (durability + populates the email→session lookup the
// restore flow depends on) ----------
async function verifyStripeSignature(request, env, rawBody) {
  const sigHeader = request.headers.get("Stripe-Signature") || "";
  const parts = Object.fromEntries(sigHeader.split(",").map((p) => p.split("=")));
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;

  const signedPayload = `${timestamp}.${rawBody}`;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(env.STRIPE_WEBHOOK_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sigBuffer = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload));
  const expected = [...new Uint8Array(sigBuffer)].map((b) => b.toString(16).padStart(2, "0")).join("");

  // Constant-time comparison — same lesson as ECEG's token verification.
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}

async function handleWebhook(request, env) {
  // MUST read as raw text before any JSON parsing — Stripe's signature is
  // computed over the exact raw bytes, and re-serializing a parsed object
  // will not reproduce the same bytes.
  const rawBody = await request.text();
  const valid = await verifyStripeSignature(request, env, rawBody);
  if (!valid) return json({ error: "Invalid signature." }, env, 400);

  const event = JSON.parse(rawBody);
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const email = session.customer_details?.email;
    if (email && session.payment_status === "paid") {
      await env.BUNDLE_EMAILS.put(`email:${email.toLowerCase()}`, session.id);
    }
  }
  return json({ received: true }, env);
}

// ---------- Restore by email ----------
const RESTORE_RATE_WINDOW_SECONDS = 300; // Cloudflare KV's real floor is 60s; 300 is the actual cooldown intended here, comfortably above that floor

async function handleRestoreRequest(request, env) {
  let body;
  try { body = await request.json(); } catch (e) { return json({ error: "Bad request." }, env, 400); }
  const email = (body.email || "").trim().toLowerCase();
  if (!email) return json({ error: "Email required." }, env, 400);

  const rlKey = `ratelimit:restore:${email}`;
  if (await env.BUNDLE_RESTORE.get(rlKey)) {
    return json({ error: "A restore email was already sent recently — check your inbox (and spam folder)." }, env, 429);
  }
  await env.BUNDLE_RESTORE.put(rlKey, "1", { expirationTtl: RESTORE_RATE_WINDOW_SECONDS });

  const sessionId = await env.BUNDLE_EMAILS.get(`email:${email}`);
  // Deliberately return success either way, whether or not that email has
  // a purchase on file — confirming which emails DID buy something is a
  // real information leak (about who's a paying customer) that a restore
  // form should never expose.
  if (!sessionId) return json({ sent: true }, env);

  const token = randomToken(24);
  await env.BUNDLE_RESTORE.put(`restore:${token}`, JSON.stringify({ sessionId, email, expiresAt: Date.now() + 1000 * 60 * 30 }), { expirationTtl: 60 * 30 });

  const restoreUrl = `${env.GAME_URL}?restore=${token}`;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "noreply@scvd.app",
      to: email,
      subject: "Restore your Ancient Games Bundle Pro unlock",
      html: `<p>Tap the link below on the device you want to restore Pro on:</p><p><a href="${restoreUrl}">${restoreUrl}</a></p><p>This link expires in 30 minutes.</p>`,
    }),
  });

  return json({ sent: true }, env);
}

async function handleRestoreConfirm(request, env) {
  let body;
  try { body = await request.json(); } catch (e) { return json({ error: "Bad request." }, env, 400); }
  const { token } = body || {};
  if (!token) return json({ error: "Missing token." }, env, 400);

  const raw = await env.BUNDLE_RESTORE.get(`restore:${token}`);
  if (!raw) return json({ activated: false, reason: "invalid_or_expired" }, env);
  const record = JSON.parse(raw);
  if (Date.now() > record.expiresAt) return json({ activated: false, reason: "expired" }, env);

  // Re-verify against Stripe directly rather than trusting the stored
  // record alone — cheap, and closes the door on a refunded/disputed
  // session still being able to restore Pro after the fact.
  let session;
  try { session = await stripeFetch(env, `checkout/sessions/${record.sessionId}`); }
  catch (e) { return json({ activated: false, reason: "verification_failed" }, env); }
  if (session.payment_status !== "paid") return json({ activated: false, reason: "not_paid" }, env);

  await env.BUNDLE_RESTORE.delete(`restore:${token}`); // one-time use
  return json({ activated: true }, env);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    if (method === "OPTIONS") return new Response(null, { headers: corsHeaders(env) });

    try {
      if (path === "/checkout/create" && method === "POST") return await handleCreateCheckout(request, env);
      if (path === "/checkout/activate" && method === "POST") return await handleActivate(request, env);
      if (path === "/webhook" && method === "POST") return await handleWebhook(request, env);
      if (path === "/restore/request" && method === "POST") return await handleRestoreRequest(request, env);
      if (path === "/restore/confirm" && method === "POST") return await handleRestoreConfirm(request, env);
      return json({ error: "Not found." }, env, 404);
    } catch (err) {
      return json({ error: "Unexpected server error.", detail: String(err) }, env, 500);
    }
  },
};
