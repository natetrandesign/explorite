/* ============================================================
   EXPLORITE — app.js
   Hash router + screens + booking + chat + PWA glue.
   ============================================================ */
"use strict";

/* ---------------- Data ---------------- */
const U = (id, w) => `https://images.unsplash.com/${id}?w=${w || 900}&q=80&auto=format&fit=crop`;

const IMG = {
  concert: "photo-1465847899084-d164df4dedc6",
  dining: "photo-1414235077428-338989a2e8c0",
  trattoria: "photo-1514933651103-005eec06c04b",
  wine: "photo-1510812431401-41d2bd2722f3",
  museum: "photo-1554907984-15263bfd63bd",
  street: "photo-1467269204594-9661b134dd2b",
  rooftopDusk: "photo-1519677100203-a0e668c92439",
  spa: "photo-1544161515-4ab6ce6db874",
  venice: "photo-1523906834658-6e24ef2386f9",
  positano: "photo-1516483638261-f4dbaf036963",
  lake: "photo-1476514525535-07fb3b4ae5f1",
  alps: "photo-1506905925346-21bda4d32df4",
  welcome: "photo-1502602898657-3e91760cbb34",
  aMindy: "photo-1494790108377-be9c29b29330",
  aTroy: "photo-1507003211169-0a1dd7228f2d",
  aMatteo: "photo-1500648767791-00dcc994a43e",
  aChiara: "photo-1438761681033-6461ffad8d80",
};

