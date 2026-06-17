# App Health Dashboard

Dashboard centralizado para monitorear el estado de redes sociales, GitHub, crypto, y extensiones de navegador. Comparte datos automáticamente entre Web y Android usando Netlify Blobs.

## Desarrollo Local

### Prerequisitos

1. **Node.js** (v18 o superior)
2. **Netlify CLI** (requerido para desarrollo local)

```bash
# Instalar Netlify CLI globalmente
npm install -g netlify-cli

# Login a Netlify
netlify login
```

### Configuración Inicial

1. **Clonar el repositorio e instalar dependencias**
   ```bash
   git clone <repository-url>
   cd Dashboard2
   npm install
   ```

2. **Configurar variables de entorno**
   ```bash
   # Copiar el archivo de ejemplo
   cp .env.example .env.local

   # Generar hash de contraseña para el dashboard privado
   npm run hash-password "tu-contraseña-segura"

   # Generar secret para tokens
   # En Windows PowerShell:
   -join (1..64 | ForEach-Object { '{0:X}' -f (Get-Random -Max 16) })
   # En Linux/Mac:
   openssl rand -hex 32
   ```

3. **Editar `.env.local`** con los valores generados:
   ```env
   PRIVATE_PASSWORD_HASH=tu_bcrypt_hash_generado
   PRIVATE_AUTH_SECRET=tu_secret_random_de_64_caracteres
   ```

### Ejecutar en Modo Desarrollo

**IMPORTANTE:** Debes usar `netlify dev` en lugar de `npm run dev` cuando trabajes con esta aplicación.

```bash
# Ejecutar con Netlify CLI (REQUERIDO)
netlify dev
```

La aplicación estará disponible en:
- **http://localhost:8888** (puerto por defecto de Netlify)

### ¿Por qué `netlify dev`?

Esta aplicación usa **Netlify Blobs** para almacenamiento, que requiere configuración de entorno específica de Netlify.

**Con `netlify dev`:**
- ✅ Netlify Blobs configurado automáticamente
- ✅ Store local sandboxed (no afecta producción)
- ✅ Simula el entorno de Netlify exactamente
- ✅ Netlify Functions disponibles localmente
- ✅ No requiere configuración manual de tokens
- ✅ Variables de entorno cargadas automáticamente

**Con `npm run dev` (solo Next.js):**
- ❌ Error: "The environment has not been configured to use Netlify Blobs"
- ❌ Netlify Functions no disponibles
- ❌ Requiere configuración manual compleja de siteID y token

**Conclusión:** Siempre usa `netlify dev` para desarrollo local.

### Comandos Disponibles

```bash
# Desarrollo (USAR ESTE)
netlify dev             # Ejecuta con Netlify CLI (recomendado)

# Build y Deploy
npm run build           # Build de producción
npm run start           # Ejecuta build de producción localmente
netlify deploy --prod   # Deploy a producción en Netlify

# Testing y Scripts
npm run test:scraper              # Probar scraper localmente
npm run hash-password             # Generar hash de contraseña
npm run migrate-dashboard-data    # Migrar datos existentes a Netlify Blobs

# Linting
npm run lint            # Ejecutar ESLint
```

## Características

- ✅ **Scraping con Puppeteer** para YouTube, Twitter/X, Instagram
- ✅ **APIs directas** para GitHub y precios de criptomonedas
- ✅ **Testing funcional de extensiones Chrome** con código fuente
- ✅ **Netlify Scheduled Functions** ejecuta tests diarios automáticamente (3 AM UTC)
- ✅ **Refresh manual** con botón bajo demanda
- ✅ **Dashboard responsive** con indicadores de estado en tiempo real
- ✅ **Dashboard privado** con autenticación y gestión de TODOs
- ✅ **Netlify Blobs** para almacenamiento persistente y compartido

## Servicios Monitorizados

### Redes Sociales
- **YouTube** (@jmtdev) - Fecha del último video
- **Twitter/X** (@windyBotES) - Último tweet + total de tweets
- **Instagram** (@anainimaladay) - Fecha del último post

### GitHub
- **Kingdom Hearts Custom Music** - Versión, fecha, descargas de última release

### Criptomonedas
- **Bitcoin (BTC)** - Precio en EUR + cambio 24h
- **Solana (SOL)** - Precio en EUR + cambio 24h

### Chrome Extensions
- **YouTube Only First Video** - Disponibilidad + test funcional

## Estructura del Proyecto

