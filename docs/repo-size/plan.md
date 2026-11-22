# Repository size: the plan

Written 2026-11-21, before any change was made, and checked against `main`
at ba66e77d the same day. By then the agent-efficiency work had cut the
`AGENTS.md` files and deleted the skills that the first draft's doc steps
named (§12). It plans three of the five strategies for making the
repository smaller, in the order they should be built:

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
   images, and make the backup. Done on 2026-11-21 (§12).
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
  made at P0 on 2026-11-21, at b67c3c01, with its push URL disabled. C2
  brings it up to date just before the rewrite, then cuts it off from
  GitHub, and writes a bundle of it beside it.
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
  - On 2026-11-21 that was one stash entry, "local-pipeline steps 3 and
    4". The branch the first draft named, `agent-efficiency-1-checks`, has
    since landed, and the remote holds only `main` and `live`.
    `08-local-clones.sh` lists what there is on the day.
  - Anything pushed during the window is either refused (the push is
    leased) or lost.
  - An old clone used after it would bring the old history back.

**D6. This folder goes to `main`, and is pushed.** That was P0, without the
two sample sheets in `data/screenshots/samples/`, done as b67c3c01. The
research, scripts and data are about 1 MiB of text. Part C runs from these
scripts, so they must be in a clone on the day.

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

/** What writing an image did: wrote it, or kept the committed one. */
export type WrittenImage =
  | {
      /** The committed file was kept, as nothing in it moved far enough. */
      readonly kept: true;
      /** The size in bytes of the file on disk. */
      readonly bytes: number;
      /** The largest change in any channel against the committed image, of 255. */
      readonly moved: number;
    }
  | {
      readonly kept: false;
      /** The size in bytes of the file written. */
      readonly bytes: number;
      /**
       * The change that ruled the committed image out, of 255, or undefined
       * where nothing was compared: `force` was set, or no committed image
       * of the same size decoded.
       */
      readonly moved: number | undefined;
    };

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
  options?: { readonly force?: boolean },
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

Each package is one commit and passes `yarn verify:changed` on its own.
They are built in the order A1, A2, A3, A4, B1, B2 (§1 says why B2 comes
after A3). §6.0 is the routine every package follows. Each package after it
gives its edits file by file, its specs, its checks, its commit's subject,
and the rules its review brief quotes.

Line numbers are as of `ba66e77d`, when this section was last checked
against the tree. An earlier package can move them, so find each place by
the name given with it.

P0, which committed this folder and made the backup, is done (§12).

### 6.0 How every package is built

**Once, before A1,** in the worktree
`~/Projects/personal/fuzzley-games-repo-size`, on the branch
`repo-size-plan`:

1. `git fetch origin && git rebase origin/main`, so the branch starts from
   that day's `main`. It was cut at ba66e77d.
2. From `frontend/`, run `npx -y corepack yarn install --immutable`. The
   worktree has no `node_modules` until then, and every check needs them.
3. From the root, run `node .agents/link-claude-skills.mjs`, which links the
   skills and agent definitions into the worktree's `.claude/`.
4. Check that `commit-reviewer` is among the agent types offered. Sessions
   start in `~/Projects/personal`, which links it already. If it is missing,
   ask the user once, as `commit-review-process` step 2 says.

**For each package:**

1. Make its edits and write its specs. Before changing a library, read the
   `fuzzley-ui` skill's "Changing a library" (A1, for `@fz/dev`), or
   `phaser-core` (B1, for `@fz/phaser`), as `frontend/AGENTS.md` asks.
2. Run `npx -y corepack yarn verify:changed` from `frontend/`, with the Bash
   tool's timeout at ten minutes.
   - It runs the root's lint, Prettier and typecheck, and the lint,
     typecheck, tests, build and layout check of each workspace the change
     reaches.
   - It waits for any run in another worktree, so it needs no lock.
3. Commit the package's files by name, with `git add` for new files and
   `git rm` for deletions first: `git commit -F - -- <paths>`. Use the
   subject the package gives, and no attribution lines.
4. Start a `commit-reviewer` agent in the background, with
   `commit-review-process`'s brief. It names:
   - the commit;
   - "the project: `docs/repo-size/plan.md`, §6 <package>";
   - what the change does;
   - the rules the package lists, quoted.
5. Go on to the next package. At most two reviews are out at once.
6. Answer each report in an `amend!` commit, as `commit-review-process`
   step 4 says, once `verify:changed` passes again.
7. Measure what the package adds to history (§9), and note it for §12.

**When A is done, and again when B is,** with every report answered:

