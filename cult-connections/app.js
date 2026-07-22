// ══════════════════════════════════════
// STATE
// ══════════════════════════════════════
const S = {
  mode:'solo', player:'scott', difficulty:'easy',
  puzzleNum:1,
  stars:0,          // current star wallet
  sessionStars:0,   // total stars earned this session
  puzzleStreak:0,   // puzzles completed without game over / timeout
  bonusStarAt:10,   // streak milestone for bonus star
  timerSecs:90, timerMax:90, timerHandle:null,
  lives:4, selected:[], tiles:[], solvedCats:[],
  gameActive:false, usedCategories:new Set(),
  msgTimeout:null, _puzzle:null,
  hintedCats:new Set(), // cats where hint tile was used — no star awarded
};

const DIFF = {
  easy:  {time:120, penalty:10},
  medium:{time:105, penalty:15},
  hard:  {time:90,  penalty:20},
};

const CAT_COLORS = [
  {bg:"#C9A84C",text:"#080810"},
  {bg:"#C0392B",text:"#fff"},
  {bg:"#2E6DA4",text:"#fff"},
  {bg:"#1e8449",text:"#fff"},
];

// ══════════════════════════════════════
// THEME BACKLOG — no longer used for live generation.
// These are the theme ideas earmarked for hand-authoring into
// real FALLBACK_BANKS-style puzzles during the 90-day content cycle
// (Sport/Fashion additions from the July 2026 planning session).
// Keep as a checklist; convert each into a full puzzle object, then
// mark it done here or delete once it's shipped as real content.
// ══════════════════════════════════════
const POOLS = {
  scott:[
    "Seinfeld deep cuts and recurring characters",
    "Robert Johnson blues songs",
    "Legendary electric guitar riffs by song name",
    "Signature guitars owned by famous guitarists",
    "Classic 80s action film characters",
    "Die Hard movie characters",
    "Keanu Reeves film roles",
    "V for Vendetta key elements",
    "Big Trouble in Little China quotes",
    "Back to the Future references",
    "RoboCop characters",
    "The Matrix characters",
    "Crossroads 1986 film elements",
    "Led Zeppelin albums",
    "Famous Stratocaster players",
    "George Costanza schemes and aliases",
    "Kramer business ideas in Seinfeld",
    "Things Newman does in Seinfeld",
    "Blues guitar legends",
    "Famous guitar solos by song",
    "Travelling Wilburys members",
    "Muppet Electric Mayhem band members",
    "Songs with Highway in the title",
    "Classic rock bands named after colours",
    "One-name rock and blues musicians",
    "Seinfeld episode iconic moments",
    "Famous fictional bartenders on TV",
    "Classic 80s movie quotes",
    "80s and 90s tennis legends",
    "Pat Cash and Wimbledon history",
    "John McEnroe on-court moments",
    "Andre Agassi career and image",
    "Pete Sampras Grand Slam records",
    "Classic Formula 1 drivers",
    "Ayrton Senna career highlights",
    "Prost versus Senna rivalry",
    "Classic F1 teams of the 80s and 90s",
    "Nigel Mansell career moments",
    "80s and 90s sportswear brands",
    "Reebok Nike Adidas Puma rivalry",
    "Retro tennis fashion",
    "Classic tracksuit and trainer brands",
  ],
  kids:[
    "Harry Potter spells and their effects",
    "Harry Potter Horcruxes",
    "Hogwarts houses and their traits",
    "Harry Potter characters at Hogwarts",
    "The Office US characters",
    "Michael Scott famous quotes",
    "Dwight Schrute facts and beliefs",
    "The Office US memorable plot moments",
    "Friends character quirks",
    "Friends episode titles",
    "Chandler Bing sarcastic quotes",
    "Joey Tribbiani food obsessions",
    "Friends recurring locations",
    "Harry Potter magical creatures",
    "Harry Potter Deathly Hallows elements",
    "Things that happen at Hogwarts every year",
    "Friends — things Ross says",
    "The Office — things that happen at Dunder Mifflin",
    "Modern tennis rivalries and stars",
    "Recent Wimbledon and Grand Slam champions",
    "Tennis players featured in Netflix documentaries",
    "Modern Formula 1 drivers",
    "Formula 1 teams of the current era",
    "Storylines from Drive to Survive",
    "Modern sneaker and streetwear brands",
    "Sportswear brands popular in collabs and drops",
    "Sneaker culture and resale trends",
  ],
  mixed:[
    "Seinfeld catchphrases",
    "Harry Potter spells",
    "The Office US memorable moments",
    "Friends quotes",
    "Classic 80s film characters",
    "Famous guitar riffs by song name",
    "Blues music legends",
    "TV show theme song artists",
    "Famous fictional vehicles",
    "Rock bands named after places",
    "Songs with numbers in the title",
    "Famous fictional addresses",
    "Movies with sequels numbered three or higher",
    "Famous music duos",
    "TV spin-off shows",
    "Actors who played the same role twice in different films",
    "Federer Nadal Djokovic Murray — the Big Four",
    "Iconic sportswear brand logos",
    "Famous tennis racquet brands",
    "Cricket and baseball bat brands",
  ],
  seinfeld:[
    "George Costanza fake identities and aliases",
    "Kramer get-rich-quick schemes",
    "Newman's jobs and schemes",
    "Jerry's girlfriends and their quirks",
    "Famous Seinfeld episode plot twists",
    "Things Elaine does at work",
    "Seinfeld invented words and phrases",
    "Festivus traditions",
    "Soup Nazi rules",
    "George Costanza lies",
    "Seinfeld apartment building details",
    "J Peterman catalog descriptions",
    "Things characters do at Monk's Cafe",
    "Seinfeld finale references",
    "George Costanza jobs held during the series",
    "Recurring background characters in Seinfeld",
  ],
};

// ══════════════════════════════════════
// ACCESS CONTROL — 30-day trial, then free-tier or paid unlock
// ══════════════════════════════════════
// TODO: replace with real Cloudflare Worker URL once deployed
const CC_WORKER = "https://cult-connections.emblen-scott.workers.dev";

const CC_TIERS = {
  square_eyes:        { label:"Square Eyes",         days:30  },
  couch_potato:        { label:"Couch Potato",        days:182 },
  pop_culture_vulture:  { label:"Pop Culture Vulture", days:365 },
};

function getInstallDate(){
  try{
    let d = localStorage.getItem('cc_install_date');
    if(!d){
      d = new Date().toISOString();
      localStorage.setItem('cc_install_date', d);
    }
    return new Date(d);
  }catch(e){ return new Date(); }
}

function getTrialDaysLeft(){
  const installed = getInstallDate();
  const elapsedDays = Math.floor((Date.now() - installed.getTime()) / 86400000);
  return Math.max(0, 30 - elapsedDays);
}

