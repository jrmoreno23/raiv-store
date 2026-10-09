(function () {
  var R = window.RAIV, esc = R.esc, $ = function (i) { return document.getElementById(i); };
  var status = $('status');
  if (!R.ready) { R.notConfigured(status); return; }
  var sb = R.sb, BUCKET = R.C.BUCKET || 'product-images';
  var cats = [], products = [], editing = null, imgs = [], busy = false;

  function toast(t, bad) {
    var e = $('toast'); e.textContent = t; e.className = 'toast on' + (bad ? ' bad' : '');
    clearTimeout(toast.t); toast.t = setTimeout(function () { e.className = 'toast'; }, 3500);
  }
  function show(which) { $('login').hidden = which !== 'login'; $('app').hidden = which !== 'app'; }

  // ---------- sesión ----------
  async function route() {
    var s = (await sb.auth.getSession()).data.session;
    if (!s) { show('login'); return; }
    var a = await sb.from('admins').select('user_id').maybeSingle();
    if (a.error || !a.data) {
      await sb.auth.signOut(); show('login');
      $('lerr').textContent = 'Esta cuenta no tiene permiso de administrador.'; return;
    }
    show('app'); await loadAll();
  }
  $('lf').onsubmit = async function (e) {
    e.preventDefault(); $('lerr').textContent = '';
    var r = await sb.auth.signInWithPassword({ email: $('em').value.trim(), password: $('pw').value });
    if (r.error) { $('lerr').textContent = 'Correo o contraseña incorrectos.'; return; }
    $('pw').value = ''; route();
  };
  $('out').onclick = async function () { await sb.auth.signOut(); show('login'); };

  // ---------- datos ----------
  async function loadAll() {
    var r = await Promise.all([
      sb.from('categories').select('*').order('sort'),
      sb.from('products').select(R.SELECT).order('created_at', { ascending: false })
    ]);
    if (r[0].error || r[1].error) { toast('Error al cargar: ' + (r[0].error || r[1].error).message, true); return; }
    cats = r[0].data; products = r[1].data;
    $('f-cat').innerHTML = '<option value="">Sin categoría</option>' + cats.map(function (c) {
      return '<option value="' + c.id + '">' + esc(c.emoji + ' ' + c.name) + '</option>'; }).join('');
    drawList();
  }
  function drawList() {
    var L = $('plist');
    if (!products.length) { L.innerHTML = '<p>Aún no tienes productos. Toca “+ Nuevo producto”.</p>'; return; }
    L.innerHTML = '';
    products.forEach(function (p) {
      var c = R.cover(p), el = document.createElement('div'); el.className = 'pitem';
      var lbl = { published: 'Publicado', hidden: 'Oculto', draft: 'Borrador' }[p.status];
      el.innerHTML = (c ? '<img src="' + esc(c) + '" alt="">' : '<div class="ph">' + esc(p.category ? p.category.emoji : '🛍️') + '</div>') +
        '<div><b>' + esc(p.name) + '</b><span class="st ' + p.status + '">' + lbl + '</span><br><small>' + R.money(p.price) +
        ' · Stock: ' + p.stock + (p.stock <= 0 ? ' (agotado)' : '') + '</small></div>' +
        '<div class="acts2"><button class="btn-s" data-a="edit">Editar</button>' +
        '<button class="btn-s" data-a="tog">' + (p.status === 'published' ? 'Ocultar' : 'Publicar') + '</button>' +
        '<button class="btn-s del" data-a="del">Eliminar</button></div>';
      el.querySelector('[data-a=edit]').onclick = function () { openForm(p); };
      el.querySelector('[data-a=tog]').onclick = function () { toggle(p); };
      el.querySelector('[data-a=del]').onclick = function () { remove(p); };
      L.appendChild(el);
    });
  }
  async function toggle(p) {
    var ns = p.status === 'published' ? 'hidden' : 'published';
    var r = await sb.from('products').update({ status: ns }).eq('id', p.id);
    if (r.error) { toast(r.error.message, true); return; }
    toast(ns === 'published' ? 'Producto publicado' : 'Producto oculto'); loadAll();
  }
  async function remove(p) {
    if (!confirm('¿Eliminar “' + p.name + '” y sus fotos? No se puede deshacer.')) return;
    var paths = (p.images || []).map(function (i) { return i.path; });
    if (paths.length) await sb.storage.from(BUCKET).remove(paths);
    var r = await sb.from('products').delete().eq('id', p.id);
    if (r.error) { toast(r.error.message, true); return; }
    toast('Producto eliminado'); loadAll();
  }

  // ---------- formulario ----------
  function openForm(p) {
    editing = p || null;
    $('ftitle').textContent = p ? 'Editar producto' : 'Nuevo producto';
    $('f-name').value = p ? p.name : ''; $('f-desc').value = p ? p.description : '';
    $('f-cat').value = p && p.category_id ? p.category_id : '';
    $('f-status').value = p ? p.status : 'published';
    $('f-price').value = p ? p.price : ''; $('f-stock').value = p ? p.stock : '1';
    $('f-wp').value = p && p.wholesale_price != null ? p.wholesale_price : '';
    $('f-wm').value = p && p.wholesale_min != null ? p.wholesale_min : '';
    $('f-feat').checked = !!(p && p.featured);
    imgs = p ? (p.images || []).slice().sort(function (a, b) { return a.position - b.position; })
      .map(function (i) { return { id: i.id, path: i.path, url: i.url }; }) : [];
    drawImgs(); $('formcard').hidden = false; $('formcard').scrollIntoView({ behavior: 'smooth' });
  }
  $('newp').onclick = function () { openForm(null); };
  $('cancel').onclick = function () { $('formcard').hidden = true; };

  function drawImgs() {
    var box = $('imgs'); box.innerHTML = '';
    imgs.forEach(function (im, i) {
      var d = document.createElement('div');
      d.innerHTML = '<img src="' + esc(im.preview || im.url) + '" alt="">' + (i === 0 ? '<span class="cover">Portada</span>' : '') +
        '<div class="tools" style="position:absolute;aspect-ratio:auto;background:rgba(0,0,0,.45)">' +
        (i > 0 ? '<button type="button" data-a="cov">Portada</button>' : '') + '<button type="button" data-a="rm">Quitar</button></div>';
      d.querySelector('[data-a=rm]').onclick = function () { imgs.splice(i, 1); drawImgs(); };
      var cv = d.querySelector('[data-a=cov]');
      if (cv) cv.onclick = function () { imgs.unshift(imgs.splice(i, 1)[0]); drawImgs(); };
      box.appendChild(d);
    });
  }
  async function addFiles(list) {
    for (var f of Array.from(list)) {
      if (!/^image\//.test(f.type)) { toast('Solo se permiten imágenes', true); continue; }
      try { var b = await shrink(f); imgs.push({ blob: b, preview: URL.createObjectURL(b) }); }
      catch (e) { toast('No se pudo leer una imagen (¿formato HEIC?). Prueba con JPG/PNG.', true); }
    }
    drawImgs();
  }
  $('b-cam').onclick = function () { $('in-cam').click(); };
  $('b-gal').onclick = function () { $('in-gal').click(); };
  $('in-cam').onchange = function () { addFiles(this.files); this.value = ''; };
  $('in-gal').onchange = function () { addFiles(this.files); this.value = ''; };

  function shrink(file) {
    return new Promise(function (ok, no) {
      var u = URL.createObjectURL(file), im = new Image();
      im.onload = function () {
        var m = 1600, s = Math.min(1, m / Math.max(im.naturalWidth, im.naturalHeight));
        var c = document.createElement('canvas'); c.width = Math.round(im.naturalWidth * s); c.height = Math.round(im.naturalHeight * s);
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(u);
        c.toBlob(function (b) { b ? ok(b) : no(); }, 'image/jpeg', 0.85);
      };
      im.onerror = no; im.src = u;
    });
  }
  function slugify(s) {
    return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'producto';
  }

  $('pf').onsubmit = async function (e) {
    e.preventDefault(); if (busy) return;
    var price = Number($('f-price').value), stock = Math.floor(Number($('f-stock').value));
    var wp = $('f-wp').value === '' ? null : Number($('f-wp').value);
    var wm = $('f-wm').value === '' ? null : Math.floor(Number($('f-wm').value));
    if (!(price >= 0) || !(stock >= 0)) { toast('Precio y cantidad no pueden ser negativos', true); return; }
    if (wp != null && !(wp >= 0)) { toast('Precio mayorista inválido', true); return; }
    if ($('f-status').value === 'published' && !imgs.length && !confirm('Este producto no tiene fotos. ¿Publicar igual?')) return;
    busy = true; $('save').disabled = true; $('save').textContent = 'Guardando…';
    try {
      var id = editing ? editing.id : crypto.randomUUID();
      var row = {
        id: id, slug: editing ? editing.slug : slugify($('f-name').value) + '-' + id.slice(0, 6),
        name: $('f-name').value.trim(), description: $('f-desc').value.trim(),
        category_id: $('f-cat').value || null, price: price, stock: stock,
        wholesale_price: wp, wholesale_min: wp != null ? (wm || 1) : null,
        status: $('f-status').value, featured: $('f-feat').checked
      };
      var up = await sb.from('products').upsert(row); if (up.error) throw up.error;

      // fotos quitadas
      var keep = imgs.filter(function (i) { return i.id; }).map(function (i) { return i.id; });
      var gone = ((editing && editing.images) || []).filter(function (i) { return keep.indexOf(i.id) < 0; });
      if (gone.length) {
        await sb.storage.from(BUCKET).remove(gone.map(function (i) { return i.path; }));
        var d = await sb.from('product_images').delete().in('id', gone.map(function (i) { return i.id; })); if (d.error) throw d.error;
      }
      // fotos nuevas + orden
      for (var k = 0; k < imgs.length; k++) {
        var im = imgs[k];
        if (im.id) { await sb.from('product_images').update({ position: k }).eq('id', im.id); continue; }
        var path = id + '/' + crypto.randomUUID() + '.jpg';
        var u = await sb.storage.from(BUCKET).upload(path, im.blob, { contentType: 'image/jpeg', upsert: false }); if (u.error) throw u.error;
        var url = sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
        var ins = await sb.from('product_images').insert({ product_id: id, path: path, url: url, position: k }); if (ins.error) throw ins.error;
      }
      toast('Producto guardado'); $('formcard').hidden = true; await loadAll();
    } catch (err) { toast('No se pudo guardar: ' + (err.message || err), true); }
    busy = false; $('save').disabled = false; $('save').textContent = 'Guardar producto';
  };

  $('cf').onsubmit = async function (e) {
    e.preventDefault();
    var r = await sb.from('categories').insert({ name: $('c-name').value.trim(), sort: cats.length + 1 });
    if (r.error) { toast(r.error.message, true); return; }
    $('c-name').value = ''; toast('Categoría agregada'); loadAll();
  };

  route();
})();
