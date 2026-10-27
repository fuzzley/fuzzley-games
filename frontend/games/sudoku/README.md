# Sudoku

Sudoku, with hints that name the next step. Play it at
https://fuzzley.games/play/sudoku/.

An [Angular](https://angular.dev/) app on the Fuzzley Games shared libraries
(`frontend/lib/`), built with [Vite](https://vite.dev/) and tested with
[Vitest](https://vitest.dev/).

## Development

Sudoku is a Yarn workspace of the Fuzzley Games frontend. Run these from
`frontend/`:

```sh
yarn install                    # install dependencies, once per clone
yarn workspace sudoku dev       # dev server on http://localhost:9002
yarn workspace sudoku test      # unit tests
yarn workspace sudoku build     # production build in dist/
```

## License

This project source code is licensed under the [GNU General Public License v3.0 or later](LICENSE).
