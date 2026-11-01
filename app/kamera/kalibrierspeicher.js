// Gemerkte Kalibrierungen liegen nur in diesem Browser, benannt und einzeln löschbar. Sie enthalten Augenwerte, keine Bilder.

const KEY = "ocumotion.kalibrierungen";

export function sameSetting(a, b) {
  return a.camera === b.camera && a.distanceCm === b.distanceCm && Math.abs(a.screenWidthCm - b.screenWidthCm) < 0.05;
}

export function listSaved(storage = window.localStorage) {
  try {
    return JSON.parse(storage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

function write(records, storage) {
  try {
    storage.setItem(KEY, JSON.stringify(records));
    return true;
  } catch {
    return false;
  }
}

export function saveCalibration(record, storage = window.localStorage) {
  return write([...listSaved(storage).filter((item) => item.id !== record.id), record], storage);
}

export function removeCalibration(id, storage = window.localStorage) {
  return write(listSaved(storage).filter((item) => item.id !== id), storage);
}
