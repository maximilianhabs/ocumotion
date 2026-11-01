# Herkunft

Unveränderte Kopien. Die Prüfsummen stehen in `PRUEFSUMMEN.txt`, `make test` vergleicht sie.

| Datei | Quelle | Lizenz |
|---|---|---|
| `vision_bundle.mjs`, `wasm/vision_wasm_internal.*` | npm `@mediapipe/tasks-vision` 1.2.0, Integrität sha512 gegen die npm-Angabe geprüft | Apache-2.0 laut `package.json`; das Paket enthält keine Lizenzdatei |
| `face_landmarker.task` | `storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/` | Modellkarte im Original noch zu prüfen, siehe `docs/ROAD_TO_PUBLIC.md` |

Weggelassen sind die Fassungen ohne SIMD und die Modulfassung. Browser ohne SIMD laufen deshalb nicht.
