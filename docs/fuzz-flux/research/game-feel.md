# Game feel in match-three and casual puzzle games

Notes for Fuzz Flux, gathered on 2026-11-25 from design essays, reports of
talks, interviews, reviews, wikis, accessibility guidance and one survey paper.
No game source code was read: GitHub results, code listings, the code in pages
that mix prose and code, and wiki pages built from disassemblies (Puyo Puyo and
Panel de Pon frame data) were skipped. No art or audio was downloaded. The
web-search allowance ran out partway, so sections 7 and 8 are thin. Some pages
did not open (errors 402 to 404, and PDFs: the Würzburg "Royal Crush" paper and
three sets of slides). "(listing)" marks a fact taken from a search listing
only, "(inferred)" a reading of mine, and "not found" a number no source gave.

## 1. Canonical talks and essays

- **Juice, first defined.** "A juicy game element will bounce and wiggle and
  squirt and make a little noise when you touch it", with "tons of cascading
  action and response for minimal user input". It also teaches the rules by
  answering every action. [Prototype in 7 Days]
- **"Juice it or lose it" (Jonasson and Purho, GDC Europe 2012).** A plain
  Breakout clone gains, with no rule changed: color; tweening with easing;
  squeeze and stretch, and a wobble on each bounce; sound; a few particles
  (smoke, shatter, trails); screen shake; eyes that track the ball and blink;
  then a screen flash. Folmer Kelly's reply talk: polish makes a game "feel more
  alive" but costs "a level of immersion". [RPG Playground (listing); GD Kelly]
- **"The Art of Screenshake" (Nijman, Vlambeer, 2013).** Thirty small tweaks to
  a dull shooter in almost 45 minutes, among them bigger and faster bullets,
  permanence (debris stays), camera lerp, shake pushed opposite to the shot and
  hit pause. The full list: not found. Forum readers found that stacked tricks
  "detracted from the experience" and that the subtle ones mattered most. [GD
  Nijman; Liao (listing); MGSA]
- **Swink, "Game Feel".** Feel is input, response, context, polish, metaphor and
  rules. Polish is there "to convey the physical properties of objects"; "a
  simple squash and stretch deformation is probably enough"; and it is "a
  notorious time sink". No timings. [Swink]
- **Game Maker's Toolkit (2015).** Juice is "doubling down on whatever your game
  is about". The transcript did not open. [GMTK (listing)]
- **Pichlmair and Johansen, "Designing Game Feel: A Survey".** "Juice-rich
  interaction makes it hard to learn what aspects of interactivity have
  mechanical importance." In Kao's experiment medium and high juiciness beat
  both none and extreme on experience, play time and performance. [Pichlmair &
  Johansen]
- **Peggle, Extreme Fever.** It began as a placeholder: two words and "Ode to
  Joy". Players liked it, so the team kept it and added a zoom on the ball near
  the last orange peg, then flames, rainbows and slow motion, because it "helped
  to create a defining moment at the end of each level". The game was complete
  after one year; the second went on polish. [WP Peggle; Gamezebo Peggle]
- **Bejeweled.** Bejeweled 2's announcer says "Good!", "Excellent!" and, for a
  great cascade, "Incredible!"; gems "glisten and shimmer" and click "like
  little mah-jongg tiles". Bejeweled 3 added swaps while gems fall. The Blitz
  team "design[s] on feel" and cut an animation that "was taking way too much
  time". [Gamezebo B2; WP Bejeweled 3; Game Informer]
- **Candy Crush Saga.** Nearly every sound rewards; there is "little or NO
  negative reinforcement". King later dropped timed levels because "not all
  players are equally able to react or respond at the same speed". [GD CCS
  Audio; PG.biz King]
- **Royal Match.** "One of the fastest switchers live": power-up, obstacle and
  drop animations are short, with enough debris to satisfy and not crowd the
  board. "There is nothing worse than having to watch and wait for a slow
  sequence of animations." [DoF Royal Match]
