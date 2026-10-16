// Rutas para la gestión de bibliotecarios y administradores (Exclusivo Administrador)

const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');

const bibliotecariosController = require('../controllers/bibliotecarios.controller');
const { autenticar } = require('../middlewares/auth');
const { permitirSoloAdmin } = require('../middlewares/roles');
const { validarCampos } = require('../middlewares/validar');
const asyncHandler = require('../utils/asyncHandler');

// Todos los endpoints de este recurso están estrictamente restringidos al Administrador
router.use(autenticar, permitirSoloAdmin);

// Validaciones
const validacionesCrear = [
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
    .withMessage('Debe proporcionar una dirección de correo válida.')
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
    .isIn(['administrador', 'bibliotecario'])
    .withMessage("El rol debe ser estrictamente 'administrador' o 'bibliotecario'."),
  body('estado')
    .optional()
    .isIn(['activo', 'inactivo'])
    .withMessage("El estado debe ser 'activo' o 'inactivo'."),
  validarCampos
];

const validacionCambiarEstado = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('El ID de bibliotecario debe ser un entero positivo.'),
  body('estado')
    .notEmpty()
    .withMessage('El nuevo estado es requerido.')
    .isIn(['activo', 'inactivo'])
    .withMessage("El estado debe ser estrictamente 'activo' o 'inactivo'."),
  validarCampos
];

// Rutas
router.get('/', asyncHandler(bibliotecariosController.listarBibliotecarios));
router.post('/', validacionesCrear, asyncHandler(bibliotecariosController.crearBibliotecario));
router.patch('/:id/estado', validacionCambiarEstado, asyncHandler(bibliotecariosController.cambiarEstadoBibliotecario));

module.exports = router;
