# Soluciones para APIs de Crypto en Netlify

## Problema

Las APIs de precios de crypto (CoinGecko y CoinCap) funcionan en local pero fallan en Netlify.

## Causas Más Comunes

### 1. Rate Limiting (Más Probable)

CoinGecko limita requests desde IPs de cloud providers como Netlify porque muchos usuarios comparten las mismas IPs.

**Solución:**
- Obtener API key gratuita de CoinGecko
- O usar una API alternativa con mejor tier gratuito

### 2. Timeout

Las requests pueden tardar más desde Netlify debido a:
- Geolocalización del servidor
- Latencia de red
- Cold starts de serverless functions

**Solución actual:**
- Timeout configurado a 8 segundos por request
- Timeout de función a 26 segundos (máximo en tier gratuito)

### 3. Bloqueo por User-Agent

Algunas APIs bloquean requests que parecen bots.

**Solución actual:**
- User-Agent configurado: `Mozilla/5.0 (compatible; Dashboard0xWeb/1.0; +https://dashboard0x.netlify.app)`

### 4. Región Geográfica

Los servidores de Netlify pueden estar en regiones bloqueadas por las APIs.

**Solución:**
- Usar API con mejor cobertura global
- O usar un proxy/middleware

## Mejoras Implementadas

✅ User-Agent headers en todas las requests
✅ Timeout explícito de 8 segundos por API
✅ Logs detallados de:
- Estado de la respuesta
- Tiempo de respuesta
- Tipo de error (timeout, rate limit, etc.)
- Entorno (Netlify vs local)
✅ Manejo de errores específico para timeout
✅ Mensajes de error descriptivos

## Diagnóstico

Cuando hagas click en "Refresh Now", revisa los **Netlify Function Logs**:

### Si ves timeout:
```
⏱️ [CRYPTO] CoinGecko request timed out after 8 seconds
⏱️ [CRYPTO] CoinCap request timed out after 8 seconds
```
**Solución:** Las APIs están muy lentas desde Netlify. Considera usar una API más rápida.

### Si ves rate limiting:
```
₿ [CRYPTO] CoinGecko API error: { status: 429, statusText: "Too Many Requests" }
```
**Solución:** Necesitas una API key de CoinGecko o cambiar a otra API.

### Si ves network error:
```
₿ [CRYPTO] CoinCap error details: TypeError: Failed to fetch
```
**Solución:** Las APIs pueden estar bloqueando las IPs de Netlify.

## Soluciones Alternativas

### Opción 1: CoinGecko API Key (Recomendado)

1. Registrarse en https://www.coingecko.com/en/api
2. Obtener API key gratuita (30 requests/minuto)
3. Añadir a `.env`:
   ```bash
   COINGECKO_API_KEY=tu_api_key_aqui
   ```
4. Actualizar el código para usar la key

### Opción 2: API Alternativa - CryptoCompare

API gratuita con 100,000 requests/mes:

```typescript
// Reemplazar en lib/scraper.ts
const response = await fetch(
  "https://min-api.cryptocompare.com/data/pricemultifull?fsyms=BTC,SOL&tsyms=EUR",
  {
    headers: {
      "Authorization": `Apikey ${process.env.CRYPTOCOMPARE_API_KEY}`,
    },
  }
);
```

### Opción 3: Cache Más Largo

Si no necesitas precios en tiempo real, cachea por más tiempo:

```typescript
// En netlify.toml, añadir:
[[headers]]
  for = "/api/private/data"
  [headers.values]
    Cache-Control = "public, max-age=300" # 5 minutos
```

### Opción 4: Scheduled Function

Ejecutar el scraper cada hora en vez de on-demand:

```toml
# En netlify.toml
[[scheduled_functions]]
  name = "hourly-crypto-scraper"
  schedule = "0 * * * *" # Cada hora
```

## Testing

Para verificar qué está fallando:

1. Click "Refresh Now" en el dashboard
2. Ve a Netlify Dashboard → Logs → Functions
3. Busca logs que empiecen con `₿ [CRYPTO]`
4. Identifica el error específico

Los logs te dirán:
- Tiempo de respuesta
- Status code
- Tipo de error
- Si es timeout, rate limit, o network error

## Contacto

Si el problema persiste después de revisar los logs, compártelos en un issue de GitHub con:
- Los logs completos de `₿ [CRYPTO]`
- La respuesta del navegador `📦 [PRIVATE DASHBOARD]`
- Screenshot del error
