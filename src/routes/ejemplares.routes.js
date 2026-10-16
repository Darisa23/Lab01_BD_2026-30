// Rutas para la gestión física de ejemplares de libros (Personal)

const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');

const ejemplaresController = require('../controllers/ejemplares.controller');
const { autenticar } = require('../middlewares/auth');
const { permitirPersonal } = require('../middlewares/roles');
const { validarCampos } = require('../middlewares/validar');
const asyncHandler = require('../utils/asyncHandler');

// Todas las rutas de ejemplares son exclusivas para el personal de la biblioteca
router.use(autenticar, permitirPersonal);

// Validaciones
const validacionCrearEjemplar = [
  body('id_libro')
    .notEmpty()
    .withMessage('El id_libro es obligatorio.')
    .isInt({ min: 1 })
    .withMessage('El id_libro debe ser un entero positivo.'),
  body('codigo_barras')
    .trim()
    .notEmpty()
    .withMessage('El código de barras es obligatorio.')
    .isLength({ max: 50 })
    .withMessage('El código de barras no puede superar los 50 caracteres.'),
  body('sala')
    .trim()
    .notEmpty()
    .withMessage('La sala de ubicación es obligatoria.')
    .isLength({ max: 50 })
    .withMessage('La sala no puede superar los 50 caracteres.'),
  body('estante')
    .trim()
    .notEmpty()
    .withMessage('El estante de ubicación es obligatorio.')
    .isLength({ max: 50 })
    .withMessage('El estante no puede superar los 50 caracteres.'),
  body('estado')
    .optional()
    .isIn(['disponible', 'perdido'])
    .withMessage("En el registro manual solo se permite el estado 'disponible' o 'perdido'."),
  validarCampos
];

const validacionActualizarEjemplar = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('El identificador del ejemplar debe ser un entero positivo.'),
  body('codigo_barras')
    .trim()
    .notEmpty()
    .withMessage('El código de barras es obligatorio.')
    .isLength({ max: 50 })
    .withMessage('El código de barras no puede superar los 50 caracteres.'),
  body('sala')
    .trim()
    .notEmpty()
    .withMessage('La sala es obligatoria.')
    .isLength({ max: 50 })
    .withMessage('La sala no puede superar los 50 caracteres.'),
  body('estante')
    .trim()
    .notEmpty()
    .withMessage('El estante es obligatorio.')
    .isLength({ max: 50 })
    .withMessage('El estante no puede superar los 50 caracteres.'),
  body('estado')
    .optional()
    .isIn(['disponible', 'perdido'])
    .withMessage("Solo se puede asignar manualmente el estado 'disponible' o 'perdido'."),
  validarCampos
];

const validacionCambiarEstado = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('El identificador del ejemplar debe ser un entero positivo.'),
  body('estado')
    .notEmpty()
    .withMessage('El campo estado es requerido.')
    .isIn(['disponible', 'perdido'])
    .withMessage("El nuevo estado debe ser estrictamente 'disponible' o 'perdido'."),
  validarCampos
];

const validacionIdParam = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('El identificador del ejemplar debe ser un número entero positivo.'),
  validarCampos
];

const validacionFiltros = [
  query('id_libro')
    .optional()
    .isInt({ min: 1 })
    .withMessage('El filtro id_libro debe ser un entero positivo.'),
  query('estado')
    .optional()
    .isIn(['disponible', 'prestado', 'perdido'])
    .withMessage("El filtro estado debe ser 'disponible', 'prestado' o 'perdido'."),
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
router.get('/', validacionFiltros, asyncHandler(ejemplaresController.listarEjemplares));
router.get('/:id', validacionIdParam, asyncHandler(ejemplaresController.obtenerEjemplarPorId));
router.post('/', validacionCrearEjemplar, asyncHandler(ejemplaresController.crearEjemplar));
router.put('/:id', validacionActualizarEjemplar, asyncHandler(ejemplaresController.actualizarEjemplar));
router.patch('/:id/estado', validacionCambiarEstado, asyncHandler(ejemplaresController.cambiarEstadoEjemplar));
router.delete('/:id', validacionIdParam, asyncHandler(ejemplaresController.eliminarEjemplar));

module.exports = router;
