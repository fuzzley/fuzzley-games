---
name: commit-review-process
description: How a change is reviewed before it is committed here — a fresh subagent, given only the project's and the phase's context, reviews the staged change for correctness, engineering practice, the language's style and the frameworks' and libraries' practices, then the authoring agent answers every comment and commits. Triggers on: commit review, review before committing, review agent, reviewer, code review, review comments, address review.
---

# The commit review process

> Before a change is committed, an independent agent reviews it, and the
> author answers its comments, then commits.

## 1. Stage the change

Once the change passes its checks (each touched workspace's `lint`,
`typecheck` and `test`, and `yarn prettier:check`, from `frontend/`), stage
all of it with `git add`, so the reviewer reads one diff, new files included,
with `git diff --cached`.

## 2. A fresh agent reviews it

Launch a fresh `general-purpose` agent, never a fork. It gets only the
project's and the phase's context: what the work is and what this change is
meant to do, not the reasoning that led to the code, so it judges the code as
a reader who has only the code. It reports and changes nothing.

Its brief:

```text
Review the staged change in the repository at <path> (Windows, Git Bash;
Yarn 4, run yarn from `frontend/`, never npm). Read it with
`git diff --cached`.

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
  as the change uses them>.

Don't change, stage, unstage or commit anything; the author is working in the
same checkout. You may read anything and run a workspace's lint, typecheck
and tests (`yarn vitest run <spec>` from its folder). To prove a finding by
changing code, do it in a copy in a scratch folder outside the repository and
say what you ran.

Report a numbered list, most important first, each with the file and line,
what is wrong, why it matters and a concrete fix; then what you checked and
found fine. If nothing matters, say so plainly rather than reaching for nits.
Keep it under 900 words.
```

## 3. The author answers it and commits

- **Every comment is answered.** Check each against the code before acting on
  it, since a reviewer can be wrong. Fix it, or leave it with a reason, written
  in the work log where the work keeps one, or in the commit message's body.
- **The fixes go into the change,** and its checks run again.
- **Then commit,** in the repository's form (`fix(snake): …`, a lower-case
  sentence, no attribution lines).

A fix that reshapes the change, rather than correcting it, earns the change a
second review before it is committed.