- **A VFX artist on seven match-3 games.** The best craft source found: Royal
  Match, Toon Blast, Project Makeover, Gardenscapes, a Harry Potter game by
  Zynga, Switchcraft and Small Town by Rovio. [Habr]
- **Two Dots and Threes.** Closing a square in Two Dots turns the background
  that color and makes the doomed dots glow: "not overly flamboyant animation,
  but it's satisfying enough that you'll want to create more squares". Threes'
  makers: "it should be a charming game, not a cute game". [PG Two Dots; Threes
  Letters]
- **Not found.** A King, Dream Games or Playrix talk or article on animation and
  effects; a Kapalka talk on polish; anything on Puyo Puyo's or Tetris Effect's
  effects.

## 2. Timings

- **Frame-by-frame analyses.** Not found for Candy Crush, Royal Match, Bejeweled
  or Homescapes; no source that opened gives a shipped match-3's swap, pop or
  fall time. What follows is human limits, UI guidance, older games and tutorial
  rules of thumb.
- **Human limits.** 0.1 s feels instant; 1 s is the limit of an unbroken flow of
  thought. A see-decide-act loop averages 240 ms, and a game has about 50 ms,
  three frames at 60 fps, to answer an input. A change takes about 230 ms to
  perceive. [NN/g Limits; Morris; Val Head]
- **UI animation length.** 100 to 500 ms, and about 100 ms for simple feedback;
  "the more frequent the animation, the more subtle and shorter"; at 500 ms
  animations "feel like a real drag". Material: 300 ms on phones, 225 ms to
  enter, 195 ms to leave. [NN/g Duration; Material]
- **Swap.** It should take "pretty much the same amount of time as the mouse or
  finger flick"; match-3 games "don't benefit from long and fancy matching
  animations". A tutorial's prose says about 0.25 s. Royal Match's figure: not
  found. [GD Azkend; Azumo (listing, code not read)]
- **Invalid swap.** Swap, swap back, then a small wiggle and a negative sound
  that teaches the rule. Duration: not found. [CS50 (listing, code not read); GD
  CCS Audio]
- **Match pop.** Not found for a shipped match-3; tutorial prose says about
  0.15 s. Tetris: The Grand Master and Tetris DS hold 400 to 700 ms after a line
  clear. [Azumo (listing); Tetris Wiki]
- **Fall.** Tetris Attack clears matched panels one at a time, then drops the
  panels above one tile per frame after a delay that shrinks at higher levels:
  constant speed. Tutorial prose gives 0.1 s per tile, starting later the higher
  a piece sits. Whether Candy Crush or Royal Match accelerate: not found, though
  Royal Match's pieces are said to "follow physics". [Hard Drop TA (listing);
  Kodeco (listing, code not read); Habr]
- **Landing, column stagger, gap between cascade steps.** Not found. Material
  sets the landing: jelly squash in Project Makeover and Small Town, hard
  plastic in Toon Blast, stone in the Harry Potter game. [Habr]
- **Special pieces.** Royal Match's rocket forms with rays and a spin, timed to
  land on its cell as the star burst fires. Toon Blast and Project Makeover
  inflate a booster before it fires. Durations: not found. [Habr]
- **End-of-level bonus.** Candy Crush's "Sugar Crush" turns each leftover move
  into a striped candy fired one by one, or into three jelly fish a move.
  Bejeweled Blitz's "Last Hurrah" detonates every special gem left. Peggle drops
  the last ball into one of five bins. Durations: not found. [FunTrivia; BJ Wiki
  Blitz; WP Peggle]
- **Input during cascades.** Allowed by Zoo Keeper (2003), Puzzle League
  ("continue moving blocks as others clear"), Bejeweled Blitz (2009), Bejeweled
  3, Royal Match, Homescapes and Candy Crush Soda. Candy Crush Saga makes the
  player wait. The board then "feels alive and ready for interaction at all
  times"; the cost is a move wasted on a piece another cascade takes. [WP Zoo
  Keeper; WP Puzzle League; BJ Wiki Blitz; WP Bejeweled 3; DoF Royal Match;
  TWIL]
