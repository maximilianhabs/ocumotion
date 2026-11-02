import { fakeDetector, openDetector } from "./kamera/erkennung.js";
import { direction, EYES, measureFrame, meanX, standardDeviation } from "./messung/augen-logik.js";
import { calibrate, combineEyes, median, SCREEN_WIDTH_CM, sensitivity, targetPixels, targetsFit, toDegrees }
  from "./messung/kalibrierung-logik.js";
import { buildReport } from "./messung/bericht-logik.js";
import { MODULES, PROTOCOLS, moduleById, sessionProtocol } from "./messung/protokolle.js";
import { emptySession, mergeRun, needsScale } from "./messung/sitzung-logik.js";
import { calibrationPoints, cloudSummary, gradeCalibration, moduleSummary, outcomeHeadline, TARGET_ZONE, validShare } from "./messung/vorab-logik.js";
import { calibrationChart, endpointChart, pursuitChart, restChart, traceChart } from "./vorschau.js";
import { listSaved, removeCalibration, sameSetting, saveCalibration } from "./kamera/kalibrierspeicher.js";
import { canContinue, canRepeat, cardDuration, effortFromKey, hasPart, LEAD_MS, stageMs, stagesMs, stepText } from "./messung/etappen-logik.js";
import { fieldDegrees, OKN_SPEED } from "./messung/okn-logik.js";
import { drawEyeCrop, drawEyeMarks } from "./ansicht/augenbild.js";
import { fillCardFields, waitForInput } from "./ansicht/karten.js";
import { OKN_DARK, OKN_LIGHT, drawStripes, prepareStripes } from "./ansicht/okn-streifen.js";
import { clearGuide, drawGuide } from "./ansicht/position.js";
import { analysePose, assess, estimateDistance, isStable, makeReference, MARK_DISTANCE_CHANGE, MARK_HEAD_SHIFT,
         canResume, medianPose, positionDrift, STOP_DISTANCE_CHANGE, STOP_HEAD_SHIFT, targetFor } from "./messung/positionierung-logik.js";

const DRY_RUN = new URLSearchParams(window.location.search).has("trockenlauf");
// Mit ?trockenlauf&tasten warten die Karten auf die echte Taste, damit sich die Bedienung ohne Kamera prüfen lässt.
const DRY_KEYS = new URLSearchParams(window.location.search).has("tasten");
// Mit ?experimente erscheinen iPhone-Brücke und iPhone-Test. Sie gehören nicht zur Hauptsoftware.
const EXPERIMENTS = new URLSearchParams(window.location.search).has("experimente");
// Mit ?hauptthread läuft die Erkennung ohne Worker, für Vergleichsläufe.
const MAIN_THREAD = new URLSearchParams(window.location.search).has("hauptthread");
const WINDOW_MS = 3000;
const CURVE_MS = 10000;
const IRIS_RANGE = 0.6;
const DEGREE_RANGE = 25;
const HEAD_IN_DEGREES = 10;
const DIRECTION_DEGREES = 5;
const FULLSCREEN_TIMEOUT_MS = 2000;
const FULLSCREEN_SETTLE_MS = 1500;
const POSE_WINDOW_MS = 1000;
const REMEMBER_WINDOW_MS = 2000;
// Zwei Gesichter im Modell schalten seine Glättung ab; gemessen wird nur bei genau einem.
const NUM_FACES = 2;
const CAMERA_WISH = "1280x720x30";
const SMOOTHING_NOTE = "Modellglättung aus";
const STALL_MS = 1500;
const WARMUP_MS = 1000;
const ZERO_MS = 1000;
const LIVE_FILTER_MS = 140;
const BOOK_ASPECT = 1.6;

const $ = (id) => document.getElementById(id);
const video = $("video");
// Bildquelle: das Videoelement oder die Brücke mit denselben Feldern.
let source = video;
const overlay = $("overlay");
const ctx = overlay.getContext("2d");
const controls = ["toggle", "camera", "distance", "screenCm"];
const calControls = ["camera", "distance", "screenCm", "zero"];

let detector = null;
let skippedFrames = 0;
let stream = null;
let running = false;
let busy = false;
let session = 0;
let frameHandle = null;
let segmentStart = 0;
let lastFrameAt = null;
let lastFrameMs = null;
let clockOffset = null;
let lastStamp = 0;
let clockSource = "–";
let duplicates = 0;
let stalled = false;
let previousHead = null;
let previousHeadMs = null;
let headZero = null;
let zero = { rechts: { x: 0, y: 0 }, links: { x: 0, y: 0 } };
let zeroSet = false;
let samples = [];
let calibration = null;
let calRun = 0;
let calibrating = false;
let collecting = null;
// Nur während der Pause: Kopflage der letzten Bilder, keine Messdaten.
let pauseProbe = null;
let cancelCard = null;
let lastRun = null;
let runUnsaved = false;
let examSession = emptySession();
// Nur iPhone-Test: Kopflage sperrt nichts, Abweichungen werden weiter vermerkt.
let headFree = false;
let headEvents = [];
let currentTarget = { h: 0, v: 0 };
let reference = null;
let positionOk = false;
let faceVisible = false;

const spoken = (ms) => (ms < 90000 ? `rund ${Math.round(ms / 5000) * 5} s` : `rund ${Math.round(ms / 30000) / 2} min`.replace(".", ","));
const comma = (value, digits = 2) => value.toFixed(digits).replace(".", ",");
const signed = (value) => (value === null ? "–" : `${value > 0 ? "+" : ""}${comma(value)}`);

function setStatus(text, warn = false) {
  $("status").textContent = text;
  $("status").classList.toggle("warn", warn);
  $("status").hidden = !text;
}

async function createDetector() {
  if (DRY_RUN) {
    const { fakeLandmarker } = await import("./pruefung/trockenlauf.js");
    detector = fakeDetector(fakeLandmarker(() => currentTarget));
    return;
  }
  const opened = await openDetector(NUM_FACES, { forceMainThread: MAIN_THREAD });
  detector = opened.detector;
  if (opened.workerError) setStatus(`Worker nicht verfügbar, Erkennung im Hauptthread: ${opened.workerError}`, true);
}

function closeDetector() {
  detector?.close();
  detector = null;
}

function resetSegment() {
  segmentStart = performance.now() + WARMUP_MS;
  samples = [];
  duplicates = 0;
  skippedFrames = 0;
  previousHead = null;
  headZero = null;
  zero = { rechts: { x: 0, y: 0 }, links: { x: 0, y: 0 } };
  zeroSet = false;
  $("mZero").textContent = calibration ? "aus Kalibrierung" : "nicht gesetzt";
  $("direction").textContent = "–";
  $("mPos").textContent = "–";
}

function clearRates() {
  for (const id of ["mRate", "mValid", "mReason", "mNoise", "mIris", "mMs", "mDup", "mDiff", "cDrift"]) {
    $(id).textContent = "–";
  }
}

function frameClock(metadata) {
  if (metadata.captureTime > 0) return { ms: metadata.captureTime, source: "captureTime" };
  return { ms: metadata.mediaTime * 1000, source: "mediaTime" };
}

function taskStamp(frameMs) {
  clockOffset ??= lastStamp + 1000 - frameMs;
  lastStamp = Math.max(lastStamp + 1, Math.round(frameMs + clockOffset));
  return lastStamp;
}

function drawCurve(id, keys) {
  const canvas = $(id);
  const context = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const width = Math.round(canvas.clientWidth * dpr);
  const height = Math.round(canvas.clientHeight * dpr);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const style = getComputedStyle(document.documentElement);
  const range = calibration ? DEGREE_RANGE : IRIS_RANGE;
  const marks = calibration ? [-15, -5, 0, 5, 15] : [-0.12, 0, 0.12];
  context.clearRect(0, 0, width, height);
  const yOf = (value) => height / 2 - (value / range) * (height / 2);
  context.strokeStyle = style.getPropertyValue("--line");
  context.lineWidth = dpr;
  for (const value of marks) {
    context.beginPath();
    context.moveTo(0, yOf(value));
    context.lineTo(width, yOf(value));
    context.stroke();
  }
  if (!samples.length) return;
  const newest = samples.at(-1).frameMs;
  const xOf = (frameMs) => width - ((newest - frameMs) / CURVE_MS) * width;
  for (const [key, token, thickness] of keys) {
    context.strokeStyle = style.getPropertyValue(token);
    context.lineWidth = thickness * dpr;
    context.beginPath();
    let open = false;
    for (const sample of samples) {
      const value = sample[key];
      if (value === null) {
        open = false;
        continue;
      }
      const y = yOf(Math.max(-range, Math.min(range, value)));
      if (open) context.lineTo(xOf(sample.frameMs), y);
      else context.moveTo(xOf(sample.frameMs), y);
      open = true;
    }
    context.stroke();
  }
}