1. Fold the `amend!` commits in:

   ```sh
   before=$(git rev-parse HEAD) &&
     GIT_EDITOR=true git rebase --autosquash --keep-base origin/main &&
     git diff --stat "$before" HEAD &&  # prints nothing
     git log --oneline origin/main..HEAD  # shows no amend!
   ```

2. Run `npx -y corepack yarn verify:full` from `frontend/`.
   - Run it alone on the machine. Unlike `verify:changed`, it doesn't wait
     for other runs, and two heavy checks at once have run the devbox out
     of memory before.
   - Then check that every line the packages changed is covered, as
     `merge-to-main` §3 asks, except the lines a commit's body names as
     uncovered.
3. Report to the user, with §12 filled in. **Nothing is pushed until they
   say so.**
4. On their word, land it as `merge-to-main` §4 says:
   1. `git fetch origin`. If `main` has moved, rebase onto it, and run
      `verify:full` again where the packages or what landed before them
      touch code.
   2. `git push origin HEAD:main`.
   3. `git -C ~/Projects/personal/fuzzley-games merge --ff-only origin/main`,
      if the main checkout has `main` checked out and is clean.
   4. Watch the Verify run, with
      `gh run list --workflow verify.yml --commit "$(git rev-parse HEAD)"`,
      and `live` move to the commit.

### A1. The gate

**What it does:** a retake writes a site image only where some pixel's
channel moved by more than 48 levels against the committed image (S1).
`--force` writes every image.

**Edits:**

