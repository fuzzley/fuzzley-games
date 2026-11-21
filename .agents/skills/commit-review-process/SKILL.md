---
name: commit-review-process
description: How a change is reviewed before it is committed here — a fresh subagent, given only the project's and the phase's context, reads the staged change, taking the author's checks as passed, and reviews it for correctness, engineering practice, the language's style and the frameworks' and libraries' practices, then the authoring agent answers every comment and commits. Triggers on: commit review, review before committing, review agent, reviewer, code review, review comments, address review.
---

# The commit review process

> Before a change is committed, an independent agent reviews it, and the
> author answers its comments, then commits.

## 1. Check the change and stage it

Once `yarn verify:changed` passes, from `frontend/`, stage all of the change
with `git add`, so the reviewer reads one diff, new files included, with
`git diff --cached`.

- **That one command is the change's check.** It runs the root's lint (the
  skills' and `AGENTS.md` references, the constraints and the lockfile),
  Prettier's check and the root's typecheck, beside the lint, typecheck,
  tests, build and layout check of each workspace the change reaches. Don't
  run a workspace's checks or the root's `yarn lint` as well: they are in
  it. A change to Markdown alone reaches no workspace, so it runs the
  root's.
- **On a branch that holds more than this change,** such as a package of a
  build that lands on an integration branch, pass `--base <that branch>`.
  Left alone it compares with `origin/main`, and checks every workspace
  that anything on the branch reaches.
- **Give it ten minutes** (the Bash tool's `timeout`), and no lock of your
  own. A run takes the whole machine, so it waits for any that started
  before it in the repository's worktrees, and says how many. Alone it takes
  about a minute for one game and three for a shared library. Where the
  limit ends it while it waits, run it again: the place it left clears in a
  minute.
- **The check is the author's alone:** the reviewer takes it as passed and
  runs nothing.

## 2. A fresh agent reviews it

Launch a fresh `general-purpose` agent, never a fork, at `high` effort (the
Agent tool's `effort`), whatever the session's own. It gets only the
project's and the phase's context: what the work is and what this change is
meant to do, not the reasoning that led to the code, so it judges the code as
a reader who has only the code. It reads and reports, and runs and changes
nothing.

Its brief:

```text
Review the staged change in the repository at <path>. Read it with
`git diff --cached`. The author has run `yarn verify:changed`, which lints,
type-checks, tests and builds what the change reaches, and it passes.

The project: <one or two sentences, or the plan to read, e.g. a doc in docs/>.
This phase: <what the phase builds>. This change: <what it is meant to do,
and the files it touches>.

Read first: `.agents/AGENTS.md`, `frontend/AGENTS.md`, the AGENTS.md of each
workspace the change touches, and <the skills for the frameworks and
libraries it uses>.

Review it for:
- correctness: bugs, edge cases, behaviour changed beyond what the change
  says, specs that would pass with the code broken;
- engineering practice: structure, names, duplication, layering, error
  handling, specs that check state through the public API;
- the language's style and idioms: Google's TypeScript style guide and the
  repository's rules for code, doc comments and specs;
- the frameworks' and libraries' practices: <Angular, Phaser, Sass, Vitest,
  as the change uses them>;
- the words a player reads, where the change adds or edits any: read each
  new string against the `player-text` skill (its `SKILL.md`, the file
  for that kind of text, and its read-back list), for its shape and budget,
  the ordinary word, and whether it is true to the code.

Review the code by reading it: the diff, the files around it and anything
else in the repository. Don't run the checks, a build, the specs or a script
of your own; take the author's checks as passed, and let each finding stand
on the code you cite. Don't change, stage, unstage or commit anything; the
author is working in the same checkout.

Report a numbered list, most important first, each with the file and line,
what is wrong, why it matters and a concrete fix; then what you read and
found fine. If nothing matters, say so plainly rather than reaching for nits.
Keep it under 900 words.
```

## 3. The author answers it and commits

- **Every comment is answered.** Check each against the code before acting on
  it, since a reviewer can be wrong. Fix it, or leave it with a reason, written
  in the work log where the work keeps one, or in the commit message's body.
- **The fixes go into the change,** and `yarn verify:changed` runs again.
- **Then commit,** in the repository's form (`fix(snake): …`, a lower-case
  sentence, no attribution lines).

A fix that reshapes the change, rather than correcting it, earns the change a
second review before it is committed.

Merging the commits into `main` then follows the `merge-to-main` skill.
