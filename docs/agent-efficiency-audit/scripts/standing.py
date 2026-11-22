#!/usr/bin/env python3
"""Prints how many agents used each standing doc: every `AGENTS.md` and skill of the repository, and what came from outside it.

For an `AGENTS.md`: the agents the harness loaded it for, and those that read
or searched it by a command. For a skill: the agents that loaded it with the
Skill tool, read its `SKILL.md`, searched it, or read one of its reference
files. Then the skills, agent types and connectors from outside the
repository that any agent used. It measures the seven efforts and those run
since, or the ones `AUDIT_EFFORTS` names. Run `extract.py` and `build.py` first.

What it cannot see: a command the extraction cut short is read by its head
and tail alone, a file named only by a shell variable set outside a `for` is
missed, and a file's size is today's except where the harness loaded it.
"""

import json
import os
import posixpath
import re
import statistics
import subprocess
import sys
from collections import Counter, defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import BASELINE, CHARS_PER_TOKEN, EFFORTS, HEREDOC, LATER, LEAD, OUT, load

REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".."))
ROLES = ("worker", "reviewer", "helper", "main")
QUOTED = re.compile(r"'[^']*'|\"[^\"]*\"")
SEGMENT = re.compile(r"&&|\|\||[;\n]")
TOKEN = re.compile(r"[\w./*~$@{},+-]+")
READS = re.compile(r"(cat|nl|less|bat)\b")
PARTS = re.compile(r"(head|tail|sed)\b(?!\s+-i)")
SEARCHES = re.compile(r"(grep|rg|ugrep|awk|ag)\b|git\s+(?:-C\s+\S+\s+)?grep\b")
SHOWS = re.compile(r"git\s+(?:-C\s+\S+\s+)?show\b")
COUNTS = re.compile(r"wc\b")
LOOP = re.compile(r"(for|while)\b")
SKILL_FILE = re.compile(r"(?:^|/)skills/([^/]+)(?:/(.+))?$")
FOR = re.compile(r"\bfor\s+(\w+)\s+in\s+([^;\n]+)")
BRACES = re.compile(r"\{([^{}]*,[^{}]*)\}")
# The ways a file's words reach an agent's context.
HELD = {"loaded", "tool", "read", "part"}


def git(*args):
    """Returns the lines a git command prints, run at the repository's root."""
    return subprocess.run(["git", "-C", REPO, *args], capture_output=True, text=True, check=True).stdout.splitlines()


def repo_docs():
    """Returns the repository's `AGENTS.md` files by path, and its skills by name."""
    files = {}
    for path in git("ls-files", "*AGENTS.md"):
        if "/" in path:  # The root's is a pointer to `.agents/AGENTS.md`.
            files[path] = os.path.getsize(os.path.join(REPO, path))
    skills = {}
    for path in git("ls-files", "*.agents/skills/*/SKILL.md"):
        folder = os.path.dirname(path)
        with open(os.path.join(REPO, path)) as handle:
            text = handle.read()
        described = re.search(r"^description:\s*(.*)$", text, re.M)
        refs = {
            other[len(folder) + 1 :]: os.path.getsize(os.path.join(REPO, other))
            for other in git("ls-files", folder)
            if other != path
        }
        added = git("log", "--diff-filter=A", "--format=%as", "--", path)
        skills[os.path.basename(folder)] = {
            "path": path,
            "bytes": len(text.encode()),
            "description": len(described.group(1)) if described else 0,
            "refs": refs,
            "added": added[-1][5:] if added else "-",
        }
    return files, skills


def fits(name, pattern, ending=False):
    """Says whether a name is the one a shell pattern spells, a `*` staying inside one folder, or with `ending` whether it ends with it."""
    spelt = "".join("[^/]*" if char == "*" else "[^/]" if char == "?" else re.escape(char) for char in pattern)
    return re.fullmatch(("(?:.*/)?" if ending else "") + spelt, name) is not None


def placed(path, files):
    """Names the repository's `AGENTS.md` files a path or a wildcard in a command stands for.

    A path in a worktree counts as the same file in the repository, and one
    cut short (`snake/AGENTS.md`) as each file it ends. A bare `AGENTS.md`
    names none.
    """
    parts = path.split("/")
    for start in range(len(parts) - 1):
        pattern = "/".join(parts[start:])
        whole = [name for name in files if fits(name, pattern)]
        if whole:
            return whole
    if len(parts) < 2 or path.startswith(("/", "~")):
        return []
    return [name for name in files if fits(name, path, ending=True)]


