# Convive · App móvil (propietarios y residentes)

Aplicación en **React Native con Expo (SDK 57, TypeScript)** que consume la API de `backend/`
(contrato en `docs/API.md`). Funciona en Android, iOS y en el **navegador**.

Módulos: inicio de sesión, activación de cuenta por invitación (con aceptación de la Ley 1581 de 2012),
recuperación de contraseña, estado de cuenta y pago en línea en 3 pasos con comprobante PDF, reservas de zonas
comunes con calendario, PQRS con adjuntos, pre-registro de visitantes con código QR, notificaciones, noticias,
perfil con cambio de contraseña y, para la junta y la administración, el resumen "General" con gráficos.

## Interfaz y navegación

La interfaz sigue los mockups de Figma del equipo (colores centralizados en `src/tema.ts`):

- **Encabezado**: ☰ abre el menú lateral (Mi perfil, Noticias, Mis visitas, Avisos, Historial de pagos,
  Mis reservas, Cerrar sesión), título "Convive" y avatar con las iniciales (abre el Perfil).
- **Chips de secciones**: Inicio · Pagos · Reservas · PQRS · General. "General" solo aparece para los roles
  `JUNTA` o `ADMINISTRADOR` y usa `GET /api/admin/resumen`.
- **Barra inferior**: Inicio, Visitas (QR), Avisos (con el contador de no leídas) y Perfil.
- **Pago en 3 pasos** (pantallas de pila con "✕ Cancelar"): concepto → medio de pago (PSE, tarjeta o
  Nequi/Daviplata; la pasarela de pruebas es la misma) → confirmación con consulta periódica y "Pago exitoso".
- Para ir a una pestaña desde cualquier pantalla se usa `navigate('Principal', { screen: 'Pagos' }, { pop: true })`
  (función `irAPestana` de `src/navegacion/tipos.ts`).

Los gráficos de "General" se dibujan con `react-native-svg` (sin librerías de gráficos) y tienen leyenda,
detalle al tocar y vista en tabla.

## Instalación

```bash
cd app-movil
npm install
cp .env.example .env      # y ajuste EXPO_PUBLIC_API_URL
```

## Variables de entorno

| Variable | Descripción |
|---|---|
| `EXPO_PUBLIC_API_URL` | URL base de la API, sin `/` final. Por defecto `http://localhost:3000`. |

- **Navegador** o **simulador iOS** en el mismo computador: `http://localhost:3000`.
- **Emulador Android**: `http://10.0.2.2:3000`.
- **Teléfono físico**: `localhost` apunta al propio teléfono. Use la IP local del computador
  (`ipconfig` → por ejemplo `http://192.168.1.50:3000`, con el teléfono en la misma Wi-Fi) o la URL de Render.

La variable se incrusta al compilar: después de cambiarla reinicie con `npx expo start -c`.

## Ejecución

Primero inicie la API (`cd backend && npm run dev`).

```bash
npx expo start          # muestra el QR para Expo Go (Android / iOS)
npx expo start --web    # versión web en http://localhost:8081
npx expo start --android  # emulador Android abierto (Android Studio)
npx expo start --tunnel # Expo Go fuera de la red local (con la API en Render)
```

- **Expo Go**: instale Expo Go en el teléfono y escanee el QR. Compruebe que la versión de Expo Go
  sea compatible con el SDK 57.
- **Web**: el origen `http://localhost:8081` debe estar en `CORS_ORIGIN` del backend
  (ya incluido en `backend/.env.example`; si cambió el `.env`, reinicie la API).

Usuarios de prueba: `propietario1@convive-demo.co` / `Propietario#2026` (responsable de pago),
`residente1@convive-demo.co` / `Residente#2026` (sin responsabilidad de pago: no ve "Abonar") y
`junta1@convive-demo.co` / `Junta#2026` (junta y propietaria: ve la sección "General").

## APK de prueba (EAS Build)

`eas.json` incluye el perfil `preview`, que genera un **APK** instalable y apunta a la API de Render
(ajuste `EXPO_PUBLIC_API_URL` en ese perfil si su URL es otra).

```bash
npm install -g eas-cli
eas login
eas build --profile preview --platform android
```

El primer build vincula el proyecto con su cuenta de Expo (agrega `extra.eas.projectId` a `app.json`).
Al terminar, EAS entrega un enlace y un QR para descargar el APK.

## Verificación

```bash
npm run typecheck        # tsc --noEmit
npm run exportar-web     # compila el bundle web en dist/ (bórrelo después)
npm run probar-api       # prueba el cliente HTTP de la app contra la API real
```

Para compilar o probar contra la API local sin tocar `.env`, pase la variable en el comando:
`EXPO_PUBLIC_API_URL=http://localhost:3000 npx expo export --platform web`.

`scripts/probar-api.ts` usa los mismos módulos `src/api/*` de la app: inicio de sesión, renovación automática
del token en 401, estado de cuenta, disponibilidad, reservas (con conflicto de franja), visitas, comprobante PDF,
residente sin permiso de pago, resumen de la pantalla General (403 para propietarios; los cuatro periodos para
la junta), invitación + activación + recuperación de contraseña y PQRS con adjunto (multipart). Crea un usuario y una PQRS de prueba en la base de datos.

## Estructura

```
App.tsx                      Proveedores (sesión, notificaciones) y navegación
src/api/cliente.ts           Cliente HTTP: token, renovación en 401, errores
src/api/servicios.ts         Funciones por recurso de la API
src/api/almacenamiento.ts    SecureStore (nativo) / localStorage (web)
src/contexto/                Sesión y contador de notificaciones
src/navegacion/              Pila de autenticación, pila principal, pestañas, encabezado, menú y barra inferior
src/pantallas/               Pantallas por módulo (pagos en 3 pasos, reservas, pqrs, general, visitas…)
src/componentes/             Tarjetas, botones, chips, campos, calendario, gráficos SVG, logo y avatar
src/utils/                   Formato COP/fechas, diálogos, descargas, pasarela de pago, push
scripts/probar-api.ts        Prueba de integración contra la API
```

## Limitaciones conocidas

- **Notificaciones push**: Expo Go en Android no admite push remotas desde el SDK 53; en web tampoco se usan.
  El registro del token solo se intenta en un dispositivo físico con `projectId` de EAS (build de desarrollo
  o APK) y cualquier fallo se ignora. La bandeja de **Avisos** dentro de la app es el mecanismo principal
  (se actualiza al abrirla, al volver a la app y cada minuto).
- **localhost en el teléfono**: ver "Variables de entorno". La pasarela simulada del backend construye la URL
  del checkout con su `PUBLIC_API_URL`; si es `localhost`, la app la reescribe con `EXPO_PUBLIC_API_URL`.
- **Pago en la web**: el checkout se abre en una pestaña nueva; si el navegador bloquea la ventana emergente,
  use el botón "Abrir pasarela de pago" de la pantalla de resultado.
- Las reservas se eligen en un calendario propio; las horas y la fecha de las visitas se escriben en formato
  HH:MM y AAAA-MM-DD (con atajos para los próximos días). No se usa un selector nativo para que todo funcione
  igual en web.
- El medio de pago elegido (PSE, tarjeta o Nequi/Daviplata) solo se guarda en la app: la pasarela de pruebas
  es la misma para los tres y la API no lo registra.
- El perfil muestra la unidad y el nombre del conjunto: la API no expone la ciudad del conjunto a los habitantes.
- En web los tokens se guardan en `localStorage` (en el teléfono, en el almacenamiento seguro del sistema).
