# Fuzz Flux research: levels, goals, blockers and difficulty

These notes were gathered on 2026-11-25 for the design of Fuzz Flux. They draw
on fan wikis, player guides, trade-press interviews with level designers at
King and Playrix, analysts' breakdowns, and nine academic papers (five read
in full, the rest from abstracts or excerpts). The Fandom wikis refused page
fetches, so their facts come from search listings and carry the mark
"(listing)". Medium, TouchArcade, Bulbapedia, TV Tropes and ResearchGate also
refused. The session's web-search allowance ran out after about twenty
searches, so sections 6 to 10 rest on pages reached directly and are thinner.
No GDC Vault talk was found. No source code was read (the code repository of
the "Royal Crush" paper was not opened) and no art or audio was downloaded.

## 1. Where each goal and blocker first appears

The big games have been rebuilt since launch, so wiki pages disagree. Where
two numbers are given, both are reported.

### Candy Crush Saga (current build)

|    Level | What arrives                                | Source         |
| -------: | ------------------------------------------- | -------------- |
|        1 | Collect-N goal ("candy order")              | wiki (listing) |
|        2 | One-layer frosting; orders for blockers     | wiki (listing) |
|        8 | Jelly goal (clear a layer under the pieces) | wiki (listing) |
|    10/13 | Teleporters (two wiki pages disagree)       | wiki (listing) |
|       11 | Marmalade (a coat on a piece)               | Cheats4Game    |
|       17 | Ingredients goal; gummi dragons and cannons | wiki (listing) |
|       21 | Licorice locks                              | both           |
|   26, 43 | First "super hard", "nightmarishly hard"    | wiki (listing) |
|       36 | Licorice swirls, and orders for them        | both           |
|   51-156 | Frosting layers 2 to 5 at 51, 81, 126, 156  | Cheats4Game    |
|       96 | Candy bombs (countdown pieces)              | Cheats4Game    |
|      141 | Chocolate (spreads)                         | Cheats4Game    |
|      186 | Chocolate fountain (spawner)                | Cheats4Game    |
| 306, 441 | Conveyor belt; cake bomb (2x2, eight hits)  | wiki (listing) |

- **Candy Crush Saga, three goal types in 17 levels.** Collect-N arrives at
  level 1, clear-the-layer at 8 and bring-items-down at 17: a new goal type
  every 7 to 9 levels. [CCS wiki] (listing)
- **Candy Crush Saga, the 2021 redesign moved things.** Levels 6 and 11 were
  once the first jelly and first ingredients levels; both are now collect-N
  levels. [CCS wiki] (listing)
- **Candy Crush Saga, new blockers open episodes.** Episodes 1 and 2 hold 10
  levels, later ones 15. Every introduction from 21 on in the table is the
  first level of an episode (inferred), so a new blocker, or one more layer,
  comes every 15 or 30 levels. Countdown (96) and spreading (141) come last.
  [CCS wiki (listing); Cheats4Game CCS; Wikipedia: Candy Crush Saga]

### Candy Crush Soda Saga

- **Soda, a five-level first episode.** Episode 1 is levels 1 to 5 and episode
  2 is 6 to 15. One wiki page gives the tutorial order as soda goal at level
  1, fish (a homing special piece) at 3, frosting at 5. [Soda wiki] (listing)
- **Soda, the wiki pages disagree on goals.** One lists frosting 1, soda 2,
  bubble 16, honey 22, chocolate 61; another soda 1, frosting 6, bubble 9,
  chocolate 31, honey 76. [Soda wiki] (listing)
- **Soda, blocker schedule.** Licorice lock at level 2; cupcake (layered
  blocker) with one layer at 9, two at 11, three at 22, four at 28, five at
  41; chocolate at 32; locked chocolate at 45. [Cheats4Game Soda]

### Royal Match (first 200 levels, one analyst's count)

