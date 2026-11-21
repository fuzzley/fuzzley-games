# Screenshots: what they cost history, and how to stop them piling up

Research for the repo-size plan, done on 2026-11-21 in the `repo-size-plan` worktree at 305edc24, on the 24-core devbox (sharp 0.35.5, libvips 8.18.7, libwebp 1.6.0). No product code changed and nothing was committed. Every figure here is printed by a script in [`../scripts/screenshots/`](../scripts/screenshots/) into [`../data/screenshots/`](../data/screenshots/), and each section names the file. The captures and re-encodes went to a scratch folder outside the repository, never over a tracked file.

## Summary

- **Screenshots are 200.97 MiB of history: 1,167 blobs, and the Solitaire Collection's are 199.52 MiB of it.** Every other game's are 0.38 MiB or less. PNG is 147.98 MiB of the total, though the site has served only WebP since 2026-10-10 ([`history-origin-summary.txt`](../data/screenshots/history-origin-summary.txt), [`churn.txt`](../data/screenshots/churn.txt)).
- **Eight retakes of all 41 Solitaire games added 169.87 MiB, 85% of the total.** Each was on purpose, and each changed every image visibly: none of the 896 version-to-version comparisons in history was pixel-identical or too small to see ([`pixel-history-summary.txt`](../data/screenshots/pixel-history-summary.txt)).
- **A full Solitaire retake today adds 31.06 MiB, and 65% of that is lossless PNG that nothing ships.** The 41 `overview.png` originals in `frontend/games/solitaire/docs/screenshots/` are 20.07 MiB at HEAD. The brief says this folder no longer exists, but it does. `.dockerignore` leaves it out, and only the capture and `build:thumbs` read it ([`head.txt`](../data/screenshots/head.txt), [`dist-check.txt`](../data/screenshots/dist-check.txt), [`estimates.txt`](../data/screenshots/estimates.txt)).
- **Captures are deterministic on one machine, but not across machines or over time.** Three Minesweeper captures were byte-identical, and so were two runs of three Solitaire games. But a fresh capture of all 41 Solitaire games differed from HEAD in every original, in 0.002–0.003% of the pixels, by at most 9 levels, all in the game bar. WebP spreads that into differences of up to 40 levels in the encoded preview. So a full retake today would rewrite 30.27 MiB of files with no visible change ([`capture-solitaire-all.txt`](../data/screenshots/capture-solitaire-all.txt), [`reencode.txt`](../data/screenshots/reencode.txt)).
- **Recommended: (a) and (b), and no new storage.** Make Solitaire's capture write the site's WebP images directly, and stop tracking the PNG originals. Show `preview.webp` on the rules pages instead of a third image, `overview.webp`. Add a pixel-diff gate to the shared image writer that keeps a committed image unless some pixel moved more than 48 levels in a channel. A full retake then adds 6.62 MiB, not 31.06, and a retake with no visible change adds nothing. The Docker build, Cloud Build and CI stay as they are. Git LFS fits GitHub's free quota, which is now 10 GiB, but it needs a step in Cloud Build's trigger, and a missed fetch would ship pointer files without failing the build. A separate store, or making the images in CI, costs more work and risk than the few MiB left after (a) and (b) are worth.

## 1. The pipeline

### What each capture writes

Every game's `yarn capture:screenshots` runs its `tools/capture-screenshots.mjs`. It needs a server already running (the game's dev server by default), and runs a headless Chrome through `runScreenshotScript()` in `frontend/lib/dev/src/screenshots.ts`. The page is 1280 × 720 CSS px at a device scale of 2, so the capture is 2560 × 1440.

| Game                                                                        | Writes                                                                        | Format and size                                                               | At HEAD                                                   |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------- |
| Minesweeper, Sudoku, Snake, Brick Breaker, Asteroid Breaker, Brick Fuzz Pop | `public/docs/screenshots/<game>/thumb.webp` and `preview.webp`                | WebP q80, 576 × 324 and 2560 × 1440                                           | 2 files each: thumbnails 4–19 KiB, previews 27–116 KiB    |
| Solitaire Collection, `capture:screenshots`                                 | `docs/screenshots/<id>/overview.png`, one for each of 41 games                | lossless PNG, compression level 9, 2880 × 1620 (a 1440 × 810 page at scale 2) | 41 files, 20.07 MiB, 501 KiB each on average              |
| Solitaire Collection, `build:thumbs`                                        | `public/docs/screenshots/<id>/thumb.webp`, `preview.webp` and `overview.webp` | 576 × 324 (the board alone) and 2560 × 1440 at q80, 1600 × 900 at q90         | 123 files, 11.00 MiB: 20, 145 and 109 KiB each on average |