def spelled(token, loops):
    """Returns the paths a shell word stands for, its braces and its loop's variable written out."""
    match = BRACES.search(token)
    if match:
        return [path for choice in match.group(1).split(",") for path in spelled(token[: match.start()] + choice + token[match.end() :], loops)]
    for name, values in loops.items():
        if re.search(r"\$\{?" + name + r"\b\}?", token):
            rest = {other: theirs for other, theirs in loops.items() if other != name}
            return [path for value in values for path in spelled(re.sub(r"\$\{?" + name + r"\b\}?", lambda _: value, token), rest)]
    return [token]


def verb_of(stage, text):
    """Returns the command a pipeline's stage runs, its `cd`, its variables and its loop's opening set aside."""
    verb = LEAD.sub("", stage.strip(), count=1).lstrip("( ")
    if LOOP.match(verb):
        # A loop names its files in one command and reads them in a later one.
        return next(iter(re.findall(r"\b(?:cat|head|tail|sed -n|nl|grep|rg)\b", text)), "")
    return verb


def weakened(how, later):
    """Returns what a printed file comes to once the rest of its pipeline has filtered it."""
    if how not in ("read", "part"):
        return how
    if any(SEARCHES.match(verb) for verb in later):
        return "search"
    if any(COUNTS.match(verb) for verb in later):
        return "named"
    return "part" if any(PARTS.match(verb) for verb in later) else how


def mentions(call):
    """Yields (path, how) for each file a tool call names.

    `how` is `read` for a Read call, a command that prints a file whole, or
    `git show <commit>:<path>`; `part` for one that prints lines of it
    (`sed -n`, `head`, `tail`), or pipes it into one; `search` for a grep, a
    pipe into one, or any of those over a wildcard; `edit` for an Edit or a
    Write; and `named` for the rest.
    """
    name = call["name"]
    if name in ("Read", "Edit", "Write"):
        if call.get("file"):
            yield call["file"], "read" if name == "Read" else "edit"
        return
    if name != "Bash":
        return
    text = HEREDOC.sub(" ", call.get("cmd") or "")
    # A command the extraction cut short has lost its heredoc's end, and what
    # is left of the heredoc is a script's text, not a command.
    text = re.sub(r"<<-?\s*['\"]?\w+.*", " ", text, flags=re.S)
    # A separator inside quotes, as in a grep's pattern, splits no command.
    text = QUOTED.sub(lambda quoted: re.sub(r"[|;&\n]", " ", quoted.group(0)), text)
    loops = {name: [value.strip("\"'") for value in values.split()] for name, values in FOR.findall(text)}
    folder = ""
    for segment in SEGMENT.split(text):
        moved = re.match(r"cd\s+(\S+)\s*$", segment.strip())
        if moved:
            folder = moved.group(1).strip("\"'")
            continue
        stages = segment.split("|")
        verbs = [verb_of(stage, text) for stage in stages]
        for index, (stage, verb) in enumerate(zip(stages, verbs)):
            how = "read" if READS.match(verb) else "part" if PARTS.match(verb) else "search" if SEARCHES.match(verb) else "named"
            for token in TOKEN.findall(stage):
                if "/" not in token and not re.search(r"\.\w+$", token):
                    continue
                # `git show <commit>:<path>` prints the file as that commit had it.
                mine = "read" if SHOWS.match(verb) and ":" + token in stage else how
                for path in spelled(token, loops):
                    if folder and not path.startswith(("/", "~", "$")):
                        path = posixpath.normpath(posixpath.join(folder, path))
                    yield path, weakened("search" if "*" in path and mine in ("read", "part") else mine, verbs[index + 1 :])


def uses_of(agent, files, skills, then):
    """Returns what one agent did with each `AGENTS.md`, each skill and each skill's reference file.

    A Read call that returned under half of the file printed lines of it and
    counts as a `part`. An `AGENTS.md` is measured at the size the harness
    loaded it for this agent, or else at `then`, its median load. A skill's
    file is measured at today's size, so a whole read of one that has since
    doubled counts as a `part`.
    """
    docs = defaultdict(set)
    used = defaultdict(set)
    refs = defaultdict(set)
    own = {}
    for held in agent.get("memory", []):
        if posixpath.basename(held["path"] or "") == "AGENTS.md":
            for name in placed(held["path"], files):
                docs[name].add("loaded")
                own.setdefault(name, held["chars"])
    for call in agent["tools"]:
        if call["name"] == "Skill" and call.get("skill") in skills:
            used[call["skill"]].add("tool")
        got = call.get("res_chars") if call["name"] == "Read" else None

        def seen(how, size):
            return "part" if how == "read" and got is not None and got < size / 2 else how

        for path, how in mentions(call):
            if path.endswith("AGENTS.md"):
                for name in placed(path, files):
                    docs[name].add(seen(how, own.get(name, then[name])))
                continue
            match = SKILL_FILE.search(path)
            if not match or not match.group(2):
                continue
            for skill in (name for name in skills if fits(name, match.group(1))):
                if match.group(2) == "SKILL.md":
                    used[skill].add(seen(how, skills[skill]["bytes"]))
                else:
                    for ref, size in skills[skill]["refs"].items():
                        if fits(ref, match.group(2)):
                            refs[skill, ref].add(seen(how, size))
    return docs, used, refs


