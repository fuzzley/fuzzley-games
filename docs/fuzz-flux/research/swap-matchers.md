# Swap matchers: rules and special pieces

Read on 2026-11-25 for Fuzz Flux: English and German Wikipedia articles, the
official help centers of Dream Games, Playrix and Rovio, the Bejeweled Wiki on
wiki.gg (with the Bejeweled 3 readme), Jesper Juul's history essay, Game
Developer write-ups of Jason Kapalka's talks, guide and review sites, and four
academic papers. No game source code was read: in the papers only the prose was
read, and their pseudo-code and one linked web implementation were skipped. No
art or audio was downloaded. Pages that refused to open (the Fandom wikis for
Candy Crush and Royal Match, TV Tropes, StrategyWiki, Bulbapedia, Giant Bomb,
GameSpot, Medium, Prima Games) are quoted only from search listings and marked
"(listing)". The session's search allowance ran out partway, so later facts come
from pages opened directly; Cookie Jam is the one named game with nothing found.

## 1. Boards and colors

- **Shariki (1994).** Eugene Alemzhin's MS-DOS game set the rule: swap two
  adjacent balls, every swap must make a line of three or more, new balls fall
  from the top, and the game ends when no match is possible. Board size and
  color count: not found. [WP: Shariki]
- **Bejeweled, 8×8 and seven colors.** The Bejeweled 3 readme gives an 8×8 grid
  and seven gem colors that all score the same. Juul gives 8×8 for the first
  game. [B3 readme] [Juul]
- **Candy Crush Saga, Homescapes, Royal Match.** Candy Crush has six candy
  colors and Homescapes six piece types (lamps, cups, books, buttons, bows,
  teapots). Board sizes for all three, and Royal Match's color count: not found
  on any page that opened. [de.WP: Candy Crush Saga] [Walsh] [HS help]
- **Zoo Keeper and Chuzzle.** Zoo Keeper is 8×8 with eight animals. Chuzzle is
  6×6 with eight colors; whole rows slide and wrap, which offsets the many
  colors (inferred). [de.WP: Zoo Keeper] [WP: Chuzzle]
- **Portrait-phone boards.** Puzzle & Dragons is 6 wide by 5 tall on the lower
  half of the screen; 10000000 is 7×8; Lily's Garden allows up to 13 by 9 with
  six colors; a research framework used 7×7; Triple Town is 6×6. [WP: Puzzle &
  Dragons] [WP: 10000000] [Kristensen] [Mugrai] [WP: Triple Town]
- **Color count as a difficulty lever.** No source gave a formula. Pokémon
  Shuffle sells the lever: an item removes one squad member's icon from the
  board to make a stage easier, and the Eject skill deletes a non-support icon.
  Fewer kinds means more ready matches and longer cascades (inferred). [Serebii]
- **Square grids only.** Kapalka: hexes "turn people off"; Bookworm kept its hex
  logic but drew offset squares. [Kapalka: hexes]

## 2. Matches and the specials they make

- **Bejeweled 2 and 3.** Bejeweled 2: four in a line, or two matches crossing in
  an L, T or +, make a Power Gem (destroys the eight gems around it); five or
  more make a Hypercube (swap it with a gem to destroy that color). Bejeweled 3
  splits the shapes: four makes a Flame Gem, an L or T a Star Gem (its row and
  column), five a Hypercube, six a Supernova (row and column, three wide). [WP:
  Bejeweled 2] [B3 readme] [WP: Bejeweled 3]
- **Bejeweled Twist and Stars.** Twist rotates a 2×2 block clockwise and a move
  need not match: Flame from four or an L, + or T; Lightning (row and column)
  from five. Stars adds a 2×2 square as a second way to make a Flame Gem, and a
  DarkSphere from six that turns one color into Hypercubes. [WP: Bejeweled
  Twist] [BW: Bejeweled Stars]
- **Candy Crush Saga and Soda.** Striped candy from four (clears a row or column
  by its stripes), wrapped from an L or T (clears the eight around it, twice),
  color bomb from five (clears the color it is swapped with) (listing). Soda
  adds a fish from a 2×2 match and a coloring candy from at least six. A matched
  fish sends three fish to random candies, jelly first. [CC Wiki, listing] [GZ:
  candies] [de.WP: Candy Crush Saga]
