# Sound design for match-three and casual puzzle games

Notes for Fuzz Flux, gathered on 2026-11-25 from the web: posts and interviews
by game audio designers, reviews, wikis, platform documentation and academic
papers. No game source code was read and no audio or art was downloaded. Code
listings inside the Game Audio Network Guild, MDN and Chrome articles were
skipped, as was a fan clone's devlog; talks and videos were not watched. Web
searching was cut off partway by a session limit, so some "not found" items may
yield to more searching. "(listing)" marks a fact taken from a search listing
because the page would not open; "(inferred)" marks my own inference.

## 1. How known games score matches and cascades with pitch

- **Candy Crush Saga, one semitone per row.** When one move clears several rows,
  "each subsequent row has the same sound, but a semi-tone higher". The number
  of steps, what happens at the top and any tie to the music's key: not found.
  [Belcher 2013]
- **Bejeweled Blitz, pitch climbs on plain swaps.** "Even a series of ordinary
  3-swaps give you an increasingly juicier reward, with the climbing pitch of
  the sound effect". Scale and step count: not found. [Juul and Keldorff]
- **Peggle (2007), rising pitch and a placeholder that stayed.** PopCap's patent
  has each peg contact play a sound whose pitch rises as the ball hits more pegs
  (listing); the scale is not found. "Ode to Joy" was a placeholder that testers
  liked, so it stayed. [PopCap patent] [Wikipedia Peggle]
- **Peggle 2, a diatonic ladder that follows the harmony.** Peg hits form "an
  ascending diatonic scale which changes to match the harmony of the underlying
  'phrase' of music". Each of 7 phrases has its own scale of 26 notes, about
  three and a half octaves (G major, then A major, for example). The count
  restarts each turn "so that it always ascends". What happens past note 26: not
  found. [Whitmore 2014b]
- **Peggle Blast, the music tells the game its key.** Each music segment carries
  text cues naming its key, scale and note range; a shot starts on the cued note
  and each peg hit takes the next. Five pitch-shifted recordings cover every
  regular peg note; a harp plays each hit and a marimba joins on orange pegs.
  The score starts in D and moves up a fifth after each shot. [Mattingly 2015]
  [Whitmore 2015]
- **Puyo Puyo, a voice clip per chain step.** The voice table runs "Chain 1" to
  "Chain 4", then spells 1 to 5, so longer chains reach bigger shouts; Arle's
  spells are Fire, Ice Storm, Diacute, Brain Dumbed, Jugem and Bayoen. Whether
  the pop effect also rises in pitch: not found. [Puyo Nexus]
- **Lumines, effects written to fit the track.** Each skin sets "the music
  track, sound effects, and the speed of the time line"; the 16-column field
  equals two bars of 4/4. [Wikipedia Lumines]
- **Tetris Effect, music cut into actions.** Mizuguchi: "we wanted to create
  music just from the sound effects of the game itself"; "we cut the sound and
  then sync them to each action". Busy parts are 4/4 near 135 BPM, calm parts
  6/4 at 100 to 120 BPM. Whether effects are quantized or held to a key: not
  found. [Wccftech 2019] [Splice Hydelic]
- **Not found.** Pitch behavior in Royal Match, Two Dots, Threes, Panel de Pon,
  Zoo Keeper, Pokémon Shuffle, Toon Blast and Homescapes. No source named a
  pentatonic, whole-tone or chromatic ladder; the documented ladders are
  semitone (Candy Crush) and diatonic (Peggle 2). [no source]

## 2. What the designers say makes a sound satisfying

- **Peggle 2, few features, well joined.** Whitmore's rule one: "a few well
  integrated adaptive audio features will trick folks into thinking the design
  more complex". Peg hits are "a melody instrument"; the free-ball choir chord
  and the timpani roll before the last peg are tuned to the current harmony.
  [Whitmore 2014a]
