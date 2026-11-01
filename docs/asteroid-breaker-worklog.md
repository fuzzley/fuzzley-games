# Asteroid Breaker: the work log

Where the build of Asteroid Breaker stands, step by step, as
`asteroid-breaker-execution-plan.md`, beside this log, runs it: what each
step built, the choices it made, its checks, its review and what became of
each comment, and the QA checkpoints. Each entry is committed with the step
it records. Newest last.

## 2026-10-31: the plan

- **Plan.** The user answered all 26 of the design plan's decisions and
  asked for the build to start, each step's change reviewed before it is
  committed, as the `commit-review-process` skill says, with close
  attention to readability and to the language's, the frameworks' and the
  engineering's best practice.
- **Branch.** `asteroid-breaker-plan` rebased onto `main` at `fc53b01e`, and
  `asteroid-breaker-lift` cut from it, in the sibling worktree
  `fuzzley-games-asteroid-breaker`, with its own `yarn install` and skill
  links.

## L1.1: the clock

2026-10-31.

- **Built.** `@fz/core/clock`: `Clock`, which keeps its step's length and
  the most steps a frame as well as the time carried;
  `createClock(stepMs, maxStepsPerFrame)`, `advanceClock()`,
  `progressOf()` and `stepsIn(ms, stepMs)`, at 100%. Brick Breaker's
  `stepper.ts` keeps `STEP_MS` and its own `stepsIn(ms)`, now a call to
  the library's, and gains `createFieldClock()`, its clock of 1/120 s and
  12, which `LevelPlay` makes; `LevelPlay` takes `advanceClock()` and
  `progressOf()` from the library.
- **Choices.** The plan had `stepsIn()` read the step from a clock, but the
  rules count their timers (a bolt's gap, a caught ball's hold) with no
  clock to hand, as the clock is the view's; so it takes the step's length,
  and each game binds it once, as Brick Breaker's `stepsIn(ms)` does. Brick
  Breaker's clock is `createFieldClock()` rather than a `createClock()` of
  its own, so a reader of `LevelPlay`, which imports from both, never takes
  it for the library's. Its `stepsIn(ms)` keeps its name, though the
  library's has the same: it has some twenty callers, none of which imports
  the library's, and a call with the wrong number of arguments fails to
  compile. The stepper spec's cases moved to the library's, on a clock of
  10 ms steps and at most 4 a frame, whose numbers are exact; what stays
  checks the field's clock and its `stepsIn()`. The plan's L1.1 says so
  now.
- **Checks.** `@fz/core`: lint, typecheck, test (48 tests, 100%).
  `brick-breaker`: lint, typecheck, test (1989 tests, floors held).
  `yarn prettier:check`, `node .agents/check-skill-references.mjs`. Docs:
  `@fz/core`'s `AGENTS.md` and `package.json`'s description,
  `frontend/games/AGENTS.md` and Brick Breaker's `AGENTS.md` name the
  clock.
- **Review.**
  1. The spec of a frame too long for its steps left no time over, so it
     passed with the rest kept (the reviewer proved it on a copy). Fixed:
     the frame holds a step and a half too many, and `carried` must be 0.
  2. `frontend/games/AGENTS.md` lists `@fz/core`'s helpers and L4.1
     didn't name it. Fixed: it names the clock, and L4.1 names the file.
  3. Brick Breaker's `AGENTS.md` read as if the rules called the library's
     `stepsIn()`. Fixed: it names `STEP_MS`, the field's own `stepsIn(ms)`
     bound to the library's, and `createFieldClock()`.
  4. The field clock's spec pinned the step by a literal and the most a
     frame by the constant, and its `stepsIn()` case passed under
     `Math.ceil` too. Fixed: both by literal, which the `AGENTS.md` states,
     and a case that rounds down beside the one that rounds up.
  5. This entry had no date, broke code spans across lines, and gave a
     reason for `createFieldClock()`'s name that seemed to argue against
     `stepsIn(ms)`'s. Fixed: dated, rejoined, and the second name's reason
     given.

## L1.2: the event log

2026-10-31.

- **Built.** `@fz/core/event_log`: `EventLog<E extends NumberedEvent>`,
  taking its size and a function that makes a blank record, every record
  made with the log; `next()` numbers the next event's record and hands it
  to its writer to fill, and `forEachSince()` and `latest` are Brick
  Breaker's, at 100%. Brick Breaker's `events.ts` keeps `FieldEvent` (now a
  `NumberedEvent`), `FieldEventKind` and `EVENT_LOG_SIZE`, and its
  `FieldEventLog` extends the library's, with the `add()` its rules have
  always called, so none of its thirty-odd callers changed; `Field`,
  `EventsView` and the frame's type spec name it.
- **Choices.** The repository's lint forbids `!` outside specs and the
  library's floor is every branch, while a lookup in an array is a record
  or nothing to the compiler; so one private `recordOf()` makes a record
  where it finds none (`??=`), and the constructor makes every record
  through it, which covers that branch and leaves none to make after. The
  first event takes the ring's first record. A size that is not a whole
  number of at least one throws a `RangeError`, since the ring's arithmetic
  goes wrong quietly otherwise. `next()` is public, so a game can fill its
  records however it likes; Brick Breaker's subclass keeps `add()` for its
  call sites, rather than a free function that would change every one of
  them.
- **Checks.** `@fz/core`: lint, typecheck, test (61 tests, 100%).
  `brick-breaker`: lint, typecheck, test (1988 tests, floors held;
  `events.ts` now fully covered). `yarn prettier:check`,
  `node .agents/check-skill-references.mjs`. Docs: `@fz/core`'s
  `AGENTS.md` and `package.json`, `frontend/games/AGENTS.md` and Brick
  Breaker's `AGENTS.md`.
- **Review.**
  1. The ring was first made lazily, each record as the ring first came to
     it, on the premise that a ring made up front needs a guard no spec
     reaches; the reviewer showed the constructor can make every record
     through the same lookup, covering it, and that the lazy ring put the
     first 256 events' records into Brick Breaker's physics steps, against
     its "a step makes nothing" and Asteroid Breaker's performance bar.
     Fixed: the records are made with the log, a spec counts them, and the
     docs lost the qualifiers the lazy ring had cost them.
  2. `forEachSince()` read through the lookup that makes records, so a
     serial between two whole ones made a record under a fractional key.
     Fixed: it reads on from the whole serial below, with a spec.
  3. `@fz/core`'s `AGENTS.md` hung "nothing is made per event" off
     `forEachSince()`. Fixed: it is `next()`'s.

## L1.3: a frame's sounds

2026-10-31.

- **Built.** `@fz/core/frame_sounds`: `FrameSounds<Name extends string>`,
  made from the names of a sprite's sounds, with Brick Breaker's `hear()`
  and `playEach()`, at 100%. Brick Breaker's view makes its own with
  `createFrameSounds()`, from its `SOUNDS`, which the scene calls where it
  made a `FrameSounds` before; its spec of the class moved to the
  library's, and what stays checks the sprite's order.
- **Choices.** Each sound is a record, its name and the most it rose, made
  once in the constructor, and both methods walk them with `for…of`: Brick
  Breaker's class looked a sound up by its place in two arrays, a number or
  nothing to the compiler, which a library held to every branch can't
  guard. `hear()` stops at the sound it is given; with the sprite's ten
  sounds, a walk costs what `indexOf()` did. The view makes the scene's,
  since `SOUNDS` is the view's, so the sprite's names are tied to the
  gatherer in one place. `EventLog`'s constructor doc gains the opening
  sentence the repository's constructors have ("Creates …"), which L1.2
  left out.
- **Checks.** `@fz/core`: lint, typecheck, test (66 tests, 100%).
  `brick-breaker`: lint, typecheck, test (1985 tests, floors held;
  `effects.ts` now fully covered). `yarn prettier:check`,
  `node .agents/check-skill-references.mjs`. Docs: `@fz/core`'s
  `AGENTS.md` and `package.json`, `frontend/games/AGENTS.md` and Brick
  Breaker's `AGENTS.md`.
- **Review.**
  1. The library's order spec heard two sounds whose sprite order is also
     their alphabetical order, so it passed with the sounds sorted (the
     reviewer proved it on a copy). Fixed: three sounds, heard in an order
     neither the sprite's, its reverse nor the alphabet's.
  2. `frontend/games/AGENTS.md` said a game's rules share the helpers,
     the frame's sounds among them, which only a view uses. Fixed: the
     game shares them, and the rules may import no other library.
  3. The reason given for `createFrameSounds()` was a layer rule the
     scene's fence doesn't hold, and the plan's A11.1 and its sound section
     disagreed with it. Fixed: the reason is that `SOUNDS` is the view's,
     and A11.1 and the sound section name the view's `FrameSounds` and the
     library.
  4. The library's class doc spoke of bricks and streaks. Fixed: hits and
     a rising run.

## L1.4: points in words

2026-10-31.

- **Built.** `formatPoints()` in `@fz/core/format`, beside `count()`,
  unchanged, with Brick Breaker's cases, at 100%. Brick Breaker's
  `describe.ts` and its five shell components import it from there, and
  its screenshot script loads it from `@fz/core/format` through Vite, as it
  loads the rules.
