#!/usr/bin/env python3
"""Builds the audit's two tables from the extracted agents.

Writes data/agents.json (one row per agent: who started it, its tokens, its
cost and its seconds by state) and data/spans.json (one row per interval of
an agent's time, with the tool call's class where it is a tool wait).
"""

import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import DATA, EFFORTS, classify, cost, hierarchy, intervals, load, lock_file, price_of, role_of, scope, steps


def main():
    agents = load()
    parent = hierarchy(agents)
    rows = []
    spans = []
    # A wait on a foreground subagent ends when the subagent's log does; what
    # is left of the wait after that was an outage, not a review.
    child_end = {}
    unpriced = {}
    for agent in agents:
        if agent["is_sub"] and agent["meta"].get("toolUseId") and agent["t1"]:
            child_end[agent["meta"]["toolUseId"]] = agent["t1"]
    for agent in agents:
        tools = {c["id"]: c for c in agent["tools"]}
        tokens = {"in": 0, "cw": 0, "cr": 0, "out": 0, "think": 0, "n": 0, "cost": 0.0}
        peak = 0
        for req in agent["requests"]:
            if req["synthetic"]:
                continue
            for key in ("in", "cw", "cr", "out", "think"):
                tokens[key] += req[key]
            tokens["n"] += 1
            tokens["cost"] += cost(req)
            if agent["session"] in EFFORTS and not price_of(req.get("model")):
                unpriced[req.get("model")] = unpriced.get(req.get("model"), 0) + 1
            peak = max(peak, req["in"] + req["cr"] + req["cw"])
        states = {}
        pieces = []
        for start, end, state, ref in intervals(agent):
            done = child_end.get(ref) if state == "tool" else None
            if done and end > done + 120 and (tools.get(ref) or {}).get("name") == "Agent":
                cut = max(start, done + 10)
                if cut > start:
                    pieces.append((start, cut, "tool", ref))
                pieces.append((cut, end, "stall", ref))
            else:
                pieces.append((start, end, state, ref))
        for start, end, state, ref in pieces:
            states[state] = states.get(state, 0.0) + end - start
            span = {"a": agent["key"], "s": start, "e": end, "st": state}
            if state == "tool":
                call = tools.get(ref) or {}
                span["tool"] = call.get("name")
                span["id"] = ref
                if call.get("name") == "Bash":
                    span["cls"] = classify(call.get("cmd"))
                    span["steps"] = sorted(steps(call.get("cmd")))
                    span["scope"] = scope(call.get("cmd"))
                    span["lock"] = lock_file(call.get("cmd"))
                elif call.get("name") == "Agent":
                    span["cls"] = "agent"
                    span["desc"] = call.get("desc")
                else:
                    span["cls"] = call.get("name")
            elif state in ("idle", "stall"):
                span["wake"] = ref if state == "idle" else None
            spans.append(span)
        meta = agent["meta"]
        model = max(agent["models"].items(), key=lambda kv: kv[1])[0] if agent["models"] else None
        rows.append(
            {
                "key": agent["key"],
                "session": agent["session"],
                "effort": EFFORTS.get(agent["session"]),
                "role": role_of(
                    agent["is_sub"],
                    meta.get("spawnDepth", 0),
                    meta.get("description"),
                    states.get("model", 0.0) + states.get("tool", 0.0),
                ),
                "agent_id": agent["agent_id"],
                "is_sub": agent["is_sub"],
                "depth": meta.get("spawnDepth", 0) if agent["is_sub"] else 0,
                "parent": parent.get(agent["key"]),
                "desc": meta.get("description"),
                "shape": meta.get("requestShape"),
                "type": meta.get("agentType"),
                "model": model,
                "t0": agent["t0"],
                "t1": agent["t1"],
                "tokens": tokens,
                "peak_ctx": peak,
                "states": states,
                "n_tools": len(agent["tools"]),
                "n_compact": len(agent["compactions"]),
                "n_drops": len(agent["drops"]),
            }
        )
    with open(os.path.join(DATA, "agents.json"), "w") as handle:
        json.dump(rows, handle)
    with open(os.path.join(DATA, "spans.json"), "w") as handle:
        json.dump(spans, handle)
    print(len(rows), "agents;", len(spans), "spans")
    if unpriced:
        print("the efforts' requests with no price in lib.py, counted as free:", unpriced, file=sys.stderr)


if __name__ == "__main__":
    main()