function drawCurves() {
  drawCurve("curve", [["head", "--head", 1.5], ["rechts", "--right", 1.5], ["links", "--left", 1.5], ["mean", "--mean", 2.5]]);
  drawCurve("curveV", [["vRechts", "--right", 1.5], ["vLinks", "--left", 1.5], ["vMean", "--mean", 2.5]]);
}

function applyValues(sample, raw) {
  if (calibration) {
    const degrees = (side) => (raw[side] && calibration[side].model
      ? toDegrees(calibration[side].model, raw[side].x, raw[side].y) : null);
    const right = degrees("rechts");
    const left = degrees("links");
    const combined = combineEyes(raw.rechts, raw.links, calibration);
    sample.rechts = right?.h ?? null;
    sample.links = left?.h ?? null;
    sample.vRechts = right?.v ?? null;
    sample.vLinks = left?.v ?? null;
    sample.mean = combined?.h ?? null;
    sample.vMean = combined?.v ?? null;
    sample.disagree = combined?.disagree ?? false;
    return;
  }
  const relative = (side) => (raw[side]
    ? { x: raw[side].x - zero[side].x, y: raw[side].y - zero[side].y } : null);
  const right = relative("rechts");
  const left = relative("links");
  const present = [right, left].filter(Boolean);
  sample.rechts = right?.x ?? null;
  sample.links = left?.x ?? null;
  sample.vRechts = right?.y ?? null;
  sample.vLinks = left?.y ?? null;
  if (present.length) {
    sample.mean = present.reduce((sum, value) => sum + value.x, 0) / present.length;
    sample.vMean = present.reduce((sum, value) => sum + value.y, 0) / present.length;
  }
}

// Reize laufen auf performance.now(); captureTime liegt auf derselben Uhr, sonst der Callback.
const eventTime = (timing) => timing.captureMs ?? timing.at;
const screenWidthCm = () => Number($("screenCm").value) || SCREEN_WIDTH_CM;

// Der Mittelwert laeuft live durch denselben Median wie die Auswertung; die Augen bleiben roh.
function filterLive(sample, key) {
  sample[`${key}Raw`] = sample[key];
  if (sample[key] === null) return;
  const recent = [];
  for (let i = samples.length - 1; i >= 0 && sample.frameMs - samples[i].frameMs <= LIVE_FILTER_MS; i -= 1) {
    const value = samples[i][`${key}Raw`];
    if (value !== null && value !== undefined) recent.push(value);
  }
  sample[key] = median([...recent, sample[key]]);
}

function pushProbe(probe, head, irisPx) {
  if (!probe) return;
  probe.push({ head, irisPx });
  if (probe.length > PAUSE_PROBE_FRAMES) probe.shift();
}

// target und probe stammen aus dem Moment der Aufnahme: Das Ergebnis kommt später, die Messphase kann dann schon gewechselt haben.
function recordFrame(timing, faces, target, probe) {
  const sample = { ...timing, rechts: null, links: null, mean: null, vRechts: null, vLinks: null,
                   vMean: null, head: null, irisPx: null, headPoint: null, raw: null, pose: null,
                   disagree: false, reasons: [] };
  if (faces.length !== 1) {
    sample.reasons.push(faces.length ? "zweite Person" : "kein Gesicht");
    previousHead = null;
    samples.push(sample);
    target?.samples.push({ t: timing.frameMs, time: eventTime(timing), rechts: null, links: null, irisPx: null, head: null });
    pushProbe(probe, null, null);
    return;
  }
  const frame = measureFrame(faces[0], source.videoWidth, source.videoHeight, previousHead,
                             previousHeadMs === null ? undefined : timing.frameMs - previousHeadMs);
  previousHead = frame.head;
  previousHeadMs = timing.frameMs;
  headZero ??= frame.head;
  const point = (eye) => (eye.valid ? { x: eye.x, y: eye.y, aperture: eye.aperture } : null);
  sample.raw = { rechts: point(frame.rechts), links: point(frame.links) };
  sample.irisPx = frame.irisPx;
  sample.headPoint = frame.head;
  sample.pose = analysePose(faces[0], source.videoWidth, source.videoHeight);
  if (frame.irisPx > 0) {
    const scale = calibration ? HEAD_IN_DEGREES : 1;
    sample.head = (-(frame.head.x - headZero.x) / frame.irisPx) * scale;
  }
  applyValues(sample, sample.raw);
  filterLive(sample, "mean");
  filterLive(sample, "vMean");
  sample.reasons = [...new Set([...frame.rechts.reasons, ...frame.links.reasons])];
  if (sample.disagree) sample.reasons.push("Seitendifferenz");
  samples.push(sample);
  const rejected = (eye) => (eye.valid ? undefined : { aperture: eye.aperture, reasons: eye.reasons });
  pushProbe(probe, frame.head, frame.irisPx);
  target?.samples.push({
    t: timing.frameMs, time: eventTime(timing), ...sample.raw, irisPx: frame.irisPx,
    irisRechts: frame.rechts.irisPx, irisLinks: frame.links.irisPx, head: frame.head,
    rejectedRechts: rejected(frame.rechts), rejectedLinks: rejected(frame.links),
  });
}

async function analyse(id, callbackMs, frameMs, stamp, captureMs) {
  const target = collecting;
  const probe = pauseProbe;
  const analysisStart = performance.now();
  detector.busy = true;
  let result = null;
  try {
    result = await detector.detect(source.image ?? video, stamp);
  } finally {
    detector.busy = false;
  }
  const analysisEnd = performance.now();
  if (id !== session) return;
  ctx.clearRect(0, 0, overlay.width, overlay.height);
  const { faces } = result;
  if (faces.length === 1) {
    const style = getComputedStyle(document.documentElement);
    const right = style.getPropertyValue("--right");
    const left = style.getPropertyValue("--left");
    drawEyeMarks(ctx, overlay.width, overlay.height, faces[0], EYES.rechts, right);
    drawEyeMarks(ctx, overlay.width, overlay.height, faces[0], EYES.links, left);
    drawEyeCrop(source.image ?? video, source.videoWidth, source.videoHeight, faces[0], EYES.rechts, $("eyeRechts"), right);
    drawEyeCrop(source.image ?? video, source.videoWidth, source.videoHeight, faces[0], EYES.links, $("eyeLinks"), left);
  }
  recordFrame({ at: callbackMs, frameMs, captureMs, analysisStart, analysisEnd, ms: result.ms, roundMs: analysisEnd - analysisStart },
              faces, target, probe);
  samples = samples.filter((sample) => frameMs - sample.frameMs <= CURVE_MS);
  if (!collecting) drawCurves();
}

// Der Trockenlauf hat einen eigenen Takt, damit er auch im verdeckten Fenster laeuft.
function requestFrame(id) {
  if (DRY_RUN && source === video) {
    setTimeout(() => {
      const now = performance.now();
      onFrame(id, now, { presentedFrames: 0, mediaTime: now / 1000 });
    }, 1000 / 30);
    return;
  }
  frameHandle = source.requestVideoFrameCallback((now, metadata) => onFrame(id, now, metadata));
}

const nextPaint = (callback) => (DRY_RUN
  ? setTimeout(() => callback(performance.now()), 16)
  : requestAnimationFrame(callback));

function onFrame(id, now, metadata) {
  if (id !== session) return;
  lastFrameAt = now;
  if (stalled) {
    stalled = false;
    resetSegment();
    setStatus("Läuft. Neues Messsegment, Nullpunkt neu setzen.");
  }
  const clock = frameClock(metadata);
  clockSource = clock.source;
  if (lastFrameMs !== null && clock.ms <= lastFrameMs) {
    duplicates += 1;
    requestFrame(id);
    return;
  }
  lastFrameMs = clock.ms;
  // Die Kamera wartet nie auf die Erkennung. Ist sie belegt, entfällt dieses Bild und wird gezählt.
  if (detector.busy) {
    skippedFrames += 1;
    requestFrame(id);
    return;
  }
  analyse(id, now, clock.ms, taskStamp(clock.ms), metadata.captureTime > 0 ? metadata.captureTime : null).catch((error) => {
    if (id !== session) return;
    stop();
    setStatus(`Analyse abgebrochen: ${error.message}`, true);
  });
  requestFrame(id);
}

