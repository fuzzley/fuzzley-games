# How to play

Help is for someone who is about to start. Tell them the goal, what they do,
what the game does back, and how it ends. Then show the controls. Stop there if
you can.

## Lines to copy

From shipped games:

- 2048, the whole help, 32 words: "Join the numbers and get to the 2048 tile!"
  Then: "Use your arrow keys to move the tiles. When two tiles with the same
  number touch, they merge into one!"
- Wordle: "Guess the Wordle in 6 tries." "The color of the tiles will change to
  show how close your guess was to the word."
- Coolmath's Snake, for the goal, the controls and the danger: "Eat as many
  apples as you can to grow as long as possible. Use the arrow keys to control
  your Snake and the spacebar to pause. Be careful not to hit the wall or eat
  your tail!"
- BBTAN, four lines for what you do, what the ball does, the goal and how you
  lose: "Aim at the bricks and shoot the ball." "The ball bounces off the bricks
  and wall." "Break all the bricks efficiently in a minimal attempt." "If the
  bricks come down to the bottom, it's GAME OVER."

From these games, as they should read:

- Snake: "Eat apples to grow. Each apple is 1 point, and the snake gets a little
  faster every time. If you hit a wall or your own tail, the game is over. Fill
  the whole board to win."
- Brick Breaker: "Bounce the ball off your paddle to break the bricks. Break
  every brick that can be broken to clear the level. If the ball gets past your
  paddle, you lose a life. The game ends when you run out of lives or clear all
  50 levels."
- Brick Fuzz Pop: "Aim the fuzzball and charge it up. Let go to shoot. It
  bounces around breaking bricks until it lands on the floor. After each shot,
  the wall moves down 1 row. Break every brick that can be broken to clear the
  level. If one of them reaches the floor, you lose the level."
- Minesweeper, a detail section: "**Lives.** You start with 3 lives. If you open
  a mine, you lose one and keep playing. When you have none left, the game is
  over."
- Sudoku, a detail section: "**Hints.** If there is a mistake on the board, Hint
  shows it. If not, it shows the next square you can solve and explains why.
  Press Hint again to fix it or fill it in. A puzzle solved with a hint doesn't
  count for a best time."
- Snake, a detail section: "**Pausing.** The game pauses when you switch tabs or
  open a menu. Press Space or P to resume."
- An aside, where a joke belongs: "A fuzzball that goes too long without hitting
  a brick gets bored and drops."

## The shape

**The top, 100 words at most.** In this order:

1. The goal, as an order or a plain statement.
2. What you do.
3. What the game does back. This is the sentence with "if" or "when" in it.
4. How it ends: how you win, how you lose.

If this version differs from the game people know, say so in one sentence. "Here
a mine costs a life instead of ending the game."

**Then the controls table.** One row for each thing you can do, named by a verb:
Move, Launch, Pause. One column for each way to play. In a cell, only the input:
"Arrow keys or `A` `D`", "Drag", "Tap". No sentences in cells. Call a key by its
name.

**Then detail sections, 50 words each.** A bold lead-in and two to four
sentences. Have one only for something a player will wonder about after a few
games: scoring, stars, a mechanic with a catch. If scoring has more than two
numbers in it, set it out as a small table. Leave out a section that only says
what the screen already shows. Do not explain pausing unless something about it
will surprise the player.

**Numbers come from the code.** Where a help component already takes a number
from a constant, keep it that way. A typed number goes stale.

## What to leave out

- An exact timing or angle, unless the player has to count it.
- An edge case that a player meets once and understands at once.
- How the interface works. "On a card's button, the keys are the button's"
  explains a thing nobody needs explained.
- A second way of saying the goal.

If a detail is true and useful but rare, the catalog line for the thing it is
about is a better home than the help.

## Solitaire's rules pages

150 words a game. People who look up a solitaire game mostly know solitaire, so
start with the facts they came for.

1. **A fact line.** Decks, the draw, redeals. "1 deck. Draw 1 or Draw 3." "2
   decks. No redeal."
2. **Goal.** One sentence. "Move all 52 cards to the 4 foundations, building
   each suit up from Ace to King." There is no separate win condition. It would
   say the same thing.
3. **Layout.** One line for each pile on the table, as a label and what it is:
   "Stock: the cards left over, face down at the top left."
4. **Moves.** What you can pick up and where it can go. Use "you can" and
   "only". "You can move a face-up run as one. Only a King can fill an empty
   column."
5. **Good to know.** Only what is different in this game, or what trips people
   up. Leave the section out when there is nothing.

Card words are the usual ones: foundation, tableau, column, stock, waste, free
cell, reserve. Ranks have a capital (Ace, King). Number cards are digits: "A red
9 goes on a black 10."

Examples:

- "Foundations: build up by suit, from Ace to King."
- "Tableau: build down in alternating colors. A red 9 goes on a black 10."
- "You can move several cards at once if there are enough free cells and empty
  columns to move them one at a time. With 2 free cells and no empty column,
  that is 3 cards."
- "When the stock runs out, click it to turn the waste over and go through it
  again."

Do not give a rule a title ("Stock Recycle:", "Kings Sink:"). A label names a
pile on the table. It does not name a sentence.
