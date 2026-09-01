# Ferremat — Backend + Panel Admin + Sitio Público

Este proyecto agrega un backend (Node.js + Express + PostgreSQL + Prisma) y un
panel de administración al sitio estático de Ferremat, para que el dueño
pueda editar productos, categorías y el menú de navegación **sin tocar
código**.

## Estructura del proyecto

```
ferremat/
├── backend/          Express + Prisma + API REST + panel admin (lógica)
│   ├── prisma/
│   │   ├── schema.prisma   Modelos: Admin, Categoria, Producto, ItemMenu
│   │   └── seed.js         Crea el admin inicial y migra tu catálogo actual
│   └── src/
│       ├── app.js          Configuración de Express
│       ├── server.js       Punto de arranque
│       ├── config/db.js    Cliente Prisma
│       ├── controllers/    Lógica de negocio (auth, productos, categorías, menú)
│       ├── middleware/     Autenticación (JWT) y subida de imágenes (multer)
│       ├── routes/         Definición de endpoints
│       └── uploads/        Imágenes subidas (productos/, categorías/)
├── admin/            Panel de administración (vistas EJS + JS + CSS)
│   ├── views/        Páginas: login, dashboard, productos, categorías, menú
│   └── public/       CSS y JS del panel (habla con la API vía fetch)
└── frontend/         Tu sitio público (adaptado para consumir la API)
    ├── index.html
    └── assets/js/
        ├── config.js         + API_BASE_URL
        ├── products-data.js  Ahora carga el catálogo desde /api
        ├── nav-menu.js       Nuevo: pinta el menú desde /api/menu
        ├── catalog.js        Ajustado para esperar a que cargue la API
        ├── cart.js           Sin cambios
        └── main.js           Sin cambios
```

## 1. Requisitos previos

- Node.js 18 o superior
- PostgreSQL 13 o superior (local o en la nube: Railway, Supabase, Neon, etc.)

## 2. Instalación del backend

```bash
cd backend
npm install
cp .env.example .env
```

Edita `.env` y como mínimo configura:

- `DATABASE_URL` — cadena de conexión a tu PostgreSQL
- `JWT_SECRET` y `SESSION_SECRET` — cualquier texto largo y aleatorio
  (puedes generarlos con `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`)
- `ADMIN_USUARIO` / `ADMIN_PASSWORD` — credenciales del administrador inicial

Luego crea las tablas y genera el cliente de Prisma:

```bash
npx prisma generate
npx prisma migrate dev --name init
```