def by_role(agents, role_of):
    """Formats a count of agents as workers/reviewers/helpers/main."""
    count = Counter(role_of[agent["key"]] for agent in agents)
    return "/".join(str(count[role]) for role in ROLES)


def main():
    files, skills = repo_docs()
    efforts = EFFORTS if os.environ.get("AUDIT_EFFORTS") else {**BASELINE, **LATER}
    with open(os.path.join(OUT, "agents.json")) as handle:
        role_of = {row["key"]: row["role"] for row in json.load(handle)}
    everyone = load()
    agents = [agent for agent in everyone if agent["session"] in efforts]
    others = [agent for agent in everyone if agent["session"] not in efforts]
    # Each file's sizes as the harness loaded it, an agent's first load of each.
    loads = defaultdict(list)
    for agent in agents:
        first = {}
        for held in agent.get("memory", []):
            if posixpath.basename(held["path"] or "") == "AGENTS.md":
                for name in placed(held["path"], files):
                    first.setdefault(name, held["chars"])
        for name, chars in first.items():
            loads[name].append(chars)
    then = {name: statistics.median(loads[name]) if loads[name] else size for name, size in files.items()}
    uses = {agent["key"]: uses_of(agent, files, skills, then) for agent in everyone}

    print("== The agents ==")
    print(f"  efforts={len(efforts)} agents={len(agents)} (workers/reviewers/helpers/main {by_role(agents, role_of)}); the machine's other sessions hold {len(others)} more")
    calls = Counter(call["name"] if not call["name"].startswith("mcp__") else "a connector's tool" for agent in agents for call in agent["tools"])
    print("  their tool calls: " + ", ".join(f"{name} {calls[name]}" for name in ("Bash", "Read", "Edit", "Write", "Skill", "a connector's tool")))
    cut = sum(1 for agent in agents for call in agent["tools"] if call["name"] == "Bash" and " …… " in (call.get("cmd") or ""))
    print(f"  shell commands the extraction cut short, read here by head and tail alone: {cut} of {calls['Bash']}")

    print("\n== Each AGENTS.md: the agents that had it, of the efforts' ==")
    print("  now: its size today; then: its median size as the harness loaded it, today's where it never did")
    print("  loaded: the harness loaded it, as the agent opened a file beside it with Read, Edit or Write")
    print("  read: a Read call that returned half of it or more, a command that prints a file whole, or git show of it")
    print("  part: lines of it only (sed -n, head, tail, a pipe into one, a shorter Read), and no whole read")
    print("  both: loaded, and read or read in part; had it: any of those, as workers/reviewers/helpers/main")
    print("  searched: by grep or over a wildcard, and none of those")
    print("  share: of every file's size then, times its loads plus its whole reads, so an agent with both counts twice")
    rows = []
    for name, size in files.items():
        count = Counter()
        had = []
        for agent in agents:
            hows = uses[agent["key"]][0].get(name, set())
            count["loaded"] += "loaded" in hows
            count["read"] += "read" in hows
            count["part"] += "part" in hows and "read" not in hows
            count["both"] += "loaded" in hows and bool(hows & {"read", "part"})
            count["search"] += "search" in hows and not hows & HELD
            if hows & HELD:
                had.append(agent)
        rows.append((name, size, then[name], count, had, then[name] * (count["loaded"] + count["read"])))
    total = sum(row[-1] for row in rows) or 1
    print(f"  {'file':<42} {'now':>4} {'then':>5} {'loaded':>6} {'read':>5} {'part':>5} {'both':>5} {'searched':>8} {'share':>6}  had it")
    rows.sort(key=lambda row: -row[-1])
    for name, size, size_then, count, had, weight in rows:
        print(
            f"  {name:<42} {size / 1e3:>4.0f} {size_then / 1e3:>5.0f} {count['loaded']:>6} {count['read']:>5} {count['part']:>5} {count['both']:>5} {count['search']:>8}"
            f" {weight / total:>6.0%}  {len(had)} ({by_role(had, role_of)})"
        )
    none = [agent for agent in agents if not any(hows & HELD for hows in uses[agent["key"]][0].values())]
    print(f"  agents that had no AGENTS.md: {len(none)} ({by_role(none, role_of)})")
    print(f"  the first eight's share together: {sum(row[-1] for row in rows[:8]) / total:.1%}")
    print(f"  every file's size then, times its loads plus its whole reads: {total / CHARS_PER_TOKEN / 1e6:.1f}M tokens")

    print("\n== Each skill: the agents that used it ==")
    print("  tool: loaded with the Skill tool; read: its SKILL.md by a Read call that returned half of it or more,")
    print("  a command that prints a file whole, or git show of it; part: lines of its SKILL.md only")
    print("  searched: its SKILL.md by grep or over a wildcard, and no more. A sweep of every skill counts for each,")
    print("  and for a skill newer than the sweep, since a wildcard is matched against today's files")
    print("  refs: read a reference file of it, whole or in part; edited: changed its SKILL.md with Edit or Write")
    print("  elsewhere: agents of the machine's other sessions that loaded it or read it, whole or in part")
    print(
        f"  {'skill':<34} {'KB':>4} {'desc':>5} {'refs KB':>7} {'added':>6} {'tool':>4} {'read':>5} {'part':>5} {'searched':>8} {'refs':>5} {'edited':>6} {'elsewhere':>9}"
    )
    unused = []
    for name, skill in sorted(skills.items(), key=lambda item: item[0]):
        count = Counter()
        for agent in agents:
            hows = uses[agent["key"]][1].get(name, set())
            count["tool"] += "tool" in hows
            count["read"] += "read" in hows
            count["part"] += "part" in hows and not hows & {"tool", "read"}
            count["search"] += "search" in hows and not hows & HELD
            count["edit"] += "edit" in hows
            count["refs"] += any(ref_hows & HELD for (owner, _), ref_hows in uses[agent["key"]][2].items() if owner == name)
        elsewhere = sum(1 for agent in others if uses[agent["key"]][1].get(name, set()) & HELD)
        if not count["tool"] and not count["read"] and not count["part"] and not elsewhere:
            unused.append(name)
        print(
            f"  {name:<34} {skill['bytes'] / 1e3:>4.0f} {skill['description']:>5} {sum(skill['refs'].values()) / 1e3:>7.0f} {skill['added']:>6} "
            f"{count['tool']:>4} {count['read']:>5} {count['part']:>5} {count['search']:>8} {count['refs']:>5} {count['edit']:>6} {elsewhere:>9}"
        )
    print(f"  loaded or read by no agent on the machine, even in part: {', '.join(unused) or 'none'}")

    print("\n== Each reference file: the agents that read it, whole or in part, of the efforts' and elsewhere ==")
    for name, skill in sorted(skills.items()):
        for ref, size in sorted(skill["refs"].items()):
            readers = [sum(1 for agent in group if uses[agent["key"]][2].get((name, ref), set()) & HELD) for group in (agents, others)]
            print(f"  {name + '/' + ref:<62} {size / 1e3:>5.0f} KB  read by {readers[0]:>3} and {readers[1]:>2}")

    print("\n== The Skill tool, connectors and agent types, on the whole machine ==")
    loaded = Counter()
    foreign = Counter()
    servers = defaultdict(lambda: [set(), 0])
    chrome = set()
    types = Counter()
    for agent in everyone:
        for call in agent["tools"]:
            if call["name"] == "Skill":
                loaded[(call.get("skill") or "?") + ("" if call.get("skill") in skills else " (not the repository's)")] += 1
            elif call["name"].startswith("mcp__"):
                server = call["name"].split("__")[1]
                servers[server][0].add(agent["key"])
                servers[server][1] += 1
                if server.startswith("chrome-devtools"):
                    chrome.add(agent["key"])
            elif call["name"] == "Agent":
                types[call.get("sub") or "none given"] += 1
            for path, _ in mentions(call):
                match = SKILL_FILE.search(path)
                if match and match.group(2) and "*" not in match.group(1) and "$" not in match.group(1) and match.group(1) not in skills:
                    foreign[match.group(1)] += 1
    print(f"  the Skill tool's calls, {sum(loaded.values())} in {len(everyone)} agents: " + (", ".join(f"{name} {n}" for name, n in loaded.most_common()) or "none"))
    print("  files of skills that are not the repository's, named in a call, by skill: " + (", ".join(f"{name} {n}" for name, n in foreign.most_common()) or "none"))
    print("  agent types started: " + ", ".join(f"{name} {n}" for name, n in types.most_common()))
    print("  connectors called:")
    for server, (keys, count) in sorted(servers.items(), key=lambda item: -item[1][1]):
        print(f"    {server:<28} agents={len(keys):>3} calls={count}")
    print(f"    the two Chrome ones together agents={len(chrome):>3}")


if __name__ == "__main__":
    main()
