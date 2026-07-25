#!/usr/bin/env python3
"""Fetch COROS run lap data directly over the MCP HTTP endpoint and write each
result straight to raw/laps/<labelId>.json. Keeps payloads out of the agent
context. Reads the OAuth access token from ~/.hermes/mcp-tokens/coros.json.

Usage: python3 fetch_laps.py [labelId,sportType ...]
  With no args, auto-detects flat runs (sportType 100/101/103) present in
  raw/records/*.txt but missing from raw/laps/, and fetches those.
"""
import os
import re
import sys
import json
import glob
import time
import urllib.request

BASE = os.path.dirname(os.path.abspath(__file__))
LAPS = os.path.join(BASE, "raw", "laps")
RECORDS = os.path.join(BASE, "raw", "records")
TOKEN_FILE = os.path.expanduser("~/.hermes/mcp-tokens/coros.json")
URL = "https://mcp.coros.com/mcp"
FLAT_RUN_TYPES = {100, 101, 103}


def load_token():
    with open(TOKEN_FILE) as f:
        return json.load(f)["access_token"]


def mcp_call(token, name, arguments, req_id=1):
    payload = {"jsonrpc": "2.0", "id": req_id, "method": "tools/call",
               "params": {"name": name, "arguments": arguments}}
    req = urllib.request.Request(
        URL, data=json.dumps(payload).encode(),
        headers={"Authorization": f"Bearer {token}",
                 "Content-Type": "application/json",
                 "Accept": "application/json, text/event-stream"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        body = resp.read().decode()
    # Response may be plain JSON or SSE; handle both.
    body = body.strip()
    if body.startswith("data:"):
        body = body.split("data:", 1)[1].strip()
    obj = json.loads(body)
    if "error" in obj:
        raise RuntimeError(f"MCP error: {obj['error']}")
    content = obj["result"]["content"]
    for c in content:
        if c.get("type") == "text":
            return c["text"]
    return json.dumps(content)


def detect_missing():
    have = {os.path.basename(p).replace(".json", "") for p in glob.glob(os.path.join(LAPS, "*.json"))}
    runs = {}
    for path in glob.glob(os.path.join(RECORDS, "*.txt")):
        with open(path, encoding="utf-8") as f:
            text = f.read()
        for block in re.split(r"\n(?=\d+\.\s)", text):
            lid = re.search(r"LabelId:\s*(\d+)", block)
            st = re.search(r"SportType:\s*(\d+)", block)
            if not lid or not st:
                continue
            st = int(st.group(1))
            if st in FLAT_RUN_TYPES:
                runs[lid.group(1)] = st
    return [(lid, st) for lid, st in runs.items() if lid not in have]


def main():
    os.makedirs(LAPS, exist_ok=True)
    token = load_token()

    if len(sys.argv) > 1:
        targets = []
        for arg in sys.argv[1:]:
            lid, st = arg.split(",")
            targets.append((lid, int(st)))
    else:
        targets = detect_missing()

    print(f"Fetching lap data for {len(targets)} runs ...")
    ok, fail = 0, []
    for i, (lid, st) in enumerate(targets, 1):
        out = os.path.join(LAPS, f"{lid}.json")
        if os.path.exists(out) and os.path.getsize(out) > 100:
            ok += 1
            continue
        for attempt in range(3):
            try:
                text = mcp_call(token, "queryActivityLapData",
                                {"labelId": lid, "sportType": st}, req_id=i)
                with open(out, "w", encoding="utf-8") as f:
                    f.write(text)
                ok += 1
                print(f"  [{i}/{len(targets)}] {lid} -> {len(text)} bytes")
                break
            except Exception as e:
                if attempt == 2:
                    fail.append(lid)
                    print(f"  [{i}/{len(targets)}] {lid} FAILED: {e}")
                time.sleep(2)
        time.sleep(0.3)  # gentle rate limit

    print(f"\nDone. ok={ok} failed={len(fail)}")
    if fail:
        print("Failed labelIds:", ",".join(fail))


if __name__ == "__main__":
    main()
