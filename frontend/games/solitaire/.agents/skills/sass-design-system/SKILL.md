---
name: sass-design-system
description: SCSS design system guidelines, custom property token usage, mixins, keyframe animations, native dialog modal overlays, and responsive design for fSolitaire.
---

# Sass Design System Skill

This skill defines the styling guidelines and design system architecture for fSolitaire using SCSS and CSS Custom Properties.

## SCSS File Structure & Rules

### 1. Mandatory Component Import Header

Every component stylesheet (`.scss`) MUST begin with:

```scss
@use "../../styles" as *;
```

_(Adjust relative path depth to target `src/ui/app/styles`)._

### 2. Token-Driven Styling

- All colors, surfaces, spacing, typography, radii, elevations, motion, layouts, and z-indices are defined as CSS Custom Properties in `:root` inside `styles/_tokens.scss`.
- Component styles MUST read tokens via `var(--...)`.
- **Never hardcode hex colors, pixel font sizes, or raw pixel spacing literals in component CSS.**

```scss
// Good
.card-counter {
  color: var(--color-text-muted);
  padding: var(--spacing-sm);
}

// Bad
.card-counter {
  color: #888888;
  padding: 8px;
}
```

### 3. Mixins & Utility Patterns

Repeated UI patterns are defined as mixins in `styles/_mixins.scss`:

- `glass()` — Glassmorphism container background & backdrop blur.
- `gradient-text()` — Gradient text fill.
- `icon-button()` — Accessible button touch targets and hover states.
- `transition()` — Standardized motion transitions.
- `visually-hidden()` — Screen reader accessible off-screen text.

### 4. Named Responsive Breakpoints

Use predefined breakpoint mixins. Never hardcode raw pixel widths in media queries:

```scss
@include below("phone"); // Phone screens
@include below("tablet"); // Tablet screens
@include below("desktop"); // Desktop screens
```

### 5. Global Animations

- All `@keyframes` declarations live in `styles/_animations.scss`.
- Never define `@keyframes` inside component stylesheets, as Angular's emulated view encapsulation rewrites component selectors but leaves global animation names un-scoped.

### 6. Modal Overlays

- All overlays MUST use native HTML `<dialog>` elements wrapped in `<app-modal-dialog>`.
- Do not hand-roll focus traps, escape key listeners, or custom overlay z-index layers.