|    Level | Element (analyst's name)       | Rule noted                     |
| -------: | ------------------------------ | ------------------------------ |
|      1/5 | Box                            | 1 adjacent match; 2 hits at 7  |
|        9 | Grass (under-layer)            | 2 hits at 11, 3 hits at 12     |
|       13 | Cupboard ("gate"), 4 cells     | several hits, items inside     |
|       21 | Mailbox                        | gives mail per adjacent match  |
|       31 | Royal egg                      | 1 adjacent match               |
|       41 | Colored bottle, 4 cells        | needs matches of its own color |
|       51 | Vase ("jar")                   | 2 hits                         |
|  61, 161 | Stone; golden pig              | special pieces only            |
|   71, 91 | Big grass; iron gate (4 cells) | several hits; 5 hits           |
|       81 | Covering layer ("butter")      | covers pieces                  |
|      101 | Bird                           | a collect goal                 |
|      121 | Colored wood                   | one color only                 |
|      141 | Ice, 9 cells                   | 9 hits                         |
| 181, 201 | Curtain; seashell              | locked by a key; 3 hits        |

- **Royal Match, the rhythm is 4, 4, 8, then 10.** New obstacles come at 5, 9,
  13 and 21, then every 10 levels to 101, then every 20 to 201. The wiki puts
  the box at level 1 and agrees on egg 31 and ice 141.
  [Laitimes; Royal Match wiki (listing)]
- **Royal Match, later elements open hundreds.** Rock (element 24) at 501,
  drill at 601, wall at 3401, tesla coil at 4201, force field (element 72)
  at 7601: about one per 150 levels (inferred). [Royal Match wiki] (listing)
- **Royal Match, teach then mix.** A new obstacle is used for 3 to 5 levels in
  a row, then old ones return for 2 or 3. Obstacles mix freely only after
  level 40, and one level in the first 50 shows four kinds. [Laitimes]
- **Royal Match, labeled difficulty.** The first "hard" level is 39, then 45
  and 49, then multiples of 5 (55, 65, 75 are named). The first "super hard"
  is 59, then levels ending in 9. Bonus levels start at 20, about every 20.
  Another analyst counts about 2 hard levels in 10. [Laitimes; Funconomy]

### Other games

- **Homescapes, six elements in 31 levels.** Carpet at 6 (or 1), chains at 8
  (or 2), cherries in jelly at 12 (or 41), donuts (bring-down items) at 18
  (or 61), boxes at 22 (or 4), cookies at 31. The wiki gives both numbers
  without explaining them. [Homescapes wiki] (listing)
- **Gardenscapes, one mechanic per 19 levels.** The 2016 soft launch had 16
  mechanics in 300 levels (rate inferred). Each update adds one or two, on a
  schedule benchmarked against three rival games. [GWO]
- **Toon Blast, a new thing every 2 to 5 levels.** Balloons at level 1, crates
  at 4, boosters at 7, lock crates at 9, bubbles and a new color at 11,
  boxing gloves at 12, anvils at 17, dice at 19. [Toon Blast wiki] (listing)
- **Lily's Garden, tens.** New mechanics come once every ten levels (21, 31,
  41 and so on), at "tutorial levels"; the nine levels after each mix the new
  one with old ones. The first 100 levels add eight pieces. [Kristensen 2020]
- **Candy Crush Jelly Saga, three tutorial levels for one blocker.** The first
  scripts one full cycle of the blocker with no harmful move on offer; the
  third ends with an unguided case. [Braysy]
- **Introduction levels, board size and forced first move.** Not found.

## 2. Goal types and their rules

- **Reach a score.** Pass a score in a fixed number of swaps; this is the form
  proved NP-hard. A lab study rated score goals far easier than any other and
  advised them for early levels. [Walsh 2014; Eckmann 2024]
- **Collect N of a color, a special piece or a blocker.** Homescapes goals
  "usually involve collecting or clearing tiles of a certain color or
  quantity". Candy Crush adds "blocker orders" with its first blocker.
  [Wikipedia: Homescapes; CCS wiki (listing)]
- **Clear a layer under the pieces.** A jelly square is cleared by a match made
  on it; thick jelly takes two. In Jewel Quest (2004) each square under a
  match turns gold, and all must. [Gamezebo; Wikipedia: Jewel Quest]
- **Spread a layer.** In Candy Crush Jelly Saga a match that includes a piece
  on jelly turns every square of that match to jelly; cover the board to win.
  Homescapes carpet works the same way. [Wikipedia: Candy Crush Jelly Saga;
  Razumovskiy]
- **Bring items down.** Ingredients start at the top and leave at the bottom
  as pieces under them are cleared. Homescapes donuts and Two Dots anchors
  do the same. [Gamezebo; Playrix Help; Wikipedia: Two Dots]
- **Find hidden things.** Soda's frosting bears lie under (usually two) layers
  of frosting; early on their places are fixed, later they change between
  attempts. [Soda All Help]
- **Free trapped creatures.** Soda's bubble bears must float up past a string
  of candy; a bear rises only where the soda is high enough. A catalogue adds
  a creature tied to a piece, freed by matching it. [Soda All Help;
  Razumovskiy]
- **Raise a level.** Each popped bottle raises Soda's liquid one line; the
  goal is met when it reaches the top. [Soda wiki] (listing)
- **Defeat a spreading enemy.** Destroy every chocolate square; each move
  that destroys none makes it grow by one. [Soda All Help]