- **Royal Match.** Rocket: four in a line, clears a row or column. Propeller:
  four in a square, clears its neighbors on take-off, then "one random game
  element". TNT: five in an L or T, two-tile radius. Light Ball: five in a line,
  every item of one color. [RM help 6]
- **Homescapes.** Rocket: four in a line. Paper Plane: four in a square;
  destroys neighbors on take-off, then one piece, "often targeting locked
  elements or level goals first". Bomb: five or six in an L or T, two-tile
  radius. Rainbow Ball: five in a line. [HS help] [LW: HS]
- **Fishdom, by size not shape.** Four makes a firecracker (adjacent tiles),
  five a bomb, six a dynamite ("extremely rare"). The 2008 PC game gave radii of
  1, 2 and 3 tiles and a color-clearing lightning piece earned by using 7
  explosives in a level. Gardenscapes' own power-up page: not found. [TTP:
  Fishdom] [GZ: Fishdom]
- **Rocket direction differs by game.** Royal Kingdom: a horizontal match makes
  a vertical rocket. Homescapes and Small Town Murders: the swipe direction sets
  it. Toon Blast: random. [RK help] [LW: HS] [Rovio help] [PG: Toon Blast]
- **Where the special appears.** Not stated on any page read for Bejeweled,
  Candy Crush, Royal Match or Homescapes. Triple Town states its rule: the
  merged piece appears "at the position of the last tile placed". [WP: Triple
  Town]
- **Seekers.** Royal Match's propeller picks a random target, and a guide says
  it lands on a tile that counts toward the goal. The Homescapes plane goes for
  goals first and cannot be steered. No source gives a full priority list. [RM
  help 6] [LW: RM] [LW: HS]
- **Toon Blast and Two Dots (contrast).** Toon Blast: tap a group of touching
  cubes; 5 make a rocket, 7 a bomb, 9 a disco ball (one guide says 6 for the
  bomb). Two Dots: draw through two or more dots; a closed loop of four or more
  clears that whole color and turns enclosed dots into bombs. [PG: Toon Blast]
  [GZ: Toon Blast] [WP: Two Dots]
- **Puzzle & Dragons and Panel de Pon (contrast).** Puzzle & Dragons: drag one
  orb anywhere for 5 seconds, swapping with each orb it crosses; every separate
  match is a combo that raises all damage. Panel de Pon: a two-wide cursor swaps
  horizontally only, even into empty space, with no need to match, while the
  stack rises from below. [WP: Puzzle & Dragons] [WP: Panel de Pon]
- **Chuzzle and Pokémon Trozei (slide).** Chuzzle: five connected make a Super
  Chuzzle (3×3 blast); locks freeze a row and a column. Trozei: a line of four
  opens a window of about 2 seconds in which threes count, and after a three,
  pairs count. [WP: Chuzzle] [WP: Pokémon Trozei]
- **Pokémon Shuffle.** After enough matches of the lead Pokémon it Mega Evolves,
  and its matches then erase a pattern: an X, a Y, the columns beside the match,
  or all copies of itself. Skills fire by a chance set by match size (Mega
  Boost: 50%, 100%, 100% for 3, 4, 5). [Serebii]
- **Puzzle Quest, Jewel Quest, Zoo Keeper.** Puzzle Quest: colors give mana,
  skulls hurt the foe, four or more gives an extra turn. Jewel Quest: no
  specials; each square under a match turns gold. Zoo Keeper: a flashing panel
  cycles through the animals and, when tapped, removes all of the one showing.
  [WP: Puzzle Quest] [WP: Jewel Quest] [WP: Zoo Keeper]
- **Best Fiends and Cookie Jam.** Best Fiends: matches damage slugs and
  explosives clear nearby squares; how links are drawn: not found. Cookie Jam:
  not found. [CSM: Best Fiends]

## 3. Combining two specials

- **Candy Crush Saga.** Striped + striped: one line fires along the swipe and
  one from where it ends. Striped + wrapped: a giant candy clears three rows and
  three columns in a cross. Wrapped + wrapped: a 5×5 blast (24 candies). Color
  bomb + striped: every candy of that color turns striped, in random directions,
  and fires. Color bomb + wrapped: that color turns wrapped and goes off (an
  older version fired the bomb twice). Color bomb + color bomb: the whole board
  and one layer off every blocker. Striped + fish: three striped fish. [CC Wiki,
  listing] [GZ: candies] [App Store] [TheGamer]
