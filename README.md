# Convive — Prototipo funcional

Aplicación para la gestión de conjuntos residenciales y propiedad horizontal: pagos de administración,
reservas de zonas comunes, PQRS, noticias, control de visitantes con código QR y parqueaderos.

Proyecto académico del módulo **Gerencia de Proyectos Informáticos** (Ingeniería de Software). Este repositorio
contiene el **producto de software** de la Entrega 3 (sección 4 del documento maestro): la API, el panel
administrativo web y la aplicación móvil, construidos según el diseño UML y el modelo de datos de la Entrega 2.

| Carpeta | Componente | Tecnología | Despliegue |
|---|---|---|---|
| [`backend/`](backend/) | API REST, lógica de negocio y base de datos | Node.js + Express + TypeScript, Prisma ORM, PostgreSQL, JWT + bcrypt | Render |
| [`web-admin/`](web-admin/) | Panel administrativo (Administrador, Junta, Portería) | React + Vite + TypeScript | Vercel |
| [`app-movil/`](app-movil/) | App para propietarios y residentes | React Native + Expo (Android, iOS y web) | Vercel (versión web) / Expo Go |
| [`docs/`](docs/) | Contrato de la API y guía de despliegue | Markdown | — |

## Servidor de pruebas público

| Componente | URL |
|---|---|
| API REST (Render) | <https://convive-api-mn8i.onrender.com> · estado: <https://convive-api-mn8i.onrender.com/health> |
| Panel administrativo web (Vercel) | <https://gerencia-proyectos-convive.vercel.app> |
| App móvil, versión web (Vercel) | <https://gerencia-proyectos-convive-app-movi.vercel.app> |

El plan gratuito de Render suspende el servicio tras un periodo sin uso: la primera petición puede tardar cerca
de un minuto. Abra primero `/health`. La app se revisa desde el navegador del teléfono o, en un computador, con
el modo de dispositivo móvil del navegador (F12).

## Arranque rápido (entorno local, Windows)

Requisitos: Node.js 20 o superior y Git. **No hace falta instalar PostgreSQL ni Docker**: el backend trae un
PostgreSQL embebido para desarrollo.

```bash
# 1. Backend
cd backend
npm install
copy .env.example .env          # en Git Bash/macOS/Linux: cp .env.example .env
npm run db:local                # Terminal 1: deja corriendo PostgreSQL local (puerto 5433)
```

```bash
# Terminal 2 (dentro de backend/)
npx prisma migrate deploy       # crea las 27 tablas del modelo entidad-relación
npx prisma db seed              # carga los datos de prueba
npm run dev                     # API en http://localhost:3000
npm run smoke                   # (opcional) ejecuta las 7 pruebas de humo de la sección 4.7
```

```bash
# Terminal 3: panel web → http://localhost:5173
cd web-admin && npm install && npm run dev

# Terminal 4: app móvil (web en http://localhost:8081, o escanee el QR con Expo Go)
cd app-movil && npm install && npx expo start
```

## Usuarios de prueba (Entrega 3, Tabla 19)

| Rol | Correo | Contraseña | Dónde |
|---|---|---|---|
| Administrador | admin@convive-demo.co | Admin#2026 | Panel web |
| Propietario | propietario1@convive-demo.co | Propietario#2026 | App móvil |
| Residente | residente1@convive-demo.co | Residente#2026 | App móvil |
| Personal de portería | porteria1@convive-demo.co | Porteria#2026 | Panel web (control de acceso) |
| Junta Directiva | junta1@convive-demo.co | Junta#2026 | Panel web |
| Invitado (por activar) | invitado@convive-demo.co | código `CONVIVE1` | App móvil → "Activar cuenta" |

Estas credenciales son exclusivas del entorno de pruebas y deben eliminarse antes de usar datos reales.

## Alcance implementado frente al documento

