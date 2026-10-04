/* Explorite hi-fi prototype — the six frames from Nathan’s export. */
const KEY = "explorite-hifi-v2";
const G = "src/assets/graphics";

const svg = {
  back: '<svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><path d="M13.5 5.5 8 11l5.5 5.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  star: '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="m8 1.6 1.7 3.9 4.2.4-3.2 2.8.9 4.1L8 10.6 4.4 12.8l.9-4.1L2.1 5.9l4.2-.4L8 1.6z" fill="currentColor"/></svg>',
  send: '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M3 9h12M10 4.5 15 9l-5 4.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  pin: '<svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><path d="M11 20s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10z" fill="currentColor"/><circle cx="11" cy="10" r="2.2" fill="#f7f0e0"/></svg>',
  google: '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M9 7.6v2.9h4.1c-.2 1.1-1.4 3.2-4.1 3.2A4.7 4.7 0 1 1 9 4.3c1.3 0 2.2.6 2.7 1.1l1.9-1.8C12.4 2.4 10.8 1.7 9 1.7 5.2 1.7 2.1 4.8 2.1 8.6S5.2 15.5 9 15.5c4 0 6.6-2.8 6.6-6.7 0-.5 0-.8-.1-1.2H9z" fill="currentColor"/></svg>',
  facebook: '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M10.2 16V9.7h2.1l.3-2.4h-2.4V5.8c0-.7.2-1.2 1.2-1.2H12.7V2.5C12.4 2.4 11.6 2.3 10.7 2.3c-1.9 0-3.2 1.2-3.2 3.3v1.7H5.3v2.4h2.2V16h2.7z" fill="currentColor"/></svg>',
  apple: '<svg width="16" height="18" viewBox="0 0 16 18" aria-hidden="true"><path d="M12.7 9.4c0-2.2 1.8-3.2 1.9-3.3-1-1.5-2.6-1.7-3.2-1.7-1.3-.1-2.6.8-3.3.8s-1.7-.8-2.8-.7c-1.4.1-2.8.9-3.5 2.2-1.5 2.6-.4 6.5 1.1 8.6.7 1 1.6 2.2 2.7 2.1 1.1 0 1.5-.7 2.8-.7s1.6.7 2.8.7 1.9-1 2.6-2.1c.8-1.2 1.2-2.3 1.2-2.4-.1 0-2.3-.9-2.3-3.5zM10.8 3.2c.6-.7 1-1.7.9-2.7-.9 0-1.9.6-2.5 1.3-.6.6-1 1.6-.9 2.6 1 .1 1.9-.5 2.5-1.2z" fill="currentColor"/></svg>',
};

function defaultState() {
  return {
    user: null,
    following: false,
    passed: false,
    forgot: false,
    error: "",
    threads: {
      "sculpting-with-sabrina": [
        { from: "host", text: "The evening wheel is still open if you want it." },
        { from: "me", text: "I’ll take it. Should I bring my own tools?" },
        { from: "host", text: "No need. Clay is wedged and waiting." },
      ],
    },
  };
}

let state = load();

function load() {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return defaultState();
    return { ...defaultState(), ...JSON.parse(raw), threads: { ...defaultState().threads, ...(JSON.parse(raw).threads || {}) } };
  } catch {
    return defaultState();
  }
}

