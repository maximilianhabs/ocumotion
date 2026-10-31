// Kalibrierung gegen Augen mit bekannter Abbildung. Aufruf: make test
import assert from "node:assert/strict";
import { test } from "node:test";
import { calibrate, evaluateEye, fuse, MAX_SIDE_DIFFERENCE, MIN_SAMPLES, STEPS, targetPixels, toDegrees } from "./kalibrierung-logik.js";

const near = (actual, expected, tolerance = 1e-6) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} statt ${expected}`);

// Bekanntes Auge: 0,018 Irisdurchmesser je Grad, mit Versatz und etwas Kopplung.
const eyeAt = (h, v, gain = 0.018, offset = 0.04) => ({
  x: offset + gain * h + 0.001 * v,
  y: -0.02 + gain * v * 0.8,
});

function run({ rechts = (h, v) => eyeAt(h, v), links = (h, v) => eyeAt(h, v, 0.017, -0.03), samples = 20 } = {}) {
  return STEPS.map((target) => ({
    target,
    samples: Array.from({ length: samples }, (_, i) => ({
      t: i * 100, rechts: rechts(target.h, target.v), links: links(target.h, target.v),
    })),
  }));
}

test("Perfekte Augen ergeben Prüffehler null und bestehen", () => {
  const result = calibrate(run());
  assert.equal(result.passed, true);
  near(result.rechts.errorH, 0);
  near(result.rechts.errorV, 0);
  near(result.links.errorH, 0);
});

test("Modell gibt bekannte Winkel zurück, auch an nicht angepassten Stellen", () => {
  const { model } = evaluateEye(run(), "rechts");
  const point = eyeAt(12, -6);
  const degrees = toDegrees(model, point.x, point.y);
  near(degrees.h, 12);
  near(degrees.v, -6);
});

test("Prüfziele fließen nicht in die Anpassung ein", () => {
  const entries = run();
  for (const entry of entries.filter((e) => e.target.role === "check")) {
    for (const sample of entry.samples) sample.rechts = { x: sample.rechts.x + 0.09, y: sample.rechts.y };
  }
  const eye = evaluateEye(entries, "rechts");
  assert.equal(eye.passed, false);
  assert.equal(eye.reason, "Prüffehler zu groß");
  assert.ok(eye.errorH > 2);
});

test("Ein schlechtes Auge fällt aus, das gute bleibt", () => {
  const entries = run();
  for (const entry of entries.filter((e) => e.target.role === "check")) {
    for (const sample of entry.samples) sample.links = { x: sample.links.x + 0.09, y: sample.links.y };
  }
  const result = calibrate(entries);
  assert.equal(result.passed, true);
  assert.equal(result.best, "rechts");
  assert.equal(result.links.weightH, 0);
  assert.equal(result.links.weightV, 0);
  const estimate = fuse({ h: 3, v: 1 }, { h: 30, v: 9 }, result);
  near(estimate.h, 3);
});

test("Zu wenige gültige Bilder sind kein Ergebnis", () => {
  const entries = run({ samples: MIN_SAMPLES - 1 });
  const result = calibrate(entries);
  assert.equal(result.passed, false);
  assert.equal(result.rechts.model, null);
});

test("Geschlossenes Auge am Ziel lässt nur dieses Auge scheitern", () => {
  const entries = run();
  for (const sample of entries[1].samples) sample.rechts = null;
  const result = calibrate(entries);
  assert.equal(result.rechts.passed, false);
  assert.equal(result.links.passed, true);
  assert.equal(result.best, "links");
});

test("Mittelwert gewichtet nach Güte und nutzt bei Ausfall das andere Auge", () => {
  const calibration = { rechts: { weightH: 3, weightV: 3 }, links: { weightH: 1, weightV: 1 } };
  near(fuse({ h: 4, v: 0 }, { h: 6, v: 2 }, calibration).h, 4.5);
  near(fuse({ h: 4, v: 0 }, { h: 6, v: 2 }, calibration).v, 0.5);
  near(fuse(null, { h: 8, v: 4 }, calibration).h, 8);
  assert.equal(fuse(null, null, calibration), null);
});

test("Blickziele liegen im bekannten Abstand auf dem Bildschirm", () => {
  const pixel = targetPixels({ h: 45, v: 0 }, 10, 1000, 600, 28.6);
  near(pixel.x, 500 + 10 / 0.0286);
  near(pixel.y, 300);
  const up = targetPixels({ h: 0, v: 45 }, 10, 1000, 600, 28.6);
  assert.ok(up.y < 300);
});

test("Alle Ziele passen bei 30 bis 50 cm auf den MacBook-Bildschirm", () => {
  for (const distance of [30, 40, 50]) {
    for (const target of STEPS) {
      const pixel = targetPixels(target, distance, 1440, 900);
      assert.ok(pixel.x > 0 && pixel.x < 1440, `${target.name} bei ${distance}`);
      assert.ok(pixel.y > 0 && pixel.y < 900, `${target.name} bei ${distance}`);
    }
  }
});

const checkEntries = (entries) => entries.filter((entry) => entry.target.role === "check");

test("Vertikaler Fehler an horizontalen Prüfzielen lässt die Kalibrierung scheitern", () => {
  const entries = run();
  for (const entry of checkEntries(entries).filter((e) => e.target.v === 0)) {
    for (const sample of entry.samples) sample.rechts = { ...sample.rechts, y: sample.rechts.y + 0.144 };
  }
  const eye = evaluateEye(entries, "rechts");
  assert.equal(eye.passed, false);
  assert.ok(eye.errorV > 3);
});

test("Horizontaler Fehler an vertikalen Prüfzielen lässt die Kalibrierung scheitern", () => {
  const entries = run();
  for (const entry of checkEntries(entries).filter((e) => e.target.h === 0)) {
    for (const sample of entry.samples) sample.rechts = { ...sample.rechts, x: sample.rechts.x + 0.18 };
  }
  const eye = evaluateEye(entries, "rechts");
  assert.equal(eye.passed, false);
  assert.ok(eye.errorH > 2);
});

test("Ein einzelnes schlechtes Prüfziel fällt über den Maximalfehler auf", () => {
  const entries = run();
  const target = checkEntries(entries)[0];
  for (const sample of target.samples) sample.rechts = { ...sample.rechts, x: sample.rechts.x + 0.09 };
  const eye = evaluateEye(entries, "rechts");
  assert.ok(eye.maxError > 4);
  assert.equal(eye.passed, false);
});

test("Vertikales Rauschen senkt nur das vertikale Gewicht", () => {
  const entries = run();
  for (const entry of entries) {
    entry.samples.forEach((sample, i) => {
      sample.rechts = { ...sample.rechts, y: sample.rechts.y + (i % 2 ? 0.01 : -0.01) };
    });
  }
  const result = calibrate(entries);
  assert.ok(result.rechts.noiseV > 0.4);
  assert.ok(result.rechts.weightV < result.links.weightV);
  near(result.rechts.weightH, result.links.weightH, 1);
  assert.equal(result.best, "links");
});

test("Stark schwankende Einzelwerte bestehen trotz richtigem Median nicht", () => {
  const entries = run();
  for (const entry of entries) {
    entry.samples.forEach((sample, i) => {
      sample.rechts = { ...sample.rechts, x: sample.rechts.x + (i % 2 ? 0.1 : -0.1) };
    });
  }
  const eye = evaluateEye(entries, "rechts");
  assert.equal(eye.passed, false);
  assert.equal(eye.reason, "Einzelwerte zu unruhig");
});

test("Eine lange Tracking-Lücke am Ziel besteht nicht", () => {
  const entries = run({ samples: 28 });
  const entry = entries[3];
  entry.samples.forEach((sample) => { if (sample.t >= 500 && sample.t < 1800) sample.rechts = null; });
  const eye = evaluateEye(entries, "rechts");
  assert.equal(eye.passed, false);
  assert.equal(eye.reason, "Tracking-Lücke");
});

test("Zu geringer Anteil gültiger Bilder besteht nicht", () => {
  const entries = run({ samples: 28 });
  for (const entry of entries) {
    entry.samples.forEach((sample, i) => { if (i % 2) sample.rechts = null; });
  }
  const eye = evaluateEye(entries, "rechts");
  assert.equal(eye.passed, false);
  assert.equal(eye.reason, "zu wenige gültige Bilder");
});

test("Bei großer Seitendifferenz wird der Mittelwert der Achse ausgesetzt", () => {
  const calibration = { rechts: { weightH: 1, weightV: 1 }, links: { weightH: 1, weightV: 1 } };
  const apart = fuse({ h: 0, v: 1 }, { h: MAX_SIDE_DIFFERENCE + 1, v: 1.5 }, calibration);
  assert.equal(apart.h, null);
  near(apart.v, 1.25);
  assert.equal(apart.disagree, true);
  assert.equal(fuse({ h: 1, v: 1 }, { h: 1.5, v: 1 }, calibration).disagree, false);
  near(fuse(null, { h: 20, v: 1 }, calibration).h, 20);
});
