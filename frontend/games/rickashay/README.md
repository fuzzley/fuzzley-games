# Rickashay

Aim the fuzzball, and it bounces off every wall and brick. The more bricks a
shot hits, the more you score.

Rickashay is still being built. It is an [Angular](https://angular.dev/) app
on the Fuzzley Games shared libraries (`frontend/lib/`), among them
`@fz/brick-wall`, which it shares with Brick Fuzz Pop, its field to be drawn
by [Phaser](https://phaser.io/) through `@fz/phaser`, built with
[Vite](https://vite.dev/) and tested with [Vitest](https://vitest.dev/).

## Development

Rickashay is a Yarn workspace of the Fuzzley Games frontend. Run these from
`frontend/`:

```sh
yarn install                    # install dependencies, once per clone
yarn workspace rickashay dev    # dev server on http://localhost:9007
yarn workspace rickashay test   # unit tests
yarn workspace rickashay build  # production build in dist/
yarn workspace rickashay check:layout  # the build's layout, in headless Chrome
yarn workspace rickashay capture:screenshots  # the site's images, from yarn dev
yarn workspace rickashay build:sounds  # write the sounds again
```

## License

This project source code is licensed under the [GNU General Public License v3.0 or later](LICENSE).
