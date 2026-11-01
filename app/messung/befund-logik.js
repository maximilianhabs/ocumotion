// Strukturierte Befundlogik: Ereignisse erkennen und gegen benannte Grenzen einordnen.
// Reine Rechenlogik ohne Browserbezug.
//
// Forschungsprototyp. Die Einordnung beschreibt Messwerte gegen vorläufige Grenzen und ersetzt
// keine ärztliche Beurteilung. Herkunft jeder Grenze steht in LIMITS; Arbeitsgrenzen sind unbelegt.

import { fitPlane, median } from "./kalibrierung-logik.js";

export const STATUS = {
  normal: "innerhalb",
  border: "Grenzbereich",
  abnormal: "außerhalb",
  unknown: "nicht beurteilbar",
};

export const LIMITS = {
  nystagmus: {
    minBeats: 3, minShare: 0.8, minRate: 0.3, spvNormal: 2, spvAbnormal: 4,
    source: "Arbeitsgrenze; 2–4 °/s als Auffälligkeitsschwelle der langsamen Phase, keine Norm dieses Geräts",
  },
  swj: {
    minAmplitude: 1, minPauseMs: 100, maxPauseMs: 500, normalPerMin: 9, abnormalPerMin: 10,
    source: "Bei Sprüngen über 1°: Kontrollen 2,3 ± 2,4 je Minute, über 10 je Minute auffällig (Rascol 1991); über 9 je Minute bei Jüngeren (Herishanu 1981). Bei Älteren häufiger",
  },
  pursuit: {
    gainNormal: 0.7, gainAbnormal: 0.5, saccadesNormal: 4, saccadesAbnormal: 7, minSaccade: 2,
    source: "Arbeitsgrenze; junge Gesunde um 0,92 bei 0,3 Hz, altersabhängig, kein belegter Grenzwert für Sakkadierung",
  },
  saccade: {
    normalLow: 0.75, normalHigh: 1.25, borderLow: 0.6, borderHigh: 1.4, minTrials: 3,
    source: "Arbeitsgrenze; kein belegter Grenzwert gefunden, leichte Hypometrie ist auch bei Gesunden üblich",
  },
};

// Kleinste Rucke, die wir vom Rauschen trennen. Vertikal ist die Messung schwächer.
export const MIN_JUMP = { h: 1.5, v: 3 };
const JUMP_WINDOW_MS = 100;
const MIN_SPAN_MS = 2000;
const LID_MARGIN_MS = 200;

const clean = (points, key) => points.filter((point) => point[key] !== null && point[key] !== undefined);

// Sprünge: Änderung über ein kurzes Zeitfenster, je Ereignis nur die stärkste Stelle.
export function detectJumps(allPoints, key, minAmplitude = MIN_JUMP[key]) {
  const points = clean(allPoints, key);
  const candidates = [];
  let end = 0;
  for (let start = 0; start < points.length; start += 1) {
    while (end < points.length - 1 && points[end + 1].time - points[start].time <= JUMP_WINDOW_MS) end += 1;
    if (end === start) continue;
    const change = points[end][key] - points[start][key];
    if (Math.abs(change) >= minAmplitude) candidates.push({ time: points[start].time, change });
  }
  const jumps = [];
  for (const candidate of candidates) {
    const last = jumps.at(-1);
    const sameEvent = last && candidate.time - last.time <= JUMP_WINDOW_MS && Math.sign(candidate.change) === Math.sign(last.change);
    if (!sameEvent) jumps.push({ ...candidate });
    else if (Math.abs(candidate.change) > Math.abs(last.change)) last.change = candidate.change;
  }
  return jumps;
}

// Echte Sprünge treffen beide Augen gleichzeitig; das Rauschen der Augen ist voneinander unabhängig.
export function inBothEyes(jump, key, eyes) {
  return ["rechts", "links"].every((side) => {
    const series = eyes?.[side];
    if (!series?.length) return false;
    const usable = clean(series, key);
    const change = (from) => {
      const inside = usable.filter((p) => p.time >= from && p.time <= from + JUMP_WINDOW_MS);
      return inside.length >= 2 ? inside.at(-1)[key] - inside[0][key] : 0;
    };
    // Gleiche Fensterlänge wie die Erkennung, sonst hebt die langsame Phase den Ruck auf.
    return [-66, -33, 0, 33, 66].some((offset) => {
      const moved = change(jump.time + offset);
      return Math.sign(moved) === Math.sign(jump.change) && Math.abs(moved) >= Math.abs(jump.change) / 2;
    });
  });
}

