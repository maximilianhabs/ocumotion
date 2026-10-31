// Geführter Gütetest: Ablauf und Auswertung. Reine Rechenlogik ohne Browserbezug.
//
// Der Test prueft das Werkzeug. Er setzt eine unauffaellige Okulomotorik der Testperson voraus
// und bewertet keine Person. Alle Bewertungsgrenzen sind experimentell.
// Zeiten in Millisekunden auf der Uhr von performance.now().

import { fitPlane, fuse, median, medianFilter, spread, toDegrees } from "./kalibrierung-logik.js";

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

const present = (points, key) => points.filter((point) => point[key] !== null);

// Eine Reihe je Auge und die Zusammenfuehrung. Filter und fuse() sind dieselben wie live.
// Besteht keine Achse, zaehlen beide Augen gleich; der Bericht traegt das als Kennzeichen.
export function toSeries(samples, calibration, { filter = true } = {}) {
  const weights = (eye) => (calibration.passed
    ? { weightH: eye.weightH, weightV: eye.weightV }
    : { weightH: eye.model ? 1 : 0, weightV: eye.model ? 1 : 0 });
  const effective = { rechts: weights(calibration.rechts), links: weights(calibration.links) };
  const series = { rechts: [], links: [], mittel: [] };
  const eyeSeries = (side) => {
    const model = calibration[side].model;
    if (!model) return new Map();
    const points = samples.filter((sample) => sample[side])
      .map((sample) => ({ time: sample.time, ...sample[side] }));
    const used = filter ? medianFilter(points, ["x", "y"]) : points;
    return new Map(used.map((point) => [point.time, { time: point.time, ...toDegrees(model, point.x, point.y) }]));
  };
  const right = eyeSeries("rechts");
  const left = eyeSeries("links");
  series.rechts = [...right.values()];
  series.links = [...left.values()];
  for (const sample of samples) {
    const fused = fuse(right.get(sample.time), left.get(sample.time), effective);
    if (fused) series.mittel.push({ time: sample.time, h: fused.h, v: fused.v, disagree: fused.disagree });
  }
  return series;
}

// Weniger anfaellig fuer kurze Ausreisser; laengere Artefakte kann auch sie enthalten.
function robustSpread(values) {
  const center = median(values);
  return 1.4826 * median(values.map((value) => Math.abs(value - center)));
}

function slopePerSecond(allPoints, key) {
  const points = present(allPoints, key);
  if (points.length < MIN_POINTS) return null;
  const first = points[0].time;
  const fit = fitPlane(points.map((p) => ({ x: (p.time - first) / 1000, y: ((p.time - first) / 1000) ** 2, value: p[key] })), "value");
  return fit ? fit[1] : null;
}

export function analyseFixation(points, frameCount) {
  const h = present(points, "h").map((p) => p.h);
  const v = present(points, "v").map((p) => p.v);
  if (h.length < MIN_POINTS && v.length < MIN_POINTS) return null;
  const both = points.filter((p) => p.h !== null && p.v !== null);
  const centerH = h.length ? median(h) : 0;
  const centerV = v.length ? median(v) : 0;
  const deviations = both.map((p) => Math.hypot(p.h - centerH, p.v - centerV)).sort((a, b) => a - b);
  const coverageH = frameCount ? h.length / frameCount : 0;
  const coverageV = frameCount ? v.length / frameCount : 0;
  return {
    validShare: Math.min(coverageH, coverageV),
    coverageH,
    coverageV,
    sdH: h.length >= MIN_POINTS ? spread(h) : null,
    sdV: v.length >= MIN_POINTS ? spread(v) : null,
    robustSdH: h.length >= MIN_POINTS ? robustSpread(h) : null,
    robustSdV: v.length >= MIN_POINTS ? robustSpread(v) : null,
    p95: deviations.length ? deviations[Math.floor(deviations.length * 0.95)] : null,
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
    const h = present(inside, "h").map((p) => p.h);
    const v = present(inside, "v").map((p) => p.v);
    if (h.length < MIN_POINTS && v.length < MIN_POINTS) continue;
    errors.push({
      name: window.target.name,
      h: h.length >= MIN_POINTS ? median(h) - window.target.h : null,
      v: v.length >= MIN_POINTS ? median(v) - window.target.v : null,
    });
  }
  if (!errors.length) return null;
  const rms = (values) => (values.length
    ? Math.sqrt(values.reduce((sum, value) => sum + value * value, 0) / values.length) : null);
  const size = (error) => Math.hypot(error.h ?? 0, error.v ?? 0);
  return {
    targets: errors.length,
    errorH: rms(errors.map((e) => e.h).filter((value) => value !== null)),
    errorV: rms(errors.map((e) => e.v).filter((value) => value !== null)),
    maxError: Math.max(...errors.map(size)),
    worst: errors.reduce((a, b) => (size(a) >= size(b) ? a : b)).name,
  };
}

