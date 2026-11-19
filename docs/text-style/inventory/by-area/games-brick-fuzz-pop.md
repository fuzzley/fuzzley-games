# Text inventory: games/brick-fuzz-pop

Written by `extract.mjs`; do not edit by hand. Each entry gives its line,
where it sits, and its text, with `{{ … }}` or `{…}` where a value is put
in, keys in square brackets and bold lead-ins in asterisks.

## How to play and rules

### src/app/help/help.component.html

- 2 `<p>` Aim the fuzzball and charge it up. Let go to shoot. It bounces around breaking bricks until it lands on the floor. After each shot, the wall moves down 1 row. Break every brick that can be broken to clear the level. If one of them reaches the floor, you lose the level. The game ends when you lose a level or clear them all. You can try a lost level again as often as you like.
- 15 `<th>` Mouse
- 16 `<th>` Touch
- 17 `<th>` Keyboard
- 22 `<th>` Aim
- 23 `<td>` Point
- 24 `<td>` Touch and drag
- 25 `<td>` [←]&ngsp;[→] or [A]&ngsp;[D]
- 30 `<th>` Aim in small steps
- 31 `<td>` Turn the wheel
- 33 `<td>` [Shift] with the aim keys
- 36 `<th>` Charge
- 37 `<td>` Hold the button
- 38 `<td>` Keep your finger down
- 39 `<td>` [↑]&ngsp;[↓] or [W]&ngsp;[S]
- 44 `<th>` Shoot
- 45 `<td>` Let go
- 46 `<td>` Let go
- 47 `<kbd>` Space
- 50 `<th>` Cancel
- 51 `<td>` Right-click
- 52 `<td>` Tap with a second finger
- 53 `<kbd>` Esc
- 56 `<th>` Fast-forward
- 57 `<td>` Fast-forward
- 58 `<td>` Fast-forward
- 62 `<th>` Drop
- 63 `<td>` Drop
- 64 `<td>` Drop
- 68 `<th>` Pause
- 69 `<td>` Pause
- 70 `<td>` Pause
- 71 `<td>` [P] or [Esc]
- 74 `<th>` Resume
- 75 `<td>` Resume
- 76 `<td>` Resume
- 77 `<td>` [P] or [Enter]
- 80 `<th>` Next level
- 81 `<td>` Next level
- 82 `<td>` Next level
- 83 `<kbd>` Enter
- 86 `<th>` Try again
- 87 `<td>` Try again or New game
- 88 `<td>` Try again or New game
- 89 `<kbd>` Enter
- 94 `<p>` **Charge.** {{ charge }}
- 95 `<p>` **The jump.** When there's nothing left to break below the dashed line, the wall jumps. It moves down a third of the screen instead of 1 row. A jump never loses a level, and it gives your next shot a boon.
- 100 `<p>` **Boons.** {{ boons }}
- 101 `<p>` **Scoring.** A brick scores when it breaks, and tougher bricks score more. The more bricks one shot breaks, the more the later ones are worth.
- 116 `<p>` **Stars.** {{ stars }}
- 117 `<p>` **No hurry.** Nothing moves until you shoot. Fast-forward speeds up shots and stays on until you turn it off. Drop ends a shot early and keeps what it has broken. A fuzzball that goes too long without hitting a brick gets bored and drops.
- 123 `<p>` **Pull back.** If you'd rather aim like a slingshot, choose Pull back under Aiming in Settings.
- 127 `<p>` **Playing by ear.** With a screen reader, you hear the aim and the charge when you change them with the keys. Press [R] to hear the {{ rowsRead }} lowest rows that have bricks in them.

### src/app/help/help.component.ts

