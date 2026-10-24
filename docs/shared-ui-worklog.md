# Shared UI work log

The running record of [the shared UI plan](shared-ui-plan.md): what is done,
what was found, and where to pick up. The newest entry is last. Delete this
file in the commit that finishes the plan; it stays in that commit's parent.

## Where things stand

- **Branch:** `shared-ui`, from `main` at `70f3d97`. Not pushed: a push to
  `main` deploys, so each shipping point waits for the user's go-ahead.
- **Phase:** 5, Solitaire follows the theme. Phase 4 is done.
- **Next step:** Phase 5 changes how Solitaire looks, so it starts with a
  mock (the plan lists what it shows), built with the real tokens, and waits
  for the user's approval before any of its code.

| Phase                             | State     |
| --------------------------------- | --------- |
| 0. Spike                          | done      |
| 1. Scaffold the libraries         | done      |
| 2. Tokens and theme; site moves   | done      |
| 3. Components; site moves         | done      |
| 4. Plumbing in Solitaire          | done      |
| 5. Solitaire follows the theme    | mock next |
| 6. Solitaire's pieces move to lib | to do     |
| 7. The game bar                   | to do     |
| 8. Retire Solitaire's token names | to do     |
| 9. Light chrome                   | to do     |
| 10. Skills, and the next consumer | to do     |

## How to check the work

From `frontend/`: `yarn verify` runs every check; on `main` before this work
it took under five minutes, with 177 site specs and 6940 Solitaire specs. On this machine, Docker is
usually off and port 4200 is taken (see the dev-environment notes in Claude's
memory); start Vite with `--port <n> --strictPort`.

A change meant to be invisible is checked against screenshots of a build of
`main` from before this work (`70f3d97`): six pages (home, a category, a
hosted and a coming-soon game page, the 404, and the open theme menu), in all
four palettes, wide and phone. Claude's script for it, kept outside the
repository, serves both builds, drives headless Chrome over the DevTools
protocol, and diffs the pixels. It paints images black first: Chrome
rasterizes the scaled-down thumbnails a little differently each time, so a
build differs from itself otherwise.

