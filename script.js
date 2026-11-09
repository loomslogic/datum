/* Public card viewer: card.html?u=USERNAME or card.html?c=PUBLIC_ID */
import { Store } from './store.js';

var params = new URLSearchParams(location.search);
var id = Store.cleanId(params.get('u') || '');
var pid = String(params.get('c') || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 32); // permanent NFC id
var app = document.getElementById('app');

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
function safeUrl(u) {
  u = String(u || '').trim();
  if (/^(https?:|mailto:|tel:|sms:)/i.test(u)) return u;
  if (/^[\w.-]+\.[a-z]{2,}/i.test(u)) return 'https://' + u;
  return '#';
}
function safeImg(u) {
  u = String(u || '');
  return /^data:image\/(png|jpeg|webp|gif);base64,/.test(u) ? u : '';
}

var S = 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
var phoneSvg = '<svg viewBox="0 0 24 24" ' + S + '><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>';
var chatSvg = '<svg viewBox="0 0 24 24" ' + S + '><path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
var ICONS = {
  facebook: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 22v-8h2.7l.5-3.2h-3.2V8.8c0-.9.4-1.7 1.8-1.7h1.5V4.3S15.5 4 14.3 4c-2.6 0-4.3 1.6-4.3 4.4v2.4H7.2V14H10v8z"/></svg>',
  instagram: '<svg viewBox="0 0 24 24" ' + S + '><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1" fill="currentColor"/></svg>',
  tiktok: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z"/></svg>',
  portfolio: '<svg viewBox="0 0 24 24" ' + S + '><path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/></svg>',
  youtube: '<svg viewBox="0 0 24 24" ' + S + '><rect x="2.5" y="5" width="19" height="14" rx="4"/><path d="m10 9 5 3-5 3z" fill="currentColor"/></svg>',
  linkedin: '<svg viewBox="0 0 24 24" ' + S + '><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 11v5M8 8v.01M12 16v-5M12 13c0-2 4-2 4 0v3"/></svg>',
  website: '<svg viewBox="0 0 24 24" ' + S + '><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>',
  telegram: '<svg viewBox="0 0 24 24" ' + S + '><path d="M21 4 3 11l6 2 2 6 3-4 5 3z"/><path d="m9 13 12-9"/></svg>',
  map: '<svg viewBox="0 0 24 24" ' + S + '><path d="M12 21s7-6.2 7-11a7 7 0 0 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>'
};
ICONS.github = ICONS.portfolio; ICONS.other = ICONS.website; ICONS.x = ICONS.website;
ICONS.messenger = chatSvg; ICONS.whatsapp = phoneSvg; ICONS.viber = phoneSvg;
var globeSvg = ICONS.website;
var mailSvg = '<svg viewBox="0 0 24 24" ' + S + '><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>';
var walletSvg = '<svg viewBox="0 0 24 24" ' + S + '><rect x="2.5" y="6" width="19" height="13" rx="3"/><path d="M16 12.5h3.5M2.5 10h15a2 2 0 0 0 0-4h-12"/></svg>';
var userAdd = '<svg viewBox="0 0 24 24" ' + S + '><circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M19 8v6M16 11h6"/></svg>';

function initials(n) {
  return String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(function (w) { return w[0]; }).join('').toUpperCase();
}

var LOGO = '<img class="logo footlogo" src="logo.png" alt="DATUM" onerror="this.replaceWith(document.createTextNode(\'DATUM\'))">';
var rendered = false;

// shrink long words so they always fit the card width (120px for up to 6 letters)
function bigwordSize(t) {
  var n = Math.max(String(t || '').length, 1);
  return n <= 6 ? 120 : Math.max(36, Math.round(720 / n));
}

// custom background picture (fixed layer behind the card)
function applyBg(c, ph) {
  var o = document.querySelector('.orbs'); if (!o) return;
  var u = safeImg(ph[c.bgId]), d = c.design || {};
  var el = o.querySelector('.bgimg');
  document.body.classList.toggle('hasbg', !!u);
  if (!u) { if (el) el.remove(); return; }
  if (!el) { el = document.createElement('div'); el.className = 'bgimg'; o.insertBefore(el, o.firstChild); }
  var dim = (d.bgDim == null ? 35 : +d.bgDim) / 100;
  el.style.backgroundImage = 'linear-gradient(rgba(0,0,0,' + dim + '),rgba(0,0,0,' + dim + ')),url("' + u + '")';
  el.style.filter = 'blur(' + (+d.bgBlur || 0) + 'px)';
}

var cur = null;

