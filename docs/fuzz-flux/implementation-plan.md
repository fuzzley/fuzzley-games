# Fuzz Flux: the implementation plan

Written 2026-11-26, as a companion to [`design.md`](design.md). The design
says what the game is: its 16 decisions, its rules, its numbers, its look,
its sounds and its 36 levels. This file says how to build it:

- the questions for you before any code, and the plan's own calls (§2);
- what the game takes from the house's libraries as they are, what moves
  out of other games and libraries into shared places first, and what
  stays the game's own (§3);
- the game's architecture and the contracts its parts share (§4);
- each package of work, its commits, what it owns and when it is done (§5);
- how the packages run side by side: branches, slots, ports, ownership,
  briefs, reviews (§6);
- the work log that lets the build stop and start again (§7);
- the practices each layer keeps (§8), the checks and budgets (§9), the
  risks (§10), and the finish (§11).

Where this file and the design disagree, this file is the newer, and §2
says why at each point. The build runs by the `multi-agent-build` skill,
every commit reviewed by the `commit-review-process` skill, and the merge
into `main` by the `merge-to-main` skill, once you ask.

Paths are relative to `frontend/` unless they start with `docs/`,
`.agents/` or `.github/`.

**What it was written from:**

- `design.md`, read whole, its mocks' screens, and the sketch's outline:
  `sketch/engine.mjs`'s state and move record, `bots.mjs`, `report.mjs`,
  `feel/feel.mjs`'s timeline and sounds, `art/fuzz.mjs`'s shapes,
  `sound/sprite.json` and the levels' JSON. The design was written without
  reading the house's code, as its brief asked. This plan is a separate ask
  and reads the code throughout.
- Three surveys of the code: the shared libraries (`@fz/core`, `@fz/ui`,
  `@fz/game-ui`, `@fz/phaser`, `@fz/style`, `@fz/dev`) with their
  `AGENTS.md` files and skills; `@fz/brick-wall` with Brick Fuzz Pop and
  Rickashay, end to end; and the grid games (Snake, Sudoku, Minesweeper,
  Solitaire) with the archive's plans, for what was proposed and never
  built.
- Rickashay's plan and its "As built"
  ([`implementation-plan.md`](../rickashay/implementation-plan.md)), the
  last build run by the `multi-agent-build` skill, whose layout this plan
  keeps.
- One measurement made for this plan: the sketch's `play()` over every
  level's 8 deals with random legal moves (5,044 moves) takes a median of
  47 µs and a 99th percentile of 0.41 ms, keeping its record (§9).
- The week, read with `/measure limits` on 2026-11-26: 31% used, resetting
  Wed Dec 02, 02:00 UTC. The ledger's last build, Rickashay, cost $1,314
  for 188 commits.

## 1. Summary

- **Two parts, as Rickashay was built.**
  - **Part 1, the lifts (§3.3):** about 12 commits in two packages, on
    the branch `fuzz-flux-lift`. Pieces any game could use, and the level
    pieces that sit in `@fz/brick-wall` though they name no wall, move into
    the libraries that hold their kind. Each is adopted by the games that
    had it, in the commit that moves it, and they play and look exactly as
    before. Part 1 can merge into `main` on its own (question 5).
  - **Part 2, the game (§5.2):** about 144 commits in thirty-one packages,
    on the branch `fuzz-flux`, in `games/fuzz-flux`. It writes only what is
    Fuzz Flux's: the rules, the art, the feel, the sounds, the board for
    keys and screen readers, the levels and their proof, and the words.
- **The rules are a port of the sketch, held to it game by game.** The
  sketch's engine is every rule in the design, played 28,000 moves without
  a fault, and the 288 deals were proven on it. A script beside it writes
  golden games: every certificate's line, and seeded games of random moves
  on every level. The port must play each of them exactly as the sketch
  does, wave by wave (C1). The bots are ported too, and must reproduce the
  sketch's report figure for figure.
- **The view plays a timeline built in advance.** `play()` returns the
  whole move as a record; a pure function turns the record into every
  track, effect and sound of the move, at the design's numbers; the scene
  only samples it. So the feel's timings are specced in Node ("a bunch of
  3 is back at rest 900 ms after the tap"), and tuning them changes data,
  never code (C10).
- **A contracts package (K2) fixes the types the streams share,** with
  hand-made move records, so the art, the view, the scene and the shell are
  built against the rules before `play()` exists. Every element (dust,
  brick, cage, sleepyhead, burr) is in the contracts from the start and is
  played through hooks, tried with stand-ins, so each element's package
  adds its own files and a line to each list.
- **A feel gate (Q3)** comes once Warm-up plays end to end with sound. The
  design's first risk is that nobody has felt it. You play it on the live
  site behind "In development", with a tuning panel that copies the numbers
  you settle on (question 4). The other elements and sets are built
  while you play.
- **No Part 2 package but Z1 touches `lib/`, and no two packages at work
  at once own one file** (§6.4).
- **The longest chain** is the rules, then the shell, then the elements:
  LA → K2 → R1 → R2 → R3 → U1 → U2 → X1 to X5 → Z1 → F1 (K2 waits on LA,
  which is longer than K1). The look, the motion and the sound (A1 → A2;
  V2 → V3, with V1; N1) meet at S1, which reaches U1 before R3 does when
  R1 and V2 start first (§6.2). The gate, Q3, comes off U2 through T1.
- **What it costs:** about 155 commits. At Rickashay's measured rate
  ($6.99 and about 0.32% of a week a commit, counting its fixes and
  squashed reviews) that is about $1,080 and half a week. Rickashay's own
  plan estimated $890 and it came to $1,314, so read the week again once
  K2 and R1 land (§6.1). It can start at your word: you said on 2026-11-23
  to keep a build going through the weekly limit and resume after the
  reset, and §7 lets it.

```text
Part 1, on fuzz-flux-lift
  LA (pieces) and LL (levels and the specs' helpers), side by side ── Q1

Part 2, on fuzz-flux
  K1 ── K2 (after LA) ──┬── R1 ── R2 ── R3 (also after R0, P1) ── P2 ── P3 ── Q2
                        ├── R0, P1
                        ├── A1 ── A2
                        ├── V1, V2 ── V3
                        └── N1
  S1 (after A2, V3, N1) ── U1 (after R3, LL) ──┬── U2 ──┬── T1 (also after P3) ── Q3, the gate (also after Q2)
                                               └── U3 ──┘
  X1, X2, X3, X4, X5 (after U2, U3) ── Z1 ──┬── F1 (also after Y1–Y3) ──┬── Z2, the finish
                                            └── D1 ──────────────────────┘
  Y1 (after X1, X2, P3) · Y2 (after X1–X4, P3) · Y3 (after X1–X5, P3)
```

---

## 2. Settled before code

### 2.1 Questions for you

Each of these changes what a player sees, touches a live game, or sets how
the work reaches `main`, so each is yours. Each has a recommendation, and
the rest of this file is written as if it were taken.

1. **Where the shared pieces go.** Fuzz Flux needs pieces that live today
   where it can't sensibly take them: the level sets and which levels are
   open, the Levels dialog, the progress a player keeps, the contrast
   check, the easings and the flash limit sit in `@fz/brick-wall`, whose
   rule is that it holds "what the two wall games mean alike"; the
   climbing ladder of notes is Asteroid Breaker's; the sprite's AAC and
   Ogg encoding is Asteroid Breaker's build script's.
   - **Recommended: into the libraries that hold their kind (Part 1),** as
     Rickashay's plan put "pieces any game could use": the levels' rules
     into `@fz/core`, the dialog and stored progress into `@fz/game-ui`,
     the easings beside `@fz/core/math`'s, the test helpers into the
     libraries' `testing` entries, the ladder into
     `@fz/core/sound_mix`, the encoding into `@fz/dev/sounds`. The wall
     games, Asteroid Breaker and Rickashay adopt each in the commit that
     moves it. `@fz/brick-wall` keeps its wall, its run and its board.
   - Or: Fuzz Flux imports `@fz/brick-wall` as it stands. It is quicker,
     but a match-three would depend on a library named and fenced for wall
     games, and the library's own rule would stop being true.
   - Or: copy what it needs. That is a fourth copy of a Levels dialog
     (Brick Breaker keeps one of its own) and is not recommended.
2. **Brick Breaker's own Levels dialog.** Brick Breaker keeps its own copy
   of the dialog `@fz/brick-wall` lifted from it, and it has grown apart:
   its tiles show a tick once cleared, each of three stars held or not by
   its own id (not a count), "Cleared" where there is no best yet, and a
   best for each speed, with a star count on each set and a paragraph on
   stars. The shared dialog could show that only with a mode, which §3.1's
   bar refuses.
   - **Recommended: leave it.** Brick Breaker keeps its dialog, and the
     shared one serves the two wall games and Fuzz Flux.
   - Or: make the shared dialog's tile a template each game hands in, and
     move Brick Breaker onto it: one package more in Part 1, touching a
     third live game, for one dialog in the house.
3. **The design's open choices 2 to 6.** The design is written as if each
   recommendation were taken, and the plan builds them so:
   - **Recommended, all as the design says:** 36 levels in 4 sets; no
     score shown; "Try again" deals the next of a level's 8 proven deals and
     "Restart" plays the same deal again; swap 2 neighbors, never slide a
     row; and the word "brick" for the pile of cushions.
   - Or name any you want otherwise. Dropping Windy days (27 levels) drops
     X5 and Y3; one fixed deal a level changes only `Try again`'s deal and
     the records; showing a score is a line on the Cleared card.
4. **The feel gate.** The design's first risk is that nobody has played it,
   and its numbers were set from storyboards. You follow builds from a
   phone, which can't reach the devbox.
   - **Recommended: play it on the live site, behind "In development",**
     once Warm-up plays end to end with sound (Q3). At your word, the work
     so far is merged into `main` and deployed with the game's tile marked
     "In development". Under `?debug` a tuning panel holds every number of
     "The feel, in numbers" with a slider, and a Copy numbers button that
     puts what you settled on into the clipboard to paste back here. The
     elements and the other sets are built while you play.
   - Or: wait for the end and play the whole game once, with the risk that
     the numbers move after every level is built on them.
5. **Part 1 on its own.** The lifts change three live games (Brick Fuzz Pop,
   Rickashay, Asteroid Breaker's sound script and its pilot's faces, and
   Brick Breaker only if your answer to question 2 is the other way) and
   touch nothing of Fuzz Flux.
   - **Recommended: merge Part 1 into `main` alone once Q1 passes, at your
     word,** as the last two builds did. It ships the refactor while it is
     fresh and keeps later rebases of the game's branch small.

`design.md` takes your answers and the calls below where they belong, so
the design and the build agree. That is the first commit on
`fuzz-flux-lift`, made by the orchestrator before any package starts, so it
reaches `main` with Part 1.

### 2.2 The plan's own calls

These fill what the design leaves open or meet the house's code where the
design couldn't see it. None reopens a choice that is yours. Each can be
overturned without unpicking the rest.

**C1. The sketch is the oracle.** The rules are a port of
`sketch/engine.mjs` into TypeScript, laid out by the house's layers, and
held to it by golden games (R0): for each, the board after every wave, the
wave's bunches, blasts and hits, the goals left and the moves left must be
what the sketch's are. A rule the build changes on purpose is changed in
the sketch in the same commit, its report run again and its golden games
written again, so the sketch, the design's figures and the game never part.
A difference found in the sketch that is a fault, not a rule, is fixed the
same way and named in the commit.

