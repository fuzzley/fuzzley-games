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
  - the tokens: `src/tokens/_palettes.scss`, the color palettes, and
    `src/tokens/_scales.scss`, what is the same in every palette;
  - `src/base/_reset.scss`, what every element starts from;
  - `src/base/_document.scss`, the page's colors and type, the focus ring and
    reduced motion;
  - the fragments, plain classes for markup that needs no behavior, such as
    `.fz-visually-hidden` in `src/fragments/_visually-hidden.scss`.
- **The toolkit**, `src/_index.scss`: the mixins a stylesheet reaches with
  `@use "@fz/style" as fz;`, such as `fz.visually-hidden`, from
  `src/toolkit/`. It emits no CSS, so any stylesheet can load it.
- `src/themes.ts`: the palettes a player can choose between, the default for
  each system color scheme, and the localStorage key the choice is kept under,
  which the site and every game share, being served from one origin. An app
  imports it as `@fz/style/themes`.
- `src/vite.ts`: `fuzzleyStyle()`, the Vite plugins an app adds to its config.
  It writes `theme.js` into the build, at the top of the app's own base, and
  serves it from the dev server. The page loads it first, with a plain tag
  that Vite leaves alone (`<script src="theme.js" vite-ignore></script>`, or
  `/theme.js` for the site), and it picks the palette before anything paints.
  `src/theme_script.ts` writes the script itself.

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
- **A palette role is set in every palette at once.** Each role in
  `$palettes` becomes `--fz-<role>`. Sass fails the build if a palette lacks a
  role the default palette sets, or sets one it doesn't, and
  `src/tokens/palettes.spec.ts` fails if the palettes and `themes.ts`
  disagree.
- **Colors are written only in the palettes.** Every other stylesheet reads
  them with `var()`; stylelint rejects a hex, named or functional color
  anywhere else.
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
  (`stylelint.config.js`, the standard SCSS rules, with no color outside the
  palettes, no `@import`, and nesting at most three deep).
- **`typecheck`** runs `tsc` over the sources, the specs and the Vitest
  config.
- **`test`** runs Vitest in Node. Each spec sits beside the file it tests. The
  stylesheets' specs compile them with Sass; the plugin's run a real Vite dev
  server and build in a temporary folder.