- **Royal Match (official).** Rocket + Rocket: the row and the column. Rocket +
  TNT: three rows and three columns. TNT + TNT: a four-tile radius (80 tiles,
  says a guide). Propeller + Propeller: three propellers. Propeller + Rocket or
  TNT: carries it to a random tile, clearing neighbors on take-off. Light Ball +
  Rocket, TNT or Propeller: turns the most common color into that power-up.
  Light Ball + Light Ball: clears the board and one layer of everything. [RM
  help 7] [PG: RM]
- **Homescapes (official).** Bomb + Bomb: doubled radius. Bomb + Rocket: three
  rows and three columns. Rocket + Rocket: one row and one column "regardless of
  the rockets' direction". Plane + Bomb or Rocket: carried to a random tile.
  Plane + Plane: three planes at different tiles. Rainbow Ball + Rocket, Bomb or
  Plane: the most common piece type becomes that power-up, fired one by one
  before the next turn. Rainbow + Rainbow: the whole field, one layer. [HS help]
  [LW: HS]
- **The same table elsewhere.** Royal Kingdom, Mystery Matters and Small Town
  Murders publish this table under other names (Spinner, Dynamite, Electro Ball,
  Color Bomb), and Toon Blast's two disco balls also clear the board. It is the
  genre's shared vocabulary. [RK help] [MM help] [Rovio help] [GZ: Toon Blast]
- **Bejeweled.** Two Hypercubes swapped: Bejeweled 2 just destroys them; from
  Blitz on they clear the board. Stars adds Hypercube + Flame or Star (that
  color becomes that gem) and Flame + Star (3×3 plus lines). [BW: Hypercube]
  [BW: Flame Gem]

## 4. How specials are set off

- **By a match of their color.** Bejeweled's Flame and Star gems and Candy
  Crush's striped and wrapped candies go off inside a match, or in a
  special-with-special swap. [B3 readme] [WP: Candy Crush Saga]
- **By a swap with anything.** Hypercubes, color bombs, Light Balls and Rainbow
  Balls take the color of the neighbor they are swapped with. [B3 readme] [HS
  help]
- **By one tap.** Royal Match: "Tap or swap" any power-up. Homescapes: tap; a
  tapped rocket fires in place and a tapped Rainbow Ball takes the color with
  the most tiles. In-game boosters (hammer, arrow, cannon) cost no move; whether
  a tapped power-up costs one: not found. [RM help 6] [LW: HS] [RM help 8]
- **By a double tap.** Fishdom and Small Town Murders ask for a double tap or a
  swap. The Fishdom guide gives the reason: the piece explodes where it sits.
  [TTP: Fishdom] [Rovio help]
- **By a neighbor's blast.** A Flame Gem's 3×3 sets off any special in it. A
  color bomb caught in a blast removes one color. A Hypercube caught in a blast
  fizzles in Bejeweled 2 but, from Blitz on, fires at the color of the gem that
  hit it. [BW: Flame Gem] [GZ: candies] [BW: Hypercube]

## 5. Cascades and resolution

- **Scored as rising steps.** Bejeweled 3: the first cascade adds 50 and each
  later one 50 more, so a three-match with two cascades totals 300; two matches
  from one swap pay 150. Candy Crush: 40 per candy plus 40 per cascade step
  (listing; an older table used 60). [B3 readme] [CC Wiki, listing]
- **Order.** One paper models Candy Crush as deleting simultaneous chains from
  the bottom of the board upward; another models Bejeweled as popping every
  group at the same instant, then gravity, then repeating. [Walsh] [Guala]
- **Crossing matches.** Bejeweled 2 treats crossing matches like a four, and a
  crossing five and three as a Hypercube; Bejeweled 3 gives the cross its own
  gem; Homescapes counts five or six pieces in an L or T as a Bomb. Stars notes
  that some formations "cannot create multiple special gems at once". Priority
  rules for Candy Crush and Royal Match: not found. [WP: Bejeweled 2] [BW:
  Hypercube] [HS help] [BW: Bejeweled Stars]
- **Moving while pieces fall.** Allowed in Zoo Keeper, Panel de Pon, Bejeweled
  Blitz and Bejeweled 3 (not while a Hypercube or Star Gem fires). Pokémon
  Shuffle: "once the combo is started, you have no control". Candy Crush and
  Royal Match: not found. [WP: Zoo Keeper] [WP: Panel de Pon] [BW: Bejeweled
  Blitz] [Serebii]
