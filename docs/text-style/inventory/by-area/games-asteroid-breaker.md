# Text inventory: games/asteroid-breaker

Written by `extract.mjs`; do not edit by hand. Each entry gives its line,
where it sits, and its text, with `{{ … }}` or `{…}` where a value is put
in, keys in square brackets and bold lead-ins in asterisks.

## How to play and rules

### src/app/help/help.component.html

- 2 `<p>` Fly the ship and break every rock on the field to clear the wave. The field wraps: what leaves by one edge comes back by the other. The waves go on as long as the crew lasts.
- 7 `<p>` **The crew.** {{ crew }}
- 8 `<p>` **Scoring.** Each rock scores by its kind and its size, a smaller one more. {{ scoring.sparks }} {{ scoring.strays }} {{ scoring.clearing }}
- 13 `<p>` **Static.** {{ charge }}
- 14 `<p>` **Dashing.** {{ dashing }}
- 15 `<p>` **Pausing.** The game pauses itself when you switch away, turn the screen or open a dialog, and goes on only when you say.
- 24 `<th>` Mouse
- 25 `<th>` Touch
- 26 `<th>` Keyboard
- 31 `<th>` Turn
- 32 `<td>` Point; the ship turns toward the pointer
- 33 `<td>` Push the stick the way to face
- 34 `<td>` Hold [←] or [→], or [A] or [D]
- 39 `<th>` Thrust
- 40 `<td>` Hold the right button
- 41 `<td>` Push the stick further
- 42 `<td>` Hold [↑] or [W]
- 45 `<th>` Fire
- 46 `<td>` Hold the left button
- 47 `<td>` Hold Fire, or, in the settings, have the ship fire by itself
- 48 `<td>` Hold [Space]
- 51 `<th>` Dash
- 52 `<kbd>` Shift
- 53 `<td>` Dash
- 54 `<td>` [Shift], [↓] or [S]
- 57 `<th>` Pause, or go on
- 58 `<td>` Pause, then Resume
- 59 `<td>` Pause, then Resume, or move or fire
- 60 `<td>` [P]; [Esc] pauses, and [Enter] or a flight key goes on
- 66 `<th>` Next wave
- 67 `<td>` Next wave
- 68 `<td>` Move or fire
- 69 `<td>` [Enter] or a flight key
- 72 `<th>` Start again, once a run has ended
- 73 `<td>` New game
- 74 `<td>` New game, or move or fire
- 75 `<td>` [Enter], [P] or a flight key

### src/app/help/help.component.ts

- 42 `CREW =` The pilot flies the ship with {String(FIRST\_CREW - 1)} of the crew in tow, who are its lives, and a stray caught joins them, up to {String(MOST\_CREW - 1)}. A rock or a comet that touches the ship, unless it is dashing or shielded, knocks the last in tow loose, and nothing can touch it again for {String(HIT\_GUARD\_MS / 1000)} seconds; fly into one knocked loose within {String(LOOSE\_LIFE\_MS / 1000)} seconds to catch it again, or it floats home, and clearing the wave catches every one still loose. A hit with no one in tow sends the pilot home, and the run ends.
- 46 `sparks:` Each rock a shot or a blast breaks sheds sparks, which the ship draws in from {String(SPARK\_DRAW\_REACH)} units, {String(Math.round(SPARK\_DRAW\_REACH * SPEED\_INFO.relaxed.sparkReach))} at {SPEED\_INFO.relaxed.name}, and the ship and those in tow gather: each scores {String(SPARK\_POINTS)} and adds {String(SPARK\_STATIC)} static, up to {String(STATIC\_MOST)}.
- 47 `strays:` A stray caught scores {formatPoints(STRAY\_POINTS)}, or {formatPoints(STRAY\_HOME\_POINTS)} as it goes straight home, times static's multiplier.
- 48 `clearing:` A wave cleared adds {formatPoints(CLEAR\_POINTS)} points, and {formatPoints(CLEAN\_POINTS)} more when no hit was taken on it.
- 52 `CHARGE =` Static multiplies what rocks, sparks and strays score: {tierWords(STATIC\_STEPS, "static")}. A rock or a comet that passes close by the ship without touching it adds {String(GRAZE\_STATIC)}. The pilot's fur lifts with each step, on end from ×{String(MOST\_LIFT + 1)}, and at full static, {String(STATIC\_MOST)}, arcs crawl over the ship. Static drains after {String(STATIC\_HOLD\_MS / 1000)} seconds with no spark or near miss, and a hit knocks it down a step.
- 55 `DASHING =` A dash throws the ship ahead, and no rock or comet can hit it while it lasts; it takes {String(DASH\_RECHARGE\_MS / 1000)} seconds to charge again. At full static, a dash zaps: arcs leap from the ship to up to {String(ZAP\_ARCS)} rocks within {String(ZAP\_REACH)} units of the way it dashes, the nearest first, each taking a hit, and static falls by {String(ZAP\_COST)}; with none in reach, it is only a dash.
- 59 `PICKUPS_INTRO =` A broken rock may let a pickup go. Fly into it to catch it before it fades; a crystal always lets one go.
- 62 `ADRIFT_INTRO =` None of them is a rock, and a wave never needs any. Strays drift in from wave {String(STRAYS\_FROM)}, and a pilot left with no one in tow, and no one to catch again, is sent one at once, once a wave; comets and burrs come in the later waves.
- 67 `name:` Stray fuzzball
- 71 `name:` Comet
- 76 `name:` Burr
- 116 `heading:` Rocks
- 122 `heading:` Pickups
- 128 `heading:` Strays, comets and burrs

