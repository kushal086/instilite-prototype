'use strict';
/* ===== Auth, Home, Calendar, Event detail, Personal events, What's New ===== */

/* ---------- Welcome / sign-in / demo ---------- */
const DEMO_DESC = {
  S01: 'Student · saves events, tracks PORs, private career calendar',
  S02: 'Student · separate private data, opt-in senior profile',
  M01: 'Student + CFI club manager · publishes for CFI only',
  M02: 'Student + E-Cell manager · publishes for E-Cell only',
  C01: 'Career coordinator · manages the simulated portal feed',
  A01: 'Platform admin · verification, moderation, reset',
};
SCR.welcome = () => `
  <div class="hero"><img src="assets/logo.png" alt="InstiLite logo"><h1>InstiLite</h1><p class="muted">Insti happenings all at once!</p></div>
  <div class="banner warn"><span><b>Demo prototype.</b> All people, clubs, events and companies are fictional. Changes live in this browser tab only and reset on refresh.</span></div>
  <div class="card"><h3>Sign in with institute email</h3>
    <p class="muted" style="margin-bottom:10px">Passwordless one-time link. Only approved institute domains can sign in.</p>
    <div class="field"><label for="em">Institute email</label><input id="em" type="email" inputmode="email" autocomplete="email" placeholder="rollno@smail.iitm.ac.in" value="${esc(UI.mail)}"></div>
    <div id="emErr"></div>
    <button class="btn primary block" data-act="sendLink">Send sign-in link</button>
  </div>
  ${sec('Try demo')}
  <p class="muted pad" style="margin-bottom:8px">Pick a fictional identity. Switching roles later keeps all data.</p>
  ${['S01', 'S02', 'M01', 'M02', 'C01', 'A01'].map(id => { const u = user(id); return `<button class="rolecard" data-act="demo" data-id="${id}"><span class="av" aria-hidden="true">${esc(initials(u.name))}</span><span class="meta"><b>${esc(u.name)} <span class="badge demo">${id} · DEMO</span></b><span class="small">${DEMO_DESC[id]}</span></span>${ic('chevR', 'sm')}</button>`; }).join('')}
  <p class="tiny pad" style="margin:6px 14px 20px">Production verification (Smail) is separate from demo access. No real credentials are collected here.</p>`;
ACT.sendLink = () => {
  const em = fv('em').trim().toLowerCase(); UI.mail = em;
  if (!/^[^@\s]+@smail\.iitm\.ac\.in$/.test(em)) { $('#emErr').innerHTML = '<div class="error" role="alert">That email is not on an approved institute domain. Use your @smail.iitm.ac.in address, or try a demo identity below.</div>'; return; }
  go('sentLink');
};
SCR.sentLink = () => hdr('Check your inbox') + `<div class="form"><div class="banner info"><span>Simulated. In production a one-time link would be emailed to <b>${esc(UI.mail)}</b>. Links expire and can be reissued; attempts are rate-limited.</span></div>
  <button class="btn primary block" data-act="go" data-n="onboard">Open demo link</button><div class="btnrow"><button class="btn block ghost" data-act="back">Use a different email</button></div></div>`;
SCR.onboard = () => hdr('Set up your profile') + `<div class="form">
  <div id="obErr"></div>
  <div class="field"><label for="ob_name">Full name</label><input id="ob_name" type="text" autocomplete="name"></div>
  <div class="field"><label for="ob_roll">Roll number</label><input id="ob_roll" type="text" placeholder="e.g. ME23B000"><div class="hint">Used for verification only. Never shown publicly.</div></div>
  <div class="field"><label for="ob_dept">Department</label><select id="ob_dept">${['Aerospace', 'Chemical Engineering', 'Civil Engineering', 'Computer Science', 'Electrical Engineering', 'Engineering Design', 'Mechanical Engineering', 'Metallurgy', 'Physics'].map(d => `<option>${d}</option>`).join('')}</select></div>
  <div class="field"><label for="ob_year">Year</label><select id="ob_year">${[1, 2, 3, 4, 5].map(y => `<option>${y}</option>`).join('')}</select></div>
  <div class="field"><label for="ob_int">Interests (optional, comma separated)</label><input id="ob_int" type="text" placeholder="design, startups"></div>
  <p class="tiny" style="margin-bottom:10px">We don't ask for a phone number.</p>
  <button class="btn primary block" data-act="finishOnboard">Create profile</button></div>`;
