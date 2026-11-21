# Agent efficiency: the plan

Written on 2026-11-21, after [the audit](report.md) and its re-run. The audit recommends seven changes to how a multi-agent build runs here, and none of the first six is built. This plan builds them in seven stages, each small enough to check on its own, and measures each with the `measure` plugin the audit ends with.

The stage that prunes the `AGENTS.md` files comes last. It is the largest and the least mechanical: a review, with you, of every `AGENTS.md` file, every skill and every plugin, to decide what is cut and what rules govern adding to them from here on.

## In short

| Stage | What                                              | The audit's | Touches                                  |
| ----- | ------------------------------------------------- | ----------- | ---------------------------------------- |
| 1     | One `yarn verify:changed` a commit, in turn       | 5           | `commit-review-process`, `@fz/dev`       |
| 2     | Reviews in the background                         | 1           | The two process skills, the plugin       |
| 3     | A `commit-reviewer` agent type, and its effort    | 2, 6        | `.agents/`, the replay set               |
| 4     | A skill for how a build runs                      | 3 to 7      | a new skill                              |
| 5     | A build's state, to check by hand                 | 7           | the plugin, outside the repository       |
| 6     | The first measured build, to be chosen            | all         | that feature's plan                      |
| 7     | The standing docs, skills and plugins: the review | 3           | every `AGENTS.md`, every skill, settings |

- **Stages 1 to 5 change no game code.** They edit three skills, the scripts under `.agents/`, one agent definition and the plugin. Each is a branch of one to four commits, reviewed by `commit-review-process` and merged when you ask.
- **Stage 6 is the test.** Nothing before it is proven: every saving in the audit is an estimate from logs.
- **Stage 7 was to run after that build,** so the build would give a before-figure for what the pruning buys. On Nov 21 you skipped stage 6 for now, so stage 7 began first and takes its before-figure from the Brick Breaker uplift.

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

## Stage 1. One check a commit, each in its turn

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

**Where it stands (Nov 21).** Built, on the branch `agent-efficiency-1-checks`. The timings ruled out running without a lock, and a lock for two as well, so `yarn verify:changed` now queues itself, one run at a time.

- **The timings.** Four worktrees on the 24 cores and 23 GB, about 20.5 GB of it free as each set began. The light change was a comment in one game's `src/main.ts`, a different game in each. It reaches that game alone, but builds every game and the site, since the site's build takes them all. The heavy change added a comment in `lib/core/src/math.ts`, which reaches every workspace. The memory column is the least the whole machine had free while the set ran, sampled twice a second, in place of each run's own peak.

  | At once | Change | Each took            | Passed     | Least free     |
  | ------- | ------ | -------------------- | ---------- | -------------- |
  | 1       | Light  | 38 to 92 s           | 4 of 4     | 3.4 to 9.1 GB  |
  | 2       | Light  | 38 to 105 s          | 6 of 6     | 2.8 to 8.2 GB  |
  | 4       | Light  | 75 to 139 s          | 4 of 8     | 1.1 GB         |
  | 1       | Heavy  | 152 and 195 s        | 2 of 2     | 8.6 and 9.1 GB |
  | 2       | Heavy  | Stopped at 28 s      | None ended | 1.9 GB         |
  | 4       | Heavy  | Unfinished at 13 min | None ended | 0, it ran out  |

- **What went wrong at four.** Each run sizes itself to every core and all the free memory as it starts, so four that start together claim the machine four times. In the light case the same two runs failed both times, on time limits and not on the code: a Brick Breaker spec passed its 5 s, and Asteroid Breaker's layout check waited out its 10 s for the canvas. The load reached 77 on the 24 cores. In the heavy case the load passed 240, the machine ran out of memory, and the session that started the runs went down with them.
- **Two at once.** Two light runs both passed, and the pair ended sooner than in turn: 105 s against 151 s for Brick Breaker's with Asteroid Breaker's. Two heavy runs had the machine under 2 GB free in 28 s, where a guard added after the outage stopped them. A run doesn't know what the one beside it will claim, so two at once is safe only when both are light.
- **The decision: a queue of one, inside the command.** `yarn verify:changed` joins a queue before its tasks and runs once every run that started before it has ended, in any worktree of the repository. It says how many it waits for, then how long it waited, and reads the free memory only once its turn comes. No brief carries a lock and no worker can leave one out. A run marks its place every 5 s, and a place a minute unmarked is passed over, so a run that was killed holds the queue for a minute at most. A look that finds the clock has jumped, as it does when the machine wakes, passes over nothing. `@fz/dev`'s `src/queue.ts` holds it, with its specs.
- **What a turn costs.** A worker at the baseline lands a commit every 26 minutes, and its one check takes one to three, so most runs find the queue empty. The worst case is four heavy runs joining together: the last waits about nine minutes, and its call passes the ten minutes a shell command may take. The skill's step 1 gives the command ten minutes. Stage 4's skill says what a worker does past that.
- **The skill.** Step 1 names the one command, `--base` for a branch that holds more than the change, and the ten minutes. The brief's third sentence says the author ran it. The reviewer starts at `high` effort.
- **Not measured yet.** Check commands and minutes a commit, the time spent in the queue, and the rewrites that follow a check wait for the stage 6 build. A run that waited prints `Waited <n> s for its turn.`, which is the line to count. `yarn verify` and `yarn verify:full` join no queue. Each runs its steps one after another, and merging runs one at a time already.

