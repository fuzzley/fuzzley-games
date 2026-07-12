Just a simple Klondike Solitaire clone, written in TypeScript and Angular.
The project utilizes [Phaser](https://phaser.io/) for the game rendering/canvas and [Angular](https://angular.dev/) for the user interface.

The [latest version of the game](http://fuzzley.info/project/solitaire/) is hosted on http://fuzzley.info/project/solitaire/.

Have fun!

## Development

This project uses [yarn](https://yarnpkg.com/) for dependency management and
[Vite](https://vite.dev/) for the dev server and production build.

```sh
yarn install     # install dev dependencies
yarn dev         # start the dev server on http://localhost:9000
yarn build       # produce a production build in dist/
yarn preview     # serve the production build locally
yarn test        # run tests with Vitest
yarn lint        # run ESLint
yarn prettier    # format the code with Prettier
```

The game code lives in `src/` (bundled by Vite via `src/ui/app/main.ts`). The Angular UI components are located in `src/ui/`, while the Phaser game logic, rendering, and asset setup reside in `src/game/`.
