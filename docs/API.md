# Contrato de la API REST de Convive (v1)

Contrato congelado de la API del prototipo, conforme a la respuesta al riesgo **R01** de la Entrega 3
("definir y congelar el contrato de la API antes del desarrollo paralelo de los módulos").

- **URL base local:** `http://localhost:3000` · **Prefijo:** `/api`
- **Formato:** JSON (UTF-8). Fechas `AAAA-MM-DD`, horas `HH:MM` (hora de Colombia), marcas de tiempo ISO-8601 UTC.
- **Valores monetarios:** número en pesos colombianos (COP).
- **Autenticación:** encabezado `Authorization: Bearer <accessToken>`. El token de acceso vence (por defecto 30 min);
  se renueva con `POST /api/auth/refresh`.
- **Errores:** `{ "error": "mensaje para el usuario", "code": "CODIGO", "detalles"?: [{campo, mensaje}] }`
  con códigos HTTP 400 (validación), 401 (no autenticado), 403 (sin permiso), 404, 409 (conflicto), 422, 423 (cuenta bloqueada).
- **Roles:** `ADMINISTRADOR`, `JUNTA`, `PROPIETARIO`, `RESIDENTE`, `PORTERIA`.

## Salud

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/health` | `{ estado: "ok", baseDatos: "ok", hora }` (200) o 503 si la base de datos no responde |

## Autenticación — `/api/auth` (RF-01)

| Método | Ruta | Cuerpo | Respuesta |
|---|---|---|---|
| POST | `/login` | `{ correo, contrasena, plataforma?: "ANDROID"\|"IOS"\|"WEB", dispositivo? }` | `{ accessToken, refreshToken, usuario: { id, correo, nombre, roles: string[], idConjunto } }` |
| POST | `/refresh` | `{ refreshToken }` | igual que `/login` (rota el refreshToken) |
| POST | `/logout` | `{ refreshToken }` | `{ ok }` |
| POST | `/activar` | `{ correo, codigo, contrasena, aceptaTratamientoDatos: true }` | `{ ok, mensaje }` — CU-05/CU-06 |
| POST | `/recuperar` | `{ correo }` | `{ ok, mensaje, codigoDemo? }` (codigoDemo solo si DEMO_MODE=true) |
| POST | `/restablecer` | `{ correo, codigo, contrasena }` | `{ ok, mensaje }` |
| GET | `/me` 🔒 | — | `{ id, tipoDocumento, numeroDocumento, nombres, apellidos, correo, telefono, roles, conjunto: {id_conjunto, nombre}, unidades: [{ idUnidad, numero, torre, tipoRelacion, esResponsablePago }], ultimoAcceso }` |
| PUT | `/me` 🔒 | `{ telefono?, contrasenaActual?, contrasenaNueva? }` | `{ ok }` |
| POST | `/dispositivos` 🔒 | `{ token, plataforma: "ANDROID"\|"IOS" }` | `{ ok }` (token push de Expo) |

Contraseña: mínimo 8 caracteres, una mayúscula y un número. Cinco intentos fallidos → 423 `CUENTA_BLOQUEADA` por 15 minutos (RN-01).

## Administración — `/api/admin` (RF-09) 🔒

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/tablero` | ADMIN, JUNTA | `{ unidades, usuarios, carteraPendiente, cuotasPendientes, recaudoMes, pqrsAbiertas, reservasHoy, visitasHoy }` |
| GET / PUT | `/conjunto` | ADMIN | Datos del conjunto (`nombre, nit, direccion, ciudad, departamento, telefono, correo_contacto, numero_unidades`) |
| GET | `/torres` | todos | `[{ id_torre, nombre, numero_pisos, unidades }]` |
| POST | `/torres` | ADMIN | `{ nombre, numero_pisos? }` |
| GET | `/unidades` | ADMIN, JUNTA, PORTERIA | `[{ id_unidad, numero, torre, id_torre, tipo, piso, area_m2, coeficiente, estado, ocupantes: [{ id_ocupacion, id_usuario, nombre, correo, tipo_relacion, es_responsable_pago }] }]` |
| POST / PUT | `/unidades`, `/unidades/:id` | ADMIN | `{ id_torre?, numero, tipo: APARTAMENTO\|CASA\|LOCAL, piso?, area_m2?, coeficiente (0-1), estado? }` |
| GET | `/usuarios` | ADMIN | `[{ id_usuario, tipo_documento, numero_documento, nombres, apellidos, correo, telefono, estado, codigo_invitacion, acepta_tratamiento_datos, ultimo_acceso, roles, unidades: [{ id_unidad, unidad, tipo_relacion, es_responsable_pago }] }]` |
| POST | `/usuarios` | ADMIN | Invitar: `{ tipo_documento: CC\|CE\|PA\|TI, numero_documento, nombres, apellidos, correo, telefono?, roles: [...], id_unidad? (obligatorio si el rol es PROPIETARIO o RESIDENTE), tipo_relacion?, es_responsable_pago? }` → `{ id_usuario, correo, codigo_invitacion, mensaje }` |
| PUT | `/usuarios/:id` | ADMIN | `{ estado?: ACTIVO\|INACTIVO, roles?, telefono? }` |
| POST | `/ocupaciones` | ADMIN | `{ id_unidad, id_usuario, tipo_relacion, es_responsable_pago }` |
| POST | `/ocupaciones/:id/finalizar` | ADMIN | Desvincula (RN-07: debe quedar un responsable de pago) |
| GET | `/auditoria?accion=&entidad=&limite=` | ADMIN | `[{ id_log, fecha_evento, accion, entidad, id_entidad, detalle (texto JSON), direccion_ip, usuario }]` |

