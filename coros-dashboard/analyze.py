#!/usr/bin/env python3
"""AI performance analysis for COROS activities (best-effort, cached).

For every activity on the dashboard that lacks a *current* analysis, this asks a
Claude model for a short coach-style read: how the athlete performed in THIS
session and how it compares to their recent activities of the same type
(runs vs runs, that strength routine vs itself, hikes vs hikes, ...).

Generation backend: the local `claude` CLI in headless print mode, which reuses
the machine's existing Claude Code auth (~/.claude/.credentials.json) — so no
ANTHROPIC_API_KEY is required and nothing new has to be provisioned for the
launchd sync. If a model call fails (offline, not authenticated, rate limited)
the activity is simply left un-analysed and retried on a later sync; the sync
itself is never blocked.

Results are cached one-JSON-per-activity under raw/analysis/<labelId>.json,
keyed by a fingerprint of the activity's metrics and the prompt version, so an
activity is re-analysed only when its data materially changes (e.g. lap data
arrives after the first sync) or the prompt is revised. update.py folds the
cached text into data.js (pure, network-free) — this module is the only place
that reaches out to a model.

Usage:
  python3 analyze.py                # analyse stale/uncached activities (cap 12, newest first)
  python3 analyze.py --limit N      # cap at N this run
  python3 analyze.py --all          # no cap — use for the first-time backfill
  python3 analyze.py --refresh      # only re-do already-cached notes gone stale (e.g. after a
                                    #   prompt change); does not expand coverage
  python3 analyze.py --dry-run      # list what would be generated, call no model

Env:
  COROS_ANALYSIS_MODEL   model alias/id for `claude --model` (default claude-haiku-4-5)
  COROS_SKIP_ANALYSIS=1  make this a no-op (for CI / quick regens)
"""
import os
import re
import sys
import json
import time
import shutil
import hashlib
import tempfile
import subprocess
from datetime import datetime, timezone, timedelta

BASE = os.path.dirname(os.path.abspath(__file__))
DATA_JS = os.path.join(BASE, "data.js")
CACHE_DIR = os.path.join(BASE, "raw", "analysis")

TZ = timezone(timedelta(hours=8))            # athlete is GMT+8
MODEL = os.environ.get("COROS_ANALYSIS_MODEL", "claude-haiku-4-5")
# Per-type prompt version — bump a type's entry to invalidate only that type's
# cached analyses. (strength/other bumped to "2": the v1 instruction line said
# "pace"/"split", which is running-specific and reads wrong for those types.)
PROMPT_VERSION = {"run": "1", "strength": "2", "other": "2"}
PEER_COUNT = 5                               # recent same-type sessions shown for comparison
DEFAULT_LIMIT = 12                           # max activities analysed per invocation
CALL_TIMEOUT_S = 150

DRY = "--dry-run" in sys.argv


def log(msg):
    print(f"{datetime.now().strftime('%Y-%m-%d %H:%M:%S')} analyze: {msg}", flush=True)


# --------------------------------------------------------------------------- #
# tiny formatters (kept local so this module is standalone)
# --------------------------------------------------------------------------- #
def fmt_pace(sec):
    if sec is None:
        return None
    sec = int(round(sec))
    return f"{sec // 60}:{sec % 60:02d}"


def short_date(iso):
    return iso or "?"


# --------------------------------------------------------------------------- #
# data.js access
# --------------------------------------------------------------------------- #
def load_data():
    txt = open(DATA_JS, encoding="utf-8").read()
    return json.loads(txt[len("const DATA = "):].rstrip(";\n"))


def all_activities(data):
    """Every analysable activity, tagged with its _type and a comparison group."""
    acts = []
    for r in data.get("runs", []):
        acts.append({**r, "_type": "run", "_group": r.get("category") or "run"})
    for s in data.get("strength", []):
        acts.append({**s, "_type": "strength", "_group": s.get("routine") or "Strength"})
    for o in data.get("others", []):
        acts.append({**o, "_type": "other", "_group": o.get("category") or o.get("sportName") or "other"})
    return acts


# --------------------------------------------------------------------------- #
# fingerprinting / cache freshness
# --------------------------------------------------------------------------- #
_FP_KEYS = ("sportType", "distKm", "durationSec", "paceSec", "hr", "cal",
            "best1k", "elevGain", "sets", "speedKmh")


