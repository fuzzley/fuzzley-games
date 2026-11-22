# Repository size: the plan

Written 2026-11-21, before any change was made. It plans three of the five
strategies for making the repository smaller, in the order they should be
built:

- **Part A, strategy 2:** stop the screenshots piling up in history.
- **Part B, strategies 3 and 4:** build the card atlases at build time
  (assessed, and not recommended), and commit them as lossless WebP
  instead, which Phaser was checked to draw correctly.
- **Part C, strategy 1:** rewrite history once, with `git filter-repo`,
  after A and B have landed.

What this plan rests on is in three research files beside it. Each has its
own scripts in [`scripts/`](scripts/) and data in [`data/`](data/):

- [`research/screenshots.md`](research/screenshots.md): the pipeline, its
  churn, determinism, and the options for storage.
- [`research/atlases-and-webp.md`](research/atlases-and-webp.md): the
  generator, build-time generation, Phaser and WebP, and the encodings.
- [`research/history-rewrite.md`](research/history-rewrite.md): dry runs of
  eight rewrites on mirrors, what each rewrite breaks, and a runbook.

Every figure here comes from one of those files, or from
[`scripts/history/13-after-plans.sh`](scripts/history/13-after-plans.sh)'s
output in [`data/history/after-plans.txt`](data/history/after-plans.txt).
That script was written for this plan. It dry-runs Part C as it will run
once A and B have landed.

Paths are relative to the repository's root.

---

## 1. Summary

### What changes, and what it buys

| Point                       | Clone (MiB) | GitHub's figure               | Source                                                                            |
| --------------------------- | ----------: | ----------------------------- | --------------------------------------------------------------------------------- |
| Today                       |       290.1 | 304,769 KB                    | [`summary.tsv`](data/history/summary.tsv)                                         |
| After A and B, no rewrite   |   about 299 | grows by about the same 9 MiB | today plus B's 9.17 MiB of WebP pages ([`encodings-atlas.txt`][enc])              |
| After C, if done today (S2) |        88.8 | about 290, kept as it is (D1) | [`summary.tsv`](data/history/summary.tsv)                                         |
| **After A, B and C**        |    **59.1** | about 290, kept as it is (D1) | [`after-plans.txt`](data/history/after-plans.txt): 49.9 measured, plus 9.17 added |

[enc]: data/atlases/encodings-atlas.txt

What each future change adds to history:

| Change                                               | Today              | After the plan                            | Source                                                                                               |
| ---------------------------------------------------- | ------------------ | ----------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| A full retake of the Solitaire Collection's 41 games | 31.06 MiB          | 6.62 MiB                                  | [`estimates.txt`](data/screenshots/estimates.txt)                                                    |
| The same retake, nothing visible changed             | 30.27 MiB          | 0                                         | [`reencode.txt`](data/screenshots/reencode.txt), [`gate-check.txt`](data/screenshots/gate-check.txt) |
| A full rebuild of the card atlases                   | 16.55 MiB          | 9.17 MiB                                  | [`estimate-savings.txt`](data/atlases/estimate-savings.txt)                                          |
| Another game's retake                                | 2 small WebP files | the same, or 0 if nothing visible changed | [`churn.txt`](data/screenshots/churn.txt)                                                            |

### The order of work

1. **P0. Commit this plan's folder** to `main`, without its two sample
   images. This happens only once the user says so.
2. **Part A, the screenshots.**
   - **A1:** a gate in `@fz/dev/screenshots`, so a retake writes only the
     images where something visibly changed, with a `--force` flag to
     override it.
   - **A2:** the rules pages show `preview.webp`, and the 41 `overview.webp`
     files go.
   - **A3:** the Solitaire Collection's capture writes the site's WebP
     images directly, as every other game's does, and its 41 lossless PNG
     originals and `build:thumbs` go.
   - **A4:** a line in `.agents/AGENTS.md` about images kept with a plan.
3. **Part B, the atlases.**
   - **B1:** the Phaser test harness reads a WebP's size as well as a
     PNG's.
   - **B2:** the generator writes lossless WebP pages, and they are
     regenerated and committed once.
4. **Part C, the history rewrite,** in one session on a day the user names.
   It runs S2's rule on the day's history, pushes `main` and `live`
   together, rewrites the hashes the docs name, and then clones every local
   copy again.

A and B touch different files. A1 comes before A3, and B1 before B2. B2
also comes after A3, since one of its checks runs A's new capture. B1 can
go at any time. C needs A and B on `main` and live, as its rule keeps only
what is in the tree at the tip.

### Why this order

- **A and B add almost nothing to history, so they can go first.** A only
  deletes files and changes code. B adds the WebP pages once (9.17 MiB).
- **A and B decide what C keeps.** S2 strips every past version of a
  screenshot or atlas file, but keeps what is at the tips of `main` and
  `live`. So the less those tips hold, the smaller the result: 59.1 MiB
  after A and B, against 88.8 MiB if C ran today.
- **C runs once.** Rewriting before A and B would leave the PNG originals
  and PNG atlas pages at the tip. Those would then need a second rewrite,
  and a second round of cloning every copy again.
- **Strategy 3, building the atlases at build time, is not built.**
  Section 4 says why, and when to look at it again.

### Who decides what

Most choices are this plan's to make, and §3 makes them so the build need
not stop. Six were the user's (§2). The user settled five of them on
2026-11-21. D5, the day of Part C, is asked once A and B are live.

---

## 2. The user's decisions

Settled on 2026-11-21, but for D5.

