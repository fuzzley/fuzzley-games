# Text inventory: games/brick-breaker

Written by `extract.mjs`; do not edit by hand. Each entry gives its line,
where it sits, and its text, with `{{ … }}` or `{…}` where a value is put
in, keys in square brackets and bold lead-ins in asterisks.

## How to play and rules

### src/app/help/help.component.html

- 2 `<p>` Bounce the ball off your paddle to break the bricks. Break every brick that can be broken to clear the level. If the ball gets past your paddle, you lose a life. The game ends when you run out of lives or clear all {{ levelCount }} levels.
- 10 `<caption>` Controls
- 16 `<th>` Mouse
- 17 `<th>` Touch
- 18 `<th>` Keyboard
- 23 `<th>` Move
- 24 `<td>` Move the mouse
- 25 `<td>` Drag
- 26 `<td>` Hold [←] or [→], or [A] or [D]
- 31 `<th>` Launch or fire
- 32 `<td>` Click
- 33 `<td>` Tap
- 34 `<td>` [Space], [↑] or [W]
- 37 `<th>` Pause
- 38 `<td>` Pause
- 39 `<td>` Pause
- 40 `<td>` [P] or [Esc]
- 43 `<th>` Resume
- 44 `<td>` Resume
- 45 `<td>` Resume
- 46 `<td>` [P], [Enter] or [Space]
- 49 `<th>` Next level
- 50 `<td>` Next level
- 51 `<td>` Next level
- 52 `<td>` [Enter] or [Space]
- 55 `<th>` New game, once the game is over
- 56 `<td>` New game
- 57 `<td>` New game
- 58 `<td>` [Enter], [Space] or [P]
- 63 `<p>` **Scoring.** Each hit on a brick scores points. The bricks you break before a ball comes back to your paddle make a streak, and a long streak multiplies your points.
- 69 `<caption>` Scoring
- 81 `<p>` **Stars.** Each level has 3 stars: 1 for clearing it, 1 for not losing a life, and 1 for reaching the streak shown before the level starts. Stars don't unlock anything. You can win them at any speed.
- 86 `<p>` **Pausing.** The game pauses when you switch tabs, turn your phone or open a menu. If you leave the page, your game is saved, and you can resume it when you come back.

### src/app/help/help.component.ts

- 32 `what:` Streak of {String(from)} bricks
- 35 `what:` Level cleared
- 37 `what:` Level cleared without losing a life
- 41 `what:` Extra life, up to {String(MAX\_LIVES)}
- 42 `points:` At {formatPoints(FIRST\_LIFE\_POINTS)} points, then every {formatPoints(LIFE\_POINTS)}
- 48 `CAPSULES_INTRO =` Capsules sometimes fall from broken bricks. Catch one with your paddle to use it. The pointed ones make the game harder, and don't fall at Relaxed speed. If you lose a life, every capsule wears off.
- 81 `heading:` Bricks
- 87 `heading:` Capsules
- 93 `heading:` Balls

## Reference: what each thing, option and variant does

### src/rules/catalog/balls.ts

- 23 `about:` Bounces off every brick it hits.
- 32 `about:` Goes straight through any brick that can be broken, breaking it in 1 hit.
- 40 `about:` Also hits the 8 bricks around any brick it strikes.

### src/rules/catalog/bricks.ts

- 68 `about:` Takes 1 hit.
- 77 `about:` Takes 2 to 4 hits. The pips show how many are left.
- 86 `about:` Can't be broken. Balls bounce off it, and it blocks laser bolts.
- 95 `about:` Takes 1 hit. When it breaks, it hits the 8 bricks around it.
- 104 `about:` Takes 1 hit, and always drops a capsule.
- 113 `about:` Takes 2 hits. You only see its outline until you hit it.
- 122 `about:` Grows back after 10 seconds. You don't need to clear it.
- 131 `about:` Takes 2 hits. The friend inside joins you as an extra ball.
- 141 `about:` Takes 1 or 2 hits from above or the side. From below, balls bounce off its plate.
- 150 `about:` Takes 1 hit. Break every key to open the gates.
- 159 `about:` Can't be broken. Opens when you break every key.
- 169 `about:` Can't be broken. It's round, so a ball can bounce off it in any direction.
- 179 `about:` Can't be broken. Sends the ball out of the matching portal, going the same way.
- 189 `about:` Takes 1 hit. Moves along its row and turns around at a wall or a brick.

### src/rules/catalog/capsules.ts

