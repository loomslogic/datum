/* Dashboard: sign up / log in, claim a User ID, edit your own card with live preview */
import { Store } from './store.js';

var $ = function (s) { return document.querySelector(s); };
var card = null, username = null, tab = 'profile', mode = 'login', timer = null, saving = Promise.resolve();
window.__datumStarted = true;
var VIEWS = ['loading', 'setup', 'auth', 'claim', 'editor'];

function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function show(v) { VIEWS.forEach(function (x) { $('#' + x).hidden = x !== v; }); }

/* ---------- AUTH ---------- */
$('#authTabs').addEventListener('click', function (e) {
  var b = e.target.closest('button'); if (!b) return;
  mode = b.dataset.m;
  this.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); });
  var reg = mode === 'register';
  $('#aGo').textContent = reg ? 'Create account' : 'Log in';
  $('#aUserWrap').hidden = !reg; $('#aHint').hidden = !reg; $('#aForgot').hidden = reg;
  $('#aPw').autocomplete = reg ? 'new-password' : 'current-password';
  $('#aErr').textContent = '';
});
$('#aId').addEventListener('input', function () { $('#aPrev').textContent = Store.cleanId(this.value) || 'yourid'; });

async function go() {
  var btn = $('#aGo'); btn.disabled = true; $('#aErr').textContent = '';
  var email = $('#aEmail').value, pw = $('#aPw').value;
  var r = mode === 'login' ? await Store.login(email, pw) : await Store.register(email, pw, $('#aId').value);
  btn.disabled = false;
  if (!r.ok) $('#aErr').textContent = r.error;
  // on success, onAuth() below switches the view
}
$('#aGo').addEventListener('click', go);
$('#aPw').addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
$('#aForgot').addEventListener('click', async function () {
  var email = $('#aEmail').value.trim();
  if (!email) { $('#aErr').textContent = 'Enter your email above first.'; return; }
  var r = await Store.resetPassword(email);
  $('#aErr').textContent = r.ok ? 'Password reset email sent. Check your inbox.' : r.error;
});

$('#cGo').addEventListener('click', async function () {
  this.disabled = true; $('#cErr').textContent = '';
  var r = await Store.claim($('#cId').value);
  this.disabled = false;
  if (!r.ok) { $('#cErr').textContent = r.error; return; }
  boot();
});
$('#cOut').addEventListener('click', function () { Store.logout(); });
$('#logout').addEventListener('click', function () { Store.logout(); });

async function boot() {
  var c = null;
  try { c = await Store.myCard(); } catch (e) { /* offline */ }
  if (!c) { show('claim'); return; }
  openEditor(c);
}

function openEditor(c) {
  card = c; username = c.id;
  show('editor');
  $('#who').textContent = '@' + username;
  $('#viewLive').href = 'card.html?u=' + username;
  var f = $('#frame');
  f.onload = pushPreview;
  f.src = 'card.html?u=' + username + '&preview=1';
  Store.applyDesign(card.design);
  renderTab();
}

$('#togglePrev').onclick = function () {
  document.body.classList.toggle('showprev');
  this.textContent = document.body.classList.contains('showprev') ? 'Edit' : 'Preview';
  pushPreview();
};

/* ---------- SAVE + PREVIEW ---------- */
function pushPreview() {
  var f = $('#frame');
  if (f.contentWindow && card) f.contentWindow.postMessage({ type: 'datum-card', card: JSON.parse(JSON.stringify(card)) }, location.origin);
}
function queueSave() {
  var s = $('#saved'); s.textContent = 'Saving...'; s.classList.remove('err');
  pushPreview();
  clearTimeout(timer);
  timer = setTimeout(function () {
    saving = saving.then(async function () {
      var r = await Store.saveCard(card);
      if (r.ok) { s.textContent = 'All changes saved'; }
      else { s.textContent = 'Could not save: ' + r.error; s.classList.add('err'); }
    });
  }, 500);
}

