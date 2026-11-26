# Design: Fuzz Flux, a match-three of fuzzballs

Written 2026-11-25, for the user's ask: research and design a new Fuzzley
match-three game, with mocks and sound effects, a look and a way of moving
that suit the fuzzball, and at least 30 levels whose mechanics arrive one at
a time and grow harder. In the user's words, "match three games are all about
game feels which comes primarily from visual and animation cohesion, pop", and
players "need to feel like actions are rewarding with high fidelity
animations, especially when they match and especially even more when they
match more than 3". No code was to be read and no art or sound copied.

A second ask came the same day: rethink the look of the bricks, which was
"too simple" and did not "match the rest of fuzz ball style well", and show
the hits a brick has left by something more natural than dots, "like layers
and effects for each break needed". Decision 16 and "A brick, close up" answer
it.

This is a design, not a build plan. Nothing here says in what order to build
the game. The user named it "Fuzz Flux" on 2026-11-26. Until then its working
title was "Fuzz Trio", and before that "Fuzz Bunch".

No source code was read for this design: not the site's, not another game's.
What it knows of the house comes from the documents under `docs/`, the skills'
prose and the house's own pictures. Every picture, shape and sound in this
folder was drawn or synthesized here, from nothing.

Everything made for the design is in this folder, `docs/fuzz-flux/`:

- **`design.md`,** this file.
- **[`research/`](research/),** the reading, six files of notes with their
  sources: [`swap-matchers.md`](research/swap-matchers.md) (rules of the
  genre), [`game-feel.md`](research/game-feel.md),
  [`sound.md`](research/sound.md),
  [`levels-and-blockers.md`](research/levels-and-blockers.md),
  [`creature-pieces-and-names.md`](research/creature-pieces-and-names.md)
  (living pieces, the nearest precedent, and the name check) and
  [`input-and-accessibility.md`](research/input-and-accessibility.md). "What
  other games teach" says what the design took from them.
- **[`art/`](art/),** the look. [`fuzz.mjs`](art/fuzz.mjs) holds every shape
  as path data in two palettes, and [`make-art.mjs`](art/make-art.mjs) draws
  six sheets from it: [`kinds.webp`](art/kinds.webp),
  [`specials.webp`](art/specials.webp), [`elements.webp`](art/elements.webp),
  [`bricks.webp`](art/bricks.webp),
  [`brick-options.webp`](art/brick-options.webp) and
  [`sight.webp`](art/sight.webp). [`brick-options.mjs`](art/brick-options.mjs)
  keeps the looks a brick was chosen over. [`svg/`](art/svg/) has each piece
  as a file of its own.
- **[`sound/`](sound/),** the sound effects, all synthesized.
  [`synth.mjs`](sound/synth.mjs) is the instrument,
  [`sounds.mjs`](sound/sounds.mjs) the 46 recipes, and
  [`make-sounds.mjs`](sound/make-sounds.mjs) renders them into
  [`sprite.m4a`](sound/sprite.m4a) with [`sprite.json`](sound/sprite.json),
  ten [`reels/`](sound/reels/) that play moments of a game,
  [`measures.md`](sound/measures.md) and a picture of every sound,
  [`sheet.webp`](sound/sheet.webp).
- **[`levels/`](levels/),** the 36 draft levels. [`drafts.mjs`](levels/drafts.mjs)
  holds them as pictures, [`build.mjs`](levels/build.mjs) writes a JSON file a
  set with the tuned moves, deals and stars, and
  [`table.mjs`](levels/table.mjs) prints the appendix's tables.
- **[`sketch/`](sketch/),** the rules, played. [`engine.mjs`](sketch/engine.mjs)
  is the whole rule set as plain functions, [`bots.mjs`](sketch/bots.mjs) three
  players, and [`report.mjs`](sketch/report.mjs) plays every level and writes
  [`results-table.md`](sketch/results-table.md),
  [`results.json`](sketch/results.json) and
  [`certificates.json`](sketch/certificates.json).
  [`feel/`](sketch/feel/) is a playable sketch of the feel on the same rules.
- **[`mocks/`](mocks/),** what it looks like in motion.
  [`feel.html`](mocks/feel.html) is the feel sketch as one page that plays
  from a file, with sound. [`make-mocks.mjs`](mocks/make-mocks.mjs) plays it
  in a headless Chrome to make 21 [`storyboards/`](mocks/storyboards/), 9
  [`clips/`](mocks/clips/) with sound, a sheet a set of every level as it opens
  ([`levels/`](mocks/levels/)) and the [`screens/`](mocks/screens/).
  [`scenes.mjs`](mocks/scenes.mjs) lists the moments shown.

Every script here regenerates its files from scratch, with Node and nothing
installed beyond `frontend/`'s `sharp`, and for the mocks a Chrome and
`ffmpeg`.

## What was asked, and where it is answered

| Asked                                                                                                | Answered in                                                                                                                                                                                                               |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Thorough research on similar games                                                                   | [`research/`](research/), and "What other games teach"                                                                                                                                                                    |
| A detailed design                                                                                    | "Decisions" and "Design reference"                                                                                                                                                                                        |
| Mocks                                                                                                | [`mocks/`](mocks/): a playable page, 21 storyboards, 9 clips, 36 levels, 6 screens                                                                                                                                        |
| Sound effects                                                                                        | [`sound/`](sound/), and "Sound"                                                                                                                                                                                           |
| A consistent look and animation style that suits the fuzzball                                        | "Look", "The feel, in numbers" and "Effects", with [`art/`](art/)                                                                                                                                                         |
| At least 30 levels, mechanics introduced gradually, harder later                                     | 36 levels in 4 sets, "The levels" and the appendix, tuned and proven in "The sketch"                                                                                                                                      |
| Rewarding, high-fidelity animation, more so for more than 3                                          | "Effects": what a bunch of 3, 4, 5, an L, a square and each pair does, each with a storyboard                                                                                                                             |
| No code read, nothing copied                                                                         | The note above, and "Fuzzley flavor" on how it stays clear of the nearest game                                                                                                                                            |
| Design, mocks and assets under a new directory under the docs folder                                 | This folder                                                                                                                                                                                                               |
| Asked second: bricks that suit the fuzzball, with layers in place of dots and an effect for each hit | Decision 16 and "A brick, close up", with [`bricks.webp`](art/bricks.webp), [`brick-options.webp`](art/brick-options.webp) and the bricks' [storyboard](mocks/storyboards/bricks.webp) and [clip](mocks/clips/bricks.mp4) |

## The game in brief

A board of fuzzballs, 6 to 9 squares a side. You swap 2 neighbors, and if 3 or
more of a kind line up, they are a **bunch**. A bunch huddles, hops off the
board and leaves fluff behind. The fuzzballs above fall, new ones come in at
the top, and any new bunch goes too, each wave a note higher than the last.

Bigger bunches leave a **special fuzzball** behind, told by its fur. A line of
4 makes a **dasher**, which runs its row or column. An L or a T makes a
**puffer**, which blasts the squares around it. A square of 4 makes a
**wisp**, which floats to a square you still need. A line of 5 makes the
**frizzball**, which takes every fuzzball of one kind. Swap 2 specials
together and they do something bigger.

Each level has goals and a number of moves: gather so many of a kind, dust off
every dusty square, break every brick, free every caged fuzzball, or get every
sleepyhead down to the bottom row. Later sets add burrs that spread and a wind
that changes which way everything falls. There is no timer, no lives and
nothing to buy. If the moves run out, "Try again" deals the level afresh.

It is one game of 36 levels in 4 sets of 9, with 3 stars a level for moves to
spare.

## Choices put to the user

