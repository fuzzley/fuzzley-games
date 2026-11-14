# Stream F's log

Stream F builds the feel and the sound, as `../implementation-plan.md` §6
says, in the worktree `/home/dev/Projects/personal/bbu/F` on the branch
`bbu/F`. Each package has a heading, each commit a dated entry. Paths are
relative to `frontend/games/brick-breaker/` unless they start with
`frontend/` or `docs/`.

## F1. The flourishes that need no new art

The branch was rebased onto the integration tip (bfc1a8c8, K1's keys and
gates) as the package began.

### 2026-11-14: the streak's notes go up a pentatonic scale

What it does:

- `detuneOf()` (`src/view/effects/effects.ts`) raises a broken brick's
  sound a note of a major pentatonic scale for each brick of its streak
  before it: 0, 2, 4, 7, 9, 12, 14, 16 and 19 semitones, then held at 19,
  an octave and a fifth (1900 cents), where it rose a semitone a brick up
  to a fifth. The paddle starts the scale over, as it ends the streak
  (`endStreak()`), so the next brick broken is the scale's first note.
- `effects.spec.ts` holds the nine notes and the cap; the scene's spec
  hears a fifth brick at 900 cents.
- `AGENTS.md`'s `src/view/effects/` says the scale.

- The notes are one list, `STREAK_NOTES`, whose last is the cap, so the
  top note is on the scale by how it is written.

Checks: the workspace's lint and typecheck pass, and its tests, 59 files
and 2132 specs, in 14.3 s; the root's lint passes.

Review:

1. The scale and its cap were two facts that had to agree (the notes worked
   out from the scale and an octave, cut off at 1900 cents written apart).
   Fixed: the nine notes are one list and the last holds, as above.
2. +1900 cents plays the `broken` bloop at about three times its rate, a
   third as long; past Phaser's documented ±1200 detune, which Web Audio
   doesn't clamp. Kept, as the plan settles the octave and a fifth; the
   doc comment says the range is passed on purpose. Heard in the browser
   check (below); what it sounded like is noted there, for F3's voices.

### 2026-11-14: shards fade and dim as they fall, over 350 ms

What it does:

- A broken brick's shards fly for 350 ms (`SHARDS_MS`, from 420), and as
  they fall they fade, as before, and dim: each one's tint runs from its
  brick's color toward the field's (`shardTint()`,
  `src/view/effects/flourish.ts`), ending at 30% of the brick's color over
  the field's (`SHARD_DIMMED`), so a shard loses the contrast a ball keeps.
- One emitter throws every brick's shards, as before. Each shard is a
  `Shard`, Phaser's particle with the color it was thrown in
  (`particleClass`), and the emitter's `tint` takes custom `onEmit` and
  `onUpdate` callbacks, made once, which give a shard its brick's color and
  dim it by its share of life. Phaser's own `color` ramp couldn't do it: a
  ramp is the emitter's, so every shard flying would take the newest
  brick's colors.
- `EffectsPainter` takes the palette as it is made and as the atlas is
  baked again (`refresh()`), for the field's color the shards dim toward.
- The scene's spec reads each shard's tint and alpha (`shardsOf()`), and
  holds the shards fading and dimming toward the field halfway through,
  still as the field is laid out again, toward a new palette's field, gone
  once their time is up, and two bricks' shards each in their own color.
- `AGENTS.md`'s `src/view/effects/` and `EffectsPainter`.

Choices where the plan was silent:

- "Dim" is toward the field's color, not toward black: in a light palette
  the normal ball is the text's dark color, so shards darkening would look
  more like it, not less. Toward the field, a shard loses its contrast in
  every palette.

Checks: the workspace's lint and typecheck pass, and its tests, 59 files
and 2141 specs (the next commit's untracked specs aside); the root's lint
passes.

Review, first round (of a pool of twelve emitters, one a brick, each with
its own `color` ramp, and the scene writing the paint context before the
events played):

1. Twelve emitters were too few for 350 ms: a blast goes off 100 ms after it
   breaks, so Fuse's chain breaks some twenty bricks inside a shard's life,
   and an emitter taken again killed shards mid-flight. Fixed by going back
   to one emitter, with no cap, each shard keeping its own color (above).
2. A layout's `updateConfig()` reloaded every op from a cloned config, so
   the ramps went white and every shard flying turned white. Fixed by the
   same change: the `tint` op's callbacks survive a reload; a spec lays the
   field out again while shards fly.
3. The dimming spec passed with no shards alive (`every()` of nothing).
   Fixed: it counts them.
4. `shatter()` allocated a config for each brick. Gone with the pool.
5. `shatter()` took the context while `ring()` and `fade()` didn't, and two
   lines of the shared scene moved. Fixed: `shatter()` keeps its signature
   and the scene its order; the painter takes the palette as the paddle's
   does.

The fix reshaped the change, so it was reviewed again.

Review, second round:

1. No spec held one brick's shards to its own color as another broke: both
   throws were read before the first shards were dimmed again, so a
   painter tinting every shard from the newest brick still passed. Fixed:
   the spec reads them a quarter of their time on and holds each shard to
   `shardTint()` of its own brick's color at its own share of time, and
   fails with that bug put back. Phaser keeps the shards alive in no fixed
   order, so the spec reads them oldest first. The fade, relayout and
   palette specs hold each tint exactly too.
2. The new-palette spec had no count. Fixed: it counts the shards.
3. `AGENTS.md` said only the paddle's painter matches a bake, and "from its
   brick's mostly" read wrong. Fixed both.
4. The `Shard` doc comment was a noun phrase, and the painter's next color
   shared `Shard.thrownIn`'s name. Fixed: a sentence, and `nextColor`.

### 2026-11-14: a tail behind the ball in a streak

What it does:

- While the field is in a streak, each ball in flight draws a tail where
  motion is welcome: a dot at each of its last places, half a unit apart
  (`TAIL_GAP`), four dots at the first step (×2, a streak of 5), six at the
  second (×3, 10) and eight at the third (×4, 20), `tailLength()` in
  `src/view/effects/tail.ts`, by `streakTier()`
  (`src/view/effects/streak.ts`). Each dot back is fainter and smaller
  (`tailAlpha()`, `tailScale()`), in the balls' color. The paddle ends the
  streak, so the tail goes there; a ball on the paddle or out of play lays
  none.
- `Trail` keeps a ball's places on records made once, laying one at each
  gap the ball goes, however often it is drawn, as the fire ball's embers
  are laid, and starting afresh where the ball jumps farther in a frame than
  one at twice Fast's top speed goes in the longest frame (moved, not
  flying). The place within a gap of the ball lies under it, so a tail's
  dots are the places before it.
- `TailPainter` (`src/scene/painters/tail_painter.ts`), in a layer of its
  own, `tails`, just behind the balls (`src/view/field/layers.ts`): eight
  dots for each ball the field may hold, made once.
- The dot is a frame of the atlas, white, which the painter tints: a new
  file, `src/view/art/streak_art.ts` (`STREAK_FRAMES`, `streakArt()`), and
  one line of `art.ts`'s `atlasFrames()`, which adds its frames.
- Specs: `tail.spec.ts` (the trail, the lengths, the dots' fade),
  `streak.spec.ts` (the steps and tiers), `streak_art.spec.ts` (the dot in
  the atlas), `layers.spec.ts` (the layer), and the scene's spec, which
  flies a ball across in each streak and reads the dots: their count, their
  places, their fade and color, a second ball's tail of its own, the dots
  following the ball as it is drawn, and none once the paddle ends the streak,
  the ball rests on the paddle, or motion isn't welcome, and a new level's
  ball starting no tail from the last level's places.
- `AGENTS.md`: `streak.ts`, `tail.ts`, `streak_art.ts`, `TailPainter`, and
  the tail among what motion's absence leaves out.

Choices where the plan was silent:

- A tail starts at the multiplier's first step, not at the streak's first
  brick, so a ball shows one only once its streak scores more: a medium
  dose, and the steps the plan's "longer at each step" counts.
- The lengths are a share of eight, by the tiers reached:
  `round(8 × (tier + 1) / (tiers + 1))`, 4, 6 and 8, so a fourth tier would
  still end at eight.
- The dots are half a unit apart and half a ball wide at their nearest,
  fading from 0.6 toward nothing and shrinking toward 40%.
- The tail takes the balls' kind's color, as the ball's body does
  (`palette.balls`), not a friend's ink; L6 may tint a friend's tail by
  its ink.
- L3 draws the fur by the streak's tier; `streakTier()` is there for it.

Added to other streams' files: `art.ts` (an import and `...streakArt()`
at the end of `atlasFrames()`), `src/view/art/streak_art.ts` (new, in L's
folder), `bricks_scene.ts` (the painter, its place in the list, its reset).

