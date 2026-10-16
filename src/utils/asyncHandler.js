// asi tratamos con funciones asíncronas para capturar excepciones y pasarlas a next()

/**
 * Captura errores de controladores asíncronos y los delega al middleware de errores de Express.
 * @param {Function} fn - Controlador o middleware asíncrono
 * @returns {Function} Middleware de Express
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
