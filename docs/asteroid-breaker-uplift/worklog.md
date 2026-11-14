# Work log: an uplift for Asteroid Breaker

The newest entry is last. Each says what was done, what it decided and what
comes next, so the work can be picked up from the last entry alone.

- **Branch:** `claude/asteroid-breaker-uplift-a0bd76`, a worktree at
  `.claude/worktrees/asteroid-breaker-uplift-a0bd76`, cut from `main` at
  `eb560e1f`. Nothing here is pushed.
- **Folder:** everything made for the uplift is in
  `docs/asteroid-breaker-uplift/`. Nothing in the game is changed.

## What was asked (2026-11-14)

Design one more uplift for Asteroid Breaker, wearing the game, graphics and
sound design hats:

1. Research similar games, without looking at any source code and without
   copying any asset. Everything made must be original.
2. Find where the visual fidelity and the sound effects can improve (the
   sounds are "quite bad right now"), then make detailed mocks, then real
   assets the uplift can use.
3. Look for changes and additions to the gameplay, and say what to remove
   where a part is weak or clashes with a better idea.
4. Look at how the fuzzball is used now, and make it better: how it looks,
   and how much of the play it is part of.
5. Keep a later progression system in mind (RPG-style levels, powers or
   stats chosen from a random few), without designing it yet.
6. Use subagents where the work runs in parallel, commit design notes, mocks
   and assets regularly on a dedicated branch, and keep this log.

## The order of work

| Step | What                                                               | State |
| ---- | ------------------------------------------------------------------ | ----- |
| 1    | Read the earlier designs and the game as it is                     | done  |
| 2    | Research: mechanics, look and feel, sound; an audit of the game    | begun |
| 3    | The design: `plan.md`, with its decisions                          |       |
| 4    | Mocks: the art sheets and the scenes, now and after                |       |
| 5    | Real art: sprites, atlases and backdrops                           |       |
| 6    | Real sound: a synth, the effects, the bed, and a page to hear them |       |
| 7    | Review, format, and a last entry here                              |       |

## Log

### 2026-11-14, step 1: reading

- Read `docs/brick-breaker-uplift/plan.md` for the shape an uplift plan
  takes here: research notes by agents from prose sources, concept art drawn
  by scripts, mocks, decisions the user settles, phases and risks.
- Read the game's `AGENTS.md`, `src/rules/tuning.ts`, the three catalogs
  (rocks, pickups, weapons), `tools/build-sounds.mjs`, `@fz/dev/sounds`, the
  sound lab's notes and `src/view/effects/effects.ts`, and the "As built"
  part of `docs/archive/asteroid-breaker-execution-plan.md`.
- **What stands out, before any research:**
  - The look is flat: rocks are one-tone blobs with dots, the backdrop is
    grey specks on the field's color, shots are white dashes. Nothing glows,
    nothing is lit, and no sector looks different from another.
  - The sounds are fourteen, at 16,000 samples a second, from sines and one
    dull noise, dry, one take each. The sound lab's own notes say why they
    fall short and that they "need designing again".
  - The fuzzball is a passenger. It shows in the ship's small window, in the
    bar as the ships left, as a stray in a bubble worth 500 points, and
    bailing out of a lost ship. A stray brought home changes nothing in the
    wave it was caught in.
  - Five of the eight pickups are timed, which a later progression system
    would clash with or lean on, depending on what the uplift makes of them.
- **Tools on this machine:** Node 26.12, Chrome and ffmpeg are installed.
  The worktree had no `node_modules`; `yarn install --immutable` was run in
  `frontend/` so that the game's own report, sharp and Prettier can run.

### 2026-11-14, step 2: research begun

Four agents, each writing one note in `research/`:

- `mechanics.md`: what games like this one add to the genre, what players
  praise and resent, and what a later progression system would need the
  base game to have.
- `look-and-feel.md`: how such games reach their look, what keeps a busy
  field readable, and what feel costs.
- `sound.md`: how arcade shooters sound, how their effects are built, mixed
  and varied, and what a browser asks of them.
- `the-game-today.md`: an inventory of the game as it is, from its own
  code: every piece of art, flourish and sound, every place the fuzzball
  shows, and the autopilot's figures for every wave.

### 2026-11-14, steps 2 to 6 under way together

- **Research in:** `the-game-today.md` (1,300 lines, with the autopilot's
  figures: a wave takes it 7 to 31 s on a phone's field, 20 to 63 s on the
  widest, and it loses a ship in 4 plays of 90), `mechanics.md` and
  `look-and-feel.md`. `sound.md` is still being read.
- **A slip:** the mechanics agent ran `yarn prettier` to check its note,
  which in this repository formats everything. Only this folder's files
  changed, in format alone; they were checked to build as before and
  committed as a style commit.
