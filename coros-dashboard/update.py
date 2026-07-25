#!/usr/bin/env python3
"""COROS -> data.js generator for the personal training dashboard.

Reads raw COROS exports under raw/ (activity-record text files + per-run lap
JSON files), computes personal bests, 1K segment bests, run trends and
strength-session comparisons, and writes a single `data.js` that the
single-file dashboard (index.html) consumes.

Idempotent: dedupes activities by labelId, so overlapping record files and
re-runs are safe. Invoked by the activity-watcher cron job after it drops new
raw files into raw/.
"""
import os
import re
import json
import glob
from datetime import datetime, timezone, timedelta

BASE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(BASE, "raw")
RECORDS_DIR = os.path.join(RAW, "records")
LAPS_DIR = os.path.join(RAW, "laps")
OUT = os.path.join(BASE, "data.js")

TZ = timezone(timedelta(hours=8))  # athlete is GMT+8

SPORT_META = {
    100: ("Outdoor Run", "run"),
    101: ("Indoor Run", "run"),
    102: ("Trail Run", "trail"),
    103: ("Track Run", "run"),
    104: ("Hike", "hike"),
    400: ("Gym Cardio", "cardio"),
    402: ("Strength", "strength"),
    701: ("Indoor Row", "row"),
}
# Flat, PB-eligible run types (trail runs are elevation-heavy -> excluded from
# road/track personal bests and segment leaderboard).
FLAT_RUN_TYPES = {100, 101, 103}
ALL_RUN_TYPES = {100, 101, 102, 103}


# --------------------------------------------------------------------------- #
# Parsing helpers
# --------------------------------------------------------------------------- #
def parse_duration(s):
    if not s:
        return None
    parts = [int(p) for p in s.split(":")]
    if len(parts) == 3:
        return parts[0] * 3600 + parts[1] * 60 + parts[2]
    if len(parts) == 2:
        return parts[0] * 60 + parts[1]
    return parts[0]


def parse_pace(s):
    if not s:
        return None
    m, sec = s.split(":")
    return int(m) * 60 + int(sec)


def fmt_pace(sec):
    if sec is None:
        return None
    sec = int(round(sec))
    return f"{sec // 60}:{sec % 60:02d}"


def fmt_dur(sec):
    if sec is None:
        return None
    sec = int(sec)
    h, m, s = sec // 3600, (sec % 3600) // 60, sec % 60
    return f"{h}:{m:02d}:{s:02d}" if h else f"{m}:{s:02d}"


def parse_records_file(path):
    """Parse one raw querySportRecords text dump into activity dicts."""
    with open(path, encoding="utf-8") as f:
        text = f.read()
    blocks = re.split(r"\n(?=\d+\.\s)", text)
    acts = []
    for b in blocks:
        m = re.search(r"^\d+\.\s+(.+?)\s+—\s+(\d{4}-\d{2}-\d{2})", b)
        if not m:
            continue

        def grab(pat, cast=str, default=None):  # cast: any callable, e.g. int/float
            mm = re.search(pat, b)
            if not mm:
                return default
            try:
                return cast(mm.group(1))
            except (ValueError, TypeError):
                return default

        label_id = grab(r"LabelId:\s*(\d+)")
        if not label_id:
            continue
        acts.append({
            "labelId": label_id,
            "sportType": grab(r"SportType:\s*(\d+)", int, 0),
            "sportName": m.group(1).strip(),
            "date": m.group(2),
            "startTs": grab(r"startTimestamp=(\d+)", int),
            "endTs": grab(r"endTimestamp=(\d+)", int),
            "durationSec": parse_duration(grab(r"Duration:\s*([\d:]+)")),
            "distKm": grab(r"Distance:\s*([\d.]+)\s*km", float),
            "sets": grab(r"Sets:\s*(\d+)", int),
            "hr": grab(r"Avg HR:\s*(\d+)", int),
            "cal": grab(r"Calories:\s*(\d+)", int),
            "paceSec": parse_pace(grab(r"Average Pace:\s*([\d:]+)\s*/km")),
            "speedKmh": grab(r"Average Speed:\s*([\d.]+)\s*km/h", float),
            "location": (grab(r"Location:\s*(.+)") or "").strip(),
        })
    return acts