function setZero() {
  const now = performance.now();
  const recent = samples.filter((sample) => now - sample.at <= ZERO_MS && sample.raw);
  const center = (side) => {
    const points = recent.map((sample) => sample.raw[side]).filter(Boolean);
    if (!points.length) return null;
    return { x: median(points.map((p) => p.x)), y: median(points.map((p) => p.y)) };
  };
  const right = center("rechts");
  const left = center("links");
  if (!right || !left) {
    setStatus("Nullpunkt nicht gesetzt: keine gültigen Augenwerte.", true);
    return;
  }
  zero = { rechts: right, links: left };
  zeroSet = true;
  samples = [];
  previousHead = null;
  headZero = null;
  $("mZero").textContent = "gesetzt";
  setStatus("Nullpunkt gesetzt.");
}

function setCalibration(next) {
  calibration = next;
  samples = [];
  headZero = null;
  const degrees = Boolean(next);
  $("unit").textContent = degrees
    ? `Grad, Kopf: 1 Irisdurchmesser = ${HEAD_IN_DEGREES} Einheiten, Lücken = ungültig`
    : "Irisdurchmesser, Lücken = ungültig";
  $("mZero").textContent = degrees ? "aus Kalibrierung" : "nicht gesetzt";
  drawCurves();
}

function updateButtons() {
  // Der grobe Rahmen raet nur; der gemessene Abstand hat Vorrang, also sperrt er nicht.
  for (const button of document.querySelectorAll("[data-module], [data-all]")) button.disabled = calibrating || busy;
  const title = !running ? "Bereit, wenn Sie es sind." : faceVisible ? "Ihre Augen sind im Bild." : "Bringen Sie Ihr Gesicht ins Bild.";
  if ($("camTitle").textContent !== title) $("camTitle").textContent = title;
  $("liveText").textContent = !running ? "Kamera aus" : faceVisible ? "Augen erkannt" : "Kein Gesicht im Bild";
  $("liveDot").className = !running ? "off" : faceVisible ? "on" : "warn";
  $("stage").classList.toggle("off", !running);
}

function showHint(text, ok) {
  $("guideHint").textContent = text;
  $("guideHint").classList.toggle("ok", ok);
  $("guideHint").hidden = false;
}

function updateGuide(now) {
  if (calibrating || calibration) {
    clearGuide($("guide"), $("guideHint"));
    return;
  }
  const roughFrame = /facetime|standardkamera/i.test($("camera").selectedOptions[0]?.textContent ?? "");
  const target = targetFor(Number($("distance").value), reference, roughFrame);
  const poses = samples.filter((sample) => now - sample.at <= POSE_WINDOW_MS && sample.pose)
    .map((sample) => sample.pose);
  faceVisible = poses.length > 0;
  if (!faceVisible) {
    positionOk = false;
    drawGuide($("guide"), source.videoWidth, source.videoHeight, target, false);
    showHint("Kein Gesicht im Bild", false);
    updateButtons();
    return;
  }
  const result = assess(medianPose(poses), target, positionOk);
  positionOk = result.ok;
  drawGuide($("guide"), source.videoWidth, source.videoHeight, target, result.ok);
  showHint(result.hint, result.ok);
  updateButtons();
}

function rememberPosition() {
  const now = performance.now();
  const recent = samples.filter((sample) => now - sample.at <= REMEMBER_WINDOW_MS && sample.pose);
  const poses = recent.map((sample) => sample.pose);
  if (!isStable(poses)) {
    setStatus("Bild noch nicht ruhig genug: Kamera fest abstellen, zwei Sekunden stillhalten, dann erneut klicken.", true);
    return;
  }
  reference = makeReference(poses, recent.map((sample) => sample.irisPx), Number($("distance").value));
  invalidateCalibration("keine");
  updateButtons();
}

function clearReference() {
  reference = null;
  positionOk = false;
  faceVisible = false;
  $("pDist").textContent = "–";
  updateButtons();
}

function invalidateCalibration(state) {
  if (calibration) setCalibration(null);
  $("cState").textContent = state;
}

function endCalibrating() {
  calibrating = false;
  headFree = false;
  $("cal").hidden = true;
  collecting = null;
  $("calCard").hidden = true;
  $("calDot").hidden = false;
  for (const id of calControls) $(id).disabled = !running;
  updateButtons();
}

// Gemeinsamer Abbruch fuer Esc, verdecktes Fenster, Bildstillstand und Stopp.
function abortCalibration(message) {
  if (!calibrating) return;
  calRun += 1;
  cancelCard?.();
  $("calStripes").hidden = true;
  $("calDot").hidden = false;
  endCalibrating();
  if (document.fullscreenElement) document.exitFullscreen();
  invalidateCalibration("abgebrochen");
  setStatus(message, true);
}

function showCalibration(result) {
  const pair = (read) => `${read(result.rechts)} / ${read(result.links)}`;
  const degrees = (value, digits = 1) => (value === null ? "–" : `${comma(value, digits)}°`);
  const eyeText = (eye) => (eye.errorH === null
    ? (eye.reason ?? "–")
    : `${comma(eye.errorH, 1)}° / ${comma(eye.errorV, 1)}°${eye.passed ? "" : `, ${eye.reason}`}`);
  $("cRechts").textContent = eyeText(result.rechts);
  $("cLinks").textContent = eyeText(result.links);
  $("cMax").textContent = pair((eye) => degrees(eye.maxError));
  $("cNoiseH").textContent = pair((eye) => degrees(eye.noiseH, 2));
  $("cNoiseV").textContent = pair((eye) => degrees(eye.noiseV, 2));
  $("cMitte").textContent = eyeText(result.mittel);
  const iris = reference?.irisPx ?? 0;
  const perTenth = (eye, axis) => {
    const value = sensitivity(eye.model, iris)?.[axis];
    return value === undefined ? "–" : `${comma(value / 10, 2)}°`;
  };
  $("cSensH").textContent = `${perTenth(result.rechts, "h")} / ${perTenth(result.links, "h")}`;
  $("cSensV").textContent = `${perTenth(result.rechts, "v")} / ${perTenth(result.links, "v")}`;
  const axis = (name, passed) => (passed ? name : `${name} nicht`);
  const passedH = result.mittel.passedH;
  const passedV = result.mittel.passedV;
  $("cState").textContent = result.passed
    ? `bestanden: ${axis("horizontal", passedH)}, ${axis("vertikal", passedV)}`
    : "nicht bestanden";
}

const wait = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

function placeDot(target) {
  currentTarget = { ...target };
  const distance = Number($("distance").value);
  const pixel = targetPixels(target, distance, window.innerWidth, window.innerHeight, screenWidthCm());
  $("calDot").style.left = `${pixel.x}px`;
  $("calDot").style.top = `${pixel.y}px`;
}

// Im iPhone-Test läuft es notfalls im Fenster weiter; Winkel sind dann nur ungefähr.
async function enterFullscreen(id, lenient = false) {
  calibrating = true;
  for (const control of calControls) $(control).disabled = true;
  updateButtons();
  clearGuide($("guide"), $("guideHint"));
  invalidateCalibration("läuft");
  try {
    await Promise.race([
      document.documentElement.requestFullscreen(),
      wait(FULLSCREEN_TIMEOUT_MS).then(() => { throw new Error("keine Antwort"); }),
    ]);
  } catch (error) {
    if (id !== calRun) return false;
    if (!lenient) {
      endCalibrating();
      invalidateCalibration("keine");
      setStatus(`Vollbild nicht möglich: ${error.message}`, true);
      return false;
    }
  }
  await wait(300);
  // Safari meldet das Vollbild teils vor dem Ende des Uebergangs.
  const settled = performance.now() + FULLSCREEN_SETTLE_MS;
  while (Math.abs(window.innerWidth - window.screen.width) > 2 && performance.now() < settled) await wait(100);
  if (id !== calRun) return false;
  // Die Winkel stimmen nur, wenn das Fenster den ganzen Bildschirm fuellt.
  if (!lenient && Math.abs(window.innerWidth - window.screen.width) > 2) {
    abortCalibration("Vollbild nicht aktiv: Winkel wären falsch. Bitte auf dem MacBook-Bildschirm starten.");
    return false;
  }
  if (!lenient && !targetsFit(Number($("distance").value), window.innerWidth, window.innerHeight, screenWidthCm())) {
    abortCalibration("Die Blickziele passen bei diesem Abstand nicht auf den Bildschirm.");
    return false;
  }
  $("cal").hidden = false;
  return true;
}

