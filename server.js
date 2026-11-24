'use strict';
const express = require('express');
const crypto = require('crypto');
const path = require('path');
const { all, get, run, uid, nowISO, bump, audit, seedWorkspace, ensureWorkspace, db } = require('./db');
const L = require('./logic');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: '100kb' }));
app.use((req, res, next) => { res.set({ 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'SAMEORIGIN' }); next(); });

const APPROVED_DOMAINS = (process.env.APPROVED_DOMAINS || 'smail.iitm.ac.in').split(',').map((s) => s.trim().toLowerCase());
const DEMO_OTP = '123456';

class HttpError extends Error { constructor(status, msg, code) { super(msg); this.status = status; this.code = code; } }
const must = (cond, status, msg, code) => { if (!cond) throw new HttpError(status, msg, code); };
const wrap = (fn) => (req, res) => { try { const out = fn(req, res); if (out !== undefined && !res.headersSent) res.json(out); } catch (e) { if (e instanceof HttpError) res.status(e.status).json({ error: e.message, code: e.code }); else { console.error(e); res.status(500).json({ error: 'Server error' }); } } };

// ---------- simple in-memory rate limit for sign-in ----------
const attempts = new Map();
function rateLimit(key, max = 8, windowMs = 10 * 60 * 1000) {
  const now = Date.now(); const a = (attempts.get(key) || []).filter((t) => now - t < windowMs);
  a.push(now); attempts.set(key, a);
  must(a.length <= max, 429, 'Too many attempts. Try again in a few minutes.', 'rate_limited');
}

// ---------- validation helpers ----------
const s = (v, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const isUrl = (u) => { try { const x = new URL(u); return x.protocol === 'http:' || x.protocol === 'https:'; } catch { return false; } };
const isIso = (v) => typeof v === 'string' && !Number.isNaN(Date.parse(v));
const iso = (v) => new Date(v).toISOString();

// ---------- auth ----------
function auth(req) {
  const tok = req.get('x-session');
  must(tok, 401, 'Sign in required', 'no_session');
  const sess = get('SELECT * FROM sessions WHERE token=?', tok);
  must(sess, 401, 'Session expired — please sign in again', 'bad_session');
  const me = get('SELECT * FROM users WHERE ws=? AND id=?', sess.ws, sess.user_id);
  must(me, 401, 'Session expired', 'bad_session');
  return { ws: sess.ws, me };
}
const isManager = (ws, userId, clubId) => !!get('SELECT 1 x FROM club_roles WHERE ws=? AND user_id=? AND club_id=? AND active=1', ws, userId, clubId);
function mustManage(ws, me, clubId) {
  must(clubId && get('SELECT 1 x FROM clubs WHERE ws=? AND id=?', ws, clubId), 400, 'Unknown club');
  must(isManager(ws, me.id, clubId), 403, 'You do not have publishing access for this club (checked on the server).', 'forbidden');
}
const mustRole = (me, role) => must(me.role_type === role, 403, `This action needs the ${role} role.`, 'forbidden');

// ---------- public: workspace + login ----------
app.get('/healthz', (req, res) => res.json({ ok: true }));
app.get('/api/identities', wrap((req) => {
  const ws = s(req.query.w, 24); must(ensureWorkspace(ws), 400, 'Invalid workspace');
  const managers = all(`SELECT cr.user_id, c.name FROM club_roles cr JOIN clubs c ON c.ws=cr.ws AND c.id=cr.club_id WHERE cr.ws=? AND cr.active=1`, ws);
  return all(`SELECT id, code, name, role_type, dept, email FROM users WHERE ws=? ORDER BY code`, ws).map((u) => ({ ...u, clubs: managers.filter((m) => m.user_id === u.id).map((m) => m.name) }));
}));
app.post('/api/workspace', wrap(() => { const ws = crypto.randomBytes(9).toString('hex'); seedWorkspace(ws); initialSync(ws); return { ws }; }));
function initialSync(ws) { L.syncAllConnected(ws, 'seed'); }

app.post('/api/login', wrap((req) => {
  const ws = s(req.body.w, 24); must(ensureWorkspace(ws), 400, 'Invalid workspace');
  rateLimit('login:' + req.ip, 120);
  const u = get('SELECT * FROM users WHERE ws=? AND code=?', ws, s(req.body.code, 8));
  must(u, 404, 'Unknown demo identity');
  if (!get('SELECT 1 x FROM career_items WHERE ws=? LIMIT 1', ws)) initialSync(ws);
  const token = crypto.randomBytes(24).toString('hex');
  run('INSERT INTO sessions VALUES(?,?,?,?)', token, ws, u.id, nowISO());
  return { session: token };
}));
app.post('/api/otp/request', wrap((req) => {
  const ws = s(req.body.w, 24); must(ensureWorkspace(ws), 400, 'Invalid workspace');
  const email = s(req.body.email, 120).toLowerCase(); rateLimit('otp:' + req.ip + email);
  must(/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email), 400, 'Enter a valid email address');
  const domain = email.split('@')[1];
  must(APPROVED_DOMAINS.includes(domain), 403, 'Only approved IIT Madras student email domains can sign in. This prototype never accepts other domains for student data.', 'domain_not_approved');
  const u = get('SELECT 1 x FROM users WHERE ws=? AND lower(email)=?', ws, email);
  must(u, 404, 'No demo account for this email in this workspace. Use "Try demo" below.', 'no_account');
  return { sent: true, demo_otp_hint: DEMO_OTP, note: 'Demo only: no email is sent. Use the code shown.' };
}));
app.post('/api/otp/verify', wrap((req) => {
  const ws = s(req.body.w, 24); must(ensureWorkspace(ws), 400, 'Invalid workspace');
  const email = s(req.body.email, 120).toLowerCase(); rateLimit('otpv:' + req.ip + email);
  must(s(req.body.otp, 10) === DEMO_OTP, 401, 'Incorrect or expired code. Request a new one.', 'bad_otp');
  const u = get('SELECT * FROM users WHERE ws=? AND lower(email)=?', ws, email); must(u, 404, 'No account');
  const token = crypto.randomBytes(24).toString('hex');
  run('INSERT INTO sessions VALUES(?,?,?,?)', token, ws, u.id, nowISO());
  return { session: token };
}));
app.post('/api/logout', wrap((req) => { const t = req.get('x-session'); if (t) run('DELETE FROM sessions WHERE token=?', t); return { ok: true }; }));

