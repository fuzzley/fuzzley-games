# Work log: the integration

The integrator's log for the build `implementation-plan.md` lays out: each
package started and landed, its checks, what collided and how it was
settled, the rebases onto `main`, and the verify runs. The newest entry is
last. Each package keeps its own log beside this one, `<package>.md`.

- **Branch:** `asteroid-breaker-uplift`, in the worktree
  `.claude/worktrees/abu`, cut from `origin/main` at `e6740e04`.
- **Packages:** each on `abu/<package>`, in `.claude/worktrees/abu-<package>`.

## What was asked (2026-11-15)

Implement the Asteroid Breaker uplift's design, reusing library code
between the games where possible, with close attention to readability,
engineering practice and each framework's, language's and library's style;
keep a detailed work log and commit regularly, each commit through the
`commit-review-process` skill; write a detailed implementation design first,
with a strategy for agents to work in parallel, and go on without waiting
for approval; when done, delete the work log, merge into `main` and push.
Another session is speeding up CI; once its changes land on `main`, take
them into the working branches.

## Log

### 2026-11-15, the implementation plan

- **Read:** `plan.md` whole, its mocks, the art's and the sound's kits, and
  the Brick Breaker uplift's implementation plan for how its build ran.
  Four read-only agents mapped the code at `e6740e04`: the sound, the art,
  the rules and the shell. What they found is folded into
  `implementation-plan.md`'s §3 to §6.
- **Measured** at `e6740e04`, warm: the game's tests 42 s on eight workers
  (5,219 specs in 95 files), its lint 23 s, its typecheck 14 s.
- **Found:** ffmpeg isn't on this machine, though the kit was encoded with
  it. Fetching a packaged ffmpeg was refused by the session's permissions,
  and isn't worked around. So the encodes the user heard ship as they are
  (C2), and `build:sounds` encodes only where ffmpeg is installed.
- **Found:** the main checkout is on `local-pipeline`, another session's,
  with its changes staged, four commits ahead of `origin/main`. Nothing is
  done there.
- **Wrote** `implementation-plan.md`: twenty-five settled points, five lifts,
  twenty-one packages in five streams, up to five agents at once.

### 2026-11-15, the plan's review, and a pause

The commit review of the plan found twelve points, each checked against the
code and taken:

1. P1 shows L6's `faceOf()` and R3 adds kinds whose art is L1's: both now
   wait on them.
2. A `halos` layer under the shots lay over the rocks, pickups and comets
   it glows round: it is now just above the place and the field.
3. A `Graphics` has no radial gradient and a texture made from one shows
   none: the backdrop's washes are painted on a canvas through
   `drawCanvasTexture()`, by a painter of commands L3 adds; `svgOf()` writes
   them as SVG gradients.
4. R1 gave `home` and `lost` new meanings unsaid: C17 now says which events
   count as a stray brought home (`joined` and `home`, never `floated`),
   that `lost` is the run's end and `knocked` buzzes too, that a clean wave
   is one with no hit taken (`Field.hits`), that `FIRST_SHIPS` and
   `MAX_SHIPS` are renamed, and that a hit's 1.5 s is `guardShip()`'s.
5. C15 read `pods.json`'s `pilot` wrongly: the fuzzball's whole grid is
   drawn 1.18 field units wide.
6. Up to three L packages run at once over one stream's files: §7.3 now
   gives each package its own files, the shared ones add-only.
7. Three sound handoffs were unsaid: whichever of a rule and its sound
   lands second wires it (§5.1), and the weapon on `fired` is S3's, which L4
   waits on.
8. The mix would have existed twice, the sound lab's beside the player's:
   the rules are pure in `@fz/core/sound_mix`, which both take up; and C8
   now keeps today's sprite as the lab's "before", as `plan.md` asks.
9. The packer must lay the sprite out as the kit's `encode.mjs` did (a
   0.06 s gap, no fade), and the spec holds each take's start and end.
10. Under a normal map a face's color is the shader's: the view works out
    the lit and shaded extremes for the contrast spec.
11. The root's whole `yarn test` would take the machine: a library's
    commit tests only the workspaces using the changed entry; the frame
    budget is measured side by side in one sitting; a package cut before a
    rebase onto `main` lands with `git rebase --onto`.
12. The smaller points: `mono` joins the sound settings, `SAVED_GAME_VERSION`
    rises once for the branch, the tuning record is `Sparking` apart from
    the `charge` state, the tally keeps static's extra apart from the
    sparks' points, and Endless's boulders stay as they are.

- **Paused at the user's ask (2026-11-15):** nothing is built, and nothing
  heavy runs, until the session optimizing CI has finished and verified its
  gains, so the build doesn't weigh on its measurements. The plan's commit
  waits too, since its checks run the root's lint across every workspace.

### 2026-11-15, the plan's second review

The fixes reshaped the plan's dependencies, contracts and ownership, so it
had a second review, which found fourteen points, each checked and taken:

1. The art four look packages port draws at part strength (cracks, glints,
   auras, halos), and only L3 added alpha: a small first package, L0, adds
   it, and L1, L3 and L5 wait on it.
2. L4 and L6 both drew the flame: it is L6's.
3. `EVENT_EFFECTS` holds each event's sound and flourishes on one line: S3's
   first commit splits it, the sounds into `sounds.ts`, the flourishes
   staying in `effects.ts`, which F owns.
4. S1 deleting today's sprite broke the sound lab, which imports it: S1 no
   longer touches the game's sprite; S3 moves it into `tools/sound-lab/` and
   repoints the lab in one commit.
5. S1 loaded two formats, which S2 makes: the game switches to the new
   sprite in S3, after both.
6. A rules package landing while a sound package worked would have its
   events unwired: a sound package wires every event on the tip it lands on.
7. A `wash` member of `DrawCommand` would break the games' exhaustive
   switches over it: it is a `WashCommand`, in `PaintCommand`, which only
   `svgOf()` and the canvas painter take.
8. The sprite writer must learn the gap and the fade as well.
9. `isUntouchable()` doesn't exist: the guard is read by `isGuarded()`, and
   `HIT_GUARD_MS` is a new number.
10. F1's shot flash is L4's art: F1 waits on L4.
11. Five files had no owner: `stray_painter.ts` is L6's, `ring_painter.ts`
    F's, `warning.ts` L4's, and `frame.ts` and `painter.ts` add-only.
12. R1's reshape of `Crew` and its renames are covered as its removals were.
13. §5.2's tones are C9's way's, the extremes under a normal map.
14. Two wordings: the kit's `sounds.json` names no events, only its
    sounds' uses in words; the build is twenty-one packages and Z1.

Also taken: `@fz/phaser` comes to depend on `@fz/core`, and `@fz/dev`
imports it only from `sound_lab_mix.ts`, never from what Node runs.

### 2026-11-15, the pause ends and wave one starts

- **The CI session finished:** it merged its local pipeline audit into
  `origin/main` as `6a5b58e6` (eight commits) and Verify passed there in
  3 min 32 s. The build resumed then.