- **Luck is built in, on purpose.** A score-minimizing bot could not avoid
  cascades: "there are unavoidable situations where a combo is forced to
  happen". Experts told Kapalka that Bejeweled was more luck than skill
  (listing); Blitz later added random multiplier gems because an early build was
  too skill-based. [Mugrai] [GDC 2011] [Kapalka: Blitz]

## 6. No-moves boards and hints

- **Game over, or never.** Shariki and Bejeweled Classic end when no move is
  left. Bejeweled 2 Endless and Bejeweled 3 Zen and Lightning cannot run out of
  moves; how the refill ensures it is not documented. Twist avoids the case
  because a rotation need not match. [WP: Shariki] [B3 readme] [WP: Bejeweled 2]
  [de.WP: Bejeweled]
- **Reshuffle.** Bejeweled Stars: "all the normal gems scramble". Two Dots: an
  automatic reshuffle. Zoo Keeper: the screen resets while the clock runs.
  Puzzle Quest: the board resets for both sides. Candy Crush shuffles, and a
  level can still end with no possible match (listing). Royal Match and Toon
  Blast also offer a shuffle as a booster. [BW: Bejeweled Stars] [WP: Two Dots]
  [WP: Zoo Keeper] [WP: Puzzle Quest] [CC Wiki, listing] [RM help 8] [GZ: Toon
  Blast]
- **Penalty or patch.** Jewel Quest: a stuck board costs a life. Chuzzle: it
  uses up a scramble, and with none left the game ends. Bejeweled 3 Diamond
  Mine: a normal gem turns into a Hypercube. [WP: Jewel Quest] [WP: Chuzzle]
  [BW: Hypercube]
- **Hint timers.** An exact idle time was not found for any major game.
  Bejeweled 2 shows a free hint after "several seconds", and its button costs
  points. Bejeweled 3's button is free, with a cooldown. Homescapes and Royal
  Match hint after "a few seconds"; in Royal Match the pieces wiggle. Zoo Keeper
  on DS rations three hints a game. One indie developer lengthened the delay to
  14 seconds and added an off switch (listing). [WP: Bejeweled 2] [WP: Bejeweled
  3] [LW: HS] [LW: RM] [CSM: Royal Match] [de.WP: Zoo Keeper] [itch.io, listing]

## 7. Goals, loss and end-of-level bonuses

- **Untimed came first.** Bejeweled shipped timed on partners' advice; the
  untimed mode, added as a tutorial, became the main one. Juul calls it the
  game's most important influence. [WP: Bejeweled] [Juul]
- **Move limits.** King's Bubble Witch Saga (about 2010) introduced move-limited
  levels and Candy Crush Saga (2012) made them the model: a goal, a move count,
  stars by score, a life lost on failure. Candy Crush also had timed levels.
  [WP: Tile-matching] [WP: Candy Crush Saga] [de.WP: Candy Crush Saga]
- **Royal Match.** Targets top left, moves top right, no timer, five lives.
  Dream Games states that every level can be finished without boosters or coins.
  [RM help 3] [PG: RM] [WP: Royal Match] [RM help 9]
- **Typical budgets.** Lily's Garden: about 50 collectables in up to 25 moves,
  with extra moves sold in fives. Bejeweled 3 quests: clear 120 to 160 gems in
  20 moves or fewer, or gild the whole grid in 20 or 30. Zoo Keeper: a quota of
  each animal against a shrinking timer. [Kristensen] [B3 readme] [WP: Zoo
  Keeper]
- **Sugar Crush.** Leftover moves turn plain candies into striped ones (about
  four per five moves, says the wiki) and every special on the board goes off.
  The wiki lists 6,000 points per striped candy made; an older page says 3,000
  (listing). [CC Wiki, listing]
- **Royal Match's finish.** One random booster is thrown onto the board per
  leftover move, all of them fire, and each tile removed, cascades included,
  pays a coin. The help pages speak of coins and stars, never points. [Old
  Cynic] [LW: RM] [RM help 3]
- **Other finishes.** Homescapes: leftover moves become power-ups and saved
  moves raise the reward. Toon Blast: each leftover move turns a random tile
  into a rocket, and the celebration can be skipped. Bejeweled Stars: leftover
  moves become special gems that count toward stars. Blitz's "Last Hurrah":
  every special left detonates at time zero. [LW: HS] [GZ: Toon Blast] [CSM:
  Toon Blast] [GZ: Bejeweled Stars] [BW: Bejeweled Blitz]
