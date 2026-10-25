# Shared UI work log

The running record of [the shared UI plan](shared-ui-plan.md): what is done,
what was found, and where to pick up. The newest entry is last. Delete this
file in the commit that finishes the plan; it stays in that commit's parent.

## Where things stand

- **Branch:** `shared-ui`, from `main` at `70f3d97`. Not pushed: a push to
  `main` deploys, so each shipping point waits for the user's go-ahead.
- **Phase:** 6, Solitaire's pieces move to the libraries. Phase 5 is done.
- **Next step:** the rest of Phase 6, one commit per piece: the buttons,
  the confirmation dialog, then the mixins. Phase 7's game bar needs
  its own mock, and the user's approval, before any of its code.

| Phase                             | State    |
| --------------------------------- | -------- |
| 0. Spike                          | done     |
| 1. Scaffold the libraries         | done     |
| 2. Tokens and theme; site moves   | done     |
| 3. Components; site moves         | done     |
| 4. Plumbing in Solitaire          | done     |
| 5. Solitaire follows the theme    | done     |
| 6. Solitaire's pieces move to lib | underway |
| 7. The game bar                   | to do    |
| 8. Retire Solitaire's token names | to do    |
| 9. Light chrome                   | to do    |
| 10. Skills, and the next consumer | to do    |

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

### 2026-10-24: Phase 5's mock

