#!/usr/bin/env python3
"""Prints the audit's narrower measurements, each from the same tables.

Lock waits, characters to a token, a worker's ramp-up, cost by package size,
the API's speed under load, commits against busy workers, what reviewers read
and found and what their authors then changed, and a few counts the report
quotes. Run `extract.py`, `build.py` and `profile.py` first.
"""

import bisect
import json
import os
import re
import statistics
import sys
from collections import Counter, defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import CHARS_PER_TOKEN, classify, commits_in, cost, EFFORTS, load, median, OUT, quantile, review_costs, steps, WHOLE

SCRATCH = re.compile(r"worklog|/docs/|scratchpad|/tmp/")
DOCS = re.compile(r"worklog|/docs/|scratchpad|/tmp/|\.md\b")
ITEM = re.compile(
    r"^\s{0,3}(?:#{1,4}\s*)?(?:\*\*)?(\d{1,2})[.)]\s+(.*?)(?=^\s{0,3}(?:#{1,4}\s*)?(?:\*\*)?\d{1,2}[.)]\s|\Z)",
    re.M | re.S,
)
POINTER = re.compile(r"\b(\d+|no|zero)\s+findings?\b", re.I)
# A finding's kind is the first of these its opening words match, so the
# shares are rough: a keyword sorts it, not a reading.
KINDS = [
    ("behaviour bug", re.compile(r"\b(bug|incorrect|breaks?\b|broken|crash|throws|regress|off[- ]by|race|leaks?\b|never (?:fires|runs|clears|resets|happens|shown|read)|double[- ]counts?|loses|lost|can no longer|no longer (?:works|shows|fires)|behaviou?r chang|silently|NaN|misses|skips|stuck|hang|flicker|overflow|clipp?ed|wrong)\b", re.I)),
    ("spec gap or weak spec", re.compile(r"\b(spec|test|assert|covered|coverage|untested|mutat|would (?:still )?pass)\b", re.I)),
    ("docs, comments, logs", re.compile(r"\b(doc|docs|comment|AGENTS\.md|SKILL|skill|work ?log|log says|log entry|stale|README|plan says|wording|typo|describes?|says)\b", re.I)),
    ("structure, naming, duplication", re.compile(r"\b(duplicat|repeat|name[sd]?|naming|rename|layer|structure|extract|lift|shared|helper|magic|constant|dead code|unused|simplif|style|idiom|readonly|type|cast|export)\b", re.I)),
]


def context(req):
    """Returns the tokens a request sent: its whole context."""
    return req["in"] + req["cr"] + req["cw"]


def tokens(chars):
    return chars / CHARS_PER_TOKEN


def edit_target(call):
    """Returns the file or command a call changed files with, or None where it changed none."""
    if call["name"] in ("Edit", "Write"):
        return call.get("file") or ""
    if call["name"] == "Bash" and "edit-script" in steps(call.get("cmd")):
        return call.get("cmd") or ""
    return None


def first_source_edit(agent):
    """Returns when an agent first changed a file that is not a log or a scratch file."""
    for call in sorted(agent["tools"], key=lambda c: c["t_call"] or 0):
        target = edit_target(call)
        if target is not None and not SCRATCH.search(target):
            return call["t_call"]
    return None


def reading_kind(call):
    text = call.get("cmd") or call.get("file") or call.get("input") or ""
    if "AGENTS.md" in text:
        return "AGENTS.md files"
    if re.search(r"SKILL\.md|\.agents/skills|\.claude/skills", text):
        return "skills"
    if "worklog" in text:
        return "work logs"
    if re.search(r"implementation-plan|plan\.md|docs/", text):
        return "plans and design docs"
    if re.search(r"git\s+(-C\s+\S+\s+)?(diff|show|log|status)", text):
        return "git diff, show and log"
    if re.search(r"\.(ts|scss|html|json|mjs|js|svg|css)\b", text):
        return "source files"
    return "other"


def subject_of(desc):
    """Names what a review was of, by its description."""
    desc = (desc or "").lower()
    if re.search(r"\blog\b|worklog|work log", desc):
        return "a work log"
    if re.search(r"doc|plan|agents|skill|archive|as built|report|audit", desc):
        return "docs, plans, skills"
    return "code"