Checks: the workspace's lint and typecheck pass, and its tests, 62 files
and 2182 specs; the root's lint passes.

Review:

1. The scene's specs read only the first ball's tail, and none moved the
   ball between its last place and its next, so a painter following one
   ball for all, or dropping the interpolation, passed. Fixed: a spec flies
   a second ball and holds every tail's count; another draws the ball at
   half a frame and holds the nearest dot a gap behind it. Each fails with
   its bug put back.
2. `TAIL_LEAST`'s comment called it the farthest dot's size; it is the size
   the dots shrink toward, one past the farthest. Fixed the comment.
3. `DOT_RADIUS` was called a width and was a bare 0.18. Fixed: half of
   `BALL_RADIUS`, called a reach.
4. The jump was measured from the last place laid, against 3 units, so a
   long frame at a fast ball's speed wiped the tail. Fixed: measured from
   where the trail last followed the ball, against as far as twice Fast's
   top speed goes in the longest frame (9 units); a spec holds a fast ball's
   long frame laid.
5. Small items, each fixed: `Trail.length` is a getter; `@throws` is on
   `placeOf()`; `tailLength()` counts `STREAK_STEPS`; the layer and the
   scene's painter are `tails`, the painter's records `byBall`; the log's
   jump; a spec's name.

### 2026-11-14: a streak's step, a ring about the ball and the count beside it

What it does:

- A brick broken as it takes the streak to a step of the multiplier (5, 10
  and 20, `STREAK_STEPS`) calls for a new flourish, `"streak"`, beside its
  shards (`effectsOf()`, `isStreakStep()`), so none plays where motion
  isn't welcome. It plays over 300 ms (`STREAK_MS`): a ring about the ball
  in flight nearest the brick (`nearestBall()`), spreading from 40% of its
  widest, fast then slowing, as it fades (`streakRingScale()`), and the
  streak's count beside the ball, above it and to its right, or to its left
  by the right wall, or below it by the top (`countCorner()`), whole for
  half its time and then fading (`countAlpha()`). Both follow the ball as
  it is drawn, and a new step takes the place of one still playing.
- `StreakPainter` (`src/scene/painters/streak_painter.ts`), in a layer of
  its own, `streak`, between the tails and the balls: the ring, an atlas
  frame (`STREAK_FRAMES.ring` in `streak_art.ts`), tinted as the balls are,
  and a Phaser `Text` for each step's count, made once.
- The scene plays the flourish, resets the painter on a new field, and the
  painter writes its counts again at each bake (`refresh()`).
- `detuneOf()` reads its notes with the top note as the fallback, which
  left no branch the specs can't reach.
- Specs: `effects.spec.ts` (which breaks step, and none without motion),
  `streak.spec.ts` (`isStreakStep()`, `countCorner()`, `nearestBall()`),
  `flourish.spec.ts` (the ring's and the count's curves),
  `streak_art.spec.ts` (the ring's frame), `layers.spec.ts`, and the
  scene's spec: the ring about the ball in its color, each step's count
  beside the ball in whole pixels, the count's colors, a new palette, the
  ring spreading and both fading and hiding, following the ball, nothing
  between steps, the newest count alone, the page's font loaded, none
  without motion, and none after a new level.
- `AGENTS.md`: `effects.ts`, `streak.ts`, `flourish.ts`, `streak_art.ts`,
  `StreakPainter`, its `refresh()`, and the step among what motion's absence
  leaves out. The repository's `phaser-text-and-bitmaptext` skill, copied
  from Phaser's package as `phaser-core` says, and listed there.

How the digits are drawn: a Phaser `Text` in the page's font, the
family the canvas inherits (`getComputedStyle()`), Figtree on the site, bold.
The game's canvas is drawn a pixel to a device pixel, so a `Text` written
at its size in device pixels (1.1 units), at its default resolution of 1,
with its origin at its top left corner and its place rounded to a whole
pixel, shows each of its pixels as one: crisp, with no texture scaled. Each
step's count is written once, as the scene is made, at each bake (a new
unit or palette), once more when the page has loaded the font, as a canvas
writes in a fallback rather than wait for one, and again only for balls of
another kind; a step played writes nothing. Atlas digits would have meant
ten glyphs drawn in shapes in L's `art.ts` and a count laid out by hand;
the page's font is the one its words and the panels are written in. The
count is outlined in the balls' outline color, as a ball is, so it reads
over the bricks and the field in every palette.

The scene reads the font itself, from its own canvas and the page's font
set, where Asteroid Breaker's board reads it and hands its scene the family
through an option: here that would add an option to the shared
`BricksSceneOptions` and a font loader to the board, both other streams'
files, for what the scene can do alone. If a third game needs it, the two
ways can be lifted into one in `@fz/phaser`.

Where R3 and P3 hook in:

- R3's `Level.mark` reaches the view through the field (a `mark` on
  `FieldView`, from the level). `effectsOf()` already takes the field, so
  `isStreakStep(streak)` becomes `isStreakStep(streak, field.mark)`, true at
  the mark too, and the event plays the same `"streak"` flourish.
- `StreakPainter.counts` holds a `Text` for each step, keyed by its streak,
  made once. The mark changes with the level, so R3 adds a slot of its own
  beside them, a `Text` made once with the others, written with the mark
  as each field starts: the scene's `startField()` calls
  `this.streak.reset()`, which takes the field to do it (`reset(field)`,
  and the call changed with it). `play()` then takes the mark's `Text` for
  a streak at the mark (`field.mark`), else `counts.get()`; a streak at
  neither already finds none and plays the ring alone. A mark on a step
  needs no second count.
- P3's stars beside the ball at the mark go in the same painter, beside
  the count (`countCorner()` says where).

Choices where the plan was silent:

- The count is the streak's length, 5, 10 or 20, not the multiplier: the
  plan calls it the count, and the bar shows the multiplier.
- The ring and the count take the balls' kind's color, the count outlined
  as a ball is; the ring reaches three times as far as a ball.
- With no ball in flight (lost in the same step), the ring stays where the
  brick was hit.

Checks: the workspace's lint and typecheck pass, and its tests, 65 files
and 2309 specs; the root's lint passes.