- **Rebased** `asteroid-breaker-uplift`, whose plan commit was `3a0d4f76`
  on `e6740e04`, onto `origin/main` at `6a5b58e6`, taking the CI changes in
  (`tsc7` for every typecheck pass but Angular's, the layout check's pages
  in parallel, Node's compile cache for the tests, `yarn verify:changed`),
  reinstalled, and ran the root's lint (37.8 s, clean). The plan is now
  `da697c6e9`.
- **Wave one started** from `da697c6e9`, each package in its own worktree
  with the common brief and its own: L0 (alpha), R1 (the crew in tow), S1
  (the synth and the sounds), S2 (the mix) and P2 (one card between waves).

### 2026-11-15, L0 landed, L1 started

- **L0 landed** as `7fdcc371`, alpha on every drawing command,
  fast-forward from `da697c6e9`, so nothing needed settling and its own
  checks stand for the tip: the library's lint, typecheck, tests and
  coverage, the root's lint and typecheck, and the tests of every game
  using `@fz/phaser/shapes` or `/scene` (Asteroid Breaker, Brick Fuzz Pop,
  Brick Breaker, Solitaire, Snake), each unchanged. Two reviews; the first
  removed a `faded()` helper that wasn't the kit's group opacity, which a
  drawing meant at part strength gets by baking at full strength and
  `setAlpha()`.
- **The common brief corrected:** the root's `yarn test --only …` sets its
  own `--maxWorkers` and Vitest rejects a second, so a library's users are
  tested each with `yarn workspace <name> test --maxWorkers=4`, two at a
  time, in one hold of the lock. S1 and S2 were told, and
  `implementation-plan.md` §9 says so now.
- **L1 started** from `7fdcc371`, in the slot L0 freed. L5 and L3, also
  waiting on L0 alone, wait for the next slots.

### 2026-11-15, P2 landed, L5 started

- **P2 landed** as `2099d621`, one card between waves and a sector's card,
  rebased from `da697c6e9` onto L0's tip with nothing to settle (L0
  changed only `@fz/phaser`). On the rebased commit the game's typecheck
  passed and its 5,274 specs in 96 files passed on four workers (53 s);
  its lint, layout check and coverage stand from its own tip, since the
  rebase brought only `@fz/phaser`'s change, and the root's lint ran over
  it at S1's landing. Two reviews, ten findings, all taken; its log holds
  them.
- **Outside its files** P2 moved `wavesInWords()` from the Sectors dialog
  into `src/app/play/sector_card.ts`, and added docs to `check-layout.mjs`,
  the game's `AGENTS.md` and its two skills.
- **R1 was told** what P2 changed in `game.service.ts`, the board's card,
  `run_frames.ts`, `run_state.ts` and `tally.ts`, and asked to rebase onto
  the tip before it reports, settling the crew row (`crew().flying`) and
  the tally's labels with P2's card flow, so the package that knows the
  crew settles them.
- **Left for later packages:** P1, the bar's comment on the Ready card,
  which is gone; P3, the crew's cheer on the Cleared card's
  `app-pilot-row.crew`, the layout check opening the Cleared card too, the
  trophy's card a little taller than a field just over its height, and the
  sector card over the waiting ship at 320 × 480.
- **L5 started** from `2099d621`.

### 2026-11-15, S1 landed, L3 started

- **S1 landed** as `861a9622` to `c97a30ae`: `@fz/dev/synth`, and the
  game's recipes, build and the kit's encodes beside today's sprite.
  Rebased onto P2's tip with nothing to settle, though both added to the
  game's `AGENTS.md` and testing skill. On the rebased tip the root's lint
  passed (37 s, under the lock), and the game's typecheck and its 5,291
  specs in 97 files passed on four workers; `@fz/dev`'s typecheck, tests
  and coverage stand from S1's own tip, which P2's change doesn't reach.
- **What S1 proved:** the kit's build and the game's render the same 178
  takes, the sprite's 172 and six beds, every WAV byte for byte
  (29,426,490 bytes), and the same map and sprite WAV handed to ffmpeg;
  `synth.spec.ts` holds 36 renders to the kit's digests. Without ffmpeg
  the build writes nothing into `src/scene/sounds/`, so the shipped
  encodes are the kit's.
- **Left for S3**, in its brief: the game still plays
  `sounds.wav`/`sounds.json`, which nothing rebuilds now; they go to
  `tools/sound-lab/` when the game plays the new `sprite.{ogg,m4a,json}`;
  `tools/sound-lab.ts:23`'s comment cites recipes that are gone. **Left
  open:** the synth's `seeded()` repeats `@fz/core`'s Mulberry32, which S2's
  fences explain (below). Nobody has heard the sounds in the game yet.
- **L3 started** from `c97a30ae`. S3 waits on S2.

### 2026-11-15, ffmpeg installed

- **The user installed ffmpeg** (7.1.5, Debian's, with `libvorbis` and the
  native `aac`), so the build's last step, unchecked until now, ran here:
  `yarn build:sounds` on the tip rendered all 178 takes, packed the
  sprite's 172 and encoded the sprite and the six beds, fourteen files, in
  51 s.
- **The map is the kit's:** `sprite.json` and `sprite_lengths.json` came
  out unchanged, so the packing is proved on a machine that encodes.
- **The encodes differ from the kit's,** as two builds of a lossy encoder
  do: three of the fourteen came out byte for byte (the Iron reach's, the
  pulse's and the Storm's M4A), and eleven differed. Decoded and compared
  with the kit's, the Ogg sprite's difference is 43 dB under the signal (16
  bytes apart), the M4A sprite's 24 dB (about 1 KB apart, as AAC's
  quantizing differs), and the pulse's Ogg's 73 dB (6 bytes apart).
- **The kit's encodes stay,** as C2 says, since they are what the user
  heard, and were restored by name. Now that ffmpeg is here, a full
  `build:sounds` in any worktree overwrites them: after a build that
  changes no recipe, they are restored by name before a commit. S3's brief
  says so, and S4's will.

### 2026-11-15, S2 landed, S3 started

- **S2 landed** as `09d607a2` to `94a1a90d`, four commits:
  `@fz/core/sound_mix`, `SpritePlayer`'s mix, limiter, mono switch and
  sources in several formats, `LayerPlayer` for the beds, and the sound
  lab on the mix's formulas at its own numbers.
- **Settled on the rebase onto S1:** `frontend/lib/dev/eslint.config.js`,
  where S1 had added a block letting the synth assert a bounded read
  (`x[i]!`) and S2 the fences keeping `@fz/core` out of every module but
  the lab's mix. They are independent, so both stay, the synth's first.
  `lib/dev/AGENTS.md` merged by itself, and reads whole. The range-diff
  shows two deltas and nothing else: L0's line in `lib/phaser/AGENTS.md`'s
  `src/scene/` entry, beside S2's `src/sound/` edit, and the config's
  union, which the integrator read and the lint checked. The fence also
  answers why the synth keeps its own `seeded()`: Node runs the synth, and
  no module Node runs may import `@fz/core`.
- **Checks on the rebased tip:** an install (the lockfile gains
  `@fz/core` for `@fz/phaser` and `@fz/dev`), `@fz/dev`'s 892 specs, and
  under the lock the root's lint and typecheck, and Asteroid Breaker's
  5,291 specs and Brick Fuzz Pop's 6,489, the other game whose sound lab is
  `@fz/dev`'s page. All passed. `@fz/core`'s and `@fz/phaser`'s specs stand
  from S2's own tip, since S1 changed neither.