These are the ones the design could not settle for itself. Each has a
recommendation, and the design is written as if it were taken.

1. **The name: settled.** The user chose **Fuzz Flux** on 2026-11-26. Two
   general web searches that day found no game, app or mark by that name.
   The nearest names they found are Fox Flux Deluxe, a puzzle platformer,
   Fuzzy Flip, a matching game, and several games called Flux. No app store
   and no trademark register was searched by hand. The design began as "Fuzz
   Bunch", which as one word is a leaked NSA exploit framework (2017), and
   was "Fuzz Trio" in between.
   [`creature-pieces-and-names.md`](research/creature-pieces-and-names.md)
   has the other names that were checked. "Bunch" stays the game's word for
   a match.
2. **36 levels or 30.** The ask was "at least 30". The house's level games
   have sets of 9, so the design has 4 sets, 36 levels. Dropping the last set,
   the wind, leaves 27, under the ask.
3. **No score.** Stars come from moves to spare, and a level's best is its
   most moves to spare. The engine in the sketch keeps a score, and nothing
   shows it. A score could come back as a line on the cleared card.
4. **"Try again" deals afresh, "Restart" does not.** A level has 8 proven
   deals. This follows the house's own words for the two buttons. The other
   way is one fixed deal a level, which makes levels learnable by heart.
5. **Swap, never slide.** The nearest existing game to this one, Chuzzle,
   slides whole rows of furry creatures. Fuzz Flux swaps 2 neighbors, which is
   the genre's commonest input and keeps the two games apart. See "Fuzzley
   flavor".
6. **"Brick" or "cushion".** A brick is now drawn as a pile of felt cushions.
   The design still calls it a brick: that is the house's word, the goal
   reads "break every brick", and a set is named "Bricks and bars". The
   recommendation is to keep "brick". If it reads oddly beside the picture,
   "cushion" is the other word, and level 27 is already "Pillow fort".

## Decisions

1. **Fuzzballs are gathered, not broken.** Brick Fuzz Pop's plan says "the
   mark shouldn't be what the player breaks". Here the fuzzballs are the
   pieces, so a bunch hops off the board together, happy, and the ones a goal
   counts fly to the goal. Nothing in the game's words says "pop", "pop off",
   "explode" or "destroy" about a fuzzball.
2. **Six kinds, told by shape before color.** Blue and round, red and spiky,
   yellow with a top-knot, green and curly, purple with a fringe, pink with 2
   tufts. No 6 flat colors survive every kind of color blindness
   ([`input-and-accessibility.md`](research/input-and-accessibility.md)), so
   each kind has a silhouette of its own. [`sight.webp`](art/sight.webp) shows
   them as each kind of sight sees them, and in no color at all.
3. **5 kinds on a board is the rule, 6 is a difficulty, 4 is a party.** The
   sketch measured it: 4 kinds on an 8 by 8 board give 2.5 to 3.6 waves a
   move and gather 15 to 33 fuzzballs a move, which plays itself. Levels use 5. Levels 14 and 36 use 6. Level 6, where the pairs are taught, uses 4 on
   purpose.
4. **Four specials, each a fur.** A special keeps its kind's color, shape and
   face and wears a second fur behind it: streaks for a dasher, a ruff for a
   puffer, a seed-head on a stalk for a wisp. The frizzball has no color, its
   fur on end and static around it, which is the site's own look for a
   fuzzball fully charged. [`specials.webp`](art/specials.webp).
5. **A dasher runs the way it was made.** Made by a sideways swap, it runs
   its row. Made by an up-and-down swap, or by a fall, it runs its column. Its
   streaks point the way it will run, so the board says what will happen.
6. **Any swap of a special is a move.** A special goes off when it is swapped
   with any neighbor, when it is in a bunch, when a blast reaches it, or when
   you pick it up and put it down again. No special is ever stuck.
7. **The rules play a whole move at once and hand back a record.** The record
   lists each wave's bunches, blasts, hits and falls. The view plays the
   record. The same rules run the bots and the feel sketch, so what the bots
   prove is what the player gets. "The sketch".
8. **Every deal is proven.** Refills come from the deal's seed, a lane at a
   time, so a deal plays the same every time for the same moves. Each level
   ships 8 deals that a search has cleared within the level's moves, chosen
   from 40 as the ones a casual player clears nearest as often as the level
   asks. "Deals and the guarantee".
9. **Moves, not time. No lives, no boosters, no shop.** A level is lost only
   by running out of moves. The house's games have no economy, and this one
   needs none.
10. **A new thing arrives alone, on an easy board, and stays 3 levels or
    more.** One new idea a level, at most 4 kinds of thing on a board, and a
    harder level before each new arrival
    ([`levels-and-blockers.md`](research/levels-and-blockers.md)).
11. **The wind is gravity.** A level's wind says which way fuzzballs fall and
    where new ones come in. A turning wind turns a quarter every few moves.
    The rules do it by turning the board, so everything else is unchanged.
12. **Sound is synthesized, soft and in one key.** Every sound is made by
    [`sounds.mjs`](sound/sounds.mjs) from sine tones, filtered noise and a
    small room. A move's waves climb C major pentatonic, C5 to A6, one step a
    wave. Nothing is sampled, and nothing is a voice.
13. **No words of praise fly across the board.** A voice that calls out
    praise is the signature of other games, and a line heard 100 times wears
    thin. The fuzzballs cheer instead: at a move's 3rd, 5th, 7th and 9th
    wave every fuzzball left on the board hops, with a chirp. A small "×3"
    by the bunch counts the wave.
14. **Stars are moves to spare.** 1 star for clearing, and 2 and 3 at
    thresholds the sketch sets a level from how its careful player did.
15. **The last flourish can be hurried.** When a level is cleared, each
    spare move turns a fuzzball into a special and sets it off, at most 12. A
    tap plays the rest at 4 times the speed.
16. **A brick is a pile of felt cushions, a cushion a hit.** The first brick
    was a sand tile with a die's pips, the one hard thing in a soft world,
    and it counted hits with a number. Now the pile is the count: each hit
    knocks the top cushion off, and the ones left plump up to fill the
    square. Six looks were drawn before this one was chosen, and
    [`brick-options.webp`](art/brick-options.webp) has them side by side. "A
    brick, close up" says why this one.

## Design reference

### The board

- A grid of squares, 6 by 6 at the smallest and 8 by 9 at the largest. 8
  columns is the most: on a phone 320 px wide that leaves a square 40 px, the
  smallest at which the kinds and the specials' furs still read
  ([`kinds.webp`](art/kinds.webp) and [`specials.webp`](art/specials.webp)
  show both at 40 px).
- A board can have gaps where there is no square. Fuzzballs fall past a gap.
- Fuzzballs fall straight down their column. Where a brick or a caged
  fuzzball holds a square up, the fuzzball diagonally above an empty square
  rolls into it. New fuzzballs come in at the top of each column.
- If no swap would make a bunch and no special is on the board, the plain
  fuzzballs trade places until there is a move.

### Bunches

A bunch is 3 or more of a kind in a row or a column, or 4 in a square, and
any of those that touch count as one bunch.

| The bunch                         | What it leaves | Where                                                                                     |
| --------------------------------- | -------------- | ----------------------------------------------------------------------------------------- |
| 3 in a line                       | Nothing        |                                                                                           |
| 4 in a line                       | A dasher       | The square you swapped into. After a fall, the middle of a row or the bottom of a column. |
| 4 in a square                     | A wisp         | The square you swapped into                                                               |
| 5 or more with a corner (L, T, +) | A puffer       | The square you swapped into. After a fall, the corner.                                    |
| 5 or more in a line               | A frizzball    | The square you swapped into                                                               |

