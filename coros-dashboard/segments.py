#!/usr/bin/env python3
"""Geographic route-segment mining from COROS FIT files.

Discovers *common route segments* — stretches of trail/road the athlete repeats
— directly from GPS tracks, then ranks the top performances (fastest
traversals) for each. Segments carry their real geographic path so the
dashboard can draw them on a map.

Model
-----
Runs that start at the same trailhead are clustered together. Within a cluster
the shared corridor is recovered as a centerline (the outbound leg of a typical
out-and-back run, resampled to even spacing). Every run is projected onto that
centerline, giving each GPS point an arc-length position ``s`` along the route.
Directed segments are then intervals of ``s``:

  * core forward  [0 -> L]      the favourite out-segment (everyone runs it)
  * core return   [L -> 0]      the way back (out-and-back runs only)
  * round trip    [0 -> L -> 0] the full out-and-back, door to door
  * extension     [L -> max]    the "go forward" branch (runs continuing past L)

Traversals are timed by detecting when the projected ``s`` crosses the segment
endpoints in the relevant direction. This is robust to GPS jitter because
projection onto a smooth centerline tolerates tens of metres of noise.
"""
import os
import glob
import json
import math
import time
import warnings
from collections import defaultdict

warnings.filterwarnings("ignore")

CLUSTER_RADIUS_M = 200.0   # group runs whose starts are within this distance
CORRIDOR_WIDTH_M = 70.0    # a point counts as "on the corridor" within this perp dist
RESAMPLE_M = 30.0          # centerline vertex spacing
MIN_EFFORTS = 2            # a segment needs at least this many timed efforts
GATE_M = 30.0              # timing gates sit this far inside the segment ends
TOP_N = 5
_M_PER_DEG_LAT = 111320.0


# --------------------------------------------------------------------------- #
# Geometry (local tangent plane in metres for speed/accuracy at this scale)
# --------------------------------------------------------------------------- #
def hav(a, b):
    R = 6371000.0
    la1, lo1 = a
    la2, lo2 = b
    p1, p2 = math.radians(la1), math.radians(la2)
    dp = math.radians(la2 - la1)
    dl = math.radians(lo2 - lo1)
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R * math.asin(math.sqrt(h))


def semicircle_to_deg(v):
    return v * (180.0 / 2 ** 31)


class LocalPlane:
    """Convert lat/lon <-> local metres around a reference point."""

    def __init__(self, ref_lat, ref_lon):
        self.ref_lat = ref_lat
        self.ref_lon = ref_lon
        self.m_per_deg_lon = _M_PER_DEG_LAT * math.cos(math.radians(ref_lat))

    def to_xy(self, lat, lon):
        return ((lon - self.ref_lon) * self.m_per_deg_lon,
                (lat - self.ref_lat) * _M_PER_DEG_LAT)

    def to_latlon(self, x, y):
        return (self.ref_lat + y / _M_PER_DEG_LAT,
                self.ref_lon + x / self.m_per_deg_lon)


# --------------------------------------------------------------------------- #
# FIT parsing
# --------------------------------------------------------------------------- #
def parse_fit(path):
    import fitdecode
    pts = []
    with fitdecode.FitReader(path) as fit:
        for frame in fit:
            if isinstance(frame, fitdecode.FitDataMessage) and frame.name == "record":
                try:
                    lat = frame.get_value("position_lat")
                    lon = frame.get_value("position_long")
                except Exception:
                    continue
                if lat is None or lon is None:
                    continue
                ts = frame.get_value("timestamp")
                if ts is None:
                    continue
                try:
                    dist = frame.get_value("distance")
                except Exception:
                    dist = None
                try:
                    hr = frame.get_value("heart_rate")
                except Exception:
                    hr = None
                pts.append((semicircle_to_deg(lat), semicircle_to_deg(lon),
                            ts.timestamp(), dist, hr))
    return pts


# --------------------------------------------------------------------------- #
# Centerline construction & projection
# --------------------------------------------------------------------------- #
def resample_polyline(xy, spacing):
    """Resample an (x, y) polyline to even arc-length spacing. Returns list of
    (x, y, s) where s is cumulative arc length."""
    if len(xy) < 2:
        return [(xy[0][0], xy[0][1], 0.0)] if xy else []
    out = [(xy[0][0], xy[0][1], 0.0)]
    s = 0.0
    for i in range(1, len(xy)):
        x0, y0 = xy[i - 1]
        x1, y1 = xy[i]
        seg = math.hypot(x1 - x0, y1 - y0)
        if seg == 0:
            continue
        d = spacing - (s % spacing)
        while d <= seg + 1e-9:
            t = d / seg
            out.append((x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, s + d))
            d += spacing
        s += seg
    out.append((xy[-1][0], xy[-1][1], s))
    return out