/* ---------- helpers ---------- */
function getPath(o, p) { return p.split('.').reduce(function (a, k) { return a == null ? a : a[k]; }, o); }
function setPath(o, p, v) {
  var k = p.split('.'), last = k.pop();
  var t = k.reduce(function (a, x) { return a[x]; }, o); t[last] = v;
}
function field(label, path, opt) {
  opt = opt || {};
  var v = getPath(card, path); if (opt.list) v = (v || []).join(', ');
  var tag = opt.area ? '<textarea data-path="' + path + '"' + (opt.list ? ' data-list="1"' : '') + ' placeholder="' + esc(opt.ph || '') + '">' + esc(v) + '</textarea>'
    : '<input data-path="' + path + '"' + (opt.list ? ' data-list="1"' : '') + ' type="' + (opt.type || 'text') + '" value="' + esc(v) + '" placeholder="' + esc(opt.ph || '') + '">';
  return '<label class="f"><span>' + label + '</span>' + tag + '</label>';
}
function check(label, path) {
  return '<label class="chk"><input type="checkbox" data-path="' + path + '"' + (getPath(card, path) ? ' checked' : '') + '> ' + label + '</label>';
}

/* ---------- TABS ---------- */
$('#tabs').addEventListener('click', function (e) {
  var b = e.target.closest('button'); if (!b) return;
  tab = b.dataset.t;
  this.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); });
  renderTab();
});

var LINK_TYPES = ['facebook', 'instagram', 'tiktok', 'youtube', 'linkedin', 'messenger', 'telegram', 'whatsapp', 'viber', 'map', 'github', 'portfolio', 'website', 'other'];
var MAX_GALLERY = 12;

function rows(listName, fields, addLabel) {
  var arr = card[listName] || [];
  return arr.map(function (it, i) {
    return '<div class="card"><h4>#' + (i + 1) + ' <button class="mini danger" data-act="del" data-list="' + listName + '" data-i="' + i + '">Remove</button></h4>' +
      fields.map(function (f) { return field(f[0], listName + '.' + i + '.' + f[1], { area: f[2] }); }).join('') + '</div>';
  }).join('') + '<button class="mini" data-act="add" data-list="' + listName + '">+ ' + addLabel + '</button>';
}