From [`head.txt`](../data/screenshots/head.txt): 176 files and 31.54 MiB in all.

The six other games call `keepShot()`, which writes both WebP files through `writeSiteImages()` straight from the capture in memory, so they keep no lossless file. Only the Solitaire Collection keeps one. Its capture tool says why: "These lossless originals stay out of `public/`: `yarn build:thumbs` makes the WebP images the site serves from them."

**`build:thumbs` is run by hand.** Every game's `build` script is `vite build`, and nothing else runs `build:thumbs`. The capture ends by printing "Run yarn build:thumbs to make the images the site serves."

### What reads them

| Reader                                                                                                             | Reads                                                                                             | Fails without them?                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| The site's catalog (`screenshotUrl()`, `thumbnailUrl()` and `imagesOf()` in `frontend/site/src/app/model/game.ts`) | `/play/<build>/docs/screenshots/<id>/thumb.webp` and `preview.webp`, for the tiles and game pages | Yes: `checkGameImages()` in `frontend/site/tools/vite-plugins.ts` fails the site's build if a finished game's are missing            |
| Each game's `index.html`                                                                                           | `og:image`: the absolute URL of its `preview.webp` (2560 × 1440, `image/webp`)                    | No, but link previews break                                                                                                          |
| The Solitaire Collection's game browser (`game_browser_item.ts`)                                                   | `./docs/screenshots/<id>/thumb.webp` and `preview.webp`                                           | No                                                                                                                                   |
| The Solitaire Collection's rules pages (`game_documentation_data.ts`)                                              | `./docs/screenshots/<id>/overview.webp`, 41 of them                                               | Yes, in tests: `test/ui/app/provider/game_documentation.spec.ts` globs `public/docs/screenshots/*/*.webp` and fails on a missing one |
| `capture-screenshots.mjs` and `build-screenshot-thumbs.mjs`                                                        | Solitaire's `docs/screenshots/<id>/overview.png`; the capture lists the games by these folders    | —                                                                                                                                    |
| The layout checks, `check-image.sh`, the READMEs and nginx                                                         | Nothing. The layout checks' `loadScreenshotApi()` is the games' in-page test API, not these files | —                                                                                                                                    |

Other specs only name the URLs as strings.

**`public/` is copied into `dist/` and served.** Vite copies each game's `public/` into its `dist/`, `copy-games.mjs` copies each `dist/` into the site's `public/play/<build>/`, and the image serves the site's `dist/`. After a build, Minesweeper's 2 and the Solitaire Collection's 123 screenshots were all in `dist/`, byte-identical, and no `overview.png` was ([`dist-check.txt`](../data/screenshots/dist-check.txt)). `.dockerignore` leaves out `frontend/games/solitaire/docs` (line 11), along with `.git` and `*.md`. So the Docker build needs only the WebP files under each game's `public/`, and it gets them from the checkout.

Three CI jobs need those files: docker builds the image, build builds the site and runs its image check, and the test job that runs the Solitaire Collection's specs globs `public/`.

## 2. Churn

### Totals

From [`history-origin-summary.txt`](../data/screenshots/history-origin-summary.txt), which reads `--remotes=origin`, what a normal clone holds. Each blob counts once, at the commit that first added it at a screenshot's path, with its size on disk. [`history-mirror-all-summary.txt`](../data/screenshots/history-mirror-all-summary.txt) reads the history research's mirror with `--all`, its 33 `refs/pull/*` included, and gives the same figures: no pull request holds a screenshot that main doesn't.

| Game and folder                |     Blobs | MiB on disk | Commits |
| ------------------------------ | --------: | ----------: | ------: |
| Solitaire, `public/`           |       957 |      126.59 |      41 |
| Solitaire, originals (`docs/`) |       164 |       72.94 |       4 |
| Minesweeper                    |        12 |        0.38 |       6 |
| Brick Fuzz Pop                 |         6 |        0.35 |       3 |
| Sudoku                         |         7 |        0.24 |       4 |
| Brick Breaker                  |         8 |        0.22 |       4 |
| Asteroid Breaker               |         6 |        0.14 |       3 |
| Snake                          |         7 |        0.10 |       4 |
| **All**                        | **1,167** |  **200.97** |         |

The brief's split, 107.5 MiB in `public/` and 92.1 MiB in `docs/screenshots/`, goes by the path `git rev-list --objects` names for each blob, which is where the newest commit keeps it. The summary prints that view too: 916 blobs and 107.47 MiB, against 205 and 92.06. The two views differ by 41 PNG blobs. On 2026-10-10, e704711d ("perf: serve the rules screenshots as 1600 px WebP") deleted 41 files from Solitaire's `public/`, as the summary's list of deletions shows: it moved the 41 `overview.png` into the new `docs/screenshots/`, the same blobs. They were first added under `public/`, and rev-list names them by where they ended up. The total is the same either way.

