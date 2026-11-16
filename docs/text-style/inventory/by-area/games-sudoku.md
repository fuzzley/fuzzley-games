# Text inventory: games/sudoku

Written by `extract.mjs`; do not edit by hand. Each entry gives its line,
where it sits, and its text, with `{{ … }}` or `{…}` where a value is put
in, keys in square brackets and bold lead-ins in asterisks.

## How to play and rules

### src/app/help/help.component.html

- 2 `<p>` Fill every square so that each row, each column and each 3 × 3 box holds the digits 1 to 9 once. Every puzzle has one solution, which logic alone can find.
- 7 `<p>` **Notes.** Jot down the digits a square might hold, in Notes mode or with Shift, or Fill in notes, in the bar or its menu, for every digit each blank square could still hold. A digit you place comes out of the notes of the squares it sees, unless you turn that off in the settings.
- 13 `<p>` **Hints.** A hint points out a digit that doesn't belong, or notes that leave out the digit their square needs, or shows the next square logic can fill and why; press Hint again to fix or fill it in. A puzzle solved with a hint sets no best time.
- 19 `<p>` **Mistakes.** A digit that repeats in a row, column or box is always marked. Turn on "Mark mistakes" in the settings to mark a digit the solution doesn't hold as well.
- 29 `<th>` Mouse or touch
- 30 `<th>` Keyboard
- 35 `<th>` Select a square
- 36 `<td>` Click or tap it
- 37 `<td>` Arrows, [Home], [End]
- 40 `<th>` Place a digit
- 41 `<td>` The digit on the pad
- 42 `<td>` [1] to [9]
- 45 `<th>` Add or remove a note
- 46 `<td>` The digit in Notes mode
- 47 `<td>` [Shift] and the digit
- 50 `<th>` Notes mode
- 51 `<td>` Notes
- 55 `<th>` Erase
- 56 `<td>` Erase
- 57 `<td>` [Backspace], [Delete] or [0]
- 60 `<th>` Undo
- 61 `<td>` Undo
- 62 `<td>` [Ctrl] + [Z]
- 65 `<th>` Hint
- 66 `<td>` Hint, then Fill in or Take out
- 67 `<td>` [H], then [H] or [Enter]

## Descriptions: blurbs, taglines, page metadata and write-ups

### README.md

- 1 `heading` # Sudoku
- 6 `paragraph` An [Angular](https://angular.dev/) app on the Fuzzley Games shared libraries (`frontend/lib/`), built with [Vite](https://vite.dev/) and tested with [Vitest](https://vitest.dev/). Its puzzles come from a bank graded by the techniques a person needs to solve them, at four levels, and each is dealt through one of the grid's symmetries, so no two deals look alike. It plays by mouse, touch or keyboard, wears whichever palette the player chose on the site, and keeps a game in progress, its undo included, across a reload.

### index.html

- 14 `<meta description>` Play Sudoku free in your browser: Easy to Expert, with notes, undo, and hints that explain the next step. By mouse, touch or keyboard.
- 21 `<meta og:description>` Play Sudoku free in your browser: Easy to Expert, with notes, undo, and hints that explain the next step. By mouse, touch or keyboard.
- 38 `JSON-LD description` Play Sudoku free in your browser: Easy to Expert, with notes, undo, and hints that explain the next step. By mouse, touch or keyboard.
- 38 `JSON-LD genre` Puzzle, Logic game

## Picture text: alt text and captions

### index.html

- 33 `<meta og:image:alt>` A game of Sudoku in progress, givens and entries across the board and notes in some squares, beside the number pad.

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
- 28 `<p>` Marks a digit the solution doesn't hold, as a repeat is marked.
- 41 `<label>` Remove notes as digits go in
- 42 `<p>` A digit you place comes out of the notes of the squares it sees.

## Messages: notices, confirmations, explanations and errors

### src/app/hint/hint.component.html

- 15 `<p>` **{{ hint.title }}** {{ hint.conclusion }} Why?
- 45 `<span>` Why?

### src/app/play/game.service.ts

- 33 `title:` Start a new game?
- 34 `message:` The game in progress will be lost.
- 43 `title:` Start a new {LEVEL\_INFO[level].name} game?
- 49 `title:` Restart this puzzle?
- 50 `message:` Your digits and notes will be cleared, and the clock starts again.

### src/rules/describe.ts

- 151 `conclusion:` The {placement.digit} goes in {squareName(placement.index)}.
- 159 `text =` The {digit} at {squareName(index)} doesn't belong there.
- 160 `title:` A mistake
- 165 `text =` The notes at {squareName(index)} leave out the digit that belongs there.
- 166 `title:` A missing note
- 175 `placementWords() returns` That leaves the {digit} one place in {unitName(unit)}: {square}.
- 176 `placementWords() returns` In {unitName(unit)}, the {digit} can only go in {square}.
- 179 `placementWords() returns` That leaves {digit} as the only digit for {square}.
- 180 `placementWords() returns` Only {digit} can go in {square}.
- 192 `eliminationWords() returns` In {first}, the {digitList} can only go in {second}, so it can't go anywhere else in {second}.
- 195 `eliminationWords() returns` In {first}, {countWord(cells.length)} squares can only hold {digitList}, so no other square there can.
- 198 `eliminationWords() returns` In {first}, the {digitList} can only go in the same {countWord(cells.length)} squares, so those squares can hold nothing else.
- 203 `eliminationWords() returns` In {linesName(units.slice(0, half))}, the {digitList} can only go in {linesName(cover)}, so it can't go anywhere else in those {cover[0]?.kind ?? ""}s.
- 208 `eliminationWords() returns` The square at {squareName(pivot)} holds {x} or {y}. Either way, the square at {squareName(a)} or the one at {squareName(b)} holds {z}, so no square that sees both can.

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
- 74 `computed()` Solved before, so not counted again.
- 77 `computed()` Solved with {count(hints, "hint", "hints")}, so no best time.

## Spoken text: labels and announcements for screen readers

### README.md

- 3 `paragraph` Sudoku, with hints that name the next step of logic. Play it at https://fuzzley.games/play/sudoku/.

### index.html

- 58 `<noscript> <p>` Sudoku, free to play in your browser, with hints that explain the next step. Turn on JavaScript to play.

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
- 241 `say()` No hint: logic finds no next step here.
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
- 138 `describeRefusal() returns` {square} holds a {digit}, so it takes no notes.
- 139 `describeRefusal() returns` Nothing to erase.
