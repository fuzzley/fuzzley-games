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
