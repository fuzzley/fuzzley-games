# Long flights: how other games score, celebrate and bound one ball's air time

Research notes for Rickashay, read 2026-11-10 from wikis, reviews, guides, rule
sheets, interviews and design essays. No source code was opened. Points already
in `docs/archive/brick-fuzz-pop/plan.md` ("What other games teach") are not
repeated. Each finding names its game and ends with its source; URLs are under
"Sources".
"(inferred)" marks my own reading. "(listing)" marks a fact taken from a search
result's summary of a page I could not open myself.

## 1. Scoring a long flight

- **Peggle, the shot is a product.** A shot scores (sum of peg values) ×
  (number of pegs hit): blue 10, orange 100, purple 500, so 5 blues and 2
  oranges pay 7 × 250 = 1,750. Each further peg raises both terms. It resets
  every shot. [Casual Game Guides], [Wikipedia talk: Peggle]
- **Peggle, a second multiplier runs across the level.** The fever meter lifts
  every peg's value ×2, ×3, ×5, ×10 as orange pegs are cleared and never
  drops. The orange count for each step: not found. [Casual Game Guides]
- **Peggle, style shots.** Long Shot 25,000; Double Long Shot 25,000; Super
  Long Shot 50,000; Off the Wall 25,000; Extreme Slide (12 pegs) 50,000;
  Orange Attack 50,000 (8 oranges in a shot when 10 to 15 remain, 10 when 21
  or more); Free Ball Skills 5,000; Lucky Bounce and Kick the Bucket 25,000.
  Style points are added after the shot, unmultiplied. [Peggle wiki]
- **Peggle, the finish revalues what is left.** In Extreme Fever unhit pegs
  pay 1,000 and purple 10,000; the ball lands in one of five slots (10k, 50k,
  100k, 50k, 10k); each unused ball adds 10,000. [Patent Arcade]
- **Pinball, a threshold then a richer state (Attack from Mars).** Jet bumpers
  pay 1M a hit; after 100 hits "Super Jets" pays 3M a hit for the rest of that
  ball. The next ball needs 125 hits, then 150. [AFM rule sheet]
- **Pinball, value that climbs per hit (Pin-Bot).** Each bumper hit adds 2,000
  to an "energy value" that starts at 50,000, caps at 500,000, is collected by
  a separate shot and carries between balls. [Pin-Bot rule sheet]
- **Pinball, the bonus is paid on landing.** When the ball drains it pays a
  base built by play times a multiplier. Attack from Mars raises Bonus X by
  rollover lanes and skill shots; it resets to 1X each ball unless a hold
  award was won. A tilt forfeits it all. [AFM rule sheet], [Pinball glossary]
- **Pinball, combos.** Consecutive ramp or loop shots, each lit for a fixed
  time: 25M for two, 30M for three on Attack from Mars. A missed window ends
  the chain. [AFM rule sheet]
- **Nubby's Number Factory, the opposite slope.** A popped peg's number
  halves, so passes over the same pegs pay less each time; the board restocks
  when the score passes multiples of the quota. [Wikipedia: Nubby]
- **Nubby, counters that fire items.** Perks re-trigger items every 10, 15 or
  20 pegs popped, or at set moments such as "First Peg Popped"; Finger Puppet
  pays per bounce; Pedro pops a peg on each wall hit; one perk re-fires items
  if the first peg popped was the board's highest. [grindnstrat], [Goonhammer]
- **Ballionaire, once per ball.** An early build note says a ball can fire a
  given trigger only once; a tree trigger gains multiplier after every ball,
  so value grows across the run, not within a drop. [Ballionaire devlog],
  [PC Gamer: Ballionaire]
- **Peglin, one hit revalues the whole shot.** A critical peg switches the
  orb to crit damage for every peg of that shot, those already hit included,
  until the orb leaves the board. [Peglin wiki: Critical Peg]
- **Breakout, depth is worth more.** Rows pay 1, 3, 5 and 7 points from the
  bottom up. [Wikipedia: Breakout]
