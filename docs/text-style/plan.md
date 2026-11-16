# Player text: what we have, why it sounds machine-written, and a plan

This covers every piece of text a player or visitor reads on fuzzley.games, in
its seven games, and on fuzzley.info. It lists that text, works out what makes
it read as written by an agent, sets it beside how other games and game sites
write, and proposes a skill and guidelines to fix it. Nothing in the games or
sites has been changed.

## In short

- There are 2,928 strings and about 27,500 words. Solitaire's rules pages are
  almost half of the words.
- Two machine voices wrote them. Solitaire has the well-known one: capitals for
  stress, a made-up title on every rule, em dashes. Everything since October has
  a newer one that avoids all of that and has habits of its own: lists of three,
  semicolons, things that "hold" and "wait" and "say", "go on" for resume, and
  help written like a specification.
- The clearest measure: in 4,227 words of help in the six newer games, "if" and
  "will" never appear, and "you can" appears once. People's rules are built on
  those words.
- The trouble is in the long text. Buttons, prompts, results and the newer
  confirmations already match what real games do.
- Real games write less. A help panel is 24 to 195 words, ours reach 883. A
  thing in a game gets a line of 6 to 12 words, ours reach 55.
- The plan is a voice you choose from a sample sheet (4.3), a `player-text`
  skill built from examples, ten lines in `AGENTS.md`, a word list, a check in
  `yarn lint`, and a reader in the commit review.
- Bans alone would repeat the mistake. The newer voice is what a model writes
  when it is only told what to avoid.
- Twelve decisions are yours (section 8). The voice is the first.

## 1. What text there is

`inventory/extract.mjs` reads both repositories and lists every string that can
reach a screen or a screen reader: template text and attributes, sentence-like
strings in TypeScript, page metadata, the names in the games' level and wave
files, and the Markdown and YAML that fuzzley.info builds its pages from. It
found 2,928 strings, about 27,500 words. Errors thrown for developers, the debug
menu and test code are left out.

The two groups asked for, plus the pages around the games:

| Group              | Category              | Strings |  Words | What is in it                                                                                                                         |
| ------------------ | --------------------- | ------: | -----: | ------------------------------------------------------------------------------------------------------------------------------------- |
| Game documentation | How to play and rules |     784 | 12,414 | The help dialog in six games, with its controls table. Solitaire's rules pages for 41 games.                                          |
|                    | Reference             |     124 |  2,547 | The catalogs inside How to play (bricks, capsules, rocks, pickups). Solitaire's write-up of each rule variant.                        |
|                    | Descriptions          |     297 |  4,618 | Card blurbs on the site, category lines, taglines, meta descriptions, `<noscript>` text, README openings, fuzzley.info project pages. |
|                    | Picture text          |     103 |  1,311 | Alt text and captions.                                                                                                                |
| In-game text       | Names                 |     531 |    856 | Games, variants, levels, waves, bricks, pickups, speeds, themes.                                                                      |
|                    | Labels                |     375 |    680 | Buttons, menu items, headings, readouts, setting names and choices.                                                                   |
|                    | Hints                 |     186 |  2,071 | The line under a setting, tooltips, prompts such as "Tap to launch."                                                                  |
|                    | Messages              |      64 |    487 | Confirmations, notices, errors, Sudoku's hint explanations.                                                                           |
|                    | Results               |     100 |    239 | Win, lose and level-clear cards, records, tallies.                                                                                    |
|                    | Spoken text           |     208 |  1,239 | `aria-label`s and what the announcer says to a screen reader.                                                                         |
| Site pages         | Site furniture        |      76 |    277 | Navigation, search, footers, 404 pages.                                                                                               |
|                    | Profile               |      80 |    767 | The bio and work history on fuzzley.info.                                                                                             |

By place:

| Where                   | Strings |  Words | Note                                                       |
| ----------------------- | ------: | -----: | ---------------------------------------------------------- |
| Solitaire Collection    |   1,299 | 16,611 | 12,657 of the words are the rules pages, about 310 a game. |
| Brick Fuzz Pop          |     265 |  2,320 | How to play runs 883 words, plus 16 catalog entries.       |
| Asteroid Breaker        |     272 |  2,174 | How to play runs 588 words, plus 19 catalog entries.       |
| Brick Breaker           |     287 |  1,669 | How to play runs 296 words, plus 29 catalog entries.       |
| Sudoku                  |     149 |    881 | How to play runs 234 words.                                |
| Snake                   |      99 |    661 | How to play runs 173 words.                                |
| Minesweeper             |      99 |    495 | How to play runs 97 words.                                 |
| fuzzley.games site      |     189 |    852 | 48 card blurbs.                                            |
| Shared libraries        |      50 |    108 | Pause, Resume, Settings, How to play, the confirm dialog.  |
| fuzzley.info            |     216 |  1,689 | Five project pages, the profile, the CV.                   |
| The repository's README |       3 |     46 | Its opening lines.                                         |

The full listings are in `inventory/by-area/`, one file per place, sorted by
category with file and line. `inventory/counts.md` has the full table. The
categories are assigned by rule (file, attribute, property name), so a few
strings sit in a neighbouring category. That is good enough for counting and for
working through later.

Two facts from the inventory matter for any rewrite:

- **The same description is written out many times.** Each game's one-line pitch
  exists in up to seven places: the site's card blurb, three copies in the
  game's `index.html` (meta, Open Graph, JSON-LD), the `<noscript>` line, the
  README and fuzzley.info. In all, 96 texts of six words or more are kept in
  more than one place.
- **Tests match on the words.** 150 spec files hold about 1,330 assertions that
  find an element by its visible text or accessible name. Rewording a label
  means updating its specs, and sometimes the layout checks and the captured
  screenshots too.

## 2. Why it reads as machine-written

There are two voices, from two periods. `git log` dates them.

### Voice A: the template (July and August, Solitaire)

This is the voice most people already recognise. It is in Solitaire's rules
pages, its dialogs and its tooltips.

