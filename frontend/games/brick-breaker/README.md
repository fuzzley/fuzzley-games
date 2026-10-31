# Brick Breaker

Brick Breaker: bounce the ball off your paddle, break every brick and keep
the ball off the floor. Play it at https://fuzzley.games/play/brick-breaker/.

An [Angular](https://angular.dev/) app on the Fuzzley Games shared libraries
(`frontend/lib/`), with its field drawn by [Phaser](https://phaser.io/)
through `@fz/phaser`, built with [Vite](https://vite.dev/) and tested with
[Vitest](https://vitest.dev/), the scene against real Phaser run headless.
It holds thirty levels in three sets, with tough, steel, blast, gift, ghost
and regrowing bricks, eleven capsules and three kinds of ball, all played by
rules that run without a framework, physics included. It plays at three
speeds or one the player sets, by mouse, keyboard or touch, pauses whenever
the field loses the player, wears whichever palette the player chose on the
site, and keeps a run under way across a reload, paused. Phaser loads after the page has
painted, behind a drawing of the empty field.

## Development

Brick Breaker is a Yarn workspace of the Fuzzley Games frontend. Run these
from `frontend/`:

```sh
yarn install                                     # install dependencies, once per clone
yarn workspace brick-breaker dev                 # dev server on http://localhost:9004
yarn workspace brick-breaker test                # unit tests
yarn workspace brick-breaker build               # production build in dist/
yarn workspace brick-breaker check:layout        # the build's layout, in headless Chrome
yarn workspace brick-breaker report:levels       # how long each level takes the autopilot
yarn workspace brick-breaker build:sounds        # write the sounds again
yarn workspace brick-breaker capture:screenshots # the site's screenshots, from the dev server
```

The site's `yarn build` builds it, copies `dist/` to `/play/brick-breaker/`,
and adds the site's analytics tags.

## License

This project source code is licensed under the [GNU General Public License v3.0 or later](LICENSE).
