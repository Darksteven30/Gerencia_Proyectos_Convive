/**
 * Cliente HTTP del panel administrativo.
 * - Agrega el encabezado Authorization con el token de acceso.
 * - Ante un 401 intenta una sola vez renovar la sesión con POST /api/auth/refresh y repite la petición.
 * - Si la renovación falla, cierra la sesión local y avisa a la aplicación.
 */

export const API_URL: string = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/+$/, '');

const CLAVE_ACCESS = 'convive.accessToken';
const CLAVE_REFRESH = 'convive.refreshToken';
const CLAVE_USUARIO = 'convive.usuario';

export type Rol = 'ADMINISTRADOR' | 'JUNTA' | 'PROPIETARIO' | 'RESIDENTE' | 'PORTERIA';

export interface UsuarioSesion {
  id: number;
  correo: string;
  nombre: string;
  roles: Rol[];
  idConjunto: number;
}

export interface RespuestaSesion {
  accessToken: string;
  refreshToken: string;
  usuario: UsuarioSesion;
}

/** Error devuelto por la API con su código HTTP, mensaje y código de negocio. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public detalles?: { campo: string; mensaje: string }[],
  ) {
    super(message);
  }
}

// --- Almacenamiento de la sesión (localStorage, protegido con try/catch) ---

function leer(clave: string): string | null {
  try {
    return localStorage.getItem(clave);
  } catch {
    return null;
  }
}

function escribir(clave: string, valor: string | null) {
  try {
    if (valor === null) localStorage.removeItem(clave);
    else localStorage.setItem(clave, valor);
  } catch {
    /* almacenamiento no disponible */
  }
}

export const sesion = {
  accessToken: () => leer(CLAVE_ACCESS),
  refreshToken: () => leer(CLAVE_REFRESH),
  usuario(): UsuarioSesion | null {
    const crudo = leer(CLAVE_USUARIO);
    if (!crudo) return null;
    try {
      return JSON.parse(crudo) as UsuarioSesion;
    } catch {
      return null;
    }
  },
  guardar(r: RespuestaSesion) {
    escribir(CLAVE_ACCESS, r.accessToken);
    escribir(CLAVE_REFRESH, r.refreshToken);
    escribir(CLAVE_USUARIO, JSON.stringify(r.usuario));
  },
  limpiar() {
    escribir(CLAVE_ACCESS, null);
    escribir(CLAVE_REFRESH, null);
    escribir(CLAVE_USUARIO, null);
  },
};

// Oyentes que se ejecutan cuando la sesión expira de forma definitiva
type Oyente = () => void;
const oyentesExpiracion = new Set<Oyente>();
export function alExpirarSesion(fn: Oyente) {
  oyentesExpiracion.add(fn);
  return () => {
    oyentesExpiracion.delete(fn);
  };
}

function avisarExpiracion() {
  sesion.limpiar();
  oyentesExpiracion.forEach((fn) => fn());
}

// Se comparte una única promesa de renovación entre peticiones concurrentes
let renovacionEnCurso: Promise<boolean> | null = null;

