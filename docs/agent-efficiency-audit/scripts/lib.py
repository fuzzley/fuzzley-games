"""Shared loading, time attribution and command classing for the audit."""

import glob
import json
import os
import re
from collections import defaultdict
from datetime import datetime, timezone

# The extracted logs are large, so they live outside the repository, in the
# folder AUDIT_DATA names. Every script reads and writes there.
DATA = os.environ.get("AUDIT_DATA")
if not DATA:
    raise SystemExit("Set AUDIT_DATA to the folder that holds the extracted logs, as the report's last section shows.")

# Characters to a token in what a tool returns here: the median over the
# results of 20,000 characters or more, by how far the context grew at the
# next request. `extras.py` prints the measurement.
CHARS_PER_TOKEN = 2.5

# List prices by model family in November 2026, dollars per million tokens:
# input, output, a cache read, and a cache write kept 5 minutes or 1 hour.
PRICE = {
    "opus": {"in": 4.0, "out": 20.0, "cr": 0.20, "cw5": 5.0, "cw1h": 8.0},
    "sonnet": {"in": 2.0, "out": 10.0, "cr": 0.10, "cw5": 2.5, "cw1h": 4.0},
    "haiku": {"in": 0.1, "out": 0.5, "cr": 0.01, "cw5": 0.125, "cw1h": 0.2},
}

EFFORTS = {
    "6ab6d332-06f3-5f2d-a60b-301b1ecc9edb": "asteroid-breaker-follow-ups",
    "756eb193-bb72-5d5f-95cf-acd37f74cca4": "shared-lib",
    "b774e36f-2f9d-4d89-9c4e-43a7bede3ef6": "brick-fuzz-pop",
    "6d49c55c-8dce-5ff0-9c77-b08854e65b6a": "brick-breaker-uplift",
    "6e92141c-30c3-5c98-a49e-10468213cf24": "ci-and-pipeline-audit",
    "22b692dc-547f-5c4d-951b-ae6a54689b02": "asteroid-breaker-uplift",
    "daf8088a-bf6a-5149-bf38-f894fbae0a3e": "bfp-tune-up",
}


def fmt(t, style="%m-%d %H:%M"):
    return datetime.fromtimestamp(t, timezone.utc).strftime(style) if t else "-"


def load(session_prefix=None):
    agents = []
    for path in glob.glob(os.path.join(DATA, "agents", "*.json")):
        if session_prefix and not os.path.basename(path).startswith(session_prefix):
            continue
        with open(path) as handle:
            agents.append(json.load(handle))
    return agents


def price_of(model):
    """Returns the prices of a model's family, or None where PRICE lists none."""
    return next((price for family, price in PRICE.items() if family in (model or "")), None)


def main_model(agents):
    """Returns the model that served most of the agents' requests."""
    counts = defaultdict(int)
    for agent in agents:
        for req in agent["requests"]:
            if not req["synthetic"]:
                counts[req.get("model")] += 1
    return max(counts, key=counts.get) if counts else None


def cost(req):
    price = price_of(req.get("model"))
    if not price:
        return 0.0
    cw5 = req["cw5"]
    cw1h = req["cw1h"]
    if cw5 + cw1h == 0:
        cw5 = req["cw"]
    return (
        req["in"] * price["in"]
        + req["out"] * price["out"]
        + req["cr"] * price["cr"]
        + cw5 * price["cw5"]
        + cw1h * price["cw1h"]
    ) / 1e6


END_STOPS = ("end_turn", "stop_sequence", "max_tokens", "refusal")


def tool_cap(call):
    """The longest a tool call can run before its wait counts as a stall."""
    if call is None:
        return 900.0
    name = call.get("name")
    if name == "Agent":
        return float("inf")
    if name == "Bash":
        timeout = call.get("timeout")
        return (timeout / 1000.0 if timeout else 120.0) + 90.0
    if name == "Monitor":
        return 3700.0
    return 900.0


