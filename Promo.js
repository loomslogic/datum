/* DATUM promo: plays the 4-scene commercial inside #pv when it scrolls into view. No libraries. */
(function () {
  var pv = document.getElementById('pv'); if (!pv) return;
  var DUR = [3600, 4400, 4600, 4400];           // ms per scene
  var TOTAL = DUR.reduce(function (a, b) { return a + b; }, 0);
  var cut = pv.querySelector('.pv-cut'), bar = pv.querySelector('.pv-bar i');
  var steps = document.querySelectorAll('.promo-copy li');
  var timer = null, scene = 0, visible = false, playing = false;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // floating dust
  var dust = document.getElementById('pvDust');
  for (var i = 0; i < 26; i++) {
    var d = document.createElement('i'), s = 0.5 + Math.random() * 1.3;
    d.style.cssText = 'left:' + (Math.random() * 100) + '%;width:' + s + 'cqw;height:' + s + 'cqw;' +
      '--dx:' + ((Math.random() * 14) - 7) + 'cqw;animation-duration:' + (7 + Math.random() * 9) + 's;animation-delay:-' + (Math.random() * 12) + 's';
    dust.appendChild(d);
  }

  function setScene(n) {
    scene = n;
    pv.setAttribute('data-scene', String(n));
    for (var k = 0; k < steps.length; k++) steps[k].classList.toggle('on', k + 1 === n);
    if (cut) { cut.classList.remove('go'); void cut.offsetWidth; cut.classList.add('go'); }
  }
  function next() {
    var n = scene >= 4 ? 1 : scene + 1;
    setScene(n);
    if (n === 1 && bar) { bar.classList.remove('run'); void bar.offsetWidth; bar.classList.add('run'); }
    timer = setTimeout(next, DUR[n - 1]);
  }
  function play() {
    clearTimeout(timer); playing = true; scene = 0;
    pv.style.setProperty('--tot', (TOTAL / 1000) + 's');
    next();
  }
  function stop() { clearTimeout(timer); playing = false; }

  if (reduce) { setScene(4); return; }          // reduced motion: show the finale only

  var rp = pv.querySelector('.pv-replay');
  if (rp) rp.addEventListener('click', play);

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      visible = es[0].isIntersecting;
      if (visible && !playing) play(); else if (!visible && playing) stop();
    }, { threshold: 0.35 }).observe(pv);
  } else { play(); }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(); else if (visible && !playing) play();
  });
})();