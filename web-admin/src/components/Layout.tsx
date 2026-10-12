/** Estructura general: menú lateral según rol, barra superior y contenido. */
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { menuParaRoles } from '../rutas';
import { confirmar } from './ui';
import { Icono, Logo } from './Marca';
import { etiqueta } from '../utils/formato';

export function Layout() {
  const { usuario, salir } = useAuth();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const ubicacion = useLocation();

  // En pantallas pequeñas el menú se cierra al navegar
  useEffect(() => setMenuAbierto(false), [ubicacion.pathname]);

  if (!usuario) return null;
  const items = menuParaRoles(usuario.roles);
  const grupos = [...new Set(items.map((i) => i.grupo))];

  const cerrarSesion = async () => {
    if (await confirmar({ titulo: 'Cerrar sesión', mensaje: '¿Desea cerrar la sesión en este equipo?', textoConfirmar: 'Cerrar sesión' })) {
      await salir();
    }
  };

  return (
    <div className={`app ${menuAbierto ? 'menu-abierto' : ''}`}>
      <aside className="lateral" aria-label="Menú principal">
        <div className="marca">
          <Logo tamano={40} />
          <div>
            <strong>Convive</strong>
            <small>Panel administrativo</small>
          </div>
        </div>
        <nav>
          {grupos.map((g) => (
            <div key={g} className="menu-grupo">
              <span className="menu-grupo-titulo">{g}</span>
              {items
                .filter((i) => i.grupo === g)
                .map((i) => (
                  <NavLink key={i.ruta} to={i.ruta} className={({ isActive }) => `menu-item ${isActive ? 'activo' : ''}`}>
                    <span className="menu-icono">
                      <Icono nombre={i.icono} />
                    </span>
                    {i.titulo}
                  </NavLink>
                ))}
            </div>
          ))}
        </nav>
        <div className="lateral-pie">
          <div className="usuario-actual">
            <span className="avatar" aria-hidden="true">
              {iniciales(usuario.nombre)}
            </span>
            <div>
              <strong>{usuario.nombre}</strong>
              <small>{usuario.roles.map(etiqueta).join(', ')}</small>
            </div>
          </div>
          <button className="btn btn-sec btn-bloque" onClick={cerrarSesion}>
            <Icono nombre="salir" tamano={16} />
            Cerrar sesión
          </button>
        </div>
      </aside>
      <div className="lateral-fondo" onClick={() => setMenuAbierto(false)} />
      <div className="principal">
        <header className="barra-superior">
          <button
            className="btn-icono boton-menu"
            onClick={() => setMenuAbierto((v) => !v)}
            aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menuAbierto}
          >
            <Icono nombre={menuAbierto ? 'cerrar' : 'menu'} tamano={22} />
          </button>
          <span className="barra-titulo">Convive</span>
          <span className="avatar" aria-hidden="true">
            {iniciales(usuario.nombre)}
          </span>
        </header>
        <main className="contenido">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

/** Iniciales del nombre (máximo dos letras), como el avatar de la app móvil. */
function iniciales(nombre: string): string {
  const partes = nombre.replace(/\(.*?\)/g, '').trim().split(/\s+/).filter(Boolean);
  return ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase();
}
