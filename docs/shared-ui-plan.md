# Plan: one design system for the site and the Solitaire Collection

Agreed 2026-10-24. This plan moves the Solitaire Collection onto shared
libraries, starting with `lib/style` and `lib/ui`, which the site moves onto
first. Minesweeper follows in a plan of its own once these exist. Progress, and
what was found on the way, is kept in [the work log](shared-ui-worklog.md).

## Where things start

The Solitaire Collection's shell is already Angular: Angular 22.2, standalone
components, signals and zoneless change detection, on the same version ranges
as the site. There is nothing to convert. The work is moving that shell onto
libraries the site shares. Phaser keeps drawing the card table, under the
Angular chrome, as it does now; replacing it is not part of this plan.

What differs between the two today:

| Concern     | Site (`frontend/site`)                                                                                                 | Solitaire (`frontend/games/solitaire`)                                                                                        |
| ----------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Colors      | 4 palettes, 18 roles each, as `[data-theme]` custom properties (`_palettes.scss`); the choice saved as `fuzzley-theme` | One fixed dark scheme: about 60 color tokens cut from Tailwind's slate, blue, red and amber (`_palette.scss`, `_tokens.scss`) |
| Scales      | Almost none: `--radius`, `--gutter`, `--page-width`                                                                    | Full: space, type, leading, radius, shadow, motion, focus, tap target, layout, z-index                                        |
| Font        | Figtree from Google Fonts                                                                                              | System font stack, on purpose, to save a download                                                                             |
| Table       | `felt`, `on-felt`, `card-back` roles, used in thumbnails                                                               | Phaser paints the felt from `TABLE_THEMES` (4 felts the player picks); card backs are pre-drawn images                        |
| Icons       | `<app-icon>`, 5 outline icons                                                                                          | Inline Material SVGs, pasted into each template                                                                               |
| Buttons     | `.button`: flat accent pill                                                                                            | `.btn`, `.btn-primary`…: gradients with colored shadows                                                                       |
| Overlays    | None yet                                                                                                               | `<app-modal-dialog>` over native `<dialog>`, a confirmation service, a settings drawer                                        |
| Menus       | Angular Aria (`@angular/aria`) theme menu                                                                              | A hand-built disclosure for the header's overflow                                                                             |
| Breakpoints | `sm`/`md`/`lg`/`xl` in rem                                                                                             | `phone`/`tablet`/`desktop` in px, plus compact-height rules that mirror the engine's `form_factor.ts`                         |
| Style lint  | stylelint: no color outside the palettes                                                                               | None (only a convention in its skill)                                                                                         |
| Specs       | Vitest, jsdom, Testing Library                                                                                         | Vitest, Analog's `setupTestBed`, its own helpers in `test/support/`                                                           |
| TS flags    | `noPropertyAccessFromIndexSignature`, `noImplicitReturns`, `isolatedModules`                                           | `noUnusedLocals`, `noUnusedParameters`, `strictStandalone`, `rootDir: ./src`                                                  |

Every page is served from one origin, so Solitaire can already read
`fuzzley-theme`.

## The styling framework: our own, in two libraries

**Decision: a hand-rolled design system** of tokens, a Sass toolkit, global
fragment classes and Angular components, with behavior from native elements
(`<dialog>`) and Angular Aria. Both codebases already work this way (Sass
modules emitting custom properties, mixins, token-only component styles), so
the migration consolidates what exists rather than rewriting it.

The alternatives, briefly:

- **Tailwind** would mean rewriting every template and the 3,800 lines of
  Solitaire's component styles into utility classes. It brings no components or
  behavior, and runtime palettes would still need the same custom-property
  layer we already have.
- **Angular Material** imposes Material Design's look, which conflicts with the
  plain design the site settled on, and its theming is heavier than our palette
  model.
- **PrimeNG, Spartan and similar kits** add a large dependency and a look of
  their own, for components we mostly already have.
- **Angular Aria and the CDK** stay, as the headless behavior under our own
  components, as the site's theme menu already uses them.

### The layers

1. **Tokens.** CSS custom properties: palette roles (per theme), derived roles
   (computed from palette roles with `color-mix()`), and scales (the same in
   every theme).
