// Einheitliche Erkennung: bevorzugt im Worker, sonst im Hauptthread. Es läuft höchstens ein Bild zugleich;
// kommt ein neues, solange die Erkennung arbeitet, verwirft die Bildschleife es und zählt es.

function inThread(landmarker, label) {
  return {
    mode: label,
    busy: false,
    detect(image, stamp) {
      const start = performance.now();
      const result = landmarker.detectForVideo(image, stamp);
      return Promise.resolve({ faces: result.faceLandmarks, ms: performance.now() - start });
    },
    close() {
      landmarker.close();
    },
  };
}

function openWorker(numFaces) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./erkennung-worker.js", import.meta.url), { type: "module" });
    const waiting = new Map();
    let nextId = 0;
    const detector = {
      mode: "Worker",
      busy: false,
      async detect(element, stamp) {
        const image = await createImageBitmap(element);
        nextId += 1;
        const id = nextId;
        return new Promise((done, failed) => {
          waiting.set(id, { done, failed });
          worker.postMessage({ type: "detect", id, image, stamp }, [image]);
        });
      },
      close() {
        worker.postMessage({ type: "close" });
        worker.terminate();
        for (const { failed } of waiting.values()) failed(new Error("Erkennung beendet"));
        waiting.clear();
      },
    };
    worker.onerror = (event) => {
      event.preventDefault();
      worker.terminate();
      reject(new Error(event.message || "Worker nicht gestartet"));
    };
    worker.onmessage = ({ data }) => {
      if (data.type === "ready") resolve(detector);
      else if (data.type === "failed") {
        worker.terminate();
        reject(new Error(data.message));
      } else if (data.type === "result") {
        const pending = waiting.get(data.id);
        waiting.delete(data.id);
        if (data.error) pending?.failed(new Error(data.error));
        else pending?.done({ faces: data.faces, ms: data.ms });
      }
    };
    worker.postMessage({ type: "open", numFaces });
  });
}

// Liefert die Erkennung und, falls der Worker scheiterte, den Grund.
export async function openDetector(numFaces, { forceMainThread = false } = {}) {
  let workerError = null;
  if (!forceMainThread) {
    try {
      return { detector: await openWorker(numFaces), workerError };
    } catch (error) {
      workerError = error.message;
    }
  }
  const { createLandmarker } = await import("./landmarker.js");
  return { detector: inThread(await createLandmarker(numFaces), "Hauptthread"), workerError };
}

export const fakeDetector = (landmarker) => inThread(landmarker, "Trockenlauf");