- 35 `CHARGE =` Each pip of charge takes 1 hit off a brick, and a fuzzball with no charge still takes 1. If the brick breaks, the fuzzball flies on with the charge it has left. If not, it bounces off with none. While you hold, the charge climbs to {String(MOST\_CHARGE)} and back down.
- 38 `BOONS =` The hot shot flies at full charge, and nothing drains it. The triple shot sends {count(TRIPLE\_MATES, "more fuzzball", "more fuzzballs")} out behind yours, with the same charge. A boon lasts 1 shot. If that shot makes the wall jump again, you get the boon again.
- 38 `count()` more fuzzball
- 38 `count()` more fuzzballs
- 70 `what:` {ordinal(from)} brick on
- 71 `what:` {ordinal(from)} to {ordinal(next.from - 1)} brick
- 75 `what:` A jump
- 76 `what:` A star
- 80 `STARS =` If you clear a level in par or fewer shots, you get {String(MOST\_STARS)} stars. Up to {String(TWO\_STARS\_PAST\_PAR)} over par, you get 2. Any more, you get 1. Par depends on how many rows the screen shows when the level starts.
- 83 `BRICKS_INTRO =` A zap or a blast takes {String(ZAP\_HITS)} hits off each brick it reaches.
- 124 `heading:` Bricks

## Reference: what each thing, option and variant does

### src/rules/catalog/kinds/sparks.ts

- 11 `about:` Blasts the 8 bricks around it when it breaks.
- 22 `about:` Zaps every brick in its row and column when it breaks.
- 37 `about:` Zaps 3 spaces each way along both diagonals when it breaks.
- 49 `about:` Charges any fuzzball that hits it to full.
- 61 `about:` Takes 2 hits. Frees a friend who follows your fuzzball for the rest of the level.

### src/rules/catalog/kinds/thick_walls.ts

- 7 `about:` Takes 2 or 3 hits. A fuzzball with no charge bounces off.
- 18 `about:` Takes 2 or 3 hits. Grows a hit back after each shot.

### src/rules/catalog/kinds/tricks.ts

- 7 `about:` Can't be broken. Knocks the fuzzball away and drains its charge.
- 22 `about:` Splits the fuzzball into 3.
- 35 `about:` Can't be broken. Sends the fuzzball out of the other portal with the same mark.
- 47 `about:` Takes 2 or 3 hits. Its steel plates take none and drain the charge.

### src/rules/catalog/kinds/warm_up.ts

- 8 `about:` Takes 1 hit.
- 19 `about:` Takes 2 to 6 hits. The pips show how many are left.
- 30 `about:` Can't be broken. Drains the charge of a fuzzball that hits it.
- 41 `about:` Zaps every brick in its row when it breaks.
- 53 `about:` Zaps every brick in its column when it breaks.

## Descriptions: blurbs, taglines, page metadata and write-ups

### README.md

