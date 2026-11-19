# Text inventory: games/minesweeper

Written by `extract.mjs`; do not edit by hand. Each entry gives its line,
where it sits, and its text, with `{{ … }}` or `{…}` where a value is put
in, keys in square brackets and bold lead-ins in asterisks.

## How to play and rules

### src/app/help/help.component.html

- 2 `<p>` Open every square that isn't a mine. A number tells you how many mines are around it. If you're sure a square is a mine, flag it. Your first square is never a mine.
- 12 `<th>` Mouse
- 13 `<th>` Touch
- 14 `<th>` Keyboard
- 19 `<th>` Open a square
- 20 `<td>` Click
- 21 `<td>` Tap
- 22 `<td>` [Enter] or [Space]
- 25 `<th>` Flag a square
- 26 `<td>` Right-click
- 27 `<td>` Long press, or Flag mode
- 31 `<th>` Open around a number
- 32 `<td>` Click it
- 33 `<td>` Tap it
- 34 `<td>` [Enter] on it
- 37 `<th>` Move
- 40 `<td>` Arrow keys, [Home], [End]
- 45 `<p>` **Lives.** You start with {{ lives() }}. @if (hasSpareLives()) { If you open a mine, you lose one and keep playing. When you have none left, the game is over. } @else { If you open a mine, the game is over. }
- 54 `<p>` **Opening around a number.** If a number has as many flags around it as it shows, you can open the rest of the squares around it at once. Mines you already opened count as flags. If a flag is wrong, you open a mine.

## Descriptions: blurbs, taglines, page metadata and write-ups

### README.md

- 1 `heading` # Minesweeper
- 3 `paragraph` Minesweeper with lives. Hitting a mine costs a life instead of ending the game. Play it at https://fuzzley.games/play/minesweeper/.
- 6 `paragraph` An [Angular](https://angular.dev/) app on the Fuzzley Games shared libraries (`frontend/lib/`), built with [Vite](https://vite.dev/) and tested with [Vitest](https://vitest.dev/). It plays by mouse, touch or keyboard, wears whichever palette the player chose on the site, and keeps a game in progress across a reload.

### index.html

- 14 `<meta description>` Minesweeper with lives, free in your browser. Hitting a mine costs a life instead of ending the game. Easy, Medium, Hard or a board of your own.
- 21 `<meta og:description>` Minesweeper with lives, free in your browser. Hitting a mine costs a life instead of ending the game. Easy, Medium, Hard or a board of your own.
- 38 `JSON-LD description` Minesweeper with lives, free in your browser. Hitting a mine costs a life instead of ending the game. Easy, Medium, Hard or a board of your own.
- 38 `JSON-LD genre` Puzzle, Logic game
- 58 `<noscript> <p>` Clear the field using the numbers. Don’t hit a mine. Turn on JavaScript to play.

## Picture text: alt text and captions

### index.html

- 33 `<meta og:image:alt>` A Medium Minesweeper field, half cleared, with flags, 1 mine hit and 2 lives left.

## Names: games, modes, levels and things

### index.html

- 5 `<title>` Minesweeper
- 20 `<meta og:title>` Minesweeper
- 38 `JSON-LD name` Minesweeper
- 57 `<noscript> <h1>` Minesweeper

### src/rules/difficulty.ts

- 14 `name:` Easy
- 15 `name:` Medium
- 16 `name:` Hard

## Labels: buttons, menus, headings, readouts and settings

### src/app/bar/bar.component.html

- 7 `<h1>` Minesweeper
- 18 `<fz-bar-choice label>` Difficulty
- 31 `<span>` Mines
- 35 `<span>` Lives
- 46 `<span>` Time
- 76 `<span>` Restart
- 88 `<span>` New game

### src/app/bar/bar.component.ts

- 34 `label:` Restart

### src/app/play/game.service.ts

- 59 `confirmLabel:` New game
- 75 `confirmLabel:` Restart

### src/app/settings/settings.component.html

- 3 `<span>` Difficulty
- 13 `<label>` Rows
- 23 `<label>` Columns
- 33 `<label>` Mines
- 48 `<button>` New custom game
- 56 `<span>` Lives
- 82 `<span>` Theme

### src/app/settings/settings.component.ts

- 181 `most =` all but 9 squares

### src/rules/difficulty.ts

- 109 `difficultyName() returns` Custom

## Hints: setting descriptions, tooltips and prompts

### src/app/bar/bar.component.html

- 56 `<button title>` Flag squares with a tap or click
- 97 `<button title>` How to play
- 118 `<button title>` Settings

### src/app/settings/settings.component.html

- 75 `<p>` Each mine you open costs 1 life. Changing the difficulty or the lives starts a new game.

### src/app/settings/settings.component.ts

- 180 `sides =` Rows and columns from {CUSTOM\_SIDE.min} to {CUSTOM\_SIDE.max}
- 182 `computed()` {sides}. Mines from 1 to {most}.

## Messages: notices, confirmations, explanations and errors

### src/app/play/game.service.ts

- 57 `title:` Start a new game?
- 58 `message:` You'll lose the game in progress.
- 67 `title:` Start a new {difficultyName(difficulty)} game?
- 73 `title:` Restart this field?
- 74 `message:` The mines stay where they are. The clock and your lives reset.

### src/rules/difficulty.ts

- 65 `sides =` a whole number from {CUSTOM\_SIDE.min} to {CUSTOM\_SIDE.max}
- 67 `message:` Rows must be {sides}.
- 70 `message:` Columns must be {sides}.
- 76 `message:` Mines must be a whole number from 1 to {most}.

## Results: win, lose, clear and records

### src/app/result/result.component.html

- 4 `<fz-dialog [label]>` {{ title() }}
- 14 `<span>` New best time
- 38 `<button>` New game
- 48 `<button>` Play this field again

### src/app/result/result.component.ts

- 38 `computed()` Field cleared!
- 38 `computed()` Out of lives
- 46 `computed()` You cleared {share}% of the field.
- 56 `term:` Time
- 57 `term:` Won
- 61 `term:` Lives left
- 68 `term:` Mines found
- 71 `term:` Best

## Spoken text: labels and announcements for screen readers

### src/app/bar/bar.component.html

- 55 `<button aria-label>` Flag mode
- 96 `<button aria-label>` How to play
- 117 `<button aria-label>` Settings

### src/app/board/board.component.html

- 15 `<div [aria-label]>` {{ label() }}
- 35 `<div [aria-label]>` {{ cell.label }}

### src/app/board/board.component.ts

- 77 `computed()` Minefield, {rows} rows by {cols} columns

### src/app/result/result.component.html

- 60 `<button aria-label>` Close and look at the field

### src/app/settings/settings.component.ts

- 64 `describeDifficulty() returns` Your own size and mines

### src/rules/describe.ts

- 32 `describeSquare() returns` Hidden
- 34 `describeSquare() returns` Flagged
- 36 `describeSquare() returns` Blank
- 42 `describeSquare() returns` Mine
- 44 `describeSquare() returns` Flagged, no mine
- 51 `describeMove() returns` Boom. Out of lives.
- 52 `describeMove() returns` Field cleared.
- 71 `push()` Flagged
- 71 `push()` Unflagged
