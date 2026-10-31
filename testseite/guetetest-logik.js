// Geführter Gütetest: Ablauf und Auswertung. Reine Rechenlogik ohne Browserbezug.
//
// Der Test prueft das Werkzeug. Er setzt eine unauffaellige Okulomotorik der Testperson voraus
// und bewertet keine Person. Alle Bewertungsgrenzen sind experimentell.
// Zeiten in Millisekunden auf der Uhr von performance.now().

import { fitPlane, median, spread, toDegrees } from "./kalibrierung-logik.js";

export const FIXATION_MS = 20000;
export const TARGET_SETTLE_MS = 1200;
export const TARGET_COLLECT_MS = 1800;
export const PAUSE_MS = 2000;

export const ACCURACY_TARGETS = [
  { name: "rechts 12°", h: 12, v: 0 },
  { name: "links 12°", h: -12, v: 0 },
  { name: "oben 8°", h: 0, v: 8 },
  { name: "unten 8°", h: 0, v: -8 },
  { name: "rechts oben", h: 10, v: 7 },
  { name: "links unten", h: -10, v: -7 },
];

export const PURSUIT_RUNS = [
  { name: "langsam", amplitude: 10, frequency: 0.25, durationMs: 16000 },
  { name: "schnell", amplitude: 10, frequency: 0.5, durationMs: 8000 },
];

export const SACCADE_JUMPS = [
  { axis: "h", to: 10 }, { axis: "h", to: -10 }, { axis: "h", to: 10 }, { axis: "h", to: -10 },
  { axis: "h", to: 10 }, { axis: "h", to: -10 }, { axis: "h", to: 10 }, { axis: "h", to: 0 },
  { axis: "v", to: 8 }, { axis: "v", to: -8 }, { axis: "v", to: 8 }, { axis: "v", to: 0 },
];
export const SACCADE_MIN_MS = 1200;
export const SACCADE_MAX_MS = 1800;

const SACCADE_VELOCITY = 50;
const SACCADE_EARLIEST_MS = 80;
const SACCADE_LATEST_MS = 800;
const SACCADE_SETTLE_MS = 600;
const SACCADE_BASELINE_MS = 300;
const CATCHUP_VELOCITY = 50;
const MIN_POINTS = 10;

export const CHANNELS = ["rechts", "links", "mittel"];

// Fuehrt je Bild die Rohwerte beider Augen in Grad zusammen. Die Modelle gelten auch dann,
// wenn die Kalibrierung nicht bestanden hat; das Ergebnis traegt das als Kennzeichen.
export function toSeries(samples, models) {
  const degrees = (side, sample) => (sample[side] && models[side]
    ? toDegrees(models[side], sample[side].x, sample[side].y) : null);
  const series = { rechts: [], links: [], mittel: [] };
  for (const sample of samples) {
    const right = degrees("rechts", sample);
    const left = degrees("links", sample);
    if (right) series.rechts.push({ time: sample.time, ...right });
    if (left) series.links.push({ time: sample.time, ...left });
    const both = [right, left].filter(Boolean);
    if (both.length) {
      series.mittel.push({
        time: sample.time,
        h: both.reduce((sum, value) => sum + value.h, 0) / both.length,
        v: both.reduce((sum, value) => sum + value.v, 0) / both.length,
      });
    }
  }
  return series;
}

function slopePerSecond(points, key) {
  const first = points[0].time;
  const fit = fitPlane(points.map((p) => ({ x: (p.time - first) / 1000, y: ((p.time - first) / 1000) ** 2, value: p[key] })), "value");
  return fit ? fit[1] : null;
}

export function analyseFixation(points, frameCount) {
  if (points.length < MIN_POINTS) return null;
  const centerH = median(points.map((p) => p.h));
  const centerV = median(points.map((p) => p.v));
  const deviations = points.map((p) => Math.hypot(p.h - centerH, p.v - centerV)).sort((a, b) => a - b);
  return {
    validShare: frameCount ? points.length / frameCount : 0,
    sdH: spread(points.map((p) => p.h)),
    sdV: spread(points.map((p) => p.v)),
    p95: deviations[Math.floor(deviations.length * 0.95)],
    driftH: slopePerSecond(points, "h"),
  };
}

