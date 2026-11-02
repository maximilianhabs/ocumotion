// Anzeige der Augenmarken im Kamerabild und der vergrößerten Ausschnitte. Nichts davon wird abgelegt.
export function drawEyeMarks(ctx, width, height, points, eye, color) {
  const px = (index) => ({ x: points[index].x * width, y: points[index].y * height });
  const center = px(eye.center);
  const rim = px(eye.rimA);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(center.x, center.y, Math.hypot(rim.x - center.x, rim.y - center.y), 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = color;
  for (const point of [center, px(eye.imageLeft), px(eye.imageRight)]) {
    ctx.fillRect(point.x - 2, point.y - 2, 4, 4);
  }
}

// Vergroesserter Ausschnitt nur zur Anzeige; er wird nirgends abgelegt.
// image: Zeichenquelle, w und h: Bildgröße der Quelle in Pixeln.
export function drawEyeCrop(image, w, h, points, eye, canvas, color) {
  const target = canvas.getContext("2d");
  const a = points[eye.imageLeft];
  const b = points[eye.imageRight];
  const spanX = Math.hypot((b.x - a.x) * w, (b.y - a.y) * h) * 1.7;
  const spanY = spanX / 2;
  const sx = ((a.x + b.x) / 2) * w - spanX / 2;
  const sy = ((a.y + b.y) / 2) * h - spanY / 2;
  target.drawImage(image, sx, sy, spanX, spanY, 0, 0, canvas.width, canvas.height);
  const scale = canvas.width / spanX;
  const cx = (points[eye.center].x * w - sx) * scale;
  const cy = (points[eye.center].y * h - sy) * scale;
  const rim = points[eye.rimA];
  const radius = Math.hypot((rim.x - points[eye.center].x) * w, (rim.y - points[eye.center].y) * h) * scale;
  target.strokeStyle = color;
  target.lineWidth = 2;
  target.beginPath();
  target.arc(cx, cy, radius, 0, Math.PI * 2);
  target.stroke();
}
