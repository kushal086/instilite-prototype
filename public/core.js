'use strict';
// InstiLite prototype — core: state, API, navigation, shell, login, shared helpers.
const A = (window.A = { S: { ws: null, sess: null, st: null, stack: [{ n: 'home' }], sheet: null, toast: null, ui: {}, editing: false, offline: false, lastOk: 0, skew: 0, ids: null, dismissed: new Set(), busy: false }, views: {}, acts: {}, sheets: {}, forms: {}, inputs: {} });
const S = A.S;
const TZ = 'Asia/Kolkata';
const $ = (s, r = document) => r.querySelector(s);
const e = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
A.e = e; A.$ = $;

// ---------- icons ----------
const IC = {
  home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
  search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  back: '<polyline points="15 18 9 12 15 6"/>',
  chev: '<polyline points="9 18 15 12 9 6"/>',
  close: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  bookmark: '<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  pin: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  briefcase: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  cap: '<path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
  alert: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  sliders: '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  refresh: '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
  list: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
  spark: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/>',
  trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  ext: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  filter: '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
  info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
  swap: '<polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
};
const ic = (n, c = 'ico') => `<svg class="${c}" viewBox="0 0 24 24" aria-hidden="true">${IC[n] || ''}</svg>`;
A.ic = ic;