// ---------- state ----------
app.get('/api/state', wrap((req) => {
  const { ws, me } = auth(req);
  L.dispatchDue(ws);
  const W = get('SELECT rev FROM workspaces WHERE id=?', ws);
  if (String(req.query.rev) === String(W.rev) && !req.query.force) return { unchanged: true, rev: W.rev, now: nowISO() };
  return L.buildState(ws, me);
}));

// ---------- events ----------
function eventFields(b, partial) {
  const f = {};
  if (!partial || 'title' in b) { f.title = s(b.title, 120); must(f.title, 400, 'Title is required'); }
  if (!partial || 'description' in b) f.description = s(b.description, 2000);
  if (!partial || 'category' in b) f.category = s(b.category, 40) || 'Event';
  if (!partial || 'venue' in b) f.venue = s(b.venue, 160);
  if (!partial || 'url' in b) { f.url = s(b.url, 300); must(!f.url || isUrl(f.url), 400, 'Link must be a valid http(s) URL'); }
  if (!partial || 'resources' in b) { f.resources = s(b.resources, 300); must(!f.resources || isUrl(f.resources), 400, 'Resource link must be a valid http(s) URL'); }
  if (!partial || 'contact' in b) f.contact = s(b.contact, 120);
  if (!partial || 'start_at' in b) { must(isIso(b.start_at), 400, 'Start date/time is required'); f.start_at = iso(b.start_at); }
  if (!partial || 'end_at' in b) { must(isIso(b.end_at), 400, 'End date/time is required'); f.end_at = iso(b.end_at); }
  return f;
}
app.post('/api/events', wrap((req) => {
  const { ws, me } = auth(req); const b = req.body;
  mustManage(ws, me, b.club_id);
  const f = eventFields(b, false);
  must(Date.parse(f.end_at) > Date.parse(f.start_at), 400, 'End time must be after start time');
  const id = uid('e'); const publish = !!b.publish;
  run('INSERT INTO events VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', ws, id, b.club_id, me.id, f.title, f.description, f.category, f.start_at, f.end_at, f.venue, f.url, f.resources, f.contact, publish ? 'published' : 'draft', '', publish ? nowISO() : null, nowISO(), 1, 0, '');
  audit(ws, me.id, publish ? 'event.publish' : 'event.draft', 'event', id, f.title); bump(ws);
  return { id };
}));
app.put('/api/events/:id', wrap((req) => {
  const { ws, me } = auth(req); const b = req.body;
  const e = get('SELECT * FROM events WHERE ws=? AND id=?', ws, req.params.id); must(e, 404, 'Event not found');
  mustManage(ws, me, e.club_id);
  must(e.status !== 'cancelled', 400, 'Cancelled events cannot be edited');
  must(Number(b.version) === e.version, 409, 'This listing was changed by someone else. Reload to see the latest version before editing.', 'stale_version');
  const f = { ...eventFields(b, true) };
  const start = f.start_at || e.start_at, end = f.end_at || e.end_at;
  must(Date.parse(end) > Date.parse(start), 400, 'End time must be after start time');
  const wasDraft = e.status === 'draft';
  const publishNow = wasDraft && b.publish;
  const next = { ...e, ...f };
  const timeOrVenue = !wasDraft && (next.start_at !== e.start_at || next.end_at !== e.end_at || next.venue !== e.venue);
  const material = timeOrVenue || (!wasDraft && next.title !== e.title);
  const ver = e.version + (material || publishNow ? 1 : 0);
  run('UPDATE events SET title=?,description=?,category=?,venue=?,url=?,resources=?,contact=?,start_at=?,end_at=?,version=?,updated_at=?,status=?,published_at=? WHERE ws=? AND id=?', next.title, next.description, next.category, next.venue, next.url, next.resources, next.contact, next.start_at, next.end_at, ver, nowISO(), publishNow ? 'published' : e.status, publishNow ? nowISO() : e.published_at, ws, e.id);
  const upd = get('SELECT * FROM events WHERE ws=? AND id=?', ws, e.id);
  if (timeOrVenue) {
    const bits = [];
    if (next.start_at !== e.start_at || next.end_at !== e.end_at) bits.push(`Now ${L.fmtIST(next.start_at)}`);
    if (next.venue !== e.venue) bits.push(`Venue: ${next.venue || 'TBA'}`);
    L.propagateEventChange(ws, upd, 'reschedule', bits.join(' · '));
  } else if (material) L.propagateEventChange(ws, upd, 'edit', 'Details updated.');
  audit(ws, me.id, publishNow ? 'event.publish' : 'event.edit', 'event', e.id, next.title); bump(ws);
  return { ok: true, version: ver };
}));
app.post('/api/events/:id/cancel', wrap((req) => {
  const { ws, me } = auth(req);
  const e = get('SELECT * FROM events WHERE ws=? AND id=?', ws, req.params.id); must(e, 404, 'Event not found');
  mustManage(ws, me, e.club_id);
  const reason = s(req.body.reason, 300); must(reason, 400, 'A reason is required to cancel');
  if (e.status === 'draft') { run('DELETE FROM events WHERE ws=? AND id=?', ws, e.id); audit(ws, me.id, 'event.discard', 'event', e.id, e.title); bump(ws); return { ok: true, discarded: true }; }
  run(`UPDATE events SET status='cancelled', cancel_reason=?, version=version+1, updated_at=? WHERE ws=? AND id=?`, reason, nowISO(), ws, e.id);
  L.propagateEventChange(ws, get('SELECT * FROM events WHERE ws=? AND id=?', ws, e.id), 'cancel', 'Cancelled: ' + e.title + ' — ' + reason);
  audit(ws, me.id, 'event.cancel', 'event', e.id, reason); bump(ws);
  return { ok: true };
}));

