# Sound: how arcade space shooters sound, and how to build, mix and ship it

Read 2026-11-14 from wikis, interviews, postmortems, talk write-ups,
sound-design articles, research summaries and browser documentation, through a
fetch tool that summarises, so wording is paraphrased. No source code was read
and no asset was copied; documentation was read for its prose only. "(inferred)"
marks my own reading, "(listing)" marks a fact taken only from a search result
summary of a page I could not open, and "(weak)" marks a page that read as
machine-written or held a plain error. No talk or video was watched, and none
had a transcript I could read.

## 1. How notable arcade and space shooters sound

- **Asteroids (1979), a circuit per sound.** No sound chip: Wendi Allen (then
  Howard Delman) hand-built a circuit for each effect, 13 by one count and
  eleven by another. [Wikipedia Asteroids] [TechnologyUK] [Stacks Reader]
- **Asteroids, two notes that quicken.** The only "music" is a two-note pulse
  that quickens with play; its designer is quoted as meaning a heartbeat the
  player's own would follow (listing). Shots are high, explosions low and a
  siren announces a saucer: a register per kind of event (inferred). No pitches
  or tempo range were found. [360info] [Stacks Reader] [Asteroids listings]
- **Space Invaders, the speed-up was an accident.** Fewer invaders moved faster
  and a tone was tied to each step, so the march quickened as the field emptied;
  a fan recalls his heart beating in time. [IEEE Spectrum]
- **Defender, sounds as small programs.** Eugene Jarvis made Williams' sounds on
  a software synthesizer and credits the era's hits to "interactive sound-track
  tension building". A critic of the day liked Defender's sound and still found
  its explosions "too much". [Halcyon Days] [Wikipedia Defender]
- **Geometry Wars, a spawn sound per enemy.** Each enemy type announced itself
  with its own sound, and skilled players used those as cues. [GD GeoWars]
- **Rez, every effect on the beat and in key.** Shots and explosions are
  quantised, so loose timing still sounds right. Small sounds snap to sixteenth
  notes; the crash plays only after eight shots in a row. A later prototype kept
  the picture instant and delayed only the sound to the next beat.
  [Rez histories] [GD Planck]
- **Tetris Effect, effects written with the music.** Effects blend into each
  stage's track; tempo shifts as lines clear. [Splice Hydelic]
- **Peggle 2, the hits are the melody.** Peg hits climb a diatonic scale that
  fits the phrase of music under them, even mid-shot. Music goes ambient when
  the player idles; sub-bass is kept for big moments. The composer's rule: a few
  well-joined adaptive features seem richer than they are. [GANG Peggle 2]
- **Peggle Blast, all audio under 5 MB.** Against 783 MB in Peggle 2, by
  synthesizing at run time: a score cue was a square wave rising for half a
  second plus a noise "sparkle", and raising the pitch each time a sound repeats
  gave variety with no new asset. [GANG Peggle Blast]
- **Everyday Shooter and Luftrausers, music made by play.** Every effect in the
  first is a guitar note over a guitar track; synthesized effects would not sit
  with it (listing). Each of the second's 125 planes has its own mix of layers.
  [Wikipedia Everyday Shooter] [Shooter listings] [GD Luftrausers]
- **Resogun, a flat voice that reports.** A robot announcer calls "Shields
  Lost", "Keepers detected" and "Human Lost" through the controller's speaker,
  and a fanfare marks all humans saved. One critic found the speaker startling,
  another the cues easy to miss (listing). [ANN Resogun] [Resogun listings]
- **Vlambeer's sound designer, voice and ducking.** Joonas Turner made most of
  Nuclear Throne's sounds with his voice. In Bleed 2, loops change pitch with
  speed, sounds follow their place on screen, and a strong action ducks the rest
  for a split second. [Turner]
- **Not found.** No designer's account of Nova Drift, Downwell, Galaga or Super
  Stardust HD; reviews call Vampire Survivors' gem pickup satisfying but none
  describes a pitch run (listing). [Shooter listings]

## 2. Anatomy of the key sounds

- **A laser is a fast falling pitch.** One saw or square oscillator dropping
  exponentially, layered like a kick drum: low, middle and a click (listing).
  Burtt's blaster, a hammer on a tower's guy-wire, chirps downward the same way
  (inferred). Sound editors asked for a laser said a short power-up before the
  blast makes it big. [Laser listings] [Wikipedia Burtt] [Boom Box Post]
- **A weapon is parts with takes.** One tutorial splits it into charge, shot and
  beam, plays several takes of each "random, no repeat" with random pitch and a
  small random pre-delay, and keeps the source dry: compression, a short echo
  and a phaser sit on the bus. [CRI weapons]
- **Rapid fire plays one tail.** Engines start a firing loop at a random shot,
  shape the first shot to stand out, and play the tail once, when firing stops
  (listing). [Auto fire listings]
- **An impact is click, body, sub and tail.** A click above 1 kHz, a mid body, a
  sine at 30-60 Hz whose pitch drops over 200-400 ms, a tail on the body only; a
  few hundred ms in a game (weak). A bass drum is the same: a falling pitch, a
  short contour, a click from an instant attack. [Violet] [SOS percussion]
- **An explosion in five layers.** Transient at 2-5 kHz, body, sub at 40-120 Hz,
  debris, tail; small ones last under a second; the sub ducks under the
  transient, and layers need aligned starts or they cancel (weak). [Pixflow]
