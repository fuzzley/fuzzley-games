# Minesweeper

Minesweeper with lives: stepping on a mine costs one instead of ending the
game. Play it at https://fuzzley.games/play/minesweeper/.

Written in 2016 with jQuery, [Knockout](https://knockoutjs.com/) and Bootstrap
3, which load as classic scripts from `public/vendor/`.
[Vite](https://vite.dev/) bundles `src/main.js` and copies the rest.

## Development

Minesweeper is a Yarn workspace of the Fuzzley Games frontend. Run these from
`frontend/`:

```sh
yarn install                         # install dependencies, once per clone
yarn workspace minesweeper dev       # dev server on http://localhost:9000
yarn workspace minesweeper build     # production build in dist/
yarn workspace minesweeper lint      # ESLint
```

The site's `yarn build` builds it, copies `dist/` to `/play/minesweeper/`, and
adds the site's analytics tags. It moved here, with its history, from
[fuzzley/fMinesweeper](https://github.com/fuzzley/fMinesweeper), which keeps
the original commit ids.