## Stage 2. Reviews in the background

The audit's recommendation 1. With the reviewer at `high` (decision 5) the gain is a worker's minutes, 3 to 4 a commit and up to 12% of its busy time. It is no longer the 5% of spend the audit gave: that was the rewrites below, and they go with the shorter review.

**What is so now.** The author stages a change, starts the reviewer and waits. Workers were blocked 30 agent-hours across the seven efforts. A review took 6 to 7 minutes and a subagent's cache lasts 5, so the worker then wrote its whole context again: 194 times, $247. At `high` no review in the replay passed five minutes, and in the player-text rewrite 2 of 19 rewrites followed a review. A worker there still stood blocked for 3.2 minutes a commit.

**The design.** A staged diff cannot hold still while its author works on, so the change is committed first:

1. **The author commits the change** once `yarn verify:changed` passes, with its message in final form.
2. **It starts the reviewer in the background** (`run_in_background`) on that commit. The reviewer reads `git show <sha>`, and a file as it was at that commit with `git show <sha>:<path>`.
3. **It goes on to the next change,** keeping it small until the report is in.
4. **When the report arrives, it answers every finding** in an `amend!` commit, which carries the fix and the commit's new message, its answers in the body. `git commit --fixup=amend:<sha>` would make one, but it opens an editor and refuses `-m`. So an agent writes it by hand: a message whose first line is `amend! <the commit's subject>` and whose rest is the whole new message, handed to `git commit -F -` with the fix's files named, or with `--allow-empty --only` where there is an answer and nothing to fix.
5. **Before it reports its package done,** it runs `git rebase --autosquash --keep-base <the branch it left>` on its own branch, in its own worktree, with `GIT_EDITOR=true`, then checks that the tree came out as it went in (`git diff` against the tip from before prints nothing). Only where it differs does `yarn verify:changed` run again. `--keep-base` squashes without also moving the branch. So the orchestrator lands whole, reviewed commits and no `amend!`. The recipe was tried on Nov 21 in a scratch repository, on git 2.47.

**The rules that keep it safe:**

- **At most two changes wait on a report at once.** With two out, the author waits.
- **A fix that reshapes a change** still earns a second review, as now.
- **A squash that conflicts** is settled by the author. One that changes the tree, by a conflict or without one, is checked again and the difference reviewed.
- **One change on its own,** such as a doc fix in a session with nothing else to do, keeps the present flow: stage, review, answer, commit.

**Steps:**

1. Rewrite steps 2 and 3 of `commit-review-process` to this, with the present flow kept as the short case. Its description, its opening line and step 1's heading say "before it is committed" and "staged", and change with them.
2. Change the brief's first lines: "Review the commit `<sha>`…", and "the author is working on in the same checkout, so read a file with `git show <sha>:<path>`".
3. Try it by hand in one session: two small real changes, the second begun while the first is in review. Check that the squashed history is what a foreground review would have left.
4. In the plugin, count the `amend!` commits a run's logs show being made. After the squash git no longer shows them, and they are this stage's measure of what a review changed.

**Measure.** A worker's elapsed minutes and context rewrites a commit. Not the minutes blocked on a reviewer, which fall to nothing by definition. For quality: `amend!` commits that carry a fix, for each report, against the 68% of reviews after which a Brick Breaker worker changed source.

**What it risks.** A worker building on a change its reviewer then faults. The limit of two and the small next change bound it.

**Done when** the skill is rewritten, the trial in step 3 is written up here, and the plugin counts `amend!` commits.

**Where it stands (Nov 21).** Built, on the branch `agent-efficiency-2-reviews`. The skill is rewritten. `merge-to-main` changed with it, which the steps above did not foresee: it now lands no `amend!` commit and pushes with no review out, since the specs it has written for coverage are committed and reviewed on the way. The plugin counts `amend!` commits and the waits in stage 1's queue.

- **The trial.** The stage's own two changes went through the new flow in one session: the skill's rewrite, then `merge-to-main`'s change, written once the first's review had started and committed 27 seconds after the first. All three reviews ran in the background at `high`, and the plugin's counting was written while the first two did. This write-up then went the same way: one review of 2.8 minutes, and six findings answered in an `amend!` commit.

  | Review of           | Took    | Findings | Answered in              |
  | ------------------- | ------- | -------- | ------------------------ |
  | The skill's rewrite | 3.4 min | 8        | An `amend!` with a fix   |
  | `merge-to-main`     | 1.7 min | 3        | An `amend!` with a fix   |
  | The first's fix     | 3.5 min | 5        | A second `amend!`, a fix |

- **The history it left.** Five commits before the trial's squash, three of them `amend!`. Two after it, each with its answers in its body and none `amend!`. The tree after the squash is the tree before it. That is what a review in the foreground would have left.
- **What the trial changed in the design.** The first review's findings rewrote the skill's steps 3 to 5:
  - **A report is answered between changes,** with the change in hand committed first. Otherwise the check and the `amend!` take what is half built.
  - **A fix is committed by its files' names,** and answers alone with `--only`, so nothing else that is staged goes into the reviewed commit.
  - **The `amend!` line comes from a command,** `git log -1 --format='amend! %s' <sha>`. A mistyped subject is left unfolded, and a cut one folds into the wrong commit.
  - **What a fix changes in a later commit goes in that commit's own `amend!`.** Folded into the first, it would come before the commit it mends. A scratch repository showed the conflict that follows.
  - **The squash is checked by a diff, not by a second run of the check.** A squash only folds, so the tree should come out as it went in. `yarn verify:changed` runs again only where it didn't. That saves a package one check of one to three minutes.
- **What it did not show.** Both changes were Markdown, in one session whose author was not a worker with its own worktree. The second change touched another file and built on nothing in the first, so the risk above, of building on a commit its reviewer then faults, was not met. No squash conflicted in the trial itself. The last review of a package is still waited on, since the squash needs every report in: here that was 3.5 minutes.
- **The plugin.** It counts an `amend!` commit from the `amend!` line in the command's message or in what git printed, as a fix-up and not as a commit, and counts apart those that carry a fix. It totals them across a run's authors and by arm, not worker by worker. Two past runs came out as before, but for the new figures. It also adds up `Waited <n> s for its turn.`, stage 1's measure.
- **Not measured yet.** A worker's elapsed minutes and rewrites a commit wait for the stage 6 build.

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

- **The quoted rules.** A replay case has no author to quote the workspace's rules. A helper that has not seen the planted defects writes each case's quote by one recipe: the bullets and paragraphs of the workspace's `AGENTS.md` that name a path the change touches, up to the brief's 300 words. So a quote cannot point at a defect. (As built, the helper was shown the change, and this no longer holds: see "Where it stands".) A heading will not do as the unit: the largest file's "Layout" section alone runs to 1,350 lines.
- **Adopt the agent type if** it finds as many of the first 20 planted defects as the present review, give or take one, misses none of 3a's five that the present review finds, each of those run twice, and a review costs a quarter less or better. Where it misses more, look at which: a missed defect of practice or docs most likely means a rule the rubric lacks, or one the author's quote should have carried. Mend that and run the arm again.
- **A cheaper model** is one more arm, `agent-sonnet`, if you want it tried while the set is warm. The audit set it aside until after this stage.

**What it costs.** The first two arms cost $41 at list prices, 2% of a week: $27 at `xhigh` and $14 at `high`. What is left, one new arm, five more cases on two arms and a second run where it is close, is 1 to 2% more.

**Measure.** The replay report for quality. On the stage 6 build: a review's cost, minutes, requests and peak context.

**What it risks.** A reviewer that no longer reads a workspace's whole `AGENTS.md` misses a rule nobody quoted. The side-by-side is the guard, and so is the rubric's upkeep: from this stage on, a change to the rules for code, doc comments or specs in `.agents/AGENTS.md` changes the rubric in the same commit.

**Done when** the definition, the scripts and the skill are merged, and the arms' report is in this file.

**Where it stands (Nov 21).** Built, on the branch `agent-efficiency-3-reviewer`, and the agent type meets the rule in 3d, counting a review's own cost. The set now has 25 cases. The new reviewer ran over all of them beside the present review at `high`, the five new cases twice each.

| A review                              | Present, `high` | `commit-reviewer` |
| ------------------------------------- | --------------: | ----------------: |
| The first 20 planted defects found    |        20 of 20 |          20 of 20 |
| The new cases' 6 defects, in two runs |        11 of 12 |          12 of 12 |
| Cost (median)                         |           $0.65 |             $0.31 |
| Minutes (median)                      |             1.7 |               1.2 |
| Tool calls (median)                   |              12 |                 8 |
| Context at the start (median)         |          31,300 |             7,500 |
| Context at its peak (median)          |          70,100 |            35,500 |
| Reviews over five minutes             |         0 of 30 |           0 of 30 |

- **The rule in 3d.** It found all of the first 20, missed none of the new cases' defects in either run, and a review costs half, where the rule asked for a quarter less. So `commit-review-process` starts a `commit-reviewer`. The cost is the review's own. With what the helper took to write a quote added, $0.23, the two come to $0.54 against $0.65, a sixth less. What a quote costs an author, who already holds the files, is not known.
- **What it starts with (3b.3).** 7,500 tokens, against 31,300 in a replay and 53,000 in a build. Its first request holds the definition as its system prompt, the shell and the tool that hands its report back, and the harness's snapshot of git's status. It holds no skill list, no `CLAUDE.md` and no `AGENTS.md`. The frontmatter's Opus and `high` both took. The MCP servers' own instructions, about 750 tokens, arrive after its first call.
- **How it read.** With no Read tool, nothing loaded a folder's `AGENTS.md` for it. It made 8 calls a review where the present review makes 12. Of its 30 reviews, 14 searched the `AGENTS.md` files and skills for a rule's words, and 12 printed a slice of one by line numbers. Seven read a skill whole: `player-text` six times, as the brief of a change to a player's words asks, and the CI skill once, unasked.
- **The five new cases** break rules that four `AGENTS.md` files state: an icon's color in `@fz/ui`, a containing block inside the bar in `@fz/game-ui`, a copied `@fz/core` helper and an unversioned stored entry in the games' shared file, and a stored entry's version raised in Asteroid Breaker's. The present review missed the containing block in one run of two. The relay changed one brief of the 30, by three words added at its end.
- **The quoted rules were written another way than 3d says.** The skill now asks for the sentences that state a rule for the kind of thing a change touches, which a recipe by paths can't pick. So a helper model, Sonnet, wrote each case's quote from the skill's own instruction. It was shown the staged change and the files an author would draw on, and told nothing of the defects. The harness kept only sentences found in a file word for word. A quote came to 145 words at the median and 206 at most, and cost $0.23 to write at the median, which the table leaves out.
- **What it did not show.**
  - **What a rule nobody quoted costs.** The helper left one case's rule out, a sentence of some 200 words on sharing `@fz/core`'s helpers. The reviewer found that defect anyway, from its own "a helper lives once" and a search for the helper, so that case tested no rule the definition lacks. The other four did, and each reached the reviewer quoted. The risk stands as written above.
  - **A quote chosen without the fault in view.** The helper read each change with its planted lines in it, and in all four of those cases it quoted the very sentence the defect breaks. It was not told a defect was there, and neither is an author who has just written one. But it read the rule files whole and fresh for each change, which an author deep in a build may not.
  - **More than a sample or two.** A new case was reviewed twice and an old one once. A replay review is lighter than a build's, so carry the ratio over, not the dollars.
- **What the reviews changed in the design.** Two reviews of the stage's commits made 21 findings, all taken but a spec for the link script, asked for twice:
  - **The definition reads three kinds of change,** a commit, a staged change and the difference between two commits, each by its own commands through `git -C <path>`, with a sha and a path written out, since a reviewer's shell may be zsh and start outside the repository.
  - **In the `--also-in` folder the script touches only links that lead into this repository's `.agents/agents/`.** A link of the same name to another clone stays, with a warning. A folder whose `.claude/agents` is the repository's own is refused.
  - **Where the type isn't offered, the author asks once,** and goes on with a `general-purpose` agent held to the shell only where told to. A session that starts workers asks before it starts them, and a worker with no answer hands its commits back as not reviewed.
  - **The quote is sentences, not bullets,** from a list of sources the skill names, and a rule the 300 words leave out is named for the reviewer to search for.
- **Left.** The link script has no spec: no test runner reaches `.agents/`, and its cases were tried by hand in a scratch folder. Its Windows path, where a file link needs Developer Mode, was read and not run. The `agent-sonnet` arm was not run.
- **What it cost.** $24 at list prices for this stage's runs: $6 for the quotes, $10 for the new reviewer's 30 reviews, $6 for the present review's 10, and $2 for the relays and the judge. With the first two arms that is $65, 3.3% of a week.
- **Not measured yet.** A review's cost, minutes, requests and peak context in a build, and what writing the quote adds to its author's, wait for stage 6.

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
   - **Checks.** Stage 1's one command, which queues itself, and what a worker does when its turn is more than ten minutes away. Mutants, where a plan asks for them, come from one script that plan provides, with a time limit; the skill names none.
   - **Reviews.** Stage 2's flow. Answers go in the commit's body.
   - **No work logs.** Nothing a later package must read, and nothing to review. The orchestrator keeps one short log of what landed and what it decided. The plugin keeps every agent's raw log whole, so the log no longer needs each agent's token counts.
   - **Landing.** Rebase, settle, `yarn verify:changed` on the rebased branch, fast-forward. A commit the rebase changed beyond a list or a paragraph is reviewed again.
   - **The orchestrator's own calls.** It never waits in the foreground on an agent. A time limit on a connector's call is not the agent's to set, and the 7.7-hour hang was such a call, so stage 5 sets one in the settings.
   - **The docs.** A package adds to an `AGENTS.md` only what a later agent could not see from the code. Stage 7 puts the budget behind this.
2. **Point `commit-review-process` at it** for a build, and keep that skill to the review alone.
3. **Review the draft against one archived plan:** would the Brick Breaker uplift's sections 7 and 9 shrink to its streams, ports, owners and budgets? What stays in a plan is what is that build's alone.

**Measure.** On the stage 6 build: a worker's context at its first edit and what it is made of, cost by package size, requests with one tool call, the hours workers wait for the orchestrator.

**Done when** the skill is merged and linked, and step 3's review is written up here.

**Where it stands (Nov 21).** Built, on the branch `agent-efficiency-4-build-skill`: `.agents/skills/multi-agent-build/SKILL.md`, 7,998 bytes, linked by the link script, and one sentence in `commit-review-process` that points at it. No build has run by it, and no worker has been started from its brief.

- **What it holds.** Eight sections: before a build starts, packages and width, the brief and its template, how a worker works, the checks, landing a package, the orchestrator's own calls, and what a plan still holds. A brief sends its worker to the skill's section 4, so the standing rules are written once and a brief carries only its package.
- **What step 1 left open, and what the skill says:**
  - **Past the ten minutes.** A call in the foreground shows nothing of a queued run until it ends, so a worker can't choose by how many are ahead. Where the limit ends the check, it runs it once more. Where that ends too, it stops and reports how many runs each try waited for. It calls nothing hung: the queue also holds the orchestrator's checks, and a long queue can be a healthy one.
  - **The orchestrator's log** is `.claude/build-log.md` in the integration worktree, which git ignores. So it is never committed and needs no review.
  - **A commit a landing rebase changed** beyond a list or a paragraph is the orchestrator's to have reviewed, answer and squash, before the check. It finds such a commit with `git range-diff <the integration branch> <the old tip> HEAD`, tried in a scratch repository on a rebase that stopped for a conflict. A check that fails, or a collision it can't settle, goes to a fresh worker. The rebase of the integration branch onto `origin/main` follows the same rule, with `origin/main` as the first argument.
  - **The whole build's check** between landings is `yarn verify:changed` with no `--base`, which waits its turn. `yarn verify` and `yarn verify:full` join no queue, so the skill keeps both out of a build until the merge.
  - **A worktree for each package,** as the Asteroid Breaker uplift had, and not one for each stream.
  - **The time limit on a connector's call** is not named: the skill says to make no such call the build can do without, and stage 5 checks the setting's name before anything cites it.
- **Step 3: against the Brick Breaker uplift.** Its sections 7 and 9 run to 177 lines, 10.1 KB. By the skill, 58 lines would stay, 4.5 KB, nearly half of that the table of who owns what:

  | Its section               | Stays in the plan             | Goes                          |
  | ------------------------- | ----------------------------- | ----------------------------- |
  | 7.1 The dependencies      | All of it                     | Nothing                       |
  | 7.2 Streams and waves     | The waves' table              | The cap, a fresh agent each   |
  | 7.3 Who owns what         | The table, the add-only files | "Add, restyle nothing"        |
  | 7.4 How an agent works    | The ports                     | The rest, to the skill        |
  | 7.5 How it comes together | Nothing                       | All of it, to the skill       |
  | 7.6 The work logs         | Nothing                       | All of it, with the logs      |
  | 9 Each commit's checks    | Nothing                       | All of it, to the one command |
  | 9 Budgets                 | All of it                     | Nothing                       |

  So yes: what is left is its streams, their order, the owners, the ports and the budgets. One pair of packages that restyle the same file, ordered by the plan, stays too.

- **What the comparison added to the draft.** Two rules every plan carried that step 1's list left out: format the files changed by name and never with `yarn prettier`, and a package that changes what a player sees looks at it in a browser before its last commit and says what it saw. The second came from the plans' "Practices", outside the two sections.
- **What the old sections held that is gone on purpose.** A worker count for the specs (`--maxWorkers`) and the lock around the root's checks, which the queue replaces. `yarn verify` and `yarn check:layout` at each wave's end, which the unbased `yarn verify:changed` replaces, since it builds and runs the layout checks. Sending a large collision to the stream's next agent, since no stream has one.
- **What the reviews changed.** A `commit-reviewer` read the draft against the code and the three plans and found eight things, all taken. The largest: nothing said who has a rebased commit reviewed once its worker is gone, and the draft left open how a worker opens a browser, where `frontend/AGENTS.md` points at a Chrome connector that sessions share. A worker now scripts `@fz/dev`'s headless Chrome. A second review, of the fix, found five more, all taken. Two were rules the cut to 8 KB had dropped: the `[helper]` tag, and a worker's report of what it added to files it doesn't own.
- **What the 8 KB cost.** The draft with the first review's fixes in it ran to 8,559 bytes, as measured in the working tree before the cut. The cut took a longer description and opening, the queue's own words, reasons, and sentences that `commit-review-process` already holds. After the second review it took no rule.
- **Not measured yet.** A worker's context at its first edit, cost by package size, requests with one tool call and the hours workers wait all need the stage 6 build.

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

**Where it stands (Nov 21).** Built, in the plugin and in your settings file, both outside the repository. All three planted outages read plainly from a second session.

- **`/measure watch <name>`** answers from any session on the machine. It gives a line for the orchestrator, a line for each unfinished agent with the hung ones first, the newest commit and the week's share used. The orchestrator's line and each agent's say how long ago that log last moved. The commit is the newest at any local branch's tip, a worker's included, where step 1 asked for the last one landed: the plugin does not know which branch a build lands on, and the newest tip shows work moving. It is worked out from the logs and the hooks' notes each time it is asked, and nothing keeps the state between askings.
- **The orchestrator's line** says working, waiting on its agents, idle, HUNG, refused, or ended. HUNG has a third cause the steps did not list: agents the orchestrator started itself finished 15 minutes ago, and its log has not moved since. That is how an orchestrator that stopped between turns shows.
- **The hooks' notes.** `StopFailure` is told only that a rate limit refused the turn, not which limit or when it lifts. So the hook reads both from the log's last refusal, and failing that from the last reading of the account, where a window stands at 95% or more. `SessionEnd` notes the reason and the agents left unfinished.
- **The three outages, planted:**

  | Outage                    | Planted by                   | Read as                   |
  | ------------------------- | ---------------------------- | ------------------------- |
  | A session ended mid-build | A real session, interrupted  | Ended, 1 agent unfinished |
  | Hung in its own call      | A real session, `kill -STOP` | HUNG, 7 min on Bash       |
  | A turn a limit refused    | A `StopFailure` fed by hand  | Refused, and the reset    |

  The refusal's reset came from the account's reading: the hook is told of no reset, the frozen session's log held no refusal, and the test's store had a full week planted in it. The two real sessions ran on the cheapest model with their own store, so the ledger holds none of it. The frozen one read HUNG at the usual thresholds, seven minutes in: its command's limit of 100 seconds and the five minutes' grace.

- **The time limit on a connector's call** is `MCP_TOOL_TIMEOUT`, in milliseconds, as the harness's docs have it. Unset, a call is given about 28 hours, which is how one could hang for 7.7. It is now 600000, ten minutes, in the `env` of your settings file, with the file as it was kept beside it. A planted connector whose one tool never answers was cut off at 20 seconds with the variable at 20000, and was still hanging at 80 seconds without it. A session started after the change sees the value. One already running does not until it restarts.
- **What `watch` cannot tell.** A process stopped from outside leaves its logs as they were. Inside a call that reads HUNG once the call is five minutes past its limit. Between turns, with no agent of its own finishing, it reads "waiting" or "idle", and only the time since the log moved says more.
- **Its checks.** The plugin gains `tests/test_watch.py`: thirty checks on logs made up for each state and on the hooks' notes. Fourteen rules broken on purpose, one at a time, each fail a check.
- **What a review changed.** The plugin is no repository, so `commit-review-process` has no commit to work on there. An agent that had not seen the change written reviewed it as a diff against a copy kept from before, and ran the new code over the real logs of past builds. It found eight things, all taken:
  - **A log's last move was read from its file's time,** which bookkeeping records and copying move hours after the last turn. A build that had ended cleanly read as HUNG, and an ending the hook had noted would have stopped counting. The time now comes from the last record of work.
  - **A record no model answers read as a wait for the model:** what a local command such as `/effort` leaves, and a headless session's last result. An idle orchestrator read HUNG after fifteen minutes.
  - **A run two sessions had joined** counted as two runs, so `watch` with no name fell back to the asking session's own agents.
  - **Agents left behind hours before** were counted as cut off by a session's end.
  - **A stopped run** read as "ended, with the run still open". It now says the run is over and points at its scorecard.
  - **The hook wrote its note after reading the logs,** so a slow read could lose the note. The read is now given five seconds.
  - **A wait on an agent hid a hung call made beside it,** and a refusal still counted for a minute after a retry began.
  - **The watchdog and `watch` gave a connector's call different limits.** Both now read the settings' one.
- **What was updated.** The plugin's README, its page and its skill. The `multi-agent-build` skill still names no setting: it tells an orchestrator to make no connector call the build can do without, which holds whatever the limit. Its reason, that a hung call holds the build until a person looks, is true where no limit is set. Here such a call now holds a build for ten minutes.
- **Not measured.** Nothing here moves a build's figures. What it buys is the hours an outage stands unseen, and the next outage will say.

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

**Where it stands (Nov 21).** You skipped stage 6 for now, so this stage began first, with the Brick Breaker uplift as its before-figure. Step 1 is done. Step 2 is tried, with nothing turned off: which plugins go, and where, is yours to say. Steps 3 to 7 have not begun, but for one reading agent sent to Asteroid Breaker's file, to show what a table of verdicts looks like before the other 24 are spent.

**Step 1, the evidence.** [`scripts/standing.py`](scripts/standing.py) counts what the agents of the eight efforts did with each file, 825 agents in all, and [`data/standing.txt`](data/standing.txt) holds what it printed. It reads the commands as the extraction kept them, so a command over 1,800 characters, one in 17, is counted by its head and tail alone. A file counts as read whole by a command that prints it, by `git show`, or by a Read call that returned half of it or more, and as read in lines where such a command is piped into `sed`, `head` or `tail`.

- **Agents do not load skills with the Skill tool.** The 825 agents called it twice, beside 59,168 shell commands, and the machine's 891 agents eight times. They read a `SKILL.md` by a shell command, because a brief, an `AGENTS.md` or another skill named it. So in a build a skill's description is not what brings an agent to it: its name in a brief is.
- **Ten skills carry the reading.** Agents that read each, whole or in lines:

  | Skill                      |  KB | Whole | Lines only |
  | -------------------------- | --: | ----: | ---------: |
  | `commit-review-process`    |  11 |   112 |         37 |
  | `asteroid-breaker-testing` |  28 |    34 |        115 |
  | `phaser-core`              |  36 |    18 |        124 |
  | `angular-testing`          |   9 |    59 |         55 |
  | `brick-breaker-testing`    |  18 |    47 |         65 |
  | `fuzzley-ui`               |  54 |    24 |         58 |
  | `web-game-accessibility`   |   9 |    23 |         45 |
  | `brick-fuzz-pop-testing`   |  28 |    32 |         36 |
  | `brick-breaker-content`    |  22 |    26 |         37 |
  | `player-text`              |  13 |    57 |          0 |

  The large ones are looked things up in, by line range, more than they are read. `player-text` dates from Nov 17, so it had one effort to be read in.

- **Thirteen skills no agent read, even in lines:** eleven of the twenty Phaser copies, `angular-new-app`, and `multi-agent-build`, which is newer than the efforts. The other nine Phaser copies were each read by one or two agents. A copy nobody loads costs only its line in the skill list, so dropping one tidies more than it saves.
- **Reference files.** `player-text`'s nine were each read by 15 to 50 agents. Of `angular-developer`'s 37, 136 KB, five were read, by one or two agents each. None of the Phaser copies' eight was.
- **Eight `AGENTS.md` files carry 94% of the cost,** taking a file's size when the harness loaded it, at the median, times its loads plus its whole reads:

  | File                       | KB then | KB now | Had it | Loaded | Read whole |
  | -------------------------- | ------: | -----: | -----: | -----: | ---------: |
  | `.agents/AGENTS.md`        |      15 |     18 |    781 |    391 |        390 |
  | `frontend/AGENTS.md`       |      16 |     19 |    628 |    301 |        353 |
  | Asteroid Breaker's         |      65 |    130 |    280 |     63 |         59 |
  | Brick Fuzz Pop's           |      50 |     64 |    200 |     42 |        111 |
  | Brick Breaker's            |      62 |     83 |    199 |     58 |         44 |
  | `frontend/games/AGENTS.md` |       8 |      8 |    538 |    229 |        309 |
  | `frontend/lib/dev`'s       |      38 |     55 |    122 |     41 |         30 |
  | `frontend/lib/phaser`'s    |      22 |     34 |    146 |     39 |         59 |

  "Had it" counts an agent that had the file loaded, read it whole or read lines of it. The other nine are each under 25 KB and were had by 13 to 85 agents. The five large ones have grown since: at today's sizes Asteroid Breaker's would lead the table.

- **The three shared layers reached most agents, and 14 to 24% of those that had each had it twice:** loaded by the harness, and read as well, whole or in lines. 640 of the 825 agents were reviews, by the audit's reading of their descriptions. A `commit-reviewer` now reads none of these files, and a worker reads none its brief does not name. So stages 3 and 4 should take the reviews' share and the second reading, once a build runs by them.
- **The games' files are looked things up in.** Of the 280 agents that had Asteroid Breaker's, 193 read only lines of it. That is how reference is used, not rules.
- **Nothing from outside the repository was used.** No agent on the machine loaded a plugin's skill or one of the account's, or called a plugin's connector. The connectors called were the two Chrome ones, by 67 agents, the harness's own, and the account's Docs connector, by two. Nor did any agent name a file of a plugin's skill: the script lists the skills' files named outside the repository's, and all are Phaser's own or names since changed.

**Step 2, the trial.** Eight small sessions on the cheapest model, started where a build's sessions start, each with one agent. [`scripts/first_request.py`](scripts/first_request.py) reads what each agent started with, and [`data/plugins-trial.txt`](data/plugins-trial.txt) holds the commands and what it printed. The settings were passed for one run each (`--settings`), so no file of yours changed.

- **A plugin synced from the account obeys the scope.** `claude plugin disable <name>@synced --scope local`, tried in a scratch folder on one plugin, wrote `enabledPlugins` into that folder's `.claude/settings.local.json`. The plugin was then off for a session started there or in a folder beneath it, and on everywhere else.
- **The account's own skills are a second setting,** `syncClaudeAiSkills`. They are thirteen (`docx`, `pptx`, `pdf` and the like), 9,500 characters, the largest group in the list, and no plugin holds them.
- **A skill list is capped near 29,900 characters,** and a skill that does not fit is listed by its name alone. So with the plugins on, a worker's list names 19 of the repository's 33 skills without their descriptions, and keeps every plugin's in full. "Most of it is plugins' skills", in the table above, was wrong: the plugins' are 12,900 characters, 43% of a list at its cap.
- **What an agent starts with, as a build's worker does:**

  | Setting                        | Skills | First request | After one file |
  | ------------------------------ | -----: | ------------: | -------------: |
  | As now                         |     92 |        27,034 |         56,397 |
  | Plugins off                    |     61 |        26,429 |         55,249 |
  | Plugins and account skills off |     48 |        24,790 |         53,610 |

  In tokens, with a brief of one line. The audit's 53,000 for a first request counted a real brief.

- **So the plugins cost a build's worker little:** 600 to 1,150 tokens, and 2,250 to 2,800 with the account's skills. That is a twelfth of the trial's first request, and 4 to 5% of the 53,000 the audit measured with a real brief. The cap is why: the room the plugins leave is taken by the repository's own descriptions. An agent in a session that has opened no file of the repository gains more, 26,471 tokens down to 18,124, since its list is then the plugins' and the account's alone.
- **The first file is what costs.** Opening one file of Snake loaded four `AGENTS.md` files, 64,700 characters, and the request went from 27,000 tokens to 56,000. The same step in Asteroid Breaker loads 175,000 characters, about 70,000 tokens. Steps 3 to 6 are where this stage's saving is.
- **`security-guidance` holds no skill and adds nothing to a request.** Its hooks run at each prompt, each edit and each shell command: three processes a command, 0.16 seconds each, off to the side. Its two model reviews, of each commit and at each turn's end, have never run here: its own log, `~/.claude/security/log.txt`, which this repository holds no copy of, says "no API credentials" for all 84 commits and 298 turn ends it has seen since Nov 15. So it spends no usage. Were a sign-in to reach it, each commit would start a review on Opus, outside the session's own log.

**What this changes in the steps,** each for you to settle:

- **Step 2.** All seven plugins and the account's skills are unused here. Turning them off is worth 2,250 to 2,800 tokens in each worker's every request, and it gives the repository's skills their descriptions back. They would go off in the `.claude/settings.local.json` of the folder your sessions start in, which holds both repositories, and stay on everywhere else.
- **Step 3** could take the eight files of the table first, 94% of the cost, and the other nine afterwards or more lightly.
- **Step 5** could give the ten skills of the table the section-by-section reading, judge the Phaser copies whole as planned, and give the rest a lighter pass. A description's budget buys what it trims: with the plugins and the account's skills off, a worker's list was 24,959 characters, 17,426 of them the 33 skills of the repository that were listed, about 7,000 tokens in every request.

## What this plan leaves out

The audit considered and set aside: fewer reviews of code, fast mode, a longer cache for subagents, a lower compaction threshold and more than five workers. This plan leaves them out too.

## What the stages use of a week

| Stage | Model usage (est.)                             |
| ----- | ---------------------------------------------- |
| 1, 2  | Under 1% each                                  |
| 3     | 3.3% spent, on the replay arms                 |
| 4, 5  | About 1% each                                  |
| 6     | The build's own: 0.6% a commit at the baseline |
| 7     | 3 to 5% for the review, 1 to 2% for the cuts   |

A week's allowance comes to about $1,960 at list prices, good to a sixth either way.

## As built

- **Stage 1 (Nov 21).** `commit-review-process` names one check, `yarn verify:changed`, and starts its reviewer at `high` effort. The command queues itself, one run at a time across the repository's worktrees, after the timings showed that four at once fail on time limits or run the machine out of memory. Its figures are under [stage 1](#stage-1-one-check-a-commit-each-in-its-turn).
- **Stage 2 (Nov 21).** An author commits a checked change, starts its review in the background and keeps working, with two reports out at most. It answers each in an `amend!` commit and squashes those in before the work lands. `merge-to-main` lands no `amend!` and pushes with no review out. The plugin counts the `amend!` commits. The trial is under [stage 2](#stage-2-reviews-in-the-background).
- **Stage 3 (Nov 21).** A review is a `commit-reviewer`, an agent type defined in `.agents/agents/commit-reviewer.md` and linked into `.claude/agents/` by `link-claude-skills.mjs`, which links it into one more folder only when run with `--also-in <folder>`. It holds the repository's rules itself, reads with the shell alone, and runs on Opus at `high`. The author's brief gives what the change is for and the rules that bear on it, quoted in 300 words at most. On the replay set's 25 cases it found every planted defect at half the present review's cost. The figures are under [stage 3](#stage-3-a-commit-reviewer-agent-type-and-its-effort).
- **Stage 4 (Nov 21).** The `multi-agent-build` skill holds how a build by several agents runs: packages of three to nine commits, four fresh workers at once in worktrees of their own, a brief that quotes its package's part of the plan, one queued check a commit, no work logs, and a landing by a rebase, a check and a fast-forward. Against the Brick Breaker uplift's plan it leaves 58 of the 177 lines of the two sections every plan copied. What it decided is under [stage 4](#stage-4-a-skill-for-how-a-build-runs).
- **Stage 5 (Nov 21).** `/measure watch <name>` prints a build's state from any session: its orchestrator, each unfinished agent with the hung ones first, the newest commit and the week. It is worked out from the logs when asked, with the two endings a log does not show noted by their hooks. A connector's call now has ten minutes, by `MCP_TOOL_TIMEOUT` in the settings file. The three planted outages and what each read as are under [stage 5](#stage-5-a-builds-state-to-check-by-hand).