- **Choices.** The script loads `@fz/core/format` through Vite, as it loads
  the rules, rather than importing it as it imports `@fz/style/themes`:
  `@fz/core` isn't held to `erasableSyntaxOnly`, so Node can't strip every
  file of it (`event_log.ts`'s parameter properties stop it), and a static
  import that works for `format.ts` today would break the day it gains
  such a construct, in a script CI never runs. `keepRun()`'s doc says so.
  Its `load()` takes a module id rather than a path under the game, since
  Vite's `runnerImport()` resolves a workspace's package as it does a file
  (checked by loading the script's three modules as it now does, in Node:
  `formatPoints(4250)` wrote "4,250").
- **Checks.** `@fz/core`: lint, typecheck, test (70 tests, 100%).
  `brick-breaker`: lint, typecheck (the scripts' too), test (1981 tests,
  floors held). `yarn prettier:check`,
  `node .agents/check-skill-references.mjs`. Docs: `@fz/core`'s
  `AGENTS.md` and `package.json`, `frontend/games/AGENTS.md` and Brick
  Breaker's `AGENTS.md`.
- **Review.** The reviewer also looked across L1's four commits and found
  their names, docs and specs consistent.
  1. The log's reason for loading `@fz/core/format` through Vite skipped
     the question a reader asks, since the script imports `@fz/style`'s
     TypeScript directly, and its proof read as the script's output.
     Fixed: the reason is the library's syntax, which Node can't always
     strip, in the log and in `keepRun()`'s doc, and the proof names the
     call it made.
  2. The lists named the helper "points in words", unlike every other
     doc's "grouped in thousands", and two edited paragraphs ran past 80
     columns. Fixed: "points grouped in thousands" everywhere, re-wrapped.
  3. Brick Breaker's `describe.ts` paragraph, rewritten here, never named
     `formatCustomPercent()`. Fixed: it does.

## L1: done

2026-10-31. `yarn verify` passed on L1.4's commit: lint, typecheck, test
and build across every workspace.

## L2.1: a sound held

2026-10-31.

- **Built.** `SpritePlayer.hold(name, held)` in `@fz/phaser/sound`: held,
  a sound of the sprite starts looping, once the sprite has loaded and
  while the player wants sound, and plays on, unchanged, while it is held
  again; let go, it is destroyed, which stops it and has the game's sound
  manager drop it. `follow(false)` and the scene's end (`whenSceneEnds()`)
  let go of every sound held. Specced: the loop asked for, a sound held
  again played on as it was, one sound per name however often held, one
  let go of two, held again, a sound let go that wasn't held, sound turned
  off, and on again while held, sound never wanted or not yet asked for,
  the sprite not yet loaded, and the scene ended; each hook fails its spec
  when taken out.
- **Choices.** A scene calls `hold()` every frame with whether its key is
  down, so a sound turned off and on again, or a sprite that loads late,
  starts on the next frame without the player keeping state of its own.
  The specs read the game's sound manager for the sounds not yet let go
  (`getAll()`, `pendingRemove`), as the headless game plays no audio;
  the loop itself is the one call watched, on `NoAudioSound`'s prototype,
  as `play()`'s specs watch theirs. The plan said the specs would load
  the served WAV; the headless game has no audio to load it into, so they
  put the sprite in the cache as `play()`'s do, and the plan says so now.
- **Checks.** `@fz/phaser`: lint, typecheck, test (303 tests, floors
  held). `yarn prettier:check`, `node .agents/check-skill-references.mjs`.
  Docs: `@fz/phaser`'s `AGENTS.md` and the `phaser-core` skill.
- **Review.**
  1. Nothing checked that a sound held again plays on as it was: a
     `hold()` that restarted the loop each frame, a buzz under Web Audio,
     passed every spec (the reviewer proved it on a copy). Fixed: a spec
     watches that the second hold plays nothing.
  2. Nothing checked sound turned off and on while a key is held, the
     case the per-frame call is for: without `clear()`, the sounds
     destroyed stayed in the map and the hum never came back. Fixed: a
     spec, which fails on that copy.
  3. `held` was both the map and the parameter, beside `holding`. Fixed:
     `heldSounds`, `sound` and `looping`.
  4. The alias of `addAudioSprite()`'s return type was Phaser's
     `Sound.BaseSound` in other words. Fixed: the map holds that.
  5. Nits. Fixed: the loop's config is one `LOOP`, made once; the skill's
     line and a spec's doc re-wrapped; the scene-end spec stops the scene
     by its own key, not the harness's (through the game's scene manager,
     as the scene's own plugin only queues the stop).

## L2: done

2026-10-31. `yarn verify` passed on L2.1's commit.

## L3.1: a deck in the layout check

2026-10-31.

- **Built.** `@fz/dev/layout`'s `PhaserBoard` takes an optional `deck`, a
  `PhaserDeck`: the attribute of the board's element that lists the deck's
  zones, such as `data-deck`, the zones it must show, by name, and the
  least a zone may be across and down. `inspectPhaserDeck()`, a second
  inspection run in the page once the board's says where the board lies,
  reads each zone, a one-word name and "x y width height" in CSS px on the
  canvas, the zones parted by commas, and says which runs off the canvas
  or out of the window, lies over the board or a control of the bar that
  shows, or another zone, or is smaller than the least, by its name; the
  attribute missing, a zone it can't read, doesn't know or finds twice, and
  a zone it must show and doesn't, are problems too. `checkLayout()` reports the deck's problems
  after the board's, before the game's own. Brick Breaker's and Snake's
  checks name no deck, so nothing of theirs changed.
- **Choices.** Each zone is named in the list, which the plan's "x y width
  height" left out, so a problem says "the deck's stick zone" rather than a
  zone's place in the list, and the deck names the zones it must show, so
  a deck that stops showing fails the check rather than passing it with
  nothing to check; a game checks its layout with its deck shown, which
  A15.1 now says. The least is the deck's, one number for every zone,
  since Asteroid Breaker's stick and buttons both want a thumb's room (112
  CSS px at the least, as its design gives the sideways deck). The deck's
  inspection is its own function, so `inspectPhaserBoard()` is as it was;
  it runs in the page from its source alone, so its one helper,
  `overlaps()`, is declared inside it (checked by importing it as the check
  scripts do, under Node's type stripping, and running its source in a
  bare jsdom window). The layout spec's fake browser told the bar's check
  from the others by the words "fz-game-bar button", which the deck's
  inspection holds too; it tells each by its function's name now, as it
  already did the board's.
- **Checks.** `@fz/dev`: lint, typecheck, test (215 tests, floors held;
  `board_page.ts` fully covered), and twenty-five mutants of the deck's
  inspection, each of a bound, a clause of `overlaps()`, the least, a
  hidden control, an unknown or a missing zone, the bar's links, a
  second control, a fifth number, a zone twice, zones over each other,
  each caught by its spec.
  `brick-breaker` and `snake`: typecheck (their check scripts).
  `yarn prettier:check`, `node .agents/check-skill-references.mjs`. Docs:
  `@fz/dev`'s `AGENTS.md`, and the plan's L3.1 and A15.1.
- **Review.** The first version checked the deck inside
  `inspectPhaserBoard()`, and the review found:
  1. Its specs passed with half the check broken: the window's top and
     bottom, two clauses of the overlap, the least's `<`, either half of a
     hidden control's test (the reviewer proved each on a copy). Fixed: a
     case for each, and the mutants above.
  2. Nothing held a zone on the canvas, though the scene draws it and
     touches reach it there; sideways, the bar's rail lies in the window
     beyond the canvas. Fixed: a zone off the canvas is a problem.
  3. An empty list passed, so a check in a headless Chrome, which is no
     touch screen, would have checked nothing. Fixed: the deck names its
     zones, each must show, and A15.1 shows the deck through `before()`.
  4. The new specs' stubs were never restored, the `afterEach` being
     inside the board's describe. Fixed: it is the file's.
  5. The helpers inside the inspection shadowed its names and half read
     its closure. Fixed: the deck's inspection is its own function, with
     `Rect` declared beside the module's other types.
  6. "The deck's buttons is …" read wrongly, a name of two words would
     have been unreadable, and two docs had lines left unwrapped. Fixed:
     "zone" after every name, a name is one word, re-wrapped.

  The fixes reshaped the change, so it was reviewed again before its
  commit.

  The second review found:
  1. Nothing kept the zones apart, though the design does, upright and on
     its side. Fixed: a zone over another is a problem, specced on each
     side of the edge.
  2. A zone listed twice replaced the first, unchecked (the reviewer showed
     it in a headless Chrome). Fixed: the second is a problem.
  3. Three mutants passed: the bar's links left out, the controls' walk
     stopped at the first overlap, a zone of five numbers read. Fixed: the
     page's bar has a link, a case lies under two controls, and one gives
     five numbers.
  4. `canvas` was the element in the board's inspection and its rectangle
     in the deck's. Fixed: `shown`, as the board's names it.
  5. `Rect`'s doc said "in the window" of rectangles on the canvas too, the
     plan's table of lifted pieces described the deck as it was first
     built, and four one-line docs ran long. Fixed.
  6. Optional, and done: the fake browser answers from a table rather than
     five nested conditions, and "a board with no canvas" was one with no
     element, so it is named so, beside a case with no canvas.

## L3: done

2026-10-31. `yarn verify` passed on L3.1's commit.

## L4.1: docs

2026-10-31.

- **Built.** The `fuzzley-ui` skill names `@fz/core`'s new helpers, in its
  description, its triggers and its table of libraries, which now gives
  the library a game's code with no framework, not its rules alone, and
  says where to reach for each: a clock of fixed steps, a log of events, a
  frame's sounds and points written as a player reads them. The
  `phaser-core` skill, where a Phaser game's author starts, names the
  clock and the log where it says how a game runs in time.
- **Choices.** Every other doc the plan's L4.1 named was brought up to
  date in the step that made it untrue, as the plan's "A step is a commit"
  asks: `@fz/core`'s `AGENTS.md` and `package.json` with each of L1's
  four, `frontend/games/AGENTS.md` and Brick Breaker's `AGENTS.md` with
  the step that moved what they named, `@fz/phaser`'s `AGENTS.md` and
  the `phaser-core` skill's line on sound with L2.1, and `@fz/dev`'s
  `AGENTS.md` with L3.1. A sweep of every `AGENTS.md` and skill for the
  old homes (`stepper.ts`'s clock, `EventLog`, `FrameSounds`,
  `formatPoints()`) found none left; the `brick-breaker-testing` skill
  named none of them.
- **Checks.** `node .agents/check-skill-references.mjs`,
  `yarn prettier:check`. L4's `yarn verify` is L5.1's first run.
- **Review.**
  1. The skill's description ran to 1,062 characters, past the 1,024 a
     skill's loader may cut it at, and its triggers come last. Fixed: 995,
     the library named for a game's code with no framework, as its shells
     import it too.
  2. `phaser-core`, where Asteroid Breaker's builder will look first,
     didn't name the lifted clock and log. Fixed.
  3. `stepsIn()` was written bare, beside Brick Breaker's `stepsIn(ms)` of
     the same name. Fixed: `stepsIn(ms, stepMs)`.
  4. The log's row didn't say how it is made, nor name `latest`, which
     every reader keeps, and said the shell plays events it only reads.
     Fixed.
  5. A row read badly, `FrameSounds` lacked its `<Name>` beside
     `EventLog<E>`, and the new rows' first cells widened the table, so
     every row of it changed. Fixed: the cells fit the column as it was.
  6. L4 had no `yarn verify` of its own. L5.1's first run is it, as the
     line above says.

## L5.1 and Q1: Brick Breaker unchanged

2026-10-31, on `9aa6769f`.

- **`yarn verify`** passed: lint, typecheck, test and build across every
  workspace. It is L4's run too.
- **Brick Breaker's `check:layout`** holds at each shape, turned both
  ways: roomy, the phones upright and on their side, and the small and
  smallest phones.
- **Its sounds, the same bytes.** `yarn build:sounds` wrote
  `sounds.wav` `e14d3425…bc4e214f` and `sounds.json` `098d8d41…f2d14e01`
  (SHA-256), as `main`'s are, and left the tree unchanged.
- **`yarn report:levels`, the same numbers.** Its table on this branch and
  on `main` (`fc53b01e`) are the same, line for line: every level's time,
  the time on its last three bricks, bounces and balls lost, at each
  speed.
- **Played** on the worktree's dev server in the DevTools MCP's Chrome,
  with real mouse, key and touch events sent to the canvas and the board,
  as Brick Breaker's Q3 did. The served modules were checked to be the
  lifted ones by two of the four: `stepper.ts` imports
  `lib/core/src/clock.ts`, and `event_log.ts` loads.
  - **Mouse.** At 1280 × 800, level 1 (Stripes) at Normal: the paddle goes
    to 6 and to 20 units as the pointer does, and a click launches. An
    in-page autopilot following the ball cleared the level in about four
    minutes without losing a ball, once it met the ball off the paddle's
    middle: met dead centre, the ball came back the same way, and the
    last 7 bricks went untouched until the page was reloaded, the run
    taken up and the aim varied. The Cleared card added it up as bricks
    3,900, streaks 1,700 and bonus 1,500, a score of 7,100, and Next level
    opened level 2, Gifts. The log's events came in order, every one read
    once: on the last stretch, 50 (29 off the walls, 12 off the paddle, 7
    broken, a launch and the clear).
  - **Keys.** ← held moves the paddle 12.6 units, as its 50 units a second
    after a 120 ms ramp give for a hold a frame past 0.3 s, and D brings
    it back; Space launches; Escape pauses, showing the Paused card; P goes
    on. A ball lost was served again after its beat.
  - **Touch.** As a phone (390 × 844 at 3×, touch emulated): the run saved
    before the reload is taken up, paused; Resume tapped, the Ready card
    says "Tap to launch."; a finger dragged 6 units moves the paddle 6
    units, and a tap launches.
  - **Console.** Clean, at both sizes and through every reload.
- **Not checked here.** Sound by ear, a real phone, and browsers but
  Chrome: Part 1 changed how the scene gathers its sounds, not what they
  are, and `bricks_scene.spec.ts` holds the sprite's order; Q3 plays on
  real phones. A run lost to its end was not played; the run's and the
  result's specs cover it, and `formatPoints()` there is the same
  function the Cleared card's tally showed working.
- **Part 1 is done.** `asteroid-breaker` is cut from
  `asteroid-breaker-lift` here.
- **Review.**
  1. The first entry played 20 seconds of level 1 and said nothing of
     what went unchecked. Fixed: the level played to its clear, its card's
     tally and the next level logged, and what wasn't checked said, with
     what covers each.
  2. Its count, 44 events, was the log's serial, not what was read (34).
     Fixed: the clear's last stretch, counted, every kind named.
  3. `report:levels`' `last` is the time on the last three bricks, not
     the last brick. Fixed.
  4. "Cut from this commit's tip" named no branch. Fixed.
  5. Only two of the four lifted modules were checked by name. Said so.
  6. The keys' 12.6 units stood alone. Fixed: what the paddle's speed and
     ramp give for the hold.
  7. The labels' style differed from the log's, a line of housekeeping
     stood among the results, and "each turn both ways" misnamed the two
     turns. Fixed.

## A1.1: the workspace

2026-10-31, on `asteroid-breaker`, cut from `asteroid-breaker-lift` at
`a52ebd30`.

- **Built.** `frontend/games/asteroid-breaker/`, the workspace
  `asteroid-breaker`, from Brick Breaker's: its `package.json`, with the
  same libraries and tools, `phaser`, `@fz/phaser` and `@fz/core` among
  them; `gameConfig({ port: 9005, name: "Asteroid Breaker" })`;
  `angularTests()` with Brick Breaker's floors on the rules and the view;
  ESLint with `@fz/dev`'s blocks, `phaser()` for the scene and the four
  layers' fences; the tsconfig solution for the app, the specs and the
  Vite configs; stylelint with `@fz/style`'s preset; a test setup that
  installs the headless Phaser first; `index.html`, with the palette, the
  icons, the description and the structured data; and a shell,
  `AppComponent`, that shows the game's name in the page's main landmark,
  over `@fz/style`'s global stylesheet. Its `AGENTS.md`, `CLAUDE.md`,
  `README.md` and `LICENSE` are Brick Breaker's in shape, saying only what
  holds yet. `yarn install` added it to `yarn.lock`; `games.json` doesn't
  list it, so the site's build leaves it out.
- **Choices.**
  - The view's fence lets in `@fz/style/fuzzball`, as "Layers" says.
    `@fz/style` as a pattern excludes the package's folder, which git's
    ignore rules, the fence's, can't take a file back from, so the view
    names `@fz/style`'s entries, `@fz/style/*`, rather than the package,
    as it already did `@fz/phaser`'s, and the package's own entry in a
    pattern of its own, `regex: "^@fz/style$"`, which excludes nothing
    beneath it. A probe found it: the first version blocked the fuzzball
    too.
  - What has nothing to hold yet waits for it: no `tools/`, so no
    `tsconfig.scripts.json`, no `scripts()` block, and `lint` names `src`
    and the configs alone, since ESLint and `tsc` fail on a folder or a
    project with no files; the test setup has no dialog polyfill and
    doesn't clear `localStorage`, for no dialog or store exists;
    `main.ts` provides zoneless change detection alone, `THEME_COLOR_ROLE`
    and the app initializer coming with the theme and the saved game; and
    `index.html` has no `og:image` or `twitter:card`, which A16.1's preview
    brings.
  - The globs that name what is coming stay, as Brick Breaker's: the
    floors on `src/rules/**` and `src/view/**`, the fences, and
    `src/testing/**` in the coverage's and the specs' blocks. Each matches
    nothing yet, which passes (Vitest's floors on no files included).
  - The `AGENTS.md` table names the layers without paths, since the
    reference check holds a backticked path to existing, and only
    `src/app/` does.
- **Checks.** The workspace's `lint`, `typecheck`, `test` (1 test, 100%)
  and `build` (`dist/` with `game.json`, "Asteroid Breaker", the icons and
  `theme.js`); `yarn constraints`, `yarn dedupe --check`,
  `node .agents/check-skill-references.mjs`, `yarn prettier:check`. The
  install's one new peer warning is Brick Breaker's, `@angular/forms` for
  the CDK. The fences, probed with files of each layer's imports, then
  deleted: the rules take `@fz/core` and not the fuzzball; the view the
  fuzzball, `@fz/core` and `@fz/phaser/color`, and not `@fz/style` itself
  or `@fz/style/themes`, `@fz/ui`, `@fz/game-ui`, `@fz/phaser/host`,
  Phaser or Angular; the scene Phaser and not the fuzzball or `@fz/ui`;
  the shell the host by type, and not Phaser or `@fz/phaser/scene` by
  value. The dev server on 9005 serves the page in the stored palette, the
  name in the middle, with no scroll and no console message but Vite's and
  Angular's.
- **Review.**
  1. The view's fence listed `@fz/ui` and `@fz/game-ui` by hand, a second
     copy of the shell's libraries, so one added to them later would be
     fenced off from the scene and not the view. Fixed: `UI_LIBRARIES`,
     which `SHELL_LIBRARIES` spreads, and the view takes.
  2. The view could import `@fz/style` itself, the fence resting on that
     package's exports staying Sass. Fixed: a pattern of its own,
     `regex: "^@fz/style$"`, which the reviewer and the probe above both
     found blocks the package and not the fuzzball.
  3. The `AGENTS.md`'s stack named signals, `@fz/ui` and `@fz/game-ui` as
     the shell's, and a field, none of which exists yet. Fixed: the field
     is to be drawn, and the shell wears `@fz/style`'s global stylesheet so
     far, the other libraries among its dependencies.
  4. This entry's probe named `@fz/style/palettes`, which isn't an entry,
     and called the Sass the package's one entry, of eight. Fixed: the
     probe ran again with `@fz/style/themes`, and the Sass is the
     package's own entry, as the first choice above now says.

## A1: done

2026-10-31. `yarn verify` passed on A1.1's commit, `f0069a09`: lint,
typecheck, test and build across every workspace, Asteroid Breaker's among
them. The site's build copied the five games `games.json` lists, and not
Asteroid Breaker.

## A2.1: the step and the speeds

2026-10-31.

- **Built.** `src/rules/tuning.ts`, the file the game's numbers are kept
  in, with the step's for now: 1/120 s, and 12 at most a frame.
  `src/rules/stepper.ts`, Brick Breaker's: the step in milliseconds,
  `stepsIn()` for a timer kept in steps, and `createFieldClock()` on
  `@fz/core/clock`. `src/rules/speed.ts`: `SPEEDS`, Relaxed, Normal and
  Fast, the type `Speed` taken from it, and for each its name, what it is
  like for the settings, and three factors against Normal's: `motion`, on
  how fast the rocks and the comets move; `cometRate`, on how often a
  comet comes; and `drops`, on the chance a broken rock lets a pickup go;
  with `isSpeed()`, for what storage reads back.
- **Choices.**
  - The plan names no factor for how fast the rocks move. Relaxed's 0.8
    and Fast's 1.2 are Brick Breaker's ball speeds against Normal's, 20, 25
    and 30 units a second, as first guesses; Q3 and the autopilot settle
    them. Relaxed sends comets half as often and lets a quarter more
    pickups go, as decided; Fast does as Normal does.
  - Each factor is named for what it multiplies, beside the names the plan
    gives the waves' and the rock kinds' own numbers: a rock kind's
    `speed`, a wave's `pace`, its `comets.every`, the time between two,
    and its `drops`, the chance this one scales.
  - `tuning.ts` holds only the numbers code reads, each later step adding
    its own with the code that reads it, rather than the whole table of
    "The feel, in numbers" at once with nothing to read most of it.
  - The clock goes through a `stepper.ts` of the game's, as Brick
    Breaker's does, so the field, the scene and the specs share one step;
    the plan's "The rules" now names it.
  - `isSpeed()` compares each speed with the value rather than casting the
    value to `Speed` for `includes()`.
  - No Custom speed: the plan leaves it out ("Not in this plan").
- **Checks.** The workspace's `lint`, `typecheck` and `test` (19 tests,
  the rules fully covered), `yarn prettier:check`,
  `node .agents/check-skill-references.mjs`. Twelve mutants, each caught:
  `isSpeed()` taking any string; Relaxed's and Fast's `motion` each at
  Normal's; Relaxed's `cometRate` and `drops` at Normal's; Fast's
  `cometRate` and `drops` at Relaxed's; Normal's `drops` at 1.1; Fast
  left out of `SPEEDS`, now a compile error as well as a failing spec; the
  step at 1/60 s; 10 steps a frame; and the step's milliseconds off by
  one.
- **Review.**
  1. The factors were `speed`, `comets` and `pickups`, which clash with
     the setting's own name, a rock kind's `speed` and the wave's
     `comets` and `pickups`, which the plan gives other meanings: a
     comet's `every` is a time between two, which a count invites
     multiplying, doubling Relaxed's comets rather than halving them.
     `Speed`'s doc left out what else a speed sets. Fixed: `motion`,
     `cometRate` (its doc says the time between two is divided by it) and
     `drops`, and the doc widened.
  2. Fast's "Quicker rocks and comets from the first wave." read as
     comets from the first wave, which come from wave 13, and Relaxed's
     left out its slower comets. Fixed: "Quicker rocks and comets.", and
     "Slower rocks, fewer and slower comets, and more pickups."
  3. `Speed` and `SPEEDS` were two lists to keep in step, why Fast left
     out of the list first survived. Fixed: the type is taken from the
     list, `as const`, as Sudoku's are, so a speed left out of it doesn't
     compile; the spec of the list's order stays, for the menu's.
  4. The log counted eleven mutants and listed ten, and Brick Breaker's
     ball read oddly. Fixed, the mutants run again on the new names, two
     more among them.
  5. Normal's spec named its three factors, so a fourth would slip past
     it. Fixed: it takes every field but the name and the text.

## A2.2: the torus

2026-10-31.

- **Built.** `src/rules/torus.ts`: `Torus`, the field's size in units;
  `torusFor()`, the field for a room of a shape, its short side 40 units
  and its long as many as the shape holds, up to 88; `wrap()`, a
  coordinate put back on its axis; `across()`, the shortest way along an
  axis from one coordinate to another, across the wrap or not;
  `distanceSquared()` and `distance()` between two places; and
  `copyShift()`, where on an axis an object reaching past an edge needs a
  copy drawn. `tuning.ts` gains the field's two sides, 40 and 88.
- **Choices.**
  - `torusFor()` takes the room's sides in any unit, so the view's
    `fieldShape()` (A7) hands it the room it measures, and a spec or the
    autopilot names a field by its shape: `torusFor(88, 40)` is the
    widest. A side that isn't a finite number above 0 throws a
    `RangeError`, as a field with no room is a caller's bug; the view
    must not ask for one while the page is hidden, which the plan's A7.1
    now says.
  - The functions take a place's coordinates one by one, not as `{ x, y }`
    objects, since the physics measures thousands of pairs a step and
    nothing it does a step may allocate (the `phaser-canvas-performance`
    skill); `torusFor()`, called as a wave starts or on a pause, is the one
    that allocates. For the same reason `wrap()` and `across()` take the
    remainder, slow on floats, only for a place off the axis, or lengths
    off it.
  - `copyShift()` answers for one axis. The view draws an object once,
    then once more for each axis whose shift isn't 0, and once more at the
    corner when both aren't: one, two or four times, never three, which is
    the plan's "one to four". An object touching an edge needs no copy;
    one past it does.
  - `across()` gives half a length ahead as ahead and half back as back,
    either being as short. `wrap()` keeps a coordinate just short of 0
    from rounding to the length itself, which is off the axis.
- **Checks.** The workspace's `lint`, `typecheck` and `test` (59 tests,
  the rules fully covered), `yarn prettier:check`. Twenty-five mutants,
  each caught: `wrap()` without its rounding guard, or with its fast path
  taking the length itself or a place below 0; `across()` with each bound
  made inclusive, each wrap left out, its remainder left out, or taken
  only ahead or only back; `distanceSquared()` measuring either axis by
  the other's length, or dropping the second axis; `distance()` without
  its root; `torusFor()` without the longest side, taking the sides'
  ratio one way only, laying the field on the wrong side, or taking an
  infinite or a 0 side; `copyShift()` with either bound inclusive or
  either shift turned round; and each of the field's sides in `tuning.ts`
  changed. Over a million random pairs up to 200 units off the axis,
  `across()` with its fast path gives what it gave without it, and runs
  1.8 times as fast on places on the axis (a bench of mine, warmed up,
  over 8,000 precomputed pairs).