function renderTab() {
  var h = '', ph = card.photos || {};
  if (tab === 'profile') {
    h += field('Full name', 'name') + field('Role / tagline', 'role') + field('Bio', 'bio', { area: true }) +
      field('Chips (comma separated)', 'chips', { list: true, ph: 'City, Hobby, Role' }) +
      '<div class="h">Contact</div><div class="row2">' + field('Phone', 'phone', { type: 'tel' }) + field('Email', 'email', { type: 'email' }) + '</div>' +
      check('Show phone / email text on the card (otherwise only "Tap to call")', 'showPhone');
  } else if (tab === 'photos') {
    var av = ph[card.avatarId];
    h += '<div class="card"><h4>Profile photo</h4>' +
      (av ? '<img class="avprev" src="' + esc(av) + '" alt="">' : '<div class="avprev">' + esc((card.name || '?')[0]) + '</div>') +
      '<p class="note">Tip: a PNG with a transparent background looks best in the hero.</p>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap"><label class="mini upl">Upload photo<input type="file" accept="image/*" id="upAv"></label>' +
      (av ? '<button class="mini danger" data-act="rmav">Remove</button>' : '') + '</div></div>' +
      '<div class="card"><h4>Gallery (' + (card.galleryIds || []).length + '/' + MAX_GALLERY + ')</h4><div class="thumbs">' +
      (card.galleryIds || []).map(function (gid, i) { return ph[gid] ? '<div class="thumb"><img src="' + esc(ph[gid]) + '" alt=""><button data-act="rmg" data-i="' + i + '" aria-label="Remove">&times;</button></div>' : ''; }).join('') +
      '</div><label class="mini upl">Add photos<input type="file" accept="image/*" multiple id="upGal"></label>' +
      '<p class="note">Photos are resized automatically.</p></div>';
  } else if (tab === 'links') {
    h += (card.links || []).map(function (l, i) {
      return '<div class="card"><h4>#' + (i + 1) + ' <button class="mini danger" data-act="del" data-list="links" data-i="' + i + '">Remove</button></h4>' +
        '<label class="f"><span>Type</span><select data-path="links.' + i + '.type">' + LINK_TYPES.map(function (t) { return '<option' + (l.type === t ? ' selected' : '') + '>' + t + '</option>'; }).join('') + '</select></label>' +
        '<div class="row2">' + field('Label', 'links.' + i + '.label') + field('Subtext', 'links.' + i + '.sub') + '</div>' +
        field('URL', 'links.' + i + '.url', { ph: 'https://...' }) + '</div>';
    }).join('') + '<button class="mini" data-act="add" data-list="links">+ Add link</button>';
  } else if (tab === 'resume') {
    h += '<div class="h">Experience</div>' + rows('experience', [['Title', 'title'], ['Description', 'desc', true], ['When', 'when']], 'Add experience') +
      '<div class="h">Education</div>' + rows('education', [['School', 'title'], ['Details', 'desc', true], ['When', 'when']], 'Add education') +
      '<div class="h">Skills</div>' + field('Skills (comma separated)', 'skills', { area: true, list: true });
  } else if (tab === 'design') {
    var d = card.design, T = Store.THEMES;
    h += '<div class="h">Theme</div><div class="themes">' + Object.keys(T).map(function (k) {
      return '<button class="theme' + (d.theme === k ? ' on' : '') + '" data-act="theme" data-k="' + k + '"><i style="background:linear-gradient(135deg,' + T[k].o1 + ',' + T[k].bg + ')"></i>' + T[k].label + '</button>';
    }).join('') + '</div>' +
      '<div class="row2"><label class="f"><span>Accent colour</span><input type="color" data-path="design.accent" value="' + esc(d.accent) + '"></label>' +
      '<label class="f"><span>Font</span><select data-path="design.font">' + Store.FONTS.map(function (f) { return '<option' + (d.font === f ? ' selected' : '') + '>' + f + '</option>'; }).join('') + '</select></label></div>' +
      '<label class="f"><span>Glass blur (' + d.blur + 'px)</span><input type="range" min="0" max="40" data-path="design.blur" data-num="1" value="' + d.blur + '"></label>' +
      check('Show big background word', 'design.bigword') + field('Big word', 'design.bigwordText');
  } else if (tab === 'share') {
    var url = new URL('card.html?u=' + username, location.href).href;
    h += '<div class="card"><h4>Your public card link</h4><input id="shareUrl" readonly value="' + esc(url) + '">' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="mini" data-act="copy">Copy link</button><a class="mini" href="' + esc(url) + '" target="_blank" rel="noopener">Open card</a></div>' +
      '<p class="note">Anyone with this link can view your card. Only you, logged in, can edit it.</p></div>' +
      '<div class="card"><h4>Backup</h4><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="mini" data-act="export">Download backup (.json)</button>' +
      '<label class="mini upl">Restore backup<input type="file" accept="application/json" id="upImp"></label></div>' +
      '<p class="note">Backups contain your text and design, not photos.</p></div>';
  }
  $('#tabBody').innerHTML = h;
  bindUploads();
}

/* ---------- input handling ---------- */
$('#tabBody').addEventListener('input', function (e) {
  var el = e.target, p = el.dataset.path; if (!p) return;
  var v = el.type === 'checkbox' ? el.checked : el.value;
  if (el.dataset.list) v = v.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  if (el.dataset.num) { v = +v; el.closest('label').firstChild.textContent = 'Glass blur (' + v + 'px)'; }
  setPath(card, p, v);
  if (p.indexOf('design.') === 0) Store.applyDesign(card.design);
  queueSave();
});

