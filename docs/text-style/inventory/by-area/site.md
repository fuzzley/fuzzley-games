# Text inventory: site

Written by `extract.mjs`; do not edit by hand. Each entry gives its line,
where it sits, and its text, with `{{ … }}` or `{…}` where a value is put
in, keys in square brackets and bold lead-ins in asterisks.

## Descriptions: blurbs, taglines, page metadata and write-ups

### index.html

- 6 `<meta description>` Solitaire, Minesweeper, Sudoku and arcade games, free in your browser. 41 solitaire games, including Klondike, Spider and FreeCell.

### src/app/provider/categories.ts

- 9 `description:` Card games for one player.
- 15 `description:` Puzzles and board games.
- 21 `description:` Action games you play in real time.

### src/app/provider/games.ts

- 24 `blurb:` Build down in alternating colors. Draw 3, or Draw 1 for an easier game.
- 31 `blurb:` Build King-to-Ace runs by suit across 10 columns.
- 38 `blurb:` Build down in alternating colors, with 4 free cells to park cards in.
- 44 `blurb:` Pair free cards that add up to 13 to take the pyramid apart.
- 51 `blurb:` Clear 3 peaks by playing cards 1 rank up or down onto the waste.
- 58 `blurb:` Clear 7 columns by playing cards 1 rank up or down onto 1 pile.
- 66 `blurb:` No stock. Move any face-up card, along with everything on top of it.
- 73 `blurb:` FreeCell’s ancestor. Build the columns down by suit.
- 79 `blurb:` FreeCell with every Ace and 2 dealt to the bottom.
- 86 `blurb:` 8 cells, 4 of them filled, and columns that build down by suit.
- 93 `blurb:` Move any face-up card to build King-to-Ace runs by suit, like Spider.
- 100 `blurb:` Spider with 1 deck, every card face up and no stock.
- 106 `blurb:` 2 decks dealt face up across 13 columns, with no stock.
- 112 `blurb:` 13 columns with the Kings at the bottom. Empty columns stay empty.
- 119 `blurb:` 10 columns and 4 cells. Build by suit. Only Kings go in empty columns.
- 125 `blurb:` Build down by suit across 10 columns. Move 1 card at a time.
- 132 `blurb:` Forty Thieves on 9 columns, in alternating colors.
- 138 `blurb:` Forty Thieves spread over 12 shallow columns.
- 144 `blurb:` 13 columns of 3, with the Aces already on the foundations.
- 150 `blurb:` Move cards into the gaps to sort each row by suit, 2 to King.
- 157 `blurb:` Montana with the Aces in play, at the start of each row.
- 164 `blurb:` Klondike from 2 decks, on 9 columns.
- 170 `blurb:` Like Klondike, but the stock deals a card onto every column.
- 176 `blurb:` Spider with 1 deck, on 7 columns.
- 183 `blurb:` Build each suit up from its Ace and down from its King.
- 189 `blurb:` Discard any card that has a higher card of its suit showing.
- 195 `blurb:` Build 4 foundations, counting up by 1s, 2s, 3s and 4s.
- 202 `blurb:` 6 beds, and a bouquet of 16 cards you can play at any time.
- 209 `blurb:` 8 fans, and 3 reserves that the stock deals onto.
- 216 `blurb:` Pair free cards of the same rank until the board is clear.
- 222 `blurb:` Pair touching cards in a 5 by 5 grid, then close the gaps.
- 229 `blurb:` 18 fans built down by suit, with 2 redeals.
- 236 `blurb:` La Belle Lucie with the Aces already on the foundations.
- 243 `blurb:` Clear a 13-card reserve. Foundations start at the rank the deal turns up.
- 258 `blurb:` 7 columns, 7 cells. Foundations start at the rank of the first card dealt.
- 264 `blurb:` Play every card into the hole, 1 rank up or down.
- 271 `blurb:` 13 columns of 4. Play every card onto 1 pile, starting with any card.
- 277 `blurb:` Build 12 foundations around a clock face, each up to its hour.
- 284 `blurb:` 8 open rows around the Aces. Move 1 card at a time.
- 291 `blurb:` Free the Aces from 10 open rows, building up or down by suit.
- 297 `blurb:` Place 25 cards in a grid to make 10 poker hands.
- 305 `blurb:` Clear the field using the numbers. Don’t hit a mine.
- 314 `blurb:` Fill the grid so every row, column and box has 1 to 9.
- 323 `blurb:` Flank your opponent’s discs to flip them to your color.
- 331 `blurb:` Shoot every rock before one hits your ship.
- 340 `blurb:` Break every brick. Don’t let the ball get past your paddle.
- 349 `blurb:` Fire the fuzzball to break the bricks before they reach the floor.
- 358 `blurb:` Eat the apples. Don’t hit the walls or your own tail.

