# In-game text: how real games write it

Research notes for a writing style guide. The subject is the words themselves — length, case, grammar, tone, formulas — not visual design.

Collected 2026-11-16. 58 sources read: 45 game sources (a few cover two or three related games) and 13 pieces of published guidance.

## How to read this file

- Every string in a code span was fetched in this session and is copied exactly, unless it is marked otherwise.
- `%d`, `%s`, `%1`, `{0}`, `~a`, `$1` are the source's own placeholders. `_` or `&` before a letter in desktop strings marks a keyboard mnemonic and is not shown to the player; it is removed here unless noted.
- Evidence levels used in the source index:
  - **raw** — the game's own source or string file (raw GitHub/GitLab, or the shipped JavaScript bundle). Most reliable.
  - **wiki** — a community wiki's transcription of in-game text, fetched through the wiki's API and stripped of markup. Good for wording, weaker for exact punctuation and line breaks. A `/` inside a wiki string marks a line break on the wiki.
  - **page** — the publisher's own web page or documentation, fetched as HTML.
  - **wf** — read through WebFetch, whose small model may tidy text. Used for one table only.
  - **memory** — not fetched. Only three items, each labelled "(from memory, unverified)".
- Counts are over the strings fetched here, not over the whole game, unless a whole table was parsed (then the count says so).

## Source index

### Group 1 — casual and puzzle games

| #   | Source                                                       | Evidence | URL                                                                                                                                                                       | Fetched |
| --- | ------------------------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| 1   | Wordle, original (Jan 2022 build)                            | raw      | `https://web.archive.org/web/20220110id_/https://www.powerlanguage.co.uk/wordle/main.c1506a22.js`                                                                         | yes     |
| 2   | Wordle, NYT (current build)                                  | raw      | `https://www.nytimes.com/games/wordle/index.html` and its `games-assets/v2/*.js` chunks                                                                                   | yes     |
| 3   | NYT Connections                                              | raw      | `https://www.nytimes.com/games/connections` and its chunks                                                                                                                | yes     |
| 4   | NYT Spelling Bee                                             | raw      | `https://www.nytimes.com/puzzles/spelling-bee` and its chunks                                                                                                             | yes     |
| 5   | 2048                                                         | raw      | `https://raw.githubusercontent.com/gabrielecirulli/2048/master/index.html`, `js/html_actuator.js`, `style/main.css`                                                       | yes     |
| 6   | Sudoku.com (Easybrain)                                       | page     | `https://sudoku.com/`                                                                                                                                                     | yes     |
| 7   | Open Sudoku (Android)                                        | raw      | `https://raw.githubusercontent.com/ogarcia/opensudoku/develop/app/src/main/res/values/strings.xml`                                                                        | yes     |
| 8   | Antimine (Android Minesweeper)                               | raw      | `https://raw.githubusercontent.com/lucasnlm/antimine-android/main/i18n/src/main/res/values/strings.xml`                                                                   | yes     |
| 9   | PROXX (Google Chrome Labs Minesweeper)                       | raw      | `https://raw.githubusercontent.com/GoogleChromeLabs/proxx/master/src/main/services/preact-canvas/components/{board,win,game,intro,bottom-bar,top-bar,settings}/index.tsx` | yes     |
| 10  | hello wordl (open-source Wordle)                             | raw      | `https://raw.githubusercontent.com/lynn/hello-wordl/main/src/{Game,Row,App}.tsx`, `clue.ts`                                                                               | yes     |
| 11  | Grid Games (accessible Sudoku, Pairs, Leaf Sweeper)          | raw      | `https://raw.githubusercontent.com/gbarkerz/GridGames/master/GridGames/ResX/AppResources.resx`                                                                            | yes     |
| 12  | Candy Crush Saga call-outs                                   | wiki     | `https://candycrush.fandom.com/api.php?action=parse&page=Voice`                                                                                                           | yes     |
| 13  | Monument Valley chapter titles                               | wiki     | `https://monumentvalley.fandom.com/api.php?action=parse&page=Monument_Valley`                                                                                             | yes     |
| —   | Microsoft Solitaire Collection, modern Microsoft Minesweeper | —        | no page with transcribed strings found                                                                                                                                    | no      |
| —   | Google Solitaire / Minesweeper / Snake                       | —        | rendered inside search results; not fetchable                                                                                                                             | no      |
| —   | Threes, Mini Metro, Bejeweled                                | —        | wiki pages fetched held prose only, no in-game strings                                                                                                                    | no      |

### Group 2 — arcade and action

| #   | Source                                | Evidence | URL                                                                                                              | Fetched |
| --- | ------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------- | ------- |
| 14  | Pac-Man / Ms. Pac-Man text table      | raw      | `https://raw.githubusercontent.com/BleuLlama/GameDocs/master/disassemble/mspac.asm`                              | yes     |
| 15  | Galaga text table                     | raw      | `https://raw.githubusercontent.com/hackbar/galaga/master/rom0/*.s`                                               | yes     |
| 16  | Asteroids message table               | raw      | `https://computerarcheology.com/Arcade/Asteroids/Code.html`                                                      | yes     |
| 17  | Tetris Guideline action names         | wiki, wf | `https://tetris.fandom.com/api.php?action=parse&page=Tetris_Guideline`; `https://tetris.wiki/Scoring` (WebFetch) | yes     |
| 18  | Techmino (open-source stacker)        | raw      | `https://raw.githubusercontent.com/26F-Studio/Techmino/main/parts/language/lang_en.lua`                          | yes     |
| 19  | Hextris                               | raw      | `https://raw.githubusercontent.com/Hextris/hextris/gh-pages/index.html`                                          | yes     |
| 20  | Peggle style shots                    | wiki     | `https://peggle.fandom.com/api.php?action=parse&page=Style_Shots`                                                | yes     |
| 21  | Vampire Survivors                     | wiki     | `https://vampire-survivors.fandom.com/api.php?action=parse&page=Weapons`, `Passive_items`, `Pickups`             | yes     |
| 22  | Downwell upgrades                     | wiki     | `https://downwell.fandom.com/api.php?action=parse&page=List_of_Upgrades`                                         | yes     |
| —   | Arkanoid, Breakout, Puzzle Bobble     | —        | StrategyWiki returned a Cloudflare challenge (HTTP 403); Wikipedia's Arkanoid article names no capsules          | no      |
| —   | Geometry Wars, Shatter, BBTAN / Ballz | —        | not attempted beyond search; no transcribed strings found                                                        | no      |

### Group 3 — item, upgrade and tooltip text

| #   | Source                                        | Evidence | URL                                                                                                                | Fetched |
| --- | --------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------ | ------- |
| 23  | Balatro (all 150 jokers)                      | wiki     | `https://balatrowiki.org/w/Jokers`                                                                                 | yes     |
| 24  | Slay the Spire cards (75 Ironclad) and relics | wiki     | `https://slay-the-spire.fandom.com/api.php?action=parse&page=Ironclad_Cards`, `Relics`                             | yes     |
| 25  | Hades (Zeus boons)                            | wiki     | `https://hades.fandom.com/api.php?action=parse&page=Zeus/Boons_(Hades)`                                            | yes     |
| 26  | Into the Breach weapons                       | wiki     | `https://intothebreach.fandom.com/api.php?action=parse&page=Weapons`                                               | yes     |
| 27  | Dead Cells mutations                          | wiki     | `https://deadcells.wiki.gg/api.php?action=parse&page=Mutations`                                                    | yes     |
| 28  | FTL augmentations                             | wiki     | `https://ftl.fandom.com/api.php?action=parse&page=Augmentations`                                                   | yes     |
| 29  | Brotato items (241)                           | wiki     | `https://brotato.wiki.spellsandguns.com/api.php?action=parse&page=Items`                                           | yes     |
| 30  | Luck be a Landlord symbols                    | wiki     | `https://luck-be-a-landlord.fandom.com/api.php?action=parse&page=Symbols` (inline icons are dropped by the export) | yes     |

### Group 4 — open-source games' string files

| #   | Source                                                                                     | Evidence | URL                                                                                                                                                                                                                    | Fetched |
| --- | ------------------------------------------------------------------------------------------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| 31  | Simon Tatham's Puzzles (Mines, Solo, shared menus)                                         | raw      | `https://raw.githubusercontent.com/ghewgill/puzzles/master/{mines,solo,midend,gtk}.c` (GitHub mirror)                                                                                                                  | yes     |
| 32  | GNOME Mines                                                                                | raw      | `https://raw.githubusercontent.com/GNOME/gnome-mines/master/po/en_GB.po` (msgid = source strings)                                                                                                                      | yes     |
| 33  | GNOME Sudoku                                                                               | raw      | `https://raw.githubusercontent.com/GNOME/gnome-sudoku/master/po/en_GB.po`                                                                                                                                              | yes     |
| 34  | GNOME AisleRiot (80+ solitaires)                                                           | raw      | `https://raw.githubusercontent.com/GNOME/aisleriot/master/po/en_GB.po`                                                                                                                                                 | yes     |
| 35  | GNOME Nibbles (snake)                                                                      | raw      | `https://raw.githubusercontent.com/GNOME/gnome-nibbles/master/po/en_GB.po`                                                                                                                                             | yes     |
| 36  | KDE KPatience                                                                              | raw      | `https://raw.githubusercontent.com/KDE/kpat/master/src/{mainwindow,dealer}.cpp`                                                                                                                                        | yes     |
| 37  | KDE KMines                                                                                 | raw      | `https://raw.githubusercontent.com/KDE/kmines/master/src/mainwindow.cpp`                                                                                                                                               | yes     |
| 38  | KDE KBreakOut                                                                              | raw      | `https://raw.githubusercontent.com/KDE/kbreakout/master/src/mainwindow.cpp`, `src/qml/{logic.js,main.qml}`, `src/generalsettings.ui`, `doc/index.docbook`                                                              | yes     |
| 39  | KDE KSnakeDuel                                                                             | raw      | `https://raw.githubusercontent.com/KDE/ksnakeduel/master/src/{ktron,tron}.cpp`                                                                                                                                         | yes     |
| 40  | Wine WineMine and ReactOS Solitaire, Spider, WinMine (clones of the classic Windows games) | raw      | `https://raw.githubusercontent.com/wine-mirror/wine/master/programs/winemine/winemine.rc`; `https://raw.githubusercontent.com/reactos/reactos/master/base/applications/games/{solitaire,spider,winmine}/lang/en-US.rc` | yes     |
| 41  | Shattered Pixel Dungeon                                                                    | raw      | `https://raw.githubusercontent.com/00-Evan/shattered-pixel-dungeon/master/core/src/main/assets/messages/{ui/ui,windows/windows,scenes/scenes,items/items}.properties`                                                  | yes     |
| 42  | Mindustry                                                                                  | raw      | `https://raw.githubusercontent.com/Anuken/Mindustry/master/core/assets/bundles/bundle.properties`                                                                                                                      | yes     |
| 43  | OpenTTD                                                                                    | raw      | `https://raw.githubusercontent.com/OpenTTD/OpenTTD/master/src/lang/english.txt`                                                                                                                                        | yes     |
| 44  | SuperTux                                                                                   | raw      | `https://raw.githubusercontent.com/SuperTux/supertux/master/data/locale/messages.pot`                                                                                                                                  | yes     |
| 45  | Lichess                                                                                    | raw      | `https://raw.githubusercontent.com/lichess-org/lila/master/translation/source/{site,puzzle,storm,preferences,nvui}.xml`                                                                                                | yes     |

Sources 9, 10 and 11 above also belong here; they are listed in group 1 by genre.

### Group 5 — published guidance

| #   | Source                                                                                                      | Evidence | URL                                                                                                                                                                    | Fetched |
| --- | ----------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| 46  | Microsoft Writing Style Guide                                                                               | page     | `https://learn.microsoft.com/en-us/style-guide/top-10-tips-style-voice`, `/capitalization`, `/punctuation/periods`, `/punctuation/exclamation-points`, `/numbers`      | yes     |
| 47  | Windows app design: writing style                                                                           | page     | `https://learn.microsoft.com/en-us/windows/apps/design/style/writing-style`                                                                                            | yes     |
| 48  | Xbox Accessibility Guidelines 101, 106, 114, 115                                                            | page     | `https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/101` (also `/106`, `/114`, `/115`)                                               | yes     |
| 49  | Xbox requirement XR-022, official naming standards                                                          | page     | `https://learn.microsoft.com/en-us/gaming/gdk/docs/store/policies/fma/xr022-official-naming-standards`                                                                 | yes     |
| 50  | Apple Human Interface Guidelines: Writing, Alerts, Designing for games, VoiceOver                           | page     | `https://developer.apple.com/tutorials/data/design/human-interface-guidelines/writing.json` (also `alerts.json`, `designing-for-games.json`, `voiceover.json`)         | yes     |
| 51  | Material Design writing guidelines (2017 archive)                                                           | page     | `https://web.archive.org/web/2017id_/https://material.io/guidelines/style/writing.html`                                                                                | yes     |
| —   | Material Design 2 and 3 writing pages, live                                                                 | —        | `m2.material.io/design/communication/writing.html` and `m3.material.io/foundations/content-design/...` return an empty JavaScript shell                                | no      |
| 52  | GNOME Human Interface Guidelines: writing style                                                             | raw      | `https://gitlab.gnome.org/Teams/Design/hig-www/-/raw/main/source/guidelines/writing-style.rst`                                                                         | yes     |
| 53  | KDE Human Interface Guidelines: text and labels                                                             | raw      | `https://invent.kde.org/documentation/develop-kde-org/-/raw/master/content/hig/text_and_labels.md`                                                                     | yes     |
| 54  | Game Accessibility Guidelines (three pages)                                                                 | page     | `https://gameaccessibilityguidelines.com/use-simple-clear-language/`, `/use-simple-clear-text-formatting/`, `/ensure-screenreader-support-including-menus-installers/` | yes     |
| 55  | Unity Editor design system: UI copy style                                                                   | page     | `https://unityeditordesignsystem.unity.com/fundamentals/ui-copy-style`                                                                                                 | yes     |
| 56  | George Fan, "How I Got My Mom to Play Through Plants vs. Zombies" (GDC 2012), as reported by Game Developer | page     | `https://www.gamedeveloper.com/design/gdc-2012-10-tutorial-tips-from-i-plants-vs-zombies-i-creator-george-fan`                                                         | yes     |
| 57  | "7 UX Lessons From The Trenches" (Steamhounds developers, GameDev.net)                                      | page     | `https://gamedev.net/tutorials/game-design/ux-for-games/7-ux-lessons-from-the-trenches-r4969`                                                                          | yes     |
| 58  | "Balatro creator unveils a few slick signposting strategies" (Game Developer)                               | page     | `https://www.gamedeveloper.com/design/balatro-creator-unveils-a-few-slick-signposting-strategies`                                                                      | yes     |
| —   | Game UI Database, Interface In Game                                                                         | —        | home pages load but both are screenshot galleries with no transcribed strings; a Game UI Database screen page returned HTTP 403 to WebFetch                            | no use  |
| —   | LocalThunk's "Guidelines for Joker design" post (Reddit)                                                    | —        | mirror returned 404                                                                                                                                                    | no      |

Scratch copies of everything fetched are in `/tmp/igt/` on the machine that ran this research; they are not kept in the repository.

---

# Part 1 — Verbatim strings by source

## Group 1 — casual and puzzle

### 1. Wordle, original build (Jan 2022)

- Toasts (errors): `Not enough letters` · `Not in word list` · `Share failed`
- Toast (confirmation): `Copied results to clipboard`
- Win words, by number of guesses used (1 to 6): `Genius` · `Magnificent` · `Impressive` · `Splendid` · `Great` · `Phew`
- Hard-mode errors (built from parts): `{1st} letter must be {A}` · `Guess must contain {A}` · `Hard mode can only be enabled at the start of a round`
- Settings, name then description: `Hard Mode` — `Any revealed hints must be used in subsequent guesses` · `Dark Theme` · `Color Blind Mode` — `High contrast colors`
- Statistics: `Statistics` · `Played` · `Win %` · `Current Streak` · `Max Streak` · `Guess Distribution` · `No Data` · `Next WORDLE`
- Onboarding (help sheet): `Guess the WORDLE in 6 tries.` · `Each guess must be a valid 5 letter word. Hit the enter button to submit.` · `After each guess, the color of the tiles will change to show how close your guess was to the word.` · `The letter` + a letter + `is in the word and in the correct spot.` · `is in the word but in the wrong spot.` · `is not in the word in any spot.` · `A new WORDLE will be available each day!`
- Icon buttons' `aria-label`: `help` · `statistics` · `settings`

Notes. Toasts are 2–4 words, sentence case, no full stop, no exclamation mark. Praise is one word, no punctuation; the last rung (`Phew`) is a joke at the player's expense, kindly meant. Setting names are Title Case; setting descriptions are full sentences with no full stop. Help text is full sentences with full stops. Numerals everywhere (`6 tries`, `5 letter word`). The key is named in lower case as a thing (`the enter button`) with the verb "Hit".

### 2. Wordle, NYT current build

