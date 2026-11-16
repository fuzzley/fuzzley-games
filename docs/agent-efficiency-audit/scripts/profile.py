#!/usr/bin/env python3
"""Prints each effort's concurrency profile, minute by minute.

For every minute of an effort: how many workers were busy (with the model or
a tool), how many had reported and waited on the orchestrator, how many
reviewers ran, and what the orchestrator was doing.
"""

import json
import os
import sys
from collections import Counter, defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import DATA, EFFORTS, fmt

STEP = 60.0


def main():
    agents = {r["key"]: r for r in json.load(open(os.path.join(DATA, "agents.json")))}
    spans = json.load(open(os.path.join(DATA, "spans.json")))
    out = {}
    for session, effort in EFFORTS.items():
        mine = [s for s in spans if agents[s["a"]]["session"] == session]
        if not mine:
            continue
        start = min(s["s"] for s in mine)
        end = max(s["e"] for s in mine)
        slots = int((end - start) / STEP) + 1
        busy = [set() for _ in range(slots)]
        waiting = [set() for _ in range(slots)]
        reviewing = [set() for _ in range(slots)]
        main_state = [None] * slots
        down = [False] * slots
        for s in mine:
            role = agents[s["a"]]["role"]
            first = int((s["s"] - start) / STEP)
            last = int((s["e"] - start) / STEP)
            for slot in range(first, last + 1):
                lo = max(s["s"], start + slot * STEP)
                hi = min(s["e"], start + (slot + 1) * STEP)
                if hi - lo < STEP / 2 and last > first:
                    continue
                if s["st"] == "stall" and hi - lo >= STEP / 2:
                    down[slot] = True
                if role == "worker":
                    if s["st"] in ("model", "tool", "compact"):
                        busy[slot].add(s["a"])
                    elif s["st"] == "idle" and s.get("wake") == "coordinator":
                        waiting[slot].add(s["a"])
                elif role == "reviewer":
                    if s["st"] in ("model", "tool"):
                        reviewing[slot].add(s["a"])
                elif role == "main":
                    if s["st"] in ("model", "tool", "compact"):
                        main_state[slot] = "busy"
                    elif main_state[slot] is None:
                        main_state[slot] = s["st"] + ":" + str(s.get("wake"))
        dist = Counter()
        wait_dist = Counter()
        rev_dist = Counter()
        main_dist = Counter()
        up = 0
        for slot in range(slots):
            if down[slot] and not busy[slot] and not reviewing[slot]:
                continue
            up += 1
            dist[min(len(busy[slot]), 7)] += 1
            wait_dist[min(len(waiting[slot]), 5)] += 1
            rev_dist[min(len(reviewing[slot]), 5)] += 1
            main_dist[main_state[slot] or "no-log"] += 1
        worker_minutes = sum(k * v for k, v in dist.items())
        print(f"\n## {effort}: {fmt(start)} to {fmt(end)}, {slots / 60:.1f} h wall, {up / 60:.1f} h up")
        print("   busy workers:        " + "  ".join(f"{k}:{v / up:.0%}" for k, v in sorted(dist.items())) + f"   mean {worker_minutes / up:.2f}")
        print("   waiting, reported:   " + "  ".join(f"{k}:{v / up:.0%}" for k, v in sorted(wait_dist.items())))
        print("   reviewers running:   " + "  ".join(f"{k}:{v / up:.0%}" for k, v in sorted(rev_dist.items())))
        print("   orchestrator:        " + "  ".join(f"{k}:{v / up:.0%}" for k, v in main_dist.most_common(6)))
        last_busy = max((i for i in range(slots) if busy[i]), default=slots - 1)
        print(f"   after the last worker went quiet: {(slots - 1 - last_busy) / 60:.1f} h")
        out[effort] = {
            "wall_h": slots / 60,
            "up_h": up / 60,
            "busy": dict(dist),
            "waiting": dict(wait_dist),
            "reviewers": dict(rev_dist),
            "main": dict(main_dist),
            "series": [(len(busy[i]), len(waiting[i]), len(reviewing[i]), main_state[i], down[i]) for i in range(slots)],
            "start": start,
        }
    json.dump(out, open(os.path.join(DATA, "profile.json"), "w"))


if __name__ == "__main__":
    main()