// Kopf oder Abstand außerhalb der Abbruchgrenze. Der Aufrufer entscheidet: Etappe wiederholen oder Lauf beenden.
class HeadMoved extends Error {
  constructor(drift) {
    super("Kopf oder Abstand stark verändert");
    this.drift = drift;
  }
}

// Sammelt an einem Ziel. Liefert null, wenn der Lauf abgebrochen wurde; bewegt sich der Kopf, wirft sie HeadMoved.
async function collectTarget(id, target, settleMs, collectMs) {
  placeDot(target);
  await wait(settleMs);
  if (id !== calRun) return null;
  const entry = { target, samples: [], from: performance.now() };
  collecting = entry;
  await wait(collectMs);
  if (id !== calRun) return null;
  collecting = null;
  entry.to = performance.now();
  const drift = positionDrift(entry.samples, reference, source.videoWidth, source.videoHeight);
  if (drift?.moved && !headFree) throw new HeadMoved(drift);
  if (drift?.marked) {
    headEvents.push({ time: entry.from, target: target.name, distanceChange: drift.distanceChange, headShift: drift.headShift });
  }
  return entry;
}

function finishCalibration(entries) {
  const measured = entries.flatMap((entry) => entry.samples).filter((sample) => sample.head);
  const result = calibrate(entries);
  showCalibration(result);
  if (!result.passed || !measured.length) return result;
  result.irisPx = median(measured.map((sample) => sample.irisPx));
  result.head = { x: median(measured.map((s) => s.head.x)), y: median(measured.map((s) => s.head.y)) };
  setCalibration(result);
  return result;
}

async function leaveFullscreen() {
  endCalibrating();
  if (document.fullscreenElement) await document.exitFullscreen();
}

async function phaseFixation(id, durationMs) {
  const entry = { samples: [] };
  collecting = entry;
  await wait(durationMs);
  collecting = null;
  return id === calRun ? entry : null;
}

async function phaseGaze(id, part) {
  const holds = [];
  for (const target of part.targets) {
    const hold = await collectTarget(id, target, part.settleMs, part.holdMs);
    if (!hold) return null;
    holds.push({ target, samples: hold.samples });
    placeDot({ h: 0, v: 0 });
    await wait(part.returnMs);
    if (id !== calRun) return null;
  }
  return holds;
}

async function phaseAccuracy(id, part) {
  const entry = { samples: [], windows: [] };
  for (const target of part.targets) {
    const hold = await collectTarget(id, target, part.settleMs, part.collectMs);
    if (!hold) return null;
    entry.samples.push(...hold.samples);
    entry.windows.push({ target, from: hold.from, to: hold.to });
  }
  return entry;
}

async function phaseCalibration(id, part) {
  const entries = [];
  for (const target of part.targets) {
    const entry = await collectTarget(id, target, part.settleMs, part.collectMs);
    if (!entry) return null;
    entries.push(entry);
  }
  return entries;
}

function phasePursuit(id, run) {
  return new Promise((resolve) => {
    const entry = { run, samples: [], startTime: performance.now() };
    collecting = entry;
    const step = (now) => {
      if (id !== calRun) {
        resolve(null);
        return;
      }
      const elapsed = now - entry.startTime;
      if (elapsed >= run.durationMs) {
        collecting = null;
        resolve(entry);
        return;
      }
      const h = run.amplitude * Math.sin(2 * Math.PI * run.frequency * (Math.max(elapsed, 0) / 1000));
      placeDot({ h, v: 0 });
      nextPaint(step);
    };
    nextPaint(step);
  });
}

async function phaseSaccades(id, saccades) {
  const entry = { samples: [], jumps: [] };
  collecting = entry;
  const position = { h: 0, v: 0 };
  for (const jump of saccades.jumps) {
    await wait(saccades.minMs + Math.random() * (saccades.maxMs - saccades.minMs));
    if (id !== calRun) return null;
    const from = position[jump.axis];
    position[jump.axis] = jump.to;
    placeDot(position);
    const at = await new Promise((resolve) => { nextPaint(resolve); });
    entry.jumps.push({ axis: jump.axis, from, to: jump.to, at });
  }
  await wait(saccades.maxMs);
  collecting = null;
  return id === calRun ? entry : null;
}

const CARD_POLL_MS = 200;
const DRY_CARD_MS = 300;
const PAUSE_PROBE_FRAMES = 15;
const CARD_KEY = "Weiter mit Leertaste";
const REPEAT_NOTICE = "Der Kopf hat sich bewegt. Diese Etappe wird wiederholt.";

function fillCard(fields) {
  collecting = null;
  fillCardFields({ dot: $("calDot"), stripes: $("calStripes"), calText: $("calText"), step: $("cardStep"),
    title: $("cardTitle"), text: $("cardText"), duration: $("cardDuration"), notice: $("cardNotice"),
    key: $("cardKey"), head: $("cardHead"), card: $("calCard") }, fields);
}

// Die Wartelogik liegt in ansicht/karten.js; hier hängen nur die geteilten Zustände dran.
function awaitInput(id, { onKey, onClick, onTick, dryMs, dryValue }) {
  return waitForInput({
    current: () => id === calRun,
    dry: DRY_RUN && !DRY_KEYS,
    pollMs: CARD_POLL_MS,
    register: (cancel) => { cancelCard = cancel; },
    onDone: () => { pauseProbe = null; cancelCard = null; },
    onKey, onClick, onTick, dryMs, dryValue,
  });
}

// Karte vor einer Etappe. Keine Messung; die Kopfprüfung läuft nur als Tor für Weiter.
// Liefert Beginn, Ende und Wartezeit oder null bei Abbruch.
async function showCard(id, card) {
  fillCard({ ...card, key: CARD_KEY });
  pauseProbe = [];
  const shownAt = performance.now();
  const headOk = () => DRY_RUN || headFree || canResume(pauseProbe ?? [], reference, source.videoWidth, source.videoHeight);
  const timing = () => {
    const continuedAt = performance.now();
    return { shownAt, continuedAt, waitMs: continuedAt - shownAt };
  };
  const attempt = (done) => {
    if (canContinue(performance.now() - shownAt, headOk())) done(timing());
  };
  return awaitInput(id, {
    onKey: (event, done) => {
      if (event.code !== "Space") return;
      event.preventDefault();
      attempt(done);
    },
    onClick: (event, done) => attempt(done),
    onTick: () => { $("cardHead").hidden = !pauseProbe?.length || headOk(); },
    dryMs: DRY_CARD_MS,
    dryValue: timing,
  });
}

// Schlusskarte: Taste 1 bis 5 oder Leertaste. Kein Tor durch die Kopfprüfung.
// Liefert { value } (1 bis 5 oder null) oder null bei Abbruch.
function askEffort(id) {
  fillCard({ step: "Geschafft", title: "Wie anstrengend war das?", text: "Taste 1 bis 5, Leertaste überspringt.",
             duration: "1 = gar nicht anstrengend, 5 = sehr anstrengend" });
  return awaitInput(id, {
    onKey: (event, done) => {
      if (event.code === "Space") {
        event.preventDefault();
        done({ value: null });
        return;
      }
      const value = effortFromKey(event.key);
      if (value !== null) {
        event.preventDefault();
        done({ value });
      }
    },
    dryMs: DRY_CARD_MS,
    dryValue: () => ({ value: null }),
  });
}

// Hinführung: Punkt in der Mitte, die Rohwerte dieser Sekunde sind nur für den Nullpunkt.
async function leadPhase(id) {
  $("calCard").hidden = true;
  $("calStripes").hidden = true;
  placeDot({ h: 0, v: 0 });
  $("calDot").hidden = false;
  const entry = { samples: [] };
  collecting = entry;
  await wait(LEAD_MS);
  collecting = null;
  return id === calRun ? entry.samples : null;
}

const OKN_INSTRUCTION = "Streifen verfolgen, dann den nächsten nehmen. Kopf ruhig.";
const DRY_BEAT_S = 0.6;
const DRY_SLOW_SPEED = 6;