- **Left by S2,** for the user at Z1, since no package is asked to: the
  lows aren't panned less than the highs, a voice that gives way stops
  with no fade, and a sound already playing isn't ducked. For S4, in its
  brief: `followMono()` for the mono switch, `LayerPlayer` with a
  `SoundLayer` for each bed and layer, held every frame, and `fetch()` on
  the next sector's bed ahead of the change.
- **S3 started** from `94a1a90d`, with S1's and S2's notes in its brief.

### 2026-11-15, R1 landed, R2 started

- **R1 landed** as `bd9af6f2` to `4e9f6339`, five commits, fast-forward:
  it had rebased itself onto P2's tip, settling three conflicts by keeping
  both sides (`run_frames.ts`' docs, the board card spec's imports, the
  game's `AGENTS.md`), and onto S2's tip with none.
- **One settlement added code:** P2's Cleared card read the old
  `crew().flying`, so R1's second commit, already reviewed, gained
  `pilotsAboard()` in `pilots.ts` with its spec, which the bar and the card
  both read. No reviewer saw that delta, so the integrator read it: three
  lines, the pilot then those in tow, none once no one is at the controls,
  each case held by the spec, its two users `computed()` over
  `GameService.crew()`. Sound.
- **Its checks** ran on S2's tip: the game's lint, typecheck and 5,357
  specs in 99 files (the `sim` project at every speed among them), the
  root's lint under the lock, and the coverage at its floors.
- **Its figures:** every wave cleared at every speed on the narrow field
  and the wide, times and strays as before; at most two knocked loose and
  one floated home a play, and no run ended, over twelve seeds. In a
  browser the announcer read a hit, a fuzzball floating home, no one in
  tow and the game's end, in order.
- **Outside its files:** `play.ts`' spec waves and `loseShip()`,
  `run_frames.ts` (a stray brought home is `joined` or `home`, `knocked`
  buzzes), `effects.ts` (the new events silent), `frame.ts`' `tow` and
  `loose`, How to play's stray row and clean bonus, and the shell's specs.
- **Left:** P3 draws `FieldView.loose`, which nothing draws yet, pairs
  `field.tow[i]` with `field.crew.tow[i]`, finishes How to play, renames
  `loseShip()` and the shell's "ship lost" spec titles (P2's names, which
  P3 owns now), and removes `toPickup()`, unused; the tally's "No ship
  lost" is R2's; `gained` is gone, though its sound is still in the old
  sprite, which S3 moves out.
- **S3 was told** to rebase onto `4e9f6339` and wire `knocked`,
  `recaught`, `floated` and `joined`. **R2 started** from `4e9f6339`.

### 2026-11-15, L5 landed

- **L5 landed** as `3c244ca1` to `c0e8b0e3`, three commits: the nine
  faces, the look and the fur by force and by static as data in
  `@fz/style/fuzzball`, commands in `@fz/phaser/fuzzball`, and
  `<fz-fuzzball [face] [lift]>`. Rebased from `2099d621` onto R1's tip with
  nothing to settle, though L0, S2 and L5 all added to the `phaser-core`
  skill. On the rebased tip: an install, and under the lock the root's lint
  and typecheck, Asteroid Breaker's 5,357 specs and `@fz/phaser`'s 1,032,
  all passing. `@fz/style`'s and `@fz/ui`'s specs, and the brick games',
  the site's and `@fz/game-ui`'s, stand from L5's own tip, which nothing
  landed since reaches but `@fz/phaser`, run here again.
- **Its frame budget:** wave 9 at a quarter of the CPU, median frame
  5.21 → 5.56 ms and 3.95 → 4.70 ms in two pairs, within a third. L5
  changed no game's code, so the gap is the machine's load, which other
  sessions' pages shared.
- **Left:** for P1, `<fz-fuzzball>` has no look, lean or small-form input,
  though `fuzzballDrawing()` takes them, should the face cam need one; for
  L6, the sparks' colors on a canvas; for the user at Z1, the halos drawn
  under all the cores, where the kit interleaves them.
- **No package is ready for the slot:** L6 and L2 wait on L1, P1 on L6, L4
  and S4 on S3. Four run: L1, L3, S3 and R2.
