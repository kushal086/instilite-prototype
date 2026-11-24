'use strict';
// Business logic: conflicts, reminders, notifications, career sync, scoped state snapshots.
const { all, get, run, uid, nowISO, bump, audit, db } = require('./db');

const j = (s, d) => { try { return s ? JSON.parse(s) : d; } catch { return d; } };
const fmtIST = (iso) => new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true });
const fmtISTDate = (iso) => new Date(iso).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' });

// ---------- statuses & conflicts ----------
function porStatus(p, now = Date.now()) {
  if (p.status === 'draft') return 'draft';
  if (p.status === 'cancelled') return 'cancelled';
  if (now < Date.parse(p.opens_at)) return 'upcoming';
  if (now > Date.parse(p.closes_at)) return 'closed';
  return 'open';
}
const overlaps = (a, b) => Date.parse(a.start) < Date.parse(b.end) && Date.parse(b.start) < Date.parse(a.end);

function timedItems(ws, userId) {
  const items = [];
  for (const e of all(`SELECT e.* FROM events e JOIN saved_events s ON s.ws=e.ws AND s.event_id=e.id WHERE e.ws=? AND s.user_id=? AND e.status='published' AND e.hidden=0`, ws, userId))
    items.push({ key: 'event:' + e.id, type: 'event', id: e.id, title: e.title, start: e.start_at, end: e.end_at });
  for (const p of all('SELECT * FROM personal_events WHERE ws=? AND user_id=?', ws, userId))
    items.push({ key: 'personal:' + p.id, type: 'personal', id: p.id, title: p.title, start: p.start_at, end: p.end_at });
  for (const c of all(`SELECT * FROM career_items WHERE ws=? AND user_id=? AND hidden=0 AND source_status='active' AND date_only=0 AND start_at IS NOT NULL AND end_at IS NOT NULL AND eligibility IN ('assigned','registered')`, ws, userId))
    items.push({ key: 'career:' + c.id, type: 'career', id: c.id, title: c.company + ' · ' + c.item_type, start: c.start_at, end: c.end_at });
  return items;
}
function conflictsOf(items, target) {
  return items.filter((o) => o.key !== target.key && overlaps(o, target));
}
function conflictPairs(items) {
  const out = [];
  for (let i = 0; i < items.length; i++) for (let k = i + 1; k < items.length; k++) if (overlaps(items[i], items[k])) out.push([items[i], items[k]]);
  return out;
}

// ---------- notifications & reminders ----------
function notify(ws, userId, n) {
  const r = run('INSERT OR IGNORE INTO notifications VALUES(?,?,?,?,?,?,?,?,?,?,?)', ws, uid('n'), userId, n.type, n.title, n.body || '', n.link_type || '', n.link_id || '', nowISO(), null, n.dedupe || uid('d'));
  return r.changes > 0;
}
const offsetLabel = (m) => (m >= 1440 && m % 1440 === 0 ? `${m / 1440} day${m > 1440 ? 's' : ''}` : m >= 60 && m % 60 === 0 ? `${m / 60} hour${m > 60 ? 's' : ''}` : `${m} min`);

function userPrefs(ws, userId) { const u = get('SELECT prefs FROM users WHERE ws=? AND id=?', ws, userId); return { eventOffsets: [1440, 60], deadlineOffsets: [1440, 120], inApp: true, autoDeadline: true, ...j(u && u.prefs, {}) }; }