function oknBlock(id, block, stripes) {
  return new Promise((resolve) => {
    const moving = block.kind === "moving" || block.kind === "control";
    $("calStripes").hidden = !moving;
    $("calDot").hidden = block.kind === "moving" || block.kind === "grey";
    placeDot({ h: 0, v: 0 });
    $("calText").textContent = "";
    const entry = { block: { ...block }, samples: [] };
    entry.block.from = performance.now();
    collecting = entry;
    const step = (now) => {
      if (id !== calRun) {
        resolve(null);
        return;
      }
      const elapsed = now - entry.block.from;
      if (elapsed >= block.durationMs) {
        collecting = null;
        entry.block.to = performance.now();
        $("calStripes").hidden = true;
        currentTarget = { h: 0, v: 0 };
        resolve(entry);
        return;
      }
      if (moving) drawStripes(stripes, Math.max(elapsed, 0) / 1000, block.direction);
      if (DRY_RUN && block.kind === "moving") {
        const slow = ((elapsed / 1000) % DRY_BEAT_S) * DRY_SLOW_SPEED;
        currentTarget = { h: block.direction * (slow - (DRY_BEAT_S * DRY_SLOW_SPEED) / 2), v: 0 };
      }
      nextPaint(step);
    };
    nextPaint(step);
  });
}

function checkHead(samples) {
  if (headFree) return;
  const drift = positionDrift(samples, reference, source.videoWidth, source.videoHeight);
  if (drift?.moved) throw new HeadMoved(drift);
}

function samplesOf(part, data) {
  switch (part.kind) {
    case "calibration":
    case "okn": return data.flatMap((entry) => entry.samples);
    case "gaze": return data.flatMap((hold) => hold.samples);
    default: return data.samples;
  }
}

// Ein Messteil. Liefert null bei Abbruch; wirft HeadMoved, wenn der Kopf die Grenze überschreitet.
// Zielpunkte prüfen den Kopf je Ziel (collectTarget), die übrigen Teile am Ende.
async function measurePart(id, part, stripes) {
  let data = null;
  switch (part.kind) {
    case "calibration": return phaseCalibration(id, part);
    case "accuracy": return phaseAccuracy(id, part);
    case "gaze": return phaseGaze(id, part);
    case "fixation": data = await phaseFixation(id, part.durationMs); break;
    case "pursuit": data = await phasePursuit(id, part.run); break;
    case "saccades": data = await phaseSaccades(id, part); break;
    case "okn":
      data = [];
      for (const block of part.blocks) {
        const entry = await oknBlock(id, block, stripes);
        if (!entry) return null;
        data.push(entry);
      }
      break;
    default: throw new Error(`unbekannter Teil: ${part.kind}`);
  }
  if (data) checkHead(samplesOf(part, data));
  return data;
}

// Die Messdaten behalten ihre Form je Baustein, damit Auswertung und alte Dateien weiter passen.
function mergeStage(run, results) {
  for (const { part, data } of results) {
    switch (part.kind) {
      case "calibration": run.calibration = [...(run.calibration ?? []), ...data]; break;
      case "accuracy": run.accuracy = data; break;
      case "fixation": run.fixation = data; break;
      case "gaze": run.gaze.push(...data); break;
      case "pursuit": run.pursuit.push(data); break;
      case "saccades": run.saccades = data; break;
      case "okn": run.okn.push(...data); break;
      default: break;
    }
  }
}

// Eine Etappe: Karte, Hinführung, Messung. Bewegt sich der Kopf, werden nur die Daten dieser Etappe verworfen
// und ihre Karte erscheint erneut, höchstens zweimal. Alle anderen Abbrüche beenden den Lauf.
async function runStage(id, protocol, stage, run, stripes, { skipCard = false } = {}) {
  const position = protocol.stages.indexOf(stage);
  let repeats = 0;
  let waitMs = 0;
  let notice = "";
  for (;;) {
    let card = null;
    if (!skipCard || repeats > 0) {
      card = await showCard(id, { step: stepText(position, protocol.stages.length), title: stage.title, text: stage.text,
                                  duration: cardDuration(stageMs(stage)), notice });
      if (!card) return null;
      waitMs += card.waitMs;
    }
    const leadSamples = await leadPhase(id);
    if (!leadSamples) return null;
    try {
      const results = [];
      for (const part of stage.parts) {
        const data = await measurePart(id, part, stripes);
        if (!data) return null;
        results.push({ part, data });
      }
      const drift = positionDrift(results.flatMap(({ part, data }) => samplesOf(part, data)), reference,
                                  source.videoWidth, source.videoHeight);
      mergeStage(run, results);
      return { id: stage.id, title: stage.title, shownAt: card?.shownAt ?? null, continuedAt: card?.continuedAt ?? null,
               waitMs, leadSamples, headShift: drift?.headShift ?? null, repeats };
    } catch (error) {
      collecting = null;
      if (!(error instanceof HeadMoved)) throw error;
      if (!canRepeat(repeats)) {
        abortCalibration("Kopf oder Abstand stark verändert: Lauf abgebrochen.");
        return null;
      }
      repeats += 1;
      notice = REPEAT_NOTICE;
    }
  }
}

async function examPhases(id, protocol, stripes) {
  const run = { pursuit: [], okn: [], gaze: [], stages: [] };
  const record = (entry) => {
    const index = run.stages.findIndex((item) => item.id === entry.id);
    if (index >= 0) run.stages[index] = entry;
    else run.stages.push(entry);
  };
  for (const stage of protocol.stages) {
    const entry = await runStage(id, protocol, stage, run, stripes);
    if (!entry) return null;
    record(entry);
    if (stage.id !== "kalibrierung-2" || calibrate(run.calibration).mittel.passedH) continue;
    // Horizontale nicht freigegeben: beide Teile einmal wiederholen. Danach läuft es weiter wie bisher,
    // auch bei erneutem Misserfolg; die Auswertung kennzeichnet die Kalibrierung dann als nicht bestanden.
    const parts = ["kalibrierung-1", "kalibrierung-2"].map((name) => protocol.stages.find((item) => item.id === name));
    const card = await showCard(id, { title: "Kalibrierung wiederholen",
      text: "Die Kalibrierung hat nicht gepasst. Beide Teile laufen einmal noch einmal. Kopf ruhig, nur mit den Augen folgen.",
      duration: cardDuration(parts.reduce((sum, item) => sum + stageMs(item), 0)) });
    if (!card) return null;
    run.calibrationRetry = card;
    run.calibration = [];
    for (const again of parts) {
      const retried = await runStage(id, protocol, again, run, stripes, { skipCard: true });
      if (!retried) return null;
      record({ ...retried, calibrationRetry: true });
    }
  }
  return run;
}

const MODULE_STATUS = {
  nystagmus: (f) => f.spontaneous?.status,
  blickfolge: (f) => f.pursuitStatus,
  sakkaden: (f) => f.saccadeStatus,
  optokinetik: (f) => f.okn?.status,
};

function renderReportView() {
  const done = new Set(examSession.modules);
  const measured = MODULES.filter((item) => item.id !== "kalibrierung");
  let findings = null;
  let headline = "Noch keine Messung.";
  if (lastRun) {
    try {
      const report = buildReport({ run: lastRun.run, meta: lastRun.meta });
      ({ findings } = report);
      headline = report.summary.headline;
    } catch (error) {
      headline = `Bericht nicht berechenbar: ${error.message}`;
    }
  }
  $("rOverall").textContent = headline;
  $("rLines").replaceChildren(...measured.map((item) => {
    const row = document.createElement("li");
    const name = document.createElement("b");
    const state = document.createElement("span");
    name.textContent = item.title;
    state.textContent = done.has(item.id) ? (MODULE_STATUS[item.id](findings ?? {}) ?? "untersucht") : "nicht untersucht";
    row.className = done.has(item.id) ? "" : "open";
    row.append(name, state);
    return row;
  }));
  $("rSave").disabled = !lastRun;
  $("rReport").disabled = !lastRun;
  const count = measured.filter((item) => done.has(item.id)).length;
  $("count").textContent = `${count} von ${measured.length}`;
  for (const tile of document.querySelectorAll("[data-module]")) {
    const known = moduleById(tile.dataset.module);
    if (known) tile.querySelector("em").textContent = `${done.has(known.id) ? "Fertig · " : ""}${tile.dataset.duration}`;
    tile.classList.toggle("done", done.has(tile.dataset.module));
  }
}

const listItem = (label, value, className = "") => {
  const row = document.createElement("li");
  const name = document.createElement("b");
  const state = document.createElement("span");
  name.textContent = label;
  state.textContent = value;
  row.className = className;
  row.append(name, state);
  return row;
};