> **Nota:** `prisma generate` descarga el motor de Prisma desde internet la
> primera vez. Si tu red corporativa bloquea `binaries.prisma.sh`, corre esto
> desde una red sin restricciones, o revisa la documentación de Prisma sobre
> [motores de descarga alternativos](https://www.prisma.io/docs/orm/reference/environment-variables-reference).

### Siembra inicial de datos (recomendado)

El comando de seed crea el usuario administrador **y además migra
automáticamente** las categorías, productos y el menú que hoy están
hardcodeados en tu sitio estático, para que no tengas que volver a
escribirlos a mano:

```bash
npm run seed
```

Es seguro volver a ejecutarlo — no duplica datos si ya existen.

### Levantar el servidor

```bash
npm run dev      # con recarga automática (nodemon)
# o
npm start        # producción
```

Por defecto corre en **http://localhost:4000** y sirve tres cosas en el mismo
proceso:

| URL | Qué es |
|---|---|
| `http://localhost:4000/` | El sitio público (frontend/) — solo en desarrollo, ver sección 5 |
| `http://localhost:4000/admin` | El panel de administración |
| `http://localhost:4000/api/...` | La API REST |

## 3. Primer ingreso al panel admin

1. Ve a `http://localhost:4000/admin/login`
2. Ingresa con el `ADMIN_USUARIO` / `ADMIN_PASSWORD` que pusiste en `.env`
   (o los que quedaron sembrados con `npm run seed`)
3. Desde ahí puedes gestionar Productos, Categorías y Menú de navegación

Internamente, el login guarda una cookie `httpOnly` con un JWT — por eso el
panel admin no necesita que copies ni pegues ningún token a mano.

## 4. Endpoints de la API

### Públicos (sin autenticación)

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/api/productos` | Lista productos. Filtros opcionales: `?categoria=<slug>`, `?nuevo=true`, `?destacado=true`, `?disponible=true\|false`, `?q=texto` |
| GET | `/api/productos/:id` | Un producto |
| GET | `/api/categorias` | Lista categorías (ordenadas por `orden`) |
| GET | `/api/categorias/:id` | Una categoría |
| GET | `/api/menu` | Ítems de menú visibles, ordenados |
| GET | `/api/health` | Chequeo de salud del servicio |

### Protegidos (requieren sesión de admin)

Envía el JWT como cookie (ya la maneja el panel admin) o como header
`Authorization: Bearer <token>` si consumes la API desde otra herramienta.

| Método | Endpoint | Descripción |
|---|---|---|
| POST | `/api/auth/login` | `{ usuario, password }` → devuelve `{ token, admin }` y deja la cookie |
| POST | `/api/auth/logout` | Cierra sesión |
| GET | `/api/auth/me` | Admin autenticado actual |
| POST / PUT / DELETE | `/api/productos[/:id]` | CRUD de productos (multipart/form-data si subes imagen) |
| POST / PUT / DELETE | `/api/categorias[/:id]` | CRUD de categorías |
| POST / PUT / DELETE | `/api/menu[/:id]` | CRUD del menú |
| GET | `/api/menu?todos=true` | (protegido en la práctica vía panel) también trae ítems ocultos |

Los endpoints de creación/edición aceptan **subir un archivo** (campo
`imagen`, multipart/form-data) **o** pegar una URL externa (campo
`imagenUrl`). Si subes un archivo, se guarda en `backend/src/uploads/` y
queda accesible en `/uploads/...`.

## 5. Cómo quedó adaptado el sitio público

El frontend ya **no tiene datos hardcodeados**. Los cambios concretos:

1. **`config.js`** — se agregó `API_BASE_URL`. Si sirves el sitio público
   desde el mismo backend (como en desarrollo, ver más abajo), déjalo vacío
   (`''`). Si lo despliegas aparte (Netlify, Nginx, otro hosting), pon ahí la
   URL pública de tu backend, ej. `https://api.tuferremat.com`.

2. **`products-data.js`** — ya no define `PRODUCTS`/`CATEGORIES` a mano.
   Ahora hace `fetch` a `/api/categorias` y `/api/productos`, arma
   `window.FERREMAT_CATALOG` con la misma forma que antes, y dispara el
   evento `ferremat:catalog-ready` cuando los datos ya están listos.

3. **`catalog.js`** — se ajustó su inicialización para pintar la grilla en
   cuanto ocurre `ferremat:catalog-ready` (antes asumía que los datos ya
   estaban disponibles de inmediato al cargar la página).

4. **`nav-menu.js`** (nuevo) — reemplaza los enlaces del menú del header y
   del menú móvil por los que configures en el panel admin, llamando a
   `/api/menu`. Si la API no responde, el sitio se queda con el menú
   estático que ya tenía como respaldo, para nunca quedarse sin navegación.

5. **`index.html`** — solo se agregó la línea
   `<script src="assets/js/nav-menu.js"></script>`. El resto del HTML/CSS de
   diseño no se tocó.

> **Nota sobre la sección "Categorías" de la portada:** las tarjetas
> visuales grandes de esa sección (con su diseño particular) se dejaron tal
> cual por ahora — son puramente de presentación. Los **datos** de
> categorías (para filtrar productos, mostrar el catálogo, etc.) ya son
> 100% dinámicos desde la base de datos. Si más adelante quieres que esas
> tarjetas también se generen desde `/api/categorias`, es un cambio pequeño
> adicional sobre `index.html` que se puede hacer después.

### Desarrollo: todo en un solo servidor

Por comodidad, mientras `SERVE_FRONTEND` no sea `"false"` en `.env`, el
propio backend sirve la carpeta `frontend/` como sitio estático en `/`. Así
puedes probar todo con un solo `npm run dev` sin preocuparte por CORS.

### Producción: sitio público en otro dominio/hosting

Si vas a alojar el sitio público en otro lugar (por ejemplo, un hosting
estático o Nginx aparte del backend):

1. En `backend/.env`, agrega el dominio del sitio público a `CORS_ORIGIN`
   (separado por comas si son varios).
2. En `frontend/assets/js/config.js`, define `API_BASE_URL` con la URL
   pública de tu backend.
3. Sube la carpeta `frontend/` a tu hosting de preferencia (Nginx, Netlify,
   un bucket S3 con CloudFront, etc.) — es HTML/CSS/JS puro, no necesita
   Node para servirse.
4. Pon `SERVE_FRONTEND=false` en el `.env` del backend (opcional, evita que
   el backend sirva una copia redundante).

## 6. Modelo de datos (resumen)

- **Admin** — `usuario`, `passwordHash` (bcrypt). Un solo rol.
- **Categoria** — `slug` (único, usado por el frontend para filtrar),
  `nombre`, `orden`, `imagen`, `destacada`.
- **Producto** — `nombre`, `descripcion`, `sku`, `marca`, `categoriaId`,
  `precio`/`precioAnterior`/`precioMayorista`/`cantidadMayorista` (todos
  opcionales — si no hay precio, el frontend puede mostrar "Consultar"),
  `imagen`, `disponible`, `destacado`, `nuevo`.
- **ItemMenu** — `nombre`, `enlace` (ancla `#seccion` o URL completa),
  `orden`, `visible`.

Puedes explorar y editar los datos directamente con:

```bash
npx prisma studio
```

## 7. Seguridad — antes de pasar a producción

- Cambia `JWT_SECRET`, `SESSION_SECRET`, `ADMIN_USUARIO` y `ADMIN_PASSWORD`
  por valores propios y fuertes (no dejes los del `.env.example`).
- Sirve el sitio con HTTPS; con `NODE_ENV=production` la cookie de sesión se
  marca automáticamente como `secure`.
- Limita `CORS_ORIGIN` solo a los dominios reales de tu sitio público.
- Haz backups periódicos de tu base de datos PostgreSQL.
