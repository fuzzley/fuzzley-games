# Minesweeper

Minesweeper with lives: stepping on a mine costs one instead of ending the
game. Play it at https://fuzzley.games/play/minesweeper/.

An [Angular](https://angular.dev/) app on the Fuzzley Games shared libraries
(`frontend/lib/`), built with [Vite](https://vite.dev/) and tested with
[Vitest](https://vitest.dev/). It plays by mouse, touch or keyboard, wears
whichever palette the player chose on the site, and keeps a game in progress
across a reload.

## Development

Minesweeper is a Yarn workspace of the Fuzzley Games frontend. Run these from
`frontend/`:

```sh
yarn install                         # install dependencies, once per clone
yarn workspace minesweeper dev       # dev server on http://localhost:9001
yarn workspace minesweeper test      # unit tests
yarn workspace minesweeper build     # production build in dist/
```

The site's `yarn build` builds it, copies `dist/` to `/play/minesweeper/`, and
adds the site's analytics tags. It was written in 2016 with jQuery, Knockout
and Bootstrap 3, in a repository of its own, fMinesweeper, and branched off
into this one with its history in 2026; the two may diverge.

## License

This project source code is licensed under the [GNU General Public License v3.0 or later](LICENSE).
