// Rutas de autenticación (registro, logins, me) con rate limit y validaciones

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');

const authController = require('../controllers/auth.controller');
const { autenticar } = require('../middlewares/auth');
const { validarCampos } = require('../middlewares/validar');
const asyncHandler = require('../utils/asyncHandler');
const { respuestaError } = require('../utils/respuestas');

// Rate limiter específico para endpoints de inicio de sesión
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 15, // Máximo 15 intentos por ventana de 15 minutos
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return respuestaError(
      res,
      'LIMITE_PETICIONES_SUPERADO',
      'Demasiados intentos de inicio de sesión desde esta dirección IP. Por favor, inténtelo nuevamente en 15 minutos.',
      null,
      429
    );
  }
});

/**
 * Validaciones para registro de usuarios
 */
const validacionesRegistro = [
  body('codigo')
    .trim()
    .notEmpty()
    .withMessage('El código institucional es obligatorio.')
    .isLength({ max: 20 })
    .withMessage('El código no puede superar los 20 caracteres.'),
  body('identificacion')
    .trim()
    .notEmpty()
    .withMessage('La identificación es obligatoria.')
    .isLength({ max: 20 })
    .withMessage('La identificación no puede superar los 20 caracteres.'),
  body('nombres')
    .trim()
    .notEmpty()
    .withMessage('El nombre completo es obligatorio.')
    .isLength({ max: 150 })
    .withMessage('Los nombres no pueden superar los 150 caracteres.'),
  body('correo')
    .trim()
    .notEmpty()
    .withMessage('El correo electrónico es obligatorio.')
    .isEmail()
    .withMessage('Debe proporcionar un correo electrónico con formato válido.')
    .isLength({ max: 150 })
    .withMessage('El correo no puede superar los 150 caracteres.'),
  body('password')
    .notEmpty()
    .withMessage('La contraseña es obligatoria.')
    .isLength({ min: 6 })
    .withMessage('La contraseña debe tener al menos 6 caracteres.'),
  body('rol')
    .notEmpty()
    .withMessage('El rol es obligatorio.')
    .isIn(['estudiante', 'docente'])
    .withMessage("El rol debe ser estrictamente 'estudiante' o 'docente'."),
  body('carrera')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('La carrera no puede superar los 100 caracteres.'),
  validarCampos
];

/**
 * Validaciones para inicio de sesión
 */
const validacionesLogin = [
  body('correo')
    .trim()
    .notEmpty()
    .withMessage('El correo electrónico es requerido.')
    .isEmail()
    .withMessage('El formato de correo electrónico no es válido.'),
  body('password')
    .notEmpty()
    .withMessage('La contraseña es requerida.'),
  validarCampos
];

// Rutas de autenticación
router.post('/registro', validacionesRegistro, asyncHandler(authController.registrarUsuario));
router.post('/login', loginLimiter, validacionesLogin, asyncHandler(authController.loginUsuario));
router.post('/login-personal', loginLimiter, validacionesLogin, asyncHandler(authController.loginPersonal));
router.get('/me', autenticar, asyncHandler(authController.obtenerPerfilActual));

module.exports = router;