- 1 `heading` # Brick Fuzz Pop
- 3 `paragraph` Fire the fuzzball to break the bricks before they reach the floor. There are 36 levels, and you can clear every one. Play it at https://fuzzley.games/play/brick-fuzz-pop/.
- 7 `paragraph` An [Angular](https://angular.dev/) app on the Fuzzley Games shared libraries (`frontend/lib/`), with its field drawn by [Phaser](https://phaser.io/) through `@fz/phaser`, built with [Vite](https://vite.dev/) and tested with [Vitest](https://vitest.dev/), the scene against real Phaser run headless. It holds thirty-six levels in four sets, Warm-up, Sparks, Tricks and Thick walls, played by rules that run without a framework, the flight included. It plays at two speeds, with fast-forward, by mouse, keyboard or touch, pauses whenever the field loses the player, wears whichever palette the player chose on the site, and keeps a run under way across a reload, paused. Phaser loads behind a drawing of the empty field.

### index.html

- 38 `JSON-LD genre` Arcade, Puzzle game
- 58 `<noscript> <p>` Fire the fuzzball to break the bricks before they reach the floor. Turn on JavaScript to play.

## Picture text: alt text and captions

### index.html

- 33 `<meta og:image:alt>` Level 18 of Brick Fuzz Pop, with the fuzzball aimed up at the bricks.

## Names: games, modes, levels and things

### index.html

- 5 `<title>` Brick Fuzz Pop
- 17 `<meta og:title>` Brick Fuzz Pop
- 38 `JSON-LD name` Brick Fuzz Pop
- 57 `<noscript> <h1>` Brick Fuzz Pop

### src/app/settings/settings.component.ts

- 38 `name:` Point and hold
- 42 `name:` Pull back
- 59 `name:` Normal
- 63 `name:` Fast

### src/rules/catalog/kinds/sparks.ts

- 10 `name:` Bomb
- 21 `name:` Cross zapper
- 36 `name:` X zapper
- 48 `name:` Wool brick
- 59 `name:` Cage

### src/rules/catalog/kinds/thick_walls.ts

- 6 `name:` Shell brick
- 17 `name:` Moss brick

### src/rules/catalog/kinds/tricks.ts

- 6 `name:` Bumper
- 21 `name:` Prism
- 33 `name:` Portal
- 45 `name:` Plated brick

### src/rules/catalog/kinds/warm_up.ts

- 7 `name:` Brick
- 18 `name:` Tough brick
- 29 `name:` Steel brick
- 40 `name:` Row zapper
- 52 `name:` Column zapper

### src/rules/levels/sparks.json

- 3 `name:` Sparks
- 7 `name:` Fuse
- 37 `name:` Crossroads
- 67 `name:` Chain reaction
- 100 `name:` Crisscross
- 134 `name:` Wool socks
- 164 `name:` Jailbreak
- 194 `name:` Honeycomb
- 228 `name:` Switchboard
- 261 `name:` Powder keg

### src/rules/levels/thick-walls.json

- 3 `name:` Thick walls
- 7 `name:` Nutcracker
- 35 `name:` Moss garden
- 69 `name:` Thunderhead
- 99 `name:` Overgrown
- 129 `name:` Armory
- 159 `name:` Bank vault
- 189 `name:` Labyrinth
- 219 `name:` Six-pack
- 247 `name:` The Great Wall

### src/rules/levels/tricks.json

- 3 `name:` Tricks
- 7 `name:` Pinball
- 41 `name:` Prism break
- 71 `name:` Wormhole
- 100 `name:` Shutters
- 134 `name:` Kaleidoscope
- 168 `name:` Bumper cars
- 202 `name:` Split decision
- 234 `name:` Back door
- 264 `name:` Fun house

### src/rules/levels/warm-up.json

- 3 `name:` Warm-up
- 7 `name:` Hello, wall
- 31 `name:` Stripes
- 56 `name:` Pips
- 82 `name:` Punch through
- 104 `name:` Girder
- 130 `name:` Zip line
- 158 `name:` Plumb line
- 188 `name:` Pyramid
- 218 `name:` Gatehouse

## Labels: buttons, menus, headings, readouts and settings

### src/app/bar/bar.component.html

- 7 `<h1>` Brick Fuzz Pop
- 23 `<span>` Level
- 28 `<span>` Shots
- 36 `<span>` Rows left
- 41 `<span>` Score
- 46 `<span>` Crew

### src/app/bar/bar.component.ts

- 139 `computed()` Resume
- 139 `computed()` Pause
- 171 `label:` Levels
- 172 `label:` New game

### src/app/board/board_card.component.html

- 17 `<p>` **New: {{ newKind.name }}.** {{ newKind.about }}
- 29 `<h2>` Paused
- 30 `<p>` Score {{ card.score }}
- 31 `<button>` Resume
- 59 `<p>` Score {{ card.score }}
- 66 `<button>` Next level
- 85 `<p>` Score {{ card.score }}
- 98 `<h2>` Graphics stopped

### src/app/board/board_card.component.ts

- 274 `label:` Bricks
- 275 `label:` Jumps
- 276 `label:` Stars
- 295 `againLabel:` New game

### src/app/levels/levels.component.html

- 1 `<fz-dialog label>` Levels
- 11 `<h2>` Levels

### src/app/levels/levels.component.ts

- 129 `starsWords:` {String(stars)} of {String(MOST\_STARS)} stars
- 140 `statusOf() returns` Locked
- 141 `statusOf() returns` Best {formatPoints(best)}

### src/app/panels/coming_next.component.html

- 1 `<h2>` Coming next

### src/app/panels/in_this_wall.component.html

- 1 `<h2>` In this wall

### src/app/panels/in_this_wall.component.ts

- 70 `computed()` {count(friends, "friend flies", "friends fly")} with you.
- 70 `count()` friend flies
- 70 `count()` friends fly
- 76 `computed()` Next shot: {boon}
- 76 `computed()` A jump earns a {boon}

### src/app/settings/settings.component.html

- 9 `<span>` Aiming
- 24 `<span>` Shot speed
- 39 `<span>` Long shots
- 49 `<label>` Speed up long shots
- 57 `<span>` Guide
- 67 `<label>` Show aim guide
- 76 `<span>` Sound
- 86 `<label>` Play sounds
- 94 `<span>` Theme

## Hints: setting descriptions, tooltips and prompts

### src/app/bar/bar.component.html

- 64 `<button [title]>` {{ pauseName() }}
- 110 `<button title>` Levels
- 122 `<button title>` New game
- 134 `<button title>` How to play
- 156 `<button title>` Settings

### src/app/bar/drop.component.ts

- 19 `title:` Drop

### src/app/board/board_card.component.ts

- 269 `title:` Level {String(card.level)} cleared!

### src/app/levels/levels.component.html

- 12 `<p>` Choose a level to start a new game there. Clear a level to unlock the next one.

### src/app/settings/settings.component.html

- 17 `<p>` Changes how you aim with a mouse or a finger. The keys work the same either way.
- 32 `<p>` Fast-forward stays on until you turn it off. Drop ends a shot early and keeps what it has broken.
- 68 `<p>` Shows where the shot will go, up to its first bounce. Outlines the bricks it will break on the way.
- 87 `<p>` Turns all sound on or off. Same as the Sound button.

### src/app/settings/settings.component.ts

- 39 `detail:` Point where to aim, then hold to charge. Let go to shoot.
- 44 `detail:` Drag from anywhere, away from where you want to shoot. The longer the pull, the more charge. Let go to shoot.
- 60 `detail:` Easy to follow every bounce.
- 64 `detail:` Quicker, for a wall you know well.
- 69 `LONG_SHOTS =` If a shot lasts more than {String(FLIGHT\_PACE.longFlightMs / 1000)} seconds, it speeds up.

## Messages: notices, confirmations, explanations and errors

### src/app/app.component.ts

- 47 `HELP_FAILED_WORDS =` How to play couldn't be loaded. Check your connection and try again.

### src/app/board/board.component.html

- 38 `<li>` Left and Right, or A and D: aim. Hold Shift for smaller steps.
- 39 `<li>` Up and Down, or W and S: raise and lower the charge.
- 40 `<li>` Space: shoot.
- 41 `<li>` Esc: cancel the charge, or pause.
- 42 `<li>` P: pause and resume.
- 43 `<li>` Enter: resume, go to the next level, or try again.
- 44 `<li>` R: hear the {{ rowsRead }} lowest rows with bricks in them.

### src/app/board/board.component.ts

- 51 `lost:` The graphics stopped. The game is paused until they come back.
- 52 `restored:` The graphics are back.

### src/app/board/board_card.component.html

- 23 `<p>` Turn your phone upright for a bigger board.
- 99 `<p>` The game is paused until they come back.

### src/app/play/game.service.ts

- 1048 `fastForwardWords() returns` Fast-forward on.
- 1048 `fastForwardWords() returns` Fast-forward off.

## Results: win, lose, clear and records

### src/app/result/end_words.ts

- 6 `whereLost() returns` Lost on level {String(level)}, {name}
- 11 `tryAgainLabel() returns` Try again from level {String(level)}

### src/app/result/result.component.html

- 4 `<fz-dialog [label]>` {{ title() }}
- 27 `<span>` New best!
- 52 `<button>` Choose a level
- 59 `<button>` Close

### src/app/result/result.component.ts

- 85 `computed()` From level {String(firstLevel)} to the last
- 92 `term:` Score
- 93 `term:` Best
- 94 `term:` Cleared
- 95 `term:` Stars
- 101 `computed()` New game

## Spoken text: labels and announcements for screen readers

### index.html

- 11 `<meta description>` Brick Fuzz Pop, free in your browser. Charge the fuzzball and fire it to break the bricks before they reach the floor. 36 levels, all of them beatable.
- 18 `<meta og:description>` Brick Fuzz Pop, free in your browser. Charge the fuzzball and fire it to break the bricks before they reach the floor. 36 levels, all of them beatable.
- 38 `JSON-LD description` Brick Fuzz Pop, free in your browser. Charge the fuzzball and fire it to break the bricks before they reach the floor. 36 levels, all of them beatable.

### src/app/board/board.component.html

- 6 `<div aria-roledescription>` game board
- 8 `<div [aria-label]>` {{ label() }}
- 37 `<ul aria-label>` Keys

### src/app/board/board.component.ts

- 151 `computed()` Brick Fuzz Pop, level {String(number)}: {data.name}

### src/app/help/help.component.html

- 11 `<table aria-label>` Controls
- 106 `<table aria-label>` Scoring

### src/app/levels/levels.component.html

- 6 `<button aria-label>` Close levels

### src/rules/run/describe.ts

- 26 `hot:` hot shot
- 27 `triple:` triple shot
- 41 `describeBoon() returns` If you break everything you can below the dashed line, the wall jumps. Then your next shot is a {boonName(boon)}.
- 77 `words[] =` Broke none.
- 80 `push()` Freed a friend.
- 80 `push()` Freed {String(freed)} friends.
- 84 `push()` A brick reached the floor.
- 89 `push()` The wall jumped {count(rowsDown, "row", "rows")}. {waitingWords(next)}.
- 92 `push()` Next shot: {boonName(next.boon)}.
- 115 `describeRows() returns` No bricks on the screen.
- 123 `describeCleared() returns` Level {String(run.level)} cleared in {count(run.rounds, "shot", "shots")}, par {String(run.par)}. {count(starsOf(run), "star", "stars")}. Score {formatPoints(run.score)}.
- 128 `describePause() returns` Paused. Score {formatPoints(run.score)}. Press Enter to resume.
- 133 `describeResume() returns` Resumed.
- 140 `describeTakenUp() returns` Paused on level {String(entry.number)}, {entry.data.name}.{shots} Score {formatPoints(run.score)}. Press Enter to resume.
- 145 `endTitle() returns` Every level cleared!
- 145 `endTitle() returns` Game over
- 150 `best =` New best.
- 151 `describeEnd() returns` {asSentence(endTitle(run))} Score {formatPoints(run.score)}, at level {String(run.level)}.{best}
- 166 `words =` {count(lowest, "row", "rows")} to the floor. {count(toJump, "brick", "bricks")} to a jump. {waitingWords(next)}.
- 168 `stepWords() returns` {words} Danger. Break the bottom bricks this shot, or you lose the level.
- 178 `rowsWaiting() returns` No rows waiting
- 220 `badgeWords() returns` with a {tint === 0 ? first : second}
- 225 `PLATE_WORDS[] =` the floor
- 226 `PLATE_WORDS[] =` the ceiling
- 227 `PLATE_WORDS[] =` both sides
- 228 `PLATE_WORDS[] =` the left side
- 229 `PLATE_WORDS[] =` the right side
- 242 `platedWords() returns` plated toward {listed(faces)}
