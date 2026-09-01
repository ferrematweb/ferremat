/**
 * Helpers compartidos por todas las páginas del panel admin.
 * Se expone en window.Admin para usarse desde productos.js, categorias.js, menu.js.
 */
(function (global) {
  'use strict';

  function showToast(mensaje, tipo) {
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = mensaje;
    el.className = 'toast toast--' + (tipo || 'info') + ' is-visible';
    el.hidden = false;
    clearTimeout(el._timeout);
    el._timeout = setTimeout(function () {
      el.hidden = true;
    }, 3500);
  }

  /**
   * fetch() envuelto que:
   *  - siempre manda la cookie de sesión (credentials: 'include')
   *  - si la sesión expiró (401), redirige al login
   *  - parsea JSON y lanza un Error con el mensaje del backend si algo falla
   */
  function apiFetch(url, opciones) {
    opciones = opciones || {};
    opciones.credentials = 'include';

    return fetch(url, opciones).then(function (res) {
      if (res.status === 401) {
        window.location.href = '/admin/login';
        return Promise.reject(new Error('Sesión expirada.'));
      }
      if (res.status === 204) return null;

      return res.json().then(function (data) {
        if (!res.ok) {
          throw new Error(data.error || 'Ocurrió un error inesperado.');
        }
        return data;
      });
    });
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  function formatPEN(n) {
    if (typeof n !== 'number') return '';
    var hasDecimals = Math.round(n * 100) % 100 !== 0;
    return 'S/ ' + n.toLocaleString('es-PE', {
      minimumFractionDigits: hasDecimals ? 2 : 0,
      maximumFractionDigits: 2
    });
  }

  global.Admin = {
    showToast: showToast,
    apiFetch: apiFetch,
    escapeHtml: escapeHtml,
    formatPEN: formatPEN
  };
})(window);
