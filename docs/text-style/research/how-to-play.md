# How to play: how established games and game sites write rules, help and controls

Research notes for the text style guide. Collected 2026-11-16.

## Scope and method

The subject is the prose of "how to play" text: rules pages, in-game help panels, controls blocks, printed manuals. The notes record how each source is written (order, sentence shapes, word choice, length) and leave the rules themselves aside.

How the text was collected:

- Every quotation below was fetched in this session as raw HTML, XML, JavaScript or plain text with `curl`, and the text was extracted locally. No quotation passed through a summarising model, so the words are the source's own. Nothing is quoted from memory, and release years are given only where the fetched text carries them.
- Typos, odd spacing and inconsistent capitals inside quotes are the source's own ("your missions is", "pedal", "thetop", "Use control knob").
- Hard-wrapped sources (old manuals, man pages) are quoted with their line breaks joined. Two arcade manuals come from OCR text and are quoted only where the OCR is clean.
- The New York Times help panels are assembled in the page's script from string fragments. Where a number or a button name is filled in by the script, it is shown in square brackets. (Wordle's letter count defaults to 5 in the script; Connections takes its group size from a table that maps 3 to "three" and 4 to "four".) Square brackets in the Armor Games excerpts are the source's own.
- Word counts and sentence lengths come from a script run over the saved text of each help section (the help only, without navigation, FAQ or history). They are rough: a sentence is whatever ends in a full stop, question mark or exclamation mark, or a list line.
- The counts in "Patterns" were coded by hand from the texts, one row per source, and the coding sheet is at the end so each count can be checked.

Thirty-one sources are counted in the patterns. Four more were read as side evidence and are not counted (an Atari 2600 Jungle Hunt manual, an Arkanoid arcade instruction card, and two store blurbs).

Reach summary:

| Group                         | Read and counted                                                                                                                | Not reached                                                                                                                                    |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Puzzle and newspaper games | NYT Games (six games), Simon Tatham's puzzle manual (three games, from a mirror), Sudoku.com, minesweepergame.com, GNOME Mines  | help.nytimes.com (empty shell), chiark.greenend.org.uk (connection refused), minesweeper.online (empty shell), Google's built-in games         |
| 2. Solitaire and card rules   | pagat.com, Bicycle, BVS Solitaire, PySolFC, CardGames.io, Green Felt, 247 Solitaire, Solitaired, KDE KPatience, GNOME Aisleriot | Solitaire Bliss and World of Solitaire (empty shells), Microsoft Solitaire Collection help (no page found)                                     |
| 3. Web game portals           | Poki, CrazyGames, Coolmath Games, itch.io, Armor Games                                                                          | Asteroids and Snake pages on Poki and CrazyGames (404 or a category page)                                                                      |
| 4. Arcade and console manuals | Atari 2600 Breakout and Asteroids, Game Boy Tetris and Alleyway, NES Arkanoid, arcade Breakout and Asteroids operator manuals   | clean transcriptions of cabinet instruction cards (only an OCR fragment for Arkanoid)                                                          |
| 5. Modern games               | Lichess Learn, 2048, Board Game Arena (Yatzy), BBTAN and Ballz                                                                  | Balatro and Peggle wikis (HTTP 403), tetris.com help tabs (empty shell), Threes (no help text on its site), Mini Metro (site has only a blurb) |

---

## Group 1: puzzle and newspaper games

### 1. NYT Games: the in-game "How to Play" panels

- What: the help panel inside each game. Six read: Wordle, Connections, Spelling Bee, Sudoku, Tiles, Letter Boxed.
- Fetched: yes. The help centre (help.nytimes.com) returned an empty shell, so the text was taken from the script bundles the game pages load: https://www.nytimes.com/games/wordle/index.html , https://www.nytimes.com/games/connections , https://www.nytimes.com/puzzles/spelling-bee , https://www.nytimes.com/puzzles/sudoku , https://www.nytimes.com/puzzles/tiles , https://www.nytimes.com/puzzles/letter-boxed (bundles under https://www.nytimes.com/games-assets/v2/ ).

Excerpts. Wordle, whole panel apart from the sign-up line:

> Guess the Wordle in 6 tries.
>
> Each guess must be a valid [5]-letter word.
>
> The color of the tiles will change to show how close your guess was to the word.
>
> W is in the word and in the correct spot.
>
> I is in the word but in the wrong spot.
>
> U is not in the word in any spot.

Connections:

> Find groups of [four] items that share something in common.
>
> Select [four] items and tap '[Submit]' to check if your guess is correct.
>
> Each puzzle has exactly one solution. Watch out for words that seem to belong to multiple categories!

Spelling Bee:

> Create words using letters from the hive.
>
> Words must contain at least 4 letters.
>
> Our word list does not include words that are obscure, hyphenated, or proper nouns.
>
> No cussing either, sorry.
>
> Score points to increase your rating.
>
> 4-letter words are worth 1 point each.
>
> Each puzzle includes at least one “pangram” which uses every letter. These are worth 7 extra points!

Sudoku:

> Fill each 3 x 3 set with numbers 1–9.
>
> Tap a cell in any set, then select a number.
>
> Note: Each number can only appear on the board 9 times.
>
> Need a clue? Open the More menu and select Hint to find the next logical cell to solve. Screen readers announce its row and column.
>
> Press Escape to pause your game.

Tiles and Letter Boxed:

> Tap tiles to remove the matches you find. Tiles don’t have to be adjacent.
>
> Continue matching until the board is cleared. You won’t lose your long combo if you end on an empty tile.
>
> The last letter of a word becomes the first letter of the next word eg. THY > YES > SINCE

Shape:

- Length: 78 to 106 words for five of the six games; Sudoku is 194 because it adds modes and a keyboard block.
- Order, the same in all six: title, then one sentence that is the whole goal, then two to seven bullets or lines of constraints with the examples just before or after them, then (in three games) modes or scoring, then, in five of the six, when the next puzzle comes out.
- Headings are few: the title, "Examples" or "Category Examples", "Play modes and tips", "Keyboard controls". Spelling Bee uses a full instruction as a heading ("Score points to increase your rating.").
- Lists carry almost everything. No paragraph is longer than two sentences.
- Pictures carry the examples: Wordle's three sample rows, Connections' colour key, Tiles' sample tiles, Letter Boxed's sample square. Each picture gets a one-line caption in a fixed pattern.

Sentence habits:

- The goal is a bare imperative with no "the goal is": "Guess…", "Find…", "Create…", "Fill…", "Match…".
- Constraints are plain declaratives with the thing as subject and "must", "cannot" or "can": "Words must include the center letter.", "Consecutive letters cannot be from the same side", "Letters can be used more than once."
- "You" and "your" together appear between zero and five times per panel ("your guess", "your rating", "the matches you find").
- Mean sentence length is 7 to 10 words. The longest sentence in Wordle is 17 words.
- Present tense. "will" appears only for what the game does in response ("will change", "will be revealed").
- Small numbers are digits ("6 tries", "4 letters", "1 point", "3 levels"); Connections alone writes "four".
- Contractions appear but sparsely ("don’t", "won’t", "haven’t"). Exclamation marks: four across six panels, each on a goal, a warning or a bonus.
- Input verbs: "tap" and "select" everywhere, even on desktop; never "click". Keys are capitalised and bare: "Press Tab", "Press Enter or Space", "Hold Shift", "Press Escape" (but also "press the space bar", lower case, in the same block).
- On-screen labels are reproduced exactly and set off ("tap 'Submit'", "Open the More menu and select Hint").
- One dry aside per panel at most: "No cussing either, sorry."
- Capitalisation of the title varies between games: "How to Play", "How to play Sudoku", "How to play Tiles", "How to Play Letter Boxed".

Vocabulary: always "puzzle" for the day's game. Wordle: "guess", "tries", "tiles", "spot". Connections: "items", "groups", "categories", "mistakes". Sudoku: "cell", "set" (the 3 x 3 box), "board", "Normal mode", "Candidate mode". Each panel holds its terms steady.

Leaves out: what happens when tries or mistakes run out; anything about repeated letters in Wordle; Spelling Bee's rank names and thresholds; any controls at all in Wordle, Spelling Bee and Connections beyond "tap 'Submit'"; Sudoku says nothing about rows and columns beyond one clause.

### 2. Simon Tatham's Portable Puzzle Collection: the manual

- What: the reference manual for a long-lived free puzzle collection. Read: Mines (Minesweeper), Solo (Sudoku), Same Game.
- Fetched: yes, from a mirror. chiark.greenend.org.uk refused the connection, so the same manual text was read from Debian's man pages, which are generated from the manual's source: https://manpages.debian.org/testing/sgt-puzzles/sgt-mines.6.en.html , https://manpages.debian.org/testing/sgt-puzzles/sgt-solo.6.en.html , https://manpages.debian.org/testing/sgt-puzzles/sgt-samegame.6.en.html

Excerpts:

> You have a grid of covered squares, some of which contain mines, but you don't know which. Your job is to uncover every square which does not contain a mine. If you uncover a square containing a mine, you lose. If you uncover a square which does not contain a mine, you are told how many mines are contained within the eight surrounding squares.

> This game needs no introduction; popularised by Windows, it is perhaps the single best known desktop puzzle game in existence.

> If you right-click in a covered square, it will place a flag which indicates that the square is believed to be a mine. Left-clicking in a marked square will not uncover it, for safety. You can right-click again to remove a mark placed in error.

> If you left-click in an uncovered square, it will ‘clear around’ the square. This means: if the square has exactly as many flags surrounding it as it should have mines, then all the covered squares next to it which are not flagged will be uncovered.

> Even Undo is available, although you might consider it cheating to use it.

> You are given some of the numbers as clues; your aim is to place the rest of the numbers correctly.

> If you clear the grid you win. If you end up with nothing but single squares (i.e., there are no more clickable regions left) you lose.

Shape:

- Length per game (description plus controls): Mines about 555 words, Solo about 630, Same Game about 205. Settings ("parameters") and the actions common to all games sit in separate sections after these.
- Order, the same for every game: what you are looking at and your aim, how you win or lose, remarks on this version with a line of history or credit, then "controls", then "parameters".
- Headings: "DESCRIPTION", "Mines controls", "Mines parameters", "Common actions".
- Paragraphs, with one bullet list in Solo for the three constraints. No pictures in this version of the text.

Sentence habits:

- Second-person declarative from the first words: "You have a grid…", "Your job is…".
- Controls are conditionals that name the starting state: "If you left-click in a covered square, it will be uncovered." About half of all sentences in Mines begin with "You", "Your" or "If you".
- "will" for what the program does (16 times in Mines); present tense for what is always true.
- Mean sentence length 16 to 21 words, long for help that ships inside a program. Semicolons and parentheses are frequent (two or three semicolons and five to eight parentheses per game).
- Mouse actions are hyphenated verbs: "left-click", "right-click". Keys are named in running prose: "the cursor keys", "the return key", "the space bar", and capitalised when used as the thing pressed ("press Space").
- Menu names in single curly quotes: ‘Custom...’, ‘Type’.
- British spelling. Dry first-person asides: "it can even be a prime number if you feel like it".

Vocabulary: "square", "covered" and "uncover", "flag" (with "mark" as its verb), "grid". Solo: "block" or "sub-block", "digit", "pencil mark", "clue". Held steady throughout.

Leaves out: no scoring and no timer explanation in Mines; nothing about touch; no tips. It does cover edge cases other sources skip (what Undo does after stepping on a mine, why a flagged square will not open).

### 3. Sudoku.com: "Sudoku Rules for Complete Beginners"

