# Snake

Snake: eat the apples, grow longer, and keep clear of the walls and your own
tail. Play it at https://fuzzley.games/play/snake/.

An [Angular](https://angular.dev/) app on the Fuzzley Games shared libraries
(`frontend/lib/`), with its board drawn by [Phaser](https://phaser.io/)
through `@fz/phaser`, built with [Vite](https://vite.dev/) and tested with
[Vitest](https://vitest.dev/), the scene against real Phaser run headless.
It plays at three speeds, by keyboard, swipe or on-screen arrows, pauses
whenever the board loses the focus, wears whichever palette the player
chose on the site, and keeps a run under way across a reload, paused.
Phaser loads after the page has painted, behind a drawing of the empty
board.

## Development

Snake is a Yarn workspace of the Fuzzley Games frontend. Run these from
`frontend/`:

```sh
yarn install                             # install dependencies, once per clone
yarn workspace snake dev                 # dev server on http://localhost:9003
yarn workspace snake test                # unit tests
yarn workspace snake build               # production build in dist/
yarn workspace snake check:layout        # the build's layout, in headless Chrome
yarn workspace snake build:sounds        # write the sounds again
yarn workspace snake capture:screenshots # the site's screenshots, from the dev server
```

The site's `yarn build` builds it, copies `dist/` to `/play/snake/`, and
adds the site's analytics tags.

## License

This project source code is licensed under the [GNU General Public License v3.0 or later](LICENSE).
