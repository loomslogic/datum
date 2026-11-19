/* Tiny QR code generator (byte mode, error correction level H) + logo drawing. No libraries needed. */
var GEXP = [], GLOG = [];
(function () { var x = 1; for (var i = 0; i < 255; i++) { GEXP[i] = x; GLOG[x] = i; x <<= 1; if (x & 256) x ^= 0x11d; } for (i = 255; i < 512; i++) GEXP[i] = GEXP[i - 255]; })();
function gmul(a, b) { return a && b ? GEXP[GLOG[a] + GLOG[b]] : 0; }
function rsGen(n) { var g = [1]; for (var i = 0; i < n; i++) { var ng = new Array(g.length + 1).fill(0); for (var j = 0; j < g.length; j++) { ng[j] ^= g[j]; ng[j + 1] ^= gmul(g[j], GEXP[i]); } g = ng; } return g; }
function rsEc(data, n) { var g = rsGen(n), r = new Array(n).fill(0); data.forEach(function (d) { var f = d ^ r.shift(); r.push(0); if (f) for (var i = 0; i < n; i++) r[i] ^= gmul(g[i + 1], f); }); return r; }

// Level H: [ec codewords per block, blocks in group 1, data cw in group 1, blocks in group 2, data cw in group 2], versions 1..14
var HT = [null, [17, 1, 9, 0, 0], [28, 1, 16, 0, 0], [22, 2, 13, 0, 0], [16, 4, 9, 0, 0], [22, 2, 11, 2, 12], [28, 4, 15, 0, 0], [26, 4, 13, 1, 14], [26, 4, 14, 2, 15],
  [24, 4, 12, 4, 13], [28, 6, 15, 2, 16], [24, 3, 12, 8, 13], [28, 7, 14, 4, 15], [22, 12, 11, 4, 12], [24, 11, 12, 5, 13]];
var ALIGN = [null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50], [6, 30, 54], [6, 32, 58], [6, 34, 62], [6, 26, 46, 66]];

function utf8(s) { return Array.prototype.slice.call(new TextEncoder().encode(s)); }
function dataCw(v) { var t = HT[v]; return t[1] * t[2] + t[3] * t[4]; }