## Pagos y finanzas — `/api` (RF-02) 🔒 salvo donde se indica

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/estado-cuenta` | habitante | `[{ id_unidad, unidad, es_responsable_pago, saldo_total, cuotas_vencidas, cuotas: [Cuota] }]` (solo cuotas abiertas) |
| GET | `/cuotas?estado=&periodo=&id_unidad=` | todos | `[Cuota]`; habitante ve sus unidades, ADMIN/JUNTA todo. `estado=ABIERTAS` filtra PENDIENTE/PARCIAL/VENCIDA |
| POST | `/cuotas/generar` | ADMIN | `{ periodo: "AAAA-MM", presupuesto_mensual, fecha_vencimiento, concepto?: ORDINARIA\|EXTRAORDINARIA }` → `{ generadas, omitidas }` |
| POST | `/cuotas/intereses` | ADMIN | `{ periodo, tasa_mensual, fecha_vencimiento }` → `{ creadas }` (RN-02) |
| POST | `/cuotas/recordatorios` | ADMIN | Envía recordatorios ahora → `{ cuotas, notificaciones }` |
| POST | `/pagos` | propietario / responsable | `{ id_unidad, cuotas: [id_cuota] }` → `{ id_pago, referencia, valor_total, checkout_url, pasarela }`. **Abrir `checkout_url` en el navegador.** |
| GET | `/pagos` | todos | `[{ id_pago, id_unidad, unidad, pagador, valor_total, metodo_pago, referencia, estado, fecha_creacion, fecha_confirmacion, comprobante, cuotas: [{ periodo, concepto, valor_aplicado }] }]` |
| GET | `/pagos/:id` | dueño o gestión | `{ id_pago, estado, valor_total, referencia, comprobante }` (para consultar el resultado tras el checkout) |
| GET | `/pagos/:id/comprobante` | dueño o gestión | PDF (descarga) |
| POST | `/pagos/manual` | ADMIN | `{ id_unidad, valor, metodo_pago: TRANSFERENCIA\|EFECTIVO, referencia? }` |
| POST | `/pagos/webhook` | público | Confirmación firmada de la pasarela |
| GET/POST | `/pagos/simulador/:referencia` | público | Checkout HTML del simulador |

`Cuota = { id_cuota, id_unidad, unidad, periodo, concepto, valor, saldo, fecha_vencimiento, estado: PENDIENTE|PARCIAL|PAGADA|VENCIDA }`

Estados del pago: `PENDIENTE`, `APROBADO`, `RECHAZADO`, `ANULADO`. Las notificaciones de pago aprobado o rechazado usan el tipo `RECORDATORIO_PAGO`.

## Reportes — `/api/reportes/:tipo` (RF-08) 🔒 ADMIN, JUNTA

`tipo`: `recaudo`, `cartera`, `pqrs`, `reservas`, `visitas`. Query: `desde`, `hasta` (AAAA-MM-DD), `formato` = `json` | `pdf` | `xlsx`.
JSON: `{ tipo, titulo, subtitulo, columnas: string[], filas: (string|number)[][], resumen: { [clave]: valor ya formateado como texto o número } }`.
PDF/XLSX: archivo descargable.

## Reservas — `/api` (RF-03) 🔒

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/zonas` | todos | `[Zona]` |
| POST / PUT | `/zonas`, `/zonas/:id` | ADMIN | `{ nombre, descripcion?, aforo_maximo, costo_reserva, hora_apertura, hora_cierre, duracion_max_horas, anticipacion_max_dias, reglamento?, estado? }` |
| GET | `/zonas/:id/disponibilidad?fecha=` | todos | `{ zona: Zona, fecha, ocupado: [{ tipo: RESERVA\|BLOQUEO, inicio, fin, detalle }] }` |
| GET / POST | `/zonas/:id/bloqueos` | ADMIN (POST) | `{ fecha_inicio (ISO), fecha_fin (ISO), motivo }` |
| DELETE | `/bloqueos/:id` | ADMIN | Elimina un bloqueo |
| POST | `/reservas` | habitante | `{ id_zona, id_unidad?, fecha, hora_inicio, hora_fin, numero_asistentes, observaciones? }` → `{ id_reserva, estado, valor }`. Conflictos 409: `FRANJA_OCUPADA`, `ZONA_BLOQUEADA`, `ZONA_NO_DISPONIBLE` |
| GET | `/reservas/mias` | todos | `[Reserva]` |
| GET | `/reservas?fecha=&id_zona=&estado=` | ADMIN, JUNTA | `[Reserva]` |
| POST | `/reservas/:id/cancelar` | dueño o ADMIN | `{ ok }` |

