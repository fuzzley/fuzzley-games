# Text inventory: games/brick-fuzz-pop

Written by `extract.mjs`; do not edit by hand. Each entry gives its line,
where it sits, and its text, with `{{ … }}` or `{…}` where a value is put
in, keys in square brackets and bold lead-ins in asterisks.

## How to play and rules

### src/app/help/help.component.html

- 2 `<p>` Aim the fuzzball, charge it and let it fly. It turns off the sides, the ceiling and every brick it doesn't punch through, until it touches the floor, where it waits for the next shot. One that flies a long while without touching a brick it could break gets bored, yawns and drops to the floor. Then the wall comes down a row. Break every brick a level needs to clear it, those still waiting over the ceiling among them; the level is lost once one it needs stands in the floor's row.
- 11 `<p>` **Charge.** {{ charge }} As you charge, the pips under the waiting fuzzball light up, and on a touch screen over your finger too; each notch ticks a step higher as the charge climbs, and lower as it falls.
- 16 `<p>` **The jump.** Once no brick the level needs is left below the dashed line, the wall jumps a third of the field at once rather than a row, and your next shot carries the level's boon. A jump never loses a level.
- 21 `<p>` **Boons.** {{ boons }}
- 22 `<p>` **Scoring.** Each brick scores its points for every hit it had, as it breaks. {{ scoring.streak }} {{ scoring.bonuses }} {{ scoring.stars }}
- 27 `<p>` **No hurry.** Nothing moves until you shoot. Fast-forward plays every flight faster; once on, it stays on until you turn it off, even on your next visit. Drop brings every fuzzball in the air straight down where it is, ending the round with only what it had done by then, and your next shot starts where your fuzzball lands. The game pauses itself when you switch away, turn the screen or open a dialog; a flight still in the air as the game goes out of sight, as when you switch tabs, lands at once, as it would have flown. A run goes on from level to level until one is lost, and a level can be tried again as often as you like.
- 43 `<th>` Mouse
- 44 `<th>` Touch
- 45 `<th>` Keyboard
- 50 `<th>` Aim
- 51 `<td>` Point; the guide follows. The wheel turns it a quarter of a degree
- 54 `<td>` Press where to aim; the guide follows as you drag
- 55 `<td>` [←] or [→] turns it a degree, or a quarter of one with [Shift] held
- 61 `<th>` Charge
- 62 `<td>` Hold the button: the charge climbs a notch at a time to {{ mostCharge }}, then back down and round again
- 66 `<td>` Keep pressing, still or dragging: the charge climbs a notch at a time to {{ mostCharge }}, then back down and round again
- 70 `<td>` [↑] or [↓], a notch at a time
- 73 `<th>` Let it fly
- 74 `<td>` Let go; a click flies plain
- 75 `<td>` Let go; a tap flies plain
- 76 `<kbd>` Space
- 79 `<th>` Call a charge off
- 80 `<td>` Right-click
- 81 `<td>` Touch the field with a second finger
- 82 `<kbd>` Esc
- 85 `<th>` Switch fast-forward on or off
- 86 `<td>` Fast-forward
- 87 `<td>` Fast-forward
- 88 `<td>` The left index finger's home key, the one with a bump
- 91 `<th>` Drop the fuzzballs in the air
- 92 `<td>` Drop
- 93 `<td>` Drop
- 94 `<td>` The left ring finger's key on the bottom row
- 97 `<th>` Pause, or go on
- 98 `<td>` Pause, then Resume
- 99 `<td>` Pause, then Resume
- 100 `<td>` The key above the right little finger's home key; [Esc] pauses while no charge builds, and [Enter] goes on
- 107 `<th>` Next level
- 108 `<td>` Next level
- 109 `<td>` Next level
- 110 `<kbd>` Enter
- 113 `<th>` Start again, once a run has ended
- 114 `<td>` Try again, or New game
- 115 `<td>` Try again, or New game
- 116 `<td>` [Enter], or, once the result is put away, the key above the right little finger's home key
- 124 `<p>` **Keys by place.** The letter keys are read by where they sit, whatever they print, so they fall under the same fingers on every keyboard. The left hand's home keys under its little, ring and middle fingers do as [←], [↓] and [→] do, and the key above the ring finger's as [↑] does.
- 131 `<p>` **Ways of aiming.** In the settings, Aiming can have the mouse and fingers pull back instead: press anywhere on the field and drag away from where to aim, the longer the pull the more charge, and slide back to where you pressed to call the shot off.
- 137 `<p>` **By ear.** The aim and the charge are said as the keys change them, fast-forward as its key switches it, and the key above the left index finger's home key reads the wall's three lowest rows, from the floor up.

### src/app/help/help.component.ts