**D1. GitHub's own figure: kept as it is.** GitHub keeps one read-only
`refs/pull/<n>/head` ref for each of the 33 pull requests ever opened (all
Dependabot's), and between them they hold the whole old history. So after
the rewrite, clones shrink at once, but GitHub's `diskUsage` stays at about
290 MiB, as the dry run measured ([`github-after-push.tsv`][gap]).

- The user chose to leave it there. The point of the work is what the
  repository adds from now on, and what a clone holds.
- Asking GitHub Support to dereference the pull requests, or recreating the
  repository, are not done. [`research/history-rewrite.md`][hr] §2 keeps
  what each would take, should that change.

[gap]: data/history/github-after-push.tsv

**D2. The screenshots' WebP quality: q80, as today.** At q70 a full retake
would add 16% less ([`research/screenshots.md`](research/screenshots.md)
§5), but the gallery is the site's shop window. `SITE_IMAGE_QUALITY` stays 80.

**D3. The backup: a local git repository on the devbox.** The backup is
for Part C only.

- The rewrite replaces every commit on GitHub, so a copy of the repository
  as it stood just before is the only way to undo it.
- It is a bare mirror, `~/Projects/personal/fuzzley-games-backup.git`,
  made when P0 lands, with its push URL disabled. C2 brings it up to date
  just before the rewrite, then cuts it off from GitHub, and writes a
  bundle of it beside it.
- Parts A and B need no backup. They are ordinary commits, which git's
  history keeps.

**D4. The memory notes: their hashes are rewritten, or removed.**
Claude's memory notes name 37 commits of this repository, 67 times.

- At C8, a hash a note doesn't need is removed. For example, a note's
  point may stand without the commit that made it.
- The rest are rewritten from the commit map with the same script as the
  docs ([`rewrite-refs-s2.txt`](data/history/rewrite-refs-s2.txt)).

**D5. The day of Part C: asked once A and B are live.**

- **What is asked:** a day and time when the rewrite can run, about an
  hour, most of it waiting on CI and Cloud Build.
- **What it needs from the user:** that nothing pushes to the repository
  from C1 to C10. That covers the user, every Claude session, and the
  Windows side.
- **Why:** every commit gets a new hash. Work based on the old commits,
  such as an unpushed branch, a worktree or a stash, must be pushed or
  saved before, and moved across after.
  - Today that is the `agent-efficiency-1-checks` branch, checked out in
    the main checkout, and one stash entry.
  - Anything pushed during the window is either refused (the push is
    leased) or lost.
  - An old clone used after it would bring the old history back.

**D6. This folder goes to `main`, and is pushed.** That is P0, without the
two sample sheets in `data/screenshots/samples/`. The research, scripts and
data are about 1 MiB of text. Part C runs from these scripts, so they
must be in a clone on the day.

---

## 3. Settled by this plan

These are the plan's calls, so the build goes on without stopping to ask.

**S1. The gate compares decoded pixels, with a tolerance of 48 levels in
any channel.**

- A capture's image is written unless the committed file exists, has the
  same size in pixels, and no pixel's channel, once both are decoded,
  differs by more than 48 of 255.
- Bytes can't be the test, because two captures of the same page differ by
  a few pixels in the game bar. WebP then spreads that into changes of up
  to 40 levels ([`gate-check.txt`](data/screenshots/gate-check.txt)).
- A tolerance of 48 kept all 166 unchanged retakes, and missed one of
  history's 896 real changes. That one, Snake's thumbnail in 7206317a,
  moved at most 44 levels, and may itself have shown no visible change.
- The margin is thin, so each kept image is reported with its largest
  change, and `--force` writes every image.

**S2. The Solitaire Collection keeps no originals,** not even in an ignored
folder.

- Encoding the images at a new size or quality takes a retake: 4.5 minutes
  for all 41 games.
- Keeping a local folder of originals would add a second path to maintain,
  and the gain is only skipping that retake.

**S3. The capture finds its games by the folders under
`public/docs/screenshots/`.**

- Today it lists the folders of the originals. Once A3 deletes those, the
  site images' folders are what is left.
- A new game is named on the command line, as it is today
  (`yarn capture:screenshots <id>`).

**S4. The rules pages show `preview.webp`.**

- The preview is the same whole page, at 2560 × 1440 and q80, which the game
  browser already shows.
- A rules page downloads 145 KiB rather than 109 KiB on average, often
  already in the cache.
- The `<img>` keeps its `width="800" height="500"` attributes, so its layout
  doesn't change.

**S5. The thumbnail keeps its crop to the board.** The `findBoard()` and
`isFelt()` logic and the `contain` fit move from `build-screenshot-thumbs.mjs`
into `capture-screenshots.mjs` unchanged. From the same pixels they give
byte-identical images: `build:thumbs` remade all 123 of HEAD's images
byte for byte ([`reencode.txt`](data/screenshots/reencode.txt), step 1).

**S6. Atlas pages are lossless WebP.**

- The encoder options are `{ lossless: true, effort: 6, exact: true }`.
- Pages are named `card_assets-<n>.webp`, and the manifests' `image` field
  names them.
- Near-lossless would save 0.78 MiB more a rebuild, but would give up exact
  pixels, so it isn't used.
- sharp writes these pages in WebP's `VP8L` form (lossless, alpha kept),
  checked with the lockfile's sharp 0.35.5.

**S7. The harness sizes PNG and WebP, and nothing else.**

- `pngSize()` in `served_files.ts` becomes `imageSize()`.
- For a WebP, it reads the `VP8X`, `VP8L` or `VP8 ` header, as
  [`research/atlases-and-webp.md`](research/atlases-and-webp.md) §7 lays them
  out.
- `pngOfSize()` stays as it is. No `webpOfSize()` is added, since no spec
  outside the harness's own needs one.

**S8. The rewrite is S2's rule, run on the day's history.**

- The rule strips every blob ever stored under a `docs/screenshots/` or
  `sprites/atlas/` folder, except those at the tips of `main` and `live`.
- The run uses `--prune-empty never --prune-degenerate never`, so no
  commit is dropped and every reference to one still resolves.
- `main` and `live` are pushed together, each leased to its old commit, by
  name, not with `--mirror`.
- S5 (also stripping old blobs no tip path holds) and S4 (stripping by
  size) are not done ([`research/history-rewrite.md`][hr]).

[hr]: research/history-rewrite.md

**S9. Which hashes are rewritten.**

- `rewrite-refs.mjs` rewrites every short hash in `docs/`.
- It leaves out `docs/repo-size/data/history/` and
  `docs/repo-size/research/history-rewrite.md`, which record the old
  history on purpose.
- The three spec fixtures that use real short hashes as sample strings are
  left alone.
- This file names old commits only as plain references, never as old-to-new
  pairs, so it can be rewritten with the rest.

**S10. Plan images are WebP.** A picture kept with a plan is WebP, made
lossless only when it must be exact. A "before" picture copies the
committed `preview.webp` instead of taking a new capture, as the Brick
Breaker and Asteroid Breaker plans did. A4 writes this down.

---

## 4. Strategy 3: why the atlases stay committed

Build-time generation was measured, not just reasoned about
([`research/atlases-and-webp.md`](research/atlases-and-webp.md) §2–4).

**It works.**

- The generator ran in the Dockerfile's `node:26.13.1-alpine3.24` image.
- The lockfile already has the musl builds of sharp and resvg.
- A run takes 32–36 s on the devbox, and 36 s held to 4 CPUs in Alpine.

**It isn't worth it, for four reasons.**

1. **The output depends on the platform.**
   - glibc, musl and the machine that built today's pages each draw a few
     corner pixels differently. That is 2–7 pixels, up to 31 of 255, on the
     0.5x and 0.75x pages of the three sheet decks.
   - So CI would test one set of bytes, and the image would ship another.
2. **Every build pays for it.**
   - Every Docker build and Cloud Build would spend about 36–45 s
     generating, and every fresh clone's first `yarn dev` or `yarn test`
     too.
   - CI would need an Actions cache in two jobs, and the generator would
     need a staleness hash and a lock.
3. **Art could change with nothing to review.** A Dependabot bump of sharp
   or resvg that changed how the pages render would ship straight to
   `live`.
4. **It saves little more than WebP.** After B, a full rebuild adds
   9.17 MiB; generating would add 0. Ten commits rebuilt some or all of the
   pages between 2026-10-03 and 2026-10-10, adding 43.65 MiB, and none has
   since ([`history-rebuilds.txt`](data/atlases/history-rebuilds.txt)).
   Part C strips whatever piles up before it runs.

**When to look again:** if full atlas rebuilds become weekly, or a page
grows past 4096 px. The research's §4 is the design to start from. It keeps
the JSON committed, generates only the pages behind `--if-stale`, and uses
an Actions cache.

---

## 5. Contracts

These are the names and types the packages share, fixed before code.

### `@fz/dev/screenshots` (A1)

```ts
/**
 * The most any channel of any pixel may move, of 255, for a capture's image
 * to count as unchanged and the committed one kept.
 */
export const UNCHANGED_LEVELS = 48;

/** What writing an image did. */
export interface WrittenImage {
  /** The size in bytes of the file now on disk. */
  readonly bytes: number;
  /** Whether the committed file was kept, as nothing in it moved far enough. */
  readonly kept: boolean;
  /**
   * The largest change in any channel against the committed image, of 255,
   * or undefined where there was none of the same size to compare.
   */
  readonly moved: number | undefined;
}

export interface ImageOptions {
  readonly region?: Region | undefined;
  readonly resize?: ResizeOptions | undefined;
  readonly quality?: number;
  /** Writes the image even where the committed one would be kept. */
  readonly force?: boolean | undefined;
}

export interface SiteImageOptions {
  readonly thumbRegion?: Region | undefined;
  readonly resize?: ResizeOptions;
  readonly force?: boolean | undefined;
}

export function writeImage(
  capture: string | Buffer,
  target: string,
  image: Image,
  options?: ImageOptions,
): Promise<WrittenImage>;

export function writeSiteImages(
  capture: string | Buffer,
  folder: string,
  options?: SiteImageOptions,
): Promise<Map<string, WrittenImage>>;

export function keepShot(
  shot: Shot | Missed,
  folder: string,
  printer: Printer,
  options?: { readonly force?: boolean | undefined },
): Promise<number>;

export interface ScreenshotRequest {
  readonly url: string;
  readonly names: readonly string[];
  /** Whether `--force` was given: write every image. */
  readonly force: boolean;
}
```

- **The command line:** `runScreenshotScript()` reads `--force`, a boolean
  that defaults to false. Its usage gains the line
  `--force  Write every image, even one that looks unchanged`.
- **The report:** one exported function words each image's line, so
  `keepShot()` and the Solitaire Collection's capture print alike:

  ```ts
  /** Returns the line a capture prints for an image it wrote or kept. */
  export function describeImage(file: string, written: WrittenImage): string;
  ```

  It gives `thumb.webp: 20 KB` for an image written, and `thumb.webp: kept,
moved at most 23 of 255` for one kept. The Solitaire Collection's capture
  prefixes each line with the game's id.

- **`force` is handed on as given:** each option that passes it along is
  typed `force?: boolean | undefined`, as `exactOptionalPropertyTypes` asks
  of an option handed on (`.agents/AGENTS.md`).

### The Solitaire Collection's capture (A3)

- `yarn capture:screenshots [id …] [--force]` writes
  `public/docs/screenshots/<id>/thumb.webp` (576 × 324, cropped to the
  board) and `preview.webp` (2560 × 1440, the whole page).
- It writes nothing else, anywhere.
- `yarn build:thumbs` no longer exists.

### The harness (B1)

```ts
/** Returns a PNG's or a WebP's size from its header, or 0 × 0 for bytes that are neither. */
function imageSize(bytes: Uint8Array): { width: number; height: number };
```

WebP's three headers, after `RIFF` (bytes 0–3) and `WEBP` (bytes 8–11):

| Chunk at bytes 12–15 | Width and height                                                                                                            |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `VP8X`               | 24-bit little-endian width − 1 at byte 24, then height − 1 at byte 27                                                       |
| `VP8L`               | after the signature byte 0x2f at byte 20, 14 bits of width − 1 then 14 of height − 1, from byte 21, little-endian bit order |
| `VP8 `               | 16-bit little-endian fields at bytes 26 and 28, of which the low 14 bits are the width and the height                       |

### The atlases (B2)

- **Pages:** `frontend/games/solitaire/src/engine/render/assets/sprites/atlas/<deck>/<n>x/card_assets-<i>.webp`.
- **Manifests:** each `card_assets_atlas.json` lists its pages as
  `"image": "card_assets-<i>.webp"`, and nothing else in it changes.
- **The bundle:** `card_deck_atlas.ts` globs
  `card_assets-*.webp` with `?url`.

---

## 6. Work packages

Each package is one or two commits, and each commit passes `yarn verify`
on its own. Every commit goes through the `commit-review-process` skill,
and every merge to `main` follows the `merge-to-main` skill: `yarn
verify:full` for code. Nothing is pushed until the user asks.

### P0. Commit this plan

1. Rebase the `repo-size-plan` worktree onto `origin/main`, which was
   0814f99f at the time of writing. The three commits since 305edc24 touch
   only `docs/agent-efficiency-audit/`.
2. Delete the two sample sheets,
   `docs/repo-size/data/screenshots/samples/*.webp`, and say in
   `research/screenshots.md` that `samples.mjs` makes them again.
3. Run `frontend/node_modules/.bin/prettier --check docs/repo-size`, on
   that path only. `yarn prettier` would rewrite the whole repository.
4. Commit it as `docs(repo-size): …`. It is Markdown, scripts and data
   under `docs/`, so the merge needs `yarn lint`, and no coverage run.
5. Push it to `main`.
6. Make D3's backup repository, a bare mirror nothing pushes from:

   ```sh
   git clone --mirror https://github.com/fuzzley/fuzzley-games.git ~/Projects/personal/fuzzley-games-backup.git
   git -C ~/Projects/personal/fuzzley-games-backup.git remote set-url --push origin DISABLED
   ```

**Done when** the folder is on `main`, `yarn lint` passes, and the backup
mirror holds `main` at the pushed commit.

### A1. The gate

**Files:**

- `frontend/lib/dev/src/screenshots.ts`:
  - `writeImage()` encodes the WebP to a buffer instead of a file. Then,
    unless `force` is set:
    - it decodes that encoded buffer again, and the committed file, if
      there is one, each with `sharp(…).removeAlpha().raw().toBuffer({
resolveWithObject: true })`, as `gate-check.mjs` measured them. The
      new image's pixels are the encoded ones, not the capture's, so the
      same capture written twice compares as 0.
    - where the committed file's width and height match the new image's,
      it finds the largest absolute difference across the two buffers,
      stopping early once it passes `UNCHANGED_LEVELS`;
    - where that is at most `UNCHANGED_LEVELS`, it leaves the file as it
      is and returns `{ kept: true }`.
    - A committed file that doesn't decode counts as nothing to compare,
      and is replaced, rather than ending a run of many games.
  - Otherwise it writes the buffer, with `writeFile`.
  - `writeSiteImages()` passes `force` through. `keepShot()` takes the
    options and prints each image's `describeImage()` line (§5).
  - `readRequest()` reads `--force`, and `usageOf()` lists it.
- **The six other games' `tools/capture-screenshots.mjs`** (Minesweeper,
  Sudoku, Snake, Brick Breaker, Asteroid Breaker, Brick Fuzz Pop): each
  takes `force` from its request beside `url`, and passes `{ force }` to
  `keepShot()`. That is one line in each.
