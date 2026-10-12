# Convive · Panel administrativo web

Panel web del prototipo **Convive** para la administración, la junta directiva y la portería del conjunto residencial.
Construido con React 19 + Vite 7 + TypeScript, con CSS propio (sin librerías de UI).

| Rol | Secciones |
|---|---|
| ADMINISTRADOR | Todas: tablero, finanzas, reportes, reservas, PQRS, noticias, usuarios, unidades y torres, control de acceso, visitas del día, parqueaderos, auditoría y conjunto |
| JUNTA | Tablero, reportes, noticias y PQRS (solo lectura) |
| PORTERIA | Control de acceso (QR), visitas del día y parqueaderos |

Los propietarios y residentes usan la app móvil. Si inician sesión aquí, el panel se lo indica.

## Requisitos

- Node.js 20 o superior (probado con Node 24 y npm 11)
- El backend de Convive corriendo (por defecto en `http://localhost:3000`)

## Instalación y ejecución local

```bash
cd web-admin
npm install            # esbuild ya está aprobado en "allowScripts" (npm 11)
cp .env.example .env   # opcional: ajuste VITE_API_URL
npm run dev            # http://localhost:5173
```

Otros comandos:

- `npm run build`: verificación de tipos (`tsc`) y compilación de producción en `dist/`
- `npm run preview`: sirve localmente la compilación de producción
- `npm run typecheck`: solo la verificación de tipos

## Variables de entorno

| Variable | Descripción | Valor por defecto |
|---|---|---|
| `VITE_API_URL` | URL base del backend, sin `/api` ni barra final | `http://localhost:3000` |

Vite incrusta la variable al compilar, así que después de cambiarla hay que volver a compilar o desplegar.

## Despliegue en Vercel

1. Importe el repositorio en Vercel y defina **Root Directory = `web-admin`**.
2. Framework: **Vite**. Build command: `npm run build`. Output directory: `dist`. Ya vienen configurados en `vercel.json`.
3. En *Settings → Environment Variables* agregue `VITE_API_URL` con la URL pública del backend (por ejemplo `https://convive-api.onrender.com`).
4. En el backend, agregue el dominio de Vercel a `CORS_ORIGIN`.

`vercel.json` reescribe todas las rutas a `/index.html`, así que recargar la página en `/finanzas` u otra ruta funciona.

## Notas técnicas

- **Sesión:** `accessToken` y `refreshToken` se guardan en `localStorage`. Ante un 401 el cliente llama una vez a `POST /api/auth/refresh` y repite la petición. Si la renovación falla, se cierra la sesión.
- **Descargas** (comprobantes PDF, reportes PDF/XLSX, adjuntos de PQRS): se hacen con `fetch` y el encabezado `Authorization`, y se guardan como *blob*.
- **Lector QR:** usa `html5-qrcode`. Se carga bajo demanda solo en *Control de acceso*. La cámara exige HTTPS o `localhost`. Siempre se puede escribir el código a mano.
- **Formatos:** la moneda se muestra en COP con `Intl.NumberFormat('es-CO')` y las fechas en es-CO con la zona horaria `America/Bogota`.
- **Estructura:** `src/api` (cliente HTTP y tipos), `src/auth` (contexto de sesión), `src/components` (layout, UI, lector QR), `src/pages` (una vista por sección), `src/hooks`, `src/utils`.