- Toasts unchanged: `Not enough letters` · `Not in word list` · `Copied results to clipboard` · `Share failed`
- Win words unchanged: `Genius` · `Magnificent` · `Impressive` · `Splendid` · `Great` · `Phew`
- Help: `Guess the Wordle in 6 tries.` · `The color of the tiles will change to show how close your guess was to the word.` · `A new puzzle is released daily at midnight.`
- Settings, name then description: `Hard Mode` — `Any revealed hints must be used in subsequent guesses` · `Dark Theme` · `High Contrast Mode` — `Contrast and colorblindness improvements` · `Onscreen Keyboard Input Only` — `Ignore key input except from the onscreen keyboard. Most helpful for users using speech recognition or other assistive devices.` · `Show Timer` — `Displays the timer at the top of the screen, on the end screen, and in your message when you share your results`
- Prompt with one action: `For an extra challenge, turn on Hard Mode.` + button `Go to Settings`
- Hint offer: `Want a hint?` — `Go to today's Wordle Review article if you're stuck on this puzzle.`
- Badge headings: `You got Wordle in 1!` · `You got Wordle in 2!` · `You solved in Hard Mode!` · `You solved with only greens!` · `You earned a badge.`
- Errors and device states: `Something doesn't look right.` · `We couldn’t sync your stats. Try again in a few.` · `Oh no! We can’t fit everything on your screen.` · `Please rotate your device.`
- Screen-reader text for each tile (`role="img"`, `aria-roledescription="tile"`, `aria-live="polite"` on the row being revealed): `{1st} letter, {A}, correct` · `{1st} letter, {A}, present in another position` · `{1st} letter, {A}, absent` · `{1st} letter, {A}` (typed, not yet submitted) · `{1st} letter, empty`
- Other `aria-label`s: `Close` · `Keyboard` · example groups carry the example word and `aria-roledescription="Example"`

Notes. The game copy stayed terse while the account copy around it turned chatty ("Oh no!", "We couldn't…", "in a few"). Both `Dark Theme` and `Dark Mode` exist in the bundle — a naming drift. One setting description has full stops (two sentences) and three have none (one sentence): the Material rule "omit periods on fragments and single sentences, but use them when in a group of two or more sentences" applied literally.

### 3. NYT Connections

- Instruction: `Group words that share a common thread.` · `Select four items that have something in common`
- HUD: `Mistakes Remaining:`
- Buttons: `Shuffle` · `Deselect All` · `Submit` · `View Results` · `Share Your Results` · `Back to puzzle`
- Toasts: `One away...` · `Already guessed!` · `Copied results to clipboard`
- Result title by mistakes made (0 to 4): `Perfect` · `Great` · `Solid` · `Phew` · `Next Time`
- Out of guesses: `You're out of guesses.`
- After the game: `Great job on today's puzzle! Check out your progress.` · `Tomorrow's a new day, with a new puzzle. See you then.`
- Note: `Bonus puzzles don’t count toward your stats.`
- `aria-label`s: `Correct group ` (followed by the group) · `attempt #` · `Level ` · `View Connections stats` · `Close badge preview`

Notes. The loss title is `Next Time`, not "You lost". Buttons are Title Case here (`Deselect All`) but `Back to puzzle` is sentence case — the bundle mixes both. The near-miss toast is two words and an ellipsis.

### 4. NYT Spelling Bee

- Instruction: `Create words using letters from the hive.` · `Score points to increase your rating.` · placeholder `Type or click`
- Buttons: `Delete` · `Shuffle` · `Enter`
- Error toasts (in code order): `Too short` · `Bad letters` · `Missing center letter` · `Not in word list` · `Already found`
- Praise by points for the word: `Good!` (1 point) · `Nice!` (2–6) · `Awesome!` (7 or more) · `Pangram!`
- Rank names with the percentage of the maximum score that earns them: `Beginner` 0 · `Good Start` 2 · `Moving Up` 5 · `Good` 8 · `Solid` 15 · `Nice` 25 · `Great` 40 · `Amazing` 50 · `Genius` 70 · `Queen Bee` 100
- Progress line (assembled): `{n} points to next rank, {m} to Genius`
- Repeat-win lines: `Genius again! You’re on a roll.` · `Genius, yet again! Well done.` · `Still a Genius! Excellent work.` · `Genius again! No surprise here.` · `Genius ... again?! You’re great at this.` · `You ranked higher than yesterday. Congrats!`
- Empty state: `You haven’t started this puzzle yet.` then `Can you get to Genius?`
- Confirmation: `Do you want to reveal this puzzle’s answers? If you do you will no longer be able to enter words.`
- `aria-label`s: `Achieved rank marker ...` / `Not achieved rank marker ...` · `Genius rank icon` · `Queen Bee rank icon` · `Rank icon`

Notes. Error toasts are 2–4 words, sentence case, no punctuation; praise is one word plus an exclamation mark. That split — errors unpunctuated, praise with "!" — is consistent across all three NYT games. Rank names are one or two words, Title Case, and the ladder has ten rungs with gentle names at the bottom (`Good Start`, `Moving Up`) so no rank reads as an insult. Five interchangeable lines exist for the same repeat event, so the praise does not go stale.

### 5. 2048

- Intro: `Join the numbers and get to the 2048 tile!`
- HUD labels: `Score` · `Best` · score pop: `+{n}`
- Buttons: `New Game` · `Keep going` · `Try again`
- End messages: `You win!` · `Game over!`
- How to play: `How to play: Use your arrow keys to move the tiles. When two tiles with the same number touch, they merge into one!`

Notes. Whole game: under 40 words. Two words for each end state, each with one exclamation mark. `New Game` is Title Case, `Keep going` and `Try again` are sentence case. HUD labels have no colon.

### 6. Sudoku.com

- HUD: `Difficulty` · `Mistakes` `0/3` · `Time` `00:00`
- Difficulty names: `Easy` · `Medium` · `Hard` · `Expert` · `Master` · `Extreme`
- Tools: `Undo` · `Erase` · `Notes` · `Hint`
- Buttons: `New Game` · `Restart` · `Continue` · `Second Chance` · `Play Ad`
- Onboarding hint: `Select a cell, then tap a number to fill in the cell`
- Hint tooltip: `These hints explain solving methods that will help you improve your skills`
- Loss: title `Game Over` — `You have made 3 mistakes and lost this game` — buttons `Second Chance` · `New Game`
- Confirmation: title `Start New Game` — `Current game progress will be lost` — `OK` · `Cancel` — `Don't ask me again`
- Praise: `Awesome!`
- Loading: `Loading game`
- Social proof: `Only {n}% of players were able to solve this puzzle!`

Notes. Title Case buttons, sentence-case body without full stops. The loss message states the cause with a number and offers two next actions. The confirmation states the consequence, not a question.

### 7. Open Sudoku

- Buttons and menu: `Undo` · `Clear all notes` · `Fill in notes` · `Restart` · `Set checkpoint` · `Undo to checkpoint` · `Reset puzzle` · `Add sudoku` · `Play this puzzle`
- Win: `Congratulations, you have solved the puzzle in %s!` · `Well done!`
- Confirmations (all one formula): `Are you sure you want to restart this game?` · `Are you sure you want to clear all notes?` · `Are you sure you want to delete this folder?` · `Are you sure you want to reset selected puzzle?` · `Are you sure you want to undo all actions since the last checkpoint?` · `File already exists. Overwrite?`
- Settings, name then summary: `Highlight wrong values` — `Highlight values that break rules of sudoku.` · `Show time` — `Show time during gameplay` · `Highlight cell on touch` — `Highlights row and column of touched cell` · `Highlight completed numbers` — `Highlight buttons for numbers which have been entered 9 times` · `Single number` — `Select number, then just tap on cell to set its value or note.`
- Empty and counts: `No puzzles` · `1 puzzle` · `%d puzzles` · `all solved` · `%d unsolved` · `Not started` · `Playing` · `Solved` · `No puzzles found`
- Notifications: `New puzzle has been saved` · `Puzzle has been updated` · `Loading…` · `Generating puzzle…`
- Errors: `Unknown error occurred while importing puzzles; import was cancelled` · `Invalid format; import was cancelled` · `SD card not found`

Notes. Sentence case throughout, including buttons (`Reset puzzle`). Summaries mix imperative (`Highlight values…`) and third person (`Highlights row…`) and mix full stops — the kind of drift a style guide exists to stop. The two import errors are the file's only semicolons; both join what went wrong to what happened next.

### 8. Antimine

- Start: `Tap to Begin` · difficulty: `Beginner` · `Intermediate` · `Expert` · `Master` · `Legend` · `Custom`
- Buttons: `New Game` · `Retry` · `Continue` · `Resume` · `Start` · `Open` · `Flag` · `Share` · `Quit`
- Win: `You won!` — `You found %1$d mines in %2$d seconds.`
- Loss: `You lost!` — `Good luck on your next game.`
- Neutral end: `You finished!`
- Confirmation: `Do you want to start a new game?` — `If you start a new game, your current progress will be lost.`
- HUD: `%d mines` · `%1$d × %2$d`
- Settings: `Haptic Feedback` · `Sound Effects` · `Use Question Mark` · `'No guessing' mode` · `Enable automatic placing of flags` · `Highlight unsolved numbers` · `Show clock` · `Allow tap on numbers` · `Switch: Flag and Open` — `Use button to switch between Flag and Open`
- Warnings and errors: `The current minefield may not be guess-free!` · `Proportion is too high!` · `Min is %d` · `Max is %d` · `Impossible to do that now` · `No internet connection.` · `Unknown error.` · `Failed to sign in. Please check your network connection and try again.` · `Sorry, an error occurred. Please, send the report to the developers.`
- Notification: `A mine has been revealed` · `You have received: +%1$d` · `Settings exported!`
- Onboarding: `Do you know how to play minesweeper?` — `Open Tutorial` · `If a number is touching the same number of squares, then the squares are all mines.`
- Loading: `Loading…` · `Creating valid game…`

Notes. End screens are a two-word headline with "!" plus one plain sentence with numbers. The loss follow-up is a kind wish, not a diagnosis. Setting names drift between Title Case (`Haptic Feedback`) and sentence case (`Show clock`).

### 9. PROXX

- Setup: `Width` · `Height` · `Black holes` · presets `Easy` · `Medium` · `Hard` · `Custom` · button `Start`
- End: `You win!` · `New high score!` · labels `Score` · `Best` · buttons `Play again` · `Try again` · `Main menu`
- Toggle label (visible): `Flag:ON` / `Flag:OFF`
- Screen-reader text: grid `aria-label="The game grid"`; cell labels `hidden` · `flag` · `black hole` · `blank` · `{n}` (the digit alone); switch `aria-label="flag mode"`; live region (`role="status"`, `aria-live="assertive"`): `flag mode on` · `flag mode off`; buttons `Back to main menu` · `Open information and settings` · `close button` · `fullscreen mode` · `game settings`

Notes. Sentence case for buttons (`Play again`, `Main menu`). `Play again` after a win and `Try again` after a loss — the same action named by outcome. Screen-reader cell labels are single lower-case words; the row and column are left to the grid roles.

### 10. hello wordl

- Status line (`role="alert"`): `Make your first guess!` · `Too short` · `Not a valid word` · `{n} letters` · `You won! The answer was {WORD}. (Enter to play again)` · `You lost! The answer was {WORD}. (Enter to play again)` · `Link copied to clipboard!` · `Result copied to clipboard!`
- Hard-mode feedback: `{1st} letter must be {A}` · `{1st} letter can't be {A}` · `Guess must contain {A}` · `Guess can't contain {A}` · `Guess must contain exactly {two} {A}s`
- Difficulty, name then description: `Normal` — `Guesses must be valid dictionary words.` · `Hard` — `Wordle's "Hard Mode". Green letters must stay fixed, and yellow letters must be reused.` · `Ultra Hard` — `An even stricter Hard Mode. Yellow letters must move away from where they were clued, and gray clues must be obeyed.`
- Screen-reader text: table `aria-label="Table of guesses"`; cell label `{A}: correct` · `{A}: elsewhere` · `{A}: no`; cells being typed are `aria-live="assertive"`

Notes. One line carries outcome, answer and next action in that order; the key hint sits in brackets at the end. Win and loss share one sentence frame, differing by one verb.

### 11. Grid Games

- Ready: `Game is ready to play.` · `The Sudoku game is ready to play!` · `Welcome to the Sudoku Game!`
- Win: `Congratulations!` · `You won the game in {0} goes.` then `Would you like to play another game?`
- Loss (Leaf Sweeper): `Nice try, but a resting frog got swept up with the leaves!` then `Would you like to play another game?`
- Screen-reader announcements: `Row $r Column $c, Group $g` (the player can edit this format) · `That's a match.` · `Unmatched cards turned back.` · `{0} is not shown in this row, column, or group.` · `Matched` · `Turned up` · `Empty` · `Row needs ` · `Column needs `
- Settings: `Play a sound and make a screen reader announcement` · `Make a screen reader announcement` · `Format of square location announcement` · `Restore default announcement`
- Warning: `Important: If you change the number of rows and columns in the game, the game will need to be restarted.`

Notes. Announcements for events are short full sentences with a full stop; state words are single capitalised words. The location format is a setting — the only game found that lets the player rewrite what the screen reader says.

### 12. Candy Crush Saga call-outs

The wiki lists spoken call-outs that are also shown as text, in rising order of cascade size: `Sweet` · `Tasty` · `Delicious` · `Divine`, then `Sugar Crush` when the level's tasks are complete. It quotes `"Sweet!"`, `"Divine!"` and, for finishing in two moves or fewer, `"Unbelievable!"`. Other one-word call-outs appear only as sound-file names (`Frogtatic`, `Moonstruck`).

Notes. One word each, themed to the game's subject (food), four rungs. The ladder is by intensity, never by number.

### 13. Monument Valley chapter titles

`I. Prelude` · `II. The Garden` · `III. Hidden Temple` · `IV. Water Palace` · `V. The Spire` · `VI. The Labyrinth` · `VII. The Rookery` · `VIII. The Box` · `IX. The Descent` · `X. Observatory`

Notes. Roman numeral, full stop, one or two words. Level names as places, not numbers alone.

## Group 2 — arcade and action

### 14. Pac-Man / Ms. Pac-Man (ROM text table)

`HIGH SCORE` · `CREDIT` · `FREE PLAY` · `PLAYER ONE` · `PLAYER TWO` · `GAME  OVER` · `READY!` · `PUSH START BUTTON` · `1 PLAYER ONLY` · `1 OR 2 PLAYERS` · `BONUS PAC-MAN FOR   000 pts` · `CHARACTER / NICKNAME` · `1 COIN  1 CREDIT` · `2 COINS 1 CREDIT` · `1 COIN  2 CREDITS` · `BONUS  NONE` · `TABLE` · `UPRIGHT` · `MEMORY  OK` · intermission cards `THEY MEET` · `THE CHASE` · `JUNIOR`