ACT.finishOnboard = () => {
  const name = fv('ob_name').trim(), roll = fv('ob_roll').trim();
  if (!name) return $('#obErr').innerHTML = '<div class="error" role="alert">Name is required.</div>';
  if (!/^[A-Za-z]{2}\d{2}[A-Za-z]\d{3}$/.test(roll)) return $('#obErr').innerHTML = '<div class="error" role="alert">Roll number should look like ME23B000.</div>';
  const id = uid('N'); DB.users.push({ id, name, dept: fv('ob_dept'), year: +fv('ob_year'), kind: 'student', roll });
  DB.profiles[id] = { bio: '', interests: fv('ob_int').split(',').map(s => s.trim()).filter(Boolean), linkedin: '', contact: '', discoverable: false, showLinkedin: false, showContact: false };
  notify(id, { type: 'system', title: 'Welcome, ' + name.split(' ')[0] + '!', body: 'Start by browsing clubs or saving a POR deadline.', dedupe: 'welcome' });
  S.uid = id; resetTo('home'); toast('Profile created', 'ok');
};
ACT.demo = d => { S.uid = d.id; UI.cal.sel = null; resetTo('home'); toast('Signed in as ' + me().name + ' (demo)'); };
ACT.roleSheet = () => {
  sheet(`<h2>Switch demo identity</h2><p class="muted" style="margin-bottom:10px">Data is shared across roles in this workspace and is preserved when you switch.</p>
  ${DB.users.map(u => `<button class="rolecard" style="width:100%;margin:0 0 8px;${u.id === S.uid ? 'border-color:var(--accent)' : ''}" data-act="switchRole" data-id="${u.id}"><span class="av">${esc(initials(u.name))}</span><span class="meta"><b>${esc(u.name)}</b><span class="small">${u.id} · ${roleLabel(u.id)}${roleClubs(u.id).length ? ' · ' + roleClubs(u.id).map(c => club(c).name.replace(' (demo)', '')).join(', ') : ''}</span></span>${u.id === S.uid ? badge('Current', 'ok') : ''}</button>`).join('')}
  <div class="btnrow"><button class="btn block" data-act="signOut">Sign out</button></div>`);
};
ACT.switchRole = d => { S.uid = d.id; UI.cal.sel = null; UI.mgr.club = null; closeSheet(); resetTo('home'); toast('Now viewing as ' + me().name); };
ACT.signOut = () => { S.uid = null; closeSheet(); resetTo('welcome'); };

