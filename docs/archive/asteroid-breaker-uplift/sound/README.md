# The sound of the uplift: direction and kit

How the uplift's sounds are meant to sound, and how the scripts here make
them. The plan, [`../plan.md`](../plan.md), says why, and
[`../research/sound.md`](../research/sound.md) holds what other games and
sound designers teach; this page is what anyone writing a recipe keeps to.

Nobody building these sounds can hear them. The scripts measure every take
and draw its spectrum, which catches what is broken, thin, dull or too
quiet for a phone, and no more. **The page in `audition/` is where a person
hears them, and a person's ear decides.** [`listen-for.md`](listen-for.md) holds
what that ear has said so far, and what each sound's maker doubted.

## The direction: struck things, small voices, one key

1. **A sound is layers, each with a job.** A _transient_ says when (a click,
   a crack, 2 to 15 ms). A _body_ says what and how big (a tone, a thump, a
   ring, 50 to 400 ms). A _tail_ says where (debris settling, a short
   room, 100 to 900 ms). _Air_ above 6 kHz says it is close and real. Most
   of today's sounds are a body alone.
2. **Material is the ring.** Stone knocks and crumbles: a few low, short,
   scattered partials under noise. Ice is glass: many high partials that
   die fast, and a spray of tinkles. A crystal chimes, in key. Iron clanks
   and rings on, its partials scattered and long. A volatile rock thumps,
   roars and crackles. Size moves all of it down in pitch and out in time.
3. **One key.** Every pitched sound is in C major pentatonic, which is A
   minor pentatonic (`lib/music.mjs`): C, D, E, G, A. Rewards lean on C, E
   and G; danger and loss on A, C and E. A chain of breaks climbs the scale
   with a small bell under each break (`recipes/chain.mjs`).
4. **The fuzzball has a voice.** Short, round, wordless: a chirp, a squeak,
   a trill. It speaks rarely and never in a pile-up, so it stays charming.
5. **Never the same twice.** Anything heard often has several takes, built
   from the same recipe with other seeds and slightly other numbers, and
   the game varies each play a little more (pitch and level).
6. **A phone must still hear it.** A phone's speaker gives almost nothing
   under 300 Hz. Every sound but a bed keeps at least 35% of its energy
   above 300 Hz (the build warns below that): a low thump carries
   harmonics or a knock an octave or two up, so its size is heard without
   its fundamental.
7. **Quiet when it is frequent, loud when it is rare.** A sound's level is
   one of six (`LEVELS` in `build.mjs`), from a shot's tick to a blast. The
   gaps between the levels are the mix, so nothing needs turning down in
   the game.
8. **Nothing harsh.** No bare sine above 3 kHz for longer than a blink, no
   long noise above 8 kHz at full level, no alarm that nags. Warnings are
   clear and calm.

## The kit

| File                   | What it is                                                       |
| ---------------------- | ---------------------------------------------------------------- |
| `lib/synth.mjs`        | The synth: sources, envelopes, filters, resonators, space, files |
| `lib/music.mjs`        | The key, the scale and the chain's ladder                        |
| `lib/analyze.mjs`      | The instruments: loudness, bands, pictures, a loop's seam        |
| `lib/parts-*.mjs`      | What a few families share: impacts, the ship's tones, the voice  |
| `recipes/<family>.mjs` | A family of sounds, each a recipe                                |
| `build.mjs`            | Renders, levels, measures and writes every family                |
| `encode.mjs`           | Packs the takes as a game would ship them, with ffmpeg           |
| `audition/`            | The page the sounds are heard on, and what serves it             |

A family's module exports `SOUNDS`, a list of recipes (`Recipe` in
`build.mjs`): a name, a sentence about it, how many takes, its level, and
`make(take, seed)`, which returns a take's samples. `recipes/chain.mjs` is
the one to copy.

```bash
node docs/archive/asteroid-breaker-uplift/sound/build.mjs rocks
```

builds one family: its takes into `../assets/sound/wav/rocks/`, their
pictures into `sheets/rocks.png`, their measurements and any warnings into
`report/rocks.md`. Without a name it builds them all.

```bash
node docs/archive/asteroid-breaker-uplift/sound/encode.mjs
```

packs what was built: every take but the beds into one sprite, as Ogg and
as M4A with the map Phaser plays a sprite by
(`../assets/sound/sprite/`), and each bed by itself
(`../assets/sound/beds/`). It needs ffmpeg on the path.

```bash
node docs/archive/asteroid-breaker-uplift/sound/audition/serve.mjs
```

serves the page to hear them on, at `http://localhost:9120/`: moments of
play with today's sounds and with the uplift's, every take on a button of
its own, the beds, and a mark and a note to leave against each.

### Writing a recipe

