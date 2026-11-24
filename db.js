'use strict';
// Database layer: schema, helpers, workspace seeding (all data is fictional demo data).
const Database = require('better-sqlite3');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'instilite.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

const uid = (p) => p + '_' + crypto.randomBytes(5).toString('hex');
const nowISO = () => new Date().toISOString();

db.exec(`
CREATE TABLE IF NOT EXISTS workspaces(id TEXT PRIMARY KEY, created_at TEXT, rev INTEGER DEFAULT 0, outage INTEGER DEFAULT 0, token_expired INTEGER DEFAULT 0, seed_version INTEGER DEFAULT 1, ext_seq INTEGER DEFAULT 100);
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, ws TEXT, user_id TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS users(ws TEXT, id TEXT, code TEXT, name TEXT, email TEXT, role_type TEXT, dept TEXT, year TEXT, bio TEXT, interests TEXT, linkedin TEXT, contact TEXT, vis TEXT, prefs TEXT, PRIMARY KEY(ws,id));
CREATE TABLE IF NOT EXISTS clubs(ws TEXT, id TEXT, name TEXT, sphere TEXT, description TEXT, website TEXT, contact TEXT, hidden INTEGER DEFAULT 0, hidden_reason TEXT, PRIMARY KEY(ws,id));
CREATE TABLE IF NOT EXISTS club_roles(ws TEXT, id TEXT, user_id TEXT, club_id TEXT, role TEXT, granted_by TEXT, active INTEGER DEFAULT 1, tenure TEXT, created_at TEXT, revoked_at TEXT, PRIMARY KEY(ws,id));
CREATE TABLE IF NOT EXISTS club_members(ws TEXT, id TEXT, club_id TEXT, user_id TEXT, display_name TEXT, role_label TEXT, PRIMARY KEY(ws,id));
CREATE TABLE IF NOT EXISTS events(ws TEXT, id TEXT, club_id TEXT, author_id TEXT, title TEXT, description TEXT, category TEXT, start_at TEXT, end_at TEXT, venue TEXT, url TEXT, resources TEXT, contact TEXT, status TEXT, cancel_reason TEXT, published_at TEXT, updated_at TEXT, version INTEGER DEFAULT 1, hidden INTEGER DEFAULT 0, hidden_reason TEXT, PRIMARY KEY(ws,id));
CREATE TABLE IF NOT EXISTS pors(ws TEXT, id TEXT, club_id TEXT, author_id TEXT, title TEXT, description TEXT, eligibility TEXT, opens_at TEXT, closes_at TEXT, url TEXT, contact TEXT, resources TEXT, status TEXT, cancel_reason TEXT, published_at TEXT, updated_at TEXT, version INTEGER DEFAULT 1, hidden INTEGER DEFAULT 0, hidden_reason TEXT, PRIMARY KEY(ws,id));
CREATE TABLE IF NOT EXISTS saved_events(ws TEXT, user_id TEXT, event_id TEXT, saved_at TEXT, PRIMARY KEY(ws,user_id,event_id));
CREATE TABLE IF NOT EXISTS event_rsvps(ws TEXT, user_id TEXT, event_id TEXT, going INTEGER, at TEXT, PRIMARY KEY(ws,user_id,event_id));
CREATE TABLE IF NOT EXISTS saved_pors(ws TEXT, user_id TEXT, por_id TEXT, saved_at TEXT, app_status TEXT DEFAULT 'interested', on_calendar INTEGER DEFAULT 1, PRIMARY KEY(ws,user_id,por_id));
CREATE TABLE IF NOT EXISTS por_clicks(ws TEXT, por_id TEXT, user_id TEXT, first_at TEXT, PRIMARY KEY(ws,por_id,user_id));
CREATE TABLE IF NOT EXISTS personal_events(ws TEXT, id TEXT, user_id TEXT, title TEXT, description TEXT, venue TEXT, start_at TEXT, end_at TEXT, reminder_min INTEGER, created_at TEXT, PRIMARY KEY(ws,id));
CREATE TABLE IF NOT EXISTS portfolio(ws TEXT, id TEXT, user_id TEXT, type TEXT, club TEXT, role TEXT, tenure TEXT, description TEXT, evidence_url TEXT, ref_id TEXT, created_at TEXT, PRIMARY KEY(ws,id));
CREATE TABLE IF NOT EXISTS career_source(ws TEXT, id TEXT, external_id TEXT, student_id TEXT, company TEXT, role TEXT, season TEXT, item_type TEXT, start_at TEXT, end_at TEXT, deadline_at TEXT, date_only INTEGER DEFAULT 0, mode TEXT, venue TEXT, eligibility TEXT, source_status TEXT DEFAULT 'active', revision INTEGER DEFAULT 1, link TEXT, updated_at TEXT, PRIMARY KEY(ws,id));
CREATE TABLE IF NOT EXISTS career_conn(ws TEXT, user_id TEXT, connected INTEGER DEFAULT 0, last_sync TEXT, last_error TEXT, stale INTEGER DEFAULT 0, PRIMARY KEY(ws,user_id));
CREATE TABLE IF NOT EXISTS career_items(ws TEXT, id TEXT, user_id TEXT, external_id TEXT, company TEXT, role TEXT, season TEXT, item_type TEXT, start_at TEXT, end_at TEXT, deadline_at TEXT, date_only INTEGER, mode TEXT, venue TEXT, eligibility TEXT, source_status TEXT, revision INTEGER, link TEXT, hidden INTEGER DEFAULT 0, reminder_min INTEGER, last_sync TEXT, PRIMARY KEY(ws,id), UNIQUE(ws,user_id,external_id));
CREATE TABLE IF NOT EXISTS sync_runs(ws TEXT, id TEXT, user_id TEXT, started_at TEXT, status TEXT, added INTEGER, updated INTEGER, cancelled INTEGER, unchanged INTEGER, quarantined INTEGER, error TEXT, trigger TEXT, PRIMARY KEY(ws,id));
CREATE TABLE IF NOT EXISTS reminders(ws TEXT, id TEXT, user_id TEXT, item_type TEXT, item_id TEXT, revision INTEGER, offset_min INTEGER, due_at TEXT, state TEXT, dedupe TEXT, PRIMARY KEY(ws,id), UNIQUE(ws,user_id,dedupe));
CREATE TABLE IF NOT EXISTS notifications(ws TEXT, id TEXT, user_id TEXT, type TEXT, title TEXT, body TEXT, link_type TEXT, link_id TEXT, created_at TEXT, read_at TEXT, dedupe TEXT, PRIMARY KEY(ws,id), UNIQUE(ws,user_id,dedupe));
CREATE TABLE IF NOT EXISTS updates(ws TEXT, id TEXT, item_type TEXT, item_id TEXT, kind TEXT, summary TEXT, version INTEGER, at TEXT, PRIMARY KEY(ws,id));
CREATE TABLE IF NOT EXISTS item_reads(ws TEXT, user_id TEXT, item_type TEXT, item_id TEXT, version INTEGER, PRIMARY KEY(ws,user_id,item_type,item_id));
CREATE TABLE IF NOT EXISTS reports(ws TEXT, id TEXT, reporter_id TEXT, item_type TEXT, item_id TEXT, reason TEXT, status TEXT, created_at TEXT, PRIMARY KEY(ws,id));
CREATE TABLE IF NOT EXISTS role_requests(ws TEXT, id TEXT, user_id TEXT, club_id TEXT, note TEXT, status TEXT, created_at TEXT, decided_by TEXT, PRIMARY KEY(ws,id));
CREATE TABLE IF NOT EXISTS audit_logs(ws TEXT, id TEXT, actor_id TEXT, action TEXT, entity TEXT, entity_id TEXT, detail TEXT, at TEXT, PRIMARY KEY(ws,id));
`);

