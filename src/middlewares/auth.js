// Middleware para verificar la validez del token JWT

const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { respuestaError } = require('../utils/respuestas');

/**
 * Middleware que verifica el token JWT presente en la cabecera Authorization (Bearer).
 * Extrae y añade los datos del payload decodificado a `req.usuario` ({ id, tipo, rol }).
 */
const autenticar = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return respuestaError(
      res,
      'TOKEN_REQUERIDO',
      'Se requiere un token de autenticación en la cabecera Authorization (formato: Bearer <token>).',
      null,
      401
    );
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);

    // El payload contiene { id, tipo, rol }
    // tipo: 'usuario' o 'personal'
    // rol: 'estudiante'|'docente' (usuario) o 'bibliotecario'|'administrador' (personal)
    req.usuario = {
      id: payload.id,
      tipo: payload.tipo,
      rol: payload.rol
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return respuestaError(
        res,
        'TOKEN_EXPIRADO',
        'El token de autenticación ha expirado. Por favor, inicie sesión nuevamente.',
        null,
        401
      );
    }

    return respuestaError(
      res,
      'TOKEN_INVALIDO',
      'El token de autenticación proporcionado no es válido.',
      null,
      401
    );
  }
};

module.exports = {
  autenticar
};