- **Pace as a reward.** Bejeweled Blitz pays a Speed Bonus for three matches
  within 3 s (200 points, rising to 1,000), then Blazing Speed: 10 s in which
  every matched gem explodes. [BJ Wiki Blitz]

## 3. Easing and animation principles

- **The principles that apply.** Squash and stretch gives weight, with volume
  kept constant. Anticipation readies the viewer. Loose parts "continue moving
  after the character has stopped". A secondary action must "emphasize, rather
  than take attention away from the main action". [WP 12 Principles]
- **Ease-out by default.** It is "quick to start, giving your animations a
  feeling of responsiveness". Ease-in suits things that leave but "can feel
  unresponsive"; linear motion "looks weird and unnatural". [web.dev Easing;
  NN/g Duration]
- **Bounce and elastic need room.** web.dev gives them 800 to 1200 ms to settle;
  Val Head, 400 to 500 ms. Both say to use them sparingly. [web.dev Easing; Val
  Head]
- **Springs.** More believable than a fixed curve: stiffness adds snap and
  bounce, damping removes the bobbing, mass adds inertia. Often best with no
  visible bounce. [Comeau]
- **Anticipation in match-3.** Royal Match shrinks a piece briefly before it
  moves. Boosters inflate before they fire. Toon Blast's bomb sends a distortion
  wave through nearby pieces first. A bouncy landing on a piece that reads as
  stone looks wrong. [Habr]