// ---------- time helpers (display Asia/Kolkata; stored UTC) ----------
const nowMs = () => Date.now() + S.skew;
const fmtT = (iso) => new Date(iso).toLocaleTimeString('en-IN', { timeZone: TZ, hour: 'numeric', minute: '2-digit', hour12: true });
const fmtD = (iso) => new Date(iso).toLocaleDateString('en-IN', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short' });
const fmtDT = (iso) => `${fmtD(iso)}, ${fmtT(iso)}`;
const dayKey = (iso) => new Date(iso).toLocaleDateString('en-CA', { timeZone: TZ });
const todayKey = () => dayKey(new Date(nowMs()).toISOString());
const addDays = (k, n) => dayKey(new Date(Date.parse(k + 'T12:00:00+05:30') + n * 864e5).toISOString());
const dow = (k) => (new Date(k + 'T12:00:00+05:30').getUTCDay() + 6) % 7; // Mon=0 (12:00 IST is the same UTC date)
const dayNum = (k) => +k.slice(8);
const monthLabel = (k) => new Date(k + 'T12:00:00+05:30').toLocaleDateString('en-IN', { timeZone: TZ, month: 'long', year: 'numeric' });
const dayLabel = (k) => new Date(k + 'T12:00:00+05:30').toLocaleDateString('en-IN', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' });
const toInput = (iso) => new Date(Date.parse(iso) + 19800000).toISOString().slice(0, 16);
const fromInput = (v) => (v ? new Date(v + ':00+05:30').toISOString() : '');
const rel = (iso) => {
  const d = Date.parse(iso) - nowMs(), a = Math.abs(d), m = Math.round(a / 60000);
  const t = m < 1 ? 'now' : m < 60 ? `${m}m` : m < 2880 ? `${Math.round(m / 60)}h` : `${Math.round(m / 1440)}d`;
  return t === 'now' ? 'now' : d > 0 ? `in ${t}` : `${t} ago`;
};
Object.assign(A, { fmtT, fmtD, fmtDT, dayKey, todayKey, addDays, dow, dayNum, monthLabel, dayLabel, toInput, fromInput, rel, nowMs });

// ---------- api ----------
async function api(method, url, body) {
  let r;
  try {
    r = await fetch(url, { method, headers: { 'content-type': 'application/json', ...(S.sess ? { 'x-session': S.sess } : {}) }, body: body ? JSON.stringify(body) : undefined });
  } catch (err) { const x = new Error('Can’t reach the server. Check your connection and try again.'); x.network = true; throw x; }
  let j = null; try { j = await r.json(); } catch {}
  if (!r.ok) { const x = new Error((j && j.error) || 'Something went wrong'); x.status = r.status; x.code = j && j.code; throw x; }
  return j;
}
A.api = api;

// ---------- toasts + safe mutations ----------
let toastT;
function toast(msg, kind = 'ok') { S.toast = { msg, kind }; clearTimeout(toastT); toastT = setTimeout(() => { S.toast = null; paintOverlays(); }, 3800); paintOverlays(); }
A.toast = toast;
// Run a write; show success ONLY after the server confirms. Failures never look like success.
async function doit(fn, okMsg) {
  if (S.busy) return null; S.busy = true;
  try { const r = await fn(); await poll(true); if (okMsg) toast(okMsg, 'ok'); return r || true; }
  catch (err) {
    if (err.status === 401) { signOutLocal(); return null; }
    toast(err.network ? err.message + ' Your change was NOT saved.' : err.message, 'bad'); return null;
  } finally { S.busy = false; }
}
A.doit = doit;

// ---------- navigation ----------
const cur = () => S.stack[S.stack.length - 1];
A.go = (n, p) => { S.stack.push({ n, p: p || {} }); S.editing = false; render(true); };
A.back = () => { if (S.stack.length > 1) S.stack.pop(); S.editing = false; render(true); };
A.tab = (n) => { S.stack = [{ n }]; S.editing = false; S.sheet = null; render(true); };
A.cur = cur;
A.openSheet = (t, p, opts = {}) => { S.sheet = { t, p: p || {}, form: !!opts.form }; S.editing = !!opts.form; render(); };
A.closeSheet = () => { S.sheet = null; render(); };

// ---------- data access ----------
const D = (A.D = {
  club: (id) => S.st.clubs.find((c) => c.id === id),
  event: (id) => S.st.events.find((x) => x.id === id),
  por: (id) => S.st.pors.find((x) => x.id === id),
  career: (id) => S.st.career.items.find((x) => x.id === id),
  personal: (id) => S.st.personal.find((x) => x.id === id),
  savedEvent: (id) => S.st.saved_events.some((x) => x.event_id === id),
  savedPor: (id) => S.st.saved_pors.find((x) => x.por_id === id),
  going: (id) => S.st.rsvps.includes(id),
  isManagerOf: (clubId) => S.st.me.managed.some((m) => m.club_id === clubId),
  role: () => { const m = S.st.me; return m.role_type === 'career' ? 'Career' : m.role_type === 'admin' ? 'Admin' : m.managed.length ? 'Manager' : 'Student'; },
});
const CAT = { campus: ['Campus', 'calendar'], personal: ['Personal', 'user'], por: ['POR', 'flag'], placement: ['Placement', 'briefcase'], internship: ['Internship', 'cap'] };
A.CAT = CAT;
A.pill = (c) => `<span class="pill ${c}">${ic(CAT[c][1], 'ico sm')}${CAT[c][0]}</span>`;
A.porStatus = (p) => { if (p.status === 'draft') return 'draft'; if (p.status === 'cancelled') return 'cancelled'; const n = nowMs(); if (n < Date.parse(p.opens_at)) return 'upcoming'; if (n > Date.parse(p.closes_at)) return 'closed'; return 'open'; };
A.statusPill = (p) => {
  const s = A.porStatus(p);
  return { open: `<span class="pill ok">${ic('check', 'ico sm')}Open</span>`, upcoming: `<span class="pill grey">${ic('clock', 'ico sm')}Opens ${e(fmtD(p.opens_at))}</span>`, closed: `<span class="pill bad">${ic('close', 'ico sm')}Closed</span>`, cancelled: `<span class="pill bad">${ic('close', 'ico sm')}Cancelled</span>`, draft: `<span class="pill grey">Draft</span>` }[s];
};
const careerCat = (c) => (c.season === 'internship' ? 'internship' : 'placement');
const careerConfirmed = (c) => ['assigned', 'registered'].includes(c.eligibility);

// unified calendar items; scope 'my' or 'all'
A.items = (scope) => {
  const st = S.st, out = [];
  const addEvent = (ev) => out.push({ key: 'event:' + ev.id, type: 'event', cat: 'campus', title: ev.title, start: ev.start_at, end: ev.end_at, club: ev.club_id, cancelled: ev.status === 'cancelled', ref: ev });
  const addPor = (p, saved) => { if (['draft', 'cancelled'].includes(p.status)) return; out.push({ key: 'por:' + p.id, type: 'por', cat: 'por', title: 'Deadline: ' + p.title, start: p.closes_at, end: p.closes_at, point: true, club: p.club_id, ref: p, closed: A.porStatus(p) === 'closed' }); };
  if (scope === 'all') {
    st.events.filter((x) => x.status !== 'draft' && (!x.hidden || D.isManagerOf(x.club_id))).forEach(addEvent);
    st.pors.filter((p) => p.status === 'published' && !p.hidden && A.porStatus(p) !== 'closed').forEach((p) => addPor(p));
    return out;
  }
  st.saved_events.forEach((s) => { const ev = D.event(s.event_id); if (ev && ev.status !== 'draft' && !ev.hidden) addEvent(ev); });
  st.personal.forEach((p) => out.push({ key: 'personal:' + p.id, type: 'personal', cat: 'personal', title: p.title, start: p.start_at, end: p.end_at, ref: p }));
  st.saved_pors.forEach((s) => { const p = D.por(s.por_id); if (p && s.on_calendar && !p.hidden) addPor(p, true); });
  st.career.items.forEach((c) => {
    if (c.hidden || !careerConfirmed(c)) return;
    const cancelled = c.source_status === 'cancelled';
    const label = `${c.company} · ${c.item_type === 'ppt' ? 'PPT' : c.item_type}`;
    if (c.item_type === 'deadline') out.push({ key: 'career:' + c.id, type: 'career', cat: careerCat(c), title: label, start: c.deadline_at, end: c.deadline_at, point: true, cancelled, ref: c });
    else if (c.date_only) out.push({ key: 'career:' + c.id, type: 'career', cat: careerCat(c), title: label + ' (time TBA)', start: c.start_at, end: c.start_at, dateOnly: true, cancelled, ref: c });
    else out.push({ key: 'career:' + c.id, type: 'career', cat: careerCat(c), title: label, start: c.start_at, end: c.end_at, cancelled, ref: c });
  });
  return out;
};
const overlaps = (a, b) => Date.parse(a.start) < Date.parse(b.end) && Date.parse(b.start) < Date.parse(a.end);
A.timed = () => A.items('my').filter((i) => !i.point && !i.dateOnly && !i.cancelled && i.end > i.start);
A.conflictPairs = () => { const t = A.timed(), o = []; for (let i = 0; i < t.length; i++) for (let k = i + 1; k < t.length; k++) if (overlaps(t[i], t[k])) o.push([t[i], t[k]]); return o; };
A.conflictsFor = (key) => { const t = A.timed(), me = t.find((x) => x.key === key); return me ? t.filter((o) => o.key !== key && overlaps(o, me)) : []; };
A.unread = (type, item) => { if (type === 'event' || type === 'por') return !S.st.reads.some((r) => r.item_type === type && r.item_id === item.id && r.version >= item.version); return false; };
A.markRead = (type, id) => { api('POST', '/api/read', { item_type: type, item_id: id }).then(() => poll(true)).catch(() => {}); };
A.unreadNotifs = () => S.st.notifications.filter((n) => !n.read_at).length;

// ---------- polling ----------
async function poll(force) {
  if (!S.sess) return;
  try {
    const r = await api('GET', `/api/state?rev=${S.st ? S.st.rev : 0}${force || !S.st ? '&force=1' : ''}`);
    S.offline = false; S.lastOk = Date.now();
    if (!r.unchanged) { S.st = r; S.skew = Date.parse(r.now) - Date.now(); if (!S.editing) render(); }
    else updateStatus();
  } catch (err) {
    if (err.status === 401) return signOutLocal();
    S.offline = true; updateStatus();
    if (force) throw err;
  }
}
A.poll = poll;
function updateStatus() {
  const el = $('#statusbar'); if (!el) return;
  const ago = Math.max(0, Math.round((Date.now() - S.lastOk) / 1000));
  el.className = 'statusbar' + (S.offline ? ' bad' : '');
  el.innerHTML = S.offline ? `<span class="dot"></span>Offline — showing last saved data (${ago}s old). Retrying…` : `<span class="dot"></span>Live · synced ${ago < 3 ? 'just now' : ago + 's ago'} · times in IST`;
}

// ---------- session ----------
const sessKey = () => 'instilite_sess_' + S.ws;
function signOutLocal(msg) { try { sessionStorage.removeItem(sessKey()); } catch {} S.sess = null; S.st = null; S.stack = [{ n: 'home' }]; S.sheet = null; render(); if (msg) toast(msg, 'bad'); }
A.signOut = async () => { try { await api('POST', '/api/logout'); } catch {} signOutLocal(); };
async function loginAs(code) {
  const r = await api('POST', '/api/login', { w: S.ws, code });
  S.sess = r.session; try { sessionStorage.setItem(sessKey(), S.sess); } catch {}
  S.st = null; S.stack = [{ n: 'home' }]; S.sheet = null; S.editing = false;
  await poll(true); render(true);
}
A.loginAs = loginAs;

// ---------- shell ----------
function shell() {
  const r = cur(); const v = A.views[r.n] || A.views.home;
  const o = v(r.p || {});
  S.editing = !!o.form || !!(S.sheet && S.sheet.form);
  const root = S.stack.length === 1;
  const nb = A.unreadNotifs();
  const chip = `<button class="rolechip" data-a="roles" aria-label="Current role ${e(S.st.me.code)} ${D.role()}. Switch role"><span class="ell">${e(S.st.me.code)} · ${D.role()}</span>${ic('swap', 'ico sm')}</button>`;
  const left = root ? `<img class="logo" src="/logo.png" alt="">` : `<button class="iconbtn" data-a="back" aria-label="Back">${ic('back')}</button>`;
  const bell = `<button class="iconbtn" data-a="notifs" aria-label="Notifications${nb ? ', ' + nb + ' unread' : ''}">${ic('bell')}${nb ? `<span class="badge-dot">${nb > 9 ? '9+' : nb}</span>` : ''}</button>`;
  const tabs = [['home', 'Home', 'home'], ['cal', 'Calendar', 'calendar'], ['por', 'PORs', 'flag'], ['clubs', 'Clubs', 'users'], ['me', 'Profile', 'user']];
  const rootName = S.stack[0].n;
  return `<header class="topbar">${left}<h2 class="ell">${e(o.title)}</h2>${o.right || ''}${chip}${r.n === 'notifs' ? '' : bell}</header>
  <div id="statusbar" class="statusbar"></div>
  ${o.top || ''}
  <main class="content" id="content" tabindex="-1" data-route="${e(r.n + JSON.stringify(r.p || {}))}">${o.body}</main>
  ${o.fab || ''}
  <nav class="tabbar" aria-label="Main">${tabs.map(([n, l, i]) => `<button class="tab" data-a="tab" data-v="${n}" ${rootName === n ? 'aria-current="page"' : ''}>${ic(i)}<span>${l}</span></button>`).join('')}</nav>`;
}
A.shell = shell;

function overlays() {
  let h = '';
  if (S.sheet) { const f = A.sheets[S.sheet.t]; const an = S.sheet.shown ? '' : ' anim'; S.sheet.shown = true; if (f) h += `<div class="scrim" data-a="scrim"><div class="sheet${an}" role="dialog" aria-modal="true" aria-label="${e(S.sheet.t)}"><div class="grab"></div><button class="iconbtn closebtn" data-a="closesheet" aria-label="Close">${ic('close')}</button>${f(S.sheet.p)}</div></div>`; }
  if (S.toast) h += `<div class="toast ${S.toast.kind}" role="status">${e(S.toast.msg)}</div>`;
  return h;
}
function paintOverlays() { const ov = $('#overlays'); if (ov) ov.innerHTML = overlays(); }

// ---------- login ----------
async function loginView() {
  if (!S.ids) { try { S.ids = await api('GET', '/api/identities?w=' + encodeURIComponent(S.ws)); } catch { S.ids = []; } }
  const plain = S.ids.filter((i) => i.role_type === 'student' && !i.clubs.length), mgrs = S.ids.filter((i) => i.role_type === 'student' && i.clubs.length), oth = S.ids.filter((i) => i.role_type !== 'student');
  const card = (i) => `<button class="idcard" data-a="demo" data-v="${e(i.code)}"><span class="code">${e(i.code)}</span><span class="grow"><b class="ell" style="display:block">${e(i.name)}</b><span class="muted xs">${i.role_type === 'career' ? 'Career coordinator · simulated feed only' : i.role_type === 'admin' ? 'Platform admin · verify & moderate' : i.clubs.length ? 'Student + manager of ' + e(i.clubs.join(' & ')) : e(i.dept) + ' · ' + e(i.year)}</span></span>${ic('chev')}</button>`;
  return `<div class="content" id="content"><div class="hero"><img src="/logo.png" alt="InstiLite logo"><h1>InstiLite</h1><p class="muted">Insti happenings all at once!</p></div>
  <div class="banner info">${ic('info')}<span><b>Demo prototype.</b> Fictional data only. Every role shares one live database in this workspace — changes made as a manager show up for students within seconds.</span></div>
  <div class="sec"><h3>Try demo — choose a role</h3></div>
  ${plain.slice(0, 2).map(card).join('')}${mgrs.map(card).join('')}${oth.map(card).join('')}
  <details class="card"><summary class="b" style="min-height:44px;display:flex;align-items:center;cursor:pointer">More demo students</summary><div class="sp"></div>${plain.slice(2).map(card).join('')}</details>
  <div class="sec"><h3>Sign in with institute email</h3></div>
  <form class="card" data-f="otp" novalidate><div class="field"><label for="em">IIT Madras student email</label><input class="input" id="em" name="email" type="email" autocomplete="email" placeholder="name@smail.iitm.ac.in" required></div>
  <div id="otpbox" class="${S.ui.otp ? '' : 'hide'}"><div class="banner info">${ic('info')}<span>Demo only — no email is sent. Use code <b>123456</b>.</span></div><div class="field"><label for="otp">One-time code</label><input class="input" id="otp" name="otp" inputmode="numeric" autocomplete="one-time-code" maxlength="6"></div></div>
  <div id="otperr" class="err" role="alert"></div><button class="btn primary block" type="submit">${S.ui.otp ? 'Verify code' : 'Send sign-in code'}</button>
  <p class="muted xs sp">Only approved institute domains are accepted. Real Smail verification is not connected in this prototype.</p></form>
  <p class="muted xs tc">Workspace <b>${e(S.ws)}</b> · <button class="link" data-a="newws">Start a fresh isolated workspace</button></p></div>`;
}

// ---------- render ----------
let rendering = false;
async function render(resetScroll) {
  if (rendering) return; rendering = true;
  try {
    const app = $('#app'); const old = $('#content'); const key = old && old.dataset.route; const top = old ? old.scrollTop : 0;
    let html;
    if (!S.sess || !S.st) html = (await loginView()) + '<div id="overlays"></div>';
    else html = shell() + '<div id="overlays"></div>';
    const af = document.activeElement; const afId = af && af.id; const sh = $('.sheet'); const shTop = sh ? sh.scrollTop : 0;
    app.innerHTML = html;
    const nc = $('#content');
    if (nc) { if (!resetScroll && nc.dataset.route === key) nc.scrollTop = top; }
    paintOverlays(); updateStatus(); sidePanel(); if (shTop && $('.sheet')) $('.sheet').scrollTop = shTop;
    if (resetScroll && nc) { nc.focus({ preventScroll: true }); }
    else if (afId && $('#' + afId)) $('#' + afId).focus({ preventScroll: true });
  } finally { rendering = false; }
}
A.render = render;
function sidePanel() {
  const el = $('#side-body'); if (!el) return;
  const url = location.origin + '/?w=' + S.ws;
  el.innerHTML = `<div class="card"><b>Shared workspace</b><p class="muted sm">Open this link in a second window to act as another role in the same live data.</p><input class="input" readonly value="${e(url)}" aria-label="Workspace link" onfocus="this.select()"><div class="sp"></div><div class="row"><button class="btn sm" data-a="copylink">Copy link</button><button class="btn sm" data-a="second">Open 2nd session</button></div></div>
  <div class="card"><b>Demo script</b><ol class="sm muted" style="margin:6px 0 0;padding-left:18px"><li>Sign in as <b>M01</b> → Manage → publish a workshop</li><li>Second window: <b>S01</b> → see it in Calendar &amp; What’s New</li><li>S01 saves + RSVPs; M01’s going count rises</li><li>M01 reschedules → S01 gets one alert</li><li><b>C01</b> reschedules a test → S01 calendar updates</li></ol></div>`;
}

// ---------- events (delegation) ----------
document.addEventListener('click', (ev) => {
  const t = ev.target.closest('[data-a]'); if (!t) return;
  const a = t.dataset.a;
  if (a === 'scrim' && ev.target !== t) return;
  if (t.tagName === 'A') return;
  const fn = A.acts[a]; if (fn) { ev.preventDefault(); fn(t.dataset.v, t, ev); }
});
document.addEventListener('submit', (ev) => { const f = ev.target.closest('[data-f]'); if (!f) return; ev.preventDefault(); const fn = A.forms[f.dataset.f]; if (fn) fn(f, ev); });
document.addEventListener('input', (ev) => { const t = ev.target.closest('[data-i]'); if (t && A.inputs[t.dataset.i]) A.inputs[t.dataset.i](t.value, t, ev); });
document.addEventListener('change', (ev) => { const t = ev.target.closest('[data-c]'); if (t && A.inputs[t.dataset.c]) A.inputs[t.dataset.c](t.type === 'checkbox' ? t.checked : t.value, t, ev); });
document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && S.sheet) A.closeSheet(); });

