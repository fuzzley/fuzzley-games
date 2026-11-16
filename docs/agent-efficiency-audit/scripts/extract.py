#!/usr/bin/env python3
"""Reads Claude Code session logs and writes one compact JSON per agent.

Usage: extract.py <projects-dir> <out-dir>

An "agent" is a main session (`<session>.jsonl`) or one of its subagents
(`<session>/subagents/agent-<id>.jsonl`). The output keeps what the timing
and token analysis needs: each API request's usage, each tool call's start
and end, each prompt that woke the agent, and the ordered timeline that
`lib.py` turns into model, tool and idle time.
"""

import glob
import json
import os
import re
import sys
from datetime import datetime
from multiprocessing import Pool


def ts(value):
    """Parses an ISO timestamp into epoch seconds, or None."""
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp()
    except ValueError:
        return None


def clip(text, head=300, tail=0):
    """Keeps the head and the tail of a long string."""
    if text is None:
        return ""
    if not isinstance(text, str):
        text = json.dumps(text)
    if len(text) <= head + tail:
        return text
    if tail:
        return text[:head] + " …… " + text[-tail:]
    return text[:head]


def result_text(block):
    """Returns a tool_result block's content as text."""
    content = block.get("content")
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for part in content:
            if isinstance(part, dict) and part.get("type") == "text":
                parts.append(part.get("text", ""))
            elif isinstance(part, dict):
                parts.append("[" + str(part.get("type")) + "]")
        return "\n".join(parts)
    return ""


NOTE = re.compile(
    r"<task-id>([^<]*)</task-id>.*?<status>([^<]*)</status>.*?<summary>(.*?)</summary>",
    re.S,
)


def tool_summary(name, tool_input):
    """Picks the fields of a tool's input worth keeping."""
    if not isinstance(tool_input, dict):
        return {}
    if name == "Bash":
        return {
            "cmd": clip(tool_input.get("command"), 1500, 300),
            "desc": clip(tool_input.get("description"), 200),
            "bg": bool(tool_input.get("run_in_background")),
            "timeout": tool_input.get("timeout"),
        }
    if name == "Agent":
        return {
            "desc": clip(tool_input.get("description"), 200),
            "sub": tool_input.get("subagent_type"),
            "bg": tool_input.get("run_in_background"),
            "prompt_chars": len(tool_input.get("prompt") or ""),
            "prompt": clip(tool_input.get("prompt"), 600),
            "model": tool_input.get("model"),
            "isolation": tool_input.get("isolation"),
        }
    if name in ("Read", "Edit", "Write"):
        return {
            "file": tool_input.get("file_path"),
            "chars": len(tool_input.get("content") or tool_input.get("new_string") or ""),
        }
    if name == "SendMessage":
        return {
            "to": tool_input.get("to"),
            "chars": len(tool_input.get("message") or ""),
            "msg": clip(tool_input.get("message"), 400),
        }
    if name == "Monitor":
        return {"cmd": clip(tool_input.get("command") or json.dumps(tool_input), 600)}
    if name == "Skill":
        return {"skill": tool_input.get("skill")}
    if name == "SubagentHandback":
        message = tool_input.get("message") or ""
        return {"chars": len(message), "msg": clip(message, 9000)}
    return {"input": clip(json.dumps(tool_input), 300)}


