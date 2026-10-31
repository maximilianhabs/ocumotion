// Protokolle: Dauer und Inhalt. Aufruf: make test
import assert from "node:assert/strict";
import { test } from "node:test";
import { plannedMs, PROTOCOLS } from "./protokolle.js";

test("Der Kurzlauf bleibt bei rund einer Minute und kommt ohne Kalibrierung aus", () => {
  const { kurz } = PROTOCOLS;
  assert.equal(kurz.calibrated, false);
  assert.ok(plannedMs(kurz) <= 90000, `${plannedMs(kurz)} ms`);
});

test("Beide Protokolle fragen alle Bausteine ab", () => {
  for (const protocol of Object.values(PROTOCOLS)) {
    assert.ok(protocol.fixationMs >= 15000);
    assert.ok(protocol.saccades.jumps.some((jump) => jump.axis === "h"));
    assert.ok(protocol.saccades.jumps.some((jump) => jump.axis === "v"));
    assert.ok(protocol.pursuit.length >= 1);
    assert.ok(protocol.okn.some((block) => block.direction === 1));
    assert.ok(protocol.okn.some((block) => block.direction === -1));
  }
});

test("Der ausführliche Lauf hat Kalibrierung, zwei Folgegeschwindigkeiten und Kontrolle", () => {
  const { lang } = PROTOCOLS;
  assert.equal(lang.calibrated, true);
  assert.equal(lang.pursuit.length, 2);
  assert.equal(lang.accuracy, true);
  assert.ok(lang.okn.some((block) => block.kind === "control"));
  assert.ok(plannedMs(lang) <= 330000, `${plannedMs(lang)} ms`);
});