def loaded_for(path):
    """Names the AGENTS.md a file the harness loaded stands for, as a command would name it."""
    parts = (path or "").split("/")
    if len(parts) < 2 or parts[-1] not in ("AGENTS.md", "CLAUDE.md"):
        return None
    if parts[-2] == ".agents" or (parts[-1] == "CLAUDE.md" and "frontend" not in parts):
        # The root's CLAUDE.md imports `.agents/AGENTS.md`.
        return ".agents/AGENTS.md"
    return parts[-2] + "/AGENTS.md"


def after_review(done, author):
    """Says what a review's author changed between its report and the next commit.

    Returns "source", "docs or logs" or "nothing", or None where the author's
    log does not reach back to the review. It says the most for a review the
    author waited on: one that ran in the background reports while the author
    is already on the next change.
    """
    calls = sorted((c for c in author["tools"] if c["t_call"]), key=lambda c: c["t_call"])
    if not calls or calls[0]["t_call"] > done or calls[-1]["t_call"] < done:
        return None
    changed = set()
    for call in calls:
        if call["t_call"] < done:
            continue
        if call["t_call"] - done > 3 * 3600:
            break
        target = edit_target(call)
        if target is not None:
            changed.add("docs or logs" if DOCS.search(target) else "source")
        if commits_in(call):
            break
    return "source" if "source" in changed else ("docs or logs" if changed else "nothing")


def chars_per_token(agents):
    """Measures characters to a token in large tool results, by the context's growth at the next request."""
    ratios = []
    for agent in agents:
        reqs = [r for r in agent["requests"] if not r["synthetic"] and r["t_first"]]
        calls = defaultdict(list)
        for call in agent["tools"]:
            calls[call["req"]].append(call)
        # Anything else that entered the context between the two requests would be counted as the result.
        marks = [m["t"] for m in agent.get("memory", [])] + [p["t"] for p in agent["prompts"]] + [c["t"] for c in agent["compactions"]]
        for one, two in zip(reqs, reqs[1:]):
            mine = calls.get(one["id"], [])
            if len(mine) != 1 or (mine[0].get("res_chars") or 0) < 20000:
                continue
            if any(m and one["t_first"] <= m <= two["t_first"] for m in marks):
                continue
            grew = context(two) - context(one) - one["out"]
            if grew > 2000:
                ratios.append(mine[0]["res_chars"] / grew)
    return ratios


