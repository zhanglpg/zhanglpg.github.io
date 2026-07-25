#!/usr/bin/env python3
"""Deterministic COROS -> dashboard poller (no LLM in the loop).

Runs every few minutes from launchd. Cheaply asks the COROS MCP endpoint for
recent sport records; if every labelId is already on the dashboard (data.js),
exits quietly. When new activities appear it archives the records text,
fetches missing lap files (via fetch_laps.py), downloads FIT files for new
outdoor runs, re-mines geo segments if needed, regenerates data.js, and
commits + pushes so GitHub Pages redeploys.

Token handling: reads the same OAuth token Hermes uses
(~/.hermes/mcp-tokens/coros.json) and refreshes it itself via the stored
client_id + token_endpoint when it is near expiry or a call returns 401,
writing the file back atomically in the same format.

Usage: python3 sync_poll.py [--dry-run]
  --dry-run: poll + report what would happen; no writes, no commit.
"""
import os
import re
import sys
import json
import time
import fcntl
import subprocess
import urllib.parse
import urllib.request
from datetime import datetime, timedelta

BASE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(BASE)
RECORDS = os.path.join(BASE, "raw", "records")
LAPS = os.path.join(BASE, "raw", "laps")
FITS = os.path.join(BASE, "raw", "fits")
LOCK_FILE = os.path.join(BASE, "raw", ".sync.lock")
TOKEN_FILE = os.path.expanduser("~/.hermes/mcp-tokens/coros.json")
CLIENT_FILE = os.path.expanduser("~/.hermes/mcp-tokens/coros.client.json")
META_FILE = os.path.expanduser("~/.hermes/mcp-tokens/coros.meta.json")
URL = "https://mcp.coros.com/mcp"

RUN_TYPES = {100, 101, 102, 103}      # lap files fetched for these
OUTDOOR_TYPES = {100, 102}            # FIT files (GPS) fetched for these
WINDOW_DAYS = 7
REFRESH_MARGIN_S = 3 * 86400          # refresh token when < 3 days of life left

DRY = "--dry-run" in sys.argv


def log(msg):
    print(f"{datetime.now().strftime('%Y-%m-%d %H:%M:%S')} {msg}", flush=True)


# --------------------------------------------------------------------------- #
# OAuth token management (self-refreshing, Hermes-compatible file format)
# --------------------------------------------------------------------------- #
def _read_token_file():
    with open(TOKEN_FILE) as f:
        return json.load(f)