def prompt_version(act):
    return PROMPT_VERSION.get(act["_type"], "1")


def fingerprint(act):
    payload = {k: act.get(k) for k in _FP_KEYS}
    payload["splitsN"] = len(act.get("splits") or [])
    payload["pv"] = prompt_version(act)
    blob = json.dumps(payload, sort_keys=True, ensure_ascii=False)
    return hashlib.sha1(blob.encode("utf-8")).hexdigest()[:16]


def cache_path(label_id):
    return os.path.join(CACHE_DIR, f"{label_id}.json")


def cached(label_id):
    try:
        with open(cache_path(label_id), encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return None


def is_current(act):
    c = cached(act["labelId"])
    return bool(c) and c.get("fingerprint") == fingerprint(act) and bool(c.get("bullets"))


# --------------------------------------------------------------------------- #
# prompt construction
# --------------------------------------------------------------------------- #
def metric_line(act):
    """One compact line summarising an activity, used for the peer list."""
    t = act["_type"]
    d = short_date(act.get("date"))
    if t == "strength":
        bits = [f'{act.get("sets")} sets' if act.get("sets") is not None else None,
                act.get("duration"),
                f'{act.get("hr")} bpm' if act.get("hr") else None,
                f'{act.get("cal")} kcal' if act.get("cal") else None]
        return f'{d}: ' + ", ".join(b for b in bits if b)
    # run / trail / hike / row / cardio
    bits = [f'{act.get("distKm")} km' if act.get("distKm") is not None else None,
            act.get("duration"),
            f'{act.get("pace")}/km' if act.get("pace") else (
                f'{act.get("speedKmh")} km/h' if act.get("speedKmh") is not None else None),
            f'best 1K {act.get("best1kPace")}' if act.get("best1kPace") else None,
            f'{act.get("hr")} bpm' if act.get("hr") else None,
            f'+{round(act.get("elevGain"))} m' if act.get("elevGain") else None]
    return f'{d}: ' + ", ".join(b for b in bits if b)


def _avg(xs):
    xs = [x for x in xs if x is not None]
    return sum(xs) / len(xs) if xs else None


def peers_summary(peers):
    """A short averages line across the peer set, for explicit comparison."""
    if not peers:
        return None
    pace = _avg([p.get("paceSec") for p in peers])
    hr = _avg([p.get("hr") for p in peers])
    dist = _avg([p.get("distKm") for p in peers])
    sets = _avg([p.get("sets") for p in peers])
    cal = _avg([p.get("cal") for p in peers])
    parts = []
    if pace is not None:
        parts.append(f"pace {fmt_pace(pace)}/km")
    if dist is not None:
        parts.append(f"{dist:.1f} km")
    if sets is not None:
        parts.append(f"{sets:.0f} sets")
    if hr is not None:
        parts.append(f"HR {hr:.0f} bpm")
    if cal is not None:
        parts.append(f"{cal:.0f} kcal")
    return ", ".join(parts) if parts else None


def this_block(act):
    """A fuller description of the activity being analysed (incl. splits)."""
    t = act["_type"]
    head = act.get("sportName") or ("Strength" if t == "strength" else "Activity")
    if t == "strength" and act.get("routine"):
        head = f'Strength — "{act["routine"]}"'
    lines = [f'{head}: {metric_line(act).split(": ", 1)[1]}']
    splits = act.get("splits") or []
    if splits:
        seq = ", ".join(
            f'km{s["km"]} {s["pace"]}' + (f'({s["hr"]}bpm)' if s.get("hr") else "")
            for s in splits)
        lines.append(f'Kilometre splits: {seq}')
    return "\n".join(lines)


TYPE_WORD = {"run": "run", "strength": "strength session", "other": "session"}

# Per-type coaching voice and the metrics that are actually meaningful to compare
# for that discipline. Strength has no "pace" or "splits", so that vocabulary must
# not leak into its note (which is what the generic v1 instruction line did).
COACH = {"run": "running coach", "strength": "strength & conditioning coach"}
COMPARE = {
    "run": "pace, heart rate, and overall effort",
    "strength": "total sets / training volume, session duration, average heart rate, and calories",
    "other": "distance, duration, speed, and heart rate",
}
CALLOUT = {
    "run": "the standout or weakest kilometre split",
    "strength": "any notable change in volume, duration, or effort versus the recent sessions",
    "other": "the standout or weakest stretch of the session",
}


def build_prompt(act, peers):
    t = act["_type"]
    type_word = TYPE_WORD.get(t, "session")
    if t == "run" and act.get("category") == "trail":
        type_word = "trail run"
    if t == "other":
        type_word = (act.get("sportName") or "session").lower()

    coach = COACH.get(t, "endurance coach")
    compare_dims = COMPARE.get(t, COMPARE["other"])
    callout = CALLOUT.get(t, CALLOUT["other"])

    if peers:
        peer_lines = "\n".join(f"  - {metric_line(p)}" for p in peers)
        summ = peers_summary(peers)
        peers_txt = (f'Recent {type_word}s (most recent first):\n{peer_lines}'
                     + (f'\nRecent average — {summ}.' if summ else ''))
    else:
        peers_txt = (f'No earlier {type_word}s are on record — this is the '
                     f'first one to compare against.')

    return f"""You are an experienced {coach} writing a terse, data-grounded note for an athlete's personal training log. Reference the actual numbers. No greeting, no medical advice, no generic filler.

THIS {type_word.upper()} ({short_date(act.get("date"))}):
{this_block(act)}

{peers_txt}

Write 3 to 4 short bullet points (max ~22 words each) that together:
- give an overall verdict on how this {type_word} went;
- compare {compare_dims} to the recent {type_word}s above, saying better or worse and by roughly how much;
- call out {callout};
- note one concrete thing to build on or watch next time.
Output ONLY the bullets, one per line, each starting with "- ". No heading, no closing line."""


# --------------------------------------------------------------------------- #
# model call (headless Claude Code CLI — reuses existing auth, no API key)
# --------------------------------------------------------------------------- #
def _claude_bin():
    return (shutil.which("claude")
            or next((p for p in (os.path.expanduser("~/.local/bin/claude"),
                                 "/usr/local/bin/claude", "/opt/homebrew/bin/claude")
                     if os.path.exists(p)), None))


def call_model(prompt):
    """Return the model's text, or None on any failure (best-effort)."""
    claude = _claude_bin()
    if not claude:
        log("`claude` CLI not found on PATH — skipping (no analysis backend)")
        return None
    # Curated, least-privilege env: only what the CLI needs to find its
    # credentials (~/.claude) and run — never the parent's secrets (API keys,
    # SSH agent socket, tokens). The model subprocess has no business seeing them.
    home = os.environ.get("HOME") or os.path.expanduser("~")
    env = {
        "HOME": home,
        "PATH": os.pathsep.join([
            os.path.join(home, ".local/bin"),
            "/usr/local/bin", "/opt/homebrew/bin", "/usr/bin", "/bin",
        ]),
        "USER": os.environ.get("USER", ""),
        "LOGNAME": os.environ.get("LOGNAME", ""),
        "LANG": os.environ.get("LANG", "en_US.UTF-8"),
        "TMPDIR": os.environ.get("TMPDIR", "/tmp"),
    }
    try:
        r = subprocess.run(
            [claude, "-p", prompt,
             "--model", MODEL,
             "--output-format", "text",
             "--strict-mcp-config",           # ignore all MCP servers (don't touch coros MCP)
             "--disallowedTools", "Bash,Read,Write,Edit,WebFetch,WebSearch,Task,Glob,Grep"],
            stdin=subprocess.DEVNULL, capture_output=True, text=True,
            timeout=CALL_TIMEOUT_S, cwd=tempfile.gettempdir(), env=env)
    except subprocess.TimeoutExpired:
        log("model call timed out")
        return None
    except OSError as e:
        log(f"model call could not start: {e}")
        return None
    if r.returncode != 0:
        log(f"model call failed rc={r.returncode}: {(r.stderr or '').strip()[:200]}")
        return None
    return (r.stdout or "").strip() or None


_BULLET_RE = re.compile(r"^\s*(?:[-*•·]|\d+[.)])\s+")


def parse_bullets(text):
    out = []
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        line = _BULLET_RE.sub("", line).strip().strip("•*-").strip()
        # drop an accidental leading label like "Verdict:" markdown bold, keep content
        line = re.sub(r"^\*\*(.+?)\*\*[:：]?\s*", r"\1: ", line).strip()
        if line:
            out.append(line)
    return out[:5]


# --------------------------------------------------------------------------- #
# per-activity generation
# --------------------------------------------------------------------------- #
def analyze_one(act, peers):
    prompt = build_prompt(act, peers)
    if DRY:
        log(f"would analyse {act['_type']} {act['labelId'][-6:]} "
            f"({act.get('date')}, {len(peers)} peers)")
        return False
    text = call_model(prompt)
    if not text:
        return False
    bullets = parse_bullets(text)
    if not bullets:
        log(f"empty analysis for {act['labelId'][-6:]}; skipping")
        return False
    os.makedirs(CACHE_DIR, exist_ok=True)
    rec = {
        "labelId": act["labelId"],
        "type": act["_type"],
        "date": act.get("date"),
        "fingerprint": fingerprint(act),
        "promptVersion": prompt_version(act),
        "model": MODEL,
        "generated": datetime.now(TZ).isoformat(timespec="seconds"),
        "peerCount": len(peers),
        "bullets": bullets,
        "raw": text,
    }
    tmp = cache_path(act["labelId"]) + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(rec, f, ensure_ascii=False, indent=1)
    os.replace(tmp, cache_path(act["labelId"]))
    log(f"analysed {act['_type']} {act['labelId'][-6:]} ({act.get('date')}) "
        f"-> {len(bullets)} notes")
    return True


def peers_for(act, by_group):
    """Recent same-type sessions that happened before this one."""
    peers = [p for p in by_group[(act["_type"], act["_group"])]
             if p["labelId"] != act["labelId"] and (p.get("ts") or 0) < (act.get("ts") or 0)]
    # labelId as a stable tiebreaker so same-second timestamps don't make peer
    # selection (and therefore the analysis) depend on data.js ordering.
    peers.sort(key=lambda p: ((p.get("ts") or 0), p.get("labelId") or ""), reverse=True)
    return peers[:PEER_COUNT]


def main():
    if os.environ.get("COROS_SKIP_ANALYSIS") == "1":
        log("COROS_SKIP_ANALYSIS=1 — nothing to do")
        return 0
    if not os.path.exists(DATA_JS):
        log("data.js not found — run update.py first")
        return 0

    limit = None if "--all" in sys.argv else DEFAULT_LIMIT
    if "--limit" in sys.argv:
        try:
            limit = int(sys.argv[sys.argv.index("--limit") + 1])
        except (IndexError, ValueError):
            pass

    data = load_data()
    acts = all_activities(data)

    by_group = {}
    for a in acts:
        by_group.setdefault((a["_type"], a["_group"]), []).append(a)

    stale = [a for a in acts if not is_current(a)]
    if "--refresh" in sys.argv:
        # only re-do activities that already have a (now-stale) cached note —
        # e.g. after a prompt change — without spending calls on new coverage.
        stale = [a for a in stale if os.path.exists(cache_path(a["labelId"]))]
    stale.sort(key=lambda a: a.get("ts") or 0, reverse=True)   # newest first
    total_stale = len(stale)
    if limit is not None:
        stale = stale[:limit]

    if not stale:
        log(f"all {len(acts)} activities have current analyses")
        return 0

    log(f"{total_stale} activities need analysis; doing {len(stale)} this run "
        f"(model={MODEL}{', DRY-RUN' if DRY else ''})")

    generated = 0
    for i, a in enumerate(stale, 1):
        try:
            if analyze_one(a, peers_for(a, by_group)):
                generated += 1
        except Exception as e:                     # never let one activity break the batch
            log(f"error on {a.get('labelId','?')[-6:]}: {e}")
        if not DRY and i < len(stale):
            time.sleep(0.4)

    remaining = total_stale - generated
    log(f"done: generated {generated}, {remaining} still pending")
    # machine-readable summary for callers (sync_poll.py)
    print(f"GENERATED={generated} PENDING={remaining}")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as e:
        log(f"ERROR: {e}")
        # best-effort: analysis must never fail a sync
        print("GENERATED=0 PENDING=?")
        sys.exit(0)