// ---------- PORs ----------
function porFields(b, partial) {
  const f = {};
  if (!partial || 'title' in b) { f.title = s(b.title, 120); must(f.title, 400, 'Role title is required'); }
  if (!partial || 'description' in b) f.description = s(b.description, 2000);
  if (!partial || 'eligibility' in b) f.eligibility = s(b.eligibility, 300);
  if (!partial || 'contact' in b) f.contact = s(b.contact, 120);
  if (!partial || 'url' in b) { f.url = s(b.url, 300); must(isUrl(f.url), 400, 'Application link must be a valid http(s) URL'); }
  if (!partial || 'opens_at' in b) { must(isIso(b.opens_at), 400, 'Opening date is required'); f.opens_at = iso(b.opens_at); }
  if (!partial || 'closes_at' in b) { must(isIso(b.closes_at), 400, 'Closing date is required'); f.closes_at = iso(b.closes_at); }
  return f;
}
app.post('/api/pors', wrap((req) => {
  const { ws, me } = auth(req); const b = req.body; mustManage(ws, me, b.club_id);
  const f = porFields(b, false); must(Date.parse(f.closes_at) > Date.parse(f.opens_at), 400, 'Closing time must be after opening time');
  const id = uid('p'); const publish = !!b.publish;
  run('INSERT INTO pors VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', ws, id, b.club_id, me.id, f.title, f.description, f.eligibility, f.opens_at, f.closes_at, f.url, f.contact, '', publish ? 'published' : 'draft', '', publish ? nowISO() : null, nowISO(), 1, 0, '');
  audit(ws, me.id, publish ? 'por.publish' : 'por.draft', 'por', id, f.title); bump(ws); return { id };
}));
app.put('/api/pors/:id', wrap((req) => {
  const { ws, me } = auth(req); const b = req.body;
  const p = get('SELECT * FROM pors WHERE ws=? AND id=?', ws, req.params.id); must(p, 404, 'Listing not found');
  mustManage(ws, me, p.club_id);
  must(p.status !== 'cancelled', 400, 'Cancelled listings cannot be edited');
  must(Number(b.version) === p.version, 409, 'This listing was changed by someone else. Reload to see the latest version before editing.', 'stale_version');
  const f = porFields(b, true); const n = { ...p, ...f };
  must(Date.parse(n.closes_at) > Date.parse(n.opens_at), 400, 'Closing time must be after opening time');
  const wasDraft = p.status === 'draft'; const publishNow = wasDraft && b.publish;
  const material = !wasDraft && (n.closes_at !== p.closes_at || n.opens_at !== p.opens_at || n.title !== p.title);
  const ver = p.version + (material || publishNow ? 1 : 0);
  run('UPDATE pors SET title=?,description=?,eligibility=?,opens_at=?,closes_at=?,url=?,contact=?,version=?,updated_at=?,status=?,published_at=? WHERE ws=? AND id=?', n.title, n.description, n.eligibility, n.opens_at, n.closes_at, n.url, n.contact, ver, nowISO(), publishNow ? 'published' : p.status, publishNow ? nowISO() : p.published_at, ws, p.id);
  if (material) L.propagatePorChange(ws, get('SELECT * FROM pors WHERE ws=? AND id=?', ws, p.id), 'edit', n.closes_at !== p.closes_at ? `New closing time: ${L.fmtIST(n.closes_at)}` : 'Details updated.');
  audit(ws, me.id, publishNow ? 'por.publish' : 'por.edit', 'por', p.id, n.title); bump(ws); return { ok: true, version: ver };
}));
app.post('/api/pors/:id/close', wrap((req) => {
  const { ws, me } = auth(req);
  const p = get('SELECT * FROM pors WHERE ws=? AND id=?', ws, req.params.id); must(p, 404, 'Listing not found'); mustManage(ws, me, p.club_id);
  run('UPDATE pors SET closes_at=?, version=version+1, updated_at=? WHERE ws=? AND id=?', nowISO(), nowISO(), ws, p.id);
  L.propagatePorChange(ws, get('SELECT * FROM pors WHERE ws=? AND id=?', ws, p.id), 'close', 'Applications are now closed.');
  audit(ws, me.id, 'por.close', 'por', p.id, p.title); bump(ws); return { ok: true };
}));
app.post('/api/pors/:id/cancel', wrap((req) => {
  const { ws, me } = auth(req);
  const p = get('SELECT * FROM pors WHERE ws=? AND id=?', ws, req.params.id); must(p, 404, 'Listing not found'); mustManage(ws, me, p.club_id);
  const reason = s(req.body.reason, 300); must(reason, 400, 'A reason is required');
  if (p.status === 'draft') { run('DELETE FROM pors WHERE ws=? AND id=?', ws, p.id); bump(ws); return { ok: true, discarded: true }; }
  run(`UPDATE pors SET status='cancelled', cancel_reason=?, version=version+1, updated_at=? WHERE ws=? AND id=?`, reason, nowISO(), ws, p.id);
  L.propagatePorChange(ws, get('SELECT * FROM pors WHERE ws=? AND id=?', ws, p.id), 'cancel', 'Cancelled — ' + reason);
  audit(ws, me.id, 'por.cancel', 'por', p.id, reason); bump(ws); return { ok: true };
}));

