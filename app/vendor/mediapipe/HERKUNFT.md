# Herkunft

Unveränderte Kopien. Die Prüfsummen stehen in `PRUEFSUMMEN.txt`, `make test` vergleicht sie.

| Datei | Quelle | Lizenz |
|---|---|---|
| `vision_bundle.mjs`, `wasm/vision_wasm_module_internal.*` | npm `@mediapipe/tasks-vision` 1.2.0, Integrität sha512 gegen die npm-Angabe geprüft | Apache-2.0 laut `package.json`; das Paket enthält keine Lizenzdatei |
| `face_landmarker.task` | `storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/` | Apache-2.0 laut den Modellkarten FaceMesh (15.09.2022) und BlazeFace (09.06.2021). FaceMesh nennt Unterhaltung als Zweck und schließt lebenswichtige Entscheidungen aus. Die Blendshape-Karte ist nicht gelesen, das Modell nutzen wir nicht |

Nur die Modulfassung liegt hier, weil Module-Worker sie brauchen. Die Fassung ohne SIMD fehlt, Browser ohne SIMD laufen deshalb nicht.