- **What resets them (inferred).** Three scopes recur: one flight (Peggle's
  peg count, Peglin's crit, pinball combos), one ball or life (Super Jets,
  Bonus X) and the whole game (fever meter, Pin-Bot's energy). Rickashay's
  one flight per round is the first; the wall's descent could carry the second.

## 2. Celebrating it

- **Peggle, the scale climbs and fits the music.** Peggle 2's peg hits play an
  ascending diatonic scale matched to the current musical phrase, and the
  scale changes with the phrase even mid-shot; hits are counted from the start
  of the turn so the run always rises (listing). The free-ball chord and the
  timpani roll before the last peg are tuned to the music too. [audiogang.org]
- **Peggle, a meter for this shot.** The "Ball-o-meter" beside the board
  changes colour as one shot passes 25,000, 75,000 and 125,000.
  [Casual Game Guides]
- **Peggle, zoom, slow motion, drum roll.** Near the last orange peg the
  camera zooms and time slows; a click exits the slow motion. On a near miss
  the choir groans (listing). [Patent Arcade], [TV Tropes: Peggle]
- **Peggle, why the excess sits at the end.** Extreme Fever and Ode to Joy
  began as placeholders and a joke. The team kept them and made the finish as
  dramatic as it could, naming it after the fever that pachinko machines
  call out (there, a run of chained jackpots). [PC Gamer: Making of Peggle],
  [Wikipedia: Pachinko]
- **Peggle, the finish teaches.** John Vechey says first-time players kept
  clicking after firing, not seeing they had let go; the game made sense to
  them once a level ended in fever. [Gamezebo]
- **Peggle, call-outs by name.** Each style shot is named on screen as it
  lands; in Deluxe and Nights a character may pop from a corner with a
  one-word cheer. [Peggle wiki]
- **Pinball, a sound the room hears.** The knocker's crack on a replay is a
  reward heard across an arcade. [Fred Z.]
- **Lethal League, the pause grows with the stakes.** The ball speeds up with
  every hit, and the freeze on each hit lengthens as it does (listing).
  [Wikipedia: Lethal League]

## 3. Wall bounces as skill

- **Peggle, Off the Wall.** Bounce off a wall, travel about a fifth of the
  screen's width, then hit a non-blue peg: 25,000, the same as a Long Shot
  (a third of the screen between two non-blue pegs). Absent from Peggle
  Deluxe, added in Nights. The wall alone pays nothing, it must lead to a peg
  that matters, and no style shot pays for a count of bounces. [Peggle wiki]
- **Three-cushion billiards, N rails as the rule.** A point counts only if
  the cue ball touches cushions at least three times before it reaches the
  second object ball; more is allowed (listing). A whole discipline rests on
  counted bounces. [Wikipedia: Three-cushion billiards]
- **Ball x Pit, the back wall is the target.** A guide's main tactic: "Aim so
  that the first wall the ball touches is behind the enemy line." Balls there
  strike the line again and again; the cost is that they are away longer.
  [Deltias Gaming]
- **Zuma, the gap shot.** Firing through a gap in the chain pays more the
  smaller the gap, and more again for two gaps (listing): a paid threading
  shot rather than a paid bounce. [StrategyWiki: Zuma]
- **Skill or luck?** No source asked players about Off the Wall itself;
  reviews split on Peggle as a whole (section 6). (inferred) A bank the guide
  showed reads as skill and one that happened on bounce nine reads as luck,
  so name the first kind and pay the second by count.

## 4. Second chances that extend a flight

- **Peggle, the bucket.** It slides along the floor on a steady cycle and
  returns a ball that lands in it; its rim can knock the ball back up. It
  cannot be steered once the ball is away, so it is a matter of timing the
  release. Five catches running is Mad Skills (25,000), ten is Crazy Mad
  Skills (100,000). [Patent Arcade], [Peggle wiki]
- **Peggle, earned by score.** 25,000, 75,000 and 125,000 points inside one
  shot each award a free ball: no timing, no luck. Vechey says that without
  free balls "nobody cares about the score", and likens them to pinball's
  replay. [Casual Game Guides], [Gamezebo]
- **Peggle, pity for a whiff.** A shot that hits no peg gets a coin flip for
  a free ball: random, and only for the worst outcome. [Patent Arcade]
- **Pinball, ball saver.** A drain in the first seconds returns the ball:
  timed and automatic. Operator settings run 2 to 15 seconds, default 4 on
  Congo and 6 on Cirqus Voltaire (listing). It keeps a novice from losing a
  ball at once; Larry DeMar avoided it, to keep the game unassisted.
  [Pinball glossary], [Nautilus]
- **Pinball, kickback.** A kicker in one outlane fires the ball back once,
  then goes dark until set targets relight it: earned, shown by a lamp,
  single use; many tables guard one outlane only (both listing).
  [Pinball glossary], [TV Tropes: pinball]
- **Pinball, posts and magnets.** A stopper is a fixed post between the
  flippers that bounces a centre drain back; an up-post rises to do the same;
  Magna-Save is a magnet the player fires by hand. [Pinball glossary]
- **Brick breakers, the shield.** A power-up puts a floor under the paddle
  for a set time or a set number of bounces. [Nelson]
- **Which fit no timing and no randomness (inferred).** Fits: a floor bounce
  earned by the flight's own tally (Peggle's 25k rule); a lit kickback earned
  by finishing a set of bricks and spent once; a fixed safe cell on the floor
  that can be aimed for (the stopper). Misfits: a moving bucket (timing), a
  coin flip (dice), Magna-Save (reflex). A ball saver becomes a hit count: a
  flight that lands before K hits goes again.