export function slopeBetween(points, key, from, to) {
  const inside = clean(points, key).filter((p) => p.time >= from && p.time <= to);
  if (inside.length < 4) return null;
  const meanTime = inside.reduce((sum, p) => sum + p.time, 0) / inside.length;
  const meanValue = inside.reduce((sum, p) => sum + p[key], 0) / inside.length;
  const denominator = inside.reduce((sum, p) => sum + (p.time - meanTime) ** 2, 0);
  if (denominator === 0) return null;
  const slope = inside.reduce((sum, p) => sum + (p.time - meanTime) * (p[key] - meanValue), 0) / denominator;
  return slope * 1000;
}

// Rucknystagmus: wiederholte schnelle Phasen einer Richtung mit langsamer Gegenbewegung dazwischen.
export function analyseNystagmus(points, key, eyes = null) {
  const usable = clean(points, key);
  if (usable.length < 2 || usable.at(-1).time - usable[0].time < MIN_SPAN_MS) return null;
  const seconds = (usable.at(-1).time - usable[0].time) / 1000;
  const allJumps = detectJumps(usable, key);
  const jumps = eyes ? allJumps.filter((jump) => inBothEyes(jump, key, eyes)) : allJumps;
  const positive = jumps.filter((jump) => jump.change > 0).length;
  const negative = jumps.length - positive;
  const dominant = positive >= negative ? 1 : -1;
  const beats = jumps.filter((jump) => Math.sign(jump.change) === dominant);
  const slopes = [];
  for (let i = 1; i < beats.length; i += 1) {
    const slope = slopeBetween(usable, key, beats[i - 1].time + JUMP_WINDOW_MS, beats[i].time - 30);
    if (slope !== null) slopes.push(slope);
  }
  const slowPhase = slopes.length ? median(slopes) : null;
  const opposite = slowPhase !== null && Math.sign(slowPhase) === -dominant;
  const share = jumps.length ? beats.length / jumps.length : 0;
  const rate = beats.length / seconds;
  const { minBeats, minShare, minRate } = LIMITS.nystagmus;
  const pattern = beats.length >= minBeats && share >= minShare && rate >= minRate && opposite;
  return {
    present: pattern,
    direction: dominant,
    beats: beats.length,
    rate,
    slowPhase: slowPhase === null ? null : Math.abs(slowPhase),
    seconds,
    detectionLimit: MIN_JUMP[key],
  };
}

// Square-Wave-Jerk-Kandidat: Sprung vom Ziel weg, kurze Pause, ähnlich großer Sprung zurück.
export function analyseSwj(points, eyes = null) {
  const usable = clean(points, "h");
  if (usable.length < 2 || usable.at(-1).time - usable[0].time < MIN_SPAN_MS) return null;
  const { minAmplitude, minPauseMs, maxPauseMs } = LIMITS.swj;
  const allJumps = detectJumps(usable, "h", minAmplitude);
  const jumps = eyes ? allJumps.filter((jump) => inBothEyes(jump, "h", eyes)) : allJumps;
  const events = [];
  for (let i = 1; i < jumps.length; i += 1) {
    const [first, second] = [jumps[i - 1], jumps[i]];
    const pause = second.time - first.time;
    const size = Math.abs(second.change / first.change);
    if (Math.sign(first.change) !== Math.sign(second.change) && pause >= minPauseMs && pause <= maxPauseMs
        && size >= 0.5 && size <= 1.5) {
      events.push({ time: first.time, amplitude: Math.abs(first.change), pause });
      i += 1;
    }
  }
  const minutes = (usable.at(-1).time - usable[0].time) / 60000;
  return { count: events.length, perMinute: events.length / minutes, seconds: minutes * 60, events };
}

