// Die drei Untersuchungsprotokolle als Etappen. Alle Zeiten sind Entwürfe, keine normierten Untersuchungsdauern.

import { ACCURACY_TARGETS, GAZE_HOLDS, GAZE_HOLD_MS, GAZE_RETURN_MS, GAZE_SETTLE_MS, FIXATION_MS, PURSUIT_RUNS,
         SACCADE_JUMPS, SACCADE_MAX_MS, SACCADE_MIN_MS, TARGET_COLLECT_MS, TARGET_SETTLE_MS } from "./guetetest-logik.js";
import { OKN_BLOCKS } from "./okn-logik.js";
import { CAL_COLLECT_MS, CAL_SETTLE_MS, STEPS } from "./kalibrierung-logik.js";
import { stagesMs } from "./etappen-logik.js";

const SUPPORT = "Stützen Sie den Kopf an, wenn möglich. ";
const byId = (id) => OKN_BLOCKS.find((block) => block.id === id);
const holds = (...names) => GAZE_HOLDS.filter((hold) => names.includes(hold.name));
const stage = (id, title, text, ...parts) => ({ id, title, text, parts });

const calibration = (role) => ({ kind: "calibration", targets: STEPS.filter((target) => target.role === role),
                                 settleMs: CAL_SETTLE_MS, collectMs: CAL_COLLECT_MS });
const fixation = (durationMs) => ({ kind: "fixation", durationMs });
const gaze = (targets, settleMs, holdMs, returnMs) => ({ kind: "gaze", targets, settleMs, holdMs, returnMs });
const pursuit = (run) => ({ kind: "pursuit", run });
const saccades = (jumps, minMs, maxMs) => ({ kind: "saccades", jumps, minMs, maxMs });
const okn = (...blocks) => ({ kind: "okn", blocks });

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

// Der Optokinetik-Lauf: sieben Sprünge liefern nur den Maßstab, es gibt keine Kalibrierung.
const OKN_ONLY_JUMPS = [
  { axis: "h", to: 10 }, { axis: "h", to: -10 }, { axis: "h", to: 10 }, { axis: "h", to: -10 },
  { axis: "h", to: 10 }, { axis: "h", to: -10 }, { axis: "h", to: 0 },
];

const STRIPES_TEXT = "Folgen Sie den Streifen mit den Augen, immer dem nächsten. Kopf ruhig.";

export const PROTOCOLS = {
  kurz: {
    id: "kurz",
    title: "Kurzlauf",
    stages: [
      stage("ruhe", "Ruhe", `${SUPPORT}Schauen Sie ruhig auf den Punkt. Blinzeln ist erlaubt.`, fixation(16000)),
      stage("blick", "Blick in alle Richtungen", "Folgen Sie dem Punkt und halten Sie den Blick dort.",
            gaze(GAZE_HOLDS, 800, 3200, 800)),
      stage("folge", "Blickfolge", "Verfolgen Sie den Punkt mit den Augen.",
            pursuit({ name: "langsam", amplitude: 10, frequency: 0.25, durationMs: 8000 })),
      stage("sprünge", "Sprünge", "Der Punkt springt. Schauen Sie sofort zum neuen Punkt.", saccades(SHORT_JUMPS, 900, 1300)),
      stage("streifen", "Streifen", STRIPES_TEXT, okn(...SHORT_OKN)),
    ],
  },
  lang: {
    id: "lang",
    title: "Ausführlicher Lauf",
    stages: [
      stage("kalibrierung-1", "Kalibrierung Teil 1", `${SUPPORT}Folgen Sie dem Punkt nur mit den Augen, Kopf ruhig.`, calibration("fit")),
      stage("kalibrierung-2", "Kalibrierung Teil 2", "Dasselbe noch einmal, mit anderen Punkten.", calibration("check")),
      stage("ziele", "Neue Punkte", "Schauen Sie jeweils auf den neuen Punkt.",
            { kind: "accuracy", targets: ACCURACY_TARGETS, settleMs: TARGET_SETTLE_MS, collectMs: TARGET_COLLECT_MS }),
      stage("ruhe", "Ruhe", "Schauen Sie ruhig auf den Punkt. Blinzeln ist erlaubt.", fixation(FIXATION_MS)),
      stage("blick-seite", "Blick zur Seite", "Folgen Sie dem Punkt und halten Sie den Blick dort.",
            gaze(holds("rechts", "links"), GAZE_SETTLE_MS, GAZE_HOLD_MS, GAZE_RETURN_MS)),
      stage("blick-vertikal", "Blick nach oben und unten", "Folgen Sie dem Punkt und halten Sie den Blick dort.",
            gaze(holds("oben", "unten"), GAZE_SETTLE_MS, GAZE_HOLD_MS, GAZE_RETURN_MS)),
      stage("folge-langsam", "Blickfolge langsam", "Verfolgen Sie den Punkt mit den Augen.", pursuit(PURSUIT_RUNS[0])),
      stage("folge-schnell", "Blickfolge schnell", "Verfolgen Sie den Punkt, er ist jetzt schneller.", pursuit(PURSUIT_RUNS[1])),
      stage("sprünge", "Sprünge", "Der Punkt springt. Schauen Sie sofort zum neuen Punkt.",
            saccades(SACCADE_JUMPS, SACCADE_MIN_MS, SACCADE_MAX_MS)),
    ],
  },
  okn: {
    id: "okn",
    title: "Optokinetik",
    // Links zuerst: Alle bisherigen Läufe begannen rechts, so lässt sich ein Reihenfolge-Effekt prüfen.
    stages: [
      stage("start", "Beginn", `${SUPPORT}Schauen Sie ruhig auf den Punkt. Danach springt er: Schauen Sie sofort zum neuen Punkt.`,
            fixation(3000), saccades(OKN_ONLY_JUMPS, 900, 1300)),
      stage("streifen", "Streifen", STRIPES_TEXT,
            okn(...["basis", "links", "pause", "rechts", "erholung"].map((id) => ({ ...byId(id) })))),
      stage("kontrolle", "Kontrolle", "Schauen Sie jetzt nur auf den Punkt und folgen Sie den Streifen nicht.",
            okn({ ...byId("kontrolle") })),
    ],
  },
};

// Geplante Dauer: Messung und Hinführung, ohne Wartezeit auf den Karten.
export const plannedMs = (protocol) => stagesMs(protocol.stages);
