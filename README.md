# Fuzzley Games

A gallery of card and puzzle games to play in your browser, starting with the
games of the [Solitaire Collection](https://github.com/fuzzley/fSolitaire),
from Klondike and Spider to Pyramid and TriPeaks, and
[Minesweeper](https://github.com/fuzzley/fMinesweeper).

Play at https://fuzzley.games.

## Development

The portal is an [Angular](https://angular.dev/) single-page app (standalone
components, Signals, zoneless) built with [Vite](https://vite.dev/)
(`@analogjs/vite-plugin-angular`), styled with [Sass](https://sass-lang.com/)
and palettes of CSS custom properties, and served by nginx in a Docker
container on Google Cloud Run. The hosted games are built in their own
repositories and served as static pages under `/play/<slug>/`.

Dependency management and development scripts use [Yarn](https://yarnpkg.com/)
(Berry v4) on Node 26 (`.node-version`). Run all `yarn` commands from
`frontend/`:

```sh
cd frontend

yarn install     # install dependencies
yarn dev         # start the dev server on http://localhost:4200 (or yarn start)
yarn build       # fetch pinned games and build production assets into dist/
yarn preview     # serve the production build locally
yarn test        # run unit tests with Vitest
yarn lint        # check skill references, ESLint, stylelint, and formatting
yarn typecheck   # type-check the app, its specs, the Vite config and the scripts
yarn verify      # lint, type-check, test, and build in one go
yarn prettier    # format the repository with Prettier
yarn games       # fetch the pinned game builds into public/play/
```

`yarn dev` and `yarn build` fetch the games pinned in `frontend/games.json`
first; the dev server starts without them when offline. The Solitaire
Collection is then at http://localhost:4200/play/solitaire/ and Minesweeper
at http://localhost:4200/play/minesweeper/.

The portal application code lives in `frontend/src/app/` (bootstrapped by
`frontend/src/app/main.ts`), with theme palettes and shared styles in
`frontend/src/app/styles/`, in Sass. The games the site lists are defined
in `frontend/src/app/provider/games.ts`. Pinned game builds are tracked in
`frontend/games.json` and unpacked into `frontend/public/play/<slug>/`.

Detailed operations, local Docker execution, game pinning, and Cloud Run
deployment are documented in [docs/operations.md](docs/operations.md).

Agent configuration and reusable skills live in `.agents/skills/`. Run
`node .agents/link-claude-skills.mjs` once per clone to link skills across for
Claude Code discovery.
