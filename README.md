# Smart Parking

Control de acceso vehicular con credenciales QR para el campus.
Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Supabase.

## Arrancar en VS Code

```bash
npm install
npm run setup:mediapipe      # copia el WASM y descarga el modelo facial a public/mediapipe
cp .env.example .env.local   # en Windows: copy .env.example .env.local
npm run dev                  # http://localhost:3000
```

La cámara solo funciona en `localhost` o con HTTPS. Para probar la foto desde un celular en la red local usa `npx next dev --experimental-https` y abre la dirección `https://` que muestra.

## Configurar Supabase

La app siempre usa la base de datos de Supabase (no hay modo demo).

1. Llena `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` en `.env.local`.
2. Define `SESSION_SECRET` (32+ caracteres) y `HARDWARE_API_KEY`. Opcional: `ADMIN_USER` y `ADMIN_PASSWORD` para un admin de pruebas, y `ENABLE_SCAN_SIMULATOR=true` para mostrar «Simular lectura de QR» en `/admin` (registra accesos reales).

| Cuenta | Cómo entra | Va a |
|---|---|---|
| Admin de pruebas | `ADMIN_USER` / `ADMIN_PASSWORD` de `.env.local` | `/admin` |
| Administrador | Correo y contraseña de una cuenta con `rol = 'administrador'` en la tabla `usuarios` | `/admin` |
| Alumno y comunidad | Correo institucional registrado en `/register` | `/cliente` |

Usa las tablas existentes: `usuarios`, `vehiculos`, `accesos`, `bitacora`, `foto_perfil_subidas` y el bucket privado `fotos-perfil`.

## Rutas

| Ruta | Qué es |
|---|---|
| `/` | Landing |
| `/login`, `/register` | Acceso y registro con correo institucional |
| `/cliente` | Inicio con credencial QR, Vehículos, Historial, Perfil |
| `/cliente/perfil/foto` | Foto de perfil verificada en el teléfono (MediaPipe). `?debug=1` muestra las métricas en vivo |
| `/admin` | Resumen, Accesos, Vehículos, Usuarios, Bitácora (con exportación CSV) |
| `/admin/fotos` | Revisión de fotos: una a la vez, la más antigua primero (A aprueba, R rechaza) |
| `POST /api/hardware/scan` | Escáner de caseta. Exige `x-api-key`. Responde `action: "OPEN"` o `"DENY"` para la pluma |

## Seguridad incluida

- Sesión firmada HMAC SHA 256, cookie `httpOnly` + `sameSite=strict`; cliente 5 min de inactividad, admin 30 min.
- `src/proxy.ts` protege `/cliente` y `/admin` por rol.
- La clave de servicio de Supabase solo se usa en el servidor; cada consulta se filtra por el usuario de la sesión.
- Escáner con `x-api-key` en comparación de tiempo constante (corrige SEG-04).
- Límite de intentos en login y registro, pausa de 0.6 s tras un login fallido, verificación de origen (CSRF).
- Cabeceras CSP, HSTS, X-Frame-Options, Referrer-Policy y Permissions-Policy en `next.config.ts`.
- La bitácora se movió dentro del panel protegido (antes era pública).
- Exportación CSV protegida contra inyección de fórmulas.

## Foto de perfil verificada

- El rostro se analiza en el navegador con `@mediapipe/tasks-vision` (FaceLandmarker). Al servidor solo viajan la foto JPEG y `foto_checks` (R1 a R11). Nunca landmarks ni métricas.
- Código en `src/features/face-capture/`: umbrales en `config.ts`, reglas puras en `rules.ts`, prueba de vida en `liveness.ts`, métricas en `metrics.ts`.
- `POST /api/perfil/foto` valida el tipo real por sus bytes, 3 MB máximo, 5 subidas por hora y consentimiento. Con sharp la recorta a 600 × 800, JPEG calidad 85, sin EXIF ni GPS. La foto queda «pendiente» y solo el administrador cambia su estado.
- La CSP bloquea la telemetría que MediaPipe intenta enviar a Google. En la consola aparece un aviso de conexión bloqueada: es esperado.

## Scripts

`npm run dev` · `npm run build` · `npm start` · `npm run lint` · `npm run typecheck` · `npm test` (vitest: reglas, prueba de vida y métricas) · `npm run setup:mediapipe`