def intervals(agent):
    """Splits an agent's wall time into intervals of one state each.

    Each interval is (start, end, state, ref). The states are `model` (waiting
    on the API, thinking and writing included), `tool` (ref is the tool call's
    id), `compact`, `idle` (the turn has ended; ref is what woke it) and
    `stall` (a tool wait past the tool's own timeout: the container or the
    session was down).
    """
    timeline = [e for e in agent["timeline"] if e[0] is not None]
    timeline.sort(key=lambda e: e[0])
    reqs = {r["id"]: r for r in agent["requests"]}
    tools = {c["id"]: c for c in agent["tools"]}
    last_block = {}
    for index, (t, kind, ref) in enumerate(timeline):
        if kind in ("text", "think", "tool_use"):
            mid = ref if kind != "tool_use" else tools.get(ref, {}).get("req")
            last_block[mid] = index
    out = []
    state = "idle"
    pending = {}
    prev_t = None
    prev_kind = None
    for index, (t, kind, ref) in enumerate(timeline):
        if prev_t is not None and t > prev_t:
            if kind == "compact" and state != "tool":
                out.append((prev_t, t, "compact", None))
            elif state == "model":
                if kind.startswith("prompt:") and (prev_kind in ("text", "think", "stop", "att:reminder") or t - prev_t > 300):
                    out.append((prev_t, t, "idle", kind[7:]))
                elif t - prev_t > 1800:
                    out.append((prev_t, t, "stall", "model"))
                else:
                    out.append((prev_t, t, "model", None))
            elif state == "tool":
                tid = ref if (kind == "tool_result" and ref in pending) else next(iter(pending), None)
                call = tools.get(tid)
                cap = tool_cap(call)
                started = call.get("t_call") if call else prev_t
                over = (t - (started or prev_t)) - cap
                if over > 0:
                    cut = max(prev_t, t - over)
                    if cut > prev_t:
                        out.append((prev_t, cut, "tool", tid))
                    out.append((cut, t, "stall", tid))
                else:
                    out.append((prev_t, t, "tool", tid))
            else:
                wake = kind[7:] if kind.startswith("prompt:") else kind
                out.append((prev_t, t, "idle", wake))
        if kind == "tool_use":
            pending[ref] = True
            state = "tool"
        elif kind in ("text", "think"):
            req = reqs.get(ref) or {}
            if last_block.get(ref) == index and req.get("stop") in END_STOPS:
                state = "idle"
            elif pending:
                state = "tool"
            else:
                state = "model"
        elif kind == "tool_result":
            pending.pop(ref, None)
            state = "tool" if pending else "model"
            if not pending and (tools.get(ref) or {}).get("name") == "SubagentHandback":
                # The agent has reported and waits for whoever started it.
                state = "idle"
        elif kind.startswith("prompt:"):
            # A call left without a result died with its session, and the
            # prompt that resumes the agent ends the wait on it.
            for tid in [tid for tid in pending if (tools.get(tid) or {}).get("t_result") is None]:
                del pending[tid]
            if state != "tool" or not pending:
                state = "model"
        elif kind == "compact":
            for tid in [tid for tid in pending if (tools.get(tid) or {}).get("t_result") is None]:
                del pending[tid]
            state = "model"
        elif kind == "stop":
            if not pending:
                state = "idle"
        prev_t = t
        prev_kind = kind
    return out


def attribute(agent):
    """Totals an agent's intervals: (seconds by state, idle gaps, seconds by tool call)."""
    buckets = defaultdict(float)
    idle = []
    tool_time = defaultdict(float)
    for start, end, state, ref in intervals(agent):
        buckets[state] += end - start
        if state == "idle":
            idle.append((start, end, ref))
        elif state == "tool" and ref:
            tool_time[ref] += end - start
    return buckets, idle, tool_time


