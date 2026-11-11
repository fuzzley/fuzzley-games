# Work log: Brick Fuzz Pop, shell stream

The shell stream's log of
[`implementation-plan.md`](../implementation-plan.md)'s U3 to U6, split off
the view and shell stream so they run beside V1 to V4, of N1, moved to it
from the art stream, and of V4, moved to it from the view stream: what each
package built, where it went other than planned and why, what the checks
reported, each review comment and what became of it, and the numbers worth
keeping.

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

### N1: the twenty sounds

**2026-11-10.** Moved to this stream from the art stream while R7, which
U4 and U6 build on, is under way.

**What was built.**

- `tools/build-sounds.mjs`: the twenty recipes (`RECIPES`), in `SOUNDS`'
  order, on `@fz/dev/sounds`' `glide()`, `envelope()`, `thud()`, `note()`
  and `arpeggio()`, with one helper of its own, `withBurst()`, a tone
  under a burst of noise; written with `writeSoundSprite()` into
  `src/scene/sounds/` (`SPRITE_FOLDER`) when run, and imported by its spec
  without writing.
- `src/scene/sounds/sounds.wav` and `sounds.json`: the sprite and its map,
  the same bytes on a second run (the same SHA-256).
- `tools/sound-lab.ts`: the sound lab's page, what plays each sound, and
  eight scenes of a round played as the game would play them: a plain
  shot; point and hold's notches, up to five and back; a punch through the
  wall and the rattle above it, each break a semitone up to an octave; a
  zapper's row and a column zapper's chain; steel, a bumper, a portal and a
  blast; a jump and a hot shot; the danger line, a friend freed, a level
  cleared and the lost level's sound; and a bored fuzzball's yawn. No
  candidates yet: Q3 designs them.
- `vite.config.ts`: `soundLab({ entry: "tools/sound-lab.ts", title })`
  merged into `gameConfig()`'s, as Asteroid Breaker's is.
- `package.json`: `build:sounds`, `node tools/build-sounds.mjs`.
- `tools/build-sounds.spec.ts`, 4 specs: the sprite's map is the view's
  `SOUNDS` in order; each recipe is named for them in order; none loops;
  and the sprite is, to the byte, what the recipes render now.

**Choices the plan didn't make.**

1. **The spec of the map sits in `tools/build-sounds.spec.ts`,** in `pure`,
   since there is no scene spec to hold it yet: S1's scene spec can hold
   the map it loads to `SOUNDS` as the breakers' do, and this one stays for
   the recipes and the bytes.
2. **The sprite is held to the recipes byte for byte,** as K3's aims are to
   their script, so an edited recipe fails until `yarn build:sounds` is
   run. The synth uses `Math.sin()` and the rest, so a Node whose last digits
   moved could fail it; the samples are rounded to 16 bits, which makes that
   unlikely, and the aims' spec carries the same risk.
3. **The recipes' looks:**
   - the break is Brick Breaker's soft bloop (392 to 587 Hz), low enough to
     stay mellow raised an octave, as the plan's rise along a round asks;
   - the punch is a crunch of noise over a low drop, to sit under the
     break's note at the same moment;
   - the notch is a quiet tick with a crackle of static, heard at every
     notch the charge climbs or falls while it builds;
   - the step is a low thunk, heard every round, and the jump a long drop
     under a rumble;
   - the danger line's two notes and the chime follow the breakers' warned
     and cleared.

   Q3 tunes them by ear in the lab.

4. **The lab's scenes raise each break 100 cents past the one before, to
   1,200,** with numbers of its own named for V4's `detuneOf()`, which
   doesn't exist yet. Once it does, the lab should take them from the view,
   as Asteroid Breaker's takes its chain's. The bricks a frame breaks play
   as one break, raised for the last of them, as `@fz/core`'s
   `FrameSounds` will play them.
5. **The lab takes its numbers from the rules where they hold them**
   (`MOST_CHARGE`, `BORED`, `ZAP_DELAY`), and keeps two of its own that
   plan.md gives and no code holds yet: 14 units of flight a second at
   Normal, and point and hold's quarter second a notch.
6. **The workspace's `AGENTS.md` doesn't name `build:sounds`, the sprite or
   the lab yet:** it is the integrator's to write.

**Checks.** The workspace's `lint`, `typecheck`, `test` and
`test:coverage` pass: 2,178 tests in 24 files, 4 of them new;
`build-sounds.mjs` at every line but its `import.meta.main` branch, which
`yarn build:sounds` runs. The root's `yarn lint` passes. The dev server on
9166 served `sound-lab/`, the page mounted with every sound and scene, and
"A plain shot" played from the sprite in the headed Chrome DevTools
browser with no error in the console. After the review, the sprite rebuilt
to the same SHA-256, and the lab, its sprite now fetched through `?url`,
played "Point and hold" and "A zapper's row" with no error or warning.

**Numbers worth keeping.** The sprite is 8.35 s and 267,244 bytes of WAV,
against Brick Breaker's 121,964 (ten sounds) and Asteroid Breaker's 208,044
(fourteen).

**The mutation pass.** Nine mutants, one at a time, against the sounds'
spec: a recipe's pitch, peak and noise seed moved, one looped, one renamed;
the checked-in map's key renamed and a sound looped in it; and the view's
`SOUNDS` reordered and given a sound more. All nine were killed. The
review's changes touch only comments and the lab's page, which no spec
runs, so they made no new mutants.

**The review:**

1. **Bricks broken in one frame played as many breaks,** the zap's row,
   the blast's five and each lone break built through `breaks()` with no
   gap, where the game's `FrameSounds` plays a sound once a frame, at the
   most it rose. Fixed: `broken()` gives a frame's one break, raised for its
   last brick, and `breaks()` is kept for runs a gap apart; the scenes and
   the break's line say so.
2. **The zapper scene wasn't one chain:** the column zapper broke at 9
   units, apart from the row's zap. Fixed: it breaks with its row at 6.5
   units, and its own zap lands at 7.
3. **Numbers the rules hold were typed in:** the five notches, the yawn's
   60 units and the zap's half unit. Fixed: `MOST_CHARGE`, `BORED` and
   `ZAP_DELAY`, from `src/rules/tuning.ts` (the fifth choice).
4. **"Up to five a shot" misdescribed the notch,** which point and hold
   climbs to five and back, over and again. Fixed in the recipe's comment
   and the lab's line, and a "Point and hold" scene plays twelve notches
   over three seconds, up to five, down to none and up to two, then the
   release.
5. **The clank read as if steel, a plate or a bumper were what sounded.**
   Fixed in both files: a fuzzball striking one, which earths any charge it
   carries.
6. **The fifth choice's reason was wrong:** `@fz/dev/sound-lab-page`
   already brings `vite/client`'s types, so `?url` needs no change to
   `tsconfig.node.json`. Fixed: the lab imports the sprite with `?url`, as
   Asteroid Breaker's does, and that choice now says what the lab takes from
   the rules.
7. **Nits:** `RECIPES`' doc opened with two sentences and said the scene
   raises the break, where the view does; `BREAK_MOST_CENTS` shared its
   step's comment. Fixed: one sentence, then a paragraph naming the view; a
   comment of its own.

### V4: effects, flourishes and timing

**2026-11-10.** Moved to this stream from the view stream, which keeps V2
and V3, while R7 is under way.

**What was built.** All in `src/view/effects/`, beside K2's `SOUNDS`:

- `effects.ts`:
  - `Flourish`, the nine flourishes "Flourishes" names: a struck brick's
    swell, a broken one's shards, a punch's streak, a zap's bolt, a blast's
    ring, a freed friend's hop, the jump line's flash, the fuzzball's flare
    into its boon, and a lost level's shake;
  - `EventEffects`, an event's flourishes and its sound, as the breakers'
    are;
  - `FlightEffects`, which reads a round's flight in order (`begin(boon)`,
    then `effectsOf(event)` for each event) and says what each calls for;
  - `Beat` and `beatEffectsOf()`, for the moments beyond a flight's events:
    a notch, the step, the jump, the danger line, cleared and lost;
  - `detuneOf()` and `breakDetune()`, 100 cents a brick of the round before
    it, up to 1,200, with `BREAK_STEP_CENTS` and `BREAK_MOST_CENTS`;
  - `createFrameSounds()` and `flourishesOf()`, as the breakers'.
- `flourish.ts`: `easeOutBack()`, the overshooting ease, and the shapes
  that change a size or a place: `swellScale()`, `flareScale()`,
  `hopHeight()`, a freed friend's hop from its cage down to the floor,
  `ringScale()`, and `shakeOf()`, a lost level's shake in device pixels,
  written into a record. What only fades or spreads takes `@fz/core/math`'s
  `fadeAlpha()` and `easeOutCubic()`.
- `timing.ts`: the wall's step (260 ms) and jump (480 ms), each flourish's
  length, the shards' count, the shake's size, `clearedDelayMs()` and
  `resultDelayMs()`.
- `tools/sound-lab.ts`: its breaks raised by the view's `breakDetune()`, in
  place of its own two numbers; and the knock's and the clank's words, here
  and in `tools/build-sounds.mjs`, as the view plays them.

**Choices the plan didn't make.**

1. **`effectsOf()` is a method of `FlightEffects`, read in the flight's
   order,** not a function of one event. The plan's `effectsOf(event)`
   can't tell a punch from a break: a charged fuzzball of 1 that breaks a
   plain brick and flies on and a plain one that breaks it and turns both
   strike with `took` 1, `left` 0 and `charge` 0. Only a turn by the same
   fuzzball at the same moment, which `Flight.events` puts before its
   strikes, tells them apart, and it tells a bumper's strike from steel's
   too. "The same moment" is a turn within `AT_ONCE` of the strike, as the
   flight meets contacts, so a strike recorded a hair after its turn still
   counts. A `punched` field on the strike would make it a function again;
   that, or a check in `orderProblemsOf()` that a strike which leaves its
   brick standing follows a turn by its fuzzball at its moment, is the
   rules stream's to weigh.
2. **The release plays on the player's launch,** "boon" when the round's
   start carries a boon, which `begin()` is handed: the launch says `hot`
   but not a triple shot. The mates', friends' and splits' launches play
   nothing. Neither `RoundView` nor the scene's options carry the start's
   boon or a flight's start yet: V3's `RoundPlay`, which holds the
   `RoundStart` and reads every event once, in order, could own the
   `FlightEffects` and call `begin()`, or `RoundView` could carry the boon,
   for S2.
3. **A strike that takes no hit clanks and swells,** as any struck brick
   swells: steel, a plate, or a shell a plain fuzzball can't open, as "The
   flight" groups them as strikes that don't count against boredom. The
   event can't tell a plate from a shell without the wall, and nothing else
   needs the wall. The lab's and the recipe's words for the clank say so
   now.
4. **A bumper plays its bump alone,** the strike on it quiet, as the lab's
   scene had it.
5. **A brick broken and turned off is heard as its break alone;** a punch
   adds the punch's crunch and its streak to the break.
6. **A cage's break plays shards and the break like any brick's,** the
   shards standing for its bars, and the free plays the cage's sound and
   the friend's hop, from the cage's height down to the floor, where
   "Fuzzley flavor" has a freed friend wait; the plan's "bars fly apart"
   needs no flourish of its own, and no kind that frees exists yet to test
   one by.
7. **A wool brick's recharge and a prism's split play nothing,** the twenty
   sounds having none for them, past their bricks' breaks.
8. **The swell is swollen as the strike lands, then settles a little under
   its size before it rests,** the overshooting ease run from 1.14 back to
   1, so a strike shows at once. The ease's usual overshoot of a tenth puts
   that dip at 1.4%, under half a CSS pixel on a 32 px brick: Q3 judges
   whether it shows. The flare grows the boon's look in from 0.4, past its
   size.
9. **The speeds are left to V3:** 14 and 22 units a second, ×4 held and ×2
   after 8 s are how the playback runs, not how long a flourish lasts.
   `STEP_MS` and `JUMP_MS` are here, as "The feel, in numbers" keeps them
   in `timing.ts`, for V3 to ease the wall by.
10. **`resultDelayMs()` waits 800 ms after a lost level,** the shake and a
    look at the brick that lost it, and 500 ms without motion, where the
    wall steps at once and the brick is still to be seen, unlike the
    breakers' waits; `clearedDelayMs()` 700 ms, past the last shards, and
    nothing without motion, as theirs.
11. **The shake is in CSS pixels, as Asteroid Breaker's,** with
    `shakeOf()` giving its shape in device pixels for the scene to move
    the camera by, rather than Phaser's `camera.shake()` and Brick
    Breaker's share of the canvas: the view holds the motion, at its
    coverage, and the scene only applies it.

**Checks.** The workspace's `lint`, `typecheck`, `test` and
`test:coverage` pass: 2,451 tests in 28 files, 2 of the files new and 100
of the tests; the three modules at 100%. The root's `yarn lint` passes. The
fixtures' plain shot, punch, punch through the wall and hot shot play the
sounds a spec lists, event by event. On the dev server at 9166 the lab
mounted, its clank's new words showing, and "A punch through the wall"
played with its breaks raised through the view, with no error or warning
in the console.

