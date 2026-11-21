# Agent efficiency: the plan

Written on 2026-11-21, after [the audit](report.md) and its re-run. The audit recommends seven changes to how a multi-agent build runs here, and none of the first six is built. This plan builds them in seven stages, each small enough to check on its own, and measures each with the `measure` plugin the audit ends with.

The stage that prunes the `AGENTS.md` files comes last. It is the largest and the least mechanical: a review, with you, of every `AGENTS.md` file, every skill and every plugin, to decide what is cut and what rules govern adding to them from here on.

## In short

| Stage | What                                              | The audit's | Touches                                  |
| ----- | ------------------------------------------------- | ----------- | ---------------------------------------- |
| 1     | One `yarn verify:changed` a commit, no lock       | 5           | `commit-review-process`                  |
| 2     | Reviews in the background                         | 1           | `commit-review-process`, the plugin      |
| 3     | A `commit-reviewer` agent type, and its effort    | 2, 6        | `.agents/`, the replay set               |
| 4     | A skill for how a build runs                      | 3 to 7      | a new skill                              |
| 5     | A build's state, to check by hand                 | 7           | the plugin, outside the repository       |
| 6     | The first measured build, to be chosen            | all         | that feature's plan                      |
| 7     | The standing docs, skills and plugins: the review | 3           | every `AGENTS.md`, every skill, settings |

- **Stages 1 to 5 change no game code.** They edit two skills, the scripts under `.agents/`, one agent definition and the plugin. Each is a branch of one to four commits, reviewed by `commit-review-process` and merged when you ask.
- **Stage 6 is the test.** Nothing before it is proven: every saving in the audit is an estimate from logs.
- **Stage 7 runs after that build,** so the build gives a before-figure for what the pruning buys.

The figures to beat, from the Brick Breaker uplift, which is the plugin's baseline run:

| Per commit, or per review            | Now    | Hoped for (est.) | Stage |
| ------------------------------------ | ------ | ---------------- | ----- |
| Cost a commit, all told              | $11.30 | about $9         | all   |
| A worker's elapsed minutes a commit  | 26.5   | about 21         | 1, 2  |
| A worker's context rewrites a commit | 0.70   | under 0.3        | 1, 2  |
| Check commands a commit              | 13.8   | 4 or fewer       | 1     |
| A review's cost                      | $2.47  | about $1.50      | 1, 3  |
| A review's minutes                   | 6.1    | under 5          | 1     |
| Requests that carry one tool call    | 92%    | under 80%        | 3, 4  |
| A worker's context at its first edit | 265k   | under 200k       | 4, 7  |
| A subagent's first request           | 53k    | about 40k        | 7     |
| Every `AGENTS.md` together           | 557 KB | under 300 KB     | 7     |

One build is one data point. A figure that moves by a tenth on one build has not moved. And stage 6 turns stages 1 to 5 on together, so the last column says which stage should move a figure, not which one a single build can prove did.

## Decisions

Settled with you on Nov 21:

