// The sound lab's notes: how the games' sounds are made and played, what
// still holds them back, and how the lab helps hear them. Every game's lab
// shows them.

/** Describes the numbers a game's mix plays by, as the notes give them. */
export interface MixNumbers {
  /** How far a varied play is raised or lowered, in cents, and made louder or quieter, in decibels, at most. */
  readonly variation: { readonly cents: number; readonly decibels: number };
  /** How many voices sound at most: of a sound, of a family and in all. */
  readonly voices: {
    readonly sound: number;
    readonly family: number;
    readonly all: number;
  };
  /** How far a huge sound turns the busy ones down, in decibels, and how long, in seconds. */
  readonly duck: { readonly decibels: number; readonly heldUntil: number };
}

/** Returns the notes, as HTML the page shows as it is, giving the numbers a game's mix plays by. */
export function soundLabNotes({ variation, voices, duck }: MixNumbers): string {
  return `
<h3>How the sounds are made</h3>
<p>
  Every game's sounds are synthesized from recipes in its
  <code>tools/build-sounds.mjs</code>, the same bytes every run, so they are
  free to share and need no licence to track. Two synths make them:
</p>
<ul>
  <li>
    <strong><code>@fz/dev/synth</code>,</strong> which Asteroid Breaker's are
    made with: 44,100 samples a second, saws, pulses and FM, white, pink and
    brown noise, the partials of struck things, filters that sweep and
    resonate, drive, rooms and a limiter, and as many takes of a sound as its
    recipe asks, each from a seed of its own.
  </li>
  <li>
    <strong><code>@fz/dev/sounds</code>,</strong> which the other games' are
    made with, and which caps them: 16,000 samples a second, so nothing above
    8 kHz, sines with at most a share of the second harmonic, one dull noise,
    no effects, and one take of each sound. Moving a game onto the first is
    how its sounds get better.
  </li>
</ul>
<p>
  Neither has an ear: a recipe is numbers in code, checked by measures
  (loudness, brightness, what a phone's speaker keeps), not by listening.
  This page is that ear.
</p>

<h3>How a game plays them</h3>
<p>
  A game that hands <code>@fz/phaser/sound</code>'s player its mix plays by
  <code>@fz/core/sound_mix</code>'s rules, which this page plays by too:
</p>
<ul>
  <li>Each sound's <strong>takes in turn,</strong> so none plays twice running.</li>
  <li>
    The noisy sounds heard many times a second <strong>varied,</strong> up to
    ±${String(variation.cents)} cents and ±${String(variation.decibels)} dB;
    a tuned one stays in key.
  </li>
  <li><strong>Placed</strong> where it happens across the field.</li>
  <li>
    <strong>Voices held</strong> to ${String(voices.sound)} of a sound,
    ${String(voices.family)} of a family and ${String(voices.all)} in all, the
    quietest and oldest giving way.
  </li>
  <li>
    The busy levels <strong>ducked</strong> ${String(duck.decibels)} dB for
    ${String(Math.round(duck.heldUntil * 1000))} ms under a huge sound, and a
    <strong>limiter</strong> on the whole, so a crowd of breaks under a blast
    never clips.
  </li>
</ul>
<p>
  A game with no mix plays each sound as it was recorded; its lab can still
  try varying, panning and limiting, at numbers of the lab's own.
</p>

<h3>Ways to better sounds still</h3>
<ol>
  <li>
    <strong>Recorded sounds, free to share.</strong> Kenney's packs are CC0
    (the sci-fi, impact and digital-audio ones fit); Freesound and
    OpenGameArt, filtered to CC0. CC-BY works with a credits file; nothing
    marked non-commercial. The repository is public and GPL, so a pack that
    forbids passing its sounds on alone can't be committed. A recording would
    need the sprite to take a file, beside a manifest of each file's source
    and licence that a spec holds.
  </li>
  <li>
    <strong>Generated sounds.</strong> Good at textures, crumbling rock,
    debris and explosions; poor at short, tight, tonal blips; different at
    every run, so each is kept as a recording is, with its prompt and seed,
    under a licence checked first.
  </li>
  <li>
    <strong>A sound designer,</strong> for a pack, under a licence that lets
    the repository share it: CC0 or CC-BY.
  </li>
</ol>
<p>
  The kinds layer well: a synthesized body under a recorded crunch is what
  makes a break feel physical.
</p>

<h3>Using the lab</h3>
<ol>
  <li>
    Play a scene as the game plays it now, or, where the game kept the
    sounds it played before, as it played them then: <em>Before, then
    after</em> plays both, a breath apart.
  </li>
  <li>
    Turn the game's mix off to hear each sound's first take plainly, as it
    was rendered, and on to hear what the mix adds; each sound's takes play
    alone from its card. The mix's limiter makes up the gain it takes, so a
    sound plays a dB or two louder by the mix than plainly or before, and
    the louder of two tends to sound the better.
  </li>
  <li>
    Listen on a phone's speaker too, which drops everything below about
    200 Hz: run the dev server with <code>--host</code> to reach it.
  </li>
</ol>
`;
}
