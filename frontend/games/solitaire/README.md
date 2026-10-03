# fSolitaire

A browser-based Solitaire game engine supporting multiple solitaire variants, built with [Phaser 4](https://phaser.io/) canvas rendering, an [Angular 22](https://angular.dev/) application shell, and [Sass](https://sass-lang.com/) for UI styling.

The [latest version of the game](http://fuzzley.info/project/solitaire/) is hosted at http://fuzzley.info/project/solitaire/.

## Included Solitaire Games

- **Klondike**: Classic solitaire supporting Draw 1 and Draw 3 modes and standard or Vegas scoring, with Whitehead, Thumb and Pouch, and Saratoga rule variants.
- **FreeCell**: The classic open-information solitaire puzzle game with four reserve cells.
- **Spider**: Multi-suit spider solitaire with options for 1-Suit (Easy), 2-Suit (Medium), and 4-Suit (Hard) games.
- **Yukon**: Playable in standard Yukon, Alaska, Russian Solitaire, and Moosehide variants.
- **Baker's Game**: Predecessor to FreeCell with same-suit column building, with choices for Any Card or Kings Only empty columns.
- **Challenge FreeCell**: FreeCell with the Aces and Twos dealt to the bottom of the columns, with Super Challenge FreeCell's Kings-only empty columns as an option.
- **Eight Off**: FreeCell cousin featuring eight reserve cells, same-suit column building, and Kings-only empty columns.
- **Scorpion**: Yukon-style unconstrained card group moves to build same-suit descending runs, with a 3-card reserve stock; playable as Scorpion, Wasp, or Scorpion II.
- **Simple Simon**: Spider-style building and completion on an open board of ten columns with all 52 cards dealt face-up and no stock.
- **Mrs. Mop**: Simple Simon's rules with two decks dealt face-up across thirteen 8-card columns.
- **Baker's Dozen**: Thirteen 4-card columns with Kings sunk to the bottom; columns build down by rank in any suit, and cleared columns cannot be refilled.
- **Seahaven Towers**: Tight reserve-cell game with ten 5-card columns, four cells, same-suit building, and Kings-only empty columns.
- **Spiderette**: Single-deck Spider on seven columns with row-dealing stock; playable in standard staircase deal or Will o' the Wisp (flat 3 cards per column).
- **Easthaven**: Blends Klondike's alternating-colour building and foundations with Spider's row-dealing stock across seven columns.
- **Forty Thieves**: Two-deck patience with 10 columns of 4 cards, eight foundations, single-card moves, and no stock recycling; supports standard Forty Thieves, Josephine, Rank and File, Indian, and Number Ten variants.
- **Maria**: Forty Thieves variant on a 9-column grid, building down in alternating colours with multi-card run moves.
- **Limited**: Forty Thieves variant on a wide 12-column grid of 3-card columns with same-suit building and multi-card run moves.
- **Lucas**: Forty Thieves variant with the eight Aces dealt to the foundations and thirteen 3-card columns, building in suit with same-suit runs.
- **Double Klondike**: Two-deck Klondike dealt across nine columns with eight foundations and unlimited stock recycles.
- **Montana**: Gaps-style solitaire played on a 4×13 grid without Aces; sort rows from Two to King in suit into spaces left by moved cards, featuring two redeals, or three as Addiction.
- **Blue Moon**: Montana with the Aces in play, fixed at the start of four 14-cell rows; Red Moon, which deals the gaps beside the Aces, is its deal option.
- **Bisley**: Thirteen open columns building up or down in suit, played onto foundations that climb from each Ace and descend from each King.
- **Aces Up**: Four columns dealt a card at a time, discarding every card a higher card of its suit outranks until only the Aces remain; spaces can take any card, or only Aces.
- **Golf**: Seven open columns cleared onto a single foundation one rank up or down at a time, with a one-pass stock; Golf, Queens on Kings, and Putt Putt, which turns the corner from King to Ace.
- **Calculation**: Four foundations built regardless of suit by ones, twos, threes and fours, from a stock turned a card at a time onto four waste piles; Sir Tommy, which builds every foundation up from an Ace, is its variant option.

## Development

This project uses [Yarn](https://yarnpkg.com/) for dependency management and [Vite](https://vite.dev/) for the dev server and production build.

```sh
yarn install     # install dev dependencies
yarn dev         # start the dev server on http://localhost:9000
yarn build       # produce a production build in dist/
yarn preview     # serve the production build locally
yarn test        # run tests with Vitest
yarn lint        # run ESLint
yarn prettier    # format the code with Prettier
yarn skills:link # link agent skills from .agents/skills to .claude/skills
```

The game code lives in `src/` (bundled by Vite via `src/ui/app/main.ts`). The Angular UI components and Sass design system (`src/ui/app/styles/`) are located in `src/ui/`, while the Phaser game logic, rendering, and solitaire runtime reside in `src/engine/` and `src/games/`.

Agent configuration and reusable skills live in `.agents/skills/`. Run `yarn skills:link` to link skills across for Claude Code discovery.

## License

This project source code is licensed under the [GNU General Public License v3.0 only](LICENSE).

The playing card artwork is [Vector Playing Cards](https://sourceforge.net/projects/vector-cards/) by Chris Aguilar, copyright 2011, used under the [GNU Lesser General Public License v3.0](https://www.gnu.org/licenses/lgpl-3.0.html). See [NOTICE](NOTICE) for the files it covers and for how to substitute a different deck.
