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
- **Route Segments** — trail runs and hikes clustered by start location
  (~200 m); segments named after OpenStreetMap places at their endpoints.
  Road runs are excluded from segment mining.
  Each repeated route shows the best time for every kilometre of the route,
  so each segment compares the same stretch of road/trail across efforts.
  Tap a segment to open the run that set it.
- **Strength** — sessions grouped by workout routine, latest vs previous vs
  routine average, with calorie trend sparklines.
- **AI analysis** — every activity's detail view carries a short "Coach's Read":
  a Claude-generated note evaluating that session and comparing it to recent
  activities of the same type. Generated once per activity when it syncs.

## Architecture

Single-file React app (`index.html`, CDN React + Babel, no build step) that
reads a generated `data.js`. Data is produced by `update.py` from raw COROS
exports under `raw/`.

```
coros-dashboard/
  index.html        # the app (self-contained)
  data.js           # generated — do not edit
  update.py         # raw/ -> data.js (idempotent, dedupes by labelId; folds in AI notes)
  analyze.py        # generates the AI "Coach's Read" per activity (cached)
  fetch_laps.py     # direct COROS MCP HTTP fetcher (context-free)
  raw/
    records/*.txt   # querySportRecords text dumps (any date ranges)
    laps/*.json     # per-run queryActivityLapData JSON, named <labelId>.json
    analysis/*.json # cached AI analysis, one per <labelId> (generated, do not edit)
```

## How it updates

**Fast path — `sync_poll.py` (launchd, every 5 minutes).** A deterministic
poller (`com.lipingzhang.coros-sync`, logs to `~/Library/Logs/coros-sync.log`)
asks the COROS MCP endpoint for the last 7 days of sport records — one cheap
HTTP call — and exits quietly if every labelId is already in `data.js`. When a
new activity appears it:

1. Archives the records text → `raw/records/poll_<timestamp>.txt`
2. Fetches lap data for new runs (`fetch_laps.py`)
3. Downloads FIT files for new outdoor runs (GPS) and re-mines
   `segments.py` geo segments
4. Generates an AI "Coach's Read" for each new activity (`analyze.py`) and
   folds it into `data.js`
5. Regenerates `data.js` and commits + pushes so GitHub Pages redeploys

It refreshes the shared OAuth token itself (same file Hermes uses), so no
LLM is in the loop. Net latency: watch sync → dashboard ≈ poll interval +
Pages build (~1 min) + browser cache (≤10 min).

**Backstop — Hermes cron** (`coros-dashboard-sync`, daily 21:00 GMT+8): the
original agent-driven sync with a 14-day window; catches anything the fast
path missed during downtime.

`update.py` is idempotent — it dedupes activities by `labelId`, so overlapping
record files and repeated runs are safe.

## Manual regeneration

```
python3 fetch_laps.py   # optional: backfill any missing lap files
python3 analyze.py      # optional: AI notes for new/uncached activities (cap 12)
python3 update.py       # folds any cached AI notes into data.js
```

## AI analysis (Coach's Read)

Each activity's detail modal shows a few Claude-generated bullet points: an
overall verdict on the session and an explicit comparison (pace / HR / effort /
volume) against the athlete's recent activities of the same type.

- **Backend:** `analyze.py` shells out to the local `claude` CLI in headless
  print mode (`claude -p`), which reuses this machine's existing Claude Code
  auth — **no `ANTHROPIC_API_KEY` is needed**, and the launchd sync inherits it.
  Model defaults to `claude-haiku-4-5` (override with `COROS_ANALYSIS_MODEL`).
- **Cached & idempotent:** one note-set per activity under
  `raw/analysis/<labelId>.json`, keyed by a fingerprint of the activity's
  metrics + prompt version. An activity is re-analysed only when its data
  materially changes (e.g. lap data lands after the first sync) or the prompt
  is revised (`PROMPT_VERSION`). `update.py` reads the cache and never calls a
  model, so it stays deterministic everywhere.
- **Best-effort:** if the model is unreachable (offline, rate limited) the
  activity is left un-analysed and retried next sync — a sync is never blocked.
- **First-time backfill** of the whole history:
  `python3 analyze.py --all && python3 update.py` (hundreds of calls; runs for a
  while). Steady state only analyses the 1–2 activities per sync, which is fast.
  Skip generation entirely with `COROS_SKIP_ANALYSIS=1`.
- **Prompt is per-type** (running vs strength vs other) with a per-type
  `PROMPT_VERSION`. After changing a type's prompt, bump its version and run
  `python3 analyze.py --refresh --all && python3 update.py` to re-do only the
  already-cached notes for the affected type(s) — no new coverage, no wasted calls.

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