(The ROM stores `@` for a space, `;` for a hyphen and `[` for the exclamation mark; they are decoded here. The `1 OR 2 PLAYERS` string is named in the disassembly's comments.)

### 15. Galaga (ROM text table)

`PUSH START BUTTON` · `GAME OVER` · `READY` · `PLAYER 1` · `PLAYER 2` · `STAGE ` · `CHALLENGING STAGE` · `NUMBER OF HITS` · `BONUS  ` · `FIGHTER CAPTURED` · `PERFECT !` · `SPECIAL BONUS 10000 PTS` · `-RESULTS-` · `SHOTS FIRED` · `HIT-MISS RATIO` · `1ST BONUS FOR ` · `2ND BONUS FOR ` · `AND FOR EVERY ` · `0000 PTS` · `ENTER YOUR INITIALS !` (from a code comment)

(The ROM writes `READY !`, and the disassembly notes that its `!` code draws a blank; it writes `PERFECT c`, which a comment gives as `PERFECT !`; and it writes `]` in `]RESULTS]` and `HIT]MISS RATIO`, decoded here as a hyphen on the assumption that this is how the screen shows it.)

### 16. Asteroids (message table, from the disassembly's comments)

`PUSH START` · `GAME OVER` · `PLAYER ` · `YOUR SCORE IS ONE OF THE TEN BEST` · `PLEASE ENTER YOUR INITIALS` · `PUSH ROTATE TO SELECT LETTER` · `PUSH HYPERSPACE WHEN LETTER IS CORRECT`

Notes on 14–16. All capitals because the character sets had nothing else. One to three words for states, verb-first commands for prompts (`PUSH START BUTTON`). The control is named by its cabinet label (`ROTATE`, `HYPERSPACE`), never described. Digits always; `PTS` abbreviated. Asteroids' high-score entry is the one place with full sentences, and it says `PLEASE`. The only exclamation marks are on `READY!` and `PERFECT !`.

### 17. Tetris Guideline

- From the Tetris wiki (Fandom): line values named `Single` · `Tetris`; moves `T-Spin` · `Mini T-spin`; `Back to Back`; `"Hold piece"`; `hard drop` · `soft drop`
- From tetris.wiki's scoring table (read through WebFetch): `Single` · `Double` · `Triple` · `Tetris` · `Mini T-Spin Single` · `T-Spin Single` · `T-Spin Double` · `T-Spin Triple` · `Back-to-Back` · `Combo` · `Soft drop` · `Hard drop` · `Single-line perfect clear` · `Tetris perfect clear`

Notes. Action names are nouns, one to three words, composable: modifier + move + size (`Mini` + `T-Spin` + `Double`), with `Back-to-Back` as a prefix. The names are the call-outs.

### 18. Techmino

- Call-outs (assembled from parts): `Single` · `Double` · `Triple` · `Techrash` · `{T}-spin ` · `Mini` · `B2B ` · `B2B2B ` · `Perfect Clear` · `Half PC` · `$1 lines`
- Praise and progress: `Great!` · `Awesome!` · `Keep Going!` · `Stage $1 cleared!` · `New Record!`
- End: `Win!` · `Lose` · `Finished` · `You Won` · `Game Over`
- Start: `Ready` · `Press any key to start!`
- Pause menu: `Resume (esc)` · `Retry (R)` · `Quit (Q)` · `Settings (S)` · `Replay (P)` · `Save (O)`
- HUD: `Pieces` · `Lines` · `Attack` · `Efficiency` · `Combo` · `Max Combo` · `Speed Level`
- Settings: `Game Settings` · `Start Delay` · `Rotation System` · `Pause When Unfocused` · `Auto-save New Records` · `Smooth Falling` · `Score Pop-Ups` · `Menu Button Pos.`
- Warnings: `Careful—you're about to change some uncommon settings!` · `This setting takes effect after restart`

Notes. The shortcut key sits in brackets after each pause-menu label. Heavy abbreviation (`B2B`, `PC`, `Pos.`) for an expert audience.

### 19. Hextris

`HIGH SCORE` · `GAME OVER` · `HIGH SCORES` · `SHARE MY SCORE!`

Notes. A modern web arcade game that keeps the all-capitals arcade register on purpose.

### 20. Peggle style shots

`Free Ball Skills` · `Long Shot` · `Double Long Shot` · `Super Long Shot` · `Off The Wall` · `Kick the Bucket` · `Lucky Bounce` · `Mad Skills` · `Crazy Mad Skills` · `Extreme Slide` · `Orange Attack`

Notes. Two or three words, Title Case, a name for the trick rather than a grade. Escalation by stacking an intensifier in front: `Long Shot` → `Super Long Shot`; `Mad Skills` → `Crazy Mad Skills`. Idiom and pun (`Kick the Bucket`, `Off The Wall`).

### 21. Vampire Survivors

Weapons, name then description (192 rows parsed):

- `Whip` — `Attacks horizontally, passes through enemies.`
- `Magic Wand` — `Fires at the nearest enemy.`
- `Knife` — `Fires quickly in the faced direction.`
- `Axe` — `High damage, high area scaling.`
- `King Bible` — `Orbits around the character.`
- `Garlic` — `Damages nearby enemies. Reduces resistance to knockback and freeze.`
- `Santa Water` — `Generates damaging zones.`
- `Runetracer` — `Passes through enemies, bounces around.`
- `Lightning Ring` — `Strikes at random enemies.`

Passive items (31 rows):

- `Spinach` — `Raises inflicted damage by 10%.`
- `Armor` — `Reduces incoming damage by 1. Increases retaliatory damage by 10%.`
- `Hollow Heart` — `Augments max health by 20%.`
- `Pummarola` — `Character recovers 0.2 HP per second.`
- `Empty Tome` — `Reduces weapons cooldown by 8%.`
- `Wings` — `Character moves 10% faster.`
- `Clover` — `Character gets 10% luckier.`
- `Crown` — `Character gains 8% more experience.`
- `Tirajisú` — `Character revives with 50% health once.`
- `Parm Aegis` — `Increases invulnerability time after getting damaged by 50ms.`

Pickups:

- `Gold Coin` — `Adds 1 to your gold coins total.`
- `Rosary` — `Destroys all enemies in sight.`
- `Orologion` — `Freezes all enemies in time for 10 seconds.`
- `Vacuum` — `Gathers all experience gems left on the ground.`
- `Floor Chicken` — `Restores 30 health points.`
- `Little Clover` — `Pick up to get 10% luckier.`
- `Wall Chicken` — `Typical Castlevania pot roast. Restores 60 Health points.`

Measured: weapon descriptions have a median of 7 words (range 3–16); all 192 end with a full stop; 4 use "you/your"; none has a semicolon or brackets; 9 contain a digit. Passive items: median 6 words; 18 of 31 contain a number.

Notes. The formula is a third-person verb with no subject (`Fires at the nearest enemy.`), or `Character` + verb for stats. Weapon text describes behaviour and leaves numbers to a stats panel; passive-item text gives the number. Verbs vary for the same operation (`Raises`, `Augments`, `Increases`) — flavour bought at the cost of consistency. One joke line among many plain ones (`Typical Castlevania pot roast.`).

### 22. Downwell upgrades

- `Apple` — `gain 4 hp`
- `Blast Module` — `stomping on enemies causes a blast`
- `Candle` — `longer state of invincibility when taken damage`
- `Drone` — `beep boop hello i'm a drone`
- `Gem Attractor` — `sucks in nearby gems`
- `Gem Powered` — `getting gems recharges gunboots`
- `Gunpowder Blocks` — `blocks shoot out bullets when destroyed`
- `Heart Balloon` — `pretty balloon`
- `Hot Casing` — `bullet casings deal damage`
- `Knife and Fork` — `consume some dead bodies to gain health`
- `Laser Sight` — `increase range + accuracy`
- `Member's Card` — `shops at start + 10% discount`
- `Popping Gems` — `getting gems causes a bullet to shoot up`
- `Reverse Engineering` — `shoot a gun module to reshuffle it once`

Notes. All lower case, no full stop, 2–8 words, `+` for "and". Two of twenty descriptions drop the effect and give only character (`pretty balloon`, `beep boop hello i'm a drone`).

## Group 3 — item, upgrade and tooltip text

### 23. Balatro — all 150 jokers

A sample, name then effect and price:

- `Joker` — `+4 Mult`
- `Greedy Joker` — `Played cards with Diamond suit give +3 Mult when scored`
- `Jolly Joker` — `+8 Mult if played hand contains a Pair`
- `Sly Joker` — `+50 Chips if played hand contains a Pair`
- `Half Joker` — `+20 Mult if played hand contains 3 or fewer cards`
- `Four Fingers` — `All Flushes and Straights can be made with 4 cards`
- `Credit Card` — `Go up to -$20 in debt`
- `Banner` — `+30 Chips for each remaining discard`
- `Mystic Summit` — `+15 Mult when 0 discards remaining`
- `Loyalty Card` — `X4 Mult every 6 hands played / 5 remaining`
- `8 Ball` — `1 in 4 chance for each played 8 to create a Tarot card when scored / (Must have room)`
- `Misprint` — `+0-23 Mult`
- `Chaos the Clown` — `1 free Reroll per shop`
- `Fibonacci` — `Each played Ace, 2, 3, 5, or 8 gives +8 Mult when scored`
- `Even Steven` — `Played cards with even rank give +4 Mult when scored / (10, 8, 6, 4, 2)`
- `Gros Michel` — `+15 Mult / 1 in 6 chance this card is destroyed at end of round`
- `Ice Cream` — `+100 Chips / -5 Chips for every hand played`
- `Egg` — `Gains $3 of sell value at end of round`
- `Ride the Bus` — `This Joker gains +1 Mult per consecutive hand played without a scoring face card / (Currently +0 Mult)`
- `Blue Joker` — `+2 Chips for each remaining card in deck / (Currently +104 Chips)`
- `Golden Joker` — `Earn $4 at end of round`
- `Juggler` — `+1 hand size`
- `Shortcut` — `Allows Straights to be made with gaps of 1 rank / (ex: 10 8 6 5 3)`
- `Blueprint` — `Copies ability of Joker to the right`
- `Oops! All 6s` — `Doubles all listed probabilities / (ex: 1 in 3 -> 2 in 3)`
- `Mr. Bones` — `Prevents Death if chips scored are at least 25% of required chips / self destructs`
- `Luchador` — `Sell this card to disable the current Boss Blind`

Measured over all 150: median 11 words (range 2–20, mean 11.1). None ends with a full stop. None has a semicolon. 52 open with a signed or multiplied number or a count (`+4`, `X3`, `1 in 4`). 12 use "you/your". 46 carry a bracketed note, and those notes are of four kinds only: live state `(Currently +0 Mult)`, a capacity condition `(Must have room)`, a list of what qualifies `(10, 8, 6, 4, 2)`, and a worked example `(ex: 1 in 3 -> 2 in 3)`.

Notes.

- Formula A, the commonest: `+N Stat` + `if / when / for each / per` + condition. Number first, condition second.
- Formula B: `Played cards with X give +N Stat when scored` — subject, verb, number, trigger.
- Formula C, scaling: `This Joker gains +N Stat` + trigger + `(Currently …)`.
- Formula D, economy: `Earn $N` + when.
- Keywords are capitalised game nouns used exactly the same way every time: `Mult`, `Chips`, `Blind`, `Joker`, `Tarot`, `Flush`, `Pair`. Timing phrases are fixed too: `when scored`, `held in hand`, `at end of round`, `when Blind is selected`. The wiki lists these as terms the game defines once.
- Numbers: sign always shown (`+4`, `-5`), multiplication as `X3`, money as `$4`, odds as `1 in 4`, never "25%" for odds.
- Articles are dropped (`Copies ability of Joker to the right`).
- Names carry all the humour (`Oops! All 6s`, `Mr. Bones`, `Ride the Bus`, `Even Steven`); effects are dry.

### 24. Slay the Spire — cards and relics

Cards (75 Ironclad cards parsed; the wiki writes the upgraded value in brackets, as in `Deal 8(10) damage.` — that notation is the wiki's, not the game's, and the strings below show the base value only):

- `Strike` — `Deal 6 damage.`
- `Defend` — `Gain 5 Block.`
- `Bash` — `Deal 8 damage. Apply 2 Vulnerable.`
- `Anger` — `Deal 6 damage. Add a copy of this card to your discard pile.`
- `Body Slam` — `Deal damage equal to your current Block.`
- `Cleave` — `Deal 8 damage to ALL enemies.`
- `Clash` — `Can only be played if every card in your hand is an Attack. Deal 14 damage.`
- `Flex` — `Gain 2 Strength. At the end of your turn, lose 2 Strength.`
- `Twin Strike` — `Deal 5 damage twice.`
- `Carnage` — `Ethereal. Deal 20 damage.`
- `Disarm` — `Enemy loses 2 Strength. Exhaust.`
- `Dark Embrace` — `Whenever a card is Exhausted, draw 1 card.`
- `Entrench` — `Double your current Block.`
- `Battle Trance` — `Draw 3 cards. You cannot draw additional cards this turn.`

Relics (about 180 rows parsed):

- `Burning Blood` — `At the end of combat, heal 6 HP.`
- `Anchor` — `Start each combat with 10 Block.`
- `Akabeko` — `Your first attack each combat deals 8 additional damage.`
- `Bag of Marbles` — `At the start of each combat, apply 1 Vulnerable to ALL enemies.`
- `Bronze Scales` — `Whenever you take damage, deal 3 damage back.`
- `Happy Flower` — `Every 3 turns, gain 1 Energy.`
- `Pen Nib` — `Every 10th Attack you play deals double damage.`
- `Potion Belt` — `Upon pickup, gain 2 Potion slots.`
- `Strawberry` — `Raise your Max HP by 7.`
- `Preserved Insect` — `Enemies in Elite rooms have 25% less HP.`
- `The Boot` — `Whenever you would deal 4 or less unblocked Attack damage, increase it to 5.`
- `Matryoshka` — `The next 2 chests you open contain 2 Relics. (Excludes boss chests)`

Measured. Cards: median 10 words (range 3–16); 74 of 75 end with a full stop; no semicolons, no exclamation marks; 69 contain a digit. Their 131 sentences open with `Deal` (32), `Exhaust` (18), `Gain` (16), `Whenever` (9), `Apply` (6), `Draw` (6). Relics: median 10 words; openers `Whenever` (37), `At the start of` (25), `Gain` (13), `Every` (11), `Upon pick up` (10); about two in three use "you/your".

Notes.

- One effect per sentence, each sentence a bare imperative with a full stop: `Deal 8 damage. Apply 2 Vulnerable.` Order of sentences is order of resolution.
- A keyword alone is a sentence: `Ethereal.` `Exhaust.` Keywords are capitalised and defined in a separate hover tooltip, so the card never explains them.
- Relics put the trigger first, then the effect: `Whenever` / `At the start of` / `Every N` + comma + imperative.
- `ALL` in capitals is the single emphasis device, used for one meaning only.
- Plain integers, no plus sign, no units beyond the keyword; percentages only for proportional effects.

### 25. Hades — Zeus boons

- `Lightning Strike` — `Your Attack emits chain-lightning when you damage a foe.`
- `Thunder Flourish` — `Your Special causes a lightning bolt to strike nearby foes.`
- `Electric Shot` — `Your Cast is a burst of chain-lightning that bounces between foes.`
- `Thunder Dash` — `Your Dash causes a lightning bolt to strike nearby foes.`
- `Zeus' Aid` — `Your Call makes lightning strike nearby foes repeatedly for 1.5 Sec.`
- `Heaven's Vengeance` — `After you take damage, your foe is struck by lightning.`
- `Storm Lightning` — `Your chain-lightning effects bounce more times before expiring.`
- `High Voltage` — `Your lightning bolt effects deal damage in a larger area.`
- `Double Strike` — `Your lightning bolt effects have a chance to strike twice.`
- `Static Discharge` — `Your lightning effects also make foes Jolted.`
- `Billowing Strength` — `After using Call, you deal more damage for 15 Sec.`
- `Splitting Bolt` — `All your lightning effects create an additional burst.`

Each boon then lists one stat line under the sentence, by rarity: `Lightning Damage: 30` · `Cast Damage: 60` · `Bolt Area of Effect: +60%` · `Strike Chance: 25%` · `Bonus Damage: +20%` · `Lightning Bounces: +2`

Measured over the 21 Zeus boons: median 10 words (range 7–13); all end with a full stop; all use "your" or "you"; 17 open with `Your`; only 4 sentences contain a digit.

Notes. The sentence says what changes in words (`more damage`, `a larger area`, `a chance`); the number lives on its own `Label: value` line below, so the number can change with rarity without rewriting the sentence. Every sentence is anchored to the player's action by name (`Your Attack`, `Your Dash`). Capitalised keywords for actions and statuses (`Cast`, `Call`, `Jolted`).

### 26. Into the Breach — weapons

- `Janus Cannon` — `Fire two projectiles in opposite directions (with push).`
- `Heavy Rocket` — `Fire a projectile that heavily damages a target and pushes adjacent tiles. Single-use.`
- `Rail Cannon` — `Projectile that does more damage to targets that are further away.`
- `Rock Launcher` — `Throw a rock at a chosen target. Rock remains as an obstacle.`
- `Teleporter` — `Swap places with a nearby tile.`
- `Shield Projector` — `Shield tiles from damage. 2 uses per battle.`
- `Smoke Pellets` — `Surround yourself with Smoke to defend against nearby enemies. Single-use.`
- Upgrades, name then description: `+1 Damage` — `Increases damage by 1.` · `+1 Use` — `Increases uses per battle by 1.` · `+2 Range` — `Extends range of the swap by 2 tiles.` · `Shield Self` — `Creates a personal Shield when used.` · `Ally Immune` — `No longer applies Smoke on self or allies.` · `Unlimited Use` — `Removes use restriction in battles.`

Notes. Imperative for the weapon (`Fire…`, `Throw…`), third person for the upgrade (`Increases…`). Limits are a trailing fragment: `Single-use.` `2 uses per battle.` Upgrade names are the effect itself (`+1 Damage`), and the description restates it in words — redundant on purpose. The wiki records one description that disagrees with the game's behaviour ("This is actually +2 range. The text is wrong in game") — the price of writing the number in two places.

### 27. Dead Cells — mutations (the wiki writes scaling values in square brackets)

- `Combo` — `Each consecutive hit that connects continues your combo, increasing your damage dealt. The combo expires after 2.5 sec or if you are dealt damage.`
- `Vengeance` — `+[60% base] damage dealt for 8 seconds and -30% damage taken for 3 seconds after taking damage.`
- `Melee` — `Melee attacks slow down enemies for [0.4 base, 1.6 max] seconds.`
- `Initiative` — `Your first melee strike against an enemy inflicts +[100 base] damage.`
- `Support` — `+[35% base] damage if you're close to a deployed skill.`
- `Tranquility` — `+[25% base] damage if there are no enemies near you.`
- `Predator` — `Killing an enemy with a melee strike makes you invisible for [1 base, 2.8 max] seconds.`

Notes. Longer and looser than Balatro or Slay the Spire, with units drifting between `sec`, `seconds` and `DPS` in the same table.

### 28. FTL — augmentations (32 quoted descriptions)

- `Automated Re-loader` — `Cooldown between weapon shots is improved by 10 percent.`
- `Weapon Pre-Igniter` — `Weapons are made immediately available after an FTL jump.`
- `Scrap Recovery Arm` — `Allows the ship to collect 10 percent more scrap from any source.`
- `Shield Charge Booster` — `Boosts the ship's shield recharge rate by 15 percent.`
- `Emergency Respirators` — `Crew take half damage from low oxygen.`
- `Repair Arm` — `Repairs your hull every time you collect scrap, but reduces scrap collected by 15 percent.`
- `Rock Plating` — `Superior hull armor provides a 15 percent chance to negate incoming hull damage (hit systems will still be damaged).`
- `Damaged Stasis Pod` — `This bizarre alien artifact appears to be barely operational. It has no practical function but perhaps someone can repair it.`

Measured: median 12 words (range 6–22); all 32 end with a full stop; 12 write `percent` as a word and none uses `%`; no semicolons; 3 have a bracketed caveat.

Notes. Full, formal sentences in a ship's-manual voice; "percent" spelled out is part of that voice. Trade-offs joined with `, but`.

### 29. Brotato — items (241 parsed)

- `Alien Tongue` — `+30% pickup range / +1 Knockback`
- `Alien Worm` — `+3 Max HP / +2 HP Regeneration / -1 HP recovered from consumables`
- `Bat` — `+2 % Life Steal / -2 Harvesting`
- `Beanie` — `+4 % Speed / -6 Range`
- `Bag` — `+15 materials when you pick up a crate / -1 % Speed`
- `Bandana` — `Projectiles pierce through 1 additional target / -10 % Damage`
- `Barricade` — `+3 Knockback / +8 Armor while standing still / -5 % Speed`
- `Anvil` — `A random weapon is upgraded when entering a shop. If you have no weapon to upgrade, you gain +2 Armor instead.`
- `Blood Donation` — `+40 Harvesting / You take 1 damage per second (does not give invulnerability time)`

Measured: 580 effect lines across 241 items, median 2 lines per item; 494 lines (85%) open with a signed number; 2 end with a full stop; 45 use "you".

Notes. A stat sheet, not prose: one effect per line, sign first, then the stat's exact name in capitals. Benefits first, drawbacks last. A sentence appears only when an effect cannot be put as `±N Stat`. (The wiki shows a space before `%` in most lines and none in others; that may be the wiki's doing.)

