// ---------- Ancient Games — Online Play Worker (Phase 1) ----------
//
// Deliberately a SEPARATE Worker from Hnefatafl's Stripe worker — different
// binding, different KV namespaces, no shared code, no shared data. This is
// the "keep it clean, no cross-app contamination" call from the friends-list
// discussion, applied one level further: it's not even sharing a Worker with
// payments, so a bug here can never touch a real transaction.
//
// PHASE 1 SCOPE: play-once invite links only. No accounts, no email, no
// friends list yet — that's phase 2/3, layered on top of this same KV
// schema later without needing to change what's here.
//
// SECURITY MODEL (know this before deploying): moves ARE validated
// server-side against the real rule engine below (ported verbatim from
// index.html, same functions, same philosophy as the AI's simulateMove —
// this server can never accept a move a real client wouldn't allow either).
// What this Worker does NOT do is verify identity beyond possession of a
// per-player bearer secret issued at invite-creation/redemption time. That's
// intentionally lightweight for a casual-friends feature: someone who
// doesn't have the secret can't post a move into your game (so a random
// stranger who somehow found the gameId can't hijack it), but there's no
// stronger identity check than that yet. Fine for phase 1; email/code auth
// (phase 2) is the place to tighten this if it's ever needed.
//
// ---------- Required setup in the Cloudflare dashboard ----------
// Create this Worker, then under Settings → Bindings (NOT Triggers — see
// the standing SCVD infra lesson) add two KV namespaces:
//   AG_INVITES   — invite:{token}  records
//   AG_GAMES     — game:{gameId}   records
// Namespaces must exist BEFORE opening the binding modal, and the page may
// need a hard refresh if you just created them.
//
// Set these two as plain-text environment variables (not secrets, they're
// not sensitive):
//   ALLOWED_ORIGIN = https://scvd-app.github.io          (origin only — CORS header)
//   GAME_URL       = https://scvd-app.github.io/Hnefatafl/  (full path — used in invite links)
// Keeping these as two separate constants is deliberate — see the
// Hnefatafl Stripe-worker handoff note on the real redirect bug that cost
// two real charges when ALLOWED_ORIGIN and the actual game URL got
// conflated. Same lesson, applied here before it can happen again.

// ============================================================
// Rule engine — ported verbatim from index.html. Keep these two files in
// sync by hand for now (copy-paste, not a shared module — this is a
// no-build-tools stack). If Hnefatafl's rule engine changes, this block
// needs the same edit or the server will start rejecting moves the client
// thinks are legal.
// ============================================================
const SIZE = 11;
const THRONE = { r: 5, c: 5 };
const CORNERS = [{ r: 0, c: 0 }, { r: 0, c: 10 }, { r: 10, c: 0 }, { r: 10, c: 10 }];
function key(r, c) { return `${r},${c}`; }
const RESTRICTED = new Set([THRONE, ...CORNERS].map((p) => key(p.r, p.c)));
function isRestricted(r, c) { return RESTRICTED.has(key(r, c)); }
function isCorner(r, c) { return CORNERS.some((p) => p.r === r && p.c === c); }
function isEdgeSquare(r, c) { return r === 0 || r === SIZE - 1 || c === 0 || c === SIZE - 1; }
function isEscapeSquare(r, c, variant) {
  return variant.escape === "edge" ? isEdgeSquare(r, c) : isCorner(r, c);
}

const RULE_VARIANTS = {
  classic: { key: "classic", kingStrength: "strong", kingArmed: false, escape: "corner", movement: "slide" },
  vikingGame: { key: "vikingGame", kingStrength: "strong", kingArmed: true, escape: "corner", movement: "slide" },
  historical: { key: "historical", kingStrength: "weak", kingArmed: true, escape: "edge", movement: "slide" },
  imperialContest: { key: "imperialContest", kingStrength: "strong", kingArmed: false, escape: "edge", movement: "slide" },
  papillon: { key: "papillon", kingStrength: "strong", kingArmed: true, escape: "corner", movement: "kingSingleStep" },
};
const DEFAULT_VARIANT_KEY = "classic";