// Glatte Folge: Sakkaden stecken in der Abweichung vom angepassten Sinus, nicht in der Spur selbst,
// denn schon die Folgebewegung legt in 100 ms mehr als die Sprungschwelle zurück.
export function analyseSmoothPursuit(points, run, startTime, eyes = null) {
  const usable = clean(points, "h").filter((p) => p.time >= startTime + 1000 && p.time <= startTime + run.durationMs);
  if (usable.length < 30) return null;
  const omega = (2 * Math.PI * run.frequency) / 1000;
  const fit = fitPlane(usable.map((p) => ({
    x: Math.sin(omega * (p.time - startTime)), y: Math.cos(omega * (p.time - startTime)), value: p.h,
  })), "value");
  if (!fit) return null;
  const [offset, sine, cosine] = fit;
  const lag = -Math.atan2(cosine, sine) / omega;
  const expected = (time) => offset + sine * Math.sin(omega * (time - startTime)) + cosine * Math.cos(omega * (time - startTime));
  const residual = usable.map((p) => ({ time: p.time, h: p.h - expected(p.time) }));
  const residualEyes = eyes ? {
    rechts: clean(eyes.rechts ?? [], "h").map((p) => ({ time: p.time, h: p.h - expected(p.time) })),
    links: clean(eyes.links ?? [], "h").map((p) => ({ time: p.time, h: p.h - expected(p.time) })),
  } : null;
  const allJumps = detectJumps(residual, "h", LIMITS.pursuit.minSaccade);
  const jumps = residualEyes ? allJumps.filter((jump) => inBothEyes(jump, "h", residualEyes)) : allJumps;
  const nearJump = (time) => jumps.some((jump) => time >= jump.time - 50 && time <= jump.time + JUMP_WINDOW_MS + 50);
  const windowMs = 300;
  const peakSpeed = run.amplitude * omega * 1000;
  const ratios = [];
  for (let time = usable[0].time; time + windowMs <= usable.at(-1).time; time += windowMs / 2) {
    const center = time + windowMs / 2;
    const targetSpeed = peakSpeed * Math.cos(omega * (center - lag - startTime));
    if (Math.abs(targetSpeed) < 0.6 * peakSpeed || nearJump(time) || nearJump(time + windowMs)) continue;
    const eyeSpeed = slopeBetween(usable, "h", time, time + windowMs);
    if (eyeSpeed !== null) ratios.push(eyeSpeed / targetSpeed);
  }
  const cycles = ((usable.at(-1).time - usable[0].time) / 1000) * run.frequency;
  return {
    smoothGain: ratios.length >= 3 ? median(ratios) : null,
    windows: ratios.length,
    saccadesPerCycle: cycles > 0 ? jumps.length / cycles : null,
    saccades: jumps.length,
    lagMs: lag,
  };
}

// Erste Landung und Endlage je Sprung, nach Richtung getrennt.
export function analyseSaccadeMetrics(points, jumps) {
  const trials = [];
  jumps.forEach((jump, index) => {
    const key = jump.axis;
    const axisPoints = clean(points, key);
    const end = jumps[index + 1]?.at ?? jump.at + 1800;
    const before = axisPoints.filter((p) => p.time >= jump.at - 300 && p.time < jump.at).map((p) => p[key]);
    const after = axisPoints.filter((p) => p.time >= jump.at + 600 && p.time < end).map((p) => p[key]);
    if (before.length < 3 || after.length < 3) return;
    const start = median(before);
    const step = jump.to - jump.from;
    const moved = axisPoints.filter((p) => p.time >= jump.at + 80 && p.time <= jump.at + 800);
    const onset = moved.find((p) => (p[key] - start) * Math.sign(step) >= 0.25 * Math.abs(step));
    if (!onset) {
      trials.push({ direction: directionOf(jump), firstGain: null, endGain: (median(after) - start) / step, onsetMs: null });
      return;
    }
    const landing = axisPoints.filter((p) => p.time >= onset.time + 80 && p.time <= onset.time + 200).map((p) => p[key]);
    trials.push({
      direction: directionOf(jump),
      firstGain: landing.length ? (median(landing) - start) / step : null,
      endGain: (median(after) - start) / step,
      onsetMs: onset.time - jump.at,
    });
  });
  const groups = {};
  for (const trial of trials) (groups[trial.direction] ??= []).push(trial);
  const summary = {};
  for (const [direction, list] of Object.entries(groups)) {
    const first = list.map((t) => t.firstGain).filter((value) => value !== null);
    summary[direction] = {
      trials: list.length,
      firstGain: first.length ? median(first) : null,
      endGain: median(list.map((t) => t.endGain)),
    };
  }
  return summary;
}

function directionOf(jump) {
  const change = jump.to - jump.from;
  if (jump.axis === "h") return change > 0 ? "rechts" : "links";
  return change > 0 ? "oben" : "unten";
}

