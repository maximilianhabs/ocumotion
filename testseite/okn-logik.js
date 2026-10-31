// Optokinetischer Test H40 mit Kontrollblock. Reine Rechenlogik ohne Browserbezug.
//
// Die Schlagerkennung kennt die Reizrichtung nicht; verglichen wird erst danach. Reizgeschwindigkeit
// ist nicht Augengeschwindigkeit, Gain 1 ist keine Norm, und kein Ergebnis bedeutet normal oder krank.

import { detectJumps, inBothEyes, MIN_JUMP, slopeBetween } from "./befund-logik.js";
import { hasEnoughData, median, spread } from "./kalibrierung-logik.js";

export const OKN_SPEED = 8;
export const MIN_PERIOD_DEG = 5;
export const MAX_STRIPE_PAIRS = 7.5;

export const OKN_BLOCKS = [
  { id: "basis", label: "Ausgangslage", kind: "base", direction: 0, durationMs: 5000 },
  { id: "rechts", label: "Muster nach rechts", kind: "moving", direction: 1, durationMs: 12000 },
  { id: "pause", label: "Pause", kind: "grey", direction: 0, durationMs: 6000 },
  { id: "links", label: "Muster nach links", kind: "moving", direction: -1, durationMs: 12000 },
  { id: "erholung", label: "Erholung", kind: "grey", direction: 0, durationMs: 5000 },
  { id: "kontrolle", label: "Kontrolle mit Fixationspunkt", kind: "control", direction: 1, durationMs: 8000 },
];

export const OKN_STATE = {
  conform: "reizkonforme Sägezahnantwort",
  uncertain: "Bewegung sichtbar, Phasen unsicher",
  none: "keine eindeutige Antwort",
  invalid: "technisch nicht auswertbar",
};

const TRIM_MS = 1000;
const MIN_BEATS = 3;
const MIN_SHARE = 0.7;
const MIN_PHASE_MS = 130;
const MIN_QUANT_PHASES = 5;
const CONTROL_SUSPICION = 0.7;

export function stripePeriod(fieldDeg) {
  return Math.max(MIN_PERIOD_DEG, fieldDeg / MAX_STRIPE_PAIRS);
}

export function fieldDegrees(screenWidthCm, distanceCm) {
  return 2 * Math.atan(screenWidthCm / 2 / distanceCm) * (180 / Math.PI);
}

// Streifen im Winkelraum: die Bewegung ist in Grad gleichförmig, nicht in Bildpunkten.
export function stripeOn(thetaDeg, seconds, direction, periodDeg, speed = OKN_SPEED) {
  const phase = (thetaDeg - direction * speed * seconds) / periodDeg;
  return phase - Math.floor(phase) < 0.5;
}

const clean = (points) => points.filter((point) => point.h !== null && point.h !== undefined);

function trimmed(points, from, to) {
  return clean(points).filter((point) => point.time >= from + TRIM_MS && point.time <= to - TRIM_MS);
}

// Schläge ohne Kenntnis der Reizrichtung bestimmen, die langsamen Phasen auf Rohwerten vermessen.
export function analyseBlock(series, rawMean, block, expectedFrames) {
  const points = trimmed(series.mittel, block.from, block.to);
  const raw = trimmed(rawMean, block.from, block.to);
  const coverage = expectedFrames ? clean(series.mittel).length / expectedFrames : 0;
  if (!hasEnoughData(points, "time", 3000)) {
    return { state: OKN_STATE.invalid, beats: 0, phases: 0, coverage, spv: null, gain: null };
  }
  const eyes = { rechts: series.rechts, links: series.links };
  const jumps = detectJumps(points, "h").filter((jump) => inBothEyes(jump, "h", eyes));
  const positive = jumps.filter((jump) => jump.change > 0).length;
  const negative = jumps.length - positive;
  const beatDirection = positive >= negative ? 1 : -1;
  const beats = jumps.filter((jump) => Math.sign(jump.change) === beatDirection);
  const share = jumps.length ? beats.length / jumps.length : 0;
  const slopes = [];
  for (let i = 1; i < beats.length; i += 1) {
    const from = beats[i - 1].time + 100;
    const to = beats[i].time - 30;
    if (to - from < MIN_PHASE_MS) continue;
    const slope = slopeBetween(raw, "h", from, to);
    if (slope !== null) slopes.push(slope);
  }
  const speed = slopes.length ? Math.abs(median(slopes)) : null;
  const slowSign = slopes.length ? Math.sign(median(slopes)) : 0;
  const seconds = (points.at(-1).time - points[0].time) / 1000;
  const pattern = beats.length >= MIN_BEATS && share >= MIN_SHARE && slowSign === -beatDirection;
  const matchesStimulus = pattern && beatDirection === -block.direction && slowSign === block.direction;
  let state = OKN_STATE.none;
  if (matchesStimulus) state = OKN_STATE.conform;
  else if (pattern || jumps.length >= MIN_BEATS) state = OKN_STATE.uncertain;
  return {
    state,
    beats: beats.length,
    beatDirection,
    rate: beats.length / seconds,
    share,
    phases: slopes.length,
    slopes,
    spv: speed,
    spvSpread: slopes.length >= 2 ? spread(slopes.map(Math.abs)) : null,
    gain: speed !== null ? speed / OKN_SPEED : null,
    quantifiable: slopes.length >= MIN_QUANT_PHASES,
    coverage,
    minJump: MIN_JUMP.h,
  };
}

// Bleibt der Sägezahn trotz Fixationspunkt fast gleich stark, ist ein Messartefakt verdächtig.
export function controlVerdict(moving, control) {
  const free = moving.filter((block) => block.state === OKN_STATE.conform);
  if (!free.length) return { suspicious: false, text: "Kein Vergleich möglich, ohne freie Antwort." };
  if (control.state === OKN_STATE.invalid) return { suspicious: false, text: "Kontrolle nicht auswertbar." };
  const freeRate = median(free.map((block) => block.rate));
  const ratio = (control.rate ?? 0) / freeRate;
  const suspicious = control.state === OKN_STATE.conform && ratio >= CONTROL_SUSPICION;
  const percent = Math.round(ratio * 100);
  return {
    suspicious,
    ratio,
    text: suspicious
      ? `Verdacht auf Messartefakt: Der Sägezahn bleibt bei Fixation mit ${percent} % der Schlagrate bestehen.`
      : `Bei Fixation sinkt die Schlagrate auf ${percent} %, das spricht gegen ein Reflexartefakt.`,
  };
}

// Die vier Ergebnisse auf die Berichtsfarben: Ausbleiben bedeutet nicht krank.
export function oknStatus(state) {
  if (state === OKN_STATE.conform) return "unauffällig";
  return state === OKN_STATE.uncertain ? "grenzwertig" : "nicht beurteilbar";
}

export function directionWord(sign) {
  return sign > 0 ? "rechts" : "links";
}
