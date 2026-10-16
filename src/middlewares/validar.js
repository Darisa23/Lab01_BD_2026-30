// para procesar y responder ante errores de validación de express-validator

const { validationResult } = require('express-validator');
const { respuestaError } = require('../utils/respuestas');

/**
 * Valida los resultados de express-validator.
 * Si existen errores de validación, interrumpe el flujo y responde 400 con los detalles por campo.
 */
const validarCampos = (req, res, next) => {
  const errores = validationResult(req);

  if (!errores.isEmpty()) {
    const detalles = errores.array().map((err) => ({
      campo: err.path || err.param,
      mensaje: err.msg
    }));

    return respuestaError(
      res,
      'DATOS_INVALIDOS',
      'Se encontraron errores de validación en los datos de la solicitud.',
      detalles,
      400
    );
  }

  next();
};

module.exports = {
  validarCampos
};