```
Dashboard2/
├── app/                      # Next.js App Router
│   ├── api/                  # API Routes
│   │   ├── results/          # Dashboard público
│   │   ├── private/          # Dashboard privado (autenticado)
│   │   ├── scrape/           # Trigger manual de scraping
│   │   └── todos/            # API de TODOs
│   ├── page.tsx              # Dashboard público
│   └── private/              # UI del dashboard privado
├── lib/                      # Librerías compartidas
│   ├── dashboard-storage.ts  # Almacenamiento del dashboard (Netlify Blobs)
│   └── todos-storage.ts      # Almacenamiento de TODOs (Netlify Blobs)
├── netlify/
│   └── functions/            # Netlify Functions
│       ├── daily-scraper.ts  # Scheduled function (3 AM UTC)
│       ├── manual-scraper.ts # Scraper manual
│       └── get-results.ts    # API pública de resultados
├── scripts/                  # Scripts de utilidad
└── public/                   # Archivos estáticos
```

## Arquitectura de Datos

La aplicación usa **Netlify Blobs** como almacenamiento centralizado:

### Stores

1. **`dashboard` store**: Datos del dashboard público
   - YouTube Analytics
   - Twitter/X Status
   - Instagram Status
   - GitHub API Status
   - Crypto Prices (BTC, SOL)
   - Extension Testing Results
   - Timestamp de última actualización

2. **`todos` store**: TODOs del dashboard privado
   - Lista de tareas
   - Timestamp de última modificación

### Ventajas de Netlify Blobs

- ✅ Datos persistentes entre deploys
- ✅ Compartidos automáticamente entre Web y Android
- ✅ No requiere sistema de archivos en serverless functions
- ✅ Consistencia fuerte garantizada
- ✅ Sin costo adicional en free tier
- ✅ API simple y type-safe
- ✅ Configuración automática con `netlify dev`

## Dashboard Privado

El dashboard privado requiere autenticación con contraseña y permite gestionar TODOs personales.

### Configuración

1. Generar hash de contraseña:
   ```bash
   npm run hash-password "tu-contraseña-segura"
   ```

2. Copiar el hash generado a `.env.local`:
   ```env
   PRIVATE_PASSWORD_HASH=<hash_generado>
   ```

3. Generar un secret aleatorio para tokens:
   ```bash
   # Windows PowerShell
   -join (1..64 | ForEach-Object { '{0:X}' -f (Get-Random -Max 16) })

   # Linux/Mac
   openssl rand -hex 32
   ```

4. Agregar el secret a `.env.local`:
   ```env
   PRIVATE_AUTH_SECRET=<secret_generado>
   ```

5. Opcional: generar una API key read-only para integraciones como Pop Agent:
   ```bash
   openssl rand -hex 32
   ```

   ```env
   TODOS_API_KEY=<api_key_generada>
   ```

### Acceso

- **URL**: `/private`
- **Autenticación**: Contraseña configurada
- **Token**: Cookie HTTP-only válida por 30 días
- **Características**: Ver datos de cripto + gestión de TODOs

### Características de Seguridad

- ✅ **Password hasheada** con bcrypt (cost factor 12)
- ✅ **Validación server-side** - password verificada en backend
- ✅ **Cookie HTTP-only** - protegida contra XSS
- ✅ **Datos aislados** - crypto data excluida de API pública
- ✅ **HTTPS enforced** por Netlify
- ✅ **Anti brute-force** con delay de 1 segundo en fallos

### API Read-Only para Integraciones

Pop Agent y otras integraciones pueden leer TODOs sin usar la sesión web:

```bash
curl -H "Authorization: Bearer <TODOS_API_KEY>" \
  "https://develop--dashboard0x.netlify.app/api/integrations/todos?status=active"
```

También se acepta la cabecera `X-API-Key: <TODOS_API_KEY>`.

Filtros disponibles:
- `status=all` - devuelve todos los TODOs (por defecto)
- `status=active` - devuelve solo TODOs pendientes
- `status=completed` - devuelve solo TODOs completados

Respuesta:

```json
{
  "todos": [],
  "count": 0,
  "status": "active",
  "lastModified": "2026-01-01T00:00:00.000Z"
}
```

## Sistema de Categorías para TODOs

El sistema de TODOs incluye categorías dinámicas con soporte para subcategorías de N niveles.

### Características

- ✅ **Categorías dinámicas** - Creadas y gestionadas por el usuario
- ✅ **N niveles de subcategorías** - Estructura de árbol ilimitada
- ✅ **TODOs sin categoría** - Soporte para TODOs no categorizados
- ✅ **Filtrado por categoría** - Filtra TODOs por categoría seleccionada
- ✅ **Gestión completa** - Crear, editar y eliminar categorías
- ✅ **Cascada automática** - Al borrar una categoría, se borran todas sus subcategorías

### Migración de Base de Datos

**IMPORTANTE:** Antes de usar el sistema de categorías, debes ejecutar el script de migración para crear las tablas necesarias en Netlify DB.