## 5. Keeping long flights from being boring or endless

- **Peggle, stuck ball.** Pegs normally vanish at the end of the turn; pegs
  the ball is stuck on are removed early. No time limit is given. The patent
  also describes a wall obstacle that stops a ball rattling between the two
  sides. [Wikipedia: Peggle], [Patent Arcade]
- **Peglin, a hit cap and a timer.** Since 0.9.58 an orb is destroyed if it
  should "hit a single peg over 100 times" in one shot; earlier notes mention
  a stuck-orb timeout. [Peglin 0.9.58]
- **Peglin, speed-up was the top request.** A 1.5×, 2× or 3× mode, toggle or
  hold by option, was added because it "has been requested a lot".
  [Peglin 0.7.27]
- **Breakout, the ball quickens.** It speeds up after 4 hits, after 12, and
  on first touching the orange and red rows; the paddle halves once the ball
  reaches the top wall. Depth raises the stakes; no timer. [Wikipedia: Breakout]
- **Pong, the rally quickens.** The ball speeds up the longer it stays in
  play and resets on a miss; Alcorn kept a gap the paddles could not reach
  because otherwise two good players could rally forever. [Wikipedia: Pong]
- **Pinball, ball search.** With no switch hit for a while, the machine fires
  every coil in turn to free a lodged ball. [Pinball glossary]
- **Farming is braked from both ends.** Super Jets needs 100 hits, then 125,
  then 150; Nubby's pegs halve. [AFM rule sheet], [Wikipedia: Nubby]
- **Holedown, prototypes ran for days.** Unlimited shots made rounds far too
  long, so limits were added; yet the ball that slips behind the blocks and
  "just goes wild" is the appeal the designer names. [Holedown interview]
- **The Breakout problem.** Ron Dippold's name for the wait while a ball the
  player cannot touch hunts the last bricks; Shatter cures it with push and
  pull on the ball at all times. Mark Nelson suggests a second ball when the
  first is out of reach. [Dippold], [Nelson]
- **For Rickashay (inferred).** With mirror bounces on a grid and no
  randomness, a flight that returns to the same place and heading with no
  brick changed in between is provably a loop: it can be ended on the spot
  and its tally paid, with no timer and no nudge.

## 6. Luck versus skill

- **Pachinko was the warning.** Sukhbir Sidhu loved a pachinko machine, where
  the player sets launch strength and nothing else, but saw its fun was the
  gambling. A prototype with spinning crosses failed because nobody could
  foresee the bounce: "it was just too random". Static pegs were kept as more
  predictable than moving targets. [PC Gamer: Making of Peggle],
  [Wikipedia: Peggle], [Wikipedia: Pachinko]
- **Two readings of one board.** A 2009 essay: the casual player sees chaos,
  "a hard-core one sees causality", tracing a path seven or eight collisions
  deep. [motd]
- **The other reading.** PC Gamer's Ballionaire review recalls Peggle as
  nearly all luck, because "the only agency you had was the direction you
  fired the ball in". That is exactly Rickashay's input.
  [PC Gamer: Ballionaire]
- **Peggle bends its own physics.** Jason Kapalka says bounces are "sometimes
  manipulated to give the player better results", by a few degrees, mostly in
  the first half-dozen levels. The same article warns that a player who
  senses the help feels patronised, and that players suspect rigging even
  where there is none. [Nautilus]