**The mutation pass.** 35 mutants, one at a time, against the three specs:
the release's role and boon; each of the turn's fuzzball, moment and
contact not kept, a turn by another fuzzball or at another moment
counting; the bumper's rule dropped or not held to its turn; a strike that
takes no hit knocking, a broken brick's strike held, every break a punch
and none; `begin()` keeping the last turns; an X zap a blast; the floor
quiet and a corner knocking; the jump's flare, a cleared level's shake, a
friend's hop and a split's landing; the flourishes played without motion;
the first break raised, the octave lowered and a strike raised; the
overshoot, the ease's cube term, the swell's and the flare's eases, the
hop's height and the ring's ease; and the cards' waits shortened or kept
without motion. 34 were killed. The bumper's rule not held to its turn
survived, and got a spec: steel struck after an earlier bumper clanks.
The review's changes got 20 more: the moment's reach dropped, made exact,
loosened, or made one-sided; a turn by another fuzzball, kept past
`begin()` or not kept; the clank's swell; the break's rise from the first
and not raised; the hop's throw, its landing and its drop; the shake never
stopping, starting before the loss, never dying, in CSS pixels, kept from
before and across only; and the still wait none. The shake across only
survived and got a spec, that it swings up as far as across. A turn
counted only on the strike's side of it survived too, and is equivalent:
the flight is in order of `at`, so the last turn read is never after the
strike.

**The review:**

1. **The punch rule leaned on a turn and its strike sharing an identical
   `at`,** which nothing checks: `fly()` recording each contact's own time
   within `AT_ONCE` would make every plain break a punch. Fixed: a turn
   within `AT_ONCE` of the strike counts, with a spec on each side of it;
   the first choice names the check `orderProblemsOf()` could make, the
   rules stream's to weigh.
2. **`begin(boon)` needs what the scene isn't handed:** neither
   `RoundView` nor the scene's options carry the boon or a flight's start.
   Left for V3 and S2, whose files they are; the second choice says how
   `RoundPlay` could own the `FlightEffects`, or `RoundView` carry the
   boon.
3. **The hop ended at the cage, where "Fuzzley flavor" has a freed friend
   hop to the floor.** Fixed: `hopHeight(done, from)`, a thrown thing's
   curve from the cage's height, `HOP_HEIGHT` over it at the top, down to
   the floor, specced from three heights; `HOP_MS` 600 for the longer way.
4. **The result card covered the losing brick at once without motion,**
   though the wait's own words gave seeing it as a reason. Fixed:
   `LOST_STILL_MS`, 500 ms, with a spec, and the tenth choice says so.
5. **A strike that takes no hit had no flourish,** where the plan swells
   every struck brick and Brick Breaker pops steel. Fixed: the clank swells
   too, the third choice saying so.
6. **The knock's words left out the hot shot's bounce off the floor.**
   Fixed in the lab and the recipe.
7. **The shake had a size but no shape,** leaving the motion to the scene,
   held to lower floors. Fixed: `shakeOf()`, its swing at two rates that
   never keep step, dying away, written into a record in device pixels, as
   Asteroid Breaker's; the eleventh choice says why pixels.
8. **Nits.**
   - `BOON_RELEASE` and the events' constants shared one doc comment.
     Fixed: each has its own.
   - Three fields with three sentinels stood for the last turn. Fixed: one
     `lastTurn`, the turn itself or null.
   - The lab made a break event up to read one number. Fixed: the view
     exports `breakDetune()`, which `detuneOf()` and the lab share.
   - The third choice cited "Charge" for the strikes that don't count
     against boredom. Fixed: "The flight".
   - The swell's dip under its size is 1.4%, under half a CSS pixel. Left
     for Q3 to judge, as the eighth choice now says: the ease's usual
     overshoot, kept until it is seen in the game.

### U4, first part: the levels and the result

**2026-11-10.** U4 in two commits, as the integrator asked while R7 is
built: this one `levels/` and `result/`, each a component of narrow inputs;
the next `stats/` over R7's `run/stats.ts` and `progress.ts`.

**What was built.**

- `src/app/levels/levels.component.{ts,html,scss,spec.ts}`: `<app-levels>`,
  the Levels dialog.
  - Inputs: `open`; `marks`, each level's `LevelMark` by its id (`open`,
    `stars`, `best`); `current`, the run's level or null; and `levels`,
    P1's `LEVELS` unless a spec hands others.
  - Outputs: `chosen`, with an open level's number, and `closed`.
  - Each set under its name, a region; each level a `start-tile` button
    named by its number and name; once cleared, a `star` icon in the
    warning's gold for each star earned, said as "2 of 3 stars" in hidden
    text, and "Best 1,240"; "Locked", dashed and `aria-disabled`, until it
    opens; the run's own `aria-current`.
- `src/app/result/result.component.{ts,html,scss,spec.ts}`: `<app-result>`,
  the result card on `result-card`.
  - Inputs: `open`; `end`, a `RunEnd` (`outcome`, `"over"` or `"won"` as
    `RunStage` names them, `firstLevel`, `level`, `levelName`, `score`,
    `cleared`, `stars`); `best`; and `newBest`.
  - Outputs: `tryAgain`, `newGame`, `chooseLevel` and `closed`.
  - "Game over", lost on a level named by number and name, or "Every level
    cleared!" from where the run started; the score, the best, the levels
    cleared and the stars earned; "New best" and the trophy; "Try again from
    level N" or "New game", "Choose a level" and "Close".

**Choices the plan didn't make.**

1. **Narrow inputs, no services,** as the integrator asked: `LevelMark`
   and `RunEnd` are defined in the components until R7's stats and
   progress exist, when U1 or the next commit works the marks and the end
   out from them, and the integrator settles where the types live. The
   board hands `end` always, as Brick Breaker's card reads its run whether
   it has ended or not: the run's numbers as they stand, its outcome
   `"won"` or else `"over"`, and the level's name from the same levels the
   dialog is handed, one source for both.
2. **A level not in `marks` is locked,** so the board hands every level's
   mark, the first's open; deciding what is open is `ProgressService`'s.
3. **Cleared means it has a star:** a level is cleared within or past par,
   so every cleared level has one at least. Its stars and its best show only
   then, as "Cards and dialogs" says, "stars and best once cleared".
4. **`MOST_STARS`, 3, is the component's for now:** the rules hold the star
   points and the two-star margin but no count of stars, and the rules
   can't import the shell, so the integrator is asked to put it in
   `tuning.ts` beside them, for this, How to play's "three stars" and R7's
   stats to share.
5. **The levels come from P1's `LEVELS` by default,** an input only so a
   spec can hand two sets; the game has one set yet, Warm-up.
6. **Choosing hands the number on and closes nothing:** the board asks
   before a run in progress is lost and closes the dialog once the run has
   started, as Brick Breaker's dialog does through its service.
7. **The result card opens on its title,** as Asteroid Breaker's does, not
   on its first button as Brick Breaker's: Space lets a shot fly, and a
   player still pressing it as the card opens would press the button. A
   click beside the card doesn't close it. Unlike Asteroid Breaker's, the
   title keeps the focus ring after keyboard play, as `@fz/style`'s
   document rule says no component clears its outline, and it shows where
   Tab goes on from.
8. **Only the stars earned show,** one icon each, none faint for those not
   earned: the count tells them by shape, where a lit and an unlit star
   would differ by color alone. The dialog's words say a level shows "up
   to three".
9. **"Try again from level N"** names the level, starting with the words
   How to play gives the button; a won run's first button is "New game",
   as How to play says too.
10. **The figures are four, two by two:** the score, the best, the levels
    this run cleared and the stars it earned. The furthest level reached is
    the stats', and the card names the level already.

**Checks.** The workspace's `lint`, `typecheck`, `test` and
`test:coverage` pass: 2,742 tests in 39 files, 2 of them new and 30 of the
tests; both components at 100%. The root's `yarn lint` passes. Both
stylesheets compile with Sass through the toolkit; neither is seen in a
browser, since nothing places them until U1, so the stars' gold on a tile
in each palette is for Q3's look.

**The mutation pass.** 30 mutants, one at a time, against the two specs:
an unmarked level open; every level current with no run, or always; stars
shown before clearing, one more lit, four of them, and the words counting
the most; "Locked" unsaid, the best's thousands ungrouped, and a locked
level chosen; each level a set of its own and a set's section unnamed; no
level marked locked; every star lit; the dialog's close button and Escape
mute; the titles swapped; a won run from its last level; the next level's
name; the best the score, and the cleared and the stars swapped; trying
again from the first level, or always; the won run's trophy gone and the
badge always shown; the backdrop closing; the title not focused; and the
card's levels button, close button and Escape mute. All 30 were killed.
The review's changes got 9 more: cleared with no star, a star short and
one more by place, the best shown before clearing and never, the stars
shown uncleared, the subtitle's name gone, and the trophy for a new best
alone or a win alone. The stars numbered from 0 survived and is
equivalent: the numbers only track the icons.

**The review:**

1. **The game's-own-levels spec read the first set alone but expected
   every level,** which fails once a second set lands, and its
   expectation held a condition. Fixed: every level open, the buttons of
   every set's region against `LEVELS`, by number and name.
2. **The card named a level from the global `LEVELS`, the dialog from its
   input,** two sources once U1's specs hand levels of their own. Fixed:
   `RunEnd.levelName`, which the board takes from the levels it hands the
   dialog; `nameOf()` and its spec for a level no game has are gone.
3. **`RunEnd.outcome` named a loss `"lost"`, where `RunStage` says
   `"over"`, and `end` is required while the card is shut.** Fixed: the
   outcome is `Extract<RunStage, "over" | "won">`; `end` stays required,
   the first choice saying how the board hands it always.
4. **`MOST_STARS` sits in the shell, where the rules can't reach it.**
   Left for the integrator, who owns `tuning.ts`: the fourth choice and the
   report ask for it there.
5. **A spec queried `fz-icon.lit`, a class.** Fixed with the sixth: no
   class; the spec counts the star icons by their name.
6. **Lit and unlit stars differed by color alone.** Fixed: only the stars
   earned show, the tenth choice.
7. **Two templates computed** (`level.stars.length > 0`, `newBest() ||
won()`). Fixed: `cleared` on each level and a `trophy` computed.
8. **"Best shows whenever there is one" had no spec,** and the plan
   reads "stars and best once cleared". Fixed: the best shows once
   cleared, with a spec of a best on a level not cleared showing nothing.
9. **The focused title draws a focus ring, where Asteroid Breaker's
   clears it.** Kept, by the document's rule; the seventh choice says why.
10. **"The review:" was empty.** Filled.

### U4, second part: the stats and the progress

**2026-11-10.** After R7 landed, over its `run/stats.ts` and
`run/progress.ts`.

**What was built.** In `src/app/stats/`:

- `stats.service.ts`: `StatsService`, a stored signal under
  `brick-fuzz-pop-stats`, version 1, read through `statsOf()` for the
  game's levels: `stats`; `recordStart()`; `recordEnd(run)`, which asks
  `isNewBest()` before `withRunEnded()` and returns it; and
  `recordLevel(id, result)`, through `withLevelCleared()`, with what
  `levelResultOf()` gives.
- `progress.service.ts`: `ProgressService`, a stored signal under
  `brick-fuzz-pop-progress`, version 1, the ids of the levels cleared,
  read through `clearedOf()` and written as a list: `cleared`,
  `isOpen(level)` and `recordCleared(id)`, which stores nothing for a
  level cleared again.
- `level_marks.ts`: `levelMarksOf(levels, cleared, stats)`, each level's
  `LevelMark` by its id, open as `isOpen()` says, and, once the progress
  has it cleared, its stars and best points from its records: what the
  board hands `<app-levels>` as `marks`.
- `levels/levels.component.ts` takes `MOST_STARS` from R7's
  `run/stars.ts` in place of its own.

**Choices the plan didn't make.**

1. **The services read the game's `LEVELS` directly,** where Brick
   Breaker's inject a `GAME_LEVELS` token from `src/app/tokens.ts`. That
   file is the integrator's, written in U1; once it exists, the two
   services take the token in one line each, as Brick Breaker's do, and
   their specs hand the spec levels. Until then the specs run on Warm-up's
   ids.
2. **Neither service knows the run,** so neither needs `GameService` or a
   signal of it: each records what it is handed, as Brick Breaker's do.
   Each one's doc tells its caller to hand it nothing of a run on numbers
   the debug menu retuned, in either store, as Asteroid Breaker's game
   skips both.
3. **The marks are a function, not a service,** so the board makes them a
   `computed()` of `progress.cleared()` and `stats.stats()`, over the same
   levels it hands the dialog. The progress alone says what is cleared, as
   it alone opens levels: a level the progress has cleared whose records
   were dropped shows open with no stars, and one with records the progress
   lost shows none of them, rather than stars beside "Locked".
