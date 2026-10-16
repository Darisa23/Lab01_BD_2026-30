// Rutas para consulta administrativa del historial de devoluciones

const express = require('express');
const router = express.Router();
const { query } = require('express-validator');

const prestamosController = require('../controllers/prestamos.controller');
const { autenticar } = require('../middlewares/auth');
const { permitirPersonal } = require('../middlewares/roles');
const { validarCampos } = require('../middlewares/validar');
const asyncHandler = require('../utils/asyncHandler');

const validacionFiltros = [
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

// GET /api/devoluciones (Personal)
router.get(
  '/',
  autenticar,
  permitirPersonal,
  validacionFiltros,
  asyncHandler(prestamosController.listarDevoluciones)
);

module.exports = router;