function initialBoard() {
  const b = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
  const attackers = [
    [0, 3], [0, 4], [0, 5], [0, 6], [0, 7], [1, 5],
    [10, 3], [10, 4], [10, 5], [10, 6], [10, 7], [9, 5],
    [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [5, 1],
    [3, 10], [4, 10], [5, 10], [6, 10], [7, 10], [5, 9],
  ];
  const defenders = [
    [3, 5], [4, 4], [4, 5], [4, 6],
    [5, 3], [5, 4], [5, 6], [5, 7],
    [6, 4], [6, 5], [6, 6], [7, 5],
  ];
  attackers.forEach(([r, c]) => { b[r][c] = "att"; });
  defenders.forEach(([r, c]) => { b[r][c] = "def"; });
  b[5][5] = "king";
  return b;
}

const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

function legalDestinations(board, r, c, variant) {
  const piece = board[r][c];
  if (!piece) return [];
  const isKing = piece === "king";
  const singleStep = isKing && variant.movement === "kingSingleStep";
  const out = [];
  for (const [dr, dc] of DIRS) {
    let nr = r + dr, nc = c + dc;
    while (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && board[nr][nc] === null) {
      if (isRestricted(nr, nc) && !isKing) {
        if (singleStep) break;
        nr += dr; nc += dc; continue;
      }
      out.push([nr, nc]);
      if (singleStep) break;
      nr += dr; nc += dc;
    }
  }
  return out;
}

function resolveCaptures(board, r, c, side) {
  const enemy = side === "att" ? "def" : "att";
  const captured = [];
  for (const [dr, dc] of DIRS) {
    const mr = r + dr, mc = c + dc;
    const fr = r + dr * 2, fc = c + dc * 2;
    if (mr < 0 || mr >= SIZE || mc < 0 || mc >= SIZE) continue;
    if (board[mr][mc] !== enemy) continue;
    const farInBounds = fr >= 0 && fr < SIZE && fc >= 0 && fc < SIZE;
    const farPieceSide = farInBounds ? (board[fr][fc] === "king" ? "def" : board[fr][fc]) : null;
    const farIsFriendly = farPieceSide === side;
    const farIsHostileSquare = farInBounds && isRestricted(fr, fc);
    if (farIsFriendly || farIsHostileSquare) captured.push([mr, mc]);
  }
  return captured;
}

function resolveMoveCaptures(board, r, c, side, movedPiece, variant) {
  if (movedPiece === "king" && !variant.kingArmed) return [];
  return resolveCaptures(board, r, c, side);
}

function isHostileToKing(board, r, c) {
  if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) return false;
  return board[r][c] === "att" || isRestricted(r, c);
}
function checkKingCapturedWeak(board, kingR, kingC) {
  const axes = [[[-1, 0], [1, 0]], [[0, -1], [0, 1]]];
  return axes.some(([[dr1, dc1], [dr2, dc2]]) =>
    isHostileToKing(board, kingR + dr1, kingC + dc1) && isHostileToKing(board, kingR + dr2, kingC + dc2)
  );
}
function checkKingCaptured(board, kingR, kingC, isLastDefender, variant) {
  if (variant.kingStrength === "weak") return checkKingCapturedWeak(board, kingR, kingC);
  for (const [dr, dc] of DIRS) {
    const nr = kingR + dr, nc = kingC + dc;
    if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) {
      if (isLastDefender) continue;
      return false;
    }
    const occ = board[nr][nc];
    const hostile = occ === "att" || isRestricted(nr, nc);
    if (!hostile) return false;
  }
  return true;
}

function findKing(board) {
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (board[r][c] === "king") return { r, c };
  return null;
}

