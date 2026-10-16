// Middleware global para manejo y traducción centralizada de errores

const { mapearErrorPg } = require('../utils/erroresPg');
const { respuestaError } = require('../utils/respuestas');

const errorHandler = (err, req, res, next) => {
  // 1. Error de sintaxis en el cuerpo JSON recibido
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return respuestaError(
      res,
      'JSON_INVALIDO',
      'El cuerpo de la solicitud no es un documento JSON válido.',
      null,
      400
    );
  }

  // 2. Errores de token JWT
  if (err.name === 'JsonWebTokenError') {
    return respuestaError(
      res,
      'TOKEN_INVALIDO',
      'El token de autenticación no es válido.',
      null,
      401
    );
  }

  if (err.name === 'TokenExpiredError') {
    return respuestaError(
      res,
      'TOKEN_EXPIRADO',
      'El token de autenticación ha expirado.',
      null,
      401
    );
  }

  // 3. Errores conocidos de PostgreSQL (violaciones de UNIQUE, CHECK, FK, triggers P0001, etc.)
  const errorPg = mapearErrorPg(err);
  if (errorPg) {
    return respuestaError(
      res,
      errorPg.codigo,
      errorPg.mensaje,
      null,
      errorPg.status
    );
  }

  // 4. Errores personalizados con código HTTP definido
  if (err.status || err.statusCode) {
    const statusCode = err.status || err.statusCode;
    const codigo = err.codigo || 'ERROR_SOLICITUD';
    return respuestaError(
      res,
      codigo,
      err.message || 'Error en la solicitud.',
      err.detalles || null,
      statusCode
    );
  }

  // 5. Errores no controlados o inesperados del sistema
  console.error('[ERROR NO CONTROLADO]:', {
    mensaje: err.message,
    pila: err.stack,
    ruta: req.originalUrl,
    metodo: req.method
  });

  return respuestaError(
    res,
    'ERROR_INTERNO',
    'Ocurrió un error interno en el servidor.',
    null,
    500
  );
};

module.exports = errorHandler;
