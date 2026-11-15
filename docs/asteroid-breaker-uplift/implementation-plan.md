# Asteroid Breaker uplift: the implementation plan

Written 2026-11-15, as a companion to [`plan.md`](plan.md). That file is the
design: what the uplift adds, its nineteen decisions and its eleven slices.
This file is how to build it:

- what is in scope, and the points the design leaves open, settled (§2, §3);
- what to lift into the shared libraries, so the games draw, sound and show
  the fuzzball from one copy of the code (§4);
- the contracts the parts share: types, state, events and storage (§5);
- each package of work, with its files, its specs and when it is done (§6);
- how the packages run side by side as AI agents, each in a worktree of its
  own, each commit reviewed before it is made (§7);
- the practices, budgets and risks that hold for the build (§8 to §10);
- how it ends: the checks, the archive and the merge (§11).

Where this file and `plan.md`'s "Phases" disagree, this file is the newer.

**What it was written from:**

- `plan.md`, read whole, its mocks, and the art's and the sound's kits and
  assets (`art/`, `sound/`, `assets/`, with `assets/art/README.md`).
- Four maps of the code as it stands at `e6740e04`, each read by an agent
  from the source: the sound (`@fz/dev/sounds`, `@fz/phaser/sound`, the
  game's `tools/build-sounds.mjs` and `src/view/effects/`), the art (the
  game's `src/view/art/`, its painters, `@fz/phaser/shapes`,
  `@fz/phaser/fuzzball` and `@fz/phaser/scene`), the rules (`src/rules/`
  whole, the autopilot and the report), and the shell (`src/app/`, the view
  that feeds it, and its specs).
- `docs/archive/brick-breaker-uplift/implementation-plan.md`, for how the
  last uplift's build ran, and what its "As built" says went wrong.
- Timings on this machine, in §9.

Paths are relative to `frontend/games/asteroid-breaker/` unless they start
with `frontend/` or `docs/`.

---

## 1. Summary

- **Ten of the plan's eleven slices are built.** The eleventh, progression,
  is "its own plan", so it stays unbuilt; §5 keeps the room the plan leaves
  for it.
- **Five lifts go into the libraries** (§4), each taken up where another
  game can use it:
  - the plan's synth, as `@fz/dev/synth`, beside today's `@fz/dev/sounds`;
  - the mix, the plan's play-back rules, decided in `@fz/core/sound_mix`
    and played by `@fz/phaser/sound`, which the sound lab takes up too;
  - the fuzzball's nine faces and its fur by force and static, as data in
    `@fz/style/fuzzball`, drawn by `@fz/phaser/fuzzball` on a canvas and by
    `@fz/ui/fuzzball` in the page;
  - a soft disc for every halo, and alpha and washes in the drawing
    vocabulary, in `@fz/phaser/scene` and `@fz/phaser/shapes`;
  - an atlas in pages, should the rocks outgrow one texture.
- **Twenty-five settled points** (C1 to C25) fill what the design leaves
  open. Each is this plan's call, made so the build can go on without
  waiting, and says what it could be instead where there is a real choice.
- **Five streams run side by side,** twenty-one packages in all and the
  integrator's finish, up to five agents at a time, each package in a
  worktree of its own:
  - S, the sound;
  - L, the look;
  - P, the shell and what the new rules show;
  - R, the rules;
  - F, the feel.
- **An integrator,** the session that runs the build, rebases each finished
  package onto the branch `asteroid-breaker-uplift`, checks the tip, and
  keeps the integration log.
- **The critical path is the rules:** the crew in tow (R1), then sparks and
  static (R2), then the wave (R3), then the burr (R4), each needing the
  autopilot to clear every wave. What the new rules show (P3, P4) and how
  they feel (F2) follow each rule as it lands. The sound, the look and the
  shell's first parts run beside them from the first hour.

---

## 2. Scope

| `plan.md` slice           | Built here | Packages                     |
| ------------------------- | ---------- | ---------------------------- |
| 1. Sound                  | yes        | S1, S2, S3                   |
| 2. Rocks and light        | yes        | L1, L2                       |
| 3. Places and glow        | yes        | L3, L4                       |
| 4. The pod and the pilot  | yes        | L5, L6, P1                   |
| 5. Feel                   | yes        | F1, and F2 for the new rules |
| 6. The voice and the beds | yes        | S4                           |
| 7. The crew in tow        | yes        | R1, P3                       |
| 8. Sparks, static and zap | yes        | R2, P4                       |
| 9. The wave               | yes        | P2 (one card), R3            |
| 10. The burr              | yes        | R4                           |
| 11. Progression           | no         | its own plan, later          |

The slices' order is the plan's where a dependency asks for it, and not
otherwise: one card between waves (P2) changes no rule and runs from the
start, and the look runs beside the rules rather than before them. Nothing
reaches `main` until all of it has landed on the integration branch and
passed the checks in §11, so a slice's half that lands first need not
leave the game whole for players, only whole for the compiler and the specs.

---

## 3. Settled before code

The design leaves these open, or says them in words that admit two builds.
None changes a decision the user kept.

### Sound

**C1. The synth moves into `@fz/dev` as TypeScript,** a new entry
`@fz/dev/synth`, ported from `docs/asteroid-breaker-uplift/sound/lib/`:
`synth` (oscillators, noises, filters, struck partials, the resonator bank,
the plucked string, drive, echo, room, compressor, limiter, grains, a loop's
seam), `music` (the key and the ladder), the loudness and band measures of
`analyze` (its spectrogram's picture stays in `docs/`, since it needs
`sharp`), and the two instruments any game can play: struck materials
(`parts-impacts`) and the fuzzball's voice (`parts-voice`). `parts-ship`
is this game's, and moves into its `tools/sounds/` with the recipes. Today's
`@fz/dev/sounds` stays as it is for Snake, Brick Breaker and Brick Fuzz Pop,
whose specs hold their sprites byte for byte; its sprite writer learns a
sample rate, takes, a gap and a fade (today fixed at 16,000, one take,
0.1 s and 10 ms), each defaulting to what it is now, so the two synths share
one. _Instead:_ grow
`@fz/dev/sounds` in place, which would change three games' sounds.

**C2. The sprite ships as the kit encoded it.** The game ships
`assets/sound/sprite/sounds.{ogg,m4a,json}` and `assets/sound/beds/`, as the
user heard them, in `src/scene/sounds/`. `tools/build-sounds.mjs` renders
every take from the game's recipes into `tools/sounds/wav/` (ignored) and
packs and encodes them with ffmpeg where ffmpeg is on the path, and says so
and stops where it isn't. It packs as the kit's `encode.mjs` packed, a gap of
0.06 s and no fade, so on a machine with ffmpeg it writes the same map. S1
holds the port to the kit by rendering every take both ways once and
comparing the bytes, which it logs; a spec holds the shipped map to the
recipes: every take of every sound but the beds, by name, which loop, and
each take's start and end as the packer lays out the takes' lengths, which
the build records beside the map so the spec needn't render them.
ffmpeg isn't installed on this machine, so the encodes the user heard are
the ones that ship. _Instead:_ re-encode here, which would change bytes the
user has heard for nothing.