def parse_laps_file(path):
    """Parse one per-run lap JSON into 1K splits + summary elevation."""
    label_id = os.path.basename(path).replace(".json", "")
    try:
        with open(path, encoding="utf-8") as f:
            d = json.load(f)
    except Exception:
        return None
    groups = d.get("lapGroups", [])
    onek = next((g for g in groups if g.get("lapDistance") == 100000), None)
    if onek is None:
        cands = [g for g in groups if g.get("lapDistance", 0) > 0 and g.get("type") != -1]
        onek = min(cands, key=lambda g: g["lapDistance"]) if cands else None
    laps = []
    if onek:
        for lap in onek.get("laps", []):
            dist_cm = lap.get("distance", 0)
            t = lap.get("time")
            if dist_cm and t:
                laps.append({
                    "distCm": dist_cm, "time": float(t), "idx": lap.get("lapIndex"),
                    "hr": lap.get("avgHr"), "elevGain": lap.get("elevGain", 0),
                })
    elev = None
    for g in groups:
        if g.get("type") == -1 and g.get("laps"):
            elev = g["laps"][0].get("elevGain")
    return {"labelId": label_id, "laps": laps, "elevGain": elev}


# --------------------------------------------------------------------------- #
# Analytics
# --------------------------------------------------------------------------- #
def compute_pbs_and_segments(runs_with_laps):
    targets = [("1K", 1), ("3K", 3), ("5K", 5), ("10K", 10)]
    best = {}
    segments = []
    for run, lapdata in runs_with_laps:
        full = [l for l in lapdata["laps"] if l["distCm"] >= 99000]  # full 1K splits
        times = [l["time"] for l in full]
        for l in full:
            segments.append({
                "seconds": round(l["time"], 1), "pace": fmt_pace(l["time"]),
                "date": run["date"], "labelId": run["labelId"],
                "lapIndex": l["idx"], "runName": run["location"],
                "elevGain": l.get("elevGain", 0), "hr": l.get("hr"),
            })
        for name, n in targets:
            if len(times) < n:
                continue
            for i in range(len(times) - n + 1):
                s = sum(times[i:i + n])
                if name not in best or s < best[name]["seconds"]:
                    best[name] = {
                        "dist": name, "seconds": round(s, 1), "pace": fmt_pace(s / n),
                        "date": run["date"], "labelId": run["labelId"],
                        "runName": run["location"],
                    }
    pbs = [best[k] for k in ("1K", "3K", "5K", "10K") if k in best]
    segments.sort(key=lambda x: x["seconds"])
    for i, s in enumerate(segments):
        s["rank"] = i + 1
    return pbs, segments[:10]


def build_strength_groups(strength):
    groups = {}
    for s in strength:
        groups.setdefault(s["routine"] or "Strength", []).append(s)
    out = []
    for routine, sessions in groups.items():
        sessions.sort(key=lambda x: x["ts"] or 0)
        if len(sessions) < 3:
            continue
        sets = [x["sets"] for x in sessions if x["sets"]]
        durs = [x["durationSec"] for x in sessions if x["durationSec"]]
        hrs = [x["hr"] for x in sessions if x["hr"]]
        cals = [x["cal"] for x in sessions if x["cal"]]
        latest = sessions[-1]
        prev = sessions[-2] if len(sessions) >= 2 else None

        def avg(xs):
            return round(sum(xs) / len(xs), 1) if xs else None

        out.append({
            "routine": routine,
            "count": len(sessions),
            "firstDate": sessions[0]["date"],
            "latestDate": latest["date"],
            "latest": {
                "sets": latest["sets"], "durationSec": latest["durationSec"],
                "duration": fmt_dur(latest["durationSec"]),
                "hr": latest["hr"], "cal": latest["cal"], "labelId": latest["labelId"],
            },
            "prev": ({
                "sets": prev["sets"], "durationSec": prev["durationSec"],
                "hr": prev["hr"], "cal": prev["cal"], "date": prev["date"],
            } if prev else None),
            "avg": {"sets": avg(sets), "durationSec": avg(durs), "hr": avg(hrs), "cal": avg(cals)},
            "trend": [{
                "date": x["date"], "sets": x["sets"], "cal": x["cal"],
                "hr": x["hr"], "durationSec": x["durationSec"],
            } for x in sessions],
        })
    out.sort(key=lambda g: -g["count"])
    return out


