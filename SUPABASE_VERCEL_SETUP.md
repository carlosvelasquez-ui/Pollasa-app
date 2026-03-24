# POLLASA: Supabase + Vercel

## 1. Crear proyecto en Supabase

1. Crea un proyecto nuevo en Supabase.
2. Ve a `SQL Editor`.
3. Ejecuta completo el archivo `supabase-schema.sql`.
4. En `Authentication > Providers > Email`, deja activo `Email`.
5. Para pruebas rapidas, desactiva la confirmacion por correo si quieres que la cuenta entre de una vez.

## 2. Variables para la app

1. Copia `.env.example` a `.env.local`.
2. Llena:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

## 3. Probar local

```bash
npm run dev
```

Con Supabase activo:
- cada usuario crea su cuenta real
- las ligas se comparten
- las solicitudes de ingreso llegan al admin
- los pronosticos quedan guardados en la nube

## 4. Publicar en Vercel

1. Sube este proyecto a GitHub.
2. En Vercel, importa el repo.
3. En `Project Settings > Environment Variables`, agrega:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Haz deploy.

## 5. Flujo de prueba real recomendado

1. Crear una liga de `Campeonato Ecuatoriano Serie A`.
2. Compartir el link de invitacion.
3. Pedir a 5-10 personas que creen cuenta.
4. Aprobar solicitudes.
5. Cada uno llena sus resultados antes del cierre.
6. Revisar tabla, historial y bloqueos en vivo.
