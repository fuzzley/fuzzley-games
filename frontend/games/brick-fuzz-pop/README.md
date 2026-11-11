# Brick Fuzz Pop

Brick Fuzz Pop: aim the fuzzball, charge it with static and let it punch
through the wall before the bricks reach the floor. Play it at
https://fuzzley.games/play/brick-fuzz-pop/.

An [Angular](https://angular.dev/) app on the Fuzzley Games shared libraries
(`frontend/lib/`), with its field drawn by [Phaser](https://phaser.io/)
through `@fz/phaser`, built with [Vite](https://vite.dev/) and tested with
[Vitest](https://vitest.dev/), the scene against real Phaser run headless.
It holds thirty-six levels in four sets, Warm-up, Sparks, Tricks and Thick
walls, played by rules that run without a framework, the flight included. It
plays at two speeds, with fast-forward, by mouse, keyboard or touch, pauses
whenever the field loses the player, wears whichever palette the player
chose on the site, and keeps a run under way across a reload, paused. Phaser
loads behind a drawing of the empty field.

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
