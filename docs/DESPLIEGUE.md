# Guía de despliegue en el servidor de pruebas

Implementa los pasos 6 a 10 del instructivo de instalación y despliegue (Entrega 3, sección 4.4).
Antes de empezar, el código debe estar en GitHub (rama `main`).

## 1. Backend y base de datos en Render (pasos 6 a 8)

1. Cree una cuenta en <https://render.com> e inicie sesión con GitHub.
2. Seleccione **New → Blueprint**, elija el repositorio `Gerencia_Proyectos_Convive` y confirme.
   Render lee [`render.yaml`](../render.yaml) y crea:
   - el servicio web `convive-api` (carpeta `backend/`, plan gratuito), y
   - la base PostgreSQL `convive-db` (plan gratuito), conectada mediante `DATABASE_URL`.
3. Espere a que termine el despliegue. En cada arranque se ejecutan `prisma migrate deploy` (crea las tablas) y
   `prisma db seed` (carga los usuarios de prueba si no existen).
4. En **convive-api → Environment**, complete las variables marcadas como pendientes:
   - `PUBLIC_API_URL` = la URL del servicio, por ejemplo `https://convive-api.onrender.com`
   - `CORS_ORIGIN` = la URL del panel en Vercel (paso 2) y, si desea, `http://localhost:5173,http://localhost:8081`
5. Verifique: abra `https://convive-api.onrender.com/health` → debe responder `{"estado":"ok","baseDatos":"ok",...}`.

> **Plan gratuito de Render.** El servicio se suspende tras unos minutos sin uso y la primera petición puede tardar
> cerca de un minuto en responder. Abra `/health` unos minutos antes de una demostración (plan de contingencia del
> riesgo R18, sección 4.8). La base gratuita tiene una vigencia limitada; si vence, cree una nueva en Render o use
> una base gratuita de <https://neon.tech> y actualice `DATABASE_URL`. El disco del plan gratuito no es persistente:
> los adjuntos de PQRS se pierden al reiniciar (los comprobantes de pago se regeneran automáticamente).

## 2. Panel administrativo en Vercel (paso 9)

1. Cree una cuenta en <https://vercel.com> con GitHub y seleccione **Add New → Project**.
2. Importe el repositorio y configure:
   - **Root Directory:** `web-admin`
   - **Framework Preset:** Vite (se detecta solo)
   - **Environment Variables:** `VITE_API_URL` = `https://convive-api.onrender.com`
3. Pulse **Deploy**. Vercel entrega una URL pública HTTPS, por ejemplo `https://convive-admin.vercel.app`.
4. Regrese a Render y agregue esa URL a `CORS_ORIGIN` (paso 1.4). Render redepliega automáticamente.

## 3. App móvil de prueba (paso 10)

Opción A, **Expo Go** (la más rápida para la sustentación):

```bash
cd app-movil
# En app-movil/.env:
#   EXPO_PUBLIC_API_URL=https://convive-api.onrender.com
npx expo start --tunnel
```

Escanee el QR con la app **Expo Go** (Android o iOS). Con `--tunnel` funciona aunque el teléfono no esté en la
misma red Wi-Fi.

Opción B, **APK instalable para Android** (requiere una cuenta gratuita en <https://expo.dev>):

```bash
npm install -g eas-cli
eas login
cd app-movil
eas build --profile preview --platform android
```

Al terminar, EAS entrega un enlace y un QR para descargar el APK; compártalo con los usuarios piloto.

Opción C, **versión web** de la app: `npx expo start --web` (útil para mostrarla desde un computador).

## 4. Verificación del despliegue (sección 4.7)

Desde su computador:

```bash
cd backend
npm run smoke -- https://convive-api.onrender.com
```

El script ejecuta las siete pruebas de humo (salud, inicio de sesión de los cuatro roles, pago con comprobante,
reserva con bloqueo de cupo, PQRS con adjunto, noticia con notificación y validación de QR) e imprime el resultado
de cada una con fecha y hora. Registre la salida y capturas de pantalla en la hoja `Verificacion_Despliegue` del
anexo de la Entrega 3.

## 5. (Opcional) Pasarela Wompi en modo sandbox

Por defecto se usa el simulador de pagos propio (`PAYMENT_PROVIDER=mock`). Para usar Wompi:

1. Regístrese en <https://comercios.wompi.co> y active el **entorno de pruebas**.
2. En **Desarrolladores**, copie las llaves de pruebas: pública (`pub_test_...`), privada (`prv_test_...`),
   secreto de integridad (`test_integrity_...`) y secreto de eventos (`test_events_...`).
3. En Render, configure `PAYMENT_PROVIDER=wompi`, las cuatro variables `WOMPI_*` y
   `WOMPI_REDIRECT_URL=https://convive-api.onrender.com/api/pagos/retorno`.
4. En Wompi, registre la **URL de eventos**: `https://convive-api.onrender.com/api/pagos/webhook`.
5. Pague con las tarjetas de prueba que publica Wompi en su documentación (por ejemplo, la tarjeta de pruebas
   aprobada `4242 4242 4242 4242`).

Nota: con Wompi activo, la prueba de humo n.º 3 avisará que requiere el simulador; las demás pruebas no cambian.
