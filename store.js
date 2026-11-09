/* DATUM Card - data layer on Supabase (Auth + Postgres with Row Level Security). ES module. */
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import * as CFG from './supabase-config.js';
// tolerant import: a missing line in supabase-config.js must never stop the whole app from starting
const supabaseConfig = CFG.supabaseConfig || {};
const ownerEmail = CFG.ownerEmail || '';

const configured = !/YOUR_/.test(supabaseConfig.url || 'YOUR_') && !/YOUR_/.test(supabaseConfig.anonKey || 'YOUR_');
let sb = null, initError = '';
if (configured) {
  try { sb = createClient(String(supabaseConfig.url).trim(), String(supabaseConfig.anonKey).trim()); }
  catch (e) { initError = (e && e.message) || String(e); }
}
let currentUser = null;

const THEMES = {
  graphite: { label: 'Graphite', bg: '#0b0b0d', top: '#26262b', o1: '#8a8a94', o2: '#4d4d57', o3: '#6f6f7a' },
  midnight: { label: 'Midnight', bg: '#080b14', top: '#16213a', o1: '#4f6fb8', o2: '#2b3f73', o3: '#3a5a9c' },
  forest:   { label: 'Forest',   bg: '#080d0a', top: '#16261c', o1: '#4f9a6a', o2: '#2c5a3d', o3: '#3f7a54' },
  wine:     { label: 'Wine',     bg: '#0d0809', top: '#2a1519', o1: '#b04a5c', o2: '#6b2634', o3: '#8a3445' },
  violet:   { label: 'Violet',   bg: '#0a0810', top: '#221a38', o1: '#8a66d6', o2: '#4b3688', o3: '#6b4fb0' }
};
const FONTS = ['Outfit', 'Inter', 'Poppins', 'Space Grotesk', 'Playfair Display'];

function blankCard(ownerUid) {
  return {
    ownerUid: ownerUid, name: 'Your Name', role: 'Your title | Your role', bio: 'Write a short intro about yourself here.',
    location: '', chips: [], phone: '', showPhone: false, email: '', avatarId: '', galleryIds: [],
    experience: [], education: [], skills: [], links: [],
    design: { theme: 'graphite', accent: '#ffffff', font: 'Outfit', blur: 22, bigword: true, bigwordText: 'HELLO' }
  };
}
function seedCard(ownerUid) {
  var c = blankCard(ownerUid);
  return Object.assign(c, {
    name: 'Argie D. Bendanillo', role: 'Student | Leader | Entrepreneur',
    bio: 'Student leader and young entrepreneur from Dumaguete City, Negros Oriental. I also build front-end websites and design modern, glassmorphism-style interfaces in my spare time.',
    location: 'Dumaguete City, PH', chips: ['Dumaguete City, PH', 'Front-End Hobbyist', 'UI Designer'],
    phone: '09971979508', email: 'argiebendanillo987@gmail.com',
    experience: [
      { title: 'Doughnut Business Owner', desc: 'Self-employed, running my own doughnut selling business.', when: '2025' },
      { title: 'CSA President', desc: 'Catalinan Student Assistant (CSA) President at COSCA, leading and guiding student assistants.', when: 'Feb 2022' },
      { title: 'LiDAR Annotator', desc: 'Freelance LiDAR annotation work.', when: '2020' }
    ],
    education: [
      { title: 'Colegio de Santa Catalina de Alejandria (COSCA)', desc: 'Tertiary - College of Criminal Justice Education', when: 'July 2022 - Present' },
      { title: 'Junob National High School', desc: 'Secondary', when: '' },
      { title: 'Babajuba Elementary School', desc: 'Elementary', when: '' }
    ],
    skills: ['Leadership & Teamwork', 'Communication', 'Time Management', 'Business Management', 'Problem Solving', 'MS Office', 'Adaptability', 'HTML / CSS / JavaScript', 'UI Design (Canva)'],
    links: [
      { type: 'facebook', label: 'Facebook', sub: 'Argie D. Bendanillo', url: 'https://www.facebook.com/share/17JYkZGj7b/' },
      { type: 'instagram', label: 'Instagram', sub: 'its.gie_23', url: 'https://www.instagram.com/its.gie_23' },
      { type: 'tiktok', label: 'Tiktok', sub: '@bendzo987', url: 'https://www.tiktok.com/@bendzo987' },
      { type: 'portfolio', label: 'Portfolio', sub: 'My web projects', url: 'https://argiebendanillo987-netizen.github.io/LOGICLOOMSEDIT//' }
    ],
    design: { theme: 'graphite', accent: '#ffffff', font: 'Outfit', blur: 22, bigword: true, bigwordText: 'DATUM' }
  });
}

