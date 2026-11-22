# bug-and-brick-breaker-add: scorecard

- 2026-11-22 06:09 to 2026-11-22 13:00 UTC
- 95 agents (6 helper, 1 main, 72 reviewer, 16 worker)
- 6 helper on opus-5-5 at xhigh; 1 main on opus-5-5 at xhigh; 72 reviewer on opus-5-5 at high; 16 worker on opus-5-5 at xhigh

## At a glance

|                                              | This run | brick-breaker-uplift (baseline) | player-text (the run before) |
| -------------------------------------------- | -------: | ------------------------------: | ---------------------------: |
| Cost at list prices                          |     $338 |                            $868 |                         $254 |
| Share of a week's allowance (est.)           |    18.7% |                           44.2% |                        12.9% |
| Weekly limit's change while it ran (read)    |   12 pts |                               – |                            – |
| Wall-clock hours                             |      6.9 |                            12.0 |                         60.7 |
| Hours up, outages left out                   |      6.9 |                            12.0 |                         15.4 |
| Agent-hours lost to outages                  |        0 |                               0 |                         45.3 |
| Agent-hours busy                             |     19.7 |                            43.4 |                         14.2 |
| Commits                                      |       89 |                              79 |                           30 |
| Lines of source and specs changed            |   23,168 |                          29,358 |                        5,819 |
| Cost a commit                                |    $3.80 |                          $10.99 |                        $8.46 |
| Cost per 100 lines changed                   |    $1.46 |                           $2.96 |                        $4.36 |
| Week's allowance a commit (est.)             |    0.21% |                           0.56% |                        0.43% |
| Week's allowance per 1,000 lines (est.)      |    0.81% |                           1.51% |                        2.22% |
| Busy agent-minutes a commit                  |     13.3 |                            32.9 |                         28.3 |
| Busy agent-minutes per 100 lines             |      5.1 |                             8.9 |                         14.6 |
| Output tokens a line changed                 |      186 |                             300 |                          415 |
| An author's elapsed minutes a commit         |     13.3 |                            26.5 |                         23.1 |
| with the model                               |      6.6 |                            10.9 |                          7.9 |
| in checks                                    |        5 |                             8.4 |                          9.8 |
| of that, a check waiting its turn            |        1 |                               – |                            – |
| blocked on a review or subagent              |        0 |                             3.8 |                          3.2 |
| Check commands a commit                      |      7.6 |                            13.8 |                          3.7 |
| Context rewrites a commit                    |     0.09 |                            0.70 |                         0.70 |
| A review, median                             |    $0.53 |                           $2.47 |                        $1.73 |
| A review's minutes, median                   |        2 |                             6.1 |                          3.8 |
| Reviews' share of the cost                   |      12% |                             28% |                          25% |
| A worker's context at its first edit         |     204k |                            265k |                         219k |
| An author's mean context a request           |     266k |                            269k |                         207k |
| Authors' requests with one tool call         |      93% |                             94% |                          96% |
| Hours checks waited on a lock or their queue |     1.40 |                            1.26 |                         3.66 |
| Most authors busy at once                    |        5 |                               5 |                           10 |

Commits are counted from git. Authors are workers.

## Where the hours went

| Agent-hours                        | Hours | Of busy |
| ---------------------------------- | ----: | ------: |
| model                              |  12.1 |     62% |
| checks                             |   5.9 |     30% |
| idle: agents                       |   4.6 |       – |
| other tools                        |   1.3 |      6% |
| idle: its own background task      |   0.6 |       – |
| idle: timer                        |   0.4 |       – |
| wait: background job               |   0.3 |      2% |
| idle: user                         |   0.2 |       – |
| idle: waiting for the orchestrator |   0.1 |       – |
| wait: reviewer or subagent         |   0.1 |      0% |
| idle: other                        |   0.0 |       – |

## Where the tokens went

| Role               | Requests | Cost | Output | Cache reads | Cache writes | Mean context | One tool call |
| ------------------ | -------: | ---: | -----: | ----------: | -----------: | -----------: | ------------: |
| The session itself |      413 |  $39 |     $8 |         $22 |           $8 |         271k |           79% |
| Workers            |    2,645 | $236 |    $55 |        $139 |          $42 |         266k |           93% |
| Reviewers          |      775 |  $41 |    $18 |          $6 |          $18 |          41k |           93% |
| Helpers            |      375 |  $22 |     $5 |         $12 |           $6 |         157k |           87% |
| **All**            |    4,208 | $338 |    $86 |        $178 |          $74 |              |               |

