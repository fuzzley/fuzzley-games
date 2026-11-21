# History rewrite: dry runs on a mirror

Dry runs of `git filter-repo` on throwaway mirrors of `github.com/fuzzley/fuzzley-games`, measured on 2026-11-21 on the 24-core devbox (git 2.47.3, git-filter-repo 2.47.0). Nothing was pushed, and no real checkout was touched. Every figure here is printed by a script in [`../scripts/history/`](../scripts/history/) into [`../data/history/`](../data/history/), and each section names the file. The mirrors and raw logs are outside the repository, in `~/Projects/personal/repo-size-2026-11-21/`.

The mirror was cloned with `main` and `live` both at 305edc24. While the runs went on, GitHub's `main` and `live` moved on to 4676dcda: two commits touching 13 files, all docs, none of them a screenshot or an atlas ([`github.txt`](../data/history/github.txt)). So the sizes hold for today's `main` too. The commit-map here is for 305edc24's history, though, and the real run makes its own.

## Summary

| Scenario                                               | Mirror MiB | Saved MiB | Left | Clone MiB | Objects | Main tip changed | Commits default pruning drops |
| ------------------------------------------------------ | ---------: | --------: | ---: | --------: | ------: | ---------------: | ----------------------------: |
| Baseline (no rewrite)                                  |      289.5 |         — | 100% |     290.1 |  44,479 |                0 |                             — |
| S1: old Solitaire folders' absent paths                |      283.0 |       6.5 |  98% |     282.9 |  44,450 |                0 |                             1 |
| S1b: every screenshot and atlas path absent at the tip |      224.6 |      64.9 |  78% |     225.2 |  44,282 |                0 |                             2 |
| **S2: every old screenshot and atlas version**         |   **88.9** | **200.6** |  31% |  **88.8** |  42,632 |                0 |                             6 |
| S3: screenshot and atlas paths gone, tip included      |       42.3 |     247.2 |  15% |      42.2 |  42,237 |   221 on purpose |                             6 |
| S4: every blob over 1 MiB                              |      243.0 |      46.5 |  84% |     243.0 |  44,352 |               15 |                             0 |
| S4: every blob over 500 KiB                            |      146.3 |     143.2 |  51% |     146.2 |  44,060 |               76 |                             1 |
| S5: S2, and blobs over 100 KiB no tip path ever held   |       81.7 |     207.8 |  28% |      82.3 |  42,100 |                0 |                            19 |
| S2 after the screenshot and atlas plans, projected     |       58.5 |         — |  20% |      59.1 |       — |   106 on purpose |                             — |

From [`summary.tsv`](../data/history/summary.tsv) and [`scenarios.tsv`](../data/history/scenarios.tsv). "Clone" is the same mirror with its `refs/pull/*` deleted, which is what a normal clone fetches. GitHub reports 304,769 KB, and the mirror as cloned is 299.64 MiB; once repacked tightly it is 289.5 MiB, the baseline.

- **Recommended: S2's rule, once, with `--prune-empty never`, after the screenshot and atlas plans have landed.** S2 strips every blob that a screenshot or atlas path ever held, except those at the tips of `main` and `live`. The tip tree is untouched and every commit is kept, so the commit-map is one to one, and the mirror goes from 289.5 to 88.9 MiB. Because it keeps "whatever the tip has", the same rule does S3's job once the related plans move the screenshots or atlases out of the tree, so there is one rewrite rather than two.
- **S1 does almost nothing.** `frontend/games/solitaire/docs/screenshots/` is still at main's tip, with 41 `overview.png` files, contrary to the brief. Its 205 blobs are versions of those same 41 paths, so removing absent paths can't reach them, and only 8 atlas paths qualify. S1b, which takes absent paths in every folder, still leaves 224.6 MiB.
- **S4 breaks the tip.** Over 1 MiB it takes Asteroid Breaker's sound sprite, six Solitaire atlas PNGs, the card SVGs they are made from, and archived art; over 500 KiB, 76 tip entries. Each saves less than S2.
- **Once the screenshot and atlas plans have landed, S2 leaves 59.1 MiB for a clone** ([`after-plans.txt`](../data/history/after-plans.txt)). `13-after-plans.sh` strips S2's list and the 103 tip blobs those plans take out of the tree (the PNG originals, the rules pages' `overview.webp` and the PNG atlas pages), measures 49.9 MiB, and adds back the 9.17 MiB the atlas pages take as lossless WebP. Added after the first runs, for [`../plan.md`](../plan.md).
- **S5 isn't worth it.** After S2, history holds at most 11.6 MiB (est.) that no tip path ever held, most of it the Asteroid Breaker plan's old art and sound from before its move to `docs/archive/`. S5 measured 81.7 MiB against S2's 88.9, and takes real history with it: default pruning would drop 19 commits, two lockfile fixes among them.
- **The main risks:**
  - **GitHub's own figure won't fall by itself.** The 33 `refs/pull/*/head` refs are read-only, and #30–#33 are based on today's tip, so they keep the whole old history on GitHub. GitHub's docs say Support removes only sensitive data. Clones shrink at once. But the rewritten branches with the old pull request refs, repacked as the rest, come to 290.2 MiB against today's 289.5, and that is what GitHub keeps until the pull requests are dereferenced or the repository is recreated.
  - **1,381 references to 848 commits** sit in `docs/` (1,091 outside the archive and 211 in it), the memory notes (67) and spec fixtures (12). A script rewrites the 1,369 in docs and the notes from the commit-map; the dry run found no ambiguous or colliding short hash.
  - **The push must move `main` and `live` together.** `promote` moves `live` forward only, so a rewritten `main` with the old `live` fails it. An atomic push with leases on both handles it.
  - **Every local clone has to be cloned again**, 8 GitHub-signed commits on main lose their signatures, and old commit links work only while GitHub keeps the old objects.

