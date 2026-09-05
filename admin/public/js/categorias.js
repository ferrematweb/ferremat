(function () {
  'use strict';

  var apiFetch = window.Admin.apiFetch;
  var showToast = window.Admin.showToast;
  var escapeHtml = window.Admin.escapeHtml;

  var categorias = [];
  var tbody = document.getElementById('tbodyCategorias');
  var drawer = document.getElementById('drawerCategoria');
  var form = document.getElementById('formCategoria');
  var formError = document.getElementById('formCategoriaError');

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

  function cargarCategorias() {
    return apiFetch('/api/categorias').then(function (data) {
      categorias = data;
      renderTabla();
    });
  }

  function renderTabla() {
    if (categorias.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="table__empty">No hay categorías todavía.</td></tr>';
      return;
    }

    tbody.innerHTML = categorias.map(function (c) {
      var img = c.imagen
        ? '<img class="table__thumb" src="' + c.imagen + '" alt="">'
        : '<div class="table__thumb table__thumb--empty"></div>';

      var puedeEliminar = !c.totalProductos || c.totalProductos === 0;

      return (
        '<tr>' +
        '<td>' + img + '</td>' +
        '<td>' + escapeHtml(c.nombre) + '</td>' +
        '<td><code>' + escapeHtml(c.slug) + '</code></td>' +
        '<td>' + c.orden + '</td>' +
        '<td>' + c.totalProductos + '</td>' +
        '<td>' + (c.destacada ? '<span class="badge badge--info">Sí</span>' : '—') + '</td>' +
        '<td class="table__actions">' +
        '<button type="button" class="btn btn--small" data-editar="' + c.id + '">Editar</button>' +
        '<button type="button" class="btn btn--small btn--danger" data-eliminar="' + c.id + '"' +
          (puedeEliminar ? '' : ' disabled title="Tiene productos asociados"') + '>Eliminar</button>' +
        '</td>' +
        '</tr>'
      );
    }).join('');
  }

  function abrirDrawer(categoria) {
    formError.hidden = true;
    form.reset();
    document.getElementById('previewImagenCat').innerHTML = '';
    document.getElementById('cId').value = '';

    if (categoria) {
      document.getElementById('drawerTituloCat').textContent = 'Editar categoría';
      document.getElementById('cId').value = categoria.id;
      document.getElementById('cNombre').value = categoria.nombre || '';
      document.getElementById('cSlug').value = categoria.slug || '';
      document.getElementById('cOrden').value = categoria.orden || 0;
      document.getElementById('cDestacada').checked = !!categoria.destacada;
      if (categoria.imagen) {
        document.getElementById('previewImagenCat').innerHTML = '<img src="' + categoria.imagen + '" alt="">';
      }
    } else {
      document.getElementById('drawerTituloCat').textContent = 'Nueva categoría';
    }

    drawer.hidden = false;
  }

  function cerrarDrawer() {
    drawer.hidden = true;
  }

  function guardarCategoria(e) {
    e.preventDefault();
    formError.hidden = true;

    var id = document.getElementById('cId').value;
    var submitBtn = form.querySelector('button[type="submit"]');
    var originalBtnText = submitBtn ? submitBtn.textContent : '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Guardando...';
      submitBtn.style.opacity = '0.6';
      submitBtn.style.cursor = 'wait';
    }
    var btnCancelar = document.getElementById('btnCancelarCategoria');
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

    var fCatImg = document.getElementById('cImagenArchivo');
    var pCat = fCatImg && fCatImg.files[0] ? comprimirImagen(fCatImg.files[0]) : Promise.resolve(null);

    pCat.then(function (imgComp) {
      var formData = new FormData(form);
      if (fCatImg && fCatImg.files.length) {
        formData.delete('imagen');
        if (imgComp) formData.append('imagen', imgComp, imgComp.name);
      }
      ['destacada', 'eliminarImagen'].forEach(function (campo) {
        var checkbox = form.querySelector('[name="' + campo + '"]');
        if (checkbox && !checkbox.checked) formData.set(campo, 'false');
      });
      var url = id ? '/api/categorias/' + id : '/api/categorias';
      var method = id ? 'PUT' : 'POST';
      return apiFetch(url, { method: method, body: formData });
    }).then(function () {
      restaurarBoton();
      cerrarDrawer();
      showToast(id ? 'Categoría actualizada.' : 'Categoría creada.', 'ok');
      return cargarCategorias();
    }).catch(function (err) {
      restaurarBoton();
      formError.textContent = err.message;
      formError.hidden = false;
    });
  }

  function eliminarCategoria(id) {
    if (!confirm('¿Eliminar esta categoría?')) return;
    apiFetch('/api/categorias/' + id, { method: 'DELETE' })
      .then(function () {
        showToast('Categoría eliminada.', 'ok');
        return cargarCategorias();
      })
      .catch(function (err) {
        showToast(err.message, 'error');
      });
  }

  tbody.addEventListener('click', function (e) {
    var btnEditar = e.target.closest('[data-editar]');
    var btnEliminar = e.target.closest('[data-eliminar]');
    if (btnEditar) {
      var categoria = categorias.filter(function (c) { return String(c.id) === btnEditar.getAttribute('data-editar'); })[0];
      if (categoria) abrirDrawer(categoria);
    } else if (btnEliminar && !btnEliminar.disabled) {
      eliminarCategoria(btnEliminar.getAttribute('data-eliminar'));
    }
  });

  document.getElementById('btnNuevaCategoria').addEventListener('click', function () { abrirDrawer(null); });
  document.getElementById('btnCancelarCategoria').addEventListener('click', cerrarDrawer);
  document.getElementById('btnCerrarDrawerCat').addEventListener('click', cerrarDrawer);
  document.getElementById('drawerBackdropCat').addEventListener('click', cerrarDrawer);
  form.addEventListener('submit', guardarCategoria);

  cargarCategorias().catch(function (err) { showToast(err.message, 'error'); });
})();
