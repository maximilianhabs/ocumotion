// Die App läuft ohne Fremdabrufe, und die eingecheckten Fremddateien sind unverändert. Aufruf: make test
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const APP = new URL("../app/", import.meta.url).pathname;
const VENDOR = join(APP, "vendor/mediapipe");

const ownFiles = readdirSync(APP, { recursive: true })
  .filter((file) => /\.(html|js|mjs|css)$/.test(file) && !file.startsWith("vendor"));

test("eigene Dateien nennen keine Adresse im Netz", () => {
  assert.ok(ownFiles.length > 10);
  for (const file of ownFiles) {
    const hits = readFileSync(join(APP, file), "utf8").match(/https?:\/\/[^\s"'`)]+/g) ?? [];
    assert.deepEqual(hits.filter((url) => !url.startsWith("http://www.w3.org/")), [], file);
  }
});

test("jede Seite verbietet Fremdabrufe", () => {
  for (const page of ["index.html", "bericht.html"]) {
    const html = readFileSync(join(APP, page), "utf8");
    assert.match(html, /Content-Security-Policy" content="default-src 'none'/, page);
    assert.doesNotMatch(html.match(/Content-Security-Policy[^>]*/)[0], /https?:/, page);
  }
});

test("Fremddateien stimmen mit ihren Prüfsummen überein", () => {
  const lines = readFileSync(join(VENDOR, "PRUEFSUMMEN.txt"), "utf8").trim().split("\n");
  assert.equal(lines.length, 4);
  for (const line of lines) {
    const [sum, file] = line.split(/\s+/);
    const actual = createHash("sha256").update(readFileSync(join(VENDOR, file))).digest("hex");
    assert.equal(actual, sum, file);
  }
});

test("Alle Elemente, die die App anspricht, stehen in der Seite", () => {
  const html = readFileSync(join(APP, "index.html"), "utf8");
  const script = readFileSync(join(APP, "app.js"), "utf8");
  const ids = new Set([...html.matchAll(/ id="([^"]+)"/g)].map((match) => match[1]));
  const used = [...script.matchAll(/\$\("([^"]+)"\)/g)].map((match) => match[1]);
  assert.ok(used.length > 50);
  assert.deepEqual([...new Set(used)].filter((id) => !ids.has(id)), []);
  assert.equal(ids.size, [...html.matchAll(/ id="/g)].length, "doppelte Kennung");
});