- **Review.**
  1. `across()` took a float's remainder, which V8 makes a call into C,
     for every pair, about 8,000 a step: the reviewer's bench of 30 shots
     against 105 rocks took 79 µs a step with it and 14 µs without, near a
     quarter of the frame's budget at the plan's ×6 throttle. Fixed: the
     remainder only for a way longer than the length, and `wrap()`
     returning a place on the axis as it is; a case lengths off the axis
     each way holds both halves of the guard.
  2. The log promised the view "will not" ask for a field with no room,
     which nothing in the plan required, while a board measured as Brick
     Breaker's is reads 0 by 0 when hidden, and throwing in its observer
     would fail the layout check. Fixed: the plan's A7.1 says
     `fieldShape()` keeps the field it had while its room has no area, and
     never asks `torusFor()` for one; the log says "must not". The throw
     stays, rather than a square field for no room, since a hidden page
     should keep the field it shows, not reshape it.
  3. The error said "must be above 0, not Infinity". Fixed: "a finite
     number above 0".
  4. Two of `torusFor()`'s cases compared floats with `toEqual` against
     the code's own formula. Fixed: the plan's table's numbers, 72.58 and
     61.64, through `expect.closeTo()`, in an array, as Brick Breaker's
     `flourish.spec.ts` holds them, since the lint refuses the matcher's
     `any` as an object's property.
  5. `copyShift()`'s doc didn't say it takes a place just off the axis, as
     one drawn between two steps across the wrap is, its names printed "a
     copy -1 lengths on", and `tuning.ts` wrote 2.2, which the two sides
     give. Fixed: the doc says it, a case just before the start and one
     just after the end, a word for each shift, and the longest side's doc
     in terms of the short one.