/* ---------- Home ---------- */
SCR.home = () => {
  const u = me(), id = u.id, t = now(), t0 = dayStart(t);
  const items = calItems(id, 'mine').filter(i => i.status !== 'cancelled');
  const today = items.filter(i => i.start >= t0 && i.start < t0 + D).sort((a, b) => a.start - b.start);
  const next = items.filter(i => !i.point && i.end > t).sort((a, b) => a.start - b.start)[0];
  const urgent = items.filter(i => i.point && i.start > t && i.start < t + 72 * H).sort((a, b) => a.start - b.start);
  const conf = conflictsOf(id);
  const unreadNew = pubEv().filter(e => e.publishedAt >= t - 48 * H && e.status === 'published' && !isRead(id, 'ev:' + e.id)).length + pubPor().filter(p => p.publishedAt >= t - 48 * H && p.status === 'published' && !isRead(id, 'por:' + p.id)).length;
  const recent = DB.changes.filter(c => c.at >= t - 48 * H && (c.kind === 'ev' ? (isSavedEv(id, c.ref) || isGoing(id, c.ref)) : !!savedPor(id, c.ref))).slice(0, 3);
  const hasSaved = DB.savedEv.some(s => s.uid === id) || DB.savedPor.some(s => s.uid === id);
  const careerOn = DB.conn[id] && DB.conn[id].connected;
  let roleCards = '';
  roleClubs(id).length && (roleCards += `<button class="rolecard" data-act="go" data-n="manage"><span class="av">${ic('edit')}</span><span class="meta"><b>Manage ${roleClubs(id).map(c => esc(club(c).name.replace(' (demo)', ''))).join(' · ')}</b><span class="small">Publish events and PORs, edit club profile</span></span>${ic('chevR', 'sm')}</button>`);
  u.kind === 'career' && (roleCards += `<button class="rolecard" data-act="go" data-n="careerAdmin"><span class="av">${ic('briefcase')}</span><span class="meta"><b>Career feed console</b><span class="small">Manage the simulated portal feed</span></span>${ic('chevR', 'sm')}</button>`);
  u.kind === 'admin' && (roleCards += `<button class="rolecard" data-act="go" data-n="admin"><span class="av">${ic('shield')}</span><span class="meta"><b>Admin console</b><span class="small">${DB.roleRequests.length} role request(s) · ${DB.reports.filter(r => r.open).length} open report(s)</span></span>${ic('chevR', 'sm')}</button>`);
  return hdr('Hi, ' + u.name.split(' ')[0], { sub: esc(fDay(t)), right: bellBtn() }) + roleCards + `
  <div class="stat">
    <button data-act="go" data-n="news"><b>${unreadNew}</b><span>New (48h)</span></button>
    <button data-act="go" data-n="conflicts"><b style="${conf.length ? 'color:var(--danger)' : ''}">${conf.length}</b><span>Conflicts</span></button>
    <button data-act="go" data-n="notifs"><b>${unreadCount(id)}</b><span>Unread</span></button>
  </div>
  ${sec('Today', 'Calendar', 'tab', null)}
  ${today.length ? `<div class="card tight">${today.map(i => itemRow(i)).join('')}</div>` : `<div class="card">${empty('Nothing on your schedule today', 'Save an event or add a personal commitment.', `<button class="btn" data-act="tab" data-t="clubs">Browse clubs</button>`)}</div>`}
  ${next ? `${sec('Next commitment')}<div class="card tight">${itemRow(next, true)}</div>` : ''}
  ${urgent.length ? `${sec('Urgent deadlines (72h)')}<div class="card tight">${urgent.map(i => itemRow(i, true)).join('')}</div>` : ''}
  ${recent.length ? `${sec('Recent updates', 'All', 'go', 'news')}<div class="card tight">${recent.map(c => `<button class="row" data-act="open" data-type="${c.kind === 'ev' ? 'event' : 'por'}" data-id="${c.ref}"><span class="bar ${c.kind === 'ev' ? 'k-campus' : 'k-por'}"></span><span class="rbody"><span class="rtitle">${esc(c.kind === 'ev' ? ev(c.ref).title : por(c.ref).title)}</span><span class="rsub">${esc(c.text)} · ${esc(rel(c.at))}</span></span>${ic('chevR', 'sm')}</button>`).join('')}</div>` : ''}
  ${sec('Career')}
  <div class="card">${careerOn ? `<b>Connected to simulated portal</b><p class="muted">Last sync ${DB.conn[id].lastSync ? esc(rel(DB.conn[id].lastSync)) : '—'} · ${careerOf(id).filter(c => c._elig !== 'review').length} item(s)</p><div class="btnrow"><button class="btn" data-act="go" data-n="career">Open Career</button></div>` : `<b>Tests, PPTs and deadlines — automatically</b><p class="muted">Connect the (simulated) placement portal to see your private schedule here.</p><div class="btnrow"><button class="btn primary" data-act="go" data-n="career">Connect career source</button></div>`}</div>
  ${!hasSaved && !careerOn ? `<div class="card">${empty('Your dashboard is empty', 'Discover what is happening on campus.', `<div class="btnrow"><button class="btn primary" data-act="tab" data-t="clubs">Browse clubs</button><button class="btn" data-act="tab" data-t="pors">See PORs</button></div>`)}</div>` : ''}
  ${sec('Quick actions')}
  <div class="pad btnrow" style="margin-top:0"><button class="btn" data-act="go" data-n="personalForm">${ic('plus', 'sm')} Personal event</button><button class="btn" data-act="go" data-n="news">${ic('clock', 'sm')} What’s New</button><button class="btn" data-act="go" data-n="seniors">${ic('users', 'sm')} Find seniors</button></div>
  <div style="height:12px"></div>`;
};