Where a bunch could make two things, the frizzball comes before the puffer,
the puffer before the dasher, and the dasher before the wisp.

### Special fuzzballs

| Special   | Looks like                             | Does                                                                                                            |
| --------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Dasher    | Streaks of fur along the way it runs   | Strikes every square of its row or its column, from itself outward                                              |
| Puffer    | A ruff all round                       | Strikes every square within 2 steps: 13 squares, in 2 rings                                                     |
| Wisp      | A seed-head on a stalk                 | Floats to the square that most helps a goal still open, and strikes it                                          |
| Frizzball | No color, fur on end, static around it | Swapped with a fuzzball, strikes every fuzzball of that kind. Set off another way, it takes the commonest kind. |

A wisp chooses in this order: a caged fuzzball, a brick, whatever holds a
sleepyhead up, a burr, a dusty square, a fuzzball of a kind a goal still
counts, then any fuzzball. Between equals it takes the farthest.

Two specials swapped together go off as one, where the first was carried to:

| Swapped together          | Does                                                                      | Storyboard                                                                    |
| ------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Dasher and dasher         | The row and the column                                                    | [`two-dashers`](mocks/storyboards/two-dashers.webp)                           |
| Dasher and puffer         | 3 rows and 3 columns                                                      | [`a-dasher-and-a-puffer`](mocks/storyboards/a-dasher-and-a-puffer.webp)       |
| Puffer and puffer         | Every square within 4 steps                                               | [`two-puffers`](mocks/storyboards/two-puffers.webp)                           |
| Wisp and wisp             | 3 wisps fly, each to a square of its own                                  | [`two-wisps`](mocks/storyboards/two-wisps.webp)                               |
| Wisp and dasher or puffer | The wisp carries the other to its square, where it goes off               |                                                                               |
| Frizzball and a special   | Every fuzzball of the special's kind becomes that special, and all go off | [`a-frizzball-and-a-dasher`](mocks/storyboards/a-frizzball-and-a-dasher.webp) |
| Frizzball and frizzball   | Every square of the board                                                 | [`two-frizzballs`](mocks/storyboards/two-frizzballs.webp)                     |

### What else is on a board

[`elements.webp`](art/elements.webp) has each of these in both palettes.

| Thing        | First level | Rule                                                                                                                                                                            |
| ------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gap          | 7           | No square. Fuzzballs fall past it.                                                                                                                                              |
| Dust         | 8           | 1 or 2 layers on a square. A layer comes off when the fuzzball on the square is gathered.                                                                                       |
| Brick        | 10          | A pile of 1 to 4 felt cushions, a cushion a hit. A bunch beside it is a hit, and so is a blast. It never moves, and fuzzballs roll in under it.                                 |
| Cage         | 13          | A caged fuzzball can't be swapped and doesn't fall. A bunch that includes it frees it. A blast opens the cage and leaves the fuzzball.                                          |
| Sleepyhead   | 19          | A pale fuzzball in a nightcap. It can't be swapped or bunched. It falls like any other, and leaves when it reaches the lowest square of its column.                             |
| Burr         | 22          | A fuzzball with a burr can't be swapped. A bunch it is in, a bunch beside it or a blast brushes the burr off. After a move that brushed none off, 1 burr spreads to a neighbor. |
| Wind         | 28          | Says which way everything falls and where new fuzzballs come in.                                                                                                                |
| Turning wind | 30          | The wind turns a quarter counterclockwise every 2, 3 or 4 moves: down, right, up, left. The bar counts the moves down.                                                          |

A caged fuzzball looks out sleepily and a burred one looks cross. Neither is
hurt. A sleepyhead never wakes: it is carried to bed.

### A brick, close up

[`bricks.webp`](art/bricks.webp) has a brick at every count of layers, in
both palettes and at a phone's size. Its
[storyboard](mocks/storyboards/bricks.webp) and
[clip](mocks/clips/bricks.mp4) show bricks of 4, 3, 2 and 1 layers each
taking a hit, twice over.

A brick is a soft one: a pile of felt cushions, one for each hit it has left.
Each cushion is plump, darker underneath, tufted with a button, and its
corners pinch out into small ears. The pile always fills its square, so the
cushions share the room. 4 of them are thin, 2 are fat, and the last is one
big cushion. That gives 3 signs of the hits left, and none is a number:

- **How many cushions are in the pile.** Each is a band the width of the
  square, so the count reads at a phone's size. In a square 40 px wide, a
  cushion in a pile of 4 is 8 px tall.
- **How thin they are.**
- **The color on top.** The bottom cushion is the palest and each one above
  it is a shade darker, so a darker top means a thicker brick. The 4 shades
  run from oat to a dark taupe, which no fuzzball wears. They are steps of
  lightness, so they hold for every kind of sight.

A cushion keeps its color for as long as it is in the pile. A brick of 4
that has taken 2 hits looks exactly like a brick of 2.

The rules and the art take a brick of up to 4 layers. The 36 draft levels use
1, 2 and 3, and the storyboard's board was made to show 4.

What a hit plays, from the moment it lands:

| When        | A layer knocked off                                                                                                                                      | The last layer                                                                           |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 0 ms        | The pile ducks: it squashes to 84% of its height onto the floor of its square, and spreads a little. A soft thump.                                       | The cushion swells to 114% over 70 ms. A soft thump.                                     |
| 0 to 480 ms | The top cushion is knocked up and off to one side, turning. Out from under the weight it plumps up, by up to 1.7 times. 6 tufts of its own color follow. | At 70 ms it bursts: 21 tufts, a thin ring, and its button flies up and falls.            |
| 0 to 440 ms | The cushions left spring up to share the square again, overshoot and settle.                                                                             | The square is empty when the fall begins, and fuzzballs roll in.                         |
| The sound   | `knock-3`, `knock-2` or `knock-1`, by the layers left: the thump, the cloth leaving, and a note that swoops up as the pile springs.                      | `break`: the thump, a puff of air, a soft note and a few bright specks, in a small room. |

- **A thick brick comes apart in tune.** The springing note is C4 with 3
  layers left, D4 with 2 and E4 with 1, and the burst is G4. Those are the
  first 4 steps of the ladder a move's waves climb, an octave lower, so a
  brick's notes sit under the bunches' and never clash with them.
  [`a-brick-of-4-layers.m4a`](sound/reels/a-brick-of-4-layers.m4a) plays the
  4 hits in a row.
- **Every hit counts once.** A bunch beside a brick is 1 hit and a blast
  that reaches it is 1 hit. 2 hits in a move knock 2 cushions off, one after
  the other.
- **With "Less motion" on,** the cushion fades where it lies in 260 ms, the
  pile takes its new shape in 180 ms with no spring, and a quarter of the
  fluff flies.
- **The goal's picture in the bar** is a brick of 1 layer.

The looks that were weighed, the first of them chosen:

| Look                    | What shows the hits left                    | What a hit does                                  | Why, or why not                                                                                                                        |
| ----------------------- | ------------------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Pile of cushions        | The count, their thinness, the color on top | The top one is knocked off and the rest plump up | Chosen. It reads at a phone's size, a hit changes the whole brick, it is soft, and it is seen from the front as the fuzzballs are.     |
| Stack of felt sheets    | Bands down its front, the color on top      | The top sheet peels away                         | A band is 3 px on a phone, so the color does the work alone. A hit changes little. In browns it looks like a layer cake.               |
| Pads, seen from above   | Rings, one inside another                   | The smallest pad lifts off                       | It reads as a target or a button, and the brick's edge never changes.                                                                  |
| Shaggy block            | Rows of fringe                              | A row is shorn                                   | It is the closest to a fuzzball's fur, and too close: fringe is the purple kind's mark. The rows blur into one coat at a phone's size. |
| Tied bale               | Cords, 1 fewer than the hits                | A cord snaps and the bale loosens                | Cords are counted, as pips were. 2 crossed cords read as a window.                                                                     |
| Ball of yarn            | Its size                                    | A length unwinds and the ball shrinks            | It is round like a fuzzball and looks as if it should roll. A size is hard to judge with no other ball beside it.                      |
| Tile with pips (before) | A die's pips                                | A pip goes, and chips fly                        | It reads as a die. It was the one hard thing on a soft board, and its chips were debris.                                               |

