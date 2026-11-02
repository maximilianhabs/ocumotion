// Baut den Bericht als HTML-Text. Reine Darstellung ohne Browserbezug, damit sie sich testen lässt.
// Die Daten können aus einer fremden Datei stammen und gelten deshalb als nicht vertrauenswürdig.
import { buildReport } from "./bericht-logik.js";


const COLOR = { right: "var(--right)", left: "var(--left)", target: "var(--target)", mean: "var(--mean)", line: "var(--line)" };
const number = (value, digits = 1) => (value === null || value === undefined ? "–" : value.toFixed(digits).replace(".", ","));
const percent = (value) => (value === null || value === undefined ? "–" : `${Math.round(value * 100)} %`);
const ENTITIES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (c) => ENTITIES[c]);

function polyline(points, xOf, yOf, color, width, dash = "") {
  const parts = [];
  let current = [];
  let previous = null;
  for (const point of points) {
    if (previous !== null && point.time - previous > 100) {
      parts.push(current);
      current = [];
    }
    current.push(`${xOf(point.time).toFixed(1)},${yOf(point.value).toFixed(1)}`);
    previous = point.time;
  }
  parts.push(current);
  return parts.filter((part) => part.length > 1).map((part) =>
    `<polyline points="${part.join(" ")}" fill="none" stroke="${color}" stroke-width="${width}" stroke-dasharray="${dash}"/>`).join("");
}

function fixationChart(section) {
  const size = 200;
  const range = 6;
  const at = (value) => size / 2 + (value / range) * (size / 2);
  const dots = section.points.map((p) => `<circle cx="${at(p.h).toFixed(1)}" cy="${at(-p.v).toFixed(1)}" r="1.1" fill="${COLOR.mean}" fill-opacity=".45"/>`).join("");
  return `<svg viewBox="0 0 ${size} ${size}" role="img" aria-label="Blickposition in Ruhe, Bereich plus minus ${range} Grad">
    <rect width="${size}" height="${size}" fill="none" stroke="${COLOR.line}"/>
    <path d="M${size / 2} 0V${size}M0 ${size / 2}H${size}" stroke="${COLOR.line}"/>${dots}
    <text x="4" y="11" font-size="9" fill="currentColor">±${range}°</text></svg>`;
}

function targetChart(section) {
  const width = 200;
  const height = 200;
  const x = (value) => width / 2 + (value / 18) * (width / 2);
  const y = (value) => height / 2 - (value / 16) * (height / 2);
  const marks = section.targets.map((t) => {
    const cross = `<path d="M${x(t.targetH) - 4} ${y(t.targetV)}h8M${x(t.targetH)} ${y(t.targetV) - 4}v8" stroke="${COLOR.target}" stroke-width="1.4"/>`;
    if (t.h === null || t.v === null) return cross;
    return `${cross}<line x1="${x(t.targetH)}" y1="${y(t.targetV)}" x2="${x(t.h)}" y2="${y(t.v)}" stroke="${COLOR.mean}"/><circle cx="${x(t.h)}" cy="${y(t.v)}" r="3" fill="${COLOR.mean}"/>`;
  }).join("");
  return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Blickziele als Kreuz, gemessene Position als Punkt">
    <rect width="${width}" height="${height}" fill="none" stroke="${COLOR.line}"/>
    <path d="M${width / 2} 0V${height}M0 ${height / 2}H${width}" stroke="${COLOR.line}"/>${marks}</svg>`;
}

function pursuitChart(entry) {
  const width = 600;
  const height = 80;
  const start = entry.startTime;
  const x = (time) => ((time - start) / entry.run.durationMs) * width;
  const y = (value) => height / 2 - (value / 18) * (height / 2);
  const line = (points, color, stroke, dash) => polyline(
    points.filter((p) => p.h !== null).map((p) => ({ time: p.time, value: p.h })), x, y, color, stroke, dash);
  const target = Array.from({ length: 201 }, (_, i) => {
    const time = start + (i / 200) * entry.run.durationMs;
    const value = entry.run.amplitude * Math.sin(2 * Math.PI * entry.run.frequency * ((time - start) / 1000));
    return `${x(time).toFixed(1)},${y(value).toFixed(1)}`;
  }).join(" ");
  return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Zielkurve und Blickfolge ${escapeHtml(entry.name)}">
    <rect width="${width}" height="${height}" fill="none" stroke="${COLOR.line}"/>
    <polyline points="${target}" fill="none" stroke="${COLOR.target}" stroke-width="1.6" stroke-dasharray="5 3"/>
    ${line(entry.series.rechts, COLOR.right, 0.8, "")}${line(entry.series.links, COLOR.left, 0.8, "3 2")}${line(entry.series.mittel, COLOR.mean, 1.3, "")}</svg>`;
}