- **Escort, race and boss.** Homescapes' ball of yarn rolls toward its basket
  on each adjacent match. Royal Kingdom has an attack level every 10 levels;
  damage depends on pieces cleared. [Playrix Help; DoF Royal Kingdom]
- **Clear the whole board.** Bejeweled 2's Puzzle mode: remove every gem from
  a set board, with undo and hints. [Wikipedia: Bejeweled 2]
- **Timed goals are gone.** King phased them out because strict time limits
  "did not consistently align" with the experience and players do not all
  react at the same speed. [PG.biz flavours]

## 3. Blockers and board elements

- **Layered static blocker (frosting, cupcake, box, cookie).** It fills a cell
  and never moves; pieces cannot enter. A match beside it, or a special
  piece's blast, removes one layer of 1 to 5. Homescapes cookies ignore the
  color-clearing special. [Cheats4Game CCS; Cheats4Game Soda; Playrix Help]
- **Lock on a piece (licorice lock, chain, cobweb).** The piece cannot be
  swapped. In Candy Crush a match beside the lock does nothing: it opens when
  the locked piece itself is matched or a special hits it. A cobweb stops
  the swap, but the piece still falls. [Cheats4Game CCS; Playrix Help]
- **Spreading blocker (chocolate, suds, ivy, bubble gum).** An adjacent match
  or a blast removes a square; on every move that removes none it grows one
  square. It usually does not eat special pieces. [Soda All Help;
  Cheats4Game Soda]
- **Spawner of blockers.** The chocolate fountain is permanent and makes
  chocolate every two moves while none is on the board. The magic mixer drops
  blockers nearby every 3 or so turns. [Cheats4Game CCS; CCS wiki (listing)]
- **Under-layer (jelly, grass, carpet).** It lies under pieces and does not
  stop them. Grass is cleared by a match made on it; carpet is spread by the
  player the same way. [Sezer (listing); Playrix Help]
- **Countdown piece (candy bomb).** It carries a number (1 to 99), moves and
  swaps like a piece, and is cleared by matching it or by a blast; at zero
  the level is lost. Bejeweled Twist's doom gem counts down only on moves
  that make no match. [Cheats4Game CCS; Razumovskiy; Wikipedia: Bejeweled Twist]
- **Unmatchable faller (licorice swirl, stone).** A swirl swaps and falls but
  never matches; clearing a piece beside it removes it. It stops a
  line-clearing special, and chocolate cannot cover it. Royal Match's stone
  yields only to specials. [Cheats4Game CCS; Cheats4Game Soda; Laitimes]
- **Coat that traps a piece (honey, ice, marmalade).** Honey has 1 to 6
  layers; its contents cannot be matched or collected until it is gone. Ice
  yields when its piece is matched. [Cheats4Game Soda; Playrix Help]
- **Things that carry pieces.** A portal sends a piece out of its pair. A
  conveyor belt moves its pieces one cell per move. A generator "produces
  pieces and elements once space beneath it is freed". [Playrix Help; CCS
  wiki (listing); Razumovskiy]
- **Walls, fences, holes.** A Homescapes wall sits between two cells: pieces
  cannot cross, but matches across it count. Candy Crush's cane fence lets
  blasts through; its licorice fence stops them. A plain block cannot be
  destroyed or moved. [Playrix Help; Cheats4Game CCS; Razumovskiy]
- **Reversed gravity.** Pieces inside Soda's liquid float up after a match
  while pieces above it still fall, so the board's two halves move in
  opposite directions. [Soda All Help]
- **Color-coded blocker.** A Homescapes colored box breaks only to a match of
  its own color beside it; Royal Match has colored wood. [Playrix Help;
  Laitimes]
- **Big multi-cell blocker.** The cake bomb covers 2x2, takes eight hits, then
  clears the board. Royal Match uses 4-cell cupboards and gates and a 9-cell
  ice strip. [Cheats4Game CCS; Laitimes]
- **Specials-only blocker.** The licorice shell takes three hits from special
  pieces, then becomes a color bomb. Royal Match's stone and golden pig also
  ignore plain matches. [Cheats4Game CCS; Laitimes]
- **Self-movers and chains.** A Homescapes parrot climbs one cell per turn; a
  feather jumps to any clear cell; soap slides and leaves suds. Breaking one
  link of a licorice link removes the chain. [Playrix Help; Cheats4Game Soda]
- **What a lab study found hard.** With swapping, specials-only pieces,
  countdown pieces and growing blockers belong in late levels, and locks in
  small numbers. More of one blocker adds less and less. [Eckmann 2024]

## 4. What level designers say

- **Playrix, four rules for every level.** No more than three or four
  elements; only compatible elements (ivy and honey never meet); one idea
  per level; beatable without boosters. [GWO]