### Goals

A level has 1 to 3 goals, shown in the bar as a picture and a count. Gather
so many of a kind, dust off every dusty square, break every brick, free every
caged fuzzball, or get every sleepyhead to bed. The level is cleared when a
move ends with every count at 0, and lost when the moves run out first.

### Deals and the guarantee

A **deal** is a level's opening board and every fuzzball that will ever come
in, fixed by one number. New fuzzballs are drawn a column at a time from the
deal, so the same moves on the same deal always play out the same way, and a
bunch somewhere else on the board never changes what comes in here.

- Each level has 8 deals. "Restart" plays the same deal again. "Try again",
  "Play again" and coming back to a level play the next of the 8.
- **Every deal can be cleared in the level's moves.** A search that sees the
  refills, and keeps the 10 best boards a move, has found a line of play for
  each, and [`certificates.json`](sketch/certificates.json) keeps the line.
- **The 8 are chosen from 40** as the deals a casual player clears nearest as
  often as the level asks. This matters more than it sounds. On level 27, a
  casual player clears between 13% and 94% of games depending on the deal.
  On its 8 chosen deals the range is 50% to 56%. A published case found the
  same swing in a shipped game, 0.15 to 0.75
  ([`levels-and-blockers.md`](research/levels-and-blockers.md)).
- A deal's opening board never has a bunch standing on it and always has at
  least 2 moves.

### Controls

- **Swipe** from a fuzzball toward a neighbor. The swipe is read once it is
  0.4 of a square long, along its longer axis. A press that moves less than
  that is a tap.
- **Or tap, then tap.** Tap a fuzzball to pick it up, then a neighbor to swap.
  Tapping anything else puts it down. A swipe is never the only way
  (WCAG 2.5.1 and 2.5.7).
- **Tap a special you are holding** to set it off where it stands.
- **Keys:** the arrow keys move a ring over the board, Space or Enter picks
  up the fuzzball under it, an arrow key then swaps that way, and Space again
  on a special sets it off. Esc puts it down. H is Hint.
- **While a move plays, the board takes 1 swap and keeps it** for when the
  board comes to rest. A later swap takes the place of the one kept.
- **A swap that makes no bunch is refused,** and costs nothing: the 2 lean at
  each other, shake their heads and go back, in 240 ms.
- **Hint:** after 7 seconds with no move, the 2 fuzzballs of a good move hop
  twice. The Hint button does it at once. On a level that teaches something,
  a hand shows the first move instead.

### The feel, in numbers

These are the sketch's numbers, in ms. They are first guesses, set by reading
storyboards frame by frame. Nobody has yet felt them under a thumb ("Risks").

| Moment               | Time                                   | How it moves                                                                                              |
| -------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Pick up              | 120                                    | Grows to 1.14, with a little overshoot. Its would-be bunch-mates look at it.                              |
| Swap                 | 140                                    | Both slide, overshoot slightly and settle                                                                 |
| Refused swap         | 240                                    | 90 out to a third of the way, 150 back on a spring                                                        |
| Huddle               | 110                                    | A bunch's eyes go wide and it leans 0.07 of a square together                                             |
| Hop off              | 130                                    | Swells to 1.42, fur up, happy eyes. Fades from 30% of the way. 12 apart along the bunch.                  |
| Run into a special   | 110                                    | The rest of the bunch shrinks into the one that stays                                                     |
| A special is made    | 420                                    | From 1.5 down to 1 on a spring that rings twice. A white flash for 260. Its second fur grows in over 300. |
| Wait before the fall | 70                                     |                                                                                                           |
| Fall                 | 80 + 70 × D^0.7 for D squares          | Speeds up as it goes. Stretches 8% along the fall. 2 squares take 194, 6 take 325.                        |
| Columns and stacks   | 16 a column, 12 a fuzzball             | Columns start left to right, a stack bottom first                                                         |
| Landing              | 240                                    | Squashes 18% in 60, then springs back. It blinks.                                                         |
| Between waves        | 90                                     |                                                                                                           |
| Later waves          | 6% quicker a wave, to 70% at the least | A long move speeds up as it climbs                                                                        |
| Dasher               | 30 a square                            | 2 streaks leave it, and each fuzzball hops as a streak passes                                             |
| Puffer               | 140 in, then 45 a ring                 | Shrinks to 0.72 while its neighbors lean in 0.08, then lets go                                            |
| Wisp                 | 480                                    | A curved flight. 3 wisps leave 90 apart.                                                                  |
| Frizzball            | 40 a fuzzball, 700 at most, then 160   | Static leaps to each in turn. They stand frizzed. All hop at once.                                        |
| Two specials         | 300 before they go off                 | One runs into the other, a ring, and the pair swells to 1.3                                               |
| A brick's layer      | 480 for the cushion, 440 for the pile  | The pile ducks to 84%, the top cushion tumbles off, and the rest spring up to fill the square             |
| A brick's last layer | 70, then it bursts                     | It swells to 1.14 and bursts into fluff. Its button flies up and falls.                                   |
| To the goal          | 480, 35 apart                          | A small copy flies a curve to the goal's picture, which bumps as it lands                                 |
| A gust               | 520                                    | Lines of wind cross the board, and each fuzzball leans 0.16 and springs back                              |

Measured from the sketch's frames, at 30 a second: a bunch of 3 is back at
rest 900 ms after the tap, and a move of 5 waves takes 3.9 seconds.

Shake is small and rare, and a plain bunch has none. In px: 2.5 when a special
is made and 5 when it is a frizzball, 3 for a dasher going off, 6 for a puffer
or a frizzball, 4 for 2 dashers or a frizzball with another special, 7 for a
dasher with a puffer, and 10 for 2 puffers or 2 frizzballs. It
dies away by 14% a frame. No effect holds the frame still.

### Look

- **Flat color, soft shapes, no outlines, no gradients, no glow.** A
  fuzzball is a disc of its color, 58% of its square wide, with fur drawn as
  rounded strokes of the same color and 2 dark oval eyes with a glint. Glow
  washes out on a light theme, so nothing depends on it.
- **Two palettes,** the site's dark "Midnight blue" and light "Classic felt".
  Their colors were sampled from the house's pictures, not its code, so the
  build takes the real tokens. Every sheet in [`art/`](art/) shows both.
- **The 6 kinds** ([`kinds.webp`](art/kinds.webp)): blue and round, red and
  spiky, yellow with a top-knot, green and curly, purple with a fringe, pink
  with 2 tufts. The sheet has each at rest, blinking, looking, wide-eyed,
  happy, cross and with its fur on end, at 40 and 28 px, and as a shape with
  no color.
- **A special wears a second fur behind its own,** lighter than its color on
  the dark palette and darker on the light one, so it stands off both the
  fuzzball and the square. The fuzzball itself is drawn a little smaller to
  make room.
- **A square is a rounded well,** a shade off the page. Dust is a paler
  square with specks, thick dust paler still. A brick is a pile of felt
  cushions in shades of oat and taupe. A cage is 4 steel bars in a frame. A burr is a ring of thorns behind the
  fuzzball. A sleepyhead is gray-blue in a nightcap, eyes shut.