async function renovarSesion(): Promise<boolean> {
  const refreshToken = sesion.refreshToken();
  if (!refreshToken) return false;
  if (!renovacionEnCurso) {
    renovacionEnCurso = (async () => {
      try {
        const res = await fetch(`${API_URL}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) return false;
        sesion.guardar((await res.json()) as RespuestaSesion);
        return true;
      } catch {
        return false;
      } finally {
        setTimeout(() => {
          renovacionEnCurso = null;
        }, 0);
      }
    })();
  }
  return renovacionEnCurso;
}

async function errorDesdeRespuesta(res: Response): Promise<ApiError> {
  let cuerpo: { error?: string; code?: string; detalles?: { campo: string; mensaje: string }[] } = {};
  try {
    cuerpo = await res.json();
  } catch {
    /* la respuesta no es JSON */
  }
  let mensaje = cuerpo.error || `Error ${res.status} al comunicarse con el servidor`;
  if (cuerpo.detalles?.length) {
    mensaje += ': ' + cuerpo.detalles.map((d) => (d.campo ? `${d.campo} (${d.mensaje})` : d.mensaje)).join('; ');
  }
  return new ApiError(res.status, mensaje, cuerpo.code, cuerpo.detalles);
}

interface OpcionesPeticion {
  method?: string;
  body?: unknown;
  /** Si es true no se envía el token ni se intenta renovar la sesión. */
  publica?: boolean;
}

/** Ejecuta la petición con el token vigente y reintenta una vez tras renovar la sesión. */
async function fetchAutenticado(ruta: string, opciones: OpcionesPeticion = {}): Promise<Response> {
  const hacer = () => {
    const headers: Record<string, string> = {};
    let body: BodyInit | undefined;
    if (opciones.body instanceof FormData) body = opciones.body;
    else if (opciones.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(opciones.body);
    }
    const token = sesion.accessToken();
    if (token && !opciones.publica) headers.Authorization = `Bearer ${token}`;
    return fetch(`${API_URL}${ruta}`, { method: opciones.method ?? 'GET', headers, body });
  };

  let res: Response;
  try {
    res = await hacer();
  } catch {
    throw new ApiError(0, 'No fue posible conectarse con el servidor. Verifique su conexión o la URL de la API.');
  }
  if (res.status === 401 && !opciones.publica) {
    const renovada = await renovarSesion();
    if (!renovada) {
      avisarExpiracion();
      throw new ApiError(401, 'Su sesión expiró. Inicie sesión nuevamente.', 'NO_AUTENTICADO');
    }
    res = await hacer();
    if (res.status === 401) {
      avisarExpiracion();
      throw new ApiError(401, 'Su sesión expiró. Inicie sesión nuevamente.', 'NO_AUTENTICADO');
    }
  }
  return res;
}

/** Petición que devuelve JSON. */
export async function api<T>(ruta: string, opciones: OpcionesPeticion = {}): Promise<T> {
  const res = await fetchAutenticado(ruta, opciones);
  if (!res.ok) throw await errorDesdeRespuesta(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Atajos por método HTTP. */
export const http = {
  get: <T>(ruta: string) => api<T>(ruta),
  post: <T>(ruta: string, body?: unknown) => api<T>(ruta, { method: 'POST', body: body ?? {} }),
  put: <T>(ruta: string, body?: unknown) => api<T>(ruta, { method: 'PUT', body: body ?? {} }),
  del: <T>(ruta: string) => api<T>(ruta, { method: 'DELETE' }),
};

/** Obtiene el nombre de archivo del encabezado Content-Disposition, si existe. */
function nombreDesdeEncabezado(res: Response): string | null {
  const cd = res.headers.get('Content-Disposition');
  if (!cd) return null;
  const utf = /filename\*=UTF-8''([^;]+)/i.exec(cd);
  if (utf) return decodeURIComponent(utf[1]);
  const simple = /filename="?([^";]+)"?/i.exec(cd);
  return simple ? simple[1] : null;
}

/**
 * Descarga un archivo protegido (PDF, XLSX, adjuntos) con fetch + Authorization,
 * lo convierte en blob y dispara la descarga en el navegador.
 */
export async function descargarArchivo(ruta: string, nombrePorDefecto: string): Promise<void> {
  const res = await fetchAutenticado(ruta);
  if (!res.ok) throw await errorDesdeRespuesta(res);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombreDesdeEncabezado(res) ?? nombrePorDefecto;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

// --- Autenticación ---

export async function iniciarSesion(correo: string, contrasena: string): Promise<RespuestaSesion> {
  const r = await api<RespuestaSesion>('/api/auth/login', {
    method: 'POST',
    body: { correo, contrasena, plataforma: 'WEB', dispositivo: 'Panel administrativo web' },
    publica: true,
  });
  return r;
}

export async function cerrarSesionRemota(): Promise<void> {
  const refreshToken = sesion.refreshToken();
  try {
    if (refreshToken) {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
    }
  } catch {
    /* si el servidor no responde igual se cierra la sesión local */
  }
  sesion.limpiar();
}