def project_points(xy_pts, centerline):
    """Project each (x, y) point onto the centerline using a spatial hash grid
    for speed. Returns list of (s, perp) aligned to xy_pts."""
    cl = centerline
    n = len(cl)
    # build a grid of centerline segment indices keyed by cell
    cell = 100.0  # metres
    grid = defaultdict(list)
    for i in range(n - 1):
        ax, ay, _ = cl[i]
        bx, by, _ = cl[i + 1]
        # register segment in every cell its bounding box touches
        minx, maxx = min(ax, bx), max(ax, bx)
        miny, maxy = min(ay, by), max(ay, by)
        cx0, cx1 = int(minx // cell), int(maxx // cell)
        cy0, cy1 = int(miny // cell), int(maxy // cell)
        for gx in range(cx0, cx1 + 1):
            for gy in range(cy0, cy1 + 1):
                grid[(gx, gy)].append(i)

    res = []
    for (px, py) in xy_pts:
        gx, gy = int(px // cell), int(py // cell)
        # gather candidate segments from this and neighbouring cells
        cands = []
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                cands.extend(grid.get((gx + dx, gy + dy), ()))
        if not cands:
            # fall back to full scan (rare)
            cands = range(n - 1)
        best_d = float("inf")
        best_s = 0.0
        for i in cands:
            ax, ay, sa = cl[i]
            bx, by, sb = cl[i + 1]
            abx, aby = bx - ax, by - ay
            seg_len2 = abx * abx + aby * aby
            if seg_len2 == 0:
                continue
            t = ((px - ax) * abx + (py - ay) * aby) / seg_len2
            t = max(0.0, min(1.0, t))
            cx, cy = ax + t * abx, ay + t * aby
            d = math.hypot(px - cx, py - cy)
            if d < best_d:
                best_d = d
                best_s = sa + t * (sb - sa)
        res.append((best_s, best_d))
    return res


# --------------------------------------------------------------------------- #
# Traversal timing
# --------------------------------------------------------------------------- #
def crossing_time(series, target, direction):
    """series: list of (t, s). Find the time when s crosses `target`.
    direction=+1 (rising): first transition from s < target to s >= target.
    direction=-1 (falling): first transition from s >= target to s < target.
    Returns timestamp or None."""
    if not series:
        return None
    if direction > 0:
        if series[0][1] >= target:
            return series[0][0]
        for i in range(1, len(series)):
            s_prev = series[i - 1][1]
            s_cur = series[i][1]
            if s_prev < target and s_cur >= target:
                t0, _ = series[i - 1]
                t1, _ = series[i]
                if s_cur == s_prev:
                    return t1
                frac = (target - s_prev) / (s_cur - s_prev)
                return t0 + frac * (t1 - t0)
    else:
        # falling: find where s drops from >= target to < target
        for i in range(1, len(series)):
            s_prev = series[i - 1][1]
            s_cur = series[i][1]
            if s_prev >= target and s_cur < target:
                t0, _ = series[i - 1]
                t1, _ = series[i]
                if s_cur == s_prev:
                    return t1
                frac = (target - s_prev) / (s_cur - s_prev)
                return t0 + frac * (t1 - t0)
    return None


def time_segment(series, s_start, s_end, direction, hr_at=None):
    """Time a directed traversal from s_start to s_end.
    direction=+1: find rising crossing of s_start then rising crossing of s_end.
    direction=-1: find falling crossing of s_start then falling crossing of s_end.
    Returns (seconds, avg_hr) or None."""
    t_a = crossing_time(series, s_start, direction)
    if t_a is None:
        return None
    # For the second crossing, search only after t_a to avoid matching the start
    idx_a = 0
    for i, (t, s) in enumerate(series):
        if t >= t_a:
            idx_a = i
            break
    t_b = crossing_time(series[idx_a:], s_end, direction)
    if t_b is None:
        return None
    secs = t_b - t_a
    if secs <= 0:
        return None
    avg_hr = None
    if hr_at is not None:
        hrs = [hr for (t, s, hr) in hr_at if t_a <= t <= t_b and hr is not None]
        if hrs:
            avg_hr = round(sum(hrs) / len(hrs))
    return (round(secs, 1), avg_hr)


def time_return(series, L, hr_at=None):
    """Time the return leg through fixed gates: from the falling crossing of
    s = L - GATE_M (leaving the turnaround zone) to the falling crossing of
    s = GATE_M (back at the start), both interpolated.

    Two properties matter. Searching only after the run's peak keeps outbound
    jitter around the far gate from matching. And starting the clock at the
    gate crossing — not at the farthest GPS point — keeps any rest at the
    turnaround out of the return time (it lands between the legs, in neither).
    Returns (seconds, avg_hr) or None."""
    if not series:
        return None
    peak_idx = max(range(len(series)), key=lambda i: series[i][1])
    if series[peak_idx][1] < L - GATE_M:  # never reached the turnaround zone
        return None
    tail = series[peak_idx:]
    return time_segment(tail, L - GATE_M, GATE_M, -1, hr_at)


def time_roundtrip(series, L, hr_at=None):
    """Time the full out-and-back: from the rising crossing of s = GATE_M on
    the way out to the falling crossing of s = GATE_M after the turnaround.

    Unlike the two single-leg segments, dwell at the turnaround is *included* —
    a round trip is door-to-door elapsed time. The run must still reach the
    turnaround zone (peak s >= L - GATE_M). Returns (seconds, avg_hr) or None."""
    if not series:
        return None
    peak_idx = max(range(len(series)), key=lambda i: series[i][1])
    if series[peak_idx][1] < L - GATE_M:
        return None
    t_a = crossing_time(series, GATE_M, +1)
    if t_a is None:
        return None
    t_b = crossing_time(series[peak_idx:], GATE_M, -1)
    if t_b is None or t_b <= t_a:
        return None
    secs = t_b - t_a
    avg_hr = None
    if hr_at is not None:
        hrs = [hr for (t, s, hr) in hr_at if t_a <= t <= t_b and hr is not None]
        if hrs:
            avg_hr = round(sum(hrs) / len(hrs))
    return (round(secs, 1), avg_hr)


# --------------------------------------------------------------------------- #
# Cluster + segment discovery
# --------------------------------------------------------------------------- #
def cluster_by_start(runs, plane):
    """runs: list of dicts with labelId, start lat/lon, parsed pts.
    Greedy cluster by start coordinate."""
    clusters = []
    for r in runs:
        placed = False
        for c in clusters:
            if hav(c["start"], (r["lat"], r["lon"])) < CLUSTER_RADIUS_M:
                c["members"].append(r)
                placed = True
                break
        if not placed:
            clusters.append({"start": (r["lat"], r["lon"]), "members": [r]})
    return clusters


def build_centerline(members, plane):
    """Build the shared corridor centerline covering the FULL common route
    (including any "go forward" extension). Use the outbound leg of the run that
    reached farthest from the start. Returns (centerline_xy_s, L, is_out_and_back)
    where L is the typical turnaround position (median max-s of out-and-backs)."""
    infos = []
    for r in members:
        pts = r["pts"]
        if len(pts) < 10:
            continue
        start = (pts[0][0], pts[0][1])
        end = (pts[-1][0], pts[-1][1])
        gap = hav(start, end)
        far_i = max(range(len(pts)), key=lambda i: hav(start, (pts[i][0], pts[i][1])))
        far_dist = hav(start, (pts[far_i][0], pts[far_i][1]))
        total = pts[-1][3] or 0
        infos.append({"run": r, "gap": gap, "far_i": far_i, "far_dist": far_dist,
                      "total": total})
    if not infos:
        return None, 0, False

    oab = [i for i in infos if i["gap"] < 100 and i["far_i"] > 5]
    is_oab = len(oab) >= 1

    # reference = the run that reached farthest (covers full corridor)
    ref = max(infos, key=lambda i: i["far_dist"])
    rpts = ref["run"]["pts"]
    leg = rpts[: ref["far_i"] + 1]
    xy = [plane.to_xy(p[0], p[1]) for p in leg]
    centerline = resample_polyline(xy, RESAMPLE_M)

    oab_ids = set(i["run"]["labelId"] for i in oab)
    return centerline, oab_ids, is_oab


def discover_cluster_segments(members, plane, cluster_start):
    centerline, oab_ids, is_oab = build_centerline(members, plane)
    if centerline is None or centerline[-1][2] < 200:
        return []

    # Project every run; build (t, s) series for on-corridor points.
    projected_runs = []
    for r in members:
        pts = r["pts"]
        if len(pts) < 10:
            continue
        xy = [plane.to_xy(p[0], p[1]) for p in pts]
        proj = project_points(xy, centerline)
        series = []
        hr_series = []
        for (p, (s, d)) in zip(pts, proj):
            if d <= CORRIDOR_WIDTH_M:
                series.append((p[2], s))
                hr_series.append((p[2], s, p[4]))
        if len(series) < 5:
            continue
        run_max_s = max(s for (t, s) in series)
        projected_runs.append({"labelId": r["labelId"], "date": r["date"],
                               "sportType": r.get("sportType"),
                               "series": series, "hr": hr_series,
                               "max_s": run_max_s, "pts": pts, "proj": proj,
                               "is_oab": r["labelId"] in oab_ids})

    if not projected_runs:
        return []

    # L = turnaround position = median max_s of out-and-back runs (arc length).
    oab_runs = [pr for pr in projected_runs if pr["is_oab"]]
    pool = oab_runs if oab_runs else projected_runs
    max_s_sorted = sorted(pr["max_s"] for pr in pool)
    L = max_s_sorted[len(max_s_sorted) // 2]

    segments = []

    # ---- core forward [0 -> L] ----
    # core path = centerline up to arc-length L
    core_path = [plane.to_latlon(c[0], c[1]) for c in centerline if c[2] <= L]
    if not core_path:
        core_path = [plane.to_latlon(centerline[0][0], centerline[0][1])]
    fwd_efforts = []
    core_len = max(L - 2 * GATE_M, 0.0)  # timed span between the two gates
    for pr in projected_runs:
        if pr["max_s"] < L - GATE_M:
            continue  # never reached the turnaround zone
        # Fixed gates for every run: rising crossing of GATE_M, then of
        # L - GATE_M. Ending at the far gate (not the peak) keeps dwell at the
        # turnaround out of the outbound time, mirroring time_return.
        res = time_segment(pr["series"], GATE_M, L - GATE_M, +1, pr["hr"])
        if res:
            secs, hr = res
            fwd_efforts.append({"labelId": pr["labelId"], "date": pr["date"],
                                "sportType": pr.get("sportType"),
                                "seconds": secs, "avgHr": hr})
    if len(fwd_efforts) >= MIN_EFFORTS:
        segments.append(_mk_segment("core-out", "Outbound · start → turnaround",
                                    core_path, core_len, fwd_efforts, direction="forward"))

    # ---- core return [L -> 0] (out-and-backs) ----
    if is_oab:
        rev_efforts = []
        for pr in projected_runs:
            res = time_return(pr["series"], L, pr["hr"])
            if res:
                secs, hr = res
                rev_efforts.append({"labelId": pr["labelId"], "date": pr["date"],
                                    "sportType": pr.get("sportType"),
                                    "seconds": secs, "avgHr": hr})
        if len(rev_efforts) >= MIN_EFFORTS:
            rev_path = list(reversed(core_path))
            segments.append(_mk_segment("core-return", "Return · turnaround → start",
                                        rev_path, core_len, rev_efforts, direction="return"))

        # ---- core round trip [0 -> L -> 0] ----
        rt_efforts = []
        for pr in projected_runs:
            res = time_roundtrip(pr["series"], L, pr["hr"])
            if res:
                secs, hr = res
                rt_efforts.append({"labelId": pr["labelId"], "date": pr["date"],
                                   "sportType": pr.get("sportType"),
                                   "seconds": secs, "avgHr": hr})
        if len(rt_efforts) >= MIN_EFFORTS:
            rt_path = core_path + list(reversed(core_path))
            segments.append(_mk_segment("core-roundtrip", "Round trip · start → turnaround → start",
                                        rt_path, 2 * (L - GATE_M), rt_efforts,
                                        direction="roundtrip"))

    # ---- extension [L -> max_s] ("go forward" branch) ----
    ext_efforts = []
    ext_max = L
    for pr in projected_runs:
        if pr["max_s"] > L + 150:  # went meaningfully past the turnaround
            res = time_segment(pr["series"], L, pr["max_s"], +1, pr["hr"])
            if res:
                secs, hr = res
                ext_efforts.append({"labelId": pr["labelId"], "date": pr["date"],
                                    "sportType": pr.get("sportType"),
                                    "seconds": secs, "avgHr": hr})
                ext_max = max(ext_max, pr["max_s"])
    if ext_efforts:
        ext_path = _extension_path(projected_runs, centerline, plane, L)
        if ext_path and len(ext_path) >= 2:
            segments.append(_mk_segment("extension", "Extension · beyond the turnaround",
                                        ext_path, ext_max - L, ext_efforts,
                                        direction="forward"))

    return segments


def _extension_path(projected_runs, centerline, plane, L):
    """Reconstruct the geographic path beyond L from the run that went farthest.

    Uses only the OUTBOUND portion of that run (track order up to its farthest
    on-corridor sample) so the return leg — whose points also project to s > L
    — cannot be swept into the path. Anchored at the turnaround vertex (the
    centerline vertex at arc length ~L); the centerline itself spans the full
    corridor, so its last vertex is the far end, not the turnaround."""
    best = max(projected_runs, key=lambda pr: pr["max_s"])
    pts = best["pts"]
    proj = best["proj"]
    # index of the farthest on-corridor sample — the outbound portion ends here
    far_i, far_s = None, -1.0
    for i, (s, d) in enumerate(proj):
        if d <= CORRIDOR_WIDTH_M and s > far_s:
            far_s, far_i = s, i
    if far_i is None:
        return None
    beyond = [(pts[i], proj[i][0]) for i in range(far_i + 1)
              if proj[i][1] <= CORRIDOR_WIDTH_M and proj[i][0] > L - 50]
    if len(beyond) < 2:
        return None
    # anchor at the turnaround vertex: first centerline vertex at arc length >= L
    anchor_v = next((c for c in centerline if c[2] >= L), centerline[-1])
    path = [plane.to_latlon(anchor_v[0], anchor_v[1])]
    # decimate to ~30m spacing
    last_s = L - 50
    for (p, s) in beyond:
        if s - last_s >= 30:
            path.append((p[0], p[1]))
            last_s = s
    # always include the farthest point
    path.append((beyond[-1][0][0], beyond[-1][0][1]))
    return path


def _mk_segment(sid, name, path, length_m, efforts, direction):
    efforts = sorted(efforts, key=lambda e: e["seconds"])
    for rank, e in enumerate(efforts, 1):
        e["rank"] = rank
    return {
        "id": sid,
        "name": name,
        "direction": direction,
        "path": [[round(la, 6), round(lo, 6)] for (la, lo) in path] if path else [],
        "lengthM": round(length_m, 1),
        "effortCount": len(efforts),
        "bestSeconds": efforts[0]["seconds"] if efforts else None,
        "efforts": efforts[:TOP_N],
    }


# --------------------------------------------------------------------------- #
# POI naming (reverse geocoding via Nominatim, cached, offline-safe)
# --------------------------------------------------------------------------- #
def poi_label(lat, lon, cache):
    """Best-effort short place label for a coordinate. Cached by ~11 m cell;
    returns None on any failure so callers can keep generic names."""
    import urllib.request
    key = f"{lat:.4f},{lon:.4f}"
    if key in cache:
        return cache[key]
    url = ("https://nominatim.openstreetmap.org/reverse?format=jsonv2"
           f"&lat={lat}&lon={lon}&zoom=17")
    req = urllib.request.Request(url, headers={
        "User-Agent": "coros-dashboard/1.0 (personal training dashboard)"})
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            j = json.load(r)
    except Exception:
        cache[key] = None
        return None
    name = j.get("name") or ""
    addr = j.get("address") or {}
    if not name:
        for k in ("tourism", "leisure", "park", "amenity", "natural", "water",
                  "peak", "building", "road", "pedestrian", "footway",
                  "neighbourhood", "suburb", "village", "hamlet"):
            if addr.get(k):
                name = addr[k]
                break
    cache[key] = name or None
    time.sleep(1.1)  # Nominatim politeness: max ~1 req/s
    return cache[key]


def apply_poi_names(all_segments, base):
    """Rename segments to '<start POI> -> <end POI>' where geocoding succeeds;
    keep the generic directional names as fallback."""
    cache_path = os.path.join(base, "raw", "poi_cache.json")
    try:
        cache = json.load(open(cache_path, encoding="utf-8"))
    except Exception:
        cache = {}
    for s in all_segments:
        if not s["path"]:
            continue
        a = s["path"][0]
        b = s["path"][-1]
        if s.get("kind") == "core-roundtrip":
            b = s["path"][len(s["path"]) // 2]   # loop closes; name via turnaround
        pa = poi_label(a[0], a[1], cache)
        pb = poi_label(b[0], b[1], cache)
        if pa and pb and pa != pb:
            arrow = "⇄" if s.get("kind") == "core-roundtrip" else "→"
            s["name"] = f"{pa} {arrow} {pb}"
        elif pa and pb:  # both endpoints resolve to the same place
            word = {"core-roundtrip": "loop", "core-out": "outbound",
                    "core-return": "return", "extension": "extension"}.get(s.get("kind"))
            s["name"] = f"{pa} · {word}" if word else pa
    os.makedirs(os.path.dirname(cache_path), exist_ok=True)
    with open(cache_path, "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False)


# --------------------------------------------------------------------------- #
# Main
# --------------------------------------------------------------------------- #
def main():
    base = os.path.dirname(os.path.abspath(__file__))
    fits_dir = os.path.join(base, "raw", "fits")
    files = sorted(glob.glob(os.path.join(fits_dir, "*.fit")))
    if not files:
        print("No FIT files in raw/fits/")
        return

    # run metadata (dates) from data.js
    runs_meta = {}
    data_path = os.path.join(base, "data.js")
    if os.path.exists(data_path):
        txt = open(data_path, encoding="utf-8").read()
        data = json.loads(txt[len("const DATA = "):].rstrip(";\n"))
        for r in data["runs"] + data.get("others", []):
            runs_meta[r["labelId"]] = r

    # parse all FITs
    runs = []
    for f in files:
        lid = os.path.basename(f).replace(".fit", "")
        try:
            pts = parse_fit(f)
        except Exception as e:
            print(f"  parse fail {lid}: {e}")
            continue
        if len(pts) < 10:
            continue
        meta = runs_meta.get(lid, {})
        runs.append({
            "labelId": lid, "pts": pts,
            "lat": pts[0][0], "lon": pts[0][1],
            "date": meta.get("date", "unknown"),
            "sportType": meta.get("sportType"),
        })

    if not runs:
        print("No usable tracks.")
        return

    plane = LocalPlane(runs[0]["lat"], runs[0]["lon"])
    clusters = cluster_by_start(runs, plane)
    print(f"Parsed {len(runs)} tracks into {len(clusters)} start-clusters")

    all_segments = []
    for ci, c in enumerate(clusters):
        if len(c["members"]) < 2:
            continue
        segs = discover_cluster_segments(c["members"], plane, c["start"])
        for s in segs:
            s["cluster"] = ci
            s["kind"] = s["id"]                      # core-out / core-return / ...
            s["id"] = f"c{ci}-{s['id']}"             # unique across clusters
            s["clusterStart"] = [round(c["start"][0], 6), round(c["start"][1], 6)]
        all_segments.extend(segs)
        print(f"  cluster {ci} @ {c['start']}: {len(c['members'])} runs -> {len(segs)} segments")

    # strongest clusters first (by best-supported segment), segments of a
    # cluster kept together in discovery order (out, return, round trip, ext)
    strength = {}
    for s in all_segments:
        strength[s["cluster"]] = max(strength.get(s["cluster"], 0), s["effortCount"])
    order = {ci: i for i, ci in enumerate(sorted(strength, key=lambda c: -strength[c]))}
    all_segments.sort(key=lambda s: order[s["cluster"]])

    apply_poi_names(all_segments, base)

    out = {"refLat": plane.ref_lat, "refLon": plane.ref_lon, "segments": all_segments}
    with open(os.path.join(base, "raw", "geo_segments.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    print(f"\nWrote raw/geo_segments.json with {len(all_segments)} segments")
    for s in all_segments:
        print(f"  [{s['id']}] {s['name']}: {s['lengthM']}m, {s['effortCount']} efforts, "
              f"best={s['bestSeconds']}s, path_pts={len(s['path'])}")


if __name__ == "__main__":
    main()