- **Breaking glass in four layers.** The Last of Us Part II used Impact, Thump,
  Pane (scaled by size) and Debris, whose long tail its designer called the most
  important. For ice, vendors describe one dry crack, then a bright scatter of
  fragments (both listing). [GameSpot glass] [Vendor listings]
- **A metal clank is two tones that disagree.** The TR-808 cowbell: triangle
  waves near 587 and 845 Hz (1:1.44), a gentle band-pass at 2.64 kHz, an
  envelope in two stages (a very short loud hit, then a tail) and a halo of pink
  noise. Small tuning errors spoil it. [SOS cowbell]
- **A bell has three phases.** A noisy strike that dies at once; a strike note
  with strong partials near 2:3:4, so the ear supplies a fundamental that is
  absent; a hum an octave lower that outlasts both. Pairs of close partials
  beat: the warble. [SOS bells]
- **Struck things are inharmonic and change as they ring.** A cymbal's energy
  starts at a few hundred Hz, climbs to a few kHz within a few hundred ms, then
  the highs die first. A drum skin's modes sit at 1, 1.59, 2.14, 2.30 and 2.65
  times the lowest. Such tone comes from unrelated frequencies, ring modulation
  or FM at a non-integer ratio. [SOS percussion] [Nord book]
- **A whoosh is noise that moves.** Pink noise through a filter whose cutoff
  rises and falls over about a second, pitched up on approach and down after,
  panned across (listing). [Vendor listings]
- **An engine is steady loops cross-faded by speed.** One tutorial renders 10 s
  loops at steady speeds (steadiness makes the seam easy), fades between them,
  lets pitch follow speed within 500 cents either way, and adds phaser and
  distortion with speed. [CRI engines]
- **A hum is two dull sources.** The lightsaber is an idling projector and a
  broken TV's feedback. Vendors give a shield four moments: snap, hum, ripple
  when struck, crackle on failing (listing). [Wikipedia Burtt] [Vendor listings]
- **A pickup is short, bright and rising.** A coin is about 0.3 s with one step
  up in pitch; a level-up is longer and grander (listing). [Vendor listings]
- **Urgency is rate, then pitch, then roughness.** Warnings are pulses of
  100-300 ms; faster repetition, higher pitch and irregular harmonics each add
  urgency, rate most cheaply (listing). Loudness mostly annoys; rhythm, pitch
  and a sharp onset win attention without it. [Warning listings] [GIST earcons]
- **Interface sounds: short, mid-high, one family.** Taps 30-150 ms, most cues
  under 300 ms; a rising third or fifth reads as success, a soft fall as failure
  (weak). Research adds timbres with several harmonics, pitches from 125 Hz to
  5 kHz and at most six notes a second. [Violet] [GIST earcons]
- **Common mistakes.** Silence before the transient, which makes input feel
  late; long reverb on a sound that repeats; two layers fighting near 200 Hz;
  size that only a subwoofer conveys (weak). [Violet] [Pixflow]

## 3. Procedural and synthesized game audio

- **Farnell: sound as process, not data.** Study what the object does, model
  that, and expose a few controls. The deepest models are too slow for real
  time, so he suggests rendering them ahead, as with thunder built from a
  million small waves; that is the team's plan (inferred). [DS Farnell]
- **Farnell's models, as others describe them.** Fire is filtered noise plus
  distortion; an explosion has parts named rumble, hiss and dust, with distance
  and intensity as controls (listing). [Synthesis listings]
- **A blast is a system of parts.** Hold a few takes of each part and join them
  in play with random delays, pitch and level: four parts of three takes give 81
  results; 30-40 whole versions would be too much work. [ASE procedural]
- **sfxr, a placeholder by design.** Made in 2007 for a 48-hour jam; its author
  offers it where quality is not the aim, and users call its sounds a cliché
  (listing). [DrPetter] [Synthesis listings]
- **Material is heard mostly in the decay.** With synthesized struck bars, how
  fast a sound died moved listeners' judgment of material far more than pitch,
  and tracked physical damping. With many impacts (a shatter) the long-term
  spectrum tells more (listing). [Material listings]
- **Karplus-Strong, a pluck from a noise burst.** Noise circulates in a short
  delay with a filter in the loop; the delay sets pitch, the filter brightness
  and decay. It suits plucks, bells and drums. [Wikipedia Karplus-Strong]
- **Rich against cheap (inferred from the above).** A click at the start; an
  inharmonic body; partials dying at different rates; a noise halo; a beating
  pair; a two-stage envelope; movement; saturation; a room. Burtt replayed clean
  tones in real rooms to lose the studio. [SOS cowbell] [SOS bells] [Tufts R2]

## 4. Variation and repetition

- **Three to five takes, never one twice running.** For sounds that repeat
  (weak); middleware offers "random, no repeat". [sfxengine] [CRI random]
- **Small random pitch, smaller random level.** About 2 semitones and 1.5 dB
  either way (weak); another note says within 10 percent, about 1.7 semitones
  (listing). [sfxengine] [Variation listings]
- **Vary more than pitch, and let play choose.** Filter, pan and a short
  pre-delay; a harder hit plays higher, a chain steps up, a loop's pitch follows
  speed. [CRI random] [GD pitch] [Turner]
- **More takes, more outliers.** One team found each added take made an odd one
  stand out more (listing). No source gave start offsets or cooldowns in
  numbers. [Variation listings]

## 5. Mixing a busy arcade game