4. **The two keys are for the integrator to list** in the game's
   `AGENTS.md`'s "What It Keeps", each at version 1:
   `brick-fuzz-pop-stats`, the runs, the best run's score, the furthest
   level and each level's best points, fewest rounds and stars; and
   `brick-fuzz-pop-progress`, the ids of the levels cleared. Its overview
   can name `src/app/stats/` beside `src/app/settings/`.

**Checks.** The workspace's `lint`, `typecheck`, `test` and
`test:coverage` pass: 3,244 tests in 51 files, 3 of them new and 19 of the
tests; the three files at 100%. The root's `yarn lint` passes.

**The mutation pass.** 13 mutants, one at a time, against the three specs:
a run's start, an ended run and a level's records not kept; the new best
asked after keeping the run; the stats and the progress read for no
levels, and a level opened among none; a level cleared again kept again;
the cleared written as none; every level open, or only once cleared; the
stars read from the rounds; and no best. All 13 were killed. The review's
changes got 4 more: each key renamed, the records shown for a level the
progress hasn't cleared, and the global levels read in place of those
handed. All 4 were killed.

**The review:**

1. **No spec checked the storage keys:** the specs imported them, so a
   rename passed. Fixed: each spec writes its key in its own words, the
   constants are no longer exported, and a rename of either is killed.
2. **The two new keys weren't asked of `AGENTS.md`.** The fourth choice
   and the report ask the integrator, whose file it is.
3. **`StatsService`'s doc stated the retuned-run rule as fact, for the
   stats alone.** Fixed: both services' docs tell the caller to hand them
   nothing of a retuned run, naming both stores.
4. **A level could show stars beside "Locked"** where the stats kept
   records the progress lost. Fixed: the stars and the best show only for a
   level the progress has cleared, with a spec, the third choice saying
   so.
5. **The marks' spec only ever handed the game's levels.** Fixed: a spec
   on three made-up levels.

### U6: the saved game

**2026-11-10.** Over R7's `run/saved_game.ts`.

**What was built.** In `src/app/play/saved_game.service.ts`:

- `SavedGameService`, which keeps the run under way through `keepSaved()`,
  under `brick-fuzz-pop-game` at R7's `SAVED_GAME_VERSION`, 1. It saves
  with `saveGame()` over the run, where its next round starts and whether
  it was retuned; it takes a kept run up as the page loads through
  `restoreGame()`, under the id after the run the game began with, paused;
  and it tracks the level's rounds, the run's stage and the runs begun, so
  it writes as a round is released, as the run changes course, as a new
  run begins, and as the page is hidden, never at a frame.
- `KeptGame`, what it reads of the game and how it hands a kept run back:
  `run`, `nextStart`, `tuned`, `outcome` and `runs`, `RunLifecycle`'s
  both, and `takeUp(takenUp)`; and `KEPT_GAME`, the token it takes the
  game through.

**Choices the plan didn't make.**

1. **The service takes the game through a narrow interface,** `KeptGame`,
   by the `KEPT_GAME` token, not `GameService`, which is U1's. U1 makes
   `GameService` implement it and provides it as
   `{ provide: KEPT_GAME, useExisting: GameService }`; the spec hands a
   fake game whose moves are R7's.
2. **`nextStart` is the round in flight's `next` while one flies,** and
   the start waiting to be aimed from otherwise, so a round is kept as it
   is released and a page reloaded mid-flight comes back after it, as
   `saveGame()` lands the round it keeps. `GameService` must hand it so,
   set in the same turn as the run at a release: a round kept with the
   start before it fails `restoreGame()`'s checks, and the whole run is
   lost. The interface's doc says both.
3. **It tracks the level's rounds, the run's stage and the runs begun,**
   not `run()`, so only the changes that should write do. The rounds are
   its own `computed()` of the run, so the write at a release can't hang on
   a count the bar shows, which may move as the flight lands; the stage
   and the runs are `RunLifecycle`'s, as Brick Breaker's are. The runs
   begun are tracked because a new run can stand just as the last did, a
   level waiting with none of its rounds played, which a spec holds.
4. **It reads the game's `LEVELS` directly,** as U4's services do, until
   U1's `GAME_LEVELS` token.
5. **Something must inject it at startup** for a kept run to be taken up:
   Brick Breaker's and Asteroid Breaker's `main.ts` do, in an app
   initializer, which U1's would too.
6. **The key is for the integrator to list** in the game's `AGENTS.md`'s
   "What It Keeps": `brick-fuzz-pop-game`, version 1, the run under way.

**Checks.** The workspace's `lint`, `typecheck`, `test` and
`test:coverage` pass: 3,258 tests in 52 files, 1 of them new and 14 of the
tests; the new file at 100%. The root's `yarn lint` passes.

**The mutation pass.** 10 mutants, one at a time, against the play specs:
the key renamed; the version moved; never tuned; the taken-up run kept
under its old id; nothing taken up; taken up for no levels; each of the
three tracked signals untracked, and none. Two survived at first: a
round's release and a new run untracked, as each spec's change also moved
the run's stage. Two specs now change only what each tracks: a second
round released, the level under way, and a new run begun from a level
waiting with no round played. All 10 were killed. The review's change got
one more, the rounds read as the level, which was killed.

**The review:**

1. **The write at a release hung on `GameService`'s `rounds`,** which U1
   might make the bar's count, moving as the flight lands, so a reload
   mid-flight would give the round back. Fixed: the service works the
   rounds out from the run itself, and `KeptGame` no longer has them. The
   review offered the run's id for the runs begun too; the stage and the
   runs stay the game's, as `RunLifecycle` gives both and Brick Breaker
   tracks them so.
2. **No spec kept a round that ends its level in flight,** the one case
   where what is kept differs from the run. Fixed: two specs, a losing
   round released and nothing kept, and a clearing round released and the
   next level kept with no rounds.
3. **`nextStart` set after the run would keep a start storage rejects.**
   Fixed: its doc and the second choice say to set it in the same turn.
4. **Nits in the spec.** Fixed: the `afterEach` that set the page visible
   is gone, as `setPageVisibility()` gives the page back itself, as is the
   page made visible again before a reload; the pause's spec checks
   everything kept.

### U1's bar

**2026-11-10.** A piece of U1, split off to run beside S1 and V3; the core
agent wires it to `GameService`.

**What was built.** In `src/app/bar/`:

- `bar.component.ts`, `<app-bar>`: the bar over `@fz/game-ui`'s
  `<fz-game-bar>`, handed what it shows and asking the app for each action,
  so it reads nothing of the game. It takes `level`, `rounds`, `par`,
  `rowsLeft`, `score`, `friends` (each friend's ink, 0 to 7, the crew's
  `friends`), `outcome`, `flying`, `fast` and `soundOn`, and emits
  `pauseRun`, `resumeRun`, `fastForward` (whether to play fast), `skipFlight`,
  `toggleSound`, `openLevels`, `newGame`, `openHelp` and `openSettings`. It
  reads the window's shape from `GameViewportService` and the palette's mode
  from `ThemeService` itself.
  - The figures: the level; the rounds against par, "4/9" seen and "4
    rounds, par 9" heard; the rows left; the score, grouped; and the crew,
    the player's fuzzball in the accent and each friend in
    `cssHex(friendInk(ink, mode))`, heard as "3 fuzzballs". Below the
    desktop width, the rounds and the score alone, in one card across the
    bar or stacked on a rail.
  - The actions: Pause (`fzBarPause`), Fast-forward and Skip, then Sound,
    Levels, New game, How to play and Settings; on a compact screen the last
    five in the overflow menu, led by the link home where the bar has no
    room for it.
- `fast_forward.component.ts`, `button[appFastForward]`, modelled on
  `BarPauseComponent`: `aria-pressed` while `fast`, and then in the accent;
  `aria-disabled` while not `flying`; the focus kept where it was through a
  press with a pointer; a press emits `fastForward` with the opposite of
  `fast`.
- `skip.component.ts`, `button[appSkip]`: the same for Skip, a press
  emitting `skipFlight`.

**Choices the plan didn't make.**

1. **Every action is round at every size,** its name heard and shown
   under the pointer: Pause's label is hidden, its name in a `title` the bar
   gives it, and New game is round too.
   Measured in headless Chrome over a stand-in page, with a crew of seven
   and a six-figure score, the breakers' labelled Pause and New game and a
   labelled Fast-forward and Skip needed about 1,430 CSS px, and at 1,200
   the figures ran over the link home. Round, with the cards 8 px a side
   rather than 16, their labels on one line and the crew's fuzzballs 16 px,
   the bar fits at 1,200 with its title whole, and at 1,280, beside the
   wordmark, cuts the title short with an ellipsis only beside four friends
   or more. It stays 73 px tall at every roomy width; the compact card is
   42 px in a 60 px bar; at 360 wide the compact bar fits with 8 px to
   spare, and the rail at 390 tall with 8. At 720, the narrowest roomy
   width, the title is cut to "Brick Fuzz P…".
2. **Fast-forward and Skip stay in the bar, dimmed while there is no
   flight,** rather than coming with each flight, so nothing moves as one
   starts. `flying` holds while the run is paused mid-flight: the bar is
   outside the play room, so a player who tabs to either from the board
   pauses the run on the way, and the button must still work. Fast-forward
   pressed then sets the speed the flight goes on at, and Skip lands it.
3. **On a compact screen New game moves into the overflow menu,** which the
   breakers keep in the bar: Pause, Fast-forward, Skip and the menu are four
   round buttons, and a fifth overruns 360 px.
4. **Fast-forward asks for what the player wants,** `fastForward(true)` or
   `(false)`, the opposite of the `fast` it was handed, rather than a bare
   toggle, as Pause's press may come after the run has moved on. F held is
   the core's to fold into `fast`.
5. **Skip has a file of its own,** `skip.component.ts`, beside
   `fast_forward.component.ts`, one component to a file.
6. **The lint's two rules are turned off where they meet the new buttons,**
   as `eslint.config.js` is the integrator's: each attribute selector
   carries an `eslint-disable-next-line` for `component-selector`, and each
   of the bar's two empty buttons one for `elements-content`. An override
   like `@fz/game-ui`'s for the two files, and `appFastForward` and
   `appSkip` in `elements-content`'s `allowList`, would let them go.
7. **The fuzzballs' eyes are the field's color** (`--fz-field`), as the
   scene draws them; the rounds' icon on a compact screen is the player's
   fuzzball, and the score's `bricks`, as Brick Breaker's is.

**For the core agent.** `rowsLeft` is the rows still waiting over the
ceiling; `flying` is a flight under way, paused or not, and a Skip while
paused has to land it though `landRound()` lands only a run in play;
`resumeRun` asks the game to go on and the board to take the focus, as the
breakers' `handBack` does; `friends` is the waiting start's
`crew.friends`.

**Checks.** The workspace's `lint`, `typecheck`, `test` and
`test:coverage` pass: 3,442 tests in 57 files, 3 of them new and 63 of the
tests; the three files at 100%. The root's `yarn lint` passes.

**The mutation pass.** 25 mutants, one at a time, against the bar's specs:
every figure on a compact screen wide enough, and wherever the screen isn't
compact; the rounds shown and said against the rounds; the score
ungrouped; the friends always in their light inks; the crew counted
without the player, or drawn without the player's fuzzball; no New game,
and no link home, in the menu; Levels from the menu asking for How to play;
Pause labelled; Resume pausing; Fast-forward never held, always flying, or
always asking for the flight fast; Skip always flying; Fast-forward and
Skip unguarded, taking the focus, or dimmed while a flight plays; and
Fast-forward asking for what it holds, or never pressed. Two survived: the
figures on a compact screen as wide as a desktop's, and Fast-forward
always asking for the flight fast. Each got a spec, a window 1,280 wide and
480 tall, and a press while the flight plays fast, and was killed. After
the review, all 25 again and 3 more, New game a pill and Pause named
Pause, or nothing, under the pointer: all 28 were killed.

**The review:**

1. **Fast-forward and Skip were dead from the keyboard once wired:** the
   bar is outside the play room, so tabbing to either pauses the run, and
   `flying`, false while paused, dimmed them as they took the focus.
   Fixed: `flying` is a flight under way, paused or not, in the three
   components' docs, the second choice and the notes for the core agent,
   with a spec that skips a paused flight.
2. **Pause was the one action with no name under the pointer,** and its
   icon 16 px beside the others' 18. Fixed: the bar gives it a `title`,
   Pause or Resume, and the 18 px icon, with specs for both names.
3. **No spec held the actions round:** New game back as a pill passed.
   Fixed: a spec holds every action but Pause a circle.
4. **Fast-forward's `held` and the bar's `fast` named the same value
   twice,** and `held` read as F held. Fixed: both are `fast`.
5. **The spec provided a memory store the test setup already provides,**
   and two inks' comments called them friends. Fixed.

