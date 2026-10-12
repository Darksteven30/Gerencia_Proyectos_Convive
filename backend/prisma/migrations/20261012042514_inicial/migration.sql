-- CreateTable
CREATE TABLE "conjunto" (
    "id_conjunto" SERIAL NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "nit" VARCHAR(15) NOT NULL,
    "direccion" VARCHAR(200) NOT NULL,
    "ciudad" VARCHAR(80) NOT NULL,
    "departamento" VARCHAR(80) NOT NULL,
    "telefono" VARCHAR(20),
    "correo_contacto" VARCHAR(120),
    "numero_unidades" INTEGER NOT NULL,
    "estado" VARCHAR(15) NOT NULL DEFAULT 'ACTIVO',
    "fecha_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conjunto_pkey" PRIMARY KEY ("id_conjunto")
);

-- CreateTable
CREATE TABLE "torre" (
    "id_torre" SERIAL NOT NULL,
    "id_conjunto" INTEGER NOT NULL,
    "nombre" VARCHAR(50) NOT NULL,
    "numero_pisos" SMALLINT,

    CONSTRAINT "torre_pkey" PRIMARY KEY ("id_torre")
);

-- CreateTable
CREATE TABLE "unidad_residencial" (
    "id_unidad" SERIAL NOT NULL,
    "id_conjunto" INTEGER NOT NULL,
    "id_torre" INTEGER,
    "numero" VARCHAR(20) NOT NULL,
    "tipo" VARCHAR(15) NOT NULL,
    "piso" SMALLINT,
    "area_m2" DECIMAL(8,2),
    "coeficiente" DECIMAL(7,6) NOT NULL,
    "estado" VARCHAR(15) NOT NULL DEFAULT 'OCUPADA',

    CONSTRAINT "unidad_residencial_pkey" PRIMARY KEY ("id_unidad")
);

-- CreateTable
CREATE TABLE "usuario" (
    "id_usuario" SERIAL NOT NULL,
    "tipo_documento" CHAR(2) NOT NULL,
    "numero_documento" VARCHAR(20) NOT NULL,
    "nombres" VARCHAR(80) NOT NULL,
    "apellidos" VARCHAR(80) NOT NULL,
    "correo" VARCHAR(120) NOT NULL,
    "telefono" VARCHAR(20),
    "hash_contrasena" VARCHAR(255),
    "codigo_invitacion" VARCHAR(64),
    "estado" VARCHAR(15) NOT NULL DEFAULT 'PENDIENTE',
    "intentos_fallidos" SMALLINT NOT NULL DEFAULT 0,
    "bloqueado_hasta" TIMESTAMP(3),
    "acepta_tratamiento_datos" BOOLEAN NOT NULL DEFAULT false,
    "fecha_aceptacion_datos" TIMESTAMP(3),
    "ultimo_acceso" TIMESTAMP(3),
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id_usuario")
);

-- CreateTable
CREATE TABLE "rol" (
    "id_rol" SMALLINT NOT NULL,
    "nombre" VARCHAR(30) NOT NULL,
    "descripcion" VARCHAR(200),

    CONSTRAINT "rol_pkey" PRIMARY KEY ("id_rol")
);

-- CreateTable
CREATE TABLE "usuario_rol" (
    "id_usuario_rol" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "id_rol" SMALLINT NOT NULL,
    "id_conjunto" INTEGER NOT NULL,
    "fecha_asignacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "usuario_rol_pkey" PRIMARY KEY ("id_usuario_rol")
);

-- CreateTable
CREATE TABLE "ocupacion_unidad" (
    "id_ocupacion" SERIAL NOT NULL,
    "id_unidad" INTEGER NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "tipo_relacion" VARCHAR(15) NOT NULL,
    "es_responsable_pago" BOOLEAN NOT NULL DEFAULT false,
    "fecha_inicio" DATE NOT NULL,
    "fecha_fin" DATE,

    CONSTRAINT "ocupacion_unidad_pkey" PRIMARY KEY ("id_ocupacion")
);

-- CreateTable
CREATE TABLE "sesion" (
    "id_sesion" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "hash_token_refresco" VARCHAR(255) NOT NULL,
    "dispositivo" VARCHAR(120),
    "plataforma" VARCHAR(10) NOT NULL,
    "direccion_ip" VARCHAR(45),
    "fecha_inicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_expiracion" TIMESTAMP(3) NOT NULL,
    "fecha_cierre" TIMESTAMP(3),
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "sesion_pkey" PRIMARY KEY ("id_sesion")
);

