# Trabajar con Blobs de Producción en Local

Este documento explica cómo configurar tu entorno de desarrollo local para trabajar con los mismos datos (TODOs) que hay en producción de Netlify.

## ¿Por qué hacer esto?

Por defecto, cuando ejecutas `npm run dev`, los TODOs se guardan en archivos locales (`.local-data/todos-data.json`). Esto significa que los datos en local y en producción están separados.

Al configurar las credenciales de Netlify Blobs, puedes:
- ✅ Ver los mismos TODOs de producción en local
- ✅ Crear/editar/eliminar TODOs desde local que se reflejen en producción
- ✅ Probar funcionalidades con datos reales sin hacer deploy

## ⚠️ Advertencia

**Los cambios que hagas en local afectarán directamente a producción.** No hay entorno de staging separado cuando usas esta configuración. Úsalo con cuidado.

## Configuración Paso a Paso

### 1. Obtener el Site ID

1. Abre [Netlify Dashboard](https://app.netlify.com/)
2. Selecciona tu sitio
3. Ve a **Site settings** > **Site details**
4. Copia el **Site ID** (algo como `abc12345-6789-def0-1234-56789abcdef0`)

### 2. Crear un Personal Access Token

1. En Netlify, ve a tu perfil de usuario
2. **User Settings** > **Applications** > **Personal Access Tokens**
3. Click en **New access token**
4. Configura:
   - **Name**: `Local Development` (o el nombre que prefieras)
   - **Expiration**: 1 año (o el tiempo que prefieras)
   - **Scopes**: Marca **"Read and write access to Netlify Blobs"**
5. Click **Generate token**
6. **IMPORTANTE**: Copia el token inmediatamente. No podrás verlo después.

### 3. Configurar .env.local

Abre (o crea) el archivo `.env.local` en la raíz del proyecto y añade:

```bash
# Netlify Blobs - Acceso a producción desde local
NETLIFY_BLOBS_SITE_ID=abc12345-6789-def0-1234-56789abcdef0
NETLIFY_BLOBS_TOKEN=nfp_tu_token_personal_aqui
```

Reemplaza con tus valores reales.

### 4. Verificar la Configuración

Ejecuta el script de verificación:

```bash
npm run check-blob-config
```

Deberías ver:

```
✅ All configured! Your local development will use production Netlify Blobs.
⚠️  WARNING: Changes you make locally will affect production data!
```

### 5. Reiniciar el Servidor de Desarrollo

Si ya tenías `npm run dev` ejecutándose, detenlo y reinicia:

```bash
npm run dev
```

Ahora deberías ver en los logs:

```
🔑 [TODO STORAGE] Production blob credentials detected - using Netlify Blobs
```

## Verificación

1. Abre `http://localhost:3000/ge8d9nH$,1xOMk_`
2. Inicia sesión
3. Abre el sidebar de TODOs
4. Deberías ver **los mismos 17 TODOs que hay en producción**

## Volver a Usar Datos Locales

Si quieres volver a usar archivos locales en lugar de producción:

1. Comenta o elimina las líneas de `.env.local`:
   ```bash
   # NETLIFY_BLOBS_SITE_ID=...
   # NETLIFY_BLOBS_TOKEN=...
   ```

2. Reinicia el servidor de desarrollo

## Diferencias entre Métodos de Desarrollo

| Método | Comando | Datos | Uso Recomendado |
|--------|---------|-------|-----------------|
| **Next.js Dev (sin credenciales)** | `npm run dev` | Archivos locales `.local-data/` | Desarrollo aislado, pruebas sin afectar producción |
| **Next.js Dev (con credenciales)** | `npm run dev` | Netlify Blobs de **producción** | Trabajar con datos reales, debugging de producción |
| **Netlify Dev** | `npm run dev:netlify` | Netlify Blobs sandbox local | Probar funciones de Netlify, deploys, etc. |

## Troubleshooting

### "No todos yet" pero sé que hay TODOs en producción

- Verifica que las credenciales estén correctas: `npm run check-blob-config`
- Verifica que reiniciaste el servidor después de añadir las credenciales
- Revisa los logs del servidor en busca de errores de autenticación

### Token expirado

Si el token expira, genera uno nuevo en Netlify y actualiza `.env.local`.

### Acceso denegado

Verifica que el Personal Access Token tenga el scope **"Read and write access to Netlify Blobs"**.
