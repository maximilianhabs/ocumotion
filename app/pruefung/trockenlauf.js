// Trockenlauf ohne Kamera und Modell: Aufruf mit augen.html?trockenlauf.
// Ein simuliertes Gesicht folgt dem Punkt exakt, mit etwas Rauschen. So laesst sich der
// ganze Ablauf mit bekannter Antwort pruefen. Das Ergebnis sagt nichts ueber echte Augen.

import { EYES } from "../messung/augen-logik.js";

const WIDTH = 1280;
const HEIGHT = 720;
const IRIS_PX = 30;
const IRIS_PER_DEGREE = 0.018;
const NOISE_PX = 0.1;

function placeEye(points, eye, leftX, y, target) {
  const set = (index, x, py) => { points[index] = { x: x / WIDTH, y: py / HEIGHT }; };
  const shift = () => (Math.random() * 2 - 1) * NOISE_PX;
  const centerX = leftX + 40 - target.h * IRIS_PER_DEGREE * IRIS_PX + shift();
  const centerY = y + 0 - target.v * IRIS_PER_DEGREE * IRIS_PX + shift();
  set(eye.imageLeft, leftX, y);
  set(eye.imageRight, leftX + 80, y);
  set(eye.top, leftX + 40, y - 14);
  set(eye.bottom, leftX + 40, y + 14);
  set(eye.center, centerX, centerY);
  set(eye.rimA, centerX + IRIS_PX / 2, centerY);
  set(eye.rimB, centerX - IRIS_PX / 2, centerY);
}

export function fakeLandmarker(currentTarget) {
  return {
    close() {},
    detectForVideo() {
      const points = Array.from({ length: 478 }, () => ({ x: 0, y: 0 }));
      const target = currentTarget();
      placeEye(points, EYES.rechts, 500, 300, target);
      placeEye(points, EYES.links, 700, 300, target);
      return { faceLandmarks: [points] };
    },
  };
}

export function fakeStream() {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const context = canvas.getContext("2d");
  let frame = 0;
  setInterval(() => {
    frame += 1;
    context.fillStyle = "#444";
    context.fillRect(0, 0, WIDTH, HEIGHT);
    context.fillStyle = "#777";
    context.fillRect(frame % WIDTH, 0, 40, HEIGHT);
  }, 33);
  return canvas.captureStream(30);
}
