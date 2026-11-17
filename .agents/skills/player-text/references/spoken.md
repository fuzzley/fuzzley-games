# Text for screen readers

`aria-label`s, the names of regions, and what the announcer says. The
`web-game-accessibility` skill says when to announce and how to wire it. This
file is about the words.

## Lines to copy

From shipped games:

- "1st letter, A, correct" (Wordle)
- "ace of clubs", "flag mode on", "That's a match."
- Icon buttons named for what they do: "Back to main menu", "Open information
  and settings".

From these games, as they should read:

- "Ball lost. 2 lives left."
- "Paused on level 7, Arch. Score 1,200. 2 lives. Press Enter to resume."
- "Notes on." "Notes off."
- "Solved in 4:12."
- The keys, as a list: "Left and Right, or A and D: move the paddle. Space:
  launch the ball, or fire. P: pause and resume. Esc: pause. Enter: resume, or
  go to the next level."

## The rules

**Say what the screen says, or less.** If a notice is on the screen, the
announcement is the same words. Do not write a longer, more careful version for
the screen reader. A listener cannot skim, so a long line costs them more than
it costs a reader.

**12 words for an event.** Short sentences with a full stop each: "Ball lost. 2
lives left." Several short sentences are easier to hear than one long one with
commas.

**Order: where, what, state.** "Row 3, column 4, 7, given." "Level 5, locked."

**A button's name is what it does.** "Close settings", "Undo the last move". Not
the picture on it, and not the word "button", which the screen reader adds
itself.

**A summary is a list of facts.** "Paused on level 7, Arch. Score 1,200. 2
lives." Not "Your last run is paused on level 7, Arch, with a score of 1,200 and
2 lives."

**Keys are a list, by name.** One key and its action at a time, each ending with
a full stop. Never one paragraph that walks through every key, and never a key
named by the finger that rests on it. If a game has more than eight keys, give
the ones needed to play and leave the rest to How to play.

**Same words as everywhere else.** Resume, Pause, New game. The
[word list](words.md) applies to spoken text too.

**No punctuation for effect.** A screen reader does not read an exclamation
mark. "Level 4 cleared." is fine spoken, even where the screen shows "Level 4
cleared!"