- **Cap copies of one sound.** Slime Rancher's lead: limit how many copies of an
  effect play at once, leave air in each file, and expect the right number to be
  "always fewer than you think". Engines drop the oldest, quietest or farthest
  voice (listing). [GD Slime Rancher] [Mixing listings]
- **HDR, or importance.** A sliding window follows the loudest sound and lowers
  the rest: "every sound is important, but not at the same time"; badly timed,
  it pumps. Overwatch instead scores each sound by threat and plays up the top
  few (listing). [DS HDR] [Mixing listings]
- **Duck briefly; save the lows.** A strong hit ducks the rest for an instant;
  Peggle 2 holds sub-bass back. [Turner] [GANG Peggle 2]
- **Loudness targets.** Sony: -23 LUFS, give or take 2, at home (later -24, true
  peaks under -1 dB: listing) and -18 on handhelds. Rob Bridgett: about -16 for
  a phone's speaker, -24 on headphones in quiet. No source gave a target for web
  games. [DS loudness] [Loudness listings] [AMI Bridgett]
- **A narrow range for phones.** A loudness range of 5-10 LU is low, 15-20 high;
  mobile wants low, and phone speakers distort. [DS loudness]
- **Leave headroom, then catch peaks.** Mix peaks at -6 to -3 dB (weak); the
  browser's compressor node is there to stop clipping when sounds add up.
  [sfxengine] [MDN nodes]
- **Pan less than fully, and check mono.** Ori's team found hard left and right
  too extreme on plain headphones; an engine example stops near 0.8 of full
  (listing). A phone held upright is nearly mono. No numbers were found for
  distance falloff in 2D. [Dolby Ori] [Mixing listings] [LANDR]

## 6. Musical sound effects and adaptive audio

- **Climb a scale, in the music's key.** Peggle's hits climb a scale that fits
  the music; one article calls semitone steps natural for a chain; middleware
  can tag music with its key and draw effect notes from it. [GANG Peggle 2]
  [GD pitch] [CRI key]
- **Layers, segments, or two mixes.** Vertical layering fades synced parts in
  and out by intensity (LittleBigPlanet used six), and every part must fit every
  other. Resequencing loops and branches short segments; FTL just fades between
  a calm and a battle mix (both listing). [GD Phillips] [Music listings]
- **Tempo as danger.** Asteroids and Space Invaders speed a pulse as the field
  empties; Tetris Effect shifts tempo with progress. [360info] [IEEE Spectrum]
- **Stems on one clock.** In a browser, loops decoded to buffers can start
  against the audio clock, stay in step, and enter on a bar. [MDN games]
- **Quiet is part of it.** Peggle 2's music thins when the player stops. Nothing
  was found on generative ambience for a small team. [GANG Peggle 2]

## 7. Mascot and creature voices without words

- **R2-D2, half machine and half person.** The synthesizer alone was too cold,
  so Burtt performed through an ARP 2600's resonating filter with a microphone:
  "50% machine and 50% organic". He reduced each line to one emotion, voiced as
  whistles, coos and sighs. [Tufts R2] [Attack]
- **WALL-E and EVE, two materials.** WALL-E is motors plus a processed voice
  with a singing tone; EVE is synth tones, angry or tender by turns. [DS Burtt]
- **Springbound, a hum made to talk.** Animal Crossing strings recorded letter
  sounds; this developer wanted something more animal, and found one-shot calls
  random. What worked: a hum cut to one cycle and looped, 7 semitones of range
  each, a new pitch at each word reached by a 0.1 s slide, two vowels from
  formant filters, a low-pass closing between words, vibrato. [Springbound]
- **What reads as cute.** In a rating study, names with high-frequency
  consonants, lip sounds (p, m) and flowing sounds (r, n) scored cuter, which
  the author ties to smallness and babies. Higher pitch and a higher first
  formant are rated cuter and younger (listing). [Kumagai] [Cute listings]
- **Contours carry intent.** In speech to infants a rise asks for attention and
  a low fall soothes; such speech is higher, wider, shorter and more repetitive
  than adult speech (listing). [Cute listings]
- **Kirby and Yoshi: few sounds, kept for decades.** Kirby is its actor's
  highest role; Yoshi's cries from Yoshi's Story are still the voice (listing).
  Pikmin's voices are clear only with the camera low. [Mascot listings]
  [Nintendo Pikmin]
- **A syllable per action.** Bleed 2 gives jump, swing and hit one short vocal
  each ("HU", "YAH", "NAH"), so a combo speaks a phrase. LocoRoco sings in an
  invented language, so no listener is shut out. [Turner] [GD LocoRoco]
- **When a voice annoys.** Navi: the same line, unprompted, every few minutes
  (listing). Slime Rancher had to cap its chorus of cheers. No source gave a
  rate for how often a mascot should speak. [Mascot listings] [GD Slime Rancher]

## 8. Phones and browsers

- **Sound waits for a gesture.** An audio context made before a tap starts
  suspended and must be resumed inside one (Chrome since 71, Firefox too). MDN
  asks for visible mute and volume controls. [MDN autoplay] [Chrome autoplay]
- **The iPhone's silent switch mutes Web Audio.** Safari's default session is
  "ambient", which the switch silences; setting the type to "playback" changes
  that, in Safari only (listing). [Browser listings] [MDN session]
- **Decoding resamples and fills memory.** A buffer needs the whole file, takes
  the context's rate, and holds 32-bit samples in any codec: about 11.5 MB a
  minute a channel at 48 kHz (inferred). On iOS the rate has flipped between
  44.1 and 48 kHz and distorted (listing). [MDN nodes] [Browser listings]
