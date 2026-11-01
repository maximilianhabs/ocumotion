// Befundlogik gegen konstruierte Augenbewegungen mit bekannter Antwort. Aufruf: make test
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  analyseNystagmus, analyseSaccadeMetrics, analyseSmoothPursuit, analyseSwj, detectJumps, inBothEyes, judgeNystagmus,
  judgePursuit, judgeSaccades, judgeSwj, STATUS, withoutLidEvents,
} from "../app/messung/befund-logik.js";

const FRAME_MS = 1000 / 30;
const times = (durationMs) => Array.from({ length: Math.floor(durationMs / FRAME_MS) }, (_, i) => i * FRAME_MS);

function noise(amount) {
  let state = 2024;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return ((state / 2147483648) * 2 - 1) * amount;
  };
}

// Sägezahn: langsame Phase in Gegenrichtung, schnelle Rückstellung.
function sawtooth(key, beatsPerSecond, amplitude, direction, durationMs = 20000, jitter = 0) {
  const random = noise(jitter);
  const period = 1000 / beatsPerSecond;
  return times(durationMs).map((time) => {
    const value = -direction * amplitude * ((time % period) / period) + direction * amplitude / 2 + random();
    return { time, h: key === "h" ? value : 0, v: key === "v" ? value : 0 };
  });
}

test("Ruhe ergibt keinen Nystagmus und keinen SWJ", () => {
  const points = times(20000).map((time) => ({ time, h: 0, v: 0 }));
  assert.equal(analyseNystagmus(points, "h").present, false);
  assert.equal(analyseSwj(points).count, 0);
});

test("Messrauschen allein ergibt kein Ruckmuster", () => {
  const random = noise(0.3);
  const points = times(20000).map((time) => ({ time, h: random(), v: random() }));
  assert.equal(analyseNystagmus(points, "h").present, false);
});

test("Rechtsschlagender Nystagmus wird mit Richtung und langsamer Phase erkannt", () => {
  const result = analyseNystagmus(sawtooth("h", 2, 3, 1), "h");
  assert.equal(result.present, true);
  assert.equal(result.direction, 1);
  assert.ok(Math.abs(result.rate - 2) < 0.2);
  assert.ok(Math.abs(result.slowPhase - 6) < 1);
});

test("Downbeat wird vertikal erkannt und benannt", () => {
  const result = analyseNystagmus(sawtooth("v", 1.5, 4, -1), "v");
  assert.equal(result.present, true);
  assert.equal(result.direction, -1);
  const judged = judgeNystagmus(result, "v", true);
  assert.equal(judged.status, STATUS.abnormal);
  assert.ok(judged.text.includes("Downbeat"));
});

test("Unter der Nachweisgrenze wird nicht behauptet und die Grenze genannt", () => {
  const result = analyseNystagmus(sawtooth("h", 2, 0.5, 1), "h");
  assert.equal(result.present, false);
  const judged = judgeNystagmus(result, "h", true);
  assert.equal(judged.status, STATUS.normal);
  assert.ok(judged.text.includes("Nachweisgrenze"));
});

test("Gesperrte Achse bleibt nicht beurteilbar, auch bei deutlichem Muster", () => {
  const result = analyseNystagmus(sawtooth("v", 2, 5, 1), "v");
  assert.equal(judgeNystagmus(result, "v", false).status, STATUS.unknown);
});

test("Square-Wave-Jerks werden gezählt und von Sakkaden getrennt", () => {
  const points = times(30000).map((time) => {
    const inJerk = time % 5000 >= 2000 && time % 5000 < 2250;
    return { time, h: inJerk ? 2 : 0, v: 0 };
  });
  const result = analyseSwj(points);
  assert.equal(result.count, 6);
  assert.ok(Math.abs(result.perMinute - 12) < 0.8);
  assert.equal(judgeSwj(result, true).status, STATUS.abnormal);
});

test("Ein Sprung nur in einem Auge zählt nicht als echtes Ereignis", () => {
  const jump = times(4000).map((time) => ({ time, h: time > 2000 ? 3 : 0, v: 0 }));
  const still = times(4000).map((time) => ({ time, h: 0, v: 0 }));
  const [event] = detectJumps(jump, "h");
  assert.equal(inBothEyes(event, "h", { rechts: jump, links: jump }), true);
  assert.equal(inBothEyes(event, "h", { rechts: jump, links: still }), false);
});

test("Einzelne Sprünge ohne Rückkehr sind kein SWJ", () => {
  const points = times(20000).map((time) => ({ time, h: time > 8000 ? 3 : 0, v: 0 }));
  assert.equal(detectJumps(points, "h").length, 1);
  assert.equal(analyseSwj(points).count, 0);
});

