/**
 * Enrutamiento principal del panel con protección por rol.
 * La etiqueta @RF-XX indica el requerimiento funcional que introdujo cada página.
 */
import type { ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import type { Rol } from './api/client';
import { useAuth } from './auth/AuthContext';
import { Layout } from './components/Layout';
import { ProveedorConfirmacion } from './components/ui';
import { MENU, rutaInicial } from './rutas';
import { Login } from './pages/Login';
import { Tablero } from './pages/Tablero'; // @RF-09
import { Finanzas } from './pages/Finanzas'; // @RF-02
import { Reservas } from './pages/Reservas'; // @RF-03
import { PqrsPagina } from './pages/Pqrs'; // @RF-04
import { Usuarios } from './pages/Usuarios'; // @RF-01
import { Unidades } from './pages/Unidades'; // @RF-09
import { Auditoria } from './pages/Auditoria'; // @RF-09
import { ConjuntoPagina } from './pages/Conjunto'; // @RF-09


const PAGINAS: Record<string, ReactNode> = {
  '/tablero': <Tablero />, // @RF-09
  '/finanzas': <Finanzas />, // @RF-02
  '/reservas': <Reservas />, // @RF-03
  '/pqrs': <PqrsPagina />, // @RF-04
  '/usuarios': <Usuarios />, // @RF-01
  '/unidades': <Unidades />, // @RF-09
  '/auditoria': <Auditoria />, // @RF-09
  '/conjunto': <ConjuntoPagina />, // @RF-09
};

/** Exige sesión iniciada; si no, redirige al login conservando la ruta solicitada. */
function RequiereSesion({ children }: { children: ReactNode }) {
  const { usuario } = useAuth();
  const ubicacion = useLocation();
  if (!usuario) return <Navigate to="/login" replace state={{ desde: ubicacion.pathname }} />;
  return <>{children}</>;
}

/** Exige alguno de los roles; si no, redirige a la página inicial del usuario. */
function RequiereRol({ roles, children }: { roles: Rol[]; children: ReactNode }) {
  const { usuario, tieneRol } = useAuth();
  if (!tieneRol(...roles)) return <Navigate to={rutaInicial(usuario?.roles ?? [])} replace />;
  return <>{children}</>;
}

export default function App() {
  const { usuario } = useAuth();
  return (
    <>
      <Routes>
        <Route path="/login" element={usuario ? <Navigate to={rutaInicial(usuario.roles)} replace /> : <Login />} />
        <Route
          element={
            <RequiereSesion>
              <Layout />
            </RequiereSesion>
          }
        >
          {MENU.map((m) => (
            <Route key={m.ruta} path={m.ruta} element={<RequiereRol roles={m.roles}>{PAGINAS[m.ruta]}</RequiereRol>} />
          ))}
        </Route>
        <Route path="*" element={<Navigate to={usuario ? rutaInicial(usuario.roles) : '/login'} replace />} />
      </Routes>
      <ProveedorConfirmacion />
    </>
  );
}