// Server-authoritative move application. Mirrors simulateMove() in
// index.html exactly — this Worker never trusts a client-submitted board,
// only a client-submitted (from, to) pair, and computes the resulting
// state itself. A move that isn't in legalDestinations() for that piece is
// rejected outright.
function applyMove(board, from, to, side, variant) {
  const piece = board[from.r][from.c];
  if (!piece) return { ok: false, error: "No piece at source square." };
  const pieceSide = piece === "king" ? "def" : piece;
  if (pieceSide !== side) return { ok: false, error: "That piece doesn't belong to the side whose turn it is." };

  const legal = legalDestinations(board, from.r, from.c, variant).some(([r, c]) => r === to.r && c === to.c);
  if (!legal) return { ok: false, error: "Illegal move for this piece under the active rule variant." };

  const next = board.map((row) => row.slice());
  next[from.r][from.c] = null;
  next[to.r][to.c] = piece;

  const captured = resolveMoveCaptures(next, to.r, to.c, side, piece, variant);
  captured.forEach(([r, c]) => { next[r][c] = null; });

  const kingEscaped = piece === "king" && isEscapeSquare(to.r, to.c, variant);
  let kingCaptured = false;
  if (!kingEscaped) {
    const kingPos = findKing(next);
    if (kingPos) {
      const remainingDef = next.flat().filter((p) => p === "def").length;
      kingCaptured = checkKingCaptured(next, kingPos.r, kingPos.c, remainingDef === 0, variant);
    } else {
      kingCaptured = true; // king square had no king left standing at all — treat as captured
    }
  }
  return { ok: true, board: next, captured, kingCaptured, kingEscaped };
}

// ============================================================
// Nine Men's Morris rule engine — ported from index.html the same way as
// Hnefatafl's above. `legalDestinations` is renamed `nmmLegalDestinations`
// here purely to avoid colliding with Hnefatafl's own function of that
// name a few lines up — same underlying logic either side.
// ============================================================
const NMM_POINTS_COUNT = 24;
const NMM_MILLS = [
  [0, 1, 2], [2, 3, 4], [4, 5, 6], [6, 7, 0],
  [8, 9, 10], [10, 11, 12], [12, 13, 14], [14, 15, 8],
  [16, 17, 18], [18, 19, 20], [20, 21, 22], [22, 23, 16],
  [1, 9, 17], [3, 11, 19], [5, 13, 21], [7, 15, 23],
];
const NMM_ADJACENCY = Array.from({ length: NMM_POINTS_COUNT }, () => new Set());
const NMM_POINT_MILLS = Array.from({ length: NMM_POINTS_COUNT }, () => []);
NMM_MILLS.forEach((mill) => {
  const [a, b, c] = mill;
  NMM_ADJACENCY[a].add(b); NMM_ADJACENCY[b].add(a);
  NMM_ADJACENCY[b].add(c); NMM_ADJACENCY[c].add(b);
  mill.forEach((idx) => NMM_POINT_MILLS[idx].push(mill));
});

const NMM_VARIANTS = {
  standard: { key: "standard", pieceCount: 9, flyingEnabled: true, laskerHybrid: false },
  classic: { key: "classic", pieceCount: 9, flyingEnabled: false, laskerHybrid: false },
  lasker: { key: "lasker", pieceCount: 10, flyingEnabled: true, laskerHybrid: true },
};
const NMM_DEFAULT_VARIANT_KEY = "standard";

function nmmInitialPoints() { return Array(NMM_POINTS_COUNT).fill(null); }
function nmmOpponent(side) { return side === "you" ? "cpu" : "you"; }
function nmmMillComplete(points, side, mill) { return mill.every((idx) => points[idx] === side); }
function nmmPointsInMills(points, side) {
  const inMill = new Set();
  NMM_MILLS.forEach((mill) => { if (nmmMillComplete(points, side, mill)) mill.forEach((i) => inMill.add(i)); });
  return inMill;
}
function nmmLegalDestinations(points, fromIdx, flying) {
  if (flying) return points.map((v, i) => (v === null ? i : null)).filter((i) => i !== null);
  return [...NMM_ADJACENCY[fromIdx]].filter((i) => points[i] === null);
}
function nmmSideCanMove(points, side, flying) {
  for (let i = 0; i < NMM_POINTS_COUNT; i++) {
    if (points[i] !== side) continue;
    if (nmmLegalDestinations(points, i, flying).length > 0) return true;
  }
  return false;
}

