/** Estructura general: menú lateral según rol, barra superior y contenido. */
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { menuParaRoles } from '../rutas';
import { confirmar } from './ui';
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
          <span className="marca-logo" aria-hidden="true">
            ⌂
          </span>
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
                    <span className="menu-icono" aria-hidden="true">
                      {i.icono}
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
              {usuario.nombre.charAt(0)}
            </span>
            <div>
              <strong>{usuario.nombre}</strong>
              <small>{usuario.roles.map(etiqueta).join(', ')}</small>
            </div>
          </div>
          <button className="btn btn-sec btn-bloque" onClick={cerrarSesion}>
            Cerrar sesión
          </button>
        </div>
      </aside>
      <div className="lateral-fondo" onClick={() => setMenuAbierto(false)} />
      <div className="principal">
        <header className="barra-superior">
          <button className="btn-icono boton-menu" onClick={() => setMenuAbierto((v) => !v)} aria-label="Abrir menú">
            ☰
          </button>
          <span className="barra-titulo">Convive</span>
        </header>
        <main className="contenido">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
