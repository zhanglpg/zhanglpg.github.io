# COROS Training Dashboard

A personal, Strava-style training dashboard for Liping Zhang, built from COROS
data. Shows personal-best run performances, route-based segment bests, run
pace/volume trends, and strength-session comparisons grouped by workout
routine. Every activity is clickable for a full detail view.

Live at: `https://zhanglpg.github.io/coros-dashboard/`

## Features

- **Overview** — totals, run pace trend, monthly running volume, recent
  activity feed (tap any activity for details).
- **Personal Bests** — fastest rolling 1K/3K/5K/10K splits from flat runs
  (road + track; trail excluded). Tap a PB or any run row for the full
  kilometre-split breakdown.
- **Route Segments** — outdoor runs clustered by start location (~200 m).
  Each repeated route shows the best time for every kilometre of the route,
  so each segment compares the same stretch of road/trail across efforts.
  Tap a segment to open the run that set it.
- **Strength** — sessions grouped by workout routine, latest vs previous vs
  routine average, with calorie trend sparklines.

## Architecture

Single-file React app (`index.html`, CDN React + Babel, no build step) that
reads a generated `data.js`. Data is produced by `update.py` from raw COROS
exports under `raw/`.

```
coros-dashboard/
  index.html        # the app (self-contained)
  data.js           # generated — do not edit
  update.py         # raw/ -> data.js (idempotent, dedupes by labelId)
  fetch_laps.py     # direct COROS MCP HTTP fetcher (context-free)
  raw/
    records/*.txt   # querySportRecords text dumps (any date ranges)
    laps/*.json     # per-run queryActivityLapData JSON, named <labelId>.json
```

## How it updates

A Hermes cron job (`coros-dashboard-sync`, daily 21:00 GMT+8) watches for new
COROS activities. When new ones appear it:

1. Fetches the last 14 days of sport records → `raw/records/sync_latest.txt`
2. Fetches lap data for any run missing `raw/laps/<labelId>.json`
3. Runs `python3 update.py` to regenerate `data.js`
4. Commits and pushes so GitHub Pages redeploys

`update.py` is idempotent — it dedupes activities by `labelId`, so overlapping
record files and repeated runs are safe.

## Manual regeneration

```
python3 fetch_laps.py   # optional: backfill any missing lap files
python3 update.py
```

## Notes on the analytics

- **Personal bests** use the fastest *rolling* split sum across full 1K laps,
  from flat runs only. Trail runs are excluded because elevation skews pace.
- **Route segments** cluster outdoor runs (road + trail) by start coordinate
  (200 m radius). Segment *k* is the best time for the k-th kilometre from the
  shared start, so segments are aligned and comparable across efforts on the
  same route.
- **Strength** sessions are grouped by workout name (the COROS "location"
  field, e.g. 恢复期进阶练习 / 健身房力量) and the latest session is compared
  against the previous one and the routine average.
