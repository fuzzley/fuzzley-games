# Text inventory: games/brick-breaker

Written by `extract.mjs`; do not edit by hand. Each entry gives its line,
where it sits, and its text, with `{{ … }}` or `{…}` where a value is put
in, keys in square brackets and bold lead-ins in asterisks.

## How to play and rules

### src/app/help/help.component.html

- 2 `<p>` Keep the ball in play with the paddle, and break every brick a level needs to clear it. A ball that falls past the paddle costs a life; the run ends when the last is lost, or when the last level is cleared.
- 7 `<p>` **Scoring.** Each brick scores its points for every hit it takes. {{ scoring.streak }} {{ scoring.clearing }} {{ scoring.lives }}
- 11 `<p>` **Stars.** Each level has three to win, at any speed: one for clearing it, one for clearing it without losing a life, and one for reaching its streak, the mark its Ready card names, in a play that clears it. A star once won is yours for good. Stars open nothing; the Levels dialog counts them.
- 18 `<p>` **Pausing.** The game pauses itself when you switch away, turn the screen or open a dialog, and goes on only when you say.
- 27 `<th>` Mouse
- 28 `<th>` Touch
- 29 `<th>` Keyboard
- 34 `<th>` Steer
- 35 `<td>` Move it; the paddle follows
- 36 `<td>` Drag anywhere on the field, or, in the settings, have the paddle follow your finger
- 40 `<td>` Hold [←] or [→], or [A] or [D]
- 45 `<th>` Launch, or fire
- 46 `<td>` Click
- 47 `<td>` Tap
- 48 `<td>` [Space], [↑] or [W]
- 51 `<th>` Pause, or go on
- 52 `<td>` Pause, then Resume
- 53 `<td>` Pause, then Resume
- 54 `<td>` [P]; [Esc] pauses, and [Enter] or [Space] goes on
- 60 `<th>` Next level
- 61 `<td>` Next level
- 62 `<td>` Next level
- 63 `<td>` [Enter] or [Space]
- 66 `<th>` Start again, once a run has ended
- 67 `<td>` New game
- 68 `<td>` New game
- 69 `<td>` [Enter], [Space] or [P]

### src/app/help/help.component.ts

- 24 `streak:` A streak of bricks broken since the ball last touched the paddle multiplies each hit's points: {tierWords(STREAK, "bricks")}.
- 25 `clearing:` A level cleared adds {formatPoints(CLEAR\_POINTS)} points, and {formatPoints(CLEAN\_POINTS)} more when no ball was lost on it.
- 26 `lives:` A life comes at {formatPoints(FIRST\_LIFE\_POINTS)} points and every {formatPoints(LIFE\_POINTS)} after, up to {String(MAX\_LIVES)} lives.
- 31 `CAPSULES_INTRO =` A broken brick may let a capsule fall. Catch it with the paddle for what it does; Relaxed lets none fall that makes the game harder.
- 61 `heading:` Bricks
- 67 `heading:` Capsules
- 73 `heading:` Balls

## Reference: what each thing, option and variant does

### src/rules/catalog/balls.ts

- 23 `about:` Bounces off everything, and hits one brick at a time.
- 32 `about:` Breaks every brick it touches that can break, and passes through it.
- 40 `about:` Hits the eight bricks around each brick it strikes.

### src/rules/catalog/bricks.ts

- 68 `about:` Breaks at a hit.
- 77 `about:` Takes two to four hits, a pip for each one left.
- 86 `about:` Never breaks: it turns every ball and stops every bolt.
- 95 `about:` Breaks, and hits the eight bricks around it.
- 104 `about:` Always lets a capsule fall.
- 114 `about:` Shows as a faint outline until it is first hit, then takes one more.
- 123 `about:` Grows back 10 seconds after it breaks; a level doesn't need it.
- 133 `about:` Takes two hits: the first bends a bar, the second frees a friend, a ball more.
- 143 `about:` Takes one or two hits from above or a side; from below, its plate turns the ball back unhurt.
- 153 `about:` Breaks at a hit; the hit that breaks a level's last key opens every gate.
- 163 `about:` Stands as steel while a key is left, and opens with every gate as the last one breaks; a level doesn't need it.
- 173 `about:` Never breaks: it is round, and a ball leaves it at the angle a circle gives.
- 183 `about:` Never breaks: a ball that touches it leaves its twin, going as it went.
- 193 `about:` Breaks at a hit. Sliders in a row step a cell together each beat, and turn at a wall or a brick.

