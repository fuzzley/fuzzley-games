# Text inventory: fuzzley.info

Written by `extract.mjs`; do not edit by hand. Each entry gives its line,
where it sits, and its text, with `{{ … }}` or `{…}` where a value is put
in, keys in square brackets and bold lead-ins in asterisks.

## Descriptions: blurbs, taglines, page metadata and write-ups

### ../src/content/projects/fuzzley-games.md

- 7 `tagline:` A home for card and puzzle games
- 8 `summary:` A gallery of card and puzzle games to play in the browser, and the new home of the Solitaire Collection and Minesweeper.
- 18 `paragraph` A gallery of card and puzzle games to play in the browser, grouped into Solitaire and Classics and searchable by name. The [Solitaire Collection](/projects/solitaire/) and [Minesweeper](/projects/minesweeper/) moved there from this site, and Sudoku and Reversi are on the way.
- 24 `paragraph` The site is an Angular 22 single-page app built with Vite and styled with Sass. The games are served beside it as static pages, from nginx on Google Cloud Run.

### ../src/content/projects/minesweeper.md

- 8 `tagline:` The classic, with lives
- 9 `summary:` Minesweeper in the browser, with lives, so one wrong click doesn't have to end the game.
- 19 `paragraph` Minesweeper with a twist: you start with lives, so stepping on a mine costs one instead of ending the game. It plays by mouse, touch or keyboard, takes on the palette chosen on fuzzley.games, and keeps a game in progress across a reload.
- 23 `paragraph` It was first written in 2016 with jQuery, Knockout and Bootstrap. It's now an Angular app built with Vite, part of [Fuzzley Games](/projects/fuzzley-games/).

### ../src/content/projects/pong.md

- 8 `tagline:` Two paddles, one ball
- 9 `summary:` Pong in the browser, built on the Phaser game engine.
- 17 `paragraph` The original arcade game, rebuilt for the browser on the Phaser game engine.

### ../src/content/projects/solitaire.md

- 8 `tagline:` 41 games, most with rule variants
- 9 `summary:` Forty-one solitaire games in the browser, from Klondike and FreeCell to Pyramid, TriPeaks and Grandfather's Clock.
- 29 `paragraph` A solitaire engine with a game browser, built on Phaser 4 for the table and an Angular 22 shell for everything around it. Klondike plays in Draw 1 or Draw 3 with standard or Vegas scoring, Spider in one, two or four suits, and most games offer their traditional rule variants, from Whitehead and Saratoga to Will o' the Wisp and Super Challenge FreeCell.
- 35 `paragraph` It's part of [Fuzzley Games](/projects/fuzzley-games/) now, which gives each game a page of its own.
- 38 `heading` ## The games
- 40 `list item` - Klondike
- 41 `list item` - FreeCell
- 42 `list item` - Spider
- 43 `list item` - Yukon
- 44 `list item` - Baker's Game
- 45 `list item` - Challenge FreeCell
- 46 `list item` - Eight Off
- 47 `list item` - Scorpion
- 48 `list item` - Simple Simon
- 49 `list item` - Mrs. Mop
- 50 `list item` - Baker's Dozen
- 51 `list item` - Seahaven Towers
- 52 `list item` - Spiderette
- 53 `list item` - Easthaven
- 54 `list item` - Forty Thieves
- 55 `list item` - Maria
- 56 `list item` - Limited
- 57 `list item` - Lucas
- 58 `list item` - Double Klondike
- 59 `list item` - Montana
- 60 `list item` - Blue Moon
- 61 `list item` - Bisley
- 62 `list item` - Aces Up
- 63 `list item` - Golf
- 64 `list item` - Calculation
- 65 `list item` - Flower Garden
- 66 `list item` - Bristol
- 67 `list item` - Nestor
- 68 `list item` - Monte Carlo
- 69 `list item` - La Belle Lucie
- 70 `list item` - Trefoil
- 71 `list item` - Canfield
- 72 `list item` - Penguin
- 73 `list item` - Black Hole
- 74 `list item` - All in a Row
- 75 `list item` - Grandfather's Clock
- 76 `list item` - Pyramid
- 77 `list item` - TriPeaks
- 78 `list item` - Beleaguered Castle
- 79 `list item` - Fortress
- 80 `list item` - Poker Squares

### ../src/content/projects/spider.md

- 8 `tagline:` The two-deck classic
- 9 `summary:` Spider Solitaire in the browser, drawn on canvas with KineticJS, with card sounds from howler.js.
- 17 `paragraph` Spider Solitaire for the browser. The table and cards are drawn on an HTML canvas with KineticJS, the sound effects play through howler.js, and Knockout binds the controls around the board.

### ../src/pages/404.astro

- 11 `description=` There's no page at this address.

### ../src/pages/index.astro

- 49 `description=` Andrey Gavel is a staff software engineer and manager at Google. Play his browser games, from the Solitaire Collection and Minesweeper on Fuzzley Games to Spider Solitaire and Pong.

### ../src/pages/projects/index.astro

- 21 `description=` Browser games by Andrey Gavel: Solitaire Collection, Spider Solitaire, Minesweeper and Pong, and Fuzzley Games, the site where the newest are played.

### ../../README.md

