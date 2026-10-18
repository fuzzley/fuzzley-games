---
name: web-game-accessibility
description: Accessibility (a11y) rules for the site and the games, ARIA state binding, keyboard navigation, focus management, screen reader announcements, and WCAG contrast across themes and table colors. Triggers on: accessibility, a11y, aria, screen reader, focus, keyboard, contrast, dialog.
---

# Web Game Accessibility (a11y) Skill

This skill defines the accessibility rules the site and the games built here
share. Each workspace's `AGENTS.md` names the helpers it keeps for them:
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
- Give icon-only buttons a label only screen readers read, with the
  workspace's visually-hidden helper.

### 3. Focus Management & Modals

- Build modal overlays on a native `<dialog>` opened with `showModal()`, which
  makes the rest of the page inert, closes on `Escape` and returns focus when
  it closes. Do not hand-roll a focus trap, an Escape handler or a z-index.
- Menus, pickers and choosers keep a logical tab order, support arrow key /
  Enter navigation, and hand focus back to the control that opened them when
  they close.

### 4. Color & Contrast

- Never carry meaning by color alone; pair it with a symbol, a label or a
  shape, so colorblind players can tell states apart. Card suits are told
  apart by their symbols, not only by red and black.
- Maintain a minimum WCAG AA contrast ratio (4.5:1) between text/symbols and
  surface backgrounds in every palette and table color, not just the default
  one.
