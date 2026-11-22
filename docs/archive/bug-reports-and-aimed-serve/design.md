# Report a bug in every game, and an aimed serve in Brick Breaker

Written 2026-11-22, and built the same day: [As built](#as-built-2026-11-22)
says what the build decided. Two asks:

1. **Report a bug, everywhere.** Lift the Solitaire Collection's bug reporter
   into the shared libraries, add it to the other six games, have each attach
   everything a developer needs to put the game back exactly as the player saw
   it (in the same `<tag>.` + base64url(gzip(JSON)) form Solitaire uses), and
   attach a picture of the page if that can be done. It can (§1.4).
2. **Aim the serve in Brick Breaker.** Players asked to aim the ball as it
   first leaves the paddle. §2 designs the controls, the guide, the words and
   the rules, after Brick Fuzz Pop's aiming.

[`implementation-plan.md`](implementation-plan.md) splits both into packages
for several agents to build at once. `mocks/` holds the pictures of the aimed
serve, drawn over real captures of the game, and the scripts that draw them.

Paths are relative to `frontend/` unless they start with `docs/` or `.github/`.

---

## As built (2026-11-22)

Built on 2026-11-22 to [`implementation-plan.md`](implementation-plan.md), on
`bug-reports-and-aimed-serve`, cut from `main`, by packages in worktrees of
their own, each commit reviewed, each package landed by a rebase and a
fast-forward. The owner took the design's picks for D1 to D8, and for D9 its
other way: the build ran at once. The sections below describe the code as it
was planned, so check a path against the tree before following one.

What the build decided that the sections below don't say:

- **The shared pieces** keep §1.5's names. `@fz/game-ui/bug_report` holds
  the codec, which gains `packedTag()`; the tokens; `BugReportService`, its
  `report` an `OpenReport`, its `issueUrl(state)` what a game's spec
  measures its largest state with; `<fz-bug-report-dialog [touch]>`;
  `<fz-report-bug-button (chosen)>`; and `<fz-bug-report-loader (loaded)>`,
  which shows a line of the game's own under its field. Save picture offers
  the share sheet on a touch screen only. `@fz/game-ui/testing` gains
  `installCompressionStreams()` and `provideReportPicture()`, which each
  game's spec setup provides. `tools/check-report.mjs` checks each game's
  report end to end.
- **Each game's state,** under §1.3's tag: its summary; its trim; its
  largest likely link, of 6,000 characters.
  - Solitaire: "Score 35 · 12 moves"; the undo history, newest kept; Spider
    after 1,000 moves keeps 343, at 5,987. Its title is its build's
    `game.json` name, `[Solitaire Collection] `.
  - Snake: the score, the steps and where the run stands; none; a run won on
    the full board, 1,778.
  - Minesweeper: "In play · 0:42 · 3 of 3 lives · 2 mines left"; none; a
    30 × 30 field of 891 mines, 3,644.
  - Sudoku: "In play · 12:34 · 30 blank squares · 2 hints · Notes on"; the
    history, newest kept; 1,200 expert moves keep 897, at 5,999. §1.6 has
    `restoreGrid()` wrong: it takes a solved grid, and the saved game's
    restore is what refuses one.
  - Brick Breaker: "Level 3 · Score 0 · 3 lives · 1 ball in play"; the moment
    dropped, "bricks only"; 4,269.
  - Asteroid Breaker: "Wave 3 · Score 800 · 3 following · Paused"; the
    sparks and shots, then the moment; 5,949 on the widest field, its
    numbers cut to a thousandth.
  - Brick Fuzz Pop: "Level 1 · 2 shots · Score 40 · 13 rows · shot in the
    air"; the level's shots, then the shot in the air; 2,108.
- **The picture** is snapdom 3.8.1's: modern-screenshot waited 33 s a
  picture on the Solitaire Collection's hidden thumbnails
  ([`spike/`](spike/)). `@fz/ui/capture` loads it by a dynamic `import()`
  behind `PAGE_DRAWER`, a chunk of 111,188 B gzipped; the capture service
  added 1,105 B gzipped to Snake's main chunk. A board's frame, from
  `PhaserHost.frame()`, is laid as the background of its element's copy,
  since snapdom drew an image of it blurred. Every `<dialog>` and each
  `CAPTURE_SKIP`, the four Paused cards, is left out, and the browser
  encodes the PNG.
- **The picture's time,** from the press to the dialog with its picture,
  the second and third reports on a page at 1× (the first loads snapdom):
  Sudoku 153 to 196 ms, Snake 164 to 197, Minesweeper 184 to 219, Brick
  Fuzz Pop 263 to 282, Brick Breaker 376 to 390, Asteroid Breaker 567 to
  615, and the Solitaire Collection 655 to 746, its first 1,153. At 2×,
  headless Chrome's software compositing about doubles the canvas games',
  and the Solitaire Collection's first took 3,077 ms. The page's PNG is
  encoded with `toDataURL()`, not `toBlob()`, which Chrome starts only in
  an idle period, and a page that draws every frame never has one: 1,081
  ms there against 53. Its size at 1280 × 720, at 1× and 2×: Snake 69 and
  70 KB, Minesweeper 75 and 75, Sudoku 95 and 94, Brick Fuzz Pop 133 and
  136, Brick Breaker 203 and 202, the Solitaire Collection 289 and 340,
  Asteroid Breaker 613 and 420. `tools/check-report.mjs` marks a report
  over a second or a picture over 300 KB, and fails neither.
- **The aimed serve** keeps §2.3.5's names: `serveAim()`, `serveBall()` held
  within `AIM_MOST`, `faceServe()` for the eyes, `firstContact()` and
  `mirrorTurn()` shared with `travel()`, `serveGuide()`, `GuidePainter`,
  `GameService.aiming`, and the scene's `mayAim` option. Every number in
  §2.3.4's table is the code's, and `AIM_MOST` stays apart from
  `PADDLE_ANGLE`, so tuning one leaves the other. A launch with no aim
  serves as before: `yarn report:levels` printed the same bytes. How to
  play's words follow the word list: "Hold Space, then hold ← or →", and "To
  cancel, drag back to where you started, right-click or pause." The
  guide's first outline, in the text's ink, fell under 3:1 on many bricks
  in the dark palettes, so the build ringed it in the palette's outline
  color, 3:1 against every brick.
- **Departures the owner should know of:**
  - Brick Fuzz Pop's report dialog loads eagerly: by `onDemand()`, it had
    Rolldown split the main chunk into seven, 138.15 kB gzipped against
    137.29 kB with the dialog in it. The first download grew 4.44 kB gzipped.
  - The Solitaire Collection's debug rules, such as Almost Win Mode, come
    only in a development build: one chosen at `?debug` stayed in force
    once the address dropped it.
  - Asteroid Breaker loads a report taken before a first wave as the run's
    start (`GameService.startReported()`), refuses one filed after a game
    over, and leaves the page's settings as they are, since a load would
    store the report's.
  - Every game asks "Load this game?", Solitaire's words, before a reported
    game replaces one in progress, and closes its settings once one loads.
- **Left for the owner at the merge:** what only hands and devices can
  judge (the plan's §7): Save picture and the Screenshot field on an iPhone
  and an Android phone; a paste after Open GitHub in desktop Safari and
  Firefox; the aim by mouse, touch and keys, whether a finger meant to
  steer ever aims, and §2.3.4's numbers on real screens; a report filed for
  real and loaded back. Then what the build found and left: the picture
  over §1.4.1's 300 KB for Asteroid Breaker, at 1× and 2×, and for the
  Solitaire Collection at 2×, Asteroid Breaker's because Chrome dithers its
  backdrop's washes (`wash()` in `@fz/phaser/shapes`, drawn as radial
  gradients) into noise PNG can't shrink; reports over a second at 2× in
  the canvas games and the Solitaire Collection, and the Solitaire
  Collection's first at 1×, which a phone should judge, since headless
  Chrome composites in software;
  Snake's bar showing Best 0 beside a reported New best; the Solitaire
  Collection's waste fan off after a load and its clock restarting, both
  older than the build; a report trimmed to its bricks keeping the player's
  Custom speed in Brick Breaker; and shared pieces the reviews named for
  later: one `untrustedPart()` reader, a choice's name lookup in
  `@fz/ui/radio_group`, one load question in `@fz/game-ui/run_lifecycle`,
  `onWholePixels()` in `@fz/phaser`, and Minesweeper's `sizeFrom()`,
  written twice.

---

## Decisions for you

Each has the design's pick first. The build goes on with the pick unless you
choose otherwise.

| #   | Decision                                        | The design's pick                                                                                                      | The other way                                                                                    |
| --- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| D1  | How the picture reaches the report              | **The player pastes or attaches it:** copied as GitHub opens with a mouse, saved first on a phone. Nothing is uploaded | Upload to a host of our own or a third party's: needs a backend, a privacy notice and moderation |
| D2  | Solitaire's report goes through the new dialog  | **Yes**: one more click, and the picture with it                                                                       | Keep its straight-to-GitHub link, and no picture for Solitaire                                   |
| D3  | One issue form or one per game                  | **One shared form**, `game_bug_report.yml`, the title prefilled `[Snake] ` and so on; Solitaire's form retires         | A form per game, so each can carry a label of its own                                            |
| D4  | Where "Report a bug" sits                       | **In every game's Settings drawer**, as Solitaire has it; Solitaire keeps its bar button too                           | Also in each game's overflow menu, which compact screens show; bars and their specs change       |
| D5  | Who can load a reported state                   | **Development builds, and the live site at `?debug`**, as each game's debug menu is offered                            | Development builds only, as Solitaire's panel is today                                           |
| D6  | How the serve is aimed with a mouse or a finger | **Press and drag the way you want the ball to go, then let go**                                                        | Hold, then move left and right to tilt (a finger must hold still first, which fights steering)   |
| D7  | Whether a caught ball can be aimed too          | **Not yet**: the serve only, as asked. A caught ball leaves by where it landed, as now                                 | Aim every ball let go from the paddle                                                            |
| D8  | How far an aim may lean                         | **60° either way**, as far as the paddle's ends send a ball                                                            | 70°, the flattest a ball ever travels                                                            |
| D9  | When to run the build                           | **After the week's limit resets** (Wed Nov 25, 02:00 UTC): about 59 commits, about 35% of a week; 50% is used now      | Now, with 3 workers, stopping any new package once the week passes 85%                           |

---

## 1. Report a bug in every game

### 1.1 What Solitaire did before

The shared reporter replaced all of this, and the paths below are those of
before.

- **Where:** a bug button in Solitaire's own header
  (`games/solitaire/src/ui/app/component/header_bar/`), an item in its compact
  menu, and a "Found a problem? Report a bug" link in its own settings drawer.
- **What it opens:** GitHub's new-issue page in a new tab, the form
  `.github/ISSUE_TEMPLATE/solitaire_bug_report.yml` prefilled through the
  link's query: `game` ("Klondike · Draw Mode: Draw 3"), `environment` (build,
  browser, window and pixel ratio, cards, theme, as a Markdown list) and
  `game-state`. The player writes "What happened?" and the steps.
