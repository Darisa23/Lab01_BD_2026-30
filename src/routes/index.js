// Enrutador principal de la API (/api)

const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const { respuestaExito } = require('../utils/respuestas');

/**
 * Endpoint de salud y conectividad de la base de datos (Público)
 * GET /api/health
 */
router.get(
  '/health',
  asyncHandler(async (req, res) => {
    await query('SELECT 1');
    return respuestaExito(res, {
      estado: 'operativo',
      bd: 'conectada',
      timestamp: new Date().toISOString()
    });
  })
);

// Módulos de rutas
const authRoutes = require('./auth.routes');
const librosRoutes = require('./libros.routes');
const autoresRoutes = require('./autores.routes');
const categoriasRoutes = require('./categorias.routes');
const ejemplaresRoutes = require('./ejemplares.routes');
const usuariosRoutes = require('./usuarios.routes');
const misPrestamosRoutes = require('./misPrestamos.routes');
const bibliotecariosRoutes = require('./bibliotecarios.routes');
const prestamosRoutes = require('./prestamos.routes');
const devolucionesRoutes = require('./devoluciones.routes');
const multaRoutes = require('./multa.routes');

const reportesRoutes = require('./reportes.routes');

router.use('/auth', authRoutes);
router.use('/libros', librosRoutes);
router.use('/autores', autoresRoutes);
router.use('/categorias', categoriasRoutes);
router.use('/ejemplares', ejemplaresRoutes);
router.use('/usuarios', usuariosRoutes);
router.use('/mis-prestamos', misPrestamosRoutes);
router.use('/bibliotecarios', bibliotecariosRoutes);
router.use('/prestamos', prestamosRoutes);
router.use('/devoluciones', devolucionesRoutes);
router.use('/multa', multaRoutes);
router.use('/reportes', reportesRoutes);

module.exports = router;
