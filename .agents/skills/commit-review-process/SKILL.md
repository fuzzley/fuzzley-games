---
name: commit-review-process
description: How a change is reviewed here before it lands: the author checks and commits it, a commit-reviewer agent reviews the commit in the background, and the author answers every comment in an amend! commit, squashed in before the work lands. Triggers on: commit review, review a commit, review before committing, reviewer, code review, review comments, address review, amend!, fixup, autosquash.
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
  that anything on the branch reaches. How such a build runs, its packages,
  briefs and landings, is the `multi-agent-build` skill's.
- **Give it ten minutes** (the Bash tool's `timeout`), and no lock of your
  own. A run takes the whole machine, so it waits for any that started
  before it in the repository's worktrees, and says how many. Alone it takes
  about a minute for one game and three for a shared library. Where the
  limit ends it while it waits, run it again: the place it left clears in a
  minute.
- **The check is the author's alone:** the reviewer takes it as passed and
  runs nothing.

## 2. A `commit-reviewer` reviews the commit, in the background

Launch a `commit-reviewer` agent (the Agent tool's `subagent_type`) in the
background (`run_in_background`), so its report arrives as a message. Its
definition, `.agents/agents/commit-reviewer.md`, holds what every review
needs: how to read a change, what to review it for, the repository's rules
for code, doc comments, specs, Angular and Sass, and the report's form. So
the brief carries only what its author knows:

```text
Review the commit <sha> in the repository at <path>.

The project: <one or two sentences, or the plan to read, e.g. a doc in docs/>.
This change: <what it is meant to do, in two or three sentences>.

The rules that bear on it:
From <a file>: <its sentences that state a rule for what the change touches,
quoted>
```

- **Say what the change is for, not how you came to it,** so the reviewer
  judges the code as a reader who has only the code.
- **Quote the rules; don't send the reviewer to read them.** It reads no
  `AGENTS.md` and no skill whole, so a rule its definition doesn't hold
  reaches it through the brief or not at all. They come from:
  - the `AGENTS.md` of each workspace the change touches;
  - `frontend/games/AGENTS.md`, for a game;
  - `frontend/AGENTS.md`'s Workspaces and Checking sections, for a change in
    any workspace: the definition condenses only its Angular and Sass;
  - the sections of `.agents/AGENTS.md` that the definition doesn't
    condense, such as Content Security Policy and Agent Configuration, for a
    change outside every workspace;
  - a skill, where the change hangs on a rule only the skill states, such
    as `phaser-core`'s on where Phaser may be imported.
- **Quote the rules that bear, in 300 words at most.** Quote the sentences
  that state a rule for the files, the folders or the kind of thing the
  change touches: a "never", an "only", who may import what, a key that is
  stored. Where the limit leaves out a rule that bears,
  name its file and its opening words, for the reviewer to search for.
  Where no rule bears, leave the paragraph out.
- **A change that adds or edits words a player reads** gains a paragraph:
  "It adds or edits words a player reads. Read
  `.agents/skills/player-text/SKILL.md`, the file for that kind of text in
  `.agents/skills/player-text/references/`, and `read-back.md` there. Read
  each new string against them, for its shape and budget, the ordinary
  word, and whether it is true to the code."
- **Where no `commit-reviewer` is among the agent types offered,** don't
  review with another type in silence. The definition isn't linked, or the
  session started outside the repository. Say so to the person the session
  works for, with the way out:
  - `node .agents/link-claude-skills.mjs`, in a fresh clone or worktree,
    where nothing is linked yet;
  - a session started inside the repository, or that script with
    `--also-in <the folder the session starts in>`;
  - then Claude Code started again, if the type still isn't offered.

  Their answer holds for the session. Go on without the type only where they
  say to, and then with a `general-purpose` agent, never a fork, at `high`
  effort (the Agent tool's `effort`), whose brief opens "Read
  `.agents/agents/commit-reviewer.md` in the repository at `<path>`, and
  review as it says. Use only the shell, and only to read."

- **A session that starts workers looks before it starts them,** asks once,
  and writes the answer into each worker's brief. A worker can't ask, since
  its report ends its run. One that isn't offered the type, and whose brief
  doesn't say what to do then, hands its work back with each commit named as
  not reviewed, and nothing of it lands until whoever started it has had
  them reviewed.

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
  difference reviewed, by step 2's brief, opening "Review what
  `git diff <the tip before> <the tip now>` shows in the repository at
  `<path>`.", each tip by its commit's name, since `HEAD` moves on.
- **An `amend!` still in the log** named a subject no commit has. Say so
  rather than land it.

Merging into `main` then follows the `merge-to-main` skill.

## One change on its own

A session with a single change and nothing to do while it is reviewed, such
as a doc fix, keeps the short way: stage the change once the check passes,
review the staged change in the foreground, answer every comment, fix what
needs it, check again, then commit, the answers in the message's body. The
brief then opens "Review the staged change in the repository at `<path>`."
in place of its first sentence.