1. `frontend/lib/dev/src/screenshots.ts`:
   - **New exports,** beside `SITE_IMAGE_QUALITY`: `UNCHANGED_LEVELS`,
     `WrittenImage` and `describeImage()` (§5).
   - **`ImageOptions`** gains `force` (§5).
   - **`writeImage()`** (line 107):
     1. It encodes as now, but with `.toBuffer()` in place of
        `.toFile(target)`.
     2. Unless `force` is set, it reads the committed file with
        `readFile(target)`, not by path, since sharp keeps a file it opened
        by path locked on Windows (the spec's `open()` says the same).
     3. It decodes the committed file and the encoded buffer, each with
        `sharp(…).removeAlpha().raw().toBuffer({ resolveWithObject: true })`.
        The new image is decoded from what was encoded, not from the
        capture, so the same capture written twice compares as 0.
     4. Only the committed file's read and decode are caught. A file that
        can't be read or decoded counts as nothing to compare. An error in
        encoding the capture still throws.
     5. If both decode at the same width and height, a private
        `largestChange(a, b)` returns the largest absolute difference
        between the two buffers' bytes. It stops as soon as the difference
        passes `UNCHANGED_LEVELS`, so a written image's `moved` is a lower
        bound.
     6. If the difference is at most `UNCHANGED_LEVELS`, it writes nothing,
        so the file's mtime holds. It returns
        `{ kept: true, bytes: <the committed file's length>, moved }`.
     7. Otherwise it writes the buffer with `writeFile(target, encoded)`,
        and returns `{ kept: false, bytes: encoded.length, moved }`.
     8. Its doc comment gains one paragraph on why it uses a tolerance and
        not a comparison of bytes: two captures of an unchanged page differ
        by a few pixels in the game bar, and WebP spreads that into changes
        of up to 40 levels.
   - **Imports:** `stat` is no longer imported; `readFile` and `writeFile`
     are.
   - **`SiteImageOptions`** gains `force`. **`writeSiteImages()`**
     (line 127) hands it to each `writeImage()`, and returns
     `Map<string, WrittenImage>`.
   - **`keepShot()`** (line 269) takes a fourth parameter,
     `{ force }: { readonly force?: boolean } = {}`, since every caller hands
     it the request's `boolean`. It hands
     `force` to `writeSiteImages()`, and prints
     `describeImage(file, written)` for each image in place of its `KB`
     line.
   - **`ScreenshotRequest`** (line 289) gains `force` (§5).
   - **`readRequest()`** (line 374) reads
     `force: { type: "boolean", default: false }`, and returns it with
     `url` and `names`. `runScreenshotScript()` hands it on in `asked`,
     unchanged.
   - **`usageOf()`** (line 403) lists
     `  --force          Write every image, even one that looks unchanged`
     before `-h, --help`, in the same 17-column layout.
   - **The module's opening comment** adds that a capture's image is
     written only where it visibly changed.
2. **The six other games' `tools/capture-screenshots.mjs`:** each
   `capture:` callback takes `force` beside `url`, and hands `{ force }`
   to `keepShot()` as its fourth argument. These are the lines, at
   ba66e77d:

   | Game             | `capture:` | `keepShot(` |
   | ---------------- | ---------: | ----------: |
   | minesweeper      |        240 |         241 |
   | sudoku           |        243 |         244 |
   | snake            |        122 |         123 |
   | brick-breaker    |        148 |         153 |
   | asteroid-breaker |        320 |         321 |
   | brick-fuzz-pop   |        229 |         234 |

3. `frontend/games/solitaire/tools/build-screenshot-thumbs.mjs`, only as far
   as the new return type needs, since A3 deletes it. Its import of
   `@fz/dev/screenshots` (lines 18–22) adds `describeImage()`, and `shrink()`
   (line 115) maps each `[file, written]`
   through it in place of its `KB` line. `tsconfig.scripts.json`
   type-checks the script's JSDoc, so the commit fails without this.
4. `frontend/games/AGENTS.md` gains one rule, after "A change to a game's
   layout is checked in a browser":

   > - **Retake the screenshots with `--force` after a change every image
   >   should show, such as a palette or a font.** Without it, a retake
   >   keeps any image in which no pixel moved by more than
   >   `UNCHANGED_LEVELS` (`@fz/dev/screenshots`), so a change that faint
   >   everywhere keeps every old image.

   This is the only `AGENTS.md` line A1 adds. What the gate does goes in
   `screenshots.ts`'s doc comments, as `.agents/AGENTS.md` asks.

**Specs,** in `frontend/lib/dev/src/screenshots.spec.ts`.

These existing specs change where the types do:

- `writeSiteImages`' "returns each file's size" (line 124): `sizes` is a
  `Map<string, WrittenImage>`. The spec checks the two names, and that each
  image was written (`kept: false`, `bytes > 0`, `moved: undefined`), since
  the folder is new.
- `writeImage`'s spec (line 143) names its file `fitted.webp` rather than
  `overview.webp`, so A2's `git grep` finds no `overview.webp`.
- The two request specs (lines 572 and 580) expect `force: false` beside
  `url` and `names`.
- The `--help` spec (line 591) expects the `--force` line.

New specs under `writeImage`, each in a folder of its own under the spec's
temporary folder. The image is written at the capture's own 1280 × 720, so
no resize blurs a change away:

- It writes an image where none is, with `moved: undefined`.
- Written twice from the same capture, the second call keeps the file:
  `kept: true`, `moved: 0`, and its bytes and mtime as the first call left
  them.
- A capture with a 16 × 16 block moved by 10 levels is kept, with `moved`
  above 0 and at most 48.
- The same block moved by 120 levels is written, with `moved` above 48.
- A committed image of another size is replaced, with `moved: undefined`.
- A committed file holding text is replaced, without throwing.
- `force: true` writes the image the second spec kept.

New specs elsewhere:

- `describeImage()` gives `thumb.webp: 20 KB` for an image written at
  20,480 bytes, and `thumb.webp: kept, moved at most 23 of 255` for one
  kept.
- `keepShot()`, run twice on one folder, prints the `kept` form the second
  time.
- `runScreenshotScript()` hands the capture `force: true` for `--force`.

**Checks:**

1. `verify:changed`. It reaches `@fz/dev`, and so every workspace, so it
   may take most of its ten minutes.
2. In the real app, with `yarn workspace minesweeper dev` running in the
   background, on port 9001:
   - `yarn workspace minesweeper capture:screenshots` prints
     `thumb.webp: kept, moved at most <n> of 255`, and the same for
     `preview.webp`. `git status` is clean afterwards. The research measured
     Minesweeper's thumbnail moving by up to 22 levels on this machine, so
     `<n>` should be about that.
   - `yarn workspace minesweeper capture:screenshots --force` prints both
     images as written, in KB.
   - Then run
     `git checkout -- frontend/games/minesweeper/public/docs/screenshots`,
     and stop the dev server.

**Commit:**

```text
feat(dev, minesweeper, sudoku, snake, brick-breaker, asteroid-breaker, brick-fuzz-pop, solitaire): a retake keeps each of the site's images whose pixels moved by 48 levels at most, and says so, unless --force writes every one
```

Its body names the lines no spec runs: each game's `capture:` callback,
which runs only in Chrome, as it does today.

**Rules for the review brief:** the reviewer's definition already holds
the rules for code, doc comments and specs, so quote only these:

- From `frontend/AGENTS.md`:
  - "A `tools/` script that a spec imports exports its logic as functions,
    and runs only as the file Node started…", since three of the capture
    scripts have specs that import them;
  - "Before changing a library, read the `fuzzley-ui` skill's 'Changing a
    library'… A piece added to a library, or one whose name or inputs
    change, changes its row in that skill in the same change". Its
    `@fz/dev` row names only "what `tools/` scripts share", so it doesn't
    change.
- From `frontend/lib/dev/AGENTS.md`: "Nothing here reaches an app's
  bundle."
- From `.agents/AGENTS.md`'s Agent Configuration, for the new rule: "Add
  to one only what an agent would get wrong without it…" and "A rule is
  written once, in the highest layer it holds for…"

### A2. The rules pages show the preview

**What it does:** S4. The rules page's `<img>`, at
`game_help_modal.component.html` line 124, shows `preview.webp`, and the
41 `overview.webp` files go.

**Edits:**

1. `frontend/games/solitaire/src/ui/app/provider/game_documentation_data.ts`:
   run `sed -i 's#/overview\.webp"#/preview.webp"#'` on it. Then
   `grep -c 'preview\.webp"'` gives 41, and `grep -c overview` gives 0.
2. `frontend/games/solitaire/src/ui/app/model/game_documentation.model.ts`,
   line 5: the example becomes `./docs/screenshots/klondike/preview.webp`.
3. Run `git rm frontend/games/solitaire/public/docs/screenshots/*/overview.webp`,
   which removes 41 files. Once they are gone, zsh finds no match for that
   glob, so the commit names the folder,
   `frontend/games/solitaire/public/docs/screenshots`, among its paths.
4. `frontend/games/solitaire/tools/build-screenshot-thumbs.mjs`:
   - Remove `OVERVIEW` and `OVERVIEW_QUALITY`, the `writeImage()` call
     and its import, and the map that joins its result to the site's two.
   - The header says the script writes two images.
   - This keeps `build:thumbs` true until A3 deletes it.
5. `frontend/games/solitaire/.agents/skills/add-solitaire-game/SKILL.md`,
   step 3 (line 266): `screenshot.url` points at
   `./docs/screenshots/<id>/preview.webp`.

**Specs:** none new.
`test/ui/app/provider/game_documentation.spec.ts` already fails for a
rules page whose image isn't in `public/`, so it proves that all 41 new URLs
exist. Its comment, "What `yarn build:thumbs` writes", is still true. It
changes in A3.

**Checks:**

1. `verify:changed`, which reaches the Solitaire Collection.
2. `git grep -n overview.webp -- frontend` finds nothing.
3. In a browser through the `chrome-devtools` MCP server, with
   `yarn workspace solitaire dev` running on port 9000:
   - Open `http://localhost:9000/#/klondike`, then `#/montana`, and open
     each game's rules.
   - The screenshot loads, at the same size as before: roomy, as a phone
     held upright, and as one on its side.
   - The network panel shows `preview.webp` with a 200, and the console
     shows no 404.
   - Close the browser afterwards.

**Commit:**

```text
refactor(solitaire): the rules pages show the preview the game browser shows, and the 41 overview.webp go
```

**Rules for the review brief:**

- From `frontend/AGENTS.md`: "Look at a UI or behavior change in the
  running page…".
- From `frontend/games/AGENTS.md`: "Minesweeper and the Solitaire
  Collection have none: look at their pages yourself, roomy, as a phone
  held upright and as one on its side."
- From `.agents/AGENTS.md`: "A skill, an agent definition and an
  `AGENTS.md` describe code that exists.", for the skill's step 3.

### A3. The Solitaire Collection captures like every other game

**What it does:** S2, S3 and S5. The capture writes `thumb.webp` and
`preview.webp` straight from the capture's PNG, and keeps no original.
`build:thumbs` goes.

**Edits:**

1. `frontend/games/solitaire/tools/capture-screenshots.mjs`:
   - **`isFelt()`, `MAX_CHROME_FRACTION` and `findBoard()`** move in from
     `build-screenshot-thumbs.mjs`, unchanged but in two ways:
     - `findBoard()` takes `string | Buffer`;
     - where it finds no felt, it returns
       `{ problem: "found no felt below the header" }` rather than throwing,
       since its message would print the buffer.
   - **`captureEach()`** reads `force` from the request. For each game it
     takes the capture, then runs `findBoard(shot.png)`. A problem from
     either one skips the game, as a failed capture does now. Then:

     ```js
     const written = await writeSiteImages(
       shot.png,
       siteImagesFolder(ROOT, id),
       {
         thumbRegion: board.region,
         // Contained rather than cropped, since a wide board runs edge to
         // edge; any strip left over goes below it, as more felt.
         resize: { fit: "contain", position: "top", background: board.felt },
         force,
       },
     );
     for (const [file, image] of written) {
       print(`${id}: ${describeImage(file, image)}`);
     }
     ```

   - **The closing line** counts what was kept:
     `Captured 41 of 41: wrote 2 images, kept 80.`
   - **`everyGame()`** lists the folders under `siteImagesFolder(ROOT, "")`,
     so the path is written once, in `@fz/dev`.
   - **What goes:** `SCREENSHOT_DIR`, `TARGET`, the `sharp(…).png()` write,
     the `mkdir`, the line "Run yarn build:thumbs…", and the sentence in
     `about` that says it.
   - **Comments:**
     - The header says what the script writes, where, and that it keeps no
       original.
     - `THEME`'s comment names the capture, not `build:thumbs`, as what
       finds the board by its felt.
2. **Delete** `frontend/games/solitaire/tools/build-screenshot-thumbs.mjs`,
   and the `build:thumbs` script in `frontend/games/solitaire/package.json`
   (line 14).
3. Run `git rm -r frontend/games/solitaire/docs/screenshots/`. That removes
   the 41 `overview.png` files, 20.07 MiB. The folder's other docs stay, and
   so does `.dockerignore`'s `frontend/games/solitaire/docs`.
4. **Comments:**
   - `frontend/games/solitaire/src/ui/app/styles/_tokens.scss`, line 73:
     "which `yarn capture:screenshots` writes at twice this".
   - `test/ui/app/provider/game_documentation.spec.ts` (line 6) and
     `test/ui/app/model/game_browser_item.spec.ts` (line 92): "What
     `yarn capture:screenshots` writes, …".
   - `frontend/lib/dev/src/screenshots.ts`, `SCREENSHOT_VIEWPORT`'s
     comment: "The Solitaire Collection shoots its games at its own size."
5. `frontend/games/solitaire/.agents/skills/add-solitaire-game/SKILL.md`,
   step 3 (lines 264–267): one command, `yarn capture:screenshots <id>`,
   with no second step.

**Specs:** none. The script has no spec today, and the writer it now calls
is A1's, which is specced there.

**Checks:**

1. `verify:changed`.
2. `git grep -n -e build:thumbs -e build-screenshot-thumbs -e overview.png -- . ':!docs'`
   finds nothing.
3. In the real app, with `yarn workspace solitaire dev` running:
   1. `yarn workspace solitaire capture:screenshots klondike spider freecell`
      prints all 6 images as kept, and `git status` is clean afterwards.
      This proves that the crop is unchanged (S5) and that the gate holds.
      The research measured a fresh capture's previews moving by up to 40
      levels.
   2. `yarn workspace solitaire capture:screenshots --force klondike` writes
      two images that look the same as HEAD's. Then `git checkout` them
      back.
   3. Run all 41 games once, which takes about 4.5 minutes.
      - Every image should be reported as kept. Look at any that isn't
        before committing.
      - Commit only images that changed visibly, and expect none.

**Commit:**

```text
refactor(solitaire): the capture writes the site's images itself, as every game's does, and the 41 PNG originals and build:thumbs go
```

**Rules for the review brief:** from `.agents/AGENTS.md`, "A skill, an
agent definition and an `AGENTS.md` describe code that exists.", for the
skill's step 3. The rules for the script's JSDoc and comments are in the
reviewer's definition.

### A4. Plan images (S10)

**Edit:** `.agents/AGENTS.md` gains one rule, after the bullet
"`docs/archive/` holds plans as they were built" (line 22):

> - **A picture kept with a plan under `docs/` is WebP,** lossless only
>   where it must be exact, since every version stays in history for good.
>   A "before" picture copies the committed `preview.webp` or `thumb.webp`
>   rather than taking a new capture.

- The file is 11,892 bytes, against a budget of 20,000.
- `.agents/agents/commit-reviewer.md` condenses only the file's rules for
  code, doc comments and specs, so it doesn't change.

**Checks:** `verify:changed`, which for Markdown alone runs the root's
checks.

**Commit:**

```text
docs(agents): a picture kept with a plan is WebP, and a before picture copies the committed one
```

**Rules for the review brief:** the first three rules under Agent
Configuration in `.agents/AGENTS.md`: what an `AGENTS.md` holds, what earns
a line, and its budget.

### B1. The harness reads WebP

**What it does:** S7. `@fz/phaser/testing` sizes a served WebP from its
header, as it does a PNG, so B2's pages load at their size in specs.

**Edits:**

1. `frontend/lib/phaser/src/testing/served_files.ts`:
   - **`pngSize()`** (line 238) becomes `imageSize()`. It returns the PNG's
     size as now, else the WebP's, else 0 × 0. The `src` setter (line 73)
     calls it.
   - **The WebP reader:**
     - It checks for `RIFF` at bytes 0–3 and `WEBP` at bytes 8–11, then
       reads the chunk at bytes 12–15 (§5).
     - Each form checks the length it needs first, and gives 0 × 0 for
       less: 30 bytes for `VP8X` and `VP8 `, 25 for `VP8L`.
     - `VP8L` also checks for its signature, 0x2f, at byte 20.
     - A `DataView` reads the fields, little-endian. `VP8L`'s 28 bits come
       from `getUint32(21, true)`.
   - **`installServedFiles()`'s doc comment** (line 35) says: "at the size
     its PNG or WebP header gives, or at 0 × 0 if it is neither".
2. `.agents/skills/phaser-core/SKILL.md`, line 362: "An image decodes at the
   size its PNG or WebP header gives".

**Specs,** in `frontend/lib/phaser/src/testing/served_files.spec.ts`, beside
"decodes a served image at the size its PNG header gives" (line 190). A
private helper in the spec builds each form's header byte by byte, from
§5's table:

- Each of `VP8L`, `VP8X` and `VP8 `, served at 3876 × 1260, loads with that
  `naturalWidth` and `naturalHeight`. That is the 1x page's size, whose
  14-bit fields cross byte boundaries.
- `VP8X` also loads at 4032 × 3732, the 2x page's size, and at
  65537 × 65537. Its fields hold the size less 1, so only a side of at
  least 65537 puts anything in a field's third byte.
- A `RIFF` file that isn't a WebP, and a `VP8L` header cut to 24 bytes,
  each load at 0 × 0.

**Checks:** `verify:changed`. It reaches `@fz/phaser`, and so every game
drawn with Phaser. B1 changes nothing that any game sees today.

**Commit:**

```text
feat(phaser): the test harness sizes a served WebP from its header, as it does a PNG
```

**Rules for the review brief:** from `frontend/AGENTS.md`, "Before
changing a library, read … `phaser-core` for `@fz/phaser`. A piece added
to a library, or one whose name or inputs change, changes its row in that
skill in the same change", which is why `phaser-core`'s line changes with
it.

### B2. Atlas pages as lossless WebP

**What it does:** S6. The generator writes each page as a lossless WebP,
exact in every pixel, and the pages are made again and committed once.

**Before any edit,** on the commit A3 left:

1. Make this machine's PNG pages, outside the tree:

   ```sh
   ATLAS_SCRATCH=~/Projects/personal/repo-size-2026-11-21/atlases \
     node docs/repo-size/scripts/atlases/run-generator.mjs png-before
   ```

   `ATLAS_SCRATCH` must be given. The script's default is a scratch folder
   of the session that wrote it, which may be gone.

2. Measure the build's assets as they are, for check 4:
   `yarn workspace solitaire build`, then
   `du -sb frontend/games/solitaire/dist/assets`.

**Edits:**

1. `frontend/games/solitaire/tools/card-atlas/atlas-writer.mjs`:
   - `writeAtlas()` names each page `card_assets-${index}.webp` (line 246),
     and writes it with `.webp({ lossless: true, effort: 6, exact: true })`
     in place of `.png({ compressionLevel: 9 })` (line 262).
   - `cleanOutput()` (line 223) matches
     `/^card_assets(-\d+)?\.(png|webp)$/`, so the regeneration removes the
     PNG pages.
   - The frames' in-memory `.png()` steps stay as they are.
2. `frontend/games/solitaire/src/engine/render/phaser/deck/card_deck_atlas.ts`,
   line 54: the glob ends `card_assets-*.webp`.
3. `frontend/games/solitaire/test/engine/render/phaser/scene/board_scene.spec.ts`,
   line 61: `ATLAS_PAGE` ends `\.webp$`.
4. `frontend/games/solitaire/test/engine/render/phaser/deck/card_deck_atlas.spec.ts`,
   line 170: the comment names `card_assets-0.webp`.
5. **Regenerate:** run `yarn workspace solitaire build:atlas`, which takes
   about 35 s. Then stage it all with
   `git add -A frontend/games/solitaire/src/engine/render/assets/sprites/atlas`:
   - the 24 new pages, which are 21 distinct files, since the four decks'
     2x second pages are alike;
   - the 20 manifests, of which only the `image` fields change.
     `mobile/vectors.json` names no page, and stays as it is;
   - the deletion of the 24 PNG pages.
6. `frontend/games/solitaire/NOTICE`: the six page paths (lines 45–50) end
   in `.webp`, and line 59 names `card_assets-1.webp`.

`frontend/games/solitaire/AGENTS.md`'s rule on `yarn build:atlas` doesn't
name the format, so it stays as it is.

**Checks before committing:**

1. **The same pixels.**
   - Write `docs/repo-size/scripts/atlases/check-webp-pages.mjs`. It
     decodes each of the 24 new pages, and its PNG from the scratch run,
     with sharp's `ensureAlpha().raw()`, and compares the RGBA.
   - Its output goes in `data/atlases/check-webp-pages.txt`.
   - All 24 must be identical.
   - Against HEAD's committed PNGs, expect only the 6 pages the research
     found to differ by platform, in the same few corner pixels
     ([`compare-local-runs.txt`](data/atlases/compare-local-runs.txt)).
2. **The size.** The 21 distinct pages come to about 9.17 MiB.
3. **The same drawing.**
   - With `yarn workspace solitaire dev` running,
     `capture:screenshots klondike spider freecell` prints every image as
     kept. WebGL draws a lossless WebP the same as the PNG
     ([`phaser-webp-check.txt`](data/atlases/phaser-webp-check.txt)).
   - In a browser, choose each of the four decks in Settings, and look at
     a deal at a roomy size and as a phone. No card is missing, and the
     console shows no error. "Atlas page not found" is what a glob that
     misses throws.
   - The Solitaire Collection has no layout check, so this look in a
     browser stands in for one.
4. **The build.**
   - `frontend/games/solitaire/dist/assets/` holds 21 `card_assets-*.webp`
     files with hashed names, and no `card_assets-*.png`.
   - `du -sb` of `assets/` is about 7.4 MiB less than step 2 measured
     before the edits.
5. `verify:changed`.

**Commit:**

```text
perf(solitaire): the card atlas pages are lossless WebP, half the bytes and the same pixels
```

`check-webp-pages.mjs` and its output go in the same commit, under
`docs/repo-size/`.

**Rules for the review brief:**

- From `frontend/games/solitaire/AGENTS.md`: "Run `yarn build:atlas` and
  commit what it writes…" and "No spec sees a blurred card…".
- From `frontend/games/AGENTS.md`: "Minesweeper and the Solitaire
  Collection have none: look at their pages yourself, roomy, as a phone
  held upright and as one on its side."
- From `frontend/AGENTS.md`: "Look at a UI or behavior change in the
  running page…".

---

## 7. Running the build

- **One session builds A and B,** in §6's order, on the `repo-size-plan`
  branch.
  - They are about a dozen files each, and most of the time goes into the
    checks.
  - Only the reviews run as agents. No workflow and no worker agents are
    needed.
- **The `multi-agent-build` skill isn't used.** Its packages are three to
  nine commits each, and these six are one commit each. A on one branch
  and B1 on another, with B2 after both, would save little.
- **Another session may be building at the same time.**
  - `verify:changed` waits for other runs by itself.
  - `verify:full` doesn't, so run it only once no other session is
    checking.
- **Where the build stops for the user:**
  1. After A1–A4: the report, and the merge if the user wants A live
     before B.
  2. After B1–B2: the report and the merge.
  3. D5, once both are live.
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
   branches. None was open on 2026-11-21, when this was last checked.
   `gh pr list -R fuzzley/fuzzley-games --state open` must list none on
   the day, or each is closed and its branch deleted at C6.
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
(cd frontend && npx -y corepack yarn install --immutable)
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
  and no line's formatting changes.
- Run `npx -y corepack yarn verify:changed` from `frontend/`. For Markdown
  alone it runs the root's lint, Prettier and typecheck, which check the
  docs' links and paths.
- Commit as `docs: name the commits as the rewritten history has them`,
  and push it to `main` (Verify only lints docs). It is one change with
  nothing to do while it is reviewed, so the review takes
  `commit-review-process`'s short way: the staged change, reviewed in the
  foreground, before the commit.
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
node .agents/link-claude-skills.mjs --also-in ~/Projects/personal
(cd frontend && npx -y corepack yarn install --immutable)
```

- `--also-in` links the agent definitions into `~/Projects/personal/.claude/`
  too, as sessions start there. Without it, `commit-reviewer` isn't
  offered.
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
skill), and each package's own checks in §6.

**What each package adds to history** is measured on its branch, before
the push, two ways:

```sh
# What a push sends, compressed and as deltas: near enough what history
# grows by.
printf '%s\n' HEAD ^origin/main | git pack-objects --revs --thin --stdout -q \
  | wc -c | awk '{ printf "%.2f MiB packed\n", $1 / 1048576 }'
# Every new blob at its full size, before compression.
git rev-list --objects origin/main..HEAD \
  | git cat-file --batch-check='%(objecttype) %(objectsize) %(rest)' \
  | awk '$1 == "blob" { s += $2 } END { printf "%.2f MiB raw\n", s / 1048576 }'
```

For a single commit, use `<sha> ^<sha>~1` in the first command and
`<sha>~1..<sha>` in the second. Both were checked on the 39 commits from
b67c3c01 to ba66e77d, which give 0.32 MiB packed and 3.36 MiB raw.

| Package | Packed          | Raw             | What it is                                                                                |
| ------- | --------------- | --------------- | ----------------------------------------------------------------------------------------- |
| P0      | 0.32 (measured) | 1.06 (measured) | text                                                                                      |
| A1–A4   | under 0.1       | under 0.4       | new versions of about 20 text files, 0.2 MiB at full size, and deletions, which add none  |
| B1      | under 0.02      | under 0.05      | two source files and a skill                                                              |
| B2      | about 9.2       | about 9.6       | 9.17 of WebP pages, which barely compress, and 0.41 of manifests, which delta to almost 0 |

**After C:** a fresh clone's `git count-objects -vH` shows `size-pack`
near 59 MiB. `gh api repos/fuzzley/fuzzley-games --jq .size` is recorded
the day after and a week after, since GitHub doesn't say when it
recomputes.

**Kept in mind throughout:**

- The site's checks (`checkGameImages()`) and the Solitaire Collection's
  image specs must still pass after A. They read `thumb.webp` and
  `preview.webp`, which A keeps.
- Lint's reference check fails a skill or an `AGENTS.md` that names, in
  backticks, a path a package deletes. Today that is only the
  `add-solitaire-game` skill's step 3, which A2 and A3 rewrite. The docs
  under `docs/` aren't checked, so §6's `git grep` lines check those.

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

- **P0, done on 2026-11-21.**
  - The folder went to `main` as b67c3c01, without the two sample sheets,
    and Prettier and `yarn lint` passed on it.
  - Verify run 44943520092 passed, and `promote` moved `live` to the same
    commit.
  - It added 0.32 MiB packed (1.06 MiB raw), within its 2 MiB.
  - The backup mirror, `~/Projects/personal/fuzzley-games-backup.git`, was
    made at b67c3c01, with its push URL disabled. It held 2 heads, 4
    Dependabot branches and 37 `refs/pull/*`, in 301 MB.
- **The plan checked against `main` at ba66e77d, on 2026-11-21.**
  - The 39 commits since b67c3c01 cut every `AGENTS.md`, deleted the
    `solitaire-build` and `solitaire-phaser` skills, and changed how a
    commit is reviewed. None of them touched the code §6 changes, so its
    edits held. These changed:
    - **The doc steps.** The `AGENTS.md` sections they named, on the
      screenshots, Capture Screenshots and Build Screenshot Thumbnails,
      are gone, and an `AGENTS.md` now holds rules, not descriptions. So
      A1 puts what the gate does in `screenshots.ts`'s doc comments, and
      adds one rule to `frontend/games/AGENTS.md`, on `--force`. A2 and A3
      edit no `AGENTS.md`. A4's rule moves to sit beside the one on
      `docs/archive/`, as Writing Documentation now covers only doc
      comments.
    - **Line numbers.** `phaser-core`'s line on the PNG header moved from
      496 to 362, and the `add-solitaire-game` skill's step 3 is now at
      lines 264–267.
    - **The review.** Each commit is made first, and a `commit-reviewer`
      reviews it in the background. The answers go in `amend!` commits,
      folded in before the merge (§6.0). `verify:changed` now runs the
      root's lint too, and waits for other runs.
    - **Steps that would have failed as written:**
      - A2's `git grep` would have found `overview.webp` in
        `screenshots.spec.ts`, so A1 renames that spec's file.
      - A1 changes the request and usage, which four existing specs check
        exactly.
      - B1 also changes `installServedFiles()`'s doc comment, which names
        the PNG header.
      - B2's first check needs `ATLAS_SCRATCH`, since
        `run-generator.mjs` defaults to the scratch folder of the session
        that wrote it.
    - **Smaller fixes:**
      - `WrittenImage` is a union, so a kept image always has `moved`.
      - §9 measures packed size as well as raw.
      - C10 links the agent definitions with `--also-in`.
      - No pull request is open (§8).