def main():
    rows = json.load(open(os.path.join(OUT, "agents.json")))
    spans = json.load(open(os.path.join(OUT, "spans.json")))
    by_key = {r["key"]: r for r in rows}
    agents = {a["key"]: a for a in load() if a["session"] in EFFORTS}
    role_of = {key: by_key[key]["role"] for key in agents}

    print("== Waits on the root checks' lock ==")
    start, end = {}, {}
    locks = defaultdict(set)
    for span in spans:
        if span["st"] == "tool" and span.get("lock") and span["lock"].endswith(".lock") and by_key[span["a"]]["effort"]:
            start[span["id"]] = min(start.get(span["id"], 1e18), span["s"])
            end[span["id"]] = max(end.get(span["id"], 0), span["e"])
            locks[span["lock"]].add(span["id"])
    for lock, ids in locks.items():
        if len(ids) < 10:
            continue
        waits, runs, free_at = [], [], 0
        for ident in sorted(ids, key=lambda i: end[i]):
            began = max(start[ident], free_at if free_at < end[ident] else start[ident])
            waits.append(began - start[ident])
            runs.append(end[ident] - began)
            free_at = end[ident]
        print(f"  {lock}: {len(ids)} runs, waited {sum(waits) / 3600:.2f} h in all (p90 {quantile(waits, 0.9):.0f} s, most {max(waits):.0f} s), a run's median {statistics.median(runs):.0f} s")

    print("\n== Characters to a token, in tool results of 20,000 characters or more ==")
    ratios = chars_per_token(agents.values())
    print(f"  results={len(ratios)} median={median(ratios):.2f} (a quarter under {quantile(ratios, 0.25):.2f}, a quarter over {quantile(ratios, 0.75):.2f}); lib.py uses {CHARS_PER_TOKEN}")

    print("\n== A worker's ramp-up: from its start to its first source edit (whole logs only) ==")
    for effort in EFFORTS.values():
        found = []
        reading = Counter()
        for agent in agents.values():
            r = by_key[agent["key"]]
            reqs = [q for q in agent["requests"] if not q["synthetic"]]
            if r["effort"] != effort or r["role"] != "worker" or not reqs:
                continue
            if context(reqs[0]) > 150000:
                # The log starts after a compaction, so its start is not the worker's.
                continue
            edit = first_source_edit(agent)
            if not edit:
                continue
            before = [q for q in reqs if q["t_first"] and q["t_first"] < edit]
            results = 0
            for call in agent["tools"]:
                if call["t_call"] and call["t_call"] < edit:
                    reading[reading_kind(call)] += call.get("res_chars") or 0
                    results += call.get("res_chars") or 0
            found.append(
                {
                    "seconds": edit - agent["t0"], "requests": len(before), "cost": sum(cost(q) for q in before),
                    "context": max((context(q) for q in before), default=0), "start": context(reqs[0]),
                    "results": tokens(results), "loaded": tokens(sum(m["chars"] for m in agent.get("memory", []) if m["t"] and m["t"] < edit)),
                    "wrote": sum(q["out"] for q in before),
                }
            )
        if len(found) < 5:
            continue
        mid = {key: statistics.median(f[key] for f in found) for key in found[0]}
        print(
            f"  {effort:28s} workers={len(found):2d} minutes={mid['seconds'] / 60:4.1f} requests={mid['requests']:3.0f} "
            f"cost=${mid['cost']:.2f} context at the first edit={mid['context'] / 1e3:.0f}k"
        )
        print(
            f"      of that context, a worker's median: {mid['start'] / 1e3:.0f}k at its first request, {mid['results'] / 1e3:.0f}k of tool results, "
            f"{mid['loaded'] / 1e3:.0f}k of instruction files the harness loaded, {mid['wrote'] / 1e3:.0f}k of its own output"
        )
        total = sum(reading.values()) or 1
        print("      the tool results: " + ", ".join(f"{k} {v / total:.0%}" for k, v in reading.most_common(6)))

    print("\n== Cost and time a commit, by how many commits the worker made ==")
    review_cost = review_costs(rows)
    for effort in (e for e in WHOLE if e in EFFORTS.values()):
        sized = []
        for agent in agents.values():
            r = by_key[agent["key"]]
            if r["effort"] != effort or r["role"] != "worker":
                continue
            commits = sum(commits_in(call) for call in agent["tools"])
            if commits:
                busy = r["states"].get("model", 0) + r["states"].get("tool", 0)
                sized.append((commits, r["tokens"]["cost"] + review_cost[r["key"]], busy, r["n_compact"]))
        print(" ", effort)
        for label, low, high in (("1-2", 1, 2), ("3-4", 3, 4), ("5-9", 5, 9), ("10+", 10, 999)):
            group = [s for s in sized if low <= s[0] <= high]
            if group:
                commits = sum(s[0] for s in group)
                print(
                    f"      {label:4s} commits: workers={len(group):2d} ${sum(s[1] for s in group) / commits:5.1f} a commit, "
                    f"{sum(s[2] for s in group) / 60 / commits:5.1f} busy minutes a commit, {sum(s[3] for s in group) / len(group):.1f} compactions a worker"
                )
        workers = [r for r in rows if r["effort"] == effort and r["role"] == "worker"]
        print(f"      workers that compacted at least once: {sum(1 for r in workers if r['n_compact'])} of {len(workers)}")

    print("\n== The API's speed against the requests in flight (every session on the machine) ==")
    timed = []
    for agent in load():
        calls = {c["id"]: c for c in agent["tools"]}
        reqs = {q["id"]: q for q in agent["requests"]}
        seen = set()
        prev = None
        for t, kind, ref in sorted((e for e in agent["timeline"] if e[0] is not None), key=lambda e: e[0]):
            if kind in ("text", "think", "tool_use"):
                mid = ref if kind != "tool_use" else calls.get(ref, {}).get("req")
                if mid in reqs and mid not in seen:
                    seen.add(mid)
                    q = reqs[mid]
                    if prev is not None and q["t_last"] and not q["synthetic"] and 0.3 < q["t_last"] - prev < 1500:
                        timed.append((prev, q["t_last"], q["out"]))
            prev = t
    flights = sorted((t[0], t[1]) for t in timed)
    starts = [f[0] for f in flights]
    levels = defaultdict(lambda: [0, 0.0, 0])
    for low, high, out_tokens in timed:
        overlap = 0.0
        index = bisect.bisect_left(starts, low - 1600)
        while index < len(flights) and flights[index][0] < high:
            if flights[index][1] > low:
                overlap += min(flights[index][1], high) - max(flights[index][0], low)
            index += 1
        others = min(5, int(round(overlap / (high - low) - 1.0)))
        levels[others][0] += out_tokens
        levels[others][1] += high - low
        levels[others][2] += 1
    seconds = sum(v[1] for v in levels.values())
    for others in sorted(levels):
        out_tokens, spent, count = levels[others]
        print(f"  {others}{'+' if others == 5 else ' '} other requests: {count:6d} requests, {out_tokens / spent:5.1f} output tokens a second, {spent / seconds:4.0%} of the model's seconds")
    # A request's seconds against its output tokens, as a straight line: the
    # slope is the speed of writing, and what is left at no output is what a
    # request costs in time before it writes anything.
    short = [(t[2], t[1] - t[0]) for t in timed if t[1] - t[0] < 600]
    slope, intercept = statistics.linear_regression([x for x, _ in short], [y for _, y in short])
    print(f"  a request's seconds, fitted over {len(short)} requests: {intercept:.1f} s, and its output at {1 / slope:.0f} tokens a second")

    print("\n== Commits against busy workers, in half-hour windows ==")
    profile = json.load(open(os.path.join(OUT, "profile.json")))
    for session, effort in EFFORTS.items():
        if effort not in WHOLE:
            continue
        commits = []
        for agent in agents.values():
            if agent["session"] == session and role_of[agent["key"]] == "worker":
                for call in agent["tools"]:
                    commits += [call["t_call"]] * commits_in(call)
        if effort not in profile:
            continue
        series = profile[effort]["series"]
        began = profile[effort]["start"]
        windows = []
        for offset in range(0, len(series) - 29, 30):
            part = series[offset : offset + 30]
            if any(p[4] for p in part) and not sum(p[0] for p in part):
                continue
            low = began + offset * 60
            windows.append((sum(p[0] for p in part) / 30, sum(1 for t in commits if low <= t < low + 1800)))
        print(f"  {effort}: {len(commits)} commits")
        for label, low, high in (("1-2", 1, 2), ("2-3", 2, 3), ("3-4", 3, 4), ("4-5", 4, 5), ("5+", 5, 99)):
            group = [w for w in windows if low <= w[0] < high]
            if group:
                worker_hours = sum(w[0] for w in group) * 0.5
                made = sum(w[1] for w in group)
                print(f"      {label:4s} busy: {len(group):2d} windows, {made / (len(group) * 0.5):4.1f} commits an hour, {made / worker_hours:4.2f} a busy worker-hour")

    print("\n== What reviewers read, and what the harness loaded for them ==")
    read = Counter()
    reviews = []
    by_command = Counter()
    for agent in agents.values():
        if role_of[agent["key"]] != "reviewer":
            continue
        chars = 0
        named = ""
        for call in agent["tools"]:
            size = call.get("res_chars") or 0
            read[reading_kind(call)] += size
            chars += size
            if call["name"] in ("Bash", "Read"):
                named += " " + (call.get("cmd") or call.get("file") or "")
        loaded = {loaded_for(m["path"]) for m in agent.get("memory", [])} - {None}
        reqs = [q for q in agent["requests"] if not q["synthetic"]]
        reviews.append(
            {
                "calls": len(agent["tools"]), "results": tokens(chars), "loaded": tokens(sum(m["chars"] for m in agent.get("memory", []))),
                "start": context(reqs[0]) if reqs else 0, "wrote": sum(q["out"] for q in reqs), "peak": by_key[agent["key"]]["peak_ctx"],
                "any loaded": bool(loaded), "twice": any(re.search(r"(?<![\w-])" + re.escape(name), named) for name in loaded),
            }
        )
        by_command[".agents/AGENTS.md"] += bool(re.search(r"\.agents/AGENTS\.md", named))
        by_command["frontend/AGENTS.md"] += bool(re.search(r"(?<![\w/-])frontend/AGENTS\.md|/fuzzley-games/frontend/AGENTS\.md|\b[\w-]+/frontend/AGENTS\.md", named))
        by_command["any AGENTS.md"] += "AGENTS.md" in named
    count = len(reviews)
    mid = {key: median(r[key] for r in reviews) for key in ("calls", "results", "loaded", "start", "wrote", "peak")}
    print(f"  reviews={count}; a review's median: {mid['calls']:.0f} tool calls, {mid['results'] / 1e3:.0f}k tokens of results")
    total = sum(read.values()) or 1
    print("  the results by what was read: " + ", ".join(f"{k} {v / total:.0%}" for k, v in read.most_common()))
    print(
        f"  a review's median context: {mid['start'] / 1e3:.0f}k at its first request, {mid['peak'] / 1e3:.0f}k at its largest; "
        f"its own output {mid['wrote'] / 1e3:.0f}k; instruction files the harness loaded: mean {sum(r['loaded'] for r in reviews) / max(1, count) / 1e3:.0f}k"
    )
    print("  read by a command or the Read tool: " + ", ".join(f"{name} by {n / max(1, count):.0%}" for name, n in by_command.items()))
    held = [r for r in reviews if r["any loaded"]]
    print(f"  the harness loaded an AGENTS.md for {len(held)} of {count}; {sum(1 for r in held if r['twice'])} of those also read one of the same by command")

    print("\n== What reviewers found ==")
    found = Counter()
    top = Counter()
    counts = []
    not_lists = pointers = 0
    for agent in agents.values():
        r = by_key[agent["key"]]
        if r["role"] != "reviewer":
            continue
        report = next((c.get("msg") or "" for c in agent["tools"] if c["name"] == "SubagentHandback"), None)
        if report is None:
            continue
        if r["effort"] == "shared-lib":
            # Its reviewers wrote their findings to a file and handed back a
            # line that says how many there were.
            match = POINTER.search(report)
            if match:
                pointers += 1
                counts.append(int(match.group(1)) if match.group(1).isdigit() else 0)
            continue
        expected, items = 1, []
        for number, body in ITEM.findall(report):
            if int(number) == expected:
                items.append(body)
                expected += 1
        if not items:
            not_lists += 1
            continue
        counts.append(len(items))
        for index, body in enumerate(items):
            kind = next((name for name, pattern in KINDS if pattern.search(body[:260])), "other")
            found[kind] += 1
            if index == 0:
                top[kind] += 1
    everything = sum(found.values()) or 1
    print(
        f"  reports with a count of findings={len(counts)} ({pointers} of them the shared library's, counted from its hand-back line): "
        f"a review's median={median(counts):.0f}, none in {sum(1 for c in counts if c == 0)}; {not_lists} more reports were not a list of findings"
    )
    for kind, n in found.most_common():
        print(f"      {kind:32s} {n / everything:4.0%} of findings; the first finding in {top[kind] / max(1, sum(top.values())):4.0%} of reviews")

    print("\n== What a worker changed between its review's report and its next commit ==")
    # Only a review its author started says anything here: where the
    # orchestrator ran the review, the edits that follow are not the author's.
    outcome = defaultdict(Counter)
    for r in rows:
        if r["effort"] and r["role"] == "reviewer" and role_of.get(r["parent"]) == "worker" and r["t1"] and subject_of(r["desc"]) == "code":
            author = agents[r["parent"]]
            what = after_review(r["t1"], author)
            started = next((c for c in author["tools"] if c["id"] == agents[r["key"]]["meta"].get("toolUseId")), None)
            if what and started:
                outcome[(r["effort"], "in the background" if started.get("bg") else "waited on")][what] += 1
    for (effort, how), c in sorted(outcome.items()):
        known = sum(c.values())
        if known >= 10:
            print(f"  {effort:24s} reviews of code {how:17s} n={known:3d}: source {c['source'] / known:4.0%}, docs or logs only {c['docs or logs'] / known:4.0%}, nothing {c['nothing'] / known:4.0%}")

    print("\n== Reviews by subject ==")
    subjects = Counter()
    dollars = Counter()
    for r in rows:
        if r["effort"] and r["role"] == "reviewer":
            subjects[subject_of(r["desc"])] += 1
            dollars[subject_of(r["desc"])] += r["tokens"]["cost"]
    print("  " + ", ".join(f"{k}: {v} reviews, ${dollars[k]:.0f}" for k, v in subjects.most_common()))

    print("\n== A few counts the report quotes ==")
    small = Counter()
    touched = Counter()
    loaded = defaultdict(list)
    notices = defaultdict(list)
    listed = []
    for agent in agents.values():
        role = role_of[agent["key"]]
        loaded[role].append(tokens(sum(m["chars"] for m in agent.get("memory", []))))
        notices[role].append(tokens(sum(v for k, v in (agent.get("attached") or {}).items() if not k.startswith("skills_listed"))))
        if agent["is_sub"] and (agent.get("attached") or {}).get("skills_listed"):
            listed.append((agent["attached"]["skills_listed"], agent["attached"]["skills_listed_chars"]))
        for call in agent["tools"]:
            touched[(role, "all")] += 1
            if re.search(r"worklog|work-log", call.get("cmd") or call.get("file") or ""):
                touched[(role, "log")] += 1
            if call["name"] == "Read" or (call["name"] == "Bash" and classify(call.get("cmd")) == "search-read"):
                small[(role, "all")] += 1
                small[(role, "small")] += (call.get("res_chars") or 0) < 1500
    for role in ("worker", "reviewer"):
        print(f"  {role}: {small[(role, 'small')] / max(1, small[(role, 'all')]):.0%} of its {small[(role, 'all')]} reads and searches returned under 1,500 characters")
    for role in ("worker", "reviewer", "main"):
        print(f"  {role}: {touched[(role, 'log')]} of its {touched[(role, 'all')]} tool calls touched a work log ({touched[(role, 'log')] / max(1, touched[(role, 'all')]):.1%})")
    for role in ("worker", "reviewer"):
        print(f"  {role}: instruction files the harness loaded, median {median(loaded[role]) / 1e3:.0f}k tokens, none for {sum(1 for v in loaded[role] if not v)} of {len(loaded[role])}")
    for role in ("worker", "reviewer"):
        print(f"  {role}: the harness's other attachments (lists of skills and tools, files it attached, notices of edits), median {median(notices[role]) / 1e3:.0f}k tokens")
    print(f"  the skills listed in a subagent's first request: median {median(s[0] for s in listed):.0f} skills, {tokens(median(s[1] for s in listed)) / 1e3:.1f}k tokens")

    print("\n== A commit's cost with the workers that made none left out ==")
    for effort in EFFORTS.values():
        workers = [r for r in rows if r["effort"] == effort and r["role"] == "worker"]
        made = {r["key"]: sum(commits_in(call) for call in agents[r["key"]]["tools"]) for r in workers}
        commits = sum(made.values())
        idle = [r for r in workers if not made[r["key"]]]
        if not commits or not idle:
            continue
        dollars = sum(r["tokens"]["cost"] for r in workers)
        with_reviews = dollars + sum(review_cost[r["key"]] for r in workers)
        less = sum(r["tokens"]["cost"] for r in idle)
        less_reviews = less + sum(review_cost[r["key"]] for r in idle)
        model = sum(r["states"].get("model", 0) for r in workers) / 60
        less_model = sum(r["states"].get("model", 0) for r in idle) / 60
        print(
            f"  {effort:28s} {len(idle)} of {len(workers)} workers made no commit: ${less:.0f} of the workers' ${dollars:.0f}, "
            f"{sum(r['states'].get('model', 0) + r['states'].get('tool', 0) for r in idle) / 60:.0f} busy minutes"
        )
        print(
            f"      a commit with them: ${dollars / commits:.2f}, ${with_reviews / commits:.2f} with reviewers', {model / commits:.1f} min with the model; "
            f"without: ${(dollars - less) / commits:.2f}, ${(with_reviews - less_reviews) / commits:.2f}, {(model - less_model) / commits:.1f} min"
        )
        print("      " + "; ".join(f"{(r['desc'] or '?')[:48]} ({(r['model'] or '?').replace('claude-', '')}, ${r['tokens']['cost']:.0f})" for r in idle[:6]))

    print("\n== Models, effort levels and the most workers busy at once ==")
    for effort in EFFORTS.values():
        kinds = Counter()
        for agent in agents.values():
            r = by_key[agent["key"]]
            if r["effort"] == effort:
                level = max(agent["efforts"], key=agent["efforts"].get) if agent["efforts"] else "no level logged"
                kinds[(r["role"], (r["model"] or "?").replace("claude-", ""), level)] += 1
        most = max((p[0] for p in profile.get(effort, {}).get("series", [])), default=0)
        print(f"  {effort}: at most {most} workers busy in one minute")
        print("      " + ", ".join(f"{n} {role} on {model} at {level}" for (role, model, level), n in sorted(kinds.items())))


if __name__ == "__main__":
    main()
