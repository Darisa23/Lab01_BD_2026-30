// Rutas para consulta de categorías

const express = require('express');
const router = express.Router();
const librosController = require('../controllers/libros.controller');
const { autenticar } = require('../middlewares/auth');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/categorias (Autenticado)
router.get('/', autenticar, asyncHandler(librosController.listarCategorias));

module.exports = router;