- **The art's direction is settled and written,** `art/README.md`: cut
  stone, soft fuzz, bright sparks. A rock is a dome of flat facets lit by
  one light that stays put as the rock turns. It was tried first as a
  throwaway sheet in three palettes, then kept: `art/lib/rocks.mjs` and
  the sheet `art/rocks.svg`.
- **The art's kit** (`art/lib/`): `core` (seeded random, vectors, colors,
  SVG), `palettes` (the site's four, the game's inks, a lit thing's four
  tones), `rocks`, `sheet` (how every sheet is laid out), `raster` (an
  SVG as a PNG or a WebP, through the frontend's sharp). Previews are kept
  as WebP; the PNGs the sheets are checked by are ignored.
- **Three art agents are drawing,** each a module or two and a sheet:
  the fuzzball and the pod (`fuzzball`, `ship`, `pilot-and-pod`), the
  four places (`backdrop`, `sectors`), and energy, effects, pickups and
  hazards (`fx`, `things`, `energy-and-effects`, `pickups-and-hazards`).
- **The sound's kit is written and tested** (`sound/lib/`): `synth`
  (oscillators that don't alias, three noises, a filter that can be swept,
  struck partials, a resonator bank, a plucked string, drive, echo, a small
  room, a compressor, a limiter, a scatter of grains, a loop's seam), `music`
  (the key and the chain's ladder) and `analyze` (loudness, bands, a
  spectrogram, a sheet of them). `sound/build.mjs` renders a family's
  recipes into WAVs, a report and a sheet. Its self-test passed: a saw's
  aliases 113 dB under its harmonics, pink noise at 3.05 dB an octave, the
  filter at 12.5 dB an octave.
- **Today's sounds, measured** with the same instruments: nothing above
  8 kHz in any of the fourteen, and a phone's speaker keeps 4% of a large
  rock's break, 13% of a blast and 36% of the thrust.
- **`plan.md` is drafted whole.** Its play rests on three ideas the
  research backs: the crew rides in tow and is the run's lives (a hit
  knocks one loose, to be caught again); rocks shed sparks that build
  static, which is the multiplier, the fur's lift and, when full, a zap on
  the next dash; and less of what was weak (ships by points, two pickups,
  the chain's timer, one of two cards between waves). It names ten
  choices as the user's.
- **Next:** the sound research, then three agents on the sounds' recipes;
  the art agents' sheets, reviewed; the scene mocks; the assets written
  out; the page to hear the sounds on.

### 2026-11-14, the sounds and the mocks begun

- **`research/sound.md` is in.** What it changed: a tuned sound is never
  detuned at random, only a noisy one; the gun stays dry and a burst ends
  with one tail (`shot-tail`); a crowd of breaks in one frame plays as the
  two largest and one `break-cluster`; the comet's warning gets faster, not
  louder; the voice speaks once in four seconds at most; busy play aims at
  about -17 LUFS; an iPhone on silent stays silent. It proposed D major
  pentatonic; the kit had already settled on C, which is the same shape a
  tone lower.
- **Phaser's lighting, checked in its types** (4.2.1): `setLighting()`,
  `lights.addLight()`, `maxLights` in the game's config, and
  `Texture.setDataSource()`, which lets a texture made at run time be
  another's normal map. The plan's "Where the code goes" says so, and still
  asks for a spike.
- **Three sound agents are writing recipes,** a family or three each:
  rocks and hazards; ship, pickups and stingers; voice, rescue and beds.
  Each builds its family, reads its report and looks at its sheet of
  spectrograms.
- **The page to hear them on is written and tried** (`sound/audition/`):
  `node docs/asteroid-breaker-uplift/sound/audition/serve.mjs`, then
  `http://localhost:9120/`. It loaded 59 sounds in 127 takes as built so
  far, played two moments with nothing wrong in the console, and took its
  takes in turn. `.claude/launch.json` has it as `uplift-sounds`.
- **`sound/encode.mjs`** packs the takes into one sprite as Ogg and M4A
  with ffmpeg, and each bed by itself. Not yet run.
- **`art/make-assets.mjs`** writes the rocks out: `assets/art/geometry/rocks.json`
  (102 outlines, their facets and normals) and an atlas of 2030 by 1064 at
  24 px a unit in seven layers that share one map (inks dark and light, the
  normal map, glow dark and light, lit dark and light). The other pieces
  wait on the art agents.
- **A mocks agent is staging the game in play** (`mocks/`): the screenshot's
  moment restaged in a dark palette and a light one, a zap, a hit, a phone
  upright in two palettes, the three cards, and the pod's marks called out.
- **`.prettierignore`** leaves out `assets/` and `sound/report/`, which the
  scripts write.
- **Next:** each agent's report, reviewed against its sheet; the full sound
  build, the sprite, and the page tried again; the rest of the assets; the
  plan's pictures and names brought in line with what was drawn; a format
  pass over the folder from the repository's root (never `yarn prettier`,
  which formats everything).
