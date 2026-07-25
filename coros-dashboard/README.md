# COROS Training Dashboard

A personal, Strava-style training dashboard for Liping Zhang, built from COROS
data. Shows personal-best run performances, 1K segment bests, run pace/volume
trends, and strength-session comparisons grouped by workout routine.

Live at: `https://zhanglpg.github.io/coros-dashboard/`

## Architecture

Single-file React app (`index.html`, CDN React + Babel, no build step) that
reads a generated `data.js`. Data is produced by `update.py` from raw COROS
exports under `raw/`.

```
coros-dashboard/
  index.html        # the app (self-contained)
  data.js           # generated — do not edit
  update.py         # raw/ -> data.js (idempotent, dedupes by labelId)
  raw/
    records/*.txt   # querySportRecords text dumps (any date ranges)
    laps/*.json     # per-run queryActivityLapData JSON, named <labelId>.json
```

## How it updates

A Hermes cron job watches for new COROS activities. When new ones appear it:

1. Fetches the last 14 days of sport records → `raw/records/sync_latest.txt`
2. Fetches lap data for any run missing `raw/laps/<labelId>.json`
3. Runs `python3 update.py` to regenerate `data.js`
4. Commits and pushes so GitHub Pages redeploys

`update.py` is idempotent — it dedupes activities by `labelId`, so overlapping
record files and repeated runs are safe.

## Manual regeneration

```
python3 update.py
```

## Notes on the analytics

- **Personal bests** (1K/3K/5K/10K) use the fastest *rolling* split sum across
  full 1K laps, from flat runs only (outdoor/indoor/track). Trail runs are
  excluded because elevation skews pace.
- **Segment bests** are the fastest individual 1K laps across all flat runs.
- **Strength** sessions are grouped by workout name (the COROS "location"
  field, e.g. 恢复期进阶练习 / 健身房力量) and the latest session is compared
  against the previous one and the routine average.
