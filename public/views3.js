'use strict';
// Views part 3: manager dashboard & forms, career-coordinator feed, admin console, demo tools.
(function () {
  const S = A.S, $ = A.$, { e, ic, D, fmtT, fmtD, fmtDT, rel, nowMs, api, doit, toast, empty, kv, ext, fld } = A;
  const clubName = A.clubName;
  const isUrl = (u) => /^https?:\/\/[^\s]+$/i.test(u);

  // ---------- MANAGER DASHBOARD ----------
  A.views.manage = () => {
    const m = S.st.me.managed;
    if (!m.length) return { title: 'Manage', body: empty('lock', 'No manager access', 'Ask an admin to verify and assign a club role from Profile → Request manager access.') };
    const cid = m.some((x) => x.club_id === S.ui.mc) ? S.ui.mc : m[0].club_id; S.ui.mc = cid;
    const club = D.club(cid), stats = S.st.stats || { rsvp: {}, clicks: {} }, n = nowMs();
    const evs = S.st.events.filter((x) => x.club_id === cid), pors = S.st.pors.filter((x) => x.club_id === cid);
    const evRow = (x) => { const past = Date.parse(x.end_at) < n; return `<button class="card tap accent-l campus" data-a="mgrevent" data-v="${x.id}"><div class="row wrap"><span class="pill ${x.status === 'published' ? 'ok' : x.status === 'draft' ? 'grey' : 'bad'}">${e(x.status === 'published' ? (past ? 'Past' : 'Published') : x.status[0].toUpperCase() + x.status.slice(1))}</span>${x.hidden ? '<span class="pill bad">Hidden by admin</span>' : ''}${x.status === 'published' ? `<span class="pill grey">${ic('users', 'ico sm')}${stats.rsvp[x.id] || 0} going</span>` : ''}</div><h3 style="margin-top:6px">${e(x.title)}</h3><p class="sm muted">${e(fmtDT(x.start_at))}</p></button>`; };
    const porRow = (x) => `<button class="card tap accent-l por" data-a="mgrpor" data-v="${x.id}"><div class="row wrap">${A.statusPill(x)}${x.hidden ? '<span class="pill bad">Hidden by admin</span>' : ''}${x.status === 'published' ? `<span class="pill grey">${ic('link', 'ico sm')}${stats.clicks[x.id] || 0} link opens</span>` : ''}</div><h3 style="margin-top:6px">${e(x.title)}</h3><p class="sm muted">Closes ${e(fmtDT(x.closes_at))}</p></button>`;
    const live = (x) => x.status === 'published' && Date.parse(x.end_at) >= n;
    let h = `${m.length > 1 ? `<div class="field"><label for="mcs">Club</label><select class="input" id="mcs" data-c="mcsel">${m.map((x) => `<option value="${e(x.club_id)}" ${x.club_id === cid ? 'selected' : ''}>${e(x.name)}</option>`).join('')}</select></div>` : `<h2 style="margin-bottom:8px">${e(club.name)}</h2>`}
    <div class="banner info">${ic('lock')}<span>You can publish only for ${e(m.map((x) => x.name).join(', '))}. Counts below are aggregate — private saves and schedules are never shown to you.</span></div>
    <div class="grid2"><button class="qa" data-a="go" data-v="eventform">${ic('plus')}New event</button><button class="qa" data-a="go" data-v="porform">${ic('plus')}New POR</button></div><div class="sp"></div><button class="btn block" data-a="clubedit" data-v="${e(cid)}">${ic('edit', 'ico sm')}Club profile & members</button>`;
    const drafts = [...evs.filter((x) => x.status === 'draft').map(evRow), ...pors.filter((x) => x.status === 'draft').map(porRow)];
    h += `<div class="sec"><h3>Drafts (invisible to students)</h3></div>${drafts.join('') || '<div class="empty"><p class="sm">No drafts.</p></div>'}`;
    h += `<div class="sec"><h3>Published events</h3></div>${evs.filter(live).map(evRow).join('') || '<div class="empty"><p class="sm">No upcoming published events.</p></div>'}`;
    h += `<div class="sec"><h3>Active PORs</h3></div>${pors.filter((x) => x.status === 'published' && ['open', 'upcoming'].includes(A.porStatus(x))).map(porRow).join('') || '<div class="empty"><p class="sm">No active PORs.</p></div>'}`;
    const past = [...evs.filter((x) => x.status === 'cancelled' || (x.status === 'published' && !live(x))).map(evRow), ...pors.filter((x) => x.status === 'cancelled' || (x.status === 'published' && ['closed'].includes(A.porStatus(x)))).map(porRow)];
    h += `<div class="sec"><h3>Past, closed & cancelled</h3></div>${past.join('') || '<div class="empty"><p class="sm">Nothing here yet.</p></div>'}`;
    return { title: 'Manage', body: h };
  };
  A.inputs.mcsel = (v) => { S.ui.mc = v; A.render(); };
  Object.assign(A.acts, { mgrevent: (id) => A.go('eventform', { id }), mgrpor: (id) => A.go('porform', { id }), clubedit: (id) => A.go('clubedit', { id }), reloadform: async () => { await A.poll(true); A.render(true); toast('Loaded the latest version'); } });

  // ---------- EVENT FORM ----------
  const dflt = (h) => A.toInput(new Date(Math.ceil((nowMs() + h * 36e5) / 9e5) * 9e5).toISOString());
  A.views.eventform = (p) => {
    const x = p.id ? D.event(p.id) : null; const cid = x ? x.club_id : S.ui.mc || (S.st.me.managed[0] || {}).club_id;
    if (p.id && !x) return { title: 'Event', body: empty('info', 'Event not found', '') };
    const pub = x && x.status === 'published';
    return { title: x ? (pub ? 'Edit event' : 'Edit draft') : 'New event', form: true, body: `${pub ? `<div class="banner info">${ic('info')}<span>This event is live. Time or venue changes notify students who saved it (once) and recompute their reminders.</span></div>` : ''}<form data-f="event" data-id="${e(p.id || '')}" data-club="${e(cid)}" data-ver="${x ? x.version : ''}"><p class="sm muted">Publishing for <b>${e(clubName(cid))}</b> · times in IST</p><div class="sp"></div>
      ${fld('Title', 'title', x ? x.title : '', { req: true, max: 120 })}${fld('Category', 'category', x ? x.category : 'Workshop', { sel: ['Workshop', 'Talk', 'Competition', 'Meetup', 'Briefing', 'Auditions', 'Sports', 'Study group', 'Mixer', 'Event'].map((c) => [c, c]) })}${fld('Description', 'description', x ? x.description : '', { area: true, max: 2000 })}
      ${fld('Starts', 'start_at', x ? A.toInput(x.start_at) : dflt(24), { type: 'datetime-local', req: true })}${fld('Ends', 'end_at', x ? A.toInput(x.end_at) : dflt(26), { type: 'datetime-local', req: true })}
      ${fld('Venue', 'venue', x ? x.venue : '')}${fld('Online link (optional)', 'url', x ? x.url : '', { type: 'url', ph: 'https://…', max: 300 })}${fld('Resource link (optional)', 'resources', x ? x.resources : '', { type: 'url', ph: 'https://…', max: 300 })}${fld('Contact', 'contact', x ? x.contact : '')}
      <div id="ferr" class="err" role="alert"></div>
      ${pub ? `<button class="btn primary block" type="submit" value="save">Save changes</button><div class="sp"></div><button class="btn danger block" type="button" data-a="cancelevent" data-v="${e(p.id)}">Cancel this event…</button>` : `<button class="btn primary block" type="submit" value="preview">Preview & publish</button><div class="sp"></div><button class="btn block" type="submit" value="draft">Save as draft</button>${x ? `<div class="sp"></div><button class="btn ghost block" type="button" data-a="cancelevent" data-v="${e(p.id)}">Discard draft…</button>` : ''}`}</form>` };
  };
  function readEvent(f) {
    const err = $('#ferr'); err.textContent = '';
    const b = { title: f.title.value.trim(), category: f.category.value, description: f.description.value, venue: f.venue.value, url: f.url.value.trim(), resources: f.resources.value.trim(), contact: f.contact.value, start_at: A.fromInput(f.start_at.value), end_at: A.fromInput(f.end_at.value) };
    const bad = !b.title ? 'Title is required' : !f.start_at.value || !f.end_at.value ? 'Start and end are required' : new Date(b.end_at) <= new Date(b.start_at) ? 'End time must be after the start time' : b.url && !isUrl(b.url) ? 'Link must start with http:// or https://' : b.resources && !isUrl(b.resources) ? 'Resource link must start with http:// or https://' : '';
    if (bad) { err.textContent = bad; err.scrollIntoView({ block: 'center' }); return null; }
    return b;
  }
  A.forms.event = async (f, ev) => {
    const b = readEvent(f); if (!b) return; const mode = ev.submitter && ev.submitter.value, id = f.dataset.id;
    if (mode === 'preview') { S._draft = { b, id, club: f.dataset.club, ver: f.dataset.ver }; return A.openSheet('evpreview'); }
    await saveEvent(b, id, f.dataset.club, f.dataset.ver, mode === 'save' ? 'save' : 'draft');
  };
  async function saveEvent(b, id, club, ver, mode) {
    let stale = false;
    const ok = await doit(async () => {
      try { if (id) await api('PUT', `/api/events/${id}`, { ...b, version: +ver, publish: mode === 'publish' }); else await api('POST', '/api/events', { ...b, club_id: club, publish: mode === 'publish' }); }
      catch (x) { if (x.code === 'stale_version') { stale = true; } throw x; }
      S.sheet = null; A.back();
    });
    if (!ok && stale) { const err = $('#ferr'); if (err) err.innerHTML = `This listing was changed by someone else. <button type="button" class="link" data-a="reloadform">Load latest version</button>`; }
    else if (ok) toast(mode === 'publish' ? 'Published institute-wide' : mode === 'save' ? 'Changes saved' : 'Draft saved');
  }
  A.sheets.evpreview = () => { const d = S._draft; if (!d) return ''; const b = d.b; return `<h2>Preview</h2><div class="card accent-l campus" style="margin-top:8px"><div class="row">${A.pill('campus')}<span class="pill ok">Preview</span></div><h3 style="margin-top:6px">${e(b.title)}</h3><p class="sm muted">${e(fmtDT(b.start_at))} – ${e(fmtT(b.end_at))} IST</p><p class="sm">${e(b.venue || 'Venue TBA')} · ${e(clubName(d.club))}</p><p class="sm" style="margin-top:6px">${e(b.description)}</p></div><div class="banner warn">${ic('alert')}<span><b>Publishing is institute-wide.</b> All students can see it in the calendar, club page and What’s New immediately.</span></div><div class="row"><button class="btn grow" data-a="closesheet">Back to edit</button><button class="btn primary grow" data-a="evpublish">Publish</button></div>`; };
  A.acts.evpublish = () => { const d = S._draft; A.closeSheet(); saveEvent(d.b, d.id, d.club, d.ver, 'publish'); };
  A.acts.cancelevent = (id) => A.openSheet('cancelreason', { kind: 'event', id }, { form: true });
  A.sheets.cancelreason = (p) => { const x = p.kind === 'event' ? D.event(p.id) : D.por(p.id); const draft = x && x.status === 'draft'; return `<h2>${draft ? 'Discard draft' : 'Cancel listing'}</h2><p class="muted sm">${draft ? 'The draft is deleted. It was never visible to students.' : 'Students who saved it are notified once, reminders stop, and it stays marked cancelled in history.'}</p><form data-f="cancelreason" data-kind="${p.kind}" data-id="${e(p.id)}"><div class="field"><label for="cr">Reason ${draft ? '(optional)' : '*'}</label><textarea class="input" id="cr" name="reason" maxlength="300" ${draft ? '' : 'required'}></textarea></div><button class="btn danger block" type="submit">${draft ? 'Discard draft' : 'Cancel & notify'}</button></form>`; };
  A.forms.cancelreason = (f) => doit(async () => { await api('POST', `/api/${f.dataset.kind === 'event' ? 'events' : 'pors'}/${f.dataset.id}/cancel`, { reason: f.reason.value || 'Discarded' }); S.sheet = null; if (A.cur().n !== 'manage') A.back(); }, 'Done');

  // ---------- POR FORM ----------
  A.views.porform = (p) => {
    const x = p.id ? D.por(p.id) : null; const cid = x ? x.club_id : S.ui.mc || (S.st.me.managed[0] || {}).club_id;
    if (p.id && !x) return { title: 'POR', body: empty('info', 'Not found', '') };
    const pub = x && x.status === 'published';
    return { title: x ? (pub ? 'Edit POR' : 'Edit draft') : 'New POR', form: true, body: `<form data-f="por" data-id="${e(p.id || '')}" data-club="${e(cid)}" data-ver="${x ? x.version : ''}"><p class="sm muted">For <b>${e(clubName(cid))}</b> · times in IST</p><div class="sp"></div>${fld('Role / designation', 'title', x ? x.title : '', { req: true, max: 120 })}${fld('Description', 'description', x ? x.description : '', { area: true, max: 2000 })}${fld('Eligibility (optional)', 'eligibility', x ? x.eligibility : '')}${fld('Applications open', 'opens_at', x ? A.toInput(x.opens_at) : dflt(0), { type: 'datetime-local', req: true })}${fld('Applications close', 'closes_at', x ? A.toInput(x.closes_at) : dflt(24 * 7), { type: 'datetime-local', req: true })}${fld('External application link', 'url', x ? x.url : '', { type: 'url', req: true, ph: 'https://…', max: 300 })}${fld('Contact', 'contact', x ? x.contact : '')}<p class="xs muted">Applications are submitted on your own form. InstiLite only counts unique link opens.</p><div id="ferr" class="err" role="alert"></div>
    ${pub ? `<button class="btn primary block" type="submit" value="save">Save changes</button><div class="sp"></div><button class="btn block" type="button" data-a="closepor" data-v="${e(p.id)}">Close applications now</button><div class="sp"></div><button class="btn danger block" type="button" data-a="cancelpor" data-v="${e(p.id)}">Cancel this listing…</button>` : `<button class="btn primary block" type="submit" value="publish">Publish</button><div class="sp"></div><button class="btn block" type="submit" value="draft">Save as draft</button>${x ? `<div class="sp"></div><button class="btn ghost block" type="button" data-a="cancelpor" data-v="${e(p.id)}">Discard draft…</button>` : ''}`}</form>` };
  };
  A.forms.por = async (f, ev) => {
    const err = $('#ferr'); err.textContent = '';
    const b = { title: f.title.value.trim(), description: f.description.value, eligibility: f.eligibility.value, opens_at: A.fromInput(f.opens_at.value), closes_at: A.fromInput(f.closes_at.value), url: f.url.value.trim(), contact: f.contact.value };
    const bad = !b.title ? 'Role title is required' : !f.opens_at.value || !f.closes_at.value ? 'Opening and closing times are required' : new Date(b.closes_at) <= new Date(b.opens_at) ? 'Closing time must be after opening time' : !isUrl(b.url) ? 'Application link must start with http:// or https://' : '';
    if (bad) { err.textContent = bad; return; }
    const mode = ev.submitter && ev.submitter.value, id = f.dataset.id; let stale = false;
    const ok = await doit(async () => { try { if (id) await api('PUT', `/api/pors/${id}`, { ...b, version: +f.dataset.ver, publish: mode === 'publish' }); else await api('POST', '/api/pors', { ...b, club_id: f.dataset.club, publish: mode === 'publish' }); } catch (x) { if (x.code === 'stale_version') stale = true; throw x; } A.back(); });
    if (!ok && stale) err.innerHTML = `This listing was changed by someone else. <button type="button" class="link" data-a="reloadform">Load latest version</button>`;
    else if (ok) toast(mode === 'publish' ? 'POR published' : mode === 'save' ? 'Changes saved' : 'Draft saved');
  };
  Object.assign(A.acts, {
    cancelpor: (id) => A.openSheet('cancelreason', { kind: 'por', id }, { form: true }),
    closepor: (id) => A.openSheet('confirm', { msg: 'Close applications now? It leaves the open list immediately and saved students are notified.', act: 'closepor2', v: id, label: 'Close now' }),
    closepor2: (id) => doit(async () => { await api('POST', `/api/pors/${id}/close`); S.sheet = null; A.back(); }, 'Applications closed'),
  });

  // ---------- CLUB PROFILE & MEMBERS ----------
  A.views.clubedit = (p) => {
    const c = D.club(p.id); if (!c) return { title: 'Club', body: empty('info', 'Not found', '') };
    const mem = S.st.members.filter((m) => m.club_id === c.id);
    return { title: 'Club profile', form: true, body: `<form data-f="clubedit" data-id="${e(c.id)}">${fld('Description', 'description', c.description, { area: true, max: 800 })}${fld('Website', 'website', c.website, { type: 'url', max: 200 })}${fld('Public contact', 'contact', c.contact)}<div id="ferr" class="err"></div><button class="btn primary block" type="submit">Save club profile</button></form>
    <div class="sec"><h3>Members (display roles)</h3></div><div class="banner info">${ic('info')}<span>Display roles are labels. They don’t grant publishing access — that’s assigned by an admin.</span></div>${mem.map((m) => `<div class="card row"><div class="grow"><b>${e(m.display_name)}</b><p class="sm muted">${e(m.role_label)}</p></div><button class="btn sm" data-a="rmmember" data-v="${e(c.id)}|${e(m.id)}" aria-label="Remove ${e(m.display_name)}">${ic('trash', 'ico sm')}</button></div>`).join('') || '<p class="muted sm">No members listed.</p>'}
    <form class="card" data-f="addmember" data-id="${e(c.id)}"><h3>Add a public member entry</h3>${fld('Name', 'display_name', '', { req: true, max: 80 })}${fld('Display role', 'role_label', 'Member', { max: 60 })}<button class="btn block" type="submit">Add member</button></form>` };
  };
  A.forms.clubedit = (f) => { const w = f.website.value.trim(); if (w && !isUrl(w)) return ($('#ferr').textContent = 'Website must start with http:// or https://'); doit(() => api('PUT', `/api/clubs/${f.dataset.id}`, { description: f.description.value, website: w, contact: f.contact.value }), 'Club profile saved'); };
  A.forms.addmember = async (f) => { const ok = await doit(() => api('POST', `/api/clubs/${f.dataset.id}/members`, { display_name: f.display_name.value, role_label: f.role_label.value }), 'Member added'); if (ok) f.reset(); };
  A.acts.rmmember = (v) => { const [c, m] = v.split('|'); doit(() => api('DELETE', `/api/clubs/${c}/members/${m}`), 'Member removed'); };

  // ---------- CAREER COORDINATOR ----------
  const TYPES = [['test', 'Test'], ['ppt', 'Pre-placement talk'], ['deadline', 'Deadline'], ['interview', 'Interview slot']];
  A.views.coord = () => {
    const c = S.st.coordinator; if (!c) return { title: 'Career feed', body: empty('lock', 'Career coordinator only', '') };
    let h = `<div class="banner warn">${ic('alert')}<span><b>Simulated portal.</b> Fictional records only. Changes here auto-sync to connected students’ private calendars.</span></div>
    <div class="card"><h3>Portal conditions</h3><div class="toggle"><div><b class="sm">Simulate outage</b><p class="xs muted">Syncs fail; students keep last-known data marked stale.</p></div><button class="sw" role="switch" aria-checked="${c.outage}" data-a="portal" data-v="outage" aria-label="Simulate outage"></button></div><div class="toggle"><div><b class="sm">Simulate expired access</b><p class="xs muted">Students are asked to reconnect.</p></div><button class="sw" role="switch" aria-checked="${c.token_expired}" data-a="portal" data-v="token" aria-label="Simulate expired access"></button></div></div>
    <div class="grid2"><button class="qa" data-a="go" data-v="coordform">${ic('plus')}Add record</button><button class="qa" data-a="coordbad">${ic('alert')}Inject invalid record</button></div>`;
    for (const s of c.students) { const rows = c.feed.filter((r) => r.student_id === s.id); if (!rows.length && !s.connected) continue;
      h += `<div class="sec"><h3>${e(s.name)} · ${s.connected ? 'connected' : 'not connected'}</h3></div>` + (rows.map((r) => `<div class="card"><div class="row wrap"><span class="pill ${r.season}">${r.season}</span><span class="pill grey">${e((TYPES.find((t) => t[0] === r.item_type) || [])[1] || r.item_type)}</span>${r.source_status === 'cancelled' ? '<span class="pill bad">Cancelled</span>' : ''}<span class="pill grey">${e(r.eligibility)}</span><span class="xs muted">${e(r.external_id)} · rev ${r.revision}</span></div><b style="display:block;margin-top:6px">${e(r.company)}</b><p class="sm muted">${e(r.role)}</p><p class="sm">${r.date_only ? e(fmtD(r.start_at)) + ' (date only)' : r.item_type === 'deadline' ? (r.deadline_at ? 'Due ' + e(fmtDT(r.deadline_at)) : '<b style="color:var(--danger)">Missing time (invalid)</b>') : r.start_at && r.end_at ? e(fmtDT(r.start_at)) + ' – ' + e(fmtT(r.end_at)) : '<b style="color:var(--danger)">Missing time (invalid)</b>'}</p><div class="row sp"><button class="btn sm" data-a="coordedit" data-v="${r.id}">${ic('edit', 'ico sm')}Edit / reschedule</button>${r.source_status === 'active' ? `<button class="btn sm" data-a="coordcancel" data-v="${r.id}">Cancel</button>` : ''}<button class="btn sm ghost" data-a="coorddel" data-v="${r.id}" aria-label="Delete record">${ic('trash', 'ico sm')}</button></div></div>`).join('') || '<div class="empty"><p class="sm">No records.</p></div>'); }
    return { title: 'Career feed', body: h };
  };
  Object.assign(A.acts, {
    portal: (k) => { const c = S.st.coordinator; doit(() => api('POST', '/api/career/portal', { outage: k === 'outage' ? !c.outage : c.outage, token_expired: k === 'token' ? !c.token_expired : c.token_expired }), 'Portal condition updated'); },
    coordedit: (id) => A.go('coordform', { id }),
    coordcancel: (id) => doit(() => api('POST', `/api/career/source/${id}/cancel`), 'Cancelled in source — connected students auto-sync'),
    coorddel: (id) => doit(() => api('POST', `/api/career/source/${id}/delete`), 'Record removed from the source feed'),
    coordbad: () => doit(() => api('POST', '/api/career/source', { student_id: S.st.coordinator.students[0].id, company: 'Malformed Co (demo)', role: 'Analyst', item_type: 'test', season: 'placement', eligibility: 'assigned' }), 'Invalid record added — it will be quarantined, not imported'),
  });
  A.views.coordform = (p) => {
    const c = S.st.coordinator; const x = p.id ? c.feed.find((r) => r.id === p.id) : null;
    return { title: x ? 'Edit record' : 'Add record', form: true, body: `<form data-f="coord" data-id="${e(p.id || '')}">${fld('Student', 'student_id', x ? x.student_id : c.students[0].id, { sel: c.students.map((s) => [s.id, s.name]) })}${fld('Company (fictional)', 'company', x ? x.company : '', { req: true })}${fld('Role', 'role', x ? x.role : '', { req: true })}${fld('Season', 'season', x ? x.season : 'placement', { sel: [['placement', 'Placement'], ['internship', 'Internship']] })}${fld('Type', 'item_type', x ? x.item_type : 'test', { sel: TYPES })}${fld('Eligibility label (from source)', 'eligibility', x ? x.eligibility : 'assigned', { sel: [['assigned', 'Assigned'], ['registered', 'Registered'], ['eligible', 'Eligible — not registered'], ['unknown', 'Unknown (review required)']] })}${fld('Mode', 'mode', x ? x.mode : 'Online')}${fld('Venue', 'venue', x ? x.venue : '')}<div class="toggle"><span class="sm b">Date only (time not announced)</span><input type="checkbox" name="date_only" ${x && x.date_only ? 'checked' : ''} style="width:26px;height:26px"></div><div class="sp"></div>${fld('Starts (or the date)', 'start_at', x && x.start_at ? A.toInput(x.start_at) : dflt(48), { type: 'datetime-local' })}${fld('Ends', 'end_at', x && x.end_at ? A.toInput(x.end_at) : dflt(49.5), { type: 'datetime-local' })}${fld('Deadline (for deadline type)', 'deadline_at', x && x.deadline_at ? A.toInput(x.deadline_at) : '', { type: 'datetime-local' })}<div id="ferr" class="err"></div><button class="btn primary block" type="submit">${x ? 'Save (new revision)' : 'Add to feed'}</button></form>` };
  };
  A.forms.coord = (f) => { const b = { student_id: f.student_id.value, company: f.company.value, role: f.role.value, season: f.season.value, item_type: f.item_type.value, eligibility: f.eligibility.value, mode: f.mode.value, venue: f.venue.value, date_only: f.date_only.checked, start_at: A.fromInput(f.start_at.value), end_at: f.date_only.checked ? '' : A.fromInput(f.end_at.value), deadline_at: A.fromInput(f.deadline_at.value) }; const id = f.dataset.id; doit(async () => { if (id) await api('PUT', `/api/career/source/${id}`, b); else await api('POST', '/api/career/source', b); A.back(); }, id ? 'Updated — connected students auto-sync once' : 'Added to the feed'); };

  // ---------- ADMIN ----------
  A.views.admin = () => {
    const a = S.st.admin; if (!a) return { title: 'Admin', body: empty('lock', 'Admin only', '') };
    const t = S.ui.at || 'requests';
    const tabs = [['requests', 'Requests'], ['roles', 'Roles'], ['reports', 'Reports'], ['moderate', 'Listings'], ['audit', 'Audit'], ['ws', 'Workspace']];
    let h = `<div class="chips">${tabs.map(([k, l]) => `<button class="chip" data-a="admtab" data-v="${k}" aria-pressed="${t === k}">${l}${k === 'requests' && a.requests.some((r) => r.status === 'pending') ? ' •' : ''}${k === 'reports' && a.reports.some((r) => r.status === 'open') ? ' •' : ''}</button>`).join('')}</div>`;
    if (t === 'requests') h += a.requests.length ? a.requests.map((r) => `<div class="card"><div class="row wrap"><span class="pill ${r.status === 'pending' ? 'warn' : r.status === 'approved' ? 'ok' : 'bad'}">${e(r.status)}</span></div><b style="display:block;margin-top:6px">${e(r.user_name)} → ${e(r.club_name)}</b><p class="sm muted">${e(r.note)}</p>${r.status === 'pending' ? `<div class="row sp"><button class="btn primary sm" data-a="reqdecide" data-v="${r.id}|1">Verify & approve</button><button class="btn sm" data-a="reqdecide" data-v="${r.id}|0">Decline</button></div>` : ''}</div>`).join('') : empty('check', 'No requests', '');
    if (t === 'roles') h += `<form class="card" data-f="grant"><h3>Grant club manager role</h3><div class="field"><label for="gu">Student</label><select class="input" id="gu" name="user_id">${a.users.filter((u) => u.role_type === 'student').map((u) => `<option value="${e(u.id)}">${e(u.code)} · ${e(u.name)}</option>`).join('')}</select></div><div class="field"><label for="gc">Club</label><select class="input" id="gc" name="club_id">${S.st.clubs.map((c) => `<option value="${e(c.id)}">${e(c.name)}</option>`).join('')}</select></div><button class="btn primary block" type="submit">Grant (audited)</button></form>` + a.roles.map((r) => `<div class="card row"><div class="grow"><b>${e(r.user_name)}</b><p class="sm muted">${e(r.club_name)} · ${e(r.role)} · ${e(r.tenure)}</p><span class="pill ${r.active ? 'ok' : 'grey'}">${r.active ? 'Active' : 'Revoked'}</span></div>${r.active ? `<button class="btn sm danger" data-a="revoke" data-v="${r.id}">Revoke</button>` : ''}</div>`).join('');
    if (t === 'reports') h += a.reports.length ? a.reports.map((r) => { const it = r.item_type === 'event' ? D.event(r.item_id) : D.por(r.item_id); return `<div class="card"><span class="pill ${r.status === 'open' ? 'warn' : 'grey'}">${e(r.status)}</span><b style="display:block;margin-top:6px">${it ? e(it.title) : 'Removed item'}</b><p class="sm">“${e(r.reason)}”</p>${r.status === 'open' && it ? `<div class="row sp"><button class="btn sm danger" data-a="modhide" data-v="${r.item_type}:${r.item_id}">Hide listing</button><button class="btn sm" data-a="repdismiss" data-v="${r.id}">Dismiss</button></div>` : ''}</div>`; }).join('') : empty('check', 'No reports', 'Students can report a listing from its detail sheet.');
    if (t === 'moderate') { const rows = [...S.st.events.map((x) => ({ t: 'event', x })), ...S.st.pors.map((x) => ({ t: 'por', x }))]; h += rows.map(({ t: ty, x }) => `<div class="card"><div class="row wrap"><span class="pill ${ty === 'event' ? 'campus' : 'por'}">${ty === 'event' ? 'Event' : 'POR'}</span>${x.hidden ? '<span class="pill bad">Hidden</span>' : '<span class="pill ok">Visible</span>'}</div><b style="display:block;margin-top:6px">${e(x.title)}</b><p class="sm muted">${e(clubName(x.club_id))}${x.hidden ? ' · reason: ' + e(x.hidden_reason) : ''}</p><div class="sp"></div><button class="btn sm ${x.hidden ? '' : 'danger'}" data-a="${x.hidden ? 'modrestore' : 'modhide'}" data-v="${ty}:${x.id}">${x.hidden ? 'Restore' : 'Hide…'}</button></div>`).join(''); }
    if (t === 'audit') h += `<div class="card">${a.audit.map((l) => `<div class="auditrow"><b>${e(l.action)}</b> · ${e(l.actor_name || 'system')}<br><span class="muted">${e(l.detail)} · ${e(rel(l.at))}</span></div>`).join('')}</div>`;
    if (t === 'ws') h += `<div class="card"><h3>Workspace</h3><p class="sm muted">Workspace <b>${e(S.ws)}</b> is isolated from other evaluators. Reset restores the deterministic seed data (all roles’ changes in this workspace are lost).</p><div class="sp"></div><button class="btn danger block" data-a="resetws">Reset demo data…</button></div>`;
    return { title: 'Admin', body: h };
  };
  Object.assign(A.acts, {
    admtab: (v) => { S.ui.at = v; A.render(); },
    reqdecide: (v) => { const [id, ap] = v.split('|'); doit(() => api('POST', `/api/admin/requests/${id}/decide`, { approve: ap === '1' }), ap === '1' ? 'Verified — role granted' : 'Request declined'); },
    revoke: (id) => A.openSheet('confirm', { msg: 'Revoke this manager role? Their writes are denied immediately.', act: 'revoke2', v: id, label: 'Revoke' }),
    revoke2: (id) => doit(async () => { await api('POST', `/api/admin/roles/${id}/revoke`); S.sheet = null; }, 'Role revoked — takes effect immediately'),
    modhide: (v) => A.openSheet('modreason', { v, hide: true }, { form: true }), modrestore: (v) => A.openSheet('modreason', { v, hide: false }, { form: true }),
    repdismiss: (id) => doit(() => api('POST', `/api/admin/reports/${id}/dismiss`), 'Report dismissed'),
    resetws: () => A.openSheet('resetws', {}, { form: true }),
  });
  A.sheets.modreason = (p) => `<h2>${p.hide ? 'Hide listing' : 'Restore listing'}</h2><p class="muted sm">${p.hide ? 'It disappears from discovery; the audit trail stays. The publisher is told why.' : 'The listing becomes visible again.'}</p><form data-f="modreason" data-v="${e(p.v)}" data-hide="${p.hide}"><div class="field"><label for="mr">Reason *</label><textarea class="input" id="mr" name="reason" required maxlength="300"></textarea></div><button class="btn ${p.hide ? 'danger' : 'primary'} block" type="submit">${p.hide ? 'Hide' : 'Restore'}</button></form>`;
  A.forms.modreason = (f) => { const [t, id] = f.dataset.v.split(':'); doit(async () => { await api('POST', '/api/admin/moderate', { item_type: t, item_id: id, hide: f.dataset.hide === 'true', reason: f.reason.value }); S.sheet = null; }, 'Moderation applied & audited'); };
  A.forms.grant = (f) => doit(() => api('POST', '/api/admin/roles/grant', { user_id: f.user_id.value, club_id: f.club_id.value }), 'Role granted');
  A.sheets.resetws = () => `<h2>Reset demo data?</h2><p class="muted sm">Restores the seed for this workspace only. Type <b>RESET</b> to confirm.</p><form data-f="resetws"><div class="field"><label for="rs">Confirmation</label><input class="input" id="rs" name="c" autocomplete="off"></div><div id="rserr" class="err"></div><button class="btn danger block" type="submit">Reset this workspace</button></form>`;
  A.forms.resetws = async (f) => { if (f.c.value !== 'RESET') return ($('#rserr').textContent = 'Type RESET exactly'); doit(async () => { await api('POST', '/api/admin/reset', { confirm: 'RESET' }); S.sheet = null; }, 'Workspace reset to seed data'); };

  // ---------- DEMO TOOLS ----------
  A.views.tools = () => {
    const out = S.ui.probe;
    return { title: 'Demo tools', body: `<div class="banner warn">${ic('alert')}<span><b>This is a prototype.</b> Fictional demo data. Student sign-in with real Smail credentials, the real placement portal, push notifications and email are <b>not</b> connected.</span></div>
    <div class="card"><h3>Shared workspace</h3><p class="sm muted">Everyone with this link sees the same live data. Other evaluators get their own isolated copy.</p><input class="input sp" readonly value="${e(location.origin + '/?w=' + S.ws)}" onfocus="this.select()" aria-label="Workspace link"><div class="row sp"><button class="btn sm" data-a="copylink">Copy link</button><button class="btn sm" data-a="second">Open 2nd session</button></div></div>
    <div class="card"><h3>Server-side permission checks</h3><p class="sm muted">These fire real API requests as you. They should be refused.</p><div class="col sp"><button class="btn sm" data-a="probe" data-v="publish">Try to publish for a club I don’t manage</button><button class="btn sm" data-a="probe" data-v="peek">Try to read another student’s private schedule</button></div>${out ? `<div class="banner ${out.ok ? 'bad' : 'ok'}" style="margin-top:10px">${ic(out.ok ? 'alert' : 'shield')}<span><b>HTTP ${out.status}</b> — ${e(out.msg)}</span></div>` : ''}</div>
    <div class="card"><h3>Reminders</h3><p class="sm muted">Reminders for saved items are delivered in-app at their due time. Send a labelled test now:</p><button class="btn sm sp" data-a="testrem">Send test reminder</button></div>
    <div class="card"><h3>About</h3><p class="sm muted">InstiLite — “Insti happenings all at once!” A single place for campus events, PORs and placement schedules at IIT Madras (concept prototype). Timezone: Asia/Kolkata; timestamps stored in UTC.</p><p class="sm muted sp">Poster-reported pain points (e.g. 84.8% miss desired events) are historical survey results from the project poster — not newly measured here.</p></div>` };
  };
  A.acts.probe = async (k) => {
    try {
      if (k === 'publish') { const ec = S.st.clubs.find((c) => !D.isManagerOf(c.id)); const r = await fetch('/api/events', { method: 'POST', headers: { 'content-type': 'application/json', 'x-session': S.sess }, body: JSON.stringify({ club_id: ec.id, title: 'Unauthorised probe', start_at: new Date(nowMs() + 36e5).toISOString(), end_at: new Date(nowMs() + 72e5).toISOString(), publish: true }) }); const j = await r.json(); S.ui.probe = { status: r.status, msg: j.error || 'Accepted — this should not happen for a non-manager', ok: r.ok }; }
      else { if (!S.ids) S.ids = await api('GET', '/api/identities?w=' + encodeURIComponent(S.ws)); const other = S.ids.find((i) => i.id !== S.st.me.id && i.role_type === 'student'); const r = await fetch('/api/private/' + other.id + '/schedule', { headers: { 'x-session': S.sess } }); const j = await r.json(); S.ui.probe = { status: r.status, msg: r.ok ? 'Data returned — this should not happen' : j.error, ok: r.ok }; }
    } catch (err) { S.ui.probe = { status: 0, msg: err.message, ok: false }; }
    A.render();
  };
  A.acts.testrem = () => doit(() => api('POST', '/api/notifications/test'), 'Test reminder sent — see your inbox');
})();
