/**
 * Lector de códigos QR con la cámara del equipo (librería html5-qrcode).
 * Al detectar un código se detiene la cámara y se entrega el texto leído.
 */
import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState, Html5QrcodeSupportedFormats } from 'html5-qrcode';

const ID_LECTOR = 'lector-qr-convive';

export function LectorQR({ onLeido, pausado }: { onLeido: (codigo: string) => void; pausado?: boolean }) {
  const lector = useRef<Html5Qrcode | null>(null);
  const callback = useRef(onLeido);
  const [activo, setActivo] = useState(false);
  const [iniciando, setIniciando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  callback.current = onLeido;

  const detener = async () => {
    const l = lector.current;
    if (l && l.getState() === Html5QrcodeScannerState.SCANNING) {
      try {
        await l.stop();
        l.clear();
      } catch {
        /* la cámara ya estaba detenida */
      }
    }
    setActivo(false);
  };

  const iniciar = async () => {
    setError(null);
    setIniciando(true);
    try {
      if (!lector.current) {
        lector.current = new Html5Qrcode(ID_LECTOR, { formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE], verbose: false });
      }
      await lector.current.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (texto) => {
          void detener();
          callback.current(texto.trim());
        },
        () => {
          /* fotograma sin código: se ignora */
        },
      );
      setActivo(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(
        /permission|notallowed/i.test(msg)
          ? 'No se otorgó permiso para usar la cámara. Habilítelo en el navegador o ingrese el código manualmente.'
          : /notfound|no camera|requested device/i.test(msg)
            ? 'No se encontró una cámara disponible. Ingrese el código manualmente.'
            : `No fue posible iniciar la cámara (${msg}). La cámara requiere HTTPS o localhost.`,
      );
    } finally {
      setIniciando(false);
    }
  };

  // Al pausar (mientras se muestra un resultado) o desmontar, se libera la cámara
  useEffect(() => {
    if (pausado) void detener();
  }, [pausado]);

  useEffect(
    () => () => {
      void detener();
    },
    [],
  );

  return (
    <div>
      <div id={ID_LECTOR} className="lector-qr" style={{ display: activo ? 'block' : 'none' }} />
      {!activo && (
        <div className="estado-vista" style={{ minHeight: 200, justifyContent: 'center' }}>
          <span style={{ fontSize: '2.4rem' }} aria-hidden="true">
            ⌗
          </span>
          <span>Escanee el código QR del visitante con la cámara.</span>
        </div>
      )}
      {error && (
        <p className="alerta alerta-error" role="alert" style={{ marginTop: '0.8rem' }}>
          {error}
        </p>
      )}
      <div className="form-acciones" style={{ justifyContent: 'flex-start' }}>
        {activo ? (
          <button className="btn btn-sec" onClick={() => void detener()}>
            Detener cámara
          </button>
        ) : (
          <button className="btn btn-prim" onClick={() => void iniciar()} disabled={iniciando || pausado}>
            {iniciando ? 'Iniciando cámara…' : 'Activar cámara'}
          </button>
        )}
      </div>
    </div>
  );
}