2. **Toolkit.** Sass mixins and functions that emit nothing until used:
   `visually-hidden`, `transition`, `glass`, `tap-target`, `flex-center`.
3. **Base.** The reset, element defaults, focus ring, reduced-motion rule, the
   font, and shared `@keyframes`. Emitted once per app.
4. **Fragments.** Global classes for markup patterns that need no behavior:
   `.fz-button` and its variants, `.fz-badge`, `.fz-visually-hidden`. They are
   plain CSS, so a page without Angular (Minesweeper, later) can use them too.
5. **Components.** Angular components and services where there is behavior:
   dialog, confirmation, radio group, menu, theme menu and picker, icon,
   wordmark, game bar.

Layers 1 to 4 have no framework and live in **`lib/style`**. Layer 5 lives in
**`lib/ui`**, which depends on `lib/style` and on Angular as peers. Keeping
them apart means a game without Angular can take the styles without pulling in
Angular's peer dependencies.

### One namespace: `fz`

Everything the libraries define carries `fz`:

- custom properties: `--fz-accent`, `--fz-space-2`;
- classes: `.fz-button`;
- component selectors: `<fz-dialog>`, `<fz-game-bar>`;
- directive selectors: `[fzRadioGroup]`.

The apps keep `app-` and unprefixed custom properties for their own. The prefix
matters most during migration: Solitaire already declares `--accent`, `--text-muted`
and others, and an unprefixed library would collide with them silently, last
declared wins. With the prefix, Solitaire can alias its old names to the
library's (`--accent: var(--fz-accent)`) and retire them one at a time.

## The token vocabulary

### Palette roles (hand-picked in each palette)

The site's roles carry over, with `search*` generalised to `field*` and the
roles Solitaire needs added. Every palette sets every role, which the build
already enforces.

| Role                                               | For                                                    | Site today     | Solitaire today                                                            |
| -------------------------------------------------- | ------------------------------------------------------ | -------------- | -------------------------------------------------------------------------- |
| `page`                                             | the page behind everything                             | `page`         | (the felt is the page)                                                     |
| `text`                                             | body text                                              | `text`         | `text-primary`, `text-bright`, `text-body`, `text-heading`                 |
| `muted`                                            | secondary text, 4.5:1 on `page` and `panel`            | `muted`        | `text-secondary`, `text-muted`                                             |
| `line`                                             | opaque hairlines on the page                           | `line`         | (none: Solitaire's lines are translucent; see `edge-*`)                    |
| `panel`                                            | a sunken or secondary surface                          | `panel`        | `surface-card`, `surface-sunken`                                           |
| `panel-raised`                                     | menus, dialogs, drawers                                | `panel-raised` | `surface-panel`, `surface-modal`, `surface-modal-solid`, `surface-raised`  |
| `bar`, `bar-text`, `bar-line`                      | the site header and the game bar                       | the same       | the header's `surface-panel-translucent`, `text-primary`, `border-default` |
| `field`, `field-line`, `field-text`, `field-muted` | inputs and the theme button                            | `search*`      | (none)                                                                     |
| `accent`, `on-accent`                              | links, focus, selection; a filled button and its label | the same       | `accent`, `accent-strong`, `accent-deep`, `accent-light`, `accent-sky`     |
| `danger`, `on-danger`                              | destructive actions                                    | (none)         | `danger*` and the white label on it                                        |
| `warning`, `on-warning`                            | caution                                                | (none)         | `warning*`, `text-inverse`                                                 |
| `felt`, `on-felt`                                  | a card table                                           | the same       | the default felt, `#0f4d0e`                                                |
| `card-back`                                        | the back of a card in the site's thumbnails            | the same       | (its backs stay its own; see below)                                        |
| `scrim`                                            | behind a modal                                         | (none)         | `surface-scrim`, `surface-scrim-heavy`                                     |

Solitaire's five accent shades collapse to one: each palette picks an `accent`
that carries `on-accent` at 4.5:1, which the site's palettes already do, so
there is no need for a stronger shade behind white labels.

### Derived roles (computed once, for every palette)

Anything that is a tint of another role is derived in `lib/style` with
`color-mix()`, rather than hand-picked in each palette. A tint of `text` flips
with the palette's mode on its own: dark in a light palette, light in a dark
one. The names are provisional.

- `--fz-wash-1` to `-4`: `text` at 3, 5, 10 and 20%, for hover fills. These
  replace `wash-faint`, `wash-subtle`, `wash-soft` and `wash-medium`, and the
  skeleton shimmer.
- `--fz-edge-1` to `-4`: `text` at 5, 10, 15 and 30%, for translucent borders
  over the felt or glass, where an opaque `line` would show as a stripe. These
  replace `border-subtle` to `border-vivid`.
- `--fz-accent-wash` and `--fz-accent-glow`: `accent` at 10 and 30%.
- `--fz-danger-wash`.
- `--fz-bar-glass`: `bar` at 50%, the game bar over the table.
- `--fz-felt-shade`: `felt` mixed with black, the loading scrim over the board.

### Scales (the same in every palette)

These are taken from Solitaire's `_tokens.scss` with their values unchanged,
since the site has almost no scales of its own. That makes aliasing them in
Solitaire an exact match:

- space: `--fz-space-1` to `-10`;
- type: `--fz-font-2xs` to `-4xl`, `--fz-leading-*`, `--fz-measure-prose`;
- fonts: `--fz-font` (Figtree, then the system stack) and `--fz-font-mono`;
- radius: `--fz-radius-sm` to `-2xl` and `-pill`;
- shadows: `--fz-shadow-*`, Solitaire's seven plus the site's three, with
  duplicates merged;
- motion: `--fz-ease-*`, `--fz-duration-*`;
- focus and touch: `--fz-focus-ring-width`, `-offset`, `--fz-tap-target`
  (44px).

Where the site's own values fall between steps (its 10px radius, its 14px
menu radius), the site keeps them until a design pass. That pass is not part of
this plan.