| Mark                            | Example from the games                                                                                                                                                                                                                                                                                                                                    | How often                                                                                                                                                                                  |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A made-up title on every rule   | "Supermove Capacity Formula: Maximum cards moved at once is…" "Empty Column Requirement: All tableau columns must contain…" "Kings Sink: …"                                                                                                                                                                                                               | Of 79 special rules, 72 open with a title, and there are 57 different titles. People do write "Stock: the pile at the top left" for a thing on the table. They do not title each sentence. |
| Capitals for stress             | "Foundations: Built UP in SAME SUIT from Ace to King."                                                                                                                                                                                                                                                                                                    | 161 times. That one sentence appears 16 times.                                                                                                                                             |
| Em dashes                       | "Always 104 cards — fewer suits means more copies of each, and a far gentler game."                                                                                                                                                                                                                                                                       | 76 times, and none in the manuals.                                                                                                                                                         |
| Stock words                     | "initially empty", "respectively", "automatically", "a highly strategic solitaire game", "The signature rule of Yukon is…", "(e.g., Red 9 on Black 10)", "You have successfully cleared the board!"                                                                                                                                                       | 51 times                                                                                                                                                                                   |
| A form filled in for every game | Each of 41 games gets Objective, Win Condition, Game Overview, Board Layout, Sequence Building Rules, Card Movement & Grabbing and Special Game Mechanics, whether it needs them or not. Objective and Win Condition say the same thing twice. Under "Sequence Building Rules" Nestor has: "Nothing is built: cards only leave the board, two at a time." | Every rules page                                                                                                                                                                           |

Two things in Solitaire look like marks and are not. The research in section 3
cleared both.

- **"Are you sure you want to restart this game? Your current progress will be
  lost."** Five of Solitaire's seven confirmations open this way. So are 9 of
  the 15 real games whose confirmations I could read. It is dated, and people
  wrote it for decades. The reason to change it is that the six newer games ask
  "Start a new game?" and Solitaire should match them.
- **Title Case.** "Report a Bug", "Card Back Design". About 35 labels and
  headings in Solitaire use it, and so do 17 of 26 real games. The newer games
  here use sentence case. Again the fault is the mix.

### Voice B: the house agent voice (October on, everything else)

This one is harder to name, because it avoids every mark in the table above. It
uses short common words. It never says "seamless" or "delve". By the usual
measures it is fine: the help text averages 15.5 words a sentence against 17.2
in the manuals, and reads at a lower school grade than they do. So the fix is
not "shorter sentences" or "simpler words".

