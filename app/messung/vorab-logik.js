// Kurze Rückmeldung direkt nach einem Modul. Die Noten der Kalibrierung sind Arbeitsgrenzen dieses Aufbaus, keine Norm.

import { median, toDegrees } from "./kalibrierung-logik.js";

export const TARGET_TOLERANCE_DEG = 2;

const GRADES = [
  { grade: "Hervorragend", tone: "good", maxError: 1, maxNoise: 0.75 },
  { grade: "Gut", tone: "good", maxError: 1.5, maxNoise: 1 },
  { grade: "Mittel", tone: "fair", maxError: Infinity, maxNoise: Infinity },
];

const number = (value, digits = 1) => (value === null || value === undefined ? "–" : value.toFixed(digits).replace(".", ","));
const degrees = (value, digits = 1) => (value === null || value === undefined ? "–" : `${number(value, digits)}°`);

const WHY = {
  "zu wenige gültige Bilder": () => "Zu wenige gültige Bilder. Prüfen Sie Licht und Position, und bleiben Sie im Bild.",
  "Tracking-Lücke": () => "Die Augen gingen zwischendurch verloren. Prüfen Sie Licht und Position.",
  "Einzelwerte zu unruhig": () => "Der Blick war auf den Punkten zu unruhig. Halten Sie den Kopf still und schauen Sie ruhig auf jeden Punkt.",
  "Prüffehler zu groß": (eye) => `Die Prüfpunkte lagen im Mittel ${degrees(eye.errorH)} daneben, erlaubt sind 2°. Häufig hat sich der Kopf bewegt.`,
};

export function gradeCalibration(calibration) {
  const eye = calibration.mittel;
  const rows = [
    ["Abweichung horizontal", degrees(eye.errorH)],
    ["Abweichung vertikal", degrees(eye.errorV)],
    ["Größte Abweichung", degrees(eye.maxError)],
    ["Unruhe horizontal", degrees(eye.noiseH, 2)],
    ["Unruhe vertikal", degrees(eye.noiseV, 2)],
    ["Gültige Bilder", eye.validShare === undefined || eye.validShare === null ? "–" : `${Math.round(eye.validShare * 100)} %`],
  ];
  const axes = `Horizontal ${eye.passedH ? "freigegeben" : "nicht freigegeben"}, vertikal ${eye.passedV ? "freigegeben" : "nicht freigegeben"}.`;
  if (!eye.passedH) {
    return { grade: "Schlecht", tone: "poor", text: `${WHY[eye.reasonH ?? eye.reason]?.(eye) ?? "Die Kalibrierung konnte nicht berechnet werden."} ${axes}`, rows };
  }
  const match = GRADES.find((item) => eye.errorH <= item.maxError && eye.noiseH <= item.maxNoise);
  return { grade: match.grade, tone: match.tone, text: `${axes} Im Mittel liegt der Blick ${degrees(eye.errorH)} neben den Prüfpunkten.`, rows };
}

// Soll und gemessener Blick je Punkt, für das Punktbild. Ohne Modell bleiben nur die Sollpunkte.
export function calibrationPoints(entries, calibration) {
  const model = calibration.mittel?.model;
  return entries.map((entry) => {
    const both = entry.samples.filter((sample) => sample.rechts && sample.links);
    const base = { h: entry.target.h, v: entry.target.v, role: entry.target.role, estH: null, estV: null, hit: false };
    if (!model || both.length < 3) return base;
    const at = (key) => median(both.map((sample) => (sample.rechts[key] + sample.links[key]) / 2));
    const estimate = toDegrees(model, at("x"), at("y"));
    return { ...base, estH: estimate.h, estV: estimate.v,
             hit: Math.hypot(estimate.h - base.h, estimate.v - base.v) <= TARGET_TOLERANCE_DEG };
  });
}

const SAMPLE_PARTS = (run) => [
  ...(run.fixation?.samples ?? []),
  ...(run.gaze ?? []).flatMap((entry) => entry.samples),
  ...(run.pursuit ?? []).flatMap((entry) => entry.samples),
  ...(run.saccades?.samples ?? []),
  ...(run.okn ?? []).flatMap((entry) => entry.samples),
  ...(run.calibration ?? []).flatMap((entry) => entry.samples),
  ...(run.accuracy?.samples ?? []),
];

// Anteil der Bilder dieses Laufs, in denen beide Augen gültig waren.
export function validShare(run) {
  const samples = SAMPLE_PARTS(run);
  if (!samples.length) return 0;
  return samples.filter((sample) => sample.rechts && sample.links).length / samples.length;
}

const LINES = {
  nystagmus: (f) => [
    { status: f.spontaneous.horizontal.status, text: `In Ruhe horizontal: ${f.spontaneous.horizontal.text}` },
    { status: f.spontaneous.vertical.status, text: `In Ruhe vertikal: ${f.spontaneous.vertical.text}` },
    { status: f.gazeStatus, text: f.gazeHits ? "Blickrichtung: Hinweis in mindestens einer Position." : "Blickrichtung: kein wiederholtes Ruckmuster." },
  ],
  blickfolge: (f) => f.pursuit.map((item) => ({ status: item.status, text: `${item.name}: ${item.text}` })),
  sakkaden: (f) => f.saccades.map((item) => ({ status: item.status, text: item.text })),
  optokinetik: (f) => (f.okn?.items ?? []).map((item) => ({ status: item.status, text: `${item.label}: ${item.text}` })),
};

export function moduleSummary(moduleId, findings) {
  const lines = LINES[moduleId];
  return lines && findings ? lines(findings) : [];
}

// Der Kopfsatz sagt nur, ob die Messung geklappt hat. Bewertet wird das erst im Bericht.
export function outcomeHeadline(share) {
  if (share >= 0.9) return { title: "Hat geklappt.", tone: "good" };
  if (share >= 0.7) return { title: "Hat geklappt, mit Lücken.", tone: "fair" };
  return { title: "Zu wenige gültige Bilder.", tone: "poor" };
}
