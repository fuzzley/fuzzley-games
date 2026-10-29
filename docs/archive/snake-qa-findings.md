# QA of Snake on the live site: findings

Tested 2026-10-28 at https://fuzzley.games/play/snake/, the build from
`cfd56a6` (built 2026-10-28 19:48 UTC, as `version.json` says), following
`docs/archive/snake-qa-plan.md` (desktop) and `docs/archive/snake-mobile-qa-plan.md`
(phones and tablets). Twelve findings, ordered by priority: two High, six
Medium and four Low, all fixed on 2026-10-29 as
`docs/archive/snake-qa-fixes-plan.md` describes; the summary names the
commit that fixed each. The rules, the timing, the storage and the site all
held. What went wrong is around the board: on phones, its size and turning
the phone; everywhere, loading slowly and where the keys go. Paths are
relative to `frontend/games/snake/`.

## How it was tested

- **Desktop:** Chrome, driven through the DevTools MCP (a visible window,
  1920 × 1080 at about 130 Hz unless said), in isolated profiles so storage
  started empty. Keys, pointer presses and swipes were sent from scripts
  (the plan's appendix helpers), real clicks through the MCP where the
  focus mattered. Seeded runs were written into `snake-game` as the page
  went away, then loaded.
- **Phones and tablets:** Chrome's device emulation (a mobile, touch
  viewport at the device's pixel ratio), with a turn of the device as a
  change of viewport. Every size in the mobile plan was loaded fresh in
  headless Chrome, through `@fz/dev/chrome`, with a touch pointer, once
  with the arrows on and once set to Never at the starred sizes. Swipes are
  touch events sent to the canvas. No real phone or tablet was used: see
  "Not covered".
- **Other browsers:** Edge 156 and Firefox 159, headless, for a smoke test.
- **Analytics** were pinned off (`window.__ENV` held at `{}`) on every page
  the MCP loaded. A few page views still reached Google Analytics: one
  plain reload on the desktop, and the site's home page reached from the
  game's home link, since a page loaded by following a link wasn't pinned.

## Findings

### 1. Turning the phone leaves the board drawn small, in a corner

**Priority:** High. **Effort:** S. **Checks:** mobile 1.12, 3.2, 3.5.

**What happened.** At 390 × 844 (an iPhone 15, 3×, the arrows showing),
turning to 844 × 390 and back, at Ready and with the ⋮ menu open:
after a turn either way, the canvas kept a size from partway through the
turn, 326 or 330 CSS px square in its 390 px box. The board was drawn 295
to 300 px across instead of 357, in the box's top left corner, with the
Ready and Paused cards, which the page places on the box, hanging off its
edge (`docs/archive/snake-qa-rotation.jpeg`). It stays that way until the window
changes size again; a `resize` event put it right at once.

`ViewportScaler` (`frontend/lib/phaser/src/host/viewport_scaler.ts`) sizes
the canvas on the window's `resize`, and when its `ResizeObserver` reports
the box. On a turn the browser fires `resize` first, while the bar still
stands where it stood: the shell moves it on the media query's `change`,
which comes after. So `apply()` measures the box in between. The box then
settles at 390 × 390, the size the observer last reported, so the observer
reports nothing, and the in-between size stays. This needs the box to end
the turn at the size it started, which is what the arrows make of most
phones: the board's box is the short side squared, both ways. The order
is the HTML standard's (resize steps before media query changes), so real
phones should show it too; it was seen in emulation only. The Solitaire
Collection uses the same scaler, though its box rarely ends a turn at the
same size.

**Options.**

- **A. Size from the observer alone where there is one.** It reports after
  layout, so it always sees the box where the shell leaves it; the window's
  `resize` stays only for a browser without `ResizeObserver`.
  - _Pros:_ one trigger, always the settled size, in the library.
  - _Cons:_ the pixel-ratio cases (zoom, another screen) must be checked
    to still go through the media query and the device-pixel box.
- **B. Measure again a frame after each `resize`.**
  - _Cons:_ whether one frame is enough depends on when Angular runs its
    change detection, so it is a guess.
- **C. Snake's shell calls `apply()` when its form factor changes.**
  - _Cons:_ every game must remember to; the bug is the library's.

**Recommendation.** A, in `@fz/phaser`, and `check:layout` turning an
upright phone sideways and back, with a touch pointer, and measuring after.
It checks three shapes, each loaded fresh, which is why it didn't catch
this.

### 2. A slow connection is told the board is broken, while it is still loading

**Priority:** High. **Effort:** S. **Checks:** 1.2, lead 6; mobile 6.3,
lead 8.

**What happened.** A cold load of the game in a fresh profile, on Chrome's
"Slow 3G" (1280 × 800; 390 × 844 on a phone gave the same times):

| Time   | What the page showed                                                      |
| ------ | ------------------------------------------------------------------------- |
| 6.2 s  | The bar, the empty board drawn in CSS, and the Ready card                 |
| 14.2 s | "The board couldn't be drawn" / "Reloading the page may help." and Reload |
| 16.9 s | The Phaser chunk (419 KB) finished downloading                            |
| 17.2 s | The drawn board and the Ready card, as if nothing had happened            |

`<fz-phaser-canvas>` gives the scene 8 s from when it starts loading it
(`READY_TIMEOUT_MS` in `frontend/lib/phaser/src/canvas/phaser_canvas.component.ts`),
and the download alone took 10.7 s. The card is `role="alert"`, so a screen
reader announces the failure, and nothing announces the recovery. A player
who believes the card and presses Reload starts the slow download again,
and may meet the same card again. A phone on a weak signal is exactly
where this happens. The Solitaire Collection loads its scene through the
same component, so it likely behaves the same way. Finding 8 is what a
press does in the meantime.

**Options.**

- **A. Fail only on a failure.** The canvas reports `failed` when the
  scene's `import()` rejects or Phaser can't make a renderer. A slow
  download is not a failure, so it has no timeout.
  - _Pros:_ the card is true whenever it shows.
  - _Cons:_ a download that hangs leaves the placeholder up for good,
    which B covers.
- **B. Say it is still loading.** After 8 s with no scene, the card reads
  "Still loading the board…" (as a status, not an alert), and becomes the
  failure card only on an error, or after a much longer wait (30 s).
- **C. Start the clock once the code has arrived:** time only the scene's
  start-up, not the download.
  - _Pros:_ the smallest change in `@fz/phaser`.
  - _Cons:_ the player still sees nothing to explain a 10 s wait.

**Recommendation.** A and B together, in `@fz/phaser`'s canvas, so the
Solitaire Collection gets the fix too.

### 3. With the arrows showing, small phones get a small board

**Priority:** Medium. **Effort:** S. **Checks:** mobile 3.1, 3.5, lead 1.

**What happened.** The squares, in CSS px, at the sizes where they fell
under the 16 px that `yarn check:layout` holds the board to:

| Size, as held                  | Arrows showing | Arrows set to Never |
| ------------------------------ | -------------- | ------------------- |
| 320 × 480, upright             | 9              | 17                  |
| 375 × 553, iPhone SE in Safari | 13.5           | 20                  |
| 568 × 320, sideways            | 14             | 17                  |

Everywhere else they were 17 px or more (18.7 at 360 × 640). At 320 × 480
the board is 153 px across, and the Ready card covers it and runs past its
foot, cutting off "start." (`docs/archive/snake-qa-small-board.png`). At 375 × 553
and 568 × 320 the card runs a pixel or two past the board's edge. Each key
of the pad is 64 px (`--arrow` in `src/app/arrows/arrows.component.scss`),
so the pad takes 208 px of a short screen whatever the room, with 24 px of
padding under it. An iPhone SE in Safari is a common phone.

**Options.**

- **A. Keys that shrink with the room:** `--arrow` from the stage's height
  in container units, between 44 px and 64 px, and less padding on a short
  stage. That gives the board up to 70 px back.
  - _Pros:_ the keys stay at a thumb's size; one stylesheet.
- **B. Hide the arrows by default on a screen too short for both,**
  leaving swipes.
  - _Cons:_ a player who wants them must find Settings, and the arrows are
    the easier way to steer for many.
- **C. Cards that scale with the board,** so the Ready card fits even a
  153 px board.
  - _Cons:_ the words get too small to read before the board does.

**Recommendation.** A, with C's smaller type only below a board of about
200 px; and `check:layout` measuring 375 × 553 with a touch pointer.

### 4. On a short phone held sideways, the rail's ⋮ button runs off the screen

**Priority:** Medium. **Effort:** S. **Checks:** mobile 3.3, 3.4.

**What happened.** Sideways, the bar is a rail down the right with seven
items: home, the speed badge, Score, Best, Pause, New Game and ⋮. At
568 × 320 and 667 × 320 (an iPhone SE, the second in Safari) "More actions"
spans 303 to 347 px of a 320 px window, so 17 of its 44 px show
(`docs/archive/snake-qa-rail.png`); at 750 × 342 (an iPhone 15 in Safari's bars) 5
px are off. Nothing scrolls. The ⋮ menu holds Sound, How to play and
Settings, so on these phones they hang on a sliver. The rail is
`@fz/game-ui`'s: at 568 × 320 Minesweeper's ⋮ is cut off too (294 to 338
px), while Sudoku's fits (268 to 312 px). The rail's groups don't give way
(`.rail .status { flex: none; }` in
`frontend/lib/game-ui/src/game_bar/game_bar.component.scss`).

On `main` after this pass (`6565c77`), where the speed badge opens a menu
and stands 30 px tall on the rail rather than 18, it is worse: Snake's ⋮
spans 318 to 362 px, so the rail needs 370 px. At 320 px tall 2 px of it
show, at 750 × 342 24 px, and at 640 × 360 (a small Android) it is cut too.

**Options.**

- **A. The link home goes into the ⋮ menu on a short rail,** as it does on
  an upright screen under 360 px wide (`withHomeLink()`): a height under
  which `barHome` is `none`, in `src/breakpoints/`. That gives back 52 px.
  - _Pros:_ every game gets it, through the service it already follows.
- **B. A tighter rail when short:** smaller gaps and padding.
  - _Cons:_ it gains about 30 px, just enough for Snake and Minesweeper
    today, and not for an eighth item.
- **C. The rail scrolls.**
  - _Cons:_ a scrolling bar hides the very button it can't fit.

**Recommendation.** A, in `@fz/game-ui`.

### 5. Turning the phone mid-run doesn't pause it

**Priority:** Medium. **Effort:** S. **Checks:** mobile 1.12, lead 2.

**What happened.** Mid-run at 390 × 844, turned to 844 × 390: the run was
still `playing` 1.5 s later, the snake moving all the while. On a phone a
turn takes about half a second of animation, in which the snake moves four
or more squares at Normal on a board the player can't see; near a wall, it
crashes. Then it comes back drawn small (finding 1). Paused, a turn keeps
the run paused, and every overlay (the ⋮ menu, Settings, the New Game
question, the result card) lays itself out again through a turn, stays
usable, and gives the board the focus when it closes.

**Options.**

- **A. Pause when the orientation changes mid-run,** as losing the focus
  does, with the Paused card and "Paused, with a score of N" said.
  - _Pros:_ nothing is lost to a turn, and going on is one press.
  - _Cons:_ none much: no one turns the phone mid-run to keep playing
    blind.
- **B. Leave it,** since the player turned the phone on purpose.

**Recommendation.** A, from `GameViewportService`'s `isPortrait` in the
game service.

### 6. After the result card is closed, nothing on the board says how to play again

**Priority:** Medium. **Effort:** S. **Checks:** 8.9, lead 2; mobile 1.6.

**What happened.** A run into the wall, then Escape (or Close) on the
result card, leaves the board focused, with its ring, the faded snake
against the wall, and no card. Pressing →, ↑, ↓, Space, P, Enter and W one
after another changed nothing: the outcome stayed `over`, and Pause stayed
dimmed. The only way on is New Game in the bar, which nothing on the board
points to. The Ready and Paused cards each say what to press. The ended
board says nothing. On a phone, a swipe or an arrow does nothing there
either.

**Options.**

- **A. A card for an ended run,** like Ready's and Paused's: "Game over",
  "Score N", and a New Game button. It puts the next step where the eyes
  are, and matches the other cards.
  - _Cons:_ it covers the faded snake the player closed the card to see,
    though it sits over the lower half only.
- **B. A direction, Space or Enter deals a new run** once the card is
  closed. Nothing is lost by a new run then, so it needs no question.
  - _Pros:_ the keys go on working, as a player expects of an arcade game.
  - _Cons:_ a key pressed to look around starts over without warning, and
    the help and the board's description need a line for it.
- **C. Both:** the card with the button, and Space or Enter on the board
  pressing it.

**Recommendation.** C, with only Enter and Space dealing, not a direction.

### 7. A click beside the board pauses the run, and then the keys don't reach it

**Priority:** Medium. **Effort:** S. **Checks:** 7.4, 7.6.

**What happened.** Mid-run, a click on the bar's "Score" label (or
anywhere that isn't a control, such as the wide margins beside the board
on a desktop) moved the focus to the page's `<body>`. The board paused the
run, as it does on losing the focus, and the announcer said "Paused, with
a score of 0. Press a direction to go on." But a real → and then Space did
nothing: the keys reach the game only on the board's element. The run goes
on only from Resume, or from a click on the board followed by a key. On a
1920 × 1080 window, the margins either side of the board are 480 px wide,
so a stray click is easy.

**Options.**

- **A. A press anywhere on the stage gives the board the focus,** as a
  press on the board does (`takeFocus()` in
  `src/app/board/board.component.ts`), so a click beside the board neither
  pauses nor strands the keys.
  - _Pros:_ small, and the margins become part of the board, as they look.
  - _Cons:_ a click on the bar's labels still pauses. That is arguably
    right, since the player reached for the bar.
- **B. Keys typed with the focus on `<body>` go to the board.**
  - _Cons:_ the Sudoku QA rejected the same idea for its digits under
    WCAG 2.1.4 (one-key shortcuts only while a control is focused), and
    Space and P are such keys.
- **C. Say the truth when the focus has left.** The pause announcement
  names Resume, and the Paused card's line reads "Click the board, or
  Resume, to go on" when the board isn't focused.

**Recommendation.** A, with C's words for the case it doesn't cover.

### 8. A press while the board is loading starts a run nobody can see

**Priority:** Medium. **Effort:** S. **Checks:** lead 7; mobile lead 8.

**What happened.** On the same "Slow 3G" load at 390 × 844, Up on the
on-screen arrows at 6.3 s, as soon as the Ready card showed:

| Time   | What happened                                                      |
| ------ | ------------------------------------------------------------------ |
| 6.3 s  | The Ready card went and the run began (`playing`); nothing moved   |
| 14.3 s | "The board couldn't be drawn" (finding 2), the run still `playing` |
| 17.2 s | The board drawn, the snake already heading up                      |
| 18.2 s | It ran into the top wall: "The snake ran into the wall. Score 0."  |

The CSS board offers the Ready card and the arrows before the scene that
moves the snake has arrived, so a player who does what the card says
loses a run they never saw, a second after the board appears. Keys and
swipes can't do this: they reach the game through the scene, which hasn't
arrived. Only the on-screen arrows, which are the shell's, can.

**Options.**

- **A. The controls wait for the board.** Keys, arrows and swipes do
  nothing while the canvas is `loading`, and the card reads "Loading the
  board…" until it is ready (finding 2's B).
  - _Pros:_ the card never asks for what can't be done yet.
- **B. Take the press, but hold the run at Ready** until the scene arrives,
  then start it.
  - _Cons:_ the snake sets off by itself up to ten seconds after the
    press, which surprises as much.

**Recommendation.** A, with finding 2.

### 9. A paused run ignores the direction back, silently

**Priority:** Low. **Effort:** S. **Checks:** 7.6, lead 1; mobile 1.5.

**What happened.** Paused while heading right, ← and A did nothing: the
run stayed paused, with no sound, no change on screen and nothing
announced. → and the two turns went on at once. A swipe back on a phone
did the same. The announcement says "Press a direction
to go on.", and nothing says which direction won't. A player who stopped
to think, and wants to go back the other way, presses the very key that's
ignored. The rule is right for a moving snake (`turn()` in
`src/rules/run.ts` drops a reverse), but it doesn't need to apply to going
on.

**Options.**

- **A. Any direction goes on;** the one back goes on straight ahead,
  without turning.
  - _Pros:_ the words become true, and nothing can crash.
  - _Cons:_ a player expecting a U-turn still doesn't get one, though the
    snake moves, so the cause is plain.
- **B. Keep the rule, change the words:** "Press Space or a direction to
  go on" on the Paused card and in the announcement.
  - _Cons:_ still a dead key, and the card currently shows only Resume.

**Recommendation.** A.

### 10. Pressing an on-screen arrow from the keyboard plays on with the keys cut off

**Priority:** Low. **Effort:** S. **Checks:** 4.12, lead 4.

**What happened.** With the arrows set to Always, Tab from the board
reaches Up, Left, Right and Down. Tabbing to one paused the run, as
leaving the board does. Enter on Left turned the snake and went on ("Going
on."), with the focus still on the button. A real ↓ then did nothing,
since the keys reach the game only on the board, and the snake ran into
the wall. With the focus on the pad, nothing pauses when the focus moves
on either. (Enter on Up, the direction back, did nothing at all: finding
9.) This only bites a keyboard player who has the arrows showing, such as
on a laptop with a touch screen, where they show by default, or a tablet
with a keyboard.

**Options.**

- **A. Treat the pad as part of the board** for the keys and the focus:
  the game's keys pressed on a focused arrow reach the game, and moving the
  focus between the board and the pad doesn't pause.
  - _Pros:_ every way of steering works wherever the focus is in the room,
    and a switch user steering with the buttons keeps their place.
- **B. A press from the keyboard hands the focus back to the board,** as a
  press with a pointer does (`handBack` in `src/app/arrows/`).
  - _Cons:_ a user stepping through the buttons with Tab, such as a switch
    user, must Tab back after every turn.

**Recommendation.** A.

### 11. Small things in the words and sizes

**Priority:** Low. **Effort:** S. **Checks:** 11; mobile 1.6, 1.10, lead 5.

- **Settings, "On a touch screen":** "Beside the board on a phone or a
  tablet." (`src/app/settings/settings.component.ts`). Upright, the arrows
  sit under it. "Under or beside the board…", or "On a phone or a tablet."
- **The Ready card** says "Press an arrow key, or swipe, to start."
  (`src/app/board/board.component.html`). On a phone with the arrows set to
  Never there are no arrow keys. On a touch screen it could read "Swipe, or
  press an arrow, to start.", and "Swipe to start." with the arrows off.
- **How to play:** the Pausing paragraph leaves out P, and at 1920 px the
  Keyboard column wraps "W A S D", leaving D alone on a second line.
- **The result card's other speeds,** Slow and Fast, are 42 px tall, under
  the 44 px the plan asks of a touch target (WCAG's minimum, 24 px, is
  met). New Game and Close are 48 px.

**Recommendation.** All four, in one small change.

### 12. A wrong address under the game gets nginx's bare 404, naming its version

**Priority:** Low. **Effort:** S. **Checks:** 17.6.

**What happened.** `https://fuzzley.games/play/snake/nope` returns nginx's
default page: "404 Not Found" over "nginx/1.31.8", unstyled, with no way
back to the site. The site's own addresses get its styled not-found page.
The version in the body is a small disclosure (the response header already
says "Google Frontend"), and it holds for every path nginx serves directly.

**Options.**

- **A. `server_tokens off;`** in `nginx.conf.template`, which drops the
  version from the error pages.
- **B. An `error_page 404` for `/play/`** that serves a small static page
  with the site's look and a link home.

**Recommendation.** A now; B whenever the site gets a static not-found
page.

## Results by check

### Desktop

Chrome at 1920 × 1080 unless said.

- **Loading (1.1–1.8).** The shell paints with the CSS board and the Ready
  card; Phaser (419 KB), the host and the scene load after, and the drawn
  board lands in the same place. The starting position is as the rules
  say. The tab says Snake; no scrolling. The board has the focus on load
  with no ring, so → starts at once. All requests same-origin and
  successful; hashed assets `immutable`, `index.html` `no-cache`,
  `version.json` `no-store`, and the security headers present. The console
  shows only Chrome's info line "Autofocus processing was blocked…", once
  per result card. Slow 3G: findings 2 and 8. 1.7 and 1.8 not run: no way
  to start Chrome without WebGL, or block one request, from the MCP.
- **The bar (2.1–2.7).** As listed. Pause is dimmed at Ready and after an
  end (`aria-disabled`), and clicking Pause, Resume and Sound mid-run keeps
  the focus on the board. Sound's choice is kept. Tooltips are there.
- **Rules (5.1–5.12).** Every rule held, timed to the step: see the table
  below. Tail-chasing (5.9): a seeded 30-square snake filling a 2 × 15
  ring, its head behind its tail, went five laps (150 steps) with a queued
  U-turn at each end and never crashed.
- **Speeds (6.1–6.4).** As the table shows. At ~130 Hz (this screen) the
  times hold. Under 6× CPU throttling, frames ran 50–100 ms with some over
  200 ms, and the snake ran 25–80% slow, losing time rather than skipping
  squares. That is the design (Phaser's `smoothStep` drops what a frame
  over 200 ms adds); at 1× there were no long frames in 6 s of play, frames
  every 7.6 ms.

  | Check                             | Expected             | Measured                           |
  | --------------------------------- | -------------------- | ---------------------------------- |
  | First apple, Slow / Normal / Fast | 1280 / 1000 / 720 ms | 1284–1299 / 1002–1015 / 732–742 ms |
  | ↓ at Ready to the bottom wall     | 1125 ms              | 1126 ms                            |
  | ↑+← both taken (left wall)        | 750 ms               | 758 ms                             |
  | ↑+←+↓, third dropped              | 750 ms               | 749 ms                             |
  | ↑+↓, ↓ dropped (top wall)         | 1125 ms              | 1122 ms                            |
  | Normal, 10 apples in, a step      | 105 ms               | 105.8 ms                           |
  | Normal / Fast / Slow floors       | 70 / 55 / 100 ms     | 71.2 / 56.3 / 101.3 ms             |
  | Into itself at 5 squares          | 3 steps, 363 ms      | 376 ms                             |
  | 284 apples in, Slow               | won in 2 steps       | won at 202 ms                      |

- **Controls (4.1–4.12).** Arrows, W/A/S/D (by key position), Space, P
  and Escape as specified; a held key, Ctrl and Alt are ignored; a mouse
  drag of 24 px turns, a shorter one doesn't, and an L-shaped drag turns
  twice; the right-click menu is suppressed; a click on the board takes
  the focus without starting. On-screen arrows: finding 10.
- **Pausing (7.1–7.9).** A hidden page pauses and saves the run (by a
  simulated `visibilitychange`: Chrome under automation keeps background
  tabs "visible"). Tab out, How to play, Settings and the New Game question
  all pause, and closing them leaves the board focused, paused, ready for
  a key. A click beside the board: finding 7. The direction back: finding 9. Window blur and minimizing (7.2, 7.3) can't be driven from the MCP.
- **The end (8.1–8.10).** The crash, the 600 ms fade, the card, its new
  best, New Game and the other speeds all as specified; equalling the best
  isn't a new one. After Close: finding 6.
- **New Game and speeds (9.1–9.4).** As specified: no question with
  nothing to lose; Cancel keeps a paused run; the question opens over the
  drawer, and Cancel there keeps the old speed checked.
- **Settings (10.1–10.6).** Every setting, description and state as
  listed; the radio groups move with the arrows without choosing; choices
  are kept.
- **How to play (11).** Opens and closes as specified and pauses the run.
  The words match the game, but for finding 11's two.
- **Palettes (12).** All four change the board, bar and cards at once
  without touching the run, and stay legible (snake, head and apple on both
  shades of square). `theme-color` follows (`#fff`, `#f4f1fb`, `#101418`,
  `#0e1a2b`), and the site wears the palette chosen in the game.
- **Keeping a run (13).** Taken up paused after every reload, with "Your
  last run is paused, with a score of N…"; not kept at Ready or after an
  end. Back from the site restores the page from the back/forward cache,
  paused. Spoiled `snake-game`, `snake-settings` and `snake-stats` load as
  defaults, with one console warning for the broken JSON. Two tabs: each
  takes up its own copy, and the last to write wins, so a run finished in
  one tab comes back from the other's copy, and a run played in both counts
  twice. Not a finding; noted.
- **Accessibility (14).** Tab order board → arrows → bar; one `<h1>`; the
  board's role, name and description as specified; every announcement as
  specified. Reduced motion opens the result card 16 ms after the crash
  rather than 600 ms. Lighthouse (snapshot, desktop): accessibility, best
  practices and SEO 100.
- **Sizes (15.1).** 1920 × 1080 (56 px squares), 1280 × 800 (wordmark,
  39 px), 1279 × 800 (home icon), 1199 × 800 (labels visually hidden),
  720 × 500 (22 px, still roomy), 719 × 600 and 900 × 499 (compact: the
  rail down the right, the ⋮ menu): every board square, whole, inside the
  window, off the bar, the ring on it to the pixel, the placeholder within
  a pixel, nothing scrolling. Chrome's emulated pixel-ratio changes don't
  fire `resolution` media-query changes, so zoom and a second screen (15.3,
  15.4, lead 5) test the emulation, not the game; the cards stayed within a
  pixel of the board after them.
- **Performance (16).** Frames at the screen's ~130 Hz, none long, at 1×.
  Twenty runs: the heap flat (29.45 → 29.19 MB), one canvas, the same
  Phaser objects, no warnings. A lost and restored WebGL context redraws
  everything, the run untouched.
- **The site (17).** Arcade is the home page's third section, with its
  description; Snake's tile has its thumbnail, "New", "Solo", "3 min".
  Search finds it, `/category/arcade` lists it, and `/games/snake` has the
  back link, blurb, "Solo, about 3 min a game", the preview and "Play
  Snake" to `/play/snake/`. `/play/snake` and `/play/snake/index.html`
  redirect there. The link preview's tags and image are right. A wrong
  address: finding 12. Snake's thumbnail is the only light one among the
  games' tiles in a dark palette; a matter of taste, noted.
- **Other browsers (18).** Edge 156 (headless, through `@fz/dev/chrome`)
  and Firefox 159 (headless, over WebDriver BiDi), at 1280 × 800: the
  board drawn, focused on load without a ring, the first apple at 1048 ms
  and 992 ms, the crash, the card and the announcement right, and no
  console errors. In Firefox the CSS placeholder sits within a pixel of the
  drawn board and the ring on it.

### Phones and tablets

Emulated in Chrome, upright 390 × 844 unless said.

- **The flow (1.1–1.4).** The home page, search, Snake's page and Play fit
  with no sideways scroll, and the tile is easy to tap. The game opens in
  the shape the plan expects at every size: the bar along the bottom
  upright, the home button in it from 360 px wide and in the ⋮ menu below,
  a rail down the right sideways, the bar across the top on a tablet, the
  arrows under or beside the board. Swipes start and turn the run, and the
  arrows turn it on the press, as the desktop's drags and keys did (the
  24 px threshold and L-shaped turns were timed there). Nothing scrolls at
  any size. Whether a swipe can select, zoom or pull to refresh needs a
  real finger.
- **Pausing and the end (1.5–1.7).** Pause in the bar, the ⋮ menu and the
  New Game question pause and keep the run; going on works from Resume,
  the bar, a swipe or an arrow, but not straight back (finding 9). The
  result card fits upright. At 320 px tall it scrolls inside itself, with
  New Game in view and the other speeds and Close below; Escape and a tap
  outside close it too (finding 11 for the speeds' height).
- **The ⋮ menu, How to play and Settings (1.8–1.10).** The menu opens
  upward from the bottom bar and beside the rail, within the window.
  How to play's table fits at every size, scrolling inside the dialog on a
  short screen. The Settings drawer scrolls inside itself, every setting
  reachable. Arrows set to Never: the pad goes, the board grows (table in
  finding 3), swipes steer.
- **Back to the site (1.11).** The home button mid-run, then Back: the
  game restored, paused, "Paused, with a score of 0. Press a direction to
  go on."
- **Turning (1.12).** Findings 1 and 5. Each overlay re-lays itself
  through a turn and gives the board the focus when it closes; a paused
  run stays paused.
- **Layout at every size (3.1–3.6).** All 22 sizes, arrows on, and the 8
  starred with the arrows set to Never: the board square, whole, in the
  window and clear of the bar and the pad; the bar's items unclipped but
  for finding 4; nothing scrolls; every bar button and arrow at least 44 px,
  but for the wordmark on a 1366 px wide tablet (34 px tall). Squares under
  16 px: finding 3.
- **Lighthouse (snapshot, mobile, 390 × 844).** Accessibility, best
  practices and SEO 100. Its "agentic browsing" check fails on the site's
  `llms.txt`, which is the site's concern, not Snake's.
- **Slow 3G (6.3).** The same times as the desktop: findings 2 and 8.

## Not covered

Emulation can't show these; they need a person with real devices.

- **Real phones and tablets:** iOS Safari, Android Chrome, an iPad. In
  particular Safari's moving toolbars (4.1), the notch and the home
  indicator held sideways both ways (4.2, lead 7), a home-screen web app
  (4.3), pull to refresh (4.4), sound and the silent switch (4.5), Low
  Power Mode (4.6), Samsung Internet and Firefox on Android (4.7), the
  system's Back gesture from a screen edge (2.6, lead 4), and whether
  finding 1 shows on a real turn.
- **Screen readers:** VoiceOver and TalkBack (5.1–5.4, lead 3: whether a
  double tap on an arrow turns the snake), NVDA and Narrator (14.4).
- **Hands:** thumbs on the pad, missed swipes over ten runs, a resting
  thumb, heat and battery (1.4, 2.1–2.4, 6.2).
- **The desktop's manual checks:** window blur and minimizing (7.2, 7.3),
  browser zoom and a second screen (15.3, 15.4), full screen (15.5), an
  hour in the background (16.5), WebGL off and Phaser blocked (1.7, 1.8),
  sounds by ear (3.10), and Safari on a Mac.

## What works well

- **The rules are exact.** Every timing within a frame of the rules', the
  turn queue, the dropped reverse, tail-chasing, the speed-up and its
  floors, and a win.
- **The run is never lost** to a reload, the back/forward cache, a hidden
  page, a spoiled entry or an open dialog; it comes back paused, and says
  so.
- **Every shape the window takes** places the bar, the link home, the
  arrows and the board as designed, and the overlays follow a turn.
- **The accessibility basics:** the board's role and description, every
  change announced, the focus returned to the board after each overlay,
  reduced motion honoured, and Lighthouse at 100 on both.
- **Light and steady:** no long frames, a flat heap over twenty runs, and
  a lost WebGL context redrawn without touching the run.

## Summary

| #   | Finding                                                   | Priority | Effort | Where                     | Fixed in   |
| --- | --------------------------------------------------------- | -------- | ------ | ------------------------- | ---------- |
| 1   | Turning the phone leaves the board drawn small            | High     | S      | `@fz/phaser`, phones      | `ab5bcbc`  |
| 2   | A slow connection is told the board is broken             | High     | S      | `@fz/phaser`, everywhere  | `7dbfdbb7` |
| 3   | Small phones get a small board with the arrows showing    | Medium   | S      | Snake, phones             | `6288568d` |
| 4   | The rail's ⋮ runs off a short phone held sideways         | Medium   | S      | `@fz/game-ui`, phones     | `2e6446ec` |
| 5   | Turning the phone mid-run doesn't pause it                | Medium   | S      | Snake, phones             | `e910cd01` |
| 6   | Nothing says how to play again after the result card      | Medium   | S      | Snake, everywhere         | `842a58ba` |
| 7   | A click beside the board pauses, and the keys don't reach | Medium   | S      | Snake, desktop            | `cbdb2f0f` |
| 8   | A press while the board loads starts an unseen run        | Medium   | S      | Snake, slow connections   | `0d03a774` |
| 9   | A paused run ignores the direction back                   | Low      | S      | Snake, everywhere         | `892b4de0` |
| 10  | A keyboard press on an on-screen arrow cuts the keys off  | Low      | S      | Snake, keyboard and touch | `cbdb2f0f` |
| 11  | Small things in the words and sizes                       | Low      | S      | Snake                     | `a28082c5` |
| 12  | nginx's bare 404 under `/play/`, naming its version       | Low      | S      | nginx                     | `93035612` |

## Suggested order

1. **The libraries, for every game:** finding 1 in `@fz/phaser`'s scaler,
   finding 2 in its canvas, and finding 4 in `@fz/game-ui`, with
   `check:layout` taught to turn a phone and to measure 375 × 553 with a
   touch pointer.
2. **Snake on a phone:** findings 3 and 5, then 8 once the canvas can say
   it is still loading.
3. **Snake's keys and focus,** one change to the board: findings 6, 7, 9
   and 10.
4. **Whenever:** finding 11's words and finding 12's line of nginx.
5. **A pass on real devices** for "Not covered", above all finding 1 on an
   iPhone and an Android phone, and VoiceOver on the arrows.

## Decisions for you

- **Finding 1:** size the canvas from the `ResizeObserver` alone (A),
  which touches the Solitaire Collection's canvas too.
- **Finding 4:** move the link home into the ⋮ menu on a short rail (A),
  for every game, or only tighten the rail (B).
- **Finding 5:** whether a turn of the phone should pause the run.
- **Finding 6:** whether Space and Enter on an ended board deal a new run,
  as well as the card's button.
- **Finding 12:** `server_tokens off;` now, and whether `/play/` gets a
  styled not-found page.