## A2.3: the ship's flight

2026-10-31.

- **Built.** `src/rules/ship.ts`:
  - `Steer`, what a frame steers by: the keys' turn from −1 to 1, a
    stick's heading or the mouse's `aim`, a place on the field; a push
    from 0 to 1; fire; a dash. It is a record the view writes each frame,
    with `STILL`.
  - `Flight`, the five numbers the debug menu will tune in flight, with
    `TUNED_FLIGHT`, `tuning.ts`'s.
  - `Ship`, stepped in place, with where it was and pointed a step ago, for
    the scene to draw between; `Held`, its copy of the step before's
    steering; and where a stick held as it came pointed.
  - `createShip()`, waiting with its nose up, given what the player holds
    as it comes, which every caller must say; `isGuarded()`; `guardShip()`,
    for the field's guard between steps.
  - `flyShip()`, a step's flight: the turn by keys, ramped in, or toward
    the mouse or a stick's heading, slowing into it; the push, the coasting
    and the top speed; the dash; and the wrap.

  `torus.ts` gains `Place`; `tuning.ts` the flight's numbers, the dash's,
  a new ship's guard and the stick's slack; `tuning.spec.ts` holds what
  tuning them must not break.

- **Choices.**
  - Angles are radians, 0 along x and a quarter turn along y, which on the
    field, its y running down, is clockwise; a key's turn of 1 is
    clockwise, as → is.
  - `Steer`'s fields are writable and `flyShip()` takes it `Readonly`, as
    Brick Breaker's paddle does, so the view writes one record a frame and
    allocates none. At most one of the keys' turn, the stick's heading and
    the mouse's aim turns the ship, the others 0 and null, which the view
    keeps to.
  - The mouse aims at a place, not a heading, as Brick Breaker's pointer
    is a place: a still pointer gives the same place whatever the ship
    does, where a heading toward it changes as the ship moves. The ship
    turns toward it straight, as the player sees it, not the shorter way
    across an edge, and not at all toward its own place. The view keeps the
    place it found as the pointer last moved, so a still pointer gives the
    same place every frame, through a resize or a pause's stretch too, which
    `aim`'s doc says for A7.2; A7.2 in the plan also gives the stick's rings
    some give, so a resting thumb doesn't flicker a push on and off.
  - A waiting ship goes at a fresh move only: a keys' turn begun or turned
    round, a stick's heading begun or turned more than `STICK_SLACK`, 8°,
    from where it pointed as the ship came, the mouse moved, a push begun,
    or fire or a dash pressed. What the player holds as a ship comes
    (`createShip()`'s `held`) is no move until it changes, so a still
    pointer, a resting thumb's tremble or fire held from the ship just lost
    doesn't end the wait; let go and given again, each does. `held` has no
    default, as "Fire by itself" holds fire every frame: a ship made as if
    nothing were held, as a wave's first could be, would go at once. A dash
    that ends a wait throws the ship at once.
  - The coasting slows the ship every step, thrusting or not, so a turn
    while it thrusts swings its course round; the top speed caps it, the
    coasting's slowing there being under 7 units a second each second
    against the thrust's 24. Q3 will say if it feels right.
  - The keys' turn ramps in, in a straight line, over 80 ms, and starts
    over whenever its sign changes: as it starts, as it turns round, and
    after the mouse or a stick turned the ship. A 40 ms tap turns about 4°,
    a corrective one the other way too. Toward a heading, the most a step
    turns shrinks with what is left within 12° of it, so the ship comes to
    it gently, and a bound keeps it from turning past it.
  - The dash sets the ship's speed along its heading after the step's turn,
    and neither thrust nor coasting touch it until the throw ends; the ship
    can still turn. Then it flies at what it flew at before, plus
    `DASH_CARRY`, 4 units a second, along the heading it ends on, a first
    guess for "a little", and the step's push keeps it under its top speed.
    A held dash dashes once, and the recharge counts from the dash's start,
    so the ring fills from the press.
  - Timers count down as a step starts, so one set in a step counts it: a
    dash of 26 steps throws the ship for 26, and a guard of 38 holds
    through 38 tests of what touches it. A new ship's 2 s guard, from its
    first move, and a dash's 0.32 s keep the longer. `guardShip()`, for a
    guard set between steps, as the pause's 1 s is, adds the step the next
    one counts down first, so the field needn't; A5.3 in the plan names it.
  - `Flight` holds the numbers the debug menu tunes in flight (thrust, top
    speed, coasting, both turn rates), so `flyShip()` takes one, the tuned
    by default; the dash, the ramp and the slack, which it doesn't tune,
    are read from `tuning.ts`.
  - The specs take every speed, time and turn from `tuning.ts`, so tuning
    the feel at Q3 breaks none of them while `tuning.spec.ts` holds. It
    holds what no tuning may break: full thrust reaching the top speed
    against the coasting; the keys' ramp over several steps, so a tap turns
    less than a held key; the turn toward a heading easing within a quarter
    turn of it, and slowing over more than a step's turn; and the dash
    faster than the top speed, leaving a ship less than half its top speed
    faster, guarded for more steps than it throws, and recharged only after
    its guard ends, in steps, or dashing could keep a ship untouchable.
- **Checks.** The workspace's `lint`, `typecheck` and `test` (136 tests,
  the rules fully covered), `yarn prettier:check`.
  - **Tuning.** Each of the flight's numbers set alone to the ends of the
    debug menu's ranges and past them: the top speed 6 and 30, the thrust 8
    and 60, the coasting's half-life 300, 700 and 6,000 ms, the keys' rate
    120 and 600, their ramp 10, 40 and 200 ms, the heading's rate 180,
    1,200 and 1,440, its ease 6° and 40°, the stick's slack 2° and 30°, and
    the dash's speed, time, guard, recharge, carry and a new ship's guard at
    their ends, a new ship's guard of 250 ms, under the dash's, the dash's
    guard at 2,400 ms, and the ease at 100°. The flight's specs fail only
    where `tuning.spec.ts` does too, which it does where a number breaks
    what it holds: a top speed of 6, which a carry of 4 is more than half
    of; a 300 ms half-life, whose thrust can't reach the top speed; a 10 ms
    ramp, two steps; a heading's rate of 1,440, a step's turn as wide as
    the ease; a 400 ms dash, longer than its guard; a carry of 15; and an
    ease of 100°, past a quarter turn.
  - **Mutants**, in five rounds, each round's survivors given cases.
    - The first, 44, left 10: the ramp not starting over after a heading,
      the ease and the anticlockwise bound left out, the longer guard not
      kept, a redundant clamp at the dash's end, now gone, an equivalent
      `<=`, and four tuning numbers the specs then partly wrote out.
    - The second, 41, left 6: the ramp's restarts, held by a bound of
      exactly one step's turn that rounding passed, and four of `Flight`'s
      numbers read from `tuning.ts` in its place.
    - The third, 61 on the code as the first review reshaped it, left 5:
      the held heading and push not copied, where the ship was a step ago
      not kept, and its y wrapped by the field's width.
    - The fourth, 28 on the code as the second review reshaped it, left 4:
      the mouse's y not compared, its spec moving the pointer across only;
      the flag for whether the mouse aimed, both ways, which the held place
      being zeroed made redundant, so the held place now keeps the last one
      aimed at; and the `return` after a turn toward a heading, which,
      the keys' turn being 0 then, as `Steer` says, changes nothing. The
      first three, run again, are caught.
    - The fifth, the third review's three, each caught once the specs below
      were added: the slack measured from the step before, which a slow,
      deliberate turn would never pass; the slack measured by subtraction
      rather than across the half turn, where a stick pointing left
      crosses from π to −π; and a held turn turned round not counted as a
      move.
