/* Dashboard: sign up / log in, claim a User ID, edit your own card with live preview */
import { Store } from './store.js';

var $ = function (s) { return document.querySelector(s); };
var card = null, username = null, tab = 'profile', mode = 'login', timer = null, saving = Promise.resolve();
var VIEWS = ['loading', 'setup', 'auth', 'claim', 'editor'];

function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function show(v) { VIEWS.forEach(function (x) { $('#' + x).hidden = x !== v; }); }

/* ---------- AUTH ---------- */
async function go() {
  var btn = $('#aGo'); btn.disabled = true; $('#aErr').textContent = '';
  var email = $('#aEmail').value, pw = $('#aPw').value;
  var r = await Store.login(email, pw);
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
  $('#viewLive').href = cardLink();
  var f = $('#frame');
  f.onload = pushPreview;
  f.src = 'index.html?u=' + username + '&preview=1';
  Store.applyDesign(card.design);
  renderTab();
  Store.isModerator().then(function (m) {
    var nav = $('#tabs'), ex = nav.querySelector('[data-t=mod]');
    if (ex) ex.remove();
    if (m) { var b = document.createElement('button'); b.dataset.t = 'mod'; b.textContent = 'Moderator'; nav.appendChild(b); }
  });
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
// permanent link (never changes, use it for NFC cards); falls back to the name link
function cardLink() { return card && card.publicId ? 'index.html?c=' + card.publicId : 'index.html?u=' + username; }
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
var WALLET_TYPES = { gcash: 'GCash', maya: 'Maya', gotyme: 'GoTyme', coins: 'Coins.ph', paypal: 'PayPal', bank: 'Bank transfer', other: 'Other' };
var MAX_WALLETS = 8;

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
  } else if (tab === 'wallets') {
    h += '<p class="note">Visitors tap a wallet on your card to see the QR code and account number. Only add details you are happy to make public.</p>' +
      (card.wallets || []).map(function (w, i) {
        var qr = ph[w.qrId];
        return '<div class="card"><h4>#' + (i + 1) + ' <button class="mini danger" data-act="del" data-list="wallets" data-i="' + i + '">Remove</button></h4>' +
          '<label class="f"><span>Wallet</span><select data-path="wallets.' + i + '.type">' + Object.keys(WALLET_TYPES).map(function (k) { return '<option value="' + k + '"' + (w.type === k ? ' selected' : '') + '>' + WALLET_TYPES[k] + '</option>'; }).join('') + '</select></label>' +
          field('Label shown on card', 'wallets.' + i + '.label') +
          field('Account name', 'wallets.' + i + '.name') +
          field('Account / mobile number', 'wallets.' + i + '.number', { type: 'text' }) +
          '<span class="h" style="margin:0">QR code</span>' +
          (qr ? '<div class="thumbs"><div class="thumb" style="background:#fff;max-width:160px"><img src="' + esc(qr) + '" alt="" style="object-fit:contain"></div></div>' : '<p class="note">No QR code yet.</p>') +
          '<div style="display:flex;gap:8px;flex-wrap:wrap"><label class="mini upl">' + (qr ? 'Change QR' : 'Upload QR') + '<input type="file" accept="image/*" data-qr="' + i + '"></label>' +
          (qr ? '<button class="mini danger" data-act="rmqr" data-i="' + i + '">Remove QR</button>' : '') + '</div></div>';
      }).join('') +
      ((card.wallets || []).length < MAX_WALLETS ? '<button class="mini" data-act="add" data-list="wallets">+ Add e-wallet</button>' : '<p class="note">Maximum of ' + MAX_WALLETS + ' wallets.</p>');
  } else if (tab === 'resume') {
    h += '<div class="h">Experience</div>' + rows('experience', [['Title', 'title'], ['Description', 'desc', true], ['When', 'when']], 'Add experience') +
      '<div class="h">Education</div>' + rows('education', [['School', 'title'], ['Details', 'desc', true], ['When', 'when']], 'Add education') +
      '<div class="h">Skills</div>' + field('Skills (comma separated)', 'skills', { area: true, list: true });
  } else if (tab === 'design') {
    var d = card.design, T = Store.THEMES, bg = ph[card.bgId];
    h += '<div class="h">Theme</div><div class="themes">' + Object.keys(T).map(function (k) {
      return '<button class="theme' + (d.theme === k ? ' on' : '') + '" data-act="theme" data-k="' + k + '"><i style="background:linear-gradient(135deg,' + T[k].o1 + ',' + T[k].bg + ')"></i>' + T[k].label + '</button>';
    }).join('') + '</div>' +
      '<div class="row2"><label class="f"><span>Accent colour</span><input type="color" data-path="design.accent" value="' + esc(d.accent) + '"></label>' +
      '<label class="f"><span>Font</span><select data-path="design.font">' + Store.FONTS.map(function (f) { return '<option' + (d.font === f ? ' selected' : '') + '>' + f + '</option>'; }).join('') + '</select></label></div>' +
      '<label class="f"><span>Glass blur (' + d.blur + 'px)</span><input type="range" min="0" max="40" data-path="design.blur" data-num="1" data-label="Glass blur ({v}px)" value="' + d.blur + '"></label>' +
      check('Show big background word', 'design.bigword') + field('Big word', 'design.bigwordText') +
      '<div class="h">Background</div>' +
      '<div class="card"><h4>Colour</h4><div class="row2">' +
      '<label class="f"><span>Background colour</span><input type="color" data-path="design.bgColor" value="' + esc(d.bgColor || T[d.theme].bg) + '"></label>' +
      '<div class="f"><span>&nbsp;</span><button class="mini" data-act="bgcolor">Use theme colour</button></div></div></div>' +
      '<div class="card"><h4>Picture</h4>' +
      (bg ? '<div class="thumbs"><div class="thumb" style="aspect-ratio:16/10;grid-column:1/-1"><img src="' + esc(bg) + '" alt=""></div></div>' : '<p class="note">No background picture yet.</p>') +
      '<div style="display:flex;gap:8px;flex-wrap:wrap"><label class="mini upl">' + (bg ? 'Change picture' : 'Upload picture') + '<input type="file" accept="image/*" id="upBg"></label>' +
      (bg ? '<button class="mini danger" data-act="rmbg">Remove</button>' : '') + '</div>' +
      (bg ? '<label class="f"><span>Darken (' + (d.bgDim == null ? 35 : d.bgDim) + '%)</span><input type="range" min="0" max="80" data-path="design.bgDim" data-num="1" data-label="Darken ({v}%)" value="' + (d.bgDim == null ? 35 : d.bgDim) + '"></label>' +
        '<label class="f"><span>Blur (' + (d.bgBlur || 0) + 'px)</span><input type="range" min="0" max="20" data-path="design.bgBlur" data-num="1" data-label="Blur ({v}px)" value="' + (d.bgBlur || 0) + '"></label>' : '') +
      '<p class="note">Tip: a darker, slightly blurred picture keeps the text easy to read.</p></div>';
  } else if (tab === 'share') {
    var url = new URL(cardLink(), location.href).href, url2 = new URL('index.html?u=' + username, location.href).href;
    h += '<div class="card"><h4>Permanent card link (use this for NFC)</h4><input id="shareUrl" readonly value="' + esc(url) + '">' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="mini" data-act="copy">Copy link</button><a class="mini" href="' + esc(url) + '" target="_blank" rel="noopener">Open card</a></div>' +
      '<p class="note">This link never changes, even if the User ID changes. Anyone with it can view your card. Only you, logged in, can edit it.</p>' +
      '<p class="note">Name link (changes if the User ID changes): ' + esc(url2) + '</p></div>' +
      '<div class="card"><h4>Backup</h4><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="mini" data-act="export">Download backup (.json)</button>' +
      '<label class="mini upl">Restore backup<input type="file" accept="application/json" id="upImp"></label></div>' +
      '<p class="note">Backups contain your text and design, not photos.</p></div>';
  } else if (tab === 'mod') {
    h += '<div class="card"><h4>Create account</h4>' +
      '<label class="f"><span>Customer email</span><input id="mEmail" type="email" autocapitalize="none" autocomplete="off" placeholder="customer@example.com"></label>' +
      '<label class="f"><span>Temporary password (min. 8)</span><input id="mPw" type="text" autocapitalize="none" autocomplete="off" placeholder="They can change it later"></label>' +
      '<div class="row2"><label class="f"><span>User ID</span><input id="mId" autocapitalize="none" autocomplete="off" placeholder="e.g. juan"></label>' +
      '<label class="f"><span>Full name (optional)</span><input id="mName" autocomplete="off"></label></div>' +
      '<button class="mini" data-act="mkacct">Create account</button><div class="err" id="msgMod"></div></div>' +
      '<div class="h">All cards</div><div id="modList"><p class="note">Loading...</p></div>';
  } else if (tab === 'account') {
    h += '<div class="card"><h4>Display name</h4>' + field('Full name shown on your card', 'name') + '</div>' +
      '<div class="card"><h4>User ID (card link)</h4>' +
      '<label class="f"><span>User ID</span><input id="acId" autocapitalize="none" autocomplete="off" value="' + esc(username) + '"></label>' +
      '<p class="note">3-24 letters, numbers, - or _. The link with your User ID will change. Your permanent link (used for NFC) does not change.</p>' +
      '<button class="mini" data-act="chid">Change User ID</button><div class="err" id="msgId"></div></div>' +
      '<div class="card"><h4>Login email</h4>' +
      '<p class="note">Current: <b>' + esc(Store.userEmail()) + '</b></p>' +
      '<label class="f"><span>New email</span><input id="acEmail" type="email" autocapitalize="none" autocomplete="email" placeholder="new@example.com"></label>' +
      '<p class="note">We email a confirmation link. The change applies after you open it.</p>' +
      '<button class="mini" data-act="chmail">Change email</button><div class="err" id="msgMail"></div></div>' +
      '<div class="card"><h4>Password</h4>' +
      '<label class="f"><span>Current password</span><input id="acPw0" type="password" autocomplete="current-password"></label>' +
      '<label class="f"><span>New password</span><input id="acPw1" type="password" autocomplete="new-password" placeholder="min. 6 characters"></label>' +
      '<label class="f"><span>Repeat new password</span><input id="acPw2" type="password" autocomplete="new-password"></label>' +
      '<button class="mini" data-act="chpw">Change password</button><div class="err" id="msgPw"></div></div>';
  }
  $('#tabBody').innerHTML = h;
  bindUploads();
  if (tab === 'mod') loadModList();
}

