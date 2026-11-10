# Work log: Brick Fuzz Pop, shell stream

The shell stream's log of
[`implementation-plan.md`](../implementation-plan.md)'s U3 to U6, split off
the view and shell stream so they run beside V1 to V4: what each package
built, where it went other than planned and why, what the checks reported,
each review comment and what became of it, and the numbers worth keeping.

## Part 2

### U3: the settings

**2026-11-10.**

**What was built.** `src/app/settings/`, from Asteroid Breaker's and Brick
Breaker's, standing alone for U1 to place:

- `settings.service.ts`: `SettingsService`, a `storedSignal()` under
  `brick-fuzz-pop-settings`, version 1, holding `Settings`: `aiming`
  (`Aiming`, one of `AIMINGS`: `byPointer`, `pullBack`, `pointAndHold`),
  `flightSpeed` (`FlightSpeed`, one of `FLIGHT_SPEEDS`: `normal`, `fast`),
  `speedUpLongFlights`, `guide` and `sound`, the three on by default, as
  "Controls" lists them. Its reader takes each stored field that makes
  sense and the default for the rest, as the breakers' do; `update()`
  changes the fields given.
- `settings.component.{ts,html,scss}`: `<app-settings>`, inputs `open`,
  output `closed`, in `<fz-settings-drawer>`: Aiming and The flight's speed
  as `<fz-choice-list>`s, each choice its name over a few words; Speed up
  long flights, Show the aim guide and Play sounds as checkboxes, each with
  a line beneath; and `<fz-theme-picker>`. Each applies at once.
- Specs: 7 for the service (the defaults, a partial change, the next visit,
  a field that doesn't read, a way of aiming and a speed it doesn't know, a
  field kept before it was offered, another version), and 28 for the
  component, by role, against the real service and a store in memory.

**Choices the plan didn't make.**

1. **The settings' types live in the service,** as Asteroid Breaker's
   `DECK_SHOWINGS` do, since neither the view's steering (V2) nor its
   timing (V4) exists yet to hold them, and the shell may not be imported
   by the view. So `Aiming` keeps the setting's three choices, and U1
   resolves `byPointer` to pull back for a finger and point and hold for a
   mouse before handing V2's steering a way per pointer; and U1 turns
   `FlightSpeed` into V4's units a second (14 and 22 in the plan). If V2 or
   V4 names either type, the service can take theirs instead.
2. **No `GameService`.** Brick Breaker's and Asteroid Breaker's settings ask
   the game to start a run at a new speed. Here nothing the drawer offers
   is the run's: the rules decide a round as it is released, whatever the
   flight looks like, so every choice applies at once and the component
   needs only `SettingsService`. U2's debug menu, which does need the game,
   comes into this drawer later, as it does in the breakers.
3. **Aiming's choices are `By the pointer`, `Pull back` and
   `Point and hold`,** "By the pointer" the default: decision 15's "a
   setting picks the touch or the mouse's way for either". A line beneath
   says the keys aim either way.
4. **The flight's speeds are worded without their numbers,** and "Speed up
   long flights" without its 8 seconds, since those are V4's numbers and Q3
   tunes them; the words can read them once V4's `timing.ts` exists.
5. **The stylesheet takes `@fz/game-ui/toolkit` by its namespace,**
   not `../styles` taken whole as the breakers' do: the shell's
   `styles/_index.scss` is U1's and doesn't exist yet, and
   `frontend/AGENTS.md` takes `*` only for an app's own toolkit. The
   integrator is asked for the one-line file; once it lands, the line
   becomes `@use "../styles" as *;`.
6. **The specs keep one setting off its default at a time** as the drawer
   opens, so a checkbox bound to another setting shows that one's and
   fails.

**Checks.** The workspace's `lint`, `typecheck`, `test` and
`test:coverage` pass: 462 tests in 14 files, 35 of them new; both new files
at 100% of statements, branches, functions and lines. The root's
`yarn lint` passes.

