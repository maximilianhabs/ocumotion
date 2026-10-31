// Bildquelle ueber die lokale Bruecke (tools/kamera_bruecke.swift). Bietet dieselben Felder wie ein Videoelement,
// damit die Bildschleife unveraendert bleibt. Bilder bleiben im Arbeitsspeicher.

const URL_BRIDGE = "ws://127.0.0.1:5601";
const HEADER_BYTES = 24;
const OPEN_TIMEOUT_MS = 4000;
// Aeltere Bilder werden uebersprungen, damit die Analyse nicht hinter der Kamera herlaeuft.
const MAX_AGE_MS = 50;

export function openBridge(canvas, onClose) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(URL_BRIDGE);
    socket.binaryType = "arraybuffer";
    const context = canvas.getContext("2d");
    let clockOffset = Infinity;
    let pending = null;
    let handle = 0;
    let opened = false;
    const source = {
      image: canvas,
      videoWidth: 0,
      videoHeight: 0,
      skipped: 0,
      droppedByBridge: 0,
      requestVideoFrameCallback(callback) {
        handle += 1;
        pending = { handle, callback };
        return handle;
      },
      cancelVideoFrameCallback(id) {
        if (pending?.handle === id) pending = null;
      },
      close() {
        socket.onclose = null;
        socket.close();
      },
    };
    const timeout = setTimeout(() => {
      socket.onclose = null;
      socket.close();
      reject(new Error("Brücke antwortet nicht. Im Terminal starten: make kamera-bruecke"));
    }, OPEN_TIMEOUT_MS);
    socket.onmessage = (event) => {
      const now = performance.now();
      const header = new DataView(event.data, 0, HEADER_BYTES);
      const frameMs = header.getFloat64(0, true);
      const width = header.getUint32(8, true);
      const height = header.getUint32(12, true);
      source.droppedByBridge = header.getUint32(20, true);
      clockOffset = Math.min(clockOffset, now - frameMs);
      const captureTime = frameMs + clockOffset;
      if (!opened) {
        opened = true;
        clearTimeout(timeout);
        source.videoWidth = width;
        source.videoHeight = height;
        canvas.width = width;
        canvas.height = height;
        resolve(source);
      }
      if (now - captureTime > MAX_AGE_MS || !pending) {
        source.skipped += 1;
        return;
      }
      context.putImageData(new ImageData(new Uint8ClampedArray(event.data, HEADER_BYTES), width, height), 0, 0);
      const { callback } = pending;
      pending = null;
      callback(now, { captureTime, mediaTime: frameMs / 1000, presentedFrames: header.getUint32(16, true) });
    };
    socket.onclose = () => {
      clearTimeout(timeout);
      if (opened) onClose();
      else reject(new Error("Brücke antwortet nicht. Im Terminal starten: make kamera-bruecke"));
    };
  });
}