`Zona = { id_zona, nombre, descripcion, aforo_maximo, costo_reserva, hora_apertura, hora_cierre, duracion_max_horas, anticipacion_max_dias, reglamento, estado }`
`Reserva = { id_reserva, id_zona, zona, id_unidad, unidad, solicitante, fecha, hora_inicio, hora_fin, numero_asistentes, valor, estado: CONFIRMADA|CANCELADA|FINALIZADA, observaciones, fecha_creacion }`

## PQRS — `/api/pqrs` (RF-04) 🔒

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/` | todos | **multipart/form-data**: `tipo` (PETICION\|QUEJA\|RECLAMO\|SUGERENCIA), `categoria`, `asunto` (≥5), `descripcion` (≥10), `prioridad?`, `id_unidad?`, `adjuntos` (0–3 archivos JPG/PNG/PDF ≤5 MB) → `{ id_pqrs, numero_radicado, fecha_limite }` |
| GET | `/?estado=&tipo=` | todos | Habitante: las propias; ADMIN/JUNTA: todas. `estado=ABIERTAS` = RADICADA/EN_TRAMITE. `[Pqrs]` |
| GET | `/:id` | dueño o gestión | `Pqrs & { seguimientos: [{ estado_anterior, estado_nuevo, comentario, fecha_registro, usuario }], lista_adjuntos: [{ id_adjunto, nombre_archivo, tipo_mime, tamano_kb }] }` |
| GET | `/:id/adjuntos/:idAdjunto` | dueño o gestión | Descarga del archivo |
| POST | `/:id/asignar` | ADMIN | `{ id_responsable?, prioridad?, comentario? }` → EN_TRAMITE |
| POST | `/:id/responder` | ADMIN | `{ respuesta }` → RESPONDIDA |
| POST | `/:id/cerrar` | ADMIN | `{ comentario? }` → CERRADA (requiere respuesta) |
| POST | `/:id/calificar` | solicitante | `{ calificacion: 1..5 }` |

`Pqrs = { id_pqrs, numero_radicado, tipo, categoria, asunto, descripcion, prioridad, estado: RADICADA|EN_TRAMITE|RESPONDIDA|CERRADA, respuesta, calificacion, fecha_radicacion, fecha_limite, fecha_cierre, vencida, solicitante, unidad, responsable, id_responsable, adjuntos (cantidad) }`

## Noticias y notificaciones (RF-05) 🔒

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/api/noticias` | todos | Publicadas y vigentes para el público del usuario. `[Noticia]` |
| GET | `/api/noticias/gestion` | ADMIN, JUNTA | Todas (borradores, publicadas, archivadas) |
| GET | `/api/noticias/:id` | todos | `Noticia` |
| POST | `/api/noticias` | ADMIN, JUNTA | `{ titulo (≥5), contenido (≥10), tipo: NOTICIA\|COMUNICADO\|URGENTE, publico_objetivo: TODOS\|PROPIETARIOS\|RESIDENTES\|TORRE, id_torre_destino?, fecha_expiracion?, publicar?: boolean (def. true) }` → `{ id_noticia, estado, notificados }` |
| PUT | `/api/noticias/:id` | ADMIN, JUNTA | Edición parcial |
| POST | `/api/noticias/:id/publicar` · `/archivar` | ADMIN, JUNTA | Cambia el estado |
| GET | `/api/notificaciones` | todos | `{ no_leidas, notificaciones: [{ id_notificacion, tipo, id_referencia, id_noticia, titulo, mensaje, estado, fecha_creacion, fecha_lectura }] }` (una notificación está leída si `fecha_lectura` no es nula) |
| POST | `/api/notificaciones/:id/leer` · `/api/notificaciones/leer-todas` | todos | Marca como leídas |

