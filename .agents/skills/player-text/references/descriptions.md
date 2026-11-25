# Descriptions

The lines that tell someone what a game is before they play it: the card blurb
on the site, the meta description a search engine shows, the `<noscript>` line,
the opening of a README, a category line, a picture's alt text, and the project
pages on fuzzley.info.

## Lines to copy

From other sites:

- "Find all the mines without treading on any of them." (Simon Tatham's puzzles.
  All 39 of his are built this way.)
- "Guess the hidden word in 6 tries. A new puzzle is available each day." (The
  New York Times)
- "Group words that share a common thread." (The New York Times)
- "Every deal has a solution." "Guessing is not required." (claims you can
  count)

From these games, as they should read:

- Minesweeper: "Clear the field using the numbers. Don't hit a mine."
- Sudoku: "Fill the grid so every row, column and box has 1 to 9."
- Snake: "Eat the apples. Don't hit the walls or your own tail."
- Brick Breaker: "Break every brick. Don't let the ball get past your paddle."
- Asteroid Breaker: "Shoot every rock before one hits your ship."
- Brick Fuzz Pop: "Fire the fuzzball to break the bricks before they reach the
  floor."
- Rickashay: "Aim the fuzzball. The more bricks a shot hits, the more you
  score."
- A solitaire game, as a fact line: "Klondike from 2 decks, on 9 columns."
- A meta description: "Minesweeper with lives, free in your browser. Hitting a
  mine costs a life instead of ending the game. Easy, Medium, Hard or a board of
  your own."

## The card blurb

8 to 14 words. One rule and its catch, as an order to the player. The catch is
what tells this game from the one next to it: "without treading on any of them",
"before one hits your ship".

Every blurb on the site uses this one mold. That sameness is fine. Sites that
are edited with care all do it.

A solitaire game that is a cousin of a better-known one can say so in a fact
line: "FreeCell with every Ace and 2 dealt to the bottom."

Do not write three verbs in a row for the sound of it. "Eat, grow and keep clear
of your own tail" was that.

## The meta description

155 characters, since a search result cuts it there. Three parts:

1. What it is, and that it is free in the browser.
2. The goal, or the one thing you do.
3. What is different here: lives in Minesweeper, hints that explain themselves
   in Sudoku, how many levels.

Do not list the ways to play it. "By mouse, touch or keyboard" is true of
everything here.

The Open Graph and JSON-LD descriptions in the same `index.html` say the same
thing as the meta description. The `<noscript>` line is the blurb, then "Turn on
JavaScript to play."

## A README opening

One or two sentences in the same voice: what the game is and what is different
about it. The build notes that follow are for developers and are not covered
here.

## The swap test

Put another game's name into the sentence. If it is still true, the sentence
says nothing, so cut it or make it say something only this game can claim. "A
classic game of skill for all ages" passes for anything.

No "addictive", "ultimate" or "classic" as praise. No exclamation mark. Say a
thing you can count: "50 levels", "41 games", "every puzzle has one solution".

## Category lines and taglines

A category line is 3 to 8 words and says what is in the category. "Card games
for one player." "Puzzles and board games."

## Alt text and captions

One sentence, 15 words at most. Say what the picture shows, the way you would
describe it over the phone. "A Klondike game with 3 cards on the foundations."
Do not start with "Image of" or "Screenshot of". A picture that is only
decoration gets an empty `alt`.

## fuzzley.info project pages

60 words for the opening. What it is, what is different about it, then when and
how it was made.

Say "you" for how it plays and "I" for how it was made.

- "Minesweeper, but you get lives. Hitting a mine costs one instead of ending
  the game. I first wrote it in 2016 with jQuery and Knockout, and later rebuilt
  it in Angular."

The tools go in one line or a tag list, not in the pitch. Be plain about old
work: "the first version, from 2013" is fine.

The profile and the work history on fuzzley.info are the owner's own words.
Leave them alone unless asked.