- `frontend/games/solitaire/tools/build-screenshot-thumbs.mjs` is changed
  only as far as the new return type needs (it prints `bytes`), since A3
  deletes it. Its JSDoc is type-checked, so the commit fails without it.
- **Docs:**
  - `frontend/lib/dev/AGENTS.md`, the screenshots entry: the gate, its
    tolerance, the report and `--force`.
  - `frontend/games/AGENTS.md`, "Its screenshots are the site's": a retake
    keeps what didn't visibly change.
  - Every game's `AGENTS.md` entry for `capture:screenshots`, where it
    lists the options.

**Specs**, in `frontend/lib/dev/src/screenshots.spec.ts`, on images made
with sharp in a temporary folder:

- It writes an image where none exists, and reports `moved: undefined`.
- Writing the same capture twice keeps the file, unchanged in bytes and
  mtime, with `moved: 0`.
- A capture with one 16 × 16 block moved by 10 levels is kept.
- A capture with that block moved by 120 levels is written, and `moved`
  is over 48.
- A committed image of another size is replaced.
- A committed file that isn't an image is replaced, without throwing.
- `force: true` writes an image that would otherwise be kept.
- `keepShot()` prints both forms of the report line.
- `readRequest()` reads `--force`, and the usage lists it.

**Done when:**

