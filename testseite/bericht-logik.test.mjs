// Berichtsmodell gegen einen konstruierten Lauf. Aufruf: make test
import assert from "node:assert/strict";
import { test } from "node:test";
import { ACCURACY_TARGETS, PURSUIT_RUNS } from "./guetetest-logik.js";
import { STEPS } from "./kalibrierung-logik.js";
import { buildReport, NOT_EXAMINED, toSpans } from "./bericht-logik.js";

const FRAME_MS = 1000 / 30;
const eyeAt = (h, v) => ({ x: 0.04 + 0.018 * h, y: 0.018 * v, aperture: 0.36 });

function samples(durationMs, start, position) {
  return Array.from({ length: Math.floor(durationMs / FRAME_MS) }, (_, i) => {
    const time = start + i * FRAME_MS;
    const { h, v } = position(time);
    return { t: time, time, rechts: eyeAt(h, v), links: eyeAt(h, v), irisPx: 30, head: { x: 640, y: 300 } };
  });
}

function fullRun() {
  let clock = 0;
  const phase = (durationMs, position) => {
    const list = samples(durationMs, clock, position);
    clock += durationMs + 500;
    return list;
  };
  const calibration = STEPS.map((target) => ({ target, samples: phase(2800, () => target) }));
  const fixation = { samples: phase(20000, () => ({ h: 0, v: 0 })) };
  const windows = [];
  const accuracySamples = ACCURACY_TARGETS.flatMap((target) => {
    const from = clock;
    const list = phase(1800, () => target);
    windows.push({ target, from, to: from + 1800 });
    return list;
  });
  const pursuit = PURSUIT_RUNS.map((run) => {
    const startTime = clock;
    const list = phase(run.durationMs, (time) => ({
      h: run.amplitude * Math.sin(2 * Math.PI * run.frequency * ((time - startTime) / 1000)), v: 0,
    }));
    return { run, startTime, samples: list };
  });
  const start = clock;
  const jumps = [
    { axis: "h", from: 0, to: 10, at: start + 1000 },
    { axis: "h", from: 10, to: -10, at: start + 2500 },
  ];
  const saccadeSamples = phase(4000, (time) => {
    if (time >= jumps[1].at + 200) return { h: -10, v: 0 };
    if (time >= jumps[0].at + 200) return { h: 10, v: 0 };
    return { h: 0, v: 0 };
  });
  return {
    calibration, fixation, accuracy: { samples: accuracySamples, windows }, pursuit,
    saccades: { samples: saccadeSamples, jumps },
  };
}

const META = { smoothing: "Test", headEvents: [] };

test("Ein vollständiger Lauf ergibt alle Abschnitte mit echten Werten", () => {
  const report = buildReport({ run: fullRun(), meta: META });
  assert.deepEqual(report.sections.map((s) => s.id), ["fixation", "targets", "saccades", "pursuit"]);
  assert.equal(report.calibration.passed, true);
  const targets = report.sections[1];
  assert.equal(targets.targets.length, ACCURACY_TARGETS.length);
  assert.ok(Math.abs(targets.targets[0].h - targets.targets[0].targetH) < 0.05);
  const saccades = report.sections[2];
  assert.equal(saccades.endpoints.length, 2);
  assert.ok(Math.abs(saccades.endpoints[0].end - 10) < 0.05);
});

test("Nicht Untersuchtes bleibt immer sichtbar", () => {
  const report = buildReport({ run: fullRun(), meta: META });
  assert.deepEqual(report.notExamined, NOT_EXAMINED);
  assert.ok(report.notExamined.some((line) => line.startsWith("Torsion")));
  assert.ok(report.condition.includes("visueller Fixation"));
});

test("Ungültige Bilder erscheinen als Spannen und nicht als Daten", () => {
  const run = fullRun();
  run.fixation.samples.slice(100, 110).forEach((sample) => { sample.rechts = null; sample.links = null; });
  const report = buildReport({ run, meta: META });
  const invalid = report.timeline.rows.find((row) => row.name === "Ungültige Bilder");
  assert.equal(invalid.spans.length, 1);
  assert.equal(report.sections[0].points.length, run.fixation.samples.length - 10);
});

test("Lidsenkung wird nur als Kandidat geführt und fehlt bei alten Dateien", () => {
  const run = fullRun();
  run.fixation.samples[50].rechts = { ...run.fixation.samples[50].rechts, aperture: 0.1 };
  const row = buildReport({ run, meta: META }).timeline.rows.find((r) => r.name.startsWith("Lidsenkung"));
  assert.equal(row.spans.length, 1);
  const old = fullRun();
  for (const list of [old.fixation.samples, old.accuracy.samples, old.saccades.samples,
    ...old.calibration.map((e) => e.samples), ...old.pursuit.map((e) => e.samples)]) {
    for (const sample of list) {
      delete sample.rechts.aperture;
      delete sample.links.aperture;
    }
  }
  assert.equal(buildReport({ run: old, meta: META }).timeline.rows[1].available, false);
});