### The bar's lint, named in the config

**2026-11-10.** At the integrator's word, since `eslint.config.js` is the
integrator's, following through on U1's bar's sixth choice.

**What was built.** The game's `eslint.config.js` names the bar's
Fast-forward and Skip as `@fz/game-ui`'s own `eslint.config.js` names Pause
and Sound: an override after `angular()` for
`src/app/bar/fast_forward.component.ts` and `skip.component.ts` takes their
`component-selector` as an attribute's, `app` and camelCase, and one after
`templates()` for `src/app/bar/bar.component.html` alone gives
`elements-content` an allow list of `fzBarPause`, `fzBarSound`,
`appFastForward` and `appSkip`, which replaces `templates()`' own and so
names Pause and Sound again. Every other template keeps `@fz/dev`'s list as
it changes. The four `eslint-disable-next-line` comments in `src/app/bar/`
are gone.

**Checks.** The workspace's `lint` and `typecheck` pass, and the bar's 63
specs; the root's `yarn lint` passes. `eslint --print-config` gives each
file the options above and the bar's component the element selector still.
With the two overrides taken out again, `eslint src/app/bar` reports the
four errors the comments had silenced, so each override does its work.

**The review:**

1. **The allow list covered every template,** freezing a copy of
   `@fz/dev`'s list game-wide. Fixed: it covers the bar's template alone.
2. **One comment explained both blocks,** and the selector's override sat
   away from `angular()`, which it overrides. Fixed: each block has its own
   comment, the selector's after `angular()`, the list's after
   `templates()`.

### U1's board cards

**2026-11-10.** A piece of U1 beside the view stream's core, which owns the
rest of `src/app/board/` and `GameService` and wires the cards in.

**What was built.**

- `src/app/board/board_card.component.ts`, `<app-board-card>`, modelled
  on Asteroid Breaker's: the layer over the field, the canvas's own cards
  projected first and none of its own while they show one. It takes `card`,
  a `BoardCard` or null, and `pictures`, How to play's `HelpPictures` or
  null, and emits `resumeRun` and `nextLevel`, each from a button with
  `[fzKeepKeys]`. A `@switch` over the card's kind ends in
  `@default never;`.
  - **Ready** (`ReadyCard`: `level`, `name`, `boon`, `newKind`): "Level 3:
    Thicker", what the level's jumps earn (`describeBoon()`), and the kind
    of brick it brings in, its picture once the scene has drawn it, "New:
    Tough brick." and what it does; on a phone on its side, "The game is
    larger upright."
  - **Paused** (`PausedCard`: `score`): "Paused", the score, Resume.
  - **Cleared** (`ClearedCard`: `level`, `rounds`, `par`, `tally`,
    `score`, `friends`): "Level 3 cleared", a gold star for each earned,
    `starsFor()` the rounds against par, heard as "2 of 3 stars"; "7
    rounds, par 9"; the bricks', jumps' and
    stars' points, R7's `LevelTally`; the score; the crew lined up beside
    "2 friends freed", where any were; Next level. The new kind's picture
    is square, 36 px, as a brick is.
- `src/app/bar/crew.component.ts`, `<app-crew>`: the crew row, the player's
  fuzzball in the accent and each friend in its ink, `--crew-size` across,
  which the bar and the Cleared card share. The bar's own crew markup and
  its palette specs moved into it.

**Choices the plan didn't make.**

1. **One input carries the card and its numbers,** a union of the three
   cards by `kind`, so what a card shows comes together and a card can't be
   handed another's numbers; null shows none.
2. **The kind a level brings in is handed over,** `newKind`, which the core
   finds as the kind whose `firstLevel` is the level's number, so the card
   reads no catalog by level.
3. **Ready has no button,** as Asteroid Breaker's has none: the first move
   starts the level. It stands at the top of the field, over the wall, as
   the plan says, clear of the floor where the fuzzball waits, and the
   layer takes no pointer but on a button, so a pull back can start over
   it.
4. **There is no card for an ended run,** which the breakers show once its
   result is closed: the plan names Ready, Paused and Cleared alone, and
   the result offers Try again and Choose a level. The core can ask for one.
5. **The switch is over a `@let` of the card's kind,** not `card.kind`:
   Angular's check for `@default never;` reads `card.kind` on a card
   already narrowed to `never` and fails, while TypeScript narrows the card
   through the alias. Both checks hold: a field of another card fails to
   compile in a case, and so does a case left out.
6. **The crew row is a component of the bar's folder,** which the card
   imports, since the bar and the card draw it alike and `bar/` is the
   folder of the app this stream owns that it fits. The panels' In this
   wall will draw the crew too; a folder of its own, as Asteroid Breaker's
   pilot row has, is the integrator's to make under `src/app/`.
7. **On a small board the tally narrows to the card,** `min(14em, 100%)`,
   where the breakers' 14em ran past a card 212 px wide, seen in headless
   Chrome over a stand-in page with the three cards on boards of 360 by 640
   and 260 by 460.

**For the core agent.** The card reads the board's margin round the field
as `--margin`, as Asteroid Breaker's does; the board projects its
`<fz-canvas-cards>` into it; `resumeRun` and `nextLevel` should hand the
board back the focus, which their button takes with its card; Cleared is
for a level with another to come, the result covering a won run.

**Checks.** The workspace's `lint`, `typecheck`, `test` and
`test:coverage` pass: 3,795 tests in 64 files, 2 of them new; the card's
26 specs and the crew's 5 are new, and the bar's 3 specs of the crew's
inks became 1; the two new files at 100%. The root's `yarn lint` passes.

**The mutation pass.** 22 mutants, one at a time, against the board's and
the bar's specs: the upright line on every compact screen; the card's own
shown over the canvas's; the paused and the cleared score ungrouped; the
title without the name; the boon always the hot shot; the new kind
ignored, its words its name, or no picture; a star short, or said against
the stars earned; the rounds against the rounds; the jumps' and the
stars' points crossed; friends freed though none were; Resume and Next
level crossed, or letting their keys reach the board; and the crew always
in the light inks, heard by a screen reader, or without the player. One
survived, the boon always the hot shot, and a spec with the triple shot
killed it. After the review, all 22 again, the stars' two read off the
stars worked out, and 2 more, the stars from the par alone and the roomy
bar without Levels: all 24 were killed.

**The review:**

1. **The crew's move took the bar's spec of its actions' order with it.**
   Fixed: the spec is back, with a mutant, the roomy bar without Levels,
   that it kills.
2. **The new kind's picture was squashed to 2 by 1,** sized by How to
   play's custom properties, which only How to play sets square. Fixed: 36
   px square of its own.
3. **The crew lives in `bar/` though the card, and later the panels, use
   it.** Kept: a new folder under `src/app/` is the integrator's to make,
   which the sixth choice now says, where it had leant on Asteroid
   Breaker's pilot row, which has a folder of its own.
4. **The Cleared card took its stars beside the rounds and par they come
   from,** which could disagree. Fixed: the card works them out with
   `starsFor()`, and `ClearedCard` has no `stars`.
5. **`kind` named both the card's kind and the brick kind in the
   template.** Fixed: the brick kind is `newKind`.
6. **The tally's spec read the `<dd>` as the `<dt>`'s next node,** and a
   helper only wrapped another. Fixed: `figures()`, and the one helper.
7. **The canvas card's spec told the console of the failed scene and
   checked only that the card was gone.** Fixed: as Brick Breaker's,
   `collectErrors()`, `TestBed.inject()`, and the alert's words checked
   with the card gone and the error told.
8. **The class doc made the app's handing back of the focus follow from
   the buttons keeping their keys.** Fixed: two sentences.

### The Ended card

**2026-11-10.** At the integrator's word, beside U1's other board cards. It
takes back the fourth choice of "U1's board cards", that there is no card
for an ended run, and that entry's note that the result covers a won run.

**What was built.** `BoardCard` takes a fourth card, `EndedCard`, for once
an ended run's result is closed, as Asteroid Breaker's board shows one: a
level lost (`outcome: "over"`, with `level`, `name` and `score`) or the
last level cleared (`outcome: "won"`, with `score`). `<app-board-card>`
emits `tryAgain` and `newGame`. `src/app/result/end_words.ts` holds the
words the result and the card share, `whereLost()` and `tryAgainLabel()`,
and the result's title is now `endTitle()`'s, as the card's is.

- **A level lost** (`"over"`): "Game over", as `endTitle()` and the result
  call it; "Lost on level 3, Thicker"; the score; and "Try again from level
  3", which emits `tryAgain`.
- **The last level cleared** (`"won"`): the trophy; "Every level
  cleared!"; the score; and New game, which emits `newGame`.

Each button keeps its keys from the board, as the other cards' do.

**Choices the plan didn't make.**

1. **What the card offers is what the result's first button offers,**
   since the plan's run plays on from its level until one is lost, which
   is tried again as often as wanted, and the end of the levels is a new
   game: "Try again from level 3" or New game, worded as the result words
   them. Choose a level stays the bar's and the result's.
2. **Two outputs, named as the result names them,** `tryAgain` and
   `newGame`, from the card's one button, as the result's first button
   does, so the core wires the card as it wires the result, and the card
   says which it was.
3. **The card is handed only what it shows,** the outcome, the score, and
   for a level lost its number and name, not the result's `RunEnd`, whose
   first level, levels cleared and stars the card doesn't show.

**For the core agent.**

- Hand `ended` only once the run has ended and its result is closed
  (`ended() && resultClosed()`), and wire `tryAgain` and `newGame` as the
  result's are, handing the board back the focus.
- `RunLifecycle.go()` (Enter, or a tap on the board) and P's `toggle()`
  call `newGame()` once an ended run's result is closed, and How to play
  tells keyboard players so. Over "Try again from level 3" that is the
  wrong move: `GameService` can override `go()`, which is protected, to try
  a lost level again, but `toggle()` is private, so P needs a hook in
  `RunLifecycle` or has to go through `newGame()`.

**Checks.** The workspace's `lint`, `typecheck`, `test` and
`test:coverage` pass: 3,863 tests in 68 files, 1 of them new and 16 of
the tests; the card and the words at 100%. The root's `yarn lint`
passes.

**The mutation pass.** 11 mutants, one at a time, against the board's
specs: the run never won; the title always "Game over"; where it was lost
said of a won run too, or without the level's name; the score ungrouped;
Try again without the level; the trophy always; the two buttons' outputs
crossed; and either button letting its keys reach the board. All 11 were
killed. After the review, 12 over the reshaped card, the words and the
result: the title always "Game over", on the card or the result; the score
ungrouped; never won; the won card saying Try again, or marked lost, and
the lost one marked won; its button's outputs crossed, or letting its keys
reach the board; the trophy always; and the words without the level's
name, or Try again without the level. All 12 were killed.

**The review:**

1. **The board's keys would start a new game over "Try again".** Answered
   in the notes for the core agent, with the supersession of the earlier
   entry's fourth choice.
2. **The trophy's specs counted any icon, and no spec held the won card's
   score.** Fixed: both look for the trophy by name, and the score's spec
   covers either end.
3. **The card copied the result's words,** where the lost level is and
   Try again, and the result spelled its title out beside `endTitle()`.
   Fixed: `end_words.ts` in `result/`, which both use, and the result's
   title from `endTitle()`. The proof stream owns `describe.ts`, so the
   words stay in the app.
4. **The label was worked out for a won card it never showed,** and two
   near-same buttons split it. Fixed: one label and one button,
   `startAgain()`, as the result has.
5. **The outcome was typed apart from the run's stages,** and a won card
   took a level and a name it never shows. Fixed: `Extract<RunStage, …>`,
   and a union in which only a lost level carries them.

### The docs pass: the shell's folders and `browserKey()`

**2026-11-10.** At the integrator's word, while the board waits on U1.

**What was written.** The game's `AGENTS.md`, in `src/app/`'s list alone:
`bar/`, the bar with its figures at and below the desktop width, its
round actions, Fast-forward, Skip and the overflow menu, and `<app-crew>`;
`board/`, `<app-board-card>` and its four cards, each handed what it
shows; `panels/`, Coming next and In this wall, from the art stream's
files; and `result/`'s `end_words.ts`, which the result and the Ended card
share. `app.component`'s line and `play/` wait for the U1 wiring, and the
rules section for R6. `frontend/lib/phaser/AGENTS.md` and the
`phaser-core` skill now say `browserKey()` takes a letter's or a digit's
`keyCode` from its code (`KeyA` to `KeyZ`, `Digit0` to `Digit9`) and any
other's from its table, throwing for one the table lacks, as `keyCodeOf()`
does; both had said it throws for any code its table lacks.

**Choices the plan didn't make.**

1. **Nothing is said to be wired that isn't yet.** The board and the app
   don't place the bar, the cards or the panels, so the bar shows "what it
   is handed", the cards read `--margin` from "whatever lays it out" and
   hand on each press, and the panels are "to be laid over" their rooms.

**For the integrator.** Two lines outside this pass's lists:

