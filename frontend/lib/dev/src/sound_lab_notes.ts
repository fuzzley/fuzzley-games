// The sound lab's notes: why the games' synthesized sounds fall short, the
// ways to better ones, and how the lab helps choose between them. Every
// game's lab shows them, since every game's sounds come from
// `@fz/dev/sounds`.

/** The notes, as HTML the page shows as it is. */
export const SOUND_LAB_NOTES = `
<h3>Why the sounds fall short</h3>
<p>
  Every game's sounds are synthesized by <code>@fz/dev/sounds</code>, from a
  game's <code>tools/build-sounds.mjs</code>, and the synth itself caps them:
</p>
<ul>
  <li>
    <strong>16,000 samples a second,</strong> so nothing above 8 kHz exists:
    the crack of a break, the sizzle of a blast and the air in a whoosh all
    live up there, and are muffled away.
  </li>
  <li>
    <strong>Sines alone,</strong> with at most a share of the second harmonic,
    so every tone sounds thin, like a test tone.
  </li>
  <li>
    <strong>One noise, and a dull one:</strong> <code>thud()</code> smooths its
    noise to about 700 Hz, so every break, blast and dash shares one rumble,
    and nothing can crack or hiss. There is no filter to sweep or resonate.
  </li>
  <li>
    <strong>No effects:</strong> no saturation, no echo, no compression; each
    sound is dry and stops dead.
  </li>
  <li>
    <strong>One take of each, played alike:</strong> a shot heard seven times a
    second sounds the same each time, a machine gun of one sample. Only a
    chain's breaks rise.
  </li>
  <li>
    <strong>Tuned without an ear:</strong> the recipes are numbers in code,
    with nothing to hear one in the game's context while it is changed. This
    page is that ear.
  </li>
</ul>
<p>
  Raising the rate alone changes little, since no recipe reaches above 8 kHz
  as it is: the sounds need designing again.
</p>

<h3>Ways to better sounds</h3>
<ol>
  <li>
    <strong>Design by ear in an arcade synth.</strong>
    <a href="https://github.com/KilledByAPixel/ZzFX">ZzFX</a> (MIT) has a
    <a href="https://killedbyapixel.github.io/ZzFX/">designer</a>, renders at
    44.1 kHz, and covers saws, squares, noise, a filter, bitcrush, echo and
    tremolo, each sound a list of twenty numbers.
    <code>@fz/dev/zzfx</code> renders the same samples in Node or a page, with
    nothing drawn at random, so a sound designed there can be built into the
    sprite, the same bytes every run, with no licence to track. The
    candidates here are ZzFX's.
    <a href="https://github.com/ttencate/jfxr">jfxr</a> and
    <a href="https://drpetter.se/project_sfxr.html">sfxr</a> are its kin. Its
    ceiling is good retro, which suits an arcade game.
  </li>
  <li>
    <strong>Grow the synth instead:</strong> 44.1 kHz, white and pink noise,
    filters that sweep and resonate, saws, squares and FM, soft saturation, a
    short reverb, and a few seeded takes of each sound. Rendering through
    Web Audio offline, with
    <a href="https://github.com/ircam-ismm/node-web-audio-api">node-web-audio-api</a>
    in Node or an <code>OfflineAudioContext</code> in headless Chrome, brings
    the filters, convolution, waveshaping and a compressor for free. More work
    than ZzFX, and it still needs an ear.
  </li>
  <li>
    <strong>Recorded sounds, free to share.</strong> Kenney's packs are CC0
    (the sci-fi, impact and digital-audio ones fit); Freesound and
    OpenGameArt, filtered to CC0. CC-BY works with a credits file; nothing
    marked non-commercial. The repository is public and GPL, so a
    royalty-free pack that forbids passing its sounds on alone, as the Sonniss
    GDC bundles are said to, can't be committed. A recording would need the
    sprite to take a file, beside a manifest of each file's source and
    licence that a spec holds.
  </li>
  <li>
    <strong>Generated sounds.</strong> Stable Audio Open runs locally on a
    good GPU, its outputs usable commercially under its community licence
    below $1M of revenue (check stability.ai/license); ElevenLabs' sound
    effects are the hosted kind. Good at textures, crumbling rock, debris,
    explosions; poor at short, tight, tonal blips; different at every run, so
    each is kept as a recording is, with its prompt and seed. Where clean
    provenance matters, synthesis and CC0 are safer.
  </li>
  <li>
    <strong>A sound designer,</strong> for a pack of fifteen, under a licence
    that lets the repository share them: CC0 or CC-BY.
  </li>
</ol>
<p>
  The kinds layer well: a synthesized body under a recorded or generated
  crunch is what makes a break feel physical.
</p>

<h3>How the sounds play</h3>
<p>Whatever the sounds, how a game plays them matters as much. Try each here:</p>
<ul>
  <li>
    <strong>Vary each play,</strong> up to ±60 cents and ±1.5 dB,
    so a sound heard many times a second never repeats itself.
  </li>
  <li>
    <strong>Pan by place:</strong> a rock that breaks at the left is heard at
    the left.
  </li>
  <li>
    <strong>A limiter on the mix,</strong> so a crowd of breaks under a blast
    never clips.
  </li>
  <li>
    Not tried here yet: a blast or a lost ship ducking the small sounds a
    moment, and a quiet bed of hum under the field.
  </li>
</ul>

<h3>Using the lab</h3>
<ol>
  <li>
    Play a scene with the sounds the game ships, then with the candidates:
    <em>Current, then candidate</em> plays both, a breath apart.
    <em>Match loudness</em> keeps the louder one from winning by being louder.
  </li>
  <li>
    Change a candidate in its box, or design one in ZzFX's designer and paste
    what it copies; the scenes play it at once, and the page keeps it as you
    left it until <em>Reset</em>.
  </li>
  <li>
    <em>Copy as code</em> copies a candidate as the game's
    <code>tools/sound-lab.ts</code> writes one, to keep it there.
  </li>
  <li>
    Listen on a phone's speaker too, which drops everything below about
    200 Hz: run the dev server with <code>--host</code> to reach it.
  </li>
</ol>

<h3>What comes next</h3>
<ul>
  <li>
    Build the chosen candidates into the sprite, rendered by
    <code>@fz/dev/zzfx</code> at 44.1 kHz from a game's
    <code>tools/build-sounds.mjs</code>.
  </li>
  <li>
    Vary, pan and limit the plays in <code>@fz/phaser/sound</code>'s
    <code>SpritePlayer</code>, which every game drawn with Phaser plays its
    sounds through, if they win here.
  </li>
  <li>
    At 44.1 kHz a sprite grows about threefold as WAV. Ogg, with an M4A for
    Safari, shrinks it, but a lossy format pads its start: check the sprite's
    times and the loops' seams again, and keep MP3 away from a loop.
  </li>
</ul>
`;
