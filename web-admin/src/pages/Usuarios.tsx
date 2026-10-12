/** Usuarios y roles (CU-05, CU-07): invitación con código, activación/inactivación y cambio de roles. */
import { useState, type FormEvent } from 'react';
import { http } from '../api/client';
import type { Usuario } from '../api/tipos';
import { useAuth } from '../auth/AuthContext';
import { SelectorUnidad } from '../components/SelectorUnidad';
import { Alerta, Badge, BotonCarga, Campo, confirmar, Contenido, EncabezadoPagina, Modal } from '../components/ui';
import { useAccion, useCarga } from '../hooks/useCarga';
import { etiqueta, formatoFechaHora } from '../utils/formato';

const ROLES = ['ADMINISTRADOR', 'JUNTA', 'PROPIETARIO', 'RESIDENTE', 'PORTERIA'] as const;

export function Usuarios() {
  const { usuario: yo } = useAuth();
  const { datos, cargando, error, recargar } = useCarga(() => http.get<Usuario[]>('/api/admin/usuarios'));
  const [buscar, setBuscar] = useState('');
  const [filtroRol, setFiltroRol] = useState('');
  const [invitando, setInvitando] = useState(false);
  const [invitacion, setInvitacion] = useState<{ correo: string; codigo: string } | null>(null);
  const [editandoRoles, setEditandoRoles] = useState<Usuario | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const accion = useAccion();

  const texto = buscar.trim().toLowerCase();
  const filtrados =
    datos?.filter(
      (u) =>
        (!filtroRol || u.roles.includes(filtroRol)) &&
        (!texto || `${u.nombres} ${u.apellidos} ${u.correo} ${u.numero_documento}`.toLowerCase().includes(texto)),
    ) ?? null;

  const cambiarEstado = async (u: Usuario) => {
    const nuevo = u.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    const ok = await confirmar({
      titulo: nuevo === 'INACTIVO' ? 'Inactivar usuario' : 'Activar usuario',
      mensaje:
        nuevo === 'INACTIVO'
          ? `¿Inactivar a ${u.nombres} ${u.apellidos}? Se cerrarán sus sesiones y no podrá ingresar.`
          : `¿Activar nuevamente a ${u.nombres} ${u.apellidos}?`,
      textoConfirmar: nuevo === 'INACTIVO' ? 'Inactivar' : 'Activar',
      peligro: nuevo === 'INACTIVO',
    });
    if (!ok) return;
    const r = await accion.ejecutar(() => http.put(`/api/admin/usuarios/${u.id_usuario}`, { estado: nuevo }));
    if (r) {
      setMensaje(`Usuario ${nuevo === 'ACTIVO' ? 'activado' : 'inactivado'}.`);
      void recargar();
    }
  };

  return (
    <>
      <EncabezadoPagina
        titulo="Usuarios"
        descripcion="Usuarios del conjunto, roles e invitaciones"
        acciones={
          <button className="btn btn-prim" onClick={() => setInvitando(true)}>
            Invitar usuario
          </button>
        }
      />
      {mensaje && (
        <Alerta tipo="exito" onCerrar={() => setMensaje(null)}>
          {mensaje}
        </Alerta>
      )}
      {accion.error && (
        <Alerta tipo="error" onCerrar={() => accion.setError(null)}>
          {accion.error}
        </Alerta>
      )}
      <div className="filtros">
        <Campo etiqueta="Buscar">
          <input type="search" placeholder="Nombre, correo o documento" value={buscar} onChange={(e) => setBuscar(e.target.value)} />
        </Campo>
        <Campo etiqueta="Rol">
          <select value={filtroRol} onChange={(e) => setFiltroRol(e.target.value)}>
            <option value="">Todos</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {etiqueta(r)}
              </option>
            ))}
          </select>
        </Campo>
      </div>
      <Contenido cargando={cargando} error={error} datos={filtrados} reintentar={recargar} vacio="No hay usuarios que coincidan.">
        {(usuarios) => (
          <div className="tabla-contenedor">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Documento</th>
                  <th>Contacto</th>
                  <th>Roles</th>
                  <th>Unidades</th>
                  <th>Estado</th>
                  <th>Último acceso</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id_usuario}>
                    <td>
                      <strong>
                        {u.nombres} {u.apellidos}
                      </strong>
                    </td>
                    <td className="nowrap">
                      {u.tipo_documento} {u.numero_documento}
                    </td>
                    <td>
                      {u.correo}
                      {u.telefono && <div className="texto-suave">{u.telefono}</div>}
                    </td>
                    <td>{u.roles.map(etiqueta).join(', ') || '—'}</td>
                    <td>{u.unidades.map((x) => `${x.unidad}${x.es_responsable_pago ? ' ($)' : ''}`).join(', ') || '—'}</td>
                    <td>
                      <Badge valor={u.estado} />
                      {u.codigo_invitacion && (
                        <div className="texto-suave nowrap">
                          Código: <span className="mono">{u.codigo_invitacion}</span>
                        </div>
                      )}
                    </td>
                    <td className="nowrap">{formatoFechaHora(u.ultimo_acceso)}</td>
                    <td>
                      <div className="celda-acciones">
                        <button className="btn btn-sec btn-sm" onClick={() => setEditandoRoles(u)}>
                          Roles
                        </button>
                        {u.estado !== 'PENDIENTE' && u.id_usuario !== yo?.id && (
                          <button
                            className={`btn btn-sm ${u.estado === 'ACTIVO' ? 'btn-peligro' : 'btn-exito'}`}
                            disabled={accion.enviando}
                            onClick={() => cambiarEstado(u)}
                          >
                            {u.estado === 'ACTIVO' ? 'Inactivar' : 'Activar'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Contenido>

      <Modal titulo="Invitar usuario" abierto={invitando} onCerrar={() => setInvitando(false)} ancho={720}>
        {invitando && (
          <FormInvitar
            onExito={(correo, codigo) => {
              setInvitando(false);
              setInvitacion({ correo, codigo });
              void recargar();
            }}
          />
        )}
      </Modal>
      <Modal titulo="Invitación creada" abierto={!!invitacion} onCerrar={() => setInvitacion(null)} ancho={480}>
        {invitacion && <CodigoInvitacion {...invitacion} onCerrar={() => setInvitacion(null)} />}
      </Modal>
      <Modal titulo="Cambiar roles" abierto={!!editandoRoles} onCerrar={() => setEditandoRoles(null)} ancho={480}>
        {editandoRoles && (
          <FormRoles
            usuario={editandoRoles}
            onExito={() => {
              setEditandoRoles(null);
              setMensaje('Roles actualizados.');
              void recargar();
            }}
          />
        )}
      </Modal>
    </>
  );
}

function CodigoInvitacion({ correo, codigo, onCerrar }: { correo: string; codigo: string; onCerrar: () => void }) {
  const [copiado, setCopiado] = useState(false);
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  };
  return (
    <>
      <p>
        Comparta este <strong>código de invitación</strong> con <strong>{correo}</strong>. Lo necesitará para activar su cuenta desde la app móvil
        (correo + código + contraseña).
      </p>
      <div className="codigo-destacado" aria-label="Código de invitación">
        {codigo}
      </div>
      <p className="texto-suave">El código también queda visible en el listado mientras el usuario no active su cuenta.</p>
      <div className="form-acciones">
        <button className="btn btn-sec" onClick={copiar}>
          {copiado ? '✓ Copiado' : 'Copiar código'}
        </button>
        <button className="btn btn-prim" onClick={onCerrar}>
          Listo
        </button>
      </div>
    </>
  );
}

function SelectorRoles({ valor, onCambio }: { valor: string[]; onCambio: (r: string[]) => void }) {
  return (
    <div className="casillas">
      {ROLES.map((r) => (
        <label key={r} className="casilla">
          <input
            type="checkbox"
            checked={valor.includes(r)}
            onChange={(e) => onCambio(e.target.checked ? [...valor, r] : valor.filter((x) => x !== r))}
          />
          {etiqueta(r)}
        </label>
      ))}
    </div>
  );
}

function FormInvitar({ onExito }: { onExito: (correo: string, codigo: string) => void }) {
  const [f, setF] = useState({
    tipo_documento: 'CC',
    numero_documento: '',
    nombres: '',
    apellidos: '',
    correo: '',
    telefono: '',
    id_unidad: '',
    tipo_relacion: '',
  });
  const [roles, setRoles] = useState<string[]>(['PROPIETARIO']);
  const [responsable, setResponsable] = useState(true);
  const { enviando, error, setError, ejecutar } = useAccion();
  const cambiar = (campo: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [campo]: e.target.value });
  const requiereUnidad = roles.includes('PROPIETARIO') || roles.includes('RESIDENTE');

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (!roles.length) return setError('Seleccione al menos un rol.');
    if (requiereUnidad && !f.id_unidad) return setError('Los propietarios y residentes deben vincularse a una unidad.');
    const r = await ejecutar(() =>
      http.post<{ correo: string; codigo_invitacion: string }>('/api/admin/usuarios', {
        tipo_documento: f.tipo_documento,
        numero_documento: f.numero_documento.trim(),
        nombres: f.nombres.trim(),
        apellidos: f.apellidos.trim(),
        correo: f.correo.trim(),
        telefono: f.telefono.trim() || undefined,
        roles,
        id_unidad: f.id_unidad ? Number(f.id_unidad) : undefined,
        tipo_relacion: f.id_unidad && f.tipo_relacion ? f.tipo_relacion : undefined,
        es_responsable_pago: f.id_unidad ? responsable : undefined,
      }),
    );
    if (r) onExito(r.correo, r.codigo_invitacion);
  };

  return (
    <form onSubmit={enviar}>
      {error && <Alerta tipo="error">{error}</Alerta>}
      <div className="formulario">
        <Campo etiqueta="Tipo de documento">
          <select value={f.tipo_documento} onChange={cambiar('tipo_documento')}>
            <option value="CC">Cédula de ciudadanía</option>
            <option value="CE">Cédula de extranjería</option>
            <option value="PA">Pasaporte</option>
            <option value="TI">Tarjeta de identidad</option>
          </select>
        </Campo>
        <Campo etiqueta="Número de documento">
          <input required minLength={4} maxLength={20} value={f.numero_documento} onChange={cambiar('numero_documento')} />
        </Campo>
        <Campo etiqueta="Nombres">
          <input required minLength={2} maxLength={80} value={f.nombres} onChange={cambiar('nombres')} />
        </Campo>
        <Campo etiqueta="Apellidos">
          <input required minLength={2} maxLength={80} value={f.apellidos} onChange={cambiar('apellidos')} />
        </Campo>
        <Campo etiqueta="Correo electrónico">
          <input type="email" required value={f.correo} onChange={cambiar('correo')} />
        </Campo>
        <Campo etiqueta="Teléfono (opcional)">
          <input maxLength={20} value={f.telefono} onChange={cambiar('telefono')} />
        </Campo>
        <Campo etiqueta="Roles" ancho="completo">
          <SelectorRoles valor={roles} onCambio={setRoles} />
        </Campo>
        <Campo etiqueta={requiereUnidad ? 'Unidad (obligatoria)' : 'Unidad (opcional)'}>
          <SelectorUnidad valor={f.id_unidad} onCambio={(v) => setF({ ...f, id_unidad: v })} requerido={requiereUnidad} opcionVacia="Sin unidad" />
        </Campo>
        {f.id_unidad && (
          <>
            <Campo etiqueta="Relación con la unidad">
              <select value={f.tipo_relacion} onChange={cambiar('tipo_relacion')}>
                <option value="">Automática según el rol</option>
                <option value="PROPIETARIO">Propietario</option>
                <option value="ARRENDATARIO">Arrendatario</option>
                <option value="RESIDENTE">Residente</option>
              </select>
            </Campo>
            <label className="casilla">
              <input type="checkbox" checked={responsable} onChange={(e) => setResponsable(e.target.checked)} />
              Responsable de pago
            </label>
          </>
        )}
      </div>
      <div className="form-acciones">
        <BotonCarga type="submit" cargando={enviando}>
          Crear invitación
        </BotonCarga>
      </div>
    </form>
  );
}

function FormRoles({ usuario, onExito }: { usuario: Usuario; onExito: () => void }) {
  const [roles, setRoles] = useState<string[]>(usuario.roles);
  const { enviando, error, setError, ejecutar } = useAccion();
  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (!roles.length) return setError('Seleccione al menos un rol.');
    const r = await ejecutar(() => http.put(`/api/admin/usuarios/${usuario.id_usuario}`, { roles }));
    if (r) onExito();
  };
  return (
    <form onSubmit={enviar}>
      {error && <Alerta tipo="error">{error}</Alerta>}
      <p>
        {usuario.nombres} {usuario.apellidos} · <span className="texto-suave">{usuario.correo}</span>
      </p>
      <SelectorRoles valor={roles} onCambio={setRoles} />
      <div className="form-acciones">
        <BotonCarga type="submit" cargando={enviando}>
          Guardar roles
        </BotonCarga>
      </div>
    </form>
  );
}