-- CreateTable
CREATE TABLE "dispositivo_notificacion" (
    "id_dispositivo" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "token_push" VARCHAR(255) NOT NULL,
    "plataforma" VARCHAR(10) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fecha_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispositivo_notificacion_pkey" PRIMARY KEY ("id_dispositivo")
);

-- CreateTable
CREATE TABLE "auditoria_log" (
    "id_log" SERIAL NOT NULL,
    "id_usuario" INTEGER,
    "accion" VARCHAR(50) NOT NULL,
    "entidad" VARCHAR(50) NOT NULL,
    "id_entidad" INTEGER,
    "detalle" TEXT,
    "direccion_ip" VARCHAR(45),
    "fecha_evento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_log_pkey" PRIMARY KEY ("id_log")
);

-- CreateTable
CREATE TABLE "cuota_administracion" (
    "id_cuota" SERIAL NOT NULL,
    "id_unidad" INTEGER NOT NULL,
    "periodo" CHAR(7) NOT NULL,
    "concepto" VARCHAR(20) NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "saldo" DECIMAL(12,2) NOT NULL,
    "fecha_vencimiento" DATE NOT NULL,
    "estado" VARCHAR(15) NOT NULL DEFAULT 'PENDIENTE',
    "fecha_generacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cuota_administracion_pkey" PRIMARY KEY ("id_cuota")
);

-- CreateTable
CREATE TABLE "pago" (
    "id_pago" SERIAL NOT NULL,
    "id_unidad" INTEGER NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "id_registrado_por" INTEGER,
    "valor_total" DECIMAL(12,2) NOT NULL,
    "metodo_pago" VARCHAR(20) NOT NULL,
    "referencia_pasarela" VARCHAR(80),
    "estado" VARCHAR(15) NOT NULL DEFAULT 'PENDIENTE',
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_confirmacion" TIMESTAMP(3),

    CONSTRAINT "pago_pkey" PRIMARY KEY ("id_pago")
);

-- CreateTable
CREATE TABLE "detalle_pago" (
    "id_detalle_pago" SERIAL NOT NULL,
    "id_pago" INTEGER NOT NULL,
    "id_cuota" INTEGER NOT NULL,
    "valor_aplicado" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "detalle_pago_pkey" PRIMARY KEY ("id_detalle_pago")
);

-- CreateTable
CREATE TABLE "comprobante_pago" (
    "id_comprobante" SERIAL NOT NULL,
    "id_pago" INTEGER NOT NULL,
    "numero_comprobante" VARCHAR(20) NOT NULL,
    "url_archivo" VARCHAR(300) NOT NULL,
    "fecha_emision" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comprobante_pago_pkey" PRIMARY KEY ("id_comprobante")
);

-- CreateTable
CREATE TABLE "reporte" (
    "id_reporte" SERIAL NOT NULL,
    "id_conjunto" INTEGER NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "tipo" VARCHAR(30) NOT NULL,
    "fecha_inicio" DATE NOT NULL,
    "fecha_fin" DATE NOT NULL,
    "formato" VARCHAR(5) NOT NULL,
    "url_archivo" VARCHAR(300),
    "fecha_generacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reporte_pkey" PRIMARY KEY ("id_reporte")
);

-- CreateTable
CREATE TABLE "zona_comun" (
    "id_zona" SERIAL NOT NULL,
    "id_conjunto" INTEGER NOT NULL,
    "nombre" VARCHAR(60) NOT NULL,
    "descripcion" VARCHAR(300),
    "aforo_maximo" SMALLINT NOT NULL,
    "costo_reserva" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "hora_apertura" TIME(0) NOT NULL,
    "hora_cierre" TIME(0) NOT NULL,
    "duracion_max_horas" SMALLINT NOT NULL,
    "anticipacion_max_dias" SMALLINT NOT NULL,
    "reglamento" TEXT,
    "estado" VARCHAR(15) NOT NULL DEFAULT 'ACTIVA',

    CONSTRAINT "zona_comun_pkey" PRIMARY KEY ("id_zona")
);