- **Stars.** Candy Crush and Bejeweled Stars give up to three stars by score
  thresholds (numbers not found). Homescapes gives one star a level. [WP: Candy
  Crush Saga] [BW: Bejeweled Stars] [HS help]

## 8. Scoring formulas

- **Bejeweled 3 Classic (official readme).** Three-match: 50. Making a Flame
  Gem: 100; a Star Gem: 150; a Hypercube: 500. A Flame blast: 50 + 20 + 20 per
  gem. A Star or Hypercube blast: 50 + 50 per gem. Classic multiplies all of it
  by the level number. [B3 readme]
- **Lightning and Blitz.** Base values ×5, so a three-match is 250. Speed bonus:
  200, rising by 100 per quick match to 1,000, then ten seconds in which every
  match explodes like a Flame Gem. A ×2 multiplier gem drops after 12 gems go in
  one move; the cap is ×8. [B3 readme] [BW: Bejeweled Blitz]
- **Candy Crush (listing).** 40 per candy, so 160 for making a striped candy and
  200 for a color bomb; a striped candy set off pays 500 plus 40 per candy. [CC
  Wiki, listing]
- **A research framework.** 60 for three (20 a cell), each extra cell adds 10 to
  every cell, times a multiplier that grows with each cascade and resets on the
  next move. [Mugrai]

## 9. Refill, randomness and fixed sequences

- **Where pieces enter.** From the top in Bejeweled (at random) and Candy Crush.
  From the bottom in Panel de Pon. Soda's candies float up to the soda line.
  Galactrix refills from the direction of the last move. Bejeweled 2's Twilight
  mode changes gravity after every match. [WP: Bejeweled 2] [WP: Candy Crush
  Saga] [WP: Panel de Pon] [WP: Galactrix] [BW: Bejeweled 2]
- **Start boards.** Candy Crush boards "aren't fixed": leaving a level before
  the first move re-rolls the candies. In Lily's Garden the layout is "usually
  predetermined", some start pieces get random colors and drops are random. A
  guarantee of no ready-made match at the start: not found in any source.
  [TheGamer] [Kristensen]
- **Manipulation.** King's Tommy Palm denied per-player difficulty, and King's
  F-1 filing says "We keep the rules of the game economy identical throughout
  the game". A dark-patterns catalogue alleges impossible levels, with no data.
  No documented drop-rate rule was found for any game. [Gamesbrief] [Deceptive
  Patterns]
- **Bots and pass rates.** King simulates many plays of each level to predict
  its pass rate before release, then checks with people; a hard level is often
  followed by a lighter one. [PG.biz]
- **Seeds.** Researchers used 50 fixed seeds so every agent met the same drops.
  With every drop known, deciding whether a score is reachable in k moves is
  NP-hard. A commercial match-three with a seeded daily board: not found.
  [Mugrai] [Walsh] [Guala]
- **Fixed puzzles.** Bejeweled 2 Puzzle: 80 set boards, clear every gem, with
  undo. Tetris Attack Puzzle: a set stack in a set number of moves. Chuzzle Mind
  Bender: rebuild a pattern. Jewel Quest Heritage: a level with a finite supply
  of jewels. [WP: Bejeweled 2] [WP: Tetris Attack] [WP: Chuzzle] [WP: Jewel
  Quest]

## 10. What players complain about and praise

- **Hints that mislead.** Candy Crush suggestions are "typically at random" and
  a guide says "Do not make this move". Homescapes hints "may ignore power-up
  opportunities", and Playrix itself says to use them only when nothing else is
  seen. [TheGamer] [LW: HS] [HS help]
- **Lives and waiting.** Candy Crush: five lives, 30 minutes each. Homescapes:
  24 minutes. Two Dots: 20. Best Fiends' recharge timer is called its main
  drawback. [WP: Candy Crush Saga] [LW: HS] [WP: Two Dots] [CSM: Best Fiends]
- **Spikes, paid moves and streaks.** Royal Match puzzles "get harder quickly",
  some take more than four tries, and continuing costs 900 coins; parents call
  it "rigged". Its streak perks (Butler's Gift from level 32, Super Light Ball
  from level 292) vanish on one failure, and one player says levels turn
  "impossible" while a perk is held. [CSM: Royal Match] [LW: RM] [RM help 78]
  [RM help 234] [Old Cynic]
