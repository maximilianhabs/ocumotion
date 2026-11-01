// Gesichtserkennung im eigenen Thread. Bekommt je Bild ein ImageBitmap, liefert Gesichtspunkte und Dauer.
// Das Bild bleibt im Arbeitsspeicher und wird nach der Analyse freigegeben.

import { createLandmarker } from "./landmarker.js";

let landmarker = null;

self.onmessage = async ({ data }) => {
  if (data.type === "open") {
    try {
      landmarker = await createLandmarker(data.numFaces);
      self.postMessage({ type: "ready" });
    } catch (error) {
      self.postMessage({ type: "failed", message: error.message });
    }
    return;
  }
  if (data.type === "close") {
    landmarker?.close();
    landmarker = null;
    return;
  }
  const { id, image, stamp } = data;
  try {
    const start = performance.now();
    const result = landmarker.detectForVideo(image, stamp);
    self.postMessage({ type: "result", id, faces: result.faceLandmarks, ms: performance.now() - start });
  } catch (error) {
    self.postMessage({ type: "result", id, error: error.message });
  } finally {
    image.close();
  }
};