- **Eyes react to the game, never to the pointer.** They look at a fuzzball
  you pick up if they could bunch with it, toward a bunch-mate as they
  huddle, toward a frizzball as it is made, and down as they fall. They
  blink on landing and every 3 to 8 seconds.

Five rules give the motion one style, and every effect above follows them:

1. **Soft bodies.** Anything that lands squashes. Anything that falls
   stretches. Anything that arrives overshoots and settles.
2. **Fur follows.** Fur trails a moving body, leans with the wind and stands
   on end with static. Fur on end is the sign that something is about to
   happen to a fuzzball.
3. **Eyes first.** A fuzzball looks, then moves.
4. **Fluff, not debris.** A gathered fuzzball leaves a few tufts of its own
   color that slow quickly and drift down. A brick is soft too: its cushions
   tumble off whole, and the last one bursts into fluff. Only the cage is
   hard, and only its bars fly as hard bits.
5. **One kit of effects.** Fluff, a thin ring, a streak, a static bolt. Each
   special uses the kit its own way, so a new effect never looks like it came
   from another game.

### Effects

What a move does grows with what you made. Each row is a storyboard from the
sketch, and the ones with a clip have its sound too.

| You made              | What plays                                                                                                                                          | See                                                                                                          |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| A bunch of 3          | Huddle, 3 hops 12 apart, 1 note and 3 bubble sounds, 5 tufts each, a thin ring each, and a flight to the goal for the ones it counts                | [storyboard](mocks/storyboards/a-bunch-of-3.webp), [clip](mocks/clips/a-bunch-of-3.mp4)                      |
| A line of 4           | 3 run into the 4th. A flash, 2 rings, 14 tufts, a small shake. The dasher's streaks grow in. A 2-note chord and the dasher's own rising sound.      | [storyboard](mocks/storyboards/a-dasher.webp), [clip](mocks/clips/a-dasher.mp4)                              |
| A square              | The same, and the wisp's seed-head grows in, swaying                                                                                                | [storyboard](mocks/storyboards/a-wisp.webp)                                                                  |
| An L or a T           | 4 run into the corner. The puffer's ruff grows in and it breathes from then on.                                                                     | [storyboard](mocks/storyboards/a-puffer.webp), [clip](mocks/clips/a-puffer.mp4)                              |
| A line of 5           | The board dims. Everyone on it turns to look, wide-eyed. A bigger shake, a 3-note chord and a crackle.                                              | [storyboard](mocks/storyboards/a-frizzball.webp), [clip](mocks/clips/a-frizzball.mp4)                        |
| A dasher going off    | It splits into 2 streaks that run the line at 30 ms a square. Each fuzzball hops as a streak reaches it.                                            | Same as "A line of 4"                                                                                        |
| A puffer going off    | A breath in, a white flash 110 ms long, 2 rings, 26 tufts, and everything left nearby is pushed back and springs home                               | Same as "An L or a T"                                                                                        |
| A frizzball going off | The board dims. A bolt of static leaps to each fuzzball of the kind in turn, each a note higher. Their fur stands up. They all hop at once.         | Same as "A line of 5"                                                                                        |
| 2 specials together   | A 300 ms wind-up, then the pair's own effect, up to the whole board                                                                                 | [two puffers](mocks/clips/two-puffers.mp4), [frizzball and dasher](mocks/clips/a-frizzball-and-a-dasher.mp4) |
| A 2nd wave and after  | Each wave's note is a step higher and each wave is 6% quicker. A small "×2", "×3" counts by the bunch. At waves 3, 5, 7 and 9 the whole board hops. | [storyboard](mocks/storyboards/five-waves.webp), [clip](mocks/clips/five-waves.mp4)                          |
| A level cleared       | Everyone hops. Each spare move makes a special and sets it off. Then the card, with a star at a time.                                               | [storyboard](mocks/storyboards/a-level-cleared.webp), [clip](mocks/clips/a-level-cleared.mp4)                |

The rest of the board has storyboards too: [dust](mocks/storyboards/dust.webp),
[bricks](mocks/storyboards/bricks.webp) (with a
[clip](mocks/clips/bricks.mp4)), [a cage](mocks/storyboards/a-cage.webp),
[a sleepyhead](mocks/storyboards/a-sleepyhead.webp),
[a burr spreading](mocks/storyboards/a-burr-spreads.webp),
[a burr brushed off](mocks/storyboards/a-burr-comes-off.webp),
[the wind turning](mocks/storyboards/the-wind-turns.webp) and
[running out of moves](mocks/storyboards/out-of-moves.webp).

Limits keep the board readable. At most 420 loose bits are on screen. Past 14
flights to the goal, the rest are counted without a flight. Sounds of one kind
never start closer together than 10 to 60 ms, by the sound.

### Sound

All 46 sounds are synthesized by [`sounds.mjs`](sound/sounds.mjs), in plain
JavaScript that runs the same in Node and in a page. The sketch plays them
from the recipes, and the build would play
[`sprite.m4a`](sound/sprite.m4a) (27.0 seconds, 247 KB) by the offsets in
[`sprite.json`](sound/sprite.json). [`measures.md`](sound/measures.md) gives
each sound's length, level and where its energy sits, and
[`sheet.webp`](sound/sheet.webp) is a picture of them all.

- **One key, one ladder.** A bunch plays a soft bell note. A move's first
  wave is C5, and each wave after climbs one step of C major pentatonic: C5,
  D5, E5, G5, A5, C6, D6, E6, G6, A6. The ladder starts again with each move,
  so a long move is a rising tune and no two notes ever clash.
- **Size is a chord.** A bunch of 3 is one note. A bunch of 4 adds the note 2
  steps up. A bunch of 5 or more adds the note 4 steps up as well.
- **Each fuzzball is a bubble.** Under the note, each fuzzball that hops off
  makes a small rising "bip", 30 ms apart, so 5 sound like more than 3.
- **Each special has a voice of its own:** a rush of air for the dasher, a
  breath in and a soft thump for the puffer, a flutter for the wisp, a
  crackle and a run of rising ticks for the frizzball.
- **Made for a phone.** Soft attacks, nothing above 6 kHz, and the weight
  between 250 and 900 Hz, where a phone's speaker can play it. The loudest
  sounds are the rarest.
- **The fuzzballs chirp only at waves 3, 5, 7 and 9,** and never when poked.

| Sounds                                                  | When                                                                          |
| ------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `pick`, `swap`, `refuse`, `land`                        | Picking up, swapping, a swap refused, fuzzballs landing                       |
| `note`, `note-4`, `note-5`, `pop`                       | A bunch, by size, and each fuzzball leaving, on the wave's step               |
| `born-dasher`, `born-puffer`, `born-wisp`, `born-frizz` | A special is made                                                             |
| `dash`, `puff`, `wisp`, `zap`, `frizz`                  | A special goes off                                                            |
| `pair`, `big-puff`                                      | 2 specials wind up together, and 2 puffers go off                             |
| `knock-1` to `knock-3`, `break`, `cage`, `yip`, `dust`  | A brick losing a layer, its last one bursting, a cage opened, a square dusted |
| `burr-off`, `burr-spread`, `bed`, `gust`, `shuffle`     | Burrs, a sleepyhead reaching bed, the wind turning, no moves left             |
| `tick`, `goal`, `low`                                   | A fuzzball counted, a goal met, 5 moves left                                  |
| `chirp-1` to `chirp-4`                                  | The board cheering at waves 3, 5, 7 and 9                                     |
| `encore`, `win`, `star-1` to `star-3`, `lose`           | The end of a level                                                            |
| `hint`, `button`                                        | A hint, a button on a card                                                    |

