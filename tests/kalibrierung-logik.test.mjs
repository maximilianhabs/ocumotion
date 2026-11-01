// Kalibrierung gegen Augen mit bekannter Abbildung. Aufruf: make test
import assert from "node:assert/strict";
import { test } from "node:test";
import { calibrate, combineEyes, evaluateEye, hasEnoughData, MAX_SIDE_DIFFERENCE, medianFilter, sensitivity, STEPS, targetPixels, targetsFit, toDegrees } from "../app/messung/kalibrierung-logik.js";

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
  assert.equal(eye.passedH, false);
  assert.equal(eye.reasonH, "Prüffehler zu groß");
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
  assert.ok(result.links.weightV > 0);
});

test("Zu wenige gültige Bilder sind kein Ergebnis", () => {
  const entries = run({ samples: 3 });
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

test("Das Mittel beider Augen hebt seitenabhängige Fehler auf", () => {
  // Rechtes Auge bildet nach rechts zu viel ab, linkes zu wenig: wie in den echten Läufen.
  const skew = (bias) => (h, v) => ({ x: 0.018 * h * (1 + bias * Math.sign(h)), y: 0.0144 * v });
  const entries = run({ rechts: skew(0.25), links: skew(-0.25) });
  const result = calibrate(entries);
  assert.equal(result.mittel.passed, true);
  near(result.mittel.errorH, 0, 1e-6);
  assert.ok(result.rechts.errorH > result.mittel.errorH);
});

test("Hauptmessung nutzt das Mittel und fällt auf ein Auge zurück", () => {
  const model = { h: [0, 1, 0], v: [0, 0, 1] };
  const calibration = { rechts: { model }, links: { model }, mittel: { model } };
  near(combineEyes({ x: 4, y: 0 }, { x: 6, y: 2 }, calibration).h, 5);
  near(combineEyes({ x: 4, y: 0 }, { x: 6, y: 2 }, calibration).v, 1);
  near(combineEyes(null, { x: 8, y: 4 }, calibration).h, 8);
  assert.equal(combineEyes(null, null, calibration), null);
});

test("Blickziele liegen im bekannten Abstand auf dem Bildschirm", () => {
  const pixel = targetPixels({ h: 45, v: 0 }, 10, 1000, 600, 28.6);
  near(pixel.x, 500 + 10 / 0.0286);
  near(pixel.y, 300);
  const up = targetPixels({ h: 0, v: 45 }, 10, 1000, 600, 28.6);
  assert.ok(up.y < 300);
});

test("Alle Ziele passen bei 30 bis 50 cm auf den MacBook-Bildschirm", () => {
  for (const distance of [30, 35, 40, 50]) {
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
  assert.equal(eye.passedV, false);
  assert.equal(eye.passedH, true);
  assert.ok(eye.errorV > 3);
});

test("Horizontaler Fehler an vertikalen Prüfzielen lässt die Kalibrierung scheitern", () => {
  const entries = run();
  for (const entry of checkEntries(entries).filter((e) => e.target.h === 0)) {
    for (const sample of entry.samples) sample.rechts = { ...sample.rechts, x: sample.rechts.x + 0.18 };
  }
  const eye = evaluateEye(entries, "rechts");
  assert.equal(eye.passedH, false);
  assert.ok(eye.errorH > 2);
});

test("Ein einzelnes schlechtes Prüfziel fällt über den Maximalfehler auf", () => {
  const entries = run();
  const target = checkEntries(entries)[0];
  for (const sample of target.samples) sample.rechts = { ...sample.rechts, x: sample.rechts.x + 0.09 };
  const eye = evaluateEye(entries, "rechts");
  assert.ok(eye.maxErrorH > 4);
  assert.equal(eye.passedH, false);
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
  assert.equal(eye.passedH, false);
  assert.equal(eye.reasonH, "Einzelwerte zu unruhig");
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

test("Empfindlichkeit rechnet Modellverstärkung in Grad je Bildpunkt um", () => {
  const result = sensitivity({ h: [0, 90, 0], v: [0, 0, 240] }, 30);
  near(result.h, 3);
  near(result.v, 8);
  assert.equal(sensitivity(null, 30), null);
  assert.equal(sensitivity({ h: [0, 1, 0], v: [0, 0, 1] }, 0), null);
});

test("Große Seitendifferenz wird markiert, die Messung bleibt", () => {
  const model = { h: [0, 1, 0], v: [0, 0, 1] };
  const calibration = { rechts: { model }, links: { model }, mittel: { model } };
  const apart = combineEyes({ x: 0, y: 1 }, { x: MAX_SIDE_DIFFERENCE + 1, y: 1.5 }, calibration);
  assert.equal(apart.disagree, true);
  near(apart.h, (MAX_SIDE_DIFFERENCE + 1) / 2);
  assert.equal(combineEyes({ x: 1, y: 1 }, { x: 1.5, y: 1 }, calibration).disagree, false);
});

test("Medianfilter erhält einen Sprung und entfernt Ausreißer", () => {
  const points = Array.from({ length: 20 }, (_, i) => ({ time: i * 33, h: i < 10 ? 0 : 10 }));
  const filtered = medianFilter(points, ["h"]);
  assert.deepEqual(filtered.map((p) => p.h), points.map((p) => p.h));
  points[5].h = 50;
  assert.equal(medianFilter(points, ["h"])[5].h, 0);
});

test("Medianfilter greift nicht über Lücken", () => {
  const points = [0, 33, 66, 500, 533, 566].map((time, i) => ({ time, h: i < 3 ? 0 : 10 }));
  assert.deepEqual(medianFilter(points, ["h"]).map((p) => p.h), [0, 0, 0, 10, 10, 10]);
});

test("Rauschen im Bild besteht nach dem Filter, wenn die Ziele stimmen", () => {
  let n = 0;
  const jitter = () => { n = (n * 1103515245 + 12345) % 2147483648; return (n / 2147483648 - 0.5) * 0.03; };
  const noisy = (h, v) => { const eye = eyeAt(h, v); return { x: eye.x + jitter(), y: eye.y + jitter() * 0.5 }; };
  const eye = evaluateEye(run({ rechts: noisy, samples: 80 }), "rechts");
  assert.equal(eye.passedH, true);
});

test("Medianfilter entfernt bei 30 und 60 fps denselben 60-ms-Ausreißer", () => {
  const trace = (fps) => Array.from({ length: fps }, (_, i) => {
    const time = (i * 1000) / fps;
    return { time, h: time >= 500 && time < 560 ? 50 : 0 };
  });
  for (const fps of [30, 60]) {
    assert.equal(trace(fps).some((p) => p.h === 50), true);
    assert.equal(medianFilter(trace(fps), ["h"]).some((p) => p.h === 50), false);
  }
});

test("Datenmenge zählt als Zeit, nicht als Bildzahl", () => {
  const points = (count, stepMs) => Array.from({ length: count }, (_, i) => ({ time: i * stepMs }));
  assert.equal(hasEnoughData(points(10, 33.4)), true);
  assert.equal(hasEnoughData(points(10, 16.7)), false);
  assert.equal(hasEnoughData(points(20, 16.7)), true);
  assert.equal(hasEnoughData(points(2, 500)), false);
});

test("Fremder Bildschirm: Ziele werden gegen die echte Größe geprüft", () => {
  assert.equal(targetsFit(40, 1440, 900, 28.6), true);
  assert.equal(targetsFit(40, 390, 844, 7), false);
  assert.equal(targetsFit(40, 1920, 1080, 52), true);
});