// Same composite-move shape as index.html's nmmGenerateMoves: a primary
// place/move action, optionally paired with a removeIdx if it completes a
// mill. The server enumerates every legal composite move and checks the
// client's submission is exactly one of them — never trusts a client-
// computed board, same principle as Hnefatafl's applyMove above.
function nmmGenerateMoves(points, side, hand, variant, inPlacementPhase) {
  const flying = variant.flyingEnabled && !inPlacementPhase && points.filter((p) => p === side).length === 3;
  const canPlace = variant.laskerHybrid ? hand > 0 : (inPlacementPhase && hand > 0);
  const canMove = variant.laskerHybrid ? true : !inPlacementPhase;

  const primaries = [];
  if (canPlace) {
    for (let i = 0; i < NMM_POINTS_COUNT; i++) if (points[i] === null) primaries.push({ type: "place", to: i });
  }
  if (canMove) {
    for (let i = 0; i < NMM_POINTS_COUNT; i++) {
      if (points[i] !== side) continue;
      for (const dest of nmmLegalDestinations(points, i, flying)) primaries.push({ type: "move", from: i, to: dest });
    }
  }

  const moves = [];
  for (const primary of primaries) {
    const next = points.slice();
    if (primary.type === "move") next[primary.from] = null;
    next[primary.to] = side;
    const formed = NMM_POINT_MILLS[primary.to].some((mill) => nmmMillComplete(next, side, mill));
    if (!formed) { moves.push({ primary, removeIdx: null }); continue; }
    const oppSide = nmmOpponent(side);
    const oppPieces = [];
    for (let i = 0; i < NMM_POINTS_COUNT; i++) if (next[i] === oppSide) oppPieces.push(i);
    const inMill = nmmPointsInMills(next, oppSide);
    const removable = oppPieces.filter((i) => !inMill.has(i));
    const choices = removable.length > 0 ? removable : oppPieces;
    for (const removeIdx of choices) moves.push({ primary, removeIdx });
  }
  return moves;
}

function nmmMoveEquals(a, b) {
  if (a.primary.type !== b.primary.type || a.primary.to !== b.primary.to) return false;
  if (a.primary.type === "move" && a.primary.from !== b.primary.from) return false;
  return (a.removeIdx ?? null) === (b.removeIdx ?? null);
}

// Server-authoritative composite move: validates the client's exact
// submission against the full legal-move list, applies it, and resolves
// the win condition — mirrors finishTurn()'s logic in index.html.
function nmmApplyMoveOnline(points, youHand, cpuHand, side, variant, submittedMove) {
  const inPlacementPhase = !variant.laskerHybrid && (youHand > 0 || cpuHand > 0);
  const hand = side === "you" ? youHand : cpuHand;
  const legalMoves = nmmGenerateMoves(points, side, hand, variant, inPlacementPhase);
  const match = legalMoves.find((m) => nmmMoveEquals(m, submittedMove));
  if (!match) return { ok: false, error: "Illegal move for this position under the active rule variant." };

  const next = points.slice();
  if (match.primary.type === "move") next[match.primary.from] = null;
  next[match.primary.to] = side;
  if (match.removeIdx !== null) next[match.removeIdx] = null;
  const nextHand = match.primary.type === "place" ? hand - 1 : hand;
  const nextYouHand = side === "you" ? nextHand : youHand;
  const nextCpuHand = side === "cpu" ? nextHand : cpuHand;

  const oppSide = nmmOpponent(side);
  const oppOnBoard = next.filter((p) => p === oppSide).length;
  const oppHand = oppSide === "you" ? nextYouHand : nextCpuHand;
  if (oppOnBoard + oppHand < 3) {
    return { ok: true, points: next, youHand: nextYouHand, cpuHand: nextCpuHand, winner: side };
  }
  const nextInPlacementPhase = !variant.laskerHybrid && (nextYouHand > 0 || nextCpuHand > 0);
  const oppFlying = variant.flyingEnabled && !nextInPlacementPhase && oppOnBoard === 3;
  if (!nextInPlacementPhase && !nmmSideCanMove(next, oppSide, oppFlying)) {
    return { ok: true, points: next, youHand: nextYouHand, cpuHand: nextCpuHand, winner: side };
  }
  return { ok: true, points: next, youHand: nextYouHand, cpuHand: nextCpuHand, winner: null };
}

