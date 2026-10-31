// Individuelle Blickkalibrierung: je Auge ein lineares Modell von Irisverschiebung auf Grad.
// Reine Rechenlogik ohne Browserbezug.
//
// Winkel: h positiv = rechts der Person, v positiv = oben. Das Modell wird nur an den
// Zielen mit role "fit" angepasst und an den Zielen mit role "check" geprueft.

export const SCREEN_WIDTH_CM = 28.6;
export const MIN_SAMPLES = 10;
// Alle Schwellen sind experimentell und noch nicht an Daten validiert.
export const MAX_ERROR_H = 2;
export const MAX_ERROR_V = 3;
export const MAX_POINT_ERROR = 4;
export const MAX_NOISE_H = 1.5;
export const MAX_NOISE_V = 2.5;
export const MIN_VALID_SHARE = 0.7;
export const MAX_GAP_MS = 600;
export const MAX_SIDE_DIFFERENCE = 3;
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
  step("Prüfung rechts oben", 7, 5, "check"),
  step("Prüfung links unten", -7, -5, "check"),
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
export function fitPlane(points, key) {
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

export function spread(values) {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1));
}

const rootMeanSquare = (values) =>
  Math.sqrt(values.reduce((sum, value) => sum + value * value, 0) / values.length);

function stepPoint(entry, side) {
  const valid = entry.samples.filter((sample) => sample[side])
    .map((sample) => ({ ...sample[side], t: sample.t }));
  if (valid.length < MIN_SAMPLES) return { ...entry.target, samples: valid, usable: false };
  return {
    ...entry.target,
    samples: valid,
    usable: true,
    x: median(valid.map((sample) => sample.x)),
    y: median(valid.map((sample) => sample.y)),
  };
}

function longestGap(samples) {
  let gap = 0;
  for (let i = 1; i < samples.length; i += 1) gap = Math.max(gap, samples[i].t - samples[i - 1].t);
  return gap;
}

function failure(reason, validShare) {
  return { passed: false, reason, validShare, model: null, errorH: null, errorV: null, maxError: null,
           noiseH: null, noiseV: null, longestGap: null, weightH: 0, weightV: 0 };
}

const weightFor = (noise, error) => 1 / (Math.max(noise, MIN_NOISE) ** 2 + error ** 2);

// An jedem Pruefziel zaehlen beide Achsen, auch die erwartete Nullkomponente.
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

  const errors = checks.map((point) => {
    const estimate = toDegrees(model, point.x, point.y);
    return { h: estimate.h - point.h, v: estimate.v - point.v };
  });
  const errorH = rootMeanSquare(errors.map((error) => error.h));
  const errorV = rootMeanSquare(errors.map((error) => error.v));
  const maxError = Math.max(...errors.map((error) => Math.hypot(error.h, error.v)));

  const spreads = points.map((point) => {
    const degrees = point.samples.map((sample) => toDegrees(model, sample.x, sample.y));
    return { h: spread(degrees.map((d) => d.h)), v: spread(degrees.map((d) => d.v)) };
  });
  const noiseH = median(spreads.map((value) => value.h));
  const noiseV = median(spreads.map((value) => value.v));
  const worstH = Math.max(...spreads.map((value) => value.h));
  const worstV = Math.max(...spreads.map((value) => value.v));
  const gap = Math.max(...points.map((point) => longestGap(point.samples)));

  let reason = null;
  if (validShare < MIN_VALID_SHARE) reason = "zu wenige gültige Bilder";
  else if (gap > MAX_GAP_MS) reason = "Tracking-Lücke";
  else if (worstH > MAX_NOISE_H || worstV > MAX_NOISE_V) reason = "Einzelwerte zu unruhig";
  else if (errorH > MAX_ERROR_H || errorV > MAX_ERROR_V || maxError > MAX_POINT_ERROR) reason = "Prüffehler zu groß";
  const passed = reason === null;
  return {
    passed, reason, validShare, model, errorH, errorV, maxError, noiseH, noiseV, longestGap: gap,
    weightH: passed ? weightFor(noiseH, errorH) : 0,
    weightV: passed ? weightFor(noiseV, errorV) : 0,
  };
}

export function calibrate(entries) {
  const rechts = evaluateEye(entries, "rechts");
  const links = evaluateEye(entries, "links");
  const passed = rechts.passed || links.passed;
  let best = null;
  if (passed) best = rechts.weightH + rechts.weightV >= links.weightH + links.weightV ? "rechts" : "links";
  return { rechts, links, passed, best };
}

// Mittelwert nach gemessener Guete, je Achse getrennt. Die Gewichte sind Heuristik, keine
// validierten Unsicherheiten. Faellt ein Auge aus, zaehlt das andere allein. Bei grosser
// Seitendifferenz bleibt die Achse leer; die Ursache wird nicht gedeutet.
function fuseAxis(rechts, links, weightRechts, weightLinks) {
  const parts = [[rechts, weightRechts], [links, weightLinks]]
    .filter(([value, weight]) => value !== null && value !== undefined && weight > 0);
  if (!parts.length) return { value: null, disagree: false };
  if (parts.length === 2 && Math.abs(parts[0][0] - parts[1][0]) > MAX_SIDE_DIFFERENCE) {
    return { value: null, disagree: true };
  }
  const total = parts.reduce((sum, [, weight]) => sum + weight, 0);
  return { value: parts.reduce((sum, [value, weight]) => sum + value * weight, 0) / total, disagree: false };
}

export function fuse(rechts, links, calibration) {
  const h = fuseAxis(rechts?.h, links?.h, calibration.rechts.weightH, calibration.links.weightH);
  const v = fuseAxis(rechts?.v, links?.v, calibration.rechts.weightV, calibration.links.weightV);
  if (h.value === null && v.value === null && !h.disagree && !v.disagree) return null;
  return { h: h.value, v: v.value, disagree: h.disagree || v.disagree };
}
