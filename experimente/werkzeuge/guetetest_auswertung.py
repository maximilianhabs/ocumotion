#!/usr/bin/env python3
"""Vertiefte Auswertung einer Gütetest-Datei, nur Standardbibliothek.

Experimentell. Kleines Bild-zu-Bild-Rauschen belegt bei aktiver Glättung keine hohe Präzision, und der
Vergleich mit der idealen Geometrie ist nur eine Näherung, kein Maß für eine Modelldämpfung.

Aufruf: python3.13 experimente/werkzeuge/guetetest_auswertung.py ~/Downloads/macvision-guetetest-….json
Die Datei ist personenbezogen und gehört nicht ins Repo.
"""
import json
import math
import statistics as st
import sys


def degrees(model, point):
    return (
        model["h"][0] + model["h"][1] * point["x"] + model["h"][2] * point["y"],
        model["v"][0] + model["v"][1] * point["x"] + model["v"][2] * point["y"],
    )


def series(samples, models):
    """Mittel beider Augen und Einzelaugen je Bild."""
    rows = []
    for sample in samples:
        row = {"time": sample["time"], "iris": sample.get("irisPx"), "head": sample.get("head")}
        values = []
        for side in ("rechts", "links"):
            point = sample.get(side)
            if point and models.get(side):
                row[side] = degrees(models[side], point)
                values.append(row[side])
            else:
                row[side] = None
        row["h"] = st.fmean(v[0] for v in values) if values else None
        row["v"] = st.fmean(v[1] for v in values) if values else None
        rows.append(row)
    return rows


def robust_sd(values):
    if not values:
        return None
    middle = st.median(values)
    return 1.4826 * st.median(abs(v - middle) for v in values)


def frame_step_noise(values):
    steps = [b - a for a, b in zip(values, values[1:])]
    return robust_sd(steps) / math.sqrt(2) if steps else None


def rounded(value, digits):
    return None if value is None else round(value, digits)


def correlation(first, second):
    if len(first) < 3 or len(set(first)) < 2 or len(set(second)) < 2:
        return None
    return round(st.correlation(first, second), 2)


def timing(samples):
    times = [s["time"] for s in samples]
    steps = sorted(b - a for a, b in zip(times, times[1:]))
    if not steps:
        return None
    return {
        "median_ms": round(st.median(steps), 1),
        "p95_ms": round(steps[int(len(steps) * 0.95)], 1),
        "max_ms": round(steps[-1], 1),
    }


def fixation(rows):
    good = [r for r in rows if r["h"] is not None]
    if len(good) < 10:
        return {"bilder": len(rows), "hinweis": "zu wenige gültige Bilder"}
    h = [r["h"] for r in good]
    v = [r["v"] for r in good]
    center_v = st.median(v)
    outliers = [i for i, value in enumerate(v) if abs(value - center_v) > 3]
    episodes = sum(1 for i, index in enumerate(outliers) if i == 0 or index - outliers[i - 1] > 3)
    pairs = [r for r in good if r["rechts"] and r["links"]]
    difference = [r["rechts"][0] - r["links"][0] for r in pairs]
    heads = [r["head"] for r in rows if r["head"]]
    return {
        "bilder": len(rows),
        "sd_h": round(st.stdev(h), 2),
        "robust_sd_h": round(robust_sd(h), 2),
        "sd_v": round(st.stdev(v), 2),
        "robust_sd_v": round(robust_sd(v), 2),
        "bild_zu_bild_h": rounded(frame_step_noise(h), 3),
        "bild_zu_bild_v": rounded(frame_step_noise(v), 3),
        "ausreisser_v_ueber_3grad": len(outliers),
        "ausreisser_episoden": episodes,
        "differenz_r_l_h_median": rounded(st.median(difference), 2) if difference else None,
        "differenz_r_l_h_robust_sd": rounded(robust_sd(difference), 2),
        "korrelation_r_l_h": correlation([r["rechts"][0] for r in pairs], [r["links"][0] for r in pairs]),
        "korrelation_r_l_v": correlation([r["rechts"][1] for r in pairs], [r["links"][1] for r in pairs]),
        "korrelation_v_irisbreite": correlation([r["v"] for r in pairs], [r["iris"] for r in pairs]),
        "kopf_x_px": round(max(p["x"] for p in heads) - min(p["x"] for p in heads), 1) if heads else None,
        "kopf_y_px": round(max(p["y"] for p in heads) - min(p["y"] for p in heads), 1) if heads else None,
    }


def pursuit(entry, models):
    run = entry["run"]
    start = entry["startTime"]
    omega = 2 * math.pi * run["frequency"] / 1000
    rows = [r for r in series(entry["samples"], models) if r["h"] is not None]
    settled = [r for r in rows if r["time"] - start >= 1000]
    if len(settled) < 30:
        return {"name": run["name"], "hinweis": "zu wenige gültige Bilder"}
    best = None
    for lag in range(-200, 501, 5):
        target = [run["amplitude"] * math.sin(omega * (r["time"] - lag - start)) for r in settled]
        mean = st.fmean(target)
        eye = [r["h"] for r in settled]
        eye_mean = st.fmean(eye)
        error = sum((e - eye_mean - (t - mean)) ** 2 for e, t in zip(eye, target))
        if best is None or error < best[0]:
            best = (error, lag)
    cycles = {}
    period = 1000 / run["frequency"]
    for cycle in range(int(run["durationMs"] / period)):
        part = [r for r in rows if cycle * period <= r["time"] - start < (cycle + 1) * period]
        if len(part) < 10:
            continue
        cycles[cycle] = round((max(r["h"] for r in part) - min(r["h"] for r in part)) / (2 * run["amplitude"]), 2)
    return {
        "name": run["name"],
        "verzoegerung_ms_ohne_erste_sekunde": best[1],
        "rest_rms": round(math.sqrt(best[0] / len(settled)), 2),
        "gain_je_zyklus_aus_spannweite": cycles,
    }


