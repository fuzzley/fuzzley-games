---
name: web-game-accessibility
description: The accessibility rules the site and the games keep, and the library piece that meets each — ARIA state, live-region announcements, focus and dialogs, a board played by keyboard, pause and reduced motion, and WCAG contrast in every palette. Triggers on: accessibility, a11y, aria, screen reader, announce, fz-announcer, focus, keyboard, role application, fzPlayRoom, contrast.
---

# Web Game Accessibility (a11y) Skill

The accessibility rules the site and the games share. The shared libraries'
components meet them by themselves, so the first way to meet one is to use
the library's piece (the `fuzzley-ui` skill lists them). A workspace's
`AGENTS.md` adds a rule that is its own, as `frontend/games/sudoku/AGENTS.md`
does for its one-key shortcuts.

## Core Accessibility Rules

### 1. Visible State is Announced State

A control that shows a state says it in ARIA too:

- **A radio, or a choice among several:** `aria-checked`.
- **Where the player is,** such as the page in the site's header or the
  level in play: `aria-current`.
- **A button that stays on,** such as Flag mode or Sound: `aria-pressed`.
- **A control dimmed for now:** `aria-disabled="true"` rather than
  `disabled`, so it is still found and read and the focus never falls off
  it. The attribute stops no press: its handler ignores one while it is
  dimmed.

Style the state from the same attribute (`.flag-mode[aria-pressed="true"]`)
rather than from a separate class, so the look and the announcement cannot
disagree. Minesweeper's Flag mode shows both
(`frontend/games/minesweeper/src/app/bar/bar.component.html` and the
stylesheet beside it).

### 2. Screen Reader Announcements

- **A change the page makes without a navigation is announced,** such as a
  search narrowing a list, a card reaching a foundation, or a game won or
  dealt again. In an Angular app the live region is `<fz-announcer>`
  (`@fz/ui/announcer`), once in the root template, and
  `AnnouncerService.say()` sets what it says, so that the same words said
  twice are read twice.
- **The region is in the page before its words change:** a screen reader
  announces changes to a live region, not one that arrives with its text
  already in it. Render it unconditionally and change only what it says,
  and put every outcome in it, the empty one ("No games match.") included.
- **A modal dialog that speaks while open holds an `<fz-announcer>` of its
  own,** since the page behind a modal is hidden from a screen reader.
- **A line on the page that says how something stands is `role="status"`,**
  and `role="alert"`, which interrupts, only for what the player must hear
  at once, such as an error.
- **Words only a screen reader reads** take `@fz/style`'s
  `.fz-visually-hidden` class or its `visually-hidden` mixin.

### 3. Focus Management & Modals

- **A modal is `<fz-dialog>` (`@fz/ui/dialog`),** a native `<dialog>` opened
  with `showModal()`, which makes the rest of the page inert, closes on
  Escape and returns the focus when it closes. `ConfirmService`
  (`@fz/ui/confirm`) asks a question in one, with Cancel focused first.
- **A menu, picker or chooser keeps a logical tab order, moves with the
  arrow keys and Enter, and hands the focus back to the control that opened
  it when it closes.** These come built, so use them rather than another:
  - `[fzRadioGroup]` (`@fz/ui/radio_group`) gives a group of `role="radio"`
    buttons one tab stop, the arrow keys, Home and End; `<fz-choice-list>`
    offers a setting's choices as one; and native radios serve where
    choosing costs nothing, as in `<fz-theme-picker>`;
  - `<fz-theme-menu>` (`@fz/ui/theme`) and `<fz-bar-overflow>`
    (`@fz/game-ui/bar_overflow`) are menus on Angular Aria, with its
    keyboard model, so a new menu is built on it too.

### 4. A Board Played by Keyboard

A board of squares is a grid, as Minesweeper's is
(`frontend/games/minesweeper/src/app/board/`): Angular Aria's `ngGrid`,
`ngGridRow` and `ngGridCell`, which give the whole board one tab stop and
move it with the arrow keys, Home and End.