Object.assign(A.acts, {
  back: () => A.back(), tab: (n) => A.tab(n), closesheet: () => A.closeSheet(), scrim: () => A.closeSheet(),
  notifs: () => { S.sheet = null; if (cur().n !== 'notifs') A.go('notifs'); },
  roles: async () => { if (!S.ids) S.ids = await api('GET', '/api/identities?w=' + encodeURIComponent(S.ws)); A.openSheet('roles'); },
  switch: async (code) => { S.sheet = null; try { await loginAs(code); toast('Switched role — data preserved'); } catch (err) { toast(err.message, 'bad'); } },
  demo: async (code) => { try { await loginAs(code); } catch (err) { toast(err.message, 'bad'); } },
  newws: async () => { const r = await api('POST', '/api/workspace'); location.href = '/?w=' + r.ws; },
  copylink: async () => { try { await navigator.clipboard.writeText(location.origin + '/?w=' + S.ws); toast('Workspace link copied'); } catch { toast('Select the link and copy it manually', 'bad'); } },
  second: () => window.open('/?w=' + S.ws, '_blank'),
});
A.sheets.roles = () => `<h2>Switch role</h2><p class="muted sm">Same workspace, same data. Your changes stay.</p><div class="sp"></div>${S.ids.map((i) => `<button class="idcard" data-a="switch" data-v="${e(i.code)}" ${i.code === S.st.me.code ? 'aria-current="true"' : ''}><span class="code">${e(i.code)}</span><span class="grow"><b class="ell" style="display:block">${e(i.name)}</b><span class="muted xs">${i.role_type === 'student' ? (i.clubs.length ? 'Manager · ' + e(i.clubs.join(', ')) : 'Student') : i.role_type === 'career' ? 'Career coordinator' : 'Admin'}</span></span>${i.code === S.st.me.code ? '<span class="pill ok">You</span>' : ''}</button>`).join('')}`;
A.forms.otp = async (f) => {
  const email = f.email.value.trim(); const err = $('#otperr'); err.textContent = '';
  try {
    if (!S.ui.otp) { await api('POST', '/api/otp/request', { w: S.ws, email }); S.ui.otp = email; $('#otpbox').classList.remove('hide'); f.querySelector('button[type=submit]').textContent = 'Verify code'; f.otp.focus(); }
    else { const r = await api('POST', '/api/otp/verify', { w: S.ws, email: S.ui.otp, otp: f.otp.value.trim() }); S.sess = r.session; sessionStorage.setItem(sessKey(), S.sess); S.ui.otp = null; await poll(true); render(true); }
  } catch (x) { err.textContent = x.message; }
};

