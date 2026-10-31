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