- `yarn verify:changed`, then `yarn verify:full`, pass.
- In the real app, `yarn workspace minesweeper dev` is started and
  `yarn workspace minesweeper capture:screenshots` run. It reports both
  images as kept, and `git status` is clean. With `--force` it writes
  them, and then `git checkout` puts them back.
- The research found that Minesweeper's thumbnail drifts by up to 22
  levels on this machine. The kept report shows that number.

### A2. The rules pages show the preview

**Files:**

- `frontend/games/solitaire/src/ui/app/provider/game_documentation_data.ts`:
  each of the 41 `screenshot.url`s goes from `…/overview.webp` to
  `…/preview.webp`. That is a mechanical replacement, so check that the
  count is 41.
- `frontend/games/solitaire/src/ui/app/model/game_documentation.model.ts`:
  the example in the doc comment.
- `git rm frontend/games/solitaire/public/docs/screenshots/*/overview.webp`,
  41 files.
- `frontend/games/solitaire/tools/build-screenshot-thumbs.mjs`: stop
  writing `overview.webp`, by removing `OVERVIEW` and `OVERVIEW_QUALITY`.
  This keeps `build:thumbs` honest until A3.
- **The specs' comments** that say "What `yarn build:thumbs` writes":
  - `frontend/games/solitaire/test/ui/app/provider/game_documentation.spec.ts`;
  - `frontend/games/solitaire/test/ui/app/model/game_browser_item.spec.ts`.

  They name the capture once A3 lands. Here they lose "overview".

- **Docs:**
  - `frontend/games/solitaire/AGENTS.md`, under Build Screenshot
    Thumbnails: the rules page's image is no longer listed.
  - The `add-solitaire-game` skill, step 3: point `screenshot.url` at
    `preview.webp`.
  - `frontend/lib/dev/AGENTS.md`, the screenshots entry: `writeImage()` is
    no longer used "as the Solitaire Collection's rules-page image is", so
    that example goes here, not in A3.

**Specs:** `game_documentation.spec.ts` already fails on a rules page
whose image doesn't exist, so it proves every page's new URL is there. No
new spec is needed.

**Done when:**

- `yarn verify:changed` and `yarn verify:full` pass.
- In a browser on the dev server (port 9000), Klondike's rules page and
  Montana's show their screenshots, at the same size as before, with no
  404 in the console.
- `git grep -n overview.webp -- frontend` finds nothing.

### A3. The Solitaire Collection captures like every other game

**Files:**

- `frontend/games/solitaire/tools/capture-screenshots.mjs`:
  - The capture's PNG buffer goes to `writeSiteImages(shot.png,