## How the runs were made

- **One mirror, one copy a scenario.** `01-mirror.sh` runs `git clone --mirror` once and sets the push URL to `DISABLED`. `env.sh`'s `copy_mirror` gives each scenario a `cp -a` of it with the same push URL, and `guard_push` stops a script if a copy's push URL is anything else or the copy lies outside the work folder.
- **Each scenario runs twice** (`03-scenario.sh`). The first run uses filter-repo's default pruning, only to list the commits it would drop. The second is the one measured and checked, with `--prune-empty never --prune-degenerate never --sensitive-data-removal --no-fetch`. It keeps every commit, prints the first changed commits that GitHub Support asks for, and keeps the (disabled) remote rather than deleting it.
- **Every copy is repacked the same way:** `git reflog expire --expire=now --all && git gc --aggressive --prune=now`. The size is `size-pack` from `git count-objects -v`, and the object count is `in-pack`.
- **Wall times** are one run each of filter-repo and of the gc, on a machine idle but for light scripts, so read them as ±10%.
- **A clone's size too.** A normal clone fetches no `refs/pull/*`, so each scenario is measured again with those refs deleted.
- **A control.** `03-scenario.sh baseline` runs the same measures and checks on a copy nothing rewrote.

The scripts, in the order they run:

| Script                       | What it does                                                                                        |
| ---------------------------- | --------------------------------------------------------------------------------------------------- |
| `01-mirror.sh`               | Clones the mirror, counts its refs by kind, and measures it as cloned and repacked                  |
| `02-inventory.sh`            | Lists every (blob, path) in history, each ref's tip tree, and each blob's packed size               |
| `inventory.mjs`              | Works out what each scenario removes, and writes S1's paths and S2's blob ids                       |
| `03-scenario.sh <name>`      | Rewrites a copy, repacks it, measures it, and runs `git fsck` and `verify.mjs`                      |
| `verify.mjs`                 | Compares the tip trees, the commit counts and every commit hash in commit messages, old against new |
| `04-history-facts.sh`        | Signed commits, merges, roots, and how far back each pull request ref reaches                       |
| `05-hash-refs.sh`            | Counts the commit hashes the repository, the memory notes and the `fuzzley` repository name         |
| `06-github.sh`               | Reads, and only reads, what GitHub holds: size, forks, rules, pull requests, Actions, caches, links |
| `07-github-after-push.sh`    | Measures what GitHub would hold after the push while the old `refs/pull/*` remain                   |
| `08-local-clones.sh`         | Lists the local clones and worktrees, reading only                                                  |
| `09-rewrite-refs-dry-run.sh` | Runs `rewrite-refs.mjs` on copies of `docs/` and the memory notes                                   |
| `10-after-s2.sh`             | Keeps S2's maps, analyses what S2 leaves, sizes S5, and checks that S2 is deterministic             |
| `11-backup-rehearsal.sh`     | Bundles the mirror, restores it, and rolls a rewritten copy back from the bundle, with no push      |
| `12-summary.sh`              | Prints each scenario against the baseline                                                           |
| `13-after-plans.sh`          | Runs S2 as it will run once the screenshot and atlas plans have landed, and projects its size       |

To run them again on a fresh mirror: `01-mirror.sh fresh`, `02-inventory.sh`, then `03-scenario.sh` for each scenario, from `docs/repo-size/scripts/history/`. `WORK=<folder>` puts the mirrors elsewhere.

## The mirror and its refs

A mirror has 43 refs ([`refs-by-kind.tsv`](../data/history/refs-by-kind.tsv), [`refs.tsv`](../data/history/refs.tsv)):

| Kind                      | Count | In a normal clone                                   |
| ------------------------- | ----: | --------------------------------------------------- |
| `refs/heads/main`         |     1 | yes, as `refs/remotes/origin/main`                  |
| `refs/heads/live`         |     1 | yes, as `refs/remotes/origin/live`                  |
| `refs/heads/dependabot/*` |     4 | yes, as `refs/remotes/origin/dependabot/*`          |
| `refs/pull/<n>/head`      |    33 | no: only a mirror or an explicit refspec fetches it |
| `refs/pull/<n>/merge`     |     4 | no, as above; GitHub keeps one for each open PR     |
| tags                      |     0 | —                                                   |

