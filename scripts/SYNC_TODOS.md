# Netlify Blobs Storage Configuration

## Resumen

Este proyecto usa **Netlify Blobs** para almacenar TODOs. Por defecto:

- **Producción (Netlify)**: Usa Netlify Blobs de producción
- **Local (`netlify dev`)**: Puede configurarse para usar:
  - **Opción A**: Sandbox local independiente (por defecto, seguro pero requiere sync)
  - **Opción B**: Storage de producción directamente (configurado actualmente)

## Configuración Actual: Acceso Directo a Producción ⚡

El entorno local está configurado para acceder **directamente** al blob storage de producción. Esto significa:

✅ **Ventajas:**
- TODOs en local son exactamente los mismos que en producción
- No necesitas script de sync
- Cambios en local se reflejan inmediatamente en producción

⚠️ **Importante:**
- **Al crear/modificar/borrar TODOs en local, estás modificando PRODUCCIÓN**
- No hay separación entre entornos
- Ten cuidado al borrar datos

### Variables de Entorno (`.env.local`)

```env
# Netlify Blobs configuration for local development
NETLIFY_BLOBS_SITE_ID=e60958f1-7075-48a3-87d3-bb7111334d5c
NETLIFY_BLOBS_TOKEN=nfp_... # Personal Access Token de Netlify
```

## Cambiar a Sandbox Local (Opcional)

Si prefieres trabajar con un sandbox local separado:

1. **Elimina o comenta** las variables en `.env.local`:
   ```env
   # NETLIFY_BLOBS_SITE_ID=...
   # NETLIFY_BLOBS_TOKEN=...
   ```

2. **Reinicia** `netlify dev`

3. **Sincroniza datos** cuando necesites:
   ```bash
   npm run sync-todos
   ```

## Cómo Funciona

El código en `lib/todos-storage.ts` detecta si hay credenciales explícitas:

```typescript
function getTodoStore() {
  const config = {
    name: "todos",
    consistency: "strong",
  };

  // Si hay credenciales explícitas, usa producción
  if (process.env.NETLIFY_BLOBS_SITE_ID && process.env.NETLIFY_BLOBS_TOKEN) {
    config.siteID = process.env.NETLIFY_BLOBS_SITE_ID;
    config.token = process.env.NETLIFY_BLOBS_TOKEN;
  }

  return getStore(config);
}
```

## Scripts npm

- `npm run dev:netlify` - Ejecuta `netlify dev` (usa la configuración actual)
- `npm run sync-todos` - Sincroniza TODOs de producción a sandbox local (solo necesario si usas sandbox)

