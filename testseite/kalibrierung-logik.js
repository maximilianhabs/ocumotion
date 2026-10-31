// Individuelle Blickkalibrierung: je Auge ein lineares Modell von Irisverschiebung auf Grad.
// Reine Rechenlogik ohne Browserbezug.
//
// Winkel: h positiv = rechts der Person, v positiv = oben. Das Modell wird nur an den
// Zielen mit role "fit" angepasst und an den Zielen mit role "check" geprueft.

export const SCREEN_WIDTH_CM = 28.6;
export const MIN_SAMPLES = 10;
export const MAX_ERROR_H = 2;
export const MAX_ERROR_V = 3;
const MIN_NOISE = 0.05;

const step = (name, h, v, role) => ({ name, h, v, role });

export const STEPS = [
  step("Mitte", 0, 0, "fit"),
  step("Rechts 15°", 15, 0, "fit"),
  step("Mitte", 0, 0, "fit"),
  step("Links 15°", -15, 0, "fit"),
  step("Mitte", 0, 0, "fit"),
  step("Oben 10°", 0, 10, "fit"),
  step("Mitte", 0, 0, "fit"),
  step("Unten 10°", 0, -10, "fit"),
  step("Prüfung rechts 7°", 7, 0, "check"),
  step("Prüfung links 7°", -7, 0, "check"),
  step("Prüfung oben 5°", 0, 5, "check"),
  step("Prüfung unten 5°", 0, -5, "check"),
];

const radians = (degrees) => (degrees * Math.PI) / 180;

export function targetPixels(target, distanceCm, cssWidth, cssHeight, screenWidthCm = SCREEN_WIDTH_CM) {
  const cmPerPx = screenWidthCm / cssWidth;
  return {
    x: cssWidth / 2 + (Math.tan(radians(target.h)) * distanceCm) / cmPerPx,
    y: cssHeight / 2 - (Math.tan(radians(target.v)) * distanceCm) / cmPerPx,
  };
}

function solve3(matrix, vector) {
  const rows = matrix.map((row, i) => [...row, vector[i]]);
  for (let column = 0; column < 3; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < 3; row += 1) {
      if (Math.abs(rows[row][column]) > Math.abs(rows[pivot][column])) pivot = row;
    }
    if (Math.abs(rows[pivot][column]) < 1e-12) return null;
    [rows[column], rows[pivot]] = [rows[pivot], rows[column]];
    for (let row = 0; row < 3; row += 1) {
      if (row === column) continue;
      const factor = rows[row][column] / rows[column][column];
      for (let i = column; i < 4; i += 1) rows[row][i] -= factor * rows[column][i];
    }
  }
  return rows.map((row, i) => row[3] / row[i]);
}

// Kleinste Quadrate fuer wert = c0 + c1 * x + c2 * y.
function fitPlane(points, key) {
  const normal = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  const right = [0, 0, 0];
  for (const point of points) {
    const row = [1, point.x, point.y];
    for (let i = 0; i < 3; i += 1) {
      right[i] += row[i] * point[key];
      for (let j = 0; j < 3; j += 1) normal[i][j] += row[i] * row[j];
    }
  }
  return solve3(normal, right);
}

export function toDegrees(model, x, y) {
  return {
    h: model.h[0] + model.h[1] * x + model.h[2] * y,
    v: model.v[0] + model.v[1] * x + model.v[2] * y,
  };
}

export function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function spread(values) {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1));
}

const rootMeanSquare = (values) =>
  Math.sqrt(values.reduce((sum, value) => sum + value * value, 0) / values.length);

function stepPoint(entry, side) {
  const valid = entry.samples.map((sample) => sample[side]).filter(Boolean);
  if (valid.length < MIN_SAMPLES) return { ...entry.target, samples: valid, usable: false };
  return {
    ...entry.target,
    samples: valid,
    usable: true,
    x: median(valid.map((sample) => sample.x)),
    y: median(valid.map((sample) => sample.y)),
  };
}

function failure(reason, validShare) {
  return { passed: false, reason, validShare, model: null, errorH: null, errorV: null, noise: null, weight: 0 };
}

export function evaluateEye(entries, side) {
  const total = entries.reduce((sum, entry) => sum + entry.samples.length, 0);
  const valid = entries.reduce((sum, entry) => sum + entry.samples.filter((s) => s[side]).length, 0);
  const validShare = total ? valid / total : 0;
  const points = entries.map((entry) => stepPoint(entry, side));
  const fitPoints = points.filter((point) => point.role === "fit" && point.usable);
  const checks = points.filter((point) => point.role === "check");
  const needed = entries.filter((entry) => entry.target.role === "fit").length;
  if (fitPoints.length < needed) return failure("zu wenige gültige Bilder an den Zielen", validShare);
  if (checks.some((point) => !point.usable)) return failure("Prüfziele nicht auswertbar", validShare);
  const h = fitPlane(fitPoints, "h");
  const v = fitPlane(fitPoints, "v");
  if (!h || !v) return failure("Ziele liefern kein eindeutiges Modell", validShare);
  const model = { h, v };

  const errorsH = [];
  const errorsV = [];
  for (const point of checks) {
    const estimate = toDegrees(model, point.x, point.y);
    if (point.h !== 0) errorsH.push(estimate.h - point.h);
    if (point.v !== 0) errorsV.push(estimate.v - point.v);
  }
  const errorH = rootMeanSquare(errorsH);
  const errorV = rootMeanSquare(errorsV);
  const noise = median(points.map((point) =>
    spread(point.samples.map((sample) => toDegrees(model, sample.x, sample.y).h))));
  const passed = errorH <= MAX_ERROR_H && errorV <= MAX_ERROR_V;
  const variance = Math.max(noise, MIN_NOISE) ** 2 + errorH ** 2;
  return {
    passed,
    reason: passed ? null : "Prüffehler zu groß",
    validShare,
    model,
    errorH,
    errorV,
    noise,
    weight: passed ? 1 / variance : 0,
  };
}

export function calibrate(entries) {
  const rechts = evaluateEye(entries, "rechts");
  const links = evaluateEye(entries, "links");
  const passed = rechts.passed || links.passed;
  let best = null;
  if (passed) best = rechts.weight >= links.weight ? "rechts" : "links";
  return { rechts, links, passed, best };
}

// Mittelwert nach gemessener Guete. Faellt ein Auge aus, zaehlt das andere allein.
export function fuse(rechts, links, calibration) {
  const parts = [[rechts, calibration.rechts.weight], [links, calibration.links.weight]]
    .filter(([estimate, weight]) => estimate && weight > 0);
  if (!parts.length) return null;
  const total = parts.reduce((sum, [, weight]) => sum + weight, 0);
  return {
    h: parts.reduce((sum, [estimate, weight]) => sum + estimate.h * weight, 0) / total,
    v: parts.reduce((sum, [estimate, weight]) => sum + estimate.v * weight, 0) / total,
  };
}