// ---------- student actions: save / RSVP / POR tracking ----------
function visibleEvent(ws, id) { const e = get('SELECT * FROM events WHERE ws=? AND id=?', ws, id); must(e && e.status !== 'draft' && !e.hidden, 404, 'Event not found'); return e; }
function visiblePor(ws, id) { const p = get('SELECT * FROM pors WHERE ws=? AND id=?', ws, id); must(p && p.status !== 'draft' && !p.hidden, 404, 'Listing not found'); return p; }
app.post('/api/events/:id/save', wrap((req) => {
  const { ws, me } = auth(req); const e = visibleEvent(ws, req.params.id);
  run('INSERT OR IGNORE INTO saved_events VALUES(?,?,?,?)', ws, me.id, e.id, nowISO());
  L.scheduleReminders(ws, me.id, 'event', e.id); bump(ws);
  const cf = L.conflictsOf(L.timedItems(ws, me.id), { key: 'event:' + e.id, start: e.start_at, end: e.end_at });
  return { ok: true, conflicts: cf.map((c) => ({ title: c.title, start: c.start, end: c.end })) };
}));
app.delete('/api/events/:id/save', wrap((req) => {
  const { ws, me } = auth(req);
  run('DELETE FROM saved_events WHERE ws=? AND user_id=? AND event_id=?', ws, me.id, req.params.id);
  L.cancelReminders(ws, me.id, 'event', req.params.id); bump(ws); return { ok: true };
}));
app.post('/api/events/:id/rsvp', wrap((req) => {
  const { ws, me } = auth(req); const e = visibleEvent(ws, req.params.id);
  must(e.status === 'published', 400, 'RSVP is closed for cancelled events');
  const going = req.body.going ? 1 : 0;
  run('INSERT INTO event_rsvps VALUES(?,?,?,?,?) ON CONFLICT(ws,user_id,event_id) DO UPDATE SET going=excluded.going, at=excluded.at', ws, me.id, e.id, going, nowISO());
  if (going) { run('INSERT OR IGNORE INTO saved_events VALUES(?,?,?,?)', ws, me.id, e.id, nowISO()); L.scheduleReminders(ws, me.id, 'event', e.id); }
  bump(ws); return { ok: true };
}));
app.post('/api/pors/:id/save', wrap((req) => {
  const { ws, me } = auth(req); const p = visiblePor(ws, req.params.id);
  const prefs = L.userPrefs(ws, me.id);
  run('INSERT OR IGNORE INTO saved_pors VALUES(?,?,?,?,?,?)', ws, me.id, p.id, nowISO(), 'interested', prefs.autoDeadline ? 1 : 0);
  L.scheduleReminders(ws, me.id, 'por', p.id); bump(ws); return { ok: true };
}));
app.delete('/api/pors/:id/save', wrap((req) => {
  const { ws, me } = auth(req);
  run('DELETE FROM saved_pors WHERE ws=? AND user_id=? AND por_id=?', ws, me.id, req.params.id);
  L.cancelReminders(ws, me.id, 'por', req.params.id); bump(ws); return { ok: true };
}));
app.put('/api/pors/:id/track', wrap((req) => {
  const { ws, me } = auth(req); visiblePor(ws, req.params.id);
  const st = s(req.body.app_status, 20);
  if (st) { must(['interested', 'applied', 'withdrawn'].includes(st), 400, 'Invalid status'); run('UPDATE saved_pors SET app_status=? WHERE ws=? AND user_id=? AND por_id=?', st, ws, me.id, req.params.id); }
  if ('on_calendar' in req.body) run('UPDATE saved_pors SET on_calendar=? WHERE ws=? AND user_id=? AND por_id=?', req.body.on_calendar ? 1 : 0, ws, me.id, req.params.id);
  bump(ws); return { ok: true };
}));
app.post('/api/pors/:id/click', wrap((req) => {
  const { ws, me } = auth(req); const p = visiblePor(ws, req.params.id);
  run('INSERT OR IGNORE INTO por_clicks VALUES(?,?,?,?)', ws, p.id, me.id, nowISO()); bump(ws);
  return { ok: true, url: p.url }; // a click is never recorded as an application
}));
app.post('/api/read', wrap((req) => {
  const { ws, me } = auth(req); const t = s(req.body.item_type, 10), id = s(req.body.item_id, 40);
  const it = t === 'event' ? get('SELECT version FROM events WHERE ws=? AND id=?', ws, id) : get('SELECT version FROM pors WHERE ws=? AND id=?', ws, id);
  if (!it) return { ok: true };
  run('INSERT INTO item_reads VALUES(?,?,?,?,?) ON CONFLICT(ws,user_id,item_type,item_id) DO UPDATE SET version=excluded.version', ws, me.id, t, id, it.version); bump(ws); return { ok: true };
}));
app.post('/api/report', wrap((req) => {
  const { ws, me } = auth(req); const t = s(req.body.item_type, 10), id = s(req.body.item_id, 40), reason = s(req.body.reason, 300);
  must(reason, 400, 'Please say what is wrong'); must(['event', 'por'].includes(t), 400, 'Bad item');
  run('INSERT INTO reports VALUES(?,?,?,?,?,?,?,?)', ws, uid('rp'), me.id, t, id, reason, 'open', nowISO()); bump(ws); return { ok: true };
}));