- **Playrix, difficulty is losses over attempts.** A master document sets each
  level's place, difficulty, goals and element count. A designer told to hit
  "80% difficulty" tunes the move count and the fill rate of a bonus meter.
  Chains of levels at 92%, 93% and 95% demoralized players. [GWO]
- **Playrix, test and measure.** Staff playtesters play new levels; live data
  is read 2 to 3 weeks after release. A/B tests compare difficulty, attempts
  to win and dropout (level 77 lost 2.29% of players). [GWO]
- **King, the "complexity staircase".** New players meet simple blockers; more
  complex ones come later. Early blockers took up space or soaked up moves;
  King now prefers blockers that force choices over grinding through layers.
  A blocker's look must match what it does. [PG.biz staircase]
- **King, mix new with old, then relieve.** "New levels typically feature a
  mix of both recent and long-established blockers." A tough level is often
  followed by a lighter one, yet none should "feel trivially easy". There is
  no fixed cadence for new blockers. [PG.biz staircase]
- **King, difficulty is set first.** The goal, rough difficulty and the
  player's experience are fixed before a level is drawn, on paper first. One
  level takes days to weeks. [PG.biz staircase; PG.biz Kang; PG.biz
  flavours; King Community (listing)]
- **King, four pillars.** Difficulty, rhythm (variety), flow and hook (each
  level distinct). A designer's own sense of difficulty is often wrong: level
  65, the last at launch, was retuned from data. [PG.biz Kang]
- **King, contest levels.** The team planned all nine levels before building
  any, tilted them toward skill over chance, and capped what one round can
  score. [PG.biz All Stars]
- **Room 8, count attempts.** Track mean and median attempts per level, not
  pass rate. Do not repeat an idea for 50 levels. Generated levels were often
  impossible, too easy or dull. Level moods include tutorial (1 to 3
  mechanics), "wow" (cascades) and "fuu" (always 1 or 2 moves short).
  [Emelyantseva 1, 2]
- **Sawtooth.** Several levels of rising difficulty, then a drop made "to give
  a break" (page not opened). Studio blogs add numbers without data: a tooth
  of 5 to 15 levels; easy levels at 85 to 95% win rate, hard ones at 25 to
  40%; one hard level in 5 to 8; look at any level under 30% or over 90%.
  [listing, probably Stankovic; Ludaxis; Raijinn; Galaxy4Games]
- **Win-rate targets.** No designer at King, Dream Games, Playrix or Peak was
  found stating one. The only primary figure is Playrix's "80% difficulty"
  example: a 20% win rate per attempt. "First try win rate": not found. [GWO]
- **Move limits and colors.** No stated rule found. Observed: King's bots
  average about 30 moves per attempt on 9x9; Soda level 50 gives 20 moves;
  Jelly Juice uses 6 colors on 9x9. [Gudmundsson 2018; Soda wiki (listing);
  Napolitano 2020]
- **Board shape.** Vary the shape and cut away unused cells. Chokepoints,
  chambers, spawner placement, "bottom rows cascade more": no designer
  source found. [Gamigion] (listing)
- **Near-miss design.** Royal Match levels are "extremely well-tweaked towards
  the creation of near-misses" that sell extra moves. Vendor blogs call a
  loss within two moves "the monetization moment". Fuzz Flux sells nothing,
  so none of this applies. [Naavik; Raijinn]

## 5. Automated playtesting and what bots predict

- **King 2018, a player-imitating network.** Trained on 5,500 human moves per
  level from Candy Crush Saga levels 1 to 2,150, it picks the human's move
  47% of the time; chance is 16.67%. [Gudmundsson 2018]
- **King 2018, bot rate to human rate.** The bot plays a new level 100 or
  1,000 times. A binomial regression with level-type features, fitted on 800
  levels, maps its success rate to the players'. On 200 unseen levels the
  mean absolute error was 4.0% (1,000 runs) or 4.9% (100 runs); a
  tree-search bot scored 5.4%. [Gudmundsson 2018]
- **King 2018, the map is not linear.** Players beat the forecast where a
  level needs deeper strategy; one bot is less random than a crowd; bot and
  humans respond differently as difficulty rises. [Gudmundsson 2018]
- **King 2018 and today.** A level's difficulty comes in under a minute,
  against 7 days of human playtests per 15-level episode before. Today bots
  play each level thousands of times and report difficulty and reshuffles,
  but "can miss how a level feels". [Gudmundsson 2018; Mobilegamer.biz;
  PG.biz staircase]
- **Lily's Garden 2020, weak bots still rank levels.** Bots played with no
  move limit. Moves to finish, divided by the level's move limit, was
  rank-correlated with players' completion rate. A random bot and a greedy
  "biggest group first" bot were baselines; the random bot also correlated.
  The least skilled trained agent correlated best and the most skilled did
  worse than random. [Kristensen 2020]