- **The pull request refs are the difference.** There is one `head` for every pull request ever opened (all 33 are Dependabot's), and a `merge` for each of the four open ones. A mirror fetches them; a clone doesn't.
- **They reach far back.** Each holds one commit that main lacks, and its base is a commit of main: #1–#5 from 2026-10-17/18, and #30–#33 at 305edc24, main's tip ([`pull-refs.tsv`](../data/history/pull-refs.tsv)). So between them they keep the whole of main's old history reachable.
- **`live` and `main` were the same commit,** 305edc24, and the Dependabot branches are each one commit on top of it.
- **The history** ([`history-facts.txt`](../data/history/history-facts.txt)): 1,742 commits in all, 1,705 on main, 44 of them merges. It has three roots: this repository's of 2026-10-11, and the two brought in from fSolitaire (2018-09-09) and fMinesweeper (2016-02-18). 44 commits are signed, each with GitHub as its committer, 8 of them on main.

Sizes ([`mirror-as-cloned-count-objects.txt`](../data/history/mirror-as-cloned-count-objects.txt), [`baseline.tsv`](../data/history/baseline.tsv), [`baseline-count-objects.txt`](../data/history/baseline-count-objects.txt)):

- **GitHub's `diskUsage`: 304,769 KB.** The REST `size` is the same.
- **The mirror as cloned: 299.64 MiB**, in one pack of 44,479 objects.
- **The baseline, repacked: 289.5 MiB**, in 108–109 s of gc. A clone's share, without `refs/pull/*`, is 290.1 MiB. Repacked without them, git found slightly worse deltas: the pull request refs add almost nothing of their own, since each is one small commit.

## What history holds

From [`inventory-folders.tsv`](../data/history/inventory-folders.tsv) and [`inventory-scenarios.tsv`](../data/history/inventory-scenarios.tsv). Sizes are each blob's size on disk in the baseline's pack, a delta counted as its delta, so they are estimates; the scenarios' measured sizes are the real figures.

| Folder                                                            | Files at tip | Blobs ever | At tip | MiB, all | MiB, not at tip |
| ----------------------------------------------------------------- | -----------: | ---------: | -----: | -------: | --------------: |
| `frontend/games/solitaire/public/docs/screenshots`                |          123 |        957 |    123 |    126.6 |           115.7 |
| `frontend/games/solitaire/docs/screenshots`                       |           41 |        205 |     41 |     92.1 |            72.6 |
| `frontend/games/solitaire/src/engine/render/assets/sprites/atlas` |           45 |         77 |     32 |     39.0 |            26.1 |
| `frontend/games/solitaire/src/game/assets/sprites/atlas`          |            0 |          7 |      0 |      7.0 |             7.0 |
| `frontend/games/solitaire/src/assets/sprites/atlas`               |            0 |          6 |      0 |      3.6 |             3.6 |
| `frontend/games/solitaire/public/assets/sprites/atlas`            |            0 |          2 |      0 |      1.9 |             1.9 |
| each other game's `public/docs/screenshots`                       |            2 |       6–12 |    2–3 |  0.1–0.4 |         0.0–0.3 |
| **every screenshot and atlas folder, each blob once**             |              |  **1,252** |    210 |    247.1 |           203.3 |

- **Everything:** 19,610 blobs take 285.8 MiB. The 3,317 at main's tip take 68.0 MiB, and the 16,293 that aren't take 217.7 MiB.
- **The old Solitaire screenshot folder is still there.** `frontend/games/solitaire/docs/screenshots/` holds 41 `overview.png` files at main's tip: the lossless originals that `yarn capture:screenshots` writes outside `public/`, and that `.dockerignore` leaves out of the image. It never lost a path: its 205 blobs are the 41 at the tip and earlier takes of the same paths.
- **No stripped blob is used elsewhere.** None of S2's 1,042 blobs was ever stored at a path outside a screenshot or atlas folder ([`inventory-s2-also-elsewhere.tsv`](../data/history/inventory-s2-also-elsewhere.tsv)), so S2 takes nothing else with them.
- **No other branch needs a blob kept** ([`inventory-ref-tips.tsv`](../data/history/inventory-ref-tips.tsv)). `live` is `main`, and the four Dependabot branches hold no screenshot or atlas blob that main's tip doesn't. Pull request heads #6–#22 hold 166–174 such blobs each, the screenshots of their day, which S2 strips from them. That doesn't matter: GitHub won't take a push to `refs/pull/*`, so they stay as they are there anyway. S2's list keeps the blobs at both `main`'s and `live`'s tips, so a `live` behind `main` on the day keeps its tree as deployed.

## The scenarios

Each was checked the same way ([`scenario-<name>-verify.txt`](../data/history/), [`scenario-<name>-fsck.txt`](../data/history/)): `git fsck --full` passed on every one; the tip trees of `main` and `live` were compared entry by entry with the old ones; and the commit count on main stayed 1,705, and 1,742 over all refs, since every run kept empty commits. filter-repo printed its first changed commits for each, in [`scenario-<name>-filter-repo.txt`](../data/history/).

| Scenario | filter-repo s |  gc s | fsck | Tip differences, main and live | Commits | Message references wrong |
| -------- | ------------: | ----: | ---- | ------------------------------ | ------: | -----------------------: |
| baseline |             — | 108.8 | ok   | 0                              |   1,705 |                        0 |
| S1       |           2.3 | 108.2 | ok   | 0                              |   1,705 |                        0 |
| S1b      |           2.3 |  83.0 | ok   | 0                              |   1,705 |                        0 |
| S2       |           2.5 |  27.8 | ok   | 0                              |   1,705 |                        0 |
| S3       |           1.3 |   7.9 | ok   | 0, and 221 removed on purpose  |   1,705 |                        0 |
| S4 1M    |           2.8 | 157.5 | ok   | 15                             |   1,705 |                        0 |
| S4 500K  |           2.7 | 111.3 | ok   | 76                             |   1,705 |                        0 |
| S5       |           1.7 |  24.8 | ok   | 0                              |   1,705 |                        0 |

The rewrite itself takes 1–3 s; the repack is the slow part, and it shrinks with what is left.

### S1: the old folders' absent paths

`--paths-from-file s1-paths.txt --invert-paths`, with the 8 paths under `solitaire/docs/screenshots/`, `solitaire/src/assets/sprites/atlas/`, `solitaire/src/game/assets/sprites/atlas/` and `solitaire/public/assets/sprites/atlas/` that main's tip lacks. All 8 are atlas files: the screenshot folder has lost no path. 289.5 → 283.0 MiB. Three of the blobs at those paths stay, as they were also stored at a path S1 keeps.

### S1b: every absent screenshot and atlas path

The same, with all 64 screenshot and atlas paths main's tip lacks, in any folder (`s1b-paths.txt`). 289.5 → 224.6 MiB. Removing paths can't reach the old versions of a path that still exists, which is most of the weight.

### S2: the current versions only

`--strip-blobs-with-ids s2-strip-ids.txt`: the 1,252 blobs ever stored under `docs/screenshots/` or `sprites/atlas/`, less the 210 of them at main's and live's tips, so 1,042. 289.5 → 88.9 MiB; 88.8 MiB for a clone. The tips of main and live are unchanged, entry for entry.

In history, a stripped blob's file is gone from that commit's tree rather than replaced. So an old commit's checkout has the screenshots and atlases that never changed after it and lacks the rest. The Solitaire Collection won't build at an old commit whose atlas differs from today's, which `git bisect` across the atlases would hit. Once atlases are built from their SVGs, which S2 keeps, an old commit's atlas can be made again with that commit's own `tools/build-card-atlas.mjs`, where it had one.

Running S2 again from the untouched mirror gives the same commit-map, byte for byte ([`s2-determinism.txt`](../data/history/s2-determinism.txt)), so a rehearsal's map is the real run's for the same history and list.

### S3: the paths gone entirely

`--path-regex '(^|/)docs/screenshots/' --path-regex '.+/sprites/atlas/' --invert-paths`. filter-repo refuses a path argument that starts with `/`, regexes included, hence the `.+`. 289.5 → 42.3 MiB. It removes 221 entries from main's tip on purpose and changes nothing else there. It is only right after the other plans have taken the screenshots and atlases out of the tree, and then S2's rule gives the same history.

### S4: by size

`--strip-blobs-bigger-than 1M` and `500K`. Each strips files at main's tip, so the tip is no longer the one deployed ([`inventory-s4-1M-groups.tsv`](../data/history/inventory-s4-1M-groups.tsv), [`-500K-groups.tsv`](../data/history/inventory-s4-500K-groups.tsv), and the lists in [`inventory-s4-1M-other.tsv`](../data/history/inventory-s4-1M-other.tsv) and [`-500K-other.tsv`](../data/history/inventory-s4-500K-other.tsv)):

- **Over 1 MiB: 56 blobs, 29 of which S2 strips too.** What it takes that S2 doesn't:
  - 6 atlas blobs at main's tip: the `card_assets-0.png` of the classic, indexed and all-corner-pips atlases, at 1.5x and 2x.
  - 8 other blobs at main's tip: Asteroid Breaker's `src/scene/sounds/sprite.m4a`, which the game plays; the Solitaire card SVGs the atlases are made from (`playing_card_assets_*.svg`); and four of `docs/archive/asteroid-breaker-uplift/art/*.svg`.
  - 13 blobs not at the tip: seven versions of `solitaire/custom_typings/phaser/index.d.ts` (3.0–4.1 MiB raw each), and old versions of those SVGs.
  - It saves 46.5 MiB and removes 15 entries from main's tip.
- **Over 500 KiB: 224 blobs, 148 of which S2 strips too.** On top of the above it takes 34 tip screenshots and atlases, and 23 other tip files: the sound sprite's `.ogg`, two of its music beds, more archived art and mocks. It saves 143.2 MiB and removes 76 entries from main's tip.

S4 saves less than S2 either way and breaks the tip, so it isn't an option. What it shows is that nothing big but screenshots and atlases is worth stripping.

### S5: S2 and the rest no tip path holds

After S2, history holds 15,251 blobs that main's tip doesn't, 14.4 MiB (est.), and 4,271 of them, 11.6 MiB, were only ever stored at paths main's tip doesn't have ([`inventory-after-s2-total.tsv`](../data/history/inventory-after-s2-total.tsv)). By threshold ([`s5-candidates.txt`](../data/history/s5-candidates.txt)):

| Bigger than | Blobs | MiB raw | MiB on disk (est.) |
| ----------: | ----: | ------: | -----------------: |
|       0 KiB | 4,270 |   131.5 |               11.6 |
|     100 KiB |   297 |    80.0 |                7.6 |
|     500 KiB |    17 |    33.3 |                2.4 |

Over 100 KiB, the biggest are `docs/asteroid-breaker-uplift/`'s sound (2.0 MiB on disk), art previews (2.0) and sound sheets (1.2), from before the plan moved to `docs/archive/`; seven versions of `solitaire/custom_typings/phaser/index.d.ts` (0.7 MiB on disk, as they delta well); fSolitaire's old `yarn.lock` and `package-lock.json`; and fMinesweeper's old `apps/minesweeper/` vendor scripts. S5, with the 100 KiB threshold (`s5-strip-ids.txt`, S2's list and 297 more), measured 81.7 MiB against S2's 88.9, and 82.3 MiB for a clone. With default pruning it would drop 19 commits on main ([`scenario-s5-verify.txt`](../data/history/scenario-s5-verify.txt)): commits whose every change S5 strips, most of them QA logs and plan notes, and two lockfile fixes, "fix(security): resolve Dependabot alerts by updating transitive dependencies" and "fix(ci): update yarn.lock to sync with package.json".