/* ---------- input handling ---------- */
$('#tabBody').addEventListener('input', function (e) {
  var el = e.target, p = el.dataset.path; if (!p) return;
  var v = el.type === 'checkbox' ? el.checked : el.value;
  if (el.dataset.list) v = v.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  if (el.dataset.num) { v = +v; el.closest('label').firstChild.textContent = el.dataset.label.replace('{v}', v); }
  setPath(card, p, v);
  var wm = /^wallets\.(\d+)\.type$/.exec(p);
  if (wm) {
    var w = card.wallets[+wm[1]], known = Object.keys(WALLET_TYPES).map(function (k) { return WALLET_TYPES[k]; });
    if (!w.label || known.indexOf(w.label) >= 0) w.label = WALLET_TYPES[v];
    queueSave(); renderTab(); return;
  }
  if (p.indexOf('design.') === 0) Store.applyDesign(card.design);
  queueSave();
});

$('#tabBody').addEventListener('click', async function (e) {
  var b = e.target.closest('[data-act]'); if (!b) return;
  var act = b.dataset.act, i = +b.dataset.i, L = b.dataset.list;
  if (act === 'add') {
    var tpl = { links: { type: 'website', label: 'New link', sub: '', url: '' }, experience: { title: '', desc: '', when: '' }, education: { title: '', desc: '', when: '' }, wallets: { type: 'gcash', label: 'GCash', name: '', number: '', qrId: '' } };
    card[L] = card[L] || []; card[L].push(tpl[L]); queueSave(); renderTab();
  } else if (act === 'del') {
    var gone = card[L].splice(i, 1)[0]; queueSave(); renderTab();
    if (L === 'wallets' && gone && gone.qrId) Store.deletePhoto(username, gone.qrId);
  }
  else if (act === 'rmqr') { var wq = card.wallets[i], oq = wq.qrId; wq.qrId = ''; queueSave(); renderTab(); if (oq) await Store.deletePhoto(username, oq); }
  else if (act === 'theme') { card.design.theme = b.dataset.k; Store.applyDesign(card.design); queueSave(); renderTab(); }
  else if (act === 'rmav') { var old = card.avatarId; card.avatarId = ''; queueSave(); renderTab(); await Store.deletePhoto(username, old); }
  else if (act === 'rmg') { var gid = card.galleryIds.splice(i, 1)[0]; queueSave(); renderTab(); await Store.deletePhoto(username, gid); }
  else if (act === 'bgcolor') { card.design.bgColor = ''; Store.applyDesign(card.design); queueSave(); renderTab(); }
  else if (act === 'rmbg') { var ob = card.bgId; card.bgId = ''; queueSave(); renderTab(); await Store.deletePhoto(username, ob); }
  else if (act === 'mkacct') { await makeAccount(b); }
  else if (act === 'copyc') {
    var cu = new URL('index.html?c=' + b.dataset.pid, location.href).href;
    (navigator.clipboard ? navigator.clipboard.writeText(cu) : Promise.resolve()).then(function () { b.textContent = 'Copied!'; });
  }
  else if (act === 'chid') { await changeId(b); }
  else if (act === 'chmail') { await changeMail(b); }
  else if (act === 'chpw') { await changePw(b); }
  else if (act === 'copy') {
    var inp = $('#shareUrl'); inp.select();
    (navigator.clipboard ? navigator.clipboard.writeText(inp.value) : Promise.resolve(document.execCommand('copy'))).then(function () { b.textContent = 'Copied!'; });
  } else if (act === 'export') {
    var copy = JSON.parse(JSON.stringify(card)); delete copy.photos; delete copy.ownerUid; delete copy.id; delete copy.publicId; delete copy.avatarId; delete copy.bgId; delete copy.galleryIds;
    copy.wallets = (copy.wallets || []).map(function (w) { return Object.assign({}, w, { qrId: '' }); });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(copy, null, 2)], { type: 'application/json' }));
    a.download = username + '-card-backup.json'; document.body.appendChild(a); a.click(); a.remove();
  }
});