1. **En producción o con Netlify CLI:**
   ```bash
   # Asegúrate de tener las credenciales de Netlify configuradas
   npm run db:add-categories
   ```

2. **Verificar que la migración fue exitosa:**
   ```bash
   npm run db:status
   ```

La migración crea:
- Tabla `categories` con estructura de árbol recursivo
- Columna `category_id` en tabla `todos`
- Índices optimizados para consultas
- Triggers para mantener timestamps actualizados

### Uso del Sistema de Categorías

1. **Gestionar categorías:** Click en botón "Categories" en el dashboard de TODOs
2. **Añadir categoría:** Especifica nombre y opcionalmente una categoría padre
3. **Crear subcategorías:** Click en "Add Sub" de una categoría existente
4. **Editar categoría:** Click en "Edit" para cambiar el nombre
5. **Eliminar categoría:** Click en "Delete" (elimina también subcategorías)
6. **Asignar categoría a TODO:** Selecciona categoría al crear/editar TODO
7. **Filtrar por categoría:** Usa el dropdown "Filter by Category"

## Scraping Automático

La aplicación ejecuta scraping automático diariamente a las **3 AM UTC** usando Netlify Scheduled Functions.

### Trigger Manual

Puedes ejecutar el scraping manualmente:

1. **Desde la UI**: Botón "Refresh" en el dashboard
2. **Desde la API**:
   ```bash
   curl -X POST http://localhost:8888/.netlify/functions/manual-scraper
   ```

3. **En producción**:
   ```bash
   curl -X POST https://tu-site.netlify.app/.netlify/functions/manual-scraper
   ```

## Deployment

Ver [DEPLOYMENT.md](./DEPLOYMENT.md) para instrucciones detalladas de deployment en Netlify.

### Deploy Rápido

```bash
# Deploy a producción
netlify deploy --prod

# Deploy a preview (staging)
netlify deploy
```

## Troubleshooting

### Error: "The environment has not been configured to use Netlify Blobs"

**Causa:** Estás ejecutando `next dev` directamente en lugar de `netlify dev`.

**Solución:** Usar `netlify dev` en su lugar.

### Puerto 8888 ya en uso

```bash
# Especificar un puerto diferente
netlify dev --port 8889
```

### Netlify CLI no encontrado

```bash
# Instalar globalmente
npm install -g netlify-cli

# Verificar instalación
netlify --version
```

### No aparecen datos en el dashboard

1. Verificar que el scraper se haya ejecutado:
   ```bash
   netlify functions:log daily-scraper
   ```

2. Ejecutar scraper manualmente:
   ```bash
   npm run test:scraper
   ```

3. Verificar logs en Netlify dashboard

### Errores de autenticación en dashboard privado

1. Verificar que `.env.local` tiene las variables correctas
2. Re-generar el hash de contraseña
3. Limpiar cookies del navegador
4. Restart del servidor (`netlify dev`)

## API Endpoints

### Público

- `GET /api/results` - Obtener datos del dashboard
- `POST /api/scrape` - Trigger manual de scraping

### Privado (requiere autenticación)

- `POST /api/private/login` - Login con contraseña
- `POST /api/private/logout` - Logout
- `GET /api/private/data` - Obtener datos privados (cripto)
- `GET /api/todos` - Obtener TODOs
- `POST /api/todos` - Crear TODO (body: `{text, categoryId?}`)
- `PUT /api/todos/:id` - Actualizar TODO (body: `{text?, completed?, categoryId?}`)
- `DELETE /api/todos/:id` - Eliminar TODO
- `GET /api/categories` - Obtener categorías (query: `?flat=true` para lista plana)
- `POST /api/categories` - Crear categoría (body: `{name, parentId?}`)
- `PUT /api/categories/:id` - Actualizar categoría (body: `{name}`)
- `DELETE /api/categories/:id` - Eliminar categoría y subcategorías

## Tecnologías

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS 4
- **Authentication**: bcryptjs + HTTP-only cookies
- **Storage**: Netlify Blobs
- **Functions**: Netlify Functions + Scheduled Functions
- **Scraping**: Puppeteer + chrome-aws-lambda
- **Deployment**: Netlify

## Limitaciones Conocidas

- **Function Timeout**: 10s en free tier, 26s en Pro
- **Memory**: 1024 MB por function
- **Puppeteer**: Puede fallar con sitios muy pesados
- **Scheduled Functions**: Solo en producción (local usa triggers manuales)

## Contribuir

1. Fork del repositorio
2. Crear feature branch (`git checkout -b feature/nueva-funcionalidad`)
3. Commit de cambios (`git commit -m 'feat: Agregar nueva funcionalidad'`)
4. Push a branch (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## Licencia

MIT
