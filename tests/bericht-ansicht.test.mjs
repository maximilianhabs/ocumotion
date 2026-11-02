// Der Bericht zeigt Inhalte fremder Dateien nie als Markup. Aufruf: make test
import assert from "node:assert/strict";
import { test } from "node:test";
import { escapeHtml, reportHtml } from "../app/messung/bericht-ansicht.js";
import { fullRun, samples } from "./beispiellauf.mjs";

const PAYLOAD = `<img src=x onerror="alert(1)">'`;
// Auch Listen und Objekte, deren Textform Markup ergibt.
const PAYLOADS = [PAYLOAD, [PAYLOAD], { toString: () => PAYLOAD }];

function fullData() {
  const run = fullRun();
  run.gaze = [{ target: { name: "rechts", h: 10, v: 0 }, samples: samples(3000, 0, () => ({ h: 10, v: 0 })) }];
  run.okn = [
    { block: { kind: "moving", label: "Streifen rechts", from: 0, to: 3000, direction: 1 }, samples: samples(3000, 0, () => ({ h: 0, v: 0 })) },
    { block: { kind: "control", label: "Kontrolle", from: 3000, to: 6000, direction: 1 }, samples: samples(3000, 3000, () => ({ h: 0, v: 0 })) },
  ];
  run.stages = [{ id: "ruhe", title: "Ruhe", leadSamples: samples(500, 0, () => ({ h: 0, v: 0 })), waitMs: 1000, repeats: 1, headShift: 0.1 }];
  run.calibrationRetry = true;
  const meta = {
    protocol: "Test", createdAt: "2026-11-02T10:00:00Z", smoothing: "aus", mode: "Kamera", distanceCm: 50,
    effort: 3, headEvents: [{ time: 1000, target: "Mitte", distanceChange: 0.1, headShift: 0.2 }],
  };
  return { run, meta };
}

// Jedes Blatt einmal; von Listen genügt das erste Element, sonst dauert es zu lange.
function leafPaths(value, path = []) {
  if (Array.isArray(value)) return value.length ? leafPaths(value[0], [...path, 0]) : [];
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, item]) => leafPaths(item, [...path, key]));
  }
  return [path];
}

// Nur Optokinetik und ohne Kalibrierung: eigene Zweige im Bericht.
function oknOnlyData() {
  const { run, meta } = fullData();
  return { run: { okn: run.okn, saccades: run.saccades, gaze: [], pursuit: [] }, meta };
}

// Den Lauf zu bauen dauert, deshalb tauscht der Test je Feld nur diesen Wert aus.
function renderWithPayload(data, path, payload) {
  const owner = path.slice(0, -1).reduce((item, key) => item[key], data);
  const key = path.at(-1);
  const original = owner[key];
  owner[key] = payload;
  try {
    return reportHtml(data);
  } finally {
    owner[key] = original;
  }
}

test("escapeHtml entschärft alle Zeichen, die aus Text Markup machen", () => {
  assert.equal(escapeHtml(`<a href="x" title='y'>&`), "&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;");
});

test("Ein vollständiger Lauf ergibt alle Kapitel", () => {
  const html = reportHtml(fullData());
  for (const title of ["Blickrichtung", "Blickfolge", "Sakkaden", "Optokinetik", "Nullpunkt im Verlauf", "Kalibrierung wurde einmal wiederholt"]) {
    assert.ok(html.includes(title), title);
  }
  assert.ok(html.includes("Anstrengung laut Testperson: 3 von 5."));
});

for (const [name, build] of [["vollständiger Lauf", fullData], ["nur Optokinetik", oknOnlyData]]) {
  test(`Kein Feld der Datei wird zu Markup, ${name}`, () => {
    const data = build();
    const paths = leafPaths(data);
    assert.ok(paths.length > 20);
    let rendered = 0;
    for (const path of paths) {
      for (const payload of PAYLOADS) {
        let html;
        try {
          html = renderWithPayload(data, path, payload);
        } catch {
          continue;
        }
        rendered += 1;
        assert.doesNotMatch(html, /<img/i, path.join("."));
      }
    }
    assert.ok(rendered > paths.length, `nur ${rendered} Berichte gebaut`);
  });
}

test("Anstrengung und Wiederholungen nehmen nur gültige Werte an", () => {
  for (const effort of [0, 6, 2.5, "3", {}]) {
    const data = fullData();
    data.meta.effort = effort;
    assert.ok(!reportHtml(data).includes("Anstrengung"), String(effort));
  }
  const data = fullData();
  data.run.stages[0].repeats = "2";
  assert.ok(reportHtml(data).includes("Wiederholte Etappen: keine"));
});