function getStoredUnlock(){
  try{
    const tier = localStorage.getItem('cc_unlock_tier');
    const expiry = localStorage.getItem('cc_unlock_expiry');
    if(!tier || !expiry) return null;
    if(new Date(expiry).getTime() < Date.now()) return null; // expired
    return { tier, expiry, label: (CC_TIERS[tier]||{}).label || tier };
  }catch(e){ return null; }
}

// Determines what the player can currently access.
// Returns: { mode: 'trial'|'unlocked'|'free', daysLeft, unlock }
function getAccessState(){
  const unlock = getStoredUnlock();
  if(unlock) return { mode:'unlocked', unlock };
  const daysLeft = getTrialDaysLeft();
  if(daysLeft > 0) return { mode:'trial', daysLeft };
  return { mode:'free' };
}

function renderAccessStatus(){
  const el = document.getElementById('accessStatus');
  if(!el) return;
  const state = getAccessState();
  if(state.mode === 'unlocked'){
    el.textContent = `🔓 ${state.unlock.label} — unlocked until ${new Date(state.unlock.expiry).toLocaleDateString()}`;
    el.onclick = null;
  } else if(state.mode === 'trial'){
    el.textContent = `🎬 Free trial — ${state.daysLeft} day${state.daysLeft===1?'':'s'} left · Tap to unlock early`;
    el.onclick = openPurchaseScreen;
  } else {
    el.textContent = '🔒 Trial ended — 25 free puzzles still yours. Tap to unlock full access';
    el.onclick = openPurchaseScreen;
  }
}

// Redeem a token returned from Stripe checkout (via ?cc_token=... redirect, or pasted manually)
// Retries a few times: the browser can land back here slightly before the
// Stripe webhook has finished flipping the token from "pending" to "paid"
// in KV, so a single immediate check can lose that race.
async function redeemToken(tokenStr, attempt = 1){
  const MAX_ATTEMPTS = 5;
  const RETRY_DELAY_MS = 1500;

  try{
    const res = await fetch(`${CC_WORKER}/verify-token`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ token: tokenStr })
    });
    const data = await res.json();

    if(data.valid){
      localStorage.setItem('cc_unlock_tier', data.tier);
      localStorage.setItem('cc_unlock_expiry', data.expiry);
      renderAccessStatus();
      showGruberToast(`🔓 Unlocked — ${(CC_TIERS[data.tier]||{}).label || data.tier}!`, 3000);
      return true;
    }

    // Payment confirmed but webhook hasn't landed yet — worth retrying quietly.
    // Re-show the toast on every attempt (not just the first) so it stays
    // visible the whole time instead of disappearing mid-retry.
    const stillPending = (data.reason || '').toLowerCase().includes('not yet confirmed');
    if(stillPending && attempt < MAX_ATTEMPTS){
      showGruberToast('Confirming your payment…', RETRY_DELAY_MS + 200);
      await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
      return redeemToken(tokenStr, attempt + 1);
    }

    // Genuinely invalid, or we've retried enough times — give up and say so
    showGruberToast(`Unlock failed: ${data.reason || 'invalid token'}`, 4000);
    return false;
  }catch(e){
    if(attempt < MAX_ATTEMPTS){
      await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
      return redeemToken(tokenStr, attempt + 1);
    }
    showGruberToast('Could not verify unlock — check connection and try again', 3000);
    return false;
  }
}

// Kicks off Stripe Checkout for a given tier via the worker's /create-checkout route
async function purchaseTier(tierKey){
  try{
    const res = await fetch(`${CC_WORKER}/create-checkout`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ tier: tierKey })
    });
    const data = await res.json();
    if(data.url){ window.location.href = data.url; }
    else { showGruberToast('Checkout unavailable right now — try again shortly', 3000); }
  }catch(e){
    showGruberToast('Checkout unavailable right now — try again shortly', 3000);
  }
}

function openPurchaseScreen(){
  showScreen('purchaseScreen');
}

// On load: check for a token in the URL (post-Stripe redirect) and redeem it automatically
(function checkUrlForToken(){
  const params = new URLSearchParams(window.location.search);
  const t = params.get('cc_token');
  if(t){
    redeemToken(t).then(()=>{
      // clean the token out of the URL bar
      const url = new URL(window.location.href);
      url.searchParams.delete('cc_token');
      window.history.replaceState({}, '', url.toString());
    });
  }
})();