- **Start from what the thing is,** not from a waveform: what is struck,
  what it is made of, how big it is, how hard it was hit, and what happens
  after. Then give each of those a layer.
- **Takes differ where the real thing would:** which partials ring, how
  hard the hit, how the debris falls. Draw every difference from the seed
  (`seeded(seed)`), a few percent of pitch, 10 to 20% of a decay, other
  noise. `take` is there for a take that should differ by design.
- **Use the whole spectrum on purpose.** Look at the picture: a body in the
  mids, a transient that reaches high, a tail that falls away, and nothing
  smeared across everything for its whole length.
- **A little room on everything** (`reverb()`, a decay of 0.15 to 0.5 s, a
  mix of 0.06 to 0.18), so no sound stops dead, and more on rare, large
  ones. Leave beds and loops dry enough to loop.
- **Drive before you filter** (`drive()` at 1.5 to 3) to thicken a body;
  it is what `sin()` alone lacks.
- **Mind the length.** A shot is under 120 ms, a small break under 250, a
  large one under 600, a stinger under 1.5 s. The build fades the last
  12 ms, so let a tail die by itself first.
- **Read the report.** No warnings; a peak under -1 dB; a crest of 8 to
  16 dB for a hit (lower is mushy, higher is a click with no body); a
  centroid where the thing should sit.

### The levels

| Level    | Loudest 50 ms | For                                                  |
| -------- | ------------- | ---------------------------------------------------- |
| `tick`   | -27 dB        | Heard many times a second: a shot, a mote, a UI tick |
| `small`  | -21 dB        | Small and frequent: a small rock, a ping, a blip     |
| `medium` | -17 dB        | The body of play: a medium rock, a pickup, a voice   |
| `large`  | -14 dB        | An event: a large rock, a zap, a stinger             |
| `huge`   | -11 dB        | Rare, to be felt: a blast, a boulder, a ship lost    |
| `bed`    | -27 dB        | Under everything, always                             |

## The sounds the game needs

Each family is a file in `recipes/`. A name with a number in brackets has
that many takes. The plan says which event plays each.

- **`chain`:** `chain-ping`, `chain-x2`, `chain-x3`, `chain-x4`.
- **`rocks`:** `break-stone-small`, `-medium`, `-large` (3 each);
  `break-ice-small`, `-medium`, `-large` (3 each); `break-crystal-medium`,
  `-large` (2 each); `break-iron-small`, `-medium`, `-large` (2 each);
  `break-lodestone-small`, `-medium`, `-large` (2 each); `hit-stone` (3),
  `hit-iron` (4), `hit-boulder` (3); `break-boulder`; `fuse-volatile`,
  `blast-volatile` (3), `blast-volatile-small` (2); `break-cluster` (3),
  many small rocks broken in one frame.
- **`hazards`:** `comet-warning`, `comet-pass` (2), `comet-smash` (2);
  `burr-cling` (3), `burr-shed` (2), `burr-pop` (3); `lodestone-hum`
  (a loop); `near-miss` (3).
- **`ship`:** `shot-gun` (5), `shot-spread` (4), `shot-rapid` (5),
  `shot-lance` (3), `shot-tail` (3); `thrust` (a loop), `thrust-start`, `thrust-stop`;
  `dash` (2), `dash-ready`; `static-full`, `static-down`, `zap-dash`,
  `zap-arc` (4); `shield-up`, `shield-break`; `pod-hit` (2), `pod-lost`,
  `guard-end`.
- **`pickups`:** `pickup-drop` (2), `pickup-fade`; `pickup-spread`,
  `pickup-rapid`, `pickup-lance`, `pickup-shield`, `pickup-magnet`,
  `pickup-slow` (each its own short signature); `effect-end`; `slow-on`,
  `slow-off`; `spark` (3, which the game raises up the ladder).
- **`stingers`:** `run-start`, `wave-start`, `wave-clear`,
  `sector-clear`, `run-end`, `new-best`, `level-up` (held back for a
  progression system); `tally-tick`, `ui-move`, `ui-select`, `ui-back`,
  `pause`, `resume`.
- **`voice`:** `voice-whee` (3), `voice-eep` (3), `voice-ouch` (2),
  `voice-yay` (3), `voice-ooh` (2), `voice-aww` (2), `voice-cheer` (2),
  `voice-hum` (2).
- **`rescue`:** `stray-appear`, `stray-catch` (2), `crew-loose` (2),
  `crew-caught` (2), `crew-home`, `tow-twang` (3).
- **`beds`:** `bed-inner-belt`, `bed-iron-reach`, `bed-storm`,
  `bed-endless` (loops in stereo), and two loops laid over them,
  `bed-pulse` and `bed-shimmer`.
