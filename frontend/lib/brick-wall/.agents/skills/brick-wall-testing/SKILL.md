---
name: brick-wall-testing
description: What every wall game's specs share through @fz/brick-wall: the certificates replayed and the floors held, what to do when a replay or a floor fails, slow specs, the shell's cases in the library, and the mutation pass. Triggers on: wall game spec, frontend/lib/brick-wall spec, holdEveryCertificate, holdEveryFloor, lineHolds, failed replay, SIM_TIMEOUT_MS, loadsSettled, heldLoad, yarn mutants.
---

# Testing the wall games

What the specs of the games on `@fz/brick-wall` do alike, and how they use
the library's testing entries. Each game's own testing skill, named for the
game (`<game>-testing`), has its Vitest projects, its helpers and what its
replays and checks hold beside the line, and points here. Paths are
relative to `frontend/lib/brick-wall/`; a game's files are named as its own
skill names them.

## The Certificates and the Floors

- **A certificate** is a line of shots that clears a level on a depth: in
  as many rounds as it has shots, no brick the level needs ever coming down
  to the row over the floor's (`lineHolds()`, `src/testing/solver.ts`). A
  game's `yarn certify:levels` finds them on `@fz/dev/certify`'s pool with
  the library's solver, over the game's play of a line, a `LinePlay`, and
  writes them with what else it keeps of each level on each depth, its par
  among it. A run writes the same bytes as the last unless a line changed.
- **A game's `every_level/`** has a spec file for each depth, 11 to 22,
  each `holdEveryCertificate(import.meta.filename)`, through the game's
  `every_level.ts`, over `src/testing/holders.ts`. It replays every level's
  line on that depth through the game's rules, holds it to `lineHolds()`,
  and holds the par the game keeps to the one the line earns.
- **Its `every_floor/`** has a file for each set on 11, 13 and 22 deep
  (`<set>_<depth>.spec.ts`), each `holdEveryFloor(import.meta.filename)`.
  The careless player (`src/testing/careless.ts`, through the holders'
  `floorGames()`) must clear each of the set's levels at least its set's
  floor of times in 100, over `FLOOR_SEEDS` games from the level's own
  seeds.
- **The game's `every_level.spec.ts`** fails for a spec file a folder
  lacks, or has too many of.
- **`yarn report:levels`** plays the careless player over more games, its
  first those the floor specs play, and shows each level that falls short,
  exiting with 1 where one does. It is how a level is tuned.
- **Both scripts take every core,** so each waits its turn in the queue
  `yarn verify:changed` keeps. Run one at a time: a second waits for the
  first.
- **To watch a line play,** use the debug menu's Play the certificate, in a
  development build or at `?debug` in a production one. It plays the line
  of the level in play on the field's depth.

## When a Replay Fails

A spec in `every_level/` holds the level's line, and beside it what the
game keeps from that line, its par among it, as the game's skill says. Its
message says to run `yarn certify:levels`. Don't, until you know why it
failed: certifying again makes the replay pass whatever broke it.

1. **See which failed,** in the message. Where the line still clears its
   level and only what is kept from it is stale, as a par is once the share
   it is worked out by is retuned, certify again the least that writes it
   anew, as the game's skill says.
2. **If the line no longer holds, ask whether the change meant to change a
   round.** A replay reads only the rules, `@fz/core`'s sweep and
   arithmetic, the levels' walls, the files `yarn certify:levels` writes,
   the game's play of a line, the solver's `replayLine()` and
   `lineHolds()`, and what else the game's skill says its replays hold.
   The view, the scene and the shell can't fail one. If the change wasn't
   meant to change how a shot plays, the failed replay is the bug: find
   what differs, and keep the certificates.
3. **If it was meant to,** the game's flight fixtures whose rounds meet the
   change fail too. Work their rounds out again by hand, and mend the specs
   of the view, the scene and the shell that read them. A change to a
   level's wall or to how a level opens fails no fixture, as the fixtures
   draw their own walls and starts.
4. **Certify again only what the change touches:** `--set <id>`,
   `--level <id or number>` or `--depth <n>`, the other lines kept as
   written.
5. **Read the diff** of what it wrote. A par that moved moves the stars the
   level gives, and a line that moved under the screenshots' run moves the
   screenshots. Commit them in the change that moved them, and say in its
   body what moved.
6. **A level with no line** (the script exits with 1, leaving it none on
   that depth) is one the change made too hard to clear within
   `SOLVER_ROUNDS` with a row to spare. Redraw its wall, as the game's
   content skill says, or rethink the change.

## When a Floor Fails

A floor spec says how often the careless player cleared the level in its
twenty games. Those games are the gate, and their seeds are the level's
number's (`number * SEED_STRIDE + game`). So adding, taking away or moving
a level seeds every level after it anew, and a change to the careless
player, to the order of the shots a game's play of a line offers or to its
`wall_score.ts` moves every floor: any can fail a level nobody touched.
`yarn report:levels` plays the same games and more, which tells a level
under its floor from twenty unlucky games. But the spec must pass on its
own seeds, so a level that fails them is redrawn or eased until it does,
and certified again.

