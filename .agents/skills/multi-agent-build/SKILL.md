---
name: multi-agent-build
description: How a plan is built here by several agents at once: packages of three to nine commits, four workers at a time in their own worktrees, each landed on an integration branch by a rebase, a check and a fast-forward. Triggers on: multi-agent build, parallel build, orchestrator, integration branch, work package, worker agent, worktree.
---

# A build by several agents

> An orchestrator builds a plan through worker agents and lands their work
> on one integration branch.

## 1. Before it starts

- **Measure it,** where the `measure` plugin is installed:
  `/measure start <name> --trying <what is on trial>`, and `/measure stop`
  once the last package lands. The start prints the share of the week
  used. A commit takes about 0.6% of a week, so 60 commits need about 35%
  free. With less, run fewer workers or wait.
- **Look for `commit-reviewer`** among the agent types offered. Where it is
  missing, ask once and write the answer into every brief, as step 2 of
  `commit-review-process` has it.
- **Cut the integration branch** from `origin/main`, in its own worktree
  under `.claude/worktrees/`, installed as section 2 says. Only the
  orchestrator moves it.

## 2. Packages, and how many at once

- **A package is three to nine commits.** Fold one of one or two into its
  neighbour, and split one that would pass nine.
- **Each is a fresh `general-purpose` agent,** in the background, its
  description opening `[worker pkg=<id>]`, or `[helper]` for one that
  builds nothing, for the plugin. None is kept for a second package: the
  next's brief holds the last's report.
- **Four run at once.** Five only when five are ready and none waits on
  another.
- **Each has its own worktree and branch,** cut from the integration tip
  and installed before its agent starts: `yarn install --immutable` from
  `frontend/`, then `node .agents/link-claude-skills.mjs`.

## 3. The brief

A brief carries its package's part of the plan:

```text
Build package <id> of <the build>, in the worktree <path>, on the branch
<branch>, cut from <the integration branch>. Work as section 4 of the
`multi-agent-build` skill says.

The package, from the plan:
<its section, quoted whole, with each decision and contract it cites>

Before it: <the report of each package it follows, in a few lines>

Read first: <file>:<lines>, <what is there>; …
Skills: <the few it needs, by name>
Rules that bear:
From <a file>: <its sentences that state a rule for what the package
touches, quoted>

You own <files>. You may add to <files>, and only add.
Your port is <n>.
Reviews: <a `commit-reviewer` is offered, or what to do without one>.
```

- **Quote rules as a review's brief does,** but none from the `AGENTS.md`
  of a workspace the package edits: the harness loads it when the worker
  opens a file there.

## 4. How a worker works

- **It reads what the brief names in one command, or in parallel calls,**
  and whatever else it already knows it needs the same way. It doesn't read
  the plan, another package's work, or an `AGENTS.md` or a skill the brief
  doesn't name.
- **It works only in its worktree.** It never pushes, never touches `main`,
  the integration branch or another package's branch, and never uses
  `git stash`, whose stack every worktree shares.
- **It changes the files it owns freely, and only adds to another's:** an
  entry, a field, a function of its own, a line of docs. It renames, moves
  and restyles nothing there.
- **It builds in small commits, each whole:** its code, its specs, its
  docs. It adds to an `AGENTS.md` only a rule or a major caveat, as
  `.agents/AGENTS.md` says under Agent Configuration, and to a skill only
  what a later agent can't see in the code.
- **Each commit is checked, as section 5 says, and reviewed** as
  `commit-review-process` says, each reviewer's description opening
  `[review pkg=<id>]`.
- **It formats the files it changed, by name:**
  `node_modules/.bin/prettier --write <paths>` from `frontend/`, never
  `yarn prettier`, which rewrites the repository.
- **A package that changes what a player sees looks at it** before its
  last commit: the game on its own port
  (`yarn dev --port <n> --strictPort` from the game's folder), through
  `frontend/lib/dev/src/chrome.ts`'s headless Chrome, from a script it
  doesn't commit, never a Chrome MCP server, which sessions share. It
  stops the server, and says in its report what it saw.
- **Where the plan leaves a point unsettled,** it takes the choice the
  plan's spirit gives, and says so in its report.
- **It ends with the squash** of `commit-review-process` step 5, then its
  report: what each commit made, what it added to whose files, what it
  chose, what it measured and what it left, in 300 words. It writes no log.

## 5. The checks

- **`yarn verify:changed --base <the integration branch>`** is a commit's
  whole check, from `frontend/` in the worktree, after the last edit, with
  nothing there edited while it runs. Add `--coverage` at a package's last
  commit that touches code a floor holds.
- **Nothing else that takes the machine.** `yarn verify`, `yarn verify:full`
  and the whole `yarn test` join no queue, so one beside a queued run can
  run the machine out of memory. A worker runs single spec files as it
  goes.
- **The queue.** A run says how many started before it. Where the ten
  minutes end the call, run it once more. Where that ends too, stop, and
  report how many runs each try waited for.
- **Mutants** run only where the plan asks, from the one script it gives,
  inside that script's time limit.

## 6. Landing a package

The orchestrator, when a package reports:

1. **Reads the report,** and checks that
   `git log --oneline <the integration branch>..<branch>` shows no `amend!`.
2. **Notes the branch's tip, rebases it onto the integration tip** in the
   package's worktree, and settles what collides.
   `git range-diff <the integration branch> <the old tip> HEAD` shows what
   that changed. It has each commit changed beyond a list or a paragraph
   reviewed again, answers in an `amend!` and squashes, as
   `commit-review-process` says, before step 3.
3. **Runs the check** there, with `--base`, in the background.
4. **Fast-forwards** the integration branch
   (`git merge --ff-only <branch>` in its worktree), removes the package's
   worktree and branch, and starts what waited.

- **A check that fails, or a collision it can't settle,** goes to a fresh
  worker in the package's worktree, its brief holding what failed.
- **After every few landings, and when `origin/main` moves,** it notes the
  tip, rebases the integration branch onto `origin/main`, treats what
  `git range-diff origin/main <the old tip> HEAD` shows as step 2 does, and
  runs `yarn verify:changed` there with no `--base`. What fails there it
  settles itself, or gives to a fresh worker as a package. A package cut
  from the old tip then lands by
  `git rebase --onto <the integration branch> <the old tip>`.
- **History stays linear:** no merge commits, and no squash but an
  `amend!`'s.
- **Merging into `main`** follows `merge-to-main`, once the user asks.

## 7. The orchestrator's own calls

- **It never waits in the foreground,** on an agent or a check.
- **It makes no connector call the build can do without.** An MCP tool's
  call takes no time limit from the agent, and one that hangs holds the
  build until a person looks.
- **It keeps one log,** `.claude/build-log.md` in the integration worktree,
  which git ignores: a line for each package started and landed, each
  collision and how it was settled, each decision, and each tip before a
  rebase. The plan's "As built" takes its figures
  from the commits' bodies, not from this log.

## 8. What a plan still holds

What is that build's alone: its packages, their order and what waits on
what, who owns and who may add to which files, the ports, its budgets,
practices and risks, a script for mutants, and its finish.