1. **A change is committed before its review.** Stage 2 has the author commit, start the review in the background, and fold the fixes in afterwards as `amend!` commits, the kind of `fixup!` that also rewrites the message, squashed before the package lands. So "reviewed before it is committed" becomes "reviewed and answered before it lands".
2. **Linking outside the repository is an option, off by default.** Run plainly, the link script links only inside the repository, for everyone. A probe showed that an agent definition in the repository's `.claude/agents/` is offered only to a session started inside the repository, and every build so far started one folder above it, in `~/Projects/personal`. So whoever starts sessions from another folder runs the script with a flag that names that folder (stage 3c). Nobody else's machine gets a link outside the clone.
3. **One skill for how a build runs,** `multi-agent-build`, in place of the sections on running in parallel and on checks that each plan has copied forward.
4. **No notification from outside the orchestrator.** You will look in on a build by hand now and then. So stage 5 makes that look quick and plain, and sends nothing anywhere.
5. **The reviewer runs at `high` effort.** On the first comparison ([stage 3a](#stage-3-a-commit-reviewer-agent-type-and-its-effort)) it found all 20 planted defects that `xhigh` found, at about half the cost and time. The set could not have shown a small loss, and that risk is taken with eyes open: stage 6 watches what the finishing audit and CI catch.
6. **The test build is not chosen yet.** Stage 6 is not work of its own; it is the first feature built the new way, measured. Which feature that is will be decided later.
7. **The budgets and the rules** wait for stage 7, which settles them with you file by file.

## How each stage is done

- **A branch off `main`** for each stage, named for it (`agent-efficiency-1-checks`).
- **`yarn verify:changed`** before each commit. A change to Markdown alone reaches no workspace, so it runs the root's checks: lint, which holds the skills' and `AGENTS.md` references, Prettier and the root's typecheck.
- **A review of each commit** by `commit-review-process`, as it stands at that stage.
- **Merged when you ask,** by `merge-to-main`.
- **This plan gains a "Where it stands" line** under each stage as it is built, and an "As built" section at the end, as the other plans have.

## Stage 1. One check a commit, and no lock

The audit's recommendation 5. The smallest change, and it stands alone.

**What is so now.** `commit-review-process` step 1 lists each touched workspace's `lint`, `typecheck` and `test`, and then the root's `yarn lint`. A Brick Breaker worker ran 13.8 check commands a commit and spent 8.4 minutes in them. `yarn verify:changed` has since landed. It runs the root's checks beside each changed workspace's, sized to the cores and the free memory, in 38 to 41 s for one game changed. It compares a branch with `origin/main` unless told otherwise, so in the middle of a build, where a worker's branch already carries the packages before it and often a change to a shared library, it would check every workspace. The player-text rewrite used it and ran 3.7 check commands a commit, then lost the time to one lock shared by ten worktrees: 3.66 hours of waiting.

**Steps:**

1. **Time four at once, light and heavy.** Make four worktrees. In the light case each changes one file of a different game. In the heavy case each also changes a file under `frontend/lib/`, which reaches every workspace. Run `yarn verify:changed` in all four together, then in each alone, for both cases. Record each run's seconds and peak memory (`/usr/bin/time -v`). The machine has 24 cores and 23 GB. This costs no model usage.
2. **Decide the lock from that.** If four together finish within about a half more than one alone and nothing is killed for memory, a build uses no lock. If memory runs short in the heavy case, a lock that lets two through: two lock files, and a run takes whichever is free. A run that passes five minutes is a context rewrite again, so the heavy case decides.
3. **Rewrite step 1 of `commit-review-process`:** once `yarn verify:changed` passes, from `frontend/`, stage the change. No other check, and no run of the root's lint on its own. In a build the command takes `--base <the integration branch>`, so it checks what this package changed and not everything the build has landed.
4. **Change the brief's third sentence to match:** "The author has run `yarn verify:changed`, and it passes."
5. **Have the skill start its reviewer at `high` effort** (decision 5), by the Agent tool's `effort`. Until now a reviewer took the session's effort, which was `xhigh` in the seven builds.
6. **Leave `merge-to-main` alone.** Merging still takes `yarn verify:full`.

**What it does not cover.** A coverage floor at a package's last commit is still `yarn verify:changed --coverage`. Mutants are stage 4's.

**Measure.** Check commands and check minutes a commit, and the context rewrites that follow a check, on the stage 6 build's scorecard.

**Done when** the skill names one command, and step 1's timings are written here.

## Stage 2. Reviews in the background

The audit's recommendation 1. With the reviewer at `high` (decision 5) the gain is a worker's minutes, 3 to 4 a commit and up to 12% of its busy time. It is no longer the 5% of spend the audit gave: that was the rewrites below, and they go with the shorter review.

**What is so now.** The author stages a change, starts the reviewer and waits. Workers were blocked 30 agent-hours across the seven efforts. A review took 6 to 7 minutes and a subagent's cache lasts 5, so the worker then wrote its whole context again: 194 times, $247. At `high` no review in the replay passed five minutes, and in the player-text rewrite 2 of 19 rewrites followed a review. A worker there still stood blocked for 3.2 minutes a commit.

**The design.** A staged diff cannot hold still while its author works on, so the change is committed first:

1. **The author commits the change** once `yarn verify:changed` passes, with its message in final form.
2. **It starts the reviewer in the background** (`run_in_background`) on that commit. The reviewer reads `git show <sha>`, and a file as it was at that commit with `git show <sha>:<path>`.
3. **It goes on to the next change,** keeping it small until the report is in.
4. **When the report arrives, it answers every finding** in an `amend!` commit, which carries the fix and the commit's new message, its answers in the body. `git commit --fixup=amend:<sha>` would make one, but it opens an editor and refuses `-m`. So an agent writes it by hand: a message file whose first line is `amend! <the commit's subject>` and whose rest is the whole new message, then `git commit -F <file>`, with `--allow-empty` where there is an answer and nothing to fix.
5. **Before it reports its package done,** it runs `git rebase --autosquash --keep-base <the branch it left>` on its own branch, in its own worktree, with `GIT_EDITOR=true`, and `yarn verify:changed` on the result. `--keep-base` squashes without also moving the branch. So the orchestrator lands whole, reviewed commits and no `amend!`. The recipe was tried on Nov 21 in a scratch repository, on git 2.47.

**The rules that keep it safe:**

- **At most two changes wait on a report at once.** With two out, the author waits.
- **A fix that reshapes a change** still earns a second review, as now.
- **A squash that conflicts** is settled by the author, and what the conflict changed is reviewed again.
- **One change on its own,** such as a doc fix in a session with nothing else to do, keeps the present flow: stage, review, answer, commit.

**Steps:**

1. Rewrite steps 2 and 3 of `commit-review-process` to this, with the present flow kept as the short case. Its description, its opening line and step 1's heading say "before it is committed" and "staged", and change with them.
2. Change the brief's first lines: "Review the commit `<sha>`…", and "the author is working on in the same checkout, so read a file with `git show <sha>:<path>`".
3. Try it by hand in one session: two small real changes, the second begun while the first is in review. Check that the squashed history is what a foreground review would have left.
4. In the plugin, count the `amend!` commits a run's logs show being made, by worker. After the squash git no longer shows them, and they are this stage's measure of what a review changed.

**Measure.** A worker's elapsed minutes and context rewrites a commit. Not the minutes blocked on a reviewer, which fall to nothing by definition. For quality: `amend!` commits that carry a fix, for each report, against the 68% of reviews after which a Brick Breaker worker changed source.

**What it risks.** A worker building on a change its reviewer then faults. The limit of two and the small next change bound it.

**Done when** the skill is rewritten, the trial in step 3 is written up here, and the plugin counts `amend!` commits.

## Stage 3. A `commit-reviewer` agent type, and its effort

The audit's recommendation 2, with recommendation 6 for reviewers: 7 to 9% of spend.

**What is so now.** A review is a `general-purpose` agent told to "read first" a list of `AGENTS.md` files and skills. It starts at 53,000 tokens, reads 78,000 more over 43 calls one at a time, and a fifth of what it reads is `AGENTS.md` files. When it opens a file with the Read tool the harness loads that folder's whole `AGENTS.md` as well, so 265 of 604 reviewers held one twice.

**3a. The effort comparison, on the present review.** It needed nothing built, and its first run is in: the replay set's 20 staged changes through the present brief at `xhigh` and at `high`, one review a case.

| A review                            |  `xhigh` |   `high` |
| ----------------------------------- | -------: | -------: |
| Planted defects found               | 20 of 20 | 20 of 20 |
| Findings beyond the planted, in all |       56 |       48 |
| Cost (median)                       |    $1.25 |    $0.66 |
| Minutes (median)                    |      3.9 |      1.8 |
| Tool calls (median)                 |       26 |       12 |
| Reviews over five minutes           |  5 of 20 |  0 of 20 |

- **What it shows.** `high` lost nothing on these defects, cost half, and never outlasted the cache. The whole table is in [the report](report.md).
- **What it cannot show.** Both arms found all 20, the hardest five among them, so the set has no room to show a loss. The same goes for 3d: an agent type that scored 20 of 20 here would have proved little.
- **What differs** is the findings nobody planted: 56 against 48, six and four of them of behaviour, two the same in both. None was checked against the code.

**Decided on this:** the reviewer runs at `high` (decision 5), from stage 1 on. What the set still owes is a fair test of the agent type in 3d, and for that it needs a few defects of the one kind that type could miss:

1. **Plant five more defects that break a rule only a workspace's `AGENTS.md` states.** The new reviewer no longer reads that file whole, so these are where it would fall short.
2. **Run the present review at `high` over them,** for the figure 3d is set beside.

**3b. The agent definition.**

1. **Write `.agents/agents/commit-reviewer.md`.** Its frontmatter gives it the shell as its only tool, Opus, and `high` effort. Its body, in two to three thousand tokens, holds:
   - what a review is for, the four heads every review has now, and the report's form and its 900 words. The fifth head, a player's words, comes in the brief of a change that touches them;
   - the repository-wide rules for code, doc comments and specs, condensed from `.agents/AGENTS.md`;
   - how to read: the diff and the files it touches in one command, independent reads together, never one file a call;
   - what it must not do: run checks, change, stage or commit anything.
2. **Shrink the brief in `commit-review-process`** to what only the author knows: the path and the commit, the project and the change in two or three sentences, and the workspace's rules that bear on this change, quoted, in 300 words or fewer. The clause on a player's words goes into the brief only where a change touches them.
3. **Measure what it starts with** before going further. Run the definition once through the replay harness (`agent_file` copies it into a case's checkout) and read its first request from the log: the tokens it starts at, whether the skill list is still in it, whether `effort` in the frontmatter took, and whether any `AGENTS.md` was loaded for it. These four are guesses until then.

**3c. Loading it.** `.claude/` is not tracked, so the definition is linked in as the skills are.

1. **`link-claude-skills.mjs` links `.agents/agents/*.md` into the repository's `.claude/agents/`,** and prunes a link whose definition is gone, as it does for skills. That is all it does when run plainly: no link leaves the repository.
2. **An option links them into one more folder** (decision 2): `node .agents/link-claude-skills.mjs --also-in <folder>` adds the same links to `<folder>/.claude/agents/`, for a session started there.
   - It is a flag on the one script, run by hand by whoever wants it. No `package.json` entry and no install step runs it, so it is never on for everyone.
   - The folder is not written down in the repository. It is one machine's choice, like `.claude/` itself.
   - It links agent definitions only. Skills need no link there: a session started above the repository already finds its skills once it works on a file inside.
   - In that folder it touches only links that lead back into this repository, and leaves whatever else is there. `--also-in <folder> --remove` takes them out again.
3. **`check-skill-references.mjs` checks a definition's links and backticked paths,** and warns outside CI about a definition with no link inside the repository. It knows nothing of the option's folder.
4. **`.agents/AGENTS.md` gains one bullet** under Agent Configuration: where definitions live, that the link script loads them, and the option for a session started elsewhere.
5. **`commit-review-process` launches `commit-reviewer`.** Where that type is not offered, it says why and what to do: start the session inside the repository, or run the link script with `--also-in` and the folder the session starts in, and start again. It does not fall back in silence, or a build would run the old review unnoticed.

**3d. The side-by-side.** One new arm, `agent-high`, over the 20 cases and 3a's five more, beside the present review at `high`.

- **The quoted rules.** A replay case has no author to quote the workspace's rules. A helper that has not seen the planted defects writes each case's quote by one recipe: the bullets and paragraphs of the workspace's `AGENTS.md` that name a path the change touches, up to the brief's 300 words. So a quote cannot point at a defect. A heading will not do as the unit: the largest file's "Layout" section alone runs to 1,350 lines.
- **Adopt the agent type if** it finds as many of the first 20 planted defects as the present review, give or take one, misses none of 3a's five that the present review finds, each of those run twice, and a review costs a quarter less or better. Where it misses more, look at which: a missed defect of practice or docs most likely means a rule the rubric lacks, or one the author's quote should have carried. Mend that and run the arm again.
- **A cheaper model** is one more arm, `agent-sonnet`, if you want it tried while the set is warm. The audit set it aside until after this stage.

**What it costs.** The first two arms cost $41 at list prices, 2% of a week: $27 at `xhigh` and $14 at `high`. What is left, one new arm, five more cases on two arms and a second run where it is close, is 1 to 2% more.

**Measure.** The replay report for quality. On the stage 6 build: a review's cost, minutes, requests and peak context.

**What it risks.** A reviewer that no longer reads a workspace's whole `AGENTS.md` misses a rule nobody quoted. The side-by-side is the guard, and so is the rubric's upkeep: from this stage on, a change to the rules for code, doc comments or specs in `.agents/AGENTS.md` changes the rubric in the same commit.

**Done when** the definition, the scripts and the skill are merged, and the arms' report is in this file.

## Stage 4. A skill for how a build runs

The audit's recommendations 4 and 6, the briefs and the commit-body answers of 3, and the parts of 5 and 7 that are rules for a build. A few percent of spend each, and it stops the dearest patterns.

**What is so now.** Each plan carries its own "Running it in parallel" and "Budgets and checks", copied from the last. They tell a worker to read the plan, the `AGENTS.md` files, the skills and the last packages' logs, which is 45% of the 146,000 tokens it reads before its first edit. They set per-workspace checks under a shared lock, and a work log for each stream.

**Steps:**

1. **Draft `multi-agent-build`** from what the three latest code plans share and the audit changes. In 8 KB or less:
   - **Before it starts.** `/measure start <name> --trying <numbers>`. The plugin prints the week's share used. A commit is about 0.6% of a week, so a plan of 60 commits needs about 35% free. Check that `commit-reviewer` is offered.
   - **Packages.** Three to nine commits each. One of one or two commits is folded into its neighbour, and one past nine is split. Each gets a fresh agent and the last agent's summary; no agent is kept alive across packages.
   - **Width.** Four workers at once. Five only when five packages are ready with nothing between them.
   - **The brief.** It quotes the plan's section for the package, names the files and line ranges to read, and quotes the workspace's rules that bear on it. It says not to read the plan, the other packages' work or an `AGENTS.md` whole. It carries one line on reading: what you already know you need, in one command or in parallel calls. A template is in the skill.
   - **Tags.** `[worker pkg=3]`, `[review pkg=3 arm=new]` and `[helper]` in each agent's description, which the plugin reads.
   - **Checks.** Stage 1's one command and its answer on the lock. Mutants, where a plan asks for them, come from one script that plan provides, with a time limit; the skill names none.
   - **Reviews.** Stage 2's flow. Answers go in the commit's body.
   - **No work logs.** Nothing a later package must read, and nothing to review. The orchestrator keeps one short log of what landed and what it decided. The plugin keeps every agent's raw log whole, so the log no longer needs each agent's token counts.
   - **Landing.** Rebase, settle, `yarn verify:changed` on the rebased branch, fast-forward. A commit the rebase changed beyond a list or a paragraph is reviewed again.
   - **The orchestrator's own calls.** It never waits in the foreground on an agent. A time limit on a connector's call is not the agent's to set, and the 7.7-hour hang was such a call, so stage 5 sets one in the settings.
   - **The docs.** A package adds to an `AGENTS.md` only what a later agent could not see from the code. Stage 7 puts the budget behind this.
2. **Point `commit-review-process` at it** for a build, and keep that skill to the review alone.
3. **Review the draft against one archived plan:** would the Brick Breaker uplift's sections 7 and 9 shrink to its streams, ports, owners and budgets? What stays in a plan is what is that build's alone.

**Measure.** On the stage 6 build: a worker's context at its first edit and what it is made of, cost by package size, requests with one tool call, the hours workers wait for the orchestrator.

**Done when** the skill is merged and linked, and step 3's review is written up here.

## Stage 5. A build's state, to check by hand

The audit's recommendation 7, as far as decision 4 takes it. Outside the repository, in the plugin.

**What is so now.** The plugin's watchdog starts when a measured session's orchestrator ends its turn with agents running. It reads the agents' logs and wakes the orchestrator, which deals with a hung agent. It would have caught none of the audit's three outages: a session that had ended, an orchestrator hung inside its own call, and an orchestrator refused along with its agents. Nothing will be sent to the phone for those. What is left is to make them plain at a glance when you look.

**Steps:**

1. **`/measure watch <name>` from any session,** the phone's included, not only from the build's own. It answers in a few lines:
   - the orchestrator: working, waiting on agents, hung (no answer from the model for 15 minutes, or a tool call past its time limit), refused by a limit and until when, or ended;
   - each agent: what it is doing and for how long, with the hung ones first;
   - the last commit landed and how long ago;
   - the week's share used.
2. **It works the state out from the logs when asked,** not from a file a watcher keeps. A watcher dies with its session, which is the Brick Fuzz Pop outage, and its last word would then read as the truth. Each line says how long ago that log last moved.
3. **The two silent endings are recorded by their hooks,** since the logs alone do not show them: `StopFailure` with a usage limit, with the time the limit resets, and `SessionEnd` with the run still open and agents unfinished.
4. **A time limit on connector calls,** in the settings' `env`. I believe the name is `MCP_TOOL_TIMEOUT`; check it against the harness's docs, set it with your word, since it is your settings file, and test it with a planted call that hangs.
5. **Test each of the three outages** with a planted one: a session ended mid-build, an orchestrator process stopped with `kill -STOP`, and a `StopFailure` fed to the hook by hand. Each must show in step 1's answer from another session.
6. **Update the plugin's README and its page,** and the report's "Where it stands" for recommendation 7.

**What stays as it is.** The orchestrator is still woken for a hung agent while it can answer, and still warned as the week fills. `watch.notify_command` stays in the plugin, unset, should you want a channel later.

**Done when** all three planted outages read plainly from a second session.

## Stage 6. The first measured build

Not work of its own: a multi-agent build still to be chosen (decision 6), run by stage 4's skill. Until there is one, stages 1 to 5 stand unproven, and stage 7 waits for it only so that the pruning has a before-figure. If no build is near, stage 7 can go first and take its before-figure from the Brick Breaker uplift.

**How it runs:**

1. **`/measure start <name> --trying 1,2,4,5,6`** at the top of the session, with whichever numbers are in by then.
2. **Reviews by halves.** Odd packages take the old review and even ones the `commit-reviewer`, both on Opus at `high`, tagged `arm=old` and `arm=new`, so the scorecard splits them. The old review is a `general-purpose` agent with the brief as it stood before stage 3, which that build's plan quotes from the skill's history and hands to the odd packages' workers by name. That is an arm chosen in the open, not the silent fallback 3c forbids. The replay compares what each finds; this compares what each costs inside a real build, where a review starts at 53,000 tokens and not the replay's 31,000.
3. **`/measure stop`** at the end, and the scorecard beside the Brick Breaker uplift's.

**What to read from it:**

- **Cost and time:** the table under [In short](#in-short).
- **Quality:** findings for each review by arm, `amend!` commits that carry a fix for each report, what the finishing audit finds, and what CI catches after the merge.
- **The week:** the share it used, read from the account at both ends.

**What follows.** A recommendation whose figure did not move is looked at again before the next build, and this plan's table gains a column for what was measured.

## Stage 7. The standing docs, skills and plugins

The audit's recommendation 3, the budget and the pruning: 10 to 15% of what workers cost, and it stops the growth from compounding. This stage is a review first and an edit second.

### What there is

| What                                  | Files |          Size | When an agent pays for it                                       |
| ------------------------------------- | ----: | ------------: | --------------------------------------------------------------- |
| `AGENTS.md` files                     |    18 |        557 KB | Whole, on opening any file in the folder, then on every request |
| Skills' descriptions                  |    47 |         22 KB | In every request, once the skill's folder is in use             |
| Skills' bodies (`SKILL.md`)           |    47 |        802 KB | When the skill is loaded                                        |
| Skills' reference files               |    54 |        263 KB | When the skill sends the agent to one                           |
| The skill list a subagent starts with |    58 | 11,700 tokens | In every request. Most of it is plugins' skills                 |

- **Five `AGENTS.md` files are over 25 KB:** Asteroid Breaker's (130 KB), Brick Breaker's (83 KB), Brick Fuzz Pop's (64 KB), `frontend/lib/dev`'s (54 KB) and `frontend/lib/phaser`'s (34 KB). All 18 together were 243 KB on Nov 4.
- **22 of the 47 skills are Phaser's,** 470 KB, 20 of them copies from Phaser's package. The largest of the repository's own is `fuzzley-ui`, 54 KB with a description of 1,900 characters.
- **Seven plugins are synced from your claude.ai account:** `productivity`, `design`, `engineering`, `desktop-commander`, `security-guidance`, `cowork-plugin-management` and `modern-web-guidance`. `measure` and the harness's bundled skills are beside them.
- **The memory index** is 7 KB, in every agent's first request too. It is not the repository's, so it is in scope only if you say so.

### How the review runs

1. **Evidence first, from the logs.** A script over the eight efforts' transcripts counts, for each skill, how many agents loaded it, and for each `AGENTS.md`, how many agents read it by command and how many had it loaded for them. A skill no agent loaded in 800 transcripts, and a plugin none of whose skills was, are the first candidates. This costs no model usage.
2. **Plugins, the same day.** They are the quickest cut and are in every request. For each plugin: was it used here, and is it wanted in other projects? Those not wanted here are turned off for this project (`claude plugin disable <name> --scope project` or `local`). Whether a plugin synced from the account obeys that scope, and from which starting folder, is tried first on one. Then a subagent's first request is measured again.
3. **Every `AGENTS.md`, section by section,** largest first. A fresh agent reads one file against the code and gives each section a verdict from one list:
   - **keep:** a rule an agent would break without it, which the code does not show;
   - **move to a skill:** reference for one kind of task;
   - **move a layer:** it holds for more workspaces, or for fewer;
   - **merge:** said elsewhere;
   - **cut:** it restates the code, lists files, tells history, or is left over from a plan;
   - **make it a check:** a lint rule or a spec could hold it, with one line left to point there.
4. **You read each file's table before anything is cut.** Each comes as a page for the phone: section, size, verdict, reason, where it goes. You change any verdict.
5. **Every skill, the same way,** with three more questions: is its description as short as its triggers allow, does its trigger fire when it should and only then, and is each reference file one the skill sends an agent to? The Phaser copies are judged whole: keep, or drop the copy for a part of Phaser no game uses.
6. **The cuts,** one commit a file, each passing the reference check and reviewed. A section that moves lands in its new place in the same commit.
7. **The rules,** written into `.agents/AGENTS.md` and held by the check.

### The rules to settle

A draft, to be settled in step 4's reading:

- **A budget for each file.** For an `AGENTS.md`: 25 KB for a game, 20 KB for a library, the site or a shared layer. For a `SKILL.md`: 20 KB, with reference files beyond it. For a skill's description: 600 characters. A copy from upstream is not edited here, so it has no budget: it is kept whole or dropped, as the reference check already sets those skills apart. Eleven of the Phaser copies are over 20 KB. `check-skill-references.mjs` fails a file over its budget, and prints every file's size against it.
- **One in, one out.** A change that would take a file over its budget cuts or moves something in the same commit. No plan makes these files add-only.
- **Where a thing goes:**

  | What it is                                | Where it goes                                                |
  | ----------------------------------------- | ------------------------------------------------------------ |
  | A rule every change in a folder must keep | That folder's `AGENTS.md`, at the highest layer it holds for |
  | How to do one kind of task                | A skill                                                      |
  | What the code already says                | Nowhere                                                      |
  | Why a decision was made                   | The commit's message, or a doc under `docs/`                 |
  | Something a machine can check             | A lint rule or a spec                                        |

- **The test for a new rule:** would an agent that read the code get this wrong without it? A rule names what went wrong when it was missing.
- **A new skill** needs a task that triggers it and a workspace's name at its front where it is one workspace's. A copy from upstream is taken only for a part in use.
- **A plugin** is on for this project only when something here uses it.
- **Every build's finishing step** audits and prunes, and reports the sizes before and after.
- **The reviewer's rubric** changes in the same commit as the rules it condenses.

### What it costs, and how it is checked

- **The review** is about 25 reading agents: $60 to $100 at list prices, 3 to 5% of a week (est.).
- **Nothing found is lost.** The replay set runs again on the present review, which reads these files, after the cuts: it should find what it found before. On the next build: the finishing audit's findings, CI's failures, and reviews' findings of practice.
- **What it should buy:** a subagent's first request near 40,000 tokens, a worker's context at its first edit under 200,000, and every `AGENTS.md` together under 300 KB. The draft budgets alone allow about 305 KB, so the rest comes from the section-by-section cuts in files already inside their budget.

**Done when** no file of the repository's own is over its budget, the check holds the budgets, the rules are in `.agents/AGENTS.md`, and the figures above are measured.

## What this plan leaves out

The audit considered and set aside: fewer reviews of code, fast mode, a longer cache for subagents, a lower compaction threshold and more than five workers. This plan leaves them out too.

## What the stages use of a week

| Stage | Model usage (est.)                             |
| ----- | ---------------------------------------------- |
| 1, 2  | Under 1% each                                  |
| 3     | 3 to 4%, the replay arms; 2% is spent          |
| 4, 5  | About 1% each                                  |
| 6     | The build's own: 0.6% a commit at the baseline |
| 7     | 3 to 5% for the review, 1 to 2% for the cuts   |

A week's allowance comes to about $1,960 at list prices, good to a sixth either way.