function render(c) {
  cur = c;
  var d = c.design || {}, ph = c.photos || {};
  document.title = c.name + ' | Digital Card';
  Store.applyDesign(d);
  applyBg(c, ph);
  // after the first paint, re-renders (live preview edits) skip entrance animations
  document.body.classList.toggle('static', rendered);
  var keepY = rendered ? window.scrollY : 0;
  var h = '';
  var av = safeImg(ph[c.avatarId]);
  var isPng = /^data:image\/png/.test(av);

  h += '<header class="hero">' + (d.bigword !== false && d.bigwordText ? '<div class="bigword" style="--bw:' + bigwordSize(d.bigwordText) + 'px">' + esc(d.bigwordText) + '</div>' : '') +
    '<div class="avatar' + (av && !isPng ? ' round' : '') + '" id="avatar">' + (av ? '<img src="' + esc(av) + '" alt="' + esc(c.name) + '">' : esc(initials(c.name))) + '</div></header>';

  h += '<div class="head fade d1"><h1>' + esc(c.name) + '</h1><div class="role">' + esc(c.role) + '</div>' +
    (c.bio ? '<p class="bio">' + esc(c.bio) + '</p>' : '');
  if (c.chips && c.chips.length) h += '<div class="chips">' + c.chips.map(function (x) { return '<span class="chip">' + esc(x) + '</span>'; }).join('') + '</div>';
  h += '</div>';

  var det = '';
  if (c.phone) det += '<a class="detail" href="tel:' + esc(c.phone) + '">' + phoneSvg + '<small>Phone</small><span>' + (c.showPhone ? esc(c.phone) : 'Tap to call') + '</span></a>';
  if (c.email) det += '<a class="detail" href="mailto:' + esc(c.email) + '">' + mailSvg + '<small>Email</small><span>' + (c.showPhone ? esc(c.email) : 'Send email') + '</span></a>';
  if (c.links && c.links.length) det += '<a class="detail" href="#links">' + globeSvg + '<small>Profile</small><span>Visit links</span></a>';
  if (det) h += '<section class="fade d2"><div class="label">Details</div><div class="details">' + det + '</div></section>';

  var act = '<button class="btn" id="saveContact">' + userAdd + 'Save contact</button>';
  if (c.phone) act += '<a class="btn" href="tel:' + esc(c.phone) + '">' + phoneSvg + 'Call me</a><a class="btn" href="sms:' + esc(c.phone) + '">' + chatSvg + 'Text / SMS</a>';
  h += '<section class="fade d3"><div class="label">Quick Actions</div><div class="actions">' + act + '</div></section>';

  h += '<section class="fade d4">';
  function items(title, arr) {
    if (!arr || !arr.length) return '';
    return '<div class="label">' + title + '</div>' + arr.map(function (x) {
      return '<div class="item"><h3>' + esc(x.title) + '</h3>' + (x.desc ? '<p>' + esc(x.desc) + '</p>' : '') + (x.when ? '<div class="when">' + esc(x.when) + '</div>' : '') + '</div>';
    }).join('');
  }
  h += items('Experience', c.experience) + items('Education', c.education);
  if (c.skills && c.skills.length) h += '<div class="label">Skills</div><div class="skills">' + c.skills.map(function (s) { return '<span class="skill">' + esc(s) + '</span>'; }).join('') + '</div>';
  var gal = (c.galleryIds || []).map(function (gid) { return safeImg(ph[gid]); }).filter(Boolean);
  if (gal.length) h += '<div class="label">Gallery</div><div class="gallery">' + gal.map(function (u) { return '<button class="gal" data-src="' + esc(u) + '"><img src="' + esc(u) + '" alt=""></button>'; }).join('') + '</div>';
  var wl = (c.wallets || []).filter(function (w) { return w && (w.number || w.qrId); });
  if (wl.length) {
    h += '<div class="label">E-Wallets &amp; Payments</div><div class="links">' + (c.wallets || []).map(function (w, i) {
      if (!w || !(w.number || w.qrId)) return '';
      return '<button type="button" class="link wallet" data-w="' + i + '"><div class="ic">' + walletSvg + '</div><div><b>' + esc(w.label || 'E-Wallet') + '</b><small>' + esc(w.name || 'Tap to pay') + '</small></div></button>';
    }).join('') + '</div>';
  }
  if (c.links && c.links.length) {
    h += '<div class="label" id="links">Social Media &amp; Links</div><div class="links">' + c.links.map(function (l) {
      return '<a class="link" href="' + esc(safeUrl(l.url)) + '" target="_blank" rel="noopener"><div class="ic">' + (ICONS[l.type] || ICONS.website) + '</div><div><b>' + esc(l.label) + '</b><small>' + esc(l.sub) + '</small></div></a>';
    }).join('') + '</div>';
  }
  h += '</section><footer>&copy; ' + new Date().getFullYear() + ' ' + LOGO + '</footer>';
  app.innerHTML = h;
  if (rendered) window.scrollTo(0, keepY);
  rendered = true;

  var sc = document.getElementById('saveContact');
  if (sc) sc.onclick = function () { saveVcf(c); };
  app.querySelectorAll('.gal').forEach(function (b) {
    b.onclick = function () { var lb = document.getElementById('lb'); lb.querySelector('img').src = b.dataset.src; lb.hidden = false; };
  });
  app.querySelectorAll('.wallet').forEach(function (b) {
    b.onclick = function () { openWallet(+b.dataset.w); };
  });
  reveal();
}

