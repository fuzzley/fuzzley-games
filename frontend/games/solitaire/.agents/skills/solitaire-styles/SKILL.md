---
name: solitaire-styles
description: The Solitaire Collection's stylesheets — the line every component sheet opens with, its own tokens beside @fz/style's, its mixins, its breakpoints and shape mixins, its animations, and the contrast spec over the felt. Triggers on: solitaire styles, solitaire scss, _tokens.scss, _mixins.scss, _palette.scss, felt, phone-portrait, phone-landscape, compact, src/ui/app/styles.
---

# The Solitaire Collection's Styles

How the Solitaire Collection's stylesheets are written. The frontend's
Angular and Sass rules (`frontend/AGENTS.md`) apply, and the `fuzzley-ui`
skill says what the shared libraries hold.

## SCSS File Structure & Rules

### 1. Mandatory Component Import Header

Every component stylesheet (`.scss`) MUST begin with:

```scss
@use "../../styles" as *;
```

_(Adjust relative path depth to target `src/ui/app/styles`)._

### 2. Token-Driven Styling

- Colors, spacing, typography, radii, elevations and motion are `@fz/style`'s tokens, read by their own `--fz-*` names, which `styles/global.scss` loads first through `@fz/style/global`. The `fuzzley-ui` skill says which to reach for, and `frontend/lib/style/AGENTS.md` lists them all.
- The chrome wears the palette in use, light or dark, and what floats over the game is one of the library's surfaces: `--fz-panel-glass` is the drawer and the modals, `--fz-float` a card alone over the dimmed page (victory), and `--fz-well` a well cut into a panel (the search field, the segmented controls, victory's figures); the game bar wears `--fz-bar-glass` itself. What lies on the felt, such as the loading skeleton, is drawn in tints of `--fz-on-felt`, not of the chrome's text.
- `styles/_tokens.scss` holds only this game's own tokens: the translucent mixes of the roles it needs (`--surface-card`, a bordered block in a panel, and `--surface-scrim-heavy`, the loading badges, and the tints `--accent-wash-faint`, `--accent-wash-strong`, `--danger-border`, `--warning-glow`), declared on `:root, [data-theme]` as the library's tints are; `--table-felt`, on `:root` alone since the shell sets the felt there, and the loading scrim over it; the card artwork's colors, cut from `styles/_palette.scss`; the game browser's sizes; the z-index ladder; and the game bar's size, `--fz-bar-height` and `--fz-rail-width`, from `@fz/game-ui`'s `bar-size()`. A token goes there only when no `--fz-*` one will do.
- Component styles MUST read tokens via `var(--...)`. A label on an accent, warning or danger fill takes the palette's label for it (`--fz-on-accent`, `--fz-on-warning`, `--fz-on-danger`).
- **Never hardcode hex colors, pixel font sizes, or raw pixel spacing literals in component CSS.** `yarn lint:styles` runs stylelint with `@fz/style`'s preset (`stylelint.config.js`), which fails a hex, named or functional color anywhere but `_palette.scss`.
- **Glass over the felt is checked.** The header's labels sit on the palette's `--fz-bar-glass` over whichever felt is on the table; `test/ui/app/styles/contrast.spec.ts` compiles the stylesheet and holds them to 4.5:1 in every palette, over its own felt and every felt a player can choose.

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

Use predefined breakpoint mixins. Never hardcode raw pixel widths in media queries.
`tablet`, `desktop` and the shape mixins below are `@fz/game-ui`'s, the widths
every game changes shape at; `phone` is this game's own, in
`styles/_breakpoints.scss`:

```scss
@include below("phone"); // Phone screens
@include below("tablet"); // Tablet screens
@include below("desktop"); // Desktop screens
```

Anything that follows the compact chrome (and the compact board) uses the
shape mixins instead, which also catch a phone on its side, wider than
`tablet` but shorter than 500 px:

```scss
@include compact; // Narrower than tablet, or shorter than 500 px
@include phone-portrait; // Compact and taller than wide: the header is a bottom bar
@include phone-landscape; // Compact and wider than tall: the header is a side rail
```

They match `GameViewportService.formFactor` (`@fz/game-ui/viewport`) in the
shell and `formFactorOf` in `src/engine/render/layout/form_factor.ts`, which
reads the same widths from `@fz/game-ui/breakpoints`, so the chrome and the
board change together.

### 5. Animations

`@keyframes` that several components use live in `styles/_animations.scss`, named in kebab-case (`pop-in`), which stylelint enforces.
