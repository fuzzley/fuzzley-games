# Agent efficiency audit: where the long builds' time and tokens went

Measured on 2026-11-16 from Claude Code's own session logs on the devbox: the seven long multi-agent efforts of 2026-11-08 to 11-16, all on Claude Opus 5.5 at `xhigh` effort. They cover 762 agent transcripts, 61,184 API requests and 474 agent-hours. Dollar figures price the logged tokens at Opus 5.5's list prices ($4 in, $20 out, $0.20 cache read, and $5 or $8 cache write for the 5-minute or 1-hour cache, a million tokens), so on a subscription read them as shares of usage, not as a bill. Nothing here was tried: every saving below is an estimate from the logs, and each recommendation says how to measure it.

Three of the seven efforts kept only part of their logs ([What to trust](#what-to-trust)), so the two builds logged whole, Brick Fuzz Pop and the Brick Breaker uplift, carry most of the conclusions.

**The terms used:**

- **Harness:** Claude Code, the program that runs each agent and gives it its tools.
- **Orchestrator:** an effort's main session. It plans, starts the other agents, and lands their work on the branch.
- **Worker:** an agent the orchestrator starts to build one package. **Reviewer:** an agent started to review one staged change. **Helper:** any other agent.
- **Package:** one worker's share of the plan, landed as a handful of commits.
- **Stream:** in Brick Fuzz Pop, a worker kept alive to build several packages in turn.
- **Compaction:** when an agent's context fills (here at 467,000 tokens), the harness replaces it with a summary and the agent carries on from that.

## Summary

- **Reading context, not writing code, is where the tokens go.** Output is 22% of spend, and over half of that is thinking. Cache reads are 51% and cache writes 27%: a worker's average request re-reads 249,000 tokens, and 92% of requests carry a single tool call.
- **Reviews are about 27% of spend, and they are acted on.** That is $825 of $3,081 in the four efforts logged whole; over all seven it reads 35%, because the cut logs lost workers' requests and no reviewer's. There were 604 reviews at about $2.50 and 6 to 7 minutes each. Where a worker waited on a review of code, it changed source before committing after about seven in ten. What is wasteful is how each one starts: from 53,000 tokens of fixed prefix it reads another 78,000 over 43 one-at-a-time calls, a fifth of it `AGENTS.md` files, and 265 of the 604 reviewers read by command a file the harness had also loaded for them.
- **A worker that waits on its reviewer pays twice.** It is blocked for the review (30 agent-hours in all, 12% of busy time), and since a subagent's cache lasts 5 minutes and a review takes 6 to 7, it then re-writes its whole context: 194 times, $247. All such rewrites come to $417, 16% of what workers cost.
- **Of 258 busy agent-hours, the model takes 54%, checks 21%, waiting on a reviewer 12%.** Per commit, a Brick Breaker worker spent 10.9 minutes with the model, 8.4 in checks and 3.8 blocked on review; a Brick Fuzz Pop worker 15.0, 9.4 and 8.5.
- **More agents at once was not what the machine or the API limited.** The root's lint went from 57 s alone to 68 s beside one or two other checks, one game's specs did not slow at all, and the API wrote 105 tokens a second whether one request was in flight or six.
- **But past four or five, more agents did not seem to buy more.** In Brick Fuzz Pop, commits per busy worker-hour peaked at 1.7 with three to five workers busy and were 1.3 with five or more, where the whole build made fewer commits an hour (6.9) than with four to five (7.8). That is seven half-hour windows of one build, so a sign and not a proof. The firmer figure is the waiting: its six streams sat idle 32 hours between packages, 19 of them while the orchestrator was itself waiting on other agents.
- **Every agent has a fixed cost.** A worker takes 7 minutes, 56 requests and $3.70 to reach its first edit, by then at 265,000 tokens of context. In the Brick Breaker uplift a package of one or two commits cost $14.20 a commit against about $10 for larger ones.
- **The standing docs more than doubled in twelve days.** Every `AGENTS.md` together went from 243 KB to 553 KB. Asteroid Breaker's alone is 130 KB, about 50,000 tokens, which an agent working on that game takes in once and then re-reads on every request.
- **Two overnight outages cost about 14 hours of wall-clock.** Brick Fuzz Pop's session ended at 02:28 local and waited for "Continue" at 08:47; the Asteroid Breaker uplift hung for 7.7 hours on one tool call that never returned.

**What to change, in the order it would pay** (details and how to measure each under [Recommendations](#recommendations-and-experiments)):

1. Stop blocking on reviews: launch the reviewer in the background and keep working.
2. Give reviews an agent type of their own: a short rubric in place of the standing docs, reads batched, and a lower effort tried against the present one.
3. Put the standing docs on a budget, and have briefs carry excerpts rather than "read the plan".
4. Keep four workers at once, in packages of three to nine commits, each a fresh agent; no long-lived streams.
5. One `yarn verify:changed` a commit, the root's lint once a package.
6. Batch the reads: what an agent knows it needs, in one command.
7. A watchdog for sessions left overnight.

Together these should take about a fifth off the tokens and up to a fifth off a worker's time per commit (est.; the parts overlap, so they do not simply add). Every change is still reviewed, and the one change to the review itself, recommendation 2, comes with a side-by-side test of what it finds.

## What to trust

- **The sources.** `~/.claude/projects/*/*.jsonl` and each session's `subagents/` folder: every API request with its token usage, every tool call with its start and end, and every prompt that woke an agent. The scripts in [`scripts/`](scripts/) turn these into the tables in [`data/`](data/). Sizes of files and counts of commits come from the repository's history, and the few figures read from a log by hand say so.
- **How time is split.** Each agent's log is walked as a state machine: waiting on the model, waiting on a tool (by the tool and, for a shell command, by what it ran), idle after its turn ended, or stalled when a tool wait outlived the tool's own timeout. "Busy" means with the model or a tool. Agent-hours add up across agents, so they exceed wall-clock.
- **Who is who.** A reviewer is a subagent whose description says review or audit. A worker is any other subagent the orchestrator started that was busy for 15 minutes or more. The rest are helpers.
- **Three efforts are cut short.** The Asteroid Breaker follow-ups (Nov 8), the Asteroid Breaker uplift and the Brick Fuzz Pop tune-up kept nothing from before an agent's first compaction, for the orchestrator and for every worker that compacted (20 of the uplift's 22). Three of the uplift's workers reported 884, 794 and 765 tool uses in their completion notices, against 278, 236 and 197 in their logs. So those efforts' worker and orchestrator figures are lower bounds (for those three workers, about a third of the truth); their reviewers, which never compact, are whole. A share of spend taken over all seven therefore leans toward reviewers.
- **What a review found is not judged here.** The scripts count a report's numbered findings, sort them by keyword, and see whether a worker that waited on its review then changed files before committing. None of that says a finding was right. Read the keyword shares as rough.
- **Tokens from characters.** Where a figure turns characters into tokens, it uses 2.5 characters a token, the median measured here over 665 large tool results.
- **One machine, one model.** 24 cores and 23 GB, every agent on Opus 5.5 at `xhigh`.

## The seven efforts

| Effort                               | When (UTC) | Wall-clock | Workers, reviews | Logged spend | Logs  |
| ------------------------------------ | ---------- | ---------: | ---------------: | -----------: | ----- |
| Asteroid Breaker review's follow-ups | Nov 8–9    |     22.6 h |          34, 105 |        $684+ | cut   |
| Shared library                       | Nov 9–10   |     35.1 h |            6, 52 |         $408 | whole |
| Brick Fuzz Pop build                 | Nov 10–11  |     28.6 h |          14, 150 |       $1,627 | whole |
| Brick Breaker uplift                 | Nov 14     |     12.0 h |           23, 92 |         $868 | whole |
| CI and local pipeline audits         | Nov 14–15  |     11.0 h |            1, 23 |         $178 | whole |
| Asteroid Breaker uplift              | Nov 15–16  |     33.4 h |          22, 150 |        $886+ | cut   |
| Brick Fuzz Pop tune-up               | Nov 15     |      6.3 h |            9, 32 |        $180+ | cut   |
| **All seven**                        |            |            |     **109, 604** |   **$4,831** |       |

- **Brick Fuzz Pop:** 120 commits and 69,000 lines added under `frontend/` by `git log`, so $13.60 a commit all told. Six streams, each one agent kept alive for about 22 hours through 4 to 10 compactions.
- **Brick Breaker uplift:** 77 commits, 27,000 lines, $11.30 a commit. 23 fresh agents, one a package, at most four at once.
- **Shared library:** the build itself ran about 5 hours. For 29 of the session's 35 the orchestrator had nothing to do but wait for the user: by its log, 8.4 hours on its plan's questions overnight, the rest after the work was done.

## Where the time went

**All seven, in agent-hours:**

| What the agent was doing                                  |     Hours | Share of busy |
| --------------------------------------------------------- | --------: | ------------: |
| With the model (thinking and writing)                     |     140.6 |           54% |
| Running checks (lint, typecheck, specs, coverage, format) |      55.5 |           21% |
| Blocked on a reviewer it started                          |      30.0 |           12% |
| Other tools (reads, edits, git, browser)                  |      17.6 |            7% |
| Waiting on a background job                               |      13.5 |            5% |
| Waiting on CI                                             |       0.8 |            0% |
| **Busy**                                                  | **258.1** |               |
| Idle: an agent that had reported, waiting for its next    |     103.2 |               |
| Idle: an agent waiting on a background task of its own    |       5.6 |               |
| Idle: the orchestrator, waiting on agents                 |      32.1 |               |
| Idle: the orchestrator, waiting on the user               |      31.6 |               |
| Idle: the orchestrator, on a timer                        |       7.1 |               |
| Outage                                                    |      36.3 |               |

- **The model's time is its output.** It writes about 105 tokens a second, and 55% of what it writes is thinking (71% for reviewers). A straight-line fit of a request's seconds on its output leaves 0.2 s that does not depend on the output, so a request costs next to no time of its own.
- **Of the 103 hours agents sat idle after reporting, most were not waste and one part was.** 48 are the Nov 8 effort's agents, reviewers among them, kept alive for a later message. 18 are Brick Fuzz Pop's streams while its session was down, and 5 the shared library's workers between packages. The 32 that matter are Brick Fuzz Pop's streams between packages ([Parallelism](#parallelism)). An idle agent costs no tokens until it wakes; then a subagent re-writes its context ([Cache rewrites](#cache-rewrites)).

**One commit, as its worker lived it** (the two builds logged whole):

| Per commit                            | Brick Breaker uplift | Brick Fuzz Pop |
| ------------------------------------- | -------------------: | -------------: |
| With the model                        |             10.9 min |       15.0 min |
| In checks                             |              8.4 min |        9.4 min |
| Blocked on its review                 |              3.8 min |        8.5 min |
| Waiting on a background job           |              1.8 min |        3.2 min |
| Other tools                           |              1.2 min |        2.2 min |
| **Busy**                              |         **26.1 min** |   **38.3 min** |
| Elapsed, its own waits included       |             26.5 min |       39.7 min |
| Check commands run (formatting aside) |                 13.8 |           16.6 |
| Times it re-wrote its whole context   |                 0.70 |           1.56 |
| Reviews it started in the background  |             31 of 73 |       9 of 139 |
| The worker's tokens                   |                $7.90 |         $10.20 |
| With its reviewers'                   |               $10.60 |         $13.50 |

Brick Breaker's workers started four in ten of their reviewers in the background and went on working, and were blocked less than half as long a commit. That is recommendation 1.

**The orchestrator** was cheap, 8% of spend, and mostly waiting: busy for 3.5 of the Brick Breaker uplift's 12 hours and for 5 of the 22 that Brick Fuzz Pop was up, about 9 minutes of its own work to land each package. In the Brick Breaker uplift nothing waited on it, since a worker ended with its package. In Brick Fuzz Pop it was part of the queue: 10 of the 32 hours its streams sat between packages fell while it was busy, about two streams waiting whenever it worked.

**The finishing tail** ran after the last worker went quiet: 2.1 hours of the Brick Breaker uplift's 12 (nine more reviews, a CI wait, the layout check's fix), 0.9 hours for Brick Fuzz Pop.

**Outages.** In wall-clock:

- **Brick Fuzz Pop, 6.3 hours.** The session ended at 07:28 UTC (02:28 local) with three agents mid-task. It resumed on "Continue" at 13:47. The user then asked twice more whether agents had stalled.
- **Asteroid Breaker uplift, 1.6 then 7.7 hours.** The container restarted twice (18:33 and 22:04 local), and the second took three workers down for 1.6 hours before they were resumed. Then a call to cancel one of the orchestrator's own timers (`delete_trigger`) hung from 05:17 to 12:58 UTC (00:17 to 07:58 local) with the last package just landed, and the next timer, queued at 06:00 UTC, could not interrupt it.

## Where the tokens went

| Role          |   Requests |      Spend | Output (thinking) | Cache reads | Cache writes |  A request |
| ------------- | ---------: | ---------: | ----------------: | ----------: | -----------: | ---------: |
| Workers       |     29,135 |     $2,620 |       $483 ($203) |      $1,424 |         $713 |     $0.090 |
| Reviewers     |     25,735 |     $1,689 |       $471 ($336) |        $737 |         $481 |     $0.066 |
| Orchestrators |      4,181 |       $381 |         $67 ($24) |        $226 |          $88 |     $0.091 |
| Helpers       |      2,133 |       $142 |         $32 ($15) |         $67 |          $42 |     $0.067 |
| **All**       | **61,184** | **$4,831** |           **22%** |     **51%** |      **27%** | **$0.079** |

Reviewers' 35% of this table is of everything logged; in the four efforts logged whole they are 27%. Spend is requests times context. Three things set it:

**1. How big the context is at each request.**

| A worker's context at the request | Share of its requests | Share of its spend | A request |
| --------------------------------- | --------------------: | -----------------: | --------: |
| Under 100k                        |                    7% |                 4% |    $0.052 |
| 100–200k                          |                   29% |                20% |    $0.060 |
| 200–300k                          |                   31% |                30% |    $0.087 |
| 300–400k                          |                   22% |                29% |    $0.120 |
| Over 400k                         |                   11% |                17% |    $0.144 |

- **Every agent starts at about 53,000 tokens:** the system prompt and tools, a list of about 60 skills (about 12,000 tokens, most of them plugins no coding agent here uses), the memory index and its brief. Re-read on 61,000 requests, that start alone is about $650, 13% of spend.
- **A worker is at 265,000 before its first edit.** For the Brick Breaker uplift's workers, at the median: 52,000 it started with, 146,000 of tool results, 41,000 of its own thinking and writing, 6,000 of `AGENTS.md` files the harness loaded on its own, and the rest the harness's other notices. The tool results are source 44%, plans 19%, `AGENTS.md` files 11%, skills 8%, earlier packages' logs 7%.
- **The harness loads a folder's `AGENTS.md` on its own** when the agent opens a file there with the Read tool. Over its whole life a worker takes in a median 33,000 tokens that way, on top of what it reads by command.
- **So a fresh agent per package did not mean a small context.** 14 of the Brick Breaker uplift's 23 workers reached compaction within their one package.

**2. How many requests it takes.** 92% of workers' requests and 93% of reviewers' carry one tool call. 48% of a worker's reads and searches return under 1,500 characters. Each is a round trip that re-reads the whole context, so what many small requests cost is tokens, not time.

**3. Whether the cache is still warm.** That is the next section.

### Cache rewrites

A subagent's requests ask for the 5-minute cache; the orchestrator's ask for the 1-hour one. When a subagent's next request comes more than 5 minutes after its last, the whole context is written again at 25 times the price of reading it.

| A worker re-wrote its context after waiting on |   Times |     Cost |
| ---------------------------------------------- | ------: | -------: |
| A reviewer it ran in the foreground            |     194 |     $247 |
| The orchestrator's next message                |      87 |     $101 |
| A background job                               |      16 |      $23 |
| A check or script over 5 minutes               |      18 |      $21 |
| Nothing (under 5 minutes; the prefix changed)  |      43 |      $11 |
| An outage                                      |       5 |       $8 |
| A background task or subagent of its own       |       5 |       $8 |
| **All**                                        | **368** | **$417** |

Each row is rounded, so the rows add to $2 more than the total. The orchestrators, on the 1-hour cache, re-wrote 10 times for $13.

### The standing docs

Sizes from the repository's history:

| At                                        | Every `AGENTS.md` | Asteroid Breaker's | Brick Breaker's | Every skill |
| ----------------------------------------- | ----------------: | -----------------: | --------------: | ----------: |
| Nov 4                                     |            243 KB |              44 KB |           36 KB |      617 KB |
| Nov 14, before the Brick Breaker uplift   |            411 KB |              66 KB |           48 KB |      724 KB |
| Nov 14, after it                          |            453 KB |              66 KB |           83 KB |      767 KB |
| Nov 16, after the Asteroid Breaker uplift |            553 KB |             130 KB |           83 KB |      788 KB |

Each uplift grew its game's `AGENTS.md` by 75 to 100%. The plans made these files add-only for every package, and the finishing step audits them against the code but does not prune them. Every later agent in that game pays for the growth on each request, so the cost compounds from one effort to the next.

The work logs were large too: 437 KB for the Brick Breaker uplift, 909 KB for Brick Fuzz Pop and 1.26 MB in 92 files for the Asteroid Breaker uplift, all deleted at the merge. 6.8% of workers' tool calls and 5.5% of reviewers' touched one, and 32 reviews ($81) reviewed a log.

## Reviews

| Effort                                | Reviews | Minutes (median) |  Each | In all | Of the effort |
| ------------------------------------- | ------: | ---------------: | ----: | -----: | ------------: |
| Brick Fuzz Pop                        |     150 |              6.4 | $2.61 |   $397 |           24% |
| Brick Breaker uplift                  |      92 |              6.1 | $2.47 |   $248 |           29% |
| Shared library                        |      52 |              4.6 | $2.13 |   $126 |           31% |
| CI and pipeline audits                |      23 |              6.9 | $2.37 |    $54 |           30% |
| Asteroid Breaker uplift (workers cut) |     150 |              6.8 | $2.90 |   $461 |             – |
| Brick Fuzz Pop tune-up (workers cut)  |      32 |              5.8 | $2.36 |    $78 |             – |
| Asteroid Breaker follow-ups (cut)     |     105 |              6.7 | $2.48 |   $326 |             – |

- **About 1.2 reviews a commit** in Brick Fuzz Pop, whose workers ran 139 for 113 commits; 73 for 69 in the Brick Breaker uplift.
- **What one holds.** It starts at 53,000 tokens and peaks at a median 187,000: 78,000 of tool results over 43 calls, and 38,000 of its own output, 71% of that thinking.
- **What one reads.** Of those results: source 35%, `AGENTS.md` files 22%, the diff and git 14%, plans 10%, logs 5%, skills 5%. 87% of reviewers opened `.agents/AGENTS.md` by command and 80% `frontend/AGENTS.md`. The harness loaded an `AGENTS.md` on its own for 299 of the 604, and 265 of those also read one of the same files by command, so they held it twice.
- **What one finds.** Each of the 546 reports that listed its findings listed at least one, and of the shared library's 49, which gave a count instead, 5 gave none; the median over both is 5. By keyword: 28% read as a behaviour bug, 23% a spec that would not catch a break, 25% docs, comments or logs, 5% structure and naming. A behaviour bug led 37% of reports.
- **What the author then did.** Where a worker waited on a review of code, it changed source before its next commit after 72% of Brick Fuzz Pop's 115 such reviews and 68% of the Brick Breaker uplift's 40, changed only docs or logs after 22% and 30%, and changed nothing after 6% and 2%. A review run in the background says less this way, since its author is already on the next change when the report lands.
- **What they reviewed.** 526 reviewed code ($1,442), 46 docs, plans or skills ($167), 32 a work log ($81).

So about seven reviews in ten are followed by a change to source, and the saving is in what each one costs to start and in what the worker does meanwhile, not in having fewer reviews of code.

## Checks

| Check                                   |  Runs | Hours | Failed |
| --------------------------------------- | ----: | ----: | -----: |
| Lint                                    | 2,011 |  17.0 |    11% |
| Specs                                   | 2,855 |  13.3 |    20% |
| Typecheck                               | 1,571 |   8.7 |    15% |
| Mutants, by a script of the agent's own |   509 |   6.6 |    13% |
| Coverage                                |   633 |   4.2 |     6% |
| Prettier on named files                 | 2,453 |   3.8 |     8% |
| Layout check                            |   138 |   0.9 |     0% |
| Build                                   |   183 |   0.8 |     2% |

- **The root's `yarn lint` is the largest single command:** 301 runs as a command of its own at a median 67 s, plus the runs chained after a workspace's checks. The Brick Breaker uplift ran it 1.9 times a commit, and its plan had the orchestrator run it again at each landing.
- **The lock on root checks cost little:** 1.26 hours of waiting across 191 runs in the Brick Breaker uplift (90% waited under 87 s), 0.40 hours across 161 in the Asteroid Breaker uplift.
- **Failures are cheap.** A failed run is short, and the failed runs of lint, specs and typecheck together took 4.0 hours.
- **Mutants were Brick Fuzz Pop's:** 423 of the runs and 5.4 of the hours, each stream writing its own script.
- **`yarn verify:changed` came too late for these builds.** It landed on Nov 15 at 38 to 41 s for one game changed (the local pipeline audit's figure), against Asteroid Breaker's lint, typecheck and specs one after another (23, 14 and 42 s in the uplift's plan) and then the root's lint.

## Parallelism

**The machine was not the limit.**

| A run of                                   | Alone | Beside ~1 other check |     ~2 |    ~3 |
| ------------------------------------------ | ----: | --------------------: | -----: | ----: |
| The root's `yarn lint`                     |  57 s |                  68 s |   68 s |  74 s |
| Brick Fuzz Pop's specs (one file or a few) | 8.9 s |                 7.3 s | 10.1 s | 7.8 s |
| Asteroid Breaker's `test`                  |  41 s |                  41 s |   42 s |     – |
| Brick Breaker's lint, typecheck and test   |  48 s |                  51 s |   54 s |     – |

More than three heavy checks at once was rare, because agents spend most of their time with the model.

**Nor was the API.** Output ran at 105 tokens a second with no other request in flight, and at 105 with five or more. Two or more others were in flight for half of the model's seconds.

**How many were busy:**

| Workers busy at once | Brick Fuzz Pop (22.4 h up) | Brick Breaker uplift (12.0 h) |
| -------------------- | -------------------------: | ----------------------------: |
| None                 |                         6% |                           22% |
| 1–2                  |                        26% |                           14% |
| 3–4                  |                        37% |                           64% |
| 5 or more            |                        31% |                            0% |
| Mean                 |                        3.3 |                           2.6 |

**What each level produced,** in half-hour windows:

| Workers busy | Brick Fuzz Pop: windows | Commits an hour | A busy worker-hour | Brick Breaker uplift: windows | Commits an hour | A busy worker-hour |
| ------------ | ----------------------: | --------------: | -----------------: | ----------------------------: | --------------: | -----------------: |
| 1–2          |                       8 |             1.5 |                1.0 |                             2 |             3.0 |                2.2 |
| 2–3          |                      10 |             3.6 |                1.4 |                             2 |             5.0 |                2.1 |
| 3–4          |                       9 |             6.0 |                1.7 |                            13 |             8.5 |                2.3 |
| 4–5          |                       9 |             7.8 |                1.7 |                             1 |            10.0 |                2.5 |
| 5 or more    |                       7 |             6.9 |                1.3 |                             – |               – |                  – |

- **Four at once is worth having.** The Brick Breaker uplift made 8.5 commits an hour with three to four busy, about four times one worker's rate.
- **Past five, Brick Fuzz Pop made no more.** That row is seven windows of one build, and the other build was capped at four, so it is a sign, not a proof.
- **Width ran out before the machine did.** For 70% of the time Brick Fuzz Pop was up, at least one stream had reported and was waiting: 32 hours in all, most of it in waits of over half an hour. The orchestrator was itself busy for 10 of those hours and waiting on other agents for 19. So most of that waiting was one stream waiting on another's work, which more agents would not have shortened.

**What scales with the number of agents, not with the work:**

- **Ramp-up:** 7.4 minutes, 56 requests and $3.72 for each worker, 16% of what the Brick Breaker uplift's workers cost.
- **Small packages,** in the Brick Breaker uplift:

  | A worker that made                     | Brick Breaker uplift: workers | A commit | Busy minutes | Brick Fuzz Pop: workers | A commit | Busy minutes |
  | -------------------------------------- | ----------------------------: | -------: | -----------: | ----------------------: | -------: | -----------: |
  | 1–2 commits                            |                             7 |   $14.20 |         33.8 |                       6 |   $11.50 |         28.0 |
  | 3–4 commits                            |                            13 |   $10.10 |         25.7 |                       1 |   $13.70 |         37.4 |
  | 5–9 commits                            |                             3 |    $9.80 |         23.0 |                       – |        – |            – |
  | 10 or more (a stream, 7.5 compactions) |                             – |        – |            – |                       6 |   $13.60 |         39.2 |

  Brick Fuzz Pop does not show the same step: its six short-lived workers were its cheapest. What it shows is the other end, the streams.

- **Landing:** about 9 minutes of the orchestrator for each package, with a rebase, the checks again, a log entry and often a review of that entry.

**So is it better not to over-parallelize?** On this evidence yes, with the caveat above on how thin one part of it is. More than four or five at once added waiting and, as far as seven windows can say, no commits. In the one build that varied its package sizes, a package of one or two commits cost four tenths more per commit than a larger one. But long-lived agents are not the cure either: the streams that made ten or more commits each were the slowest per commit and among the dearest, compacting 7.5 times on average. The best figures here belong to a fresh agent that makes three to nine commits and compacts at most once.

## Recommendations and experiments

Baselines to beat, from the Brick Breaker uplift: **$11.30 a commit all told; a worker's 26.5 elapsed minutes and 0.70 context rewrites a commit; $2.47 and 6.1 minutes a review; source changed after 68% of the reviews of code a worker waited on.** Across all seven, a review's median is 43 tool calls.

### 1. Stop blocking on reviews

- **The change.** In `commit-review-process`, the author stages the change, starts the reviewer with `run_in_background`, and goes on: the next change's reading, or the long checks. It answers the review when the report arrives, and a fix that lands after the commit goes in as a `fixup!` the orchestrator squashes at landing.
- **Why.** 30 agent-hours blocked, and 194 rewrites at $247 because a review outlasts the 5-minute cache. The Brick Breaker uplift's workers ran 31 of 73 reviews this way and were blocked 3.8 minutes a commit against Brick Fuzz Pop's 8.5.
- **Expected.** About 5% of spend and up to 12% of busy time (est.).
- **Measure.** A worker's elapsed minutes and its rewrites a commit, in `summarize.py`'s section 7. The minutes blocked on a reviewer fall to nothing by definition, so they are not the test: a worker that starts its reviewer in the background and then only waits has gained nothing. The count of commits leaves `fixup!` commits out, so they do not flatter the figures; section 7 counts them apart.
- **Quality.** The same review, answered the same way. The risk is a worker building on a change its reviewer then faults, so keep the next change small until the report is in. One measure is lost: what an author changes after a review no longer tells the review's effect from the next change's work. Count the `fixup!` commits that follow a report instead.

### 2. An agent type for reviews

- **The change.** A `commit-reviewer` agent definition, kept under `.agents/` and linked into `.claude/agents/` as the skills are, since `.claude/` is not tracked here. It has:
  - the shell as its only tool, and no Read tool. The harness loads a folder's whole `AGENTS.md` when a file there is opened with Read, and a game's is 25,000 to 52,000 tokens today;
  - a system prompt that holds the repository-wide rubric, the rules for code, doc comments and specs from `.agents/AGENTS.md`, in two or three thousand tokens, in place of "read first" and its list of files;
  - the workspace's rules that bear on the change, quoted in the brief by the author, who already holds them;
  - a line asking for the diff and the files it touches in one command, and independent reads together.
- **Why.** A review starts at 53,000 tokens, reads 78,000 more in 43 single calls, and averages 147,000 a request. A fifth of what it reads is `AGENTS.md` files, the harness loaded one for 299 of the 604 as well, and 265 held one twice.
- **Expected.** A quarter to a third of what reviews cost, so 7 to 9% of spend (est.). Not minutes: a review's 38,000 tokens of output take six minutes to write however little it reads.
- **Then try `high` effort for it.** 71% of a reviewer's output is thinking, a fifth of what a review costs and most of its minutes, so this is also what could bring a review inside the cache's 5 minutes. Run both efforts over the same 20 staged changes and compare the findings, the behaviour bugs above all. Keep `xhigh` unless the lists match.
- **Measure.** Requests, peak context, cost and minutes per review in section 5, and findings per review in `extras.py`. The side-by-side on the same staged changes is the real test of quality, since this reviewer no longer reads a workspace's whole `AGENTS.md`: run the old review and the new over the same 20 changes before adopting it.

### 3. Docs on a budget, briefs with excerpts

- **A budget for each `AGENTS.md`,** which also bounds what the harness loads into every agent that opens a file there, enforced where `check-skill-references.mjs` already runs: say 25 KB, 10,000 tokens, for a game. What a file outgrows moves into a skill, which loads only when its trigger matches. The finishing step's audit becomes "audit and prune".
- **A brief that carries its context.** The orchestrator has read the plan, so a package's brief quotes the plan's section for it and names the files and line ranges to read, in place of "read the plan, the `AGENTS.md` files, the skills and the last packages' logs". Those four are 45% of the 146,000 tokens a worker reads before its first edit.
- **Review answers in the commit's body, not a log.** The skill already allows it. Then no log is written, re-read by the next package, or reviewed. Keep the orchestrator's log, and have it record each agent's tokens, tool uses and duration from its completion notice, so the next audit does not depend on transcripts that may be cut.
- **Turn off the plugins this project never uses.** Their skills are most of the 12,000-token list in every agent's first request.
- **Expected.** 10 to 15% of what workers cost (est.), and it stops the growth from compounding.
- **Measure.** A worker's context at its first edit and what it is made of (`extras.py`), mean context per request (section 3), the files' sizes.

### 4. Four at once, three to nine commits a package, a fresh agent each

- **Keep the cap at four.** Five only when five packages are ready with nothing between them.
- **Fold a package of one or two commits into its neighbour,** and split one that would pass about nine.
- **No long-lived streams.** A stream's next package gets a fresh agent and the last one's summary, as the two uplifts did.
- **Expected.** A few percent of spend; mostly it avoids the dearest patterns in the tables above.
- **Measure.** The cost-by-package-size and commits-against-busy-workers tables in `extras.py`, and the hours workers wait for the orchestrator in section 2b.

### 5. Fewer, faster checks per commit

- **One `yarn verify:changed` before a review,** in place of the workspace's lint, typecheck and specs in turn and then the root's lint. Update the skill's step 1 and the plans' check lists to match.
- **The root's lint once a package,** before the hand-back, since the orchestrator runs it at landing.
- **Mutants from one shared script, with a time limit,** if a plan asks for them at all.
- **A cache of passes** (the local pipeline audit's #5) now has a second reason: the orchestrator re-runs on a rebased tree what the worker just passed.
- **Expected.** About 2 of the 8 to 9 check minutes a commit (est.). Few tokens.
- **Measure.** Check minutes and root lints per commit in section 7.

### 6. Batch the reads

- **The change.** One line in the workers' and reviewers' briefs: read what you already know you need in one command or in parallel calls.
- **Why.** 92% of requests carry one tool call, half of a worker's reads return under 1,500 characters, and each request re-reads the whole context.
- **Expected.** A tenth to a fifth fewer requests, so 5 to 10% of spend (est.). Little time: a request costs next to none of its own.
- **Measure.** Tool calls per request in section 3.

### 7. A watchdog for the night

- **A phone notification when a build has made no progress for 20 minutes.** The Asteroid Breaker uplift's orchestrator set itself timers to check on its agents, which is the right habit, but a timer cannot interrupt a call that hangs, and nothing told the user either build had stopped.
- **No call without a timeout on the orchestrator's path.** The 7.7-hour hang was a connector call that tidied up a timer; it did not need to block.
- **Expected.** The 14 hours of wall-clock above, on a bad night.

### Considered and set aside

- **Fewer reviews of code.** A worker changes source after about seven in ten, and quality is the point. Skipping the review of work logs is the only cut proposed.
- **A cheaper model for reviewers.** It would halve their price, but with unknown effect on what they find. Worth a side-by-side on the same 20 changes some day, after recommendation 2.
- **Fast mode.** About 2.5 times the output speed at twice the price. The model is 54% of busy time, so it would cut a commit's time by up to a third while doubling spend.
- **A longer cache for subagents.** The logs show no setting for it. If there were one, a 1-hour write's 60% premium on every other write would give back about $180 of the $417 it saved. Not blocking saves more and costs nothing.
- **A lower compaction threshold.** It would cap the dearest requests, but compaction loses detail mid-package. Smaller contexts from recommendation 3 get there without that.
- **More than five workers.** See [Parallelism](#parallelism).

### An order to try them in

1. **Before the next build:** 1, 2 without the effort change, 5 and 6. They are edits to one skill, one agent definition and the briefs.
2. **In the next build's plan:** 3's briefs and 4's package sizes. Run half the packages on the old review and half on the new, and compare cost and minutes per commit, findings per review, the fixups that follow a report, and what the finishing audit and CI catch afterwards.
3. **As its own small task:** 3's budget and pruning for the three largest `AGENTS.md` files, and 7.
4. **Once 2 has settled:** the effort comparison.

## Running it again

```sh
export AUDIT_DATA=/home/dev/Projects/personal/agent-efficiency-audit-2026-11-16/data
python3 scripts/extract.py ~/.claude/projects "$AUDIT_DATA/agents"
python3 scripts/build.py       # agents.json and spans.json
python3 scripts/profile.py     # who was busy, minute by minute
python3 scripts/summarize.py   # the tables above
python3 scripts/extras.py      # lock waits, ramp-up, package size, API speed, reviews
python3 scripts/concurrency.py # a check's duration against what else ran
```

- **`AUDIT_DATA` must be set.** The extracted logs are 140 MB and stay outside the repository, in the folder it names; every script but `extract.py` reads and writes there. [`data/`](data/) holds what each script printed for this report.
- **A new effort** needs its session's id and a name in `EFFORTS`, in `scripts/lib.py`, and a model family the efforts did not use needs its prices in `PRICE` there; `build.py` says which requests it could not price.
- **`concurrency.py`** prints the 14 commonest checks, or the ones named as arguments (`'ROOT:lint' 'asteroid-breaker:test'`); `data/check-vs-load.txt` holds the nine the table above draws on.
- **The scripts** need Python 3.10 or later and nothing else.