// ---------- personal events ----------
function personalFields(b) {
  const title = s(b.title, 120); must(title, 400, 'Title is required');
  must(isIso(b.start_at) && isIso(b.end_at), 400, 'Start and end are required');
  must(Date.parse(b.end_at) > Date.parse(b.start_at), 400, 'End time must be after start time');
  return { title, description: s(b.description, 500), venue: s(b.venue, 120), start_at: iso(b.start_at), end_at: iso(b.end_at), reminder_min: Math.max(0, Math.min(10080, parseInt(b.reminder_min, 10) || 0)) };
}
app.post('/api/personal', wrap((req) => {
  const { ws, me } = auth(req); const f = personalFields(req.body); const id = uid('pe');
  run('INSERT INTO personal_events VALUES(?,?,?,?,?,?,?,?,?,?)', ws, id, me.id, f.title, f.description, f.venue, f.start_at, f.end_at, f.reminder_min, nowISO());
  L.scheduleReminders(ws, me.id, 'personal', id); bump(ws);
  const cf = L.conflictsOf(L.timedItems(ws, me.id), { key: 'personal:' + id, start: f.start_at, end: f.end_at });
  return { id, conflicts: cf.map((c) => ({ title: c.title, start: c.start, end: c.end })) };
}));
app.put('/api/personal/:id', wrap((req) => {
  const { ws, me } = auth(req); const row = get('SELECT * FROM personal_events WHERE ws=? AND id=? AND user_id=?', ws, req.params.id, me.id); must(row, 404, 'Not found');
  const f = personalFields(req.body);
  run('UPDATE personal_events SET title=?,description=?,venue=?,start_at=?,end_at=?,reminder_min=? WHERE ws=? AND id=?', f.title, f.description, f.venue, f.start_at, f.end_at, f.reminder_min, ws, row.id);
  L.scheduleReminders(ws, me.id, 'personal', row.id); bump(ws);
  const cf = L.conflictsOf(L.timedItems(ws, me.id), { key: 'personal:' + row.id, start: f.start_at, end: f.end_at });
  return { ok: true, conflicts: cf.map((c) => ({ title: c.title, start: c.start, end: c.end })) };
}));
app.delete('/api/personal/:id', wrap((req) => {
  const { ws, me } = auth(req);
  run('DELETE FROM personal_events WHERE ws=? AND id=? AND user_id=?', ws, req.params.id, me.id);
  L.cancelReminders(ws, me.id, 'personal', req.params.id); bump(ws); return { ok: true };
}));
// Deliberate probe endpoint: proves private data is protected server-side (D08).
app.get('/api/private/:userId/schedule', wrap((req) => {
  const { ws, me } = auth(req);
  must(me.id === req.params.userId, 403, 'Private schedules can only be read by their owner (server-side check).', 'forbidden');
  return L.timedItems(ws, me.id);
}));

// ---------- profile, portfolio, seniors, prefs ----------
app.put('/api/profile', wrap((req) => {
  const { ws, me } = auth(req); const b = req.body;
  const vis = { ...L.j(me.vis, {}) };
  if (b.vis && typeof b.vis === 'object') for (const k of ['discoverable', 'dept', 'year', 'interests', 'linkedin', 'contact', 'portfolio']) if (k in b.vis) vis[k] = !!b.vis[k];
  const linkedin = s(b.linkedin ?? me.linkedin, 200); must(!linkedin || isUrl(linkedin), 400, 'LinkedIn must be a valid http(s) URL');
  run('UPDATE users SET dept=?,year=?,bio=?,interests=?,linkedin=?,contact=?,vis=? WHERE ws=? AND id=?', s(b.dept ?? me.dept, 80), s(b.year ?? me.year, 20), s(b.bio ?? me.bio, 300), s(b.interests ?? me.interests, 200), linkedin, s(b.contact ?? me.contact, 120), JSON.stringify(vis), ws, me.id);
  bump(ws); return { ok: true };
}));
app.put('/api/prefs', wrap((req) => {
  const { ws, me } = auth(req); const b = req.body; const p = L.userPrefs(ws, me.id);
  const offs = (a, d) => (Array.isArray(a) ? a.map((x) => parseInt(x, 10)).filter((x) => x > 0 && x <= 20160).slice(0, 4) : d);
  p.eventOffsets = offs(b.eventOffsets, p.eventOffsets); p.deadlineOffsets = offs(b.deadlineOffsets, p.deadlineOffsets);
  if ('inApp' in b) p.inApp = !!b.inApp; if ('autoDeadline' in b) p.autoDeadline = !!b.autoDeadline;
  run('UPDATE users SET prefs=? WHERE ws=? AND id=?', JSON.stringify(p), ws, me.id);
  for (const r of all('SELECT DISTINCT item_type,item_id FROM (SELECT \'event\' item_type, event_id item_id FROM saved_events WHERE ws=? AND user_id=? UNION SELECT \'por\', por_id FROM saved_pors WHERE ws=? AND user_id=?)', ws, me.id, ws, me.id)) L.scheduleReminders(ws, me.id, r.item_type, r.item_id);
  bump(ws); return { ok: true };
}));
app.post('/api/portfolio', wrap((req) => {
  const { ws, me } = auth(req); const b = req.body; const type = b.type === 'attended' ? 'attended' : 'por';
  const club = s(b.club, 80), role = s(b.role, 120); must(club && role, 400, 'Club and role/event are required');
  const ev = type === 'attended' && b.ref_id ? get('SELECT id FROM events WHERE ws=? AND id=?', ws, b.ref_id) : null;
  const id = uid('pf'); run('INSERT INTO portfolio VALUES(?,?,?,?,?,?,?,?,?,?,?)', ws, id, me.id, type, club, role, s(b.tenure, 40), s(b.description, 300), s(b.evidence_url, 200), ev ? ev.id : '', nowISO());
  bump(ws); return { id };
}));
app.put('/api/portfolio/:id', wrap((req) => {
  const { ws, me } = auth(req); const b = req.body; const row = get('SELECT * FROM portfolio WHERE ws=? AND id=? AND user_id=?', ws, req.params.id, me.id); must(row, 404, 'Not found');
  run('UPDATE portfolio SET club=?,role=?,tenure=?,description=? WHERE ws=? AND id=?', s(b.club ?? row.club, 80), s(b.role ?? row.role, 120), s(b.tenure ?? row.tenure, 40), s(b.description ?? row.description, 300), ws, row.id); bump(ws); return { ok: true };
}));
app.delete('/api/portfolio/:id', wrap((req) => { const { ws, me } = auth(req); run('DELETE FROM portfolio WHERE ws=? AND id=? AND user_id=?', ws, req.params.id, me.id); bump(ws); return { ok: true }; }));
app.get('/api/seniors', wrap((req) => {
  const { ws } = auth(req); const q = s(req.query.q, 60).toLowerCase(), club = s(req.query.club, 80).toLowerCase(), dept = s(req.query.dept, 80).toLowerCase(), year = s(req.query.year, 20).toLowerCase();
  const out = [];
  for (const u of all(`SELECT * FROM users WHERE ws=? AND role_type='student'`, ws)) {
    const vis = L.j(u.vis, {}); if (!vis.discoverable) continue; // opted-out profiles never appear
    const pf = all('SELECT club,role,tenure,type FROM portfolio WHERE ws=? AND user_id=? AND type=\'por\'', ws, u.id);
    const why = [];
    if (q) { const hay = [u.name, u.interests, u.bio, ...pf.map((p) => p.club + ' ' + p.role)].join(' ').toLowerCase(); if (!hay.includes(q)) continue; why.push(`Matches "${q}"`); }
    if (club) { const m = pf.filter((p) => p.club.toLowerCase().includes(club)); if (!m.length) continue; why.push('Was ' + m[0].role + ' at ' + m[0].club); }
    if (dept) { if (!(u.dept || '').toLowerCase().includes(dept) || !vis.dept) continue; why.push('Department: ' + u.dept); }
    if (year) { if (!(u.year || '').toLowerCase().includes(year) || !vis.year) continue; why.push('Year: ' + u.year); }
    out.push({ id: u.id, name: u.name, dept: vis.dept ? u.dept : null, year: vis.year ? u.year : null, interests: vis.interests ? u.interests : null, bio: u.bio, linkedin: vis.linkedin ? u.linkedin : null, contact: vis.contact ? u.contact : null, pors: vis.portfolio ? pf : [], why });
  }
  return out;
}));