// ══════════════════════════════════════
// SCREEN NAV
// ══════════════════════════════════════
function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ══════════════════════════════════════
// HOME
// ══════════════════════════════════════
function setDiff(btn,d){
  document.querySelectorAll('.diff-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  S.difficulty=d;
}

function startMode(mode){
  S.mode=mode;
  if(mode==='family'){showScreen('familyScreen');return;}
  S.player = mode==='seinfeld' ? 'seinfeld' : mode==='blitz' ? 'mixed' : 'scott';
  fetchAndLaunch();
}

// ══════════════════════════════════════
// FAMILY
// ══════════════════════════════════════
function selectPlayer(card,player){
  document.querySelectorAll('.player-card').forEach(c=>c.classList.remove('selected'));
  card.classList.add('selected');
  S.player=player;
  document.getElementById('familyGoBtn').disabled=false;
}
function launchFamily(){fetchAndLaunch();}

// ══════════════════════════════════════
// ══════════════════════════════════════
// PUZZLE LAUNCH — offline bank only (no live generation)
// Content is refreshed by the dev team on a ~90-day cycle instead.
// TODO: once premium packs (Sport/Fashion/etc) are hand-authored,
// tag their FALLBACK_BANKS entries e.g. {premium:true} and filter
// them out here when getAccessState().mode === 'free'.
// ══════════════════════════════════════
async function fetchAndLaunch(){
  showScreen('loadScreen');
  clearInterval(S.timerHandle);
  S.selected=[];S.tiles=[];S.solvedCats=[];S.gameActive=false;
  document.getElementById('solvedArea').innerHTML='';
  document.getElementById('progFill').style.width='0%';

  document.getElementById('loadMsg').textContent='LOADING YOUR PUZZLE...';
  document.getElementById('loadThemes').textContent='';

  // Small delay so the load screen doesn't flash instantly
  await new Promise(r=>setTimeout(r,400));
  launchGame(getFallback());
}

// ══════════════════════════════════════
// FALLBACK PUZZLE BANKS — 25 puzzles
// No API needed. Rotates so no repeats.
// ══════════════════════════════════════
const FALLBACK_BANKS = {
  scott:[
    {themeLabel:"BLUES, FILM & STRINGS",categories:[
      {label:"ROBERT JOHNSON SONGS",items:["CROSS ROAD BLUES","SWEET HOME CHICAGO","HELLHOUND ON MY TRAIL","LOVE IN VAIN"],hint1:"Think midnight at a dusty crossroads in Mississippi",hint2:"A Delta bluesman who sold his soul — these are his songs",hint3:"Robert Johnson recorded these in the 1930s"},
      {label:"DIE HARD CHARACTERS",items:["MCCLANE","GRUBER","POWELL","DWAYNE T. ROBINSON"],hint1:"Think Christmas Eve and a very tall building",hint2:"A cop, a thief, a sergeant and a bureaucrat walk into a skyscraper",hint3:"Yippee-ki-yay — these are all from Nakatomi Plaza"},
      {label:"LEGENDARY SIGNATURE GUITARS",items:["LUCILLE","FRANKENSTRAT","BLACKIE","THE LOG"],hint1:"These are pet names — not for people",hint2:"Famous guitarists named their instruments — these are the names",hint3:"BB King, Eddie Van Halen, Eric Clapton and Les Paul all named theirs"},
      {label:"KEANU REEVES FILM ROLES",items:["NEO","JOHN WICK","JACK TRAVEN","JOHNNY UTAH"],hint1:"One actor, four very different films",hint2:"He's been a hacker, an assassin, a cop on a bus and an FBI agent surfer",hint3:"Keanu played all four — red pill, gun-fu, Speed, Point Break"},
    ]},
    {themeLabel:"RIFFS & QUOTES",categories:[
      {label:"SONGS WITH A FAMOUS OPENING RIFF",items:["SMOKE ON THE WATER","WHOLE LOTTA LOVE","LAYLA","SATISFACTION"]},
      {label:"BIG TROUBLE IN LITTLE CHINA QUOTES",items:["IT'S ALL IN THE REFLEXES","SOONER OR LATER","LIKE I TOLD MY LAST WIFE","JACK BURTON SAYS"]},
      {label:"BACK TO THE FUTURE — YEARS VISITED",items:["1885","1955","1985","2015"]},
      {label:"GUITAR BODY SHAPES",items:["STRATOCASTER","LES PAUL","TELECASTER","FLYING V"]},
    ]},
    {themeLabel:"STRINGS & SCREENS",categories:[
      {label:"TRAVELLING WILBURYS MEMBERS",items:["ROY ORBISON","BOB DYLAN","TOM PETTY","GEORGE HARRISON"]},
      {label:"MATRIX CHARACTERS",items:["NEO","MORPHEUS","TRINITY","THE ORACLE"]},
      {label:"V FOR VENDETTA ELEMENTS",items:["GUY FAWKES","EVEY HAMMOND","SHADOW GALLERY","FIFTH OF NOVEMBER"]},
      {label:"GUITAR EFFECTS PEDALS",items:["WAH","OVERDRIVE","REVERB","PHASER"]},
    ]},
    {themeLabel:"AXES & ACTION",categories:[
      {label:"MUPPET ELECTRIC MAYHEM MEMBERS",items:["ANIMAL","FLOYD PEPPER","ZOOT","JANICE"]},
      {label:"ROBOCOP CHARACTERS",items:["MURPHY","DICK JONES","CLARENCE BODDICKER","THE OLD MAN"]},
      {label:"SONGS WITH HIGHWAY IN THE TITLE",items:["HIGHWAY TO HELL","HIGHWAY STAR","HIGHWAY 61 REVISITED","PEACE OF MIND"]},
      {label:"FAMOUS ONE-NAME ROCK MUSICIANS",items:["SLASH","BONO","PRINCE","STING"]},
    ]},
    {themeLabel:"CROSSROADS & CREDITS",categories:[
      {label:"CROSSROADS FILM CHARACTERS",items:["EUGENE MARTONE","WILLIE BROWN","SCRATCH","JACK BUTLER"]},
      {label:"CLASSIC ROCK BANDS WITH COLOURS",items:["THE BLACK KEYS","DEEP PURPLE","GOLDEN EARRING","WHITE STRIPES"]},
      {label:"LED ZEPPELIN ALBUMS",items:["PHYSICAL GRAFFITI","HOUSES OF THE HOLY","PRESENCE","IN THROUGH THE OUT DOOR"]},
      {label:"SEINFELD — GEORGE'S FAKE JOBS",items:["ARCHITECT","MARINE BIOLOGIST","IMPORTER/EXPORTER","LATEX SALESMAN"]},
    ]},
    {themeLabel:"GUITAR HEROES & THE BLUES",categories:[
      {label:"FAMOUS ELECTRIC GUITAR MODELS",items:["GIBSON SG","IBANEZ JEM 777","FENDER STARCASTER","FENDER JAGUAR"]},
      {label:"GIBSON LES PAUL LEGENDARY PLAYERS",items:["JIMMY PAGE","DUANE ALLMAN","PETER GREEN","SLASH"]},
      {label:"ROBERT JOHNSON SONGS",items:["CROSS ROAD BLUES","SWEET HOME CHICAGO","LOVE IN VAIN","HELLHOUND ON MY TRAIL"]},
      {label:"CLASSIC FILM ONE-WORD TITLES",items:["JAWS","ROCKY","ALIEN","GREASE"]},
    ]},
    {themeLabel:"SEINFELD DEEP CUTS",categories:[
      {label:"GEORGE COSTANZA ALIASES",items:["ART VANDELAY","H.E. PENNYPACKER","LLOYD BRAUN","PETER VAN NOSTRAND"]},
      {label:"KRAMER'S BUSINESS IDEAS",items:["PETERMAN REALITY TOUR","MOVIEFONE","FUSILLI JERRY","THE BEACH"]},
      {label:"THINGS NEWMAN DOES",items:["HOARDS MAIL IN STORAGE","BOTTLE RETURN SCHEME","FLEA INFESTATION","READS ELAINE'S MAIL"]},
      {label:"JERRY'S STAND-UP TOPICS",items:["AIRLINE FOOD","FRONT POCKETS","GROCERY LINES","ATM ETIQUETTE"]},
    ]},
    {themeLabel:"MORE SEINFELD",categories:[
      {label:"FESTIVUS TRADITIONS",items:["AIRING OF GRIEVANCES","FEATS OF STRENGTH","FESTIVUS POLE","NO TINSEL"]},
      {label:"SOUP NAZI RULES",items:["NO SOUP FOR YOU","MOVE IT ALONG","NEXT","YOU ARE BANNED"]},
      {label:"GEORGE COSTANZA REAL JOBS",items:["REAL ESTATE BROKER","NEW YORK YANKEES","PLAY NOW SPORTING GOODS","KRUGER INDUSTRIAL SMOOTHING"]},
      {label:"SEINFELD RECURRING CHARACTERS",items:["NEWMAN","UNCLE LEO","J. PETERMAN","PUDDY"]},
    ]},
    {themeLabel:"LOOK AT MOIYE",categories:[
      {label:"KATH & KIM'ISMS",items:["FOXY MORON","CONNUBIALS","PACIFICALLY ENTAILS","HUNK OF SPUNK"]},
      {label:"FOUNTAIN LAKES ENSEMBLE",items:["PRUE AND TRUDE","GARY POOLE","THE BOLTON SISTERS","MANDY PATINKIN"]},
      {label:"RUNNING CATCHPHRASES",items:["LOOK AT MOIYE","NOICE DIFFERENT UNUSUAL","STUNNED MULLET","EFFLUENT"]},
      {label:"WHAT THEY CALL THEMSELVES",items:["STUPID GIRL","HORN BAG","HIGH MAINTENANCE","SECOND BEST FRIEND"]},
    ]},
    {themeLabel:"ICONIC WHEELS",categories:[
      {label:"ICONIC MOVIE & TV CARS",pool:["DELOREAN","GENERAL LEE","KITT","HERBIE","BULLITT","ECTO-1"]},
      {label:"F1 TEAM NAMES",pool:["MCLAREN","WILLIAMS","FERRARI","AUDI","RED BULL","MERCEDES","ASTON MARTIN","ALPINE"]},
      {label:"MOTORCYCLE BRANDS",pool:["HARLEY-DAVIDSON","TRIUMPH","HONDA","KAWASAKI","YAMAHA","DUCATI"]},
      {label:"FAMOUS BOND CARS",pool:["ASTON MARTIN DB5","LOTUS ESPRIT","ASTON MARTIN DBS","BMW Z3","ASTON MARTIN VANQUISH","CITROËN 2CV"]},
    ]},
    {themeLabel:"GLOBAL CHAMPIONS",categories:[
      {label:"THE BIG FOUR",items:["FEDERER","NADAL","DJOKOVIC","MURRAY"]},
      {label:"TENNIS LEGENDS",pool:["SERENA WILLIAMS","VENUS WILLIAMS","STEFFI GRAF","MARTINA NAVRATILOVA","MONICA SELES","MARTINA HINGIS"]},
      {label:"GOLF LEGENDS",pool:["TIGER WOODS","JACK NICKLAUS","ARNOLD PALMER","RORY MCILROY","GARY PLAYER","SEVE BALLESTEROS"]},
      {label:"GRAND SLAM TOURNAMENTS",items:["WIMBLEDON","US OPEN","FRENCH OPEN","AUSTRALIAN OPEN"]},
    ]},
  ],
  kids:[
    {themeLabel:"MAGIC & MUNDANE",categories:[
      {label:"HARRY POTTER HORCRUXES",items:["TOM'S DIARY","HUFFLEPUFF CUP","NAGINI","THE DIADEM"]},
      {label:"MICHAEL SCOTT QUOTES START WITH",items:["THAT'S WHAT SHE SAID","I DECLARE BANKRUPTCY","IDENTITY THEFT IS NOT","WOULD I RATHER BE"]},
      {label:"FRIENDS — JOEY WON'T SHARE HIS",items:["FOOD","SANDWICH","MEATBALL SUB","THANKSGIVING TURKEY"]},
      {label:"HOGWARTS SUBJECTS",items:["TRANSFIGURATION","POTIONS","DIVINATION","DEFENCE AGAINST DARK ARTS"]},
    ]},
    {themeLabel:"SPELLS & SITCOMS",categories:[
      {label:"HARRY POTTER UNFORGIVABLE CURSES",items:["AVADA KEDAVRA","CRUCIO","IMPERIO","SECTUMSEMPRA"]},
      {label:"DWIGHT SCHRUTE FACTS",items:["BEET FARMER","VOLUNTEER SHERIFF","BEARS BEETS","ASSISTANT TO THE MANAGER"]},
      {label:"FRIENDS — THINGS ROSS SAYS",items:["WE WERE ON A BREAK","SCIENCE","DINOSAURS","PIVOT"]},
      {label:"HOGWARTS HOUSES",items:["GRYFFINDOR","SLYTHERIN","RAVENCLAW","HUFFLEPUFF"]},
    ]},
    {themeLabel:"OFFICES & OWLS",categories:[
      {label:"HARRY POTTER — DEATHLY HALLOWS",items:["ELDER WAND","RESURRECTION STONE","INVISIBILITY CLOAK","GOLDEN SNITCH"]},
      {label:"THE OFFICE — THINGS AT DUNDER MIFFLIN",items:["PRETZEL DAY","BEACH GAMES","OFFICE OLYMPICS","THE DUNDIES"]},
      {label:"FRIENDS — CENTRAL PERK REGULARS",items:["RACHEL","MONICA","PHOEBE","GUNTHER"]},
      {label:"HARRY POTTER MAGICAL CREATURES",items:["HIPPOGRIFF","BASILISK","THESTRAL","FLOBBERWORM"]},
    ]},
    {themeLabel:"DUMBLEDORE & DUNDIES",categories:[
      {label:"HARRY POTTER — DUMBLEDORE'S ARMY",items:["HARRY","HERMIONE","NEVILLE","LUNA"]},
      {label:"THE OFFICE — MICHAEL SCOTT FILMS",items:["THREAT LEVEL MIDNIGHT","CORPORATE ZOMBIE","LAZY SCRANTON","SOMEHOW I MANAGE"]},
      {label:"FRIENDS SEASON ONE PLOT POINTS",items:["ROSS LIKES RACHEL","MONICA DATES PAUL","JOEY GETS A PART","CHANDLER QUITS"]},
      {label:"HOGWARTS PROFESSORS",items:["MCGONAGALL","SNAPE","LUPIN","SPROUT"]},
    ]},
    {themeLabel:"FRIENDS TRIVIA",categories:[
      {label:"CHANDLER BING'S DEFINING TRAITS",items:["SARCASM","HATES THANKSGIVING","JOB NOBODY KNOWS","COULD HE BE ANY MORE"]},
      {label:"FRIENDS — MONICA'S JOBS",items:["IRIDIUM CHEF","BREAKFAST CHEF","COOKING TEACHER","CATERER"]},
      {label:"HARRY POTTER — ORDER OF THE PHOENIX",items:["SIRIUS BLACK","MAD-EYE MOODY","TONKS","KINGSLEY"]},
      {label:"THE OFFICE — RELATIONSHIPS",items:["JIM AND PAM","DWIGHT AND ANGELA","MICHAEL AND HOLLY","RYAN AND KELLY"]},
    ]},
    {themeLabel:"KATH & KIM SPECIAL",categories:[
      {label:"KATH & KIM CHARACTERS",items:["KATH DAY","KIM CRAIG","SHARON STRZELECKI","BRETT CRAIG"]},
      {label:"KATH & KIM CATCHPHRASES",items:["LOOK AT MOI","NOIICE","IT'S NOICE","HORNBAG"]},
      {label:"KATH & KIM LOCATIONS",items:["FOUNTAIN LAKES","SIZZLER","KFC","THE HAIR SALON"]},
      {label:"KATH'S HOBBIES",items:["POWER WALKING","DRAGONS ABREAST","COOKING","AEROBICS"]},
    ]},
    {themeLabel:"MORE OFFICE TRIVIA",categories:[
      {label:"THE OFFICE — THINGS KEVIN SAYS",items:["CHILLI","MATH","COOKIES","THE BANK"]},
      {label:"HARRY POTTER — VOLDEMORT'S NAMES",items:["HE-WHO-MUST-NOT-BE-NAMED","THE DARK LORD","TOM RIDDLE","YOU-KNOW-WHO"]},
      {label:"FRIENDS — PHOEBE BUFFAY SONGS",items:["SMELLY CAT","LITTLE BLACK CURLY HAIR","STICKY SHOES","JINGLE BITCH"]},
      {label:"THE OFFICE — JIM HALPERT PRANKS",items:["STAPLER IN JELLO","DESK ON ROOF","FUTURE DWIGHT","GAYDAR"]},
    ]},
  ],
  mixed:[
    {themeLabel:"EVERYONE SUFFERS EQUALLY",categories:[
      {label:"TRAVELLING WILBURYS MEMBERS",items:["ROY ORBISON","BOB DYLAN","TOM PETTY","GEORGE HARRISON"]},
      {label:"UNFORGIVABLE CURSES + ONE FAKE",items:["AVADA KEDAVRA","CRUCIO","IMPERIO","EXPELLIARMUS"]},
      {label:"GEORGE PRETENDS TO BE A",items:["ARCHITECT","MARINE BIOLOGIST","IMPORTER/EXPORTER","LATEX SALESMAN"]},
      {label:"FRIENDS — ROSS'S EX-WIVES",items:["CAROL","EMILY","RACHEL","ELIZABETH"]},
    ]},
    {themeLabel:"CROSS-GENERATIONAL",categories:[
      {label:"SEINFELD CATCHPHRASES",items:["NO SOUP FOR YOU","YADA YADA YADA","NOT THAT THERE'S ANYTHING WRONG","SERENITY NOW"]},
      {label:"HARRY POTTER SPELLS",items:["WINGARDIUM LEVIOSA","ACCIO","LUMOS","ALOHOMORA"]},
      {label:"GUITAR LEGENDS — FIRST NAME ONLY",items:["JIMI","ERIC","CARLOS","SLASH"]},
      {label:"THE OFFICE — MICHAEL'S CATCHPHRASES",items:["THAT'S WHAT SHE SAID","I AM THE BOSS","MICHAEL SCOTT","BOOM ROASTED"]},
    ]},
    {themeLabel:"FAMILY CHALLENGE",categories:[
      {label:"BACK TO THE FUTURE CHARACTERS",items:["MARTY MCFLY","DOC BROWN","BIFF TANNEN","LORRAINE BAINES"]},
      {label:"HOGWARTS HOUSES — FOUNDER'S NAMES",items:["GODRIC","SALAZAR","ROWENA","HELGA"]},
      {label:"SEINFELD — ELAINE'S JOBS",items:["J. PETERMAN","PENDANT PUBLISHING","MR. PITT","JACKIE CHILES ASSISTANT"]},
      {label:"FRIENDS — THINGS IN CENTRAL PERK",items:["ORANGE COUCH","GUNTHER","THE STAGE","RACHEL'S APRON"]},
    ]},
    {themeLabel:"POP CULTURE MASHUP",categories:[
      {label:"FAMOUS FICTIONAL GUITARS",items:["MARTY MCFLY'S GIBSON","DEWEY FINN'S SG","CROSSROADS GUITAR","ROBOT CHICKEN"]},
      {label:"HARRY POTTER — WEASLEY FAMILY",items:["FRED","GEORGE","GINNY","PERCY"]},
      {label:"SEINFELD — PLACES CHARACTERS EAT",items:["MONK'S CAFE","SOUP NAZI STAND","CHINESE RESTAURANT","PIZZA PLACE"]},
      {label:"THE OFFICE — SCHRUTE FARMS FACTS",items:["BEET FARM","BED AND BREAKFAST","PENNSYLVANIA","MOSE LIVES THERE"]},
    ]},
    {themeLabel:"KATH & KIM MEETS THE WORLD",categories:[
      {label:"KATH & KIM CHARACTERS",items:["KATH DAY","KIM CRAIG","SHARON STRZELECKI","BRETT CRAIG"]},
      {label:"SEINFELD — GEORGE'S REAL NAME",items:["GEORGE LOUIS COSTANZA","ART VANDELAY","H.E. PENNYPACKER","LLOYD BRAUN"]},
      {label:"FRIENDS APARTMENTS",items:["APARTMENT 20","APARTMENT 19","JOEY'S APARTMENT","UGLY NAKED GUY'S"]},
      {label:"HARRY POTTER — PLATFORM 9¾ FACTS",items:["KINGS CROSS","HOGWARTS EXPRESS","RED STEAM TRAIN","BARRIER WALK-THROUGH"]},
    ]},
  ],
  seinfeld:[
    {themeLabel:"A SHOW ABOUT NOTHING",categories:[
      {label:"GEORGE COSTANZA ALIASES",items:["ART VANDELAY","H.E. PENNYPACKER","LLOYD BRAUN","PETER VAN NOSTRAND"]},
      {label:"KRAMER'S BUSINESS IDEAS",items:["PETERMAN REALITY TOUR","MOVIEFONE","FUSILLI JERRY","THE BEACH"]},
      {label:"THINGS NEWMAN DOES",items:["HOARDS MAIL IN STORAGE","BOTTLE RETURN SCHEME","FLEA INFESTATION","READS ELAINE'S MAIL"]},
      {label:"GEORGE'S REAL JOBS IN THE SHOW",items:["REAL ESTATE BROKER","NEW YORK YANKEES","PLAY NOW SPORTING GOODS","KRUGER INDUSTRIAL SMOOTHING"]},
    ]},
    {themeLabel:"FESTIVUS FOR THE REST OF US",categories:[
      {label:"FESTIVUS TRADITIONS",items:["AIRING OF GRIEVANCES","FEATS OF STRENGTH","FESTIVUS POLE","NO TINSEL RULE"]},
      {label:"SOUP NAZI RULES",items:["NO SOUP FOR YOU","MOVE IT ALONG","NEXT","YOU ARE BANNED"]},
      {label:"JERRY'S GIRLFRIENDS AND THEIR QUIRKS",items:["MULVA","TWO-FACE","MAN HANDS","CLOSE TALKER"]},
      {label:"GEORGE'S PARENTS",items:["FRANK COSTANZA","ESTELLE COSTANZA","LOW TALKER","FESTIVUS INVENTOR"]},
    ]},
    {themeLabel:"YADA YADA YADA",categories:[
      {label:"SEINFELD INVENTED PHRASES",items:["YADA YADA YADA","DOUBLE DIP","CLOSE TALKER","THE SHRINKAGE"]},
      {label:"RECURRING SEINFELD CHARACTERS",items:["NEWMAN","UNCLE LEO","J. PETERMAN","PUDDY"]},
      {label:"THINGS ELAINE DOES AT WORK",items:["DANCE BADLY","DATE THE BOSS","GET FIRED","WRITE CATALOG COPY"]},
      {label:"KRAMER'S REAL FIRST NAME",items:["COSMO","KRAMER","K-MAN","THE KRAMER"]},
    ]},
    {themeLabel:"THE SOUP NAZI SPECIAL",categories:[
      {label:"J. PETERMAN CATALOG ITEMS",items:["URBAN SOMBRERO","EXECUTIVE RAIN STICK","HIMALAYAN WALKING STICK","SPANISH LEATHER SATCHEL"]},
      {label:"THINGS GEORGE LIES ABOUT",items:["BEING AN ARCHITECT","WORKING AT VANDELAY","BEING MARINE BIOLOGIST","KNOWING STEINBRENNER"]},
      {label:"SEINFELD EPISODE PLOT DEVICES",items:["THE MARBLE RYE","THE BABKA","THE JUNIOR MINT","THE MUTTON"]},
      {label:"KRAMER SCHEMES INVOLVING CELEBRITIES",items:["MERV GRIFFIN SET","MOVIEFONE VOICE","KENNY ROGERS CHICKEN","JACKIE CHILES"]},
    ]},
    {themeLabel:"SERENITY NOW",categories:[
      {label:"THINGS FRANK COSTANZA INVENTED",items:["FESTIVUS","THE BELTLESS TRENCHCOAT","STOPPING SHORT","HAND MODEL CAREER"]},
      {label:"ELAINE'S BOSSES IN ORDER",items:["MR. PITT","J. PETERMAN","PENDANT PUBLISHING","JACKIE CHILES"]},
      {label:"SEINFELD FINALE CALLBACKS",items:["MARBLE RYE","JUNIOR MINT","THE PUFFY SHIRT","MAN HANDS"]},
      {label:"GEORGE'S SEDUCTION MOVES",items:["ARCHITECT LIE","YANKEES CLAIM","CASHMERE SWEATER","VELVET LINE"]},
    ]},
  ],
};

// ══════════════════════════════════════
// PUZZLE ROTATION — shuffled "no repeat until bag is empty" queue,
// persisted to localStorage so it survives phone locks / tab reloads
// (the old version was a plain in-memory counter that reset to 0
// on every reload, causing heavy repetition of early puzzles)
// ══════════════════════════════════════
function shuffleArray(arr){
  const a = [...arr];
  for(let i = a.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getShuffleBag(player, bankLength){
  try{
    const raw = localStorage.getItem(`cc_bag_${player}`);
    if(raw){
      const bag = JSON.parse(raw);
      // bag becomes invalid if the bank size changed (new content added) — reshuffle fresh
      if(Array.isArray(bag) && bag.length > 0 && Math.max(...bag) < bankLength){
        return bag;
      }
    }
  }catch(e){}
  return shuffleArray([...Array(bankLength).keys()]);
}

function saveShuffleBag(player, bag){
  try{ localStorage.setItem(`cc_bag_${player}`, JSON.stringify(bag)); }
  catch(e){}
}

function getFallback(){
  const player = S.player in FALLBACK_BANKS ? S.player : 'mixed';
  const bank = FALLBACK_BANKS[player];
  let bag = getShuffleBag(player, bank.length);
  const idx = bag.pop();
  if(bag.length === 0){
    bag = shuffleArray([...Array(bank.length).keys()]);
  }
  saveShuffleBag(player, bag);
  return bank[idx];
}


function closeHintDrawer(){
  document.getElementById('hintDrawer').classList.remove('open');
  document.getElementById('hintOverlay').classList.remove('open');
}

// If a category defines a `pool` larger than 4 items, pick a random 4 of
// them each time the puzzle is launched — the shuffle-bag logic upstream
// still only ever sees one puzzle per themeLabel, so puzzle rotation and
// no-repeat behaviour is completely unaffected by this.
function resolvePuzzleCategories(puzzle){
  return {
    ...puzzle,
    categories: puzzle.categories.map(cat=>{
      if(Array.isArray(cat.pool) && cat.pool.length > 4){
        return { label: cat.label, items: shuffleArray(cat.pool).slice(0,4) };
      }
      return cat;
    })
  };
}

function launchGame(puzzle){
  puzzle = resolvePuzzleCategories(puzzle);
  S.lives=4;S.selected=[];S.tiles=[];S.solvedCats=[];
  S.gameActive=false;S._puzzle=puzzle;
  S.hintedCats=new Set();
  const cfg=DIFF[S.difficulty];
  S.timerMax = S.mode==='blitz' ? 45 : cfg.time;
  S.timerSecs = S.timerMax;

  const cols=[...CAT_COLORS].sort(()=>Math.random()-0.5);
  puzzle.categories.forEach((cat,ci)=>{
    const col=cols[ci%cols.length];
    cat.items.forEach(item=>{
      S.tiles.push({text:item,cat:cat.label,bg:col.bg,fg:col.text,solved:false});
    });
  });

  shuffle(S.tiles);

  // Show splash before starting timer
  const modeLabels={solo:'SOLO MODE',family:'FAMILY MODE',seinfeld:'SEINFELD MODE',blitz:'⚡ BLITZ MODE'};
  const diffLabels={easy:'EASY',medium:'MEDIUM',hard:'HARD'};
  const penLabels={easy:'-10 SECS PER MISS',medium:'-15 SECS PER MISS',hard:'-20 SECS PER MISS'};

  document.getElementById('splashModeBadge').textContent=`${modeLabels[S.mode]||'SOLO MODE'} · ${diffLabels[S.difficulty]}`;
  document.getElementById('splashTheme').textContent=puzzle.themeLabel?.toUpperCase()||'POP CULTURE MIX';
  document.getElementById('splashTimerLabel').textContent=`${S.timerMax} SECONDS`;
  document.getElementById('splashPenaltyLabel').textContent=penLabels[S.difficulty]||(S.mode==='blitz'?'-15 SECS PER MISS':'-10 SECS PER MISS');
  document.getElementById('splashDiffLabel').textContent=diffLabels[S.difficulty];

  showScreen('splashScreen');
}

function goFromSplash(){
  S.gameActive=true;
  document.getElementById('puzzleBadge').textContent=`PUZZLE #${S.puzzleNum}`;
  renderStars();
  renderStreak();
  document.getElementById('themePill').textContent=S._puzzle.themeLabel?.toUpperCase()||'POP CULTURE';
  document.getElementById('solvedArea').innerHTML='';
  document.getElementById('msgArea').textContent='';
  document.getElementById('progFill').style.width='0%';
  renderLives();renderGrid();updateCtrl();
  showScreen('gameScreen');
  startTimer();
}

// ══════════════════════════════════════
// TIMER
// ══════════════════════════════════════
function startTimer(){
  updateTimerUI();
  S.timerHandle=setInterval(()=>{
    S.timerSecs--;updateTimerUI();
    if(S.timerSecs<=0){clearInterval(S.timerHandle);timeUp();}
  },1000);
}

function updateTimerUI(){
  const m=Math.floor(S.timerSecs/60),s=S.timerSecs%60;
  const el=document.getElementById('timerNum');
  el.textContent=`${m}:${s.toString().padStart(2,'0')}`;
  const fill=document.getElementById('timerFill');
  fill.style.width=((S.timerSecs/S.timerMax)*100)+'%';
  el.className='g-timer-num';
  if(S.timerSecs<=15){el.classList.add('crit');fill.style.background='var(--red)';}
  else if(S.timerSecs<=30){el.classList.add('warn');fill.style.background='var(--orange)';}
  else{fill.style.background='var(--gold)';}
}

function timeUp(){
  S.gameActive=false;
  S.puzzleStreak=0; // streak broken by timeout
  document.querySelectorAll('.tile:not(.t-solved)').forEach(t=>t.classList.add('t-frozen'));
  showMsg("⏱ TIME'S UP!",'var(--red)');
  setTimeout(()=>showEndScreen(false,true),1100);
}

// ══════════════════════════════════════
// RENDER
// ══════════════════════════════════════
function renderLives(){
  const el=document.getElementById('livesRow');
  el.innerHTML='';
  for(let i=0;i<4;i++){
    const d=document.createElement('div');
    d.className='dot'+(i>=S.lives?' gone':'');
    el.appendChild(d);
  }
}

function renderGrid(){
  const grid=document.getElementById('tileGrid');
  grid.innerHTML='';
  S.tiles.forEach((tile,idx)=>{
    const el=document.createElement('div');
    const cls=['tile'];
    if(tile.solved)cls.push('t-solved');
    else{
      if(S.selected.includes(idx))cls.push('t-selected');
      if(!S.gameActive)cls.push('t-frozen');
    }
    el.className=cls.join(' ');
    el.textContent=tile.text;
    el.dataset.idx=idx;
    if(!tile.solved)el.addEventListener('click',()=>toggleTile(idx));
    grid.appendChild(el);
  });
}

function updateCtrl(){
  document.getElementById('submitBtn').disabled=S.selected.length!==4||!S.gameActive;
}

// ══════════════════════════════════════
// INTERACTION
// ══════════════════════════════════════
function toggleTile(idx){
  if(!S.gameActive||S.tiles[idx].solved)return;
  const pos=S.selected.indexOf(idx);
  if(pos>-1){S.selected.splice(pos,1);}
  else{
    if(S.selected.length>=4)return;
    S.selected.push(idx);
    const el=document.querySelector(`.tile[data-idx="${idx}"]`);
    if(el){el.classList.remove('t-pop');void el.offsetWidth;el.classList.add('t-pop');}
  }
  renderGrid();updateCtrl();
}

function shuffle(arr){
  for(let i=arr.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]]=[arr[j],arr[i]];
  }
}

function doShuffle(){
  if(!S.gameActive)return;
  const unsolved=S.tiles.filter(t=>!t.solved);
  shuffle(unsolved);let ui=0;
  S.tiles=S.tiles.map(t=>t.solved?t:unsolved[ui++]);
  S.selected=[];renderGrid();updateCtrl();
}

function doClear(){S.selected=[];renderGrid();updateCtrl();}

function confirmQuit(){
  if(confirm('Quit and go home?')){
    clearInterval(S.timerHandle);S.gameActive=false;showScreen('homeScreen');
  }
}

function showMsg(text,color,dur=2500){
  const el=document.getElementById('msgArea');
  el.textContent=text;el.style.color=color||'var(--gold)';
  clearTimeout(S.msgTimeout);
  S.msgTimeout=setTimeout(()=>{el.textContent='';},dur);
}

// ══════════════════════════════════════
// STAR ECONOMY
// ══════════════════════════════════════
function renderStars(){
  const el=document.getElementById('starDisplay');
  if(!el)return;
  el.textContent=`⭐ ${S.stars}`;
}

function renderStreak(){
  const pips=document.getElementById('streakPips');
  const count=document.getElementById('streakCount');
  if(!pips||!count)return;
  pips.innerHTML='';
  for(let i=0;i<10;i++){
    const p=document.createElement('div');
    p.className='streak-pip'+(i<(S.puzzleStreak%10)?' lit':'');
    pips.appendChild(p);
  }
  count.textContent=`${S.puzzleStreak%10} / 10`;
}

function awardStar(catName){
  // No star if hint was used for this group
  if(S.hintedCats.has(catName)){
    showMsg('⭐ No star — hint was used','var(--muted)',2000);
    return;
  }
  S.stars++;
  S.sessionStars++;
  renderStars();
  // Float a star from the grid area
  const el=document.createElement('div');
  el.className='star-pop';
  el.textContent='⭐';
  el.style.left=`${40+Math.random()*20}vw`;
  el.style.top=`50vh`;
  document.body.appendChild(el);
  setTimeout(()=>el.remove(),1100);
}

function showGruberToast(msg, dur = 2600){
  document.querySelector('.gruber-toast')?.remove();
  const t=document.createElement('div');
  t.className='gruber-toast';
  t.textContent=msg;
  document.body.appendChild(t);
  setTimeout(()=>t.remove(),dur);
}

// ── TILE HINT ──
// Player must have 3 tiles selected. Costs 1 star.
// Reveals the correct 4th tile for the majority category.
// No star awarded when this group is solved.
function doTileHint(){
  if(!S.gameActive)return;

  if(S.selected.length!==3){
    showGruberToast('Select exactly 3 tiles first — then ask for a hint.');
    return;
  }

  if(S.stars<1){
    showGruberToast('No stars. But I\'ll have one brought out to you.');
    return;
  }

  // Work out which category the 3 selected tiles belong to
  const picked=S.selected.map(i=>S.tiles[i]);
  const counts={};
  picked.forEach(t=>{counts[t.cat]=(counts[t.cat]||0)+1;});
  const topCat=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];

  if(topCat[1]<2){
    showGruberToast('Your 3 tiles don\'t agree enough. Reconsider your selection.');
    return;
  }

  const targetCat=topCat[0];

  // Find an unselected, unsolved tile from that category
  const candidate=S.tiles.findIndex((t,i)=>
    !t.solved && t.cat===targetCat && !S.selected.includes(i)
  );

  if(candidate===-1){
    showGruberToast('Hmm — check your selected tiles, something\'s off.');
    return;
  }

  // Deduct star
  S.stars=Math.max(0,S.stars-1);
  renderStars();

  // Mark category as hinted — no star on solve
  S.hintedCats.add(targetCat);

  // Select the 4th tile
  S.selected.push(candidate);
  renderGrid();updateCtrl();
  showMsg('💡 4th tile revealed — 1 ⭐ spent · No star for this group','var(--orange)',3000);
}

