// para control de acceso basado en tipo de cuenta y roles

const { respuestaError } = require('../utils/respuestas');

/**
 * Permite el acceso únicamente a los tipos de cuenta especificados ('usuario', 'personal').
 * @param  {...string} tiposPermitidos - Lista de tipos autorizados
 */
const permitirTipos = (...tiposPermitidos) => (req, res, next) => {
  if (!req.usuario) {
    return respuestaError(res, 'NO_AUTENTICADO', 'Usuario no autenticado.', null, 401);
  }

  if (!tiposPermitidos.includes(req.usuario.tipo)) {
    return respuestaError(
      res,
      'ACCESO_DENEGADO',
      'No tiene los privilegios necesarios para acceder a este recurso.',
      null,
      403
    );
  }

  next();
};

/**
 * Permite el acceso únicamente a los roles especificados dentro de su categoría.
 * @param  {...string} rolesPermitidos - Lista de roles permitidos ('estudiante', 'docente', 'bibliotecario', 'administrador')
 */
const permitirRoles = (...rolesPermitidos) => (req, res, next) => {
  if (!req.usuario) {
    return respuestaError(res, 'NO_AUTENTICADO', 'Usuario no autenticado.', null, 401);
  }

  if (!rolesPermitidos.includes(req.usuario.rol)) {
    return respuestaError(
      res,
      'ACCESO_DENEGADO',
      `Acceso denegado: este recurso requiere uno de los siguientes roles: ${rolesPermitidos.join(', ')}.`,
      null,
      403
    );
  }

  next();
};

/**
 * Acceso exclusivo para personal de la biblioteca (bibliotecario o administrador).
 */
const permitirPersonal = permitirTipos('personal');

/**
 * Acceso exclusivo para administradores del sistema.
 */
const permitirSoloAdmin = (req, res, next) => {
  if (!req.usuario) {
    return respuestaError(res, 'NO_AUTENTICADO', 'Usuario no autenticado.', null, 401);
  }

  if (req.usuario.tipo !== 'personal' || req.usuario.rol !== 'administrador') {
    return respuestaError(
      res,
      'ACCESO_DENEGADO',
      'Acceso denegado: se requieren permisos de Administrador.',
      null,
      403
    );
  }

  next();
};

/**
 * Acceso exclusivo para usuarios de la biblioteca (estudiantes o docentes).
 */
const permitirSoloUsuario = (req, res, next) => {
  if (!req.usuario) {
    return respuestaError(res, 'NO_AUTENTICADO', 'Usuario no autenticado.', null, 401);
  }

  if (req.usuario.tipo !== 'usuario') {
    return respuestaError(
      res,
      'ACCESO_DENEGADO',
      'Acceso denegado: este recurso está destinado únicamente a usuarios lectores (estudiantes o docentes).',
      null,
      403
    );
  }

  next();
};

module.exports = {
  permitirTipos,
  permitirRoles,
  permitirPersonal,
  permitirSoloAdmin,
  permitirSoloUsuario
};
