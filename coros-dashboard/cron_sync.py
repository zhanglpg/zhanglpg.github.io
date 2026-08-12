#!/usr/bin/env python3
"""Cron sync helper: fetch recent records via COROS MCP HTTP endpoint,
write raw/records/sync_latest.txt verbatim, and report missing lap/FIT files.
Usage: python3 cron_sync.py YYYYMMDD_START YYYYMMDD_END
"""
import json, os, re, sys, urllib.request

BASE = os.path.dirname(os.path.abspath(__file__))
TOK = json.load(open(os.path.expanduser("~/.hermes/mcp-tokens/coros.json")))["access_token"]
URL = "https://mcp.coros.com/mcp"


def mcp_call(name, args):
    payload = {"jsonrpc": "2.0", "id": 1, "method": "tools/call",
               "params": {"name": name, "arguments": args}}
    req = urllib.request.Request(
        URL, data=json.dumps(payload).encode(),
        headers={"Authorization": f"Bearer {TOK}",
                 "Content-Type": "application/json",
                 "Accept": "application/json, text/event-stream"})
    raw = urllib.request.urlopen(req, timeout=120).read().decode()
    if raw.lstrip().startswith("{"):
        data = json.loads(raw)
    else:
        data = None
        for line in raw.splitlines():
            if line.startswith("data:"):
                data = json.loads(line[5:].strip())
                break
        assert data is not None, "no SSE data frame"
    if "error" in data:
        raise RuntimeError(f"MCP error: {data['error']}")
    return data["result"]["content"][0]["text"]


def as_plain_text(t):
    """Result text sometimes arrives JSON-encoded (wrapped in quotes)."""
    s = t.strip()
    if s.startswith('"') and s.endswith('"'):
        try:
            d = json.loads(s)
            if isinstance(d, str):
                return d
        except Exception:
            pass
    return t


def main():
    start, end = sys.argv[1], sys.argv[2]
    text = as_plain_text(mcp_call("querySportRecords", {
        "startDate": start, "endDate": end, "sportTypeCodes": [65535],
        "minDistanceKm": 0, "maxDistanceKm": 0, "minDurationMinutes": 0,
        "maxDurationMinutes": 0, "maxAveragePace": "", "locationKeyword": "",
        "limit": 100}))
    out = os.path.join(BASE, "raw", "records", "sync_latest.txt")
    with open(out, "w") as f:
        f.write(text)
    print(f"WROTE sync_latest.txt ({len(text)} chars)")
    print("HEADER:", text.splitlines()[0] if text.strip() else "(empty)")

    records = [(m.group(1), int(m.group(2))) for m in
               re.finditer(r"LabelId:\s*(\d+)\s*\|\s*SportType:\s*(\d+)", text)]
    print(f"TOTAL_RECORDS={len(records)}")

    run_types = {100, 101, 102, 103}
    missing_laps = [(lid, st) for lid, st in records
                    if st in run_types and
                    not os.path.exists(os.path.join(BASE, "raw", "laps", lid + ".json"))]
    missing_fits = [(lid, st) for lid, st in records
                    if st in (102, 104) and
                    not os.path.exists(os.path.join(BASE, "raw", "fits", lid + ".fit"))]
    print("MISSING_LAPS=" + json.dumps(missing_laps))
    print("MISSING_FITS=" + json.dumps(missing_fits))

    # diff vs previous known labels (all existing laps + fits + prior sync files)
    known = set()
    for fn in os.listdir(os.path.join(BASE, "raw", "laps")):
        known.add(fn.split(".")[0])
    prev = os.path.join(BASE, "raw", "records", "poll_20260812-080148.txt")
    if os.path.exists(prev):
        known |= {m.group(1) for m in re.finditer(r"LabelId:\s*(\d+)", open(prev).read())}
    new_ids = [lid for lid, _ in records if lid not in known]
    print("NEW_LABEL_IDS=" + json.dumps(new_ids))


if __name__ == "__main__":
    main()
