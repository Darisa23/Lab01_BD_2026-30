// Middleware para capturar y responder ante rutas no encontradas (HTTP 404)

const { respuestaError } = require('../utils/respuestas');

/**
 * Captura solicitudes a rutas no definidas en la API.
 */
const notFound = (req, res) => {
  return respuestaError(
    res,
    'RECURSO_NO_ENCONTRADO',
    `La ruta solicitada '${req.method} ${req.originalUrl}' no existe en este servidor.`,
    null,
    404
  );
};

module.exports = notFound;