- **Three phases of an effect.** Anticipation; climax ("biggest contrast, high
  saturation"); dissipation, which "shouldn't stay visible for long". A major
  cue is fully on within the first quarter of the effect's life. Faster than a
  heartbeat reads as aggressive. [80.lv Staples; VFX Apprentice; VFX Apprentice
  (listing)]

## 4. Escalation with match size and cascade depth

- **Voice tiers.** Candy Crush, per a quiz site: "Sweet" at 4 to 5 cascades,
  "Tasty" at 6 to 7, "Delicious" at 8 to 10, "Divine" above; King does not
  confirm it. Bejeweled 2 has "Good!", "Excellent!", "Incredible!"; thresholds
  not found. [FunTrivia; Gamezebo B2]
- **Pitch.** In Candy Crush each further row cleared by one move plays the same
  sound a semitone higher: "the feeling of elevation, building jubilance". [GD
  CCS Audio]
- **Bigger match, better piece.** Bejeweled 3: four in a row makes a Flame Gem
  (destroys the 8 around it), an L or T a Star Gem (row and column), five a
  Hypercube (one whole color), six a Supernova. Size earns a new object, not
  only a bigger effect. [WP Bejeweled 3]
- **Peggle.** The multiplier climbs to 10x and "Ultra Extreme Fever" marks a
  full clear. Zoom and slow motion appear at one moment only. [WP Peggle]
- **Music and background.** Two Dots' top tier recolors the whole background.
  Dr. Mario on Game Boy plays the invincibility tune on a chain of four or
  more. Puzzle League stops the rising stack for longer the bigger the chain.
  [PG Two Dots; WP Dr. Mario; WP Puzzle League]
- **Board shake.** Gardenscapes and Toon Blast shake the board only after big
  explosions. [Habr]
- **Hit-stop.** 0.05 to 0.1 s in general guides, on heavy events only; on minor
  ones the game seems to lag. In a match-3: not found. One guide caps routine
  feedback at 3 to 5 events a second. [Jamzo; EastonDev]
- **Small input, large response.** A cascade "keeps players watching", and
  "clear feedback keeps a chain readable at speed". [games.gg]

## 5. Particle and effect design

- **Counts and lifetimes.** A general guide: 20 to 30 particles an event, fading
  in 0.5 to 1 s, launched at 200 to 400 px/s; a white flash of 50 to 100 ms.
  Gardenscapes breaks a blocker into "a couple of large chunks and a few small
  ones". [EastonDev; Habr]
- **Sizes in cells.** Royal Match's shards fly about one cell and linger long
  enough to be seen. Toon Blast's bomb inflates, drops, then shows shards, flash
  and shockwave together; the wave reaches 2.5 cells and the smoke one cell.
  [Habr]
- **Dark board, light board.** Glow reads on a dark board and washes out on a
  light one: Project Makeover's and Small Town's glows overexpose, and
  Switchcraft's near-white elements become "a glowing blob". [Habr]
- **Color.** High contrast and saturation are for the climax only; Royal Match
  is faulted for oversaturation. A white-core rule: not found. [80.lv Staples;
  Habr]
- **One break effect, reused.** Royal Match reuses one simple break effect
  across many pieces: it runs faster, and players learn what it means. [Habr]
- **Trails.** Royal Match's rocket splits into two halves with tails, breaking
  each piece it passes. A trail makes a movement look slower. [Habr; GD
  Squeezing]
- **Flights to the HUD.** Royal Match's resources "fly from the place it was
  unlocked to the container it's stored in"; Chuzzle's popped eyes fly into a
  flask by the board. Path, stagger and arrival bump: not found. [Funovus; WP
  Chuzzle]
- **Text, sound, haptics.** One guide floats text for 1 to 2 s and wants sound
  within 12 to 20 ms of its event. Royal Match is praised for haptics on taps
  and swipes. [EastonDev; TWIL]

## 6. Readability versus spectacle

- **"Gameplay comes first."** Fast play "needs VFX to happen fast, but still
  provide the visual clarity to the player without noise". [80.lv Staples]
- **The sandwich.** Effects that fire together stack into an unreadable
  "sandwich" (the Harry Potter game), and near-white blowouts hide the board
  (Switchcraft). Royal Match's popup particles are "quite intrusive". A
  documented draw order: not found. [Habr]
- **Pieces first.** Royal Match has high-contrast primary colors, bigger pieces
  than its rivals and two families of shape. A small shift in the board's gray
  changes how much pieces pop. [TWIL; DoF Royal Match; Habr]
- **Backgrounds.** "Abundant but not distracting": large, slow movement and
  restrained light. [80.lv Kim]
- **Personality against legibility.** Threes' artist wanted to "pack as much
  personality AND functionality into the game" as it could hold; the result was
  plain cards, small faces and a black background that rests the eyes. [Threes
  Letters]
- **When to stop.** "Used in excess, juicing techniques will both waste your
  time and annoy your users." [GD Squeezing]

## 7. Living pieces

- **Chuzzle, what the pieces do.** Furballs with googly eyes blink "every so
  often" as rows slide, squeak, sneeze off their hair if clicked too often, get
  angry if hovered over and dizzy if shaken. When popped, fur and eyes fly, and
  the eyes hop into a flask. Eyes that follow the cursor: not confirmed. [Pocket
  Gamer Chuzzle; Gamezebo Chuzzle; Common Sense; WP Chuzzle]
- **Chuzzle, reception.** "Really characterful considering they're basically
  just coloured balls with eyes"; their "happy faces" engage more than lifeless
  pieces. Complaints are about luck and locks, not the characters. [TNW; Common
  Sense; Gamezebo Chuzzle]
- **Threes, what players meet.** Tiles "grumble, sigh, and playfully heckle you
  as you consider the board", and two sixes "gaze into each other's eyes in
  anticipation" of merging. It charms because it "knows when to stop talking".
  [AV Club]
- **Threes, how it was built.** The plan had pupils turn in code toward what a
  character looks at, eyes and mouths as separate parts, and lines of about 1.5
  words. One idea: a new giant tile roars and "all the other monsters look
  briefly scared". A hug with arms was doubted, as swipes are too fast for it to
  read. [Threes Letters]
- **Characters beside the board.** The bricks of "Juice it or lose it" get eyes
  that track the ball. Dr. Mario's viruses dance "as if to mock the player".
  Royal Match's King "gets nervous when you're close to losing". Candy Crush
  Friends is quick "except for the in-level character animations". [RPG
  Playground (listing); Mario Wiki Virus; Funovus; DoF Royal Match]
- **Hints.** Bejeweled 3's Hint button has a cooldown, Chuzzle's costs points,
  Zoo Keeper's binoculars show a valid move. Automatic hints that come late and
  point at poor matches teach players to distrust them. Idle time before a hint:
  not found. [WP Bejeweled 3; WP Chuzzle; WP Zoo Keeper; GD King UX]
- **Not found.** What Zoo Keeper's, Puyo Puyo's, Pokémon Shuffle's, Best Fiends'
  or Angry Birds Match's pieces do when idle, held or beside a match; idle
  timings in any game.

## 8. Fur, soft bodies and poofs

- **Drag and follow-through.** Hair lags the body by a few frames and keeps
  moving after it stops. [WP 12 Principles]
- **Softness by scale alone.** "A simple squash and stretch deformation is
  probably enough to get the idea across". In Jelly Jump the wobble grows with
  jump thrust and landing force. [Swink; GD Squeezing]
- **Cheap sway, lag and dust.** Layered sine waves sway plants as if in wind;
  one spring gives overshoot and settle with no keyframes; dust on landing is
  the stock collision effect. [GD Squeezing; Comeau]
- **Not found.** Write-ups of per-strand 2D fur, and cartoon "poof" and feather
  conventions: the search allowance ran out first.

## 9. Screen shake and flash safety

- **WCAG 2.3.1 (Level A).** No more than three flashes in any second, unless
  below threshold. A flash is a pair of opposing luminance changes of 10% or
  more with the darker state under 0.80; saturated red has its own, stricter
  test. Flashing is exempt while it fills under a quarter of any 341 by 256 px
  rectangle. [W3C 2.3.1]
- **Xbox guideline 118.** A fail is more than about three flashes a second over
  about 20% of the screen, or weaker flashing kept up for long. About 1 person
  in 4,000 is at risk. Fix by lowering contrast, rate or size. [XAG 118]
- **Game Accessibility Guidelines.** Avoid flashing runs over 5 s, 3 flashes a
  second over 25% of the screen, and jumps to or from red. Never say "epilepsy
  safe"; name a setting by what it controls. [GAG Flicker]
- **Why it matters.** A 1997 Pokémon episode flashed red and blue at 12 Hz for
  4 s; 685 viewers went to hospital. [WP Porygon]
- **Shake size and length.** General guides: 2 to 3 px for weak hits, 8 to 10 px
  for strong ones, 0.1 to 0.3 s, tapered; "a shake should be a punch, not an
  earthquake". As a share of the screen: not found. [EastonDev; itch Juicy;
  Jamzo]