Ten [`reels/`](sound/reels/) play whole moments without the game: a move of
5 waves, each special made and set off, 2 puffers, bricks with a cage and
dust, a brick of 4 layers taken apart, a level cleared, the ladder, and a loss with a sleepyhead and the
wind. There is no music in this design.

### Cards, the bar and the panels

- **The bar** has the level's number and name, the wind's arrow with "turns
  in 3" where it turns, each goal as a picture and a count, and the moves
  left. A goal met shows a check mark. At 5 moves the number turns to the
  warning color and a soft sound plays once.
  [`phone.webp`](mocks/screens/phone.webp),
  [`phone-light.webp`](mocks/screens/phone-light.webp).
- **Under the bar** a level that brings something new has one line about it,
  14 lines in all, such as "Line up 4 to make a dasher. It clears the row or
  column its fur points along." They are in the sketch.
- **A wide window** puts the bar in a panel to the left of the board and the
  buttons to the right. [`wide.webp`](mocks/screens/wide.webp).
- **Level cleared:** "Level 12 cleared!", 3 stars lit one at a time with a
  note each, "4 moves to spare.", then Next level and Play again.
  [`level-cleared.webp`](mocks/screens/level-cleared.webp).
- **Out of moves:** the headline, what each open goal still needs, then Try
  again and Choose a level. No fuzzball looks sad about it.
  [`out-of-moves.webp`](mocks/screens/out-of-moves.webp).
- **Choose a level** lists the 4 sets by name.
  [`choose-a-level.webp`](mocks/screens/choose-a-level.webp).

The sketch's own row of buttons (Sound, Fast, Less motion, Light) stands in
for the house's bar and settings, which the build would use instead.

### Accessibility

- **Shape, not color, tells the kinds apart,** and fur tells the specials.
  [`sight.webp`](art/sight.webp).
- **Every move can be made by a swipe, by 2 taps, or by keys.** Nothing is
  timed, anywhere.