- **Every action a pointer has gets a key on the square in focus:** Enter or
  Space for the click, a letter for the right-click (F flags).
- **Each square's accessible name says what it shows** ("Hidden", "Flagged",
  "3"), so moving across the board reads it.
- **What a move did is announced** ("Opened 12 squares.", "Boom. 2 lives
  left."), since most of it happens away from the square in focus.
- **When a dialog over the board deals a new game, the focus goes back to
  the board's tab stop,** not to the body.
- **A board that takes digits reads them by the key's code (`event.code`),**
  so an AZERTY keyboard's top row types them without Shift, and letters by
  their character, as Sudoku's does
  (`frontend/games/sudoku/src/app/board/board_keys.ts`). Its number pad
  gives touch every key: a key pressed with a finger or a mouse hands the
  focus back to the board, so the player goes on typing, and one pressed
  from the keyboard keeps it.

A board of squares drawn on a canvas, as Fuzz Flux's is
(`frontend/games/fuzz-flux/src/app/board/`), lays a grid of ARIA's own roles
over the canvas, a cell over each square, which lets every press through.
Angular Aria's grid won't do there: it takes the arrow keys to move the
focus itself, and stops them there, cancelled, so the scene, which hears the
keys around the board, never would.

A board that moves by itself, as Snake's, Brick Breaker's, Asteroid
Breaker's, Brick Fuzz Pop's and Rickashay's do
(`frontend/games/snake/src/app/board/` is the smallest), is no grid. It is
one focusable element with `role="application"`, named for the game, and
for the level or wave on it where it has them, and described by its keys
(`aria-describedby`), so a screen reader hands it the arrow keys. The
canvas in it is hidden, and the panels and cards beside it read as a page
is.

- **It waits for the player.** Nothing moves until the player's first move,
  and the run pauses whenever the focus leaves the board, the page is
  hidden or the screen turns, so opening a dialog, switching tabs or
  turning the phone never costs a run: `@fz/game-ui/play_room`'s
  `[fzPlayRoom]` says when.
- **Pause has keys of its own and a button:** Escape and P, from `RUN_KEYS`
  in `frontend/lib/core/src/run.ts`, and the bar's `button[fzBarPause]`.
- **Its pace is the player's to choose:** a setting offers its speeds, a
  slow one among them. Or nothing in play is timed, as in Brick Fuzz Pop,
  where a flight can be sped up and only Drop waits on time, and in
  Rickashay, where a flight can be sped up or skipped.
- **The run's turning points are announced, not each move:** the start, a
  pause, going on, and the end with the score; a run taken up after a
  reload says it is paused.
- **Controls that steer it with a finger or a mouse keep the focus on the
  board** (on-screen arrows, Pause, Sound), so the keys keep working.
- **Its effects follow `prefers-reduced-motion`** (`GameViewportService`'s
  `allowsMotion`): no shake, no crumbs, and the result shown at once.

### 5. Color & Contrast

- **Never carry meaning by color alone.** Pair it with a symbol, a label or
  a shape, so colorblind players can tell states apart, as card suits are
  told apart by their symbols, not only by red and black.
- **Text and symbols keep WCAG AA contrast (4.5:1) with what they sit on,
  in every palette and table color,** not just the default one. The shared
  palettes are held to it by
  `frontend/lib/style/src/tokens/contrast.spec.ts`, with the focus ring at
  3:1; a new role that carries text or sits behind it gets a pair there. A
  game's own colors join its `contrast.spec.ts`, as
  `frontend/games/AGENTS.md` says. Text on glass over a game's table depends
  on the table too, as the Solitaire Collection's header labels are held
  over every felt by
  `frontend/games/solitaire/test/ui/app/styles/contrast.spec.ts`.
- **A contrast check measures with `@fz/style/testing`'s `paint()` and
  `contrast()`,** never with math of its own.