// ============================================================
// HTTP plumbing
// ============================================================
function corsHeaders(env) {
  return {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Player-Secret",
    "Access-Control-Max-Age": "86400",
  };
}
function json(data, env, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(env) },
  });
}
function randomToken(bytes = 20) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return [...arr].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Very light abuse guard on invite creation — same lesson as ECEG's
// /resend-token rate limit, applied here so a bored friend mashing "Invite"
// can't spam-generate KV writes. Keyed on a coarse client fingerprint
// (there's no auth yet to key on anything better in phase 1).
// Cloudflare KV enforces a hard minimum of 60 seconds on expirationTtl —
// anything shorter throws rather than rounding up, which is what was
// actually causing the 500 here (not a config problem, an oversight on my
// part: 30 looked like a sensible "cooldown" number without checking it
// against KV's floor). 60 is as tight as this can go.
const INVITE_RATE_WINDOW_SECONDS = 60;
async function rateLimited(env, fingerprint) {
  const rlKey = `ratelimit:invite:${fingerprint}`;
  const hit = await env.AG_INVITES.get(rlKey);
  if (hit) return true;
  await env.AG_INVITES.put(rlKey, "1", { expirationTtl: INVITE_RATE_WINDOW_SECONDS });
  return false;
}

async function handleCreateInvite(request, env) {
  const fingerprint = request.headers.get("CF-Connecting-IP") || "unknown";
  if (await rateLimited(env, fingerprint)) {
    return json({ error: "Slow down a bit — try again in a few seconds." }, env, 429);
  }

  let body = {};
  try { body = await request.json(); } catch (e) { /* empty body is fine, use defaults */ }
  const gameType = body.gameType === "nmm" ? "nmm" : "hnefatafl"; // hnefatafl stays the default so existing Hnefatafl invite calls (no gameType sent) keep working unchanged

  const gameId = randomToken(12);
  const inviteToken = randomToken(20);
  const hostSecret = randomToken(24);
  const now = Date.now();

  let game;
  if (gameType === "nmm") {
    const variantKey = NMM_VARIANTS[body.variant] ? body.variant : NMM_DEFAULT_VARIANT_KEY;
    const pieceCount = NMM_VARIANTS[variantKey].pieceCount;
    game = {
      gameId,
      gameType: "nmm",
      variant: variantKey,
      points: nmmInitialPoints(),
      youHand: pieceCount,
      cpuHand: pieceCount,
      turn: "you",
      moveHistory: [],
      winner: null,
      status: "waiting",
      hostSecret,
      hostSide: null,
      guestSecret: null,
      guestSide: null,
      createdAt: now,
      updatedAt: now,
    };
  } else {
    const variantKey = RULE_VARIANTS[body.variant] ? body.variant : DEFAULT_VARIANT_KEY;
    game = {
      gameId,
      gameType: "hnefatafl",
      variant: variantKey,
      board: initialBoard(),
      turn: "att",
      moveHistory: [],
      winner: null,
      status: "waiting", // waiting -> active -> finished
      hostSecret,
      hostSide: null,   // assigned once the guest picks a side or defaults on redeem
      guestSecret: null,
      guestSide: null,
      createdAt: now,
      updatedAt: now,
    };
  }
  await env.AG_GAMES.put(`game:${gameId}`, JSON.stringify(game));

  const invite = {
    token: inviteToken,
    gameId,
    status: "pending", // pending -> redeemed -> expired
    createdAt: now,
    expiresAt: now + 1000 * 60 * 60 * 24 * 7, // 7 days — plenty for a friend to actually open a link
  };
  await env.AG_INVITES.put(`invite:${inviteToken}`, JSON.stringify(invite), { expirationTtl: 60 * 60 * 24 * 7 });

  return json({
    gameId,
    hostSecret,
    gameType,
    variant: game.variant,
    url: `${env.GAME_URL}?invite=${inviteToken}`,
  }, env);
}