// Rauschschaetzung unabhaengig von echter Bewegung: beide Augen bewegen sich gleich,
// also stammt die Differenz aus der Messung. Sie gilt nur fuer unabhaengige Fehler.
export function differenceNoise(series) {
  const left = new Map(series.links.map((p) => [p.time, p]));
  const pairs = series.rechts.filter((p) => left.has(p.time)).map((p) => [p, left.get(p.time)]);
  if (pairs.length < MIN_POINTS) return null;
  return {
    h: spread(pairs.map(([r, l]) => r.h - l.h)) / Math.SQRT2,
    v: spread(pairs.map(([r, l]) => r.v - l.v)) / Math.SQRT2,
    offsetH: median(pairs.map(([r, l]) => r.h - l.h)),
  };
}

export function analyseTargets(windows, points) {
  const errors = [];
  for (const window of windows) {
    const inside = points.filter((p) => p.time >= window.from && p.time < window.to);
    if (inside.length < MIN_POINTS) continue;
    errors.push({
      name: window.target.name,
      h: median(inside.map((p) => p.h)) - window.target.h,
      v: median(inside.map((p) => p.v)) - window.target.v,
    });
  }
  if (!errors.length) return null;
  const rms = (values) => Math.sqrt(values.reduce((sum, value) => sum + value * value, 0) / values.length);
  return {
    targets: errors.length,
    errorH: rms(errors.map((e) => e.h)),
    errorV: rms(errors.map((e) => e.v)),
    maxError: Math.max(...errors.map((e) => Math.hypot(e.h, e.v))),
    worst: errors.reduce((a, b) => (Math.hypot(a.h, a.v) >= Math.hypot(b.h, b.v) ? a : b)).name,
  };
}

// Sinus bekannter Frequenz angepasst; so stoeren Luecken und Aufholsakkaden wenig.
export function analysePursuit(points, run, startTime) {
  const omega = (2 * Math.PI * run.frequency) / 1000;
  const inside = points.filter((p) => p.time >= startTime && p.time <= startTime + run.durationMs);
  if (inside.length < MIN_POINTS * 3) return null;
  const rows = inside.map((p) => {
    const phase = omega * (p.time - startTime);
    return { x: Math.sin(phase), y: Math.cos(phase), value: p.h };
  });
  const fit = fitPlane(rows, "value");
  if (!fit) return null;
  const [offset, sine, cosine] = fit;
  const residual = spread(rows.map((row) => row.value - (offset + sine * row.x + cosine * row.y)));
  let catchUps = 0;
  let inJump = false;
  for (let i = 1; i < inside.length; i += 1) {
    const dt = (inside[i].time - inside[i - 1].time) / 1000;
    const fast = dt > 0 && dt < 0.1
      && Math.abs((inside[i].h - inside[i - 1].h) / dt) > CATCHUP_VELOCITY;
    if (fast && !inJump) catchUps += 1;
    inJump = fast;
  }
  return {
    gain: Math.hypot(sine, cosine) / run.amplitude,
    lagMs: (-Math.atan2(cosine, sine) / omega),
    residual,
    catchUpsPerCycle: catchUps / ((run.durationMs / 1000) * run.frequency),
  };
}