- **Sprites.** One file is one request and one thing to unlock. MDN's 500 ms
  between sprites comes from the audio element's coarse timer, which a buffer
  does not have (inferred). [MDN games]
- **Formats.** Safari reads Ogg with Opus or Vorbis only from 18.4; its WebM
  Opus support before was patchy (listing). [WebKit 18.4] [Format listings]
- **MP3 loops badly.** Transform codecs pad both ends with silence, and MP3 has
  no standard field for how much: commonly 576 or 1,105 samples at the start and
  filler to a 1,152-sample frame at the end (listing). Ogg defines its ends
  exactly; lossless adds nothing. [Wikipedia gapless] [Format listings]
- **Latency.** Browsers report an estimate of output delay; Bluetooth can add
  some 300 ms (listing). [web.dev latency] [Browser listings]
- **Small speakers.** Most phones give little under 200 Hz and nothing by 100,
  sag below 500 Hz and lift 3-9 kHz. The cure: content at 250-700 Hz made by
  distortion (an equaliser only raises what exists) and a sharp attack. [LANDR]
- **The missing fundamental.** Given 200, 300, 400 and 500 Hz the ear hears
  100 Hz; a 150 Hz voice keeps its pitch on a telephone that passes little under
  300 Hz. [Wikipedia fundamental]

## 9. Audio and accessibility

- **Nothing essential by sound alone.** A basic guideline, tested by a first
  play with sound off; it covers muted phones as well as deaf players. [GAG]
- **Separate volumes, and a mono switch.** Effects, speech and music at least;
  mono serves players who hear on one side. [GAG] [XAG 105]
- **Distinct, consistent cues help low vision.** Games whose key sounds differ
  clearly have been played without sight. [GAG]
- **Attention without loudness.** Keep cues in a narrow loudness band and mark
  importance with rhythm and pitch. [GIST earcons]
- **Tinnitus.** Two big shooters let players filter ringing sounds (listing);
  guidelines are silent on sudden loudness. [Access listings]

## What this means for Asteroid Breaker

The numbers below are starting points I drew from the findings (inferred) unless
a tag follows. Tune them by ear, on a phone first.

### (a) Sound families and recipes

| Sound                | Recipe: layers, regions, envelope, pitch                                                                                                                                                                              | Length                                          | Takes                                       | Place in the mix                                    |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------- | --------------------------------------------------- |
| Ship: shot           | Click of high-passed noise, 3-5 ms. Body: triangle or soft saw falling exponentially from about 2 kHz to 600 Hz in 70 ms, slight FM grit, light saturation. Puff of band-passed noise near 1.5 kHz. No sub, no reverb | 90-120 ms, inside the 143 ms gap                | 8                                           | Quietest family; cap 3; ducks nothing               |
| Ship: gun tail       | One short echo and room, played once when firing stops                                                                                                                                                                | 250 ms                                          | 3                                           | Low                                                 |
| Ship: thrust         | Loops of brown noise under a low-pass wandering 400-900 Hz, a saturated band at 250-500 Hz for phones, faint hiss near 4 kHz; filter and pitch follow speed; a start puff and a stop fall as one-shots                | Loops of 4, 5 and 7 s; start 80 ms; stop 200 ms | 3 loops                                     | Low; ducked by big events                           |
| Ship: dash           | Band-passed pink noise swept 400 Hz to 3 kHz and back to 800 Hz under a swell and fade, pitch falling at the end                                                                                                      | 300 ms                                          | 4                                           | Middle                                              |
| Rock: hit, no break  | A tick in the material's own timbre                                                                                                                                                                                   | 30-60 ms                                        | 4 per material                              | Lowest; first to be dropped                         |
| Rock: stone          | Crack of noise at 2-5 kHz, 8 ms. Three to five damped modes at 180-900 Hz in drum-skin ratios, dying in 60-150 ms. Ten to twenty gravel grains of band-passed noise, thinning out                                     | Small 150, medium 250, large 400 ms             | 5 per size                                  | Middle; cap 3                                       |
| Rock: ice            | Dry click with 4-8 kHz. Then 15-30 tiny pings at 3-9 kHz, 20-60 ms each, scattered and thinning. One glassy mode near 2 kHz                                                                                           | 250-400 ms                                      | 5 per size                                  | Middle; watch 3-9 kHz on phones                     |
| Rock: crystal        | Soft tick. Chime of four to six partials near 2:3:4 over a note of the scale, upper ones dying first, one detuned pair beating at about 4 Hz. Sparkle on top                                                          | 400-700 ms                                      | 4 per note                                  | Middle; carries the chain's pitch                   |
| Rock: iron, bounce   | Two triangle tones at 1:1.44 plus FM partials, band-pass near 2.6 kHz, a very short hit then a ring, pink-noise halo                                                                                                  | 300-500 ms                                      | 5                                           | Middle; cap 2                                       |
| Rock: iron, break    | Lower clank cluster, a grind of noise, a thud at 150 Hz with harmonics, the longest ring                                                                                                                              | 700-900 ms                                      | 4                                           | High                                                |
| Rock: volatile       | Fizz rising for 100 ms when armed. Click at 2-5 kHz. Noise body whose low-pass falls from 2 kHz to 200 Hz. Sine dropping 120 to 50 Hz in 250 ms, saturated so 200-500 Hz carries it. Crackle. Small room              | 0.8-1.2 s                                       | 5; later links of a chain shorter and drier | High; ducks bed and thrust 4-6 dB for 300 ms; cap 3 |
| Rock: lodestone      | Hum: a rich tone at 110 Hz moved through 250-900 Hz by a slow phaser, with a tremolo of 6-9 Hz that quickens as the ship nears. Break: the hum falls in pitch over 300 ms onto a clank                                | Loop 6 s; break 500 ms                          | 2 loops, 4 breaks                           | Low, by distance                                    |
| Rock: boulder        | Creak of 60 ms. Crack. Modes at 90-400 Hz dying in 400 ms. Sine 90 to 40 Hz, saturated. Rubble for 800 ms                                                                                                             | 1.2-1.5 s                                       | 3                                           | Highest effect; ducks all else 6 dB; owns the lows  |
| Pickup               | Two notes of the scale rising a third or fifth, bright FM bell, sparkle at 3-6 kHz                                                                                                                                    | 200-300 ms                                      | 3 per kind                                  | High; cap 2                                         |
| Comet: warning       | Pulses of 150 ms: a tone at 500-800 Hz with several slightly irregular harmonics and a sharp onset. The gap shortens as the comet nears; panned to its side                                                           | 3 pulses, repeating                             | 1                                           | Top; faster, never louder                           |
| Comet: pass          | Long whoosh with falling pitch over a rumble with harmonics                                                                                                                                                           | 1.2 s                                           | 2                                           | High                                                |
| Rescue               | Three notes rising to the key note, soft pad tail, with the voice's trill                                                                                                                                             | 600 ms                                          | 3                                           | High; ducks shots 3 dB                              |
| Ship lost            | Glide falling for 700 ms, a thud, then a second of near silence, with the voice's sigh                                                                                                                                | 1.5 s                                           | 2                                           | Top; the bed drops out                              |
| Ship gained          | Rising four-note figure                                                                                                                                                                                               | 500 ms                                          | 1                                           | High                                                |
| Chain and multiplier | Step: the break's tonal layer moves up the scale. Tier (x2, x3, x4): a chord stab that adds one note each time                                                                                                        | 150-300 ms                                      | 1 per note                                  | Middle                                              |
| Wave clear, level-up | Stinger in key ending on the home chord, low end allowed                                                                                                                                                              | 1-1.5 s                                         | 2                                           | Top                                                 |
| Interface            | One soft patch: tap, confirm (a rise), back (a fall)                                                                                                                                                                  | 40-150 ms                                       | 2                                           | Quiet                                               |

