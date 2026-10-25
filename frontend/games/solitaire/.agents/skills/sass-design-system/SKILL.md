---
name: sass-design-system
description: SCSS design system guidelines, custom property token usage, mixins, keyframe animations, native dialog modal overlays, and responsive design for the Solitaire Collection.
---

# Sass Design System Skill

This skill defines the styling guidelines and design system architecture for the Solitaire Collection using SCSS and CSS Custom Properties.

## SCSS File Structure & Rules

### 1. Mandatory Component Import Header

Every component stylesheet (`.scss`) MUST begin with:

```scss
@use "../../styles" as *;
```

_(Adjust relative path depth to target `src/ui/app/styles`)._

### 2. Token-Driven Styling

- Colors, spacing, typography, radii, elevations and motion are `@fz/style`'s tokens, read by their own `--fz-*` names: the tokens, reset, document styles and focus ring the site and the other games share, which `styles/global.scss` loads first through `@fz/style/global`. The library's rules, and the list of its tokens, are in `frontend/lib/style/AGENTS.md`.
- The colors are roles of the palette in use (`--fz-text`, `--fz-muted`, `--fz-accent`, `--fz-panel-raised`) and the tints worked out from them (`--fz-wash-1` to `-4` for fills, `--fz-edge-1` to `-4` for translucent borders, `--fz-accent-wash`, `--fz-accent-glow`, `--fz-danger-wash`). The chrome wears the palette in use or, for a light one, its dark partner (`darkTheme()`), on `app-root`; only the felt is the light palette's own.
- The scales are `--fz-space-*`, `--fz-font-*` (and `--fz-font`, Figtree, and `--fz-font-mono`), `--fz-leading-*`, `--fz-radius-*`, `--fz-shadow-*`, `--fz-ease-*`, `--fz-duration-*` and `--fz-tap-target`.
- `styles/_tokens.scss` holds only this game's own tokens: the translucent mixes of the roles its panels need (`--surface-panel`, `--surface-modal`, `--surface-card`, `--surface-sunken`, `--surface-scrim-heavy`, and the tints `--accent-wash-faint`, `--accent-wash-strong`, `--danger-border`, `--warning-glow`), declared on `:root, [data-theme]` so the chrome's own palette reaches them; `--table-felt`, on `:root` alone since the shell sets the felt there, and the loading scrim over it; the card artwork's colors, cut from `styles/_palette.scss`; the game browser's sizes; the z-index ladder; and the game bar's size, `--fz-bar-height` and `--fz-rail-width`, from `@fz/game-ui`'s `bar-size()`. A token goes there only when no `--fz-*` one will do.
- Component styles MUST read tokens via `var(--...)`. A label on an accent, warning or danger fill takes the palette's label for it (`--fz-on-accent`, `--fz-on-warning`, `--fz-on-danger`).
- **Never hardcode hex colors, pixel font sizes, or raw pixel spacing literals in component CSS.** `yarn lint:styles` runs stylelint with `@fz/style`'s preset (`stylelint.config.js`), which fails a hex, named or functional color anywhere but `_palette.scss`.
- **Glass over the felt is checked.** The header's labels sit on `@fz/game-ui`'s glass (its `$bar-glass`) over whichever felt is on the table; `test/ui/app/styles/contrast.spec.ts` compiles the stylesheet and holds them to 4.5:1 over every palette's felt and every felt a player can choose.

```scss
// Good
.card-counter {
  color: var(--fz-muted);
  padding: var(--fz-space-2);
}

// Bad
.card-counter {
  color: #888888;
  padding: 8px;
}
```

### 3. Mixins & Utility Patterns

Repeated UI patterns are mixins. Every component reaches them through `@use "../../styles" as *;`, which forwards both kinds:

- From `@fz/style`'s toolkit (`frontend/lib/style/src/toolkit/`), shared with the site and the other games:
  - `glass()` — Backdrop blur for chrome floating over the board.
  - `icon-button()` — A borderless icon button with a touch target and a hover state.
  - `transition()` — Transitions at the shared duration and easing.
  - `tap-target()` and `flex-center()`.
  - `visually-hidden()` — Screen reader accessible off-screen text.
- From `styles/_mixins.scss`, this game's own: `field-label()`, `swatch-option()`, `spinner-ring()` and `panel-card()`. One moves to the toolkit when a second app needs it.

### 4. Named Responsive Breakpoints

Use predefined breakpoint mixins. Never hardcode raw pixel widths in media queries:

```scss
@include below("phone"); // Phone screens
@include below("tablet"); // Tablet screens
@include below("desktop"); // Desktop screens
```

Anything that follows the compact chrome (and the compact board) uses the
shape mixins instead, which also catch a phone on its side, wider than
`tablet` but shorter than `$compact-max-height`:

```scss
@include compact; // Narrower than tablet, or shorter than $compact-max-height
@include phone-portrait; // Compact and taller than wide: the header is a bottom bar
@include phone-landscape; // Compact and wider than tall: the header is a side rail
```

They match `ViewportService.formFactor` in the shell and `formFactorOf` in
`src/engine/render/layout/form_factor.ts`, so the chrome and the board change
together.

### 5. Animations

- `@keyframes` that several components use live in `styles/_animations.scss`, named in kebab-case (`pop-in`), which stylelint enforces.
- Angular renames a component's own `@keyframes`, and the animations that use them, after the component, so a keyframe used by one component alone may sit in its stylesheet, as the libraries' components keep theirs.

### 6. Modal Overlays

- All overlays MUST use native HTML `<dialog>` elements wrapped in `<fz-dialog>`, from `@fz/ui/dialog`.
- Do not hand-roll focus traps, escape key listeners, or custom overlay z-index layers.