Added to other streams' files: `bricks_scene.ts` (an import, the painter's
field, its making, its place in the list, the flourish's case, its reset),
`src/scene/painters/streak_painter.ts` (new, among L's painters),
`src/view/art/streak_art.ts` (the ring's frame, in my file in L's folder),
`.agents/skills/phaser-core/SKILL.md` (the text skill listed, and gone from
the ones not copied), and the new `.agents/skills/phaser-text-and-bitmaptext/`.

Review:

1. The count was always written in a normal ball's color while the ring
   took the balls' kind's, and the log said both did. Fixed: the count is
   written again in the kind's color when it differs, once a kind; a spec
   steps with a fire ball.
2. The font's `.catch()` swallowed errors from the rewrite too. Fixed: only
   the load's rejection is ignored.
3. The font spec cleaned up after its `expect()`, and counted calls. Fixed
   the cleanup, with `onTestFinished()`. Kept the spy: a style's `metrics`,
   the state suggested instead, isn't in Phaser's types, so the spec reads
   which styles were measured again, and holds them to the counts'.
4. The log said the page's font matched the bar's figures, which are in
   the mono font, and didn't say why the scene, not the shell, reads the
   font as Asteroid Breaker's board does. Fixed in the log (above).
5. The R3 hook needed `reset(field)` and a slot for the mark spelled out.
   Done above.
6. The log didn't list the new painter among L's or the ring in
   `streak_art.ts`. Listed.
7. Small items, each fixed: `STREAK_RING_RADIUS`, three times
   `BALL_RADIUS`; `tail.ts` takes `FieldPlace` from `streak.ts`; the
   effects spec's step without motion passed for any event and is gone (the
   scene's spec holds it); the spec's imports in order.

### 2026-11-14: the last brick's hit holds before the clear's chord

What it does:

- The level's clearing calls for a new flourish, `"hold"`
  (`EVENT_EFFECTS.cleared`). Where motion is welcome, the scene notes when
  it held, and for 120 ms (`HOLD_MS`) the time the flourishes run by stands
  still (`flourishTime()`), so a pop, a ring, a fade or a streak's step in
  play stops where it is, and the shards' emitter stops too
  (`EffectsPainter.hold()`, by `isHolding()`); then all of it goes on from
  where it stood. The field itself already stands still once cleared.
- The clear's chord waits out the hold its event calls for
  (`soundDelayOf()`, from the event's effects), kept in a `DelayedSound`
  the scene hands to the frame's sounds once its time comes, so the last
  brick's note is heard alone first. A chime the shell calls for while the
  chord waits (a life the points brought in the same frame) is that chord,
  so it plays once, after the hold. A new field started while the chord
  waits (without motion the cleared card opens at once) plays it at once.
- Specs: `effects.spec.ts` (the clear's hold, the sounds' delays,
  `DelayedSound`), `flourish.spec.ts` (`flourishTime()`, `isHolding()`),
  `timing.spec.ts` (the cleared card still waits out the hold and the
  shards, as does a won run's result), and the scene's spec: the last
  brick's shards held then flying, a ring held then spreading, the chord
  after the hold with and without motion, one chime after the hold with a
  life, and the chord played at once as a new level starts during its
  wait. The
  spec that throws two bricks' shards keeps a third brick, so its level
  doesn't clear and hold them.
- `AGENTS.md`: `effects.ts`, `flourish.ts`, `timing.ts`, the scene's hold
  and chime, and the hold among what motion's absence leaves out.

Choices where the plan was silent:

- Without motion, nothing holds (nothing moves to hold), but the chord
  still waits its 120 ms: a sound plays either way, and the gap keeps the
  last brick's note apart from the chord in both. The cards don't wait for
  it: without motion the cleared card opens at once, as before.
- A fire ball's embers are `BallPainter`'s, L's, and keep drifting through
  the hold; the ball itself stands still, so they are few.

Checks, after the review's fixes: the workspace's lint and typecheck
pass, and its tests, 65 files and 2345 specs; its coverage of `pure` and
`dom` holds the floor (all files 99.46% of statements, 97.4% of branches,
99.71% of functions, 99.91% of lines; the rules and the view whole); the
root's lint passes.

Changed in other streams' files: `bricks_scene.ts` adds the hold's and
the chord's fields, a method that hears or keeps a sound, the flourish's
case and their reset, and changes three lines: the flourishes' time is
`flourishTime()`'s rather than the frame's, an event's sound goes through
that method, and the shell's chime is heard only while no chord waits.
These are the hold itself; an addition alone couldn't change the time
every painter reads. `src/scene/painters/painter.ts`: `PaintContext.now`'s
doc comment, which said the scene's time, says the flourishes' time.

Review:

1. Without motion the cleared card opens at once, so a player pressing on
   within 120 ms started the next field, which dropped the chord still
   waiting. Fixed: a new field plays a waiting chord at once
   (`DelayedSound.playDue(Infinity, …)`, and `clear()` gone); the spec runs
   without motion.
2. The one-chime spec would pass with the shell's chime played at once and
   the chord dropped. Fixed: it holds no chime during the hold and one
   after.
3. The wait was a check of the event's kind, apart from the record that
   calls for the hold. Fixed without a new field on the record:
   `soundDelayOf()` reads the event's effects, and a sound waits wherever
   its event calls for a hold.
4. `PaintContext.now`'s and the effects painter's comments said the
   scene's time, and `HOLD_MS`'s said every flourish stands still, where
   the camera's shake and a fire ball's embers run on. Fixed all three.
5. Small items, each fixed: the effects spec's imports in order; the
   spec's setup parameter named `each`, as the file names it; the timing
   specs read `clearedDelayMs()` and `resultDelayMs()` against the hold and
   the shards.

### 2026-11-14: the browser check

Served on 9304 and played in headless Chrome at 1280 × 800 and 2×, on
level 1, with the field's streak raised from the page (through Angular's
dev tools, the board's `GameService`) so each step came at the next brick,
and the paddle kept under the ball.

- At ×2 (a streak of 5): the ring about the ball, the count "5" above it
  and to its right, crisp in Figtree, 50 px at a 45 px unit, at whole
  pixels, four tail dots behind the ball, and the brick's shards in its
  blue, dimming.
- At ×3 (10): the ring, "10", six tail dots.
- The clear (the last brick broken from the page with the rules'
  `hitBrick()`): its six shards stood still for 124 ms and then fell; the
  last brick's note played at once and the chord 143 ms after the break,
  the first frame past the hold.
- With `prefers-reduced-motion: reduce` emulated, on level 2: a streak
  past 5 showed no ring, count, tail or shard; the clear threw no shards
  and the chord came 133 ms after the note.
- No error or warning in the console. The page was closed and the server
  stopped.
- Not checked: how the scale's top notes sound. Headless Chrome plays
  nothing to listen to; 1900 cents, nearly three times the sound's rate,
  is for F3 to hear.

## F3a. Friends' voices

The first half of F3, as the integrator split it: the voices of K1's kinds
now, Machines' (the portal's whoosh, the bumper's boing) after K3. The
branch was at the integration tip, 586d482f, as the package began.

### 2026-11-14: a voice for each of Friends' kinds, and the seeker's cue

What it does:

- Five new sounds, synthesized by `tools/build-sounds.mjs` as the ten are
  and named at the end of `SOUNDS`: `plate`, a clank, two clashing partials
  (523 and 1370 Hz) over a knock, lower, duller and briefer than steel's
  ring; `cage`, a rattle of five tinny ticks, settling; `key`, a bell's
  ding, 880 Hz under a 2.76× partial that tells it from the clear chord's
  notes, 0.36 s; `gates`, a low sweep rising 160 to 480 Hz under a soft rumble; and
  `seeker`, a soft flutter rising an octave from 880 Hz.
- `EVENT_EFFECTS` gives K1's and R2's events their sounds: `plated` the
  clank, `freed` the rattle, `opened` the sweep, `seeking` the flutter.
- `VOICES` in `effects.ts`: the kinds that sound in a voice of their own, a
  cage rattling as a hit bends a bar and a key chiming as it breaks. What
  each kind's hit and break call for is made once, by kind
  (`BRICK_EFFECTS`), so playing an event is one lookup and still makes
  nothing; a hit on a kind that never breaks rings as steel there, unless
  its voice says otherwise, a gate among them.
- `tools/build-sounds.mjs` exports its recipes (`RECIPES`) and folder and
  writes only when run, and takes Brick Fuzz Pop's `withBurst()`, which the
  hit and the blast are now written with, to the same bytes: the new
  sprite's first ten sounds are the old file's samples exactly, at the same
  places.
- `tools/build-sounds.spec.ts`, as Brick Fuzz Pop's: the recipes are
  `SOUNDS`, in order, none loops, and the sprite checked in is what the
  script writes now, to the byte. The sprite (`sounds.wav`, 122 KB to
  190 KB, 5.93 s, and `sounds.json`) is checked in, as before.
- Specs: `effects.spec.ts`'s events are a record keyed by every event
  (`VOICES_OF_EVENTS`), and every kind's voice another
  (`VOICES_OF_KINDS`), so a new event or kind fails to compile until its
  sound is written there: the "list of voices" the plan's §8 names. A field
  holding a brick of every kind (`EVERY_KIND`) plays each kind's hit, break
  and break at a step, and the specs fail with a kind's voice dropped. The
  scene's spec plays the last key broken at a streak of 3 (the chime at 400
  cents, then the sweep), a cage's first hit (a rattle) and its second (a
  bloop and a rattle as it frees its friend).
- `AGENTS.md`: `effects.ts`'s voices and `detuneOf()`'s range, the tools'
  spec, Make the Sounds, the `pure` project. `brick-breaker-content`: two
  checks in its table, a kind's voice, a trait's event and its sound, and
  the triggers. `brick-breaker-testing`: the sounds' spec in `pure`.

Choices where the plan was silent:

- **A hit on a plated brick knocks, as a brick's does.** Only the plate's
  underside clanks (`plated`); a hit from above or a side strikes the brick
  and takes a hit off it. So the ear tells a ball that did harm from one the
  plate turned back.
- **A cage's hit rattles too,** as it bends a bar; its freeing plays the
  bloop of any brick broken, along the streak, and the rattle as the friend
  leaves. Nest's friends "rattle" in the plan as they bounce in a ring;
  that is their motion, not a sound of its own.
- **A key's chime rises along the streak, as the bloop does.** A key is a
  brick broken, so it takes the streak's note, in its own voice, and the run
  stays a run. At the top note the chime is a third as long, 0.12 s. Its
  ring falls to a third of its start in 120 ms (a decay of 0.1 s), so a key
  that is a level's last brick has mostly gone as the clear's chord comes,
  as the bloop has.
- **The seeker gets a cue.** A soft flutter (peak 0.25, the lowest of the
  sprite's) as the paddle lends a ball the seeker. It fits "a
  medium dose": it plays at most once a lend, only in a level's last few
  bricks after three dry bounces, and at the paddle's own bop, so it colors
  a moment that already sounds rather than adding one; and it says what the
  turn, at 45° a second, shows slowly and L3's mark shows only to the eye.
- **The sounds' names** are the surfaces' and events' they belong to, as the
  ten's are (`steel`, `paddle`, `cleared`), not the kind of noise: `plate`,
  `cage`, `key`, `gates`, `seeker`. "Chime" is already `CHIME`, the clear's.
- **The gates' sweep rises,** where a lost ball's tone falls and a blast's
  boom drops, so an opening never sounds like a loss.

How loud, measured on the rendered sprite (peak; the loudest 30 ms, RMS):
hit 0.50, 0.219; plate 0.45, 0.157; cage 0.40, 0.109; key 0.40, 0.181;
gates 0.40, 0.214; seeker 0.25, 0.118. None is louder than the brick's
knock by either; the gates' sweep lasts longer (0.6 s, as a lost ball's
0.56 s), and sits low, where the ear hears less.

The streak's top notes, item 3 of the brief. In Phaser 4.2.1's source
(`node_modules/phaser/src/sound/`), the game's manager is
`WebAudioSoundManager` wherever the page has Web Audio
(`SoundManagerCreator`; the game's config sets no `audio`), and the headless
page reported it so. A play's `detune` goes into the marker's config;
`WebAudioSound.applyConfig()` sets `detune`, whose setter clamps nothing
and calls `calculateRate()`: `BaseSound.calculateRate()` makes
`totalRate = rate × manager.rate × 2^(detune / 1200)`, and
`WebAudioSound.calculateRate()` hands it to the source's
`playbackRate.setValueAtTime()`. The ±1200 is only in the doc comments.
`createAndStartBufferSource()` starts the source with the marker's
duration, which Web Audio counts in the buffer's seconds, so a faster play
still plays the whole sound and stops at its end, never into the next. The
HTML5 Audio manager, only for a browser without Web Audio, sets the
element's `playbackRate`, which keeps the pitch by default; no browser the
game runs in takes it.

In headless Chrome, on 9304, with Web Audio's `start()` and
`setValueAtTime()` watched from an init script, the scene's own
`SpritePlayer.playRisen()` asked for: `broken` at 0, 700, 1200 and 1900
cents, rates 1, 1.498, 2.000 and 2.9966, each from 0.61 s for 0.14 s; `key`
at 1900, 2.9966; the new four at 1. The playback rate's `maxValue` is the
float's largest. Rendered in an `OfflineAudioContext` at those rates, the
bloop's held note is 588 Hz, 1176 Hz and 1762 Hz (587 × 2.9966 is 1759, 3
cents off, the estimate's own error), lasting 0.14 s, 0.07 s and 0.047 s;
the key's ding, as first written (0.45 s, before the review shortened its
ring, which changes no pitch), renders at 3.002 times its own pitch at
1900 cents, in 0.15 s. So the top notes play at the pitch asked, with no clamp and no
fallback, and nothing in my files needed a fix. No error or warning in the
console; the page was closed and the server stopped.

Checks, after the review's fixes: the workspace's lint and typecheck pass,
and its tests, 67 files and 2670 specs, in 16.2 s; its coverage of `pure`
and `dom` holds the floor (all files 99.49% of statements, 97.52% of
branches, 99.72% of functions, 99.92% of lines; the rules and the view
whole, `effects.ts` among them); the root's lint passes.

Added to shared files: the scene's spec (`bricks_scene.spec.ts`), two specs
at the end of its sounds' first ones and `playWithoutBall` in its imports.
No other stream's file changed.

Review:

1. A `hit` voice in `VOICES` was ignored for a kind that never breaks, as
   `effectsOf()` rang steel before it read the voice, so a K3 kind's line
   there would compile and be dropped. Fixed: the steel ring is the default
   hit of a kind that never breaks, made once in `brickEffects()`, and a
   voice overrides it; `effectsOf()` is one lookup.
2. `AGENTS.md` and the script said a plate turns a bolt back; a bolt is
   spent there. Fixed both.
3. `EVENT_EFFECTS`'s doc named only steel's exception. Fixed: it names the
   voices too.
4. The cage's scene spec acted twice. Fixed: two specs, the second hit
   arranged after the first.
5. A key that is a level's last brick rang on into the clear's chord, its
   ring 45% at 120 ms. Fixed: a decay of 0.1 s and 0.36 s long, 30% at
   120 ms, less again along a streak.
6. `BrickVoice`'s doc was a noun phrase. Fixed: "Says which sounds…".
7. The spec "is shown a field that holds a brick of every kind" repeated
   what `cellOf()`'s throw reports for each kind. Dropped; two lines of
   `AGENTS.md` past the wrap were refilled.
8. `withBurst()` is now in both Brick Fuzz Pop's and Brick Breaker's
   scripts, the same. Left: lifting it into `@fz/dev/sounds` is a library
   change with Brick Fuzz Pop's sprite to hold, beyond this package's
   files; a follow-up for the integrator's list.

## F2. The paddle and the drop-in

The branch was at the integration tip, a139c929 (L3 with L5), as the
package began. After L3, stream F takes the paddle's, the balls' and the
bricks' painters for this package (§7.3).

### 2026-11-14: a ball squashes and the pad dips as they meet

What it does:

- The field's event for a ball meeting the paddle, `paddle` (recorded by
  `meetPaddle()` in `src/rules/field/travel.ts`, as a ball bounces off it
  or is caught), calls for two new flourishes, `"squash"` and `"dip"`
  (`EVENT_EFFECTS.paddle`), so neither plays where motion isn't welcome.
  The rules know nothing of them: the ball's circle and the paddle's edges
  still decide the bounce.
