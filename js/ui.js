'use strict';
/* ===== UI toolkit: icons, router, sheets, toasts, shared components ===== */
const ICONS = {
  home: '<path d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  briefcase: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/>',
  chevL: '<path d="M15 18l-6-6 6-6"/>', chevR: '<path d="M9 18l6-6-6-6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', check: '<path d="M20 6L9 17l-5-5"/>', x: '<path d="M18 6L6 18M6 6l12 12"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>',
  link: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>',
  pin: '<path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  alert: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01"/>',
  refresh: '<path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
  edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
  bookmark: '<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>',
  swap: '<path d="M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3"/>',
  flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7"/>',
};
const ic = (n, c = '') => `<svg class="ic ${c}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`;
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const fv = id => { const e = document.getElementById(id); return e ? e.value : ''; };
const fc = id => { const e = document.getElementById(id); return !!(e && e.checked); };

const SCR = {}, ACT = {}, PART = {};
const UI = {
  cal: { view: 'week', mode: 'mine', sel: null, cats: { campus: 1, personal: 1, por: 1, placement: 1, internship: 1 } },
  por: { q: '', sphere: '', club: '', status: '', saved: false, sort: 'deadline' },
  clubs: { q: '' }, news: { tab: 'events' }, career: { tab: 'upcoming', season: '', type: '' },
  sr: { q: '', club: '', year: '', dept: '' }, notif: { f: 'all' }, mgr: { club: null, tab: 'events' }, admin: { tab: 'requests' },
  club: { tab: 'events' }, mail: '',
};
const NAV = { stack: [{ n: 'welcome', p: {} }], tab: 'home' };
const ROOT_TABS = [['home', 'Home', 'home'], ['calendar', 'Calendar', 'calendar'], ['pors', 'PORs', 'briefcase'], ['clubs', 'Clubs', 'users'], ['profile', 'Profile', 'user']];
const NONAV = new Set(['welcome', 'sentLink', 'onboard', 'eventForm', 'porForm', 'personalForm', 'profileForm', 'portfolioForm', 'careerForm']);
const FORMS = new Set(['welcome', 'sentLink', 'onboard', 'eventForm', 'porForm', 'personalForm', 'profileForm', 'portfolioForm', 'careerForm']);

function go(n, p = {}) { NAV.stack.push({ n, p }); render(true); }
function back() { if (NAV.stack.length > 1) NAV.stack.pop(); render(true); }
function tab(t) { NAV.stack = [{ n: t, p: {} }]; NAV.tab = t; closeSheet(); render(true); }
function resetTo(n, p = {}) { NAV.stack = [{ n, p }]; closeSheet(); render(true); }
const curRoute = () => NAV.stack[NAV.stack.length - 1];

function render(top) {
  const cur = curRoute(), el = $('#screen'); const sc = top ? 0 : el.scrollTop;
  try { el.innerHTML = SCR[cur.n](cur.p || {}); } catch (e) { console.error(e); el.innerHTML = `<div class="empty"><h3>Something went wrong</h3><p>${esc(e.message)}</p><button class="btn" data-act="tab" data-t="home">Go home</button></div>`; }
  el.scrollTop = sc; chrome();
}
function chrome() {
  const cur = curRoute();
  $('#statusbar').innerHTML = `<span>${fTime(now())} <span class="demo-tag" title="All data is fictional">DEMO</span></span>` +
    (S.uid ? `<button class="rolechip" data-act="roleSheet" aria-label="Switch demo role. Current: ${esc(me().name)}, ${roleLabel(S.uid)}"><span class="dot"></span>${esc(me().name.split(' ')[0])} · ${roleLabel(S.uid)} ${ic('swap', 'sm')}</button>` : '<span class="tiny">Not signed in</span>');
  const nav = $('#nav'); const hide = !S.uid || NONAV.has(cur.n);
  nav.style.display = hide ? 'none' : '';
  if (!hide) nav.innerHTML = ROOT_TABS.map(([k, l, i]) => `<button data-act="tab" data-t="${k}" ${NAV.tab === k ? 'aria-current="page"' : ''}>${ic(i)}<span>${l}</span></button>`).join('');
}
function updateBadges() {
  const c = S.uid ? unreadCount(S.uid) : 0;
  $$('[data-badge="notif"]').forEach(b => { b.textContent = c; b.style.display = c ? '' : 'none'; });
}

