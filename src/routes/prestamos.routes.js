// Rutas del ciclo de vida de préstamos y devoluciones

const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');

const prestamosController = require('../controllers/prestamos.controller');
const { autenticar } = require('../middlewares/auth');
const { permitirPersonal, permitirSoloUsuario } = require('../middlewares/roles');
const { validarCampos } = require('../middlewares/validar');
const asyncHandler = require('../utils/asyncHandler');

// Validaciones
const validacionSolicitud = [
  body('id_ejemplar')
    .notEmpty()
    .withMessage('El id_ejemplar es obligatorio.')
    .isInt({ min: 1 })
    .withMessage('El id_ejemplar debe ser un entero positivo.'),
  validarCampos
];

const validacionPrestamoDirecto = [
  body('id_usuario')
    .notEmpty()
    .withMessage('El id_usuario es obligatorio.')
    .isInt({ min: 1 })
    .withMessage('El id_usuario debe ser un entero positivo.'),
  body('id_ejemplar')
    .notEmpty()
    .withMessage('El id_ejemplar es obligatorio.')
    .isInt({ min: 1 })
    .withMessage('El id_ejemplar debe ser un entero positivo.'),
  validarCampos
];

const validacionRechazo = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('El identificador del préstamo debe ser un entero positivo.'),
  body('motivo_rechazo')
    .trim()
    .notEmpty()
    .withMessage('El motivo de rechazo es estrictamente obligatorio.'),
  validarCampos
];

const validacionDevolucion = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('El identificador del préstamo debe ser un entero positivo.'),
  body('danado')
    .optional()
    .isBoolean()
    .withMessage('El campo danado debe ser booleano (true o false).'),
  body('paginas_faltantes')
    .optional()
    .isBoolean()
    .withMessage('El campo paginas_faltantes debe ser booleano (true o false).'),
  body('observaciones')
    .optional({ nullable: true })
    .isString()
    .withMessage('Las observaciones deben ser texto.'),
  validarCampos
];

const validacionIdParam = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('El identificador del préstamo debe ser un número entero positivo.'),
  validarCampos
];

const validacionFiltros = [
  query('estado')
    .optional()
    .isIn(['solicitado', 'aprobado', 'rechazado', 'devuelto', 'perdido'])
    .withMessage("El filtro estado debe ser 'solicitado', 'aprobado', 'rechazado', 'devuelto' o 'perdido'."),
  query('id_usuario')
    .optional()
    .isInt({ min: 1 })
    .withMessage('El filtro id_usuario debe ser un entero positivo.'),
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

// 1. Solicitar préstamo (Lector autenticado)
router.post(
  '/',
  autenticar,
  permitirSoloUsuario,
  validacionSolicitud,
  asyncHandler(prestamosController.solicitarPrestamo)
);

// 2. Préstamo directo en mostrador (Personal)
router.post(
  '/directo',
  autenticar,
  permitirPersonal,
  validacionPrestamoDirecto,
  asyncHandler(prestamosController.prestamoDirecto)
);

// 3. Listar préstamos con filtros (Personal)
router.get(
  '/',
  autenticar,
  permitirPersonal,
  validacionFiltros,
  asyncHandler(prestamosController.listarPrestamos)
);

// 4. Detalle de préstamo por ID (Personal o el propio dueño)
router.get(
  '/:id',
  autenticar,
  validacionIdParam,
  asyncHandler(prestamosController.obtenerPrestamoPorId)
);

// 5. Aprobar solicitud de préstamo (Personal)
router.patch(
  '/:id/aprobar',
  autenticar,
  permitirPersonal,
  validacionIdParam,
  asyncHandler(prestamosController.aprobarPrestamo)
);

// 6. Rechazar solicitud de préstamo (Personal)
router.patch(
  '/:id/rechazar',
  autenticar,
  permitirPersonal,
  validacionRechazo,
  asyncHandler(prestamosController.rechazarPrestamo)
);

// 7. Marcar préstamo como perdido (Personal)
router.patch(
  '/:id/perdido',
  autenticar,
  permitirPersonal,
  validacionIdParam,
  asyncHandler(prestamosController.marcarPerdido)
);

// 8. Registrar devolución del préstamo (Personal)
router.post(
  '/:id/devolucion',
  autenticar,
  permitirPersonal,
  validacionDevolucion,
  asyncHandler(prestamosController.registrarDevolucion)
);

module.exports = router;
