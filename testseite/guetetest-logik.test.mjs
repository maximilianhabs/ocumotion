// Gütetest gegen künstliche Augen mit bekannter Antwort. Aufruf: make test
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ACCURACY_TARGETS, analyseFixation, analysePursuit, analyseRun, analyseSaccades, analyseTargets,
  differenceNoise, grade, PURSUIT_RUNS, toSeries,
} from "./guetetest-logik.js";

const near = (actual, expected, tolerance) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} statt ${expected}`);

const FRAME_MS = 1000 / 30;
const times = (durationMs, start = 0) =>
  Array.from({ length: Math.floor(durationMs / FRAME_MS) }, (_, i) => start + i * FRAME_MS);

// Einheitsmodell: Rohwert = Grad.
const MODEL = { h: [0, 1, 0], v: [0, 0, 1] };
const EYE = { model: MODEL, passedH: true, passedV: true, weightH: 1, weightV: 1 };
const CALIBRATION = { passed: true, rechts: EYE, links: EYE, mittel: EYE };

function noise(amount) {
  let state = 12345;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return ((state / 2147483648) * 2 - 1) * amount;
  };
}

test("Ruhiger Blick ergibt keine Streuung und volle Gültigkeit", () => {
  const points = times(5000).map((time) => ({ time, h: 1, v: -2 }));
  const result = analyseFixation(points, points.length);
  assert.equal(result.sdH, 0);
  assert.equal(result.validShare, 1);
  near(result.driftH, 0, 1e-9);
});

test("Lidschlag-Ausreißer verfälschen die robuste Streuung nicht", () => {
  const points = times(10000).map((time, i) => ({ time, h: 0, v: i % 40 < 3 ? 20 : 0 }));
  const result = analyseFixation(points, points.length);
  assert.ok(result.sdV > 3);
  assert.equal(result.robustSdV, 0);
});

test("Gleichmäßige Drift wird als Grad je Sekunde erkannt", () => {
  const points = times(10000).map((time) => ({ time, h: 0.5 * (time / 1000), v: 0 }));
  near(analyseFixation(points, points.length).driftH, 0.5, 1e-6);
});

test("Rauschschätzung aus der Seitendifferenz ignoriert echte Bewegung", () => {
  const random = noise(0.5);
  const samples = times(10000).map((time) => {
    const eye = 5 * Math.sin(time / 500);
    return { time, rechts: { x: eye + random(), y: 0 }, links: { x: eye + random(), y: 0 } };
  });
  const result = differenceNoise(toSeries(samples, CALIBRATION, { filter: false }));
  near(result.h, 0.289, 0.04);
});

test("Ausfall eines Auges füllt den Mittelwert aus dem anderen", () => {
  const series = toSeries([{ time: 0, rechts: null, links: { x: 4, y: 1 } }], CALIBRATION);
  assert.equal(series.rechts.length, 0);
  assert.deepEqual(series.mittel[0], { time: 0, h: 4, v: 1, disagree: false });
});

test("Zielfehler stimmen und benennen das schlechteste Ziel", () => {
  const windows = ACCURACY_TARGETS.slice(0, 2).map((target, i) => ({ target, from: i * 1000, to: (i + 1) * 1000 }));
  const points = times(2000).map((time) => {
    const target = ACCURACY_TARGETS[Math.floor(time / 1000)];
    return { time, h: target.h + (time < 1000 ? 1 : 3), v: target.v };
  });
  const result = analyseTargets(windows, points);
  near(result.errorH, Math.sqrt(5), 1e-9);
  near(result.maxError, 3, 1e-9);
  assert.equal(result.worst, "links 12°");
});

test("Perfekte Blickfolge hat Gain 1 und keine Verzögerung", () => {
  const run = PURSUIT_RUNS[0];
  const points = times(run.durationMs, 1000).map((time) => ({
    time, h: 10 * Math.sin(2 * Math.PI * run.frequency * ((time - 1000) / 1000)), v: 0,
  }));
  const result = analysePursuit(points, run, 1000);
  near(result.gain, 1, 1e-6);
  near(result.lagMs, 0, 1e-3);
  near(result.residual, 0, 1e-6);
  assert.equal(result.catchUpsPerCycle, 0);
});

test("Bekannter Gain, Verzögerung und Aufholsakkaden werden gefunden", () => {
  const run = PURSUIT_RUNS[0];
  const points = times(run.durationMs).map((time) => {
    const phase = 2 * Math.PI * run.frequency * ((time - 100) / 1000);
    return { time, h: 8 * Math.sin(phase) + (Math.floor(time / 500) % 2) * 2, v: 0 };
  });
  const result = analysePursuit(points, run, 0);
  near(result.gain, 0.8, 0.1);
  near(result.lagMs, 100, 25);
  assert.ok(result.catchUpsPerCycle >= 1);
});

function saccadeTrace(gain, latencyMs) {
  const jumps = [{ axis: "h", at: 1000, from: 0, to: 10 }, { axis: "h", at: 2500, from: 10, to: -10 }];
  const points = times(4000).map((time) => {
    let h = 0;
    if (time >= jumps[0].at + latencyMs) h = 10 * gain;
    if (time >= jumps[1].at + latencyMs) h = -10 * gain;
    return { time, h, v: 0 };
  });
  return { points, jumps };
}

test("Hypometrische Sakkaden ergeben den bekannten Gain", () => {
  const { points, jumps } = saccadeTrace(0.8, 200);
  const result = analyseSaccades(points, jumps);
  assert.equal(result.h.count, 2);
  near(result.h.endGain, 0.8, 0.01);
  near(result.h.latency, 200, FRAME_MS + 1);
  assert.equal(result.v, null);
});

test("Fehlende Reaktion ergibt keine erfundene Latenz", () => {
  const jumps = [{ axis: "h", at: 1000, from: 0, to: 10 }];
  const points = times(3000).map((time) => ({ time, h: 0, v: 0 }));
  const result = analyseSaccades(points, jumps);
  assert.equal(result.h.latency, null);
  near(result.h.endGain, 0, 1e-9);
});

test("Ohne gültige Augenwerte ist das Ergebnis nicht auswertbar", () => {
  const run = {
    fixation: { samples: times(1000).map((time) => ({ time, rechts: null, links: null })) },
    accuracy: { samples: [], windows: [] },
    pursuit: PURSUIT_RUNS.map((entry) => ({ run: entry, startTime: 0, samples: [] })),
    saccades: { samples: [], jumps: [] },
  };
  const report = analyseRun(run, { ...CALIBRATION, passed: false, rechts: { ...EYE, passedH: false, passedV: false }, links: { ...EYE, passedH: false, passedV: false }, mittel: { ...EYE, passedH: false, passedV: false } });
  assert.equal(report.fixation.mittel, null);
  assert.equal(report.grade.summary.headline, "Beide Achsen unzuverlässig");
  assert.ok(report.grade.summary.lines[0].startsWith("Kalibrierung nicht bestanden"));
  assert.ok(report.grade.rows.every((row) => row.level === "nicht auswertbar"));
});

test("Der Bericht trennt die Achsen und nennt die Abdeckung", () => {
  const report = {
    calibration: { passed: true, passedH: true, passedV: true },
    fixation: { mittel: { validShare: 0.97, coverageH: 0.97, coverageV: 0.97, robustSdH: 0.3, robustSdV: 0.5 } },
    accuracy: { mittel: { errorH: 1, errorV: 1.5 } },
    pursuit: { langsam: { mittel: { gain: 0.95 } }, schnell: { mittel: { gain: 0.9 } } },
    saccades: { mittel: { h: { endGain: 0.95 }, v: { endGain: 0.9 } } },
  };
  assert.equal(grade(report).summary.headline, "Beide Achsen nutzbar");
  report.fixation.mittel.robustSdV = 2.5;
  const summary = grade(report).summary;
  assert.equal(summary.headline, "Horizontal nutzbar, vertikal unzuverlässig");
  assert.ok(summary.lines[1].includes("Abdeckung 97 %"));
  report.calibration.passedH = false;
  assert.equal(grade(report).summary.usableH, false);
  report.calibration.passedV = true;
  report.fixation.mittel.robustSdV = 0.5;
  report.saccades.mittel.v.endGain = 1.5;
  assert.equal(grade(report).summary.usableV, false);
});

test("Der Filter trennt Rauschen von einer echten Sakkade", () => {
  const random = noise(1.5);
  const samples = times(3000).map((time) => {
    const eye = time >= 1500 ? 10 : 0;
    return { time, rechts: { x: eye + random(), y: 0 }, links: { x: eye + random(), y: 0 } };
  });
  const series = toSeries(samples, CALIBRATION);
  const result = analyseSaccades(series.mittel, [{ axis: "h", at: 1300, from: 0, to: 10 }]);
  near(result.h.endGain, 1, 0.1);
  near(result.h.latency, 200, 3 * FRAME_MS);
});
