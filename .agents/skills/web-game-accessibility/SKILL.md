---
name: web-game-accessibility
description: Accessibility (a11y) rules for the site and the games, ARIA state binding, keyboard navigation, focus management, screen reader announcements, and WCAG contrast across themes and table colors. Triggers on: accessibility, a11y, aria, screen reader, focus, keyboard, contrast, dialog.
---

# Web Game Accessibility (a11y) Skill

This skill defines the accessibility rules the site and the games built here
share. The shared libraries' components meet them by themselves, so the
first way to meet one is to use the library's piece (the `fuzzley-ui` skill
lists them); each workspace's `AGENTS.md` names what it keeps of its own:
`frontend/site/AGENTS.md`, `frontend/games/solitaire/AGENTS.md`,
`frontend/games/minesweeper/AGENTS.md`, `frontend/games/sudoku/AGENTS.md`,
`frontend/games/snake/AGENTS.md` and `frontend/games/brick-breaker/AGENTS.md`.

## Core Accessibility Rules

### 1. Visible State is Announced State

Any control that displays a visual state MUST reflect that state in ARIA attributes for assistive technologies:

- **Toggle / Radio Selection**: `aria-checked="true|false"`
- **Active Navigation Item / Game Variant**: `aria-current="page|true"`
- **Pressed Action Button**: `aria-pressed="true|false"`
- **Disabled State**: `aria-disabled="true"`

```html
<button
  type="button"
  class="option-btn"
  [attr.aria-pressed]="isSelected()"
  (click)="selectOption()"
>
  {{ label }}
</button>
```

Style the state from the same attribute (`.option[aria-pressed="true"]`) rather
than from a separate class, so the look and the announcement cannot disagree.

### 2. Screen Reader Announcements

- A change the page makes without a navigation, such as a search narrowing a
  list, a card reaching a foundation, or a game won or dealt again, is
  announced through an `aria-live="polite"` region, or `role="status"`,
  which is one (`aria-live="assertive"` only for something that must
  interrupt).
- The region has to be in the page before its text changes: screen readers
  announce changes to a live region, not one that arrives with its text
  already in it. Render it unconditionally and change only what it says, and
  put every outcome in it, the empty one ("No games match.") included.
- In an Angular app that region is `<fz-announcer>` (`@fz/ui/announcer`),
  once in the root template, and `AnnouncerService.say()` sets what it
  says, so that the same words said twice are read twice. A modal dialog
  that speaks while open holds one of its own, since the page behind a
  modal is hidden from a screen reader.
- Give icon-only buttons a label only screen readers read, with
  `@fz/style`'s `.fz-visually-hidden` class or its `visually-hidden` mixin.

### 3. Focus Management & Modals

- Build modal overlays on a native `<dialog>` opened with `showModal()`, which
  makes the rest of the page inert, closes on `Escape` and returns focus when
  it closes. Do not hand-roll a focus trap, an Escape handler or a z-index.
- Menus, pickers and choosers keep a logical tab order, support arrow key /
  Enter navigation, and hand focus back to the control that opened them when
  they close.
- In an Angular app these come built, so use them rather than another:
  - `<fz-dialog>` (`@fz/ui/dialog`) is the modal `<dialog>`, and
    `ConfirmService` (`@fz/ui/confirm`) asks a question in one, with Cancel
    focused first;
  - `[fzRadioGroup]` (`@fz/ui/radio_group`) gives a group of `role="radio"`
    buttons one tab stop, the arrow keys, Home and End, and native radios
    serve where choosing costs nothing, as in `<fz-theme-picker>`;
  - `<fz-theme-menu>` (`@fz/ui/theme`) and `<fz-bar-overflow>`
    (`@fz/game-ui/bar_overflow`) are menus on Angular Aria, with its
    keyboard model, so a new menu is built on it too.

### 4. A Board Played by Keyboard

A board of squares is a grid, as Minesweeper's is
(`frontend/games/minesweeper/src/app/board/`): Angular Aria's `ngGrid`,
`ngGridRow` and `ngGridCell`, which give the whole board one tab stop and
move it with the arrow keys, Home and End.

- Every action a pointer has gets a key on the square in focus: Enter or
  Space for the click, a letter for the right-click (F flags).
- Each square's accessible name says what it shows ("Hidden", "Flagged",
  "3"), so moving across the board reads it.
- What a move did is announced through the page's live region ("Revealed
  12 squares.", "Mine. 2 lives left."), since most of it happens away from
  the square in focus.
- When a dialog over the board deals a new game, focus goes back to the
  board's tab stop rather than to the body.
- A board that takes digits, as Sudoku's does
  (`frontend/games/sudoku/src/app/board/`), reads them by the key's code
  (`event.code`), so an AZERTY keyboard's top row types them without Shift,
  and letters by their character. Its number pad gives touch every key: a
  key pressed with a finger or a mouse hands the focus back to the board,
  so the player goes on typing, and one pressed from the keyboard keeps it.

A board that moves by itself, as Snake's and Brick Breaker's do
(`frontend/games/snake/src/app/board/`,
`frontend/games/brick-breaker/src/app/board/`), is no grid: it is one
focusable element with `role="application"`, named for the game and
described by its keys, so a screen reader hands it the arrow keys; the
canvas in it is hidden.

- It waits for the player: nothing moves until the first key, and it
  pauses whenever the focus leaves the board and its arrows, the page is
  hidden or the screen turns, so opening a dialog, switching tabs or
  turning the phone never costs a run: `@fz/game-ui/play_room`'s
  `[fzPlayRoom]` says when. Pause has a key of
  its own (Space, P or Escape) and a button.
- Its pace is the player's to choose: Snake offers three speeds, and a
  snake that steps from square to square rather than gliding; Brick
  Breaker three speeds, the slowest of which lets no capsule fall that
  makes the game harder.
- The run's turning points are announced, not each move: the start, a
  pause, going on, and the end with the score; a run taken up after a
  reload says it is paused.
- Controls that steer it with a finger or a mouse (on-screen arrows, Pause,
  Sound) keep the focus on the board, so the keys keep working.
- Its effects follow `prefers-reduced-motion` (`GameViewportService`'s
  `allowsMotion`): no shake, no crumbs, and the result shown at once.

### 5. Color & Contrast

- Never carry meaning by color alone; pair it with a symbol, a label or a
  shape, so colorblind players can tell states apart. Card suits are told
  apart by their symbols, not only by red and black.
- Maintain a minimum WCAG AA contrast ratio (4.5:1) between text/symbols and
  surface backgrounds in every palette and table color, not just the default
  one. The shared palettes are held to it by
  `frontend/lib/style/src/tokens/contrast.spec.ts`, which checks each
  palette's text and labels on their surfaces and fills, the surfaces that
  float over a game over what shows through them, and the focus ring at
  3:1; a new role that carries text or sits behind it gets a pair there.
  Text on glass over a game's table depends on the table too: the Solitaire
  Collection's header labels are held to it over every felt by
  `frontend/games/solitaire/test/ui/app/styles/contrast.spec.ts`. Each of
  these measures with `@fz/style/testing`'s `paint()` and `contrast()`, and
  a new check does too, rather than with math of its own.
