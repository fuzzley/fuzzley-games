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