### 30. Luck be a Landlord — symbols

The game sets small icons inside its sentences (for the coin and for other symbols). The wiki export drops them, so the strings below have gaps where an icon stood; they are shown as exported.

- `Banana` — `Adds when destroyed.`
- `Bar of Soap` — `Adds each spin. Destroys itself after giving 3 times.`
- `Cat` — `Destroys adjacent . Gives 9 for each destroyed.`
- `Crab` — `Gives 3 more for each other in the same row.`
- `Crow` — `Gives -3 every 4 spins.`
- `Chick` — `Has a 10% chance to grow into .`
- `Comedian` — `Adjacent and give 3x more .`
- `Five-Sided Die` — `Gives between 1 and 5 randomly.`
- `Golem` — `Destroys itself after 5 spins. Adds 5 when destroyed.`

Notes. Five verbs do nearly all the work — `Adds`, `Gives`, `Destroys`, `Transforms`, `Has a N% chance` — each with one meaning. Things are shown as icons inside the sentence instead of being named, which is why the sentences survive with so few words.

## Group 4 — open-source games' string files

### 31. Simon Tatham's Puzzles

- Menus: `Game` · `New` · `Restart` · `Specific...` · `Random Seed...` · `Type` · `Custom...` · `Load...` · `Save...` · `Undo` · `Redo` · `Copy` · `Solve` · `Exit` · `Help` · `About`
- Mines status bar: `Marked: %d / %d` · `  Deaths: %d` · `COMPLETED!` · `DEAD!` · `Auto-solved.`
- Mines options: `Width` · `Height` · `Mines` · `Ensure solubility`
- Solo (Sudoku) options: `Columns of sub-blocks` · `Rows of sub-blocks` · `"X" (require every number in each main diagonal)` · `Jigsaw (irregularly shaped sub-blocks)` · `Killer (digit sums)` · `Symmetry` · `Difficulty`
- Solo difficulty: `Trivial (blockwise positional elimination only)` · `Basic (row/column/number elimination required)` · `Intermediate (intersectional analysis required)` · `Advanced (set elimination required)` · `Extreme (complex non-recursive techniques required)` · `Unreasonable (guesswork and backtracking required)`
- Errors: `Width and height must both be greater than two` · `Too many mines for grid size` · `This game does not support the Solve operation` · `Multiple solutions exist for this puzzle` · `Both dimensions must be at least 2`

Notes. The barest register found: one-word menu items, a status bar of `Label: value` pairs, state words in capitals with "!". The pattern `Name (what it means)` puts the explanation in the option label itself. Errors are one sentence, no full stop, stating the rule that was broken.

### 32. GNOME Mines

- Buttons and menu: `Play Game` · `Pause` · `Resume` · `Play Again` · `Start Over` · `Change Difficulty` · `Best Times` · `Scores` · `Appearance` · `Use Question Flags` · `Keyboard Shortcuts` · `Help` · `About Mines` · `Cancel`
- Board sizes: `%d × %d, %d mine` / `%d × %d, %d mines` · `Custom` · `Width` · `Height` · `Percent mines`
- State: `Paused`
- Confirmation: `Do you want to start a new game?` — `If you start a new game, your current progress will be lost.` — `Keep Current Game` · `Start New Game`
- Shortcut descriptions: `Start a new game` · `Restart game with current settings` · `Pause the game` · `Reveal field` · `Toggle field flag state` · `Move the keyboard cursor`
- Settings keys, summary then description: `Use the unknown flag` — `Set to true to be able to mark squares as unknown.` · `Enable automatic placing of flags` — `Set to true to automatically flag squares as mined when enough squares are revealed` · `Enable animations` — `Set to false to disable theme-defined transition animations`
- Store description: `Be careful not to trigger one, or the game is over!` · `If you get stuck, you can ask for a hint: there’s a time penalty, but that’s better than hitting a mine!`

Notes. Follows its HIG: header capitalisation on buttons, sentence capitalisation in body text, both dialog buttons name their outcome. Proper `×` sign and singular/plural pairs. Five different labels for "begin a game" (`Play Game`, `Play Again`, `Start Over`, `Start New Game`, and `Start a new game` in the shortcut list).

### 33. GNOME Sudoku

- Menu and buttons: `New Game…` · `Reset Puzzle` · `Print Current Puzzle…` · `Preferences` · `Clear Cell` · `Undo` · `Redo` · `Pause` · `Play` · `Earmark Mode` · `Start Game` · `Play Anyway` · `Play Again` · `Back` · `Quit` · `Create Puzzle`
- Difficulty: `Easy` · `Medium` · `Hard` · `Very Hard` · `Custom`; as a title `Easy Difficulty` · `Select Difficulty`
- Win: `Well done, you completed the puzzle in %d minute!` / `...in %d minutes!` — `Quit` · `Play Again`
- State: `Paused`
- Errors with a rule: `The puzzle you have entered is not a valid Sudoku.` — `Please enter a valid puzzle.` · `The puzzle you have entered has multiple solutions.` — `Valid Sudoku puzzles have exactly one solution.` — `Back` · `Play Anyway`
- Preference switches: `Timer and Pause Buttons` · `Number Picker on Second Click` · `Automatically Clean Earmarks` · `Show Earmark Possibilities` · `Check Against Solution` · `Highlight Matching Numbers` · `Highlight Row and Column`
- Settings keys (longer, sentence case): `Color mistakes and duplicate numbers in red` · `Displays a big red X in a square if it cannot possibly be filled by any number and duplicate numbers are highlighted in red` · `Highlight the selected cell's row and column`

Notes. Error dialogs are two short sentences: what is wrong, then the rule or the fix. An escape hatch is named for what it does (`Play Anyway`).

### 34. GNOME AisleRiot

- Menu: `New Game` · `Restart` · `Select Game…` · `Recently Played` · `Statistics` · `Undo Move` · `Redo Move` · `Deal` · `Hint` · `Fullscreen` · `Leave Fullscreen` · `Pause`
- Menu-item tooltips: `Start a new game` · `Restart the game` · `Play a different game` · `Show gameplay statistics` · `Undo the last move` · `Redo the undone move` · `Deal next card or cards` · `Get a hint for your next move` · `Show or hide the toolbar` · `Pick up and drop cards by clicking`
- HUD: `Score:` · `Time:` · `Stock left:` · `Stock left: ~a` · `Redeals left: ~a` · `Deals left: ~a` · `Cards remaining: ~a` · `Base Card: ~a`
- Statistics: `Wins:` · `Total:` · `Percentage:` · `Best:` · `Worst:` · `N/A`
- End: `Congratulations, you have won!` · `There are no more moves`
- Hints (the full family, about forty frames): `Move ~a onto the foundation.` · `Move ~a onto an empty tableau slot.` · `Move the two of clubs onto the three of clubs.` (assembled) · `Deal a new card from the deck` · `Deal another round` · `Move waste back to stock` · `Try rearranging the cards` · `Try moving a card to the reserve` · `Consider moving something into an empty slot` · `You are searching for an ace.` · `Place the two of clubs next to the ace of clubs.` · `Aim to place the suits in the order which fits the current layout most naturally.`
- No-hint and dead-end states: `No hint available` · `No hint available right now` · `This game does not have hint support yet.` · `This game is unable to provide a hint.` · `No moves.` · `No moves are possible. Undo or start again.` · `The game has no solution. Undo or start again.` · `I'm not sure`
- Joke hints: `Odessa is a better game.  Really.` · `Have you read the help file?` · `I could sure use a backrub right about now...` · `Look both ways before you cross the street` · `Never blow in a dog's ear` · `Fishing wire makes bad dental floss`
- Options: `Three card deals` · `Single card deals` · `No redeals` · `Unlimited redeals` · `One Suit` · `Two Suits` · `Four Suits` · `Same suit` · `Alternating colors`
- Screen-reader names: cards `ace of clubs` · `ten of hearts` · `king of spades` · `face-down card` · `black joker`; places `stock` · `waste` · `tableau` · `foundation` · `reserve`; a card in a place `%s on tableau` · `%s on foundation` · `%s on stock`
- Errors: `Cannot start the game “%s”` · `Aisleriot cannot find the last game you played.` — `This usually occurs when you run an older version of Aisleriot which does not have the game you last played. The default game, Klondike, is being started instead.` · `A scheme exception occurred` — `Please report this bug to the developers.` — `Don't report` · `Report`

Notes. A hint is one imperative sentence naming both cards in words. Dead ends say what is true and then give two actions (`Undo or start again.`). Full stops are inconsistent across eighty games written by many hands (`No moves.` beside `No hint available`). Tooltips are verb-first fragments without a full stop. Card names for assistive technology are spelled in words, lower case, rank first.

### 35. GNOME Nibbles

- Welcome: `Welcome, worms.` — `Eat the treats before the other worms, but don’t hit anything!` — `Let’s Play`
- Buttons: `New Game` · `Pause` · `Resume` · `Next` · `Next Level` · `Play Again` · `Start`
- Setup: `Number of players` · `Select the number of human players.` · `Select your color` · `Press a key for up.`
- Speeds: `Beginner` · `Slow` · `Medium` · `Fast` · `Beginner with Fakes`
- State: `Paused` · `Level %d` · `Level %d Completed!` · `Game Over!` · `Congratulations!` · `You have completed the game.`
- Score: `%d Point` / `%d Points` · `(%ld more points to reach the leaderboard)`
- Confirmation: `Are you sure you want to start a new game?` — `If you start a new game, the current one will be lost.` — `No` · `Yes`

Notes. One line of character at the door (`Welcome, worms.`), plain everywhere else. The near-miss line under the score gives the exact gap to the next goal.

### 36. KDE KPatience

- Actions: `New Game…` · `New Deal` · `New Numbered Deal…` · `Restart Deal` · `Next Deal` · `Previous Deal` · `Statistics` · `Draw` · `Deal Row` · `Redeal` · `Drop` · `Enable Autodrop` · `Enable Solver` · `Play Sounds` · `Remember State on Exit`
- Keyboard-play actions: `Move Focus to Previous Pile` · `Move Focus to Next Pile` · `Move Focus to Card Below` · `Pick Up or Set Down Focus` · `Cancel Focus`
- HUD: `1 move` / `%1 moves`
- Solver status line: `Solver: Calculating…` · `Solver: This game is winnable.` · `Solver: This game is no longer winnable.` · `Solver: This game cannot be won.` · `Solver: Unable to determine if this game is winnable.` · `Solver: This game is lost.`
- Win: `Congratulations! You have won.` · `Congratulations! We have won.` (when the game finished itself)
- Confirmation: title `Abandon Current Game?` — `A new game has been requested, but there is already a game in progress.` then `A loss will be recorded in the statistics if the current game is abandoned.` — `Abandon Current Game` · Cancel
- Errors: `Error opening file for writing. Saving failed.` · `Unable to create temporary file. Saving failed.` · `XML file is not a KPat save.` · `Unrecognized game id.` · `Downloading file failed: %1`

Notes. A prefix names who is speaking (`Solver:`). The confirm button repeats the dialog title word for word. Error = cause sentence + result sentence. The confirmation names the real cost (a recorded loss), not just "are you sure".

### 37. KDE KMines

- Status bar: `Mines: %1/%2` · `Time: 00:00` · `Time: %1`
- End: title `Game Over` — `Reset or start a new game?` — `New Game` · `Reset Game`; or `Start a new game?` — `New Game`
- Settings tabs: `General` · `Theme` · `Custom Game`

### 38. KDE KBreakOut

- In-play messages: `Press %1 to fire the ball` · `Level %1` · `Game Paused!` · `Oops! You have lost the ball!` · `Game Over!` · `Well done! You won the game` · `Game won!`
- Actions: `Fire the Ball` · `Skip Level` · `Add Life`
- Confirmation: title `New Game` — `Starting a new game will end the current one!` — `Start a New Game` · Cancel
- Setting: `Fire on mouse click` — `Enabling the following option will make the game steal the mouse cursor, pause the game to get the cursor back.`
- First-run question: title `Fire on Click` — `Do you want to fire the ball on mouse click?` then `Answering Yes will make the game steal the mouse cursor, pause the game to get the cursor back.` — `Use Mouse Click` · `Ignore Mouse Click`
- Power-ups ("gifts"), name then the handbook's description: `Add Life Gift` — `Gives the player an additional life.` · `Lose Life Gift` — `Makes the player lose all balls and resets the bar.` · `Enlarge Bar Gift` — `Enlarges the bar.` · `Shrink Bar Gift` — `Shrinks the bar.` · `Split Balls Gift` — `Doubles the balls.` · `Sticky Bar Gift` — `After catching this gift, every time a ball touches the bar it remains attached to it, allowing the player to fire again.` · `Burning Ball Gift` — `Transforms all the balls into burning balls. When a burning ball hits a brick also the bricks to the top, bottom, left and right of it get destroyed. A burning ball destroys all types of bricks regardless of their types.` · `Unstoppable Ball Gift` — `Transforms all the balls into unstoppable balls. An unstoppable ball destroys all bricks it encounters on its path, regardless of their type, and never bounces against them.` · `Magic Eye Gift` — `Shows all hidden bricks.` · `Increase Speed Gift` — `Increases the speed of the ball by 30% of the current speed.` · `Next Level Gift` — `Opens the next level of the game immediately.`

Notes. Power-up names are verb + object (`Enlarge Bar`), so the name is the effect and the simplest descriptions merely restate it (`Enlarges the bar.`). Where a new thing is introduced, the description first says what happens, then defines the new thing in a sentence of its own (`A burning ball destroys…`). In-play messages are exclamatory; `Oops!` softens the lost ball. The dialog text mentions a button ("Answering Yes") that the dialog does not have — the buttons were renamed and the body was not.

### 39. KDE KSnakeDuel

- Start prompts: `Press any of your direction keys to start!` · `The game starts when each player has pressed one of their direction keys!`
- State: `Game paused`
- End: `%1 has won!` · `%1 has won versus %2 with %4 versus %3 points!` · `The game ended with 1 point.` / `The game ended with %1 points.`
- Error: `Failed to load "%1" theme. Please check your installation.`

### 40. Classic Windows games, as cloned by Wine and ReactOS

- WineMine menu: `New` (F2) · `Question Marks` · `Beginner` · `Intermediate` · `Expert` · `Custom...` · `Fastest Times` · `Exit` · `About WineMine`
- WineMine dialogs: `Fastest Times` — `Beginner` · `Intermediate` · `Expert` — `OK` · `Reset Results`; new record: title `Congratulations!` — `Please enter your name` — `OK`; custom game: `Rows` · `Columns` · `Mines`; reset: title `Reset Results` — `All results will be lost. Are you sure?`; default name `Nobody`
- ReactOS Solitaire: menu `Deal` (F2) · `Undo` · `Deck...` · `Options...` · `Exit`; options `Draw One` · `Draw Three` · `Standard` · `Vegas` · `None` · `Show Time` · `Status bar` · `Keep Score`; status `Score: %d` · `Time: %d`; messages `Congratulations, you win!` · `Deal again?` · `Quit the current game?`
- ReactOS Spider: `Easy: One Color` · `Medium: Two Colors` · `Hard: Four Colors` · `New Game` · `Congratulations, you win!` · `Deal again?`

Notes. Menu items of one or two words, Title Case, trailing `...` where a dialog follows. The win is one sentence followed at once by a three-word question. Difficulty as `Grade: what it means`.

### 41. Shattered Pixel Dungeon

- Game menu: `Settings` · `Challenges` · `Rankings` · `Start New Game` · `Main Menu` · `Exit Game` · `Return to Game`
- Item action buttons (all 59 are in capitals): `EAT` · `DRINK` · `READ` · `ZAP` · `USE` · `WEAR` · `CAST` · `BLESS`
- Context actions: `Go Here` · `Interact` · `Attack` · `Pick Up` · `Purchase` · `Trample` · `Examine`
- Confirmations with sentence buttons: `Are you sure you want to delete this save?` — `All progress on this game will be lost` — `Yes, delete this save` · `No, I want to continue`; `You haven't selected two items. Are you sure you want to resurrect without two items?` — `Yes, I'm sure` · `No, let me reconsider`; `Are you sure you want to spend these talent points randomly?` — `Yes, spend them all.` · `Just spend one randomly.` · `I'll decide later.`
- Settings: `Display Settings` · `Fullscreen` · `Brightness` · `Screen Shake` · `Interface Scale` · `Flip Toolbar` · `Quickslot Swapper` — `Shows 3 quickslots with a 'swapper' button if there isn't enough room to display all six quickslots.` · `Music Volume` · `Mute Music` · `SFX Volume` · `Vibration` · `Check for updates` · `Only check on WiFi`; values `Off` · `Low` · `High`
- Key-binding screen: `Press a key to change the first key binding for: _%s_.` · `This key will be unbound from _%s_.` · `This key is already bound to this action.` · `You must have at least one key bound to this action.`
- Onboarding, one string per input device: `Tap a location to move and interact.` · `Use the mouse, WASD, or arrow keys to move and interact.` · `Select a location or use the left stick to move or interact.` · `Hero info is on the top left. Inventory, quickslots, and game actions are below. Good luck!`
- Locked content: `Reach level 6 to unlock more talents.` · `One of the heroes starts with this item.` · `You can buy this item in a shop.`
- Game log: `You descend to floor %d of the dungeon.` · `Your wounds begin to close.` · `That food tasted delicious!` · `You don't know what is there.`
- Loading words: `Descending` · `Ascending` · `Loading` · `Falling!`
- Empty and limits: `That container is empty!` · `There are no alchemizeable items in that bag.` · `Note Limit Reached` — `You can delete existing notes to make room for more.`
- Errors: `Save file not found. If this error persists after restarting, it may mean this save game is corrupted. Sorry about that.` · `Unable to load additional information`
- Item text in three layers: name `ring of haste`; lore `This ring reduces the stress of movement on the wearer, allowing them to run at superhuman speeds. A cursed ring will instead weigh the wearer down.`; stats `When worn, this ring will increase your movement speed by _%s%%._`; a second example: `Each bolt from this wand deals _%1$d-%2$d damage,_ and will briefly empower other wands if it is upgraded.`
- Update notice: `An Update is Available!` — `Go To Update Page`

