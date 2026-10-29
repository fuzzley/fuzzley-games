# Plan: building Brick Breaker, step by step

Answered 2026-10-29: the user took every recommendation of the design plan,
and asked for this plan of how it is built. The design plan is folded in
below ("Design reference") and deleted, so this file is the one place the
game is described until it ships, and the work log
(`docs/brick-breaker-worklog.md`) the one place its progress is.

Brick Breaker is the fifth game hosted on fuzzley.games, at
`/play/brick-breaker/`, in the Arcade category beside Snake: a paddle at the
bottom keeps one or more balls in play, and the balls bounce off the walls,
the paddle and the bricks above, and break the bricks. Its rules, physics
included, are plain TypeScript, its field is a Phaser scene, and its shell is
Angular on the shared libraries, laid out as Snake is. The work has two parts:

- **Part 1 lifts four pieces out of Snake into the libraries,** and adds a
  fifth beside them: fitting a field of cells to the canvas, playing a sound
  sprite, synthesizing one, pausing whenever the player looks away, and, new,
  baking many textures into one. Snake adopts each, and nothing about it
  changes.
- **Part 2 builds the game,** from an empty workspace to a game linked from
  the catalog, its rules and physics first, tested in Node, then its view,
  its scene and its shell.

## The user's answers

All 21 decisions went to the recommendation; "Design reference" cites them
by number:

1. The name is Brick Breaker, at `/play/brick-breaker/`.
2. Physics in the rules: a ball swept against the grid at a fixed step of
   1/120 s, in plain TypeScript, not Phaser's Arcade or Matter physics.
3. A mutable field, stepped in place, and a run kept as a value.
4. Part 1 lifts all five pieces before the game, Snake adopting each.
5. Levels in JSON, a set to a file: a grid of characters for the bricks and
   one for the tints, with a shared legend a level may add to.
6. Thirty levels, seven brick kinds, eleven capsules and three ball kinds.
7. Bad capsules (Narrow and Fast) at Normal and Fast.
8. Effects on timers, shown by tags whose rings empty.
9. Levels open as they are cleared, with a Levels dialog; a run starts at
   any open level.
10. Three lives, one more at 20,000 points and every 40,000 after, up to six.
11. Three speeds in the bar, Relaxed, Normal and Fast, Relaxed dropping no
    bad capsules, with bests kept for each.
12. On a touch screen the paddle moves as far as the finger drags, from
    anywhere on the field, with "follow the finger" as a setting.
13. Ghost bricks show a faint outline.
14. Regrowing bricks aren't needed to clear a level.
15. The last brick: prevented in the design, checked by the autopilot, and
    shown with a glow once three or fewer are left and none has broken for
    15 s.
16. A game taken up after a reload keeps its bricks, score, lives and level,
    with the ball back on the paddle and the effects gone.
17. How to play's pictures come from the scene's own textures.
18. The brick tints are the game's own eight colors for light palettes and
    eight for dark, held to the contrast spec.
19. Sound: ten effects, on by default, with the Sound button.
20. Brick Breaker goes in Arcade.
21. The lift merges first, on its own; the game merges once, linked from the
    catalog in the same commit.

## How the work runs

This is the process every step follows, from the first commit to the last.
It is written here so it isn't forgotten halfway.

### Branches

- **Part 1** is built on `brick-breaker-lift`, cut from `main`.
- **Part 2** is built on `brick-breaker`, cut from the tip of
  `brick-breaker-lift` once Part 1 is done, so it starts on the lifted pieces
  without waiting for a merge.
- **Nothing is pushed, and nothing reaches `main`, without the user's
  go-ahead.** When it comes, `brick-breaker-lift` merges first, on its own,
  since it changes a live game, and `brick-breaker` after it (decision 21).

### A step is a commit

Each step under "Phases" ends in one commit, in the repository's form
(`feat(phaser): …`, `feat(brick-breaker): …`, `test(…)`, `docs: …`), once:

- the workspaces it touched pass their own `lint`, `typecheck` and `test`
  (`yarn workspace <name> <script>`), and `yarn prettier:check` passes;
- what it adds is covered by specs, at the workspace's floor;
- the docs it makes untrue are brought up to date in the same commit (an
  `AGENTS.md`, a skill, `docs/operations.md`);
- the work log has its entry.

The last step of each phase runs `yarn verify` too, which must be green
before the next phase starts.

### Every commit is reviewed

After each step's commit, an **independent agent reviews it**: a fresh
`general-purpose` agent, not a fork, so it reads the code rather than the
reasoning behind it. It runs in the background while the next step begins,
and reports; it doesn't edit. Its brief (kept the same each time, the
commit filled in):

