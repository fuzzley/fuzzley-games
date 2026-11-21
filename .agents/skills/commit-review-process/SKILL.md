---
name: commit-review-process
description: How a change is reviewed here before it lands — the author checks and commits it, a fresh subagent, given only the project's and the phase's context, reviews that commit in the background, taking the author's checks as passed, for correctness, engineering practice, the language's style and the frameworks' and libraries' practices, while the author keeps working; then the author answers every comment in an amend! commit and squashes those in before the work lands. Triggers on: commit review, review a commit, review before committing, review agent, reviewer, code review, review comments, address review, amend!, fixup, autosquash.
---

# The commit review process

> Before a change lands, an independent agent reviews it and the author
> answers its comments. The author commits first, so the review runs while
> it keeps working.

## 1. Check the change and commit it

Once `yarn verify:changed` passes, from `frontend/`, commit the change: its
own files and no others, in the repository's form (`fix(snake): …`, a
lower-case sentence, no attribution lines), its message as it should land. A
commit holds still while its author keeps working, which a staged diff
can't.

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

## 2. A fresh agent reviews the commit, in the background

Launch a fresh `general-purpose` agent, never a fork, at `high` effort (the
Agent tool's `effort`), whatever the session's own, in the background
(`run_in_background`), so its report arrives as a message. It gets only the
project's and the phase's context: what the work is and what this change is
meant to do, not the reasoning that led to the code, so it judges the code as
a reader who has only the code. It reads and reports, and runs and changes
nothing.

Its brief:

```text
Review the commit <sha> in the repository at <path>. Read it with
`git show <sha>`, and a file as it was at that commit with
`git show <sha>:<path>`: the author keeps working in the same checkout, so
the files there may have moved on. The author has run `yarn verify:changed`,
which lints, type-checks, tests and builds what the change reaches, and it
passes.

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
on the code you cite. Don't change, stage, unstage, commit or check out
anything.

Report a numbered list, most important first, each with the file and line,
what is wrong, why it matters and a concrete fix; then what you read and
found fine. If nothing matters, say so plainly rather than reaching for nits.
Keep it under 900 words.
```

## 3. The author keeps working, two reviews out at most

- **Go on to the next change,** and keep it small until the report is in: a
  finding may change what it builds on.
- **At most two commits wait on a report at once.** With two out, wait for
  one.
- **Answer a report between changes.** Bring the change in hand to its
  commit first, so the tree holds only the fix, and the check and the
  `amend!` take nothing half-built.

## 4. The author answers each report in an `amend!` commit

- **Every comment is answered.** Check each against the code before acting on
  it, since a reviewer can be wrong. Fix it, or leave it with a reason.
- **The fixes and the answers go in one `amend!` commit,** which git later
  folds into the commit reviewed, message and all. Write its message by
  hand, since `git commit --fixup=amend:<sha>` opens an editor. Its first
  line is `amend!` and the reviewed commit's subject, which
  `git log -1 --format='amend! %s' <sha>` prints. The rest is that commit's
  whole new message, the answers in its body. Commit the fix's files by
  name, once `yarn verify:changed` passes again, so nothing else staged goes
  with them (`git add` a new file first):

  ```bash
  git commit -F - -- <the fix's files> <<'EOF'
  amend! fix(snake): keep the head on the board when it turns at a wall

  fix(snake): keep the head on the board when it turns at a wall

  What the change does, as it should read once it lands.

  Review: 1. Taken: the turn is clamped before the move. 2. Left: the
  spec already covers a corner, in `board.spec.ts`.
  EOF
  ```

- **Answers with nothing to fix** go in an empty one, which takes nothing
  staged: `git commit --allow-empty --only -F - <<'EOF'`. A report that
  found nothing needs no commit.
- **A second `amend!` for one commit** names the same subject, whatever the
  first made of it, and its message starts from the first's, since git keeps
  only the last one's.
- **What a fix changes in a later commit** goes in that commit's own
  `amend!`, or in the change in hand, never in this one: folded in, it would
  come before the commit it mends. Where both fall in one file, make and
  commit the one before making the other.
- **A fix that reshapes the change,** rather than correcting it, earns a
  second review, of the `amend!` commit, as step 2 has it.

## 5. The author squashes before the work lands

Before a package is reported done, or the work is merged, with every report
in and answered and nothing uncommitted:

```bash
before=$(git rev-parse HEAD) &&
  GIT_EDITOR=true git rebase --autosquash --keep-base <base> &&
  git diff --stat "$before" HEAD &&  # prints nothing
  git log --oneline <base>..HEAD     # shows no amend!
```

`<base>` is the branch the work left, or `origin/main` for work on `main`
itself. The rebase folds each `amend!` into its commit and keeps the branch
on the commit it grew from, so what lands is whole, reviewed commits. Run it
on your own branch, in your own worktree. It won't start while tracked files
hold changes; where those are another session's, ask rather than move them.

- **The diff prints nothing,** as a rule, since a squash only folds: what
  lands is the tree the last check passed, and needs no check of its own.
- **A squash that conflicts** is the author's to settle, then
  `GIT_EDITOR=true git rebase --continue`. The tip from before it is then
  `ORIG_HEAD`, to diff against: `git diff --stat ORIG_HEAD HEAD`.
- **Where the diff prints something,** after a conflict or without one, the
  squash changed what lands: run `yarn verify:changed`, and have the
  difference reviewed, by step 2's brief with `git diff <the tip before> HEAD`
  in place of `git show <sha>`.
- **An `amend!` still in the log** named a subject no commit has. Say so
  rather than land it.

Merging into `main` then follows the `merge-to-main` skill.

## One change on its own

A session with a single change and nothing to do while it is reviewed, such
as a doc fix, keeps the short way: stage the change once the check passes,
review the staged change in the foreground, answer every comment, fix what
needs it, check again, then commit, the answers in the message's body. The
brief then opens "Review the staged change in the repository at `<path>`.
Read it with `git diff --cached`.", in place of its first sentence and the
one on `git show`.
