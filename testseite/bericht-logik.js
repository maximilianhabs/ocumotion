// Berichtsmodell aus einem gespeicherten Gütetest. Reine Rechenlogik ohne Browserbezug.
//
// Rechnet aus den Rohdaten mit derselben Kalibrierung und Auswertung wie die Messseite neu.
// Beschreibt Beobachtungen und ihre Grenzen. Keine Interpretation, keine Normbereiche, keine Diagnose.

import { calibrate, median } from "./kalibrierung-logik.js";
import { analyseRun, toSeries } from "./guetetest-logik.js";

export const REPORT_VERSION = "bericht-1";
const SPAN_GAP_MS = 150;
const LID_LOW_SHARE = 0.75;
const ENDPOINT_SETTLE_MS = 600;
const ENDPOINT_MAX_MS = 1800;
const MIN_ENDPOINT_POINTS = 3;

export const NOT_EXAMINED = [
  "Nystagmus: keine automatische Erkennung vorhanden",
  "Exzentrisches Blickhalten",
  "Vertikale Blickfolge",
  "Fixationsausschaltung",
  "Torsion",
  "Vergenz",
  "Vestibulookuläre Funktionen",
  "Optokinetik",
];

// Fasst Zeitpunkte zu Spannen zusammen; ein einzelner Punkt bleibt eine kurze Spanne.
export function toSpans(times, gapMs = SPAN_GAP_MS) {
  const spans = [];
  for (const time of times) {
    const last = spans.at(-1);
    if (last && time - last.to <= gapMs) last.to = time;
    else spans.push({ from: time, to: time });
  }
  return spans;
}

function phases(run) {
  const span = (name, samples) => (samples?.length
    ? [{ name, from: samples[0].time, to: samples.at(-1).time }] : []);
  return [
    ...span("Kalibrierung", (run.calibration ?? []).flatMap((entry) => entry.samples)),
    ...span("Ruhe", run.fixation?.samples),
    ...span("Neue Ziele", run.accuracy?.samples),
    ...(run.pursuit ?? []).flatMap((entry) => span(`Folge ${entry.run.name}`, entry.samples)),
    ...span("Sprünge", run.saccades?.samples),
  ];
}

function eventRows(run, meta) {
  const samples = [
    ...(run.calibration ?? []).flatMap((entry) => entry.samples),
    ...(run.fixation?.samples ?? []),
    ...(run.accuracy?.samples ?? []),
    ...(run.pursuit ?? []).flatMap((entry) => entry.samples),
    ...(run.saccades?.samples ?? []),
  ].sort((a, b) => a.time - b.time);
  const invalid = samples.filter((s) => !s.rechts || !s.links).map((s) => s.time);
  const apertures = samples.flatMap((s) => [s.rechts?.aperture, s.links?.aperture])
    .filter((value) => value !== undefined);
  const lidTimes = [];
  if (apertures.length) {
    const limit = median(apertures) * LID_LOW_SHARE;
    for (const sample of samples) {
      const values = [sample.rechts?.aperture, sample.links?.aperture].filter((value) => value !== undefined);
      if (values.length && Math.min(...values) < limit) lidTimes.push(sample.time);
    }
  }
  return [
    { name: "Ungültige Bilder", spans: toSpans(invalid), available: true },
    { name: "Lidsenkung, Kandidat", spans: toSpans(lidTimes), available: apertures.length > 0 },
    {
      name: "Kopfbewegung",
      spans: (meta?.headEvents ?? []).map((event) => ({ from: event.time, to: event.time })),
      available: Array.isArray(meta?.headEvents),
    },
  ];
}

function targetEstimates(windows, points) {
  return windows.flatMap((window) => {
    const inside = points.filter((p) => p.time >= window.from && p.time < window.to);
    const h = inside.map((p) => p.h).filter((value) => value !== null);
    const v = inside.map((p) => p.v).filter((value) => value !== null);
    if (!h.length && !v.length) return [];
    return [{
      name: window.target.name,
      targetH: window.target.h,
      targetV: window.target.v,
      h: h.length ? median(h) : null,
      v: v.length ? median(v) : null,
    }];
  });
}

function saccadeEndpoints(jumps, points) {
  return jumps.flatMap((jump, index) => {
    const end = jumps[index + 1]?.at ?? jump.at + ENDPOINT_MAX_MS;
    const values = points
      .filter((p) => p.time >= jump.at + ENDPOINT_SETTLE_MS && p.time < end && p[jump.axis] !== null)
      .map((p) => p[jump.axis]);
    if (values.length < MIN_ENDPOINT_POINTS) return [];
    return [{ axis: jump.axis, target: jump.to, end: median(values) }];
  });
}

function section(id, title, status, extra = {}) {
  return { id, title, status, ...extra };
}

export function buildReport(data) {
  const { run, meta } = data;
  const calibration = calibrate(run.calibration);
  const analysis = analyseRun(run, calibration);
  const { summary } = analysis.grade;
  const seriesOf = (samples) => toSeries(samples, calibration);
  const fixationSeries = seriesOf(run.fixation.samples);
  const accuracySeries = seriesOf(run.accuracy.samples);
  const saccadeSeries = seriesOf(run.saccades.samples);
  const fixation = analysis.fixation.mittel;
  const centerOf = (key) => {
    const values = fixationSeries.mittel.map((p) => p[key]).filter((value) => value !== null);
    return values.length ? median(values) : 0;
  };
  const center = { h: centerOf("h"), v: centerOf("v") };
  const targets = targetEstimates(run.accuracy.windows, accuracySeries.mittel);
  const endpoints = saccadeEndpoints(run.saccades.jumps, saccadeSeries.mittel);
  const pursuit = run.pursuit.map((entry) => {
    const series = seriesOf(entry.samples);
    return {
      name: entry.run.name,
      run: entry.run,
      startTime: entry.startTime,
      series,
      stats: analysis.pursuit[entry.run.name]?.mittel ?? null,
    };
  });
  const status = (usable, hasData) => {
    if (!hasData) return "nicht auswertbar";
    return usable ? "horizontal nutzbar" : "eingeschränkt";
  };
  return {
    version: REPORT_VERSION,
    meta,
    summary,
    calibration,
    analysis,
    condition: "Beobachtung unter visueller Fixation. Testperson nicht klinisch beurteilt.",
    sections: [
      section("fixation", "Ruhe", status(summary.usableH, Boolean(fixation)), {
        points: fixationSeries.mittel.filter((p) => p.h !== null && p.v !== null)
          .map((p) => ({ h: p.h - center.h, v: p.v - center.v })),
        stats: fixation,
      }),
      section("targets", "Neue Ziele", status(summary.usableH, targets.length > 0), {
        targets, stats: analysis.accuracy.mittel, planned: run.accuracy.windows.length,
      }),
      section("saccades", "Sprünge", status(summary.usableH, endpoints.length > 0), {
        endpoints, stats: analysis.saccades.mittel,
      }),
      section("pursuit", "Blickfolge", status(summary.usableH, pursuit.some((entry) => entry.stats)), { runs: pursuit }),
    ],
    timeline: { phases: phases(run), rows: eventRows(run, meta) },
    notExamined: NOT_EXAMINED,
  };
}