> Review commit `<sha>` in `C:\Users\fuzz3\Projects\personal\fuzzley-games`
> (`git show <sha>`), part of building Brick Breaker
> (`docs/brick-breaker-execution-plan.md`, step `<step>`). Read the
> `AGENTS.md` files that cover the changed files (`.agents/AGENTS.md`,
> `frontend/AGENTS.md`, and each workspace's), and judge the change for:
> readability (names, structure, functions small enough to follow, comments
> that say only what the code can't); engineering practice (layering and the
> ESLint fences, dependency injection, no duplication, allocation in
> per-frame code, error handling, tests that check state through the public
> API, Arrange-Act-Assert, real objects over mocks); and the language's
> style: Google's TypeScript style guide, Angular's style guide for the
> shell, and the repository's rules for doc comments, `readonly`, explicit
> return types and no `as any`. Also report any bug you find. List each
> finding with its file and line, what is wrong, why it matters and what to
> do, most important first, and say which you'd leave as they are. Don't
> edit anything.

Then:

1. **Every finding is answered:** fixed, or left with a reason, both written
   in the work log under the step.
2. **The fixes are one commit** of their own, `<type>(<scope>): <step>'s
review: …`, checked as any step's. It comes after the commit of the step
   in progress when the review arrives, never mixed into it, and before the
   next step's work begins.
3. **A review's fixes are reviewed with the next step**, whose reviewer is
   handed both commits, so the reviews never chase their own tails. The last
   fixes of the work get a review of their own.

### The work log

`docs/brick-breaker-worklog.md`, committed with the step it records. Each
step's entry gives the date, the commit, what was built, any choice made
that this plan didn't make (and why), what the checks reported, the review's
findings and what became of each, and numbers worth keeping: bundle sizes,
timings, the autopilot's report. QA checkpoints log what was tried, on what,
and what was found. A design change found on the way is made in this plan
too, so the plan stays true.

### QA checkpoints

Beyond the specs, thorough checks by hand and in a browser, each logged, at
six points:

| Checkpoint | When                       | What                                                                                                                                                                                                                                                                                                                                 |
| ---------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Q1         | after L5                   | Snake unchanged: `yarn verify`, its `check:layout`, its screenshots captured again and compared with the tree's, its sounds the same bytes, and a game played in the dev server by keys, mouse and touch, pausing by focus, tab and turn                                                                                             |
| Q2         | after B4                   | The rules alone: the autopilot's report over set 1 at every speed, read for loops and slow clears; a hundred seeded random runs of steering checked for a ball outside the walls or inside a brick; the physics' cost with eight balls, timed in Node                                                                                |
| Q3         | after B7                   | The first playable build: set 1 played in the dev server by mouse, keys and touch (Chrome's device mode), at each speed; the feel tuned in `tuning.ts`; a seam, a corner and the paddle's ends at the top speed; the paddle sharp at every width; the console clean. Screenshots go to the user, so the look can be redirected early |
| Q4         | after B10                  | The whole shell: every dialog by keyboard and by mouse, the cards, the bar on a phone and a wide screen, sound, settings, records and progress across a reload, a saved game taken up, a light palette and a dark                                                                                                                    |
| Q5         | B12                        | The full pass B12 lists: every level of set 1 and the last of each other set, AZERTY, a lost context, the accessibility tree, Lighthouse, a performance trace, the bundle's sizes                                                                                                                                                    |
| Q6         | B14, before asking to ship | The site's build and the Docker image: the game reached from the catalog, played at `/play/brick-breaker/` with the console open, no "Refused to load"                                                                                                                                                                               |

A problem a checkpoint finds is fixed in a commit of its own, reviewed as
any other, before the next phase.

### What changed from the design plan's phases

- **B0 is folded into the checkpoints.** Its mock was a gate for the user's
  approval of the look; the user asked for the game built, so the look is
  shown instead at Q3 and Q4, in screenshots sent as they are taken, early
  enough to redirect. Its spike's questions (the feel, the touch steering,
  the physics' cost, the NineSlice's ends) are answered at Q2 and Q3, on the
  real code rather than a throwaway.
- **Part 2 starts from the lift's branch,** not from `main` after a merge,
  so it doesn't wait for one.
- **Steps are commits,** each reviewed, where the design plan's phases were
  "at least one commit".

## Phases

Sizes are rough: small is an hour or two, medium half a day, large a day or
more. Paths in Part 1 are under `frontend/lib/` or `frontend/games/snake/`;
in Part 2, under `frontend/games/brick-breaker/` unless they say otherwise.

### Part 1: the lift (`brick-breaker-lift`)

#### L1: the layout entry (small)

- **L1.1** `@fz/phaser/layout`: `src/layout/layout.ts`, `index.ts` and
  `layout.spec.ts`. `Viewport` (moved from Snake) and `fitCells(viewport,
{ across, down, frameCss })`, which returns the cell in whole device
  pixels, the origin, the size, the frame's thickness and the rectangle in
  CSS pixels. The pure entries' ESLint fence takes `src/layout/**`. Snake's
  `boardMetrics()` becomes a call to it, its view's fence allows
  `@fz/phaser/layout`, and `board_metrics.spec.ts` passes unchanged. The
  library's `AGENTS.md` lists the entry. One commit.

#### L2: sound (medium)

- **L2.1** `@fz/phaser/sound`: `SpritePlayer<Name extends string>`, taking
  the scene, the key, the spritemap and the file's URL; `follow(wanted)`,
  `play(name)` and `loaded`, as Snake's `SoundPlayer` has. Specced on
  `runScene()` with a served WAV: nothing plays before it loads or while
  sound is unwanted, it plays after, and it mutes the scene's sound. Snake's
  scene makes one, and `src/scene/sound_player.ts` goes. One commit.
- **L2.2** `@fz/dev/sounds`: `writeSoundSprite(sounds, folder)` and the
  pieces a sound is made of (`glide()`, `envelope()`, `thud()`, `note()`),
  moved out of Snake's `tools/build-sounds.mjs`, with the WAV writer and the
  spritemap. Specced by writing a sprite into a temporary folder: the WAV's
  header, the spritemap's times, the gaps, and the same bytes twice. Snake's
  script keeps only its three recipes; `yarn build:sounds` writes
  `sounds.wav` and `sounds.json` byte for byte as before (their hashes go in
  the log). One commit.

#### L3: `bakeAtlas()` (medium)

- **L3.1** `bakeAtlas(scene, key, frames)` in `src/scene/bake_atlas.ts`,
  exported from `@fz/phaser/scene` beside `bakeTexture()`: each frame a name,
  a width, a height and a drawing into a `Graphics` at its origin; packed in
  rows with a 2-pixel gutter, drawn in one `Graphics`, generated into one
  texture, each frame added with `Texture.add()`, and drawn again on a
  restored context. Specced on `runScene()`: the frames' names, sizes and
  places, the gutter, a re-bake replacing the texture, and the frames still
  there after `loseContext()` and `restoreContext()`. One commit.

#### L4: the play room (medium)

- **L4.1** `@fz/game-ui/play_room`: `PlayRoomDirective`, `[fzPlayRoom]`, with
  an `away` output of `"focus" | "hidden" | "turned"`, and Snake's press
  rule. Specced with `installFakeViewport()` and Testing Library: the focus
  leaving the room and moving within it, the page hidden, the window turned
  and not, and a press on what can't take the focus. Snake's
  `app.component.ts` loses its four handlers and binds
  `(away)="pauseRun()"`; its specs for pausing pass unchanged. One commit.

#### L5: docs and proof (small)

- **L5.1** The docs: `@fz/phaser`'s, `@fz/game-ui`'s and `@fz/dev`'s
  `AGENTS.md`, the `phaser-core` and `fuzzley-ui` skills, and Snake's
  `AGENTS.md` and `snake-testing` skill, each naming the lifted pieces where
  it named Snake's. `node .agents/check-skill-references.mjs` passes. One
  commit.
- **L5.2** `yarn verify`, then Q1. Fixes, if any, in commits of their own.
  Part 1 is done; `brick-breaker` is cut from its tip.

### Part 2: the game (`brick-breaker`)

#### B1: the workspace (small)

- **B1.1** `frontend/games/brick-breaker/`, from Snake's: `package.json`
  (`brick-breaker`, with `phaser`, `@fz/phaser` and the other libraries),
  `vite.config.ts` (`gameConfig({ port: 9004, name: "Brick Breaker" })`),
  `vitest.config.ts` with the floors, `eslint.config.js` with `@fz/dev`'s
  blocks, `phaser()` for `src/scene/` and the four layers' fences, the
  tsconfig solution, `stylelint.config.js`, `src/test-setup.ts` with the
  headless Phaser, `index.html`, `src/main.ts` with a shell that shows only
  the game's name, `LICENSE`, `README.md`,
  `AGENTS.md` and `CLAUDE.md`. `yarn install`; the workspace's lint,
  typecheck, test and build pass. `games.json` doesn't list it yet. One
  commit.

#### B2: the physics (large)

- **B2.1** `src/rules/tuning.ts`, `speed.ts` and `stepper.ts`, each
  specced. One commit.
- **B2.2** `src/rules/grid.ts`: the bricks on their 13 by 16 grid, a cell's
  box from `brickBox()`, which faces and corners are exposed, and the column
  and row a point lies in, by which the field finds the cells a ball's move
  crosses. Specced on pictures of grids. One commit.
- **B2.3** `src/rules/sweep.ts`: when a moving ball first touches a face
  of a box, pushed out by its radius, or a corner, named by `SIDE`'s bits,
  as a share of its move; bricks, walls and the paddle are all boxes, and a
  contact's normal is its side's. Specced: faces met straight, at an angle,
  at their ends and at the move's end, a ball too fast for any step, one
  already touching, corners met, grazed and passed. The field (B2.4)
  gathers the contacts of one moment, a seam's two faces or a face's end
  and its corner, and turns once. One commit.
- **B2.4** `src/rules/field.ts`, `paddle.ts`, `balls.ts`, `level.ts` (the
  `Level` a field lays out, its cells and pace for now) and the event log
  (`events.ts`, a ring of 256 reused records), with
  `src/testing/field_picture.ts` (`fieldFrom`): a field of plain bricks,
  the paddle steered by `to`, `by` and `push`, the serve and the launch,
  the walls, the paddle's angles, the limits, the climb and its reset, the
  lull, a ball lost, the level cleared, and the same seed and steering
  giving the same field. One commit, `yarn verify` with it.

#### B3: the catalogs and the field's rules (large)

- **B3.1** `src/rules/catalog/bricks.ts`, `balls.ts` and `capsules.ts`
  (imported each by its file, so no `index.ts`): the types and the entries
  "Design reference" lists, `as const satisfies`, and the first half of
  `src/rules/catalog.spec.ts` (every entry named and described, weights
  positive, the words naming the durations, a capsule for every ball
  kind). Built before B2.4, which needs the brick kinds. The bad capsules
  being the only ones Relaxed leaves out is B3.3's, with the pool. One
  commit.
- **B3.2** `src/rules/bricks.ts`: `Brick`, `hitBrick()` and
  `TRAIT_RULES` for `hard`, `blasts`, `hidden` and `regrows`, tough bricks'
  hits, and the needed count; the field uses them. Specced trait by trait.
  `gives` has its entry, empty until the capsules fall (B3.3). One commit.
- **B3.3** `src/rules/capsules.ts`: the draw by weight from the level's pool,
  the cap of three falling, the catch and the miss, the gift brick's
  capsule (`dropFrom()`, which picks it over the level's chance, so
  `gives`' rule stays empty), and `EFFECT_RULES` for
  every effect (paddle size, catch, laser, fire, blast, slow,
  fast, split, life, net), with the groups and the timers; `bolts.ts`, the
  laser's bolts; `draws.ts`, the field's seeded draws, which the lull and
  the capsules share; the ball kinds'
  properties in the sweep (fire passing through what it breaks, blast's hits
  around). The level gains its chance and its pool, a level's brick the
  capsule pinned to it. Specced effect by effect. One commit.
- **B3.4** `src/rules/scoring.ts` and `run.ts`: points by the hit, the
  streak's multiplier, the clearing bonus, lives from points, and `Run`'s
  moves (`startLevel()`, `pause()`, `resume()`, and `catchUp()`, which
  B4.2's review made of `tally()`, `gainLives()`, `loseLife()` and
  `clearLevel()`), with `levelSeed()`, each level's field's seed. Specced.
  One commit, `yarn verify` with it.

#### B4: levels as data (medium)

- **B4.1** `src/rules/legend.ts`, `levels.ts` (`parseLevel()` and
  `LEVEL_SETS`), `src/rules/levels/basics.json` with levels 1 to 10, and
  `src/rules/levels.spec.ts`. One commit.
- **B4.2** `src/testing/autopilot.ts` and `src/rules/autopilot.spec.ts`
  (every level at every speed cleared within eight minutes of game time),
  `yarn report:levels` printing each level's time, bounces and lives lost,
  and the catalog spec's second half (every kind used by a level, every
  capsule able to fall from its `from` on), which waits for set 3 to pass in
  full and until then names the kinds not yet used. One commit, `yarn verify`
  with it, then Q2.

#### B5: the view (medium)

- **B5.1** `src/view/field_metrics.ts` on `fitCells()`, `frame.ts`,
  `layers.ts`, `timing.ts`, `controls.ts` and `steering.ts`, each specced.
  One commit.
- **B5.2** `src/view/palette.ts`, `inks.ts` and `contrast.spec.ts`: the
  field's colors from the palette's roles, the eight tints for light and
  dark, and every tint, kind, ball and capsule held to 3:1 against the
  field, and the ball against every tint, in every palette. If the tints
  can't all clear the ball, the ball gets its outline (Risks), and the spec
  says so. One commit.
- **B5.3** `src/view/art.ts` and `effects.ts`: `BRICK_ART`, `BALL_ART`,
  `CAPSULE_ART`, `SYMBOLS` and `atlasFrames()`, each frame drawn as plain
  commands, and what each event calls for. Every ball and capsule is
  outlined in the palette's `outline`, at least 1 CSS px wide, every
  brick's marks are in its `mark`, and every color the art derives from
  the palette (a tough brick's deeper tint; the net is drawn in the good
  capsules' color, which the spec holds already) joins
  `contrast.spec.ts`. Specced: every frame within its size,
  every kind in every state present, each event's effects with and without
  motion. One commit, `yarn verify` with it.

#### B6: the scene (large)

- **B6.1** `src/scene/bricks_scene.ts`, `atlas.ts`, and the field, brick,
  paddle (`NineSlice`) and ball painters: the field drawn from a frame,
  steering written from the keys and the pointer, re-baked on a new palette
  or cell. Specced on `runScene()` with a fake shell. One commit.
- **B6.2** The capsule, bolt, tag and effects painters; the events played
  once each; the pictures for How to play from the baked frames; nothing
  with motion off; no game object made after the first level; nothing called
  after the scene ends. Specced. One commit, `yarn verify` with it.

#### B7: play and the board (large)

- **B7.1** `src/app/play/game.service.ts` and `src/rules/describe.ts`: the
  run in a signal and the field outside one, `tick()`, launching, firing,
  pausing, going on, starting levels and runs, the question before a run is
  thrown away, and what the announcer says. Specced. One commit.
- **B7.2** `src/app/board/`, the cards, and `app.component` with the room
  (`[fzPlayRoom]`) and the focus: the scene loaded with `import()` behind a
  CSS drawing of the empty field, the Ready, Paused, Cleared and Ended cards,
  still loading and couldn't be drawn. Specced with
  `provideFakePhaserCanvas()`, a level played to its end through `tick()`.
  One commit, `yarn verify` with it, then Q3.

#### B8: the bar, the icon and the dialogs (medium)

- **B8.1** A `bricks` icon in `@fz/ui` with its spec's case, and
  `src/app/bar/`: the link home, the name with the speed's badge, the level,
  the score, the best, the lives as hearts, the streak's multiplier, and
  Pause, Sound, Levels, New game, How to play and Settings, the overflow on
  a compact screen. Specced. One commit.
- **B8.2** `src/app/levels/`, `result/`, `help/` and `settings/`: the Levels
  dialog's grid, the result card, How to play from the catalogs with the
  scene's pictures, and the settings. Specced. One commit, `yarn verify`
  with it.

#### B9: sound (small)

- **B9.1** `tools/build-sounds.mjs` with the ten sounds on `@fz/dev/sounds`,
  the sprite in `src/scene/sounds/`, a `SpritePlayer` in the scene playing
  each event's sound (a streak's rising pitch included, for which a
  `broken` event carries the streak as it was, as the scene plays events
  after the field has moved on), and the Sound button and setting.
  Specced. One commit.

#### B10: storage (medium)

- **B10.1** `SettingsService`, `StatsService` and `src/rules/progress.ts` with
  its service, under `brick-breaker-settings`, `brick-breaker-stats` and
  `brick-breaker-progress`, each reader dropping what it can't trust.
  Specced with an in-memory store. One commit.
- **B10.2** `src/rules/saved_game.ts` and `SavedGameService` under
  `brick-breaker-game`: written as a level starts, as a ball is served, on a
  pause and as the page goes away; taken up paused with the ball on the
  paddle (decision 16). Specced. One commit, `yarn verify` with it, then Q4.

#### B11: the other twenty levels (large)

- **B11.1** `src/rules/levels/steel.json`, levels 11 to 20, each drawn as the
  table has it, played, and tuned with `yarn report:levels` until the ramp
  climbs evenly. One commit.
- **B11.2** `src/rules/levels/tricks.json`, levels 21 to 30, the same way;
  the catalog spec now sees every kind used, and its waiting list goes. One
  commit, `yarn verify` with it.

#### B12: the checks (medium)

- **B12.1** `tools/check-layout.mjs`, Snake's adapted, on `@fz/dev/layout`,
  and `check:layout` in `package.json`: at `@fz/dev/layout`'s shapes, at
  320 × 480, and turned, each at 2×: no error and no scrolling; the canvas
  reaches `data-state="ready"` and draws at its size times the ratio; the
  field (`data-field`) has the shape 26 by 30, a unit of at least 10 CSS px
  (8 at 320 × 480), lies inside the window, where the placeholder drew it
  and inside the focus ring; its card lies on it. One commit.
- **B12.2** Q5: every level of the first set and the last of each other
  set, by mouse, keys and touch, at each speed, in a light palette and a
  dark; tabs switched mid-level; an AZERTY layout; the context lost and
  restored; the accessibility tree; Lighthouse's accessibility audit; the
  performance trace (a frame under 4 ms of script with the CPU throttled six
  times, eight balls, three capsules, a blast chain and its shards); and the
  entry chunk free of Phaser, with the gzipped sizes of the entry, the scene
  and the `phaser` chunk in the log. Fixes, each a commit.

#### B13: screenshots and docs (medium)

- **B13.1** `tools/capture-screenshots.mjs` and the images: a stored game
  on level 9, Rocket, part broken, at Normal, taken up paused out of sight
  of its card, at 1280 × 720 and 2× on Classic felt, written by
  `writeSiteImages()`, and `index.html`'s `og:image` tags pointing at the
  preview, as Snake's do. One commit.
- **B13.2** The game's `AGENTS.md` and `README.md`, the
  `brick-breaker-testing` and `brick-breaker-content` skills in the
  workspace's `.agents/skills/`, linked with
  `node .agents/link-claude-skills.mjs`. One commit.
- **B13.3** The lists that name the games: `.agents/AGENTS.md`,
  `frontend/AGENTS.md`, `frontend/games/AGENTS.md` (9004 Brick Breaker's,
  the next game 9005), `frontend/lib/dev/AGENTS.md`, `docs/operations.md`,
  the root `README.md`, and the `phaser-core`, `fuzzley-ui`,
  `web-game-accessibility` and `angular-testing` skills. One commit.

#### B14: ship (small)

- **B14.1** `frontend/site/games.json` gets
  `"brick-breaker": { "workspace": "games/brick-breaker" }`; the catalog gets
  Brick Breaker in Arcade ("Bounce the ball, break every brick, and keep it
  off the floor.", `players: SOLO`, `minutes: 10`, `added` on the day,
  `play: { build: "brick-breaker" }`); `frontend/site/index.html`'s meta
  description names it. `yarn verify` and `yarn check:layout`. One commit.
- **B14.2** Q6, in the Docker image if Docker is running on this machine
  (it is off by default; if it stays off, the log says so and the image
  waits for CI). This plan and the work log move to `docs/archive/`, the
  log's lasting decisions folded into the plan. One commit, reviewed.
- **B14.3** On the user's go-ahead: `brick-breaker-lift` merged into `main`,
  then `brick-breaker`, and pushed; the game played on fuzzley.games.
  Rollback: `git push --force origin <last good commit>:live`, then revert
  the merge on `main`.

## Design reference

What the game is and how it is built, from the design plan, kept here as
the steps above build it. Where building it teaches otherwise, this
section changes with the step that learned it, and the log says why.

### The game

#### The field, the paddle and the ball

- **The field is 26 units wide and 30 tall,** walled on the left, the top
  and the right, open at the bottom. A brick is 2 units by 1, on a grid of
  13 columns and up to 16 rows that starts 2 units below the top wall. The
  paddle's top is at 27.5. Everything the rules know is in these units; the
  view turns them into device pixels.
- **The field keeps its shape.** It is fitted whole to the room the bar
  leaves, a unit being a whole number of device pixels, as Snake's squares
  are, and centered. A level designed on it plays the same on every screen;
  a wider window shows more of the page around it, not more field.
- **A serve.** At a level's start, and after a lost ball, one ball sits on
  the middle of the paddle and moves with it until the player launches it
  (Space, a click or a tap). It leaves 20° from straight up, toward the side
  the paddle last moved, or to the right if it hasn't. Nothing launches by
  itself: the game waits, as Snake waits for its first direction.
- **The paddle sets the angle.** Where the ball lands on the paddle decides
  where it goes: straight up from the middle, and up to 60° from straight up
  at either end, in between in proportion. The paddle's own movement adds
  nothing, so the angle is something a player can learn and aim with.
- **Walls and bricks reflect it,** as a mirror does. Bricks side by side
  make one flat face, so a ball never catches the seam between two of them
  and flies off sideways; a brick's corner is a corner only where no brick
  or wall touches it.
- **It never travels flat.** After any bounce, a ball flatter than 20° from
  the horizontal is turned to 20°, so it can't shuttle between the walls
  for ever.
- **It never loops for ever.** A ball that bounces 12 times without touching
  the paddle or breaking a brick the level needs is turned by a few degrees
  at its next wall, by the run's seeded random, which breaks any loop
  between steel bricks without the player seeing a nudge.
- **It speeds up.** Each level starts the ball at its speed's base, times
  the level's pace. Every brick hit adds 1.5% of the base, up to the speed's
  top; a brick that never breaks adds nothing. Losing the last ball in
  play, a new level, or a Slow capsule brings it back to the base.
- **A ball past the floor is lost.** While another ball is in play, the
  game goes on; the last one lost costs a life, ends every capsule's effect,
  and serves again after a beat. With no lives left, the run is over.
- **A level is cleared** when every brick it needs is broken; steel bricks
  and regrowing bricks never need breaking. The balls in play leave the
  field, the level's score is added up on a card, and the next level waits
  for the player.

#### The feel, in numbers

The numbers the game starts from, settled by playing at Q3, kept in
`src/rules/tuning.ts` so one file tunes the game, but those of one kind of
brick or one capsule, which its catalog entry holds:

| What                     | Value                                                                                        |
| ------------------------ | -------------------------------------------------------------------------------------------- |
| The field                | 26 × 30 units; bricks 2 × 1, 13 columns and up to 16 rows, from 2 units below the top        |
| The paddle               | 4 units wide and 0.75 tall, its top at 27.5; Wide makes it 6, Narrow 2.6 (their capsules')   |
| The ball                 | a radius of 0.36 units                                                                       |
| The three speeds         | Relaxed 13 to 19 units a second, Normal 16 to 24, Fast 19 to 29, each times the level's pace |
| The climb                | 1.5% of the base for each brick hit, to the top                                              |
| Off the paddle           | up to 60° from straight up, by where it lands                                                |
| The flattest it travels  | 20° from the horizontal                                                                      |
| A lull                   | 12 bounces without the paddle or a needed brick, then a turn of 3° to 7° at the next wall    |
| The paddle, by keys      | up to 32 units a second, reached in 0.12 s                                                   |
| The paddle, by a pointer | toward the pointer, at up to 120 units a second, so it can't jump through a ball             |
| A capsule's fall         | 9 units a second                                                                             |
| A laser bolt             | 40 units a second, a pair every 0.35 s                                                       |
| Lives                    | 3 to start, 6 at most; one more at 20,000 points and every 40,000 after                      |
| The step                 | 1/120 s, 12 at most a frame                                                                  |

At Normal the ball crosses from the paddle to the lowest bricks of an early
level in a little over a second, which is the genre's pace; Q3 confirms it
by playing.

#### Scoring

- **Bricks score by the hit:** 50 for each hit a plain, tough or ghost
  brick takes, 100 for a blast or gift brick, and 20 for a regrowing brick
  each time it breaks. A fire ball's hit takes every hit a brick has left,
  and scores each, so a good capsule never costs points.
- **A streak scores more.** The bricks broken between two touches of the
  paddle count up: from the fifth they score double, from the tenth triple,
  and from the twentieth four times. Touching the paddle, or losing the
  last ball, starts the count again. The bar shows the multiplier while it
  is above one, on a screen with room for it. The field keeps what the
  streaks added apart (`streakPoints`), for the Cleared card.
- **A cleared level adds 1,000,** and 500 more if no life was lost on it;
  a ball of several lost while another plays on costs no life.
- **Points bring lives:** one at 20,000 and every 40,000 after, up to six.
- **A run's score** is everything from the level it started on to its end.
  Bests are kept for each speed, as Snake's are, for runs and for each
  level.

#### Brick kinds

Seven kinds to start, each told apart by its pattern as well as its color,
since color is never the only signal:

| Kind   | In a level | Hits   | Needed | Points       | What it does                                                                      | How it looks                                                             |
| ------ | ---------- | ------ | ------ | ------------ | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Plain  | `o`        | 1      | yes    | 50           | Breaks                                                                            | Its tint, and no mark                                                    |
| Tough  | `2` to `4` | 2 to 4 | yes    | 50 a hit     | Takes as many hits as its digit, cracking as it weakens                           | Its tint, deeper, with a pip for each hit left and cracks for each taken |
| Steel  | `#`        | never  | no     | none         | Turns every ball, a fire ball too, and stops laser bolts                          | The text color at 55%, with two rivets                                   |
| Blast  | `*`        | 1      | yes    | 100          | Breaks, and hits the eight bricks around it once, which can set off another blast | The danger color, with a starburst                                       |
| Gift   | `?`        | 1      | yes    | 100          | Always lets a capsule fall                                                        | The accent, with a capsule's outline in it                               |
| Ghost  | `~`        | 2      | yes    | 50 a hit     | Shows only as a faint outline until it is first hit, then is a plain brick        | A dashed outline, then its tint                                          |
| Regrow | `+`        | 1      | no     | 20 each time | Grows back 10 s after it breaks, once no ball is in its place                     | Its tint, with a sprout notched in it; it grows back over half a second  |

Blasts set each other off a beat apart (100 ms), so a chain reads as a
chain and doesn't flash as one burst.

#### Capsules

A broken brick the level needs lets a capsule fall, by the level's chance,
while fewer than three are falling; a gift brick always does. The paddle
catches a capsule by touching it, and a missed one is gone. Which capsule
falls is drawn from the level's pool by weight, from the run's seed, the
level and how many draws the level has made, so a run played the same way
drops the same capsules. A
level may pin a capsule to a gift brick through its legend, and at Relaxed
no bad capsule falls.

| Capsule | Symbol          | Kind | What it does                                                                                              | Lasts                         | Weight | From level |
| ------- | --------------- | ---- | --------------------------------------------------------------------------------------------------------- | ----------------------------- | ------ | ---------- |
| Wide    | arrows outward  | good | The paddle grows to 6 units                                                                               | 20 s                          | 10     | 2          |
| Multi   | three dots      | good | Every ball in play splits into three, 25° apart, up to eight balls                                        | at once                       | 8      | 2          |
| Slow    | a chevron down  | good | The balls drop to the base speed, and climb half as fast                                                  | 15 s                          | 8      | 2          |
| Life    | a heart         | good | One more life, up to six                                                                                  | at once                       | 1      | 5          |
| Catch   | a cup           | good | A ball that lands on the paddle stays there until launched, or for 3 s                                    | 20 s                          | 6      | 6          |
| Net     | a bar           | good | A line under the paddle turns back the next ball that falls, once                                         | until used, or the level ends | 4      | 8          |
| Laser   | two bars        | good | Space, a click or a tap fires a bolt from each end of the paddle, which hits one brick and stops at steel | 12 s                          | 5      | 9          |
| Narrow  | arrows inward   | bad  | The paddle shrinks to 2.6 units                                                                           | 15 s                          | 5      | 11         |
| Fire    | a flame         | good | The balls break every brick they touch that can break, and pass through it                                | 10 s                          | 4      | 12         |
| Fast    | two chevrons up | bad  | The balls go a quarter faster, past the speed's top                                                       | 12 s                          | 4      | 14         |
| Blast   | a starburst     | good | Each brick the balls hit hits the eight around it too                                                     | 12 s                          | 4      | 15         |

- **Good and bad look different twice over:** a good capsule is the accent
  with a rounded end, a bad one the danger color with a notched end, and
  each has its own symbol, so a player who can't tell the colors apart
  still can. Each is outlined in the field's color, as a ball is, since it
  falls across the bricks below it. A bad capsule can always be dodged, as
  the genre's always can.
- **One of each group at a time.** The paddle's size (Wide, Narrow), its
  mode (Catch, Laser), the balls' kind (Fire, Blast) and their pace (Slow,
  Fast) each take the latest capsule caught, which replaces the one before.
  The same capsule again starts its time over.
- **Every effect ends when a life is lost,** and the capsules falling and
  the bolts rising go with it, and no capsule falls until the next ball is
  in play. Every effect ends with its level too, as each level is a field
  of its own; Extra life's is the run's by then.
- **What is in effect shows on the field,** below the paddle: a tag for each,
  its symbol over a ring that empties as its time runs out, so the player
  can see what they have and for how long without reading anything.

#### Ball kinds

A ball's kind is what a capsule makes it, until the effect ends. Each kind
changes only a few of a ball's properties, so they combine with everything
else without special cases:

| Kind   | Damage               | Passes through   | Hits around it | Looks                                                 |
| ------ | -------------------- | ---------------- | -------------- | ----------------------------------------------------- |
| Normal | 1                    | nothing          | none           | The text color, a plain disc                          |
| Fire   | breaks any breakable | bricks it breaks | none           | The warning color, with a short trail of embers       |
| Blast  | 1                    | nothing          | the eight      | The danger color, with a ring that pulses on each hit |

What keeps them readable, which a new kind keeps too:

- **The ball is the clearest thing on the field.** Every kind is held to
  3:1 against the field by the contrast spec, and outlined in the field's
  color, which every brick tint is held to 3:1 against. A ball's own color
  can't clear every tint too: the fire ball's warning, the blast ball's
  danger and the tints all sit on the same side of the field, so a color
  3:1 from both the field and a tint would need 9:1 from the field, which
  only the text reaches.
- **A kind changes the ball's look in one way a glance can take in:** a
  color and one mark (a trail, a ring). A trail is never wider than the
  ball, and never longer than three of it.
- **A ball has one kind at a time,** never a mix, so what a ball will do is
  always what it looks like.
- **A kind changes few properties** (its damage, what it passes through,
  what it hits around it, its speed, its size), and a property is a number
  or a choice the rules already know, so a new kind is mostly data.

#### Levels

Thirty levels in three sets of ten. Each set brings a few new things, and
each new thing first comes alone, in a level built around it, before it
joins the others. Within a set the pace rises a little each level, the
bricks reach lower (less time to react), and the tough and steel bricks
take up more of the field; the last level of a set tests all of it.

**Set 1, Basics** (pace 1.00 to 1.06; capsules from level 2)

| #   | Name    | What it brings                                                     |
| --- | ------- | ------------------------------------------------------------------ |
| 1   | Stripes | Six rows of plain bricks and no capsules: the bounce and the angle |
| 2   | Gifts   | Gift bricks, and the first capsules: Wide, Multi and Slow          |
| 3   | Pyramid | Tough bricks of two hits                                           |
| 4   | Checker | Plain and tough in a checker, with gaps to reach behind            |
| 5   | Window  | A frame of tough bricks around plain panes; Life can fall          |
| 6   | Arch    | Tough bricks of three in an arch; Catch                            |
| 7   | Diamond | Rings of two and three                                             |
| 8   | Waves   | Rows in waves, reaching lower; Net                                 |
| 9   | Rocket  | A picture, its nose of four; Laser                                 |
| 10  | Castle  | Walls of three and four with a gate: the set's test                |

**Set 2, Steel** (pace 1.06 to 1.12)

| #   | Name      | What it brings                                                  |
| --- | --------- | --------------------------------------------------------------- |
| 11  | Pillars   | Steel pillars between columns; Narrow, the first bad capsule    |
| 12  | Shelf     | A steel shelf with gaps and bricks above it; Fire               |
| 13  | Fuse      | Blast bricks in a line through plain rows                       |
| 14  | Minefield | Blast bricks scattered through tough ones; Fast                 |
| 15  | Hidden    | Ghost bricks under a roof of plain ones; the Blast capsule      |
| 16  | Corridors | Steel corridors to the bricks behind them                       |
| 17  | Cage      | Tough bricks in a steel cage with two doors                     |
| 18  | Lanterns  | Ghosts with blast bricks at their hearts                        |
| 19  | Gears     | Steel teeth among blast bricks                                  |
| 20  | Vault     | A steel shell with one way in, and gifts inside: the set's test |

**Set 3, Tricks** (pace 1.12 to 1.20)

| #   | Name           | What it brings                                              |
| --- | -------------- | ----------------------------------------------------------- |
| 21  | Garden         | Regrowing bricks, a hedge in front of plain ones            |
| 22  | Hedge maze     | Regrowing walls in steel corridors                          |
| 23  | Low bridge     | Bricks down to the sixteenth row, with little time to react |
| 24  | Hourglass      | Two halves joined by a steel neck                           |
| 25  | Chain reaction | A field of blast bricks with tough ones between             |
| 26  | Fog            | Mostly ghosts                                               |
| 27  | Spiral         | A steel spiral lined with bricks                            |
| 28  | Keep           | Walls of four behind regrowing gates                        |
| 29  | Storm          | Every kind, low and dense                                   |
| 30  | Finale         | A picture of everything: the hardest                        |

Capsules join the pool at the levels the capsule table gives, and a level
may name its own pool instead. The chance that a needed brick lets one fall
is 0.10 in the first set, 0.12 in the second and 0.14 in the third, since
the later levels ask more of the player and give more back.

Four of the maps, as their grids read (a `.` is no brick):

```text
3 Pyramid        11 Pillars       13 Fuse          21 Garden
.............    .............    .............    .............
......2......    2222222222222    ooooooooooooo    ooooooooooooo
.....2o2.....    ooooooooooooo    o***********o    o2o2o2o2o2o2o
....ooooo....    o#oo#ooo#oo#o    ooooooooooooo    ooooooooooooo
...ooooooo...    o#oo#ooo#oo#o    .............    .............
..ooooooooo..    o#oo#ooo#oo#o    2222222222222    +++++...+++++
.ooooooooooo.    .............
                 ..#.......#..
```

**The last brick.** A level ending on one hard-to-reach brick is the
genre's best-known drag. This plan meets it in the design rather than with
a rescue: the levels are drawn so no needed brick hides where only luck
reaches it, every level is played to its end by the autopilot in a spec
(below) within a time limit, the lull rule breaks loops, and once three or
fewer needed bricks are left and none has broken for 15 seconds, they
glow, so the player at least knows where to aim (decision 15).

#### Runs, levels and records

- **A run** starts at a level the player has opened, with three lives and no
  score, and goes on through the levels in order until the lives run out or
  the last level is cleared.
- **Levels open as they are cleared,** at any speed: the first is open from
  the start, and each one after it once the one before has been cleared.
  The Levels dialog lists them all, with the open ones' bests.
- **New game** starts a run at the level the last run started at, or the
  first; the Levels dialog starts one anywhere open. Both ask first when a
  run is under way.
- **Records,** for each speed: the runs played, the best run's score, the
  furthest level reached; and for each level, its best score. A level's best
  counts its bricks, its streaks and its clearing bonus, from its serve to
  its clearing.

### Growing it

The game is meant to gain levels, brick kinds, ball kinds and capsules for
years. So each is an entry in a catalog or a data file, and the compiler and
the specs between them refuse an entry that is missing a part, as the
Solitaire Collection's registries do for its games.

#### The catalogs

In `src/rules/catalog/`, plain TypeScript, each a readonly object written
`as const satisfies`, so the ids survive as a type and every entry is
checked against the shape:

```ts
/** Describes a kind of brick: what breaking it takes, and what it does. */
export interface BrickKind {
  /** Names it in How to play, such as "Steel brick". */
  readonly name: string;
  /** Says what it does, in a sentence for How to play. */
  readonly about: string;
  /** How many hits break it, or "never"; a level's legend may set more. */
  readonly hits: number | "never";
  /** Whether a level needs it broken to be cleared. */
  readonly needed: boolean;
  /** What it scores for each hit it takes. */
  readonly points: number;
  /** What it does beyond taking hits. */
  readonly traits: readonly BrickTrait[];
}

/** Names something a brick does beyond taking hits, with its settings. */
export type BrickTrait =
  | { readonly kind: "hard" }
  | { readonly kind: "blasts"; readonly delayMs: number }
  | { readonly kind: "gives" }
  | { readonly kind: "hidden" }
  | { readonly kind: "regrows"; readonly afterMs: number };

/** Every kind of brick a level can hold, by id, in How to play's order. */
export const BRICK_KINDS = {
  plain: {
    name: "Brick",
    about: "Breaks at a hit.",
    hits: 1,
    needed: true,
    points: 50,
    traits: [],
  },
  steel: {
    name: "Steel brick",
    about: "Never breaks…",
    hits: "never",
    needed: false,
    points: 0,
    traits: [{ kind: "hard" }],
  },
  // tough, blast, gift, ghost, regrow
} as const satisfies Readonly<Record<string, BrickKind>>;

/** A brick kind's id, such as "steel". */
export type BrickKindId = keyof typeof BRICK_KINDS;
```

- **`BALL_KINDS`** (`catalog/balls.ts`): each a `BallKind`, its name and
  sentence, its `damage` (a number, or `"breaks"`), whether it `passes`
  through the bricks it breaks, whether its hits `reaches` the bricks
  around, and its `speed` and `size` against a normal ball's.
- **`CAPSULES`** (`catalog/capsules.ts`): each a `Capsule`, its name and
  sentence, its `tone` (`"good"` or `"bad"`), its `weight` in a draw, the
  level it is `from`, and its `effect`, one of a union:
  `{ kind: "paddle-size", width, ms }`, `{ kind: "paddle-mode", mode, ms }`,
  `{ kind: "ball", ball: BallKindId, ms }`,
  `{ kind: "pace", scale, climb, fromBase, ms }` (Slow climbs half as fast
  from the base, Fast goes a quarter faster), `{ kind: "split", into,
spreadDeg }`, `{ kind: "life" }` or `{ kind: "net" }`. An
  effect's kind is its group, so two of one kind never run at once.
- **What a trait or an effect does is written once,** in a table whose type
  is mapped from the union, so a new member without its rule fails to
  compile:

  ```ts
  /** Says what the field does for one trait, at each moment a brick with it meets. */
  interface TraitRule<T extends BrickTrait> {
    /** Runs as the level lays the brick out, to set its state. */
    readonly laid?: (brick: Brick, trait: T) => void;
    /** Runs as the brick takes a hit, before its damage. */
    readonly hit?: (field: Field, brick: Brick, trait: T) => void;
    /** Runs as it breaks. */
    readonly broken?: (field: Field, brick: Brick, trait: T) => void;
    /** Runs at each step while it is in the level, broken or not. */
    readonly step?: (field: Field, brick: Brick, trait: T) => void;
  }

  const TRAIT_RULES: {
    readonly [K in BrickTrait["kind"]]: TraitRule<
      Extract<BrickTrait, { kind: K }>
    >;
  } = {/* … */};
  ```

  `EFFECT_RULES` does the same for the capsules' effects, with `start` and
  `end`; an effect without `end` is over as it starts. A `step` rule joins
  when an effect first needs one, as the curve below would.

- **What each looks like is the view's,** in `src/view/art.ts`, keyed by the
  same ids and written `satisfies { readonly [K in BrickKindId]: BrickArt }`,
  so a kind without its art, or art without its kind, fails to compile:
  `BRICK_ART`, `BALL_ART`, `CAPSULE_ART` and the capsules' `SYMBOLS`.
- **The words come with the entry:** How to play lists every brick, ball
  and capsule from the catalogs, with the pictures the scene drew of them,
  so a new kind shows there by itself.

#### Levels as data

A set of levels is one JSON file in `src/rules/levels/`, imported
statically, as Sudoku's bank is; the three sets come to about 12 kB. The
file holds the set's id, its name, its chance of a capsule (`drops`) and
its levels. `LEVEL_SETS` in `src/rules/levels.ts` lists them in order, and
`LEVELS` numbers every level from 1, with its set. A level's ids are text
in its file, which `parseLevel()` checks, so the data's types say
`string` where the catalogs' ids go. A level is:

```ts
/** Describes a level as its set's file holds it. */
export interface LevelData {
  /** Names it for good: its records are kept by it, so it never changes. */
  readonly id: string;
  /** Names it to the player. */
  readonly name: string;
  /** Its bricks, a row of 13 characters for each of up to 16 rows. */
  readonly bricks: readonly string[];
  /** Each brick's tint, 1 to 8, in the same shape, `.` for its row's; else a tint per row. */
  readonly tints?: readonly string[];
  /** The ball's speed against the speed's own, 1 by default. */
  readonly pace?: number;
  /** The chance a needed brick lets a capsule fall; else its set's. */
  readonly drops?: number;
  /** The capsules that can fall; else every one whose level has come. */
  readonly capsules?: readonly string[];
  /** Characters of its own, beside the shared legend's. */
  readonly legend?: Readonly<Record<string, BrickSpecData>>;
}

/** Describes what a character in a level stands for (`legend.ts`). */
export interface BrickSpec {
  readonly kind: BrickKindId;
  /** Its hits, where its kind allows more than one. */
  readonly hits?: number;
  /** The capsule a gift brick gives, rather than one drawn. */
  readonly capsule?: CapsuleId;
}
```

`BrickSpecData` is a `BrickSpec` as a file holds it, its kind and capsule
text.

- **The shared legend** (`src/rules/legend.ts`): `.` no brick, `o` plain,
  `2` to `4` tough, `#` steel, `*` blast, `?` gift, `~` ghost, `+` regrow.
  A level's own legend adds characters, such as `L` for a gift brick that
  always gives a life, and may not redefine the shared ones.
- **Two grids, as LBreakout2 has:** the bricks and, if the level wants a
  picture, the tints. Without tints, each row takes the next of the eight,
  as stripes.
- **Order is the file's,** and a level opens once the one before it is
  cleared, or once it has been cleared itself. So a level inserted later
  never closes one a player has already reached.
- **`parseLevel()`** turns a level's entry into a `Level`, with a cell for
  every brick, or throws an error that names the level and what is wrong:
  a key no level or legend brick has (as a typo leaves, which the compiler
  doesn't check in JSON), a row of the wrong length or too many, an
  unknown character, a legend that redefines a shared character, hits a
  kind can't take, a capsule on a brick that gives none, a tint grid of
  another shape, a tint that isn't one or one where there is no brick, a
  capsule or kind that doesn't exist, a pace outside 0.8 to 1.4, or a
  chance outside 0 to 1.

#### The checks that keep it whole

| Check              | Where                            | What it holds                                                                                                                                                                                                                                                  |
| ------------------ | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The compiler       | everywhere                       | Every trait and effect has its rule, and every brick, ball and capsule its art                                                                                                                                                                                 |
| The catalog spec   | `src/rules/catalog.spec.ts`      | Every entry has a name and a sentence; every brick kind is used by a level, and every capsule can fall in one from its `from` on; every trait and effect kind is used; the weights are positive; the bad capsules are the only ones that can't fall at Relaxed |
| The levels spec    | `src/rules/levels.spec.ts`       | As Sudoku's bank spec: every level parses; ids and names are unique, and ids kebab-case; each has a needed brick; each needed brick can be reached, a flood from below through anything but steel touching it; the pace never falls within a set               |
| The autopilot spec | `src/rules/autopilot.spec.ts`    | Every level, at every speed, from a fixed seed, is cleared by `src/testing/autopilot.ts` within eight minutes of game time, and its last three bricks within one, which finds a level that loops or hides its last brick                                       |
| The contrast spec  | `src/view/contrast.spec.ts`      | Every tint, kind, ball and capsule against the field, each ball and capsule against its outline, and the outline against every brick, in every palette                                                                                                         |
| The scene spec     | `src/scene/bricks_scene.spec.ts` | Every kind, in every state, is drawn from a frame of the atlas                                                                                                                                                                                                 |

The autopilot plays as a good player would: it keeps the paddle under the
ball that will reach it first, lands it a seeded distance off the middle
or toward a brick the level needs that it can see, as a player aims only
at what is in sight, catches the good capsules it has time for, fires
whenever it can, and serves and launches at once. It steers as
a pointer does, so it is as fast as a mouse, and better than most
players. It runs in Node, without Phaser, and plays a level in well under
a second. `yarn report:levels` runs it over every level, from the level's
number as the seed, through the `playLevel()` the spec plays with, and prints how long each took, how
long of that went on the last three bricks the level needed (where a level
that hides its last bricks drags), and how many bounces and lives it cost,
which is how the difficulty ramp is tuned and checked by eye.

#### What adding each takes

- **A level:** its block in a set's file. The levels spec and the autopilot
  check it; nothing else changes.
- **A set:** its file in `src/rules/levels/` and its line in `LEVEL_SETS`.
- **A capsule with an effect that exists:** its entry in `CAPSULES`, and its
  symbol and art in `src/view/art.ts`. One with a new kind of effect: a
  member of the effect union, its rule in `EFFECT_RULES` and its record in
  `createEffects()` too, each of which the compiler asks for.
- **A ball kind:** its entry in `BALL_KINDS`, its art, and a capsule whose
  effect is `{ kind: "ball", ball: "<id>" }`. The physics needs nothing new
  while its properties are the ones listed, its size a normal ball's, and
  it passes only through what it breaks at a hit (`damage: "breaks"`), as
  the catalog spec holds.
- **A brick kind with traits that exist:** its entry in `BRICK_KINDS`, its
  art, its character in the shared legend, and a level that introduces it.
  One with a new trait: a member of `BrickTrait` and its rule in
  `TRAIT_RULES` too, with any state it keeps on `Brick`, set by its rule's
  `laid`.

Each comes with its specs, and the `brick-breaker-content` skill
(step B13.2) walks an agent through each list.

#### Worked examples, for later

These are not built in this plan. They show where the design bends:

- **A heavy ball** (2 damage, 0.85 the speed, 1.3 the size): an entry in
  `BALL_KINDS`, its art, and a capsule, and the size read where the
  physics now takes `BALL_RADIUS`: the sweep, the paddle's reach, and the
  check that no ball is in a regrowing brick's place.
- **A growing brick,** as LBreakout2 has, which fills the empty cells around
  it as it breaks, but none a ball is in: a `grows` trait whose `broken`
  rule adds bricks, raising the field's needed count for each one the level
  needs, as the count otherwise only falls.
- **A capsule that bends the balls toward the paddle:** a `curve` effect
  whose `step` rule turns each falling ball a little.
- **A sliding brick,** as Revenge of Doh and Alleyway have: a `slides`
  trait whose `step` rule moves the brick along its row. This is the one
  that reaches the physics, which today takes a brick's box from its cell:
  the sweep would take each brick's box from `brickBox()`, which a sliding
  brick moves, and treat a moving brick as standing alone when it merges
  faces. The plan keeps that function the only place the sweep learns where
  a brick is, so the change stays there.

### The lifted pieces

#### What is lifted, and where to

| Piece                                  | From Snake                                                                                                                               | To                                   | What changes                                                                                                                                                                                                                                                              |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fitting a field of cells to the canvas | `src/view/board_metrics.ts`: `boardMetrics()`, `Viewport`, `BoardRect`                                                                   | `@fz/phaser/layout`, a pure entry    | `fitCells(viewport, { across, down, frameCss })` takes any number of cells each way and a frame's width; Snake's `boardMetrics()` calls it with 17 by 17                                                                                                                  |
| Playing a sound sprite                 | `src/scene/sound_player.ts`: `SoundPlayer`                                                                                               | `@fz/phaser/sound`                   | `SpritePlayer` takes the key, the spritemap and the file's URL; Snake keeps its sounds' names                                                                                                                                                                             |
| Synthesizing a sound sprite            | `tools/build-sounds.mjs`: the glide, the envelope, the noise, the WAV writer and the spritemap                                           | `@fz/dev/sounds`                     | `writeSoundSprite(sounds, folder)` and the pieces a sound is made of; Snake's script keeps its three recipes and writes the same bytes                                                                                                                                    |
| Baking many textures into one          | new; `bakeTexture()` bakes one                                                                                                           | `@fz/phaser/scene`, as `bakeAtlas()` | Draws each frame into one texture with a gutter between, names each frame, and draws them all again after a lost context                                                                                                                                                  |
| Pausing whenever the player looks away | `src/app/app.component.ts`: the focus leaving the room, the page hidden, the screen turned, and a press that keeps the focus in the room | `@fz/game-ui/play_room`, a directive | `[fzPlayRoom]` on the element that holds the board and its controls says why the game should pause, through `(away)` (`"focus"`, `"hidden"` or `"turned"`), and keeps the focus in the room through a press on what can't take it; Snake binds `(away)` to `game.pause()` |

Why each moves now: two games need it, as `@fz/core`'s rule for a shared
helper asks, and copying Snake's into a second game would leave two copies
to keep in step. `bakeAtlas()` is new, but it is `bakeTexture()`'s sibling,
sharing its handling of a lost context, and every game that draws its art
in code will want it (decision 4).

#### The pieces

- **`@fz/phaser/layout`** imports nothing but `insets`' type, as the pure
  entries import nothing but each other, so a game's view takes it. `fitCells()` finds the largest cell, in whole
  device pixels, that lets `across` by `down` cells and the frame fit inside
  the insets, and centers them on whole pixels. It returns the cell, the
  origin and the size in device pixels, and the rectangle in CSS pixels, as
  `boardMetrics()` does now. `Viewport` moves with it.
- **`@fz/phaser/sound`**'s `SpritePlayer` keeps what Snake's does: it loads
  the sprite in `create()` rather than `preload()`, so the canvas never
  waits for it; it plays a sound only once the sprite is cached and the
  player wants sound; and it mutes the scene's sound while they don't.
  Phaser unlocks the sound at the player's first gesture, which in both
  games is also what starts play.
- **`@fz/dev/sounds`** runs in Node, as the rest of `@fz/dev` does, and
  nothing of it reaches a bundle. `writeSoundSprite()` renders each sound at
  16,000 samples a second, fades its last 10 ms so it never clicks, puts
  100 ms of silence between, and writes the WAV and the spritemap Phaser
  plays it by, the same bytes every run.
- **`bakeAtlas(scene, key, frames)`**: each frame a name, a width, a height
  and a function that draws it into a `Graphics` at its origin. It packs the
  frames in rows with a 2-pixel gutter, draws them in one `Graphics`,
  generates one texture, adds each frame to it with `Texture.add()`, and
  draws it all again on `RESTORE_WEBGL`, as `bakeTexture()` does. One
  texture for everything on the field is what keeps it one batch.
- **`[fzPlayRoom]`** knows nothing of a game: it reports why it should pause
  and leaves pausing to the app. It reads the turn from
  `GameViewportService.isPortrait`, the page from `visibilitychange`, and
  the focus from `focusout` on itself; its press rule is Snake's, a
  `pointerdown` on what can't take the focus keeping it where it is.

#### How Snake adopts them, and the proof nothing changed

- `boardMetrics()` becomes a thin call to `fitCells()`, and its spec stays as
  it is, passing.
- `SoundPlayer` goes; the scene makes a `SpritePlayer`.
- `tools/build-sounds.mjs` keeps its three recipes and calls
  `writeSoundSprite()`; `yarn build:sounds` writes `sounds.wav` and
  `sounds.json` byte for byte as they are.
- `app.component.ts` loses its four pausing handlers and binds
  `(away)="game.pause()"` on its room.
- **Proof:** Snake's suite passes; `yarn check:layout` passes; its
  screenshots, captured again, match the ones in the tree but for noise; and
  a scripted run plays alike on the old build and the new.

### The build

#### Layers

Snake's four, each a folder under `src/`, each fenced by ESLint so it
imports only the layers below it:

| Folder       | May import                                                                                      | May not import                                                      |
| ------------ | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `src/rules/` | `@fz/core`, and its own JSON                                                                    | Phaser, Angular, RxJS, any other `@fz/*`, the view, scene and shell |
| `src/view/`  | the rules, `@fz/core`, `@fz/phaser/color`, `@fz/phaser/insets`, `@fz/phaser/layout`             | Phaser, Angular, RxJS, the shell's libraries, the scene and shell   |
| `src/scene/` | Phaser, `@fz/phaser`'s entries but the canvas, the view and the rules                           | Angular, RxJS, the shell's libraries, the shell                     |
| `src/app/`   | Angular, every `@fz/*` library, the rules and the view; the scene and `@fz/phaser/host` by type | Phaser, and the scene or the host by a value import                 |

Everything the game decides lives in the rules, physics included, so it is
tested in Node without a frame; everything the scene decides that isn't a
Phaser call lives in the view, the art included, so the scene stays thin.

#### Who owns what

| Concern                                           | Owner                                                        | Why                                                                                                              |
| ------------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| The run: level, score, lives, outcome             | `GameService`, in signals                                    | The bar, the cards, the dialogs, the announcer and storage read it, and it changes a few times a second at most  |
| The field: bricks, balls, paddle, capsules, bolts | the rules' `Field`, held by `GameService` outside any signal | It changes 120 times a second, so no template follows it; the scene reads it through `frame()`                   |
| Time                                              | Phaser's loop                                                | The scene's `update()` hands the time to `GameService.tick()`, as Snake's does                                   |
| The paddle's steering                             | the scene, through Phaser's keyboard and pointer             | It reads them where the canvas is, and the view turns them into a `Steer`, which goes to the rules with the time |
| Launching, pausing, going on                      | the scene's keys and presses, as commands to the shell       | As Snake's are                                                                                                   |
| Drawing and flourishes                            | the scene                                                    | What Phaser is for                                                                                               |
| Words for screen readers                          | the shell, through `@fz/ui/announcer`                        | A canvas says nothing                                                                                            |
| Pausing when the player looks away                | the shell, through `[fzPlayRoom]`                            | It knows the focus, the page and the screen                                                                      |
| Sound                                             | the scene, through `SpritePlayer`                            | As Snake's                                                                                                       |
| What is kept across visits                        | the shell, through `@fz/ui/storage`                          | As every game's                                                                                                  |

#### How the shell and the scene talk

```ts
/** What the scene asks of the shell, and tells it. */
export interface BricksSceneOptions {
  /** Moves the game on by the time a frame took, the paddle steered as the player steers it. */
  readonly tick: (deltaMs: number, steer: Steer) => void;
  /** Returns the field to draw, as the game now stands. */
  readonly frame: () => FieldFrame;
  /** Returns the colors to draw in; a new value repaints the field. */
  readonly palette: () => BricksPalette;
  /** Returns whether the player welcomes motion. */
  readonly motion: () => boolean;
  /** Returns whether the player wants sound. */
  readonly sound: () => boolean;
  /** Returns how a finger steers: by dragging, or by following it. */
  readonly touch: () => TouchSteering;
  /** Takes where the field now lies on the canvas, in CSS pixels. */
  readonly onLayout: (field: FieldRect) => void;
  /** Takes what a key, a click or a tap asks of the game. */
  readonly command: (command: FieldCommand) => void;
  /** Takes pictures of every brick, ball and capsule as drawn, for How to play. */
  readonly onPictures: (pictures: Pictures) => void;
}

/** Says how the player steers the paddle this frame: one object, written again each frame. */
export interface Steer {
  /** Where a pointer asks the paddle's middle to be, in field units, or null. */
  to: number | null;
  /** How far a dragging finger has moved since the last frame, in field units. */
  by: number;
  /** Which way held keys push the paddle: -1, 0 or 1. */
  push: -1 | 0 | 1;
}

/** Describes the field between one step and the next. */
export interface FieldFrame {
  /** The field as of its last step, read only. */
  readonly field: FieldView;
  /** How far the field is from its last step to its next, from 0 to 1. */
  readonly alpha: number;
  /** What happened, each event numbered, for the scene to play the new ones once. */
  readonly events: EventLog;
}
```

- **Each frame, the scene steers, then pulls,** as Snake's does: it writes
  the `Steer` from the keys held and the pointer, calls `tick()`, reads
  `frame()` and draws, each moving thing at its last place plus `alpha` of
  the way to its next, so the field moves smoothly at any refresh rate.
- **Events, not diffs.** A step that breaks a brick, bounces a ball, drops,
  catches or misses a capsule, fires a bolt, sets off a blast, loses a ball
  or clears the level writes an event into the field's log: a ring of 256
  reused records, each with a serial number. The scene plays every event
  past the last one it played, once, so a frame that took several steps
  misses none, and nothing allocates. A new field (a new level, a new run,
  a run taken up) starts a new log, which tells the scene to stop what the
  last one set off, as Snake's run id does.
- **Signals change only when the run does.** `GameService` copies the
  field's score, lives and outcome into the run's signals after a tick only
  when they changed, so the bar's change detection runs a few times a second
  at most.
- **The palette** is a `computed()` over `ThemeService`'s roles and the
  palette's mode, turned into numbers by `bricksPalette()`, a new object only
  when the palette changes, so the scene re-bakes the atlas only then.

#### The rules

`src/rules/`, each file with a spec beside it:

- `tuning.ts`: the numbers in "The feel, in numbers".
- `speed.ts`: the three speeds, `relaxed`, `normal` and `fast`, as a base and
  a top, and which capsules each lets fall.
- `catalog/bricks.ts`, `catalog/balls.ts`, `catalog/capsules.ts`: the
  catalogs.
- `legend.ts`, `levels.ts` and `levels/*.json`: the levels as data, parsed
  and checked.
- `grid.ts`: the bricks on their grid, which faces and corners are exposed,
  and which cells a path crosses.
- `sweep.ts`: the first contact along a ball's path, below.
- `field.ts`: `Field`, the level in play, stepped in place:
  `createField(level, setup)`, `steerField(field, steer)` once a frame,
  since a finger's drag is a frame's, `stepField(field)` for each step,
  `launch(field)`, `serve(field)` once the last ball is lost, and
  `fireBolts(field)` (`bolts.ts`). It holds the bricks, up to eight balls, the paddle, the
  falling capsules, the bolts, the effects in play with their time left,
  the streak, the lull, the level's score and the event log, and where the
  level stands (`serve`, `playing`, `lost` while a lost ball's beat runs,
  and `cleared`).
- `paddle.ts`, `balls.ts`, `bricks.ts` (the traits' rules), `capsules.ts`
  (the draws and the effects' rules): what each part of the field does in a
  step.
- `scoring.ts`: a hit's points, the streak's multiplier, and what clearing
  a level adds. The numbers are the tuning's (`STREAK`, `CLEAR_POINTS`,
  `CLEAN_POINTS`), and a brick kind's points the catalog's.
- `run.ts`: `Run`, a value each change replaces, as Snake's is: its id, its
  seed, its speed, the number of the last level, the level it started at
  and the one in play, the points banked by the levels cleared, the score,
  the lives, the points of the next extra life, the lives of the level in
  play it has taken, and the outcome (`ready`, `playing`, `paused`,
  `cleared`, `over` or `won`). `startLevel()`, `pause()`, `resume()` and
  `catchUp()` move it, and `levelSeed()` gives each level's field a seed of
  its own, which the field's draws count from. The field's `livesGained`
  and `livesLost` count up over the level, and after each frame the shell
  hands the field to `catchUp()`, which takes what has come since it last
  looked in the order it comes in on a field: the points, the lives gained,
  the lives lost, then the clearing. A frame's steps can hold them all, and
  the counts keep no order. A move that doesn't fit where the run stands
  returns it as it is, so a run over stays over though a blast clears its
  level after the last life, and a level is banked once.
- `stepper.ts`: fixed steps of 1/120 s from a frame's time, at most twelve,
  dropping what is left of a longer frame, so a stall slows the game rather
  than letting it leap.
- `progress.ts`: which levels are open, from the ones cleared.
- `describe.ts`: what the announcer says.
- `saved_game.ts`: a run and its field as JSON, and the checks that make a
  restored one trustworthy. The field's timers are the steps things happen
  at (a lit blast, a regrowth, an effect's end, a caught ball's leaving, the
  laser's next pair), against the field's count of steps, which it keeps
  too.

**The field is mutable, the run a value.** Snake replaces its `Run` at
every step. A brick breaker steps 120 times a second with dozens of moving
parts, and a new object each step would allocate in every frame, which the
`phaser-canvas-performance` skill rules out. So the field is stepped in
place, from pools made once, and the run, which changes a few times a
level, stays a value in a signal (decision 3). The field exposes itself to
the view and the scene only as `FieldView`, a read-only type.

**Seeded.** Everything random (which capsule falls, the lull's turn, the
autopilot's aim) comes from `@fz/core/random`, seeded from the run's seed
and a count, so the same run steered the same way plays the same, which the
specs, the autopilot and the screenshots rely on.

#### The physics

In `sweep.ts` and `field.ts`, LBreakout2's approach, whose C source shows
how a careful clone does its collisions:

- **A step** moves the paddle toward its steering (`to` and `by` at up to 120
  units a second, `push` with its ramp), then the capsules and the
  bolts, then each ball the distance it travels in 1/120 s.
- **A ball's travel** finds the earliest contact along its path among the
  walls, the paddle and the bricks in the cells its path's box crosses, a
  few at most. Each brick offers only its exposed faces, pushed out by the
  ball's radius, and its exposed corners as circles of that radius. The
  ball moves to the contact, turns by the contact's normal, the hit is
  applied (damage, traits, events), and the travel goes on with what is
  left, up to four contacts a step, past which the rest of the step is
  dropped. A fast ball can't pass through a brick, however fast it goes.
- **A face is exposed** only where the cell beside it is empty, or holds a
  brick the ball passes through; **a corner** only where both cells beside
  it and the one across from it are. So bricks side by side are one face.
- **Contacts at the same moment** all count: a ball striking the seam
  between two bricks hits both and turns once.
- **The fire ball** treats bricks that can break as no obstacle at all, and
  breaks each it overlaps, in the order it reaches them.
- **The paddle:** off its top, the ball leaves by where it landed; off its
  ends and top corners, as if it landed at that end, so at the most
  slanted, outward and up. Its underside meets nothing. A paddle moved into
  a falling ball lifts the ball onto its top and bounces it there, so a
  paddle swung under a ball never swallows it.
- **After every turn,** the ball's speed is set back to the speed it should
  have (turns never drift it, as they do in Phaser's own breakout example),
  and its angle is held to the limits. A ball held to the flattest goes up
  or down as it went, unless that takes it back into what it met, as off a
  corner it can: then the other way. A lull's turn back into its wall is
  mirrored out of it.
- **Determinism:** fixed steps, the same operations in the same order, and
  seeded randomness. In one JavaScript engine the same seed and steering
  give the same field to the bit; across engines, `Math.sin` may differ in
  its last bit, which nothing relies on, since a saved game keeps where
  things are, not how they got there.

#### The view

`src/view/`, without Phaser, tested in Node:

- `field_metrics.ts`: `fieldMetrics(viewport)`, the field on the canvas from
  `fitCells()`, with a unit as the cell and 26 by 30 of them, and room for
  a 2-CSS-pixel frame on every side, so the field stays centered, though
  the wall is drawn only on the left, the top and the right; and
  `toCanvasX()`, `toCanvasY()`, `toFieldX()` and `toFieldY()` between the
  two, an axis each, so nothing is made to hold a pair.
- `palette.ts`: `bricksPalette(roles, mode)`. The field is `panel`, and so
  is the outline around every ball and capsule; the wall is `text` at 20%,
  left below 3:1 as it only frames the field, as Snake's is; the ball `text`, the
  paddle `accent`, steel `text` at 55%, enough for 3:1 against the field in
  every palette, a good capsule and a gift brick `accent`, a bad one and a
  blast brick `danger`, the fire ball `warning` and the blast ball `danger`;
  the tints are the inks of the palette's mode.
- `inks.ts`: the game's own colors, eight brick tints for the light palettes
  and eight for the dark, which the contrast spec holds to 3:1 against the
  field in every palette. They are written here, in TypeScript, because the
  canvas is where they are drawn; How to play's pictures come from the
  canvas too, so no stylesheet needs them.
- `art.ts`, with `brick_art.ts`, `symbols.ts` and `shapes.ts`:
  `BRICK_ART`, `BALL_ART`, `CAPSULE_ART` and `SYMBOLS`, and
  `atlasFrames(palette, scale)`: every frame the atlas holds (each kind in
  each tint and each state, its marks in the field's color, each ball and
  each capsule, outlined at least 1 CSS px wide, the paddle's round end, the
  bolt, the shard and each tag), with its size in device pixels and its
  drawing as plain commands (rectangles, rounded rectangles, circles,
  rings, lines and polygons), which the scene plays into a `Graphics`. So
  what every frame looks like is specced without Phaser.
- `steering.ts`: `Steering`, which the scene feeds its keys and Phaser's
  pointers (read through `PointerView`, the fields it needs) and reads once
  a frame: the keys held, as a push, the one held last winning; the mouse,
  as a place to go; a finger, as a drag or a place, as the setting says,
  one finger at a time; and a tap, a press and release within 250 ms and 8
  CSS px that the browser didn't cancel, as a launch, as is a press of the
  mouse's main button. A place is asked only on a frame the pointer moved,
  so a paddle the keys pushed stays where they left it; the rules keep a
  paddle against a wall as it narrows, so a pointer resting past the wall
  leaves no gap.
- `controls.ts`: the keys by `event.code`, as Snake's are: the commands
  (`FieldCommand`: launch, pause, toggle, go; launch on a cleared level
  goes on to the next) and the held pushes. The scene captures, in
  Phaser's names, only the keys that would scroll the page (the arrows and
  Space), as Snake's does, so Enter still presses the cards' buttons.
- `effects.ts`: what each event calls for (shards, a ring, a shake, a pop, a
  fade, a sound), each marked as motion or not.
- `timing.ts`: how long each flourish lasts, and how long the cards wait
  after a level is cleared or a run ends.
- `layers.ts`: the order the field is drawn in, back to front, in one list,
  as the performance skill asks.
- `frame.ts`: `FieldFrame`, `FieldView` (the field as the scene reads
  it, which the rules' `Field` is), `EventsView` (the log's `latest` and
  `forEachSince()`), and `Steer` and the event types, from the rules.

#### The scene

`src/scene/`, the only folder that imports Phaser:

- **`bricks_scene.ts`,** `BricksScene`, with a unique key, built by
  `makeBricksScene(options)`:
  - `create()` measures, bakes the atlas, makes a layer for each entry in
    `layers.ts` and the painters in them, makes the `SpritePlayer`, listens
    to the keys and the pointer, hands the pictures over, and calls
    `ready()` with `onFirstFrame()`.
  - `update(time, delta)` writes the `Steer`, calls `tick()`, reads the
    frame and the palette, re-bakes on a new palette or cell size, rebuilds
    the bricks on a new field, plays the new events, and has each painter
    draw. It allocates nothing.
- **The painters,** each making its game objects once and reusing them:
  - `FieldPainter`: the field and its wall, and the net while it is there.
  - `BrickPainter`: an `Image` for each of the 208 cells, made once, each
    shown with its brick's frame or hidden; bricks drop in, row by row, as a
    level starts, and a regrowing brick grows back.
  - `PaddlePainter`: two `Image`s of the paddle's round end and a
    `Rectangle` between their middles, scaled across, so the ends keep their
    shape as Wide and Narrow change its width, which the rules grow and
    shrink over a moment, so the paddle drawn is the one the ball meets; a
    rectangle draws crisp at any width on either renderer, where a
    `NineSlice` draws nothing on Canvas. The laser's cannons are frames over
    it, and the catch's rim another rectangle along it.
  - `BallPainter`: eight `Image`s, and the fire ball's embers from a
    particle emitter that follows it.
  - `CapsulePainter` and `BoltPainter`: pools of `Image`s.
  - `TagPainter`: the effects in play, each tag an `Image` of its symbol,
    and their emptying rings in one `Graphics`.
  - `EffectsPainter`: shards from a broken brick, in its tint; a blast's
    ring, from a pool; the camera's shake on a blast or a lost ball; and a
    lost ball's fade.
- **`atlas.ts`:** plays `atlasFrames()` into `bakeAtlas()`, and, each time
  it bakes, makes the pictures for How to play from the baked frames with
  `textures.getBase64()`, which reads a texture drawn on a canvas, as
  `generateTexture()` draws one.

#### The Phaser config

As Snake's, through `HostOptions`: `banner: false`, `autoFocus: false`,
`disableContextMenu: true`, `background: "transparent"`, `antialias: true`,
`powerPreference: "low-power"`, `fps: { smoothStep: true }`, the keyboard's
target the board's element, the mouse and touch on, and no gamepad.

#### The parts of Phaser it uses

Each has its skill in `.agents/skills/`; none needs a new copy.

| Part              | The API                                                                                                     | Where                           | What for                                                                         | Skill                                                         |
| ----------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| The game, scaling | as Snake, through `@fz/phaser`                                                                              | the host                        | One game, its canvas in device pixels                                            | `phaser-game-setup-and-config`, `phaser-scale-and-responsive` |
| The scene         | `create()`, `update(time, delta)`, the scene's events through `@fz/phaser/scene`                            | `BricksScene`                   | The field's life, its frames and its end                                         | `phaser-scenes`                                               |
| Layers            | `this.add.layer()`                                                                                          | `BricksScene`                   | The draw order from `layers.ts`                                                  | `phaser-groups-and-containers`                                |
| Textures          | `this.make.graphics()`, `generateTexture()`, `Texture.add()`, `textures.getBase64()`, through `bakeAtlas()` | `atlas.ts`                      | Every frame in one texture, sharp at the cell's size, and How to play's pictures | `phaser-render-textures`                                      |
| Images            | `this.add.image()`, `setFrame()`, `setVisible()`, `setPosition()`                                           | the painters                    | Bricks, balls, capsules, bolts and tags                                          | `phaser-sprites-and-images`                                   |
| Shapes            | `this.add.rectangle()`, `setScale()`, `setFillStyle()`                                                      | `PaddlePainter`                 | A paddle that changes width without stretching its ends, on either renderer      | `phaser-graphics-and-shapes`                                  |
| Graphics          | `clear()`, `lineStyle()`, `arc()`, `strokePath()`, `fillRect()`                                             | `TagPainter`, `FieldPainter`    | The tags' rings, the wall and the net                                            | `phaser-graphics-and-shapes`                                  |
| Particles         | `this.add.particles()` with atlas frames, `explode()`, `startFollow()`                                      | `EffectsPainter`, `BallPainter` | Shards, and the fire ball's embers                                               | `phaser-particles`                                            |
| Tweens            | `this.tweens.add()` with a stagger, `addCounter()`, `killAll()`                                             | the painters                    | Bricks dropping in, a regrow, the paddle's width, a blast's ring, a fade         | `phaser-tweens`                                               |
| The camera        | `cameras.main.shake()`, `resetFX()`                                                                         | `EffectsPainter`                | A shake on a blast or a lost ball, left out without motion                       | `phaser-cameras`                                              |
| Input             | the keyboard on the board's element, `addCapture()`, key down and up; the pointer's down, move and up       | `BricksScene`                   | Steering, launching, firing and pausing                                          | `phaser-input-keyboard-mouse-touch`                           |
| Sound             | through `@fz/phaser/sound`'s `SpritePlayer`                                                                 | `BricksScene`                   | The sounds                                                                       | `phaser-audio-and-sound`                                      |

**What it leaves alone, and why:**

- **Arcade and Matter physics.** Arcade finds overlaps once a step and
  separates them, so a fast ball can pass through a brick or turn twice;
  its world would be Phaser's, outside the rules, out of the Node specs,
  the autopilot and the saved game (decision 2).
- **Tile maps:** the level is the rules' grid.
- **`Text` and `BitmapText`:** every word is the shell's.
- **Loaded art:** everything is drawn in code at the cell's size in device
  pixels, so it is sharp at every size, changes with the palette, and loads
  nothing.
- **Filters, lights and gradients:** the design is plain, and a filter on
  many objects is what the performance skill warns against.
- **Containers and sprite-sheet animations:** layers, tweens and particles
  cover them.
- **A gamepad:** "Not in this plan".

#### Loading

As Snake's: the shell paints first, with the bar, the Ready card and a
drawing of the empty field in CSS (the frame and a paddle, sized by the same
rule as `fieldMetrics()`), and the scene and Phaser come with the
`import()` the board makes. The canvas takes over once the scene has drawn
its first frame. The levels come with the shell, since the bar and the
Levels dialog need their names.

#### Sharpness

The canvas renders at the display's pixel ratio, up to 3, through the
library's scaler; a unit is a whole number of device pixels, so every brick
edge falls on a pixel; and the atlas is baked at the cell's size in device
pixels and baked again when that changes, so nothing on the field is ever
scaled. The paddle's body and rim are rectangles, scaled across, which
stay sharp at any width; its ends are baked.

#### Sound

Ten short sounds, from Snake's synthesizer through `@fz/dev/sounds`, in one
sprite: a paddle bounce, a wall bounce, a brick hit, a brick broken, steel,
a blast, a capsule caught, a bolt fired, a ball lost, and a level cleared,
which a new best and an extra life share. A brick broken rises a semitone
for each in a streak, up to an octave, which rewards a streak by ear. The
Sound button in the bar, pressed while sound is on, mutes it, and the
setting is kept, as in Snake.

#### The shell

One folder per feature under `src/app/`, as in the other games:

- **`play/`:** `GameService` holds the run in a signal and the field outside
  one; `tick(ms, steer)` runs the stepper and copies what changed into the
  run; it launches, fires, pauses, resumes, starts levels and runs, asks
  before a new run throws one away, says what happened, and keeps the
  records. `SavedGameService` keeps the run under way.
- **`board/`:** `BoardComponent`, a focusable application around
  `<fz-phaser-canvas>`, as Snake's, which builds `BricksSceneOptions`, loads
  the scene with `import()`, hides the pointer over the field while a ball is
  in play, and lays the cards over the field:
  - **Ready:** the level's number and name, and how to launch ("Press Space,
    click or tap to launch").
  - **Paused**, with Resume.
  - **Cleared:** the level's bricks, streaks and bonus, and Next level,
    which Enter or Space presses too.
  - **Ended,** once the result card is put away, with New game.
  - **Still loading** and **couldn't be drawn,** as Snake's.
- **`bar/`:** the link home; "Brick Breaker" with the speed as a
  `<fz-bar-choice>` badge; the level, the score, the best, the lives as
  hearts as Minesweeper draws them, and the streak's multiplier while it is
  above one; then Pause, Sound, Levels, New game, How to play and Settings.
  On a compact screen, Pause and New game stay and the rest go in the
  overflow menu.
- **`levels/`:** the Levels dialog: each set under its name, its levels as
  buttons in a grid, each with its number, name and best, and a tick once
  cleared; a level not yet open is shown but can't be chosen
  (`aria-disabled`, "Locked"). Choosing one asks first if a run is under
  way, then starts a run there.
- **`result/`:** the card over an ended run, once the last ball's fade has
  run: "Game over" or "Every level cleared!", the score, the level reached,
  the levels cleared this run and the best, and "New best!"; then Try again
  from level n, which starts a run at the level it ended on, and Choose a
  level.
- **`help/`:** How to play: the aim, the controls in a table (mouse, touch,
  keys), then the bricks, the capsules and the balls, each with its name
  and its sentence from the catalogs, and its picture once the field has
  drawn.
- **`settings/`:** the speed, how a finger steers (drag, or follow), the
  sound and the palette.
- **`stats/`:** `StatsService`, the records.
- **`styles/`:** `global.scss` and `_index.scss`, as in every game.

The room (`[fzPlayRoom]`) holds the board, and the board takes the focus as
each level begins and whenever the last dialog over it closes, as Snake's
does.

#### Controls

| Action       | Mouse                       | Touch                                                                                                       | Keys                                    |
| ------------ | --------------------------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| Steer        | Move it; the paddle follows | Drag anywhere on the field, below the paddle is best; or the paddle follows the finger, as the setting says | ← and →, or A and D, held               |
| Launch, fire | Click                       | Tap                                                                                                         | Space, or ↑ or W                        |
| Pause, go on | Pause in the bar            | Pause in the bar                                                                                            | P toggles; Escape pauses; Enter goes on |
| Next level   | Next level on the card      | Next level on the card                                                                                      | Enter or Space                          |

- **Keys are read by `event.code`,** so an AZERTY keyboard steers with Q
  and D. The single-character keys work only while the board has the focus,
  as WCAG 2.1.4 asks, and Phaser's captures are only the keys the game
  uses that would scroll the page.
- **A held key is a held key,** unlike Snake's single presses: the scene
  follows key down and key up, and forgets every held key whenever the game
  pauses, so a key let go while the focus was away doesn't stick.
- **The mouse's paddle follows the pointer anywhere over the canvas,** and
  stays where it was when the pointer leaves.
- **Dragging is the default on a touch screen,** since a finger on the paddle
  hides it and the ball near it; the paddle moves as far as the finger
  does, from wherever it lands.

#### What it keeps

Each entry in `localStorage`, versioned with `writeVersioned()`, its reader
dropping what it can't trust rather than failing:

- `brick-breaker-settings`: the speed, how a finger steers, and the sound.
- `brick-breaker-stats`: for each speed, the runs, the best run's score and
  the furthest level reached; and for each level's id, its best score at
  each speed.
- `brick-breaker-progress`: the ids of the levels cleared, at any speed,
  which open the levels after them. Ids no level has any more are dropped.
- `brick-breaker-game`: the run under way and its field's bricks, each
  brick's hits left and a regrow's time; written as a level starts, as a
  ball is served, on a pause, and as the page goes away, never at a step,
  and forgotten once the run ends. It is taken up paused with the ball on
  the paddle: the bricks, the score, the lives and the level are as they
  were, and the balls in flight, the capsules and the effects are gone
  (decision 16). `restoreGame()` drops a level id it doesn't know, a field
  that doesn't fit its level, or numbers out of their ranges.

#### Accessibility

Brick Breaker is a game of watching and reacting, so the plan doesn't claim
a screen reader user can play it. It makes sure that:

- every control around the field, and every dialog, is reached and named
  through the libraries' pieces, the Levels dialog's grid of buttons
  included;
- the field is played by keyboard alone, from a focusable element with
  `role="application"`, named "Brick Breaker, level 3: Pyramid" and
  described by its keys; the canvas in it is hidden;
- the pace is the player's: Relaxed is a slower ball with no bad capsules,
  nothing launches until the player does, and the game pauses on a key, on a
  button, and whenever the player looks away;
- the announcer says each turning point, never each brick: a level's start
  ("Level 3, Pyramid. 37 bricks."), a capsule caught ("Wide paddle."), a
  ball lost ("Ball lost. 2 lives left."), an extra life, five bricks left, a
  level cleared with its score, a pause, going on, and the end with the
  score and a new best;
- color is never the only signal: each brick kind has its pattern, each
  capsule its symbol and its shape, each ball kind but the normal one its
  mark, which holds still; the contrast spec holds every tint, kind, ball
  and capsule to 3:1 against the field, each ball and capsule against its
  outline, and the outline against every tint, in every palette, and
  checks the canvas's washes against what the CSS resolves, as Snake's
  does;
- motion follows the player's preference: without it, bricks appear without
  dropping in, there are no shards, embers or shakes, a blast's ring is
  left out, the last bricks' glow holds still rather than pulsing, and the
  cards open without waiting. The ball's own movement stays, since it is the
  game;
- nothing flashes: no effect covers more than a small part of the field, a
  blast's chain is spread out in time, and no effect blinks.

#### Testing

Each layer where it runs, from the bottom up, on the patterns of the
`snake-testing`, `sudoku-testing` and `angular-testing` skills:

| Layer    | Where                              | How                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| -------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rules`  | Node                               | Fields drawn with `fieldFrom` (`src/testing/field_picture.ts`: the bricks as a picture in the legend's characters, the balls and the paddle placed by number): a face, a seam, an exposed and a hidden corner, a ball too fast for any step, the paddle's angles, the limits, a lull broken, the climb and its resets, each trait and each effect, the draws and the cap on falling capsules, streaks, extra lives, a cleared level, a lost run, the stepper's cap, the same seed and steering giving the same field, a saved game read back |
| content  | Node                               | The catalog, levels and autopilot specs above                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `view`   | Node                               | Metrics on whole pixels at odd sizes and ratios; every frame `atlasFrames()` lists, within its size; steering from keys, the mouse, a drag and a tap; each event's effects, with and without motion; the palette and the contrast spec                                                                                                                                                                                                                                                                                                       |
| `scene`  | jsdom, real Phaser                 | `runScene()` with a fake shell, as Snake's: `tick()` gets each frame's time and a `Steer` from the keys and the pointer the spec drives; bricks shown and hidden as the field changes; each event played once; no new game object after the first level; nothing with motion off; a new palette re-bakes; the pictures handed over; nothing called after `destroy()`                                                                                                                                                                         |
| `app`    | jsdom, `provideFakePhaserCanvas()` | Testing Library by role and name: the cards, the bar, the Levels dialog, the result, How to play, the settings, storage with an in-memory store, pausing through `[fzPlayRoom]`, and `tick()` playing a level to its end                                                                                                                                                                                                                                                                                                                     |
| The page | headless Chrome, the build         | `tools/check-layout.mjs` on `@fz/dev/layout`, below                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |

The floor on `src/rules/` and `src/view/` is Snake's and Sudoku's: 100% of
statements, functions and lines, and 95% of branches.

#### Performance

- **`update()` allocates nothing:** the `Steer`, the frame and the events
  are reused records, the painters' objects are made once, and the field
  steps in place.
- **One texture for the field,** so its few hundred images draw in a batch
  or two; the tags' `Graphics` is the only thing redrawn each frame.
- **The physics is small:** eight balls at most, each touching a few cells a
  step, 120 steps a second.
- **The budget,** as Snake's: a frame under 4 ms of script with the CPU
  throttled six times, at 60 and 120 Hz, with eight balls, three capsules,
  a blast chain and the shards going, measured with a performance trace at
  Q5.

## Risks

- **The feel is everything, and no spec can judge it.** The speeds, the
  angles, the climb and the paddle's response are settled by playing at Q3,
  again at Q4, and again at Q5, with the numbers kept in one file.
- **Physics has corners, literally.** A seam, a corner beside a wall, a
  paddle swung into a ball, two balls on one brick, a ball at the top speed:
  each is a spec in B2 before anything draws, and the sweep never lets a
  ball through a brick, so the worst a bug can do is a wrong turn.
- **Thirty levels take time to design and tune.** The autopilot and
  `yarn report:levels` turn tuning from guesswork into numbers, and the
  first set is playable and judged before the other two are drawn.
- **The autopilot in CI.** Thirty levels at three speeds is ninety plays,
  each well under a second in Node; if the suite slows, the spec plays one
  speed per level by turns, and the report plays them all.
- **A field on a phone held sideways is small,** about 12 CSS px a unit. Q3
  plays it there, and the layout check holds the unit to 10 CSS px or more.
- **Eight tints at 3:1 against the field and against the ball is a narrow
  band** of lightness, in a light palette most. B5's contrast spec decided
  it: in the light palettes the plain ball clears eight hues in the band,
  but the fire and blast balls can't, nor can a capsule, so every ball and
  capsule has a thin outline in the field's color, and the tints answer
  only to the field, which let the dark inks be brighter.
- **A blast chain could flash.** Effects are small and spread in time, and
  B12 plays Chain reaction looking for it.
- **The lift changes a live game.** Snake's suite, its layout check, its
  screenshots, its sounds' bytes and a scripted run, against the build
  before, and a merge of its own, keep a regression apart from Brick
  Breaker.
- **Held keys stick when the focus leaves.** The game pauses whenever it
  does, and forgets every held key when it pauses.
- **A browser's `Math.sin` differs across engines.** Nothing is replayed
  across browsers; a saved game keeps where things are, not how they got
  there.

## Not in this plan

- Moving, growing and shooting bricks, enemies and bosses, which "Worked
  examples, for later" shows the way to.
- A level editor, levels shared by link, a daily level, two players,
  leaderboards, stars and achievements.
- A Warp capsule (decision 15), a paddle that shrinks at the ceiling, and a
  preview of the ball's path.
- A gamepad, music and a trimmed Phaser build.
- A Content Security Policy for `/play/brick-breaker/`; no game carries one,
  and Brick Breaker loads nothing from another origin.