test("Ohne Daten bleibt ein Abschnitt nicht auswertbar statt unauffällig", () => {
  const run = fullRun();
  run.accuracy = { samples: [], windows: [] };
  run.saccades = { samples: [], jumps: [] };
  const report = buildReport({ run, meta: META });
  assert.equal(report.sections[1].status, "nicht auswertbar");
  assert.equal(report.sections[2].status, "nicht auswertbar");
  assert.equal(report.summary.usableH, false);
});

test("Kopfereignisse fehlen bei alten Dateien als unbekannt", () => {
  const report = buildReport({ run: fullRun(), meta: { smoothing: "Test" } });
  assert.equal(report.timeline.rows[2].available, false);
});

test("Zeitpunkte werden zu Spannen zusammengefasst", () => {
  assert.deepEqual(toSpans([0, 33, 66, 1000]), [{ from: 0, to: 66 }, { from: 1000, to: 1000 }]);
  assert.deepEqual(toSpans([]), []);
});

test("Der Befund trennt Abschnitte und meldet fehlendes Blickhalten als nicht untersucht", () => {
  const { findings } = buildReport({ run: fullRun(), meta: META });
  assert.equal(findings.spontaneous.horizontal.status, "unauffällig");
  assert.equal(findings.gazeExamined, false);
  assert.equal(findings.gazeStatus, "nicht beurteilbar");
  assert.deepEqual(findings.downbeat, []);
  assert.equal(findings.pursuit[0].status, "unauffällig");
});

test("Blickhalten erkennt Downbeat und nennt die Position", () => {
  const run = fullRun();
  let clock = 400000;
  const hold = (name, h, v, beat) => {
    const list = samples(7000, clock, (time) => {
      const phase = ((time - clock) % 500) / 500;
      // Downbeat: langsam nach oben, schnell zurück nach unten.
      return { h, v: v + (beat ? 6 * (phase - 0.5) : 0) };
    });
    clock += 9000;
    return { target: { name, h, v }, samples: list };
  };
  run.gaze = [hold("rechts", 15, 0, false), hold("links", -15, 0, false), hold("oben", 0, 10, false), hold("unten", 0, -10, true)];
  const { findings } = buildReport({ run, meta: META });
  assert.equal(findings.gazeExamined, true);
  assert.deepEqual(findings.downbeat, ["unten"]);
  assert.deepEqual(findings.upbeat, []);
  assert.equal(findings.gaze[0].vertical.status, "unauffällig");
});

test("Ohne Kalibrierung gibt der Kurzlauf Muster, aber keine Metrik aus", () => {
  const run = fullRun();
  delete run.calibration;
  delete run.accuracy;
  const jumps = [
    { axis: "h", from: 0, to: 10 }, { axis: "h", from: 10, to: -10 }, { axis: "h", from: -10, to: 10 }, { axis: "h", from: 10, to: 0 },
    { axis: "v", from: 0, to: 8 }, { axis: "v", from: 8, to: -8 }, { axis: "v", from: -8, to: 0 },
  ].map((jump, index) => ({ ...jump, at: 500000 + index * 1500 }));
  run.saccades = {
    jumps,
    samples: samples(11000, 500000, (time) => {
      const last = jumps.filter((jump) => time >= jump.at + 200);
      const pick = (axis) => last.filter((jump) => jump.axis === axis).at(-1)?.to ?? 0;
      return { h: pick("h"), v: pick("v") };
    }),
  };
  const report = buildReport({ run, meta: META });
  assert.equal(report.calibration.selfScaled, true);
  assert.ok(report.summary.headline.startsWith("Kurzlauf ohne Kalibrierung"));
  assert.equal(report.findings.saccades[0].status, "nicht beurteilbar");
  assert.equal(report.findings.spontaneous.horizontal.status, "unauffällig");
  assert.equal(report.findings.pursuit[0].status, "unauffällig");
});

test("Optokinetik erscheint als eigener Befund mit Kontrolle", () => {
  const run = fullRun();
  const start = 800000;
  const blocks = [["rechts", "moving", 1, 0], ["links", "moving", -1, 20000], ["kontrolle", "control", 1, 40000]];
  run.okn = blocks.map(([id, kind, direction, offset]) => {
    const from = start + offset;
    const list = samples(12000, from, (time) => {
      const slow = (((time - from) / 1000) % 0.6) * 6;
      return { h: kind === "control" ? 0 : direction * (slow - 1.8), v: 0 };
    });
    return { block: { id, label: id, kind, direction, durationMs: 12000, from, to: from + 12000 }, samples: list };
  });
  const { okn } = buildReport({ run, meta: META }).findings;
  assert.equal(okn.conform, 2);
  assert.equal(okn.total, 2);
  assert.equal(okn.control.suspicious, false);
});
