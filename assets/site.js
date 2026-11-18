/* samis-ellsaesser.de – Name aus Rasterpunkten
   Der Schriftzug wird als Halbton-Raster abgetastet. Beim Laden fliegen die Punkte ein
   (Daten werden Druck), links feiner, rechts voller. Die Punkte des „ä“ tragen die Akzentfarbe.
   Der Zeiger schiebt die Punkte sanft beiseite. Ohne JS oder Canvas bleibt der normale Text stehen. */
(function () {
  'use strict';

  var host = document.querySelector('[data-raster]');
  if (!host) return;
  var canvas = host.querySelector('.name__canvas');
  var ctx = canvas && canvas.getContext && canvas.getContext('2d');
  if (!ctx) return;

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  var dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
  var dots = [];
  var W = 0, H = 0, dpr = 1, step = 6;
  var t0 = 0, introMs = 0, raf = 0;
  var ptr = { x: -1e4, y: -1e4, on: false };
  var colors = { ink: '#121316', accent: '#ff5a1f' };

  var easeOutCubic = function (x) { return 1 - Math.pow(1 - x, 3); };
  var easeOutBack = function (x) { var c = 1.6; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  var clamp01 = function (x) { return x < 0 ? 0 : x > 1 ? 1 : x; };

  function readColors() {
    var cs = getComputedStyle(document.documentElement);
    colors.ink = cs.getPropertyValue('--ink').trim() || colors.ink;
    colors.accent = cs.getPropertyValue('--accent').trim() || colors.accent;
  }

  /* Jedes Zeichen genau dort zeichnen, wo der Browser es gesetzt hat (inkl. Laufweite). */
  function eachChar(cb) {
    var lines = host.querySelectorAll('.name__line');
    var range = document.createRange();
    for (var i = 0; i < lines.length; i++) {
      var node = lines[i].firstChild;
      if (!node || node.nodeType !== 3) continue;
      var txt = node.textContent;
      for (var j = 0; j < txt.length; j++) {
        range.setStart(node, j); range.setEnd(node, j + 1);
        var r = range.getBoundingClientRect();
        if (r.width) cb(txt[j], r);
      }
    }
  }

  function build(animate) {
    var box = canvas.getBoundingClientRect();
    W = Math.round(box.width); H = Math.round(box.height);
    if (!W || !H) return false;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);

    var cs = getComputedStyle(host);
    var size = parseFloat(cs.fontSize);
    var font = cs.fontWeight + ' ' + size + 'px ' + cs.fontFamily;
    step = Math.max(3.2, Math.min(8, size / 28));

    // Schrift und Umlaut-Punkte getrennt abtasten
    var off = document.createElement('canvas'); off.width = W; off.height = H;
    var acc = document.createElement('canvas'); acc.width = W; acc.height = H;
    var o = off.getContext('2d'), a = acc.getContext('2d');
    [o, a].forEach(function (c) { c.font = font; c.textBaseline = 'alphabetic'; c.fillStyle = '#000'; });
    var asc = o.measureText('Hg').fontBoundingBoxAscent;
    if (!asc) asc = size * 0.95;

    eachChar(function (ch, r) {
      var x = r.left - box.left, y = r.top - box.top + asc + (r.height - (asc + (o.measureText('Hg').fontBoundingBoxDescent || size * 0.25))) / 2;
      o.fillText(ch, x, y);
      if (ch === 'ä') {
        a.globalCompositeOperation = 'source-over'; a.fillText('ä', x, y);
        a.globalCompositeOperation = 'destination-out'; a.fillText('a', x, y);
      }
    });

    var D = o.getImageData(0, 0, W, H).data, A = a.getImageData(0, 0, W, H).data;
    var cover = function (buf, cx, cy) {
      var s = 0, n = 0, q = step * 0.34;
      for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
        var px = Math.round(cx + dx * q), py = Math.round(cy + dy * q);
        if (px < 0 || py < 0 || px >= W || py >= H) { n++; continue; }
        s += buf[(py * W + px) * 4 + 3]; n++;
      }
      return s / (n * 255);
    };

    dots = [];
    var rowH = step * 0.866, row = 0;
    for (var y = step / 2; y < H; y += rowH, row++) {
      for (var x = (row % 2 ? step : step / 2); x < W; x += step) {
        var c = cover(D, x, y);
        if (c < 0.08) continue;
        var u = x / W;
        var grad = 0.64 + 0.36 * Math.pow(u, 1.1);           // links Raster, rechts fast voll
        var r = step * 0.56 * Math.sqrt(c) * grad;
        var ang = Math.random() * Math.PI * 2, dist = step * (6 + Math.random() * 26);
        dots.push({
          x: x, y: y, r: r,
          sx: x + Math.cos(ang) * dist, sy: y + Math.sin(ang) * dist * 0.6,
          delay: u * 650 + Math.random() * 260,
          ox: 0, oy: 0,
          acc: cover(A, x, y) > 0.35
        });
      }
    }
    introMs = animate ? 1600 : 0;
    t0 = performance.now();
    return true;
  }

  function draw(now) {
    raf = 0;
    var t = now - t0, moving = t < introMs;
    var R = step * 10, push = step * 2.2;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    var ink = new Path2D(), acc = new Path2D();
    for (var i = 0; i < dots.length; i++) {
      var d = dots[i];
      // Zeiger: Punkte weichen aus und federn zurück
      var tx = 0, ty = 0;
      if (ptr.on) {
        var dx = d.x - ptr.x, dy = d.y - ptr.y, dd = Math.sqrt(dx * dx + dy * dy);
        if (dd < R && dd > 0.01) { var f = Math.pow(1 - dd / R, 2) * push; tx = dx / dd * f; ty = dy / dd * f; }
      }
      d.ox += (tx - d.ox) * 0.16; d.oy += (ty - d.oy) * 0.16;
      if (Math.abs(d.ox - tx) > 0.05 || Math.abs(d.oy - ty) > 0.05) moving = true;

      var p = introMs ? clamp01((t - d.delay) / 900) : 1;
      if (p <= 0) continue;
      var e = easeOutCubic(p);
      var x = d.sx + (d.x - d.sx) * e + d.ox;
      var y = d.sy + (d.y - d.sy) * e + d.oy;
      var r = d.r * Math.max(0, p < 1 ? easeOutBack(p) : 1);
      var path = d.acc ? acc : ink;
      path.moveTo(x + r, y); path.arc(x, y, r, 0, Math.PI * 2);
    }
    ctx.fillStyle = colors.ink; ctx.fill(ink);
    ctx.fillStyle = colors.accent; ctx.fill(acc);
    if (moving) kick();
  }

  function kick() { if (!raf) raf = requestAnimationFrame(draw); }

  function start() {
    readColors();
    var animate = !(reduce && reduce.matches) && (window.scrollY || 0) < 200;
    // Canvas erst einblenden, damit es eine Größe hat; klappt das Abtasten nicht, bleibt der Text
    document.documentElement.classList.add('is-raster');
    if (!build(animate) || !dots.length) { document.documentElement.classList.remove('is-raster'); return; }
    kick();
  }

  // Erst mit geladener Webfont abtasten, sonst stünde der Name in der Ersatzschrift
  var fontReady = document.fonts && document.fonts.load
    ? document.fonts.load('800 100px "Plus Jakarta Sans"', 'samis ellsässer').then(function () { return document.fonts.ready; })
    : Promise.resolve();
  Promise.race([fontReady, new Promise(function (r) { setTimeout(r, 1500); })]).then(start, start);

  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () { if (build(false)) kick(); }, 150);
  });
  if (dark && dark.addEventListener) dark.addEventListener('change', function () { readColors(); kick(); });

  window.addEventListener('pointermove', function (e) {
    if (reduce && reduce.matches) return;
    var b = canvas.getBoundingClientRect();
    ptr.x = e.clientX - b.left; ptr.y = e.clientY - b.top;
    ptr.on = ptr.x > -100 && ptr.y > -100 && ptr.x < b.width + 100 && ptr.y < b.height + 100;
    kick();
  }, { passive: true });
  document.addEventListener('pointerleave', function () { ptr.on = false; kick(); });
  window.addEventListener('pointerup', function (e) { if (e.pointerType !== 'mouse') { ptr.on = false; kick(); } });
})();