const XP = [
  {
    id: "nocturne", cat: "art", tonight: true, featured: true,
    title: "Candlelight Nocturne in a Renaissance Chapel",
    img: IMG.concert, price: 68, unit: "per seat", rating: 4.97, reviews: 214,
    time: "Tonight · 9:00 PM", dur: "1.5 hrs", size: "40 seats", area: "San Niccolò",
    host: { name: "Chiara B.", img: IMG.aChiara, role: "Concert curator · 6 yrs" },
    blurb: "A string quartet, four hundred candles, and a deconsecrated chapel the tour buses never find. Vivaldi and Caccini played the way they were written to be heard, in stone rooms that hold the sound like a cupped hand.",
    hls: [["🕯️", "400 candles, no stage lights"], ["🎻", "Live string quartet"], ["🍷", "Tuscan red at intermission"], ["⛪", "16th-century chapel"]],
  },
  {
    id: "chefs-table", cat: "food", tonight: true, featured: true,
    title: "Chef's Table in the Oltrarno",
    img: IMG.dining, price: 145, unit: "per guest", rating: 4.94, reviews: 167,
    time: "Tonight · 7:30 PM", dur: "3 hrs", size: "8 guests", area: "Oltrarno",
    host: { name: "Matteo R.", img: IMG.aMatteo, role: "Chef & host · 9 yrs" },
    blurb: "Eight seats around Matteo's marble counter. Six courses decided at the San Lorenzo market that same morning. You watch every plate happen, and you will argue about the ribollita for years.",
    hls: [["🍝", "6 courses, market-led"], ["🥂", "Wine pairing included"], ["👩‍🍳", "Counter seating only"], ["🌿", "Vegetarian on request"]],
  },
  {
    id: "arno-sunrise", cat: "outdoors", featured: true,
    title: "Sunrise on the Arno, Private Rowing",
    img: IMG.lake, price: 52, unit: "per person", rating: 4.9, reviews: 98,
    time: "Tomorrow · 5:45 AM", dur: "2 hrs", size: "6 guests", area: "Lungarno",
    host: { name: "Chiara B.", img: IMG.aChiara, role: "River society member" },
    blurb: "The city before it wakes, from the waterline. Traditional barchetti, a thermos of espresso, and the Ponte Vecchio turning gold above your head while the rowing club's oldest member tells you what the floods took and gave back.",
    hls: [["🚣", "Historic rowing club"], ["☕", "Espresso on board"], ["📷", "Golden-hour light"], ["🌅", "Small group"]],
  },
  {
    id: "chianti", cat: "food", tonight: true,
    title: "Cellar Secrets: Chianti After Dark",
    img: IMG.wine, price: 89, unit: "per guest", rating: 4.92, reviews: 143,
    time: "Tonight · 8:15 PM", dur: "2.5 hrs", size: "10 guests", area: "Chianti hills",
    host: { name: "Matteo R.", img: IMG.aMatteo, role: "Sommelier friend of the house" },
    blurb: "A family estate opens its 1400s cellar after closing. Five vintages by lantern light, bread and oil from the same hill, and the kind of stories a tasting room never tells.",
    hls: [["🍇", "Family estate, 14th c."], ["🏮", "Lantern-lit tasting"], ["🚐", "Transport included"], ["🧀", "Farm supper board"]],
  },
  {
    id: "uffizi-after", cat: "art",
    title: "The Uffizi, After Hours",
    img: IMG.museum, price: 120, unit: "per person", rating: 4.98, reviews: 311,
    time: "Thu · 7:00 PM", dur: "2 hrs", size: "12 guests", area: "Piazzale degli Uffizi",
    host: { name: "Chiara B.", img: IMG.aChiara, role: "Licensed art historian" },
    blurb: "Botticelli with nobody's phone in front of it. A licensed historian walks twelve of you through the closed museum, gallery by gallery, at talking pace instead of crowd pace.",
    hls: [["🖼️", "Closed-door access"], ["🎓", "Art historian led"], ["👥", "Max 12 guests"], ["🌙", "Evening slot"]],
  },
  {
    id: "artisan-gold", cat: "hidden",
    title: "Artisan Gold: A Ponte Vecchio Workshop",
    img: IMG.street, price: 75, unit: "per person", rating: 4.88, reviews: 76,
    time: "Daily · 10:00 AM", dur: "2 hrs", size: "6 guests", area: "Ponte Vecchio",
    host: { name: "Matteo R.", img: IMG.aMatteo, role: "Third-generation goldsmith" },
    blurb: "Behind one unmarked door on the bridge, a third-generation goldsmith still works the old way. Watch a ring take shape, then hammer your own small keepsake in brass.",
    hls: [["💍", "Working goldsmith studio"], ["🔨", "Make a keepsake"], ["🗝️", "Unmarked-door access"], ["👨‍👩‍👧", "Family-run since 1948"]],
  },
  {
    id: "rooftop-aperitivo", cat: "hidden", tonight: true,
    title: "Rooftop Aperitivo at Dusk",
    img: IMG.rooftopDusk, price: 38, unit: "per person", rating: 4.85, reviews: 189,
    time: "Tonight · 6:45 PM", dur: "1.5 hrs", size: "14 guests", area: "Duomo district",
    host: { name: "Chiara B.", img: IMG.aChiara, role: "Local host" },
    blurb: "A private terrace two streets from the Duomo that no listicle has found yet. Negronis made properly, crostini that keep coming, and the bells at seven doing the rest.",
    hls: [["🍹", "Negroni masterclass"], ["🌇", "Duomo-level views"], ["🥖", "Endless crostini"], ["🔔", "Timed to the bells"]],
  },
  {
    id: "thermal", cat: "outdoors",
    title: "Thermal Waters of Tuscany",
    img: IMG.spa, price: 110, unit: "per person", rating: 4.91, reviews: 122,
    time: "Sat · 9:30 AM", dur: "Half day", size: "8 guests", area: "Val d'Orcia",
    host: { name: "Matteo R.", img: IMG.aMatteo, role: "Val d'Orcia native" },
    blurb: "Hot springs the Romans built walls around and the crowds forgot. A slow morning of mineral pools, cypress hills, and a farmhouse lunch that refuses to be rushed.",
    hls: [["♨️", "Natural hot springs"], ["🌾", "Val d'Orcia views"], ["🍋", "Farmhouse lunch"], ["🚐", "Door-to-door transport"]],
  },
  {
    id: "venice-first-light", cat: "outdoors",
    title: "Venice by First Light, Day Trip",
    img: IMG.venice, price: 210, unit: "per person", rating: 4.89, reviews: 87,
    time: "Sun · 6:10 AM", dur: "Full day", size: "10 guests", area: "From Florence SMN",
    host: { name: "Chiara B.", img: IMG.aChiara, role: "Veneto-born guide" },
    blurb: "First train out, gondola yard before the queues exist, lunch in a bacaro where the menu is spoken, back in Florence by dark. Venice the way it looks when it belongs to itself.",
    hls: [["🚄", "First train out"], ["🛶", "Gondola-yard visit"], ["🐟", "Spoken-menu bacaro"], ["🎭", "Backstreet Dorsoduro"]],
  },
];

const COLLECTION = {
  title: "The Amalfi Escape",
  sub: "A 3-day coastal edit, curated by locals",
  img: IMG.positano,
};

const THREADS = [
  {
    id: "matteo", name: "Matteo R.", img: IMG.aMatteo, online: true,
    last: "Perfetto. I will keep two counter seats for you.", time: "9:41 PM", unread: 2,
  },
  {
    id: "crew", name: "Firenze Crew ✦", img: IMG.aMindy, online: false,
    last: "Troy: ok so candlelight concert then late aperitivo?", time: "8:17 PM", unread: 1,
  },
  {
    id: "concierge", name: "Explorite Concierge", img: null, online: true,
    last: "Your Uffizi after-hours pass is confirmed for Thursday.", time: "Mon", unread: 0,
  },
];