function cleanId(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 24); }
function friendly(e) {
  var m = String((e && e.message) || ''), c = (e && e.code) || '';
  if (c === '23505') return 'That User ID is already taken.';
  if (c === '42501' || /row-level security/i.test(m)) return 'Not allowed.';
  if (/invalid login credentials/i.test(m)) return 'Wrong email or password.';
  if (/already registered/i.test(m)) return 'That email already has an account. Try logging in.';
  if (/password should be at least/i.test(m)) return 'Password must be at least 6 characters.';
  if (/invalid email|unable to validate email/i.test(m)) return 'That email address is not valid.';
  if (/email not confirmed/i.test(m)) return 'Please confirm your email first (check your inbox), then log in.';
  if (/rate limit|too many/i.test(m)) return 'Too many attempts. Please wait a moment and try again.';
  if (/failed to fetch|network/i.test(m)) return 'No connection. Check your internet and try again.';
  return m || 'Something went wrong.';
}
// a card's stored JSON never contains ids/photos/owner (those live in columns / the photos table)
function cardData(card) {
  var d = Object.assign({}, card);
  delete d.photos; delete d.id; delete d.ownerUid;
  return d;
}

async function loadCard(name) {
  var r = await sb.from('cards').select('username, owner_uid, data').eq('username', name).maybeSingle();
  if (r.error) throw r.error;
  if (!r.data) return null;
  var c = Object.assign(blankCard(''), r.data.data);
  c.id = r.data.username; c.ownerUid = r.data.owner_uid; c.photos = {};
  var ids = [c.avatarId].concat(c.galleryIds || []).filter(Boolean);
  if (ids.length) {
    var p = await sb.from('photos').select('id, data').in('id', ids);
    if (p.error) throw p.error;
    p.data.forEach(function (row) { c.photos[row.id] = row.data; });
  }
  return c;
}