By format, PNG is 306 blobs and 147.98 MiB, and WebP 861 blobs and 52.98 MiB. By file, Solitaire's `overview.png` is 73.91 MiB from when `public/` served it (141 blobs) and 72.94 MiB as the originals since (164). Its `preview.webp` is 27.33 MiB (305 blobs), `overview.webp` 21.11 MiB (205) and `thumb.webp` 3.10 MiB (305).

### Commits, and blobs a commit

From [`churn.txt`](../data/screenshots/churn.txt):

| Game             | Commits | Blobs | Blobs a commit, median | Most in one commit | MiB on disk |
| ---------------- | ------: | ----: | ---------------------: | -----------------: | ----------: |
| Solitaire        |      41 | 1,121 |                      3 |                164 |      199.52 |
| Minesweeper      |       6 |    12 |                      2 |                  2 |        0.38 |
| Brick Fuzz Pop   |       3 |     6 |                      2 |                  2 |        0.35 |
| Sudoku           |       4 |     7 |                      2 |                  2 |        0.24 |
| Brick Breaker    |       4 |     8 |                      2 |                  2 |        0.22 |
| Asteroid Breaker |       3 |     6 |                      2 |                  2 |        0.14 |
| Snake            |       4 |     7 |                      2 |                  2 |        0.10 |

58 commits added screenshots. The other six games add two small WebP files at a time, which isn't worth acting on alone.

History gained 12.26 MiB of screenshots in August, 12.18 in September, 145.32 in October and 31.20 in November so far ([`estimates.txt`](../data/screenshots/estimates.txt); by game in [`history-origin-monthly.tsv`](../data/screenshots/history-origin-monthly.tsv)). The eight full Solitaire retakes:

| Date       | Commit   | Why                                         | Blobs | MiB on disk |
| ---------- | -------- | ------------------------------------------- | ----: | ----------: |
| 2026-09-27 | 3abe7ba2 | look: without the rail                      |    51 |       11.11 |
| 2026-10-05 | 503567ba | setup: default settings, header kept        |   123 |       21.36 |
| 2026-10-10 | 811e476d | look: the light under the cards             |   123 |       21.66 |
| 2026-10-10 | e704711d | format: the rules images as WebP            |    41 |        4.21 |
| 2026-10-24 | 5bbda669 | look: the game bar                          |   164 |       23.84 |
| 2026-10-25 | 67a5dbb3 | format: served at twice their size          |   164 |       28.60 |
| 2026-10-25 | a822e6cc | look: the new wordmark                      |   164 |       28.69 |
| 2026-11-09 | a5420072 | setup: Casino night and a seeded deal       |   164 |       30.40 |
|            |          | **All eight: 85% of every screenshot byte** |       |  **169.87** |

Since 5bbda669, each full retake is 41 PNG originals and 123 WebP images: 164 blobs.

### PNG to WebP

From the summary's first and last commit to add each format:

- **The site's thumbnails and previews went to WebP on 2026-09-27**, in 9c191a04 ("build(browser): shrink the screenshots into the browser's thumbnails"). The last PNG added under Solitaire's `public/` was in 811e476d, on 2026-10-10.
- **The rules pages' image went to WebP on 2026-10-10**, in e704711d, which moved the 41 PNG originals to `docs/screenshots/`.
- **The PNG originals never stopped.** Each full retake since added 41 more, the last in a5420072 on 2026-11-09: 164 blobs and 72.94 MiB in all.
- Every other game has used WebP since its first screenshot.

### Why they are retaken

[`churn.txt`](../data/screenshots/churn.txt) sorts the 58 commits by reason. I set each reason by hand from the commit's subject; the table is in `churn.mjs`, and the data lists each commit with its subject beside its reason.

| Reason                                             | Commits | Blobs | MiB on disk | Share |
| -------------------------------------------------- | ------: | ----: | ----------: | ----: |
| A game's first screenshots                         |      37 |   102 |       27.55 |   14% |
| The game's look changed                            |      10 |   519 |       87.22 |   43% |
| The capture's scene, palette, seed or tool changed |       7 |   305 |       52.24 |   26% |
| The format or size changed                         |       4 |   241 |       33.95 |   17% |