$('#tabBody').addEventListener('click', async function (e) {
  var b = e.target.closest('[data-act]'); if (!b) return;
  var act = b.dataset.act, i = +b.dataset.i, L = b.dataset.list;
  if (act === 'add') {
    var tpl = { links: { type: 'website', label: 'New link', sub: '', url: '' }, experience: { title: '', desc: '', when: '' }, education: { title: '', desc: '', when: '' } };
    card[L] = card[L] || []; card[L].push(tpl[L]); queueSave(); renderTab();
  } else if (act === 'del') { card[L].splice(i, 1); queueSave(); renderTab(); }
  else if (act === 'theme') { card.design.theme = b.dataset.k; Store.applyDesign(card.design); queueSave(); renderTab(); }
  else if (act === 'rmav') { var old = card.avatarId; card.avatarId = ''; queueSave(); renderTab(); await Store.deletePhoto(username, old); }
  else if (act === 'rmg') { var gid = card.galleryIds.splice(i, 1)[0]; queueSave(); renderTab(); await Store.deletePhoto(username, gid); }
  else if (act === 'copy') {
    var inp = $('#shareUrl'); inp.select();
    (navigator.clipboard ? navigator.clipboard.writeText(inp.value) : Promise.resolve(document.execCommand('copy'))).then(function () { b.textContent = 'Copied!'; });
  } else if (act === 'export') {
    var copy = JSON.parse(JSON.stringify(card)); delete copy.photos; delete copy.ownerUid; delete copy.id; delete copy.avatarId; delete copy.galleryIds;
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(copy, null, 2)], { type: 'application/json' }));
    a.download = username + '-card-backup.json'; document.body.appendChild(a); a.click(); a.remove();
  }
});

function setSaved(msg, err) { var s = $('#saved'); s.textContent = msg; s.classList.toggle('err', !!err); }

function bindUploads() {
  var av = $('#upAv'), gal = $('#upGal'), imp = $('#upImp');
  if (av) av.onchange = async function () {
    var f = this.files[0]; if (!f) return;
    try {
      setSaved('Uploading photo...');
      var data = await Store.fileToDataURL(f, 800);
      var id = await Store.addPhoto(username, data);
      var old = card.avatarId;
      card.photos[id] = data; card.avatarId = id;
      queueSave(); renderTab();
      if (old) Store.deletePhoto(username, old);
    } catch (e) { setSaved('Could not upload that photo.', true); }
  };
  if (gal) gal.onchange = async function () {
    var files = Array.from(this.files);
    card.galleryIds = card.galleryIds || [];
    for (var f of files) {
      if (card.galleryIds.length >= MAX_GALLERY) { setSaved('Gallery is full (' + MAX_GALLERY + ' photos).', true); break; }
      try {
        setSaved('Uploading photo...');
        var data = await Store.fileToDataURL(f, 800);
        var id = await Store.addPhoto(username, data);
        card.photos[id] = data; card.galleryIds.push(id);
      } catch (e) { setSaved('One photo could not be uploaded.', true); }
    }
    queueSave(); renderTab();
  };
  if (imp) imp.onchange = function () {
    var f = this.files[0]; if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      try {
        var c = JSON.parse(r.result);
        ['name', 'role', 'bio', 'location', 'chips', 'phone', 'showPhone', 'email', 'experience', 'education', 'skills', 'links', 'design'].forEach(function (k) { if (k in c) card[k] = c[k]; });
        Store.applyDesign(card.design); queueSave(); renderTab();
      } catch (e) { alert('That file is not a valid backup.'); }
    };
    r.readAsText(f);
  };
}

/* ---------- boot ---------- */
if (!Store.configured) show('setup');
else if (Store.initError) {
  $('#setupErr').textContent = 'Supabase said: ' + Store.initError + '. Check the url and anonKey in supabase-config.js.';
  show('setup');
} else {
  // if nothing answers, say so instead of staying on "Loading..." forever
  setTimeout(function () {
    if (!$('#loading').hidden) {
      $('#loading').querySelector('.sub').textContent =
        'Could not reach the login service. Check your internet connection and that the url and anonKey in supabase-config.js are correct, then reload.';
    }
  }, 8000);
  Store.onAuth(function (user) {
    if (!user) { card = null; show('auth'); return; }
    boot();
  });
}
