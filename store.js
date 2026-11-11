/* DATUM Card - data layer on Supabase (Auth + Postgres with Row Level Security). ES module. */
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { supabaseConfig, ownerEmail } from './supabase-config.js';

const configured = !/YOUR_/.test(supabaseConfig.url || 'YOUR_') && !/YOUR_/.test(supabaseConfig.anonKey || 'YOUR_');
const sb = configured ? createClient(supabaseConfig.url, supabaseConfig.anonKey) : null;
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
    location: '', chips: [], phone: '', showPhone: false, email: '', avatarId: '', bgId: '', galleryIds: [],
    experience: [], education: [], skills: [], links: [], wallets: [],
    design: { theme: 'graphite', accent: '#ffffff', font: 'Outfit', blur: 22, bigword: true, bigwordText: 'HELLO', bgColor: '', bgDim: 35, bgBlur: 0 }
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

// mix a #rrggbb colour toward white by amt (0-1)
function lighten(hex, amt) {
  var n = parseInt(hex.slice(1), 16), out = '#';
  [n >> 16 & 255, n >> 8 & 255, n & 255].forEach(function (v) {
    out += ('0' + Math.round(v + (255 - v) * amt).toString(16)).slice(-2);
  });
  return out;
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
  delete d.photos; delete d.id; delete d.ownerUid; delete d.publicId;
  return d;
}

async function loadCard(name) {
  var r = await sb.from('cards').select('username, owner_uid, public_id, data').eq('username', name).maybeSingle();
  if (r.error) throw r.error;
  if (!r.data) return null;
  var c = Object.assign(blankCard(''), r.data.data);
  c.id = r.data.username; c.ownerUid = r.data.owner_uid; c.publicId = r.data.public_id || ''; c.photos = {};
  var ids = [c.avatarId, c.bgId].concat(c.galleryIds || [], (c.wallets || []).map(function (w) { return w && w.qrId; })).filter(Boolean);
  if (ids.length) {
    var p = await sb.from('photos').select('id, data').in('id', ids);
    if (p.error) throw p.error;
    p.data.forEach(function (row) { c.photos[row.id] = row.data; });
  }
  return c;
}

