# @fz/game-ui

The `@fz/game-ui` library (`frontend/lib/game-ui`): the Angular chrome the
games share and the site doesn't, so every game is framed alike. It builds
on `@fz/ui` ([frontend/lib/ui/AGENTS.md](../ui/AGENTS.md)) and `@fz/style`
([frontend/lib/style/AGENTS.md](../style/AGENTS.md)), and keeps their rules:
everything carries `fz`, a component reads no viewport, accessibility is the
component's job, and the same strict compiler options and checks. The
frontend's rules are in [frontend/AGENTS.md](../../AGENTS.md), and the
repository's in [.agents/AGENTS.md](../../../.agents/AGENTS.md). Paths are
relative to `frontend/lib/game-ui/`.

## What it holds

One folder under `src/` per entry point, each with an `index.ts` that names
what it exports; an app imports it as `@fz/game-ui/<folder>`.

- `src/game_bar/`: `<fz-game-bar>`, the bar a game sits under. It leads with
  the link home (`home`: the wordmark, the round home button, or `none`; a
  rail shows the button), then lays out what the app projects into it: its
  title (`fzBarTitle`), its status (`fzBarStatus`) and each of its actions
  (`fzBarActions`). `placement` stands it across the `top`, along the
  `bottom`, or down the `start` or `end` side as a rail; `reversed` runs a
  row from its end, and `compact` makes it shorter and tighter. At the top
  it takes its place in the flow; elsewhere it stands against that edge of
  its containing block, which the app positions. The app styles what it
  projects, and can tune a bar that isn't compact through `--fz-bar-gap`
  and `--fz-bar-actions-gap`. Its surface is `@fz/style`'s
  `--fz-bar-glass`: glass over the game in a dark palette, solid in a light
  one.
- `src/bar_overflow/`: `<fz-bar-overflow>`, the "More actions" button and
  the Angular Aria menu it opens, of what the bar has no room for. The items
  are data, since Angular Aria finds a menu's items in the template that
  declares the menu: a `BarOverflowLink`, with an `href`, which the browser
  follows, or a `BarOverflowAction<Id>`, which emits its `id` through
  `choose`. The component takes `Id` from the items it is given, so an app
  that names its actions' ids (`BarOverflowItem<MenuAction>`) gets them back
  typed, and a misspelled one fails to compile. Inside a `<fz-game-bar>`
  the menu opens away from the bar's edge. While it is open, a transparent
  layer over the window takes the tap that closes it, so the tap doesn't
  reach the board. `withHomeLink(items, href)` leads the items with the
  link home, for a bar with no room for it.
- `src/viewport/`: `GameViewportService`, which follows the shape of the
  window: its `formFactor` (`roomy`, `phone-portrait` or
  `phone-landscape`), `isCompact` and `isPortrait`, where the bar stands
  (`barPlacement`), whether the bar has room for the wordmark
  (`fitsWordmark`) and the home button (`fitsHomeButton`), and so how it
  shows the link home (`barHome`: the wordmark on a roomy window from 1280
  CSS px, the button below that or on a compact one, and `none` below
  360). A host without `matchMedia` reads as roomy.
- `src/breakpoints/`: the widths every game changes shape at. `index.ts`
  holds them as constants, with `formFactorAt()`, and imports no Angular,
  so a game's renderer can read them as well as its shell. `_index.scss`
  holds them for Sass: `below()` and `from()` a named width (`tablet`,
  `desktop`), and `compact`, `phone-portrait` and `phone-landscape`, which
  apply the service's tests. `breakpoints.spec.ts` compiles the mixins and
  holds them to the constants.
- `src/stopwatch/`: `StopwatchService`, a game's clock, in whole seconds,
  which counts only while the page is in view. It reads the time from the
  clock rather than counting its ticks, so a pause keeps the part of a
  second under way and a late tick loses nothing; `reset()` holds the time
  of a game taken up again. `formatClock()` writes a time as a game's clock
  shows it, "2:13", or "1:02:13" past an hour.
- `src/testing/`: what a game's specs share. `installFakeViewport()` stands
  in for the `matchMedia` jsdom lacks, at a size a spec sets and changes.
- `src/_index.scss`: the Sass an app reaches with `@use "@fz/game-ui"`. It
  forwards the breakpoints' mixins, and its `bar-size()` mixin publishes the
  bar's size as `--fz-bar-height` and `--fz-rail-width` for what lays itself
  out around the bar, such as a game's board: an app includes it on
  `:root`, and with `$compact: true` wherever it binds the bar's `compact`.
  The bar can't declare them itself, since a custom property reaches only
  what sits inside its element.

## How an app uses it

- **From source, never built**, as `@fz/ui` is: an app lists
  `"@fz/game-ui": "workspace:*"` beside `@fz/ui` and `@fz/style`, and loads
  `@fz/style`'s global stylesheet.
- **The app decides the layout.** It binds `placement`, `reversed`,
  `compact` and `home` to what `GameViewportService` says (`home` to
  `barHome`, with the overflow menu led by `withHomeLink()` when that is
  `none`); the bar never asks the window. A game's stylesheets take the
  same widths from the mixins, which an app's toolkit can forward by name,
  as `frontend/games/minesweeper/src/app/styles/_index.scss` does.
- **Imports go one way.** This library imports `@fz/ui`, `@fz/style` and
  Angular, never the site or a game, and the site has no use for it.

## Rules

- **A width every game changes shape at is written once**, in
  `src/breakpoints/`, for TypeScript and for Sass, which its spec keeps
  equal. A width only one game means something by stays in that game.
- **Nothing inside the bar may become a containing block.** The overflow's
  dismiss layer is `position: fixed` to cover the window, which a
  `backdrop-filter`, `transform`, `filter`, `contain` or container query on
  an ancestor would trap inside that ancestor. So the bar's glass is on its
  `::before`, beneath an `isolation: isolate` that keeps it behind the bar's
  content, and the bar takes its layout from inputs, not container queries.

## Checks

The root's `yarn lint`, `yarn typecheck` and `yarn test` run the library's
own, which `yarn workspace @fz/game-ui <script>` runs alone. They are
`@fz/ui`'s, with the same configs: ESLint and stylelint, the Angular
compiler's checks, and Vitest with jsdom and Testing Library, each spec
beside the file it tests, which fails below the coverage floor in
`vitest.config.ts`.
