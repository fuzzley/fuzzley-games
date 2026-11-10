# Layout and levels: how paddle brick breakers fill a screen and a campaign

Read 2026-11-10 from wikis, manuals, reviews, guides, interviews and design
essays; no source code was opened and no asset copied. Pages came through a
fetch tool that summarises, so everything is paraphrased; the file holds one
direct quote (section 2, first bullet). "(inferred)" marks my own reading;
"(listing)" marks a fact taken only from a search result summary whose page I
could not open. Tags in square brackets are in Sources.

## 1. Wide screens: what sits beside a portrait playfield

- **Arkanoid (arcade, 1986), the whole screen is field.** A vertical monitor
  (224x256 by one spec sheet (listing)), one knob and one button, and nothing
  beside the bricks. 33 rounds, the last a boss. [Pixelated Arcade] [WP
  Arkanoid]
- **Arkanoid DS, a tall field with a blind strip.** The field runs across both
  screens and the ball stays live but unseen while it crosses the hinge; two
  reviews single that out. Borders down both sides take about half the width and
  the paddle sits high, leaving less time to react. [NL Arkanoid DS] [HG
  Arkanoid DS]
- **Arkanoid: Eternal Battle, rivals as a moving backdrop.** In the 25-player
  mode your field stays centred while the others' fields sit behind it and
  reshuffle as scores change; two reviews call that motion distracting. User
  reviews add that message pop-ups over the field are far too large (listing).
  [GameSpew Eternal Battle] [PN Eternal Battle]
- **Breakout Beyond (2025), the field turned on its side.** Paddle on the left
  edge, bricks to the right, the view scrolling right toward an exit as bricks
  break; 72 levels. One review calls it a better fit for wide screens; another
  says the Pong-style view makes it far harder. An update then added a vertical
  TATE mode, after players had been rotating their monitors. [NL Beyond] [IG
  Beyond] [WTMG Beyond] [Vice Beyond]
- **Shatter, three arena shapes.** The bat sits at the bottom, at the left edge,
  or on the rim of a circle. Reviewers treat bottom and left as one game seen
  from two sides; circles change the bounces, hide whether the ball is coming or
  going, and one review says they work far worse. [Stack Shatter] [XboxHub
  Shatter]
- **DX-Ball 2: 20th Anniversary, wide boards are separate boards.** The 2018
  edition keeps the 150 original boards and adds widescreen variants of the sets
  plus a Classic mode; the old boards were not stretched (inferred). [Steam
  DX-Ball 2] [WP DX-Ball 2]
- **M2 ShotTriggers, Gadgets beside a vertical shooter.** Battle Garegga
  Rev.2016 fills both sides with 11 panels, each one switchable: per-stage
  score, input display, a live graph of the hidden difficulty rank, ships left,
  special weapons left, boss escape timer, boss health, next item drop, fire
  rate, progress to a hidden unlock. The other choice is wallpaper (the arcade
  instruction card). A critic rates the panels very highly for a game whose rank
  system took players years to decode. [M2 Garegga] [Retronauts M2]
