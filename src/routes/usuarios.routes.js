// Rutas para la gestión administrativa de usuarios lectores (Personal)

const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');

const usuariosController = require('../controllers/usuarios.controller');
const { autenticar } = require('../middlewares/auth');
const { permitirPersonal } = require('../middlewares/roles');
const { validarCampos } = require('../middlewares/validar');
const asyncHandler = require('../utils/asyncHandler');

// Todo el CRUD de usuarios es exclusivo para personal de la biblioteca
router.use(autenticar, permitirPersonal);

// Validaciones
const validacionesCrearUsuario = [
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
    .withMessage('Debe proporcionar un correo electrónico válido.')
    .isLength({ max: 150 })
    .withMessage('El correo no puede superar los 150 caracteres.'),
  body('password')
    .notEmpty()
    .withMessage('La contraseña es obligatoria.')
    .isLength({ min: 6 })
    .withMessage('La contraseña debe tener un mínimo de 6 caracteres.'),
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
  body('estado')
    .optional()
    .isIn(['activo', 'bloqueado'])
    .withMessage("El estado debe ser 'activo' o 'bloqueado'."),
  validarCampos
];

const validacionesActualizarUsuario = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('El identificador de usuario debe ser un número entero positivo.'),
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
    .withMessage('Debe proporcionar un correo electrónico válido.')
    .isLength({ max: 150 })
    .withMessage('El correo no puede superar los 150 caracteres.'),
  body('password')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ min: 6 })
    .withMessage('Si se actualiza la contraseña, debe contener al menos 6 caracteres.'),
  body('rol')
    .notEmpty()
    .withMessage('El rol es obligatorio.')
    .isIn(['estudiante', 'docente'])
    .withMessage("El rol debe ser 'estudiante' o 'docente'."),
  body('carrera')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('La carrera no puede superar los 100 caracteres.'),
  body('estado')
    .notEmpty()
    .withMessage('El estado es obligatorio.')
    .isIn(['activo', 'bloqueado'])
    .withMessage("El estado debe ser 'activo' o 'bloqueado'."),
  validarCampos
];

const validacionCambiarEstado = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('El ID de usuario debe ser un entero positivo.'),
  body('estado')
    .notEmpty()
    .withMessage('El estado es obligatorio.')
    .isIn(['activo', 'bloqueado'])
    .withMessage("El estado debe ser estrictamente 'activo' o 'bloqueado'."),
  validarCampos
];

const validacionIdParam = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('El ID de usuario debe ser un número entero positivo.'),
  validarCampos
];

const validacionFiltros = [
  query('rol')
    .optional()
    .isIn(['estudiante', 'docente'])
    .withMessage("El filtro rol debe ser 'estudiante' o 'docente'."),
  query('estado')
    .optional()
    .isIn(['activo', 'bloqueado'])
    .withMessage("El filtro estado debe ser 'activo' o 'bloqueado'."),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('El número de página debe ser un entero positivo.'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('El límite debe estar entre 1 y 100.'),
  validarCampos
];

// Rutas
router.get('/', validacionFiltros, asyncHandler(usuariosController.listarUsuarios));
router.get('/:id', validacionIdParam, asyncHandler(usuariosController.obtenerUsuarioPorId));
router.post('/', validacionesCrearUsuario, asyncHandler(usuariosController.crearUsuario));
router.put('/:id', validacionesActualizarUsuario, asyncHandler(usuariosController.actualizarUsuario));
router.patch('/:id/estado', validacionCambiarEstado, asyncHandler(usuariosController.cambiarEstadoUsuario));
router.delete('/:id', validacionIdParam, asyncHandler(usuariosController.eliminarUsuario));
router.get('/:id/historial', validacionIdParam, asyncHandler(usuariosController.obtenerHistorialUsuario));

module.exports = router;