/* ---------- account settings ---------- */
function msg(id, text, ok) { var m = $(id); if (!m) return; m.textContent = text; m.style.color = ok ? '#9be7b0' : ''; }

async function changeId(btn) {
  var name = Store.cleanId($('#acId').value);
  if (name === username) return msg('#msgId', 'That is already your User ID.');
  if (!confirm('Change your card link to index.html?u=' + name + ' ?\nThe permanent NFC link keeps working.')) return;
  btn.disabled = true; msg('#msgId', 'Saving...', true);
  clearTimeout(timer); await saving;
  var s = await Store.saveCard(card); // flush pending edits under the old ID first
  if (!s.ok) { btn.disabled = false; return msg('#msgId', s.error); }
  var r = await Store.changeUserId(name);
  btn.disabled = false;
  if (!r.ok) return msg('#msgId', r.error);
  username = r.id; card.id = r.id;
  $('#who').textContent = '@' + username;
  $('#viewLive').href = cardLink();
  $('#frame').src = 'index.html?u=' + username + '&preview=1';
  renderTab();
  msg('#msgId', 'User ID changed to @' + username, true);
}

async function changeMail(btn) {
  btn.disabled = true; msg('#msgMail', 'Sending...', true);
  var r = await Store.changeEmail($('#acEmail').value);
  btn.disabled = false;
  msg('#msgMail', r.ok ? 'Check your inbox (old and new address) and open the confirmation link.' : r.error, r.ok);
}

