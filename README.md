# Fuzzley Games

A gallery of card and puzzle games to play in your browser, starting with the
games of the [Solitaire Collection](https://github.com/fuzzley/fSolitaire),
from Klondike and Spider to Pyramid and TriPeaks, and
[Minesweeper](frontend/apps/minesweeper/).

Play at https://fuzzley.games.

## Development

The portal is an [Angular](https://angular.dev/) single-page app (standalone
components, Signals, zoneless) built with [Vite](https://vite.dev/)
(`@analogjs/vite-plugin-angular`), styled with [Sass](https://sass-lang.com/)
and palettes of CSS custom properties, and served by nginx in a Docker
container on Google Cloud Run. Minesweeper is built here, in
`frontend/apps/minesweeper/`, and the Solitaire Collection in its own
repository; both are served as static pages under `/play/<slug>/`.

Dependency management and development scripts use [Yarn](https://yarnpkg.com/)
(Berry v4) on Node 26 (`.node-version`). `frontend/` is the workspace root for
all client code: the site is the `site` workspace, in `frontend/site/`, and
each game built here is a workspace under `frontend/apps/`. Run all `yarn`
commands from `frontend/`:

```sh
cd frontend

yarn install     # install dependencies
yarn dev         # start the dev server on http://localhost:4200 (or yarn start)
yarn build       # build and fetch the games, then build the site into site/dist/
yarn preview     # serve the production build locally
yarn test        # run every workspace's unit tests
yarn lint        # check skill references, lint every workspace, and check formatting
yarn typecheck   # type-check the scripts and every workspace
yarn verify      # lint, type-check, test, and build in one go
yarn prettier    # format the repository with Prettier
yarn games       # build and fetch the games into site/public/play/

yarn workspace minesweeper dev   # work on Minesweeper alone, on http://localhost:9000
```

`yarn dev` and `yarn build` first build the games in `frontend/apps/` and
fetch the ones pinned in `frontend/site/games.json`; the dev server starts
without the pinned ones when offline. The Solitaire Collection is then at
http://localhost:4200/play/solitaire/ and Minesweeper at
http://localhost:4200/play/minesweeper/.

The portal application code lives in `frontend/site/src/app/` (bootstrapped
by `frontend/site/src/app/main.ts`), with theme palettes and shared styles in
`frontend/site/src/app/styles/`, in Sass. The games the site lists are
defined in `frontend/site/src/app/provider/games.ts`.
`frontend/site/games.json` lists each game's build, a workspace or a pinned
release, and each is put into `frontend/site/public/play/<slug>/`.

Detailed operations, local Docker execution, game pinning, and Cloud Run
deployment are documented in [docs/operations.md](docs/operations.md).

Agent configuration and reusable skills live in `.agents/skills/`. Run
`node .agents/link-claude-skills.mjs` once per clone to link skills across for
Claude Code discovery.