Notes. A talkative RPG register: second person, full sentences, full stops. Item text is split into lore and stats, with the numbers highlighted (the underscores are highlight marks). Dialog choices are written as the player's own reply. Tutorial text exists once per input device. `Okay` in one dialog, `Confirm` in others.

### 42. Mindustry

- Menu: `Play` · `Settings` · `Quit` · `Save & Quit` · `Continue` · `New Game` · `Back` · `Confirm` · `OK` · `Cancel` · `Abandon` · `Research` · `Reset to Defaults`
- HUD and waves: `Wave {0}` · `Wave {0}/{1}` · `Wave in {0}` · `Wave in progress` · `{0} Enemies Remaining` / `{0} Enemy Remaining` · `Guardian approaching in {0} waves.`
- End and records: `Game Over` · `The {0} team is victorious!` · `New highscore!` · `Waiting for next map...`; stats `Waves Defeated` · `Enemies Destroyed` · `Buildings Built` · `Time Played`
- Notifications: `New content unlocked!` · `{0} researched.` · `{0}% complete` · `Sector {0} under attack!` · `Sector {0} lost!` · `Waves copied.`
- Empty states: `<none>` · `<empty>` · `<none found>` · `No saves found!` · `no players found` · `No enemies defined.`
- Confirmations (31 strings open `Are you sure`): `Are you sure you want to quit?` · `Are you sure you want to delete this save?` · `Are you sure you want to overwrite` then `this save slot?` · `Are you sure you want to clear this data?` then `What is done cannot be undone!`; consequence form: `This zone and all its resources will be lost to the enemy.`
- Errors: `Save file corrupted or invalid!` · `This save is invalid!` · `Failed to import save: {0}`
- Settings, name then description (66 names, 53 with a description): `Auto-Target` — `When enabled, your unit will automatically target and fire at nearby enemies.` · `Pause In Background` — `When enabled, the game will pause when it is not in focus.` · `Linear Filtering` — `When enabled, textures are smoothed. When disabled, textures have a pixelated look.` · `Screen Shake` — `Adjusts the intensity of the screen shake effect from explosions and other events.` · `Max FPS` — `Sets the maximum frames per second the game will run at.` then `Higher values may increase power consumption.` · `UI Scaling` — `Modifies the size of the user interface.` then `Restart required to apply changes.` · `Show Minimap` — `Toggles the visibility of the minimap in the corner of the screen.` · `VSync` — `Synchronizes the game's frame rate with the monitor's` `refresh rate to prevent screen tearing.` · `Fixed Building Timestep` — `...If you don't know what that means, don't touch this option.`
- Onboarding hints (40): `Use [WASD] to move.` · `Scroll to zoom in or out.` · `[Left-click] to shoot.` · `Press [Space] to pause and unpause the game.` · `Right-click and drag to break blocks.` · `To respawn as a ship, press [V].` · `Hold [L-Shift] to fly over obstacles with your current unit.` then `Only a few ground units have boosters.` · mobile twin: `[Double-tap] to manually control friendly units or turrets.` · `Tap and hold a small block or unit to pick it up.` · button `Skip`
- Block and unit descriptions (258 blocks): `Conveyor` — `Transports items forward.` · `Duo` — `Fires alternating bullets at enemies.` · `Copper Wall` — `Protects structures from enemy projectiles.` · `Junction` — `Acts as a bridge for two crossing conveyor belts.` · `Mender` — `Periodically repairs blocks in its vicinity.` then `Optionally uses silicon to boost range and efficiency.` · `Router` — `Distributes input items to all 4 output directions equally.`
- A second, optional "details" layer with character: `Router` — `A necessary evil. Using next to production inputs is not advised, as they will get clogged by output.` · `Lead` — `Dense. Inert. Extensively used in batteries.` then `Note: Likely toxic to biological life forms; not that there are many left here.`
- Ability and stat lines: `Force Field` — `Projects a force shield that absorbs bullets` · `Repair Field` — `Repairs nearby units` · `{0}/sec firing rate` · `{0} health/sec` · `{0} sec cooldown` · `{0}% damage reduction` · `{0} damage` · `{0}x pierce` · `{0} tiles range`

Measured. Setting names: median 2 words, 65 of 66 in Title Case. Setting descriptions: median 12 words, all 53 end with a full stop, 20 open with `When enabled,`, 8 with `Adjusts the`, 4 with `Toggles the`. Block descriptions: median 10 words, all 258 end with a full stop, none uses "you", none has a semicolon; commonest first words `Protects` (25), `Fires` (22), `Stores` (14), `Moves` (12). Hints: median 13.5 words; first words `To` (6), `Hold` (5), `Use` (3), `Press` (3).

Notes. The clearest two-layer model found: a plain "description" for function and an optional "details" for flavour, so humour never gets in the way of the rule. Keys are set in square brackets and highlighted; each hint has a separate mobile twin. Stat lines are number first, unit, then lower-case label. Key names drift (`L-ctrl`, `L-Ctrl`, `L-shift`).

### 43. OpenTTD

- Main menu: `New Game` · `Load Game` · `Play Scenario` · `Game Options` · `Highscore Table` · `Exit`
- Menu items (sentence case): `Land area information` · `Help & manuals` · `Toggle console` · `Screenshot` · `Show frame rate`
- Tooltips (736 strings): `Pause game` · `Fast forward the game` · `Options and settings` · `Zoom in` · `Build railway infrastructure` · `Start a new game. Ctrl+Click skips map configuration` · `Load a saved game` · `Choose graphics settings` · `Select interval between automatic game saves` · `Turn on to play OpenTTD fullscreen mode`
- Status bar: `*  *  PAUSED  *  *` · `AUTOSAVE` · `*  *  SAVING GAME  *  *`
- Settings as `Name: value`, with help text: `Automatically pause when starting a new game: {value}` — `When enabled, the game will automatically pause when starting a new game, allowing for closer study of the map` · `Show tooltips: {value}` with values `Hover for {n} milliseconds` · `Right click` · option values `Off` · `Every 10 minutes` · `Every 30 minutes`
- Confirmations: title `Exit` — `Yes` · `No`; title `Abandon Game` — `Are you sure you want to abandon this game?`
- Errors in two parts, a headline and a lower-case reason: `Can't build railway track here...` + `must remove road first` · `site unsuitable` · `already built` · `flat land required` · `too close to edge of map` · `not enough cash - requires {amount}`
- News: `Citizens celebrate . . .` then `First train arrives at {station}!` · `Bankrupt!` · `New {type} now available!` · `{vehicle} is lost`

Measured. Tooltips: median 8 words; 1 of 736 ends with a full stop; first words `Select` (85), `Show` (44), `Build` (43), `Toggle` (40), `Click` (29), `Open` (29). Setting help texts: 213, median 14 words, 3 end with a full stop. Errors: 369 strings, 134 open with `Can't`, 136 end with `...`, 187 start in lower case (they are the second halves).

Notes. A strict house rule that tooltips and help texts take no final full stop, kept across a thousand strings. The two-part error keeps the headline constant and swaps the reason.

### 44. SuperTux

- Main menu: `Start Game` · `Add-ons` · `Manage Assets` · `Level Editor` · `Options` · `Credits` · `Quit`
- Pause menu: `Continue` · `Restart Level` · `Restart from Checkpoint` · `Abort Level`
- Options: `Fullscreen` — `Fill the entire screen` · `Disable all sound effects` · `Disable all music` · `Setup Keyboard` · `Setup Joystick` · `Press Key` · `Press Button`
- Empty states that give the way out: `No Community Contrib Levels yet. Download them from the Add-ons Menu.` · `No User Contrib Levels yet. Create some with the Level Editor.` · `No Add-ons installed` · `No updates available.` · `No description available.`
- Confirmations: `Do you really want to delete this sector?` · `You are about to delete level "{}". Are you sure?` · `This will delete the auto-save file. Are you sure?` · `This level contains unsaved changes, do you want to save?`
- Notifications: `Level saved!` · `Note: Draggables are now hidden. Press Ctrl+H to show again.`

Notes. The empty-state formula is `No X yet.` + one imperative sentence that names where to go.

### 45. Lichess

- Buttons (sentence case throughout): `Play again` · `New opponent` · `Rematch` · `Resign` · `Offer draw` · `Abort game` · `Claim victory` · `Call draw` · `Confirm move` · `Flip board` · `Retry` · `Next puzzle` · `Continue training` · `New streak` · `Join the race!` · `View best runs`
- States: `Your turn` · `It's your turn!` · `Waiting for opponent` · `Waiting` · `Reconnecting` · `Offline` · `Calculating moves...` · `Game Over` · `Checkmate` · `Stalemate` · `Victory` · `White is victorious` · `Draw by agreement` · `White resigned` · `Game aborted`
- Offer notifications, one family: `Draw offer sent` · `Draw offer accepted` · `White offers draw` · `White declines draw` · `Rematch offer sent` · `Rematch offer declined`
- Puzzle feedback: `Find the best move for white.` · `Good move` · `Best move!` · `Keep going…` · `Success!` · `Puzzle complete!` · `That's not the move!` · `Try something else.`
- Timed mode: `Get ready!` · `Move to start` · `puzzles solved` · `Combo` · `Accuracy` · `Highest solved` · `New daily highscore!` · `New all-time highscore!` · `Previous highscore was %s` · `Play again` · `New run (hotkey: Space)` · `End run (hotkey: Enter)` · `This run has expired!` · `Skip this move to preserve your combo! Only works once per race.`
- Abandonment: `Your opponent left the game. You can claim victory, call the game a draw, or wait.`
- Empty states: `No games found` · `Nothing to show, go play some puzzles first!` · `You have no puzzles in the database, but Lichess still loves you very much.`
- Preferences (sentence case, noun phrases): `Piece animation` · `Board highlights (last move and check)` · `Board coordinates (A-H, 1-8)` · `Move confirmation` · `Promote to Queen automatically` — `Hold the ctrl key while promoting to temporarily disable auto-promotion` · `Show player ratings` — `Hides all ratings from Lichess, to help you focus on the game.` · `Sound when time gets critical` · question form `How do you move pieces?` with answers `Click two squares` · `Drag a piece` · `Either`
- Errors: `Error loading engine` · `Invalid move` · `You need an account to do that` · `Never type your Lichess password on another site!`
- Screen-reader mode: headings `Move list` · `Pieces` · `Game status` · `Last move` · `Your clock` · `Opponent clock` · `Command input form`; commands `Announce current square.` · `Announce last move.` · `Announce possible moves for the selected piece.` · `Move to adjacent square left, right, up or down.`; feedback `Invalid move` · `Premove cancelled` · `Premove recorded: %s. Hit enter to cancel` · `%s copied to clipboard`; spoken vocabulary `white king` · `black knight` · `takes` · `check` · `checkmate` · `promotes to` · `short castling`

Notes. The most consistent sentence-case product in the study. State changes are subject + past participle with no article and no full stop (`Draw offer sent`). Positive feedback takes "!", neutral feedback does not (`Good move` / `Best move!`). A setting label carries its own gloss in brackets. One affectionate empty state in an otherwise plain product.

## Screen-reader text gathered in one place

| Source                                 | What is announced          | Verbatim                                                                                                                |
| -------------------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| NYT Wordle                             | a tile                     | `1st letter, A, correct` · `1st letter, A, present in another position` · `1st letter, A, absent` · `1st letter, empty` |
| hello wordl                            | a tile                     | `A: correct` · `A: elsewhere` · `A: no`                                                                                 |
| PROXX                                  | a cell                     | `hidden` · `flag` · `black hole` · `blank` · `3`                                                                        |
| PROXX                                  | a mode change              | `flag mode on` · `flag mode off`                                                                                        |
| PROXX                                  | the board                  | `The game grid`                                                                                                         |
| Grid Games                             | a cell's place             | `Row $r Column $c, Group $g`                                                                                            |
| Grid Games                             | an event                   | `That's a match.` · `Unmatched cards turned back.` · `Game is ready to play.`                                           |
| Grid Games                             | a rule answer              | `{0} is not shown in this row, column, or group.`                                                                       |
| AisleRiot                              | a card                     | `ace of clubs` · `face-down card`                                                                                       |
| AisleRiot                              | a card in a place          | `%s on tableau` · `%s on foundation`                                                                                    |
| Lichess                                | a move, in words           | `white king` · `takes` · `check` · `promotes to`                                                                        |
| Lichess                                | feedback                   | `Invalid move` · `Premove recorded: %s. Hit enter to cancel`                                                            |
| NYT Connections                        | a solved group             | `Correct group ` + the group                                                                                            |
| NYT Spelling Bee                       | progress marker            | `Achieved rank marker ...` / `Not achieved rank marker ...`                                                             |
| Xbox guideline 106 (examples it gives) | a control                  | `Worlds, Tab, 1 of 3, selected` · `Music Volume, slider, 52%`                                                           |
| Xbox guideline 114 (example it gives)  | a tooltip with a key glyph | `Left mouse button for show spider preview`                                                                             |

Notes. Position first, then content, then state — comma-separated, lower case, no full stop. State words are the plainest available (`absent`, `hidden`, `blank`, `no`). Symbols and ranks are spelled out (`ace of clubs`, `Left mouse button`). Whole-sentence announcements appear only for events, not for cells.

---

# Part 2 — Patterns

Counts are over the strings quoted or parsed in Part 1. "Games" means the game sources that have a string of that kind, so the denominators differ from kind to kind.

## Buttons and menu items

Pooled sample: 311 labels from 24 game sources, 235 distinct.