const CHATS = {
  matteo: [
    { day: "Today" },
    { who: "them", text: "Ciao! I saw your reservation request for tonight. Any allergies at the table?", t: "9:12 PM" },
    { who: "me", text: "None! We're two. My friend is vegetarian though, is that ok?", t: "9:15 PM" },
    { who: "them", text: "Of course. The market had beautiful porcini this morning, she will eat better than you.", t: "9:20 PM" },
    { who: "me", text: "Ha! Deal. What time should we arrive?", t: "9:33 PM" },
    { who: "them", text: "7:15, so you see the first course begin. Bring an appetite, not a schedule.", t: "9:38 PM" },
    { who: "them", text: "Perfetto. I will keep two counter seats for you.", t: "9:41 PM" },
    { card: "chefs-table" },
  ],
  crew: [
    { day: "Today" },
    { who: "them", name: "Mindy", text: "Landed!! Ok we have exactly two nights, do NOT waste them on trattoria roulette", t: "7:44 PM" },
    { who: "me", text: "Already on it. Sending options from Explorite, everything's local-verified", t: "7:52 PM" },
    { card: "nocturne" },
    { who: "them", name: "Troy", text: "ok so candlelight concert then late aperitivo?", t: "8:17 PM" },
  ],
  concierge: [
    { day: "Monday" },
    { who: "them", text: "Benvenuto a Firenze, Nate. Your city guide is live. Two experiences match your taste profile tonight.", t: "10:02 AM" },
    { who: "them", text: "Your Uffizi after-hours pass is confirmed for Thursday.", t: "4:48 PM" },
    { card: "uffizi-after" },
  ],
};

const CATS = [
  ["all", "✦", "All"],
  ["tonight", "🌙", "Tonight"],
  ["food", "🍷", "Food & Wine"],
  ["art", "🎻", "Art & Music"],
  ["outdoors", "🌿", "Outdoors"],
  ["hidden", "🗝️", "Hidden"],
];

/* ---------------- State ---------------- */
const state = {
  authed: sessionStorage.getItem("xp-authed") === "1",
  cat: "all",
  saved: new Set(JSON.parse(localStorage.getItem("xp-saved") || "[]")),
  trips: JSON.parse(localStorage.getItem("xp-trips") || "null") || [
    { id: "uffizi-after", when: "Thu · 7:00 PM", guests: 2 },
  ],
};
const persist = () => {
  localStorage.setItem("xp-saved", JSON.stringify([...state.saved]));
  localStorage.setItem("xp-trips", JSON.stringify(state.trips));
};

/* ---------------- Utils ---------------- */
const view = document.getElementById("view");
const tabbar = document.getElementById("tabbar");
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const star = '<svg viewBox="0 0 24 24"><path d="M12 2l2.9 6.6 7.1.7-5.4 4.8 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.3l7.1-.7z"/></svg>';

function toast(msg) {
  const root = document.getElementById("toast-root");
  root.innerHTML = `<div class="toast">${msg}</div>`;
  setTimeout(() => (root.innerHTML = ""), 3200);
}

