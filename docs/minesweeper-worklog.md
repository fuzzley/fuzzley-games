# Minesweeper work log

The running record of [Minesweeper's plan](minesweeper-ui-plan.md): what is
done, what was found, and where to pick up. The newest entry is last. Delete
this file in the commit that finishes the plan; it stays in that commit's
parent.

## Where things stand

- **Branch:** `minesweeper-angular`, from `main` at `d1b77db`. Not pushed: a
  push to `main` deploys, so shipping waits for the user's go-ahead.
- **Phase:** M2, the rules.
- **Next step:** M2.

| Phase                 | State     |
| --------------------- | --------- |
| M0. Mock and spike    | in review |
| M1. Scaffold          | to do     |
| M2. The rules         | to do     |
| M3. The new icons     | to do     |
| M4. The board         | to do     |
| M5. Bar and dialogs   | to do     |
| M6. Storage           | to do     |
| M7. The checks        | to do     |
| M8. Screenshots, docs | to do     |
| M9. Ship              | to do     |

## How to check the work

From `frontend/`: `yarn verify` runs every check. On this machine, Docker is
usually off and port 4200 is taken (see the dev-environment notes in Claude's
memory); start Vite with `--port <n> --strictPort`, and run one headless
Chrome at a time.

## Log

### 2026-10-25: the plan agreed

- The user answered "Yes proceed" to the plan and to committing it, which
  takes every decision as recommended. Decision 4 (the numbers' inks) is
  still shown both ways in the mock, and nothing in Minesweeper changes until
  the user approves the mock.

### 2026-10-25: the spike

- Thrown away, as planned: a zoneless app in Solitaire's workspace with a
  30 × 30 `ngGrid` of cells, against the same grid without the directives.
- **Keys:** one tab stop for 900 cells; the arrows, End and Ctrl+End move
  it, the grid sets `aria-rowindex` and `aria-colindex`, and with selection
  off it leaves Enter, Space and F to the cell's own handler.
- **Speed, production build at Chrome's 4× CPU throttle:** the first render
  takes about 1 s; revealing one cell 14–19 ms; a flood that opens the whole
  board 240–260 ms. Unthrottled in dev, the flood takes 32–60 ms against
  33–39 ms without the grid.
- **The flood's cost is the browser's.** Writing the same changes straight
  to the DOM takes 240–420 ms at 4×, and toggling only the class about
  160 ms; `contain: strict` on the cells changes nothing. So the plan's "a
  flood repaints within a frame or two" holds for a move, not for the
  worst flood, and no framework would change that. The grid stays; the
  plan's risks now say so, and M4 keeps the cells' styles cheap.
- **Weight:** the spike's production bundle, zoneless Angular with the
  grid, is 52 kB gzipped, against the 111 kB of scripts the game loads
  today.

### 2026-10-25: the mock

- Published privately:
  [Minesweeper on the shared libraries: the mock](https://claude.ai/artifact/PaFG5PCV4EgQegAN4hAdeW).
  Built from the libraries' real Sass and icons by a generator script, with
  a seeded game for the boards; the generator lives outside the repository.
- It shows the game wide and on phones, the bar and its overflow, the
  turned board, the settings, the confirmation, a win, a loss and How to
  play; the numbers' inks both ways in every palette (decision 4); and the
  three new icons.
- **The cell pitch** (a square and its gap) runs from 24 px to 42 px, so a
  square can be 22 px; WCAG 2.5.8's spacing exception allows it. The plan's
  design section says so now.
- **Contrast, checked per palette:** every number's ink clears 4.5:1 on an
  open square, the lowest Soft pastel's 3 at 4.9:1; hidden squares against
  open ones 4.3:1 at the least (Classic felt); flags and mines on their
  squares over 5:1.
- **For decision 7, later:** the settings drawer borrows Solitaire's choice
  rows, segmented control and field labels. If Minesweeper keeps them, they
  are the first candidates to lift into `@fz/game-ui`.

### 2026-10-25: the mock approved

- The user approved the mock and asked for what it recommends: decision 4
  takes the classic inks. Implementation starts with M1.

### 2026-10-25: M1, the scaffold

- The 2016 code, its vendored scripts, styles and fonts are gone, and
  `.prettierignore` no longer skips Minesweeper.
- The workspace follows `@fz/ui`'s layout: specs beside the code under
  `src/`, a solution `tsconfig.json` with the libraries' options, and
  ESLint's boundary keeping `src/game/` free of Angular, the libraries and
  the shell. `tsconfig.node.json` needs `allowImportingTsExtensions`, as the
  site's does, for `@fz/style`'s Vite plugin.
- Beyond Solitaire's dependencies it takes Testing Library and, for it and
  `@angular/build`, `@angular/router` and `postcss`, as `@fz/ui` does.
- **Size:** the shell alone builds to 41.7 kB of script and 2.9 kB of CSS,
  gzipped, against 158 kB before.
- `yarn verify` passed, with the site's build copying and tagging the new
  `dist/`.
