#!/usr/bin/env python3
"""Prints the audit's tables from data/agents.json, data/spans.json and the agents.

Run `extract.py` and `build.py` first. Each section answers one question the
report asks: where the hours went, where the tokens went, what a review and a
check cost, and what a cache rewrite was waiting on.
"""

import json
import os
import re
import statistics
import sys
from collections import Counter, defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import CHECKS, DATA, EFFORTS, FIXUP, HEREDOC, attribute, commits_in, cost, fmt, load, main_model, price_of, quantile, review_costs, scope, steps

ROLES = ("main", "worker", "reviewer", "helper")
ROOT_LINT = re.compile(r"(yarn\.js\"?|\by|yarn|\$YJ)\s+lint\b")
# Prettier on named files counts as time in checks, though `CHECKS`, the heavy
# checks a commit loop is counted by, leaves it out.
GROUP = {
    "verify": "checks", "coverage": "checks", "test": "checks", "layout": "checks", "build": "checks",
    "typecheck": "checks", "lint": "checks", "mutation": "checks", "format": "checks",
    "agent": "wait: reviewer", "sleep-wait": "wait: background job", "Monitor": "wait: background job",
    "ci-wait": "wait: CI",
}


def category(span, role):
    """Names the report's category for one span of an agent's time."""
    state = span["st"]
    if state == "model":
        return "model"
    if state == "tool":
        return GROUP.get(span.get("cls"), "other tools")
    if state == "idle":
        wake = span.get("wake")
        if role == "main":
            return "idle: " + {"human": "user", "task-notification": "agents", "peer": "agents", "meta": "timer"}.get(wake, "other")
        return "idle: its own background task" if wake == "task-notification" else "idle: waiting for the orchestrator"
    if state == "stall":
        return "outage"
    return state


