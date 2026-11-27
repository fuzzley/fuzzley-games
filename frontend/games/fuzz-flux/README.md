# Fuzz Flux

Swap fuzzballs to line up 3 of a kind. Meet each goal before your moves run
out.

Fuzz Flux is still being built. It is an [Angular](https://angular.dev/) app
on the Fuzzley Games shared libraries (`frontend/lib/`), its board to be
drawn by [Phaser](https://phaser.io/) through `@fz/phaser`, built with
[Vite](https://vite.dev/) and tested with [Vitest](https://vitest.dev/).

## Development

Fuzz Flux is a Yarn workspace of the Fuzzley Games frontend. Run these from
`frontend/`:

```sh
yarn install                    # install dependencies, once per clone
yarn workspace fuzz-flux dev    # dev server on http://localhost:9008
yarn workspace fuzz-flux test   # unit tests
yarn workspace fuzz-flux build  # production build in dist/
```

## License

This project source code is licensed under the [GNU General Public License v3.0 or later](LICENSE).