async function handleGetInvite(token, env) {
  const raw = await env.AG_INVITES.get(`invite:${token}`);
  if (!raw) return json({ valid: false, reason: "not_found" }, env, 404);
  const invite = JSON.parse(raw);
  if (invite.status === "redeemed") return json({ valid: false, reason: "already_redeemed" }, env, 410);
  if (Date.now() > invite.expiresAt) return json({ valid: false, reason: "expired" }, env, 410);

  const gameRaw = await env.AG_GAMES.get(`game:${invite.gameId}`);
  if (!gameRaw) return json({ valid: false, reason: "game_missing" }, env, 404);
  const game = JSON.parse(gameRaw);
  return json({ valid: true, gameId: game.gameId, variant: game.variant, gameType: game.gameType }, env);
}

async function handleRedeemInvite(token, env) {
  const raw = await env.AG_INVITES.get(`invite:${token}`);
  if (!raw) return json({ error: "Invite not found." }, env, 404);
  const invite = JSON.parse(raw);
  if (invite.status === "redeemed") return json({ error: "This invite has already been used." }, env, 410);
  if (Date.now() > invite.expiresAt) return json({ error: "This invite link has expired." }, env, 410);

  const gameRaw = await env.AG_GAMES.get(`game:${invite.gameId}`);
  if (!gameRaw) return json({ error: "Game not found." }, env, 404);
  const game = JSON.parse(gameRaw);
  if (game.status !== "waiting") return json({ error: "This game already has two players." }, env, 409);

  // Host always plays the side that moves first (Muscovites for Hnefatafl,
  // "you" for NMM's internal side-tag convention) — a coin flip or side-
  // choice screen is a fine phase-2 nicety for either game, not needed to
  // ship.
  const guestSecret = randomToken(24);
  if (game.gameType === "nmm") {
    game.hostSide = "you";
    game.guestSide = "cpu"; // internal tag only — the frontend displays "You"/"Opponent" for both real players, never literally shows "CPU" to a human
  } else {
    game.hostSide = "att";
    game.guestSide = "def";
  }
  game.guestSecret = guestSecret;
  game.status = "active";
  game.updatedAt = Date.now();
  await env.AG_GAMES.put(`game:${game.gameId}`, JSON.stringify(game));

  invite.status = "redeemed";
  await env.AG_INVITES.put(`invite:${token}`, JSON.stringify(invite));

  return json({
    gameId: game.gameId,
    guestSecret,
    gameType: game.gameType,
    variant: game.variant,
    hostSide: game.hostSide,
    guestSide: game.guestSide,
  }, env);
}

// State reads are deliberately public-by-gameId (no secret required) so
// polling is cheap and simple — the gameId itself is a 12-byte random
// token, not guessable, and read access alone can't affect the game.
async function handleGameState(gameId, env) {
  const raw = await env.AG_GAMES.get(`game:${gameId}`);
  if (!raw) return json({ error: "Game not found." }, env, 404);
  const game = JSON.parse(raw);
  // Never expose the bearer secrets in a state read.
  const { hostSecret, guestSecret, ...publicGame } = game;
  return json(publicGame, env);
}