- **Pinball, skill was proved by calling a shot.** In 1976 Roger Sharpe told
  New York's council which lane his plunge would take, then did it, and the
  ban on pinball fell (listing). [Wikipedia: Roger Sharpe]
- **Pinball, the skill shot.** A one-time award for the plunge alone, before
  any flipper: 10M and +5X on Attack from Mars, 10M more each time it is made
  again. It pays the one fully controlled moment of a ball. [AFM rule sheet]
- **Influence throughout.** Dippold: when the player can affect the ball at
  every moment, a miss is theirs. Rickashay gives none after release, so the
  aim and the guide must carry all of it. [Dippold]
- **Breakout, the far-sighted line.** DeepMind's agent learned to dig a
  tunnel at one side so the ball would run along the top of the wall: the
  long flight as the planned move, not the accident (listing). [DeepMind]
- **For Rickashay (inferred).** Square bricks and mirror bounces are far more
  readable than round pegs under gravity, so the game can honestly be one of
  causality: never nudge a bounce, show more of the path than Peggle does,
  and name what the guide showed (a called shot) apart from what the flight
  then found.

## 7. Targets that live for bounces

- **Pop bumpers and drop-target banks.** Bumpers score and kick the ball
  away, so a nest of them keeps a ball busy and their hit counts feed awards
  (section 1). Drop targets fall when hit and are often to be finished as a
  set or in order. [Pinball glossary]
- **Rollovers and lanes.** A switch the ball crosses. Attack from Mars's
  Bonus X lanes sit above the bumpers, so a ball kept up there advances the
  multiplier. [AFM rule sheet]
- **Peglin, refresh pegs.** Two sit on the board; hitting one restores every
  spent peg mid-shot, so a long shot can be re-fed. [Peglin wiki: Refresh Peg]
- **Peggle, the purple peg.** One blue peg turns purple each turn, worth five
  oranges, then reverts: a fresh thing to aim at every round.
  [Wikipedia: Peggle], [Casual Game Guides]
- **Ballionaire, direction matters.** A tree pays only when struck from
  below, and a trampoline under it makes that likely. Ball x Pit has bonuses
  for hits from behind (listing). [PC Gamer: Ballionaire]
- **Breakout essay, ball traps.** Gaps in a formation that hold a ball until
  it breaks out, and cavern layouts closed above and open below. [Nelson]
