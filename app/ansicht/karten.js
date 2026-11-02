// Textkarte: setzt die Felder, leere Felder werden versteckt. Die Elemente kommen als Parameter.
export function fillCardFields(els, { step = "", title, text, duration = "", notice = "", key = "" }) {
  els.dot.hidden = true;
  els.stripes.hidden = true;
  els.calText.textContent = "";
  const set = (element, value) => {
    element.textContent = value;
    element.hidden = !value;
  };
  set(els.step, step);
  set(els.title, title);
  set(els.text, text);
  set(els.duration, duration);
  set(els.notice, notice);
  set(els.key, key);
  els.head.hidden = true;
  els.card.hidden = false;
}

// Wartet auf Eingabe. Bei Abbruch (Lauf gewechselt, Esc, Vollbildende) löst sie mit null auf und entfernt
// in jedem Fall beide Listener und die Zeitgeber. Im Trockenlauf läuft sie nach dryMs von selbst weiter.
// current(): gehört die Karte noch zum laufenden Lauf. dry: Trockenlauf ohne echte Taste.
// register(cancel): meldet die Abbruchfunktion an; onDone(): Aufräumen des Aufrufers vor dem Auflösen.
export function waitForInput({ current, dry, pollMs, register, onDone, onKey, onClick, onTick, dryMs, dryValue }) {
  return new Promise((resolve) => {
    let timer = null;
    const keyListener = (event) => {
      if (!event.repeat) onKey?.(event, finish);
    };
    const clickListener = (event) => onClick?.(event, finish);
    function finish(value) {
      clearInterval(timer);
      clearTimeout(timer);
      document.removeEventListener("keydown", keyListener);
      document.removeEventListener("click", clickListener);
      onDone();
      resolve(value);
    }
    register(() => finish(null));
    if (dry) {
      timer = setTimeout(() => finish(current() ? dryValue() : null), dryMs);
      return;
    }
    document.addEventListener("keydown", keyListener);
    document.addEventListener("click", clickListener);
    timer = setInterval(() => {
      if (!current()) finish(null);
      else onTick?.();
    }, pollMs);
    onTick?.();
  });
}