S5 isn't worth it. It saves a few MiB at most, removes real source history (old docs, lockfiles, vendored scripts) that a reader of an old commit might want, and every path it adds is a judgement to defend. The biggest things left after S2 are at the tip itself ([`after-s2-analysis.txt`](../data/history/after-s2-analysis.txt)): the Solitaire atlases, the 41 lossless overviews in `solitaire/docs/screenshots/`, the site's screenshots, Asteroid Breaker's sounds, and the Asteroid Breaker plan's archived assets. Those are for the other plans.

## Pruning: keep the empty commits

With filter-repo's default `--prune-empty auto`, S2 drops 6 commits on main that only changed screenshots or atlases, and they'd map to `0000000` ([`scenario-s2-verify.txt`](../data/history/scenario-s2-verify.txt)):

- 21eaaab6 (2026-08-03), the Simple Simon overview screenshot
- 811e476d (2026-10-10), every game's screenshots retaken with the light under the cards
- a822e6cc (2026-10-25), the screenshots retaken with the new wordmark
- a3d033d2 (2026-10-27), Sudoku's screenshots with Fill in notes
- a9af4b96 (2026-10-28), the screenshots with the choice menu's badge
- fbf76b25 (2026-07-03), placeholder pictures added to the sprite sheet

**Use `--prune-empty never` (and `--prune-degenerate never`).** Docs and the memory notes name a822e6cc twice and a9af4b96 twice ([`rewrite-refs-s2.txt`](../data/history/rewrite-refs-s2.txt)), and pruning would leave those four references pointing at nothing. Kept, these commits become empty ones whose messages still say what was done, every old commit has a new one, and the count stays 1,705. S1 would prune 1, S1b 2, S3 6, S4 at 500K 1, and S4 at 1M none.

