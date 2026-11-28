# Fuzz Flux

Swap fuzzballs to line up 3 of a kind. Meet each goal before your moves run
out. There are 36 levels, with no timer and no lives. Play it at
https://fuzzley.games/play/fuzz-flux/. It is still being built, so it may
change.

It is an [Angular](https://angular.dev/) app on the Fuzzley Games shared
libraries (`frontend/lib/`), built with [Vite](https://vite.dev/) and tested
with [Vitest](https://vitest.dev/). [Phaser](https://phaser.io/) draws its
board, through `@fz/phaser`. Its rules, levels, look and sound are designed
in `docs/fuzz-flux/`.

## Development

Fuzz Flux is a Yarn workspace of the Fuzzley Games frontend. Run these from
`frontend/`:

```sh
yarn install                                  # install dependencies, once per clone
yarn workspace fuzz-flux dev                  # dev server on http://localhost:9008
yarn workspace fuzz-flux test                 # unit tests
yarn workspace fuzz-flux build                # production build in dist/
yarn workspace fuzz-flux check:layout         # the build's layout, in headless Chrome
yarn workspace fuzz-flux capture:screenshots  # the site's images, from yarn dev
yarn workspace fuzz-flux build:sounds         # write the sounds again
yarn workspace fuzz-flux certify:deals        # prove every deal can be cleared
yarn workspace fuzz-flux report:levels        # play every level as the design's report does
```

## License

This project source code is licensed under the [GNU General Public License v3.0 or later](LICENSE).