siteImagesFolder(ROOT, id), { thumbRegion: region, resize, force })`,
    with `region` and the felt from `findBoard(shot.png)`, and
    `resize = { fit: "contain", position: "top", background: felt }`.
    `findBoard()` and `isFelt()` move here, and `findBoard()` takes
    `string | Buffer`.
  - Where `findBoard()` finds no felt, the game is skipped, named by its
    id, as a capture that fails is today, rather than throwing out of the
    run. Its message names the game, not the buffer.
  - Each image's line is `describeImage()`'s, prefixed with the game's id.
  - `everyGame()` reads the folders under `public/docs/screenshots/`.
  - `TARGET`, `SCREENSHOT_DIR`, the `sharp(…).png()` write, and the closing
    "Run yarn build:thumbs" line go.
  - The header comment says what it writes now, and that it keeps
    no original.
- **Delete** `frontend/games/solitaire/tools/build-screenshot-thumbs.mjs`,
  and the `build:thumbs` script in `frontend/games/solitaire/package.json`.
- `git rm -r frontend/games/solitaire/docs/screenshots/`, the 41
  `overview.png` files (20.07 MiB).
- **Comments:**
  - `frontend/games/solitaire/src/ui/app/styles/_tokens.scss`, line 73:
    "which the capture draws at twice this".
  - The two specs' "What `yarn build:thumbs` writes", which becomes "What
    `yarn capture:screenshots` writes".
- **Docs:**
  - `frontend/games/solitaire/AGENTS.md`: rewrite "Capture Screenshots" as
    this command, remove "Build Screenshot Thumbnails", and fix "Its
    history began in fSolitaire" ("`docs/` holds … the lossless
    screenshots", which is no longer true).
  - The `add-solitaire-game` skill, step 3: one command, no second step.
  - `frontend/lib/dev/AGENTS.md`: remove the Solitaire exception ("makes
    them from that with `build:thumbs`", and "or, as the Solitaire
    Collection's does, what it writes of its own"). Keep that it shoots
    its page at 1440 × 810.
  - `frontend/games/AGENTS.md`, if it mentions the exception.
- **Keep** `.dockerignore`'s `frontend/games/solitaire/docs`, since that
  folder still holds the design notes.

**Specs:** the tool is a script with no spec today, so none is added.
The shared writer it now calls is A1's, and that is specced there.

**Done when:**

- `yarn verify:changed` and `yarn verify:full` pass, and
  `node .agents/check-skill-references.mjs` passes.
- In the real app, with `yarn workspace solitaire dev` running,
  `yarn workspace solitaire capture:screenshots klondike spider freecell`
  reports all 6 images kept, and `git status` is clean.
  - That is the proof that S5's crop is unchanged and that the gate
    holds. The research measured a fresh capture's previews moving by up
    to 40 levels.
  - With `--force klondike`, the run writes two images, and they look the
    same as HEAD's. Then restore them with `git checkout`.
- Run all 41 once, in about 4.5 minutes. Every image is reported kept, or
  any that isn't is looked at before committing. Commit only those that
  changed visibly, and expect none.
- `git grep -n -e build:thumbs -e build-screenshot-thumbs -e overview.png --
. ':!docs'` finds nothing.

### A4. Plan images (S10)

**File:** `.agents/AGENTS.md`, "Writing Documentation". Add one bullet: a
picture kept with a plan is WebP, made lossless only when it must be exact,
and a "before" picture copies the committed `preview.webp` rather than
taking a new capture.

**Done when** the bullet is there, and the docs check passes. It is
Markdown, so no coverage run is needed.

### B1. The harness reads WebP

**Files:**

- `frontend/lib/phaser/src/testing/served_files.ts`: `pngSize()` becomes
  `imageSize()`, with §5's three WebP readers, each checked against the
  file's length. The `src` setter calls `imageSize()`.
- **Docs:**
  - The `phaser-core` skill, line 496: "An image decodes at the size its
    PNG header gives" names the WebP header too.
  - `frontend/lib/phaser/AGENTS.md` names only `pngOfSize()`, which stays,
    so it needs no edit.

**Specs**, in `frontend/lib/phaser/src/testing/served_files.spec.ts`:

- A served `VP8L`, `VP8X` and `VP8 ` image, each built byte by byte in the
  spec from §5's layout, loads with the right `naturalWidth` and
  `naturalHeight`.
- Use sizes whose bits cross a byte boundary, such as 3876 × 1260 (the
  classic 1x page).
- A `RIFF` file that isn't a WebP, and one cut short, size to 0 × 0.
- The PNG specs stay as they are.

**Done when** `yarn verify:changed` and `yarn verify:full` pass. B1 changes
no behaviour that any game sees today.

### B2. Atlas pages as lossless WebP

**Files:**

- `frontend/games/solitaire/tools/card-atlas/atlas-writer.mjs`:
  - In `writeAtlas()`, `card_assets-${index}.webp`, with
    `.webp({ lossless: true, effort: 6, exact: true })` in place of
    `.png({ compressionLevel: 9 })`.
  - `cleanOutput()` matches `/^card_assets(-\d+)?\.(png|webp)$/`, so the
    old PNG pages go.
  - The frames' in-memory `.png()` steps stay as they are.
- `frontend/games/solitaire/src/engine/render/phaser/deck/card_deck_atlas.ts`:
  the glob becomes `card_assets-*.webp`.
- `frontend/games/solitaire/test/engine/render/phaser/scene/board_scene.spec.ts`:
  `ATLAS_PAGE` matches `\.webp$`.
- `frontend/games/solitaire/test/engine/render/phaser/deck/card_deck_atlas.spec.ts`:
  the comment at line 170.
- **Regenerate:** run `yarn workspace solitaire build:atlas` once. It takes
  about 35 s. Commit the 24 new pages (21 distinct files, as the four 2x
  second pages are the same), the 20 manifests (only their `image` fields
  change; `mobile/vectors.json` names no page and stays as it is), and the
  deletion of the 24 PNG pages.
- **Docs:**
  - `frontend/games/solitaire/NOTICE`: the six page paths, and
    `card_assets-1.png` at line 59.
  - `frontend/games/solitaire/AGENTS.md`'s rule on `yarn build:atlas`, if
    it names the format. The `solitaire-build` and `solitaire-phaser`
    skills, which named PNG pages, have since been deleted.

**Checks before committing:**

1. **The same pixels.**
   - Before switching the writer, run the generator into a scratch copy, as
     `scripts/atlases/run-generator.mjs` does, to get this machine's PNG
     pages.
   - After switching, decode both sets with sharp and compare the RGBA of
     each of the 24 pairs. All 24 must be identical.
   - Write this check as `docs/repo-size/scripts/atlases/check-webp-pages.mjs`,
     with its output in `data/atlases/`.
   - Against HEAD's committed PNGs, expect only the 6 pages the research
     found to differ by platform, in the same few corner pixels
     ([`compare-local-runs.txt`](data/atlases/compare-local-runs.txt)).
2. **The size.** The 21 distinct new pages come to 9.17 MiB, give or take
   a little.
3. **The same drawing.**
   - With `yarn workspace solitaire dev`, the capture for `klondike spider
