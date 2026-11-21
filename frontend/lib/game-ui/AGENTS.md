# @fz/game-ui

These rules hold for `@fz/game-ui`, the chrome the games share and the site
doesn't. The frontend's, in [frontend/AGENTS.md](../../AGENTS.md), and the
repository's apply too.

- **Nothing a bar's menu sits inside may become a containing block.** A
  menu's dismiss layer is `position: fixed`, to cover the window, and a
  `transform`, `filter`, `backdrop-filter`, `contain` or container query on
  any ancestor holds it inside that ancestor. The tap that should only close
  the menu then presses the board, and no spec fails, since jsdom lays
  nothing out. That is why the bar's glass is on its `::before`, and why the
  bar takes its layout from inputs, never from a container query.
