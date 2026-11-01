// Augenposition aus MediaPipe-Gesichtspunkten. Reine Rechenlogik ohne Browserbezug.
//
// x ist die Verschiebung der Irismitte entlang der Lidachse in Irisdurchmessern.
// Positiv heisst: die Person blickt zu ihrer rechten Seite. Alle Punkte stammen aus
// dem ungespiegelten Kamerabild, dort liegt die rechte Seite der Person bildlinks.
// y ist die Verschiebung senkrecht zur Lidachse, positiv heisst nach oben.

export const EYES = {
  rechts: { imageLeft: 33, imageRight: 133, top: 159, bottom: 145, center: 468, rimA: 469, rimB: 471 },
  links: { imageLeft: 362, imageRight: 263, top: 386, bottom: 374, center: 473, rimA: 474, rimB: 476 },
};

export const MIN_APERTURE = 0.14;
export const MAX_HEAD_SPEED = 9;
const NOMINAL_FRAME_MS = 1000 / 30;
export const DIRECTION_THRESHOLD = 0.12;

const toPixels = (point, width, height) => ({ x: point.x * width, y: point.y * height });
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export function measureEye(points, width, height, eye) {
  const at = (index) => toPixels(points[index], width, height);
  const a = at(eye.imageLeft);
  const b = at(eye.imageRight);
  const center = at(eye.center);
  const axis = { x: b.x - a.x, y: b.y - a.y };
  const eyeWidth = Math.hypot(axis.x, axis.y);
  const irisPx = distance(at(eye.rimA), at(eye.rimB));
  const reasons = [];
  if (eyeWidth <= 0 || irisPx <= 0) {
    return { valid: false, reasons: ["keine Geometrie"], x: null, y: null, irisPx, aperture: 0, position: null };
  }
  const position = ((center.x - a.x) * axis.x + (center.y - a.y) * axis.y) / (eyeWidth * eyeWidth);
  const aperture = distance(at(eye.top), at(eye.bottom)) / eyeWidth;
  if (aperture < MIN_APERTURE) reasons.push("Lid");
  if (position < 0 || position > 1) reasons.push("Iris außerhalb");
  const x = ((0.5 - position) * eyeWidth) / irisPx;
  const middle = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const below = ((center.y - middle.y) * axis.x - (center.x - middle.x) * axis.y) / eyeWidth;
  const y = -below / irisPx;
  return { valid: reasons.length === 0, reasons, x, y, irisPx, aperture, position };
}

// Kopfposition als Mitte aller vier Lidwinkel in Bildpunkten.
export function headPoint(points, width, height) {
  const corners = [33, 133, 362, 263].map((index) => toPixels(points[index], width, height));
  return {
    x: corners.reduce((sum, p) => sum + p.x, 0) / corners.length,
    y: corners.reduce((sum, p) => sum + p.y, 0) / corners.length,
  };
}

// MAX_HEAD_SPEED: Irisdurchmesser je Sekunde, damit die Grenze nicht von der Bildrate abhaengt.
export function measureFrame(points, width, height, previousHead, frameDeltaMs = NOMINAL_FRAME_MS) {
  const rechts = measureEye(points, width, height, EYES.rechts);
  const links = measureEye(points, width, height, EYES.links);
  const head = headPoint(points, width, height);
  const irisPx = (rechts.irisPx + links.irisPx) / 2;
  const headStep = previousHead && irisPx > 0 ? distance(head, previousHead) / irisPx : 0;
  const headSpeed = frameDeltaMs > 0 ? headStep / (frameDeltaMs / 1000) : 0;
  const headMoved = headSpeed > MAX_HEAD_SPEED;
  if (headMoved) {
    for (const eye of [rechts, links]) {
      eye.valid = false;
      eye.reasons.push("Kopfbewegung");
    }
  }
  return { rechts, links, head, headStep, irisPx };
}

export function meanX(frame) {
  const values = [frame.rechts, frame.links].filter((eye) => eye.valid).map((eye) => eye.x);
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function direction(x, threshold = DIRECTION_THRESHOLD) {
  if (x === null) return null;
  if (x > threshold) return "rechts";
  if (x < -threshold) return "links";
  return "Mitte";
}

export function standardDeviation(values) {
  if (values.length < 2) return null;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const sum = values.reduce((total, value) => total + (value - mean) ** 2, 0);
  return Math.sqrt(sum / (values.length - 1));
}
