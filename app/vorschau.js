// Kleine Grafiken für die Rückmeldung nach einem Modul. Nur Zahlen gehen in das SVG, keine freien Texte.

const fixed = (value) => value.toFixed(1);

function field(width, height, spanH, spanV) {
  const x = (value) => width / 2 + (value / spanH) * (width / 2);
  const y = (value) => height / 2 - (value / spanV) * (height / 2);
  const axes = `<path d="M${width / 2} 0V${height}M0 ${height / 2}H${width}" stroke="var(--hair)"/>`;
  return { x, y, axes };
}

const svg = (width, height, label, body) => `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${label}">${body}</svg>`;

// Zielscheibe je Punkt: Kreuz am Sollpunkt, Zielbereich, jede Einzelmessung als Punkt, Ellipse über zwei Standardabweichungen.
export function calibrationChart(points, zone) {
  const width = 640;
  const height = 430;
  const spanH = 19;
  const spanV = spanH * (height / width);
  const { x, y, axes } = field(width, height, spanH, spanV);
  const perDegree = (width / 2) / spanH;
  const marks = points.map((point) => {
    const px = x(point.h);
    const py = y(point.v);
    const target = `<ellipse cx="${fixed(px)}" cy="${fixed(py)}" rx="${fixed(zone.h * perDegree)}" ry="${fixed(zone.v * perDegree)}" fill="rgb(248 247 245 / .05)" stroke="var(--dim)"/>
      <path d="M${fixed(px - 6)} ${fixed(py)}h12M${fixed(px)} ${fixed(py - 6)}v12" stroke="var(--white)"/>`;
    const dots = point.cloud.map((dot) => `<circle cx="${fixed(x(dot.h))}" cy="${fixed(y(dot.v))}" r="1.7" fill="${dot.inside ? "var(--ok)" : "var(--warn)"}" fill-opacity=".7"/>`).join("");
    const ellipse = point.meanH === null ? "" : `<ellipse cx="${fixed(x(point.meanH))}" cy="${fixed(y(point.meanV))}" rx="${fixed(Math.max(2 * point.sdH * perDegree, 1))}" ry="${fixed(Math.max(2 * point.sdV * perDegree, 1))}" fill="none" stroke="var(--white)" stroke-opacity=".5" stroke-dasharray="3 3"/>`;
    return `<g${point.role === "fit" ? ' opacity=".6"' : ""}>${target}${dots}${ellipse}</g>`;
  }).join("");
  return svg(width, height, "Sollpunkte mit Zielkreis und allen Einzelmessungen", axes + marks);
}

export function restChart(points) {
  const width = 300;
  const span = 6;
  const { x, y, axes } = field(width, width, span, span);
  const dots = points.map((point) => `<circle cx="${fixed(x(point.h))}" cy="${fixed(y(point.v))}" r="1.6" fill="var(--petrol-light)" fill-opacity=".55"/>`).join("");
  return svg(width, width, "Blick in Ruhe um den Punkt, Bereich plus minus sechs Grad", axes + dots);
}

export function pursuitChart(entry) {
  const width = 640;
  const height = 150;
  const { run, startTime, series } = entry;
  const scaleY = (value) => height / 2 - (value / (run.amplitude * 1.25)) * (height / 2);
  const scaleX = (time) => ((time - startTime) / run.durationMs) * width;
  const target = Array.from({ length: 241 }, (_, index) => {
    const time = startTime + (index / 240) * run.durationMs;
    const value = run.amplitude * Math.sin(2 * Math.PI * run.frequency * ((time - startTime) / 1000));
    return `${fixed(scaleX(time))},${fixed(scaleY(value))}`;
  }).join(" ");
  const eye = series.mittel.filter((point) => point.h !== null && point.time >= startTime && point.time <= startTime + run.durationMs)
    .map((point) => `${fixed(scaleX(point.time))},${fixed(scaleY(point.h))}`).join(" ");
  return svg(width, height, "Sollkurve und Augenspur der Blickfolge",
    `<polyline points="${target}" fill="none" stroke="var(--dim)" stroke-dasharray="5 4"/><polyline points="${eye}" fill="none" stroke="var(--petrol-light)" stroke-width="1.6"/>`);
}

// Je Sprung Ziel und Landeort, horizontal oben, vertikal unten.
export function endpointChart(endpoints) {
  const width = 520;
  const rowHeight = 92;
  const row = (axis, top) => {
    const items = endpoints.filter((item) => item.axis === axis);
    const x = (value) => width / 2 + (value / 19) * (width / 2);
    const middle = top + rowHeight / 2;
    return `<line x1="0" x2="${width}" y1="${middle}" y2="${middle}" stroke="var(--hair)"/>${items.map((item, index) => {
      const y = top + 12 + (index / Math.max(items.length, 1)) * (rowHeight - 24);
      return `<circle cx="${fixed(x(item.target))}" cy="${fixed(y)}" r="5" fill="none" stroke="var(--dim)"/><circle cx="${fixed(x(item.end))}" cy="${fixed(y)}" r="3" fill="var(--petrol-light)"/>`;
    }).join("")}`;
  };
  return svg(width, rowHeight * 2, "Ziel und Landeort je Sprung", row("h", 0) + row("v", rowHeight));
}

export function traceChart(points) {
  const width = 640;
  const height = 90;
  const usable = points.filter((point) => point.h !== null);
  if (usable.length < 2) return "";
  const from = usable[0].time;
  const span = usable.at(-1).time - from || 1;
  const middle = usable.map((point) => point.h).sort((a, b) => a - b)[Math.floor(usable.length / 2)];
  const line = usable.map((point) => `${fixed(((point.time - from) / span) * width)},${fixed(height / 2 - ((point.h - middle) / 10) * (height / 2))}`).join(" ");
  return svg(width, height, "Augenspur während der Streifen", `<polyline points="${line}" fill="none" stroke="var(--petrol-light)" stroke-width="1.2"/>`);
}
