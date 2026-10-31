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