Output is 26% of the cost (12% thinking), cache reads 53%, cache writes 22%.

## Context rewrites

A request that wrote most of its context to the cache again, by what its agent had been waiting on.

| Waiting on                                        | Times |  Cost |
| ------------------------------------------------- | ----: | ----: |
| worker: a check or script over 5 min              |     2 | $3.35 |
| worker: a background task or subagent             |     2 | $2.79 |
| worker: a background job                          |     1 | $1.65 |
| worker: nothing (under 5 min; the prefix changed) |     1 | $0.27 |

## Reviews

|                                                 |                      |
| ----------------------------------------------- | -------------------: |
| Reviews                                         |                   72 |
| Minutes, median (90th percentile)               |            2.0 (3.1) |
| Longer than the cache's 5 minutes               |                    1 |
| Cost each, median                               |                $0.53 |
| Cost in all                                     | $41 (12% of the run) |
| Tool calls, median                              |                   11 |
| Largest context, median                         |                  52k |
| Read from tools, median                         |                  35k |
| Written, median                                 |                  11k |
| Started in the background                       |                   71 |
| After the 1 an author waited on: source changed |                 100% |
| only docs changed                               |                   0% |
| nothing changed                                 |                   0% |

Authors answered reviews in 58 `amend!` commits, 55 of them carrying a fix.

## Checks

| Check     | Runs | Hours | Failed |
| --------- | ---: | ----: | -----: |
| verify    |  173 |  3.84 |      8 |
| test      |  304 |  0.86 |     78 |
| format    |  233 |  0.59 |     25 |
| mutation  |   21 |  0.29 |      6 |
| typecheck |   56 |  0.15 |     14 |
| lint      |   53 |  0.09 |     11 |
| coverage  |   38 |  0.07 |      4 |
| build     |   19 |  0.05 |      0 |
| layout    |    3 |  0.00 |      0 |

- `verify:changed`'s queue: 77 of 172 runs waited, 1.4 h in all (134 s at the 90th percentile, 261 s at most). 172 of the 172 runs kept only part of their output, or none, where the line that names a wait is lost. 77 of the waits, 1.4 h, are worked out from calls that overlapped: read them as estimates.

## Workers

- 16 workers: 3 made 1-2 commits, 1 made 10+ commits, 5 made 5-9 commits, 7 made 3-4 commits; 7 compacted. A worker's median: $14.91 and 42.8 busy minutes.
- To its first edit, a worker's median (16 measured): 7.2 minutes, 34 requests, $2.82, 204k of context.
- Busy at once: 2.21 on average, 5 at most.

## What it landed

| Kind of file | Files | Lines added | Lines deleted |
| ------------ | ----: | ----------: | ------------: |
| source       |   141 |       7,943 |           747 |
| specs        |    93 |      13,780 |           698 |
| docs         |    14 |       3,702 |             5 |
| assets       |    16 |           0 |             0 |
| generated    |     1 |          13 |             0 |

- `/home/dev/Projects/personal/fuzzley-games`: 89 commits (45 feat, 31 docs, 6 test, 3 fix, 2 refactor, 1 perf, 1 chore), de3937a1..31dfef98.
- The range is the refs given by hand.

## The weekly limit

- **About 18.7% of a week's allowance (est.).** A week is taken as $1,812 at list prices, from the account's reading of 62% with $1,124 logged that week.
- The week stood at about 44% (est.) when the run began, and resets Nov 25 02:00 UTC.
- **Read from the account:** 50% of the week used at the start, 62% at the end, a change of 12 points for the whole account, while this machine logged $339 ($28 a point). The share is a whole number, so a small run's change is within a point either way.
- Fable's own weekly allowance: 64% to 64%.
- Every session on this machine logged $342 while the run was going.
- The estimate is rough: the limit is not priced in dollars, use from other devices is not in these logs, and a log that lost its start makes a week look smaller.

## Notes

- 9 compactions.
- 4,495 tool calls; 41% of 1,786 reads and searches returned under 1,500 characters.
- A subagent's first request listed 69 skills, about 12k tokens.
- Instruction files the harness loaded by itself, an agent's median: 33k tokens for the session itself, 11k tokens for a worker, 0k tokens for a reviewer, 0k tokens for a helper.
