/**
 * Cliente HTTP de la API de Convive.
 *
 * - Agrega el encabezado Authorization con el token de acceso.
 * - Si la API responde 401, renueva el token con POST /api/auth/refresh (una sola vez,
 *   aunque haya varias peticiones en paralelo) y repite la petición original.
 * - Si la renovación falla, borra la sesión y avisa a la app para volver al inicio de sesión.
 *
 * Este módulo no importa nada de React Native, por lo que también se puede usar desde
 * Node (por ejemplo, en scripts/probar-api.ts). El almacenamiento persistente de los
 * tokens se inyecta con `configurarAlmacenamiento`.
 */
import type { RespuestaSesion } from './tipos';

/** URL base de la API. En un teléfono físico debe ser la IP local del computador o la URL de Render. */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000').replace(/\/+$/, '');

/** Error de la API con el mensaje listo para mostrar al usuario. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public detalles?: { campo: string; mensaje: string }[],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Almacenamiento clave-valor para los tokens (SecureStore en nativo, localStorage en web). */
export interface AlmacenamientoTokens {
  obtener(clave: string): Promise<string | null>;
  guardar(clave: string, valor: string): Promise<void>;
  borrar(clave: string): Promise<void>;
}

// Almacenamiento en memoria por defecto (útil en pruebas con Node).
const memoria = new Map<string, string>();
let almacenamiento: AlmacenamientoTokens = {
  obtener: async (c) => memoria.get(c) ?? null,
  guardar: async (c, v) => void memoria.set(c, v),
  borrar: async (c) => void memoria.delete(c),
};

const CLAVE_ACCESO = 'convive.accessToken';
const CLAVE_REFRESCO = 'convive.refreshToken';

let tokenAcceso: string | null = null;
let tokenRefresco: string | null = null;
let renovacionEnCurso: Promise<boolean> | null = null;
let alExpirarSesion: (() => void) | null = null;

export function configurarAlmacenamiento(a: AlmacenamientoTokens) {
  almacenamiento = a;
}

/** Registra la función que se ejecuta cuando la sesión ya no se puede renovar. */
export function alCerrarseSesion(fn: (() => void) | null) {
  alExpirarSesion = fn;
}

/** Carga los tokens guardados. Devuelve true si hay una sesión previa. */
export async function cargarTokens(): Promise<boolean> {
  tokenAcceso = await almacenamiento.obtener(CLAVE_ACCESO);
  tokenRefresco = await almacenamiento.obtener(CLAVE_REFRESCO);
  return !!tokenRefresco;
}

export async function guardarSesion(s: Pick<RespuestaSesion, 'accessToken' | 'refreshToken'>) {
  tokenAcceso = s.accessToken;
  tokenRefresco = s.refreshToken;
  await almacenamiento.guardar(CLAVE_ACCESO, s.accessToken);
  await almacenamiento.guardar(CLAVE_REFRESCO, s.refreshToken);
}

export async function borrarSesion() {
  tokenAcceso = null;
  tokenRefresco = null;
  await almacenamiento.borrar(CLAVE_ACCESO);
  await almacenamiento.borrar(CLAVE_REFRESCO);
}

export function obtenerTokenRefresco() {
  return tokenRefresco;
}

export function obtenerTokenAcceso() {
  return tokenAcceso;
}

/** Convierte una respuesta de error de la API en un ApiError con un mensaje claro. */
async function errorDesdeRespuesta(res: Response): Promise<ApiError> {
  let cuerpo: { error?: string; code?: string; detalles?: { campo: string; mensaje: string }[] } = {};
  try {
    cuerpo = await res.json();
  } catch {
    // La respuesta no es JSON
  }
  let mensaje = cuerpo.error || `Error ${res.status} al comunicarse con el servidor`;
  if (cuerpo.detalles?.length) {
    mensaje += ': ' + cuerpo.detalles.map((d) => (d.campo ? `${d.campo}: ${d.mensaje}` : d.mensaje)).join('; ');
  }
  return new ApiError(res.status, mensaje, cuerpo.code, cuerpo.detalles);
}

/** Renueva el token de acceso. Si ya hay una renovación en curso, espera esa misma. */
export function renovarToken(): Promise<boolean> {
  if (!renovacionEnCurso) {
    renovacionEnCurso = (async () => {
      if (!tokenRefresco) return false;
      try {
        const res = await fetch(`${API_URL}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ refreshToken: tokenRefresco }),
        });
        if (!res.ok) return false;
        const datos = (await res.json()) as RespuestaSesion;
        await guardarSesion(datos);
        return true;
      } catch {
        return false;
      }
    })().finally(() => {
      renovacionEnCurso = null;
    });
  }
  return renovacionEnCurso;
}

export interface OpcionesSolicitud {
  metodo?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  /** Cuerpo JSON. */
  cuerpo?: unknown;
  /** Cuerpo multipart/form-data (el navegador o RN pone el Content-Type con el boundary). */
  formulario?: FormData;
  /** false para las rutas públicas (login, activar, recuperar...). */
  autenticada?: boolean;
}

/** Ejecuta la petición y devuelve el objeto Response (con renovación automática en 401). */
export async function solicitudCruda(ruta: string, opciones: OpcionesSolicitud = {}): Promise<Response> {
  const { metodo = 'GET', cuerpo, formulario, autenticada = true } = opciones;

  const ejecutar = () => {
    const encabezados: Record<string, string> = { Accept: 'application/json' };
    if (cuerpo !== undefined) encabezados['Content-Type'] = 'application/json';
    if (autenticada && tokenAcceso) encabezados.Authorization = `Bearer ${tokenAcceso}`;
    return fetch(`${API_URL}${ruta}`, {
      method: metodo,
      headers: encabezados,
      body: formulario ?? (cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined),
    });
  };

  let res: Response;
  try {
    res = await ejecutar();
    if (res.status === 401 && autenticada) {
      const renovado = await renovarToken();
      if (!renovado) {
        await borrarSesion();
        alExpirarSesion?.();
        throw new ApiError(401, 'Su sesión expiró. Inicie sesión nuevamente.', 'SESION_EXPIRADA');
      }
      res = await ejecutar();
    }
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(0, `No se pudo conectar con el servidor (${API_URL}). Verifique su conexión.`, 'SIN_CONEXION');
  }

  if (!res.ok) throw await errorDesdeRespuesta(res);
  return res;
}

/** Petición que devuelve JSON tipado. */
export async function solicitud<T>(ruta: string, opciones: OpcionesSolicitud = {}): Promise<T> {
  const res = await solicitudCruda(ruta, opciones);
  const texto = await res.text();
  return (texto ? JSON.parse(texto) : {}) as T;
}

/** Mensaje legible para cualquier error capturado. */
export function mensajeError(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return 'Ocurrió un error inesperado';
}