- **Shake shape.** Eiserloh's model keeps a decaying "trauma" from 0 to 1 and
  scales offset and angle by trauma squared, so small events barely shake; it
  uses smooth noise, not random jumps. [gamedev.tv (listing)]
- **Options.** Avoid camera shake "or provide an option to turn off these
  behaviors"; Halo Infinite has 0 to 100% sliders for screen shake and for
  full-screen effects. [XAG 117]
- **Reduced motion.** WCAG 2.3.3 (AAA): motion from interaction can be disabled
  unless essential; color and opacity changes are not motion. Apple: where
  motion carries meaning, replace it with "a dissolve, highlight fade, or color
  shift". Read `prefers-reduced-motion` and offer a toggle too. [W3C 2.3.3;
  Apple RM; web.dev Motion]

## 10. Performance that bears on feel

- **The frame budget.** 16.66 ms a frame at 60 fps, about 10 ms of it the
  page's; a missed frame shows as judder. Threes drained batteries at 60 fps and
  planned a 30 fps option. [web.dev Rendering; Threes Letters]
- **Fewer, reused effects.** Fewer duplicates and particles play faster; keep
  overdraw low and give rare events the bigger budget. Avoid `shadowBlur` and
  per-frame text. [Habr; 80.lv Staples; MDN Canvas]