- **The game's intro** still says the shell's written pieces are "the
  scene, the dialogs, the settings drawer and the services" and lists U1
  among what "isn't here yet", which the new `src/app/` entries now
  contradict. Suggested: "the scene, the dialogs, the settings drawer, the
  bar, the board's cards, the panels and the services that keep the game
  are written and specced", and "the rest of U1" in the list of packages.
  Left alone, as the rules stream edits the same paragraph's R3 to R6.
- **`run_scene.ts`'s doc comment on `browserKey()`** says it throws for a
  code "whose `keyCode` it doesn't hold" and that "a key a spec needs is
  added to its table", the instruction behind S1's `KeyP` in the table.
  Suggested: "It throws for any other code its table lacks, rather than
  guess one; a key a spec needs, past a letter or a digit, is added to its
  table." Source in another library, so not this pass's.

**Checks.** `node .agents/check-skill-references.mjs` passes, and the
root's `yarn lint`, before the review and after its fixes.

**The mutation pass.** None: no code changed.

**The review:**

1. **The game's intro contradicts the new entries,** naming U1 as not yet
   here. Left, for the integrator, as above: outside the `src/app/` list.
2. **The board card's entry hid what whoever lays it out needs:** that
   `--margin` is set from outside, and that the canvas's cards must be
   projected into it. Fixed: "reads the field's margin from `--margin`,
   which whatever lays it out sets", and the canvas's cards "projected
   into it".
3. **The bar and the cards were said to talk to "the app",** which doesn't
   place them yet, and `end_words.ts` named "the board's" Ended card.
   Fixed: "what it is handed", "hands on each press" and
   "`<app-board-card>`'s Ended card".
4. **`browserKey()`'s wording sat its clause by `runScene()`'s keys, and
   the skill said "any other" twice;** the ranges took en dashes the
   docs' prose doesn't use. Fixed: the clause follows the `keyCode`, the
   skill says "throwing for one the table lacks", and the ranges say "to".
5. **The doc comment in `run_scene.ts` was filed as a choice,** which no
   one picks up. Fixed: moved to the note for the integrator, with
   wording.
6. **The four cards got uneven detail.** Fixed: each lists what it shows
   and its button, Ready the line for a phone on its side too.
7. **"Hidden from screen readers"** and a list-like "Every action is
   round, Pause, …". Fixed: "hidden from assistive technology", and a
   semicolon.

### Only finished games need screenshots, and U2's listing

**2026-11-10.** At the user's word, through the integrator: "Relax the
rule so only finished games need a screenshot." T2's capture goes back
after Y1, where the plan has it.

**What was built.**

- **The check.** `missingImages()` in `frontend/site/tools/vite-plugins.ts`
  leaves out a game with `inDevelopment: true`, so `checkGameImages()`
  holds it to no pictures; a finished hosted game still needs its thumb and
  preview, and a game still to come its drawing in `public/thumbnails/`.
  `manifestProblems()` still fails a catalog entry whose build lacks the
  game. The doc comments and the error's words say so.
- **What the site shows meanwhile.** `GameThumbComponent` and
  `GamePageComponent` drop an image that fails to load, through an
  `(error)` binding and a `linkedSignal()` on its address, which forgets
  the failure once another game's picture is handed over. The tile's frame
  keeps its felt and its shape, as it did; the game page's stage now keeps
  the screenshots' 16:9 itself, and its category's surface, so without one
  it stays the same size, its surface and its Play button showing: the
  panel for Arcade, as a game still to come there shows. A screenshot that
  loads shows as before, with nothing to change once T2 adds them.
- **The listing.** `"brick-fuzz-pop"` in `frontend/site/games.json`, and
  the catalog's entry after Brick Breaker: Arcade, solo,
  `play: { build: "brick-fuzz-pop" }`, `inDevelopment: true`.
- **The docs.** The site's `AGENTS.md`, `frontend/games/AGENTS.md`'s step
  for the site and `docs/operations.md`'s "Add a game" say a game in
  development may ship no screenshots yet; the game's own `AGENTS.md` no
  longer says the site doesn't list it.

**Choices the plan didn't make.**

1. **The blurb:** "Charge the fuzzball, let it fly and keep the bricks off
   the floor." From the pitch's charge, release and loss at the floor, in
   the shape of Brick Breaker's "Bounce the ball, break every brick and
   keep it off the floor." **The minutes:** 10, Brick Breaker's.
2. **The fallback is the frame's own surface,** not the game's name on it:
   the tile names the game under its picture, and the page's stage keeps
   its Play button with the name. Removing the image, rather than hiding
   it, also keeps a browser from drawing its broken-image mark. The tile's
   frame stays felt in every category, as it is under every picture still
   loading and under the drawings of games still to come, Classics' too;
   the site gives a category its surface on the game page's stage alone.
3. **The exemption is by `inDevelopment` alone,** which
   `games.spec.ts` already allows only on a game that plays, so a game
   still to come is still held to its drawing.

**Checks.** The site's `lint`, `typecheck` and `test:coverage` pass: 177
tests in 21 files, 6 of them new, the two components at 100%. The root's
`yarn lint` passes. Each game built in turn, then the site's `build`
passes, Brick Fuzz Pop with no screenshots; with the entry's
`inDevelopment` taken out, the same build fails on its thumb and preview.
In headless Chrome over the build: the Arcade page's Brick Fuzz Pop tile
shows its felt, 224 × 126 as its neighbours, and its page's stage is
1200 × 675, the panel and its Play button showing; Brick Breaker's stage
and its loaded screenshot are both 1200 × 675, as before.

**The mutation pass.** 11 mutants, one at a time. Over the two
components' specs: either keeping a picture that failed, its error marking
nothing, never forgetting the failure for another game, or hiding every
picture. Over the plugins' spec: every game held to its pictures, only
games in development held, and none held. All 11 were killed.

**The review:**

1. **An Arcade game's fallback showed the card table's felt,** on the
   page's stage and in its tile, where the page gives a game not played on
   cards no felt. Fixed on the page: the play stage takes the category's
   `plain`, so the panel shows, which a loaded screenshot covers as
   before. The tile's left felt, as the second choice says.
2. **The game's `AGENTS.md` still listed U2 as wholly to come.** Fixed:
   "the rest of U2".
3. **`checkGameImages()`'s first sentence spoke of finished games only,**
   though it holds a game still to come to its drawing. Fixed: "when a
   game's picture is missing, but for a game in development's".
4. **The thumb's `failed` read awkwardly.** Fixed: "until the thumb is
   handed another game".
5. **Two specs repeated their render helpers' setup to get `rerender`,**
   and the plugins' spec had two near-same game factories. Fixed: the
   helpers hand back the render, and one factory at the top of the file
   serves both, `hosted()` built on it.
6. **The listing shouldn't reach `main` before U1 connects the game,** as
   the page says it plays. Left for the integrator, in the notes below.

**For the integrator.**

- **The listing says the game plays,** and the page's Play opens a shell
  that shows the game's name alone until U1's wiring: this commit is best
  merged to `main` with or after it.
- **The game's intro paragraph** is touched in two places, the site's
  sentence and "the rest of U2", beside the R3 to R6 the rules stream
  edits.

### The docs pass, continued: the debug folders

**2026-11-10.** At the integrator's word, once the art stream's debug
pieces were merged, after a rebase onto them.

**What was written.** The game's `AGENTS.md` gains `src/view/debug/`,
`debug_tuning.ts`'s numbers, sliders and lines, and what a tuning would
hand the playback and the rules; and, in `src/app/`'s list, `debug/`, the
menu and `DebugService`, with the settings drawer's entry saying where the
menu follows the settings and what the drawer takes and hands on for it.
Nothing says the game reads `DebugService`, `paceOf()` or `rulesOf()` yet,
as nothing does.

**For the integrator.** The art stream's source says more is wired than
is: `DebugService`'s doc comment says "The game reads it", the numbers
through `paceOf()` and `rulesOf()`, the depth between rounds and every level
open in the Levels dialog, and `DebugMenuComponent`'s that "the game offers
it the certificate"; the menu's own words say the depth is "Taken between
rounds" and that "The Levels dialog offers each level". `GameService` plays
at `FLIGHT_PACE` and reads none of it yet. Suggested: the comments say what
the game reads once U2 wires the menu in, or wait for that wiring; the
menu's words hold once it is. Source of another stream's, so not this
pass's.

**Checks.** `node .agents/check-skill-references.mjs` passes, and the
root's `yarn lint`, before the review and after its fixes.

**The mutation pass.** None: no code changed.

**The review:**

1. **`paceOf()` and `rulesOf()` were said to hand a tuning to `RoundPlay`
   and `playRound()`,** which nothing calls yet. Fixed: the pace and the
   rules a tuning "would hand", here and in the log.
2. **The source's doc comments and the menu's words describe wiring that
   isn't there.** Left, for the integrator, as above.
3. **The depth was said to throw, and the certificates' staleness was
   among what the menu sets.** Fixed: `setDepth()` throws, and the service
   says whether the certificates are stale (`certificatesStale`), from the
   tuning.
4. **"Which it hands on" read as handing on the certificate offered.**
   Fixed: Play the certificate is shown while one is offered, otherwise the
   menu says none holds, and its press is what is handed on.
5. **The settings entry gave the menu's bindings, not the drawer's,** and
   named `DEBUG_MENU` without its library, as the breakers' entries do.
   Fixed: `@fz/game-ui/debug_menu`'s `DEBUG_MENU`, and the drawer's
   `certificate` and `playCertificate`.
6. **A broken line in the view's entry.** Fixed: reflowed.
7. **"How far a fuzzball flies bored"** misread `bored`. Fixed: "without a
   hit before it yawns".

### `browserKey()`'s doc comment

**2026-11-10.** At the integrator's word, following the docs pass's note.

**What was written.** `browserKey()`'s doc comment in
`frontend/lib/phaser/src/testing/run_scene.ts` now says a letter's or a
digit's `keyCode` comes from its code and any other's from its table, and
that it throws only for another code the table lacks, so a key a spec
needs is added to the table only when it isn't a letter or a digit.
`keyCodeOf()`'s line says the same in short.

**Checks.** `@fz/phaser`'s `lint` and `typecheck` pass, and the root's
`yarn lint`.

**The mutation pass.** None: no code changed.

**The review:**

1. **`keyCodeOf()`'s line was garbled,** "one neither its code nor its
   table gives". Fixed: "a code that is neither a letter's, a digit's nor
   in its table".
2. **"Past a letter or a digit" isn't the file's word,** which is "but".
   Fixed: "a key a spec needs that isn't a letter or a digit", here and in
   this entry.
3. **A prototype name such as `toString` finds a function in `KEY_CODES`
   rather than throwing.** Left: no browser sends such a code, and the
   fix, `Object.hasOwn`, is code, outside this comment's commit.

### T1: the layout check

**2026-11-10.** At the integrator's word, once the board was merged.

**What was built.** `tools/check-layout.mjs` and its `check:layout`
script, on `@fz/dev/layout`'s `checkPhaserLayout()`, after Snake's, Brick
Breaker's and Asteroid Breaker's: every shape and the smallest phone, then
the two turns, all at twice the pixels. The field is the board, `--across`
by `--down`, from the lintel's top to the band's bottom
(`data-field`), its placeholder `.placeholder .field`, measured as it
stands since its frame is an outline, the ring and the Ready card; the
panels are a deck shown both or neither (`data-panels`, `left` and
`right`, 172 CSS px at least). The game's own inspection holds the unit to
24 CSS px at least; works the shape out from the room (`data-room`) as
`fieldShape()` does and holds the unit, the depth (`data-depth`), the
floor's band (`--band`) and the lintel (`--lintel`) to it; holds the field
inside its room, filling its width where it is deeper than 11 rows and its
height where it is 11, within a device pixel a cell; shows the panels
wherever 184 CSS px are spare each side, and nowhere else; and holds the
wall on the row a level opens on at the field's depth (`data-wall`). The
game's `AGENTS.md` names the script and its command, and drops T1 from
what is still to come, and `frontend/AGENTS.md`'s Check the Layout names
Brick Fuzz Pop among the games that have one and turn the phone.
`BoardCardComponent`'s doc now says the board, not the app, takes the
focus back as a card's button goes on.

**Choices the plan didn't make.**