- What: the rules article on a large Sudoku site.
- Fetched: yes. https://sudoku.com/how-to-play/sudoku-rules-for-complete-beginners/

Excerpts:

> Sudoku is played on a grid of 9 x 9 spaces. Within the rows and columns are 9 “squares” (made up of 3 x 3 spaces). Each row, column and square (9 spaces each) needs to be filled out with the numbers 1-9, without repeating any numbers within the row, column or square. Does it sound complicated?

> As you can see, in the upper left square (circled in blue), this square already has 7 out of the 9 spaces filled in.

> Sudoku is a game of logic and reasoning, so you shouldn’t have to guess.

> This is how the process of elimination works in Sudoku – you find out which spaces are available, which numbers are missing – and then deduce, based on the position of those numbers within the grid, which numbers fit into each space.

Shape: about 600 words. Four numbered headings ("Sudoku Rule № 1: Use Numbers 1-9", "Sudoku Rule № 2: Don’t Repeat Any Numbers", "Sudoku Rule № 3: Don’t Guess", "Sudoku Rule № 4: Use Process of Elimination"), of which only the first two are rules and the last two are advice. Paragraphs under each, leaning on three pictures, two of them annotated ("circled in blue", "circled in green", "shown below"). A closing paragraph restates the rules.

Sentence habits: impersonal and "we" ("we can use process of elimination", "What do we mean by…?"), with "you" for advice. Mean sentence length about 19 words. Spaced en dashes for asides. A rhetorical question in the first paragraph. Headings are imperatives in title case. No exclamation marks.

Vocabulary: "space" for a cell, "square" for the 3 x 3 box, "grid". Consistent, though "square" for a box is the reverse of what source 2 does.

Leaves out: every control. The page never says how to enter a number, take notes, undo or get a hint, and says nothing about mistakes or timing.

### 4. minesweepergame.com: "How To Play Minesweeper"

- What: the beginner page of a long-running Minesweeper community site.
- Fetched: yes. https://minesweepergame.com/strategy/how-to-play-minesweeper.php

Excerpts:

> Minesweeper is a game where mines are hidden in a grid of squares. Safe squares have numbers telling you how many mines touch the square. You can use the number clues to solve the game by opening all of the safe squares. If you click on a mine you lose the game!

> You open squares with the left mouse button and put flags on mines with the right mouse button.

> If you flag all of the mines touching a number, chording on the number opens the remaining squares. Chording is when you press both mouse buttons at the same time. This can save you a lot of work! However, if you place the correct number of flags on the wrong squares, chording will explode the mines.

> The 2 touches 2 squares so they must both be mines.

> A common mistake is to see a "fake" 1 on a corner where the 1 already touches a mine.

Shape: about 540 words. Two headings ("Minesweeper Rules", "Basic Patterns"). Five paragraphs of rules, then a picture gallery where each picture has a one-sentence caption. The first paragraph is the whole game in four sentences: what it is, what the numbers mean, how you win, how you lose.

Sentence habits: short declaratives, mean 13 words. "You" as the subject of actions, the game or the number as the subject of facts. No contractions at all. Two exclamation marks, one on losing and one on a time-saver. "must" is used for deduction ("must be mines"), not for obligation. Captions repeat one frame with a single value changed ("The 3 touches 3 squares so they must all be mines.").

Vocabulary: "squares", "open", "flag", "safe squares", "touch" for adjacency, "chord". A term is defined in the sentence after its first use.

Leaves out: touch input; what the question mark is for; scoring beyond "a clock shows your time in seconds".

### 5. GNOME Mines: help pages

- What: the desktop help for GNOME's Minesweeper. Read: "Game rules" and "How to use flags".
- Fetched: yes. https://help.gnome.org/users/gnome-mines/stable/rules.html.en , https://help.gnome.org/users/gnome-mines/stable/flags.html.en

Excerpts:

> The aim of Mines is to clear the minefield without detonating any of the mines.

> The game begins with the board covered in tiles. Click on any tile to uncover it. You will reveal:

> A mine, which will detonate and end the game.

> If you are not sure whether a tile hides a mine, you can use the question flag.

Shape: the rules page is about 140 words: one sentence of aim, then a short list of steps (choose a size, click a tile, repeat), with a three-item list of what a click may reveal. The flags page is about 175 words in three short sections, two of them a "To …:" lead-in and one step. One topic per page, linked.

Sentence habits: imperative steps ("Start by choosing…", "Click on any tile…", "Repeat the previous step until…"). "You will reveal:" introduces outcomes as a list of noun phrases, each with a "which" clause. No contractions, no exclamation marks.

Vocabulary: "tile", "board", "minefield", "uncover", "flag", "question flag". "Right click" and "Right-click" both appear.

Leaves out: the timer, and how numbers count diagonal neighbours (it says only "adjacent tiles").

---

## Group 2: solitaire and card rules

### 6. pagat.com: Nerts / Pounce / Racing Demon

- What: the standard reference site for card game rules. It has no pages for Klondike, Spider or FreeCell (the address tried returned 404). Its solitaire index explains why:
  > This website pagat.com is devoted mostly to traditional multi-player games. There are many other sites with excellent and comprehensive collections of solitaire game rules, so rather than duplicating this effort, we provide below links to a selection of these sites.
  > So the page read is its competitive patience game with the same furniture (tableau, foundations, stock, waste).
- Fetched: yes. https://www.pagat.com/patience/nerts.html , https://www.pagat.com/solitaire/card.html

Excerpts:

> The players race to get rid of the cards from their "Nerts piles" (also known as "Pounce piles", etc. - depending on what you call the game) by building them from the ace up onto common foundations.

> Work piles are built in descending order, alternating color, overlapping the cards. Thus a red six is placed on a black seven, a black ten on a red jack, and so on.

> You are never forced to play a card if it isn't in your best interest - you can always wait.

> If there is a tie which cannot be resolved, both cards stay.

> The reason for this rule is to give other players a fair chance to realise that they can play the next card top of the joker, denying the player of the joker the chance to get un-stuck by doing the same.

> Some people award a bonus of 25 points to the player who calls "Pounce!".

Shape: about 2,150 words of rules. Order: Introduction (names and the aim), Players and cards, Initial setup, The play (with a sub-section per pile: Work piles, Nerts pile, Foundations, Stock and waste pile), Scoring, Partnership Game, Variations. Paragraphs throughout; one layout picture. Variations are a list of short paragraphs that each begin "Some people…" or "Some play that…".

Sentence habits: third person for the general rule ("Each player deals…", "Players play simultaneously…"), switching to "you" for what one player may do ("You can only move cards within your own tableau"). Mean sentence 21 words. "may" for permissions (12 times) beside "can" (23). Parentheses are frequent (22), used for alternative names and short glosses. Edge cases get their own sentence beginning "If". Numbers of cards are written as words ("thirteen cards", "four work piles"), scores as digits.

Vocabulary: "pack" and "deck" both; "work piles", "foundations", "stock", "waste pile", "space" for an empty pile, "build". The game's alternative names are carried along in pairs to the end ("Nerts / Pounce pile") and never dropped.

Leaves out: nothing a reader would need; it is the most complete rules text read. It has no controls because it describes a table game.

### 7. Bicycle Cards: "Solitaire"

- What: the card maker's "Learn to Play" page for Klondike.
- Fetched: yes. https://bicyclecards.com/how-to-play/solitaire

Excerpts:

> Solitaire is one of the most pleasurable pastimes for one person.

> The first objective is to release and play into position certain cards to build up each foundation, in sequence and in suit, from the ace through the king. The ultimate objective is to build the whole pack onto the foundations, and if that can be done, the Solitaire game is won.

> The Talon (or “Waste”) Pile: Cards from the stock pile that have no place in the tableau or on foundations are laid face up in the waste pile.

> For example, of the seven cards facing up in the tableau, if one is a nine and another is a ten, you may transfer the nine to on top of the ten to begin building that pile in sequence.

> If a vacancy in the tableau is created by the removal of cards elsewhere it is called a “space”, and it is of major importance in manipulating the tableau.

> Continue to transfer cards in the tableau and bring cards into play from the stock pile until all the cards are built in suit sequences in the foundation piles to win!

Shape: about 785 words. A fact strip (Game Type, Age, Players), an introduction, then five headings that read like a house template: "The Pack", "Object of the Game", "Rank of Cards", "The Deal", "The Play". The four pile types are a list of name, colon, definition. The rest is paragraphs. No pictures in the text.

Sentence habits: formal and impersonal, with many passives ("are laid face up", "may not be played until certain blocking cards are removed"). "you" enters only in the worked example and in the last paragraphs. Mean sentence about 19 words. "may" for permission. One exclamation mark, on the last sentence.

Vocabulary: "pack", "tableau", "foundations", "Stock (or “Hand”) Pile", "Talon (or “Waste”) Pile", "space", "building". Note that "talon" here means the waste pile, while sources 9 and 14 use "talon" for the stock.

Leaves out: turn-three dealing, redeals, what happens when no move is left, any scoring.

### 8. BVS Solitaire Collection: Klondike (Turn Three)

- What: one page from a rules index of several hundred solitaire games kept by a solitaire software maker.
- Fetched: yes. https://www.bvssolitaire.com/rules/klondike.htm

Excerpts:

> 1 deck. Difficult. 2 redeals.

> To build the foundations up in suit to kings.

> The top cards of tableau piles and waste pile are available to play. You may build tableau piles down in sequence and alternating color.

> If, during play, any closed cards become the top card of a stack, it turns over. Empty tableaus may be filled with a King or group of cards headed with a King.

> You have two redeals.

Shape: about 150 words of rules and 60 of history. A one-line fact header under the title, a screenshot, then "Set up", "The object of the game", "The rules", links to strategy tips and related games, a history paragraph and a list of alternative names.

Sentence habits: terse. "You have…" for what is on the table, "You may…" for permissions, passives for the rest. The object is an infinitive fragment. Mean sentence 11 words. No contractions, no exclamation marks, no examples.

Vocabulary: "tableau piles", "foundations", "stock pile", "waste pile", "closed cards" for face-down cards, "redeals", "build down".

Leaves out: how to make a move in the program; scoring; what "difficult" means; what happens after the last redeal.

### 9. PySolFC: rule pages

- What: the bundled rules of a free solitaire collection. Read: Klondike, Spider, FreeCell.
- Fetched: yes, from the project's source, because the project site returned 403: https://raw.githubusercontent.com/shlomif/PySolFC/master/html-src/rules/klondike.html , …/spider.html , …/freecell.html

Excerpts:

> Klondike type. 1 deck. Unlimited redeals.

> Move all cards to the foundations.

> The playing piles build down by alternate color, and an empty space can only be filled by a King or a sequence starting with a King.

> When you click on the talon, one card is turned over onto the waste pile. There is no limit to the number of times you go through the talon.

> You are also permitted to move cards back out of the foundations.

> To compensate for this there are 4 free cells which can hold any - and just one - card.

Shape: 138 words (Klondike), 165 (Spider), 194 (FreeCell). Fixed order: title, one fact line (family, decks, redeals), "Object" (one sentence), "Rules" (three to five short paragraphs), sometimes "Notes" or "History". No lists, no pictures.

Sentence habits: impersonal; the piles are the subject ("The playing piles build down…", "Foundations are built up…"). "you" appears only where the program is involved ("When you click on the talon"). Mean sentence 12 to 16 words. No contractions, no exclamation marks, no examples.

Vocabulary: "talon" for the stock, "waste pile", "playing piles" and "tableau" both, "foundations", "space", "free cells", "redeal". Some sentences recur word for word across game pages ("Move all cards to the foundations." is the whole "Object" of both Klondike and FreeCell).

