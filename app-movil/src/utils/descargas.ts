/**
 * Descarga de archivos protegidos (comprobantes PDF).
 * - Web: fetch con el token → Blob → enlace de descarga.
 * - Nativo: expo-file-system descarga con el encabezado Authorization y expo-sharing abre
 *   el menú del sistema para guardar o compartir el PDF.
 */
import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { API_URL, ApiError, obtenerTokenAcceso, renovarToken, solicitudCruda } from '../api/cliente';

export async function descargarPdf(ruta: string, nombreArchivo: string): Promise<void> {
  if (Platform.OS === 'web') {
    // solicitudCruda agrega el token y lo renueva si venció
    const res = await solicitudCruda(ruta);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombreArchivo;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return;
  }

  const destino = new File(Paths.cache, nombreArchivo);
  const descargar = () =>
    File.downloadFileAsync(`${API_URL}${ruta}`, destino, {
      headers: { Authorization: `Bearer ${obtenerTokenAcceso() ?? ''}` },
      idempotent: true,
    });

  let archivo: File;
  try {
    archivo = await descargar();
  } catch {
    // Posible token vencido: se renueva una vez y se reintenta
    if (!(await renovarToken())) throw new ApiError(401, 'Su sesión expiró. Inicie sesión nuevamente.');
    try {
      archivo = await descargar();
    } catch {
      throw new ApiError(0, 'No se pudo descargar el comprobante. Intente de nuevo.');
    }
  }

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(archivo.uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Comprobante de pago',
      UTI: 'com.adobe.pdf',
    });
  } else {
    throw new ApiError(0, `El comprobante se guardó en ${archivo.uri}, pero este dispositivo no permite compartirlo.`);
  }
}
