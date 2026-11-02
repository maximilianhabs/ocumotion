// Berichtsmodell gegen einen konstruierten Lauf. Aufruf: make test
import assert from "node:assert/strict";
import { test } from "node:test";
import { ACCURACY_TARGETS } from "../app/messung/guetetest-logik.js";
import { buildReport, NOT_EXAMINED, toSpans } from "../app/messung/bericht-logik.js";
import { fullRun, samples } from "./beispiellauf.mjs";

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
  assert.equal(findings.spontaneous.horizontal.status, "innerhalb");
  assert.equal(findings.gazeExamined, false);
  assert.equal(findings.gazeStatus, "nicht beurteilbar");
  assert.deepEqual(findings.downbeat, []);
  assert.equal(findings.pursuit[0].status, "innerhalb");
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
  assert.equal(findings.gaze[0].vertical.status, "innerhalb");
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
  assert.ok(report.summary.headline.startsWith("Ohne Kalibrierung"));
  assert.equal(report.findings.saccades[0].status, "nicht beurteilbar");
  assert.equal(report.findings.spontaneous.horizontal.status, "innerhalb");
  assert.equal(report.findings.pursuit[0].status, "innerhalb");
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

function oknOnlyRun() {
  const jumps = [
    { axis: "h", from: 0, to: 10 }, { axis: "h", from: 10, to: -10 }, { axis: "h", from: -10, to: 10 }, { axis: "h", from: 10, to: 0 },
  ].map((jump, index) => ({ ...jump, at: 10000 + index * 1500 }));
  const pick = (time) => jumps.filter((jump) => time >= jump.at + 200).at(-1)?.to ?? 0;
  const blocks = [["links", "moving", -1, 30000], ["kontrolle", "control", 1, 50000]];
  return {
    fixation: { samples: samples(3000, 0, () => ({ h: 0, v: 0 })) },
    gaze: [],
    pursuit: [],
    saccades: { jumps, samples: samples(8000, 9000, (time) => ({ h: pick(time), v: 0 })) },
    okn: blocks.map(([id, kind, direction, from]) => ({
      block: { id, label: id, kind, direction, durationMs: 12000, from, to: from + 12000 },
      samples: samples(12000, from, (time) => {
        const slow = (((time - from) / 1000) % 0.6) * 6;
        return { h: kind === "control" ? 0 : direction * (slow - 1.8), v: 0 };
      }),
    })),
  };
}

test("Eine reine Optokinetik-Datei baut ohne Fehler und behauptet nichts zu Sakkaden oder Blickfolge", () => {
  const report = buildReport({ run: oknOnlyRun(), meta: META });
  assert.equal(report.oknOnly, true);
  assert.equal(report.version, "bericht-5");
  assert.equal(report.summary.headline, "Nur Optokinetik, Maßstab aus Sprüngen");
  assert.equal(report.calibration.selfScaled, true);
  const { findings } = report;
  assert.equal(findings.okn.total, 1);
  assert.ok(findings.okn.control);
  for (const key of ["spontaneous", "gaze", "swj", "pursuit", "pursuitStatus", "saccades", "saccadeStatus", "gazeStatus"]) {
    assert.equal(findings[key], undefined, key);
  }
  assert.ok(report.notExamined.includes("Blickfolge"));
});

test("Ein langer Lauf ohne Optokinetik baut ohne Fehler und lässt den Abschnitt weg", () => {
  const run = fullRun();
  run.okn = [];
  run.gaze = [];
  const report = buildReport({ run, meta: META });
  assert.equal(report.oknOnly, false);
  assert.equal(report.findings.okn, null);
  assert.ok(report.findings.spontaneous);
});

test("Ein alter langer Lauf mit Optokinetik gilt nicht als reine Optokinetik", () => {
  const run = fullRun();
  const start = 800000;
  const from = start;
  run.okn = [{ block: { id: "rechts", label: "rechts", kind: "moving", direction: 1, durationMs: 12000, from, to: from + 12000 },
               samples: samples(12000, from, () => ({ h: 0, v: 0 })) }];
  const report = buildReport({ run, meta: META });
  assert.equal(report.oknOnly, false);
  assert.ok(report.findings.okn);
});

function stagedRun() {
  const run = fullRun();
  const lead = (h) => samples(1000, 900000, () => ({ h, v: -1 }));
  run.stages = [
    { id: "ruhe", title: "Ruhe", shownAt: 1, continuedAt: 4001, waitMs: 4000, leadSamples: lead(0.5), headShift: 0.8, repeats: 0 },
    { id: "folge-langsam", title: "Blickfolge langsam", shownAt: 1, continuedAt: 6001, waitMs: 6000, leadSamples: lead(1), headShift: 1.5, repeats: 1 },
  ];
  return run;
}

test("Etappen ergeben den Nullpunkt je Etappe samt Wartezeit und Wiederholungen", () => {
  const report = buildReport({ run: stagedRun(), meta: { ...META, effort: 3 } });
  const { stages } = report;
  assert.equal(stages.rows.length, 2);
  assert.ok(Math.abs(stages.rows[0].h - 0.5) < 0.1, `${stages.rows[0].h}`);
  assert.ok(Math.abs(stages.rows[1].v + 1) < 0.1, `${stages.rows[1].v}`);
  assert.equal(stages.waitMs, 10000);
  assert.equal(stages.repeats, 1);
  assert.equal(stages.calibrationRepeated, false);
  assert.deepEqual(report.effort, { state: "value", value: 3 });
});

test("Dateien ohne Etappen haben keinen Abschnitt und bauen unverändert", () => {
  const report = buildReport({ run: fullRun(), meta: META });
  assert.equal(report.stages, null);
  assert.deepEqual(report.effort, { state: "absent", value: null });
});

test("Die Anstrengung unterscheidet übersprungen von einer Zahl", () => {
  const run = stagedRun();
  assert.deepEqual(buildReport({ run, meta: { ...META, effort: null } }).effort, { state: "skipped", value: null });
  assert.equal(buildReport({ run, meta: { ...META, effort: 5 } }).effort.value, 5);
});

test("Fehlende Hinführung ergibt keinen Nullpunkt statt eines Fehlers", () => {
  const run = fullRun();
  run.stages = [{ id: "ruhe", title: "Ruhe", leadSamples: [], waitMs: 1000, repeats: 0 }];
  const { rows } = buildReport({ run, meta: META }).stages;
  assert.equal(rows[0].h, null);
  assert.equal(rows[0].v, null);
});
