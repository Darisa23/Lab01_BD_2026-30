# Documentación de la API REST - Sistema de Préstamo de Libros

Bienvenido a la documentación de la API REST del Sistema de Biblioteca Universitaria. Esta guía está diseñada para que el equipo de frontend pueda consumir de manera consistente, predecible y segura todos los recursos del backend.

---

## 1. Convenciones Globales

- **URL Base:** `http://localhost:3000/api`
- **Formato de Comunicación:** JSON en cuerpos de petición (`Content-Type: application/json`) y respuestas.
- **Autenticación:** Cabecera HTTP `Authorization: Bearer <TOKEN_JWT>`.

### Formato Estándar de Respuesta Exitosa

#### Respuesta Simple
```json
{
  "ok": true,
  "data": { ... }
}
```

#### Respuesta Paginada
```json
{
  "ok": true,
  "data": [ ... ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 45
  }
}
```

### Formato Estándar de Errores

```json
{
  "ok": false,
  "error": {
    "codigo": "STRING_CORTO_EN_MAYUSCULAS",
    "mensaje": "Mensaje legible y claro en español.",
    "detalles": [
      {
        "campo": "correo",
        "mensaje": "Debe proporcionar un correo electrónico válido."
      }
    ]
  }
}
```

---

## 2. Códigos de Estado HTTP

| Código | Significado | Escenario de Uso |
|---|---|---|
| **200 OK** | Éxito | Consultas y actualizaciones exitosas. |
| **201 Created** | Creado | Creación exitosa de recursos (libros, usuarios, préstamos, devoluciones). |
| **400 Bad Request** | Datos Inválidos | Errores de validación de campos, JSON malformado o reglas CHECK violadas. |
| **401 Unauthorized** | No Autenticado | Token JWT ausente, expirado o con firma inválida; credenciales erróneas. |
| **403 Forbidden** | Acceso Denegado | Rol insuficiente para el recurso (ej. estudiante intentando crear libros). |
| **404 Not Found** | No Encontrado | El recurso solicitado por ID no existe en la base de datos. |
| **409 Conflict** | Conflicto de Negocio | Violación de restricciones únicas, triggers de negocio o estados incompatibles. |
| **429 Too Many Requests** | Límite Superado | Rate limit excedido en endpoints de inicio de sesión. |
| **500 Internal Error** | Error del Servidor | Error no controlado interno (no expone detalles técnicos sensibles). |

---

## 3. Matriz de Roles y Permisos

| Rol | Tipo de Cuenta | Alcance |
|---|---|---|
| `estudiante` / `docente` | `usuario` | Catálogo de libros, tarifa activa, solicitar préstamos, ver su propio historial (`/mis-prestamos`). |
| `bibliotecario` | `personal` | Gestión completa de libros, inventario de ejemplares, lectores, préstamos, devoluciones y reportes. |
| `administrador` | `personal` | Todos los permisos del bibliotecario + gestión de cuentas de personal y actualización de tarifa de multa. |

---

## 4. Tabla de Endpoints

### 4.1 Salud del Sistema
| Método | Endpoint | Permisos | Descripción |
|---|---|---|---|
| `GET` | `/health` | Público | Comprueba la conectividad de la base de datos (`SELECT 1`). |

---

### 4.2 Autenticación (`/auth`)
| Método | Endpoint | Permisos | Body Requerido | Descripción |
|---|---|---|---|---|
| `POST` | `/auth/registro` | Público | `{ codigo, identificacion, nombres, correo, password, rol, carrera? }` | Registro de lectores (`estudiante` o `docente`). Estado siempre `activo`. |
| `POST` | `/auth/login` | Público | `{ correo, password }` | Login de lectores. Retorna `{ token, usuario }`. |
| `POST` | `/auth/login-personal` | Público | `{ correo, password }` | Login de bibliotecarios y administradores. 403 si está inactivo. |
| `GET` | `/auth/me` | Autenticado | Ninguno | Información del usuario autenticado actual. |

