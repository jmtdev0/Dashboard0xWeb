# Sync TODOs from Production to Local

Este script sincroniza los TODOs desde el storage de producción de Netlify al sandbox local.

## Uso Rápido

```bash
npm run sync-todos
```

Este comando:
1. Descarga TODOs de producción
2. Los copia al sandbox local de Netlify Blobs
3. Verifica que la sincronización fue exitosa

**Nota**: Necesitas reiniciar `netlify dev` después de ejecutar este script para ver los cambios.

## Uso Manual (Alternativa)

Si prefieres hacerlo manualmente:

```bash
# 1. Descargar TODOs de producción
netlify blobs:get todos todos-data > todos-prod.json

# 2. Copiar al sandbox local
# Windows PowerShell:
$sandboxFile = (Get-ChildItem .netlify\blobs-serve\entries -Recurse -Filter "todos-data" | Select-Object -First 1).FullName
Copy-Item todos-prod.json $sandboxFile -Force

# 3. Reiniciar netlify dev
```

## Nota Importante

- El sandbox local de Netlify Blobs es **independiente** del storage de producción
- Esto es **por diseño** para proteger los datos de producción
- Si necesitas trabajar con los datos de producción en local, ejecuta `npm run sync-todos` primero
- Los cambios en local NO afectan a producción (están completamente separados)

## Ver diferencias

```bash
# Ver TODOs en producción
netlify blobs:get todos todos-data | ConvertFrom-Json | Select-Object -ExpandProperty todos | Measure-Object | Select-Object -ExpandProperty Count

# Ver TODOs en local (después de sync)
# Reinicia netlify dev y prueba el API
```