HEREDOC = re.compile(r"<<-?\s*'?\"?(\w+)'?\"?.*?\n\1\b", re.S)
YARN_RUN = re.compile(
    r"(?:node\s+\S*yarn\.js\"?|\$YJ|\$Y\b|npx\s+(?:-y\s+)?corepack\s+yarn|corepack\s+yarn"
    r"|(?<![\w/.-])y(?![\w/.(=-])|(?<![\w/.-])yarn(?![\w/.-]))\s+"
    r"((?:workspaces?\s+(?:foreach\s+(?:-\S+\s+|--\S+\s+(?:\S+\s+)?)*|\S+\s+))?(?:run\s+)?)([\w:.-]+)"
)
BIN_RUN = re.compile(r"(?:node_modules/\.bin/|\$B/|\$BIN/|npx\s+(?:-y\s+)?)(\w[\w.-]*)")
SCRIPT_TAG = {
    "lint": "lint", "lint:styles": "lint", "eslint": "lint", "stylelint": "lint",
    "skills:check": "lint", "constraints": "lint", "prettier:check": "lint",
    "prettier": "format",
    "typecheck": "typecheck", "tsc": "typecheck", "tsc7": "typecheck", "ngc": "typecheck",
    "test": "test", "vitest": "test", "test:coverage": "coverage",
    "check:layout": "layout", "capture:screenshots": "layout",
    "build": "build", "build:prod": "build",
    "verify": "verify", "verify:full": "verify", "verify:changed": "verify",
    "report:levels": "report-sim", "report:waves": "report-sim", "certify:levels": "report-sim",
    "install": "install", "dedupe": "install", "up": "install",
    "dev": "dev-server", "dev:all": "dev-server", "preview": "dev-server", "site": "dev-server",
}
PRIORITY = [
    "ci-wait", "mutation", "verify", "coverage", "test", "layout", "build", "typecheck", "lint",
    "report-sim", "install", "dev-server", "browser-script", "sleep-wait", "format",
    "git-commit", "git-integrate", "git-read", "gh", "edit-script", "search-read", "script",
    "fs-write", "process",
]
LEAD = re.compile(
    r"^\s*(?:cd\s+\S+\s*(?:&&|;)\s*|[A-Za-z_][A-Za-z0-9_]*=(?:\"[^\"]*\"|'[^']*'|\$\([^)]*\)|\S*)\s*;?\s+"
    r"|y\(\)\s*\{[^}]*\}\s*;?\s*|export\s+\S+\s*(?:&&|;)\s*|set\s+-\S+\s*(?:&&|;)?\s*|time\s+"
    r"|timeout\s+(?:-\S+\s+)*\S+\s+|flock\s+(?:-\S+\s+)*\S+\s+(?:sh\s+-c\s+['\"])?|nice\s+(?:-n\s*\S+\s+)?"
    r"|taskset\s+-c\s+\S+\s+|\(\s*)+"
)


def steps(cmd):
    """Returns the kinds of work a Bash command does."""
    raw = cmd or ""
    has_heredoc = bool(HEREDOC.search(raw))
    text = HEREDOC.sub(" ", raw)
    tags = set()
    for match in YARN_RUN.finditer(text):
        tag = SCRIPT_TAG.get(match.group(2))
        if tag:
            tags.add(tag)
    for match in BIN_RUN.finditer(text):
        tag = SCRIPT_TAG.get(match.group(1))
        if tag:
            tags.add(tag)
    if re.search(r"--coverage\b", text) and ("test" in tags):
        tags.add("coverage")
    if re.search(r"\bvite\s+build\b|\bng\s+build\b|docker\s+build", text):
        tags.add("build")
    if re.search(r"mutat|mutant|\bmuts?\b|/muts?[_/.]", text, re.I) and re.search(r"\b(node|bash|sh|python3?|vitest)\b|yarn", text):
        tags.add("mutation")
    if re.search(r"\bgh\s+run\s+(watch|view|list)|gh\s+pr\s+checks|gh\s+api\s+\S*actions|gh\s+workflow\s+run", text):
        tags.add("ci-wait")
    if re.search(r"node\s+\S*(report|trace|autopilot|bench|sim/run|wave-run|kept-run|rounds)\S*\.(mjs|js|sh)|--seeds\b|rounds\.sh|sitting\.sh", text):
        tags.add("report-sim")
    if re.search(r"look\.mjs|frames\.mjs|google-chrome|--headless|chrome\.ts|sharp\(", text):
        tags.add("browser-script")
    if re.search(r"\buntil\b[^\n]*\bdo\b|\bwhile\b[^\n]*\bdo\b[^\n]*sleep|(^|[;&]\s*)sleep\s+\d|tail\s+-f\b|(^|[;&]\s*)wait(\s|;|$)", text):
        tags.add("sleep-wait")
    if re.search(r"\bgit\s+(-C\s+\S+\s+)?commit\b", text):
        tags.add("git-commit")
    if re.search(r"\bgit\s+(-C\s+\S+\s+)?(rebase|merge|cherry-pick|push|pull|fetch|worktree|branch|checkout|switch|reset|stash|restore|range-diff|tag|am|apply)\b", text):
        tags.add("git-integrate")
    if re.search(r"\bgit\s+(-C\s+\S+\s+)?(diff|log|show|status|blame|ls-files|rev-parse|grep|cat-file|merge-base|rev-list|describe|shortlog|add)\b", text):
        tags.add("git-read")
    if re.search(r"(^|[;&|]\s*)gh\s+", text):
        tags.add("gh")
    body = LEAD.sub("", raw, count=1)
    if has_heredoc and re.match(r"\s*(python3?|node|cat\s*>|tee)\b", body) and re.search(r"open\(|writeFile|write\(|cat\s*>|tee\s", raw):
        tags.add("edit-script")
    elif re.match(r"\s*(python3?|node|bash|sh|zsh|npx|tsx)\b", body):
        tags.add("script")
    if re.search(r"\bsed\s+-i\b|\bperl\s+-(p?i|0?pi)", text):
        tags.add("edit-script")
    if re.match(r"\s*(rg|grep|cat|sed|head|tail|ls|find|wc|awk|jq|nl|tree|stat|file|diff|du|bfs|fd|sort|cut|echo|printf|test|\[|for|md5sum|sha1sum|cmp|comm|xxd|identify|ffprobe)\b", body):
        tags.add("search-read")
    if re.match(r"\s*(mkdir|cp|mv|rm|touch|ln|chmod|tee|truncate)\b", body):
        tags.add("fs-write")
    if re.match(r"\s*(kill|pkill|pgrep|ps|lsof|ss|fuser|chrome-cleanup|nproc|free|uptime|top)\b", body):
        tags.add("process")
    return tags