test("Kurze Beobachtung ergibt keine SWJ-Rate als Befund", () => {
  const points = times(10000).map((time) => ({ time, h: 0, v: 0 }));
  assert.equal(judgeSwj(analyseSwj(points), true).status, STATUS.unknown);
});

const RUN = { amplitude: 10, frequency: 0.25, durationMs: 16000 };
const omega = (2 * Math.PI * RUN.frequency) / 1000;

test("Perfekte Blickfolge ist glatt mit Gain 1", () => {
  const points = times(RUN.durationMs).map((time) => ({ time, h: 10 * Math.sin(omega * time), v: 0 }));
  const result = analyseSmoothPursuit(points, RUN, 0);
  assert.ok(Math.abs(result.smoothGain - 1) < 0.02);
  assert.equal(result.saccades, 0);
  assert.equal(judgePursuit(result, true).status, STATUS.normal);
});

test("Sakkadierte Folge: wenig glatte Bewegung, Aufholsprünge halten die Position", () => {
  // Zwischen den Sprüngen bewegt sich das Auge kaum, alle 700 ms holt es das Ziel ein.
  const points = times(RUN.durationMs).map((time) => {
    const step = Math.floor(time / 700) * 700;
    return { time, h: 10 * Math.sin(omega * step), v: 0 };
  });
  const result = analyseSmoothPursuit(points, RUN, 0);
  assert.ok(result.saccadesPerCycle >= 3);
  assert.notEqual(judgePursuit(result, true).status, STATUS.normal);
  assert.ok(judgePursuit(result, true).text.startsWith("sakkadiert"));
});

function jumpsTrace(gain, correction = true) {
  const jumps = [0, 1, 2, 3].map((i) => ({ axis: "h", from: i % 2 ? 10 : -10, to: i % 2 ? -10 : 10, at: 1000 + i * 1600 }));
  const points = times(8000).map((time) => {
    let h = -10;
    for (const jump of jumps) {
      if (time >= jump.at + 200) h = jump.from + (jump.to - jump.from) * gain;
      if (correction && time >= jump.at + 450) h = jump.to;
    }
    return { time, h, v: 0 };
  });
  return { points, jumps };
}

test("Hypometrische Sakkaden mit Korrektur: erste Landung klein, Endlage voll", () => {
  const { points, jumps } = jumpsTrace(0.7);
  const summary = analyseSaccadeMetrics(points, jumps);
  assert.ok(Math.abs(summary.rechts.firstGain - 0.7) < 0.05);
  assert.ok(Math.abs(summary.rechts.endGain - 1) < 0.05);
});

test("Einordnung metrisch, hypo und hyper", () => {
  const judge = (gain) => judgeSaccades("rechts", { trials: 4, firstGain: gain, endGain: 1 }, true);
  assert.ok(judge(1).text.includes("metrisch"));
  assert.equal(judge(1).status, STATUS.normal);
  assert.ok(judge(0.7).text.includes("hypometrisch"));
  assert.equal(judge(0.7).status, STATUS.border);
  assert.equal(judge(0.5).status, STATUS.abnormal);
  assert.ok(judge(1.3).text.includes("hypermetrisch"));
});

test("Unsichere Vertikale zeigt Werte, aber höchstens eine Tendenz", () => {
  const result = judgeSaccades("Oben", { trials: 4, firstGain: 0.5, endGain: 1 }, true, { uncertain: true });
  assert.equal(result.status, STATUS.border);
  assert.match(result.text, /vertikal unsicher/);
});

test("Zu wenige Versuche ergeben keine Metrik-Aussage", () => {
  assert.equal(judgeSaccades("oben", { trials: 2, firstGain: 0.5, endGain: 1 }, true).status, STATUS.unknown);
  assert.equal(judgeSaccades("oben", null, true).status, STATUS.unknown);
  assert.equal(judgeSaccades("oben", { trials: 8, firstGain: 1, endGain: 1 }, false).status, STATUS.unknown);
});

test("Lidereignisse werden mit Randbereich entfernt", () => {
  const points = times(2000).map((time) => ({ time, h: 0, v: 0 }));
  const kept = withoutLidEvents(points, [{ from: 1000, to: 1000 }]);
  assert.ok(kept.length < points.length);
  assert.equal(kept.some((p) => Math.abs(p.time - 1000) < 200), false);
  assert.equal(withoutLidEvents(points, []).length, points.length);
});