def saccades(entry, models):
    rows = [r for r in series(entry["samples"], models) if r["h"] is not None]
    result = []
    for jump in entry["jumps"]:
        key = jump["axis"]
        at = jump["at"]
        before = [r[key] for r in rows if at - 300 <= r["time"] < at]
        after = [r[key] for r in rows if at + 600 <= r["time"] < at + 1100]
        if len(before) < 3 or len(after) < 3:
            continue
        start = st.median(before)
        end = st.median(after)
        size = end - start
        if abs(size) < 2:
            continue
        window = [r for r in rows if at <= r["time"] <= at + 900]
        progress = [(r["time"] - at, (r[key] - start) / size) for r in window]
        t10 = next((t for t, p in progress if p >= 0.1), None)
        t50 = next((t for t, p in progress if p >= 0.5), None)
        t90 = next((t for t, p in progress if p >= 0.9), None)
        result.append({"achse": key, "t10": t10, "t50": t50, "t90": t90})
    summary = {}
    for axis in ("h", "v"):
        rows_axis = [r for r in result if r["achse"] == axis and r["t10"] and r["t90"]]
        if rows_axis:
            summary[axis] = {
                "anzahl": len(rows_axis),
                "beginn_t10_ms": round(st.median(r["t10"] for r in rows_axis)),
                "mitte_t50_ms": round(st.median(r["t50"] for r in rows_axis)),
                "anstieg_t10_t90_ms": round(st.median(r["t90"] - r["t10"] for r in rows_axis)),
            }
    return summary


def median_filter(values, size):
    half = size // 2
    return [st.median(values[max(0, i - half):i + half + 1]) for i in range(len(values))]


def saccade_rise(rows, jumps, filtered):
    times = [r["time"] for r in rows]
    rises = []
    for jump in jumps:
        if jump["axis"] != "h":
            continue
        at = jump["at"]
        before = [x for t, x in zip(times, filtered) if at - 300 <= t < at]
        after = [x for t, x in zip(times, filtered) if at + 600 <= t < at + 1100]
        if len(before) < 3 or len(after) < 3:
            continue
        start = st.median(before)
        size = st.median(after) - start
        if abs(size) < 2:
            continue
        progress = [(t - at, (x - start) / size) for t, x in zip(times, filtered) if at <= t <= at + 900]
        t10 = next((t for t, p in progress if p >= 0.1), None)
        t90 = next((t for t, p in progress if p >= 0.9), None)
        if t10 and t90:
            rises.append(t90 - t10)
    return round(st.median(rises)) if rises else None


def filter_comparison(run, models):
    """Zentrierter Medianfilter, wie er offline möglich ist; live käme eine Verzögerung hinzu."""
    rest = [r for r in series(run["fixation"]["samples"], models) if r["h"] is not None]
    jumps = [r for r in series(run["saccades"]["samples"], models) if r["h"] is not None]
    if len(rest) < 10 or len(jumps) < 10:
        return {}
    result = {}
    for size in (1, 3, 5, 7):
        result[f"median_{size}"] = {
            "ruhe_sd_h": round(st.stdev(median_filter([r["h"] for r in rest], size)), 2),
            "bild_zu_bild_h": rounded(frame_step_noise(median_filter([r["h"] for r in rest], size)), 3),
            "sakkade_anstieg_ms": saccade_rise(jumps, run["saccades"]["jumps"], median_filter([r["h"] for r in jumps], size)),
        }
    return result


def iris_gain(models):
    # Geometrisch erwartet: 0,209 mm je Grad ÷ 11,7 mm = 0,0179 Irisdurchmesser je Grad.
    expected = 0.0179
    result = {}
    for side, model in models.items():
        if model:
            result[side] = {
                "h_anteil_erwartet": round((1 / model["h"][1]) / expected, 2),
                "v_anteil_erwartet": round((1 / model["v"][2]) / expected, 2),
            }
    return result


def main(path):
    data = json.load(open(path))
    meta = data["meta"]
    calibration = data["calibration"]
    run = data["run"]
    models = {side: calibration[side].get("model") for side in ("rechts", "links")}
    marks = len(meta.get("headEvents", [])) if "headEvents" in meta else meta.get("headMarks")
    print("Einstellung:", meta["smoothing"], "|", meta["clock"], "| Kopfmarken", marks)
    print("Bildtakt Ruhe:", timing(run["fixation"]["samples"]))
    print("Iris-Abbildung gegen ideale Geometrie (Näherung):", iris_gain(models))
    print("Ruhe:", json.dumps(fixation(series(run["fixation"]["samples"], models)), ensure_ascii=False))
    for entry in run["pursuit"]:
        print("Blickfolge:", json.dumps(pursuit(entry, models), ensure_ascii=False))
    print("Sakkadenverlauf:", json.dumps(saccades(run["saccades"], models), ensure_ascii=False))
    print("Medianfilter:", json.dumps(filter_comparison(run, models), ensure_ascii=False))


if __name__ == "__main__":
    main(sys.argv[1])