- **Peggle, an audacious reward.** John Vechey: "when you hear that 9th it's
  just so gratifying ... It just feels good". The team then asked "What could
  compete with the 9th?" and added flames and rainbows. [Gamezebo Peggle]
- **Peggle Blast, synthesis for variety.** Tones generated in the audio engine
  kept all audio under 5 MB, and "escalating pitch over time on the same sound
  were a big win for creating sound variability and excitement". [Shumate 2015]
- **PopCap, feel lives in small details.** Jason Kapalka on clones: "they won't
  get the gravity of the gems right ... it could make a big difference, in terms
  of how the games feel". [Kapalka 2009]
- **Candy Crush Saga, constant positive feedback.** One breakdown: every move is
  answered; a voice has "far more depth, dynamics, nuances and timbre than most
  other sounds"; negative sounds are few, and the error noise is "not nice"; the
  endless music loop is the weak point. [Belcher 2013]
- **King today.** The 2022 refresh recorded music in stems for "faster pace
  music when a player is on a winning streak and calmer music when the gameplay
  requires it", and used live players for "less auditory fatigue".
  [PocketGamer.biz 2023]
- **Monument Valley 2 and 3, tuned but rationed.** A randomized hang drum ping
  is "tuned sympathetically to each level", yet "it was important to not overuse
  musical interactions". In the third game each interaction should feel "like a
  note being played in a larger composition". [Baker 2017] [Baker 2025]
- **Apple, unobtrusive and repeatable.** "Silence is golden." A good sound still
  pleases after a week on your own phone. [Apple WWDC17]