export const Store = {
  configured: configured, initError: initError, THEMES: THEMES, FONTS: FONTS, cleanId: cleanId,

  // cb(user|null) is called when the logged-in user actually changes (not on every token refresh)
  onAuth: function (cb) {
    var lastId = undefined;
    function emit(user) {
      currentUser = user || null;
      var id = currentUser ? currentUser.id : null;
      if (id === lastId) return;
      lastId = id; cb(currentUser);
    }
    sb.auth.onAuthStateChange(function (event, session) {
      if (event === 'PASSWORD_RECOVERY') {
        var pw = window.prompt('Enter your new password (at least 6 characters):');
        if (pw) sb.auth.updateUser({ password: pw }).then(function (r) { alert(r.error ? friendly(r.error) : 'Password updated.'); });
      }
      emit(session ? session.user : null);
    });
    // fallback in case the library does not send an initial event
    sb.auth.getSession().then(function (r) { emit(r && r.data && r.data.session ? r.data.session.user : null); })
      .catch(function () { emit(null); });
  },
  currentUser: function () { return currentUser; },

  usernameFree: async function (name) {
    var r = await sb.from('cards').select('username').eq('username', name).maybeSingle();
    if (r.error) throw r.error;
    return !r.data;
  },

  // Claim a User ID for the signed-in user and create their card. The primary key makes this atomic.
  claim: async function (rawName) {
    try {
      var u = (await sb.auth.getUser()).data.user; if (!u) return { ok: false, error: 'Please log in first.' };
      var name = cleanId(rawName);
      if (name.length < 3) return { ok: false, error: 'User ID needs 3-24 letters, numbers, - or _.' };
      var card = (ownerEmail && u.email && u.email.toLowerCase() === ownerEmail.toLowerCase()) ? seedCard(u.id) : blankCard(u.id);
      var r = await sb.from('cards').insert({ username: name, owner_uid: u.id, data: cardData(card) });
      if (r.error) return { ok: false, error: friendly(r.error) };
      return { ok: true, id: name };
    } catch (e) { return { ok: false, error: friendly(e) }; }
  },

  register: async function (email, pass, rawName) {
    try {
      var name = cleanId(rawName);
      if (name.length < 3) return { ok: false, error: 'User ID needs 3-24 letters, numbers, - or _.' };
      if (!(await Store.usernameFree(name))) return { ok: false, error: 'That User ID is already taken.' };
      var r = await sb.auth.signUp({ email: email.trim(), password: pass });
      if (r.error) return { ok: false, error: friendly(r.error) };
      if (!r.data.session) return { ok: false, error: 'Account created! Check your email to confirm it, then log in and pick your User ID.' };
      var c = await Store.claim(name);
      return c.ok ? c : { ok: true, claimPending: true, error: c.error };
    } catch (e) { return { ok: false, error: friendly(e) }; }
  },
  login: async function (email, pass) {
    try {
      var r = await sb.auth.signInWithPassword({ email: email.trim(), password: pass });
      return r.error ? { ok: false, error: friendly(r.error) } : { ok: true };
    } catch (e) { return { ok: false, error: friendly(e) }; }
  },
  resetPassword: async function (email) {
    try {
      var r = await sb.auth.resetPasswordForEmail(email.trim(), { redirectTo: location.origin + location.pathname });
      return r.error ? { ok: false, error: friendly(r.error) } : { ok: true };
    } catch (e) { return { ok: false, error: friendly(e) }; }
  },
  logout: function () { return sb.auth.signOut(); },

  // Public read
  getCard: function (name) { return loadCard(cleanId(name)); },
  // The signed-in user's own card (null if they have not claimed a User ID yet)
  myCard: async function () {
    var u = (await sb.auth.getUser()).data.user; if (!u) return null;
    var r = await sb.from('cards').select('username').eq('owner_uid', u.id).maybeSingle();
    if (r.error) throw r.error;
    return r.data ? loadCard(r.data.username) : null;
  },
  // Owner-only write (enforced by Row Level Security in schema.sql)
  saveCard: async function (card) {
    try {
      var r = await sb.from('cards').update({ data: cardData(card), updated_at: new Date().toISOString() }).eq('username', card.id).select('username');
      if (r.error) return { ok: false, error: friendly(r.error) };
      if (!r.data || !r.data.length) return { ok: false, error: 'Not allowed.' };
      return { ok: true };
    } catch (e) { return { ok: false, error: friendly(e) }; }
  },
  addPhoto: async function (name, dataUrl) {
    var r = await sb.from('photos').insert({ username: name, data: dataUrl }).select('id').single();
    if (r.error) throw r.error;
    return r.data.id;
  },
  deletePhoto: async function (name, id) { try { await sb.from('photos').delete().eq('id', id).eq('username', name); } catch (e) { /* ignore */ } },

  applyDesign: function (d) {
    d = d || {};
    var t = THEMES[d.theme] || THEMES.graphite, r = document.documentElement.style;
    r.setProperty('--bg', t.bg); r.setProperty('--top', t.top);
    r.setProperty('--o1', t.o1); r.setProperty('--o2', t.o2); r.setProperty('--o3', t.o3);
    r.setProperty('--accent', d.accent || '#ffffff');
    r.setProperty('--blur', 'blur(' + (d.blur == null ? 22 : d.blur) + 'px) saturate(160%)');
    r.setProperty('--font', "'" + (d.font || 'Outfit') + "'");
  },
  // resize + compress an image file to a data URL that fits Firestore's 1MB document limit
  fileToDataURL: function (file, max) {
    return new Promise(function (res, rej) {
      var fr = new FileReader(); fr.onerror = rej;
      fr.onload = function () {
        var img = new Image(); img.onerror = rej;
        img.onload = function () {
          var size = max || 800, q = 0.8, out;
          for (var i = 0; i < 6; i++) {
            var s = Math.min(1, size / Math.max(img.width, img.height));
            var c = document.createElement('canvas');
            c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
            c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
            var png = file.type === 'image/png';
            out = c.toDataURL(png ? 'image/png' : 'image/jpeg', q);
            if (out.length < 800000) return res(out);
            size = Math.round(size * 0.8); q = Math.max(0.5, q - 0.1);
            if (png && i === 1) file = { type: 'image/jpeg' }; // huge PNG: fall back to JPEG
          }
          rej(new Error('Image too large'));
        };
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }
};
