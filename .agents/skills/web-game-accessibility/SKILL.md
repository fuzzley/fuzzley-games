---
name: web-game-accessibility
description: Accessibility (a11y) rules for the site and the games, ARIA state binding, keyboard navigation, focus management, screen reader announcements, and WCAG contrast across themes and table colors. Triggers on: accessibility, a11y, aria, screen reader, focus, keyboard, contrast, dialog.
---

# Web Game Accessibility (a11y) Skill

This skill defines the accessibility rules the site and the games built here
share. The shared libraries' components meet them by themselves, so the
first way to meet one is to use the library's piece (the `fuzzley-ui` skill
lists them); each workspace's `AGENTS.md` names what it keeps of its own:
`frontend/site/AGENTS.md` and `frontend/games/solitaire/AGENTS.md`.

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

### 4. Color & Contrast

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
  `frontend/games/solitaire/test/ui/app/styles/contrast.spec.ts`.
