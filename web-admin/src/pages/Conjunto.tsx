/** Datos del conjunto residencial (CU-08): consulta y edición. */
import { useEffect, useState, type FormEvent } from 'react';
import { http } from '../api/client';
import type { Conjunto } from '../api/tipos';
import { Alerta, BotonCarga, Campo, Cargando, EncabezadoPagina, ErrorVista } from '../components/ui';
import { useAccion, useCarga } from '../hooks/useCarga';

export function ConjuntoPagina() {
  const { datos, cargando, error, recargar, setDatos } = useCarga(() => http.get<Conjunto>('/api/admin/conjunto'));
  const [f, setF] = useState({ nombre: '', direccion: '', ciudad: '', departamento: '', telefono: '', correo_contacto: '', numero_unidades: '' });
  const [mensaje, setMensaje] = useState<string | null>(null);
  const accion = useAccion();

  useEffect(() => {
    if (datos) {
      setF({
        nombre: datos.nombre,
        direccion: datos.direccion ?? '',
        ciudad: datos.ciudad ?? '',
        departamento: datos.departamento ?? '',
        telefono: datos.telefono ?? '',
        correo_contacto: datos.correo_contacto ?? '',
        numero_unidades: String(datos.numero_unidades ?? ''),
      });
    }
  }, [datos]);

  const cambiar = (campo: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [campo]: e.target.value });

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    setMensaje(null);
    const r = await accion.ejecutar(() =>
      http.put<Conjunto>('/api/admin/conjunto', {
        nombre: f.nombre.trim(),
        direccion: f.direccion.trim(),
        ciudad: f.ciudad.trim(),
        departamento: f.departamento.trim(),
        telefono: f.telefono.trim() || null,
        correo_contacto: f.correo_contacto.trim() || null,
        numero_unidades: Number(f.numero_unidades),
      }),
    );
    if (r) {
      setDatos(r);
      setMensaje('Datos del conjunto actualizados.');
    }
  };

  return (
    <>
      <EncabezadoPagina titulo="Conjunto" descripcion="Información general de la copropiedad" />
      {cargando && !datos && <Cargando />}
      {error && <ErrorVista mensaje={error} reintentar={recargar} />}
      {datos && !error && (
        <form className="tarjeta" onSubmit={guardar}>
          {mensaje && (
            <Alerta tipo="exito" onCerrar={() => setMensaje(null)}>
              {mensaje}
            </Alerta>
          )}
          {accion.error && <Alerta tipo="error">{accion.error}</Alerta>}
          <div className="formulario">
            <Campo etiqueta="Nombre" ancho="completo">
              <input required minLength={3} maxLength={120} value={f.nombre} onChange={cambiar('nombre')} />
            </Campo>
            <Campo etiqueta="NIT" ayuda="El NIT no se puede modificar desde el panel.">
              <input value={datos.nit} disabled />
            </Campo>
            <Campo etiqueta="Número de unidades" ayuda="Entre 20 y 500">
              <input type="number" min={20} max={500} required value={f.numero_unidades} onChange={cambiar('numero_unidades')} />
            </Campo>
            <Campo etiqueta="Dirección" ancho="completo">
              <input required maxLength={200} value={f.direccion} onChange={cambiar('direccion')} />
            </Campo>
            <Campo etiqueta="Ciudad">
              <input required maxLength={80} value={f.ciudad} onChange={cambiar('ciudad')} />
            </Campo>
            <Campo etiqueta="Departamento">
              <input required maxLength={80} value={f.departamento} onChange={cambiar('departamento')} />
            </Campo>
            <Campo etiqueta="Teléfono">
              <input maxLength={20} value={f.telefono} onChange={cambiar('telefono')} />
            </Campo>
            <Campo etiqueta="Correo de contacto">
              <input type="email" value={f.correo_contacto} onChange={cambiar('correo_contacto')} />
            </Campo>
          </div>
          <div className="form-acciones">
            <BotonCarga type="submit" cargando={accion.enviando}>
              Guardar cambios
            </BotonCarga>
          </div>
        </form>
      )}
    </>
  );
}