### What stays in each app

- **Site:** `--page-width`, `--gutter`, `--radius`, and its breakpoints.
- **Solitaire:** its breakpoints and form-factor mixins (they mirror
  `src/engine/render/layout/form_factor.ts`), the game browser's sizes, the
  z-index ladder, `--board-inset-*`, the card artwork's colors (card faces,
  pips, back swatches: drawings of real cards, not interface), and
  `--table-felt` (the felt in use, which may be the player's own).

**Breakpoints stay per app.** A library component never reads the viewport.
It takes its layout from an input (the game bar's `placement`, its `compact`
flag) or from a container query on its own width. The app decides when it is
compact. That way, the library imposes no breakpoint scale on the site or on a
game.

## The theme model

- **One choice everywhere.** The palette is saved under `fuzzley-theme`.
  `lib/style`'s Vite plugin writes `theme.js` into every app's build, so each
  one, the site at `/theme.js` and Solitaire at `/play/solitaire/theme.js`,
  sets `data-theme` on `<html>` before it paints.
- **`ThemeService` (in `lib/ui`)** applies and saves the choice, as the site's
  does now. It also follows the `storage` event, so a palette picked in another
  tab applies at once. Each app says which role tints the browser's own
  toolbar (`theme-color`): the site uses `bar`, Solitaire `felt`.
- **Pickers.** The site keeps its header menu (`fz-theme-menu`). Solitaire's
  settings drawer gets the same palettes as a radio group of swatches
  (`fz-theme-picker`), the shape its drawer already uses for felts.
- **Solitaire's chrome stays dark at first.** This is the agreed
  "dark first, decide after a mock". Each light palette names a dark partner in
  `themes.ts` (Classic felt → Casino night, Soft pastel → Midnight blue).
  Solitaire's chrome (`.ui-overlay`, which also holds its dialogs) carries the
  partner's `data-theme`, while `<html>`, and so the felt, carries the
  palette the player chose. In a dark palette the two are the same. Phase 9
  removes the partner if light chrome is approved.
- **The felt follows the theme, unless the player picked one.** Solitaire's
  Table Theme becomes Felt: "Theme" (the default, the palette's `felt`), then
  Emerald, Ocean, Charcoal and Velvet as overrides.
  - It is stored as `felt` in `fsolitaire-presentation`, read from the old
    `theme` field for older saves, as `StoredPresentation` already does for
    other renamed fields.
  - A stored `green`, the old default, reads as "Theme". Any other stored felt
    stays as the player's choice.
- **Card backs stay Solitaire's own choice.** They are pre-drawn images in
  fixed colors, so the palette's `card-back` can't drive them. It stays a role
  only the site's thumbnails use.

## Navigation

- **Every game bar starts with the Fuzzley Games wordmark, linking to `/`.** At
  compact widths it shrinks to a home icon, still named "Fuzzley Games" for
  screen readers. The link's address is an input (`homeHref`, default `/`); on
  Solitaire's own dev server it leads to the game itself, which is fine.
- **Switching variants stays in the game**: Solitaire's game switcher and
  browser, and Ctrl+K. Switching between games goes through the gallery.
- **The palette is picked in the site header or in a game's settings**, and
  both save to the same key.

## How the libraries plug in

- **Folders and names.** `frontend/lib/style` (workspace `@fz/style`) and
  `frontend/lib/ui` (workspace `@fz/ui`), each private and named after its folder,
  under the `@fz` scope, which marks an import as a library's at a glance and keeps clear of the public `style` and `ui` packages on npm.
- **Used from source, not built.** Consumers depend on `"@fz/style": "workspace:*"`
  and `"@fz/ui": "workspace:*"`. Yarn's `node-modules` linker links them into
  `node_modules`, and Vite and TypeScript follow the link to `frontend/lib/…`.
- **Angular compilation.** Analog's Vite plugin compiles only the files in the
  TypeScript program: the tsconfig's files, its `include` option, and whatever
  they import. Files outside the program get a warning, "contains Angular
  decorators but is not in the TypeScript program". A library component
  imported by the app is therefore pulled into the app's program and compiled
  with the app's own compiler options. That has two consequences:
  - Library code must pass the union of both apps' strict flags. The libraries'
    own tsconfig sets all of them, so `yarn typecheck` catches a lapse before a
    consumer does.
  - Solitaire's `rootDir: ./src` must go, since library sources sit outside it.
- **Sass.** Components write `@use "pkg:@fz/style" as fz;`, which emits nothing,
  and each app's global stylesheet writes `@use "pkg:@fz/style/global";`, once.
  `pkg:` URLs need Sass's `NodePackageImporter` in Vite's
  `css.preprocessorOptions`. `lib/style` exports one Vite plugin,
  `fuzzleyStyle()`, that adds the importer and serves and writes `theme.js`, so
  each app's config gains one line. Solitaire needs it in both `vite.config.ts`
  and `vitest.config.ts`.
- **Exports.**
  - `@fz/style`: `"."` (the toolkit, under the `sass` condition), `"./global"`,
    `"./themes"` (the palette list, as TypeScript), `"./vite"` (the plugin) and
    `"./stylelint"` (a preset).
  - `@fz/ui`: one entry per feature (`@fz/ui/dialog`, `@fz/ui/theme`, `@fz/ui/icon`,
    `@fz/ui/game-bar`, …), plus `@fz/ui/testing` (an in-memory storage provider, and
    the `<dialog>` polyfill jsdom needs).
- **Dependencies.**
  - `@fz/ui`: `@angular/core`, `@angular/common`, `@angular/aria` and
    `@angular/cdk` as peers, and `@fz/style` as a dependency.
  - `@fz/style`: `@fontsource-variable/figtree` (5.3.0, OFL-1.1) for the font,
    and `vite` as an optional peer, for the plugin.
  - Their test tooling uses the site's ranges, which `yarn constraints` holds
    them to.
- **Imports go one way**, as `.agents/AGENTS.md` now says. Two checks enforce
  it:
  - A new constraint in `yarn.config.cjs` fails a `lib/` workspace that depends
    on any workspace outside `lib/`.
  - Each library's ESLint config forbids relative imports that leave the
    package.
- **Checks.**
  - Each library has its own ESLint config (the site's rules: typescript-eslint
    strict and stylistic, explicit return types, Angular's template
    accessibility rules, the `fz` selector prefix), its own stylelint config,
    and its own Vitest config.
    - `@fz/ui`'s Vitest config uses Analog, jsdom, Testing Library and zoneless
      `setupTestBed`.
    - `@fz/style`'s runs in Node.
  - The root's `lint`, `typecheck` and `test` add `--include "lib/*"`.
    Libraries have no `build`: each app compiles them into its own.
  - `.agents/skill-roots.mjs` finds a library's skills on its own, since it
    reads the workspace patterns.
- **The image.** The `Dockerfile` already copies all of `frontend/` before
  `yarn install`, and Verify runs `yarn verify`, so neither changes.

## Phases

Each phase ends with `yarn verify` green, and updates the docs its changes
touch: `.agents/AGENTS.md`, the workspace's `AGENTS.md`, and any skill that
names a moved file (`yarn lint` runs the skill reference check). Phases 1 to 4
and 8 change nothing a player sees and can ship one at a time. Phases 5 to 7
change how Solitaire looks; I recommend building them on one branch and
shipping them together, so players see one change and the screenshots are
taken once.

### Phase 0: spike (small, thrown away)

Prove the plumbing on a branch before committing to it:

- a `lib/style` with one mixin, one token and the `theme.js` plugin;
- a `lib/ui` with one component and one service;
- both used by the site and by Solitaire.

It passes when, for both consumers:

- `yarn verify` passes, including each app's `typecheck` and Vitest rendering
  the library component;
- the production bundle holds the component compiled ahead of time (no
  `@angular/compiler` in it);
- editing the library component hot-reloads in each app's dev server;
- `@use "pkg:@fz/style"` resolves in a component stylesheet;
- `vite.config.ts` loads `@fz/style/vite`. Vite bundles a linked package's
  TypeScript into the config rather than leaving it to Node, which won't strip
  types under `node_modules`.

Fallbacks, if a check fails:

- Analog's `include` option with the library's sources;
- building `lib/ui` with ng-packagr, in partial compilation mode, before the
  apps build;
- a Sass `loadPaths` entry instead of `pkg:`;
- the Vite plugin as an `.mjs` file with JSDoc types, like the apps' `tools/`.

Record the working recipe in each library's `AGENTS.md`.

### Phase 1: scaffold the libraries (small, invisible)

- **Repo:**
  - add `"lib/*"` to `frontend/package.json`'s workspaces, and
    `--include "lib/*"` to `lint`, `typecheck` and `test`;
  - add the one-way constraint to `yarn.config.cjs`;
  - list the libraries' `AGENTS.md` in `.agents/AGENTS.md`.
- **lib:** each library gets:
  - `package.json` (exports, peers, devDependencies at the site's ranges);
  - `tsconfig.json` (the union of strict flags);
  - `eslint.config.js`, `stylelint.config.js` and `vitest.config.ts`;
  - `AGENTS.md`, and a `CLAUDE.md` that imports it.

### Phase 2: tokens and theme in `lib/style`; the site moves onto them (medium, invisible)

- **lib/style:**
  - `_palettes.scss` (the site's maps: `search*` renamed `field*`, the new
    roles hand-picked in each palette, emitted with the `fz-` prefix);
  - `_derived.scss`, `_scales.scss` and `_base.scss` (the site's reset, body
    defaults, focus ring and reduced motion, plus Solitaire's shared
    keyframes);
  - the font from Fontsource;
  - `_index.scss` (the toolkit: the site's `visually-hidden`, Solitaire's
    `transition`, `glass`, `tap-target` and `flex-center`);
  - `global.scss`;
  - `themes.ts` (moved from `site/src/app/provider/themes.ts`);
  - `vite.ts` (`themeBootstrap`, `loadThemeChoice` and `themeBootstrapScript`,
    moved from `site/tools/vite-plugins.ts`, plus the Sass importer);
  - the stylelint preset (the site's rules; colors allowed only in the palette
    and shadow partials; declared custom properties must start with `--fz-`).
- **lib/style specs:**
  - `palettes.spec.ts` and the theme plugin's specs, moved;
  - a new contrast spec that checks the hand-picked pairs in every palette:
    `text`, `muted` and `field-text` at 4.5:1 on their surfaces; `on-accent`,
    `on-danger`, `on-warning` and `on-felt` on their fills; `accent` at 3:1 on
    `page` and `panel`, for the focus ring.
- **Site:**
  - delete the moved files. `global.scss` uses `pkg:@fz/style/global`, then its own
    remainder (`--page-width`, `--gutter`, `.page`, `.back`).
  - Rename every palette `var()` to its `--fz-` name, and `--search*` to
    `--fz-field*`. This is mechanical.
  - `ThemeService` imports from `@fz/style/themes`.
  - `vite.config.ts` uses `fuzzleyStyle()`.
  - `stylelint.config.js` extends the preset, with no color exceptions left.
  - Drop the Google Fonts preconnects and stylesheet from `index.html`.
- **Repo:**
  - remove `https://fonts.googleapis.com` and `https://fonts.gstatic.com` from
    `nginx/content-security-policy.conf`;
  - update the policy's description in `.agents/AGENTS.md` and
    `docs/operations.md`.
- **Verify:**
  - screenshots of home, a category, a game page and the open theme menu, in
    all four palettes, match before and after, apart from font rasterization if
    Fontsource's Figtree differs from Google's;
  - build and serve the image, and check the console shows no "Refused to
    load".

### Phase 3: components in `lib/ui`; the site moves onto them (medium, invisible)

- **lib/ui:**
  - `storage`: the site's `BROWSER_STORAGE` token, plus Solitaire's
    `LocalStorageService` rebuilt on it, so specs can inject a store;
  - `theme`: the site's `ThemeService` (plus the `storage` event and the
    `theme-color` option) and `fz-theme-menu`;
  - `icon`: the site's `<app-icon>` as `<fz-icon>`, with Solitaire's glyphs
    (undo, restart, plus, help, bug, settings, grid, chevron, warning, more)
    redrawn in the site's outline style;
  - `wordmark`: the "Fuzzley Games" mark, as a link or as text.
- **lib/style:** fragments: the site's `.button`, `.badge` and
  `.visually-hidden`, as `.fz-button`, `.fz-badge` and `.fz-visually-hidden`.
- **Site:**
  - delete its copies, and import from `@fz/ui/*`;
  - change `<app-icon>` to `<fz-icon>`, `<app-theme-menu>` to
    `<fz-theme-menu>`, and `.button` to `.fz-button`;
  - the header uses `fz-wordmark`;
  - the specs of moved code move with it.
  - Update `site/AGENTS.md` (icons, menus and palettes now come from the
    libraries) and the site's `vitest-testing` skill where it names moved files.
- **Verify:** the Phase 2 screenshots, unchanged.

### Phase 4: plumbing in Solitaire (small, invisible)

- **Solitaire:**
  - depend on `@fz/style`, `@fz/ui`, `@angular/aria` and `@angular/cdk`; add stylelint
    and its SCSS config;
  - drop `rootDir` from `tsconfig.json`;
  - add `fuzzleyStyle()` to `vite.config.ts` and `vitest.config.ts`;
  - load `theme.js` in `index.html` (a relative URL, like its other assets),
    and update `test/ui/index_html.spec.ts`;
  - `global.scss` uses `pkg:@fz/style/global`. Solitaire's own body color, font and
    `color-scheme` stay after the library's base until Phase 5.
  - `_tokens.scss`: the scale tokens become aliases (`--space-2: var(--fz-space-2)`).
    Their values are identical. Color tokens stay as they are.
  - stylelint with the library's preset. The exceptions, for now, are
    `_palette.scss` and the modal backdrop's literal color.
- **Optional quick win:** a plain home link in the current header.
- **Verify:** screenshots of Solitaire, roomy, upright phone and sideways phone,
  with the header, game browser, settings, rules, victory and confirmation
  showing, match before and after.

### Phase 5: Solitaire follows the theme (large, visible; mock first)

- **Mock:**
  - Solitaire in Casino night and Midnight blue (full follow);
  - in Classic felt and Soft pastel, with the partner's dark chrome over each
    palette's felt;
  - flat buttons (the site's) against today's gradients, and Figtree.

  Build it with the real tokens, either as a page in the browser or as a Claude
  Doc tab as before, and get approval before going on.

- **lib/style:** `themes.ts` gives each light palette its dark partner.
- **lib/ui:** `fz-theme-picker`, and `ThemeService.role(name)`: a signal of a
  palette role's current value, read from the page's computed style.
- **Solitaire:**
  - `AppComponent` puts the chrome's `data-theme` on `.ui-overlay`.
  - `_tokens.scss` aliases the color tokens to library roles, following the
    tables above. Several old names point at one role.
  - `_palette.scss` keeps only the card artwork.
  - The felt: `model/table_theme.ts` gains "Theme".
    `PresentationSettingsService` resolves the felt (the override, or
    `role("felt")`) and migrates saved settings. `--table-felt` and the board
    take the resolved felt through the existing `backgroundColor()` path, and
    the loading scrim uses `--fz-felt-shade`.
  - The settings drawer gets a Theme section (`fz-theme-picker`) and a Felt
    section.
  - Figtree replaces the system stack. The figures stay monospaced.
  - Browser `theme-color` from `felt`.
  - Remove the gradients the mock retired.
  - A contrast pass over every component in both dark palettes, and over the
    light palettes' felts.
- **Screenshots:** after Phase 7, retake `docs/screenshots/*` (41 games) in the
  default palette with `yarn workspace solitaire capture:screenshots` and
  `build:thumbs`, since the site's game pages show them.

### Phase 6: Solitaire's shared pieces move to `lib/ui` (medium, little visible)

One commit each, with their specs moved and rewritten for Testing Library.
Solitaire's own component specs keep passing, now rendering the real library
components.

- `app-modal-dialog` becomes `fz-dialog`, and every overlay switches to it. Its
  `::backdrop` reads `var(--fz-scrim)`, since current engines inherit custom
  properties there; check Safari, and keep a literal if it doesn't.
- `ConfirmationService` and its dialog become `ConfirmService` and
  `fz-confirm-dialog`, with the title, labels and tone as options rather than
  fixed text.
- `RadioGroupDirective` becomes `[fzRadioGroup]`. It drops its import of the
  engine's `itemAt`, since a library imports no game. Angular Aria has no radio
  group today (its parts are accordion, combobox, grid, listbox, menu, tabs,
  toolbar and tree).
- Solitaire's `LocalStorageService` gives way to the library's.
- Inline SVGs become `<fz-icon>`.
- `.btn*` becomes `.fz-button*`, in the look the mock settled, and
  `_buttons.scss` is deleted.
- The generic mixins come from the library. `_mixins.scss` keeps the
  game-only ones (field label, swatch option, spinner, panel card) until a
  second user appears.
- `test/support/dialog_polyfill.ts` moves to `@fz/ui/testing`.

### Phase 7: the game bar (large, visible; mock first)

- **Mock:**
  - the bar at the top (roomy), at the bottom (upright phone) and as a rail
    (sideways phone), with the stock on either side;
  - the wordmark and its compact home icon.
- **lib/ui, `fz-game-bar`:**
  - a `<header>` landmark, with the wordmark link first;
  - inputs: `placement` (`top`, `bottom`, `start` or `end`), `compact` and
    `homeHref`;
  - slots: `[fzBarTitle]`, `[fzBarStatus]` and `[fzBarActions]`;
  - the glass from `--fz-bar-glass`;
  - its size published as `--fz-bar-height` and `--fz-rail-width`, which
    replace Solitaire's `--header-height` and `--rail-width`.

  The layout for each placement is lifted from Solitaire's
  `header_bar.component.scss`, which already does all four.

- **lib/ui, `fz-bar-overflow`:**
  - an Angular Aria menu, consistent with the site's theme menu, replacing
    today's disclosure;
  - its items come as data (`{ id, label, icon }`) and it emits `choose`.
    Angular Aria finds a menu's items in the template that declares the menu,
    so a menu inside the library can't take its items as projected content.
- **Solitaire:**
  - `header_bar` becomes a composition: the game switcher in the title slot,
    the score, time and moves in the status slot, Undo and New Game in the
    actions slot, and the rest as overflow items when compact.
  - The placement comes from `formFactor` and the stock's side, replacing the
    `:host-context([data-stock-side])` rules.
  - The "fSolitaire" wordmark goes. The heading stays the game's name, hidden
    from sight as now.
  - The canvas reads the bar's custom properties.
- Then retake the screenshots (see Phase 5).

### Phase 8: retire Solitaire's old token names (medium, invisible)

- Replace each aliased name in Solitaire's stylesheets with its library name,
  mechanically, following the tables above. Then delete the aliases.
  `_tokens.scss` keeps only the game's own tokens.
- Rewrite the Styling section of Solitaire's `AGENTS.md`, and its
  `sass-design-system` skill, to describe the libraries. Alternatively, retire
  that skill in favor of the libraries' own.
- **Verify:** the Phase 7 screenshots, unchanged.

### Phase 9: light chrome (large, visible, optional; mock first)

- Remove the dark partner, so Solitaire's chrome follows light palettes too.
- Make a light pass over every component: the glass over the felt, drawer,
  browser, rules, victory, confirmation and the card-back swatches. The
  contrast spec covers the pairs; review the rest by eye in each palette.

### Phase 10: skills, and the next consumer (small)

- Add a skill for the libraries, `lib/ui/.agents/skills/fuzzley-ui/SKILL.md`:
  the tokens, fragments and components, and how a game adopts them. It goes in
  once the code it describes exists, then run `node .agents/link-claude-skills.mjs`.
- Have the root `web-game-accessibility` skill name the library's dialog, radio
  group and menu as the way to meet its rules.
- Write Minesweeper's plan: `lib/style`'s CSS and a hand-written bar, in the
  fragments' markup.

## Decisions

All confirmed by the user on 2026-10-24.

1. **Libraries by what they need, starting with two:** `lib/style` (no
   framework) and `lib/ui` (Angular), so a game without Angular takes only the
   styles. A further split is welcome where something fits neither cleanly; the
   first expected is the game chrome (the game bar and its overflow), which the
   site never uses, in a library of its own when Phase 7 builds it.
2. **The `fz` prefix** on tokens, classes and selectors, which is what makes
   the alias phase safe; and the `@fz` scope on the libraries' package names.
3. **The felt follows the theme by default**, with the four felts as
   overrides, and existing players' non-default felts kept.
4. **Flat buttons** (the site's) for Solitaire, rather than its gradients,
   seen in the Phase 5 mock.
5. **Angular Aria's menu** for the bar's overflow, rather than today's
   disclosure, for one keyboard model across the site and games.
6. **One outline icon set**, with Solitaire's Material glyphs redrawn.
7. **A dark partner for Solitaire's chrome until Phase 9**, rather than doing
   light chrome in Phase 5.
8. **Shipping:** Phases 1 to 4 one at a time, 5 to 7 together, then 8, then 9.

The libraries are built to be reused and extended by every game to come, so
each piece is held to accessibility (WCAG 2.2 AA, keyboard and screen reader
first), reuse, extensibility (inputs, slots and tokens rather than forks),
maintainability and testability (specs through the public API, real objects
over mocks).

## Risks

- **Compiling the libraries from source** through Analog is the plan's
  foundation, and unproven here. Phase 0 tests it, and ng-packagr is the
  fallback.
- **Each consumer compiles library code with its own flags.** A flag one app
  adds later can break the other's build of the library. The libraries'
  tsconfig sets the union of both apps' flags; keep it so.
- **Solitaire's coverage floors** (95, 88, 96 and 96%) are measured over
  `src/`. Moving well-tested code out to the libraries can lower them, so
  adjust them in the same commit if it does.
- **Custom properties in `::backdrop`** may not inherit in an older Safari;
  keep the literal there if so.
- **Retaking 41 games' screenshots** adds binary churn to a repository that is
  already about 150 MB. Take them once, after Phase 7.
- **Solitaire's first load grows** by the Figtree font file and Angular Aria's
  menu (about 10 kB gzipped, by the site's measure).
- **One choice, everywhere:** a palette picked in a game changes the site, and
  the reverse. That's the intent, but it is new behavior for Solitaire's
  players.

## Not in this plan

- Minesweeper.
- Replacing Phaser.
- The site using the game bar.
- Merging the site's catalog with Solitaire's.
- A site-wide light/dark switch.
- Reworking the site's own design toward the new scales.
