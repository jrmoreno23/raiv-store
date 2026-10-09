(function () {
  var R = window.RAIV, esc = R.esc;
  var box = document.getElementById('pp'), status = document.getElementById('status');
  if (!R.ready) { R.notConfigured(status); return; }
  var slug = new URLSearchParams(location.search).get('p');
  function fail(t) { status.hidden = false; status.className = 'msg'; status.textContent = t; }
  if (!slug) { fail('Producto no encontrado.'); return; }

  function meta(attr, key, val) {
    var m = document.querySelector('meta[' + attr + '="' + key + '"]');
    if (!m) { m = document.createElement('meta'); m.setAttribute(attr, key); document.head.appendChild(m); }
    m.setAttribute('content', val);
  }

  R.sb.from('products').select(R.SELECT).eq('slug', slug).eq('status', 'published').maybeSingle().then(function (r) {
    if (r.error) { fail('Error al cargar: ' + r.error.message); return; }
    var p = r.data;
    if (!p) { fail('Este producto no existe o ya no está disponible.'); return; }
    var imgs = (p.images || []).slice().sort(function (a, b) { return a.position - b.position; });
    var url = R.productUrl(p.slug), out = p.stock <= 0;
    document.title = p.name + ' | RAIV STORE';
    // Nota: estos metadatos sirven para el navegador; las redes leen los de la Etapa 2 (ver README).
    meta('property', 'og:title', p.name); meta('property', 'og:description', (p.description || '').slice(0, 160));
    if (imgs[0]) meta('property', 'og:image', imgs[0].url); meta('property', 'og:url', url);

    var wh = p.wholesale_price != null
      ? '<p><b>Precio por mayor:</b> ' + R.money(p.wholesale_price) + ' c/u' + (p.wholesale_min ? ' (desde ' + p.wholesale_min + ' unidades)' : '') + '</p>' : '';
    var thumbs = imgs.length > 1 ? '<div class="gal-th">' + imgs.map(function (im, i) {
      return '<button type="button" data-i="' + i + '" aria-label="Foto ' + (i + 1) + '"' + (i === 0 ? ' aria-current="true"' : '') + '><img src="' + esc(im.url) + '" alt=""></button>';
    }).join('') + '</div>' : '';

    box.innerHTML =
      '<div class="pp"><div><div class="gal-main" id="gm">' +
      (imgs[0] ? '<img src="' + esc(imgs[0].url) + '" alt="' + esc(p.name) + '">' : esc((p.category && p.category.emoji) || '🛍️')) +
      '</div>' + thumbs + '</div><div>' +
      '<span class="tag">' + esc(p.category ? p.category.name : '') + '</span><h1>' + esc(p.name) + '</h1>' +
      '<div class="price">' + R.money(p.price) + ' <small>por unidad</small></div>' + wh +
      '<p class="desc">' + esc(p.description) + '</p>' +
      '<p><b>' + (out ? 'Agotado' : 'Disponibles: ' + p.stock) + '</b></p>' +
      (out ? '' : '<div class="qty"><label for="qty" style="margin:0">Cantidad</label><input id="qty" type="number" min="1" max="' + p.stock + '" value="1" inputmode="numeric"></div>') +
      (out ? '<span class="b2" aria-disabled="true">Agotado</span>' : '<a class="b2" id="buy" target="_blank" rel="noopener" href="#">Consultar por WhatsApp</a>') +
      '<div class="share"><a id="sw" target="_blank" rel="noopener">WhatsApp</a><a id="sf" target="_blank" rel="noopener">Facebook</a>' +
      '<a id="st" target="_blank" rel="noopener">Telegram</a><a id="sx" target="_blank" rel="noopener">X</a>' +
      '<button type="button" id="cp">Copiar enlace</button><button type="button" id="ns" hidden>Más…</button></div>' +
      '</div></div>';
    box.hidden = false;

    box.querySelectorAll('.gal-th button').forEach(function (b) {
      b.onclick = function () {
        var i = +b.dataset.i;
        document.querySelector('#gm img').src = imgs[i].url;
        box.querySelectorAll('.gal-th button').forEach(function (x) { x.removeAttribute('aria-current'); });
        b.setAttribute('aria-current', 'true');
      };
    });

    var q = document.getElementById('qty');
    function qty() {
      if (!q) return 1;
      var n = Math.floor(Number(q.value)) || 1;
      n = Math.max(1, Math.min(p.stock, n)); return n;
    }
    function upd() {
      var buy = document.getElementById('buy'); if (!buy) return;
      var n = qty();
      buy.href = R.wa('Hola RAIV STORE, quiero consultar: ' + p.name + '\nPrecio: ' + R.money(p.price) + ' c/u\nCantidad: ' + n + '\nTotal: ' + R.money(p.price * n) + '\n' + url);
    }
    if (q) { q.oninput = upd; q.onchange = function () { q.value = qty(); upd(); }; upd(); }

    var t = encodeURIComponent(p.name + ' - ' + R.money(p.price) + ' en RAIV STORE'), u = encodeURIComponent(url);
    document.getElementById('sw').href = 'https://wa.me/?text=' + t + '%20' + u;
    document.getElementById('sf').href = 'https://www.facebook.com/sharer/sharer.php?u=' + u;
    document.getElementById('st').href = 'https://t.me/share/url?url=' + u + '&text=' + t;
    document.getElementById('sx').href = 'https://twitter.com/intent/tweet?text=' + t + '&url=' + u;
    document.getElementById('cp').onclick = function () {
      var b = this;
      (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(function () { b.textContent = '¡Copiado!'; })
        .catch(function () { window.prompt('Copia este enlace:', url); });
    };
    if (navigator.share) {
      var ns = document.getElementById('ns'); ns.hidden = false;
      ns.onclick = function () { navigator.share({ title: p.name, text: p.name + ' - ' + R.money(p.price), url: url }).catch(function () {}); };
    }
  });
})();
