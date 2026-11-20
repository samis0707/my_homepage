/* samis-ellsaesser.de
   1 Raster: der Name aus Halbton-Punkten (Canvas 2D). Links feiner, rechts voller, die Punkte im „ä“ in Blau.
     Der Zeiger schiebt die Punkte sanft beiseite.
   2 Auftakt: ein Mauszeiger fliegt herein und klickt auf den Namen. Aus dem Klickpunkt schießen die Punkte
     in ihr Raster, danach blendet die Seite gestaffelt ein.
   3 Adresse kopieren.
   Ohne JS, ohne Canvas, bei „Bewegung reduzieren“ oder Hash in der Adresse steht die Seite sofort vollständig. */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  var easeOutCubic = function (x) { return 1 - Math.pow(1 - x, 3); };
  var easeInOutCubic = function (x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  var easeOutBack = function (x) { var c = 1.7; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  var clamp01 = function (x) { return x < 0 ? 0 : x > 1 ? 1 : x; };
  var ls = function (k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } };

  /* ------------------------------------------------------------------ 1 Raster */
  var raster = (function () {
    var host = document.querySelector('[data-raster]');
    var canvas = host && host.querySelector('.name__canvas');
    var ctx = canvas && canvas.getContext && canvas.getContext('2d');
    var api = { ok: false };
    if (!ctx) return api;

    var dots = [], W = 0, H = 0, dpr = 1, step = 6;
    var mode = 'still';            // still | wait | burst
    var t0 = 0, raf = 0, endAt = 0;
    var ptr = { x: -1e4, y: -1e4, on: false };
    var colors = { ink: '#0b1f3a', accent: '#0a5a9c' };

    function readColors() {
      var cs = getComputedStyle(root);
      colors.ink = cs.getPropertyValue('--ink').trim() || colors.ink;
      colors.accent = cs.getPropertyValue('--accent').trim() || colors.accent;
    }

    /* Jedes Zeichen genau dort zeichnen, wo der Browser es gesetzt hat (inkl. Laufweite) */
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
          if (r.width) cb(txt[j], r, i);
        }
      }
    }

    function build() {
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
      var m = o.measureText('Hg');
      var asc = m.fontBoundingBoxAscent || size * 0.95, desc = m.fontBoundingBoxDescent || size * 0.25;

      api.lines = [];
      eachChar(function (ch, r, li) {
        var x = r.left - box.left, y = r.top - box.top + asc + (r.height - asc - desc) / 2;
        o.fillText(ch, x, y);
        if (ch === 'ä') {
          a.globalCompositeOperation = 'source-over'; a.fillText('ä', x, y);
          a.globalCompositeOperation = 'destination-out'; a.fillText('a', x, y);
        }
        var L = api.lines[li] || (api.lines[li] = { l: 1e9, r: -1e9, t: r.top, b: r.bottom });
        L.l = Math.min(L.l, r.left); L.r = Math.max(L.r, r.right);
      });

      var D = o.getImageData(0, 0, W, H).data, A = a.getImageData(0, 0, W, H).data;
      var cover = function (buf, cx, cy) {
        var s = 0, n = 0, q = step * 0.34;
        for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
          var px = Math.round(cx + dx * q), py = Math.round(cy + dy * q);
          n++;
          if (px < 0 || py < 0 || px >= W || py >= H) continue;
          s += buf[(py * W + px) * 4 + 3];
        }
        return s / (n * 255);
      };

      dots = [];
      var rowH = step * 0.866, row = 0;
      for (var y = step / 2; y < H; y += rowH, row++) {
        for (var x = (row % 2 ? step : step / 2); x < W; x += step) {
          var c = cover(D, x, y);
          if (c < 0.08) continue;
          var grad = 0.64 + 0.36 * Math.pow(x / W, 1.1);   // links Raster, rechts fast voll
          dots.push({ x: x, y: y, r: step * 0.56 * Math.sqrt(c) * grad, sx: x, sy: y, delay: 0, ox: 0, oy: 0, acc: cover(A, x, y) > 0.35 });
        }
      }
      return dots.length > 0;
    }

    function draw(now) {
      raf = 0;
      var t = now - t0, moving = mode === 'burst' && now < endAt;
      var R = step * 10, push = step * 2.2;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      if (mode === 'wait') return;

      var ink = new Path2D(), acc = new Path2D();
      for (var i = 0; i < dots.length; i++) {
        var d = dots[i], tx = 0, ty = 0;
        if (ptr.on) {
          var dx = d.x - ptr.x, dy = d.y - ptr.y, dd = Math.sqrt(dx * dx + dy * dy);
          if (dd < R && dd > 0.01) { var f = Math.pow(1 - dd / R, 2) * push; tx = dx / dd * f; ty = dy / dd * f; }
        }
        d.ox += (tx - d.ox) * 0.16; d.oy += (ty - d.oy) * 0.16;
        if (Math.abs(d.ox - tx) > 0.05 || Math.abs(d.oy - ty) > 0.05) moving = true;

        var p = mode === 'burst' ? clamp01((t - d.delay) / 760) : 1;
        if (p <= 0) continue;
        var e = easeOutCubic(p);
        var x = d.sx + (d.x - d.sx) * e + d.ox;
        var y = d.sy + (d.y - d.sy) * e + d.oy;
        var r = d.r * (p < 1 ? Math.max(0, easeOutBack(p)) : 1);
        var path = d.acc ? acc : ink;
        path.moveTo(x + r, y); path.arc(x, y, r, 0, Math.PI * 2);
      }
      ctx.fillStyle = colors.ink; ctx.fill(ink);
      ctx.fillStyle = colors.accent; ctx.fill(acc);
      if (moving) kick();
    }
    function kick() { if (!raf) raf = requestAnimationFrame(draw); }

    api.start = function (waiting) {
      readColors();
      root.classList.add('is-raster');          // Canvas einblenden, damit es eine Größe hat
      if (!build()) { root.classList.remove('is-raster'); return false; }
      api.ok = true;
      mode = waiting ? 'wait' : 'still';
      kick();
      return true;
    };
    api.wait = function () { mode = 'wait'; kick(); };
    /* Punkte schießen aus einem Punkt (Viewport-Koordinaten) in ihr Raster */
    api.burst = function (vx, vy) {
      if (!api.ok) return;
      var b = canvas.getBoundingClientRect(), ox = vx - b.left, oy = vy - b.top, far = 1;
      dots.forEach(function (d) { far = Math.max(far, Math.hypot(d.x - ox, d.y - oy)); });
      dots.forEach(function (d) {
        var ang = Math.random() * Math.PI * 2, rr = Math.random() * step * 3;
        d.sx = ox + Math.cos(ang) * rr; d.sy = oy + Math.sin(ang) * rr;
        d.delay = Math.hypot(d.x - ox, d.y - oy) / far * 420 + Math.random() * 140;
      });
      mode = 'burst'; t0 = performance.now(); endAt = t0 + 1400;
      kick();
    };
    api.show = function () { mode = 'still'; kick(); };
    api.rebuild = function () { if (api.ok && build()) kick(); };
    api.pointer = function (cx, cy) {
      var b = canvas.getBoundingClientRect();
      ptr.x = cx - b.left; ptr.y = cy - b.top;
      ptr.on = ptr.x > -100 && ptr.y > -100 && ptr.x < b.width + 100 && ptr.y < b.height + 100;
      kick();
    };
    api.leave = function () { ptr.on = false; kick(); };
    /* Zielpunkt für den Klick: Mitte der ersten Zeile, leicht rechts (über dem „m“) */
    api.target = function () {
      var L = api.lines && api.lines[0];
      if (!L) { var b = host.getBoundingClientRect(); return { x: b.left + b.width * 0.4, y: b.top + b.height * 0.3 }; }
      return { x: L.l + (L.r - L.l) * 0.55, y: L.t + (L.b - L.t) * 0.55 };
    };
    return api;
  })();

  /* ------------------------------------------------------------------ 2 Auftakt */
  var zeiger = document.getElementById('zeiger');
  var ring = document.getElementById('ring');
  var running = false;

  function reveal(stagger) {
    var els = Array.prototype.slice.call(document.querySelectorAll('[data-auf]'));
    els.forEach(function (el, i) { el.style.transitionDelay = (stagger ? i * 90 : 0) + 'ms'; });
    root.classList.remove('auftakt-vor');
    clearTimeout(window.__seNot);
    setTimeout(function () { els.forEach(function (el) { el.style.transitionDelay = ''; }); }, 1200);
  }

  function setZeiger(x, y, op) {
    zeiger.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
    if (op !== undefined) zeiger.style.opacity = op;
  }

  /* Bahn als quadratische Bézierkurve, Tempo wie eine echte Mausbewegung */
  function fly(from, ctrl, to, ms, fade) {
    return new Promise(function (done) {
      var s = performance.now();
      (function step(now) {
        var p = clamp01((now - s) / ms), e = easeInOutCubic(p), u = 1 - e;
        var x = u * u * from.x + 2 * u * e * ctrl.x + e * e * to.x;
        var y = u * u * from.y + 2 * u * e * ctrl.y + e * e * to.y;
        setZeiger(x, y, fade ? 1 - clamp01((p - 0.55) / 0.45) : 1);
        if (p < 1) requestAnimationFrame(step); else done();
      })(s);
    });
  }
  var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

  function klick(pt) {
    zeiger.classList.add('is-klick');
    setTimeout(function () { zeiger.classList.remove('is-klick'); }, 120);
    ring.style.left = pt.x + 'px'; ring.style.top = pt.y + 'px';
    ring.classList.remove('is-an'); void ring.offsetWidth; ring.classList.add('is-an');
    raster.burst(pt.x, pt.y);
    leuchten.kurz();
  }

  function zeigerAuftakt() {
    var vw = window.innerWidth, vh = window.innerHeight;
    var pt = raster.target();
    var from = { x: vw + 60, y: Math.min(vh * 0.92, pt.y + vh * 0.55) };
    var ctrl = { x: pt.x + (vw - pt.x) * 0.55, y: pt.y + vh * 0.32 };
    var away = { x: pt.x + Math.min(240, vw * 0.3), y: pt.y + Math.min(320, vh * 0.42) };
    setZeiger(from.x, from.y, 1);
    return wait(250)
      .then(function () { return fly(from, ctrl, pt, 950); })
      .then(function () { return wait(90); })
      .then(function () { klick(pt); return wait(380); })
      .then(function () { reveal(true); return fly(pt, { x: pt.x + 40, y: pt.y + 160 }, away, 700, true); });
  }

  function auftakt() {
    if (running) return;
    if (!root.classList.contains('auftakt-vor')) { if (raster.ok) raster.show(); return; }
    if (!raster.ok) { reveal(false); return; }
    running = true;
    raster.wait();
    var notbremse = setTimeout(function () { raster.show(); reveal(false); }, 6000);
    zeigerAuftakt().then(function () {
      clearTimeout(notbremse); zeiger.style.opacity = 0; running = false;
    }, function () { clearTimeout(notbremse); raster.show(); reveal(false); running = false; });
  }

  /* Erst mit geladener Webfont abtasten, sonst stünde der Name in der Ersatzschrift */
  var fontReady = document.fonts && document.fonts.load
    ? document.fonts.load('800 100px "Plus Jakarta Sans"', 'samis ellsässer').then(function () { return document.fonts.ready; })
    : Promise.resolve();
  Promise.race([fontReady, wait(1500)]).then(go, go);
  var started = false;
  function go() {
    if (started) return; started = true;
    raster.start(root.classList.contains('auftakt-vor'));
    auftakt();
  }

  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () { if (!running) raster.rebuild(); }, 150);
  });
  window.addEventListener('pointermove', function (e) {
    if (reduce && reduce.matches) return;
    raster.pointer(e.clientX, e.clientY);
  }, { passive: true });
  document.addEventListener('pointerleave', raster.leave);
  window.addEventListener('pointerup', function (e) { if (e.pointerType !== 'mouse') raster.leave(); });




  /* ------------------------------------------------------------------ 4 Rand-Leuchten (mobil)
     Der Bildschirmrand glimmt in Blau: einmal kurz, wenn der Name entsteht,
     und solange man irgendwo lange auf den Bildschirm drückt. Nicht bei „Bewegung reduzieren“. */
  var leuchten = (function () {
    var el = document.getElementById('leuchten');
    var api = { kurz: function () {}, an: false };
    if (!el || (reduce && reduce.matches)) return api;
    var mobil = window.matchMedia && window.matchMedia('(max-width: 720px), (pointer: coarse)').matches;
    api.an = mobil;
    var aus = 0;
    function zeigen(ms) {
      clearTimeout(aus);
      el.classList.add('is-an');
      if (ms) aus = setTimeout(function () { el.classList.remove('is-an'); }, ms);
    }
    api.kurz = function (zwang) { if (api.an || zwang) zeigen(1700); };
    /* Langer Druck: nach 450 ms ohne Bewegung leuchtet der Rand, bis man loslässt */
    var halt = 0, sx = 0, sy = 0, haelt = false;
    window.addEventListener('touchstart', function (e) {
      if (!api.an || e.touches.length !== 1) return;
      sx = e.touches[0].clientX; sy = e.touches[0].clientY;
      halt = setTimeout(function () { haelt = true; zeigen(0); }, 450);
    }, { passive: true });
    window.addEventListener('touchmove', function (e) {
      var t = e.touches[0];
      if (t && Math.hypot(t.clientX - sx, t.clientY - sy) > 10) clearTimeout(halt);
    }, { passive: true });
    var los = function () { clearTimeout(halt); if (haelt) { haelt = false; zeigen(500); } };
    window.addEventListener('touchend', los, { passive: true });
    window.addEventListener('touchcancel', los, { passive: true });
    return api;
  })();

  /* ------------------------------------------------------------------ 3 Kontakt */
  var copy = document.getElementById('mail-copy');
  if (copy) copy.addEventListener('click', function () {
    var txt = document.getElementById('mail').textContent.trim();
    var ok = function () { copy.textContent = 'Kopiert'; setTimeout(function () { copy.textContent = 'Adresse kopieren'; }, 2000); };
    var pick = function () { var r = document.createRange(); r.selectNodeContents(document.getElementById('mail')); var s = getSelection(); s.removeAllRanges(); s.addRange(r); copy.textContent = 'Markiert, jetzt kopieren'; };
    try { navigator.clipboard.writeText(txt).then(ok, pick); } catch (e) { pick(); }
  });
})();
