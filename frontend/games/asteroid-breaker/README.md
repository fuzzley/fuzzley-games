# Asteroid Breaker

Asteroid Breaker: fly, drift and blast every rock to rubble before one finds
you. Play it at https://fuzzley.games/play/asteroid-breaker/.

An [Angular](https://angular.dev/) app on the Fuzzley Games shared libraries
(`frontend/lib/`), with its field drawn by [Phaser](https://phaser.io/)
through `@fz/phaser`, built with [Vite](https://vite.dev/) and tested with
[Vitest](https://vitest.dev/), the scene against real Phaser run headless.
It holds thirty waves in three sectors, then Endless, whose waves are made
as they are played, with stone, crystal, ice, iron, volatile and lodestone
rocks and a boulder to end each sector; eight pickups, Spread, Rapid and
Lance, which give the ship another weapon than its gun for a while, and
Shield, Magnet, Slow, Nova and Extra ship; and stray fuzzballs to bring home
and comets to dodge, all played by rules that run without a framework,
physics included, on a field that wraps at every edge. It plays at three
speeds, by keyboard, mouse or touch, with a stick, Fire and Dash on a touch
screen, pauses whenever the field loses the player, wears whichever palette
the player chose on the site, and keeps a run under way across a reload,
paused. Phaser loads after the page has painted, behind a drawing of the
empty field.

## Development

Asteroid Breaker is a Yarn workspace of the Fuzzley Games frontend. Run
these from `frontend/`:

```sh
yarn install                                        # install dependencies, once per clone
yarn workspace asteroid-breaker dev                 # dev server on http://localhost:9005
yarn workspace asteroid-breaker test                # unit tests
yarn workspace asteroid-breaker build               # production build in dist/
yarn workspace asteroid-breaker check:layout        # the build's layout, in headless Chrome
yarn workspace asteroid-breaker report:waves        # how the autopilot plays each wave
yarn workspace asteroid-breaker build:sounds        # write the sounds again
yarn workspace asteroid-breaker capture:screenshots # the site's screenshots, from the dev server
```

The site's `yarn build` builds it, copies `dist/` to `/play/asteroid-breaker/`,
and adds the site's analytics tags.

## License

This project source code is licensed under the [GNU General Public License v3.0 or later](LICENSE).