`Noticia = { id_noticia, titulo, contenido, tipo, publico_objetivo, id_torre_destino, torre_destino, estado, autor, fecha_publicacion, fecha_expiracion, fecha_creacion }`

## Visitantes — `/api/visitas` (RF-06) 🔒

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/` | habitante | `{ id_unidad?, tipo_documento, numero_documento, nombres, apellidos, telefono?, placa_vehiculo?, fecha_programada, hora_desde, hora_hasta, motivo? }` → `Visita` (incluye `codigo_qr`) |
| GET | `/mias` | habitante | `[Visita]` con `codigo_qr` |
| GET | `/?fecha=AAAA-MM-DD&estado=` | ADMIN, PORTERIA, JUNTA | `[Visita]` (sin `codigo_qr`) |
| GET | `/:id/qr.png` | anfitrión | Imagen PNG del código QR |
| POST | `/:id/cancelar` | anfitrión | `{ ok }` |
| POST | `/validar` | PORTERIA, ADMIN | `{ codigo }` → 200 `{ autorizado: true, visita }` o 422 `INGRESO_NO_AUTORIZADO` con el motivo en `error` |
| POST | `/:id/salida` | PORTERIA, ADMIN | Registra la salida y libera su parqueadero |

`Visita = { id_visita, visitante: { id_visitante, nombre, tipo_documento, numero_documento, telefono, placa_vehiculo }, id_unidad, unidad, anfitrion, anfitrion_telefono, fecha_programada, hora_desde, hora_hasta, motivo, ingresa_vehiculo, estado: PREREGISTRADA|INGRESADA|FINALIZADA|VENCIDA|CANCELADA, codigo_qr?, qr_expira, fecha_hora_ingreso, fecha_hora_salida, vigilante, parqueadero }`

## Parqueaderos — `/api/parqueaderos` (RF-07) 🔒

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/?tipo=RESIDENTE\|VISITANTE` | ADMIN, PORTERIA, JUNTA | `[{ id_parqueadero, codigo, tipo, ubicacion, estado: DISPONIBLE\|OCUPADO\|MANTENIMIENTO, unidad_propietaria, asignacion: { id_asignacion, placa, tipo_vehiculo, fecha_inicio, unidad, visitante } \| null }]` |
| POST | `/` | ADMIN | `{ codigo, tipo, ubicacion?, id_unidad_propietaria? }` |
| PUT | `/:id` | ADMIN | `{ ubicacion?, estado?: DISPONIBLE\|MANTENIMIENTO, id_unidad_propietaria? }` |
| POST | `/:id/asignar` | ADMIN (residente), PORTERIA (visitante) | `{ placa, tipo_vehiculo: CARRO\|MOTO, id_unidad? \| id_visita? }` — 409 `PARQUEADERO_OCUPADO` (RN-06) |
| POST | `/asignaciones/:id/liberar` | ADMIN, PORTERIA | Libera la celda |