/* ---------- e-wallet popup ---------- */
function openWallet(i) {
  var w = cur && cur.wallets && cur.wallets[i]; if (!w) return;
  var qr = safeImg(cur.photos && cur.photos[w.qrId]);
  document.getElementById('wmTitle').textContent = w.label || 'E-Wallet';
  document.getElementById('wmQr').innerHTML = qr ? '<img src="' + esc(qr) + '" alt="QR code">' : '<div class="noqr">No QR code added</div>';
  document.getElementById('wmQr').hidden = !qr && !!w.number;
  document.getElementById('wmName').textContent = w.name || '';
  document.getElementById('wmNum').textContent = w.number || '';
  var cp = document.getElementById('wmCopy');
  cp.hidden = !w.number; cp.textContent = 'Copy number';
  cp.onclick = function () {
    var done = function () { cp.textContent = 'Copied!'; };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(w.number).then(done, done);
    else { var t = document.createElement('textarea'); t.value = w.number; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); done(); }
  };
  document.getElementById('wm').hidden = false;
}
var wmEl = document.getElementById('wm'), wmX = document.getElementById('wmClose');
if (wmEl) wmEl.onclick = function (e) { if (e.target === this) this.hidden = true; };
if (wmX) wmX.onclick = function () { if (wmEl) wmEl.hidden = true; };
document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { if (wmEl) wmEl.hidden = true; var lbx = document.getElementById('lb'); if (lbx) lbx.hidden = true; } });

function saveVcf(c) {
  var parts = String(c.name).trim().split(/\s+/), last = parts.length > 1 ? parts.pop() : '', first = parts.join(' ');
  var v = ['BEGIN:VCARD', 'VERSION:3.0', 'N:' + last + ';' + first + ';;;', 'FN:' + c.name];
  if (c.role) v.push('TITLE:' + c.role);
  if (c.phone) v.push('TEL;TYPE=CELL:' + c.phone);
  if (c.email) v.push('EMAIL:' + c.email);
  v.push('URL:' + location.href.split('#')[0], 'END:VCARD');
  var a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([v.join('\r\n')], { type: 'text/vcard' }));
  a.download = (c.name || 'contact').replace(/\s+/g, '_') + '.vcf';
  document.body.appendChild(a); a.click(); a.remove();
}

function reveal() {
  if (document.body.classList.contains('static')) return;
  var els = app.querySelectorAll('.label,.item,.skill,.link,.gal,.chip');
  if (!('IntersectionObserver' in window)) return;
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.08 });
  els.forEach(function (el, i) { el.classList.add('reveal'); el.style.setProperty('--d', (i % 6) * 50 + 'ms'); io.observe(el); });
}

function message(title, text, btn, logoOnly) {
  document.title = title;
  // logoOnly: show the logo instead of the title text (title text returns only if the logo file is missing)
  var logo = logoOnly
    ? '<img class="logo" src="logo.png" alt="' + esc(title) + '" style="width:220px" onerror="this.remove();var h=document.getElementById(\'mt\');if(h)h.hidden=false">'
    : '';
  app.innerHTML = '<div class="notfound">' + logo + '<h1 id="mt"' + (logoOnly ? ' hidden' : '') + '>' + esc(title) + '</h1><p>' + esc(text) + '</p>' +
    (btn ? '<a class="btn" href="dashboard.html">' + esc(btn) + '</a>' : '') + '</div>';
}

async function load() {
  if (params.get('preview') === '1') return; // dashboard preview: wait for the card via postMessage
  if (!Store.configured) return message('Not set up yet', 'Add your Supabase settings in supabase-config.js (see README.md).', 'Open dashboard');
  if (!id && !pid) { location.replace('index.html'); return; }
  app.innerHTML = '<div class="notfound"><p>Loading...</p></div>';
  try {
    var c = pid ? await Store.getCardByPid(pid) : await Store.getCard(id);
    if (!c) return message('Card not found', 'There is no card for "' + (pid || id) + '".', 'Log in');
    render(c);
  } catch (e) { message('Could not load card', 'Please check your connection and try again.'); }
}

document.getElementById('lb').onclick = function () { this.hidden = true; };
// live preview from the dashboard: it posts the card being edited
window.addEventListener('message', function (e) {
  if (e.origin !== location.origin) return;
  if (e.data && e.data.type === 'datum-card' && e.data.card) render(e.data.card);
});
load();