freecell` reports every image kept, since WebGL draws lossless WebP
     identically ([`phaser-webp-check.txt`](data/atlases/phaser-webp-check.txt)).
   - In a browser, each of the four decks is chosen in Settings and a deal
     is looked at, at a roomy size and as a phone. Look for no missing
     card, and no console error ("Atlas page not found" is what a glob
     mismatch throws).
4. **The build.**
   - `frontend/games/solitaire/dist/assets/` holds 21 `card_assets-*.webp`
     files with hashed names, as the bundler writes the shared 2x second
     page once, and no `card_assets-*.png`.
   - `du -sb` of its `assets/` falls by about 7.4 MiB.

**Done when** the four checks hold, and `yarn verify:full` passes. The
Solitaire Collection has no layout check, so check 3 is the look in a
browser.

---

## 7. Running the build

- **One session is enough for A and B.** They are about a dozen files
  each, and most of the time goes into the checks. Build them on one
  branch from `origin/main`, in the order A1, A2, A3, A4, B1, B2, each
  commit reviewed. B2 must follow A3 (§1). Merge them to `main` in one push or several, as the user
  likes.
- If the user wants them sooner, two agents in worktrees can build A and
  B1 side by side. B2 then follows once A3 has landed. Their files overlap
  only in `frontend/games/solitaire/AGENTS.md`, which rebases easily.
- **Cost:** none of A or B is a big change, so no workflow and no more than
  two agents are needed.
- **Another session may be building at the same time,** today the
  agent-efficiency work. Use `verify:changed` while working, and run
  `verify:full` once before the merge, not in parallel with another
  session's.
- **No push without the user's word.** A push to `main` deploys, once
  Verify passes.

---

## 8. Part C: the history rewrite

**This part breaks the `merge-to-main` skill's rules on purpose:** it
force-pushes `main` and `live`, and deletes Dependabot's branches. It does
that once, in the steps below, and nowhere else.

This is [`research/history-rewrite.md`](research/history-rewrite.md) §5's
runbook, set out in full and adjusted for A and B. Every step was
rehearsed on mirrors, except the pushes.

### Before the day

1. **A and B are live.** `main` and `live` are the same commit, and
   `fuzzley.games/version.json` names it.
2. **No pull request is open.** Take the open Dependabot updates by hand,
   in one deduplicated commit on `main`, as the memory note on Dependabot
   says. Dependabot then closes its pull requests and deletes their
   branches. Today those are #30–#33. `gh pr list -R fuzzley/fuzzley-games
--state open` must list none on the day, or each is closed and its
   branch deleted at C6.
3. **D5 is answered:** the day, and the freeze around it.
4. **Rehearse it the day before**, into a scratch folder, so the real
   figures are known:

   ```sh
   export WORK=~/Projects/personal/repo-rewrite-rehearsal
   export DATA=$WORK/data
   cd docs/repo-size/scripts/history
   ./01-mirror.sh fresh && ./02-inventory.sh && ./03-scenario.sh s2 && ./09-rewrite-refs-dry-run.sh s2
   ```

   The clone's figure in `$DATA/scenarios.tsv` should be about 59 MiB, as
   `13-after-plans.sh` projected. The verify file should show 0 tree
   differences, every commit kept, and 0 message references wrong. Delete
   `$WORK` afterwards.

5. **Freeze.** Every session finishes, pushes or saves its work. Then
   `./08-local-clones.sh` shows no branch with commits that no remote
   holds.
   - Save the one stash entry, "local-pipeline steps 3 and 4", as a patch:
     `git stash list --format='%H %gs'`, then
     `git stash show -p --include-untracked <sha> > ~/Projects/personal/stash-local-pipeline.patch`.
     The entry holds untracked files too, which `git stash show -p` alone
     leaves out.
   - This plan's worktree, like every other, has its work on `main` and
     is removed (`git worktree remove`).

### On the day

Run from `docs/repo-size/scripts/history/` in the main checkout, pulled to
C1's commit, with:

```sh
export WORK=~/Projects/personal/repo-rewrite-$(date +%F)
export DATA=$WORK/data
```

so the dry run's records in the repository stay as they are.

**C1. Check that nothing is moving.**

```sh
git ls-remote https://github.com/fuzzley/fuzzley-games.git refs/heads/main refs/heads/live
gh run list -R fuzzley/fuzzley-games --branch main -L 3
curl -s https://fuzzley.games/version.json | jq -r .commit
```

`main` and `live` must be the same commit, the last Verify run must have
passed with none running, and the site must serve that commit.

**C2. Back up** (D3). First the work mirror the scripts read, then the
backup repository, brought up to the same refs and cut off from GitHub, so
that no later fetch can replace its history with the rewritten one.

```sh
./01-mirror.sh fresh
backup=~/Projects/personal/fuzzley-games-backup.git
git -C "$backup" fetch --prune origin
diff <(git -C "$backup" for-each-ref) <(git -C "$WORK/fuzzley-games.git" for-each-ref)
git -C "$backup" remote remove origin
git -C "$backup" fsck --full
git -C "$backup" bundle create ~/Projects/personal/fuzzley-games-pre-rewrite.bundle --all
git bundle verify ~/Projects/personal/fuzzley-games-pre-rewrite.bundle
git -C "$backup" for-each-ref > ~/Projects/personal/fuzzley-games-backup.refs.txt
```

- The `diff` must print nothing: both hold every branch and pull request
  ref at C1's commits.
- `fsck` must pass. `remote remove` on a mirror drops only the remote's
  settings, since a mirror keeps its refs under `refs/heads/` and
  `refs/pull/`, not `refs/remotes/`.
- The mirror and the bundle each hold the same history. The bundle is a
  single file, so it is the easier one to move elsewhere later.

**C3. Rewrite a copy.**

```sh
./02-inventory.sh
./03-scenario.sh s2
```

The rewritten mirror is `$WORK/s2.git`, with filter-repo's commit map and
ref map in `$WORK/s2.git/filter-repo/`.

**C4. Check it.**

- `$DATA/scenario-s2-verify.txt` shows 0 tree differences for `main` and
  `live`, every commit on `main` kept (the day's count), and 0 message
  references wrong.
- `$DATA/scenario-s2-fsck.txt` ends in `exit: ok`.
- The clone's size in `$DATA/scenarios.tsv` is close to the rehearsal's.

**C5. Dry-run the docs' hashes.** Run `./09-rewrite-refs-dry-run.sh s2`.
`$DATA/rewrite-refs-s2.txt` must show nothing ambiguous, nothing
lengthened, and no replacements in its second pass.

**C6. Push `main` and `live` together**, each leased to the commit it had
at C1.

```sh
old_main=$(git -C "$WORK/fuzzley-games.git" rev-parse refs/heads/main)
old_live=$(git -C "$WORK/fuzzley-games.git" rev-parse refs/heads/live)
git -C "$WORK/s2.git" push --atomic \
  --force-with-lease=refs/heads/main:"$old_main" \
  --force-with-lease=refs/heads/live:"$old_live" \
  https://github.com/fuzzley/fuzzley-games.git \
  refs/heads/main:refs/heads/main refs/heads/live:refs/heads/live