function cancelReminders(ws, userId, itemType, itemId) {
  if (userId) run(`UPDATE reminders SET state='cancelled' WHERE ws=? AND user_id=? AND item_type=? AND item_id=? AND state='pending'`, ws, userId, itemType, itemId);
  else run(`UPDATE reminders SET state='cancelled' WHERE ws=? AND item_type=? AND item_id=? AND state='pending'`, ws, itemType, itemId);
}
function scheduleReminders(ws, userId, itemType, itemId) {
  cancelReminders(ws, userId, itemType, itemId);
  const prefs = userPrefs(ws, userId);
  if (!prefs.inApp) return;
  let anchor = null, revision = 1, offsets = [];
  if (itemType === 'event') {
    const e = get('SELECT * FROM events WHERE ws=? AND id=?', ws, itemId);
    if (!e || e.status !== 'published' || e.hidden) return;
    anchor = e.start_at; revision = e.version; offsets = prefs.eventOffsets;
  } else if (itemType === 'por') {
    const p = get('SELECT * FROM pors WHERE ws=? AND id=?', ws, itemId);
    if (!p || porStatus(p) === 'cancelled' || p.hidden || p.status !== 'published') return;
    const sp = get('SELECT on_calendar FROM saved_pors WHERE ws=? AND user_id=? AND por_id=?', ws, userId, itemId);
    if (!sp) return;
    anchor = p.closes_at; revision = p.version; offsets = prefs.deadlineOffsets;
  } else if (itemType === 'personal') {
    const p = get('SELECT * FROM personal_events WHERE ws=? AND id=?', ws, itemId);
    if (!p) return;
    anchor = p.start_at; offsets = p.reminder_min ? [p.reminder_min] : [];
  } else if (itemType === 'career') {
    const c = get('SELECT * FROM career_items WHERE ws=? AND id=?', ws, itemId);
    if (!c || c.hidden || c.source_status !== 'active' || c.date_only || !['assigned', 'registered'].includes(c.eligibility)) return;
    anchor = c.item_type === 'deadline' ? c.deadline_at : c.start_at; revision = c.revision;
    offsets = c.reminder_min ? [c.reminder_min] : (c.item_type === 'deadline' ? prefs.deadlineOffsets : prefs.eventOffsets);
  }
  if (!anchor) return;
  for (const off of offsets) {
    const due = new Date(Date.parse(anchor) - off * 60000).toISOString();
    if (Date.parse(due) <= Date.now()) continue; // avoid past triggers
    const dedupe = `${itemType}:${itemId}:${revision}:${off}`;
    run(`INSERT INTO reminders VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(ws,user_id,dedupe) DO UPDATE SET state=CASE WHEN state='sent' THEN 'sent' ELSE 'pending' END, due_at=excluded.due_at`, ws, uid('rm'), userId, itemType, itemId, revision, off, due, 'pending', dedupe);
  }
}
function itemTitle(ws, r) {
  if (r.item_type === 'event') { const e = get('SELECT title FROM events WHERE ws=? AND id=?', ws, r.item_id); return e && e.title; }
  if (r.item_type === 'por') { const e = get('SELECT title FROM pors WHERE ws=? AND id=?', ws, r.item_id); return e && ('Application closes: ' + e.title); }
  if (r.item_type === 'personal') { const e = get('SELECT title FROM personal_events WHERE ws=? AND id=?', ws, r.item_id); return e && e.title; }
  if (r.item_type === 'career') { const e = get('SELECT company,item_type FROM career_items WHERE ws=? AND id=?', ws, r.item_id); return e && `${e.company} — ${e.item_type}`; }
}
function dispatchDue(ws) {
  const due = all(`SELECT * FROM reminders WHERE ws=? AND state='pending' AND due_at<=?`, ws, nowISO());
  let n = 0;
  for (const r of due) {
    run(`UPDATE reminders SET state='sent' WHERE ws=? AND id=?`, ws, r.id);
    const title = itemTitle(ws, r);
    if (!title) continue;
    const linkType = r.item_type === 'por' ? 'por' : r.item_type;
    if (notify(ws, r.user_id, { type: 'reminder', title: `Reminder (in ${offsetLabel(r.offset_min)}): ${title}`, body: 'Scheduled in-app reminder.', link_type: linkType, link_id: r.item_id, dedupe: 'rem:' + r.dedupe })) n++;
  }
  if (n) bump(ws);
  return n;
}
function dispatchAll() {
  for (const { ws } of all(`SELECT DISTINCT ws FROM reminders WHERE state='pending' AND due_at<=?`, nowISO())) dispatchDue(ws);
}

// ---------- event / POR change propagation ----------
function savedUsersOfEvent(ws, id) { return all('SELECT user_id FROM saved_events WHERE ws=? AND event_id=?', ws, id).map((r) => r.user_id); }
function savedUsersOfPor(ws, id) { return all('SELECT user_id FROM saved_pors WHERE ws=? AND por_id=?', ws, id).map((r) => r.user_id); }

