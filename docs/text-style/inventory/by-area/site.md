# Text inventory: site

Written by `extract.mjs`; do not edit by hand. Each entry gives its line,
where it sits, and its text, with `{{ … }}` or `{…}` where a value is put
in, keys in square brackets and bold lead-ins in asterisks.

## Descriptions: blurbs, taglines, page metadata and write-ups

### index.html

- 6 `<meta description>` Solitaire games, from Klondike and Spider to Pyramid and TriPeaks, Minesweeper, Sudoku, Snake, Brick Breaker and Asteroid Breaker, free to play in your browser.

### src/app/provider/categories.ts

- 9 `description:` Patience games for one player.
- 15 `description:` Puzzles and board games beyond cards.
- 21 `description:` Quick games against the clock, played on reflexes.

### src/app/provider/games.ts

- 23 `blurb:` The classic: turn the stock, build down in alternating colors.
- 30 `blurb:` Build King-to-Ace runs by suit across ten columns.
- 36 `blurb:` Every card face-up, with four cells to park cards in.
- 42 `blurb:` Pair free cards totalling thirteen to take the pyramid apart.
- 49 `blurb:` Clear three peaks onto the waste, a rank up or down at a time.
- 56 `blurb:` Play cards a rank up or down onto one pile to clear seven columns.
- 63 `blurb:` No stock: move any face-up card with everything on it.
- 70 `blurb:` FreeCell’s ancestor: columns build in a single suit.
- 76 `blurb:` FreeCell with every Ace and Two dealt to the bottom.
- 83 `blurb:` Eight cells, half of them filled, and same-suit columns.
- 89 `blurb:` Drag any face-up card to build Spider’s same-suit runs.
- 96 `blurb:` Spider on an open board: every card face-up, no stock.
- 102 `blurb:` Two decks dealt face-up across thirteen columns, no stock.
- 108 `blurb:` Thirteen open columns, Kings sunk, and spaces never refill.
- 114 `blurb:` Ten columns and four cells, building in suit, Kings to spaces.
- 120 `blurb:` One card at a time, from a waste that never recycles.
- 127 `blurb:` Forty Thieves on nine columns, in alternating colors.
- 133 `blurb:` Forty Thieves spread over twelve shallow columns.
- 139 `blurb:` Thirteen columns of three, with the Aces already home.
- 145 `blurb:` Move cards into the gaps to sort four rows of thirteen.
- 152 `blurb:` Montana with the Aces in play, fixed at the head of each row.
- 159 `blurb:` Klondike from two decks, on nine columns.
- 165 `blurb:` Klondike’s building with Spider’s row-dealing stock.
- 171 `blurb:` One-deck Spider on seven columns.
- 178 `blurb:` Build each suit up from its Ace and down from its King.
- 184 `blurb:` Discard every card a higher card of its suit outranks.
- 190 `blurb:` Build four foundations by ones, twos, threes and fours.
- 197 `blurb:` Six beds and a sixteen-card bouquet, every bouquet card in play.
- 204 `blurb:` Eight fans and three reserves the stock deals onto.
- 211 `blurb:` Pair free cards of the same rank until the board is clear.
- 217 `blurb:` Pair touching cards in a five-by-five grid, then close it up.
- 224 `blurb:` Eighteen fans built down in suit, with two redeals.
- 231 `blurb:` La Belle Lucie with the Aces already on the foundations.
- 237 `blurb:` Work through a thirteen-card reserve onto foundations of any rank.
- 251 `blurb:` Seven columns in suit, a seven-cell flipper, and a dealt beak.
- 257 `blurb:` Play every card into the hole, a rank up or down round the corner.
- 263 `blurb:` Thirteen columns of four, played onto one pile from any start.
- 269 `blurb:` Build twelve foundations round a dial, each to its hour.
- 276 `blurb:` Eight open rows around the Aces, one card at a time.
- 283 `blurb:` Ten open rows built up or down in suit, Aces buried.
- 289 `blurb:` Place 25 cards in a grid to make ten poker hands.
- 297 `blurb:` Clear the field using the numbers. Don’t hit a mine.
- 306 `blurb:` Fill the grid so every row, column and box has 1 to 9.
- 315 `blurb:` Flank your opponent’s discs to flip them to your color.
- 323 `blurb:` Fly, drift and blast every rock to rubble before one finds you.
- 332 `blurb:` Bounce the ball, break every brick and keep it off the floor.
- 341 `blurb:` Charge the fuzzball, let it fly and keep the bricks off the floor.
- 350 `blurb:` Eat, grow and keep clear of your own tail.