# --------------------------------------------------------------------------- #
# Main
# --------------------------------------------------------------------------- #
def main():
    activities = {}
    for path in sorted(glob.glob(os.path.join(RECORDS_DIR, "*.txt"))):
        for a in parse_records_file(path):
            activities[a["labelId"]] = a  # dedup by labelId

    laps = {}
    for path in sorted(glob.glob(os.path.join(LAPS_DIR, "*.json"))):
        ld = parse_laps_file(path)
        if ld:
            laps[ld["labelId"]] = ld

    acts = sorted(activities.values(), key=lambda a: a["startTs"] or 0, reverse=True)

    # Runs ------------------------------------------------------------------ #
    runs = []
    for a in acts:
        if a["sportType"] not in ALL_RUN_TYPES:
            continue
        lap = laps.get(a["labelId"])
        best1k = None
        elev = None
        if lap:
            full = [l["time"] for l in lap["laps"] if l["distCm"] >= 99000]
            best1k = round(min(full), 1) if full else None
            elev = lap["elevGain"]
        runs.append({
            "labelId": a["labelId"], "sportType": a["sportType"],
            "sportName": a["sportName"], "category": SPORT_META.get(a["sportType"], ("Other", "other"))[1],
            "date": a["date"], "ts": a["startTs"], "distKm": a["distKm"],
            "durationSec": a["durationSec"], "duration": fmt_dur(a["durationSec"]),
            "paceSec": a["paceSec"], "pace": fmt_pace(a["paceSec"]),
            "hr": a["hr"], "cal": a["cal"], "elevGain": elev,
            "location": a["location"], "best1k": best1k, "best1kPace": fmt_pace(best1k),
        })

    # PBs & segments from flat runs that have lap data ---------------------- #
    flat_with_laps = [(r, laps[r["labelId"]]) for r in runs
                      if r["sportType"] in FLAT_RUN_TYPES and r["labelId"] in laps]
    pbs, segments = compute_pbs_and_segments(flat_with_laps)

    # Run trend (chronological) + monthly volume ---------------------------- #
    chrono = sorted(runs, key=lambda r: r["ts"] or 0)
    run_trend = [{"date": r["date"], "paceSec": r["paceSec"], "distKm": r["distKm"],
                  "category": r["category"]} for r in chrono if r["paceSec"]]
    monthly = {}
    for r in chrono:
        if not r["distKm"]:
            continue
        key = r["date"][:7]
        monthly.setdefault(key, {"month": key, "km": 0.0, "runs": 0})
        monthly[key]["km"] += r["distKm"]
        monthly[key]["runs"] += 1
    for v in monthly.values():
        v["km"] = round(v["km"], 1)
    monthly_volume = sorted(monthly.values(), key=lambda m: m["month"])

    # Strength -------------------------------------------------------------- #
    strength = [{
        "labelId": a["labelId"], "date": a["date"], "ts": a["startTs"],
        "routine": a["location"] or "Strength", "sets": a["sets"],
        "durationSec": a["durationSec"], "duration": fmt_dur(a["durationSec"]),
        "hr": a["hr"], "cal": a["cal"],
    } for a in acts if a["sportType"] == 402]
    strength_groups = build_strength_groups(strength)

    # Other activities (hike / row / cardio) for the feed -------------------- #
    others = [{
        "labelId": a["labelId"], "sportType": a["sportType"], "sportName": a["sportName"],
        "category": SPORT_META.get(a["sportType"], ("Other", "other"))[1],
        "date": a["date"], "ts": a["startTs"], "distKm": a["distKm"],
        "durationSec": a["durationSec"], "duration": fmt_dur(a["durationSec"]),
        "speedKmh": a["speedKmh"], "hr": a["hr"], "cal": a["cal"], "location": a["location"],
    } for a in acts if a["sportType"] not in ALL_RUN_TYPES and a["sportType"] != 402]

    totals = {
        "activities": len(acts),
        "runs": len(runs),
        "runKm": round(sum(r["distKm"] or 0 for r in runs), 1),
        "strength": len(strength),
        "hikes": sum(1 for a in acts if a["sportType"] == 104),
        "calories": sum(a["cal"] or 0 for a in acts),
        "firstDate": acts[-1]["date"] if acts else None,
        "latestDate": acts[0]["date"] if acts else None,
    }

    data = {
        "generated": datetime.now(TZ).isoformat(timespec="seconds"),
        "athlete": {"name": "Liping Zhang", "location": "Hangzhou, China"},
        "assessment": {
            "vo2max": 40, "level": 68, "thresholdPace": "5:37",
            "pred5k": "27:08", "pred10k": "57:14",
            "predHalf": "2:10:23", "predMarathon": "4:40:48",
        },
        "pbs": pbs,
        "segments": segments,
        "runs": runs,
        "runTrend": run_trend,
        "monthlyVolume": monthly_volume,
        "strength": strength,
        "strengthGroups": strength_groups,
        "others": others,
        "totals": totals,
    }

    with open(OUT, "w", encoding="utf-8") as f:
        f.write("const DATA = ")
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
        f.write(";\n")

    print(f"Wrote {OUT}")
    print(f"  activities={len(acts)} runs={len(runs)} "
          f"runs_with_laps={len(flat_with_laps)} strength={len(strength)}")
    print(f"  pbs={[ (p['dist'], p['pace']) for p in pbs ]}")


if __name__ == "__main__":
    main()