**C2. The sketch's hash, kept.** Every deal draws from one stateless hash
of four whole numbers, and the 288 proven deals depend on it bit for bit.
`@fz/core/random` gains it as `hashOf(a, b, c, d)` (LA1), a new function
pinned in `random.spec.ts`, since the fences refuse `Math.imul` in a game's
rules. What each draw is for (the opening fill, a lane's refill, a wisp's
tie, a burr's spread, a shuffle, the encore) is a named salt in the game's
`src/rules/draws.ts`, as `@fz/core/random` names its streams.

**C3. A game in play is its moves.** The rules are deterministic, so the
saved game is the level, its deal and the moves made, and a reload replays
them (33 moves at the sketch's 99th percentile is under 15 ms). The bug
report keeps the same three, so a reported game replays exactly. The
saved game is version 1 of `fuzz-flux-game`, read as `frontend/games/AGENTS.md`'s
"Saved games outlive the code" says: an entry whose level is gone, or whose
moves don't replay, is dropped.

**C4. Records and stars.** A level's record is its stars and its most
moves to spare. 1 star for clearing, 2 and 3 at the level's own thresholds
(`stars` in its JSON, set by the sketch). Levels open as the house's level
games do: level 1, any cleared level, and the one after a cleared level
(`@fz/core/levels`' `isOpen()`, LL1).

**C5. A level is a run.** Fuzz Flux has no chain of levels and no loss
that ends more than a level. Its `GameService` extends `@fz/game-ui`'s
`RunLifecycle`, as `frontend/games/AGENTS.md` asks of a game drawn with
Phaser, with a level as the run: it is playing, cleared or over (out of
moves). A game with no clock has nothing to pause, so looking away lands
the move that plays at once and puts down a held fuzzball, and coming back
finds the board at rest. `@fz/brick-wall`'s `RoundDriver`, `RunRecords`,
`Stats` and `ResultComponent` are not used: each assumes a run of levels
that a loss ends.

**C6. Speed is a setting.** Normal or Fast (the sketch's Fast, 1.6 times),
in Settings, as Brick Fuzz Pop's Speed is. The encore's tap that plays the
rest 4 times as fast is the encore's own. There is no fast-forward switch.

**C7. Less motion is a setting too, on when the system asks.** The design
asks for a "Less motion" switch and the system's setting. No game in the
house has the switch yet: each follows `GameViewportService.allowsMotion()`.
Fuzz Flux's Settings has it, on by default where the system asks for less
motion, and what it turns off is the design's list ("Accessibility"). It
stays the game's own until another game wants it (§3.4).

**C8. The six kinds wear the house's eyes and inks.** Their bodies are the
design's silhouettes (`art/fuzz.mjs`), redrawn with `@fz/phaser/shapes`'
curves, since nothing in `frontend/` reads an SVG path. Their eyes are the
house fuzzball's, from `@fz/style/fuzzball`'s faces through
`@fz/phaser/fuzzball`'s `eyesCommands()`: rest, blink, happy, eep (wide),
sleepy, and a new `cross` for a burred fuzzball (LA3). Their colors are
`@fz/phaser/color`'s `FUZZBALL_INKS`, made to tell fuzzballs apart in every
palette: blue, coral (the red kind), gold (amber), green, violet and pink.
The design sampled its colors from pictures and said the build would take
the real tokens. It drew two palettes; the house has four (Classic felt,
Soft pastel, Casino night and Midnight blue), and every color is held in each.

**C9. One atlas, and the eyes apart.** Each body is baked once a pose:
kind by special fur (none, dasher across, dasher up and down, puffer,
wisp) by fur at rest or on end, and the frizzball and sleepyhead. The eyes
are a sprite of their own a face, so a look moves the eyes rather than
picking a frame. Squash, stretch, lean and hop are scale, rotation and
position. Fur that trails a moving body (the design's "Fur follows") is a
lean frame and a little rotation; whether that is enough is for the gate.

**C10. The view plays a timeline.** `timelineOf(record, board, feel,
pace)` is pure, in the view, and returns every track of the move (each
piece's position, scale, rotation, fade and eyes over time), every effect
spawned, every sound cue and every flight to the goal, with the design's
limits applied (420 loose bits, 14 flights, the sounds' gaps, one flash
every 350 ms). The scene samples it at the frame's time into records it
reuses. The design's numbers are `FeelTuning`, handed in and tuned under
`?debug` through `@fz/game-ui/debug_menu`'s `createTuning()`.

**C11. The sounds are rebuilt on the house's synth.** The design's 46
recipes are written again in `tools/build-sounds.mjs` on `@fz/dev/synth`
and `@fz/dev/sounds`, held to the design's `sound/measures.md`, and shipped
as AAC and Ogg (LA6), as Asteroid Breaker's are: a 27-second sprite as the
house's 16 kHz WAV would be about 860 KB, twice the largest today. A wave's
note climbs the design's ladder (C5 to A6, C major pentatonic) by detune,
the ladder handed to `@fz/core/sound_mix`'s `ladderCentsOf()` (LA2) as
data, and plays through `@fz/phaser/sound`'s
`SpritePlayer`. The sound lab plays each sound beside the design's own take,
so the gate judges by ear.

**C12. The board for keys and screen readers is a grid over the canvas.**
An Angular Aria `ngGrid` laid over the drawn board, as Minesweeper's and
Sudoku's boards are, one tab stop, a name a square ("red, caged", "blue
dasher, across"), and the canvas hidden from assistive technology. It lets
pointer events through to the canvas. No game in the house has a grid over a
canvas yet (§10).

**C13. The level files are the source.** The sketch's JSON, all four
sets, is copied into `src/rules/levels/` as it is (P1). A level is redrawn
only for a failed check, or at your word, and a redraw is a package of its
own that runs alone (§6.4), since it rewrites files every set shares: it
redraws the level in `docs/fuzz-flux/levels/drafts.mjs`; runs the sketch's
`report.mjs` (through the queue), `levels/build.mjs` and `golden.mjs` again;
copies the sets' JSON and golden data again; updates design.md's tables for
the level; and certifies the set again. So the sketch, the design and the
game read one level (C1). The reason goes in its commit.

**C14. Certification is the game's own.** `@fz/dev/certify` is built for
wall games (depths, aims, a beam over shots), and the sketch proved all 36
levels on one thread in 10 seconds. Fuzz Flux's `tools/certify-deals.mjs`
runs the ported proof on one thread, waiting its turn in the queue
`yarn verify:changed` keeps (`@fz/dev/queue`'s `waitForTurn()`), and writes
each set's certificates as the sketch's `certificates.json` keeps them.

**C15. Hint is the careful player's move.** After 7 seconds with no move,
or at once on Hint or H, the two fuzzballs of the move the ported careful
player would make hop twice. It can't see the deal, so a hint never gives
away what falls in. On a level that teaches something, the level's own
`hint` is shown by a hand instead.

**C16. Names and numbers:** port 9008; storage keys `fuzz-flux-settings`,
`fuzz-flux-records`, `fuzz-flux-progress` and `fuzz-flux-game`, each at
version 1; the bug report's tag `ff1`; the board's name "Fuzz Flux, level
16: Checkerboard"; the catalog's entry in Arcade beside Rickaashay, with
`inDevelopment: true` until the finish and a trademark search.

**C17. The wind is built like the other elements.** The gate plays
Warm-up, which has no wind, so holding the wind for it would teach
nothing. The design names the wind as what does least on a full board,
and level 30 as one that may want a gap. Y3 adds a column to
`report-levels.mjs`, how often a turn of the wind moves a fuzzball, and
when Y3 lands you decide level 30 by it; a redraw then runs before F1, as
C13 says. Dropping the set is question 3.

**C18. Flights may outlast a move.** A fuzzball can still be flying to its
goal when the board takes the next swap, as in the design. The bar's
counts land with the flights; the rules counted them already.

**C19. The shake dies away by time.** The sketch takes 14% off the shake a
frame of its own, at 60 a second, so on a 120 Hz screen it would die twice
as fast. The build keeps what the sketch shows, by time: the shake halves
every 77 ms and stops below 0.05 px; the design's figures are its whole
width, so it reaches half of one each way; and where two overlap, the
larger holds. Its wobble comes from `shakeOf()`'s rates, not a random
number, so a frame is the same every run. `shakeOf()` takes its fade as a
function handed in (LA4): the wall games hand in today's straight line,
Fuzz Flux this one.

**C20. The end of a level keeps one beat.** The encore, the Cleared or
Out of moves card, each star lit and its note are timed by the view, as
part of the level's last timeline. The scene's clock, the one it samples
the timeline by, is the only clock: the encore's hurry runs that clock
four times as fast rather than building the timeline again, and the card,
in the shell, lights each star when that clock passes its beat, while the
scene plays its note. A card's button plays `button` through the same cues.
Where a move lands at once (C5), the cues already passed are dropped and
every star shows lit. V2, S1 and U2 each spec this. So sound and picture
never drift apart.

---

## 3. What it reuses

### 3.1 The bar for a lift

As `docs/archive/shared-lib-plan.md` set it, and as the last two builds kept
it, a piece is lifted when:

- its users mean the same by it;
- its API is small, with no mode flags: what differs is data or a function
  handed in, never a boolean that picks a code path;
- every adopter gets shorter, or stays as it is and loses a copy;
- it keeps the layers' fences;
- it is lifted from the code that has it, and adopted there in the same
  commit, with Fuzz Flux's case specced at the lift from the design, so the
  shape fits before Part 2 starts.

Two pieces are added for their first user: `hashOf()` (LA1), because a
game's rules may not hold it (C2), and the `cross` face (LA3), because the
house's faces are drawn in one place. A piece that fails the bar once written
stays where it is, its package says so in its report, and Z1 looks at it
again.

### 3.2 Taken as it is

Most of what Fuzz Flux needs is already shared. Each line is what it is
used for here.

| Library       | Entries                                                                                                                                                                                                                                                                                                                | For                                                                                                                                                                  |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@fz/dev`     | `vite`'s `gameConfig()`; `eslint`'s presets and `phaserGameLayers({ exact: true, heldAsRules })`; `vitest`'s `angularTests()`; `layout`, `chrome`, `board-page`; `screenshots`; `script`; `queue`; `mutants`; `report`; `synth`, `sounds`, `sound-lab`                                                                 | The workspace, its fences and its three Vitest projects; `check:layout`; the screenshots; the tools; the report's tables; the sounds and the lab                     |
| `@fz/game-ui` | `run_lifecycle`, `game_bar`, `bar_overflow`, `bar_sound`, `settings_drawer`, `help_dialog`, `help_catalog`, `play_room`, `viewport`, `breakpoints`, `bug_report`, `debug_menu`; the `game-frame`, `bar-size` and `bar-*` mixins                                                                                        | The level as a run (C5), the bar, Settings, How to play with a picture an entry, away and refocus, the room and motion, the bug report, the tuning panel             |
| `@fz/ui`      | `storage`, `announcer`, `dialog`, `confirm`, `on_demand`, `icon` (`bulb`, `restart`, `star`, `star-outline`, `sound`, `settings`, `help`), `theme`                                                                                                                                                                     | Records and the game in play; what a move did, said; the cards' dialogs; Restart's question; How to play and the debug menu loaded on demand; the palette            |
| `@fz/phaser`  | `canvas` (`<fz-phaser-canvas>`, `<fz-canvas-cards>`, `boardHostOptions()`); `scene` (lifetime, keys, `bakeAtlas()`, `retakeFrames()`, `softDisc()`, `strokeShareArc()`, `picturesWhenAsked()`); `shapes` and its curves; `fuzzball` (`eyesCommands()`, `staticSparkCommands()`); `color`; `layout`; `sound`; `testing` | The canvas and its cards, the scene's life, one atlas, the flash disc and rings, the art, the eyes and the frizzball's static, the inks, the board's fit, the sprite |
| `@fz/core`    | `random`, `turns`, `frame_sounds`, `sound_mix`, `run`, `keys`, `json`, `records`, `format`, `math`, `clock`                                                                                                                                                                                                            | Draws, the effects' pools, sounds once a frame, the mix, the stages, shortcuts let through, stored data read back, counts and lists in words, the cards' beat        |
| `@fz/style`   | tokens; `canvas-board-host`, `board-focus-ring`, `board-card-layer`, `board-card`, `result-card`, `start-tile`, `help-text`, `setting-fields`, `visually-hidden`, `tap-target`; `themes`; `fuzzball`; `testing`                                                                                                        | The page, the board's host and ring, the cards, the Levels tiles, How to play, Settings, the palettes, the eyes' faces, the contrast spec                            |

Patterns copied, not imported:

- **Snake's workspace,** the house's starter for a game drawn with Phaser,
  with Rickashay's configs in place of Snake's: the fences with `exact` on,
  the three Vitest projects and their floors, `tools/eslint_config.spec.ts`.
- **Snake's and Rickashay's board,** a `<fz-phaser-canvas>` whose scene is
  a lazy `import()`, handed plain functions (`SnakeSceneOptions`,
  `RickashaySceneOptions`), and Rickashay's `onPictures`, which hands the
  shell the art as pictures for the bar and How to play.
- **Minesweeper's and Sudoku's `ngGrid` boards,** with the one delegated
  listener both keep (`squareOf()`), and Sudoku's `boardKey()`, its keys
  read by `event.code` (C12).
- **Snake's `SwipeReader`,** as the model for the gesture reader.
- **`@fz/brick-wall/view/palette`'s** mapping of a palette's roles into
  numbers for Phaser, through `ThemeService.roles()`.
- **Rickashay's tools:** `check-layout.mjs` with a stored game
  (`stored_run.mjs`), `capture-screenshots.mjs`, `report-levels.mjs`, and
  the typed `*_api.ts` entries the scripts load through Vite, each with a
  spec.

### 3.3 Part 1: the packages

Every lift is adopted by the code that had it, in the commit that makes
it, and that copy is deleted there. A piece added to a library changes its
row in the `fuzzley-ui` or `phaser-core` skill in the same commit, as
`frontend/AGENTS.md` asks.

**LA. Pieces, into the libraries that hold their kind** (after nothing; 5
commits, each in one library, so each check reaches every app that uses
it):

1. _`@fz/core/random`'s `hashOf(a, b, c, d)`,_ the sketch's hash, written
   out as `sketch/engine.mjs` has it, and pinned in `random.spec.ts`
   against what the sketch prints for a dozen inputs, negative and past
   2³¹ among them. Its doc comment says what it is for: a draw that keeps
   its place whatever else a move drew.
2. _`@fz/core/sound_mix`'s `ladderCentsOf(note, ladder)`,_ from Asteroid
   Breaker's `src/view/effects/sounds.ts`, the ladder handed in as data,
   with the sound kit's ladder written out beside it as numbers
   (`CHAIN_CENTS`), which Asteroid Breaker imports in place of its copy.
   `@fz/dev/synth` keeps its own, worked out from its steps, since the
   modules of `@fz/dev` that Node runs may not import `@fz/core`;
   `synth_music.spec.ts` holds the two equal. Rickashay's `rallyCentsOf()`
   reads its own `RALLY_CENTS` through it. Rickashay's "As built" named
   this lift for later.
3. _The `cross` face,_ in `@fz/style/src/fuzzball.ts`: in `FuzzballFace`
   and `FUZZBALL_FACES`, its marks drawn in `eyesOf()` as the house draws
   a face, which `@fz/phaser/fuzzball`'s `eyesCommands()` then draws
   unchanged. Asteroid Breaker bakes every face in `FUZZBALL_FACES`
   (`src/view/art/pilot_art.ts`, its `EYES_FRAMES` a record over every
   face), so its atlas gains this one frame, never shown; its pictures
   don't change. Every other face is the same pixel for pixel, which the
   art specs hold.
4. _`@fz/core/motion`,_ a new entry beside `@fz/core/math`, whose
   `easeOutCubic()` and `lerp()` it uses: `easeOutBack()`, `swellScale()`,
   `flareScale()`, `ringScale()` and `shakeOf()`, with `OVERSHOOT`,
   `SWELL`, `FLARE_FROM`, `RING_FROM` and `SHAKE_RATES`, from
   `@fz/brick-wall/view/easing`; and `MOST_BLINKS_A_SECOND` and
   `blinkShows()` from `view/blink`. `shakeOf()` takes its length, its
   size and its fade as arguments where it read the wall's `SHAKE_MS` and
   `SHAKE_CSS_PX` and faded in a straight line; the wall keeps those and
   hands in that line (C19). `@fz/core`'s rule of exact arithmetic is
   `math.ts`'s and `sweep.ts`'s, and a game's view may import any of
   `@fz/core`, so no fence changes. `@fz/brick-wall`'s view and both wall
   games import it from there.
5. _`@fz/dev/sounds`' `encodeSprite()`,_ from `findFfmpeg()` and the
   encoding in Asteroid Breaker's `tools/build-sounds.mjs`: AAC and Ogg
   from a WAV sprite, the beds' stereo encoding with it, and the command
   runner handed in so the spec runs without `ffmpeg`. Asteroid Breaker
   adopts it in the same commit. Without `ffmpeg` its script still leaves
   the sprite as it is and exits 0, as it does now. Its sprites, written
   again, are the same bytes, or, where the devbox's `ffmpeg` writes other
   bytes, the same spritemap and lengths, with the committed files kept
   and the difference named in the commit.

**LL. Levels and the specs' helpers, into the libraries that hold their
kind** (after nothing; 7 commits, each in one library):

1. _`@fz/core/levels`,_ from `@fz/brick-wall/rules/progress`: `levelsOf()`,
   `levelAt()`, `levelIdOf()`, `isOpen()`, `clearedOf()` and the
   `IdentifiedLevel`, `NumberedLevel` and `LevelSet` types. Brick Fuzz Pop
   and Rickashay import it from there.
2. _`@fz/game-ui/levels`,_ `LevelsComponent` (`fz-levels`) with
   `levelMarksOf()`, from `@fz/brick-wall/app/levels`. The line under its
   heading, which says what choosing a level does, becomes the game's own,
   projected, and each wall game passes today's words, so its dialog reads
   as before.
3. _`StoredProgress` and the `StoredAt` it takes,_ from
   `@fz/brick-wall/app/stored` into `@fz/game-ui/levels`. `StoredStats` and
   `keepRun()` stay, as they keep a run, and import `StoredAt` from there.
4. _`@fz/core/testing`:_ `SIM_TIMEOUT_MS`, `sortedTimes()`, `quantile()` and
   `described()`, from `@fz/brick-wall/testing/timing`.
5. _`@fz/phaser/testing`:_ `recordBakes()`, `stampsIn()`, `drawsIn()` and
   `fillsIn()`, from `testing/bakes`.
6. _`@fz/ui/testing`:_ `loadsSettled()`, from `testing/settled`.
7. _A testing entry of `@fz/style`'s own,_ beside `@fz/style/testing`:
   `holdContrast()` with `expectContrast()`, `contrastOf()`, `against()`,
   `ContrastPair`, `GRAPHIC` and `TEXT`, from `testing/contrast`. It imports
   `@fz/style/themes` and `@fz/style/testing` by their package names, as
   the files apps load must, and `lib/style/AGENTS.md`'s rule names it
   beside them.

In each of 4 to 7, a helper goes only where its imports are already the
library's and it loads no Angular into a `pure` spec; `boardCanvas()` and
`CHROME_CSS_PX` stay, since they read the wall's margin and `@fz/game-ui`.
The testing skills that name a moved helper by its path change in the same
commit: `brick-wall-testing`, `brick-fuzz-pop-testing` and
`rickashay-testing`. Each step keeps the games' pages as they were:
`check:layout` passes and a retake of their screenshots, without
`--force`, moves no image. If your answer to question 2 is the other way,
a third package, LB, moves Brick Breaker onto the shared dialog after LL.

**Q1. Part 1's gate** (the orchestrator; after LA and LL): every
certificate of Brick Fuzz Pop and Rickashay replays; the three games'
screenshots retaken without `--force` move no image; their main and scene
chunks are within 1% of `main`'s; Asteroid Breaker's atlas differs only by
the `cross` eyes, and its sprite plays in its sound lab. Then
`merge-to-main` at your word (question 5).

### 3.4 Not lifted, and why

- **`@fz/brick-wall`'s run:** `run.ts`, `stats.ts`, `end_words.ts`,
  `RoundDriver`, `RunRecords`, `StoredStats`, `keepRun()` and
  `ResultComponent`. Each assumes a run of levels that a loss ends (C5).
- **Its wall:** the board, panels, painters, playback, aiming, solver,
  careless player and holders, and `@fz/dev/certify` (C14).
- **`FastForwardComponent`:** there is no fast-forward (C6).
- **Snake's `SwipeReader`:** Fuzz Flux reads one swipe a press, at 0.4 of
  a square, and a tap below that; Snake reads a turn every 24 px of a
  gesture. One reader for both would need a mode.
- **The `ngGrid` board:** Minesweeper and Sudoku each keep theirs on a DOM
  board, and Fuzz Flux's lies over a canvas. The pattern is copied (C12).
- **Minesweeper's long press and Asteroid Breaker's haptics:** the design
  has neither.
- **New here, with one user:** the spring, the move's timeline, the fluff,
  static and goal flights, the gesture reader, and the Less motion switch
  (C7).

**Z1 looks again,** once the game's shell exists, at: the spring and the
effects beside `@fz/brick-wall`'s `EffectsPainter` and Snake's; the gesture
reader beside `SwipeReader`; the grid over the canvas beside the DOM grids;
the Less motion switch; and anything a review found written twice.

---

## 4. The game's architecture and contracts

### 4.1 Folders

```text
games/fuzz-flux/src/
  rules/
    tuning.ts, draws.ts       the rules' numbers; the named salts hashOf() draws by (C2)
    catalog/                  kinds.ts, specials.ts, elements.ts, pieces.ts
    board/                    cells.ts, board.ts, orientation.ts, legend.ts, picture.ts, deal.ts
    bunches/                  find.ts, makes.ts
    blasts/                   dasher.ts, puffer.ts, wisp.ts, frizzball.ts, pairs.ts, chain.ts
    elements/                 element_rule.ts, element_rules.ts, <element>.ts
    move/                     swap.ts, settle.ts, refill.ts, wave.ts, goals.ts, record.ts, play.ts,
                              shuffle.ts, hint.ts, encore.ts, benchmarks/
    wind/                     gust.ts
    levels/                   level.ts, level_rules.ts, levels.ts, <set>.json,
                              certificates/<set>.json, every_level/, every_floor/
    golden/                   <set>.json, samples.json, golden.spec.ts
    run/                      stars.ts, records.ts, saved_game.ts, reported_game.ts, describe.ts
  view/
    colors/                   palette.ts, inks.ts
    art/                      frame_names.ts, kinds/<kind>.ts, specials.ts, eyes.ts,
                              elements/<element>.ts, fluff.ts, marks.ts, frames.ts
    board/                    metrics.ts, spaces.ts
    input/                    gesture.ts, picking.ts, keys.ts
    timeline/                 feel.ts, timeline.ts, tracks.ts, pace.ts, limits.ts, events/<event>.ts
    effects/                  sounds.ts, cues.ts, flashes.ts, cheer.ts
    idle/                     blinks.ts, breaths.ts, hint.ts
    debug/                    tuning_menu.ts
    run_state.ts
  scene/                      fuzz_flux_scene.ts, atlas.ts, layers.ts, pictures.ts, painters/, sounds/
  app/                        play/, board/, bar/, cards/, levels/, help/ (entries/<thing>.ts),
                              settings/, stats/, debug/, bug_report/, tokens.ts, app.component.*
  testing/                    board_picture.ts, move_fixtures.ts, golden.ts, dice.ts, casual.ts,
                              careful.ts, proof.ts, certify_api.ts, report_api.ts, kept_run.ts,
                              script_api.ts, screenshot_api.ts
tools/                        certify-deals.mjs, report-levels.mjs, build-sounds.mjs, sound-lab.ts,
                              check-layout.mjs, capture-screenshots.mjs, stored_run.mjs,
                              eslint_config.spec.ts
docs/fuzz-flux/sketch/golden.mjs    the golden games' writer, beside the engine it plays (R0)
```

- **The fences** are `phaserGameLayers()` with `exact` on, and every file in
  `src/testing/` that a script loads held as the rules are, each named by
  the package that writes it, in the same commit (§6.4);
  `tools/eslint_config.spec.ts` holds the config, as Rickashay's does.
- **One file an element** in the rules, the art, the timeline's events and
  How to play, so each X package adds files and a line to each list.
- **No folder inside a layer is named `view`, `scene`, `app` or
  `testing`,** which the fences match anywhere in a path.

### 4.2 Coordinates and orientation

- **A square** is an index, `y * width + x`, in the board's own frame: x
  across from the left, y down from the top. `Square` (`{ x, y }`) is for
  pictures, words and the view.
- **The board's frame turns with the wind,** as the sketch's does (design
  decision 11): the rules always fall down, and a wind to the right is the
  board turned a quarter. `orientation.ts` turns a board and maps a square
  between the board's frame and the screen's (`onScreen()`). Everything
  outside the rules sees the screen's frame only: the record is written
  back in it, and a move comes in in it.
- **Refills are drawn a lane at a time,** each lane counting its own draws
  in each frame (the sketch's `spawned[rot][x]`), so a bunch elsewhere
  never changes what falls in here, and a level replays the same for the
  same moves whichever way the wind has turned.

### 4.3 The rules' contracts (K2 writes them)

- **The catalog:** `KIND_IDS` (blue, red, amber, green, violet, pink),
  `SPECIAL_IDS` (`dasher-across`, `dasher-down`, `puffer`, `wisp`),
  `ELEMENT_IDS` (dust, brick, cage, sleepyhead, burr) and `GOAL_IDS`, each a
  list with its union derived from it (`as const satisfies`).
- **`Piece`,** a union: a fuzzball (its id, kind, special or none, caged,
  burred), the frizzball, a brick (its layers, 1 to 4) and a sleepyhead.
  Every element is in it from K2.
- **`Game`:** the board (its width and height, which squares are open,
  the pieces, the dust's layers, the beds), the frame's quarter turns, the
  kinds in play, the goals left, the moves left, the moves played (which
  salt the draws, and which the encore doesn't count down, so they can't be
  worked out from the moves left), the deal's seed, the lanes' counts, the next piece's id, the wind's turn and its moves to wait, and
  the outcome. Nothing outside `play()` changes one.
- **`MoveRecord`,** what `play()` returns beside the next `Game`, in the
  screen's frame: the swap (from, to, and whether it made a bunch); the
  waves; a burr's spread; the gust (the frame's turn and its own waves); a
  shuffle; and the outcome (`playing`, `cleared`, `over`). A **`Wave`** has
  its number, its bunches (cells, kind, what it makes and where), its
  blasts (the special, where, the cells it strikes in order, and when each
  is struck, as a count of steps), its hits (a union by what: gathered,
  uncaged, unburred, knocked, broken, dusted, born, bedded; each with its
  square, piece, rank and source), its falls (each piece's path, its lane,
  and whether it came in from above) and the goals left after it. It is
  the sketch's record, typed, with the house's words.
- **`ElementRule`,** the hooks an element's rule plays through, each
  optional: whether it holds a swap, a fall or a bunch; what a bunch of it,
  a bunch beside it and a blast do to it; what happens once the board
  settles (a sleepyhead put to bed) and once a move ends (a burr's spread);
  its rank for a wisp; and the goal it counts for. `ELEMENT_RULES` is a
  record over `ElementId`, whole from K2: an element whose package hasn't
  landed has a stand-in that does nothing, listed in `STAND_INS`, which each
  X package takes its id off, so the golden games of its levels run.
- **`Level`,** read from a set's JSON by a reader that refuses what it
  can't trust: id, name, idea, what it brings, kinds, moves, goals (a union:
  gather so many of a kind, or every dusty square, brick, cage or
  sleepyhead), the board's picture, dust, specials, wind, the hint, its 8
  deals and its 3 star thresholds. The legend is the sketch's.

### 4.4 The view's contracts

- **`FeelTuning`,** every number of the design's "The feel, in numbers", the
  shake table and the limits, as one record of numbers with a name each,
  which `createTuning()` takes. Nothing in the view reads one from a module.
- **`Timeline`:** each piece's track (keys of position, scale across and
  down, rotation, fade, lift, its eyes' face and look, each with an
  easing), the effects it spawns (fluff, a ring, a streak, a bolt, a flash,
  a shake, the dimming), the flights to the goal, the goal bumps, the "×3"
  marks, and the sound cues, each at a time in milliseconds from the tap;
  and when the board is at rest. `sampleAt(timeline, ms, into)` writes a
  frame into records the scene reuses.
- **`RunState`,** one record of what the shell shows, replaced whole: the
  level, the moves left and whether they are low, each goal's count and
  whether it is met, the wind and the moves until it turns, the new
  thing's line, the card, and the board's names for the grid.
- **The frames' names and the sounds' names,** each an `as const` list, so
  the art, the scene and the sound script can't disagree. The sounds are
  the design's 46.
- **`src/testing/move_fixtures.ts`:** a hand-made record for each kind of
  event, so the view, the scene and the shell play a move before `play()`
  exists. Once R3 lands, a spec holds each fixture to what `play()` makes of
  its board and swap, or names why it is hand-made.

### 4.5 How a move runs, end to end

1. **The player swaps:** a swipe read at 0.4 of a square, two taps, or the
   keys. While a move plays, one swap is kept for when the board rests, and
   a later one takes its place.
2. **`play(game, from, to)` runs once** and returns the next `Game` and
   the whole `MoveRecord`. A swap that makes no bunch is refused, costs
   nothing, and plays its 240 ms shake of the head.
3. **The move is saved at once** (C3), so a reload mid-move comes back
   after it, at rest.
4. **The view builds the timeline** from the record, at the player's speed
   and with Less motion as set, and the shell announces the move in words.
5. **The scene plays it,** sampling the timeline each frame; the bar's
   counts land as the flights do.
6. **At rest,** the next kept swap plays, the hint's clock starts again,
   and at 5 moves left the count turns to the warning color once.
7. **A cleared level** plays the encore (the rules' `encore()`, a record
   like any move's, which a tap hurries 4 times), then the Cleared card. A
   level out of moves shows the Out of moves card.

### 4.6 Determinism, written into the rules

- The rules add, subtract, multiply, divide, shift and compare whole
  numbers, and nothing else. The fences hold the arithmetic.
- Every draw is `hashOf()` with a named salt (C2). The rules read no
  clock, and nothing else draws.
- Every order is written down, as the sketch's is: bunches by their first
  square, blasts by when they are reached and then by square, hits by
  rank, falls by column left to right and then bottom first. No result
  depends on the order a `Map` or `Set` was filled in, and every
  comparator is a total order.
- `play()` keeps its working state in arrays inside its module, never
  changes the `Game` it is handed, and returns a record nothing may
  change.

---

## 5. Work packages

Each package is a fresh worker's run, ending with its commits made, every
review in and answered, its checks passing and its report written (§6).
"After" lists what must have landed first. A package that changes what a
skill or an `AGENTS.md` describes changes it in the same commit. The
commit counts are a guide: a package keeps to three to nine.

### 5.1 Part 1

§3.3 has them: LA, LL and Q1.

### 5.2 Part 2

#### K: the start

**K1. The workspace** (after nothing; 3 commits):

1. `games/fuzz-flux/`, a copy of Snake's workspace as
   `frontend/games/AGENTS.md` says, with Rickashay's configs in place of
   Snake's: the fences of §4.1; three Vitest projects, `pure` (the rules,
   the view, the helpers, the tools), `sim` (the golden games, the
   replays, the floors, the benchmarks) and `dom` (the scene and the
   shell), with their floors (§9); `tools/eslint_config.spec.ts`;
   `gameConfig({ port: 9008, name: "Fuzz Flux" })`; a page that names the
   game.
2. The site: `site/games.json`, the catalog's entry (C16), and the lists in
   `README.md` and `docs/operations.md`.
3. `src/main.ts`'s providers, the bug report's source tagged `ff1`, and a
   shell with its announcer and confirm dialog.

**K2. The contracts** (after K1, LA; 4 commits): §4.3 and §4.4.

1. `rules/catalog/`, `rules/board/{cells,board,legend,picture}.ts`,
   `rules/{draws,tuning}.ts`, and `src/testing/board_picture.ts`, whose
   `boardFrom()` reads a board drawn as text in the levels' legend.
2. `rules/move/record.ts`, `rules/elements/{element_rule,element_rules}.ts`
   with every element a stand-in, and `rules/levels/level.ts` with its
   reader.
3. The view's: `FeelTuning` at the design's numbers, the `Timeline` types,
   `RunState`, and the lists of frames and sounds
   (`view/art/frame_names.ts`, `view/effects/sounds.ts`).
4. `src/testing/move_fixtures.ts`.

#### R: the rules

**R0. The golden games** (after K2; 3 commits):

1. `docs/fuzz-flux/sketch/golden.mjs`, which plays the sketch's engine as it
   is over each level's 8 deals along its certificate's line, 4 seeded
   games a deal of random legal moves to the level's end, and 2 games a
   level that go on to 60 moves, for long cascades, shuffles and spreading
   burrs. It writes `games/fuzz-flux/src/rules/golden/<set>.json` (each
   game's level, deal and moves in the screen's frame, and a digest a move)
   and `samples.json` (one game a level written out whole, to read a
   failure by). A digest is the board after each wave in the screen's frame
   (each square's piece, special, cage, burr, layers, dust and bed), the
   wave's bunches, blasts and hits in their order, the goals left and the
   moves left, written as text and hashed. It writes the same bytes every
   run, formatted as Prettier lays them out.
2. `src/testing/golden.ts`: the same digest from a `Game` and a
   `MoveRecord`, and a game replayed through a `play()` handed in against
   its digests,
   which on a mismatch prints that move's two digests side by side. Its
   spec has a case it catches and one it lets by.
3. The digests' agreement: a spec that reads `samples.json` and holds
   `golden.ts`'s digest of each written-out wave to the sketch's text, so
   the two digests can only differ by what was played.

**R1. The board, bunches and the fall** (after K2; 6 commits):

1. `board/cells.ts` and `orientation.ts`: neighbors and lines, the frame's
   turn and `onScreen()`, the lanes a frame (§4.2).
2. `bunches/find.ts`: lines of 3 or more, squares of 4, and touching
   bunches as one; `makes.ts`: what a bunch leaves and where, by the
   design's table and its order of precedence.
3. `move/swap.ts`: `canSwap()`, `swapWorks()`, `legalMoves()`, each
   element's hold asked through its rule, and `bunchMatesOf()`, the
   fuzzballs that could bunch with one picked up.
4. `move/settle.ts` and `refill.ts`: straight falls, the roll from
   diagonally above into a square held up, gaps fallen past, and refills a
   lane at a time through `hashOf()`.
5. `board/deal.ts`: a deal's opening board from its seed, retried by salt
   until no bunch stands and there are 2 moves, as the sketch does.
6. Property specs over random boards: after a settle no bunch stands, no
   piece is doubled or in a gap, and no square that could be filled is
   empty.

**R2. The specials** (after R1; 7 commits):

1. Making each, the dasher running the way it was made.
2. The dasher and the puffer going off, from themselves outward, each
   square's step written into the blast.
3. The wisp: its target by the design's order, the farthest of equals,
   then a tie drawn by `hashOf()`; a wisp carrying a dasher or a puffer.
4. The frizzball: its kind when swapped with a fuzzball, the commonest
   kind when set off another way.
5. Chains: a blast that reaches a special sets it off, in the order of
   §4.6; a held special tapped.
6. The seven pairs.
7. Each storyboard of a pair or a special drawn as a picture and played
   (two dashers, a dasher and a puffer, two puffers, two wisps, a frizzball
   and a dasher, two frizzballs).

**R3. The move** (after R2, R0 and P1; 6 commits):

1. `wave.ts`, `goals.ts` and `play()`: the swap, the waves to rest,
   gathering and the goals counted, a refused swap, the moves, cleared and over; the wind's
   turn after a move asked through a hook, a stand-in until X5.
2. The elements' moments through their rules, each tried with elements
   made up in the specs; and dust, Warm-up's one element, as
   `elements/dust.ts`, off `STAND_INS`.
3. `shuffle.ts`: with no swap and no special, the plain fuzzballs trade
   places until there is a move.
4. `hint.ts` (C15), the careful player's choice: every legal move rated by
   the board it leaves once settled, guessing at what falls in, ported from
   `bots.mjs`' `carefulMove()`; and `encore.ts`: each spare move a special
   set off, at most 12, as a record.
5. `golden/golden.spec.ts` in `sim`, over every golden game whose level
   has no element in `STAND_INS` and no wind, read from P1's copies of the
   sets; and the sketch's own check, 28,000 random moves across those
   levels' boards, each leaving the board whole. Both take in each level
   as its element lands, with no edit: an X takes its id off `STAND_INS`,
   and X5 lets in the wind.
6. The benchmarks in `sim` (§9), and each of K2's fixtures held to
   `play()`.

#### P: the levels and their proof

**P1. Warm-up and the rules a level keeps** (after K2; 3 commits):

1. `levels/level_rules.ts`: the design's rules for a level: 6 to 8
   columns and 6 to 9 rows; 11 to 33 moves; 4 to 6 kinds; at most 4 kinds
   of thing on a board; one new thing a level, its first level holding
   nothing else on the board; 8 deals; 3 thresholds rising; every goal
   reachable on its board.
2. All four sets' JSON, copied (C13), and `levels.ts`, which lists Warm-up
   alone; each Y adds its set to the list.
3. The spec that holds every level of all four sets to the rules.

**P2. The players** (after R3; 4 commits): ported from `sketch/bots.mjs`,
each drawing as the sketch's does, held as the rules are.

1. `src/testing/dice.ts` and `casual.ts`.
2. `careful.ts`, which plays `hint.ts`' choice (R3) to a level's end.
3. `proof.ts`, the search that sees the deal and keeps the 10 best boards a
   move.
4. `report_api.ts`, the typed entry the report loads.

**P3. The report, the proof and Warm-up proven** (after P1, P2; 5
commits):

1. `tools/report-levels.mjs` on `@fz/dev/report`: each level on 40 deals,
   16 casual games and 1 careful game a deal; the moves, the stars and the
   8 deals it sets; the sketch's table.
2. `tools/certify-deals.mjs` and `certify_api.ts` (C14), writing
   `certificates/<set>.json`.
3. `every_level/` in `sim`: each certificate's line replayed through
   `play()`, clearing within the level's moves.
4. `every_floor/` in `sim`: on each level's 8 deals, the casual player
   clears within 4 points of what the level asks; and each set's first
   level asks for more clears than the last level of the set before, as
   the design has it.
5. Warm-up certified: its moves, deals, stars and certificates the same as
   the sketch's (`sketch/results.json`, `certificates.json`). A difference
   is a fault in the port until shown otherwise.

**Q2. Warm-up's proof, checked** (the orchestrator; after P3): the report
for Warm-up equal to the sketch's figure for figure; `sim`'s time on one
worker against §9; and where the game's suite runs in CI's matrix.

#### A: art and color

**A1. Colors** (after K2; 3 commits):

1. `view/colors/palette.ts`: the board's roles from the palette, through
   `ThemeService.roles()` in the shell, as `@fz/brick-wall/view/palette`
   maps them.
2. `inks.ts`: the kinds' (C8); the specials' second fur, lighter on a dark
   palette and darker on a light one; dust and thick dust; the brick's four
   shades, oat to taupe, in steps of lightness; the cage's steel; the burr;
   the sleepyhead's gray-blue.
3. `contrast.spec.ts` on `holdContrast()` (LA5), every pair in every
   palette: each kind against its square, the eyes against each kind, a
   special's fur against its kind and the square, dust against a square,
   each cushion against the one beneath and the square, the cage against
   the fuzzball, and the focus ring against the board.

**A2. The art** (after A1, LA; 6 commits):

1. `art/kinds/<kind>.ts`: the six bodies and their fur, at rest and on end,
   from the design's silhouettes, on `@fz/phaser/shapes`' curves; and a spec
   that their outlines differ with no color at all, as the design's
   `sight.webp` shows.
2. `eyes.ts`: the house's eyes by face, at the board's sizes, and where
   they sit on each kind (C8).
3. `specials.ts`: the four second furs, and the frizzball with its static
   (`staticSparkCommands()`).
4. The square's well, dust, thick dust and the board's edge around gaps.
5. `fluff.ts`: the kit, a tuft a kind, a thin ring, a streak, a static
   bolt, and the hint's hand; and `marks.ts`, a wave's "×2" to "×9" drawn
   as shapes, since the scene draws no text (the announcer says the
   wave).
6. `frames.ts`: every frame named in one list, and the atlas's spec: it fits
   §9's budget at the largest square and pixel ratio.

#### V: the view

**V1. The board and the input** (after K2; 5 commits):

1. `board/metrics.ts`: the board fitted with `fitCells()`, a square at
   least 40 CSS px where the room allows, in whole device pixels; the
   wide window's room for the bar's panel and the buttons
   (`sidePanels()`).
2. `board/spaces.ts`: a point to a square and back, in the screen's frame.
3. `input/gesture.ts`: a press read as a swipe at 0.4 of a square, along
   its longer axis, or as a tap.
4. `input/picking.ts`: pick up, swap with a neighbor, put down, set off a
   held special; one swap kept while a move plays. Which fuzzballs could
   bunch with the one picked up, for their look, is asked of a function
   handed in, which U1 wires to R1's `bunchMatesOf()`.
5. `input/keys.ts`: the ring, arrows, Space or Enter, Esc and H, with
   `isShortcut()` let through.

**V2. The timeline** (after K2, LA; 8 commits): each event of "The feel,
in numbers" and "Effects", at `FeelTuning`'s numbers.

1. `pace.ts`, `timeline.ts` and `limits.ts`: the pace (Normal, Fast and the
   encore's hurry), the waves' quickening, `sampleAt()` into reused
   records, and the design's limits.
2. Pick up and the look; swap; a refused swap.
3. Huddle, hop off, run into a special, and a special made, on a spring
   that rings twice; the shake table.
4. The wait, the fall (80 + 70 × D^0.7 ms), columns and stacks staggered,
   the landing's squash and blink.
5. The specials going off, and the dimming under a frizzball.
6. The pairs' wind-up, then each pair's own.
7. Flights to the goal and its bump, the "×2" marks, the cheer at waves 3,
   5, 7 and 9, dust's puff, the shuffle, the encore, and the end of a
   level's beats (C20).
8. Less motion's version of each, the sound cues of each, and the specs
   that hold the design's measures: a bunch of 3 back at rest 900 ms after
   the tap, and the five-waves storyboard's move in 3.9 seconds, each
   within a frame.

**V3. Between moves** (after V1, V2; 3 commits):

1. `idle/blinks.ts` and `breaths.ts`: a blink every 3 to 8 seconds a
   fuzzball, by its id and the time through `hashOf()`; the puffer's
   breath, the wisp's sway, the frizzball's static.
2. `idle/hint.ts`: two hops after 7 seconds (C15), the hand on a teaching
   level, and the low-moves cue.
3. `debug/tuning_menu.ts`: a slider for every `FeelTuning` number, its
   range and step, and the text Copy numbers writes (question 4).

#### N: sound

**N1. The sounds** (after K2, LA; 5 commits):

1. `tools/build-sounds.mjs`: what the recipes share (a bell note, a
   bubble, a small room) on `@fz/dev/synth`, and the move's sounds.
2. The specials' sounds, made and going off, and the pairs'.
3. The board's: bricks, cages, dust, burrs, beds, gusts, the shuffle, the
   goals, the chirps.
4. The level's; the sprite written and encoded by `encodeSprite()` into
   `src/scene/sounds/`; and `tools/build-sounds.spec.ts`, which holds the
   sprite to `SOUNDS` and each sound to `sound/measures.md`: its length
   within 10%, its peak within 1 dB, its energy where the design puts it,
   nothing above 6 kHz.
5. `tools/sound-lab.ts`: every sound beside the design's take, and the
   ladder's rungs played by `ladderCentsOf()`, the top one checked for
   length. The design's ten reels stay in `docs/fuzz-flux/sound/reels/`
   to listen to.

#### S: the scene

**S1. The scene** (after A2, V3, N1; 6 commits):

1. `fuzz_flux_scene.ts`: made once, handed plain functions by the shell
   (the tick, the timeline, the palette, the room, motion, sound, the
   layout, the commands, the pictures), letting go of all it holds in
   `whenSceneEnds()`.
2. `atlas.ts`: one atlas at whole device pixels for the square's size,
   baked again when the palette or the size changes and after a lost
   context.
3. `painters/`: squares, dust and gaps; the pieces and their eyes; what
   lies over them; each in a pool sized for the worst case (§9).
4. Effects: fluff, rings, streaks and bolts in `Turns` pools, the flash
   disc, the camera's shake (C19), the dimming, the flights to the goals'
   places, which the shell hands it, and the life between moves (V3)
   sampled beside the timeline.
5. Sounds through `SpritePlayer` and `FrameSounds`, each cue played as its
   time passes, the timeline's and the shell's alike (C20, the hint),
   following the Sound setting.
6. Input: the pointer to the gesture and the picking, keys by `onKeyDown()`,
   commands to the shell; the board's rect for the ring and the grid; and
   `pictures.ts`, the art as pictures for the bar and How to play.

#### U: the shell

**U1. The game and the bar** (after S1, R3, LL; 6 commits):

1. `play/game.service.ts` on `RunLifecycle` (C5): a level begun on a deal
   (Restart the same; Try again, Play again and coming back the next of
   its 8, kept with the records); a move played once and saved; the kept
   swap; cleared and over. Tokens let the specs hand in the levels and the
   rules.
2. `play/saved_game.service.ts` on `keepSaved()`, and `run/saved_game.ts`
   (C3).
3. `board/board.component.*`: the canvas with its scene loaded by
   `import()`, the placeholder, the focus ring where the scene says the
   board is, and `fzPlayRoom`'s away.
4. `bar/`: on `<fz-game-bar>`, the level's number and name, the wind's
   arrow and its moves to turn, each goal's picture and count with a check
   once met, the moves left with their warning; the wide window's panel;
   Hint and Restart, which asks first once a move is made.
5. The line under the bar for a level that brings something new, the
   sketch's 14.
6. `run/describe.ts`, by the `player-text` skill, through the announcer: a
   level begun, a move ("Bunch of 4, blue. Dasher made. 6 blue left."), a
   refused swap, a goal met, 5 moves left, cleared, out of moves.

**U2. Cards, levels, records, settings and help** (after U1; 7 commits):

1. `cards/`: Cleared (stars lit one at a time, "4 moves to spare.", Next
   level, Play again) and Out of moves (what each open goal still needs;
   Try again, Choose a level), in the board, on the house's card mixins,
   each star lit at the view's beat and each button's sound cued (C20).
2. `run/stars.ts`, `run/records.ts` and `stats/` (C4), on `storedSignal()`
   and `StoredProgress`.
3. `levels/`: Choose a level on `<fz-levels>`, the 4 sets by name.
4. `settings/`: Speed (C6) and Less motion (C7) in the settings drawer;
   Sound in the bar. The palette is the site's, chosen in the bar's menu,
   where the sketch had a Light button.
5. `help/`: How to play, loaded on demand: the three ways to swap, the
   bunches and what each leaves, the specials and the pairs, the goals,
   and an entry a thing with its picture (dust and gaps; each X adds its
   own file).
6. `bug_report/` and `run/reported_game.ts` (C3).
7. `debug/`: the menu at `?debug`: the tuning panel with Copy numbers
   (question 4), a level's deal by number, and a game played off the
   record.

**U3. The board for keys and screen readers** (after U1; 4 commits):

1. `board/board_grid.component.*`: the grid of C12 over the drawn board,
   placed by the scene's rect, letting pointer events through, one tab
   stop; the canvas hidden from assistive technology.
2. Each cell's name, from `RunState` in the screen's frame: its kind and
   what is on it. A gap is no cell.
3. V1's keys through the grid, the focused cell as the ring; the focus kept
   on the board across moves and handed back after a card or dialog
   (`refocusWhenUncovered()`).
4. Its specs in `dom`, and a look in Chrome: the grid's rect is the
   board's, every square is named, the focus shows.

#### T: checks in a browser

**T1. Layout, screenshots and the certificates in play** (after U2, U3,
P3; 4 commits):

1. `tools/check-layout.mjs` on `@fz/dev/layout`, at every shape: a square at
   least 40 CSS px on a phone 320 px wide, a button at least 44, no
   scroll, the grid on the board, the cards inside it, the goals in one
   row; over a stored game too (`stored_run.mjs`, `kept_run.ts`).
2. `tools/capture-screenshots.mjs`: `preview.webp` and `thumb.webp`, a level
   mid-move.
3. The scripts in `package.json`, each tool's spec, and the testing entries
   they load held as the rules are.
4. The debug menu's "Play the certificate": a level's certified line
   played move by move from `certificates/<set>.json`, loaded only at
   `?debug`.

**Q3. The feel gate** (the orchestrator; after T1 and Q2): Warm-up, end
to end, with sound. At your word, `fuzz-flux` is merged into `main` through
`merge-to-main` and deployed with the tile "In development" (question 4).
You play it on a phone and a desktop and send back what to change, or the
copied numbers. What you change becomes `FeelTuning`'s numbers in a commit
of their own, or a package of its own where it is more than numbers.

#### X: the other elements

Each brings an element whole: its rule, taking its id off `STAND_INS`,
which lets its golden games and its levels' random moves run (R3); its art;
its timeline's events and their Less motion version; its sounds cued; its
How to play entry (`help/entries/<element>.ts`); and its contrast pairs.
It checks the words for the announcer and the grid that U1 and U3 wrote
for it from the design. Each owns its files and adds a line to each list.

**X1. Bricks** (after U2, U3; 5 commits): a bunch beside it and a blast
each knock a cushion off, two hits in a move two; fuzzballs roll in under
it. The pile at 4, 3, 2 and 1 cushions as the design draws it; the knock
(the duck, the cushion tumbling off, the rest springing up) and the burst;
`knock-3` to `knock-1` and `break`, in tune.

**X2. Cages** (after U2, U3; 4 commits): no swap and no fall; a bunch that
includes it frees it, a blast opens the cage and leaves the fuzzball. The
bars in their frame, the sleepy look out, the bars flying as hard bits,
`cage` and `yip`.

**X3. Sleepyheads** (after U2, U3; 4 commits): no swap and no bunch; it
falls, and leaves at the lowest square of its column. The nightcap and the
shut eyes, carried to bed, `bed`, and the goal's count.

**X4. Burrs** (after U2, U3; 5 commits): no swap; a bunch it is in, one
beside it or a blast brushes it off; after a move that brushed none off,
one spreads to a neighbor, drawn by `hashOf()`. The ring of thorns, the
cross look, the brush and the spread's ghost, `burr-off` and
`burr-spread`.

**X5. Wind** (after U2, U3; 6 commits): a level's wind turns the
board's frame at the deal; a turning wind turns it a quarter
counterclockwise every 2, 3 or 4 moves, through R3's hook in `play()`
(`wind/gust.ts`); the bar's arrow and count, which U1 drew from
`RunState`, seen on a real wind; the gust's lines and lean, and with Less
motion no sway; and the view's squares mapped under a turned frame. Its
golden games are levels 28 to 36.

#### Y: the other three sets

Each adds its set to `levels.ts`' list, so a player can choose it;
certifies it; turns its floors on; and holds its moves, deals and stars to
the sketch's, its report and certificates the same figures and lines. Its
golden games already run, from its elements' landing. A level is redrawn
only for a failed check, as C13 says. Each looks at Choose a level with its
set in it.

**Y1. Bricks and bars** (after X1, X2, P3; 3 commits). **Y2. Bedtime**
(after X1 to X4, P3; 3 commits). **Y3. Windy days** (after X1 to X5, P3;
3 commits), which adds the wind's column to `report-levels.mjs` and asks
you about level 30 as it lands (C17).

#### Z, D, F: finishing

**Z1. The dedupe pass** (after X1 to X5; 3 to 5 commits): §3.4's list,
lifting only what meets §3.1's bar.

**D1. The game's rules for agents** (after Z1, beside F1; 3 commits):
`games/fuzz-flux/AGENTS.md` and its `CLAUDE.md`, holding only rules the
code can't: the sketch is the oracle (C1); a failed golden game or replay
is the bug, never a file to write again; a level is never eased past its
floor; and the two skills by name. The skills `fuzz-flux-testing` (the
golden games, certifying, the floors, the timeline's specs) and
`fuzz-flux-content` (adding a level or an element), linked with
`node .agents/link-claude-skills.mjs`. The lists that name every game.

**F1. The last pass** (after Y1 to Y3, Z1 and any redraw; 6 commits): a trace of the
busiest move (two frizzballs on level 36's board) at six times CPU
throttle; the pools against the timeline's worst case (§9); Lighthouse; an input pass (keys, the mouse, touch, the grid's
names in Chrome's accessibility tree); the bundle; coverage, every row of
every file read and each line not run either run or dropped, with why; and
the player's words read again by the `player-text` skill.

---

## 6. Running it

### 6.1 Before it starts

- **Your answers** to §2.1.
- **The week.** On 2026-11-26 it read 31% used, resetting Wed Dec 02,
  02:00 UTC. At Rickashay's rate the build is about half a week, so it can
  start at your word. Following your word of 2026-11-23, it keeps
  starting packages whatever the week reads, and if the allowance runs out
  it stops and goes on after the reset (§7.3). It reads the week once K2
  and R1 have landed and says in the log what a commit is costing.
- **Measure it,** with `/measure stop` after Z2:

  ```text
  /measure start fuzz-flux --trying sketch-oracle,timeline-view
  ```

- **Reviews:** `commit-reviewer` is offered to a session started in
  `~/Projects/personal` or in the repository, so every commit is reviewed as
  `commit-review-process` says, at `high`, each reviewer's description
  opening `[review pkg=<id>]`.
- **`ffmpeg`** is on the devbox, which LA's last commit and N1 need. CI
  never runs it: the sprites are committed.
- **The branches,** each in its own worktree under `.claude/worktrees/`,
  moved only by the orchestrator. The two that hold code are installed
  (`yarn install --immutable` from `frontend/`, then
  `node .agents/link-claude-skills.mjs`):
  - `fuzz-flux-lift`, cut from `origin/main`, where Part 1 lands;
  - `fuzz-flux`, cut from `fuzz-flux-lift` when K1 starts, where Part 2
    lands, and moved onto each later lift as §6.7 says;
  - `fuzz-flux-log`, which holds the work log and nothing else (§7), an
    orphan branch made from the main checkout with
    `git worktree add --orphan -b fuzz-flux-log .claude/worktrees/fuzz-flux-log`.

### 6.2 Slots and order

Four at once, five only when five are ready and none waits on another.
When a slot frees, the orchestrator lands what finished and starts the
first ready package in this order: what most packages wait on, then the
longest chains, then the rest.

1. **First:** LA, LL and K1.
2. **Then, in this order:** K2, R1, V2, R0, P1, A1, V1, N1, R2, A2, V3, R3,
   S1, P2, U1, P3, U2, U3, T1, X1, X2, X3, X4, X5, Y1, Y2, Y3, Z1, F1, D1.
3. **The orchestrator's own steps** come as their waits end: Q1 after LA
   and LL, Q2 after P3, Q3 after T1 and Q2, and Z2 after F1 and D1.

- **One slot is idle at the start:** everything but the lifts and K1 waits
  on K2.
- **Part 2 starts beside Part 1.** K1 needs no lift; K2 and what follows it
  need LA, and U1 needs LL. A Part 2 package starts only once every lift it
  names has landed, so it never builds on an API still moving.
- **After K2, four streams run side by side:** the rules (R1 to R3, with
  R0 and P1 beside them), the look (A1, A2), the motion (V1 to V3) and the
  sound (N1). R1 and V2 go first, since the two longest chains run through
  them; started later, V2 → V3 → S1 would hold U1 back past R3. They meet
  at S1 and U1.
- **The gate doesn't stop the build.** The elements and the sets run while
  you play. What you send back lands as numbers in a commit of their own,
  or as a package of its own.

### 6.3 Ports

Each package that opens a page serves its game on its own port
(`yarn dev --port <n> --strictPort` from the game's folder) and stops it
before its report.

- **Part 1:** LA 9201 (Asteroid Breaker's sound lab, then the wall games),
  LL 9202 (the wall games), Q1 9203, and LB 9204 if question 2 calls for
  it.
- **Part 2:** K1 9209, A2 9210, N1 9211 (the sound lab), S1 9212, U1 9213,
  U2 9214, U3 9215, T1 9216, X1 to X5 9221 to 9225, Z1 9226, F1 9227, and
  Y1 to Y3 9228 to 9230.
- **The orchestrator's own looks** (Q3, Z2) use the game's port, 9008.

### 6.4 Who owns what

A package changes what it owns freely and only adds to the rest: an entry,
a field, a line, an import of a lifted module in place of a deleted one. It
renames, moves and restyles nothing it doesn't own.

- **LA** owns what it lifts into each library and the copies it deletes,
  Asteroid Breaker's copy of `CHAIN_CENTS` among them. It adds to the
  `fuzzley-ui` and `phaser-core` skills' rows, to `synth_music.spec.ts`,
  and to the imports of `@fz/brick-wall`, Brick Fuzz Pop, Rickashay and
  Asteroid Breaker.
- **LL** owns `lib/core/src/levels.ts`, `lib/game-ui/src/levels/`, the
  helpers it moves and their new homes, `@fz/brick-wall`'s
  `rules/progress.ts`, `app/levels/` and the `StoredProgress` and
  `StoredAt` part of `app/stored.ts`. It adds `@fz/core`'s `./levels`
  export and `@fz/style`'s new testing entry, the rule in
  `lib/style/AGENTS.md` that names it, the skills' rows, the testing
  skills that name a helper it moves (`brick-wall-testing`,
  `brick-fuzz-pop-testing`, `rickashay-testing`), and the imports of the
  games that adopt.
- **K1** owns `games/fuzz-flux/`'s configs, `index.html` and `main.ts`, and
  adds to `site/games.json`, the site's catalog, `README.md` and
  `docs/operations.md`.
- **K2** owns `src/rules/catalog/`, `rules/board/{cells,board,legend,picture}.ts`,
  `rules/{draws,tuning}.ts`, `move/record.ts`,
  `elements/{element_rule,element_rules}.ts`, `levels/level.ts`, the view's
  contracts (`run_state.ts`, `art/frame_names.ts`, `effects/sounds.ts`,
  `timeline/feel.ts` and the timeline's types), and
  `src/testing/{board_picture,move_fixtures}.ts`.
- **R0** owns `docs/fuzz-flux/sketch/golden.mjs`, `src/rules/golden/`'s data
  and `src/testing/golden.ts`.
- **R1 to R3** own `src/rules/{bunches,blasts,move}/`,
  `board/{orientation,deal}.ts`, `elements/dust.ts` and
  `golden/golden.spec.ts`, one after another, and add to K2's `board/`
  files and `move_fixtures.ts`.
- **P1 to P3** own `src/rules/levels/` but `level.ts`, until each Y takes
  its set's JSON; `src/testing/{dice,casual,careful,proof,certify_api,report_api}.ts`;
  and `tools/{certify-deals,report-levels}.mjs`. P2 and P3 add each file of
  theirs that a script loads to `HELD_AS_RULES` in `eslint.config.js`, and
  to its spec, in the commit that writes it.
- **A1 and A2** own `src/view/{colors,art}/` but K2's list and the X
  elements' files; dust's art is A2's. They add to the list of frames.
- **V1** owns `src/view/{board,input}/`; **V2** owns
  `src/view/{timeline,effects}/` but K2's files and the X elements' events,
  dust's being V2's; **V3** owns `src/view/{idle,debug}/`.
- **N1** owns `src/scene/sounds/`, `tools/{build-sounds.mjs,sound-lab.ts}`,
  and adds the lab to `vite.config.ts`. **S1** owns the rest of
  `src/scene/`.
- **U1** owns `src/app/` until it lands, and
  `src/rules/run/{saved_game,describe}.ts`. U2 and U3 then run side by
  side: **U2** owns `src/app/{cards,levels,stats,settings,help,bug_report,debug}/`,
  dust's and the gaps' help entries among them, and
  `rules/run/{stars,records,reported_game}.ts`, and adds to
  `app.component.*`; **U3** owns `src/app/board/board_grid.component.*`
  and adds to `board.component.*` and `RunState`.
- **T1** owns `tools/{check-layout,stored_run,capture-screenshots}.mjs`,
  `src/testing/{kept_run,script_api,screenshot_api}.ts` and
  `src/app/debug/certificate_line.*`, adds the testing entries to
  `HELD_AS_RULES` as P2 does, and adds to `package.json`'s scripts and the
  debug menu.
- **Each X** owns its element's `rules/elements/<element>.ts`,
  `view/art/elements/<element>.ts`, `view/timeline/events/<element>.ts`
  and `app/help/entries/<element>.ts`, and adds to the lists of rules,
  stand-ins, frames, sounds' cues and help entries, and to
  `contrast.spec.ts`. **X5** owns `src/rules/wind/` and the gust's events.
  U1 and U3 write the words and the grid's names for every element from
  the design, so an X checks them rather than writing them.
- **Each Y** owns its set's JSON and certificates, and adds to `levels.ts`'s
  list of sets.
- **A redraw** (C13) runs alone, with no Y and no other redraw beside it,
  and owns `docs/fuzz-flux/levels/`, the sketch's outputs
  (`results.json`, `results-table.md`, `certificates.json`), `golden/`'s
  data, the sets' JSON and design.md's level tables while it runs.
- **Z1** owns what it lifts, in the game and the libraries.
- **D1** owns `games/fuzz-flux/AGENTS.md`, its `CLAUDE.md` and
  `games/fuzz-flux/.agents/skills/`, and adds to the lists that name the
  games.
- **F1** runs alone in the game but for D1, once every other package has
  landed, and may change any of its files but D1's, each change a reviewed
  commit of its own.

No two packages that own files in one game's `src/app/` or `src/scene/`
run at once but U2 and U3, which own folders apart. The Xs, which run
together, each add files of their own and a line to each list.

### 6.5 The briefs

Each brief follows the `multi-agent-build` skill's §3: its package's
section of this plan quoted whole, with the parts of `design.md` and of §2
and §4 it cites, the reports of the packages before it, the files to read
first by line, the skills it needs, and the rules that bear, quoted. A
brief for a port (R1 to R3, P2, V2, N1, each X) names the lines of the
sketch it ports (`engine.mjs`, `bots.mjs`, `feel/feel.mjs`,
`sound/sounds.mjs`, `art/fuzz.mjs`), and the worker reads those and not the
whole file. Each brief is kept on the log's branch (§7), so a package can
be started again from it.

The skills, by package:

- `fuzzley-ui` ("Changing a library") for LA and LL; `phaser-core` for LA,
  S1 and U1; `brick-wall-testing` for LA and LL where they edit the
  library's specs, by its path, and the wall games' testing skills where
  they edit those games' specs.
- `angular-developer` and `angular-testing` for LL and U1 to U3.
- `phaser-canvas-performance` for A2, S1 and F1.
- `web-game-accessibility` for V1, U1, U3 and F1.
- `player-text` for U1, U2, U3, each X and D1.
- `github-actions-ci-cd` for K1 and Q2.

The rules a brief quotes, beside the `AGENTS.md` of a workspace it edits,
which the harness loads:

- From `frontend/games/AGENTS.md`: "In a game drawn with Phaser, work goes
  in the lowest layer that can hold it" (whole), for every Part 2 package;
  "Saved games outlive the code" (whole), for U1 and U2; "A color the player
  must tell from what it lies on joins the game's `contrast.spec.ts`", for
  A1, A2 and every X; "A change to a game's layout is checked in a
  browser", for U1 to U3 and T1; "Before writing or changing a scene, read
  the `phaser-core` skill", for S1; "A new game starts as a copy of one",
  for K1.
- From `frontend/AGENTS.md`: "The libraries' pieces first", "Visible state
  is announced state" and "An icon-only button has one name", for U1 to
  U3; "What a browser stores outlives the code", for LL, U1 and U2;
  "Before changing a library, read the `fuzzley-ui` skill's 'Changing a
  library'", for LA and LL.
- From `.agents/AGENTS.md`: "Writing for Players" (whole), for U1 to U3,
  every X and D1; "A union of ids is derived from its list" and "An
  optional property is left out, not set to `undefined`", for K2; "Agent
  Configuration" (whole), for D1.

### 6.6 Mutants

The `multi-agent-build` skill runs mutants only where the plan asks, from
the one script it gives: `yarn mutants` (`frontend/tools/mutants.mjs`, on
`@fz/dev/mutants`). This plan asks for a pass at the last commit of R1, R2,
R3, P2, V1, V2 and each X, over that package's rules and view code. Each
survivor gets a spec that kills it or is named as equivalent, and the table
goes in the commit's body. The script stops a mutant at two minutes and a
pass at twenty, and waits its turn in the queue.

### 6.7 Landing

As the `multi-agent-build` skill's §6 has it. These are this build's own:

- **`fuzz-flux` follows `fuzz-flux-lift` by the tip it was last on.** The
  lift branch is rewritten when it is rebased onto `origin/main`, so a
  plain rebase onto it would replay old lift commits. Before it starts a
  package that needs a newer lift, the orchestrator logs both tips and
  runs, in `fuzz-flux`'s worktree,
  `git rebase --onto fuzz-flux-lift <the lift tip fuzz-flux was on>`, then
  `yarn install --immutable` and `yarn verify:changed --base fuzz-flux-lift`.
  Once Part 1 is on `main`, `fuzz-flux` moves the same way onto
  `origin/main` and follows it from then on.
- **Written files are written again, never merged by hand.** A collision in
  `frontend/yarn.lock` is settled by `yarn install`; one in the golden
  games, the certificates or the sprite by running the script that writes
  them on the rebased tip. The rebase's `range-diff` is reviewed as the
  skill's step 2 says.
- **A contract changes only in a commit of its own,** by the orchestrator
  or a package started for it, and every package in flight that reads it
  is told before it lands.
- **A push of `fuzz-flux` at Q3,** if you choose it, goes through
  `merge-to-main` on the branch itself. Packages cut before it land by
  `git rebase --onto`.

---

## 7. The work log

As Rickashay's: a detailed log kept from the build's start, so the build
can stop and start again at any point, deleted at your word once the build
is done, and never in `main`. It is the one log the `multi-agent-build`
skill's §7 keeps, moved onto a branch of its own so it is committed,
survives the session and can be read from any worktree.

### 7.1 Where it is, and how it is committed

- **On `fuzz-flux-log`,** an orphan branch in its own worktree,
  `.claude/worktrees/fuzz-flux-log`: `work-log.md` and `briefs/<id>.md`, and
  nothing else. It shares no history with the code, so it is never rebased,
  never merged, and writing it never touches a worktree where a check runs.
- **Each entry is its own commit,** `docs(work-log): <what happened>`, not
  reviewed, since it never lands.
- **It is written at every event:** a package started (its brief saved),
  landed, handed back or failed; a review that changed a package's course;
  a collision and how it was settled; each rebase, with the tips before
  and after; each decision; each reading of the week; each pause and
  resume; each answer of yours.
- **It stays local** until you ask for it on GitHub, and is deleted at Z2,
  at your word, with the build's other branches.

### 7.2 What it holds

The top is rewritten at every entry, so it always says where things stand;
the entries below only grow.

```markdown
# Fuzz Flux: the work log

On its own branch; never merged (implementation-plan.md §7).

## Now

- Tips: fuzz-flux-lift <sha>, fuzz-flux <sha> (on lift tip <sha>); origin/main <sha> (fetched <time> UTC)
- Landed: LA, LL, K1, K2 (4 of 33 packages; 19 of about 155 commits)
- In flight:

  | Package | Worktree                | Branch | Cut from          | Agent      | Since       | Commits | Reviews out |
  | ------- | ----------------------- | ------ | ----------------- | ---------- | ----------- | ------- | ----------- |
  | R0      | .claude/worktrees/ff-r0 | ff-r0  | fuzz-flux @ <sha> | <agent id> | 11-27 09:12 | 2 of 3  | 1 (<sha>)   |

- Ready next, in order: A1, V1, …
- Waiting on you: —
- The week: 38% used at 11-27 12:00 UTC
- To resume: §7.3, then <the one next step>

## Entries

### 2026-11-27 09:12 UTC: R0 started

Brief: briefs/R0.md. Worktree .claude/worktrees/ff-r0, branch ff-r0, cut from fuzz-flux @ <sha>.
```

### 7.3 Starting again

A session that picks the build up, the same one resumed or a new one, does
this before anything else:

1. **Reads `Now`,** in the log's worktree or with
   `git show fuzz-flux-log:work-log.md` from any.
2. **Compares it with the repository:** `git worktree list`, the tips of
   `fuzz-flux-lift` and `fuzz-flux` against those logged, and for each
   package in flight `git log --oneline <its base>..<its branch>` and
   `git status` in its worktree.
3. **Takes each package in flight as it finds it:** its report arrived and
   wasn't landed, it lands it (§6.7); its agent ended without a report, it
   starts a fresh worker in the same worktree with the saved brief and a
   paragraph on which commits are made and reviewed, which reviews to start
   again and what is left; its worktree holds changes no commit has, the
   fresh worker's brief says so, and it keeps or discards them by reading
   them, and says which.
4. **Starts every review that was out again,** as `commit-review-process`
   says for one that never reported.
5. **Checks the queue,** `<git common dir>/fz-verify-queue/`: a place left by
   a run that died is unmarked and leaves by itself within a minute.
6. **Reads the week** (`/measure limits`) and `/measure status`, writes a
   "resumed" entry, and goes on in §6.2's order.

---

## 8. Practices, layer by layer

The repository's rules (`.agents/AGENTS.md`, `frontend/AGENTS.md`,
`frontend/games/AGENTS.md`, each workspace's) and the skills hold most of
what follows. This section is what they mean for this build, and what is
its own.

### TypeScript, everywhere

- Strict, with `exactOptionalPropertyTypes`: an optional field is left out.
- Google's TypeScript style; an explicit return type on every exported
  function and public method; doc comments of one sentence, a function's
  in the third person.
- A discriminated union for every kind of thing (pieces, hits, blasts,
  goals, tracks, effects, cards, commands), each `switch` ending in
  `never`.
- `as const satisfies` for every catalog, list of names and record over an
  id (`ELEMENT_RULES`, the frames, the help entries), so a missing entry
  fails to compile; each union of ids derived from its list.
- `readonly` on what a function is handed; no `as any`; what comes from
  storage or JSON read with `@fz/core/json`'s readers and a type guard.

### The rules

- A port that reads as the house's code, not as the sketch's: the house's
  words (a bunch, a blast, a hit), small modules a layer of the move, and
  the sketch's line numbers named in a commit's body, not in the code.
- Pure functions over values nothing may change; scratch arrays inside
  `play()`'s module only; specs that show an input unchanged.
- §4.6's determinism. The exact lint holds the arithmetic; the review holds
  the order.
- Specs draw boards as pictures (`boardFrom()`) and read records back,
  asserting state over calls. The golden games hold the whole against the
  sketch (C1); a spec holds each rule on a board small enough to read.

### The view

- Deterministic and frame-rate free: the timeline is built from the record,
  and a frame is a time sampled, so a spec can ask where a fuzzball is at
  612 ms.
- Nothing allocated per frame: `sampleAt()` writes into records the scene
  keeps.
- Every number from `FeelTuning`, handed in. A constant with no name in the
  design's tables is a review finding.
- Less motion is a version of each event, chosen when the timeline is
  built, never a branch in the scene.

### Phaser 4 (the `phaser-core` and `phaser-canvas-performance` skills)

- Every game object made once in `create()`, in pools sized for the worst
  case (§9).
- One atlas, baked at whole device pixels, baked again only when the
  palette or the square's size changes, and after a lost context.
- No `Text`: words live in the DOM. Keys through `onKeyDown()`. What a
  scene holds let go in `whenSceneEnds()`.
- The scene knows nothing of Angular; it is handed plain functions.

### Angular and Sass

- Standalone, zoneless and signal-driven: `input()`, `output()`,
  `computed()`, `inject()`. Templates bind and never compute; a `@switch`
  over a union ends in `@default never;`.
- The libraries' pieces first: `<fz-dialog>`, `ConfirmService.ask()`,
  `<fz-icon>`, `.fz-button`, the announcer, `<fz-settings-drawer>`,
  `<fz-levels>`.
- What looks selected says so (`aria-current` on the level in play,
  `aria-pressed` on a switch, `aria-selected` on the fuzzball picked up);
  an icon-only button has one name.
- A piece a page may never show (How to play, the debug menu) loads with
  `onDemand()`. The shell takes nothing by value from the art, the
  timeline or the input, whose code only the scene's chunk carries.
- Sass modules, `@fz/style`'s tokens by name, breakpoints by name, three
  levels of nesting at most, `//` comments.

### Specs (Vitest, Testing Library)

- Arrange, act, assert; one behavior a case; by role; real objects over
  fakes; the public API only; no code bending to its specs.
- `pure` for the rules, the view, the helpers and the tools; `sim` for the
  golden games, the replays, the floors and the benchmarks, never with
  coverage; `dom` for the scene and the shell. A line only `sim` reaches
  counts as untested.
- A helper in `src/testing/` whose answer a spec trusts has a spec of its
  own; the golden digest has two (R0).

### Scripts (Node 26)

- `.mjs` with every type in JSDoc; logic exported as functions and run
  only as the file Node started (`import.meta.main`).
- They load the game's code only through typed `*_api.ts` entries; they
  read their arguments with `readArgs()`, exiting with 2 on a misuse; their
  output is the same bytes every run.
- The scripts in `docs/fuzz-flux/` keep to the same, though only Prettier
  checks them there.

---

## 9. Checks and budgets

- **A commit's check** is `yarn verify:changed --base <branch>`, the
  package's integration branch, from `frontend/` in its worktree, after its
  last edit, with `--coverage` at a package's last commit that touches
  code a floor holds. Nothing else that takes the machine runs beside it:
  `yarn verify`, `yarn verify:full` and the whole `yarn test` join no queue,
  while the report, certification and the mutants do.

| What                                                | Budget                                                                                                                                                                                                                                                   | Held by                                        |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Coverage floors                                     | rules, view and what is held as rules 100/95/100/100; scene 98/92/100/99; shell 98/97/97/98                                                                                                                                                              | `vitest.config.ts`                             |
| The games Part 1 touches                            | every certificate replays; no screenshot moves; main and scene chunks within 1% of `main`'s                                                                                                                                                              | each L's checks, Q1                            |
| The port against the sketch                         | every golden game the same, wave by wave; Warm-up's report and certificates the same figures and lines                                                                                                                                                   | `golden.spec.ts`, Q2; each Y for its set       |
| `play()` over every level's deals with random moves | median ≤ 100 µs, 99th percentile ≤ 1 ms (the sketch: 47 µs and 0.41 ms)                                                                                                                                                                                  | R3's benchmark, printed, recorded at Q2        |
| `timelineOf()` for the busiest move                 | ≤ 4 ms (two frizzballs on an 8 by 9 board)                                                                                                                                                                                                               | V2's benchmark                                 |
| A reload of a game in play                          | 33 moves replayed in ≤ 50 ms                                                                                                                                                                                                                             | U1's spec, with a generous bound               |
| The golden games, the replays and the floors        | `sim` under 100 s on CI's runner with one worker                                                                                                                                                                                                         | Q2 and F1; if over, fewer random games a level |
| The game's whole suite in CI                        | no more than Asteroid Breaker's 195 s                                                                                                                                                                                                                    | Q2 and F1                                      |
| The report for all 36 levels                        | under a minute (the sketch's: 10 s)                                                                                                                                                                                                                      | P3, each Y                                     |
| A frame of the busiest move, six times CPU throttle | median ≤ 4 ms, as the wall games' were held                                                                                                                                                                                                              | F1's trace                                     |
| The atlas                                           | at most two 2048 × 2048 pages at the largest square the layout gives, at a pixel ratio of 3                                                                                                                                                              | A2's spec                                      |
| Pools                                               | 72 squares and 72 pieces with their eyes; 420 loose bits and 14 flights (the design's); every other effect's pool sized from the timeline's worst move, a frizzball with a dasher and two frizzballs on an 8 by 9 board, and capped at it by `limits.ts` | V2's and S1's specs, F1                        |
| The sound sprite                                    | ≤ 300 KB a format (the design's AAC: 247 KB)                                                                                                                                                                                                             | N1's spec                                      |
| A square and a button                               | a square ≥ 40 CSS px on a phone 320 px wide; a button ≥ 44                                                                                                                                                                                               | `check:layout`                                 |
| Contrast                                            | 3:1 for every graphic pair, 4.5:1 for text, in every palette                                                                                                                                                                                             | `contrast.spec.ts`                             |
| Flashes                                             | no more than 3 a second, one every 350 ms at most; none with Less motion                                                                                                                                                                                 | V2's spec                                      |
| Shake                                               | dies away by time (C19), the same at 60 and 120 frames a second                                                                                                                                                                                          | V2's spec                                      |
| Layout shift on load                                | 0                                                                                                                                                                                                                                                        | F1's Lighthouse run                            |
| The bundle                                          | main chunk with its preloads no larger than Rickashay's (467 kB); certificates only at `?debug`; art in the scene's chunk                                                                                                                                | F1, from the build's report                    |

---

## 10. Risks to the build, and what answers them

| Risk                                                                           | What answers it                                                                                                                                                                                          |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The port plays differently from the sketch, and the proven deals stop clearing | The sketch's hash kept (C2); the golden games wave by wave (R0, R3); every certificate replayed (P3); Warm-up's report the same figures (Q2)                                                             |
| The golden digest hides a difference, or invents one                           | Two specs of the digest (R0): one that catches a planted change, one that holds it to the sketch's own text                                                                                              |
| The sketch has a fault the golden games copy into the game                     | C1: a fault is fixed in the sketch and the game together, its golden games written again; the property specs (R1, R3) check what the sketch checked, independently                                       |
| The feel, which is the game, feels wrong                                       | Every number is `FeelTuning`; the timeline's specs hold the design's measures; the tuning panel and Copy numbers at the gate (Q3); the gate comes before the elements and the sets are built on the view |
| Baked frames make fur look stiff (C9)                                          | The lean frame, rotation and squash; the gate judges; drawing fur live is the fallback, held to §9's frame budget                                                                                        |
| Rebuilt sounds lose what the design's had                                      | N1 holds each to the design's measures; the lab plays each beside the design's take; the gate listens                                                                                                    |
| The grid over the canvas misreads a tap, or a screen reader can't play         | The grid lets pointer events through, the canvas reads every tap; U3's look in Chrome; F1's input pass; a real screen reader and phone are on Z2's list for you                                          |
| A lift changes how a live game looks or plays                                  | Each adopted in the commit that lifts it; certificates replayed, screenshots retaken without `--force`, chunks held (Q1); Part 1 merged alone                                                            |
| Two packages edit one file                                                     | §6.4; the lists are a line each; written files written again, never merged (§6.7)                                                                                                                        |
| The wind does little on a full board                                           | Y3's column in the report, how often a turn moves a fuzzball (C17); you decide level 30 as Y3 lands, and a redraw runs before F1                                                                         |
| CI's time grows                                                                | `sim` without coverage; the random golden games a knob; Q2 measures before the sets are built on it                                                                                                      |
| The devbox runs out of memory                                                  | One queued check at a time; the report, certification and the mutants queued too; workers run single spec files as they go                                                                               |
| The week runs short, or the build stops for days                               | The work log on its own branch, and §7.3 to start again from any point                                                                                                                                   |
| `main` moves under the build                                                   | Part 1 merged early; the skill's rebase onto `origin/main` every few landings, reviewed by `range-diff`                                                                                                  |
| What only hands, eyes, ears and devices can judge                              | Q3, and Z2's list (§11)                                                                                                                                                                                  |

---

## 11. Finishing

**Z2, the orchestrator's finish,** once F1, the last package, has landed:

1. The screenshots,
   `games/fuzz-flux/public/docs/screenshots/fuzz-flux/preview.webp` and
   `thumb.webp`, by T1's script.
2. `fuzz-flux` rebased onto `origin/main`; `yarn verify:changed` with no
   `--base`, then `yarn check:layout`; `node tools/check-report.mjs` over
   every game; the image built and served as `docs/operations.md` shows,
   and the console read for "Refused to load".
3. "As built" written at the top of this file, its figures taken from the
   commits' bodies and measured at the tip, not from the work log.
4. The work log's last entry, and its branch kept until you say it can go.
5. `merge-to-main` once you ask: `yarn verify:full`, the push, which
   deploys, and the build's branches deleted. This folder moves to
   `docs/archive/fuzz-flux/` at your word.

**What Z2 leaves for you:**

- The game on a phone and a desktop: the feel's numbers, the swipe's
  length, the hint's 7 seconds, flights that outlast a move, a brick's
  cushions on a small phone, whether "brick" reads beside the picture.
- The sounds by ear, on a phone's speaker.
- A screen reader through a level; Safari; a screen at 120 Hz.
- The trademark search for "Fuzz Flux", then the catalog's entry out of
  "In development".
- The catalog's blurb and How to play, read as a player.
