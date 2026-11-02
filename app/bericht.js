// Seite des Berichts: Datei öffnen, drucken, Lauf aus dem Fenster der App übernehmen.
import { reportHtml } from "./messung/bericht-ansicht.js";

const main = document.getElementById("report");
const message = document.getElementById("message");

function fail(error) {
  main.hidden = true;
  main.replaceChildren();
  message.textContent = `Datei nicht lesbar: ${error.message}`;
}

function show(data) {
  try {
    main.innerHTML = reportHtml(data);
    main.hidden = false;
    message.textContent = "";
  } catch (error) {
    fail(error);
  }
}

// Ein fremdes Ursprungsfenster als Öffner sperrt der Browser beim Zugriff.
function runFromOpener() {
  try {
    return window.opener?.ocumotionRun ?? null;
  } catch {
    return null;
  }
}

document.getElementById("print").addEventListener("click", () => window.print());
document.getElementById("file").addEventListener("change", async (event) => {
  const [file] = event.target.files;
  if (!file) return;
  try {
    show(JSON.parse(await file.text()));
  } catch (error) {
    fail(error);
  }
});

const run = runFromOpener();
if (run) show(run);
