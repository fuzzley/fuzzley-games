# Plan: QA of Sudoku on the live site, and what to fix

Tested 2026-10-27 at https://fuzzley.games/play/sudoku/ (the build from
`c140884`). Nothing here is built yet. This is a hands-on pass as a player,
once on a desktop and once on a phone. It complements
`docs/sudoku-review-plan.md`, which reviews the code. Where the two overlap,
this plan says so rather than repeating it. Paths are relative to
`frontend/games/sudoku/`.

Each finding gives a **priority** (High, Medium or Low) and a rough
**effort** (S under an hour, M a few hours, L a day or more). Then it says
what happened and how to see it, the options with their pros and cons, and
a recommendation.

## How it was tested

- **Desktop:** Chrome at 1024 × 768, 1240 × 900 and 1920 × 1080, with mouse
  and keyboard. Easy and Medium deals were played through: digits, notes
  (Shift and Notes mode), Erase, Undo and Ctrl+Z, both kinds of hint,
  repeats and "Mark mistakes", a full solve with the result card and best
  time, New Game, Restart and a level change with their confirmations,
  reload and resume, all four palettes, How to play, and Tab order.
- **Phone:** Chrome's device emulation with touch, at 390 × 844 (a full
  iPhone screen), 390 × 664 (the same phone with Safari's bars),
  375 × 553 (iPhone SE in Safari), 360 × 640, 320 × 480, 844 × 390 and
  667 × 320 (phones held sideways), and an iPad at 768 × 1024. An Expert
  deal was played to an XY-Wing hint and solved, and the overflow menu,
  settings drawer and result card were used.
- **Also:** Lighthouse (accessibility, best practices and SEO all 100), the
  console (no errors), and the page's touch settings. Analytics was blocked
  so the runs didn't count as visits.
- **Not covered:** real iOS and Android devices (Safari's moving toolbars,
  pull-to-refresh, VoiceOver and TalkBack) and NVDA. Emulation can't show
  those.

## What works well

The game is solid. No move gave a wrong result, nothing crashed and nothing
was lost on reload.

- **The rules and hints are right.** Each hint was checked against an
  independent solver. A mistake hint finds the wrong digit even with "Mark
  mistakes" off, "Take out" removes it, and a step hint's "Fill in" places
  the right digit. Repeats are marked in red and underlined, so color isn't
  the only signal, and the screen reader hears "6 repeats in row 9".
- **The assists work.** Placing a digit takes it out of its peers' notes,
  and Undo puts them back in one step.
- **It keeps everything.** After a reload the digits, notes, time, undo
  history and palette all come back.
- **Its questions are in the right places.** New Game, Restart and a level
  change ask before losing a game in progress, and don't ask when nothing
  would be lost. Cancel leaves the level as it was.
- **The result card and stats are right.** The best time is set only
  without hints, "Solved with 53 hints, so no best time" explains why, and
  "Solved 1 of 1" is correct.
- **The layout adapts.** From 360 px phones to 1920 px desktops, the pad
  sits beside the board on a wide screen and under it on a tall one. The
  bar moves to the bottom on a phone, and to the side when the phone is
  held sideways.
- **Touch is handled.** The board and keys have `touch-action:
manipulation`, so a double tap doesn't zoom, and a long press doesn't
  select squares.
- **The board is accessible.** It is a real grid, with row and column
  indexes and one tab stop, the focus ring is clear, and Undo and Hint are
  dimmed rather than disabled.

**Ruled out:** in the desktop app's hidden browser pane, a digit typed right
after an arrow key landed on the old square. That came from the hidden
pane slowing timers down. In a visible Chrome the focus moves about 6 ms
after the arrow key, much faster than anyone types.

## Summary

| #   | Finding                                                        | Priority | Effort |
| --- | -------------------------------------------------------------- | -------- | ------ |
| 1   | A hint's words are cut off on short phones and sideways phones | High     | M      |
| 2   | Tapping the pad scrolls the page on a short screen             | Medium   | S      |
| 3   | Restart asks "Start a new game?"                               | Medium   | S      |
| 4   | Typing does nothing after a load or a deal from the bar        | Medium   | S      |
| 5   | The clock runs while How to play or Settings covers the board  | Medium   | S      |
| 6   | Undo doesn't show which square it changed                      | Medium   | S      |
| 7   | No way to fill in the candidates                               | Medium   | L      |
| 8   | The level is hidden below 1200 px and hard to change           | Medium   | M      |
| 9   | The row, column and same-digit shading is faint                | Low      | M      |
| 10  | A hint's shading doesn't say which square plays which part     | Low      | M      |
| 11  | Turning Notes mode on or off is silent to a screen reader      | Low      | S      |
| 12  | Notes are under 10 px on a phone                               | Low      | S      |
| 13  | Small touch polish: tap flash and pull-to-refresh              | Low      | S      |
| 14  | Restart's loose ends                                           | Low      | S      |
| 15  | The board stops growing at 576 px on large screens             | Low      | S      |

## Findings

### 1. A hint's words are cut off on short phones and sideways phones

**Priority:** High. **Effort:** M.

**What happened.** The hint's words get whatever room the stage has left
(`--hint-room` in `src/app/app.component.scss`, at least 64 px under the
board, and only what remains under the pad on a wide stage). On anything
shorter than a large phone held upright, the words don't fit. They become a
small scrolling box that cuts the last line through the middle:

| Viewport                       | Room for the words | Words need | What shows                       |
| ------------------------------ | ------------------ | ---------- | -------------------------------- |
| 390 × 844, upright             | 128 px             | 128 px     | All of it                        |
| 360 × 640, upright             | fits               | fits       | All of it                        |
| 375 × 553, iPhone SE in Safari | 64 px              | 118 px     | 2½ lines of an XY-Wing           |
| 844 × 390, sideways            | 82 px              | 196 px     | 3 of 8 lines                     |
| 667 × 320, sideways            | 12 px              | 59 px      | Half of "Hidden single", no text |

On a sideways phone even an Easy hint can't be read, though Hint still
selects the square and shades it.

**Options.**

- **A. A short hint, with the reasoning a tap away.** Show the title and
  the conclusion ("The 9 goes in row 9, column 4."), and put the reasoning
  behind a "Why?" toggle. `describeChain()` in `src/rules/describe.ts`
  returns the conclusion as a field of its own.
  - _Pros:_ two lines fit almost anywhere, and most players only want the
    square. It helps every layout.
  - _Cons:_ one more tap for the reasoning, which still needs room. It
    changes the hint's words and the specs that check them.
- **B. Open the words in a sheet when they don't fit.** An `<fz-dialog>`
  over the pad, holding the words, Fill in and Close, opens when the
  measured text is taller than its room.
  - _Pros:_ the words are always readable, and the board's shading stays
    visible.
  - _Cons:_ it covers the pad, though Fill in is the next move anyway. It
    needs measuring (a `ResizeObserver`) or a size rule.
- **C. Use the spare width when the phone is sideways.** At 844 × 390
  about 220 px of the stage sits empty, so the words could take a column
  of their own beside the pad.
  - _Pros:_ no overlay.
  - _Cons:_ it doesn't help 667 × 320 (about 120 px spare) or short
    upright screens.
- **D. Only a fade and a scroll cue.**
  - _Pros:_ trivial.
  - _Cons:_ still a tiny box, and no help at 12 px.

**Recommendation.** A, with B for when even the short form doesn't fit.

### 2. Tapping the pad scrolls the page on a short screen

**Priority:** Medium. **Effort:** S.

**What happened.** A key pressed with a finger hands the focus back to the
board (`BoardComponent.focus()` in `src/app/board/board.component.ts`), and
`focus()` scrolls the focused square into view. Where the stage scrolls (on
a short screen, or with large text), every tap on the pad scrolls the page
up. At 320 × 480, tapping Notes moved the stage from 76 px to 46 px, so the
pad jumped 30 px under the finger. That leads to missed taps.

**Options.**

- **A. `focus({ preventScroll: true })` when the pad hands the focus back.**
  Only for that hand-back: keep scrolling when a hint or the keyboard
  selects a square that may be out of sight.
  - _Pros:_ one option on one call, and keyboard play is unchanged.
  - _Cons:_ none worth noting.
- **B. Never let the stage scroll.**
  - _Pros:_ none here: that is finding 1's layout question, not this fix.

**Recommendation.** A.

### 3. Restart asks "Start a new game?"

**Priority:** Medium. **Effort:** S.

**What happened.** Restart, New Game and a level change share one question
(`GameService.mayLoseGame()`): "Start a new game? The game in progress will
be lost." with the button "New game". For Restart that's wrong. A player
who only wants to clear the board may cancel, thinking they would get a
different puzzle. The same goes for Restart in the overflow menu.

**Proposal.** `mayLoseGame()` takes the question. Restart asks "Restart
this puzzle?" ("Your digits and notes will be cleared, and the clock starts
again.") with the button "Restart". While the words are open, How to play's
"Hint, then Fill in" could add "or Take out", the name the button takes for
a wrong digit.

**Pros.** It says what will happen, and the change is small.

**Cons.** None. `game.service.spec.ts` checks the new words.

### 4. Typing does nothing after a load or a deal from the bar

**Priority:** Medium. **Effort:** S.

**What happened.** When the page loads, a square is already drawn as
selected, but the focus is on the page itself. Typing a digit does nothing
until the player clicks a square or tabs into the board. After New Game or
Restart from the bar, or a level change in Settings, the focus stays on that
button, so digits do nothing again. From New Game the board is 15 Shift+Tabs
away. New Game on the result card does hand the focus to the board.

**Options.**

- **A. The board takes the focus after every deal:** on load, and after New
  Game, Restart or a level change, once the question and any drawer have
  closed.
  - _Pros:_ you can type right away, as the selected square suggests. It
    matches the result card.
  - _Cons:_ on load, a screen reader starts inside the grid. That is
    arguably right for a game page, and the page's `<h1>` sits after the
    board anyway. A focus ring may show on load. The other games should
    probably match.
- **B. Send a digit typed with the focus on the page to the board.**
  - _Cons:_ it breaks the one-key-shortcuts-only-while-focused rule
    (WCAG 2.1.4) that `AGENTS.md` records.
- **C. Only after a deal from the bar or Settings,** leaving load alone.
  - _Pros:_ the narrowest change.
  - _Cons:_ the first keystroke after a load still does nothing.

**Recommendation.** A, or C if the focus on load is unwelcome.

### 5. The clock runs while How to play or Settings covers the board

**Priority:** Medium. **Effort:** S.

**What happened.** With How to play open, the clock went from 0:16 to 0:19
in three seconds, while the board was blurred and couldn't be played.
Reading the help, or changing a palette, costs time and best times. The
clock already pauses while the page is out of sight. There is no Pause
control.

**Options.**

- **A. Pause the stopwatch while a drawer or dialog covers the board.**
  That means Settings, How to play and the confirmation.
  `StopwatchService` already stops and starts.
  - _Pros:_ fair times, nothing new on screen, and the blur means no
    thinking time is gained.
  - _Cons:_ the clock's rule gets one more case to test.
- **B. A Pause button that hides the board.**
  - _Pros:_ explicit, and common in Sudoku apps.
  - _Cons:_ another action in a full bar; on a phone it would sit in the
    overflow menu.
- **C. Start the clock at the first move.**
  - _Cons:_ reading the puzzle is part of solving it. Not recommended.

**Recommendation.** A. B is optional, later.

### 6. Undo doesn't show which square it changed

**Priority:** Medium. **Effort:** S.

**What happened.** Undo takes back the last move but leaves the selection
where it is. Undoing a note added three squares away, with another square
selected, changed a square the player wasn't looking at, and nothing drew
the eye to it. The screen reader hears only "Undone." (the review plan's
finding 4 covers what it should say).

**Proposal.** `undo()` selects the square the move was made on (the first
change in the move; the notes it cleared from peers follow it), so the
shading and focus land there. Pair it with the review plan's
`describeUndo()`.

**Pros.** Undo becomes easy to follow, for every player.

**Cons.** Undoing several moves makes the selection jump about, which is
what other Sudoku apps do too.

### 7. No way to fill in the candidates

**Priority:** Medium. **Effort:** L.

**What happened.** From Medium up, a hint explains itself through
candidates: "The square at row 7, column 5 holds 5 or 8…". The board shows
only the notes the player typed. On a phone, noting every square's
candidates means hundreds of taps, so players on a phone either guess at
the hints or stay on Easy.

**Options.**

- **A. A "Fill in notes" action.** It writes every blank square's
  candidates as notes, worked out from the digits on the board, as one move
  that Undo takes back.
  - _Pros:_ makes Medium and up playable on a phone, and the hints readable.
    One button and no new mode.
  - _Cons:_ it's an assist, so decide whether it costs the best time. It
    needs a home: a fifth tool narrows the phone's tools from about 89 px to
    about 70 px wide. With a wrong digit on the board, the candidates are
    wrong too.
- **B. A "Show candidates" assist,** drawn live in place of the notes.
  - _Pros:_ always current.
  - _Cons:_ it competes with the player's own notes, and more needs
    drawing and testing.

**Recommendation.** A. Decide where it lives and whether it costs the best
time.

### 8. The level is hidden below 1200 px and hard to change

**Priority:** Medium. **Effort:** M.

**What happened.** The level shows only as the badge beside "Sudoku", which
the bar drops below its `desktop` width, 1200 px
(`src/app/bar/bar.component.scss`). On a phone, a tablet or a laptop window
under 1200 px, nothing on screen says which level is being played, until
the result card. Changing it takes ⋮ → Settings → a level → confirm, and
New Game always deals the same level again.

**Options.**

- **A. Show the level at every size,** for example with the time ("Easy ·
  3:12") or under the title on a compact bar.
  - _Pros:_ always known, and small.
  - _Cons:_ the compact bar has little room, so check it at 320 px.
- **B. New Game asks for the level** in a small picker, with the current
  level picked.
  - _Pros:_ easy to find.
  - _Cons:_ one more tap for "same again", the common case.
- **C. The result card offers the four levels** beside New Game.
  - _Pros:_ you choose at the natural moment, and New Game stays one tap.
  - _Cons:_ it doesn't help mid-game.

**Recommendation.** A and C, which keep New Game one tap and the UI plain.

### 9. The row, column and same-digit shading is faint

**Priority:** Low. **Effort:** M.

**What happened.** Against the board, the shade for the selected square's
row, column and box is 1.09–1.14 : 1 in every palette, and the shade for
squares holding the same digit is 1.21–1.37 : 1. On the dark palettes
(Casino night, Midnight blue), the row and column wash is barely visible.
The selected square's 3 : 1 outline carries the selection, so this isn't a
WCAG failure, but scanning for where a digit can go is harder than it
needs to be.

**Proposal.** Deepen the related and same-digit shades a step, most on the
dark palettes. `src/app/board/contrast.spec.ts` holds the givens, the
player's ink and the notes to 4.5 : 1 on every shade.

**Pros.** Easier to scan, especially on a phone.

**Cons.** The contrast spec may force the inks to change with the shades,
and too strong a wash makes the board busy. Try it on screenshots first.

### 10. A hint's shading doesn't say which square plays which part

**Priority:** Low. **Effort:** M.

**What happened.** For the XY-Wing, the squares that "show why" share one
shade: the pivot (row 7, column 5), both wings and the rest of box 8. The
words name three squares, but the board doesn't pick them out, so you have
to work out the coordinates yourself, which on a phone means counting rows.

**Proposal.** Split the shown squares into the ones the words name, with a
stronger shade or an inner ring, and the unit where the conclusion lands.
`shownBy()` in `src/rules/logic.ts` would return the two groups.

**Pros.** Advanced hints become readable at a glance.

**Cons.** One more shade to hold to contrast in four palettes, and a
change to the rules' output and its specs.

### 11. Turning Notes mode on or off is silent to a screen reader

**Priority:** Low. **Effort:** S.

**What happened.** The N key toggles Notes mode with the focus on the
board, but nothing is announced. The Notes button's `aria-pressed` changes,
but the focus isn't on it. Nothing else says that the next digit will add a
note. The review plan's finding 4 covers moves that change nothing, but not
this.

**Proposal.** Say "Notes on." and "Notes off." through the announcer when
the mode changes.

**Pros.** Small, and in step with the rule that every move is announced.

**Cons.** None.

### 12. Notes are under 10 px on a phone

**Priority:** Low. **Effort:** S.

**What happened.** Notes are sized at 0.24 of a square
(`src/app/board/board.component.scss`), so 9.8 px in a phone's 40 px
square. They are readable, but small for the people who use notes most.

**Proposal.** Try 0.27–0.28 of a square, about 11 px, which still fits three
by three.

**Pros.** More legible notes.

**Cons.** Check them in a 32 px square, the smallest the board allows.

### 13. Small touch polish: tap flash and pull-to-refresh

**Priority:** Low. **Effort:** S.

**What happened.** Android Chrome flashes its default blue tap highlight
over the keys and squares, which have pressed states of their own. And the
page sets no `overscroll-behavior`, so a downward swipe on the board might
pull to refresh on Android. Emulation can't show this, so check it on a
device. The game would come back after a refresh, but the jump is jarring.

**Proposal.** Add `-webkit-tap-highlight-color: transparent` on the board
and pad, and `overscroll-behavior: none` on the game's page. Both may
belong in `@fz/style` for every game.

**Pros.** Cheap, and the game feels more like an app.

**Cons.** Test it on a real phone.

### 14. Restart's loose ends

**Priority:** Low. **Effort:** S.

**What happened.**

- A restarted puzzle counts as another game played on its first move, so
  "Solved 1 of 3" can mean one puzzle restarted twice.
- A restart that no move has touched isn't saved, so a reload deals a
  different puzzle.
- Restarting a puzzle solved without hints keeps no hints and resets the
  clock, so its solution, still in mind, can be typed in for a best time.

**Proposal.** Don't count a restart as a new game. Keep the restarted
puzzle across a reload, and have it set no best time once it has been
solved.

**Pros.** Honest stats.

**Cons.** More state to save and test, for edge cases few players hit.
Fine to leave until stats get a screen of their own.

### 15. The board stops growing at 576 px on large screens

**Priority:** Low. **Effort:** S.

**What happened.** Squares are capped at 64 px (`--side` in
`src/app/app.component.scss`), so on a 1920 × 1080 screen the board fills
just over half the height, with wide empty margins.

**Proposal.** Let squares grow to about 80 px when the stage has the room,
with the pad's keys scaled to match.

**Pros.** Easier on the eyes on big screens.

**Cons.** Check the pad's proportions and the hint's room at the new size.

## Considered and left out

- **Redo** (Ctrl+Y, Ctrl+Shift+Z). Rarely missed when Undo is a step at a
  time.
- **Digit-first input** (pick a digit, then tap squares). Popular in some
  phone apps, but it's a second input mode to teach and test.
- **A stats screen.** Stats show only on the result card. Worth doing only
  if finding 14's counting changes.

## Suggested order

1. The quick, clear fixes: findings 2, 3, 6 and 11, with the review plan's
   finding 4, since they touch the same announcements.
2. Finding 4 (focus after a deal) and finding 5 (pausing the clock).
3. Finding 1 (the hint's room), the one High, which needs a layout
   decision.
4. Findings 8 and 7, the two features, once their decisions are made.
5. The Low polish, ideally in one pass with screenshots across the
   palettes (findings 9, 10, 12, 13 and 15).

## Decisions for the user

1. **The hint on small screens (finding 1):** a short hint with "Why?" (A),
   a sheet when it doesn't fit (B), both, or a column of its own sideways
   (C)?
2. **Focus on load (finding 4):** should the board take the focus as the
   page loads (A), or only after a deal (C)?
3. **The clock (finding 5):** pause behind drawers and dialogs, and is a
   Pause button wanted?
4. **Candidates (finding 7):** build "Fill in notes"? If so, does it cost
   the best time, and is it a fifth tool or somewhere else?
5. **The level (finding 8):** show it at every size, and offer the levels on
   the result card?