- **First review.**
  1. A heading standing from the mouse, or fire or a push held from the
     ship just lost, ended every wait at once. Answered with a fresh move
     against the step before and what `createShip()` is given, which the
     second review found didn't hold for the mouse or a stick (below).
  2. The keys' ramp didn't start over when the turn turned round without a
     step of none between, as Brick Breaker's keys allow, so a corrective
     40 ms tap turned 12.5°, not 4°. Fixed: it starts over whenever the
     turn's sign changes.
  3. The log said tuning broke no spec, but the debug menu's ends broke
     eight, and the wrap's spec started above the top speed. Fixed: every
     number taken from `tuning.ts`, the invariants in `tuning.spec.ts`,
     and the sweep above.
  4. `Steer`'s readonly fields would have made the view allocate a record
     a frame. Fixed: writable, taken `Readonly`.
  5. "Nears its top speed smoothly" was untrue; the cap stops it dead.
     Fixed.
  6. `Ship` kept nothing for the scene to draw between steps. Fixed:
     `lastX`, `lastY` and `lastAngle`, kept while it waits too.
  7. Nothing held the angle within a turn, and the "across 0" spec never
     crossed it. Fixed: both turns' specs cross 0 and hold the angle.
  8. "No faster than its full rate" checked neither. Fixed: signed, "at
     its full rate while far from the heading".
  9. `tuning.spec.ts` compared milliseconds where the rules count steps.
     Fixed: in steps.
  10. `STEP_S * 1000` beside `STEP_MS`, `Ship`'s doc, two `Flight` fields
      without docs, `HEADING_EASE` credited with the bound's work, a held
      dash counted in a loop, and a loose tolerance. Fixed, each.
- **Second review.**
  1. The mouse's heading, an angle from the ship to the pointer, changes
     as a new ship comes at a new place, and a stick under a resting thumb
     trembles, so either still ended the wait at once, compared as exact
     floats. Fixed: the mouse aims at a place, `Steer.aim`, the same under
     a still pointer, and a stick's heading moves a waiting ship only
     begun or turned past `STICK_SLACK` from where it pointed as the ship
     came; specs for a still pointer, a pointer moved either way, a
     trembling stick and one turned past its slack.
  2. No spec held a waiting ship still under what it held, and a dash
     ending a wait wasn't held to throw it. Fixed: the table of what is
     held as a ship comes holds it still, and a spec of the dash.
  3. The turn through a dash, the carry along the heading it ends on, and
     the coasting under thrust had no spec. Fixed, each.
  4. Some specs rested on tuning unsaid: the ramp's specs on a ramp of
     more than two steps, the carry's on room under the top speed, and a
     turn's on 100 ms being whole steps. Fixed: the ramp's first step and
     whole steps taken from the numbers, and both invariants in
     `tuning.spec.ts`.
  5. With no guard exported, A5.3 would have had to repeat both "keep the
     longer" and the step's offset. Fixed: `guardShip()`, specced.
  6. "But while it dashes" read either way, `RADIANS` named no unit, and
     `isGuarded()` could take `Readonly<Ship>`. Fixed. The heading's turn
     setting the ramp to 0 itself would only repeat the sign's rule, given
     `Steer`'s contract, which its doc now states.
- **Third review.** It found the code right in every case it probed, and
  the specs, the contracts and the docs short of it:
  1. The slack had no spec a broken one would fail: measured from the
     step before, or by subtraction across the half turn, it passed.
     Fixed: a stick turned a degree a step until past its slack, a tremble
     either side of where it pointed, and one either side of the half
     turn.
  2. A held turn turned round, which Brick Breaker's keys allow without a
     step of none, had no spec. Fixed.
  3. `aim`'s contract for A7.2 was unwritten, and Brick Breaker's
     `Steering`, which asks for a place only as the pointer moves, would
     break it if ported as it is. Answered in `aim`'s doc and A7.2 in the
     plan: the view keeps the place it found as the pointer last moved.
     The other way, a target kept on the ship, would leave a ship released
     by another move facing away from the mouse until it moved again.
  4. `createShip()`'s default of nothing held would let "Fire by itself"
     end every first wait. Fixed: `held` is required, and `fire`'s doc says
     what holds it.
  5. A dash ending a wait was held to a new ship's guard, which fails when
     the dash's is the longer, and six heading specs rested on an ease
     under a quarter turn. Fixed: the longer of the two, and the ease's
     invariant in `tuning.spec.ts`.
  6. `lastX` and `lastAngle` lie a field or a turn away after a wrap.
     Fixed: their docs say the scene draws between them with `across()`.
  7. The plan's view still gave the pointer as a heading, `flyShip()`'s doc
     counted 26 and 38 steps, which tuning will change, and `aimX`'s "kept
     when it stops" changed nothing the code does. Fixed, each; the held
     place is kept only so a spec can hold the flag beside it.
  8. The stick's rings want some give, for A7.2. Written into A7.2.

  These corrected the change rather than reshaping it, so it is committed
  on them.

## A2.4, first: `keysOf()` into `@fz/core`

2026-10-31.

- **Built.** `@fz/core/records`: `keysOf()`, a record's keys typed as its
  own, moved from Brick Breaker's `src/rules/tables.ts` with its spec; the
  package's `exports` and description, `@fz/core`'s `AGENTS.md`,
  `frontend/games/AGENTS.md` and the `fuzzley-ui` skill name it. Brick
  Breaker's five users import it from there, and its `tables.ts` keeps
  `recordOf()` and `pick()`, which only it uses.
- **Choices.** It moves as A2.4's second review asked, the weapons'
  catalog being the second workspace to need it, as `@fz/core`'s rule
  says, in a commit of its own before A2.4's; the plan's lifted pieces list
  it. The entry is named `records`, for what it takes, as `math` and
  `format` are named for theirs; `isRecord()` stays in `json`, among the
  readers of stored JSON.
- **Checks.** `@fz/core`'s and Brick Breaker's `lint`, `typecheck` and
  `test` (72 and 1,980 tests, `@fz/core` fully covered), the reference
  check, `yarn prettier:check`.
- **Review.**
  1. The skill's description, which Claude Code matches a task against,
     still listed `@fz/core`'s helpers without it. Fixed, and `keysOf`
     among its triggers.
  2. The spec held the keys' order, which `Object.keys()` gives, not their
     type, the one thing `keysOf()` adds. Fixed: an `expectTypeOf` case,
     which `yarn typecheck` checks, as Brick Breaker's `frame.spec.ts` has.
  3. Its doc stated a fact of Brick Breaker's tables, where a library's
     states the caller's condition. Fixed.

  These corrected the change, so it is committed on them.

## A2.4: the weapons and the shots

2026-10-31.

- **Built.**
  - `src/rules/catalog/weapons.ts`: `WEAPONS`, the plain gun, Spread,
    Rapid and Lance, each by `count`, `spreadDeg`, `everyMs`, `inFlight`
    and `breaks`, written `as const satisfies`; `WeaponId`; and
    `WEAPON_IDS`, through `@fz/core/records`'s `keysOf()`, which the
    commit before this one lifts from Brick Breaker (the entry above).
  - `src/rules/shots.ts`: `Shot`; `Shots`, a slot for each shot every
    weapon can have in flight at once, made once, and the time until the
    next pull; `Gunnery` and `TUNED_GUNNERY`, the shot speed, the gun's
    time and whether a shot carries the ship's velocity, which the debug
    menu tunes in flight; `createShots()`; `stepShots()`, each shot flying
    on and wrapping or fading, and a pull fired from the nose, fanned about
    the heading, at the shot speed plus the ship's velocity up to its
    flight's top speed, flying its first step at once; `landShot()`, a shot
    spent on what it meets unless it broke it with breaks left; and
    `sweepShot()`, how far through its step a shot first came within reach
    of a circle, across the wrap, else `MISSED`.
  - `src/rules/angles.ts`: `TURN` and `RADIANS_PER_DEGREE`, lifted from
    `ship.ts`, as the shots need them too.
  - `tuning.ts` gains the ship's length, 2.4, and the shots' numbers: 32
    units a second, the ship's velocity carried, 0.8 s, 140 ms between the
    gun's pulls, 6 in flight and a radius of 0.18.
  - `src/rules/catalog.spec.ts` begins, with the weapons', and
    `tuning.spec.ts` gains three invariants: a shot from a still ship flies
    past the middle of the field's short side, one at the fastest a shot
    goes fades before it circles it, and a shot fired along a dash outruns
    the ship.
