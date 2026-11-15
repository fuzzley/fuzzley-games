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
