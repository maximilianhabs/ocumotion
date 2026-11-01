// OKN-Auswertung gegen konstruierte Augenbewegungen. Aufruf: make test
import assert from "node:assert/strict";
import { test } from "node:test";
import { analyseBlock, controlVerdict, fieldDegrees, OKN_BLOCKS, OKN_STATE, stripeOn, stripePeriod } from "../app/messung/okn-logik.js";

const FRAME_MS = 1000 / 30;
const times = (durationMs) => Array.from({ length: Math.floor(durationMs / FRAME_MS) }, (_, i) => i * FRAME_MS);

function noise(amount) {
  let state = 77;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return ((state / 2147483648) * 2 - 1) * amount;
  };
}

// Sägezahn: langsam mit dem Reiz, schnelle Rückstellung dagegen.
function okn(direction, slowSpeed, beatSeconds, durationMs = 12000, jitter = 0) {
  const random = noise(jitter);
  return times(durationMs).map((time) => {
    const phase = ((time / 1000) % beatSeconds) * slowSpeed;
    return { time, h: direction * (phase - (slowSpeed * beatSeconds) / 2) + random(), v: 0 };
  });
}

const series = (points) => ({ mittel: points, rechts: points, links: points });
const block = (direction, durationMs = 12000) => ({ from: 0, to: durationMs, direction });
const analyse = (points, direction) => analyseBlock(series(points), points, block(direction), points.length);

test("Ablauf ergibt die geplante Dauer", () => {
  assert.equal(OKN_BLOCKS.reduce((sum, item) => sum + item.durationMs, 0), 48000);
  assert.equal(OKN_BLOCKS.filter((item) => item.kind === "moving").length, 2);
});

test("Streifenperiode bleibt unter acht Paaren, auch bei großem Feld", () => {
  assert.ok(Math.abs(stripePeriod(fieldDegrees(28.6, 40)) - 5.25) < 0.05);
  for (const distance of [30, 35, 40, 50]) {
    const field = fieldDegrees(28.6, distance);
    assert.ok(field / stripePeriod(field) <= 7.5 + 1e-9);
  }
  assert.equal(stripePeriod(20), 5);
});

test("Das Muster bewegt sich in die angegebene Richtung", () => {
  const edge = (direction, seconds) => {
    for (let theta = -5; theta < 5; theta += 0.01) {
      if (!stripeOn(theta, seconds, direction, 10) && stripeOn(theta + 0.01, seconds, direction, 10)) return theta;
    }
    return null;
  };
  assert.ok(edge(1, 0.1) > edge(1, 0));
  assert.ok(edge(-1, 0.1) < edge(-1, 0));
});

test("Muster nach rechts: langsam rechts, Schlag links", () => {
  const result = analyse(okn(1, 6, 0.6), 1);
  assert.equal(result.state, OKN_STATE.conform);
  assert.equal(result.beatDirection, -1);
  assert.ok(Math.abs(result.spv - 6) < 0.6);
  assert.ok(Math.abs(result.gain - 0.75) < 0.1);
  assert.equal(result.quantifiable, true);
});

test("Muster nach links: spiegelbildlich", () => {
  const result = analyse(okn(-1, 6, 0.6), -1);
  assert.equal(result.state, OKN_STATE.conform);
  assert.equal(result.beatDirection, 1);
});

test("Bekannter Gain wird wiedergefunden, auch mit Rauschen", () => {
  for (const gain of [0.4, 0.7, 1]) {
    const result = analyse(okn(1, 8 * gain, 3 / (8 * gain), 12000, 0.3), 1);
    assert.ok(Math.abs(result.gain - gain) < 0.15, `Gain ${result.gain} statt ${gain}`);
  }
});

test("Antwort gegen die Reizrichtung ist nicht reizkonform", () => {
  const result = analyse(okn(-1, 6, 0.6), 1);
  assert.notEqual(result.state, OKN_STATE.conform);
  assert.equal(result.state, OKN_STATE.uncertain);
});

test("Ruhe und Rauschen erzeugen keine Antwort, trotz vorhandenem Reiz", () => {
  const random = noise(0.25);
  const still = times(12000).map((time) => ({ time, h: random(), v: 0 }));
  assert.equal(analyse(still, 1).state, OKN_STATE.none);
});

test("Sprünge in beide Richtungen ergeben keine langsame Phase und keinen Gain", () => {
  // Blick wandert hin und her: gleich viele Sprünge nach rechts und links.
  const points = times(12000).map((time) => ({ time, h: Math.floor(time / 700) % 2 ? 2.5 : -2.5, v: 0 }));
  const result = analyse(points, 1);
  assert.equal(result.state, OKN_STATE.uncertain);
  assert.equal(result.consistent, false);
  assert.equal(result.spv, null);
  assert.equal(result.gain, null);
  assert.equal(result.phases, 0);
  assert.ok(result.jumpsRight > 0 && result.jumpsLeft > 0);
});

test("Reine Sinusbewegung ohne schnelle Phase ist kein OKN", () => {
  const smooth = times(12000).map((time) => ({ time, h: 8 * Math.sin(time / 800), v: 0 }));
  assert.notEqual(analyse(smooth, 1).state, OKN_STATE.conform);
});

test("Fehlende Daten sind technisch nicht auswertbar, nicht keine Antwort", () => {
  const points = okn(1, 6, 0.6, 2500);
  const result = analyseBlock(series(points), points, block(1), 360);
  assert.equal(result.state, OKN_STATE.invalid);
});

test("Wenige Phasen ergeben keinen Anspruch auf Quantifizierung", () => {
  const result = analyse(okn(1, 3, 3), 1);
  assert.equal(result.quantifiable, false);
});

test("Kontrolle erkennt ein reizsynchrones Artefakt", () => {
  const free = [{ state: OKN_STATE.conform, rate: 1.6 }];
  assert.equal(controlVerdict(free, { state: OKN_STATE.conform, rate: 1.5 }).suspicious, true);
  assert.equal(controlVerdict(free, { state: OKN_STATE.none, rate: 0.2 }).suspicious, false);
  assert.equal(controlVerdict([], { state: OKN_STATE.conform, rate: 1.5 }).suspicious, false);
});