const currentSetting = () => ({
  camera: $("camera").selectedOptions[0]?.textContent ?? "",
  distanceCm: Number($("distance").value),
  screenWidthCm: screenWidthCm(),
});

let pendingCalibration = null;

function moduleChart(id, report) {
  const [rest, , saccades, pursuit] = report.sections;
  if (id === "nystagmus") return restChart(rest.points);
  if (id === "blickfolge") return pursuit.runs.map(pursuitChart).join("");
  if (id === "sakkaden") return endpointChart(saccades.endpoints);
  if (id === "optokinetik") return (report.findings.okn?.items ?? []).map((item) => traceChart(item.points)).join("");
  return "";
}

// Rückmeldung direkt nach dem Modul: hat es geklappt, und wie sieht es grob aus.
function renderOutcome(protocol, run) {
  const moduleIds = protocol.modules ?? [];
  const calibrated = moduleIds.includes("kalibrierung");
  const report = buildReport({ run: lastRun.run, meta: lastRun.meta });
  const share = validShare(run);
  const headline = outcomeHeadline(share);
  $("oEyebrow").textContent = protocol.title;
  $("oTitle").textContent = headline.title;
  $("oTitle").dataset.tone = headline.tone;
  $("oQuality").textContent = `${Math.round(share * 100)} % gültige Bilder.`;
  const lines = moduleIds.flatMap((id) => moduleSummary(id, report.findings));
  $("oLines").replaceChildren(...lines.map((line) => listItem(line.text, line.status)));
  $("oCal").hidden = !calibrated;
  $("oChart").innerHTML = moduleIds.map((id) => moduleChart(id, report)).join("");
  $("oNote").textContent = moduleIds.includes("sakkaden") && report.calibration.selfScaled
    ? "Ohne Kalibrierung zählt die erste Landung; die Endlage liefert den Maßstab." : "";
  pendingCalibration = null;
  if (calibrated) {
    const fitted = calibrate(run.calibration);
    const points = calibrationPoints(run.calibration, fitted);
    const cloud = cloudSummary(points.filter((point) => point.role === "check"));
    const graded = gradeCalibration(fitted, cloud.share);
    $("oChart").innerHTML = calibrationChart(points, TARGET_ZONE);
    $("oNote").textContent = fitted.mittel.model
      ? `${cloud.inside} von ${cloud.total} Messungen an den Prüfpunkten (${Math.round(cloud.share * 100)} %) liegen im Zielbereich, ±${TARGET_ZONE.h}° horizontal und ±${TARGET_ZONE.v}° vertikal. Jeder Punkt ist ein Kamerabild, die gestrichelte Ellipse umfasst zwei Standardabweichungen. Blasse Punkte dienten zum Lernen.`
      : "Keine Berechnung möglich, deshalb nur die Sollpunkte.";
    $("oTitle").textContent = `Kalibrierung: ${graded.grade}.`;
    $("oTitle").dataset.tone = graded.tone;
    $("oQuality").textContent = graded.text;
    $("oCalRows").replaceChildren(...graded.rows.flatMap(([name, value]) => {
        const label = document.createElement("dt");
        const number = document.createElement("dd");
        label.textContent = name;
        number.textContent = value;
        return [label, number];
      }));
    $("calState").textContent = graded.grade.toLowerCase();
    $("calState").closest(".step").classList.toggle("done", graded.tone !== "poor");
    $("calSaveRow").hidden = graded.tone === "poor";
    pendingCalibration = { entries: run.calibration, reference, grade: graded.grade, errorH: fitted.mittel.errorH };
    $("calName").value = "";
    $("calSave").disabled = false;
    $("calSave").textContent = "Kalibrierung merken";
  }
  $("oRepeat").onclick = () => startExam(sessionProtocol(moduleIds, { needsScale: needsScale(examSession, moduleIds) }));
}

function renderSaved() {
  const here = currentSetting();
  const records = listSaved();
  $("savedBox").hidden = !records.length;
  $("savedCals").replaceChildren(...records.map((record) => {
    const fits = sameSetting(record.setting, here);
    const row = listItem(record.name, `${new Date(record.createdAt).toLocaleDateString("de-DE")} · ${record.grade}${fits ? "" : " · anderes Setting"}`);
    const use = document.createElement("button");
    const drop = document.createElement("button");
    use.className = "pill small";
    use.textContent = "Verwenden";
    use.disabled = !fits;
    use.addEventListener("click", () => useSaved(record));
    drop.className = "pill ghost small";
    drop.textContent = "Löschen";
    drop.addEventListener("click", () => {
      removeCalibration(record.id);
      renderSaved();
    });
    row.append(use, drop);
    return row;
  }));
}

function useSaved(record) {
  if (!running) {
    showView("camView");
    setStatus("Starten Sie zuerst die Kamera, dann die gemerkte Kalibrierung.", true);
    return;
  }
  reference = record.reference;
  const now = performance.now();
  const recent = samples.filter((sample) => now - sample.at <= POSE_WINDOW_MS && sample.headPoint)
    .map((sample) => ({ head: sample.headPoint, irisPx: sample.irisPx }));
  const drift = positionDrift(recent, reference, source.videoWidth, source.videoHeight);
  if (!drift || drift.moved) {
    showView("camView");
    setStatus("Sitzposition weicht ab. Richten Sie sich aus, bis der Rahmen grün ist, und verwenden Sie die Kalibrierung dann erneut.", true);
    return;
  }
  finishCalibration(record.entries);
  examSession = mergeRun(examSession, { calibration: record.entries }, ["kalibrierung"]);
  $("calState").textContent = "gemerkt";
  $("calState").closest(".step").classList.add("done");
  setStatus(`Kalibrierung „${record.name}“ verwendet.`);
  showView("tools");
}

function saveCurrentCalibration() {
  if (!pendingCalibration) return;
  const name = $("calName").value.trim() || "Kalibrierung";
  const stored = saveCalibration({ ...pendingCalibration, id: crypto.randomUUID(), name, createdAt: new Date().toISOString(), setting: currentSetting() });
  $("calSave").disabled = stored;
  $("calSave").textContent = stored ? "Gemerkt" : "Speicher voll";
  renderSaved();
}

function showResult(protocol, run, meta) {
  // Eine durchgefallene Kalibrierung gilt nicht: Die nächsten Module laufen mit grobem Maßstab statt ohne Bewertung.
  const failed = run.calibration && !calibrate(run.calibration).mittel.passedH;
  examSession = mergeRun(examSession, failed ? { ...run, calibration: undefined } : run, protocol.modules ?? [protocol.id]);
  const titles = examSession.modules.map((id) => moduleById(id)?.title).filter(Boolean).join(", ");
  lastRun = { kind: "sitzung", meta: { ...meta, protocol: titles, modules: examSession.modules }, run: examSession };
  runUnsaved = true;
  $("rSave").textContent = "Messung speichern";
  renderReportView();
  renderOutcome(protocol, run);
}

// Nimmt die Position, wie sie gerade ist. Ohne Gesicht gibt es keine Messung, das sagt die Meldung offen.
function takePositionAsIs() {
  const now = performance.now();
  const recent = samples.filter((sample) => now - sample.at <= REMEMBER_WINDOW_MS && sample.pose);
  if (!recent.length) {
    const size = `${source.videoWidth}×${source.videoHeight}`;
    setStatus(`Kein Gesicht erkannt. Bild ${size}, Analysen je Sekunde ${$("mRate").textContent}, Hauptgrund ${$("mReason").textContent}.`, true);
    return false;
  }
  reference = makeReference(recent.map((sample) => sample.pose), recent.map((sample) => sample.irisPx), Number($("distance").value));
  invalidateCalibration("keine");
  return true;
}

