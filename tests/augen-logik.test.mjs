// Konstruierte Gesichtspunkte mit bekannter Antwort. Aufruf: make test
import assert from "node:assert/strict";
import { test } from "node:test";
import { direction, EYES, measureEye, measureFrame, meanX, standardDeviation } from "../app/auswertung/augen-logik.js";

const WIDTH = 1280;
const HEIGHT = 720;
const EYE_PX = 60;
const IRIS_PX = 24;

function placeEye(points, eye, leftX, y, shiftPx, aperturePx = 20) {
  const set = (index, x, py) => { points[index] = { x: x / WIDTH, y: py / HEIGHT }; };
  const centerX = leftX + EYE_PX / 2 + shiftPx;
  set(eye.imageLeft, leftX, y);
  set(eye.imageRight, leftX + EYE_PX, y);
  set(eye.top, leftX + EYE_PX / 2, y - aperturePx / 2);
  set(eye.bottom, leftX + EYE_PX / 2, y + aperturePx / 2);
  set(eye.center, centerX, y);
  set(eye.rimA, centerX + IRIS_PX / 2, y);
  set(eye.rimB, centerX - IRIS_PX / 2, y);
}

function face({ shiftPx = 0, aperturePx = 20, offsetX = 0, offsetY = 0 } = {}) {
  const points = Array.from({ length: 478 }, () => ({ x: 0, y: 0 }));
  placeEye(points, EYES.rechts, 500 + offsetX, 300 + offsetY, shiftPx, aperturePx);
  placeEye(points, EYES.links, 700 + offsetX, 300 + offsetY, shiftPx, aperturePx);
  return points;
}

test("Iris in der Mitte ergibt exakt null", () => {
  const eye = measureEye(face(), WIDTH, HEIGHT, EYES.rechts);
  assert.equal(eye.valid, true);
  assert.equal(eye.x, 0);
});

test("Blick zur rechten Seite der Person ist positiv und in Irisdurchmessern", () => {
  const frame = measureFrame(face({ shiftPx: -12 }), WIDTH, HEIGHT, null);
  assert.ok(Math.abs(frame.rechts.x - 0.5) < 1e-9);
  assert.ok(Math.abs(frame.links.x - 0.5) < 1e-9);
  assert.ok(Math.abs(meanX(frame) - 0.5) < 1e-9);
});

test("Blick zur linken Seite der Person ist negativ", () => {
  assert.ok(meanX(measureFrame(face({ shiftPx: 12 }), WIDTH, HEIGHT, null)) < 0);
});

test("Blick nach oben ist positiv", () => {
  const points = face();
  points[EYES.rechts.center] = { ...points[EYES.rechts.center], y: 294 / HEIGHT };
  const eye = measureEye(points, WIDTH, HEIGHT, EYES.rechts);
  assert.ok(Math.abs(eye.y - 0.25) < 1e-9);
  assert.ok(Math.abs(eye.x) < 1e-9);
});

test("Kopfversatz ohne Augenbewegung lässt x unverändert", () => {
  const moved = measureFrame(face({ offsetX: 40, offsetY: 15 }), WIDTH, HEIGHT, null);
  assert.ok(Math.abs(meanX(moved)) < 1e-9);
});

test("Geschlossenes Lid ist ungültig und liefert keinen Wert", () => {
  const frame = measureFrame(face({ aperturePx: 3 }), WIDTH, HEIGHT, null);
  assert.deepEqual(frame.rechts.reasons, ["Lid"]);
  assert.equal(meanX(frame), null);
});

test("Iris außerhalb der Lidwinkel ist ungültig", () => {
  const eye = measureEye(face({ shiftPx: 40 }), WIDTH, HEIGHT, EYES.rechts);
  assert.deepEqual(eye.reasons, ["Iris außerhalb"]);
});

test("Kopfsprung zwischen zwei Bildern macht das Bild ungültig", () => {
  const first = measureFrame(face(), WIDTH, HEIGHT, null);
  const second = measureFrame(face({ offsetX: 30 }), WIDTH, HEIGHT, first.head);
  assert.equal(meanX(second), null);
  assert.ok(second.rechts.reasons.includes("Kopfbewegung"));
});

test("Die Kopfgrenze gilt je Sekunde, nicht je Bild", () => {
  const first = measureFrame(face(), WIDTH, HEIGHT, null);
  const at30 = measureFrame(face({ offsetX: 6 }), WIDTH, HEIGHT, first.head, 1000 / 30);
  const at60 = measureFrame(face({ offsetX: 6 }), WIDTH, HEIGHT, first.head, 1000 / 60);
  assert.notEqual(meanX(at30), null);
  assert.equal(meanX(at60), null);
});

test("Kleine Kopfbewegung bleibt gültig", () => {
  const first = measureFrame(face(), WIDTH, HEIGHT, null);
  const second = measureFrame(face({ offsetX: 2 }), WIDTH, HEIGHT, first.head);
  assert.notEqual(meanX(second), null);
});

test("Richtung nutzt die Schwelle und meldet fehlende Werte", () => {
  assert.equal(direction(0.2), "rechts");
  assert.equal(direction(-0.2), "links");
  assert.equal(direction(0.05), "Mitte");
  assert.equal(direction(null), null);
});

test("Standardabweichung bekannter Werte", () => {
  assert.equal(standardDeviation([1]), null);
  assert.equal(standardDeviation([2, 2, 2]), 0);
  assert.ok(Math.abs(standardDeviation([1, 2, 3]) - 1) < 1e-9);
});