-- CreateTable
CREATE TABLE "bloqueo_zona" (
    "id_bloqueo" SERIAL NOT NULL,
    "id_zona" INTEGER NOT NULL,
    "id_creado_por" INTEGER NOT NULL,
    "fecha_inicio" TIMESTAMP(3) NOT NULL,
    "fecha_fin" TIMESTAMP(3) NOT NULL,
    "motivo" VARCHAR(200) NOT NULL,

    CONSTRAINT "bloqueo_zona_pkey" PRIMARY KEY ("id_bloqueo")
);

-- CreateTable
CREATE TABLE "reserva" (
    "id_reserva" SERIAL NOT NULL,
    "id_zona" INTEGER NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "id_unidad" INTEGER NOT NULL,
    "fecha_reserva" DATE NOT NULL,
    "hora_inicio" TIME(0) NOT NULL,
    "hora_fin" TIME(0) NOT NULL,
    "numero_asistentes" SMALLINT NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "estado" VARCHAR(15) NOT NULL DEFAULT 'CONFIRMADA',
    "observaciones" VARCHAR(300),
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_cancelacion" TIMESTAMP(3),

    CONSTRAINT "reserva_pkey" PRIMARY KEY ("id_reserva")
);

-- CreateTable
CREATE TABLE "pqrs" (
    "id_pqrs" SERIAL NOT NULL,
    "numero_radicado" VARCHAR(20) NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "id_unidad" INTEGER,
    "id_responsable" INTEGER,
    "tipo" VARCHAR(12) NOT NULL,
    "categoria" VARCHAR(30) NOT NULL,
    "asunto" VARCHAR(150) NOT NULL,
    "descripcion" TEXT NOT NULL,
    "prioridad" VARCHAR(10) NOT NULL DEFAULT 'MEDIA',
    "estado" VARCHAR(15) NOT NULL DEFAULT 'RADICADA',
    "respuesta" TEXT,
    "calificacion" SMALLINT,
    "fecha_radicacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_limite" DATE NOT NULL,
    "fecha_cierre" TIMESTAMP(3),

    CONSTRAINT "pqrs_pkey" PRIMARY KEY ("id_pqrs")
);

-- CreateTable
CREATE TABLE "pqrs_seguimiento" (
    "id_seguimiento" SERIAL NOT NULL,
    "id_pqrs" INTEGER NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "estado_anterior" VARCHAR(15),
    "estado_nuevo" VARCHAR(15) NOT NULL,
    "comentario" TEXT,
    "fecha_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pqrs_seguimiento_pkey" PRIMARY KEY ("id_seguimiento")
);

-- CreateTable
CREATE TABLE "pqrs_adjunto" (
    "id_adjunto" SERIAL NOT NULL,
    "id_pqrs" INTEGER NOT NULL,
    "nombre_archivo" VARCHAR(150) NOT NULL,
    "tipo_mime" VARCHAR(60) NOT NULL,
    "tamano_kb" INTEGER NOT NULL,
    "url_archivo" VARCHAR(300) NOT NULL,
    "fecha_carga" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pqrs_adjunto_pkey" PRIMARY KEY ("id_adjunto")
);

-- CreateTable
CREATE TABLE "noticia" (
    "id_noticia" SERIAL NOT NULL,
    "id_conjunto" INTEGER NOT NULL,
    "id_autor" INTEGER NOT NULL,
    "id_torre_destino" INTEGER,
    "titulo" VARCHAR(150) NOT NULL,
    "contenido" TEXT NOT NULL,
    "tipo" VARCHAR(15) NOT NULL,
    "publico_objetivo" VARCHAR(20) NOT NULL,
    "estado" VARCHAR(12) NOT NULL DEFAULT 'BORRADOR',
    "fecha_publicacion" TIMESTAMP(3),
    "fecha_expiracion" TIMESTAMP(3),
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "noticia_pkey" PRIMARY KEY ("id_noticia")
);

-- CreateTable
CREATE TABLE "notificacion" (
    "id_notificacion" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "id_noticia" INTEGER,
    "tipo" VARCHAR(20) NOT NULL,
    "id_referencia" INTEGER,
    "titulo" VARCHAR(120) NOT NULL,
    "mensaje" VARCHAR(300) NOT NULL,
    "canal" VARCHAR(10) NOT NULL DEFAULT 'PUSH',
    "estado" VARCHAR(10) NOT NULL DEFAULT 'PENDIENTE',
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_envio" TIMESTAMP(3),
    "fecha_lectura" TIMESTAMP(3),

    CONSTRAINT "notificacion_pkey" PRIMARY KEY ("id_notificacion")
);

