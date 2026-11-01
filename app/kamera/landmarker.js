// Erstellt den FaceLandmarker aus den lokalen Dateien, im Worker wie im Hauptthread.

import { FilesetResolver, FaceLandmarker } from "../vendor/mediapipe/vision_bundle.mjs";

const WASM = new URL("../vendor/mediapipe/wasm", import.meta.url).href;
const MODEL = new URL("../vendor/mediapipe/face_landmarker.task", import.meta.url).href;

export async function createLandmarker(numFaces) {
  // Modulfassung, weil Module-Worker kein importScripts kennen.
  const fileset = await FilesetResolver.forVisionTasks(WASM, true);
  // Im Hauptthread lädt die Laufzeit per script-Tag, das scheitert an der Modulfassung. Der Import setzt ModuleFactory selbst.
  if (typeof importScripts !== "function") {
    await import(fileset.wasmLoaderPath);
    fileset.wasmLoaderPath = "";
  }
  return FaceLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: MODEL, delegate: "GPU" },
    runningMode: "VIDEO",
    numFaces,
    outputFaceBlendshapes: false,
    outputFacialTransformationMatrixes: false,
  });
}