- 32 `CHARGE =` A fuzzball's charge, 0 to {String(MOST\_CHARGE)}, is how many hits it punches through. It spends as much as a brick has hits left, or all it has, taking that many hits off it: through a brick it breaks it flies on with what is left, and off one it doesn't it turns. A plain one takes one hit and turns. Steel takes the charge.
- 35 `BOONS =` The hot shot flies at full charge whatever you charged, and nothing takes its charge. The triple shot sends {count(TRIPLE\_MATES, "more fuzzball", "more fuzzballs")} out behind yours, each with the charge you chose. A boon lasts one shot, and a boon shot that clears below the line again earns the next.
- 35 `count()` more fuzzball
- 35 `count()` more fuzzballs
- 39 `streak:` The bricks a round breaks make a streak, which multiplies each one's points: {tierWords(STREAK, "bricks")}.
- 40 `bonuses:` A jump adds {formatPoints(JUMP\_POINTS)} points, and each star {formatPoints(STAR\_POINTS)}.
- 41 `stars:` A level cleared within its par of rounds earns three stars, two within {count(TWO\_STARS\_PAST\_PAR, "more round", "more rounds")}, and one otherwise. Par is set for the depth the field had as the level began.
- 41 `count()` more round
- 41 `count()` more rounds
- 46 `BRICKS_INTRO =` A kind is told by its shape and its mark, and a tough brick's hits by its pips. A level needs every brick broken but those that never break.
- 86 `heading:` Bricks

## Reference: what each thing, option and variant does

### src/rules/catalog/kinds/sparks.ts

- 11 `about:` As it breaks, blasts the eight bricks around it.
- 23 `about:` As it breaks, zaps every brick in its row and in its column, as far as the ceiling.
- 39 `about:` As it breaks, zaps the bricks along both its diagonals, three cells each way.
- 52 `about:` Charges the fuzzball that strikes it to full, so even a plain one breaks through and flies on charged; a zap or a blast only breaks it.
- 64 `about:` Takes two hits, and as it breaks frees a friend, who flies behind the fuzzball every round left of the level.

### src/rules/catalog/kinds/thick_walls.ts

- 8 `about:` Takes two or three hits, from charge, a zap or a blast alone: a plain fuzzball turns off it.
- 20 `about:` Takes two or three hits, and grows one back after each round it survives, up to its full hits.

### src/rules/catalog/kinds/tricks.ts

- 8 `about:` Never breaks: round, it kicks every fuzzball straight away from its middle and earths its charge, lets zaps through, and sinks into the floor.
- 24 `about:` Breaks at a hit, and two more fuzzballs leave from it, 30° either side of the one that broke it; a zap or a blast only breaks it.
- 37 `about:` Never breaks, and stops nothing: a fuzzball whose middle flies into it comes out of its twin, flying the same way, while both stand in the field, and it sinks with its twin.
- 49 `about:` Takes two or three hits, a pip for each one left, but none through its steel plates, which earth the charge; zaps and blasts still hurt it.

### src/rules/catalog/kinds/warm_up.ts

- 8 `about:` Breaks at a hit.
- 19 `about:` Takes two to six hits, a pip for each one left.
- 31 `about:` Never breaks: it turns every fuzzball and earths its charge, lets zaps through, and sinks into the floor.
- 42 `about:` As it breaks, zaps every brick in its row.
- 55 `about:` As it breaks, zaps every brick in its column, as far as the ceiling.

## Descriptions: blurbs, taglines, page metadata and write-ups

### README.md