- **The game state:** `fs1.` + base64url(gzip(JSON of `{gameId, options,
snapshot}`)) (`src/ui/app/model/game_position.ts`), under a summary line,
  in a code block. As much of the undo history as fits keeps the link under
  6,000 characters (GitHub fails a signed-out visitor's link near 7,000), found
  by a binary search; with no room even for the board, the field says so.
- **Loading it back:** a development build's debug panel takes the pasted
  field (the summary and code fences may stay), checks the game and its rules
  exist, asks before losing a game in progress, and puts the game on the table
  (`GameLifecycleService.loadPosition()`).
- **The commit** comes from `VITE_COMMIT_SHA`, a define of Solitaire's own;
  every other game reads `BUILD_INFO` (`@fz/game-ui/build_info`), the stamp
  `gameConfig()` writes into the page.
- **What it lacks:** a picture, and anything any other game could reuse:
  every piece is Solitaire's own service, provider and model.

### 1.2 What the player sees

1. **Settings → Report a bug.** A row near the foot of every game's drawer,
   above the build line: "Found a problem?" over a **Report a bug** button
   (D4). Solitaire keeps its bar button, which now does the same.
2. **The drawer closes, and the game is taken as it stands:** its state at
   once, then a picture of the page as the player left it (§1.4), which takes
   a fraction of a second. Nothing has left the device.
3. **The Report a bug dialog** (`<fz-dialog>`):

   ```text
   With a mouse                              On a touch screen
   ┌────────────────────────────────────┐    ┌────────────────────────────┐
   │ Report a bug                    ✕  │    │ Report a bug            ✕  │
   │ ┌────────────────────────────────┐ │    │ ┌────────────────────────┐ │
   │ │  (the picture, scaled to fit)  │ │    │ │     (the picture)      │ │
   │ └────────────────────────────────┘ │    │ └────────────────────────┘ │
   │ GitHub opens in a new tab with     │    │ Save the picture, then     │
   │ this game filled in. The picture   │    │ open GitHub and add it     │
   │ is copied, so paste it under       │    │ under Screenshot.          │
   │ Screenshot.                        │    │                            │
   │                                    │    │ [ Save picture ]           │
   │ [ Save picture ] [ Open GitHub ↗ ] │    │ [ Open GitHub ↗ ]          │
   └────────────────────────────────────┘    └────────────────────────────┘
   ```

   - **Open GitHub** is a link, opened in a new tab as Solitaire's drawer
     opens its own, so no pop-up blocker stands in its way. With a mouse,
     its click copies the picture as GitHub opens (§1.4.2).
   - **Save picture** offers the share sheet where the browser shares files,
     as phones do, else downloads it.
   - Where no picture could be taken, the picture and Save picture are left
     out, and the words say only what opens.
   - Closing the dialog goes back to the game as it was, paused in the four
     games that pause.

4. **GitHub** shows the shared form (D3): the title `[Brick Breaker] `, Game,
   Environment and Game state filled in, and a Screenshot field that takes the
   pasted or attached picture.

The words follow the `player-text` skill: a button is a verb first, a notice is
a flat fact, and the dialog's body two sentences. A worker reads the skill
again before writing them.

### 1.3 What a report carries

**Game** (one line, the game's own): `Brick Breaker · Normal · Level 9:
Rocket`, `Sudoku · Expert`, `Klondike · Draw Mode: Draw 3`.

**Environment** (a Markdown list, built by the shared service, with the game's
own settings after it):

- Build: the commit and its build time (`BUILD_INFO`)
- Browser: the user agent
- Window: 1280×720 at 2× pixel ratio
- Screen: roomy or compact, upright or on its side, the bar's placement, touch
  or not (`GameViewportService`)
- Motion: full or reduced
- Theme: the palette's id
- Then each of the game's settings, `- Speed: Normal`, as the game words them

**Game state:** a summary line, then the packed state in a code block:

````text
Level 9 · Score 950 · 2 lives · ball in play

```
bb1.H4sIAAAAAAAAA6tWKkktLlGyUlAqS8wpTVWqBQAJbGzFEQAAAA
```
````

- **The packed form is Solitaire's, shared:** `<tag>.` + base64url, unpadded,
  of the gzipped JSON. Each game has its own tag, two letters and a version:

  | Game             | Tag   |
  | ---------------- | ----- |
  | Solitaire        | `fs1` |
  | Snake            | `sn1` |
  | Minesweeper      | `ms1` |
  | Sudoku           | `sd1` |
  | Brick Breaker    | `bb1` |
  | Asteroid Breaker | `ab1` |
  | Brick Fuzz Pop   | `bp1` |

  Solitaire keeps `fs1`, so every report already filed still loads. A game
  whose state changes shape takes the next number (`bb2`), and a build that
  reads `bb1` says plainly that a `bb2` state is from a newer build, rather
  than failing on its contents.

- **It holds what the game needs to put back exactly what the player saw,** not
  only what the game saves. Every game's saved game leaves things out on
  purpose: Brick Breaker's has no ball, Asteroid Breaker's no shot, comet or
  ship's speed, Brick Fuzz Pop's lands any flight first, Minesweeper's and
  Sudoku's are removed once the game ends. So a report reads the live game,
  never storage (§1.6 per game).
- **It fits the link the way Solitaire's does.** A game whose state can grow
  (an undo history, a level's shots, the live objects of a field) offers it in
  parts, and the shared service keeps as many as fit, by the same binary
  search, noting in the summary what it left out ("12 of 40 undo steps",
  "without the shots in flight").
- **It is the build's own.** A state names level ids, rules and catalog
  entries of the build that made it. Loading one into another build may fail
  where a level was redrawn, and says which part.

### 1.4 The picture: feasible, and how

**Verdict: feasible, with the player in the loop.** A static site can't attach
an image to a GitHub issue: the new-issue link takes text only, GitHub doesn't
render `data:` images in an issue, and there is no server to upload to (D1). So
the game takes the picture, shows it, and hands it to the player, who pastes or
attaches it. The research behind this is in §1.4.4.

#### 1.4.1 Taking it

- **When:** as the report starts, after the drawer has closed (two animation
  frames, so its `<dialog>` has left the top layer) and before the report's
  own dialog opens. The page is still in view, so a canvas still draws; once
  GitHub's tab opens, the page is hidden, frames stop, and Brick Fuzz Pop even
  lands a flight in the air.
- **What:** the page as the player saw it: the bar, the board and its panels.
  Left out: every open `<dialog>` and anything marked
  `data-fz-capture="skip"`, which Snake, Brick Breaker, Asteroid Breaker and
  Brick Fuzz Pop put on their Paused cards, since pausing is the report's
  doing, not something the player saw. Minesweeper, Sudoku and Solitaire
  have no Paused card and mark nothing. The Ready,
  Cleared and Game over cards stay.
- **At CSS pixel size** (one image pixel to a CSS pixel), so a 1280×720 window
  makes a picture of 1280×720 however dense the screen, a PNG of about 80 KB
  in the test below (§1.4.4), held under 300 KB.
- **A board drawn on a canvas** gives its own frame. A WebGL canvas keeps its
  pixels only during the frame that drew them (no game sets
  `preserveDrawingBuffer`, and none should: it costs every frame on a phone).
  So `@fz/phaser`'s host copies its canvas into a 2D canvas at the next
  `POST_RENDER`, inside the frame, and hands that copy over. Every canvas
  board registers itself with the page's capture as it starts, so a game adds
  nothing.
- **The rest of the page** is drawn by a DOM-to-image library, loaded only
  when a picture is taken, with each registered canvas swapped for an image
  of its frame in the copy of the page it draws, so a card over the board
  stays over it. §1.4.4 names the library.
- **It gives up quietly:** after 3 seconds, or on any error, the dialog opens
  without a picture.

#### 1.4.2 Handing it over

- **With a mouse and keyboard, Open GitHub copies the picture as it opens
  GitHub.** In the link's click handler, before the browser follows the link,
  `navigator.clipboard.write([new ClipboardItem({ "image/png":
Promise.resolve(png) })])`, built and called synchronously: Safari refuses a
  write after any `await` in the gesture, and opening a tab uses the gesture
  up. The PNG was made before the dialog opened, so nothing waits. The player
  pastes it into the form's Screenshot field with Ctrl+V or ⌘V.
- **On a touch screen, Save picture comes first:** where
  `navigator.canShare({ files })` says yes, the share sheet, whose "Save Image"
  puts it in the photos; elsewhere a download, `<game>-bug.png`. Sharing uses
  the tap up too, so it can't share one with opening GitHub: two buttons, two
  taps. The player attaches the picture from their photos in the form.
- **Save picture is offered everywhere,** for a browser that refuses the
  clipboard or a player who'd rather keep a file.
- **Where the copy fails** (the browser says no), GitHub still opens, and the
  dialog, still open behind it, says "Couldn't copy the picture" over Save
  picture.
- **The form gains a Screenshot field** (`type: upload`, id `screenshot`,
  images only), new to GitHub's issue forms this year and still a public
  preview: it takes a paste, a drop or a file. Nothing can prefill it. If
  GitHub withdraws it, "What happened?" takes a pasted image as it does today.

#### 1.4.3 Privacy

The picture shows only the game's page, and the player sees it before anything
else happens. It goes nowhere unless the player pastes or attaches it in the
issue. The dialog's words say it is copied, and Save picture is there for a
player who'd rather not. Nothing in the game uploads anything.

#### 1.4.4 What the research found

Researched 2026-11-22, with tests in headless Chrome where marked.

- **GitHub's link carries text only.** Its documented query keys are `title`,
  `body`, `labels`, `milestone`, `assignees`, `projects`, `template` and an
  issue form's field ids. Signed out (tested), a 6,055-character link still
  reached the sign-in page, one from about 6,755 failed there, and from 8,205
  GitHub answered 414: the 6,000 Solitaire keeps to is about the most a
  signed-out player can use. GitHub's Markdown strips `data:` images (tested),
  so even a small picture can't ride in a field.
- **An issue form's `upload` field** (public preview since 2026-03-05) takes
  png, jpg, gif, svg or webp up to 10 MB. Its prefill isn't documented.
- **Writing a PNG to the clipboard** works in Chrome 76+ (desktop) and 84+
  (Android), Firefox 127+, and Safari 13.1+ (macOS and iOS), one item a write,
  from a user's gesture. Safari's write fails after any `await` in the gesture
  (WebKit bug 222262, open). Chromium checks focus only as `write()` is
  called, and a write survives losing focus 300 ms later; WebKit and Firefox
  check the gesture at the call. No source covers `window.open` straight after,
  so the build checks it in each browser it can reach.
- **Pasting an image into GitHub's form on a phone** isn't documented either
  way. Attaching from the photo library through the form's file picker is how
  iOS and Android file inputs work. A device test belongs to the build's
  finish.
- **Sharing files** (`navigator.share({ files })`) works in Chrome on Android,
  Safari 14+ on macOS and iOS, and Chrome on Windows, ChromeOS and (since 128)
  macOS; Firefox shares no files. `<a download>` works on iOS 13+, into Files.
- **The libraries** that draw a page into an image:

  | Library           | Version, date     | Size, gzipped | Fits here                                                                          |
  | ----------------- | ----------------- | ------------- | ---------------------------------------------------------------------------------- |
  | modern-screenshot | 4.7.0, 2026-04-16 | 9.7 KB        | Small, MIT; a clone hook (`onCloneEachNode`) to swap a canvas for its frame        |
  | @zumer/snapdom    | 3.8.2, 2026-11-21 | 114 KB        | Most active; emulates `backdrop-filter`; draws top-layer dialogs; embeds web fonts |
  | html-to-image     | 1.11.13, 2025-02  | 5.3 KB        | No release in 21 months                                                            |
  | html2canvas-pro   | 2.6.4, 2026-11-11 | 67 KB         | Repaints rather than clones; draws a WebGL canvas blank                            |

  All four are MIT. Each draws a WebGL canvas blank, or waits for a frame it
  can't be sure of, so the board's frame is handed in by its host either way.
  The report's picture leaves dialogs out, so snapdom's best feature isn't
  needed; its glass is. **The pick is modern-screenshot,** a tenth the size,
  unless the build's first commit, which draws Brick Breaker, Sudoku and the
  Solitaire Collection with both, finds it drawing one wrong; then snapdom.
  Either is loaded only as a picture is taken.

- **Phaser 4's frame** (tested in headless Chrome 157, `preserveDrawingBuffer`
  off): `canvas.toBlob()` from a timer gave black; inside
  `game.events.once("postrender", …)` it gave the frame, as did
  `renderer.snapshot()`, which reads and flips the pixels in JavaScript and
  blocks. Copying the canvas into a 2D canvas in `postrender` is cheaper still.
  Phaser pauses its loop while the page is hidden, so a frame must be taken
  before GitHub's tab opens.
- **Sizes** (tested, 1280×800 at 1×): PNG about 80 KB, WebP about 15 KB.
  Phones at 2× to 3× would make 4 to 9 times the pixels, which is why the
  picture is taken at CSS pixel size. Safari can't encode WebP, and the
  clipboard takes PNG only, so the picture is a PNG throughout.
- **The Content Security Policy** covers the site's own pages, not the games
  under `/play/`, so a picture needs no change to it. The build checks this in
  the image, as `.agents/AGENTS.md` asks.

### 1.5 The shared pieces

The libraries' rules decide where each goes: `@fz/ui` for every Angular app,
`@fz/game-ui` for the games' chrome, `@fz/phaser` for canvas boards. Not
`@fz/core`, which keeps to "no framework and no platform", where the codec's
gzip is the platform's `CompressionStream`; and a game's rules never pack a
report, its shell does.

**`@fz/game-ui/bug_report`'s `packed.ts`** (new): the codec, moved out of
Solitaire's engine. It imports no Angular, so `tools/read-report.mjs` imports
the file itself.

```ts
/** Encodes bytes as unpadded base64url. */
export function encodeBase64Url(bytes: Uint8Array): string;
/** Decodes base64url, padded or not. @throws Error if it isn't base64url. */
export function decodeBase64Url(text: string): Uint8Array<ArrayBuffer>;
/** Gzips bytes with the platform's CompressionStream. */
export function gzip(
  bytes: Uint8Array<ArrayBuffer>,
): Promise<Uint8Array<ArrayBuffer>>;
/** Gunzips bytes, or returns null once past `maxBytes`. */
export function gunzip(
  bytes: Uint8Array<ArrayBuffer>,
  maxBytes?: number,
): Promise<Uint8Array<ArrayBuffer> | null>;
/** Packs a value as `<tag>.` and the base64url of its gzipped JSON. */
export function packState(tag: string, value: unknown): Promise<string>;
/**
 * Finds the state packed under a tag in a piece of text, such as a report's
 * whole game-state field, and returns its JSON parsed, still unchecked.
 * @throws Error saying what is wrong: no state, another game's, a newer
 *   version's, corrupt, or too large to unpack.
 */
export function unpackState(
  tag: string,
  text: string,
  maxBytes?: number,
): Promise<unknown>;
```

**`@fz/ui/capture`** (new): a picture of the page.

```ts
/** Describes a part of the page drawn on a canvas, which gives its own frame. */
export interface CaptureSurface {
  readonly element: HTMLElement;
  /** Returns a copy of what it last drew, taken in a frame, or null. */
  frame(): Promise<CanvasImageSource | null>;
}
/** The attribute that leaves an element out of a picture: `data-fz-capture="skip"`. */
export const CAPTURE_SKIP: {
  readonly name: "data-fz-capture";
  readonly value: "skip";
};
@Injectable({ providedIn: "root" })
export class PageCaptureService {
  /** Adds a canvas the picture takes from its own frame, and returns what removes it. */
  register(surface: CaptureSurface): () => void;
  /** Takes a PNG of the page as it shows, at CSS pixel size, or null. */
  capture(options?: { readonly timeoutMs?: number }): Promise<Blob | null>;
}
```

**`@fz/phaser`:** `PhaserHost.frame()` copies the canvas at the next
`POST_RENDER`; `PhaserCanvasComponent` registers a `CaptureSurface` with
`PageCaptureService` once its host starts, and removes it as it ends.

**`@fz/game-ui/bug_report`** (new): the reporter.

```ts
/** Says where reports are filed. */
export interface BugReportConfig {
  readonly newIssueUrl: string; // the fuzzley-games repository's issues/new
  readonly template: string; // "game_bug_report.yml"
  readonly maxUrlChars: number; // 6000
}
export const BUG_REPORT_CONFIG: InjectionToken<BugReportConfig>;

/** Describes a game's state for a report, and how it shrinks to fit the link. */
export interface ReportState {
  /** One line for people: "Level 9 · Score 950 · 2 lives". */
  readonly summary: string;
  readonly value: unknown;
  /**
   * Smaller states for a link with no room for the whole: `at(kept)` keeps
   * `kept` of `most` parts, the most useful first, and says what it left
   * out. Left out where the state can't shrink.
   */
  readonly trim?: {
    readonly most: number;
    at(kept: number): { readonly value: unknown; readonly note: string };
  };
}

/** Says what a game puts in its reports, and how it takes one back. */
export interface BugReportSource {
  /** The game's name, which the issue's title starts with: "[Snake] ". */
  readonly title: string;
  /** The tag its state is packed under: "sn1". */
  readonly tag: string;
  /** Describes the game in play in one line. */
  game(): string;
  /** Returns the game's settings for the Environment list, "Speed: Normal". */
  settings(): readonly string[];
  /** Takes the game's state as it stands, at once. */
  capture(): ReportState;
  /**
   * Puts a reported state in play, paused, asking first where a game in
   * progress would be lost; resolves to whether it did.
   * @throws Error naming the part that doesn't fit this build.
   */
  load(state: unknown): Promise<boolean>;
}
export const BUG_REPORT_SOURCE: InjectionToken<BugReportSource>;

/** Takes the report's picture: `PageCaptureService.capture()`, or a spec's own. */
export const REPORT_PICTURE: InjectionToken<() => Promise<Blob | null>>;

/** An open report: the issue's title, its finished link, and its picture. */
export interface OpenReport {
  readonly title: string;
  readonly url: string;
  readonly picture: Blob | null;
}

@Injectable({ providedIn: "root" })
export class BugReportService {
  /** Whether a report is open, and what it holds, for the dialog. */
  readonly report: Signal<OpenReport | null>;
  /** Takes the game and its picture, then opens the dialog. */
  start(): Promise<void>;
  /** Returns the issue's link for a state, fitted to the link. */
  issueUrl(state: ReportState): Promise<string>;
  /** Loads a pasted state. */
  load(text: string): Promise<boolean>;
  /** Closes the dialog. */
  close(): void;
}

/** One per app, in its root template, as <fz-confirm-dialog />. */
/** Its `touch` input, required, is the app's `isTouchScreen()`. */
export class BugReportDialogComponent {} // <fz-bug-report-dialog [touch] />
/** "Found a problem?" and its button; the shared drawer shows it where a source is provided. */
/** Emits `chosen` for its drawer to close, then calls `start()`. */
export class ReportBugButtonComponent {} // <fz-report-bug-button (chosen) />
/** Pastes a state in and loads it; emits `loaded`. Shown only at DEBUG_MENU. */
export class BugReportLoaderComponent {} // <fz-bug-report-loader />
```

- `fz-settings-drawer` shows `<fz-report-bug-button>` above `<fz-build-info>`
  wherever `BUG_REPORT_SOURCE` is provided, and closes itself on the button's
  `(chosen)`, as Solitaire's own drawer does (G1).
- **The issue form** `.github/ISSUE_TEMPLATE/game_bug_report.yml` has
  Solitaire's fields by the same ids (`what-happened`, `steps`, `game`,
  `environment`, `game-state`), its words made general, and a Screenshot
  field (`type: upload`, id `screenshot`, images only) after "What
  happened?". Its header comment says the games fill fields by id. A spec in
  `@fz/game-ui` reads it and checks every id the service fills is there.
- **`tools/read-report.mjs`** (in `frontend/tools/`) prints a pasted state as
  JSON, through `packed.ts`, for reading an issue's state without a browser.

### 1.6 Each game's state

Every game's state is read through `@fz/core/json`'s readers, by a reader that
names the first part it can't trust, and is loaded paused, by the path the game
already takes up a saved game by, then the parts its save leaves out laid on
top. Each game's specs pack a state, unpack it, load it, and check that what
the game shows is what was reported.

| Game             | What its state holds beyond the saved game                                                                                                                 | Shrinks by                                     | Loaded by                                                                                                            |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Solitaire        | Nothing new: `{gameId, options, snapshot}`, as today                                                                                                       | The undo history, newest kept                  | `GameLifecycleService.loadPosition()`, as today                                                                      |
| Snake            | An ended run too (its crash and last step), the stage, the settings                                                                                        | Never needs to                                 | `restoreRun()`, then `takeUp()`                                                                                      |
| Minesweeper      | The live field in any outcome, the seconds, flag mode, the lives and custom size, whether the board is turned, the stage's scroll                          | Never needs to (about 1 to 5 KB of JSON)       | `restoreField()`, then `resume()`                                                                                    |
| Sudoku           | The grid with its history, the seconds, the selected square, notes mode, the hint showing, the settings, a solved grid too                                 | The history, newest kept                       | A debug take-up that, unlike `restoreGrid()`, accepts a solved grid                                                  |
| Brick Breaker    | The field's moment: the balls, the paddle, the falling capsules, the effects, the bolts, the state and height; the ball speed's tuning                     | Drops the moment, keeping the level and bricks | `takeUp()`, then the moment laid on the field                                                                        |
| Asteroid Breaker | The ship as it was (place, speed, heading), the shots, pickups, sparks, comets, burrs, a stray adrift, crew knocked loose; the tuning's numbers; the torus | Sparks and shots, then the whole moment        | `takeUp()`, the torus forced, the moment laid on, the tuning applied                                                 |
| Brick Fuzz Pop   | The level's shots so far (a line in the certificates' `[aim, charge]` form), the round in the air and its moment, the depth, the tuning                    | The level's shots, then the round              | Off the record, the depth forced; the level replayed shot by shot; a round in the air flown to its moment and paused |

What else each needs, from the surveys:

- **Brick Breaker** saves no ball: its saved game puts the next ball on the
  paddle. Its rules are deterministic from the level's seed and the draws
  counter, so a field laid back with its counters plays on as it would have.
- **Asteroid Breaker** saves a lossy run on purpose (the ship moved somewhere
  safe, shots and pickups dropped), and its field's size comes from the window,
  the deck and the stick's side, so the state forces the torus. Its debug
  tuning can be live on the site at `?debug`, and the save keeps only whether
  it was, so the state carries the numbers.
- **Brick Fuzz Pop** keeps no record of a level's shots today. Its game service
  starts one, in memory, cleared as a level starts. Its flights are pure
  functions of a round's start and shot, so a level's line replays exactly. Its
  depth comes from the window and changes flights, so the state forces it.
  Hiding the page lands a flight at once, so the state is taken before
  anything can hide it. A loaded state plays off the record, as a played
  certificate does.
- **Snake** saves the exact step already; the state only adds an ended run,
  which the save drops.
- **Minesweeper** removes its save once a game ends, so its state reads the
  game service. Its clock keeps running under a dialog; the report's dialog
  leaves that as it is.
- **Sudoku** keeps an unbounded history (a heavy expert game runs past 15 KB
  of JSON) and its bank's puzzles can't be dealt again from a seed, so the
  state carries the givens and the history, oldest dropped first, which its
  `restoreGrid()` already accepts.

Where a game shows the loader: Brick Breaker, Asteroid Breaker and Brick Fuzz
Pop in their debug menu; Snake, Minesweeper and Sudoku, which have none, in
their settings drawer under `DEBUG_MENU`; Solitaire in its debug panel, now
also under `DEBUG_MENU` (D5).

### 1.7 Risks

| Risk                                                                       | What answers it                                                                                                                |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| A browser refuses the clipboard write, or GitHub's form won't take a paste | Save picture beside Open GitHub, and a "Couldn't copy" line; the form's file picker                                            |
| GitHub withdraws the form's upload field (a public preview)                | "What happened?" takes a pasted image as it does today; the form's spec is the one place to change                             |
| The clipboard write and the new tab don't mix in some browser              | The build tries each browser it can reach; where one fails, that browser gets Save picture's flow                              |
| The DOM-to-image library draws a part wrong (glass, a container query)     | The picture is a help, not the record: the state is. A layout bug's report still has the window, screen and bar in Environment |
| The library weighs on the game's first load                                | A dynamic import, loaded only as a picture is taken; Brick Fuzz Pop's rule on what the first download carries holds            |
| A state outgrows the link                                                  | Each game's trim; a spec per game packs its largest likely state and checks it fits                                            |
| A loaded state counts toward the player's records                          | Brick Fuzz Pop loads off the record; the others load as a taken-up game does, which the loader's words say                     |
| A report from an older build won't load                                    | It says which part, and the build line names the commit to check out                                                           |

---

## 2. Aiming the serve in Brick Breaker

### 2.1 How the serve works today

- A level, and each life after a lost ball, starts with the ball resting on
  the paddle's middle (`FieldState` `"serve"`, `src/rules/field/field.ts`). The
  ball moves with the paddle.
- **Launch** (a click, a tap, Space, ↑ or W) serves it 20° from straight up
  (`SERVE_ANGLE`) toward the way the paddle last moved (`Paddle.facing`), at
  the moment the key or button goes down (`launch()` in
  `src/rules/field/field.ts`, `serveBall()` in `src/rules/paddle/balls.ts`).
  So today the player chooses only left or right, by nudging the paddle
  first.
- A paddle bounce sends the ball up to 60° from straight up at the paddle's
  ends (`PADDLE_ANGLE`); a ball never travels flatter than 20° from level
  (`FLATTEST`).
- The **Ready card** sits over the field, halfway between the bricks' foot and
  the paddle (`CARD_DROP`, `src/app/board/board.component.ts`), naming the
  level and how to launch: "Press Space or click to launch." or "Tap to
  launch."
- The fuzzball's eyes look the way it moves (`BallPainter`), from its `dx` and
  `dy`. A resting ball keeps the direction it last had.

### 2.2 What the other games teach

**Brick Fuzz Pop aims every shot,** and its look is the one to keep:

- **The guide:** round dots in the palette's text color, evenly spaced, from
  the fuzzball along the shot to its first turn and a little past it
  (`GUIDE_DOT_GAP`, `GUIDE_PAST_TURN`), with a rounded outline round each brick
  the shot would punch through (`src/rules/flight/guide.ts`,
  `src/scene/painters/guide_painter.ts`). It is worked out by the flight's own
  rules, "so it never shows what the shot won't do".
- **The controls:** point (mouse), touch and drag (finger), or ← and →
  (keys, Shift for small steps); let go, or Space, to shoot; right-click, a
  second finger or Esc to call it off. A setting offers "Pull back" for those
  who'd rather use a slingshot.
- **The words:** How to play has a row for each of Aim, Aim in small steps,
  Shoot and Cancel; a screen reader hears the aim.

**What can't carry over as it is:** in Brick Fuzz Pop nothing else moves while
you aim. In Brick Breaker the same mouse, finger and arrow keys steer the
paddle, and players place the paddle before they serve. So the aim has to share
those controls without taking steering away.

### 2.3 The design

**Hold the launch to aim; let go to launch.** While you hold it, the paddle
stays where it is, the dotted guide shows where the ball will go, and your
left-and-right, or your drag, turns the aim instead of moving the paddle. A
quick press launches at once, as today, along the way the ball's eyes look.

#### 2.3.1 Controls

| You use  | To launch at once, as now | To aim (D6)                                                              | To call the aim off                                       |
| -------- | ------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------- |
| Mouse    | Click                     | Press, drag the way you want the ball to go, let go                      | Right-click, or drag back to where you pressed and let go |
| Touch    | Tap                       | Touch and drag up the way you want the ball to go, let go                | Tap with a second finger, or drag back and let go         |
| Keyboard | Space, ↑ or W             | Hold Space, ↑ or W, turn with ← → or A D (Shift for small steps), let go | Esc or P (pause)                                          |

- **Back to the press calls it off:** a press let go within 12 CSS px of
  where it was pressed launches when the drag never left that zone, and
  calls the aim off when it went out and came back. A finger's is the same.
- **A drag aims from where it was pressed:** the aim is the way from the press
  to the pointer, held within 60° of straight up (D8). Within 12 CSS px of the
  press nothing turns, so a click or a tap never aims by accident.
- **A finger's drag that starts upward aims; one that starts sideways steers,**
  as every drag does today. The first 12 CSS px decide: within 45° of straight
  up it aims, else it steers. Steering by dragging, or by the paddle following
  the finger, is otherwise unchanged, and so is the tap that launches.
- **The mouse launches as its button comes up,** while the ball waits on the
  paddle. Everywhere else (letting go of caught balls, the laser, going on from
  a card) a press does what it does today, at once.
- **The keys launch as the key comes up,** while the ball waits. A launch key
  held down from before (Space pressed on the Cleared card to go on) launches
  nothing as it comes up: only a press made while the ball waits starts an
  aim.
- **Held keys turn the aim at 60° a second, and at 10° a second with Shift,**
  reaching full speed over 120 ms as the paddle's keys do.
- **Looking away, pausing, or a second press calls the aim off;** the ball
  goes on waiting, and the next press starts afresh.

#### 2.3.2 What you see

See `mocks/`: `aim-ready.webp`, `aim-aiming.webp`, `aim-steep.webp` and
`aim-phone.webp`, side by side in `aim-sheet.webp`. The guide there is drawn by
the mock script, to this section's numbers.

- **The guide** is Brick Fuzz Pop's, at Brick Breaker's scale: dots in the
  field's text ink, 0.25 units across, 1 unit apart, the first 1 unit from the
  ball's middle, along the aim until the ball would first meet a brick, a wall
  or a bumper, then on past that turn for 3 units (a brick and a half), or
  only as far as what it would meet next, so no dot lies on a brick
  (`aim-steep.webp` stops 1.39 units on). It is worked out by the rules' own
  contact search, so it bends where the ball would. It shows once a press has been held 150 ms or has turned the aim, so a
  quick click never flashes it, and fades in over 120 ms where motion is
  welcome.
- **The brick the ball meets first wears an outline,** the guide's ink, a
  rounded rectangle inside its edge, as Brick Fuzz Pop outlines the bricks its
  shot will punch through. A fire ball, which passes through what it breaks,
  outlines each brick it would pass through until something turns it. A
  bumper, a wall or a portal wears none: the dots show the turn, or stop at the
  portal.
- **The guide shows the bricks as they stand.** A slider that steps along its
  row moves the guide with it, a beat at a time.
- **The fuzzball looks the way it will go:** while it waits, toward the serve
  a quick press would make, which turns as the paddle turns; while you aim,
  along the aim. Its eyes already follow its direction, so the rules only keep
  a waiting ball's direction on the aim.
- **The Ready card steps aside while you aim,** fading out over 120 ms, and
  comes back if you call the aim off. It covers the very gap the guide crosses.
- **The paddle stays where it was** while you aim, so the ball leaves from where
  the guide starts.
- **No new sound.** Each launch already makes its own.

#### 2.3.3 Words

Checked against the `player-text` skill; a worker reads it again before
writing them.

- **The Ready card:** "Press Space or click to launch. Hold to aim." On a touch
  screen: "Tap to launch. Drag up to aim."
- **How to play,** a row after "Launch or fire": **Aim the launch** · Mouse:
  "Hold the button and drag" · Touch: "Drag up" · Keyboard: "Hold
  <kbd>Space</kbd>, then press <kbd>←</kbd> or <kbd>→</kbd>". And a short
  section after the table: "**Aiming.** Hold the launch to see where the ball
  will go. Let go to launch it. To call it off, drag back to where you
  started, right-click, or press Esc."
- **The keys a screen reader is told** (`board.component.html`), one more
  line: "Hold Space, then Left or Right: aim the launch."
- **Spoken** as the guide shows: "Aiming 20 degrees right." Then, each time
  the keys turn it, the aim alone: "35 degrees left", "Straight up". A drag's
  aim isn't spoken as it turns, as Brick Fuzz Pop's isn't.

#### 2.3.4 Numbers

First guesses, to tune on real screens. In field units (a brick is 2 by 1, the
ball 0.72 across) and degrees from straight up.

| Name              | Value | What it is                                                                                                                                |
| ----------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `AIM_MOST`        | 60    | The most an aimed serve leans either way, as the paddle's ends                                                                            |
| `SERVE_ANGLE`     | 20    | Kept: the serve of a quick press, toward the paddle's last move                                                                           |
| `AIM_KEY_SPEED`   | 60    | How fast held keys turn the aim, degrees a second                                                                                         |
| `AIM_FINE_SPEED`  | 10    | The same with Shift                                                                                                                       |
| `AIM_DEAD_CSS_PX` | 12    | How far a drag goes before it aims                                                                                                        |
| `AIM_UPWARD`      | 45    | A finger's first move within this of straight up aims                                                                                     |
| `GUIDE_DELAY_MS`  | 150   | How long a still press is held before the guide shows                                                                                     |
| `GUIDE_FADE_MS`   | 120   | The guide's and the Ready card's fade                                                                                                     |
| `GUIDE_DOT_GAP`   | 1     | Between the guide's dots, the first that far from the ball                                                                                |
| `GUIDE_DOT`       | 0.25  | A dot's width                                                                                                                             |
| `GUIDE_PAST_TURN` | 3     | How far the guide runs past its first turn                                                                                                |
| `MOST_GUIDE_DOTS` | 55    | The pool: the tallest field's diagonal (26 × 45) in dots, and the 3 past the turn; derived in `tuning.ts`, and `serveGuide()` stops at it |

The aim is held in whole degrees, so what the guide showed is what the ball
does, and what a screen reader hears is what it is.

#### 2.3.5 Where each piece lives

By the game's layers (`phaserGameLayers()`): what a move does in the rules,
what to draw in the view, and the scene only draws.

- **Rules:**
  - `Steer` gains `aim: number | null`, the aim the player holds, whole
    degrees, or null. `steerField()` keeps it as `Field.aim` while the field
    serves, and null at any other time; while it is set, the paddle stays put.
  - `serveAim(field)`: `field.aim`, or the quick press's `facing ×
SERVE_ANGLE`. `launch()` serves at it and clears `aim`; `serveBall(ball,
degrees)` takes an angle instead of a facing, held within `AIM_MOST`.
  - While the field serves, the waiting ball's `dx` and `dy` follow
    `serveAim()`, for the eyes.
  - `serveGuide(field, guide)` writes the guide into a record made once (dots,
    and the cells to outline), with no hit, event or draw: a side-effect-free
    `firstContact()` exported from `src/rules/field/travel.ts` finds what the
    ball meets, and `mirror()`'s turn, split from its effects, turns it.
- **View:** `Steering` holds the aim as §2.3.1 says and writes it into each
  frame's `Steer`; the frame (`FieldFrame`) carries the guide while one shows,
  and `LevelPlay` fills it; the art gains the guide's dot and outline frames,
  and the palette the guide's ink, with a pair in the contrast spec.
- **Scene:** a `GuidePainter`, after Brick Fuzz Pop's, from pools made once;
  `listen()` hands the steering whether a press may aim (the ball waits, the
  run is ready or playing, the board is drawn) and launches as a held press
  ends.
- **Shell:** `GameService.aiming` for the board; the Ready card's words and its
  stepping aside; How to play; the screen reader's keys; what is spoken.

#### 2.3.6 What stays the same

- **A launch with no aim serves exactly as today,** so every kept run, the
  autopilot, `yarn report:levels` and the specs that play every level keep
  their numbers.
- **A caught ball** (the Catch capsule) leaves by where it landed (D7).
- **The saved game** keeps no aim: an aim is held only while a press is.

#### 2.3.7 Risks

| Risk                                                                | What answers it                                                                                         |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| A finger meant to steer is read as aiming                           | Only an upward first move aims; sideways steers as now. Look at it on a phone (`aim-phone.webp`'s case) |
| A mouse launch now waits for the button to come up                  | Only while the ball waits; under a tenth of a second, and it is what lets a press aim                   |
| The guide lies about a moving brick                                 | It is drawn each frame from the bricks as they stand, and the outline moves with them                   |
| An aim straight up under an unbreakable brick bounces the ball back | As a paddle's middle already does; the lull's nudge (`LULL_BOUNCES`) still turns a ball that loops      |
| The Ready card's longer words crowd a short field                   | `check:layout` at every shape; the card already drops its stars on a short field                        |