- **Where the recipes come from.** Shot: a falling sweep, a dry source, one tail
  [Laser listings] [CRI weapons] [Auto fire listings]. Materials differ first by
  decay, short for stone and long for iron [Material listings]: stone takes
  drum-skin ratios [SOS percussion], iron the cowbell's pair [SOS cowbell],
  crystal the bell's phases [SOS bells], ice a crack and scatter
  [GameSpot glass]. Blasts are the five layers [Pixflow]; the warning's rate
  carries urgency [Warning listings]. Render each as parts joined at bake time:
  three takes of four parts give 81 results [ASE procedural].

### (b) Rules of play-back

- **Variation.** No take twice running. Shots: 50 cents and 1 dB either way;
  noisy sounds 100-200 cents and 1.5 dB; tuned sounds (crystal, pickups,
  stingers) takes only, so they stay in key. [sfxengine] [CRI random]
- **Voice limits.** Caps as in the table and about 24 voices in all, oldest or
  quietest dropped first. Thirty breaks in one frame play as the two or three
  largest plus one "cluster" debris take. [GD Slime Rancher] [Mixing listings]
- **Priority and ducking.** Warning, ship lost, voice; then boulder, blasts,
  pickups, rescue; breaks; shots; ticks, thrust, hum; bed. Only boulder, blast,
  ship lost and wave clear duck others: 4-6 dB for 200-400 ms, a plain gain move
  so nothing pumps. [Turner] [DS HDR]
- **Who owns what.** Under 200 Hz: boulder, blast and ship lost, each also
  speaking at 250-700 Hz. 200-800 Hz: thrust, hum, stone. 600 Hz-2 kHz: shots.
  1-4 kHz: voice and warning. 3-9 kHz: ice, crystal, pickups, kept modest
  because phones lift that band. [LANDR] [360info]
- **Panning and master.** Pan by screen position to 0.7 of full, lows centred,
  with a mono switch. Sources peak at -6 to -3 dB, a limiter holds true peaks
  under -1 dB, and busy play should measure about -16 to -18 LUFS with a narrow
  range. [Dolby Ori] [XAG 105] [sfxengine] [AMI Bridgett] [DS loudness]

### (c) Musical tuning, and a bed

- **One key, five notes.** Every tuned sound in one major pentatonic scale, say
  D E F# A B: none of its notes clash, whatever lands together (inferred).
  Peggle Blast sat in D and A major. [GANG Peggle Blast]
- **The chain climbs the scale and stops.** Steps of the scale replace today's
  semitones, six breaks to the octave; then hold the top note and add sparkle,
  not height. A chord stab marks x2, x3 and x4; a lapsed chain ends in silence;
  the warning stays out of key. [GANG Peggle 2] [GD pitch] [Warning listings]
