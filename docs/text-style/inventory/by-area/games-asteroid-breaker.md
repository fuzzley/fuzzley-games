# Text inventory: games/asteroid-breaker

Written by `extract.mjs`; do not edit by hand. Each entry gives its line,
where it sits, and its text, with `{{ … }}` or `{…}` where a value is put
in, keys in square brackets and bold lead-ins in asterisks.

## How to play and rules

### src/app/help/help.component.html

- 8 `<th>` Mouse
- 9 `<th>` Touch
- 10 `<th>` Keyboard
- 15 `<th>` Turn
- 16 `<td>` Point
- 17 `<td>` Stick
- 18 `<td>` [←] [→] or [A] [D]
- 21 `<th>` Thrust
- 22 `<td>` Hold the right button
- 23 `<td>` Push the stick further
- 24 `<td>` [↑] or [W]
- 27 `<th>` Fire
- 28 `<td>` Hold the left button
- 29 `<td>` Hold Fire
- 30 `<kbd>` Space
- 33 `<th>` Dash
- 34 `<kbd>` Shift
- 35 `<td>` Dash
- 36 `<td>` [Shift], [↓] or [S]
- 39 `<th>` Pause
- 40 `<td>` Pause
- 41 `<td>` Pause
- 42 `<td>` [P] or [Esc]
- 45 `<th>` Resume
- 46 `<td>` Resume
- 47 `<td>` Resume, the stick or a touch button
- 48 `<td>` [P], [Enter] or any key you fly with
- 51 `<th>` Next wave
- 52 `<td>` Next wave
- 53 `<td>` Next wave, the stick or a touch button
- 54 `<td>` [Enter] or any key you fly with
- 57 `<th>` New game, after a game ends
- 58 `<td>` New game
- 59 `<td>` New game, the stick or a touch button
- 60 `<td>` [Enter], [P] or any key you fly with
- 65 `<p>` **Your crew.** {{ crew }}
- 66 `<p>` **Static.** {{ charge }}
- 67 `<p>` **Dashing.** {{ dashing }}
- 68 `<p>` **Scoring.** Static multiplies the points for rocks, sparks, burrs and strays.

### src/app/help/help.component.ts

- 41 `TOP =` Fly your ship and shoot the rocks. Each one breaks into smaller pieces until it's gone. Clear every rock to finish the wave. If your ship or a rock goes off one edge of the screen, it comes back on the other side. The fuzzballs following your ship are your crew, and each one is a life. If a rock or a comet hits you, one of them is knocked loose. If you're hit with no one following, the game is over. After wave {String(WAVES.length)}, Endless keeps the waves coming until you're out of crew.
- 44 `CREW =` You start with {String(FIRST\_CREW - 1)} following you, and each stray you catch joins them. If one is knocked loose, fly into it within {String(LOOSE\_LIFE\_MS / 1000)} seconds to get it back, or it floats home. When you clear the wave, any that are still loose come back.
- 47 `CHARGE =` Broken rocks give off sparks. Each one you collect adds {String(SPARK\_STATIC)} static, and each near miss adds {String(GRAZE\_STATIC)}. Static drains after {String(STATIC\_HOLD\_MS / 1000)} seconds without either, and a hit drops it a step. It multiplies your score: {tierWords(STATIC\_STEPS, "static")}.
- 50 `DASHING =` A dash throws your ship forward, and nothing can hit it while it dashes. It takes {String(DASH\_RECHARGE\_MS / 1000)} seconds to charge again. When your static is full, at {String(STATIC\_MOST)}, your next dash also zaps up to {String(ZAP\_ARCS)} rocks near its path. A zap uses {String(ZAP\_COST)} static.
- 65 `what:` Breaking a rock
- 66 `points:` {formatPoints(Math.min(...ROCK\_POINTS))} to {formatPoints(Math.max(...ROCK\_POINTS))}, more for smaller rocks
- 68 `what:` Breaking a boulder
- 69 `what:` Collecting a spark
- 70 `what:` Shooting a burr
- 72 `what:` Catching a stray
- 73 `points:` {formatPoints(STRAY\_POINTS)}, or {formatPoints(STRAY\_HOME\_POINTS)} if your crew is full
- 75 `what:` Clearing a wave
- 77 `what:` Clearing it without a hit
- 84 `PICKUPS_INTRO =` A broken rock sometimes drops a pickup. Fly into it before it fades. Crystals always drop one.
- 87 `ADRIFT_INTRO =` You don't need to clear these to finish a wave. Strays come from wave {String(STRAYS\_FROM)}, and comets and burrs in later waves. But if you have no crew following you or left to catch, a stray comes right away, once a wave.
- 92 `name:` Stray fuzzball
- 96 `name:` Comet
- 101 `name:` Burr
- 143 `heading:` Rocks
- 149 `heading:` Pickups
- 155 `heading:` Strays, comets and burrs

