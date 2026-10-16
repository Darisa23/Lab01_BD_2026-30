// Helpers para cálculo y normalización de parámetros de paginación

/**
 * Normaliza y extrae los parámetros de paginación desde query params.
 * @param {object} query - Objeto req.query de Express
 * @returns {{ page: number, limit: number, offset: number }}
 */
const obtenerParametrosPaginacion = (query = {}) => {
  let page = parseInt(query.page, 10);
  let limit = parseInt(query.limit, 10);

  if (isNaN(page) || page < 1) {
    page = 1;
  }

  if (isNaN(limit) || limit < 1) {
    limit = 20;
  } else if (limit > 100) {
    limit = 100; // Máximo permitido de 100 registros por página
  }

  const offset = (page - 1) * limit;

  return { page, limit, offset };
};

/**
 * Construye el objeto de metadatos de paginación.
 * @param {number} page - Número de página actual
 * @param {number} limit - Límite de elementos por página
 * @param {number} total - Total de elementos coincidentes
 * @returns {{ page: number, limit: number, total: number }}
 */
const construirMetaPaginacion = (page, limit, total) => {
  return {
    page: Number(page),
    limit: Number(limit),
    total: Number(total)
  };
};

module.exports = {
  obtenerParametrosPaginacion,
  construirMetaPaginacion
};