function propagateEventChange(ws, ev, kind, summary) {
  run('INSERT INTO updates VALUES(?,?,?,?,?,?,?,?)', ws, uid('up'), 'event', ev.id, kind, summary, ev.version, nowISO());
  for (const u of savedUsersOfEvent(ws, ev.id)) {
    if (kind === 'cancel') { cancelReminders(ws, u, 'event', ev.id); notify(ws, u, { type: 'update', title: `Cancelled: ${ev.title}`, body: ev.cancel_reason || 'This event was cancelled by the organiser. It stays in your saved history.', link_type: 'event', link_id: ev.id, dedupe: `evupd:${ev.id}:${ev.version}` }); continue; }
    scheduleReminders(ws, u, 'event', ev.id);
    const me = { key: 'event:' + ev.id, start: ev.start_at, end: ev.end_at };
    const cf = conflictsOf(timedItems(ws, u), me);
    const body = summary + (cf.length ? ` ⚠ Now overlaps with ${cf.map((c) => c.title).join(', ')}.` : '');
    notify(ws, u, { type: 'update', title: `Updated: ${ev.title}`, body, link_type: 'event', link_id: ev.id, dedupe: `evupd:${ev.id}:${ev.version}` });
  }
}
function propagatePorChange(ws, p, kind, summary) {
  run('INSERT INTO updates VALUES(?,?,?,?,?,?,?,?)', ws, uid('up'), 'por', p.id, kind, summary, p.version, nowISO());
  for (const u of savedUsersOfPor(ws, p.id)) {
    if (kind === 'cancel' || kind === 'close') cancelReminders(ws, u, 'por', p.id); else scheduleReminders(ws, u, 'por', p.id);
    notify(ws, u, { type: 'update', title: `${kind === 'cancel' ? 'Cancelled' : kind === 'close' ? 'Closed early' : 'Updated'}: ${p.title}`, body: summary, link_type: 'por', link_id: p.id, dedupe: `porupd:${p.id}:${p.version}` });
  }
}
function hideCascade(ws, itemType, itemId, hidden) {
  if (itemType === 'event') for (const u of savedUsersOfEvent(ws, itemId)) hidden ? cancelReminders(ws, u, 'event', itemId) : scheduleReminders(ws, u, 'event', itemId);
  if (itemType === 'por') for (const u of savedUsersOfPor(ws, itemId)) hidden ? cancelReminders(ws, u, 'por', itemId) : scheduleReminders(ws, u, 'por', itemId);
}

// ---------- career sync ----------
const REQUIRED_OK = (r) => r.company && r.role && r.item_type && (r.date_only ? !!r.start_at : r.item_type === 'deadline' ? !!r.deadline_at : (r.start_at && r.end_at && Date.parse(r.end_at) > Date.parse(r.start_at)));