const WS_TABLES = ['sessions', 'users', 'clubs', 'club_roles', 'club_members', 'events', 'pors', 'saved_events', 'event_rsvps', 'saved_pors', 'por_clicks', 'personal_events', 'portfolio', 'career_source', 'career_conn', 'career_items', 'sync_runs', 'reminders', 'notifications', 'updates', 'item_reads', 'reports', 'role_requests', 'audit_logs'];

const all = (sql, ...p) => db.prepare(sql).all(...p);
const get = (sql, ...p) => db.prepare(sql).get(...p);
const run = (sql, ...p) => db.prepare(sql).run(...p);

function bump(ws) { run('UPDATE workspaces SET rev=rev+1 WHERE id=?', ws); }
function audit(ws, actor, action, entity, entityId, detail) {
  run('INSERT INTO audit_logs VALUES(?,?,?,?,?,?,?,?)', ws, uid('au'), actor, action, entity, entityId, detail || '', nowISO());
}

const DEFAULT_PREFS = { eventOffsets: [1440, 60], deadlineOffsets: [1440, 120], inApp: true, autoDeadline: true };
const DEFAULT_VIS = { discoverable: false, dept: true, year: true, interests: true, linkedin: false, contact: false, portfolio: true };

// ---------- seeding ----------
function seedWorkspace(ws) {
  const tx = db.transaction(() => {
    for (const t of WS_TABLES) run(`DELETE FROM ${t} WHERE ws=?`, ws);
    const now = Date.now();
    const IST = 5.5 * 3600e3;
    const ist = new Date(now + IST);
    const midnight = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) - IST;
    const D = (days, h = 0, m = 0) => new Date(midnight + days * 864e5 + (h * 60 + m) * 6e4).toISOString();
    const M = (min) => new Date(Math.round((now + min * 6e4) / 3e5) * 3e5).toISOString(); // now-relative, rounded to 5 min
    const H = (hoursAgo) => new Date(now - hoursAgo * 3600e3).toISOString();

    const wsRow = get('SELECT id FROM workspaces WHERE id=?', ws);
    if (!wsRow) run('INSERT INTO workspaces(id,created_at,rev) VALUES(?,?,1)', ws, nowISO());
    else run('UPDATE workspaces SET outage=0, token_expired=0, ext_seq=100 WHERE id=?', ws);

    // users: S01..S06, M01, M02 (students), C01, A01
    const U = [
      ['S01', 'Aditi Raman', 'student', 'Mechanical Engineering', '3rd year', 'Product design, robotics, design thinking', 'Curious about product roles.', 0],
      ['S02', 'Rohan Iyer', 'student', 'Electrical Engineering', '4th year', 'Embedded systems, startups, mentoring', 'Ex-core member at E-Cell. Happy to help juniors with PORs.', 1],
      ['S03', 'Meera Nair', 'student', 'Computer Science', '2nd year', 'AI, open source, theatre', 'Looking for a first POR.', 0],
      ['S04', 'Karthik Subramanian', 'student', 'Chemical Engineering', '4th year', 'Fests, sponsorship, public speaking', 'Ran sponsorship for a fest team. Ask me about cold emailing.', 1],
      ['S05', 'Priya Das', 'student', 'Naval Architecture', '4th year', 'Design, photography, publicity', 'Publicity lead for the cultural fest.', 1],
      ['S06', 'Arjun Menon', 'student', 'Metallurgical Engineering', '3rd year', 'Sports, event ops, volunteering', 'Sports club vice-captain.', 1],
      ['M01', 'Vikram Rao (CFI coordinator)', 'student', 'Mechanical Engineering', '4th year', 'Product design, prototyping', 'Coordinator, CFI clubs.', 0],
      ['M02', 'Sneha Pillai (E-Cell coordinator)', 'student', 'Management Studies', '4th year', 'Startups, outreach', 'Coordinator, E-Cell.', 0],
      ['C01', 'Career Coordinator (simulated)', 'career', 'Placement Cell (demo)', '', '', 'Manages the simulated career feed only.', 0],
      ['A01', 'Platform Admin', 'admin', 'InstiLite (demo)', '', '', 'Workspace-scoped verification and moderation.', 0],
    ];
    const uid_ = {};
    for (const [code, name, role, dept, year, interests, bio, disc] of U) {
      const id = uid('u'); uid_[code] = id;
      const vis = { ...DEFAULT_VIS, discoverable: !!disc, linkedin: !!disc, contact: false };
      const email = name.split(' ')[0].toLowerCase() + '.demo@smail.iitm.ac.in';
      run('INSERT INTO users VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)', ws, id, code, name, email, role, dept, year, bio, interests, disc ? 'https://www.linkedin.com/in/demo-' + code.toLowerCase() : '', '', JSON.stringify(vis), JSON.stringify(DEFAULT_PREFS));
    }

    // clubs
    const C = [
      ['cfi_pd', 'CFI Product Design Club', 'Technical Clubs', 'Hands-on product design: user research, prototyping and critique circles. (Demo record — no official affiliation implied.)', 'https://example.org/demo/cfi-product-design', 'pd.demo@example.org'],
      ['cfi_ai', 'CFI AI Club', 'Technical Clubs', 'Study groups, talks and projects around applied machine learning. (Demo record.)', 'https://example.org/demo/cfi-ai', 'ai.demo@example.org'],
      ['shaastra', 'Shaastra', 'Fests & Entrepreneurship', 'Technical festival team — operations, sponsorship, events and outreach. (Demo record.)', 'https://example.org/demo/shaastra', 'shaastra.demo@example.org'],
      ['saarang', 'Saarang', 'Fests & Entrepreneurship', 'Cultural festival team — events, publicity, design and production. (Demo record.)', 'https://example.org/demo/saarang', 'saarang.demo@example.org'],
      ['ecell', 'E-Cell', 'Fests & Entrepreneurship', 'Entrepreneurship cell — pitch nights, mentoring and founder talks. (Demo record.)', 'https://example.org/demo/ecell', 'ecell.demo@example.org'],
      ['sports', 'Demo Sports Club', 'Sports & Wellness', 'Inter-hostel tournaments, trials and fitness sessions. (Demo record.)', 'https://example.org/demo/sports', 'sports.demo@example.org'],
    ];
    const cid = {};
    for (const [key, name, sphere, desc, site, contact] of C) { cid[key] = uid('c'); run('INSERT INTO clubs(ws,id,name,sphere,description,website,contact) VALUES(?,?,?,?,?,?,?)', ws, cid[key], name, sphere, desc, site, contact); }

    // manager roles (security permission) — separate from display roles
    const roles = [['M01', 'cfi_pd'], ['M01', 'cfi_ai'], ['M02', 'ecell']];
    for (const [u, c] of roles) run('INSERT INTO club_roles VALUES(?,?,?,?,?,?,?,?,?,?)', ws, uid('r'), uid_[u], cid[c], 'manager', uid_.A01, 1, '2025-26', nowISO(), null);

    // 12 club membership links (display roles)
    const members = [['cfi_pd', 'M01', 'Coordinator'], ['cfi_pd', 'S01', 'Design Associate'], ['cfi_ai', 'M01', 'Coordinator'], ['cfi_ai', 'S01', 'Member'], ['cfi_ai', 'S03', 'Member'], ['ecell', 'M02', 'Coordinator'], ['ecell', 'S02', 'Core Member (alumni)'], ['shaastra', 'S04', 'Sponsorship Core'], ['saarang', 'S05', 'Publicity Lead'], ['sports', 'S06', 'Vice-Captain'], ['sports', 'S02', 'Member'], ['shaastra', 'S06', 'Volunteer']];
    for (const [c, u, r] of members) { const usr = get('SELECT name FROM users WHERE ws=? AND id=?', ws, uid_[u]); run('INSERT INTO club_members VALUES(?,?,?,?,?,?)', ws, uid('m'), cid[c], uid_[u], usr.name.replace(/ \(.*\)/, ''), r); }

    // 12 events: 8 published, 2 drafts, 1 cancelled, 1 past
    const evt = {};
    const E = (key, club, author, title, desc, cat, s, e, venue, status, pub, extra = {}) => {
      evt[key] = uid('e');
      run('INSERT INTO events VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', ws, evt[key], cid[club], uid_[author], title, desc, cat, s, e, venue, extra.url || '', extra.resources || '', extra.contact || '', status, extra.cancel || '', pub, pub || nowISO(), 1, 0, '');
    };
    E('llm', 'cfi_ai', 'M01', 'Intro to LLM Apps (Talk)', 'A one-hour primer on building small LLM-powered tools. Bring a laptop. (Fictional event.)', 'Talk', M(65), M(125), 'Room 101, Demo Seminar Block', 'published', H(30));
    E('figma', 'cfi_pd', 'M01', 'Figma to Prototype Workshop', 'Hands-on: turn wireframes into a clickable prototype. (Fictional event.)', 'Workshop', D(1, 16), D(1, 18), 'Design Studio, Demo Block', 'published', H(2), { resources: 'https://example.org/demo/figma-kit' });
    E('pitch', 'ecell', 'M02', 'Startup Pitch Night', 'Five teams pitch to a panel of demo mentors. (Fictional event.)', 'Competition', D(3, 17, 30), D(3, 19, 30), 'Open Air Theatre (demo)', 'published', H(10));
    E('brief', 'shaastra', 'M01', 'Shaastra Volunteer Briefing', 'Briefing for first-time volunteers. (Fictional event.)', 'Briefing', D(2, 19), D(2, 20), 'Lecture Hall 3 (demo)', 'published', H(47));
    E('mic', 'saarang', 'M01', 'Open Mic Auditions', 'Audition slots for the cultural showcase. (Fictional event.)', 'Auditions', D(5, 15), D(5, 17), 'Auditorium (demo)', 'published', H(52));
    E('badm', 'sports', 'M01', 'Inter-Hostel Badminton Trials', 'Trials for the hostel team. (Fictional event.)', 'Sports', D(1, 7), D(1, 9), 'Sports Complex (demo)', 'published', H(72));
    E('crit', 'cfi_pd', 'M01', 'Design Critique Circle', 'Bring work-in-progress for peer critique. (Fictional event.)', 'Meetup', D(6, 17), D(6, 18, 30), 'Design Studio, Demo Block', 'published', H(96));
    E('fire', 'ecell', 'M02', 'Founders Fireside Chat', 'Informal Q&A with demo founders. (Fictional event.)', 'Talk', D(8, 18), D(8, 19), 'Auditorium (demo)', 'published', H(120));
    E('kaggle', 'cfi_ai', 'M01', 'Kaggle Study Sprint (draft)', 'Draft — not yet published.', 'Study group', D(4, 18), D(4, 20), 'Room 204 (demo)', 'draft', null);
    E('boot', 'ecell', 'M02', 'Hack-the-Pitch Bootcamp (draft)', 'Draft — not yet published.', 'Workshop', D(7, 10), D(7, 13), 'Room 301 (demo)', 'draft', null);
    E('mural', 'saarang', 'M01', 'Campus Mural Meetup', 'Planning session for the fest mural. (Fictional event.)', 'Meetup', D(4, 16), D(4, 17), 'Art Room (demo)', 'cancelled', H(96), { cancel: 'Venue unavailable — will be rescheduled.' });
    E('orient', 'shaastra', 'M01', 'Orientation Mixer (past)', 'Past event kept for history. (Fictional event.)', 'Mixer', D(-1, 17), D(-1, 19), 'Gymkhana Lawn (demo)', 'published', H(200));
    // Fix: the Shaastra/Saarang/Sports demo events were authored by the coordinator account only for seed convenience; club ownership is by club_id.

    // 8 PORs: 5 open, 1 future, 1 closed, 1 draft
    const por = {};
    const P = (key, club, title, desc, elig, opens, closes, status, pub) => { por[key] = uid('p'); run('INSERT INTO pors VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', ws, por[key], cid[club], uid_.M01, title, desc, elig, opens, closes, 'https://example.org/demo/apply/' + key, get('SELECT contact FROM clubs WHERE ws=? AND id=?', ws, cid[club]).contact, '', status, '', pub, nowISO(), 1, 0, ''); };
    P('pdlead', 'cfi_pd', 'Design Lead', 'Lead design critiques and workshop content. (Fictional POR.)', 'Open to 2nd and 3rd years.', D(-3), D(2, 23, 59), 'published', H(80));
    P('airc', 'cfi_ai', 'Research Coordinator', 'Coordinate reading groups and project teams. (Fictional POR.)', 'Any year; basic ML exposure helpful.', D(-2), D(5, 23, 59), 'published', H(60));
    P('events', 'ecell', 'Events Head', 'Own the calendar of pitch nights and talks. (Fictional POR.)', 'Open to 2nd and 3rd years.', D(-4), D(1, 23, 59), 'published', H(100));
    P('spons', 'shaastra', 'Sponsorship Coordinator', 'Reach out to demo sponsors and manage deliverables. (Fictional POR.)', 'Any year.', D(-1), D(9, 23, 59), 'published', H(30));
    P('pub', 'saarang', 'Publicity Core Team', 'Posters, social and campus outreach. (Fictional POR.)', 'Design or writing portfolio welcome.', D(-1), D(4, 23, 59), 'published', H(20));
    P('capt', 'sports', 'Badminton Captain', 'Lead hostel-level badminton team. (Fictional POR.)', 'Prior team experience.', D(3), D(10, 23, 59), 'published', H(5));
    P('content', 'ecell', 'Content Intern', 'Write newsletters and event recaps. (Fictional POR.)', 'Any year.', D(-10), D(-2, 23, 59), 'published', H(240));
    P('wlead', 'cfi_ai', 'Workshop Lead (draft)', 'Draft — not yet published.', 'TBD', D(2), D(12, 23, 59), 'draft', null);

    // saved opportunities (6) and RSVP
    const s = (u, e) => run('INSERT INTO saved_events VALUES(?,?,?,?)', ws, uid_[u], evt[e], nowISO());
    s('S01', 'llm'); s('S01', 'pitch'); s('S02', 'brief');
    run('INSERT INTO event_rsvps VALUES(?,?,?,?,?)', ws, uid_.S01, evt.pitch, 1, nowISO());
    const sp = (u, p) => run('INSERT INTO saved_pors VALUES(?,?,?,?,?,?)', ws, uid_[u], por[p], nowISO(), 'interested', 1);
    sp('S01', 'pdlead'); sp('S01', 'events'); sp('S02', 'airc');

    // 4 private events
    const pe = (u, t, s_, e_, v, r) => run('INSERT INTO personal_events VALUES(?,?,?,?,?,?,?,?,?,?)', ws, uid('pe'), uid_[u], t, '', v, s_, e_, r, nowISO());
    pe('S01', 'Lab report meeting', M(95), M(155), 'Library group room', 30); // overlaps LLM talk
    pe('S01', 'Gym', D(1, 6), D(1, 7), 'Gym', 15);
    pe('S02', 'Project viva prep', D(2, 19, 30), D(2, 20, 30), 'Dept. lab', 30); // overlaps volunteer briefing
    pe('S03', 'Mess committee call', D(2, 20), D(2, 21), 'Online', 15);

    // 6 portfolio entries
    const pf = (u, t, club, role, tenure, desc) => run('INSERT INTO portfolio VALUES(?,?,?,?,?,?,?,?,?,?,?)', ws, uid('pf'), uid_[u], t, club, role, tenure, desc, '', '', nowISO());
    pf('S02', 'por', 'E-Cell', 'Core Member', '2024–25', 'Ran two pitch nights.');
    pf('S02', 'por', 'Demo Sports Club', 'Member', '2023–24', '');
    pf('S04', 'por', 'Shaastra', 'Sponsorship Core', '2024–25', 'Handled sponsor communication.');
    pf('S05', 'por', 'Saarang', 'Publicity Lead', '2024–25', 'Led the poster and social team.');
    pf('S06', 'por', 'Demo Sports Club', 'Vice-Captain', '2024–25', 'Organised inter-hostel trials.');
    pf('S01', 'attended', 'Shaastra', 'Attended: Orientation Mixer (self-reported)', '', '');

    // 6 simulated career records (S01: 4, S02: 2)
    const cs = (stu, company, role, season, type, s_, e_, dl, dateOnly, mode, venue, elig) => run('INSERT INTO career_source VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', ws, uid('cs'), 'EXT-' + Math.floor(1000 + Math.random() * 9000), uid_[stu], company, role, season, type, s_, e_, dl, dateOnly, mode, venue, elig, 'active', 1, 'https://example.org/demo/portal/item', nowISO());
    cs('S01', 'Orbit Analytics (demo)', 'Data Analyst', 'placement', 'test', D(2, 10), D(2, 11, 30), null, 0, 'Online', 'Proctored (demo)', 'assigned');
    cs('S01', 'Nimbus Systems (demo)', 'Software Engineer', 'placement', 'ppt', D(3, 17), D(3, 18), null, 0, 'Offline', 'Auditorium (demo)', 'registered');
    cs('S01', 'Quanta Labs (demo)', 'Product Intern', 'internship', 'deadline', null, null, D(4, 23, 59), 0, 'Online', '', 'registered');
    cs('S01', 'Helio Robotics (demo)', 'Mechanical Intern', 'internship', 'test', D(6), null, null, 1, 'TBA', '', 'unknown');
    cs('S02', 'Orbit Analytics (demo)', 'Data Analyst', 'placement', 'ppt', D(2, 14), D(2, 15), null, 0, 'Offline', 'Seminar Hall (demo)', 'assigned');
    cs('S02', 'Nimbus Systems (demo)', 'Software Engineer', 'placement', 'deadline', null, null, D(3, 18), 0, 'Online', '', 'registered');
    // S02 starts connected (imported on first poll via sync below)
    run('INSERT INTO career_conn VALUES(?,?,?,?,?,?)', ws, uid_.S02, 1, null, null, 0);

    // seeded updates (so Updates tab isn't empty): the cancelled mural
    run('INSERT INTO updates VALUES(?,?,?,?,?,?,?,?)', ws, uid('up'), 'event', evt.mural, 'cancel', 'Cancelled: Campus Mural Meetup — Venue unavailable', 1, H(20));

    // seeded role request for admin queue
    run('INSERT INTO role_requests VALUES(?,?,?,?,?,?,?,?)', ws, uid('rq'), uid_.S05, cid.saarang, 'I lead publicity and want to post Saarang listings.', 'pending', nowISO(), null);

    audit(ws, uid_.A01, 'seed', 'workspace', ws, 'Deterministic demo seed loaded');
    bump(ws);
  });
  tx();
}

function purgeWorkspace(ws) { for (const t of WS_TABLES) run(`DELETE FROM ${t} WHERE ws=?`, ws); run('DELETE FROM workspaces WHERE id=?', ws); }

function ensureWorkspace(ws) {
  if (!/^[a-z0-9]{6,24}$/i.test(ws)) return false;
  const row = get('SELECT id FROM workspaces WHERE id=?', ws);
  if (!row) seedWorkspace(ws);
  return true;
}

module.exports = { purgeWorkspace, db, all, get, run, uid, nowISO, bump, audit, seedWorkspace, ensureWorkspace, DEFAULT_PREFS, DEFAULT_VIS };
