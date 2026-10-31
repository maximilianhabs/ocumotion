// Positionierungshilfe: Lage des Gesichts im Bild, Hinweise und persoenliche Referenz.
// Reine Rechenlogik ohne Browserbezug. Sie schaetzt keinen Abstand aus einer Durchschnittsgroesse;
// der Abstand wird von Hand gemessen und dient als Bezug fuer relative Aenderungen.
// Alle Schwellen sind experimentell.

import { EYES } from "./augen-logik.js";
import { median } from "./kalibrierung-logik.js";

export const ROUGH_TARGET = { x: 0.5, y: 0.42, span: 0.18, spanDistanceCm: 40 };
const ROUGH_TOLERANCE = { x: 0.08, y: 0.14, size: 0.3 };
const PERSONAL_TOLERANCE = { x: 0.06, y: 0.06, size: 0.1 };
const MAX_ROLL = 6;
const MAX_YAW = 0.18;
const KEEP_FACTOR = 1.4;
const MAX_FEATURE_CONFLICT = 0.1;
const MAX_STABLE_SPREAD = 0.06;
const MIN_STABLE_POSES = 20;
// Bis "vermerkt" laeuft die Messung normal; dazwischen wird sie gekennzeichnet, darueber abgebrochen.
export const MARK_DISTANCE_CHANGE = 0.15;
export const MARK_HEAD_SHIFT = 2;
export const STOP_DISTANCE_CHANGE = 0.25;
export const STOP_HEAD_SHIFT = 4;

const toPixels = (point, width, height) => ({ x: point.x * width, y: point.y * height });

// x und y beziehen sich auf das ungespiegelte Bild, 0 bis 1.
export function analysePose(points, width, height) {
  const at = (index) => toPixels(points[index], width, height);
  const rechtsAussen = at(EYES.rechts.imageLeft);
  const rechtsInnen = at(EYES.rechts.imageRight);
  const linksInnen = at(EYES.links.imageLeft);
  const linksAussen = at(EYES.links.imageRight);
  const center = {
    x: (rechtsAussen.x + rechtsInnen.x + linksInnen.x + linksAussen.x) / 4,
    y: (rechtsAussen.y + rechtsInnen.y + linksInnen.y + linksAussen.y) / 4,
  };
  const spanPx = Math.hypot(linksAussen.x - rechtsAussen.x, linksAussen.y - rechtsAussen.y);
  const rechtsBreite = Math.hypot(rechtsInnen.x - rechtsAussen.x, rechtsInnen.y - rechtsAussen.y);
  const linksBreite = Math.hypot(linksAussen.x - linksInnen.x, linksAussen.y - linksInnen.y);
  return {
    x: center.x / width,
    y: center.y / height,
    span: spanPx / width,
    roll: (Math.atan2(linksAussen.y - rechtsAussen.y, linksAussen.x - rechtsAussen.x) * 180) / Math.PI,
    yaw: linksBreite > 0 ? rechtsBreite / linksBreite - 1 : 0,
  };
}

export function medianPose(poses) {
  const take = (key) => median(poses.map((pose) => pose[key]));
  return { x: take("x"), y: take("y"), span: take("span"), roll: take("roll"), yaw: take("yaw") };
}

export function targetFor(distanceCm, reference) {
  if (reference) {
    return { x: reference.x, y: reference.y, span: reference.span, roll: reference.roll,
             yaw: reference.yaw, tolerance: PERSONAL_TOLERANCE };
  }
  return { x: ROUGH_TARGET.x, y: ROUGH_TARGET.y, span: (ROUGH_TARGET.span * ROUGH_TARGET.spanDistanceCm) / distanceCm,
           roll: 0, yaw: 0, tolerance: ROUGH_TOLERANCE };
}

// Hoechstens ein Hinweis. Wer schon passt, bekommt mehr Spielraum, damit nichts flackert.
export function assess(pose, target, wasOk = false) {
  const factor = wasOk ? KEEP_FACTOR : 1;
  const { tolerance } = target;
  if (Math.abs(pose.roll - target.roll) > MAX_ROLL * factor
      || Math.abs(pose.yaw - target.yaw) > MAX_YAW * factor) {
    return { ok: false, hint: "Kopf gerade halten" };
  }
  const sideways = pose.x - target.x;
  if (Math.abs(sideways) > tolerance.x * factor) {
    return { ok: false, hint: sideways > 0 ? "→ Etwas nach rechts" : "← Etwas nach links" };
  }
  const vertical = pose.y - target.y;
  if (Math.abs(vertical) > tolerance.y * factor) {
    return { ok: false, hint: vertical > 0 ? "↑ Augen etwas höher" : "↓ Augen etwas tiefer" };
  }
  const size = pose.span / target.span - 1;
  if (Math.abs(size) > tolerance.size * factor) {
    return { ok: false, hint: size < 0 ? "Etwas näher kommen" : "Etwas zurück" };
  }
  return { ok: true, hint: "Position passt" };
}

export function isStable(poses) {
  if (poses.length < MIN_STABLE_POSES) return false;
  const spans = poses.map((pose) => pose.span);
  const middle = median(spans);
  const spread = Math.max(...spans.map((span) => Math.abs(span / middle - 1)));
  return spread <= MAX_STABLE_SPREAD;
}

export function makeReference(poses, irisWidths, distanceCm) {
  return { ...medianPose(poses), irisPx: median(irisWidths), distanceCm };
}

// Nur eine relative Schaetzung. Widersprechen sich Iris und Augenabstand, gibt es keinen Wert.
export function estimateDistance(reference, irisPx, span) {
  if (!(irisPx > 0) || !(span > 0)) return null;
  const fromIris = reference.distanceCm * (reference.irisPx / irisPx);
  const fromSpan = reference.distanceCm * (reference.span / span);
  if (Math.abs(fromIris / fromSpan - 1) > MAX_FEATURE_CONFLICT) return null;
  return (fromIris + fromSpan) / 2;
}

export function positionDrift(samples, reference, width, height) {
  const seen = samples.filter((sample) => sample.head && sample.irisPx > 0);
  if (!seen.length) return null;
  const irisPx = median(seen.map((sample) => sample.irisPx));
  const shift = Math.hypot(
    median(seen.map((sample) => sample.head.x)) - reference.x * width,
    median(seen.map((sample) => sample.head.y)) - reference.y * height,
  );
  const distanceChange = irisPx / reference.irisPx - 1;
  const headShift = shift / irisPx;
  return {
    distanceChange,
    headShift,
    marked: Math.abs(distanceChange) > MARK_DISTANCE_CHANGE || headShift > MARK_HEAD_SHIFT,
    moved: Math.abs(distanceChange) > STOP_DISTANCE_CHANGE || headShift > STOP_HEAD_SHIFT,
  };
}

// Weiter nach der Pause: nur wenn der Kopf wieder innerhalb der Abbruchgrenze liegt.
// Ohne Gesicht oder ohne Messwerte gilt: nicht weiter.
export function canResume(samples, reference, width, height) {
  const drift = positionDrift(samples, reference, width, height);
  return drift !== null && !drift.moved;
}
