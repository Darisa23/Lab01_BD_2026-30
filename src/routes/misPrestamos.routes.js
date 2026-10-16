// Ruta para que el usuario lector consulte su propio historial de préstamos

const express = require('express');
const router = express.Router();
const { query } = require('express-validator');

const usuariosController = require('../controllers/usuarios.controller');
const { autenticar } = require('../middlewares/auth');
const { permitirSoloUsuario } = require('../middlewares/roles');
const { validarCampos } = require('../middlewares/validar');
const asyncHandler = require('../utils/asyncHandler');

const validacionFiltros = [
  query('estado')
    .optional()
    .isIn(['solicitado', 'aprobado', 'rechazado', 'devuelto', 'perdido'])
    .withMessage("El filtro estado debe ser 'solicitado', 'aprobado', 'rechazado', 'devuelto' o 'perdido'."),
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

// GET /api/mis-prestamos (Exclusivo para usuarios autenticados: estudiantes / docentes)
router.get(
  '/',
  autenticar,
  permitirSoloUsuario,
  validacionFiltros,
  asyncHandler(usuariosController.obtenerMisPrestamos)
);

module.exports = router;
