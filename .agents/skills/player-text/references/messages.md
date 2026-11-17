# Messages and results

What the game says when something happens: a notice, a confirmation, an error,
an empty list, a win, a loss, a level cleared, a record.

## Lines to copy

From shipped games:

- Notices: "Not in word list", "Not enough letters", "Already found" (Wordle,
  Spelling Bee). "Draw offer sent", "Premove cancelled" (Lichess).
- Pause: "Paused", with a Resume button. None of the games we read puts a
  sentence on its pause screen.
- A win: "You win!" (2048), "You won!" (Antimine). Then the measure: "You found
  N mines in N seconds."
- A level: "Stage N cleared!" (Techmino). A record: "New high score!" (PROXX).
- A loss: "Game over" in 12 of the 19 games we read. With a cause: "You're out
  of guesses." (Connections) "There are no more moves" (AisleRiot)
- A confirmation: title "Abandon Current Game?", button "Abandon Current Game"
  (KPatience). "Keep Current Game" and "Start New Game" (GNOME).
- Errors: "Width and height must both be greater than two." "No moves are
  possible. Undo or start again."
- Nothing to show: "No games found". "Nothing to show, go play some puzzles
  first!"

From these games, as they should read:

- "Start a new game?" then "You'll lose the game in progress." Buttons: New
  game, Cancel.
- "Restart this game?" then "You'll lose your progress." Buttons: Restart,
  Cancel.
- "Restart this field?" then "The mines stay where they are. The clock and your
  lives reset."
- "You won!"
- "Level 4 cleared!" "All 30 waves cleared!" "New best!"
- "Game over" then "Out of lives on level 7, at Normal speed"
- "Solved in 4:12!"
- "Boom. 2 lives left."
- "Best (old rules)"
- "Turn your phone upright for a bigger board."
- "The graphics stopped. The game is paused until they come back."
- "No games match." with a "Show all games" link.
- "Couldn't load Corner Pips. Still using Classic."

## Notices

5 words. A flat fact. Sentence case, no full stop.

- Something done: the thing, then what happened to it. "Notes filled in",
  "Fast-forward on".
- Something refused: "No", "Not", "Too" or "Already" and two or three words. "No
  hint available". Never "You must" or "Please".

## Confirmations

Ask before the player loses something, and only then.

- **Title:** a question that names the action, 6 words. "Start a new game?"
  "Switch to Spider?"
- **Body:** one sentence on what is lost, 12 words, to "you". "You'll lose the
  game in progress."
- **Buttons:** the action and Cancel. "New game" and "Cancel". Not "Yes" and
  "No", and not "Confirm".

"Are you sure you want to…?" adds nothing to the question. Leave it off.

## Wins, losses and levels

- **Headline:** 5 words, no full stop. "You won!" "Level 4 cleared!" "Game
  over".
- **One line with the measure,** 12 words: the time, the score, the level
  reached. "Out of lives on level 7, at Normal speed" "Solved in 4:12 with no
  hints."
- **A next step,** as a button: Play again, Try again, Next level, Choose a
  level.

One exclamation mark at a win, a record or a level cleared. None at a loss, and
never two.

When the player loses, say why in plain words, and don't blame them. "Out of
lives", "No more moves". Not "You failed".

In Minesweeper, losing a life is a short flat line: "Boom. 2 lives left." In
Brick Breaker it is a state: "Ball lost".

No "Congratulations" and no "successfully". "You won!" is the whole of it.

## Errors

Two sentences at most. What happened, then what to do.

- A wrong value states the rule: "Rows must be a whole number from 5 to 30."
- If the fault is ours, say so plainly and say what to do next: "How to play
  couldn't be loaded. Check your connection and try again."

No error codes, no "Oops", no blame.

## Nothing to show, and waiting

- Empty: "No" and a noun, then a way out. "No games match." and a link to all of
  them.
- Loading: "Loading Klondike…" One line. Use the ellipsis character.
- Something that will come back: say what happened, and that the game is paused
  until it does. "The graphics stopped. The game is paused until they come
  back."

## Hints that explain a move

Sudoku's hint text and anything like it is a short explanation, so the rules for
help apply: "you", "if", one idea in a sentence, digits. Name the technique
once, then say what to look at. "Only one square in this row can be a 7."