// ══════════════════════════════════════
// SUBMIT
// ══════════════════════════════════════
function doSubmit(){
  if(S.selected.length!==4||!S.gameActive)return;
  const picked=S.selected.map(i=>S.tiles[i]);
  const counts={};
  picked.forEach(t=>{counts[t.cat]=(counts[t.cat]||0)+1;});
  const hit=Object.entries(counts).find(([,v])=>v===4);

  if(hit){
    const catName=hit[0];
    const catData=S._puzzle.categories.find(c=>c.label===catName);
    const col=picked[0];
    S.solvedCats.push(catName);
    S.tiles.forEach(t=>{if(t.cat===catName)t.solved=true;});

    // Award star (checks hintedCats internally)
    awardStar(catName);

    const area=document.getElementById('solvedArea');
    const row=document.createElement('div');
    row.className='solved-row';
    row.style.background=col.bg;row.style.color=col.fg;
    row.innerHTML=`<div class="solved-label">${catName}</div><div class="solved-items">${catData.items.join(' · ')}</div>`;
    area.appendChild(row);

    document.getElementById('progFill').style.width=((S.solvedCats.length/4)*100)+'%';
    S.selected=[];

    // Auto-select last four
    if(S.solvedCats.length===3){
      const remaining=S.tiles.map((t,i)=>({t,i})).filter(({t})=>!t.solved);
      if(remaining.length===4){
        showMsg('⚡ ONE GROUP LEFT — AUTO-SELECTING!','var(--gold)',1500);
        S.selected=remaining.map(({i})=>i);
        renderGrid();updateCtrl();
        setTimeout(()=>doSubmit(),1000);
        return;
      }
    }

    renderGrid();updateCtrl();

    if(S.solvedCats.length===4){
      clearInterval(S.timerHandle);
      // Puzzle complete — increment streak
      S.puzzleStreak++;
      // Bonus star every 10 puzzles
      if(S.puzzleStreak%10===0){
        S.stars++;S.sessionStars++;
        renderStars();
        showStreakBanner(`🔥 ${S.puzzleStreak} PUZZLE STREAK — BONUS ⭐!`);
      }
      setTimeout(()=>showEndScreen(true),500);
    } else {
      const hinted=S.hintedCats.has(catName);
      showMsg(hinted?'✓ Group solved — no ⭐ (hint used)':'✓ ⭐ Earned!', hinted?'var(--muted)':col.bg);
    }
  } else {
    const maxSame=Math.max(...Object.values(counts));
    S.lives--;
    renderLives();

    const pen=S.mode==='blitz'?15:DIFF[S.difficulty].penalty;
    S.timerSecs=Math.max(0,S.timerSecs-pen);
    updateTimerUI();

    S.selected.forEach(idx=>{
      const el=document.querySelector(`.tile[data-idx="${idx}"]`);
      if(el){el.classList.remove('t-shake');void el.offsetWidth;el.classList.add('t-shake');}
    });

    if(S.lives<=0){
      clearInterval(S.timerHandle);
      S.puzzleStreak=0; // streak broken
      showMsg('GAME OVER.','var(--red)');
      setTimeout(()=>showEndScreen(false),900);
    } else {
      const m=maxSame===3
        ?[`ONE AWAY! -${pen} SECS`,`SO CLOSE! -${pen} SECS`]
        :[`WRONG. -${pen} SECS. ${S.lives} LEFT.`,`NOPE. -${pen} SECS.`];
      showMsg(m[Math.floor(Math.random()*m.length)],maxSame===3?'var(--orange)':'var(--red)');
      S.selected=[];renderGrid();updateCtrl();
    }
  }
}