- Both last 90 ms (`MEET_MS`), deepest as the two meet, holding there a
  moment, then easing back to nothing (`meetDepth()`, a half cosine, in
  `flourish.ts`). At the deepest the ball is squashed as the art kit's
  still of the paddle giving draws it (`art/sheet-kit.mjs`, through
  `art/scene.mjs`'s `squash`): 1.28 times as wide, 0.7 times as tall, its
  middle dropped 0.35 of its radius, so its foot presses into the pad
  (`DEEPEST_SQUASH`, `squashAt()`, which writes a `Squash` made once). The
  pad dips a tenth of a unit (`padDip()`), as the plan and the kit's note
  say.
- `BallPainter.squash()` squashes the ball in play nearest where the two
  met, a ball held on the paddle too, as a catching paddle holds one
  (`nearestBall(…, "inPlay")`, `BallsTaken` in `streak.ts`); each ball and
  its eyes are scaled and dropped by their own squash, last, once the
  sight and the embers have taken the ball's place (`squashPicture()`).
- `PaddlePainter.dip()` dips the pad, the pale strip along the body's top,
  in whole device pixels (`dipOf()`), handed to `placePad()` as an argument
  of its own; the lip, the caps, the body, the hooks and the cannons stay
  where they are.
- A new field rounds the balls and raises the pad (`BallPainter.reset()`,
  `PaddlePainter.reset()`).
- Specs: `flourish.spec.ts` (the curve, the kit's squash at the deepest,
  round by the end, the dip's tenth of a unit), `streak.spec.ts`
  (`nearestBall()` taking a held ball), `effects.spec.ts` (the paddle's
  event's flourishes), `timing.spec.ts` (the plan's times: the shards'
  350 ms, the step's 300, the hold's 120 and the meeting's 90) and the
  scene's spec, whose `meetPaddle()` drops a ball onto the paddle and steps
  the rules till they record the meeting, throwing if they don't: the ball
  and its eyes squashed, a caught ball and its eyes dropped toward the
  paddle, round again after 90 ms, only the ball nearest squashed, a
  caught ball squashed, the pad dipped a tenth of a unit in whole pixels
  and the body still, the pad raised after 90 ms; neither without motion;
  and neither left over by a new level. Each fails with its bug put back
  (no squash or dip played, only balls in flight taken, the eyes left
  round, no drop, the eyes not dropped, no reset, motion ignored).
- `AGENTS.md`: `effects.ts`, `streak.ts`, `flourish.ts`, `timing.ts`, the
  two painters, and the squash and dip among what motion's absence leaves
  out.

Choices where the plan was silent:

- **Deepest at once, then back.** The scene plays the meeting a frame
  after it, and a ball leaves the paddle at 15 to 25 units a second, so a
  squash that grew to its deepest halfway would flatten the ball a unit
  above the paddle. Deepest as they meet, a half cosine back to nothing,
  reads as the knock.
- **The pad alone dips,** as the plan says, the pale strip sinking into the
  body; the body's top and the caps stay, so the paddle's edges, which
  decide the bounce, never seem to move.
- **A caught ball squashes too,** as it meets the paddle as much as a ball
  sent off does; the net's turn (`netted`) is not the paddle, and doesn't.

Added to other streams' files: `bricks_scene.ts` (the squash's and the
dip's cases in `flourish()`, and the paddle's painter's reset in
`startField()`), and lines of `AGENTS.md`.

Checks, after the review's fixes: the workspace's lint and typecheck pass,
and its tests, 70 files and 3020 specs; the root's lint passes.

Review:

1. The squash was the change's own (the ball's height less a tenth of a
   unit, keeping its area, about its middle), and the log called the plan
   silent, where the plan's kit draws it: `art/sheet-kit.mjs`'s "The paddle
   gives" squashes the ball to 1.28 by 0.7 and drops it 0.35 of its radius,
   so its foot stays on the face; about its middle, a caught ball's foot
   lifted off the dipping pad. Fixed: the kit's numbers and its drop
   (`DEEPEST_SQUASH`, `squashAt()`), the eyes dropped with the ball, and a
   spec of a caught ball and its eyes dropped toward the paddle.
2. The spec without motion, and the one rounding the ball again, would
   pass with no meeting at all. Fixed: `meetPaddle()` throws unless the
   rules recorded one, which holds every spec that uses it.
3. `MEET_DEPTH` was exported for nothing. Fixed: the dip's depth is
   `PAD_DIP`, the module's own, and the specs pin the plan's 0.1.
4. A spec compared a boolean. Fixed: `closeTo()`.
5. The plan's times held one row. Fixed: F1's 350, 300 and 120 ms too.
6. The ball painter called a slot `ball`, as `draw()` calls the record.
   Fixed: `slot`. `nearestBall()` stays in `streak.ts`, where F1 put it;
   moving it would change F1's file for a name.

### 2026-11-14: the bricks drop in a column after a column, and a key lands them

What it does:

- A level's bricks drop in a column after a column, left to right, over
  400 ms (`DROP_IN_MS`, from a row after a row over 360 ms and 45 ms more a
  row). Each column takes 160 ms of it (`COLUMN_DROP`, 0.4), each starting
  20 ms after the one to its left, the first at once and the last landing
  as the drop-in ends (`columnDropDone()`). A brick falls from two brick
  heights above its place (`DROP_IN_HEIGHT`), fast, then slowing, and fades
  in as it falls (`dropInHeight()`, `dropInAlpha()`, in `flourish.ts`), as
  the tween before did.
- It is an offset the brick painter adds to where it draws a brick, one
  call, `dropInHeight(column, done)`, in `BrickPainter.place()`, which puts
  each cell's image at its place each frame while the bricks drop in, and
  leaves them be once all stand at their places. The tween is gone: the
  drop runs by the flourishes' time (`PaintContext.now`), as F1's
  flourishes do, so landing the bricks is setting one number. `layout()`
  takes no layout now: it has the next frame put each image at its place,
  at whatever drop it has come to. K3's slide can add its own offset in
  `place()`, beside the drop, and keep `placed` false while it moves a
  brick, as its doc says: `place()` draws nothing once every image stands
  at its place.
- A key skips it: any key the scene hears, but a shortcut or a held key's
  repeat, lands every brick at once (`BrickPainter.land()`, from
  `press()`), whatever else it asks, as a launch, a push of the paddle or a
  pause.
- Where motion isn't welcome, no drop starts, and a new field lands any
  drop the last one left (`still()` lands too), so a player who turns
  motion off mid-drop sees the next level in place at once.
- The scene sets the flourishes' time again as a new field starts
  (`startField()`), as nothing holds there: after a clear's hold, that time
  ran 120 ms behind the scene's, and a drop begun by it jumped 120 ms on
  the next frame. `PaintContext.now`'s doc says so. The scene's
  `tweens.killAll()` went with the tween, the game's only one.
- Specs: `flourish.spec.ts` (every brick two units up and unseen at the
  start, the first column at once and the next after it, the columns in
  order at four points of the drop-in, the last landing as it ends and not
  before, all landed and whole at its end), `timing.spec.ts` (400 ms), and
  the scene's spec: a column after the one to its left, the last still
  falling 16 ms before the drop-in ends and landed as it ends, landed at
  once at a launch, a push of the paddle and a key the game doesn't use,
  still dropping at a shortcut and at a held key's repeat, still dropping
  on a new layout and landing at its places, standing at a new
  layout's places, a new level's dropping from its start after a held clear
  as it would after none, and, without motion, a new level's in place at
  once though the last level's still dropped. Each fails with its bug put
  back (the columns reversed, the last column landing early, no landing at
  a key, landing at a shortcut or a repeat, `layout()` doing nothing, the
  flourishes' time left behind, `still()` not landing).
- `AGENTS.md`: `flourish.ts`, `timing.ts`, `BrickPainter`, the keys, and
  the bricks in place at once among what motion's absence leaves out.

Choices where the plan was silent:

- **Columns overlap.** Thirteen columns one after another in 400 ms would
  each fall in 31 ms, a flicker; each falls in 160 ms instead, starting
  20 ms after the last, so the drop reads as a wave from left to right.
- **A column drops as one.** The kit's still of a level arriving
  (`art/sheet-kit.mjs`) staggers its rows too, lower rows first, with a
  speed line over each brick; its note, and the plan, say a column after a
  column, which is what is built. The fade and the two brick heights are
  the drop's before.
- **Any key lands them and still does what it asks.** The plan says "a
  key press"; a key swallowed by the skip would cost a launch. A shortcut
  is the browser's, so it lands nothing. A tap or a click doesn't land
  them, as the plan names keys: a ball launched by a tap reaches the bricks
  after they have landed.

Added to, and changed in, other streams' files: `bricks_scene.ts`
(`layOut()` and `startField()` calling the brick painter's `layout()` and
`dropIn()` as they are now, the flourishes' time set in `startField()`,
`press()` landing the bricks, and the tween's `tweens.killAll()` gone with
the tween), `src/scene/painters/painter.ts` (L's: a clause of
`PaintContext.now`'s doc), and lines of `AGENTS.md`.

Checks, after the review's fixes: the workspace's lint and typecheck pass,
and its tests, 70 files and 3041 specs; the root's lint passes.

Review:

1. A held key's repeats landed the drop: holding an arrow while pressing
   Space for the next level, the first repeat after the new field landed it
   though no key was pressed. Fixed: a repeat lands nothing, as it commands
   nothing; a spec holds it.
2. The scene's `tweens.killAll()` was dead once the tween went. Removed.
3. Specs that passed with the timing broken: the last column's "not
   before" was `closeTo(0)` at 0.99, which a last column landing early also
   passed, and the scene's check was 48 ms early. Fixed: the curve's spec
   holds the last column above its place at 0.99, the scene's 16 ms before
   the end, each failing with the columns' starts spread over 13 steps
   rather than 12. Booleans in assertions are gone: the heights are held to
   `dropInHeight()`'s, and the order to its sort, with the first column
   landed and the last not yet fallen halfway.
4. `COLUMN_DROP` and `columnDropDone()` were exported for nothing. Fixed.
5. K3 needs to know `place()` stops once `placed`. Said in `placed`'s doc
   and above.
6. Nits, each fixed: `PaintContext.now`'s doc, the painter's class doc
   (the bricks land as the drop-in ends too). The `flourishTime()` call in
   `startField()` stays, for one source of that time.

### 2026-11-14: the ball rings at the level's mark, as at a streak's step

What it does:

- `FieldView` reads the level's mark (`level`, `Pick<Level, "mark">`), as
  the rules' `Field` holds it, so the view needs nothing more from the
  scene.
- `isStreakStep(streak, mark)` is true at the mark too, so a brick broken
  taking the streak to the level's mark calls for the step's flourish,
  `"streak"`, beside its shards and its own sound (`effectsOf()`), and none
  where motion isn't welcome. It plays each time the streak comes to the
  mark, as a step does, though the star is won once.
- `StreakPainter` writes a `Text` of its own for the mark (`markCount`) in
  `reset(field)`, as each field starts, unless a step's count says it
  already: a mark of 5, 10 or 20 plays the step's count alone, writing no
  second. `play()` takes the step's count, else the mark's (`countOf()`),
  and the mark's count is styled, colored and written again once the font
  loads with the steps' (`texts`). Of the 40 levels, 33 have their mark on
  a step; the 6 at 15 and the 1 at 30 write their own.
- Specs: `streak.spec.ts` (a step at a mark of 30, 15 now among the
  streaks that aren't one, and a streak at marks of 15, 25 and 30 a step),
  `effects.spec.ts` (the step played at marks of 10, 15 and 25, and none at
  15 or 25 at the spec field's mark of 5), and the scene's spec: the ring
  and "15" at a mark of 15, the count in the balls' kind's color at a
  step and at the mark, a mark of 10 showing the step's count and not the
  mark's, each level's mark written as it starts (15, then 30), and no
  ring or count at the mark without motion; the palette's and the font's
  specs hold the mark's count with the steps'. Each fails with its bug put
  back (no mark in `effectsOf()`, `countOf()` ignoring the mark, nothing
  written at `reset()`, the mark's count taken before the step's, and
  `writeIn()`, `refresh()` or the font's rewrite missing the mark's).
- `AGENTS.md`: `frame.ts`, `effects.ts`, `streak.ts` and `StreakPainter`;
  the content skill's `mark`. The lines changed keep to the file's width,
  and the lines about them, other streams', stay as they were.

Choices where the plan was silent:

- **The count is the streak's,** "15", in the steps' font, color and
  corner, as the plan asks for the same flourish; a star or a word would be
  new art.
- **Written as a field starts,** not as the mark is reached, as writing a
  `Text` measures it anew, which the frame mustn't; a mark changes only
  with the level.
- **The fur stays at its tier.** The design's flourish table says a step
  lifts the fur, "the same at the level's mark"; the fur follows the
  multiplier's tier (L3's `STREAK_FUR`), and a mark of 15 or 30 falls
  inside a tier, so a lift there would need a fur that matches no
  multiplier. The implementation plan (F1's list) asks for the ring and
  the count at the mark, which is what plays.

Added to, and changed in, other streams' files: `src/view/field/frame.ts`
(owned by none: `FieldView`'s new member `level`, which the rules' `Field`
already has), `bricks_scene.ts` (the streak painter's `reset()`, F1's line,
handed the field), `src/scene/painters/streak_painter.ts` (F1's, among L's
painters: the mark's count, `countOf()`, `reset(field)`, the loops of
`refresh()`, `writeIn()` and the font's rewrite over every count, and the
docs of the class, the constructor and `play()`), the content skill's
`mark` line, and lines of `AGENTS.md`.

Checks, after the review's fixes: the workspace's lint and typecheck pass,
and its tests, 70 files and 3055 specs; with coverage, `dom` and `pure`, 67 files and 2815 specs,
the view's floor held (every view file this package changed at 100%); the
root's lint passes; Prettier passes on every file changed.

Review:

1. The log didn't say what this change, and the package's two before it,
   added to other streams' files. Fixed: a line in each of the three
   entries.
2. The spec of a mark on a step held visibility by position and didn't
   check that no second count was written. Fixed: it holds the counts
   shown by their text, "10" alone, and the mark's count unwritten; it
   fails with the guard in `reset()` taken out.
3. The painter kept a copy of the mark that `play()` is handed anyway.
   Fixed: `countOf(streak, mark)` reads `field.level.mark`, so the effects
   and the painter read it from one place. The guard in `reset()` stays,
   as the plan asks for no second count, and spec 2 pins it.
4. The design's step lifts the fur, "the same at the level's mark", and
   the log didn't say why the fur doesn't lift at a mark of 15. Added
   under the choices.
5. The content skill's `mark` line read as if the report printed the
   step. Fixed: the report's clause first, then the ring's.
6. Nits: the constructor's doc now says it makes the mark's count, and the
   effects spec's marks are 15, 25 and 30, each off a step, as a mark of 10
   passed with the mark ignored.

### 2026-11-14: the browser check

Served on 9304 and played in headless Chrome at 1280 × 720, on level 5,
Window, whose mark is 15, its unit 19 px, with the scene reached from the
page through Angular's dev tools and the paddle kept under the ball.

- The drop-in, paused 150 ms in: the left columns stood at their places,
  the right still above them and faint, in order across the field.
- A key the game doesn't use (Q) pressed on the board landed every brick
  the next frame, each at its row's place and whole.
- The frame the paddle's event played, the ball was 1.28 times as wide and
  0.7 times as tall, and the pad 2 px lower (a tenth of 19 px, rounded),
  the body still; the canvas read back at four times its size showed the
  ball flattened onto the pad's strip.
- The mark: the field's streak set to 14 and a brick broken with the
  rules' `hitBrick()`, the ring stood about the ball and "15" beside it,
  the ball in its ×3 fur.
- With `prefers-reduced-motion: reduce` emulated: a ball met the paddle
  and stayed round, the pad didn't move, the mark played no ring or count,
  and the run taken up after a reload showed its bricks at their places,
  whole, from the first frame.
- No error or warning in the console. The page was closed and the server
  stopped.

## F4. The burst lifted into `@fz/dev/sounds`

A package the integrator added for the user's ask to share library code
between the games; it isn't in the plan's §6, so its brief is its scope:
lift the `withBurst()` both brick games' sound scripts copy, F3a's item 8
above. The branch was at the integration tip, 6503c59c, as the package
began.

### 2026-11-14: `withBurst()` moves into the library

What it does:

- `frontend/lib/dev/src/sounds.ts` gains `withBurst()`, given a tone, a
  seed, a decay and a loudness: the tone, which the caller shapes, under a
  burst of `thud()`'s noise from the seed, struck at 0 s, scaled by
  `loudness`, rising over 1 ms (`BURST_ATTACK_S`, beside
  `ARPEGGIO_ATTACK_S`), then falling to about a third every `decay` seconds.
  Its sum is the scripts' own, `tone(t) + loudness * burst(t) * shape(t)`,
  in the same order.
- Its specs, in `frontend/lib/dev/src/sounds.spec.ts`: the tone played
  under the seed's noise, half risen at half a millisecond, and, from
  another seed, the noise fallen to e⁻¹ at one decay, scaled by the
  loudness while the tone isn't. They fail with the rise at 2 ms, the decay
  doubled, the loudness ignored or applied to the tone too, the tone
  dropped, or the seed fixed.
- `tools/build-sounds.mjs` here and Brick Fuzz Pop's import it and lose
  their copies, and `thud` with them, which only the copies used; Brick
  Fuzz Pop's `@import` loses `Wave` too. No recipe changed a character.
- `AGENTS.md`: the library's sounds entry names `withBurst()`; this game's
  and Brick Fuzz Pop's Make the Sounds say their recipes are made of the
  library's synths, `withBurst()` laying a burst of noise under a tone,
  without naming which sounds, so a new recipe leaves them true.

The two copies were the same, character for character, the doc comment
too (one text replaced in both), so there was no difference to explain and
nothing to choose between.

The sprites: both scripts run after the change wrote "15 sounds, 5.93 s,
189804 bytes" and "20 sounds, 8.35 s, 267244 bytes", and `git status`
showed neither `src/scene/sounds/` changed; each game's
`tools/build-sounds.spec.ts`, which holds its sprite to what its recipes
make, to the byte, passes.

Choices where the brief was silent:

- **The name and the arguments stay as the scripts had them,** so no
  recipe changed, and F3b's portal and bumper write it as F3a's voices did.
  The library's other synths take their numbers in a row too (`glide()`,
  `arpeggio()`).
- **Asteroid Breaker stays as it is.** Its script writes the same sum
  inline three times, but it is another game, outside the brief.

Left, named for a follow-up rather than lifted:

1. Asteroid Breaker's `breakOf()`, `blast` and `lost` are `withBurst()`
   written out (`blast` is `withBurst(boom, 11, 0.08, 2)`; the other two
   at a loudness of 1, which multiplies exactly), so moving it would keep
   its bytes. It has no byte spec: run its script and compare the sprite.
2. Both scripts end alike: written only when run, then "Wrote N sounds,
   X s, Y bytes." Snake's and Asteroid Breaker's print the same line, at
   import. Small, but worth lifting only with all four moved at once.
3. Two clashing partials, two `note()`s of a held pitch summed with the
   second weighted (steel and the plate here, Brick Fuzz Pop's clank,
   Asteroid Breaker's rung): one shape, but five numbers apiece, and the
   key's ding is near it and not quite (a brighter ring, a slower rise).
   Not clearly one helper.
4. Notes summed in a closure, `first(t) + second(t)` (the capsule's catch
   here, Brick Fuzz Pop's portal and danger, three of Asteroid Breaker's,
   and the cage's ticks by `reduce()`): a `mix()` of waves would serve
   them and `arpeggio()`'s own sum. A new piece of the library rather than
   a copy, so not lifted here.
5. The two `tools/build-sounds.spec.ts` are the same, byte for byte: the
   recipes are the view's `SOUNDS`, none loops, and the sprite is what the
   recipes make. A library helper could hold the third (the sprite checked
   in against `renderSoundSprite()`), but the first two read the game's own
   `SOUNDS` and spritemap, and `@fz/dev` has no testing entry for specs to
   take it from; a follow-up, with Asteroid Breaker's and Snake's sprites,
   which no spec holds to their scripts yet, moved onto it too.
6. Whole recipes, the same but for their names: the bloop (`broken` here,
   `break` there) and the clear's chord (`cleared` here, `chime` there, and
   Asteroid Breaker's `cleared`); the knock (`hit`, `strike`) differs only
   in its seed, and the blast in its seed and its lowest pitch. Left in
   each game: a recipe is the game's own voice, which it may retune alone,
   so sharing one would tie two games' sounds together.
7. `SPRITE_FOLDER`, `join(import.meta.dirname, "../src/scene/sounds")`, is
   the same line in both: a path from the script, the game's own, too
   small to lift.

Checks, after the review's fixes: the library's lint and typecheck pass,
and its tests, 16 files and 549 specs; its `test:coverage` holds the floor (all files 96.02% of
statements, 95.26% of branches, 97.18% of functions, 96.22% of lines;
`sounds.ts` 100% of statements, functions and lines, its two uncovered
branches the `?? 0`s that were there before). Brick Breaker's lint and
typecheck pass, and its tests, 75 files and 3493 specs, in 19.0 s; Brick
Fuzz Pop's lint and typecheck pass, and its tests, 147 files and 6489
specs (both games' before the review's fixes, which touched neither
script; the root's tests ran them again after). The root's lint, typecheck
and tests, every workspace's, pass, under the lock.

Outside stream F's files (the brief's own scope):
`frontend/lib/dev/src/sounds.ts` and its spec, `frontend/lib/dev/AGENTS.md`,
and Brick Fuzz Pop's `tools/build-sounds.mjs` and `AGENTS.md`; no stream
owns them in §7.3.

Review:

1. The specs passed with the loudness scaling the tone too (the first
   spec's loudness was 1, the second's tone silent), and with the seed
   fixed at 7, which both used. Fixed: the second spec plays a tone of 0.25
   from seed 11 at a loudness of 2; both mutations now fail it.
2. The follow-ups missed the plainest repeats: two recipes the same but
   for their names, the knock and the blast nearly so, `SPRITE_FOLDER`,
   and the two sound specs, byte for byte the same. Added as 5 to 7 above,
   each with why it stays.
3. The doc comment said the noise is "`loudness` times as strong as the
   tone", which the scale of `thud()`'s noise doesn't bear out, didn't say
   the burst is struck at 0 s, whenever the tone starts, and read as if the
   result were shaped. Fixed: "Returns a tone, which the caller shapes,
   under a burst of `thud()`'s noise from a seed, as a knock or a boom
   has: the noise struck at 0 s, scaled by `loudness`, …"; the log's line
   too.
4. This game's `AGENTS.md` named which sounds take the burst, which F3b's
   recipes could leave stale. Fixed: "laying a burst of noise under a
   tone, as a knock or a boom has", as Brick Fuzz Pop's reads.

## F3b. Machines' voices, the gates' opening and the lost ball's fur

The second half of F3: the voices of K3's kinds, a boing for a bumper and
a whoosh for a portal, and two flourishes other packages left to stream F:
the gates' opening (L6's note) and the fur of a ball lost in a streak (L3's
fur review, item 1). The branch was at the integration tip, b76415ac, as
the package began.

### 2026-11-14: a boing for a bumper and a whoosh for a portal

What it does:

- Two new sounds, synthesized by `tools/build-sounds.mjs` as the rest are
  and named at the end of `SOUNDS`:
  - `bumper`, a springy boing: a note leaping an octave, 220 to 440 Hz in
    40 ms, with a quarter of its second harmonic, wavering in pitch 15
    times a second, by a fifth (20%) of its pitch at first, about three
    semitones, the wavering dying away over 0.1 s (`wavering()`, which
    reads the tone a little ahead of and behind its time), 0.24 s;
  - `portal`, a whoosh: a band of `thud()`'s noise, smoothed over half a
    millisecond so only its lowest band is left and carried up about a
    gliding tone (`rushing()`), swept up from 500 to 2000 Hz as the ball
    goes in, then down from 2000 to 500 Hz as it comes out of the twin,
    0.3 s, the going in a little quieter than the coming out (its loudest
    20 ms 0.085 by RMS against 0.115), so the whoosh swells as the ball
    passes. Rendered, its brightness (the spectrum's centroid) climbs from
    0.76 kHz to 1.8 kHz at 100 ms and falls to 0.6 kHz by its end.
- `EVENT_EFFECTS` gives K3's events their sounds: `bumped` the boing, with
  the pop a brick that holds a hit plays, and `portalled` the whoosh, as
  the ball comes out of the twin. `VOICES` gives the bumper its boing for
  a hit too, as a bolt or a blast strikes it, which rang as steel: K3 left
  the bumper its voice "on either event".
- `slid` stays silent (below).
- The sprite (`sounds.wav`, 190 KB to 213 KB, 6.67 s, and `sounds.json`)
  is written again; its first fifteen sounds are the old file's samples
  exactly, at the same places.
- Specs: `effects.spec.ts`' voices (`VOICES_OF_EVENTS`, `VOICES_OF_KINDS`),
  and the scene's: a ball turning off a bumper boings and swells it, then
  settles it back; a bolt's strike on a bumper boings; a ball out of a
  portal's twin whooshes; a slider's step plays nothing. Each fails with
  its bug put back (the bumper's voice, `bumped`'s sound and pop,
  `portalled`'s sound, a sound on `slid`).
- `AGENTS.md`: `effects.ts`' voices, the brick painter's pop, and Make the
  Sounds' seventeen, to the portal's whoosh.

Choices where the plan was silent:

- **A slider's step makes no sound.** The plan names none. A step comes on
  every beat, 800 ms, whatever the player does: Conveyor's trains would
  tick 75 times a minute under every other sound, a metronome the player
  didn't start. The game's sounds say what a ball meets and the run's
  turns, and a slider still knocks and bloops as any brick when a ball
  meets it; the slide shows the step, and without motion the slider is
  seen at its new cell at once. A medium dose, as the plan asks.
- **A bumper pops as a ball turns off it,** as it already did at a bolt's
  hit and as steel swells at a ball's: a bumper kicks the ball back, as a
  pinball's does, so it swells as it kicks. A plate's underside, which
  records `plated` rather than `hit` too, stays still, as F3a left it: it
  is armour that turns a ball without giving, and its clank says so. The
  pop is one line, and none plays where motion isn't welcome.
- **A portal's whoosh goes in and comes out.** The ball's move is at once,
  and `portalled` is recorded at the twin, so the one sound carries both:
  up as it goes in, down as it comes out, as Brick Fuzz Pop's portal
  whoops up and back down, in noise rather than a tone, so it reads as
  air rushing rather than a note.
- **The names** are the kinds', as F3a's are the surfaces' and events':
  `bumper`, `portal`.

How loud, measured as F3a did, on the rendered sprite (peak; the loudest
30 ms, RMS): hit 0.50, 0.219; bumper 0.35, 0.193; portal 0.40, 0.109.
Neither is louder than the brick's knock by either. The boing's peak is
0.35 rather than 0.4, which would have made it 0.221 by RMS, a sine
holding its loudness longer than the knock's burst.

Added to shared files: the scene's spec (`bricks_scene.spec.ts`), a
helper (`turnOffBumper()`, `BUMPER`) and five specs; lines of `AGENTS.md`.

Checks, after the review's fixes: the workspace's lint and typecheck
pass, and its tests, 77 files and 3706 specs, in 19.0 s; the root's lint
passes.

Review:

1. The portal's going in was 8 dB quieter than its coming out:
   `envelope()` falls from 0 s, so a 60 ms rise against a 50 ms fall
   topped out at 0.31. Fixed: `envelope(0.04, 0.07)`, which tops out at
   0.56, so the rising sweep is heard, still a little under the coming
   out (above). The sprite was written again and measured.
2. The log's reason for the bumper's pop was wrong: a plate's underside
   records `plated`, not `hit`, and stays still too. Kept the pop and the
   plate's stillness, and reworded the choice above to say why each.
3. "By a fifth of it" read as a musical fifth. Fixed: "a fifth (20%) of
   its pitch, about three semitones".
4. The portal's scene spec threw its ball at a literal 13. Fixed:
   `cellMiddleX(cellIndex(6, 8))`, the low portal's column.
5. `wavering()`'s `settle` is what the library calls `decay`. Renamed;
   "ahead and behind" is "ahead of and behind".

### 2026-11-14: the gates open with a flourish, and a lost ball fades in its fur

What it does:

- **The gates' opening.** `opened` now calls for a flourish, `"open"`,
  beside the gates' sweep. The effects painter opens every gate of the
  field (`EffectsPainter.open()`, the bricks with the `locked` trait, all
  broken at once by the rules): each, in its own frame (`brickFrame()`),
  thins to a line along its middle and fades where it stood, over
  `OPEN_MS`, 360 ms, as long as the gates' sweep takes to rise (its glide,
  160 to 480 Hz over 0.36 s). How tall it stands is `openingHeight()` in
  `flourish.ts`, 1 − done², slow at first, as a heavy door, then quicker;
  it fades evenly. The brick painter hides the gates at once, as before;
  the flourish is a copy over them in the bursts' layer.
- Each gate is a particle of an emitter of its own (`EffectsPainter.gates`),
  as the shards are, so a level opens as many gates as it holds, Drawbridge
  13 and the drafts' Switchyard 24; a fixed pool of images would have had
  to guess the most. Phaser makes a particle the first time it has none
  spare, as it does a shard, so the first opening in a scene makes one for
  each gate, and later ones reuse them. As the last brick's hit
  holds, the opening gates stand still with the shards (`hold()`), and a
  new field puts them out (`reset()`).
- **The lost ball's fur.** A lost ball fades in the frame it flew in: its
  kind, its ink (`BallPainter.lostInk()`, as L6 left it) and the fur of
  the streak it was last drawn at (`BallPainter.drawnStreak`, beside
  `drawnKind`, since the rules end the streak as the last ball is lost),
  through `ballFrame()`. That frame has no eyes, so each fade is two images
  (`Fade`): the body and the eyes (`FRAMES.eyes`) over it, at its middle,
  looking ahead, as the faced frame drew them, both fading together. So
  fur standing on end at ×3 stays on end as the ball fades.
- Specs: `flourish.spec.ts` (the gate's height whole, three quarters at
  half its time, gone at its end), `effects.spec.ts` (`opened`'s flourish)
  and the scene's: each gate opening where it stood, in its frame, whole;
  thinned and faded by the curve halfway; all gone once the time is up and
  both still there just before; held as the last brick's hit holds, then
  going on; none without motion, the gates hidden at once; none left by a
  new level. A lost ball fades in its flying frame with its eyes over it,
  both fading; a ball lost at a streak of 12 fades in ×3's fur though the
  field's streak is 0 by then; a friend lost at a streak of 20 in its ink
  and ×4's fur; the faces of the earlier specs are the flying frames now;
  and no eyes show without motion or after a new level. Each fails with
  its bug put back (no `open()`, no `"open"`, the gates not held or not
  put out, no thinning, the field's streak for the painter's, no
  `drawnStreak`, no eyes, the eyes not fading).
- `AGENTS.md`: `effects.ts`' `"open"`, `flourish.ts`' `openingHeight()`,
  `timing.ts`' `OPEN_MS`, the effects painter's fade and gates, the hold,
  and the gates' opening among what motion's absence leaves out.

Choices where the plan was silent:

- **A fade rather than shards.** A gate opens, it doesn't break; shards
  would say a key's hit broke a row of steel, and Switchyard's 24 gates
  would throw 144 of them. A gate thinning to its middle line reads as a
  bar drawn back, as the sweep's "heavy doors slide open" says.
- **Timed to the sweep,** 360 ms, so the gates are gone as the sound tops
  out; a medium dose, about the shards' 350 ms and under the fade's 600.
- **The eyes look ahead,** as the faced frame had them, rather than the way
  the ball went: a lost ball has always faced the player as it fades.
- **`lostInk()` stays as L6 left it,** finding the ball by its place; if K4
  adds `FieldEvent.ink`, it takes the ink's place in `ballFrame()`'s call,
  and the streak still comes from the painter, since a lost event carries
  none.

Browser (headless, my own page on 9304, 1280 × 720 at 2×, runs kept by
`tools/stored_run.mjs`' rules and the scene reached through its painter's
prototype):

- Drawbridge: breaking the last key played the chime at 400 cents and the
  sweep; 13 gates opened at once, the brick painter hiding them; at a
  quarter of their time each stood 94% tall at 76% alpha, at 55% of it 70%
  tall at 45% alpha, in the gate's frame (`/tmp/f3b/drawbridge-opening2-crop.png`),
  thinning toward their middle line.
- A ball lost at ×3 on Pinball faded in `ball-normal-x3`, its fur on end,
  its eyes over it, though the field's streak was 0.
- Pinball: a ball under a bumper boinged and the bumper swelled to 1.12
  and settled; a ball bouncing among the bumpers boinged at each turn.
- Wormhole: a ball rising into the low portal whooshed and came out of the
  high one.
- No error or warning in the console. The page was closed and the server
  stopped. Sound can't be heard headless; the sounds were reasoned from
  the sprite (above).

Left, for L or the integrator: `facedBallFrame()` is used now only by
specs, and the friends' faced frames (`ball-friend-<ink>-faced`, 8 of the
atlas's) by nothing; How to play still shows each kind's faced frame
(`FACED_BALL_FRAMES`). L's `art.ts` is left as it is.

Added to shared files: `bricks_scene.ts` (the `"open"` case and the fade's
frame, one call), the ball painter's `drawnStreak` (F2's file), the scene's
spec (helpers, eight specs, seven changed), and lines of `AGENTS.md`.

Checks: the workspace's lint and typecheck pass, and its tests, 77 files
and 3715 specs, in 20.8 s; its coverage of `pure` and `dom` holds the
floor (all files 99.59% of statements, 97.46% of branches, 99.78% of
functions, 99.93% of lines; `effects.ts`, `flourish.ts`, `timing.ts` and
the effects painter whole, the ball painter's and the scene's uncovered
branches those before); the root's lint passes. After the review's
fixes, which touched only a spec, the scene's spec passes again, 225
specs, and the workspace's lint and typecheck, and the root's lint.

Review:

1. The spec of the gates' curve read each gate's height and alpha against
   its own time done, so gates that never moved, at 0, passed. Fixed: it
   holds the time done to half, within 0.05, and fails with the gates'
   life a hundred times as long; the hold's spec holds both gates going on
   (`[true, true]`), where `every()` passed with none.
2. `GATED`'s comment had the key over the gates and the plain brick in
   their column, and left out why the plain brick is there. Fixed: it keeps
   the level in play once the key breaks, so the rules record `opened`.
   `withGates()`, the bricks' describe's (L6's and K1's), builds the same
   field; left, for the integrator to fold onto `GATED` if it likes.
3. The log said nothing is made per gate, but Phaser makes a particle the
   first time it has none spare. Reworded, above. Not reserved: this
   game's shards and embers don't reserve either, and a sure bound, a
   gate in every cell, would make 208 particles for Drawbridge's 13.
4. "Under the shards' 350 ms" was over it. Fixed: "about".

Not changed, as the review noted: a key's hit that clears the level
records no `opened` (the rules' choice, K's), so its gates go at once in
the hold; no level comes to it while it holds needed bricks behind its
gates, as Drawbridge's wall, Walled garden's garden and Reunion's fort
are.