- **The log's review** found ten points, each checked and taken: two
  slips (the AGENTS.md L0's line is in, and the takes counted), hashes a
  reader can find for every landing, the encodes' warning made plain, the
  review of R1's settled delta, the checks of each landing said in full,
  an owner for everything a package left, L5's frame figures explained,
  §9's command corrected, and a verify run, which follows.

### 2026-11-15, a verify run on the tip

- **On `c0e8b0e3`,** six packages landed, under the lock, what
  `yarn verify` adds to each landing's lint and typecheck: every
  workspace's tests, two at a time on four workers each, then the build,
  then Asteroid Breaker's layout check, in 3 min 13 s, all passing.
- **The specs:** Solitaire 6,874, Brick Fuzz Pop 6,489, Asteroid Breaker
  5,357, Brick Breaker 3,916, `@fz/phaser` 1,032, `@fz/dev` 892, Sudoku
  607, `@fz/core` 460, Snake 423, `@fz/style` 402, Minesweeper 375,
  `@fz/ui` 335, `@fz/game-ui` 335 and the site 177.
- **The layout** holds at every shape and turn with the deck shown, P2's
  card over a waiting wave and R1's crew in the bar among them.
- **The next run** is due after three more landings, or sooner after one
  that changes a library many games use.

### 2026-11-15, L1 landed, L2 and L6 started

- **L1 landed** as `f8ec58e8` to `4e7c1bee`, four commits: the light's
  spike, which chose a normal map; the kit's rocks ported; the seven kinds
  cut and lit, with their cracks and the struck faces' flash; and How to
  play's rock pictures lit by the field's light. Lift 5 wasn't needed: the
  rocks' atlas is 2,322 × 2,600 at 32 px a unit.
- **Settled by the integrator on the rebase from `7fdcc371`:** the testing
  skill, where P2 had added the Cleared card's sum to `run_state.spec.ts`'
  line and the tally's spec after it, and L1 the rocks' atlas and normal
  map to `art_frames.ts`' line. Both kept, in that order, a paragraph's
  merge; the rest merged by itself.
- **Checks on the rebased tip:** an install, the root's lint under the
  lock, the game's typecheck, and its coverage at every floor over its
  5,565 specs (3,945 in the `pure` and `dom` projects, 1,620 in `sim`).
- **Its frame budget:** wave 9 on the 88 × 40 field at a quarter of the
  CPU, traced before, after, after, before in one sitting: 0.78 ms before
  and 0.83 ms after, pooled medians of scripting and rendering, within the
  1.04 ms a third more allows. These are about a fifth of what L1's spike
  measured for the same build, as the GPU paced the frames differently
  under the machine's load, so only the pair within one sitting counts,
  here and in every package's figures below.
- **For §12:** a light for each mode, high in a light palette and low in a
  dark one, a departure from `plan.md`'s one light, since no one light both
  shades a rock and passes the contrast in both; the spike's figures and
  the choice; and the normal map's cost on the GPU, about 6 ms a frame
  (+31%) in the spike, which the page's figures don't show and only a
  phone will, for the user to feel.
- **Left, each with an owner:** for L4, three of Phaser's ten lights are
  taken (the far light and the flash's two), a far light is dropped first
  past ten, and the light palettes' bound is passed while a blast lights a
  face, which L4 says it allows or not; for L6, the rocks' atlas and its
  normal map are baked and destroyed together; for F1, the empty `flash`
  layer in `LAYERS`, used or removed; for §12, the normal map uploaded to
  the GPU twice (about 24 MB more), a corner rock's fourth copy unlit by
  the flash, the flash's cone declined, and the pictures' faint marks near
  the shader's, within about 25 of 255.
- **L2 and L6 started** from `4e7c1bee`, with L1's and L5's hand-ons in
  their briefs. L3 and S3 were told to rebase onto it before they report,
  since both meet L1 in `belt_scene.ts`.

### 2026-11-15, L3 landed

- **L3 landed** as `1d5823ca` to `e0d34473`, four commits, fast-forward:
  `@fz/phaser`'s `WashCommand` and `PaintCommand` painted on a canvas into
  a texture painted again after a lost context (`paint_canvas.ts`); the
  four sectors' places ported from the kit, held quiet by measure; each
  wave's place painted behind the field, its near stars sliding against
  the pod's travel and the Storm's forks flickering by the field's steps,
  both still where motion isn't welcome, in place of the specks; and,
  asked for by the integrator before landing, a commit removing what the
  specks left unused (`FRAMES.speck`, `BeltPalette.speck`,
  `SPECK_STRENGTH`) and writing the light's way across the field once
  (`LIGHT_ACROSS` in L1's `rock_light.ts`, which the landmarks take).
- **Settled on its own rebase onto `4e7c1bee`,** at the integrator's word,
  each read by L3's third review from the range-diff: the `phaser-core`
  skill's triggers, `palette.ts`' `mode` (one kept, with both docs'
  clauses), the testing skill and the game's `AGENTS.md`'s painters, each
  keeping both sides, and `belt_scene.spec.ts`' imports, L1's taken and the
  specks' and `CONSTELLATION`'s dropped with the specks.
- **Its checks on the tip it landed on:** the game's lint, typecheck and
  5,890 specs, the root's lint under the lock, and the coverage at every
  floor; after the rebase also `@fz/phaser`'s lint, typecheck and 1,064
  specs and the root's typecheck.
- **Its frame budget:** median scripting and rendering on the widest field
  at wave 9, a quarter of the CPU: 4.58 ms before and 4.14 ms after, the
  rebased build against `4e7c1bee`, the tip it rebased onto; about a fifth
  either way run to run, within the budget.
- **Left, each with an owner:** the `field` layer is empty, kept as §5.2's
  place for it, for L4, P3 or P4 to use, or Z1 to remove if none does;
  `BLEED_CSS_PX` is the field's kick and shake, so whatever moves the
  field's camera further raises it (F1); the `canvasTexture()` spec helper
  repeated in `@fz/phaser`'s canvas specs, one helper in its testing entry,
  L4's, which was told. For §12: the Storm takes four field-sized
  textures, the others three; `context.place` could fold into `stage()`;
  no flash was caught on screen at its peak, though the scene's specs hold
  its layering.
- **No package was ready** for the slot it freed: four ran, S3, R2, L2 and
  L6.

### 2026-11-15, S3 landed, L4 and S4 started

- **S3 landed** as `2d28e899` to `7040517b`, five commits, fast-forward:
  `EVENT_EFFECTS` split, each event's sound into `sounds.ts` and the
  flourishes staying in `effects.ts`; the game on the uplift's sprite, Ogg
  or M4A, by the view's mix of 92 sounds, the old sprite moved into
  `tools/sound-lab/` as the lab's "before"; the weapon on each `fired`
  (C14); every event played by the plan's table through `FieldSounds`, R1's
  four among them; and the sound lab, every sound and its takes, the mix
  on or off, before beside after, the ZzFX candidates gone.
- **Settled on its own rebases:** onto R1's tip, wiring R1's four events,
  its range-diff read by a review; onto L1's, three conflicts in the
  skills, each keeping both sides; onto `e0d34473`, `belt_scene.ts`, where
  L3's `context.place` and S3's `hearField()` both stay, in that order.
- **Its checks on that tip:** the game's lint, typecheck and 6,156 specs
  in 115 files, its coverage at every floor (`src/view/effects` at 100% of
  statements), and under the lock the root's lint and typecheck and
  `@fz/phaser`'s 1,064 specs; at its last commit before the rebase, every
  workspace using `@fz/core`, `@fz/phaser` or `@fz/dev` under one hold of
  the lock. In a browser it read the audio graph for takes in turn, the
  variation and pan, the ladder, the multiplier's chimes, the shot's tail,
  `dash-ready`, the knock's two sounds and the thrust's loop; in both
  labs, each play's route through the limiter or past it.
- **The download:** the sprite is 1.01 MB as Ogg and 1.31 MB as M4A in
  the build, no WAV and nothing of the lab: about 0.8 MB more than the old
  208 KB WAV in Chrome and Firefox, 1.1 MB more in Safari, within §9's
  "about 1 MB".
- **Left, each with an owner:** for S4, `@fz/dev/zzfx`, unused now; the
  lab's `GameMix.plan()` repeating `SpritePlayer`'s per-play steps, made one
  pure step in `@fz/core/sound_mix`, dropping `earlierDuck`, which does
  nothing with `DUCK_AT_START`'s attack of 0; the sounds read from the
  field's state (the thrust's start and stop, the guard's end, the comet's
  pass, Slow's and the Shield's start, and the lodestone's hum); and
  whether `crew-caught` beside `wave-clear`, as a wave's clearing takes
  the loose back, and `crew-home` for a loose one caught with the line
  full, are right as heard. For R2, `near-miss` on its `grazed`; for P3,
  `tow-twang`; for R4, the burr's. For F1, a sight for `dropped`, `faded`
  and `strayed`, which §6 asked of S3 beside their sounds and which are
  still quiet in `effects.ts`: F owns the flourishes. For §12, the lab's
  mixed "after" plays a dB or two louder than "before", by Web Audio's
  makeup gain, as its notes say.
- **R2 was told** it lands after the sound package, so it wires its own
  events' sounds and moves the ladder from the chain to the sparks; R2, L2
  and L6 were told to rebase onto `7040517b` before they report.
- **L4 and S4 started** from `7040517b`, five running with R2, L2 and L6.
  L4's brief carries L1's lights and halos (`rockShape().glows`, the
  palette's mode for the halo's strength, the lights taken), L3's
  `paintTexture()` and wash, and S3's `weaponOf()`; S4's carries S2's
  `followMono()`, `LayerPlayer` and `fetch()` ahead of a change, S3's
  leftovers above, and the warning that a full sound build now overwrites
  the kit's encodes. Both were sent the leftovers named since.

### 2026-11-15, L6 landed, P1 started

- **L6 landed** as `a423098b` and `bcf01329`, fast-forward: the pilot's
  face, look and lean chosen from the field (`faceOf()`, `lookOf()`,
  `liftOf()` in `src/view/art/faces.ts`), and the pod, Bumble, lit by L1's
  normal map, its pilot upright at the canopy, the rim filling with the
  dash's charge, the Shield's shell, the guard's dashed ring, the twin
  flames and the exhaust, and the strays in the same art; `ship_art.ts` is
  gone, `PodPainter` in `ShipPainter`'s place.
- **Settled on its own rebase onto `7040517b`:** `pilot_art.ts`' header
  (L6's text with L3's "stars"), `belt_scene.ts` (both `PlacePainter` and
  `PodPainter`; `play()` hands each event to the pod and to S3's
  `FieldSounds`, then plays the flourishes), `belt_scene.spec.ts`' imports
  (all three sides), the game's `AGENTS.md` (S3's sounds paragraph, its
  flourish sentence reworded for the pod's exhaust) and the testing skill.
  A third review read the rebase's range-diff; L6's `flickerAt()`, which
  clashed with L3's, became `flameFlickerAt()`, and its `flashAlpha()` and
  `flashScale()`, beside `flourish.ts`' own `flashAlpha()` for the held
  hit, became `rimFlashAlpha()` and `rimFlashScale()`.
- **Outside its files:** `flourish.ts` (F's) loses the old ship's flicker
  and blink (`FLICKER`, `EYES_SHUT`, `EYE_BLINK`, `flickerShare()`,
  `eyesOpen()`), removals of its own art's, and `timing.ts` (F's) gains
  `EXHAUST_MS`, 400; `rock_art.ts`' exports, `art.ts`' and `atlas.ts`'
  `litFrames()`, `frame.ts`' `chain` and `lastBreakAt`, `belt_scene.ts`,
  the contrast spec's rows, `art_frames.ts`' `fine`, and
  `@fz/style/fuzzball`'s `furWidthOf()`.
- **Its checks on that tip:** the game's lint, typecheck and 6,435 specs,
  `@fz/style`'s lint, typecheck and 403 specs, the root's lint under the
  lock, and the coverage at every floor; the users of `@fz/style/fuzzball`
  and the root's typecheck ran at the next verify run, below.
- **Its frame budget:** wave 9 on the 88 × 40 field at a quarter of the
  CPU, before, after, after, before: pooled 4.73 ms before and 4.41 ms
  after, within the 6.31 ms a third more allows.
- **For §12:** the canopy's glass mixes 0.22 of the accent, not the kit's
  0.3, so the pilots keep their contrast in a light palette; on a phone the
  pod is about 20 CSS px long, its dash's streaks faint, its fur's tips
  merged and its glint tiny.
- **Left, each with an owner:** the flame's and the puffs' glow, L4's; the
  loose drawn, P3's; the hull's arcs at static's last step, P4's; the fur
  lifted by static rather than the chain and one rule for "the dash is
  charged again", which the rim's flash and S3's `dash-ready` each work
  out, both R2's, which was told; the bail-out's burst and flung facets
  and a flourish on the rim's flash, F1's; whether auto-fire shows the
  "set" face, P1's to weigh.
- **P1 started** from `bcf01329`, with L6's `faceOf()` and its moments in
  its brief.

### 2026-11-15, L2 landed

- **L2 landed** as `bd448233` and `8944df8d`, fast-forward: the kit's
  break and held hit ported into `src/view/art/breaks.ts`, a rock's own
  facets thrown from its seed, tumbling and fading into the field's color
  with a ring of dust, sparks and glints, all gone by 450 ms, and a held
  hit's sparks at the rim; `DebrisPainter` draws them, each piece worked
  out once and drawn at every wrap copy, on a new `breaks` layer between
  the tags and the rocks.
- **Settled on its rebases:** onto S3's tip, by L2, the content skill
  (`BREAK_STYLES` beside S3's sounds), `layers.ts` (`place` first,
  `breaks` between `tags` and `rocks`), and `rockKindOf`/`rockSizeOf` now
  read from `frame.ts`, where S3's split put them; then onto L6's, by L2
  at the integrator's word after the integrator's own try met three
  conflicts and was aborted: the game's `AGENTS.md` (its `breaks.ts`
  paragraph before L6's `pod_art.ts`, its `DebrisPainter` after L6's
  painters), the two flourish specs (L6's bail-out kept beside L2's
  breaks), and `copies.ts`' `setTint()`, which L2 had removed as unused and
  L6's `PodPainter` now uses, so it stays. L2's `pushOf()` became
  `shardPushOf()`, apart from L6's `pushOf()` in `faces.ts`. No reviewer
  read the second delta, so the integrator read its range-diff: the
  rename, mechanical in every use, the specs' imports, the removal of
  `setTint()` dropped, and the hunks reordered round L6's, nothing else.
  Sound.
- **Outside its files:** `flourish_player.ts` (F's) and its spec, where
  the "shards" flourish calls `breakRock()`, "spark" calls `holdHit()` and
  "dust" plays nothing, 32 lines out; `rock_art.ts`' `FIRST_SEED`,
  `bySize()` and `BySize`; `layers.ts`' `breaks`; `belt_scene.ts`; the
  specs' `trianglesOf()` and `linesOf()`; the flourish specs.
- **Its checks on L6's tip:** the game's lint, typecheck and 6,558 specs
  in 117 files, the root's lint under the lock, and the coverage at every
  floor (`breaks.ts` at 100% on all four measures).
- **Its frame budget:** wave 9 at a quarter of the CPU with the gun held,
  against `4e7c1bee`, before either rebase: 5.21 → 5.91 ms in one sitting
  and 5.29 → 6.43 ms in another, within the budget each time. A first
  draft drawing circles with `Graphics` was half again over, since Phaser
  builds a hundred-cornered arc each frame; the dust is polygons of as few
  corners as each size needs.
- **Left, each with an owner:** F1 removes what breaks no longer use
  (`shardCount`, `LEAST_SHARDS`, `MOST_SHARDS`, `DUST_MS`, `SPARK_MS`,
  `SPARK_REACH`, the spark's frame and sizes; the puff stays for the
  exhaust) and the "dust" flourish, which plays nothing now, and moves
  `BREAK_MS` and `HELD_MS` to `timing.ts`, where `resultDelayMs()` still
  reads `SHARDS_MS` and `DUST_MS`; L4 the gem shards' and the held hit's
  halos, and `energyOf()`, which L4 was told may move to its `energy.ts`;
  R3 a `BREAK_STYLES` entry for each new kind, which the compiler asks
  for. For §12: the 90th percentile frame rose from 8.14 to 12.00 ms, and
  the pieces show over the flash from the first frame, where the kit has
  them at 45 ms.
- **No package was ready** for the slot it freed: four run, R2, L4, S4 and
  P1, and every package not begun waits on one of them.

### 2026-11-15, a second verify run on the tip

- **On `8944df8d`,** eleven packages landed, under the lock: every
  workspace's tests, two at a time on four workers each, the build and
  Asteroid Breaker's layout check in 3 min 13 s (09:59:49 to 10:03:02),
  then the root's typecheck, all passing. Asteroid Breaker has 6,558 specs
  now (5,219 at the start), `@fz/phaser` 1,064, `@fz/dev` 906, `@fz/core`
  463 and `@fz/style` 403; the other workspaces' counts are as they were.
- **Why after five landings, not three:** L3 and S3, which changed
  libraries many games use, each tested every user of what it changed at
  its landing, so the run waited for the next quiet slot. It covers the
  users of `@fz/style/fuzzball`, which L6 changed, and the root's
  typecheck, which L6's landing didn't run.
- **The layout** holds at every shape and turn with the deck shown.
- **`origin/main`** is still `6a5b58e6`, so nothing is to rebase.
- **The next run** is due after three more landings. Z1 also measures the
  tip's frame against `da697c6e9`, the build's start, which §9's budget
  is set against, in one sitting, since each package measured against
  the tip it started from.

### 2026-11-15, R2 landed, R3 started

- **R2 landed** as `7bd46f7f` to `8e136c0e`, nine commits: the chain and
  Nova out, static the multiplier in their place, carried wave to wave;
  sparks shed by rocks shot or blasted, drawn in and gathered by the pod
  and those in tow; near misses once a pass, and the zap from a dash begun
  at full static; each best kept with its rules' number (`RULES_VERSION`
  2); the autopilot drawing sparks in on its way and the report's most
  static; the debug menu's sliders; the sparks played up the ladder,
  static's steps by their chimes, a near miss, the zap and its arcs; one
  rule for the dash ready again (`isDashReady()`), which the dash, the
  pod's rim, the deck's ring, `dash-ready` and the autopilot all read; and
  the pilot eeping at the rules' near miss, the face's own watch gone.
- **Settled on its own rebases:** onto `7040517b` (L1's rocks, L3's places
  and S3's sounds), where the chain R2 took out met S3's sounds built on
  it: a break's event carries `times`, static's multiplier it scored at (0
  for a smash), in place of the chain, the bell rings once a frame at the
  ladder's note for the highest of them (`bellCentsOf()`), the chain's
  chimes go, and the lab's "A chain of breaks" became "Breaks as static
  climbs"; its entry 7's reviewer read the sounds after it, but no one
  read that settle's delta when it landed (see "two settles read late",
  below). Then onto L6's tip, putting `FieldView.charge` in place of the
  `chain` and `lastBreakAt` L6 had added and lifting the fur by static's
  multiplier less one (`liftOf()`), read by entry 8's reviewer. The
  integrator rebased it onto `931b2231` (L2's, and the log), where nothing
  met.
- **Checks on the rebased tip:** an install, the root's lint (which lints
  every workspace) under the lock, the game's typecheck and its coverage
  at every floor over 6,766 specs (5,146 in the `pure` and `dom` projects,
  1,620 in `sim`, every wave at every speed); R2's `report:waves` figures,
  both fields, match its own entry 5's line for line.
- **Outside its files:** the view's `run_frames.ts`, `run_state.ts` and
  `tally.ts`; F's `effects.ts` and `flourish.ts`, and docs in `timing.ts`
  and `ring_painter.ts`; `art.ts`, `symbols.ts`, `tags.ts` and docs in
  `palette.ts`; S3's `sounds.ts`, `field_sounds.ts` and the sound lab, as
  §5.1 has it; L6's `frame.ts`, `faces.ts` and `pod_painter.ts`, as it was
  asked; `deck_painter.ts`; the shell's `GameService` (`multiplier` and
  `step` in place of `chain`), the bar's figure, How to play's scoring line
  and the sound setting's sentence, and the stats service's docs;
  `src/testing/play.ts`' `takeUpCharged()` in place of `chainUp()`; L4's
  `warning.spec.ts`; and the game's `README.md`.
- **Its figures:** drawing in sparks makes the autopilot's plays longer: the
  wide field's longest 1:19 against R1's 1:03, about the quarter §9 asks a
  package to explain, and on the narrow field Boulder at Relaxed 0:24 against
  0:17 on R2's own branch before the detour, 41% more, which R2's log
  explains; against R1, more of the crew knocked loose on both fields (six
  plays against three on the narrow, seven against five on the wide). R2's log
  says the detour may want shortening. R3, tuning the waves' tails, owns the
  autopilot's detour, and was told.
- **Left, each with an owner:** P1's `run_frames.ts` calls `watchFace()`,
  which R2 removed: P1 was told to drop it on its rebase, `hearFace()`
  hearing `grazed` already. P4 draws the sparks and the hull's arcs at
  full static, and "under earlier rules" in the result and the sectors
  from `bestRules`/`sectorRules`; P1 lifted the bar's pilot's fur on its
  rebase, so that's done; S4 the near miss's voice and the beds' layers on
  static; Z1 the screenshots, whose wave-9 run flies differently now; the
  sound lab's scenes for the sparks and the zap, of which S4 built the
  zap's ("A near miss, then a zap"), the sparks' left to P4, add-only to
  the lab, and P4 told; the spark slider says nothing of what it comes to
  at Relaxed, for Z1's notes.
- **R3 started** from `8e136c0e`, with R2's, L2's and L1's notes in its
  brief. P1, S4 and L4 were told what R2 changed in their files and to
  rebase before they report.

### 2026-11-15, P1 landed, P3 started

- **P1 landed** as `96f37551`, fast-forward: `<app-face-cam>`, the pilot
  at the controls in the canopy's glass with the field's face and fur's
  lift (`GameService.face()` by L6's `faceOf()`, `lift()` by `liftOf()`),
  colored by the view's `podTones()` so it can't drift from the pod, first
  in the bar's Ships figure and hidden from screen readers; the Static
  figure as "×N" and four pips at every multiplier, only "×N" read aloud;
  four cards on a roomy bar, one on a compact bar with the ships' count a
  badge on the face cam and New game in the overflow menu, as Brick Fuzz
  Pop has it.
- **Settled on its own rebase onto R2's tip:** R2's `multiplier()` and
  `step()` kept and P1's own `multiplier()` dropped; P1's fur lift named
  `lift` (0 to 3, `liftOf()`), apart from static's step (0 to 4);
  `watchFace()`'s call removed from `run_frames.ts`, as R2 removed it; the
  bar keeping R2's "Static" label and P1's figure at every multiplier;
  R2's "only past ×1" specs giving way to P1's. No one read this settle's
  delta when it landed (see "two settles read late", below).
- **Its checks on that tip:** the game's typecheck, lint and 6,823 specs
  in 122 files, the root's lint under the lock, the build and the layout
  check at every shape and turn, and the coverage at every floor; in a
  browser at 360 × 640 in a light palette, the one card's three figures,
  the pilot sleepy at ×1 and its fur on end at ×4. Before the rebase, on
  the chain, it was seen at 1280 × 800 and 360 × 640 in a light and a dark
  palette, and at 640 × 360, 320 × 480 and 1000 × 800.
- **Outside its files:** `GameService`'s `face` and `lift`, `RunState`'s
  and `FrameChange`'s, `RunFrames`' face moments reset per field, the
  specs' `poseIn()`, one line in `app.component.spec.ts`, and one sentence
  of `lib/game-ui/AGENTS.md`.
- **Left, each with an owner:** the bar's title cut short at 1280 px with four
  cards, worse as the score grows, which P3 was to weigh as it made the crew a
  count past three and didn't take up, so it is P4's, which owns the bar now,
  and P4 was told; the redundant nested `paintRoles` in the app's spec, P3's,
  which P3 did. P1 answered two questions left to it: auto-fire shows no "set"
  face, as it would hold for the whole wave, and `<fz-fuzzball>` needed no
  `@fz/ui` change; so those are done. For §12: a new run state has lift 0 and
  a resting face until its first frame; a shared fuzzball pose reader in
  `@fz/ui/testing`, a library change no package needs.
- **P3 started** from `96f37551`, with P1's, R2's and L6's notes in its
  brief.

### 2026-11-15, S4 landed

- **S4 landed** as `a1bd0ff3` to `d2df10a8`, eight commits, fast-forward:
  `@fz/dev/zzfx` out; one step in `@fz/core/sound_mix` working out a play's
  take, variation and duck, which `SpritePlayer` and the sound lab share;
  the sounds read from how the field changed (the thrust pressed and let
  go, the first move, a guard over, a comet come in, the Shield and Slow
  started); the fuzzball's voice, the rarest call of a frame, once in four
  seconds at most, 3 dB down; each place's bed, the pulse joining at ×3
  and the shimmer at ×4, and the lodestone's hum while one is whole; the
  eep at a near miss; and the effects, the voice, the bed and mono as
  switches in the settings drawer, read as optional.
- **Settled on its own rebases:** onto R2's tip, three commits meeting R2
  in the sound files, their specs and the docs, both kept (R2's sparks, zap
  and `isDashReady()` beside S4's state sounds, Nova out of the sounds
  started, the beds on `GameService.multiplier()`), the range-diff read by
  a fresh reviewer; then onto P1's, where nothing met.
- **Its checks on that tip:** the game's lint, typecheck and coverage at every
  floor over 7,126 specs in 124 files; under the lock the root's lint and
  typecheck and the tests of every workspace using `@fz/phaser/sound` (Snake,
  Asteroid Breaker, Brick Breaker, Brick Fuzz Pop). In a browser, through the
  player's state and the network log: the sprite first, the bed under the
  first card, the layers fetched but silent until ×3 and ×4, the shimmer faded
  out as static fell, every layer on the bed's bar line, mono switching the
  speakers between one channel and two, the bed's switch fading it out and in.
- **Outside its files:** `GameService`'s `placeAfter` and
  `lodestoneHums()`, the board's three new scene options, the specs'
  `FakeShell` switches, R2's zap and near-miss specs expecting the
  calls.
- **For §12, for the user to judge:** a call within four seconds of
  another is dropped, a cheer or the run's end's "aww" among them, by the
  plan's "never twice in four seconds" (a one-line change in
  `Voice.speak()` lets the rarer through); the beds stay decoded once
  fetched, 26 MB for the first wave and 42 to 46 MB at most, which
  releasing a bed once crossed out (a `LayerPlayer` change) would cap.
  `plan.md`'s decision 15 says "within two seconds" where its table says
  four; four was built, the user says which, and Z1 makes the two agree.
- **Left, each with an owner:** `tow-twang`, P3's; the burr's sounds,
  R4's; `blast-volatile-small`, kept for a small rock that blasts, which
  R3's brief names among its sounds (a vent may be one), R3 told again;
  the shell's stingers and UI sounds and `voice-hum`, still unplayed, for
  §12; the eep's second moment in the kit, a rock passing close to one of
  the crew in tow, for §12, as no rule logs it (the bubbles can't be hit,
  and a graze is counted at the pod alone). A sound family added later is
  routed in `isSwitchedOn()`, which sends calls to the voice's switch and
  the rest to the effects'.
- **S3's two cases,** left to S4: `crew-caught` beside `wave-clear`, as a
  wave's clearing takes the loose back, and `crew-home` for a loose one
  caught with the line full, which the rules log as a timeout is. S4 kept
  both, by reasoning rather than by ear, so whether they sound right goes
  to §12 for the user; telling a catch on a full line from a timeout would
  take a new rules event.
- **No package was ready** for the slot it freed: F1 waited on L4, P4 on
  P3, R4 on R3.

### 2026-11-15, L4 landed, F1 started

- **L4 landed** as `76354df9` to `9054ad1a`, eight commits, fast-forward:
  `@fz/phaser`'s soft disc; halos round a crystal's gems and a volatile
  rock's core on a new `halos` layer; the four shots and the muzzle's
  flash as the kit cuts them, `energyOf()` moved into `energy.ts`; one
  `canvasTexture()` spec helper in `@fz/phaser/testing`; the six pickups
  as glass orbs, their rims by group; the comet as a cut wedge with its
  tail, its chevrons and its lane on a new `lanes` layer under the rocks;
  and the flame's halo.
- **Settled on its own rebases:** onto `8944df8d` (L2's and L6's), the
  `LAYERS` doc and its spec's title, the game's `AGENTS.md` and the content
  skill, each keeping both sides, and the shots meeting L6's `fine` on
  `atlasFrames()`, which they now pass on to `energyFrames()`; onto R2's
  `8e136c0e`, `field_picture.ts`' imports and `atlasFrames()` side by
  side, and in the orbs' work `art.ts`, `symbols.ts` and `ORB_RIMS`, each
  losing the Nova as R2 took it out; onto P1's tip, nothing; onto S4's, the
  content skill, the game's `AGENTS.md` and `belt_scene.spec.ts`' imports,
  each keeping both sides, and `placeComet`, which a spec of S4's calls,
  restored to that file's imports in L4's comet commit.
- **Its checks on that tip:** the game's lint, typecheck and 7,294 specs,
  `@fz/phaser`'s lint, typecheck and 1,078 specs, and under one hold of the
  lock the root's lint and typecheck and the other users' tests (Brick
  Breaker, Brick Fuzz Pop, Solitaire, Snake); the coverage at every floor.
  In a browser, all four palettes at 1,400 × 800 and 360 × 640, beside the
  kit's sheets.
- **Its frame budget:** 4.25 ms at its start (`7040517b`), 5.27 ms at the
  tip it rebased onto and 5.21 ms on its branch, pooled medians in one
  sitting, within the 5.67 ms a third over its start allows. Wave 9 has
  only stones, so the trace held the shots' and the pickups' halos but no
  rock's, comet's or flame's: F1 traces a wave with crystals, volatile
  rocks and a comet while thrusting too, and was told. The packages landed
  meanwhile added about a quarter, so F1, rather than Z1 alone as the
  second verify run had it, measures the tip against `da697c6e9`, the
  build's start, in its sitting, and says plainly if the whole is past a
  third.
- **Outside its files:** `palette.ts`' `haloStrength` and `rockGlows`,
  `layers.ts`' `halos` and `lanes`, `belt_scene.ts`, `copies.ts`'
  `showOnce()`, `field_picture.ts`' `placeShot()`, the `energyOf()`
  import in L2's files, F's `flourish.ts`, where `breathShare()` takes the
  place of `breathScale()` and `BREATH`, and the warning's pulse
  (`pulseAlpha()`, `PULSE_LEAST`) goes, `art.ts`, whose pickups' frames
  moved to `things.ts` and whose old comet disc went, `tuning.ts`'
  `COMET_MARGIN` doc (R's), the contrast spec, and the docs.
- **Left, each with an owner:** the muzzle's flash, art waiting for F1 to
  play it, and a blast's light, which L4 didn't add, F1's; the halo
  painter for P4's sparks (`reserve()`, `glow()`, `glowOnce()`); the
  burr's art and its wrapping draw for R4. For §12: no halos for L2's gem
  shards and held hits (`DebrisPainter` would take the halo painter), none
  for the puffs (the kit has none), the flame's halo unflickering, and an
  orb blinking dim rather than vanishing, even with motion unwelcome,
  which F1 weighs under the still forms.
- **F1 started** from `9054ad1a`, with what the look and sound packages
  left it in its brief (L2's dust flourish that plays nothing and the
  constants breaks no longer use, L3's `BLEED_CSS_PX`, L1's empty `flash`
  layer, L6's pod bursting at the run's end and its flourish on the rim's
  flash as the dash comes ready, S3's sight for `dropped`, `faded` and
  `strayed`, and L2's move of `BREAK_MS` and `HELD_MS` to `timing.ts`), L4's
  notes, and the build's frame to measure against its start.

### 2026-11-15, P3 landed, P4 started

- **P3 landed** as `a4ab7cbb` to `c0a7732a`, five commits, fast-forward:
  the line in tow under the pod (`TowPainter` on a `tow` layer under the
  ship, by the rules in three new files, `src/view/field/tow_line.ts`,
  `src/view/art/crew.ts` and `src/view/field/near.ts`), each who rides it
  in a bubble in its ink
  answering what passes, each knocked loose swelling and blinking; the
  crew in the bar, a count past three (`src/view/crew_line.ts`, new), and
  the shell speaking of the crew
  rather than ships; the crew on the Paused card, cheering on the Cleared
  card and as the fuzzballs who flew when everyone is home; How to play's
  crew as the ship's lives; the tow line's twang as one joins it; the
  layout check opening the Cleared card with its trophy over a run kept
  to clear (`clearingRun`, `tools/stored_run.mjs`); and the sector's card
  stepping down by the field's height to stay above the waiting ship.
- **Settled on its own rebases:** onto S4's tip, nothing; onto L4's, in its
  first commit, `layers.ts` and its spec (L4's lanes and halos with the
  tow layer under the ship), the game's `AGENTS.md` and the testing skill,
  each keeping both sides; `belt_scene.ts` merged cleanly.
- **Its checks on that tip:** the game's lint, typecheck and 7,421 specs in
  136 files, the root's lint under the lock, the coverage at every floor,
  `build` and `check:layout` at every shape and turn, the Cleared card at
  every shape.
- **Its frame budget:** wave 9 on the widest field with five in tow, 4.39
  ms at its start (`96f37551`) and 5.38 ms on its branch, means of two
  each in one sitting, 23% more within the 5.85 ms its start allows; the
  branch's figure includes S4's and L4's changes, which landed meanwhile.
- **Outside its files:** the new `tow_line.ts`, `crew.ts`, `near.ts`
  (`faces.ts`' `lookOf()` now uses it, with the same answers), `crew_line.ts`
  and `tools/stored_run.mjs`, doc comments in L6's `pilot_art.ts` and
  `stray_painter.ts`, `layers.ts`, `belt_scene.ts`, two `SECOND_SOUNDS`
  entries in `sounds.ts` (add-only), S1's recipe `tools/sounds/rescue.mjs`
  (its `about` and `plays`) and the sound lab's plays, `kept_run.ts`,
  `screenshot_api.ts`, `script_api.ts`, `pilots.ts`,
  `capture-screenshots.mjs`, `app.component.spec.ts`, the game's `AGENTS.md`
  and the testing skill.
- **Left, each with an owner:** `describe.ts`' `whereLost()`, without
  callers now, and `describeEnd()`'s "Game over." where the cards say
  "Everyone is home.", sent to R3; `tools/stored_run.mjs`' `CLEARING_RUN`
  naming wave 30, the last written wave, which `stored_run.spec.ts` holds
  it to, sent to R3 should it add waves, and in R4's brief; the sector
  card's height steps, measured for today's words, to measure again should
  a sector's card say more, R3's set pieces and R4's burr, R3 told and
  R4's brief saying so; the Cleared card's steps, measured with its six
  lines, Sparks and Static among them since R2, P4's should it make the
  card taller, P4 told. P3 declined, with reasons in its
  log, sharing `StrayPainter`'s drawing (L6's file), folding two rock
  scans per bubble into one, opening more than the first wave's card in
  the layout check, and a duplicate round trip in `kept_run.spec.ts`.
- **P4 started** from `c0a7732a`, with P3's, R2's and L4's notes in its
  brief and the build's frame to measure.

### 2026-11-15, a third verify run on the tip

- **On `c0a7732a`,** sixteen packages landed, under the lock: every
  workspace's tests, two at a time on four workers each, the build and
  Asteroid Breaker's layout check in 3 min 49 s (14:38:09 to 14:41:58),
  then the root's typecheck, all passing. Asteroid Breaker has 7,421 specs
  now (6,558 at the last run), `@fz/phaser` 1,078 and `@fz/core` 470;
  `@fz/dev` has 889, 17 fewer, since S4 took out `@fz/dev/zzfx`, which
  nothing imported; the other workspaces' counts are as they were.
- **The layout** holds at every shape and turn, and now also the Cleared
  card with its trophy, which P3's check opens.
- **Late:** the last run set this one after three landings; it came after
  five, missed at S4's landing, the third, and run after P3's. Each of the
  five ran its own checks, and S4 and L4, which changed
  libraries, the tests of every user of what they changed, so what this
  run adds is the other workspaces' tests, the build and the root's
  typecheck over all five together.
- **`origin/main`** has moved to `7fbd968a`, one commit: the Brick Fuzz
  Pop tune-up's plan, all of it under `docs/brick-fuzz-pop-tune-up/`,
  which nothing in this build reads. §7.5 rebases onto `origin/main`
  whenever it moves, so the faster checks serve the build; this commit
  brings none, and a rebase now would have the three packages running
  rebase with `--onto` for nothing, so this departs from §7.5 and waits.
  The branch is rebased onto `origin/main` at the first move that brings
  code or checks, and in any case in Z1 before the merge; the tune-up's
  build, under way in another session, may by then touch `brick-fuzz-pop`
  and the libraries.
- **The next run** is due after three more landings.

### 2026-11-15, two settles read late

- **Why:** the review of the entries above found two settles §7.5 asks a
  fresh reviewer to read that no one had: R2's onto `7040517b`, where the
  chain it took out met S3's sounds, landed in `7bd46f7f`, `b6c59b4d`
  and `fbe2183a`; and P1's onto R2, where the fur's lift and static's
  step came apart, in `96f37551`. A fresh agent read both at `c0a7732a`.
- **Found:** no bug in play; both settles keep both sides' intent. Only a
  comet's smash logs `times` 0, and only it plays `comet-smash`, with no
  bell; the bell rings once a frame at the highest multiplier, where the
  first break at it broke; `liftOf()` is static's multiplier less one,
  and the multiplier and step reset at the run's end and carry over a
  cleared wave; dropping `watchFace()` lost nothing.
- **Taken, by the integrator, as `ef124990`:** the bell's notes keyed by
  static's multipliers, so a new step fails to compile without its note,
  and `FieldSounds`' docs saying every break but a comet's smash rings the
  bell, as a break after the run ended still does (its own commit review's
  three findings taken, as its message says). Its checks, after the last
  edit: the game's lint, typecheck and 7,423 specs in 136 files, and the
  root's lint under the lock. R3, F1 and P4 take it as they rebase before
  reporting, R3 told, as it adds to `sounds.ts`; the next verify run
  covers it.
- **Sent to their owners:** to P4, the bar, the pilot and the face cam
  being its files now, a spec telling the fur's lift from static's step
  at full static, where alone they differ (no spec would fail with the two
  swapped), the docs that still call the lift "static's step", and the
  pips counted from `STATIC_STEPS[0]`, which trusts the table's order; to
  R3, `events.ts`' docs of `times` and `addBreak()`, which say 0 for an
  event that scored nothing, where a break after the run ended scores
  nothing at its multiplier.
- **Declined:** dropping `FieldSounds`' own tracking of the frame's
  highest multiplier for `note()`'s keeping of the highest rise. The two
  agree only while the bell's notes rise with the multiplier; the
  tracking states the rule itself.
