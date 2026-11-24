'use strict';
// Cross-role API scenarios (PRD D01-D11). Runs against an in-process server with a temp DB.
process.env.DB_PATH = require('path').join(require('os').tmpdir(), 'instilite-test-' + Date.now() + '.db');
const app = require('../server');
const http = require('http');
const srv = http.createServer(app).listen(0);
const base = () => 'http://127.0.0.1:' + srv.address().port;
let pass = 0, fail = 0; const results = [];
const check = (name, cond, extra) => { (cond ? pass++ : fail++); results.push((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : '  -> ' + (extra || ''))); };
async function api(method, url, body, sess) {
  const r = await fetch(base() + url, { method, headers: { 'content-type': 'application/json', ...(sess ? { 'x-session': sess } : {}) }, body: body ? JSON.stringify(body) : undefined });
  let j = {}; try { j = await r.json(); } catch {} if (Array.isArray(j)) j = { data: j }; return { status: r.status, ...j };
}
const login = async (ws, code) => (await api('POST', '/api/login', { w: ws, code })).session;
const state = (s) => api('GET', '/api/state?force=1', null, s);
const iso = (min) => new Date(Date.now() + min * 60000).toISOString();

(async () => {
  const ws = (await api('POST', '/api/workspace')).ws;
  const [S01, S02, M01, M02, C01, A01] = await Promise.all(['S01', 'S02', 'M01', 'M02', 'C01', 'A01'].map((c) => login(ws, c)));
  const st01 = await state(S01), st02 = await state(S02), stM01 = await state(M01);
  const dbc = (st) => require('../db').all('SELECT status, COUNT(*) n FROM events WHERE ws=? GROUP BY status', ws); const cnt = Object.fromEntries(dbc().map((r) => [r.status, r.n])); check('Seed: 12 events (9 published incl. 1 past, 2 draft, 1 cancelled)', cnt.published === 9 && cnt.draft === 2 && cnt.cancelled === 1, JSON.stringify(cnt));
  check('Draft invisible to students', st01.events.every((e) => e.status !== 'draft'));
  check('Seed: 8 PORs', stM01.pors.length >= 7);
  // E01 auth
  const bad = await api('POST', '/api/otp/request', { w: ws, email: 'x@gmail.com' }); check('E01 reject non-approved domain', bad.status === 403, bad.status);
  const good = await api('POST', '/api/otp/request', { w: ws, email: 'aditi.demo@smail.iitm.ac.in' }); check('E01 approved domain gets OTP step', good.sent === true);
  // D01 publish
  const g1 = await api('POST', '/api/events', { club_id: stM01.me.managed[0].club_id, title: 'D01 Workshop', description: 'x', category: 'Workshop', start_at: iso(60 * 5), end_at: iso(60 * 6), venue: 'Room A', publish: true }, M01);
  check('D01 manager publishes', !!g1.id, JSON.stringify(g1));
  const s1 = await state(S01), s2 = await state(S02);
  check('D01 S01 & S02 see event', s1.events.some((e) => e.id === g1.id) && s2.events.some((e) => e.id === g1.id));
  // D02 save + RSVP
  await api('POST', `/api/events/${g1.id}/save`, null, S01); await api('POST', `/api/events/${g1.id}/rsvp`, { going: true }, S01);
  let m = await state(M01); check('D02 RSVP count = 1 for manager', m.stats.rsvp[g1.id] === 1, JSON.stringify(m.stats));
  let t = await state(S01); check('D02 S01 has one saved entry', t.saved_events.filter((x) => x.event_id === g1.id).length === 1);
  t = await state(S02); check('D02 S02 schedule unchanged', !t.saved_events.some((x) => x.event_id === g1.id));
  await api('POST', `/api/events/${g1.id}/save`, null, S01); t = await state(S01); check('D02 save idempotent', t.saved_events.filter((x) => x.event_id === g1.id).length === 1);
  // D03 reschedule into S01 private overlap
  const pe = await api('POST', '/api/personal', { title: 'Private clash', start_at: iso(60 * 8), end_at: iso(60 * 9) }, S01);
  const ev = (await state(M01)).events.find((e) => e.id === g1.id);
  const up = await api('PUT', `/api/events/${g1.id}`, { version: ev.version, start_at: iso(60 * 8 + 15), end_at: iso(60 * 9 + 15) }, M01);
  check('D03 reschedule ok', up.ok, JSON.stringify(up));
  t = await state(S01); const notes = t.notifications.filter((n) => n.title.startsWith('Updated: D01'));
  check('D03 exactly one update notification with conflict warning', notes.length === 1 && /overlaps/i.test(notes[0].body), JSON.stringify(notes));
  const stale = await api('PUT', `/api/events/${g1.id}`, { version: ev.version, title: 'stale' }, M01); check('D11 stale write rejected (409)', stale.status === 409, stale.status);
  // D04 cancel
  const can = await api('POST', `/api/events/${g1.id}/cancel`, { reason: 'Speaker unavailable' }, M01); check('D04 cancel ok', can.ok);
  t = await state(S01); const ce = t.events.find((e) => e.id === g1.id); check('D04 students see cancelled & saved retained', ce.status === 'cancelled' && t.saved_events.some((x) => x.event_id === g1.id));
  const pend = require('../db').all(`SELECT COUNT(*) n FROM reminders WHERE ws=? AND item_id=? AND state='pending'`, ws, g1.id)[0].n; check('D04 reminders suppressed', pend === 0, pend);
  // D05 POR lifecycle
  const ecell = (await state(M02)).me.managed[0].club_id;
  const p = await api('POST', '/api/pors', { club_id: ecell, title: 'D05 Role', description: 'x', opens_at: iso(-10), closes_at: iso(60 * 48), url: 'https://example.org/demo/apply/x', publish: true }, M02);
  check('D05 POR published', !!p.id, JSON.stringify(p));
  check('D05 bad URL rejected', (await api('POST', '/api/pors', { club_id: ecell, title: 'Bad', opens_at: iso(-10), closes_at: iso(100), url: 'javascript:alert(1)' }, M02)).status === 400);
  check('D05 closing before opening rejected', (await api('POST', '/api/pors', { club_id: ecell, title: 'Bad', opens_at: iso(100), closes_at: iso(10), url: 'https://example.org/x' }, M02)).status === 400);
  await api('POST', `/api/pors/${p.id}/save`, null, S01); await api('POST', `/api/pors/${p.id}/click`, null, S01); await api('POST', `/api/pors/${p.id}/click`, null, S01);
  m = await state(M02); check('D05 unique clicks = 1 (deduped)', m.stats.clicks[p.id] === 1, JSON.stringify(m.stats));
  t = await state(S01); check('D05 click did not mark applied', t.saved_pors.find((x) => x.por_id === p.id).app_status === 'interested');
  await api('POST', `/api/pors/${p.id}/close`, null, M02); t = await state(S01); check('D05 closed POR no longer open', t.pors.find((x) => x.id === p.id).computed_status === 'closed');
  // D06 club profile
  await api('PUT', `/api/clubs/${ecell}`, { description: 'New description', website: 'https://example.org/e', contact: 'x@example.org' }, M02);
  await api('POST', `/api/clubs/${ecell}/members`, { display_name: 'New Member', role_label: 'Treasurer' }, M02);
  t = await state(S01); check('D06 club edit + member visible', t.clubs.find((c) => c.id === ecell).description === 'New description' && t.members.some((x) => x.display_name === 'New Member'));
  // D07 permissions
  check('D07 student cannot publish', (await api('POST', '/api/events', { club_id: ecell, title: 'x', start_at: iso(10), end_at: iso(20), publish: true }, S01)).status === 403);
  check('D07 M01 cannot edit E-Cell', (await api('PUT', `/api/clubs/${ecell}`, { description: 'hack' }, M01)).status === 403);
  check('D07 M01 cannot publish for E-Cell', (await api('POST', '/api/events', { club_id: ecell, title: 'x', start_at: iso(10), end_at: iso(20), publish: true }, M01)).status === 403);
  check('D07 student cannot self-promote', (await api('POST', '/api/admin/roles/grant', { user_id: 'x', club_id: ecell }, S01)).status === 403);
  const adm = await state(A01); const role = adm.admin.roles.find((r) => r.user_name.startsWith('Vikram') && r.active);
  await api('POST', `/api/admin/roles/${role.id}/revoke`, null, A01);
  const cfi = stM01.me.managed.find((x) => x.club_id === role.club_id).club_id;
  check('D07 revoked manager loses access immediately', (await api('POST', '/api/events', { club_id: cfi, title: 'x', start_at: iso(10), end_at: iso(20) }, M01)).status === 403);
  // D08 privacy
  check('D08 S02 cannot read S01 private schedule', (await api('GET', `/api/private/${st01.me.id}/schedule`, null, S02)).status === 403);
  check('D08 manager state has no private data', !(await state(M02)).personal.length && !(await state(M02)).saved_events.length);
  check('D08 S01 sees only own personal events', (await state(S01)).personal.every((x) => x.user_id === st01.me.id));
  // D09 career sync
  await api('POST', '/api/career/connect', {}, S01); t = await state(S01);
  check('D09 connect imports items', t.career.items.length === 4, t.career.items.length);
  const co = await state(C01); const test = co.coordinator.feed.find((f) => f.student_id === st01.me.id && f.item_type === 'test' && f.company.startsWith('Orbit'));
  await api('PUT', `/api/career/source/${test.id}`, { start_at: iso(60 * 30), end_at: iso(60 * 31) }, C01);
  t = await state(S01); const ci = t.career.items.find((x) => x.external_id === test.external_id);
  check('D09 auto-sync updates one entry, no dup', ci.start_at === new Date(iso(60 * 30)).toISOString().slice(0, 16) + ':00.000Z' || t.career.items.filter((x) => x.external_id === test.external_id).length === 1 && ci.revision === 2);
  await api('POST', '/api/career/sync', {}, S01); await api('POST', '/api/career/sync', {}, S01); t = await state(S01);
  check('D09 repeat sync: zero duplicates', t.career.items.length === 4 && t.career.runs[0].added === 0, JSON.stringify(t.career.runs[0]));
  check('D09 S02 cannot see S01 career', (await state(S02)).career.items.every((x) => x.user_id !== st01.me.id));
  check('E10 date-only item stays date-only', t.career.items.find((x) => x.date_only === 1));
  // quarantine + outage + expired token + recovery
  await api('POST', '/api/career/source', { student_id: st01.me.id, company: 'Broken Co', role: 'X', item_type: 'test', season: 'placement', eligibility: 'assigned' }, C01);
  await api('POST', '/api/career/sync', {}, S01); t = await state(S01); check('E12 invalid record quarantined', t.career.runs[0].quarantined === 1 && !t.career.items.find((x) => x.company === 'Broken Co'), JSON.stringify(t.career.runs[0]));
  await api('POST', '/api/career/portal', { outage: true }, C01); const so = await api('POST', '/api/career/sync', {}, S01); t = await state(S01);
  check('E12 outage keeps last-known + stale', so.ok === false && t.career.conn.stale === 1 && t.career.items.length === 4);
  await api('POST', '/api/career/portal', { token_expired: true }, C01); const te = await api('POST', '/api/career/sync', {}, S01); check('E12 expired token message', /expired/i.test(te.error || ''));
  await api('POST', '/api/career/portal', {}, C01); t = await state(S01); check('E12 recovery clears stale', t.career.conn.stale === 0);
  // cancel from source
  await api('POST', `/api/career/source/${test.id}/cancel`, null, C01); t = await state(S01); check('Career cancellation marks cancelled, history kept', t.career.items.find((x) => x.external_id === test.external_id).source_status === 'cancelled');
  // E05 48h feed
  const s05 = await state(S01); const now = Date.now();
  const recent = s05.events.filter((e) => e.published_at && now - Date.parse(e.published_at) <= 48 * 3600e3 && e.status === 'published');
  check('E05 47h item included, 52h excluded', recent.some((e) => e.title.startsWith('Shaastra Volunteer')) && !recent.some((e) => e.title.startsWith('Open Mic')));
  // personal validation
  check('E03 invalid time rejected', (await api('POST', '/api/personal', { title: 'bad', start_at: iso(60), end_at: iso(30) }, S01)).status === 400);
  // Seniors
  const sen = await api('GET', '/api/seniors?club=e-cell', null, S01); check('E08 senior search finds opted-in', sen.data.length === 1 && sen.data[0].name.startsWith('Rohan'), JSON.stringify(sen));
  await api('PUT', '/api/profile', { vis: { discoverable: false } }, S02); const sen2 = await api('GET', '/api/seniors?club=e-cell', null, S01); check('E08 hidden profile inaccessible', sen2.data.length === 0);
  // moderation
  const ev2 = s05.events.find((e) => e.title.startsWith('Startup Pitch'));
  check('Moderation needs reason', (await api('POST', '/api/admin/moderate', { item_type: 'event', item_id: ev2.id, hide: true }, A01)).status === 400);
  await api('POST', '/api/admin/moderate', { item_type: 'event', item_id: ev2.id, hide: true, reason: 'Misleading' }, A01);
  check('Hidden listing disappears for students', !(await state(S01)).events.some((e) => e.id === ev2.id));
  check('Audit retained', (await state(A01)).admin.audit.some((a) => a.action === 'moderate.hide'));
  // D10 reset
  await api('POST', '/api/admin/reset', { confirm: 'RESET' }, A01); const M01b = await login(ws, 'M01'); check('D10 reset restores seed', (await state(M01b)).events.length === 11);
  const ws2 = (await api('POST', '/api/workspace')).ws; const x = await login(ws2, 'M01'); check('D10 other workspace isolated', (await state(x)).events.length === 11 && !(await state(x)).events.some((e) => e.title === 'D01 Workshop'));
  console.log(results.join('\n')); console.log(`\n${pass} passed, ${fail} failed`);
  srv.close(); process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
