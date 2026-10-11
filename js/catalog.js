(function () {
  var R = window.RAIV, esc = R.esc;
  var grid = document.getElementById('grid'), cats = document.getElementById('cats');
  var empty = document.getElementById('empty'), status = document.getElementById('status');
  var all = [], filt = '';

  // Abrir / cerrar barra de búsqueda y enfocar el input
  var sbtn = document.getElementById('sbtn');
  if (sbtn) {
    sbtn.onclick = function () {
      var b = document.getElementById('sbar'); 
      if (b) {
        b.classList.toggle('on');
        if (b.classList.contains('on')) document.getElementById('q').focus();
      }
    };
  }

  // Menú móvil
  var nav = document.getElementById('nav');
  var mbtn = document.getElementById('mbtn');
  if (mbtn && nav) {
    mbtn.onclick = function () { nav.classList.toggle('open'); };
    nav.querySelectorAll('a').forEach(function (a) { a.onclick = function () { nav.classList.remove('open'); }; });
  }

  if (!R.ready) { R.notConfigured(status); return; }

  function card(p) {
    var out = p.stock <= 0, img = R.cover(p), url = 'producto.html?p=' + encodeURIComponent(p.slug);
    var emoji = (p.category && p.category.emoji) || '🛍️';
    var msg = 'Hola RAIV STORE, quiero comprar: ' + p.name + ' (' + R.money(p.price) + ') ' + R.productUrl(p.slug);
    var wh = p.wholesale_price != null
      ? '<div class="wh">Por mayor' + (p.wholesale_min ? ' desde ' + p.wholesale_min + ' u.' : '') + ': <b>' + R.money(p.wholesale_price) + '</b> c/u</div>' : '';
    var el = document.createElement('article');
    el.className = 'prod' + (out ? ' soldout' : '');
    el.innerHTML =
      '<a class="thumb" href="' + url + '" style="--c1:#ffd1e3;--c2:#f3b5ff;height:210px;font-size:4rem" aria-label="Ver ' + esc(p.name) + '">' +
      (img ? '<img loading="lazy" src="' + esc(img) + '" alt="' + esc(p.name) + '">' : '<span>' + esc(emoji) + '</span>') +
      (out ? '<span class="badge out">Agotado</span>' : (p.featured ? '<span class="badge">Destacado</span>' : '')) + '</a>' +
      '<div class="pb"><span class="tag">' + esc(p.category ? p.category.name : 'Sin categoría') + '</span>' +
      '<h3><a href="' + url + '">' + esc(p.name) + '</a></h3>' +
      '<div class="price">' + R.money(p.price) + ' <small>por unidad</small></div>' + wh +
      '<div class="acts"><a class="b1" style="text-align:center" href="' + url + '">Ver detalles</a>' +
      (out ? '<span class="b2" aria-disabled="true">Agotado</span>'
           : '<a class="b2" target="_blank" rel="noopener" href="' + R.wa(msg) + '">Comprar vía WhatsApp</a>') +
      '</div></div>';
    return el;
  }

 function apply() {
    var qInput = document.getElementById('q');
    var q = qInput ? qInput.value.toLowerCase().trim() : '', n = 0;
    if (!grid) return;

    // Desplazar automáticamente hacia el catálogo cuando se empieza a escribir
    if (q.length > 0) {
      var catSection = document.getElementById('catalogo') || grid.parentElement;
      if (catSection) {
        catSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }

    grid.innerHTML = '';
    all.forEach(function (p) {
      var hay = (p.name + ' ' + (p.description || '') + ' ' + (p.category ? p.category.name : '')).toLowerCase();
      if ((!q || hay.indexOf(q) > -1) && (!filt || (p.category && p.category.id === filt))) { 
        grid.appendChild(card(p)); 
        n++; 
      }
    });
    if (empty) empty.style.display = n ? 'none' : 'block';
  }

  var searchQ = document.getElementById('q');
  if (searchQ) searchQ.oninput = apply;

  function drawCats(list) {
    if (!cats) return;
    cats.innerHTML = '';
    list.forEach(function (c) {
      var a = document.createElement('a');
      a.className = 'cat'; a.href = '#catalogo'; a.setAttribute('role', 'button');
      a.innerHTML = '<span>' + esc(c.emoji) + '</span>' + esc(c.name);
      a.onclick = function () { filt = filt === c.id ? '' : c.id; apply(); };
      cats.appendChild(a);
    });
  }

  Promise.all([
    R.sb.from('categories').select('*').order('sort'),
    R.sb.from('products').select(R.SELECT).eq('status', 'published').order('featured', { ascending: false }).order('created_at', { ascending: false })
  ]).then(function (r) {
    if (r[0].error || r[1].error) throw (r[0].error || r[1].error);
    all = r[1].data; drawCats(r[0].data); apply();
    if (!all.length && empty) { empty.textContent = 'Pronto verás aquí nuestros productos.'; }
  }).catch(function (e) {
    if (status) {
      status.hidden = false; status.className = 'msg err';
      status.textContent = 'No se pudo cargar el catálogo: ' + (e.message || e);
    }
  });
})();
