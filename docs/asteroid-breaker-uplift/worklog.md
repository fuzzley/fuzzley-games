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

| Step | What                                                                | State |
| ---- | ------------------------------------------------------------------- | ----- |
| 1    | Read the earlier designs and the game as it is                      | done  |
| 2    | Research: mechanics, look and feel, sound; an audit of the game     | done  |
| 3    | The design: `plan.md`, with its decisions                           | done  |
| 4    | Mocks: the art sheets and the scenes, now and after                 | done  |
| 5    | Real art: geometry, atlases, sprites and backdrops                  | done  |
| 6    | Real sound: a synth, the effects, the beds, and a page to hear them | done  |
| 7    | Review, format, and a last entry here                               | done  |

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

### 2026-11-14, all seven steps done

**Where it stands.** The plan, its research, the art and its sheets, the
mocks, the sounds and the assets are all written, checked and committed on
this branch. Nothing in the game is changed, and nothing is pushed.

**What was added since the last entry:**

- **The art's five sheets** (`art/*.svg`, previews in `art/preview/`):
  rocks, pilot-and-pod, sectors, energy-and-effects, pickups-and-hazards.
  `node docs/asteroid-breaker-uplift/art/make-art.mjs` draws them all.
- **The mocks** (`mocks/*.svg`, previews in `mocks/preview/`), seven, by
  `mocks/make-mocks.mjs`. Staging them found faults in the art, which went
  back to the artists and were fixed before the mocks were staged again:
  cracks past a rock's edge (`reachAt()` in `art/lib/rocks.mjs`), bright
  stars shaped like sparks and girders drawn in outline
  (`art/lib/backdrop.mjs`: nothing in a backdrop has points or an outline
  now), a burr like a flower (six barbed thorns in a dull brown now), a
  blast's ring that went olive on Midnight blue, a muzzle flash's second
  frame.
- **The art's assets** (`assets/art/`, about 5 MB, with a README):
  `art/make-assets.mjs` writes geometry for every piece, the rocks' and the
  hulls' atlases in layers, 106 sprites, one atlas of the small pieces and
  sixteen pictures of the four places.
- **The sounds:** ninety-eight in 178 takes, nine families, every one
  building with no warning. `assets/sound/sprite/` holds them packed
  (about 1 MB as Ogg, 1.3 MB as M4A) with their map, `assets/sound/beds/`
  each bed. The WAVs (22 MB) are ignored; the build writes them again.
- **The user heard every sound** on the audition page the day they were
  made and marked ninety-five good as they are.
  `sound/listen-for.md` holds the verdicts and what each sound's maker
  doubted. Three were made again:
  - `thrust`: marked "needs work". Offered a burner, a throat and a purr,
    the user chose the throat, which is `thrust` now, at the seed it was
    heard at.
  - `bed-inner-belt` and `bed-endless`: "too difficult to listen to for a
    long time". Made again as loops of 32 s with no held tone above
    620 Hz. Heard again: the tones "sound good", but the air was "too much
    like static hisses". The air is now a low breath in swells, 10 dB
    quieter, silent between them. Heard a third time: "they are both good
    now." All ninety-eight sounds have passed the ear on the audition page.
- **The audition page** starts every mark at "good: use it", at the user's
  ask, and lists only what isn't.

**What the plan changed as it was drawn and staged:**

- The pod wears four marks, not five: the fur (static), the canopy's rim
  (the dash), a glass shell (the Shield) and a dashed ring (can't be
  touched). A weapon's time left stays in the field's tags.
- The bar carries the multiplier as a number and four pips, on a phone
  beside the face cam, since a phone's pod can't show static's steps.
- The tow line keeps the plan's spacing (0.7 in radius, 1.6 apart); the
  pilot's sheet draws it looser, and staged at that it was too long.
- A loose fuzzball's bubble swells to a stray's size, to be found.
- Shots take the accent for their body and halo; their middle stays the
  field's text.

**Left open, for whoever picks this up:**

- **The user's ten choices,** under "What the user settles" in `plan.md`.
  The mocks and the assets use Bumble, the first of the three pods.
- **The sounds in the game itself:** on a phone's speaker, under real
  play, for minutes. Nobody has heard that.
- **The Shield's shell has two sizes in the art:** 1.8 units in
  `art/lib/fx.mjs` (`SHELL_RADIUS`, the sprite) and 1.64 in
  `art/lib/ship.mjs` (`RINGS.shield`, the pod's own). The pod's is the one
  the mocks show.
- **`art/lib/strays.mjs`'s `towSvg()`** draws everyone in tow smiling,
  whatever happens; the mocks draw their own faces where it matters.
- **The folder is heavy** beside the earlier uplifts': the five sheets are
  1 to 3 MB of SVG each, since every facet is a polygon, and the rocks'
  atlases 3.4 MB.
- **`.prettierignore`** gained two lines, for `assets/` and
  `sound/report/`, which scripts write. `yarn prettier:check` passes.
- **`.claude/launch.json`** (not in git) has `uplift-sounds`, the audition
  page's server on port 9120.

**To check that everything still builds,** from the repository's root:

```bash
node docs/asteroid-breaker-uplift/art/make-art.mjs
node docs/asteroid-breaker-uplift/mocks/make-mocks.mjs
node docs/asteroid-breaker-uplift/art/make-assets.mjs
node docs/asteroid-breaker-uplift/sound/build.mjs
node docs/asteroid-breaker-uplift/sound/encode.mjs
```

`git status` should then show nothing changed. To format, run Prettier's
binary on this folder from the root
(`frontend/node_modules/.bin/prettier --write docs/asteroid-breaker-uplift`),
never `yarn prettier`, which formats the whole repository.