def extract(args):
    path, out_dir = args
    base = os.path.basename(path)
    is_sub = "/subagents/" in path
    if is_sub:
        session = path.split("/subagents/")[0].rsplit("/", 1)[-1]
        agent_id = base[len("agent-") : -len(".jsonl")]
        key = session + "__" + agent_id
    else:
        session = base[: -len(".jsonl")]
        agent_id = None
        key = session + "__main"

    meta = {}
    if is_sub:
        meta_path = path[: -len(".jsonl")] + ".meta.json"
        if os.path.exists(meta_path):
            try:
                with open(meta_path) as handle:
                    meta = json.load(handle)
            except (OSError, ValueError):
                meta = {}

    requests = {}  # message id -> request
    request_order = []
    tools = {}  # tool_use id -> call
    timeline = []  # (t, kind, ref)
    prompts = []
    texts = []
    compactions = []
    notes = []
    drops = []
    memory = []  # instruction files the harness loaded by itself
    attached = {}  # characters of the harness's other attachments, by kind
    seen = set()
    models = {}
    efforts = {}
    cwds = {}
    versions = {}
    entrypoints = {}
    bad = 0
    title = None

    with open(path, errors="replace") as handle:
        for line in handle:
            if not line.strip():
                continue
            try:
                rec = json.loads(line)
            except ValueError:
                bad += 1
                continue
            uuid = rec.get("uuid")
            if uuid:
                if uuid in seen:
                    continue
                seen.add(uuid)
            kind = rec.get("type")
            t = ts(rec.get("timestamp"))
            if rec.get("cwd"):
                cwds[rec["cwd"]] = cwds.get(rec["cwd"], 0) + 1
            if rec.get("version"):
                versions[rec["version"]] = versions.get(rec["version"], 0) + 1
            if rec.get("entrypoint"):
                entrypoints[rec["entrypoint"]] = entrypoints.get(rec["entrypoint"], 0) + 1

            if kind == "assistant":
                msg = rec.get("message", {})
                mid = msg.get("id") or uuid
                usage = msg.get("usage") or {}
                model = msg.get("model")
                if model:
                    models[model] = models.get(model, 0) + 1
                if rec.get("effort"):
                    efforts[rec["effort"]] = efforts.get(rec["effort"], 0) + 1
                req = requests.get(mid)
                if req is None:
                    req = {
                        "id": mid,
                        "t_first": t,
                        "t_last": t,
                        "model": model,
                        "in": 0,
                        "cw": 0,
                        "cw5": 0,
                        "cw1h": 0,
                        "cr": 0,
                        "out": 0,
                        "think": 0,
                        "stop": None,
                        "blocks": [],
                        "think_ms": 0,
                        "stream_ms": 0,
                        "effort": rec.get("effort"),
                        "cache_req": rec.get("promptCacheRequested"),
                        "synthetic": model == "<synthetic>",
                        "api_error": bool(rec.get("isApiErrorMessage")),
                    }
                    requests[mid] = req
                    request_order.append(mid)
                if t is not None:
                    req["t_last"] = max(req["t_last"] or t, t)
                    if req["t_first"] is None:
                        req["t_first"] = t
                req["in"] = max(req["in"], usage.get("input_tokens") or 0)
                req["cw"] = max(req["cw"], usage.get("cache_creation_input_tokens") or 0)
                req["cr"] = max(req["cr"], usage.get("cache_read_input_tokens") or 0)
                req["out"] = max(req["out"], usage.get("output_tokens") or 0)
                creation = usage.get("cache_creation") or {}
                req["cw5"] = max(req["cw5"], creation.get("ephemeral_5m_input_tokens") or 0)
                req["cw1h"] = max(req["cw1h"], creation.get("ephemeral_1h_input_tokens") or 0)
                details = usage.get("output_tokens_details") or {}
                req["think"] = max(req["think"], details.get("thinking_tokens") or 0)
                if msg.get("stop_reason"):
                    req["stop"] = msg["stop_reason"]
                req["think_ms"] += rec.get("thinkingDurationMs") or 0
                req["stream_ms"] += rec.get("toolInputStreamMs") or 0
                for block in msg.get("content") or []:
                    btype = block.get("type")
                    req["blocks"].append(btype)
                    if btype == "tool_use":
                        call = {
                            "id": block.get("id"),
                            "name": block.get("name"),
                            "t_call": t,
                            "t_result": None,
                            "err": None,
                            "res_chars": None,
                            "req": mid,
                        }
                        call.update(tool_summary(block.get("name"), block.get("input")))
                        tools[block.get("id")] = call
                        timeline.append((t, "tool_use", block.get("id")))
                    elif btype == "text":
                        text = block.get("text") or ""
                        texts.append({"t": t, "text": clip(text, 6000)})
                        timeline.append((t, "text", mid))
                    else:
                        timeline.append((t, "think", mid))

            elif kind == "user":
                msg = rec.get("message", {})
                content = msg.get("content")
                origin = rec.get("origin")
                origin_kind = origin.get("kind") if isinstance(origin, dict) else origin
                if isinstance(content, str):
                    text = content
                    pkind = origin_kind or ("compact" if rec.get("isCompactSummary") else None)
                    if pkind is None:
                        if rec.get("isMeta"):
                            pkind = "meta"
                        else:
                            pkind = "human"
                    match = NOTE.search(text)
                    if "<task-notification>" in text:
                        pkind = "task-notification"
                        if match:
                            notes.append(
                                {
                                    "t": t,
                                    "task": match.group(1),
                                    "status": match.group(2),
                                    "summary": clip(match.group(3), 300),
                                }
                            )
                        else:
                            notes.append({"t": t, "task": None, "status": "?", "summary": clip(text, 600)})
                    prompts.append(
                        {
                            "t": t,
                            "kind": pkind,
                            "src": rec.get("promptSource"),
                            "meta": bool(rec.get("isMeta")),
                            "chars": len(text),
                            "text": clip(text, 3000 if pkind == "human" else 500),
                        }
                    )
                    timeline.append((t, "prompt:" + str(pkind), None))
                elif isinstance(content, list):
                    had_result = False
                    for block in content:
                        btype = block.get("type")
                        if btype == "tool_result":
                            had_result = True
                            tid = block.get("tool_use_id")
                            call = tools.get(tid)
                            text = result_text(block)
                            if call is not None:
                                call["t_result"] = t
                                call["err"] = bool(block.get("is_error"))
                                call["res_chars"] = len(text)
                                call["res"] = clip(text, 300, 700)
                                tur = rec.get("toolUseResult")
                                if isinstance(tur, dict):
                                    if tur.get("backgroundTaskId"):
                                        call["bg_task"] = tur["backgroundTaskId"]
                                    if tur.get("interrupted"):
                                        call["interrupted"] = True
                                    if "totalDurationMs" in tur:
                                        call["sub_ms"] = tur.get("totalDurationMs")
                                        call["sub_tokens"] = tur.get("totalTokens")
                                        call["sub_tools"] = tur.get("totalToolUseCount")
                                    if tur.get("agentId"):
                                        call["agent_id"] = tur.get("agentId")
                                    if tur.get("status"):
                                        call["status"] = tur.get("status")
                                    if tur.get("isAsync"):
                                        call["async"] = True
                                    if tur.get("gitOperation"):
                                        call["git_op"] = tur.get("gitOperation")
                                    if tur.get("persistedOutputSize"):
                                        call["persisted"] = tur.get("persistedOutputSize")
                                decision = rec.get("permissionDecision")
                                if isinstance(decision, dict):
                                    call["perm"] = (decision.get("decision") or "") + ":" + (
                                        decision.get("reasonType") or ""
                                    )
                            timeline.append((t, "tool_result", tid))
                        elif btype == "text":
                            text = block.get("text") or ""
                            pkind = origin_kind or ("meta" if rec.get("isMeta") else "human")
                            if "<task-notification>" in text:
                                pkind = "task-notification"
                            prompts.append(
                                {
                                    "t": t,
                                    "kind": pkind,
                                    "src": rec.get("promptSource"),
                                    "meta": bool(rec.get("isMeta")),
                                    "chars": len(text),
                                    "text": clip(text, 3000 if pkind == "human" else 500),
                                }
                            )
                            timeline.append((t, "prompt:" + str(pkind), None))
                    if not had_result and not content:
                        timeline.append((t, "prompt:empty", None))

            elif kind == "attachment":
                att = rec.get("attachment") or {}
                atype = att.get("type")
                if atype == "queued_command":
                    mode = att.get("commandMode")
                    text = att.get("prompt") or ""
                    if isinstance(text, list):
                        text = json.dumps(text)
                    origin = att.get("origin")
                    okind = origin.get("kind") if isinstance(origin, dict) else None
                    pkind = "task-notification" if mode == "task-notification" else (okind or "queued")
                    if mode == "task-notification":
                        match = NOTE.search(text)
                        usage = att.get("usage") or {}
                        notes.append(
                            {
                                "t": t,
                                "task": match.group(1) if match else None,
                                "status": match.group(2) if match else "?",
                                "summary": clip(match.group(3), 300) if match else clip(text, 300),
                                "tokens": usage.get("totalTokens"),
                                "tool_uses": usage.get("toolUses"),
                                "ms": usage.get("durationMs"),
                            }
                        )
                    prompts.append(
                        {
                            "t": t,
                            "kind": pkind,
                            "src": "queued",
                            "meta": bool(att.get("isMeta")),
                            "chars": len(text),
                            "text": clip(text, 3000 if pkind in ("human", "queued") else 500),
                        }
                    )
                    timeline.append((t, "prompt:" + str(pkind), None))
                elif atype == "thinking_drop":
                    dropped = att.get("newlyDropped") or {}
                    drops.append(
                        {
                            "t": t,
                            "blocks": dropped.get("blockCount"),
                            "reason": dropped.get("reason"),
                            "change": (att.get("clientChange") or {}).get("kinds"),
                        }
                    )
                elif atype == "silent_turn_reminder":
                    timeline.append((t, "att:reminder", None))
                if atype == "nested_memory":
                    # An instructions file the harness loaded by itself, as
                    # the agent opened a file beside it.
                    held = att.get("content") or {}
                    body = held.get("content") if isinstance(held, dict) else held
                    memory.append({"t": t, "path": att.get("path"), "chars": len(body or "")})
                elif atype in ("file", "skill_listing", "deferred_tools_delta", "mcp_instructions_delta", "agent_listing_delta", "edited_text_file"):
                    attached[atype] = attached.get(atype, 0) + len(json.dumps(att))
                    if atype == "skill_listing" and att.get("isInitial"):
                        attached["skills_listed"] = att.get("skillCount")
                        attached["skills_listed_chars"] = len(att.get("content") or "")

            elif kind == "system":
                sub = rec.get("subtype")
                if sub == "compact_boundary":
                    cm = rec.get("compactMetadata") or {}
                    compactions.append(
                        {
                            "t": t,
                            "trigger": cm.get("trigger"),
                            "pre": cm.get("preTokens"),
                            "post": cm.get("postTokens"),
                            "ms": cm.get("durationMs"),
                        }
                    )
                    timeline.append((t, "compact", None))
                elif sub == "stop_hook_summary":
                    timeline.append((t, "stop", None))
                elif sub == "api_error":
                    timeline.append((t, "api_error", None))
                    notes.append({"t": t, "task": None, "status": "api_error", "summary": clip(json.dumps(rec.get("error") or rec.get("content")), 300)})
                else:
                    timeline.append((t, "system:" + str(sub), None))
            elif kind == "custom-title":
                title = rec.get("customTitle") or rec.get("title")

    times = [item[0] for item in timeline if item[0] is not None]
    out = {
        "key": key,
        "session": session,
        "agent_id": agent_id,
        "is_sub": is_sub,
        "path": path,
        "bytes": os.path.getsize(path),
        "meta": meta,
        "title": title,
        "models": models,
        "efforts": efforts,
        "cwds": dict(sorted(cwds.items(), key=lambda kv: -kv[1])[:5]),
        "versions": versions,
        "entrypoints": entrypoints,
        "t0": min(times) if times else None,
        "t1": max(times) if times else None,
        "requests": [requests[mid] for mid in request_order],
        "tools": list(tools.values()),
        "prompts": prompts,
        "texts": texts,
        "compactions": compactions,
        "notes": notes,
        "drops": drops,
        "memory": memory,
        "attached": attached,
        "timeline": timeline,
        "bad_lines": bad,
    }
    with open(os.path.join(out_dir, key + ".json"), "w") as handle:
        json.dump(out, handle)
    return key, len(request_order), len(tools)


def main():
    projects, out_dir = sys.argv[1], sys.argv[2]
    os.makedirs(out_dir, exist_ok=True)
    files = sorted(glob.glob(os.path.join(projects, "*", "*.jsonl")))
    files += sorted(glob.glob(os.path.join(projects, "*", "*", "subagents", "*.jsonl")))
    files = [f for f in files if os.path.getsize(f) > 0]
    with Pool(16) as pool:
        done = pool.map(extract, [(f, out_dir) for f in files], chunksize=4)
    print(len(done), "agents;", sum(d[1] for d in done), "requests;", sum(d[2] for d in done), "tool calls")


if __name__ == "__main__":
    main()
