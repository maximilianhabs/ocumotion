// Etappen: Dauer, Kartenangabe, Bereitschaft und Wiederholung. Reine Rechenlogik ohne Browserbezug.
// Eine Etappe hat eine Karte (keine Messung), 1 s Hinführung (nur Nullpunkt) und dann ihre Messteile.

export const LEAD_MS = 1000;
export const MIN_CARD_MS = 1000;
export const MAX_REPEATS = 2;
const CARD_STEP_S = 5;

// Messdauer eines Teils; Sprünge mit mittlerem Abstand.
export function partMs(part) {
  switch (part.kind) {
    case "calibration":
    case "accuracy": return part.targets.length * (part.settleMs + part.collectMs);
    case "fixation": return part.durationMs;
    case "gaze": return part.targets.length * (part.settleMs + part.holdMs + part.returnMs);
    case "pursuit": return part.run.durationMs;
    case "saccades": return part.jumps.length * ((part.minMs + part.maxMs) / 2) + part.maxMs;
    case "okn": return part.blocks.reduce((sum, block) => sum + block.durationMs, 0);
    default: throw new Error(`unbekannter Teil: ${part.kind}`);
  }
}

export const stageMs = (stage) => stage.parts.reduce((sum, part) => sum + partMs(part), 0);

// Geplante Dauer ohne Wartezeit auf den Karten.
export const stagesMs = (stages) => stages.reduce((sum, stage) => sum + LEAD_MS + stageMs(stage), 0);

export const hasPart = (protocol, kind) => protocol.stages.some((stage) => stage.parts.some((part) => part.kind === kind));

// Auf 5 s gerundet, mindestens 5 s.
export function cardDuration(ms) {
  const seconds = Math.max(CARD_STEP_S, Math.round(ms / 1000 / CARD_STEP_S) * CARD_STEP_S);
  return `rund ${seconds} Sekunden`;
}

export const stepText = (index, total) => `Schritt ${index + 1} von ${total}`;

// Weiter erst nach der Mindestzeit und nur mit Kopf innerhalb der Grenze.
export const canContinue = (elapsedMs, headOk) => elapsedMs >= MIN_CARD_MS && headOk;

// Bisherige Wiederholungen der Etappe; danach Abbruch.
export const canRepeat = (repeats) => repeats < MAX_REPEATS;

// Taste 1 bis 5; alles andere ist keine Angabe.
export function effortFromKey(key) {
  return ["1", "2", "3", "4", "5"].includes(key) ? Number(key) : null;
}
