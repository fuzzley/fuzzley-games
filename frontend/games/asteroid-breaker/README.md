# Asteroid Breaker

Asteroid Breaker: fly, drift and blast every rock to rubble before one finds
you. It is being built, and isn't on the site yet.

An [Angular](https://angular.dev/) app on the Fuzzley Games shared libraries
(`frontend/lib/`), its field to be drawn by [Phaser](https://phaser.io/)
through `@fz/phaser`, built with [Vite](https://vite.dev/) and tested with
[Vitest](https://vitest.dev/).

## Development

Asteroid Breaker is a Yarn workspace of the Fuzzley Games frontend. Run
these from `frontend/`:

```sh
yarn install                           # install dependencies, once per clone
yarn workspace asteroid-breaker dev    # dev server on http://localhost:9005
yarn workspace asteroid-breaker test   # unit tests
yarn workspace asteroid-breaker build  # production build in dist/
```

## License

This project source code is licensed under the [GNU General Public License v3.0 or later](LICENSE).
