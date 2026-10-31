// Individuelle Blickkalibrierung: je Auge ein lineares Modell von Irisverschiebung auf Grad.
// Reine Rechenlogik ohne Browserbezug.
//
// Winkel: h positiv = rechts der Person, v positiv = oben. Das Modell wird nur an den
// Zielen mit role "fit" angepasst und an den Zielen mit role "check" geprueft.

export const SCREEN_WIDTH_CM = 28.6;
export const MIN_VALID_MS = 330;
// Alle Schwellen sind experimentell und noch nicht an Daten validiert.
export const MAX_ERROR_H = 2;
export const MAX_ERROR_V = 3;
export const MAX_POINT_ERROR = 4;
// Alles Zeitliche steht in Millisekunden, damit es bei jeder Bildrate dasselbe bedeutet.
export const FILTER_HALF_MS = 70;
const FILTER_MAX_GAP_MS = 100;
export const MAX_NOISE_H = 1.5;
export const MAX_NOISE_V = 2.5;
export const MIN_VALID_SHARE = 0.7;
export const MAX_GAP_MS = 600;
export const MAX_SIDE_DIFFERENCE = 5;
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

// Passen alle Ziele bei diesem Abstand und dieser Bildschirmgroesse auf den Bildschirm?
export function targetsFit(distanceCm, cssWidth, cssHeight, screenWidthCm, targets = STEPS) {
  return targets.every((target) => {
    const pixel = targetPixels(target, distanceCm, cssWidth, cssHeight, screenWidthCm);
    return pixel.x >= 0 && pixel.x <= cssWidth && pixel.y >= 0 && pixel.y <= cssHeight;
  });
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

// Grad je Bildpunkt Positionsfehler: zeigt, wie stark die Kalibrierung kleine Fehler verstaerkt.
export function sensitivity(model, irisPx) {
  if (!model || !(irisPx > 0)) return null;
  return { h: Math.hypot(model.h[1], model.h[2]) / irisPx, v: Math.hypot(model.v[1], model.v[2]) / irisPx };
}

export function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

// Zentrierter Medianfilter: senkt Rauschen und erhaelt Spruenge. Er greift nicht ueber Luecken.
export function medianFilter(points, keys, timeKey = "time", halfMs = FILTER_HALF_MS) {
  return points.map((point, index) => {
    const result = { ...point };
    const window = [];
    for (let i = index; i >= 0 && point[timeKey] - points[i][timeKey] <= halfMs; i -= 1) {
      if (i < index && points[i + 1][timeKey] - points[i][timeKey] > FILTER_MAX_GAP_MS) break;
      window.push(points[i]);
    }
    for (let i = index + 1; i < points.length && points[i][timeKey] - point[timeKey] <= halfMs; i += 1) {
      if (points[i][timeKey] - points[i - 1][timeKey] > FILTER_MAX_GAP_MS) break;
      window.push(points[i]);
    }
    for (const key of keys) result[key] = median(window.map((item) => item[key]));
    return result;
  });
}

// Reicht die abgedeckte Zeit? Gezaehlt wird Bildzahl mal Bildabstand, nicht die Bildzahl.
export function hasEnoughData(points, timeKey = "time", minMs = MIN_VALID_MS) {
  if (points.length < 3) return false;
  const steps = points.slice(1).map((point, index) => point[timeKey] - points[index][timeKey]);
  return points.length * median(steps) >= minMs;
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
  if (!hasEnoughData(valid, "t")) return { ...entry.target, samples: valid, usable: false };
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
  return { passed: false, passedH: false, passedV: false, reason, validShare, model: null, errorH: null,
           errorV: null, maxError: null, maxErrorH: null, maxErrorV: null, noiseH: null, noiseV: null,
           longestGap: null, weightH: 0, weightV: 0 };
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
  const maxErrorH = Math.max(...errors.map((error) => Math.abs(error.h)));
  const maxErrorV = Math.max(...errors.map((error) => Math.abs(error.v)));

  // Unruhe auf gefilterten Werten: Der Bildfehler ist sonst groesser als das, was ausgewertet wird.
  const spreads = points.map((point) => {
    const filtered = medianFilter(point.samples, ["x", "y"], "t");
    const degrees = filtered.map((sample) => toDegrees(model, sample.x, sample.y));
    return { h: spread(degrees.map((d) => d.h)), v: spread(degrees.map((d) => d.v)) };
  });
  const noiseH = median(spreads.map((value) => value.h));
  const noiseV = median(spreads.map((value) => value.v));
  const worstH = Math.max(...spreads.map((value) => value.h));
  const worstV = Math.max(...spreads.map((value) => value.v));
  const gap = Math.max(...points.map((point) => longestGap(point.samples)));

  let common = null;
  if (validShare < MIN_VALID_SHARE) common = "zu wenige gültige Bilder";
  else if (gap > MAX_GAP_MS) common = "Tracking-Lücke";
  const axisProblem = (error, worstError, noise, maxError_, maxNoise) => {
    if (noise > maxNoise) return "Einzelwerte zu unruhig";
    if (error > maxError_ || worstError > MAX_POINT_ERROR) return "Prüffehler zu groß";
    return null;
  };
  const problemH = common ?? axisProblem(errorH, maxErrorH, worstH, MAX_ERROR_H, MAX_NOISE_H);
  const problemV = common ?? axisProblem(errorV, maxErrorV, worstV, MAX_ERROR_V, MAX_NOISE_V);
  const passedH = problemH === null;
  const passedV = problemV === null;
  return {
    passed: passedH || passedV,
    passedH,
    passedV,
    reason: problemH ?? problemV,
    reasonH: problemH,
    reasonV: problemV,
    validShare, model, errorH, errorV, maxError, maxErrorH, maxErrorV, noiseH, noiseV, longestGap: gap,
    weightH: passedH ? weightFor(noiseH, errorH) : 0,
    weightV: passedV ? weightFor(noiseV, errorV) : 0,
  };
}

// Mittelpunkt beider Augen. Einzelaugen zeigen seitenabhaengige Fehler, die sich hier aufheben.
export function midpoint(rechts, links) {
  if (!rechts || !links) return null;
  return { x: (rechts.x + links.x) / 2, y: (rechts.y + links.y) / 2 };
}

export function calibrate(rawEntries) {
  const entries = rawEntries.map((entry) => ({
    ...entry,
    samples: entry.samples.map((sample) => ({ ...sample, mittel: midpoint(sample.rechts, sample.links) })),
  }));
  const rechts = evaluateEye(entries, "rechts");
  const links = evaluateEye(entries, "links");
  const mittel = evaluateEye(entries, "mittel");
  const passed = rechts.passed || links.passed || mittel.passed;
  let best = null;
  if (passed) best = rechts.weightH + rechts.weightV >= links.weightH + links.weightV ? "rechts" : "links";
  return { rechts, links, mittel, passed, best };
}

// Hauptmessung: Mittelpunkt mit eigenem Modell. Fehlt ein Auge, zaehlt das andere mit seinem Modell.
// Eine grosse Seitendifferenz wird markiert; die Einzelaugen sind dafuer zu unsicher, um zu sperren.
export function combineEyes(rawRechts, rawLinks, calibration) {
  const estimate = (side, point) => {
    const eye = calibration[side];
    return point && eye?.model ? toDegrees(eye.model, point.x, point.y) : null;
  };
  const right = estimate("rechts", rawRechts);
  const left = estimate("links", rawLinks);
  const both = estimate("mittel", midpoint(rawRechts, rawLinks));
  if (!both) {
    const single = right ?? left;
    return single ? { h: single.h, v: single.v, disagree: false } : null;
  }
  const apart = (key) => Boolean(right && left) && Math.abs(right[key] - left[key]) > MAX_SIDE_DIFFERENCE;
  return { h: both.h, v: both.v, disagree: apart("h") || apart("v") };
}
