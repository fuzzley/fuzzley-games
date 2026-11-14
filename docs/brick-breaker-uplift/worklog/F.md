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