**C3. The mix is the player's, opted into by the game.** `SpritePlayer`
takes an optional `mix`: each sound's takes, family, level and whether it is
tuned. With it, the player plays takes in turn, varies a noisy sound at the
levels `tick` and `small` by up to 40 cents and 1.5 dB, pans by a share of
the field across (60% at most), keeps four voices of a sound, eight of a
family and twenty-four in all, ducks `tick` and `small` 6 dB for a third of a
second under `huge`, and puts a limiter after Phaser's master volume. Without
it, Snake and the brick games play as now. The rules that decide (which
take, how much variation, where it pans, which voice gives way) are pure
functions with specs, in one home, `@fz/core/sound_mix`, which
`@fz/phaser/sound` plays by and `@fz/dev`'s sound lab, whose
`sound_lab_mix.ts` has its own `variedPlay()` and `panOf()` today, takes
up in their place, each given its numbers; the Phaser glue is thin, as the
specs run Phaser with no audio. The kit's `sound/audition/audition.js` is
the reference.

**C4. A sound's name is the plan's, and the view maps events to them.** The
view's `SOUNDS` becomes the plan's ninety-eight names, less the beds, with
each one's family, level, takes and tuning in one record
(`src/view/effects/sounds.ts`). Today `EVENT_EFFECTS` holds an event's sound
and its flourishes in one entry; S3 splits it in its first commit, so the
sound stream and the feel stream never edit one entry: the sound each event
plays moves to `sounds.ts` (`EVENT_SOUNDS`, S's), and `effects.ts` keeps the
flourishes (F's). A sound the rules have no event for yet is listed and not
played until its package adds the event.

**C5. The chain's ladder is played by detune.** `chain-ping` is played at
the ladder's steps (`music`'s `CHAIN_CENTS`, copied into the view), a tuned
sound's only change, and a small bell under each break plays the step the
multiplier has reached. Detune changes length too, which a ping allows.

**C6. The beds are files of their own, loaded after the sprite.** The scene
loads a sector's bed and the two layers once the first wave is drawn, plays
them looped from one start so they stay on one bar line, and fades the
layers in and out by volume: the pulse from the multiplier's step two
(×3), the shimmer from step three (×4), on the chain until R2 and on static
after it. A sector change crossfades the bed over two seconds.

**C7. The sound settings are five switches.** `sound` stays what the bar's
Sound button turns, and mutes all; the drawer gains `effects`, `voice` and
`bed`, each true unless turned off, and `mono`, false unless turned on,
which sums the two ears into one (`plan.md`'s "A phone" row, for one ear or
one speaker, where a sound panned away would be lost). Each is read as
optional, so no stored setting is dropped.

**C8. The sound lab plays the new sounds beside the old,** as `plan.md`
says. Today's sprite moves out of the game into `tools/sound-lab/`, the
lab's "before", which the dev server alone serves and no build holds; the
ZzFX candidates, which were for designing the sounds again, go. The lab
plays every sound with its takes, the mix on or off, and its scenes as the
game plays them. Brick Fuzz Pop's lab, on the same page, plays as it did.

### Look

**C9. The light is chosen by a spike that opens L1,** time-boxed to a few
hours, between the two ways `plan.md` names:

- _A normal map:_ the view draws each facet a second time in the color its
  normal encodes (`normalColor()` in the art kit), which the scene bakes
  into a second atlas of the same frames and sets as the first's normal map
  (`Texture.setDataSource()`); each rock is lit with `setLighting(true)` by
  one light far to the upper left, and a blast or a zap adds a light while
  it lasts.
- _Turns baked ahead:_ each outline baked lit at eight or twelve turns, the
  two nearest crossfaded as the rock spins, a blast's light a tint.

The spike measures both on a crowded wave in Chrome: that it draws, and
draws the same after a lost context; the frame's cost with the CPU slowed
four times; the atlases' memory at 32 device pixels a unit; and the look
beside the kit's lit layer. The normal map wins if it draws, keeps the
frame within §9's budget and looks like the kit within reason, since it
costs one atlas more, not twelve, and turns smoothly. Under the normal map
a face's color is the shader's, the ink times the light on it, not one of
the kit's four tones, so the view works out the extremes from the ambient
and the light it hands the scene (the ink times the ambient alone, and
times the ambient and the full light), and the contrast spec holds those; a
lit face that can't come near the kit's mix toward white counts against
"looks like the kit". Either way the view computes the facets, and the
specs hold what it draws. The spike's figures and the choice go in L1's log
and §12.

**C10. The rocks' geometry is computed, not loaded.** `makeRock()`, its
dome, strips and dents, `litBy()`, `toneAt()`, `cracksOf()` and the tones
of an ink are ported from `art/lib/rocks.mjs` and `palettes.mjs` into
`src/view/art/rocks/` and `src/view/colors/tones.ts`, on `@fz/core/random`'s
`createRandom()`, which is the kit's `seeded()`. A spec holds one rock of
each kind to the kit's numbers, copied into it, so the port draws what the
user saw. `ROCK_OUTLINES` stays six. _Instead:_ import the kit's
`rocks.json`, 361 KB the game would load for what twenty lines of seeds
make.

**C11. Fine marks drop out under 10 CSS px a unit,** as the plan's table
says: rivets, glints, fractures, a lodestone's field and the pilot's glints.
The atlas is baked in device pixels, so the view is handed the pixel ratio
it bakes at.

**C12. A backdrop is painted once a wave into a texture,** from commands the
view gives, as Brick Breaker's places are. The washes and the vignette need
what the drawing vocabulary lacks, so `@fz/phaser/shapes` gains an alpha on
every command and a radial wash (§4). A Phaser `Graphics` has no radial
gradient, and a texture made from one shows none, so a backdrop is painted
on a canvas instead, through `drawCanvasTexture()`, by a painter of commands
that draws a wash with the canvas's own `createRadialGradient()`; `svgOf()`
writes the wash as an SVG gradient for the page. This is the backdrop's
alone: `plan.md`'s "the drawing vocabulary needs no gradient" was said of
the glow, which C13 keeps to. The near stars are a second texture that
slides against the
pod's travel by 3% of it at most; the Storm's fork flickers from the field's
steps; where motion isn't welcome nothing moves. Each landmark is drawn for
the field's shape, wide or tall.

**C13. A halo is one soft disc,** drawn once into a canvas texture with a
radial gradient by `@fz/phaser/scene` (§4), tinted, scaled and faded, under
plain alpha, never an additive blend, on a `halos` layer above the place
and the field and under the rocks, so no halo covers what it glows round.
Its strength is the kit's: 1 in a dark palette, 0.62 in a light one.

**C14. Shots say their weapon.** The `fired` event and each shot carry the
weapon, so the scene draws each weapon's shot and the sound plays each
weapon's shot. S3 adds it, the rules' one change of the S stream, and L4
waits on S3 for it.

**C15. The pod is Bumble, lit as the rocks are** (C9's way), its pilot
upright at its canopy, the fuzzball's grid of 32 drawn 1.18 field units
wide, as `pods.json`'s `pilot` says. The four marks are the plan's: the fur
for the multiplier's step, the
canopy's rim for the dash's charge, the Shield's glass shell, and the
dashed ring while nothing can touch it. The Shield's shell is the pod's own,
1.64 units, as the mocks show (`worklog.md`, "Left open").

**C16. The fuzzball's faces live with the mark.** The nine faces (rest,
blink, set, eep, happy, dizzy, sleepy, plead, squeeze), the look that shifts
the eyes, and the fur combed by force (a lean along a push) and by static
(four steps, the fourth sparking) are data in `@fz/style/fuzzball`, beside
the mark they are drawn on. `@fz/phaser/fuzzball` draws them as commands,
and `@fz/ui/fuzzball`'s `<fz-fuzzball>` takes `face` and `lift` inputs and
draws them in SVG. Brick Breaker and Brick Fuzz Pop keep their looks: their
art specs pass unchanged.

### Play

**C17. The crew is a pilot, a line in tow and those gone home.** `Crew`
becomes `{ pilot, tow, home, lastGiven }`: the one at the controls, the line
in tow in order (its last the first knocked loose), and every fuzzball that
went home in the run, brought, floated or bailed out. A run starts with
three, and six is the most: `FIRST_SHIPS` and `MAX_SHIPS` are renamed
`FIRST_CREW` and `MOST_CREW`, not added beside them. The pod is never
replaced, so `shipDueAt`, `NEW_SHIP_MS`, `safestPlace()`'s use after a loss,
`gainShip()`, `gainShipOn()`, ships by points (`nextShipAt`,
`FIRST_SHIP_POINTS`, `SHIP_POINTS`, `nextShipAfter()`) and the Extra ship
pickup all go in R1. `bringShip()` stays, for a run taken up.

Three names keep their place and change their meaning, so R1 says so where
each is declared:

- **A stray brought home is a stray caught,** whether it joins the line
  (`joined`) or the line is full and it goes straight home (`home`). Both
  count where a stray brought home counts today: `Run.strays`,
  `straysBanked`, the records' strays (`withStraysHome()`), the tally's
  Strays line, and the result's count. A fuzzball of the crew that floats
  home (`floated`) counts in none of them.
- **`lost` is the run's end,** the one hit with no one in tow, and keeps
  `LOST_BUZZ`; `knocked`, a hit that knocks one loose, buzzes
  `LOST_BUZZ` too, as the plan makes a hit a small event that the feel must
  carry.
- **A clean wave is a wave with no hit taken:** `Field.shipsLost` becomes
  `Field.hits`, which a hit the Shield takes doesn't count.

The 1.5 s after a hit is the ship's guard, `guardShip(ship, HIT_GUARD_MS)`,
a new number beside `SHIELD_GUARD_MS`, which `isGuarded()` and the dashed
ring read already.

**C18. The line in tow is the rules',** since bubbles in tow gather sparks:
its points, made once, follow the pod as a chain of fixed links, each 1.6
units from the one ahead across the wrap, the first far enough behind the
pod to clear its rings, each pulled straight toward the one ahead to its
link's length every step, so it swings as the pod turns. Nothing hits a
bubble in tow.

**C19. A loose fuzzball is a slot of its own,** five made once: it flies off
at 6 units a second, slows to a stray's drift, wraps, swells to a stray's
size, can be caught by touch for 6 s, and floats home after (`floated`), out
of the run. Each hit with someone in tow knocks the last loose, so two hits
in a row make two loose. The Magnet draws a loose fuzzball as it draws a
stray.

**C20. Static carries from wave to wave,** as the crew does: the run holds
it, a wave's field starts with it, and the saved run keeps it. The
multiplier is static's step, ×2 from 10, ×3 from 20, ×4 from 30, through
`@fz/core/math`'s `multiplierAt()` over `STATIC_STEPS`, as the chain's was.
A near miss is counted once a pass: a rock or a comet within half a unit of
the hit circle, untouched, marked so the same pass doesn't count twice.
The tally keeps what the multiplier added apart from what was broken, as
it keeps the chain's today: its lines are Rocks, Sparks (the sparks' own
points), Static (what the multiplier added to both, the line that was
Chains), Strays, Wave cleared and No hit taken, and they still add up to
the score, as `holdEveryWave()` holds.