// ---------- notifications ----------
app.post('/api/notifications/read', wrap((req) => {
  const { ws, me } = auth(req);
  if (req.body.all) run('UPDATE notifications SET read_at=? WHERE ws=? AND user_id=? AND read_at IS NULL', nowISO(), ws, me.id);
  else run('UPDATE notifications SET read_at=? WHERE ws=? AND user_id=? AND id=? AND read_at IS NULL', nowISO(), ws, me.id, s(req.body.id, 40));
  bump(ws); return { ok: true };
}));
app.post('/api/notifications/test', wrap((req) => {
  const { ws, me } = auth(req);
  L.notify(ws, me.id, { type: 'reminder', title: 'TEST reminder (demo)', body: 'This is a labelled test reminder triggered from Demo tools.', dedupe: 'test:' + uid('t') }); bump(ws); return { ok: true };
}));

// ---------- clubs & members ----------
app.put('/api/clubs/:id', wrap((req) => {
  const { ws, me } = auth(req); mustManage(ws, me, req.params.id); const b = req.body;
  const site = s(b.website, 200); must(!site || isUrl(site), 400, 'Website must be a valid http(s) URL');
  run('UPDATE clubs SET description=?, website=?, contact=? WHERE ws=? AND id=?', s(b.description, 800), site, s(b.contact, 120), ws, req.params.id);
  audit(ws, me.id, 'club.edit', 'club', req.params.id, ''); bump(ws); return { ok: true };
}));
app.post('/api/clubs/:id/members', wrap((req) => {
  const { ws, me } = auth(req); mustManage(ws, me, req.params.id); const name = s(req.body.display_name, 80), role = s(req.body.role_label, 60) || 'Member';
  must(name, 400, 'Name is required');
  run('INSERT INTO club_members VALUES(?,?,?,?,?,?)', ws, uid('m'), req.params.id, '', name, role); audit(ws, me.id, 'member.add', 'club', req.params.id, name); bump(ws); return { ok: true };
}));
app.delete('/api/clubs/:id/members/:mid', wrap((req) => {
  const { ws, me } = auth(req); mustManage(ws, me, req.params.id);
  run('DELETE FROM club_members WHERE ws=? AND id=? AND club_id=?', ws, req.params.mid, req.params.id); audit(ws, me.id, 'member.remove', 'club', req.params.id, req.params.mid); bump(ws); return { ok: true };
}));
app.post('/api/role-requests', wrap((req) => {
  const { ws, me } = auth(req); must(me.role_type === 'student', 403, 'Only students can request club access');
  const club = s(req.body.club_id, 40); must(get('SELECT 1 x FROM clubs WHERE ws=? AND id=?', ws, club), 400, 'Unknown club');
  must(!get(`SELECT 1 x FROM role_requests WHERE ws=? AND user_id=? AND club_id=? AND status='pending'`, ws, me.id, club), 400, 'You already have a pending request');
  run('INSERT INTO role_requests VALUES(?,?,?,?,?,?,?,?)', ws, uid('rq'), me.id, club, s(req.body.note, 300), 'pending', nowISO(), null); bump(ws); return { ok: true };
}));

