/* ============================================================
   EXPLORITE v3 — "Field Journal / The Planner"
   Real app: Supabase auth, catalog, bookings, crew plans,
   host messaging. No framework, no build step.
   ============================================================ */
'use strict';

const SUPABASE_URL = 'https://cfsfzqkuzmsaknctbgvz.supabase.co';
const SUPABASE_KEY = 'sb_publishable_PnQo-16MxlGijCoHaA3SkQ_O7Bl31vW';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
};
const sstore = {
  get(k) { try { return sessionStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { sessionStorage.setItem(k, v); } catch {} },
  del(k) { try { sessionStorage.removeItem(k); } catch {} },
};

const $app = document.getElementById('app');
const $sheetRoot = document.getElementById('sheet-root');
const $toastRoot = document.getElementById('toast-root');

/* ---------------- state ---------------- */
const S = {
  session: null,
  profile: null,
  experiences: [],
  expBySlug: {},
  city: store.get('xp_city') || 'Florence',
  category: 'All',
  saves: new Set(),
  loaded: false,
  chatChannel: null,
};
const CITIES = ['Florence', 'Kyoto', 'Mexico City'];
const CATS = ['All', 'Food', 'Culture', 'Craft', 'Outdoors', 'Nightlife', 'Day trip'];

/* ---------------- utils ---------------- */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (c) => '$' + (c / 100).toFixed(c % 100 ? 2 : 0);
const stars = (r) => '★'.repeat(Math.round(r)) + '☆'.repeat(5 - Math.round(r));
const durFmt = (m) => m >= 60 ? (m % 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m / 60}h`) : `${m}m`;
const dfmt = (iso, opts) => new Date(iso + (iso.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('en-US', opts || { month: 'short', day: 'numeric' });
const ago = (iso) => {
  const d = Math.floor((Date.now() - new Date(iso)) / 86400000);
  return d < 1 ? 'today' : d === 1 ? 'yesterday' : d < 30 ? `${d}d ago` : dfmt(iso);
};
const issueNo = () => {
  const now = new Date();
  return `Issue ${String(now.getMonth() + 1).padStart(2, '0')} · ${now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
};
function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  $toastRoot.replaceChildren(t);
  setTimeout(() => t.remove(), 2800);
}
function firstName(n) { return String(n || '').split(' ')[0]; }
function initials(n) { return String(n || 'E').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase(); }

/* ---------------- data ---------------- */
async function loadCatalog() {
  const { data, error } = await sb.from('explorite_experiences').select('*').order('featured', { ascending: false }).order('title');
  if (error) { toast('Could not reach the journal. Retrying…'); setTimeout(loadCatalog, 2500); return; }
  S.experiences = data || [];
  S.expBySlug = Object.fromEntries(S.experiences.map(e => [e.slug, e]));
  S.loaded = true;
  render();
}
async function loadSaves() {
  if (!S.session) { S.saves = new Set(); return; }
  const { data } = await sb.from('explorite_saves').select('experience_id');
  S.saves = new Set((data || []).map(r => r.experience_id));
}
async function loadProfile() {
  if (!S.session) { S.profile = null; return; }
  const { data } = await sb.from('explorite_profiles').select('*').eq('id', S.session.user.id).maybeSingle();
  S.profile = data;
}
function myName() { return S.profile?.display_name || 'Explorer'; }