When one game's look changes, only that game's images are retaken (Montana's redeal pips, a7deaf18: 3 blobs). But a change to something every game shows retakes the whole catalog: the game bar (5bbda669), the wordmark (a822e6cc), the choice menu's badge (a9af4b96). So does a change to how captures are set up (palette, seed, default settings), or to their format. Solitaire's catalog is 41 games of 4 files each.

**Every retake in history changed what it retook.** `pixel-history.mjs` compared each screenshot with its version before, decoded. 896 comparisons were between images of the same size, and all 896 changed visibly; 94 more changed size. None was pixel-identical, and none moved fewer than 0.01% of its pixels by more than 16 levels ([`pixel-history-summary.txt`](../data/screenshots/pixel-history-summary.txt)). So a pixel-diff gate would have saved nothing so far. Its use is the future: retakes that change nothing, which are the norm now (next section), and whole-catalog retakes after a change to only some games.

### Plan docs

From the summary's last part and [`history-origin-docs.tsv`](../data/screenshots/history-origin-docs.tsv): images under `docs/`, and under Solitaire's own `docs/` outside its screenshots, are 90 blobs and 14.41 MiB. Captures of a game kept beside a plan are only 21 blobs and 1.63 MiB: Brick Fuzz Pop's tune-up shots (PNG, 0.70 MiB), Asteroid Breaker's mock previews (0.81 MiB) and two Snake QA pictures (3 blobs, 0.12 MiB). The rest is art contact sheets (4.08 MiB), generated art (3.76), sound sheets (3.52), plan mocks (1.21) and a card-sharpness study (0.22), which are the atlas research's to weigh. The Brick Breaker and Asteroid Breaker plans' `before.webp` are each the same blob as an earlier `preview.webp`, so they cost nothing.

## 3. Determinism and cost

`capture-twice.mjs` builds a game (or starts its dev server), serves it on a port of its own, and runs a copy of its capture tool that differs only in the folder it writes to, a scratch folder. It compares the runs with each other and with HEAD, by bytes and by decoded pixels. No headless Chrome outlived a run.

**Minesweeper**, served by `vite preview` ([`capture-minesweeper.txt`](../data/screenshots/capture-minesweeper.txt)):

- `yarn build` took 5.3 s, and each of three captures 2.1 s.
- The three runs were byte-identical.
- `preview.webp` was byte-identical to HEAD's.
- `thumb.webp` was not: 14,418 bytes against HEAD's 14,428. 19.6% of its pixels differ, but only 21 by more than 16 levels and none by more than 22, spread across the board. The preview comes from the same capture with no resize, and it matched to the byte. So the capture was the same, and the downscale to 576 × 324 came out differently here. The lockfile has pinned sharp 0.35.5 since 2026-10-18 ([`sharp-versions.txt`](../data/screenshots/sharp-versions.txt)), before HEAD's thumbnail was taken. Likely the machine that took it differs (libvips picks its SIMD code by CPU), but I couldn't verify that.

**The Solitaire Collection**, from its Vite dev server, since its page exposes the game its capture waits for (`window.fsolitaire`) only in development; a production build captures nothing ([`capture-solitaire.txt`](../data/screenshots/capture-solitaire.txt), [`capture-solitaire-all.txt`](../data/screenshots/capture-solitaire-all.txt), [`estimates.txt`](../data/screenshots/estimates.txt)):

- Three games (Klondike, Spider, FreeCell) twice: 21.3 s, then 17.4 s, which is 5.8 s a game. The two runs were byte-identical, and so were the same three games in the later run of all 41.
- All 41 in one run took 271.2 s, 4.5 minutes, the dev server's first compile included. The re-encode below was running at the same time, so this is slower than an idle machine's.
- **None of the 41 matched HEAD's original, byte or pixel.** Each differs in 0.002–0.003% of its pixels, by at most 9 levels, all within rows 18–125 of 1,620: the game bar. A change that small can't be seen.
- `build:thumbs` is deterministic. Remade from HEAD's originals through `@fz/dev/screenshots`' own `writeImage()`, all 123 images came out byte-identical to HEAD's, in 54.9 s ([`reencode.txt`](../data/screenshots/reencode.txt), step 1).
- **From the fresh originals, all 41 board-only thumbnails came out byte-identical to HEAD's, but none of the previews or overviews did** (step 2). The game bar's 72–121 changed pixels became 11,366–382,296 changed pixels in the previews, by up to 40 levels, and up to 23 in the overviews. WebP's choices for whole blocks moved.

So `capture:screenshots` then `build:thumbs`, run today, would rewrite all 41 originals, 41 previews and 41 overviews, 30.27 MiB, for no visible change. Bytes always differ, so a gate has to compare decoded pixels against a tolerance, and the encoder's noise sets the tolerance.

**Which tolerance.** [`gate-check.txt`](../data/screenshots/gate-check.txt) takes the 166 unchanged retakes above (Minesweeper's 2 images, and Solitaire's 41 originals with the 123 WebP images made from them) and history's 896 real changes, and counts which each rule gets wrong:

| Rule: changed if                       | Unchanged retakes it calls changed (of 166) | History's changes it would keep (of 896) |
| -------------------------------------- | ------------------------------------------: | ---------------------------------------: |
| a pixel moved more than 16 levels      |                                          50 |                                        0 |
| a pixel moved more than 32 levels      |                                           6 |                                        0 |
| **a pixel moved more than 48 levels**  |                                       **0** |                                    **1** |
| an 8 × 8 block's mean change is over 6 |                                          26 |                                        0 |
| an 8 × 8 block's mean change is over 8 |                                           4 |                                        0 |

Averaging over 8 × 8 blocks doesn't help, since the encoder's noise gathers around the game bar's text. The rule at 48 levels misses one change in history: Snake's thumbnail in 7206317a, retaken when "@fz/dev/screenshots now takes them", which moved 21 pixels by more than 32 and none by more than 48 (at most 44). That retake may itself have changed nothing visible. The margin is thin either way: unchanged retakes moved a pixel by up to 40 levels, and the smallest real change in history by up to 44. So a gate at 48 levels should say which images it kept, and take `--force`.

## 4. Options

All of these are about what new retakes add. The 200.97 MiB already in history leaves only through a history rewrite, which [`history-rewrite.md`](history-rewrite.md) covers. Its recommended rule, S2, strips every old screenshot version but those at the tips. So the less the tip holds, the smaller the repository after the rewrite.

### (a) Smaller encodes, and only the images that are used

Measured in section 5. From [`estimates.txt`](../data/screenshots/estimates.txt): of a full Solitaire retake's 31.06 MiB, the PNG originals are 65%, `overview.webp` 14%, and the thumbnails and previews 21%.

1. **Stop tracking the PNG originals: a retake adds 11.00 MiB.** Solitaire's capture would write `thumb.webp`, `preview.webp` (and `overview.webp`, while it stays) straight from the capture in memory, as the other six games' already do, with `build:thumbs`' crop to the board moved into it. The machine that took them can keep the originals in a git-ignored folder, to re-encode them at another size later. Kept as lossless WebP, they would be 72% of the PNG's size.
   - _Work:_ small. The capture tool; `build-screenshot-thumbs.mjs` removed, or reading the git-ignored folder; the capture's list of games, which reads the originals' folders today and would read the catalog; Solitaire's `AGENTS.md` and its `add-solitaire-game` skill.
   - _Risk:_ low. Nothing deployed reads them (`.dockerignore`), and no spec does. Encoding at a new size then needs a retake: 4.5 minutes.
2. **Drop `overview.webp`, and show `preview.webp` on the rules pages: a retake adds 6.62 MiB.** The rules image is the whole page again, at 1600 × 900 and q90, beside the 2560 × 1440 preview of the same page at q80.
   - _Work:_ small: 41 URLs in `game_documentation_data.ts`, and the spec that checks them.
   - _Risk:_ a player opening a rules page downloads a 145 KiB preview rather than a 109 KiB overview, on average. The browser has it cached if the game browser showed it.
3. **Lower quality, or smaller previews.** Against today's 2560 × 1440 at q80, q70 is 16% smaller and q50 28%. A 1920 × 1080 preview at q80 is 30% smaller, but the game page shows the preview at up to 1,200 CSS px, which is 2,400 device pixels on a 2× display. Effort 6 saves only 2% at the same quality. For the thumbnails, q70 is 15% smaller than q80.
   - _Risk:_ the gallery is the site's shop window, so judge by the samples, not the numbers.

### (b) Commit only on a visible change

A gate in `writeImage()` in `@fz/dev/screenshots`, which every game's images go through, and in Solitaire's capture if it keeps originals. It decodes the committed file, if there is one of the same size, and keeps it unless some pixel moved more than 48 levels in a channel (section 3).

- _Work:_ small: one function and its spec, a `--force` flag, and a line for each kept image in the capture's report.
- _Risk:_ the margin is thin, 40 levels against 44 as measured, so a real but tiny change, such as one digit in the game bar, could be kept out. The report says what it kept, and `--force` overrides.
- _Saves:_ the 30.27 MiB a full retake today would add for nothing, and every image a whole-catalog retake leaves unchanged. Nothing in the past, since every past retake changed every image.

### (c) Git LFS

GitHub Free now includes **10 GiB of LFS storage and 10 GiB of bandwidth a month**, not 1 GiB. Past the bandwidth, LFS is off until the next month, unless a payment method is set ([`sources.txt`](../data/screenshots/sources.txt), GitHub's billing page, read today). Storage is no constraint: at October's rate, the highest so far, 10 GiB lasts 70 months.

Bandwidth is tighter. In the 30 days to 2026-11-21, 406 jobs checked out the files the site's build needs: 147 docker, 117 verify (from before the jobs were split), 30 build, 30 Solitaire test jobs, and 82 promotions, each a Cloud Build at most ([`ci-runs.txt`](../data/screenshots/ci-runs.txt), [`estimates.txt`](../data/screenshots/estimates.txt)). If each fetched the 11.48 MiB served at HEAD, that is 4.55 GiB a month, 46% of the quota, before anyone clones. With the originals in LFS too, it is 12.51 GiB, 125%. Caching `.git/lfs` in Actions would cut it, at some work.

- **Cloud Build.** Its docs say a trigger "performs a shallow clone of the repository", and don't mention LFS ([`sources.txt`](../data/screenshots/sources.txt)). I couldn't verify whether it fetches LFS objects, so assume it doesn't. The Docker build can't fetch them either, since `.dockerignore` leaves `.git` out. So the trigger needs a step with `git-lfs` and a credential before `docker build`. Cloud Run's continuous deployment created that trigger, and its build configuration lives in Google Cloud, not in the repository.
- **Actions.** `actions/checkout` has `lfs: false` by default, so the docker, build and test jobs each need `lfs: true`.
- **A missed fetch fails silently.** `checkGameImages()` checks with `existsSync()`, and the Solitaire spec only globs the names, so pointer files pass both. The site would then serve a pointer, a few lines of text, as each WebP image. It would need a check of each file's first bytes too.
- **Everyone** needs `git-lfs` installed, the Windows machine included, and moving the past into LFS takes a rewrite (`git lfs migrate import --everything`).
- _Saves:_ all new screenshot bytes in git, which become pointers. _Work:_ medium, part of it outside the repository. _Risk:_ medium to high: a broken deploy that passes every check, and a monthly quota shared by every clone and CI run.

### (d) A separate store the Docker build fetches

The images go to a GitHub release, a branch or repository of their own, or a public GCS bucket, named by their content hash. A small manifest in the repository lists each file's URL and SHA-256, and a script (`yarn fetch:screenshots`) downloads them into each game's `public/` and checks them. The Dockerfile runs it before `yarn build`, and so do the three CI jobs and, locally, `yarn start` and `yarn verify`.

- _Saves:_ nearly everything. A retake adds a few kilobytes of manifest.
- _Work:_ medium: an upload script that only a machine with the credential can run, the fetch script, a step in the Dockerfile, three CI jobs and the local commands, and the gate from (b) for uploads. Cloud Build's trigger needs no change, since the fetch runs inside the Docker build. The repository is public, so a release's files download without a credential.
- _Risk:_ every build, deploy and fresh clone depends on a second service. A screenshot change no longer shows in a pull request's diff. The gallery can drift from the code it shows unless the manifest changes in the same commit. And once (a) and (b) are done, a full retake adds 6.62 MiB at most, so (d) buys little more.

### (e) Make them in CI, or in the Docker build

- **In the Docker build:** the Node Alpine build stage would need Chrome and its fonts, and would capture every game after `yarn build`. Cloud Build has no GPU, so the five Phaser games would render through software WebGL, and their capture scripts wait on game time, which software WebGL makes slow. Solitaire's capture alone took 4.5 minutes here, on 24 cores and a GPU. A failed capture would fail the deploy, and the images would change unreviewed with every Chrome update.
- **In CI:** the same rendering and time, and then the images have to go somewhere. Committing them from CI is history again, so this is (d) with a renderer that differs from the machine people review on.
- _Saves:_ everything. _Work:_ large. _Risk:_ high.

### Recommendation

**Do (a)1, (a)2 and (b). Lower the quality (a)3 only if the samples look right to you. Don't do (c), (d) or (e) now.**

- **It is where the bytes are.** Of a full retake, 65% is PNG that nothing ships and 14% is a third copy of the page. Without them, a retake adds 6.62 MiB, not 31.06. Eight more full retakes, as many as history holds, would add 248.5 MiB at today's sizes and 53.0 MiB without them; the eight so far added 169.87 MiB, at the smaller sizes of their day ([`estimates.txt`](../data/screenshots/estimates.txt)).
- **The gate removes the retakes that change nothing,** which every Solitaire retake on this machine is today.
- **Nothing in the deploy path changes.** The Docker build, Cloud Build's trigger and CI keep taking the images from the checkout, and pull requests keep showing image diffs.
- **It sets up the history rewrite.** With the originals gone from the tip, the rewrite's S2 removes every PNG original and every old WebP, and the tip holds 6.62 MiB of Solitaire images and the other games' few small files.
- **(d) stays open.** If the gallery is still retaken often after this, (d) can take over, and nothing in (a) or (b) is wasted.

A plan that keeps a "before" picture should copy the committed `preview.webp`, as the Brick Breaker and Asteroid Breaker plans did, which costs nothing, and should save its own captures as WebP, not PNG.

## 5. Measuring (a)

`reencode.mjs` re-encodes the 41 Solitaire originals at HEAD, cut and fitted as `build:thumbs` does, at qualities 90 to 50 and efforts 4 (sharp's default) and 6, with smart subsampling, as today. It compares each with the same image made without loss: PSNR over RGB, and SSIM over luma in 8 × 8 blocks (a plain block SSIM, to compare settings by, not a standard score). From [`reencode-settings.tsv`](../data/screenshots/reencode-settings.tsv), totals for the 41 games at effort 4 unless marked:

| Image and size      | Quality        | KiB for 41 |  KiB each | PSNR dB | Mean SSIM | Lowest SSIM |
| ------------------- | -------------- | ---------: | --------: | ------: | --------: | ----------: |
| thumb 576 × 324     | 90             |      1,075 |      26.2 |   34.43 |    0.9968 |      0.9944 |
| thumb 576 × 324     | **80 (today)** |    **813** |  **19.8** |   33.70 |    0.9950 |      0.9879 |
| thumb 576 × 324     | 70             |        688 |      16.8 |   32.97 |    0.9922 |      0.9783 |
| thumb 576 × 324     | 60             |        639 |      15.6 |   32.58 |    0.9908 |      0.9734 |
| thumb 576 × 324     | 50             |        591 |      14.4 |   32.14 |    0.9894 |      0.9706 |
| thumb 576 × 324     | 80, effort 6   |        798 |      19.5 |   33.67 |    0.9940 |      0.9856 |
| preview 2560 × 1440 | 90             |      8,062 |     196.6 |   40.01 |    0.9982 |      0.9960 |
| preview 2560 × 1440 | **80 (today)** |  **5,962** | **145.4** |   38.94 |    0.9973 |      0.9931 |
| preview 2560 × 1440 | 70             |      5,024 |     122.5 |   38.00 |    0.9962 |      0.9890 |
| preview 2560 × 1440 | 60             |      4,668 |     113.9 |   37.43 |    0.9956 |      0.9822 |
| preview 2560 × 1440 | 50             |      4,321 |     105.4 |   36.87 |    0.9947 |      0.9810 |
| preview 2560 × 1440 | 80, effort 6   |      5,838 |     142.4 |   38.88 |    0.9973 |      0.9929 |
| preview 1920 × 1080 | 80             |      4,197 |     102.4 |   37.51 |    0.9966 |      0.9901 |
| preview 1600 × 900  | 80             |      3,344 |      81.6 |   36.66 |    0.9961 |      0.9893 |
| overview 1600 × 900 | **90 (today)** |  **4,486** | **109.4** |   37.50 |    0.9975 |      0.9944 |

Today's three rows match HEAD's files exactly: 813, 5,962 and 4,486 KiB ([`head.txt`](../data/screenshots/head.txt)). What one full retake of the 41 games would add, by plan ([`reencode.txt`](../data/screenshots/reencode.txt), step 3):

| Plan                                                                      |      MiB | Of today |
| ------------------------------------------------------------------------- | -------: | -------: |
| Today: PNG originals, thumb q80, preview 2560 q80, overview 1600 q90      |    31.06 |     100% |
| Today's WebP alone, no originals                                          |    11.00 |      35% |
| **No originals and no `overview.webp`: the rules pages show the preview** | **6.62** |  **21%** |
| No originals or overview; thumb and preview 2560 at q70, effort 6         |     5.45 |      18% |
| No originals or overview; thumb q80, preview 1920 q80, effort 6           |     4.81 |      15% |
| No originals or overview; thumb q70, preview 1600 q80, effort 6           |     3.87 |      12% |

As lossless WebP, the originals would be 14.47 MiB against the PNG's 20.07, 72% (step 4).

**Samples**, made by `samples.mjs` into `data/screenshots/samples/` from FreeCell's original. Each row shows the same 320 × 180 crop at 1:1: without loss, then at q80 (today), 70, 60 and 50. The sheets are lossless WebP, so what shows is each quality's own loss ([`samples.txt`](../data/screenshots/samples/samples.txt)):

- `freecell-preview-2560-qualities.webp`, 203 KiB: a face card with ranks, and the game bar's labels, from the 2560 × 1440 preview.
- `freecell-thumb-576-qualities.webp`, 199 KiB: the board's ranks and pips, from the 576 × 324 thumbnail.

At 1:1 I see no difference down to q70 in either. At q60 and q50 the edges of the red pips and the ranks soften slightly in the thumbnail, the image the gallery shows largest for its pixels. The two sheets were left out when this folder was committed to the repository, as they are 402 KiB between them; `samples.mjs` makes them again.

## What I couldn't verify

- **Whether Cloud Build's GitHub trigger fetches LFS objects.** Its docs say it makes a shallow clone, and say nothing of LFS. Settling it needs a test trigger.
- **Why HEAD's Minesweeper thumbnail and Solitaire originals differ from today's captures.** The sharp version and the capture code haven't changed since they were taken, so it is likely the machine or the Chrome version. Their commits don't say where they were taken.
- **The `fuzzley` account's GitHub plan.** The 10 GiB figures are for GitHub Free and Pro. The repository is public, and GitHub reports it as 304,769 KiB ([`sources.txt`](../data/screenshots/sources.txt)).
- **How q70 looks against q80 to a person on a real display.** The samples are for that.

## The scripts

Run from the worktree's root. `SCRATCH=<folder>` sets where captures and re-encodes go (a folder under `/tmp` by default).

| Script                                  | What it does                                                                                                                                               | Writes                                                                        |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `history.mjs [git-dir] [rev…]`          | Counts screenshot blobs by game, folder, format and file, each at the commit that first added it, and by rev-list's path; dates, deletions and docs images | `history-<label>-summary.txt`, `-commits.tsv`, `-monthly.tsv` and `-docs.tsv` |
| `churn.mjs`                             | Sorts the commits by reason, totals them by game, and lists the full Solitaire retakes                                                                     | `churn.txt`                                                                   |
| `pixel-history.mjs`                     | Compares each screenshot with its version before, decoded                                                                                                  | `pixel-history.tsv` and `pixel-history-summary.txt`                           |
| `head.mjs`                              | Lists the screenshots at HEAD by game, folder, file, size and bytes                                                                                        | `head.txt`                                                                    |
| `dist-check.sh`                         | Checks each built `dist/` against `public/`, and lists `.dockerignore`'s lines                                                                             | `dist-check.txt`                                                              |
| `sharp-versions.sh`                     | Lists the sharp and libvips versions `yarn.lock` pinned                                                                                                    | `sharp-versions.txt`                                                          |
| `capture-twice.mjs <game> [runs] [id…]` | Builds and serves a game, runs a copy of its capture into the scratch folder, and compares the runs with each other and with HEAD                          | `capture-<game>[-<label>].txt`                                                |
| `reencode.mjs [fresh-dir]`              | Remakes `build:thumbs`' images from HEAD's originals and from a fresh capture, then sweeps qualities, efforts and sizes                                    | `reencode.txt` and `reencode-settings.tsv`                                    |
| `gate-check.mjs`                        | Tries gate rules on unchanged retakes and on history's changes                                                                                             | `gate-check.txt`                                                              |
| `samples.mjs [id]`                      | Makes the side-by-side quality samples                                                                                                                     | `samples/*.webp` and `samples/samples.txt`                                    |
| `ci-runs.sh`                            | Counts 30 days of Verify runs, and the jobs that ran                                                                                                       | `ci-runs.txt`                                                                 |
| `sources.sh`                            | Fetches the GitHub and Google pages quoted, and prints their sentences and GitHub's size for the repository                                                | `sources.txt`                                                                 |
| `estimates.mjs`                         | Works out LFS bandwidth and storage, capture times, a retake's shares and the retakes at each plan's size, from the files above                            | `estimates.txt`                                                               |

In order: `history.mjs`, then again as `LABEL=mirror-all history.mjs <mirror> --all`; `churn.mjs`; `pixel-history.mjs`; `head.mjs`; `capture-twice.mjs minesweeper 3`; `SERVE=dev capture-twice.mjs solitaire 2 klondike spider freecell`; `SERVE=dev LABEL=all capture-twice.mjs solitaire 1` with all 41 ids; `dist-check.sh` after a build; `sharp-versions.sh`; `reencode.mjs <scratch>/capture-solitaire-all/run-1`; `gate-check.mjs`; `samples.mjs`; `ci-runs.sh`; `sources.sh`; `estimates.mjs`.
