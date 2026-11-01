// Berichtsmodell aus einem gespeicherten Gütetest. Reine Rechenlogik ohne Browserbezug.
//
// Rechnet aus den Rohdaten mit derselben Kalibrierung und Auswertung wie die Messseite neu.
// Beschreibt Beobachtungen und ihre Grenzen. Keine Interpretation, keine Normbereiche, keine Diagnose.

import { calibrate, median } from "./kalibrierung-logik.js";
import { analyseRun, scaleFromSaccades, toSeries } from "./guetetest-logik.js";
import { analyseBlock, controlVerdict, directionWord, oknStatus } from "./okn-logik.js";
import { analyseNystagmus, analyseSaccadeMetrics, analyseSmoothPursuit, analyseSwj, judgeNystagmus, judgePursuit,
         judgeSaccades, judgeSwj, LIMITS, STATUS, withoutLidEvents } from "./befund-logik.js";

export const REPORT_VERSION = "bericht-5";
const SPAN_GAP_MS = 150;
const LID_LOW_SHARE = 0.75;
const ENDPOINT_SETTLE_MS = 600;
const ENDPOINT_MAX_MS = 1800;
const MIN_ENDPOINT_POINTS = 3;

export const NOT_EXAMINED = [
  "Blickhalten über den Bildschirmrand hinaus",
  "Vertikale Blickfolge",
  "Fixationsausschaltung",
  "Torsion",
  "Vergenz",
  "Vestibulookuläre Funktionen",
];

export const NOT_EXAMINED_OKN_ONLY = [
  "Spontannystagmus",
  "Blickrichtung",
  "Square-Wave-Jerks",
  "Blickfolge",
  "Sakkaden (die Sprünge dienen nur als Maßstab)",
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
    ...(run.gaze ?? []).flatMap((entry) => span(`Blick ${entry.target.name}`, entry.samples)),
    ...span("Neue Ziele", run.accuracy?.samples),
    ...(run.pursuit ?? []).flatMap((entry) => span(`Folge ${entry.run.name}`, entry.samples)),
    ...span("Sprünge", run.saccades?.samples),
    ...(run.okn ?? []).flatMap((entry) => span(entry.block.label, entry.samples)),
  ].sort((a, b) => a.from - b.from);
}