// ══════════════════════════════════════
// STREAK BANNER
// ══════════════════════════════════════
function showStreakBanner(msg){
  document.querySelector('.streak-banner')?.remove();
  const b=document.createElement('div');
  b.className='streak-banner';
  b.textContent=msg||'⭐ STREAK!';
  document.body.appendChild(b);
  setTimeout(()=>b.remove(),2800);
}

// ══════════════════════════════════════
// END SCREEN
// ══════════════════════════════════════
function showEndScreen(win,timedOut){
  S.gameActive=false;
  const unsolved=S._puzzle.categories.filter(c=>!S.solvedCats.includes(c.label));
  const cols=[...CAT_COLORS].sort(()=>Math.random()-0.5);

  const hl=document.getElementById('endHeadline');
  hl.className='end-headline '+(win?'win':'lose');

  // Puzzle stars = cats solved without hints
  const puzzleStars=S.solvedCats.filter(c=>!S.hintedCats.has(c)).length;
  const isPerfect=win && puzzleStars===4;

  hl.textContent=isPerfect?'PERFECT! ⭐⭐⭐⭐':win?'NAILED IT':timedOut?"TIME'S UP":'GAME OVER';

  // Star display — show stars earned this puzzle
  const starStr='⭐'.repeat(puzzleStars)+'☆'.repeat(4-puzzleStars);
  document.getElementById('statStars').textContent=starStr;
  document.getElementById('statSolved').textContent=`${S.solvedCats.length}/4`;
  document.getElementById('statMistakes').textContent=4-S.lives;

  // Session summary
  document.getElementById('sessionTag').textContent=`PUZZLE ${S.puzzleNum} · PUZZLE STREAK: ${S.puzzleStreak}`;
  const sRow=document.getElementById('starsSessionRow');
  sRow.textContent=`SESSION STARS: ⭐ ${S.sessionStars} · WALLET: ⭐ ${S.stars}`;

  const uSec=document.getElementById('unsolvedSection');
  uSec.innerHTML='';
  if(unsolved.length>0){
    const t=document.createElement('div');
    t.className='unsolved-title';t.textContent='YOU MISSED:';
    uSec.appendChild(t);
    unsolved.forEach((c,i)=>{
      const col=cols[i%cols.length];
      const d=document.createElement('div');
      d.className='unsolved-cat';
      d.style.background=col.bg;d.style.color=col.text;
      d.innerHTML=`<strong>${c.label}</strong><br>${c.items.join(' · ')}`;
      uSec.appendChild(d);
    });
  }
  showScreen('endScreen');
}

function nextPuzzle(){
  S.puzzleNum++;
  if(S.player==='grudge'){
    S._grudgeToggle=!S._grudgeToggle;
    S.player=S._grudgeToggle?'scott':'kids';
  }
  fetchAndLaunch();
}

// ── INIT ──
renderAccessStatus();