- **The mock** is a
  [private page for the user](https://claude.ai/artifact/7xP3dMosGMmMK9vvxFgfQq).
  It compares today's Solitaire with the proposal in all four palettes: Klondike's board
  at the three sizes, then the game browser, settings, rules, a confirmation,
  victory and the phone's menu. Below those, live sketches drawn with the
  compiled `@fz/style` tokens: the bar and its buttons, the redrawn glyphs,
  and Game options' new Theme and Felt sections.
- **How the pictures were made:** the running game with the proposal laid
  over it, by the Solitaire screenshot script with two new options: a script
  to run once the game is up, and `MASK=0`, which keeps the pictures. The
  injected stylesheet points Solitaire's colour tokens at the palette roles
  (the plan's tables, several old names to one role), declared on
  `:root, [data-theme]`, and makes the buttons flat pills. The injected script
  puts the dark partner's `data-theme` on `.ui-overlay`, and replaces the
  presentation service's `backgroundColor()` with the palette's felt.
- **Found while making it:**
  - The site's button is a pill (`--fz-radius-pill`, 42px, weight 700), and
    Solitaire's a rounded rectangle. "The site's buttons" means the pill, so
    the mock shows pills, the full-width ones in dialogs too.
  - Victory is the only user of Solitaire's warning colours, so it takes
    `--fz-warning`: orange under Casino night's chrome, amber under Midnight
    blue's. The page offers the accent instead and recommends the warm colour.
  - Classic felt's felt (`#2f7d4f`) is much lighter than today's Emerald
    (`#0f4d0e`), and it's what light-mode players see first. The page flags
    it; I recommended keeping it, to match the site.
  - The game pictures in the browser and the rules are screenshots of today's
    look; they're retaken after Phase 7, as the plan says.
- **Glyphs:** 17 redrawn as 2px outlines on the 24px grid: the plan's ten,
  plus close, back, trophy, link and external link, which Solitaire also
  draws, and tick and search, which `@fz/ui` already has.
- **Memory:** five captures in parallel ran five headless Chromes, and the
  user asked for them to be closed. Captures now run one at a time, and the
  script skips shots it already has, so a run can be resumed.
- **Waiting on:** the user's approval of the look, and their answers on the
  page's open points. No Phase 5 code until then.

### 2026-10-24: the mock approved; Emerald felt, the new default

- **Approved:** the user found the mock good and asked to go on with the
  rest, taking the recommendations: Victory in the warm warning colour, pill
  buttons everywhere, the 17 outline glyphs as drawn, the Theme and Felt
  sections. Phase 7 still gets its own mock first.
- **Emerald felt** (`emerald`), at the user's request: Solitaire's current
  background as a palette, and the default for now in both system schemes.
  Page and felt are the Emerald felt (`#0f4d0e`); bar and dialogs are
  Solitaire's slate (`panel-raised` and `bar` `#0f172a`, `panel` `#1e293b`),
  so half-transparent bar over the felt is today's header; the accent is
  `#60a5fa`, since Solitaire's `#2563eb` makes only 2:1 on the green. It
  passes every contrast pair. The light-default-in-light-mode spec went, by
  design; the site's static `theme-color` is now `#0f172a`.
- **Checked:** `yarn verify` passed, after Prettier and two spec fixes (the
  palettes spec's override map lacked `$default`; the theme menu's specs
  assumed Classic felt came first).
- **Phase 5, decided but not started:**
  - `THEME_COLOR_ROLE` takes `null` for an app that sets `theme-color`
    itself; Solitaire sets it from its resolved felt.
  - `ThemeService.role(name)`: a signal of `--fz-<name>` on the root, read
    after the effect applies the palette (an `applied` signal).
  - The palette swatch moves to `@fz/style` as a fragment (`.fz-swatch`,
    `.fz-swatch-large`, ring from `--fz-swatch-ring`), used by the theme menu
    and the new `fz-theme-picker` (native radios, so the keyboard comes free).
  - The chrome's dark partner goes on `app-root`, not `.ui-overlay`, so the
    canvas's loading badge follows too; only the felt reads the root's palette.
  - The felt moves to a new stored field, `felt` (`"theme"` or a felt key);
    an old stored `theme: "green"` becomes `"theme"`, the others are kept,
    and the old field is never read once `felt` exists. Solitaire's felt code
    is renamed from "theme" to "felt".
  - `_tokens.scss` splits: colour aliases on `:root, [data-theme]` (the
    mapping in the mock's stylesheet, `--surface-panel` from
    `panel-raised`), `--table-felt` on `:root` alone, defaulting to
    `var(--fz-felt)`; the loading scrim derives from `--table-felt`.

### 2026-10-24: Phase 5, the libraries' part

- **`@fz/style`:** `DARK_PARTNERS` and `darkTheme()` in `themes.ts` (Classic
  felt lends Casino night, Soft pastel Midnight blue; a dark palette is its
  own partner), typed so a light palette can only name a dark one. The
  swatch is the `.fz-swatch` fragment, with `.fz-swatch-large`; its left half
  is now the palette's `bar`, not its `page`, which is the same colour in
  every palette but Emerald felt, where the bar is the slate the game's
  header shows.
- **`@fz/ui`:** `THEME_COLOR_ROLE` accepts `null`; `ThemeService.role(name)`
  gives a palette role's colour as a signal, read after the palette is
  applied; `<fz-theme-picker>` offers the palettes as native radios in a
  named radiogroup, for a settings panel. The theme menu uses the fragment.
- **Checked:** both libraries' lint, typecheck and specs (42 and 134), and the
  site's typecheck and specs. The site's theme menu was not looked at in a
  browser: its swatch is the same rules, now in a layer, and the same colours
  for the old palettes.
- **Next:** Solitaire's part of Phase 5.

### 2026-10-24: Phase 5, Solitaire follows the theme

- **Styles:** `global.scss` loads `@fz/style/global`, so the shared reset,
  document styles and focus ring (3px, the site's) replace Solitaire's own.
  `_base.scss` keeps what differs: the full-height document, the felt on
  `html` with the body left clear, the looser 1.5 leading, and `app-root`
  taking its palette's text colour. Every colour token in `_tokens.scss` is a
  palette role, declared on `:root, [data-theme]`; `--table-felt` and the
  loading scrim, now the table's felt darkened as `felt-shade` darkens the
  palette's, are on `:root` alone. `_palette.scss` keeps only the card
  artwork. Figtree replaces the system fonts.
- **Departures from the mock's mapping:**
  - `--surface-sunken` is black at 20%, as today, and `--surface-scrim-heavy`
    is `panel-raised` at 85%: both were mixed from `page`, which in Emerald
    felt is the felt, so the wells and segments turned green.
  - The header glass is `bar` at 75%, not the site's 50%: at 50% the muted
    labels fell to 3.2:1 over Soft pastel's felt and about 4.1:1 over Casino
    night's and Midnight blue's (4.74:1 today). A new spec,
    `test/ui/app/styles/contrast.spec.ts`, compiles the stylesheet and holds
    them to 4.5:1 over every palette's felt and every felt a player can
    choose; it fails four cases at 50%.
  - A label on the accent's fill is `--text-on-accent` (`on-accent`).
- **Buttons:** flat pills, the fill and its `on-*` label, no gradient, shadow
  or lift. The gradient text went from the wordmark, Victory, the
  confirmation title and the loading badge, and with it the `gradient-text`
  mixin. Surface gradients the mock kept (the rules callout, the shimmers,
  Victory's glow) stay.
- **The felt:** `model/table_theme.ts` became `model/table_felt.ts`, and
  Solitaire's felt code says felt, not theme. The choice is `FeltChoice`, a
  felt or `"theme"`, the default, stored as `felt`; an earlier `theme` or
  `backgroundColor` carries over, with the Emerald Felt, every earlier
  player's default, becoming `"theme"`. `PresentationSettingsService`
  resolves it through `ThemeService.role("felt")`, falling back to the
  Emerald colour where no stylesheet sets one (jsdom). The bug report names
  the felt choice and the palette.
- **The chrome:** `AppComponent` puts `darkTheme(current)` on its host, so
  every overlay and the canvas's loading badge wear it; the app provides
  `THEME_COLOR_ROLE` as `null` and sets `theme-color` from the felt itself
  (`index.html` starts it at `#0f4d0e`). That effect first read the felt only
  when the tag existed, so with no tag it never tracked the felt; a spec
  caught it.
- **Game options:** a Theme section (`fz-theme-picker`, one column in the
  320px drawer, "Shared with fuzzley.games and every game.") and Felt in
  place of Table Theme: a "From the theme" pill whose dot carries the
  palette's `data-theme`, then the four felts, captioned "Felt: from the
  theme (Casino night)" or "Felt: Deep Ocean".
- **Specs:** the fake viewport answers `prefers-color-scheme` (as light); the
  bug report spec provides `THEME_COLOR_ROLE` as `null`, as `main.ts` does,
  so the palette never asks its fake windows for colours; the spec tsconfig
  gains Node's types for the contrast spec.
- **Checked:** `yarn verify` passed (Solitaire 6984 specs). Screenshots of
  every state and form factor in Emerald felt, Classic felt and Midnight
  blue, against the mock: the board, header, drawer, rules, browser,
  confirmation, Victory and overflow match it, with the more solid header.
  The site's theme menu draws the shared swatch correctly.
- **Not done here:** the docs' screenshots wait for Phase 7, as the plan
  says.
- **Next:** Phase 6, one commit per piece.

### 2026-10-24: Phase 6, storage

- `LocalStorageService` moved from Solitaire to `@fz/ui/storage`, built on
  `BROWSER_STORAGE`; its spec moved with it and hands the service a store
  that refuses everything, or none, rather than spying on `Storage`.
- `readObject()` returns `object | null` instead of taking a type parameter,
  which `@fz/ui`'s lint rejects as a cast in disguise. Solitaire's two callers
  that read fields name the shape they expect at the call site, where their
  checks are; the two that read lists pass the value to their readers as is.

### 2026-10-24: Phase 6, the radio group

- `RadioGroupDirective` moved to `@fz/ui/radio_group` as `[fzRadioGroup]`,
  without the engine's `itemAt`. Its spec moved too, rewritten for Testing
  Library and user-event (Space chooses through the button's click; ArrowUp
  and ArrowDown are covered as well as left and right). Solitaire's
  `directive/` folder is gone.

### 2026-10-24: Phase 6, the dialog

- `<app-modal-dialog>` moved to `@fz/ui/dialog` as `<fz-dialog>`, with the
  same inputs and output (its role type is `DialogRole` now). Its spec moved
  too, rewritten for Testing Library: it opens the dialog by a button and
  closes it by another, so it also checks that focus goes back to the opener.
- Its backdrop reads `--fz-dialog-backdrop`, which no app sets yet, and falls
  back to the slate scrim Solitaire has always had. An engine whose
  `::backdrop` doesn't inherit custom properties gets the fallback too.
- The jsdom `<dialog>` polyfill moved to `@fz/ui/testing`, which both
  Solitaire's spec setup and the library's install. It keeps the element
  focused before opening in a `WeakMap` now, not on the element.
- The five overlays switched; the open overlays are pixel-identical to Phase
  5's shots, apart from blur noise (at most 3 levels out of 255) in the
  header behind the backdrop.

### 2026-10-24: Phase 6, the icons

- The order changed: the icons and the buttons go before the confirmation
  dialog, since the library's dialog needs the warning icon and the danger
  and secondary buttons, and a library can't use an app's.
- `fz-icon` gained the fifteen glyphs the mock settled, drawn as there, and
  `ICON_NAMES`, from which `IconName` comes, so the spec checks every icon
  draws something. `more` is filled, like `play`.
- Every inline glyph in Solitaire is an `<fz-icon>` now (21 of them); the
  header bar's shared `<ng-template>` icons are gone, since each is a line.
  The card-deck preview in the settings stays an inline `<svg>`: it is a
  drawing.
- `fz-icon` sizes itself by `--fz-icon-size` as well as `width` and `height`.
  Its `:host` is unlayered, so it outranked Solitaire's global `.btn-icon`
  size (the settings drawer's icons fell to 1em), and it would outrank any
  `@fz/style` fragment; an inherited property gets through both.
- The 64px warning and the 80px trophy draw at a stroke of 1.5, since the
  small icons' 2 reads as bold at that size. The rules dialog's close button
  is still a text "×"; Phase 7's pass over the overlays can take it.