/* sheets / toasts / confirm */
function sheet(html) {
  $('#overlay').innerHTML = `<div class="scrim" data-act="closeSheet"></div><div class="sheet" role="dialog" aria-modal="true">${'<div class="grab"></div>'}${html}</div>`;
  const f = $('#overlay .sheet input,#overlay .sheet textarea,#overlay .sheet button'); if (f) f.focus({ preventScroll: true });
}
function closeSheet() { $('#overlay').innerHTML = ''; }
const sheetOpen = () => !!$('#overlay').innerHTML;
function toast(msg, kind = '') {
  const t = document.createElement('div'); t.className = 'toast ' + kind; t.textContent = msg; $('#toast').appendChild(t); setTimeout(() => t.remove(), 3200);
}
const CB = {};
function ask({ title, body = '', ok = 'Confirm', danger, reason, fn }) {
  CB.ask = fn;
  sheet(`<h2>${esc(title)}</h2><p class="muted">${body}</p>${reason ? `<div class="field" style="margin-top:12px"><label for="askReason">${esc(reason)}</label><textarea id="askReason" maxlength="240"></textarea></div><div id="askErr"></div>` : ''}<div class="btnrow"><button class="btn" data-act="closeSheet">Cancel</button><button class="btn ${danger ? 'danger' : 'primary'}" data-act="askOk">${esc(ok)}</button></div>`);
}
ACT.askOk = () => { const r = $('#askReason'); const v = r ? r.value : ''; if (r && !v.trim()) { $('#askErr').innerHTML = '<div class="error" role="alert">Please give a reason.</div>'; return; } const fn = CB.ask; closeSheet(); if (fn) fn(v); };
ACT.closeSheet = closeSheet;
ACT.tab = d => tab(d.t);
ACT.back = back;
ACT.go = d => { let p = {}; try { p = d.p ? JSON.parse(d.p) : {}; } catch (e) { } go(d.n, p); };
const J = o => esc(JSON.stringify(o));

/* header */
function hdr(title, o = {}) {
  const canBack = NAV.stack.length > 1;
  return `<header class="hdr">${canBack ? `<button class="iconbtn" data-act="back" aria-label="Back">${ic('chevL')}</button>` : ''}<div style="flex:1;min-width:0"><h1>${esc(title)}</h1>${o.sub ? `<div class="sub">${o.sub}</div>` : ''}</div>${o.right || ''}</header>`;
}
const bellBtn = () => { const c = unreadCount(S.uid); return `<button class="iconbtn" data-act="go" data-n="notifs" aria-label="Notifications, ${c} unread">${ic('bell')}<span class="badgecount" data-badge="notif" style="${c ? '' : 'display:none'}">${c}</span></button>`; };
const sec = (t, link, act, dn, dp) => `<div class="sec"><h2>${esc(t)}</h2>${link ? `<button class="link" data-act="${act}" ${dn ? `data-n="${dn}"` : ''} ${dp ? `data-p='${JSON.stringify(dp)}'` : ''}>${esc(link)}</button>` : ''}</div>`;
const empty = (t, b, btn) => `<div class="empty"><h3>${esc(t)}</h3><p>${b}</p>${btn || ''}</div>`;

