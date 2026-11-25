---
name: player-text
description: How every word a player or visitor reads or hears is written here, with a shape, a word budget and examples for each kind. Load it for any such text, even one label. Triggers on: label, button text, aria-label, announce, dialog text, error message, empty state, How to play, rules page, blurb, meta description, README opening, alt text, wording, new setting, new brick or power-up, level name.
---

# Player text

> Write what you would say to a friend who is about to play. Say it to "you" in
> plain words. Stop early.

This covers every word that reaches a screen or a screen reader: in the site, in
a game, in a shared library, and in the page descriptions and README openings
that sell them. It does not cover code comments, commit messages or `AGENTS.md`
files.

## Why this exists

Agents wrote all of this text once, and it showed. Two voices came out of it.
The first shouted in capitals and gave every rule a made-up title ("Supermove
Capacity Formula:"). The second avoided all of that and grew habits of its own:
lists of three, semicolons, things that "hold" and "wait" and "say", and help
that read like a specification. It never said "if" or "you can".
[The read-back list](references/read-back.md) shows both with examples.

The second voice is what you get when you are only told what to avoid. So this
skill works the other way around. Each kind of text has a shape, a budget and
lines to copy. Start from those.

## How to write a line

1. **Find its kind** in the table below and open that file. Read the examples
   before the rules.
2. **Say it out loud** to someone sitting next to you who has never played.
   Write down what you said.
3. **Fit it to the shape and the budget.** If it will not fit, you are saying
   too much. Choose what the player needs right now and drop the rest.
4. **Check it against the code.** A friendly line that is wrong is worse than a
   stiff one that is right. Take numbers from the constants where the code has
   them.
5. **Read it back** against [the read-back list](references/read-back.md). If a
   line trips a mark, write the sentence again from the start. Do not patch the
   mark out.

## Eight habits

1. **Talk to the player.** "You", and plain orders. "Tap a square to open it."
2. **Say what the player does, then what the game does back.** This is where
   "if", "when", "can" and "will" come from. "If you open a mine, you lose a
   life." Not "A mine you step on costs a life."
3. **Use the word on the button, and the ordinary word.** Resume, Cancel, Close,
   P. One name for each thing, everywhere. The [word list](references/words.md)
   has them.
4. **One idea in a sentence.** A catch gets a sentence of its own. If you have
   joined two thoughts with a semicolon or a colon, write two sentences.
5. **Digits for numbers.** "3 lives", "20 seconds", "50% wider".
6. **Leave things out.** Help is for getting started. What a player will see in
   the first minute does not need saying. Exact timings and edge cases belong in
   the catalog line of the thing they are about, or nowhere.
7. **Quiet in the settings, louder at a win.** One exclamation mark at a win, a
   record or a level cleared. Nowhere else.
8. **Jokes go in names and asides.** A brick can be called a Bumper. Its line
   still says plainly what it does.

Solitaire, Sudoku and Minesweeper stay calm, in full sentences. Snake, Brick
Breaker, Asteroid Breaker, Brick Fuzz Pop and Rickashay are shorter and a little
louder: "Level 3 cleared!", "Ball lost". Brick Fuzz Pop, Rickashay and Asteroid
Breaker keep their own words: fuzzball, static, boon, rally.

## Kinds and budgets

A budget is a limit to write under, not a target to fill.

| Kind                          | Shape                                                                                          | Budget                                   | Read                                       |
| ----------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------ |
| How to play, the top          | The goal. What you do. What the game does back. How it ends. Then the controls table.          | 100 words before the table               | [how-to-play](references/how-to-play.md)   |
| How to play, a detail section | A bold lead-in, then two to four sentences. Scoring as a small table.                          | 50 words a section                       | [how-to-play](references/how-to-play.md)   |
| Solitaire rules page          | A fact line. The goal. Layout. Moves. What is different in this game.                          | 150 words a game                         | [how-to-play](references/how-to-play.md)   |
| A thing in a catalog          | A verb with the thing as its subject. A second sentence only for a number or a catch.          | 12 words, never over 20                  | [catalogs](references/catalogs.md)         |
| Variant or option write-up    | What changes, compared with the game the player knows.                                         | 20 words                                 | [catalogs](references/catalogs.md)         |
| Card blurb                    | One rule and its catch, as an order.                                                           | 8 to 14 words                            | [descriptions](references/descriptions.md) |
| Meta description              | What it is. The goal. What is different here. No list of controls.                             | 155 characters                           | [descriptions](references/descriptions.md) |
| Project page on fuzzley.info  | What it is. What is different about it. When and how it was made.                              | 60 words for the opening                 | [descriptions](references/descriptions.md) |
| Alt text, caption             | What the picture shows.                                                                        | 1 sentence, 15 words                     | [descriptions](references/descriptions.md) |
| Button, menu item             | A verb first. No full stop.                                                                    | 2 words, 3 at most                       | [labels](references/labels.md)             |
| Setting name                  | A thing, or a verb and a thing.                                                                | 3 words                                  | [labels](references/labels.md)             |
| Line under a setting          | What it does when on. Leave it out when the name says it.                                      | 14 words a sentence, 2 sentences at most | [labels](references/labels.md)             |
| Tooltip                       | The button, with its object.                                                                   | 3 to 7 words                             | [labels](references/labels.md)             |
| Prompt                        | An order that names the key or the touch.                                                      | 9 words                                  | [labels](references/labels.md)             |
| Notice                        | A flat fact.                                                                                   | 5 words                                  | [messages](references/messages.md)         |
| Confirmation                  | A question that names the action. One sentence on what is lost. Buttons named for the outcome. | 6 words, then 12                         | [messages](references/messages.md)         |
| Win, loss, level cleared      | A headline. One line with the measure. A next step.                                            | 5 words, then 12                         | [messages](references/messages.md)         |
| Error                         | What happened. What to do.                                                                     | 2 sentences                              | [messages](references/messages.md)         |
| Nothing to show               | "No" and a noun. A way out.                                                                    | 5 words                                  | [messages](references/messages.md)         |
| Spoken: an event              | The words on the screen, or fewer.                                                             | 12 words                                 | [spoken](references/spoken.md)             |
| Spoken: the keys              | A list, one key and its action at a time. Keys by name.                                        |                                          | [spoken](references/spoken.md)             |

[The swipe file](references/swipe.md) has lines from shipped games for every
kind. When you are unsure how a line should sound, look there first.

## House rules

These are the ones a script could check.

- **American spelling.** color, gray, toward, center.
- **Sentence case** for buttons, menu items, headings and setting names: "New
  game", "Card back", "How to play". The names of games and of things in them
  keep their capitals where the game shows them that way: Brick Breaker, Wide
  paddle, Draw 3.
- **Digits for every count.** "3 lives", "2 to 4 hits". Write "one" only as a
  pronoun: "you lose one".
- **Keys by name**, each in its own `<kbd>`: P, Space, Esc, Enter, Shift, the
  arrow keys. Never name a key by where a finger rests.
- **Press** a key, **tap** a touch screen, **click** a mouse.
- **No full stop** on a button, a menu item, a heading, a tooltip, a notice or a
  result headline. A full stop on every sentence in help, in a catalog, under a
  setting and in a dialog's body.
- **Quote a label the way the screen shows it.** If the button says Hint, write
  "Press Hint again".
- **One name for each thing.** Check the [word list](references/words.md) before
  you name anything.
- **No sentence over 25 words** in help or a description. Split it.

## Read it back

Do this after the draft, as a separate pass. Ask of each line:

- Would I say this out loud?
- Is there a "you" where the player acts, and an "if" or a "when" where
  something can happen?
- Does it explain the interface? If you have to explain how a control works, the
  fault may be in the control or its name. Fix that first.
- For a blurb: put another game's name in it. If it is still true, it says
  nothing.
- Is it true? Check it against the rules in the code once more.

Then go through [the read-back list](references/read-back.md). The marks come in
clusters. One list of three real things is fine. Three marks in a paragraph mean
the paragraph was written on autopilot, so write it again.

To see how a workspace's text measures up, run the report on it:

```sh
node docs/text-style/inventory/report.mjs games/snake
```

The report lists the workspace's text as it is now. Then it prints every line
over its budget and every line that trips a mark, with the file and the line
number. It also counts "if", "when", "can", "will" and "you". If those are near
zero in help text, the rewrite has not taken. The report is a rough net. Read
what it flags and decide for yourself.

## When you change text

- **Specs find things by their words.** Search the workspace's specs for the old
  text and update them in the same change.
- **A game's description is typed out in several places.** The site's card blurb
  is in `frontend/site/src/app/provider/games.ts`. The game's `index.html` holds
  three copies (the meta description, Open Graph, JSON-LD) and a `<noscript>`
  line. Its `README.md` opens with one. Change them together.
- **A longer or shorter label can move a bar.** Run the game's layout check when
  its shell's text changes.
- **When to announce** is in the `web-game-accessibility` skill. This skill
  covers the words.
- **In review,** a change that adds or edits player text is read against this
  skill, line by line.

The research behind all of this, with sources, is in
`docs/text-style/research/`. The plan that set it up is
`docs/text-style/plan.md`.