def classify(cmd):
    """Names a Bash command's class by its heaviest step."""
    tags = steps(cmd)
    for name in PRIORITY:
        if name in tags:
            return name
    return "other"


CHECKS = ("verify", "coverage", "test", "layout", "build", "typecheck", "lint", "mutation")


def scope(cmd, cwd=None):
    """Says whether a check ran for the whole repo or for one workspace."""
    text = HEREDOC.sub(" ", cmd or "")
    if re.search(r"\bworkspace\s+\S+\s", text) or re.search(r"cd\s+\S*/(games|lib)/[\w-]+|cd\s+\S*/frontend/site|cd\s+(games|lib)/[\w-]+", text):
        return "workspace"
    if re.search(r"node_modules/\.bin/|\$B/|vitest\s+run\s+\S|--project\s", text):
        return "files"
    if re.search(r"cd\s+\S*/frontend\b(?!/)", text) or re.search(r"cd\s+frontend\b", text):
        return "root"
    return "unknown"


LOCK = re.compile(r"flock\s+(?:-\S+\s+)*(\S+)")


def lock_file(cmd):
    match = LOCK.search(cmd or "")
    return match.group(1) if match else None


# A commit of its own: not an amend, and not a fixup or a squash, which fold
# into a commit already counted.
COMMIT = re.compile(r"\bgit\s+(?:-C\s+\S+\s+)?commit\b(?![^\n;&|]*(?:--amend|--fixup|--squash|fixup!|squash!))")
FIXUP = re.compile(r"\bgit\s+(?:-C\s+\S+\s+)?commit\b[^\n;&|]*(?:--fixup|--squash|fixup!|squash!)")


def commits_in(call, pattern=COMMIT):
    """Counts the commits a tool call made, in a Bash call that did not fail."""
    if call.get("name") != "Bash" or call.get("err"):
        return 0
    return len(pattern.findall(HEREDOC.sub(" ", call.get("cmd") or "")))


def quantile(values, q):
    values = sorted(values)
    return values[int(q * (len(values) - 1))] if values else 0


def review_costs(rows):
    """Totals what reviewers cost, by the agent that started each."""
    total = defaultdict(float)
    for row in rows:
        if row["role"] == "reviewer" and row["parent"]:
            total[row["parent"]] += row["tokens"]["cost"]
    return total


ROLE_REVIEW = re.compile(r"\b(review|audit|second look|re-review|check the)\b", re.I)


def role_of(is_sub, depth, desc, busy_seconds):
    """Names an agent's part in a build: main, worker, reviewer or helper."""
    if not is_sub:
        return "main"
    if ROLE_REVIEW.search(desc or ""):
        return "reviewer"
    if depth == 1 and busy_seconds >= 900:
        return "worker"
    return "helper"


def hierarchy(agents):
    """Maps each subagent key to its parent key, by the meta file."""
    by_id = {}
    for agent in agents:
        if agent["is_sub"]:
            by_id[(agent["session"], agent["agent_id"])] = agent
    parent = {}
    for agent in agents:
        if not agent["is_sub"]:
            continue
        pid = agent["meta"].get("parentAgentId")
        if pid and (agent["session"], pid) in by_id:
            parent[agent["key"]] = by_id[(agent["session"], pid)]["key"]
        else:
            parent[agent["key"]] = agent["session"] + "__main"
    return parent
