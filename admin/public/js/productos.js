(function () {
  'use strict';

  var apiFetch = window.Admin.apiFetch;
  var showToast = window.Admin.showToast;
  var escapeHtml = window.Admin.escapeHtml;
  var formatPEN = window.Admin.formatPEN;

  var categorias = [];
  var productos = [];
  var galeria = []; // URLs de la galería (existentes + añadidas por URL)

  var tbody = document.getElementById('tbodyProductos');
  var filtroTexto = document.getElementById('filtroTexto');
  var filtroCategoria = document.getElementById('filtroCategoria');
  // Paginación para 500+ productos: evita cargar todo de golpe
  var paginaActual = 1;
  var porPagina = 20;
  var totalPaginas = 1;
  var paginacionEl = document.getElementById('paginacionProductos');
  if (!paginacionEl) {
    paginacionEl = document.createElement('div');
    paginacionEl.id = 'paginacionProductos';
    paginacionEl.className = 'pagination';
    paginacionEl.style.cssText = 'display:flex;gap:8px;justify-content:center;align-items:center;margin:16px 0;';
    var panel = document.querySelector('.panel');
    if (panel && panel.parentNode) panel.parentNode.insertBefore(paginacionEl, panel.nextSibling);
  }

  // Compresión en el navegador: baja fotos de 4MB a ~200KB antes de subir (más rápido y estable)
  function comprimirImagen(file) {
    return new Promise(function (resolve) {
      if (!file || !file.type || file.type.indexOf('image/') !== 0) return resolve(file);
      if (file.size < 350 * 1024) return resolve(file);
      var img = new Image();
      img.onload = function () {
        var max = 1280;
        var scale = Math.min(1, max / Math.max(img.width, img.height));
        var canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(function (blob) {
          URL.revokeObjectURL(img.src);
          if (!blob) return resolve(file);
          var nuevo = new File([blob], file.name, { type: file.type, lastModified: Date.now() });
          resolve(nuevo.size < file.size ? nuevo : file);
        }, file.type, 0.82);
      };
      img.onerror = function () { URL.revokeObjectURL(img.src); resolve(file); };
      img.src = URL.createObjectURL(file);
    });
  }

  // Subida directa a Supabase (navegador -> Storage) sin pasar por Render — 5-10x más rápida en móvil
  function subirDirecto(file, bucket) {
    return apiFetch('/api/uploads/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bucket: bucket || 'productos', contentType: file.type })
    }).then(function (pres) {
      return fetch(pres.signedUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type }
      }).then(function (r) {
        if (!r.ok) throw new Error('Upload directo falló: ' + r.status);
        return pres.publicUrl;
      });
    });
  }

  var drawer = document.getElementById('drawerProducto');
  var form = document.getElementById('formProducto');
  var formError = document.getElementById('formProductoError');

  var previewGaleria = document.getElementById('previewGaleria');
  var fImagenesUrl = document.getElementById('fImagenesUrl');

  function cargarCategorias() {
    return apiFetch('/api/categorias').then(function (data) {
      categorias = data;
      var opciones = '<option value="">Todas las categorías</option>';
      categorias.forEach(function (c) {
        opciones += '<option value="' + c.slug + '">' + escapeHtml(c.nombre) + '</option>';
      });
      filtroCategoria.innerHTML = opciones;

      var opcionesForm = categorias
        .map(function (c) { return '<option value="' + c.id + '">' + escapeHtml(c.nombre) + '</option>'; })
        .join('');
      document.getElementById('fCategoriaId').innerHTML = opcionesForm;
    });
  }

  function renderPaginacion() {
    if (totalPaginas <= 1) { paginacionEl.innerHTML = ''; return; }
    var html = '';
    html += '<button type="button" class="btn btn--small" id="btnPrevPagina" ' + (paginaActual <= 1 ? 'disabled' : '') + '>‹ Anterior</button>';
    html += '<span style="font-size:13px;color:#475569;">Página ' + paginaActual + ' de ' + totalPaginas + '</span>';
    html += '<button type="button" class="btn btn--small" id="btnNextPagina" ' + (paginaActual >= totalPaginas ? 'disabled' : '') + '>Siguiente ›</button>';
    paginacionEl.innerHTML = html;
    var btnPrev = document.getElementById('btnPrevPagina');
    var btnNext = document.getElementById('btnNextPagina');
    if (btnPrev) btnPrev.addEventListener('click', function () { if (paginaActual > 1) { paginaActual--; cargarProductos(); }});
    if (btnNext) btnNext.addEventListener('click', function () { if (paginaActual < totalPaginas) { paginaActual++; cargarProductos(); }});
  }

  function cargarProductos() {
    var params = new URLSearchParams();
    if (filtroTexto.value.trim()) params.set('q', filtroTexto.value.trim());
    if (filtroCategoria.value) params.set('categoria', filtroCategoria.value);
    params.set('incluirOcultos', 'true');
    params.set('page', String(paginaActual));
    params.set('limit', String(porPagina));

    return apiFetch('/api/productos?' + params.toString()).then(function (data) {
      // Soporta respuesta paginada {data,total,page,totalPages} y array legado
      if (data && Array.isArray(data.data)) {
        productos = data.data;
        totalPaginas = data.totalPages || 1;
        paginaActual = data.page || paginaActual;
      } else if (Array.isArray(data)) {
        productos = data;
        totalPaginas = 1;
      } else {
        productos = [];
        totalPaginas = 1;
      }
      renderTabla();
      renderPaginacion();
    });
  }

  function resetPaginaYCargar() {
    paginaActual = 1;
    return cargarProductos();
  }

  function renderTabla() {
    if (productos.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="table__empty">No se encontraron productos.</td></tr>';
      return;
    }

    tbody.innerHTML = productos.map(function (p) {
      var img = p.imagen
        ? '<img class="table__thumb" src="' + p.imagen + '" alt="">'
        : '<div class="table__thumb table__thumb--empty"></div>';

      var precioHtml = typeof p.precio === 'number' ? formatPEN(p.precio) : '<span class="muted">Consultar</span>';

      var estadoHtml = p.oculto
        ? '<span class="badge badge--off">Oculto</span>'
        : p.disponible
          ? '<span class="badge badge--ok">Disponible</span>'
          : '<span class="badge badge--off">Agotado</span>';

      var etiquetas = '';
      if (p.oculto) etiquetas += '<span class="badge badge--off">Oculto</span> ';
      if (p.destacado) etiquetas += '<span class="badge badge--info">Destacado</span> ';
      if (p.nuevo) etiquetas += '<span class="badge badge--new">Nuevo</span>';

      return (
        '<tr>' +
        '<td>' + img + '</td>' +
        '<td>' + escapeHtml(p.nombre) + '<div class="muted">' + escapeHtml(p.sku || '') + '</div></td>' +
        '<td>' + escapeHtml(p.categoria ? p.categoria.nombre : '') + '</td>' +
        '<td>' + precioHtml + '</td>' +
        '<td>' + estadoHtml + '</td>' +
        '<td>' + etiquetas + '</td>' +
        '<td class="table__actions">' +
        '<button type="button" class="btn btn--small" data-editar="' + p.id + '">Editar</button>' +
        '<button type="button" class="btn btn--small btn--danger" data-eliminar="' + p.id + '">Eliminar</button>' +
        '</td>' +
        '</tr>'
      );
    }).join('');
  }

  function abrirDrawer(producto) {
    formError.hidden = true;
    form.reset();
    document.getElementById('previewImagen').innerHTML = '';
    document.getElementById('fId').value = '';
    galeria = [];
    renderGaleria();

    if (producto) {
      document.getElementById('drawerTitulo').textContent = 'Editar producto';
      document.getElementById('fId').value = producto.id;
      document.getElementById('fNombre').value = producto.nombre || '';
      document.getElementById('fDescripcion').value = producto.descripcion || '';
      document.getElementById('fCategoriaId').value = producto.categoriaId || '';
      document.getElementById('fSku').value = producto.sku || '';
      document.getElementById('fMarca').value = producto.marca || '';
      document.getElementById('fPrecio').value = producto.precio != null ? producto.precio : '';
      document.getElementById('fPrecioAnterior').value = producto.precioAnterior != null ? producto.precioAnterior : '';
      document.getElementById('fPrecioMayorista').value = producto.precioMayorista != null ? producto.precioMayorista : '';
      document.getElementById('fCantidadMayorista').value = producto.cantidadMayorista != null ? producto.cantidadMayorista : '';
      document.getElementById('fDisponible').checked = !!producto.disponible;
      document.getElementById('fDestacado').checked = !!producto.destacado;
      document.getElementById('fNuevo').checked = !!producto.nuevo;
      document.getElementById('fOculto').checked = !!producto.oculto;
      if (producto.imagen) {
        document.getElementById('previewImagen').innerHTML = '<img src="' + producto.imagen + '" alt="">';
      }
      galeria = (producto.imagenes && producto.imagenes.length) ? producto.imagenes.slice() : [];
      if (producto.imagen && galeria.indexOf(producto.imagen) === -1) galeria.unshift(producto.imagen);
      renderGaleria();
    } else {
      document.getElementById('drawerTitulo').textContent = 'Nuevo producto';
      document.getElementById('fDisponible').checked = true;
    }

    drawer.hidden = false;
  }

  // ------------------------------------------------------------
  // GALERÍA DE FOTOS
  // ------------------------------------------------------------
  function renderGaleria() {
    fImagenesUrl.value = JSON.stringify(galeria);
    previewGaleria.innerHTML = '';

    galeria.forEach(function (url, idx) {
      var item = document.createElement('div');
      item.className = 'g-item';
      item.innerHTML = '<img src="' + url + '" alt="">' +
        '<button type="button" class="g-remove" data-remover-galeria="' + idx + '" aria-label="Quitar foto">×</button>';
      previewGaleria.appendChild(item);
    });
  }

  function quitarDeGaleria(idx) {
    galeria.splice(idx, 1);
    renderGaleria();
  }

  previewGaleria.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-remover-galeria]');
    if (btn) quitarDeGaleria(Number(btn.getAttribute('data-remover-galeria')));
  });

  document.getElementById('btnAgregarGaleria').addEventListener('click', function () {
    var input = document.getElementById('fGaleriaUrl');
    var url = (input.value || '').trim();
    if (url) {
      galeria.push(url);
      renderGaleria();
      input.value = '';
    }
  });

  var fImagenesArchivo = document.getElementById('fImagenesArchivo');
  fImagenesArchivo.addEventListener('change', function () {
    // Los archivos se guardan en el FormData al guardar; aquí solo mostramos
    // los nombres como indicación de que se subirán.
    var n = fImagenesArchivo.files ? fImagenesArchivo.files.length : 0;
    if (n) showToast('Se subirán ' + n + ' foto(s) al guardar.', 'info');
  });

  function cerrarDrawer() {
    drawer.hidden = true;
  }

  function guardarProducto(e) {
    e.preventDefault();
    formError.hidden = true;

    var id = document.getElementById('fId').value;
    var submitBtn = form.querySelector('button[type="submit"]');
    var originalBtnText = submitBtn ? submitBtn.textContent : '';

    // Feedback visual: deshabilita botón y muestra "Guardando..."
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Guardando...';
      submitBtn.style.opacity = '0.6';
      submitBtn.style.cursor = 'wait';
    }
    var btnCancelar = document.getElementById('btnCancelarProducto');
    if (btnCancelar) btnCancelar.disabled = true;

    function restaurarBoton() {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText || 'Guardar';
        submitBtn.style.opacity = '';
        submitBtn.style.cursor = '';
      }
      if (btnCancelar) btnCancelar.disabled = false;
    }

    // Comprime imágenes en el navegador antes de subir (4MB -> ~200KB, 10x más rápido)
    var fImagen = document.getElementById('fImagenArchivo');
    var fGaleria = document.getElementById('fImagenesArchivo');
    var pImagen = fImagen && fImagen.files[0] ? comprimirImagen(fImagen.files[0]) : Promise.resolve(null);
    var pGaleria = fGaleria && fGaleria.files.length ? Promise.all(Array.from(fGaleria.files).map(comprimirImagen)) : Promise.resolve([]);

    Promise.all([pImagen, pGaleria]).then(function (res) {
      var imgComprimida = res[0];
      var galeriaComprimida = res[1];

      // Intenta subida directa a Supabase (evita doble salto por Render). Si falla, cae a FormData clásico.
      var tieneArchivos = (imgComprimida && fImagen.files.length) || galeriaComprimida.length;
      if (!tieneArchivos) {
        // Sin archivos nuevos, envío clásico sin subida directa
        var formData0 = new FormData(form);
        ['disponible', 'destacado', 'nuevo', 'oculto', 'eliminarImagen'].forEach(function (campo) {
          var checkbox = form.querySelector('[name="' + campo + '"]');
          if (checkbox && !checkbox.checked) formData0.set(campo, 'false');
        });
        var url0 = id ? '/api/productos/' + id : '/api/productos';
        var method0 = id ? 'PUT' : 'POST';
        return apiFetch(url0, { method: method0, body: formData0 });
      }

      var directOps = [];
      if (imgComprimida) {
        directOps.push(subirDirecto(imgComprimida, 'productos').then(function (url) { return { field: 'imagen', url: url, file: imgComprimida }; }));
      }
      galeriaComprimida.forEach(function (f) {
        directOps.push(subirDirecto(f, 'productos').then(function (url) { return { field: 'imagenes', url: url, file: f }; }));
      });

      return Promise.all(directOps.map(function (p) { return p.catch(function () { return null; }); })).then(function (results) {
        var allOk = results.length > 0 && results.every(function (r) { return r !== null; });
        if (allOk) {
          // Éxito directo: envía solo URLs, sin archivos
          var imagenUrlDirecta = null;
          var galeriaUrlsDirectas = [];
          results.forEach(function (r) { if (r.field === 'imagen') imagenUrlDirecta = r.url; else galeriaUrlsDirectas.push(r.url); });
          // Inyecta URLs en galeria y en campo imagenUrl
          if (galeriaUrlsDirectas.length) {
            galeriaUrlsDirectas.forEach(function (u) { galeria.push(u); });
            fImagenesUrl.value = JSON.stringify(galeria);
          }
          var formDataDirect = new FormData(form);
          // Limpia archivos (ya subidos) y fija URLs
          formDataDirect.delete('imagen');
          formDataDirect.delete('imagenes');
          if (imagenUrlDirecta) formDataDirect.set('imagenUrl', imagenUrlDirecta);
          // Asegura que imagenesUrl refleje la galería actualizada
          formDataDirect.set('imagenesUrl', JSON.stringify(galeria));
          ['disponible', 'destacado', 'nuevo', 'oculto', 'eliminarImagen'].forEach(function (campo) {
            var checkbox = form.querySelector('[name="' + campo + '"]');
            if (checkbox && !checkbox.checked) formDataDirect.set(campo, 'false');
          });
          var urlD = id ? '/api/productos/' + id : '/api/productos';
          var methodD = id ? 'PUT' : 'POST';
          return apiFetch(urlD, { method: methodD, body: formDataDirect });
        } else {
          // Fallback: envío clásico con archivos comprimidos por Render
          var formData = new FormData(form);
          if (fImagen && fImagen.files.length) {
            formData.delete('imagen');
            if (imgComprimida) formData.append('imagen', imgComprimida, imgComprimida.name);
          }
          if (fGaleria && fGaleria.files.length) {
            formData.delete('imagenes');
            galeriaComprimida.forEach(function (f) { formData.append('imagenes', f, f.name); });
          }
          ['disponible', 'destacado', 'nuevo', 'oculto', 'eliminarImagen'].forEach(function (campo) {
            var checkbox = form.querySelector('[name="' + campo + '"]');
            if (checkbox && !checkbox.checked) formData.set(campo, 'false');
          });
          var url = id ? '/api/productos/' + id : '/api/productos';
          var method = id ? 'PUT' : 'POST';
          return apiFetch(url, { method: method, body: formData });
        }
      });
    }).then(function () {
      restaurarBoton();
      cerrarDrawer();
      showToast(id ? 'Producto actualizado.' : 'Producto creado.', 'ok');
      if (!id) paginaActual = 1;
      return cargarProductos();
    }).catch(function (err) {
      restaurarBoton();
      formError.textContent = err.message;
      formError.hidden = false;
    });
  }

  function eliminarProducto(id) {
    if (!confirm('¿Eliminar este producto? Esta acción no se puede deshacer.')) return;
    apiFetch('/api/productos/' + id, { method: 'DELETE' })
      .then(function () {
        showToast('Producto eliminado.', 'ok');
        return cargarProductos();
      })
      .then(function () {
        // Si la página quedó vacía y no es la primera, retrocede
        if (productos.length === 0 && paginaActual > 1) {
          paginaActual--;
          return cargarProductos();
        }
      })
      .catch(function (err) {
        showToast(err.message, 'error');
      });
  }

  tbody.addEventListener('click', function (e) {
    var btnEditar = e.target.closest('[data-editar]');
    var btnEliminar = e.target.closest('[data-eliminar]');
    if (btnEditar) {
      var producto = productos.filter(function (p) { return String(p.id) === btnEditar.getAttribute('data-editar'); })[0];
      if (producto) abrirDrawer(producto);
    } else if (btnEliminar) {
      eliminarProducto(btnEliminar.getAttribute('data-eliminar'));
    }
  });

  document.getElementById('btnNuevoProducto').addEventListener('click', function () { abrirDrawer(null); });
  document.getElementById('btnCancelarProducto').addEventListener('click', cerrarDrawer);
  document.getElementById('btnCerrarDrawer').addEventListener('click', cerrarDrawer);
  document.getElementById('drawerBackdrop').addEventListener('click', cerrarDrawer);
  form.addEventListener('submit', guardarProducto);

  var debounceTimer;
  filtroTexto.addEventListener('input', function () {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(resetPaginaYCargar, 300);
  });
  filtroCategoria.addEventListener('change', resetPaginaYCargar);

  cargarCategorias().then(cargarProductos).catch(function (err) { showToast(err.message, 'error'); });
})();