- **Lily's Garden 2020, use the best runs.** Correlation peaked using only the
  best 5% of a bot's runs. The authors rank levels ("one of the top 10%
  hardest"); they do not predict a rate. [Kristensen 2020]
- **Angry Birds Dream Blast 2021.** Ground truth: 95,266 players on 168
  levels, pass rate being one over attempts needed. The best predictors were
  the bot's pass rate over all runs, moves left over its best 15% of runs,
  and goals cleared over its best 5%. Mean squared error fell from about
  0.019 to about 0.0145. Tree search guided by the learned agent did best on
  the hardest levels. [Roohi 2021]
- **Personas bracket humans.** On a 7x7 board with 20 moves, a
  score-maximizing tree search beat the best of 41 humans on all but one
  board, a score-minimizing one fell below the worst, and a random bot
  sometimes beat a persona. [arXiv 1907.06570]
- **Other results.** A learned agent on Jelly Juice beat a random player and
  was "in most cases similar" to real users. Models trained on both player
  statistics and simulated play estimated difficulty best. [Napolitano 2020;
  Kristensen and Burelli 2024]
- **What simple bots predict, in sum (inferred).** Random, greedy and
  look-ahead bots rank levels usably and show the spread of moves needed.
  They give no human win rate unfitted, and stronger is not more predictive.

## 6. Fairness of randomness

- **How refills are described.** King's paper says an empty cell with nothing
  above it "is filled with a new random item". Published drop weights for any
  commercial game: not found. [Gudmundsson 2018]
- **Seeds alone move the win rate.** A figure from a paper on one commercial
  match-three shows win rate at a single level from 0.15 on the hardest seed
  to 0.75 on the easiest. The paper was not opened. [ResearchGate figure]
  (listing)
- **Claims of adjusted drops.** A studio blog says a game may change the seed,
  remove blockers or add moves after repeated failures, naming King without
  a citation. A Room 8 designer writes of systems that profile each player
  and adjust game variables. Unverified. [Ludaxis; Emelyantseva 1]
- **With no randomness the game is a hard puzzle.** Reaching a score in a
  fixed number of swaps is NP-hard when all pieces are known. [Walsh 2014]
- **Dead boards.** Royal Match "almost never reshuffles". Two Dots scrambles
  when no move exists. Bejeweled's Classic mode ends the game and its Zen
  mode can never run out of moves. Chuzzle gives a limited stock of
  scrambles. [Naavik; Wikipedia: Two Dots, Bejeweled 3, Chuzzle]
- **Fixed puzzles.** Bejeweled 2 has 80 set puzzles in 16 groups of five,
  with undo and hints; four solved unlocks the next group. Chuzzle's Mind
  Bender has 20 groups of five. [Wikipedia: Bejeweled 2, Chuzzle]
- **Numbered deals.** FreeCell labels each deal with its seed; of the first
  32,000 only deal 11982 cannot be solved. Whether Microsoft's daily
  challenges are always solvable: not found. [Wikipedia: FreeCell]
- **Pokemon Shuffle.** A stage is beaten in a set number of moves and a faster
  win raises the catch chance. Whether its layouts are fixed: not verified.
  [Wikipedia: Pokemon Shuffle]
- **Luck as a hook, skill in contests.** One designer lists "lucky chance"
  (surprise cascades, a last-move win) among a level's hooks. King caps a
  round's tournament score so one lucky board cannot decide it.
  [Emelyantseva 2; PG.biz All Stars]

## 7. Onboarding

- **Royal Match, five levels.** Levels 1 to 5 teach the swap and the four
  special pieces (line clear, bomb, propeller, color ball); a box is on the
  board by level 5 at the latest. [Laitimes; Royal Match wiki (listing)]
- **Royal Kingdom, a blocker in level 1.** It skips teaching the basic match;
  new features get "basic hints, arrows, and shadowing". The writer contrasts
  this with the 40-to-60-minute tutorials of a few years before. [Funconomy]
- **Candy Crush Saga and Soda.** A host character walks the player through the
  basics; the first blocker comes at level 2. Soda teaches its goal at level
  1, a special piece at 3, a blocker at 5. [Gamezebo; CCS wiki (listing);
  Soda wiki (listing)]
- **Tools come later.** Homescapes unlocks its hammer at level 8; Toon Blast
  unlocks boosters at 7. [Wikipedia: Homescapes; Toon Blast wiki (listing)]
- **Tutorials help only complex games.** In a test on over 45,000 players and
  three games, tutorials raised play time by up to 29% in the most complex
  game and did nothing significant in the two simpler ones. [Andersen 2012]