- **Waiting on the board.** Zoo Keeper: after a level is cleared, chains go on
  resolving while the clock runs and the player cannot act (a cost; no complaint
  is quoted). Toon Blast is praised for a skippable end celebration and for
  "more than enough moves". [WP: Zoo Keeper] [CSM: Toon Blast]
- **Punishing slips and luck.** Puzzle Quest: an errant swap costs hit points
  and the AI seems to "see several turns ahead". Galactrix: "luck as much as
  skill". [GZ: Puzzle Quest] [WP: Galactrix]
- **Accidental set-offs.** No complaint was found in the pages read. Royal Match
  and Homescapes fire on one tap; Fishdom and Small Town Murders ask for two
  (the risk on touch screens is inferred).
- **Praise for restraint and teaching.** Kapalka cut two-way rotation, ice gems
  and most power gems from Twist, and watches testers instead of asking them.
  Royal Match and Toon Blast are praised for clear instructions with each new
  element. [Kapalka: Twist] [CSM: Royal Match] [CSM: Toon Blast]

## 11. Twists that would suit living pieces

- **Pieces that climb.** Bejeweled 3 Butterflies: butterfly gems rise one space
  a turn and the game ends if one reaches the top; captures pay 1,000, plus 25
  for each one after. Gardenscapes ladybugs climb one tile per move. [B3 readme]
  [GS help: ladybugs]
- **Shy pieces.** A Gardenscapes snail comes out of its shell as matches are
  made beside it; one turn without such a match and it hides again. [GS help:
  snail]
- **Wanderers.** Triple Town bears step to a neighboring square each turn; a
  trapped bear becomes a gravestone and three gravestones merge into a church.
  [WP: Triple Town]
- **Moving lanes.** Gardenscapes' Stream carries pieces on lily pads one step
  per move. Bejeweled Stars has currents that shift gems after every move and
  clouds that give a free move into an empty slot. [GS help: stream] [BW:
  Bejeweled Stars]
- **Charge meters.** Twist: a chain meter climbs to ×10, then yields a Fruit
  Gem. Fishdom: lightning after 7 explosives. Gardenscapes Energy Spheres: all
  linked, charged by four matches or blasts beside any of them, then they
  explode. Candy Crush Friends: a character acts after enough candies of its
  color. [WP: Bejeweled Twist] [GZ: Fishdom] [GS help: spheres] [WP: Candy Crush
  Saga]
- **Merging and big pieces.** Triple Town merges three into the next tier. Hexic
  upgrades the center of a flower of six. Chuzzle's Fat Chuzzle fills a 2×2
  space and pops as one, and a popped Chuzzle's eyes fly to the flask that is
  the level meter. [WP: Triple Town] [WP: Hexic] [WP: Chuzzle]
- **Spreading and ticking.** Candy Crush Jelly: a match touching jelly spreads
  it to the rest of the match. Bejeweled 2's bombs tick down one a move; Twist's
  Doom Gem ticks only on moves that match nothing. [WP: Candy Crush Saga] [WP:
  Bejeweled 2] [WP: Bejeweled Twist]

## What this suggests for Fuzz Flux

1. Use a 7-wide board, 8 or 9 tall, and cap colors at six, with four or five on
   early levels. Documented boards run from 6×5 to 9 wide, and Pokémon Shuffle
   shows that removing one kind is a strong easing lever.
2. Keep the four-shape vocabulary under our own names: line of four, 2×2 square,
   L or T, line of five. Royal Match, Homescapes, Royal Kingdom and Small Town
   Murders share it, so many players arrive knowing it.
3. Put a new special on the cell the player moved into, and on the crossing or
   middle cell when a cascade makes it, and print that rule. No big game
   documents its rule; Triple Town's "last tile placed" is the clear one.
4. Fix the line clearer's direction by one stated rule, such as "it runs the way
   you swiped", and draw the direction on the piece. Three games use three
   different rules, and Toon Blast's random direction cannot be planned around.
5. Set a special off by a swap, or by a second tap on a selected special (Enter
   on the keyboard), never by one tap. A double tap, as in Fishdom, avoids the
   accidental blast a single tap invites on a phone (inferred).
