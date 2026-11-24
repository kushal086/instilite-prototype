'use strict';
// Views part 1: Home, Calendar, item detail sheets, What's New, Notifications.
(function () {
  const { S, e, ic, D, CAT, fmtT, fmtD, fmtDT, dayKey, todayKey, addDays, dow, dayNum, monthLabel, dayLabel, rel, nowMs, api, doit, toast } = Object.assign({}, A, A.S ? { S: A.S } : {});
  const H48 = 48 * 3600e3;
  const byStart = (a, b) => Date.parse(a.start) - Date.parse(b.start);
  const empty = (icon, title, sub, btn) => `<div class="empty">${ic(icon)}<p class="b">${e(title)}</p><p class="sm">${e(sub || '')}</p>${btn || ''}</div>`;
  A.empty = empty;
  const clubName = (id) => { const c = D.club(id); return c ? c.name : ''; };
  A.clubName = clubName;

  // rolling 48h feed based on publication timestamp (not event start)
  A.whatsNew = () => {
    const st = S.st, n = nowMs(), within = (iso) => iso && n - Date.parse(iso) <= H48 && n - Date.parse(iso) >= -60000;
    const events = st.events.filter((x) => x.status === 'published' && !x.hidden && within(x.published_at)).sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at));
    const pors = st.pors.filter((x) => x.status === 'published' && !x.hidden && within(x.published_at)).sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at));
    const updates = st.updates.filter((u) => within(u.at)).map((u) => ({ ...u, item: u.item_type === 'event' ? D.event(u.item_id) : D.por(u.item_id) })).filter((u) => u.item && !u.item.hidden && u.item.status !== 'draft');
    const unreadU = (u) => !st.reads.some((r) => r.item_type === u.item_type && r.item_id === u.item_id && r.version >= u.version);
    const careerN = st.notifications.filter((x) => x.type === 'career' && within(x.created_at));
    return { events, pors, updates, careerN, unreadCount: events.filter((x) => A.unread('event', x)).length + pors.filter((x) => A.unread('por', x)).length + updates.filter(unreadU).length, unreadU };
  };

  // ---------- item cards ----------
  function itemCard(i, opts = {}) {
    const cf = !i.point && !i.dateOnly && A.conflictsFor(i.key).length;
    const time = i.point ? `Due ${fmtT(i.start)}` : i.dateOnly ? 'Date only · time TBA' : `${fmtT(i.start)} – ${fmtT(i.end)}`;
    const sub = i.type === 'event' ? clubName(i.club) : i.type === 'por' ? clubName(i.club) + ' · application deadline' : i.type === 'career' ? (i.ref.mode || '') + ' · synced from demo portal' : (i.ref.venue || 'Private');
    return `<button class="card tap accent-l ${i.cat}" data-a="item" data-v="${e(i.key)}"><div class="row wrap">${A.pill(i.cat)}${i.cancelled ? `<span class="pill bad">${ic('close', 'ico sm')}Cancelled</span>` : ''}${i.closed ? '<span class="pill grey">Closed</span>' : ''}${cf ? `<span class="pill warn">${ic('alert', 'ico sm')}Overlap</span>` : ''}${opts.showDay ? `<span class="muted xs">${e(fmtD(i.start))}</span>` : ''}</div><h3 class="${i.cancelled ? 'ev cancelled' : ''}" style="margin-top:6px">${e(i.title)}</h3><p class="sm muted">${ic('clock', 'ico sm')} ${e(time)}</p><p class="xs muted ell">${e(sub)}</p></button>`;
  }
  A.itemCard = itemCard;
  A.acts.item = (key) => {
    const [t, id] = [key.split(':')[0], key.slice(key.indexOf(':') + 1)];
    A.openSheet('item', { t, id });
    if (t === 'event' && D.event(id) && A.unread('event', D.event(id))) A.markRead('event', id);
    if (t === 'por' && D.por(id) && A.unread('por', D.por(id))) A.markRead('por', id);
  };

  // ---------- HOME ----------
  A.views.home = () => {
    const st = S.st, me = st.me, n = nowMs(), tk = todayKey();
    const hr = +new Date(n).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false });
    const greet = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
    const my = A.items('my').filter((i) => !i.cancelled);
    const today = my.filter((i) => dayKey(i.start) === tk).sort(byStart);
    const next = my.filter((i) => !i.point && !i.dateOnly && Date.parse(i.end) > n).sort(byStart)[0];
    const pairs = A.conflictPairs();
    const urgent = my.filter((i) => i.point && !i.closed && Date.parse(i.start) > n && Date.parse(i.start) - n < 72 * 3600e3).sort(byStart);
    const wn = A.whatsNew();
    const myNew = wn.updates.filter((u) => D.savedEvent(u.item_id) || D.savedPor(u.item_id));
    const connected = st.career.conn.connected;
    const review = st.career.items.filter((c) => c.eligibility === 'unknown').length;
    let h = `<p class="muted sm">${greet},</p><h1 style="font-size:24px;margin-bottom:12px">${e(me.name.replace(/ \(.*\)/, ''))}</h1>`;
    if (S.st.me.managed.length) h += `<button class="card tap" data-a="go" data-v="manage" style="background:var(--accent-bg);border-color:#9AD3C9"><div class="row">${ic('edit')}<div class="grow"><b>Manager tools</b><p class="sm muted">Publish events &amp; PORs for ${e(me.managed.map((m) => m.name).join(', '))}</p></div>${ic('chev')}</div></button>`;
    if (me.role_type === 'career') h += `<button class="card tap" data-a="go" data-v="coord" style="background:var(--bg-placement)"><div class="row">${ic('briefcase')}<div class="grow"><b>Career feed (simulated)</b><p class="sm muted">Add, reschedule or cancel fictional records</p></div>${ic('chev')}</div></button>`;
    if (me.role_type === 'admin') h += `<button class="card tap" data-a="go" data-v="admin" style="background:var(--bg-por)"><div class="row">${ic('shield')}<div class="grow"><b>Admin console</b><p class="sm muted">Verify roles, moderate listings, audit log</p></div>${ic('chev')}</div></button>`;
    h += `<div class="stats"><button class="stat" data-a="tab" data-v="cal"><div class="n">${today.length}</div><div class="l">On your schedule today</div></button>
      <button class="stat" data-a="conflicts" aria-label="${pairs.length} schedule conflicts"><div class="n" style="color:${pairs.length ? 'var(--danger)' : 'inherit'}">${pairs.length}</div><div class="l">${pairs.length ? '⚠ ' : ''}Schedule conflicts</div></button>
      <button class="stat" data-a="go" data-v="whatsnew"><div class="n">${wn.unreadCount}</div><div class="l">Unread in What’s New</div></button>
      <button class="stat" data-a="go" data-v="notifs"><div class="n">${A.unreadNotifs()}</div><div class="l">Unread notifications</div></button></div>`;
    h += `<div class="sec"><h3>Next commitment</h3></div>`;
    h += next ? A.itemCard(next, { showDay: true }) : empty('calendar', 'Nothing coming up', 'Save events or add a personal commitment to see them here.', `<button class="btn primary sm" data-a="tab" data-v="clubs">Browse clubs</button>`);
    h += `<div class="sec"><h3>Today</h3><button class="link" data-a="tab" data-v="cal">Calendar</button></div>`;
    h += today.length ? today.map((i) => A.itemCard(i)).join('') : empty('calendar', 'Free day', 'Nothing saved for today. Discover what’s happening on campus.', `<button class="btn sm" data-a="go" data-v="whatsnew">See what’s new</button>`);
    h += `<div class="sec"><h3>Urgent deadlines</h3></div>`;
    h += urgent.length ? urgent.map((i) => `<button class="card tap accent-l ${i.cat}" data-a="item" data-v="${e(i.key)}"><div class="row">${A.pill(i.cat)}<b class="grow">${e(i.title)}</b></div><p class="sm" style="color:var(--danger);font-weight:700">${ic('clock', 'ico sm')} ${e(rel(i.start))} · ${e(fmtDT(i.start))}</p></button>`).join('') : `<div class="empty"><p class="sm">No saved deadlines in the next 3 days.</p></div>`;
    h += `<div class="sec"><h3>Recent updates to your items</h3></div>`;
    h += myNew.length ? myNew.slice(0, 3).map((u) => `<button class="card tap" data-a="item" data-v="${u.item_type}:${u.item_id}"><span class="pill ${u.kind === 'cancel' ? 'bad' : 'warn'}">${u.kind === 'cancel' ? 'Cancelled' : u.kind === 'reschedule' ? 'Rescheduled' : 'Updated'}</span><p class="b" style="margin-top:4px">${e(u.item.title)}</p><p class="sm muted">${e(u.summary)}</p><p class="xs muted">${e(rel(u.at))}</p></button>`).join('') : `<div class="empty"><p class="sm">No changes to saved items in the last 48 hours.</p></div>`;
    if (!connected) h += `<div class="sec"><h3>Career</h3></div><button class="card tap" data-a="go" data-v="career">${ic('briefcase')} <b>Connect the placement &amp; internship feed</b><p class="sm muted">Tests, PPTs and deadlines land on your calendar automatically. Demo uses a simulated portal.</p></button>`;
    else h += `<div class="sec"><h3>Career</h3></div><button class="card tap" data-a="go" data-v="career">${ic('briefcase')} <b>Career calendar connected</b><p class="sm muted">${st.career.items.filter((c) => careerOk(c)).length} confirmed items${review ? ` · ${review} need review` : ''}${st.career.conn.stale ? ' · ⚠ data may be stale' : ''}</p></button>`;
    h += `<div class="sec"><h3>Quick actions</h3></div><div class="grid2">
      <button class="qa" data-a="go" data-v="personal">${ic('plus')}Add personal event</button>
      <button class="qa" data-a="tab" data-v="por">${ic('flag')}Browse PORs</button>
      <button class="qa" data-a="tab" data-v="clubs">${ic('users')}Browse clubs</button>
      <button class="qa" data-a="go" data-v="seniors">${ic('search')}Find seniors</button></div>`;
    return { title: 'InstiLite', body: h };
  };
  const careerOk = (c) => ['assigned', 'registered'].includes(c.eligibility) && c.source_status === 'active';
  A.acts.go = (n) => A.go(n);
  A.acts.conflicts = () => A.openSheet('conflicts');
  A.sheets.conflicts = () => {
    const pairs = A.conflictPairs();
    return `<h2>Schedule conflicts</h2><p class="muted sm">Overlaps between timed items. Adjacent items (one ends as the next starts) are not conflicts.</p><div class="sp"></div>` + (pairs.length ? pairs.map(([a, b], k) => {
      const opt = (x) => (x.type === 'career' ? `<span class="pill grey">${ic('lock', 'ico sm')}Official item — can’t be removed here</span>` : x.type === 'event' ? `<button class="btn sm" data-a="unsaveconf" data-v="${x.id}">Remove “${e(x.title.slice(0, 18))}”</button>` : '');
      return `<div class="card"><p class="b">${e(a.title)}</p><p class="sm muted">${e(fmtDT(a.start))} – ${e(fmtT(a.end))}</p><div class="sp"></div><p class="b">${e(b.title)}</p><p class="sm muted">${e(fmtDT(b.start))} – ${e(fmtT(b.end))}</p><div class="sp"></div><div class="row wrap"><button class="btn sm" data-a="closesheet">Keep both</button>${opt(a.type === 'event' ? a : b)}</div></div>`;
    }).join('') : empty('check', 'No conflicts', 'Your schedule has no overlapping timed items.'));
  };
  A.acts.unsaveconf = (id) => doit(async () => { await api('DELETE', `/api/events/${id}/save`); S.sheet = null; }, 'Removed from your schedule');

  // ---------- CALENDAR ----------
  const cal = () => (S.ui.cal = S.ui.cal || { view: 'week', scope: 'my', day: todayKey(), cats: ['campus', 'personal', 'por', 'placement', 'internship'], club: '' });
  A.views.cal = () => {
    const c = cal(), tk = todayKey();
    let items = A.items(c.scope).filter((i) => c.cats.includes(i.cat) && (!c.club || i.club === c.club));
    const onDay = (k) => items.filter((i) => dayKey(i.start) === k);
    const filtersOn = (c.cats.length < 5 ? 1 : 0) + (c.club ? 1 : 0);
    const dotsFor = (k) => { const cats = [...new Set(onDay(k).map((i) => i.cat))].slice(0, 3); return `<span class="dots">${cats.map((x) => `<i style="color:var(--c-${x})"></i>`).join('')}</span>`; };
    let top = `<div style="padding:10px 14px 0;background:var(--surface);border-bottom:1px solid var(--border)"><div class="seg" role="group" aria-label="Schedule scope"><button data-a="calscope" data-v="my" aria-pressed="${c.scope === 'my'}">My schedule</button><button data-a="calscope" data-v="all" aria-pressed="${c.scope === 'all'}">All campus</button></div><div class="row" style="padding:8px 0"><div class="seg grow" role="group" aria-label="View">${['week', 'month', 'agenda'].map((v) => `<button data-a="calview" data-v="${v}" aria-pressed="${c.view === v}">${v[0].toUpperCase() + v.slice(1)}</button>`).join('')}</div><button class="btn sm" data-a="calfilter" aria-label="Filters${filtersOn ? ', ' + filtersOn + ' active' : ''}">${ic('filter', 'ico sm')}${filtersOn ? filtersOn : ''}</button></div></div>`;
    let h = '';
    if (c.view === 'week') {
      const start = A.addDays(c.day, -dow(c.day));
      h += `<div class="row"><button class="iconbtn" data-a="calshift" data-v="-7" aria-label="Previous week">${ic('back')}</button><b class="grow tc">${e(monthLabel(c.day))}</b><button class="btn sm" data-a="caltoday">Today</button><button class="iconbtn" data-a="calshift" data-v="7" aria-label="Next week">${ic('chev')}</button></div>`;
      h += `<div class="datestrip">${[0, 1, 2, 3, 4, 5, 6].map((i) => { const k = addDays(start, i); const cnt = onDay(k).length; return `<button class="day ${k === tk ? 'today' : ''}" data-a="calday" data-v="${k}" aria-pressed="${k === c.day}" aria-label="${e(dayLabel(k))}, ${cnt} item${cnt === 1 ? '' : 's'}">${'MTWTFSS'[i]}<span class="d">${dayNum(k)}</span>${dotsFor(k)}</button>`; }).join('')}</div>`;
    } else if (c.view === 'month') {
      const first = c.day.slice(0, 8) + '01', gs = addDays(first, -dow(first));
      h += `<div class="row"><button class="iconbtn" data-a="calmonth" data-v="-1" aria-label="Previous month">${ic('back')}</button><b class="grow tc">${e(monthLabel(c.day))}</b><button class="btn sm" data-a="caltoday">Today</button><button class="iconbtn" data-a="calmonth" data-v="1" aria-label="Next month">${ic('chev')}</button></div><div class="sp"></div>`;
      h += `<div class="month">${'MTWTFSS'.split('').map((d) => `<div class="hd">${d}</div>`).join('')}${Array.from({ length: 42 }, (_, i) => { const k = addDays(gs, i); const cnt = onDay(k).length; return `<button class="mday ${k.slice(0, 7) !== c.day.slice(0, 7) ? 'out' : ''} ${k === tk ? 'today' : ''}" data-a="calday" data-v="${k}" aria-pressed="${k === c.day}" aria-label="${e(dayLabel(k))}, ${cnt} item${cnt === 1 ? '' : 's'}">${dayNum(k)}${dotsFor(k)}<span class="mcount">${cnt ? cnt : ''}</span></button>`; }).join('')}</div>`;
    }
    if (c.view === 'agenda') {
      let any = false;
      for (let i = 0; i < 30; i++) { const k = addDays(tk, i), list = onDay(k).sort(byStart); if (!list.length) continue; any = true; h += `<div class="sec"><h3>${i === 0 ? 'Today · ' : i === 1 ? 'Tomorrow · ' : ''}${e(dayLabel(k))}</h3></div>` + list.map((x) => A.itemCard(x)).join(''); }
      if (!any) h += empty('calendar', c.scope === 'my' ? 'Your schedule is empty' : 'Nothing matches these filters', c.scope === 'my' ? 'Switch to All campus to discover events and save them.' : 'Clear filters to see more.', c.scope === 'my' ? `<button class="btn primary sm" data-a="calscope" data-v="all">Browse All campus</button>` : '');
    } else {
      const list = onDay(c.day).sort(byStart), timed = list.filter((i) => !i.point && !i.dateOnly), pts = list.filter((i) => i.point), dateOnly = list.filter((i) => i.dateOnly);
      h += `<div class="sec"><h3>${e(dayLabel(c.day))}</h3><span class="muted xs">${list.length} item${list.length === 1 ? '' : 's'}</span></div>`;
      if (pts.length) h += `<p class="lbl">Deadlines (not timed blocks)</p>` + pts.map((i) => A.itemCard(i)).join('');
      if (dateOnly.length) h += `<p class="lbl">Date only — time not announced</p>` + dateOnly.map((i) => A.itemCard(i)).join('');
      if (timed.length) h += `<p class="lbl" style="margin-bottom:6px">Timeline</p>` + timeline(timed, c.day === tk);
      if (!list.length) h += empty('calendar', 'Nothing on this day', c.scope === 'my' ? 'Tap + to add a personal event, or switch to All campus.' : 'No campus listings match the filters.');
      if (timed.length) { h += `<div class="sec"><h3>Details</h3></div>` + timed.map((i) => A.itemCard(i)).join(''); }
    }
    h += `<div class="legend" aria-label="Legend">${Object.keys(CAT).map((k) => A.pill(k)).join('')}</div>`;
    return { title: 'Calendar', top, body: h, fab: c.scope === 'my' || true ? `<button class="fab" data-a="go" data-v="personal" aria-label="Add personal event">${ic('plus')}</button>` : '' };
  };
  function timeline(list, isToday) {
    const pxh = 54; let s0 = 24, e0 = 0;
    list.forEach((i) => { const a = new Date(Date.parse(i.start) + 19800000), b = new Date(Date.parse(i.end) + 19800000); s0 = Math.min(s0, a.getUTCHours()); e0 = Math.max(e0, b.getUTCHours() + (b.getUTCMinutes() ? 1 : 0)); });
    s0 = Math.max(0, s0 - 1); e0 = Math.min(24, Math.max(e0 + 1, s0 + 5));
    const mins = (iso) => { const d = new Date(Date.parse(iso) + 19800000); return d.getUTCHours() * 60 + d.getUTCMinutes(); };
    // column layout for overlaps
    const sorted = [...list].sort(byStart); const cols = []; const placed = [];
    sorted.forEach((i) => { let c = 0; while (cols[c] && cols[c] > mins(i.start)) c++; cols[c] = mins(i.end); placed.push({ i, c }); });
    // cluster widths
    placed.forEach((p) => { p.n = 1; placed.forEach((q) => { if (mins(q.i.start) < mins(p.i.end) && mins(p.i.start) < mins(q.i.end)) p.n = Math.max(p.n, q.c + 1, p.c + 1); }); });
    let h = `<div class="tl" style="height:${(e0 - s0) * pxh}px;margin-bottom:8px">`;
    for (let x = s0; x <= e0; x++) h += `<div class="line" style="top:${(x - s0) * pxh}px"></div><div class="hr" style="top:${(x - s0) * pxh}px">${x % 12 || 12}${x < 12 || x === 24 ? 'a' : 'p'}</div>`;
    placed.forEach(({ i, c, n }) => { const top = ((mins(i.start) - s0 * 60) / 60) * pxh, ht = Math.max(26, ((mins(i.end) - mins(i.start)) / 60) * pxh - 2); const w = 100 / n; h += `<button class="ev ${i.cat} ${i.cancelled ? 'cancelled' : ''}" data-a="item" data-v="${e(i.key)}" style="top:${top}px;height:${ht}px;left:calc(${c * w}% + 2px);width:calc(${w}% - 4px)" aria-label="${e(i.title)}, ${e(fmtT(i.start))} to ${e(fmtT(i.end))}">${e(i.title)}<br><span style="font-weight:600">${e(fmtT(i.start))}</span></button>`; });
    if (isToday) { const nm = mins(new Date(nowMs()).toISOString()); if (nm >= s0 * 60 && nm <= e0 * 60) h += `<div class="nowline" style="top:${((nm - s0 * 60) / 60) * pxh}px" aria-hidden="true"></div>`; }
    return h + '</div>';
  }
  Object.assign(A.acts, {
    calscope: (v) => { cal().scope = v; A.render(); }, calview: (v) => { cal().view = v; A.render(); },
    calday: (v) => { cal().day = v; A.render(); }, caltoday: () => { cal().day = todayKey(); A.render(); },
    calshift: (v) => { cal().day = addDays(cal().day, +v); A.render(); },
    calmonth: (v) => { const c = cal(), f = c.day.slice(0, 8) + '01'; c.day = addDays(f, +v > 0 ? 32 : -1).slice(0, 8) + '01'; A.render(); },
    calfilter: () => A.openSheet('calfilter'),
  });
  A.sheets.calfilter = () => {
    const c = cal(); const clubs = S.st.clubs;
    return `<h2>Filters</h2><div class="sp"></div><p class="lbl">Categories</p><div class="row wrap" style="margin:8px 0">${Object.keys(CAT).map((k) => `<button class="chip" data-a="calcat" data-v="${k}" aria-pressed="${c.cats.includes(k)}">${ic(CAT[k][1], 'ico sm')}${CAT[k][0]}</button>`).join('')}</div><div class="field"><label for="fclub">Club</label><select class="input" id="fclub" data-c="calclub"><option value="">All clubs</option>${clubs.map((x) => `<option value="${e(x.id)}" ${c.club === x.id ? 'selected' : ''}>${e(x.name)}</option>`).join('')}</select></div><div class="row"><button class="btn grow" data-a="calclear">Clear filters</button><button class="btn primary grow" data-a="closesheet">Done</button></div>`;
  };
  A.acts.calcat = (k) => { const c = cal(); c.cats = c.cats.includes(k) ? c.cats.filter((x) => x !== k) : [...c.cats, k]; A.render(); };
  A.acts.calclear = () => { const c = cal(); c.cats = Object.keys(CAT); c.club = ''; A.render(); };
  A.inputs.calclub = (v) => { cal().club = v; A.render(); };

  // ---------- ITEM DETAIL SHEETS ----------
  const kv = (rows) => `<dl class="kv">${rows.filter((r) => r[1]).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`;
  const ext = (u, t) => `<a href="${e(u)}" target="_blank" rel="noopener noreferrer">${e(t || u)} ${ic('ext', 'ico sm')}</a>`;
  A.kv = kv; A.ext = ext;
  A.sheets.item = (p) => {
    if (p.t === 'event') return eventSheet(p.id);
    if (p.t === 'por') return A.porSheet(p.id);
    if (p.t === 'personal') return personalSheet(p.id);
    if (p.t === 'career') return A.careerSheet(p.id);
    return '';
  };
  function eventSheet(id) {
    const ev = D.event(id); if (!ev) return empty('info', 'This listing is no longer available', 'It may have been removed or hidden.');
    const saved = D.savedEvent(id), going = D.going(id), cancelled = ev.status === 'cancelled', past = Date.parse(ev.end_at) < nowMs(), club = D.club(ev.club_id);
    const cf = saved ? A.conflictsFor('event:' + id) : [];
    const mgr = D.isManagerOf(ev.club_id);
    const stat = S.st.stats && S.st.stats.rsvp;
    const attended = S.st.portfolio.some((x) => x.type === 'attended' && x.ref_id === id);
    return `<div class="row wrap">${A.pill('campus')}${cancelled ? `<span class="pill bad">${ic('close', 'ico sm')}Cancelled</span>` : past ? '<span class="pill grey">Past</span>' : ''}${ev.version > 1 && !cancelled ? '<span class="pill warn">Updated</span>' : ''}${ev.status === 'draft' ? '<span class="pill grey">Draft (only you)</span>' : ''}${ev.hidden ? '<span class="pill bad">Hidden by admin</span>' : ''}</div>
    <h2 style="margin-top:8px">${e(ev.title)}</h2>
    ${cancelled ? `<div class="banner bad">${ic('alert')}<span><b>Cancelled.</b> ${e(ev.cancel_reason)} ${saved ? 'It stays in your saved history; reminders are off.' : ''}</span></div>` : ''}
    ${ev.hidden ? `<div class="banner bad">${ic('alert')}<span>Hidden by admin: ${e(ev.hidden_reason)}</span></div>` : ''}
    ${cf.length ? `<div class="banner warn">${ic('alert')}<span><b>Overlaps</b> with ${cf.map((c) => e(c.title) + ' (' + e(fmtT(c.start)) + '–' + e(fmtT(c.end)) + ')').join(', ')}. You can keep both.</span></div>` : ''}
    ${kv([['When', `${e(fmtD(ev.start_at))}<br>${e(fmtT(ev.start_at))} – ${e(fmtT(ev.end_at))} IST`], ['Where', e(ev.venue || 'TBA')], ['Organiser', `<button class="link" style="padding:0;min-height:0" data-a="club" data-v="${e(ev.club_id)}">${e(club ? club.name : '')}</button>`], ['Category', e(ev.category)], ['Link', ev.url ? ext(ev.url) : ''], ['Resources', ev.resources ? ext(ev.resources) : ''], ['Contact', e(ev.contact || (club && club.contact) || '')], ['Updated', e(rel(ev.updated_at))]])}
    <p style="margin:12px 0">${e(ev.description)}</p>
    ${mgr && stat ? `<div class="banner info">${ic('users')}<span><b>${stat[ev.id] || 0}</b> student${(stat[ev.id] || 0) === 1 ? '' : 's'} RSVP’d “going” (an RSVP is not attendance).</span></div>` : ''}
    ${ev.status === 'published' && !ev.hidden ? `<div class="row wrap"><button class="btn ${saved ? '' : 'primary'} grow" data-a="savevent" data-v="${id}" aria-pressed="${saved}">${ic('bookmark', 'ico sm')}${saved ? 'Saved — tap to unsave' : 'Save to my schedule'}</button></div><div class="sp"></div>
    ${!cancelled && !past ? `<button class="btn block ${going ? 'primary' : ''}" data-a="rsvp" data-v="${id}" aria-pressed="${going}">${ic('check', 'ico sm')}${going ? 'You’re going — tap to undo' : 'RSVP: I’m going'}</button><p class="xs muted sp">RSVP is shared with organisers as a count only. Saving stays private.</p>` : ''}
    ${saved && !cancelled && !past ? `<p class="sm muted">${ic('bell', 'ico sm')} Reminders: ${S.st.me.prefs.eventOffsets.map((m) => (m >= 60 ? m / 60 + 'h' : m + 'm')).join(' & ')} before (change in Settings).</p>` : ''}
    ${past && !attended ? `<div class="sp"></div><button class="btn block" data-a="attended" data-v="${id}">I attended this (self-report to my portfolio)</button>` : ''}` : ''}
    <div class="sp2"></div><div class="row wrap">${mgr && ev.status !== 'cancelled' ? `<button class="btn sm" data-a="editevent" data-v="${id}">${ic('edit', 'ico sm')}Edit / cancel</button>` : ''}<button class="btn ghost sm" data-a="report" data-v="event:${id}">Report a problem</button></div>`;
  }
  function personalSheet(id) {
    const p = D.personal(id); if (!p) return empty('info', 'Not found', '');
    const cf = A.conflictsFor('personal:' + id);
    return `<div class="row">${A.pill('personal')}<span class="pill grey">${ic('lock', 'ico sm')}Private to you</span></div><h2 style="margin-top:8px">${e(p.title)}</h2>${cf.length ? `<div class="banner warn">${ic('alert')}<span><b>Overlaps</b> with ${cf.map((c) => e(c.title)).join(', ')}.</span></div>` : ''}${kv([['When', `${e(fmtD(p.start_at))}<br>${e(fmtT(p.start_at))} – ${e(fmtT(p.end_at))} IST`], ['Where', e(p.venue)], ['Notes', e(p.description)], ['Reminder', p.reminder_min ? p.reminder_min + ' min before' : 'None']])}<div class="sp2"></div><div class="row"><button class="btn grow" data-a="editpersonal" data-v="${id}">${ic('edit', 'ico sm')}Edit</button><button class="btn danger grow" data-a="delpersonal" data-v="${id}">${ic('trash', 'ico sm')}Delete</button></div>`;
  }
  Object.assign(A.acts, {
    savevent: async (id) => { let cf = []; const was = D.savedEvent(id); const r = await doit(async () => { if (was) await api('DELETE', `/api/events/${id}/save`); else { const x = await api('POST', `/api/events/${id}/save`); cf = x.conflicts || []; } }); if (r) toast(was ? 'Removed from your schedule' : cf.length ? 'Saved — overlaps with ' + cf.map((c) => c.title).join(', ') + '. You can keep both.' : 'Saved to your schedule'); },
    rsvp: (id) => doit(() => api('POST', `/api/events/${id}/rsvp`, { going: !D.going(id) }), null).then((r) => { if (r) toast(D.going(id) ? 'RSVP confirmed — you’re going' : 'RSVP removed'); }),
    attended: (id) => { const ev = D.event(id); doit(() => api('POST', '/api/portfolio', { type: 'attended', club: clubName(ev.club_id), role: 'Attended: ' + ev.title + ' (self-reported)', ref_id: id }), 'Added to your portfolio as self-reported'); },
    editpersonal: (id) => { S.sheet = null; A.go('personal', { id }); },
    delpersonal: (id) => A.openSheet('confirm', { msg: 'Delete this private event? Pending reminders are removed too.', act: 'delpersonal2', v: id, label: 'Delete' }),
    delpersonal2: (id) => doit(async () => { await api('DELETE', `/api/personal/${id}`); S.sheet = null; }, 'Event deleted'),
    club: (id) => { S.sheet = null; A.go('club', { id }); },
    report: (v) => A.openSheet('report', { v }, { form: true }),
    editevent: (id) => { S.sheet = null; A.go('eventform', { id }); },
  });
  A.sheets.confirm = (p) => `<h2>Are you sure?</h2><p style="margin:8px 0 16px">${e(p.msg)}</p><div class="row"><button class="btn grow" data-a="closesheet">Cancel</button><button class="btn ${p.danger === false ? 'primary' : 'danger'} grow" data-a="${p.act}" data-v="${e(p.v || '')}">${e(p.label || 'Confirm')}</button></div>`;
  A.sheets.report = (p) => `<h2>Report a problem</h2><p class="muted sm">Reports go to the workspace admin. This doesn’t hide the listing.</p><form data-f="report" data-v="${e(p.v)}"><div class="field"><label for="rr">What’s wrong?</label><textarea class="input" id="rr" name="reason" required maxlength="300"></textarea></div><button class="btn primary block" type="submit">Send report</button></form>`;
  A.forms.report = (f) => { const [t, id] = f.dataset.v.split(':'); doit(async () => { await api('POST', '/api/report', { item_type: t, item_id: id, reason: f.reason.value }); S.sheet = null; }, 'Report sent to admin'); };

  // ---------- WHAT'S NEW ----------
  A.views.whatsnew = () => {
    const w = A.whatsNew(), t = S.ui.wn || 'events', conn = S.st.career.conn.connected;
    const tabs = [['events', 'Events', w.events.filter((x) => A.unread('event', x)).length], ['apps', 'Applications', w.pors.filter((x) => A.unread('por', x)).length], ['updates', 'Updates', w.updates.filter(w.unreadU).length]];
    if (conn) tabs.push(['career', 'Career', 0]);
    let h = `<div class="banner info">${ic('clock')}<span>Showing items <b>published in the last 48 hours</b> (by publish time, not event date).</span></div><div class="seg" role="tablist">${tabs.map(([k, l, c]) => `<button role="tab" data-a="wntab" data-v="${k}" aria-pressed="${t === k}">${l}${c ? ` (${c})` : ''}</button>`).join('')}</div><div class="sp2"></div>`;
    const pub = (iso) => `<span class="xs muted">Published ${e(rel(iso))}</span>`;
    if (t === 'events') h += w.events.length ? w.events.map((x) => `<button class="card tap accent-l campus" data-a="item" data-v="event:${x.id}"><div class="row wrap">${A.pill('campus')}${A.unread('event', x) ? '<span class="pill new">NEW</span>' : ''}${pub(x.published_at)}</div><h3 style="margin-top:6px">${e(x.title)}</h3><p class="sm muted">${ic('clock', 'ico sm')} ${e(fmtDT(x.start_at))}</p><p class="xs muted">${e(clubName(x.club_id))}</p></button>`).join('') : empty('spark', 'Nothing new in 48 hours', 'Check the calendar for everything upcoming.', `<button class="btn sm" data-a="tab" data-v="cal">Open calendar</button>`);
    if (t === 'apps') h += w.pors.length ? w.pors.map((x) => `<button class="card tap accent-l por" data-a="item" data-v="por:${x.id}"><div class="row wrap">${A.statusPill(x)}${A.unread('por', x) ? '<span class="pill new">NEW</span>' : ''}${pub(x.published_at)}</div><h3 style="margin-top:6px">${e(x.title)}</h3><p class="sm muted">${e(clubName(x.club_id))} · closes ${e(fmtDT(x.closes_at))}</p></button>`).join('') : empty('flag', 'No new applications', 'New PORs show up here for 48 hours.', `<button class="btn sm" data-a="tab" data-v="por">Browse all PORs</button>`);
    if (t === 'updates') h += w.updates.length ? w.updates.map((u) => `<button class="card tap" data-a="item" data-v="${u.item_type}:${u.item_id}"><div class="row wrap"><span class="pill ${u.kind === 'cancel' || u.kind === 'close' ? 'bad' : 'warn'}">${{ cancel: 'Cancelled', reschedule: 'Rescheduled', close: 'Closed early', edit: 'Edited' }[u.kind] || 'Updated'}</span>${w.unreadU(u) ? '<span class="pill new">NEW</span>' : ''}<span class="xs muted">${e(rel(u.at))}</span></div><h3 style="margin-top:6px">${e(u.item.title)}</h3><p class="sm muted">${e(u.summary)}</p></button>`).join('') : empty('refresh', 'No reschedules or cancellations', 'Changes to listings in the last 48 hours appear here.');
    if (t === 'career') h += w.careerN.length ? w.careerN.map((n) => `<button class="card tap" data-a="notif" data-v="${n.id}"><span class="pill placement">Career</span><h3 style="margin-top:6px">${e(n.title)}</h3><p class="sm muted">${e(n.body)}</p></button>`).join('') : empty('briefcase', 'No career updates', 'Changes from your connected demo portal show here.');
    return { title: 'What’s New', body: h };
  };
  A.acts.wntab = (v) => { S.ui.wn = v; A.render(); };

  // ---------- NOTIFICATIONS ----------
  A.views.notifs = () => {
    const f = S.ui.nf || 'all'; const all = S.st.notifications;
    const list = all.filter((n) => f === 'all' || (f === 'reminder' && n.type === 'reminder') || (f === 'update' && n.type === 'update') || (f === 'career' && n.type === 'career') || (f === 'other' && !['reminder', 'update', 'career'].includes(n.type)));
    const chips = [['all', 'All'], ['reminder', 'Reminders'], ['update', 'Updates'], ['career', 'Career'], ['other', 'Other']];
    let h = `<div class="chips">${chips.map(([k, l]) => `<button class="chip" data-a="nfilter" data-v="${k}" aria-pressed="${f === k}">${l}</button>`).join('')}</div><div class="row" style="margin-bottom:8px"><span class="muted sm grow">${A.unreadNotifs()} unread · in-app delivery</span><button class="btn sm" data-a="readall" ${A.unreadNotifs() ? '' : 'disabled'}>Mark all read</button></div>`;
    h += list.length ? list.map((n) => `<button class="card tap" data-a="notif" data-v="${n.id}" style="${n.read_at ? 'opacity:.85' : 'border-left:5px solid var(--accent)'}"><div class="row wrap"><span class="pill ${n.type === 'reminder' ? 'por' : n.type === 'update' ? 'warn' : n.type === 'career' ? 'placement' : 'grey'}">${e({ reminder: 'Reminder', update: 'Update', career: 'Career', role: 'Role', moderation: 'Moderation' }[n.type] || n.type)}</span>${n.read_at ? '' : '<span class="pill new">Unread</span>'}<span class="xs muted">${e(rel(n.created_at))}</span></div><p class="b" style="margin-top:6px">${e(n.title)}</p>${n.body ? `<p class="sm muted">${e(n.body)}</p>` : ''}</button>`).join('') : empty('bell', 'No notifications here', 'Reminders for saved items and updates to them appear in this inbox.');
    return { title: 'Notifications', body: h };
  };
  A.acts.nfilter = (v) => { S.ui.nf = v; A.render(); };
  A.acts.readall = () => doit(() => api('POST', '/api/notifications/read', { all: true }), 'All marked as read');
  A.acts.notif = (id) => {
    const n = S.st.notifications.find((x) => x.id === id); if (!n) return;
    if (!n.read_at) api('POST', '/api/notifications/read', { id }).then(() => A.poll(true));
    if (n.link_type === 'event' || n.link_type === 'por') A.acts.item(n.link_type + ':' + n.link_id);
    else if (n.link_type === 'personal') A.openSheet('item', { t: 'personal', id: n.link_id });
    else if (n.link_type === 'career') A.openSheet('item', { t: 'career', id: n.link_id });
  };
})();
