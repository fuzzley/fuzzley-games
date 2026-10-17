---
name: web-game-accessibility
description: Accessibility (a11y) guidelines for the web games site, ARIA state binding, keyboard navigation, focus management, screen reader announcements, and WCAG contrast across themes.
---

# Web Game Accessibility (a11y) Skill

This skill defines accessibility best practices for the site's Angular UI.

## Core Accessibility Rules

### 1. Visible State is Announced State

Any control that displays a visual state MUST reflect that state in ARIA attributes for assistive technologies:

- **Toggle / Radio Selection**: `aria-checked="true|false"`
- **Active Navigation Item**: `aria-current="page|true"`
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

- A change the page makes without a navigation, such as a search narrowing the
  list or a game reporting its status, is announced through an
  `aria-live="polite"` region, or `role="status"`, which is one
  (`aria-live="assertive"` only for something that must interrupt).
- The region has to be in the page before its text changes: screen readers
  announce changes to a live region, not one that arrives with its text
  already in it. Render it unconditionally and change only what it says, as
  the home page's search status does, and put every outcome in it, the
  empty one ("No games match.") included.
- Give icon-only buttons a screen-reader-only label with the global
  `.visually-hidden` class in `frontend/src/app/styles/_shared.scss`, or,
  to hide it only at some widths, the `visually-hidden` mixin in
  `frontend/src/app/styles/_a11y.scss`.

### 3. Focus Management & Modals

- Build modal overlays on a native `<dialog>` opened with `showModal()`, which
  makes the rest of the page inert, closes on `Escape` and returns focus when
  it closes. Do not hand-roll a focus trap, an Escape handler or a z-index.
- Menus and pickers keep a logical tab order, support arrow key / Enter
  navigation, and hand focus back to the control that opened them when they
  close. Build them on Angular Aria (`@angular/aria`) rather than by hand:
  the theme menu (`frontend/src/app/component/theme_menu/`) is an
  `ngMenuTrigger` button opening an `ngMenu` of `menuitemradio` items. Bind
  `aria-checked` yourself (Angular Aria sets the role, not the checked
  state), and give each item a `searchTerm`, or typing a name finds
  nothing.

### 4. High-Contrast & Theme Support

- Never carry meaning by color alone; pair it with a symbol, a label or a
  shape, so colorblind players can tell states (or card suits) apart.
- Maintain a minimum WCAG AA contrast ratio (4.5:1) between text/symbols and
  surface backgrounds in every palette, not just the default one.
