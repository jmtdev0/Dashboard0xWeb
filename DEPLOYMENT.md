# Deployment Instructions

> **IMPORTANTE - Desarrollo Local:**
>
> Para desarrollo local, debes usar **`netlify dev`** en lugar de `npm run dev`.
>
> Esta aplicación usa **Netlify Blobs** para almacenamiento, que requiere el entorno de Netlify para funcionar correctamente. Con `netlify dev` obtienes:
> - ✅ Netlify Blobs configurado automáticamente (sin configuración manual)
> - ✅ Store local sandboxed (no afecta producción)
> - ✅ Netlify Functions disponibles localmente
> - ✅ Variables de entorno cargadas automáticamente
>
> **Comando:** `netlify dev`
>
> Ver [README.md](./README.md) para instrucciones completas de desarrollo local.

---

## Netlify Setup

### 1. Install Netlify CLI
```bash
npm install -g netlify-cli
```

### 2. Login to Netlify
```bash
netlify login
```

### 3. Initialize site
```bash
netlify init
```

Seleccionar:
- Create & configure a new site
- Team: (tu equipo)
- Site name: app-health-dashboard (o el nombre que prefieras)
- Build command: `npm run build`
- Publish directory: `.next`

### 4. Deploy
```bash
netlify deploy --prod
```

## Verificar Scheduled Functions

1. Ir a Netlify dashboard: https://app.netlify.com
2. Seleccionar tu site
3. Ir a **Functions** en el sidebar
4. Verificar que aparece `daily-scraper` con:
   - Schedule: `0 3 * * *` (3 AM UTC diario)
   - Status: Enabled

## Testing Local

### Migrar datos existentes (si aplica)
Si tienes datos previos en `data/lastRun.json`, migra a Netlify Blobs:
```bash
npm run migrate-dashboard-data
```

### Probar el scraper localmente
```bash
npm run test:scraper
```

**NOTA:** Los datos ahora se guardan en Netlify Blobs (almacenamiento centralizado), NO en archivos locales. Esto permite compartir datos entre Web y Android automáticamente.

### Ejecutar dashboard en dev mode
```bash
npm run dev
```

Abrir http://localhost:3000

### Probar Netlify Functions localmente
```bash
netlify dev
```

Esto levanta un servidor local que simula el entorno de Netlify.

## Configuración de Variables de Entorno (Si necesario en el futuro)

Si decides usar APIs con autenticación:

```bash
netlify env:set YOUTUBE_API_KEY "your_key_here"
netlify env:set GITHUB_TOKEN "your_token_here"
```

O desde el dashboard:
1. Site settings > Environment variables
2. Add variable

## Limitaciones Conocidas

### Puppeteer en Netlify Functions
- **Timeout**: 26 segundos en free tier (10 segundos para Functions)
- **Memory**: 1024 MB
- **Cold start**: Primera ejecución puede tardar 5-10 segundos
- **Chrome**: chrome-aws-lambda incluye binario de Chrome optimizado

Si el scraping completo tarda más de 26 segundos, considerar:
1. Dividir en múltiples functions
2. Hacer tests en paralelo (ya implementado)
3. Reducir el número de servicios testeados simultáneamente
4. Usar APIs en lugar de scraping donde sea posible

### Testing Funcional de Extensiones
- **No funciona en Netlify Functions** (requiere Chrome visible)
- Solo disponible en entorno local
- Para CI/CD usar GitHub Actions con Xvfb

## Monitoreo

### Ver logs de scheduled function
```bash
netlify functions:list
netlify functions:log daily-scraper
```

O desde el dashboard:
1. Functions > daily-scraper
2. Ver logs recientes

### Forzar ejecución manual de scheduled function
Desde el dashboard:
1. Functions > daily-scraper
2. Click en "Trigger function"

O usar la API:
```bash
curl -X POST https://tu-site.netlify.app/.netlify/functions/daily-scraper
```

## Troubleshooting

### Function timeout
Si el scraping tarda demasiado:
1. Revisar qué servicios son más lentos en los logs
2. Considerar remover servicios problemáticos (Instagram suele ser lento)
3. Upgrade a Netlify Pro para 26s timeout

### Chrome crashes
Si chrome-aws-lambda falla:
1. Verificar límite de memoria
2. Considerar alternativas como Playwright
3. Usar APIs en lugar de scraping

### CORS errors en local
Si ves errores CORS al probar localmente:
1. Usar `netlify dev` en lugar de `npm run dev`
2. O configurar proxy en next.config.ts

## Cost Estimation

### Netlify Free Tier
- Functions: 125k invocations/month
- Build minutes: 300 min/month
- Bandwidth: 100 GB/month

### Con scraping diario:
- Scheduled function: 30 ejecuciones/mes
- Manual refreshes: ~100 ejecuciones/mes (si usuarios activos)
- **Total**: ~130 ejecuciones/mes = **GRATIS** ✅

### Netlify Pro ($19/month)
Si necesitas más:
- Functions: 2M invocations/month
- Longer timeouts (26s para background functions)
- Scheduled functions support

## Netlify Blobs Storage

### Arquitectura de Datos
La aplicación usa **Netlify Blobs** como almacenamiento centralizado:

- **Dashboard data** (`dashboard` store): Datos de YouTube, Twitter, Instagram, GitHub, crypto, extensiones
- **TODOs** (`todos` store): Lista de tareas del usuario privado
- **Strong consistency**: Los cambios son visibles inmediatamente
- **Shared entre Web y Android**: Ambas plataformas leen/escriben del mismo store

### Ventajas sobre archivos locales
✅ Datos persistentes entre deploys
✅ Compartidos automáticamente entre Web y Android
✅ No requiere sistema de archivos en serverless functions
✅ Consistencia fuerte garantizada
✅ Escalable y sin costo adicional en free tier

### Estructura de Stores

```
dashboard (store)
└── dashboard-data (blob key)
    └── { timestamp, results: { youtube, twitter, instagram, github, crypto, extensions } }

todos (store)
└── todos-data (blob key)
    └── { todos: [...], lastModified }
```

### Acceso programático
```typescript
// Leer datos del dashboard
import { getDashboardData } from '@/lib/dashboard-storage';
const data = await getDashboardData();

// Guardar datos del dashboard
import { saveDashboardData } from '@/lib/dashboard-storage';
await saveDashboardData(results);

// Leer TODOs
import { getAllTodos } from '@/lib/todos-storage';
const todoData = await getAllTodos();

// Guardar TODOs
import { saveTodos } from '@/lib/todos-storage';
await saveTodos(todos);
```

## Next Steps

1. Deploy a Netlify
2. Probar scheduled function
3. Verificar que los datos se guardan en Netlify Blobs correctamente
4. Probar endpoints `/api/results` y `/api/todos` desde Android
5. Añadir más extensiones al testing
6. Considerar migrar de scraping a APIs oficiales para mejor estabilidad
