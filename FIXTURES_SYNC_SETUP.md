# POLLASA: Fixtures Sync

## Objetivo

Los fixtures ya no tienen que vivir solo en el frontend. Esta app puede leerlos desde `competition_snapshots` en Supabase y sincronizarlos con Vercel.

## 1. Ejecutar SQL nuevo

Corre el `supabase-schema.sql` actualizado para crear:
- `competition_snapshots`
- la policy pública de lectura

## 2. Variables nuevas en Vercel

Agrega:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

`SUPABASE_URL` puede ser el mismo valor que `VITE_SUPABASE_URL`.

## 3. Primera carga manual

Puedes hacer una carga inicial local con:

```bash
SUPABASE_URL="https://tu-proyecto.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="tu-service-role" \
node scripts/sync-fixtures-to-supabase.mjs
```

## 4. Sincronización automática

El archivo `vercel.json` deja configurado un cron diario a:

`/api/sync-fixtures`

Eso toma `public/fixtures.json` del repo desplegado y lo sube a Supabase.

## 5. Siguiente paso real

Para que las próximas fechas de Serie A aparezcan sin editar el repo, hay que reemplazar el contenido de `public/fixtures.json` por una fuente actualizable o por un scraper/controlador que tome la programación oficial de LigaPro y la normalice antes del sync.