## Commit messages

filter-repo rewrites any 7–40 hex token in a commit message that names a commit of the rewritten history, at the same length. `verify.mjs` checked every one, not a sample. Commit messages name commits 20 times, 12 of them in main's commits and the rest in the four synthetic `refs/pull/*/merge` commits ("Merge <sha> into <sha>"). In every scenario all 20 were rewritten to the right new hash and none was wrong. From S2's run, for example:

- 414f164b names 1823367c, and becomes ea50007a naming a416ef6e.
- fd5c050f names afeaabd8 and b3ae2e81, and becomes 1bbe205f naming 02bda833 and 69bb20ad.
- 05b6fd8b names e6740e04, and becomes 2f594fa6 naming d3038881.
- 21dbcad2 names c004b2ce, and becomes a793726e naming 27a925c2.

**S2's maps are kept:** [`s2-commit-map.txt`](../data/history/s2-commit-map.txt) (1,742 commits, all mapped), [`s2-ref-map.txt`](../data/history/s2-ref-map.txt), [`s2-first-changed-commits.txt`](../data/history/s2-first-changed-commits.txt) and [`s2-changed-refs.txt`](../data/history/s2-changed-refs.txt). Prettier has no parser for `.txt`, `.tsv` or `.gz` and skips them when it walks a folder, so they need no `.prettierignore` rule. They are plain text.

## Consequences

### 1. Every place that names a commit

[`hash-refs-summary.tsv`](../data/history/hash-refs-summary.tsv), [`hash-refs-files.tsv`](../data/history/hash-refs-files.tsv), [`hash-refs-code.tsv`](../data/history/hash-refs-code.tsv). A reference is a 7–40 hex token standing alone that `git cat-file` resolves, in the mirror, to a commit. Every token was also looked up in the `fuzzley` repository, and none resolves in both.