export function analyseSaccades(points, jumps) {
  const results = [];
  jumps.forEach((jump, index) => {
    const key = jump.axis;
    const end = jumps[index + 1]?.at ?? jump.at + SACCADE_MAX_MS;
    const before = points.filter((p) => p.time >= jump.at - SACCADE_BASELINE_MS && p.time < jump.at);
    const after = points.filter((p) => p.time >= jump.at + SACCADE_SETTLE_MS && p.time < end);
    if (before.length < 3 || after.length < 3) return;
    const start = median(before.map((p) => p[key]));
    const landed = median(after.map((p) => p[key]));
    const step = jump.to - jump.from;
    const direction = Math.sign(step);
    const moving = points.filter((p) => p.time >= jump.at && p.time <= jump.at + SACCADE_LATEST_MS);
    let latency = null;
    for (let i = 1; i < moving.length; i += 1) {
      const dt = (moving[i].time - moving[i - 1].time) / 1000;
      if (dt <= 0 || dt > 0.1) continue;
      const velocity = ((moving[i][key] - moving[i - 1][key]) / dt) * direction;
      if (velocity > SACCADE_VELOCITY && moving[i - 1].time - jump.at >= SACCADE_EARLIEST_MS) {
        latency = moving[i - 1].time - jump.at;
        break;
      }
    }
    results.push({ axis: key, gain: (landed - start) / step, latency });
  });
  const summary = (axis) => {
    const list = results.filter((result) => result.axis === axis);
    if (!list.length) return null;
    const latencies = list.map((r) => r.latency).filter((value) => value !== null);
    return {
      count: list.length,
      gain: median(list.map((r) => r.gain)),
      gainSpread: spread(list.map((r) => r.gain)),
      latency: latencies.length ? median(latencies) : null,
      detected: latencies.length,
    };
  };
  return { h: summary("h"), v: summary("v") };
}

function band(value, good, fair) {
  if (value === null || value === undefined) return "nicht auswertbar";
  if (value <= good) return "gut";
  return value <= fair ? "mittel" : "schwach";
}

function around(value, target, good, fair) {
  return band(value === null || value === undefined ? value : Math.abs(value - target), good, fair);
}

// Experimentelle Einordnung des Werkzeugs, keine Bewertung der Testperson.
export function grade(report) {
  const fixation = report.fixation?.mittel;
  const accuracy = report.accuracy?.mittel;
  const slow = report.pursuit?.langsam?.mittel;
  const fast = report.pursuit?.schnell?.mittel;
  const saccades = report.saccades?.mittel;
  const rows = [
    ["Gültige Bilder", band(fixation ? 1 - fixation.validShare : null, 0.1, 0.25)],
    ["Ruhe horizontal", band(fixation?.sdH, 0.5, 1)],
    ["Ruhe vertikal", band(fixation?.sdV, 0.8, 1.5)],
    ["Genauigkeit horizontal", band(accuracy?.errorH, 1.5, 3)],
    ["Genauigkeit vertikal", band(accuracy?.errorV, 2, 4)],
    ["Blickfolge langsam", around(slow?.gain, 0.95, 0.15, 0.3)],
    ["Blickfolge schnell", around(fast?.gain, 0.9, 0.2, 0.35)],
    ["Sakkaden horizontal", around(saccades?.h?.gain, 0.95, 0.12, 0.25)],
    ["Sakkaden vertikal", around(saccades?.v?.gain, 0.95, 0.2, 0.35)],
  ].map(([name, level]) => ({ name, level }));
  const levels = rows.map((row) => row.level);
  let overall = "gut";
  if (levels.includes("nicht auswertbar") || levels.includes("schwach")) overall = "schwach";
  else if (levels.includes("mittel")) overall = "mittel";
  return { rows, overall };
}

export function analyseRun(run, models, calibrationPassed) {
  const perChannel = (fn) => {
    const result = {};
    for (const channel of CHANNELS) result[channel] = fn(channel);
    return result;
  };
  const seriesOf = (samples) => toSeries(samples, models);
  const fixationSeries = seriesOf(run.fixation.samples);
  const accuracySeries = seriesOf(run.accuracy.samples);
  const saccadeSeries = seriesOf(run.saccades.samples);
  const pursuitSeries = run.pursuit.map((entry) => seriesOf(entry.samples));
  const pursuit = {};
  run.pursuit.forEach((entry, index) => {
    pursuit[entry.run.name] = perChannel((channel) =>
      analysePursuit(pursuitSeries[index][channel], entry.run, entry.startTime));
  });
  const report = {
    calibrationPassed,
    fixation: perChannel((c) => analyseFixation(fixationSeries[c], run.fixation.samples.length)),
    differenceNoise: differenceNoise(fixationSeries),
    accuracy: perChannel((c) => analyseTargets(run.accuracy.windows, accuracySeries[c])),
    pursuit,
    saccades: perChannel((c) => analyseSaccades(saccadeSeries[c], run.saccades.jumps)),
  };
  report.grade = grade(report);
  return report;
}
