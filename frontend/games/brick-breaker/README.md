# Brick Breaker

Brick Breaker: bounce the ball off your paddle, break every brick, and keep
the ball off the floor. It is being built, and will be played at
https://fuzzley.games/play/brick-breaker/.

An [Angular](https://angular.dev/) app on the Fuzzley Games shared libraries
(`frontend/lib/`), with its field drawn by [Phaser](https://phaser.io/)
through `@fz/phaser`, built with [Vite](https://vite.dev/) and tested with
[Vitest](https://vitest.dev/).

## Development

Brick Breaker is a Yarn workspace of the Fuzzley Games frontend. Run these
from `frontend/`:

```sh
yarn install                       # install dependencies, once per clone
yarn workspace brick-breaker dev   # dev server on http://localhost:9004
yarn workspace brick-breaker test  # unit tests
yarn workspace brick-breaker build # production build in dist/
```

## License

This project source code is licensed under the [GNU General Public License v3.0 or later](LICENSE).