- 89 `about:` Makes the paddle 50% wider for 20 seconds.
- 97 `about:` Splits every ball in flight into 3.
- 106 `about:` Slows the balls back to their starting speed. For 15 seconds, they speed up half as fast.
- 114 `about:` Gives you 1 more life, up to 6.
- 123 `about:` Balls stick to the paddle for up to 3 seconds, or until you launch them. Lasts 20 seconds.
- 132 `about:` Stretches a net under the paddle that saves the next ball you miss.
- 141 `about:` Puts a laser on each end of the paddle for 12 seconds. Launch to fire.
- 150 `about:` Curves rising balls toward the nearest brick you still need to break. Lasts 12 seconds.
- 159 `about:` Makes the paddle 35% narrower for 15 seconds. Bricks score double while it lasts.
- 168 `about:` Turns every ball into a fire ball for 10 seconds.
- 177 `about:` Makes the balls 25% faster for 12 seconds. Bricks score double while it lasts.
- 192 `about:` Turns every ball into a blast ball for 12 seconds.

## Descriptions: blurbs, taglines, page metadata and write-ups

### README.md

- 1 `heading` # Brick Breaker
- 3 `paragraph` Break every brick without letting the ball get past your paddle. There are 50 levels, each with 3 stars to win. Play it at https://fuzzley.games/play/brick-breaker/.
- 7 `paragraph` An [Angular](https://angular.dev/) app on the Fuzzley Games shared libraries (`frontend/lib/`), with its field drawn by [Phaser](https://phaser.io/) through `@fz/phaser`, built with [Vite](https://vite.dev/) and tested with [Vitest](https://vitest.dev/), the scene against real Phaser run headless. It holds fifty levels in five sets, with tough, steel, blast, gift, ghost, regrowing and plated bricks, cages, keys, gates, bumpers, portals and sliders, twelve capsules and three kinds of ball, all played by rules that run without a framework, physics included. It plays at three speeds or one the player sets, by mouse, keyboard or touch, pauses whenever the field loses the player, wears whichever palette the player chose on the site, and keeps a run under way across a reload, paused. Phaser loads after the page has painted, behind a drawing of the empty field.

### index.html

- 41 `JSON-LD genre` Arcade, Action game
- 61 `<noscript> <p>` Break every brick. Don’t let the ball get past your paddle. Turn on JavaScript to play.

## Picture text: alt text and captions

### index.html

- 36 `<meta og:image:alt>` Level 9 of Brick Breaker, the ball on the paddle below a rocket of bricks.

## Names: games, modes, levels and things

### index.html

- 5 `<title>` Brick Breaker
- 20 `<meta og:title>` Brick Breaker
- 41 `JSON-LD name` Brick Breaker
- 60 `<noscript> <h1>` Brick Breaker

### src/app/settings/settings.component.ts

- 32 `name:` Drag
- 36 `name:` Follow the finger

### src/rules/catalog/balls.ts

- 22 `name:` Ball
- 30 `name:` Fire ball
- 39 `name:` Blast ball

### src/rules/catalog/bricks.ts

- 67 `name:` Brick
- 76 `name:` Tough brick
- 85 `name:` Steel brick
- 94 `name:` Blast brick
- 103 `name:` Gift brick
- 112 `name:` Ghost brick
- 121 `name:` Regrowing brick
- 130 `name:` Cage
- 139 `name:` Plated brick
- 149 `name:` Key brick
- 158 `name:` Gate
- 167 `name:` Bumper
- 177 `name:` Portal
- 187 `name:` Slider

### src/rules/catalog/capsules.ts

- 88 `name:` Wide paddle
- 96 `name:` Multiball
- 104 `name:` Slow ball
- 113 `name:` Extra life
- 121 `name:` Catch
- 130 `name:` Net
- 139 `name:` Laser
- 148 `name:` Seeker
- 157 `name:` Narrow paddle
- 167 `name:` Fire ball
- 175 `name:` Fast ball
- 191 `name:` Blast ball

### src/rules/levels/basics.json

- 3 `name:` Basics
- 9 `name:` Stripes
- 25 `name:` Gifts
- 41 `name:` Pyramid
- 65 `name:` Checker
- 82 `name:` Window
- 99 `name:` Arch
- 129 `name:` Diamond
- 159 `name:` Waves
- 181 `name:` Rocket
- 217 `name:` Castle

### src/rules/levels/friends.json

- 3 `name:` Friends
- 9 `name:` Hello
- 24 `name:` Mushroom
- 54 `name:` Drawbridge
- 72 `name:` Nest
- 88 `name:` Stepping stones
- 108 `name:` Birdhouse
- 144 `name:` Walled garden
- 160 `name:` Beehive
- 194 `name:` Trellis
- 210 `name:` Reunion

### src/rules/levels/machines.json

- 3 `name:` Machines
- 10 `name:` Pinball
- 27 `name:` Conveyor
- 43 `name:` Wormhole
- 61 `name:` Tilt
- 79 `name:` Typewriter
- 95 `name:` Two rooms
- 115 `name:` Clockwork
- 145 `name:` Switchyard
- 164 `name:` Pachinko
- 181 `name:` Grand machine

### src/rules/levels/steel.json

- 3 `name:` Steel
- 9 `name:` Pillars
- 25 `name:` Shelf
- 43 `name:` Fuse
- 57 `name:` Minefield
- 74 `name:` Hidden
- 89 `name:` Corridors
- 104 `name:` Cage
- 120 `name:` Lanterns
- 150 `name:` Gears
- 180 `name:` Vault

### src/rules/levels/tricks.json

- 3 `name:` Tricks
- 9 `name:` Garden
- 23 `name:` Hedge maze
- 38 `name:` Low bridge
- 62 `name:` Hourglass
- 96 `name:` Chain reaction
- 112 `name:` Fog
- 128 `name:` Spiral
- 146 `name:` Keep
- 162 `name:` Storm
- 185 `name:` Finale

### src/rules/speed.ts

- 34 `name:` Normal
- 44 `name:` Relaxed
- 52 `name:` Fast
- 60 `name:` Custom

## Labels: buttons, menus, headings, readouts and settings

### src/app/bar/bar.component.html

- 7 `<h1>` Brick Breaker
- 20 `<fz-bar-choice label>` Speed
- 28 `<label>` Custom ball speed
- 57 `<span>` Level
- 62 `<span>` Score
- 66 `<span>` Lives
- 83 `<span>` Streak
- 137 `<span>` New game

### src/app/bar/bar.component.ts

- 129 `label:` Levels

### src/app/board/board.component.html

- 85 `<p>` Paused
- 86 `<p>` Score {{ score() }}
- 87 `<button>` Resume
- 110 `<p>` Score {{ score() }}
- 111 `<button>` Next level
- 124 `<p>` Score {{ score() }}
- 125 `<button>` New game

### src/app/board/board.component.ts

- 395 `label:` Bricks
- 396 `label:` Streaks
- 398 `label:` Double score
- 400 `label:` Bonus

### src/app/levels/levels.component.html

- 1 `<fz-dialog label>` Levels
- 11 `<h2>` Levels
- 27 `<p>` {{ set.starsCount }} stars

### src/app/levels/levels.component.ts

- 129 `statusOf() returns` Locked
- 130 `statusOf() returns` Best {formatPoints(best)}
- 131 `statusOf() returns` Cleared

### src/app/panels/bench.component.html

- 1 `<h2>` Level and lives
- 15 `<h3>` Lives
- 27 `<h3>` Next
- 60 `<p>` This is the last level

### src/app/panels/bench.component.ts

- 87 `words:` {String(at)} of {String(of)} in {this.level().set.name}
- 102 `computed()` None spare
- 109 `computed()` {String(MAX\_LIVES)} lives at most
- 110 `computed()` Next life at {formatPoints(at)}

### src/app/panels/in_play.component.html

- 1 `<h2>` In play
- 4 `<h3>` Streak
- 11 `<span>` since the paddle
- 26 `<h3>` In effect
- 52 `<li>` No capsule in effect
- 57 `<h3>` In this level
- 64 `<span>` {{ kind.name }} @if (kind.isNew) { New here }
- 76 `<h3>` Capsules here
- 88 `<li>` None fall here

### src/app/settings/settings.component.html

- 3 `<span>` Speed
- 19 `<label>` Custom ball speed
- 43 `<span>` Touch controls
- 53 `<span>` Sound
- 63 `<label>` Play sounds
- 71 `<span>` Theme

## Hints: setting descriptions, tooltips and prompts

### src/app/bar/bar.component.html

- 122 `<button title>` Levels
- 146 `<button title>` How to play
- 167 `<button title>` Settings

### src/app/board/board.component.ts

- 366 `computed()` Tap to launch.
- 367 `computed()` Press Space or click to launch.

### src/app/levels/levels.component.html

- 12 `<p>` Choose a level to start a new game there. Clearing a level unlocks the next one. If you've cleared a level at this speed, it shows your best score.
- 17 `<p>` Each level has 3 stars: 1 for clearing it, 1 for not losing a life, and 1 for reaching the streak shown before the level starts. Stars don't unlock anything. You have {{ starsHeld() }}.

### src/app/panels/bench.component.ts

- 124 `title:` Level {String(entry.number)}

### src/app/settings/settings.component.html

- 11 `<p>` Changing the speed starts a new game.
- 35 `<p>` {{ custom.valueText }}. The ball in play changes speed right away.
- 64 `<p>` Turns all sound on or off. Same as the Sound button.

### src/app/settings/settings.component.ts

- 33 `detail:` Drag anywhere. The paddle moves as far as your finger does.
- 37 `detail:` Touch where you want the paddle to go.
- 117 `description:` At {name}, the ball serves at {unitsOf(base * scaled)} and
- 118 `description:` climbs to {unitsOf(top * scaled)} units a second, before a
- 119 `description:` level's pace and what a capsule does to it.

### src/rules/speed.ts

- 38 `says:` The classic pace.
- 48 `says:` A slower ball, and no capsules that make things harder.
- 56 `says:` A faster ball from the start.
- 61 `says:` The ball at the speed you set.

## Messages: notices, confirmations, explanations and errors

### src/app/board/board.component.html

- 27 `<p>` Left and Right, or A and D: move the paddle. Space: launch the ball, or fire. P: pause and resume. Esc: pause. Enter: resume, or go to the next level.
- 75 `<strong>` New: {{ kind.name }}.

### src/app/board/board.component.ts

- 375 `computed()` Level {String(this.game.level().number)} cleared!

## Results: win, lose, clear and records

### src/app/result/result.component.html

- 4 `<fz-dialog [label]>` {{ title() }}
- 48 `<button>` Choose a level
- 55 `<button>` Close

### src/app/result/result.component.ts

- 43 `computed()` New best
- 43 `computed()` New best!
- 50 `where =` From level {String(run.firstLevel)} to the last level
- 51 `where =` Out of lives on level {String(run.level)}
- 52 `computed()` {where}, at {SPEED\_INFO[run.speed].name} speed
- 58 `term:` Score
- 59 `term:` Best
- 60 `term:` Level
- 61 `term:` Cleared
- 68 `computed()` New game
- 69 `computed()` Try again from level {String(this.game.run().level)}

### src/app/stars/stars.component.html

- 7 `<span>` {{ star.asks }} , {{ star.state }}
- 12 `<span>` New

### src/app/stars/stars.component.ts

- 56 `state =` won just now
- 56 `state =` not won yet

## Spoken text: labels and announcements for screen readers

### index.html

- 14 `<meta description>` Brick Breaker, free in your browser. Bounce the ball off your paddle to break every brick. 50 levels, each with 3 stars to win.
- 21 `<meta og:description>` Brick Breaker, free in your browser. Bounce the ball off your paddle to break every brick. 50 levels, each with 3 stars to win.
- 41 `JSON-LD description` Brick Breaker, free in your browser. Bounce the ball off your paddle to break every brick. 50 levels, each with 3 stars to win.

### src/app/bar/bar.component.html

- 41 `<input [aria-valuetext]>` {{ custom.valueText }}
- 121 `<button aria-label>` Levels
- 145 `<button aria-label>` How to play
- 166 `<button aria-label>` Settings

### src/app/board/board.component.html

- 11 `<div aria-roledescription>` game board
- 13 `<div [aria-label]>` {{ label() }}

### src/app/board/board.component.ts

- 202 `computed()` Brick Breaker, level {String(number)}: {data.name}

### src/app/levels/levels.component.html

- 6 `<button aria-label>` Close levels

### src/app/panels/bench.component.html

- 7 `<div [aria-label]>` {{ place().words }}

### src/app/settings/settings.component.html

- 31 `<input [aria-valuetext]>` {{ custom.valueText }}

### src/app/stars/stars.component.html

- 2 `<ul aria-label>` Stars

### src/rules/run/describe.ts

- 9 `formatCustomPercent() returns` {String(percent)}% of Normal
- 23 `describeCaught() returns` {name}. Double score.
- 39 `push()` Extra life. {count(after.lives + lost, "life", "lives")}.
- 44 `push()` Ball lost. {count(after.lives, "life", "lives")} left.
- 61 `describeOpened() returns` The gates are open.
- 66 `describeCleared() returns` Level {String(run.level)} cleared. Score {formatPoints(run.score)}.
- 77 `starAsks() returns` Clear the level
- 79 `starAsks() returns` Don't lose a life
- 81 `starAsks() returns` Reach a streak of {String(mark)}
- 92 `count()` new star
- 92 `count()` new stars
- 97 `describePause() returns` Paused. Score {formatPoints(run.score)}. Press Enter to resume.
- 102 `describeResume() returns` Resumed.
- 107 `describeTakenUp() returns` Paused on level {String(entry.number)}, {entry.data.name}. Score {formatPoints(run.score)}. {count(run.lives, "life", "lives")}. Press Enter to resume.
- 112 `endTitle() returns` Every level cleared!
- 112 `endTitle() returns` Game over
- 121 `where =` Out of lives on level {String(run.level)}.
- 122 `best =` New best.
