# @fz/game-ui

The `@fz/game-ui` library (`frontend/lib/game-ui`): the Angular chrome the
games share and the site doesn't, so every game is framed alike. It builds
on `@fz/ui` ([frontend/lib/ui/AGENTS.md](../ui/AGENTS.md)) and `@fz/style`
([frontend/lib/style/AGENTS.md](../style/AGENTS.md)), and keeps their rules:
everything carries `fz`, a component reads no viewport, accessibility is the
component's job, and the same strict compiler options and checks. The
repository's rules are in [.agents/AGENTS.md](../../../.agents/AGENTS.md).
Paths are relative to `frontend/lib/game-ui/`.

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
  and `--fz-bar-actions-gap`.
- `src/bar_overflow/`: `<fz-bar-overflow>`, the "More actions" button and
  the Angular Aria menu it opens, of what the bar has no room for. The items
  are data (`BarOverflowItem`), since Angular Aria finds a menu's items in
  the template that declares the menu; one with an `href` is a link, which
  the browser follows, and the rest emit their `id` through `choose`. Inside
  a `<fz-game-bar>` the menu opens away from the bar's edge. While it is
  open, a transparent layer over the window takes the tap that closes it,
  so the tap doesn't reach the board.
- `src/_index.scss`: the Sass an app reaches with `@use "@fz/game-ui"`. Its
  `bar-size()` mixin publishes the bar's size as `--fz-bar-height` and
  `--fz-rail-width` for what lays itself out around the bar, such as a
  game's board: an app includes it on `:root`, and with `$compact: true`
  wherever it binds the bar's `compact`. The bar can't declare them itself,
  since a custom property reaches only what sits inside its element.

## How an app uses it

- **From source, never built**, as `@fz/ui` is: an app lists
  `"@fz/game-ui": "workspace:*"` beside `@fz/ui` and `@fz/style`, and loads
  `@fz/style`'s global stylesheet.
- **The app decides the layout.** It binds `placement`, `reversed`,
  `compact` and `home` to its own breakpoints and form factors; the bar
  never asks the window.
- **Imports go one way.** This library imports `@fz/ui`, `@fz/style` and
  Angular, never the site or a game, and the site has no use for it.

## Rules

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
beside the file it tests.
