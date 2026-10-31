# Plan: Asteroid Breaker

Asteroid Breaker would be the sixth game hosted on fuzzley.games, at
`/play/asteroid-breaker/`, in the Arcade category beside Snake and Brick
Breaker: a small ship drifts in a square of space that wraps at every edge,
turning, thrusting and firing, and breaks every rock in the wave into smaller
and smaller pieces before one of them finds it. Its rules, physics included,
are plain TypeScript, its field is a Phaser scene, and its shell is Angular
on the shared libraries, laid out as Brick Breaker is.

This is the design plan. Every decision the user has to take is under
"Decisions", each with a recommendation; "Design reference" says what the
game is with every recommendation taken; "The build" says how it is made;
"Phases" says in what order. The
[mock page](https://claude.ai/artifact/WGnBUrcPphdq9U1RMEvViN), a private
artifact, draws the look, the layouts on a desktop and on phones both ways,
the art, the rules' diagrams and the cards, and has a sketch to fly, in a
browser or on a phone, for the feel. The sketch is throwaway code written for
the mock, not the game's.

The game keeps the genre's conventions: inertia, a wrapping field, rocks that
split into smaller, faster pieces. What is its own: rock kinds as a catalog
(as Brick Breaker's bricks are), thirty designed waves in three sectors, a
comet and a gold nugget in place of enemy ships, a dash in place of a random
jump, a chain multiplier, a round pod for a ship, and flat art in the site's
palettes.

## What other games teach

Read for this plan: descriptions, reviews and design write-ups of games in
the genre, and guides to touch controls. No other game's code was read.

- **The glide is the genre.** The original is described as "a rudimentary
  physics game": ship, rocks and shots all carry inertia, and a shot leaves
  with the ship's speed added to its own
  ([Game Developer](https://www.gamedeveloper.com/design/feature-game-design-essentials-20-atari-games-)).
  Players of clones say what they miss is the glide
  ([AtariAge](https://forums.atariage.com/topic/365993-the-case-of-the-assy-asteroids-clones/)).
  So the ship drifts, and shots add the ship's speed (decision 2).
- **Wrapping is the escape valve,** and smaller rocks are faster and worth
  more; the original capped the rocks on screen and split one into fewer
  pieces at the cap
  ([Wikipedia](<https://en.wikipedia.org/wiki/Asteroids_(video_game)>)).
  Kept, with our own numbers.
- **Lurking.** Players of the original hid near an edge and farmed the
  saucers for points until a patched ROM stopped it; its sequel's design
  aimed at the same strategy
  ([Wikipedia](<https://en.wikipedia.org/wiki/Asteroids_(video_game)>),
  [Asteroids Deluxe](https://en.wikipedia.org/wiki/Asteroids_Deluxe)). A
  game here has no endless source of points to farm: the gold nugget comes a
  set number of times a wave, and comets pay nothing.
- **Pickups that come to you, and come often enough.** Blasteroids' power
  crystals decay, so they must be caught quickly
  ([Blasteroids](https://en.wikipedia.org/wiki/Blasteroids)); reviewers of
  Asteroids: Recharged liked that pickups drift toward the ship, which spares
  unfair deaths, and disliked uneven drop rates
  ([Gamezebo](https://www.gamezebo.com/reviews/asteroids-recharged-switch-review-out-of-this-world/),
  [The Xbox Hub](https://www.thexboxhub.com/asteroids-recharged-review/)).
  So pickups last 8 s, are drawn in from close by, and a drought rule
  guarantees one (decision 10).
- **Rocks of different stuff.** Super Stardust HD's rocks are rock, gold and
  ice, each best broken by its own weapon
  ([Giant Bomb](https://www.giantbomb.com/wiki/Games/Super_Stardust_HD)),
  and Blasteroids has rocks that home on the ship after a hit, rocks that
  grow, and rocks that hold crystals. Asteroid Breaker's kinds are its own,
  but the idea, a kind told apart at a glance that asks for a different
  approach, is what its catalog is for (decision 8).
- **Shields and boosts over a random jump.** Asteroids Deluxe replaced the
  jump to a random spot with a draining shield; Super Stardust HD has a
  boost. A random jump is a gamble the player can't learn, so the escape
  here is a dash (decision 7).
- **On a phone, twin sticks are the common answer, and a finger over the
  ship is the common complaint.** Atari's own mobile game went twin-stick
  ([Gamezebo](https://www.gamezebo.com/upcoming/asteroids-gunner-preview/));
  players say a finger covering the ship is bad and that a virtual stick
  works for asteroid shooting
  ([TouchArcade](https://toucharcade.com/community/threads/preferred-control-method-for-shmup-bullethell-free-flight-games.125655/));
  a developer of a portrait asteroid game found four buttons needed two
  hands and thought holding to fire more accessible
  ([TouchArcade](https://toucharcade.com/community/threads/spacey-asteroid-beta-testers-needed.411941/)).
  So the controls sit off the field, in a deck, and fire is held
  (decisions 4 and 6).
- **How a virtual stick feels right:** it appears where the thumb lands, in
  a zone of its own; a dead zone of 10–15% of its radius, with the output
  remapped from the dead zone's edge so it doesn't jump; the knob clamped to
  the base; a highlight at full push, since a thumb feels no stop; and one
  finger tracked from press to release
  ([Abratabia](https://www.abratabia.com/game-controls/virtual-joystick.php)).
  All of it is in the deck (decision 4).
- **Feel comes from small, quick feedback:** a kick and a decaying shake, a
  brief pause on a big hit, debris that lingers, sound with every action
  ([Vlambeer's talk, as summarized](https://infovore.org/?p=5275)). So the
  flourishes (decision 18), all left out where the player asks for less
  motion.

## Decisions

Each has a recommendation, first. "Design reference" is written with every
recommendation taken.

1. **The name:** Asteroid Breaker, at `/play/asteroid-breaker/`, workspace
   `games/asteroid-breaker`, port 9005, in Arcade. Or a shorter name (Rock
   Breaker, Space Rocks).
2. **The flight:** the genre's, with inertia: the ship turns, thrusts along
   its heading, drifts and slows; a shot leaves with the ship's speed added.
   Or twin-stick flight, the thrust's direction apart from the aim, which is
   easier to learn but loses the turn-around-to-brake that the genre is
   played by, and plays differently by keyboard.
3. **The field:** a square of 40 by 40 units that wraps at every edge, the
   same on every screen, so every player plays the same game and the bests
   compare. A square fits a desktop, and leaves a phone the room for its
   thumbs both ways. Or wider than tall on a wide screen without touch.
4. **Touch:** a deck beside the field, under it upright and on both sides of
   it on its side, never over it: a stick that appears where the left thumb
   lands and turns the ship toward where it points, thrusting once pushed
   past half way, and Fire and Dash for the right thumb; a setting swaps the
   hands. Or twin sticks (the left thrusts, the right aims and fires); or
   steering by dragging on the field, which hides the ship under the finger.
5. **The deck is drawn in the canvas,** by the scene, and read by the
   view's `Steering`, as Brick Breaker's finger room is: one input path, the
   stick drawn at the frame rate, and its layout worked out in one place. Or
   Angular buttons beside the canvas, as Snake's arrows are, which a screen
   reader could reach, though no one can play a real-time shooter by one.
6. **Firing:** held to fire, 7 shots a second, 6 in flight at most. A
   setting, "Fire by itself", fires whenever a rock is in play, for playing
   with one thumb; off by default. Or auto-fire by default on touch.
7. **The escape:** a dash, a burst along the heading for 0.22 s during
   which nothing can hit the ship, recharging in 2.5 s. Or a draining
   shield held on a button; or nothing beyond flying.
8. **Rock kinds:** seven, each told apart by its shape and its marks as
   well as its color: stone, ice, crystal, iron, volatile, lodestone and
   the boulder. Rocks pass over each other rather than collide, so where a
   rock goes can be read.
9. **No enemy ships.** The gold nugget, which crosses once and pays well,
   and the comet, a hazard warned of at the edge, give a wave its surprises.
   Or a hunter that chases the ship, later, as a kind.
10. **Pickups:** eight, none bad: Spread, Rapid, Lance, Shield, Magnet,
    Slow, Nova and an extra ship. One of each group at a time; drawn in to
    the ship from 3 units; 8 s to catch one; and one guaranteed after 25 s
    without any.
11. **Effects end with their wave and with a lost ship,** as Brick Breaker's
    end with their level and a lost life.
12. **Waves:** thirty, in three sectors of ten, as data, the last of each a
    boulder; each new thing comes alone first. A run starts at the first
    wave of any sector the player has reached, and clearing wave 30 wins.
    Or an endless run of generated waves.
13. **The game waits for the player.** A wave's rocks hold still under the
    Ready card until the first move or shot. After a lost ship the field
    plays on, and the next ship waits where it is safest, untouchable, until
    the player moves, then is untouchable 2 s more.
14. **Ships:** three; one more at 10,000 points and every 20,000 after, six
    at most.
15. **Scoring:** points by kind and size, smaller worth more; a chain of
    breaks each within 1.5 s of the last scores double from the fifth,
    triple from the tenth and four times from the twentieth, as Brick
    Breaker's streak; 500 for a cleared wave and 500 more without a ship
    lost; 500 for the gold nugget.
16. **Speeds:** Relaxed, Normal and Fast, in the bar's `<fz-bar-choice>`,
    with bests for each; Relaxed's comets come half as often. A Custom speed
    later, as Brick Breaker grew one.
17. **Colors:** the field takes the palette's field, light space in a light
    palette and dark in a dark one, as every game's board does; the rocks
    take the game's own inks, seven for light palettes and seven for dark,
    held to the contrast spec. Or always dark space, whatever the palette.
18. **Flourishes,** only where motion is welcome: shards, a hit's flash,
    points that rise, a kick on a big break, a shake and a brief pause on a
    lost ship, the thrust's exhaust and the dash's trail.
19. **Sound:** twelve effects and a thrust's hum while it is held, on by
    default, with the Sound button.
20. **Haptics:** a short buzz as a ship is lost and as a wave clears, on
    phones that can (Android's browsers; Safari can't), on by default, in
    the settings.
21. **A game taken up after a reload** keeps its rocks as they were, its
    score, ships and wave; the shots, pickups, comets and effects go, and
    the ship waits where it is safest; it comes back paused.
22. **Part 1 lifts six pieces** into the libraries (the step clock, the
    event log, the frame's sounds and grouped points into `@fz/core`, a held
    sound into `@fz/phaser/sound`, and the deck into `@fz/dev/layout`'s
    board check), Brick Breaker adopting each unchanged, and merges first.
23. **The feel is settled by a person on real phones** at Q3, before the
    other twenty-five waves are built, with a tuning drawer in development
    builds, as Brick Breaker's ball speed slider is.
24. **No gamepad in this plan.** The stick's model maps straight onto one,
    so it is a small follow-up.

## Design reference

### The game

#### The field and the ship

- **The field is 40 units by 40** and wraps: whatever leaves by one edge
  comes in by the other, ship, shots, rocks and pickups alike. The comet and
  the gold nugget alone cross once and leave. Everything the rules know is
  in these units; the view turns them into device pixels.
- **The field keeps its shape.** It is fitted whole into the room the bar
  and the deck leave, a whole number of device pixels square, and centered,
  with a frame of 2 CSS px on every side. A wider window shows more page
  around it, not more field.
- **The ship is a round pod,** 2.4 units long and 1.5 wide, its nose ahead,
  two fins at its tail and a round window; it is hit only within 0.7 units
  of its middle, less than it looks, so a graze is a miss.
- **It flies as the genre does.** Thrust pushes it along its heading; it
  keeps its speed and slows as it coasts, its speed halving every 1.5 s; it
  can't go faster than its top speed. Turning changes only where it points,
  so stopping means turning round and thrusting back.
- **It turns two ways.** By keys, at a fixed rate, ramped in over a few
  hundredths of a second so a tap turns a few degrees. By a stick or the
  mouse, toward where they point, at up to twice that, easing into the
  heading, so it can't overshoot and shudder.
- **Shots** leave the nose at their speed plus the ship's, wrap, and fade
  after 0.8 s, so a shot crosses most of the field but can't circle it.
  Holding fire fires 7 a second, with at most 6 in flight.
- **The dash** throws the ship along its heading for 0.22 s, during which
  and for 0.1 s after nothing can hit it; then it keeps its old speed, plus
  a little along the heading, to its top speed. It recharges in 2.5 s,
  shown by a ring.
- **A lost ship** bursts, ends the chain and every effect, and the next
  waits 1 s later where it is safest: the middle, if no rock is within 9
  units of it, else the best of a 5 × 5 grid of places, by the distance to
  the nearest rock a second ahead. It waits there, untouchable and blinking,
  while the rocks fly on, until the player moves, turns, fires or dashes,
  then stays untouchable 2 s more. With no ship left, the run is over.

#### The feel, in numbers

The numbers the game starts from, kept in `src/rules/tuning.ts` so one file
tunes the game, but those of one kind of rock or one pickup, which its
catalog entry holds. They are first guesses, to be settled by playing at Q3;
the mock's sketch has sliders for the ship's.

| What                  | Value                                                                                                                         |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| The field             | 40 × 40 units, wrapping at every edge                                                                                         |
| The step              | 1/120 s, 12 at most a frame                                                                                                   |
| The ship              | 2.4 units long, 1.5 wide, hit within 0.7 of its middle                                                                        |
| Thrust                | 24 units a second, each second, along the heading; top speed 15 units a second                                                |
| Coasting              | the speed halves every 1.5 s                                                                                                  |
| Turning, by keys      | 300° a second, reached in 0.08 s                                                                                              |
| Turning, to a heading | up to 600° a second, easing in over the last 12°                                                                              |
| Shots                 | 32 units a second plus the ship's speed; 0.8 s; one each 0.14 s held; 6 in flight; a radius of 0.18                           |
| The dash              | 34 units a second for 0.22 s, untouchable 0.32 s, recharged in 2.5 s                                                          |
| Rocks' radius         | large 2.8 units, medium 1.6, small 0.9, the boulder 4.6; hit within 0.9 of it                                                 |
| Rocks' speed          | the boulder 1.5–2.5, large 2.5–4, medium 4–6, small 5.5–8.5 units a second, times the kind's, the wave's pace and the speed's |
| Rocks on the field    | 48 at most; at the cap a rock splits into one piece fewer                                                                     |
| A new ship            | 1 s after the last; untouchable while it waits and 2 s after                                                                  |
| Pickups               | 8 s, blinking the last 2; drawn in from 3 units at 10 a second (14 with Magnet)                                               |
| The chain             | 1.5 s from one break to the next                                                                                              |
| Ships                 | 3 to start, 6 at most; one more at 10,000 points and every 20,000 after                                                       |

On a phone upright (390 × 844) a unit is about 9 CSS px, so the ship is
22 px long and a small rock 16 px across; on a small phone on its side
(568 × 320), about 6.6 px, the layout check's floor being 6; on a desktop
at 1280 × 800, about 17 px.

#### Rocks

- **A shot that breaks a rock splits it** into pieces of the next size,
  which leave from its place, each turned 25° to 50° off its travel, by the
  run's seeded random, and pushed a little along the shot's. The pieces are
  faster than their parent, as their size says. A small rock breaks into
  nothing.
- **A rock that takes several hits** shows each one (dents, then cracks)
  and flashes; the shot is spent.
- **Rocks pass over each other** rather than collide, so a player can read
  where each will go, and the field never clumps.
- **Rocks are placed fairly.** A wave's rocks start at least 12 units from
  the ship, measured across the wrap, each on a course that doesn't come
  within 5 units of it in its first 3 s.

Seven kinds to start, each told apart by its shape and marks as well as its
color, since color is never the only signal:

| Kind      | Hits (L/M/S) | Splits into                              | Speed | Points (L/M/S) | From wave | What it does                                                                              | How it looks                                          |
| --------- | ------------ | ---------------------------------------- | ----- | -------------- | --------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Stone     | 1/1/1        | 2 of the next size                       | 1     | 10/20/40       | 1         | Breaks                                                                                    | Rounded, its ink, two or three craters                |
| Ice       | 1/1/1        | 3 of the next size                       | 1.25  | 15/30/50       | 4         | Shatters into more, faster pieces                                                         | Angular, pale, with facet lines                       |
| Crystal   | 1/1/–        | 2 stone of the next size                 | 1     | 20/40          | 2         | Always lets a pickup go                                                                   | A stone with a gem set in it                          |
| Iron      | 3/2/1        | 2 iron of the next size                  | 0.75  | 30/60/90       | 11        | Takes several hits at each size; a shot that doesn't break it rings off                   | Smooth, slate, four rivets, a dent for each hit taken |
| Volatile  | 1/1/–        | nothing                                  | 0.9   | 40/60          | 12        | Blasts: every rock within 6 units (4 for a medium) takes a hit, which can set off another | Round, a glowing core with three cracks               |
| Lodestone | 2/1/1        | 2 lodestones of the next size            | 1     | 25/50/80       | 21        | Drifts toward the ship, a little each second, never past its size's speed                 | Garnet, crossed by two bands                          |
| Boulder   | 6            | 3 large rocks of the kind its wave names | 0.6   | 200            | 10        | Ends each sector                                                                          | Twice a large rock, its ink deeper, five craters      |

A volatile rock's blast never hurts the ship. Blasts set each other off a
beat apart (90 ms), so a chain reads as a chain.

#### The gold nugget and the comet

- **The gold nugget** comes from wave 3, as many times a wave as the wave
  says (once by default), 20 s into it if the wave is still on: it comes in
  at an edge, crosses the field once on a gentle curve at 9 units a second,
  and leaves. One hit breaks it, for 500 points, times the chain. A wave
  never needs it.
- **The comet** comes from wave 13, as often as its wave says: a chevron in
  the danger color pulses at the edge it will come in by for 1.5 s, then it
  crosses the field in a straight line at 26 units a second and leaves. It
  can't be broken, it breaks any rock it touches one size down, for no
  points, and it takes the ship unless the ship is dashing or shielded.
  Relaxed sends half as many.

#### Pickups

A broken rock lets a pickup go by the sector's chance (0.04, 0.05, 0.06;
a quarter more at Relaxed), while fewer than two are on the field; a crystal
always does, and so does the next large rock broken once 25 s of a wave have
gone by without one. Which pickup is drawn by weight from the wave's pool,
from the run's seed, the wave and its count of draws, so a wave played the
same way lets the same pickups go.

A pickup drifts at 2 units a second, wraps, lasts 8 s, blinking the last 2,
and is drawn in to the ship once within 3 units of it. The ship catches it
by touching it.

| Pickup     | Symbol                  | Group   | What it does                                                                             | Lasts                        | Weight | From wave |
| ---------- | ----------------------- | ------- | ---------------------------------------------------------------------------------------- | ---------------------------- | ------ | --------- |
| Spread     | three rays              | weapon  | Three shots at each pull, 12° apart                                                      | 12 s                         | 10     | 2         |
| Rapid      | two chevrons            | weapon  | A shot each 0.07 s, 10 in flight                                                         | 12 s                         | 9      | 2         |
| Shield     | a ring                  | guard   | The next rock or comet to touch the ship breaks a size down instead, and the shield goes | until used, or the wave ends | 7      | 2         |
| Extra ship | the pod                 | at once | One more ship, up to six                                                                 | at once                      | 1      | 5         |
| Lance      | an arrow through a ring | weapon  | A shot passes through what it breaks, up to three rocks                                  | 10 s                         | 6      | 6         |
| Magnet     | a horseshoe             | pull    | Draws pickups and the gold nugget in from 14 units                                       | 15 s                         | 5      | 6         |
| Slow       | an hourglass            | pace    | Rocks and comets move at half their speed                                                | 8 s                          | 5      | 8         |
| Nova       | a starburst             | at once | A ring sweeps 12 units out from the ship; each rock it reaches takes a hit               | at once                      | 4      | 9         |

- **No pickup is bad,** so nothing has to be dodged that looks like a
  reward; a pickup is the accent, rounded, with its symbol, so it reads
  apart from every rock.
- **One of each group at a time.** Spread, Rapid and Lance are the weapon,
  and the latest caught replaces the one before; the same again starts its
  time over.
- **Every effect ends with its wave and when a ship is lost,** with the
  pickups on the field.
- **What is in effect shows on the field,** at its bottom left: a tag for
  each, its symbol over a ring that empties as its time runs out, as Brick
  Breaker's tags do.

#### Scoring

- **A rock scores by its kind and size** (the table above), times the
  chain's multiplier. The comet's breaks score nothing.
- **A chain scores more.** Each break within 1.5 s of the last counts on;
  from the fifth a break scores double, from the tenth triple, and from the
  twentieth four times. A pause of 1.5 s, or a lost ship, starts the count
  again. Blasts count. The bar shows the multiplier while it is above one,
  on a screen with room, and each break's points rise from it, "+40 ×2".
- **A cleared wave adds 500,** and 500 more if no ship was lost on it.
- **Points bring ships:** one at 10,000 and every 20,000 after, up to six.
- **A run's score** is everything from the wave it started on to its end.
  Bests are kept for each speed, for runs and for the furthest wave.

#### Waves

Thirty waves in three sectors of ten. Each sector brings a few new things,
each first alone, in a wave built around it, before it joins the others.
Within a sector the pace rises a little each wave, and the last wave has a
boulder, as the sector's test. A wave is cleared when every rock in it is
broken; the gold nugget and the comets never count.

**Sector 1, Inner belt** (pace 1.00 to 1.08)

| #   | Name        | Rocks                                 | What it brings                              |
| --- | ----------- | ------------------------------------- | ------------------------------------------- |
| 1   | First light | 3 large stone                         | The flight and the split; no pickups        |
| 2   | Gem         | 3 large stone, 1 large crystal        | The first pickups: Spread, Rapid and Shield |
| 3   | Glint       | 4 large stone                         | The gold nugget                             |
| 4   | Thaw        | 2 large ice, 2 large stone            | Ice                                         |
| 5   | Hail        | 4 large ice                           | An extra ship can drop                      |
| 6   | Scatter     | 8 medium stone, 2 medium crystal      | Many small targets; Lance and Magnet        |
| 7   | Crossing    | 3 large stone, 2 large ice, in a wall | A wall that sweeps across                   |
| 8   | Frost       | 4 large ice, 1 large crystal          | Slow                                        |
| 9   | Crowd       | 6 large stone                         | Nova                                        |
| 10  | Boulder     | 1 boulder, 2 large stone              | The sector's test                           |

**Sector 2, Iron reach** (pace 1.08 to 1.16)

| #   | Name       | Rocks                                                 | What it brings        |
| --- | ---------- | ----------------------------------------------------- | --------------------- |
| 11  | Ore        | 2 large iron, 3 large stone                           | Iron                  |
| 12  | Powder     | 3 medium volatile in a cluster, 3 large stone         | Volatile rocks        |
| 13  | Streak     | 4 large stone; comets every 14–18 s                   | Comets                |
| 14  | Anvil      | 4 large iron, 1 large crystal                         | Iron, many hits       |
| 15  | Fuse       | a ring of 6 medium volatile, 2 large ice              | A ring that chains    |
| 16  | Shower     | 5 large ice; comets every 9–12 s                      | Comets through shards |
| 17  | Foundry    | 3 large iron, 3 medium volatile                       | Blasts to crack iron  |
| 18  | Rush       | 10 medium stone, ice and iron                         | Speed                 |
| 19  | Tinder     | 2 large volatile, 4 large stone; comets every 12–15 s | Everything so far     |
| 20  | Iron heart | 1 boulder of iron, 3 large iron                       | The sector's test     |

**Sector 3, Storm** (pace 1.16 to 1.25)

| #   | Name             | Rocks                                      | What it brings               |
| --- | ---------------- | ------------------------------------------ | ---------------------------- |
| 21  | Lodestar         | 3 large lodestone, 2 large stone           | Lodestones                   |
| 22  | Whiteout         | 6 large ice; comets every 10–13 s          | A crowd of shards            |
| 23  | Gauntlet         | 3 large iron, 3 large lodestone            | Tough rocks that come to you |
| 24  | Wildfire         | 4 large volatile, 3 large ice              | Chains through ice           |
| 25  | Swarm            | 16 small stone and ice                     | Fast and many                |
| 26  | Gold rush        | 5 large of four kinds; 3 gold nuggets      | Points for the brave         |
| 27  | Pull             | 4 large lodestone; comets every 8–11 s     | Pulled into the comets' path |
| 28  | Bulwark          | 5 large iron, 2 large crystal              | Iron, with help              |
| 29  | Tempest          | 8 large of every kind; comets every 9–12 s | Everything                   |
| 30  | Eye of the storm | 2 boulders, 4 large of every kind; comets  | The finale, at the top pace  |

#### Runs, sectors and records

- **A run** starts at the first wave of a sector the player has reached,
  with three ships and no score, and goes on through the waves in order
  until the ships run out or wave 30 is cleared.
- **Sectors open as they are reached,** at any speed: the first is open from
  the start, and each after it once a run has reached its first wave. The
  Sectors dialog lists them, with their bests.
- **New game** starts a run where the last run started; the Sectors dialog
  starts one at any open sector. Both ask first when a run is under way.
- **Records,** for each speed: the runs played, the best run's score and the
  furthest wave reached.

### Controls

| Action | Keys (by `event.code`)   | Mouse                             | Touch                           |
| ------ | ------------------------ | --------------------------------- | ------------------------------- |
| Turn   | ← → or A D               | the ship turns toward the pointer | the stick: where it points      |
| Thrust | ↑ or W                   | the right button, held            | the stick, pushed past half way |
| Fire   | Space, held              | the left button, held             | Fire, held                      |
| Dash   | Shift, ↓ or S            | —                                 | Dash                            |
| Pause  | P or Escape              | Pause in the bar                  | Pause in the bar                |
| Go on  | Enter, or any flight key | the card's button                 | the card's button, or the stick |

- **Keys go by place,** as Snake's and Brick Breaker's do, so an AZERTY
  keyboard flies with Z, Q and D.
- **The mouse takes over the heading only once it moves** over the field,
  and gives it back as soon as a turn key is pressed, as Brick Breaker's
  paddle goes back and forth between the keys and the pointer. The board
  keeps the right button's menu from opening.

#### The deck

The deck shows on a touch screen (`GameViewportService.isTouchScreen`), or
as the settings say (Auto, Always, Never). It is part of the canvas, off the
field:

- **Upright,** it lies under the field, between it and the bar: the stick's
  zone is its left half, and Fire and Dash sit in the right half, toward the
  bottom where thumbs rest. It is at least 136 CSS px tall; the field gives
  up room to keep it so, which only small phones need.
- **On its side,** a deck lies on each side of the field: the stick's zone
  on the left, the buttons on the right, each at least 120 CSS px wide,
  inside the screen's safe areas and 16 px from its edges, so no thumb
  starts the browser's own swipe. The bar's rail stands beyond the right
  one, as on every game on its side.
- **"Stick on the right"** swaps the two halves or sides, for a left hand on
  the buttons.

The stick:

- **It appears where the thumb lands** anywhere in its zone, a base of
  48 CSS px radius and a knob of 20; at rest, a faint ring shows where it
  will sit, near the zone's lower corner.
- **Its rings say what it does.** Within 12% of its radius it does nothing,
  so a resting thumb doesn't steer. Past that it turns the ship toward where
  it points. Past half way it thrusts too, rising from nothing at the ring to
  full at the edge, remapped so it never jumps. The ring lights in the
  accent while it thrusts, and the edge at full push.
- **The knob stops at the edge, and the base follows** a thumb dragged past
  it, so the stick never runs out of reach.
- **One finger owns it** from press to lift, or until the browser cancels
  the touch, and another finger can't steal it; Fire and Dash take their
  own fingers.

Fire is 64 CSS px across and Dash 48, its recharge drawn as a ring around
it; each takes a press anywhere within 12 px of it. With "Fire by itself",
Fire is gone and Dash moves to its place.

### Look

The mock page draws all of this, in every palette.

- **The field is the palette's field** (`--fz-field`), framed in its line,
  with three dozen specks of the field's muted text at a third of its
  strength, seeded for each run and still. In a light palette it reads as a
  star chart on paper, in a dark one as night.
- **The rocks are flat shapes in the game's own inks,** seven for light
  palettes and seven for dark, in `src/view/inks.ts`, outlined in the
  field's color so overlapping rocks read apart, each with its kind's marks.
  A rock's outline is a rounded, uneven polygon from a seed, nine to twelve
  points from 0.78 to 1 of its radius (ice's are sharp-cornered); six
  outlines for each kind and size, baked once, and each rock turns slowly.
- **The ship is the accent,** its window the accent's text color; its
  flame is the warning color, as long as the thrust is strong, flickering
  where motion is welcome. A guarded ship blinks within a faint ring.
- **Shots are the field's text color,** the clearest thing on the field, a
  short capsule along their travel.
- **A pickup is the accent,** a rounded hexagon with its symbol in the
  accent's text color, breathing gently, blinking its last 2 s.
- **The comet is the danger color,** a head with a short tapering tail; its
  warning a chevron of the same at the edge.
- **The gold nugget** is the gold ink, with a four-pointed glint.
- **The deck** draws in the field's line and muted text, faint at rest: the
  stick's base and rings, the knob in the accent while held; Fire and Dash
  as rings with their symbols, filled in the accent while pressed.

### Flourishes

Only where motion is welcome (`GameViewportService.allowsMotion`); without
it, each thing simply goes, and points show where they were scored, without
rising.

| What           | Flourish                                                                                    |
| -------------- | ------------------------------------------------------------------------------------------- |
| A rock breaks  | 4 to 7 shards of its ink fly out and fade over 0.5 s; a puff of dust                        |
| A hit holds    | The rock flashes light for 60 ms, and a spark flies off                                     |
| A large break  | The field kicks 2 px away from the shot, settling in 0.1 s                                  |
| A blast        | A ring of the warning color sweeps out to its reach                                         |
| Points         | "+40 ×2" rises a unit and fades over 0.6 s                                                  |
| Thrust         | Exhaust specks from the tail, as many as the thrust is strong                               |
| A dash         | Three fading outlines of the ship along its path                                            |
| A lost ship    | A burst of shards and a ring; the field shakes 6 px, decaying in 0.3 s, after a 80 ms pause |
| A cleared wave | The last rock's shards linger, and the Cleared card waits 0.8 s                             |

### Sound

Synthesized with `@fz/dev/sounds`, into one sprite, as Brick Breaker's are:
a shot's soft tick; a large, medium and small break, from a low thump to a
crack, rising with the chain by up to a fifth (Brick Breaker's
`detuneOf()`); iron's ring; a blast; a pickup caught; the dash's whoosh; the
comet's warning, two soft notes; a lost ship's fall; a cleared wave's chime;
an extra ship's chime. The thrust hums low while it is held, through the
lifted `SpritePlayer.hold()`. Each sound plays once a frame at most, at the
highest it was heard, as Brick Breaker's `FrameSounds` has it.

### Cards and dialogs

- **Ready,** whenever a wave waits for its first move: "Wave 4: Thaw", and
  how to start, by keys ("Arrows or W A D to fly, Space to fire") or by
  touch ("Steer with the left pad, fire with the right").
- **Paused,** with the score and Resume.
- **Wave cleared,** with how its points added up (rocks, the chains'
  extra, the wave's 500, the 500 for no ship lost) and "Move or fire for
  wave 5", which the stick, a flight key, Enter or the card's button does,
  so a thumb on the deck never has to reach the field.
- **Ended,** the result card, once the last ship's burst has faded: lost or
  won, the wave reached and at what speed, the score and the best, "New
  best" and the trophy when it set one; Try again from the sector the run
  started at; Choose a sector; Close.
- **Sectors,** **How to play** (the aim, the controls by keys, mouse and
  touch, every rock and pickup from the catalogs, each with its picture,
  taken from the scene's atlas) and **Settings** (the speed, when the deck
  shows, which side holds the stick, fire by itself, haptics, sound and the
  palette).

### What it keeps

Each entry versioned (`LocalStorageService.writeVersioned()`), its reader
dropping what it can't trust:

- `asteroid-breaker-settings`: the speed, when the deck shows, which side
  holds the stick, fire by itself, haptics and sound.
- `asteroid-breaker-stats`: for each speed, the runs, the best score and the
  furthest wave.
- `asteroid-breaker-progress`: the sectors reached.
- `asteroid-breaker-game`: the run under way (the wave, the score, the
  ships, the next ship's mark, the speed) and its field: each rock's kind,
  size, outline, place, speed, turn and hits left, the field's count of
  steps and draws, and the time the wave has run, for its nugget and
  comets. Written as a wave starts, as a ship is lost or waits, as the run
  pauses or goes on, and as the page goes away, never at a step.

### Accessibility

As the other games', by the `web-game-accessibility` skill: the board is an
application named for its wave ("Asteroid Breaker, wave 4: Thaw"),
described by its keys, the canvas in it hidden; the announcer says each
wave begun ("Wave 4, Thaw. 4 rocks."), a ship lost and how many are left, a
pickup caught, a wave cleared with the score, a pause, going on and the
end. Every overlay is an `<fz-dialog>`. A real-time shooter can't be played
by a screen reader, but nothing in its shell is out of a keyboard's reach.

## Growing it

As Brick Breaker's, every rock kind, weapon and pickup is an entry in a
catalog and every wave an entry in a data file, and the compiler and the
specs between them refuse one with a part missing.

### The catalogs

In `src/rules/catalog/`, each a readonly object written `as const
satisfies`, so its ids survive as a type:

```ts
/** Describes a kind of rock: its sizes, what breaking it takes and what it does. */
export interface RockKind {
  /** Names it in How to play, such as "Iron rock". */
  readonly name: string;
  /** Says what it does, in a sentence for How to play. */
  readonly about: string;
  /** The hits that break it at each size it comes in. */
  readonly hits: Readonly<Partial<Record<RockSize, number>>>;
  /** What it breaks into, by kind and count; none for a rock that breaks whole. */
  readonly splits: {
    readonly into: "self" | "stone" | "wave";
    readonly count: number;
  } | null;
  /** Its speed against its size's. */
  readonly speed: number;
  /** What it scores at each size. */
  readonly points: Readonly<Partial<Record<RockSize, number>>>;
  /** What it does beyond breaking. */
  readonly traits: readonly RockTrait[];
}

/** Names something a rock does beyond breaking, with its settings. */
export type RockTrait =
  | {
      readonly kind: "blasts";
      readonly reach: number;
      readonly delayMs: number;
    }
  | { readonly kind: "gives" }
  | { readonly kind: "drawn"; readonly pull: number }
  | { readonly kind: "rings" };
```

- **`ROCK_KINDS`** (`catalog/rocks.ts`), with `TRAIT_RULES` in
  `src/rules/rocks.ts`, its type mapped from the union, so a trait without
  its rule fails to compile: `hit`, `broken` and `step`, as Brick Breaker's
  `TRAIT_RULES` are.
- **`WEAPONS`** (`catalog/weapons.ts`): the plain gun and each weapon a
  pickup gives, by `count`, `spreadDeg`, `everyMs`, `inFlight` and `passes`,
  so a weapon is data, as Brick Breaker's ball kinds are.
- **`PICKUPS`** (`catalog/pickups.ts`): each its name, sentence, `weight`,
  the wave it is `from` and its `effect`, one of a union:
  `{ kind: "weapon", weapon, ms }`, `{ kind: "guard" }`,
  `{ kind: "pull", reach, ms }`, `{ kind: "pace", scale, ms }`,
  `{ kind: "nova", reach }`, `{ kind: "ship" }`; an effect's kind is its
  group. `EFFECT_RULES` says what each does as it starts and ends.
- **What each looks like is the view's,** in `src/view/art.ts` and
  `src/view/rock_art.ts`, keyed by the same ids and written `satisfies`, so a
  kind without its art fails to compile; How to play lists every entry with
  its picture.

### Waves as data

A sector is one JSON file in `src/rules/waves/` (`inner-belt.json`,
`iron-reach.json`, `storm.json`), imported statically, its id, name,
chance of a pickup and waves; `SECTORS` in `src/rules/waves.ts` lists them,
and `WAVES` numbers every wave from 1. A wave is:

```ts
/** Describes a wave as its sector's file holds it. */
export interface WaveData {
  /** Names it for good. */
  readonly id: string;
  /** Names it to the player. */
  readonly name: string;
  /** Its rocks, by kind, size and count. */
  readonly rocks: readonly {
    readonly kind: string;
    readonly size: string;
    readonly count: number;
  }[];
  /** How its rocks are laid out; scattered by default. */
  readonly formation?: "scatter" | "ring" | "wall" | "cluster";
  /** The rocks' speed against their own, 1 by default. */
  readonly pace?: number;
  /** The kind a boulder breaks into; stone by default. */
  readonly pieces?: string;
  /** The chance a broken rock lets a pickup go; else its sector's. */
  readonly drops?: number;
  /** The pickups that can come; else every one whose wave has come. */
  readonly pickups?: readonly string[];
  /** How many gold nuggets cross it; 1 from wave 3 by default. */
  readonly gold?: number;
  /** How often comets come, the seconds between them drawn from a range. */
  readonly comets?: { readonly every: readonly [number, number] };
}
```

`parseWave()` turns one into a `Wave`, or throws naming the wave and what
is wrong: an unknown kind, size or pickup, a size a kind doesn't come in, a
count that isn't whole, more rocks than the field's cap, a pace outside 0.8
to 1.4, a chance outside 0 to 1, a range that runs backward.

### The checks that keep it whole

| Check              | Where                          | What it holds                                                                                                                                          |
| ------------------ | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| The compiler       | everywhere                     | Every trait and effect has its rule, and every rock, weapon and pickup its art                                                                         |
| The catalog spec   | `src/rules/catalog.spec.ts`    | Every entry has a name and a sentence; every kind is used by a wave from its `from`; every pickup can come in a wave from its `from`; weights positive |
| The waves spec     | `src/rules/waves.spec.ts`      | Every wave parses; ids and names unique; the pace never falls within a sector; each sector ends with a boulder                                         |
| The placement spec | `src/rules/spawn.spec.ts`      | Over many seeds, every wave lays its rocks out fairly: 12 units off, no course within 5 units in 3 s                                                   |
| The autopilot spec | `src/rules/autopilot.spec.ts`  | Every wave, at every speed, from fixed seeds, is cleared by `src/testing/autopilot.ts` within four minutes of game time                                |
| The contrast spec  | `src/view/contrast.spec.ts`    | Every ink, the ship, shots, pickups, comet and nugget against the field in every palette; the marks against their rocks; the outline against every ink |
| The scene spec     | `src/scene/belt_scene.spec.ts` | Every kind in every state is drawn from a frame of the atlas, and an object across an edge is drawn on both sides                                      |

The autopilot flies as a fair player would: it turns toward the rock it can
hit soonest, leading it, fires when lined up, thrusts away from a rock
whose course comes within 4 units, dashes when one is about to hit, and
catches the pickups it has time for. It runs in Node, without Phaser.
`yarn report:waves` runs it over every wave at every speed from many seeds,
invulnerable and not, and prints how long each took and the ships each
cost, which is how the climb from wave to wave is tuned and checked.

### What adding each takes

- **A wave:** its block in a sector's file.
- **A rock kind with traits that exist:** its entry in `ROCK_KINDS`, its
  ink for light and dark palettes, its art and a wave that brings it in. A
  new trait: a member of `RockTrait` and its rule.
- **A weapon:** its entry in `WEAPONS`, its pickup in `PICKUPS` and its
  symbol.
- **A pickup with a new kind of effect:** a member of the effect union and
  its rule in `EFFECT_RULES`, which the compiler asks for.

An `asteroid-breaker-content` skill walks an agent through each, as
`brick-breaker-content` does.

## The lifted pieces

| Piece                       | From Brick Breaker                                                                     | To                      | What changes                                                                                                                                                                |
| --------------------------- | -------------------------------------------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A fixed-step clock          | `src/rules/stepper.ts`: `createClock()`, `advanceClock()`, `progressOf()`, `stepsIn()` | `@fz/core/clock`        | The step's length and the most steps a frame are its arguments; Brick Breaker passes 1/120 s and 12                                                                         |
| A ring of numbered events   | `src/rules/events.ts`: `EventLog`                                                      | `@fz/core/event_log`    | `EventLog<E>` takes its size and a blank record; `next()` hands back the next record, numbered, to fill in place, so nothing is made per step                               |
| A frame's sounds            | `src/view/effects.ts`: `FrameSounds`                                                   | `@fz/core/frame_sounds` | `FrameSounds<Name>` takes the sprite's names; Brick Breaker's `SOUNDS`                                                                                                      |
| Points grouped in thousands | `src/rules/describe.ts`: `formatPoints()`                                              | `@fz/core/format`       | Beside `count()`, unchanged                                                                                                                                                 |
| A sound held                | new                                                                                    | `@fz/phaser/sound`      | `SpritePlayer.hold(name, held)` loops a sound while held and stops it when let go, or when sound is turned off or the scene ends                                            |
| A deck beside a board       | new                                                                                    | `@fz/dev/layout`        | `PhaserBoard` takes an optional `deck`, the attribute its zones are given; the check holds each zone in the window, off the board, off the bar, and at least its least size |

Each moves now because two games need it, as `@fz/core`'s rule asks; the
last two are new, and each lies where the next action game will look for
it. The stick itself stays in Asteroid Breaker until a second game wants
one. Brick Breaker adopts the four it gives, its sounds the same bytes, its
autopilot's report the same numbers.

## The build

### Layers

As Brick Breaker's, four folders under `src/`, fenced by
`eslint.config.js`:

| Folder       | May import                                                                                                                 | May not import                                                      |
| ------------ | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `src/rules/` | `@fz/core`                                                                                                                 | Phaser, Angular, RxJS, any other `@fz/*`, the view, scene and shell |
| `src/view/`  | the rules, `@fz/core`, `@fz/phaser/color`, `@fz/phaser/insets`, `@fz/phaser/layout`                                        | Phaser, Angular, RxJS, the shell's libraries, the scene and shell   |
| `src/scene/` | Phaser, `@fz/phaser`'s entries but the canvas, the view and the rules                                                      | Angular, RxJS, the shell's libraries, the shell                     |
| `src/app/`   | Angular, every `@fz/*` library, the rules and the view; the scene and `@fz/phaser`'s host, scene helpers and sound by type | Phaser, and those by a value import                                 |

### The rules

- `tuning.ts` the numbers; `speed.ts` the three speeds; the clock from
  `@fz/core/clock`.
- `torus.ts`: the wrap, the shortest way from one place to another across
  it, the distance, and the copies an object near an edge needs drawn (one
  to four), which the view reads.
- `ship.ts`: the ship's flight from a frame's `Steer` (`turn` of −1 to 1, or
  a `heading` to turn toward; `thrust` 0 to 1; `fire`; `dash`), its guard,
  its dash and its recharge.
- `shots.ts`: shots fired by the weapon in hand (`WEAPONS`), moved, swept
  as segments against rocks' circles across the wrap, so none passes
  through a small rock in a step.
- `rocks.ts`: `Rock`, `hitRock()`, which a shot, a blast, a comet, the
  Nova and the Shield call, the split, the cap, and `TRAIT_RULES`.
- `pickups.ts`: drops by chance, crystal and drought, by weight from the
  wave's pool through `@fz/core/random`'s `drawAt()`, the pull to the ship,
  the catch, and `EFFECT_RULES`.
- `hazards.ts`: the gold nugget's and the comets' times, warnings and
  crossings.
- `spawn.ts`: the wave's rocks laid out by its formation, fairly, and the
  safest place for a new ship.
- `field.ts`: `Field`, a wave in play, stepped in place from records made
  once, as Brick Breaker's is: `createField()`, `steerField()`,
  `stepField()`, and the events it logs (`@fz/core/event_log`).
- `scoring.ts`, `run.ts`, `describe.ts`, `progress.ts`, `stats.ts` and
  `saved_game.ts`, as Brick Breaker's are, for waves, sectors and ships.

### The physics

Every object is a circle on the torus. Each step, at 1/120 s: the ship
flies; every rock and pickup moves and wraps; each shot is swept from its
last place to its next against every rock (the shortest way across the
wrap), and the first it meets takes the hit; the ship is tested against
every rock, comet and pickup; blasts due go off. With 48 rocks, 30 shots
and a comet that is under two thousand circle tests a step, which needs no
spatial index; Q2 times it in Node.

### The view

- `field_metrics.ts`: where the field and the deck lie on the canvas, from
  `@fz/phaser/layout`'s `fitCells()` with one cell across and down, inside
  the insets the deck leaves (`deckLayout()`: upright, the room under the
  largest square that leaves 136 CSS px; on its side, the room either side
  of one that leaves 120), with `toCanvas()` and `toField()` between the two.
- `steering.ts`: `Steering`, which turns held keys, the mouse and fingers
  into each frame's `Steer`: the keys as a turn and a push, the pointer as a
  heading, the stick (`stick.ts`, its rings, its remapping, its following
  base and its one finger) and the buttons (`deck.ts`) by which finger is
  where.
- `frame.ts`, `layers.ts`, `timing.ts`, `flourish.ts`, `effects.ts` (each
  event's sound and flourishes) and `tags.ts`, as Brick Breaker's are.
- `palette.ts` and `inks.ts`: the field's colors from the palette's roles,
  and the rocks' inks, seven for light palettes and seven for dark.
- `art.ts`, `rock_art.ts`, `symbols.ts` and `shapes.ts`: every frame of the
  atlas as plain drawing commands in device pixels: the ship, its flame and
  ring, shots, each rock kind in each size, outline and state, each pickup
  and its symbol, the comet, its warning, the nugget, the deck's parts and
  the flourishes' shards; and How to play's pictures.
- `wave_play.ts`: `WavePlay`, the wave in play that `GameService` makes and
  drives, as Brick Breaker's `LevelPlay` is.

### The scene

`BeltScene` is handed plain functions over the game, as `BricksScene` is:
each frame it hands the game the time and the steering, reads the frame and
has its painters draw, each in its layer: `FieldPainter` the specks and the
frame, `RockPainter`, `PickupPainter`, `HazardPainter` the comets, their
warnings and the nugget, `ShotPainter`, `ShipPainter`, `EffectsPainter` the
shards, rings, exhaust and shake, `PointsPainter` the rising points,
`TagPainter` the effects in play, and `DeckPainter` the stick and buttons.

- **Two cameras.** The field's camera has the field's rectangle as its
  viewport, so whatever lies past an edge is cut off there; the deck's
  camera draws the deck and ignores the field's objects.
- **An object across an edge is drawn on both sides,** up to four times at
  a corner, from pooled images, as `torus.ts` says, so a rock slides out of
  one edge as it slides in at the other.
- **One atlas,** baked with `@fz/phaser/scene`'s `bakeAtlas()` again on a
  new palette or unit, so the field draws from one texture; its frames fit
  in 2048 × 2048 at the largest unit, at six outlines a kind and size.
- **Flourishes from pools,** a particle emitter on the atlas for shards and
  exhaust, every image made as the scene is created; nothing is made per
  frame.
- **Three pointers** (`input.addPointer(2)`): the mouse, and two fingers.

### The shell

Laid out as Brick Breaker's, one folder per feature: `play/`
(`GameService`, `SavedGameService`), `board/` (the canvas, the placeholder
drawn in CSS, the focus ring, the cards, the deck's room in CSS for the
placeholder, the pointer hidden while a ship flies, haptics through
`navigator.vibrate` where it exists), `bar/` (the speed's badge, the
figures: the wave, the score, the ships as pods and the chain while it
counts; compact, the score and the ships alone), `sectors/`, `result/`,
`help/`, `settings/`, `stats/` and `styles/`. The board is an application;
`[fzPlayRoom]` pauses the wave when the player looks away or the phone
turns, as it does for Brick Breaker.

### Performance

Brick Breaker's bar holds: a frame's work under 4 ms at the median with the
CPU throttled six times, measured at the busiest moment (Tempest, 48 rocks,
Rapid with Spread, a blast chain); nothing allocated per step or frame
(`phaser-canvas-performance`); a check at 120 Hz this time, which Brick
Breaker never had. Phaser loads with `import()` after the page paints.

### Testing

As Brick Breaker's: the rules and the view in Node, each spec beside its
file, a floor on both; fields from pictures in `src/testing/`
(`fieldFrom()`, a rock or ship placed and stepped); the stick and the deck's
layout by cases (every `@fz/dev/layout` shape gives a square field and a
deck of its least size); the autopilot and the placement over seeds; the
saved game's round trip; the contrast spec over every palette; the scene on
real Phaser through `runScene()`, the shell through
`provideFakePhaserCanvas()`; `yarn check:layout` at every shape and turned,
with the deck; `yarn capture:screenshots` for the site's images.

## Phases

### How the work runs

As Brick Breaker's did, and as the `commit-review-process` skill now says:
Part 1 on `asteroid-breaker-lift`, cut from `main`; Part 2 on
`asteroid-breaker`, cut from its tip. Each step a commit, each staged change
reviewed by a fresh agent before it is committed, every comment answered in
a work log (`docs/asteroid-breaker-worklog.md`), QA checkpoints logged.
Nothing is pushed, and nothing reaches `main`, without the user's go-ahead;
the lift merges first, on its own, since it changes a live game.

Sizes are rough: small is an hour or two, medium half a day, large a day or
more.

### Part 1: the lift

- **L1** `@fz/core/clock`, `@fz/core/event_log`, `@fz/core/frame_sounds`
  and `formatPoints()` in `@fz/core/format`, each specced to 100%, and Brick
  Breaker adopting each (medium; four commits).
- **L2** `SpritePlayer.hold()`, specced on `runScene()` (small).
- **L3** `@fz/dev/layout`'s deck (small).
- **L4** the docs: `@fz/core`'s, `@fz/phaser`'s and `@fz/dev`'s `AGENTS.md`,
  Brick Breaker's, the `phaser-core` and `fuzzley-ui` skills (small).
- **Q1** Brick Breaker unchanged: `yarn verify`, its `check:layout`, its
  sounds the same bytes, `yarn report:levels` the same numbers, a level
  played by keys, mouse and touch.

### Part 2: the game

- **A1** The workspace, from Brick Breaker's (port 9005; small).
- **A2** The torus and the flight: `tuning.ts`, `speed.ts`, `torus.ts`,
  `ship.ts`, `shots.ts` (large).
- **A3** Rocks: the catalog, splits, the cap, hits, blasts and the
  lodestone's pull (large).
- **A4** Pickups, effects, the nugget and the comet, scoring and the event
  log (large).
- **A5** Waves as data, the first five waves, the placement, the run, and the
  field whole (`field.ts`; medium).
- **A6** The autopilot and `yarn report:waves`; then **Q2**: the five waves
  over many seeds at every speed, a thousand seeded random flights checked
  for a ship, shot or rock off the torus, the physics' cost at the cap
  timed in Node.
- **A7** The view: the field's and the deck's layout, the stick and the
  steering, the palette and inks, the art and the atlas's frames (large).
- **A8** The scene: the painters, the cameras, the copies across edges, the
  pools and flourishes (large).
- **A9** Play and the board: `GameService`, `WavePlay`, the board with its
  cards and the deck's room, and a development build's tuning drawer
  (large). Then **Q3, the feel gate:** the five waves played by keys, mouse,
  and on real phones upright and on their side, Android's Chrome and, if
  one is to hand, an iPhone's Safari; the numbers in `tuning.ts` and the
  stick's tuned by the user's play; screenshots sent as they are taken. The
  other waves aren't built until the user says the feel is right.
- **A10** The bar, the icon, the Sectors, Result, How to play and
  Settings dialogs (medium).
- **A11** Sound, haptics (small).
- **A12** Storage: settings, stats, progress, the saved game (medium).
- **A13** The other twenty-five waves, tuned by `yarn report:waves` and by
  play (large); then **Q4**, the whole shell, every dialog by keyboard and
  by mouse, records and a saved game across a reload, a light palette and a
  dark.
- **A14** The checks: `check:layout` with the deck at every shape and
  turned, the accessibility tree, Lighthouse, a performance trace at ×6 and
  at 120 Hz, the bundle's size (medium); **Q5**.
- **A15** Screenshots, the `AGENTS.md`, the `asteroid-breaker-testing` and
  `asteroid-breaker-content` skills, `node .agents/link-claude-skills.mjs`
  (medium).
- **A16** Ship: `games.json`, the site's catalog entry
  (`category: "arcade"`, its blurb "Fly, drift and blast every rock to
  rubble before one finds you."), the image built and played at
  `/play/asteroid-breaker/` with the console open, no "Refused to load";
  **Q6**; then the user's go-ahead to merge and push (small).

## Risks

- **Touch feel is the game, and only a person on a phone can judge it.**
  The earlier games never had a real-device pass; this one has its gate at
  Q3, before most of the content exists.
- **A small phone on its side is tight:** at 568 × 320 the field is about
  264 CSS px across between two decks of 120. The layout check holds its
  unit to 6 CSS px; if it plays badly there, the decks shrink first.
- **iPhone Safari's edge swipe** goes back a page and can't be fully
  stopped; the decks keep 16 px off the edges and inside the safe areas.
- **Thumbs near the bar.** Upright, the bar sits under the deck; a thumb
  that slides can press Pause. The deck keeps a gap above the bar, and the
  bar's buttons need a deliberate tap.
- **Many objects drawn up to four times** at the edges; the pools and the
  one atlas keep it to one texture, and the trace at Tempest proves it.
- **Light palettes:** space on white is unusual. The mock shows it; if the
  user prefers night everywhere, decision 17's alternative is one switch in
  `palette.ts`.
- **Shots added to the ship's speed** can feel odd to a newcomer flying
  backward. It is the genre's, and the sketch lets it be tried.

## Not in this plan

- A gamepad (decision 24), and full screen on phones that allow it.
- Enemy ships, an endless mode after wave 30, a Custom speed, ships to
  choose between, co-op, online leaderboards, tilt.
- Moving the stick into a library, until a second game wants one.