| Requerimiento | Módulo (EDT) | Implementado |
|---|---|---|
| RF-01 Autenticación y roles | 4.1 | Inicio de sesión con JWT y token de refresco, bloqueo tras 5 intentos (RN-01), activación por invitación con aceptación de la Ley 1581 (RN-10), recuperación de contraseña, bitácora de auditoría |
| RF-02 Pagos | 4.2 | Cuotas por coeficiente de copropiedad, estado de cuenta, pago en línea (simulador o Wompi sandbox) con confirmación firmada e idempotente, comprobante PDF consecutivo (RN-08), pago manual, intereses de mora (RN-02), recordatorios automáticos |
| RF-03 Reservas | 4.3 | Zonas comunes con reglamento, calendario de disponibilidad, validación de aforo/horario/anticipación, control de concurrencia (RN-03), bloqueos por mantenimiento |
| RF-04 PQRS | 4.4 | Radicado consecutivo, adjuntos (RN-09), asignación, respuesta, cierre, historial, calificación y plazo en días hábiles (RN-04) |
| RF-05 Noticias | 4.5 | Publicación segmentada (todos, propietarios, residentes o torre), notificaciones en la app y push opcional |
| RF-06 Visitantes | 4.6 | Pre-registro, QR firmado de un solo uso válido solo en su franja (RN-05), validación en portería con cámara, salida |
| RF-07 Parqueaderos | 4.6 | Celdas de residentes y visitantes, asignación sin duplicidad (RN-06), liberación |
| RF-08 Reportes | 4.2 | Recaudo, cartera, PQRS, reservas y visitas; exportación PDF y XLSX |
| RF-09 Panel web | 3.0 / 4.1 | Configuración del conjunto, torres, unidades, usuarios y roles |

**Limitaciones del prototipo** (coherentes con la sección 4.9 de la Entrega 3): la pasarela opera en modo de
pruebas; la app se publica como versión web en Vercel y puede ejecutarse con Expo Go, sin publicación en tiendas; el envío de correos se reemplaza
por códigos visibles en modo demostración; los archivos subidos en el plan gratuito de Render no son persistentes
(los comprobantes se regeneran al descargarlos).

## Flujo de trabajo (GitFlow)

| Rama | Propósito |
|---|---|
| `main` | Versiones liberadas (etiquetas `v1.0.0`, …) |
| `develop` | Integración de los requerimientos terminados |
| `feature/RF-XX-…` | Un requerimiento funcional por rama; se integra a `develop` mediante *pull request* |
| `release/X.Y.Z` | Preparación de una versión; se integra a `main` y luego de vuelta a `develop` |

Ramas de funcionalidad, en el orden en que se integraron: `feature/RF-01-autenticacion`,
`feature/RF-09-panel-administrativo`, `feature/RF-02-pagos`, `feature/RF-03-reservas`, `feature/RF-04-pqrs`,
`feature/RF-05-noticias`, `feature/RF-06-visitantes`, `feature/RF-07-parqueaderos` y `feature/RF-08-reportes`.
RF-09 se integró en segundo lugar porque el tablero, las torres y las unidades son la base del panel web.

En los archivos que registran los módulos (`backend/src/app.ts`, `web-admin/src/App.tsx`, `web-admin/src/rutas.ts`,
`app-movil/src/navegacion/Navegacion.tsx`, entre otros), la etiqueta `@RF-XX` o el bloque `#region @RF-XX` indica el
requerimiento funcional que introdujo cada línea, lo que da trazabilidad entre el código y la Tabla 3 de la Entrega 1.

## Calidad

- `cd backend && npm test`: pruebas unitarias de las reglas de negocio RN-01 a RN-09 y de las firmas de seguridad.
- `cd backend && npm run smoke [URL]`: protocolo de verificación del despliegue (sección 4.7) contra la API local o la de Render.
- GitHub Actions ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) se ejecuta en cada *pull request* hacia `develop` o `main`: compila los tres proyectos, ejecuta las
  pruebas unitarias y corre las pruebas de humo contra una base PostgreSQL (respuesta al riesgo R03).

## Documentación

- [Contrato de la API](docs/API.md)
- [Guía de despliegue en Render, Vercel y Expo](docs/DESPLIEGUE.md)