Leaves out: drag or click for ordinary moves; scoring; any tip. It assumes the reader knows "build down by alternate color".

### 10. CardGames.io: Solitaire and Spider (with Minesweeper and Sudoku)

- What: the rules shown under each game on an independent games site. Four read, because the site covers both card and puzzle games in one voice.
- Fetched: yes. https://cardgames.io/solitaire/ , https://cardgames.io/spidersolitaire/ , https://cardgames.io/minesweeper/ , https://cardgames.io/sudoku/

Excerpts:

> The Stock: The pile of facedown cards in the upper left corner.

> To win Solitaire, you must get all the cards onto the Foundation piles.

> Move a card from a Foundation back onto the Tableau. You can move the top card of a Foundation back onto the Tableau. This isn't allowed in all Solitaire versions, but we allow it here :)

> When all cards on the Tableau are turned up, and all cards from the stock are finished then the game will automatically move all the Tableau cards onto the Foundations, since at that point you are guaranteed to win the game.

> You start with 500 points. For each move you make one point gets subtracted. For each run you remove from the table you'll get a 100 extra points. Example: if you've managed to make three full runs in 70 moves you'll have 500-70+3*100 = 730 points.

> Open a square. This is done simply by left clicking on a square.

> If you press on a number where not all adjacent mines have been marked, e.g. the number is 3 and you've only flagged one adjacent square, then the squares will not be opened, to prevent you from accidentally clicking on a number and blowing yourself up!

> So, essentially flagging is not required, it's only there to help you keep track of where you think the mines are.

Shape:

- Length: Solitaire about 665 words, Spider 660, Minesweeper 725, Sudoku 500.
- Solitaire order: "The different piles", "The setup", "The objective", "Allowed moves", "Time and Moves". Spider: "Objective", "Setup", "Valid moves", "Adding cards from the stock", "Scoring", "Difficulty". Minesweeper: "Objective and basic concepts", "Gameplay", "Winning", "Support for tablets and phones". Sudoku: one rules paragraph, "Settings", "Sudoku Strategy", "Controls".
- "Allowed moves" is a run of short paragraphs, each opening with a one-sentence summary of the move and following it with "You can…" detail. Minesweeper's "Gameplay" is a bulleted list built the same way.
- A link at the top offers a video. Sudoku shows three small grids labelled "Rows", "Columns", "Boxes".

Sentence habits: second person and "can" (18 times in Solitaire, 15 of them "you can"). Mean sentence 16 to 26 words, with comma splices. Contractions throughout. Mouse verbs unhyphenated ("left clicking", "right click", "double click"); "drag" is used. First person from the developer ("I'm kind of unhappy with how slowly the touches trigger…"), "we" for the site, and text smileys. Reasons are given for the game's choices ("to prevent you from…", "since at that point you are guaranteed…"). Pile names are capitalised as proper nouns ("the Stock", "the Waste").

Vocabulary: "Stock", "Waste", "Foundations", "Tableau" or "Tableau piles" ("tableaus" in Spider), "run". Minesweeper: "squares", "open", "mark" and "flag" both, and once "Bomb" beside "mine". Sudoku: "fields" in the rules, "squares" in the controls; "box", "unit", "clues".

Leaves out: what the game does when you are stuck in Solitaire (a dialog exists, the rules do not mention it); Klondike scoring ("Currently there is no scoring"); touch input except in Minesweeper.

### 11. Green Felt: Klondike

- What: the text under the game on a long-running solitaire site with a competitive community.
- Fetched: yes. https://greenfelt.net/klondike

Excerpts:

> Klondike is a solitaire card game often known purely by the name of Solitaire.

> The four foundations are built up by suit from Ace to King, and the tableau piles can be built down by alternate colours, and partial or complete piles can be moved if they are built down by alternate colours also. Any empty piles can be filled with a King or a pile of cards with a King at the top.

> Move the card to the most logical place (might not be the best move, however)

> Auto-finish—In foundation games, this moves all the cards it can up to the foundations

> If you cancel the drag or undo the move, all the cards will go back to where they were.

Shape: about 565 words, of which about 130 are rules and the rest controls. Three unheaded paragraphs (what the game is, the deal, the building rules), then "Keyboard play", "Mouse play", "Super Moves". Keyboard and mouse are key-then-action lists ("z" then "Undo"; "Left Click" then what it does). The rules are adapted from Wikipedia, as a footer says.

Sentence habits: the rules are passive and long (the second excerpt opens with a 40-word sentence). The controls are noun-phrase or verb-first fragments with no full stop. "Super Moves" is conditional prose ("Dragging a card… will attempt to…"). Each controls block opens with a variant of one sentence: "There are many keys you can use to make your game playing more efficient:".

Vocabulary: "upturned" and "downturned" for face-up and face-down, "tableau piles", "foundations", "stack" in the controls. British "colours" in the rules, American "color" in the controls.

Leaves out: the goal is never stated; there is no win sentence. Nothing on the stock beyond a key ("Flip a card from the stock"), nothing on scoring although the site keeps leader boards.

### 12. 247 Solitaire

- What: the home page text of a large free solitaire site.
- Fetched: yes. https://www.247solitaire.com/

Excerpts:

> Once you hit play, the action begins! The online solitaire game will automatically arrange your beginning setup.

> The cards on the board are called the tableau. As you can see, there are seven stacks of cards, each with one more face-down card than the next.

> For example, here, you’d be able to move the red queen on top of the black king, but you wouldn’t be able to put the red 5 on top of the red 6.

> When there’s an empty spot, only a king can fill it, so keep that in mind!

> Completing your foundations means you’ve won the solitaire game!

> Beginners will start going through the stock immediately, but these cards aren’t going anywhere.

Shape: "How to play Solitaire" is about 330 words and "Solitaire Strategy" about 340, followed by seven FAQ entries. The how-to is a tour of the screen: buttons, settings, tableau, foundations (where the objective first appears, midway through), stock and waste. A screenshot sits above each paragraph and the prose points at it ("As you can see", "here"). No lists.

Sentence habits: chatty second person, mean sentence about 15 words, 19 contractions and 8 exclamation marks in 670 words. Terms are introduced with "are called" or "is called". The objective is restated at the start of the strategy section in stricter words.

Vocabulary: "tableau", "stacks", "board", "foundations", "stock", "waste" (glossed as "discard pile"), "empty spot". Several names for the same columns.

Leaves out: how to move a card (no click, drag or tap anywhere in the how-to); scoring; what happens when you are stuck.

### 13. Solitaired: Klondike

- What: the "How to Play" text under the game on a large solitaire site.
- Fetched: yes. https://solitaired.com/klondike-solitaire

Excerpts:

> To win, you want to place all the cards in the four foundation piles. These are the four empty areas at the top of the game.

> On the top left, you’ll see a stack of cards. This is called your stock pile.

> Stock pile cards can be placed below a card in the tableau if that card is of the opposite color and a number one rank higher. For example, let’s say there is an 8 of Hearts in the third column of the tableau. Either a 7 of Spades or Clubs from the stock pile can be placed on top of it.

> Once you’re able to move all the cards from the tableau and the stockpile, you’ve won!

> If you’re new to Solitaire, we recommend playing Turn 1.

Shape: about 680 words under two headings, "Objective" (one paragraph) and "Available Moves and Play Area" (nine bullets, each a small paragraph, most ending in a worked example and some followed by a picture). Then an FAQ. Keyboard shortcuts live in a separate dialog as a two-column table of action and key ("Flip stock card", "Space").

Sentence habits: rules as "can be" passives with the cards as subject (15 uses of "can"), then "For example," with named cards (five examples). Mean sentence about 20 words. Locates each area before naming it ("On the top left…"). One exclamation mark, on winning.

Vocabulary: "stock pile" and "stockpile" both, "foundation" and "foundation pile", "tableau", "column", "building", "Turn 1" and "Turn 3", "passes".

Leaves out: how to move a card in the how-to text; scoring, though the page shows a score; being stuck appears only in the FAQ.

### 14. KDE KPatience handbook: "Rules for Individual Games"

- What: the manual chapter for KDE's solitaire collection. Read: Klondike, Grandfather, Aces Up, Freecell.
- Fetched: yes. https://docs.kde.org/stable_kf6/en/kpat/kpat/rules-specific.html

Excerpts:

> Klondike is the most famous patience — most likely because it comes with a well-known operating system.

> The goal in Klondike is to put all cards, as real families, ascending on the foundation. This gets easier once all cards are lying face up in the playing piles.

> On a free pile you can put a king of any color, or a sequence starting with a king.

> You can look through the cards on the talon as much as you like.

> Moving a sequence is only permitted if there are enough empty cells or piles available to move the cards individually, one by one.

> You should try to keep as many free cells and/or playing piles empty, so you can build sequences as long as possible.

Shape: Klondike is about 180 words, Freecell about 320. One heading per game and unheaded short paragraphs in a steady order: a remark about the game, the number of decks, the goal, the building rule, empty piles, the stock, then one or two tips. No lists or pictures on this page.

Sentence habits: "You can…" and "you have to…", with passives for layout. Mean sentence 15 to 18 words. No contractions. A light, slightly translated voice ("as real families") with dry asides ("11,982 if you want to know").

Vocabulary: "patience" for the genre, "playing piles", "talon" for the stock, "waste pile", "foundation", "free pile", "real families" for same-suit sequences. Its own dialect, kept steady.

Leaves out: scoring; drag or click for ordinary moves; any example in Klondike.

### 15. GNOME Aisleriot: Klondike

- What: the help page for Klondike in GNOME's solitaire collection.
- Fetched: yes, from the project's source, because the help site returned 404 for this page: https://raw.githubusercontent.com/GNOME/aisleriot/master/help/C/klondike.xml

Excerpts:

> Top left pile. The rest of the deck is placed here after dealing on to the Tableau. Cards are turned over one at a time to Waste. Two redeals.

> Move all cards to the Foundation piles.

> Cards in the Tableau are built down by alternating color. Groups of cards can be moved. An empty pile in the Tableau can be filled with a King or a group of cards with a King on the bottom.

> Each card in the Foundation piles scores one point.

> Don't give up the ship! Try brute force methods when the game seems over.

> Play this way if you want a challenge (and some frustration).

Shape: about 530 words. Headings that read like a template for the whole collection: "Setup" (a table with one row per pile: Type of Deck, Stock, Waste, Foundation, Tableau), "Goal", "Rules", "Options", "Scoring", "Strategy". The setup table says where each pile is and what it holds in telegraphic phrases.

Sentence habits: telegraphic. Many verbless or subjectless fragments ("Top left pile.", "Two redeals.", "To be built up in suit from Ace to King."). Mean sentence 10 words. Imperatives for dealing ("Deal card face up in first pile."). "you" and "your" appear eight times in the whole page. One joke, kept to the strategy section.

Vocabulary: "Stock", "Waste", "Foundation", "Tableau" (capitalised), "redeal", "built down", "in play".

Leaves out: nothing structural; it is the only solitaire text read that has every section. It gives no examples.

---

## Group 3: web game portals

### 16. Poki: Brick Breaker and 2048

- What: game pages on a large portal.
- Fetched: yes. https://poki.com/en/g/brick-breaker , https://poki.com/en/g/2048

Excerpts:

> Launch a ball upward and smash through row after row of bricks before any of them reach the bottom of the screen. Keep the ball in play with your paddle, clear every level and don't let a single brick get past you.

> Move the spaceship using your mouse or finger.

> Every move slides all tiles on the board at once. Swipe left and every tile shifts as far left as it can go. When two matching tiles slide into each other, they merge into one tile worth twice as much. Two 4s become an 8. Two 8s become a 16.

