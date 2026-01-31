# Netlify Blobs Storage - Guía Completa

## Configuración Actual

Este proyecto usa **acceso directo a producción** desde el entorno local.

### ¿Qué significa esto?

Cuando ejecutas `netlify dev` en local:
- ✅ Lees los mismos TODOs que están en producción
- ✅ Crear un TODO en local → aparece en producción inmediatamente
- ⚠️ Borrar un TODO en local → se borra de producción

### Variables de Entorno

En `.env.local` (no commiteado):
```env
NETLIFY_BLOBS_SITE_ID=e60958f1-7075-48a3-87d3-bb7111334d5c
NETLIFY_BLOBS_TOKEN=nfp_...
```

## Alternativas de Configuración

### Opción A: Acceso Directo (Actual) ⚡

**Pros:**
- Sin necesidad de sincronización
- Siempre trabajas con datos reales
- Simplicidad

**Contras:**
- Modificas producción directamente
- Sin protección entre entornos

**Configuración:** Mantén las variables en `.env.local`

---

### Opción B: Sandbox Local 🔒

**Pros:**
- Datos de local separados de producción
- Seguro para experimentar
- No afectas datos reales

**Contras:**
- Necesitas sincronizar con `npm run sync-todos`
- Datos pueden desincronizarse

**Configuración:**
1. Comenta las variables en `.env.local`
2. Reinicia `netlify dev`
3. Ejecuta `npm run sync-todos` cuando necesites datos de producción

## FAQ

**¿Cómo sé qué configuración estoy usando?**

Mira los logs al cargar TODOs:
- `🔑 Using explicit Netlify Blobs credentials (production access)` → Acceso directo
- `⬥ Netlify Blobs running in sandbox mode` → Sandbox local

**¿Puedo tener ambos?**

No simultáneamente. Debes elegir uno y configurarlo en `.env.local`.

**¿Qué pasa con los tests E2E?**

Los tests usan la configuración actual. Si tienes acceso directo configurado, los tests crearán TODOs en producción (que luego puedes limpiar).

**¿Cómo genero el token?**

1. Ve a https://app.netlify.com/user/applications/personal
2. Crea un nuevo Personal Access Token
3. Dale permisos de acceso a Blobs
4. Cópialo a `.env.local`