- **Choices.**
  - The plan's `passes` is `breaks`, the most rocks one shot breaks: the
    gun's 1 and Lance's 3, where `passes: 1` would read as a gun shot that
    passes through a rock. A rock a shot doesn't break spends it, Lance's
    too, as iron rings a shot off.
  - Spread holds 18 in flight, as many pulls as the gun has shots: at the
    gun's 6 it would fire two pulls and wait, slower than the gun. The
    plan's pickup table says so. Its busiest moment had "Rapid with
    Spread", which one weapon at a time can't be: it now says Spread's 18.
  - Rapid holds 12 in flight, twice the gun's, as it fires twice as often.
    The plan's 10 held fewer than a shot's life of its pulls, 12, so held
    fire came in bursts of ten with a gap of 0.2 s. `catalog.spec.ts` holds
    every weapon to a shot's life of its pulls, and `shots.spec.ts` every
    weapon's held fire to a steady pull, so held fire never waits on a
    weapon's most at the tuned numbers. The debug menu's quickest gun waits
    on it, where the most bounds what the shots cost, as it should.
  - A weapon's most in flight counts only its own shots, each shot keeping
    the weapon that fired it, so a weapon caught fires at once, whatever
    the one before left flying; the plan's pickups say so. There is a slot
    for every weapon's most at once, 42, so a pull that fits its weapon's
    most always finds slots; Q2 and "The physics" count the 42, which
    weapons caught one after another can leave for a moment.
  - A pull waits until all of it fits in flight, so a spread always fans
    three.
  - A weapon is ready a pull's time after the last, fire held or not, so
    pressing again fires no faster than holding, and "Fire by itself" and a
    quick thumb fire alike; it readies while fire isn't held, so a press
    after its time fires at once.
  - The time since the last pull carries through a change of weapon, so a
    weapon caught fires when the one before would have: Rapid caught just
    after the gun's pull waits the gun's 17 steps, not its own 8, and
    weapons caught one after another fire no faster than either. The
    plan's pickups say so.
  - The debug menu's "A shot every" sets the gun's time, and every weapon's
    scales with it (`Gunnery.gunEveryMs`), while the catalog writes Rapid's
    as half `SHOT_EVERY_MS`; so a rate found by playing and copied into
    `tuning.ts` keeps Rapid twice as fast as it was played. The plan's
    debug menu says so.
  - A shot carries the ship's velocity only up to its flight's top speed,
    so a dash throws the ship but not its shots: a shot along a dash goes
    at its own speed and the top speed, 47 units a second, still faster
    than the dash's 34, and fades before it circles the field, as the plan
    says a shot can't. `stepShots()` takes the ship's `Flight` for it, so
    the debug menu's top speed bounds the carry as it bounds the flight.
    The plan's ship and its numbers say so.
  - Shots live in slots made once, one freed as its shot's steps run out,
    so firing allocates nothing, and the scene draws a slot while it has
    steps left. `stepShots()` takes a `WeaponId`, not a `Weapon`, so a pull
    always fits the slots, made for the catalog's weapons.
  - The shots step after the ship, and a pull flies its first step at once
    from where the nose is now, so its first sweep starts at the nose and
    a rock just ahead is met that step; a shot's life counts the step it is
    fired in, as the ship's timers do.
  - A waiting ship fires nothing: "Fire by itself" holds fire, which
    doesn't end a wait, and a ship untouchable as it waits mustn't break
    rocks.
  - `sweepShot()` solves the meeting exactly, a quadratic in the step's
    share, against the circle where it is as the step ends, as "The
    physics" has it: a small rock moves about a tenth of a unit a step at
    the most, a tenth of its reach. It measures the shot's start from the
    circle the shortest way, so it meets only the circle's nearest copy,
    which is the only one in reach while a rock and a step's travel are far
    under half the field's short side. A miss is `MISSED`, infinity, as
    Brick Breaker's sweep has it, so the field takes the first a shot meets
    with a plain `<`.
  - `keysOf()` moves into `@fz/core`, whose rule asks it of a helper a
    second workspace needs, in a commit of its own before this one, the
    entry above; the plan's lifted pieces list it.
  - The specs write a small rock's hit radius out, nine tenths of 0.9,
    until A3.2's rocks; A3.2 in the plan says to take it from there. A
    Lance shot that breaks a rock would meet its pieces, which start where
    the rock was, at once; A3.3 in the plan says it flies on past them.
  - `SHOTS_CARRY_SHIP` sits in `tuning.ts` with the numbers, though the
    debug menu's Reset and Copy take only its sliders, so one file says how
    the game fires.
- **Checks.** The workspace's `lint`, `typecheck` and `test` (210 tests,
  the rules fully covered), `yarn prettier:check`, and `yarn verify`, with
  the lift before it: every workspace's lint, typecheck and tests, and the
  build.
  - **Tuning.** Each of the shots' numbers set alone to the ends of the
    debug menu's ranges and past them: the shot speed 16 and 60, the gun's
    time 60, 120, 150 and 400 ms, the shot's life 400 and 1,200 ms, 3 and 12
    of the gun's in flight, the shot's radius 0.05 and 0.5, the ship's
    length 1.2, the carry off, the top speed 6 and 30, and a dash of 60
    units a second. The
    shots' specs fail only where `tuning.spec.ts` or `catalog.spec.ts` do
    too: a speed of 16 or a life of 400 ms, whose shot doesn't reach the
    field's middle; a speed of 60, a life of 1,200 ms or a top speed of 30,
    whose shot circles it; a dash of 60, faster than a shot fired along it;
    a top speed of 6, which the dash's carry is more than half of; and a
    gun's time of 60 or 120 ms, or 3 of its shots in flight, at which the
    gun holds fewer than a shot's life of its pulls.
  - **Mutants**, in four rounds, each round's survivors given cases.
    - The first, 47: the reload's count, its readying and its time; a
      shot's fading, counting and life; the trigger's four conditions and
      the fit of a pull; `landShot()`'s two conditions; the sweep's wrap,
      reach, start within reach, closing, root and step's end; the pull's
      fan, slots, carry, nose, wraps and first step; and the catalog's
      Spread, Rapid and Lance. Six survived. Four are the same code: the
      sweep's bounds made strict or loose at a touch, and its guard on a
      negative square, whose root's NaN already misses; the guard stays,
      to say so. The slots' first places a pull overwrites. A shot's wrap
      at the top and bottom had no case: now it has, with the nose's wraps
      on both axes.
    - The second, 4: the three wraps, caught, and the carry tuned off,
      which no spec fails now that the specs of the carry say which they
      fire.
    - The third, 10 on the code as the review left it: a weapon's most
      counting every shot, a shot not keeping its weapon, the slots for
      one weapon's most, the carry uncapped or capped by the tuned top
      speed, the carry always on, the nose where the ship was a step ago
      on each axis, and a miss given as 1. One survived, the nose's y,
      whose spec flew the ship along x only; flown on a slant, it is caught.
    - The fourth, 2 on the code as the second review left it: Rapid's most
      back at 10, and a weapon caught firing on its own time rather than
      the last pull's, each caught.
- **Review.**
  1. A weapon's most in flight counted every shot, whichever weapon fired
     it, so a weapon caught as Spread's 18 flew, or the gun as Spread ran
     out with fire held, fired nothing for over half a second. Fixed: a
     shot keeps its weapon, a weapon's most counts its own, and the slots
     hold every weapon's most at once; specced with the gun firing beside
     Spread's 18.
  2. A shot carried a dash's 34 units a second, so one fired along it went
     66 and circled the field's short side, which the plan says a shot
     can't, while the invariant looked only at the top speed. Fixed: the
     carry stops at the flight's top speed, and the invariants hold the
     fastest shot to fading first and to outrunning the dash.
  3. No spec held that a pull leaves from where the ship is after its
     step, which `stepShots()`'s doc asks the field to keep to. Fixed: a
     ship flown a step on a slant fires from its new nose.
  4. The specs listed the weapons by hand, and the fan's spec spelled out
     the degree. Fixed: `WEAPON_IDS`, as Brick Breaker's catalogs export
     their ids, and `RADIANS_PER_DEGREE`.
  5. `sweepShot()` gave null for a miss, where Brick Breaker's sweep gives
     `MISSED`, infinity, which the log's own reason argued for. Fixed:
     `MISSED`.
  6. `yarn verify` ends A2. Run before the commit, below.

  The first two reshape how the shots count and carry, so the step has a
  second review before it is committed.

- **Second review.** It found no bug, and the first review's answers held:
  1. Rapid's 10 in flight held fewer than a shot's life of its pulls, so
     held fire came in bursts. Fixed: 12, twice the gun's, and the specs
     above, of the catalog and of held fire.
  2. The reload carried through a change of weapon, where the plan said a
     weapon caught "fires at once". Kept, as weapons caught one after
     another then fire no faster than either, the plan's sentence saying
     what the code does, and specced.
  3. `keysOf()` was copied, where `@fz/core`'s rule asks for a helper a
     second workspace needs, and no step of the plan would lift it. Fixed:
     lifted in a commit of its own, the entry above.

  These corrected the change rather than reshaping it, so it is committed
  on them.

## A2: done

2026-10-31. `yarn verify` passed on A2.4's commit, `1b425c40`, with the lift
before it, `fcbe223f`: lint, typecheck, test and build across every
workspace, Asteroid Breaker's 210 tests among them, the rules fully covered.

## A3.1: the rocks' catalog

2026-10-31.

- **Built.** `src/rules/catalog/rocks.ts`: `ROCK_SIZES` and `RockSize`, the
  boulder, large, medium and small, largest first, and `BySize`, a number
  for each size a kind comes in; `RockTrait` and
  `RockTraitKind`, a blast, a pickup given, a drift toward the ship and a
  shot rung off, each with its settings; `RockKind`; `ROCK_KINDS`, the
  seven kinds of the plan's table, written `as const satisfies`, with
  `RockKindId`, `ROCK_KIND_IDS` and `rockKind()`, a kind as the shape every
  kind has, as Brick Breaker's bricks are. `src/rules/catalog.spec.ts`
  gains the rocks' part.
- **Choices.**
  - The boulder is a size of its own, which only the boulder comes in, so
    a size's radius and speed (A3.2) cover it as they do the rest, and its
    pieces are the size after, large. Its kind's speed is 1, where the
    plan's table gave 0.6: the plan's 1.5 to 2.5 units a second for the
    boulder is the large size's 2.5 to 4 at 0.6 already, so the boulder
    flies as the plan says, not slowed twice. The plan's table says so.
  - A blast's `reach` is by size, where the plan gave one number for it,
    since its table has a volatile rock reach 6 units from a large one and
    4 from a medium. The plan's catalogs say so.
  - `splits` names pieces of the size after the rock's own, and a small
    rock breaks into nothing whatever it says, so a stone's two pieces
    stand for its every size. The plan said "none for a rock that breaks
    whole"; it now says so.
  - The kinds are in How to play's order, the wave each first comes in:
    stone, crystal, ice, the boulder, iron, the volatile and the lodestone.
  - The names are the table's, "Iron" rather than the plan's example "Iron
    rock", since every one is a rock and How to play heads each with its
    picture.
  - A lodestone's `pull` is 1 unit a second each second, a first guess at
    the plan's "a little each second", tuned at Q3; its size's speed caps
    it (A3.2).
  - `isRockKindId()` and `hasTrait()`, which Brick Breaker's bricks have,
    wait for A3.2's rules and A5's waves, which read them.
- **Checks.** The workspace's `lint`, `typecheck` and `test` (278 tests,
  86 of them the catalogs', the rules fully covered), `yarn