- 13 `list item` - **[Fuzzley Games](https://fuzzley.games/)**: a gallery of card and puzzle games to play in the browser, and the new home of the Solitaire Collection and Minesweeper. TypeScript, Angular, Vite, Sass. [Source](https://github.com/fuzzley/fuzzley-games)
- 17 `list item` - **[Solitaire Collection](https://fuzzley.games/play/solitaire/)**: forty-one solitaire games, from Klondike and FreeCell to Pyramid, TriPeaks and Grandfather's Clock, most with their traditional rule variants. TypeScript, Phaser 4, Angular. [Source](https://github.com/fuzzley/fuzzley-games/tree/main/frontend/games/solitaire)
- 22 `list item` - **[Minesweeper](https://fuzzley.games/play/minesweeper/)**: the classic, with lives, so one wrong click doesn't have to end the game. First written in 2016 with jQuery and Knockout, now an Angular app. [Source](https://github.com/fuzzley/fuzzley-games/tree/main/frontend/games/minesweeper)
- 26 `list item` - **[Spider Solitaire](https://fuzzley.info/projects/spider/play/)**: the two-deck classic, drawn on canvas with KineticJS, with card sounds from howler.js. [Source](https://github.com/fuzzley/fSpider)
- 29 `list item` - **[Pong](https://fuzzley.info/projects/pong/play/)**: two paddles, one ball, built on the Phaser game engine. [Source](https://github.com/fuzzley/fPong)

## Picture text: alt text and captions

### ../src/content/projects/fuzzley-games.md

- 15 `coverAlt:` The Fuzzley Games home page, with a row of solitaire games from Klondike to Pyramid above Minesweeper, Sudoku and Reversi.

### ../src/content/projects/minesweeper.md

- 16 `coverAlt:` A Minesweeper board of cyan tiles partly cleared, with the mines left, three lives and the time at the top.

### ../src/content/projects/pong.md

- 14 `coverAlt:` A game of Pong with two orange paddles and the score at the top.

### ../src/content/projects/solitaire.md

- 16 `coverAlt:` A game of Klondike dealt on green felt.
- 19 `alt:` A game of FreeCell with four empty reserve cells.
- 20 `caption:` FreeCell
- 22 `alt:` A pyramid of twenty-eight cards dealt for Pyramid solitaire.
- 23 `caption:` Pyramid
- 25 `alt:` Ten columns dealt for a game of Spider.
- 26 `caption:` Spider

### ../src/content/projects/spider.md

- 14 `coverAlt:` A game of Spider Solitaire in progress, with ten columns of cards and the stock in the corner.

### ../src/pages/index.astro

- 58 `alt=` Portrait of Andrey Gavel

## Names: games, modes, levels and things

### ../src/content/projects/fuzzley-games.md

- 2 `title:` Fuzzley Games

### ../src/content/projects/minesweeper.md

- 2 `title:` Minesweeper

### ../src/content/projects/pong.md

- 2 `title:` Pong

### ../src/content/projects/solitaire.md

- 2 `title:` Solitaire Collection

### ../src/content/projects/spider.md

- 2 `title:` Spider Solitaire

## Labels: buttons, menus, headings, readouts and settings

### ../src/content/projects/fuzzley-games.md

- 12 `playLabel:` Visit fuzzley.games

### ../src/content/projects/minesweeper.md

- 13 `playLabel:` Play on fuzzley.games

### ../src/content/projects/solitaire.md

- 13 `playLabel:` Play on fuzzley.games

## Spoken text: labels and announcements for screen readers

### ../src/components/GitHubLink.astro

- 25 `aria-label=` ${projectTitle} source code on GitHub (opens in a new tab)

### ../src/components/Header.astro

- 25 `aria-label=` Main

### ../src/components/ThemeToggle.astro

- 10 `aria-label=` Dark theme

### ../src/pages/projects/[slug]/index.astro

- 126 `aria-label=` About this project
- 130 `aria-label=` Project facts
- 154 `aria-label=` More screenshots

## Site furniture: navigation, footers, search and 404

### ../public/manifest.webmanifest

- 1 `name:` Andrey Gavel
- 1 `short_name:` fuzzley

### ../src/components/Footer.astro

- 21 `(text)` Built on {builtOn}
- 23 `(text)` Built from{" "}

### ../src/components/GitHubLink.astro

- 26 `title=` Source on GitHub

### ../src/components/Header.astro

- 8 `label:` Projects
- 9 `label:` CV

### ../src/components/Moved.astro

- 21 `(text)` {title} has moved
- 30 `(text)` {title} has moved to

### ../src/layouts/Base.astro

- 52 `content=` Andrey Gavel
- 129 `(text)` Skip to content

### ../src/lib/links.ts

- 15 `linkName =` {name} (opens in a new tab)

### ../src/lib/projects.ts

- 25 `"card-game":` Play
- 26 `arcade:` Play
- 27 `website:` Visit
- 33 `projectYears =` {project.data.started} to now

### ../src/pages/404.astro

- 10 `title=` Page not found \| Andrey Gavel
- 17 `(text)` There's no page at this address
- 18 `(text)` It may have moved when the site was rebuilt. The games now live under{" "}
- 20 `(text)` Projects
- 20 `(text)` , or start from the{" "}
- 21 `(text)` home page

### ../src/pages/index.astro

- 48 `title=` Andrey Gavel \| Software engineer and manager
- 79 `(text)` Say hello
- 148 `(text)` Now
- 153 `(text)` Focus
- 184 `(text)` Experience
- 194 `(text)` Full history and highlights
- 200 `(text)` Education

### ../src/pages/projects/[slug]/index.astro

- 37 `"card-game":` Card game
- 38 `arcade:` Arcade game
- 39 `website:` Website
- 76 `title=` ${data.title} \| Andrey Gavel
- 82 `(text)` All projects
- 106 `(text)` Source on GitHub
- 133 `(text)` Started
- 137 `(text)` Status
- 141 `(text)` Built with
- 174 `(text)` More projects

### ../src/pages/projects/index.astro

- 20 `title=` Projects \| Andrey Gavel
- 24 `(text)` Projects
- 25 `(text)` Games I've built on the side, plus Fuzzley Games, my own game site, hosting the newer games I've developed.

## Profile and work history

80 entries, 767 words, counted but not listed here.