-- CreateTable
CREATE TABLE "visitante" (
    "id_visitante" SERIAL NOT NULL,
    "tipo_documento" CHAR(2) NOT NULL,
    "numero_documento" VARCHAR(20) NOT NULL,
    "nombres" VARCHAR(80) NOT NULL,
    "apellidos" VARCHAR(80) NOT NULL,
    "telefono" VARCHAR(20),
    "placa_vehiculo" VARCHAR(10),
    "fecha_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visitante_pkey" PRIMARY KEY ("id_visitante")
);

-- CreateTable
CREATE TABLE "visita" (
    "id_visita" SERIAL NOT NULL,
    "id_visitante" INTEGER NOT NULL,
    "id_unidad" INTEGER NOT NULL,
    "id_anfitrion" INTEGER NOT NULL,
    "id_vigilante" INTEGER,
    "fecha_programada" DATE NOT NULL,
    "hora_desde" TIME(0) NOT NULL,
    "hora_hasta" TIME(0) NOT NULL,
    "motivo" VARCHAR(150),
    "codigo_qr" VARCHAR(120) NOT NULL,
    "qr_expira" TIMESTAMP(3) NOT NULL,
    "ingresa_vehiculo" BOOLEAN NOT NULL DEFAULT false,
    "estado" VARCHAR(15) NOT NULL DEFAULT 'PREREGISTRADA',
    "fecha_hora_ingreso" TIMESTAMP(3),
    "fecha_hora_salida" TIMESTAMP(3),
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visita_pkey" PRIMARY KEY ("id_visita")
);

-- CreateTable
CREATE TABLE "parqueadero" (
    "id_parqueadero" SERIAL NOT NULL,
    "id_conjunto" INTEGER NOT NULL,
    "id_unidad_propietaria" INTEGER,
    "codigo" VARCHAR(10) NOT NULL,
    "tipo" VARCHAR(12) NOT NULL,
    "ubicacion" VARCHAR(60),
    "estado" VARCHAR(15) NOT NULL DEFAULT 'DISPONIBLE',

    CONSTRAINT "parqueadero_pkey" PRIMARY KEY ("id_parqueadero")
);

-- CreateTable
CREATE TABLE "asignacion_parqueadero" (
    "id_asignacion" SERIAL NOT NULL,
    "id_parqueadero" INTEGER NOT NULL,
    "id_unidad" INTEGER,
    "id_visita" INTEGER,
    "id_asignado_por" INTEGER NOT NULL,
    "placa" VARCHAR(10) NOT NULL,
    "tipo_vehiculo" VARCHAR(10) NOT NULL,
    "fecha_inicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_fin" TIMESTAMP(3),
    "estado" VARCHAR(10) NOT NULL DEFAULT 'ACTIVA',

    CONSTRAINT "asignacion_parqueadero_pkey" PRIMARY KEY ("id_asignacion")
);

-- CreateIndex
CREATE UNIQUE INDEX "conjunto_nit_key" ON "conjunto"("nit");