## Slow Specs and the Benchmarks

- **A test in `sim` that can run past half a second alone takes
  `SIM_TIMEOUT_MS`** (`src/testing/timing.ts`) as its describe's `timeout`,
  since `yarn test` runs `sim` beside every workspace's specs.
- **A long check in `pure` is split into seeded batches,** each well inside
  Vitest's 5 s, as each game's random walls are: `yarn test:coverage` runs
  `pure` two or three times slower. Only a search no batch can split hands
  its hook or its test `SIM_TIMEOUT_MS`.
- **The benchmarks hold one time only.** A game's flight benchmarks, in
  `sim`, print their times at the median and the 99th percentile
  (`described()`, `src/testing/timing.ts`) and hold none of them, as no
  runner times anything alike twice. Only `guide.spec.ts` holds one,
  `guideOf()`'s 99th percentile, under a generous bound.
  `yarn vitest run --project sim --reporter=verbose src/rules/flight/benchmarks`,
  from the game's folder, shows the times without the replays and the
  floors.

## The Shell

- **Spec what every wall game's shell does in the library.** The round's
  driver, the records and the bug report's state and load are the
  library's (`src/app/round_driver.ts`, `src/app/records.ts`,
  `src/app/reported.ts`), and their cases go in its specs beside them, over
  its made-up games. A game's specs hold only its wiring of them: the rules
  a round plays on, its words and cards, what its own stores keep as its
  flights land, and what its report keeps and plays again.
- **Play the flight out before reading the records.** `src/app/records.ts`
  keeps a level's clear and a run's end as the flight lands, so a spec that
  reads a game's `StatsService` or `ProgressService` plays it out first.
- **Wait for what loads on demand.** A game's shell loads How to play as it
  first opens, and the debug menu where it is offered, through
  `@fz/ui/on_demand`'s `onDemand()`, each load a pending task. So after
  pressing How to play, a spec awaits `whenStable()` before looking in it.
  The menu loads its certificates from the game's `CERTIFICATE_FILES`, which
  a spec hands a file of its own. No pending task holds that load, so a
  spec waits for the menu and its certificates with `src/testing/settled.ts`'s
  `loadsSettled()`, and for the game's own files, a dynamic import, with
  `vi.waitFor()`.
- **Hold a load to see what shows meanwhile,** or once a chunk can't be
  fetched. A spec hands the game's `LOAD_HELP` or `LOAD_DEBUG_MENU` a held
  load (`heldLoad()`, from `@fz/ui/testing`) and lets it `arrive()` or
  `fail()` with `OFFLINE`, collecting the error (`collectErrors()`). Till
  then the load's pending task keeps `whenStable()` and `loadsSettled()`
  waiting, so the spec shows the page with `detectChanges()`, and settles
  only once the load is let go.
- **The board runs on a fake canvas,** `@fz/phaser/testing`'s
  `provideFakePhaserCanvas()`, and a game's board spec also runs its scene
  for real through `runShownScene()`. The `phaser-core` skill covers both,
  with `collectErrors()`, `watchResizes()` and `resize()`.
  `@fz/dev/board-page`'s `readRect()` and `readNamedRects()` read back what
  the board writes for the layout check.
- **The wall doesn't ease until a spec installs a viewport.** jsdom answers
  no media query, so a game's `GameService.motion()` is false until
  `@fz/game-ui/testing`'s `installFakeViewport()` gives the window a size.

## The Mutation Pass

A change to a wall game ends with a mutation pass where its skill asks for
one. It breaks the change one thing at a time, runs the specs, and names
what survived, and why, in the commit's body:

- **A mutant** is one bound (`<` for `<=`), condition (dropped, inverted or
  always true), constant (halved, doubled, nothing), argument, call or line
  (left out), or order (two layers or painters swapped), in the change's
  own code and in the specs' helpers it trusts.
- **Apply each with `yarn mutants`** (`frontend/tools/mutants.mjs`), from
  the frontend's folder, over a list kept outside the repository: each
  mutant a text replacement that must match once in its file, and the
  project and folder whose specs should kill it (`yarn mutants --help`
  gives the form). It waits its turn in the queue `yarn verify:changed`
  keeps, runs those specs with no mutant in place, then with each, puts the
  file back whether they passed, failed or were stopped, and prints the
  table for the commit's body, a replacement that matched nothing shown as
  such, not as a survivor or a kill. Never stash or check out over the
  change while doing it.
- **Name only the project and folder** whose specs should kill it, which
  the script runs without coverage, as
  `"project": "dom", "folder": "src/scene"` for a game's scene, and
  `"project": "pure", "folder": "src/rules/flight"` for its flight. The
  replays and the floors in `sim` say only that a line stopped holding or
  a floor moved, so a rules mutant only they kill still wants a spec in
  `pure` that names what broke.
- **Every survivor gets a spec** that fails on it. The one exception is a
  mutant equivalent to the code, which no input can tell from it, as `<=`
  for `<` between values that are never equal. Name in the commit's body
  the count, what was killed, and each survivor, with the spec that now
  kills it or why it is equivalent.
