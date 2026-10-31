// Positionierungshilfe gegen konstruierte Gesichter. Aufruf: make test
import assert from "node:assert/strict";
import { test } from "node:test";
import { EYES } from "./augen-logik.js";
import { analysePose, assess, canResume, estimateDistance, isStable, makeReference, medianPose, positionDrift, targetFor } from "./positionierung-logik.js";

const WIDTH = 1280;
const HEIGHT = 720;
const near = (actual, expected, tolerance = 1e-6) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} statt ${expected}`);

test("fremde Kamera: Gesichtsgröße entscheidet nicht, das Bild bleibt mittig", () => {
  const pose = { x: 0.6, y: 0.6, span: 0.09, roll: 0, yaw: 0 };
  assert.equal(assess(pose, targetFor(40, null)).ok, false);
  assert.equal(assess(pose, targetFor(40, null, false)).ok, true);
  assert.equal(assess({ ...pose, x: 0.9 }, targetFor(40, null, false)).ok, false);
  assert.equal(assess({ ...pose, roll: 20 }, targetFor(40, null, false)).hint, "Kopf gerade halten");
});

function face({ x = 640, y = 302, scale = 1, tilt = 0, rightWidth = 60 } = {}) {
  const points = Array.from({ length: 478 }, () => ({ x: 0, y: 0 }));
  const set = (index, offset) => {
    points[index] = { x: (x + offset * scale) / WIDTH, y: (y + tilt * offset * scale) / HEIGHT };
  };
  set(EYES.rechts.imageLeft, -115);
  set(EYES.rechts.imageRight, -115 + rightWidth);
  set(EYES.links.imageLeft, 55);
  set(EYES.links.imageRight, 115);
  return points;
}

test("Mittiges Gesicht im Zielbereich passt", () => {
  const pose = analysePose(face(), WIDTH, HEIGHT);
  near(pose.x, 0.5);
  near(pose.span, 230 / WIDTH);
  near(pose.roll, 0);
  near(pose.yaw, 0);
  assert.deepEqual(assess(pose, targetFor(40, null)), { ok: true, hint: "Position passt" });
});

test("Seitliche Hinweise beziehen sich auf das gespiegelte Bild", () => {
  const target = targetFor(40, null);
  // Bildlinks im Rohbild erscheint im Spiegelbild rechts, die Person muss also nach links.
  assert.equal(assess(analysePose(face({ x: 400 }), WIDTH, HEIGHT), target).hint, "← Etwas nach links");
  assert.equal(assess(analysePose(face({ x: 880 }), WIDTH, HEIGHT), target).hint, "→ Etwas nach rechts");
});

test("Augenhöhe gibt einen Hinweis", () => {
  const target = targetFor(40, null);
  assert.equal(assess(analysePose(face({ y: 500 }), WIDTH, HEIGHT), target).hint, "↑ Augen etwas höher");
  assert.equal(assess(analysePose(face({ y: 100 }), WIDTH, HEIGHT), target).hint, "↓ Augen etwas tiefer");
});

test("Gesichtsgröße gibt näher oder zurück", () => {
  const target = targetFor(40, null);
  assert.equal(assess(analysePose(face({ scale: 0.6 }), WIDTH, HEIGHT), target).hint, "Etwas näher kommen");
  assert.equal(assess(analysePose(face({ scale: 1.5 }), WIDTH, HEIGHT), target).hint, "Etwas zurück");
});

test("Kopfneigung und Drehung gehen vor", () => {
  const target = targetFor(40, null);
  assert.equal(assess(analysePose(face({ tilt: 0.2, x: 400 }), WIDTH, HEIGHT), target).hint, "Kopf gerade halten");
  assert.equal(assess(analysePose(face({ rightWidth: 90 }), WIDTH, HEIGHT), target).hint, "Kopf gerade halten");
});

test("Hysterese hält einen knappen Zustand stabil", () => {
  const target = targetFor(40, null);
  const pose = analysePose(face({ x: 760 }), WIDTH, HEIGHT);
  assert.equal(assess(pose, target, false).ok, false);
  assert.equal(assess(pose, target, true).ok, true);
});

test("Persönliche Referenz ersetzt den groben Zielbereich", () => {
  const poses = Array.from({ length: 30 }, () => analysePose(face({ x: 700, y: 360 }), WIDTH, HEIGHT));
  const reference = makeReference(poses, Array(30).fill(28), 40);
  assert.equal(assess(medianPose(poses), targetFor(40, reference)).ok, true);
  const farther = analysePose(face({ x: 700, y: 360, scale: 0.85 }), WIDTH, HEIGHT);
  assert.equal(assess(farther, targetFor(40, reference)).hint, "Etwas näher kommen");
});

test("Stabil heißt genug Bilder mit gleicher Größe", () => {
  const steady = Array.from({ length: 30 }, () => analysePose(face(), WIDTH, HEIGHT));
  assert.equal(isStable(steady), true);
  assert.equal(isStable(steady.slice(0, 5)), false);
  const moving = steady.map((pose, i) => ({ ...pose, span: pose.span * (1 + i * 0.01) }));
  assert.equal(isStable(moving), false);
});

test("Abstand folgt der Irisbreite relativ zur Referenz", () => {
  const reference = { distanceCm: 40, irisPx: 30, span: 0.2 };
  near(estimateDistance(reference, 30, 0.2), 40);
  near(estimateDistance(reference, 37.5, 0.25), 32);
});

test("Widersprüchliche Merkmale ergeben keinen Abstand", () => {
  const reference = { distanceCm: 40, irisPx: 30, span: 0.2 };
  assert.equal(estimateDistance(reference, 30, 0.25), null);
  assert.equal(estimateDistance(reference, 0, 0.2), null);
});

test("Bewegung gegenüber der Referenz wird erkannt", () => {
  const reference = { x: 0.5, y: 0.4, irisPx: 30 };
  const slight = Array(10).fill({ irisPx: 32.5, head: { x: 660, y: 289 } });
  const small = positionDrift(slight, reference, WIDTH, HEIGHT);
  assert.equal(small.marked, false);
  assert.equal(small.moved, false);
  const closer = Array(10).fill({ irisPx: 36, head: { x: 640, y: 288 } });
  const medium = positionDrift(closer, reference, WIDTH, HEIGHT);
  assert.equal(medium.marked, true);
  assert.equal(medium.moved, false);
  const shifted = Array(10).fill({ irisPx: 30, head: { x: 800, y: 288 } });
  assert.equal(positionDrift(shifted, reference, WIDTH, HEIGHT).moved, true);
  const muchCloser = Array(10).fill({ irisPx: 39, head: { x: 640, y: 288 } });
  assert.equal(positionDrift(muchCloser, reference, WIDTH, HEIGHT).moved, true);
  assert.equal(positionDrift([{ irisPx: null, head: null }], reference, WIDTH, HEIGHT), null);
});

test("Weiter nach der Pause nur, wenn der Kopf innerhalb der Abbruchgrenze liegt", () => {
  const reference = { x: 0.5, y: 0.42, irisPx: 30 };
  const seen = (dx) => Array.from({ length: 10 }, () => ({ irisPx: 30, head: { x: 640 + dx, y: 302.4 } }));
  assert.equal(canResume(seen(0), reference, WIDTH, HEIGHT), true);
  assert.equal(canResume(seen(3 * 30), reference, WIDTH, HEIGHT), true);
  assert.equal(canResume(seen(5 * 30), reference, WIDTH, HEIGHT), false);
  assert.equal(canResume([], reference, WIDTH, HEIGHT), false);
  assert.equal(canResume([{ irisPx: null, head: null }], reference, WIDTH, HEIGHT), false);
});
