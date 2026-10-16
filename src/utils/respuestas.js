// Estandarización de respuestas HTTP para la API

/**
 * Envía una respuesta de éxito estándar sin paginación.
 * @param {import('express').Response} res - Objeto Response de Express
 * @param {any} data - Datos a devolver
 * @param {number} [codigoHttp=200] - Código de estado HTTP
 */
const respuestaExito = (res, data, codigoHttp = 200) => {
  return res.status(codigoHttp).json({
    ok: true,
    data
  });
};

/**
 * Envía una respuesta de éxito con información de metadatos de paginación.
 * @param {import('express').Response} res - Objeto Response de Express
 * @param {Array} data - Lista de elementos de la página actual
 * @param {object} meta - Objeto con { page, limit, total }
 * @param {number} [codigoHttp=200] - Código de estado HTTP
 */
const respuestaPaginada = (res, data, meta, codigoHttp = 200) => {
  return res.status(codigoHttp).json({
    ok: true,
    data,
    meta: {
      page: meta.page,
      limit: meta.limit,
      total: meta.total
    }
  });
};

/**
 * Envía una respuesta de error estandarizada.
 * @param {import('express').Response} res - Objeto Response de Express
 * @param {string} codigo - Código de error corto en mayúsculas (ej: 'VALIDACION_FALLIDA')
 * @param {string} mensaje - Descripción clara del error en español
 * @param {Array|null} [detalles=null] - Arreglo opcional con detalles específicos
 * @param {number} [codigoHttp=400] - Código de estado HTTP
 */
const respuestaError = (res, codigo, mensaje, detalles = null, codigoHttp = 400) => {
  const errorObj = {
    codigo,
    mensaje
  };

  if (detalles && Array.isArray(detalles) && detalles.length > 0) {
    errorObj.detalles = detalles;
  }

  return res.status(codigoHttp).json({
    ok: false,
    error: errorObj
  });
};

module.exports = {
  respuestaExito,
  respuestaPaginada,
  respuestaError
};