1. **The wall after a turn.** The plan says "the wall where it was, the
   same rows from the floor". Over the real board the wall moved, 7 rows
   from the floor upright and 5 on its side: every page opens on a level
   with no round played, which the rules' `takeDepth()` begins again on a
   depth the field takes, the wall where that depth opens. So the check
   holds the wall to the row the level opens on at the field's depth
   (`thirdsOf()`'s `opensOn`) while the level waits for its first shot,
   and fails a page that opens on anything else. Holding a level under way
   to its rows needs a kept run taken up, which T2's capture sets up (C9);
   the check can take it up then.
2. **The resize of a pixel at 2× on a small phone on its side.** Over the
   built board, recorded from the page as it loads, the board writes its
   room once, 480 × 296 CSS px, and lays the field out once on it: a unit
   of 48 device px, 24 CSS px, the plan's floor exactly, 11 rows, no
   panels with 132 px spare. No resize of a pixel happens. A room a pixel
   taller would ask for a unit of 49, so the check allows none: between
   rounds the field must take the shape its room asks for and lie inside
   it, the CSS pixel `fieldMetrics()` lets a field overrun its room kept
   for a round in flight, which the check never sees.
3. **The band and the lintel are held each,** not only through `--down`,
   since spare room thickens the band first and then the lintel, and a
   band capped short leaves the same height with a thicker lintel.
4. **The constants are written into the inspection,** each naming the
   file it comes from, as Asteroid Breaker's are, since it runs in the
   page and imports nothing.

**Checks.** The game built alone (`yarn workspace brick-fuzz-pop build`),
and `yarn check:layout` holds at each shape and turn: roomy, phone
portrait, phone landscape, small phone portrait, small phone landscape,
smallest phone portrait, phone portrait turned on its side, phone
landscape turned upright; four runs alike. The workspace's `lint` and
`typecheck` pass, and the root's `yarn lint`.

**The mutation pass.** 11 mutants, each run through the check, the game's
built again for each of the board's. In the board and the field: the
board saying the field a row deeper, never showing the panels, saying the
wall a row higher; the band capped at 1.0 units; the lintel capped at 0.6;
and panels allowed at 100 CSS px. In the check: its unit floor at 25, its
panels' spare at 244, the opening row off by one, and the field filling
its room's width to the device pixel. These 10 were killed, each at the
shape it should be: the panels at 100 px on the small phone on its side,
the floor of 25 there too, the spare of 244 on the phone on its side, with
243 spare. The 11th, the lintel capped at 0.8, lived: no shape checked
thickens the lintel past 0.67 units (the phone upright), so it is the same
at every shape; `src/view/field/field_metrics.spec.ts` kills it, holding
the upright phone's lintel at 0.9 units at 1×.

**For the integrator.**

- **The plan still asks for the wall's rows through a turn:** `plan.md`'s
  "The layout check" ("after the turn and back, the wall where it was, the
  same rows from the floor") and `implementation-plan.md`'s T1 ("the wall
  the same rows from the floor after a turn there and back"). Suggested:
  "the wall on the row a level opens on at the field's depth, as a level
  with no round played begins again on a depth the field takes; and, once
  a kept run with a round played is taken up, the same rows from the floor
  after a turn there and back". And T2 gains: "the layout check takes up a
  kept run with a round played, through `LayoutCheck.before()`, and holds
  the wall's rows from the floor through both turns".
- **`board.component.ts`'s `wallRow` doc** says the check "holds the wall
  as many rows from the floor after the phone turns and back". Suggested:
  "which holds it on the row a level opens on at the field's depth while
  the level waits for its first shot". The art stream's file.
- **The game's `AGENTS.md` intro** still says the shell places "not yet the
  board, so the field isn't drawn and no run can be played in the page",
  and `app.component`'s line that "the board's place in the room is a
  marked slot until `<app-board>` is built"; the board has been placed
  since its merge, and `board/` lists the cards alone. The board's own
  entries are the art stream's to write; this commit only drops T1 from
  the intro's list.

**The review:**

1. **A missing `--band` or `--lintel` passed unseen,** a NaN comparing
   false, and the placeholder's own falls back to 0. Fixed: each says
   app-board gives none, which a board built without `--band` shows, at
   every shape.
2. **The plan still asks for the wall's rows through a turn,** and no one
   owns taking a kept run up. Left, for the integrator, above, with
   wording for the plan and for T2.
3. **The board's docs are untrue:** `wallRow`'s, and `--across` "for the
   layout check", which the check didn't read. Fixed the second: the field
   is `--across` by `--down`, as Asteroid Breaker's is. The first is the
   art stream's, above.
4. **The intro says the board isn't placed; `frontend/AGENTS.md`'s Check
   the Layout leaves Brick Fuzz Pop out; the command's entry says the
   field fills its room.** Fixed the second and the third; the first is
   above.
5. **The surviving mutant had no spec's answer.** Fixed: the metrics' spec
   kills it, as this entry says.
6. **The fill checks' thresholds went unexplained,** and restate what the
   shape's checks hold. Fixed: a comment says both.
7. **The header was wrapped raggedly.** Fixed.

### Q3's two findings: Try again at Enter, and "once"

**2026-11-10.** At the integrator's word, from the scene stream's check of
the shell in a browser.

**What was built.**

- **Try again is one press from the keyboard.** The result card still
  opens on its title, and the title now takes Enter as a press of the
  card's first button: Try again from the level after a loss, New game
  after the last. Enter acts as it goes down; its repeats, an Enter let go
  there that went down before the card opened, and Enter with Ctrl, Alt or
  Meta press nothing, and Space still presses nothing there. The
  template's comment and the game's `AGENTS.md` say so, and How to play's
  row for starting again now says the key above the right little finger's
  home key does so only once the result is put away.
  The app's spec presses Enter on a lost run's card and finds the level
  tried again and the board in focus.
- **How to play says the hot shot bounces off the floor "once".**
  `src/app/help/help_words.ts`'s `howOften()` says 1 as "once", 2 as
  "twice" and any other as its count, "3 times", since `@fz/core/format` has
  only `count()`, which says "1 time". The game's `AGENTS.md` names it.
- **At the integrator's word, with them:** the game's `AGENTS.md` no
  longer lists the rest of U1 or T1 among the packages still to come, and
  `LevelMark`'s `open` says the debug menu can open every level.

**Choices the plan didn't make.**

1. **Enter on the title, rather than the focus on Try again.** Brick
   Breaker's card opens on its first button, where Enter and Space both
   press it, and so does a Space still held from a launch, as it is let
   go. Asteroid Breaker's opens on its title, as this one did, where no
   key presses anything. The web-game-accessibility skill asks for
   `<fz-dialog>` and no hand-rolled trap or Escape, and says nothing of a
   result card's first key. So the card keeps its title first, which keeps
   the Space guard (a button acts as Space is let go, and Space lets a
   shot fly) and has a screen reader read the title first, and the title
   takes Enter, which acts as it goes down, so only an Enter pressed on
   the card tries again. No one holds Enter through a loss, and a held
   one's repeats are left alone in case one does.
2. **`(keydown)`, with the key checked in the handler,** not
   `(keydown.enter)`, whose `$event` Angular types as an `Event`, with no
   `repeat`, short of a cast. Enter with Ctrl, Alt or Meta is left to the
   browser, as the scene leaves it (`isShortcut()`); Shift and Enter tries
   again, which `(keydown.enter)` wouldn't, and costs nothing.
3. **"once" and "twice" are the help's own words,** beside it as
   `end_words.ts` is beside the result, rather than a word added to
   `@fz/core/format`, which every game shares, for one sentence. The
   triple shot's "2 more fuzzballs" stays in figures, as the help's other
   counts are.

**Checks.** The workspace's `lint`, `typecheck` and `test:coverage`
(`--maxWorkers=4`) pass, the result card and `help_words.ts` covered in
full, and the root's `yarn lint`. Not run again in a browser: the specs
press the keys with user-event on the card's `<dialog>`, the focus on its
title as it opens.

**The mutation pass.** 12 mutants over the card and the help: any key
pressing, a repeat pressing, Ctrl and Enter pressing, Enter pressing
nothing, Enter trying again after a win, the binding dropped, the binding
on keyup, the card opening without its title focused; `howOften()` saying
0 as "once", saying 2 as "2 times", saying 3 as "twice"; and the help
saying "1 times". 11 were killed. The binding on keyup lived, since no
spec let go of an Enter on the title; one now does, an Enter pressed
before the card opened, and kills it. Run again after the review, all 12
were killed. Moving `autofocus` to Try again is
killed by the Space spec alone, as well as by the focus spec.

**The review:**

1. **The key above the right little finger's home key does nothing on the
   open card,** though How to play's row for starting again names it
   beside Enter. Fixed in the help: "Enter, or, once the result is put
   away, the key above the right little finger's home key". The card
   takes Enter alone, a dialog's key, rather than the board's pause key
   too. `aria-keyshortcuts="Enter"` on Try again was left: it would be
   read on the button, where Enter presses it anyway, and not on the
   title, where it is news.
2. **The method's doc opened with three sentences, and the class doc's
   new paragraph garden-pathed and repeated the template's comment.**
   Fixed: the method opens with one sentence, a second paragraph for why
   a repeat is left alone, and the class doc's paragraph is gone, the
   template's comment and `AGENTS.md` saying it.
3. **The specs.** The Enter let go on the card is now pressed with
   user-event, before the card opens, and let go after; the held Enter's
   repeat keeps `fireEvent`, with a comment saying user-event can't make
   it. `title()` finds the card's heading by its level, not "Game over",
   and the Space spec is "presses nothing at Space, which lets a shot fly".
   Fixed.
4. **No spec pressed Enter on the card in the app.** Fixed: the app's spec
   does, through the real `GameService`, holding the level tried again and
   the focus on the board.
5. **`keyOnTitle()` was named for what calls it.** Fixed:
   `startAgainAtEnter()`.
6. **A ragged line in `AGENTS.md`, and "any other count as "3 times"".**
   Fixed.

### T2, but for level 18: the screenshots, and the layout check over a kept run

**2026-11-11.** At the integrator's word, once the user had played the feel
gate: T2's parts that don't need level 18.

**What was built.**

- **A run kept by the rules.** `src/testing/kept_run.ts`'s `keptRun()`,
  held as the rules are, begins a run at a level on a field of a depth,
  plays a round for each shot through `playRound()`, as a certificate
  keeps a shot, and returns it as `saveGame()` keeps it; it throws for no
  shots and for a shot that clears or loses the level.
  `src/testing/screenshot_api.ts`'s `SCREENSHOT_API` hands the scripts
  `keptRun()` over the game's levels, `formatPoints()`, what the game says
  of a shot the keys aim (`shotWords()`, through `describeShot()`) and
  `SAVED_GAME_VERSION`, typed by `ScriptRun`, `ScriptSavedGame` and
  `ScreenshotApi`, added to `src/testing/script_api.ts`.
  `tools/stored_run.mjs` loads it through Vite for both scripts, keeps the
  game's key and the layout check's run (`LAYOUT_RUN`), and stores a run as
  a page's storage holds it (`storedRun()`).
- **The screenshots.** `tools/capture-screenshots.mjs`, run by
  `yarn capture:screenshots`, on `runScreenshotScript()` as Brick
  Breaker's is: a run kept on level 9, Gatehouse, the last of Warm-up, on a
  field 11 deep, two rounds in by the first two shots of its certificate
  there; taken up paused at 1280 × 720 and 2× on Midnight blue, held to
  the run's score (`takenUpBoard()`), gone on with by the card's Resume,
  and its next shot aimed by the arrow keys, at 55 degrees and a charge of
  3, which the capture waits to hear the game say, missing the shot
  otherwise, as it does for a card still showing or a field laid out at
  another depth. `keepShot()` writes `preview.webp` and `thumb.webp`
  to `public/docs/screenshots/brick-fuzz-pop/`, where the site takes them
  in place of its fallback, and `index.html` names the preview as the
  link preview, as `frontend/games/AGENTS.md` asks. Its spec holds its
  command line and the run it keeps, as Asteroid Breaker's does.
- **The layout check over a kept run.** `tools/check-layout.mjs` checks
  every shape and turn twice: as T1 did, a level waiting for its first
  shot; then over a run kept by the rules, Hello, wall with a round played
  straight up, uncharged, which each page takes up paused (C9), holding
  its wall on the row the run kept it on, row 4, at every shape and
  through each turn, whatever depth the field takes. A problem of the
  second pass names its shape ", a run taken up".
- **The docs.** The game's `AGENTS.md`: the intro, the held files, the
  tools, the check's entry, a Capture Screenshots entry, and `kept_run.ts`
  and `screenshot_api.ts` among what the specs share. The board's
  `wallRow` doc says the check holds a run taken up to its row too.

**Choices the plan didn't make.**

1. **A run is kept as shots, a round each,** rather than Brick Breaker's
   bricks broken and worn or Asteroid Breaker's autopilot played for a
   time: a round is decided whole by its shot, so the shots are the run,
   and a certificate's line gives them.
2. **The run's depth is the script's,** 11, rather than read from a first
   page, as Asteroid Breaker reads its field's shape: a run with a round
   played, taken up on another depth, is moved onto it with its wall the
   same rows from the floor, so the depth only decides the picture, and
   1280 × 720 lays the field out 11 deep, so the run is shown as it was
   played. The capture holds the page to it, missing the shot where the
   field is laid out at another depth, which a made mutant of the check
   showed.
3. **Gatehouse, aimed by the keys.** Of the Warm-up levels, Pyramid two
   rounds in, its hot shot waiting, shows a wall mostly broken; Gatehouse
   keeps tough bricks, a row zapper and steel in view. Straight up, the
   guide was a column of dots under the one brick in its way; aimed at 55
   degrees and a charge of 3, it crosses the field and turns off the
   steel, and the meter shows. The keys are made events on the board,
   Phaser's keyboard target, each with its `keyCode`, as Asteroid
   Breaker's Space is, and the game's words for the aim, which it says as
   the keys change it, are what the capture waits for, as Asteroid
   Breaker's waits for a stray's.
4. **The check's kept run stands its wall on row 4,** a row under any a
   level opens on at any depth (5 to 9), so a page that dropped the run
   and laid the level out afresh can't pass by chance.
5. **`LayoutCheck.before()` is sent as its source and handed nothing,** so
   the call that keeps the run is made a function of its own from source
   (`new Function()`), as `Page.beforeLoad()` writes a call with its
   arguments: `keepRun()`, linted and type-checked, called with the run
   written in as JSON. Node never calls it. `@fz/dev/layout` handing
   `before()` its arguments, as `beforeLoad()` takes them, would need no
   function made from source, but is a change to a library every game's
   check runs on; it is below, for the integrator.
6. **Each pass says which run the page shows:** its `before()` sets
   `keptWallRow`, null for a level waiting or the kept run's row, and the
   inspection fails a page told nothing, so a second pass that lost its
   run can't pass as a second first pass.
7. **The second pass runs at every shape, not only through the turns,**
   so the Paused card and the panels are checked over a run under way
   too. The check takes about 18 s, twice T1's.

**Checks.** The workspace's `lint`, `typecheck` and `test:coverage`
(`--maxWorkers=4`) pass, `kept_run.ts` and `screenshot_api.ts` covered in
full, and the root's `yarn lint`. The game built alone, and
`yarn check:layout` holds at each shape and turn, as a level waits for its
first shot and over a run taken up: roomy, phone portrait, phone
landscape, small phone portrait, small phone landscape, smallest phone
portrait, phone portrait turned on its side, phone landscape turned
upright. `yarn capture:screenshots`, against the dev server on 9166 at
`[::1]`, where it listens: "Took up the run with a score of 1,510, and went
on with it, aimed at 55 degrees, charge 3", `thumb.webp` 15 KB,
`preview.webp` 90 KB.

**The mutation pass.** Run again after the review, with what it changed:
the stored run unversioned, the shot's words a degree off, the shown aim
at another charge, the run off its certificate, the page told a row off
the kept one, the run not stored, and the second pass keeping no run were
all killed, and the capture, a right arrow short, missed its shot: "the
game didn't say "55 degrees, charge 3"". The layout check's run on level 2
lived, an equal mutant: any level whose wall a round leaves under every
opening row serves, which `LAYOUT_RUN`'s spec holds rather than the
level.

Before the review: reading for mutants first found two: `landRound()`
in `keptRun()` changed nothing, since a round that ends its level throws
before it, so it went; and the level's boon reached no spec, so one keeps
Pyramid's hot shot after its second round jumps. Then 12 mutants through
the specs: a cleared level kept, no level started, the next start dropped,
nothing kept passing, the triple shot as the boon, another depth; the API
over fewer levels and its version off by one; the shown run unversioned,
its score unformatted, a round short, another port. All were killed. And
6 through the check, the game built again for each of its two: the kept
row a row off, a run taken up expected to play, the second pass keeping
no run (which, before each pass said which run it shows, passed as the
first), the first pass saying nothing; a start with rounds laid out
afresh on a new depth, and the saved run never taken up. All were killed,
each at the first shape, roomy. The capture's page code, Resume and the
keys, runs only in Chrome; running it is its check.

**For the integrator.**

- **All nine of `HELD_AS_RULES` exist now,** so `eslint.config.js`'s
  filter can go, as its comment says, and `phaserGameLayers()`'s check
  for a missing file is back.
- **`@fz/dev/layout`:** a `LayoutCheck` could take what the page stores
  (`stored`, as `setUpPage()`'s `PageSetup` has it), so a check takes up a
  kept run without a function made from source.
- **At Y1:** `RUN` takes level 18 and the first two shots of its
  certificate on 11 deep, `AIMING` is looked at again against the picture,
  and `index.html`'s alt text and the `AGENTS.md` entry follow.
- **Others' files:** `script_api.ts`, the proof stream's, gains three
  types and nothing else; `board.component.ts`, the art stream's, one
  line of `wallRow`'s doc; `package.json`, `index.html` and `AGENTS.md`
  are yours.

**The review:**

1. **`new Function()` builds `before()` from a string the lint never
   reads,** where `Page.beforeLoad()` takes arguments and only
   `layout.ts`'s `load()` drops them. Partly fixed: what the page runs is
   now `keepRun(key, stored, row)`, linted and type-checked, and only its
   call is made from source, with its arguments as JSON, as
   `beforeLoad()` itself writes one. The library change, `LayoutCheck`
   handing `before()` its arguments, is left: `@fz/dev/layout` is every
   game's, outside this stream's files; it is above, for the integrator.
2. **The capture could succeed without the aim it promises,** sleeping a
   fixed time and checking only the stage, the card and the depth. Fixed:
   it waits for the run to play before pressing, then for the game to say
   the aim (`shotWords()`, from `describeShot()`), and misses the shot
   without it; a card still showing has its own words.
3. **The key, the API's loading and the version stamp were copied into
   both scripts, the check's run was the specs' too, and its row's claim
   held only by a spec's copy; a broken API failed only after the first
   pass.** Fixed: `tools/stored_run.mjs` holds the key, the loading,
   `storedRun()` and `LAYOUT_RUN`, whose spec holds its wall under every
   row a level opens on; the check keeps its run before the first pass.
   The specs of `src/testing/` keep a run of their own, as a spec there
   can't import a script.
4. **"Round 5" was the certificate's length, and "the first two shots of
   its certificate" held by nothing.** Fixed: the spec reads the length,
   and `capture-screenshots.spec.ts` holds `RUN` to its certificate.
5. **`KeptGame` named two things in the workspace; `ScriptRun.shots` had
   no doc; `FIELD`'s doc named only Ready's card.** Fixed:
   `ScriptSavedGame`, a doc line, and Paused's card named.

### The bar's figures and the lintel's count: one condition

**2026-11-11.** At the integrator's word: the board's `lintelHidden`
repeated the bar's `fitsEveryFigure`.

**What was built.** `src/app/bar/figures.ts`'s `showsEveryFigure()` says
whether the game bar shows every figure, the level, the rows left and the
crew: from the width its actions keep their labels at, unless the window
is compact. The bar's `fitsEveryFigure` and the board's `lintelHidden`
both call it, the board hiding the lintel's count where the bar or Coming
next says it. The bar's class doc and the game's `AGENTS.md` say it.

**Choices the plan didn't make.**

1. **A function of the viewport, in the bar's folder,** rather than a
   signal of a service of its own: the condition is the bar's, and the
   board reads it as the bar does, each in a `computed()` that follows
   the viewport's signals through it. It takes only the two signals it
   reads, so its spec hands it two.

**Checks.** The workspace's `lint`, `typecheck` and `test:coverage`
(`--maxWorkers=4`) pass, `figures.ts` covered in full, and the root's
`yarn lint`.

**The mutation pass.** 5 mutants: a compact window fitting every figure,
every width fitting them, the bar always showing them, the board
ignoring the bar, and the board ignoring the panels. All were killed, the
last two by the board's specs of the lintel, which were there before.
Run again after the review, with the function renamed and the phone's
row added: all 5 killed, and a sixth, the condition true where exactly
one of compact and too narrow holds, is killed by the phone's row.

**The review:**

1. **The doc's first paragraph was two sentences.** Fixed: the second,
   which the signals' types say anyway, is gone.
2. **The bar's class doc said the figures follow the width alone,** where
   a compact window as wide as a desktop shows the rounds and the score
   alone. Fixed: "unless the window is compact (`showsEveryFigure()`)".
3. **No row of the spec was a phone,** compact and too narrow, so a body
   true where exactly one holds passed it. Fixed: an upright phone's row.
4. **The board's new import broke the file's order.** Fixed: after
   `../../view/`, before `../panels/`.
5. **The function and the bar's field shared a name,** reading as
   recursion. Fixed: the function is `showsEveryFigure()`; the bar's
   field, which its template binds, keeps its name.

### The rows waiting, at the end of a step's and a jump's words

**2026-11-11.** At the integrator's word. `src/rules/run/describe.ts` is
the proof stream's file, and the proof stream is on X2, so this changes
the step's and the jump's words and nothing else there.

**What was built.** `describeRound()` ends the wall's step and its jump
with how many rows wait over the ceiling, counted as the lintel counts
them: "The wall came down 1 row: 2 rows from the floor, 54 bricks to a
jump, 5 rows waiting." and "The lower two-thirds are clear. The wall
jumped 3 rows, with 5 rows waiting.", or "no rows waiting", before the
danger and the boon the next shot carries. A private `waitingWords()`
counts them, as `waitingRows()` in `src/app/panels/panels.ts` does, which
the rules can't import. The lintel's comment in `board.component.html`
now says the announcer gives the count as each step or jump ends.

**Choices the plan didn't make.**

1. **The rows end the step's sentence and the jump's,** after a comma,
   rather than a sentence of their own, so the danger and the boon still
   come last, where they are news. The jump's take "with", since "jumped
   3 rows, 5 rows waiting" reads as a list of two counts of the same rows.
2. **"no rows waiting" in the sentence,** where the lintel says "No rows
   waiting" alone.
3. **The count is written in the rules,** not taken from `panels.ts`,
   which is the shell's; a home for it in `src/rules/wall/` would let both
   share it, and is the proof stream's to give.

**Checks.** The workspace's `lint`, `typecheck` and `test:coverage`
(`--maxWorkers=4`) pass, and the root's `yarn lint`. The round's specs
end their words with the rows waiting; three more hold a step and a jump
with five rows over a field 11 deep, and a wall standing over the
ceiling, all of whose rows wait; and the board's lintel specs hold that
the announcer gives the lintel's count once a row waits.

**The mutation pass.** 6 mutants, all killed: no rows said as "0 rows",
no floor on the count, a wall standing over the ceiling counted as in the
field, a field a row deeper, the step without the rows, and the jump
without them. The over-the-ceiling one lived until the review asked for
its spec; play never stands a wall there (a level opens on row 9 at most,
on a field at least 11 deep, and its wall only comes down), but the
count holds as the lintel's does if it ever does.

**For the integrator.** `plan.md`'s accessibility words (~line 1270) give
the step and the jump as they were; with this, "Broke 4. The wall came
down 1 row: 5 rows from the floor, 7 bricks to a jump, 6 rows waiting."
and "The lower two-thirds are clear. The wall jumped 3 rows, with 6 rows
waiting. Next shot: hot shot."

**The review:**

1. _No spec holds the words and the lintel to the same count._ Taken:
   the board's lintel block plays until a row waits and holds the
   announcer's words to ", 1 row waiting.", where the lintel says "1 row
   waiting".
2. _The lintel's comment in `board.component.html` says the announcer
   doesn't count the rows._ Taken: it now says the announcer gives the
   count as each step or jump ends.
3. _`describeRound()`'s doc has a line past 80 columns, and the path in
   `waitingWords()`'s doc isn't in backticks._ Taken: rewrapped, saying
   the jump and the step each end with the rows waiting, and the path
   backticked.
4. _The over-the-ceiling guard has no spec, though the lintel's has._
   Taken: a wall of two rows standing from row 12 of a field 11 deep ends
   its words with "2 rows waiting.", which kills the mutant that lived.
5. _"jumped 3 rows, 5 rows waiting" reads as two counts of the same
   rows._ Taken: "The wall jumped 3 rows, with 5 rows waiting."
6. _`Array<string>(14).fill(…)` where the specs build rows with
   `Array.from()`._ Taken.

### Every file held as the rules are, and the list's filter gone

**2026-11-11.** At the integrator's word, which made `eslint.config.js`,
a contract file, mine to edit for this.

**What was built.** All nine files `HELD_AS_RULES` names exist, so the
config hands the list to `phaserGameLayers()` whole, dropping the
`existsSync()` filter and its comment: a name the workspace lacks fails
the lint again, as the library's check says. The list is exported, typed
`readonly string[]`, and `tools/eslint_config.spec.ts` holds each file it
names to every pattern of the rules' import fence, as errors, read from
the config ESLint works out for the file (`calculateConfigForFile()`).
`AGENTS.md`'s paragraph on the held files drops "from the commit that
writes each" and says what the spec holds and why;
`tsconfig.node.json`'s comment names the spec among those it checks.

**Choices the plan didn't make.**

1. **A spec of the config,** which no game has had. The mutation pass
   found why it is needed: the helpers' fence, a later block, sets the
   same rule, so a held file it didn't pass over would take its options in
   place of the rules', and lint would let it import the shell. The spec
   reads the config, rather than lints a file, so it runs in about a
   second.
2. **It sits in `tools/`,** not beside `eslint.config.js`, as no project,
   tsconfig or lint block takes a spec at the workspace's top, and
   `tools/` holds the specs that run in Node beside the scripts.
3. **It holds the held files to a rules file's patterns,** those of
   `src/rules/run/run.ts`, rather than to a copy of them, so a pattern the
   rules gain is asked of the held files too; and it throws where a file
   has no fence, or one only warning, so two empty fences don't hold.

**Checks.** `@fz/dev`'s and the workspace's `lint`, `typecheck` and
`test:coverage` (`--maxWorkers=4`), and the root's `yarn lint`, pass with
the next entry's change: the workspace's 105 files and 4891 tests, and
`sim`'s 150.

**The mutation pass.** 4 mutants, all killed: a held file named as one
the workspace lacks (lint refuses it: "names "src/testing/report.ts",
which the workspace doesn't have"); the helpers' fence no longer passing
over the held files (lived until the spec: lint passed a held file
importing the shell; now 9 of the spec's 9 fail); the solver left off the
list handed to `phaserGameLayers()` (the spec's solver row fails); and a
block after the others setting the fence to "warn" over `src/testing/`
(9 of 9 fail, "doesn't refuse … imports as errors").

**The review:**

1. _The spec passes a later block that turns the fence off or to "warn",
   as it reads the options alone._ Taken: it throws unless the rule's
   severity is 2, which the fourth mutant now holds.
2. _`AGENTS.md`'s sentence ties the spec to the last files listed, and
   "every fence" claims more than it checks._ Taken: a sentence of its
   own, "every pattern of the rules' import fence", and why; the spec's
   title says the same.
3. _The spec isn't beside the file it tests, and nothing says why;
   `tsconfig.node.json`'s comment names only the scripts' specs._ Taken:
   choice 2 above, and the comment names it.
4. _The exported list is a mutable `string[]`._ Taken: typed
   `readonly string[]`, as `build-sounds.mjs`' `RECIPES` is.
5. _The entry's checks pointed at another entry's, still empty._ Taken.

The reviewer also noted, outside this change, that Asteroid Breaker's
`eslint.config.js` has the same later helpers' block over its own held
files and no such spec; that is for the integrator.

### `@fz/dev/layout` hands a check's `before` its arguments

**2026-11-11.** At the integrator's word, from my note on T2: the layout
check built `keepRun()`'s call, its arguments written in, as a
`new Function()`, since a check's `before()` was handed nothing.

**What was built.** `LayoutCheck` takes what its `before` is handed as a
type (`LayoutCheck<A>`, `[]` by default), and `before` is either a
function handed nothing, as Snake's and Asteroid Breaker's are, or a
`BeforeLoad<A>`, `{ run, args }`, which `load()` hands
`Page.beforeLoad()` as its function and arguments, each sent as JSON.
`checkLayout()`, `checkTurns()` and `checkPhaserLayout()` take the type
from the check; `inspect()`, which reads only the board and the
inspection, takes those alone. Brick Fuzz Pop's `keepingRun()` returns
`{ run: keepRun, args: [key, stored, row] }`, so nothing builds a call
from source; `lib/dev/AGENTS.md`'s entry says what `before` may be.

**Choices the plan didn't make.**

1. **`{ run, args }` beside a bare function,** not `beforeArgs` beside
   `before`: one record ties the arguments' type to the function's, which
   a separate optional `beforeArgs` would leave open (a `before` that
   takes three arguments could be handed none), and a bare function stays
   as it is, so no other game changes.
2. **A type test** (`@ts-expect-error`), as `@fz/core`'s
   `testing.spec.ts` has, holding the arguments to what `run` takes; its
   runtime half says the page is sent what the check gives, the type the
   only guard.

**Checks.** `@fz/dev`'s `lint`, `typecheck` and `test:coverage`
(`--maxWorkers=4`): 16 files, 531 tests, `layout.ts` at 98.93% of
statements, its two lines unrun older than this; the workspace's and the
root's as above. Every game with a layout check built (Sudoku, Snake,
Brick Breaker, Asteroid Breaker, Brick Fuzz Pop) and the root's
`yarn check:layout`, at the integrator's word, holds each at every shape
and turn: Snake's with and without the arrows, Asteroid Breaker's with the
deck shown, and Brick Fuzz Pop's as a level waits for its first shot and
over a run taken up.

**The mutation pass.** 6 mutants, all killed: the record's arguments
dropped, the arguments reversed, the record never run, the bare function
never run and the two branches swapped (each by `layout.spec.ts`); and
`args` untied from `run`'s type (`unknown[]` beside a `run` of `never`),
which fails the typecheck at the type test's unused `@ts-expect-error`.

**The review:**

1. _`check-layout.mjs`'s comment on `keptWallRow` still says "as
   `before()` says"._ Taken: "as `keepRun()` or `keepingNone()` says".
2. _The specs match the source sent with patterns where `chrome.spec.ts`
   holds it exactly, and the type test's runtime half keeps a mistyped
   call's behaviour._ Taken for the first: each spec holds the source
   exactly, as `` `(${String(keep)})(...["a",2])` ``. Left for the second:
   the half says what a mistyped call does, that nothing but the type
   guards it, which a comment there now says.
3. _`inspect()` takes a type parameter it never uses._ Taken: it takes
   `Pick<LayoutCheck, "board" | "inspect">`.
4. _`keepingRun()`'s `@returns` repeats `keepRun()`'s parameters._ Taken:
   `BeforeLoad<Parameters<typeof keepRun>>`.

### plan.md's words for a step and a jump

**2026-11-11.** At the integrator's word, after the rows waiting were
added to those words.

**What was built.** `plan.md`'s accessibility section gives a round's
end as "Broke 4. The wall came down 1 row: 5 rows from the floor, 7 bricks
to a jump, 6 rows waiting." and a jump as "The lower two-thirds are clear.
The wall jumped 3 rows, with 6 rows waiting. Next shot: hot shot.", as
`describeRound()` now says them; the rest of the paragraph is rewrapped.

**Checks.** The root's `yarn lint`, its formatting and references
included, passes.

**The review:** nothing to fix: both examples match `describe.ts` as
built, and no other line of the plans quotes the old words. The one note,
that the entry lacked its checks, is taken above.

### D1's lists: Brick Fuzz Pop where the repository names its games

**2026-11-11.** At the integrator's word, D1's list pieces while T2's
level-18 part waits for Y1; the `brick-fuzz-pop-content` skill waits until
every kind is cataloged, after X1 and X2.

**What was built.** Brick Fuzz Pop is named wherever the repository lists
the games built here:

- `.agents/AGENTS.md`: the games served under `/play/<slug>/`, the
  Technology Stack's games ("Brick Fuzz Pop is too", drawn as Brick
  Breaker is, its rules free of any framework, pointing at its
  `AGENTS.md`), the layers of
  `AGENTS.md`, the workspaces' skills folders, and the apps' testing
  skills in "Writing Unit Tests" (`brick-fuzz-pop-testing`).
- `frontend/AGENTS.md`: the games' `AGENTS.md` under Layout, and the
  workspaces whose `test:coverage` runs Vitest with coverage, then its
  `sim` project without, as the two breakers' do ("as those three do"),
  which now says the second run may time a flight too.
- `frontend/games/AGENTS.md`: its opening list, and the games on a board
  drawn with Phaser whose `GameService` extends `RunLifecycle`. The port
  sentence keeps "which is being built", which Z1 removes with the badge.
- `README.md`: the games, where each is built, its dev server on 9006, and
  its page under `http://localhost:4200/play/`.
- `docs/operations.md`: where it is built and played, and that it began
  here.

**Choices the plan didn't make.**

1. **No "in development" in the lists,** but for the port sentence the
   integrator kept: the site says so beside its name, and Z1 removes the
   badge alone.
2. **The libraries' `AGENTS.md` and the shared skills' lists in a commit
   of their own,** after this one: the review found them, as Asteroid
   Breaker's list commit had changed them with the rest.

**Checks.** The root's `yarn lint`, its check of every backticked path and
link included, passes; `node .agents/link-claude-skills.mjs` linked this
worktree's skills, which git ignores, so the check warns of none.

**The mutation pass.** A path added broken
(`frontend/games/brick-fuzz-pop/.agents/skill/`) fails the reference
check ("no such path").

**The review:**

1. _Choice 2 is untrue: `angular-testing`, `phaser-core`,
   `web-game-accessibility` and `fuzzley-ui`, and `@fz/dev`'s,
   `@fz/game-ui`'s and `@fz/core`'s `AGENTS.md`, hold lists or counts of
   the games that leave Brick Fuzz Pop out, which Asteroid Breaker's list
   commit changed with the rest._ Taken, in the next commit, split out as
   the integrator allowed, with a review of its own; choice 2 says so.
2. _The Technology Stack's sentence repeats what "is too" already says._
   Taken: "Brick Fuzz Pop is too, its fuzzball aimed and charged at a wall
   that comes down".
3. _Three paragraphs left with short lines._ Taken: rewrapped.
4. _`frontend/AGENTS.md`'s second run "plays or lays out every level or
   wave", where Brick Fuzz Pop's also times a flight; and the entry's
   "runs Vitest twice, then its `sim` project" reads as three runs._
   Taken, both.

### D1's lists, continued: the shared skills and the libraries

**2026-11-11.** The second of D1's list commits, split out of the first,
whose review found these lists, as Asteroid Breaker's list commit had
changed them with the rest.

**What was built.** Brick Fuzz Pop is named with the other games in:

- `angular-testing`: its shell among the Angular workspaces, its testing
  skill among the apps', and its projects and `sim` run beside the
  breakers'.
- `phaser-core`: five games built on `@fz/phaser`, not four, it baking its
  bricks and fuzzballs into one atlas (`bakeWallAtlas()`); four games
  fenced by `phaserGameLayers()`; and its scene's spec, of one aimed with
  keys, the mouse, the wheel and fingers, among the worked examples.
- `web-game-accessibility`: its `AGENTS.md` among the workspaces', and its
  board among those that move by themselves: its application the field
  alone, named for the game and the level; started by a shot let fly;
  paused by P or Escape, its Space letting a shot fly; and its pace, two
  speeds of a flight, long flights sped up or not, and every flight
  fast-forwarded or skipped.
- `fuzzley-ui`: the games whose boards Phaser draws, its bricks and its
  friends in `@fz/phaser/color`'s shared inks, and its contrast spec among
  those that hold what a game draws in every palette.
- `phaser-canvas-performance`: the painters that take `Turns`.
- `frontend/lib/dev/AGENTS.md`: its dev port, 9006; the games that give
  `angularTests()` their projects, twice, a `sim` project timing a flight
  too; the games `checkPhaserLayout()` checks; and `@fz/dev/report`'s
  table, a level at each depth.
- `frontend/lib/game-ui/AGENTS.md`: the `GameService`s on `RunLifecycle`.
- `frontend/lib/core/AGENTS.md`: the `GameService`s numbered by
  `RunNumbers`, its `RunStart` taking the run's id but no seed, as its
  rules draw nothing at random; and the painters that take `Turns`.

**Choices the plan didn't make.**

1. **`@fz/core`'s sentence says how Brick Fuzz Pop differs,** rather than
   counting it among the games whose `RunStart` extends `RunNumber`,
   which its own doesn't: it numbers its runs but keeps no seed.

**Checks.** The root's `yarn lint`, its reference check included, passes.

**The mutation pass.** As the last entry: a path written wrong fails the
reference check.

**The review:**

1. _`@fz/core`'s "takes its id alone" is false: its `RunStart` has a
   level and a depth too._ Taken: "takes the run's id but no seed", here
   too.
2. _`@fz/dev`'s first sentence on `angularTests()`'s projects leaves it
   out, and says `sim` only plays or lays out levels or waves._ Taken:
   named, "or time a flight" added.
3. _`fuzzley-ui`'s step 7 names every Phaser game's contrast spec but
   its, and its friends take the shared fuzzball inks._ Taken, both.
4. _`phaser-core`'s worked examples of scene specs leave it out._ Taken.
5. _`web-game-accessibility`'s section on a board that moves by itself
   leaves it out of every bullet._ Taken: its board, what starts it, its
   pause keys and its pace, and its application the field alone.
6. _`@fz/dev/report` names only the breakers' reports._ Taken: "at each
   speed or depth", Brick Fuzz Pop's `report:levels` beside Brick
   Breaker's.
7. _`@fz/core`'s and `phaser-canvas-performance`'s sentences on `Turns`
   count only the breakers' painters._ Taken, both.
8. _Four paragraphs wrapped unlike their neighbours._ Taken: rewrapped at
   80 columns, with the paragraphs the fixes above touched.
9. _The entry: "which its doesn't", and what was built and taken._ Taken.

The fixes follow the review's own words but for the pace, so they had no
second review.