---

### 4.3 Catálogo de Libros, Autores y Categorías (`/libros`, `/autores`, `/categorias`)
| Método | Endpoint | Permisos | Query Params / Body | Descripción |
|---|---|---|---|---|
| `GET` | `/libros` | Autenticado | `titulo`, `autor`, `isbn`, `categoria`, `disponible=true`, `page`, `limit` | Consulta el catálogo (`v_catalogo`) con filtros y paginación. |
| `GET` | `/libros/:id` | Autenticado | Ninguno | Detalle completo del libro junto al listado de sus ejemplares físicos. |
| `POST` | `/libros` | Personal | `{ isbn, titulo, editorial, anio_publicacion, descripcion?, autores: [...], categorias?: [...] }` | Crea libro, hace upsert de autores/categorías y los vincula atómicamente. |
| `PUT` | `/libros/:id` | Personal | `{ isbn, titulo, editorial, anio_publicacion, descripcion?, autores: [...], categorias?: [...] }` | Actualiza metadatos y reemplaza vínculos de autores y categorías. |
| `DELETE` | `/libros/:id` | Personal | Ninguno | Elimina libro. Devuelve 409 si cuenta con ejemplares físicos registrados. |
| `GET` | `/autores` | Autenticado | Ninguno | Listado de autores ordenados alfabéticamente para selectores. |
| `GET` | `/categorias` | Autenticado | Ninguno | Listado de categorías ordenadas alfabéticamente para selectores. |

---

### 4.4 Inventario de Ejemplares Físicos (`/ejemplares`)
| Método | Endpoint | Permisos | Body / Query Params | Descripción |
|---|---|---|---|---|
| `GET` | `/ejemplares` | Personal | `id_libro`, `estado`, `codigo_barras`, `page`, `limit` | Listado paginado de ejemplares con título e ISBN del libro. |
| `GET` | `/ejemplares/:id` | Personal | Ninguno | Detalle de un ejemplar físico. |
| `POST` | `/ejemplares` | Personal | `{ id_libro, codigo_barras, sala, estante, estado? }` | Registra ejemplar (solo estado `disponible` o `perdido`). |
| `PUT` | `/ejemplares/:id` | Personal | `{ codigo_barras, sala, estante, estado? }` | Actualiza ubicación y código. 409 si el ejemplar está actualmente `prestado`. |
| `PATCH` | `/ejemplares/:id/estado` | Personal | `{ estado: 'disponible' \| 'perdido' }` | Cambia estado físico. 409 si está actualmente `prestado`. |
| `DELETE` | `/ejemplares/:id` | Personal | Ninguno | Elimina ejemplar. 409 si tiene préstamos registrados. |

---

### 4.5 Lectores y Préstamos Propios (`/usuarios`, `/mis-prestamos`)
| Método | Endpoint | Permisos | Body / Query Params | Descripción |
|---|---|---|---|---|
| `GET` | `/usuarios` | Personal | `q`, `rol`, `estado`, `page`, `limit` | Búsqueda general (`q`) y filtros en el padrón de lectores. |
| `GET` | `/usuarios/:id` | Personal | Ninguno | Datos del lector (sin `password_hash`). |
| `POST` | `/usuarios` | Personal | `{ codigo, identificacion, nombres, correo, password, rol, carrera?, estado? }` | Alta de lector con estado inicial a elección. |
| `PUT` | `/usuarios/:id` | Personal | `{ codigo, identificacion, nombres, correo, password?, rol, carrera?, estado }` | Actualización de datos (password opcional). |
| `PATCH` | `/usuarios/:id/estado` | Personal | `{ estado: 'activo' \| 'bloqueado' }` | Bloquea o desbloquea a un lector. |
| `DELETE` | `/usuarios/:id` | Personal | Ninguno | Elimina lector. 409 sugiriendo bloquear si tiene préstamos. |
| `GET` | `/usuarios/:id/historial` | Personal | `page`, `limit` | Historial de préstamos del usuario (`v_historial_prestamos_usuario`). |
| `GET` | `/mis-prestamos` | Usuario | `estado?`, `page`, `limit` | Historial propio del lector autenticado actual. |

