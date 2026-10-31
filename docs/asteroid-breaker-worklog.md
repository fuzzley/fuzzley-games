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
