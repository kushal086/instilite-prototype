'use strict';
/* ===== InstiLite demo — core: time helpers, seed data, guarded API ===== */
const IST = 19800000, H = 3600000, D = 86400000;
let CLOCK = 0; // demo clock offset (ms)
const now = () => Date.now() + CLOCK;
const dayStart = ms => Math.floor((ms + IST) / D) * D - IST;
const P = ms => { const d = new Date(ms + IST); return { y: d.getUTCFullYear(), mo: d.getUTCMonth(), d: d.getUTCDate(), h: d.getUTCHours(), mi: d.getUTCMinutes(), wd: d.getUTCDay() }; };
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONF = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const pad = n => String(n).padStart(2, '0');
const fTime = ms => { const p = P(ms); return (p.h % 12 || 12) + ':' + pad(p.mi) + ' ' + (p.h < 12 ? 'AM' : 'PM'); };
const fDay = ms => { const p = P(ms); return DOW[p.wd] + ', ' + p.d + ' ' + MON[p.mo]; };
const fDT = ms => fDay(ms) + ' · ' + fTime(ms);
const iDate = ms => { const p = P(ms); return p.y + '-' + pad(p.mo + 1) + '-' + pad(p.d); };
const iTime = ms => { const p = P(ms); return pad(p.h) + ':' + pad(p.mi); };
const fromIn = (d, t) => { if (!d) return NaN; const [y, m, dd] = d.split('-').map(Number); const [h, mi] = (t || '00:00').split(':').map(Number); return Date.UTC(y, m - 1, dd, h, mi) - IST; };
const rel = ms => {
  const diff = ms - now(), a = Math.abs(diff), m = Math.round(a / 60000);
  let s = m < 1 ? 'now' : m < 60 ? m + 'm' : a < 48 * H ? Math.round(a / H) + 'h' : Math.round(a / D) + 'd';
  if (s === 'now') return 'just now';
  return diff > 0 ? 'in ' + s : s + ' ago';
};
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let _id = 1000; const uid = p => p + (++_id);
const isUrl = s => /^https:\/\/[^\s/$.?#][^\s]*$/i.test(s || '');

/* ---------- Seed ---------- */
function makeSeed() {
  const B = dayStart(Date.now());
  const at = (d, h = 0, m = 0) => B + d * D + h * H + m * 60000;
  const ago = h => Date.now() - h * H;
  const DB = {
    base: B,
    spheres: [{ id: 'tech', name: 'Technical & Innovation' }, { id: 'fest', name: 'Fests & Culture' }, { id: 'ent', name: 'Enterprise & Sports' }],
    clubs: [
      { id: 'cfi_pd', sphere: 'tech', name: 'CFI Product Design Club', color: '#087F70', desc: 'Demo club. Hands-on design sprints, critiques and tool workshops for hackathons and product teams.', website: 'https://example.com/demo/cfi-pd', contact: 'cfi-pd@demo.example' },
      { id: 'cfi_ai', sphere: 'tech', name: 'CFI AI Club', color: '#1F6FD1', desc: 'Demo club. Study groups, paper readings and build nights around machine learning applications.', website: 'https://example.com/demo/cfi-ai', contact: 'cfi-ai@demo.example' },
      { id: 'shaastra', sphere: 'fest', name: 'Shaastra', color: '#C77700', desc: 'Demo listing for a technical-fest team: volunteers, sponsorship and event operations.', website: 'https://example.com/demo/shaastra', contact: 'shaastra@demo.example' },
      { id: 'saarang', sphere: 'fest', name: 'Saarang', color: '#C2417C', desc: 'Demo listing for a cultural-fest team: content, hospitality, design and performances.', website: 'https://example.com/demo/saarang', contact: 'saarang@demo.example' },
      { id: 'ecell', sphere: 'ent', name: 'E-Cell', color: '#6B4EE6', desc: 'Demo club. Founder talks, pitch nights and mentorship for student startups.', website: 'https://example.com/demo/ecell', contact: 'ecell@demo.example' },
      { id: 'sports', sphere: 'ent', name: 'Institute Sports Council (demo)', color: '#2F7D32', desc: 'Demo listing. Hostel leagues, trials and team-management roles.', website: 'https://example.com/demo/sports', contact: 'sports@demo.example' },
    ],
    users: [
      { id: 'S01', name: 'Aditi Raman', dept: 'Mechanical Engineering', year: 3, kind: 'student' },
      { id: 'S02', name: 'Rohan Iyer', dept: 'Computer Science', year: 4, kind: 'student' },
      { id: 'S03', name: 'Meera Nair', dept: 'Electrical Engineering', year: 2, kind: 'student' },
      { id: 'S04', name: 'Karthik Subramanian', dept: 'Chemical Engineering', year: 4, kind: 'student' },
      { id: 'S05', name: 'Zoya Khan', dept: 'Chemical Engineering', year: 4, kind: 'student' },
      { id: 'S06', name: 'Dev Patel', dept: 'Civil Engineering', year: 2, kind: 'student' },
      { id: 'M01', name: 'Ishaan Menon', dept: 'Mechanical Engineering', year: 3, kind: 'student', tag: 'CFI coordinator' },
      { id: 'M02', name: 'Tara Joshi', dept: 'Engineering Design', year: 3, kind: 'student', tag: 'E-Cell coordinator' },
      { id: 'C01', name: 'Career Cell Coordinator', dept: 'Career Services (demo)', year: 0, kind: 'career', tag: 'Career coordinator' },
      { id: 'A01', name: 'Platform Admin', dept: 'InstiLite (demo)', year: 0, kind: 'admin', tag: 'Platform admin' },
    ],
    roles: [
      { id: 'r1', uid: 'M01', clubId: 'cfi_pd', active: true, tenure: '2025–26', by: 'A01' },
      { id: 'r2', uid: 'M01', clubId: 'cfi_ai', active: true, tenure: '2025–26', by: 'A01' },
      { id: 'r3', uid: 'M02', clubId: 'ecell', active: true, tenure: '2025–26', by: 'A01' },
    ],
    roleRequests: [
      { id: 'q1', uid: 'S05', clubId: 'sports', note: 'Football team manager for 2026 season', at: ago(20) },
      { id: 'q2', uid: 'S06', clubId: 'saarang', note: 'Volunteer coordinator', at: ago(7) },
    ],
    members: [
      { id: 'm1', clubId: 'cfi_pd', uid: 'M01', name: 'Ishaan Menon', label: 'Coordinator', tenure: '2025–26' },
      { id: 'm2', clubId: 'cfi_pd', uid: 'S03', name: 'Meera Nair', label: 'Design Member', tenure: '2025–26' },
      { id: 'm3', clubId: 'cfi_ai', uid: 'S02', name: 'Rohan Iyer', label: 'Core Member', tenure: '2024–26' },
      { id: 'm4', clubId: 'cfi_ai', uid: 'M01', name: 'Ishaan Menon', label: 'Co-coordinator', tenure: '2025–26' },
      { id: 'm5', clubId: 'ecell', uid: 'M02', name: 'Tara Joshi', label: 'Coordinator', tenure: '2025–26' },
      { id: 'm6', clubId: 'ecell', uid: 'S02', name: 'Rohan Iyer', label: 'Events Lead', tenure: '2025–26' },
      { id: 'm7', clubId: 'shaastra', uid: 'S04', name: 'Karthik Subramanian', label: 'Sponsorship Coordinator', tenure: '2024–25' },
      { id: 'm8', clubId: 'shaastra', uid: 'S06', name: 'Dev Patel', label: 'Volunteer', tenure: '2025–26' },
      { id: 'm9', clubId: 'saarang', uid: 'S05', name: 'Zoya Khan', label: 'Hospitality Manager', tenure: '2024–25' },
      { id: 'm10', clubId: 'saarang', uid: 'S03', name: 'Meera Nair', label: 'Content Team', tenure: '2025–26' },
      { id: 'm11', clubId: 'sports', uid: 'S06', name: 'Dev Patel', label: 'Team Member', tenure: '2025–26' },
      { id: 'm12', clubId: 'sports', uid: 'S05', name: 'Zoya Khan', label: 'Athletics Rep', tenure: '2023–24' },
    ],
    events: [
      { id: 'e1', clubId: 'cfi_ai', title: 'Intro to LLM Apps Workshop', cat: 'Workshop', desc: 'Build a small retrieval-based assistant in two hours. Bring a laptop; starter code is shared on arrival.', start: at(1, 15), end: at(1, 17), venue: 'CFI Lab, 2nd floor', link: '', resources: 'Starter repo: https://example.com/demo/llm-starter', contact: 'cfi-ai@demo.example', status: 'published', publishedAt: ago(3), rev: 1, updatedAt: ago(3) },
      { id: 'e2', clubId: 'cfi_pd', title: 'Figma for Hackathons', cat: 'Workshop', desc: 'Rapid prototyping in Figma: components, auto-layout and handoff in 90 minutes.', start: at(0, 18), end: at(0, 19, 30), venue: 'Design Studio', link: '', resources: '', contact: 'cfi-pd@demo.example', status: 'published', publishedAt: ago(20), rev: 1, updatedAt: ago(20) },
      { id: 'e3', clubId: 'ecell', title: 'Startup Pitch Night', cat: 'Competition', desc: 'Five student teams pitch to a panel of demo mentors. Open audience, Q&A at the end.', start: at(2, 17), end: at(2, 19), venue: 'Seminar Hall 2', link: '', resources: '', contact: 'ecell@demo.example', status: 'published', publishedAt: ago(47), rev: 2, updatedAt: ago(6) },
      { id: 'e4', clubId: 'ecell', title: "Founders' Fireside (online)", cat: 'Talk', desc: 'A conversation with a fictional founder on early-stage hiring. Join online.', start: at(9, 20), end: at(9, 21), venue: 'Online', link: 'https://example.com/demo/meet/fireside', resources: '', contact: 'ecell@demo.example', status: 'published', publishedAt: ago(49), rev: 1, updatedAt: ago(49) },
      { id: 'e5', clubId: 'shaastra', title: 'Volunteer Meet-up', cat: 'Meet-up', desc: 'Meet the operations team and pick your shifts for the fest.', start: at(3, 12, 30), end: at(3, 13, 30), venue: 'Student Activity Centre', link: '', resources: '', contact: 'shaastra@demo.example', status: 'published', publishedAt: ago(30), rev: 1, updatedAt: ago(30) },
      { id: 'e6', clubId: 'saarang', title: 'Logo Contest Briefing', cat: 'Competition', desc: 'Briefing for the poster and logo contest: theme, deliverables and judging.', start: at(22, 16), end: at(22, 17), venue: 'Online', link: 'https://example.com/demo/meet/logo-brief', resources: '', contact: 'saarang@demo.example', status: 'published', publishedAt: ago(5), rev: 1, updatedAt: ago(5) },
      { id: 'e7', clubId: 'sports', title: 'Inter-hostel Football Trials', cat: 'Sports', desc: 'Open trials for the hostel league squads. Boots and water required.', start: at(5, 6, 30), end: at(5, 8), venue: 'Main Ground', link: '', resources: '', contact: 'sports@demo.example', status: 'published', publishedAt: ago(60), rev: 1, updatedAt: ago(60) },
      { id: 'e8', clubId: 'cfi_pd', title: 'Design Critique Night', cat: 'Meet-up', desc: 'Bring a work in progress for friendly, structured critique.', start: at(6, 19), end: at(6, 20, 30), venue: 'Design Studio', link: '', resources: '', contact: 'cfi-pd@demo.example', status: 'published', publishedAt: ago(100), rev: 1, updatedAt: ago(100) },
      { id: 'e9', clubId: 'cfi_ai', title: 'Kaggle Study Jam (draft)', cat: 'Workshop', desc: 'Draft — not yet announced.', start: at(7, 16), end: at(7, 18), venue: 'CFI Lab', link: '', resources: '', contact: 'cfi-ai@demo.example', status: 'draft', publishedAt: null, rev: 0, updatedAt: ago(8) },
      { id: 'e10', clubId: 'ecell', title: 'Mentor Mixer (draft)', cat: 'Meet-up', desc: 'Draft — agenda to be finalised.', start: at(8, 17), end: at(8, 19), venue: 'TBD', link: '', resources: '', contact: 'ecell@demo.example', status: 'draft', publishedAt: null, rev: 0, updatedAt: ago(12) },
      { id: 'e11', clubId: 'saarang', title: 'Open-mic Auditions', cat: 'Talk', desc: 'Audition slots for the open-mic night.', start: at(1, 17), end: at(1, 19), venue: 'Open Air Theatre', link: '', resources: '', contact: 'saarang@demo.example', status: 'cancelled', cancelReason: 'Venue unavailable', publishedAt: ago(70), rev: 2, updatedAt: ago(4) },
      { id: 'e12', clubId: 'shaastra', title: 'Orientation Talk', cat: 'Talk', desc: 'Overview of fest teams and how to get involved.', start: at(-3, 17), end: at(-3, 18), venue: 'Auditorium', link: '', resources: '', contact: 'shaastra@demo.example', status: 'published', publishedAt: ago(200), rev: 1, updatedAt: ago(200) },
    ],
    pors: [
      { id: 'p1', clubId: 'cfi_pd', title: 'Design Lead', desc: 'Lead the club’s design sprints and mentor first-years on tools and process.', elig: 'Open to 2nd and 3rd year students. Portfolio link welcome.', opens: at(-3, 9), closes: at(2, 22), url: 'https://example.com/demo/apply/p1', contact: 'cfi-pd@demo.example', resources: 'Role brief: https://example.com/demo/brief/design-lead', status: 'published', publishedAt: ago(70), rev: 1 },
      { id: 'p2', clubId: 'ecell', title: 'Events Core Team Member', desc: 'Plan and run pitch nights, talks and workshops across the semester.', elig: 'Any year. Prior event-running experience helps but is not required.', opens: at(-2, 9), closes: at(4, 18), url: 'https://example.com/demo/apply/p2', contact: 'ecell@demo.example', resources: '', status: 'published', publishedAt: ago(50), rev: 1 },
      { id: 'p3', clubId: 'shaastra', title: 'Sponsorship Coordinator', desc: 'Own outreach and follow-ups with demo sponsors for the fest.', elig: 'Open to 3rd and 4th year students.', opens: at(-5, 9), closes: at(1, 20), url: 'https://example.com/demo/apply/p3', contact: 'shaastra@demo.example', resources: '', status: 'published', publishedAt: ago(120), rev: 2 },
      { id: 'p4', clubId: 'saarang', title: 'Content Head', desc: 'Lead the content team: copy, social posts and event write-ups.', elig: 'Any year.', opens: at(-1, 9), closes: at(6, 23), url: 'https://example.com/demo/apply/p4', contact: 'saarang@demo.example', resources: '', status: 'published', publishedAt: ago(22), rev: 1 },
      { id: 'p5', clubId: 'cfi_ai', title: 'Research Fellow (club role)', desc: 'Run a paper-reading series and guide two student projects.', elig: 'Interest in ML. Any year.', opens: at(-1, 9), closes: at(8, 18), url: 'https://example.com/demo/apply/p5', contact: 'cfi-ai@demo.example', resources: '', status: 'published', publishedAt: ago(40), rev: 1 },
      { id: 'p6', clubId: 'sports', title: 'Football Team Manager', desc: 'Coordinate fixtures, kit and practice schedules for the squad.', elig: 'Any year.', opens: at(3, 9), closes: at(10, 18), url: 'https://example.com/demo/apply/p6', contact: 'sports@demo.example', resources: '', status: 'published', publishedAt: ago(10), rev: 1 },
      { id: 'p7', clubId: 'saarang', title: 'Hospitality Volunteer', desc: 'Support guest arrival, accommodation and transport.', elig: 'Any year.', opens: at(-12, 9), closes: at(-1, 18), url: 'https://example.com/demo/apply/p7', contact: 'saarang@demo.example', resources: '', status: 'published', publishedAt: ago(300), rev: 1 },
      { id: 'p8', clubId: 'ecell', title: 'Newsletter Editor (draft)', desc: 'Draft — role description under review.', elig: '', opens: at(2, 9), closes: at(12, 18), url: 'https://example.com/demo/apply/p8', contact: 'ecell@demo.example', resources: '', status: 'draft', publishedAt: null, rev: 0 },
    ],
    savedEv: [{ uid: 'S01', id: 'e2', at: ago(10) }, { uid: 'S01', id: 'e11', at: ago(30) }, { uid: 'S02', id: 'e3', at: ago(12) }],
    savedPor: [{ uid: 'S01', id: 'p1', at: ago(9), status: 'interested' }, { uid: 'S01', id: 'p3', at: ago(9), status: 'interested' }, { uid: 'S02', id: 'p2', at: ago(9), status: 'interested' }],
    rsvps: [{ uid: 'S02', id: 'e1' }, { uid: 'S03', id: 'e1' }, { uid: 'S04', id: 'e1' }, { uid: 'S02', id: 'e3' }, { uid: 'S06', id: 'e3' }],
    clicks: [{ uid: 'S02', id: 'p2' }],
    personal: [
      { id: 'pe1', uid: 'S01', title: 'Study group', desc: 'Thermodynamics problem set', venue: 'Library', start: at(0, 18, 30), end: at(0, 19, 30) },
      { id: 'pe2', uid: 'S01', title: 'Gym', desc: '', venue: '', start: at(1, 7), end: at(1, 8) },
      { id: 'pe3', uid: 'S01', title: 'Call home', desc: '', venue: '', start: at(2, 21), end: at(2, 21, 30) },
      { id: 'pe4', uid: 'S02', title: 'Project meeting', desc: 'Capstone sync', venue: 'CSE Dept', start: at(2, 17, 30), end: at(2, 18, 30) },
    ],
    profiles: {
      S01: { bio: 'Mechanical undergrad curious about product design and robotics.', interests: ['design', 'robotics'], linkedin: '', contact: '', discoverable: false, showLinkedin: false, showContact: false },
      S02: { bio: 'CS final-year. Loves ML tooling and startup communities.', interests: ['AI', 'startups', 'web'], linkedin: 'https://example.com/in/demo-rohan', contact: '', discoverable: true, showLinkedin: true, showContact: false },
      S03: { bio: 'EE sophomore. Hidden profile.', interests: ['music', 'electronics'], linkedin: '', contact: '', discoverable: false, showLinkedin: false, showContact: false },
      S04: { bio: 'Chem final-year. Ran sponsorship for a fest team.', interests: ['sponsorship', 'marketing', 'fests'], linkedin: '', contact: 'karthik@demo.example', discoverable: true, showLinkedin: false, showContact: true },
      S05: { bio: 'Chem final-year. Hospitality and logistics at a cultural fest.', interests: ['culture', 'hospitality', 'design'], linkedin: 'https://example.com/in/demo-zoya', contact: '', discoverable: true, showLinkedin: true, showContact: false },
      S06: { bio: '', interests: ['football', 'civil'], linkedin: '', contact: '', discoverable: false, showLinkedin: false, showContact: false },
      M01: { bio: 'Runs CFI design and AI clubs. Happy to talk about design sprints.', interests: ['design', 'hardware', 'AI'], linkedin: '', contact: '', discoverable: true, showLinkedin: false, showContact: false },
      M02: { bio: '', interests: ['startups'], linkedin: '', contact: '', discoverable: false, showLinkedin: false, showContact: false },
      C01: { bio: '', interests: [], linkedin: '', contact: '', discoverable: false, showLinkedin: false, showContact: false },
      A01: { bio: '', interests: [], linkedin: '', contact: '', discoverable: false, showLinkedin: false, showContact: false },
    },
    portfolio: [
      { id: 'pf1', uid: 'S02', type: 'por', clubName: 'CFI AI Club', role: 'Core Member', tenure: '2024–26', desc: 'Built the intro ML workshop series.', url: '' },
      { id: 'pf2', uid: 'S02', type: 'por', clubName: 'E-Cell', role: 'Events Lead', tenure: '2025–26', desc: 'Ran monthly founder talks.', url: '' },
      { id: 'pf3', uid: 'S04', type: 'por', clubName: 'Shaastra', role: 'Sponsorship Coordinator', tenure: '2024–25', desc: 'Led demo sponsor outreach.', url: '' },
      { id: 'pf4', uid: 'S05', type: 'por', clubName: 'Saarang', role: 'Hospitality Manager', tenure: '2024–25', desc: 'Guest arrival and stay logistics.', url: '' },
      { id: 'pf5', uid: 'M01', type: 'por', clubName: 'CFI Product Design Club', role: 'Coordinator', tenure: '2025–26', desc: 'Design sprints and critiques.', url: '' },
      { id: 'pf6', uid: 'S01', type: 'attended', eid: 'e12', clubName: 'Shaastra', role: 'Attended: Orientation Talk', tenure: '', desc: '', url: '' },
    ],
    prefs: {}, // per-uid
    read: {}, // per-uid keys
    fired: {}, // reminder dedupe keys
    notifs: [],
    changes: [
      { id: 'ch1', kind: 'ev', ref: 'e3', type: 'venue', at: ago(6), text: 'Venue changed to Seminar Hall 2 (was Room 301).' },
      { id: 'ch2', kind: 'ev', ref: 'e11', type: 'cancel', at: ago(4), text: 'Cancelled — venue unavailable.' },
      { id: 'ch3', kind: 'por', ref: 'p3', type: 'deadline', at: ago(10), text: 'Closing date extended by one day.' },
    ],
    reports: [{ id: 'rp1', kind: 'ev', ref: 'e8', by: 'S03', reason: 'Description feels misleading about who can attend.', at: ago(15), open: true }],
    audit: [],
    conn: {}, imp: {},
    portal: {
      outage: false, partial: false, rev: 1, quarantine: 0,
      items: [
        { id: 'c1', company: 'Acme Quant Labs (fictional)', role: 'Quant Analyst Intern', type: 'test', season: 'internship', start: at(1, 16), end: at(1, 17, 30), mode: 'Online', venue: 'Portal proctored link', link: 'https://example.com/demo/portal/c1', rev: 1, status: 'active', scope: [{ uid: 'S01', elig: 'confirmed' }] },
        { id: 'c2', company: 'Globex Mobility (fictional)', role: 'Software Engineer', type: 'ppt', season: 'placement', start: at(3, 18), end: at(3, 19), mode: 'Offline', venue: 'Student Activity Centre Auditorium', link: 'https://example.com/demo/portal/c2', rev: 1, status: 'active', scope: [{ uid: 'S01', elig: 'confirmed' }, { uid: 'S02', elig: 'confirmed' }] },
        { id: 'c3', company: 'Initech Systems (fictional)', role: 'Systems Intern', type: 'deadline', season: 'internship', dueAt: at(2, 17), label: 'Registration deadline', mode: 'Online', venue: 'Portal', link: 'https://example.com/demo/portal/c3', rev: 1, status: 'active', scope: [{ uid: 'S01', elig: 'confirmed' }, { uid: 'S02', elig: 'confirmed' }] },
        { id: 'c4', company: 'Soylent Software (fictional)', role: 'Product Analyst', type: 'deadline', season: 'placement', date: at(4), dateOnly: true, label: 'Assessment submission', mode: 'Online', venue: 'Portal', link: 'https://example.com/demo/portal/c4', rev: 1, status: 'active', scope: [{ uid: 'S01', elig: 'confirmed' }] },
        { id: 'c5', company: 'Vandelay Industries (fictional)', role: 'Operations Intern', type: 'test', season: 'internship', start: at(5, 10), end: at(5, 12), mode: 'Offline', venue: 'CSE Lab 3', link: 'https://example.com/demo/portal/c5', rev: 1, status: 'active', scope: [{ uid: 'S02', elig: 'confirmed' }] },
        { id: 'c6', company: 'Pied Piper Cloud (fictional)', role: 'Cloud Engineer', type: 'ppt', season: 'placement', start: at(6, 17), end: at(6, 18), mode: 'Online', venue: 'Portal link', link: 'https://example.com/demo/portal/c6', rev: 1, status: 'active', scope: [{ uid: 'S01', elig: 'review' }] },
      ],
    },
  };
  const n = (uid, type, title, body, link, hoursAgo, key) => DB.notifs.push({ id: 'n' + (DB.notifs.length + 1), uid, type, title, body, link, at: ago(hoursAgo), readAt: null, dedupe: key });
  n('S01', 'system', 'Welcome to the InstiLite demo', 'All people, clubs and events here are fictional demonstration data.', null, 2, 'welcome');
  n('S01', 'update', 'Cancelled: Open-mic Auditions', 'Venue unavailable. Your saved entry is kept in history.', { n: 'event', p: { id: 'e11' } }, 4, 'chg:e11:2');
  n('S01', 'update', 'Deadline extended: Sponsorship Coordinator', 'Closing date moved by one day.', { n: 'por', p: { id: 'p3' } }, 10, 'chg:p3:2');
  n('S02', 'update', 'Venue changed: Startup Pitch Night', 'Now in Seminar Hall 2 (was Room 301).', { n: 'event', p: { id: 'e3' } }, 6, 'chg:e3:2');
  DB.audit.push({ id: 'a1', actor: 'system', action: 'Workspace seeded', target: 'demo data v1', at: Date.now() });
  return DB;
}

let DB = makeSeed();
const S = { uid: null, loginEmail: '' };
const CATS = {
  campus: { label: 'Campus', sym: '●', cls: 'k-campus' },
  personal: { label: 'Personal', sym: '◆', cls: 'k-personal' },
  por: { label: 'POR', sym: '▲', cls: 'k-por' },
  placement: { label: 'Placement', sym: '■', cls: 'k-placement' },
  internship: { label: 'Internship', sym: '★', cls: 'k-internship' },
};
const CTYPE = { test: 'Test', ppt: 'Pre-placement talk', deadline: 'Deadline' };

/* ---------- Lookups ---------- */
const user = id => DB.users.find(u => u.id === id);
const me = () => user(S.uid);
const club = id => DB.clubs.find(c => c.id === id);
const ev = id => DB.events.find(e => e.id === id);
const por = id => DB.pors.find(p => p.id === id);
const pers = id => DB.personal.find(p => p.id === id);
const sphereOf = cid => DB.spheres.find(s => s.id === club(cid).sphere);
const roleClubs = u => DB.roles.filter(r => r.uid === u && r.active).map(r => r.clubId);
const canManage = (u, cid) => roleClubs(u).includes(cid);
const roleLabel = u => { const x = user(u); if (x.kind === 'career') return 'Career coordinator'; if (x.kind === 'admin') return 'Admin'; const rc = roleClubs(u); return rc.length ? 'Club manager' : 'Student'; };
const evStatus = e => e.status === 'cancelled' ? 'cancelled' : e.status === 'draft' ? 'draft' : e.end < now() ? 'past' : 'upcoming';
const porStatus = p => p.status === 'draft' ? 'draft' : p.status === 'cancelled' ? 'cancelled' : now() < p.opens ? 'upcoming' : now() > p.closes ? 'closed' : 'open';
const pubEv = () => DB.events.filter(e => e.status !== 'draft' && !e.hidden);
const pubPor = () => DB.pors.filter(p => p.status !== 'draft' && !p.hidden);
const isSavedEv = (u, id) => DB.savedEv.some(s => s.uid === u && s.id === id);
const savedPor = (u, id) => DB.savedPor.find(s => s.uid === u && s.id === id);
const isGoing = (u, id) => DB.rsvps.some(r => r.uid === u && r.id === id);
const goingCount = id => DB.rsvps.filter(r => r.id === id).length;
const clickCount = id => new Set(DB.clicks.filter(c => c.id === id).map(c => c.uid)).size;
const prefs = u => DB.prefs[u] || (DB.prefs[u] = { ev: [24, 1], dl: [24, 2] });
const isRead = (u, k) => !!(DB.read[u] || {})[k];
const markRead = (u, k) => { (DB.read[u] = DB.read[u] || {})[k] = true; };
const logA = (action, target) => DB.audit.unshift({ id: uid('a'), actor: S.uid || 'system', action, target, at: now() });
const unreadCount = u => DB.notifs.filter(n => n.uid === u && !n.readAt).length;

function notify(u, o) {
  if (o.dedupe && DB.notifs.some(n => n.uid === u && n.dedupe === o.dedupe)) return null;
  const n = { id: uid('n'), uid: u, type: o.type || 'update', title: o.title, body: o.body || '', link: o.link || null, at: now(), readAt: null, dedupe: o.dedupe };
  DB.notifs.unshift(n); return n;
}
const affectedEv = id => [...new Set([...DB.savedEv.filter(s => s.id === id).map(s => s.uid), ...DB.rsvps.filter(r => r.id === id).map(r => r.uid)])];
const affectedPor = id => DB.savedPor.filter(s => s.id === id && s.status !== 'withdrawn').map(s => s.uid);

/* ---------- Calendar items ---------- */
function careerOf(u) { // confirmed, visible-on-calendar imported items
  const m = DB.imp[u] || {}; return Object.values(m).map(r => ({ ...r.snap, _hidden: r.hidden, _elig: r.elig, _stale: r.stale, _at: r.at }));
}
function calItems(u, mode) {
  const out = [];
  pubEv().forEach(e => {
    const saved = isSavedEv(u, e.id) || isGoing(u, e.id);
    if (e.status === 'draft') return;
    if (mode === 'mine' && !saved) return;
    out.push({ key: 'e' + e.id, cat: 'campus', title: e.title, sub: club(e.clubId).name, start: e.start, end: e.end, status: e.status === 'cancelled' ? 'cancelled' : 'ok', saved, ref: { type: 'event', id: e.id } });
  });
  DB.personal.filter(p => p.uid === u).forEach(p => out.push({ key: p.id, cat: 'personal', title: p.title, sub: p.venue, start: p.start, end: p.end, status: 'ok', saved: true, ref: { type: 'personal', id: p.id } }));
  pubPor().forEach(p => {
    const sp = savedPor(u, p.id); const st = porStatus(p);
    if (mode === 'mine' ? !sp : (st !== 'open' && !sp)) return;
    out.push({ key: 'p' + p.id, cat: 'por', title: p.title + ' — deadline', sub: club(p.clubId).name, start: p.closes, end: p.closes, point: true, status: p.status === 'cancelled' ? 'cancelled' : 'ok', saved: !!sp, ref: { type: 'por', id: p.id } });
  });
  careerOf(u).forEach(c => {
    if (c._hidden || c._elig === 'review') return;
    const base = { key: 'c' + c.id, cat: c.season, title: c.company.replace(' (fictional)', '') + ' · ' + (c.type === 'deadline' ? c.label : CTYPE[c.type]), sub: c.role, status: c.status === 'cancelled' ? 'cancelled' : 'ok', saved: true, synced: true, ref: { type: 'career', id: c.id } };
    if (c.type === 'deadline') { const t = c.dateOnly ? c.date : c.dueAt; out.push({ ...base, start: t, end: t, point: true, dateOnly: !!c.dateOnly }); }
    else out.push({ ...base, start: c.start, end: c.end });
  });
  return out;
}
function conflictsOf(u) {
  const t = calItems(u, 'mine').filter(i => !i.point && i.status !== 'cancelled');
  const res = [];
  for (let i = 0; i < t.length; i++) for (let j = i + 1; j < t.length; j++) if (t[i].start < t[j].end && t[j].start < t[i].end) res.push([t[i], t[j]]);
  return res;
}
const conflictsWith = (u, key) => conflictsOf(u).filter(p => p[0].key === key || p[1].key === key).map(p => p[0].key === key ? p[1] : p[0]);

/* ---------- Guarded API (all writes go through here) ---------- */
const deny = msg => ({ ok: false, denied: true, err: msg });
const bad = msg => ({ ok: false, err: msg });
const api = {
  validEvent(d) {
    if (!d.title.trim()) return 'Title is required.';
    if (!d.desc.trim()) return 'Description is required.';
    if (isNaN(d.start) || isNaN(d.end)) return 'Date, start and end time are required.';
    if (d.end <= d.start) return 'End time must be after the start time.';
    if (!d.venue.trim() && !d.link.trim()) return 'Add a venue or an online link.';
    if (d.link.trim() && !isUrl(d.link.trim())) return 'Online link must start with https://';
    return '';
  },
  saveEventDraft(d, u = S.uid) { // create or update draft/published; d.id optional
    if (!canManage(u, d.clubId)) return deny('403 — you do not manage this club.');
    const err = api.validEvent(d); if (err) return bad(err);
    const e = d.id && ev(d.id);
    if (e) { Object.assign(e, { title: d.title, desc: d.desc, cat: d.cat, start: d.start, end: d.end, venue: d.venue, link: d.link, resources: d.resources, contact: d.contact, updatedAt: now() }); logA('Edited draft', e.title); return { ok: true, e }; }
    const n = { id: uid('e'), clubId: d.clubId, title: d.title, desc: d.desc, cat: d.cat, start: d.start, end: d.end, venue: d.venue, link: d.link, resources: d.resources, contact: d.contact, status: 'draft', publishedAt: null, rev: 0, updatedAt: now() };
    DB.events.push(n); logA('Created draft event', n.title); return { ok: true, e: n };
  },
  publishEvent(id, u = S.uid) {
    const e = ev(id); if (!e) return bad('Event not found.');
    if (!canManage(u, e.clubId)) return deny('403 — you do not manage this club.');
    e.status = 'published'; e.publishedAt = now(); e.rev = 1; e.updatedAt = now(); logA('Published event', e.title); return { ok: true, e };
  },
  updateEvent(id, d, expectedRev, u = S.uid) {
    const e = ev(id); if (!e) return bad('Event not found.');
    if (!canManage(u, e.clubId)) return deny('403 — you do not manage this club.');
    if (e.rev !== expectedRev) return { ok: false, stale: true, err: 'This event was changed by someone else while you were editing.' };
    const err = api.validEvent(d); if (err) return bad(err);
    const timeChanged = e.start !== d.start || e.end !== d.end, venueChanged = e.venue !== d.venue || e.link !== d.link;
    Object.assign(e, { title: d.title, desc: d.desc, cat: d.cat, start: d.start, end: d.end, venue: d.venue, link: d.link, resources: d.resources, contact: d.contact, updatedAt: now() });
    if (timeChanged || venueChanged) {
      e.rev++;
      const text = timeChanged ? 'Rescheduled to ' + fDT(e.start) + '.' : 'Venue changed to ' + (e.venue || 'online') + '.';
      DB.changes.unshift({ id: uid('ch'), kind: 'ev', ref: e.id, type: timeChanged ? 'reschedule' : 'venue', at: now(), text });
      affectedEv(e.id).forEach(x => notify(x, { type: 'update', title: (timeChanged ? 'Rescheduled: ' : 'Venue changed: ') + e.title, body: text, link: { n: 'event', p: { id: e.id } }, dedupe: 'chg:' + e.id + ':' + e.rev }));
    }
    logA('Edited event', e.title); return { ok: true, e };
  },
  cancelEvent(id, reason, u = S.uid) {
    const e = ev(id); if (!e) return bad('Event not found.');
    if (!canManage(u, e.clubId)) return deny('403 — you do not manage this club.');
    if (!reason.trim()) return bad('A reason is required.');
    e.status = 'cancelled'; e.cancelReason = reason.trim(); e.rev++; e.updatedAt = now();
    DB.changes.unshift({ id: uid('ch'), kind: 'ev', ref: e.id, type: 'cancel', at: now(), text: 'Cancelled — ' + reason.trim() });
    affectedEv(e.id).forEach(x => notify(x, { type: 'update', title: 'Cancelled: ' + e.title, body: reason.trim(), link: { n: 'event', p: { id: e.id } }, dedupe: 'chg:' + e.id + ':' + e.rev }));
    logA('Cancelled event', e.title); return { ok: true };
  },
  validPor(d) {
    if (!d.title.trim()) return 'Role title is required.';
    if (!d.desc.trim()) return 'Description is required.';
    if (isNaN(d.opens) || isNaN(d.closes)) return 'Opening and closing date/time are required.';
    if (d.closes <= d.opens) return 'Closing must be after opening.';
    if (!isUrl(d.url.trim())) return 'Application URL must start with https://';
    return '';
  },
  savePor(d, publish, u = S.uid) {
    if (!canManage(u, d.clubId)) return deny('403 — you do not manage this club.');
    const err = api.validPor(d); if (err) return bad(err);
    let p = d.id && por(d.id);
    if (!p) { p = { id: uid('p'), clubId: d.clubId, status: 'draft', publishedAt: null, rev: 0 }; DB.pors.push(p); }
    const closeChanged = p.status === 'published' && p.closes !== d.closes, openChanged = p.status === 'published' && p.opens !== d.opens;
    Object.assign(p, { title: d.title, desc: d.desc, elig: d.elig, opens: d.opens, closes: d.closes, url: d.url.trim(), contact: d.contact, resources: d.resources });
    if (publish && p.status === 'draft') { p.status = 'published'; p.publishedAt = now(); p.rev = 1; logA('Published POR', p.title); }
    else if (closeChanged || openChanged) {
      p.rev++; const text = closeChanged ? 'Closing date changed to ' + fDT(p.closes) + '.' : 'Opening date changed to ' + fDT(p.opens) + '.';
      DB.changes.unshift({ id: uid('ch'), kind: 'por', ref: p.id, type: 'deadline', at: now(), text });
      affectedPor(p.id).forEach(x => notify(x, { type: 'update', title: 'Updated: ' + p.title, body: text, link: { n: 'por', p: { id: p.id } }, dedupe: 'chg:' + p.id + ':' + p.rev }));
      logA('Edited POR dates', p.title);
    } else logA('Saved POR', p.title);
    return { ok: true, p };
  },
  closePor(id, u = S.uid) {
    const p = por(id); if (!p) return bad('Not found.');
    if (!canManage(u, p.clubId)) return deny('403 — you do not manage this club.');
    p.closes = now() - 1000; p.rev++;
    DB.changes.unshift({ id: uid('ch'), kind: 'por', ref: p.id, type: 'deadline', at: now(), text: 'Applications closed early.' });
    affectedPor(p.id).forEach(x => notify(x, { type: 'update', title: 'Closed: ' + p.title, body: 'Applications closed early.', link: { n: 'por', p: { id: p.id } }, dedupe: 'chg:' + p.id + ':' + p.rev }));
    logA('Closed POR early', p.title); return { ok: true };
  },
  cancelPor(id, u = S.uid) {
    const p = por(id); if (!p) return bad('Not found.');
    if (!canManage(u, p.clubId)) return deny('403 — you do not manage this club.');
    p.status = 'cancelled'; p.rev++;
    DB.changes.unshift({ id: uid('ch'), kind: 'por', ref: p.id, type: 'cancel', at: now(), text: 'Listing cancelled.' });
    affectedPor(p.id).forEach(x => notify(x, { type: 'update', title: 'Cancelled: ' + p.title, body: 'This listing was cancelled by the club.', link: { n: 'por', p: { id: p.id } }, dedupe: 'chg:' + p.id + ':' + p.rev }));
    logA('Cancelled POR', p.title); return { ok: true };
  },
  editClub(cid, d, u = S.uid) {
    if (!canManage(u, cid)) return deny('403 — you do not manage this club.');
    if (!d.desc.trim()) return bad('Description is required.');
    if (d.website && !isUrl(d.website)) return bad('Website must start with https://');
    Object.assign(club(cid), { desc: d.desc, website: d.website, contact: d.contact }); logA('Edited club profile', club(cid).name); return { ok: true };
  },
  addMember(cid, name, label, u = S.uid) {
    if (!canManage(u, cid)) return deny('403 — you do not manage this club.');
    if (!name.trim() || !label.trim()) return bad('Name and display role are required.');
    DB.members.push({ id: uid('m'), clubId: cid, uid: null, name: name.trim(), label: label.trim(), tenure: '2025–26' }); logA('Added member', name.trim() + ' to ' + club(cid).name); return { ok: true };
  },
  removeMember(id, u = S.uid) {
    const m = DB.members.find(x => x.id === id); if (!m) return bad('Not found.');
    if (!canManage(u, m.clubId)) return deny('403 — you do not manage this club.');
    DB.members = DB.members.filter(x => x.id !== id); logA('Removed member', m.name); return { ok: true };
  },
  toggleSaveEv(id, u = S.uid) {
    const i = DB.savedEv.findIndex(s => s.uid === u && s.id === id);
    if (i >= 0) { DB.savedEv.splice(i, 1); return { ok: true, saved: false }; }
    DB.savedEv.push({ uid: u, id, at: now() }); return { ok: true, saved: true };
  },
  toggleRsvp(id, u = S.uid) {
    const i = DB.rsvps.findIndex(s => s.uid === u && s.id === id);
    if (i >= 0) { DB.rsvps.splice(i, 1); return { ok: true, going: false }; }
    DB.rsvps.push({ uid: u, id }); return { ok: true, going: true };
  },
  toggleSavePor(id, u = S.uid) {
    const i = DB.savedPor.findIndex(s => s.uid === u && s.id === id);
    if (i >= 0) { DB.savedPor.splice(i, 1); return { ok: true, saved: false }; }
    DB.savedPor.push({ uid: u, id, at: now(), status: 'interested' }); return { ok: true, saved: true };
  },
  porClick(id, u = S.uid) { if (!DB.clicks.some(c => c.uid === u && c.id === id)) DB.clicks.push({ uid: u, id }); return { ok: true }; },
  hide(kind, id, reason, u = S.uid) {
    if (user(u).kind !== 'admin') return deny('403 — only an admin can moderate listings.');
    if (!reason.trim()) return bad('A reason is required.');
    const x = kind === 'ev' ? ev(id) : por(id); x.hidden = true; x.hiddenReason = reason.trim();
    DB.reports.filter(r => r.ref === id).forEach(r => r.open = false);
    const mgrs = DB.roles.filter(r => r.clubId === x.clubId && r.active).map(r => r.uid);
    mgrs.forEach(m => notify(m, { type: 'update', title: 'Listing hidden by admin', body: x.title + ' — ' + reason.trim(), dedupe: 'hide:' + id + ':' + now() }));
    logA('Hid listing', x.title + ' — ' + reason.trim()); return { ok: true };
  },
  restore(kind, id, u = S.uid) {
    if (user(u).kind !== 'admin') return deny('403 — only an admin can moderate listings.');
    const x = kind === 'ev' ? ev(id) : por(id); x.hidden = false; x.hiddenReason = ''; logA('Restored listing', x.title); return { ok: true };
  },
  grant(reqId, u = S.uid) {
    if (user(u).kind !== 'admin') return deny('403 — only an admin can grant roles.');
    const r = DB.roleRequests.find(x => x.id === reqId); if (!r) return bad('Not found.');
    DB.roles.push({ id: uid('r'), uid: r.uid, clubId: r.clubId, active: true, tenure: '2025–26', by: u });
    DB.roleRequests = DB.roleRequests.filter(x => x.id !== reqId);
    notify(r.uid, { type: 'system', title: 'Manager access granted', body: 'You can now publish for ' + club(r.clubId).name + '.', dedupe: 'grant:' + reqId });
    logA('Granted manager role', user(r.uid).name + ' → ' + club(r.clubId).name); return { ok: true };
  },
  rejectReq(reqId, u = S.uid) {
    if (user(u).kind !== 'admin') return deny('403 — only an admin can review requests.');
    const r = DB.roleRequests.find(x => x.id === reqId); DB.roleRequests = DB.roleRequests.filter(x => x.id !== reqId);
    logA('Rejected role request', r ? user(r.uid).name : reqId); return { ok: true };
  },
  revoke(roleId, reason, u = S.uid) {
    if (user(u).kind !== 'admin') return deny('403 — only an admin can revoke roles.');
    if (!reason.trim()) return bad('A reason is required.');
    const r = DB.roles.find(x => x.id === roleId); r.active = false;
    notify(r.uid, { type: 'system', title: 'Manager access revoked', body: club(r.clubId).name + ' — ' + reason.trim(), dedupe: 'revoke:' + roleId });
    logA('Revoked manager role', user(r.uid).name + ' ← ' + club(r.clubId).name + ' (' + reason.trim() + ')'); return { ok: true };
  },
};

/* ---------- Reminders (derived, deduped, no past triggers) ---------- */
function checkReminders() {
  const t = now(); let fired = 0;
  const fire = (u, key, title, body, link, due, start, armed) => {
    if (due < armed || t < due || t >= start) return;
    if (DB.fired[key]) return; DB.fired[key] = true;
    if (notify(u, { type: 'reminder', title, body, link, dedupe: key })) fired++;
  };
  DB.users.forEach(us => {
    const u = us.id, pf = prefs(u);
    DB.savedEv.filter(s => s.uid === u).forEach(s => { const e = ev(s.id); if (!e || e.status !== 'published' || e.hidden) return;
      pf.ev.forEach(h => fire(u, [u, 'ev', e.id, e.rev, h].join('|'), 'Reminder: ' + e.title, 'Starts ' + fDT(e.start) + ' · ' + (e.venue || 'online') + ' (' + h + 'h before)', { n: 'event', p: { id: e.id } }, e.start - h * H, e.start, s.at)); });
    DB.rsvps.filter(s => s.uid === u && !isSavedEv(u, s.id)).forEach(s => { const e = ev(s.id); if (!e || e.status !== 'published' || e.hidden) return;
      pf.ev.forEach(h => fire(u, [u, 'ev', e.id, e.rev, h].join('|'), 'Reminder: ' + e.title, 'Starts ' + fDT(e.start) + ' (' + h + 'h before)', { n: 'event', p: { id: e.id } }, e.start - h * H, e.start, now() - 365 * D)); });
    DB.savedPor.filter(s => s.uid === u && s.status !== 'withdrawn').forEach(s => { const p = por(s.id); if (!p || p.status !== 'published' || p.hidden) return;
      pf.dl.forEach(h => fire(u, [u, 'por', p.id, p.rev, h].join('|'), 'Deadline soon: ' + p.title, 'Closes ' + fDT(p.closes) + ' (' + h + 'h left). Apply on the club’s own form.', { n: 'por', p: { id: p.id } }, p.closes - h * H, p.closes, s.at)); });
    DB.personal.filter(p => p.uid === u && p.remind > 0).forEach(p => fire(u, [u, 'pe', p.id, p.start, p.remind].join('|'), 'Reminder: ' + p.title, 'Starts ' + fDT(p.start) + ' (' + p.remind + 'h before) · personal', { n: 'personalForm', p: { id: p.id } }, p.start - p.remind * H, p.start, p.created || 0));
    careerOf(u).forEach(c => { if (c._hidden || c._elig === 'review' || c.status === 'cancelled') return;
      const start = c.type === 'deadline' ? (c.dateOnly ? null : c.dueAt) : c.start; if (!start) return;
      (c.type === 'deadline' ? pf.dl : pf.ev).forEach(h => fire(u, [u, 'c', c.id, c.rev, h].join('|'), 'Reminder: ' + c.company.replace(' (fictional)', '') + ' ' + (c.type === 'deadline' ? c.label : CTYPE[c.type]), fDT(start) + ' (' + h + 'h before) · synced from simulated portal', { n: 'careerItem', p: { id: c.id } }, start - h * H, start, c._at)); });
  });
  return fired;
}

/* ---------- Career sync (simulated portal) ---------- */
function validPortalItem(c) {
  if (!c.company || !c.type || !c.season) return false;
  if (c.type === 'deadline') return !!(c.dueAt || (c.dateOnly && c.date));
  return !isNaN(c.start) && !isNaN(c.end) && c.end > c.start;
}
function syncCareer(u, silent) {
  const conn = DB.conn[u]; if (!conn || !conn.connected) return { ok: false, err: 'Not connected.' };
  const res = { added: 0, updated: 0, cancelled: 0, quarantined: 0, dup: 0 };
  if (DB.portal.outage) { conn.stale = true; conn.error = 'Portal unreachable (simulated outage). Showing last known records.'; conn.lastResult = { err: conn.error, at: now() }; return { ok: false, err: conn.error }; }
  conn.error = ''; conn.stale = false;
  const map = (DB.imp[u] = DB.imp[u] || {});
  let items = DB.portal.items;
  if (DB.portal.partial) items = items.slice(0, 2);
  items.forEach(c => {
    const sc = c.scope.find(s => s.uid === u); if (!sc) return;
    if (!validPortalItem(c)) { res.quarantined++; return; }
    const cur = map[c.id];
    if (!cur) { map[c.id] = { snap: { ...c }, rev: c.rev, hidden: false, elig: sc.elig, at: now() }; res.added++; return; }
    if (cur.rev === c.rev && cur.elig === sc.elig) { res.dup++; return; }
    const before = cur.snap; cur.snap = { ...c }; cur.rev = c.rev; cur.elig = sc.elig; cur.stale = false;
    if (c.status === 'cancelled' && before.status !== 'cancelled') {
      res.cancelled++; notify(u, { type: 'career', title: 'Cancelled: ' + c.company.replace(' (fictional)', ''), body: (c.type === 'deadline' ? c.label : CTYPE[c.type]) + ' was cancelled in the portal.', link: { n: 'careerItem', p: { id: c.id } }, dedupe: 'career:' + c.id + ':' + c.rev });
    } else {
      res.updated++; notify(u, { type: 'career', title: 'Updated: ' + c.company.replace(' (fictional)', ''), body: (c.type === 'deadline' ? c.label : CTYPE[c.type]) + ' changed — now ' + fDT(c.start || c.dueAt || c.date) + (c.venue ? ' · ' + c.venue : '') + '.', link: { n: 'careerItem', p: { id: c.id } }, dedupe: 'career:' + c.id + ':' + c.rev });
    }
  });
  if (DB.portal.partial) Object.values(map).forEach(r => { if (!items.some(i => i.id === r.snap.id)) r.stale = true; });
  conn.lastSync = now(); conn.lastResult = { ...res, at: now() };
  if (res.added && !silent) notify(u, { type: 'career', title: 'Career schedule synced', body: res.added + ' item(s) imported from the simulated portal.', dedupe: 'career:import:' + conn.lastSync });
  return { ok: true, res };
}
function autoSyncTick() {
  DB.users.forEach(us => { const c = DB.conn[us.id]; if (c && c.connected && c.auto && now() - (c.lastSync || 0) > 20000) syncCareer(us.id, true); });
}
