/* Kontakt vor Crawlern und Scrapern schützen: Mail und Anschrift stehen nicht im Quelltext,
   sondern verschlüsselt (umgedreht, Base64) in data-enc und werden erst im Browser eingesetzt.
   data-enc="mail": Link mit mailto; data-enc="zeilen": Zeilen, getrennt durch „|“. */
(function () {
  'use strict';
  function auf(s) {
    try {
      var b = atob(s), u = new Uint8Array(b.length);
      for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
      return new TextDecoder().decode(u).split('').reverse().join('');
    } catch (e) { return ''; }
  }
  window.seKontakt = auf;
  Array.prototype.forEach.call(document.querySelectorAll('[data-enc]'), function (el) {
    var t = auf(el.getAttribute('data-enc'));
    if (!t) return;
    if (el.getAttribute('data-art') === 'mail') {
      el.textContent = t;
      if (el.tagName === 'A') el.href = 'mailto:' + t;
    } else {
      el.textContent = '';
      t.split('|').forEach(function (z, i) { if (i) el.appendChild(document.createElement('br')); el.appendChild(document.createTextNode(z)); });
    }
    el.removeAttribute('data-enc');
  });
})();
