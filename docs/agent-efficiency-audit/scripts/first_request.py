#!/usr/bin/env python3
"""Prints what a session's agents started with: the skills listed to each, by whose they are, the instruction files loaded, and each request's size.

Takes session ids, or the files `claude -p --output-format json` wrote, and
reads the sessions' logs under `~/.claude/projects` (or `CLAUDE_CONFIG_DIR`).
It needs no `AUDIT_DATA`: it is for a trial of a setting, one small session
with it and one without, as `data/plugins-trial.txt` shows.
"""

import glob
import json
import os
import re
import subprocess
import sys
from collections import Counter

REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".."))
LOGS = os.path.join(os.environ.get("CLAUDE_CONFIG_DIR") or os.path.expanduser("~/.claude"), "projects")
# The attachments that add to a request beside the skill lists and the files.
NOTICES = ("deferred_tools_delta", "mcp_instructions_delta", "agent_listing_delta")


def repo_skills():
    """Returns the names of the repository's skills."""
    listed = subprocess.run(["git", "-C", REPO, "ls-files", "*.agents/skills/*/SKILL.md"], capture_output=True, text=True, check=True)
    return {os.path.basename(os.path.dirname(path)) for path in listed.stdout.splitlines()}


def owner_of(name, ours):
    """Names whose skill one is: a plugin's or the account's by its prefix, the repository's, or the harness's and the user's."""
    if ":" in name:
        return name.split(":")[0]
    return "the repository's" if name in ours else "the harness's and the user's"


def session_of(arg):
    """Returns the session id an argument names: itself, or the one in a result file."""
    if os.path.exists(arg):
        with open(arg) as handle:
            return json.load(handle)["session_id"]
    return arg


def describe(path, ours):
    """Prints one agent's skill lists, loaded files, notices and requests, in the order its log holds them."""
    notices = Counter()
    seen = set()
    with open(path) as handle:
        for line in handle:
            record = json.loads(line)
            att = record.get("attachment") or {}
            kind = att.get("type")
            if kind == "skill_listing":
                size, count, bare = Counter(), Counter(), Counter()
                for entry in re.split(r"\n(?=- )", att.get("content") or ""):
                    whose = owner_of(entry[2:].split(": ")[0].strip(), ours)
                    size[whose] += len(entry)
                    count[whose] += 1
                    bare[whose] += ": " not in entry
                print(f"    a skill list, {'at the start' if att.get('isInitial') else 'added later'}: {sum(count.values())} skills, {sum(size.values())} characters")
                for whose, chars in size.most_common():
                    print(f"      {whose:<28} skills={count[whose]:>3} named only={bare[whose]:>3} chars={chars:>6}")
            elif kind == "nested_memory":
                held = att.get("content") or {}
                body = held.get("content") if isinstance(held, dict) else held
                print(f"    loaded {os.path.relpath(att.get('path') or '', os.path.dirname(REPO))}: {len(body or '')} characters")
            elif kind in NOTICES:
                notices[kind] += len(json.dumps(att))
            message = record.get("message") or {}
            # A reply's log holds a record for each block of it, each with the request's usage.
            if record.get("type") == "assistant" and message.get("id") not in seen:
                seen.add(message.get("id"))
                usage = message.get("usage") or {}
                context = sum(usage.get(key, 0) for key in ("input_tokens", "cache_creation_input_tokens", "cache_read_input_tokens"))
                print(f"    a request of {context} tokens")
    print("    notices in all: " + (", ".join(f"{kind} {chars}" for kind, chars in notices.items()) or "none"))


def main():
    ours = repo_skills()
    for arg in sys.argv[1:]:
        session = session_of(arg)
        print(f"== {os.path.basename(arg)} ==")
        for path in glob.glob(os.path.join(LOGS, "*", session + ".jsonl")):
            print("  the session itself")
            describe(path, ours)
        for path in sorted(glob.glob(os.path.join(LOGS, "*", session, "subagents", "*.jsonl"))):
            print(f"  its agent {os.path.basename(path)[:-6]}")
            describe(path, ours)


if __name__ == "__main__":
    main()