- **A square is never under 40 px,** and a button never under 44.
- **Less motion** (and the system's own setting for it): no shake, no flash,
  a quarter of the fluff, no flights to the goal, no hop of the whole board,
  and no gust sway. Swaps, hops and falls stay, because they are the game.
- **No more than 3 flashes a second.** There are 2 kinds: a soft disc where a
  puffer or a frizzball goes off, 110 ms long, and a white glow on one
  fuzzball as it becomes a special, 260 ms at most. The sketch lets one of
  either kind start every 350 ms at most, and "Less motion" turns both off. The dimming under a frizzball is slow.
- **Sound is never the only sign** of anything, and nothing needs sound to
  play.
- **For a screen reader,** the board is a grid a ring moves over, each square
  read as its kind and what is on it ("red, caged", "blue dasher, across"),
  and each move is announced in the words on screen or fewer: "Bunch of 4,
  blue. Dasher made. 6 blue left." The build takes this from the house's
  own rules for a board played by keyboard, which the design did not read in
  code.
- Contrast was not measured here. The palettes are the house's, and the
  build's own contrast check would cover the new colors: the specials' second
  fur, dust, brick, burr and the sleepyhead.

### Fuzzley flavor

- **The fuzzball is the piece.** Brick Fuzz Pop, Rickashay and Asteroid
  Breaker have one fuzzball in play. Here there are 60 or so, in 6 kinds,
  which is the house mascot's first time as a crowd.
- **Static is the house's word for charge,** and the frizzball is a fuzzball
  fully charged: white, fur on end, sparks around it. Burrs are in Asteroid
  Breaker's words too.
- **The words:** fuzzball, bunch, dasher, puffer, wisp, frizzball, dust,
  brick, cage, burr, sleepyhead, wind, deal. Buttons are the house's: Hint,
  Restart, Try again, Play again, Next level, Choose a level.
- **Level names are small jokes,** as in the other games: "Three's company",
  "Jailbreak", "Nap in the thistles", "The big bunch".

**Keeping clear of Chuzzle.** PopCap's Chuzzle is a match-three of furry,
googly-eyed balls, a live brand, and Wikipedia calls its pieces "fuzzballs".
A game of matching fuzzballs will be compared with it, so the design keeps
away from everything that is Chuzzle's own
([`creature-pieces-and-names.md`](research/creature-pieces-and-names.md)):

| Chuzzle                                          | Fuzz Flux                                              |
| ------------------------------------------------ | ------------------------------------------------------ |
| Slides whole rows and columns                    | Swaps 2 neighbors                                      |
| Eyes follow the pointer, and roll to give a hint | Eyes react to the game only. A hint is 2 hops.         |
| Poke one and it sneezes, squeaks or giggles      | Nothing reacts to a poke, and there are no voices      |
| Eyes fly into a flask                            | A small copy of the fuzzball flies to its goal's count |
| A fat creature fills 2 by 2 squares              | A square of 4 makes a wisp, one square wide            |
| A rainbow piece                                  | The frizzball has no color at all                      |
| Padlocks                                         | Cages and burrs                                        |
| Pieces "pop" and "explode"                       | Fuzzballs are gathered and hop off                     |
| Sleeping pieces with Zs                          | A sleepyhead in a nightcap, with no Zs                 |

### The levels

4 sets of 9. Each set teaches its things one at a time, mixes them, and ends
on its hardest level. The appendix has every level, and
[`mocks/levels/`](mocks/levels/) shows each as it opens:
[Warm-up](mocks/levels/warm-up.webp),
[Bricks and bars](mocks/levels/bricks-and-bars.webp),
[Bedtime](mocks/levels/bedtime.webp) and
[Windy days](mocks/levels/windy-days.webp).

| Set             | Levels   | Brings                                     | A casual player clears |
| --------------- | -------- | ------------------------------------------ | ---------------------- |
| Warm-up         | 1 to 9   | The bunch, each special, pairs, gaps, dust | 99% down to 80%        |
| Bricks and bars | 10 to 18 | Bricks, thick bricks, cages, a 6th kind    | 92% down to 60%        |
| Bedtime         | 19 to 27 | Sleepyheads, burrs                         | 90% down to 55%        |
| Windy days      | 28 to 36 | Wind, a turning wind                       | 90% down to 50%        |

- Levels 1 to 5 each open with the new bunch one swap away and a hand
  showing it. Level 6 opens with 2 pairs of specials side by side.
- A new thing's first level has nothing else on the board, and each set's
  first level is easier than the last level of the set before.
- A level lasts 11 to 33 moves. No level has more than 4 kinds of thing on
  its board.
- The share a casual player clears is what the level's moves were set to
  give, not a measurement of people. "The sketch" and "Risks".

## The sketch

The rules were written before the design was, to find out what the game does.

- **[`engine.mjs`](sketch/engine.mjs)** is every rule above, in about 1,500
  lines with no dependency. A random player made 28,000 moves across boards
  with every element, and after each move the board was whole: no bunch left
  standing, a move to make, no fuzzball doubled or in a gap, and no square
  left empty that could be filled.
- **[`bots.mjs`](sketch/bots.mjs)** has 3 players. The **casual** one takes
  the best-looking move 65 times in 100 and a random one otherwise. The
  **careful** one tries every move and takes the best, guessing at what will
  fall in, since it can't see the deal. The **proof** is a search that does
  see the deal and keeps the 10 best boards a move.
- **[`report.mjs`](sketch/report.mjs)** plays each level on 40 deals, 16
  casual games and 1 careful game a deal, with moves to spare. It sets the
  level's moves to the fewest that let the casual player through as often as
  the level asks, and never fewer than the careful player needs 3 times in 4.
  Then it picks and proves the 8 deals. All 36 levels take 10 seconds.
  [`results-table.md`](sketch/results-table.md) is the whole table.

What it found:

| Finding                                                | Number                                                 |
| ------------------------------------------------------ | ------------------------------------------------------ |
| Waves a move, 5 kinds                                  | 1.7 to 3.0, by the board                               |
| Waves a move, 4 kinds with specials laid out (level 6) | 4.5                                                    |
| The careful player, who can't see the deal, clears     | 93% to 100% of levels 1 to 35, and 83% of level 36     |
| The casual player clears, on each level's 8 deals      | Within 4 points of what the level asks, on every level |
| One level across all 40 deals (level 27)               | 13% to 94%                                             |
| The same level on its 8 chosen deals                   | 50% to 56%                                             |
| Deals proven                                           | 8 of 8 on all 36 levels                                |

Two things the sketch changed in the design. Boards of 4 kinds were the first
draft, and they played themselves, so the rule became 5. And a sleepyhead
that rolled sideways could come to rest in a column with no way out, so the
lowest square of every column takes a sleepyhead.

**[The feel sketch](mocks/feel.html)** is the same rules with a view on top:
one page, about 230 KB, that plays from a file with touch, a mouse or keys
and makes its sounds as it goes. It has all 36 levels, both palettes, a
faster speed and "Less motion". It is a sketch of the feel and not the
game's code: it draws on a plain canvas, where the build would use the
house's own engine and shell. [`make-mocks.mjs`](mocks/make-mocks.mjs) drives
it a frame at a time to make the storyboards and clips, so those show exactly
what the page does.

## Risks

- **Nobody has played it.** The timings in "The feel, in numbers" were set by
  reading storyboards and frame counts. They have not been felt under a
  thumb, and feel is the point of the game. The first job of a build is to
  play the feel sketch on a phone and change the numbers.
- **Nobody has heard it.** The sounds were checked by their measures and
  their pictures: lengths, levels, where the energy sits. No ear has judged
  them. The reels and clips exist so that one can.
- **Bots rank levels. They don't predict people.** The research is plain
  that a bot's clear rate needs calibrating against real players before it
  means a percentage. The order of difficulty is likely right. The numbers
  "99% down to 50%" are the casual bot's, not a person's.
- **A brick's layers are small on a small phone.** In a square 40 px wide,
  a cushion in a pile of 4 is 8 px tall. The count read in every picture
  here, and the color on top says it again, but a hand-held phone was not
  tried. Whether "brick" is still the word for it is one of the "Choices put
  to the user".
- **The name is half-checked.** Two general searches for "Fuzz Flux", no
  store search, no trademark search.
- **It will be compared with Chuzzle.** "Fuzzley flavor" lists what keeps it
  apart. Whether that is enough is a judgment for the user.
- **Some research is thin.** Wikis refused the reader and the search
  allowance ran out, so several facts are marked "(listing)" in the notes,
  meaning they come from a search result and not the page. No shipped
  match-three publishes its timings, so there was nothing to check the
  numbers against.
- **The wind does little on a full board.** When the wind turns and nothing
  has room to fall, only the arrow, the fur and the gust show it. The levels
  with a turning wind have gaps, bricks or cages for that reason, but level
  30 does not, and may want one.
- **A canvas sketch is not the build.** 60 fuzzballs with fur redrawn every
  frame run smoothly in the sketch on a desktop Chrome. A phone and the
  house's engine were not measured.
- **Flights can outlast a move.** A fuzzball can still be flying to its goal
  when the board takes the next swap. The count allows for it, and it reads
  well in the storyboards, but a fast player may find it busy.

## Not in this design

- A build plan, and anything about the house's code.
- Music, and haptics. A web page can't make an iPhone buzz.
- A map, lives, boosters, coins, daily levels, or anything to buy.
- More than 36 levels. The sets leave room for a 5th.
- A score. See the 3rd of the "Choices put to the user".
- The game's page, its catalog card and its "How to play".
- Measured contrast, a real screen reader pass, and a test on a device.

## What other games teach

Each line is a finding and what the design did with it. The notes have the
sources.

- **A match of 4 in a line, an L or T, a square and a line of 5 each make a
  different special, and 2 specials swapped together combine**
  ([`swap-matchers.md`](research/swap-matchers.md)). The design keeps that
  grammar, which players already know, and gives each special a fuzzball's
  reason for what it does.
- **Players' loudest complaint is a level that luck decides.** One published
  case measured a level's clear rate from 0.15 to 0.75 by seed alone
  ([`levels-and-blockers.md`](research/levels-and-blockers.md)). Hence deals,
  proofs and the choice of 8 from 40.
- **Restraint beats piling on.** Essays on "juice" agree that stacked effects
  wear thin and that small, consistent ones carry a game
  ([`game-feel.md`](research/game-feel.md)). Hence one kit of effects, small
  shakes, no frozen frames, and an end flourish that can be hurried.
- **Rising pitch with each cascade is the genre's oldest reward,** and
  designers credit soft, rounded sounds for games people play for hours
  ([`sound.md`](research/sound.md)). Hence the ladder and the bubbles.
- **Sound that leads the picture by 45 ms is noticed. Sound that trails by
  125 ms is not.** So sounds are scheduled with the motion, never ahead.
- **A voice calling out praise belongs to other games, and unvaried sounds
  tire** ([`sound.md`](research/sound.md)). Hence no words of praise, no
  voice, and sounds that climb with each wave.
- **A new blocker appears alone and is used for 3 to 5 levels running, with
  a hard level before each arrival**
  ([`levels-and-blockers.md`](research/levels-and-blockers.md)). The sets
  follow it.
- **A swipe must have a tap-only way, and no 6 colors survive color
  blindness** ([`input-and-accessibility.md`](research/input-and-accessibility.md)).
  Hence 2 taps, keys, and shapes.
- **Lint, cling and static are themes no match-three found has used**
  ([`levels-and-blockers.md`](research/levels-and-blockers.md)). Dust, burrs
  and the frizzball come from there.
- **The nearest game, Chuzzle, is defined by sliding rows and by creatures
  that react to being poked**
  ([`creature-pieces-and-names.md`](research/creature-pieces-and-names.md)).
  The design does neither.

## Appendix: the draft levels

"Moves" is what the sketch set. "Casual clears" is what the level asks of
the casual player, which its 8 deals give to within 4 points.
[`levels/`](levels/) has each level's board as a picture, and
[`mocks/levels/`](mocks/levels/) shows them.

### Warm-up, levels 1 to 9

Bunches, the four special fuzzballs, and dust.

| #   | Level           | The idea                                                        | Board  | Kinds | On the board     | Goals                        | Moves | Casual clears |
| --- | --------------- | --------------------------------------------------------------- | ------ | ----- | ---------------- | ---------------------------- | ----- | ------------- |
| 1   | Three's company | A small board and a bunch waiting to be made.                   | 6 by 6 | 5     | fuzzballs only   | 10 blue, 10 red              | 14    | 99%           |
| 2   | Four across     | A line of 4 is one swap away, and makes the first dasher.       | 6 by 6 | 5     | fuzzballs only   | 14 red, 12 green             | 18    | 99%           |
| 3   | Square deal     | Three corners of a square stand ready; the fourth makes a wisp. | 6 by 6 | 5     | fuzzballs only   | 14 green, 12 pink            | 17    | 98%           |
| 4   | Round the bend  | Two lines that meet at a corner make a puffer.                  | 6 by 6 | 5     | fuzzballs only   | 16 amber, 12 violet          | 16    | 98%           |
| 5   | High five       | Five in a line makes the frizzball, which takes a whole kind.   | 7 by 6 | 5     | fuzzballs only   | 18 pink, 14 blue             | 19    | 98%           |
| 6   | Better together | Two pairs of specials stand side by side: swap a pair together. | 7 by 7 | 4     | 4 specials       | 30 blue, 30 red, 30 amber    | 11    | 95%           |
| 7   | Mind the gap    | The first board with its corners cut and a hole in the middle.  | 7 by 7 | 5     | 5 gaps           | 14 violet, 14 amber, 14 blue | 17    | 92%           |
| 8   | Dust-up         | A patch of dust in the middle of an easy board.                 | 7 by 7 | 5     | 21 dusty squares | all the dust                 | 16    | 92%           |
| 9   | Spring cleaning | A ring of dust round the edge, thick at its corners.            | 8 by 8 | 5     | 20 dusty squares | all the dust                 | 18    | 80%           |

### Bricks and bars, levels 10 to 18

Bricks to break beside a bunch, and caged friends to free.

| #   | Level          | The idea                                                              | Board  | Kinds | On the board                         | Goals                        | Moves | Casual clears |
| --- | -------------- | --------------------------------------------------------------------- | ------ | ----- | ------------------------------------ | ---------------------------- | ----- | ------------- |
| 10  | Brick by brick | A row of bricks across the board, with one way through.               | 7 by 8 | 5     | 10 bricks                            | every brick                  | 14    | 92%           |
| 11  | Tough crowd    | A knot of thick bricks, each a pile of 2 or 3 cushions.               | 7 by 8 | 5     | 8 bricks                             | every brick                  | 17    | 86%           |
| 12  | Swept under    | Dust lies under a square of bricks and inside it.                     | 8 by 8 | 5     | 16 dusty squares, 12 bricks          | all the dust                 | 17    | 80%           |
| 13  | Jailbreak      | Seven friends in cages, each freed by a bunch of its own kind.        | 7 by 7 | 5     | 7 cages                              | every cage                   | 13    | 90%           |
| 14  | Six of one     | The sixth kind arrives on a full board, where bunches are rarer.      | 8 by 8 | 6     | fuzzballs only                       | 14 pink, 14 violet, 14 green | 19    | 84%           |
| 15  | The vault      | Eight friends behind a wall of thick bricks: a blast reaches through. | 8 by 8 | 5     | 16 bricks, 8 cages                   | every cage                   | 21    | 76%           |
| 16  | Checkerboard   | Bricks on every other square, so fuzzballs roll in under them.        | 8 by 8 | 5     | 16 bricks                            | every brick                  | 18    | 80%           |
| 17  | Tight corners  | A waisted board with a friend caged in each far corner.               | 8 by 8 | 5     | 12 gaps, 4 cages                     | every cage, 16 green         | 18    | 74%           |
| 18  | Clean sweep    | The set's last: a brick ring over thick dust, cages, a dusty floor.   | 8 by 9 | 5     | 12 dusty squares, 12 bricks, 4 cages | all the dust, every cage     | 21    | 60%           |

### Bedtime, levels 19 to 27

Sleepyheads to bring down to bed, and burrs that spread.

| #   | Level               | The idea                                                         | Board  | Kinds | On the board                      | Goals                        | Moves | Casual clears |
| --- | ------------------- | ---------------------------------------------------------------- | ------ | ----- | --------------------------------- | ---------------------------- | ----- | ------------- |
| 19  | Lights out          | Two sleepyheads at the top and a bed under each.                 | 7 by 8 | 5     | 2 sleepyheads                     | every sleepyhead             | 22    | 90%           |
| 20  | Bunk beds           | Three sleepyheads, each with a brick in its way down.            | 7 by 8 | 5     | 3 bricks, 3 sleepyheads           | every sleepyhead             | 26    | 80%           |
| 21  | Sleepwalk           | Four sleepyheads at two heights, over cages and bricks.          | 8 by 8 | 5     | 2 bricks, 2 cages, 4 sleepyheads  | every sleepyhead             | 24    | 74%           |
| 22  | Burr patch          | Five burrs in the middle, which spread when you leave them.      | 7 by 7 | 5     | 5 burrs                           | 18 blue, 18 red              | 16    | 86%           |
| 23  | Sticky situation    | Burrs stand between you and eight caged friends.                 | 8 by 8 | 5     | 8 cages, 8 burrs                  | every cage, 18 amber         | 16    | 76%           |
| 24  | Nap in the thistles | Two sleepyheads come down through burrs and past bricks.         | 7 by 8 | 5     | 2 bricks, 2 sleepyheads, 3 burrs  | every sleepyhead             | 16    | 74%           |
| 25  | Dust bunnies        | Thick dust in the corners and the middle, and burrs between.     | 8 by 8 | 5     | 24 dusty squares, 4 burrs         | all the dust                 | 29    | 70%           |
| 26  | Long way down       | A tall, narrow board: four sleepyheads and two shelves of brick. | 6 by 9 | 5     | 6 bricks, 4 sleepyheads           | every sleepyhead             | 28    | 70%           |
| 27  | Pillow fort         | The set's last: two sleepyheads walled in brick, over cages.     | 8 by 9 | 5     | 16 bricks, 2 cages, 2 sleepyheads | every sleepyhead, every cage | 17    | 55%           |

### Windy days, levels 28 to 36

A wind that blows the fuzzballs sideways, up, and round.

| #   | Level               | The idea                                                           | Board  | Kinds | On the board                                                          | Goals                                 | Moves | Casual clears |
| --- | ------------------- | ------------------------------------------------------------------ | ------ | ----- | --------------------------------------------------------------------- | ------------------------------------- | ----- | ------------- |
| 28  | Crosswind           | The wind blows to the right, so everything falls that way.         | 8 by 7 | 5     | wind right                                                            | 20 blue, 20 amber                     | 16    | 90%           |
| 29  | Updraft             | The wind blows up, at bricks along the top.                        | 7 by 8 | 5     | 12 bricks, wind up                                                    | every brick                           | 24    | 80%           |
| 30  | Weather vane        | The wind turns a quarter after every 3 moves.                      | 7 by 7 | 5     | wind down, turning every 3 moves                                      | 22 green, 22 red                      | 17    | 80%           |
| 31  | Leaf pile           | The wind blows left, into a drift of dust.                         | 8 by 8 | 5     | 20 dusty squares, wind left                                           | all the dust                          | 22    | 74%           |
| 32  | Kite weather        | Twelve friends caged at the edges, and a wind that turns.          | 8 by 8 | 5     | 12 cages, wind down, turning every 4 moves                            | every cage                            | 16    | 70%           |
| 33  | Gale                | A cross of bricks, and a wind that turns after every 2 moves.      | 8 by 8 | 5     | 16 bricks, wind right, turning every 2 moves                          | every brick                           | 18    | 68%           |
| 34  | Burrs on the breeze | Burrs across the board, and a wind to the right.                   | 8 by 8 | 5     | 8 burrs, wind right                                                   | 28 violet, 28 blue                    | 17    | 70%           |
| 35  | Eye of the storm    | A hole in the middle, dust round it, and a wind that turns.        | 8 by 8 | 5     | 4 gaps, 32 dusty squares, wind down, turning every 3 moves            | all the dust                          | 22    | 64%           |
| 36  | The big bunch       | The last level: six kinds, bricks, cages, dust and a turning wind. | 8 by 9 | 6     | 14 dusty squares, 6 bricks, 4 cages, wind down, turning every 4 moves | every cage, every brick, all the dust | 33    | 50%           |
