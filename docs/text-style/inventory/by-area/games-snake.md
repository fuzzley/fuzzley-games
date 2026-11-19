# Text inventory: games/snake

Written by `extract.mjs`; do not edit by hand. Each entry gives its line,
where it sits, and its text, with `{{ … }}` or `{…}` where a value is put
in, keys in square brackets and bold lead-ins in asterisks.

## How to play and rules

### src/app/help/help.component.html

- 2 `<p>` Eat apples to grow. Each apple is 1 point, and the snake gets a little faster every time. If you hit a wall or your own tail, the game is over. Fill the whole board to win.
- 12 `<th>` Touch or mouse
- 13 `<th>` Keyboard
- 18 `<th>` Start or turn
- 19 `<td>` Swipe, or the on-screen arrows
- 20 `<td>` Arrow keys or [W] [A] [S] [D]
- 28 `<th>` Pause or resume
- 29 `<td>` Pause, then Resume
- 30 `<td>` [Space] or [P]
- 33 `<th>` Pause
- 34 `<td>` Pause
- 35 `<kbd>` Esc
- 38 `<th>` New game
- 39 `<td>` New game
- 40 `<td>` [Enter] or [Space]
- 45 `<p>` **Quick turns.** If you turn twice quickly, such as up and then left, the snake makes both turns, 1 square apart.
- 49 `<p>` **Speeds.** Each speed has its own best score. If you change the speed, a new game starts.
- 53 `<p>` **Pausing.** The game pauses when you switch tabs or open a menu. Press Space or P to resume.

## Descriptions: blurbs, taglines, page metadata and write-ups

### README.md

- 1 `heading` # Snake
- 3 `paragraph` Eat the apples without hitting the walls or your own tail. If you fill the board, you win. Play it at https://fuzzley.games/play/snake/.
- 6 `paragraph` An [Angular](https://angular.dev/) app on the Fuzzley Games shared libraries (`frontend/lib/`), with its board drawn by [Phaser](https://phaser.io/) through `@fz/phaser`, built with [Vite](https://vite.dev/) and tested with [Vitest](https://vitest.dev/), the scene against real Phaser run headless. It plays at three speeds, by keyboard, swipe or on-screen arrows, pauses whenever the board loses the focus, wears whichever palette the player chose on the site, and keeps a run under way across a reload, paused. Phaser loads after the page has painted, behind a drawing of the empty board.

### index.html

- 14 `<meta description>` Snake, free in your browser. Eat the apples, and don’t hit the walls or your own tail. The snake speeds up as it grows. Fill the board to win.
- 21 `<meta og:description>` Snake, free in your browser. Eat the apples, and don’t hit the walls or your own tail. The snake speeds up as it grows. Fill the board to win.
- 38 `JSON-LD description` Snake, free in your browser. Eat the apples, and don’t hit the walls or your own tail. The snake speeds up as it grows. Fill the board to win.
- 38 `JSON-LD genre` Arcade, Action game
- 58 `<noscript> <p>` Eat the apples. Don’t hit the walls or your own tail. Turn on JavaScript to play.

## Picture text: alt text and captions

### index.html

- 33 `<meta og:image:alt>` A paused game of Snake, with a gold snake heading for a red apple.

## Names: games, modes, levels and things

### index.html

- 5 `<title>` Snake
- 20 `<meta og:title>` Snake
- 38 `JSON-LD name` Snake
- 57 `<noscript> <h1>` Snake

### src/app/settings/settings.component.ts

- 17 `name:` Glide
- 20 `name:` Step
- 26 `name:` On a touch screen
- 29 `name:` Always
- 30 `name:` Never

### src/rules/speed.ts

- 22 `name:` Slow
- 28 `name:` Normal
- 34 `name:` Fast

## Labels: buttons, menus, headings, readouts and settings

### src/app/arrows/arrows.component.ts

- 16 `label:` Up
- 17 `label:` Left
- 18 `label:` Right
- 19 `label:` Down

### src/app/bar/bar.component.html

- 7 `<h1>` Snake
- 17 `<fz-bar-choice label>` Speed
- 26 `<span>` Score
- 30 `<span>` Best
- 65 `<span>` New game

### src/app/board/board.component.html

- 22 `<p>` Ready
- 28 `<p>` Paused
- 29 `<p>` Score {{ game.score() }}
- 30 `<button>` Resume
- 38 `<p>` Score {{ game.score() }}
- 39 `<button>` New game

### src/app/board/board.component.ts

- 135 `computed()` Game over

### src/app/settings/settings.component.html

- 3 `<span>` Speed
- 18 `<span>` Movement
- 28 `<span>` On-screen arrows
- 38 `<span>` Sound
- 47 `<label>` Play sounds
- 52 `<span>` Theme

## Hints: setting descriptions, tooltips and prompts

### src/app/bar/bar.component.html

- 74 `<button title>` How to play
- 95 `<button title>` Settings

### src/app/board/board.component.ts

- 127 `computed()` Press an arrow key to start.
- 129 `computed()` Swipe or tap an arrow to start.
- 130 `computed()` Swipe to start.

### src/app/settings/settings.component.html

- 11 `<p>` Changing the speed starts a new game. Each apple makes the snake a little faster.

### src/app/settings/settings.component.ts

- 18 `detail:` Slides smoothly from square to square.
- 20 `detail:` Jumps a whole square at a time.
- 27 `detail:` On a phone or a tablet.
- 29 `detail:` For a mouse too.
- 30 `detail:` Swipes and keys only.

### src/rules/speed.ts

- 25 `says:` Time to think between turns.
- 31 `says:` The classic pace.
- 37 `says:` Quick from the start.

## Messages: notices, confirmations, explanations and errors

### src/app/board/board.component.ts

- 135 `computed()` You filled the board!

## Results: win, lose, clear and records

### src/app/result/result.component.html

- 4 `<fz-dialog [label]>` {{ title() }}
- 16 `<span>` New best
- 39 `<button>` New game
- 49 `<span>` Or another speed
- 60 `<button>` Close

### src/app/result/result.component.ts

- 41 `computed()` You filled the board!
- 41 `computed()` Game over
- 52 `computed()` {why}, at {SPEED\_INFO[run.speed].name} speed
- 67 `term:` Score
- 68 `term:` Best
- 69 `term:` Length

## Spoken text: labels and announcements for screen readers

### src/app/arrows/arrows.component.html

- 5 `<div aria-label>` Arrows
- 12 `<button [aria-label]>` {{ arrow.label }}

### src/app/bar/bar.component.html

- 73 `<button aria-label>` How to play
- 94 `<button aria-label>` Settings

### src/app/board/board.component.html

- 9 `<p>` Arrow keys, or W, A, S and D: steer the snake. Space or P: pause and resume. Esc: pause. Enter: resume. After a game ends, Enter or Space: start a new game.

### src/app/board/board.component.ts

- 53 `"aria-roledescription":` game board

### src/rules/describe.ts

- 6 `describeStart() returns` Started at {SPEED\_INFO[run.speed].name} speed.
- 11 `describePause() returns` Paused. Score {run.eaten}. Press Space to resume.
- 16 `describeResume() returns` Resumed.
- 27 `best =` New best.