6. Ship the whole combination table at launch, in the shared form: line + line,
   line + blast, blast + blast, seeker carries, three seekers, color + special
   converts, color + color clears all. Five games publish that table.
7. Give seekers a published target order (goal pieces, then blockers, then the
   nearest piece) and show the target before the flight. "Random element"
   targeting is where the paid games are least clear.
8. Let a blast set off any special it touches, and make a color clearer caught
   in a blast take the color of the piece that hit it. Bejeweled moved from a
   fizzle to that rule, and it makes chains readable.
9. Score cascades as rising additive steps, as Bejeweled 3 does (+50, +100,
   +150), and publish one small table. A flat table is easy to check and easy to
   speak aloud.
10. Never end or punish a stuck board: scramble the plain fuzzballs only, keep
    specials and blockers in place, and promise a move after it. Start every
    board with no ready match and say so. Bejeweled Stars scrambles this way;
    Jewel Quest's lost life is the rule to avoid.
11. Make the hint a setting with a delay and an off switch, show the strongest
    move rather than the first one found, and let the fuzzballs glance at it
    before they wiggle. Random hints are a named complaint in two games.
12. Use move limits, no clock and no lives, and convert leftover moves into
    specials in a closing burst that one tap skips. Candy Crush, Royal Match,
    Homescapes and Toon Blast all end this way, and Toon Blast is praised for
    the skip.
13. Lock input while a turn resolves, keep resolution quick, and offer a speed
    setting. Input during falls came in with timed Blitz, and Pokémon Shuffle,
    which counts moves, locks it.
14. Seed every level and the daily board, so the same moves always give the same
    drops, and say plainly that drops are never adjusted. "Rigged" is a charge
    made against both Candy Crush and Royal Match.
15. Add a puzzle set with fixed boards, fixed drops and undo. Bejeweled 2's 80
    puzzles and Tetris Attack's puzzle mode show the format works beside the
    random game.
16. Make blockers into creatures: a shy fuzzball that hides again if ignored, a
    climber that rises a row per move, a napper that wanders a step each turn.
    Snails, ladybugs, butterflies and bears already play these parts in the big
    games.
17. Add one charge meter, a "bunch" that fills as specials go off and then hands
    the player a color clearer. Twist, Fishdom and Gardenscapes all use such a
    meter, and it rewards play without a store.
18. Certify every level with a bot that plays its seed many times, and set the
    move count from the pass rate. King predicts pass rates this way, and Royal
    Match's claim that every level is beatable comes with no published check.

## Sources

- [WP: name] English Wikipedia, https://en.wikipedia.org/wiki/ followed by:
  Shariki, Bejeweled_(video_game), Bejeweled_2, Bejeweled_3, Bejeweled_Twist,
  Candy_Crush_Saga (its text also covers Soda, Jelly and Friends), Royal_Match,
  Jewel_Quest, Puzzle_Quest:_Challenge_of_the_Warlords, Puzzle_Quest:*Galactrix,
  Pokémon_Trozei!, Zoo_Keeper*(2003_video_game), Chuzzle, Panel_de_Pon,
  Tetris_Attack, Puzzle_%26_Dragons, Two_Dots_(game), Triple_Town, Hexic,
  10000000_(video_game), Tile-matching_video_game
- [de.WP: name] German Wikipedia, https://de.wikipedia.org/wiki/ followed by:
  Candy_Crush_Saga, Zoo_Keeper, Bejeweled
- [B3 readme] https://bejeweled.wiki.gg/wiki/Bejeweled_3/readme.html
- [BW: name] Bejeweled Wiki, https://bejeweled.wiki.gg/wiki/ followed by:
  Bejeweled_2, Bejeweled_Blitz, Bejeweled_Stars, Hypercube, Flame_Gem
- [Juul] https://www.jesperjuul.net/text/swapadjacent/
- [Kapalka: Twist]
  https://www.gamedeveloper.com/design/casual-game-design-popcap-s-jason-kapalka-and-i-bejeweled-twist-i-
- [Kapalka: hexes]
  https://gamedeveloper.com/design/popcap-s-kapalka-on-why-hexes-are-repellent-to-casual-gamers
- [Kapalka: Blitz]
  https://gamedeveloper.com/game-platforms/gdc-europe-popcap-s-kapalka-talks-i-bejeweled-blitz-i-origins-calls-social-games-a-bit-evil-