- **This repository's rules.** An atlas, no filter on many objects, nothing
  allocated per frame, pooled objects: glow and fur are baked sprites, never a
  filter on each piece. [Repo skill]
- **Particle budget for mid-range phones.** A sourced number: not found.

## 11. What this suggests for Fuzz Flux

Each item is a proposal (inferred), with starting numbers to tune by eye.

1. **Swap in 150 ms with ease-out.** A swap should last as long as the flick,
   and frequent animations sit at the short end of 100 to 500 ms.
2. **Refuse a bad swap in 260 ms:** 110 ms out, 150 ms back with a slight
   overshoot, a 6-degree head shake and a soft sound. Negative feedback should
   teach and stay light.
3. **Take swaps on settled pieces while others fall, and lock pieces a pending
   match has claimed.** The board feels alive and no move is wasted. If turns
   stay strict, hold one swap and run it as the board settles.
4. **Pop a three-match in 180 ms:** 60 ms of squash to 0.85, then a 120 ms
   burst; tufts live on for 400 ms over the fall. The cue lands early and the
   wait stays short.
5. **Fall under gravity:** 250 cells/s² capped at 40 cells/s, so one cell takes
   about 90 ms and eight about 280 ms. Acceleration reads as physical.
6. **Stagger the starts:** 25 ms a column outward from the match, 15 ms a piece
   up a column. Overlap stops a refill moving as one slab.
7. **Land with a squash:** 1.12 wide by 0.89 tall for 60 ms, then a spring back
   within 160 ms, scaled by fall distance. A fuzzball lands like fur, not stone.
8. **Budget the move:** 600 ms from swap to settle for a simple match and 450 ms
   for each cascade step. That stays inside the 1 s limit on flow of thought.
9. **Tier the match:** three, 8 tufts a piece; four, 12 tufts, a ring to
   1.2 cells and a special piece; five or an L, 16 tufts, a ring to 2 cells and
   a 3 px shake. Size earns an object as well as an effect.
10. **Tier the cascade:** raise the pop a semitone a step, show a callout at
    steps 3, 5, 7 and 10, and warm the background from step 3. Pitch and a voice
    are the escalators the sources document.
11. **Shake only from tier five up:** 3 px for 120 ms to 8 px for 250 ms,
    falling as trauma squared, on the board layer alone, with a setting of Off,
    Low or Full.
12. **Keep hit-stop and slow motion rare:** a 50 ms stop when two specials
    combine; 0.5x speed for 600 ms with a 1.06x zoom on the winning move.
    Elsewhere a pause reads as lag.
13. **Reuse one tinted burst:** pooled tuft sprites from the atlas, lives of 350
    to 600 ms, 200 to 400 px/s, 150 alive at most. Reuse is fast and teaches
    what the burst means.
14. **Color by theme:** tufts take the piece's color; a white core flash of
    70 ms covers one cell. Baked additive glow on the dark theme; plain blending
    and darker rings on the light one, where glow washes out.
15. **Ring in 220 ms, ease-out,** to 1.2 cells for a four-match and 2.5 for the
    biggest special; neighbors' fur leans away 80 ms later and their eyes shut
    for 100 ms. The board then reads as one material.
16. **Fly a colored tuft to the goal counter,** not the eyes, which are
    Chuzzle's signature: a curved 400 ms path, 40 ms apart, 6 a match at most,
    and a 1.15x bump for 120 ms on arrival.
17. **Float a score only for four or more:** 24 px in 500 ms. Fix the draw order
    as board, pieces, held piece, tufts, rings, flights, callout, HUD, with one
    callout at a time. This avoids the sandwich.
18. **Idle life, sparingly:** a 120 ms blink every 3 to 7 s, three pieces at
    once at most; pupils drift up to 15% of the eye toward the pointer; a held
    fuzzball grows to 1.08. No idle sound. Charm comes from restraint.
