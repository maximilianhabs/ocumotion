// Konstruierter Lauf für die Berichtstests.
import { ACCURACY_TARGETS, PURSUIT_RUNS } from "../app/messung/guetetest-logik.js";
import { STEPS } from "../app/messung/kalibrierung-logik.js";

const FRAME_MS = 1000 / 30;
const eyeAt = (h, v) => ({ x: 0.04 + 0.018 * h, y: 0.018 * v, aperture: 0.36 });

export function samples(durationMs, start, position) {
  return Array.from({ length: Math.floor(durationMs / FRAME_MS) }, (_, i) => {
    const time = start + i * FRAME_MS;
    const { h, v } = position(time);
    return { t: time, time, rechts: eyeAt(h, v), links: eyeAt(h, v), irisPx: 30, head: { x: 640, y: 300 } };
  });
}

export function fullRun() {
  let clock = 0;
  const phase = (durationMs, position) => {
    const list = samples(durationMs, clock, position);
    clock += durationMs + 500;
    return list;
  };
  const calibration = STEPS.map((target) => ({ target, samples: phase(2800, () => target) }));
  const fixation = { samples: phase(20000, () => ({ h: 0, v: 0 })) };
  const windows = [];
  const accuracySamples = ACCURACY_TARGETS.flatMap((target) => {
    const from = clock;
    const list = phase(1800, () => target);
    windows.push({ target, from, to: from + 1800 });
    return list;
  });
  const pursuit = PURSUIT_RUNS.map((run) => {
    const startTime = clock;
    const list = phase(run.durationMs, (time) => ({
      h: run.amplitude * Math.sin(2 * Math.PI * run.frequency * ((time - startTime) / 1000)), v: 0,
    }));
    return { run, startTime, samples: list };
  });
  const start = clock;
  const jumps = [
    { axis: "h", from: 0, to: 10, at: start + 1000 },
    { axis: "h", from: 10, to: -10, at: start + 2500 },
  ];
  const saccadeSamples = phase(4000, (time) => {
    if (time >= jumps[1].at + 200) return { h: -10, v: 0 };
    if (time >= jumps[0].at + 200) return { h: 10, v: 0 };
    return { h: 0, v: 0 };
  });
  return {
    calibration, fixation, accuracy: { samples: accuracySamples, windows }, pursuit,
    saccades: { samples: saccadeSamples, jumps },
  };
}