async function handleMove(gameId, request, env) {
  const secret = request.headers.get("X-Player-Secret");
  if (!secret) return json({ error: "Missing player secret." }, env, 401);

  let body;
  try { body = await request.json(); } catch (e) { return json({ error: "Bad request body." }, env, 400); }

  const raw = await env.AG_GAMES.get(`game:${gameId}`);
  if (!raw) return json({ error: "Game not found." }, env, 404);
  const game = JSON.parse(raw);

  if (game.status !== "active") return json({ error: "This game isn't active." }, env, 409);

  let side;
  if (secret === game.hostSecret) side = game.hostSide;
  else if (secret === game.guestSecret) side = game.guestSide;
  else return json({ error: "Invalid player secret for this game." }, env, 403);

  if (side !== game.turn) return json({ error: "It isn't your turn." }, env, 409);

  if (game.gameType === "nmm") {
    // NMM's move shape is a composite (place-or-move plus an optional
    // removal), not the simple {from,to} Hnefatafl uses — `to` can
    // legitimately be point 0, so this checks for undefined specifically
    // rather than a plain truthiness check that would wrongly reject it.
    const move = body.move;
    if (!move || !move.primary || !move.primary.type || move.primary.to === undefined) {
      return json({ error: "Move must include a primary place/move action." }, env, 400);
    }
    const variant = NMM_VARIANTS[game.variant] || NMM_VARIANTS[NMM_DEFAULT_VARIANT_KEY];
    const removeIdx = move.removeIdx === undefined ? null : move.removeIdx;
    const result = nmmApplyMoveOnline(game.points, game.youHand, game.cpuHand, side, variant, { primary: move.primary, removeIdx });
    if (!result.ok) return json({ error: result.error }, env, 400);

    game.points = result.points;
    game.youHand = result.youHand;
    game.cpuHand = result.cpuHand;
    game.moveHistory.push({ primary: move.primary, removeIdx, side, ts: Date.now() });
    game.updatedAt = Date.now();

    if (result.winner) {
      game.status = "finished";
      game.winner = result.winner;
    } else {
      game.turn = nmmOpponent(game.turn);
    }
  } else {
    const { from, to } = body || {};
    if (!from || !to) return json({ error: "Move must include from and to." }, env, 400);

    const variant = RULE_VARIANTS[game.variant] || RULE_VARIANTS[DEFAULT_VARIANT_KEY];
    const result = applyMove(game.board, from, to, side, variant);
    if (!result.ok) return json({ error: result.error }, env, 400);

    game.board = result.board;
    game.moveHistory.push({ from, to, side, capturedCount: result.captured.length, ts: Date.now() });
    game.updatedAt = Date.now();

    if (result.kingEscaped) {
      game.status = "finished";
      game.winner = "def";
    } else if (result.kingCaptured) {
      game.status = "finished";
      game.winner = "att";
    } else {
      game.turn = game.turn === "att" ? "def" : "att";
    }
  }

  await env.AG_GAMES.put(`game:${gameId}`, JSON.stringify(game));
  const { hostSecret, guestSecret, ...publicGame } = game;
  return json(publicGame, env);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    if (method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(env) });
    }

    try {
      if (path === "/invite/create" && method === "POST") {
        return await handleCreateInvite(request, env);
      }
      const inviteMatch = path.match(/^\/invite\/([a-f0-9]{40})$/);
      if (inviteMatch && method === "GET") {
        return await handleGetInvite(inviteMatch[1], env);
      }
      const redeemMatch = path.match(/^\/invite\/([a-f0-9]{40})\/redeem$/);
      if (redeemMatch && method === "POST") {
        return await handleRedeemInvite(redeemMatch[1], env);
      }
      const stateMatch = path.match(/^\/games\/([a-f0-9]{24})\/state$/);
      if (stateMatch && method === "GET") {
        return await handleGameState(stateMatch[1], env);
      }
      const moveMatch = path.match(/^\/games\/([a-f0-9]{24})\/move$/);
      if (moveMatch && method === "POST") {
        return await handleMove(moveMatch[1], request, env);
      }
      return json({ error: "Not found." }, env, 404);
    } catch (err) {
      return json({ error: "Unexpected server error.", detail: String(err) }, env, 500);
    }
  },
};
