# Application Health Dashboard

Dashboard web para monitorizar el estado de aplicaciones y servicios mediante scraping y APIs.

## Características

- ✅ **Scraping con Puppeteer** para YouTube, Twitter/X, Instagram
- ✅ **APIs directas** para GitHub y precios de criptomonedas
- ✅ **Testing funcional de extensiones Chrome** con código fuente
- ✅ **Netlify Scheduled Functions** ejecuta tests diarios automáticamente
- ✅ **Refresh manual** con botón bajo demanda (rate-limited 5 min)
- ✅ **Dashboard responsive** con indicadores de estado en tiempo real

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

## Sección Privada Protegida

La aplicación incluye una **sección privada protegida con password** para datos sensibles (criptomonedas). Los datos de cripto NO están disponibles en la API pública.

### Configuración Inicial

1. **Genera el hash de tu password**:
   ```bash
   npm run hash-password "tu-password-seguro"
   ```

2. **Crea el archivo `.env.local`** en la raíz del proyecto:
   ```env
   PRIVATE_PASSWORD_HASH=<hash generado en paso 1>
   PRIVATE_AUTH_SECRET=<string aleatorio 32+ caracteres>
   ```

   Para generar el secret aleatorio:
   ```bash
   # En Linux/Mac:
   openssl rand -hex 32

   # O usa cualquier generador de strings aleatorios
   ```

3. **Accede a la sección privada**:
   - URL: `/private/ge8d9nH$,1xOMk_/`
   - Introduce la password cuando se te solicite
   - Token válido por 30 minutos
   - **Stateless**: Al recargar la página, deberás volver a introducir la password

### Características de Seguridad

- ✅ **Password hasheada** con bcrypt (cost factor 12)
- ✅ **Validación server-side** - password verificada en backend
- ✅ **Token criptográfico** aleatorio de 32 bytes
- ✅ **Sin persistencia** - token solo en memoria, no cookies/localStorage
- ✅ **Datos aislados** - crypto data excluida de API pública
- ✅ **HTTPS enforced** por Netlify
- ✅ **Anti brute-force** con delay de 1 segundo en fallos

### Deployment en Netlify

1. Ve a **Site Settings → Environment Variables**
2. Añade las variables:
   - `PRIVATE_PASSWORD_HASH`
   - `PRIVATE_AUTH_SECRET`
3. Redeploy el sitio

---

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