function qrMatrix(text) {
  var bytes = utf8(text), v = 1;
  while (v <= 14 && (dataCw(v) * 8 < 4 + (v < 10 ? 8 : 16) + bytes.length * 8)) v++;
  if (v > 14) throw new Error('Text too long for QR');
  var bits = [];
  function put(val, len) { for (var i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); }
  put(4, 4); put(bytes.length, v < 10 ? 8 : 16); bytes.forEach(function (b) { put(b, 8); });
  var cap = dataCw(v) * 8;
  for (var i = 0; i < 4 && bits.length < cap; i++) bits.push(0);
  while (bits.length % 8) bits.push(0);
  for (var pad = 0xEC; bits.length < cap; pad ^= 0xEC ^ 0x11) put(pad, 8);
  var cw = []; for (i = 0; i < bits.length; i += 8) { var b = 0; for (var k = 0; k < 8; k++) b = (b << 1) | bits[i + k]; cw.push(b); }

  // split into blocks, add error correction, interleave
  var t = HT[v], blocks = [], pos = 0;
  for (i = 0; i < t[1] + t[3]; i++) { var n = i < t[1] ? t[2] : t[4]; var d = cw.slice(pos, pos + n); pos += n; blocks.push({ d: d, e: rsEc(d, t[0]) }); }
  var out = [], maxd = Math.max(t[2], t[4]);
  for (i = 0; i < maxd; i++) blocks.forEach(function (bl) { if (i < bl.d.length) out.push(bl.d[i]); });
  for (i = 0; i < t[0]; i++) blocks.forEach(function (bl) { out.push(bl.e[i]); });
  var stream = []; out.forEach(function (b) { put2(b); }); function put2(b) { for (var j = 7; j >= 0; j--) stream.push((b >> j) & 1); }

  var N = 17 + v * 4, M = [], F = [];
  for (i = 0; i < N; i++) { M.push(new Array(N).fill(false)); F.push(new Array(N).fill(false)); }
  function set(r, c, val) { if (r >= 0 && r < N && c >= 0 && c < N) { M[r][c] = !!val; F[r][c] = true; } }
  function finder(r, c) { for (var dy = -1; dy <= 7; dy++) for (var dx = -1; dx <= 7; dx++) { var inb = dy >= 0 && dy <= 6 && dx >= 0 && dx <= 6; var dark = inb && (dy === 0 || dy === 6 || dx === 0 || dx === 6 || (dy >= 2 && dy <= 4 && dx >= 2 && dx <= 4)); set(r + dy, c + dx, dark); } }
  finder(0, 0); finder(0, N - 7); finder(N - 7, 0);
  for (i = 8; i < N - 8; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
  var al = ALIGN[v];
  al.forEach(function (r) { al.forEach(function (c) {
    if ((r === 6 && c === 6) || (r === 6 && c === al[al.length - 1]) || (c === 6 && r === al[al.length - 1])) return;
    for (var dy = -2; dy <= 2; dy++) for (var dx = -2; dx <= 2; dx++) set(r + dy, c + dx, Math.max(Math.abs(dy), Math.abs(dx)) !== 1);
  }); });
  set(N - 8, 8, true); // dark module
  // reserve format + version areas
  for (i = 0; i < 9; i++) { F[8][i] = true; F[i][8] = true; }
  for (i = 0; i < 8; i++) { F[8][N - 1 - i] = true; F[N - 1 - i][8] = true; }
  if (v >= 7) for (i = 0; i < 6; i++) for (var j = 0; j < 3; j++) { F[i][N - 11 + j] = true; F[N - 11 + j][i] = true; }

  // place data bits (zigzag)
  var bi = 0, up = true;
  for (var col = N - 1; col > 0; col -= 2) {
    if (col === 6) col--;
    for (var n2 = 0; n2 < N; n2++) { var r2 = up ? N - 1 - n2 : n2;
      for (var cc = 0; cc < 2; cc++) { var c2 = col - cc; if (!F[r2][c2]) { M[r2][c2] = bi < stream.length ? stream[bi] === 1 : false; bi++; } } }
    up = !up;
  }

  function bch(val, poly, bitsLen, shift) { var x = val << shift; var pl = poly.toString(2).length; for (var q = x.toString(2).length; q >= pl; q--) if ((x >> (q - 1)) & 1) x ^= poly << (q - pl); return x; }
  function maskFn(m, r, c) { return [(r + c) % 2 === 0, r % 2 === 0, c % 3 === 0, (r + c) % 3 === 0, (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0, (r * c) % 2 + (r * c) % 3 === 0, ((r * c) % 2 + (r * c) % 3) % 2 === 0, ((r + c) % 2 + (r * c) % 3) % 2 === 0][m]; }
  function build(m) {
    var G = M.map(function (row, r) { return row.map(function (val, c) { return !F[r][c] && maskFn(m, r, c) ? !val : val; }); });
    var fmt = ((2 << 3) | m); fmt = ((fmt << 10) | bch(fmt, 0x537, 15, 10)) ^ 0x5412; // level H = 10
    function g(r, c, val) { G[r][c] = !!val; }
    for (var q = 0; q <= 5; q++) g(q, 8, (fmt >> q) & 1);
    g(7, 8, (fmt >> 6) & 1); g(8, 8, (fmt >> 7) & 1); g(8, 7, (fmt >> 8) & 1);
    for (q = 9; q < 15; q++) g(8, 14 - q, (fmt >> q) & 1);
    for (q = 0; q < 8; q++) g(8, N - 1 - q, (fmt >> q) & 1);
    for (q = 8; q < 15; q++) g(N - 15 + q, 8, (fmt >> q) & 1);
    g(N - 8, 8, true);
    if (v >= 7) { var vi = (v << 12) | bch(v, 0x1F25, 18, 12); for (q = 0; q < 18; q++) { var bit = (vi >> q) & 1, a = Math.floor(q / 3), b2 = q % 3 + N - 11; g(a, b2, bit); g(b2, a, bit); } }
    return G;
  }
  function penalty(G) {
    var p = 0, r, c, run, k;
    for (var pass = 0; pass < 2; pass++) for (r = 0; r < N; r++) { run = 1; for (c = 1; c < N; c++) { var a = pass ? G[c][r] : G[r][c], b = pass ? G[c - 1][r] : G[r][c - 1]; if (a === b) { run++; if (run === 5) p += 3; else if (run > 5) p++; } else run = 1; } }
    for (r = 0; r < N - 1; r++) for (c = 0; c < N - 1; c++) if (G[r][c] === G[r][c + 1] && G[r][c] === G[r + 1][c] && G[r][c] === G[r + 1][c + 1]) p += 3;
    var pat = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0], pat2 = pat.slice().reverse();
    for (pass = 0; pass < 2; pass++) for (r = 0; r < N; r++) for (c = 0; c <= N - 11; c++) { var m1 = true, m2 = true; for (k = 0; k < 11; k++) { var x = pass ? G[c + k][r] : G[r][c + k] ? 1 : 0; x = pass ? (G[c + k][r] ? 1 : 0) : (G[r][c + k] ? 1 : 0); if (x !== pat[k]) m1 = false; if (x !== pat2[k]) m2 = false; } if (m1) p += 40; if (m2) p += 40; }
    var dark = 0; G.forEach(function (row) { row.forEach(function (x) { if (x) dark++; }); });
    p += Math.floor(Math.abs(dark * 20 - N * N * 10) / (N * N)) * 10;
    return p;
  }
  var best = null, bp = 1e9;
  for (var m = 0; m < 8; m++) { var G = build(m), pp = penalty(G); if (pp < bp) { bp = pp; best = G; } }
  return best;
}

/* Draw the QR (with the logo in the middle) on a canvas. Returns a promise that resolves with the canvas. */
export function drawQR(canvas, text, opts) {
  opts = opts || {};
  var size = opts.size || 1024, dark = opts.dark || '#0b0b0d', light = opts.light || '#ffffff', logoSrc = opts.logo === undefined ? 'favicon.png' : opts.logo;
  var G = qrMatrix(text), N = G.length, quiet = 4, unit = Math.floor(size / (N + quiet * 2)), total = unit * (N + quiet * 2);
  canvas.width = canvas.height = total;
  var x = canvas.getContext('2d');
  x.fillStyle = light; x.fillRect(0, 0, total, total);
  x.fillStyle = dark;
  var logoSide = Math.round(N * 0.22), lo = Math.floor((N - logoSide) / 2) - 1, hi = lo + logoSide + 2; // clear area (modules) around the logo
  for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
    if (logoSrc && r >= lo && r < hi && c >= lo && c < hi) continue;
    if (G[r][c]) x.fillRect((c + quiet) * unit, (r + quiet) * unit, unit, unit);
  }
  if (!logoSrc) return Promise.resolve(canvas);
  return new Promise(function (res) {
    var img = new Image();
    img.onload = function () {
      var s = (hi - lo) * unit, px = (lo + quiet) * unit, pad = Math.round(unit * 0.5);
      x.fillStyle = light; x.fillRect(px, px, s, s);
      x.drawImage(img, px + pad, px + pad, s - pad * 2, s - pad * 2);
      res(canvas);
    };
    img.onerror = function () { res(canvas); };
    img.src = logoSrc;
  });
}
export { qrMatrix };