## Reference: what each thing, option and variant does

### src/app/help/help.component.ts

- 68 `about:` Crosses the field once in its bubble, which shots pass through. Fly into it to catch it: it joins the line in tow, up to {String(MOST\_CREW - 1)}, or, with the line full, goes straight home.
- 73 `about:` Warned of by a chevron at the edge it comes in by, it crosses the field, breaking any rock it touches a size down, and hits the ship as a rock does unless the ship is dashing or shielded.
- 77 `about:` A seed of barbed thorns that drifts in at an edge and, once near the ship, turns toward it. Only a shot pops it, for {formatPoints(BURR\_POINTS)} points times static's multiplier. One that touches the ship clings, each taking {String(Math.round(BURR\_SLOW * 100))}% off its thrust and top speed, up to {String(MOST\_CLINGING)}, until a dash shakes them all off.

### src/rules/catalog/pickups.ts

- 41 `about:` Three shots at each pull, 12° apart, for 12 seconds.
- 48 `about:` A shot twice as often, for 12 seconds.
- 56 `about:` The next rock or comet to touch the ship breaks a size down instead, and the shield goes.
- 64 `about:` A shot flies on through what it breaks, up to three rocks, for 10 seconds.
- 71 `about:` Draws pickups, sparks and strays in from 14 units, for 15 seconds.
- 78 `about:` Rocks and comets move at half their speed, for 8 seconds.

### src/rules/catalog/rocks.ts

- 116 `about:` Breaks into two smaller rocks, and a small one into nothing.
- 126 `about:` Always lets a pickup go, sheds two more sparks, and breaks into two stones.
- 138 `about:` Shatters into three smaller, faster pieces.
- 148 `about:` Comes every tenth wave of Endless: six hits break it into three large rocks.
- 158 `about:` Takes several hits until it is small; a shot that doesn't break it rings off.
- 168 `about:` Blasts as it breaks: every rock near it takes a hit, which can set off another.
- 177 `about:` Drifts toward the ship, a little more each second.
- 187 `about:` Ends the first sector: each of the five hits it holds knocks a medium stone off it, and its sixth breaks it into three large rocks and lets two pickups go.
- 200 `about:` Ends the second sector: its iron rind rings off the first three hits it holds, each knocking a plate off it as a medium iron rock, and its sixth hit breaks it into three large rocks and lets two pickups go.
- 213 `about:` Ends the third sector: each hit it holds vents a blast from its volatile heart, which gives every rock within 6 units but a boulder a hit, and its sixth breaks it into three large rocks and lets two pickups go.

## Descriptions: blurbs, taglines, page metadata and write-ups

### README.md