## Names: games, modes, levels and things

### index.html

- 11 `<title>` Fuzzley Games

### src/app/provider/categories.ts

- 8 `name:` Solitaire
- 14 `name:` Classics
- 20 `name:` Arcade

### src/app/provider/games.ts

- 22 `name:` Klondike
- 25 `aliases[]:` Whitehead
- 25 `aliases[]:` Thumb and Pouch
- 25 `aliases[]:` Saratoga
- 30 `name:` Spider
- 36 `name:` FreeCell
- 43 `name:` Pyramid
- 45 `aliases[]:` Relaxed Pyramid
- 50 `name:` TriPeaks
- 52 `aliases[]:` Three Peaks
- 52 `aliases[]:` Tri Towers
- 57 `name:` Golf
- 59 `aliases[]:` Queens on Kings
- 59 `aliases[]:` Putt Putt
- 64 `name:` Yukon
- 67 `aliases[]:` Alaska
- 67 `aliases[]:` Russian Solitaire
- 67 `aliases[]:` Moosehide
- 72 `name:` Baker’s Game
- 78 `name:` Challenge FreeCell
- 80 `aliases[]:` Super Challenge FreeCell
- 85 `name:` Eight Off
- 91 `name:` Scorpion
- 94 `aliases[]:` Wasp
- 94 `aliases[]:` Scorpion II
- 99 `name:` Simple Simon
- 111 `name:` Baker’s Dozen
- 117 `name:` Seahaven Towers
- 124 `name:` Forty Thieves
- 126 `aliases[]:` Josephine
- 126 `aliases[]:` Streets
- 126 `aliases[]:` Rank and File
- 126 `aliases[]:` Indian
- 126 `aliases[]:` Number Ten
- 131 `name:` Maria
- 137 `name:` Limited
- 143 `name:` Lucas
- 149 `name:` Montana
- 151 `aliases[]:` Gaps
- 151 `aliases[]:` Addiction
- 156 `name:` Blue Moon
- 158 `aliases[]:` Red Moon
- 163 `name:` Double Klondike
- 169 `name:` Easthaven
- 175 `name:` Spiderette
- 177 `aliases[]:` Will o’ the Wisp
- 182 `name:` Bisley
- 188 `name:` Aces Up
- 194 `name:` Calculation
- 196 `aliases[]:` Broken Intervals
- 196 `aliases[]:` Sir Tommy
- 196 `aliases[]:` Old Patience
- 201 `name:` Flower Garden
- 203 `aliases[]:` The Garden
- 203 `aliases[]:` Bouquet
- 208 `name:` Bristol
- 210 `aliases[]:` Belvedere
- 215 `name:` Nestor
- 221 `name:` Monte Carlo
- 223 `aliases[]:` Weddings
- 223 `aliases[]:` Monte Carlo Thirteens
- 228 `name:` La Belle Lucie
- 230 `aliases[]:` Fair Lucy
- 230 `aliases[]:` Midnight Oil
- 230 `aliases[]:` The Fan
- 230 `aliases[]:` Shamrocks
- 235 `name:` Trefoil
- 241 `name:` Canfield
- 245 `aliases[]:` Demon
- 246 `aliases[]:` Fascination
- 247 `aliases[]:` Storehouse
- 248 `aliases[]:` Thirteen Up
- 249 `aliases[]:` Superior Canfield
- 250 `aliases[]:` Rainbow
- 256 `name:` Penguin
- 263 `name:` Black Hole
- 269 `name:` All in a Row
- 276 `name:` Grandfather’s Clock
- 278 `aliases[]:` Clock
- 283 `name:` Beleaguered Castle
- 285 `aliases[]:` Streets and Alleys
- 285 `aliases[]:` Citadel
- 290 `name:` Fortress
- 296 `name:` Poker Squares
- 298 `aliases[]:` Poker Solitaire
- 303 `name:` Minesweeper
- 312 `name:` Sudoku
- 321 `name:` Reversi
- 329 `name:` Asteroid Breaker
- 338 `name:` Brick Breaker
- 347 `name:` Brick Fuzz Pop
- 356 `name:` Snake

