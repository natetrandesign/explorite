/* ============================================================
   EXPLORITE v2 — "Field Journal"
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
async function screenTrips() {
  if (!requireAuth('#/trips')) return;
  window.scrollTo(0, 0);
  $app.innerHTML = `
    <div class="page-head"><span class="kicker">Stubs and proof</span><h1 class="display">Trips</h1><hr class="rule dark"/></div>
    <div id="trips-list" class="section-pad"><div class="skel skel-row"></div></div>
  ` + tabbar('trips');
  bindCommon();
  const { data: bookings } = await sb.from('explorite_bookings').select('*').order('on_date', { ascending: true });
  const list = document.getElementById('trips-list');
  if (!list) return;
  if (!bookings || !bookings.length) {
    list.innerHTML = `<div class="empty" style="margin:26px 0">
      <h4>Nothing booked yet</h4>
      <p>The cost of a bad pick on a short trip is high. That's why every page in the journal got vetted first. Go pick one.</p>
      <button class="btn-primary" data-go="/">Open the journal</button>
    </div>`;
    bindCommon();
    return;
  }
  const today = isoDate(new Date());
  const up = bookings.filter(b => b.on_date >= today && b.status === 'confirmed');
  const past = bookings.filter(b => b.on_date < today || b.status !== 'confirmed');
  const block = (items) => items.map(b => {
    const e = S.experiences.find(x => x.id === b.experience_id) || { title: 'Experience', city: '', meeting_point: '' };
    return ticketHtml(e, b) + (b.status === 'confirmed' && b.on_date >= today
      ? `<div style="display:flex;gap:8px;margin:-2px 0 8px"><button class="btn-ghost" data-cancel="${b.id}" style="margin-top:6px">Cancel</button><button class="btn-ghost" data-go="/x/${e.slug}" style="margin-top:6px">View page</button></div>` : '');
  }).join('');
  list.innerHTML = `
    ${up.length ? `<span class="kicker dark" style="display:block;padding-top:18px">Upcoming</span>${block(up)}` : ''}
    ${past.length ? `<span class="kicker dark" style="display:block;padding-top:22px">The archive</span>${block(past)}` : ''}
    <div style="height:20px"></div>`;
  list.querySelectorAll('[data-cancel]').forEach(btn => btn.onclick = async () => {
    if (!confirm('Cancel this reservation? Free up to 24h before.')) return;
    await sb.from('explorite_bookings').update({ status: 'cancelled' }).eq('id', btn.dataset.cancel);
    toast('Cancelled. The host was notified.');
    screenTrips();
  });
  bindCommon();
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
  if (!location.hash.startsWith('#/p/')) {
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