| Place                               | Files | References | Distinct commits |
| ----------------------------------- | ----: | ---------: | ---------------: |
| `docs/`, not the archive            |    20 |      1,091 |              818 |
| `docs/archive/`                     |    17 |        211 |              178 |
| `AGENTS.md` and `CLAUDE.md`         |     0 |          0 |                0 |
| Skills (`.agents/`)                 |     0 |          0 |                0 |
| Code and config                     |     3 |         12 |                3 |
| Memory notes                        |    17 |         67 |               37 |
| The `fuzzley` repository            |     0 |          0 |                0 |
| PR and issue bodies and comments    |     0 |          0 |                0 |
| Commit messages (filter-repo's job) |       |         20 |                  |
| **All but messages**                |    57 |  **1,381** |          **848** |

- **Most are data.** `docs/local-pipeline-audit/data/history.tsv` alone has 809, and its `ci-runs.tsv` 113. Next come the archived worklogs and plans, then the CI and local pipeline reports.
- **The code's are test fixtures.** `site_footer.component.spec.ts` (5b87385), `build_info.spec.ts` (e76741b) and `vite-plugins.spec.ts` (e72f5a7) use real short hashes as sample strings, which the specs only compare, so leave them.
- **The memory notes** name 37 commits, 65 times by 8 characters and twice by 7. They also name `fuzzley` commits, such as 960f322, which resolve only there and are left alone.
- **The `fuzzley` repository pins no commit here.** Its `frontend/games.json` pins builds of fPong and fSpider only. The Solitaire Collection and Minesweeper are pinned and served by this repository now, and `fuzzley` only links to `tree/main` paths here.
- **GitHub:** 33 pull requests, 0 issues and 23 comments, none naming a commit ([`github-hash-refs.tsv`](../data/history/github-hash-refs.tsv)). Dependabot alerts are off. There are no releases, tags, deployments or environments ([`github.txt`](../data/history/github.txt)).
- **The live site** names its commit in `version.json` (`"commit": "4676dcd"` today) and links to `github.com/fuzzley/fuzzley-games/commit/<short>` from the footer and each game's settings drawer. The image has no `.git`; the Dockerfile takes the commit as a build argument (`COMMIT_SHA`), so the first deploy after the push names the new hash.
- **Old links.** GitHub serves a commit that no branch holds as long as it keeps the object: refs/pull/1/head's 34ed060 is on no branch, and both `/commit/34ed060` and the API answer it (HTTP 200), where an unknown hash answers 404. So links to old commits (a deployed footer, Actions run pages, these docs) keep working for as long as the pull request refs hold the old history, and break only once GitHub drops it.
- **Actions:** 282 workflow runs, each naming its old commit; those pages stay. 41 caches take 1,318 MiB. 28 are keyed `prettier-<lockfile hash>-<sha>` (some `tsc-…` from older workflows), but `restore-keys` falls back to the newest cache with the same lockfile prefix, and the other 13 are keyed by the lockfile or Corepack's version alone. So no cache breaks; the first run after the push just misses its exact key.

**Rewriting them.** [`rewrite-refs.mjs`](../scripts/history/rewrite-refs.mjs) reads filter-repo's commit-map and rewrites each token that resolves, in the old mirror, to a commit the map gives a new hash. It keeps the token's length unless that prefix is ambiguous in the new repository, and then lengthens it. It skips a token that also resolves in `--other` (the `fuzzley` repository) and any path given with `--exclude`. It is a dry run unless given `--write`. `09-rewrite-refs-dry-run.sh s2` ran it with `--write` on copies of `docs/` as the rewritten main has it and of the memory notes ([`rewrite-refs-s2.txt`](../data/history/rewrite-refs-s2.txt)):

- **1,369 replacements in 54 files:** the 1,091 + 211 in `docs/` and the 67 in the notes. 854 distinct tokens named a commit.
- **No ambiguity.** No token was ambiguous in the old mirror, none resolved in `fuzzley` too, and none needed lengthening in the new one. No old token resolves to some other object in the new repository either.
- **A second pass** over the rewritten copies found nothing to rewrite: no new short hash happens to name an old commit.

Short hashes can still collide where both histories live in one object store: an old clone that fetches the new history, or GitHub while the pull request refs keep the old one. At 8 characters, among twice the 1,742 commits, that is unlikely, but a 7-character reference typed later may be ambiguous there, and git will say so rather than guess.

In the real run, leave out what records the old history on purpose: `docs/repo-size/data/history/`, whose commit-map's old column would otherwise be rewritten too, and this file, whose examples would stop making sense. The rest of `docs/repo-size/` is rewritten like any doc; a dry run on this worktree at 18:48 UTC found 1,409 references in 15 of the other plans' files ([`rewrite-refs-s2.txt`](../data/history/rewrite-refs-s2.txt)). The command, from the rewritten checkout:

```sh
node docs/repo-size/scripts/history/rewrite-refs.mjs \
  --map "$WORK/s2.git/filter-repo/commit-map" \
  --old "$WORK/fuzzley-games.git" --new "$WORK/s2.git" \
  --other ~/Projects/personal/fuzzley \
  --exclude docs/repo-size/data/history \
  --exclude docs/repo-size/research/history-rewrite.md \
  docs                     # add --write once the dry run's counts look right
```

and the same with the memory notes' folder in place of `docs`, once they may be edited.

### 2. The GitHub side

From [`github.txt`](../data/history/github.txt) and [`github-after-push.tsv`](../data/history/github-after-push.tsv).

- **Pull request refs.** GitHub's ["Removing sensitive data from a repository"](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository), read today, says:
  - Push with `git push --force --mirror origin`, and expect the pushes to `refs/pull/*` to fail, as GitHub makes them read-only.
  - Then ask Support, giving the owner and repository, the number of pull requests affected and the "First Changed Commit(s)" filter-repo prints. Support dereferences or deletes the affected pull requests, runs a garbage collection, and removes cached views. Dereferencing keeps a pull request's body and comments but loses its diffs.
  - **"GitHub Support won't remove non-sensitive data."** A size-only rewrite is likely not something they'll do.
  - Forks keep their own copy; this repository has none.
  - Commit and tag signatures are dropped by filter-repo.
- **What GitHub would keep.** The rewritten S2 history with the 37 old `refs/pull/*` kept, repacked as the rest, is 290.2 MiB, against the baseline's 289.5, and S3's is 290.2 MiB too. The old refs reach 1,706 old commits that the new branches don't, as many as the rewrite changed ([`scenario-s2-verify.txt`](../data/history/scenario-s2-verify.txt)): all the old history is still there. So GitHub's `diskUsage` won't drop after the push, and may grow by the new commits and trees, until the pull requests are dereferenced. Clones shrink at once, as they fetch only branches.
- **When the figure updates.** Neither GitHub's docs nor anything I found say how soon `diskUsage` is recomputed after a force-push, or when GitHub's own gc drops unreachable objects. With the pull request refs in place there is nothing for it to drop. I couldn't measure it without pushing.
- **The other way to get the figure down** is a new repository in this one's place: delete it, create `fuzzley/fuzzley-games` again, and push the rewritten branches. It has little to carry over: 1 star, 0 watchers, no secrets or variables, no deploy keys, no webhooks, one collaborator, one ruleset, all 33 pull requests Dependabot's. It loses the pull request and Actions history and the caches, and every old commit link 404s at once. The repository has no webhooks, so the Cloud Build trigger presumably reaches it through Google's GitHub App, and a new repository has a new id. Whether the trigger would follow it couldn't be checked here, as the devbox has no `gcloud`.
- **Forks: 0.**
- **Branch protection.** There is no classic protection on either branch. One ruleset, `main-branch-needs-pull-request`, is active on the default branch: deletion, non-fast-forward, update, creation and pull_request. Its bypass list has the admin role and the owner's account, both `always`, and the API says the token's user can bypass it. So the owner's force-push to `main` goes through without turning the ruleset off, and GitHub records it as a bypass. `live` has no rules.

### 3. Cloud Build and CI

- **`promote` and `live`.** `promote` moves `live` only forward (`merge-base --is-ancestor`), and fails if `live` holds commits `main` doesn't. After a rewrite the old `live` is in no new history, so a push of `main` alone would make the next `promote` fail. `live` has to move to its rewritten commit in the same push: the ref-map gives it, and with `live` at `main` it is the new `main`.
- **The `changes` job** compares a push with `origin/live`. With both moved together, `live` is `HEAD`, nothing has changed, and the run checks everything. `promote` then finds `live` already at the commit and does nothing. The check passes, and it costs one full Verify run.
- **Cloud Build.** The trigger (`cloudrun-fuzzley-games-git-us-central1`) builds `live` on every push to it, so moving `live` rebuilds and deploys the same tree under the new hash. `version.json` and the footer then name the new commit. Older Cloud Run revisions keep their images. Whether their tags carry the commit, as Cloud Run's default trigger does, couldn't be checked here.
- **CI's checkouts** already fetch with `filter: blob:none`, so the rewrite saves CI little: it fetches commits and trees, and their number is the same.
- **Caches:** nothing to do, as above. `gh cache delete --all` would free the 1,318 MiB of quota, but isn't needed.

### 4. Local clones and worktrees

From [`local-clones.txt`](../data/history/local-clones.txt), read with `--no-optional-locks`, so nothing wrote another session's index:

- **One clone,** `/home/dev/Projects/personal/fuzzley-games`, with two worktrees:
  - `/home/dev/Projects/personal/fuzzley-games` on `main`, with one changed path and nothing staged.
  - `/home/dev/Projects/personal/fuzzley-games-repo-size` on `repo-size-plan`, this plan's.
- **No unpushed commits:** no local branch has a commit that no remote branch holds. `repo-size-plan` has none of its own yet; its work so far is uncommitted.
- **One stash entry,** shared by both worktrees ("local-pipeline steps 3 and 4"). It is a commit on the old history. It survives in the old clone, and can be saved as a patch (`git stash show -p`) before the clone goes.
- **All of it must be cloned again.** A clone that fetches after the rewrite gets the new history beside the old, and a `git pull` merges them back together; a later push would bring the old objects back to GitHub. Clone afresh and move work across:
  - An unpushed branch is rebased onto the new history with `git rebase --onto <new base> <old base> <branch>`, the new base from the commit-map. Every tree at a commit is the same as before, bar the stripped files, so the rebase applies cleanly.
  - Untracked files are copied across.
  - The skills' links are made again with `node .agents/link-claude-skills.mjs`, since `.claude/` is not in the clone.

### 5. Runbook for the real rewrite

A draft; nothing here was run against GitHub. Steps 2–5 are the dry run's scripts as they are, with `WORK` and `DATA` pointing at the day's folder, so this dry run's records stay as they are.

**Before the day**

1. Land the screenshot and atlas plans first, so S2's rule keeps exactly what they leave at the tip, and the history is rewritten once.
2. Resolve the open Dependabot pull requests (#30–#33 today) by taking their updates on `main` by hand, so Dependabot closes them and deletes their branches. `gh pr list --state open` should list none.
3. Ask every session to stop pushing until step 10 is done. `08-local-clones.sh` should show no commits outside the remote and nothing uncommitted that matters.
4. Rehearse: run steps 2–5 into a scratch folder the day before, and compare the figures with these.

**On the day**

1. **Check that nothing is moving.** `main` and `live` are the same commit, the last Verify run on it passed and none is running, and the site serves it:
   ```sh
   git ls-remote https://github.com/fuzzley/fuzzley-games.git refs/heads/main refs/heads/live
   gh run list -R fuzzley/fuzzley-games --branch main -L 3
   curl -s https://fuzzley.games/version.json | jq -r .commit
   ```
2. **Back up.** Clone a fresh mirror, bundle it, verify the bundle, and copy the bundle off the devbox (the Windows side, or a Cloud Storage bucket):
   ```sh
   export WORK=~/Projects/personal/repo-rewrite-<date> DATA=~/Projects/personal/repo-rewrite-<date>/data
   cd ~/Projects/personal/fuzzley-games-repo-size/docs/repo-size/scripts/history
   ./01-mirror.sh fresh       # $WORK/fuzzley-games.git, push URL DISABLED
   git -C "$WORK/fuzzley-games.git" bundle create "$WORK/fuzzley-games-pre-rewrite.bundle" --all
   git bundle verify "$WORK/fuzzley-games-pre-rewrite.bundle"
   git -C "$WORK/fuzzley-games.git" for-each-ref > "$WORK/refs-before.txt"
   ```
   `11-backup-rehearsal.sh` did this today ([`backup-rehearsal.txt`](../data/history/backup-rehearsal.txt)): a 299 MiB bundle of 44 refs, `HEAD` included, made in 1.4 s. It verified, a mirror cloned from it had every ref identical to the original's and passed `git fsck`, and rolling a rewritten copy back from it put `main` and `live` at 305edc24 again.
3. **Rewrite a copy.** `./02-inventory.sh`, then `./03-scenario.sh s2`. The rewritten mirror is `$WORK/s2.git`, with filter-repo's maps in `$WORK/s2.git/filter-repo/`.
4. **Check it.** `$DATA/scenario-s2-verify.txt` must show 0 tree differences for `main` and `live`, 1,705 commits or the day's count, and 0 message references wrong, and `scenario-s2-fsck.txt` must end in `exit: ok`.
5. **Dry-run the docs' hashes:** `./09-rewrite-refs-dry-run.sh s2`. `$DATA/rewrite-refs-s2.txt` must show nothing ambiguous, nothing lengthened, and no replacements in the second pass.
6. **Push `main` and `live` together**, each leased to the commit it had in step 1, so the push fails if anything moved:
   ```sh
   old_main=$(git -C "$WORK/fuzzley-games.git" rev-parse refs/heads/main)
   old_live=$(git -C "$WORK/fuzzley-games.git" rev-parse refs/heads/live)
   git -C "$WORK/s2.git" push --atomic \
     --force-with-lease=refs/heads/main:"$old_main" \
     --force-with-lease=refs/heads/live:"$old_live" \
     https://github.com/fuzzley/fuzzley-games.git \
     refs/heads/main:refs/heads/main refs/heads/live:refs/heads/live
   ```
   - Not `--mirror`, as GitHub's page has it: that would also try every `refs/pull/*`, which GitHub refuses, and delete any branch the mirror lacks.
   - Naming the URL bypasses the remote's `DISABLED` push URL; that is the one deliberate push.
   - Delete any Dependabot branch that is still there: `git push https://github.com/fuzzley/fuzzley-games.git --delete <branch>`, which closes its pull request.
7. **Watch it land.**
   - `git ls-remote` gives the ref-map's new commits.
   - Cloud Build builds `live`, and `curl -s https://fuzzley.games/version.json | jq -r .commit` gives the new short hash.
   - The footer's link opens that commit on GitHub.
   - Verify runs every check on `main` and passes, and `promote` reports `live` already there.
8. **Rewrite the references.** In a fresh clone, run `rewrite-refs.mjs` on `docs` as above with `--write`, run Prettier on what changed, and commit it as an ordinary docs change (Verify only lints it, and `promote` moves `live` on). Then the memory notes, with the same script on their folder, once the owner agrees.
9. **GitHub:** ask Support whether they will dereference the pull requests and run a gc, with the first changed commits from `scenario-s2-filter-repo.txt`. If they won't, GitHub's figure stays where it is; clones are smaller anyway. Recreating the repository is the alternative, above.
10. **Clone every local copy again** (section 4). Keep the old clone, renamed, until nothing in it is wanted.
11. **Keep the backup** (the bundle and `$WORK/fuzzley-games.git`) for a few months at least; delete it only once nothing names the old commits.

**Rollback**

- **Before anything new lands on the rewritten `main`:** push the old commits back, leased to the new ones, from the backup mirror:
  ```sh
  git -C "$WORK/fuzzley-games.git" push --atomic \
    --force-with-lease=refs/heads/main:"$(git -C "$WORK/s2.git" rev-parse refs/heads/main)" \
    --force-with-lease=refs/heads/live:"$(git -C "$WORK/s2.git" rev-parse refs/heads/live)" \
    https://github.com/fuzzley/fuzzley-games.git \
    refs/heads/main:refs/heads/main refs/heads/live:refs/heads/live
  ```
  Cloud Build deploys the old `live` again. Clone again anything cloned in between. If the backup mirror is gone, `git clone --mirror fuzzley-games-pre-rewrite.bundle restored.git` gives it back, every ref included; `11-backup-rehearsal.sh` checked exactly that, and rolled a rewritten copy's `main` and `live` back to the old commits from the bundle (by fetch, standing in for the push).
- **After new commits land:** rebase them onto the old `main` (`git rebase --onto <old main> <rewritten main as pushed> main`, clean as the trees match), and run `rewrite-refs.mjs` with the commit-map's columns swapped to put the old hashes back in what step 8 rewrote. Then push as above.

## What couldn't be verified

- **How GitHub's `diskUsage` changes after a force-push,** and whether Support would dereference pull requests for a size-only rewrite. GitHub's docs say Support helps with sensitive data only, and testing it needs a push.
- **The Cloud Build trigger's settings:** whether a force-push to `live` starts it (it should, as a push to the branch), how it tags images, and whether a recreated repository keeps it. There is no `gcloud` on the devbox.
- **Dependabot alerts:** turned off for the repository, so there were none to read.
- **The `refs/pull/*` push refusal** is GitHub's documented behaviour; it wasn't tried.
- **The real run's figures:** the dry runs used 305edc24's history; the day's history is a little longer and its commit-map differs, though the same history and list give the same map.
