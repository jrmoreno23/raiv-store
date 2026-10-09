(function () {
  var C = window.RAIV_CONFIG || {};
  var ready = !!(C.SUPABASE_URL && C.SUPABASE_ANON_KEY && window.supabase);
  var sb = ready ? window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY) : null;
  var R = window.RAIV = {
    C: C, ready: ready, sb: sb,
    esc: function (s) {
      return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    },
    money: function (n) { return 'S/ ' + Number(n).toFixed(2); },
    productUrl: function (slug) {
      return new URL('producto.html?p=' + encodeURIComponent(slug), location.href).href;
    },
    cover: function (p) {
      var im = (p.images || []).slice().sort(function (a, b) { return a.position - b.position; });
      return im.length ? im[0].url : null;
    },
    wa: function (text) {
      return 'https://wa.me/' + (C.WHATSAPP || '51974674013') + '?text=' + encodeURIComponent(text);
    },
    SELECT: '*, category:categories(id,name,emoji), images:product_images(id,url,path,position)',
    notConfigured: function (el) {
      el.hidden = false; el.className = 'msg err';
      el.innerHTML = '<b>Falta conectar Supabase.</b><br>Abre <code>js/config.js</code> y pega tu <code>SUPABASE_URL</code> y tu <code>SUPABASE_ANON_KEY</code>. Los pasos están en el README.';
    }
  };
  var ig = document.getElementById('lnk-ig'), fb = document.getElementById('lnk-fb');
  if (ig) { if (C.INSTAGRAM_URL) ig.href = C.INSTAGRAM_URL; else ig.style.display = 'none'; }
  if (fb) { if (C.FACEBOOK_URL) fb.href = C.FACEBOOK_URL; else fb.style.display = 'none'; }
})();
