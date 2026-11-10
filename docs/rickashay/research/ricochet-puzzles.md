# Rickashay research: one-shot ricochet and bank-shot puzzle games

Read on 2026-11-10 for the Rickashay design: store pages, reviews, wikis, guides, forum posts and design essays. No source code was opened (see the last section). It adds to, and does not repeat, "What other games teach" in `docs/brick-fuzz-pop/plan.md`.

How to read it:

- Everything is paraphrase; one phrase in the whole file is quoted from a source (in section 3).
- **(snippet)** means the claim was seen only in a search result's summary of the page, because the page itself refused the fetch (403, 402, 404 or 429). Treat those as leads, not as checked facts.
- **(inferred)** means it is my reading for Rickashay, not something a source said.
- Lines beginning _Not found_ say where I looked and came back empty.

## 1. Level layout for reflections

### Okay? (Philipp Stollenmayer, 2015)

- The rule: one drawn line launches one ball; it ricochets off rectangles, circles and triangles, and every white shape it touches vanishes; the level is won only if one shot clears them all. ([App Store story](https://apps.apple.com/dk/ipad/story/id1654494758), [developer's page](https://www.kamibox.de/okay))
- The field has no walls. A ball that leaves the screen ends the attempt at once, so the shapes are the only reflectors and the final shape must be hit while the ball is still on screen. ([Level Winner guide](https://www.levelwinner.com/?p=8875))
- The player chooses both where the shot starts and its direction, so there are two things to tune, not one. ([TapTap review](https://www.taptap.io/post/6009669))
- How it grows, by section: levels 1 to 50 are plain (white background); 51 to 100 are what the reviewer calls recursive levels (red background), where the ball wraps round the screen edges instead of leaving; 101 to 150 are boss levels mixing both. The red set first shipped as a pack of 25. ([TapTap review](https://www.taptap.io/post/6009669), [Pocket Gamer](https://www.pocketgamer.com/okay/minimalist-ios-puzzler-okay-has-been-downloaded-3-million-times-gets-new-red-lev))
- Piece types it adds along the way, and what each does to the ball ([TapTap review](https://www.taptap.io/post/6009669)):
  - White block: reflects the ball and vanishes; all must go.
  - Black block: an obstacle that is not a target. (inferred: it reflects and stays, so it is the game's permanent wall and the piece bank shots are built from)
  - String: must be cleared, but the ball passes through it without turning. A target that does not cost a bounce.
  - Moving block: a target on a path, so the shot now has timing as well as angle.
  - Ghost block: the ball has to pass through it once before it counts. The review does not say whether it then turns solid; either way it forces a second visit or a set route.
  - Wormhole: swallows the ball on touch. A hazard that shapes the route by exclusion.
- Each hit sounds a note, and later levels arrange the shapes so the right solution plays a melody; a later update added 25 levels built as songs. A correct route is audibly correct. ([appgefahren](https://www.appgefahren.de/?p=198602), [App Store listing](https://apps.apple.com/us/app/okay/id962050549))
- Ordering advice from Apple's editors: take the small, still target first and the big or forgiving ones last, because a tiny target is far harder to hit after several bounces among moving things. ([App Store story](https://apps.apple.com/dk/ipad/story/id1654494758))
- Players' aggregate praise is for new mechanics arriving at a steady pace and for instant restarts; their aggregate complaints are in section 8. ([GameBrain summary](https://gamebrain.co/game/okay))
- Not found: any interview or postmortem in which Stollenmayer explains how he built or ordered the levels. His own page gives one line of description.

### Breakout and its descendants: chambers, tunnels, traps

- The oldest structure for keeping a ball up is Breakout's tunnel: open a column at one end of the wall, send the ball through, and it rattles between the ceiling and the back of the wall, clearing bricks from behind. DeepMind's learning agent famously found this by itself. ([Google Research blog](https://research.google/blog/from-pixels-to-actions-human-level-control-through-deep-reinforcement-learning/))
- The original pushes back when the ball gets up there: speed steps up after 4 and 12 hits and on reaching the upper rows, and the paddle halves once the ball touches the top wall. Reaching the chamber is rewarded and taxed in the same moment. ([Wikipedia: Breakout](<https://en.wikipedia.org/wiki/Breakout_(video_game)>))
- Mark Nelson's 2007 design essay names layout archetypes for brick games: central mass with open space round it, wall (with gaps left at the sides), columns, mesh, bumper clusters, peek-a-boo (bricks that hide or slide in), angle (diagonals), split screen, cavern (a concave shape open at the lower centre), arena, and pictures. ([Game Developer](https://www.gamedeveloper.com/design/breaking-down-breakout-system-and-level-design-for-breakout-style-games))
- The same essay's pieces for steering a ball: a ball trap is a small gap that holds a ball until the player breaches it; unbreakable blocks exist to limit access or to channel the ball again and again; a channel fixes the ball onto a new line; a wedge sends it back at an angle that is hard to predict. ([Game Developer](https://www.gamedeveloper.com/design/breaking-down-breakout-system-and-level-design-for-breakout-style-games))
- Its warnings: a screen crowded with blocks gives the ball nowhere to go and makes a dull start; a block that is nearly impossible to reach adds minutes; difficulty should plateau between climbs; and if a ball bounces for long with nothing for the player to do, the game should intervene. ([Game Developer](https://www.gamedeveloper.com/design/breaking-down-breakout-system-and-level-design-for-breakout-style-games))
- Ricochet Lost Worlds (Reflexive) made moving formations its signature: bricks slide, float, sway, vibrate, spin, break into pieces and change type, and whole columns ripple like a shoal. ([Retro Replay](https://retro-replay.com/db/macintosh/ricochet-lost-worlds))
- Ricochet Infinity's level ideas, as far as reviews describe them:
  - Rings: five golden rings a level, set in hard-to-reach places, as a second goal beside clearing bricks. The catch is that play stops when the last brick breaks, so rings must be collected before finishing; the ring turns clearing fast into clearing in the right order. ([Wikipedia](https://en.wikipedia.org/wiki/Ricochet_Infinity), [Gamezebo preview](https://www.gamezebo.com/upcoming/ricochet-infinity-preview/))
  - Picture levels that move: a car and a truck drifting through space, a helicopter whose two rotors spin. ([Altered Gamer](https://www.alteredgamer.com/other-games/68776-ricochet-infinity-breakout-review))
  - Locked bricks: some cannot be broken by the ball at all and need a rocket trigger or an acid power-up, so a level has an order of operations. ([Altered Gamer](https://www.alteredgamer.com/other-games/68776-ricochet-infinity-breakout-review))
  - A level editor whose selling point was more complex brick movement, feeding a large library of player-made sets. ([Wikipedia](https://en.wikipedia.org/wiki/Ricochet_Infinity), [Ricochet Universe wiki](https://wiki.ricochetuniverse.com/wiki/Ricochet_Infinity))
- Not found: a write-up of Infinity's individually famous levels. Giant Bomb, MobyGames and StrategyWiki refused the fetch and Jay Is Games timed out; the Ricochet Universe wiki's brick page is a stub.

### Bullet, cube and laser puzzlers

- Ricochet Kills 3 hides targets behind cover so the only line is off a wall, and adds exploding barrels and crates that fall on targets, so one bullet can start a chain. Ricochet Kills: Noir adds one such object every few levels. ([Addicting Games](https://www.addictinggames.com/shooting/ricochet-kills-3), [GameBrain: Noir](https://gamebrain.co/game/ricochet-kills-noir))
- Ricochet Kills lets the screen's edges act as walls even where nothing is drawn. (snippet, [Jay Is Games](https://games.jayisgames.com/review/ricochet-kills-3-level-pack.php))
- Mr Bullet builds from straight shots to platforms, breakable boxes, rolling balls and TNT, and varies the goal rather than the geometry: hostages that must not be hit, levels where the shooter can hit himself, and series that share one ammunition pool. ([Common Sense Media](https://www.commonsensemedia.org/app-reviews/mr-bullet-spy-puzzles), [InReview](https://inreviewcritics.com/2019/09/30/kill-the-bad-guys-mr-bullet-mobile-game-review))
- Ping 1.5+ and Ping Redux (a cube bounced to a target) use walls, spinning and moving pieces, narrow openings and mazes; some stages give one shot with many bounces, others several shots with few. ([Nintendo Life](https://nintendolife.com/reviews/wiiu-eshop/ping_15plus), [Nintendo World Report](https://www.nintendoworldreport.com/review/38831))
- Trick Shot adds, in order, walls, fans, portals, buttons and moving parts; Trick Shot 2 adds switches and teleporters over nine chapters and ships an editor with 48 pieces. It has gravity, so less carries over. ([Pocket Gamer](https://www.pocketgamer.com/trick-shot/trick-shot-fun-floaty-flawed/), [MacStories](https://www.macstories.net/reviews/game-day-trick-shot-2/))
- Lazors has four pieces: a block that reflects, a glass block that both reflects and passes the beam, a dark block that absorbs it, and a fixed block. Its levels come in packs of ten, each pack built on one idea (two crossing beams; tiny grids; absorbers), and its boards are about four cells square with many reflections packed in. ([Nontrivial Games](https://nontrivialgames.blogspot.com/2013/02/lazors-review.html))
- Laser Maze (ThinkFun) grades 60 cards from beginner to expert; a card fixes some pieces, lists the pieces that must all be used, and states how many targets must light. Its pieces include a beam splitter, a blocker, a checkpoint the beam must pass, and pieces that are mirror and target at once. (snippet, [Ravensburger product page](https://www.ravensburger.co.uk/en-GB/products/games/logic-games/laser-maze-76340))
- Ricochet Robots is reflection's cousin: a piece slides until something stops it, the second edition adds diagonal walls that turn it 90 degrees, and the other robots are movable stoppers. ([Wikipedia](https://en.wikipedia.org/wiki/Ricochet_Robots), [Zatu review](https://zatu.com/blogs/reviews/ricochet-robots-review))
- Not found: anything solid on the Chromatron family or Deflektor; searches returned unrelated games.

### Reading for Rickashay (inferred)

- The recurring structures reduce to a short vocabulary: a **door** (one open column or cell), a **chamber** behind it (ceiling above, wall below), a **pocket** (a ball trap one or two cells wide), a **corridor** (two parallel faces), a **mesh** (alternating cells), a **cavern** (concave, open below) and **permanent pieces** that channel. Every one of them is expressible on a nine-wide grid of square cells.
- Because Rickashay's ball bounces even off a brick it destroys, a chamber erodes from inside as it pays out: the shot that enters by a door widens it. That is Breakout's tunnel with a built-in ending, and it is the game's central picture.
- Okay?'s string (a target that costs no bounce), ghost (visit twice) and wormhole (ends the flight) show that new pieces are most useful when they change the _route_, not the damage. A ring-like bonus that only counts while the ball is still up is the Ricochet Infinity lesson.
- Packs built on one idea each (Lazors) fit the plan's rule of one new thing at a time better than a single rising curve.

## 2. Teaching the bank shot

- Okay? teaches almost nothing in words. Its tip guides tell players to read the aim line for the first bounce, then learn the rest from misses. Aggregated player reviews list thin tutorials as a complaint. ([Level Winner guide](https://www.levelwinner.com/?p=8875), [GameBrain summary](https://gamebrain.co/game/okay))
- Ricochet Kills and Mr Bullet teach by cover: the first banked level is simply one where the straight line is blocked and a wall is the only way. ([Addicting Games](https://www.addictinggames.com/shooting/ricochet-kills-3), [Common Sense Media](https://www.commonsensemedia.org/app-reviews/mr-bullet-spy-puzzles))
- Lazors gives no more hand-holding than it must; reviewers accept that because early boards are tiny. ([Common Sense Media](https://www.commonsensemedia.org/app-reviews/lazors))
- Ping shows one prompt on the first level and, early on, tells the player to get used to the restart button. ([Pure Nintendo](https://purenintendo.com/?p=141822))
- 8 Ball Pool has a cushion-shot demonstration that appears only on some of its tables. (snippet, [Miniclip support](https://support.miniclip.com/hc/en-us/articles/6630561650833)) A tips site says its offline practice mode draws cushion rebounds while online play does not, and advises one-rail banks first, then two. That site is not official and contradicts itself once, so treat it as unconfirmed. ([Best for Android](https://bestforandroid.com/8-ball-pool-tips-tricks/))
- Bubble-shooter guides all give the same staged advice: learn banks with the dotted line on, which draws the path after the wall, then play with it off. ([itch.io thread on a Puzzle Bobble-style game](https://itch.io/post/17640937) for the player's view; the guide sites were seen as snippets only)
- Real pool teaches the bank as aiming at a reflection: picture the table mirrored across the rail and shoot at the mirrored pocket; where that line crosses the rail is the aim point. The target the player looks at is outside the table. ([Dr. Dave: mirror system](https://drdavepoolinfo.com/faq/bank-kick/mirror/))
- Kirby's Dream Course lets the player test a bank before committing: swing the guide past a barrier and see where the path goes. ([Negative World guide](https://www.negativeworld.org/boardreplies.php?id=11517))
- Not found: whether the arcade Puzzle Bobble shows a guide line only in early rounds or after a continue. I could not confirm it either way.
- Reading for Rickashay (inferred): the cheapest lesson is a first wall whose only gap cannot be reached straight. The pool trick suggests a teaching picture no game read uses: draw the _mirrored field_ faintly beyond the side wall, so that aiming at the reflection of the gap is literally visible.

## 3. How far the guide goes

- Okay?: a line the player draws; one tip guide says it is "only accurate for the first bounce". Always on. ([Level Winner guide](https://www.levelwinner.com/?p=8875))
- Mr Bullet: a laser while the finger is held. No source says whether it continues past the first surface. ([Gamezebo guide](https://www.gamezebo.com/walkthroughs/mr-bullet-spy-puzzle-guide-tips-cheats-and-strategies/))
- 8 Ball Pool: a line to the object ball, then two short lines for where each ball goes after contact. Its length is an upgrade: cues with a higher Aim stat draw it longer. It can be turned off for offline play (that detail is a snippet from Miniclip support). ([Pocket Gamer guide](https://www.pocketgamer.com/8-ball-pool/8-ball-pool-your-quick-start-guide-to-potting-like-a-pro), [Best for Android](https://bestforandroid.com/8-ball-pool-tips-tricks/))
- 8 Ball Champions sells the bounce itself: a Rail Guide booster, spent on one shot, draws how the ball leaves the cushion; a separate Aim Assist booster strengthens the plain line. ([Kazoo help](https://kazoo.helpshift.com/hc/en/4-8-ball-champions/faq/61-how-to-use-different-booster))
- Kirby's Dream Course: two lengths, short by default and long on a button, free and at any time; the long one changes nothing about the shot. On lofted shots it shows where the first two bounces land, and a full-power shot follows it exactly. ([Negative World guide](https://www.negativeworld.org/boardreplies.php?id=11517))
- Puzzle Bobble-style games: one player of a new one argued that the short line should be the default and the long one a beginner's option, because a long line makes it almost impossible to miss and missing is part of the game. The developer shipped it. ([itch.io](https://itch.io/post/17640937), [itch.io](https://itch.io/post/17636907))
- Bounceshot has no aim cursor at all, and that is its players' main complaint. ([GameBrain summary](https://gamebrain.co/game/bounceshot))
- nGolf draws the ball's path and was reviewed as far too easy; Putter King removes the line on some holes for variety. ([TheSixthAxis](https://www.thesixthaxis.com/2024/01/16/ngolf-review/); Putter King is a snippet from TouchArcade)
- One Shot Wonder is reported to improve the gun's sight as an upgrade until it shows the bullet's path. (snippet, [RAWG](https://rawg.io/games/one-shot-wonder))
- Last shot's trail: Angry Birds keeps the previous bird's flight on screen as a row of dots, and players use it both to correct a miss and to repeat a hit. (snippet from the Angry Birds fan wiki at angrybirds.fandom.com, which refused the fetch) Okay?'s guides tell players to adjust from the last miss, but I found no source saying it draws that miss. None of the ricochet puzzlers read is confirmed to show a last-shot trail.
- Pattern across them: to the first surface is the floor; one bounce past it is the common ceiling; anything longer is either sold (8 Ball Pool's cues, Champions' booster, One Shot Wonder) or offered as a beginner's setting. Nobody read shows the whole path by default. A full path is called too easy (nGolf, the Puzzle Bobble thread); no aid at all is called frustrating (Bounceshot); and the first-bounce-only line is where the trial-and-error complaints sit (Okay?, section 8).
- Reading for Rickashay (inferred): every game above lets the player retry the same position, so a short guide plus a remembered miss is enough. Rickashay has no retry: the wall moves each round. So its guide has to carry what the retry carries elsewhere, and first surface plus one bounce is the least that is fair. A last-shot trail is still worth drawing, as the thing that teaches geometry between rounds.

## 4. Precision

- Okay?: the commonest complaints are that later levels want pixel-exact aim on a touchscreen and that a near miss means waiting for moving pieces to come round again. What softens it is the instant restart. One reviewer asks for a hint that shows the _range_ of angles that work. ([GameBrain summary](https://gamebrain.co/game/okay), [TapTap review](https://www.taptap.io/post/6009669))
- Ping 1.5+: aiming at narrow openings felt imprecise, a 2.5D view misled the eye, and shots that looked right went wrong; the remake eased clear conditions. Its good idea is that time slows while the next shot is being aimed. ([Nintendo Life](https://nintendolife.com/reviews/wiiu-eshop/ping_15plus), [Seafoam Gaming](https://seafoamgaming.com/2020/07/06/ping-redux-ps4-review/))
- 8 Ball Pool offers an Aiming Wheel beside drag-to-aim: a strip that turns the cue finely and ignores the sensitivity setting. (snippet, [Miniclip support](https://support.miniclip.com/hc/en-us/articles/35451942766865-Basic-Controls-Improving-your-skills-8-Ball-Pool))
- A Little Golf Journey splits the trade on two triggers: one adds power and risk of swerve, the other steadies the shot onto the exact line. ([Nintendo Life](https://nintendolife.com/reviews/switch-eshop/a-little-golf-journey))
- Trick Shot 2's controls were called over-sensitive (snippet, 148Apps); House of Golf's aim was called twitchy when lining up (snippet, Nintendo Life); a freeware mini-golf was faulted on its bank-shot holes in particular (snippet, Retro Replay).
- Bust-a-Move: the SNES port is said to have a slow-aim control that a fan patch back-ported to the Neo Geo version, and a DS review found digital aiming skipped angles so players overshot. (both snippets)
- Real pool's answer to imprecision is calibration: test the table, then shift every aim by a fixed amount if it plays long or short. ([PoolDawg](http://www.pooldawg.com/article/three-rail-kicking-systems))
- Undo: none of the games read undoes a shot. All rely on a fast restart of the same position.
- Not found: a ricochet puzzler that advertises a coarse set of aim steps or snap angles. The plan already records Peggle's stepped aim.
- The maths of why some of these feel like luck is in section 7: flat walls keep errors small, round and slanted ones multiply them.
- Reading for Rickashay (inferred): Okay? reviewer's wish, a band of angles that all work, is the fair-play test for a level: the intended door should stay open across several adjacent aim steps. A step-by-key aim and a fine strip like the Aiming Wheel answer the touch complaints.

## 5. Bounce budgets

- Ricochet Kills: a bullet passes through several targets but dies after a limited number of bounces. (snippet from a portal description; the page 404s) Not found: how the limit is shown.
- Ping 1.5+ and Redux: each stage sets a maximum number of bounces and shots; go over and the cube breaks and the stage restarts. Fewer bounces earn more of three stars. The original was marked down for clear conditions that felt like sudden walls; the remake loosened them and was better liked. No review says how the count is displayed. ([Nintendo World Report](https://www.nintendoworldreport.com/review/38831), [Seafoam Gaming](https://seafoamgaming.com/2020/07/06/ping-redux-ps4-review/), [Pure Nintendo](https://purenintendo.com/?p=141822))
- Three-cushion billiards is the counts-only-after-N-bounces rule as a whole sport: the cue ball must touch cushions three times before it reaches the second ball. ([Wikipedia](https://en.wikipedia.org/wiki/Three-cushion_billiards))
- Bounceshot requires every shot to be banked; players like the mechanic when it lands and say the puzzle rooms slow it into trial and error. ([GameBrain summary](https://gamebrain.co/game/bounceshot))
- Wii Play's Tanks: the player's shell ricochets once, and one enemy type's shells twice, so the count is learned per tank colour, not shown as a number. (snippet, TV Tropes and others)
- Peggle 2's Off the Wall award needs the ball to travel a set fraction of the screen after the wall before the peg counts, which stops a wall-hugging nudge from qualifying. (snippet, Twinfinite)
- Laser Maze prints the budget on the card: how many targets must light and which pieces must all be used. (snippet)
- Mr Bullet treats extra bounces as a special ammunition type for certain levels. ([Gamezebo guide](https://www.gamezebo.com/walkthroughs/mr-bullet-spy-puzzle-guide-tips-cheats-and-strategies/))
- Reading for Rickashay (inferred): every budget found is a _cap_ (die after N) or a _gate_ (count only after N). Rickashay wants the opposite, a tally that grows, so the nearest model is Ping's stars turned upside down: thresholds of bounces per shot, stated before the shot. Ping's history says to keep them as honours, never as conditions for going on.

## 6. Scoring a shot's elegance

- Fewer shots: Mr Bullet gives three stars for using only the gold bullets and takes one away per extra bullet, with the counter at the top of the screen. A critic notes the stars mean little because most setups solve in seconds. ([Gamezebo guide](https://www.gamezebo.com/walkthroughs/mr-bullet-spy-puzzle-guide-tips-cheats-and-strategies/), [Common Sense Media](https://www.commonsensemedia.org/app-reviews/mr-bullet-spy-puzzles))
- Ricochet Kills scores fewer shots and faster clears higher and unlocks bonus levels for scoring well; Noir's players call the perfect score very hard, as a point in its favour. ([Addicting Games](https://www.addictinggames.com/shooting/ricochet-kills-3), [GameBrain: Noir](https://gamebrain.co/game/ricochet-kills-noir))
- Ping: stars for fewer bounces; stars open worlds, but not every star is needed, so a hard stage can be skipped. A reviewer says success satisfies because the player knows the shot was meant. ([Seafoam Gaming](https://seafoamgaming.com/2020/07/06/ping-redux-ps4-review/), [Pure Nintendo](https://purenintendo.com/?p=141822))
- Trick Shot grades the same success two ways: in off the rim is passable, a clean drop without touching the box is perfect. (snippet, TouchArcade and others)
- Peggle 2 names its flourishes: Off the Wall (bank into a scoring peg), Long Shot (peg to distant peg), Extreme Slide (a dozen pegs in one slide), Kick the Bucket (the last peg off a bucket bounce), Lucky Bounce. The guide's advice is to always try for the last-peg one. ([Engadget](https://www.engadget.com/2013-12-09-stiq-tips-peggle-2-guide.html))
- Ricochet Infinity's rings are elegance as collection: optional, placed where a careless clear will never reach, and lost if the level ends first. ([Wikipedia](https://en.wikipedia.org/wiki/Ricochet_Infinity))
- Dangerous Golf pays a large bonus for a blind triple bank shot but steers putts toward the hole, so roughly right angles are enough. (snippet, Game Informer)
- Okay? scores nothing: a level is cleared or not, and the reward is the tune.
- Which feel earned (inferred from the above): awards for a thing the player can see and call before the shot (a bank, the last target, a ring in a pocket) are praised; awards for totals that depend on a long chain nobody could read are what reviews call luck. Peggle's minimum-distance rule and Dangerous Golf's assisted putts show the two ways a bank bonus goes cheap: when it can be had by accident and when the game aims it for you.

## 7. The real-world maths players use

- Mirror image: reflect the target across the rail and aim at the reflection; the crossing point on the rail is the equal-angle aim point. Dr. Dave calls it a starting reference only, to be corrected for speed, spin and distance. ([Dr. Dave: mirror system](https://drdavepoolinfo.com/faq/bank-kick/mirror/))
- Diamonds: the marks on the rails serve as a coordinate system, turning a vague angle into counted reference points. A counting drill is said to take most players from missing half their one-rail kicks to making most of them within an hour. ([Quarter King Billiards](https://quarterkingbilliards.com/kick-shots-kicking-systems-mirror-diamond-aiming-2026/))
- Two rails: the same mirror logic chained across two cushions; from here pace decides it, because each added rail multiplies an error in speed. ([Quarter King Billiards](https://quarterkingbilliards.com/kick-shots-kicking-systems-mirror-diamond-aiming-2026/))
- Three rails: nobody does it by eye. The Corner-5 system, the best known of the diamond systems, numbers the rails and subtracts: departure minus arrival gives the aim point. It assumes a perfect table and stroke; players test the table and add or subtract a fixed amount, and the teacher's own demonstrations sometimes miss. A simpler alternative is to aim at a fixed spot on the wall of the room. ([Dr. Dave: diamond systems](https://drdavepoolinfo.com/?p=1800), [PoolDawg](http://www.pooldawg.com/article/three-rail-kicking-systems))
- How good the best are: in three-cushion billiards, about one point an inning is national standard and 1.5 is world class, which is roughly one success in two. ([Wikipedia](https://en.wikipedia.org/wiki/Three-cushion_billiards))
- So, how far ahead can a person aim (inferred from those four sources): one bounce by eye, with the mirror picture; two with practice and a rule; three only with arithmetic on fixed marks, and then about half the time for specialists. Past three, players stop predicting and start remembering patterns.
- Unfolding: mathematicians do the mirror trick for every bounce at once. Reflect the table instead of the ball and the path is one straight line across a grid of mirrored tables. ([Scientific American](https://www.scientificamerican.com/blog/roots-of-unity/how-to-unfold-a-pool-table/))
- Flat versus round: billiards in a rectangle is the orderly case; put a convex obstacle in it (a disc in a square is the textbook example) and nearby paths spread apart at every hit, so error grows exponentially. ([Wikipedia: Dynamical billiards](https://en.wikipedia.org/wiki/Dynamical_billiards))
- On a bare square table a path repeats exactly when its slope is a ratio of whole numbers. (snippet, lecture notes and arXiv abstracts)
- Reading for Rickashay (inferred):
  - Its field is the orderly case. With only horizontal and vertical faces, a ball keeps the same steepness all flight and only ever travels in four directions; a small aim error grows in proportion to distance, not exponentially. Okay?'s circles and triangles and Peggle's round pegs are the chaotic case, which is why their reviews speak of luck and Rickashay's need not.
  - The exception is a brick's corner: two aims a hair apart can strike different faces and part for good. Corners, not walls, are where the guide and the aim steps must be honest.
  - A video game's cushions have no spin or speed effects, so the mirror rule is exact, and diamond-style marks along the side walls (or a faint mirrored field) would let players count a bank instead of guessing it.
  - Whole-number slopes repeat. A coarse aim set built from them gives paths players can learn like diamond numbers, but also loops; a flight must never be able to cycle between permanent pieces without touching a breakable brick or the floor.

## 8. What goes wrong

- Trial and error by nudging: Okay?'s harder levels are solved by tiny changes of position and angle until one works, and its boss levels are called tedious for it. ([TapTap review](https://www.taptap.io/post/6009669))
- Pixel-hunting on touch, and waiting after a miss for moving pieces to line up again: Okay?. ([GameBrain summary](https://gamebrain.co/game/okay))
- Luck: Ping 1.5+'s shots that look right and go wrong left the reviewer feeling success was chance; Trick Shot 2's solutions sometimes felt like luck (snippet, 148Apps); a Lazors reviewer, a puzzle designer himself, often reached the answer by accident because small boards allow few arrangements. ([Nintendo Life](https://nintendolife.com/reviews/wiiu-eshop/ping_15plus), [Nontrivial Games](https://nontrivialgames.blogspot.com/2013/02/lazors-review.html))
- Uneven curves: Trick Shot's difficulty spikes turn into long stretches of repetition; Ping's difficulty jumped about and introduced ideas without teaching them. ([Pocket Gamer](https://www.pocketgamer.com/trick-shot/trick-shot-fun-floaty-flawed/), [Nintendo Life](https://nintendolife.com/reviews/wiiu-eshop/ping_15plus))
- Too easy: Mr Bullet's puzzles mostly solve at a glance, so the ricochet never has to be planned; nGolf with its full path line was finished in under an hour. ([Common Sense Media](https://www.commonsensemedia.org/app-reviews/mr-bullet-spy-puzzles), [TheSixthAxis](https://www.thesixthaxis.com/2024/01/16/ngolf-review/))
- No aim aid at all: Bounceshot. ([GameBrain summary](https://gamebrain.co/game/bounceshot))
- Unreliable pieces: Ricochet Kills' explosives do not always react the same way. (snippet, Jay Is Games)
- Unintended solutions: Trick Shot's walls can be lobbed over. (snippet)
- Hints that do not help: Okay?'s hint was judged merely adequate; Lazors and Trick Shot 2 sell hints for coins, which reviewers tolerate only because they are optional. ([TapTap review](https://www.taptap.io/post/6009669), [Common Sense Media](https://www.commonsensemedia.org/app-reviews/lazors), [MacStories](https://www.macstories.net/reviews/game-day-trick-shot-2/))
- A gulf between players: Ricochet Robots is solved wholly in the head, and a reviewer who lost 4 to 13 says a weaker solver stands no chance. Planning several slides ahead is a talent some have and some lack. ([Zatu review](https://zatu.com/blogs/reviews/ricochet-robots-review))
- Reading for Rickashay (inferred): nearly every complaint traces to one of three causes: the answer is a single thin angle; the outcome past the first bounce cannot be foreseen; or the game is retried until it gives. Wide doors, a guide that reaches the first bounce's result, flat faces and no retry remove all three, at the cost that a bad round cannot be taken back, so a round's worst case must stay mild.

## Not found, in one place

- Developer commentary on Okay?'s level design; whether Okay? draws the previous attempt.
- How Ricochet Kills or Ping display a bounce limit.
- Descriptions of Ricochet Infinity's individually best-known levels.
- Chromatron, Deflektor; arcade Puzzle Bobble's guide-line rules; how many moves ahead Ricochet Robots players typically see (the one human study cited by Wikipedia was not retrieved).
- Measured success rates for one-, two- and three-rail kicks in pool; the figures above are from three-cushion averages and teachers' remarks.
- Mini-golf games gave little: most reviews mention bank shots only to complain about aiming.

## No source code

I opened no source code: no GitHub, GitLab or Bitbucket repositories, no gists, no code listings, no decompilations and no programming tutorials. Search results sometimes listed such pages (solver write-ups for Ricochet Robots, engine forum threads on drawing trajectories, a gist); I skipped them and used nothing from them. One blog post on Trick Shot hosted on a github.io address was skipped as well, to keep the rule simple. The Game Developer essay cited in section 1 is a design article, and what I read of it was prose.
