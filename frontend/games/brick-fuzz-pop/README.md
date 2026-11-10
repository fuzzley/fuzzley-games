# Brick Fuzz Pop

Brick Fuzz Pop: aim the fuzzball, charge it with static and let it punch
through the wall before the bricks reach the floor. It is being built, and
isn't on the site yet.

An [Angular](https://angular.dev/) app on the Fuzzley Games shared libraries
(`frontend/lib/`), its field to be drawn by [Phaser](https://phaser.io/)
through `@fz/phaser`, built with [Vite](https://vite.dev/) and tested with
[Vitest](https://vitest.dev/).

## Development

Brick Fuzz Pop is a Yarn workspace of the Fuzzley Games frontend. Run these
from `frontend/`:

```sh
yarn install                         # install dependencies, once per clone
yarn workspace brick-fuzz-pop dev    # dev server on http://localhost:9006
yarn workspace brick-fuzz-pop test   # unit tests
yarn workspace brick-fuzz-pop build  # production build in dist/
```

## License

This project source code is licensed under the [GNU General Public License v3.0 or later](LICENSE).