function oknChart(item) {
  const width = 600;
  const height = 70;
  const middle = (item.block.from + item.block.to) / 2;
  const from = middle - 3000;
  const points = item.points.filter((p) => p.h !== null && p.time >= from && p.time <= from + 6000);
  if (points.length < 2) return "";
  const center = points.map((p) => p.h).sort((a, b) => a - b)[Math.floor(points.length / 2)];
  const x = (time) => ((time - from) / 6000) * width;
  const y = (value) => height / 2 - ((value - center) / 12) * (height / 2);
  return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Augenposition, ${escapeHtml(item.label)}">
    <rect width="${width}" height="${height}" fill="none" stroke="${COLOR.line}"/>
    ${polyline(points.map((p) => ({ time: p.time, value: p.h })), x, y, COLOR.mean, 1.2, "")}</svg>`;
}

function eventChart(timeline) {
  const phases = timeline.phases;
  if (!phases.length) return "";
  const width = 600;
  const label = 118;
  const rowHeight = 15;
  const start = phases[0].from;
  const end = phases.at(-1).to;
  const x = (time) => label + ((time - start) / (end - start || 1)) * (width - label);
  const phaseBars = phases.map((phase, index) =>
    `<rect x="${x(phase.from).toFixed(1)}" y="1" width="${Math.max(x(phase.to) - x(phase.from), 1).toFixed(1)}" height="12" fill="${index % 2 ? "#e7e5e4" : "#d6d3d1"}"/>
     <title>${escapeHtml(phase.name)}</title>`).join("");
  const rows = timeline.rows.map((row, index) => {
    const top = (index + 1) * rowHeight;
    const name = `<text x="0" y="${top + 10}" font-size="9" fill="currentColor">${escapeHtml(row.name)}</text>`;
    if (!row.available) return `${name}<text x="${label}" y="${top + 10}" font-size="9" fill="#78716c">in dieser Datei nicht erfasst</text>`;
    return name + row.spans.map((span) =>
      `<rect x="${x(span.from).toFixed(1)}" y="${top + 2}" width="${Math.max(x(span.to) - x(span.from), 1.5).toFixed(1)}" height="9" fill="#b45309"/>`).join("");
  }).join("");
  return `<svg viewBox="0 0 ${width} ${(timeline.rows.length + 1) * rowHeight + 2}" role="img" aria-label="Ablauf und Ereignisse">
    <text x="0" y="11" font-size="9" fill="currentColor">Ablauf</text>${phaseBars}${rows}</svg>
    <p class="muted">${phases.map((phase) => escapeHtml(phase.name)).join(" · ")}</p>`;
}

const facts = (rows) => `<dl>${rows.map(([name, value]) => `<dt>${escapeHtml(name)}</dt><dd>${escapeHtml(value)}</dd>`).join("")}</dl>`;

const chipClass = { innerhalb: "unauffaellig", Grenzbereich: "grenzwertig", "außerhalb": "auffaellig", "nicht beurteilbar": "nicht" };
const chip = (status) => `<span class="chip ${chipClass[status]}">${escapeHtml(status)}</span>`;
const line = (status, text) => `<div class="row">${chip(status)}<span>${escapeHtml(text)}</span></div>`;

function finding(number_, title, status, body) {
  return `<section class="finding"><header><h2>${number_}. ${escapeHtml(title)}</h2>${chip(status)}</header>${body}</section>`;
}

function beatLine(name, places, examined) {
  if (!examined) return line("nicht beurteilbar", `${name}: in diesem Lauf nicht untersucht.`);
  if (!places.length) return line("innerhalb", `${name}: in den untersuchten Positionen kein Muster.`);
  return line("außerhalb", `${name}: Muster in ${places.join(", ")}.`);
}

function gazeTable(findings) {
  if (!findings.gazeExamined) return `<p class="muted">Dieser Lauf enthält noch kein Blickhalten. Neue Testläufe erfassen rechts, links, oben und unten.</p>`;
  const rows = findings.gaze.map((cell) => `<tr><th>${escapeHtml(cell.name)} ${escapeHtml(cell.angle)}°</th>
    <td>${chip(cell.horizontal.status)} ${escapeHtml(cell.horizontal.text)}</td>
    <td>${chip(cell.vertical.status)} ${escapeHtml(cell.vertical.text)}</td></tr>`).join("");
  return `<table><thead><tr><th>Blick</th><th>Horizontal</th><th>Vertikal</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function stagesSection(report) {
  const { stages, effort } = report;
  if (!stages && effort.state === "absent") return "";
  const seconds = (ms) => (ms === null ? "–" : `${number(ms / 1000, 0)} s`);
  const table = stages ? `<table><thead><tr><th>Etappe</th><th>Nullpunkt h</th><th>Nullpunkt v</th><th>Kopfversatz</th><th>Karte</th><th>Wiederholt</th></tr></thead><tbody>${
    stages.rows.map((row) => `<tr><th>${escapeHtml(row.title)}</th><td>${number(row.h, 2)}°</td><td>${number(row.v, 2)}°</td>
      <td>${row.headShift === null ? "–" : `${number(row.headShift, 1)} Iris`}</td><td>${seconds(row.waitMs)}</td><td>${row.repeats ? `${escapeHtml(row.repeats)}×` : "nein"}</td></tr>`).join("")
  }</tbody></table>
    <p>Wartezeit auf den Karten insgesamt ${seconds(stages.waitMs)}. Wiederholte Etappen: ${stages.repeats ? `${stages.repeats} Wiederholung${stages.repeats === 1 ? "" : "en"}` : "keine"}.${
      stages.calibrationRepeated ? " Die Kalibrierung wurde einmal wiederholt." : ""}</p>
    <p class="muted">Der Nullpunkt ist der Median der Blickposition in der Sekunde vor jeder Etappe, als Hinführung mit dem Punkt in der Mitte. Das ist nur eine Anzeige der Wanderung über den Lauf, keine Korrektur der Messwerte.</p>` : "";
  const effortText = { absent: "", skipped: "<p>Anstrengung: nicht angegeben.</p>", value: `<p>Anstrengung laut Testperson: ${escapeHtml(effort.value)} von 5.</p>` }[effort.state];
  return `<section class="finding"><header><h2>Nullpunkt im Verlauf</h2></header>${table}${effortText}</section>`;
}

// Liefert den Bericht als Text. Alles aus der Datei geht durch escapeHtml oder wird vorher zur Zahl.
export function reportHtml(data) {
  const report = buildReport(data);
  const [fixation, targets, saccades, pursuit] = report.sections;
  const { meta, calibration, summary, findings } = report;
  const { limits } = findings;
  const { examined } = report;
  const notExamined = [...report.notExamined, ...[["Spontannystagmus", examined.spontaneous], ["Blickrichtung", examined.gaze], ["Blickfolge", examined.pursuit], ["Sakkaden", examined.saccades], ["Optokinetik", examined.okn]]
    .filter(([name, done]) => !done && !(report.oknOnly && name !== "Optokinetik")).map(([name]) => `${name} (nicht untersucht)`)];
  let chapter = 0;
  const part = (done, title, status, body) => (done ? finding(++chapter, title, status, body) : "");
  const eye = (item) => (!item ? "in dieser Datei nicht berechnet" : (item.errorH ?? null) === null ? (item.reason ?? "ohne Kalibrierung")
    : `${number(item.errorH)}° / ${number(item.errorV)}°${item.reason ? `, ${item.reason}` : ""}`);
  const pursuitBlocks = report.oknOnly ? "" : pursuit.runs.map((entry, index) => {
    const judged = findings.pursuit[index];
    return `<div>${line(judged.status, `${entry.name}, ${number(entry.run.frequency, 2)} Hz: ${judged.text}`)}${pursuitChart(entry)}</div>`;
  }).join("");
  return `
    <h1>Oculytics${meta?.protocol ? `: ${escapeHtml(meta.protocol)}` : ""}</h1>
    <p class="muted">${escapeHtml(meta?.createdAt ? new Date(meta.createdAt).toLocaleString("de-DE") : "ohne Datum")} ·
      ${escapeHtml(meta?.smoothing ?? "")} · ${escapeHtml(meta?.mode ?? "")} · Abstand laut Eingabe ${escapeHtml(meta?.distanceCm ?? "–")} cm · ${escapeHtml(report.version)}</p>
    <div class="banner">Experimenteller Proof of Concept. Einordnung gegen vorläufige Arbeitsgrenzen, noch nicht mit Normkollektiven geeicht. Kein Befund, keine Diagnose, nicht für klinische Entscheidungen.</div>
    <h2>${escapeHtml(summary.headline)}</h2>
    <p class="muted">${escapeHtml(report.condition)}</p>

    ${report.oknOnly ? `<p class="muted">Der Maßstab stammt aus den kurzen horizontalen Sprüngen dieses Laufs, nicht aus einer Kalibrierung. Gradwerte sind Näherungen; Aussagen zu Ruhe, Blickrichtung, Blickfolge und Sakkaden macht dieser Lauf nicht.</p>` : ""}
    ${report.oknOnly ? "" : `
    ${part(examined.spontaneous, "Fixation in Ruhe, Spontannystagmus", findings.spontaneous.status, `<div class="split"><div>
      ${line(findings.spontaneous.horizontal.status, `Horizontal: ${findings.spontaneous.horizontal.text}`)}
      ${line(findings.spontaneous.vertical.status, `Vertikal: ${findings.spontaneous.vertical.text}`)}
      ${facts([
        ["Ruhe robust h / v", `${number(fixation.stats?.robustSdH, 2)}° / ${number(fixation.stats?.robustSdV, 2)}°`],
        ["Abdeckung h / v", `${percent(fixation.stats?.coverageH)} / ${percent(fixation.stats?.coverageV)}`],
        ["Drift horizontal", `${number(fixation.stats?.driftH, 2)} °/s`],
      ])}</div>${fixationChart(fixation)}</div>
      <p class="limit">Unter Fixation; ein unterdrückter Nystagmus bleibt unsichtbar. Grenze: ${escapeHtml(limits.nystagmus.source)}.</p>`)}

    ${part(examined.gaze, "Blickrichtung", findings.gazeStatus, `
      ${line(!findings.gazeExamined ? "nicht beurteilbar" : findings.gazeHits ? "außerhalb" : "innerhalb",
        `Blickrichtungsnystagmus: ${!findings.gazeExamined ? "nicht untersucht" : findings.gazeHits ? "Muster, siehe Tabelle" : "kein Muster bis zum geprüften Winkel"}.`)}
      ${beatLine("Downbeat", findings.downbeat, findings.gazeExamined)}
      ${beatLine("Upbeat", findings.upbeat, findings.gazeExamined)}
      ${gazeTable(findings)}
      <p class="limit">Der Bildschirm begrenzt die Auslenkung auf rund 15° horizontal und 10° vertikal, das liegt unter den üblichen Prüfwinkeln. Ein Blickrichtungsnystagmus bei stärkerer Auslenkung ist damit nicht ausgeschlossen.</p>`)}

    ${part(examined.spontaneous, "Square-Wave-Jerks", findings.swj.status, `${line(findings.swj.status, findings.swj.text)}
      <p class="limit">Grenze: ${escapeHtml(limits.swj.source)}. Kandidaten nur, wenn beide Augen springen.</p>`)}

    ${part(examined.pursuit, "Blickfolge", findings.pursuitStatus, `${pursuitBlocks}
      <p class="muted">Violett Ziel, blau rechtes Auge, orange gestrichelt linkes Auge, schwarz Mittel. Lücken bleiben Lücken.</p>
      <p class="limit">Folge-Gain über ${number(limits.pursuit.gainNormal, 1)} und bis ${limits.pursuit.saccadesNormal} Sakkaden je Zyklus gelten als glatt. ${escapeHtml(limits.pursuit.source)}.</p>`)}

    ${part(examined.saccades, "Sakkaden und Zielgenauigkeit", findings.saccadeStatus, `<div class="split"><div>
      ${findings.saccades.map((item) => line(item.status, item.text)).join("")}
      ${calibration.selfScaled ? `<p class="muted">Ohne Kalibrierung keine Metrik: Der Maßstab stammt aus diesen Sprüngen, die Aussage wäre ein Kreisschluss. Die Bewegung selbst ist unten in der Ablaufleiste und im Export erhalten.</p>` : ""}
      ${facts([
        ["Zielfehler neue Ziele h / v", `${number(targets.stats?.errorH)}° / ${number(targets.stats?.errorV)}°`],
        ["Größter Zielfehler", `${number(targets.stats?.maxError)}°`],
        ["Latenz horizontal, mit Verarbeitung", `${number(saccades.stats?.h?.latency, 0)} ms`],
      ])}</div><div>${targetChart(targets)}<p class="muted">Kreuz Ziel, Punkt Messung.</p></div></div>
      <p class="limit">Metrisch gilt von ${number(limits.saccade.normalLow, 2)} bis ${number(limits.saccade.normalHigh, 2)}. ${escapeHtml(limits.saccade.source)}. Vertikal nur bei freigegebener Vertikale.</p>`)}
    `}

    ${findings.okn ? finding(++chapter, "Optokinetik", findings.okn.status, `
      <p>${findings.okn.conform} von ${findings.okn.total} Richtungen reizkonform.</p>
      ${findings.okn.items.map((item) => `${line(item.status, `${item.label}: ${item.text}`)}${oknChart(item)}`).join("")}
      ${findings.okn.control ? `<p>${escapeHtml(findings.okn.control.text)}</p>` : `<p class="muted">Ohne Kontrollblock: Ein Messartefakt durch Hornhautreflexe ist nicht ausgeschlossen.</p>`}
      <p class="limit">Antwort auf einen Bildschirmreiz, kein Ganzfeldtest. Ausbleiben bedeutet keine Störung; Gain 1 ist keine Norm.</p>`)
      : ""}

    ${stagesSection(report)}
    <section class="finding"><header><h2>Messqualität</h2></header>
      ${summary.lines.map((text) => `<p>${escapeHtml(text)}</p>`).join("")}
      ${facts([["Prüffehler Mittel h / v", eye(calibration.mittel)], ["Rechtes Auge", eye(calibration.rechts)], ["Linkes Auge", eye(calibration.links)]])}
      ${eventChart(report.timeline)}</section>
    <section class="finding"><header><h2>Nicht untersucht</h2>${chip("nicht beurteilbar")}</header><p>${notExamined.map(escapeHtml).join(" · ")}</p></section>
    <section class="finding review"><header><h2>Notizen</h2></header><p class="muted">Von Hand zu ergänzen.</p></section>`;
}