async function runExam(protocol, { lenient = false } = {}) {
  if (busy || calibrating || !running) return;
  // Kein window.confirm: Safari wertet den Klick danach nicht mehr als Nutzeraktion und verweigert das Vollbild.
  if (lenient) {
    if (!takePositionAsIs()) return;
  } else if (!reference || !calibration) {
    // Ohne Kalibrierung gilt je Modul die aktuelle Haltung, sonst sperrt eine Pause zwischen den Modulen.
    reference = null;
    rememberPosition();
    if (!reference) return;
  }
  headEvents = [];
  const id = ++calRun;
  const entered = enterFullscreen(id, lenient);
  headFree = lenient;
  if (!await entered) return;
  const fullscreen = Boolean(document.fullscreenElement);
  $("calText").textContent = "";
  const stripes = hasPart(protocol, "okn")
    ? prepareStripes({ canvas: $("calStripes"), width: window.innerWidth, height: window.innerHeight,
                       distance: Number($("distance").value), screenCm: screenWidthCm() })
    : null;
  const run = await examPhases(id, protocol, stripes);
  if (!run) return;
  if (protocol.scaleOnly && run.saccades) run.saccades.scaleOnly = true;
  const effort = await askEffort(id);
  if (!effort) return;
  await leaveFullscreen();
  if (run.calibration) finishCalibration(run.calibration);
  const field = fieldDegrees(screenWidthCm(), Number($("distance").value));
  showResult(protocol, run, {
    createdAt: new Date().toISOString(),
    protocol: protocol.title,
    purpose: "Experimenteller Proof of Concept, nicht mit Normkollektiven geeicht, keine Diagnose",
    effort: effort.value,
    okn: stripes ? { instruction: OKN_INSTRUCTION, speedDegPerS: OKN_SPEED, periodDeg: stripes.periodDeg,
                     stripePairs: field / stripes.periodDeg, fieldDeg: field, colors: [OKN_LIGHT, OKN_DARK] } : null,
    smoothing: SMOOTHING_NOTE,
    filter: "Median rund 140 ms in Auswertung, Rohwerte im Export",
    distanceCm: Number($("distance").value),
    screenWidthCm: screenWidthCm(),
    cameraWish: CAMERA_WISH,
    camera: /iphone/i.test($("camera").selectedOptions[0]?.textContent ?? "") ? "iPhone" : "FaceTime oder andere",
    headCheck: lenient ? "aus" : "an",
    fullscreen,
    detector: detector.mode,
    skippedFrames,
    bridge: source === video ? null : { skippedInPage: source.skipped, droppedInBridge: source.droppedByBridge },
    mode: $("mMode").textContent,
    clock: clockSource,
    duplicates,
    headEvents,
    reference,
  });
  showView("outcome");
}

function saveRun() {
  if (!lastRun) return;
  const { kind, ...data } = lastRun;
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: "application/json" }));
  link.download = `ocumotion-lauf-${kind}-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.json`;
  link.click();
  // Sofortiges Freigeben kann den Download abbrechen, besonders bei großen Dateien.
  setTimeout(() => URL.revokeObjectURL(link.href), 60000);
  runUnsaved = false;
  $("rSave").textContent = "Gespeichert";
  setStatus(`Gespeichert in Downloads: ${link.download}`);
}

function renderStats() {
  if (!running) return;
  const now = performance.now();
  if (!stalled && lastFrameAt !== null && now - lastFrameAt > STALL_MS) {
    stalled = true;
    resetSegment();
    setStatus("Keine Bilder: Fenster verdeckt? Messsegment beendet.", true);
    abortCalibration("Keine Bilder: Kalibrierung abgebrochen.");
  }
  updateGuide(now);
  if (now < segmentStart) {
    clearRates();
    return;
  }
  const from = Math.max(now - WINDOW_MS, segmentStart);
  const seconds = Math.max((now - from) / 1000, 0.001);
  const recent = samples.filter((sample) => sample.at >= from);
  $("mRate").textContent = comma(recent.length / seconds, 1);
  $("mDup").textContent = duplicates;
  $("mClock").textContent = clockSource;
  if (!recent.length) {
    for (const id of ["mValid", "mReason", "mNoise", "mIris", "mMs"]) $(id).textContent = "–";
    return;
  }
  const valid = recent.filter((sample) => sample.mean !== null);
  $("mValid").textContent = `${Math.round((valid.length / recent.length) * 100)} %`;
  const counts = new Map();
  for (const sample of recent) {
    for (const reason of sample.reasons) counts.set(reason, (counts.get(reason) ?? 0) + 1);
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  $("mReason").textContent = top ? top[0] : "keine";
  const noise = standardDeviation(valid.map((sample) => sample.mean));
  $("mNoise").textContent = noise === null ? "–" : comma(noise, 3);
  if (reference) {
    const seen = recent.filter((sample) => sample.pose);
    const estimate = seen.length
      ? estimateDistance(reference, median(seen.map((sample) => sample.irisPx)),
                         median(seen.map((sample) => sample.pose.span)))
      : null;
    $("pDist").textContent = estimate === null ? "unsicher" : `${comma(estimate, 0)} cm`;
  }
  const widths = recent.map((sample) => sample.irisPx).filter((value) => value !== null);
  $("mIris").textContent = widths.length ? `${Math.round(median(widths))} px` : "–";
  $("mMs").textContent = `${comma(recent.reduce((sum, s) => sum + s.ms, 0) / recent.length, 1)} ms`;
  const latest = valid.slice(-5);
  const last = samples.at(-1);
  const unit = calibration ? "°" : "";
  const value = (number) => (number === null ? "–" : `${signed(number)}${unit}`);
  $("mPos").textContent = `${value(last.rechts)} / ${value(last.links)}`;
  if (calibration) {
    const h = latest.length ? median(latest.map((sample) => sample.mean)) : null;
    const heights = latest.map((sample) => sample.vMean).filter((value) => value !== null);
    const v = heights.length ? median(heights) : null;
    const side = direction(h, DIRECTION_DEGREES);
    let label = "–";
    if (side !== null) {
      const height = v > DIRECTION_DEGREES ? " oben" : v < -DIRECTION_DEGREES ? " unten" : "";
      label = `${side}${height} ${comma(Math.abs(h), 0)}°`;
    }
    $("direction").textContent = label;
    const both = recent.filter((sample) => sample.rechts !== null && sample.links !== null);
    $("mDiff").textContent = both.length
      ? `${comma(median(both.map((sample) => Math.abs(sample.rechts - sample.links))), 1)}°` : "–";
    const seen = recent.filter((sample) => sample.headPoint);
    if (seen.length) {
      const iris = median(seen.map((sample) => sample.irisPx));
      const change = iris / calibration.irisPx - 1;
      const headX = median(seen.map((sample) => sample.headPoint.x));
      const headY = median(seen.map((sample) => sample.headPoint.y));
      const moved = Math.hypot(headX - calibration.head.x, headY - calibration.head.y) / iris;
      $("cDrift").textContent = `${change > 0 ? "näher " : "weiter "}${comma(Math.abs(change) * 100, 0)} %`;
      if (Math.abs(change) > STOP_DISTANCE_CHANGE || moved > STOP_HEAD_SHIFT) {
        invalidateCalibration("ungültig, Kopf bewegt");
        setStatus("Kopf hat sich stark bewegt: Kalibrierung ungültig, bitte neu kalibrieren.", true);
      } else if (Math.abs(change) > MARK_DISTANCE_CHANGE || moved > MARK_HEAD_SHIFT) {
        setStatus("Kopf hat sich bewegt: Grad ungenauer.", true);
      } else if ($("status").textContent.startsWith("Kopf hat sich bewegt")) {
        setStatus("Kalibriert. Kurve in Grad.");
      }
    }
  } else {
    const smoothed = latest.length ? median(latest.map((sample) => sample.mean)) : null;
    $("direction").textContent = zeroSet ? (direction(smoothed) ?? "–") : "nicht kalibriert";
  }
}

async function start() {
  const deviceId = $("camera").value;
  const [wishWidth, wishHeight, wishFps] = CAMERA_WISH.split("x").map(Number);
  const viaBridge = deviceId === "bruecke";
  try {
    // Vor der Brücke laden: Ihr Bildstrom würde das Laden sonst ausbremsen.
    if (!detector) {
      setStatus("Lade Modell …");
      await createDetector();
    }
    if (viaBridge) {
      const { openBridge } = await import("./kamera/bruecke.js");
      source = await openBridge($("bridgeView"), () => {
        if (!running) return;
        stop();
        setStatus("Brücke getrennt. Messung beendet.", true);
      });
      $("bridgeView").hidden = false;
    } else {
      const open = (frameRate) => navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { width: { ideal: wishWidth }, height: { ideal: wishHeight }, frameRate,
                 ...(deviceId ? { deviceId: { exact: deviceId } } : {}) },
      });
      // Safari bleibt beim iPhone mit ideal bei 30 fps. Erst fest verlangen, sonst so viel wie möglich.
      stream = DRY_RUN ? (await import("./pruefung/trockenlauf.js")).fakeStream()
        : await open({ exact: wishFps }).catch(() => open({ ideal: wishFps }));
      video.srcObject = stream;
      await video.play();
    }
  } catch (error) {
    stop();
    const denied = error.name === "NotAllowedError";
    setStatus(denied ? "Kamerazugriff verweigert. Bitte im Browser erlauben und erneut starten."
      : error.name === "NotFoundError" ? "Keine Kamera gefunden." : `Start fehlgeschlagen: ${error.message}`, true);
    return;
  }
  overlay.width = source.videoWidth;
  overlay.height = source.videoHeight;
  $("hint").hidden = true;
  running = true;
  session += 1;
  stalled = false;
  lastFrameMs = null;
  clockOffset = null;
  $("toggle").textContent = "Kamera stoppen";
  $("toggle").classList.add("ghost");
  $("cameraNext").hidden = false;
  $("zero").disabled = false;
  updateButtons();
  const track = stream?.getVideoTracks()[0];
  track?.addEventListener("ended", () => {
    if (!running) return;
    stop();
    setStatus("Kamera getrennt. Messung beendet.", true);
  });
  const screenAspect = window.screen.width / window.screen.height;
  if (Math.abs(screenAspect - BOOK_ASPECT) > 0.02) {
    setStatus("Anderer Bildschirm erkannt? Bildschirmbreite prüfen, sonst sind die Winkel falsch.", true);
  }
  const { width, height, frameRate } = viaBridge
    ? { width: source.videoWidth, height: source.videoHeight, frameRate: 60 } : track.getSettings();
  $("mMode").textContent = `${width}×${height}, ${comma(frameRate ?? 0, 1)} fps${viaBridge ? ", Brücke" : ""}`;
  await listCameras();
  renderSaved();
  resetSegment();
  lastFrameAt = performance.now();
  if (!viaBridge && (frameRate ?? 0) < wishFps - 1) setStatus(`Kamera liefert nur ${comma(frameRate ?? 0, 0)} statt ${wishFps} fps.`, true);
  else setStatus("");
  requestFrame(session);
}