/* ---------- Calendar ---------- */
const HR = 52;
function calFiltered() { return calItems(S.uid, UI.cal.mode).filter(i => UI.cal.cats[i.cat]); }
const onDay = (items, ds) => items.filter(i => i.start >= ds && i.start < ds + D);
function layoutDay(arr) {
  arr = arr.slice().sort((a, b) => a.start - b.start || a.end - b.end);
  const out = [], cols = []; let cl = [], ce = 0;
  const flush = () => { const n = Math.max(...cl.map(c => c.col)) + 1; cl.forEach(c => { c.n = n; out.push(c); }); cl = []; cols.length = 0; };
  arr.forEach(it => { if (cl.length && it.start >= ce) flush(); let c = 0; while (cols[c] !== undefined && cols[c] > it.start) c++; cols[c] = it.end; cl.push({ it, col: c }); ce = Math.max(ce, it.end); });
  if (cl.length) flush(); return out;
}
function timeline(items, ds) {
  const timed = items.filter(i => !i.point); if (!timed.length) return '';
  const hs = timed.map(i => (Math.max(i.start, ds) - ds) / H), he = timed.map(i => (Math.min(i.end, ds + D) - ds) / H);
  const h0 = Math.max(0, Math.floor(Math.min(...hs)) - 1), h1 = Math.min(24, Math.max(h0 + 4, Math.ceil(Math.max(...he)) + 1));
  const lay = layoutDay(timed);
  let html = `<div class="timeline" style="height:${(h1 - h0) * HR}px" role="list" aria-label="Day timeline">`;
  for (let h = h0; h < h1; h++) html += `<div class="hr" style="top:${(h - h0) * HR}px;height:${HR}px">${(h % 12 || 12)} ${h < 12 ? 'AM' : 'PM'}</div>`;
  if (ds === dayStart(now())) { const nh = (now() - ds) / H; if (nh >= h0 && nh <= h1) html += `<div class="nowline" style="top:${(nh - h0) * HR}px" aria-label="Current time"></div>`; }
  lay.forEach(({ it, col, n }) => {
    const top = ((Math.max(it.start, ds) - ds) / H - h0) * HR, height = Math.max(34, ((Math.min(it.end, ds + D) - Math.max(it.start, ds)) / H) * HR - 2);
    const cf = it.status !== 'cancelled' && conflictsWith(S.uid, it.key).length;
    html += `<button class="blk ${CATS[it.cat].cls} ${it.status === 'cancelled' ? 'cancelled' : ''} ${cf ? 'conf' : ''}" role="listitem" style="top:${top}px;height:${height}px;left:calc(40px + (100% - 46px) * ${col / n});width:calc((100% - 46px) / ${n} - 2px)" data-act="open" data-type="${it.ref.type}" data-id="${esc(it.ref.id)}" aria-label="${esc(it.title)}, ${esc(fTime(it.start))} to ${esc(fTime(it.end))}${cf ? ', overlaps another item' : ''}${it.status === 'cancelled' ? ', cancelled' : ''}"><b>${CATS[it.cat].sym} ${esc(it.title)}</b>${esc(fTime(it.start))}${cf ? ' ⚠' : ''}</button>`;
  });
  return html + '</div>';
}
function dayBlock(items, ds) {
  const di = onDay(items, ds); const pts = di.filter(i => i.point).sort((a, b) => a.start - b.start);
  let h = `<div class="sec" style="margin-top:6px"><h2>${esc(fDay(ds))}${ds === dayStart(now()) ? ' · Today' : ''}</h2><span class="tiny">${di.length} item${di.length === 1 ? '' : 's'}</span></div>`;
  if (!di.length) return h + `<div class="card">${empty('Nothing here', UI.cal.mode === 'mine' ? 'Nothing saved for this day. Switch to All campus to discover events.' : 'No listings match these filters.', `<button class="btn" data-act="go" data-n="personalForm">Add personal event</button>`)}</div>`;
  if (pts.length) h += `<div class="dl" aria-label="Deadlines">${pts.map(i => itemRow(i)).join('')}</div>`;
  return h + timeline(di, ds);
}
SCR.calendar = () => {
  const c = UI.cal; if (!c.sel) c.sel = dayStart(now());
  const items = calFiltered(), conf = conflictsOf(S.uid).length, p = P(c.sel);
  let view = '';
  if (c.view === 'week') {
    const ws = c.sel - ((p.wd + 6) % 7) * D, we = ws + 6 * D, pw = P(ws), pe = P(we);
    view = `<div class="navbar"><button class="iconbtn" data-act="calWeek" data-d="-1" aria-label="Previous week">${ic('chevL')}</button><b>${pw.d} ${MON[pw.mo]} – ${pe.d} ${MON[pe.mo]}</b><span><button class="btn sm ghost" data-act="calToday">Today</button><button class="iconbtn" data-act="calWeek" data-d="1" aria-label="Next week">${ic('chevR')}</button></span></div>
    <div class="strip" role="group" aria-label="Week days">${[0, 1, 2, 3, 4, 5, 6].map(i => { const ds = ws + i * D, n = onDay(items, ds).length; return `<button class="dchip ${ds === dayStart(now()) ? 'today' : ''}" data-act="calSel" data-ts="${ds}" aria-pressed="${ds === c.sel}" aria-label="${esc(fDay(ds))}, ${n} items"><span>${DOW[(i + 1) % 7]}</span><b>${P(ds).d}</b><span class="cnt">${n ? '● ' + n : ''}</span></button>`; }).join('')}</div>
    ${dayBlock(items, c.sel)}`;
  } else if (c.view === 'month') {
    const first = Date.UTC(p.y, p.mo, 1) - IST, fp = P(first), lead = (fp.wd + 6) % 7, gs = first - lead * D;
    view = `<div class="navbar"><button class="iconbtn" data-act="calMonth" data-d="-1" aria-label="Previous month">${ic('chevL')}</button><b>${MONF[p.mo]} ${p.y}</b><span><button class="btn sm ghost" data-act="calToday">Today</button><button class="iconbtn" data-act="calMonth" data-d="1" aria-label="Next month">${ic('chevR')}</button></span></div>
    <div class="mgrid" role="grid">${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(d => `<div class="mh" aria-hidden="true">${d}</div>`).join('')}${Array.from({ length: 42 }, (_, i) => { const ds = gs + i * D, pp = P(ds), di = onDay(items, ds), cats = [...new Set(di.map(x => x.cat))]; return `<button class="mcell ${pp.mo !== p.mo ? 'out' : ''} ${ds === dayStart(now()) ? 'today' : ''}" data-act="calSel" data-ts="${ds}" aria-pressed="${ds === c.sel}" aria-label="${esc(fDay(ds))}, ${di.length} items">${pp.d}<span class="dots" aria-hidden="true">${cats.slice(0, 3).map(k => CATS[k].sym).join('')}</span>${di.length ? `<span class="n">${di.length}</span>` : ''}</button>`; }).join('')}</div>
    <div class="tiny pad" style="margin-bottom:4px">${Object.entries(CATS).map(([k, v]) => `${v.sym} ${v.label}`).join(' · ')}</div>
    ${dayBlock(items, c.sel)}`;
  } else {
    const t0 = dayStart(now()); let h = '';
    for (let i = 0; i < 21; i++) { const ds = t0 + i * D, di = onDay(items, ds).sort((a, b) => a.start - b.start); if (di.length) h += `<div class="sec" style="margin:12px 14px 6px"><h2>${esc(fDay(ds))}${i === 0 ? ' · Today' : ''}</h2></div><div class="card tight">${di.map(x => itemRow(x)).join('')}</div>`; }
    view = h || `<div class="card">${empty('Nothing in the next 3 weeks', 'Save events to see them here.', '')}</div>`;
  }
  return hdr('Calendar', { right: `<button class="iconbtn" data-act="go" data-n="personalForm" aria-label="Add personal event">${ic('plus')}</button>${bellBtn()}` }) +
    `<div class="seg" role="group" aria-label="Schedule scope"><button data-act="calMode" data-v="mine" aria-pressed="${c.mode === 'mine'}">My schedule</button><button data-act="calMode" data-v="all" aria-pressed="${c.mode === 'all'}">All campus</button></div>
    <div class="chips" role="group" aria-label="Filter categories">${Object.entries(CATS).map(([k, v]) => `<button class="fchip" data-act="calCat" data-k="${k}" aria-pressed="${!!c.cats[k]}">${v.sym} ${v.label}</button>`).join('')}</div>
    <div class="seg" role="group" aria-label="View"><button data-act="calView" data-v="week" aria-pressed="${c.view === 'week'}">Week</button><button data-act="calView" data-v="month" aria-pressed="${c.view === 'month'}">Month</button><button data-act="calView" data-v="agenda" aria-pressed="${c.view === 'agenda'}">Agenda</button></div>
    ${conf ? `<button class="banner bad" style="width:calc(100% - 28px);border:0;text-align:left" data-act="go" data-n="conflicts"><span>${ic('alert', 'sm')} <b>${conf} overlap${conf > 1 ? 's' : ''}</b> in your schedule. Tap to review.</span></button>` : ''}
    ${view}<div style="height:10px"></div>`;
};
ACT.calMode = d => { UI.cal.mode = d.v; render(); };
ACT.calView = d => { UI.cal.view = d.v; render(); };
ACT.calCat = d => { UI.cal.cats[d.k] = UI.cal.cats[d.k] ? 0 : 1; render(); };
ACT.calSel = d => { UI.cal.sel = +d.ts; render(); };
ACT.calToday = () => { UI.cal.sel = dayStart(now()); render(); };
ACT.calWeek = d => { UI.cal.sel += (+d.d) * 7 * D; render(); };
ACT.calMonth = d => { const p = P(UI.cal.sel); const n = Date.UTC(p.y, p.mo + (+d.d), 1) - IST; const np = P(n); const tp = P(now()); UI.cal.sel = (np.y === tp.y && np.mo === tp.mo) ? dayStart(now()) : n; render(); };