### src/rules/catalog/capsules.ts

- 89 `about:` The paddle grows half as wide again for 20 seconds.
- 97 `about:` Every ball in play splits into three.
- 106 `about:` The balls drop to their first speed, and speed up half as fast, for 15 seconds.
- 114 `about:` One more life, up to six.
- 123 `about:` For 20 seconds, a ball that lands on the paddle waits there, for 3 seconds at most, until launched.
- 131 `about:` A line under the paddle turns back the next ball that falls.
- 140 `about:` Launching fires a bolt from each end of the paddle, for 12 seconds.
- 149 `about:` Each ball leans toward the nearest brick the level needs as it rises, for 12 seconds.
- 158 `about:` The paddle shrinks to two thirds of its width for 15 seconds, and bricks pay double while it lasts.
- 167 `about:` The balls burn through every brick that can break, for 10 seconds.
- 176 `about:` The balls go a quarter faster for 12 seconds, and bricks pay double while they do.
- 191 `about:` Each brick the balls hit hits the eight around it, for 12 seconds.

## Descriptions: blurbs, taglines, page metadata and write-ups

### README.md

- 1 `heading` # Brick Breaker
- 3 `paragraph` Brick Breaker: bounce the ball off your paddle, break every brick and keep the ball off the floor. Play it at https://fuzzley.games/play/brick-breaker/.
- 6 `paragraph` An [Angular](https://angular.dev/) app on the Fuzzley Games shared libraries (`frontend/lib/`), with its field drawn by [Phaser](https://phaser.io/) through `@fz/phaser`, built with [Vite](https://vite.dev/) and tested with [Vitest](https://vitest.dev/), the scene against real Phaser run headless. It holds fifty levels in five sets, with tough, steel, blast, gift, ghost, regrowing and plated bricks, cages, keys, gates, bumpers, portals and sliders, twelve capsules and three kinds of ball, all played by rules that run without a framework, physics included. It plays at three speeds or one the player sets, by mouse, keyboard or touch, pauses whenever the field loses the player, wears whichever palette the player chose on the site, and keeps a run under way across a reload, paused. Phaser loads after the page has painted, behind a drawing of the empty field.

### index.html

- 14 `<meta description>` Play Brick Breaker free in your browser: bounce the ball off your paddle, break every brick and keep the ball off the floor. Fifty levels, three speeds or one of your own, by mouse, keyboard or touch.
- 21 `<meta og:description>` Play Brick Breaker free in your browser: bounce the ball off your paddle, break every brick and keep the ball off the floor. Fifty levels, three speeds or one of your own, by mouse, keyboard or touch.
- 41 `JSON-LD description` Play Brick Breaker free in your browser: bounce the ball off your paddle, break every brick and keep the ball off the floor. Fifty levels, three speeds or one of your own, by mouse, keyboard or touch.
- 41 `JSON-LD genre` Arcade, Action game

## Picture text: alt text and captions

### index.html

- 36 `<meta og:image:alt>` A game of Brick Breaker on level 9, a rocket of bricks with a bite out of its base, the ball waiting on the paddle below.

## Names: games, modes, levels and things

### index.html

- 5 `<title>` Brick Breaker
- 20 `<meta og:title>` Brick Breaker
- 41 `JSON-LD name` Brick Breaker
- 60 `<noscript> <h1>` Brick Breaker

### src/app/settings/settings.component.ts

- 32 `name:` Drag
- 37 `name:` Follow the finger

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
- 122 `name:` Regrowing brick
- 131 `name:` Cage
- 141 `name:` Plated brick
- 151 `name:` Key brick
- 161 `name:` Gate
- 171 `name:` Bumper
- 181 `name:` Portal
- 191 `name:` Slider

### src/rules/catalog/capsules.ts

- 88 `name:` Wide paddle
- 96 `name:` Multiball
- 104 `name:` Slow ball
- 113 `name:` Extra life
- 121 `name:` Catch
- 130 `name:` Net
- 138 `name:` Laser
- 147 `name:` Seeker
- 156 `name:` Narrow paddle
- 166 `name:` Fire ball
- 174 `name:` Fast ball
- 190 `name:` Blast ball

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

- 89 `<p>` Paused
- 90 `<p>` Score {{ score() }}
- 91 `<button>` Resume
- 114 `<p>` Score {{ score() }}
- 115 `<button>` Next level
- 128 `<p>` Score {{ score() }}
- 129 `<button>` New game

### src/app/board/board.component.ts

- 395 `label:` Bricks
- 396 `label:` Streaks
- 398 `label:` Double pay
- 400 `label:` Bonus

### src/app/levels/levels.component.html

- 1 `<fz-dialog label>` Levels
- 11 `<h2>` Levels
- 27 `<p>` {{ set.starsCount }} stars

### src/app/levels/levels.component.ts

- 130 `statusOf() returns` Locked
- 131 `statusOf() returns` Best {formatPoints(best)}
- 132 `statusOf() returns` Cleared

### src/app/panels/bench.component.html

- 1 `<h2>` The bench
- 15 `<h3>` Lives
- 27 `<h3>` Next
- 60 `<p>` The last level.

### src/app/panels/bench.component.ts

- 87 `words:` {String(at)} of {String(of)} in {this.level().set.name}
- 102 `computed()` None waiting
- 109 `computed()` {String(MAX\_LIVES)} lives at most
- 110 `computed()` A life at {formatPoints(at)}

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
- 20 `<label>` Custom ball speed
- 44 `<span>` On a touch screen
- 54 `<span>` Sound
- 64 `<label>` Play sounds
- 73 `<span>` Theme

## Hints: setting descriptions, tooltips and prompts

### src/app/bar/bar.component.html

- 122 `<button title>` Levels
- 146 `<button title>` How to play
- 167 `<button title>` Settings

### src/app/board/board.component.ts

- 366 `computed()` Tap to launch.
- 367 `computed()` Press Space or click to launch.

### src/app/levels/levels.component.html

- 12 `<p>` Choose a level to start a run there. Clearing one opens the next; each shows its best at the speed in play.
- 16 `<p>` Each level has three stars to win, at any speed: for clearing it, for clearing it without losing a life, and for reaching its streak, the mark its Ready card names, in a play that clears it. Stars open nothing; they are a record of how well you played. You hold {{ starsTotal() }} stars.

### src/app/panels/bench.component.ts

- 124 `title:` Level {String(entry.number)}

### src/app/settings/settings.component.html

- 11 `<p>` Changing the speed starts a new run. The ball speeds up as it hits the bricks.
- 36 `<p>` {{ custom.valueText }}. The ball in play takes it at once.
- 65 `<p>` A bounce off the paddle, a break that rises along a streak, and a chime for a level cleared.

### src/app/settings/settings.component.ts

- 34 `detail:` The paddle moves as far as your finger does, from anywhere on the field.
- 38 `detail:` The paddle goes wherever your finger is.
- 118 `description:` At {name}, the ball serves at {unitsOf(base * scaled)} and
- 119 `description:` climbs to {unitsOf(top * scaled)} units a second, before a
- 120 `description:` level's pace and what a capsule does to it.

### src/rules/speed.ts

- 38 `says:` The classic pace.
- 48 `says:` A slower ball, and no capsule that makes it harder.
- 56 `says:` Quick from the first serve.
- 61 `says:` The ball at the speed you set.

## Messages: notices, confirmations, explanations and errors

### src/app/board/board.component.html

- 79 `<strong>` New: {{ kind.name }}.

## Results: win, lose, clear and records

### src/app/board/board.component.ts

- 375 `computed()` Level {String(this.game.level().number)} cleared

### src/app/result/result.component.html

- 4 `<fz-dialog [label]>` {{ title() }}
- 16 `<span>` New best
- 48 `<button>` Choose a level
- 55 `<button>` Close

### src/app/result/result.component.ts

- 45 `where =` From level {String(run.firstLevel)} to the last
- 46 `where =` Out of lives on level {String(run.level)}
- 47 `computed()` {where}, at {SPEED\_INFO[run.speed].name} speed
- 53 `term:` Score
- 54 `term:` Best
- 55 `term:` Level
- 56 `term:` Cleared
- 63 `computed()` New game
- 64 `computed()` Try again from level {String(this.game.run().level)}

### src/app/stars/stars.component.html

- 7 `<span>` {{ star.asks }} , {{ star.state }}
- 12 `<span>` New

### src/app/stars/stars.component.ts

- 56 `state =` won just now
- 56 `state =` not won yet

## Spoken text: labels and announcements for screen readers

### index.html

- 61 `<noscript> <p>` Brick Breaker, free to play in your browser: bounce the ball, break every brick and keep it off the floor. Turn on JavaScript to play.

### src/app/bar/bar.component.html

- 41 `<input [aria-valuetext]>` {{ custom.valueText }}
- 121 `<button aria-label>` Levels
- 145 `<button aria-label>` How to play
- 166 `<button aria-label>` Settings

### src/app/board/board.component.html

- 11 `<div aria-roledescription>` game board
- 13 `<div [aria-label]>` {{ label() }}
- 27 `<p>` The left and right arrow keys, or A and D, move the paddle, and so does the mouse or a finger. Space, the up arrow or W launches the ball, fires the laser, goes on, and goes to the next level. Escape pauses, P pauses and goes on, and Enter goes on, or to the next level. Once an ended run's result is put away, Space, Enter or P starts another. On a card's button, the keys are the button's: Space and Enter press it.

### src/app/board/board.component.ts

- 202 `computed()` Brick Breaker, level {String(number)}: {data.name}

### src/app/levels/levels.component.html

- 6 `<button aria-label>` Close levels

### src/app/panels/bench.component.html

- 7 `<div [aria-label]>` {{ place().words }}

### src/app/settings/settings.component.html

- 32 `<input [aria-valuetext]>` {{ custom.valueText }}

### src/app/stars/stars.component.html

- 2 `<ul aria-label>` Stars

### src/rules/run/describe.ts

- 9 `formatCustomPercent() returns` {String(percent)}% of Normal
- 23 `describeCaught() returns` {name}. Double pay.
- 39 `push()` Extra life. {count(after.lives + lost, "life", "lives")}.
- 44 `push()` Ball lost. {count(after.lives, "life", "lives")} left.
- 61 `describeOpened() returns` The gates are open.
- 66 `describeCleared() returns` Level {String(run.level)} cleared! Score {formatPoints(run.score)}.
- 77 `starAsks() returns` Clear the level
- 79 `starAsks() returns` Lose no life
- 81 `starAsks() returns` Reach a streak of {String(mark)}
- 96 `count()` new star
- 96 `count()` new stars
- 103 `starWonFor() returns` clearing the level
- 105 `starWonFor() returns` losing no life
- 107 `starWonFor() returns` reaching a streak of {String(mark)}
- 113 `describePause() returns` Paused, with a score of {formatPoints(run.score)}. Press Enter to go on.
- 118 `describeResume() returns` Going on.
- 123 `describeTakenUp() returns` Your last run is paused on level {String(entry.number)}, {entry.data.name}, with a score of {formatPoints(run.score)} and {count(run.lives, "life", "lives")}. Press Enter to go on.
- 128 `endTitle() returns` Every level cleared!
- 128 `endTitle() returns` Game over
- 133 `best =` A new best!
- 134 `describeEnd() returns` {asSentence(endTitle(run))} Score {formatPoints(run.score)}, at level {String(run.level)}.{best}
