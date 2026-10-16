// Rutas para reportes y estadísticas de la biblioteca (Personal)

const express = require('express');
const router = express.Router();
const { query } = require('express-validator');

const reportesController = require('../controllers/reportes.controller');
const { autenticar } = require('../middlewares/auth');
const { permitirPersonal } = require('../middlewares/roles');
const { validarCampos } = require('../middlewares/validar');
const asyncHandler = require('../utils/asyncHandler');

// Todos los reportes son de uso exclusivo para personal de la biblioteca
router.use(autenticar, permitirPersonal);

// Validaciones
const validacionPrestamosActivos = [
  query('situacion')
    .optional()
    .isIn(['vencido', 'vigente'])
    .withMessage("El filtro situacion debe ser 'vencido' o 'vigente'."),
  validarCampos
];

const validacionLibrosMasPrestados = [
  query('desde')
    .notEmpty()
    .withMessage("El parámetro de fecha inicial 'desde' es obligatorio.")
    .isISO8601({ strict: true })
    .withMessage("El formato de fecha 'desde' debe ser YYYY-MM-DD."),
  query('hasta')
    .notEmpty()
    .withMessage("El parámetro de fecha final 'hasta' es obligatorio.")
    .isISO8601({ strict: true })
    .withMessage("El formato de fecha 'hasta' debe ser YYYY-MM-DD."),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('El límite debe ser un número entero entre 1 y 100.'),
  validarCampos
];

const validacionUsuariosTop = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('El límite debe ser un número entero entre 1 y 100.'),
  validarCampos
];

// Rutas
router.get(
  '/prestamos-activos',
  validacionPrestamosActivos,
  asyncHandler(reportesController.reportarPrestamosActivos)
);

router.get(
  '/libros-mas-prestados',
  validacionLibrosMasPrestados,
  asyncHandler(reportesController.reportarLibrosMasPrestados)
);

router.get(
  '/usuarios-top',
  validacionUsuariosTop,
  asyncHandler(reportesController.reportarUsuariosTop)
);

router.get(
  '/inventario',
  asyncHandler(reportesController.reportarInventarioEstado)
);

module.exports = router;