**C21. The zap is the dash's.** A dash that starts at full static is a zap:
arcs leap to the six nearest live rocks within 6 units of the dash's path,
the segment it will fly (`DASH_SPEED` times `DASH_MS`, 7.5 units), each
takes a hit, and static falls by 20. The field logs `zapped` at the pod and
`arced` at each rock it reaches.

**C22. Bests are kept with their rules' number.** `RULES_VERSION` is 2 from
R2. Each best, a speed's and a sector's, keeps the number it was made
under, one stored without it read as 1. A best under older rules shows as
"earlier rules" and is no longer beaten: a run sets a best when it beats
the best under its own rules. `STATS_VERSION` stays 1, since an older entry
reads correctly.

**C23. One card between waves, and a card for a sector.** A cleared wave's
card shows its tally counting up, the crew cheering and the next wave's
name, with Next wave. Next wave lays the next wave out waiting for the first
move with no card over it; a flight key or a press on the field on the card
does the same and is that first move, so one press goes on. A sector's first
wave, a run's first among them, shows the sector's card over its place, its
name, its waves and what is new there, until the first move. The Ready card
goes.

**C24. The set pieces are three new kinds of boulder.** Wave 10's sheds a
medium stone with each hit it holds; wave 20's has an iron rind, ringing its
first three hits, each knocking a plate off as a medium iron rock; wave 30's
two have volatile hearts, each hit they hold venting a blast of 6 units that
hurts only rocks. Each drops two pickups as it breaks. They are kinds in
`ROCK_KINDS`, named by R3, so the compiler holds their art and their rules
complete. `boulder` stays as it is, for Endless, whose rocks `plan.md` keeps
as they are.

**C25. A burr wraps once it is in.** It comes in off an edge as a stray
does, then wraps as a rock does until it is popped or clings, so a missed
burr stays a thing to deal with. A wave sends burrs as it sends strays
(`burrs` in its data), Iron reach's waves 14, 17 and 19 and the Storm's
from 23 on to start, two adrift at most on 40 by 40, by area otherwise.
R4 tunes the waves by the report.

---

## 4. Lifts into the shared libraries

Each lift lands in the package that first needs it, with its specs and its
library's `AGENTS.md`, and every game that uses the entry passes its specs
unchanged unless the lift says otherwise.

1. **`@fz/dev/synth`** (S1). The plan's synth, music and measures in
   TypeScript, with specs that hold what the kit's self-test held (a saw's
   aliases far under its harmonics, pink noise at 3 dB an octave, the
   filter's slope) and the two instruments. `@fz/dev/sounds`'
   `renderSoundSprite()` learns a sample rate, takes, a gap and a fade,
   defaulting to what it does now, so the three games' byte-exact specs
   pass.