- **Other vertical ports: wallpaper, zoom windows, rotation, instruction
  cards.** Mushihimesama offers wallpapers and up to four movable windows that
  enlarge the score, bombs and ship (a reader's comment). An Ikaruga review says
  the borders eat the screen and rates the rotated mode its best addition. A
  bezel maker fills the sides with the cabinet's instruction cards, redrawn to
  be readable, and calls a picture of a cabinet redundant. [NL Mushihimesama]
  [MV Ikaruga] [Libretro bezels]
- **Demon's Tilt (pinball), goals at the right.** A table three screens tall
  shows a summary of the current goals at the right of a 16:9 screen. Zoom-out,
  portrait and ball-trail options exist because the ball is hard to follow. [NL
  Demon's Tilt]
- **Tetris and Peggle, the two standing jobs of a side panel.** Tetris puts the
  next queue (up to six pieces) at the right or top of the 10x20 field and keeps
  a hold slot: what is coming, what is banked. Peggle has a tube of balls left
  on the left and a meter of orange pegs hit on the right (listing): what is
  left, how near the goal is. [Tetris Wiki] [Peggle Wiki]
- **Two small breakers: timers shown, goals hidden.** Brick Breaker Lightspeed
  moved each active power-up's remaining time to the right-hand side. Micro
  Breaker's reviewers complain that no timer is on screen and that a level's
  star requirements can only be seen after it ends. [Lightspeed devlog]
  [Game-Solver Micro Breaker]
- **Not found.** The status column of Arkanoid's home ports or Alleyway (three
  wikis refused the fetch); what Ricochet, Wizorb or Block Breaker Deluxe put
  beside the field; a critic weighing bezel art against information panels
  directly; pinball beyond threads about cropping (listing).

## 2. Wider playfields and more paddles

- **Atomic Ball (iPhone), landscape as squash.** The reviewer says portrait
  breakers keep the action far from the paddle; forced landscape brought it
  close, a change likened to "tennis to squash", and made play more frantic.
  [9/10 Atomic Ball]
- **Banananoid, a field wider than the screen.** An extra-wide scrolling field:
  the reviewer cannot see the far side, the ball goes near-horizontal at speed
  and the paddle cannot cover the width. [Acid-Play Banananoid]
- **Breakout Beyond, speed had to be bought back.** The paddle moves too fast
  for precise hits, readers find the default stick sensitivity too high, and
  later stages all but require the slow-time Focus button, which costs points.
  The sharpest complaint is a run lost after five minutes for no clear reason.
  [IG Beyond] [NL Beyond] [WTMG Beyond]
- **Nelson, two paddle rules.** Faster sideways movement makes the ball easier
  to reach; a wider face makes it easier to hit. Slow and wide suits casual
  play, fast and narrow gives tension. A wider field needs one or both raised,
  and Arkanoid DS shows the opposite failure, a field too short to react in
  (inferred). [Nelson] [NL Arkanoid DS]
- **Twin Breaker, paddles move to the side walls.** Two paddles at the bottom,
  one per stick; later stages put them on the side walls, then on sides and
  bottom together. The reviewer calls these the hardest stages; there are only a
  handful. [XT Twin Breaker] [PS Twin Breaker]
- **Older multi-paddle forms.** Super Breakout's Double mode stacks two paddles
  and plays two balls. Kirby's Block Ball puts paddles along several edges with
  spikes on the rest; one late round has them on all four sides (listing).
  Brickies has a paddle top and bottom. [WP Super Breakout] [WP Kirby's Block
  Ball] [WiKirby] [Macworld Brickies]
- **Both orientations as an option.** Micro Breaker plays in portrait and
  landscape; the ball can get trapped at the edge in some portrait layouts. The
  accessibility guideline asks for both, since a mounted device cannot be
  turned. [Game-Solver Micro Breaker] [GAG orientation]
- **Not found.** Ball travel time against field width; a breaker that reflows a
  level to the window; a designer explaining an aspect ratio.

## 3. Level design patterns

- **Nelson, twelve level types.** Central mass, wall, columns, mesh, bumpers,
  peek-a-boo, oddball, angle, split screen, cavern, arena (scrolling) and
  representational (pictures). His one note on pictures: make sure they play as
  well as they look. Oddball levels are the signature ones that show what only
  this game does. [Nelson]
- **Nelson, voids, bait and a checklist.** Crowded fields restrict the ball and
  make openings dull; the best pick-ups go in a wall's core or top row;
  unbreakable blocks are for limiting access and steering. Then ask: is there a
  strong first impact and a first choice, does the ball come back promptly (if
  not, release a second), would the level hold up if the ball vanished for 10
  seconds, how long is too long? [Nelson]
- **Nelson, ordering a campaign.** Sort by measured difficulty, place a visual,
  oddball or boss level every 5 to 10 levels, put a few favourites early, climb
  in steps with plateaus, keep a menu for replays. His playtest contrast: a
  level averaging 6 minutes, 4 lives and 80% of power-ups used, against one at
  90 seconds with no life lost. [Nelson]
- **Breakout (1976), the pocket above the wall.** Eight rows in four colour
  bands. Sending the ball up an edge column so it rattles above the wall is the
  remembered best play, yet the rules punish it: the paddle halves at the top
  wall and the ball speeds up on the orange and red rows. [WP Breakout] [ED
  Shatter]
- **Arkanoid (NES), the early unbreakable row.** A reviewer finds round 3's row
  of gold bricks too hard for a third level and later rounds tedious: nearly
  every brick takes several hits and layouts repeat. Praised: round 5 (a Space
  Invaders picture) and round 10 (an L-shaped pocket for splitting the ball).
  [RGR Arkanoid NES]
- **Wizorb, late levels lean on walls and density.** Past halfway the levels
  rely on many unbreakable obstacles or packed screens; the reviewer often
  cleared nearly everything, lost on the last few bricks and had to restart, and
  found 12 levels a world too many for a sitting. [Dtoid Wizorb]
- **Alleyway, eight layouts shown three ways.** 24 stages are 8 layouts, each
  played static, then scrolling sideways, then advancing downward, with a bonus
  picture stage after every three: 32 in all. Critics found it repetitive within
  a couple of screens. [WP Alleyway]
- **Set sizes across the genre.** Arkanoid 33 (NES 36); Revenge of Doh 34 drawn
  from 64 by choosing a left or right gate; Doh It Again 99 with a boss about
  every 10; Arkanoid DS 28 worlds of 5; Shatter 10 worlds of 7 levels, a boss
  and a bonus (listing); Wizorb 5 worlds of 12 and a boss; Twin Breaker 4 sets
  of 10 and a boss; Arkanoid vs Space Invaders 150 in worlds of 14 and a boss.
  [WP Arkanoid] [WP Revenge of Doh] [PWSP Doh It Again] [WP Arkanoid DS] [Dtoid
  Wizorb] [XT Twin Breaker] [Dtoid AvSI]
- **Bonus stages and bosses.** Alleyway's bonus stage lets the ball pass through
  bricks on a 95-second clock that shrinks by 5 each time; failing costs no
  life. Wizorb hides shop doors and bonus rooms at the top of levels. Twin
  Breaker's bosses need 10 hits with bricks still in play, and one fell in about
  10 seconds to a gun power-up. [WP Alleyway] [Dtoid Wizorb] [XT Twin Breaker]
- **Moving parts and escape hatches.** Revenge of Doh has bricks that slide
  sideways when unblocked and notched silver bricks that regrow and need not be
  cleared. Ricochet Infinity has levels where the paddle drags the whole board,
  and players stuck on one named level. LBreakout2's manual offers a warp key
  (after a set share of bricks) and a single-brick remover, as a workaround for
  badly designed add-on levels. [WP Revenge of Doh] [JIG Ricochet] [LBreakout2
  manual]
- **How long a level takes: no stated target found.** Arkanoid vs Space Invaders
  levels usually last under a minute. Twin Breaker's 40 stages took about 3
  hours; Wizorb's 60 and Shatter's story a few hours each: roughly 3 to 5
  minutes a level with retries (inferred). No designer gives a target such as 1
  to 3 minutes, or a brick count; Nelson says to measure it. [Dtoid AvSI] [XT
  Twin Breaker] [Gem's Bok Wizorb] [XboxHub Shatter] [Nelson]

## 4. Difficulty and pacing

- **Breakout (1976), fixed and readable triggers.** The ball speeds up after 4
  hits, after 12 hits, and on first touching the orange and the red rows; the
  paddle halves once the ball reaches the top wall. Three turns to clear two
  walls of 448 points each. [WP Breakout]
- **Alleyway, the same rules softened.** From stage 4 the paddle halves on a
  ceiling touch, but only until the stage ends or a life is lost; only dark
  bricks speed the ball; a looping ball has its angle changed at random after
  the second cycle. Five paddles, one more per 1,000 points, nine at most. [WP
  Alleyway]
- **Arkanoid, speed-ups players cannot read.** A user review says the ball
  speeds up for reasons the player cannot see (listing). An Eternal Battle
  review says it sometimes gets too fast to return and asks for an easy mode.
  [XT Eternal Battle]
- **Shatter, the genre's faults named and answered.** Its director lists
  intermittent interaction, slow pacing, dull presentation and the last-brick
  problem. The game answers with suck and blow to bend the ball in flight, a
  glowing pip at the next impact point, only positive power-ups, a 1UP after
  each death and restart from the point of failure. [IGF Shatter] [Stack
  Shatter] [ED Shatter]
- **Other last-brick tools, and the complaint that survives them.** BreakQuest:
  right-click raises gravity on the ball. Ricochet Infinity: right-click recalls
  it. Wizorb: a fireball, a wind gust and placing the ball by hand, on a mana
  bar. Brickies: a level clock instead of lives. Still, Wizorb is faulted for
  the time the last brick takes and Recharged for dead time between brick sets.
  [Gamezebo BreakQuest] [JIG Ricochet] [Dtoid Wizorb] [Macworld Brickies] [PG
  Wizorb] [EGM Recharged]
- **Lives, barriers and restarts.** Arkanoid DS and Plus put a barrier under the
  paddle that returns the ball three times. Arkanoid vs Space Invaders and
  Brickies have no lives, only a clock. Eternal Battle has endless continues but
  no save, and a reviewer lost ten levels. [NL Arkanoid DS] [NL Arkanoid Plus]
  [Dtoid AvSI] [Macworld Brickies] [XT Eternal Battle]
- **Difficulty settings, with numbers.** LBreakout2: Easy has a paddle of 72 to
  180 pixels, a ball at 240 to 400 pixels a second and 20% less score; Medium 72
  to 144 and 270 to 430; Hard 52 to 108, 300 to 450 and 30% more score. DX-Ball
  2 and Ricochet Infinity have a kids' mode; reviews of NES Arkanoid and Eternal
  Battle ask for settings. [LBreakout2 manual] [WP DX-Ball 2] [Ricochet Wiki]
  [RGR Arkanoid NES] [PN Eternal Battle]
- **Nelson, tuning for casual players, and bad pick-ups.** Larger blocks, more
  one-hit blocks, a bigger gap above the paddle, a wider paddle, a moderately
  slow ball, auto-targeting, aids to see the ball. Power-downs should look
  plainly bad; BreakQuest's are hard to tell from good ones in play. [Nelson]
  [Gamezebo BreakQuest]
- **Per-level goals.** Micro Breaker gives three stars: finish in time, pick up
  the buffs, collect the score drops. Brick Breaker Hero has three stars on each
  of 200-plus levels. Kirby's Block Ball sets a Border Line score per stage
  (120,000 to 138,000 (listing)) and withholds the last stage unless all are
  beaten. Not found: dynamic difficulty, beyond Shatter dropping extra lives
  when few are left. [Game-Solver Micro Breaker] [App Store BB Hero] [WiKirby]
  [HG Shatter]

## 5. Controls and accessibility

- **Knob against digital.** The arcade knob moves the paddle at any speed;
  keyboards and digital sticks move it at one speed, which made those ports
  harder. On the C64 the bat is clearly better with a mouse or paddles; an NES
  review finds the pad's single speed of little use. [Pixelated Arcade]
  [C64-Wiki] [RGR Arkanoid NES]
- **Speed modifiers for digital input.** Alleyway: hold A or B to change paddle
  speed. Doh It Again: a speed-up button, and default speed as an option. Arka:
  a key that halves paddle speed. Wizorb: the d-pad is slower and more precise
  than the stick. [WP Alleyway] [PWSP Doh It Again] [Arka devlog] [Dtoid Wizorb]
- **Mouse: direct tracking is what players expect.** PowBall Renaissance gives
  the paddle inertia so it cannot jump across the field; a player found that
  less accurate than DX-Ball or Ricochet until sensitivity was raised. On the
  web, a player lost every life when the cursor left the game frame (listing).
  [PowBall forum]
- **Touch: drag below the paddle.** Arkanoid vs Space Invaders takes drags in a
  thick band under the paddle; a system gesture at the bottom edge sometimes
  fired. Arka offers a paddle offset of 0, 10, 20 or 30 pixels so the finger
  does not cover the paddle. Micro Breaker's paddle lags the finger and the
  thumb hides the screen. [Dtoid AvSI] [Arka devlog] [Game-Solver Micro Breaker]
- **Sticks and special controllers.** Breakout Beyond's default stick
  sensitivity is too high for several readers. Arkanoid Plus is d-pad only and
  Eternal Battle has no touch or paddle option, both criticised; on PC a USB
  spinner acting as a mouse played faultlessly. [NL Beyond] [NL Arkanoid Plus]
  [PN Eternal Battle] [Caltrops Eternal Battle]
- **Launch and aim aids.** Brick Breaker Lightspeed shows where the ball will
  launch before the countdown ends. Shatter marks the next impact point. Kirby's
  needle ability holds the ball on the paddle for a better relaunch. [Lightspeed
  devlog] [Stack Shatter] [WP Kirby's Block Ball]
- **Guidelines that apply, and the matching complaints.** Basic tier: a game
  speed setting, control sensitivity, remapping, nothing told by colour alone (8
  to 10% of men have red or green difficulty), high contrast, no flicker,
  separate volume sliders. Intermediate: a toggle for any held button,
  difficulty changeable mid-game, assist modes, background motion off. Reviews
  echo them: turn off Recharged's screen shake at once; Beyond's flashes hide
  the ball; Micro Breaker's ball is tiny. [GAG list] [GAG colour] [GAG speed]
  [EGM Recharged] [IG Beyond] [Game-Solver Micro Breaker]
- **Sound, and what was not found.** Blindfold Breakout is audio only: tilt to
  move, hear the ball approach in headphones (listing). Alleyway was praised for
  distinct collision sounds; Arkanoid DS's bounce sound grated until muted. Not
  found: an accessibility review of a paddle breaker, or pause on focus loss.
  [WP Alleyway] [HG Arkanoid DS]

## 6. Progression and meta

- **Maps and gates.** Block Breaker Deluxe: a map of seven places of 10 levels
  and a boss, opened in order; an endless random place can be bought. Micro
  Breaker: 130 stages in 4 zones with a choice of route. Arkanoid DS: 28 worlds
  in a pyramid, so one run sees only part. Arkanoid vs Space Invaders: a hard
  version of each world once cleared. [WP Block Breaker Deluxe] [Game-Solver
  Micro Breaker] [WP Arkanoid DS] [Dtoid AvSI]
- **Things to collect, cosmetic or not.** Ricochet Infinity hides gold rings in
  every level; they unlock ships and balls and cannot be collected once the last
  brick is gone, so players replay. Arkanoid DS sells purely cosmetic brick
  skins, borders and paddle looks for points. Wizorb spends gold on rebuilding a
  town, which one reviewer ignored. [WP Ricochet Infinity] [JIG Ricochet] [HG
  Arkanoid DS] [Dtoid Wizorb]
- **Modes that reuse the game.** Shatter: Endless and Time Attack (solo or
  co-op, with global boards), Boss Rush and a Bonus mode. Brickies endless: each
  brick adds time and rows enter from top and bottom. Super Breakout
  Progressive: the wall steps down. Micro Breaker: stages in random order for a
  streak. Arkanoid DS Quest: old levels under a time limit or a cap on bounces.
  [XboxHub Shatter] [Macworld Brickies] [WP Super Breakout] [Game-Solver Micro
  Breaker] [HG Arkanoid DS]
- **Leaderboards.** Recharged gives every challenge its own board but never
  shows how many locked challenges remain. DX-Ball 2's arcade site kept top-30
  weekly and all-time tables. Twin Breaker's lack of a board was a complaint.
  One player notes impossible top scores and ignores boards. [EGM Recharged] [WP
  DX-Ball 2] [XT Twin Breaker] [Stack Shatter]
- **Editors and sharing.** Ricochet Infinity has an editor and an in-game
  downloader for player-made sets; a fan site still hosts them (listing).
  DX-Ball 2's anniversary edition added editing tools and Workshop sharing. Doh
  It Again's editor cannot save, a named complaint. [WP Ricochet Infinity]
  [Steam DX-Ball 2] [PWSP Doh It Again]
- **What brings people back, and what sends them away.** Variety is the stated
  pull: BreakQuest is praised for making every level its own thing, Wizorb for a
  new board each time. Sameness is the stated push: Alleyway, NES Arkanoid's
  later rounds, Wizorb on a second run, Shatter's extra modes after a few high
  scores. [Gamezebo BreakQuest] [Gem's Bok Wizorb] [WP Alleyway] [RGR Arkanoid
  NES] [Dtoid Wizorb] [XboxHub Shatter]

## What stands out for our game

Ranked by how much each would help; all inferred from the findings above.

- **1. Fill the empty 60% with live information, not art.** M2's Gadgets are the
  best-received use of side space found; moving backdrops and pop-ups over the
  field are what reviewers complain about. Risk: motion beside the field pulls
  the eye off the ball, so change panels only on events.
- **2. Left: this level and what comes next. Right: brick legend and live
  counts.** That matches the two jobs side panels do elsewhere and our sibling
  designs; add the level's goals, which Micro Breaker hides, and mark each brick
  kind by more than colour. Risk: duplicating the top bar; move items out of it.
- **3. Keep the field portrait; do not stretch it to the window.** Breakout
  Beyond had to patch in a vertical mode, a too-wide field outran its paddle,
  and DX-Ball 2 drew separate wide boards. Risk: the field still looks narrow,
  so scale it to the full window height.
- **4. Give the player a tool for the last bricks.** It is the genre's most
  repeated complaint and each admired breaker has an answer (a nudge in flight,
  a recall, a clock, a warp). Risk: it can trivialise steel mazes, so make it
  cost the streak.
- **5. Make speed changes readable and show the current step.** Breakout's fixed
  triggers are learnable; Arkanoid's hidden ones get called unfair. Risk: one
  more number on screen.
- **6. Medals per level on top of best score.** Three goals (clear, time, no
  life lost) give 30 levels a second pass. Risk: gating by medals; Kirby's
  withheld last stage is the warning, so keep the linear unlock.
- **7. Close each set of 10 with a signature level and add a no-fail timed
  bonus.** Nelson's rhythm and Alleyway's bonus stage both fit three sets of
  ten. Risk: boss levels need mechanics from another slice.
- **8. Give the autopilot test a time budget, and steel a rule.** Clearable is
  not pleasant: flag levels far slower than their set's median, keep unbreakable
  rows out of early levels, give each steel maze a door and a pocket above.
  Risk: autopilot time is not human time.
- **9. Assist toggles beside the speed setting.** A wider paddle, a three-bounce
  floor barrier as in Arkanoid DS, a high-contrast ball or trail, shake and
  flashes off. Risk: best scores stop being comparable, so mark assisted ones.
- **10. Input details.** Touch drag in a band under the paddle with an offset
  setting, pause when the pointer leaves the window, a half-speed key for
  keyboard play. Risk: defaults matter more than options; test on real phones.
- **11. Small modes from the 30 levels; sharing last.** Time attack against your
  own best and a random-order streak cost little but fade after a few high
  scores. Level sharing kept Ricochet and DX-Ball 2 alive and is the costliest
  item. Risk: scope.

## Sources

- Nelson: Mark Nelson, "Breaking Down Breakout" (Gamasutra, 2007) <https://www.gamedeveloper.com/design/breaking-down-breakout-system-and-level-design-for-breakout-style-games>
- Wikipedia (WP), each at `https://en.wikipedia.org/wiki/` plus: `Arkanoid`, `Arkanoid:_Revenge_of_Doh`, `Arkanoid_DS`, `Breakout_(video_game)`, `Super_Breakout`, `Alleyway_(video_game)`, `Kirby%27s_Block_Ball`, `Block_Breaker_Deluxe`, `DX-Ball_2`, `Ricochet_Infinity`
- Nintendo Life (NL), each at `https://www.nintendolife.com/` plus: `games/ds/arkanoid_ds/review` (Arkanoid DS), `reviews/2009/08/arkanoid_plus` (Arkanoid Plus), `reviews/switch-eshop/breakout-beyond` (Beyond), `reviews/switch-eshop/mushihimesama` (Mushihimesama), `reviews/switch-eshop/demons_tilt` (Demon's Tilt)
- Game Accessibility Guidelines (GAG), each at `https://gameaccessibilityguidelines.com/` plus: `full-list/` (list), `include-an-option-to-adjust-the-game-speed/` (speed), `ensure-no-essential-information-is-conveyed-by-a-colour-alone/` (colour), `allow-play-in-both-landscape-and-portrait/` (orientation)
- Pixelated Arcade: <https://www.pixelatedarcade.com/games/arkanoid> (spec sheet, listing: <https://pixelatedarcade.com/games/arkanoid/techspecs>)
- C64-Wiki: <https://www.c64-wiki.com/wiki/Arkanoid>
- RGR Arkanoid NES: <https://retrogamesreview.co.uk/2017/05/arkanoid-nes-review.html>
- PWSP Doh It Again: <https://playingwithsuperpower.com/?p=9083>
- HonestGamers (HG): Arkanoid DS <https://www.honestgamers.com/7194/ds/arkanoid-ds/review.html>; Shatter <https://www.honestgamers.com/8965/playstation-3/shatter/review.html>
- Eternal Battle reviews: GameSpew <https://www.gamespew.com/2022/10/arkanoid-eternal-battle-review/>; PN, Pure Nintendo <https://purenintendo.com/review-arkanoid-eternal-battle-nintendo-switch/>; Caltrops <https://caltrops.com/?p=18779>
- Xbox Tavern (XT): Eternal Battle <https://www.xboxtavern.com/arkanoid-eternal-battle-review/>; Twin Breaker <https://www.xboxtavern.com/twin-breaker-a-sacred-symbols-adventure-review/>
- Breakout Beyond: WTMG, Way Too Many Games <https://waytoomany.games/2025/05/28/review-breakout-beyond/>; IG, Impulse Gamer <https://www.impulsegamer.com/?p=242635>; Vice <https://www.vice.com/en/article/breakout-beyond-broke-boundaries-by-going-horizontal-but-a-new-update-brings-verticality-back-to-the-game/>
- EGM Recharged: <https://egmnow.com/breakout-recharged-review/>
- XboxHub Shatter: <https://www.thexboxhub.com/shatter-remastered-deluxe-review/>
- Shatter: Stack, The Stack <https://wurb.com/stack/archives/tag/cactus>; ED, Electron Dance <https://www.electrondance.com/?p=1263>; IGF, Road to the IGF interview <https://gamedeveloper.com/game-platforms/road-to-the-igf-sidhe-s-i-shatter-i->
- Steam DX-Ball 2: <https://store.steampowered.com/app/922400>
- JIG Ricochet: <https://games.jayisgames.com/review/ricochet-infinity.php>
- Ricochet Wiki: <https://wiki.ricochetuniverse.com/wiki/Ricochet_Infinity>
- Destructoid (Dtoid): Wizorb <https://destructoid.com/?p=94814>; AvSI, Arkanoid vs Space Invaders <https://www.destructoid.com/review-arkanoid-vs-space-invaders/>
- PG Wizorb: <https://www.pocketgamer.com/wizorb/wizorb-review/>
- Gem's Bok Wizorb: <https://thegemsbok.com/art-reviews-and-articles/video-game-reviews-mid-week-mission-wizorb-tribute-games/>
- PS Twin Breaker: <https://www.pushsquare.com/reviews/ps4/twin_breaker_a_sacred_symbols_adventure>
- 9/10 Atomic Ball: <https://www.nineoverten.com/?p=7021>
- Acid-Play Banananoid: <https://acid-play.com/download/banananoid>
- M2 ShotTriggers: M2 Garegga <https://www.m2stg.com/en/battle-garegga/ps4/feature.php>; Retronauts M2 <https://retronauts.com/article/590/battle-garegga-rev2016-and-dangun-feveron-lead-the-charge-for-m2-shottriggers>
- MV Ikaruga: <https://www.megavisions.net/review-ikaruga-switch/>
- Libretro bezels: <https://forums.libretro.com/t/bezels-for-vertical-games-with-4-3-horizontal-screens/48516>
- Tetris Wiki: <https://tetris.wiki/Tetris_Guideline>
- itch.io devlogs: Arka <https://magicsofa.itch.io/arka/devlog/1007204/controls-update>; Lightspeed, Brick Breaker Lightspeed <https://silverlock-media.itch.io/brick-breaker-lightspeed/devlog/931372/-huge-103-update-visual-controller-support-and-various-qol->
- PowBall forum: <https://steamcommunity.com/app/654600/discussions/0/1634111706733570271>
- LBreakout2 manual: <http://lgames.sourceforge.io/LBreakout2/manual/>
- Gamezebo BreakQuest: <https://www.gamezebo.com/reviews/breakquest-review/>
- Macworld Brickies: <https://www.macworld.com/article/225748/you-should-play-brickies-puts-a-fresh-spin-on-the-brick-breaker.html>
- App Store BB Hero: <https://apps.apple.com/us/app/id1004678927>
- Game-Solver Micro Breaker: <https://game-solver.com/micro-breaker/>
- Listing only: WiKirby <https://wikirby.com/wiki/Kirby%27s_Block_Ball_-_Stage_11>; Peggle Wiki <https://peggle.fandom.com/wiki/Purple_Peg>; user reviews of Eternal Battle on GOG <https://www.gog.com/game/arkanoid_eternal_battle> and Steam (the summary did not say which said what); a GameSpot user review of Arkanoid <https://www.gamespot.com/arkanoid/user-reviews/2200-576125/>; AppleVis on Blindfold Breakout <https://applevis.com/comment/47339>. The Shatter world structure, the itch.io comments about the cursor leaving the frame and the pinball threads came from summaries that named no single page.

## Skipped

- **Kept shut for the no-code rule:** every repository result, MDN's and
  Kodeco's Breakout tutorials, the Code inComplete touch article, engine forum
  threads, course pages, three university handouts, PICO-8 cart threads, NESdev,
  TASVideos and The Cutting Room Floor.
- **Opened behind a check, then dropped:** Morgan McGuire's jam-game design
  document, a prose specification of a clone; nothing from it is used.
  LBreakout2 is cited only from its player manual.
- **Would not open (403, 402, 404 or a bot check):** StrategyWiki, Arcade Otaku,
  arcade-history.com, the Lost In Translation wiki, God is a Geek, GameSpot,
  WiKirby, Kirby Fandom, the Shmups forum, AppleVis, Family Gaming Database,
  Co-Optimus, GamesRadar, AppAdvice. The NES Arkanoid manual on archive.org came
  back as an unreadable scan.
- **Thin results:** home-port side panels, pinball side space, a stated
  level-length target, an accessibility review of a paddle breaker.