**The mutation pass.** 41 mutants, one at a time, each run against the
settings' specs: the key and the version; the lists' order and length; each
default; `update()`'s order; each field's reader (from any value, from
another field, never, falling back to another value); the choices' names
and words; each handler doing nothing, setting another field, or always
clearing or always ticking; each binding pointed at another field; the
aiming list's description; Close; and the theme picker. Of the first 39,
37 were killed at once. One survivor got specs: the guide's box always
clearing, as only the sound's box had a spec ticking it again. Each box
now has one, from its setting kept off, and they killed the two mutants
added with them, long flights' box always clearing and the guide's always
ticking. One is equivalent: the reader refusing a stored `byPointer`, the
default it falls back to. The review's specs were mutated too: five
mutants, each list's and box's description pointed at another's and the
speeds' details swapped, all killed.

**The review:**

1. **Four of the five descriptions had no spec,** nor the speeds' details,
   so a control described by another's line passed. Fixed: a spec for the
   speeds' description and each box's, and the speeds' details pinned as the
   aiming list's are; their five mutants are in the mutation pass.
2. **"Keeps the way in use when it is pressed again" couldn't fail,** as
   nothing here guards a choice pressed again, unlike the breakers' speed.
   Fixed: dropped.
3. **`@use "@fz/game-ui/toolkit" as *` breaks the rule that takes `*` only
   for an app's own toolkit.** Fixed: the stylesheet takes it by its
   namespace, and the integrator is asked for `src/app/styles/_index.scss`
   (the fifth choice).

### U5: How to play

**2026-11-10.**

**What was built.** `src/app/help/`, from the breakers', standing alone for
U1 to place:

- `help.component.{ts,html,scss}`: `<app-help>`, inputs `open` and
  `pictures`, output `closed`, in `<fz-help-dialog>`:
  - the aim, charge (0 to `MOST_CHARGE`), the wall's step and its jump, the
    two boons (`HOT_BOUNCES`, `TRIPLE_MATES`), scoring (the streak by
    `tierWords(STREAK, "bricks")`, `JUMP_POINTS` and `STAR_POINTS`), the
    stars (`TWO_STARS_PAST_PAR`) and why nothing hurries, every number the
    rules hold read from `tuning.ts`;
  - the controls as a table by mouse, touch and keyboard: aim, charge, let
    it fly, call a charge off, fast-forward, skip, pause or go on, next
    level and start again;
  - three short paragraphs: the letter keys by place, the settings' swap
    of the ways of aiming, and what is said aloud and the key that reads
    the wall;
  - one `<fz-help-catalog>`, Bricks, over
    `helpEntries(BRICK_KIND_IDS, brickKind, pictures?.bricks)`, so each
    kind the catalog gains shows with its `about`, in the catalog's order.
- `src/app/styles/_index.scss`, the shell's toolkit, forwarding
  `@fz/game-ui/toolkit` as the breakers' does, which the integrator let
  this package add; U3's stylesheet moves onto it
  (`@use "../styles" as *;`).
- 20 specs, by role, against the catalog and pictures made for them.

**Choices the plan didn't make.**

1. **Letter keys are named by where they sit under the fingers,** never by
   a letter, as they are read by `event.code`: the left index finger's
   home key, the one with a bump, held for fast-forward (`KeyF`); the left
   ring finger's key on the bottom row for skip (`KeyX`); the key above
   the right little finger's home key to pause or go on (`KeyP`); the key
   above the left index finger's home key to read the wall (`KeyR`); and the left
   hand's home keys under its little, ring and middle fingers and the key
   above the ring finger's for the arrows (`KeyA`, `KeyS`, `KeyD`,
   `KeyW`). Keys that print the same on every layout keep their caps:
   the arrows, Shift, Space, Esc and Enter. V2's and U1's keys must be
   these codes for the words to hold.