---

### 4.6 Gestión de Personal Bibliotecario (`/bibliotecarios`)
| Método | Endpoint | Permisos | Body | Descripción |
|---|---|---|---|---|
| `GET` | `/bibliotecarios` | Solo Admin | Ninguno | Lista todo el personal (sin `password_hash`). |
| `POST` | `/bibliotecarios` | Solo Admin | `{ nombres, correo, password, rol, estado? }` | Registra un bibliotecario o administrador. |
| `PATCH` | `/bibliotecarios/:id/estado` | Solo Admin | `{ estado: 'activo' \| 'inactivo' }` | Activa o desactiva la cuenta del personal. |

---

### 4.7 Préstamos y Devoluciones (`/prestamos`, `/devoluciones`)
| Método | Endpoint | Permisos | Body / Query Params | Descripción |
|---|---|---|---|---|
| `POST` | `/prestamos` | Usuario | `{ id_ejemplar }` | Solicita préstamo. 409 si el usuario está bloqueado o ejemplar ocupado. |
| `POST` | `/prestamos/directo` | Personal | `{ id_usuario, id_ejemplar }` | Transacción atómica: solicita y aprueba en mostrador inmediatamente. |
| `GET` | `/prestamos` | Personal | `estado`, `id_usuario`, `page`, `limit` | Lista préstamos con datos de usuario, libro y fechas. |
| `GET` | `/prestamos/:id` | Personal o Dueño | Ninguno | Detalle del préstamo y de su devolución si ya fue entregado. |
| `PATCH` | `/prestamos/:id/aprobar` | Personal | Ninguno | Aprueba préstamo (fija fecha vencimiento según `.env`). Ejemplar pasa a `prestado`. |
| `PATCH` | `/prestamos/:id/rechazar` | Personal | `{ motivo_rechazo }` | Rechaza solicitud indicando motivo obligatorio. |
| `PATCH` | `/prestamos/:id/perdido` | Personal | Ninguno | Marca préstamo como perdido y el ejemplar pasa a `perdido`. |
| `POST` | `/prestamos/:id/devolucion` | Personal | `{ danado?, paginas_faltantes?, observaciones? }` | Registra devolución. Los triggers calculan multa, días de retraso y liberan ejemplar. |
| `GET` | `/devoluciones` | Personal | `page`, `limit` | Listado paginado de devoluciones con desglose de multas. |

---

### 4.8 Tarifas de Multa (`/multa`)
| Método | Endpoint | Permisos | Body | Descripción |
|---|---|---|---|---|
| `GET` | `/multa` | Autenticado | Ninguno | Tarifa de multa por día vigente actualmente. |
| `GET` | `/multa/historial` | Personal | Ninguno | Historial cronológico de tarifas configuradas. |
| `POST` | `/multa` | Solo Admin | `{ valor_por_dia }` | Desactiva la tarifa previa e inserta la nueva tarifa activa en una transacción. |

---

### 4.9 Reportes y Analítica (`/reportes`)
| Método | Endpoint | Permisos | Query Params | Descripción |
|---|---|---|---|---|
| `GET` | `/reportes/prestamos-activos` | Personal | `situacion=vencido\|vigente` | Vista `v_prestamos_activos` clasificada por situación. |
| `GET` | `/reportes/libros-mas-prestados` | Personal | `desde=YYYY-MM-DD`, `hasta=YYYY-MM-DD`, `limit=10` | Función `fn_libros_mas_prestados(desde, hasta)`. |
| `GET` | `/reportes/usuarios-top` | Personal | `limit=10` | Vista `v_usuarios_top` con lectores más frecuentes. |
| `GET` | `/reportes/inventario` | Personal | Ninguno | Vista `v_inventario_estado` (disponible, prestado, perdido). |