/* shared components */
const chipCat = c => `<span class="chip ${CATS[c].cls}"><span aria-hidden="true">${CATS[c].sym}</span> ${CATS[c].label}</span>`;
const badge = (t, c = '') => `<span class="badge ${c}">${t}</span>`;
function rowHTML(o) {
  return `<button class="row ${o.cancelled ? 'is-cancelled' : ''} ${o.muted ? 'muted-row' : ''}" data-act="open" data-type="${o.type}" data-id="${esc(o.id)}"><span class="bar ${CATS[o.cat].cls}"></span><span class="rbody"><span class="rtop">${chipCat(o.cat)}${(o.badges || []).join('')}</span><span class="rtitle">${esc(o.title)}</span><span class="rsub">${o.sub || ''}</span></span>${ic('chevR', 'sm')}</button>`;
}
function itemRow(it, showDay) {
  const t = it.point ? (it.dateOnly ? 'Date only · time TBA' : 'Due ' + fTime(it.start)) : fTime(it.start) + ' – ' + fTime(it.end);
  const bs = [];
  if (it.status === 'cancelled') bs.push(badge('✕ Cancelled', 'bad'));
  if (it.synced) bs.push(badge('Synced · demo', 'info'));
  else if (it.saved && it.cat === 'campus') bs.push(badge('✓ Saved', 'ok'));
  if (!it.point && it.status !== 'cancelled' && conflictsWith(S.uid, it.key).length) bs.push(badge('⚠ Overlap', 'bad'));
  return rowHTML({ type: it.ref.type, id: it.ref.id, cat: it.cat, title: it.title, sub: (showDay ? esc(fDay(it.start)) + ' · ' : '') + esc(t) + (it.sub ? ' · ' + esc(it.sub) : ''), badges: bs, cancelled: it.status === 'cancelled' });
}
function evRow(e, o = {}) {
  const st = evStatus(e), bs = [];
  if (st === 'cancelled') bs.push(badge('✕ Cancelled', 'bad')); if (st === 'draft') bs.push(badge('Draft')); if (st === 'past') bs.push(badge('Past'));
  if (e.hidden) bs.push(badge('Hidden by admin', 'warn'));
  if (o.u && isSavedEv(o.u, e.id)) bs.push(badge('✓ Saved', 'ok'));
  if (o.unread) bs.push(badge('● New', 'info'));
  if (o.going) bs.push(badge(goingCount(e.id) + ' going', 'info'));
  return rowHTML({ type: 'event', id: e.id, cat: 'campus', title: e.title, cancelled: st === 'cancelled', badges: bs, sub: esc(fDT(e.start)) + ' · ' + esc(club(e.clubId).name) });
}
function porRow(p, o = {}) {
  const st = porStatus(p), bs = [];
  bs.push(st === 'open' ? badge('● Open', 'ok') : st === 'upcoming' ? badge('◔ Opens ' + esc(fDay(p.opens)), 'info') : st === 'closed' ? badge('■ Closed') : st === 'cancelled' ? badge('✕ Cancelled', 'bad') : badge('Draft'));
  if (o.u && savedPor(o.u, p.id)) bs.push(badge('✓ Saved', 'ok'));
  if (p.hidden) bs.push(badge('Hidden by admin', 'warn'));
  if (o.unread) bs.push(badge('● New', 'info'));
  return rowHTML({ type: 'por', id: p.id, cat: 'por', title: p.title, cancelled: st === 'cancelled', badges: bs, sub: esc(club(p.clubId).name) + ' · ' + (st === 'upcoming' ? 'opens ' + esc(fDT(p.opens)) : 'closes ' + esc(fDT(p.closes))) });
}
ACT.open = d => {
  const m = { event: 'event', por: 'por', personal: 'personalForm', career: 'careerItem', club: 'club' };
  go(m[d.type], d.type === 'club' ? { id: d.id } : { id: d.id });
};
const initials = n => n.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
const clubLogo = c => `<span class="logo" style="background:${c.color}" aria-hidden="true">${esc(initials(c.name.replace(/[()]/g, '')))}</span>`;
function lines(s) { return esc(s).replace(/(https:\/\/[^\s<]+)/g, '<a class="lnk" href="$1" target="_blank" rel="noopener noreferrer">$1</a>'); }
const extLink = (url, label) => `<a class="lnk" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label || url)} ↗</a>`;
