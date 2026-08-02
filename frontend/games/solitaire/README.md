# fSolitaire

A browser-based Solitaire game engine supporting multiple solitaire variants, built with [Phaser 4](https://phaser.io/) canvas rendering, an [Angular 22](https://angular.dev/) application shell, and [Sass](https://sass-lang.com/) for UI styling.

The [latest version of the game](http://fuzzley.info/project/solitaire/) is hosted at http://fuzzley.info/project/solitaire/.

## Included Solitaire Games

- **Klondike**: Classic solitaire supporting Draw 1 and Draw 3 modes.
- **FreeCell**: The classic open-information solitaire puzzle game.
- **Spider**: Multi-suit spider solitaire with options for 1-Suit (Easy), 2-Suit (Medium), and 4-Suit (Hard) games.
- **Yukon**: Playable in standard Yukon, Alaska, and Russian Solitaire variants.
- **Baker's Game**: Predecessor to FreeCell, with choices for any-card or Kings-only empty columns.
- **Eight Off**: Similar to FreeCell but with eight reserve cells and same-suit column building.
- **Scorpion**: Yukon-style unconstrained card group moves with a reserve stock.

## Development

This project uses [Yarn](https://yarnpkg.com/) for dependency management and [Vite](https://vite.dev/) for the dev server and production build.

```sh
yarn install     # install dev dependencies
yarn dev         # start the dev server on http://localhost:9000
yarn build       # produce a production build in dist/
yarn preview     # serve the production build locally
yarn test        # run tests with Vitest
yarn lint        # run ESLint
yarn prettier    # format the code with Prettier
yarn skills:link # link agent skills from .agents/skills to .claude/skills
```

The game code lives in `src/` (bundled by Vite via `src/ui/app/main.ts`). The Angular UI components and Sass design system (`src/ui/app/styles/`) are located in `src/ui/`, while the Phaser game logic, rendering, and solitaire runtime reside in `src/engine/` and `src/games/`.

Agent configuration and reusable skills live in `.agents/skills/`. Run `yarn skills:link` to link skills across for Claude Code discovery.

## License

This project source code is licensed under the [GNU General Public License v3.0 only](LICENSE).

The playing card artwork is [Vector Playing Cards](https://sourceforge.net/projects/vector-cards/) by Chris Aguilar, copyright 2011, used under the [GNU Lesser General Public License v3.0](https://www.gnu.org/licenses/lgpl-3.0.html). See [NOTICE](NOTICE) for the files it covers and for how to substitute a different deck.
