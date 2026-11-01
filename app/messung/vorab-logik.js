// Kurze Rückmeldung direkt nach einem Modul. Die Noten der Kalibrierung sind Arbeitsgrenzen dieses Aufbaus, keine Norm.

import { MAX_ERROR_H, MAX_ERROR_V, toDegrees } from "./kalibrierung-logik.js";

// Zielbereich wie die Freigabe der Kalibrierung: horizontal enger als vertikal.
export const TARGET_ZONE = { h: MAX_ERROR_H, v: MAX_ERROR_V };

// Anteil der Prüfmessungen im Zielbereich. So passt die Note zur Punktwolke.
const GRADES = [
  { grade: "Hervorragend", tone: "good", minShare: 0.9 },
  { grade: "Gut", tone: "good", minShare: 0.7 },
  { grade: "Mittel", tone: "fair", minShare: 0.4 },
];

const number = (value, digits = 1) => (value === null || value === undefined ? "–" : value.toFixed(digits).replace(".", ","));
const degrees = (value, digits = 1) => (value === null || value === undefined ? "–" : `${number(value, digits)}°`);

const WHY = {
  "zu wenige gültige Bilder": () => "Zu wenige gültige Bilder. Prüfen Sie Licht und Position, und bleiben Sie im Bild.",
  "Tracking-Lücke": () => "Die Augen gingen zwischendurch verloren. Prüfen Sie Licht und Position.",
  "Einzelwerte zu unruhig": () => "Der Blick war auf den Punkten zu unruhig. Halten Sie den Kopf still und schauen Sie ruhig auf jeden Punkt.",
  "Prüffehler zu groß": (eye) => `Die Prüfpunkte lagen im Mittel ${degrees(eye.errorH)} daneben, erlaubt sind 2°. Häufig hat sich der Kopf bewegt.`,
};

export function gradeCalibration(calibration, share) {
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
  const percent = `${Math.round(share * 100)} % der Prüfmessungen liegen im Zielbereich.`;
  const match = GRADES.find((item) => share >= item.minShare);
  if (!match) return { grade: "Schlecht", tone: "poor", text: `Nur ${percent} ${axes}`, rows };
  return { grade: match.grade, tone: match.tone, text: `${percent} ${axes}`, rows };
}

const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
const spreadOf = (values, center) => Math.sqrt(mean(values.map((value) => (value - center) ** 2)));

// Je Punkt eine Wolke aus allen Einzelbildern. Treffer heißt: Die Messung liegt im Zielbereich um den Sollpunkt.
export function calibrationPoints(entries, calibration) {
  const model = calibration.mittel?.model;
  return entries.map((entry) => {
    const base = { h: entry.target.h, v: entry.target.v, role: entry.target.role, cloud: [], meanH: null, meanV: null, sdH: null, sdV: null, inside: 0 };
    const both = entry.samples.filter((sample) => sample.rechts && sample.links);
    if (!model || both.length < 3) return base;
    const cloud = both.map((sample) => {
      const degrees = toDegrees(model, (sample.rechts.x + sample.links.x) / 2, (sample.rechts.y + sample.links.y) / 2);
      return { h: degrees.h, v: degrees.v, inside: ((degrees.h - base.h) / TARGET_ZONE.h) ** 2 + ((degrees.v - base.v) / TARGET_ZONE.v) ** 2 <= 1 };
    });
    const meanH = mean(cloud.map((point) => point.h));
    const meanV = mean(cloud.map((point) => point.v));
    return { ...base, cloud, meanH, meanV, sdH: spreadOf(cloud.map((point) => point.h), meanH), sdV: spreadOf(cloud.map((point) => point.v), meanV),
             inside: cloud.filter((point) => point.inside).length };
  });
}

export function cloudSummary(points) {
  const total = points.reduce((sum, point) => sum + point.cloud.length, 0);
  const inside = points.reduce((sum, point) => sum + point.inside, 0);
  return { total, inside, share: total ? inside / total : 0 };
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