> After each move, a new 2 or 4 tile appears in an empty space. The game ends when the grid is full and no matching tiles can merge.

> Up arrow, Down arrow, Left arrow, Right arrow to slide the tiles.

Shape: Brick Breaker has about 100 words: two short blurbs and an "About this game" table with a "controls" row of one sentence. 2048 has about 325: a summary, "How 2048 works" (four short paragraphs), "Controls" (two lines: "Desktop: Arrow keys", "Mobile: Swipe in any direction"), "Tips for beginners" (four bullets), then who made it, similar games, FAQ.

Sentence habits: imperatives and short present-tense declaratives, mean 12 to 13 words. Second person. The 2048 page has no contractions and no exclamation marks; the Brick Breaker blurb has both. Examples are tiny sentences with numerals.

Vocabulary: 2048: "tiles", "grid" and "board", "merge", "move", "swipe". Brick Breaker: "bricks", "paddle" in the blurb but "spaceship" in the controls row.

Leaves out: Brick Breaker gives no lives, scoring or power-ups; 2048 gives everything but the score formula.

### 17. CrazyGames: Atari Breakout and Bubble Shooter

- What: game pages on a large portal.
- Fetched: yes. https://www.crazygames.com/game/atari-breakout , https://www.crazygames.com/game/bubble-shooter-classic

Excerpts:

> The aim of the game is to bat the ball at the colored blocks until there are none left, while making sure the ball does not pass your paddle.

> Your lives are displayed in the bottom left of your screen. Once you run out of lives, you have to start the game again.

> Use the left mouse button to launch the ball and use the mouse to move the pedal

> Hit the ball to destroy the colored blocks until there are none left. Make sure you don't miss the ball.

> After five misses, a new row drops from the ceiling.

> Don’t believe us? Look over your shoulder next time you’re on public transport.

Shape: each page is 750 to 950 words, of which the how-to-play proper is 100 to 250. Order: summary, "How to Play…", modes or scoring, "About" or history, "Game Tips" (bullets), features (bullets), other games, then "Controls" or "Instructions" near the bottom (one sentence or two bullets), then FAQ. The controls block is the last thing before the FAQ, far from the how-to.

Sentence habits: second person ("you have to destroy all the blocks"), tips as imperative bullets without full stops ("Keep your eye on the ball"). Mean sentence 11 to 12 words. Some filler and some slips ("pedal" for paddle; a sentence in Bubble Shooter that says the same thing twice). Bubble Shooter controls: "Move your mouse to aim", "Left-click to shoot", and in the FAQ "On mobile: tap to shoot".

Vocabulary: "blocks", "paddle" (also "pedal" and "hitting area"), "lives", "power-ups", "modes". Bubble Shooter: "bubbles", "cluster", "ceiling", "round" and "level" both.

Leaves out: Breakout's scoring apart from the mode multipliers; how many lives; whether the keyboard works.

### 18. Coolmath Games: Snake, Atari Breakout, Atari Asteroids, Minesweeper

- What: game pages on a large portal.
- Fetched: yes. https://www.coolmathgames.com/0-snake , https://www.coolmathgames.com/0-atari-breakout , https://www.coolmathgames.com/0-asteroids , https://www.coolmathgames.com/0-minesweeper

Excerpts:

> Eat as many apples as you can to grow as long as possible. Use the arrow keys to control your Snake and the spacebar to pause. Be careful not to hit the wall or eat your tail!

> Coolmath’s Snake game is different from most. When you eat an apple, your tail grows by four blocks instead of the usual one.

> Use the Arrow Keys or A and D to rotate your ship. Press W or UP to move the ship forward. Press SPACE to shoot.

> The goal of Minesweeper is to clear all of the squares on the board that don’t have mines, and flag all of the mines. Left-click your mouse to reveal hidden squares.

> When you're in the game, use your mouse to move the platforms to bounce the balls and break the blocks.

> Just like sharks, this Snake can only go forwards.

Shape: an "Instructions" or "How to Play" paragraph of 35 to 75 words, then tips under small headings, then an FAQ. Whole help sections run about 330 to 455 words. The Snake paragraph is three sentences: goal, controls, danger. Two of the four pages (Breakout, Asteroids) open with controls and reach the goal in the second paragraph or not at all.

Sentence habits: imperatives for the instructions, chatty second person for tips ("Not to worry though, we have some beginner tips to help out!"). Mean sentence 13 to 18 words. Contractions and a few exclamation marks. Two instruction paragraphs end on a challenge question ("How long can you survive?", "How fast can you clear the entire board?"). Key names are not uniform across pages: "the arrow keys" and "the spacebar" on Snake, "the Arrow Keys", "W or UP" and "SPACE" on Asteroids.

Vocabulary: Snake: "apples", "tail", "wall", "blocks", "map". Breakout: "platforms" in the instructions, "paddle" in the strategies, "blocks", "round". Minesweeper: "squares" and "tiles" both, "reveal", "clear", "flag".

Leaves out: touch controls on every page ("How to play … on your phone" is about adding the page to a home screen); Minesweeper's instructions never say what happens when you click a mine; lives and scoring in Breakout.

### 19. itch.io: two Breakout-clone pages

- What: two developer-written game pages for Breakout clones, found through a web search. One long, one short.
- Fetched: yes. https://coolboyfeel.itch.io/brick-breaker , https://605nina.itch.io/brick-breaker-2

Excerpts:

> Brick Breaker is a Breakout clone where you must smash a wall of bricks by deflecting a bouncing ball with a paddle.

> Catch: You'll be able to catch the ball with the paddle for 10 seconds. To shoot it again, press 'Space'. You can have a maximum of 1 ball on your paddle

> Each time you hit a block, you get 100 points

> Movement: A&D / Arrow Keys

> Destroy as many bricks possible to score some points.

> Use the Left and Right Arrow Keys to move.

> Press the escape button to pause and resume.

Shape: the long page is about 340 words: one sentence of what the game is, then labelled bullet lists ("Features & Information about the game:", "Power-ups:", "Scoring System:", "Controls:"). The short page is 34 words: two lines of goal and a "Controls:" label with two sentences.

Sentence habits: "you" plus present or future tense; label-colon-value lines for power-ups and controls; bullets without full stops. Numbers everywhere ("10% chance", "for 10 seconds", "100 points"). The long page lists every power-up with its exact effect and duration, which no portal page does.

Vocabulary: "bricks" in the opening, "blocks" in the scoring list; "paddle", "power-up" and "powerup" both, "levels", "Life".

Leaves out: how many lives; what ends the game; touch.

### 20. Armor Games: Description and Controls blocks

- What: the two-block layout under a game on an older portal. Read on two pages (a tower defence game and a platform racer); no arcade-game page was found.
- Fetched: yes. https://armorgames.com/play/12141/kingdom-rush , https://armorgames.com/play/5917/bubble-tanks-2 (this address served the page for a game called Exit Path)

Excerpts:

> Build towers to attack incoming enemies and stop them from getting past your defenses.

> [SPACE] - Cancel any selected spell/power/rally point.

> [P] - Pauses the game.

> • Arrow Keys or WASD to move

Shape: "Description" is the developer's pitch plus change notes. "Controls" is 20 to 70 words: one or two imperative sentences of what to do, then one line per key.

Sentence habits: imperative for the summary; key lines as `[KEY] - Action.` on one page and `Keys to verb` on the other. Verb form wavers inside one list ("Cancel…", "Pauses…").

Vocabulary: the game's own nouns; nothing shared.

Leaves out: everything but the keys. The block is the only help on the page.

---

## Group 4: classic arcade and console manuals

### 21. Atari 2600 Breakout manual (1978)

- What: the instruction booklet for the home cartridge, as transcribed on AtariAge.
- Fetched: yes. https://atariage.com/manual_html_page.php?SoftwareLabelID=52

Excerpts:

> SMASH! POW! CRUNCH! A brick wall appears at the top of the screen, and your missions is to smash two walls off the playfield -- one brick at a time.

> Use the controller to move the paddle across the bottom of the screen. With the paddle, hit the ball into the wall. Each time the ball hits a brick, the brick disappears and you score points.

> A player or team receives five balls per game. When you miss a ball with your paddle, the ball disappears from the screen.

> To move the paddles across the playfield, turn the controller knob. Turn it clockwise to move the paddle to the right; turn it counter clockwise to move the paddle to the left.

> NOTE: If both opponents destroy the two walls, the team who used the least number of balls wins.

> Don't blink. The only time you'll see your Breakout wall is when the ball hits a brick.

> The ball will speed up after the twelfth consecutive hit OR when it hits any brick in the top three rows. (Speed Bricks)

Shape: about 2,000 words. Order: plugging in, "HOW TO PLAY BREAKOUT" (five paragraphs), "TO START PLAY" (bulleted steps), a paragraph per number of players, timed and invisible games, "BREAKOUT GLOSSARY" (each thing on screen, with its position), "SCORING", "HANDICAP (DIFFICULTY SWITCH)", "CONTROLLER ACTION" (four "To …:" entries), the twelve game variations (a one-line hook and a fact each), "PLAYING TIPS" (three bullets), and a matrix of variations. Brick values are a colour-and-points table, printed twice.

Sentence habits: mixed by section. The overview alternates imperative ("Use the controller…") with third person ("A player or team receives…") and "you". Controls are written purpose first under a "To …:" label, or as "Press … to …". Tips are flat statements of mechanics with exact numbers. Mean sentence about 15 words. "When" outnumbers "If" 18 to 2. Capitals for emphasis ("OR", "NOTE:"). Seven exclamation marks, mostly sound effects.

Vocabulary: "brick wall" and "wall", "bricks", "paddle", "ball", "playfield", "serve", "game" for a variation. The console's parts are named three ways ("console Reset button", "Game Reset button", "Reset button").

Leaves out: it never says in one sentence that the game ends when the fifth ball is lost; the reader infers it from "until all five balls are played".

### 22. Atari 2600 Asteroids manual

- What: the instruction booklet for the home cartridge, as transcribed on AtariAge.
- Fetched: yes. https://atariage.com/manual_html_page.php?SoftwareLabelID=8

Excerpts:

> The object of the game is to destroy as many asteroid boulders as possible and keep your ship in space as long as possible.