-- CreateIndex
CREATE UNIQUE INDEX "torre_id_conjunto_nombre_key" ON "torre"("id_conjunto", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "unidad_residencial_id_conjunto_id_torre_numero_key" ON "unidad_residencial"("id_conjunto", "id_torre", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_correo_key" ON "usuario"("correo");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_codigo_invitacion_key" ON "usuario"("codigo_invitacion");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_tipo_documento_numero_documento_key" ON "usuario"("tipo_documento", "numero_documento");

-- CreateIndex
CREATE UNIQUE INDEX "rol_nombre_key" ON "rol"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_rol_id_usuario_id_rol_id_conjunto_key" ON "usuario_rol"("id_usuario", "id_rol", "id_conjunto");

-- CreateIndex
CREATE INDEX "sesion_hash_token_refresco_idx" ON "sesion"("hash_token_refresco");

-- CreateIndex
CREATE UNIQUE INDEX "dispositivo_notificacion_token_push_key" ON "dispositivo_notificacion"("token_push");

-- CreateIndex
CREATE INDEX "auditoria_log_fecha_evento_idx" ON "auditoria_log"("fecha_evento");

-- CreateIndex
CREATE UNIQUE INDEX "cuota_administracion_id_unidad_periodo_concepto_key" ON "cuota_administracion"("id_unidad", "periodo", "concepto");

-- CreateIndex
CREATE UNIQUE INDEX "pago_referencia_pasarela_key" ON "pago"("referencia_pasarela");

-- CreateIndex
CREATE UNIQUE INDEX "comprobante_pago_id_pago_key" ON "comprobante_pago"("id_pago");

-- CreateIndex
CREATE UNIQUE INDEX "comprobante_pago_numero_comprobante_key" ON "comprobante_pago"("numero_comprobante");

-- CreateIndex
CREATE INDEX "reserva_id_zona_fecha_reserva_idx" ON "reserva"("id_zona", "fecha_reserva");

-- CreateIndex
CREATE UNIQUE INDEX "pqrs_numero_radicado_key" ON "pqrs"("numero_radicado");

-- CreateIndex
CREATE INDEX "notificacion_id_usuario_estado_idx" ON "notificacion"("id_usuario", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "visitante_tipo_documento_numero_documento_key" ON "visitante"("tipo_documento", "numero_documento");

-- CreateIndex
CREATE UNIQUE INDEX "visita_codigo_qr_key" ON "visita"("codigo_qr");

-- CreateIndex
CREATE UNIQUE INDEX "parqueadero_id_conjunto_codigo_key" ON "parqueadero"("id_conjunto", "codigo");

-- AddForeignKey
ALTER TABLE "torre" ADD CONSTRAINT "torre_id_conjunto_fkey" FOREIGN KEY ("id_conjunto") REFERENCES "conjunto"("id_conjunto") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unidad_residencial" ADD CONSTRAINT "unidad_residencial_id_conjunto_fkey" FOREIGN KEY ("id_conjunto") REFERENCES "conjunto"("id_conjunto") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unidad_residencial" ADD CONSTRAINT "unidad_residencial_id_torre_fkey" FOREIGN KEY ("id_torre") REFERENCES "torre"("id_torre") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_rol" ADD CONSTRAINT "usuario_rol_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_rol" ADD CONSTRAINT "usuario_rol_id_rol_fkey" FOREIGN KEY ("id_rol") REFERENCES "rol"("id_rol") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_rol" ADD CONSTRAINT "usuario_rol_id_conjunto_fkey" FOREIGN KEY ("id_conjunto") REFERENCES "conjunto"("id_conjunto") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ocupacion_unidad" ADD CONSTRAINT "ocupacion_unidad_id_unidad_fkey" FOREIGN KEY ("id_unidad") REFERENCES "unidad_residencial"("id_unidad") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ocupacion_unidad" ADD CONSTRAINT "ocupacion_unidad_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesion" ADD CONSTRAINT "sesion_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispositivo_notificacion" ADD CONSTRAINT "dispositivo_notificacion_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria_log" ADD CONSTRAINT "auditoria_log_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cuota_administracion" ADD CONSTRAINT "cuota_administracion_id_unidad_fkey" FOREIGN KEY ("id_unidad") REFERENCES "unidad_residencial"("id_unidad") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pago" ADD CONSTRAINT "pago_id_unidad_fkey" FOREIGN KEY ("id_unidad") REFERENCES "unidad_residencial"("id_unidad") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pago" ADD CONSTRAINT "pago_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pago" ADD CONSTRAINT "pago_id_registrado_por_fkey" FOREIGN KEY ("id_registrado_por") REFERENCES "usuario"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalle_pago" ADD CONSTRAINT "detalle_pago_id_pago_fkey" FOREIGN KEY ("id_pago") REFERENCES "pago"("id_pago") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalle_pago" ADD CONSTRAINT "detalle_pago_id_cuota_fkey" FOREIGN KEY ("id_cuota") REFERENCES "cuota_administracion"("id_cuota") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comprobante_pago" ADD CONSTRAINT "comprobante_pago_id_pago_fkey" FOREIGN KEY ("id_pago") REFERENCES "pago"("id_pago") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporte" ADD CONSTRAINT "reporte_id_conjunto_fkey" FOREIGN KEY ("id_conjunto") REFERENCES "conjunto"("id_conjunto") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporte" ADD CONSTRAINT "reporte_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zona_comun" ADD CONSTRAINT "zona_comun_id_conjunto_fkey" FOREIGN KEY ("id_conjunto") REFERENCES "conjunto"("id_conjunto") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bloqueo_zona" ADD CONSTRAINT "bloqueo_zona_id_zona_fkey" FOREIGN KEY ("id_zona") REFERENCES "zona_comun"("id_zona") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bloqueo_zona" ADD CONSTRAINT "bloqueo_zona_id_creado_por_fkey" FOREIGN KEY ("id_creado_por") REFERENCES "usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reserva" ADD CONSTRAINT "reserva_id_zona_fkey" FOREIGN KEY ("id_zona") REFERENCES "zona_comun"("id_zona") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reserva" ADD CONSTRAINT "reserva_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reserva" ADD CONSTRAINT "reserva_id_unidad_fkey" FOREIGN KEY ("id_unidad") REFERENCES "unidad_residencial"("id_unidad") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pqrs" ADD CONSTRAINT "pqrs_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pqrs" ADD CONSTRAINT "pqrs_id_unidad_fkey" FOREIGN KEY ("id_unidad") REFERENCES "unidad_residencial"("id_unidad") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pqrs" ADD CONSTRAINT "pqrs_id_responsable_fkey" FOREIGN KEY ("id_responsable") REFERENCES "usuario"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pqrs_seguimiento" ADD CONSTRAINT "pqrs_seguimiento_id_pqrs_fkey" FOREIGN KEY ("id_pqrs") REFERENCES "pqrs"("id_pqrs") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pqrs_seguimiento" ADD CONSTRAINT "pqrs_seguimiento_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pqrs_adjunto" ADD CONSTRAINT "pqrs_adjunto_id_pqrs_fkey" FOREIGN KEY ("id_pqrs") REFERENCES "pqrs"("id_pqrs") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "noticia" ADD CONSTRAINT "noticia_id_conjunto_fkey" FOREIGN KEY ("id_conjunto") REFERENCES "conjunto"("id_conjunto") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "noticia" ADD CONSTRAINT "noticia_id_autor_fkey" FOREIGN KEY ("id_autor") REFERENCES "usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "noticia" ADD CONSTRAINT "noticia_id_torre_destino_fkey" FOREIGN KEY ("id_torre_destino") REFERENCES "torre"("id_torre") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacion" ADD CONSTRAINT "notificacion_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacion" ADD CONSTRAINT "notificacion_id_noticia_fkey" FOREIGN KEY ("id_noticia") REFERENCES "noticia"("id_noticia") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visita" ADD CONSTRAINT "visita_id_visitante_fkey" FOREIGN KEY ("id_visitante") REFERENCES "visitante"("id_visitante") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visita" ADD CONSTRAINT "visita_id_unidad_fkey" FOREIGN KEY ("id_unidad") REFERENCES "unidad_residencial"("id_unidad") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visita" ADD CONSTRAINT "visita_id_anfitrion_fkey" FOREIGN KEY ("id_anfitrion") REFERENCES "usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visita" ADD CONSTRAINT "visita_id_vigilante_fkey" FOREIGN KEY ("id_vigilante") REFERENCES "usuario"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parqueadero" ADD CONSTRAINT "parqueadero_id_conjunto_fkey" FOREIGN KEY ("id_conjunto") REFERENCES "conjunto"("id_conjunto") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parqueadero" ADD CONSTRAINT "parqueadero_id_unidad_propietaria_fkey" FOREIGN KEY ("id_unidad_propietaria") REFERENCES "unidad_residencial"("id_unidad") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignacion_parqueadero" ADD CONSTRAINT "asignacion_parqueadero_id_parqueadero_fkey" FOREIGN KEY ("id_parqueadero") REFERENCES "parqueadero"("id_parqueadero") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignacion_parqueadero" ADD CONSTRAINT "asignacion_parqueadero_id_unidad_fkey" FOREIGN KEY ("id_unidad") REFERENCES "unidad_residencial"("id_unidad") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignacion_parqueadero" ADD CONSTRAINT "asignacion_parqueadero_id_visita_fkey" FOREIGN KEY ("id_visita") REFERENCES "visita"("id_visita") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignacion_parqueadero" ADD CONSTRAINT "asignacion_parqueadero_id_asignado_por_fkey" FOREIGN KEY ("id_asignado_por") REFERENCES "usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;
