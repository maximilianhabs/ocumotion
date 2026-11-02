// Positionierhilfe über dem Kamerabild.
export function clearGuide(canvas, hint) {
  canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
  hint.hidden = true;
}

// Der Zielbereich bleibt stehen und folgt dem Gesicht nicht.
export function drawGuide(canvas, videoWidth, videoHeight, target, ok) {
  const context = canvas.getContext("2d");
  if (canvas.width !== videoWidth || canvas.height !== videoHeight) {
    canvas.width = videoWidth;
    canvas.height = videoHeight;
  }
  const { width, height } = canvas;
  context.clearRect(0, 0, width, height);
  const color = ok ? "rgba(34, 197, 94, .95)" : "rgba(250, 250, 249, .7)";
  const eyeY = target.y * height;
  const band = target.tolerance.y * height;
  const radiusX = target.span * width * 0.72;
  const radiusY = radiusX * 1.38;
  context.fillStyle = ok ? "rgba(34, 197, 94, .12)" : "rgba(250, 250, 249, .08)";
  context.fillRect(target.x * width - radiusX, eyeY - band, radiusX * 2, band * 2);
  context.strokeStyle = color;
  context.lineWidth = 3;
  context.beginPath();
  context.ellipse(target.x * width, eyeY + radiusY * 0.28, radiusX, radiusY, 0, 0, Math.PI * 2);
  context.moveTo(target.x * width, eyeY - band);
  context.lineTo(target.x * width, eyeY + band);
  context.stroke();
}