function runSync(ws, userId, trigger) {
  const conn = get('SELECT * FROM career_conn WHERE ws=? AND user_id=?', ws, userId);
  if (!conn || !conn.connected) return { ok: false, error: 'Not connected' };
  const W = get('SELECT * FROM workspaces WHERE id=?', ws);
  const runId = uid('sy');
  const fail = (msg) => {
    run('UPDATE career_conn SET last_error=?, stale=1 WHERE ws=? AND user_id=?', msg, ws, userId);
    run('INSERT INTO sync_runs VALUES(?,?,?,?,?,?,?,?,?,?,?,?)', ws, runId, userId, nowISO(), 'error', 0, 0, 0, 0, 0, msg, trigger);
    bump(ws);
    return { ok: false, error: msg };
  };
  if (W.token_expired) return fail('Portal access expired — reconnect to resume sync (simulated).');
  if (W.outage) return fail('Portal unreachable (simulated outage) — showing last known records.');
  const counts = { added: 0, updated: 0, cancelled: 0, unchanged: 0, quarantined: 0 };
  const tx = db.transaction(() => {
    const rows = all('SELECT * FROM career_source WHERE ws=? AND student_id=?', ws, userId);
    for (const r of rows) {
      if (!REQUIRED_OK(r)) { counts.quarantined++; continue; }
      const ex = get('SELECT * FROM career_items WHERE ws=? AND user_id=? AND external_id=?', ws, userId, r.external_id);
      const fields = [r.company, r.role, r.season, r.item_type, r.start_at, r.end_at, r.deadline_at, r.date_only, r.mode, r.venue, r.eligibility, r.source_status, r.revision, r.link];
      if (!ex) {
        const id = uid('ci');
        run('INSERT INTO career_items VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', ws, id, userId, r.external_id, ...fields, 0, null, nowISO());
        counts.added++;
        scheduleReminders(ws, userId, 'career', id);
        if (trigger !== 'connect' && r.source_status === 'active') notify(ws, userId, { type: 'career', title: `New career item: ${r.company} — ${r.item_type}`, body: 'Added from the (simulated) portal.', link_type: 'career', link_id: id, dedupe: `career:${r.external_id}:${r.revision}` });
      } else if (ex.revision === r.revision && ex.source_status === r.source_status) {
        counts.unchanged++;
      } else {
        const timeChanged = ex.start_at !== r.start_at || ex.end_at !== r.end_at || ex.deadline_at !== r.deadline_at || ex.venue !== r.venue;
        run('UPDATE career_items SET company=?,role=?,season=?,item_type=?,start_at=?,end_at=?,deadline_at=?,date_only=?,mode=?,venue=?,eligibility=?,source_status=?,revision=?,link=?,last_sync=? WHERE ws=? AND id=?', ...fields, nowISO(), ws, ex.id);
        if (r.source_status === 'cancelled') {
          counts.cancelled++; cancelReminders(ws, userId, 'career', ex.id);
          notify(ws, userId, { type: 'career', title: `Cancelled by source: ${r.company} — ${r.item_type}`, body: 'Marked cancelled in the portal. History is retained.', link_type: 'career', link_id: ex.id, dedupe: `career:${r.external_id}:${r.revision}` });
        } else {
          counts.updated++; scheduleReminders(ws, userId, 'career', ex.id);
          const when = r.item_type === 'deadline' ? fmtIST(r.deadline_at) : r.start_at ? fmtIST(r.start_at) : 'date TBA';
          const cf = r.start_at && r.end_at && !r.date_only ? conflictsOf(timedItems(ws, userId), { key: 'career:' + ex.id, start: r.start_at, end: r.end_at }) : [];
          if (timeChanged) notify(ws, userId, { type: 'career', title: `Rescheduled: ${r.company} — ${r.item_type}`, body: `Now ${when}.` + (cf.length ? ` ⚠ Overlaps with ${cf.map((c) => c.title).join(', ')}.` : ''), link_type: 'career', link_id: ex.id, dedupe: `career:${r.external_id}:${r.revision}` });
        }
      }
    }
    run('UPDATE career_conn SET last_sync=?, last_error=NULL, stale=0 WHERE ws=? AND user_id=?', nowISO(), ws, userId);
    run('INSERT INTO sync_runs VALUES(?,?,?,?,?,?,?,?,?,?,?,?)', ws, runId, userId, nowISO(), 'ok', counts.added, counts.updated, counts.cancelled, counts.unchanged, counts.quarantined, null, trigger);
    bump(ws);
  });
  tx();
  return { ok: true, ...counts };
}
function syncAllConnected(ws, trigger, onlyUsers) {
  for (const c of all('SELECT user_id FROM career_conn WHERE ws=? AND connected=1', ws)) if (!onlyUsers || onlyUsers.includes(c.user_id)) runSync(ws, c.user_id, trigger);
}

