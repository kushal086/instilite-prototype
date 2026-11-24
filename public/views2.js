'use strict';
// Views part 2: PORs, Clubs, Profile/portfolio/settings, Seniors, Personal event form, Career.
(function () {
  const S = A.S, { e, ic, D, fmtT, fmtD, fmtDT, rel, nowMs, api, doit, toast, empty, kv, ext } = A;
  const clubName = A.clubName;

  // ---------- PORs ----------
  const pst = () => (S.ui.por = S.ui.por || { q: '', status: 'open', saved: false, sphere: '', club: '', sort: 'deadline' });
  function porList() {
    const f = pst(); const q = f.q.toLowerCase();
    let l = S.st.pors.filter((p) => p.status !== 'draft');
    l = l.filter((p) => {
      const c = D.club(p.club_id) || {}; const st = A.porStatus(p);
      if (q && !(p.title + ' ' + (c.name || '')).toLowerCase().includes(q)) return false;
      if (f.status !== 'all' && st !== f.status) return false;
      if (f.saved && !D.savedPor(p.id)) return false;
      if (f.sphere && c.sphere !== f.sphere) return false;
      if (f.club && p.club_id !== f.club) return false;
      return true;
    });
    const rank = (p) => ({ open: 0, upcoming: 1, closed: 2, cancelled: 3 }[A.porStatus(p)] ?? 4);
    l.sort(f.sort === 'newest' ? (a, b) => Date.parse(b.published_at || 0) - Date.parse(a.published_at || 0) : (a, b) => rank(a) - rank(b) || (rank(a) >= 2 ? Date.parse(b.closes_at) - Date.parse(a.closes_at) : Date.parse(a.closes_at) - Date.parse(b.closes_at)));
    if (!l.length) return empty('flag', 'No applications match', f.status === 'open' ? 'No open PORs with these filters. Try “All” or clear filters.' : 'Try clearing filters.', `<button class="btn sm" data-a="porclear">Clear filters</button>`);
    return l.map((p) => { const sp = D.savedPor(p.id), st = A.porStatus(p);
      return `<div class="card accent-l por"><div class="row" style="align-items:flex-start"><button class="grow" data-a="item" data-v="por:${p.id}" style="all:unset;cursor:pointer;flex:1;min-width:0;display:block" aria-label="${e(p.title)}, ${e(clubName(p.club_id))}"><div class="row wrap">${A.statusPill(p)}${A.unread('por', p) && st !== 'closed' ? '<span class="pill new">NEW</span>' : ''}${sp ? `<span class="pill ok">Saved · ${e(sp.app_status)}</span>` : ''}</div><h3 style="margin-top:6px">${e(p.title)}</h3><p class="sm muted">${e(clubName(p.club_id))}</p><p class="sm" style="color:${st === 'open' && Date.parse(p.closes_at) - nowMs() < 72 * 36e5 ? 'var(--danger)' : 'var(--text2)'}">${ic('clock', 'ico sm')} ${st === 'closed' ? 'Closed ' + e(fmtD(p.closes_at)) : st === 'upcoming' ? 'Opens ' + e(fmtDT(p.opens_at)) : 'Closes ' + e(rel(p.closes_at)) + ' · ' + e(fmtDT(p.closes_at))}</p></button><button class="iconbtn" data-a="saveporlist" data-v="${p.id}" aria-pressed="${!!sp}" aria-label="${sp ? 'Unsave' : 'Save'} ${e(p.title)}" style="${sp ? 'color:var(--accent)' : ''}">${sp ? `<svg class="ico" viewBox="0 0 24 24" style="fill:currentColor"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>` : ic('bookmark')}</button></div></div>`; }).join('');
  }
  A.views.por = () => {
    const f = pst();
    const top = `<div style="padding:10px 14px 0;background:var(--surface);border-bottom:1px solid var(--border)"><div class="row"><div class="grow" style="position:relative"><label class="sr" for="porq" style="position:absolute;left:-9999px">Search PORs</label><input class="input" id="porq" data-i="porq" type="search" placeholder="Search role or club" value="${e(f.q)}"></div><button class="btn sm" data-a="porfilter" aria-label="More filters">${ic('sliders', 'ico sm')}${(f.sphere ? 1 : 0) + (f.club ? 1 : 0) + (f.sort !== 'deadline' ? 1 : 0) || ''}</button></div><div class="chips" style="padding-top:8px">${['open', 'upcoming', 'closed', 'all'].map((k) => `<button class="chip" data-a="porstatus" data-v="${k}" aria-pressed="${f.status === k}">${k[0].toUpperCase() + k.slice(1)}</button>`).join('')}<button class="chip" data-a="porsaved" aria-pressed="${f.saved}">${ic('bookmark', 'ico sm')}Saved</button></div></div>`;
    return { title: 'PORs', top, body: `<div id="porlist">${porList()}</div><p class="xs muted tc">Applications happen on each club’s own form. InstiLite never submits for you.</p>` };
  };
  A.inputs.porq = (v) => { pst().q = v; $('#porlist').innerHTML = porList(); };
  const $ = A.$;
  Object.assign(A.acts, {
    porstatus: (v) => { pst().status = v; A.render(); }, porsaved: () => { pst().saved = !pst().saved; A.render(); },
    porclear: () => { S.ui.por = { q: '', status: 'all', saved: false, sphere: '', club: '', sort: 'deadline' }; A.render(); }, porfilter: () => A.openSheet('porfilter'),
    saveporlist: (id) => doit(async () => { if (D.savedPor(id)) await api('DELETE', `/api/pors/${id}/save`); else await api('POST', `/api/pors/${id}/save`); }),
  });
  A.sheets.porfilter = () => { const f = pst(); const spheres = [...new Set(S.st.clubs.map((c) => c.sphere))];
    return `<h2>Filter & sort</h2><div class="sp"></div><div class="field"><label for="psp">Sphere</label><select class="input" id="psp" data-c="porsphere"><option value="">All spheres</option>${spheres.map((s) => `<option ${f.sphere === s ? 'selected' : ''}>${e(s)}</option>`).join('')}</select></div><div class="field"><label for="pcl">Club</label><select class="input" id="pcl" data-c="porclub"><option value="">All clubs</option>${S.st.clubs.map((c) => `<option value="${e(c.id)}" ${f.club === c.id ? 'selected' : ''}>${e(c.name)}</option>`).join('')}</select></div><div class="field"><label for="pso">Sort by</label><select class="input" id="pso" data-c="porsort"><option value="deadline" ${f.sort === 'deadline' ? 'selected' : ''}>Closing soonest</option><option value="newest" ${f.sort === 'newest' ? 'selected' : ''}>Newest first</option></select></div><div class="row"><button class="btn grow" data-a="porclear">Clear all</button><button class="btn primary grow" data-a="closesheet">Done</button></div>`; };
  Object.assign(A.inputs, { porsphere: (v) => { pst().sphere = v; A.render(); }, porclub: (v) => { pst().club = v; A.render(); }, porsort: (v) => { pst().sort = v; A.render(); } });

  A.porSheet = (id) => {
    const p = D.por(id); if (!p) return empty('info', 'This listing is no longer available', '');
    const st = A.porStatus(p), sp = D.savedPor(id), club = D.club(p.club_id), mgr = D.isManagerOf(p.club_id), stats = S.st.stats && S.st.stats.clicks;
    const canApply = st === 'open';
    return `<div class="row wrap">${A.pill('por')}${A.statusPill(p)}${p.version > 1 && st !== 'cancelled' ? '<span class="pill warn">Updated</span>' : ''}${p.status === 'draft' ? '<span class="pill grey">Draft (only you)</span>' : ''}${p.hidden ? '<span class="pill bad">Hidden by admin</span>' : ''}</div><h2 style="margin-top:8px">${e(p.title)}</h2>
    ${st === 'cancelled' ? `<div class="banner bad">${ic('alert')}<span><b>Cancelled.</b> ${e(p.cancel_reason)}</span></div>` : ''}${st === 'closed' ? `<div class="banner bad">${ic('close')}<span>Applications closed ${e(fmtDT(p.closes_at))}.</span></div>` : ''}
    ${kv([['Club', `<button class="link" style="padding:0;min-height:0" data-a="club" data-v="${e(p.club_id)}">${e(club ? club.name : '')}</button>`], ['Opens', e(fmtDT(p.opens_at))], ['Closes', `${e(fmtDT(p.closes_at))} IST`], ['Eligibility', e(p.eligibility || 'Not specified')], ['Contact', e(p.contact)], ['Updated', e(rel(p.updated_at))]])}
    <p style="margin:12px 0">${e(p.description)}</p>
    ${mgr && stats ? `<div class="banner info">${ic('users')}<span><b>${stats[p.id] || 0}</b> unique student${(stats[p.id] || 0) === 1 ? '' : 's'} opened the application link. This is a click count, not submissions.</span></div>` : ''}
    ${sp ? `<div class="card" style="background:var(--canvas);box-shadow:none"><p class="lbl">Your status (private, self-reported)</p><div class="seg" style="margin-top:6px" role="group">${['interested', 'applied', 'withdrawn'].map((k) => `<button data-a="trackpor" data-v="${p.id}|${k}" aria-pressed="${sp.app_status === k}">${k[0].toUpperCase() + k.slice(1)}</button>`).join('')}</div><div class="toggle"><span class="sm">Show deadline on my calendar</span><button class="sw" role="switch" aria-checked="${!!sp.on_calendar}" data-a="porcal" data-v="${p.id}" aria-label="Show deadline on my calendar"></button></div></div>` : ''}
    ${p.status === 'published' && !p.hidden ? `<div class="row wrap"><button class="btn ${sp ? '' : 'primary'} grow" data-a="saveporlist" data-v="${p.id}" aria-pressed="${!!sp}">${ic('bookmark', 'ico sm')}${sp ? 'Saved — tap to unsave' : 'Save & add deadline'}</button></div><div class="sp"></div><button class="btn ${canApply ? 'primary' : ''} block" data-a="applypor" data-v="${p.id}" ${canApply ? '' : 'disabled'}>${ic('ext', 'ico sm')}${canApply ? 'Apply on club’s site' : st === 'upcoming' ? 'Not open yet' : 'Applications closed'}</button><p class="xs muted sp">Opens the club’s own form in a new tab. Clicking never marks you as applied — update your status yourself.</p>` : ''}
    <div class="sp2"></div><div class="row wrap">${mgr && !['cancelled'].includes(p.status) ? `<button class="btn sm" data-a="editpor" data-v="${p.id}">${ic('edit', 'ico sm')}Edit / close</button>` : ''}<button class="btn ghost sm" data-a="report" data-v="por:${p.id}">Report a problem</button></div>`;
  };
  Object.assign(A.acts, {
    trackpor: (v) => { const [id, k] = v.split('|'); doit(() => api('PUT', `/api/pors/${id}/track`, { app_status: k }), 'Status updated (private)'); },
    porcal: (id) => doit(() => api('PUT', `/api/pors/${id}/track`, { on_calendar: !D.savedPor(id).on_calendar })),
    applypor: (id) => { const p = D.por(id); if (!p || !/^https?:\/\//.test(p.url)) return toast('This link looks unsafe and was blocked', 'bad'); window.open(p.url, '_blank', 'noopener,noreferrer'); api('POST', `/api/pors/${id}/click`).then(() => A.poll(true)).catch(() => {}); toast('Opened the club’s application page. You are not marked as applied.'); },
    editpor: (id) => { S.sheet = null; A.go('porform', { id }); },
  });

  // ---------- CLUBS ----------
  A.views.clubs = () => {
    const q = (S.ui.clubq || '').toLowerCase();
    return { title: 'Clubs & Teams', top: `<div style="padding:10px 14px;background:var(--surface);border-bottom:1px solid var(--border)"><label for="cq" style="position:absolute;left:-9999px">Search clubs</label><input class="input" id="cq" data-i="clubq" type="search" placeholder="Search clubs or keywords (e.g. design, fest)" value="${e(S.ui.clubq || '')}"></div>`, body: `<div id="clublist">${clubList(q)}</div>` };
  };
  function clubList(q) {
    const cl = S.st.clubs.filter((c) => !q || (c.name + ' ' + c.description + ' ' + c.sphere).toLowerCase().includes(q));
    if (!cl.length) return empty('users', 'No clubs match', 'Try another keyword.');
    const spheres = [...new Set(cl.map((c) => c.sphere))];
    return spheres.map((s) => `<div class="sec"><h3>${e(s)}</h3></div>` + cl.filter((c) => c.sphere === s).map((c) => {
      const ne = S.st.events.filter((x) => x.club_id === c.id && x.status === 'published' && Date.parse(x.end_at) > nowMs()).length, np = S.st.pors.filter((x) => x.club_id === c.id && A.porStatus(x) === 'open').length;
      return `<button class="card tap" data-a="club" data-v="${e(c.id)}"><div class="row"><div class="avatar">${e(c.name.slice(0, 2).toUpperCase())}</div><div class="grow"><h3>${e(c.name)}${c.hidden ? ' (hidden)' : ''}</h3><p class="sm muted">${ne} upcoming event${ne === 1 ? '' : 's'} · ${np} open POR${np === 1 ? '' : 's'}</p></div>${ic('chev')}</div></button>`;
    }).join('')).join('');
  }
  A.inputs.clubq = (v) => { S.ui.clubq = v; $('#clublist').innerHTML = clubList(v.toLowerCase()); };
  A.views.club = (p) => {
    const c = D.club(p.id); if (!c) return { title: 'Club', body: empty('info', 'Club not found', '') };
    const t = S.ui.ct || 'events', mgr = D.isManagerOf(c.id);
    const evs = S.st.events.filter((x) => x.club_id === c.id && x.status !== 'draft').sort((a, b) => Date.parse(a.start_at) - Date.parse(b.start_at));
    const pors = S.st.pors.filter((x) => x.club_id === c.id && x.status !== 'draft');
    const mem = S.st.members.filter((m) => m.club_id === c.id);
    let h = `<div class="card"><div class="row"><div class="avatar">${e(c.name.slice(0, 2).toUpperCase())}</div><div class="grow"><h3>${e(c.name)}</h3><span class="pill grey">${e(c.sphere)}</span></div></div><p class="sm" style="margin-top:8px">${e(c.description)}</p>${mgr ? `<div class="sp"></div><button class="btn primary sm" data-a="go" data-v="manage">${ic('edit', 'ico sm')}Manage this club</button>` : ''}</div><div class="seg" role="tablist">${[['events', 'Events'], ['pors', 'PORs'], ['members', 'Members'], ['about', 'About']].map(([k, l]) => `<button data-a="clubtab" data-v="${k}" aria-pressed="${t === k}">${l}</button>`).join('')}</div><div class="sp2"></div>`;
    if (t === 'events') h += evs.length ? evs.map((x) => A.itemCard({ key: 'event:' + x.id, type: 'event', cat: 'campus', title: x.title, start: x.start_at, end: x.end_at, club: x.club_id, cancelled: x.status === 'cancelled', ref: x }, { showDay: true })).join('') : empty('calendar', 'No events yet', 'This club hasn’t published any events.');
    if (t === 'pors') h += pors.length ? pors.map((x) => `<button class="card tap accent-l por" data-a="item" data-v="por:${x.id}"><div class="row wrap">${A.statusPill(x)}</div><h3 style="margin-top:6px">${e(x.title)}</h3><p class="sm muted">Closes ${e(fmtDT(x.closes_at))}</p></button>`).join('') : empty('flag', 'No applications', 'No PORs published by this club.');
    if (t === 'members') h += mem.length ? mem.map((m) => `<div class="card row"><div class="avatar">${e(m.display_name.slice(0, 1))}</div><div class="grow"><b>${e(m.display_name)}</b><p class="sm muted">${e(m.role_label)}</p></div></div>`).join('') + '<p class="xs muted">Display roles are labels only — they don’t grant publishing access.</p>' : empty('users', 'No members listed', '');
    if (t === 'about') h += `<div class="card">${kv([['Website', c.website ? ext(c.website) : ''], ['Contact', e(c.contact)], ['Sphere', e(c.sphere)]])}<p class="xs muted sp">Demo record — no official affiliation implied.</p></div>`;
    return { title: c.name, body: h };
  };
  A.acts.clubtab = (v) => { S.ui.ct = v; A.render(); };

  // ---------- PROFILE ----------
  const row = (icon, label, sub, act, v) => `<button class="card tap" data-a="${act}" ${v ? `data-v="${v}"` : ''} style="margin-bottom:8px"><div class="row">${ic(icon)}<div class="grow"><b>${label}</b>${sub ? `<p class="sm muted">${sub}</p>` : ''}</div>${ic('chev')}</div></button>`;
  A.views.me = () => {
    const me = S.st.me, vis = me.vis;
    const ini = me.name.split(' ').map((x) => x[0]).slice(0, 2).join('');
    let h = `<div class="card"><div class="row"><div class="avatar">${e(ini)}</div><div class="grow"><h3>${e(me.name)}</h3><p class="sm muted">${e([me.dept, me.year].filter(Boolean).join(' · '))}</p></div><span class="pill ok">${D.role()}</span></div>${me.bio ? `<p class="sm" style="margin-top:8px">${e(me.bio)}</p>` : ''}${me.interests ? `<p class="xs muted sp">Interests: ${e(me.interests)}</p>` : ''}<div class="sp"></div><button class="btn sm" data-a="go" data-v="profileform">${ic('edit', 'ico sm')}Edit profile</button></div>`;
    h += `<div class="sec"><h3>Visibility to other students</h3></div><div class="card">` + [['discoverable', 'Show me in senior search', 'Opt-in. Off = you never appear in results.'], ['dept', 'Show department', ''], ['year', 'Show year', ''], ['interests', 'Show interests', ''], ['portfolio', 'Show POR history', ''], ['linkedin', 'Show LinkedIn link', 'Only if you added one.'], ['contact', 'Show contact', 'Contact CTA appears only if shared.']].map(([k, l, s]) => `<div class="toggle"><div><b class="sm">${l}</b>${s ? `<p class="xs muted">${s}</p>` : ''}</div><button class="sw" role="switch" aria-checked="${!!vis[k]}" data-a="vis" data-v="${k}" aria-label="${l}"></button></div>`).join('') + `<p class="xs muted sp">Email, roll number and phone are never shown.</p></div>`;
    const pf = S.st.portfolio;
    h += `<div class="sec"><h3>Portfolio</h3><button class="link" data-a="go" data-v="pfform">+ Add</button></div>` + (pf.length ? pf.map((x) => `<div class="card"><div class="row wrap"><span class="pill ${x.type === 'por' ? 'por' : 'grey'}">${x.type === 'por' ? 'POR' : 'Attended'}</span><span class="pill grey">Self-reported · not verified</span></div><b style="display:block;margin-top:6px">${e(x.role)}</b><p class="sm muted">${e(x.club)}${x.tenure ? ' · ' + e(x.tenure) : ''}</p>${x.description ? `<p class="sm">${e(x.description)}</p>` : ''}<div class="row sp"><button class="btn sm" data-a="pfedit" data-v="${x.id}">Edit</button><button class="btn sm" data-a="pfdel" data-v="${x.id}">Delete</button></div></div>`).join('') : empty('user', 'Nothing here yet', 'Add PORs you’ve held or events you attended. Saving or time passing never counts as attendance.'));
    h += `<div class="sec"><h3>More</h3></div>` + row('briefcase', 'Career calendar', S.st.career.conn.connected ? 'Connected (demo portal)' : 'Not connected', 'go', 'career') + row('search', 'Find seniors', 'Opt-in profiles only', 'go', 'seniors') + row('sliders', 'Settings & reminders', 'Reminder timing, notifications, privacy', 'go', 'settings') + (me.role_type === 'student' && !me.managed.length ? row('shield', 'Request club manager access', 'An admin must verify and assign it', 'reqrole') : '') + row('info', 'Demo tools & about', 'Workspace link, permission checks, reset', 'go', 'tools');
    h += `<button class="btn block" data-a="signout" style="margin-top:8px">Sign out</button>`;
    return { title: 'Profile', body: h };
  };
  Object.assign(A.acts, {
    vis: (k) => doit(() => api('PUT', '/api/profile', { vis: { [k]: !S.st.me.vis[k] } }), 'Visibility updated'),
    signout: () => A.signOut(),
    pfedit: (id) => A.go('pfform', { id }),
    pfdel: (id) => A.openSheet('confirm', { msg: 'Remove this entry from your portfolio?', act: 'pfdel2', v: id, label: 'Remove' }),
    pfdel2: (id) => doit(async () => { await api('DELETE', `/api/portfolio/${id}`); S.sheet = null; }, 'Entry removed'),
    reqrole: () => A.openSheet('reqrole', {}, { form: true }),
  });
  A.sheets.reqrole = () => `<h2>Request manager access</h2><p class="muted sm">An admin checks your request against the club roster. You can’t approve it yourself.</p><form data-f="reqrole"><div class="field"><label for="rc">Club</label><select class="input" id="rc" name="club_id">${S.st.clubs.map((c) => `<option value="${e(c.id)}">${e(c.name)}</option>`).join('')}</select></div><div class="field"><label for="rn">Why do you need access?</label><textarea class="input" id="rn" name="note" maxlength="300"></textarea></div><button class="btn primary block" type="submit">Send request</button></form>${S.st.my_requests.length ? `<p class="lbl" style="margin-top:12px">Your requests</p>${S.st.my_requests.map((r) => `<p class="sm">${e(clubName(r.club_id))} — <b>${e(r.status)}</b></p>`).join('')}` : ''}`;
  A.forms.reqrole = (f) => doit(async () => { await api('POST', '/api/role-requests', { club_id: f.club_id.value, note: f.note.value }); S.sheet = null; }, 'Request sent to admin');

  const fld = (label, name, val = '', o = {}) => `<div class="field"><label for="f_${name}">${label}${o.req ? ' *' : ''}</label>${o.area ? `<textarea class="input" id="f_${name}" name="${name}" maxlength="${o.max || 300}" ${o.req ? 'required' : ''}>${e(val)}</textarea>` : o.sel ? `<select class="input" id="f_${name}" name="${name}">${o.sel.map(([v, l]) => `<option value="${e(v)}" ${String(v) === String(val) ? 'selected' : ''}>${e(l)}</option>`).join('')}</select>` : `<input class="input" id="f_${name}" name="${name}" type="${o.type || 'text'}" value="${e(val)}" ${o.req ? 'required' : ''} ${o.ph ? `placeholder="${e(o.ph)}"` : ''} maxlength="${o.max || 160}" ${o.step ? `step="${o.step}"` : ''}>`}${o.hint ? `<span class="xs muted">${o.hint}</span>` : ''}</div>`;
  A.fld = fld;
  A.views.profileform = () => { const m = S.st.me; return { title: 'Edit profile', form: true, body: `<form data-f="profile"><div class="banner info">${ic('lock')}<span>Your email and roll number are never shown to others.</span></div>${fld('Department', 'dept', m.dept)}${fld('Year', 'year', m.year)}${fld('Short bio', 'bio', m.bio, { area: true })}${fld('Interests (comma separated)', 'interests', m.interests)}${fld('LinkedIn URL (optional)', 'linkedin', m.linkedin, { type: 'url', ph: 'https://…' })}${fld('Contact (optional, shared only if you allow)', 'contact', m.contact)}<button class="btn primary block" type="submit">Save profile</button></form>` }; };
  A.forms.profile = (f) => doit(async () => { await api('PUT', '/api/profile', { dept: f.dept.value, year: f.year.value, bio: f.bio.value, interests: f.interests.value, linkedin: f.linkedin.value, contact: f.contact.value }); A.back(); }, 'Profile saved');
  A.views.pfform = (p) => { const x = p.id ? S.st.portfolio.find((z) => z.id === p.id) : null; return { title: x ? 'Edit entry' : 'Add to portfolio', form: true, body: `<form data-f="pf" data-id="${e(p.id || '')}">${x ? '' : fld('Type', 'type', 'por', { sel: [['por', 'POR I held / hold'], ['attended', 'Event I attended (self-report)']] })}${fld('Club / organisation', 'club', x ? x.club : '', { req: true })}${fld('Role or event', 'role', x ? x.role : '', { req: true })}${fld('Tenure (e.g. 2024–25)', 'tenure', x ? x.tenure : '')}${fld('Description', 'description', x ? x.description : '', { area: true })}<p class="xs muted">Entries are self-reported and marked “not verified”.</p><button class="btn primary block" type="submit">Save</button></form>` }; };
  A.forms.pf = (f) => { const id = f.dataset.id; doit(async () => { const b = { club: f.club.value, role: f.role.value, tenure: f.tenure.value, description: f.description.value }; if (id) await api('PUT', `/api/portfolio/${id}`, b); else await api('POST', '/api/portfolio', { ...b, type: f.type.value }); A.back(); }, 'Portfolio saved'); };

  // settings
  A.views.settings = () => {
    const p = S.st.me.prefs; const chip = (kind, m, l) => `<button class="chip" data-a="offset" data-v="${kind}|${m}" aria-pressed="${p[kind].includes(m)}">${l}</button>`;
    return { title: 'Settings', body: `<div class="card"><h3>Reminder timing</h3><p class="sm muted">Applies to saved events, saved POR deadlines and career items. Reminders already past are never created.</p><p class="lbl" style="margin-top:10px">Before events</p><div class="row wrap" style="margin-top:6px">${chip('eventOffsets', 15, '15 min')}${chip('eventOffsets', 60, '1 hour')}${chip('eventOffsets', 120, '2 hours')}${chip('eventOffsets', 1440, '24 hours')}</div><p class="lbl" style="margin-top:10px">Before deadlines</p><div class="row wrap" style="margin-top:6px">${chip('deadlineOffsets', 60, '1 hour')}${chip('deadlineOffsets', 120, '2 hours')}${chip('deadlineOffsets', 1440, '24 hours')}${chip('deadlineOffsets', 2880, '2 days')}</div></div>
    <div class="card"><h3>Delivery</h3><div class="toggle"><div><b class="sm">In-app inbox</b><p class="xs muted">Always on in this prototype.</p></div><button class="sw" role="switch" aria-checked="true" disabled aria-label="In-app inbox (required)"></button></div><div class="toggle"><div><b class="sm">Browser push</b><p class="xs muted">Not available in this demo — no push is sent.</p></div><button class="sw" role="switch" aria-checked="false" disabled aria-label="Browser push (unavailable)"></button></div><div class="toggle"><div><b class="sm">Email</b><p class="xs muted">Not available in this demo — no email is sent.</p></div><button class="sw" role="switch" aria-checked="false" disabled aria-label="Email (unavailable)"></button></div><div class="toggle"><div><b class="sm">Add POR deadline to my schedule when I save</b></div><button class="sw" role="switch" aria-checked="${!!p.autoDeadline}" data-a="autodl" aria-label="Auto-add deadline"></button></div></div>
    <div class="card"><h3>Privacy defaults</h3><p class="sm muted">Personal events, application progress and career schedules are private. Managers only see aggregate RSVP and link-click counts.</p></div>` };
  };
  A.acts.offset = (v) => { const [k, m] = v.split('|'); const cur = S.st.me.prefs[k]; const next = cur.includes(+m) ? cur.filter((x) => x !== +m) : [...cur, +m].sort((a, b) => a - b); doit(() => api('PUT', '/api/prefs', { [k]: next }), 'Reminder timing saved'); };
  A.acts.autodl = () => doit(() => api('PUT', '/api/prefs', { autoDeadline: !S.st.me.prefs.autoDeadline }), 'Saved');

  // seniors
  A.views.seniors = () => {
    const f = S.ui.sr = S.ui.sr || { q: '', club: '', dept: '', year: '' };
    setTimeout(runSeniors, 0);
    return { title: 'Find seniors', body: `<div class="banner info">${ic('lock')}<span>Only students who opted in appear. No messaging here — contact options show only if the senior shared them.</span></div><div class="field"><label for="sq">Search name, interest or role</label><input class="input" id="sq" data-i="sr_q" type="search" value="${e(f.q)}"></div><div class="grid2"><div class="field"><label for="sc">Club</label><select class="input" id="sc" data-c="sr_club"><option value="">Any</option>${S.st.clubs.map((c) => `<option ${f.club === c.name ? 'selected' : ''}>${e(c.name)}</option>`).join('')}</select></div><div class="field"><label for="sy">Year</label><select class="input" id="sy" data-c="sr_year">${['', '2nd', '3rd', '4th'].map((y) => `<option value="${y}" ${f.year === y ? 'selected' : ''}>${y || 'Any'}</option>`).join('')}</select></div></div><div class="field"><label for="sd">Department contains</label><input class="input" id="sd" data-i="sr_dept" value="${e(f.dept)}"></div><div id="srlist"><div class="skel"></div></div>` };
  };
  let srT;
  async function runSeniors() {
    const f = S.ui.sr, el = $('#srlist'); if (!el) return;
    const qs = new URLSearchParams({ q: f.q, club: f.club, dept: f.dept, year: f.year });
    try { const r = await api('GET', '/api/seniors?' + qs); el.innerHTML = r.length ? r.map((x) => `<div class="card"><div class="row"><div class="avatar">${e(x.name[0])}</div><div class="grow"><b>${e(x.name)}</b><p class="sm muted">${e([x.dept, x.year].filter(Boolean).join(' · '))}</p></div></div>${x.why.length ? `<p class="sm" style="margin-top:6px">${ic('check', 'ico sm')} <b>Why shown:</b> ${e(x.why.join(' · '))}</p>` : ''}${x.pors.length ? `<p class="sm">${x.pors.map((p) => e(p.role + ' @ ' + p.club + (p.tenure ? ' (' + p.tenure + ')' : ''))).join('<br>')}</p>` : ''}${x.interests ? `<p class="xs muted">Interests: ${e(x.interests)}</p>` : ''}${x.bio ? `<p class="sm">${e(x.bio)}</p>` : ''}<div class="row wrap sp">${x.linkedin ? `<a class="btn sm" href="${e(x.linkedin)}" target="_blank" rel="noopener noreferrer">LinkedIn ${ic('ext', 'ico sm')}</a>` : ''}${x.contact ? `<span class="pill ok">Contact: ${e(x.contact)}</span>` : '<span class="pill grey">No contact shared</span>'}</div></div>`).join('') : empty('search', 'No opted-in seniors match', 'Try fewer filters.'); }
    catch (err) { el.innerHTML = `<div class="banner bad">${e(err.message)}</div>`; }
  }
  const sr = (k) => (v) => { S.ui.sr[k] = v; clearTimeout(srT); srT = setTimeout(runSeniors, 250); };
  Object.assign(A.inputs, { sr_q: sr('q'), sr_dept: sr('dept'), sr_club: sr('club'), sr_year: sr('year') });

  // personal event form
  A.views.personal = (p) => {
    const x = p.id ? D.personal(p.id) : null; const st = x ? A.toInput(x.start_at) : A.toInput(new Date(Math.ceil(nowMs() / 9e5) * 9e5 + 36e5).toISOString()), en = x ? A.toInput(x.end_at) : A.toInput(new Date(Math.ceil(nowMs() / 9e5) * 9e5 + 72e5).toISOString());
    return { title: x ? 'Edit private event' : 'New private event', form: true, body: `<div class="banner info">${ic('lock')}<span>Only you can see this. Times are in IST.</span></div><form data-f="personal" data-id="${e(p.id || '')}">${fld('Title', 'title', x ? x.title : '', { req: true, max: 120 })}${fld('Starts', 'start_at', st, { type: 'datetime-local', req: true })}${fld('Ends', 'end_at', en, { type: 'datetime-local', req: true })}${fld('Venue (optional)', 'venue', x ? x.venue : '')}${fld('Notes (optional)', 'description', x ? x.description : '', { area: true })}${fld('Reminder', 'reminder_min', x ? x.reminder_min : 30, { sel: [[0, 'None'], [10, '10 minutes before'], [30, '30 minutes before'], [60, '1 hour before'], [1440, '1 day before']] })}<div id="ferr" class="err" role="alert"></div><button class="btn primary block" type="submit">Save event</button></form>` };
  };
  A.forms.personal = async (f) => {
    const s = f.start_at.value, en = f.end_at.value; const err = $('#ferr'); err.textContent = '';
    if (!f.title.value.trim()) return (err.textContent = 'Title is required');
    if (!s || !en) return (err.textContent = 'Start and end are required');
    if (new Date(en) <= new Date(s)) return (err.textContent = 'End time must be after the start time');
    const id = f.dataset.id; let cf = [];
    const ok = await doit(async () => { const b = { title: f.title.value, start_at: A.fromInput(s), end_at: A.fromInput(en), venue: f.venue.value, description: f.description.value, reminder_min: f.reminder_min.value }; const r = id ? await api('PUT', `/api/personal/${id}`, b) : await api('POST', '/api/personal', b); cf = r.conflicts || []; A.back(); });
    if (ok) toast(cf.length ? 'Saved — overlaps with ' + cf.map((c) => c.title).join(', ') : 'Private event saved');
  };

  // ---------- CAREER ----------
  const TYPE = { test: 'Test', ppt: 'Pre-placement talk', deadline: 'Deadline', interview: 'Interview slot' };
  const ELIG = { assigned: ['Assigned to you', 'ok'], registered: ['You registered', 'ok'], eligible: ['Eligible — not registered', 'grey'], unknown: ['Review required', 'warn'] };
  const careerCard = (c) => { const cat = A.careerCat(c), canc = c.source_status === 'cancelled'; const when = c.item_type === 'deadline' ? 'Due ' + fmtDT(c.deadline_at) : c.date_only ? fmtD(c.start_at) + ' · time TBA (date only)' : fmtDT(c.start_at) + ' – ' + fmtT(c.end_at);
    return `<button class="card tap accent-l ${cat}" data-a="item" data-v="career:${c.id}" style="${c.hidden ? 'opacity:.55' : ''}"><div class="row wrap">${A.pill(cat)}<span class="pill grey">${e(TYPE[c.item_type] || c.item_type)}</span>${canc ? `<span class="pill bad">${ic('close', 'ico sm')}Cancelled by source</span>` : ''}${c.hidden ? '<span class="pill grey">Hidden by you</span>' : ''}</div><h3 style="margin-top:6px" class="${canc ? 'ev cancelled' : ''}">${e(c.company)}</h3><p class="sm muted">${e(c.role)}</p><p class="sm">${ic('clock', 'ico sm')} ${e(when)}</p><div class="row wrap sp"><span class="pill ${ELIG[c.eligibility][1]}">${e(ELIG[c.eligibility][0])}</span><span class="pill grey">Synced · demo portal</span></div></button>`; };
  A.views.career = () => {
    const cn = S.st.career.conn;
    if (!cn.connected) return { title: 'Career', body: `<div class="hero" style="padding-top:8px">${ic('briefcase', 'ico')}<h2 style="margin-top:6px">Tests, talks & deadlines — automatically</h2></div><div class="card"><p>Connect the <b>simulated demo portal</b> and your assigned tests, pre-placement talks and registration deadlines appear on your calendar with conflict checks and reminders.</p><ul class="sm" style="padding-left:18px;margin:10px 0"><li><b>Read-only</b> access to schedules and deadlines</li><li>We <b>never ask for or store</b> portal passwords</li><li>Only items assigned to you, registered by you, or marked eligible by the source</li><li>You can disconnect any time and remove imported items</li></ul><div class="banner warn">${ic('alert')}<span><b>Demo only.</b> The real placement portal connection is pending official approval. Records here are fictional.</span></div><button class="btn primary block" data-a="careerconnect">Connect demo portal</button></div>${cn.last_error ? `<div class="banner bad">${e(cn.last_error)}</div>` : ''}` };
    const t = S.ui.cr || 'upcoming', f = S.ui.crf || { season: 'all' };
    const items = S.st.career.items.filter((c) => f.season === 'all' || c.season === f.season);
    const confirmed = items.filter((c) => ['assigned', 'registered'].includes(c.eligibility));
    const sortT = (a, b) => Date.parse(a.start_at || a.deadline_at) - Date.parse(b.start_at || b.deadline_at);
    let h = `<div class="card"><div class="row"><span class="pill ${cn.stale ? 'warn' : 'ok'}">${ic(cn.stale ? 'alert' : 'check', 'ico sm')}${cn.stale ? 'Stale' : 'Connected'}</span><span class="pill grey">Demo portal</span><div class="grow"></div><button class="btn sm" data-a="careersync">${ic('refresh', 'ico sm')}Sync now</button></div><p class="xs muted sp">Last sync: ${cn.last_sync ? e(rel(cn.last_sync)) : 'never'}</p>${cn.last_error ? `<div class="banner bad" style="margin:8px 0 0">${ic('alert')}<span>${e(cn.last_error)} ${/expired/i.test(cn.last_error) ? '<button class="link" data-a="careerreconnect">Reconnect</button>' : ''}</span></div>` : ''}</div>`;
    h += `<div class="seg">${[['upcoming', 'Upcoming'], ['deadlines', 'Deadlines'], ['updates', 'Updates'], ['sync', 'Sync']].map(([k, l]) => `<button data-a="crtab" data-v="${k}" aria-pressed="${t === k}">${l}</button>`).join('')}</div><div class="chips" style="padding-top:10px">${[['all', 'All'], ['placement', 'Placement'], ['internship', 'Internship']].map(([k, l]) => `<button class="chip" data-a="crseason" data-v="${k}" aria-pressed="${f.season === k}">${l}</button>`).join('')}</div>`;
    if (t === 'upcoming') {
      const up = confirmed.filter((c) => c.item_type !== 'deadline' && c.source_status === 'active').sort(sortT);
      const next = up.find((c) => !c.date_only && Date.parse(c.start_at) > nowMs());
      if (next) h += `<div class="banner info">${ic('spark')}<span><b>Next up:</b> ${e(next.company)} ${e(TYPE[next.item_type].toLowerCase())} — ${e(rel(next.start_at))}</span></div>`;
      h += up.length ? up.map(careerCard).join('') : empty('briefcase', 'No confirmed tests or talks', 'Items appear when assigned or registered.');
      const rest = items.filter((c) => !['assigned', 'registered'].includes(c.eligibility));
      if (rest.length) h += `<div class="sec"><h3>Needs your review</h3></div><p class="xs muted" style="margin-bottom:8px">These are not confirmed commitments and are kept off your calendar.</p>` + rest.map(careerCard).join('');
      const canc = confirmed.filter((c) => c.source_status === 'cancelled'); if (canc.length) h += `<div class="sec"><h3>Cancelled by source</h3></div>` + canc.map(careerCard).join('');
    }
    if (t === 'deadlines') { const dl = confirmed.filter((c) => c.item_type === 'deadline').sort(sortT); h += dl.length ? dl.map(careerCard).join('') : empty('clock', 'No deadlines', 'Registration and submission deadlines show here.'); }
    if (t === 'updates') { const un = S.st.notifications.filter((n) => n.type === 'career'); h += un.length ? un.map((n) => `<button class="card tap" data-a="notif" data-v="${n.id}"><span class="pill placement">Career</span><p class="b" style="margin-top:6px">${e(n.title)}</p><p class="sm muted">${e(n.body)}</p><p class="xs muted">${e(rel(n.created_at))}</p></button>`).join('') : empty('bell', 'No changes yet', 'Reschedules and cancellations from the portal show here once.'); }
    if (t === 'sync') {
      h += `<div class="card"><h3>Recent sync runs</h3>${S.st.career.runs.length ? S.st.career.runs.map((r) => `<div class="auditrow"><b>${r.status === 'ok' ? '✓' : '✗'} ${e(rel(r.started_at))}</b> <span class="muted">(${e(r.trigger)})</span><br>${r.status === 'ok' ? `${r.added} new · ${r.updated} updated · ${r.cancelled} cancelled · ${r.unchanged} unchanged${r.quarantined ? ` · <b>${r.quarantined} quarantined</b> (invalid)` : ''}` : e(r.error)}</div>`).join('') : '<p class="sm muted">No runs yet.</p>'}</div><div class="card"><h3>How sync works (demo)</h3><p class="sm muted">Records are matched by source ID — repeat syncs never duplicate. Reschedules update one entry and alert once. Cancellations stay in history. Invalid records are quarantined, and date-only items stay date-only. Syncs run on connect, when the simulated portal changes, on “Sync now”, and every 60 seconds in this demo.</p></div><button class="btn block" data-a="careerdisc">Disconnect…</button>`;
    }
    return { title: 'Career', body: h };
  };
  Object.assign(A.acts, {
    crtab: (v) => { S.ui.cr = v; A.render(); }, crseason: (v) => { S.ui.crf = { season: v }; A.render(); },
    careerconnect: async () => { const r = await doit(async () => { const x = await api('POST', '/api/career/connect', {}); if (!x.ok) throw new Error(x.error); S._imp = x; }); if (r) toast(`Connected — ${S._imp.added} items imported${S._imp.quarantined ? `, ${S._imp.quarantined} quarantined` : ''}`); },
    careerreconnect: async () => { const r = await doit(async () => { const x = await api('POST', '/api/career/connect', { reconnect: true }); if (!x.ok) throw new Error(x.error); }); if (r) toast('Reconnected and synced'); },
    careersync: async () => { let x; const r = await doit(async () => { x = await api('POST', '/api/career/sync'); }); if (r) { if (x && x.ok === false) toast(x.error + ' — showing last known data.', 'bad'); else toast(`Synced: ${x.added} new · ${x.updated} updated · ${x.cancelled} cancelled · ${x.unchanged} unchanged`); } },
    careerdisc: () => A.openSheet('careerdisc'),
    discgo: (v) => doit(async () => { await api('POST', '/api/career/disconnect', { remove: v === 'remove' }); S.sheet = null; }, 'Disconnected — no further syncing'),
    careerhide: (id) => { const c = D.career(id); doit(() => api('PUT', `/api/career/items/${id}`, { hidden: !c.hidden }), c.hidden ? 'Shown on your calendar again' : 'Hidden on your side only — portal unchanged'); },
  });
  A.sheets.careerdisc = () => `<h2>Disconnect career source?</h2><p class="muted sm" style="margin:6px 0 14px">Future syncs stop. Choose what to do with imported items.</p><div class="col"><button class="btn block" data-a="discgo" data-v="keep">Disconnect, keep imported items</button><button class="btn danger block" data-a="discgo" data-v="remove">Disconnect and remove imported items</button><button class="btn ghost block" data-a="closesheet">Cancel</button></div>`;
  A.careerSheet = (id) => {
    const c = D.career(id); if (!c) return empty('info', 'Not found', '');
    const cat = A.careerCat(c), canc = c.source_status === 'cancelled', cf = A.conflictsFor('career:' + id);
    return `<div class="row wrap">${A.pill(cat)}<span class="pill grey">${e(TYPE[c.item_type])}</span><span class="pill grey">Synced · demo portal</span></div><h2 style="margin-top:8px">${e(c.company)}</h2><p class="muted">${e(c.role)}</p>${canc ? `<div class="banner bad">${ic('alert')}<span><b>Cancelled by the source.</b> Kept in history; no reminders.</span></div>` : ''}${cf.length ? `<div class="banner warn">${ic('alert')}<span><b>Overlaps</b> with ${cf.map((x) => e(x.title)).join(', ')}. Official items can’t be removed here.</span></div>` : ''}${c.eligibility === 'unknown' ? `<div class="banner warn">${ic('info')}<span>The source didn’t say whether you’re eligible. Check the portal — this isn’t on your calendar as a confirmed item.</span></div>` : ''}
    ${kv([['When', c.item_type === 'deadline' ? e(fmtDT(c.deadline_at)) + ' IST' : c.date_only ? e(fmtD(c.start_at)) + ' — date only, time TBA' : e(fmtDT(c.start_at)) + ' – ' + e(fmtT(c.end_at)) + ' IST'], ['Mode', e(c.mode)], ['Venue', e(c.venue)], ['Season', e(c.season)], ['Eligibility', e(ELIG[c.eligibility][0])], ['Source ID', e(c.external_id) + ' · rev ' + c.revision], ['Last sync', e(rel(c.last_sync))]])}
    <p class="xs muted sp">Timing is managed by the portal and read-only here.</p><div class="sp"></div>${ext(c.link, 'Open in portal (demo link)')}<div class="sp2"></div>
    <div class="field"><label for="crm">Reminder for this item</label><select class="input" id="crm" data-c="careerrem" data-id="${e(id)}"><option value="0" ${!c.reminder_min ? 'selected' : ''}>Use my defaults</option>${[15, 60, 120, 1440].map((m) => `<option value="${m}" ${c.reminder_min === m ? 'selected' : ''}>${m >= 60 ? m / 60 + ' h' : m + ' min'} before</option>`).join('')}</select></div>
    <button class="btn block" data-a="careerhide" data-v="${id}">${c.hidden ? 'Show on my calendar' : 'Hide from my calendar (portal unchanged)'}</button>`;
  };
  A.inputs.careerrem = (v, el) => doit(() => api('PUT', `/api/career/items/${el.dataset.id}`, { reminder_min: +v }), 'Reminder updated');
})();
