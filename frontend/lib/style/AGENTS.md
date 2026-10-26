# @fz/style

The `@fz/style` library (`frontend/lib/style`): what the site and the games
share of how they look, with no framework, so a game written without Angular
can use it too. The repository's rules, which apply here too, are in
[.agents/AGENTS.md](../../../.agents/AGENTS.md). Paths are relative to
`frontend/lib/style/`.

## What it holds

- **The shared global stylesheet**, `src/global.scss`, which an app loads
  once, as `@use "@fz/style/global";` at the top of its own. It holds, in
  order:
  - the tokens, `src/tokens/_index.scss`, which style no element (as
    `src/global.spec.ts` checks), so a page that keeps its own reset and
    element styles loads them alone, as `@use "@fz/style/tokens";`:
    - the font, Figtree, from Fontsource (`@fontsource-variable/figtree`,
      under the SIL Open Font License), served from the app's own origin,
      so no app needs a font host in its Content Security Policy. A browser
      fetches only the subsets a page's text uses, and only once something
      is set in it;
    - `src/tokens/_palettes.scss`, the color palettes, each role picked by
      hand in each palette;
    - `src/tokens/_derived.scss`, the roles worked out from those with
      `color-mix()`, such as the washes and edges, which are tints of
      `text` and so turn with the palette's mode; and the surfaces that
      float over a game, which each palette sets by its mode, glass in a
      dark one and solid in a light one, where light glass turns grey and
      loses its text's contrast: `--fz-bar-glass` (a bar), `--fz-panel-glass`
      (a drawer or a modal), `--fz-float` (a card alone over the dimmed
      page) and `--fz-well` (a well cut into a panel);
    - `src/tokens/_scales.scss`, what is the same in every palette: space,
      fonts, type sizes, line heights, radii, motion, the focus ring and the
      smallest tap target;
    - `src/tokens/_shadows.scss`, the shadows;
  - `src/base/_reset.scss`, what every element starts from;
  - `src/base/_document.scss`, the page's colors and type, the focus ring and
    reduced motion;
  - the fragments, plain classes for markup that needs no behavior, one
    file each in `src/fragments/`: `.fz-button`, an action in a pill, on a
    `<button>` or a link, filled with the accent unless a tone
    (`.fz-button-secondary`, `-warning` or `-danger`) gives it another fill,
    and shaped or sized by `.fz-button-circle`, `-block` or `-large`; a tone
    sets `--fz-button-fill` and `--fz-button-label`, whose contrast, hovered
    too, `src/tokens/contrast.spec.ts` checks; `.fz-badge`, a small label, and
    `.fz-badge-accent`; `.fz-swatch`, a palette's swatch on an element
    carrying its `data-theme`, and `.fz-swatch-large`; and
    `.fz-visually-hidden`.
- **The toolkit**, `src/_index.scss`: the mixins a stylesheet reaches with
  `@use "@fz/style" as fz;`, from `src/toolkit/`: `visually-hidden` and
  `tap-target` (`_a11y.scss`), `flex-center` (`_layout.scss`), `transition`
  (`_motion.scss`), `glass` (`_surfaces.scss`) and `icon-button`
  (`_controls.scss`). It emits no CSS, so any stylesheet can load it, and
  `src/toolkit.spec.ts` checks what each mixin writes.
- `src/stylelint.ts`: the stylelint rules every app's stylesheets keep,
  which its `stylelint.config.js` extends as `@fz/style/stylelint`.
- `src/themes.ts`: the palettes a player can choose between, the default for
  each system color scheme, and the localStorage key the choice is kept
  under, which the site and every game share, being served from one
  origin. An app imports it as `@fz/style/themes`.
- `src/fuzzball.ts`: the fuzzball, the mark the site and the games share with
  fuzzley.info, whose geometry it copies: its shapes (`FUZZBALL`), for an
  inline `<svg>` that colors the body and fur itself, and `fuzzballSvg()`,
  which writes it as an SVG file in one color, or one for each system color
  scheme. An app imports it as `@fz/style/fuzzball`.