- **Length.** 1 word: 81. 2 words: 112. 3 words: 38. 4 words: 4. So 82% are one or two words and 98% are three or fewer. The four-word ones are all desktop menu items (`Remember State on Exit`, `Restart from Checkpoint`).
- **Shape.** About 7 in 10 open with a verb: bare verb (`Undo`, `Pause`, `Shuffle`, `Resign`) or verb + object (`Reset Puzzle`, `Deal Row`, `Flip board`, `Offer draw`). Most of the rest are `New` / `Next` + noun (`New Game`, `Next Level`) or a place to go (`Settings`, `Statistics`, `Main Menu`). Articles are dropped: `Fire the Ball` and `Start a New Game` (both KBreakOut) are the exceptions.
- **Case.** Of the 26 games with multi-word buttons: Title Case in 17 (GNOME Mines, GNOME Sudoku, AisleRiot, Nibbles, KPatience, KMines, KBreakOut, Tatham, Wine/ReactOS, Shattered Pixel Dungeon, Mindustry, SuperTux, Techmino, Antimine, Sudoku.com, Connections, Grid Games — the last four with a stray sentence-case label or two). Sentence case in 3 (Lichess, Open Sudoku, PROXX) plus 2 mixed (2048: `New Game` beside `Try again`; OpenTTD: Title Case main menu, sentence-case menu items). All capitals in 4 (the three arcade ROMs and Hextris) — and in one sub-set elsewhere: all 59 of Shattered Pixel Dungeon's item action buttons (`EAT`, `ZAP`).
- **Punctuation.** No label ends with a full stop (0 of 235). Two end with "!" (`Join the race!`, `SHARE MY SCORE!`). Twelve end with an ellipsis, all in desktop menus where a dialog follows (`Custom...`, `Select Game…`); no web or mobile game does this.
- **The commonest labels.** `New Game` (8 games), `Cancel` (7), `OK` (5), `Continue` (5), then `Restart`, `Undo`, `Exit`, `Quit`, `Close`, `Start` (4 each), `Play Again` (3 in that exact case, 5 counting `Play again`).
- **Shortcut shown in the label.** Three games: Techmino `Resume (esc)`, Lichess `New run (hotkey: Space)`, hello wordl `(Enter to play again)`. Always in brackets after the label.
- **Tone.** Neutral. The only buttons with any voice are an invitation at the door (`Let’s Play`, `Tap to Begin`) and Shattered Pixel Dungeon's replies (`I'm not done yet`).

## HUD labels and status lines

- **Length.** One word, occasionally two: `Score`, `Best`, `Time`, `Mines`, `Mistakes`, `Lines`, `Combo`, `Max Combo`, `Speed Level`.
- **Label and value.** Desktop status bars write `Label: value` with a colon: `Score:`, `Time: 00:00`, `Mines: %1/%2`, `Marked: %d / %d`, `Stock left: ~a`, `Mistakes Remaining:`. Web and mobile HUDs stack the label over the value and drop the colon (2048, Sudoku.com, PROXX, Techmino). No game does both.
- **Progress as a fraction.** `0/3`, `%1/%2`, `Wave {0}/{1}`. "of" is never spelled out on screen (it is in screen-reader text: `1 of 3`).
- **Counters as noun + number.** `Level %1`, `Wave {0}`, `Stage `, `Player %d`. Countdown as `Wave in {0}`.
- **Remaining things.** `{0} Enemies Remaining`, `Stock left:`, `Redeals left: ~a`, `Cards remaining: ~a`, `%d mines`. "left" and "remaining" are both common; each game picks one — except AisleRiot, which has both.
- **Plurals.** Handled properly in every string file read: `1 move` / `%1 moves`, `%d mine` / `%d mines`, `{0} Enemy Remaining` / `{0} Enemies Remaining`, `%d Point` / `%d Points`. None prints "1 moves" or "move(s)".
- **Case.** Title Case or a single capitalised word; all capitals only in arcade games.

## Settings: names and descriptions

- **Names.** One to three words (Mindustry's 66 names: median 2, longest 6). Title Case in most games (65 of Mindustry's 66; Wordle; Shattered Pixel Dungeon; Techmino; GNOME Sudoku's switches). Sentence case in Lichess, Open Sudoku, OpenTTD and Tatham. A name is either the thing (`Screen Shake`, `Music Volume`, `Piece animation`) or verb + thing for a switch (`Show Minimap`, `Highlight Matching Numbers`, `Pause When Unfocused`, `Remember State on Exit`). `Show …` and `Highlight …` are the commonest switch verbs; `Enable …` appears in GNOME, KDE and Antimine.
- **Positive phrasing.** Nearly all switches are named for what happens when on. The negatives found: `Mute Music`, `Mute SFX` (Shattered Pixel Dungeon), `Disable all sound effects`, `Disable all music` (SuperTux), `Hide Navigation Bar`.
- **Descriptions.** One sentence, sometimes two; Mindustry's 53 have a median of 12 words and OpenTTD's 213 a median of 14. Three formulas cover almost everything:
  - `When enabled, ` + what the game does (20 of Mindustry's 53; also OpenTTD). Only 2 of those 20 go on to say what "disabled" does.
  - Third-person verb for a value: `Adjusts the …`, `Sets the …`, `Toggles the …`, `Displays the …`, `Shows …` (18 of Mindustry's 53; also NYT Wordle's `Displays the timer…`, Open Sudoku's `Highlights row and column…`).
  - A plain statement of the rule the setting imposes (Wordle: `Any revealed hints must be used in subsequent guesses`; hello wordl: `Guesses must be valid dictionary words.`).
- **A second sentence is for a side-effect or advice**, never for more mechanism: `Higher values may increase power consumption.` · `Restart required to apply changes.` · `Most helpful for users using speech recognition or other assistive devices.`
- **Full stop.** No agreement. Mindustry: all 53 have one. OpenTTD: 3 of 213. NYT Wordle: none on one-sentence descriptions, full stops on the two-sentence one. Open Sudoku: mixed within one file.
- **Option values.** One word, capitalised: `Off` / `Low` / `High`; `Easy` / `Medium` / `Hard`; `Slow` / `Medium` / `Fast`. Timed values are written out: `Every 10 minutes`.
- **Difficulty names.** `Easy`, `Medium`, `Hard` in 5 games (GNOME Sudoku, Open Sudoku, Sudoku.com, PROXX, ReactOS Spider); `Beginner`, `Intermediate`, `Expert` in the Minesweeper family (WineMine, Antimine); above "Hard" every game invents its own (`Very Hard`; `Expert`, `Master`, `Extreme`; `Master`, `Legend`; `Ultra Hard`; `Unreasonable`).
- **Explaining an option inside its label.** Three sources: Tatham `Jigsaw (irregularly shaped sub-blocks)`, ReactOS Spider `Easy: One Color`, Lichess `Board coordinates (A-H, 1-8)`.

## Tooltips

- OpenTTD is the only game read with a large tooltip set (736): median 8 words, verb first (`Select` 85, `Show` 44, `Build` 43, `Toggle` 40, `Click` 29, `Open` 29), sentence case, and 1 of 736 ends with a full stop. A second fact is added as a second sentence, still without a final stop: `Start a new game. Ctrl+Click skips map configuration`.
- AisleRiot's menu tooltips and GNOME's shortcut descriptions follow the same shape: `Undo the last move`, `Get a hint for your next move`, `Pause the game` — imperative, article kept, no full stop, 3–7 words.
- A tooltip restates its button with the article and object restored: button `Undo Move` → tooltip `Undo the last move`; button `Hint` → `Get a hint for your next move`.

## Item, upgrade and power-up descriptions

Eleven sets measured (about 970 descriptions and 580 stat lines).

| Set                             | n             | Median words | End with full stop | Use "you/your" | Shape                           |
| ------------------------------- | ------------- | ------------ | ------------------ | -------------- | ------------------------------- |
| Balatro jokers                  | 150           | 11           | 0                  | 12             | number first, fragment          |
| Slay the Spire cards            | 75            | 10           | 74                 | 37             | imperative sentences            |
| Slay the Spire relics           | ~180          | 10           | ~170               | ~115           | trigger, then imperative        |
| Hades (Zeus boons)              | 21            | 10           | 21                 | 21             | "Your X does Y." + stat line    |
| Vampire Survivors weapons       | 192           | 7            | 192                | 4              | third-person verb, no subject   |
| Vampire Survivors passives      | 31            | 6            | 29                 | 2              | third-person verb + number      |
| FTL augments                    | 32            | 12           | 32                 | 7              | formal full sentence            |
| Mindustry blocks                | 258           | 10           | 258                | 0              | third-person verb, no subject   |
| Brotato items (lines)           | 580           | 3            | 2                  | 45             | `±N Stat` per line              |
| Downwell upgrades               | 16 of 20 read | 6            | 0                  | 0              | lower-case fragment             |
| KBreakOut gifts (handbook text) | 16            | 11           | 16                 | 0              | third-person verb, "the player" |

- **Length.** The medians for in-game descriptions sit between 6 and 12 words. The longest single description in Balatro is 20 words, in Slay the Spire cards 16, in Vampire Survivors 16, in FTL 22. One line, sometimes two.
- **Three grammars**, each kept strictly within a game:
  1. **Number-first fragment** — `+4 Mult`; `+30 Chips for each remaining discard`; `+5 % Dodge`. No verb, no full stop. (Balatro, Brotato, Into the Breach's upgrade names.)
  2. **Imperative to the player** — `Deal 6 damage.`; `Gain 5 Block.`; `Fire two projectiles in opposite directions`. Full stop. (Slay the Spire, Into the Breach.)
  3. **Third-person verb with the item as the unspoken subject** — `Fires at the nearest enemy.`; `Transports items forward.`; `Enlarges the bar.`; `Adds when destroyed.` Full stop. (Vampire Survivors, Mindustry, KBreakOut, Luck be a Landlord, FTL in part.) This is the commonest of the three: 5 of the 11 sets.
  - Hades is a fourth, used by it alone here: second-person possessive subject, `Your Dash causes…`.
- **Full stop follows grammar, not game genre.** Sentences take one (8 sets, 93% or more within each, 100% in five of them); number-first fragments and lower-case fragments never do (3 sets, 2 of about 750 lines).
- **Conditions.** The effect comes first and the condition second when the effect is a number (`+8 Mult if played hand contains a Pair`; `+25% damage if there are no enemies near you`); the trigger comes first when the item is a rule (`Whenever you take damage, deal 3 damage back.`; `At the start of each combat, …`; `When Blind is selected, …`). Slay the Spire's relics open with `Whenever` (37), `At the start of` (25), `Every` (11), `Upon pick up` (10).
- **Fixed vocabulary.** Each game holds a small set of verbs and timing phrases and never varies them: Slay the Spire `Deal` / `Gain` / `Apply` / `Draw` / `Exhaust`; Balatro `when scored` / `held in hand` / `at end of round`; Luck be a Landlord `Adds` / `Gives` / `Destroys`. Vampire Survivors is the counter-example (`Raises`, `Augments`, `Increases` for one operation).
- **Keywords.** Capitalised (`Block`, `Vulnerable`, `Mult`, `Chips`, `Cast`, `Jolted`, `Smoke`), defined once elsewhere, never explained in the description. Slay the Spire lets a keyword stand as a whole sentence (`Exhaust.`).
- **Numbers.** Always numerals. Sign shown when the number is a change to a stat (`+4`, `-5 Chips`, `+10%`); no sign when it is an amount done (`Deal 6 damage.`). Multipliers `X3` (Balatro), `3x more` (Luck be a Landlord), `{0}x` (Mindustry). Odds as `1 in 4` (Balatro) or `10% chance` (Luck be a Landlord, Brotato, FTL). Durations as `10 seconds` (Vampire Survivors), `15 Sec.` (Hades), `2.5 sec` (Dead Cells), `{0} sec` (Mindustry). Percent as `%` everywhere except FTL (`10 percent`, 12 times).
- **Trade-offs.** Benefit first, cost second: `+100 Chips` then `-5 Chips for every hand played`; `Lose 3 HP. Gain 2 Energy.` is the one family that puts the cost first, because it resolves first; `…, but reduces scrap collected by 15 percent.`
- **Limits as a trailing fragment.** `Single-use.` · `2 uses per battle.` · `(Must have room)` · `self destructs`.
- **Where the numbers live.** Three models: in the sentence (Slay the Spire, Balatro, FTL); on a separate labelled line under a number-free sentence (Hades: `Lightning Damage: 30`; Mindustry: `{0} damage`, `{0}/sec firing rate`); in a separate stats panel (Vampire Survivors weapons — only 9 of 192 descriptions contain a digit).
- **Names.** One to three words, Title Case. Either the effect itself (`Enlarge Bar`, `+1 Damage`, `Gem Attractor`, `Auto-Target`) or a joke or image that the description then plays straight (`Oops! All 6s`, `Mr. Bones`, `Knife and Fork`, `Pummarola`). Humour lives in the name; the effect line is dry. Counted exceptions where the description itself jokes: 2 of 20 in Downwell, 1 pickup in Vampire Survivors, Mindustry's separate "details" layer, FTL's `Damaged Stasis Pod`.

## Notifications and toasts

- **Length.** 2–5 words. Wordle's four: 3, 4, 4 and 2 words. Connections: 2 and 2. Spelling Bee's five errors: 2–4. Lichess's offer family: 3–4.
- **Confirmation formula:** thing + past participle, no article, no auxiliary: `Draw offer sent` · `Premove cancelled` · `Waves copied.` · `Level saved!` · `Settings exported!` · `{0} researched.` · or participle first: `Copied results to clipboard`. The longer form with an auxiliary (`Puzzle has been updated`, `A mine has been revealed`) appears in two Android games only.
- **Rejection formula:** `Not` / `No` / `Too` / `Already` + two or three words, stating the fact, never the player's fault: `Not enough letters` · `Not in word list` · `Too short` · `Already found` · `Already guessed!` · `Invalid move` · `No hint available`. None says "You must…" or "Please…".
- **Near miss:** `One away...` (Connections) — the only toast found that reports how close a wrong answer was.
- **Punctuation.** Rejections: no terminal punctuation in the NYT games and Lichess. Confirmations: split between nothing (NYT, Lichess), "!" (SuperTux, Antimine, hello wordl, Mindustry's unlock) and a full stop (Mindustry's `Waves copied.`).
- **Case.** Sentence case in every game, including the ones with Title Case buttons.
- **Warnings about what is coming:** `Guardian approaching in {0} waves.` · `Sector {0} under attack!` — subject + state, a number where there is one.

## Combo and praise call-outs

- **One word, or a short name.** Wordle's six, Connections' five, Spelling Bee's four and Candy Crush's four are all single words (the last rungs `Next Time` and `Sugar Crush` are two). Peggle's eleven and the Tetris family's are two- or three-word names.
- **Two kinds of ladder.**
  - _Grade words_, rising in warmth: `Good!` → `Nice!` → `Awesome!` → `Pangram!`; `Sweet` → `Tasty` → `Delicious` → `Divine`; `Phew` → `Great` → `Splendid` → `Impressive` → `Magnificent` → `Genius`.
  - _Names for the feat_: `Double`, `Tetris`, `T-Spin Double`, `Back-to-Back`, `Perfect Clear`; `Long Shot`, `Off The Wall`, `Kick the Bucket`. These tell the player what they did, so they also teach.
- **Ladder length.** 4 to 6 rungs for feedback in play (4, 4, 5, 6); 10 for a slow-moving rank (Spelling Bee).
- **Escalation by prefix.** `Super Long Shot`, `Crazy Mad Skills`, `Mini T-Spin`, `B2B `, `New all-time highscore!` — stack a modifier rather than invent a new word.
- **Shared vocabulary.** `Great` appears in 4 games, `Awesome` in 3, `Genius`, `Phew`, `Solid`, `Perfect` and `Nice` in 2 each.
- **The lowest rung is still kind.** `Phew`, `Good!`, `Good Start`, `Beginner`, `Next Time`. No ladder read here has an insult or a "Bad".
- **Punctuation.** Spelling Bee, Techmino, Lichess and Sudoku.com put "!" on praise; Wordle and Connections do not. Numbers ride alongside rather than inside: `+{n}` (2048), points beside the Spelling Bee word, `$1 lines` (Techmino).
- **Themed vocabulary** only in Candy Crush (food words) and Spelling Bee (`Queen Bee`, `hive`). The rest use plain praise.

## Pause

Eight games show a pause string. All eight use the word itself: `Paused` alone (GNOME Mines, GNOME Sudoku, Nibbles), `< Paused >` (Mindustry), `Game paused` (KSnakeDuel), `Game Paused!` (KBreakOut), `*  *  PAUSED  *  *` (OpenTTD), `Pause` as a menu title (Techmino). No pause screen carries a sentence. The way back is `Resume` in 4 games (GNOME Mines, Nibbles, Antimine, Techmino), `Continue` in 1 (SuperTux) and `Return to Game` in 1 (Shattered Pixel Dungeon). The pause menu's other items are the same three everywhere: restart (`Restart Level`, `Retry (R)`, `Start Over`), settings, and leave (`Quit`, `Main Menu`, `Abort Level`, `Save & Quit`).

## Win, level clear and new record

Eighteen games have a win string.

- **"You win" / "You won" / "you have won"** in 10: `You win!` (2048, PROXX), `You won!` (Antimine, hello wordl), `You Won` (Techmino), `Congratulations, you win!` (ReactOS), `Congratulations, you have won!` (AisleRiot), `Congratulations! You have won.` (KPatience), `Well done! You won the game` (KBreakOut), `You won the game in {0} goes.` (Grid Games).
- **"Congratulations"** in 7 (AisleRiot, KPatience, ReactOS Solitaire and Spider, WineMine, Open Sudoku, Nibbles, Grid Games) — every one of them a desktop or older mobile game. No web game read here uses the word in its win line.
- **"Well done"** in 3 (GNOME Sudoku, KBreakOut, Open Sudoku).
- **A bare state word** in 3: `COMPLETED!`, `Victory`, `Win!`.
- **Length.** Headline of 1–5 words. Where there is more, it is one further sentence carrying the measure: `You found %1$d mines in %2$d seconds.` · `…you completed the puzzle in %d minutes!` · `You won the game in {0} goes.` Five of the eighteen state a time, a count or a score in words (GNOME Sudoku, Open Sudoku, Antimine, Grid Games, KSnakeDuel); PROXX and 2048 show it as labelled numbers (`Score`, `Best`) instead.
- **Exclamation mark.** Every one of the eighteen has a win line with one, though two also have a variant without (`Victory`, `You Won`). Never more than one per sentence, never "!!".
- **Level clear:** `Level %d Completed!` (Nibbles) · `Stage $1 cleared!` (Techmino) · `Level %1` shown again for the next one (KBreakOut) · `Puzzle complete!` (Lichess). Noun + number + participle.
- **New record:** `New high score!` (PROXX) · `New highscore!` (Mindustry) · `New daily highscore!` (Lichess) · `New Record!` (Techmino) — "New" + noun + "!" in 4 of the 6 games that announce one. It replaces the win headline in PROXX rather than adding to it. Lichess follows with `Previous highscore was %s`; Nibbles reports the shortfall, `(%ld more points to reach the leaderboard)`.
- **The next action.** `Play Again` / `Play again` is the label in 5 games (GNOME Mines, GNOME Sudoku, Nibbles, PROXX, Lichess); ReactOS asks `Deal again?`; Grid Games asks `Would you like to play another game?`.

## Loss

Nineteen games have a loss string.

- **"Game over"** in 12 of 19 (2048, KMines, KBreakOut, Nibbles, Sudoku.com, Mindustry, Lichess, Techmino, Hextris, Pac-Man, Galaga, Asteroids). With "!" in 3 of those 12.
- **The other seven:** `You lost!` (Antimine, hello wordl), `DEAD!` (Tatham), `Next Time` (Connections), `There are no more moves` (AisleRiot), `Solver: This game is lost.` (KPatience), `Nice try, but a resting frog got swept up with the leaves!` (Grid Games).
- **The cause is stated in 5 of 19**, always as a plain fact with a number where one exists: `You have made 3 mistakes and lost this game` · `There are no more moves` · `You're out of guesses.` · `Oops! You have lost the ball!` · the frog line.
- **The answer is revealed** where there is one: `The answer was {WORD}.`
- **A next action is on the same surface in at least 7**, as one or two buttons: `Try again` (2048, PROXX), `New Game` / `Reset Game` (KMines), `Second Chance` / `New Game` (Sudoku.com), `Main menu` (PROXX), or inside the sentence: `Undo or start again.` (AisleRiot), `(Enter to play again)` (hello wordl).
- **Consolation is rare and brief:** `Good luck on your next game.` (Antimine) · `Tomorrow's a new day, with a new puzzle. See you then.` (Connections) · `Nice try, but …` (Grid Games). 3 of 19.
- **No game blames the player** or uses a negative judgement word ("failed", "wrong", "bad"). The strongest word found is `DEAD!`.
- **Losing a life**, as distinct from losing the game, has its own softer line in the one game that shows it: `Oops! You have lost the ball!`

## Confirmation dialogs

Fifteen games have one.

