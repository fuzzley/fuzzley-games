# Sudoku

Sudoku, with hints that name the next step of logic. Play it at
https://fuzzley.games/play/sudoku/.

An [Angular](https://angular.dev/) app on the Fuzzley Games shared libraries
(`frontend/lib/`), built with [Vite](https://vite.dev/) and tested with
[Vitest](https://vitest.dev/). Its puzzles come from a bank graded by the
techniques a person needs to solve them, at four levels, and each is dealt
through one of the grid's symmetries, so no two deals look alike. It plays
by mouse, touch or keyboard, wears whichever palette the player chose on
the site, and keeps a game in progress, its undo included, across a reload.

## Development

Sudoku is a Yarn workspace of the Fuzzley Games frontend. Run these from
`frontend/`:

```sh
yarn install                              # install dependencies, once per clone
yarn workspace sudoku dev                 # dev server on http://localhost:9002
yarn workspace sudoku test                # unit tests
yarn workspace sudoku build               # production build in dist/
yarn workspace sudoku generate:puzzles    # write the puzzle bank again
```

The site's `yarn build` builds it, copies `dist/` to `/play/sudoku/`, and
adds the site's analytics tags.

## License

This project source code is licensed under the [GNU General Public License v3.0 or later](LICENSE).