/* ---------- Event detail ---------- */
SCR.event = ({ id }) => {
  const e = ev(id), u = S.uid; if (!e) return hdr('Event') + empty('Event not found', '', '');
  const mgr = canManage(u, e.clubId), adm = user(u).kind === 'admin';
  if ((e.hidden && !mgr && !adm) || (e.status === 'draft' && !mgr)) return hdr('Event') + empty('Not available', 'This listing was removed by moderators or is not published.', '');
  markRead(u, 'ev:' + id); DB.changes.filter(c => c.ref === id).forEach(c => markRead(u, 'chg:' + c.id));
  const c = club(e.clubId), st = evStatus(e), saved = isSavedEv(u, id), going = isGoing(u, id);
  const lastChange = DB.changes.find(x => x.ref === id && x.kind === 'ev');
  const cf = saved ? conflictsWith(u, 'e' + id) : [];
  return hdr('Event', { right: bellBtn() }) + `
  <div class="card"><div class="rtop" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">${chipCat('campus')}<span class="badge">${esc(e.cat)}</span>${st === 'cancelled' ? badge('✕ Cancelled', 'bad') : ''}${st === 'draft' ? badge('Draft') : ''}${st === 'past' ? badge('Past') : ''}${e.hidden ? badge('Hidden by admin', 'warn') : ''}${saved ? badge('✓ Saved', 'ok') : ''}${going ? badge('Going', 'ok') : ''}</div>
    <h2 style="font-size:22px;line-height:1.25">${esc(e.title)}</h2>
    <dl class="kv" style="margin-top:12px">
      <dt>Organiser</dt><dd><button class="link" style="border:0;background:none;padding:0;color:#0B5CAD;font-weight:650;min-height:32px" data-act="open" data-type="club" data-id="${c.id}">${esc(c.name)}</button></dd>
      <dt>When</dt><dd>${esc(fDT(e.start))} – ${esc(fTime(e.end))}</dd>
      <dt>Where</dt><dd>${e.link ? 'Online · ' + extLink(e.link, 'Join link') : esc(e.venue)}</dd>
      <dt>About</dt><dd>${esc(e.desc)}</dd>
      ${e.resources ? `<dt>Resources</dt><dd>${lines(e.resources)}</dd>` : ''}
      <dt>Contact</dt><dd>${esc(e.contact || '—')}</dd>
      <dt>Updated</dt><dd>${esc(rel(e.updatedAt))} · revision ${e.rev}</dd>
    </dl></div>
  ${st === 'cancelled' ? `<div class="banner bad"><span><b>Cancelled.</b> ${esc(e.cancelReason || '')}${saved ? ' Your saved entry is kept in history; reminders are off.' : ''}</span></div>` : ''}
  ${lastChange && st !== 'cancelled' && now() - lastChange.at < 48 * H ? `<div class="banner warn"><span><b>Updated ${esc(rel(lastChange.at))}.</b> ${esc(lastChange.text)}</span></div>` : ''}
  ${cf.length ? `<div class="banner bad"><span>${ic('alert', 'sm')} <b>Overlaps with:</b> ${cf.map(x => esc(x.title) + ' (' + esc(fTime(x.start)) + '–' + esc(fTime(x.end)) + ')').join('; ')}</span></div>` : ''}
  ${st === 'draft' ? '' : `<div class="pad btnrow" style="margin-top:0">
    <button class="btn ${saved ? '' : 'primary'}" data-act="saveEv" data-id="${id}">${ic('bookmark', 'sm')} ${saved ? 'Unsave' : 'Save to my schedule'}</button>
    ${st === 'upcoming' ? `<button class="btn" data-act="rsvp" data-id="${id}" aria-pressed="${going}">${going ? '✓ Going — tap to undo' : 'RSVP: Going'}</button>` : ''}</div>
  <p class="tiny pad" style="margin-top:6px">Saving is private. RSVP is an explicit signal to the club and is not attendance.</p>`}
  ${mgr ? `<div class="sec"><h2>Manager tools</h2></div><div class="card"><dl class="kv"><dt>RSVPs</dt><dd><b>${goingCount(id)}</b> going (explicit RSVPs)</dd><dt>Status</dt><dd>${esc(e.status)}${e.hidden ? ' · hidden: ' + esc(e.hiddenReason) : ''}</dd></dl>
    <div class="btnrow">${e.status !== 'cancelled' ? `<button class="btn" data-act="go" data-n="eventForm" data-p='${JSON.stringify({ id })}'>${ic('edit', 'sm')} Edit</button>` : ''}${e.status === 'draft' ? `<button class="btn primary" data-act="previewPublish" data-id="${id}">Preview & publish</button>` : ''}${e.status === 'published' ? `<button class="btn danger" data-act="cancelEv" data-id="${id}">Cancel event</button>` : ''}</div></div>` : ''}
  ${adm && !e.hidden ? `<div class="pad btnrow"><button class="btn" data-act="adminHide" data-k="ev" data-id="${id}">${ic('shield', 'sm')} Hide listing (moderation)</button></div>` : ''}
  ${!mgr && !adm && st !== 'draft' ? `<div class="pad"><button class="btn ghost sm" data-act="reportItem" data-k="ev" data-id="${id}">${ic('flag', 'sm')} Report this listing</button></div>` : ''}
  <div style="height:12px"></div>`;
};
ACT.saveEv = d => {
  const r = api.toggleSaveEv(d.id); render();
  if (!r.saved) return toast('Removed from your schedule');
  const cf = conflictsWith(S.uid, 'e' + d.id);
  if (!cf.length) return toast('Saved to My schedule', 'ok');
  sheet(`<h2>${ic('alert')} Schedule overlap</h2><p class="muted">This overlaps with ${cf.map(x => '<b>' + esc(x.title) + '</b> (' + esc(fTime(x.start)) + '–' + esc(fTime(x.end)) + ')').join(', ')}. Back-to-back items don’t count as overlaps.</p>
  <div class="btnrow"><button class="btn primary" data-act="closeSheet">Keep both</button><button class="btn" data-act="undoSave" data-id="${d.id}">Remove saved event</button></div>${cf.some(x => x.cat === 'placement' || x.cat === 'internship') ? '<p class="tiny" style="margin-top:8px">Career items from the portal are never removed automatically.</p>' : ''}`);
};
ACT.undoSave = d => { api.toggleSaveEv(d.id); closeSheet(); render(); toast('Removed from your schedule'); };
ACT.rsvp = d => { const r = api.toggleRsvp(d.id); render(); toast(r.going ? 'RSVP sent: Going' : 'RSVP withdrawn', r.going ? 'ok' : ''); };
ACT.reportItem = d => ask({ title: 'Report this listing', body: 'An admin will review it.', ok: 'Send report', reason: 'What is wrong?', fn: r => { DB.reports.unshift({ id: uid('rp'), kind: d.k, ref: d.id, by: S.uid, reason: r, at: now(), open: true }); toast('Report sent to admins', 'ok'); } });

