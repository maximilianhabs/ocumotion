// Vorab-Auswertung und gemerkte Kalibrierung. Aufruf: make test
import assert from "node:assert/strict";
import { test } from "node:test";
import { listSaved, removeCalibration, sameSetting, saveCalibration } from "../app/kamera/kalibrierspeicher.js";
import { calibrationPoints, cloudSummary, gradeCalibration, moduleSummary, outcomeHeadline, validShare } from "../app/messung/vorab-logik.js";

const eye = (over) => ({ passedH: true, passedV: false, errorH: 0.9, errorV: 3.2, noiseH: 0.5, noiseV: 1, maxError: 2, validShare: 0.98, ...over });

test("Kalibrierung: Noten nach dem Anteil im Zielbereich", () => {
  assert.equal(gradeCalibration({ mittel: eye() }, 0.95).grade, "Hervorragend");
  assert.equal(gradeCalibration({ mittel: eye() }, 0.75).grade, "Gut");
  assert.equal(gradeCalibration({ mittel: eye() }, 0.5).grade, "Mittel");
  assert.equal(gradeCalibration({ mittel: eye() }, 0.3).grade, "Schlecht");
  assert.match(gradeCalibration({ mittel: eye() }, 0.3).text, /Nur 30 %/);
  assert.equal(gradeCalibration({ mittel: eye({ passedH: false, errorH: 3 }) }, 0.95).grade, "Schlecht");
});

test("Kalibrierung ohne Modell bleibt lesbar und zeigt Striche", () => {
  const result = gradeCalibration({ mittel: { passedH: false, passedV: false, errorH: null, errorV: null } });
  assert.equal(result.grade, "Schlecht");
  assert.equal(result.rows[0][1], "–");
  assert.match(gradeCalibration({ mittel: eye() }, 1).rows[0][1], /^0,9°$/);
});

test("Schlechte Kalibrierung nennt den Grund", () => {
  const text = (over) => gradeCalibration({ mittel: eye({ passedH: false, ...over }) }).text;
  assert.match(text({ reasonH: "Prüffehler zu groß", errorH: 3.2 }), /im Mittel 3,2° daneben, erlaubt sind 2°/);
  assert.match(text({ reasonH: "Einzelwerte zu unruhig" }), /zu unruhig/);
  assert.match(text({ reasonH: "zu wenige gültige Bilder" }), /Licht und Position/);
});

test("Punktwolke: jedes Bild zählt, Mittel und Streuung stimmen, ohne Modell keine Wolke", () => {
  const model = { h: [0, 10, 0], v: [0, 0, 10] };
  const point = (x, y) => ({ rechts: { x, y }, links: { x, y } });
  const entry = (h, v) => ({ target: { h, v, role: "check" }, samples: [point(0, 0), point(0.2, 0), point(0.4, 0), point(0.4, 0), { rechts: null, links: null }] });
  const [near] = calibrationPoints([entry(1, 0)], { mittel: { model } });
  assert.equal(near.cloud.length, 4);
  assert.equal(near.meanH, 2.5);
  assert.ok(Math.abs(near.sdH - Math.sqrt(2.75)) < 1e-9);
  assert.equal(near.inside, 2);
  assert.deepEqual(cloudSummary([near]), { total: 4, inside: 2, share: 0.5 });
  assert.equal(calibrationPoints([entry(1, 0)], { mittel: { model: null } })[0].cloud.length, 0);
});

test("Gültige Bilder zählen über alle Teile des Laufs", () => {
  const both = { rechts: {}, links: {} };
  assert.equal(validShare({ fixation: { samples: [both, both, both, { rechts: {}, links: null }] } }), 0.75);
  assert.equal(validShare({}), 0);
});

test("Der Kopfsatz folgt dem Anteil gültiger Bilder", () => {
  assert.equal(outcomeHeadline(0.97).tone, "good");
  assert.equal(outcomeHeadline(0.8).tone, "fair");
  assert.equal(outcomeHeadline(0.4).tone, "poor");
});

test("Modulzeilen übernehmen die Einordnung", () => {
  const findings = { pursuit: [{ name: "langsam", status: "innerhalb", text: "glatt" }] };
  assert.deepEqual(moduleSummary("blickfolge", findings), [{ status: "innerhalb", text: "langsam: glatt" }]);
  assert.deepEqual(moduleSummary("kalibrierung", findings), []);
});

function memory() {
  const data = new Map();
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
}

test("Gemerkte Kalibrierungen sind einzeln löschbar", () => {
  const storage = memory();
  saveCalibration({ id: "a", name: "A" }, storage);
  saveCalibration({ id: "b", name: "B" }, storage);
  assert.equal(listSaved(storage).length, 2);
  removeCalibration("a", storage);
  assert.deepEqual(listSaved(storage).map((item) => item.id), ["b"]);
});

test("Volle oder gesperrte Speicher brechen nichts", () => {
  const broken = { getItem: () => { throw new Error("gesperrt"); }, setItem: () => { throw new Error("voll"); } };
  assert.deepEqual(listSaved(broken), []);
  assert.equal(saveCalibration({ id: "a" }, broken), false);
});

test("Ein Setting gilt nur bei gleicher Kamera, gleichem Abstand und Bildschirm", () => {
  const setting = { camera: "FaceTime", distanceCm: 40, screenWidthCm: 28.6 };
  assert.ok(sameSetting(setting, { ...setting }));
  assert.ok(!sameSetting(setting, { ...setting, distanceCm: 50 }));
  assert.ok(!sameSetting(setting, { ...setting, camera: "USB" }));
});
