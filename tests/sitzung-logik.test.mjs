// Sitzung und Module gegen konstruierte Läufe. Aufruf: make test
import assert from "node:assert/strict";
import { test } from "node:test";
import { stagesMs } from "../app/messung/etappen-logik.js";
import { MODULES, moduleById, sessionProtocol } from "../app/messung/protokolle.js";
import { emptySession, mergeRun, needsScale } from "../app/messung/sitzung-logik.js";

test("Jedes Modul hat Etappen, und Etappen-Kennungen sind eindeutig", () => {
  const ids = MODULES.flatMap((item) => item.stages.map((stage) => stage.id));
  assert.ok(MODULES.every((item) => item.stages.length && item.stages.every(Boolean)));
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(moduleById("kalibrierung").stages[0].parts[0].targets.length, 8);
  assert.ok(stagesMs(moduleById("kalibrierung").stages) <= 20000);
});

test("Ohne Kalibrierung und Sakkaden kommt die Maßstabsetappe zuerst", () => {
  const protocol = sessionProtocol(["blickfolge"], { needsScale: needsScale(emptySession(), ["blickfolge"]) });
  assert.equal(protocol.stages[0].id, "massstab");
  assert.equal(protocol.scaleOnly, true);
});

test("Mit Kalibrierung, Sakkaden oder vorhandenem Maßstab entfällt die Maßstabsetappe", () => {
  assert.equal(needsScale(emptySession(), ["kalibrierung", "blickfolge"]), false);
  assert.equal(needsScale(emptySession(), ["sakkaden"]), false);
  assert.equal(needsScale({ ...emptySession(), saccades: { jumps: [] } }, ["blickfolge"]), false);
  assert.equal(needsScale({ ...emptySession(), calibration: [{}] }, ["blickfolge"]), false);
});

test("Ein wiederholtes Modul ersetzt das alte Ergebnis, andere bleiben", () => {
  const first = mergeRun(emptySession(), { fixation: { samples: [1] }, gaze: [{ a: 1 }], stages: [{ id: "ruhe", n: 1 }] }, ["nystagmus"]);
  const second = mergeRun(first, { pursuit: [{ b: 1 }], stages: [{ id: "folge-langsam" }] }, ["blickfolge"]);
  const again = mergeRun(second, { fixation: { samples: [2] }, gaze: [{ a: 2 }], stages: [{ id: "ruhe", n: 2 }] }, ["nystagmus"]);
  assert.deepEqual(again.modules, ["nystagmus", "blickfolge"]);
  assert.deepEqual(again.fixation.samples, [2]);
  assert.equal(again.pursuit.length, 1);
  assert.equal(again.stages.find((stage) => stage.id === "ruhe").n, 2);
  assert.equal(again.stages.length, 2);
});

test("Eine Maßstabsetappe überschreibt keine echte Sakkaden-Untersuchung", () => {
  const real = mergeRun(emptySession(), { saccades: { jumps: [1, 2, 3] } }, ["sakkaden"]);
  const later = mergeRun(real, { saccades: { jumps: [9], scaleOnly: true } }, ["blickfolge"]);
  assert.deepEqual(later.saccades.jumps, [1, 2, 3]);
});

test("Eine durchgefallene Kalibrierung zählt nicht, der Maßstab kommt wieder dazu", () => {
  const session = mergeRun(emptySession(), { calibration: undefined, stages: [] }, ["kalibrierung"]);
  assert.equal(session.calibration, undefined);
  assert.equal(needsScale(session, ["blickfolge"]), true);
});