// ---------- career ----------
app.post('/api/career/connect', wrap((req) => {
  const { ws, me } = auth(req); must(me.role_type === 'student', 403, 'Only students connect a career source');
  run('INSERT INTO career_conn VALUES(?,?,?,?,?,?) ON CONFLICT(ws,user_id) DO UPDATE SET connected=1,last_error=NULL,stale=0', ws, me.id, 1, null, null, 0);
  if (req.body.reconnect) run('UPDATE workspaces SET token_expired=0 WHERE id=?', ws);
  return L.runSync(ws, me.id, 'connect');
}));
app.post('/api/career/sync', wrap((req) => { const { ws, me } = auth(req); const r = L.runSync(ws, me.id, 'manual'); return r; }));
app.post('/api/career/disconnect', wrap((req) => {
  const { ws, me } = auth(req); const remove = !!req.body.remove;
  run('UPDATE career_conn SET connected=0 WHERE ws=? AND user_id=?', ws, me.id);
  if (remove) { for (const c of all('SELECT id FROM career_items WHERE ws=? AND user_id=?', ws, me.id)) L.cancelReminders(ws, me.id, 'career', c.id); run('DELETE FROM career_items WHERE ws=? AND user_id=?', ws, me.id); }
  bump(ws); return { ok: true };
}));
app.put('/api/career/items/:id', wrap((req) => {
  const { ws, me } = auth(req); const it = get('SELECT * FROM career_items WHERE ws=? AND id=? AND user_id=?', ws, req.params.id, me.id); must(it, 404, 'Not found');
  if ('hidden' in req.body) run('UPDATE career_items SET hidden=? WHERE ws=? AND id=?', req.body.hidden ? 1 : 0, ws, it.id); // preference only; never alters the source
  if ('reminder_min' in req.body) run('UPDATE career_items SET reminder_min=? WHERE ws=? AND id=?', Math.max(0, parseInt(req.body.reminder_min, 10) || 0), ws, it.id);
  L.scheduleReminders(ws, me.id, 'career', it.id); bump(ws); return { ok: true };
}));
// coordinator controls the simulated feed
function sourceFields(b) {
  const dateOnly = b.date_only ? 1 : 0;
  return { company: s(b.company, 80), role: s(b.role, 80), season: b.season === 'internship' ? 'internship' : 'placement', item_type: ['test', 'ppt', 'deadline', 'interview'].includes(b.item_type) ? b.item_type : 'test', start_at: isIso(b.start_at) ? iso(b.start_at) : null, end_at: isIso(b.end_at) ? iso(b.end_at) : null, deadline_at: isIso(b.deadline_at) ? iso(b.deadline_at) : null, date_only: dateOnly, mode: s(b.mode, 20) || 'Online', venue: s(b.venue, 100), eligibility: ['assigned', 'registered', 'eligible', 'unknown'].includes(b.eligibility) ? b.eligibility : 'unknown', link: 'https://example.org/demo/portal/item' };
}
app.post('/api/career/source', wrap((req) => {
  const { ws, me } = auth(req); mustRole(me, 'career');
  const stu = get(`SELECT id FROM users WHERE ws=? AND id=? AND role_type='student'`, ws, s(req.body.student_id, 40)); must(stu, 400, 'Pick a student');
  const f = sourceFields(req.body); const seq = get('SELECT ext_seq FROM workspaces WHERE id=?', ws).ext_seq + 1; run('UPDATE workspaces SET ext_seq=? WHERE id=?', seq, ws);
  run('INSERT INTO career_source VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', ws, uid('cs'), 'EXT-' + seq, stu.id, f.company, f.role, f.season, f.item_type, f.start_at, f.end_at, f.deadline_at, f.date_only, f.mode, f.venue, f.eligibility, 'active', 1, f.link, nowISO());
  audit(ws, me.id, 'career.source.add', 'career_source', 'EXT-' + seq, f.company); bump(ws); L.syncAllConnected(ws, 'feed-update', [stu.id]); return { ok: true };
}));
app.put('/api/career/source/:id', wrap((req) => {
  const { ws, me } = auth(req); mustRole(me, 'career');
  const row = get('SELECT * FROM career_source WHERE ws=? AND id=?', ws, req.params.id); must(row, 404, 'Not found');
  const f = sourceFields({ ...row, ...req.body });
  run('UPDATE career_source SET company=?,role=?,season=?,item_type=?,start_at=?,end_at=?,deadline_at=?,date_only=?,mode=?,venue=?,eligibility=?,revision=revision+1,updated_at=? WHERE ws=? AND id=?', f.company, f.role, f.season, f.item_type, f.start_at, f.end_at, f.deadline_at, f.date_only, f.mode, f.venue, f.eligibility, nowISO(), ws, row.id);
  audit(ws, me.id, 'career.source.update', 'career_source', row.external_id, f.company); bump(ws); L.syncAllConnected(ws, 'feed-update', [row.student_id]); return { ok: true };
}));
app.post('/api/career/source/:id/cancel', wrap((req) => {
  const { ws, me } = auth(req); mustRole(me, 'career');
  const row = get('SELECT * FROM career_source WHERE ws=? AND id=?', ws, req.params.id); must(row, 404, 'Not found');
  run(`UPDATE career_source SET source_status='cancelled', revision=revision+1, updated_at=? WHERE ws=? AND id=?`, nowISO(), ws, row.id);
  audit(ws, me.id, 'career.source.cancel', 'career_source', row.external_id, row.company); bump(ws); L.syncAllConnected(ws, 'feed-update', [row.student_id]); return { ok: true };
}));
app.post('/api/career/source/:id/delete', wrap((req) => { const { ws, me } = auth(req); mustRole(me, 'career'); run('DELETE FROM career_source WHERE ws=? AND id=?', ws, req.params.id); bump(ws); return { ok: true }; }));
app.post('/api/career/portal', wrap((req) => {
  const { ws, me } = auth(req); mustRole(me, 'career');
  run('UPDATE workspaces SET outage=?, token_expired=? WHERE id=?', req.body.outage ? 1 : 0, req.body.token_expired ? 1 : 0, ws); bump(ws);
  if (!req.body.outage && !req.body.token_expired) L.syncAllConnected(ws, 'recovery');
  return { ok: true };
}));