prettier:check`. Eleven mutants of the catalog, each caught: a crystal
  given a small size without its points, an ice rock without its small
  points, a small iron rock worth less than a medium one, an iron rock
  with no medium size, a small lodestone harder than a medium one, a
  crystal breaking into crystals it has no small size for, a volatile
  rock's blast reaching only from large, iron ringing twice, a lodestone
  named "Stone" or not at all, and ice's sentence without its full stop.
  After the review, those and the review's twelve that passed, 21 in all:
  each caught but a small lodestone taking two hits, which only the spec
  the review asked to drop held.
- **Review.**
  1. The boulder's speed was the kind's 0.6 on a size already slowed by
     it. Fixed: 1, as above.
  2. The sentences counted hits and pieces the specs didn't hold to the
     data, and iron's "several hits at each size" was untrue of a small
     one. Fixed: a spec spells out the boulder's hits and pieces and
     ice's, stone's and crystal's pieces, as Brick Breaker's does, and
     iron "takes several hits until it is small".
  3. Twelve broken catalogs passed: a hit, a piece or a point of 0, a name
     in lower case, the boulder's size given to stone or taken from the
     boulder, the boulder breaking into nothing, and a blast, a beat or a
     pull of 0 or less. Fixed: specs of whole hits, pieces and points, one
     at least; the boulder's size and the wave's pieces only the
     boulder's; a name of capitalised words; and every trait's numbers
     above 0.
  4. One test held the name and the sentence together and failed as
     `[true, false]`. Fixed: two, each matching its text.
  5. Two tests took the least or most of an empty list for the boulder.
     Fixed: each lists the steps that break its rule, and expects none.
  6. The type of a number by size was written four times. Fixed: `BySize`,
     exported, which the plan's catalogs use too.
  7. Sizes one after another, and fewer hits at a smaller size, are no
     rules of the design: the pieces' spec holds the sizes a split needs.
     Dropped, both.
  8. `splits`' doc read as if a small rock held null, and the plan's
     catalog spec still read a kind's `from`, which `RockKind` has none of.
     Fixed, each.

  These corrected the change rather than reshaping it, so it is committed
  on them.

## A3.2: the rocks' rules

2026-11-01.

- **Built.** `src/rules/rocks.ts`: `Rock`, laid in place in its slot, with
  the step it was laid at; `RockField`, what of the field the rocks' rules
  act on, its pace among it; `createRocks()`, a free slot for each rock the
  cap holds; `addRock()`, a whole rock of a kind and size laid in the first
  free slot, flying a heading at a speed drawn from its size's, times its
  kind's, with an outline, a turn and a spin drawn; `hitRock()`, a hit or
  a blow that breaks, which logs the hit or the break and splits a broken
  rock into pieces of the size after, turned off its travel and pushed
  along the hit; `stepRocks()`, each whole rock flown and turned at the
  field's pace and wrapped; `setOffBlasts()`, first in a step;
  `rockHitRadius()`; and `TRAIT_RULES`, mapped from the traits' union, at
  four moments: `held`, `broken`, `step` and `goesOff`.
  `src/rules/draws.ts`: `nextDraw()` and `drawIn()`, the field's seeded
  draws. `src/rules/events.ts`: `FieldEventLog`, with the rocks' events:
  a hit held, a ring, a break and a blast. `tuning.ts` gains each size's
  radius and speed, the share of its radius a rock is hit within, a
  rock's spin and a piece's turn and push; the catalog gains
  `sizeAfter()` and `PieceKind`, which its spec and the rules share.
  `src/testing/numbers.ts` holds `stepsBetween()`, which the catalog's and
  the tuning's specs share. `shots.spec.ts` takes a small rock's radius
  from `rockHitRadius()`.
- **Choices.**
  - The cap is the slots. The field's rocks are slots made once, as many
    as its cap, and a split lays its pieces in free ones, its own among
    them, so at the cap a rock splits into as many pieces as there is
    room for, and one at least. The plan's "one piece fewer" is what a
    stone does at the cap; an ice rock there splits into one. The plan
    says so.
  - A volatile rock keeps its slot until it goes off, through its blast,
    and blasts going off together free theirs only once all have, so the
    cap holds every rock and every blast to come, whatever the slots'
    order, and no pool of blasts is needed, nor a rule for one full. A
    split at the cap has one slot fewer for those 90 ms.
  - The beat runs by the field's count of steps, as Brick Breaker's does,
    rather than counting down as the shots' times do: a blast sets off
    another in the same loop, and a countdown there would count the new
    one's first step or not by the order of their slots.
  - A blast reaches a rock when the reach meets its body: its reach plus
    the rock's radius for a hit, from middle to middle across the wrap,
    as the Nova's ring will. It reaches only rocks laid before its step
    (`laidAt`), so neither the pieces it breaks them into nor those of
    another blast in the step are hit, and blasts in one step hit the
    same rocks whatever the order of their slots; which way the pieces
    are pushed, and the draws they take, are still the first blast's to
    reach them.
  - Blasts go off first in a step, once it is counted, as Brick Breaker's
    bricks step before its balls, so a blast reaches the pieces a shot
    laid the step before. `setOffBlasts()` says so, and the plan's
    physics lists them first.
  - A rock's velocity is its own at a pace of 1, and the field's `pace`,
    the wave's, the speed's and Slow's together, scales its flight, its
    turn and a lodestone's pull alike, so Slow halves every rock without
    touching its record, and a course is the same at any pace.
  - A lodestone's pull never takes it past its size's top speed, times its
    kind's, but the cap never brakes a piece pushed past that, as one with
    no ship to drift toward keeps its speed.
  - A piece's push is along the hit's way, made a unit long, so a caller
    passes a shot's velocity or a blast's offset as it has them.
  - The pieces' sides alternate from a side drawn for the first, so two
    turn one each way, and ice's third turns the first's way again.
  - The rules act on `RockField`, which A3.3's `Field` will extend, since
    the rocks come before the field here; Brick Breaker's bricks take its
    `Field`, which came first. `events.ts` and `draws.ts` begin here, as
    the rocks need them; A3.3 adds the field's other events.
  - A broken rock's slot is free as it breaks, so one of its pieces may
    take it: what a caller needs of the broken rock it takes before the
    hit, or from the break's event. A4's scoring and drops go inside
    `hitRock()`, before the split, as Brick Breaker's `hitBrick()` scores.
  - A hit is `"hit"` or a blow that `"breaks"` (a comet's, the Shield's),
    where Brick Breaker's takes a number of hits, as nothing here takes
    two at once.
  - `rings` rings as any hit holds, a blast's as well as a shot's, as
    there is no other sound for a hit that holds. `gives` has no rule
    here: the pickup it lets go is A4's.
  - A rock's outline, turn and spin are drawn as it is laid, since the
    saved game keeps them and the view draws them; the rules use none of
    them. The spin of 6° to 30° a second and the push of 1.5 units a
    second are first guesses, tuned at Q3; the plan's feel table has them.
  - `nextDraw()` is Brick Breaker's two lines around `@fz/core`'s
    `drawAt()`, each on its own field's shape, so it stays each game's
    rather than lifted.
- **Checks.** The workspace's `lint`, `typecheck` and `test` (377 tests,
  the rules fully covered but a blast's reach for a size its rock doesn't
  come in, which the catalog's spec rules out), `yarn prettier:check` and
  the skill references. 68 mutants and 9 tunings before the review: all
  caught but four of the y axis (a blast's push, the pull's way and gain,
  and the cap on it), which diagonal specs and a row along y then caught,
  and a lodestone's top speed without its kind's, which is 1. Tuned, the
  numbers fail only `tuning.spec.ts`, or nothing. After the first review,
  seven more: each caught but a blast's reach met exactly, which the
  specs hold a sliver either side of, and the kind's speed again. After
  the second, four more, each caught: blasts going off together freeing
  their slots one by one, a blast reaching pieces laid the step before
  it no longer, and a beat a step late.
- **Review.**
  1. A broken rock's first piece takes its slot, so the record `hitRock()`
     was given reads as the piece once it returns, and a caller scoring or
     dropping from it after would take the piece's kind and size. Fixed:
     its doc says so, and where to take the broken rock from; a spec pins
     it; and a rock keeps the step it was laid at, `laidAt`. Scoring and
     drops will run inside it, before the split.
  2. Blasts going off in one step built on each other, so a stone between
     two could break once or twice by their slots' order. Fixed: a blast
     reaches only rocks laid before its step, which also keeps its own
     pieces out of its reach, so the list made once went; a spec lays the
     two blasts in either order.
  3. The lodestone's pull ignored the pace, so Slow tightened its turn.
     Fixed: the pace is the field's, `RockField.pace`, which scales the
     flight, the turn and the pull alike; a spec flies a second of a
     rock's time at two paces.
  4. The pull's cap braked a pushed piece faster than its size's top
     speed, with a jolt. Fixed: it caps at the larger of the top and the
     speed before the pull; a spec.
  5. The cap's spec passed with the rock unbroken, holding kinds only.
     Fixed: kinds and sizes, in both of the cap's specs.
  6. A kind that both blasted and split would split into nothing at the
     cap; the scratch list held the last field's rocks; a helper's doc
     named a seed it doesn't take; an import was out of order; and
     `Readonly<Place>` repeated `Place`'s own. Fixed: a catalog spec that
     a rock that blasts breaks into nothing; the list is gone; the doc,
     the import and the type.

  The step a rock is laid at, and the pace on the field, reshaped the
  change, so it had a second review.

- **Second review.**
  1. The spec that a blast hits only what its own reach touches passed
     with the old list never cleared: the lodestone broke, and its piece
     in its slot had the hits left the spec looked for. Fixed: the spec
     holds every whole rock's kind, size and hits.
  2. A blast going off after the shots' hits in a step left out the
     pieces they had laid in it, so pieces could fly from a blast's middle
     unhurt. Fixed: blasts go off first in a step, as above, which
     `setOffBlasts()` says and the specs step by; a spec has a blast reach
     the pieces a hit laid the step before.
  3. "The same field whatever their slots' order" said too much: the
     pieces' push and draws are the first blast's, and at the cap a blast
     that freed its slot gave the next one's split another. Fixed: the doc
     and the spec say the same rocks are hit; blasts due free their slots
     once all have gone off, and a spec holds the cap's pieces the same in
     either order.
  4. Two docs said more than the code: a broken rock's first piece, where
     any of them may take its slot, and a rock past its top "turned
     without slowing", where a pull against it still slows it. Fixed:
     "one of its pieces", and the cap "never brakes" it.
  5. `stepsBetween()` was written in two specs. Fixed:
     `src/testing/numbers.ts`.

  These corrected the change rather than reshaping it, so it is committed
  on them.

## A3.3: the field

2026-11-01.

- **Built.** `src/rules/field.ts`: `FieldSetup`, a wave's field's size, cap,
  seed, pace and kind; `Field`, which extends A3.2's `RockField` with the
  ship, its shots, the weapon in hand, the flight and gunnery the debug
  menu tunes, the frame's steering, the ships lost and whether the wave is
  cleared; `createField()`, its slots free and its ship waiting in its
  middle; `steerField()`, the frame's steering copied; and `stepField()`:
  blasts due go off, the ship flies and fires, the shots and the rocks
  fly, each shot meets the first rock in its way, a rock takes a ship it
  touches that isn't guarded, and once no rock is left the wave is cleared
  and everything stands still. The field logs a pull fired, a dash
  started, a ship lost and the wave cleared, which `events.ts` gains, with
  the rock of an event of no rock null. `stepShots()` now returns whether
  a pull fired and takes a ship of null, flying the shots on; `flyShip()`
  returns whether a dash started; a shot keeps `passedAt`, each step it
  flew on through a rock in, which `landShot()` now takes the step for; `rocksLeft()`
  counts a field's rocks; and `tuning.ts` gains the ship's hit radius, 0.7.
  `src/testing/field_picture.ts`: `fieldFrom()`, a field from a picture of
  its rocks and ship, with `KEEPER`, `shipOf()`, `wholeRocks()`,
  `stepTimes()` and `eventsOf()`, as Brick Breaker's.
- **Choices.**
  - A Lance shot that breaks a rock passes the rocks laid in each step it
    broke through one in, which are those rocks' pieces. Passing what it
    starts a step within, the first try, missed them: it breaks a rock at
    the edge of its reach, and the pieces, smaller, lie at its middle,
    still ahead. Another shot's pieces laid in the same step are passed
    too, which only a Lance shot meets, rarely.
  - Each shot takes one rock a step, the first it meets; a Lance shot
    meets the next in a step after.
  - A lost ship leaves the rock that took it whole, since the plan breaks
    a rock on the ship only through the Shield, and its shots in flight
    fly on. The field's ship is null until the next comes (A5.3), and
    `shipsLost` counts up for the run, as Brick Breaker's `livesLost` does.
  - The wave is cleared once no slot holds a rock, so a blast still to go
    off holds it, and a cleared field stands still, its ship and shots
    drawn where they are, as Brick Breaker's does.
  - `cleared` is a flag, not Brick Breaker's union of states: the ship's
    `waiting` holds the wait for a first move, and a null ship a lost one,
    so a flag is all that is left.
  - The ship is tested against each rock's middle, not swept: together
    they close at most about a quarter of a unit a step, far under the
    1.5 units their reaches add to for the smallest rock.
  - A picture's characters are cells of 4 units, B a boulder and L, M and
    S a rock of the picture's kind, still in its cell's middle, and ^ the
    ship there, flying, its nose up; a picture with no ship has none. A
    picture lays its rocks still, so a spec moves what it means to.
- **Checks.** The workspace's `lint`, `typecheck` and `test` (422 tests,
  the rules fully covered but A3.2's one branch), `yarn prettier:check`
  and the skill references. 40 mutants of the field, the ship's and the
  shots' new returns, `brokeAt` and `rocksLeft()`: all caught but five,
  which new specs then caught: free shot slots and free rock slots swept,
  free rock slots touching the ship, the pieces' push along the shot
  dropped, and a cleared field leaving a moving ship's last place behind.
  The Lance's first rule, passing what a shot starts a step within, broke
  the pieces on its spec, which led to the steps it broke through in.
- **Review.**
  1. A Lance shot kept only the last step it broke through in, so one that
     broke two rocks a few units apart then broke the first one's pieces,
     pushed along its way. Fixed: it keeps each, `passedAt`, one for each
     rock it may fly on through, made with its slot and emptied as it is
     fired; a spec has two rocks 3 units apart.
  2. The step's order and the wrap had no specs in the field, so blasts
     after the shots or the rocks, the rocks before the ship, the ship
     tested before the shots land, and an unwrapped field for the sweep
     and the ship all passed. Fixed: a blast due breaking a rock on a ship
     whose guard runs out that step saves it; a shot breaking a rock on the
     ship saves it; a blast due in the step a shot meets a stone it reaches
     breaks the stone first; a shot breaks a rock across an edge in the
     step it comes within reach; and a rock across an edge takes the ship.
     Each of those mutants is caught.
  3. The spec of the first rock met within a step held the slot order with
     it, so a first-in-the-slots rule passed. Fixed: both orders.
  4. A rock event could be logged with no rock. Fixed: `RockEventKind`, and
     `add()` overloaded, so a rock's event takes its kind and size and
     any other only a place.
  5. The spec of pieces drawn from the seed passed before any piece was
     made, as every rock's turn and outline are drawn too. Fixed: it holds
     only the pieces.
  6. The picture's doc broke a line oddly, and its `@throws` left out a
     picture past the cap and a kind that doesn't come in a size; the
     specs' field repeated the picture's. Fixed, each.

  These corrected the change rather than reshaping it, so it is committed
  on them.

## A3: done

2026-11-01. `yarn verify` passed on A3.3's commit, `71a9a887`: lint,
typecheck, test and build across every workspace, Asteroid Breaker's 422
tests among them, the rules fully covered but one branch the catalog rules
out.

## A4.1: the pickups

2026-11-01.

- **Built.** `src/rules/catalog/pickups.ts`: `PICKUPS`, the eight, each its
  name, sentence, weight, the wave it comes from and its effect, one of the
  union `PickupEffect`, whose kind is its group. `src/rules/drops.ts`:
  `Floating`, a pickup let go, in `PICKUP_RECORDS` records made once;
  `DropSetup`, a wave's chance, pool and most at once; `DropField`, what a
  drop needs of the field, which `RockField` now extends; `dropFrom()`,
  which `hitRock()` calls as a rock breaks, letting a pickup drawn by weight
  from the pool go from a crystal always, from the first large rock broken
  once 25 s have gone by without one, and otherwise by the wave's chance
  while fewer than its most at once float; and `blinks()`, for the view.
  `src/rules/pickups.ts`: `stepPickups()`, each pickup drifting, drawn in
  to the ship from its reach, caught as it touches the ship, or faded;
  `EFFECT_RULES`, a start and an end for each kind of effect, one of each
  group in play, `stepEffects()`, `endEffect()`, `endEffects()` and
  `clearPickups()`. The field keeps its setup, the pickups, the effects,
  whether the ship is shielded, the reach pickups are drawn in from and the
  ships gained; each step ends effects whose time is up before the ship
  flies, a rock that touches a shielded ship breaks a size down on the
  shield, and the pickups float on after the ship is tested; a lost ship
  and a cleared wave end every effect and let the pickups go. `rocks.ts`
  lifts `hitWithin()` out of the blast, for the Nova; `events.ts` records
  an event by what it happened to, `add()` a place's, the Nova's with its
  reach, `addRock()` a rock's and `addPickup()` a pickup's; the rocks'
  catalog gains `hasTrait()`; and `tuning.ts` the pickups' drift, life,
  blink, reach, pull and catch, the drought and the Shield's guard. The
  field picture takes a wave's chance, pool and most at once, and gains
  `placeRock()`, lifted from the field spec, `placePickup()`,
  `floatingPickups()` and `catchOn()`.
- **Choices.**
  - The drop is a file of its own, as the Nova hits rocks: `pickups.ts`
    imports `rocks.ts`, and `hitRock()` lets a pickup go, so one file for
    both would import `rocks.ts` and be imported by it.
  - Every rock broken may let a pickup go, whatever broke it, a blast, the
    Nova and the Shield among them. Whether a comet's breaks do, which the
    plan says score nothing, is A4.2's to say.
  - A drought lets a pickup go however many float, as a crystal does: none
    floats by then, since a drought outlasts a pickup's life, which
    `tuning.spec.ts` holds. An empty pool, and a chance of 0, draw nothing,
    so a wave that can let none go draws as one without the rule would.
  - A pickup drawn in keeps its drift, and drifts on with it once the ship
    has flown out of reach. It is caught within 2 units of the ship's
    middle, as a stray is, by a ship waiting, guarded or dashing alike.
  - A rock that touches a shielded ship breaks with the blow that breaks,
    whatever its hits, its pieces pushed away from the ship; the shield
    goes, and the ship is untouchable for 1 s, a first guess for Q3, which
    also keeps it from any other rock touching it in that step. A ship
    guarded otherwise doesn't spend its shield.
  - The Shield is `shielded`, set and cleared by its rule, as Brick
    Breaker's net is, so its record is kept while it lasts.
  - The Nova's rule is the one that takes the ship, where its ring sweeps
    from; it hits at once, reaching what a blast would, the rocks laid
    before its step.
  - The pickups float on after the ship is tested, so a rock takes a ship
    before it can catch a Shield in the same step; effects end before the
    ship flies, so a pull in the step a weapon's time ends is the gun's. An
    effect lasts its time's steps after the one it is caught in.
  - The effects end and the pickups go as the wave is cleared, as the plan
    says they end with it, as well as when a ship is lost.
  - The events are three methods, not more overloads: a pickup's event
    takes a pickup and the Nova's a reach, and one signature for all four
    would take a union in each place.
  - The extra ship's "up to six" is the run's to keep, at A4.3, which gains
    the most ships, and the catalog spec spells it out then; the field only
    counts the ships its pickups gave.
  - The Magnet draws from 14 units at the same 10 a second. The sentences
    name comets and strays already, from the plan's table, so How to play's
    words are written once.
- **Checks.** The workspace's `lint`, `typecheck` and `test` (543 tests,
  the rules fully covered but A3.2's one branch), `yarn prettier:check`
  and the skill references. 69 mutants of the drop, the pickups, the
  effects, the field's Shield and step and the events: all caught but
  five. Two were gaps, which new specs then caught: a chance of 0 drawing
  for nothing, and a catch measured without the wrap, which passed as the
  spec's pickup crossed the edge as it was drawn in. Three change nothing
  in play: the weighted draw stopping on a sliver of 0 as well as below
  it; ending a group's effect before the next of it starts, which each
  start rule overwrites, kept as the rule a future effect may need; and
  the pull's cap at the ship's middle, which a pickup never reaches before
  it is caught 2 units off.
- **Review.**
  1. A pickup let go in a step was counted down later in that step, so it
     floated one step fewer than its doc said, which a pickup placed
     between steps hid. Fixed: a pickup fades once it has no steps left,
     and counts one down after; a spec counts the life of one a shot lets
     go, and the old countdown is caught. A pickup the Nova lets go as the
     ship catches another first floats in that step or the next, by its
     record's order, a step's difference, left as it is.
  2. Rapid's "twice as often" and the Slow's "half their speed" weren't
     held to their numbers. Fixed: two rows, with `share()`; retuning
     either is caught.
  3. The entry named `PICKUP_POOL`, since renamed. Fixed.
  4. `add()` took a reach for any event of a place. Fixed: overloaded, so
     the Nova's needs one and no other takes it.
  5. The pickups' private `drawIn()` shared its name with the draws'.
     Fixed: `pullIn()`.
  6. `hitRock()`'s doc wrapped oddly. Fixed.

  These corrected the change rather than reshaping it, so it is committed
  on them.