- [GDC 2011] luck remark from the listing of
  https://gamedeveloper.com/game-platforms/gdc-2011-popcap-i-bejeweled-i-s-sexy-action-cool-origins
- [RM help N] Royal Match help,
  https://dreamgames.helpshift.com/hc/en/3-royal-match/faq/ followed by:
  3-how-do-i-play-royal-match/, 6-creating-and-using-the-power-ups/,
  7-power-up-combinations, 8-using-boosters/, 9-level-is-too-hard-1661775375/,
  78-what-is-butler-s-gift/, 234-what-is-the-super-light-ball/
- [RK help] Royal Kingdom help,
  https://dreamgames.helpshift.com/hc/en/6-royal-kingdom-1676903479/faq/
  followed by: 177-power-ups, 178-power-up-combinations
- [HS help] Homescapes help,
  https://playrix.helpshift.com/hc/a/14-homescapes/faq/ followed by:
  16313-power-ups-and-how-to-use-them,
  16363-what-power-up-combinations-are-available-in-the-game; and
  https://playrix.helpshift.com/hc/en/14-homescapes/faq/ followed by:
  1087-how-do-i-play-match-3-levels/, 5905-how-to-beat-a-difficult-level/
- [GS help: name] Gardenscapes help,
  https://playrix.helpshift.com/hc/en/5-gardenscapes/faq/ followed by:
  956-stream/, 6565-snail/, 7578-ladybugs/, 5913-energy-spheres/
- [MM help]
  https://playrix.helpshift.com/hc/en/22-mystery-matters/faq/11752-how-do-power-up-combinations-work/
- [Rovio help]
  https://roviosupport.helpshift.com/hc/en/18-small-town-murders-match-3/faq/
  followed by: 2187-what-are-power-ups,
  2185-what-are-the-different-power-up-combinations
- [LW: HS]
  https://www.levelwinner.com/homescapes-guide-2020-update-tips-tricks-strategies-to-complete-levels-fast/
- [LW: RM] https://www.levelwinner.com/?p=42515
- [PG: RM] https://www.pocketgamer.com/royal-match/tips-and-tricks
- [PG: Toon Blast]
  https://www.pocketgamer.com/toon-blast/toon-blast-cheats-tips-and-tricks/
- [PG.biz]
  http://www.pocketgamer.biz/crafting-candy-crushs-difficulty-blockers-level-design-ai-and-the-complexity-staircase/
- [Old Cynic] https://oldcynic.com/?p=47891
- [CSM: name] Common Sense Media, https://www.commonsensemedia.org/app-reviews/
  followed by: royal-match, toon-blast, best-fiends
- [GZ: name] Gamezebo, https://www.gamezebo.com/ followed by:
  walkthroughs/candy-crush-candies/,
  walkthroughs/toon-blast-tips-cheats-and-strategies/,
  walkthroughs/bejeweled-stars-tips-cheats-and-strategies/,
  reviews/fishdom-review/,
  reviews/puzzle-quest-challenge-of-the-warlords-review/
- [TTP: Fishdom]
  https://www.touchtapplay.com/fishdom-deep-dive-cheats-tips-strategy-guide/
- [App Store] https://apps.apple.com/us/story/id1345013592
- [TheGamer] https://www.thegamer.com/candy-crush-tips-tricks-pro-players/
- [Gamesbrief]
  https://www.gamesbrief.com/2014/02/if-king-fixes-candy-crush-saga-to-make-you-pay-more-based-on-your-behaviour-they-are-going-to-prison
- [Deceptive Patterns]
  https://deceptive.design/articles/candy-crush-saga-impossible-levels
- [Serebii] https://www.serebii.net/shuffle/ and its pages mechanics.shtml,
  megaevolution.shtml, abilities.shtml
- [Walsh] Candy Crush is NP-hard: https://ar5iv.arxiv.org/html/1403.1911
- [Guala] match-three is NP-hard: https://ar5iv.labs.arxiv.org/html/1403.5830
- [Mugrai] playtesting bots: https://ar5iv.labs.arxiv.org/html/1907.06570
- [Kristensen] Lily's Garden bots: https://ar5iv.labs.arxiv.org/html/2007.01542
- [CC Wiki, listing] not opened (HTTP 402): https://candycrush.fandom.com/wiki/
  followed by: Special_Candy, Candy, Wrapped_Candy, Sugar_Crush, Points
- [itch.io, listing] not opened: https://itch.io/post/1850311