function observe(root) {
  const io = new IntersectionObserver((es) => {
    es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { root: view, threshold: 0.12 });
  $$(".obs", root).forEach((el) => io.observe(el));
}

function lines(text, base) {
  return text.split("|").map((l, i) =>
    `<span class="reveal-line"><span style="--d:${(base || 0) + i * 0.09}s">${l}</span></span>`).join("");
}

/* ---------------- Router ---------------- */
const routes = {
  splash: renderSplash, login: renderLogin, discover: renderDiscover,
  x: renderDetail, messages: renderMessages, chat: renderChat,
  trips: renderTrips, profile: renderProfile,
};

function go(hash) { location.hash = "#/" + hash; }

function route() {
  const parts = (location.hash.replace(/^#\//, "") || "").split("/");
  let name = parts[0] || (state.authed ? "discover" : "splash");
  if (!state.authed && !["splash", "login"].includes(name)) name = "splash";
  if (!routes[name]) name = state.authed ? "discover" : "splash";
  const withTabs = ["discover", "trips", "messages", "profile"].includes(name);
  tabbar.hidden = !withTabs;
  $$(".tab", tabbar).forEach((t) => t.classList.toggle("active", t.dataset.tab === name));
  view.scrollTop = 0;
  routes[name](parts[1]);
  observe(view);
}
window.addEventListener("hashchange", route);
$$(".tab", tabbar).forEach((t) => t.addEventListener("click", () => go(t.dataset.tab)));

/* ---------------- Screens ---------------- */
function renderSplash() {
  view.innerHTML = `
  <section class="screen splash">
    <div class="splash-frame"></div>
    <div>
      <div class="monogram">
        <svg viewBox="0 0 118 118">
          <circle class="ring" cx="59" cy="59" r="56"/>
          <circle class="ring ring--inner" cx="59" cy="59" r="49"/>
          <text class="mono-e" x="59" y="80" text-anchor="middle">E</text>
          <path class="star" d="M59 2l1.8 4.4L65 8l-4.2 1.6L59 14l-1.8-4.4L53 8l4.2-1.6z"/>
        </svg>
      </div>
      <h1 class="splash-word">Explorite</h1>
      <p class="splash-tag">Told like a secret</p>
    </div>
    <div class="splash-loader"><i></i></div>
  </section>`;
  clearTimeout(renderSplash._t);
  renderSplash._t = setTimeout(() => { if (!state.authed) go("login"); }, 2700);
}

function renderLogin() {
  view.innerHTML = `
  <section class="screen login">
    <div class="login-hero">
      <span class="kicker">Explorite</span>
      <img src="${U(IMG.welcome, 900)}" alt="Paris at dusk" />
    </div>
    <div class="login-body">
      <h1 class="h-serif login-title">${lines("Arrive a stranger.|Leave a <em>regular</em>.", 0.15)}</h1>
      <p class="login-sub">Local-verified experiences in the city you just landed in. No tourist traps, no listicles written for someone else.</p>
      <div class="field">
        <svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>
        <input type="email" placeholder="Email address" autocomplete="email" />
      </div>
      <button class="btn-gold" id="login-btn">Begin exploring</button>
      <div class="login-alt">
        <button class="btn-ghost btn-social"> Apple</button>
        <button class="btn-ghost btn-social">G · Google</button>
      </div>
      <p class="login-guest">First time here? <b id="guest-btn">Wander in as a guest</b></p>
    </div>
  </section>`;
  const enter = () => {
    state.authed = true;
    sessionStorage.setItem("xp-authed", "1");
    go("discover");
    setTimeout(() => toast("Benvenuto a Firenze ✦"), 700);
  };
  $("#login-btn").addEventListener("click", enter);
  $("#guest-btn").addEventListener("click", enter);
  $$(".btn-social").forEach((b) => b.addEventListener("click", enter));
}

function xpCardFeatured(x, i) {
  return `
  <article class="f-card obs" style="--d:${i * 0.08}s" data-x="${x.id}">
    <img src="${U(x.img, 900)}" alt="${esc(x.title)}" loading="lazy" />
    <span class="badge"><svg viewBox="0 0 24 24"><path d="M12 2l2.9 6.6 7.1.7-5.4 4.8 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.3l7.1-.7z"/></svg> Local verified</span>
    <div class="f-card-body">
      <div class="f-card-meta"><span class="rating">${star}${x.rating}</span><span>·</span><span>${x.time}</span></div>
      <h3 class="f-card-title">${esc(x.title)}</h3>
      <div class="f-card-meta"><b>€${x.price}</b><span>${x.unit}</span></div>
    </div>
  </article>`;
}

function xpRow(x, i) {
  return `
  <article class="row-card obs" style="--d:${Math.min(i * 0.06, 0.3)}s" data-x="${x.id}">
    <img src="${U(x.img, 300)}" alt="" loading="lazy" />
    <div>
      <h4 class="row-title">${esc(x.title)}</h4>
      <div class="row-meta"><span class="rating">${star}${x.rating}</span><span class="dot-sep"></span><span>${x.area}</span></div>
      <div class="row-price"><b>€${x.price}</b> ${x.unit}</div>
    </div>
  </article>`;
}

function renderDiscover() {
  const filtered = XP.filter((x) => state.cat === "all" || x.cat === state.cat || (state.cat === "tonight" && x.tonight));
  const feats = filtered.filter((x) => x.featured);
  const rest = filtered.filter((x) => !x.featured);
  view.innerHTML = `
  <section class="screen discover">
    <header class="disc-head">
      <div>
        <p class="disc-date">Tue · 22 July · 9:41 PM</p>
        <h1 class="disc-city">Good evening,<br/>you're in <em>Florence</em></h1>
      </div>
      <button class="avatar-btn" data-go="profile"><img src="${U(IMG.aTroy, 100)}" alt="Profile" /></button>
    </header>
    <div class="searchbar" role="search">
      <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.8-3.8"/></svg>
      <span>Try &ldquo;candlelight&rdquo; or &ldquo;hidden trattoria&rdquo;&hellip;</span>
    </div>
    <div class="chips">
      ${CATS.map(([id, ico, label]) => `<button class="chip ${state.cat === id ? "active" : ""}" data-cat="${id}"><span class="ico">${ico}</span>${label}</button>`).join("")}
    </div>
    ${feats.length ? `
    <div class="section-head obs"><h2 class="section-title">Curated for tonight</h2><button class="section-link">See all</button></div>
    <div class="carousel">${feats.map(xpCardFeatured).join("")}</div>` : ""}
    ${rest.length ? `
    <div class="section-head obs"><h2 class="section-title">Trusted by locals</h2><button class="section-link">Map</button></div>
    <div class="rows">${rest.map(xpRow).join("")}</div>` : ""}
    <div class="section-head obs"><h2 class="section-title">Collections</h2></div>
    <div class="collection obs" id="collection-card">
      <img src="${U(COLLECTION.img, 900)}" alt="" loading="lazy" />
      <div class="collection-body">
        <span class="kicker">Editors&rsquo; journey</span>
        <h3 class="collection-title">${COLLECTION.title}</h3>
        <div class="f-card-meta"><span>${COLLECTION.sub}</span></div>
      </div>
    </div>
    <div class="install-hint obs" id="install-hint" hidden>
      <span>✦</span><span><b>Add Explorite to your Home Screen</b> — it works offline, like any app.</span>
    </div>
  </section>`;
  $$("[data-cat]").forEach((c) => c.addEventListener("click", () => {
    state.cat = c.dataset.cat;
    renderDiscover(); observe(view);
  }));
  $$("[data-x]").forEach((c) => c.addEventListener("click", () => go("x/" + c.dataset.x)));
  $("[data-go=profile]").addEventListener("click", () => go("profile"));
  $("#collection-card").addEventListener("click", () => toast("The Amalfi Escape — coming to your city soon"));
  if (installPrompt) $("#install-hint").hidden = false;
}

function renderDetail(id) {
  const x = XP.find((e) => e.id === id) || XP[0];
  const saved = state.saved.has(x.id);
  view.innerHTML = `
  <section class="screen detail">
    <div class="detail-hero"><img id="hero-img" src="${U(x.img, 1100)}" alt="${esc(x.title)}" /></div>
    <div class="detail-top">
      <button class="circle-btn" id="back-btn" aria-label="Back"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button>
      <button class="circle-btn ${saved ? "saved" : ""}" id="save-btn" aria-label="Save">
        <svg viewBox="0 0 24 24"><path d="M12 20.5C7 16.5 3.5 13.2 3.5 9.4 3.5 6.4 5.9 4 8.9 4c1.7 0 3.1 1 3.1 1s1.4-1 3.1-1c3 0 5.4 2.4 5.4 5.4 0 3.8-3.5 7.1-8.5 11.1Z"/></svg>
      </button>
    </div>
    <div class="detail-body">
      <span class="badge"><svg viewBox="0 0 24 24"><path d="M12 2l2.9 6.6 7.1.7-5.4 4.8 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.3l7.1-.7z"/></svg> Local verified</span>
      <h1 class="h-serif detail-title">${esc(x.title)}</h1>
      <div class="detail-strip">
        <span class="rating">${star}${x.rating} (${x.reviews})</span><span class="dot-sep"></span>
        <span>${x.dur}</span><span class="dot-sep"></span><span>${x.size}</span><span class="dot-sep"></span><span>${x.area}</span>
      </div>
      <div class="trust obs">
        <div class="trust-seal"><svg viewBox="0 0 24 24"><path d="M12 2 4 5.5v5.2c0 5 3.4 9.6 8 10.8 4.6-1.2 8-5.8 8-10.8V5.5Zm-1.2 13.6-3.4-3.4 1.6-1.6 1.8 1.8 4.2-4.2 1.6 1.6Z"/></svg></div>
        <div><b>Vetted in person by Florentines</b><span>Every Explorite experience is visited, verified, and re-checked by residents. No pay-to-rank. Ever.</span></div>
      </div>
      <p class="detail-p obs"><span class="drop">${esc(x.blurb[0])}</span>${esc(x.blurb.slice(1))}</p>
      <div class="hl-grid">
        ${x.hls.map(([i, t], k) => `<div class="hl obs" style="--d:${k * 0.06}s"><span class="ico">${i}</span>${t}</div>`).join("")}
      </div>
      <div class="ornament obs"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z"/></svg></div>
      <div class="host obs">
        <img src="${U(x.host.img, 140)}" alt="${esc(x.host.name)}" />
        <div><b>Hosted by ${esc(x.host.name)}</b><span>${esc(x.host.role)}</span></div>
        <button class="btn-ghost msg-host" id="msg-host">Message</button>
      </div>
      <div class="section-head obs" style="padding:8px 0 12px"><h2 class="section-title">What travelers whisper</h2></div>
      <div class="review obs">
        <div class="review-head"><img src="${U(IMG.aMindy, 100)}" alt="" /><div><b>Mindy C.</b><span>Seoul → Florence · July</span></div></div>
        <p class="review-quote">&ldquo;I planned two days around apps I didn't trust. This was the first thing that felt like a friend's advice instead of an ad.&rdquo;</p>
      </div>
      <div class="review obs">
        <div class="review-head"><img src="${U(IMG.aTroy, 100)}" alt="" /><div><b>Troy H.</b><span>Austin → Florence · June</span></div></div>
        <p class="review-quote">&ldquo;Short trip, zero margin for a bad pick. Booked in ninety seconds and it was the best night of the trip.&rdquo;</p>
      </div>
      <div style="height:12px"></div>
    </div>
    <div class="reserve-bar">
      <div class="reserve-price"><b>€${x.price}</b><span>${x.unit}</span></div>
      <button class="btn-gold" id="reserve-btn">Reserve</button>
    </div>
  </section>`;
  $("#back-btn").addEventListener("click", () => history.length > 1 ? history.back() : go("discover"));
  $("#save-btn").addEventListener("click", (e) => {
    const b = e.currentTarget;
    b.classList.toggle("saved");
    b.classList.contains("saved") ? state.saved.add(x.id) : state.saved.delete(x.id);
    persist();
    toast(b.classList.contains("saved") ? "Saved to your wishlist ✦" : "Removed from wishlist");
  });
  $("#msg-host").addEventListener("click", () => go("chat/matteo"));
  $("#reserve-btn").addEventListener("click", () => openBooking(x));
  // parallax hero
  const hero = $("#hero-img");
  const onScroll = () => {
    const y = Math.min(view.scrollTop, 500);
    hero.style.transform = `translateY(${y * 0.35}px) scale(${1 + y * 0.0003})`;
  };
  view.addEventListener("scroll", onScroll, { passive: true });
}

/* ---------------- Booking sheet ---------------- */
let installPrompt = null;

function openBooking(x) {
  const root = document.getElementById("sheet-root");
  const days = [["Tue", 22], ["Wed", 23], ["Thu", 24], ["Fri", 25], ["Sat", 26], ["Sun", 27], ["Mon", 28]];
  let sel = 0, guests = 2, step = 1;
  root.innerHTML = `
    <div class="sheet-veil" id="veil"></div>
    <div class="sheet" role="dialog" aria-modal="true">
      <div class="sheet-handle"></div>
      <div id="sheet-body"></div>
    </div>`;
  const body = $("#sheet-body");

  const close = () => {
    $(".sheet", root).classList.add("closing");
    $("#veil").style.opacity = 0;
    setTimeout(() => (root.innerHTML = ""), 320);
  };
  $("#veil").addEventListener("click", close);

  const renderStep1 = () => {
    body.innerHTML = `
      <h3>Reserve your evening</h3>
      <p class="sheet-sub">${esc(x.title)}</p>
      <div class="b-progress">
        <div class="b-step on"><i>1</i> Details</div>
        <div class="b-line" id="line1"><i></i></div>
        <div class="b-step" id="step2"><i>2</i> Confirm</div>
      </div>
      <div class="date-row">
        ${days.map((d, i) => `<button class="date-pill ${i === sel ? "on" : ""}" data-i="${i}"><span>${d[0]}</span><b>${d[1]}</b></button>`).join("")}
      </div>
      <div class="stepper">
        <span>Guests</span>
        <div class="ctrl"><button id="minus">−</button><b id="g-count">${guests}</b><button id="plus">+</button></div>
      </div>
      <div class="sheet-summary"><span>Total, all included</span><b id="total">€${x.price * guests}</b></div>
      <button class="btn-gold" id="confirm-btn">Confirm reservation</button>`;
    $$(".date-pill", body).forEach((p) => p.addEventListener("click", () => {
      sel = +p.dataset.i;
      $$(".date-pill", body).forEach((q) => q.classList.toggle("on", +q.dataset.i === sel));
    }));
    const upd = () => { $("#g-count").textContent = guests; $("#total").textContent = "€" + x.price * guests; };
    $("#minus").addEventListener("click", () => { guests = Math.max(1, guests - 1); upd(); });
    $("#plus").addEventListener("click", () => { guests = Math.min(8, guests + 1); upd(); });
    $("#confirm-btn").addEventListener("click", () => {
      $("#line1").classList.add("on");
      $("#step2").classList.add("on");
      setTimeout(renderStep2, 450);
    });
  };

  const renderStep2 = () => {
    const when = `${days[sel][0]} ${days[sel][1]} July · ${x.time.split("·")[1]?.trim() || "evening"}`;
    state.trips.unshift({ id: x.id, when, guests });
    persist();
    body.innerHTML = `
      <div class="confirm-wrap">
        <div class="seal">
          <svg viewBox="0 0 108 108">
            <circle class="seal-bg" cx="54" cy="54" r="46"/>
            <circle class="seal-ring" cx="54" cy="54" r="50"/>
            <path class="seal-check" d="M38 55.5 49 66l22-24"/>
          </svg>
        </div>
        <h3 class="confirm-title">Consider it kept</h3>
        <p class="confirm-sub">${esc(x.title)}<br/><b style="color:var(--gold-2)">${when} · ${guests} guest${guests > 1 ? "s" : ""}</b><br/>${esc(x.host.name)} has been told you're coming.</p>
        <button class="btn-gold" id="done-btn">See it in Trips</button>
        <div style="height:10px"></div>
        <button class="btn-ghost" id="msg-btn">Message your host</button>
      </div>`;
    petals();
    $("#done-btn").addEventListener("click", () => { close(); go("trips"); });
    $("#msg-btn").addEventListener("click", () => { close(); go("chat/matteo"); });
  };

  renderStep1();
}

function petals() {
  const colors = ["#c9a227", "#e3c565", "#8a2a24", "#ece1cd"];
  for (let i = 0; i < 26; i++) {
    const p = document.createElement("i");
    p.className = "petal";
    p.style.left = Math.random() * 100 + "vw";
    p.style.background = colors[i % colors.length];
    p.style.setProperty("--rot", 300 + Math.random() * 500 + "deg");
    p.style.animationDuration = 2.4 + Math.random() * 2 + "s";
    p.style.animationDelay = Math.random() * 0.5 + "s";
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 5200);
  }
}

/* ---------------- Messages ---------------- */
function renderMessages() {
  view.innerHTML = `
  <section class="screen msgs">
    <header class="page-head">
      <span class="kicker">Coordinate</span>
      <h1 class="page-title">Messages</h1>
    </header>
    <div style="height:10px"></div>
    ${THREADS.map((t, i) => `
      <div class="thread obs" style="--d:${i * 0.07}s" data-t="${t.id}">
        <div class="t-avatar ${t.online ? "online" : ""}">
          ${t.img ? `<img src="${U(t.img, 120)}" alt="" />` : `<div style="width:54px;height:54px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(140deg,#d9b64a,#a4831c);color:var(--ink);font-family:var(--serif);font-style:italic;font-size:26px">E</div>`}
        </div>
        <div><b>${esc(t.name)}</b><p>${esc(t.last)}</p></div>
        <div style="text-align:right"><time>${t.time}</time>${t.unread ? `<div class="unread">${t.unread}</div>` : ""}</div>
      </div>`).join("")}
  </section>`;
  $$("[data-t]").forEach((el) => el.addEventListener("click", () => go("chat/" + el.dataset.t)));
}

function renderChat(id) {
  const t = THREADS.find((th) => th.id === id) || THREADS[0];
  const msgs = CHATS[t.id] || [];
  let d = 0;
  const html = msgs.map((m) => {
    if (m.day) return `<div class="chat-day">${m.day}</div>`;
    if (m.card) {
      const x = XP.find((e) => e.id === m.card);
      return `<div class="chat-card" style="--d:${(d += 0.05)}s" data-x="${x.id}">
        <img src="${U(x.img, 500)}" alt="" /><div><b>${esc(x.title)}</b><span>€${x.price} ${x.unit} · ${star.replace("<svg", '<svg style="width:10px;height:10px;fill:var(--gold)"')} ${x.rating}</span></div></div>`;
    }
    return `<div class="bubble ${m.who}" style="--d:${(d += 0.05)}s">${m.name ? `<b style="display:block;font-size:11px;color:var(--gold-2);margin-bottom:3px">${m.name}</b>` : ""}${esc(m.text)}<time>${m.t}</time></div>`;
  }).join("");
  view.innerHTML = `
  <section class="screen chat">
    <div class="chat-head">
      <button class="circle-btn" id="back-btn" style="width:38px;height:38px"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button>
      ${t.img ? `<img src="${U(t.img, 100)}" alt="" />` : `<div style="width:42px;height:42px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(140deg,#d9b64a,#a4831c);color:var(--ink);font-family:var(--serif);font-style:italic;font-size:21px">E</div>`}
      <div><b>${esc(t.name)}</b><span>${t.online ? "Online now" : "Away"}</span></div>
    </div>
    <div class="chat-body" id="chat-body">${html}</div>
    <div class="chat-input">
      <input id="chat-in" placeholder="Write a message&hellip;" autocomplete="off" />
      <button class="send-btn" id="send-btn" aria-label="Send"><svg viewBox="0 0 24 24"><path d="M3 11.5 21 3l-6.5 18-3-7.5z"/></svg></button>
    </div>
  </section>`;
  const bodyEl = $("#chat-body");
  bodyEl.scrollTop = bodyEl.scrollHeight;
  $("#back-btn").addEventListener("click", () => go("messages"));
  $$("[data-x]", bodyEl).forEach((c) => c.addEventListener("click", () => go("x/" + c.dataset.x)));

  const send = () => {
    const inp = $("#chat-in");
    const txt = inp.value.trim();
    if (!txt) return;
    inp.value = "";
    bodyEl.insertAdjacentHTML("beforeend", `<div class="bubble me">${esc(txt)}<time>Now</time></div>`);
    bodyEl.scrollTop = bodyEl.scrollHeight;
    setTimeout(() => {
      bodyEl.insertAdjacentHTML("beforeend", `<div class="typing" id="typing"><i></i><i></i><i></i></div>`);
      bodyEl.scrollTop = bodyEl.scrollHeight;
      setTimeout(() => {
        $("#typing")?.remove();
        const replies = {
          matteo: "Va bene! See you at the counter. 🍷",
          crew: "Mindy: YES. Booking it now before Troy changes his mind again",
          concierge: "Noted. Your concierge will confirm within the hour, Nate.",
        };
        bodyEl.insertAdjacentHTML("beforeend", `<div class="bubble them">${esc(replies[t.id] || "✦")}<time>Now</time></div>`);
        bodyEl.scrollTop = bodyEl.scrollHeight;
      }, 1600);
    }, 700);
  };
  $("#send-btn").addEventListener("click", send);
  $("#chat-in").addEventListener("keydown", (e) => e.key === "Enter" && send());
}

/* ---------------- Trips ---------------- */
function renderTrips() {
  const items = state.trips.map((tr) => ({ ...XP.find((x) => x.id === tr.id), _t: tr })).filter((x) => x.id);
  view.innerHTML = `
  <section class="screen trips">
    <header class="page-head">
      <span class="kicker">Your itinerary</span>
      <h1 class="page-title">Trips in <em class="italic" style="color:var(--gold-2)">Florence</em></h1>
    </header>
    <div style="height:14px"></div>
    ${items.length ? items.map((x, i) => `
      <article class="trip-card obs" style="--d:${i * 0.08}s" data-x="${x.id}">
        <img src="${U(x.img, 800)}" alt="" loading="lazy" />
        <div class="trip-card-body">
          <div><b>${esc(x.title)}</b><span>${esc(x._t.when)} · ${x._t.guests} guest${x._t.guests > 1 ? "s" : ""}</span></div>
          <span class="trip-status">Confirmed</span>
        </div>
      </article>`).join("")
      : `<div class="empty"><p class="h-serif">Nothing kept yet</p><p>Reserve something tonight and it will wait for you here.</p></div>`}
    <div class="ornament" style="margin:18px 44px"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z"/></svg></div>
    <p style="text-align:center;color:var(--parchment-dim);font-size:12.5px;padding:0 40px;line-height:1.7">Plans change. Every reservation can be moved or released up to 24 hours before, no questions.</p>
  </section>`;
  $$("[data-x]").forEach((c) => c.addEventListener("click", () => go("x/" + c.dataset.x)));
}

/* ---------------- Profile ---------------- */
function renderProfile() {
  view.innerHTML = `
  <section class="screen profile">
    <div class="profile-hero obs">
      <img src="${U(IMG.aTroy, 200)}" alt="Nate" />
      <h2>Nate Tran</h2>
      <p>Exploring since 2024 · San Jose, CA</p>
    </div>
    <div class="stat-row">
      <div class="stat obs" style="--d:0s"><b>7</b><span>Cities</span></div>
      <div class="stat obs" style="--d:.07s"><b>${state.trips.length}</b><span>Booked</span></div>
      <div class="stat obs" style="--d:.14s"><b>${state.saved.size}</b><span>Saved</span></div>
    </div>
    <div class="menu">
      ${[["✦", "Taste profile", "taste"], ["🕯️", "Wishlist", "wish"], ["🧾", "Past reservations", "past"], ["🌐", "Language & currency", "lang"], ["🔔", "Notifications", "notif"], ["↦", "Sign out", "out"]]
        .map(([i, l, a], k) => `<button class="menu-item obs" style="--d:${k * 0.05}s" data-a="${a}"><span class="ico">${i}</span>${l}<span class="arrow">›</span></button>`).join("")}
    </div>
  </section>`;
  $$("[data-a]").forEach((b) => b.addEventListener("click", () => {
    if (b.dataset.a === "out") {
      state.authed = false;
      sessionStorage.removeItem("xp-authed");
      go("splash");
    } else toast("Coming soon to Explorite ✦");
  }));
}

/* ---------------- PWA ---------------- */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  installPrompt = e;
  const hint = document.getElementById("install-hint");
  if (hint) {
    hint.hidden = false;
    hint.style.cursor = "pointer";
    hint.addEventListener("click", async () => { installPrompt.prompt(); installPrompt = null; hint.hidden = true; });
  }
});

/* ---------------- Boot ---------------- */
route();