- **Advice without data.** Fix "the specific moves players should make" in the
  first levels. Level 1 won on the first try in under 30 seconds. Few special
  pieces and blockers early. [Emelyantseva 1; Ludaxis; Eckmann 2024]
- **Pointer against dimmed board, and what annoys.** No study found.

## 8. Stars and replay

- **Candy Crush family, stars by score.** Stars are awarded on score; leftover
  special pieces fire at the end and add to it. Thresholds: not found. Soda
  level 50 adds a 5,000-point minimum to its goal. [Wikipedia: Candy Crush
  Saga; Gamezebo; Soda wiki (listing)]
- **Royal Match, Homescapes, Gardenscapes: no rating.** A win pays one star,
  spent on tasks; there is nothing to replay for. [Wikipedia: Homescapes,
  Gardenscapes]
- **Moves left as the measure.** Pokemon Shuffle ties its reward to how fast
  a stage is beaten. Researchers use "moves left when passing" as a main
  difficulty signal. A "super hard" Royal Match level can be won with 15
  moves left. [Wikipedia: Pokemon Shuffle; Roohi 2021; Naavik]
- **Optional mastery.** One blog advises a base goal for most players and
  optional three-star or par-move targets for experts. Chuzzle gives
  trophies for feats. A third-star rule in any match-three: not found.
  [Ludaxis; Wikipedia: Chuzzle]

## 9. Pacing in sets

- **Candy Crush Saga and Soda.** Candy Crush has ten levels in each of its
  first two episodes, then 15, with a new blocker at the opener; its 65-level
  launch set ended on its hardest level. Soda has five levels, then ten.
  [CCS wiki (listing); Soda wiki (listing); PG.biz Kang]
- **Royal Match and Lily's Garden.** Blocks of ten that open on a new element
  at the level ending in 1. In Royal Match the level ending in 5 is "hard"
  and the one ending in 9 "super hard", so a block ends on its peak and the
  next opens on an easy teaching level (inferred). [Laitimes; Kristensen
  2020]
- **Extras.** Royal Match has a bonus level about every 20; Royal Kingdom a
  boss level every 10; Gardenscapes a mini-game about every 20. [Laitimes;
  DoF Royal Kingdom; Wikipedia: Gardenscapes]
- **Other sets.** Two Dots: 10 levels in the first world, 25 or more later,
  each world with its own elements. Bejeweled Twist: 13 planets of seven
  challenges, the seventh a special mode. [Wikipedia: Two Dots, Bejeweled
  Twist]

## 10. Themes already used, and odd gravity

- **Chuzzle (2005) is fuzzballs with eyes.** Its pieces are "colorful
  fuzzballs" in eight colors on a 6x6 board. The player slides whole rows and
  columns, which wrap around. Five in a group make a Super Chuzzle that
  blasts 3x3; a Fat Chuzzle fills 2x2; a lock freezes its row and column;
  popped pieces' eyes fly into a flask. It is the closest prior art to our
  pieces; Chuzzle 2 came out in 2018. [Wikipedia: Chuzzle]
- **Yarn, feather, blanket, steam.** All are Homescapes elements: a ball of
  yarn rolls to a basket, a feather jumps to any free cell, a blanket covers
  cells, steam is a two-layer coat. [Playrix Help]
- **Soap, suds, bubbles.** Homescapes has spreading suds and sliding soap;
  Royal Match has a soap blocker; Soda has bubbles that lift bears and bubble
  gum that spreads; Toon Blast has bubbles. [Playrix Help; Royal Match wiki
  (listing); Soda All Help; Toon Blast wiki (listing)]
- **Electricity.** Royal Match has a tesla coil and a light bulb. A Homescapes
  plasma globe charges on three matches, then removes one random color.
  [Royal Match wiki (listing); Playrix Help]
- **Water and wind.** Soda's rising liquid; a catalogued "flood" where liquid
  fills rows from the bottom and new pieces float up through it; a
  catalogued "wind" where, after a match, a whole row or column shifts one
  cell in the direction of the swap. No game is named for wind.
  [Soda All Help; Razumovskiy]
- **Sleep.** Candy Crush's retired Dreamworld had the player balance matches
  of two colors to keep an owl asleep. [Wikipedia: Candy Crush Saga]
- **Other gravity tricks.** Arrows that send pieces up or sideways; a part of
  the grid that slides into a gap; a Homescapes "gravitation" mode; Bejeweled
  Twist's rotation of four gems; Bejeweled 3's rising ice columns pushed down
  by matches. [Razumovskiy; Playrix Help; Wikipedia: Bejeweled Twist,
  Bejeweled 3]