- **Not found.** Interviews on match sounds with Peter Hajba (Skaven,
  Bejeweled's composer) or the Royal Match, Two Dots, Threes or Alto teams. Of
  the GDC talks, only the written primers for the two Peggle talks were read.
  [Bejeweled Wiki]

## 3. Anatomy of short rewarding sounds

- **Three layers.** A hit is a sharp transient for snap, a body, and a low layer
  for weight; a poof is cloth, synthesizer white noise and a Doppler move
  layered as "a transient, body, and tail". [Violet games] [BOOM 2024]
- **Durations.** Micro-interaction sounds are "typically between 100-300
  milliseconds"; a tight interface whoosh is "roughly a quarter to half a
  second"; slot machine win jingles run 1.5 to 12 seconds and lengthen with the
  win. Published durations for swap, match, land or special sounds: not found.
  [SFX Engine] [Violet whoosh] [Dixon 2013]
- **Start at once.** "Even a few milliseconds of silence at the start of a file
  makes an action feel laggy"; long tails "smear timing". [Violet games]
- **Good news rises, bad news falls.** Confirmations use consonant intervals
  such as a major third and rising phrases; errors use a tritone or minor second
  and falling phrases. One map puts confirmations at 200 to 500 Hz, information
  at 1 to 5 kHz and alerts above 8 kHz. [SFX Engine]
- **Material.** Apple recorded steel, aluminum and gold so sounds seem "made by
  the device itself"; Bejeweled 2's gems click "like little mah-jongg tiles".
  Fuzzy is the opposite corner from glassy: a slower attack, little energy in
  high partials, noise filtered dark (inferred). [Apple WWDC17] [Gamezebo B2]
- **Pop and bubble.** One recipe: two sines an octave apart, pitch rising about
  20 semitones in about 100 ms, silent by about 200 ms, a high-pass near 650 Hz,
  and random pitch so no two drops match. [KVR]
- **Whoosh.** Pink or filtered noise through a band-pass or low-pass filter
  whose cutoff rises then falls, a volume curve that swells and fades, and a
  gentle pitch rise. Raw white noise is "brittle and fatiguing". [Violet whoosh]
- **Bleep and sparkle.** Peggle Blast's "bleep bloop" is a square wave with a
  half-second pitch rise and delays; its "sparkle dust" is a synthesized swoosh
  "with tremolo and more delay". [Shumate 2015]
- **Bell and chime.** A short inharmonic strike, then a few strong partials
  (ratios 2:3:4 imply a fundamental at 1), then a hum; two nearly equal partials
  beat to give warble. Additive sines suit the body; two-operator FM makes the
  strike. [SoS Bells]
- **Pluck.** Karplus-Strong sends a noise burst round a delay line with a
  low-pass filter in the loop; delay length sets pitch and the tone darkens as
  it fades. [Wikipedia KS]
- **Boing and zip.** No prose source found. A boing is a pitch that overshoots
  and wobbles as it decays; a zip is a fast one-way glide under 100 ms
  (inferred). [no source]

## 4. Voice callouts and non-verbal voices

- **Candy Crush Saga.** A "deep, sultry American" voice, "backed up by on screen
  text". A quiz gives Sweet at 4 to 5 cascades, Tasty at 6 to 7, Delicious at 8
  to 10 and Divine beyond; King's community page counts 12, 18, 24 and 30
  candies (both listing). [Belcher 2013] [FunTrivia] [King Community]
- **Bejeweled 2 and Threes.** A "deep, Vincent Price-like" announcer says
  "Good!", "Excellent!" and, for an impressive cascade, "Incredible!". Threes'
  tiles have voices recorded by indie developers; one critic found them "a
  little creepy" with the music off. [Gamezebo B2] [Wikipedia Threes]
- **Banjo-Kazooie, mumbles.** Rare felt real speech "could ruin the player's
  perception of the characters". Each character has single-syllable vocal noises
  replayed at random pitches. The team feared "people are going to hate us for
  this"; players loved it. [Wikipedia Banjo-Kazooie] [Game Developer 2017]
- **Animal Crossing.** Animalese "rapidly strings together recordings of
  individual letter sounds"; pitch varies with a character's personality
  (listing). [Springbound] [Nookipedia]
- **LocoRoco.** Songs use an invented language so no player is shut out; each
  LocoRoco has its own voice and the song gains a singer for each one collected.
  Who sang: not found. [Wikipedia LocoRoco]
- **Fe.** Each animal has about 15 phrases with about 10 variations each, and
  the team found it "real difficult to express a variety of emotions" without
  words. How Pikmin's or Katamari's voices are made: not found. [Splice Fe]
- **A synthesized critter voice.** One developer wanted something "closer to
  animal vocalizations" than Animalese: two vowels, "ooo" and "aah", shaped by
  formant filters; a per-character pitch offset within 7 semitones; a new pitch
  each word, reached by a 0.1 s slide; a slight vibrato; a muffled closed mouth
  between words. [Springbound]
- **Formants.** Adult male "oo" sits near 300 and 870 Hz, "ah" 730 and 1090 Hz,
  "ee" 270 and 2290 Hz; children's sit higher (listing). [Princeton formants]

## 5. Avoiding fatigue

- **Variants and small randomness.** Make "three to five" variants of a frequent
  sound and vary pitch and volume by "a few percent each trigger"; one semitone
  is a factor of about 1.06. No source gave a tighter range. [Violet games]
  [Prosser 2017]
- **Frequent means quiet.** "When you type faster, we bring down the volume of
  the sound ever so slightly"; micro sounds "should be quieter than primary
  gameplay audio". Leave headroom so that several sounds firing together do not
  clip. [Apple WWDC17] [SFX Engine] [Violet games]
- **Ducking.** Peggle 2 coordinates music and effects through "mixing states,
  ducking, and synchronization". A long sound ducks the rest for long, "so it
  becomes annoying". [Whitmore 2014a] [Apple WWDC17]
- **Music loops tire first.** The Candy Crush breakdown would play the track
  "once or twice each new level or game, then stop". [Belcher 2013]
- **Not found.** Published limits on simultaneous voices, on how many matches
  may sound at once in a cascade, or duck depths in dB. [no source]

## 6. Mixing for phone speakers and browsers

- **Low end.** Phone speakers "tend to drop off at around 800Hz" and a built-in
  filter usually removes everything below 200 Hz, so weight must live at 250 to
  700 Hz as harmonics; listeners rebuild a missing fundamental from its
  overtones. Apple: "filter out those frequencies that you don't use". [Smith
  2021] [LANDR 2026] [Wikipedia MF] [Apple WWDC17]
- **Harsh zone.** 4 to 5 kHz "can be particularly pronounced on mobile
  handsets", phones boost 3 to 9 kHz, and the ear is most sensitive from 2 to 5
  kHz. [Smith 2021] [LANDR 2026] [Wikipedia ELC]
- **Mono.** Many phones are mono or sound it: "if your work sounds good in mono,
  it will translate". Check mixes through a high-pass at 800, 400 and 200 Hz,
  and at low volume. [Smith 2021]
- **Loudness.** Sony's console target is -24 LUFS; its mobile target is -18
  LUFS, plus or minus 2, with a -1 dBTP true peak (listing). For a phone's own
  speaker, -16.2 LUFS "becomes a legitimate benchmark". A target for web games:
  not found. [Bridgett 2015] [Audiokinetic phones]
- **Formats.** "AAC in an MP4 container is supported by all major browsers." MDN
  lists no Vorbis in Safari and Opus only in CAF; a WebKit report has WebM Opus
  working from Safari 17.4 (listing). AAC puts 2112 priming samples (48 ms at
  44.1 kHz) before the audio, which shifts sprite offsets where they are not
  trimmed. Guidance on WAV sprites: not found. [MDN codecs] [Apple TN2258]
- **Sample rate.** An AudioContext runs at the output device's preferred rate
  and decoded audio "is resampled to the AudioContext's sampling rate". [MDN
  AudioContext] [MDN decode]
- **Latency.** Popular Android phones averaged 39 ms of audio round trip in 2021
  (28 to 56 ms), against 109 ms in 2017; the touch screen adds 10 to 35 ms. The
  "interactive" latency hint asks for the lowest latency; outputLatency
  estimates the hardware delay (Chrome 102, Firefox 70, Safari 18.4). Measured
  Web Audio latency on Android Chrome or iOS Safari: not found. [Android 2021]
  [MDN AudioContext] [web.dev latency]
- **Unlock.** A context made outside a user gesture starts suspended: "create or
  resume context from inside a user gesture". For media playback iOS counts
  touchend, click, doubleclick and keydown as gestures. Whether the iOS ringer
  switch mutes Web Audio: not found. [MDN best practices] [WebKit 2016]
- **Sync tolerance.** For speech, viewers detect audio 45 ms early or 125 ms
  late; broadcasters allow +40/-60 ms (EBU) or +15/-45 ms (ATSC). Late is
  forgiven more than early. Apple found that moving a sound 10 ms against a tap
  changed the feel. Thresholds for game effects: not found. [Wikipedia AV sync]
  [Apple WWDC17]

## 7. Music

- **Effects in the music's key.** Peggle 2, Peggle Blast and Monument Valley do
  it by design (sections 1 and 2). For Candy Crush, Royal Match and other
  match-three games: not found. [Whitmore 2014b] [Baker 2017]
- **Adaptive growth.** Peggle 2 has 7 phrases per level and drops to an ambient
  section when the player is idle. Peggle Blast changes key after every shot and
  moves to a set segment "with one peg or ball left"; each stinger exists in 12
  to 15 versions, one per key. [Whitmore 2014a] [Whitmore 2015]
- **Stems at King.** Faster music on a winning streak, calmer when play needs
  it. A tense state for few moves left in a match-three game: not found.
  [PocketGamer.biz 2023]
- **Web limits.** Web Audio keeps separate loops in sync, and a new layer sounds
  natural when it enters "on the beat/bar/phrase"; some mobile browsers ignore
  script volume changes on media elements. [MDN game audio]
- **No music, or a generative bed.** How small web games handle this: not found.
  Hydelic wants music "constructed differently each time you play"; Monument
  Valley 3 uses granular synthesis so that play shapes the score. [Splice
  Hydelic] [Baker 2025]

## 8. Haptics with sound

- **What the web can do.** navigator.vibrate takes only on and off times in ms.
  The spec cuts a pattern to 10 entries of at most 10 s each, needs earlier user
  interaction, does nothing in a hidden page, and is for "simple tactile
  feedback only". [W3C Vibration]
- **Support and options.** Chrome for Android and Samsung Internet support it;
  Safari on iOS never has; Firefox for Android is partial. "Include
  toggle/slider for any haptics" is a basic guideline. [Can I use] [GAG]
- **Less is more.** "Too much vibration can be annoying and even numbing." A
  good click lasts 10 to 20 ms, but a plain one-shot can ring 20 to 50 ms longer
  and feel buzzy: "given the choice of buzzy haptics or no haptics for touch
  feedback, choose no haptics". Frequent events get very subtle effects,
  important events stronger ones. [Android haptics]
- **Design it with the sound.** Android "strongly recommend[s] co-design of
  visual, audio, and haptic effects"; out of sync, a user "may perceive the
  haptic actuator to be broken". Apple found one tap feels different when paired
  with a different sound. [Android haptics] [Apple WWDC17]
- **Not found.** Published patterns for a match, a special or a blast in
  match-three games. [no source]

## 9. Accessibility

- **Distinct sounds.** "Ensure sound / music choices for each key objects /
  events are distinct from each other": "some games can even be playable by
  gamers who have little or no vision at all, if key sounds are all distinct".
  [GAG distinct]
- **Never sound alone.** "Ensure no essential information is conveyed by sounds
  alone" is a basic guideline. Bejeweled Blitz breaks it: with sound off a
  player misses that a multiplier has arrived, and cannot "work yourself into
  the zone". [GAG] [Juul and Keldorff]
- **Separate volumes and an off switch.** Separate controls or mutes for
  effects, speech and music are basic; Xbox lists music, voice and active
  effects as separate categories. Apple: "if you do add UI sounds, also add the
  option for people to turn them off". [GAG] [XAG 105] [Apple WWDC17]
- **Mono and tone.** Candy Crush Soda's audio panel has music and sound sliders,
  forced mono and sliders for high and low frequencies. [PocketGamer.biz 2024]
- **Harsh highs.** Hearing loss "can affect certain frequencies more than
  others"; with the phone peak at 4 to 5 kHz, bright content should stay low in
  level (inferred). [GAG volumes] [Smith 2021]

## 10. Reward research and ethics

- **Sound inflates wins.** On a slot simulator, players overestimated their wins
  by 24 percent with sound and 15 percent without; skin conductance was higher
  with sound; 72.5 percent preferred sound on. [Dixon 2013]
- **Losses disguised as wins.** Machines celebrate payouts smaller than the bet,
  and "sounds may be an integral part of the disguise". Giving those outcomes a
  negative sound cut win estimates by about 7 wins in one experiment. [Dixon
  2013] [Scarfe 2020]
- **Near-misses in Candy Crush.** In 57 players, near-misses were "more arousing
  than losses", "the most frustrating of all outcomes", and "triggered the most
  substantial urge to continue play". [Larche 2017]
- **How slots sound.** Notes rise toward a resolution and are left "unresolved
  if you don't win"; "they never have losing sounds". That every slot plays in C
  is folklore: "100% not true today". [20k Hz]
- **Rising pitch.** Practitioners advise raising pitch a semitone per chained
  action. A rehabilitation game whose feedback pitch rose with fast reactions
  found that it changed performance (listing). A controlled test of rising pitch
  on enjoyment: not found. [Prosser 2017] [Springer rehab]
- **Ethical reading.** The same tools serve joy or compulsion. The line is
  honesty: celebrate only real success, in proportion; give failure its own
  plain sound; never dress a loss as a near win (inferred). [no source]

## What this suggests for Fuzz Flux

All numbers are starting points to tune by ear on a phone (inferred).

1. Use a C major pentatonic cascade ladder (degrees 1 2 3 5 6), one step per
   cascade stage, from C5: 523, 587, 659, 784, 880, 1047, 1175, 1319, 1568 and
   1760 Hz. Pentatonic notes cannot clash with each other, and these sit in a
   phone's strong band.
2. Stop the ladder at step 10 (A6, 1760 Hz); past it, hold the note and add one
   sparkle layer per stage. Higher fundamentals fall in the 2 to 5 kHz zone that
   phones and ears exaggerate.
3. Reset to step 1 on every player move. Peggle counts from the start of a turn
   "so that it always ascends", and a reset keeps the top rare.
4. Play several matches in one stage as an upward arpeggio, 50 ms apart, at most
   3 notes; further matches add 1 dB each, to +3 dB. This bounds voices without
   hiding the size of the stage.
5. Build the match sound in 220 ms: a 15 ms dark noise puff (band-pass at 1.5
   kHz), a sine and triangle body at the ladder pitch with a 3 semitone upward
   scoop over 30 ms, and a 150 ms decay: transient, body and tail in under 300
   ms.
6. Keep everything fuzzy: attacks of 5 to 10 ms, no partials above 6 kHz, noise
   low-passed at 3 kHz, FM bells only on specials. Soft attacks and dark noise
   say fur where clicks say glass.
7. Pop a cleared fuzzball with a sine pair an octave apart, rising 12 semitones
   in 70 ms and silent by 160 ms. This is the bubble recipe made quicker for
   repeated use.
8. Swap with a 90 ms upward zip (400 to 800 Hz), 10 dB under the match; refuse a
   swap with a 180 ms boing that falls a major second with a decaying 12 Hz
   wobble. Even the "no" should be soft, where Candy Crush's is "not nice".
9. Land with a 50 ms thud at 300 Hz plus a 600 Hz harmonic, 14 dB under the
   match, at most one per 60 ms. The most frequent sound must be the quietest,
   and 300 Hz alone would vanish on a phone.
10. Mark specials by length: created, a 350 ms rising fifth with shimmer; fired,
    a 400 ms whoosh (pink noise, band-pass sweeping 500 Hz to 3 kHz and back);
    big blast, 800 ms on a 220 Hz body with 440 and 660 Hz harmonics. Longer and
    lower reads as bigger; harmonics carry weight on phones.
11. Give fuzzballs chirps, not words, at cascade stages 3, 5, 7 and 9: a pulse
    at 400 to 700 Hz through two band-pass filters gliding from "oo" (390 and
    1130 Hz) to "ah" (950 and 1420 Hz), pitch rising 4 to 7 semitones in 100 ms,
    7 Hz vibrato, 180 to 300 ms. Tiers do the job of "Sweet" to "Divine", and
    formants, glide and vibrato make a creature.
12. Vary non-tonal layers by 3 percent in pitch and 1.5 dB in level; keep ladder
    notes in tune and rotate 3 timbre variants. Detuned notes would spoil the
    scale and unvaried puffs would tire.
13. Limit effects to 8 voices, 2 instances per sound and a 40 ms retrigger gap,
    and lower each ladder step by 0.5 dB. This keeps a 10-stage cascade from
    clipping or shouting.
14. Mix a mono sprite with a 200 Hz high-pass, core energy from 500 Hz to 4 kHz
    and a 3 dB cut above 4 kHz; audition through an 800 Hz high-pass. That is
    the band a phone reproduces, minus its harsh peak.
15. Aim busy play at about -18 LUFS with peaks under -1 dBFS: frequent sounds
    peak near -12 dBFS and the win stinger near -4 dBFS. This is Sony's mobile
    target, with headroom for stacked sounds.
16. Render the sprite at 44.1 kHz mono, ship AAC in M4A with an Ogg or Opus
    alternate, leave 100 ms of silence between entries, and check offsets in
    Safari and Chrome. AAC plays everywhere, but its priming can shift cues by
    48 ms.
17. Resume the context on the first tap, fire touch sounds at touch-up, and
    schedule cascade sounds on the audio clock, ahead by outputLatency where
    reported; aim for sound 0 to 60 ms after the visual hit, never over 40 ms
    before. Phones add tens of ms, and late is forgiven more than early.
18. Ship no music loop. Offer an optional bed, a quiet C and G pad (262 and 392
    Hz) 12 dB under the effects, that gains a layer per chirp tier and fades in
    2 s; with few moves left it thins and does not tense. Loops tire first, and
    a bed in C keeps every effect consonant.
19. Vibrate on Android only, never for swaps or landings: match 12 ms; special
    15, 40, 20; blast 30, 50, 30, 50, 40 (ms, on and off in turn), behind a
    settings toggle. Clear, short and rare is the platform's own advice.
20. Offer effects, music and voice sliders with a mute; make each event differ
    in contour, not only pitch, and give each a visual twin. Keep the win
    stinger near 1.5 s and the lose stinger a 600 ms gentle falling third, with
    no near-miss sting and no celebration on a failed level. Sound should let
    the game be followed by ear and never call a loss a win.

## Sources

- [20k Hz] https://www.20k.org/episodes/slotmachines
- [Android 2021] https://android-developers.googleblog.com/2021/03/an-update-on-androids-audio-latency.html
- [Android haptics] https://developer.android.com/develop/ui/views/haptics/haptics-principles
- [Apple TN2258] https://developer.apple.com/library/archive/technotes/tn2258/_index.html
- [Apple WWDC17] https://developer.apple.com/videos/play/wwdc2017/803
- [Audiokinetic phones] (listing) https://www.audiokinetic.com/en/blog/loudness-and-frequency-response-on-popular-smart-phones
- [Baker 2017] https://www.asoundeffect.com/behind-beautiful-sound-monument-valley-2-todd-baker/
- [Baker 2025] https://news.xbox.com/en-us/2025/07/18/how-monument-valley-3-uses-soundscapes-to-tell-its-story/
- [Bejeweled Wiki] https://bejeweled.wiki.gg/wiki/Bejeweled_3
- [Belcher 2013] https://www.gamedeveloper.com/audio/why-candy-crush-saga-is-so-engaging-an-audio-breakdown
- [BOOM 2024] https://www.boomlibrary.com/?p=458541
- [Bridgett 2015] https://audiomediainternational.com/mobile-loudness-an-adaptive-approach/
- [Can I use] https://caniuse.com/mdn-api_navigator_vibrate
- [Dixon 2013] https://pmc.ncbi.nlm.nih.gov/articles/PMC4225056
- [FunTrivia] (listing) https://www.funtrivia.com/trivia-quiz/VideoGames/Candy-Crush-Saga-366578.html
- [GAG] https://gameaccessibilityguidelines.com/full-list/
- [GAG distinct] https://gameaccessibilityguidelines.com/ensure-sound-music-choices-for-each-key-objects-events-are-distinct-from-each-other/
- [GAG volumes] https://gameaccessibilityguidelines.com/provide-separate-volume-controls-or-mutes-for-effects-speech-and-background-music/
- [Game Developer 2017] https://www.gamedeveloper.com/audio/how-i-goldeneye-i-s-composer-used-tech-limitations-to-create-an-iconic-sound
- [Gamezebo B2] https://www.gamezebo.com/reviews/bejeweled-2-deluxe-review/
- [Gamezebo Peggle] https://www.gamezebo.com/news/peggle-how-a-spark-started-a-fever/
- [Juul and Keldorff] https://www.jesperjuul.net/text/depthinoneminute/
- [Kapalka 2009] https://www.gamedeveloper.com/design/casual-game-design-popcap-s-jason-kapalka-and-i-bejeweled-twist-i-
- [King Community] (listing) https://community.king.com/en/candy-crush-saga/discussion/comment/1187830/
- [KVR] https://www.kvraudio.com/forum/viewtopic.php?p=7285687
- [LANDR 2026] https://blog.landr.com/make-bass-audible-phone-speakers
- [Larche 2017] https://link.springer.com/article/10.1007/s10899-016-9633-7
- [Mattingly 2015] https://www.audiogang.org/?p=3095
- [MDN AudioContext] https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/AudioContext
- [MDN best practices] https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices
- [MDN codecs] https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Audio_codecs
- [MDN decode] https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/decodeAudioData
- [MDN game audio] https://developer.mozilla.org/en-US/docs/Games/Techniques/Audio_for_Web_Games
- [Nookipedia] (listing) https://nookipedia.com/wiki/Animalese
- [PocketGamer.biz 2023] https://www.pocketgamer.biz/kings-vanesa-tate-on-re-crafting-the-soundtrack-to-candy-crush-saga/
- [PocketGamer.biz 2024] https://www.pocketgamer.biz/inside-audio-design-at-king/
- [PopCap patent] (listing) https://patents.justia.com/patent/8398476
- [Princeton formants] https://www.cs.princeton.edu/courses/archive/spr99/cs325/formants.html
- [Prosser 2017] https://www.gamedeveloper.com/audio/the-power-of-pitch-shifting
- [Puyo Nexus] https://puyonexus.com/wiki/Tee and https://puyonexus.com/wiki/Arle_Nadja
- [Scarfe 2020] https://pmc.ncbi.nlm.nih.gov/articles/PMC8144080
- [SFX Engine] https://sfxengine.com/blog/best-practices-for-game-ui-sounds
- [Shumate 2015] https://www.audiogang.org/?p=3107
- [Smith 2021] https://oliver-smith-zef4.squarespace.com/blog/how-to-make-your-mobile-game-sound-better
- [SoS Bells] https://www.soundonsound.com/techniques/synthesizing-bells
- [Splice Fe] https://splice.com/blog/?p=4636
- [Splice Hydelic] https://splice.com/blog/?p=5870
- [Springbound] https://brycetown.substack.com/p/springbound-devlog-4-making-critters-talk
- [Springer rehab] (listing) https://link.springer.com/doi/10.1007/978-3-319-49655-9_13
- [Violet games] https://violetrecording.com/how-to-design-sound-effects-for-games/
- [Violet whoosh] https://violetrecording.com/how-to-make-whoosh-sounds/
- [W3C Vibration] https://www.w3.org/TR/vibration/
- [Wccftech 2019] https://wccftech.com/interview-tetsuya-mizuguchi-synesthesia-tetris-effect-rez-lumines/
- [web.dev latency] https://web.dev/articles/audio-output-latency
- [WebKit 2016] https://webkit.org/blog/6784/new-video-policies-for-ios/
- [Whitmore 2014a] https://www.audiogang.org/peggle2-sonic-joy/
- [Whitmore 2014b] https://www.audiogang.org/peggle-2-storytelling-through-adaptive-music/
- [Whitmore 2015] https://www.audiogang.org/scoring-peggle-blast-new-dog-old-tricks/
- [Wikipedia AV sync] https://en.wikipedia.org/wiki/Audio-to-video_synchronization
- [Wikipedia Banjo-Kazooie] https://en.wikipedia.org/wiki/Banjo-Kazooie_(video_game)
- [Wikipedia ELC] https://en.wikipedia.org/wiki/Equal-loudness_contour
- [Wikipedia KS] https://en.wikipedia.org/wiki/Karplus%E2%80%93Strong_string_synthesis
- [Wikipedia LocoRoco] https://en.wikipedia.org/wiki/LocoRoco
- [Wikipedia Lumines] https://en.wikipedia.org/wiki/Lumines:_Puzzle_Fusion
- [Wikipedia MF] https://en.wikipedia.org/wiki/Missing_fundamental
- [Wikipedia Peggle] https://en.wikipedia.org/wiki/Peggle
- [Wikipedia Threes] https://en.wikipedia.org/wiki/Threes
- [XAG 105] https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/105