## Reference: what each thing, option and variant does

### src/app/help/help.component.ts

- 93 `about:` Joins your crew when you fly into it. If you already have {String(MOST\_CREW - 1)}, it goes straight home instead.
- 98 `about:` Crosses the screen fast and hits your ship like a rock. An arrow at the edge warns you first.
- 103 `about:` Homes in on your ship and sticks to it, slowing you down. Shoot it first, or dash to shake it off.

### src/rules/catalog/pickups.ts

- 41 `about:` Fires 3 shots at once for 12 seconds.
- 48 `about:` Fires twice as often for 12 seconds.
- 55 `about:` Blocks the next rock or comet that hits your ship.
- 62 `about:` Fires shots that break up to 3 rocks each. Lasts 10 seconds.
- 70 `about:` Pulls in pickups, sparks and fuzzballs from 14 units for 15 seconds.
- 77 `about:` Slows rocks and comets to half speed for 8 seconds.

### src/rules/catalog/rocks.ts

- 116 `about:` Breaks into 2 smaller stones.
- 125 `about:` Always drops a pickup and 2 extra sparks. Breaks into 2 stones.
- 137 `about:` Breaks into 3 smaller, faster pieces.
- 147 `about:` Takes 6 hits, then breaks into 3 large rocks. Comes every 10th wave of Endless.
- 156 `about:` Takes 3 hits when large and 2 when medium.
- 166 `about:` Blasts every rock nearby when it breaks. The blast can't hurt your ship.
- 175 `about:` Drifts toward your ship. Takes 2 hits when large.
- 185 `about:` Takes 6 hits, then breaks into 3 large rocks. Its first 5 hits each knock off a medium stone.
- 198 `about:` Takes 6 hits, then breaks into 3 large rocks. Its first 3 hits each knock off a medium iron rock.
- 211 `about:` Takes 6 hits, then breaks into 3 large rocks. Its first 5 hits each blast the rocks within 6 units.

## Descriptions: blurbs, taglines, page metadata and write-ups

### README.md

