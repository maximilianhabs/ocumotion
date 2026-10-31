// Die zwei Untersuchungsprotokolle. Alle Zeiten sind Entwürfe, keine normierten Untersuchungsdauern.

import { ACCURACY_TARGETS, FIXATION_MS, GAZE_HOLD_MS, GAZE_HOLDS, GAZE_RETURN_MS, GAZE_SETTLE_MS, PAUSE_MS,
         PURSUIT_RUNS, SACCADE_JUMPS, SACCADE_MAX_MS, SACCADE_MIN_MS, TARGET_COLLECT_MS, TARGET_SETTLE_MS } from "./guetetest-logik.js";
import { OKN_BLOCKS } from "./okn-logik.js";
import { STEPS } from "./kalibrierung-logik.js";

const SHORT_JUMPS = [
  { axis: "h", to: 10 }, { axis: "h", to: -10 }, { axis: "h", to: 10 }, { axis: "h", to: -10 },
  { axis: "h", to: 10 }, { axis: "h", to: -10 }, { axis: "h", to: 0 },
  { axis: "v", to: 8 }, { axis: "v", to: -8 }, { axis: "v", to: 8 }, { axis: "v", to: 0 },
];

const SHORT_OKN = [
  { id: "rechts", label: "Muster nach rechts", kind: "moving", direction: 1, durationMs: 7000 },
  { id: "pause", label: "Pause", kind: "grey", direction: 0, durationMs: 1000 },
  { id: "links", label: "Muster nach links", kind: "moving", direction: -1, durationMs: 7000 },
];

export const PROTOCOLS = {
  kurz: {
    id: "kurz",
    title: "Kurzlauf",
    calibrated: false,
    announceMs: 1000,
    fixationMs: 16000,
    gaze: { settleMs: 800, holdMs: 3200, returnMs: 800 },
    accuracy: false,
    pursuit: [{ name: "langsam", amplitude: 10, frequency: 0.25, durationMs: 8000 }],
    saccades: { jumps: SHORT_JUMPS, minMs: 900, maxMs: 1300 },
    okn: SHORT_OKN,
  },
  lang: {
    id: "lang",
    title: "Ausführlicher Lauf",
    calibrated: true,
    announceMs: PAUSE_MS,
    fixationMs: FIXATION_MS,
    gaze: { settleMs: GAZE_SETTLE_MS, holdMs: GAZE_HOLD_MS, returnMs: GAZE_RETURN_MS },
    accuracy: true,
    pursuit: PURSUIT_RUNS,
    saccades: { jumps: SACCADE_JUMPS, minMs: SACCADE_MIN_MS, maxMs: SACCADE_MAX_MS },
    okn: OKN_BLOCKS,
  },
};

const CALIBRATION_MS = STEPS.length * 4000 + 3300;

// Geplante Dauer ohne Einrichtung, Sprünge mit mittlerem Abstand.
export function plannedMs(protocol) {
  const { announceMs, fixationMs, gaze, pursuit, saccades, okn } = protocol;
  const gazeMs = GAZE_HOLDS.length * (gaze.settleMs + gaze.holdMs + gaze.returnMs);
  const pursuitMs = pursuit.reduce((sum, run) => sum + run.durationMs + announceMs, 0);
  const saccadeMs = saccades.jumps.length * ((saccades.minMs + saccades.maxMs) / 2) + saccades.maxMs;
  const oknMs = okn.reduce((sum, block) => sum + block.durationMs, 0);
  const accuracyMs = protocol.accuracy ? ACCURACY_TARGETS.length * (TARGET_SETTLE_MS + TARGET_COLLECT_MS) + announceMs : 0;
  const extraAnnounces = 4 * announceMs + (okn.some((block) => block.kind === "control") ? announceMs : 0);
  return (protocol.calibrated ? CALIBRATION_MS : 0) + fixationMs + gazeMs + pursuitMs + saccadeMs + oknMs + accuracyMs + extraAnnounces;
}
