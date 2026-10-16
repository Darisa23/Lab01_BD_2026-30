// Rutas para consulta de autores

const express = require('express');
const router = express.Router();
const librosController = require('../controllers/libros.controller');
const { autenticar } = require('../middlewares/auth');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/autores (Autenticado)
router.get('/', autenticar, asyncHandler(librosController.listarAutores));

module.exports = router;
