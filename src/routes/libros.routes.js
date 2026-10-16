// Rutas para consulta y administración del catálogo de libros

const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');

const librosController = require('../controllers/libros.controller');
const { autenticar } = require('../middlewares/auth');
const { permitirPersonal } = require('../middlewares/roles');
const { validarCampos } = require('../middlewares/validar');
const asyncHandler = require('../utils/asyncHandler');

// Validaciones para creación y actualización de libros
const validacionesLibro = [
  body('isbn')
    .trim()
    .notEmpty()
    .withMessage('El código ISBN es obligatorio.')
    .isLength({ max: 20 })
    .withMessage('El ISBN no puede superar los 20 caracteres.'),
  body('titulo')
    .trim()
    .notEmpty()
    .withMessage('El título es obligatorio.')
    .isLength({ max: 255 })
    .withMessage('El título no puede superar los 255 caracteres.'),
  body('editorial')
    .trim()
    .notEmpty()
    .withMessage('La editorial es obligatoria.')
    .isLength({ max: 150 })
    .withMessage('La editorial no puede superar los 150 caracteres.'),
  body('anio_publicacion')
    .notEmpty()
    .withMessage('El año de publicación es obligatorio.')
    .isInt({ min: 1000, max: 2100 })
    .withMessage('El año de publicación debe ser un número entero entre 1000 y 2100.'),
  body('descripcion')
    .optional({ nullable: true })
    .isString()
    .withMessage('La descripción debe ser un texto.'),
  body('autores')
    .isArray({ min: 1 })
    .withMessage('Debe proporcionar un arreglo con al menos un autor.')
    .custom((autores) => {
      for (const a of autores) {
        if (typeof a !== 'string' || a.trim().length === 0) {
          throw new Error('Cada autor debe ser un nombre de texto no vacío.');
        }
        if (a.trim().length > 150) {
          throw new Error('El nombre del autor no puede exceder los 150 caracteres.');
        }
      }
      return true;
    }),
  body('categorias')
    .optional({ nullable: true })
    .isArray()
    .withMessage('Las categorías deben enviarse en formato de arreglo de nombres.')
    .custom((categorias) => {
      if (categorias) {
        for (const c of categorias) {
          if (typeof c !== 'string' || c.trim().length === 0) {
            throw new Error('Cada categoría debe ser un texto no vacío.');
          }
          if (c.trim().length > 100) {
            throw new Error('El nombre de la categoría no puede superar los 100 caracteres.');
          }
        }
      }
      return true;
    }),
  validarCampos
];

// Validación de parámetro id numérico
const validacionIdLibro = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('El identificador del libro debe ser un número entero positivo.'),
  validarCampos
];

// Validación de filtros de listado
const validacionListado = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('El número de página debe ser un entero positivo.'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('El límite debe ser un entero entre 1 y 100.'),
  validarCampos
];

// Rutas de libros
router.get('/', autenticar, validacionListado, asyncHandler(librosController.listarLibros));
router.get('/:id', autenticar, validacionIdLibro, asyncHandler(librosController.obtenerLibroPorId));

// Rutas protegidas para personal de biblioteca (bibliotecario / administrador)
router.post('/', autenticar, permitirPersonal, validacionesLibro, asyncHandler(librosController.crearLibro));
router.put('/:id', autenticar, permitirPersonal, validacionIdLibro, validacionesLibro, asyncHandler(librosController.actualizarLibro));
router.delete('/:id', autenticar, permitirPersonal, validacionIdLibro, asyncHandler(librosController.eliminarLibro));

module.exports = router;