def main():
    rows = json.load(open(os.path.join(DATA, "agents.json")))
    spans = json.load(open(os.path.join(DATA, "spans.json")))
    by_key = {r["key"]: r for r in rows}
    agents = {a["key"]: a for a in load() if a["session"] in EFFORTS}
    model = main_model(agents.values())
    prices = price_of(model)
    out = {}

    print("== 1. The efforts ==")
    table = []
    for session, effort in EFFORTS.items():
        mine = [r for r in rows if r["session"] == session]
        start = min(r["t0"] for r in mine if r["t0"])
        end = max(r["t1"] for r in mine if r["t1"])
        tokens = Counter()
        for r in mine:
            for key, value in r["tokens"].items():
                tokens[key] += value
        counts = Counter(r["role"] for r in mine)
        table.append(
            {
                "effort": effort, "start": fmt(start), "wall_h": round((end - start) / 3600, 1), "agents": len(mine),
                "workers": counts["worker"], "reviewers": counts["reviewer"], "helpers": counts["helper"],
                "requests": tokens["n"], "out_M": round(tokens["out"] / 1e6, 1), "read_M": round(tokens["cr"] / 1e6),
                "write_M": round(tokens["cw"] / 1e6, 1), "cost": round(tokens["cost"]),
            }
        )
        print(table[-1])
    out["efforts"] = table
    print("  all:", {key: round(sum(row[key] for row in table), 1) for key in ("agents", "workers", "reviewers", "helpers", "requests", "cost")})

    print("\n== 2. Agent-hours by category, by effort and role ==")
    hours = defaultdict(Counter)
    total = Counter()
    for span in spans:
        r = by_key[span["a"]]
        if not r["effort"]:
            continue
        cat = category(span, r["role"])
        d = (span["e"] - span["s"]) / 3600
        hours[(r["effort"], r["role"])][cat] += d
        total[cat] += d
    cats = [c for c, _ in total.most_common()]
    out["hours_total"] = {c: round(v, 1) for c, v in total.items()}
    everything = sum(total.values())
    for cat in cats:
        print(f"  {cat:34s} {total[cat]:7.1f} h {total[cat] / everything:6.1%}")
    busy = [c for c in cats if not c.startswith("idle") and c != "outage"]
    busy_total = sum(total[c] for c in busy)
    print("  busy hours:", round(busy_total, 1), {c: f"{total[c] / busy_total:.0%}" for c in busy})
    out["hours_by_role"] = {}
    for effort in EFFORTS.values():
        for role in ROLES:
            c = hours.get((effort, role))
            if c:
                out["hours_by_role"][effort + "/" + role] = {k: round(v, 1) for k, v in c.items()}
                print(f"  {effort[:22] + '/' + role:32s} " + "  ".join(f"{k}={v:.1f}" for k, v in c.most_common() if v >= 0.05))

    print("\n== 2b. Workers waiting for the orchestrator, by what it was doing meanwhile ==")
    main_spans = defaultdict(list)
    for span in spans:
        r = by_key[span["a"]]
        if r["effort"] and r["role"] == "main":
            cat = category(span, "main")
            main_spans[r["effort"]].append((span["s"], span["e"], cat if cat.startswith("idle") or cat == "outage" else "busy"))
    waits = defaultdict(list)
    for span in spans:
        r = by_key[span["a"]]
        if r["effort"] and r["role"] == "worker" and span["st"] == "idle" and span.get("wake") == "coordinator":
            waits[r["effort"]].append(span)
    out["waits_meanwhile"] = {}
    for effort, mine in waits.items():
        meanwhile = Counter()
        for span in mine:
            covered = 0.0
            for low, high, cat in main_spans[effort]:
                d = min(high, span["e"]) - max(low, span["s"])
                if d > 0:
                    meanwhile[cat] += d / 3600
                    covered += d
            meanwhile["no log"] += (span["e"] - span["s"] - covered) / 3600
        total = sum(meanwhile.values())
        if total < 1:
            continue
        long_waits = [s["e"] - s["s"] for s in mine if s["e"] - s["s"] > 1800]
        out["waits_meanwhile"][effort] = {k: round(v, 1) for k, v in meanwhile.items()}
        print(
            f"  {effort:28s} {len(mine):3d} waits, {total:5.1f} h ({len(long_waits)} over 30 min, {sum(long_waits) / 3600:.1f} h): "
            + ", ".join(f"orchestrator {k} {v:.1f}" for k, v in meanwhile.most_common() if v >= 0.05)
        )

    print("\n== 3. Spend by role and token type (list prices) ==")
    split = defaultdict(Counter)
    context = defaultdict(list)
    first = defaultdict(list)
    bucket = defaultdict(Counter)
    calls_per_request = defaultdict(Counter)
    for agent in agents.values():
        role = by_key[agent["key"]]["role"]
        reqs = [r for r in agent["requests"] if not r["synthetic"] and r.get("model") == model]
        if not reqs:
            continue
        first[role].append(reqs[0]["in"] + reqs[0]["cr"] + reqs[0]["cw"])
        per_message = Counter(c["req"] for c in agent["tools"])
        for r in reqs:
            ctx = r["in"] + r["cr"] + r["cw"]
            write5, write1h = r["cw5"], r["cw1h"]
            if write5 + write1h == 0:
                write5 = r["cw"]
            c = split[role]
            c["n"] += 1
            c["out"] += r["out"] * prices["out"] / 1e6
            c["think"] += r["think"] * prices["out"] / 1e6
            c["read"] += r["cr"] * prices["cr"] / 1e6
            c["write"] += (write5 * prices["cw5"] + write1h * prices["cw1h"]) / 1e6
            c["in"] += r["in"] * prices["in"] / 1e6
            context[role].append(ctx)
            b = min(int(ctx // 100000), 4)
            bucket[role][(b, "n")] += 1
            bucket[role][(b, "$")] += cost(r)
            calls_per_request[role][min(per_message.get(r["id"], 0), 3)] += 1
    grand = Counter()
    out["spend"] = {}
    for role in ROLES:
        c = split[role]
        if not c["n"]:
            continue
        total_cost = c["out"] + c["read"] + c["write"] + c["in"]
        for key, value in c.items():
            grand[key] += value
        out["spend"][role] = {k: round(v, 1) for k, v in c.items()}
        print(
            f"  {role:9s} requests={c['n']:6d} ${total_cost:6.0f}: output ${c['out']:5.0f} (thinking ${c['think']:4.0f}), "
            f"cache reads ${c['read']:5.0f}, cache writes ${c['write']:5.0f}; ${total_cost / c['n']:.3f} a request; "
            f"context mean {statistics.mean(context[role]) / 1e3:.0f}k, first request median {statistics.median(first[role]) / 1e3:.0f}k; "
            f"one tool call in {calls_per_request[role][1] / c['n']:.0%} of requests"
        )
    total_cost = grand["out"] + grand["read"] + grand["write"] + grand["in"]
    print(
        f"  all       requests={grand['n']:6d} ${total_cost:6.0f}: output {grand['out'] / total_cost:.0%} "
        f"(thinking {grand['think'] / total_cost:.0%}, {grand['think'] / grand['out']:.0%} of output), "
        f"reads {grand['read'] / total_cost:.0%}, writes {grand['write'] / total_cost:.0%}"
    )
    out["spend"]["all"] = {k: round(v, 1) for k, v in grand.items()}
    print("  spend by context size at the request:")
    for role in ("worker", "reviewer", "main"):
        role_total = sum(v for (b, k), v in bucket[role].items() if k == "$")
        parts = []
        for b in range(5):
            n = bucket[role][(b, "n")]
            if n:
                label = f"{b * 100}-{b * 100 + 100}k" if b < 4 else "400k+"
                share = n / sum(v for (_, k), v in bucket[role].items() if k == "n")
                parts.append(f"{label}: {share:.0%} of requests, {bucket[role][(b, '$')] / role_total:.0%} of spend, ${bucket[role][(b, '$')] / n:.3f} each")
        print(f"    {role:9s} " + "; ".join(parts))

    print("\n== 4. Full-context cache rewrites, by what the agent was waiting on ==")
    by_agent = defaultdict(list)
    for span in spans:
        by_agent[span["a"]].append(span)
    cause = defaultdict(Counter)
    rewrites = Counter()
    for agent in agents.values():
        role = by_key[agent["key"]]["role"]
        effort = by_key[agent["key"]]["effort"]
        mine = sorted(by_agent[agent["key"]], key=lambda s: s["s"])
        prev = None
        for r in agent["requests"]:
            if r["synthetic"] or r.get("model") != model or not r["t_first"]:
                continue
            ctx = r["in"] + r["cr"] + r["cw"]
            if prev is not None and ctx > 60000 and r["cw"] > 0.5 * ctx:
                low, high = prev, r["t_first"]
                best, longest = None, 0.0
                for span in mine:
                    if span["e"] <= low or span["s"] >= high or span["st"] == "model":
                        continue
                    d = min(span["e"], high) - max(span["s"], low)
                    if d > longest:
                        longest = d
                        if span["st"] == "tool":
                            cls = span.get("cls")
                            if cls == "agent":
                                best = "a foreground reviewer"
                            elif cls in ("sleep-wait", "Monitor"):
                                best = "a background job"
                            else:
                                best = "a check or script over 5 min"
                        elif span["st"] == "idle":
                            best = {"coordinator": "the orchestrator's next message", "human": "the user"}.get(span.get("wake"), "a background task or subagent")
                        elif span["st"] == "stall":
                            best = "an outage"
                        else:
                            best = "compaction"
                if high - low <= 290:
                    best = "nothing (under 5 min; the prefix changed)"
                dollars = (r["cw1h"] * prices["cw1h"] if r["cw1h"] else r["cw"] * prices["cw5"]) / 1e6
                cause[role][(best or "a long model turn", "n")] += 1
                cause[role][(best or "a long model turn", "$")] += dollars
                rewrites[(effort, role)] += 1
            prev = r["t_last"] or r["t_first"]
    out["rewrites"] = {}
    for role in ("worker", "main", "reviewer"):
        names = sorted({k for k, _ in cause[role]}, key=lambda k: -cause[role][(k, "$")])
        print(f"  {role}: {sum(cause[role][(k, 'n')] for k in names)} rewrites, ${sum(cause[role][(k, '$')] for k in names):.0f}")
        out["rewrites"][role] = {k: [cause[role][(k, "n")], round(cause[role][(k, "$")])] for k in names}
        for name in names:
            print(f"      waiting on {name:44s} n={cause[role][(name, 'n')]:4d} ${cause[role][(name, '$')]:5.0f}")

    print("\n== 5. Reviews ==")
    for effort in EFFORTS.values():
        mine = [r for r in rows if r["effort"] == effort and r["role"] == "reviewer"]
        if not mine:
            continue
        minutes = [(r["states"].get("model", 0) + r["states"].get("tool", 0)) / 60 for r in mine]
        dollars = [r["tokens"]["cost"] for r in mine]
        effort_cost = sum(r["tokens"]["cost"] for r in rows if r["effort"] == effort)
        print(
            f"  {effort:24s} reviews={len(mine):3d} minutes median={statistics.median(minutes):4.1f} p90={quantile(minutes, 0.9):4.1f} "
            f"${statistics.median(dollars):.2f} each, ${sum(dollars):5.0f} in all ({sum(dollars) / effort_cost:.0%} of the effort); "
            f"requests median={statistics.median(r['tokens']['n'] for r in mine):.0f}, peak context median={statistics.median(r['peak_ctx'] for r in mine) / 1e3:.0f}k"
        )

    print("\n== 6. Checks ==")
    checks = defaultdict(Counter)
    mutants = defaultdict(Counter)
    root_lint_alone = []
    for agent in agents.values():
        _, _, waited = attribute(agent)
        for call in agent["tools"]:
            if call["name"] != "Bash":
                continue
            tags = steps(call.get("cmd")) & {"lint", "typecheck", "test", "coverage", "verify", "layout", "build", "mutation", "format"}
            if not tags:
                continue
            result = call.get("res") or ""
            failed = bool(call.get("err")) or bool(
                re.search(r"(\bFAIL\b|✖ \d+ problem|error TS\d+|Code style issues found|Test Files\s+\d+ failed|Tests\s+\d+ failed|ERROR: Coverage|does not meet|threshold)", result)
            )
            if tags == {"lint"} and ROOT_LINT.search(HEREDOC.sub(" ", call.get("cmd") or "")) and scope(call.get("cmd")) != "workspace":
                root_lint_alone.append(waited.get(call["id"], 0))
            if "mutation" in tags:
                mutants[by_key[agent["key"]]["effort"]]["n"] += 1
                mutants[by_key[agent["key"]]["effort"]]["s"] += waited.get(call["id"], 0) / len(tags)
            for tag in tags:
                checks[tag]["n"] += 1
                checks[tag]["s"] += waited.get(call["id"], 0) / len(tags)
                checks[tag]["failed"] += failed
                checks[tag]["failed_s"] += waited.get(call["id"], 0) / len(tags) if failed else 0
    out["checks"] = {}
    for tag, c in sorted(checks.items(), key=lambda kv: -kv[1]["s"]):
        out["checks"][tag] = {"runs": c["n"], "hours": round(c["s"] / 3600, 1), "failed": c["failed"], "failed_hours": round(c["failed_s"] / 3600, 1)}
        print(f"  {tag:10s} runs={c['n']:5d} hours={c['s'] / 3600:5.1f} failed={c['failed'] / c['n']:4.0%}, {c['failed_s'] / 3600:4.1f} h in the failed runs")
    print("  mutation runs by effort: " + ", ".join(f"{effort} {c['n']} runs, {c['s'] / 3600:.1f} h" for effort, c in sorted(mutants.items(), key=lambda kv: -kv[1]["s"])))
    print(f"  the root's lint as a command of its own: {len(root_lint_alone)} runs, median {statistics.median(root_lint_alone):.0f} s, {sum(root_lint_alone) / 3600:.1f} h")
    print(f"  failed runs of lint, test and typecheck together: {sum(checks[t]['failed_s'] for t in ('lint', 'test', 'typecheck')) / 3600:.1f} h")

    print("\n== 7. A worker's commit loop ==")
    review_cost = review_costs(rows)
    out["commit_loop"] = {}
    for effort in EFFORTS.values():
        workers = [r for r in rows if r["effort"] == effort and r["role"] == "worker"]
        commits = fixups = reviews = background_reviews = root_lints = check_runs = 0
        for r in workers:
            for call in agents[r["key"]]["tools"]:
                if call["name"] == "Bash":
                    text = HEREDOC.sub(" ", call.get("cmd") or "")
                    commits += commits_in(call)
                    fixups += commits_in(call, FIXUP)
                    tags = steps(call.get("cmd"))
                    if tags & set(CHECKS):
                        check_runs += 1
                        if ROOT_LINT.search(text) and scope(call.get("cmd")) != "workspace":
                            root_lints += 1
                elif call["name"] == "Agent":
                    reviews += 1
                    background_reviews += bool(call.get("bg"))
        if not commits:
            continue
        c = Counter(hours.get((effort, "worker"), {}))
        # What a worker lived through for its commits: all but the waits for
        # the orchestrator and the outages.
        elapsed = sum(v for k, v in c.items() if k not in ("idle: waiting for the orchestrator", "outage"))
        dollars = sum(r["tokens"]["cost"] for r in workers)
        with_reviews = dollars + sum(review_cost[r["key"]] for r in workers)
        loop = {
            "workers": len(workers), "commits": commits, "fixups": fixups, "reviews": reviews, "reviews_in_background": background_reviews,
            "root_lints": root_lints, "check_runs": check_runs,
            "model_min": round(c["model"] * 60 / commits, 1), "checks_min": round(c["checks"] * 60 / commits, 1),
            "review_wait_min": round(c["wait: reviewer"] * 60 / commits, 1),
            "background_wait_min": round(c["wait: background job"] * 60 / commits, 1),
            "other_tools_min": round(c["other tools"] * 60 / commits, 1),
            "elapsed_min": round(elapsed * 60 / commits, 1), "rewrites_per_commit": round(rewrites[(effort, "worker")] / commits, 2),
            "worker_cost": round(dollars / commits, 1), "with_reviews_cost": round(with_reviews / commits, 1),
        }
        out["commit_loop"][effort] = loop
        print(f"  {effort:24s} {loop}")

    json.dump(out, open(os.path.join(DATA, "summary.json"), "w"), indent=1)


if __name__ == "__main__":
    main()
