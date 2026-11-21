# Solitaire Collection

41 solitaire games, free in your browser. Klondike, Spider and FreeCell are here, and so are Montana, Poker Squares and 36 more. Play it at https://fuzzley.games/play/solitaire/.

The table is drawn with [Phaser 4](https://phaser.io/), in an [Angular 22](https://angular.dev/) shell styled with [Sass](https://sass-lang.com/).

## The games

- **Klondike**: Build down in alternating colors. Draw 3, or Draw 1 for an easier game. Variants: Whitehead, Thumb and Pouch, Saratoga.
- **FreeCell**: Build down in alternating colors, with 4 free cells to park cards in.
- **Spider**: Build King-to-Ace runs by suit across 10 columns.
- **Yukon**: No stock. Move any face-up card, along with everything on top of it. Variants: Alaska, Russian Solitaire, Moosehide.
- **Baker's Game**: FreeCell's ancestor. Build the columns down by suit.
- **Challenge FreeCell**: FreeCell with every Ace and 2 dealt to the bottom. Variant: Super Challenge FreeCell.
- **Eight Off**: 8 cells, 4 of them filled, and columns that build down by suit.
- **Scorpion**: Move any face-up card to build King-to-Ace runs by suit, like Spider. Variants: Wasp, Scorpion II.
- **Simple Simon**: Spider with 1 deck, every card face up and no stock.
- **Mrs. Mop**: 2 decks dealt face up across 13 columns, with no stock.
- **Baker's Dozen**: 13 columns with the Kings at the bottom. Empty columns stay empty.
- **Seahaven Towers**: 10 columns and 4 cells. Build by suit. Only Kings go in empty columns.
- **Spiderette**: Spider with 1 deck, on 7 columns. Variant: Will o' the Wisp.
- **Easthaven**: Like Klondike, but the stock deals a card onto every column.
- **Forty Thieves**: Build down by suit across 10 columns. Move 1 card at a time. Variants: Josephine, Rank and File, Indian, Number Ten.
- **Maria**: Forty Thieves on 9 columns, in alternating colors.
- **Limited**: Forty Thieves spread over 12 shallow columns.
- **Lucas**: 13 columns of 3, with the Aces already on the foundations.
- **Double Klondike**: Klondike from 2 decks, on 9 columns.
- **Montana**: Move cards into the gaps to sort each row by suit, 2 to King. Variant: Addiction.
- **Blue Moon**: Montana with the Aces in play, at the start of each row. Variant: Red Moon.
- **Bisley**: Build each suit up from its Ace and down from its King.
- **Aces Up**: Discard any card that has a higher card of its suit showing.
- **Golf**: Clear 7 columns by playing cards 1 rank up or down onto 1 pile. Variants: Queens on Kings, Putt Putt.
- **Calculation**: Build 4 foundations, counting up by 1s, 2s, 3s and 4s. Variant: Sir Tommy.
- **Flower Garden**: 6 beds, and a bouquet of 16 cards you can play at any time.
- **Bristol**: 8 fans, and 3 reserves that the stock deals onto. Variant: Belvedere.
- **Nestor**: Pair free cards of the same rank until the board is clear.
- **Monte Carlo**: Pair touching cards in a 5 by 5 grid, then close the gaps. Variant: Monte Carlo Thirteens.
- **La Belle Lucie**: 18 fans built down by suit, with 2 redeals. Variants: The Fan, Shamrocks.
- **Trefoil**: La Belle Lucie with the Aces already on the foundations.
- **Canfield**: Clear a 13-card reserve. Foundations start at the rank the deal turns up. Variants: Storehouse, Superior Canfield, Rainbow.
- **Penguin**: 7 columns, 7 cells. Foundations start at the rank of the first card dealt.
- **Black Hole**: Play every card into the hole, 1 rank up or down.
- **All in a Row**: 13 columns of 4. Play every card onto 1 pile, starting with any card.
- **Grandfather's Clock**: Build 12 foundations around a clock face, each up to its hour.
- **Pyramid**: Pair free cards that add up to 13 to take the pyramid apart. Variant: Relaxed Pyramid.
- **TriPeaks**: Clear 3 peaks by playing cards 1 rank up or down onto the waste.
- **Beleaguered Castle**: 8 open rows around the Aces. Move 1 card at a time. Variants: Streets and Alleys, Citadel.
- **Fortress**: Free the Aces from 10 open rows, building up or down by suit.
- **Poker Squares**: Place 25 cards in a grid to make 10 poker hands.

## Development

The Solitaire Collection is a Yarn workspace of the Fuzzley Games frontend.
Run these from `frontend/`:

```sh
yarn install                           # install dependencies, once per clone
yarn workspace solitaire dev           # dev server on http://localhost:9000
yarn workspace solitaire build         # production build in dist/
yarn workspace solitaire test          # run the tests with Vitest
yarn workspace solitaire lint          # ESLint
yarn workspace solitaire typecheck     # type-check the app, the tests and the tools
yarn verify                            # lint, type-check, test and build every workspace
```

The game code lives in `src/` (bundled by Vite via `src/ui/app/main.ts`). The Angular UI components and Sass design system (`src/ui/app/styles/`) are located in `src/ui/`, while the Phaser game logic, rendering, and solitaire runtime reside in `src/engine/` and `src/games/`. `eslint.config.js` holds its layers' boundaries, and `package.json` the rest of its scripts.

The site's `yarn build` builds it, copies `dist/` to `/play/solitaire/`, and
adds the site's analytics tags. It began in a repository of its own,
fSolitaire, and was branched off into this one with its history in 2026; the
two may diverge.

## License

This project source code is licensed under the [GNU General Public License v3.0 or later](LICENSE).

The playing card artwork is [Vector Playing Cards](https://sourceforge.net/projects/vector-cards/) by Chris Aguilar, copyright 2011, used under the [GNU Lesser General Public License v3.0](https://www.gnu.org/licenses/lgpl-3.0.html). See [NOTICE](NOTICE) for the files it covers and for how to substitute a different deck.