- **What translates to square bricks, no gravity (inferred).** A bumper brick
  that never breaks and pays more each hit of this flight; a bank of marked
  bricks to finish within one flight; a gap between bricks that pays when
  threaded (rollover, Zuma's gap); a brick that pays only from above, for
  the ball that got behind the wall; a refresh brick that re-arms the bank.
  Spinners (paid by ball speed) and kickers that add speed do not, with one
  speed.

## 8. What goes wrong

- **Luck that decides runs.** Peglin's reviews say its higher difficulties
  come down to luck (listing). [Rogueliker]
- **Rules the game will not explain.** Ballionaire's in-game reference left a
  reviewer guessing what a trigger was, and a guess cost a run.
  [PC Gamer: Ballionaire]
- **Distrust.** Players suspect a bouncing game of rigging even when it is
  honest, and resent help they can sense (section 6). [Nautilus]
- **Sameness.** Ball x Pit's "almost meditative percussion of ball against
  enemy" carries the opening hours; then the reviewer finds it repetitive
  and padded. [GamesRadar: Ball x Pit]
- **Slowness and the last target.** Speed-up was Peglin's top request, and
  every Breakout descendant has the wait for the final brick (section 5).

## Not found

- Peggle's orange-peg thresholds for ×2, ×3, ×5 and ×10. The wiki page that
  may hold them sat behind a bot check, which I did not try to pass.
- Any time limit in Peggle's stuck-ball rule.
- A player-facing account of Breakout's or Arkanoid's unreachable-brick
  loops. Searches returned only programmers' forum threads, left unopened.
- Haptics in any of these games; whether "Juice It or Lose It" raises pitch
  per hit (the video was not opened).
- Roundguard's floor and second-chance rules; Wizorb beyond Dippold's essay.
- Fast-forward or skip in Ballionaire and Nubby; a designer's account of
  Ball x Pit's aiming.
- Any video game that pays by the count of wall bounces before a hit.

## Sources

[AFM rule sheet]: https://www.bmigaming.com/Games/Rulesheets/attack_from_mars.txt
[audiogang.org]: https://www.audiogang.org/peggle2-sonic-joy/
[Ballionaire devlog]: https://newobject.itch.io/ballionaire/devlog/619959/build-2-released
[Casual Game Guides]: https://casualgameguides.com/walkthroughs/peggle-deluxe
[DeepMind]: https://research.google/blog/from-pixels-to-actions-human-level-control-through-deep-reinforcement-learning/
[Deltias Gaming]: https://deltiasgaming.com/ball-x-pit-5-best-tips-to-survive-a-round/
[Dippold]: https://www.gamedeveloper.com/design/shatter-solved-the-breakout-problem-please-don-t-keep-making-the-same-mistake-
[Fred Z.]: https://fredzed.substack.com/p/what-video-games-can-learn-from-pinball
[GamesRadar: Ball x Pit]: https://www.gamesradar.com/games/roguelike/ball-x-pit-review
[Gamezebo]: https://www.gamezebo.com/news/peggle-how-a-spark-started-a-fever/
[Goonhammer]: https://www.goonhammer.com/goonhammer-reviews-nubbys-number-factory-balatro-if-it-was-good
[grindnstrat]: https://grindnstrat.com/nubbys-number-factory-items
[Holedown interview]: https://www.gamedeveloper.com/design/the-ins-and-outs-of-bouncing-balls-in-the-joyful-brick-breaker-i-holedown-i-
[motd]: https://motd.co/2009/03/for-a-casual-gamer-peggle-seems-too-heavily-based/
[Nautilus]: https://nautil.us/how-designers-engineer-luck-into-video-games-236363
[Nelson]: https://www.gamedeveloper.com/design/breaking-down-breakout-system-and-level-design-for-breakout-style-games
[Patent Arcade]: https://www.patentarcade.com/video-game-patent/US8398476/electronic-game-such-as-a-computer-game-involving-removing-pegs
[PC Gamer: Ballionaire]: https://www.pcgamer.com/games/roguelike/ballionaire-review
[PC Gamer: Making of Peggle]: https://www.pcgamer.com/the-making-of-peggle/2/
[Peggle wiki]: https://peggle.fandom.com/wiki/Style_Shots
[Peglin 0.7.27]: https://peglin.wiki.gg/wiki/Update_0.7.27
[Peglin 0.9.58]: https://peglin.wiki.gg/wiki/Update_0.9.58
[Peglin wiki: Critical Peg]: https://peglin.wiki.gg/wiki/Critical_Peg
[Peglin wiki: Refresh Peg]: https://peglin.wiki.gg/wiki/Refresh_Peg
[Pin-Bot rule sheet]: https://www.bmigaming.com/Games/Rulesheets/pinbot.txt
[Pinball glossary]: https://en.wikipedia.org/wiki/Glossary_of_pinball_terms
[Rogueliker]: https://rogueliker.com/peglin-review/
[StrategyWiki: Zuma]: https://strategywiki.org/wiki/Zuma_Deluxe/Bonuses
[TV Tropes: Peggle]: https://tvtropes.org/pmwiki/pmwiki.php/VideoGame/Peggle
[TV Tropes: pinball]: https://www.tvtropes.org/pmwiki/pmwiki.php/Main/TropesInPinballGames
[Wikipedia talk: Peggle]: https://en.wikipedia.org/wiki/Talk:Peggle
[Wikipedia: Breakout]: https://en.wikipedia.org/wiki/Breakout_(video_game)
[Wikipedia: Lethal League]: https://en.wikipedia.org/wiki/Lethal_League
[Wikipedia: Nubby]: https://en.wikipedia.org/wiki/Nubby%27s_Number_Factory
[Wikipedia: Pachinko]: https://en.wikipedia.org/wiki/Pachinko
[Wikipedia: Peggle]: https://en.wikipedia.org/wiki/Peggle
[Wikipedia: Pong]: https://en.wikipedia.org/wiki/Pong
[Wikipedia: Roger Sharpe]: https://en.wikipedia.org/wiki/Roger_Sharpe_(pinball)
[Wikipedia: Three-cushion billiards]: https://en.wikipedia.org/wiki/Three-cushion_billiards