// ---------- boot ----------
function fit() {
  if (innerWidth <= 500) return;
  const s = Math.min(1, (innerHeight - 24) / 844, 1);
  const fr = $('#frame'); fr.style.width = 390 * s + 'px'; fr.style.height = 844 * s + 'px'; $('#phone').style.transform = `scale(${s})`;
}
A.boot = async function () {
  const q = new URLSearchParams(location.search); let ws = q.get('w');
  try { if (!ws) ws = localStorage.getItem('instilite_ws'); } catch {}
  if (!ws || !/^[a-z0-9]{6,24}$/i.test(ws)) { try { ws = (await api('POST', '/api/workspace')).ws; } catch { document.body.innerHTML = '<p style="padding:24px">Server unreachable. Please retry.</p>'; return; } }
  S.ws = ws; try { localStorage.setItem('instilite_ws', ws); } catch {}
  if (q.get('w') !== ws) history.replaceState(null, '', '/?w=' + ws);
  try { S.sess = sessionStorage.getItem(sessKey()); } catch {}
  addEventListener('resize', fit); fit();
  if (S.sess) await poll(true);
  await render(true);
  setInterval(() => poll(false), 5000);
  setInterval(() => { if (S.st && !S.editing && !S.sheet) render(); else updateStatus(); }, 30000);
  setInterval(updateStatus, 1000);
};
Object.assign(A, { cur, nowMs, careerCat, careerConfirmed });