- `src/vite.ts`: `fuzzleyStyle()`, the Vite plugins an app adds to its config.
  It writes `theme.js` into the build, at the top of the app's own base, and
  serves it from the dev server. The page loads it first, with a plain tag
  that Vite leaves alone (`<script src="theme.js" vite-ignore></script>`, or
  `/theme.js` for the site), and it picks the palette before anything paints.
  `src/theme_script.ts` writes the script itself. Beside it, the same way,
  it writes `favicon.svg`: the fuzzball in the accents of the default
  palettes for a light and a dark system, which it reads by compiling the
  palettes' Sass, so an app that adds it needs `sass`, as every app has for
  its own stylesheets. The page links it as it loads `theme.js`
  (`<link rel="icon" type="image/svg+xml" href="favicon.svg" vite-ignore />`),
  and `@fz/ui`'s `ThemeService` recolors it to the palette in use.

## How an app uses it

- **From source, never built.** An app lists `"@fz/style": "workspace:*"` in
  its `package.json` and imports the entries `exports` names. Vite compiles
  the files into the app's own bundle, its Sass importer finds the
  stylesheets under the `sass` condition, and TypeScript checks the rest as a
  package the app depends on.
- **The app's own rules win.** Every rule of `global.scss` sits in a cascade
  layer under `fz` (`src/_layers.scss`), and an app's rules sit in none, so
  they win over the library's whatever their specificity. An app adjusts a
  shared style by writing its own, never by out-specifying the library's.
  `.fz-visually-hidden` alone is `!important`, so nothing brings its text
  back into view.
- **Imports go one way.** This library imports no workspace but another
  library, and only by package name. `rootDir` in `tsconfig.json` fails a
  relative import that climbs out of the library.

## Rules

- **Everything shared carries `fz`**: `--fz-accent`, `.fz-visually-hidden`,
  the `fz.*` layers. An app's own names carry none, so the two never collide.
  `src/global.spec.ts` fails on a class without it.
- **A fragment's variant is a class of its own**, named after it and set
  beside it (`class="fz-badge fz-badge-accent"`), so it never needs a
  compound selector to win, and works in markup with no framework.
- **A palette role is set in every palette at once.** Each role in
  `$palettes` becomes `--fz-<role>`. Sass fails the build if a palette lacks a
  role the default palette sets, or sets one it doesn't, and
  `src/tokens/palettes.spec.ts` fails if the palettes and `themes.ts`
  disagree.
- **Colors are written only in the palettes**, and in the shadows, which
  darken alike in every palette, and in the fuzzball's eyes, which sit on its
  fur in every palette. Every other stylesheet reads them with `var()`;
  stylelint rejects a hex, named or functional color anywhere else.
- **Contrast is checked, not hoped for.** `src/tokens/contrast.spec.ts`
  holds every palette to WCAG: text and fills' labels at 4.5:1 on what they
  sit on, the surfaces too, over what shows through them, and the focus
  ring at 3:1. A role that carries text, or sits behind it, gets a pair
  there.
- **A derived role is declared wherever a palette is** (`:root,
[data-theme]`), not on `:root` alone: a custom property resolves its
  `var()`s where it is declared, so an element with a palette of its own
  needs its own tints. A surface is declared on each palette of its mode,
  and on `:root` first with the default's, which `src/tokens/derived.spec.ts`
  checks.
- **The toolkit emits nothing, and `global.scss` nothing outside its
  layers.** `src/global.spec.ts` checks both.
- **The strictest compiler options.** `tsconfig.json` holds the site's and the
  games' strict flags together, since each app compiles these files with its
  own.
- **Relative imports name the file** (`./themes.ts`), and the TypeScript is
  only the kind Node can strip (`erasableSyntaxOnly`). Vite leaves a package
  out of the config it bundles, so Node loads `src/vite.ts`, and what it
  imports, as it is; a spec in `src/vite.spec.ts` does the same.
- **An app's needs go in the app.** A token, palette or plugin belongs here
  only when the site and the games all mean the same thing by it. Layout
  tokens and breakpoints stay in each app.

## Checks

The root's `yarn lint`, `yarn typecheck` and `yarn test` run the library's
own, which `yarn workspace @fz/style <script>` runs alone.

- **`lint`** runs ESLint (`eslint.config.js`): typescript-eslint's strict and
  stylistic type-checked rules, explicit return types on exported functions,
  and `import type` for type-only imports. Then `lint:styles` runs stylelint
  (`stylelint.config.js`, the library's own preset with the palettes and
  shadows let off its color rules).
- **`typecheck`** runs `tsc` over the sources, the specs and the Vitest
  config.
- **`test`** runs Vitest in Node. Each spec sits beside the file it tests. The
  stylesheets' specs compile them with Sass; the plugin's run a real Vite dev
  server and build in a temporary folder.
