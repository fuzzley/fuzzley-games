# Text inventory: games/sudoku

Written by `extract.mjs`; do not edit by hand. Each entry gives its line,
where it sits, and its text, with `{{ … }}` or `{…}` where a value is put
in, keys in square brackets and bold lead-ins in asterisks.

## How to play and rules

### src/app/help/help.component.html

- 2 `<p>` Fill the grid so that every row, column and 3 × 3 box has each digit from 1 to 9 once. Every puzzle has one solution, and you can find it without guessing. If a digit repeats in a row, column or box, it's marked.
- 12 `<th>` Mouse or touch
- 13 `<th>` Keyboard
- 18 `<th>` Select a square
- 19 `<td>` Click or tap it
- 20 `<td>` Arrow keys, [Home], [End]
- 23 `<th>` Place a digit
- 24 `<td>` The digit on the pad
- 25 `<td>` [1] to [9]
- 28 `<th>` Add or remove a note
- 29 `<td>` The digit in Notes mode
- 30 `<td>` [Shift] and the digit
- 33 `<th>` Notes mode
- 34 `<td>` Notes
- 38 `<th>` Erase
- 39 `<td>` Erase
- 40 `<td>` [Backspace], [Delete] or [0]
- 43 `<th>` Undo
- 44 `<td>` Undo
- 45 `<td>` [Ctrl] + [Z]
- 48 `<th>` Hint
- 49 `<td>` Hint, then Fill in, Add note or Take out
- 50 `<td>` [H], then [H] or [Enter]
- 55 `<p>` **Notes.** Turn on Notes to jot down the digits that might go in a square. Fill in notes does this for every blank square without notes. When you place a digit, it comes out of the notes in its row, column and box. You can turn off Auto-clear notes in Settings.
- 61 `<p>` **Hints.** If there is a mistake on the board, Hint shows it. If not, it shows the next square you can solve and explains why. Press Hint again to fix it or fill it in. A puzzle solved with a hint doesn't count for a best time.
- 67 `<p>` **Mistakes.** Turn on Mark mistakes in Settings to also mark any digit that doesn't match the solution.

## Descriptions: blurbs, taglines, page metadata and write-ups

### README.md