> Move the Joystick right to rotate the ship clockwise; move it left to rotate the ship counterclockwise. Push the Joystick forward to thrust(propel) the ship through space. (The ship moves only in the direction it's pointed.)

> Pull your Joystick back towards you to put up shields, but don't use shields for more than two seconds or your spaceship will blow up.

> Points are determined by the size of the asteroid boulders. Obviously, the smaller boulders are harder to hit and therefore worth more points.

> Hyperspace is helpful as a quick getaway when an asteroid or boulder is headed toward your spaceship, but it may also be a hindrance if your spaceship reappears in the path of an oncoming asteroid boulder.

> After playing ASTEROIDS several times you'll discover which techniques work best for you. Here are some that the space cadets at ATARI found most helpful.

Shape: about 1,870 words in eight numbered sections with a contents list: a story ("COSMIC SPACE PATROL"), "GAME PLAY" (one paragraph), "OPERATING YOUR SPACESHIP", "CONSOLE CONTROLS", "SCORING" (a five-row table), "GAME VARIATIONS", "HELPFUL HINTS" (four numbered tips), "GAME SELECT MATRIX". The prose refers to figures ("as shown in Figure 1").

Sentence habits: the story is third-person present tense, then turns to the reader with questions ("Could you do as good a job as the Cosmic Space Patrol?"). The rest is imperative and "you". Each control sentence pairs a stick direction with its result, and each feature gets its benefit and its risk in one sentence joined by "but". Mean sentence about 16 words. Fifteen contractions, no exclamation marks. Terms get a gloss in parentheses on first use ("UFOs (Unidentified Flying Objects)").

Vocabulary: "asteroid boulders", "asteroids" and "boulders" all for the same thing; "spaceship" and "ship"; "photon torpedoes"; "extra ship" under a heading "LIVES". "game variation" is steady.

Leaves out: what ends the game (the reader is told only "With each game or turn you have four spaceships."); that the screen wraps, which is tucked into a closing note for owners.

### 23. Game Boy Tetris manual

- What: the instruction booklet, as typed out by a fan on World of Nintendo. The transcription has its own typos.
- Fetched: yes. https://www.world-of-nintendo.com/manuals/game_boy/tetris.shtml

Excerpts:

> TETRIS is a new type of puzzle game from the Soviet Union. It's really simple to play. Seven different shaped blocks fall down the game field one after the other. The object of the game is to keep the blocks from piling up to the top of the game field.

> If you can completely fill in one horizontal line, that line disappears and you get points.

> A Button Block rotates 90 degrees clockwise each time button is pressed.

> FIELD This is where the action is.

> However, if you complete two lines at once (a double), you can add to the opponent's lines by one.

> First don't panic! You may be able to fix the hole with the next block.

> Press the START Button during the game to pause. Press again to restart the game from the moment it was stopped.

Shape: about 2,200 words in seven numbered sections after an opening "WHAT IS TETRIS?": using the controls, before you start, the one-player game, the two-player game, technique, other operations, scoring. The opening section is the whole game in one paragraph of eight sentences. Controls are a button-then-effect table. Each screen has a legend naming every readout ("SCORE", "LEVEL", "LINES", "NEXT", "FIELD"). Scoring is a table by level. Many passages describe a picture.

Sentence habits: "you" and "can" (22 times); "If…" and "When…" in near-equal number; "However," four times for exceptions. Mean sentence about 16 words. Screen words are printed in capitals exactly as on screen. Outcome names are introduced in parentheses ("(a double)", "(a triple)"). One heading is the reader's question: "What should I do when this happens?" The end condition is given three times in the same words ("that's the end of the game").

Vocabulary: "blocks" for the falling pieces, "lines", "game field", "LEVEL" glossed as "falling speed of the blocks", "HIGH" for the starting pile. Steady.

Leaves out: how the level rises in game A ("the LEVEL gradually increases") with no number given.

### 24. Game Boy Alleyway manual (1989)

- What: the instruction booklet for Nintendo's Breakout-style game, as typed out by a fan on World of Nintendo.
- Fetched: yes. https://www.world-of-nintendo.com/manuals/game_boy/alleyway.shtml

Excerpts:

> In "Alleyway," the object of the game is to hit the descending ball with the paddle at the bottom of the screen so that it rises up to demolish the blocks at the top of the screen.

> On the other hand, when the paddle fails to make contact with the ball a miss occurs and the number of paddles is decreased by one. If a miss occurs when the number of paddles has reduced to zero, that's the end of the game.

> Press this button to release the ball. Also, if you use the Control Pad while holding this button down, you can move the paddle at high speed to the left and right.

> To pause the game, press the START Button. To resume playing, press the START Button again. The pause function cannot be used during the bonus stage.

> Remember, however, that there is no further increase if you already have 9 remaining paddles or after your score is over 10,000 points.

> If you fail to hit the ball with the paddle in the bonus stage, it does not count as a miss. The stage simply finishes.

Shape: about 1,100 words in six numbered sections: "GAME OUTLINE", "USING THE CONTROLLER", "SCREEN EXPLANATION", "PLAYING THE GAME", "HOW THE STAGES ARE ARRANGED", "WINNING TECHNIQUES". The outline is five sentences: object, clearing a stage, finishing the game, losing a paddle, game over. A labelled screen diagram and a block-and-points table carry the scoring.

Sentence habits: the outline is impersonal ("a miss occurs", "the stage is cleared"). Controls are one entry per button: its name, then "Press this button to…", then what it does in combination. Play is a list of steps. Tips are numbered noun or imperative headings with a sentence under each. Mean sentence about 16 words. No exclamation marks. Exceptions are stated right after the rule they limit.

Vocabulary: "paddle" doubles as the unit of lives ("Number of paddles remaining"), "a miss", "blocks", "stage" (defined in the text as its own word for a screen), "bonus stage". Steady.

Leaves out: almost nothing. Ball speed and the shrinking paddle each get one starred line.

### 25. NES Arkanoid manual

- What: the instructions, as typed out by a fan on World of Nintendo.
- Fetched: yes. https://www.world-of-nintendo.com/manuals/nes/arkanoid.shtml

Excerpts:

> Your mission is to destroy the space walls with the energy ball by strategic movement of your Vaus spacecraft.

> There are three types of walls: colors, silver and gold.

> Gold walls are indestructible.

> Use control knob to move Vaus left and right. Use fire button to launch energy ball and fire laser.

> A Button: launches energy ball and fires laser beam.

> Choose capsules carefully. Each one changes the one before it.

Shape: about 700 words: "The story" (two paragraphs), "How to play" (mission, wall types, a points list by colour, a capsule list by colour), "How to operate" (set-up steps and a line or two per button), "Characters", "Obstacles", "Playing tips". Colour-to-value and colour-to-effect lists do most of the work.

Sentence habits: "Your mission is…" then "you" and imperatives. Capsule effects are third-person verb fragments ("slows movement of ball", "awards an extra Vaus"). Articles are often dropped in the controls. Mean sentence about 13 words. Eight exclamation marks, the last four in a row.

Vocabulary: the fiction's names stand in for plain ones: "space walls" for bricks, "energy ball", "Vaus" for the paddle, "capsules". "round" in the rules but "levels" in the tips.

Leaves out: how many Vaus you start with and what ends the game.

### 26. Arcade Breakout: operator's manual, "Summary of Game Play"

- What: the section of the cabinet's service manual that describes play for the owner of the machine. OCR text from the Internet Archive.
- Fetched: yes. https://archive.org/stream/ArcadeGameManualBreakout/breakout_djvu.txt

Excerpts:

> If the player succeeds in doing this, the ball will hit the paddle and rebound back towards the wall of bricks. But if the player misses, the ball will pass by the paddle, continue on and finally disappear from the TV screen.

> The game only serves a preset number of balls, but the number of volleys made on any one ball is limited only by the player's skill.

> Players will receive a large number of score points for a "breakout," that is, for clearing away an opening in the wall of bricks and then paddling a ball back through the opening.

Shape: about 675 words in six paragraphs, no lists: what the game is and the objective, the controls and a miss, the "breakout", how it gets harder, sounds, the two-player game.

Sentence habits: third person throughout ("the player", "players"), never "you". Long sentences, mean 23 words. "will" for consequences. Cause and effect are spelled out step by step. Formal verbs ("Depressing", "manipulate").

Vocabulary: "wall of bricks", "paddle", "serve", "volley", "play-field", "score points". Steady.

Leaves out: nothing about play; it is written for someone who must explain the machine to others.

### 27. Arcade Asteroids: operator's manual, "Game Play"

- What: the same kind of section for the Asteroids cabinet. OCR text from the Internet Archive.
- Fetched: yes. https://archive.org/download/arcademanual_Asteroids/Asteroids_djvu.txt

Excerpts:

> When shot, each large asteroid divides into two medium-sized asteroids and the game adds twenty points to the player’s score.

> The player’s objective in the game is to shoot and destroy as many asteroids as possible before all his or her spaceships are destroyed.

> The ship may also explode on reentry.

Shape: the "Play Mode" part is about 600 words in paragraphs: what the screen shows when a game starts, the controls, how asteroids split and score, saucers, the objective and how a ship is lost, extra ships, game over. The objective arrives in the seventh paragraph.

Sentence habits: third person, mean sentence 19 words, "may" for possibility and permission. Button names in capitals as printed on the panel ("the THRUST pushbutton"). Scores written as words up to fifty and digits from 100. Screen messages in capitals ("GAME OVER").

Vocabulary: "asteroids" (large, medium-sized, small-sized), "saucer", "spaceship" and "ship", "pushbutton", "display".

Leaves out: nothing; it even says how long "GAME OVER" stays on screen.

### Side evidence for group 4 (read, not counted)

- Arkanoid arcade manual, the instruction-card text, from OCR ( https://archive.org/download/arcademanual_arkanoid/arkanoid_djvu.txt ). All capitals, one fragment per power-up, verb first:

  > CATCH CAPSULES AND REINFORCE THE VAUS!!

  > SLOWS DOWN THE ENERGY BALL.

  > SPLITS THE ENERGY BALL INTO THREE PARTICLES.

- Atari 2600 Jungle Hunt manual ( https://atariage.com/manual_html_page.php?SoftwareLabelID=889 ), fetched by mistake while looking for Breakout. Same house order as source 22 (story, game play, using the controller, console controls, scoring, strategy). It shows a vocabulary slip inside one manual:

  > Since jungle hunting is a dangerous business, you are given five lives at the start of the game.

  > You can continue to play until you run out of players, or until the timer runs out.

---

## Group 5: modern games

### 28. Lichess: "Learn"

- What: the text of the interactive chess basics course on a free chess site, read from the site's translation source file (173 strings).
- Fetched: yes. https://raw.githubusercontent.com/lichess-org/lila/master/translation/source/learn.xml (the page https://lichess.org/learn itself is an empty shell)

Excerpts, each a separate on-screen string:

> It moves in straight lines

> The fewer moves you make,
> the more points you win!

> Queen = rook + bishop

> The king is slow.

> You cannot castle if
> the king has already moved
> or the rook has already moved.

> En passant only works
> immediately after the opponent
> moved the pawn.

> When a player is not in check and does not have a legal move, it's a stalemate. The game is drawn: no one wins, no one loses.

> Congratulations! Better be stalemated than checkmated!

Shape: about 1,130 words over 173 strings, a median of 6 words a string. Each lesson has a title ("The rook"), a subtitle that is the rule ("It moves in straight lines"), a one-line introduction, one instruction per board, and a congratulation. The board carries the rest.

Sentence habits: imperatives and three-to-eight-word declaratives. 92 of the 173 strings carry an exclamation mark. "You cannot … if …" and "… only works if …" for restrictions. Line breaks are placed by hand at phrase boundaries. British spelling. A light personification of the pieces ("Her majesty the queen!").

Vocabulary: standard chess terms, each introduced by its own lesson title, with "take" preferred to "capture" in instructions.

Leaves out: nothing is explained at length; anything that needs a paragraph is left to the board.

### 29. 2048: the official page

- What: the text under the original game.
- Fetched: yes, from the game's source: https://raw.githubusercontent.com/gabrielecirulli/2048/master/index.html

Excerpts (the whole help):

> Join the numbers and get to the 2048 tile!

> How to play: Use your arrow keys to move the tiles. When two tiles with the same number touch, they merge into one!

Shape: 32 words. A tagline above the board that is the goal, and below it a bold label and two sentences: the control, then the one rule. Three phrases are set in bold: the target ("2048 tile!"), the control ("arrow keys") and the result ("merge into one!").

Sentence habits: imperative, then a "When" sentence. Two exclamation marks in three sentences.

Vocabulary: "tiles", "numbers", "merge".

Leaves out: that a new tile appears after each move, how the game ends, the score, and swiping.

### 30. Board Game Arena: Yatzy game help

- What: the wiki help attached to a game on a large board game site.
- Fetched: yes. https://en.doc.boardgamearena.com/Gamehelpyatzy

Excerpts:

> A player rolls the dice to begin a turn. They are then allowed to reroll dice, with each reroll being any number of those dice. (In BGA, you click on the dice that you want to reroll.)

> This can often force a player to take a zero score for some categories.

> Roll 5 dice with 2 rerolls per turn

> Full house scores 25 points

Shape: a "General" section of about 110 words, then one bulleted list of 8 to 12 lines per rule variant, then examples. The lists are almost all scoring.

Sentence habits: third person singular "they" for the player in the general section; list lines as `Combination scores value` without full stops; the site's own handling in parentheses with "you". No contractions, no exclamation marks.

Vocabulary: "category", "upper section", "reroll", "bonus". Steady across variants, which makes the lists comparable line by line.

Leaves out: the goal (it never says the highest total wins) and how the game ends.

### 31. BBTAN and Ballz: store-listing "How to play"

- What: the how-to-play text in the Google Play descriptions of two well-known aim-and-shoot brick games.
- Fetched: yes. https://play.google.com/store/apps/details?id=com.crater.bbtan&hl=en_US , https://play.google.com/store/apps/details?id=com.ketchapp.ballz&hl=en_US

Excerpts. BBTAN, under a "How to play" label, four lines numbered with emoji:

> Aim at the bricks and shoot the ball.

> The ball bounces off the bricks and wall.

> Break all the bricks efficiently in a minimal attempt.

> If the bricks come down to the bottom, it’s GAME OVER.

Ballz, the whole instruction:

> Swipe your finger to throw the balls and break the bricks. Collect items along the way!

Shape: BBTAN 36 words in four numbered lines: what you do, what the ball does, the goal, how you lose. Ballz 24 words in one paragraph.

Sentence habits: imperatives and one "If" sentence. Mean 8 to 9 words.

Vocabulary: "bricks", "ball", "aim", "shoot", "swipe", "throw".

Leaves out: how aiming works, and everything else beyond these lines.

### Side evidence for group 5 (read, not counted)

Two store or site blurbs that describe play in a sentence but are marketing, not help:

- Peggle Deluxe on Steam ( https://store.steampowered.com/app/3480/Peggle_Deluxe/ ):
  > Aim, shoot, clear the orange pegs, then sit back and cheer as 10 whimsical teachers guide you to Peggle greatness.
- Mini Metro on its developer's site ( https://dinopoloclub.com/games/mini-metro/ ):
  > Draw lines between stations and start your trains running. As new stations open, redraw your lines to keep them efficient.

---

## Sources not reached

- help.nytimes.com: every article address returned the help centre's empty shell. The in-game panels (source 1) were read instead.
- chiark.greenend.org.uk (Simon Tatham's own site): connection refused. The Debian mirror of the same manual was read instead.
- pagat.com Klondike, Spider, FreeCell: the pages do not exist. Its Nerts page was read instead.
- pysolfc.sourceforge.io: HTTP 403. The same rule files were read from the project's source.
- minesweeper.online, solitairebliss.com, worldofsolitaire.com, tetris.com: each returned a page shell with no help text in it.
- Microsoft Solitaire Collection: no help page was found; one guessed address returned 404.
- Google's built-in Minesweeper, Snake and Solitaire: not reachable outside a search results page.
- Fandom wikis for Peggle and Balatro: HTTP 403. No transcript of Balatro's tutorial was found.
- Threes: its site carries no help text.
- Poki and CrazyGames pages for an Asteroids clone and for Snake: the addresses tried returned 404 or a category page. Coolmath's Asteroids page was read.
- Cabinet instruction cards: no clean transcription was found, only the OCR fragment quoted above.

---

## Patterns

Counts are out of the 31 counted sources unless a smaller base is named. The coding sheet at the end lists every source's row.

### Overall structure and length

- Length falls into five bands by medium, with little overlap.
  - In-game panel or store "how to play": 24 to 195 words (NYT 78 to 194, 2048 32, BBTAN 36, Ballz 24).
  - Portal instruction paragraph: 35 to 100 words of real instruction, set inside a page of 350 to 950 words of tips, history and FAQ.
  - Open-source rule sheet: 140 to 530 words (PySolFC 138 to 194, KPatience 180 to 320, Aisleriot 530, GNOME Mines about 280 over two pages).
  - Web rules page: 500 to 800 words (Sudoku.com 600, minesweepergame.com 540, CardGames.io 500 to 725, Bicycle 785, Solitaired 680, 247 Solitaire 670).
  - Printed manual: 700 to 2,200 words (Arkanoid 700, Alleyway 1,100, Asteroids 1,870, Breakout 2,000, Tetris 2,200).
- 23 of 31 state the goal in the opening paragraph of the how-to-play section, and one more (Coolmath) does so on two of its four pages. Of the 7 that do not, 3 put it in a labelled section straight after the setup (Bicycle, BVS, Aisleriot), 2 bury it mid-text (247 Solitaire, arcade Asteroids), and 2 never state it (Green Felt, Board Game Arena).
- The goal sentence comes in two forms. 16 sources use a noun and "is to": "The object of the game is to…" (Atari Asteroids, Tetris, Alleyway), "The objective…" (Bicycle, CardGames.io, 247 Solitaire, both arcade manuals), "The goal…" (KPatience, Coolmath, Poki), "The aim…" (GNOME Mines, CrazyGames), "Your mission is to…" (Atari Breakout, Arkanoid), "Your job is to…" (Simon Tatham). 8 use a bare imperative with no label (NYT, PySolFC, Aisleriot, itch.io, Armor Games, Lichess, 2048, BBTAN and Ballz). The other 7 use an infinitive fragment (BVS), "To win, you want to…" (Solitaired), a narrative or descriptive sentence (pagat, Sudoku.com, minesweepergame.com), or nothing (Green Felt, Board Game Arena). The noun follows the kind of text: "object" belongs to the console manuals and the card rule books (Atari, Nintendo, and the headings of Bicycle, BVS and PySolFC); "objective", "goal" and "aim" are spread across the rest; the newest and shortest texts use no noun at all.
- The usual order, where a source has the parts: goal, then what is on the screen or table, then the moves, then controls, then scoring, then tips. Exceptions: Nintendo's manuals put controls second, before play; five of the ten card sources describe the layout before the goal.
- 9 sources name things by first saying where they are on screen ("On the top left, you’ll see a stack of cards. This is called your stock pile."; "The Stock: The pile of facedown cards in the upper left corner."; Aisleriot's "Top left pile."; the screen legends in Tetris, Alleyway and Atari Breakout).
- Collections reuse one skeleton across games. Seen on several pages each: PySolFC (fact line, Object, Rules), NYT (goal sentence, bullets, examples), Simon Tatham (description, controls, parameters), the Atari manuals (game play, controller, console controls, scoring, variations, hints). Aisleriot (Setup, Goal, Rules, Options, Scoring, Strategy) and Bicycle (The Pack, Object of the Game, Rank of Cards, The Deal, The Play) read like templates too, though only one page of each was read.
- Lists carry rules in about two thirds of the sources. The shortest texts are almost all list (NYT, BBTAN, itch.io). The card rule sheets are the main holdouts for unbroken paragraphs (pagat, PySolFC, KPatience, BVS, Green Felt's rules).
- 15 of 31 have a tips or strategy section, and in 13 of the 15 it comes after everything about rules and controls. In 13 of the 15 the tips also sit under their own heading; KPatience leaves them as unheaded closing paragraphs, and Sudoku.com labels them as rules.
- 11 of 31 carry history or an origin note. 7 of those keep it in its own section after the rules; 4 put it at or near the top.
- 5 of 31 have an FAQ, and all 5 are high-traffic web pages (247 Solitaire, Solitaired, Poki, CrazyGames, Coolmath).
- At least 12 use pictures as part of the explanation, and in 6 the prose cannot be followed without them ("As you can see…", "circled in blue", "as shown in Figure 1").

### Sentence-level habits

- Voice, by the dominant mood of the rules:
  - 8 are led by imperatives (NYT, GNOME Mines, Poki, Coolmath, Armor Games, Lichess, 2048, BBTAN and Ballz).
  - 8 are led by second-person statements such as "You have…", "You can…", "If you…" (Simon Tatham, minesweepergame.com, BVS, CardGames.io, 247 Solitaire, KPatience, CrazyGames, itch.io).
  - 6 are led by impersonal or passive statements with the cards or cells as subject (Sudoku.com, Bicycle, PySolFC, Green Felt, Solitaired, Aisleriot).
  - 4 use the third person, "the player" or "players" (pagat, both arcade manuals, Board Game Arena).
  - 5 change by section: all five console manuals use third person or story for the overview, imperatives for controls and "you" for tips.
- 29 of 31 address the reader as "you" somewhere. The two that never do are the arcade manuals written for machine owners.
- Present tense for rules everywhere. "will" marks what the game does in answer to the player ("it will be uncovered", "the ball will appear", "the game will automatically move…"). The split is steady: present for what is always true, "will" for a response.
- "can" is the working modal. Across all the saved help text: "can" about 267 times, "must" 48, "may" 43, "should" 17. In the card group alone "can" appears 130 times and "you can" 69 times. "may" for permission survives in the formal card sources (pagat, Bicycle, BVS) and the old manuals. "must" is kept for hard constraints ("Words must contain at least 4 letters.") and for deduction ("must be mines").
- "please" appears twice in about 26,000 words.
- Conditions: puzzle and card texts prefer "If" (116 uses to 38 of "When" in groups 1 and 2). The arcade and console manuals prefer "When" (61 to 47), because their events simply happen ("When you miss a ball…"). Portals are even (18 to 15).
- Exceptions follow the rule at once, in their own sentence, opened by "However,", "Note:" or "NOTE:", "Remember, however,", or by a bare "If". "only" does much of the limiting ("can only be filled by a King", "Only the top card of a pile or a card in a free cell can be moved.").
- Worked examples with concrete values appear in 16 of 31, and in 11 of the 15 puzzle and card sources. The four puzzle and card sources without one are the tersest (GNOME Mines, BVS, PySolFC, Aisleriot). "For example," is the usual opener; the example follows the abstract rule in the same paragraph.
- Mean sentence length by medium: in-game panels and tutorials 5 to 10 words; portals 11 to 14; console manuals 13 to 16; open-source rule sheets 10 to 18; card and puzzle rules pages 15 to 21; operator manuals 19 to 23.
- Contractions appear in 21 of 31. The 10 without any are the driest rule sheets and the operator manuals (BVS, PySolFC, KPatience, GNOME Mines, minesweepergame.com, Armor Games, both arcade manuals, 2048, Board Game Arena).
- Semicolons appear in 7 of 31, all prose-heavy or old (Simon Tatham, Sudoku.com, pagat, Bicycle, both Atari manuals, arcade Asteroids). The other 24 have none.
- Parentheses are the manuals' and reference texts' tool for glossing a term at first use ("LEVEL (falling speed of the blocks)", "(a double)", "UFOs (Unidentified Flying Objects)"). Tetris has 37, Atari Asteroids 25, pagat 22. NYT has one across six panels.
- A colon after a label is the commonest punctuation device across every group: "Normal mode: Add 1 number to a cell.", "The Stock: The pile of…", "Movement: A&D / Arrow Keys", "Desktop: Arrow keys", "To Serve the Ball:", "A Button: launches…".
- Numbers: scores and point values are always digits. For small counts, newspapers, portals and modern games use digits ("6 tries", "3 levels", "5 dice"); card references and old manuals write words ("thirteen cards", "five balls", "four spaceships").
- On-screen labels are reproduced exactly as displayed and set off by capitals, quotes or bold: "tap 'Submit'", "the "Multinumber" button", "the START Button", ‘Custom...’, "GAME OVER".

### Controls and input

- Base: the 29 sources that describe a digital game. 13 have a labelled controls block. 3 have a partial one (one game out of several, or an unlabelled paragraph that is mostly controls). 13 have none and mention input in passing or not at all.
- By group: all 5 console manuals and 4 of 5 portals have a controls block; 2 of the 8 digital card sources do (Green Felt, and Solitaired's shortcuts table in a separate dialog); none of the 4 modern-game sources do.
- Four rules pages for a mouse-driven game never name an input for a move: Sudoku.com, BVS, 247 Solitaire and Solitaired's how-to text. "drag" appears in only two sources in the whole set (CardGames.io, Green Felt).
- Three ways to write a control line:
  - Input first, as a sentence: "Use the arrow keys to control your Snake", "Press SPACE to shoot", "Left-click to shoot", "Use your arrow keys to move the tiles." This is the commonest form in prose.
  - Purpose first, as a sentence: "To pause the game, press the START Button.", "To change levels, tap < in the toolbar.", "To erase a single pencil mark, right-click in the square and type the same number again." Used where the reader arrives with a goal.
  - A two-column list, key and action or action and key: Green Felt, Solitaired's table, itch.io, Armor Games, Poki ("Desktop: Arrow keys"), the Tetris button table.
- Simon Tatham alone writes controls as state-then-result conditionals ("If you left-click in a covered square, it will be uncovered."), which handles the case where one input does different things in different states.
- Key names are not standardised across the field, or even inside one site. The arrow keys are "arrow keys" (NYT, 2048, Coolmath Snake), "Arrow Keys" (itch.io, Armor Games, Coolmath Asteroids), "cursor keys" (Simon Tatham), "Up arrow, Down arrow, Left arrow, Right arrow" (Poki). The space bar is "Space", "the space bar", "the spacebar", "SPACE", "'Space'", "Space Bar". Console manuals come closest to a standard: the two Nintendo booklets write "the START Button", "the A Button" and "the Control Pad" nearly every time.
- Mouse verbs: "left-click" and "right-click" as hyphenated verbs (Simon Tatham, Coolmath, CrazyGames), unhyphenated in CardGames.io and GNOME. "tap" belongs to NYT, which uses it for every device. "swipe" appears only for 2048 on Poki and for Ballz.
- Base: the 15 sources for games played in a browser. 4 name a touch gesture (NYT, CardGames.io for Minesweeper, Poki, CrazyGames in an FAQ). The other 11 describe mouse and keyboard only.
- Pause is explained in 7 of 31 (three console manuals, NYT Sudoku, Coolmath Snake, one itch.io page, Armor Games).

### Scoring and edge cases

- 11 of 31 have a scoring section or table; NYT adds a three-bullet scoring block for Spelling Bee alone. All 5 console manuals have one. Of the 9 single-player solitaire texts, 7 say nothing about score.
- Console manuals give score as a table of thing and points ("SMALL ASTEROIDS 100 POINTS", "Red - 7 points", "white - 50"). Web sources that mention score write sentences with "are worth", "scores", "you get" or "earn" ("4-letter words are worth 1 point each.", "Each card in the Foundation piles scores one point.", "Each time you hit a block, you get 100 points").
- One source shows a worked sum (CardGames.io: "500-70+3*100 = 730 points"). One states the maximum (Aisleriot: "Maximum possible score: 52"; Atari Breakout gives 864 in prose).
- Losing: of the 9 single-player solitaire texts, none says in its rules what happens when no move is left. They state the win and stop.
- Of the 20 other sources whose game can be lost or can end, 12 state the end condition in a sentence and 8 leave it implied. The 8 include NYT, Coolmath, both Atari 2600 manuals, NES Arkanoid and 2048.
- The end sentence is short and plain when present: "If you uncover a square containing a mine, you lose.", "If the blocks pile up to thetop of the game field, that's the end of the game." (the transcriber's typo), "The game ends when the grid is full and no matching tiles can merge.", "If the bricks come down to the bottom, it’s GAME OVER."
- The unit of a life is named after the thing on screen: "balls" (Atari Breakout), "paddles" (Alleyway), "spaceships" (Asteroids), "Vaus" (Arkanoid), "tries" (Wordle), "mistakes" (Connections). "lives" is the generic word on portals.
- Automatic behaviour is announced in about 7 sources, usually with "automatically" and "will" ("they will be automatically opened as well", "This will be done for you automatically").
- Reasons for a rule are rare: 4 of 31 give one (Simon Tatham's "for safety", pagat's "The reason for this rule is…", CardGames.io's "to prevent you from…", PySolFC's "To compensate for this…").
- Where a version differs from the game people know, the better texts say so in one sentence: "This version of it has an unusual property." (Simon Tatham), "Coolmath’s Snake game is different from most.", "This isn't allowed in all Solitaire versions, but we allow it here :)" (CardGames.io).

### Tone

- 17 of 31 use at least one exclamation mark in the help. In all but three of those the rate is about one per hundred words or lower; the three heavy users are tutorials or two-sentence blurbs (Lichess, 2048, Ballz). The mark sits on the win line ("you’ve won!"), the danger line ("If you click on a mine you lose the game!") or a bonus ("These are worth 7 extra points!").
- About 13 of 31 have a recognisable voice (NYT, Simon Tatham, CardGames.io, KPatience, Aisleriot, 247 Solitaire, CrazyGames, Coolmath, four of the console manuals, Lichess). In every one the personality sits in an aside, a section opener or a tip. No source puts a joke inside a rule sentence.
- Reassurance words ("simple", "simply", "just", "easy") appear in about 10 sources, mostly manuals and portals ("It's really simple to play.", "The aim of the game is simple"). NYT, pagat, PySolFC, Aisleriot and GNOME Mines do without them.
- A challenge question closes the instruction paragraph on portals and store blurbs ("How long can you survive?"). Rule sheets and newspapers never do this.
- Fiction frames the rules in 2 of 31 (Atari Asteroids, NES Arkanoid), both console manuals, and both keep it in a separate opening section. No web source tells a story.
- Encouragement is addressed to beginners in portals and manuals ("Not to worry though…", "First don't panic!"). Reference texts never encourage.

### Differences between source groups

- Newspaper puzzles (NYT): the shortest and most uniform. A bare imperative goal, a handful of bullets, picture examples with patterned captions, digits, "tap", almost no "you", one dry aside at most. They state what is allowed and required and leave consequences to the game. Register: an editor's standing instructions.
- Hobbyist and open-source puzzle docs (Simon Tatham, GNOME Mines, minesweepergame.com): second person, complete, exact about states and edge cases, plain and a little dry. They separate what the game is from how the program is driven. Register: a careful manual page.
- Card rule references (pagat, Bicycle, BVS, PySolFC, Aisleriot, KPatience): impersonal or third person, with the cards and piles as subjects, the inherited vocabulary used without definition ("build down by alternate color"), "may" for permission, few or no contractions, no exclamation marks apart from a closing flourish. The collections are terse to the point of fragments. Register: a rule book.
- Solitaire websites (CardGames.io, 247 Solitaire, Solitaired, Green Felt): the same rules retold in second person with "can", worked examples with named cards, screen positions, contractions, and a tour-guide order that follows the screen. They add what the site does (auto-finish, undo, shortcuts) and leave out score and the stuck state. Register: a friendly walkthrough.
- Portals (Poki, CrazyGames, Coolmath, itch.io, Armor Games): one short imperative paragraph or a keys list that is the real help, wrapped in tips, history and FAQ written for search. Loosest vocabulary of any group ("paddle", "pedal", "platforms", "spaceship" for one object). Register: a blurb with a controls line.
- Console manuals (Atari, Nintendo): the longest and most complete. Numbered sections, a contents list, a screen legend, a controls section per button, score tables, numbered tips, and exact numbers for hidden mechanics. Voice shifts by section. Nintendo is plainer and more exact than Atari, which sells as it explains ("Don't blink."). Register: a product booklet.
- Operator manuals (arcade Breakout and Asteroids): third person, long cause-and-effect sentences, no address to the reader, every state of the machine described. Register: a technical description.
- Modern games (Lichess, 2048, BBTAN, Ballz): the fewest words. One idea per line or screen, imperatives, a single "If" or "When" sentence for the one rule that needs it, and the board does the rest. Register: a caption.

---

## Outliers worth stealing from

- NYT, the goal as a subtitle. The first line under the title is one imperative sentence that is the entire goal ("Find groups of [four] items that share something in common."). Everything after it is a constraint or an example.
- NYT Wordle, patterned captions. Three examples share one frame and differ in one phrase: "…is in the word and in the correct spot.", "…is in the word but in the wrong spot.", "…is not in the word in any spot." The reader learns the system from the differences. minesweepergame.com does the same with "The 2 touches 2 squares so they must both be mines."
- NYT Spelling Bee, a heading that instructs: "Score points to increase your rating." The heading tells the reader why the scoring list matters.
- NYT Sudoku, access in the help itself: "Screen readers announce its row and column." It is the only source of the 31 to mention assistive technology, and its keyboard block is the cleanest ("Press Escape to pause your game.").
- Simon Tatham, controls by state. "If you left-click in a covered square…" and "If you left-click in an uncovered square…" make one input with two meanings unambiguous. He also names an action, then defines it: "it will ‘clear around’ the square. This means: …".
- Simon Tatham and Coolmath, saying what is different here. One sentence flags the departure from the game the reader already knows ("This version of it has an unusual property.").
- CardGames.io, a move as a summary line plus detail. Each allowed move opens with a short imperative sentence that could stand alone as a list ("Move a card from the Waste onto the Foundations."), followed by "You can…" detail. A reader can skim the first sentences only.
- GNOME Mines and CardGames.io, outcomes as a list. "You will reveal:" followed by each thing a click can uncover and what it means.
- PySolFC and BVS, the fact line. "Klondike type. 1 deck. Unlimited redeals." and "1 deck. Difficult. 2 redeals." put the settings a returning player wants in six words above the prose.
- Aisleriot, setup as a table of piles. One row per pile, each starting with where it is ("Top left pile.").
- Alleyway, exceptions stated flatly next to the rule: "If you fail to hit the ball with the paddle in the bonus stage, it does not count as a miss. The stage simply finishes." and the cap on extra paddles. It also defines its own word at the point of use ("The game screens are called "stages".").
- Alleyway's "GAME OUTLINE", the whole game in five sentences: object, clearing a stage, finishing, losing a life, game over. minesweepergame.com's first paragraph does it in four.
- Tetris, the screen legend and named outcomes. Every readout gets one line ("NEXT Shows the next block."), and outcome names arrive in parentheses where they are first earned ("(a double)").
- Tetris, the reader's question as a heading: "What should I do when this happens?"
- Atari Breakout, tips that disclose mechanics with numbers: "The ball will speed up after the twelfth consecutive hit OR when it hits any brick in the top three rows." Its variation list pairs a three-word hook with one fact ("Don't blink. The only time you'll see your Breakout wall is when the ball hits a brick.").
- Atari Asteroids, benefit and risk in one sentence joined by "but" (hyperspace, shields).
- 2048, two sentences: the control, then the rule ("Use your arrow keys to move the tiles. When two tiles with the same number touch, they merge into one!"), with only the target, the control and the result in bold.
- Poki's 2048 page, micro-examples ("Two 4s become an 8. Two 8s become a 16.") and controls by device ("Desktop: Arrow keys", "Mobile: Swipe in any direction").
- BBTAN, four numbered lines in a fixed order: what you do, what the world does, the goal, how you lose.
- Coolmath Snake, the three-sentence paragraph: goal, controls, danger.
- Lichess, restrictions as "You cannot … if …" and "… only works if …", one per screen, and a rule compressed to an equation ("Queen = rook + bishop").
- pagat, variations as "Some people…" and "Some play that…", which records an alternative without endorsing it, and "and so on" after two instances to show a pattern ("a red six is placed on a black seven, a black ten on a red jack, and so on").
- KPatience, a formula where a rule is arithmetic (the largest sequence you can move in Freecell).
- CrazyGames, the FAQ answer that compresses a game to two imperatives: "Hit the ball to destroy the colored blocks until there are none left. Make sure you don't miss the ball."

---

## Things almost nobody does

- Say what happens when a solitaire game is stuck or lost: 0 of 9 single-player solitaire texts do so in the rules.
- Mention assistive technology or keyboard-only play as such: 1 of 31 (NYT Sudoku).
- Describe touch input for a browser game: 4 of 15.
- Mention undo: 4 of 31 (Simon Tatham, CardGames.io, Green Felt, 247 Solitaire). Starting over is explained only by Simon Tatham and the console manuals (the reset switch or button), and listed as a key or button by Green Felt and 247 Solitaire.
- Explain pause: 7 of 31.
- Give a reason for a rule: 4 of 31.
- Give a separate glossary of terms: 1 of 31 (Atari Breakout's "BREAKOUT GLOSSARY"). Everyone else defines a term where it is first used, or not at all.
- Keep one name for one thing across a whole site. Inside single sources the paddle is also a "pedal", "platforms" and a "spaceship"; a brick is also a "block"; "talon" means the stock in two sources and the waste in a third; lives become "players" once. The consistent sources are the ones with an editor or a single careful author (NYT, Simon Tatham, Nintendo, Aisleriot, pagat).
- Standardise key names. No two portals write the arrow keys or the space bar the same way, and Coolmath differs between its own pages.
- State the goal with no label at all outside the shortest modern texts: 8 of 31 use a bare imperative.
- Put a joke, a pun or an exclamation inside the sentence that states a rule: none.
- Say "please": twice in about 26,000 words.
- Use emoji: only the two store listings. CardGames.io uses text smileys.
- Use all-capital headings or key names in modern text: only the old manuals, plus "GAME OVER" quoted as it appears on screen.
- Write play as a short list of steps: 3 or 4 of 31 (GNOME Mines, BBTAN, the "TO START PLAY" and selection steps in the Atari and Tetris manuals). Sudoku.com numbers its rules, which is a different thing.
- Tell the reader how long a game takes: none of the 31. Difficulty gets a word or a number in a few (BVS's "Difficult.", the solvable rates in PySolFC and KPatience).
- Refer to the player as "he": only the Atari Breakout manual of 1978 ("until he misses the ball"). The arcade Asteroids manual writes "his or her", Board Game Arena uses "they", and everyone else avoids the question with "you".
- Separate the rules of the game from what this particular program does. Simon Tatham, Aisleriot and Green Felt keep the two in different sections; most web sources blend them in one paragraph.

---

## Measures

Words and mean sentence length for the saved help section of each source (help only). From a script; treat as rough. The "!" column is the number of exclamation marks in that text.

| Source                                                        | Words           | Mean sentence length | "!"                         |
| ------------------------------------------------------------- | --------------- | -------------------- | --------------------------- |
| NYT Wordle                                                    | 82              | 10                   | 0                           |
| NYT Connections                                               | 87              | 8                    | 2                           |
| NYT Spelling Bee                                              | 96              | 7                    | 1                           |
| NYT Sudoku                                                    | 194             | 9                    | 0                           |
| NYT Tiles                                                     | 106             | 8                    | 0                           |
| NYT Letter Boxed                                              | 78              | 7                    | 1                           |
| Simon Tatham, Mines                                           | 555             | 21                   | 0                           |
| Simon Tatham, Solo                                            | 630             | 20                   | 0                           |
| Simon Tatham, Same Game                                       | 205             | 16                   | 0                           |
| Sudoku.com                                                    | 600             | 19                   | 0                           |
| minesweepergame.com                                           | 540             | 13                   | 2                           |
| pagat, Nerts                                                  | 2,150           | 21                   | 9 (all inside quoted calls) |
| Bicycle, Solitaire                                            | 785             | 19                   | 1                           |
| BVS, Klondike                                                 | 210             | 11                   | 0                           |
| PySolFC, Klondike / Spider / FreeCell                         | 138 / 165 / 194 | 13 / 12 / 16         | 0                           |
| CardGames.io, Solitaire / Spider                              | 665 / 660       | 16 / 20              | 0                           |
| CardGames.io, Minesweeper / Sudoku                            | 725 / 500       | 16 / 26              | 1 / 0                       |
| Green Felt, Klondike                                          | 565             | 32                   | 0                           |
| 247 Solitaire                                                 | 670             | 15                   | 8                           |
| Solitaired, Klondike                                          | 680             | 20                   | 1                           |
| KPatience, Klondike / Freecell                                | 180 / 320       | 15 / 18              | 0                           |
| Aisleriot, Klondike                                           | 530             | 10                   | 1                           |
| Poki, Brick Breaker / 2048                                    | 100 / 325       | 12 / 13              | 2 / 0                       |
| CrazyGames, Atari Breakout / Bubble Shooter (whole page text) | 780 / 945       | 11 / 12              | 1 / 4                       |
| Coolmath, Snake / Breakout / Minesweeper                      | 390 / 355 / 455 | 13 / 14 / 18         | 4 / 2 / 3                   |
| itch.io, long page / short page                               | 340 / 34        | 11 / 8               | 2 / 0                       |
| Armor Games, Controls block                                   | 66              | 8                    | 0                           |
| Atari 2600 Breakout                                           | 2,000           | 15                   | 7                           |
| Atari 2600 Asteroids                                          | 1,870           | 16                   | 0                           |
| Game Boy Tetris                                               | 2,200           | 16                   | 6                           |
| Game Boy Alleyway                                             | 1,100           | 16                   | 0                           |
| NES Arkanoid                                                  | 700             | 13                   | 8                           |
| Arcade Breakout, summary of game play                         | 675             | 23                   | 0                           |
| Arcade Asteroids, play mode                                   | 600             | 19                   | 0                           |
| Lichess Learn (173 strings)                                   | 1,130           | 5                    | 105                         |
| 2048                                                          | 32              | 11                   | 2                           |
| Board Game Arena, Yatzy (General and first list)              | 225             | 12                   | 0                           |
| BBTAN / Ballz                                                 | 36 / 24         | 9 / 8                | 0 / 2                       |

## Coding sheet

One row per counted source. Columns:

- Goal first: the goal is stated in the opening paragraph of the how-to-play section (Y, N, or M for mixed across pages).
- Voice: I imperative-led, Y second-person-led, P impersonal or passive-led, T third person, X changes by section.
- Controls: a labelled controls block (Y, P partial, N none, "–" for a table game).
- Scoring, Tips, Example, Contractions, "!": present in the help (Y or N; P partial).
- End stated: the losing or ending condition is stated in a sentence (Y or N; "–" where the game has none).

| #   | Source                   | Goal first | Voice | Controls | Scoring | Tips | Example | Contractions | "!" | End stated                         |
| --- | ------------------------ | ---------- | ----- | -------- | ------- | ---- | ------- | ------------ | --- | ---------------------------------- |
| 1   | NYT Games                | Y          | I     | P        | P       | Y    | Y       | Y            | Y   | N                                  |
| 2   | Simon Tatham's puzzles   | Y          | Y     | Y        | N       | N    | Y       | Y            | N   | Y                                  |
| 3   | Sudoku.com               | Y          | P     | N        | N       | Y    | Y       | Y            | N   | –                                  |
| 4   | minesweepergame.com      | Y          | Y     | N        | N       | Y    | Y       | N            | Y   | Y                                  |
| 5   | GNOME Mines              | Y          | I     | Y        | N       | N    | N       | N            | N   | Y                                  |
| 6   | pagat (Nerts)            | Y          | T     | –        | Y       | N    | Y       | Y            | N   | Y                                  |
| 7   | Bicycle                  | N          | P     | –        | N       | N    | Y       | Y            | Y   | N                                  |
| 8   | BVS Solitaire            | N          | Y     | N        | N       | N    | N       | N            | N   | N                                  |
| 9   | PySolFC                  | Y          | P     | N        | N       | N    | N       | N            | N   | N                                  |
| 10  | CardGames.io             | Y          | Y     | P        | Y       | Y    | Y       | Y            | Y   | N for solitaire, Y for Minesweeper |
| 11  | Green Felt               | N          | P     | Y        | N       | N    | Y       | Y            | N   | N                                  |
| 12  | 247 Solitaire            | N          | Y     | N        | N       | Y    | Y       | Y            | Y   | N                                  |
| 13  | Solitaired               | Y          | P     | Y        | N       | N    | Y       | Y            | Y   | N                                  |
| 14  | KDE KPatience            | Y          | Y     | N        | N       | Y    | Y       | N            | N   | N                                  |
| 15  | GNOME Aisleriot          | N          | P     | N        | Y       | Y    | N       | Y            | Y   | N                                  |
| 16  | Poki                     | Y          | I     | Y        | N       | Y    | Y       | Y            | Y   | Y                                  |
| 17  | CrazyGames               | Y          | Y     | Y        | Y       | Y    | Y       | Y            | Y   | Y                                  |
| 18  | Coolmath Games           | M          | I     | P        | N       | Y    | Y       | Y            | Y   | N                                  |
| 19  | itch.io                  | Y          | Y     | Y        | Y       | N    | N       | Y            | Y   | N                                  |
| 20  | Armor Games              | Y          | I     | Y        | N       | N    | N       | N            | N   | N                                  |
| 21  | Atari 2600 Breakout      | Y          | X     | Y        | Y       | Y    | Y       | Y            | Y   | N                                  |
| 22  | Atari 2600 Asteroids     | Y          | X     | Y        | Y       | Y    | N       | Y            | N   | N                                  |
| 23  | Game Boy Tetris          | Y          | X     | Y        | Y       | Y    | N       | Y            | Y   | Y                                  |
| 24  | Game Boy Alleyway        | Y          | X     | Y        | Y       | Y    | N       | Y            | N   | Y                                  |
| 25  | NES Arkanoid             | Y          | X     | Y        | Y       | Y    | N       | Y            | Y   | N                                  |
| 26  | Arcade Breakout manual   | Y          | T     | N        | N       | N    | N       | N            | N   | Y                                  |
| 27  | Arcade Asteroids manual  | N          | T     | N        | N       | N    | N       | N            | N   | Y                                  |
| 28  | Lichess Learn            | Y          | I     | N        | N       | N    | N       | Y            | Y   | Y                                  |
| 29  | 2048                     | Y          | I     | N        | N       | N    | N       | N            | Y   | N                                  |
| 30  | Board Game Arena (Yatzy) | N          | T     | N        | Y       | N    | Y       | N            | N   | –                                  |
| 31  | BBTAN and Ballz          | Y          | I     | N        | N       | N    | N       | Y            | Y   | Y                                  |

Notes on the sheet:

- GNOME Mines lists a "Useful tips" group in its contents that was not opened, so its Tips cell is N for what was read.
- The "End stated" counts in the patterns use two bases: the 9 single-player solitaire texts (rows 7 to 15, with row 10 counted for its solitaire rules), and the 20 other sources whose game can be lost or can end (rows 1, 2, 4 and 5, row 10 for its Minesweeper rules, rows 16 to 29, and row 31). Rows 3 and 30 have no end condition to state, and row 6 is a table game for several players.
- "!" for pagat is N because its nine exclamation marks are all inside the quoted calls "Nerts!" and "Pounce!".