- **Not found anywhere read.** Lint, static cling, velcro, shedding, wool or
  shearing as a blocker or a goal.

## What this suggests for Fuzz Flux

1. Build 30 levels as three chapters of ten. Royal Match and Lily's Garden
   both run on blocks of ten, and ten is few enough to tune by hand.
2. Bring in a new thing at levels 1, 2, 4, 6, 8, then 11, 16, 21 and 26: fast
   at first, like Royal Match (5, 9, 13) and Candy Crush (1, 2, 8), then
   every five.
3. Start with a collect-N-of-a-color goal, not a score. Candy Crush moved its
   level 1 to collect goals, and a score tells a player little to aim at.
4. Add goal types in this order: collect a color (1), collect a blocker (2),
   clear an under-layer (8), bring items down (16), beat a spreader (21).
   This is Candy Crush's order at about its 7-to-9-level spacing.
5. Take blockers in this order: one-layer static (2), two-layer static (6),
   under-layer (8), lock (11), unmatchable faller with exits (16), spreader
   (21), specials-only or 2x2 (26). Every game read starts static.
6. Leave out countdown pieces, or use them once and mildly in chapter 3. They
   arrive at level 96 in Candy Crush and the lab study ranks them hardest.
7. Give the spreader the rule "grows one cell on any move that clears none of
   it". It is the genre's standard and fits in one line of help.
8. Use few locks per board, two to four at first. With swapping they were
   among the hardest elements in the lab study.
9. Make each introduction a teaching level: the new thing alone, generous
   moves, an opening whose obvious move shows the rule. Follow with two or
   three levels of it, then mixes, as Royal Match does.
10. Hold a level to three kinds of element, four at most in a finale. Playrix
    states this rule and Royal Match shows four kinds once in 50 levels.
11. Shape each chapter as a sawtooth: easy opener, a hard level at 5, the
    hardest at 9, a relief or bonus level at 10. Never put two hard levels
    together; Playrix saw such runs demoralize players.
12. Aim above the industry's win rates, since nothing is for sale. First
    targets per attempt: teaching 95% or more, easy 85 to 95%, normal 70 to
    85%, hard 50 to 65%, finale 40 to 50%. Blogs quote 25 to 40% to sell moves.
13. Set move limits from bot runs with no limit: record the moves the
    look-ahead bot needs and take the percentile that gives the target win
    rate. Expect 15 to 30 moves on 8x9, by analogy with 20 to 30 on 9x9.
14. Run random, greedy and look-ahead bots 1,000 times per level. King's
    error fell from 4.9% to 4.0% between 100 and 1,000 runs.
15. Trust bots for ranking, not for rates. Check that a chapter's levels rank
    in the planned sawtooth order, then calibrate with a few human testers.
16. Measure luck. Fix the layout and vary the seed; if the look-ahead bot's
    win rate swings like the 0.15-to-0.75 seen in one commercial game, rework
    the level. Also require a clear gap between random and look-ahead bots.
17. Keep refills uniform and seeded, never adaptive, and say so in How to
    play. Author each starting board by hand with no ready matches.
18. Have bots report the dead-board rate, as King's do, and reshuffle for
    free. A level that reshuffles often is broken.
19. Do not tune toward near-misses. Watch the share of bot losses that end
    one or two moves short, and show no "so close" prompt.
20. Give stars for moves left, not score: one for the goal, two and three at
    thresholds from the look-ahead bot's moves-left spread (say its median
    and its best quarter). It is the signal research trusts.
21. Teach in the first five levels: swap (1), first blocker (2), line special
    (3), blast special (4), combining two specials (5). Use a pointer on a
    dimmed board for one move at most, and one text card per later mechanic.
22. Keep clear of Chuzzle: no sliding rows, no 2x2 "fat" piece, no "Super"
    piece that blasts 3x3, no eyes flying to a meter.
23. Theme from what no source showed: lint as the under-layer, static cling
    as the lock, shed fur as the spreader. Yarn, suds, feathers, blankets and
    bubbles are already in Homescapes or Soda.
24. Consider wind as the one unusual mechanic, at level 26: a marked row
    shifts one cell after each move. Test with bots first; it adds chance.
25. Leave timed levels out. King dropped them for fit and accessibility.

## Sources

