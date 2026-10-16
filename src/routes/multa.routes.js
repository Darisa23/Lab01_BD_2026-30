// Rutas para consulta y configuración de tarifas de multa

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const multaController = require('../controllers/multa.controller');
const { autenticar } = require('../middlewares/auth');
const { permitirPersonal, permitirSoloAdmin } = require('../middlewares/roles');
const { validarCampos } = require('../middlewares/validar');
const asyncHandler = require('../utils/asyncHandler');

const validacionNuevaTarifa = [
  body('valor_por_dia')
    .notEmpty()
    .withMessage('El valor por día es obligatorio.')
    .isFloat({ min: 0 })
    .withMessage('El valor por día debe ser un número mayor o igual a 0.'),
  validarCampos
];

// GET /api/multa - Tarifa activa actual (Cualquier usuario autenticado)
router.get('/', autenticar, asyncHandler(multaController.obtenerTarifaActiva));

// GET /api/multa/historial - Historial de todas las tarifas (Personal)
router.get('/historial', autenticar, permitirPersonal, asyncHandler(multaController.listarHistorialTarifas));

// POST /api/multa - Actualizar tarifa activa (Solo Administrador)
router.post('/', autenticar, permitirSoloAdmin, validacionNuevaTarifa, asyncHandler(multaController.establecerNuevaTarifa));

module.exports = router;
