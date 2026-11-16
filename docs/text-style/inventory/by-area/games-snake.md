# Text inventory: games/snake

Written by `extract.mjs`; do not edit by hand. Each entry gives its line,
where it sits, and its text, with `{{ … }}` or `{…}` where a value is put
in, keys in square brackets and bold lead-ins in asterisks.

## How to play and rules

### src/app/help/help.component.html

- 2 `<p>` Steer the snake to the apple. Each apple it eats scores a point and makes it a square longer and a little faster. The run ends when the snake runs into a wall or into itself; fill the whole board and you win.
- 7 `<p>` **Starting.** The snake waits for your first direction. You can press two turns in quick succession, such as up and then left, and it takes both, one square apart.
- 12 `<p>` **Speeds.** Slow, Normal and Fast each keep their own best score. Change the speed, and whether the snake glides or steps, in the settings.
- 17 `<p>` **Pausing.** The game pauses itself when you switch away, or open a menu or a dialog, and goes on only when you say: with a direction, Space or P, or Resume.
- 27 `<th>` Touch or mouse
- 28 `<th>` Keyboard
- 33 `<th>` Start, or turn
- 34 `<td>` Swipe on the board, or the on-screen arrows
- 35 `<td>` Arrows, or [W] [A] [S] [D]
- 43 `<th>` Pause, or go on
- 44 `<td>` Pause, then Resume
- 45 `<td>` [Space] or [P]
- 48 `<th>` Pause
- 49 `<td>` Pause
- 50 `<kbd>` Esc
- 53 `<th>` Start again, once a run has ended
- 54 `<td>` New game
- 55 `<td>` [Enter] or [Space]

## Descriptions: blurbs, taglines, page metadata and write-ups

### README.md

- 1 `heading` # Snake
- 3 `paragraph` Snake: eat the apples, grow longer, and keep clear of the walls and your own tail. Play it at https://fuzzley.games/play/snake/.
- 6 `paragraph` An [Angular](https://angular.dev/) app on the Fuzzley Games shared libraries (`frontend/lib/`), with its board drawn by [Phaser](https://phaser.io/) through `@fz/phaser`, built with [Vite](https://vite.dev/) and tested with [Vitest](https://vitest.dev/), the scene against real Phaser run headless. It plays at three speeds, by keyboard, swipe or on-screen arrows, pauses whenever the board loses the focus, wears whichever palette the player chose on the site, and keeps a run under way across a reload, paused. Phaser loads after the page has painted, behind a drawing of the empty board.

### index.html

- 14 `<meta description>` Play Snake free in your browser: eat the apples, grow longer and keep clear of the walls and your own tail. Three speeds, by keyboard, swipe or on-screen arrows.
- 21 `<meta og:description>` Play Snake free in your browser: eat the apples, grow longer and keep clear of the walls and your own tail. Three speeds, by keyboard, swipe or on-screen arrows.
- 38 `JSON-LD description` Play Snake free in your browser: eat the apples, grow longer and keep clear of the walls and your own tail. Three speeds, by keyboard, swipe or on-screen arrows.
- 38 `JSON-LD genre` Arcade, Action game
- 58 `<noscript> <p>` Snake, free to play in your browser: eat, grow and keep clear of your own tail. Turn on JavaScript to play.

## Picture text: alt text and captions

### index.html

- 33 `<meta og:image:alt>` A game of Snake paused, a long gold snake bending across a checkered board toward a red apple.

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

- 137 `computed()` Game over

### src/app/settings/settings.component.html

- 3 `<span>` Speed
- 18 `<span>` Movement
- 28 `<span>` On-screen arrows
- 38 `<span>` Sound
- 48 `<label>` Play sounds
- 56 `<span>` Theme

## Hints: setting descriptions, tooltips and prompts

### src/app/bar/bar.component.html

- 74 `<button title>` How to play
- 95 `<button title>` Settings

### src/app/board/board.component.ts

- 128 `computed()` Press an arrow key, or swipe, to start.
- 131 `computed()` Swipe, or press an arrow, to start.
- 132 `computed()` Swipe to start.

### src/app/settings/settings.component.html

- 11 `<p>` Changing the speed starts a new run. Each apple makes the snake a little faster.
- 49 `<p>` A bite for an apple, a bump for a crash, and a chime for a new best.

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

- 137 `computed()` You filled the board!

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

- 9 `<p>` The arrow keys, or W, A, S and D, steer the snake. Space or P pauses and goes on, and Escape pauses. Once a run has ended, Enter or Space starts another. On a card's button, the keys are the button's: Space and Enter press it.

### src/app/board/board.component.ts

- 53 `"aria-roledescription":` game board

### src/rules/describe.ts

- 6 `describeStart() returns` Started, at {SPEED\_INFO[run.speed].name} speed.
- 11 `describePause() returns` Paused, with a score of {run.eaten}. Press a direction to go on.
- 16 `describeResume() returns` Going on.
- 21 `describeTakenUp() returns` Your last run is paused, with a score of {run.eaten}. Press a direction to go on.
- 32 `best =` A new best!