- **A bed in four stems.** A quiet drone always; a two-note pulse while rocks
  remain, its gap shrinking as the wave thins (Asteroids' heartbeat); a shimmer
  from x2; a tick at x4. Same length and key, started on the audio clock; the
  drone alone when idle, silence after a lost ship. [360info] [GD Phillips]
  [MDN games] [GANG Peggle 2]
- **Do not quantise play.** Shots and breaks sound at once; at most a stinger
  waits for the next pulse while the picture stays instant. [GD Planck]

### (d) The fuzzball's voice

- **Material.** A looped single-cycle hum through two moving formant filters,
  with vibrato, pitch jitter and breath noise: half machine, half creature.
  [Springbound] [Tufts R2]
- **Cute by pitch and shape.** High pitch and raised formants, onsets like m, p
  and w, one 7-semitone home. A rise asks ("eep?"), a rise and fall delights
  ("whee"), a low fall mourns. [Kumagai] [Cute listings]
- **Few words, one emotion each.** Chirp, whee (dash), eep (near miss), ooh
  (pickup), trill (rescue: 4-6 notes of 60 ms), uh-oh (comet), ow, sigh (ship
  lost), cheer (wave clear); 80-350 ms, 3-5 takes each. [Tufts R2] [Turner]
- **Rarely.** Never on shots or common breaks; one utterance per 4-6 s at most;
  "whee" on one dash in three or four. Its own slider and an off switch.
  [Mascot listings] [GD Slime Rancher] [Resogun listings]

### (e) What a phone and a browser ask

- **Unlock and show.** Resume the context in the first tap, show a sound switch
  and three sliders (effects, music, voice), and assume many players stay muted:
  every cue also has a picture. [MDN autoplay] [GAG]
- **Decide on the silent switch.** Left alone, an iPhone on silent plays
  nothing, which suits a casual game (inferred); "playback" is the way out.
  [Browser listings] [MDN session]
- **Render at 48 kHz, mono.** Never force the context's rate. Effects in mono,
  panned at run time: a minute of takes is 11.5 MB (inferred). [MDN nodes]
- **One sprite, lossy with a fallback.** Opus where it decodes, AAC or MP3
  elsewhere, 30-50 ms of silence between takes (inferred). Loop from points
  inside a buffer, never an MP3's edges, with two or three unequal loops so no
  seam repeats. [WebKit 18.4] [Wikipedia gapless] [CRI engines]
- **Small speakers.** Nothing essential under 300 Hz; saturate every low sound
  so it speaks at 250-700 Hz; check in mono, on a real phone. [LANDR]
  [Wikipedia fundamental]

## What was skipped to keep the rule

- **Code, not opened.** Fan remakes of Asteroids and a coin-pitch snippet that
  searches surfaced; the patch pages of Farnell's book; a repository indexing
  Synth Secrets; audio-unlock packages; an engine's panning example and a
  footsteps set-up note (cited only from search summaries, as listings).
- **Held code, prose only used.** A middleware post on keeping effects in key
  carried one script; MDN and Chrome pages carry samples.
- **Would not open (403, 404, timeout, blank or cut off).** Medium,
  Audiokinetic's blog, GameSpot, Prima Games, Sound & Vision, PC Gamer, Tom's
  Guide, The Escapist, MusicRadar, NPR, Arcade History, Exotica, WiKirby;
  Material's, FMOD's and CryEngine's manuals; one research PDF (binary).
- **Not watched.** The Overwatch and Frostbite talks, a video on Animalese, a
  video and a podcast with Nova Drift's developer.
- **Thin by nature.** Arcade-era designers left little on sound, and recipes
  with numbers come from synth magazines and vendors' blogs more than from game
  designers. Nothing was found on web loudness targets, 2D distance falloff,
  start offsets, cooldowns, how often a mascot should speak, granular synthesis
  or generative ambience.

## Sources

- Wikipedia Asteroids: <https://en.wikipedia.org/wiki/Asteroids_(video_game)>
- TechnologyUK: <https://www.technologyuk.net/computing/computer-gaming/gaming-landmarks-1960-1985/asteroids.shtml>
- 360info: <https://360info.org/as-arcade-games-died-out-asteroids-lived-on/>
- Stacks Reader (a reprinted magazine feature of about 1981; the year is my recollection, not the page's): <https://thestacksreader.com/invasion-of-the-asteroids/>
- Asteroids listings (search summaries that did not name the page quoted; this one was among the results, not opened): <https://www.giantbomb.com/games/3030-1034/>
- IEEE Spectrum: <https://spectrum.ieee.org/space-invaders/particle-1>
- Halcyon Days: <https://dadgum.com/halcyon/BOOK/JARVIS.HTM>
- Wikipedia Defender: <https://en.wikipedia.org/wiki/Defender_(1981_video_game)>
- GD GeoWars: <https://www.gamedeveloper.com/game-platforms/the-color-and-the-shape-bizarre-creations-on-i-geowars-i-sensible-aesthetic>
- Rez histories: <https://gamedeveloper.com/audio/oral-history-of-i-rez-i-recounts-a-marriage-of-game-and-music>, <https://blog.playstation.com/archive/2017/10/20/classic-levels-deconstructed-tetsuya-mizuguchi-musician-adam-freeland-dissect-rez-infinites-area-5>
- GD Planck: <https://gamedeveloper.com/design/planckogenesis-part-i-quantizing-events>
- Splice Hydelic: <https://splice.com/blog/?p=5870>
- GANG Peggle 2: <https://www.audiogang.org/peggle2-sonic-joy/>
- GANG Peggle Blast: <https://www.audiogang.org/scoring-peggle-blast-new-dog-old-tricks/>, <https://www.audiogang.org/realtime-synthesis-for-sound-creation-in-peggle-blast/>
- Wikipedia Everyday Shooter: <https://en.wikipedia.org/wiki/Everyday_Shooter>
- GD Luftrausers: <https://gamedeveloper.com/audio/q-a-why-vlambeer-returned-to-its-roots-with-i-luftrausers-i->
- ANN Resogun: <https://www.animenewsnetwork.com/review/game/ps4/resogun>
- Resogun listings: <https://t3.com/reviews/resogun-review>, <https://gamesbeat.com/resogun-review/>
- Turner: <https://gamedeveloper.com/business/meet-joonas-turner-vlambeer-s-sound-guy>, <https://bootdiskrevolution.com/NEW_BLOG/?p=1353>, <https://bootdiskrevolution.com/NEW_BLOG/?p=1363>
- Shooter listings (Everyday Shooter, Vampire Survivors): <https://gamedeveloper.com/game-platforms/road-to-the-igf-queasy-games-i-everyday-shooter-i->, <https://www.thevibes.com/index.php/articles/lifestyles/53373/vampire-survivors-an-escalating-dopamine-rush-disguised-as-a-retro-game>
- Laser listings (not opened): <https://medium.com/game-audio-design/gad-02-83f716ce0609>, <https://violetrecording.com/how-to-make-sci-fi-sounds/>
- Wikipedia Burtt: <https://en.wikipedia.org/wiki/Ben_Burtt>
- Boom Box Post: <https://boombox-post.squarespace.com/blog/2015/11/2/zap-a-laser-sound-design-challenge>
- CRI weapons: <https://blog.criware.com/index.php/2022/11/25/designing-sci-fi-weapons/>
- Auto fire listings (blank when opened): <https://game-audio.notion.site/Automatic-Weapons-in-Games-Audio-Systems-Design-2dfb117030d2802192a3c343fc995f2f>, <https://www.cryengine.com/docs/static/engines/cryengine-3/categories/1114113/pages/1048709>
- Violet (weak): <https://violetrecording.com/how-to-make-impact-sounds/>, <https://violetrecording.com/how-to-design-ui-sounds/>, <https://violetrecording.com/how-to-design-sound-effects-for-games/>
- SOS percussion: <https://www.soundonsound.com/techniques/practical-bass-drum-synthesis>, <https://www.soundonsound.com/techniques/analysing-metallic-percussion>, <https://www.soundonsound.com/techniques/synthesizing-percussion>
- Pixflow (weak; a vendor's blog): <https://pixflow.net/blog/explosion-sound-effects-a-complete-guide>
- GameSpot glass (listing): <https://www.gamespot.com/articles/the-last-of-us-part-2-sound-designer-explains-how-/1100-6479127/>
- SOS cowbell: <https://www.soundonsound.com/techniques/synthesizing-cowbells-claves>
- SOS bells: <https://www.soundonsound.com/techniques/synthesizing-bells>
- Nord book: <https://cim.mcgill.ca/~clark/nordmodularbook/nm_percussion.html>
- Vendor listings (not opened; ice, whoosh, shield, pickup): <https://morphic.com/id/resources/sounds/ice-sound-effects>, <https://violetrecording.com/how-to-make-whoosh-sounds/>, <https://morphic.com/resources/sounds/shield-sound-effects>, <https://www.summerengine.com/free-tools/sound-effect/recipes/coin-pickup>
- CRI engines: <https://blog.criware.com/index.php/2022/12/12/designing-spaceship-engines/>
- Warning listings (a report not opened; a page that showed its title only): <https://www.pdn.cam.ac.uk/system/files/documents/AuditoryWarningSystems_CAA82017.pdf>, <https://researchportal.plymouth.ac.uk/en/publications/designing-urgency-into-auditory-warnings-using-pitch-speed-and-lo/>
- GIST earcons: <https://www.dcs.gla.ac.uk/~stephen/earcon_guidelines.shtml>
- DS Farnell: <https://designingsound.org/2012/01/18/procedural-audio-interview-with-andy-farnell/>
- Synthesis listings (Farnell's models; a forum thread on sfxr, seen through a mirror): <https://mcvuk.com/development-news/procedural-audio-with-unity/>, <https://home5.southeastasia.cloudapp.azure.com/item?id=3347269>
- ASE procedural: <https://asoundeffect.com/procedural-game-sound-design>
- DrPetter: <https://drpetter.se/project_sfxr.html>
- Material listings: <https://www.cs.ubc.ca/labs/lci/papers/docs2000/pai-KlaPai00.pdf>, <https://mcgill.ca/mpcl/files/mpcl/hjortkjaer_2016_jasa.pdf>
- Wikipedia Karplus-Strong: <https://en.wikipedia.org/wiki/Karplus%E2%80%93Strong_string_synthesis>
- Tufts R2: <https://sites.tufts.edu/starwarssound/?p=11>
- sfxengine (weak; a vendor's blog): <https://sfxengine.com/blog/common-game-audio-mistakes>
- Variation listings: <https://uhiyama-lab.com/en/notes/ue/sound-cue-vs-sound-wave-best-practices/>, <https://www.asoundeffect.com/?p=123022>
- GD pitch: <https://gamedeveloper.com/audio/the-power-of-pitch-shifting>
- CRI random: <https://blog.criware.com/index.php/2017/01/16/atomcrafts-randomization-features/>
- GD Slime Rancher: <https://gamedeveloper.com/audio/using-sound-design-to-give-i-slime-rancher-i-charm-without-getting-too-gooey>
- Mixing listings (voice limits, Overwatch, panning): <https://www.audiokinetic.com/en/how-to-get-a-hold-on-your-voices-optimizing-for-cpu-part-1>, <https://www.audiokinetic.com/en/blog/overwatch-game-audio-using-wwise-1>, <https://www.pcgamer.com/how-overwatch-uses-sound-to-pinpoint-threats-you-cant-see>, <https://defold.com/examples/sound/panning>
- DS HDR: <https://designingsound.org/2013/06/21/finding-your-way-with-high-dynamic-range-audio-in-wwise/>
- DS loudness: <https://designingsound.org/2012/07/30/video-games-and-loudness-standards-interview-with-sonys-garry-taylor/>, <https://designingsound.org/2013/02/20/different-loudness-ranges-for-console-and-mobile-games>
- Loudness listings: <https://audiokinetic.com/en/mastering-a-game-with-wwise-part1>, <https://www.itu.int/dms_pub/itu-r/opb/rep/R-REP-BS.2434-2018-PDF-E.pdf>
- AMI Bridgett: <https://audiomediainternational.com/mobile-loudness-an-adaptive-approach/>
- MDN nodes: <https://developer.mozilla.org/en-US/docs/Web/API/DynamicsCompressorNode>, <https://developer.mozilla.org/en-US/docs/Web/API/StereoPannerNode>, <https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/decodeAudioData>
- Dolby Ori: <https://professional.dolby.com/ja/gaming/gaming-blog/a-2d-game-with-3d-sound-ori-and-the-will-of-wisps>
- LANDR: <https://blog.landr.com/make-bass-audible-phone-speakers>
- CRI key: <https://blog.criware.com/index.php/2020/05/20/keeping-sfx-in-key/>
- GD Phillips: <https://www.gamedeveloper.com/blogs/pure-vertical-layering-for-game-music-composers-from-spyder-to-sackboy-gdc-2021->
- Music listings (resequencing, FTL): <https://www.gamedeveloper.com/game-platforms/hybrid-horizontal-vertical-structure-for-game-music-composers-from-spyder-to-sackboy-gdc-2021->, <https://scoremusicworks.squarespace.com/journalism/2013/7/29/vgm8-ftl>
- MDN games: <https://developer.mozilla.org/en-US/docs/Games/Techniques/Audio_for_Web_Games>
- Attack: <https://www.attackmagazine.com/technique/hardware-focus/hardware-wars-the-gear-behind-the-sounds-of-star-wars/>
- DS Burtt: <https://designingsound.org/2009/09/15/ben-burtt-special-wall-e-the-definitive-interview/>
- Springbound: <https://brycetown.substack.com/p/springbound-devlog-4-making-critters-talk>
- Kumagai: <https://pmc.ncbi.nlm.nih.gov/articles/PMC9683379>
- Cute listings: <https://trainorlab.mcmaster.ca/publications/pdfs/Trainor_PsychSci2000.pdf>, <https://pmc.ncbi.nlm.nih.gov/articles/PMC5653764>, <https://chatpaper.com/paper/162647>
- Mascot listings (Kirby, Yoshi, Navi): <https://en.wikipedia.org/wiki/Makiko_Ohmoto>, <https://en.wikipedia.org/wiki/Yoshi%27s_Story>, <https://zeldauniverse.net/features/fair-treatment-of-the-fairy-the-fans-evaluate-navi/>
- Nintendo Pikmin: <https://www.nintendo.com/us/whatsnew/ask-the-developer-vol-10-pikmin-4-part-3/>
- GD LocoRoco: <https://gamedeveloper.com/design/the-thoughtful-design-of-locoroco-tsutomu-kouno-speaks>
- MDN autoplay: <https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay>, <https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices>
- Chrome autoplay: <https://developer.chrome.com/blog/autoplay>
- MDN session: <https://developer.mozilla.org/docs/Web/API/AudioSession/type>
- Browser listings (silent switch, sample rate, Bluetooth): <https://bugs.webkit.org/show_bug.cgi?id=237322>, <https://bugs.webkit.org/show_bug.cgi?id=154538>, <https://lists.w3.org/Archives/Public/public-audio-dev/2014May/0010.html>
- WebKit 18.4: <https://webkit.org/blog/16574/webkit-features-in-safari-18-4/>
- Format listings (Opus in Safari, codec padding): <https://bugs.webkit.org/show_bug.cgi?id=238546>, <https://medium.com/vimeo-engineering-blog/a-brief-history-of-gapless-audio-and-what-you-can-do-about-it-ea9e1c343215>
- Wikipedia gapless: <https://en.wikipedia.org/wiki/Gapless_playback>
- web.dev latency: <https://web.dev/articles/audio-output-latency?hl=en>
- Wikipedia fundamental: <https://en.wikipedia.org/wiki/Missing_fundamental>
- GAG: <https://gameaccessibilityguidelines.com/full-list/>, <https://gameaccessibilityguidelines.com/ensure-no-essential-information-is-conveyed-by-sounds-alone/>, <https://gameaccessibilityguidelines.com/ensure-sound-music-choices-for-each-key-objects-events-are-distinct-from-each-other/>
- XAG 105: <https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/105>
- Access listings (tinnitus options): <https://primagames.com/tips/how-does-the-tinnitus-setting-work-in-cod-modern-warfare-2-answered>, <https://www.ea.com/able/resources/battlefield-6>