## Names: games, modes, levels and things

### index.html

- 11 `<title>` Fuzzley Games

### src/app/provider/categories.ts

- 8 `name:` Solitaire
- 14 `name:` Classics
- 20 `name:` Arcade

### src/app/provider/games.ts

- 22 `name:` Klondike
- 24 `aliases[]:` Whitehead
- 24 `aliases[]:` Thumb and Pouch
- 24 `aliases[]:` Saratoga
- 29 `name:` Spider
- 35 `name:` FreeCell
- 41 `name:` Pyramid
- 43 `aliases[]:` Relaxed Pyramid
- 48 `name:` TriPeaks
- 50 `aliases[]:` Three Peaks
- 50 `aliases[]:` Tri Towers
- 55 `name:` Golf
- 57 `aliases[]:` Queens on Kings
- 57 `aliases[]:` Putt Putt
- 62 `name:` Yukon
- 64 `aliases[]:` Alaska
- 64 `aliases[]:` Russian Solitaire
- 64 `aliases[]:` Moosehide
- 69 `name:` Baker’s Game
- 75 `name:` Challenge FreeCell
- 77 `aliases[]:` Super Challenge FreeCell
- 82 `name:` Eight Off
- 88 `name:` Scorpion
- 90 `aliases[]:` Wasp
- 90 `aliases[]:` Scorpion II
- 95 `name:` Simple Simon
- 107 `name:` Baker’s Dozen
- 113 `name:` Seahaven Towers
- 119 `name:` Forty Thieves
- 121 `aliases[]:` Josephine
- 121 `aliases[]:` Streets
- 121 `aliases[]:` Rank and File
- 121 `aliases[]:` Indian
- 121 `aliases[]:` Number Ten
- 126 `name:` Maria
- 132 `name:` Limited
- 138 `name:` Lucas
- 144 `name:` Montana
- 146 `aliases[]:` Gaps
- 146 `aliases[]:` Addiction
- 151 `name:` Blue Moon
- 153 `aliases[]:` Red Moon
- 158 `name:` Double Klondike
- 164 `name:` Easthaven
- 170 `name:` Spiderette
- 172 `aliases[]:` Will o’ the Wisp
- 177 `name:` Bisley
- 183 `name:` Aces Up
- 189 `name:` Calculation
- 191 `aliases[]:` Broken Intervals
- 191 `aliases[]:` Sir Tommy
- 191 `aliases[]:` Old Patience
- 196 `name:` Flower Garden
- 198 `aliases[]:` The Garden
- 198 `aliases[]:` Bouquet
- 203 `name:` Bristol
- 205 `aliases[]:` Belvedere
- 210 `name:` Nestor
- 216 `name:` Monte Carlo
- 218 `aliases[]:` Weddings
- 218 `aliases[]:` Monte Carlo Thirteens
- 223 `name:` La Belle Lucie
- 225 `aliases[]:` Fair Lucy
- 225 `aliases[]:` Midnight Oil
- 225 `aliases[]:` The Fan
- 225 `aliases[]:` Shamrocks
- 230 `name:` Trefoil
- 236 `name:` Canfield
- 239 `aliases[]:` Demon
- 240 `aliases[]:` Fascination
- 241 `aliases[]:` Storehouse
- 242 `aliases[]:` Thirteen Up
- 243 `aliases[]:` Superior Canfield
- 244 `aliases[]:` Rainbow
- 250 `name:` Penguin
- 256 `name:` Black Hole
- 262 `name:` All in a Row
- 268 `name:` Grandfather’s Clock
- 270 `aliases[]:` Clock
- 275 `name:` Beleaguered Castle
- 277 `aliases[]:` Streets and Alleys
- 277 `aliases[]:` Citadel
- 282 `name:` Fortress
- 288 `name:` Poker Squares
- 290 `aliases[]:` Poker Solitaire
- 295 `name:` Minesweeper
- 304 `name:` Sudoku
- 313 `name:` Reversi
- 321 `name:` Asteroid Breaker
- 330 `name:` Brick Breaker
- 339 `name:` Brick Fuzz Pop
- 348 `name:` Snake

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
- 17 `<p>` {{ view.game.name }} is still in development: it plays, but it may change as it’s finished.
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