async function changePw(btn) {
  var a = $('#acPw0').value, b1 = $('#acPw1').value, b2 = $('#acPw2').value;
  if (b1 !== b2) return msg('#msgPw', 'The new passwords do not match.');
  btn.disabled = true; msg('#msgPw', 'Saving...', true);
  var r = await Store.changePassword(a, b1);
  btn.disabled = false;
  if (r.ok) { $('#acPw0').value = $('#acPw1').value = $('#acPw2').value = ''; }
  msg('#msgPw', r.ok ? 'Password updated.' : r.error, r.ok);
}

/* ---------- moderator tools ---------- */
async function makeAccount(btn) {
  btn.disabled = true; msg('#msgMod', 'Creating...', true);
  var r = await Store.createAccount({ email: $('#mEmail').value, password: $('#mPw').value, username: $('#mId').value, name: $('#mName').value });
  btn.disabled = false;
  if (!r.ok) return msg('#msgMod', r.error);
  ['#mEmail', '#mPw', '#mId', '#mName'].forEach(function (x) { $(x).value = ''; });
  msg('#msgMod', 'Account created: @' + r.username + '. Copy the NFC link below.', true);
  loadModList();
}
async function loadModList() {
  var box = $('#modList'); if (!box) return;
  try {
    var rows = await Store.listCards();
    box.innerHTML = rows.map(function (r) {
      return '<div class="card"><h4>@' + esc(r.username) + '</h4><div style="display:flex;gap:8px;flex-wrap:wrap">' +
        '<button class="mini" data-act="copyc" data-pid="' + esc(r.public_id) + '">Copy NFC link</button>' +
        '<a class="mini" target="_blank" rel="noopener" href="index.html?c=' + esc(r.public_id) + '">Open</a></div></div>';
    }).join('') || '<p class="note">No cards yet.</p>';
  } catch (e) { box.innerHTML = '<p class="note">Could not load the list.</p>'; }
}