Solitaire is checked the same way, from its dev server rather than a build,
against shots taken before Phase 4 touched it: Klondike's table, and the game
browser, settings, rules, a confirmation and the victory dialog open over it,
plus the overflow menu on phones, roomy (1440 × 810), upright (390 × 844) and
sideways (844 × 390). The dev server is needed for Angular's `ng` debug
global, through which the script opens each overlay from its component or
service (victory by setting `GameMetricsService`'s won signal). Each shot
starts from empty storage with `Math.random` seeded, so the deal is the same,
and no move is made, so the clock reads 00:00. Images are painted out as for
the site, and running animations are stopped at a fixed point: a looping one
at its start, a finite one at its end.

## Log

### 2026-10-24: the plan agreed

- The user confirmed every decision in the plan, and added: a library may be
  split further where something fits neither `lib/style` nor `lib/ui`
  cleanly, and everything is built to be reused and extended by future games,
  for accessibility, reuse, extensibility, maintainability and testability.
- `.agents/AGENTS.md` now lets the site and the games import `lib/`, one way.
- The libraries are named `@fz/style` and `@fz/ui`, not the bare folder names.
  A scope marks an import as a library's at a glance, and keeps clear of the
  public `style` and `ui` packages on npm. `yarn.config.cjs` needs to allow it
  (Phase 1).

### 2026-10-24: the spike (Phase 0)

A throwaway `lib/ui` with one component and service, and a `lib/style` with
one mixin and the `theme.js` plugin, used by both the site and Solitaire. It
passed every check in the plan, and was removed once done. What it showed:

- **Angular components compile from source.** Analog's Vite plugin compiles a
  library component the app imports, ahead of time, in the build, the dev
  server (with hot reload) and Vitest, with no extra configuration. No
  `@angular/compiler` reaches the bundle.
- **Solitaire's `rootDir` can stay.** TypeScript reads a linked package as an
  external one, so its files don't count against the app's `rootDir`. The
  plan said it had to go; it no longer does.
- **A library's own `rootDir`** (its folder) catches a relative import that
  climbs out of it (TS6059), which keeps imports one way without an ESLint
  rule.
- **Sass needs no `pkg:`.** `@use "@fz/style" as fz;` resolves through Vite's
  own Sass importer, from the package's `exports` under the `sass`
  condition, and `url()`s are rebased. So `fuzzleyStyle()` only has
  `theme.js` to do for now.
- **`@fz/style/vite` loads in a Vite config.** (Corrected in Phase 1: Vite 8
  bundles none of a package into the config, linked or not, so Node loads the
  plugin as it is. The spike's plugin had no relative imports, which hid that
  Node needs them to name their `.ts` file.)
- **`@fz/ui` will need `@angular/router` and `postcss` as devDependencies**:
  Yarn warned about both peers during the spike.
- The plan is corrected to match.

### 2026-10-24: Phase 1, `@fz/style` scaffolded

- `frontend/lib/style` is the `@fz/style` workspace. It took the palette list
  (`themes.ts`, from the site's `provider/`) and the `theme.js` plugin (from
  the site's `tools/vite-plugins.ts`), with their specs, so it holds something
  real from the start. The plugin imports the list instead of parsing the
  site's file, and serves `theme.js` at the top of any base, which Solitaire
  will need at `/play/solitaire/`.
- Its specs run a real Vite dev server on a free port and a real build. A
  middleware called directly never reaches the plugin: Vite's own request
  checks run first.
- The site imports `@fz/style/themes` and adds `fuzzleyStyle()` to its Vite
  config.
- `yarn.config.cjs` names a library `@fz/<folder>`, and fails a library that
  depends on a workspace outside `lib/` (tried by hand: it does).
- The root's `test`, `typecheck` and `lint` include `lib/*`.
- `lib/ui` waits for Phase 3, so it is never an empty package.

### 2026-10-24: Phase 2, the palettes and base styles move

- `@fz/style` exports its Sass: `@fz/style` is the toolkit (only
  `visually-hidden` so far) and `@fz/style/global` the shared global
  stylesheet: the palettes, the reset, the page's defaults and the
  `.fz-visually-hidden` class.
- **Cascade layers**, a decision made here: every rule of `global.scss` sits
  in `fz.tokens`, `fz.reset`, `fz.base` or `fz.fragments`, so an app's own
  rules, in no layer, always win. That keeps an app from fighting the library
  with specificity, and lets Solitaire's own globals keep winning while it
  moves over. `.fz-visually-hidden` is `!important` instead, as hidden text
  must stay hidden. `src/global.spec.ts` holds `global.scss` to its layers and
  the toolkit to emitting nothing.
- The palettes emit `--fz-<role>`; `search*` became `field*`, and the unused
  `card-back` is gone. The site reads `var(--fz-…)` throughout, its own
  layout tokens (`--page-width`, `--gutter`, `--radius`) stay unprefixed in
  `_layout.scss`, and `ThemeService` tints the browser from `--fz-bar`.
- Reduced motion now shortens animations and transitions to 0.01ms, as
  Solitaire did, rather than removing them, so `transitionend` still fires.
  The visually-hidden mixin is Solitaire's fuller one.
- The minifier drops the layer-order statement, since the layers already come
  in that order; the order is the same.
- Checked: all 48 screenshots match the baseline pixel for pixel, and the
  built CSS differs only in the names, the layers, and the two rules above.

### 2026-10-24: Phase 2, the tokens

- **New palette roles**, picked by hand in each palette: `danger` and
  `warning` with their labels (`on-danger`, `on-warning`), and `scrim`. The
  light palettes take deep reds and ambers that carry white labels and read
  as text on the page; the dark ones take light ones with near-black labels,
  as Casino night's gold accent already does. Casino night's warning is
  orange, so it isn't mistaken for its gold accent.
- **Derived roles** in `tokens/_derived.scss`, with `color-mix()`: the washes
  and edges (tints of `text`), `accent-wash`/`-glow`, `danger-wash`,
  `bar-glass`, `felt-shade` and `focus-ring-color`. They are declared on
  `:root, [data-theme]`, not `:root` alone: a custom property resolves its
  `var()`s where it is declared, so an element with its own palette (a
  swatch, and Solitaire's chrome in Phase 5) needs its own tints.
  `--fz-focus-ring-color` exists so a part of a page whose background is the
  accent's own, such as Classic felt's table, the same green, can give the
  ring another color.
- **Scales and shadows** as tokens, Solitaire's values, plus the site's three
  shadows; the site reads `var(--fz-shadow-*)` and its `_shadows.scss` is
  gone. The focus ring is the site's 3px (Solitaire's is 2px), which the plan
  now says Phase 4 leaves alone.
- **A contrast spec** (`tokens/contrast.spec.ts`) checks 20 pairs in each
  palette against WCAG. It found a real failure: Soft pastel's white
  `on-felt` on its felt was 3.23:1. **Visible change:** that felt deepens
  from `#3f9e8f` to `#348275` (4.57:1), the same hue. It shows in that
  palette's swatch and felt areas only. The game page's note on the felt also
  loses its `opacity: 0.85`, which put even Classic felt under 4.5:1; no
  page shows that note today (both games to come have plain stages), so
  nothing changes there yet.
- **A stylelint preset**, `@fz/style/stylelint` (`src/stylelint.ts`), which
  the site's config now just extends, with no exceptions left. Its spec runs
  stylelint on samples.
- Checked: the screenshots differ from the baseline only in Soft pastel's
  felt (its swatch, in every palette's open menu, and felt areas in that
  palette), by exactly that change of color.

### 2026-10-24: Phase 2, Figtree from Fontsource

- `@fz/style` depends on `@fontsource-variable/figtree` 5.3.0 (SIL Open Font
  License) and its global stylesheet loads it, so every app gets Figtree from
  its own origin. `--fz-font` names `Figtree Variable` first, then the
  system stack. A face only downloads when text is set in it, so Solitaire
  loading the global stylesheet in Phase 4 costs nothing until it uses it.
- The site drops Google Fonts: the preconnects and stylesheet leave
  `index.html`, and `fonts.googleapis.com` and `fonts.gstatic.com` leave the
  Content Security Policy, which now says `font-src 'self'`. `.agents/AGENTS.md`
  and `docs/operations.md` describe it so.
- `src/global.spec.ts` lets font faces sit outside the layers (they declare a
  font, not a style) and checks the one face is the font `--fz-font` names.
- Checked: the build emits the two subsets and requests only the Latin one;
  the dev server serves it; the screenshots match the previous step's, so
  Fontsource's Figtree renders exactly as Google's did.
- The policy, without the image (Docker isn't running here): the build served
  with the header from `nginx/content-security-policy.conf`, in headless
  Chrome, loads with no policy violation, while the old build under the same
  header is refused its Google Fonts stylesheet, which shows the check
  works. Analytics stays off without a measurement ID, so Google Analytics,
  which the policy still allows, wasn't exercised.

### 2026-10-24: Phase 3, `@fz/ui` and the site's theme pieces

- **`lib/ui` is `@fz/ui`**, the Angular library: one entry point per folder
  (`exports: { "./*": "./src/*/index.ts" }`), compiled by each app from
  source like `@fz/style`. Its configs are the site's, cut to the library,
  plus ESLint's `fz` selector prefix. Angular, `@angular/aria` and
  `@angular/cdk` are peers. `frontend/lib/ui/AGENTS.md` holds its rules;
  `.agents/AGENTS.md` lists it.
- **Moved with `git mv`, history kept:** `BROWSER_STORAGE` to
  `@fz/ui/storage`, `ThemeService` and the theme menu to `@fz/ui/theme`,
  the icon to `@fz/ui/icon`, each with its spec. The selectors become
  `fz-theme-menu` and `fz-icon`, and `--icon-stroke` becomes
  `--fz-icon-stroke`.
- **`ThemeService` gains** what the games will need: it takes up a palette
  chosen in another tab (the `storage` event, removed when the app is
  destroyed), and `THEME_COLOR_ROLE` names the role the browser's toolbar
  takes, `bar` by default, so Solitaire can say `felt`. It reads
  `--fz-<role>` for it, typed by `PaletteRole`.
- **`themes.ts` lists the palette roles** (`PALETTE_ROLES`, and
  `PaletteRole` from it), and `palettes.spec.ts` checks the Sass sets
  exactly those. Writing it showed the spec's fz-prefix case had been
  vacuous since `3800584`: a shell had eaten the backslashes in its
  pattern (`[w-]` for `[\w-]`), so it matched nothing. Fixed, and
  checked by breaking a prefix on purpose.
- **The menu takes `compact`** instead of reading the site's `md`
  breakpoint, as the plan says a library component should. Compact shows the
  swatch alone in a square button; the button keeps its name ("Theme: Classic
  felt") either way. The site binds it with the CDK's `BreakpointObserver`
  to a new `src/app/styles/breakpoints.ts`, which repeats
  `_breakpoints.scss`'s widths for TypeScript; its spec compiles the Sass
  and fails if the two disagree. The header's spec covers both widths, with
  a `MediaMatcher` that matches everything standing in for a phone.
- **Deferred, and the plan updated to say so:** rebuilding Solitaire's
  `LocalStorageService` on `BROWSER_STORAGE` moves to Phase 6, when
  Solitaire first uses it, so it isn't written without a user. Redrawing
  Solitaire's glyphs in the outline style moves into the Phase 5 mock,
  since it changes how Solitaire looks, and they become `IconName`s in
  Phase 6.
- Checked: `yarn verify` passes (110 `@fz/style`, 30 `@fz/ui`, 145 site and
  6940 Solitaire specs; the site's 23 moved specs went to `@fz/ui`). The
  screenshots that differ from the baseline are the previous step's, byte
  for byte, the open menu at phone width included, so the `compact` binding
  draws what the old media query did. The CDK adds an empty `<style>` to
  test media queries in Chrome, which the policy's inline styles allow: the
  build served under it loads with no violation.

### 2026-10-24: Phase 3, the button, the badge and the wordmark

- **`@fz/style` fragments:** the site's `.button` and `.badge` become
  `.fz-button` and `.fz-badge`, in the `fz.fragments` layer, with the
  same values; where a token equals one exactly, the token (the pill radius,
  `--fz-font-xs`, `--fz-leading-normal`). `.fz-button` gains a gap, so an
  icon beside its words needs no rule of the app's; the site's two buttons
  with icons set their own. The site's `.badge.new` becomes
  `.fz-badge-accent`: a variant is a class of its own, named after the
  fragment, a rule `lib/style/AGENTS.md` now states. The button has no
  hover, pressed or disabled look yet, as the site's had none: those come
  with Solitaire's buttons in Phase 6, in the look the Phase 5 mock
  settles.
- `global.spec.ts` now fails on a class without `fz`; checked by renaming
  one.
- **`fz-wordmark`** in `@fz/ui`: the name in the header's type, as text.
  The site's header puts it in its own `routerLink`, and a game will put
  it in an `href`, so the link stays the app's and takes its name from the
  words. The compact home icon the game bar needs waits for the Phase 7
  mock.
- Checked: `yarn verify` passes (111 `@fz/style`, 32 `@fz/ui`, 145 site and
  6940 Solitaire specs), and the screenshots are the previous step's, byte
  for byte: the wordmark on every page, the buttons on the game and missing
  pages, the badges on the tiles and the coming-soon page.

### 2026-10-24: Phase 4, Solitaire's plumbing

- **Baseline first:** 20 shots of Solitaire before any change (see How to
  check the work), taken twice to show the script repeats itself exactly.
- **Solitaire depends on `@fz/style`**, and loads `theme.js` first in
  `index.html`, at a relative URL, from `fuzzleyStyle()` in
  `vite.config.ts`. Its build has `theme.js` beside `index.html`, and so does
  the site's copy under `/play/solitaire/`. A spec checks it is the page's
  first script, and relative.
- **Only the tokens, not the whole global stylesheet.** Tried first, the
  global stylesheet changed 15 of the 20 shots: its reset and element styles
  move every dialog by a pixel and shift the header's text, since Solitaire
  leans on the browser's margins and sets `box-sizing` component by
  component. So `@fz/style` gains a `tokens` entry (`src/tokens/_index.scss`):
  the font and the custom properties, styling no element, which a spec
  checks. The global stylesheet loads it first, and Solitaire loads it alone
  (`as fz-tokens`, since its own `tokens` partial has that namespace). A page
  that keeps its own reset, such as Minesweeper with Bootstrap, can do the
  same. The reset and base come in Phase 5, whose screenshots are retaken
  anyway; the plan says so.
- **Scales alias the library's**: spacing, type sizes, line heights, the
  measure, radii, shadows, motion, the focus ring's offset and the tap target
  read `var(--fz-…)`, all at the same values. `--font-sans` (no Figtree) and
  the focus ring's 2px width and colour stay Solitaire's.
- **Stylelint with the shared preset**, in `yarn lint` as `lint:styles`: 136
  findings, almost all blank lines and comment layout, fixed. The keyframes
  are renamed to kebab-case (`pop-in`), `_breakpoints.scss`'s private
  function becomes `-width`, the font names are quoted, four longhands
  become `inset`, and colours take the modern notation. The exceptions:
  `_palette.scss` (in `stylelint.config.js`), and disable comments on the
  modal backdrop's literal colour and on the two vendor-prefixed properties
  older Safari needs.
- **Not done, and the plan updated:** `@fz/ui`, Angular Aria and the CDK
  wait for the code that imports them (Phase 5), rather than sitting unused.
  No tsconfig checks Solitaire's `vite.config.ts`, so none needed
  `allowImportingTsExtensions`. The optional home link in the current header
  would be a visible change, so it wasn't made.
- **Docs:** Solitaire's `AGENTS.md` (the shared tokens, `theme.js`, the
  stylesheet lint) and its `sass-design-system` skill, whose example also
  named tokens that don't exist (`--color-text-muted`); `@fz/style`'s
  `AGENTS.md` (the tokens entry).
- Checked: `yarn verify` passes (112 `@fz/style`, 32 `@fz/ui`, 145 site and
  6941 Solitaire specs). All 20 Solitaire shots match the baseline, both with
  no palette saved and with Midnight blue saved, so the palettes'
  `data-theme` doesn't reach it yet; the dev server's stylesheet was checked
  to hold the shared tokens and the aliases. The site's screenshots are the
  previous step's, byte for byte.
