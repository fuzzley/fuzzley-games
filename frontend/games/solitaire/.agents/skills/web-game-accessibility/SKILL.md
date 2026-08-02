---
name: web-game-accessibility
description: Accessibility (a11y) guidelines for web solitaire games, ARIA state binding, keyboard navigation, focus management, screen reader notifications, and WCAG contrast.
---

# Web Game Accessibility (a11y) Skill

This skill defines accessibility best practices for fSolitaire's Angular UI shell and Phaser canvas renderer.

## Core Accessibility Rules

### 1. Visible State is Announced State
Any control or interactive card element that displays a visual state MUST reflect that state in ARIA attributes for assistive technologies:
- **Toggle / Radio Selection**: `aria-checked="true|false"`
- **Active Navigation / Game Variant**: `aria-current="page|true"`
- **Pressed Action Button**: `aria-pressed="true|false"`
- **Disabled State**: `aria-disabled="true"`

```html
<button
  type="button"
  class="option-btn"
  [attr.aria-pressed]="isSelected()"
  (click)="selectOption()">
  {{ label }}
</button>
```

### 2. Screen Reader Announcements for Solitaire Actions
- Game status changes (e.g. card moved to foundation, stock deal, game won, game reset) should trigger live region announcements using `aria-live="polite"` or `aria-live="assertive"`.
- Use the `@include visually-hidden();` mixin for screen-reader-only context labels on icon buttons.

### 3. Focus Management & Modals
- Modal dialogs MUST use `<app-modal-dialog>` wrapping native HTML `<dialog>` elements to automatically manage focus trapping, restore focus on close, and handle the `Escape` key.
- Custom canvas card pickers and selection menus must maintain a logical tab order and support arrow key / Enter key navigation.

### 4. High-Contrast & Theme Support
- Card suits (Red vs Black) must be visually distinguishable by rank symbols and suit iconography, not solely by color, to support colorblind players.
- Maintain a minimum WCAG AA contrast ratio (4.5:1) between text/symbols and surface backgrounds across all active color themes.