19. **Hint through the pieces:** after 5 s idle the fuzzballs of one good move
    look at each other and hop 4 px twice, again every 4 s. Show the best move,
    so players trust the hint.
20. **Fake the fur with one spring a piece** (stiffness near 200, damping near
    15): its lag bends the strand tips, with no per-strand simulation. Drag is
    what makes hair read as hair.
21. **Limit flashes and offer "Reduced effects":** no full-board flash, each
    under 20% of the canvas, 400 ms apart, none in saturated red. The reduced
    mode, on with `prefers-reduced-motion`, drops shake, zoom and flights and
    fades pops in 150 ms.
22. **Pay out leftover moves fast:** one every 120 ms, speeding to 60 ms, 4 s at
    most, skipped by a tap. A bonus that drags is the stock complaint.

## Sources

- Prototype in 7 Days:
  https://www.gamedeveloper.com/game-platforms/how-to-prototype-a-game-in-under-7-days
- RPG Playground (listing):
  https://rpgplayground.com/research-making-a-juicy-game/
- GD Kelly:
  https://www.gamedeveloper.com/design/video-indies-resist-the-urge-to-juice-it-or-lose-it-
- GD Nijman:
  https://gamedeveloper.com/design/vlambeer-co-founder-shares-advice-on-building-better-action-games
- Liao (listing):
  https://dkliao.itch.io/the-art-of-screenshake-recreation/devlog/451576/quick-breakdown-of-all-the-effects
- MGSA: https://makegamessa.com/discussion/comment/16542
- Swink: https://www.gamedeveloper.com/design/game-feel-the-secret-ingredient
- GMTK (listing): https://amara.org/en/videos/po7TV1hgkspB/en-gb/3101525/
- Pichlmair & Johansen: https://arxiv.org/abs/2011.09201 (read at
  https://ar5iv.arxiv.org/html/2011.09201)
- GD Squeezing:
  https://www.gamedeveloper.com/design/squeezing-more-juice-out-of-your-game-design-
- Jamzo: https://jamzo.com/blog/game-feel-and-juice
- EastonDev:
  https://eastondev.com/blog/en/posts/dev/20260521-game-feedback-feel/
- itch Juicy:
  https://itch.io/blog/1059831/making-a-game-feel-juicy-with-simple-effects
- WP Peggle: https://en.wikipedia.org/wiki/Peggle
- Gamezebo Peggle:
  https://www.gamezebo.com/news/peggle-how-a-spark-started-a-fever/
- Gamezebo B2: https://www.gamezebo.com/reviews/bejeweled-2-deluxe-review/
- WP Bejeweled 3: https://en.wikipedia.org/wiki/Bejeweled_3
- BJ Wiki Blitz: https://bejeweled.wiki.gg/wiki/Bejeweled_Blitz
- Game Informer:
  https://www.gameinformer.com/b/features/archive/2010/11/28/gem-polishers.aspx
- GD CCS Audio:
  https://www.gamedeveloper.com/audio/why-candy-crush-saga-is-so-engaging-an-audio-breakdown
- FunTrivia:
  https://www.funtrivia.com/trivia-quiz/VideoGames/Candy-Crush-Saga-366578.html
- GD King UX:
  https://www.gamedeveloper.com/business/ux-insights-how-king-com-is-shaping-the-future-of-match-3-part-1-
- PG.biz King:
  http://www.pocketgamer.biz/competitive-or-casual-designing-candy-crush-with-a-spectrum-of-flavours/
- DoF Royal Match:
  https://www.deconstructoroffun.com/blog/2021/3/21/royal-match-the-new-king-from-turkey
- TWIL:
  https://thisweekinliveops.substack.com/p/5-simple-ux-lessons-from-royal-match
- Funovus:
  https://funovus.com/blogs/royal-match-dominates-match-3-what-can-all-designers-learn
