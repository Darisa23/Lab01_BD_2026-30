# Backend - Sistema de Préstamo y Devolución de Libros

API REST completa para la gestión de préstamos, devoluciones, catálogo y multas de una biblioteca universitaria, construida sobre **Node.js**, **Express** y **PostgreSQL** alojado en **Supabase**.

---

## 1. Requisitos Previos

- **Node.js** v18.0.0 o superior
- **npm** v9.0.0 o superior
- Una base de datos PostgreSQL en Supabase con el esquema del sistema ya cargado (tablas, triggers, vistas y funciones).

---

## 2. Instalación

1. Clone o abra la carpeta del proyecto en su terminal:
   ```bash
   cd biblioteca-backend
   ```

2. Instale las dependencias del proyecto:
   ```bash
   npm install
   ```

---

## 3. Configuración de Variables de Entorno (`.env`)

Copie el archivo de ejemplo para crear su archivo de configuración local:
```bash
cp .env.example .env
```

Abra el archivo `.env` y ajuste los valores correspondientes:

```env
PORT=3000
DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-1-us-west-2.pooler.supabase.com:5432/postgres
JWT_SECRET=clave_secreta_super_segura_para_firmar_tokens_jwt_2026
JWT_EXPIRES_IN=8h
BCRYPT_ROUNDS=10
DIAS_PRESTAMO=7
CORS_ORIGIN=*
```

### Cómo obtener la cadena de conexión de Supabase (Session Pooler)

> **IMPORTANTE (IPv6 vs IPv4):** En muchos proveedores de internet locales y redes empresariales, la conexión directa a Supabase (`db.[ref].supabase.co:5432`) falla por falta de soporte de IPv6. Para evitar errores de conexión como `ETIMEDOUT` o `ENOTFOUND`:

