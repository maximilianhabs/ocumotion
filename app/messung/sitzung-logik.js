// Eine Sitzung sammelt die Ergebnisse der einzelnen Module, damit Oculytics daraus den Gesamtbericht baut.
// Wird ein Modul wiederholt, ersetzt das neue Ergebnis das alte.

const PARTS = ["calibration", "calibrationRetry", "accuracy", "fixation", "saccades"];
const LISTS = ["gaze", "pursuit", "okn"];

export function emptySession() {
  return { modules: [], stages: [], gaze: [], pursuit: [], okn: [] };
}

export function needsScale(session, moduleIds) {
  const calibrated = (session.calibration?.length ?? 0) > 0 || moduleIds.includes("kalibrierung");
  return !calibrated && !session.saccades && !moduleIds.includes("sakkaden");
}

export function mergeRun(session, run, moduleIds) {
  const next = { ...session };
  for (const key of PARTS) {
    if (run[key] === undefined) continue;
    // Eine reine Maßstabsetappe überschreibt keine echte Sakkaden-Untersuchung.
    if (key === "saccades" && run.saccades.scaleOnly && session.saccades && !session.saccades.scaleOnly) continue;
    next[key] = run[key];
  }
  for (const key of LISTS) {
    if (run[key]?.length) next[key] = run[key];
  }
  const replaced = new Set((run.stages ?? []).map((stage) => stage.id));
  next.stages = [...session.stages.filter((stage) => !replaced.has(stage.id)), ...(run.stages ?? [])];
  next.modules = [...new Set([...session.modules, ...moduleIds])];
  return next;
}