- Habr: https://habr.com/en/articles/715286
- PG Two Dots:
  https://ee.pocketgamer.com/articles/084194/two-dots-simple-yet-satisfying-puzzle-gameplay/
- Threes Letters: https://asherv.com/threes/threemails/
- AV Club:
  https://www.avclub.com/the-iphone-hit-threes-gives-you-cuteness-where-you-leas-1798266309
- WP Zoo Keeper: https://en.wikipedia.org/wiki/Zoo_Keeper_(2003_video_game)
- WP Puzzle League: https://en.wikipedia.org/wiki/Puzzle_League
- WP Dr. Mario: https://en.wikipedia.org/wiki/Dr._Mario
- Mario Wiki Virus: https://www.mariowiki.com/Virus
- Hard Drop TA (listing): https://www.harddrop.com/wiki/Tetris_Attack
- Tetris Wiki: https://tetris.wiki/Line_clear
- Pocket Gamer Chuzzle: https://www.pocketgamer.com/chuzzle-mobile/review/
- Gamezebo Chuzzle: https://www.gamezebo.com/reviews/chuzzle-review/
- Common Sense: https://www.commonsensemedia.org/app-reviews/chuzzle
- TNW:
  https://thenextweb.com/news/app-store-classics-cute-clever-confounding-its-chuzzle
- WP Chuzzle: https://en.wikipedia.org/wiki/Chuzzle
- GD Azkend:
  https://www.gamedeveloper.com/design/azkend-2-and-match-3-games-on-consoles
- Azumo (listing): https://azumo.com/insights/the-logic-behind-match-3-games
- Kodeco (listing):
  https://www.raywenderlich.com/58-how-to-make-a-game-like-candy-crush-with-spritekit-and-swift-part-3
- CS50 (listing): https://cs50.harvard.edu/games/notes/3/
- games.gg: https://games.gg/news/sweet-bonanza-tumbling-reels-design/
- NN/g Limits:
  https://www.nngroup.com/articles/response-times-3-important-limits/
- NN/g Duration: https://www.nngroup.com/articles/animation-duration/
- Material: https://m1.material.io/motion/duration-easing.html
- web.dev Easing: https://web.dev/articles/choosing-the-right-easing
- Val Head: https://valhead.com/?p=2978
- Comeau:
  https://www.joshwcomeau.com/animation/a-friendly-introduction-to-spring-physics/
- Morris:
  http://www.pocketgamer.biz/best-of-british-stephen-morris-considers-the-split-second-timings-needed-for-intuitive-controls/
- WP 12 Principles:
  https://en.wikipedia.org/wiki/Twelve_basic_principles_of_animation
- 80.lv Staples: https://80.lv/articles/vfx-staples-shape-color-and-motion/
- 80.lv Kim:
  https://80.lv/articles/stylized-vfx-and-animation-production-for-games
- VFX Apprentice:
  https://www.vfxapprentice.com/blog/the-soul-of-effects-what-is-timing-in-vfx
- VFX Apprentice (listing):
  https://www.vfxapprentice.com/blog/creating-vfx-style-guides-for-games
- W3C 2.3.1:
  https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html
- W3C 2.3.3:
  https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html
- XAG 117:
  https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/117
- XAG 118:
  https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/118
- GAG Flicker:
  https://gameaccessibilityguidelines.com/avoid-flickering-images-and-repetitive-patterns/
- WP Porygon: https://en.wikipedia.org/wiki/Denn%C5%8D_Senshi_Porygon
- Apple RM:
  https://developer.apple.com/help/app-store-connect/manage-app-accessibility/reduced-motion-evaluation-criteria
- web.dev Motion: https://web.dev/learn/accessibility/motion
- gamedev.tv (listing):
  https://community.gamedev.tv/t/enhanced-camera-shake-with-perlin-noise/204230
- web.dev Rendering: https://web.dev/articles/rendering-performance
- MDN Canvas:
  https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas
- Repo skill (a local file, not the web):
  `.agents/skills/phaser-canvas-performance/SKILL.md`
