// Etappen: Dauer, Kartenangabe, Bereitschaft, Wiederholung. Aufruf: make test
import assert from "node:assert/strict";
import { test } from "node:test";
import { canContinue, canRepeat, cardDuration, effortFromKey, hasPart, LEAD_MS, MAX_REPEATS, MIN_CARD_MS, partMs, stageMs,
         stagesMs, stepText } from "../app/messung/etappen-logik.js";

test("Die Messdauer eines Teils folgt seinen Zeiten", () => {
  assert.equal(partMs({ kind: "fixation", durationMs: 16000 }), 16000);
  assert.equal(partMs({ kind: "calibration", targets: [1, 2, 3], settleMs: 1200, collectMs: 2800 }), 12000);
  assert.equal(partMs({ kind: "gaze", targets: [1, 2], settleMs: 1000, holdMs: 4000, returnMs: 1500 }), 13000);
  assert.equal(partMs({ kind: "pursuit", run: { durationMs: 8000 } }), 8000);
  assert.equal(partMs({ kind: "saccades", jumps: [1, 2], minMs: 900, maxMs: 1300 }), 3500);
  assert.equal(partMs({ kind: "okn", blocks: [{ durationMs: 5000 }, { durationMs: 7000 }] }), 12000);
  assert.throws(() => partMs({ kind: "unbekannt" }));
});

test("Eine Etappe summiert ihre Teile, die Gesamtdauer zählt die Hinführung dazu", () => {
  const stage = { parts: [{ kind: "fixation", durationMs: 3000 }, { kind: "pursuit", run: { durationMs: 2000 } }] };
  assert.equal(stageMs(stage), 5000);
  assert.equal(stagesMs([stage, stage]), 10000 + 2 * LEAD_MS);
  assert.equal(hasPart({ stages: [stage] }, "pursuit"), true);
  assert.equal(hasPart({ stages: [stage] }, "okn"), false);
});

test("Die Kartenangabe rundet auf 5 Sekunden, mindestens 5", () => {
  assert.equal(cardDuration(12000), "rund 10 Sekunden");
  assert.equal(cardDuration(13000), "rund 15 Sekunden");
  assert.equal(cardDuration(32000), "rund 30 Sekunden");
  assert.equal(cardDuration(20400), "rund 20 Sekunden");
  assert.equal(cardDuration(1000), "rund 5 Sekunden");
  assert.equal(cardDuration(0), "rund 5 Sekunden");
});

test("Der Schritt wird ab eins gezählt", () => {
  assert.equal(stepText(2, 9), "Schritt 3 von 9");
});

test("Weiter gilt frühestens nach einer Sekunde und nur mit Kopf in der Grenze", () => {
  assert.equal(canContinue(MIN_CARD_MS - 1, true), false);
  assert.equal(canContinue(MIN_CARD_MS, true), true);
  assert.equal(canContinue(60000, false), false);
});

test("Eine Etappe wird höchstens zweimal wiederholt", () => {
  assert.equal(MAX_REPEATS, 2);
  assert.equal(canRepeat(0), true);
  assert.equal(canRepeat(1), true);
  assert.equal(canRepeat(2), false);
});

test("Anstrengung kommt nur aus den Tasten 1 bis 5", () => {
  assert.equal(effortFromKey("1"), 1);
  assert.equal(effortFromKey("5"), 5);
  for (const key of ["0", "6", " ", "a", "Enter"]) assert.equal(effortFromKey(key), null);
});