function save() {
  const { error, ...rest } = state;
  sessionStorage.setItem(KEY, JSON.stringify(rest));
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function parse() {
  const hash = location.hash.replace(/^#\/?/, "");
  const [head, id] = hash.split("/");
  if (!head) return { name: "splash" };
  if (head === "x" && id) return { name: "detail", slug: id };
  if (head === "m" && id) return { name: "thread", slug: id };
  const named = {
    welcome: { name: "welcome" },
    login: { name: "login" },
    discover: { name: "discover" },
  };
  return named[head] || { name: "splash" };
}

function go(hash) {
  state.error = "";
  if (location.hash !== hash) location.hash = hash;
  render();
}

const app = document.getElementById("app");
let rendering = false;
let painted = "";

function render() {
  if (rendering) return;
  rendering = true;
  try {
    const route = parse();
    document.title = titleFor(route);
    app.innerHTML = screen(route);
    const thread = app.querySelector(".thread");
    if (thread) thread.scrollTop = thread.scrollHeight;
    painted = location.hash;
  } finally {
    rendering = false;
  }
}

function titleFor(route) {
  const names = {
    splash: "Explorite",
    welcome: "Welcome · Explorite",
    login: "Sign in · Explorite",
    discover: "Discover Activities · Explorite",
    detail: "Night at the Museum · Explorite",
    thread: "Sculpting with Sabrina · Explorite",
  };
  return names[route.name] || "Explorite";
}

function screen(route) {
  switch (route.name) {
    case "welcome": return welcomeScreen();
    case "login": return loginScreen();
    case "discover": return discoverScreen();
    case "detail": return detailScreen(route.slug);
    case "thread": return threadScreen(route.slug);
    default: return splashScreen();
  }
}

function splashScreen() {
  return `<section class="screen splash">
    <img class="splash-field" src="${G}/splash-field.svg" alt="" />
    <img class="splash-curves" src="${G}/splash-linework.svg" alt="" />
    <p class="word">Explorite</p>
    <a class="splash-hit" href="#/welcome">Continue</a>
  </section>`;
}

function welcomeScreen() {
  return `<section class="screen welcome">
    <img class="welcome-hero" src="${G}/frame-2-hero.png" alt="Concert crowd with hands raised toward the stage" />
    <p class="type-wordmark-lg">Explorite</p>
    <div class="welcome-actions">
      <a class="btn btn-primary" href="#/discover">Get Started</a>
      <a class="btn btn-dark" href="#/login">Continue to sign in</a>
    </div>
  </section>`;
}

function loginScreen() {
  return `<section class="screen auth">
    <a class="icon-btn" href="#/welcome" aria-label="Back">${svg.back}</a>
    <p class="hello">Hello</p>
    <h1>Sign In</h1>
    <form class="form" data-auth="login" novalidate>
      <label class="field"><span>Username</span><input name="username" type="text" autocomplete="username" placeholder="Username" /></label>
      <label class="field"><span>Password</span><input name="password" type="password" autocomplete="current-password" placeholder="Password" /></label>
      ${state.error ? `<p class="form-error" role="alert">${esc(state.error)}</p>` : ""}
      <button class="btn btn-primary" type="submit">Log In</button>
    </form>
    <div class="social" aria-label="Social sign in">
      <button type="button" data-social="Google">${svg.google}<span>Google</span></button>
      <button type="button" data-social="Facebook">${svg.facebook}<span>Facebook</span></button>
      <button type="button" data-social="Apple">${svg.apple}<span>Apple</span></button>
    </div>
    <button class="forgot" type="button" data-forgot>Forgot password</button>
    ${state.forgot ? `<p class="forgot-note" role="status">We’ll send a reset link for that username.</p>` : ""}
  </section>`;
}

function discoverScreen() {
  return `<section class="screen discover">
    <header class="topbar">
      <h1>Discover Activities</h1>
      <a class="text-link" href="#/m/sculpting-with-sabrina">Messages</a>
    </header>
    <section class="block" aria-labelledby="nearby-label">
      <h2 id="nearby-label">Nearby</h2>
      <div class="map">
        <svg viewBox="0 0 340 220" aria-hidden="true">
          <rect width="340" height="220" fill="#e7efe6"/>
          <path d="M0 150c40-20 70-10 110 8 36 16 70 8 110-12 30-16 70-8 120 10v64H0z" fill="#d5e4ea"/>
          <path d="M0 78h340M0 150h340M78 0v220M196 0v220M278 0v220" fill="none" stroke="#f7f0e0" stroke-width="14"/>
          <rect x="96" y="28" width="82" height="36" rx="4" fill="#f4f1e6"/>
          <rect x="214" y="96" width="52" height="40" rx="4" fill="#efe6c8"/>
          <rect x="18" y="96" width="46" height="38" rx="4" fill="#f4f1e6"/>
        </svg>
        <a class="pin" style="left: 28%; top: 30%" href="#/x/night-at-the-museum">${svg.pin}<span>Local Square</span></a>
        <a class="pin" style="left: 62%; top: 52%" href="#/x/night-at-the-museum">${svg.pin}<span>Pancake Door</span></a>
      </div>
    </section>
    <section class="block" aria-labelledby="popular-label">
      <h2 id="popular-label">Popular</h2>
      <div class="popular">
        <a class="pop" href="#/x/night-at-the-museum">
          <img src="${G}/discover-popular-1.png" alt="" />
          <span class="pop-name">Bruno Mars</span>
        </a>
        <a class="pop" href="#/m/sculpting-with-sabrina">
          <img src="${G}/discover-popular-2.png" alt="" />
          <span class="pop-name">Sculp'</span>
        </a>
      </div>
    </section>
  </section>`;
}

function detailScreen(slug) {
  const kayaking = slug === "kayaking";
  const title = kayaking ? "Kayaking" : "Night at the Museum";
  const hours = kayaking ? "8:00 AM – 4:00 PM" : "7:00 PM – 11:00 PM";
  const rating = kayaking ? "4.6" : "4.8";
  return `<section class="screen detail">
    <div class="hero">
      <img src="${G}/frame-6-photo-1.png" alt="${kayaking ? "Water near the launch" : "The museum gallery at night"}" />
      <a class="icon-btn" href="#/discover" aria-label="Back">${svg.back}</a>
      <a class="icon-btn msg" href="#/m/sculpting-with-sabrina" aria-label="Sculpting with Sabrina">${svg.send}</a>
    </div>
    <div class="detail-body">
      <div class="title-row">
        <h1>${esc(title)}</h1>
        <p class="rating">${svg.star}<span>${rating}</span></p>
      </div>
      <p class="hours"><span>Hours</span> ${hours}</p>
      ${state.passed && !kayaking ? `<p class="notice" role="status">Not interested. We’ll show you less like this.</p>` : ""}
      <div class="detail-actions">
        <button class="btn btn-primary" type="button" data-follow aria-pressed="${state.following ? "true" : "false"}">${state.following ? "Following" : "Follow Event"}</button>
        <button class="btn btn-ghost" type="button" data-pass aria-pressed="${state.passed ? "true" : "false"}">Not Interested</button>
      </div>
      <div class="photos">
        <img src="${G}/frame-6-photo-2.png" alt="The street outside" />
        <img src="${G}/frame-6-photo-3.png" alt="A nearby stretch of water and hills" />
      </div>
      <section class="nearby-events" aria-labelledby="other-label">
        <h2 id="other-label">Other Events Nearby</h2>
        <a class="row" href="#/x/kayaking"><span><strong>Kayaking</strong><small>On the water this morning</small></span></a>
        <a class="row" href="#/m/sculpting-with-sabrina"><span><strong>Sculpting with Sabrina</strong><small>Open the thread</small></span></a>
        <a class="row" href="#/x/night-at-the-museum"><span><strong>Pancake Door</strong><small>A few blocks from Local Square</small></span></a>
      </section>
    </div>
  </section>`;
}

function threadScreen(slug) {
  const messages = state.threads[slug] || state.threads["sculpting-with-sabrina"] || [];
  return `<section class="screen thread-screen">
    <header class="thread-head">
      <a class="icon-btn" href="#/x/night-at-the-museum" aria-label="Back">${svg.back}</a>
      <div>
        <h1>Sculpting with Sabrina</h1>
        <p>Sabrina</p>
      </div>
    </header>
    <div class="thread" aria-live="polite">
      ${messages.map((m) => `<p class="bubble ${m.from === "me" ? "me" : "host"}">${esc(m.text)}</p>`).join("")}
    </div>
    <form class="composer" data-send="${esc(slug || "sculpting-with-sabrina")}">
      <input name="body" type="text" placeholder="Write a message" aria-label="Write a message" autocomplete="off" />
      <button class="send" type="submit" aria-label="Send">${svg.send}</button>
    </form>
  </section>`;
}

function signIn(name) {
  state.user = { name };
  state.error = "";
  state.forgot = false;
  save();
  go("#/discover");
}

app.addEventListener("click", (e) => {
  const link = e.target.closest("a[href^='#/']");
  if (link && e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
    e.preventDefault();
    go(link.getAttribute("href"));
    return;
  }
  if (e.target.closest("[data-social]")) {
    signIn(e.target.closest("[data-social]").dataset.social);
    return;
  }
  if (e.target.closest("[data-forgot]")) {
    state.forgot = true;
    state.error = "";
    save();
    render();
    return;
  }
  if (e.target.closest("[data-follow]")) {
    state.following = !state.following;
    if (state.following) state.passed = false;
    save();
    render();
    return;
  }
  if (e.target.closest("[data-pass]")) {
    state.passed = !state.passed;
    if (state.passed) state.following = false;
    save();
    render();
  }
});

app.addEventListener("submit", (e) => {
  const auth = e.target.closest("[data-auth]");
  if (auth) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(auth));
    const username = (data.username || "").trim();
    const password = data.password || "";
    if (!username || !password) {
      state.error = "Enter your username and password.";
      render();
      return;
    }
    signIn(username);
    return;
  }
  const send = e.target.closest("[data-send]");
  if (send) {
    e.preventDefault();
    const text = (new FormData(send).get("body") || "").toString().trim();
    if (!text) return;
    const slug = send.dataset.send;
    const key = state.threads[slug] ? slug : "sculpting-with-sabrina";
    state.threads[key] = [...(state.threads[key] || []), { from: "me", text }];
    save();
    render();
    const input = app.querySelector(".composer input");
    if (input) input.focus();
  }
});

window.addEventListener("hashchange", () => {
  if (location.hash === painted) return;
  render();
});
if (!location.hash) location.hash = "#/";
else render();
