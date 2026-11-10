# Work log: Brick Fuzz Pop, integration

The log of [`implementation-plan.md`](../implementation-plan.md) as it is
built: what each package built, where it went other than planned and why,
what the checks reported, each review comment and what became of it, and
the numbers worth keeping. This file is the integrator's; each stream keeps
its own beside it (`rules.md`, `proof.md`, `art.md`, `view.md`), so no two
agents write the same file. The whole folder is deleted once the game is
built and ready to merge into `main`, as the user asked on 2026-11-10; the
commits that delete it hold it.

## How the work runs

- **Branches.** Part 1 is built on `brick-fuzz-pop-lift`, cut from `main` at
  `9fbc77ad`. Part 2 is built on `brick-fuzz-pop`, cut from its tip once Q1
  passes (§7.4). Nothing is pushed and nothing reaches `main` without the
  user's word.
- **Worktrees.** Each branch has a worktree of its own under
  `/home/dev/Projects/personal/bfp-wt/`, with its own `yarn install` (8 s
  from the cache): `integration/` holds the integration branch, and
  `rules/`, `proof/`, `art/` and `view/` hold the streams' `bfp/<stream>`
  branches. The main checkout stays on `main`, untouched, since another
  session's files sit in it.
- **Streams.** One agent per stream, as §7.2's table gives them, each with
  its packages by id, §5's contracts, §7.3's files and a reminder never to
  push or touch `main`. Each runs its own checks with `--maxWorkers=4`, and
  only the integrator runs a full `yarn verify`.
- **Reviews.** Every commit, in every stream, follows the
  `commit-review-process` skill: the change staged, a fresh
  `general-purpose` agent reviewing it with only the project's and the
  package's context, every comment answered in the stream's log, then the
  commit.
- **Merging.** The integrator rebases each finished stream onto the
  integration branch in the order the plan lists, runs the touched
  workspaces' checks, and fast-forwards, so the history stays linear. A
  phase's last merge runs `yarn verify` and `yarn check:layout`.
- **Q3 is the user's.** The build stops after U2 and T1 for the user to
  play the first nine levels, as `plan.md`'s QA table says.

## Part 1: the lifts

### Wave 0 started (2026-11-10)

- `brick-fuzz-pop-lift` cut from `main` at `9fbc77ad`, with this log as its
  first commit.
- Baselines taken on `9fbc77ad` for Q1: Brick Breaker's `report:levels` and
  Asteroid Breaker's `report:waves`, kept in the session's scratchpad to be
  compared with the same reports after the lifts.
- The streams: rules L1 and L6, proof L2 and L7, art L4 and L5, view L3 and
  L8.