## Spoken text: labels and announcements for screen readers

### src/app/component/game_page/game_page.component.html

- 68 `<section aria-label>` Game

### src/app/component/game_tile/game_tile.component.html

- 6 `<a [aria-label]>` {{ play.label }}

### src/app/component/site_footer/site_footer.component.html

- 10 `<a aria-label>` Andrey Gavel (opens in a new tab)
- 18 `<a aria-label>` Source on GitHub (opens in a new tab)
- 29 `<a [aria-label]>` {{ commit.label }}

### src/app/component/site_header/site_header.component.html

- 5 `<nav aria-label>` Categories

### src/app/model/game.ts

- 75 `describePlayers() returns` Solo

## Site furniture: navigation, footers, search and 404

### src/app/component/category/category.component.html

- 3 `<a>` All games

### src/app/component/game_page/game_page.component.html

- 8 `<h1>` {{ view.game.name }} @if (view.game.inDevelopment) { In development }
- 17 `<p>` {{ view.game.name }} is still being built. You can play it, but it may change.
- 22 `<a>` Play {{ view.game.name }}
- 50 `<span>` Play {{ view.game.name }}
- 59 `<h1>` {{ view.game.name }} Coming soon
- 69 `<p>` {{ view.game.name }} is coming soon. It will be playable here once it’s finished.

### src/app/component/game_page/game_page.component.ts

- 48 `meta:` {describePlayers(game.players)}, about {describeLength(game.minutes)} a game

### src/app/component/game_tile/game_tile.component.html

- 6 `<a>` Play
- 19 `<span>` {{ game().name }} @if (view().badge; as badge) { {{ badge }} }

### src/app/component/game_tile/game_tile.component.ts

- 21 `badgeFor() returns` Coming soon
- 22 `badgeFor() returns` In development
- 47 `label:` Play {game.name}

### src/app/component/home/home.component.html

- 15 `<a>` See all {{ section.total }}
- 31 `<p>` Try a game’s name, or a kind of game like “solitaire”.
- 34 `<a>` Show all games

### src/app/component/home/home.component.ts

- 60 `computed()` Results for “{this.query()}”
- 60 `computed()` All games
- 70 `computed()` {found} of {this.catalog.games.length} games
- 71 `computed()` No games match.

### src/app/component/not_found/not_found.component.html

- 2 `<h1>` There’s no {{ kind() }} at this address.
- 3 `<p>` It may have been renamed or taken down. Try one of these instead:
- 13 `<a>` See all games

### src/app/component/site_footer/site_footer.component.html

- 4 `<span>` © {{ year }} Andrey Gavel
- 14 `<a>` Source on GitHub
- 23 `<p>` Built from {{ commit.hash }} on {{ builtOn }}
- 35 `<p>` Built on {{ builtOn }}

### src/app/component/site_footer/site_footer.component.ts

- 37 `label:` {this.build.commit} (opens in a new tab)

### src/app/component/site_header/site_header.component.html

- 21 `<span>` Search games
- 25 `<input placeholder>` Search games

### src/app/routes.ts

- 11 `gameTitle =` Game not found
- 15 `categoryTitle =` Category not found
- 27 `title:` Page not found

### src/app/service/site_title.strategy.ts

- 6 `SITE_NAME =` Fuzzley Games