// Bilder rund um Lidsenkungen entfernen; ohne Lidwerte bleibt alles erhalten.
export function withoutLidEvents(points, lidSpans) {
  if (!lidSpans?.length) return points;
  return points.filter((point) => !lidSpans.some((span) =>
    point.time >= span.from - LID_MARGIN_MS && point.time <= span.to + LID_MARGIN_MS));
}

const NAMES = { h: { 1: "rechtsschlagend", "-1": "linksschlagend" }, v: { 1: "Upbeat", "-1": "Downbeat" } };

export function judgeNystagmus(result, key, released) {
  if (!released || !result) {
    return { status: STATUS.unknown, text: released ? "Zu wenig gültige Daten." : "Achse nicht freigegeben." };
  }
  const limit = `Nachweisgrenze rund ${String(result.detectionLimit).replace(".", ",")}° je Ruck`;
  if (!result.present) return { status: STATUS.normal, text: `Nein, kein wiederholtes Ruckmuster. ${limit}.` };
  const { spvNormal, spvAbnormal } = LIMITS.nystagmus;
  const speed = result.slowPhase;
  const words = `${NAMES[key][result.direction]}: ${result.beats} Schläge, ${result.rate.toFixed(1).replace(".", ",")}/s, langsame Phase ${speed.toFixed(1).replace(".", ",")} °/s`;
  if (speed < spvNormal) return { status: STATUS.border, text: `Schwaches Ruckmuster. ${words}.` };
  return { status: speed >= spvAbnormal ? STATUS.abnormal : STATUS.border, text: `Ruckmuster. ${words}.` };
}

export function judgeSwj(result, released) {
  if (!released || !result) return { status: STATUS.unknown, text: "Nicht beurteilbar." };
  const rate = result.perMinute.toFixed(1).replace(".", ",");
  const text = `${result.count} Kandidaten in ${Math.round(result.seconds)} s, entspricht ${rate} je Minute. Über ${LIMITS.swj.minAmplitude}° erfasst; kleinere sind nicht sichtbar.`;
  if (result.seconds < 15) return { status: STATUS.unknown, text: `${text} Beobachtung zu kurz.` };
  if (result.perMinute > LIMITS.swj.abnormalPerMin) return { status: STATUS.abnormal, text };
  return { status: result.perMinute >= LIMITS.swj.normalPerMin ? STATUS.border : STATUS.normal, text };
}

export function judgePursuit(result, released) {
  if (!released || !result || result.smoothGain === null) return { status: STATUS.unknown, text: "Nicht beurteilbar." };
  const { gainNormal, gainAbnormal, saccadesNormal, saccadesAbnormal } = LIMITS.pursuit;
  const gain = result.smoothGain;
  const saccades = result.saccadesPerCycle;
  const quality = saccades <= saccadesNormal ? "glatt" : "sakkadiert";
  const text = `${quality}: Folge-Gain ${gain.toFixed(2).replace(".", ",")}, ${saccades.toFixed(1).replace(".", ",")} Sakkaden je Zyklus.`;
  if (gain < gainAbnormal || saccades > saccadesAbnormal) return { status: STATUS.abnormal, text };
  return { status: gain < gainNormal || saccades > saccadesNormal ? STATUS.border : STATUS.normal, text };
}

// uncertain: Die Achse ist schwach gemessen. Dann gibt es Werte, aber höchstens eine Tendenz.
export function judgeSaccades(direction, summary, released, { uncertain = false } = {}) {
  if (!released || !summary) return { status: STATUS.unknown, text: `${direction}: nicht beurteilbar.` };
  const { normalLow, normalHigh, borderLow, borderHigh, minTrials } = LIMITS.saccade;
  const gain = summary.firstGain ?? summary.endGain;
  const figures = `erste Landung ${summary.firstGain === null ? "–" : summary.firstGain.toFixed(2).replace(".", ",")}, Endlage ${summary.endGain.toFixed(2).replace(".", ",")}, ${summary.trials} Versuche`;
  if (summary.trials < minTrials) return { status: STATUS.unknown, text: `${direction}: zu wenige Versuche, ${figures}.` };
  let word = "metrisch";
  if (gain < normalLow) word = "hypometrisch";
  if (gain > normalHigh) word = "hypermetrisch";
  let status = STATUS.normal;
  if (word !== "metrisch") status = !uncertain && (gain < borderLow || gain > borderHigh) ? STATUS.abnormal : STATUS.border;
  return { status, text: `${direction}: ${word}, ${figures}${uncertain ? ", vertikal unsicher" : ""}.` };
}