function setSaved(msg, err) { var s = $('#saved'); s.textContent = msg; s.classList.toggle('err', !!err); }

function bindUploads() {
  var av = $('#upAv'), gal = $('#upGal'), imp = $('#upImp'), bgu = $('#upBg');
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
  document.querySelectorAll('[data-qr]').forEach(function (inp) {
    inp.onchange = async function () {
      var f = this.files[0], i = +this.dataset.qr; if (!f) return;
      try {
        setSaved('Uploading QR code...');
        var data = await Store.fileToDataURL(f, 900, 0.95);
        var id = await Store.addPhoto(username, data);
        var w = card.wallets[i], old = w.qrId;
        card.photos[id] = data; w.qrId = id;
        queueSave(); renderTab();
        if (old) Store.deletePhoto(username, old);
      } catch (e) { setSaved('Could not upload that QR code.', true); }
    };
  });
  if (bgu) bgu.onchange = async function () {
    var f = this.files[0]; if (!f) return;
    try {
      setSaved('Uploading background...');
      var data = await Store.fileToDataURL(f, 1200);
      var id = await Store.addPhoto(username, data);
      var old = card.bgId;
      card.photos[id] = data; card.bgId = id;
      queueSave(); renderTab();
      if (old) Store.deletePhoto(username, old);
    } catch (e) { setSaved('Could not upload that picture.', true); }
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
        ['name', 'role', 'bio', 'location', 'chips', 'phone', 'showPhone', 'email', 'experience', 'education', 'skills', 'links', 'wallets', 'design'].forEach(function (k) { if (k in c) card[k] = c[k]; });
        Store.applyDesign(card.design); queueSave(); renderTab();
      } catch (e) { alert('That file is not a valid backup.'); }
    };
    r.readAsText(f);
  };
}

/* ---------- boot ---------- */
if (!Store.configured) show('setup');
else Store.onAuth(function (user) {
  if (!user) { card = null; show('auth'); return; }
  boot();
});