- 1 `heading` # Asteroid Breaker
- 3 `paragraph` Shoot every rock before one hits your ship. There are 30 waves, then Endless. Play it at https://fuzzley.games/play/asteroid-breaker/.
- 6 `paragraph` An [Angular](https://angular.dev/) app on the Fuzzley Games shared libraries (`frontend/lib/`), with its field drawn by [Phaser](https://phaser.io/) through `@fz/phaser`, built with [Vite](https://vite.dev/) and tested with [Vitest](https://vitest.dev/), the scene against real Phaser run headless. It holds thirty waves in three sectors, then Endless, whose waves are made as they are played, with stone, crystal, ice, iron, volatile and lodestone rocks and a boulder to end each sector; six pickups, Spread, Rapid and Lance, which give the ship another weapon than its gun for a while, and Shield, Magnet and Slow; stray fuzzballs to bring home, comets to dodge and burrs that cling until a dash shakes them off; and sparks that raise the pilot's static, which multiplies the score and, full, lets a dash zap the rocks near it, all played by rules that run without a framework, physics included, on a field that wraps at every edge. It plays at three speeds, by keyboard, mouse or touch, with a stick, Fire and Dash on a touch screen, pauses whenever the field loses the player, wears whichever palette the player chose on the site, and keeps a run under way across a reload, paused. Phaser loads after the page has painted, behind a drawing of the empty field.

### index.html

- 38 `JSON-LD genre` Arcade, Action game
- 58 `<noscript> <p>` Shoot every rock before one hits your ship. Turn on JavaScript to play.

## Picture text: alt text and captions

### index.html

- 33 `<meta og:image:alt>` Wave 9 of Asteroid Breaker, with the ship firing up between the rocks.

## Names: games, modes, levels and things

### index.html

- 5 `<title>` Asteroid Breaker
- 17 `<meta og:title>` Asteroid Breaker
- 38 `JSON-LD name` Asteroid Breaker
- 57 `<noscript> <h1>` Asteroid Breaker

### src/app/settings/settings.component.ts

- 32 `name:` On a touch screen
- 36 `name:` Always
- 40 `name:` Never

### src/rules/catalog/pickups.ts

- 40 `name:` Spread
- 47 `name:` Rapid
- 54 `name:` Shield
- 61 `name:` Lance
- 68 `name:` Magnet
- 76 `name:` Slow

### src/rules/catalog/rocks.ts

- 115 `name:` Stone
- 124 `name:` Crystal
- 136 `name:` Ice
- 145 `name:` Boulder
- 155 `name:` Iron
- 164 `name:` Volatile
- 174 `name:` Lodestone
- 183 `name:` Crumbling boulder
- 196 `name:` Ironclad boulder
- 209 `name:` Storm boulder

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
- 43 `<span>` Fire
- 53 `<label>` Auto-fire
- 62 `<span>` Haptics
- 72 `<label>` Buzz the phone
- 81 `<span>` Sound
- 91 `<label>` Play sounds
- 104 `<label>` Play sound effects
- 115 `<label>` Play fuzzball voices
- 129 `<label>` Play music
- 143 `<label>` One speaker
- 151 `<span>` Theme
- 170 `<label>` Shots carry the ship's speed

## Hints: setting descriptions, tooltips and prompts

### src/app/bar/bar.component.html

- 108 `<button title>` Sectors
- 133 `<button title>` How to play
- 154 `<button title>` Settings

### src/app/board/board_card.component.ts

- 103 `computed()` Arrows or W A D to fly.
- 104 `computed()` Arrows or W A D to fly, Space to fire.
- 110 `computed()` Steer with the {stick} stick.
- 111 `computed()` Steer with the {stick} stick, fire with the {buttons}.

### src/app/play/sector_card.ts

- 10 `"inner-belt"[]:` Break every rock to clear a wave.
- 11 `"inner-belt"[]:` Crystals always drop a pickup.
- 14 `"iron-reach"[]:` Iron takes extra hits. Volatile rocks blow up.
- 15 `"iron-reach"[]:` Comets fly across. Burrs slow you down until you dash.
- 17 `storm[]:` Lodestones drift toward your ship.
- 19 `endless[]:` The waves are new every game, and they never end.
- 20 `endless[]:` Every wave has comets, and every 10th has boulders.
- 58 `kicker:` A new game
- 58 `kicker:` A new sector

### src/app/sectors/sectors.component.html

- 12 `<p>` Choose a sector to start a new game at its first wave. You unlock a sector when you reach it. Each one shows your best at the current speed.
- 17 `<p>` A best marked (old rules) was set before the rules changed. The next game you start there replaces it, even with a lower score.

### src/app/settings/settings.component.html

- 11 `<p>` Changing the speed starts a new game.
- 38 `<p>` Moves the buttons to the left.
- 54 `<p>` The ship fires on its own. On a touch screen, only the Dash button shows.
- 73 `<p>` Buzzes once when you're hit and twice when you clear a wave. Only on phones that can buzz.
- 92 `<p>` Turns all sound on or off. Same as the Sound button.
- 116 `<p>` The fuzzballs squeak and cheer now and then.
- 130 `<p>` Each sector has its own music, and it builds as your static rises.
- 144 `<p>` Plays every sound in both ears, for one earbud or a phone speaker.

### src/app/settings/settings.component.ts

- 33 `detail:` Shown only when you play by touch.
- 37 `detail:` Shown on every screen. You can click them with a mouse.
- 41 `detail:` Fly with the keyboard and the mouse.

### src/rules/speed.ts

- 41 `says:` Slower rocks and comets, fewer comets, more pickups. You pull in sparks from farther away.
- 49 `says:` The usual pace.
- 57 `says:` Quicker rocks and comets.

## Messages: notices, confirmations, explanations and errors

### src/app/bar/bar.component.html

- 65 `<dd>` {{ multiplier() }} @for (lit of pips(); track $index) { }

### src/app/board/board_card.component.html

- 24 `<p>` {{ sector.wave }} · starts when you fly

### src/app/board/board_card.component.ts

- 133 `computed()` {sector.name} cleared! Endless begins.
- 134 `computed()` Wave {String(number)} cleared!

## Results: win, lose, clear and records

### src/app/result/result.component.html

- 4 `<fz-dialog [label]>` {{ title }}
- 24 `<span>` New best
- 27 `<span>` All 30 waves cleared!
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

- 19 `bestTerm() returns` Best (old rules)
- 19 `bestTerm() returns` Best
- 45 `sectorStatus() returns` Locked
- 47 `words =` Best {formatPoints(sectorBest.best)}
- 48 `sectorStatus() returns` {words} (old rules)

### src/view/tally.ts

- 18 `rocks:` Rocks
- 19 `sparks:` Sparks
- 20 `static:` Static
- 21 `strays:` Strays brought home
- 22 `cleared:` Wave cleared
- 23 `clean:` No hit taken
- 73 `endWords() returns` Out of crew on wave {String(entry.number)}, {entry.data.name}
- 81 `endSubtitle() returns` {endWords(entry)}, at {SPEED\_INFO[speed].name} speed

## Spoken text: labels and announcements for screen readers

### index.html

- 11 `<meta description>` Asteroid Breaker, free in your browser. Shoot every rock before one hits your ship. The screen wraps at every edge. 30 waves, then Endless.
- 18 `<meta og:description>` Asteroid Breaker, free in your browser. Shoot every rock before one hits your ship. The screen wraps at every edge. 30 waves, then Endless.
- 38 `JSON-LD description` Asteroid Breaker, free in your browser. Shoot every rock before one hits your ship. The screen wraps at every edge. 30 waves, then Endless.

### src/app/bar/bar.component.html

- 107 `<button aria-label>` Sectors
- 132 `<button aria-label>` How to play
- 153 `<button aria-label>` Settings

### src/app/board/board.component.html

- 9 `<p>` Left and Right, or A and D: turn the ship. Up or W: thrust. Space: fire. Shift, Down or S: dash. P: pause and resume. Esc: pause. Enter: resume, or go to the next wave. Any key you fly with also resumes, or goes to the next wave.

### src/app/board/board.component.ts

- 83 `"aria-roledescription":` game board
- 166 `computed()` Asteroid Breaker, wave {String(number)}: {data.name}

### src/app/help/help.component.html

- 4 `<table aria-label>` Controls
- 72 `<table aria-label>` Scoring

### src/app/play/sector_card.ts

- 78 `describeSector[]() returns` It starts when you fly.

### src/app/sectors/sectors.component.html

- 6 `<button aria-label>` Close sectors

### src/rules/run/describe.ts

- 27 `describeEvent() returns` A stray fuzzball drifts in.
- 31 `describeEvent() returns` Crew full. The stray goes straight home.
- 33 `describeEvent() returns` Hit. One knocked loose. {inTowWords(event.inTow)}.
- 35 `describeEvent() returns` Caught again. {inTowWords(event.inTow)}.
- 37 `describeEvent() returns` A fuzzball floats home.
- 41 `describeEvent() returns` Static full.
- 43 `describeEvent() returns` Zap.
- 45 `describeEvent() returns` A burr sticks to you.
- 53 `inTowWords() returns` No one following
- 75 `said =` {cleared.sector.name} cleared. Endless begins.
- 76 `said =` Wave {String(cleared.number)} cleared.
- 82 `describePause() returns` Paused. Score {formatPoints(run.score)}. Press Enter to resume.
- 87 `describeResume() returns` Resumed.
- 92 `describeTakenUp() returns` Paused on wave {String(entry.number)}, {entry.data.name}. Score {formatPoints(run.score)}. {inTowWords(run.crew.tow.length)}. Press Enter to resume.
- 99 `END_TITLE =` Game over
- 107 `best =` New best.
- 108 `all =` All 30 waves cleared.

### src/view/crew_line.ts

- 69 `withLooseWords()` {String(aboard(crew))} of the crew aboard
- 76 `withLooseWords() returns` {words}, {String(loose.length)} knocked loose