- 1 `heading` # Brick Fuzz Pop
- 3 `paragraph` Brick Fuzz Pop: aim the fuzzball, charge it with static and let it punch through the wall before the bricks reach the floor. Play it at https://fuzzley.games/play/brick-fuzz-pop/.
- 7 `paragraph` An [Angular](https://angular.dev/) app on the Fuzzley Games shared libraries (`frontend/lib/`), with its field drawn by [Phaser](https://phaser.io/) through `@fz/phaser`, built with [Vite](https://vite.dev/) and tested with [Vitest](https://vitest.dev/), the scene against real Phaser run headless. It holds thirty-six levels in four sets, Warm-up, Sparks, Tricks and Thick walls, played by rules that run without a framework, the flight included. It plays at two speeds, with fast-forward, by mouse, keyboard or touch, pauses whenever the field loses the player, wears whichever palette the player chose on the site, and keeps a run under way across a reload, paused. Phaser loads behind a drawing of the empty field.

### index.html

- 11 `<meta description>` Play Brick Fuzz Pop free in your browser: aim the fuzzball, charge it with static and let it go to punch through a wall of bricks before they reach the floor. Thirty-six levels, each proved beatable, by touch, mouse or keyboard.
- 18 `<meta og:description>` Play Brick Fuzz Pop free in your browser: aim the fuzzball, charge it with static and let it go to punch through a wall of bricks before they reach the floor. Thirty-six levels, each proved beatable, by touch, mouse or keyboard.
- 38 `JSON-LD description` Play Brick Fuzz Pop free in your browser: aim the fuzzball, charge it with static and let it go to punch through a wall of bricks before they reach the floor. Thirty-six levels, each proved beatable, by touch, mouse or keyboard.
- 38 `JSON-LD genre` Arcade, Puzzle game

## Picture text: alt text and captions

### index.html

- 33 `<meta og:image:alt>` A game of Brick Fuzz Pop on level 18, Powder keg: rows of tough bricks, bombs, a wool brick and a caged friend, the fuzzball's dotted aim line running up into the wall, three bricks outlined where it would punch through.

## Names: games, modes, levels and things

### index.html

- 5 `<title>` Brick Fuzz Pop
- 17 `<meta og:title>` Brick Fuzz Pop
- 38 `JSON-LD name` Brick Fuzz Pop
- 57 `<noscript> <h1>` Brick Fuzz Pop

### src/app/settings/settings.component.ts

- 37 `name:` Point and hold
- 42 `name:` Pull back
- 59 `name:` Normal
- 63 `name:` Fast

### src/rules/catalog/kinds/sparks.ts

- 10 `name:` Bomb
- 21 `name:` Cross zapper
- 37 `name:` X zapper
- 50 `name:` Wool brick
- 62 `name:` Cage

### src/rules/catalog/kinds/thick_walls.ts

- 6 `name:` Shell brick
- 18 `name:` Moss brick

### src/rules/catalog/kinds/tricks.ts

- 6 `name:` Bumper
- 22 `name:` Prism
- 35 `name:` Portal
- 47 `name:` Plated brick

### src/rules/catalog/kinds/warm_up.ts

- 7 `name:` Brick
- 18 `name:` Tough brick
- 29 `name:` Steel brick
- 41 `name:` Row zapper
- 53 `name:` Column zapper

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
- 28 `<span>` Rounds
- 36 `<span>` Rows left
- 41 `<span>` Score
- 46 `<span>` Crew

### src/app/bar/bar.component.ts

- 139 `computed()` Resume
- 139 `computed()` Pause
- 172 `label:` Levels
- 173 `label:` New game

### src/app/board/board.component.ts

- 222 `computed()` No rows waiting

### src/app/board/board_card.component.html

- 17 `<p>` **New: {{ newKind.name }}.** {{ newKind.about }}
- 29 `<h2>` Paused
- 30 `<p>` Score {{ card.score }}
- 31 `<button>` Resume
- 59 `<p>` Score {{ card.score }}
- 66 `<button>` Next level
- 85 `<p>` Score {{ card.score }}
- 98 `<h2>` Restoring the board

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

### src/app/panels/coming_next.component.ts

- 65 `computed()` No rows wait over the ceiling.
- 66 `computed()` {count(waiting, "row waits", "rows wait")} over the ceiling.
- 66 `count()` row waits
- 66 `count()` rows wait

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
- 23 `<span>` The flight's speed
- 39 `<span>` Long flights
- 49 `<label>` Speed up long flights
- 57 `<span>` Guide
- 67 `<label>` Show the aim guide
- 76 `<span>` Sound
- 86 `<label>` Play sounds
- 96 `<span>` Theme

## Hints: setting descriptions, tooltips and prompts

### src/app/bar/bar.component.html

- 64 `<button [title]>` {{ pauseName() }}
- 110 `<button title>` Levels
- 122 `<button title>` New game
- 134 `<button title>` How to play
- 156 `<button title>` Settings

### src/app/bar/drop.component.ts

- 19 `title:` Drop

### src/app/levels/levels.component.html

- 12 `<p>` Choose a level to start a run there. Clearing one opens the next; each shows the stars it earned, up to three, and its best once cleared.

### src/app/settings/settings.component.html

- 17 `<p>` The keys aim and charge whichever way is chosen.
- 31 `<p>` Fast-forward, in the bar, once switched on, stays on from flight to flight until you switch it off. Drop, there from the start of every flight, brings it down where it is, keeping only what it had done by then.
- 50 `<p>` A flight that goes on and on doubles its speed by itself.
- 68 `<p>` Dots show the shot's flight to its first turn, and outline the bricks it would punch through.
- 87 `<p>` A tick for each notch of charge, rising with the charge; each brick struck and broken, rising along a round; and a chime for a level cleared.

### src/app/settings/settings.component.ts

- 39 `detail:` Point where to aim, then hold to charge, up to five and down again. Let go to fly.
- 44 `detail:` Press anywhere on the field and drag away from the aim: the longer the pull, the more charge. Let go to fly.
- 60 `detail:` Every bounce easy to follow.
- 64 `detail:` Quicker, for a wall you know well.

## Messages: notices, confirmations, explanations and errors

### src/app/app.component.ts

- 47 `HELP_FAILED_WORDS =` How to play couldn't be loaded. Check the connection, then try again.

### src/app/board/board.component.ts

- 51 `lost:` The board stopped drawing and is being restored. The game waits until it is back.
- 52 `restored:` The board is back.

### src/app/board/board_card.component.html

- 23 `<p>` The game is larger upright.
- 99 `<p>` The game waits until it is back.

### src/app/play/game.service.ts

- 1048 `fastForwardWords() returns` Fast-forward on.
- 1048 `fastForwardWords() returns` Fast-forward off.

## Results: win, lose, clear and records

### src/app/board/board_card.component.ts

- 269 `title:` Level {String(card.level)} cleared

### src/app/result/end_words.ts

- 6 `whereLost() returns` Lost on level {String(level)}, {name}
- 11 `tryAgainLabel() returns` Try again from level {String(level)}

### src/app/result/result.component.html

- 4 `<fz-dialog [label]>` {{ title() }}
- 27 `<span>` New best
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

- 58 `<noscript> <p>` Brick Fuzz Pop, free to play in your browser: aim the fuzzball, charge it and punch through the wall before it reaches the floor. Turn on JavaScript to play.

### src/app/board/board.component.html

- 6 `<div aria-roledescription>` game board
- 8 `<div [aria-label]>` {{ label() }}
- 31 `<p>` The left and right arrow keys turn the aim a degree, or a quarter of one with Shift held, and the up and down arrow keys raise and lower the charge a notch; the left hand's home keys under its little, ring and middle fingers, and the key above the ring finger's, do the same. Space lets the shot fly. The left index finger's home key switches fast-forward on or off, and the left ring finger's key on the bottom row drops the fuzzballs in the air. The key above the left index finger's home key reads the wall's three lowest rows. Escape calls a charge off, or pauses; the key above the right little finger's home key pauses and goes on, and Enter goes on, or to the next level. Once a run's result is put away, Enter or the key above the right little finger's home key tries the lost level again, or starts a new game after the last. On a card's button, the keys are the button's: Space and Enter press it.

### src/app/board/board.component.ts

- 148 `computed()` Brick Fuzz Pop, level {String(number)}: {data.name}

### src/app/levels/levels.component.html

- 6 `<button aria-label>` Close levels

### src/rules/run/describe.ts

- 26 `hot:` hot shot
- 27 `triple:` triple shot
- 41 `describeBoon() returns` Clear to the dashed line and the wall jumps: your next shot is a {boonName(boon)}.
- 77 `words[] =` Broke none.
- 80 `push()` Freed a friend.
- 80 `push()` Freed {String(freed)} friends.
- 84 `push()` A brick reached the floor.
- 89 `push()` The lower two-thirds are clear. The wall jumped {count(rowsDown, "row", "rows")}, with {waitingWords(next)}.
- 92 `push()` Next shot: {boonName(next.boon)}.
- 115 `describeRows() returns` No bricks in the field.
- 123 `describeCleared() returns` Level {String(run.level)} cleared in {count(run.rounds, "round", "rounds")}, par {String(run.par)}: {count(starsOf(run), "star", "stars")}! Score {formatPoints(run.score)}.
- 128 `describePause() returns` Paused, with a score of {formatPoints(run.score)}. Press Enter to go on.
- 133 `describeResume() returns` Going on.
- 140 `describeTakenUp() returns` Your last run is paused on level {String(entry.number)}, {entry.data.name},{rounds} with a score of {formatPoints(run.score)}. Press Enter to go on.
- 145 `endTitle() returns` Every level cleared!
- 145 `endTitle() returns` Game over
- 150 `best =` A new best!
- 151 `describeEnd() returns` {asSentence(endTitle(run))} Score {formatPoints(run.score)}, at level {String(run.level)}.{best}
- 165 `words =` The wall came down {count(rowsDown, "row", "rows")}: {count(lowest, "row", "rows")} from the floor, {count(toJump, "brick", "bricks")} to a jump, {waitingWords(next)}.
- 167 `stepWords() returns` {words} Danger: the next step down loses the level.
- 180 `waitingWords() returns` no rows waiting
- 210 `badgeWords() returns` with a {tint === 0 ? first : second}
- 215 `PLATE_WORDS[] =` the floor
- 216 `PLATE_WORDS[] =` the ceiling
- 217 `PLATE_WORDS[] =` both sides
- 218 `PLATE_WORDS[] =` the left side
- 219 `PLATE_WORDS[] =` the right side
- 232 `platedWords() returns` plated toward {listed(faces)}