/* ---------- Personal event form ---------- */
SCR.personalForm = ({ id }) => {
  const p = id ? pers(id) : null; if (id && (!p || p.uid !== S.uid)) return hdr('Personal event') + empty('Not found', '', '');
  const d0 = p ? p.start : (UI.cal.sel || dayStart(now()));
  return hdr(p ? 'Edit personal event' : 'New personal event') + `<div class="form"><p class="tiny" style="margin-bottom:10px">Private to you. Never visible to other students or managers.</p><div id="fErr"></div>
  <div class="field"><label for="pf_t">Title</label><input id="pf_t" type="text" value="${esc(p ? p.title : '')}" maxlength="80"></div>
  <div class="field"><label for="pf_d">Date</label><input id="pf_d" type="date" value="${iDate(d0)}"></div>
  <div class="two"><div class="field"><label for="pf_s">Start</label><input id="pf_s" type="time" value="${p ? iTime(p.start) : '10:00'}"></div><div class="field"><label for="pf_e">End</label><input id="pf_e" type="time" value="${p ? iTime(p.end) : '11:00'}"></div></div>
  <div class="field"><label for="pf_v">Venue (optional)</label><input id="pf_v" type="text" value="${esc(p ? p.venue : '')}"></div>
  <div class="field"><label for="pf_x">Description (optional)</label><textarea id="pf_x">${esc(p ? p.desc : '')}</textarea></div>
  <div class="field"><label for="pf_r">Reminder</label><select id="pf_r">${[[0, 'None'], [1, '1 hour before'], [24, '24 hours before']].map(([v, l]) => `<option value="${v}" ${(p && p.remind === v) ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
  <p class="tiny" style="margin-bottom:10px">Times are Asia/Kolkata (IST).</p>
  <div class="btnrow"><button class="btn" data-act="back">Cancel</button><button class="btn primary" data-act="savePersonal" data-id="${id || ''}">Save</button></div>
  ${p ? `<div class="btnrow"><button class="btn danger block" data-act="delPersonal" data-id="${id}">${ic('trash', 'sm')} Delete</button></div>` : ''}</div>`;
};
ACT.savePersonal = d => {
  const t = fv('pf_t').trim(), s = fromIn(fv('pf_d'), fv('pf_s')), e = fromIn(fv('pf_d'), fv('pf_e'));
  const err = !t ? 'Title is required.' : isNaN(s) || isNaN(e) ? 'Date, start and end are required.' : e <= s ? 'End time must be after the start time.' : '';
  if (err) return $('#fErr').innerHTML = `<div class="error" role="alert">${err}</div>`;
  const rec = { title: t, start: s, end: e, venue: fv('pf_v'), desc: fv('pf_x'), remind: +fv('pf_r'), created: now() };
  if (d.id) { const p = pers(d.id); if (!p || p.uid !== S.uid) return toast('Not allowed', 'bad'); Object.assign(p, rec); }
  else DB.personal.push({ id: uid('pe'), uid: S.uid, ...rec });
  back(); toast('Personal event saved', 'ok');
  const cf = conflictsOf(S.uid).filter(pr => pr[0].ref.type === 'personal' || pr[1].ref.type === 'personal').length; if (cf) setTimeout(() => toast('Heads-up: it overlaps another item', 'bad'), 400);
};
ACT.delPersonal = d => ask({ title: 'Delete this event?', body: 'This also removes its pending reminder.', ok: 'Delete', danger: 1, fn: () => { DB.personal = DB.personal.filter(p => !(p.id === d.id && p.uid === S.uid)); back(); toast('Deleted'); } });

/* ---------- Conflicts ---------- */
SCR.conflicts = () => {
  const cs = conflictsOf(S.uid);
  return hdr('Schedule conflicts') + (cs.length ? cs.map(([a, b]) => `<div class="card tight">${itemRow(a, true)}${itemRow(b, true)}</div>`).join('') + '<p class="tiny pad">Overlap = one item starts before the other ends. Deadlines are not timed blocks. Career items are never removed for you.</p>' : `<div class="card">${empty('No conflicts', 'Nothing in your schedule overlaps.', '')}</div>`);
};

/* ---------- What's New ---------- */
SCR.news = () => {
  const u = S.uid, t = now(), tabn = UI.news.tab, conn = DB.conn[u] && DB.conn[u].connected;
  const evs = pubEv().filter(e => e.status === 'published' && e.publishedAt >= t - 48 * H).sort((a, b) => b.publishedAt - a.publishedAt);
  const prs = pubPor().filter(p => p.status === 'published' && p.publishedAt >= t - 48 * H).sort((a, b) => b.publishedAt - a.publishedAt);
  const chs = DB.changes.filter(c => c.at >= t - 48 * H && !(c.kind === 'ev' ? ev(c.ref).hidden || ev(c.ref).status === 'draft' : por(c.ref).hidden)).sort((a, b) => b.at - a.at);
  const careerUp = DB.notifs.filter(n => n.uid === u && n.type === 'career' && n.at >= t - 48 * H);
  const un = { events: evs.filter(e => !isRead(u, 'ev:' + e.id)).length, apps: prs.filter(p => !isRead(u, 'por:' + p.id)).length, updates: chs.filter(c => !isRead(u, 'chg:' + c.id)).length };
  const tabs = [['events', 'Events', un.events], ['apps', 'Applications', un.apps], ['updates', 'Updates', un.updates]]; if (conn) tabs.push(['career', 'Career', careerUp.filter(n => !n.readAt).length]);
  let body = '';
  if (tabn === 'events') body = evs.length ? `<div class="card tight">${evs.map(e => evRow(e, { u, unread: !isRead(u, 'ev:' + e.id) }) + `<div class="tiny" style="padding:0 14px 8px;margin-top:-6px;background:#fff">Published ${esc(rel(e.publishedAt))}</div>`).join('')}</div>` : `<div class="card">${empty('Nothing new in the last 48 hours', 'Listings appear here based on when they were published, not when the event happens.', '')}</div>`;
  else if (tabn === 'apps') body = prs.length ? `<div class="card tight">${prs.map(p => porRow(p, { u, unread: !isRead(u, 'por:' + p.id) })).join('')}</div>` : `<div class="card">${empty('No new applications', 'Nothing was published in the last 48 hours.', '')}</div>`;
  else if (tabn === 'updates') body = chs.length ? `<div class="card tight">${chs.map(c => `<button class="row" data-act="open" data-type="${c.kind === 'ev' ? 'event' : 'por'}" data-id="${c.ref}"><span class="bar ${c.kind === 'ev' ? 'k-campus' : 'k-por'}"></span><span class="rbody"><span class="rtop">${badge(c.type === 'cancel' ? '✕ Cancelled' : c.type === 'reschedule' ? '↻ Rescheduled' : c.type === 'venue' ? '⌖ Venue' : '⏱ Deadline', c.type === 'cancel' ? 'bad' : 'warn')}${!isRead(u, 'chg:' + c.id) ? badge('● New', 'info') : ''}</span><span class="rtitle">${esc(c.kind === 'ev' ? ev(c.ref).title : por(c.ref).title)}</span><span class="rsub">${esc(c.text)} · ${esc(rel(c.at))}</span></span>${ic('chevR', 'sm')}</button>`).join('')}</div>` : `<div class="card">${empty('No reschedules or cancellations', 'Changes from the last 48 hours show up here.', '')}</div>`;
  else body = careerUp.length ? `<div class="card tight">${careerUp.map(n => `<button class="nrow ${n.readAt ? '' : 'unread'}" data-act="openNotif" data-id="${n.id}"><span><span class="t">${esc(n.title)}</span><br><span class="small">${esc(n.body)}</span></span></button>`).join('')}</div>` : `<div class="card">${empty('No career updates', '', '')}</div>`;
  return hdr('What’s New', { sub: 'Published in the last 48 hours', right: bellBtn() }) + `<div class="seg" role="tablist">${tabs.map(([k, l, n]) => `<button role="tab" data-act="newsTab" data-v="${k}" aria-selected="${tabn === k}">${l}${n ? ' ●' + n : ''}</button>`).join('')}</div>${body}`;
};
ACT.newsTab = d => { UI.news.tab = d.v; render(); };