2. **The mix, in `@fz/core/sound_mix` and `@fz/phaser/sound`** (S2): C3's
   rules, pure, in `@fz/core`, beside `frame_sounds.ts`; the player's glue,
   a source in several formats (`url` as a list, the first the browser
   plays), and a looped layer player for the beds, which starts every layer
   together and fades each by volume, in `@fz/phaser/sound`. `@fz/phaser`
   and `@fz/dev` both come to depend on `@fz/core`, and their `AGENTS.md`
   say so; `@fz/dev` imports it only from `sound_lab_mix.ts`, which only the
   lab's page and Vitest load, never from the Vite plugin Node runs. Snake,
   Brick Breaker and Brick Fuzz Pop opt out by giving no `mix`.
3. **The fuzzball's faces and fur** (L5): C16. `combedStrands()` keeps its
   signature for the two brick games and gains a lean.
4. **Alpha and washes in `@fz/phaser/shapes`, a painter of commands on a
   canvas, and a soft disc, in `@fz/phaser/scene`** (L0, L3 and L4): an
   optional `alpha` on every `DrawCommand`, which `atlasFrameOf()` hands
   the `Graphics` and `svgOf()` writes (L0, since the art L1, L4, L5 and L6
   port draws cracks, glints, auras and halos at part strength); a
   `WashCommand` (an ellipse that fades from its middle by stops), in a
   `PaintCommand` that is `DrawCommand | WashCommand`, which only `svgOf()`
   (as a gradient) and the canvas painter take, so the compiler keeps a
   wash out of an atlas, which a `Graphics` can't draw (C12), and the
   switches over every `DrawCommand` in the games' art specs stay whole; the
   painter that draws `PaintCommand`s on a canvas's 2D context, for
   `drawCanvasTexture()` (L3); and `softDisc(scene, key, size)`, a white disc
   fading to nothing, drawn once through `drawCanvasTexture()` (L4). Brick
   Breaker's glow may take the disc later; this build doesn't move it.
5. **An atlas in pages** (L1, only if C9 chooses turns baked ahead and they
   outgrow 4096 px a side): `bakeAtlas()` packs into as many textures as it
   needs, and `atlasFrameOf()`'s callers find a frame's page by its name.

A lift's package runs the root's `yarn typecheck`, and the tests of every
workspace that uses the entry, since other games use it (§9).

---

## 5. Contracts

What one package hands another. A package may add to these as it builds, and
says so in its log; it renames nothing another package already uses.

### 5.1 Rules

- **R1:** `Crew` (C17); `Field.tow` (the pilots in order, and their points,
  `MOST_CREW - 1` made once), `Field.loose` (C19's slots), `Field.hits`.
  Events: `knocked` (a pilot knocked loose, with the way of the blow and how
  many are left in tow), `recaught`, `floated`, `joined` (a stray into the
  line), and `home` and `lost` as C17 redefines them. The `gained` event,
  `Field.shipDueAt`, `Run.nextShipAt` and the `ship` pickup go.
  `SAVED_GAME_VERSION` 2, once for the whole branch: R2 changes what version
  2 holds without raising it again, since no player stores the build between.
  The autopilot catches a loose fuzzball as it catches a stray; its report
  gains `knocked` and `floated`.
- **R2:** `Field.sparks` (slots, `MOST_SPARKS` made once: place, way,
  `shedAt`), `Field.charge` (`{ level, lastSparkAt }`), the multiplier from
  `charge.level`; `Run.charge`. Events: `sparked` (gathered, by the pod or a
  bubble in tow), `stepped` (static's step up or down, with the step),
  `grazed` (a near miss), `zapped` and `arced`; `scored` keeps `times`. The
  chain (`CHAIN`, `CHAIN_MS`, `Field.chain`, `lastBreakAt`) and the `nova`
  pickup and event go; `chainPoints` becomes the points static added, and
  the tally's lines are C20's. `RULES_VERSION` (C22). The autopilot gathers
  sparks on its way; its report gains the most static each play reached.
- **R3:** the three boulders (C24) and their events (`shed`, the blast's
  `vented`); the last rocks coming to the pod; a stray within the first 5 s
  of play on any field, and one sent at once, once a wave, to a pilot with
  no one in tow.
- **R4:** `Field.burrs` (slots), `Ship.burrs` (how many cling), `Flight`
  slowed by a fifth for each. Events: `strayed`'s like for a burr (`burred`
  as one comes in), `clung`, `popped` and `shaken`.
- **Numbers as values.** Each new number a power could change later is a
  field of a value record the field holds, beside `flight` and `gunnery`
  (`plan.md`, "Room for a progression system"): the spark's reach,
  static's size, drain and step, and the zap's arcs and reach in R2's
  `Sparking` record (named apart from `Field.charge`, the state), and the
  most in tow in R1's. The debug menu's sliders gain the spark's reach,
  static's drain and the zap's reach.
- **Sounds for new events.** An event a rules package adds before its sound
  is wired plays none (no sound in its entry, as a quiet event's is today,
  `moving(null)`). A sound package wires every event on the tip it lands
  on, those that came while it worked among them, since the integrator
  rebases it onto that tip; a rules package that lands after the last sound
  package wires its own events' sounds and voice calls, by the plan's names
  (`assets/sound/sounds.json` says in words what each sound plays for, its
  `plays`).

### 5.2 View and scene

- **Layers** (`src/view/field/layers.ts`), back to front: `place` (L3),
  `field`, `halos` (L4), then today's from `tags` on, with `tow` under
  `ship` (P3), `sparks` over `pickups` (P4) and `arcs` over `effects` (P4).
- **Painters:** `PlacePainter` (L3), `HaloPainter` (L4), `PodPainter` in
  place of `ShipPainter` (L6), `TowPainter` (P3, the line, the bubbles in
  tow and the loose), `SparkPainter` and `ArcPainter` (P4), and the burr in
  `HazardPainter` (R4).
- **The pilot's face** is a view function of the frame and the time,
  `faceOf()`, in `src/view/art/faces.ts` (L6), which the pod painter draws
  and the shell's face cam shows (P1), each from the same rule.
- **The palette** gains what C9's way draws by (each ink's four tones under
  turns baked ahead, or the ambient and the light under a normal map) and
  the halo's strength (L4); `contrast.spec.ts` holds a rock's brightest face
  in a light palette and its darkest in a dark one to 3:1 against the field,
  with the rest: the lit and shaded tones, or C9's extremes.
- **The flourishes** keep `FlourishPlayer`'s one door: each new one is a
  member of `Flourish` with its helper in `flourish.ts` and its time in
  `timing.ts` (F1, F2). The field holding still is `WavePlay`'s, which skips
  the field's clock for its span (F1).

### 5.3 Shell

- **`GameService`** gains `crew()` in C17's shape (R1), `face()` (P1),
  `multiplier()` and `step()` from the chain and then static (P1, R2), and
  the next wave's entry for the card (P2).
- **`RunState`** gains what the new card shows; each field a package adds
  joins `withFrame()`'s check for no change and `BEGUN_OWN` in the service's
  spec.
- **Settings:** `effects`, `voice`, `bed` and `mono` (S4), read as optional.
- **Stats:** each best with its rules' number (R2).