function eventRows(run, meta) {
  const samples = [
    ...(run.calibration ?? []).flatMap((entry) => entry.samples),
    ...(run.fixation?.samples ?? []),
    ...(run.gaze ?? []).flatMap((entry) => entry.samples),
    ...(run.accuracy?.samples ?? []),
    ...(run.pursuit ?? []).flatMap((entry) => entry.samples),
    ...(run.saccades?.samples ?? []),
    ...(run.okn ?? []).flatMap((entry) => entry.samples),
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

const WORST = [STATUS.abnormal, STATUS.border, STATUS.normal, STATUS.unknown];
const worstOf = (items) => WORST.find((status) => items.some((item) => item.status === status)) ?? STATUS.unknown;

function eyesOf(series) {
  return { rechts: series.rechts, links: series.links };
}

function gazeFindings(run, calibration, lidSpans) {
  const releasedH = Boolean(calibration.mittel?.passedH);
  const releasedV = Boolean(calibration.mittel?.passedV);
  return (run.gaze ?? []).map((entry) => {
    const series = toSeries(entry.samples, calibration);
    const points = withoutLidEvents(series.mittel, lidSpans);
    return {
      name: entry.target.name,
      angle: Math.max(Math.abs(entry.target.h), Math.abs(entry.target.v)),
      horizontal: judgeNystagmus(analyseNystagmus(points, "h", eyesOf(series)), "h", releasedH),
      vertical: judgeNystagmus(analyseNystagmus(points, "v", eyesOf(series)), "v", releasedV),
    };
  });
}

const number = (value, digits = 1) => value.toFixed(digits).replace(".", ",");

function oknFindings(run, calibration) {
  const blocks = (run.okn ?? []).filter((entry) => entry.block.kind === "moving" || entry.block.kind === "control");
  if (!blocks.length) return null;
  const analysed = blocks.map((entry) => {
    const series = toSeries(entry.samples, calibration);
    const raw = toSeries(entry.samples, calibration, { filter: false }).mittel;
    const result = analyseBlock(series, raw, entry.block, Math.round(entry.block.durationMs / (1000 / 30)));
    const beat = result.consistent === false && result.beats
      ? `keine einheitliche Schlagrichtung, ${result.jumpsRight} Sprünge nach rechts, ${result.jumpsLeft} nach links`
      : result.beats ? `${result.beats} Schläge nach ${directionWord(result.beatDirection)}, ${number(result.rate)}/s` : "keine Schläge";
    const speed = result.spv === null ? "langsame Phase nicht messbar"
      : `langsame Phase ${number(result.spv)} °/s, ${result.phases} Phasen${result.quantifiable ? "" : ", zu wenige für einen Wert"}`;
    return {
      label: entry.block.label,
      kind: entry.block.kind,
      block: entry.block,
      points: series.mittel,
      result,
      status: oknStatus(result.state),
      text: `${result.state}. ${beat}; ${speed}.`,
    };
  });
  const moving = analysed.filter((item) => item.kind === "moving");
  const control = analysed.find((item) => item.kind === "control");
  return {
    items: analysed,
    status: worstOf(moving),
    conform: moving.filter((item) => item.status === STATUS.normal).length,
    total: moving.length,
    control: control ? controlVerdict(moving.map((item) => item.result), control.result) : null,
  };
}

// Reine Optokinetik-Datei: Streifenblöcke vorhanden, weder Blickhalten noch Blickfolge.
export function isOknOnly(run) {
  return (run.okn?.length ?? 0) > 0 && !(run.gaze?.length) && !(run.pursuit?.length);
}

function findings(run, calibration, summary, timeline) {
  const releasedH = Boolean(calibration.mittel?.passedH);
  const releasedV = Boolean(calibration.mittel?.passedV);
  const lidSpans = timeline.rows.find((row) => row.name.startsWith("Lidsenkung"))?.spans ?? [];
  if (isOknOnly(run)) return { okn: oknFindings(run, calibration), limits: LIMITS };
  const rest = toSeries(run.fixation.samples, calibration);
  const restPoints = withoutLidEvents(rest.mittel, lidSpans);
  const spontaneous = {
    horizontal: judgeNystagmus(analyseNystagmus(restPoints, "h", eyesOf(rest)), "h", releasedH),
    vertical: judgeNystagmus(analyseNystagmus(restPoints, "v", eyesOf(rest)), "v", releasedV),
  };
  const gaze = gazeFindings(run, calibration, lidSpans);
  const beats = gaze.flatMap((cell) => [cell.horizontal, cell.vertical]).filter((item) => item.status !== STATUS.normal && item.status !== STATUS.unknown);
  const verticalBeat = (word) => {
    const places = gaze.filter((cell) => cell.vertical.text.includes(word)).map((cell) => cell.name);
    if (spontaneous.vertical.text.includes(word)) places.unshift("Primärposition");
    return places;
  };
  const swj = judgeSwj(analyseSwj(restPoints, eyesOf(rest)), releasedH);
  const pursuit = (run.pursuit ?? []).map((entry) => {
    const series = toSeries(entry.samples, calibration);
    return {
      name: entry.run.name,
      frequency: entry.run.frequency,
      ...judgePursuit(analyseSmoothPursuit(series.mittel, entry.run, entry.startTime, eyesOf(series)), releasedH),
    };
  });
  const saccadeSeries = toSeries(run.saccades.samples, calibration);
  const metrics = analyseSaccadeMetrics(saccadeSeries.mittel, run.saccades.jumps);
  // Der grobe Maßstab nutzt die Endlagen. Die erste Landung bleibt deshalb auch ohne Kalibrierung aussagekräftig.
  const measurable = (item) => item && (!calibration.selfScaled || item.firstGain !== null);
  const judge = (name, item, released, options) => judgeSaccades(name, measurable(item) ? item : null, released, options);
  const saccades = [
    judge("Rechts", metrics.rechts, releasedH),
    judge("Links", metrics.links, releasedH),
    judge("Oben", metrics.oben, true, { uncertain: !summary.usableV }),
    judge("Unten", metrics.unten, true, { uncertain: !summary.usableV }),
  ];
  return {
    spontaneous: { ...spontaneous, status: worstOf([spontaneous.horizontal, spontaneous.vertical]) },
    gaze,
    gazeStatus: gaze.length ? worstOf(gaze.flatMap((cell) => [cell.horizontal, cell.vertical])) : STATUS.unknown,
    gazeExamined: gaze.length > 0,
    gazeHits: beats.length,
    downbeat: verticalBeat("Downbeat"),
    upbeat: verticalBeat("Upbeat"),
    swj,
    pursuit,
    pursuitStatus: worstOf(pursuit),
    saccades,
    saccadeStatus: worstOf(saccades),
    okn: oknFindings(run, calibration),
    limits: LIMITS,
  };
}

// Nullpunkt je Etappe aus der Sekunde Hinführung. Nur eine Anzeige, keine Korrektur der Messwerte.
function stageFindings(run, meta, calibration) {
  if (!run.stages?.length) return null;
  const pick = (points, key) => {
    const values = points.map((p) => p[key]).filter((value) => value !== null && value !== undefined);
    return values.length ? median(values) : null;
  };
  const rows = run.stages.map((stage) => {
    const points = toSeries(stage.leadSamples ?? [], calibration).mittel;
    return {
      id: stage.id,
      title: stage.title,
      h: pick(points, "h"),
      v: pick(points, "v"),
      waitMs: stage.waitMs ?? null,
      repeats: stage.repeats ?? 0,
      headShift: stage.headShift ?? null,
    };
  });
  return {
    rows,
    waitMs: rows.reduce((sum, row) => sum + (row.waitMs ?? 0), 0),
    repeats: rows.reduce((sum, row) => sum + row.repeats, 0),
    calibrationRepeated: Boolean(run.calibrationRetry),
  };
}

// Anstrengung: fehlt in alten Dateien (absent), null = übersprungen.
function effortOf(meta) {
  if (meta?.effort === undefined) return { state: "absent", value: null };
  return meta.effort === null ? { state: "skipped", value: null } : { state: "value", value: meta.effort };
}

function section(id, title, status, extra = {}) {
  return { id, title, status, ...extra };
}

// Einzelne Module lassen Teile aus. Fehlendes wird leer und zählt als nicht untersucht.
function withEmptyParts(run) {
  return { ...run, fixation: run.fixation ?? { samples: [] }, saccades: run.saccades ?? { samples: [], jumps: [] } };
}

function examinedParts(run) {
  return {
    spontaneous: run.fixation.samples.length > 0,
    gaze: (run.gaze?.length ?? 0) > 0,
    pursuit: (run.pursuit?.length ?? 0) > 0,
    saccades: run.saccades.jumps.length > 0 && !run.saccades.scaleOnly,
    okn: (run.okn?.length ?? 0) > 0,
  };
}

export function buildReport(data) {
  const { meta } = data;
  const run = withEmptyParts(data.run);
  const calibration = run.calibration?.length ? calibrate(run.calibration) : scaleFromSaccades(run);
  const analysis = analyseRun(run, calibration);
  const { summary } = analysis.grade;
  const seriesOf = (samples) => toSeries(samples, calibration);
  const fixationSeries = seriesOf(run.fixation.samples);
  const accuracySeries = seriesOf(run.accuracy?.samples ?? []);
  const saccadeSeries = seriesOf(run.saccades.samples);
  const fixation = analysis.fixation.mittel;
  const centerOf = (key) => {
    const values = fixationSeries.mittel.map((p) => p[key]).filter((value) => value !== null);
    return values.length ? median(values) : 0;
  };
  const center = { h: centerOf("h"), v: centerOf("v") };
  const targets = targetEstimates(run.accuracy?.windows ?? [], accuracySeries.mittel);
  const endpoints = saccadeEndpoints(run.saccades.jumps, saccadeSeries.mittel);
  const pursuit = (run.pursuit ?? []).map((entry) => {
    const series = seriesOf(entry.samples);
    return {
      name: entry.run.name,
      run: entry.run,
      startTime: entry.startTime,
      series,
      stats: analysis.pursuit[entry.run.name]?.mittel ?? null,
    };
  });
  const timeline = { phases: phases(run), rows: eventRows(run, meta) };
  const oknOnly = isOknOnly(run);
  const status = (usable, hasData) => {
    if (!hasData) return "nicht auswertbar";
    return usable ? "horizontal nutzbar" : "eingeschränkt";
  };
  return {
    version: REPORT_VERSION,
    meta,
    summary: oknOnly ? { ...summary, headline: "Nur Optokinetik, Maßstab aus Sprüngen" } : summary,
    oknOnly,
    examined: examinedParts(run),
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
        targets, stats: analysis.accuracy.mittel, planned: run.accuracy?.windows.length ?? 0,
      }),
      section("saccades", "Sprünge", status(summary.usableH, endpoints.length > 0), {
        endpoints, stats: analysis.saccades.mittel,
      }),
      section("pursuit", "Blickfolge", status(summary.usableH, pursuit.some((entry) => entry.stats)), { runs: pursuit }),
    ],
    timeline,
    stages: stageFindings(run, meta, calibration),
    effort: effortOf(meta),
    findings: findings(run, calibration, summary, timeline),
    notExamined: oknOnly ? [...NOT_EXAMINED_OKN_ONLY, ...NOT_EXAMINED] : NOT_EXAMINED,
  };
}