```

- The ruleset `main-branch-needs-pull-request` lets the owner bypass it.
  GitHub records the push as a bypass.
- Delete any Dependabot branch still there:
  `git push https://github.com/fuzzley/fuzzley-games.git --delete <branch>`.

**C7. Watch it land.**

- `git ls-remote` shows the ref map's new commits.
- Verify runs every check on `main`, since `changes` finds `live` equal to
  `HEAD`, and passes. `promote` finds `live` already there.
- Cloud Build builds `live`.
  `curl -s https://fuzzley.games/version.json | jq -r .commit` gives the
  new short hash, and the footer's link opens it on GitHub.
- If Cloud Build doesn't start within a few minutes, the site keeps
  serving the last revision. The user then checks the trigger in the
  console.

**C8. Rewrite the hashes the docs name.**

```sh
git clone https://github.com/fuzzley/fuzzley-games.git "$WORK/after"
cd "$WORK/after"
node docs/repo-size/scripts/history/rewrite-refs.mjs \
  --map "$WORK/s2.git/filter-repo/commit-map" \
  --old "$WORK/fuzzley-games.git" --new "$WORK/s2.git" \
  --other ~/Projects/personal/fuzzley \
  --exclude docs/repo-size/data/history \
  --exclude docs/repo-size/research/history-rewrite.md \
  docs
```

- Check the counts against C5's, then run it again with `--write`.
- C5 found nothing to lengthen, so every rewritten hash keeps its length
  and no line's formatting changes. Check that with the main checkout's
  Prettier, since this clone has no `node_modules`:
  `~/Projects/personal/fuzzley-games/frontend/node_modules/.bin/prettier --check $(git diff --name-only)`.
- Commit as `docs: name the commits as the rewritten history has them`,
  reviewed, and push it to `main` (Verify only lints docs).
- **The memory notes (D4).** Run the same command with
  `~/.claude/projects/-home-dev-Projects-personal/memory` in place of
  `docs`, without `--write`, and read the list.
  - Where a note's point stands without the commit, remove the hash from
    the note by hand.
  - Then run it with `--write` for the rest.
  - The notes aren't in the repository, so nothing is committed.

**C9. GitHub's figure** is kept as it is (D1), so there is nothing to do.
Record `gh api repos/fuzzley/fuzzley-games --jq .size` for §12: it should
stay near 290 MiB, or grow slightly with the new commits.

**C10. Clone every local copy again.** A clone that fetches after the
rewrite gets the new history beside the old, a `git pull` would merge the
two, and a later push would bring the old objects back.

```sh
mv ~/Projects/personal/fuzzley-games ~/Projects/personal/fuzzley-games-old
git clone https://github.com/fuzzley/fuzzley-games.git ~/Projects/personal/fuzzley-games
cd ~/Projects/personal/fuzzley-games
node .agents/link-claude-skills.mjs
(cd frontend && npx -y corepack yarn install)
```

- Copy any untracked files across.
- An unpushed branch moves with `git rebase --onto <new base> <old base>
<branch>`, the new base taken from the commit map.
- Any clone on the Windows side must be cloned again too. The devbox can't
  see it, so the user does this.
- Keep `fuzzley-games-old` until nothing in it is wanted, then delete it.

**C11. Keep the backup** (`~/Projects/personal/fuzzley-games-backup.git`
and its bundle) for at least three months. Delete it only once nothing names the old
commits. Delete the dry runs' 3 GB in
`~/Projects/personal/repo-size-2026-11-21/` once C4 has passed.

### Rollback

- **Before anything new lands on the rewritten `main`:** push the old
  commits back from the backup repository, leased to the new ones.

  ```sh
  git -C ~/Projects/personal/fuzzley-games-backup.git push --atomic \
    --force-with-lease=refs/heads/main:"$(git -C "$WORK/s2.git" rev-parse refs/heads/main)" \
    --force-with-lease=refs/heads/live:"$(git -C "$WORK/s2.git" rev-parse refs/heads/live)" \
    https://github.com/fuzzley/fuzzley-games.git \
    refs/heads/main:refs/heads/main refs/heads/live:refs/heads/live
  ```

  - Cloud Build then deploys the old `live` again.
  - If the backup repository is gone, `git clone --mirror
~/Projects/personal/fuzzley-games-pre-rewrite.bundle restored.git`
    gives it back with every ref. `11-backup-rehearsal.sh` checked this
    ([`backup-rehearsal.txt`](data/history/backup-rehearsal.txt)).

