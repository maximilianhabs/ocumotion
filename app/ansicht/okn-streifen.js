import { fieldDegrees, stripeOn, stripePeriod } from "../messung/okn-logik.js";

export const OKN_LIGHT = "#c8c8c8";
export const OKN_DARK = "#303030";

// Streifen im Winkelraum: jede Bildspalte bekommt ihren Winkel zur Bildschirmmitte.
export function prepareStripes({ canvas, width, height, distance, screenCm }) {
  canvas.width = width;
  canvas.height = height;
  const cmPerPx = screenCm / width;
  const center = width / 2;
  const angles = Array.from({ length: Math.ceil(width / 2) }, (_, index) =>
    Math.atan(((index * 2 + 1 - center) * cmPerPx) / distance) * (180 / Math.PI));
  return { canvas, context: canvas.getContext("2d"), angles, periodDeg: stripePeriod(fieldDegrees(screenCm, distance)) };
}

export function drawStripes(stripes, seconds, direction) {
  const { canvas, context, angles, periodDeg } = stripes;
  context.fillStyle = OKN_DARK;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = OKN_LIGHT;
  angles.forEach((theta, index) => {
    if (stripeOn(theta, seconds, direction, periodDeg)) context.fillRect(index * 2, 0, 2, canvas.height);
  });
}