---

## 5. Ejemplos de Peticiones y Respuestas

### Registro de Usuario Lector
**`POST /api/auth/registro`**
```json
{
  "codigo": "20261001",
  "identificacion": "1098765432",
  "nombres": "Carlos Mendoza",
  "correo": "cmendoza@universidad.edu.co",
  "password": "PasswordSeguro2026*",
  "rol": "estudiante",
  "carrera": "Ingeniería de Sistemas"
}
```
**Respuesta (HTTP 201 Created):**
```json
{
  "ok": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "usuario": {
      "id_usuario": 14,
      "codigo": "20261001",
      "identificacion": "1098765432",
      "nombres": "Carlos Mendoza",
      "correo": "cmendoza@universidad.edu.co",
      "rol": "estudiante",
      "carrera": "Ingeniería de Sistemas",
      "estado": "activo"
    }
  }
}
```

---

### Consulta de Catálogo con Filtro y Paginación
**`GET /api/libros?disponible=true&page=1&limit=2`**
```json
{
  "ok": true,
  "data": [
    {
      "id_libro": 1,
      "isbn": "978-0132350884",
      "titulo": "Clean Code",
      "editorial": "Prentice Hall",
      "anio_publicacion": 2008,
      "descripcion": "A Handbook of Agile Software Craftsmanship",
      "autores": "Robert C. Martin",
      "categorias": "Ingeniería de Software, Buenas Prácticas",
      "total_ejemplares": 5,
      "ejemplares_disponibles": 3
    }
  ],
  "meta": {
    "page": 1,
    "limit": 2,
    "total": 1
  }
}
```

---

### Registro de Devolución con Multa Calculada por Trigger
**`POST /api/prestamos/8/devolucion`**
```json
{
  "danado": false,
  "paginas_faltantes": false,
  "observaciones": "Entregado en excelente estado físico"
}
```
**Respuesta (HTTP 201 Created):**
```json
{
  "ok": true,
  "data": {
    "id_devolucion": 12,
    "id_prestamo": 8,
    "id_bibliotecario": 2,
    "id_configuracion": 1,
    "fecha_devolucion": "2026-10-16",
    "dias_retraso": 3,
    "tarifa_aplicada": 1500.00,
    "valor_multa": 4500.00,
    "danado": false,
    "paginas_faltantes": false,
    "observaciones": "Entregado en excelente estado físico"
  }
}
```

---

### Ejemplos de Errores Comunes

#### Error de Validación (HTTP 400 Bad Request)
```json
{
  "ok": false,
  "error": {
    "codigo": "DATOS_INVALIDOS",
    "mensaje": "Se encontraron errores de validación en los datos de la solicitud.",
    "detalles": [
      {
        "campo": "correo",
        "mensaje": "Debe proporcionar un correo electrónico con formato válido."
      },
      {
        "campo": "password",
        "mensaje": "La contraseña debe tener al menos 6 caracteres."
      }
    ]
  }
}
```

#### Conflicto por Regla de Trigger de Base de Datos (HTTP 409 Conflict)
```json
{
  "ok": false,
  "error": {
    "codigo": "CONFLICTO_REGLA_NEGOCIO",
    "mensaje": "El ejemplar 4 no está disponible"
  }
}
```

#### Conflicto por Registro en Uso / Llave Foránea RESTRICT (HTTP 409 Conflict)
```json
{
  "ok": false,
  "error": {
    "codigo": "REGISTRO_EN_USO",
    "mensaje": "No es posible eliminar el registro porque tiene préstamos asociados. Para usuarios, se sugiere cambiar su estado a \"bloqueado\" en lugar de eliminarlo."
  }
}
```