1. Ingrese a su panel de control en [Supabase](https://supabase.com/dashboard).
2. Seleccione su proyecto y navegue a **Project Settings** > **Database**.
3. Diríjase a la sección **Connection Pooling** (o **Connection string**).
4. Seleccione el método **Session** (puerto `5432`) o **Transaction** (puerto `6543`). Para este backend que usa transacciones SQL manuales (`BEGIN / COMMIT / ROLLBACK`), **use el Session pooler** en el puerto `5432`.
5. Copie la URI, que tendrá una estructura similar a:
   ```
   postgresql://postgres.[PROJECT_REF]:[TU_CONTRASEÑA]@aws-0-[REGION].pooler.supabase.com:5432/postgres
   ```
6. Reemplace `[TU_CONTRASEÑA]` con la contraseña de su base de datos y péguela en la variable `DATABASE_URL` de su `.env`.

---

## 4. Creación del Primer Administrador

Dado que el registro público `/api/auth/registro` solo crea usuarios con rol de lector (`estudiante` o `docente`), el sistema provee un script de línea de comandos para inicializar o restablecer la cuenta del primer administrador del sistema:

```bash
node scripts/crear-admin.js "Alexander Sanguino" "admin@universidad.edu.co" "MiClaveSegura123*"
```

También puede ejecutarlo pasando parámetros nombrados:
```bash
node scripts/crear-admin.js --nombre="Admin General" --correo="admin@biblioteca.edu" --password="PasswordAdmin2026*"
```

El script hashea la contraseña con `bcryptjs` y ejecuta un `UPSERT` en la tabla `bibliotecarios`, garantizando que la cuenta quede con rol `administrador` y estado `activo`.

---

## 5. Ejecución del Servidor

### Modo Desarrollo (con reinicio automático al guardar cambios):
```bash
npm run dev
```

### Modo Producción:
```bash
npm start
```

Al iniciar, el servidor verifica de forma automática la conectividad con la base de datos PostgreSQL antes de abrir el puerto HTTP:
```
[SISTEMA] Iniciando servidor de la biblioteca...
[BD CONECTADA] Conectado exitosamente a: postgres (2026-10-16 01:30:00.000000+00)
[SISTEMA] API REST operativa y escuchando en el puerto 3000
[SISTEMA] Endpoint de comprobación: http://localhost:3000/api/health
```

---

## 6. Verificación y Pruebas Rápidas

### 6.1 Comprobación de Salud (Público)
```bash
curl -X GET http://localhost:3000/api/health
```
**Respuesta esperada:**
```json
{
  "ok": true,
  "data": {
    "estado": "operativo",
    "bd": "conectada",
    "timestamp": "2026-10-16T01:35:00.000Z"
  }
}
```

### 6.2 Inicio de Sesión de Personal (Administrador)
```bash
curl -X POST http://localhost:3000/api/auth/login-personal \
  -H "Content-Type: application/json" \
  -d '{
    "correo": "admin@universidad.edu.co",
    "password": "MiClaveSegura123*"
  }'
```

Copie el `token` devuelto en la respuesta para utilizarlo en las cabeceras de peticiones protegidas:
```bash
export TOKEN="TU_TOKEN_JWT"
```

### 6.3 Consulta del Catálogo de Libros
```bash
curl -X GET "http://localhost:3000/api/libros?disponible=true" \
  -H "Authorization: Bearer $TOKEN"
```

### 6.4 Registro de un Libro con Autores y Categorías (Transaccional)
```bash
curl -X POST http://localhost:3000/api/libros \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "isbn": "978-0132350884",
    "titulo": "Clean Code",
    "editorial": "Prentice Hall",
    "anio_publicacion": 2008,
    "descripcion": "Manual de estilo para desarrollo ágil de software",
    "autores": ["Robert C. Martin"],
    "categorias": ["Ingeniería de Software", "Programación"]
  }'
```

### 6.5 Configuración de la Tarifa de Multa por Día
```bash
curl -X POST http://localhost:3000/api/multa \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "valor_por_dia": 2000.00
  }'
```

---

## 7. Estructura del Proyecto

```
biblioteca-backend/
├── package.json
├── .env.example
├── README.md
├── docs/
│   └── API.md                       # Especificación completa de endpoints para el frontend
├── scripts/
│   └── crear-admin.js               # CLI para creación del administrador principal
└── src/
    ├── server.js                    # Arranque y comprobación de conectividad a BD
    ├── app.js                       # Express, Helmet, CORS dinámico, JSON parsers y rutas
    ├── config/
    │   ├── env.js                   # Validación estricta de variables de entorno
    │   └── db.js                    # Pool pg, type parsers (DATE, NUMERIC, BIGINT) y withTransaction
    ├── middlewares/
    │   ├── auth.js                  # Middleware para autenticación por token JWT Bearer
    │   ├── roles.js                 # Control de acceso basado en tipo de cuenta y rol
    │   ├── validar.js               # Manejo de resultados de express-validator
    │   ├── errorHandler.js          # Traducción de errores PG a JSON amigable en español
    │   └── notFound.js              # Manejador de rutas 404
    ├── controllers/
    │   ├── auth.controller.js       # Registro, logins y /me
    │   ├── libros.controller.js     # Catálogo en v_catalogo, libros, autores y categorías
    │   ├── ejemplares.controller.js # Inventario físico y control de estados
    │   ├── usuarios.controller.js   # Gestión de lectores e historial v_historial_prestamos_usuario
    │   ├── bibliotecarios.controller.js # Gestión de personal bibliotecario
    │   ├── prestamos.controller.js  # Flujo de préstamos y devoluciones
    │   ├── multa.controller.js      # Tarifas de multa diaria
    │   └── reportes.controller.js   # Reportes estadísticos analíticos
    ├── routes/
    │   ├── auth.routes.js
    │   ├── libros.routes.js
    │   ├── autores.routes.js
    │   ├── categorias.routes.js
    │   ├── ejemplares.routes.js
    │   ├── usuarios.routes.js
    │   ├── misPrestamos.routes.js
    │   ├── bibliotecarios.routes.js
    │   ├── prestamos.routes.js
    │   ├── devoluciones.routes.js
    │   ├── multa.routes.js
    │   ├── reportes.routes.js
    │   └── index.js                 # Enrutador principal montado en /api
    └── utils/
        ├── asyncHandler.js          # Envoltorio para controladores asíncronos
        ├── respuestas.js            # Respuestas HTTP uniformes (éxito, paginada, error)
        ├── paginacion.js            # Helpers para paginación y metadatos
        └── erroresPg.js             # Mapeo y traducción de errores de PostgreSQL
```

---

## 8. Documentación Detallada de la API

Consulte el archivo [`docs/API.md`](docs/API.md) para acceder a la especificación técnica completa de cada endpoint, esquemas JSON de petición/respuesta y códigos de error para el equipo de frontend.
