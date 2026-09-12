/**
 * FERREMAT — CONFIGURACIÓN DEL NEGOCIO
 * ============================================================
 * ÚNICA FUENTE DE DATOS EDITABLES DEL NEGOCIO.
 * No se hardcodean números ni nombres en ningún otro archivo:
 * todo el sitio lee estos valores desde aquí.
 *
 * Para poner el sitio en producción, reemplaza:
 *   1) STORE_INFO.whatsapp   -> número de WhatsApp real de la tienda
 *   2) STORE_INFO.horario    -> horario real de atención
 *   3) STORE_INFO.email      -> correo real de contacto
 *   4) Cada VENDEDOR (name + whatsapp) con los datos reales
 * ============================================================
 */
(function (global) {
  'use strict';

  // ------------------------------------------------------------
  // URL BASE DEL BACKEND / API
  // ------------------------------------------------------------
  // En desarrollo, si sirves este sitio con el mismo Express del backend
  // (SERVE_FRONTEND !== 'false'), puedes dejar esto vacío ('') y las
  // peticiones a /api/... irán al mismo origen automáticamente.
  //
  // Si este sitio se despliega por separado (Nginx, Netlify, un hosting
  // estático, etc.), pon aquí la URL pública completa del backend, ej:
  //   var API_BASE_URL = 'https://api.ferremat.com';
  //   var API_BASE_URL = 'http://localhost:4000';
  //
  // PRODUCCIÓN (backend en Render, frontend en Netlify):
  var API_BASE_URL = 'https://ferremat-backend.onrender.com';

  // ------------------------------------------------------------
  // DATOS GENERALES DE LA TIENDA (placeholders — reemplazar)
  // ------------------------------------------------------------
  var STORE_INFO = {
    nombre: 'FERREMAT CIX',
    aniosNegocio: 4,
    fechaFundacion: '15 de agosto de 2022',
    clientes: '10,000',
    productos: '+1,000',
    direccion: 'Huáscar #484, José Leonardo Ortiz, Chiclayo, Perú',
    // Formato esperado: código de país + número, sin "+" ni espacios
    whatsapp: '51913871385',
    whatsappDisplay: '+51 913 871 385',
    horario: 'Lun a Sáb 8:30 am – 8:00 pm',
    email: 'ferrematcix2829@gmail.com',
    facebook: 'https://www.facebook.com/ferrematcix.pe/',
    instagram: 'https://www.instagram.com/ferrematcix.pe/',
    sedes: [
      { ciudad: 'Chiclayo', direccion: 'Huáscar #484, José Leonardo Ortiz', horario: '8:30 am – 8:00 pm' },
      { ciudad: 'Lima', direccion: 'Riva Agüero #645, Galería Jirón Agucho, El Agustino', horario: '8:00 am – 6:00 pm' }
    ],
    mediosPago: ['Efectivo', 'Yape', 'Transferencia']
  };

  // ------------------------------------------------------------
  // VENDEDORES (8) — nombre y WhatsApp reales proporcionados por el cliente
  // El número va sin "+" ni espacios, ej: "51987654321"
  // Si "whatsapp" queda vacío, el sistema avisa que falta configurar.
  // ------------------------------------------------------------
  var VENDEDORES = [
    { id: 'v1', nombre: 'Naguely Garcia', whatsapp: '51913871385', foto: 'assets/images/vendedores/v1.webp' },
    { id: 'v2', nombre: 'Roxana Marquez', whatsapp: '51913389284', foto: 'assets/images/vendedores/v2.webp' },
    { id: 'v3', nombre: 'Eladio Marquez', whatsapp: '51967413293', foto: 'assets/images/vendedores/v3.webp' },
    { id: 'v4', nombre: 'Brayan Nazaret', whatsapp: '51992921359', foto: 'assets/images/vendedores/v4.webp' },
    { id: 'v5', nombre: 'Kevin Enriquez', whatsapp: '51954205990', foto: 'assets/images/vendedores/v5.webp' },
    { id: 'v6', nombre: 'Luis Zapata', whatsapp: '51979323084', foto: 'assets/images/vendedores/v6.webp' },
    { id: 'v7', nombre: 'Yoniel Quintero', whatsapp: '51959799313', foto: 'assets/images/vendedores/v7.webp' },
    { id: 'v8', nombre: 'Richard Arboleda', whatsapp: '51974136493' }
  ];

  /**
   * Construye el mensaje de WhatsApp a partir de los items de la lista.
   * items: [{ nombre, cantidad }]
   */
  function buildWhatsappMessage(items, vendedorNombre, nombreCliente) {
    var lineas = [];
    lineas.push('Hola' + (nombreCliente ? ' soy ' + nombreCliente.trim() + ',' : ',') + ' quisiera consultar por los siguientes productos:');
    lineas.push('');
    items.forEach(function (item) {
      lineas.push('- ' + item.nombre + ' × ' + item.cantidad);
    });
    lineas.push('');
    lineas.push('Deseo realizar la consulta con ' + vendedorNombre + '.');
    return lineas.join('\n');
  }

  function buildWhatsappUrl(numero, mensaje) {
    var numeroLimpio = (numero || '').replace(/[^0-9]/g, '');
    return 'https://api.whatsapp.com/send?phone=' + numeroLimpio + '&text=' + encodeURIComponent(mensaje);
  }

  global.FERREMAT_CONFIG = {
    API_BASE_URL: API_BASE_URL,
    STORE_INFO: STORE_INFO,
    VENDEDORES: VENDEDORES,
    buildWhatsappMessage: buildWhatsappMessage,
    buildWhatsappUrl: buildWhatsappUrl
  };
})(window);