/* ---------------- router ---------------- */
function nav(h) { location.hash = h; }
function route() {
  const h = location.hash.replace(/^#\/?/, '');
  const parts = h.split('/').filter(Boolean);
  return { name: parts[0] || 'discover', arg: parts[1] ? decodeURIComponent(parts[1]) : null };
}
window.addEventListener('hashchange', () => { closeSheet(true); render(); });

function requireAuth(returnTo) {
  if (S.session) return true;
  sstore.set('xp_return', returnTo || location.hash);
  nav('/auth');
  return false;
}

/* ---------------- tab bar ---------------- */
const ICONS = {
  discover: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M15 9l-2 5-4 1 2-5z"/></svg>',
  saved: '<svg viewBox="0 0 24 24"><path d="M6 4h12v17l-6-4.5L6 21z"/></svg>',
  plans: '<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15"/><path d="M4 10h16M8 3v4M16 3v4"/></svg>',
  trips: '<svg viewBox="0 0 24 24"><path d="M4 9h16v10H4zM4 13h16M9 9V6h6v3"/></svg>',
  inbox: '<svg viewBox="0 0 24 24"><path d="M4 5h16v11H8l-4 4z"/></svg>',
};
function tabbar(active) {
  const tabs = [
    ['discover', '', 'Discover'], ['saved', 'saved', 'Saved'], ['plans', 'plans', 'Plans'],
    ['trips', 'trips', 'Trips'], ['inbox', 'inbox', 'Inbox'],
  ];
  return `<nav class="tabbar">${tabs.map(([k, h, label]) =>
    `<a class="tab ${active === k ? 'active' : ''}" href="#/${h}">${ICONS[k]}<span>${label}</span></a>`).join('')}</nav>`;
}

/* ---------------- masthead ---------------- */
function masthead() {
  const who = S.session ? initials(myName()) : '•';
  return `<header class="masthead">
    <div class="masthead-row">
      <div class="masthead-brand">Explo<em>rite</em></div>
      <div class="masthead-issue">
        <span class="kicker">${issueNo()}</span>
        <button class="avatar-btn" data-act="profile" aria-label="Profile">${who}</button>
      </div>
    </div>
    <hr class="rule dark" />
    <div class="city-tabs">${CITIES.map(c =>
      `<button class="city-tab ${S.city === c ? 'active' : ''}" data-city="${c}">${c}</button>`).join('')}</div>
  </header>`;
}

/* ============================================================
   SCREENS
   ============================================================ */

/* ---------- discover ---------- */
function screenDiscover() {
  if (!S.loaded) {
    $app.innerHTML = masthead() + `<div class="skel skel-cover"></div><div class="skel skel-row"></div><div class="skel skel-row"></div>` + tabbar('discover');
    bindMasthead();
    return;
  }
  const inCity = S.experiences.filter(e => e.city === S.city);
  const list = inCity.filter(e => S.category === 'All' || e.category === S.category);
  const cover = (S.category === 'All' ? inCity.find(e => e.featured) : null) || null;
  const rest = list.filter(e => e !== cover);

  const coverHtml = cover ? `
    <button class="cover-story fade-in" data-go="/x/${cover.slug}">
      <div class="photo"><img src="${cover.hero_img}" alt="${esc(cover.title)}" /><span class="cover-num">Cover story</span></div>
      <div class="cover-caption">
        <span class="kicker">${esc(cover.category)} · ${esc(cover.city)}</span>
        <h2 class="display">${esc(cover.title)}</h2>
        <p class="sub">${esc(cover.tagline)}</p>
        <div class="cover-meta">
          <span class="meta-mono"><b>${money(cover.price_cents)}</b> / person</span>
          <span class="meta-mono">${durFmt(cover.duration_min)}</span>
          <span class="meta-mono"><span class="star">★</span> <b>${cover.rating}</b> (${cover.review_count})</span>
        </div>
      </div>
    </button>` : '';

  $app.innerHTML = masthead() + `
    <div class="chips">${CATS.map(c => `<button class="chip ${S.category === c ? 'active' : ''}" data-cat="${c}">${c}</button>`).join('')}</div>
    ${coverHtml}
    <div class="index-head"><span class="kicker dark">The index — ${esc(S.city)}</span><span class="kicker">${rest.length} vetted</span></div>
    ${rest.map((e, i) => `
      <button class="index-row fade-in" data-go="/x/${e.slug}">
        <span class="index-num">${String(i + 1).padStart(2, '0')}</span>
        <img class="index-thumb" src="${e.hero_img.replace('w=1600', 'w=300')}" alt="" loading="lazy" />
        <span class="index-body">
          <h3>${esc(e.title)}</h3>
          <div class="tag">${esc(e.tagline)}</div>
          <div class="meta-mono"><b>${money(e.price_cents)}</b> · ${durFmt(e.duration_min)} · ★ ${e.rating} (${e.review_count})</div>
          <span class="trust-chip">Vetted in person</span>
        </span>
      </button>`).join('')}
    <div style="padding:26px 20px 10px;text-align:center">
      <span class="kicker">Every page above was walked, eaten or rowed by a real person first.</span>
    </div>
  ` + tabbar('discover');
  bindMasthead();
}

function bindMasthead() {
  $app.querySelectorAll('[data-city]').forEach(b => b.onclick = () => { S.city = b.dataset.city; store.set('xp_city', S.city); render(); });
  $app.querySelectorAll('[data-cat]').forEach(b => b.onclick = () => { S.category = b.dataset.cat; render(); });
  bindCommon();
}
function bindCommon() {
  $app.querySelectorAll('[data-go]').forEach(b => b.onclick = () => nav(b.dataset.go));
  $app.querySelectorAll('[data-act="profile"]').forEach(b => b.onclick = () => nav(S.session ? '/profile' : '/auth'));
}

/* ---------- detail ---------- */
async function screenDetail(slug) {
  const e = S.expBySlug[slug];
  if (!e) { nav('/'); return; }
  window.scrollTo(0, 0);

  $app.innerHTML = `
    <div class="detail-hero">
      <img src="${e.hero_img}" alt="${esc(e.title)}" />
      <button class="back-float" data-back>← Index</button>
      <button class="save-float ${S.saves.has(e.id) ? 'saved' : ''}" data-save aria-label="Save">${S.saves.has(e.id) ? '♥' : '♡'}</button>
    </div>
    <div class="photo-credit"><span>${esc(e.city)}, ${esc(e.country)}</span><span>${esc(e.vetted_by || 'Field-checked')}</span></div>
    <div class="detail-head">
      <span class="kicker dark">${esc(e.category)} · ${esc(e.city)} desk</span>
      <h1 class="display">${esc(e.title)}</h1>
      <p class="tagline">${esc(e.tagline)}</p>
    </div>
    <div class="badge-row">${(e.badges || []).map(b => `<span class="badge">${esc(b)}</span>`).join('')}</div>
    <div class="factline">
      <div class="fact"><div class="v">${money(e.price_cents)}</div><div class="k">per person</div></div>
      <div class="fact"><div class="v">${durFmt(e.duration_min)}</div><div class="k">duration</div></div>
      <div class="fact"><div class="v">${e.group_max}</div><div class="k">max group</div></div>
      <div class="fact"><div class="v">★ ${e.rating}</div><div class="k">${e.review_count} reviews</div></div>
    </div>

    <div class="fieldnote">
      <span class="stamp">Vetted</span>
      <h4>Why you can trust this</h4>
      <p>${esc(e.vet_note)}</p>
      <div class="vetline">✓ ${esc(e.vetted_by)}</div>
    </div>

    <div class="detail-section">
      <span class="kicker dark">What happens</span>
      ${(e.highlights || []).map((h, i) => `<div class="hl-row"><span class="n">${String(i + 1).padStart(2, '0')}</span><span>${esc(h)}</span></div>`).join('')}
    </div>

    <div class="detail-section">
      <span class="kicker dark">The fine print</span>
      <div class="inc-list">${(e.included || []).map(x => `<span class="badge">${esc(x)}</span>`).join('')}</div>
      <p class="meetline">Meet at <b>${esc(e.meeting_point)}</b></p>
      <p class="cancel-note">✓ ${esc(e.cancellation)}</p>
    </div>

    <div class="detail-section">
      <span class="kicker dark">Your host</span>
      <div class="host-card">
        <div class="host-mark">${esc(e.host_name[0])}</div>
        <div>
          <h5>${esc(e.host_name)}</h5>
          <div class="line">${esc(e.host_line)}</div>
          <div class="yrs">${e.host_years} years hosting</div>
        </div>
      </div>
      <button class="btn-ghost" data-msg>Message ${esc(firstName(e.host_name))}</button>
    </div>

    <div class="detail-section">
      <span class="kicker dark">Put it in the plan</span>
      <p class="plan-pitch">Dog-earing is for someday. A trip is for dates. File this page into a day and the map does the math.</p>
      <button class="btn-ghost" data-addtrip>+ Add to a trip</button>
    </div>

    <div class="detail-section" id="reviews-block">
      <span class="kicker dark">From verified guests</span>
      <div id="reviews-inner"><div class="skel" style="height:110px;margin-top:14px"></div></div>
      <button class="btn-ghost" data-write-review style="margin-bottom:8px">Write a review</button>
    </div>

    <div style="height:34px"></div>
    <div class="reserve-bar" id="reserve-bar">
      <div class="price"><div class="v">${money(e.price_cents)}</div><div class="k">per person</div></div>
      <button class="btn-primary" data-reserve>Reserve</button>
    </div>
  `;

  $app.querySelector('[data-back]').onclick = () => history.length > 1 ? history.back() : nav('/');
  $app.querySelector('[data-reserve]').onclick = () => openBookingSheet(e);
  $app.querySelector('[data-msg]').onclick = () => openThread(e);
  $app.querySelector('[data-save]').onclick = async (ev) => {
    if (!requireAuth(`#/x/${slug}`)) return;
    const btn = ev.currentTarget;
    if (S.saves.has(e.id)) {
      S.saves.delete(e.id);
      btn.classList.remove('saved'); btn.textContent = '♡';
      await sb.from('explorite_saves').delete().eq('experience_id', e.id).eq('user_id', S.session.user.id);
    } else {
      S.saves.add(e.id);
      btn.classList.add('saved'); btn.textContent = '♥';
      await sb.from('explorite_saves').insert({ user_id: S.session.user.id, experience_id: e.id });
      toast('Saved to your journal');
    }
  };
  $app.querySelector('[data-write-review]').onclick = () => {
    if (!requireAuth(`#/x/${slug}`)) return;
    openReviewSheet(e);
  };
  $app.querySelector('[data-addtrip]').onclick = () => {
    if (!requireAuth(`#/x/${slug}`)) return;
    openAddToTripSheet(e);
  };

  // sticky reserve bar — always present on detail (Airbnb mobile pattern),
  // slides in after first paint
  const bar = document.getElementById('reserve-bar');
  requestAnimationFrame(() => bar.classList.add('show'));

  // reviews
  const { data: reviews } = await sb.from('explorite_reviews').select('*').eq('experience_id', e.id).order('created_at', { ascending: false }).limit(30);
  const inner = document.getElementById('reviews-inner');
  if (!inner) return;
  const verified = (reviews || []).filter(r => r.verified);
  const pull = verified.slice().sort((a, b) => b.body.length - a.body.length)[0];
  inner.innerHTML = `
    ${pull ? `<div class="digest">
      <div class="lbl"><span>The pull quote</span><span>from ${verified.length} verified bookings</span></div>
      <blockquote>“${esc(pull.body)}”</blockquote>
      <cite>— ${esc(pull.author)}, verified guest</cite>
    </div>` : ''}
    ${(reviews || []).map(r => `
      <div class="review">
        <div class="review-head"><span class="who">${esc(r.author)}</span><span class="stars">${stars(r.rating)}</span></div>
        ${r.verified ? '<span class="vbadge">Verified booking</span>' : ''}
        <p>${esc(r.body)}</p>
        <time>${ago(r.created_at)}</time>
      </div>`).join('') || '<p style="padding:14px 0;color:var(--ink-soft)">No reviews yet. Be the first voice on this page.</p>'}
  `;
}

/* ---------- booking sheet ---------- */
function sheet(html) {
  $sheetRoot.innerHTML = `<div class="sheet-scrim"></div><div class="sheet" role="dialog">${html}</div>`;
  requestAnimationFrame(() => {
    $sheetRoot.querySelector('.sheet-scrim').classList.add('open');
    $sheetRoot.querySelector('.sheet').classList.add('open');
  });
  $sheetRoot.querySelector('.sheet-scrim').onclick = () => closeSheet();
  return $sheetRoot.querySelector('.sheet');
}
function closeSheet(instant) {
  const sc = $sheetRoot.querySelector('.sheet-scrim');
  const sh = $sheetRoot.querySelector('.sheet');
  if (!sh) return;
  if (instant) { $sheetRoot.innerHTML = ''; return; }
  sc.classList.remove('open'); sh.classList.remove('open');
  setTimeout(() => { $sheetRoot.innerHTML = ''; }, 300);
}

function next14() {
  const out = [];
  for (let i = 1; i <= 14; i++) {
    const d = new Date(); d.setDate(d.getDate() + i);
    out.push(d);
  }
  return out;
}
const isoDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function openBookingSheet(e) {
  if (!requireAuth(`#/x/${e.slug}`)) return;
  const days = next14();
  let selDate = isoDate(days[0]);
  let selSlot = (e.time_slots || [])[0];
  let party = 2;

  const el = sheet(`
    <div class="sheet-head"><h3>Reserve</h3><button class="sheet-close" data-x>Close</button></div>
    <span class="kicker">${esc(e.title)} — ${esc(e.city)}</span>
    <label class="kicker dark lbl-gap">Pick a day</label>
    <div class="datestrip">${days.map(d => `
      <button class="datecell ${isoDate(d) === selDate ? 'sel' : ''}" data-date="${isoDate(d)}">
        <div class="dow">${d.toLocaleDateString('en-US', { weekday: 'short' })}</div>
        <div class="dom">${d.getDate()}</div>
      </button>`).join('')}</div>
    <label class="kicker dark lbl-gap">Start time</label>
    <div class="slotrow">${(e.time_slots || []).map(s => `<button class="slotcell ${s === selSlot ? 'sel' : ''}" data-slot="${s}">${s}</button>`).join('')}</div>
    <label class="kicker dark lbl-gap">Party</label>
    <div class="stepper">
      <button data-step="-1">−</button><span class="n" id="party-n">2</span><button data-step="1">+</button>
      <span class="kicker">max ${e.group_max}</span>
    </div>
    <div class="totalrow"><span class="kicker dark">Total</span><span class="v" id="total-v">${money(e.price_cents * 2)}</span></div>
    <button class="btn-primary wide" data-confirm>Confirm reservation</button>
    <p style="text-align:center;margin-top:10px"><span class="kicker">✓ ${esc(e.cancellation)}</span></p>
  `);

  const refresh = () => {
    el.querySelectorAll('.datecell').forEach(b => b.classList.toggle('sel', b.dataset.date === selDate));
    el.querySelectorAll('.slotcell').forEach(b => b.classList.toggle('sel', b.dataset.slot === selSlot));
    el.querySelector('#party-n').textContent = party;
    el.querySelector('#total-v').textContent = money(e.price_cents * party);
  };
  el.querySelector('[data-x]').onclick = () => closeSheet();
  el.querySelectorAll('.datecell').forEach(b => b.onclick = () => { selDate = b.dataset.date; refresh(); });
  el.querySelectorAll('.slotcell').forEach(b => b.onclick = () => { selSlot = b.dataset.slot; refresh(); });
  el.querySelectorAll('[data-step]').forEach(b => b.onclick = () => {
    party = Math.min(e.group_max, Math.max(1, party + Number(b.dataset.step))); refresh();
  });
  el.querySelector('[data-confirm]').onclick = async (ev) => {
    ev.currentTarget.disabled = true;
    const { data, error } = await sb.from('explorite_bookings').insert({
      user_id: S.session.user.id, experience_id: e.id,
      on_date: selDate, slot: selSlot, party, total_cents: e.price_cents * party,
    }).select().single();
    if (error) { toast('Reservation failed — try again'); ev.currentTarget.disabled = false; return; }
    showTicket(e, data);
  };
}

function ticketHtml(e, b) {
  return `<div class="ticket ${b.status === 'cancelled' ? 'ticket-cancelled' : ''}">
    <div class="ticket-top">
      <span class="ticket-status ${b.status === 'cancelled' ? 'off' : ''}">${b.status === 'cancelled' ? 'Cancelled' : '✓ Confirmed'}</span>
      <h4>${esc(e.title)}</h4>
      <div class="where">${esc(e.city)} · meet at ${esc(e.meeting_point)}</div>
    </div>
    <div class="ticket-perf"></div>
    <div class="ticket-bottom">
      <span class="code">${esc(b.code)}</span>
      <span class="when">${dfmt(b.on_date, { weekday: 'short', month: 'short', day: 'numeric' })}<br/>${esc(b.slot)} · ${b.party} ${b.party > 1 ? 'people' : 'person'}</span>
    </div>
  </div>`;
}

function showTicket(e, b) {
  const el = sheet(`
    <div class="sheet-head"><h3>You're in.</h3><button class="sheet-close" data-x>Close</button></div>
    <span class="kicker">Show this code to ${esc(firstName(e.host_name))}. It lives in Trips too.</span>
    ${ticketHtml(e, b)}
    <button class="btn-primary wide" data-plan style="margin-top:14px">Get your crew in — make it a plan</button>
    <button class="btn-ghost" data-trips style="width:100%;text-align:center">View in Trips</button>
  `);
  el.querySelector('[data-x]').onclick = () => closeSheet();
  el.querySelector('[data-trips]').onclick = () => { closeSheet(true); nav('/trips'); };
  el.querySelector('[data-plan]').onclick = () => { closeSheet(true); openPlanSheet(e, b.on_date, b.slot); };
}

/* ---------- review sheet ---------- */
function openReviewSheet(e) {
  let rating = 5;
  const el = sheet(`
    <div class="sheet-head"><h3>Your field report</h3><button class="sheet-close" data-x>Close</button></div>
    <span class="kicker">${esc(e.title)}. If you booked it here, you'll get the verified stamp.</span>
    <div class="rate-input">${[1,2,3,4,5].map(n => `<button data-r="${n}" class="on">★</button>`).join('')}</div>
    <div class="form-block">
      <label>What happened</label>
      <textarea id="rv-body" rows="4" maxlength="2000" placeholder="Say the specific thing. The bench, the bowl, the alley."></textarea>
    </div>
    <div class="form-err" id="rv-err"></div>
    <button class="btn-primary wide" data-send>Publish review</button>
  `);
  const paint = () => el.querySelectorAll('[data-r]').forEach(b => b.classList.toggle('on', Number(b.dataset.r) <= rating));
  el.querySelectorAll('[data-r]').forEach(b => b.onclick = () => { rating = Number(b.dataset.r); paint(); });
  el.querySelector('[data-x]').onclick = () => closeSheet();
  el.querySelector('[data-send]').onclick = async (ev) => {
    const body = el.querySelector('#rv-body').value.trim();
    if (body.length < 8) { el.querySelector('#rv-err').textContent = 'Give it at least a sentence.'; return; }
    ev.currentTarget.disabled = true;
    const { error } = await sb.from('explorite_reviews').insert({
      experience_id: e.id, user_id: S.session.user.id, author: myName(), rating, body,
    });
    if (error) { el.querySelector('#rv-err').textContent = 'Could not publish. Try again.'; ev.currentTarget.disabled = false; return; }
    closeSheet();
    toast('Filed. Thank you, correspondent.');
    const { data: fresh } = await sb.from('explorite_experiences').select('*').eq('id', e.id).single();
    if (fresh) { Object.assign(e, fresh); }
    render();
  };
}

/* ---------- crew plans ---------- */
function openPlanSheet(e, seedDate, seedSlot) {
  if (!requireAuth(`#/x/${e.slug}`)) return;
  const days = next14();
  const options = [];
  days.forEach(d => (e.time_slots || []).forEach(s => options.push({ date: isoDate(d), slot: s })));
  const picked = new Set();
  if (seedDate && seedSlot) picked.add(seedDate + '|' + seedSlot);

  const el = sheet(`
    <div class="sheet-head"><h3>Rally the crew</h3><button class="sheet-close" data-x>Close</button></div>
    <span class="kicker">Pick 2–4 windows. Friends answer with one tap, no account needed. This is how the plan survives the group chat.</span>
    <div style="max-height:44dvh;overflow-y:auto;margin-top:10px">
      ${options.slice(0, 40).map(o => `
        <button class="vote-slot" data-opt="${o.date}|${o.slot}" style="width:100%">
          <span><span class="when">${dfmt(o.date, { weekday: 'short', month: 'short', day: 'numeric' })} · ${o.slot}</span></span>
          <span class="kicker pick-mark">${picked.has(o.date + '|' + o.slot) ? '✓ picked' : 'pick'}</span>
        </button>`).join('')}
    </div>
    <div class="form-err" id="pl-err"></div>
    <button class="btn-primary wide" data-create style="margin-top:8px">Create plan + get link</button>
  `);
  const paint = () => el.querySelectorAll('[data-opt]').forEach(b => {
    const on = picked.has(b.dataset.opt);
    b.querySelector('.pick-mark').textContent = on ? '✓ picked' : 'pick';
    b.style.borderColor = on ? 'var(--verified)' : '';
    b.style.borderWidth = on ? '1.5px' : '';
  });
  paint();
  el.querySelectorAll('[data-opt]').forEach(b => b.onclick = () => {
    const k = b.dataset.opt;
    if (picked.has(k)) picked.delete(k);
    else if (picked.size >= 4) { toast('Four windows max. Decisiveness is a gift.'); return; }
    else picked.add(k);
    paint();
  });
  el.querySelector('[data-x]').onclick = () => closeSheet();
  el.querySelector('[data-create]').onclick = async (ev) => {
    if (picked.size < 1) { el.querySelector('#pl-err').textContent = 'Pick at least one window.'; return; }
    ev.currentTarget.disabled = true;
    const { data: plan, error } = await sb.from('explorite_plans').insert({
      owner_id: S.session.user.id, experience_id: e.id, owner_name: myName(),
    }).select().single();
    if (error) { el.querySelector('#pl-err').textContent = 'Could not create plan.'; ev.currentTarget.disabled = false; return; }
    const slots = [...picked].map(k => { const [d, s] = k.split('|'); return { plan_id: plan.id, on_date: d, slot: s }; });
    await sb.from('explorite_plan_slots').insert(slots);
    closeSheet(true);
    nav('/plans');
    const link = location.origin + location.pathname + '#/p/' + plan.share_token;
    try { await navigator.clipboard.writeText(link); toast('Plan made — invite link copied'); }
    catch { toast('Plan made — grab the link in Plans'); }
  };
}

async function screenPlans() {
  if (!requireAuth('#/plans')) return;
  window.scrollTo(0, 0);
  $app.innerHTML = `
    <div class="page-head"><span class="kicker">The coordination desk</span><h1 class="display">Plans</h1><hr class="rule dark"/></div>
    <div id="plans-list"><div class="skel skel-row"></div></div>
  ` + tabbar('plans');
  bindCommon();

  const { data: plans } = await sb.from('explorite_plans').select('*, explorite_plan_slots(*), explorite_plan_votes(*)').order('created_at', { ascending: false });
  const list = document.getElementById('plans-list');
  if (!list) return;
  if (!plans || !plans.length) {
    list.innerHTML = `<div class="empty">
      <h4>No plans yet</h4>
      <p>Your research said it best: finding the thing is easy, getting everyone to show up is the hard part. Make a plan, send one link, watch the yeses roll in.</p>
      <button class="btn-primary" data-go="/">Find something worth planning</button>
    </div>`;
    bindCommon();
    return;
  }
  list.innerHTML = plans.map(p => {
    const e = S.experiences.find(x => x.id === p.experience_id) || {};
    const votes = p.explorite_plan_votes || [];
    const slots = (p.explorite_plan_slots || []).sort((a, b) => (a.on_date + a.slot).localeCompare(b.on_date + b.slot));
    const tally = (sid) => {
      const v = votes.filter(v => v.slot_id === sid);
      return { in: v.filter(x => x.status === 'in').length, maybe: v.filter(x => x.status === 'maybe').length, out: v.filter(x => x.status === 'out').length };
    };
    const best = slots.slice().sort((a, b) => tally(b.id).in - tally(a.id).in)[0];
    const voters = [...new Set(votes.map(v => v.voter))];
    return `<div class="plan-card" style="margin:14px 20px">
      <div class="top">
        <span class="kicker">${esc(e.city || '')} · ${voters.length} responded</span>
        <h4>${esc(e.title || 'Experience')}</h4>
        ${best && tally(best.id).in > 0 ? `<div class="plan-lead" style="margin-top:5px">Leading: ${dfmt(best.on_date, { weekday: 'short', month: 'short', day: 'numeric' })} ${esc(best.slot)} — ${tally(best.id).in} in</div>` : `<div class="kicker" style="margin-top:5px">Waiting on the crew…</div>`}
      </div>
      <table class="plan-grid">
        <tr><th style="padding-left:15px">Window</th><th>In</th><th>Maybe</th><th>Out</th></tr>
        ${slots.map(s => { const t = tally(s.id); return `<tr>
          <td style="padding-left:15px">${dfmt(s.on_date, { weekday: 'short', month: 'short', day: 'numeric' })} · ${esc(s.slot)}</td>
          <td class="tally"><span class="in">${t.in}</span></td>
          <td class="tally"><span class="maybe">${t.maybe}</span></td>
          <td class="tally"><span class="out">${t.out}</span></td></tr>`; }).join('')}
      </table>
      <div class="plan-actions">
        <button class="btn-ghost" data-copy="${esc(p.share_token)}" style="margin-top:0">Copy invite link</button>
        ${best && tally(best.id).in > 0 ? `<button class="btn-primary" data-book-win="${esc(e.slug)}|${best.on_date}|${esc(best.slot)}">Book the winner</button>` : ''}
      </div>
    </div>`;
  }).join('');
  list.querySelectorAll('[data-copy]').forEach(b => b.onclick = async () => {
    const link = location.origin + location.pathname + '#/p/' + b.dataset.copy;
    try { await navigator.clipboard.writeText(link); toast('Invite link copied'); }
    catch { prompt('Copy this link:', link); }
  });
  list.querySelectorAll('[data-book-win]').forEach(b => b.onclick = () => {
    const [slug] = b.dataset.bookWin.split('|');
    nav('/x/' + slug);
  });
  bindCommon();
}

/* public vote page */
async function screenVote(token) {
  window.scrollTo(0, 0);
  $app.innerHTML = `<div class="page-head"><span class="kicker">You've been summoned</span><h1 class="display">Crew check</h1><hr class="rule dark"/></div><div id="vote-body"><div class="skel skel-cover"></div></div>`;
  const { data, error } = await sb.rpc('explorite_get_plan', { p_token: token });
  const body = document.getElementById('vote-body');
  if (error || !data) { body.innerHTML = `<div class="empty"><h4>Plan not found</h4><p>This invite link looks off. Ask your friend to resend it.</p></div>`; return; }
  const { plan, experience: e, slots, votes } = data;
  let voter = store.get('xp_voter') || '';

  const paint = (freshVotes) => {
    const V = freshVotes || votes;
    body.innerHTML = `
      <div class="cover-story" style="margin-top:16px">
        <div class="photo" style="aspect-ratio:3/2"><img src="${e.hero_img}" alt="" /></div>
        <div class="cover-caption">
          <span class="kicker">${esc(e.category)} · ${esc(e.city)}, ${esc(e.country)}</span>
          <h2 class="display" style="font-size:24px">${esc(e.title)}</h2>
          <p class="sub">${esc(e.tagline)}</p>
          <div class="cover-meta"><span class="meta-mono"><b>${money(e.price_cents)}</b> / person</span><span class="meta-mono">${durFmt(e.duration_min)}</span></div>
        </div>
      </div>
      <div class="section-pad" style="padding-top:18px">
        <p style="font-size:15px;line-height:1.5"><b>${esc(firstName(plan.owner_name))}</b> wants to do this with you. Tap your availability for each window. That's the whole job.</p>
        <div class="form-block"><label>Your name</label><input id="voter-name" value="${esc(voter)}" maxlength="40" placeholder="So the crew knows who answered" /></div>
        ${slots.map(s => {
          const mine = V.find(v => v.slot_id === s.id && v.voter === voter);
          const t = { in: V.filter(v => v.slot_id === s.id && v.status === 'in').length, maybe: V.filter(v => v.slot_id === s.id && v.status === 'maybe').length };
          return `<div class="vote-slot">
            <span><span class="when">${dfmt(s.on_date, { weekday: 'short', month: 'short', day: 'numeric' })} · ${esc(s.slot)}</span>
            <div class="who">${t.in} in${t.maybe ? ` · ${t.maybe} maybe` : ''}</div></span>
            <span class="vote-btns">
              <button class="vote-btn ${mine?.status === 'in' ? 'sel-in' : ''}" data-v="${s.id}|in">In</button>
              <button class="vote-btn ${mine?.status === 'maybe' ? 'sel-maybe' : ''}" data-v="${s.id}|maybe">Maybe</button>
              <button class="vote-btn ${mine?.status === 'out' ? 'sel-out' : ''}" data-v="${s.id}|out">Out</button>
            </span>
          </div>`;
        }).join('')}
        <p style="margin:18px 0 30px;text-align:center"><span class="kicker">Powered by Explorite — the field journal for people who hate tourist traps</span>
        <br/><button class="btn-ghost" data-go="/" style="margin-top:12px">Browse the journal</button></p>
      </div>`;
    body.querySelector('#voter-name').oninput = (ev) => { voter = ev.target.value; store.set('xp_voter', voter); };
    body.querySelectorAll('[data-v]').forEach(b => b.onclick = async () => {
      if (!voter.trim()) { toast('Add your name first'); body.querySelector('#voter-name').focus(); return; }
      const [slotId, status] = b.dataset.v.split('|');
      const { data: fresh, error: e2 } = await sb.rpc('explorite_vote', { p_token: token, p_slot: slotId, p_voter: voter.trim(), p_status: status });
      if (e2) { toast('Vote failed, try again'); return; }
      paint(fresh.votes);
      toast(status === 'in' ? 'Locked in' : status === 'maybe' ? 'Noted, fence-sitter' : 'Fair enough');
    });
    bindCommon();
  };
  paint();
}

/* ---------- trips ---------- */
/* ============================================================
   TRIP PLANNER (v3) — one trip, one document.
   Wanderlog-informed UX: day blocks, map mirror, shortlist,
   walk math, ledger, kit list, one-link share view.
   ============================================================ */
const DAY_INKS = ['#C0441F', '#33684B', '#B08215', '#2E4E6B', '#6B3352', '#4A5D23', '#7A3B2E', '#1F5F5B'];
const dayInk = (i) => (i == null ? '#8C8471' : DAY_INKS[i % DAY_INKS.length]);
const EXP_CATS = ['Lodging', 'Transit', 'Food', 'Tickets', 'Gear', 'Other'];
const CITY_FALLBACK = { 'Florence': [43.7696, 11.2558], 'Kyoto': [35.0116, 135.7681], 'Mexico City': [19.4326, -99.1332] };
const KIT_SEED = ['Passport / ID', 'Chargers + adapter', 'Offline maps downloaded', 'Comfortable shoes', 'Rain layer', 'Meds + basics', 'Power bank', 'Copies of tickets'];

function tripDayCount(t) {
  const a = new Date(t.start_date + 'T12:00:00'), b = new Date(t.end_date + 'T12:00:00');
  return Math.min(14, Math.max(1, Math.round((b - a) / 86400000) + 1));
}
function tripDayDate(t, i) { const d = new Date(t.start_date + 'T12:00:00'); d.setDate(d.getDate() + i); return d; }
function dayIdxOf(t, iso) { return Math.round((new Date(iso + 'T12:00:00') - new Date(t.start_date + 'T12:00:00')) / 86400000); }
function cityCover(city) { const e = S.experiences.find(x => x.city === city && x.hero_img); return e ? e.hero_img : ''; }
function havKm(a, b) {
  const R = 6371, toR = (x) => x * Math.PI / 180;
  const dLat = toR(b.lat - a.lat), dLng = toR(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function walkLine(a, b) {
  if (!a || !b || a.lat == null || b.lat == null) return '';
  const km = havKm(a, b);
  if (km > 3.2) return `≈ ${km.toFixed(1)} km — ride it`;
  const min = Math.max(1, Math.round((km / 4.5) * 60));
  return `≈ ${min} min walk · ${km < 1 ? Math.round(km * 1000) + ' m' : km.toFixed(1) + ' km'}`;
}
function geoOf(x) { return (x && x.lat != null && x.lng != null) ? { lat: x.lat, lng: x.lng } : null; }
function shareTripLink(t) { return location.origin + location.pathname + '#/j/' + t.share_token; }

async function loadTripBundle(id) {
  const [tRes, iRes, xRes, cRes, bRes] = await Promise.all([
    sb.from('explorite_trips').select('*').eq('id', id).maybeSingle(),
    sb.from('explorite_trip_items').select('*').eq('trip_id', id).order('position', { ascending: true }).order('created_at', { ascending: true }),
    sb.from('explorite_trip_expenses').select('*').eq('trip_id', id).order('created_at', { ascending: true }),
    sb.from('explorite_trip_checklist').select('*').eq('trip_id', id).order('position', { ascending: true }).order('created_at', { ascending: true }),
    sb.from('explorite_bookings').select('*').eq('status', 'confirmed'),
  ]);
  const t = tRes.data;
  if (!t) return null;
  const bookings = (bRes.data || []).filter(b => {
    if (b.on_date < t.start_date || b.on_date > t.end_date) return false;
    const e = S.experiences.find(x => x.id === b.experience_id);
    return e && e.city === t.city;
  });
  return { t, items: iRes.data || [], expenses: xRes.data || [], checks: cRes.data || [], bookings };
}

/* ---------- trips home (planner) ---------- */
async function screenTrips() {
  if (!requireAuth('#/trips')) return;
  window.scrollTo(0, 0);
  $app.innerHTML = `
    <div class="page-head"><span class="kicker">One trip, one document</span><h1 class="display">Trips</h1><hr class="rule dark"/></div>
    <div id="trips-list" class="section-pad"><div class="skel skel-row"></div></div>
  ` + tabbar('trips');
  bindCommon();
  const [{ data: trips }, { data: bookings }] = await Promise.all([
    sb.from('explorite_trips').select('*, explorite_trip_items(id)').order('start_date', { ascending: true }),
    sb.from('explorite_bookings').select('*').order('on_date', { ascending: true }),
  ]);
  const list = document.getElementById('trips-list');
  if (!list) return;
  const today = isoDate(new Date());
  const up = (bookings || []).filter(b => b.on_date >= today && b.status === 'confirmed');
  const past = (bookings || []).filter(b => b.on_date < today || b.status !== 'confirmed');
  const tripCard = (t) => {
    const n = tripDayCount(t);
    const stops = (t.explorite_trip_items || []).length;
    const cover = t.cover_img || cityCover(t.city);
    return `<button class="trip-card" data-go="/t/${t.id}">
      ${cover ? `<img src="${cover.replace('w=1600', 'w=500')}" alt="" />` : ''}
      <div class="trip-card-main">
        <span class="kicker">${esc(t.city)} · ${dfmt(t.start_date)} – ${dfmt(t.end_date)}</span>
        <h4>${esc(t.title)}</h4>
        <div class="m">${n} ${n > 1 ? 'days' : 'day'} · ${stops} ${stops === 1 ? 'stop' : 'stops'} on paper</div>
      </div>
      <span class="trip-card-arrow">→</span>
    </button>`;
  };
  const stubBlock = (items) => items.map(b => {
    const e = S.experiences.find(x => x.id === b.experience_id) || { title: 'Experience', city: '', meeting_point: '', slug: '' };
    return ticketHtml(e, b) + (b.status === 'confirmed' && b.on_date >= today
      ? `<div style="display:flex;gap:8px;margin:-2px 0 8px"><button class="btn-ghost" data-cancel="${b.id}" style="margin-top:6px">Cancel</button><button class="btn-ghost" data-go="/x/${e.slug}" style="margin-top:6px">View page</button></div>` : '');
  }).join('');
  list.innerHTML = `
    ${(trips && trips.length) ? trips.map(tripCard).join('') : `<div class="empty" style="margin:20px 0 6px">
      <h4>No plans on paper yet</h4>
      <p>A trip is one document: the shortlist, the days, the map, the money. Start one and the journal does the math.</p>
    </div>`}
    <button class="btn-primary wide" data-newtrip style="margin:16px 0 6px">Start a trip</button>
    ${(up.length || past.length) ? '<div style="margin-top:26px"><hr class="rule"/></div>' : ''}
    ${up.length ? `<span class="kicker dark" style="display:block;padding-top:18px">Ticket stubs — upcoming</span>${stubBlock(up)}` : ''}
    ${past.length ? `<span class="kicker dark" style="display:block;padding-top:22px">The archive</span>${stubBlock(past)}` : ''}
    <div style="height:20px"></div>`;
  list.querySelector('[data-newtrip]').onclick = () => openTripSheet(null);
  list.querySelectorAll('[data-cancel]').forEach(btn => btn.onclick = async () => {
    if (!confirm('Cancel this reservation? Free up to 24h before.')) return;
    await sb.from('explorite_bookings').update({ status: 'cancelled' }).eq('id', btn.dataset.cancel);
    toast('Cancelled. The host was notified.');
    screenTrips();
  });
  bindCommon();
}

/* ---------- trip create / edit sheet ---------- */
function openTripSheet(t, opts) {
  opts = opts || {};
  const isEdit = !!t;
  const d0 = new Date(); d0.setDate(d0.getDate() + 14);
  const d1 = new Date(); d1.setDate(d1.getDate() + 17);
  const seed = {
    title: t ? t.title : '',
    city: t ? t.city : (opts.city || S.city),
    start: t ? t.start_date : isoDate(d0),
    end: t ? t.end_date : isoDate(d1),
    party: t ? t.party_size : 2,
    budget: t && t.budget_cents ? (t.budget_cents / 100) : '',
  };
  let city = seed.city, party = seed.party;
  const el = sheet(`
    <div class="sheet-head"><h3>${isEdit ? 'Edit trip' : 'Start a trip'}</h3><button class="sheet-close" data-x>Close</button></div>
    <span class="kicker">${isEdit ? 'Dates move. Plans survive.' : 'Name it, date it. The days rule themselves.'}</span>
    <div class="form-block"><label>Trip name</label><input id="tp-title" maxlength="60" placeholder="Kyoto with the crew" value="${esc(seed.title)}" /></div>
    <div class="form-block"><label>City desk</label>
      <div class="slotrow">${CITIES.map(c => `<button class="slotcell ${c === seed.city ? 'sel' : ''}" data-city="${c}">${c}</button>`).join('')}</div>
    </div>
    <div class="form-2col">
      <div class="form-block"><label>First day</label><input id="tp-start" type="date" value="${seed.start}" /></div>
      <div class="form-block"><label>Last day</label><input id="tp-end" type="date" value="${seed.end}" /></div>
    </div>
    <div class="form-2col">
      <div class="form-block"><label>Party</label>
        <div class="stepper"><button data-step="-1">−</button><span class="n" id="tp-party">${seed.party}</span><button data-step="1">+</button></div>
      </div>
      <div class="form-block"><label>Budget (total, $)</label><input id="tp-budget" type="number" min="0" step="10" placeholder="1200" value="${seed.budget}" /></div>
    </div>
    <div class="form-err" id="tp-err"></div>
    <button class="btn-primary wide" data-save>${isEdit ? 'Save changes' : 'Open the document'}</button>
    ${isEdit ? '<button class="btn-ghost" data-del style="width:100%;text-align:center;margin-top:8px;color:var(--accent);border-color:var(--accent)">Delete this trip</button>' : ''}
  `);
  el.querySelector('[data-x]').onclick = () => closeSheet();
  el.querySelectorAll('[data-city]').forEach(b => b.onclick = () => {
    city = b.dataset.city;
    el.querySelectorAll('[data-city]').forEach(x => x.classList.toggle('sel', x.dataset.city === city));
  });
  el.querySelectorAll('[data-step]').forEach(b => b.onclick = () => {
    party = Math.min(16, Math.max(1, party + Number(b.dataset.step)));
    el.querySelector('#tp-party').textContent = party;
  });
  if (isEdit) el.querySelector('[data-del]').onclick = async () => {
    if (!confirm('Delete this trip and everything in it?')) return;
    await sb.from('explorite_trips').delete().eq('id', t.id);
    closeSheet(true); toast('Torn out of the journal.'); nav('/trips');
  };
  el.querySelector('[data-save]').onclick = async (ev) => {
    const title = el.querySelector('#tp-title').value.trim();
    const start = el.querySelector('#tp-start').value;
    const end = el.querySelector('#tp-end').value;
    const budget = Math.round(Number(el.querySelector('#tp-budget').value || 0) * 100);
    const err = el.querySelector('#tp-err');
    if (!title) { err.textContent = 'Give it a name. Even "Kyoto, obviously."'; return; }
    if (!start || !end || end < start) { err.textContent = 'The last day cannot come before the first.'; return; }
    const span = Math.round((new Date(end + 'T12:00:00') - new Date(start + 'T12:00:00')) / 86400000) + 1;
    if (span > 14) { err.textContent = 'A fortnight max. Journals, not epics.'; return; }
    ev.currentTarget.disabled = true;
    const payload = { title, city, start_date: start, end_date: end, party_size: party, budget_cents: budget, cover_img: cityCover(city) };
    if (isEdit) {
      const { error } = await sb.from('explorite_trips').update(payload).eq('id', t.id);
      if (error) { err.textContent = 'Could not save. Try again.'; ev.currentTarget.disabled = false; return; }
      closeSheet(true); toast('Saved.'); screenTrip(t.id);
    } else {
      const { data: nt, error } = await sb.from('explorite_trips').insert({ ...payload, user_id: S.session.user.id }).select().single();
      if (error) { err.textContent = 'Could not create the trip.'; ev.currentTarget.disabled = false; return; }
      closeSheet(true);
      if (opts.onCreate) { await opts.onCreate(nt); }
      else { toast('The document is open.'); nav('/t/' + nt.id); }
    }
  };
}

/* ---------- trip document ---------- */
async function screenTrip(id) {
  if (!requireAuth('#/trips')) return;
  window.scrollTo(0, 0);
  $app.innerHTML = `<div class="section-pad" style="padding-top:60px"><div class="skel" style="height:180px"></div><div class="skel skel-row"></div><div class="skel skel-row"></div></div>` + tabbar('trips');
  const bundle = await loadTripBundle(id);
  if (!bundle) { nav('/trips'); return; }
  const { t, items, expenses, checks, bookings } = bundle;
  const N = tripDayCount(t);
  const dayNotes = t.day_notes || {};
  const normDay = (i) => (i.day_index != null && i.day_index < N ? i.day_index : null);
  const inDay = (d) => items.filter(i => normDay(i) === d);
  const shortlist = inDay(null);
  const existingExp = new Set(items.map(i => i.experience_id).filter(Boolean));
  const reload = () => screenTrip(id);

  const stopRow = (it, n, ink) => {
    const e = it.experience_id ? S.experiences.find(x => x.id === it.experience_id) : null;
    if (it.kind === 'note') return `<div class="note-row" data-item="${it.id}"><span class="note-mark">✎</span><p>${esc(it.title)}</p></div>`;
    return `<div class="stop-row" data-item="${it.id}">
      <span class="stop-num" style="--di:${ink}">${n}</span>
      ${e && e.hero_img ? `<img class="stop-thumb" src="${e.hero_img.replace('w=1600', 'w=300')}" alt=""/>` : ''}
      <div class="stop-main">
        <div class="stop-title">${it.start_time ? `<span class="stop-time">${esc(it.start_time)}</span>` : ''}${esc(it.title)}</div>
        <div class="stop-meta">${[e ? durFmt(e.duration_min) : '', it.cost_cents ? money(it.cost_cents) : '', e ? 'vetted page' : (it.lat != null ? 'pinned' : '')].filter(Boolean).join(' · ')}</div>
        ${it.note ? `<div class="stop-note">${esc(it.note)}</div>` : ''}
      </div>
      <div class="stop-ctl"><button data-up="${it.id}" aria-label="Move up">↑</button><button data-dn="${it.id}" aria-label="Move down">↓</button></div>
    </div>`;
  };
  const fixedRow = (b, e) => `<div class="fixed-row" data-go="/x/${e.slug}">
    <span class="fixed-stamp">✓</span>
    <div class="stop-main">
      <div class="stop-title"><span class="stop-time">${esc(b.slot)}</span>${esc(e.title)}</div>
      <div class="stop-meta">Booked · ${b.party} ${b.party > 1 ? 'people' : 'person'} · ${money(b.total_cents)} · fixed point of the day</div>
    </div>
  </div>`;
  const bookedOf = (d) => bookings
    .filter(b => dayIdxOf(t, b.on_date) === d)
    .map(b => ({ b, e: S.experiences.find(x => x.id === b.experience_id) }))
    .filter(x => x.e);

  const dayHtml = (d) => {
    const ink = dayInk(d);
    const fixed = bookedOf(d);
    const stops = inDay(d);
    const seq = [
      ...fixed.map(f => ({ geo: geoOf(f.e), html: fixedRow(f.b, f.e) })),
      ...stops.map((it, i) => ({ geo: it.kind === 'note' ? null : geoOf(it), html: stopRow(it, i + 1, ink) })),
    ];
    let rows = '', prevGeo = null;
    seq.forEach(s => {
      if (s.geo && prevGeo) { const w = walkLine(prevGeo, s.geo); if (w) rows += `<div class="walkline">↓ ${w}</div>`; }
      rows += s.html;
      if (s.geo) prevGeo = s.geo;
    });
    const subtotal = stops.reduce((a, i) => a + (i.cost_cents || 0), 0) + fixed.reduce((a, f) => a + (f.b.total_cents || 0), 0);
    const geoStops = stops.filter(i => i.kind !== 'note' && geoOf(i));
    const date = tripDayDate(t, d);
    return `<section class="dayblock">
      <div class="dayhead" style="--di:${ink}">
        <span class="day-dot"></span>
        <span class="day-n">Day ${d + 1}</span>
        <span class="day-date">${date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
        <span class="day-sub">${subtotal ? money(subtotal) : ''}</span>
      </div>
      <input class="day-intent" data-day="${d}" maxlength="120" placeholder="The shape of this day…" value="${esc(dayNotes[d] || '')}" />
      ${rows || '<div class="day-empty">Nothing filed yet. Pull from the shortlist or add a stop.</div>'}
      <div class="day-actions">
        <button class="btn-ghost sm" data-add="${d}">+ Add a stop</button>
        ${geoStops.length >= 3 ? `<button class="btn-ghost sm" data-opt="${d}">Optimize order</button>` : ''}
      </div>
    </section>`;
  };

  const plannedStops = items.reduce((a, i) => a + (i.cost_cents || 0), 0);
  const bookedSum = bookings.reduce((a, b) => a + (b.total_cents || 0), 0);
  const manual = expenses.reduce((a, x) => a + (x.amount_cents || 0), 0);
  const planned = plannedStops + bookedSum + manual;
  const over = t.budget_cents > 0 && planned > t.budget_cents;
  const pct = t.budget_cents > 0 ? Math.min(100, Math.round((planned / t.budget_cents) * 100)) : 0;
  const cover = t.cover_img || cityCover(t.city);

  $app.innerHTML = `
    <div class="trip-hero">
      ${cover ? `<img src="${cover}" alt=""/>` : ''}
      <button class="back-float" data-go="/trips">← Trips</button>
      <button class="edit-float" data-edittrip>Edit</button>
    </div>
    <div class="photo-credit"><span>${esc(t.city)}</span><span>${N} ${N > 1 ? 'days' : 'day'} on paper</span></div>
    <div class="detail-head">
      <span class="kicker dark">The plan · ${esc(t.city)} desk</span>
      <h1 class="display">${esc(t.title)}</h1>
      <p class="tagline">${dfmt(t.start_date, { weekday: 'short', month: 'short', day: 'numeric' })} – ${dfmt(t.end_date, { weekday: 'short', month: 'short', day: 'numeric' })} · party of ${t.party_size}</p>
    </div>
    <div class="trip-toolbar">
      <button class="btn-ghost sm" data-go="/tmap/${t.id}">The spread — map ↗</button>
      <button class="btn-ghost sm" data-share>Share press copy</button>
    </div>

    <div class="detail-section" style="padding-top:18px">
      <span class="kicker dark">The shortlist — not yet scheduled</span>
      <div class="sl-wrap">${shortlist.map((it, i) => stopRow(it, i + 1, dayInk(null))).join('') ||
        '<div class="day-empty" style="border:0;padding-left:0">Dog-ear pages from the journal or add your own finds. They wait here until they earn a day.</div>'}</div>
      <button class="btn-ghost sm" data-add="sl" style="margin-top:8px">+ Add an idea</button>
    </div>

    <div class="detail-section">
      <span class="kicker dark">The itinerary</span>
      ${Array.from({ length: N }, (_, d) => dayHtml(d)).join('')}
    </div>

    <div class="detail-section">
      <span class="kicker dark">The ledger</span>
      <div class="ledger-top">
        <div><div class="ledger-big">${money(planned)}</div><div class="kicker">planned so far</div></div>
        <button data-editbudget style="text-align:right"><div class="ledger-big ${over ? 'over' : ''}">${t.budget_cents ? money(t.budget_cents) : '—'}</div><div class="kicker">budget · tap to set</div></button>
      </div>
      ${t.budget_cents ? `<div class="ledger-bar"><div class="ledger-fill ${over ? 'over' : ''}" style="width:${pct}%"></div></div>` : ''}
      <div class="ledger-split kicker dark">${money(Math.round(planned / (t.party_size || 1)))} each · party of ${t.party_size}${over ? ' · over budget' : ''}</div>
      ${expenses.map(x => `<div class="exp-row"><span class="exp-cat">${esc(x.category)}</span><span class="exp-title">${esc(x.title)}</span><span class="exp-amt">${money(x.amount_cents)}</span><button class="exp-del" data-delexp="${x.id}">✕</button></div>`).join('')}
      <button class="btn-ghost sm" data-addexp style="margin-top:10px">+ Add an expense</button>
    </div>

    <div class="detail-section">
      <span class="kicker dark">Kit list</span>
      <div>${checks.map(c => `<div class="kit-row ${c.done ? 'done' : ''}"><input type="checkbox" data-check="${c.id}" ${c.done ? 'checked' : ''}/><span>${esc(c.label)}</span><button class="exp-del" data-delcheck="${c.id}">✕</button></div>`).join('')}</div>
      <div class="kit-add"><input id="kit-input" maxlength="80" placeholder="Add to the kit…"/><button class="btn-ghost sm" data-addkit>Add</button></div>
      ${checks.length ? '' : '<button class="btn-ghost sm" data-seedkit style="margin-top:8px">Start with the field kit</button>'}
    </div>
    <div style="height:30px"></div>
  ` + tabbar('trips');

  bindCommon();
  $app.querySelector('[data-edittrip]').onclick = () => openTripSheet(t);
  $app.querySelector('[data-editbudget]').onclick = () => openTripSheet(t);
  $app.querySelector('[data-share]').onclick = async () => {
    const link = shareTripLink(t);
    try { await navigator.clipboard.writeText(link); toast('Press copy link on the clipboard. Send it.'); }
    catch { prompt('Copy the link:', link); }
  };
  $app.querySelectorAll('.day-intent').forEach(inp => inp.onchange = async () => {
    const notes = Object.assign({}, t.day_notes || {});
    notes[inp.dataset.day] = inp.value.trim();
    await sb.from('explorite_trips').update({ day_notes: notes }).eq('id', t.id);
    t.day_notes = notes;
  });
  $app.querySelectorAll('[data-add]').forEach(b => b.onclick = () => {
    const d = b.dataset.add === 'sl' ? null : Number(b.dataset.add);
    openStopSheet(t, d, existingExp, reload);
  });
  $app.querySelectorAll('[data-opt]').forEach(b => b.onclick = async () => {
    const d = Number(b.dataset.opt);
    b.disabled = true;
    const anchor = bookedOf(d).map(f => geoOf(f.e)).find(Boolean) || null;
    await optimizeDay(inDay(d), anchor);
    toast('Reordered for the shortest walk.');
    reload();
  });
  $app.querySelectorAll('[data-item]').forEach(row => row.onclick = (ev) => {
    if (ev.target.closest('.stop-ctl')) return;
    const it = items.find(x => x.id === row.dataset.item);
    if (it) openItemSheet(t, it, N, reload);
  });
  const bump = async (id2, dir) => {
    const it = items.find(x => x.id === id2);
    if (!it) return;
    const bucket = inDay(normDay(it));
    const idx = bucket.findIndex(x => x.id === id2);
    const to = idx + dir;
    if (to < 0 || to >= bucket.length) return;
    const arr = bucket.slice();
    const [m] = arr.splice(idx, 1);
    arr.splice(to, 0, m);
    await Promise.all(arr.map((x, i) => sb.from('explorite_trip_items').update({ position: i }).eq('id', x.id)));
    reload();
  };
  $app.querySelectorAll('[data-up]').forEach(b => b.onclick = (ev) => { ev.stopPropagation(); bump(b.dataset.up, -1); });
  $app.querySelectorAll('[data-dn]').forEach(b => b.onclick = (ev) => { ev.stopPropagation(); bump(b.dataset.dn, 1); });
  $app.querySelector('[data-addexp]').onclick = () => openExpenseSheet(t, reload);
  $app.querySelectorAll('[data-delexp]').forEach(b => b.onclick = async () => {
    await sb.from('explorite_trip_expenses').delete().eq('id', b.dataset.delexp); reload();
  });
  $app.querySelectorAll('[data-check]').forEach(c => c.onchange = async () => {
    await sb.from('explorite_trip_checklist').update({ done: c.checked }).eq('id', c.dataset.check);
    c.closest('.kit-row').classList.toggle('done', c.checked);
  });
  $app.querySelectorAll('[data-delcheck]').forEach(b => b.onclick = async () => {
    await sb.from('explorite_trip_checklist').delete().eq('id', b.dataset.delcheck); reload();
  });
  $app.querySelector('[data-addkit]').onclick = async () => {
    const v = $app.querySelector('#kit-input').value.trim();
    if (!v) return;
    await sb.from('explorite_trip_checklist').insert({ trip_id: t.id, label: v, position: Math.floor(Date.now() / 1000) });
    reload();
  };
  const seedBtn = $app.querySelector('[data-seedkit]');
  if (seedBtn) seedBtn.onclick = async () => {
    await sb.from('explorite_trip_checklist').insert(KIT_SEED.map((label, i) => ({ trip_id: t.id, label, position: i })));
    toast('The field kit is in.');
    reload();
  };
}

async function optimizeDay(stops, anchor) {
  const real = stops.filter(s => s.kind !== 'note');
  const notes = stops.filter(s => s.kind === 'note');
  const geo = real.filter(s => geoOf(s));
  const rest = real.filter(s => !geoOf(s));
  if (geo.length < 2) return;
  let cur = anchor || geoOf(geo[0]);
  const pool = geo.slice(); const ordered = [];
  while (pool.length) {
    let bi = 0, bd = Infinity;
    pool.forEach((p, i) => { const d = havKm(cur, geoOf(p)); if (d < bd) { bd = d; bi = i; } });
    const pick = pool.splice(bi, 1)[0];
    ordered.push(pick); cur = geoOf(pick);
  }
  const final = [...ordered, ...rest, ...notes];
  await Promise.all(final.map((x, i) => sb.from('explorite_trip_items').update({ position: i }).eq('id', x.id)));
}

/* ---------- add stop sheet ---------- */
function openStopSheet(t, dayIndex, existingExp, onDone) {
  let mode = 'journal';
  let pickedGeo = null;
  const el = sheet(`
    <div class="sheet-head"><h3>Add to ${dayIndex == null ? 'the shortlist' : 'Day ' + (dayIndex + 1)}</h3><button class="sheet-close" data-x>Close</button></div>
    <div class="seg">
      <button class="seg-btn active" data-mode="journal">The journal</button>
      <button class="seg-btn" data-mode="place">Your own stop</button>
      <button class="seg-btn" data-mode="note">A note</button>
    </div>
    <div id="stop-body" style="max-height:52dvh;overflow-y:auto"></div>
  `);
  el.querySelector('[data-x]').onclick = () => closeSheet();
  const body = el.querySelector('#stop-body');

  const insertItem = async (payload) => {
    const { error } = await sb.from('explorite_trip_items').insert({
      trip_id: t.id, day_index: dayIndex, position: Math.floor(Date.now() / 1000), ...payload,
    });
    if (error) { toast('Could not file it. Try again.'); return false; }
    return true;
  };

  const paint = () => {
    el.querySelectorAll('.seg-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
    if (mode === 'journal') {
      const pool = S.experiences.filter(e => e.city === t.city)
        .sort((a, b2) => (S.saves.has(b2.id) ? 1 : 0) - (S.saves.has(a.id) ? 1 : 0));
      body.innerHTML = `<span class="kicker">Vetted pages from the ${esc(t.city)} desk. Dog-eared first.</span>` +
        pool.map(e => `<button class="pick-row" data-exp="${e.id}">
          <img src="${e.hero_img.replace('w=1600', 'w=300')}" alt=""/>
          <div><h5>${esc(e.title)}${S.saves.has(e.id) ? ' <span style="color:var(--accent)">♥</span>' : ''}</h5>
          <div class="kicker">${money(e.price_cents)} · ${durFmt(e.duration_min)}${existingExp.has(e.id) ? ' · already filed' : ''}</div></div>
        </button>`).join('');
      body.querySelectorAll('[data-exp]').forEach(b => b.onclick = async () => {
        const e = S.experiences.find(x => x.id === b.dataset.exp);
        b.disabled = true;
        const ok = await insertItem({ kind: 'experience', experience_id: e.id, title: e.title, lat: e.lat, lng: e.lng, cost_cents: e.price_cents });
        if (ok) { closeSheet(true); toast('Filed. It is on the map already.'); onDone(); }
      });
    } else if (mode === 'place') {
      body.innerHTML = `
        <div class="form-block"><label>What is it</label><input id="st-title" maxlength="80" placeholder="Kissa coffee counter" /></div>
        <div class="form-block"><label>Find it on the map (optional)</label>
          <div class="kit-add" style="margin-top:2px"><input id="geo-q" placeholder="Search near ${esc(t.city)}…"/><button class="btn-ghost sm" data-geosearch>Find</button></div>
          <div id="geo-results"></div><div id="geo-picked" class="geo-picked"></div>
        </div>
        <div class="form-2col">
          <div class="form-block"><label>Cost ($, optional)</label><input id="st-cost" type="number" min="0" step="1" placeholder="0" /></div>
          <div class="form-block"><label>Time (optional)</label><input id="st-time" type="time" /></div>
        </div>
        <div class="form-block"><label>Note (optional)</label><input id="st-note" maxlength="140" placeholder="Cash only. Order the pudding." /></div>
        <button class="btn-primary wide" data-addplace>Add the stop</button>`;
      body.querySelector('[data-geosearch]').onclick = async (ev) => {
        const q = body.querySelector('#geo-q').value.trim();
        if (!q) return;
        const findBtn = ev.currentTarget;
        findBtn.disabled = true;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=5&accept-language=en&q=${encodeURIComponent(q + ', ' + t.city)}`);
          const found = await res.json();
          body.querySelector('#geo-results').innerHTML = (found || []).map((r, i) =>
            `<button class="geo-result" data-geo="${i}">${esc(r.display_name.split(',').slice(0, 3).join(','))}</button>`).join('') || '<div class="kicker" style="padding:8px 0">Nothing found. It can live without a pin.</div>';
          body.querySelectorAll('[data-geo]').forEach(bx => bx.onclick = () => {
            const r = found[Number(bx.dataset.geo)];
            pickedGeo = { lat: Number(r.lat), lng: Number(r.lon), name: r.display_name.split(',')[0] };
            body.querySelector('#geo-picked').textContent = '📍 pinned: ' + pickedGeo.name;
            body.querySelector('#geo-results').innerHTML = '';
          });
        } catch { toast('Map search is napping. Add it without a pin.'); }
        findBtn.disabled = false;
      };
      body.querySelector('[data-addplace]').onclick = async (ev) => {
        const title = body.querySelector('#st-title').value.trim();
        if (!title) { toast('Name the stop first.'); return; }
        ev.currentTarget.disabled = true;
        const ok = await insertItem({
          kind: 'place', title,
          note: body.querySelector('#st-note').value.trim() || null,
          cost_cents: Math.round(Number(body.querySelector('#st-cost').value || 0) * 100),
          start_time: body.querySelector('#st-time').value || null,
          lat: pickedGeo ? pickedGeo.lat : null, lng: pickedGeo ? pickedGeo.lng : null,
        });
        if (ok) { closeSheet(true); toast(pickedGeo ? 'Added and pinned.' : 'Added.'); onDone(); }
      };
    } else {
      body.innerHTML = `
        <div class="form-block"><label>The note</label><textarea id="st-notebody" rows="3" maxlength="240" placeholder="Late checkout is noon. Taxis scarce after the fireworks."></textarea></div>
        <button class="btn-primary wide" data-addnote>Pin the note</button>`;
      body.querySelector('[data-addnote]').onclick = async (ev) => {
        const v = body.querySelector('#st-notebody').value.trim();
        if (!v) return;
        ev.currentTarget.disabled = true;
        const ok = await insertItem({ kind: 'note', title: v });
        if (ok) { closeSheet(true); toast('Noted.'); onDone(); }
      };
    }
  };
  el.querySelectorAll('.seg-btn').forEach(b => b.onclick = () => { mode = b.dataset.mode; paint(); });
  paint();
}

/* ---------- item edit sheet ---------- */
function openItemSheet(t, it, N, onDone) {
  const e = it.experience_id ? S.experiences.find(x => x.id === it.experience_id) : null;
  const isNote = it.kind === 'note';
  const el = sheet(`
    <div class="sheet-head"><h3>${isNote ? 'The note' : 'The stop'}</h3><button class="sheet-close" data-x>Close</button></div>
    <span class="kicker">${esc(it.title.length > 60 ? it.title.slice(0, 60) + '…' : it.title)}</span>
    ${isNote ? `<div class="form-block"><label>Note</label><textarea id="it-title" rows="3" maxlength="240">${esc(it.title)}</textarea></div>` : `
    <div class="form-2col">
      <div class="form-block"><label>Time</label><input id="it-time" type="time" value="${esc(it.start_time || '')}" /></div>
      <div class="form-block"><label>Cost ($)</label><input id="it-cost" type="number" min="0" step="1" value="${it.cost_cents ? it.cost_cents / 100 : ''}" /></div>
    </div>
    <div class="form-block"><label>Note</label><input id="it-note" maxlength="140" value="${esc(it.note || '')}" placeholder="Bring cash. Ask for Paola." /></div>`}
    <div class="form-block"><label>Where it lives</label>
      <select id="it-day">
        <option value="" ${it.day_index == null ? 'selected' : ''}>The shortlist</option>
        ${Array.from({ length: N }, (_, d) => `<option value="${d}" ${it.day_index === d ? 'selected' : ''}>Day ${d + 1} — ${tripDayDate(t, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</option>`).join('')}
      </select>
    </div>
    <button class="btn-primary wide" data-saveit>Save</button>
    <div style="display:flex;gap:8px;justify-content:center">
      ${e ? `<button class="btn-ghost" data-viewpage>View the page</button><button class="btn-ghost" data-crew>Rally the crew</button>` : ''}
      <button class="btn-ghost" data-rm style="color:var(--accent);border-color:var(--accent)">Remove</button>
    </div>
  `);
  el.querySelector('[data-x]').onclick = () => closeSheet();
  if (e) {
    el.querySelector('[data-viewpage]').onclick = () => { closeSheet(true); nav('/x/' + e.slug); };
    el.querySelector('[data-crew]').onclick = () => { closeSheet(true); openPlanSheet(e); };
  }
  el.querySelector('[data-rm]').onclick = async () => {
    await sb.from('explorite_trip_items').delete().eq('id', it.id);
    closeSheet(true); toast('Struck from the plan.'); onDone();
  };
  el.querySelector('[data-saveit]').onclick = async (ev) => {
    ev.currentTarget.disabled = true;
    const dv = el.querySelector('#it-day').value;
    const patch = { day_index: dv === '' ? null : Number(dv) };
    if (isNote) {
      const v = el.querySelector('#it-title').value.trim();
      if (v) patch.title = v;
    } else {
      patch.start_time = el.querySelector('#it-time').value || null;
      patch.cost_cents = Math.round(Number(el.querySelector('#it-cost').value || 0) * 100);
      patch.note = el.querySelector('#it-note').value.trim() || null;
    }
    if (patch.day_index !== it.day_index) patch.position = Math.floor(Date.now() / 1000);
    await sb.from('explorite_trip_items').update(patch).eq('id', it.id);
    closeSheet(true); onDone();
  };
}

/* ---------- expense sheet ---------- */
function openExpenseSheet(t, onDone) {
  let cat = 'Food';
  const el = sheet(`
    <div class="sheet-head"><h3>Ledger entry</h3><button class="sheet-close" data-x>Close</button></div>
    <span class="kicker">Stops and bookings count themselves. This is for the rest — flights, lodging, gear.</span>
    <div class="form-block"><label>What</label><input id="ex-title" maxlength="60" placeholder="Flights, both of us" /></div>
    <div class="form-block"><label>Category</label>
      <div class="slotrow">${EXP_CATS.map(c => `<button class="slotcell ${c === cat ? 'sel' : ''}" data-cat="${c}">${c}</button>`).join('')}</div>
    </div>
    <div class="form-block"><label>Amount ($)</label><input id="ex-amt" type="number" min="0" step="1" placeholder="480" /></div>
    <div class="form-err" id="ex-err"></div>
    <button class="btn-primary wide" data-saveex>Enter it</button>
  `);
  el.querySelector('[data-x]').onclick = () => closeSheet();
  el.querySelectorAll('[data-cat]').forEach(b => b.onclick = () => {
    cat = b.dataset.cat;
    el.querySelectorAll('[data-cat]').forEach(x => x.classList.toggle('sel', x.dataset.cat === cat));
  });
  el.querySelector('[data-saveex]').onclick = async (ev) => {
    const title = el.querySelector('#ex-title').value.trim();
    const amt = Math.round(Number(el.querySelector('#ex-amt').value || 0) * 100);
    if (!title || !amt) { el.querySelector('#ex-err').textContent = 'A name and a number. The ledger is strict.'; return; }
    ev.currentTarget.disabled = true;
    await sb.from('explorite_trip_expenses').insert({ trip_id: t.id, title, category: cat, amount_cents: amt });
    closeSheet(true); onDone();
  };
}

/* ---------- add-to-trip from an experience page ---------- */
async function openAddToTripSheet(e) {
  const { data: trips } = await sb.from('explorite_trips').select('*').order('start_date', { ascending: true });
  if (!trips || !trips.length) {
    openTripSheet(null, {
      city: e.city,
      onCreate: async (nt) => {
        await addExpToTrip(nt, null, e);
        toast('Trip started — the page is on its shortlist.');
        nav('/t/' + nt.id);
      },
    });
    return;
  }
  let selTrip = trips.find(x => x.city === e.city) || trips[0];
  let selDay = null;
  const el = sheet(`
    <div class="sheet-head"><h3>File it into a trip</h3><button class="sheet-close" data-x>Close</button></div>
    <span class="kicker">${esc(e.title)} — ${esc(e.city)}</span>
    <label class="kicker dark lbl-gap">Which trip</label>
    <div id="att-trips">${trips.map(x => `
      <button class="vote-slot" data-trip="${x.id}" style="width:100%">
        <span><span class="when">${esc(x.title)}</span></span>
        <span class="kicker">${esc(x.city)}${x.city !== e.city ? ' · other city' : ''}</span>
      </button>`).join('')}</div>
    <label class="kicker dark lbl-gap">Which day</label>
    <div class="slotrow" id="att-days"></div>
    <div class="form-err" id="att-err"></div>
    <button class="btn-primary wide" data-file style="margin-top:10px">File it</button>
  `);
  el.querySelector('[data-x]').onclick = () => closeSheet();
  const paintTrips = () => el.querySelectorAll('[data-trip]').forEach(b => {
    b.style.borderColor = b.dataset.trip === selTrip.id ? 'var(--ink)' : '';
    b.style.borderWidth = b.dataset.trip === selTrip.id ? '1.5px' : '';
  });
  const paintDays = () => {
    const N = tripDayCount(selTrip);
    el.querySelector('#att-days').innerHTML = `<button class="slotcell ${selDay == null ? 'sel' : ''}" data-day="">Shortlist</button>` +
      Array.from({ length: N }, (_, d) => `<button class="slotcell ${selDay === d ? 'sel' : ''}" data-day="${d}">D${d + 1}</button>`).join('');
    el.querySelectorAll('[data-day]').forEach(b => b.onclick = () => {
      selDay = b.dataset.day === '' ? null : Number(b.dataset.day);
      paintDays();
    });
  };
  el.querySelectorAll('[data-trip]').forEach(b => b.onclick = () => {
    selTrip = trips.find(x => x.id === b.dataset.trip);
    selDay = null;
    paintTrips(); paintDays();
  });
  paintTrips(); paintDays();
  el.querySelector('[data-file]').onclick = async (ev) => {
    ev.currentTarget.disabled = true;
    await addExpToTrip(selTrip, selDay, e);
    closeSheet(true);
    toast(`Filed into ${selTrip.title}.`);
  };
}
async function addExpToTrip(t, dayIndex, e) {
  await sb.from('explorite_trip_items').insert({
    trip_id: t.id, day_index: dayIndex, kind: 'experience', experience_id: e.id,
    title: e.title, lat: e.lat, lng: e.lng, cost_cents: e.price_cents,
    position: Math.floor(Date.now() / 1000),
  });
}

/* ---------- the spread (map view) ---------- */
function drawTripMap(elId, pts, fallbackCity, filter) {
  const map = L.map(elId, { zoomControl: false, attributionControl: true });
  L.tileLayer('https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap © CARTO', maxZoom: 19,
  }).addTo(map);
  let layer = null;
  const draw = (f) => {
    if (layer) layer.remove();
    layer = L.layerGroup().addTo(map);
    const sel = pts.filter(p => f === 'all' || (f === 'sl' ? p.day == null : p.day === Number(f)));
    const byDay = {};
    sel.forEach(p => { const k = p.day == null ? 'sl' : String(p.day); (byDay[k] = byDay[k] || []).push(p); });
    Object.keys(byDay).forEach(k => {
      const arr = byDay[k];
      const ink = k === 'sl' ? '#8C8471' : dayInk(Number(k));
      arr.forEach((p, idx) => {
        L.marker([p.lat, p.lng], {
          icon: L.divIcon({ className: 'pin-wrap', html: `<div class="pin" style="--di:${ink}">${idx + 1}</div>`, iconSize: [26, 26], iconAnchor: [13, 13] }),
        }).addTo(layer).bindPopup(`<b>${esc(p.title)}</b><br>${k === 'sl' ? 'Shortlist' : 'Day ' + (Number(k) + 1)}${p.fixed ? ' · booked' : ''}`);
      });
      if (k !== 'sl' && arr.length > 1) {
        L.polyline(arr.map(p => [p.lat, p.lng]), { color: ink, weight: 2, dashArray: '5 6', opacity: 0.85 }).addTo(layer);
      }
    });
    if (sel.length) map.fitBounds(L.latLngBounds(sel.map(p => [p.lat, p.lng])).pad(0.25));
    else map.setView(CITY_FALLBACK[fallbackCity] || CITY_FALLBACK['Florence'], 12);
  };
  draw(filter || 'all');
  return draw;
}

async function screenTripMap(id) {
  if (!requireAuth('#/trips')) return;
  window.scrollTo(0, 0);
  const bundle = await loadTripBundle(id);
  if (!bundle) { nav('/trips'); return; }
  if (!window.L) { toast('The map is still loading — try again in a second.'); nav('/t/' + id); return; }
  const { t, items, bookings } = bundle;
  const N = tripDayCount(t);
  $app.innerHTML = `
    <div class="map-head">
      <button class="btn-ghost sm" data-go="/t/${t.id}">← ${esc(t.title.length > 22 ? t.title.slice(0, 22) + '…' : t.title)}</button>
      <span class="kicker">The spread</span>
    </div>
    <div class="map-chips" id="map-chips">
      <button class="map-chip active" data-day="all">All</button>
      <button class="map-chip" data-day="sl">Shortlist</button>
      ${Array.from({ length: N }, (_, d) => `<button class="map-chip" data-day="${d}" style="--di:${dayInk(d)}">D${d + 1}</button>`).join('')}
    </div>
    <div id="tripmap"></div>`;
  bindCommon();
  const pts = [];
  bookings.forEach(b => {
    const e = S.experiences.find(x => x.id === b.experience_id);
    if (e && e.lat != null) pts.push({ day: dayIdxOf(t, b.on_date), lat: e.lat, lng: e.lng, title: e.title, fixed: true });
  });
  items.forEach(i => {
    if (i.kind !== 'note' && i.lat != null) pts.push({ day: (i.day_index != null && i.day_index < N) ? i.day_index : null, lat: i.lat, lng: i.lng, title: i.title });
  });
  const draw = drawTripMap('tripmap', pts, t.city, 'all');
  $app.querySelectorAll('.map-chip').forEach(c => c.onclick = () => {
    $app.querySelectorAll('.map-chip').forEach(x => x.classList.toggle('active', x === c));
    draw(c.dataset.day);
  });
}

/* ---------- press copy (shared read-only view, no account) ---------- */
async function screenTripShare(token) {
  window.scrollTo(0, 0);
  $app.innerHTML = `<div class="section-pad" style="padding-top:60px"><div class="skel" style="height:180px"></div><div class="skel skel-row"></div></div>`;
  const { data } = await sb.rpc('explorite_get_trip', { p_token: token });
  if (!data || !data.trip) {
    $app.innerHTML = `<div class="empty" style="margin-top:100px"><h4>This press copy expired</h4>
      <p>The plan was closed or the link is wrong. Ask your friend for a fresh one.</p>
      <button class="btn-primary" data-go="/">Open the journal</button></div>`;
    bindCommon();
    return;
  }
  const t = data.trip;
  const items = data.items || [];
  const N = tripDayCount(t);
  const dayNotes = t.day_notes || {};
  const inDay = (d) => items.filter(i => ((i.day_index != null && i.day_index < N) ? i.day_index : null) === d);
  const row = (it, n, ink) => {
    if (it.kind === 'note') return `<div class="note-row"><span class="note-mark">✎</span><p>${esc(it.title)}</p></div>`;
    return `<div class="stop-row" style="cursor:default">
      <span class="stop-num" style="--di:${ink}">${n}</span>
      ${it.hero_img ? `<img class="stop-thumb" src="${it.hero_img.replace('w=1600', 'w=300')}" alt=""/>` : ''}
      <div class="stop-main">
        <div class="stop-title">${it.start_time ? `<span class="stop-time">${esc(it.start_time)}</span>` : ''}${esc(it.title)}</div>
        <div class="stop-meta">${[it.duration_min ? durFmt(it.duration_min) : '', it.cost_cents ? money(it.cost_cents) : '', it.meeting_point ? 'meet: ' + it.meeting_point : ''].filter(Boolean).join(' · ')}</div>
        ${it.note ? `<div class="stop-note">${esc(it.note)}</div>` : ''}
      </div>
    </div>`;
  };
  const dayHtml = (d) => {
    const ink = dayInk(d);
    const stops = inDay(d);
    let rows = '', prevGeo = null;
    stops.forEach((it, i) => {
      const g = it.kind !== 'note' ? geoOf(it) : null;
      if (g && prevGeo) { const w = walkLine(prevGeo, g); if (w) rows += `<div class="walkline">↓ ${w}</div>`; }
      rows += row(it, i + 1, ink);
      if (g) prevGeo = g;
    });
    const date = tripDayDate(t, d);
    return `<section class="dayblock">
      <div class="dayhead" style="--di:${ink}">
        <span class="day-dot"></span><span class="day-n">Day ${d + 1}</span>
        <span class="day-date">${date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
      </div>
      ${dayNotes[d] ? `<div class="day-intent" style="border:0">${esc(dayNotes[d])}</div>` : ''}
      ${rows || '<div class="day-empty">A free day. The best kind.</div>'}
    </section>`;
  };
  const shortlist = inDay(null);
  const geoPts = items.filter(i => i.kind !== 'note' && i.lat != null);
  $app.innerHTML = `
    <div class="trip-hero" style="height:170px">
      ${t.cover_img ? `<img src="${t.cover_img}" alt=""/>` : ''}
    </div>
    <div class="photo-credit"><span>${esc(t.city)}</span><span>Press copy — read only</span></div>
    <div class="detail-head">
      <span class="kicker dark">A field plan, shared with you</span>
      <h1 class="display">${esc(t.title)}</h1>
      <p class="tagline">${dfmt(t.start_date, { weekday: 'short', month: 'short', day: 'numeric' })} – ${dfmt(t.end_date, { weekday: 'short', month: 'short', day: 'numeric' })} · party of ${t.party_size}</p>
    </div>
    ${(geoPts.length && window.L) ? '<div id="sharemap"></div>' : ''}
    ${shortlist.length ? `<div class="detail-section" style="padding-top:16px">
      <span class="kicker dark">The shortlist</span>
      ${shortlist.map((it, i) => row(it, i + 1, dayInk(null))).join('')}
    </div>` : ''}
    <div class="detail-section">
      <span class="kicker dark">The itinerary</span>
      ${Array.from({ length: N }, (_, d) => dayHtml(d)).join('')}
    </div>
    <div class="empty" style="margin-top:30px">
      <h4>Made in the field journal</h4>
      <p>Every stop with a number was vetted by a person who went. Plans, crew votes and pages live in Explorite.</p>
      <button class="btn-primary" data-go="/">Open Explorite</button>
    </div>
    <div style="height:40px"></div>`;
  bindCommon();
  if (geoPts.length && window.L) {
    const pts = geoPts.map(i => ({ day: (i.day_index != null && i.day_index < N) ? i.day_index : null, lat: i.lat, lng: i.lng, title: i.title }));
    drawTripMap('sharemap', pts, t.city, 'all');
  }
}

/* ---------- saved ---------- */
async function screenSaved() {
  if (!requireAuth('#/saved')) return;
  window.scrollTo(0, 0);
  await loadSaves();
  const items = S.experiences.filter(e => S.saves.has(e.id));
  $app.innerHTML = `
    <div class="page-head"><span class="kicker">Dog-eared pages</span><h1 class="display">Saved</h1><hr class="rule dark"/></div>
    ${items.length ? `<div class="saved-grid">${items.map(e => `
      <button class="saved-card" data-go="/x/${e.slug}">
        <img src="${e.hero_img.replace('w=1600', 'w=500')}" alt="" />
        <h4>${esc(e.title)}</h4>
        <div class="m">${esc(e.city)} · ${money(e.price_cents)}</div>
      </button>`).join('')}</div>`
    : `<div class="empty"><h4>No dog-ears yet</h4><p>Tap the ♡ on any page to keep it here for the moment you land.</p><button class="btn-primary" data-go="/">Browse the journal</button></div>`}
  ` + tabbar('saved');
  bindCommon();
}

/* ---------- messaging ---------- */
async function openThread(e) {
  if (!requireAuth(`#/x/${e.slug}`)) return;
  let { data: t } = await sb.from('explorite_threads').select('*').eq('experience_id', e.id).eq('user_id', S.session.user.id).maybeSingle();
  if (!t) {
    const res = await sb.from('explorite_threads').insert({ user_id: S.session.user.id, experience_id: e.id }).select().single();
    t = res.data;
  }
  if (t) nav('/chat/' + t.id);
}

async function screenInbox() {
  if (!requireAuth('#/inbox')) return;
  window.scrollTo(0, 0);
  $app.innerHTML = `
    <div class="page-head"><span class="kicker">Correspondence</span><h1 class="display">Inbox</h1><hr class="rule dark"/></div>
    <div id="inbox-list"><div class="skel skel-row"></div></div>
  ` + tabbar('inbox');
  bindCommon();
  const { data: threads } = await sb.from('explorite_threads').select('*, explorite_messages(body, sender, created_at)').order('created_at', { ascending: false });
  const list = document.getElementById('inbox-list');
  if (!list) return;
  if (!threads || !threads.length) {
    list.innerHTML = `<div class="empty"><h4>No letters yet</h4><p>Every host answers directly. Ask the thing you'd normally spend an hour googling.</p><button class="btn-primary" data-go="/">Find a host</button></div>`;
    bindCommon();
    return;
  }
  list.innerHTML = threads.map(t => {
    const e = S.experiences.find(x => x.id === t.experience_id) || {};
    const msgs = (t.explorite_messages || []).sort((a, b) => a.created_at.localeCompare(b.created_at));
    const last = msgs[msgs.length - 1];
    return `<button class="thread-row" data-go="/chat/${t.id}">
      <img src="${(e.hero_img || '').replace('w=1600', 'w=200')}" alt="" />
      <span><span class="who">${esc(e.host_name || 'Host')}</span><br/><span class="last">${esc(last ? (last.sender === 'user' ? 'You: ' : '') + last.body : 'Say hello')}</span></span>
      <time>${last ? ago(last.created_at) : ''}</time>
    </button>`;
  }).join('');
  bindCommon();
}

async function screenChat(threadId) {
  if (!requireAuth('#/inbox')) return;
  const { data: t } = await sb.from('explorite_threads').select('*').eq('id', threadId).maybeSingle();
  if (!t) { nav('/inbox'); return; }
  const e = S.experiences.find(x => x.id === t.experience_id) || { host_name: 'Host', title: '' };

  $app.innerHTML = `<div class="chat-screen">
    <div class="chat-head">
      <button class="back" data-back>←</button>
      <div><div class="who">${esc(e.host_name)}</div><div class="sub">${esc(e.title)}</div></div>
    </div>
    <div class="chat-body" id="chat-body"></div>
    <div class="chat-input">
      <input id="chat-in" placeholder="Ask ${esc(firstName(e.host_name))} anything…" maxlength="2000" />
      <button id="chat-send">Send</button>
    </div>
  </div>`;
  $app.querySelector('[data-back]').onclick = () => nav('/inbox');

  const body = document.getElementById('chat-body');
  const paintMsgs = (msgs) => {
    body.innerHTML = msgs.map(m => `<div class="bubble ${m.sender}">${esc(m.body)}<time>${new Date(m.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</time></div>`).join('')
      || `<div class="bubble host">Ciao — ${esc(firstName(e.host_name))} here. Ask me anything about the experience, the neighborhood, or what to bring.</div>`;
    body.scrollTop = body.scrollHeight;
  };
  const load = async () => {
    const { data: msgs } = await sb.from('explorite_messages').select('*').eq('thread_id', threadId).order('created_at');
    paintMsgs(msgs || []);
    return msgs || [];
  };
  let current = await load();

  // realtime host replies
  if (S.chatChannel) { sb.removeChannel(S.chatChannel); S.chatChannel = null; }
  S.chatChannel = sb.channel('chat-' + threadId)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'explorite_messages', filter: `thread_id=eq.${threadId}` }, (payload) => {
      if (payload.new.sender === 'host') {
        document.querySelector('.typing')?.remove();
        current.push(payload.new);
        paintMsgs(current);
      }
    }).subscribe();

  const send = async () => {
    const input = document.getElementById('chat-in');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    current.push({ sender: 'user', body: text, created_at: new Date().toISOString() });
    paintMsgs(current);
    const typing = document.createElement('div');
    typing.className = 'typing';
    typing.textContent = firstName(e.host_name) + ' is writing';
    body.appendChild(typing); body.scrollTop = body.scrollHeight;
    const { error } = await sb.from('explorite_messages').insert({ thread_id: threadId, sender: 'user', body: text });
    if (error) { toast('Message failed'); typing.remove(); return; }
    // fallback if realtime misses: refetch after a beat
    setTimeout(async () => {
      if (document.querySelector('.typing')) { document.querySelector('.typing')?.remove(); current = await load(); }
    }, 2600);
  };
  document.getElementById('chat-send').onclick = send;
  document.getElementById('chat-in').onkeydown = (ev) => { if (ev.key === 'Enter') send(); };
}

/* ---------- auth ---------- */
function screenAuth() {
  window.scrollTo(0, 0);
  let mode = 'signup';
  const paint = () => {
    $app.innerHTML = `
      <div class="page-head">
        <span class="kicker">${mode === 'signup' ? 'Join the masthead' : 'Welcome back'}</span>
        <h1 class="display">${mode === 'signup' ? 'Get a byline' : 'Sign in'}</h1>
        <hr class="rule dark"/>
      </div>
      <div class="section-pad">
        <p style="padding-top:14px;color:var(--ink-soft);font-size:14.5px;line-height:1.5">
          ${mode === 'signup'
            ? 'Browsing is free forever, no account needed. A byline lets you book, save pages, message hosts, and rally a crew.'
            : 'Back to your saved pages, tickets and plans.'}
        </p>
        <div class="form-block">
          ${mode === 'signup' ? `<label>Name</label><input id="au-name" maxlength="40" placeholder="What hosts should call you" autocomplete="name" />` : ''}
          <label>Email</label><input id="au-email" type="email" placeholder="you@somewhere.com" autocomplete="email" />
          <label>Password</label><input id="au-pass" type="password" placeholder="8+ characters" autocomplete="${mode === 'signup' ? 'new-password' : 'current-password'}" />
        </div>
        <div class="form-err" id="au-err"></div>
        <button class="btn-primary wide" id="au-go">${mode === 'signup' ? 'Create account' : 'Sign in'}</button>
        <p style="text-align:center;padding-top:6px"><button class="auth-flip" id="au-flip">${mode === 'signup' ? 'Already have a byline? Sign in' : 'New here? Create an account'}</button></p>
        <p style="text-align:center;padding-top:14px"><button class="auth-flip" data-go="/">← Keep browsing without one</button></p>
      </div>
    ` + tabbar('');
    bindCommon();
    document.getElementById('au-flip').onclick = () => { mode = mode === 'signup' ? 'login' : 'signup'; paint(); };
    document.getElementById('au-go').onclick = async (ev) => {
      const err = document.getElementById('au-err');
      const email = document.getElementById('au-email').value.trim();
      const pass = document.getElementById('au-pass').value;
      err.textContent = '';
      if (!email.includes('@') || pass.length < 8) { err.textContent = 'A real email and 8+ character password, please.'; return; }
      ev.currentTarget.disabled = true;
      try {
        if (mode === 'signup') {
          const name = (document.getElementById('au-name').value.trim() || 'Explorer');
          const { data, error } = await sb.auth.signUp({ email, password: pass });
          if (error) throw error;
          S.session = data.session;
          if (S.session) {
            await sb.from('explorite_profiles').insert({ id: S.session.user.id, display_name: name });
            await loadProfile();
          }
          toast('Byline secured. Welcome.');
        } else {
          const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
          if (error) throw error;
          S.session = data.session;
          await Promise.all([loadProfile(), loadSaves()]);
          toast('Welcome back, ' + firstName(myName()));
        }
        const ret = sstore.get('xp_return');
        sstore.del('xp_return');
        location.hash = ret || '#/';
      } catch (e2) {
        err.textContent = e2.message || 'That did not work. Try again.';
        ev.currentTarget.disabled = false;
      }
    };
  };
  paint();
}

/* ---------- profile ---------- */
async function screenProfile() {
  if (!requireAuth('#/profile')) return;
  window.scrollTo(0, 0);
  const [{ count: trips }, { count: plans }, { count: saves }] = await Promise.all([
    sb.from('explorite_bookings').select('*', { count: 'exact', head: true }),
    sb.from('explorite_plans').select('*', { count: 'exact', head: true }),
    sb.from('explorite_saves').select('*', { count: 'exact', head: true }),
  ]);
  $app.innerHTML = `
    <div class="page-head"><span class="kicker">The correspondent</span><h1 class="display">${esc(myName())}</h1><hr class="rule dark"/></div>
    <div class="factline" style="margin-top:20px">
      <div class="fact"><div class="v">${trips ?? 0}</div><div class="k">trips</div></div>
      <div class="fact"><div class="v">${plans ?? 0}</div><div class="k">plans</div></div>
      <div class="fact"><div class="v">${saves ?? 0}</div><div class="k">saved</div></div>
    </div>
    <div class="section-pad">
      <div class="form-block">
        <label>Display name</label>
        <input id="pf-name" value="${esc(myName())}" maxlength="40" />
      </div>
      <button class="btn-ghost" id="pf-save">Save name</button>
      <div style="height:26px"></div>
      <hr class="rule"/>
      <button class="btn-ghost" id="pf-out" style="margin-top:20px">Sign out</button>
      <p style="padding:22px 0 10px"><span class="kicker">Explorite v2 — a working field journal by Nate Tran.<br/>Built on the original research: interviews, affinity maps, two personas, one insight.</span></p>
    </div>
  ` + tabbar('');
  bindCommon();
  document.getElementById('pf-save').onclick = async () => {
    const name = document.getElementById('pf-name').value.trim() || 'Explorer';
    await sb.from('explorite_profiles').upsert({ id: S.session.user.id, display_name: name });
    await loadProfile();
    toast('Name updated');
  };
  document.getElementById('pf-out').onclick = async () => {
    await sb.auth.signOut();
    S.session = null; S.profile = null; S.saves = new Set();
    nav('/');
    toast('Signed out. Browsing stays free.');
  };
}

/* ============================================================
   RENDER
   ============================================================ */
function render() {
  const r = route();
  if (S.chatChannel && r.name !== 'chat') { sb.removeChannel(S.chatChannel); S.chatChannel = null; }
  switch (r.name) {
    case 'discover': screenDiscover(); break;
    case 'x': screenDetail(r.arg); break;
    case 'saved': screenSaved(); break;
    case 'plans': screenPlans(); break;
    case 'p': screenVote(r.arg); break;
    case 'trips': screenTrips(); break;
    case 't': screenTrip(r.arg); break;
    case 'tmap': screenTripMap(r.arg); break;
    case 'j': screenTripShare(r.arg); break;
    case 'inbox': screenInbox(); break;
    case 'chat': screenChat(r.arg); break;
    case 'auth': screenAuth(); break;
    case 'profile': screenProfile(); break;
    default: screenDiscover();
  }
}

/* ---------------- boot ---------------- */
(async function boot() {
  // splash (skip on vote links — friends should land instantly)
  if (!location.hash.startsWith('#/p/') && !location.hash.startsWith('#/j/')) {
    const sp = document.createElement('div');
    sp.className = 'splash';
    sp.innerHTML = `<div class="word"><span>Explo<em>rite</em></span></div><div class="sub">The field journal</div>`;
    document.body.appendChild(sp);
    setTimeout(() => sp.remove(), 2100);
  }
  const { data: { session } } = await sb.auth.getSession();
  S.session = session;
  sb.auth.onAuthStateChange((_ev, s2) => { S.session = s2; });
  if (session) await Promise.all([loadProfile(), loadSaves()]);
  render();
  loadCatalog();
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