def _refresh_token(tok):
    client_id = json.load(open(CLIENT_FILE))["client_id"]
    token_endpoint = json.load(open(META_FILE))["token_endpoint"]
    form = urllib.parse.urlencode({
        "grant_type": "refresh_token",
        "refresh_token": tok["refresh_token"],
        "client_id": client_id,
    }).encode()
    req = urllib.request.Request(token_endpoint, data=form, headers={
        "Content-Type": "application/x-www-form-urlencoded"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        new = json.load(resp)
    # merge: keep old refresh_token if the server didn't rotate it
    tok = dict(tok)
    tok.update({k: v for (k, v) in new.items() if v is not None})
    tok["expires_at"] = time.time() + float(new.get("expires_in", 3600))
    tmp = TOKEN_FILE + ".tmp"
    with open(tmp, "w") as f:
        json.dump(tok, f)
    os.chmod(tmp, 0o600)
    os.replace(tmp, TOKEN_FILE)
    log("token refreshed")
    return tok


def get_token():
    tok = _read_token_file()
    if tok.get("expires_at", 0) - time.time() < REFRESH_MARGIN_S:
        tok = _refresh_token(tok)
    return tok


# --------------------------------------------------------------------------- #
# MCP call with one 401-retry-after-refresh
# --------------------------------------------------------------------------- #
def mcp_call(tok, name, arguments, req_id=1, _retried=False):
    payload = {"jsonrpc": "2.0", "id": req_id, "method": "tools/call",
               "params": {"name": name, "arguments": arguments}}
    req = urllib.request.Request(
        URL, data=json.dumps(payload).encode(),
        headers={"Authorization": f"Bearer {tok['access_token']}",
                 "Content-Type": "application/json",
                 "Accept": "application/json, text/event-stream"})
    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            body = resp.read().decode().strip()
    except urllib.error.HTTPError as e:
        if e.code == 401 and not _retried:
            tok.update(_refresh_token(tok))
            return mcp_call(tok, name, arguments, req_id, _retried=True)
        raise
    if body.startswith("data:"):
        body = body.split("data:", 1)[1].strip()
    obj = json.loads(body)
    if "error" in obj:
        raise RuntimeError(f"MCP error from {name}: {obj['error']}")
    for c in obj["result"]["content"]:
        if c.get("type") == "text":
            return _unwrap_text(c["text"])
    return json.dumps(obj["result"]["content"])


def _unwrap_text(text):
    """Some tools (querySportRecords) return their report JSON-string-encoded:
    a leading quote and literal \\n escapes. Unwrap one level so downstream
    parsers (update.py, fetch_laps.py) see real newlines. Lap results start
    with '{' and are untouched."""
    if text[:1] == '"':
        try:
            u = json.loads(text)
            if isinstance(u, str):
                return u
        except ValueError:
            pass
    return text


# --------------------------------------------------------------------------- #
# Poll logic
# --------------------------------------------------------------------------- #
def dashboard_label_ids():
    """All labelIds currently on the dashboard (canonical published state)."""
    txt = open(os.path.join(BASE, "data.js"), encoding="utf-8").read()
    data = json.loads(txt[len("const DATA = "):].rstrip(";\n"))
    ids = set()
    for key in ("runs", "strength", "others"):
        for a in data.get(key, []):
            ids.add(str(a["labelId"]))
    return ids


def fetch_recent_records(tok):
    end = datetime.now()
    start = end - timedelta(days=WINDOW_DAYS)
    return mcp_call(tok, "querySportRecords", {
        "startDate": start.strftime("%Y%m%d"), "endDate": end.strftime("%Y%m%d"),
        "sportTypeCodes": [65535], "limit": 100,
        "minDistanceKm": 0, "maxDistanceKm": 0,
        "minDurationMinutes": 0, "maxDurationMinutes": 0,
        "maxAveragePace": "", "locationKeyword": ""})


def parse_records(text):
    """-> list of (labelId, sportType) in the records text."""
    out = []
    for block in re.split(r"\n(?=\d+\.\s)", text):
        lid = re.search(r"LabelId:\s*(\d+)", block)
        st = re.search(r"SportType:\s*(\d+)", block)
        if lid and st:
            out.append((lid.group(1), int(st.group(1))))
    return out


def fetch_fit(tok, lid, st):
    """Download the FIT file for one activity into raw/fits/<lid>.fit."""
    text = mcp_call(tok, "queryActivityFitFileDownloadUrls",
                    {"labelId": lid, "sportType": st})
    urls = re.findall(r"https?://\S+", text)
    if not urls:
        log(f"  no FIT url for {lid}")
        return False
    data = urllib.request.urlopen(urls[0].rstrip('",\\'), timeout=120).read()
    if data[8:12] != b".FIT":
        log(f"  bad FIT payload for {lid} ({len(data)} bytes)")
        return False
    with open(os.path.join(FITS, f"{lid}.fit"), "wb") as f:
        f.write(data)
    return True


def run(cmd, cwd=BASE):
    r = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"{' '.join(cmd)} failed: {r.stderr.strip()[:400]}")
    return r.stdout


def main():
    # single instance
    lockf = open(LOCK_FILE, "w")
    try:
        fcntl.flock(lockf, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        log("another sync is running; skip")
        return 0

    tok = get_token()
    text = fetch_recent_records(tok)
    pairs = parse_records(text)
    known = dashboard_label_ids()
    new = [(lid, st) for (lid, st) in pairs if lid not in known]
    if not new:
        log(f"quiet ({len(pairs)} recent, all known)")
        return 0

    log(f"NEW: {len(new)} activities " + str([(l[-6:], s) for l, s in new]))
    if DRY:
        log("dry-run: stopping before writes")
        return 0

    # archive the records text (append-only file; update.py dedupes by labelId)
    os.makedirs(RECORDS, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    with open(os.path.join(RECORDS, f"poll_{stamp}.txt"), "w", encoding="utf-8") as f:
        f.write(text)

    # lap files for new runs (fetch_laps auto-detects what's missing)
    if any(st in RUN_TYPES for (_, st) in new):
        log(run([sys.executable, "fetch_laps.py"]).strip().splitlines()[-1])

    # FIT files for new outdoor runs
    new_fits = 0
    os.makedirs(FITS, exist_ok=True)
    for lid, st in new:
        if st in OUTDOOR_TYPES and not os.path.exists(os.path.join(FITS, f"{lid}.fit")):
            if fetch_fit(tok, lid, st):
                new_fits += 1
                log(f"  FIT downloaded: {lid}")

    # regenerate
    if new_fits:
        run([sys.executable, "segments.py"])
    run([sys.executable, "update.py"])

    # verify the new activities actually landed on the dashboard
    after = dashboard_label_ids()
    still_missing = [lid for (lid, st) in new if lid not in after]
    if still_missing:
        log(f"WARNING: still absent from data.js after update: {still_missing} "
            "— records parsing likely failed; will NOT loop-commit")

    # publish only on substantive change (ignore the regeneration timestamp)
    strip = lambda s: re.sub(r'"generated":"[^"]*"', '', s)
    head = subprocess.run(["git", "show", "HEAD:coros-dashboard/data.js"],
                          cwd=REPO, capture_output=True, text=True).stdout
    now_ = open(os.path.join(BASE, "data.js"), encoding="utf-8").read()
    if strip(head) == strip(now_):
        run(["git", "checkout", "--", "coros-dashboard/data.js"], cwd=REPO)
        log("no substantive data.js change; commit skipped")
        return 0

    run(["git", "add", "coros-dashboard/data.js"], cwd=REPO)
    diff = subprocess.run(["git", "diff", "--cached", "--quiet"], cwd=REPO)
    if diff.returncode != 0:
        msg = f"coros-dashboard: sync {len(new)} new activities [auto]"
        run(["git", "commit", "-q", "-m",
             msg + "\n\nCo-Authored-By: coros-sync (launchd) <noreply@local>"], cwd=REPO)
        run(["git", "push", "-q", "origin", "HEAD"], cwd=REPO)
        log(f"pushed: {msg}")
    else:
        log("no data.js change after regeneration")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as e:
        log(f"ERROR: {e}")
        sys.exit(1)