export const Store = {
  configured: configured, THEMES: THEMES, FONTS: FONTS, cleanId: cleanId,

  // cb(user|null) is called when the logged-in user actually changes (not on every token refresh)
  onAuth: function (cb) {
    var lastId = undefined;
    sb.auth.onAuthStateChange(function (event, session) {
      if (event === 'PASSWORD_RECOVERY') {
        var pw = window.prompt('Enter your new password (at least 6 characters):');
        if (pw) sb.auth.updateUser({ password: pw }).then(function (r) { alert(r.error ? friendly(r.error) : 'Password updated.'); });
      }
      currentUser = session ? session.user : null;
      var id = currentUser ? currentUser.id : null;
      if (id === lastId) return;
      lastId = id; cb(currentUser);
    });
  },
  currentUser: function () { return currentUser; },

  usernameFree: async function (name) {
    var r = await sb.from('cards').select('username').eq('username', name).maybeSingle();
    if (r.error) throw r.error;
    return !r.data;
  },

  login: async function (email, pass) {
    try {
      var e = String(email || '').trim();
      if (e.indexOf('@') < 0) e = cleanId(e) + '@datum.invalid'; // User ID login
      var r = await sb.auth.signInWithPassword({ email: e, password: pass });
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

  // ---- account settings (signed-in user) ----
  userEmail: function () { return currentUser ? currentUser.email : ''; },

  // Change the password. The current password is checked first.
  changePassword: async function (current, next) {
    try {
      if (!currentUser || !currentUser.email) return { ok: false, error: 'Please log in first.' };
      if (!current) return { ok: false, error: 'Enter your current password.' };
      if (!next || next.length < 6) return { ok: false, error: 'Password must be at least 6 characters.' };
      var chk = await sb.auth.signInWithPassword({ email: currentUser.email, password: current });
      if (chk.error) return { ok: false, error: 'Your current password is wrong.' };
      var r = await sb.auth.updateUser({ password: next });
      return r.error ? { ok: false, error: friendly(r.error) } : { ok: true };
    } catch (e) { return { ok: false, error: friendly(e) }; }
  },
  // Change the login email. Supabase sends a confirmation link to the new address.
  changeEmail: async function (email) {
    try {
      email = String(email || '').trim();
      if (!email) return { ok: false, error: 'Enter the new email address.' };
      var r = await sb.auth.updateUser({ email: email }, { emailRedirectTo: location.origin + location.pathname });
      return r.error ? { ok: false, error: friendly(r.error) } : { ok: true };
    } catch (e) { return { ok: false, error: friendly(e) }; }
  },
  // Change the User ID (card link). Needs the rename_card() function from schema_update.sql.
  changeUserId: async function (rawName) {
    try {
      var name = cleanId(rawName);
      if (name.length < 3) return { ok: false, error: 'User ID needs 3-24 letters, numbers, - or _.' };
      var r = await sb.rpc('rename_card', { new_name: name });
      if (r.error) {
        if (/rename_card/i.test(r.error.message || '') && /not find|does not exist|schema cache/i.test(r.error.message || ''))
          return { ok: false, error: 'Run schema_update.sql in Supabase first (see README).' };
        return { ok: false, error: friendly(r.error) };
      }
      return { ok: true, id: name };
    } catch (e) { return { ok: false, error: friendly(e) }; }
  },

  // ---- moderators ----
  isModerator: async function () {
    try {
      var u = (await sb.auth.getUser()).data.user; if (!u) return false;
      var r = await sb.from('moderators').select('user_id').eq('user_id', u.id).maybeSingle();
      return !!(r.data && !r.error);
    } catch (e) { return false; }
  },
  // Calls the create-user edge function (moderators only; checked on the server)
  // shared caller for the create-user function
  callFn: async function (body) {
    try {
      var r = await sb.functions.invoke('smart-endpoint', { body: body });
      if (r.error) {
        var m = ''; try { m = (await r.error.context.json()).error; } catch (e) { /* ignore */ }
        return { ok: false, error: m || 'Could not reach the account service. Is the smart-endpoint function deployed?' };
      }
      if (r.data && r.data.error) return { ok: false, error: r.data.error };
      return Object.assign({ ok: true }, r.data);
    } catch (e) { return { ok: false, error: friendly(e) }; }
  },
  isPlaceholderEmail: function () { return /@datum\.invalid$/i.test(currentUser && currentUser.email || ''); },
  setEmail: async function (email) {
    var r = await Store.callFn({ action: 'set-email', email: email });
    if (r.ok) { try { await sb.auth.refreshSession(); var u = (await sb.auth.getUser()).data.user; if (u) currentUser = u; } catch (e) { /* ignore */ } }
    return r;
  },
  modResetPassword: function (username, password) { return Store.callFn({ action: 'reset-password', username: username, password: password }); },
  createAccount: async function (o) {
    return Store.callFn(Object.assign({ action: 'create' }, o));
  },
  listCards: async function () {
    var r = await sb.from('cards').select('username, public_id, updated_at').order('updated_at', { ascending: false }).limit(200);
    if (r.error) throw r.error;
    return r.data;
  },

  // Public read
  getCardByPid: async function (pid) {
    var r = await sb.from('cards').select('username').eq('public_id', pid).maybeSingle();
    if (r.error) throw r.error;
    return r.data ? loadCard(r.data.username) : null;
  },
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
    var bg = t.bg, top = t.top;
    if (/^#[0-9a-f]{6}$/i.test(d.bgColor || '')) { bg = d.bgColor; top = lighten(d.bgColor, 0.14); }
    r.setProperty('--bg', bg); r.setProperty('--top', top);
    r.setProperty('--o1', t.o1); r.setProperty('--o2', t.o2); r.setProperty('--o3', t.o3);
    r.setProperty('--accent', d.accent || '#ffffff');
    r.setProperty('--blur', 'blur(' + (d.blur == null ? 22 : d.blur) + 'px) saturate(160%)');
    r.setProperty('--font', "'" + (d.font || 'Outfit') + "'");
  },
  // Shrink an uploaded picture so it looks the same on a phone but weighs far less.
  //  - a small file that is already within the size limit is kept untouched (no quality loss)
  //  - otherwise it is resized (smooth, high quality) and re-encoded, lowering quality only as far as needed
  //  - transparent PNGs stay PNG; everything else becomes WebP (or JPEG where WebP is unsupported)
  // max = longest side in px, startQ = first quality tried, targetKB = size to aim for (hard cap stays ~600KB)
  fileToDataURL: function (file, max, startQ, targetKB) {
    var HARD = 800000;                               // database limit per picture (characters of the data URL)
    var target = Math.min(HARD, Math.round((targetKB || 220) * 1024 * 4 / 3));
    max = max || 1280; startQ = startQ || 0.86;
    var webp = document.createElement('canvas').toDataURL('image/webp').indexOf('data:image/webp') === 0;
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('Not an image')); };
      img.onload = function () {
        URL.revokeObjectURL(url);
        var W = img.naturalWidth || img.width, H = img.naturalHeight || img.height;
        var ok = /^image\/(jpeg|png|webp)$/.test(file.type);
        // 1) already small enough: keep the original bytes, nothing is lost
        if (ok && file.size * 4 / 3 <= target && Math.max(W, H) <= max) {
          var fr = new FileReader(); fr.onerror = rej;
          fr.onload = function () { res(fr.result); };
          return fr.readAsDataURL(file);
        }
        function draw(size) {
          var s = Math.min(1, size / Math.max(W, H));
          var c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(W * s)); c.height = Math.max(1, Math.round(H * s));
          var x = c.getContext('2d');
          x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
          x.drawImage(img, 0, 0, c.width, c.height);
          return c;
        }
        var size = max, c = draw(size), alpha = false;
        if (file.type !== 'image/jpeg') {              // only PNG/WebP/GIF can have see-through pixels
          try {
            var d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
            for (var p = 3; p < d.length; p += 4) { if (d[p] < 250) { alpha = true; break; } }
          } catch (e) { alpha = file.type === 'image/png'; }
        }
        var mime = alpha ? 'image/png' : (webp ? 'image/webp' : 'image/jpeg');
        if (alpha) target = Math.min(HARD, target * 2);   // see-through PNGs cannot be lossy, so allow a bit more room
        var q = startQ, out = '', best = '';
        for (var i = 0; i < 10; i++) {
          out = c.toDataURL(mime, q);
          if (!best || out.length < best.length) best = out;
          if (out.length <= target) return res(out);
          if (!alpha && q > 0.66) { q = Math.max(0.66, q - 0.06); }          // 1st: lower quality a little
          else { size = Math.round(size * 0.85); c = draw(size); q = Math.max(0.7, startQ - 0.06); }  // then: a bit smaller
        }
        if (best.length <= HARD) return res(best);
        rej(new Error('Image too large'));
      };
      img.src = url;
    });
  }
};
