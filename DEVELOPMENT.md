# Desarrollo Local

Este documento explica cómo ejecutar el proyecto en tu máquina local.

## Requisitos previos

- Node.js 18+ instalado
- npm o yarn

## Configuración inicial

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

Crea un archivo `.env.local` en la raíz del proyecto con el siguiente contenido:

```env
# Password hash (genera uno con: npm run hash-password "tu-contraseña")
PRIVATE_PASSWORD_HASH=tu_bcrypt_hash_aqui

# Secret para autenticación (mínimo 32 caracteres)
PRIVATE_AUTH_SECRET=tu_secreto_aleatorio_de_al_menos_32_caracteres
```

### 3. Generar hash de contraseña

Para crear el hash de tu contraseña:

```bash
npm run hash-password "tu-contraseña-aqui"
```

Copia el hash generado y pégalo en tu `.env.local` como valor de `PRIVATE_PASSWORD_HASH`.

## Ejecutar en desarrollo

```bash
npm run dev
```

La aplicación estará disponible en [http://localhost:3000](http://localhost:3000)

## Diferencias entre desarrollo y producción

### Almacenamiento de datos

**Desarrollo (local):**
- Los datos se guardan en archivos JSON en la carpeta `.local-data/`
- No necesitas configurar Netlify Blobs
- Los datos persisten entre reinicios del servidor

**Producción (Netlify):**
- Los datos se guardan en Netlify Blobs (cloud storage)
- Requiere credenciales de Netlify configuradas automáticamente

### Autenticación

**Web:** Cookie HTTP-only de 24 horas
**Móvil:** localStorage de 30 días

## Estructura de datos locales

Cuando ejecutas en local, se crean estos archivos automáticamente:

```
.local-data/
├── dashboard-data.json  # Datos del dashboard (crypto, YouTube, etc.)
└── todos-data.json      # Lista de TODOs
```

Estos archivos están incluidos en `.gitignore` y no se subirán al repositorio.

## Scripts disponibles

```bash
npm run dev          # Ejecutar en desarrollo
npm run build        # Compilar para producción
npm run start        # Ejecutar build de producción
npm run lint         # Ejecutar linter
npm run hash-password "password"  # Generar hash de contraseña
```

## Logs de diagnóstico

La aplicación incluye logs detallados con emojis:

- 🚀 Inicio de operación
- ✅ Éxito
- ❌ Error
- ⚠️ Advertencia
- 🔍 Verificación
- 💾 Guardado
- 📦 Lectura de datos
- 🍪 Cookies
- 🔑 Token/autenticación
- 🏠 Modo local
- ☁️ Modo producción

Abre la consola del navegador (F12) y la terminal para ver todos los logs.

## Solución de problemas

### Error: "PRIVATE_PASSWORD_HASH not configured"

Asegúrate de tener el archivo `.env.local` con las variables correctas.

### Los datos no se guardan

Verifica los permisos de escritura en la carpeta del proyecto. La carpeta `.local-data/` se crea automáticamente.

### Error 401 en zona privada

1. Revisa que la contraseña sea correcta
2. Verifica que el hash en `.env.local` corresponda a esa contraseña
3. Mira los logs en la consola para más detalles

## Deploy a producción

Para hacer deploy a Netlify:

1. Haz commit de tus cambios
2. Push a la rama `main` o `develop`
3. Netlify detectará los cambios automáticamente
4. Configura las variables de entorno en Netlify Dashboard:
   - `PRIVATE_PASSWORD_HASH`
   - `PRIVATE_AUTH_SECRET`