- 1 `heading` # Sudoku
- 3 `paragraph` Sudoku from Easy to Expert, where you can solve every puzzle without guessing. If you get stuck, a hint shows the next square you can fill, and why. Play it at https://fuzzley.games/play/sudoku/.
- 7 `paragraph` An [Angular](https://angular.dev/) app on the Fuzzley Games shared libraries (`frontend/lib/`), built with [Vite](https://vite.dev/) and tested with [Vitest](https://vitest.dev/). Its puzzles come from a bank graded by the techniques a person needs to solve them, at four levels, and each is dealt through one of the grid's symmetries, so no two deals look alike. It plays by mouse, touch or keyboard, wears whichever palette the player chose on the site, and keeps a game in progress, its undo included, across a reload.

### index.html

- 38 `JSON-LD genre` Puzzle, Logic game
- 58 `<noscript> <p>` Fill the grid so every row, column and box has 1 to 9. Turn on JavaScript to play.

## Picture text: alt text and captions

### index.html

- 33 `<meta og:image:alt>` A Sudoku game on Medium, partly filled in, with notes in some squares.

## Names: games, modes, levels and things

### index.html

- 5 `<title>` Sudoku
- 20 `<meta og:title>` Sudoku
- 38 `JSON-LD name` Sudoku
- 57 `<noscript> <h1>` Sudoku

### src/rules/difficulty.ts

- 15 `name:` Easy
- 16 `name:` Medium
- 17 `name:` Hard
- 18 `name:` Expert

## Labels: buttons, menus, headings, readouts and settings

### src/app/bar/bar.component.html

- 7 `<h1>` Sudoku
- 17 `<fz-bar-choice label>` Level
- 26 `<span>` Time
- 44 `<span>` Fill in notes
- 56 `<span>` Restart
- 68 `<span>` New game

### src/app/bar/bar.component.ts

- 24 `label:` Fill in notes
- 25 `label:` Restart

### src/app/hint/hint.component.html

- 9 `<p>` **{{ hint.title }}** {{ hint.text }}
- 53 `<fz-dialog [label]>` {{ sheetLabel() }}
- 77 `<button>` Close

### src/app/hint/hint.component.ts

- 78 `computed()` Hint
- 87 `computed()` Fill in

### src/app/pad/pad.component.html

- 34 `<span>` Notes
- 38 `<span>` Erase
- 48 `<span>` Undo

### src/app/pad/pad.component.ts

- 47 `status:` , all placed
- 55 `computed()` Hint

### src/app/play/game.service.ts

- 35 `confirmLabel:` New game
- 51 `confirmLabel:` Restart

### src/app/settings/settings.component.html

- 3 `<span>` Level
- 17 `<span>` Assists
- 27 `<label>` Mark mistakes
- 41 `<label>` Auto-clear notes
- 49 `<span>` Theme

### src/rules/hint.ts

- 45 `mistake:` Take out
- 46 `note:` Add note
- 47 `step:` Fill in

## Hints: setting descriptions, tooltips and prompts

### src/app/bar/bar.component.html

- 77 `<button title>` How to play
- 98 `<button title>` Settings

### src/app/settings/settings.component.html

- 11 `<p>` Changing the level starts a new puzzle.
- 28 `<p>` Marks any digit that doesn't match the solution, not only repeats.
- 42 `<p>` Placing a digit removes it from the notes in its row, column and box.

## Messages: notices, confirmations, explanations and errors

### src/app/hint/hint.component.html

- 15 `<p>` **{{ hint.title }}** {{ hint.conclusion }} Why?
- 45 `<span>` Why?

### src/app/play/game.service.ts

- 33 `title:` Start a new game?
- 34 `message:` You'll lose the game in progress.
- 43 `title:` Start a new {LEVEL\_INFO[level].name} game?
- 49 `title:` Restart this puzzle?
- 50 `message:` You'll lose your digits and notes. The clock resets.

### src/rules/describe.ts

- 153 `conclusion:` The {placement.digit} goes in {squareName(placement.index)}.
- 161 `text =` The {digit} at {squareName(index)} doesn't belong there.
- 162 `title:` A mistake
- 167 `text =` The notes at {squareName(index)} are missing the digit that goes there.
- 168 `title:` A missing note
- 178 `placementWords() returns` Now the only place for the {digit} in {unitName(unit)} is {place}.
- 179 `placementWords() returns` In {unitName(unit)}, the {digit} can only go in {place}.
- 182 `placementWords() returns` Now only {digit} can go in {square}.
- 183 `placementWords() returns` Only {digit} can go in {square}.
- 210 `eliminationWords() returns` In {first}, the {digitList} can only go in {second}, so it can't go anywhere else in {second}.
- 213 `eliminationWords() returns` {capitalized(first)} has {cells.length} squares where only {digitList} can go. So {digitList} can't go anywhere else in {first}.
- 216 `eliminationWords() returns` In {first}, the {digitList} can only go in the same {cells.length} squares, so no other digit can go in those squares.
- 221 `eliminationWords() returns` In {linesName(units.slice(0, half))}, the {digitList} can only go in {linesName(cover)}, so it can't go anywhere else in those {cover[0]?.kind ?? ""}s.
- 226 `eliminationWords() returns` The square at {squareName(pivot)} can only be {x} or {y}. Either way, the square at {squareName(a)} or the one at {squareName(b)} must be {z}. So {z} can't go in any square that shares a row, column or box with both of them.

### src/rules/difficulty.ts

- 15 `asks:` Singles only
- 16 `asks:` Pairs and pointing
- 17 `asks:` Triples and X-Wings
- 18 `asks:` Swordfish and XY-Wings

## Results: win, lose, clear and records

### src/app/result/result.component.html

- 4 `<fz-dialog label>` Solved!
- 10 `<h2>` Solved!
- 14 `<span>` New best time
- 40 `<button>` New game
- 50 `<span>` Or another level
- 61 `<button>` Close

### src/app/result/result.component.ts

- 61 `term:` Time
- 63 `term:` Hints
- 64 `term:` Best
- 65 `term:` Solved
- 75 `computed()` You solved this one before, so it doesn't count again.
- 78 `computed()` Solved with {count(hints, "hint", "hints")}, so no best time.

## Spoken text: labels and announcements for screen readers

### index.html

- 14 `<meta description>` Sudoku, free in your browser, from Easy to Expert. Every puzzle can be solved without guessing. A hint shows the next square you can fill, and why.
- 21 `<meta og:description>` Sudoku, free in your browser, from Easy to Expert. Every puzzle can be solved without guessing. A hint shows the next square you can fill, and why.
- 38 `JSON-LD description` Sudoku, free in your browser, from Easy to Expert. Every puzzle can be solved without guessing. A hint shows the next square you can fill, and why.

### src/app/bar/bar.component.html

- 76 `<button aria-label>` How to play
- 97 `<button aria-label>` Settings

### src/app/board/board.component.html

- 18 `<div aria-label>` Sudoku, 9 rows by 9 columns
- 40 `<div [aria-label]>` {{ cell.label }}

### src/app/pad/pad.component.html

- 12 `<div aria-label>` Digits
- 26 `<div aria-label>` Tools

### src/app/play/game.service.ts

- 190 `say()` Every blank square has notes already.
- 197 `move()` Notes filled in for {count(squares, "square", "squares")}.
- 219 `say()` Notes on.
- 219 `say()` Notes off.
- 241 `say()` No hint available.
- 364 `say()` Solved in {formatClock(seconds)}.

### src/rules/describe.ts

- 15 `"hidden-single":` Hidden single
- 16 `"naked-single":` Naked single
- 17 `pointing:` Pointing
- 18 `claiming:` Claiming
- 19 `"naked-pair":` Naked pair
- 20 `"hidden-pair":` Hidden pair
- 21 `"naked-triple":` Naked triple
- 22 `"hidden-triple":` Hidden triple
- 24 `swordfish:` Swordfish
- 60 `describeSquare() returns` Blank
- 67 `push()` repeats in {listed(units.map(unitName))}
- 81 `describeMove() returns` Solved.
- 87 `push()` {now.digit} repeats in {listed(units.map(unitName))}.
- 93 `push()` Every square is filled, but something is wrong.
- 97 `describeMove() returns` Erased.
- 102 `describeMove() returns` Note {firstDigit(removed)} removed.
- 103 `describeMove() returns` Erased.
- 116 `describeUndo() returns` Undone: {back.digit} back in {square}.
- 118 `describeUndo() returns` Undone: {taken.digit} taken out of {square}.
- 122 `describeUndo() returns` Undone: {notesWords(added)} taken out of {square}.
- 124 `describeUndo() returns` Undone: {notesWords(back.notes & ~taken.notes)} back in {square}.
- 136 `describeRefusal() returns` {square} is given.
- 139 `describeRefusal() returns` {square} already has a digit. Erase it to add notes.
- 141 `describeRefusal() returns` Nothing to erase.
