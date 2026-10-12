/** Inicio de sesión del panel (CU-01). Maneja credenciales inválidas, cuenta bloqueada (423) e inactiva. */
import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { ROLES_PANEL, useAuth } from '../auth/AuthContext';
import { Logo } from '../components/Marca';
import { Alerta, BotonCarga, Campo } from '../components/ui';
import { menuParaRoles, rutaInicial } from '../rutas';

export function Login() {
  const { entrar, aviso, limpiarAviso } = useAuth();
  const navegar = useNavigate();
  const ubicacion = useLocation();
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<{ tipo: 'error' | 'aviso' | 'info'; texto: string } | null>(null);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    limpiarAviso();
    setEnviando(true);
    try {
      const u = await entrar(correo.trim(), contrasena);
      if (menuParaRoles(u.roles).length === 0) {
        setError({
          tipo: 'info',
          texto: u.roles.some((r) => ROLES_PANEL.includes(r))
            ? 'Su rol todavía no tiene secciones disponibles en el panel.'
            : 'Su cuenta es de habitante (propietario o residente). Para pagar, reservar, radicar PQRS o registrar visitas use la aplicación móvil de Convive.',
        });
        return;
      }
      const desde = (ubicacion.state as { desde?: string } | null)?.desde;
      navegar(desde && desde !== '/login' ? desde : rutaInicial(u.roles), { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 423) {
        setError({ tipo: 'aviso', texto: `Cuenta bloqueada temporalmente. ${err.message}` });
      } else if (err instanceof ApiError && err.code === 'CUENTA_INACTIVA') {
        setError({ tipo: 'error', texto: err.message });
      } else {
        setError({ tipo: 'error', texto: err instanceof Error ? err.message : 'No fue posible iniciar sesión' });
      }
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="login">
      <div className="login-caja">
        <div className="login-marca">
          <Logo tamano={88} etiqueta="Logo de Convive" />
          <strong>Convive</strong>
          <span>Panel administrativo del conjunto</span>
        </div>
        <h1 className="login-titulo">Iniciar sesión</h1>
        <p className="login-subtitulo">Use el correo y la contraseña de su cuenta en el conjunto residencial</p>
        {aviso && <Alerta tipo="aviso">{aviso}</Alerta>}
        {error && <Alerta tipo={error.tipo}>{error.texto}</Alerta>}
        <form onSubmit={enviar}>
          <Campo etiqueta="Correo electrónico">
            <input type="email" autoComplete="username" required value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="correo@dominio.com" />
          </Campo>
          <Campo etiqueta="Contraseña">
            <input type="password" autoComplete="current-password" required value={contrasena} onChange={(e) => setContrasena(e.target.value)} placeholder="Su contraseña" />
          </Campo>
          <BotonCarga type="submit" cargando={enviando} className="btn btn-negro btn-grande btn-bloque">
            Ingresar
          </BotonCarga>
        </form>
        <p className="texto-suave login-nota">
          Acceso para administración, junta directiva y portería. Tras cinco intentos fallidos la cuenta se bloquea durante 15 minutos.
        </p>
      </div>
    </div>
  );
}