2. **`pictures` is `HelpPictures`, `{ bricks }`, by `BrickKindId`,** the
   narrow shape How to play needs, since the scene's `Pictures` (S1, A2)
   doesn't exist yet. The scene's, with more in it, can be handed over
   whole as long as it holds `bricks` so.
3. **The bricks' catalog has an intro:** a kind is told by shape and mark,
   hits by pips, and a level needs every brick but those that never
   break. It names no kind, so X1 to X3's kinds need no change to it.
4. **The words leave out the view's numbers,** as U3's do: point and
   hold's pace, pull back's dead zone and notch, and the flight's speeds,
   which Q3 tunes.
5. **Reading the wall** is a paragraph rather than a row of the table,
   since it has no mouse or touch control to fill a row with.
6. **Pictures are 36 CSS px square,** as Asteroid Breaker's rocks are, a
   brick being square and the art read at 32 and up.
7. **No friends paragraph:** the cage that frees them is X1's, and its
   catalog sentence will say what it does.
8. **"Start again, once a run has ended" names Try again and New game** by
   mouse and touch: the result card's (U4) and the bar's.

**Checks.** The workspace's `lint`, `typecheck`, `test` and
`test:coverage` pass: 1,170 tests in 21 files, 20 of them new;
`help.component.ts` at 100% of statements, branches, functions and lines.
The root's `yarn lint` passes. Both component stylesheets compile through
the new toolkit with Sass, as the libraries' `sass` exports load them, since
neither is in a build until U1 places it.

**The mutation pass.** 21 mutants, one at a time, against the help's
specs: each number from the tuning off by one or swapped with another; the
catalog's heading and intro gone; a brick left out, the bricks reversed,
each named by the first's words; pictures never handed on, every brick
the first's, and shown before the scene draws; Close and `open`; a key's
place moved (skip, the up key, the wall's key), a letter named beside
Space, a row renamed, and the ways of aiming swapped. All 21 were killed.
The review's changes got nine more: the hot shot's bounces and the triple
shot's mates off by one, the boons' paragraph gone, the jump's line moved
above, the held button's most off by one, charge's spending rule lost, the
pause key moved in either row, and Try again left unnamed. The last
survived and got a spec; the other eight were killed.

**The review:**

1. **The aim paragraph said a fuzzball turns off every brick it doesn't
   break, and the charge paragraph that it takes as many hits as it has
   charge,** both against "Charge": a plain one turns off a brick it
   breaks, and a charged one spends only what the brick has left. Fixed:
   "every brick it doesn't punch through", and charge's spending rule as
   plan.md words it.
2. **Some numbers were typed into the words** (the held button's five, the
   hot shot's one bounce, the triple shot's two mates), and the jump's and
   the boons' paragraphs had no spec. Fixed: they come from `MOST_CHARGE`,
   `HOT_BOUNCES` and `TRIPLE_MATES`, through `count()`, with a spec each for
   the jump, the boons and the held button; the log says every number the
   rules hold.
3. **"The right little finger's key on the top row" is ambiguous,** the
   finger reaching three or four keys there, and "top row" read as the
   digits'. Fixed: "the key above the right little finger's home key".
4. **The stars' sentence read badly** ("within 3 rounds more two") and would
   say "1 rounds". Fixed: "two within 3 more rounds, and one otherwise", by
   `count()`.
5. **Paragraphs after the table would sit against it.** Fixed: the table
   keeps `--fz-space-4` below it too. Not seen in a browser, since nothing
   places the dialog until U1.
6. **Only the table's keys were held to the layout-free ones.** Fixed: a
   spec holds every key cap in the dialog to the arrows, Shift, Space, Esc
   and Enter, found by tag, as a cap has no role.
7. **"Start again" named New game alone,** where a lost level's card offers
   Try again. Fixed: "Try again, or New game", with a spec (the eighth
   choice).