function stop() {
  running = false;
  session += 1;
  abortCalibration("Kamera gestoppt.");
  invalidateCalibration("keine");
  if (frameHandle !== null && (!DRY_RUN || source !== video)) source.cancelVideoFrameCallback(frameHandle);
  frameHandle = null;
  stream?.getTracks().forEach((track) => track.stop());
  stream = null;
  video.srcObject = null;
  source.close?.();
  source = video;
  $("bridgeView").hidden = true;
  ctx.clearRect(0, 0, overlay.width, overlay.height);
  for (const canvas of [$("eyeRechts"), $("eyeLinks")]) {
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
  }
  resetSegment();
  drawCurves();
  clearRates();
  $("mMode").textContent = "–";
  $("mClock").textContent = "–";
  $("hint").hidden = false;
  $("zero").disabled = true;
  clearReference();
  clearGuide($("guide"), $("guideHint"));
  $("toggle").textContent = "Kamera starten";
  $("toggle").classList.remove("ghost");
  $("cameraNext").hidden = true;
  updateButtons();
  setStatus("");
}

function addBridgeOption() {
  if (EXPERIMENTS) $("camera").add(new Option("iPhone über Brücke, 60 fps", "bruecke"));
}

async function listCameras() {
  const select = $("camera");
  const current = select.value;
  const devices = (await navigator.mediaDevices.enumerateDevices())
    .filter((device) => device.kind === "videoinput" && device.label);
  if (!devices.length) return;
  select.replaceChildren(...devices.map((device) => new Option(device.label, device.deviceId)));
  addBridgeOption();
  if (current) select.value = current;
  $("cameraRow").hidden = select.options.length < 2;
}

async function exclusive(action) {
  if (busy) return;
  busy = true;
  for (const id of controls) $(id).disabled = true;
  try {
    await action();
  } finally {
    busy = false;
    for (const id of controls) $(id).disabled = false;
  }
}

$("toggle").addEventListener("click", () => exclusive(running ? stop : start));
$("zero").addEventListener("click", setZero);
$("startCal").addEventListener("click", () => startModules(["kalibrierung"]));
$("rSave").addEventListener("click", saveRun);
if (EXPERIMENTS) {
  addBridgeOption();
  $("cameraRow").hidden = false;
  $("runPhone").hidden = false;
  $("runPhone").addEventListener("click", () => startExam({ ...PROTOCOLS.okn, title: "iPhone-Test Optokinetik" }, { lenient: true }));
}
function openReport() {
  if (!lastRun) return;
  window.ocumotionRun = lastRun;
  window.open("bericht.html", "_blank");
}
$("rReport").addEventListener("click", openReport);
$("oReport").addEventListener("click", openReport);
$("distance").addEventListener("change", geometryChanged);
document.addEventListener("fullscreenchange", () => {
  if (!document.fullscreenElement) abortCalibration("Vollbild beendet: Kalibrierung abgebrochen.");
});
$("camera").addEventListener("change", () => {
  if (running) exclusive(async () => { stop(); await start(); });
});
function geometryChanged() {
  clearReference();
  invalidateCalibration("keine");
}
$("screenCm").addEventListener("change", geometryChanged);
document.addEventListener("visibilitychange", () => {
  if (!running) return;
  resetSegment();
  abortCalibration("Fenster verdeckt: Kalibrierung abgebrochen.");
  if (document.hidden) setStatus("Tab verdeckt: Messsegment beendet.", true);
  else if (!calibration) setStatus("Läuft. Neues Messsegment.");
});
window.addEventListener("beforeunload", (event) => {
  if (runUnsaved) event.preventDefault();
});
window.addEventListener("pagehide", () => stream?.getTracks().forEach((track) => track.stop()));
window.addEventListener("resize", drawCurves);
navigator.mediaDevices?.addEventListener("devicechange", listCameras);

// Führung: genau eine Aufgabe je Ansicht. Das Bild läuft weiter und wandert in die Seitenleiste.
function showView(view) {
  // Die Kamera-Ansicht bleibt im Dokument, sonst stünde das Video still.
  for (const section of document.querySelectorAll(".view")) {
    if (section.id === "camView") section.classList.toggle("away", view !== "camView");
    else section.hidden = section.id !== view;
  }
  for (const step of document.querySelectorAll(".step[data-view]")) {
    if (step.dataset.view === view) step.setAttribute("aria-current", "page");
    else step.removeAttribute("aria-current");
  }
  $("stage").classList.toggle("parked", view !== "camView");
  if (view === "calView") renderSaved();
  document.querySelector("main").scrollTop = 0;
}

function startExam(protocol, options) {
  if (!running) {
    showView("camView");
    setStatus("Starten Sie zuerst die Kamera.", true);
    return;
  }
  setStatus("");
  runExam(protocol, options).catch((error) => {
    abortCalibration(`Untersuchung abgebrochen: ${error.message}`);
  });
}

function startModules(moduleIds) {
  startExam(sessionProtocol(moduleIds, { needsScale: needsScale(examSession, moduleIds) }));
}

for (const step of document.querySelectorAll("[data-view]")) step.addEventListener("click", () => showView(step.dataset.view));
for (const button of document.querySelectorAll("[data-go]")) button.addEventListener("click", () => showView(button.dataset.go));
for (const tile of document.querySelectorAll("[data-module]")) {
  tile.dataset.duration = spoken(stagesMs(moduleById(tile.dataset.module).stages));
  tile.addEventListener("click", () => startModules([tile.dataset.module]));
}
$("runAll").textContent = `Alle nacheinander · ${spoken(stagesMs(MODULES.filter((item) => item.id !== "kalibrierung").flatMap((item) => item.stages)))}`;
$("runAll").addEventListener("click", () => startModules(MODULES.filter((item) => item.id !== "kalibrierung").map((item) => item.id)));
$("calSave").addEventListener("click", saveCurrentCalibration);
for (const id of ["distance", "screenCm", "camera"]) $(id).addEventListener("change", renderSaved);
$("sidebar").addEventListener("click", () => $("app").classList.toggle("closed"));
$("openDetails").addEventListener("click", () => {
  $("details").showModal();
  drawCurves();
});
$("closeDetails").addEventListener("click", () => $("details").close());

setInterval(renderStats, 500);
drawCurves();
renderReportView();
updateButtons();
listCameras().then(renderSaved);
if (DRY_RUN) $("dryMark").hidden = false;