- 1 `heading` # Asteroid Breaker
- 3 `paragraph` Asteroid Breaker: fly, drift and blast every rock to rubble before one finds you. Play it at https://fuzzley.games/play/asteroid-breaker/.
- 6 `paragraph` An [Angular](https://angular.dev/) app on the Fuzzley Games shared libraries (`frontend/lib/`), with its field drawn by [Phaser](https://phaser.io/) through `@fz/phaser`, built with [Vite](https://vite.dev/) and tested with [Vitest](https://vitest.dev/), the scene against real Phaser run headless. It holds thirty waves in three sectors, then Endless, whose waves are made as they are played, with stone, crystal, ice, iron, volatile and lodestone rocks and a boulder to end each sector; six pickups, Spread, Rapid and Lance, which give the ship another weapon than its gun for a while, and Shield, Magnet and Slow; stray fuzzballs to bring home, comets to dodge and burrs that cling until a dash shakes them off; and sparks that raise the pilot's static, which multiplies the score and, full, lets a dash zap the rocks near it, all played by rules that run without a framework, physics included, on a field that wraps at every edge. It plays at three speeds, by keyboard, mouse or touch, with a stick, Fire and Dash on a touch screen, pauses whenever the field loses the player, wears whichever palette the player chose on the site, and keeps a run under way across a reload, paused. Phaser loads after the page has painted, behind a drawing of the empty field.

### index.html

- 11 `<meta description>` Play Asteroid Breaker free in your browser: fly a small ship through a field that wraps at every edge, and blast every rock to rubble before one finds you. Thirty waves, then Endless, by keyboard, mouse or touch.
- 18 `<meta og:description>` Play Asteroid Breaker free in your browser: fly a small ship through a field that wraps at every edge, and blast every rock to rubble before one finds you. Thirty waves, then Endless, by keyboard, mouse or touch.
- 38 `JSON-LD description` Play Asteroid Breaker free in your browser: fly a small ship through a field that wraps at every edge, and blast every rock to rubble before one finds you. Thirty waves, then Endless, by keyboard, mouse or touch.
- 38 `JSON-LD genre` Arcade, Action game

## Picture text: alt text and captions

### index.html

- 33 `<meta og:image:alt>` A game of Asteroid Breaker on wave 9, the ship firing up past the rocks as a stray fuzzball drifts in.

## Names: games, modes, levels and things

### index.html

- 5 `<title>` Asteroid Breaker
- 17 `<meta og:title>` Asteroid Breaker
- 38 `JSON-LD name` Asteroid Breaker
- 57 `<noscript> <h1>` Asteroid Breaker

### src/app/settings/settings.component.ts

- 32 `name:` On a touch screen
- 37 `name:` Always
- 41 `name:` Never

### src/rules/catalog/pickups.ts

- 40 `name:` Spread
- 47 `name:` Rapid
- 54 `name:` Shield
- 62 `name:` Lance
- 70 `name:` Magnet
- 77 `name:` Slow

### src/rules/catalog/rocks.ts

- 115 `name:` Stone
- 124 `name:` Crystal
- 137 `name:` Ice
- 146 `name:` Boulder
- 156 `name:` Iron
- 166 `name:` Volatile
- 176 `name:` Lodestone
- 185 `name:` Crumbling boulder
- 198 `name:` Ironclad boulder
- 211 `name:` Storm boulder

### src/rules/speed.ts

- 36 `name:` Relaxed
- 44 `name:` Normal
- 52 `name:` Fast

### src/rules/waves/inner-belt.json

- 3 `name:` Inner belt
- 8 `name:` First light
- 14 `name:` Gem
- 23 `name:` Adrift
- 29 `name:` Thaw
- 38 `name:` Hail
- 44 `name:` Scatter
- 54 `name:` Crossing
- 64 `name:` Frost
- 74 `name:` Crowd
- 80 `name:` Boulder

### src/rules/waves/iron-reach.json

- 3 `name:` Iron reach
- 8 `name:` Ore
- 17 `name:` Powder
- 27 `name:` Streak
- 34 `name:` Anvil
- 44 `name:` Fuse
- 54 `name:` Shower
- 61 `name:` Foundry
- 72 `name:` Rush
- 82 `name:` Tinder
- 95 `name:` Iron heart

### src/rules/waves/storm.json

- 3 `name:` Storm
- 8 `name:` Lodestar
- 17 `name:` Whiteout
- 24 `name:` Gauntlet
- 34 `name:` Wildfire
- 44 `name:` Swarm
- 54 `name:` Lost and found
- 67 `name:` Pull
- 75 `name:` Bulwark
- 85 `name:` Tempest
- 100 `name:` Eye of the storm

### src/rules/waves/waves.ts

- 134 `name:` Endless
- 140 `name:` Endless

## Labels: buttons, menus, headings, readouts and settings

### src/app/bar/bar.component.html

- 7 `<h1>` Asteroid Breaker
- 17 `<fz-bar-choice label>` Speed
- 27 `<span>` Wave
- 32 `<span>` Score
- 43 `<span>` Crew
- 64 `<span>` Static
- 123 `<span>` New game

### src/app/bar/bar.component.ts

- 141 `label:` Sectors
- 142 `label:` New game

### src/app/board/board_card.component.html

- 29 `<p>` Paused
- 30 `<p>` Score {{ score() }}
- 42 `<button>` Resume
- 61 `<dt>` Total
- 69 `<button>` Next wave
- 77 `<p>` or just start flying
- 84 `<p>` Score {{ score() }}
- 85 `<button>` New game

### src/app/board/board_card.component.ts

- 126 `computed()` {count(this.home().length, "fuzzball", "fuzzballs")} waiting at home
- 147 `computed()` {count(this.crew().length, "fuzzball", "fuzzballs")} in the crew

### src/app/play/sector_card.ts

- 84 `wavesInWords() returns` From wave {String(first)}
- 86 `wavesInWords() returns` Wave {String(first)}
- 87 `wavesInWords() returns` Waves {String(first)} to {String(last)}

### src/app/sectors/sectors.component.html

- 1 `<fz-dialog label>` Sectors
- 11 `<h2>` Sectors

### src/app/settings/settings.component.html

- 3 `<span>` Speed
- 17 `<span>` Touch controls
- 27 `<span>` Stick
- 37 `<label>` Stick on the right
- 45 `<span>` Fire
- 55 `<label>` Fire by itself
- 63 `<span>` Haptics
- 73 `<label>` Buzz the phone
- 82 `<span>` Sound
- 92 `<label>` Play sounds
- 107 `<label>` Play the effects
- 122 `<label>` Play the fuzzball's voice
- 150 `<label>` One speaker
- 158 `<span>` Theme
- 177 `<label>` Shots carry the ship's speed

## Hints: setting descriptions, tooltips and prompts

### src/app/bar/bar.component.html

- 108 `<button title>` Sectors
- 133 `<button title>` How to play
- 154 `<button title>` Settings

### src/app/board/board_card.component.ts

- 103 `computed()` Arrows or W A D to fly; the ship fires by itself.
- 104 `computed()` Arrows or W A D to fly, Space to fire.
- 110 `computed()` Steer with the {stick} pad; the ship fires by itself.
- 111 `computed()` Steer with the {stick} pad, fire with the {buttons}.

### src/app/play/sector_card.ts

- 10 `"inner-belt"[]:` Break every rock to clear a wave.
- 11 `"inner-belt"[]:` Crystals let pickups go.
- 14 `"iron-reach"[]:` Iron holds its hits, and volatile rocks blast.
- 15 `"iron-reach"[]:` Comets cross, and burrs cling, slowing you until a dash.
- 17 `storm[]:` Lodestones drift toward the ship.
- 19 `endless[]:` Its waves are made anew each run, and never end.
- 20 `endless[]:` Comets cross every one, and a boulder comes every tenth.
- 58 `kicker:` A new run
- 58 `kicker:` A new sector

### src/app/sectors/sectors.component.html

- 12 `<p>` Choose a sector to start a run at its first wave. Reaching a sector opens it; each shows its best at the speed in play.
- 17 `<p>` A best made under earlier rules says so, and the next run there to score beats it.

### src/app/settings/settings.component.html

- 11 `<p>` Changing the speed starts a new run.
- 38 `<p>` For a left thumb on Fire and Dash.
- 56 `<p>` The ship fires all the time, and the deck has Dash alone.
- 74 `<p>` Once as a ship is lost, and twice as a wave is cleared, on a phone that can.
- 93 `<p>` Off, it mutes the effects, the voice and the bed, as the bar's Sound button does.
- 108 `<p>` Each rock breaking, rising with static, the thrust's hum, and a chime for a wave cleared.
- 123 `<p>` A whee, an eep or a cheer, now and then.
- 136 `<label>` Play a bed under each sector
- 137 `<p>` A slow drone, a pulse and bells joining it as static climbs.
- 151 `<p>` Every sound in both ears, for one earbud or a phone's one speaker.

### src/app/settings/settings.component.ts

- 34 `detail:` The stick, Fire and Dash show beside the field where the screen takes a finger.
- 38 `detail:` They show on every screen, and a mouse can press them.
- 42 `detail:` The keys and the mouse fly the ship.

### src/rules/speed.ts

- 41 `says:` Slower rocks, fewer and slower comets, more pickups, and sparks drawn in from farther.
- 49 `says:` The classic pace.
- 57 `says:` Quicker rocks and comets.

## Messages: notices, confirmations, explanations and errors

### src/app/bar/bar.component.html

- 65 `<dd>` {{ multiplier() }} @for (lit of pips(); track $index) { }

### src/app/board/board_card.component.html

- 24 `<p>` {{ sector.wave }} · starts when you fly

### src/app/board/board_card.component.ts

- 133 `computed()` {sector.name} cleared. Endless begins.

## Results: win, lose, clear and records

### src/app/board/board_card.component.ts

- 134 `computed()` Wave {String(number)} cleared

### src/app/result/result.component.html

- 4 `<fz-dialog [label]>` {{ title }}
- 24 `<span>` New best
- 27 `<span>` Cleared all thirty
- 53 `<p>` The fuzzballs who flew
- 67 `<button>` Choose a sector
- 74 `<button>` Close

### src/app/result/result.component.ts

- 63 `term:` Score
- 68 `term:` Wave
- 69 `term:` Cleared
- 84 `caught =` a stray
- 85 `computed()` {flew}, {String(strays)} of them {caught} brought home
- 90 `computed()` Try again from {this.game.firstSector().name}

### src/view/bests.ts

- 19 `bestTerm() returns` Best, earlier rules
- 19 `bestTerm() returns` Best
- 45 `sectorStatus() returns` Locked
- 47 `words =` Best {formatPoints(sectorBest.best)}
- 48 `sectorStatus() returns` {words}, earlier rules

### src/view/tally.ts

- 18 `rocks:` Rocks
- 19 `sparks:` Sparks
- 20 `static:` Static
- 21 `strays:` Strays brought home
- 22 `cleared:` Wave cleared
- 23 `clean:` No hit taken
- 73 `endWords() returns` The run ended on wave {String(entry.number)}, {entry.data.name}
- 81 `endSubtitle() returns` {endWords(entry)}, at {SPEED\_INFO[speed].name} speed

## Spoken text: labels and announcements for screen readers

### index.html

- 58 `<noscript> <p>` Asteroid Breaker, free to play in your browser: fly, drift and blast every rock to rubble before one finds you. Turn on JavaScript to play.

### src/app/bar/bar.component.html

- 107 `<button aria-label>` Sectors
- 132 `<button aria-label>` How to play
- 153 `<button aria-label>` Settings

### src/app/board/board.component.html

- 9 `<p>` The left and right arrow keys, or A and D, turn the ship, and the mouse turns it toward the pointer. The up arrow or W thrusts, and so does the right mouse button. Space or the left mouse button fires, and Shift, the down arrow or S dashes. Any of those keys starts a wave, goes on, and goes to the next wave. Escape pauses, P pauses and goes on, and Enter goes on, or to the next wave. Once an ended run's result is put away, any flight key, Enter or P starts another. On a card's button, the keys are the button's: Space and Enter press it.

### src/app/board/board.component.ts

- 83 `"aria-roledescription":` game board
- 166 `computed()` Asteroid Breaker, wave {String(number)}: {data.name}

### src/app/play/sector_card.ts

- 78 `describeSector[]() returns` It starts when you fly.

### src/app/sectors/sectors.component.html

- 6 `<button aria-label>` Close sectors

### src/rules/run/describe.ts

- 27 `describeEvent() returns` A stray fuzzball drifts in.
- 31 `describeEvent() returns` Brought straight home, with the line full.
- 33 `describeEvent() returns` Hit! One knocked loose. {inTowWords(event.inTow)}.
- 35 `describeEvent() returns` Caught again. {inTowWords(event.inTow)}.
- 37 `describeEvent() returns` A fuzzball floats home.
- 41 `describeEvent() returns` Static full.
- 43 `describeEvent() returns` Zap!
- 45 `describeEvent() returns` A burr clings.
- 53 `inTowWords() returns` No one in tow
- 53 `inTowWords() returns` {String(inTow)} in tow
- 75 `said =` {cleared.sector.name} cleared! Endless begins.
- 76 `said =` Wave {String(cleared.number)} cleared!
- 82 `describePause() returns` Paused, with a score of {formatPoints(run.score)}. Press Enter to go on.
- 87 `describeResume() returns` Going on.
- 93 `describeTakenUp() returns` Your last run is paused on wave {String(entry.number)}, {entry.data.name}, with a score of {formatPoints(run.score)} and {inTow}. Press Enter to go on.
- 100 `END_TITLE =` Everyone is home.
- 108 `best =` A new best!
- 109 `all =` Cleared all thirty!

### src/view/crew_line.ts

- 66 `withLooseWords()` {String(aboard(crew))} of the crew aboard
- 73 `withLooseWords() returns` {words}, {String(loose.length)} knocked loose
- 78 `inTowWords() returns` No one in tow
- 78 `inTowWords() returns` {String(tow.length)} in tow