What gives it away is a small set of constructions used over and over, and a
habit of writing the help as if it were a specification. I counted each with the
same pattern in our text and in nine manuals written by people for open-source
games (AisleRiot, four KDE games, Simon Tatham's puzzles; 26,000 words). Rates
are per thousand words in the three arcade games.

| Mark                                                                                                       | Examples from the games                                                                                                                                | Ours | Manuals |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---: | ------: |
| Three things in a row                                                                                      | "Eat, grow and keep clear of your own tail." "Fly, drift and blast every rock…" "by mouse, touch or keyboard" (in five of the seven meta descriptions) |  8.6 |     1.7 |
| Things given a person's verb, from a small set: holds, lets, waits, stands, wears, says, asks, keeps, pays | "Iron holds its hits, and volatile rocks blast." "A best made under earlier rules says so…" "bricks pay double"                                        |  5.3 |     0.5 |
| Semicolons and colons as joints                                                                            | "Point; the guide follows." "Let go; a click flies plain." "Never breaks: round, it kicks every fuzzball straight away from its middle…"               | 14.6 |     5.7 |
| "as" for when and for like                                                                                 | "As it breaks, zaps every brick in its row." "hits the ship as a rock does" "lands at once, as it would have flown"                                    |  6.2 |     2.2 |
| A thing's possessive                                                                                       | "the floor's row", "the level's boon", "static's multiplier", "the bar's Sound button", "a phone's one speaker"                                        |  5.1 |     0.3 |
| "go on" for resume                                                                                         | "Pause, or go on", "Press Enter to go on.", "goes on only when you say"                                                                                |  4.6 |       0 |
| "by itself", "alone", "of its own"                                                                         | "Fire by itself", "the deck has Dash alone"                                                                                                            |  1.7 |       0 |
| whichever, whatever, wherever                                                                              | "The keys aim and charge whichever way is chosen."                                                                                                     |  1.2 |     0.1 |

Each pattern is a rough net. It is run the same way over our text and over the
manuals, so the rates compare, but a count can hold a few lines a reader would
not call that construction.

The clearest sign is in what the newer games leave out. People who write rules
lean on a handful of small words: "if" and "when" for what can happen, "can" for
what you may do, "will" for what the game does back, and "you" all the way
through. The help, catalogs and setting hints of our six newer games come to
4,227 words. Counted per thousand words:

|                                             | Solitaire | The six newer games | Manuals |
| ------------------------------------------- | --------: | ------------------: | ------: |
| if                                          |       0.6 |                   0 |     8.1 |
| will                                        |       0.5 |                   0 |    11.0 |
| you can                                     |       0.3 |                 0.2 |     5.7 |
| can                                         |      12.9 |                 2.8 |    10.0 |
| you, your                                   |       1.8 |                10.4 |    25.6 |
| Brackets                                    |       3.6 |                   0 |    10.5 |
| Exclamation marks                           |         0 |                   0 |     0.3 |
| A count spelled out ("three", "thirty-six") |      27.5 |                11.1 |     6.8 |

Not one "if" and not one "will" in 4,227 words. "You can" appears once. The
newer games describe what things do ("A ball that falls past the paddle costs a
life"). People tell the player what happens to them ("If the ball gets past your
paddle, you lose a life"). Solitaire has the opposite habit: "can" everywhere,
in the passive ("Cards can be placed…"), and hardly any "you".

Other marks that a count does not catch:

- **The help is a specification.** Every edge case and exact number is in it. "A
  rock or a comet that touches the ship, unless it is dashing or shielded,
  knocks the last in tow loose, and nothing can touch it again for 1.5 seconds;
  fly into one knocked loose within 6 seconds to catch it again, or it floats
  home, and clearing the wave catches every one still loose." A player learns
  most of that by playing.
- **Clauses stacked with commas.** Asteroid Breaker's help has 1.5 commas a
  sentence, and the descriptions 1.4, against 0.7 in the manuals. "A stray
  caught scores 250, or 500 as it goes straight home, times static's
  multiplier."
- **It will not use the ordinary word.** Resume becomes "go on". Cancel becomes
  "call a charge off". Close becomes "put away". Automatic becomes "by itself".
  A key is named by the finger that rests on it twelve times, as in "the key
  above the right little finger's home key", where a person would write P.
- **Words left out to save space.** "every brick a level needs", "a digit the
  solution doesn't hold", "the squares it sees", "those still waiting over the
  ceiling among them". Each is correct. Three in one sentence make the reader
  stop and work it out.
- **It, one, those, the last.** Nouns are replaced with pointers so they are not
  repeated: "the level is lost once one it needs stands in the floor's row."
- **The three-beat formula.** Every arcade blurb is three commands in a row. Six
  of the seven meta descriptions open "Play X free in your browser" and end with
  three ways to play it. Good sites do keep one mould for all their one-liners,
  so the sameness is not the fault. The mould is. Theirs is one rule with its
  catch ("Find all the mines without treading on any of them."). Ours is three
  verbs chosen for their rhythm.
- **One tone for everything.** A rule, an error, a tooltip and a win screen are
  all written in the same level voice. Human-written games get louder at a win
  and quieter in the settings.
- **It explains the interface to the player.** "On a card's button, the keys are
  the button's: Space and Enter press it." "Off, it mutes the effects, the voice
  and the bed, as the bar's Sound button does."
- **Private vocabulary.** The bed (background music), the bench, the deck (touch
  buttons), in tow, earths, plain, the Ready card. Game words such as static and
  boon are fine. The trouble is words for interface parts that the player was
  never told.
- **Mixed spelling.** "colour" 32 times and "color" 17. "towards" and "toward".
  British idiom ("round the corner", "at once", "for good") beside American
  spelling.

The same voice runs through the READMEs, the code comments, the commit messages,
`AGENTS.md` and the skills. That is outside this plan, except that it explains
how the voice spread: an agent that reads its instructions in this voice writes
its labels in it.

### Where the voice lives, and where it does not

Set beside real games (section 3), the trouble is not spread evenly. It sits in
the long text:

- How to play, in every game, and Solitaire's rules pages;
- the catalog lines and Solitaire's variant write-ups;
- the line under a setting;
- descriptions: card blurbs for the arcade games, meta descriptions,
  `<noscript>` lines, README openings;
- the hidden paragraph that reads the keyboard controls to a screen reader.

That is about half the strings and four fifths of the words.

The short text is mostly in line with what real games do, and a rewrite should
touch it lightly:

- Labels in the newer games are short and in sentence case: "New game", "Next
  level", "Play sounds".
- Prompts are the right size: "Tap to launch." "Swipe to start."
- The newer games' confirmations follow the current guides: a question that
  names the action, one line on what is lost, a button named for the outcome.
- Results are plain: "Level 4 cleared", "New best", "Out of lives on level 7".
- What the announcer says in play is brief: "Ball lost. 2 lives left."
- Tooltips that repeat the button with its object ("Undo last move") are what
  real games do.
- The 404 pages say what happened and offer a way out.
- Nothing is oversold. No "addictive", no "ultimate".
- The catalog format works: a picture, a name, one line. The grammar of the line
  is the one most games use (the thing is the unspoken subject: "Breaks at a
  hit."). Only its length, its semicolons and its edge cases are off.
- Minesweeper's help is 97 words and says what a player needs.
- Solitaire's card blurbs on the site are close to the fact lines that solitaire
  sites write: "Klondike from two decks, on nine columns."
- fuzzley.info's project pages are the nearest to a person's writing. They need
  a light pass, not a rewrite.

## 3. What other games and sites do

The four notes in `research/` quote about 140 games, game sites and style
guides, and the published work on spotting and fixing machine writing. Each note
lists what it could not reach. This section is the short version.

### 3.1 How to play (31 sources)

| What they do                                          | Numbers and examples                                                                                                                                                                                                  |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Length follows the place                              | A help panel inside a game runs 24 to 195 words. A rules page on the web runs 500 to 800. A manual runs 700 to 2,200. Ours are all panels inside a game, and run from 97 words (Minesweeper) to 883 (Brick Fuzz Pop). |
| The goal comes first                                  | 23 of 31. The newest and shortest give it as an order: "Guess the Wordle in 6 tries." "Join the numbers and get to the 2048 tile!"                                                                                    |
| They talk to "you"                                    | 29 of 31.                                                                                                                                                                                                             |
| "can" is the working verb                             | 267 uses, against 48 of "must".                                                                                                                                                                                       |
| Present tense, and "will" for what the game does back | "The color of the tiles will change to show how close your guess was to the word."                                                                                                                                    |
| "If" in puzzles, "When" in arcade games               | "When two tiles with the same number touch, they merge into one!" "If the bricks come down to the bottom, it's GAME OVER."                                                                                            |
| A catch gets its own sentence                         | It opens with "However,", "Note:" or "only". It is not hung on the rule with a semicolon. Semicolons turn up in 7 of 31, mostly the older manuals.                                                                    |
| Numbers are digits                                    | In every modern source.                                                                                                                                                                                               |
| Words on the screen are quoted exactly                | The button says Hint, so the help says Hint.                                                                                                                                                                          |
| A worked example                                      | 16 of 31.                                                                                                                                                                                                             |
| Jokes stay out of the rules                           | They go in a tip or an aside: "Just like sharks, this Snake can only go forwards."                                                                                                                                    |

Shapes worth borrowing:

- BBTAN's four lines: what you do, what the ball does, the goal, how you lose.
  36 words.
- Coolmath's Snake in three sentences, for the goal, the controls and the
  danger: "Eat as many apples as you can to grow as long as possible. Use the
  arrow keys to control your Snake and the spacebar to pause. Be careful not to
  hit the wall or eat your tail!"
- PySolFC's fact line above each solitaire game's rules: "Klondike type. 1 deck.
  Unlimited redeals."
- One sentence where this version differs from the game people know: "Coolmath's
  Snake game is different from most."

### 3.2 Descriptions and site copy (about 50 sites, 39 store listings)

| What they do                        | Numbers and examples                                                                                                                                          |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Length follows the slot             | A tag is 1 to 3 words. A card label is 3 to 8. A one-sentence rule is 8 to 17. The opening of a game's page is 20 to 55.                                      |
| A curated site keeps one mould      | All 39 of Simon Tatham's puzzles get one order: "Find all the mines without treading on any of them." The New York Times: "Guess the hidden word in 6 tries." |
| The mould is one rule and its catch | The catch ("without treading on any of them") is what tells one game from the next.                                                                           |
| No sales words                      | No "addictive", no exclamation marks and no "free" in the newspapers' and the curated sites' copy. The big portals use all three, and read like portals.      |
| A long description has an order     | What the game is, or the goal as an order. Then one to three things you do. Then, for a classic, what is different here.                                      |
| Claims you can count                | "Every deal has a solution." "Guessing is not required."                                                                                                      |
| Controls are not in a blurb         | Six of our seven meta descriptions end with three ways to play. In five it is "by mouse, touch or keyboard", in some order.                                   |
| A test for boilerplate              | Put another game's name in the sentence. If it is still true, it says nothing.                                                                                |
| A solo developer's site             | "I" and "made". Frank about old work ("A bit bad, a bit unfinished."). The tech in one line.                                                                  |
| A missing page                      | A plain statement and a way out. Ours already do this.                                                                                                        |

### 3.3 In-game text (45 games, 13 guides)

| Kind                                | What real games do                                                                                                                                                                                                                                                                                |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Buttons                             | One or two words in 82% of 235 labels. A verb first in about 7 of 10. Never a full stop. Title Case in 17 of 26 games, sentence case in the ones born on the web.                                                                                                                                 |
| Setting names                       | 1 to 3 words. A switch is a verb and a thing, phrased as the positive.                                                                                                                                                                                                                            |
| The line under a setting            | One sentence, 12 to 14 words at the middle: "When enabled, the game will pause when it is not in focus." A second sentence only for a side effect. No line at all when the name says it.                                                                                                          |
| Tooltips                            | The button again, with its object: "Undo the last move".                                                                                                                                                                                                                                          |
| Things in a game (items, power-ups) | A name and one line of 6 to 12 words. One grammar per game, most often a verb with the thing as its unspoken subject: "Fires at the nearest enemy." "Enlarges the bar." Always digits. Edge cases are left out. No semicolon in about 1,000 lines read. The joke is in the name, not in the line. |
| Notices                             | 2 to 5 words, a flat fact: "Not in word list". "Draw offer sent".                                                                                                                                                                                                                                 |
| Pause                               | "Paused" and a Resume button. No sentence.                                                                                                                                                                                                                                                        |
| A win                               | "You win!" or "You won!" in 10 of 18. One exclamation mark. Sometimes one more sentence with the measure: "You found N mines in N seconds."                                                                                                                                                       |
| A loss                              | "Game over" in 12 of 19. The cause in plain words. It never blames the player.                                                                                                                                                                                                                    |
| A level cleared                     | "Level N Completed!" "Stage N cleared!"                                                                                                                                                                                                                                                           |
| A record                            | "New high score!"                                                                                                                                                                                                                                                                                 |
| Confirmations                       | "Are you sure you want to…?" in 9 of 15, with what will be lost in 10. The KDE and Material guides say to drop "Are you sure" and name the buttons for what they do.                                                                                                                              |
| Errors                              | The rule that was broken, or what happened and what to do next.                                                                                                                                                                                                                                   |
| Nothing to show                     | "No" and a noun, then a way out.                                                                                                                                                                                                                                                                  |
| Prompts                             | 5 to 9 words, an order that names the key or the touch: "Press [key] to fire the ball".                                                                                                                                                                                                           |
| Keys                                | Named, capitalised and set apart. "Press" for a key, "Tap" for a touch.                                                                                                                                                                                                                           |
| Screen reader text                  | The words on the screen, or fewer. Position, then content, then state.                                                                                                                                                                                                                            |
| Tone by kind of game                | Puzzles and cards are calm. Arcade games use states in place of sentences ("Ball lost") and more exclamation marks.                                                                                                                                                                               |

### 3.4 What works against a machine voice, and what does not

From `research/machine-writing-tells.md`.

**What does not work.** Lists of banned words go stale within a year, and a ban
on one mark moves the habit to another. The em dash is the known case. Current
models now use it far less than people do, and Wikipedia's guide notes that
prose with nothing but commas and full stops "has become its own sign of AI
writing". Our Voice B is the same thing happening here. It avoids every mark on
the usual lists, and it grew semicolons, possessives and squeezed-out words in
their place. Detectors, "write simply" and patching a draft one phrase at a time
do not work either.

**Marks of the over-corrected voice that others have recorded:** words squeezed
out, labels coined and never explained, nouns stacked up, wording that is clever
where plain would do, punctuation narrowed to two or three marks, and sentences
all of one length. Nobody has written up the old-fashioned wording and odd word
order that ours has. Those are this project's own.

**What works:**

- good examples to copy, more than rules to obey;
- each thing to avoid given with its reason and a rewrite;
- rules a script can check, such as a word limit;
- leaving things out;
- one name for each thing;
- reading the line aloud;
- a sample of the voice written by a person;
- a second pass, apart from the writing, that rewrites the whole sentence;
- judging by several marks together, since any one of them turns up in people's
  writing too.

Two lines from that research belong in the skill. GOV.UK: "If you find yourself
having to explain how the user interface works, that's a sign something has gone
wrong." Shreya Shankar: "The goal isn't to avoid sounding like a model; it's to
write with clarity, intention, and control."

GOV.UK splits any sentence over 25 words. Nielsen Norman Group aims for 15
to 20. About one sentence in eight of our help runs to 25 words or more.

## 4. The target

### 4.1 The voice

One person made these games. The text should sound like that person telling a
friend how to play.

1. **Talk to the player.** "You", and plain orders: "Tap a square to open it."
2. **Say what the player does, then what the game does back.** This is where
   "if", "when", "can" and "will" come from, the words our help lacks. "If you
   open a mine, you lose a life."
3. **Use the word on the button, and the ordinary word.** Resume, Cancel, Close,
   P. One name for each thing, everywhere.
4. **One idea in a sentence.** A catch gets a sentence of its own.
5. **Digits for numbers.** "3 lives", "20 seconds".
6. **Leave things out.** Help is for getting started. What a player will see in
   the first minute does not need saying. Exact timings and edge cases go in the
   detail layer, or nowhere.
7. **Quiet in the settings, louder at a win.** One exclamation mark at a win, a
   record or a level cleared. Nowhere else.
8. **Jokes go in names and asides.** A brick can be called a Bumper. Its line
   still says plainly what it does.

Solitaire, Sudoku and Minesweeper stay calm, in full sentences. Snake and the
three breakers are shorter and a little louder: "Level 3 cleared!", "Ball lost".
The fuzzball games keep their own words (fuzzball, static, boon).

### 4.2 A shape and a budget for each kind of text

The budgets come from the ranges in section 3. They are limits to write under,
and the check in 5.5 can count them.

| Kind                            | Shape                                                                                          | Budget                         |
| ------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------ |
| How to play, the top            | The goal. What you do. What the game does back. How it ends. Then the controls table.          | 100 words before the table     |
| How to play, a detail section   | A heading, then two to four sentences. Scoring as a small table.                               | 50 words a section             |
| Solitaire rules page            | A fact line (decks, draw, redeals). Goal. Layout. Moves. What is different in this game.       | 150 words, down from about 310 |
| A thing in a catalog            | A verb with the thing as its subject. A second sentence only for a number or a catch.          | 12 words, never over 20        |
| Variant or option write-up      | What changes, compared with the game the player knows.                                         | 20 words                       |
| Card blurb                      | One rule and its catch, as an order.                                                           | 8 to 14 words                  |
| Meta description                | What it is. The goal. What is different here. No list of controls.                             | 155 characters                 |
| Project write-up (fuzzley.info) | What it is. What is different about it. When and how it was made.                              | 60 words                       |
| Button, menu item               | A verb first. Sentence case. No full stop.                                                     | 2 words, 3 at most             |
| Setting name                    | A thing, or a verb and a thing.                                                                | 3 words                        |
| Line under a setting            | What it does when on. Leave it out when the name says it.                                      | 1 sentence, 14 words           |
| Tooltip                         | The button, with its object.                                                                   | 3 to 7 words                   |
| Prompt                          | An order that names the key or the touch.                                                      | 9 words                        |
| Notice                          | A flat fact.                                                                                   | 5 words                        |
| Confirmation                    | A question that names the action. One sentence on what is lost. Buttons named for the outcome. | 6 words, then 12               |
| Win, loss, level cleared        | A headline. One line with the measure. A next step.                                            | 5 words, then 12               |
| Error                           | What happened. What to do.                                                                     | 2 sentences                    |
| Nothing to show                 | "No" and a noun. A way out.                                                                    | 5 words                        |
| Spoken: an event                | The words on the screen, or fewer.                                                             | 12 words                       |
| Spoken: the keys                | A list, one key and its action to a line. Keys by name.                                        |                                |

### 4.3 The sample sheet

These are real lines from the games, each with a rewrite in the voice above.
They are here for you to mark up. Change a word, cross one out, or write "too
flat" or "too cute" beside it. Your marked-up copy becomes the set of examples
the skill teaches from (5.1).

One caution. I wrote the new lines, and I am the same kind of writer that wrote
the old ones. Where a new line sounds off to you, trust that.

**How to play**

1. Snake, the top.
   - Now: "Steer the snake to the apple. Each apple it eats scores a point and
     makes it a square longer and a little faster. The run ends when the snake
     runs into a wall or into itself; fill the whole board and you win."
   - New: "Eat apples to grow. Each apple is 1 point, and the snake gets a
     little faster every time. If you hit a wall or your own tail, the game is
     over. Fill the whole board to win."
2. Snake, pausing.
   - Now: "The game pauses itself when you switch away, or open a menu or a
     dialog, and goes on only when you say: with a direction, Space or P, or
     Resume."
   - New: "The game pauses when you switch tabs or open a menu. Press Space or P
     to resume."
3. Minesweeper, lives. The number is filled in from the setting.
   - Now: "A mine you step on costs a life, not the game, and stays open. You
     start with 3 lives, and the game ends when you lose the last."
   - New: "You start with 3 lives. If you open a mine, you lose one and keep
     playing. When you have none left, the game is over."
4. Brick Breaker, the top.
   - Now: "Keep the ball in play with the paddle, and break every brick a level
     needs to clear it. A ball that falls past the paddle costs a life; the run
     ends when the last is lost, or when the last level is cleared."
   - New: "Bounce the ball off your paddle to break the bricks. Break every
     brick that can be broken to clear the level. If the ball gets past your
     paddle, you lose a life. The game ends when you run out of lives or clear
     all 50 levels."
5. Brick Fuzz Pop, the top (93 words now, 53 new).
   - Now: "Aim the fuzzball, charge it and let it fly. It turns off the sides,
     the ceiling and every brick it doesn't punch through, until it touches the
     floor, where it waits for the next shot. One that flies a long while
     without touching a brick it could break gets bored, yawns and drops to the
     floor. Then the wall comes down a row. Break every brick a level needs to
     clear it, those still waiting over the ceiling among them; the level is
     lost once one it needs stands in the floor's row."
   - New: "Aim the fuzzball and charge it up. Let go to shoot. It bounces around
     breaking bricks until it lands on the floor. After each shot, the wall
     moves down 1 row. Break every brick that can be broken to clear the level.
     If one of them reaches the floor, you lose the level."
   - And, under a heading further down: "A fuzzball that goes too long without
     hitting a brick gets bored and drops."
6. Sudoku, hints.
   - Now: "A hint points out a digit that doesn't belong, or notes that leave
     out the digit their square needs, or shows the next square logic can fill
     and why; press Hint again to fix or fill it in. A puzzle solved with a hint
     sets no best time."
   - New: "If there is a mistake on the board, Hint shows it. If not, it shows
     the next square you can solve and explains why. Press Hint again to fix it
     or fill it in. A puzzle solved with a hint doesn't count for a best time."

**Things in a catalog**

7. Steel brick (Brick Breaker). Now: "Never breaks: it turns every ball and
   stops every bolt." New: "Can't be broken. Balls bounce off it, and it blocks
   laser bolts."
8. Tough brick (Brick Breaker). Now: "Takes two to four hits, a pip for each one
   left." New: "Takes 2 to 4 hits. The pips show how many are left."
9. Regrowing brick (Brick Breaker). Now: "Grows back 10 seconds after it breaks;
   a level doesn't need it." New: "Grows back after 10 seconds. You don't need
   to clear it."
10. Wide paddle (Brick Breaker). Now: "The paddle grows half as wide again for
    20 seconds." New: "Makes the paddle 50% wider for 20 seconds."
11. Catch (Brick Breaker). Now: "For 20 seconds, a ball that lands on the paddle
    waits there, for 3 seconds at most, until launched." New: "Balls stick to
    the paddle for up to 3 seconds, or until you launch them. Lasts 20 seconds."
12. Bumper (Brick Fuzz Pop). Now: "Never breaks: round, it kicks every fuzzball
    straight away from its middle and earths its charge, lets zaps through, and
    sinks into the floor." New: "Can't be broken. Knocks the fuzzball away and
    drains its charge."
13. Prism (Brick Fuzz Pop). Now: "Breaks at a hit, and two more fuzzballs leave
    from it, 30° either side of the one that broke it; a zap or a blast only
    breaks it." New: "Splits the fuzzball into 3."
14. Spread (Asteroid Breaker). Now: "Three shots at each pull, 12° apart, for 12
    seconds." New: "Fires 3 shots at once for 12 seconds."
15. Burr (Asteroid Breaker, 55 words now). New: "Homes in on your ship and
    sticks to it, slowing you down. Shoot it first, or dash to shake it off."

**Settings**

16. Asteroid Breaker. Now: "Fire by itself" with "The ship fires all the time,
    and the deck has Dash alone." New: "Auto-fire" with "The ship fires on its
    own. On a touch screen, only the Dash button shows."
17. Asteroid Breaker, "Play sounds". Now: "Off, it mutes the effects, the voice
    and the bed, as the bar's Sound button does." New: "Turns all sound on or
    off. Same as the Sound button."
18. Snake, "Play sounds". Now: "A bite for an apple, a bump for a crash, and a
    chime for a new best." New: no line. The name says it.
19. Brick Fuzz Pop. Now: "The flight's speed" with "Fast-forward, in the bar,
    once switched on, stays on from flight to flight until you switch it off.
    Drop, there from the start of every flight, brings it down where it is,
    keeping only what it had done by then." New: "Shot speed" with "Fast-forward
    stays on until you turn it off. Drop ends a shot early and keeps what it has
    broken."
20. Brick Breaker, stars (53 words now). New: "Each level has 3 stars: 1 for
    clearing it, 1 for not losing a life, and 1 for reaching the streak shown
    before the level starts. Stars don't unlock anything. You have 12."

**Messages and results**

21. Solitaire. Now: "Are you sure you want to restart this game? Your current
    progress will be lost." New: "Restart this game?" then "You'll lose your
    progress." Buttons: Restart, Cancel.
22. Minesweeper. Now: "Every square is covered again, the mines where they were,
    and the clock and your lives start over." New: "The mines stay where they
    are. The clock and your lives reset."
23. Brick Fuzz Pop. Now: "The game is larger upright." New: "Turn your phone
    upright for a bigger board."
24. Brick Fuzz Pop. Now: "The board stopped drawing and is being restored. The
    game waits until it is back." New: "The graphics stopped. The game is paused
    until they come back."
25. Solitaire, a win. Now: "Congratulations! You have successfully cleared the
    board!" New: "You won!"
26. Asteroid Breaker. Now: "Cleared all thirty". New: "All 30 waves cleared!"
27. Asteroid Breaker. Now: "Best, earlier rules". New: "Best (old rules)".
28. Keep the words of these: "Level 4 cleared", "New best", "You filled the
    board!", "Out of lives on level 7, at Normal speed", "No games match."
    Whether the first two gain an exclamation mark is your answer to "How loud?"
    below.

**Spoken to a screen reader**

29. A paused run. Now: "Your last run is paused on level 7, Arch, with a score
    of 1,200 and 2 lives. Press Enter to go on." New: "Paused on level 7, Arch.
    Score 1,200. 2 lives. Press Enter to resume."
30. The keys in Brick Breaker (85 words in one paragraph now). New, as a list:
    "Left and Right, or A and D: move the paddle. Space: launch the ball, or
    fire. P: pause and resume. Esc: pause. Enter: resume, or go to the next
    level."
31. Brick Fuzz Pop. Now: "the key above the right little finger's home key
    pauses and goes on". New: "P: pause and resume."

**Descriptions**

32. Snake, the card. Now: "Eat, grow and keep clear of your own tail." New: "Eat
    the apples. Don't hit the walls or your own tail."
33. Brick Breaker, the card. Now: "Bounce the ball, break every brick and keep
    it off the floor." New: "Break every brick. Don't let the ball get past your
    paddle."
34. Asteroid Breaker, the card. Now: "Fly, drift and blast every rock to rubble
    before one finds you." New: "Shoot every rock before one hits your ship."
35. Brick Fuzz Pop, the card. Now: "Charge the fuzzball, let it fly and keep the
    bricks off the floor." New: "Fire the fuzzball to break the bricks before
    they reach the floor."
36. Keep as they are: "Clear the field using the numbers. Don't hit a mine."
    "Fill the grid so every row, column and box has 1 to 9."
37. Minesweeper, the meta description. Now: "Play Minesweeper free in your
    browser, with lives: a mine costs one instead of the game. Easy, Medium,
    Hard or a field of your own, by mouse, touch or keyboard." New: "Minesweeper
    with lives, free in your browser. Hitting a mine costs a life instead of
    ending the game. Easy, Medium, Hard or a board of your own."

**Solitaire's rules**

38. Now: "Foundations: Built UP in the SAME SUIT from Ace (1) to King (13)."
    New: "Foundations: build up by suit, from Ace to King."
39. Now: "Tableau: Built DOWN in ALTERNATING COLORS (e.g., Red 9 on Black 10)."
    New: "Tableau: build down in alternating colors. A red 9 goes on a black
    10."
40. Now: "Supermove Capacity Formula: Maximum cards moved at once is (Free
    Cells + 1) \* 2^(Empty Tableaus)." New: "You can move several cards at once
    if there are enough free cells and empty columns to move them one at a time.
    With 2 free cells and no empty column, that is 3 cards."
41. Klondike. Now: an Objective, a Win Condition that repeats it, and a Game
    Overview of 37 words. New: a fact line, "1 deck. Draw 1 or Draw 3.", and one
    goal: "Move all 52 cards to the 4 foundations, building each suit up from
    Ace to King."

**fuzzley.info**

42. Minesweeper's page. Now: "Minesweeper with a twist: you start with lives, so
    stepping on a mine costs one instead of ending the game. It plays by mouse,
    touch or keyboard, takes on the palette chosen on fuzzley.games, and keeps a
    game in progress across a reload." New: "Minesweeper, but you get lives.
    Hitting a mine costs one instead of ending the game. I first wrote it in
    2016 with jQuery and Knockout, and later rebuilt it in Angular."

**How loud?** The same three moments at three settings. Tell me which column is
yours, per kind of game if they differ.

|                             | Plain                 | Middle (what I used above)                  | Lively                                         |
| --------------------------- | --------------------- | ------------------------------------------- | ---------------------------------------------- |
| Minesweeper, a mine opened  | "Mine. 2 lives left." | "Boom. 2 lives left."                       | "Boom! That was a mine. 2 lives left."         |
| Brick Breaker, the run ends | "Game over"           | "Game over" then "Out of lives on level 7." | "Out of lives!" then "You made it to level 7." |
| Sudoku, solved              | "Solved in 4:12"      | "Solved in 4:12!"                           | "Nice! Solved in 4:12."                        |

## 5. What to set up

Six things, then a note on fuzzley.info and one on changes to the games
themselves. Together they are the "skill and guidelines". The first is the one
only you can do.

### 5.1 A voice, chosen by you

A skill can carry a voice, but someone has to pick it. The current text shows
what happens when that is left to the agent: it makes one up. So the first step
is the sample sheet in section 4.3. You edit those lines by hand until they
sound right to you, and the edited lines become the examples the skill teaches
from. An hour of your time here is worth more than any rule I can write.

### 5.2 A short section in `.agents/AGENTS.md`

"Writing for players", next to "Writing Documentation". About ten lines.

Most player text is written in passing. An agent adds a power-up and types its
name, its tooltip and its announcement along the way, and never thinks "I am
writing copy now", so a skill may not load. `AGENTS.md` is always loaded. The
section holds the few rules that matter most, and tells the agent to load the
skill before it adds or changes any words a player reads.

A draft, to be finished once the voice is set:

```markdown
## Writing for players

These rules cover every word a player or visitor reads or hears: labels, help,
messages, announcements, blurbs and page descriptions.

- **Load the `player-text` skill first**, even for one label inside a larger
  change.
- **Talk to the player.** Write "If the ball gets past your paddle, you lose a
  life", not "A ball that falls past the paddle costs a life".
- **Use the word on the button, and the ordinary word.** Resume, Cancel, Close,
  Settings. Name the keys: P, Space, Esc.
- **One idea in a sentence.** Digits for numbers.
- **Keep to the budget.** A button is 1 or 2 words. The line under a setting is
  one sentence. A catalog line is 12 words.
- **Say less.** Leave out what the player will see for themselves.
```

### 5.3 The skill: `player-text`

It lives in `.agents/skills/player-text/`, as every shared skill here does.

```text
player-text/
  SKILL.md            who we are talking to, the eight habits (4.1), the
                      method, the table of kinds and budgets (4.2), the
                      read-back pass
  references/
    how-to-play.md    shape, budget, worked examples
    catalogs.md       things in a game, options and variants
    descriptions.md   blurbs, meta descriptions, write-ups
    labels.md         buttons, menus, headings, settings and their hints
    messages.md       confirmations, notices, errors, results
    spoken.md         labels and announcements for screen readers
    read-back.md      the marks of both machine voices, each with a rewrite
    words.md          the word list
    swipe.md          real lines from real games, by kind of text
  evals/              the test tasks from section 6
```

`SKILL.md` stays short. An agent writing a tooltip reads `SKILL.md` and
`labels.md`, not the lot. The skill is the only style guide. A second copy in
`docs/` would drift from it.

How the skill teaches matters more than what it lists:

- **Examples before rules.** Each kind of text has three or four lines from
  shipped games (`swipe.md`) and three or four of ours that you approved. Models
  copy an example far better than they obey "do not".
- **A method, not a style sheet.** Who is reading this, and what are they doing
  right now? What do they need to do next? Say it out loud, the way you would to
  someone playing next to you, and write that down. Then fit it to the shape and
  the budget for its kind.
- **Budgets.** A word limit for each kind of text. A limit forces the writer to
  choose what the player needs, and that choice is what turns a specification
  back into help.
- **Reasons.** Each pattern says why it exists, so the agent can handle a case
  the skill did not foresee.
- **Bans come last.** The list of machine-voice marks is a pass over a finished
  draft. When a line trips one, the fix is to write the sentence again from the
  start. Patching the mark out is how Voice B was born: it avoids every mark of
  Voice A and grew its own.

The skill has to be written in the voice it teaches. A skill in the current
house voice would teach the house voice.

### 5.4 A word list

One name for each thing, used everywhere: Pause and Resume, New game, Restart,
How to play, Settings, Level, Score, Best, Lives. Each game's own words
(fuzzball, static, boon, capsule). And the words to use in place of the house
voice's substitutes: Resume for "go on", Cancel for "call off", Close for "put
away", "automatically" or "auto" for "by itself".

It is a data file, so a script can check it.

### 5.5 A check in `yarn lint`

The repository already holds its skills to the code with a script. Text needs
the same, or it drifts back. The check grows out of `inventory/extract.mjs` and
flags only what a script can judge:

- a label over its word limit, or ending in a full stop;
- a line over the budget for its kind (section 4.2);
- a word the word list replaces;
- a count spelled out where a digit belongs;
- a label in the wrong case, or capitals used for stress;
- British spelling, if you choose American;
- a sentence of six words or more typed out in two places.

It does not ban punctuation. The research is clear that a blanket ban on dashes
or semicolons only moves the habit somewhere else (section 3.4).

It also prints the rates from section 2 for each game, per thousand words: lists
of three, semicolons, "if", "you" and the rest. Those are for watching, and do
not fail the build. If "if" is still at zero after a rewrite, the rewrite did
not take.

It starts with a baseline file that lists today's failures, so only new ones
fail the build. Each game's rewrite removes its lines from the baseline. When
the baseline is empty the check is simply on.

A script cannot hear a voice. That is what the next step is for.

### 5.6 A reader in the review

`commit-review-process` gains one clause: when a change adds or edits text a
player reads, the reviewer loads `player-text` and reads those strings against
it. For the big rewrites, a separate fresh agent gets only the new strings and
the swipe file, and marks every line it thinks a machine wrote.

### 5.7 fuzzley.info

The fuzzley repository has no agent setup today. It gets an `AGENTS.md` with the
same short section, and a copy of the skill. The copy is kept in step by a small
script and a hash, the way `skills-lock.json` already pins the Angular skills
here. It adds one reference file of its own, for project write-ups and the
profile.

### 5.8 Changes to the product that the text needs

Words alone cannot fix these. Each is a decision for you (section 8).

1. **Help in two layers.** The basics on top: the goal, the controls, three or
   four things to know. The detail (scoring tables, exact timings, edge cases)
   under headings that start closed. The first read drops to about a hundred
   words and nothing is thrown away.
2. **Keys called by their names.** Show "P", not "the key above the right little
   finger's home key". Where the browser can report the keyboard layout, show
   that layout's letter.
3. **One source for each game's description.** Today it is typed out in up to
   seven places. Write a short one (the card blurb) and a long one (the search
   result) once per game, and build the rest from them.
4. **A new shape for Solitaire's rules page.** One "Goal" in place of Objective
   and Win Condition. Sections only where a game has something to say.
5. **One spelling.** American, since the site's own blurbs already use it.
6. **One case for labels.** Sentence case. Six of the seven games already use
   it, and Solitaire changes to match.
7. **"I" on fuzzley.info.** Its project pages are written with no person in them
   ("It was first written in 2016"). Developers' own sites say "I made this".
   Yours to choose, since it is your name on the page.

## 6. How to build the skill so that it works

The writer will be the same kind of model whose habits caused this, and so am I.
That is the main risk, and the build is arranged around it.

1. **You set the voice** (5.1). I draft, you edit, your edits win.
2. **I collect the swipe file** from the research in `research/`: short quoted
   lines, each with its source.
3. **I draft the skill**, then run `inventory/measure.mjs` over the skill's own
   text. If the skill shows the marks it warns about, it gets rewritten before
   anyone uses it.
4. **We test it the way `skill-creator` does.** Ten tasks, each given to a fresh
   agent twice, once with the skill and once without:
   - a new capsule for Brick Breaker: its name, its catalog line, what the
     announcer says when it is caught;
   - How to play for Snake, written from the rules code with the current help
     hidden;
   - a new setting and its hint (auto-fire);
   - a confirmation for leaving a game in progress;
   - the win and lose cards for Minesweeper;
   - the card blurb and meta description for Reversi;
   - Solitaire's rules page for Golf, from the engine's rules;
   - the fuzzley.info write-up for Pong;
   - what the announcer says for a Sudoku move;
   - a feature task where the text is a side effect ("add a Restart level button
     to Brick Fuzz Pop"), to see that the skill loads at all.
5. **You read the results.** The viewer shows each pair side by side. This is a
   judgement of voice, so your reading is the test. A pass rate would only
   measure what a script can see.
6. **A blind line-up.** Mix the with-skill lines with real lines from the swipe
   file and with today's text. A fresh agent, and you, mark the ones that look
   machine-written. The skill is ready when its lines are picked out about as
   rarely as the real ones.
7. **Fix and repeat**, two or three rounds. Then tune the skill's description so
   it loads on feature work, with `skill-creator`'s trigger test.
8. **Keep it honest afterwards.** Every correction you make to a line goes into
   the examples. After each game's rewrite, `measure.mjs` runs again. If a new
   pet construction shows up in the numbers, it joins the read-back list.

One more guard: **rewrites must stay true.** A friendlier rule that is wrong is
worse than a stiff one that is right. Every rewritten rule is checked against
the code by a second agent: Solitaire's pages against each game's rules, the
catalogs against their constants. The numbers that help text already takes from
constants stay that way.

## 7. How the rewrite would run, later

Smallest first, so the skill is tuned on cheap text before it meets Solitaire.

| Step | What                                                                           | Size                        |
| ---- | ------------------------------------------------------------------------------ | --------------------------- |
| 0    | Your decisions (section 8)                                                     |                             |
| 1    | Build and test the skill, the `AGENTS.md` section, the word list and the check |                             |
| 2    | Pilot: the shared libraries and Snake. You play it and read it.                | 150 strings, 770 words      |
| 3    | Minesweeper and Sudoku                                                         | 250 strings, 1,380 words    |
| 4    | Brick Breaker, Asteroid Breaker, Brick Fuzz Pop, with help in two layers       | 820 strings, 6,200 words    |
| 5    | Solitaire's interface, then its rules pages in batches by family               | 1,300 strings, 16,600 words |
| 6    | The site: blurbs, categories, 404, metadata. The READMEs' openings.            | 190 strings, 850 words      |
| 7    | fuzzley.info: project pages and profile                                        | 140 strings, 920 words      |

Each step is one branch. It changes the words, the specs that match on them, and
any screenshot that shows them, and it runs the layout checks, since a shorter
label can move a bar. The shared libraries come first because every game's specs
lean on their labels.

The work history on fuzzley.info is your résumé. I would leave it alone unless
you ask.

## 8. Decisions for you

| #   | Decision                            | My recommendation                                                                                                                                                                                                                 |
| --- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | The voice                           | Mark up the sample sheet in 4.3 and pick a column in its "How loud?" table. I would take the middle one: plain and brief for rules, labels and settings, with a little life at wins, losses and in the fuzzball games' own words. |
| 2   | Spelling                            | American.                                                                                                                                                                                                                         |
| 3   | Long help                           | Two layers. Do not delete the detail, fold it away.                                                                                                                                                                               |
| 4   | Keys                                | Name them. Use the browser's keyboard layout where it is offered.                                                                                                                                                                 |
| 5   | Game words                          | Keep the ones the player can see on screen (fuzzball, static, boon, capsule, crew). Drop the nicknames for interface parts (bed, bench, deck, Ready card).                                                                        |
| 6   | The lint check                      | Yes, with a baseline.                                                                                                                                                                                                             |
| 7   | One source per description          | Yes.                                                                                                                                                                                                                              |
| 8   | fuzzley.info's copy of the skill    | A pinned copy in that repository.                                                                                                                                                                                                 |
| 9   | Scope                               | Player and visitor text, and the READMEs' opening lines. Not `AGENTS.md`, the skills, comments or commit messages, though they share the voice.                                                                                   |
| 10  | Label case                          | Sentence case everywhere.                                                                                                                                                                                                         |
| 11  | "I" on fuzzley.info's project pages | Yes, for how a thing was made. Keep "you" for how it plays.                                                                                                                                                                       |
| 12  | Solitaire's rules page              | One Goal, a fact line, and sections only where a game has something to say. About 150 words a game.                                                                                                                               |

## 9. What is in this folder

- `plan.md`: this file.
- `inventory/extract.mjs` and `categorize.mjs`: list and sort the text. Run
  `node docs/text-style/inventory/extract.mjs`.
- `inventory/by-area/`: the listings, one per game or site. The profile and work
  history on fuzzley.info are counted but not listed.
- `inventory/counts.md`: strings and words by place and category.
- `inventory/measure.mjs` and `measures.md`: sentence length, punctuation and
  the constructions in section 2, for our text and for nine manuals written by
  people. The manuals are fetched when it runs, each at a fixed commit, and only
  their numbers are kept.
- `research/`: notes on how other games and sites write each kind of text, with
  quotations and sources.
