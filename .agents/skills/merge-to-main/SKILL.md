---
name: merge-to-main
description: How a finished change is merged into main here, once the user asks for the merge — a change that touches code first passes yarn verify:full, every workspace's coverage floor holding and the change's own code covered, its gaps filled with specs; then it lands on main as a fast-forward and is pushed, which deploys it, and the branches it leaves behind are deleted. Triggers on: merge to main, merge into main, land the change, ship it, push to main, ready to merge, clean up merged branches.
---

# Merging into main

> A change to code reaches `main` only once its coverage holds; then it is
> pushed, and the branches it leaves behind are deleted.

A push to `main` deploys, once the Verify workflow passes on it (the
`github-actions-ci-cd` skill), so the push and the remote deletions happen
only when the user asked for the merge. Run `git` from the repository's root
and `yarn` from `frontend/`. Every commit made on the way goes through the
`commit-review-process` skill first, the specs written for coverage among
them.

## 1. Know what lands

- **The checkout may be shared.** Another session's work may sit in it,
  changed, staged or untracked: never stage, stash, reset, commit or delete
  it. `git diff --cached --name-only` shows what is staged already.
- **The change is committed, and nothing else is.** Commit its files by
  name, `git add` for the new ones, then `git commit -- <paths>`, which
  leaves out whatever another session staged.
- **What lands** is `git log --oneline origin/main..HEAD`, after
  `git fetch origin`. Where that holds a commit that isn't the change's,
  stop and ask: pushing would send it live too.
- **It sits on `origin/main` as it is now.** Where
  `git merge-base --is-ancestor origin/main HEAD` fails,
  `git rebase origin/main`, on the change's branch or on `main`. A rebase won't start
  while tracked files hold changes; where those are another session's, ask
  rather than move them. History here is linear: no merge commits, no
  squashes.

## 2. What the change touches decides its checks

- **Code under `frontend/`,** any file there but Markdown, an image or a
  sound, gets the coverage check in step 3:

  ```bash
  git diff --name-only origin/main...HEAD -- ':/frontend' | grep -vE '\.(md|png|webp|jpe?g|gif|svg|wav|ogg|mp3)$'
  ```

- **The `.agents/` scripts** get `yarn lint` and `yarn typecheck`.
- **The image,** the `Dockerfile`, `nginx.conf.template`, `nginx/`,
  `docker-entrypoint.d/` or `.github/scripts/check-image.sh`, is built and
  served as `docs/operations.md` shows, and checked with that script, as the
  workflow's `docker` job runs it.
- **Markdown alone,** a plan, a doc, a skill or an `AGENTS.md`, gets
  `yarn lint`, which checks its links, paths and formatting as CI does.

The checks read the working tree, another session's files included. A
failure in a file that isn't the change's, such as Prettier on another
session's untracked doc, isn't the change's to fix: check the change's own
files for that step (`npx prettier --check <paths>` from the root), then run
the steps after it.

## 3. Coverage, where the change touches code

- **Run `yarn verify:full`:** lint, type-check, every workspace's tests with
  coverage (`yarn test:coverage`), then the build: what CI runs. Where the
  change touches how a game lays itself out, its styles, shell or scene, run
  `yarn check:layout` after it too, as CI does.

- **The target is two things:**
  1. **Every floor holds.** A workspace's `test:coverage` fails below the
     floors its config sets: its `vitest.config.ts`, or the site's in the
     `test` block of `frontend/site/vite.config.ts`.
  2. **The change's own code is covered.** Every line and branch it adds or
     changes, in what its workspace's coverage measures (the `include` and
     `exclude` the config gives it), runs in a spec, as `.agents/AGENTS.md`
     asks of new and changed code. The text report's "Uncovered Line #s"
     column lists what doesn't, file by file, and a workspace's
     `coverage/index.html` shows it line by line. What only a breaker's
     `sim` project runs shows as uncovered, since that project runs without
     coverage; a line no spec can reach, such as a defensive fallback, is
     named in the commit's body with the reason, or asked about.

- **A gap is filled with specs, never by moving the target.** Write them as
  the repository's rules and the workspace's testing skill say: state
  checked through the public API, real objects over mocks. Never lower a
  floor, widen an `exclude` or add an ignore comment to pass. Iterate on the
  workspace alone, `yarn workspace <name> test:coverage` (`site`, a game's
  folder name, or a library's `@fz/<lib>`), then commit the specs through
  `commit-review-process` and run `yarn verify:full` again.

- **A floor the figures have outgrown rises with them.** Each sits a little
  under its workspace's figures; where they now clear it, raise it to a
  little under them, in the commit with the specs.

- **Any other failure** (lint, a type, a spec, the build) is fixed in the
  change the same way, before anything is pushed.

## 4. Land it on main and push

Never force-push `main`, and never push `live`: the Verify workflow's
`promote` job moves `live` once the pushed commit passes.

- **Push it as a fast-forward:** `git push origin HEAD:main`, from `main` or
  the change's branch.
- **From a branch, bring the local `main` up to it:**
  `git fetch origin main:main` where no worktree has `main` checked out, or
  `git -C <worktree> merge --ff-only origin/main` in the one that does
  (`git worktree list` names it). Where that worktree's own changes stand in
  the way, leave it, and say so.
- **Rejected, since `main` moved on:** `git fetch origin`, rebase onto
  `origin/main` again, run the checks again where the change or what landed
  before it touches code, then push.
- **Then say what landed:** the commits, and the Verify run on the pushed
  commit (`gh run list --workflow verify.yml --commit "$(git rev-parse HEAD)"`),
  which decides whether it goes live.

## 5. Delete the branches it leaves behind

`main`, `live` and Dependabot's branches (`dependabot/…`, each an open pull
request) are never deleted. A branch checked out in any worktree, the
change's own among them, is in use: leave it and its worktree, and name them.

- **Prune what is gone:** `git fetch --prune origin`, and
  `git worktree prune` for worktrees whose folders were removed.
- **Local branches merged into `main`,** which `git branch -d <name>`
  deletes; one checked out in a worktree fails, and stays:

  ```bash
  git for-each-ref --merged origin/main --format='%(refname:short)' refs/heads | grep -vxE 'main|live'
  ```

- **Remote branches merged into it,** which
  `git push origin --delete <name>` deletes:

  ```bash
  git for-each-ref --merged origin/main --format='%(refname:lstrip=3)' refs/remotes/origin | grep -vxE 'HEAD|main|live|dependabot/.*'
  ```

- **A branch rebased before it landed** has its commits on `main` under
  other hashes, so neither list holds it. Where
  `git cherry origin/main <branch>` marks every commit `-`, all of it is on
  `main`: delete it too, with `git branch -D <name>` or the remote delete.
- **Anything else is unmerged work.**
  `git branch -av --no-merged origin/main` lists it with each branch's last
  commit; leave Dependabot's, delete none of the rest, and ask about each.