- **Question form.** `Are you sure you want to …?` in 9 (Shattered Pixel Dungeon 10 strings, Mindustry 31, OpenTTD 16, Open Sudoku 5, Nibbles, KPatience, SuperTux, WineMine, Antimine). `Do you want to …?` in 5 (GNOME Mines, Antimine, Spelling Bee, KBreakOut, SuperTux). A bare short question in 3: `Quit the current game?` (ReactOS) · `Reset or start a new game?` (KMines) · `Abandon Current Game?` as a title (KPatience).
- **Consequence stated** in 10 of 15, as a second sentence in the future passive: `…your current progress will be lost.` (GNOME Mines, Antimine) · `…the current one will be lost.` (Nibbles) · `Current game progress will be lost` (Sudoku.com) · `All progress on this game will be lost` (Shattered Pixel Dungeon) · `All results will be lost.` (WineMine) · `A loss will be recorded in the statistics if the current game is abandoned.` (KPatience) · `If you do you will no longer be able to enter words.` (Spelling Bee) · `What is done cannot be undone!` (Mindustry). "will be lost" is the stock phrase: 7 of the 10.
- **Buttons.** The button labels could be read for 9 of the 15. Named for the outcome in 5 (`Keep Current Game` / `Start New Game`; `Abandon Current Game`; `Start a New Game`; `New Game` / `Reset Game`; `Yes, delete this save` / `No, I want to continue`), and likewise in the error dialogs of GNOME Sudoku (`Play Anyway` / `Back`) and AisleRiot (`Report` / `Don't report`). `Yes` / `No` in 3 (OpenTTD, Nibbles, Antimine). `OK` / `Cancel` in 1 (Sudoku.com). The outcome-named ones are all GNOME, KDE or Shattered Pixel Dungeon — the three with a house style.
- **Length.** Question: 5–10 words. Consequence: 6–12 words. Nothing longer than two sentences except KPatience (two sentences, 30 words).
- **"Don't ask me again"** appears in 2 (Sudoku.com as a checkbox; KBreakOut's first-run question remembers the answer).

## Errors

- **State the rule that was broken** (the commonest for input errors): `Width and height must both be greater than two` · `{1st} letter must be {A}` · `Hard mode can only be enabled at the start of a round` · `You must have at least one key bound to this action.` · `Valid Sudoku puzzles have exactly one solution.` Modal "must" + the rule; the subject is the thing, not "you", in 4 of these 5.
- **Cause, then result** for system errors: `Error opening file for writing. Saving failed.` · `Unable to create temporary file. Saving failed.`
- **What is wrong, then what to do:** `The puzzle you have entered is not a valid Sudoku.` + `Please enter a valid puzzle.` · `Failed to sign in. Please check your network connection and try again.` · `Failed to load "%1" theme. Please check your installation.` · `No moves are possible. Undo or start again.`
- **Headline plus swappable reason** (OpenTTD only): `Can't build railway track here...` + `must remove road first`. 134 headlines open with `Can't`.
- **Opening words for failure.** `Failed to …` (Mindustry, Antimine, KSnakeDuel), `Unable to …` (KPatience, Shattered Pixel Dungeon), `Cannot …` (AisleRiot), `Can't …` (OpenTTD), `Error …` (KPatience, Lichess), `Invalid …` (Lichess, Open Sudoku, hello wordl). No two games agree, but each is consistent within itself.
- **"Please"** appears in errors, name-entry prompts and setup instructions (about twenty strings across ten games, most of them "Please report…", "Please check…", "Please enter…"). It is never on a button or a toast, and it is in a play hint once (AisleRiot's `Please fill in empty pile first.`).
- **Apology** appears twice, both for a fault that is the software's: `Sorry about that.` · `Sorry, an error occurred.`
- **Length.** One sentence of 4–10 words, or two short ones. Full stop when there are two sentences; otherwise mixed.
- **Tone.** Flat. The exclamatory exceptions are Mindustry (`Save file corrupted or invalid!`) and Antimine (`Proportion is too high!`).

## Empty states

Sixteen found. Eight are `No` + noun, 2–4 words: `No puzzles` · `No games found` · `No saves found!` · `No Data` · `No hint available` · `No updates available.` · `No Add-ons installed` · `No enemies defined.` Four are stand-ins for a missing value: `N/A`, `<empty>`, `<none>`, `Nobody`. One is a plain statement (`That container is empty!`). Three add the way out, and those are the ones worth copying: `No User Contrib Levels yet. Create some with the Level Editor.` · `Nothing to show, go play some puzzles first!` · `You haven’t started this puzzle yet.` + `Can you get to Genius?` The word "yet" marks an empty state as temporary in 3 of the 16.

## Onboarding hints and how-to-play

- **Length.** One sentence. In-play prompts: 5–9 words (`Press %1 to fire the ball` · `Tap a location to move and interact.` · `Select a cell, then tap a number to fill in the cell` · `Press any of your direction keys to start!`). Mindustry's 40 hints run longer (median 13.5 words, longest 34) and are the longest in-play hints read. George Fan's stated ceiling is eight words on screen at once.
- **Grammar.** Imperative, verb first, input named: `Use`, `Press`, `Hold`, `Tap`, `Click`, `Select`, `Scroll`, `Drag`. When the goal is not obvious, goal first: `To respawn as a ship, press [V].` · `To transfer items, drag from your ship to the core.` (6 of Mindustry's 40 open with `To`).
- **Then the consequence in a second clause or sentence:** `When two tiles with the same number touch, they merge into one!`
- **The whole game in one line** is common at the top of casual games: `Join the numbers and get to the 2048 tile!` · `Guess the Wordle in 6 tries.` · `Group words that share a common thread.` · `Create words using letters from the hive.` · `Eat the treats before the other worms, but don’t hit anything!` — imperative, 6–12 words, goal and constraint.
- **One string per input device** in Shattered Pixel Dungeon and Mindustry (`.mobile` twins); a single keyboard-only string in 2048, KBreakOut and KSnakeDuel.
- **Hints during play** (AisleRiot): one imperative naming both things, `Move ~a onto the foundation.`; softer verbs when the game is unsure, `Try …`, `Consider …`.
- **A way to skip:** `Skip` (Mindustry), `First launch hints` as a setting (Open Sudoku), `Do you know how to play minesweeper?` + `Open Tutorial` (Antimine).

## How keys, buttons and gestures are named

- **Verb.** `Press` for keys in 7 games (Mindustry, KBreakOut, KSnakeDuel, SuperTux, Shattered Pixel Dungeon, Techmino, Nibbles). `Push` in the arcade ROMs. `Hit` in Wordle and Lichess. `Hold` for held keys, `Tap` and `Tap and hold` for touch, `Click` and `Right-click and drag` for the mouse.
- **Key names.** Capitalised and set apart: `[Space]`, `[WASD]`, `[V]` in highlighted square brackets (Mindustry); `Ctrl+H`, `Ctrl+Click` (SuperTux, OpenTTD); bare `Enter`, `Space` (hello wordl, Lichess); `(esc)`, `(R)` after a label (Techmino). Lower-case and described in Wordle (`the enter button`) and Lichess (`the ctrl key`).
- **Groups of keys** by what they are: `arrow keys`, `direction keys`, `WASD`, `the left stick`.
- **Arcade controls** by their cabinet label, as a noun: `PUSH ROTATE`, `PUSH HYPERSPACE`, `PUSH START BUTTON`.
- **Xbox** requires controller prompts to use its exact names (XR-022), and its narration example spells a glyph out in words (`Left mouse button`).

## Screen-reader text

- **Order.** Position, content, state: `1st letter, A, correct` · `Row $r Column $c, Group $g` · `%s on tableau`. Xbox guideline 106 gives the general order: name, role, value or state, index.
- **Form.** Lower-case words joined by commas or a colon, no terminal full stop, 1–6 words. State is one plain word: `correct`, `absent`, `hidden`, `blank`, `flag`, `empty`, `no`, `Matched`.
- **Spelled out.** Ranks and suits in words (`ace of clubs`), ordinals (`1st`), symbols and glyphs (`Left mouse button`), chess notation (`takes`, `promotes to`).
- **Events are short sentences** with a full stop: `That's a match.` · `Unmatched cards turned back.` · `Game is ready to play.` · or bare state changes: `flag mode on`.
- **Names for icon buttons** say the action, not the picture: `Back to main menu`, `Open information and settings`; PROXX's `close button` repeats the role and is the odd one out.
- **The visible toast and the announcement are the same string** in hello wordl (`role="alert"` on the status line) and NYT Wordle; neither writes a separate, wordier version for the screen reader.

## Consistency: one thing, several names

| Thing               | Names found inside a single game                                                           |
| ------------------- | ------------------------------------------------------------------------------------------ |
| Begin a game        | GNOME Mines: `Play Game`, `Play Again`, `Start Over`, `Start New Game`, `Start a new game` |
| Begin a game        | Antimine: `Start`, `New Game`, `Retry`, `Tap to Begin`                                     |
| Go on               | Antimine: `Continue`, `Resume`                                                             |
| Accept              | Shattered Pixel Dungeon: `Okay`, `Confirm`, `Yes`                                          |
| Dark appearance     | NYT Wordle: `Dark Theme`, `Dark Mode`                                                      |
| Increase a stat     | Vampire Survivors: `Raises`, `Augments`, `Increases`                                       |
| Seconds             | Dead Cells: `sec`, `seconds`                                                               |
| A modifier key      | Mindustry: `L-ctrl`, `L-Ctrl`                                                              |
| The game's own name | Open Sudoku: `sudoku`, `Sudoku`                                                            |
| Things remaining    | AisleRiot: `Stock left:`, `Cards remaining:`                                               |

The games that avoid this have a written house style (GNOME, KDE, OpenTTD's translators' rules) or a single author with a template (Balatro, Slay the Spire, Lichess).

---

# Register by genre

**Casual puzzle (Wordle, Connections, Spelling Bee, 2048, Sudoku apps, Minesweeper apps, solitaire).**

- Fewest words of any genre: 2048 ships with under 40 words; Wordle's game copy is four toasts and six praise words.
- Sentence case for anything that is a message; Title Case or sentence case for buttons depending on platform heritage (desktop and Android: Title Case; web-native: sentence case).
- Calm and adult. Rejections are flat facts with no punctuation (`Not in word list`). Praise is one warm word. At most one exclamation mark per screen, kept for the win.
- Second person appears only at the end (`You win!`, `You have made 3 mistakes…`), not during play.
- Loss is softened or reframed (`Next Time`, `Good luck on your next game.`), and the answer or cause is given.
- Numbers are plain and exact: `6 tries`, `0/3`, `in %d minutes`.
- A little character is allowed at the edges — the lowest praise rung, an empty state, a welcome line — and nowhere else.

**Arcade and action (ROM classics, Tetris family, Hextris, KBreakOut, Peggle, Vampire Survivors).**

- States, not sentences: `READY!`, `GAME OVER`, `STAGE 1`, `PAUSED`, `PERFECT !`. One to three words.
- All capitals in the originals and in games that quote them; Title Case with "!" in modern ones (`Game Over!`, `New Record!`, `Stage $1 cleared!`).
- More exclamation marks than any other genre, but still one per string.
- Prompts are commands with the control named (`PUSH START BUTTON`, `Press %1 to fire the ball`).
- Call-outs are names for feats, built from parts (`Mini T-Spin Double`, `Super Long Shot`).
- No "you" outside the high-score screen. No "please" outside name entry.
- Item text, where there is any, is a verb phrase of about seven words describing behaviour, with numbers kept in a panel.

**Deck, upgrade and build games (Balatro, Slay the Spire, Hades, Brotato, FTL, Into the Breach, Luck be a Landlord, Mindustry).**

- A rules register: fixed verbs, capitalised keywords, numerals, and the same clause order every time. Closer to a card game's templating than to prose.
- Dry on purpose. Jokes go in names or in a separate flavour layer; the effect line never jokes.
- Around 10 words per description, one or two lines, each sentence one effect.
- Punctuation is a function of grammar: sentences end with a full stop, stat fragments do not, and a game does not mix the two within one kind of item.
- Settings and menus in the same games are ordinary Title Case app text; the special register is confined to the items.

---

# What the style guides say

Each rule is quoted or closely paraphrased from a page fetched in this session.

## Brevity and plain words

1. "Shorter is always better." "Use bigger ideas, fewer words." — Microsoft Writing Style Guide, top 10 tips.
2. "Try to find the fewest possible words to satisfactorily convey the necessary meaning. However, do not shorten text to the point of losing meaning. A three-word label that provides clear information is better than a one-word label that is ambiguous or vague." — GNOME HIG.
3. "Make it as short as possible without losing meaning or precision." "Front-load the most important information in longer text." "Anything longer than 'Configure Keyboard Shortcuts' in an interactive control is too long." — KDE HIG.
4. "Check each word to be sure it needs to be there. If you can use fewer words, do so. When in doubt, read your writing out loud." — Apple HIG, Writing.
5. "Aim for as straightforward language as your copy style allows", for example "Click below to save your character" rather than "If you click below your chosen character preferences will be saved". "Text should not be dumbed down, but length or complexity should be avoided if it is not required by the tone or to get the point across." It cites 14% of adults in the USA and UK having a reading age below 11. — Game Accessibility Guidelines, "Use simple clear language".
6. "There should be a maximum of eight words on the screen at any given moment… I do break [that rule] from time to time, but it's a good thing to shoot for." Write like an "eloquent caveman". — George Fan, GDC 2012, as reported by Game Developer.
7. "Use plain language and minimize technical jargon." Avoid acronyms; "prefer whole words when writing out units, unless space is extremely limited" (`200 milliseconds` better than `200 ms`, and never `200msec`). — KDE HIG.
8. Buttons: "limit buttons to 1 or 2 words, maximum 3"; "Avoid unnecessary words and articles such as 'the,' 'an,' or 'a.'" — Unity Editor UI copy style.

## Buttons and labels

9. "When labeling buttons and links, it's almost always best to use a verb." "Prioritize clarity and avoid the temptation to be too cute or clever with your labels. For example, just saying 'Send' often works better than 'Let's do it!'" — Apple HIG, Writing.
10. "Use the imperative mood… beginning the label with an action verb, and phrasing it as a command": `Apply` not `Yes`; `Show Info` not `Info`; `Raise Maximum Volume` not `Maximum Volume Raising`. — KDE HIG.
11. In alerts: "Aim for a one- or two-word title that describes the result of selecting the button." "Avoid using OK as the default button title unless the alert is purely informational." "Always use 'Cancel' to title a button that cancels the alert's action." "Avoid explaining alert buttons." — Apple HIG, Alerts.
12. "Make sure that your buttons are clear answers to the question posed by the title." — Windows app writing style.
13. "For dialog titles, describe the action being performed starting with an imperative mood verb… If the dialog was opened from a button or menu item, echo its label in the dialog title." — KDE HIG.
14. "Use positive phrasing; describe what controls will do when enabled, not what they won't do when disabled." — KDE HIG. Likewise for a setting's explanation: "Describe what it does when turned on, and people can infer the opposite." — Apple HIG, Writing.
15. End a label with an ellipsis only "if further input or confirmation is required from the user before the action can be carried out"; not on `Preferences`. Use the real `…` character. — GNOME HIG, KDE HIG. (Material's 2017 guidance says the opposite: "Omit ellipses from menu items or buttons that open a dialog or start a process.")

## Capitalisation

16. Sentence-style capitalisation for everything, including button and checkbox labels: "Capitalize the first word of a sentence, heading, title, UI label… Use lowercase for everything else." "Don't use all uppercase for emphasis." "Don't use all lowercase as a design choice." — Microsoft Writing Style Guide. Material (2017): "Titles, headings, labels, and menu items should use sentence-style capitalization."
17. Two styles by element: header (title) capitalisation for headings and "short control labels that do not normally form proper sentences, such as button labels, switch labels, menu items and tooltips"; sentence capitalisation for "labels that form sentences or that run on to other text" and for body text. — GNOME HIG. KDE HIG draws the line slightly differently: sentence case for anything that ends with a full stop or colon, is clearly a sentence, or "is a subtitle, tooltip, transient status message, or placeholder label", and for checkbox and radio labels; "Otherwise, use title case."
18. Either is acceptable if applied by rule: "Title case is generally considered formal, while sentence case is more casual. Choose a style for each UI element type and use it consistently." Button titles in alerts take "title-style capitalization and no ending punctuation." — Apple HIG.
19. "aim for mixed case rather than all caps" for longer blocks of text. — Game Accessibility Guidelines, "Use simple clear text formatting". Unity gives the reasons: all capitals reduce word-shape cues and read as shouting.

## Punctuation

20. "Text generally shouldn't end with a period. This applies to headings, descriptions, and includes text that is written as a complete sentence. Only use periods when it is necessary to break up a paragraph into multiple sentences." — GNOME HIG.
21. "Omit periods on fragments and single sentences, but use them when in a group of two or more sentences." "Skip colons after labels." — Material (2017).
22. "Don't use periods in headlines, headings, subheadings, UI titles, UI text, or simple lists (three or fewer words per item). End all sentences with a period, even if they're only two words." — Microsoft Writing Style Guide. The Windows app page adds: "Use periods to end full sentences in tooltips, error messages, and dialogs. Don't end text for buttons, radio buttons, labels, or checkboxes with a period."
23. "Use exclamation points sparingly. Save them for when they count." — Microsoft. "Avoid exclamation points as they tend to come across as shouting. Some exceptions include greetings or congratulatory messages." — Material (2017).
24. Use real typographic symbols: `…`, `×` for dimensions and multiplication (`1920 × 1080`, `2×`), `−` for minus, `–` for ranges, curly quotes; "&" only "to join sets of exactly two items". — KDE HIG.
25. Avoid Latin abbreviations such as "e.g." and "i.e.": they translate badly and "can be unintelligible when read by screen readers". — GNOME HIG.

## Person, voice and tone

26. "Use a neutral, informative tone: not informal, boring, exciting, or harsh." Avoid "you" in instructions, "as it sounds accusatory": `Permanently delete all items from the Trash?` not `Are you sure you want to permanently delete all items from the Trash?` — KDE HIG. GNOME HIG agrees: "Pronouns like 'you' or 'my' should generally be avoided."
27. The opposite school: "Always address the user as 'you.'" "Use contractions like it's, you'll, you're…" "It should sound like a friendly conversation." — Microsoft (Windows app page and style guide). Material (2017): second person "for most situations".
28. "Use possessive pronouns sparingly… 'Favorites' conveys the same message as 'Your Favorites'." "Avoid using we altogether… 'Unable to load content' is much clearer" than "We're having trouble loading this content." — Apple HIG, Writing. Material (2017): "Avoid the pronoun 'we'."
29. Voice is fixed, tone varies with the moment: "The words for a banking app might convey trust and stability… while the words in a game might convey excitement and fun." "Match your tone to the context." — Apple HIG, Writing.
30. "Use the present tense to describe product behavior." "Use simple, direct language." "Avoid 'never' and other absolutes." — Material (2017).
31. "Don't use internet memes or culture-specific colloquialisms, expressions, and references"; leave room for strings "to become 50% longer or more when translated". — KDE HIG.

## Numbers

32. "Use numerals in place of words for numbers" — "'1, 2, 3' not 'one, two, three'" — except when mixing uses, as in "Enter two 3s." — Material (2017).
33. Spell out zero to nine in body text, but "It's OK to use numerals for zero through nine when you have limited space, such as in tables and UI." Use the multiplication sign with spaces for dimensions. — Microsoft Writing Style Guide.

## Errors, confirmations, empty states

34. "avoid blame, and be clear about what someone can do to fix it. For example, 'That password is too short' isn't as helpful as 'Choose a password with at least 8 characters.'" "Interjections like 'oops!' or 'uh-oh' are typically unnecessary and can sound insincere." Avoid "robotic error messages with no helpful information, like 'Invalid name.'" — Apple HIG, Writing.
35. An error message should tell "what went wrong… what will happen next, and… a realistic solution", without blame and without jargon. — Windows app writing style. Its first tip rewrites `Invalid ID` as `You need an ID that looks like this: someone@example.com`.
36. Alert titles: describe "what happened, the context in which it happened, and why", not "Error"; no more than two lines; informative text "only if it adds value". "Avoid using an alert merely to provide information." — Apple HIG, Alerts.
37. "Offer players a mechanism to review, confirm, and undo permanent or destructive actions"; describe an input error and how to correct it "in multiple ways"; "Don't require button holds for confirmation of destructive actions." — Xbox Accessibility Guideline 115.
38. "Provide clear next steps on any blank screens… guide people on actions they can take, and give them a button or link to do so if possible." — Apple HIG, Writing. Unity: "Provide a one-line description and, optionally, a button… Try to provide only the first step… Be encouraging."
39. "Reveal detail as needed": `Remove downloaded book?` rather than `Are you sure you want to remove this downloaded book? You won't be able to access it unless you're online.` "Common introductory phrases may be omitted." — Material (2017).

## Teaching, tooltips and consistency

40. "Teach through play… If you also have a written tutorial, consider offering it as a resource players can refer to when they have questions instead of making it a prerequisite for gameplay." — Apple HIG, Designing for games.
41. "Better to have the player 'do' than 'read'." "Use unobtrusive messaging": messages in play should not pause the game. "Use adaptive messaging": show a tip only to players who are doing the wrong thing. "Don't create noise": make all text "either enlightening or entertaining". — George Fan, GDC 2012.
42. "Use contextual prompts which tell players what they need to do right now." Terse rules text "needs to be used in moderation": one-sentence ability tooltips were under-used until rewritten to "describe things in ways which sound cool or attractive and try to make the basic mechanical effects clear without assuming players have internalized information presented elsewhere." — Steamhounds developers, GameDev.net.
43. A single well-worded item can teach the game: LocalThunk on the joker "Four Fingers" — "The reaction they had when they first read that description was usually some combination of shock/understanding/excitement"; he calls this signposting an "extended low-calorie tutorial". — Game Developer.
44. "Create a list of common terms, and reference that list to keep your language consistent." "Build language patterns." — Apple HIG, Writing. "Use consistent words in all parts of a feature." "Refer users to the labels on UI elements, not the type of element." — Material (2017). "Components reused in different areas that have the same functionality are identified through consistent iconography, labeling, or text." — Xbox Accessibility Guideline 114.
45. Describe gestures per device: do not say "click" where you mean "tap". — Apple HIG, Writing. Controller prompts must use the platform's exact button names. — Xbox XR-022.

## Screen-reader text

46. Narrate in the order "name, role, value/state, indexing (if required), and interaction information (if required)", as in "Worlds, Tab, 1 of 3, selected" or "Music Volume, slider, 52%". Do not repeat description and interaction information on every focus change. — Xbox Accessibility Guideline 106.
47. Narrate "Real-time updates and notifications (incoming chats, toast messages, error messages…)". A recurring state such as a countdown may be read "every 7-10 seconds so as not to interfere with other narration". — Xbox Accessibility Guideline 106.
48. Read a glyph as words ("Left mouse button"), not as "symbol"; do not read decorative images at all. Tooltips and narration should "convey the purpose and operation" of a control. — Xbox Accessibility Guidelines 106 and 114.
49. "Provide alternative labels for all key interface elements." "Exclude purely decorative images." "Inform VoiceOver when visible content or layout changes occur." Titles should be unique and "succinctly describe each page's content and purpose". — Apple HIG, VoiceOver.
50. When a visible label is shortened because nearby context makes it clear, "always set `Accessible.name` to the full text including the verb and subject, since screen reader users won't be able to see the context." Icon-only buttons still need text. — KDE HIG.
51. Screen-reader support is "essential" for players with little or no vision and suits "anything text-based"; the practical route is "speaking out the labels of UI elements that receive focus". — Game Accessibility Guidelines.

## Where the guides disagree, and what the games do

| Question                           | Guides                                                                              | Games read here                                                                                                                                              |
| ---------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Button case                        | Microsoft and Material: sentence case. GNOME, KDE, Apple alerts, Unity: title case. | Title Case in 17 of 26.                                                                                                                                      |
| Full stop on a single sentence     | GNOME and Material: no. Microsoft: yes.                                             | Split, but consistent within the careful ones: OpenTTD no (1 of 736 tooltips), Mindustry yes (53 of 53 setting descriptions, 258 of 258 block descriptions). |
| "Are you sure you want to…?"       | KDE and Material: drop it.                                                          | Used by 9 of 15 games with a confirmation.                                                                                                                   |
| "you"                              | KDE, GNOME: avoid. Microsoft, Material: use.                                        | Rare in play; standard in the win or loss line; in under 10% of item descriptions in 6 of 9 games (Slay the Spire, Hades and FTL are the ones that use it).  |
| "Oops!" and exclamation marks      | Apple: unnecessary. Microsoft, Material: sparingly, congratulation excepted.        | One `Oops!` in 45 game sources. "!" on nearly every win line and on about half of confirmations-of-success.                                                  |
| Numerals                           | Material: always. Microsoft: allowed in UI.                                         | Always numerals, in every game.                                                                                                                              |
| `OK` on a destructive confirmation | Apple: avoid.                                                                       | 1 of the 9 games whose confirmation buttons could be read uses `OK` / `Cancel`.                                                                              |

---

# Outliers worth stealing from

1. **Two layers of description** (Mindustry). A plain line for what the thing does (`Distributes input items to all 4 output directions equally.`) and an optional second field for character (`A necessary evil.`). The rule is never bent to fit the joke.
2. **Number-free sentence plus a labelled value line** (Hades). `Your lightning bolt effects deal damage in a larger area.` then `Bolt Area of Effect: +60%`. The sentence never changes when the number does, and the wording cannot drift out of step with the value — the failure Into the Breach's wiki records.
3. **Live state in brackets** (Balatro). `(Currently +0 Mult)` after a scaling effect; `(Must have room)` for a capacity condition; `(ex: 1 in 3 -> 2 in 3)` for a rule that is easier shown than told. Four kinds of bracket, each with one job.
4. **A keyword as a whole sentence** (Slay the Spire). `Ethereal. Deal 20 damage.` — and one capitalised word, `ALL`, reserved for one meaning.
5. **The loss title that looks forward** (Connections): `Next Time`. And the near-miss toast, `One away...`
6. **The same action named for the outcome** (PROXX): `Play again` after a win, `Try again` after a loss.
7. **A ladder whose lowest rungs are kind** (Spelling Bee): `Beginner`, `Good Start`, `Moving Up`. With a progress line that gives both the next step and the big goal: `{n} points to next rank, {m} to Genius`.
8. **Several lines for one repeated event** (Spelling Bee): five variants of "Genius again!", so a daily player does not see the same sentence each day.
9. **The self-mocking last rung** (Wordle, Connections): `Phew`.
10. **A confirmation that names the real cost** (KPatience): `A loss will be recorded in the statistics if the current game is abandoned.` Its button repeats the title: `Abandon Current Game`.
11. **Dialog choices written as the player's reply, with the consequence inside** (Shattered Pixel Dungeon): `Yes, delete this save` · `No, I want to continue`.
12. **A speaker prefix on machine advice** (KPatience): `Solver: This game is no longer winnable.` The player knows who is talking and can discount it.
13. **A two-part error** (OpenTTD): a fixed headline for the action that failed and a short lower-case reason.
14. **The dead end that gives both ways out in three words** (AisleRiot): `No moves are possible. Undo or start again.`
15. **The empty state that says where to go** (SuperTux): `No User Contrib Levels yet. Create some with the Level Editor.`
16. **An option that explains itself in its own label** (Tatham; ReactOS Spider; Lichess): `Killer (digit sums)` · `Easy: One Color` · `Board coordinates (A-H, 1-8)`.
17. **The distance to the next goal on the end screen** (Nibbles; Lichess): `(%ld more points to reach the leaderboard)` · `Previous highscore was %s`.
18. **One line for outcome, answer and next key** (hello wordl): `You lost! The answer was {WORD}. (Enter to play again)`.
19. **A second sentence in a setting's description kept for the side-effect** (Mindustry): `Higher values may increase power consumption.` · `Restart required to apply changes.`
20. **Tutorial strings written once per input device** (Shattered Pixel Dungeon, Mindustry), so no player reads "click or tap".
21. **The power-up whose name is its effect** (KBreakOut, Into the Breach): `Enlarge Bar`, `+1 Damage`. Nothing to learn.
22. **Named feats built from parts** (Tetris, Peggle): a small vocabulary that composes — `Mini` + `T-Spin` + `Double`; `Super` + `Long Shot`.
23. **Tile announcements in a fixed order** (NYT Wordle): `1st letter, A, present in another position` — position, content, state, with the state phrased so it cannot be confused with colour.
24. **An announcement format the player can edit** (Grid Games): `Row $r Column $c, Group $g`.
25. **One line of character at the door** (Nibbles): `Welcome, worms.` — and plain text after it.
26. **Praise that is graded and feedback that is not** (Lichess): `Best move!` takes the exclamation mark, `Good move` does not.

---

# Things almost nobody does

Habits that are absent, or nearly so, across the 45 game sources.

1. **Semicolons.** Rare, not absent. None in the roughly 940 effect descriptions measured for Balatro, Slay the Spire, Vampire Survivors, Hades, FTL and Mindustry's blocks, and none on a button, a HUD label, a setting name or a win or loss line. In the eleven string files searched in full (GNOME Mines, GNOME Sudoku, AisleRiot, Nibbles, SuperTux, Antimine, Open Sudoku, OpenTTD, Lichess, Mindustry, and five of Shattered Pixel Dungeon's files; 15,227 strings) 37 strings have one, about 1 in 400. Of those, 12 sit inside a bracketed qualifier on a label (`Game setting (stored in saves; affects only new games)`), 9 are failure messages that join what happened to why or what next (`Your wand fizzles; it must not have enough charge.` · `Invalid format; import was cancelled` · `the funding failed to prospect due to bad luck; try again`), 7 are Mindustry's reference text for its programming blocks, 3 are flavour, 3 are licence text, and the last three are one setting help text, one Lichess hint and a keyboard-layout string.
2. **A full stop on a button or menu item.** 0 of 235 distinct labels. The only sentence-shaped buttons are Shattered Pixel Dungeon's replies (`Yes, spend them all.`).
3. **Label text written as a full sentence.** Buttons, HUD labels and setting names are words or phrases in every game. A setting phrased as a question (`How do you move pieces?`) occurs once.
4. **Edge cases explained in the description.** Descriptions state the main rule and stop. Caveats are a short bracket at most: 46 of 150 in Balatro (all live state, capacity, lists or examples — none is a rules exception), 3 of 32 in FTL, about 5 of 180 Slay the Spire relics, none of 192 Vampire Survivors weapons. Where a game has edge cases, the wiki holds them, not the tooltip.
5. **More than two sentences in a tooltip or item effect.** Slay the Spire's longest card is 16 words; three-sentence effects exist only in KBreakOut's printed handbook.
6. **Exclamation marks in rules text or settings.** 0 in Balatro's 150 effects, Slay the Spire's cards, Hades' boons and FTL's augments; 1 in 192 Vampire Survivors weapons. Doubled marks ("!!") appear nowhere.
7. **Blaming or judging the player.** No "wrong", "failed", "bad move" or "you should have". The plainest rejection is `That's not the move!` followed at once by `Try something else.`
8. **"Please" outside an error.** About twenty strings in ten games, nearly all errors, name entry or setup instructions. Never on a button or a toast; in a play hint once.
9. **Apology.** Two strings, both for the software's own fault.
10. **"Oops", "Uh-oh", "Whoops".** One `Oops!` (KBreakOut) and one `Oh no!` (NYT's rotate-your-device notice).
11. **First person.** The game does not say "I" or "we" except in a handful of places: `We have won.` (KPatience, when it finished the game itself), `I'm not sure` (an AisleRiot hint), NYT's account messages (`We couldn’t sync your stats.`), and Shattered Pixel Dungeon's reply buttons, where "I" is the player.
12. **All capitals for emphasis inside a sentence.** Only Slay the Spire's `ALL`. Whole strings in capitals belong to arcade games and to Shattered Pixel Dungeon's action buttons.
13. **Numbers spelled as words.** Numerals everywhere, including 1. The exceptions are fixed words that are not really counts (`twice`, `Double`, `half damage`) and FTL's `percent`.
14. **A negative setting name.** Five found among several hundred (`Mute …`, `Disable all …`, `Hide …`); none of the form "Don't …".
15. **Explaining what "off" does.** 2 of 20 `When enabled,` descriptions in Mindustry do; the rest leave it to be inferred, as Apple advises.
16. **Abbreviations in running text.** `HP` is universal and `XP`, `FPS`, `SFX` common; beyond those, abbreviations are confined to expert games (Techmino's `B2B`, `PC`) and to stat lines (`sec`, `dmg`).
17. **Emoji or decorative symbols in strings.** Only Mindustry's inline icon codes and one `⚠`; hello wordl uses `⚙️` as a link. No game decorates praise with symbols.
18. **A trailing ellipsis on web or mobile buttons.** Desktop menus only. On the web an ellipsis means "in progress" (`Loading…`, `Calculating moves...`) or suspense (`One away...`).
19. **A colon after a stacked HUD label.** Colons appear only when label and value share a line.
20. **A separate, longer string for the screen reader than for the eye.** Announcements are the same words or fewer.
21. **Humour in a loss, an error or a confirmation.** Jokes sit in names, flavour layers, the lowest praise rung, a welcome line and one empty state — places where nothing is at stake.
22. **Brand or mascot voice in mechanics.** No game read here has a character speak its settings, errors or item effects. Themed words are limited to praise (Candy Crush, Spelling Bee).
23. **"Click here" and bare "Learn more".** Absent; links and buttons name their destination (`Go to Settings`, `Open Tutorial`, `Go To Update Page`).
24. **Time written loosely.** Durations are always a numeral and a unit; the one vague one (`Try again in a few.`) is in NYT's account copy, not in a game.

---

# Gaps and cautions

**Not reached.**

- Microsoft Solitaire Collection and the modern Microsoft Minesweeper: no page with transcribed strings was found. The classic Windows dialogs are represented by the Wine and ReactOS clones, which reproduce the originals' menus closely but are not Microsoft's text.
- Google's Solitaire, Minesweeper and Snake: served inside search results; not fetchable.
- Threes, Mini Metro, Bejeweled, Geometry Wars, Shatter, BBTAN and Ballz, Puzzle Bobble, Arkanoid and Breakout: the wiki pages that could be fetched held descriptions of the games, not their strings. StrategyWiki blocked fetching.
- Material Design's current writing guidance: the live pages return an empty shell; the 2017 archived version was used and is marked as such.
- Game UI Database and Interface In Game: screenshot galleries without transcribed text.
- LocalThunk's post on joker design guidelines: the mirror returned 404. Only the Game Developer report of his signposting thread was read.
- No conference talk specifically about microcopy in games was found; the two game-specific talks and articles read are about tutorials and tooltips.

**Cautions about the evidence.**

- Wiki transcriptions (sources 12, 13, 17, 20–30) are other people's copies of in-game text. Wording is reliable; final punctuation, capitalisation and line breaks are less so. The full-stop counts for Balatro, Brotato and Vampire Survivors rest on wiki text.
- Slay the Spire strings are shown with base values; the wiki's `8(10)` notation was removed. The Slay the Spire relic count includes a few rows that are not relics, so those figures are approximate.
- Luck be a Landlord strings have gaps where the game shows icons.
- The Tetris scoring names came through WebFetch's small model, which may have tidied spacing.
- The NYT strings come from minified bundles; strings built from several parts are marked "(assembled)" or shown with placeholders.
- The pooled button sample was chosen by hand from the files read; it is representative, not exhaustive.

**From memory, not fetched — treat as unverified.**

- Windows 7 Minesweeper's end dialogs: "Sorry, you lost this game. Better luck next time!" and "Congratulations, you won the game!" (from memory, unverified)
- Arkanoid's power-up capsules, lettered `S`, `C`, `L`, `E`, `D`, `B`, `P` for Slow, Catch, Laser, Enlarge, Disruption, Break and Player (from memory, unverified)
- Bejeweled's spoken praise ladder: "Good", "Excellent", "Awesome", "Spectacular", "Extraordinary", "Unbelievable" (from memory, unverified)