// ---------- state snapshot (scoped per user) ----------
function buildState(ws, me) {
  const W = get('SELECT * FROM workspaces WHERE id=?', ws);
  const isAdmin = me.role_type === 'admin';
  const managed = all('SELECT cr.club_id, c.name FROM club_roles cr JOIN clubs c ON c.ws=cr.ws AND c.id=cr.club_id WHERE cr.ws=? AND cr.user_id=? AND cr.active=1', ws, me.id);
  const managedIds = managed.map((m) => m.club_id);
  const clubs = all('SELECT * FROM clubs WHERE ws=?', ws).filter((c) => isAdmin || !c.hidden || managedIds.includes(c.id));
  const events = all('SELECT * FROM events WHERE ws=?', ws).filter((e) => (isAdmin ? e.status !== 'draft' : (e.status !== 'draft' && !e.hidden) || managedIds.includes(e.club_id)));
  const pors = all('SELECT * FROM pors WHERE ws=?', ws).filter((p) => (isAdmin ? p.status !== 'draft' : (p.status !== 'draft' && !p.hidden) || managedIds.includes(p.club_id))).map((p) => ({ ...p, computed_status: porStatus(p) }));
  const state = {
    rev: W.rev, now: nowISO(), ws,
    me: { id: me.id, code: me.code, name: me.name, email: me.email, role_type: me.role_type, dept: me.dept, year: me.year, bio: me.bio, interests: me.interests, linkedin: me.linkedin, contact: me.contact, vis: j(me.vis, {}), prefs: userPrefs(ws, me.id), managed },
    clubs, members: all('SELECT * FROM club_members WHERE ws=?', ws), events, pors,
    saved_events: all('SELECT event_id, saved_at FROM saved_events WHERE ws=? AND user_id=?', ws, me.id),
    rsvps: all('SELECT event_id, going FROM event_rsvps WHERE ws=? AND user_id=? AND going=1', ws, me.id).map((r) => r.event_id),
    saved_pors: all('SELECT por_id, saved_at, app_status, on_calendar FROM saved_pors WHERE ws=? AND user_id=?', ws, me.id),
    personal: all('SELECT * FROM personal_events WHERE ws=? AND user_id=?', ws, me.id),
    portfolio: all('SELECT * FROM portfolio WHERE ws=? AND user_id=? ORDER BY created_at DESC', ws, me.id),
    career: {
      conn: get('SELECT connected,last_sync,last_error,stale FROM career_conn WHERE ws=? AND user_id=?', ws, me.id) || { connected: 0 },
      items: all('SELECT * FROM career_items WHERE ws=? AND user_id=?', ws, me.id),
      runs: all('SELECT * FROM sync_runs WHERE ws=? AND user_id=? ORDER BY started_at DESC LIMIT 5', ws, me.id),
    },
    notifications: all('SELECT * FROM notifications WHERE ws=? AND user_id=? ORDER BY created_at DESC LIMIT 100', ws, me.id),
    updates: all('SELECT * FROM updates WHERE ws=? ORDER BY at DESC LIMIT 60', ws),
    reads: all('SELECT item_type,item_id,version FROM item_reads WHERE ws=? AND user_id=?', ws, me.id),
    my_requests: all('SELECT * FROM role_requests WHERE ws=? AND user_id=?', ws, me.id),
  };
  if (managedIds.length) {
    const q = managedIds.map(() => '?').join(',');
    state.stats = {
      rsvp: Object.fromEntries(all(`SELECT r.event_id, COUNT(*) n FROM event_rsvps r JOIN events e ON e.ws=r.ws AND e.id=r.event_id WHERE r.ws=? AND r.going=1 AND e.club_id IN (${q}) GROUP BY r.event_id`, ws, ...managedIds).map((r) => [r.event_id, r.n])),
      clicks: Object.fromEntries(all(`SELECT c.por_id, COUNT(*) n FROM por_clicks c JOIN pors p ON p.ws=c.ws AND p.id=c.por_id WHERE c.ws=? AND p.club_id IN (${q}) GROUP BY c.por_id`, ws, ...managedIds).map((r) => [r.por_id, r.n])),
    };
  }
  if (me.role_type === 'career') {
    state.coordinator = {
      students: all(`SELECT u.id,u.name,u.code,COALESCE(c.connected,0) connected, c.last_sync FROM users u LEFT JOIN career_conn c ON c.ws=u.ws AND c.user_id=u.id WHERE u.ws=? AND u.role_type='student'`, ws),
      feed: all('SELECT * FROM career_source WHERE ws=? ORDER BY student_id, start_at', ws),
      outage: !!W.outage, token_expired: !!W.token_expired,
    };
  }
  if (isAdmin) {
    state.admin = {
      users: all(`SELECT id,code,name,role_type FROM users WHERE ws=? ORDER BY code`, ws),
      roles: all('SELECT cr.*, u.name user_name, c.name club_name FROM club_roles cr JOIN users u ON u.ws=cr.ws AND u.id=cr.user_id JOIN clubs c ON c.ws=cr.ws AND c.id=cr.club_id WHERE cr.ws=? ORDER BY cr.created_at DESC', ws),
      requests: all('SELECT rq.*, u.name user_name, c.name club_name FROM role_requests rq JOIN users u ON u.ws=rq.ws AND u.id=rq.user_id JOIN clubs c ON c.ws=rq.ws AND c.id=rq.club_id WHERE rq.ws=? ORDER BY rq.created_at DESC', ws),
      reports: all('SELECT * FROM reports WHERE ws=? ORDER BY created_at DESC', ws),
      audit: all('SELECT a.*, u.name actor_name FROM audit_logs a LEFT JOIN users u ON u.ws=a.ws AND u.id=a.actor_id WHERE a.ws=? ORDER BY a.at DESC LIMIT 60', ws),
    };
  }
  return state;
}

module.exports = { j, porStatus, overlaps, timedItems, conflictsOf, conflictPairs, notify, scheduleReminders, cancelReminders, dispatchDue, dispatchAll, propagateEventChange, propagatePorChange, hideCascade, runSync, syncAllConnected, buildState, userPrefs, fmtIST, fmtISTDate };