- [CCS wiki] listings only: https://candycrush.fandom.com/wiki/Category:Levels_with_new_things
- [Soda wiki] listings only: https://candycrushsoda.fandom.com/wiki/Level_types
- [Royal Match wiki] listings only: https://royalmatch.fandom.com/wiki/Category:Game_Element
- [Homescapes wiki] listing only: https://homescapes.fandom.com/wiki/Elements
- [Toon Blast wiki] listing only: https://toonblast.fandom.com/wiki/Toon_Trip
- [Cheats4Game CCS] https://cheats4game.com/candy-crush-saga-blockers/
- [Cheats4Game Soda] https://cheats4game.com/candy-crush-soda-saga-blockers/
- [Soda All Help] https://sodasagaallhelp.blogspot.com/2015/01/how-to-play-candy-crush-soda-saga.html
- [Gamezebo] https://www.gamezebo.com/walkthroughs/candy-crush-saga-walkthrough/
- [Playrix Help] https://playrix.helpshift.com/hc/en/14-homescapes/section/151-match-3-elements/?l=en
- [Laitimes] https://www.laitimes.com/en/article/33udo_3kjvl.html
- [Sezer] listing only: https://medium.com/@ekinmelissezer/game-analysis-for-royal-match-and-toon-blast-9c4bff8ef48b
- [Naavik] https://naavik.co/deep-dives/royal-match/
- [Funconomy] https://www.funconomy.com/post/unpacking-royal-kingdom-s-design
- [DoF Royal Kingdom] https://www.deconstructoroffun.com/blog/2023/05/09/royal-kingdom-will-it-usurp-the-throne
- [GWO] https://gameworldobserver.com/2019/09/27/playrix-levels-elements-match-3
- [PG.biz staircase] https://www.pocketgamer.biz/crafting-candy-crushs-difficulty-blockers-level-design-ai-and-the-complexity-staircase/
- [PG.biz Kang] https://www.pocketgamer.biz/king-on-finding-the-fun-in-candy-crush/
- [PG.biz All Stars] https://www.pocketgamer.biz/how-king-builds-tournament-levels-for-candy-crush-all-stars/
- [PG.biz flavours] https://www.pocketgamer.biz/competitive-or-casual-designing-candy-crush-with-a-spectrum-of-flavours/
- [Mobilegamer.biz] https://mobilegamer.biz/how-king-balances-human-and-ai-powered-design-in-candy-crush-saga/
- [King Community] listing only: https://community.king.com/en/candy-crush-friends-saga/discussion/306510/level-designers-answer-your-questions
- [Braysy] http://www.alexbraysy.com/candycrushjellysaga
- [Emelyantseva 1] https://www.gamedeveloper.com/design/smart-casual-the-state-of-tile-puzzle-games-level-design-part-1
- [Emelyantseva 2] https://www.gamedeveloper.com/design/smart-casual-the-state-of-tile-puzzle-games-level-design-part-2
- [Razumovskiy] https://www.gamedeveloper.com/design/45-match-3-mechanics
- [Gamigion] listing only: https://www.gamigion.com/match-3-level-design-principles/
- [Stankovic] listing only: https://stanislav-stankovic.medium.com/game-mechanics-game-progress-2ee92523b7b4
- [Ludaxis] https://www.ludaxis.io/blog/level-design-puzzle-games-guide
- [Raijinn] https://raijinnstudio.com/blog/match-3-game-development-guide-royal-match
- [Galaxy4Games] https://galaxy4games.com/en/knowledgebase/blog/match-3-game-development-complete-guide-for-mobile-games
- [Gudmundsson 2018] https://www.gwern.net/doc/reinforcement-learning/imitation-learning/2018-gudmundsson.pdf
- [Kristensen 2020] https://arxiv.org/abs/2306.14626
- [Roohi 2021] https://arxiv.org/abs/2107.12061
- [arXiv 1907.06570] https://ar5iv.arxiv.org/html/1907.06570
- [Napolitano 2020] https://arxiv.org/abs/2007.01137
- [Kristensen and Burelli 2024] https://arxiv.org/abs/2401.17436
- [Eckmann 2024] https://downloads.hci.informatik.uni-wuerzburg.de/2024-CoG-RoyalCrush.pdf
- [Walsh 2014] https://arxiv.org/abs/1403.1911
- [Andersen 2012] https://grail.cs.washington.edu/projects/game-abtesting/chi2012/
- [ResearchGate figure] listing only: https://www.researchgate.net/figure/Difficulties-of-various-random-seeds-at-a-level-of-the-match-three-game-Difficulty-is_fig3_322414816
- [Wikipedia: title] https://en.wikipedia.org/wiki/ followed by the title:
  Candy_Crush_Saga, Candy_Crush_Jelly_Saga, Royal_Match, Homescapes,
  Gardenscapes:_New_Acres, Two_Dots_(video_game), Chuzzle, Jewel_Quest,
  Bejeweled_2, Bejeweled_3, Bejeweled_Twist, FreeCell,
  Microsoft_Solitaire_Collection, Pok%C3%A9mon_Shuffle
