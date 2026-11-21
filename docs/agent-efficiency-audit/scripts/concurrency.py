#!/usr/bin/env python3
"""Relates how long a check takes to what else was running at the time.

For each run of a check with a common signature (the root's lint, one game's
specs and so on), counts the other heavy checks in flight across the machine
while it ran, weighted by overlap, and prints the median duration by level.
"""

import bisect
import json
import os
import re
import statistics
import sys
from collections import defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import CHECKS, HEREDOC, load, OUT, SCRIPT_TAG, YARN_RUN

HEAVY = set(CHECKS) | {"report-sim"}


def signature(cmd):
    text = HEREDOC.sub(" ", cmd or "")
    here = None
    match = re.search(r"cd\s+\S*?/(games|lib)/([\w-]+)", text) or re.search(r"cd\s+\S*?/frontend/(site)()", text)
    if match:
        here = match.group(2) or match.group(1)
    parts = []
    for match in YARN_RUN.finditer(text):
        pre = match.group(1) or ""
        script = match.group(2)
        named = re.search(r"workspace\s+(\S+)", pre)
        if script in SCRIPT_TAG:
            where = named.group(1) if named else (here or "ROOT")
            parts.append(where + ":" + script)
    return " && ".join(dict.fromkeys(parts))


def overlap_load(spans_sorted, starts, start, end, skip):
    """Mean count of other spans in flight over [start, end]."""
    if end <= start:
        return 0.0
    total = 0.0
    index = bisect.bisect_left(starts, start - 4000)
    while index < len(spans_sorted) and spans_sorted[index][0] < end:
        s, e, ident = spans_sorted[index]
        if ident != skip and e > start:
            total += min(e, end) - max(s, start)
        index += 1
    return total / (end - start)


def main():
    spans = json.load(open(os.path.join(OUT, "spans.json")))
    cmds = {}
    for agent in load():
        for call in agent["tools"]:
            if call["name"] == "Bash":
                cmds[call["id"]] = call.get("cmd")
    heavy = sorted((s["s"], s["e"], s["id"]) for s in spans if s["st"] == "tool" and s.get("cls") in HEAVY)
    heavy_starts = [h[0] for h in heavy]
    active = sorted((s["s"], s["e"], s["a"]) for s in spans if s["st"] in ("model", "tool"))
    # merge an agent's spans into one "agent is active" count is costly; use model+tool spans directly
    active_starts = [a[0] for a in active]
    groups = defaultdict(list)
    for s in spans:
        if s["st"] != "tool" or s.get("cls") not in CHECKS or s.get("lock"):
            continue
        sig = signature(cmds.get(s["id"]))
        if not sig:
            continue
        duration = s["e"] - s["s"]
        load_checks = overlap_load(heavy, heavy_starts, s["s"], s["e"], s["id"])
        load_agents = overlap_load(active, active_starts, s["s"], s["e"], None)
        groups[sig].append((duration, load_checks, load_agents))
    wanted = sys.argv[1:] or [sig for sig, rows in sorted(groups.items(), key=lambda kv: -len(kv[1]))[:14]]
    out = {}
    for sig in wanted:
        rows = groups.get(sig, [])
        if len(rows) < 20:
            continue
        print(f"\n{sig}  (n={len(rows)})")
        table = []
        for label, low, high in (("0", 0, 0.25), ("~1", 0.25, 1.5), ("~2", 1.5, 2.5), ("~3", 2.5, 3.5), ("4+", 3.5, 99)):
            sel = sorted(r[0] for r in rows if low <= r[1] < high)
            if len(sel) >= 4:
                median = statistics.median(sel)
                p90 = sel[int(0.9 * (len(sel) - 1))]
                table.append((label, len(sel), median, p90))
                print(f"   other checks running {label:>3s}: n={len(sel):4d} median={median:6.1f}s p90={p90:6.1f}s")
        out[sig] = table
        for label, low, high in (("1-2", 0, 2.5), ("3-4", 2.5, 4.5), ("5-6", 4.5, 6.5), ("7+", 6.5, 99)):
            sel = sorted(r[0] for r in rows if low <= r[2] < high)
            if len(sel) >= 4:
                print(f"   agents active {label:>4s}:        n={len(sel):4d} median={statistics.median(sel):6.1f}s")
    json.dump(out, open(os.path.join(OUT, "check-vs-load.json"), "w"), indent=1)


if __name__ == "__main__":
    main()