// ---------- admin ----------
app.post('/api/admin/roles/grant', wrap((req) => {
  const { ws, me } = auth(req); mustRole(me, 'admin');
  const u = get(`SELECT * FROM users WHERE ws=? AND id=? AND role_type='student'`, ws, s(req.body.user_id, 40)); must(u, 400, 'Pick a student');
  const c = get('SELECT * FROM clubs WHERE ws=? AND id=?', ws, s(req.body.club_id, 40)); must(c, 400, 'Pick a club');
  must(!isManager(ws, u.id, c.id), 400, 'Already a manager of this club');
  run('INSERT INTO club_roles VALUES(?,?,?,?,?,?,?,?,?,?)', ws, uid('r'), u.id, c.id, 'manager', me.id, 1, s(req.body.tenure, 20) || '2025-26', nowISO(), null);
  run(`UPDATE role_requests SET status='approved', decided_by=? WHERE ws=? AND user_id=? AND club_id=? AND status='pending'`, me.id, ws, u.id, c.id);
  L.notify(ws, u.id, { type: 'role', title: `You are now a manager of ${c.name}`, body: 'You can publish events and PORs for this club.', dedupe: 'role:' + uid('x') });
  audit(ws, me.id, 'role.grant', 'club_role', u.id, c.name); bump(ws); return { ok: true };
}));
app.post('/api/admin/roles/:id/revoke', wrap((req) => {
  const { ws, me } = auth(req); mustRole(me, 'admin');
  const r = get('SELECT * FROM club_roles WHERE ws=? AND id=?', ws, req.params.id); must(r, 404, 'Not found');
  run('UPDATE club_roles SET active=0, revoked_at=? WHERE ws=? AND id=?', nowISO(), ws, r.id);
  L.notify(ws, r.user_id, { type: 'role', title: 'Your club manager access was revoked', body: 'Publishing rights for this club have been removed.', dedupe: 'role:' + uid('x') });
  audit(ws, me.id, 'role.revoke', 'club_role', r.id, r.club_id); bump(ws); return { ok: true };
}));
app.post('/api/admin/requests/:id/decide', wrap((req) => {
  const { ws, me } = auth(req); mustRole(me, 'admin');
  const r = get('SELECT * FROM role_requests WHERE ws=? AND id=?', ws, req.params.id); must(r && r.status === 'pending', 404, 'Request not pending');
  if (req.body.approve) {
    run('INSERT INTO club_roles VALUES(?,?,?,?,?,?,?,?,?,?)', ws, uid('r'), r.user_id, r.club_id, 'manager', me.id, 1, '2025-26', nowISO(), null);
    L.notify(ws, r.user_id, { type: 'role', title: 'Manager request approved', body: 'You can now publish for this club.', dedupe: 'role:' + uid('x') });
  } else L.notify(ws, r.user_id, { type: 'role', title: 'Manager request declined', body: 'Your request was not approved.', dedupe: 'role:' + uid('x') });
  run('UPDATE role_requests SET status=?, decided_by=? WHERE ws=? AND id=?', req.body.approve ? 'approved' : 'declined', me.id, ws, r.id);
  audit(ws, me.id, req.body.approve ? 'request.approve' : 'request.decline', 'role_request', r.id, ''); bump(ws); return { ok: true };
}));
app.post('/api/admin/moderate', wrap((req) => {
  const { ws, me } = auth(req); mustRole(me, 'admin'); const t = s(req.body.item_type, 10), id = s(req.body.item_id, 40), hide = !!req.body.hide, reason = s(req.body.reason, 300);
  must(reason, 400, 'A reason is required for moderation');
  const tbl = t === 'event' ? 'events' : t === 'por' ? 'pors' : null; must(tbl, 400, 'Bad item');
  const it = get(`SELECT * FROM ${tbl} WHERE ws=? AND id=?`, ws, id); must(it, 404, 'Not found');
  run(`UPDATE ${tbl} SET hidden=?, hidden_reason=?, version=version+1 WHERE ws=? AND id=?`, hide ? 1 : 0, hide ? reason : '', ws, id);
  L.hideCascade(ws, t, id, hide);
  for (const m of all('SELECT user_id FROM club_roles WHERE ws=? AND club_id=? AND active=1', ws, it.club_id)) L.notify(ws, m.user_id, { type: 'moderation', title: `${hide ? 'Hidden' : 'Restored'} by admin: ${it.title}`, body: reason, link_type: t, link_id: id, dedupe: 'mod:' + uid('x') });
  if (hide) run(`UPDATE reports SET status='actioned' WHERE ws=? AND item_type=? AND item_id=? AND status='open'`, ws, t, id);
  audit(ws, me.id, hide ? 'moderate.hide' : 'moderate.restore', t, id, reason); bump(ws); return { ok: true };
}));
app.post('/api/admin/reports/:id/dismiss', wrap((req) => { const { ws, me } = auth(req); mustRole(me, 'admin'); run(`UPDATE reports SET status='dismissed' WHERE ws=? AND id=?`, ws, req.params.id); audit(ws, me.id, 'report.dismiss', 'report', req.params.id, ''); bump(ws); return { ok: true }; }));
app.post('/api/admin/reset', wrap((req) => {
  const { ws, me } = auth(req); mustRole(me, 'admin'); must(req.body.confirm === 'RESET', 400, 'Type RESET to confirm');
  const keep = req.get('x-session'); const uCode = me.code;
  seedWorkspace(ws); L.syncAllConnected(ws, 'seed');
  const nu = get('SELECT id FROM users WHERE ws=? AND code=?', ws, uCode); run('INSERT INTO sessions VALUES(?,?,?,?)', keep, ws, nu.id, nowISO());
  return { ok: true };
}));

// ---------- static ----------
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'], maxAge: 0 }));
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

setInterval(() => { try { L.dispatchAll(); } catch (e) { console.error(e); } }, 15000);
// simulated periodic portal sync (documented: every 60s for connected students in all workspaces)
setInterval(() => { try { for (const { ws } of all('SELECT DISTINCT ws FROM career_conn WHERE connected=1')) L.syncAllConnected(ws, 'periodic'); } catch (e) { console.error(e); } }, 60000);
// housekeeping: drop sessions older than 7 days and demo workspaces untouched for 14 days
setInterval(() => { try { const old = new Date(Date.now() - 14 * 864e5).toISOString(); for (const { id } of all('SELECT id FROM workspaces WHERE created_at < ? AND id NOT IN (SELECT ws FROM sessions)', old)) { require('./db').purgeWorkspace(id); } } catch (e) { console.error(e); } }, 6 * 3600e3);
setInterval(() => run(`DELETE FROM sessions WHERE created_at < ?`, new Date(Date.now() - 7 * 864e5).toISOString()), 3600e3);

const PORT = process.env.PORT || 3000;
if (require.main === module) app.listen(PORT, () => console.log('InstiLite prototype listening on ' + PORT));
module.exports = app;
