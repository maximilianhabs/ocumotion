// Protokolle als Etappen: Reihenfolge, Dauer und Inhalt. Aufruf: make test
import assert from "node:assert/strict";
import { test } from "node:test";
import { stageMs } from "../app/messung/etappen-logik.js";
import { STEPS } from "../app/messung/kalibrierung-logik.js";
import { plannedMs, PROTOCOLS } from "../app/messung/protokolle.js";

const ids = (protocol) => protocol.stages.map((stage) => stage.id);
const parts = (protocol, kind) => protocol.stages.flatMap((stage) => stage.parts).filter((part) => part.kind === kind);

test("Der ausführliche Lauf hat neun Etappen in der festgelegten Reihenfolge", () => {
  assert.deepEqual(ids(PROTOCOLS.lang), ["kalibrierung-1", "kalibrierung-2", "ziele", "ruhe", "blick-seite",
    "blick-vertikal", "folge-langsam", "folge-schnell", "sprünge"]);
});

test("Die beiden Kalibrierteile ergeben zusammen genau die Kalibrierpunkte", () => {
  const [first, second] = parts(PROTOCOLS.lang, "calibration");
  assert.deepEqual([...first.targets, ...second.targets], STEPS);
  assert.ok(first.targets.every((target) => target.role === "fit"));
  assert.ok(second.targets.every((target) => target.role === "check"));
});

test("Kurzlauf und Optokinetik-Lauf haben ihre Etappen in Reihenfolge", () => {
  assert.deepEqual(ids(PROTOCOLS.kurz), ["ruhe", "blick", "folge", "sprünge", "streifen"]);
  assert.deepEqual(ids(PROTOCOLS.okn), ["start", "streifen", "kontrolle"]);
  assert.equal(parts(PROTOCOLS.kurz, "gaze")[0].targets.length, 4);
});

test("Jede Etappe hat Titel, Text und mindestens einen Messteil", () => {
  for (const protocol of Object.values(PROTOCOLS)) {
    for (const stage of protocol.stages) {
      assert.ok(stage.title && stage.text && stage.parts.length, `${protocol.id}/${stage.id}`);
    }
    assert.ok(protocol.stages[0].text.includes("Stützen Sie den Kopf an"), protocol.id);
  }
});

test("Die längste Etappe des ausführlichen Laufs dauert höchstens 35 Sekunden", () => {
  const longest = Math.max(...PROTOCOLS.lang.stages.map(stageMs));
  assert.ok(longest <= 35000, `${longest} ms`);
});

test("Der ausführliche Lauf hat Kalibrierung, zwei Folgegeschwindigkeiten, 8 h- und 4 v-Sprünge, keine Streifen", () => {
  const { lang } = PROTOCOLS;
  assert.equal(parts(lang, "calibration").length, 2);
  assert.equal(parts(lang, "pursuit").length, 2);
  assert.equal(parts(lang, "accuracy").length, 1);
  assert.equal(parts(lang, "okn").length, 0);
  const { jumps } = parts(lang, "saccades")[0];
  assert.equal(jumps.filter((jump) => jump.axis === "h").length, 8);
  assert.equal(jumps.filter((jump) => jump.axis === "v").length, 4);
});

test("Der Kurzlauf braucht keine Kalibrierung und zeigt beide Streifenrichtungen", () => {
  const [stripes] = parts(PROTOCOLS.kurz, "okn");
  assert.equal(parts(PROTOCOLS.kurz, "calibration").length, 0);
  assert.ok(stripes.blocks.some((block) => block.direction === 1));
  assert.ok(stripes.blocks.some((block) => block.direction === -1));
});

test("Der Optokinetik-Lauf beginnt in Ausgangslage, startet links und trennt die Kontrolle", () => {
  const { okn } = PROTOCOLS;
  const [stripes] = parts({ stages: [okn.stages[1]] }, "okn");
  assert.equal(stripes.blocks[0].kind, "base");
  assert.equal(stripes.blocks.find((block) => block.kind === "moving").direction, -1);
  assert.ok(stripes.blocks.every((block) => block.kind !== "control"));
  const [control] = parts({ stages: [okn.stages[2]] }, "okn");
  assert.equal(control.blocks[0].kind, "control");
  assert.equal(control.blocks[0].direction, 1);
  assert.equal(parts(okn, "calibration").length, 0);
  assert.equal(parts(okn, "pursuit").length, 0);
});

test("Die geplante Dauer zählt Messung und Hinführung, nicht die Karten", () => {
  assert.equal(plannedMs(PROTOCOLS.kurz), 76600);
  assert.equal(plannedMs(PROTOCOLS.lang), 167800);
  assert.equal(plannedMs(PROTOCOLS.okn), 63000);
  assert.ok(plannedMs(PROTOCOLS.lang) <= 180000);
  assert.ok(plannedMs(PROTOCOLS.okn) <= 75000);
});