---

## 6. Work packages

Each package is one agent's run, in small commits, each one whole: its code,
its specs, its docs. Each says what it owns (§7.3), what it builds, and when
it is done. Every package updates the game's `AGENTS.md`, its skills and the
`AGENTS.md` of every library it changes, for what it changed, in the same
commits, since they are read as true; and every package that changes what a
player sees looks at it in a browser before its last commit (§8).

### S: the sound

**S1. The synth and the sounds** (large; no wait).

- `@fz/dev/synth` (§4, lift 1), with its specs and `frontend/lib/dev/AGENTS.md`.
- The recipes, all nine families, into `tools/sounds/` as `.mjs` on
  `@fz/dev/synth` and `tools/sounds/ship_parts.mjs`; `tools/build-sounds.mjs`
  renders, packs and encodes (C2), with `--family` and `--only` to render a
  few, and its spec on what it can check without rendering everything: the
  map against the recipes, a few short takes rendered and measured.
- The kit's encodes and their map into `src/scene/sounds/` beside today's
  sprite (C2), which the game goes on playing until S3, since loading two
  formats is S2's.
- Done when every take renders byte for byte as the kit's did (logged), and
  the build's spec holds the shipped map.

**S2. The mix** (medium; no wait). §4's lift 2: C3's rules as pure
functions with specs in `@fz/core/sound_mix`, `@fz/dev`'s sound lab taking
them up in place of its own `variedPlay()` and `panOf()`, the player's glue
in `@fz/phaser/sound`, the source in two formats, the layer player for the
beds. Done when Snake's, Brick Breaker's and Brick Fuzz Pop's specs pass
unchanged, Brick Fuzz Pop's sound lab plays as it did, and the libraries'
specs cover the rules.

**S3. Every event heard** (large; after S1 and S2). First, `EVENT_EFFECTS`
split in two (C4). Then the game on the new sprite: `src/view/effects/sounds.ts`
(C4), the scene loading the Ogg and the M4A, every event on the tip mapped
to its plan's sound, and today's sprite and its names moved into
`tools/sound-lab/` as the lab's "before", the lab repointed in the same
commit, so its typecheck never breaks (C8). The weapon on `fired` and on
each shot (C14). The game hands `SpritePlayer` its mix and plays the plan's
table: takes, variation, place by the event's `x`, Rapid 3 dB under the
gun, the crowd (more than three breaks a frame play as the
two largest and `break-cluster`), ducking, the ladder on today's chain
(C5), `shot-tail` when the fire stops, `dash-ready`, `effect-end`, the
comet's warning faster rather than louder, `pickup-drop`, `pickup-fade`
and `stray-appear` for the events that were silent, a sound and a sight for
each. The sound lab (C8). Done when every event the field logs plays its
sound in the scene's specs and the lab plays every sound.

**S4. The voice and the beds** (small; after S3). The fuzzball's calls at
the events that have them now (a dash one time in three, a wave cleared, a
stray's arrival, and every event of R1's and R2's on the tip it starts
from), its patience (once in four seconds at most, the rarer call winning)
and its level; the beds and their layers (C6); the settings (C7) in the
drawer, `SettingsService` and the scene, `mono` by the audio context's
destination taking one channel. The calls for an event that lands after S4
are wired by its package (§5.1). Done when the scene's specs hold the
patience and the layers' steps, and a browser plays a bed under play.

### L: the look

**L0. Alpha** (small; no wait). §4's lift 4's first part: an optional
`alpha` on every `DrawCommand`, which `atlasFrameOf()` hands the
`Graphics` and `svgOf()` writes, with specs, since L1, L3, L4, L5 and L6
all port art drawn at part strength. Done when every game's art specs pass
unchanged.

**L1. Rocks cut and lit** (large; after L0). The spike (C9), then: the port
(C10), the tones, the seven kinds cut in facets with their marks, the fine
marks by size (C11), hits held as cracks in from the edge, the same ones
every time (`cracksOf()`), the light by C9's choice, the struck faces'
flash, the contrast spec, How to play's pictures, and §4's lift 5 if it is
needed. Done when every kind shows lit in all four palettes in a browser,
the art specs hold the frames to their reach, and §9's frame budget holds.

**L2. Breaks and hits** (medium; after L1). A rock's break throws its own
facets, tumbling and fading to the field's color, with a ring of dust and a
few sparks of light, all under half a second (`makeBreak()`'s rule, in the
view); a held hit's spark. The debris painter draws them from the rock's
facets. Done when a break in a browser looks as `energy-and-effects.svg`
does, and the debris specs hold the pieces' count and time.

**L3. Places** (medium; after L0). §4's lift 4 (the wash and the painter of
commands on a canvas, C12), the four sectors' backdrops ported
from `art/lib/backdrop.mjs` into `src/view/places/`, quiet by the plan's
measure (a spec holds each place's largest shape
to 1.3:1 against the field), drawn by `PlacePainter` on the `place` layer,
again on a new palette, a new shape or a new sector; today's specks become
the place's stars, and Endless keeps its constellation over its galaxy.
Done when each place shows in a dark and a light palette, wide and tall.

**L4. Glow and energy** (medium; after L1 and S3, whose weapon on `fired`
it draws by). The soft disc (§4, lift 4), the
halo painter, each weapon's shot (C14), the muzzle's flash (its art; F1
plays it), the comet as a cut wedge with its tail and its warning's chevrons
and lane,
pickups as orbs with their rims by group, all from `art/lib/fx.mjs` and
`things.mjs`. Done when each shows in four palettes and §9's frame budget
holds with halos.

**L5. The fuzzball's faces and fur** (medium; after L0). §4's lift 3: the
faces, the look, the fur by force and static as data in `@fz/style/fuzzball`
from `art/lib/fuzzball.mjs`, commands in `@fz/phaser/fuzzball`, and
`<fz-fuzzball [face] [lift]>` in `@fz/ui`. Done when the brick games' art
specs pass unchanged and each library's specs cover the faces.

**L6. The pod and its pilot** (medium; after L1 and L5). Bumble, lit by C9's
way (C15); the pilot upright and large, its faces chosen by `faceOf()` and
its look toward where the pod points or what threatens it; its fur by force
(a lag after a thrust, swept flat in a dash) and by the chain's step, until
R2 hands it static's; the canopy's rim filling as the dash charges, with
one flash and `dash-ready` as it fills; the Shield's shell; the dashed ring;
the flame and the exhaust, from `fx.mjs`. A lost run's bail-out takes the
new pilot. Done when the pod reads at 14 px
long on a small phone in a browser and the art specs hold its reach.

### P: the shell, and what the new rules show

**P1. The face cam and the pips** (small; after L5, and L6, whose
`faceOf()` it shows). `<app-face-cam>`, the
pilot at the controls in its ink with the face and lift the field shows
(`face()`, `step()`), first among the bar's crew; the multiplier as a number
and four pips, beside the face cam on a compact bar; on today's chain. Done
when the bar's specs and `yarn check:layout` pass at every shape.