// Sinus bekannter Frequenz angepasst; so stoeren Luecken und Aufholsakkaden wenig.
export function analysePursuit(points, run, startTime) {
  const omega = (2 * Math.PI * run.frequency) / 1000;
  const inside = present(points, "h").filter((p) => p.time >= startTime && p.time <= startTime + run.durationMs);
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

export function analyseSaccades(allPoints, jumps) {
  const results = [];
  jumps.forEach((jump, index) => {
    const key = jump.axis;
    const points = present(allPoints, key);
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
    results.push({ axis: key, endGain: (landed - start) / step, latency });
  });
  const summary = (axis) => {
    const list = results.filter((result) => result.axis === axis);
    if (!list.length) return null;
    const latencies = list.map((r) => r.latency).filter((value) => value !== null);
    return {
      count: list.length,
      endGain: median(list.map((r) => r.endGain)),
      endGainSpread: spread(list.map((r) => r.endGain)),
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

const fixed = (value, digits = 1) => (value === null || value === undefined
  ? "–" : value.toFixed(digits).replace(".", ","));

// Experimentelle Einordnung des Werkzeugs, keine Bewertung der Testperson.
export function grade(report) {
  const fixation = report.fixation?.mittel;
  const accuracy = report.accuracy?.mittel;
  const slow = report.pursuit?.langsam?.mittel;
  const fast = report.pursuit?.schnell?.mittel;
  const saccades = report.saccades?.mittel;
  const rows = [
    ["Abdeckung Ruhe", band(fixation ? 1 - fixation.validShare : null, 0.1, 0.25)],
    ["Ruhe horizontal", band(fixation?.robustSdH, 0.5, 1)],
    ["Ruhe vertikal", band(fixation?.robustSdV, 0.8, 1.5)],
    ["Genauigkeit horizontal", band(accuracy?.errorH, 1.5, 3)],
    ["Genauigkeit vertikal", band(accuracy?.errorV, 2, 4)],
    ["Blickfolge langsam", around(slow?.gain, 0.95, 0.15, 0.3)],
    ["Blickfolge schnell", around(fast?.gain, 0.9, 0.2, 0.35)],
    ["Sakkaden-Endlage horizontal", around(saccades?.h?.endGain, 0.95, 0.12, 0.25)],
    ["Sakkaden-Endlage vertikal", around(saccades?.v?.endGain, 0.95, 0.2, 0.35)],
  ].map(([name, level]) => ({ name, level }));
  return { rows, summary: summarise(report) };
}

function axisUsable(report, accuracy, fixation, axis) {
  const released = axis === "h" ? report.calibration?.passedH : report.calibration?.passedV;
  const endGain = report.saccades?.mittel?.[axis]?.endGain;
  const scaleOk = endGain !== null && endGain !== undefined && Math.abs(endGain - 1) <= 0.3;
  if (axis === "h") {
    return Boolean(released) && scaleOk && accuracy?.errorH <= 3 && fixation?.robustSdH <= 1 && fixation?.coverageH >= 0.75;
  }
  return Boolean(released) && scaleOk && accuracy?.errorV <= 4 && fixation?.robustSdV <= 1.5 && fixation?.coverageV >= 0.75;
}

// Klartext statt Gesamtnote: Genauigkeit und Datenabdeckung stehen immer zusammen.
function summarise(report) {
  const fixation = report.fixation?.mittel;
  const accuracy = report.accuracy?.mittel;
  const usableH = axisUsable(report, accuracy, fixation, "h");
  const usableV = axisUsable(report, accuracy, fixation, "v");
  const percent = (value) => (value === null || value === undefined ? "–" : `${Math.round(value * 100)} %`);
  const line = (name, usable, error, spreadValue, coverage) =>
    `${name} ${usable ? "nutzbar" : "noch unzuverlässig"}: Zielfehler ${fixed(error)}°, Ruhe ${fixed(spreadValue, 2)}°, Abdeckung ${percent(coverage)}.`;
  const lines = [
    line("Horizontale Position", usableH, accuracy?.errorH, fixation?.robustSdH, fixation?.coverageH),
    line("Vertikale Position", usableV, accuracy?.errorV, fixation?.robustSdV, fixation?.coverageV),
    "Zeitliche Kennwerte sind experimentell; Latenzen enthalten die Verarbeitungszeit.",
  ];
  if (!report.calibration?.passed) lines.unshift("Kalibrierung nicht bestanden: alle Werte nur als Hinweis.");
  if (!usableV && usableH) lines.push("Nächster Schritt: vertikale Messung verbessern.");
  else if (!usableH) lines.push("Nächster Schritt: Position und Licht prüfen, dann wiederholen.");
  let headline = "Beide Achsen unzuverlässig";
  if (usableH && usableV) headline = "Beide Achsen nutzbar";
  else if (usableH) headline = "Horizontal nutzbar, vertikal unzuverlässig";
  else if (usableV) headline = "Vertikal nutzbar, horizontal unzuverlässig";
  return { headline, lines, usableH, usableV };
}

export function analyseRun(run, calibration) {
  const perChannel = (fn) => {
    const result = {};
    for (const channel of CHANNELS) result[channel] = fn(channel);
    return result;
  };
  const seriesOf = (samples) => toSeries(samples, calibration);
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
    calibration: { passed: calibration.passed, passedH: calibration.rechts.passedH || calibration.links.passedH,
                   passedV: calibration.rechts.passedV || calibration.links.passedV },
    fixation: perChannel((c) => analyseFixation(fixationSeries[c], run.fixation.samples.length)),
    differenceNoise: differenceNoise(toSeries(run.fixation.samples, calibration, { filter: false })),
    accuracy: perChannel((c) => analyseTargets(run.accuracy.windows, accuracySeries[c])),
    pursuit,
    saccades: perChannel((c) => analyseSaccades(saccadeSeries[c], run.saccades.jumps)),
  };
  report.grade = grade(report);
  return report;
}