- **After new commits land** (C8's at least), in a clone of the rewritten
  repository:

  ```sh
  backup=~/Projects/personal/fuzzley-games-backup.git
  pushed=$(git -C "$WORK/s2.git" rev-parse refs/heads/main)   # main as C6 pushed it
  git fetch origin && now_main=$(git rev-parse origin/main) && now_live=$(git rev-parse origin/live)
  git fetch "$backup" refs/heads/main:refs/old/main
  git switch -c rollback origin/main
  git rebase --onto refs/old/main "$pushed" rollback
  awk 'NR == 1 { print; next } { print $2, $1 }' "$WORK/s2.git/filter-repo/commit-map" > "$WORK/commit-map-back"
  node docs/repo-size/scripts/history/rewrite-refs.mjs \
    --map "$WORK/commit-map-back" --old "$WORK/s2.git" --new "$backup" \
    --other ~/Projects/personal/fuzzley \
    --exclude docs/repo-size/data/history \
    --exclude docs/repo-size/research/history-rewrite.md \
    docs                # then again with --write, and commit
  git push --atomic \
    --force-with-lease=refs/heads/main:"$now_main" \
    --force-with-lease=refs/heads/live:"$now_live" \
    https://github.com/fuzzley/fuzzley-games.git \
    rollback:refs/heads/main rollback:refs/heads/live
  ```

  - The trees match, so the rebase applies cleanly.
  - The map is reversed, and so are `--old` and `--new`: the docs' hashes
    resolve in the rewritten history, and are checked for ambiguity in the
    old one.
  - The commits made after C6 get new hashes again, so a doc naming one of
    them names it by its old hash. There are none unless docs named them
    after C8.
  - Pushing `live` with `main` is the rollback the repository's rules
    allow.

---

## 9. Checks and budgets

**Before each merge:** `yarn verify:full` for code (the `merge-to-main`
skill), and the package's own "done when".

**What each package may add to history**, measured on its branch before
the push:

```sh
git rev-list --objects origin/main..HEAD \
  | git cat-file --batch-check='%(objecttype) %(objectsize) %(rest)' \
  | awk '$1 == "blob" { s += $2 } END { printf "%.2f MiB\n", s / 1048576 }'
```

| Package | Budget                                                                                                           |
| ------- | ---------------------------------------------------------------------------------------------------------------- |
| P0      | under 2 MiB, text                                                                                                |
| A1–A4   | under 0.1 MiB: code and docs, and deletions, which add no blob                                                   |
| B1      | under 0.05 MiB                                                                                                   |
| B2      | about 9.7 MiB of raw blobs: 9.17 of pages and 0.5 of manifests, which delta well, so the pack grows by about 9.2 |

**After C:** a fresh clone's `git count-objects -vH` shows `size-pack`
near 59 MiB. `gh api repos/fuzzley/fuzzley-games --jq .size` is recorded
the day after and a week after, since GitHub doesn't say when it
recomputes.

**Kept in mind throughout:**

- The site's checks (`checkGameImages()`) and the Solitaire Collection's
  image specs must still pass after A. They read `thumb.webp` and
  `preview.webp`, which A keeps.
- Lint's skill-reference check fails on any backticked path a package
  deletes. Every doc that names `build-screenshot-thumbs.mjs`,
  `docs/screenshots/<id>/overview.png` or a `.png` page must change in the
  same commit.

---

## 10. Risks

| Risk                                                                       | Where | Likelihood | What limits it                                                                                                                                                                                                                                                                                                 |
| -------------------------------------------------------------------------- | ----- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The gate keeps a real but tiny change, such as one digit in the game bar   | A1    | low        | Each kept image's largest change is printed; `--force` writes all. Measured: unchanged ≤ 40, history's smallest change 44                                                                                                                                                                                      |
| A different machine or Chrome version moves pixels by more than 48         | A1    | low        | The image is then written and shows in the diff, which is today's behaviour; raise the tolerance only with new measurements                                                                                                                                                                                    |
| A broad change under 48 levels, such as a slightly different felt, is kept | A1    | low        | Not measured: the gate tests the largest change, not the mean. Each kept image's largest change is printed, and a change meant to show everywhere, such as a palette, is retaken with `--force`. A whole-image mean rule may be added, but only once `gate-check.mjs` has measured it on the unchanged retakes |
| Changing an image's size or quality now takes a retake                     | A3    | certain    | 4.5 minutes for all 41 games; the research's figures say when it is worth it                                                                                                                                                                                                                                   |
| Rules pages download 145 KiB rather than 109 KiB on average                | A2    | certain    | Lazy-loaded, and often cached from the game browser                                                                                                                                                                                                                                                            |
| A doc or skill still names a deleted path                                  | A, B  | medium     | Lint's reference check fails the commit; §6's `git grep` lines                                                                                                                                                                                                                                                 |
| A browser without WebP shows no cards                                      | B2    | very low   | Every target (Safari 16.4+) decodes WebP, and the site already ships 135 WebP files                                                                                                                                                                                                                            |
| WebP pages take longer to decode (40 ms against 25 ms for the 1x page)     | B2    | certain    | Once per page as a deck loads; not measured on a phone                                                                                                                                                                                                                                                         |
| Safari and Firefox draw WebP pages differently                             | B2    | low        | Only headless Chrome was tried; B2's check 3 covers Chrome; look in Safari on the user's phone after it goes live                                                                                                                                                                                              |
| The regenerated pages differ from HEAD's in a few corner pixels            | B2    | certain    | 6 pages, 2–7 pixels each, at most 31 of 255; the platform, not the format; nobody can see it                                                                                                                                                                                                                   |
| Someone pushes during the rewrite                                          | C6    | low        | The freeze, and leases on both branches: the push fails rather than overwrite                                                                                                                                                                                                                                  |
| GitHub's figure doesn't fall                                               | C9    | certain    | Accepted (D1): clones shrink regardless, and A and B slow what GitHub adds                                                                                                                                                                                                                                     |
| The backup is on the devbox alone                                          | C2    | low        | A bare mirror and a bundle, checked with `fsck`; the bundle is one file to copy elsewhere if wanted                                                                                                                                                                                                            |
| An old commit doesn't build, as its atlas is gone                          | C     | certain    | Only for `git bisect` or checkouts across the atlases; an old atlas can be made again with that commit's own `build:atlas`, where it had one                                                                                                                                                                   |
| An old clone pushes the old history back                                   | C10   | medium     | Every local copy is cloned again, and the old one renamed; Windows-side copies are the user's to clone again                                                                                                                                                                                                   |
| 8 signed commits on `main` lose their signatures                           | C     | certain    | Accepted; filter-repo can't keep them                                                                                                                                                                                                                                                                          |
| Old commit links break                                                     | C     | low now    | GitHub serves old objects while the pull request refs hold them, which D1 keeps                                                                                                                                                                                                                                |

---

## 11. Finishing

1. Fill in §12 as each package lands: its commits, its measured figures,
   and anything that differed from this plan.
2. After C, record the figures:
   - the fresh clone's `size-pack`;
   - GitHub's `diskUsage` the day after and a week after.
3. Move the folder to `docs/archive/repo-size/` once C is done. Its
   scripts' paths name `docs/repo-size/`, so leave them, as other archived
   plans do. The archive's rule is to check a path against the tree.
4. Update the memory notes: one for this plan, and remove any note that
   names a deleted path, such as `build:thumbs`.

---

## 12. As built

- **P0:** steps 1–3 were done in the commit that adds this folder, on
  2026-11-21.