**P2. One card between waves** (medium; no wait). C23: the Cleared card
with the tally counting up (none where motion isn't welcome), the crew and
the next wave's name; the sector's card; the Ready card gone; the flow in
`GameService` and `RunFrames`; the announcer's words for both. Done when the
service's and the cards' specs hold one press going on and the sector card
showing until the first move, and `yarn check:layout` passes.

**P3. The crew on the field and in the shell** (medium; after R1, P1 and
P2). `TowPainter`: the line, the bubbles in tow and the loose ones, swelling
as they go and blinking their last 2 s, drawn across the wrap as a chain;
the faces in tow (each looks at what is near, startles as a rock passes
close, cheers at a clearing); the bar's crew, a count past three; the
Paused card's; the result's "Everyone is home." and the fuzzballs who flew;
the cleared card's crew cheering; How to play's scoring and lives. Done when
a browser shows a hit knocking the last one loose and catching it again.

**P4. Static on the field and in the shell** (medium; after R2, P3, L4 and
L6). `SparkPainter` (sparks with their halos, blinking their last second,
drawn in to the pod), `ArcPainter` (the zap's arcs, a white core and the
accent's body), the fur and the pips on static, the tally's Sparks line,
bests under "earlier rules" in the result and the sectors, How to play's
static and zap. Done when a browser shows sparks gathered, a step's ring
and a zap.

### R: the rules

**R1. The crew in tow** (large; no wait). C17 to C19 in the rules, with the
hit's 1.5 s guard and its step of static (on the chain until R2: a hit ends
the chain), the stray joining the line or going home for 1,000, the run's
end with no one in tow; `saved_game.ts` and `kept_field.ts` (version 2: who
is at the controls and who is in tow; a loose fuzzball goes); `describe.ts`'s
lines (knocked loose and how many are in tow, caught again, floated home);
the autopilot catching a loose fuzzball; `report:waves`' new columns; How to
play's and the bar's least to compile, P3 doing the rest. Done when every
wave's `sim` specs pass at every speed and the report's figures are logged.

**R2. Sparks, static and the zap** (large; after R1). C20 to C22: sparks
shed, drawn in from 5 units (8 at Relaxed, 14 under the Magnet) and gathered
by the pod and the bubbles in tow within 1.2; static, its drain and its
steps; near misses; the zap; the chain, Nova and its event gone; the Magnet
drawing sparks and the loose; bests by rules; the saved run (still version
2, its static kept, sparks gone); the autopilot gathering sparks on its way; the
report's static column; the debug menu's new sliders. Done as R1.

**R3. The wave** (medium; after R2, and L1, on whose facets it draws the
set pieces). The last rocks come to the pod (when
three or fewer are left on 40 by 40, more by area, each leaning toward it
as a lodestone does, never faster than its size flies); the three set pieces
(C24) with their art drawn on L1's facets (iron's tones on the boulder's
dome; the volatile's glowing seams); strays when they can still matter. Done
when the report shows every wave's tail no longer, and the set pieces cleared
at every speed.

**R4. The burr** (small; after R3, L4 and S3). C25: the rule, the art
(`things.mjs`'s burr: six barbed thorns in a dull brown), its sounds, its
announcement ("A burr clings."), the autopilot shooting burrs and dashing
them off, the waves that send them. Done as R1.

### F: the feel

**F1. Feel** (medium; after L2, L4, L6 and R1). `plan.md`'s "Feel" table for
what the field already does: a shot's flash, a break's kick along the blow,
a held hit, a blast lighting its neighbours, a boulder's three beats with
the field held still first, a sector's last rock slowing the field to a
third, the run's end with the card waiting for the pilot's bubble; the
budget (a shake for a hit and a boulder alone, along the blow, still within
0.3 s; held still for a boulder, a zap and the run's end); a still form for
each where motion isn't welcome. Done when `flourishes.spec.ts` holds each
row and its still form.

**F2. Feel for the new rules** (small; after F1 and P4). The table's rows
for a zap, a fuzzball knocked loose, one caught and static stepping up, with
their still forms. Done as F1.

### Z: finishing (the integrator)

**Z1.** The site's screenshots taken again on the new look, the old preview
kept beside `plan.md` as `before.webp` and linked from it in the same
commit; a fresh read of the game's `AGENTS.md`, its skills and every library
`AGENTS.md` the branch changed, against the code, by two fresh agents; the
report's figures at every speed, and Endless's; the checks of §11.

---

## 7. Running it in parallel

### 7.1 The dependencies

```text
R1 ─ R2 ─ R3 ─ R4     R3 also after L1; R4 also after L4 and S3
R1 ─ P3 ─ P4 ─ F2     P3 also after P1 and P2; P4 also after R2, L4 and L6;
                      F2 also after F1
L0 ─ L1 ─ L2 ─ F1     F1 also after L4, L6 and R1
L1 ─ L4               L4 also after S3
L1 ─ L6 ─ P1          L6 and P1 also after L5
L0 ─ L3, L0 ─ L5
S1 ─ S3 ─ S4          S3 also after S2
L0, R1, S1, S2, P2    no wait
```

Five packages wait on nothing. The longest chain is R1 to R4, then F2 and
Z1, so R is never kept waiting for a slot. L0 is small and comes first, as
three look packages wait on it.

### 7.2 Slots, and the order packages take them

At most five packages run at once (§9 says why five), each a fresh
`general-purpose` agent in the background. When one finishes, the integrator
lands it (§7.5) and starts the next ready package by this order:

1. the R stream's next;
2. a package another waits on: L0, L1, S1, S2, L5, and R1's followers P3
   and F1;
3. the rest, the largest first.

| Starts first       | Then, as slots free and their waits end                        |
| ------------------ | -------------------------------------------------------------- |
| L0, R1, S1, S2, P2 | L1, L5, L3, S3, L2, L6, L4, P1, R2, S4, P3, F1, R3, P4, R4, F2 |

A stream's next package is a fresh agent, so no agent carries one
package's context into the next; it reads the last package's log instead.

### 7.3 Who owns what

A package changes the files it owns freely. Two packages never restyle one
file side by side: where two packages of a stream run at once, each owns
its own files, and the stream's shared files are add-only to both.

| Package | Owns                                                                                                                                                                                                                         |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1      | `frontend/lib/dev/src/synth*`, `frontend/lib/dev/src/sounds*`, `tools/build-sounds.mjs`, `tools/sounds/`, the new files in `src/scene/sounds/`                                                                               |
| S2      | `frontend/lib/core/src/sound_mix*`, `frontend/lib/phaser/src/sound/`, `frontend/lib/dev/src/sound_lab*`                                                                                                                      |
| S3, S4  | what S1 and S2 owned, `src/scene/sounds/`, `src/view/effects/sounds.ts`, `tools/sound-lab.ts`, `tools/sound-lab/`; S3 the split of `src/view/effects/effects.ts`; S4 the settings' sound switches                            |
| L0      | `frontend/lib/phaser/src/shapes/`, `frontend/lib/phaser/src/scene/shapes_frame*`                                                                                                                                             |
| L1      | `src/view/art/rock_art.ts`, `src/view/art/rocks/`, `src/view/colors/`, `src/scene/atlas.ts`, `rock_painter.ts`, `frontend/lib/phaser/src/scene/bake_atlas*` (lift 5)                                                         |
| L2      | `debris_painter.ts`, `src/view/art/breaks.ts`                                                                                                                                                                                |
| L3      | `src/view/places/`, `place_painter.ts`, `field_painter.ts`, `src/view/field/specks.ts`, `frontend/lib/phaser/src/shapes/` after L0, the canvas painter's file in `frontend/lib/phaser/src/scene/`                            |
| L4      | `src/view/art/{symbols,energy,things}.ts`, `halo_painter.ts`, `shot_painter.ts`, `pickup_painter.ts`, `hazard_painter.ts`, `tag_painter.ts`, `src/view/field/warning.ts`, `soft_disc*` in `frontend/lib/phaser/src/scene/`   |
| L5      | `frontend/lib/style/src/fuzzball*`, `frontend/lib/phaser/src/fuzzball/`, `frontend/lib/ui/src/fuzzball/`                                                                                                                     |
| L6      | `src/view/art/{ship_art,pod_art,pilot_art,faces}.ts`, `ship_painter.ts` (to become `pod_painter.ts`), `stray_painter.ts`, `trail_painter.ts`, `exhaust_painter.ts`                                                           |
| P1      | `src/app/bar/`, `src/app/pilot/`, a `src/app/face_cam/`                                                                                                                                                                      |
| P2      | `src/app/board/`, `src/app/play/`, `src/view/run_frames.ts`, `src/view/run_state.ts`, `src/view/tally.ts`, `src/testing/play.ts`                                                                                             |
| P3, P4  | everything P1 and P2 owned, `src/app/{result,help,sectors}/`, `tools/check-layout.mjs`, `TowPainter`, `SparkPainter`, `ArcPainter`                                                                                           |
| R       | `src/rules/`, `src/testing/{autopilot,every_wave,every_layout,field_picture,run_under_way,kept_run,report_api,script_api}.ts`, `tools/report-waves.mjs`, `src/view/debug_tuning.ts`                                          |
| F       | `src/view/effects/{effects,flourish,timing,haptics}.ts` (after S3's split, `effects.ts` holds the flourishes alone), `src/scene/flourish_player.ts`, `src/scene/field_camera.ts`, `ring_painter.ts`, `src/view/wave_play.ts` |

Painters' files are in `src/scene/painters/`. **Add-only to every package
that needs them:** `src/view/art/art.ts` (the frame list) and
`src/view/art/shapes.ts`, `src/view/colors/palette.ts` after L1,
`src/view/field/layers.ts`, `src/view/field/frame.ts` (`FieldView`, which
each rules package extends), `src/scene/painters/painter.ts`,
`src/scene/belt_scene.ts`, the index of each library entry, and every
`AGENTS.md` and skill. P1 and P2 run side by side and touch `GameService`
both: P1 only adds its signals there.

**Shared by necessity: add, restyle nothing.** Most packages must touch
another stream's file, mostly a record the compiler holds whole: an event's
entry in `EVENT_EFFECTS` and `describeEvent()`, a kind's art in `ROCK_ART`, a
painter joining `belt_scene.ts` and `LAYERS`, a field joining `RunState`,
the scene's `FakeShell`, the game's `AGENTS.md` and skills. Such a package may
add to another stream's file, and only add: an entry, a field, a member, a
function of its own, a line or a paragraph of docs. It renames, moves and
restyles nothing there, and its log says what it added where. A rules
package that removes, renames or reshapes a thing of its own (a ship
gained, the chain, Nova, `Crew`'s shape, `FIRST_SHIPS`) changes its uses
everywhere in the same commit, since the compiler asks it to, and nothing
more. The integrator settles what collides as it rebases (§7.5).

### 7.4 How an agent works

Each package's agent is briefed with this file, its package, its worktree
and branch, the files it owns, the logs of the packages it follows, and the
checks. It:

1. starts in its own worktree, `.claude/worktrees/abu-<package>` on the
   branch `abu/<package>`, which the integrator cut from the integration
   branch's tip and installed (`yarn install --immutable`, then
   `node .agents/link-claude-skills.mjs`);
2. reads `.agents/AGENTS.md`, `frontend/AGENTS.md`, the `AGENTS.md` and the
   skills of what it touches (`asteroid-breaker-content`,
   `asteroid-breaker-testing`, `phaser-core` and the Phaser skills it uses,
   `fuzzley-ui`, `angular-testing`, `web-game-accessibility`), and
   `plan.md`'s sections for its package;
3. builds in small commits, each one whole;
4. checks each commit (§9's list), then has it reviewed by the
   `commit-review-process` skill: it stages the change, launches a fresh
   `general-purpose` reviewer with the skill's brief, which reads the staged
   diff with only the project's and the package's context, answers every
   comment, fixing it or saying why not in its log, and commits in the
   repository's form, `type(asteroid-breaker): a lower-case sentence`, with
   no attribution lines;
5. writes its log as it goes (§7.6);
6. reports what it made, what it checked, what the reviews found and how
   each was answered, and what it left.

An agent that finds a design point unsettled takes the choice §3's spirit
gives, notes it in its log, and goes on. An agent that can't launch a
reviewer stops with its change staged and says so, and the integrator runs
the review.

The main checkout is another session's, so an agent works only in its own
worktree. It never pushes, never touches `main`, the integration branch or
another package's branch, and never uses `git stash`, whose stack every
worktree shares.

Two agents never share a dev server or a browser page. A package serves the
game on its own port, from this list: S1 9101, S2 9102, S3 9103, S4 9104,
L0 9110, L1 9111, L2 9112, L3 9113, L4 9114, L5 9115, L6 9116, P1
9121, P2 9122, P3 9123, P4 9124, R1 9131, R2 9132, R3 9133, R4 9134, F1 9141,
F2 9142 (`yarn dev --port <n> --strictPort`), in a headless Chrome page of
its own (the `chrome-devtools-headless` server's `new_page`), and closes the
page and stops the server when it is done. `check:layout` serves on a free
port of its own, so two can run at once.

### 7.5 How the work comes together

The integrator owns `asteroid-breaker-uplift`, in `.claude/worktrees/abu`,
and no package commits to it. When a package reports done, the integrator:

1. reads its report and its log, and checks its commits' reviews were run;
2. rebases its branch onto the integration tip, in the package's worktree;
3. settles what collides, and where the settling changed more than a list
   or a paragraph, has the conflict's delta reviewed again by a fresh agent,
   from `git range-diff` of the branch before and after;
4. runs the checks on the rebased branch: the game's lint, typecheck and
   tests, each library's the package touched, and the root's `yarn lint`;
5. fast-forwards the integration branch to it
   (`git merge --ff-only abu/<package>` in `.claude/worktrees/abu`);
6. removes the package's worktree and branch, and starts what waited on it.

**After every few landings,** and whenever `origin/main` moves, the
integrator runs `yarn verify` and `yarn check:layout` on the tip, and
rebases the integration branch onto `origin/main` (§10), then the packages
that start after it begin from the new tip. It records the tip before each
such rebase in its log, and a package under way, cut from the old tip,
lands with `git rebase --onto asteroid-breaker-uplift <old tip>`, so only
its own commits move.

History stays linear, as the repository's is: no merge commits, no squashes.

### 7.6 The work logs

Each package keeps `docs/asteroid-breaker-uplift/worklog/<package>.md`,
written in its own commits: what it did, commit by commit, what each review
found and how it was answered, the choices it made, the figures it
measured, and what it left. The integrator keeps `worklog/integration.md`:
each package started and landed, its checks, what collided and how it was
settled, the rebases onto `main`, and the verify runs. A log is never edited
by another package, so the logs never collide. They are deleted before the
merge (§11), with the design's `worklog.md`, and git keeps them.

---

## 8. Practices

The repository's and the workspace's `AGENTS.md` hold, and the skills for
what each package touches. On top of them:

- **The rules stay the autopilot's.** Every new rule is deterministic from
  the seed, reads no clock and draws only through `nextDraw()`, so the
  autopilot plays it as a player's field plays it. A step makes nothing:
  new state lives on records made once, as the rocks, shots and pickups do.
- **A kind is whole when the compiler and the specs say so.** Records keyed
  by an id (`ROCK_ART`, `TRAIT_RULES`, `EFFECT_RULES`, `EVENT_EFFECTS`,
  `describeEvent()`'s switch) fail to compile without the new entry; what
  the saved game keeps is a list the round-trip spec holds.
- **Specs draw the field rather than play to it** (`fieldFrom()`,
  `placeRock()`), and check state through the rules' own reading, as the
  testing skill shows; the shell's specs play the small waves of
  `src/testing/play.ts`.
- **The view stays Phaser's stranger.** What to draw is plain commands in
  the view, held by specs in Node; the scene only bakes and places them.
- **The shell binds, it doesn't compute:** each new figure and card line is
  a `computed()` over the game's signals.
- **Accessibility:** the announcer says what `plan.md`'s "Accessibility"
  lists; nothing is told by color or by sound alone; every flourish has its
  still form; the sound has its own switches (C7).
- **Nothing ships unseen.** A package that changes what a player sees or
  hears looks at it, or plays it, in a browser before its last commit, and
  says in its log what it saw. A package that changes a sound says what it
  checked of it by measure, since no agent can hear (§10).

---

## 9. Budgets and checks

**Each commit's checks,** from `frontend/`, before its review, as the
`commit-review-process` skill asks:

- each touched workspace's `lint`, `typecheck` and `test`, the tests with
  `--maxWorkers=4`, so five packages at once hold the machine;
- the root's `yarn lint`, under a lock every package shares
  (`flock /tmp/abu-root-checks.lock yarn lint`), so no two run together;
- where the commit changes a library, the root's `yarn typecheck`, and the
  tests of every workspace that uses the changed entry
  (`yarn test --only <names> --jobs 2 -- --maxWorkers=4`), under the same
  lock, since other games use it; never the whole `yarn test`, which runs
  four workspaces on a quarter of the machine each, on top of the others;
- at a package's last commit that touches the rules or the view, the game's
  `yarn test:coverage`, held to its floors.

To format, never `yarn prettier`, which rewrites the whole repository, but
`node_modules/.bin/prettier --write <paths>` from `frontend/` over the files
changed (the paths relative to it, or `../docs/...`).

**Timings at the start** (`e6740e04`, warm, on this machine's 24 cores and
23 GB): the game's tests 42 s on eight workers (5,219 specs in 95 files),
its lint 23 s and its typecheck 14 s. Five packages at once, each on four
workers, take 20 of the 24 cores at their peak; ESLint's type-aware rules
and Angular's compiler take a gigabyte or more each, so five is the most.

**Budgets:**

- **The simulations.** The `sim` project plays every wave at three speeds
  on three fields. A rule that slows the autopilot's plays by more than a
  quarter says why in its package's log.
- **A wave's time.** The autopilot clears every wave in four minutes
  (`AUTOPILOT_LIMIT`), as now; R3 holds every wave's tail no longer than
  it is at the start.
- **A frame.** With the CPU slowed four times in Chrome, a crowded wave
  (wave 9, Crowd, on the widest field) keeps its median frame's scripting
  and rendering within a third more than it takes at the start. Every look
  package measures its build and the integration tip it started from side
  by side, in one sitting, so the machine's load weighs on both alike, and
  logs the two.
- **The atlases** stay inside 4096 px a side each at 32 device pixels a
  unit, which the art spec holds.
- **The download.** The sprite adds about 1 MB to what a browser fetches,
  the beds about 1.4 MB, fetched after the first wave is drawn; the scene's
  chunk grows by no more than the ported art's code.
- **The coverage floors** hold: 100% of statements, functions and lines and
  95% of branches over the rules and the view; the scene's and the shell's
  as `vitest.config.ts` sets them, raised where the figures outgrow them.

---

## 10. Risks to the build, and what answers them

| Risk                                                                 | What answers it                                                                                                                                                |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phaser's lighting fails on a texture made at run time, or costs much | C9's spike decides before L1 builds, with turns baked ahead as the way that needs nothing new                                                                  |
| No agent can hear, and ffmpeg is not on this machine                 | The sounds ship as the user heard them (C2); S1 proves the port byte for byte; what nobody has heard (the sounds in the game, on a phone) is left for the user |
| The crew in tow makes the game kinder                                | The report's lost and floated columns, and How to play's numbers, for the user to play by hand; the numbers are tuning, not structure                          |
| The autopilot can't clear a wave under a new rule                    | The rule's package teaches it, as R1 to R4 say, and the report is run again after each                                                                         |
| Two packages edit one shared file                                    | §7.3's ownership, additions in their own places, and the integrator's rebase, with a conflict's delta reviewed again                                           |
| Another session's work sits uncommitted in the main checkout         | Nothing is done there; the branch lives in its own worktree, and the merge touches the main checkout only by a fast-forward its changes allow                  |
| `main` moves under the branch, as the CI work lands                  | The integrator rebases onto `origin/main` as it moves, so the faster checks serve the build, and again before the merge                                        |
| Five agents at once starve the specs                                 | Four workers each, the root's checks one at a time under a lock                                                                                                |
| More on a phone's screen than it can show                            | The look packages check a small phone upright in a browser; `yarn check:layout` holds the bar                                                                  |

---

## 11. Finishing and merging

The user asked for the work log to be deleted, the work merged into `main`
and pushed, once it is done. So, after Z1:

1. `docs/asteroid-breaker-uplift/` moves to
   `docs/archive/asteroid-breaker-uplift/`, the plan, this file and the
   assets with it, with an "As built" section here (§12) saying what the
   build decided that the sections above don't, and what it left for the
   user.
2. The work logs, `worklog/` and the design's `worklog.md`, are deleted.
3. The `merge-to-main` skill: `yarn verify:full` and `yarn check:layout` on
   the tip, the change's own code covered, then a fast-forward push to
   `main`, the local `main` brought up to it where its checkout allows, and
   the package branches and worktrees removed.
