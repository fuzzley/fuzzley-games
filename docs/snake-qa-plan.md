# Plan: QA of Snake on the live site, on a desktop

A plan for a hands-on pass over Snake as a player, at
https://fuzzley.games/play/snake/, on a desktop or laptop with a keyboard
and a mouse: its interface, its controls and its rules. Phones and tablets,
held either way, have a plan of their own, `docs/snake-mobile-qa-plan.md`,
which borrows this plan's helpers and leaves the rules to it. Written
2026-10-28 from the code on `main` at `cfd56a6`. Paths are relative to
`frontend/games/snake/`.

The pass ends in a write-up of findings shaped like
`docs/archive/sudoku-qa-plan.md`: what works well, a summary table, and
for each finding a priority (High, Medium or Low), a rough effort (S, M or
L), what happened and how to see it, the options, and a recommendation.
Each check below says what to expect. Anything else is a finding. Where
the game does what its code means to do and the result still seems wrong,
it is a question for the user.

## Before starting

- **Note the build.** `curl https://fuzzley.games/version.json` names the
  site's commit and Snake's build. Write both at the top of the findings.
- **Browsers.** Chrome for the main pass, then Edge and Firefox for
  section 18. There's no Safari on this machine (see "Not covered").
- **A fresh profile.** Use a guest window or a profile of its own, so
  storage starts empty, with no `snake-*` or `fuzzley-theme` entries.
  Later sections keep storage on purpose.
- **Analytics off,** so QA runs don't count as visits. In DevTools, under
  Network → Request blocking, block `*googletagmanager.com*` and
  `*/g/collect*`. A driven browser can instead pin `window.__ENV` to `{}`
  with an init script.
- **DevTools undocked.** Clicking into DevTools takes the focus from the
  page, which pauses a run, as designed. Click the board before pressing
  keys.
- **Sound on,** at a volume you can hear.
- **The helpers in the appendix:** a log of what the announcer says, a
  timer for steps, a reading of the board's size, and seeds for states too
  slow to reach by playing.
- **For an agent:** drive the DevTools MCP's visible Chrome, not the
  desktop app's browser pane. A hidden pane throttles timers, which makes
  keys look late; that gave the Sudoku QA a false lead.

## Leads to confirm or rule out

Reading the code suggests these. Each is a question for the pass, not yet
a finding.

1. **The direction back doesn't go on.** A paused run heading right
   ignores Left, though the announcement says "Press a direction to go on"
   (`turn()` in `src/rules/run.ts`).
2. **No key starts again once the result card is closed.** The board has
   the focus, but every key does nothing; only New Game in the bar starts a
   run.
3. **Best lags behind the score.** The bar's Best changes only when a run
   ends, so a run that passes it shows, say, Score 7 and Best 5 until the
   crash.
4. **The on-screen arrows play on with the focus off the board.** With the
   arrows set to Always, Tab reaches them. Focusing one pauses the run, and
   Enter on it turns and goes on, while the keys can't steer and leaving
   doesn't pause.
5. **The cards and the placeholder read the pixel ratio once.**
   `BoardComponent` reads `devicePixelRatio` when it is made. After a
   browser zoom, or a move to a screen of another scale, the Ready and
   Paused cards may sit a little off the drawn board. The focus ring
   follows the scene's own rectangle.
6. **A slow load reads as a failure.** The canvas gives the scene 8 s to
   draw before showing "The board couldn't be drawn"
   (`@fz/phaser`'s canvas). On a slow enough network the card may show
   while Phaser is still loading, then vanish when it arrives.
7. **A run can start before Phaser has loaded.** With the arrows showing,
   a press on one starts the run, but nothing steps it until the scene
   arrives.
8. **Some stats are kept and never shown.** Runs played and the longest
   snake, for each speed, are in `snake-stats`, but no screen shows them.

## 1. Loading and the page

- [ ] **1.1 First paint.** Open the page with the cache disabled, once
      unthrottled and once on DevTools' "Slow 4G". Expect the bar and an
      empty checkered board, drawn in CSS, to paint first, with the Ready
      card over the board's lower half. Phaser loads after, as a chunk of
      its own. The drawn board then replaces the placeholder in the same
      place, with no jump, flash or change of size. Note how long the drawn
      board takes.
- [ ] **1.2 A very slow load (lead 6).** Throttle to "3G", or a custom
      profile of 400 kbps, and reload. Record whether "The board couldn't
      be drawn" shows, and what happens when Phaser arrives.
- [ ] **1.3 The starting position.** The snake is three squares long, in
      the middle row, left of the middle, heading right. The apple is eight
      squares ahead of its head in the same row and pops in once.
- [ ] **1.4 The page itself.** The tab says "Snake", with the site's
      favicon. The `theme-color` meta matches the palette. Nothing scrolls,
      at any size in section 15.
- [ ] **1.5 Console and network,** watched for the whole pass. Expect no
      errors and no warnings, no failed request, and nothing loaded from an
      origin other than fuzzley.games, apart from the blocked analytics.
      Hashed files under `assets/` are cached for a long time, and
      `index.html` and `version.json` aren't. The page has the security
      headers that `nginx/` sends. Games carry no Content Security Policy.
- [ ] **1.6 The focus on load.** Without clicking, press →. Expect the run
      to start, because the board had the focus from load, and no focus
      ring to show.
- [ ] **1.7 No WebGL.** Start Chrome with WebGL turned off
      (`--disable-3d-apis`). Phaser's AUTO should fall back to its Canvas
      renderer. Record whether the game draws and plays, or shows "The
      board couldn't be drawn" with Reload, which should reload.
- [ ] **1.8 Phaser blocked.** Block the Phaser chunk (the largest `.js`
      under `assets/`) and reload. Expect the failure card, announced as an
      alert, within about 8 s, and no stuck placeholder.

## 2. The bar

At 1920 × 1080:

- [ ] **2.1 What it holds.** The Fuzzley Games wordmark, which links to
      `/`; "Snake" and a speed badge ("Normal"); Score and Best, each with
      its icon and label; and Pause, Sound (a speaker icon), New Game, How
      to play (?) and Settings (a gear). Labels and icons line up, and
      nothing is clipped.
- [ ] **2.2 Pause, dimmed.** Before a run starts and after it ends, Pause
      looks dimmed and has `aria-disabled="true"`. Clicking it does nothing.
- [ ] **2.3 Pause and Resume.** Mid-run, click Pause. The run pauses, the
      button turns to Resume with a play icon, and the board keeps the
      focus. Click Resume. The run goes on, the board has the focus, and →
      steers at once.
- [ ] **2.4 Sound.** Clicking it swaps the icon to speaker-off and sets
      `aria-pressed` to false, and the board keeps the focus mid-run. The
      Settings checkbox follows, and the choice survives a reload.
- [ ] **2.5 The tooltips.** Hovering Sound, How to play and Settings shows
      each name.
- [ ] **2.6 Score and Best.** Score goes up by one for each apple. Best
      shows the best at the current speed, and changes when the speed does.
      Note what Best does while a run passes it (lead 3).
- [ ] **2.7 The home link.** The wordmark leads to the site's home.
      Browser Back returns to the game, with the run paused (see 13.6).

## 3. The board and its cards

- [ ] **3.1 The board.** A square board of 17 × 17 squares, checkered,
      with a wall around it, centered in the room under the bar. It is
      crisp at the screen's scale, with no blur and no seams between
      squares.
- [ ] **3.2 The snake.** It has a distinct head. While gliding, it slides
      smoothly between squares and rounds its corners, with no gaps at a
      turn. While stepping, it jumps a square at a time.
- [ ] **3.3 The apple.** It is distinct from the snake in every palette
      (section 12), and pops in each time a new one is laid.
- [ ] **3.4 Eating.** The apple goes as the head reaches its square, not a
      square early or late, while gliding as well as stepping. Crumbs
      scatter and the bite sound plays. The snake grows by one square at
      its tail on the following steps.
- [ ] **3.5 The Ready card:** "Ready" over "Press an arrow key, or swipe,
      to start.", over the lower half of the board, clear of the snake's
      row. Note that it doesn't mention W, A, S and D, the mouse, or the
      on-screen arrows.
- [ ] **3.6 The Paused card:** "Paused", "Score N", and a Resume button
      that goes on and gives the board the focus.
- [ ] **3.7 The cards let swipes through.** Drag the mouse across the
      Ready card. The board takes the drag as a swipe (see 4.9), except on
      the Resume button.
- [ ] **3.8 The focus ring.** Tab away and Shift+Tab back to the board. A
      ring is drawn around the wall, not around the whole stage, and lines
      up with it, including after a resize. It never shows from a mouse
      click.
- [ ] **3.9 Right-click.** No context menu on the board.
- [ ] **3.10 Sounds.** The bite for an apple, the bump for a crash, the
      chime for a new best or a full board. None before the first key
      press, none with Sound off, none doubled, and none lost after a
      switch to another tab and back.

## 4. Controls

- [ ] **4.1 The arrow keys** steer up, down, left and right.
- [ ] **4.2 W, A, S and D** steer the same way. With an AZERTY layout
      (Windows: add French), Z, Q, S and D steer, because the keys are read
      by their place on the keyboard.
- [ ] **4.3 Space and P** pause a run and go on with it. **Escape** only
      pauses: pressed again, nothing happens.
- [ ] **4.4 A held key** turns once. Holding → while heading up turns
      right once and doesn't repeat.
- [ ] **4.5 Shortcuts pass through.** With the board focused, Ctrl+R
      reloads, Ctrl+L focuses the address bar, Ctrl+= zooms, Ctrl+Tab
      switches tabs and Alt+Tab switches windows. None of them steers. One
      that takes the focus from the page pauses the run, as section 7
      expects.
- [ ] **4.6 Keys the game doesn't use,** such as letters and digits, do
      nothing. Enter on the board does nothing, and Tab moves on.
- [ ] **4.7 The page doesn't scroll** from Space or the arrows.
- [ ] **4.8 Keys only reach the game with the board focused.** With a
      bar button, a dialog or the menu focused, the arrows and Space do
      what that control does, and never steer.
- [ ] **4.9 Dragging with the mouse.** Drag on the board: each 24 px of
      movement, mostly along one axis, turns the snake that way. One
      L-shaped drag makes two turns. A drag under 24 px does nothing.
      Record whether dragging feels intended. Help's "Touch or mouse"
      column says "Swipe on the board".
- [ ] **4.10 A click on the board** gives it the focus (keys work after),
      but doesn't start, pause or turn the run.
- [ ] **4.11 The on-screen arrows with a mouse.** In Settings, set the
      arrows to Always. The pad of four keys sits beside the board, off it
      and inside the window. A press turns the snake as the button goes
      down, not as it lifts. The board keeps the focus, with no ring. The
      key flashes the accent while pressed.
- [ ] **4.12 The on-screen arrows from the keyboard (lead 4).** Tab to
      Up. Record what happens to the run, then press Enter and Space on it,
      then try the arrow keys while it is focused.

## 5. Rules

Play at Normal unless a check says otherwise. Each check names the rule it
tests.

- [ ] **5.1 Starting.** At Ready, → starts the run straight on. ↑ and ↓
      start it with a turn. ← (back into the snake) does nothing, and the
      Ready card stays. Space, P and Escape don't start it.
- [ ] **5.2 No turning back.** Heading right, ← is ignored and the snake
      doesn't crash into its neck. The same holds in every direction.
- [ ] **5.3 Turning the way it already goes** does nothing.
- [ ] **5.4 Two quick turns are both taken.** Heading right, press ↑ then
      ← within one step, with two fingers rolled. The snake goes up one
      square, then left. It doesn't reverse into itself, and it doesn't
      lose the second turn.
- [ ] **5.5 A third quick turn is dropped.** Press ↑, ←, ↓ within one
      step. Only the first two are taken.
- [ ] **5.6 The queue goes by the turn it will be heading.** Heading
      right, press ↑ then ↓ within one step. ↓ is ignored, because it is
      back from the queued ↑. The snake goes up.
- [ ] **5.7 Walls.** Run into each of the four walls. Each time the run
      ends with "Ran into the wall". The snake never wraps to the other
      side.
- [ ] **5.8 Crossing itself.** With five squares or more, turn back into
      the body. The run ends with "Ran into itself".
- [ ] **5.9 Chasing the tail is allowed.** At Slow, after 9 apples (12
      squares), circle a 4 × 4 ring, turning every third step, so the head
      follows the tail round. Each step the head moves into the square the
      tail is leaving, and it never crashes. Keep it up for five laps. If
      an apple lands on the ring, start again.
- [ ] **5.10 Growing.** Each apple adds one square. After N apples the
      result card's Length is 3 + N, and Score is N.
- [ ] **5.11 Apples land only on free squares.** Over a long run (20+
      apples, or a seeded long snake, A.4), no apple appears under the
      snake, on the wall or off the board, and there is always exactly one.
- [ ] **5.12 Filling the board.** Seed a run with 284 apples (A.4), take
      it up and press →. The snake eats the last two apples and the run
      ends as a win: "You filled the board!", a trophy, "Every square
      filled, at Slow speed", Score 286 and Length 289. The chime plays.
      The announcer says "You filled the board! Score 286." plus "A new
      best!" if it is one.

## 6. Speeds and timing

Use the step timer (A.2). The first apple is eight steps from the head.

- [ ] **6.1 The first apple's time.** From pressing → to the score
      turning to 1: Slow ≈ 1280 ms, Normal ≈ 1000 ms, Fast ≈ 720 ms, each
      within a frame or two. Repeat three times at each speed.
- [ ] **6.2 Speeding up.** Each apple makes a step 2 ms shorter, down to a
      floor: Slow 160 ms to 100 ms (from 30 apples), Normal 125 ms to 70 ms
      (from 28), Fast 90 ms to 55 ms (from 18). A seeded run (A.4) has its
      apple on the next square, so the time from the key that goes on to
      the score changing (A.2) is one step. Average five tries of each:

  | Apples eaten | Slow   | Normal | Fast  |
  | ------------ | ------ | ------ | ----- |
  | 10           | 140 ms | 105 ms | 70 ms |
  | 40           | 100 ms | 70 ms  | 55 ms |

  Then play on: a run at its floor stays playable.

- [ ] **6.3 The refresh rate doesn't change the speed.** On a 120 Hz or
      144 Hz screen, if there is one, 6.1 gives the same times. Under
      DevTools' CPU throttling at 6×, the times hold, and a frame that
      takes two steps never skips an apple or carries the snake through a
      wall.
- [ ] **6.4 Glide and Step take the same time.** 6.1 gives the same times
      with Movement set to Step. Only the drawing differs.
- [ ] **6.5 Input feels prompt.** At Fast near the floor, a turn pressed
      just before a step is taken on that step. Look for a dropped or late
      turn. A slow-motion screen recording helps.

## 7. Pausing and the focus

Each check starts with a run under way.

- [ ] **7.1 Another tab.** Switch to another tab and back. The run is
      paused, the Paused card shows, and the announcer said "Paused, with a
      score of N. Press a direction to go on."
- [ ] **7.2 Another window.** Alt+Tab to another window, or click the
      taskbar, without hiding the page. The run pauses as the board loses
      the focus.
- [ ] **7.3 Minimizing the window** pauses.
- [ ] **7.4 The page around the board.** Click on the stage beside the
      board, or on the bar's title or score. Record whether the run pauses
      (the board loses the focus).
- [ ] **7.5 Tab out of the board** pauses.
- [ ] **7.6 Going on.** From paused, each of these goes on and says
      "Going on.": a direction that turns, the direction the snake already
      heads, Space, P, Resume on the card, and Resume in the bar. The
      direction back doesn't (lead 1); record what the player sees then.
- [ ] **7.7 Dialogs pause.** Opening How to play, Settings or the New Game
      question pauses the run. Closing them leaves it paused, with the
      board focused, so a direction goes on at once.
- [ ] **7.8 Paused stays paused.** Over a minute paused, nothing moves.
      The snake is drawn where it stopped, partway between squares if it
      glides, and goes on from there without a jump.
- [ ] **7.9 Pause, then New Game.** From paused, New Game asks first
      (section 9).

## 8. The end of a run and the result card

- [ ] **8.1 The crash.** The head stops at the wall or the body, not drawn
      over it. The board shakes briefly and the snake fades over about
      0.6 s. The bump sound plays, or the chime for a new best. Then the
      result card opens.
- [ ] **8.2 The card:** "Game over" with "Ran into the wall, at Normal
      speed" (or "Ran into itself"). Score, Best (counting this run) and
      Length, each value above its term, and New Game focused. "Or another
      speed" offers the two other speeds, then Close.
- [ ] **8.3 A new best:** a trophy over the title, a "New best" badge
      after the subtitle, the chime instead of the bump, and "A new best!"
      at the end of the announcement.
- [ ] **8.4 Equalling the best isn't a new one.** Score exactly the best.
      Expect no badge, no chime and no "A new best!".
- [ ] **8.5 Scoring 0** on a fresh profile is not a new best.
- [ ] **8.6 The announcement.** For example: "The snake ran into the
      wall. Score 4. A new best!" The card is an alert dialog, named by its
      title and described by its subtitle.
- [ ] **8.7 New Game** on the card starts a run at the same speed, asks
      nothing, shows Ready, and gives the board the focus.
- [ ] **8.8 Another speed** starts a run at that speed, asks nothing,
      updates the bar's badge and Best, and keeps the speed in Settings.
- [ ] **8.9 Close and Escape** both close the card, leaving the faded
      snake on the board and the focus on the board. Then try every key
      (lead 2): record what a player can do to start again.
- [ ] **8.10 Keys under the card.** With the card open, arrows and Space
      act on the card's buttons, never on the board.

## 9. New Game and changing speed

- [ ] **9.1 New Game with nothing to lose** (at Ready, or after a run has
      ended) starts a new run at once, asking nothing.
- [ ] **9.2 New Game mid-run** pauses, then asks "Start a new game?" /
      "The run in progress will be lost." with a red "New game" button.
      Cancel and Escape keep the run, paused, with the score as it was.
      Confirming deals a new run at Ready, with the focus on the board.
- [ ] **9.3 A speed mid-run.** In Settings, choose another speed. The same
      question opens over the drawer. Cancel leaves the old speed checked
      and the run as it was. Confirming starts a run at the new speed,
      updates the badge and Best, and the drawer stays open.
- [ ] **9.4 The speed in use,** chosen again, does nothing and asks
      nothing.
- [ ] **9.5 The new run is new.** After a new game the apple isn't always
      in the same second place: compare the second apple over three new
      runs (each run has its own seed).
- [ ] **9.6 Runs counted.** `snake-stats` (A.3) counts a run at its first
      direction, not at Ready. A run abandoned by New Game still counts.

## 10. Settings

- [ ] **10.1 The drawer.** "Settings" with a close button ("Close
      settings"), then Speed, Movement, On-screen arrows, Sound and Theme.
      Escape, the close button and a click outside all close it, and the
      focus goes back to the board.
- [ ] **10.2 Speed:** Slow "Time to think between turns.", Normal "The
      classic pace.", Fast "Quick from the start.", with "Changing the
      speed starts a new run. Each apple makes the snake a little faster."
      under them.
- [ ] **10.3 Radio groups.** In each group the arrow keys move between
      choices without choosing, Space or Enter chooses, and Tab moves to
      the next group. A screen reader hears each choice by its name and
      description, with its checked state.
- [ ] **10.4 Movement.** Glide ("Slides smoothly from square to square.")
      and Step ("Jumps a whole square at a time.") apply at once, mid-run
      too, with no jump in the snake's place.
- [ ] **10.5 On-screen arrows.** "On a touch screen" (the default, no
      arrows with a mouse), "Always" (the arrows beside the board, which
      shrinks to make room) and "Never". Each change applies at once,
      without losing the run.
- [ ] **10.6 Sound.** The "Play sounds" checkbox, with its description,
      follows the bar's Sound button both ways.
- [ ] **10.7 Theme.** Section 12.
- [ ] **10.8 Kept.** Every choice survives a reload (`snake-settings`).

## 11. How to play

- [ ] **11.1 Opening and closing.** The ? button opens it. Escape, "Close
      How to play" and a click outside close it, and the focus goes back to
      the board.
- [ ] **11.2 The words match the game.** Check each claim against what
      sections 5 to 7 found: one point and one square per apple, speeding
      up, the two ways to end, filling the board, two quick turns, three
      speeds with a best each, the settings, and pausing. "Goes on only
      when you say: with a direction, Space, or Resume" leaves out P, and
      a direction back (lead 1).
- [ ] **11.3 The table.** Start or turn, pause or go on, and pause, by
      touch or mouse and by keyboard. Headers are read as headers. The
      table fits without scrolling sideways.

## 12. Palettes

For each of Classic felt, Soft pastel, Casino night and Midnight blue:

- [ ] **12.1 The board changes at once,** mid-run too, with no run lost:
      the squares, the wall, the snake, its head and the apple. The bar,
      cards and dialogs follow.
- [ ] **12.2 Legible.** The snake, its head and the apple stand out from
      both shades of square. The cards' text and the bar's figures read
      clearly. Take a screenshot of each palette for the write-up.
- [ ] **12.3 Shared with the site.** Choose a palette in Snake, then open
      the site: it wears the same one. Choose one on the site and come
      back: Snake wears it, with no flash of the old one as the page loads.
- [ ] **12.4 The placeholder** (1.1) draws in the palette too, with no
      flash of another one before the scene draws.

## 13. Keeping a run

- [ ] **13.1 Reload mid-run.** Expect the same snake, apple, score and
      speed, paused, with "Your last run is paused, with a score of N.
      Press a direction to go on." A direction goes on from where it was.
- [ ] **13.2 Reload at Ready** gives a fresh run: a run that never started
      isn't kept.
- [ ] **13.3 Reload after a crash,** with the card open or closed, gives a
      fresh run. Stats and best are kept.
- [ ] **13.4 Closing the tab mid-run** and opening the game again takes the
      run up, paused.
- [ ] **13.5 Two tabs.** Play in one tab, then open the game in a second.
      Record which run each shows, and what happens to stats and the saved
      run when both are played. The last write wins, so state the result
      plainly.
- [ ] **13.6 Back and forward.** Mid-run, follow the home link, then
      browser Back. Whether the page comes back from the back/forward cache
      or reloads, the run is paused where it was.
- [ ] **13.7 Storage it can't trust (A.5).** Corrupt `snake-game`,
      `snake-settings` and `snake-stats` in turn: text that isn't JSON,
      another version, a snake crossing itself, an apple under the snake, a
      negative score. Each time the page loads with defaults (a fresh run,
      default settings, zero stats) and at most a warning in the console,
      never an error or a blank page.
- [ ] **13.8 No storage.** With site data blocked for fuzzley.games
      (chrome://settings/content/siteData), the game loads and plays, and
      only forgets.

## 14. Accessibility

- [ ] **14.1 Tab order:** the board, then the arrows (when shown), then
      the bar. The `<main>` landmark holds the board. There is one `<h1>`,
      "Snake".
- [ ] **14.2 The board's name.** In the accessibility tree: role
      application, "game board", named "Snake, 17 by 17", described by "The
      arrow keys, or W, A, S and D, steer the snake. Space or P pauses and
      goes on, and Escape pauses." The canvas is hidden.
- [ ] **14.3 Announcements (A.1):** "Started, at Normal speed." at the
      first direction, the pause and going-on messages, the end message
      (8.6), and the message after a reload (13.1). Nothing at each apple.
      The bar's figures aren't a live region.
- [ ] **14.4 NVDA or Narrator.** With the board focused, the arrows reach
      the game rather than reading the page, and each announcement above is
      heard. Bar buttons, dialogs and settings are named and read their
      state (Sound pressed, radios checked).
- [ ] **14.5 Reduced motion.** In DevTools, under Rendering, emulate
      `prefers-reduced-motion: reduce`. The apple appears with no pop,
      there are no crumbs and no shake, the crashed snake fades at once,
      and the result card opens without waiting. Gliding still glides.
      Record whether that is right.
- [ ] **14.6 Contrast.** The focus ring, the dimmed Pause, and the cards'
      text over the board meet 3:1 and 4.5:1 in every palette.
- [ ] **14.7 Lighthouse** on /play/snake/: accessibility, best practices
      and SEO, with the scores and any audit that fails.

## 15. Window sizes, zoom and resizing

Use DevTools' responsive mode without touch, or resize the window.

- [ ] **15.1 Sizes:** 1920 × 1080, 1366 × 768, 1280 × 720 (the narrowest
      with the wordmark), 1279 × 800 (the home icon instead), 1199 × 800
      (actions lose their labels), 1024 × 768, 720 × 500 (the smallest
      roomy window), and 719 × 600 and 900 × 499 (compact: the bar moves to
      the bottom or down the side, and Sound, How to play and Settings move
      into the ⋮ menu). At each, record the square size (A.3), that the
      board is square, centered and whole, and that nothing scrolls or
      overlaps.
- [ ] **15.2 Resizing mid-run.** Drag the window's edge while the snake
      moves. The board lays itself out again, stays crisp, and the ring
      and cards follow. The run isn't harmed, and doesn't pause unless the
      focus moves.
- [ ] **15.3 Browser zoom:** 50 %, 90 %, 110 %, 125 %, 150 %, 200 % and
      300 %. The board is redrawn sharp at each. Check that the Ready and
      Paused cards and the placeholder line up with the drawn board after
      the zoom, without a reload (lead 5). At 300 % the window reads as
      compact; check the layout.
- [ ] **15.4 Another screen.** If there are two screens at different
      Windows scales, drag the window across mid-run. The board is crisp
      on each, and the cards line up (lead 5).
- [ ] **15.5 Full screen.** F11 mid-run (it pauses if the focus leaves),
      then out again.

## 16. Performance and robustness

- [ ] **16.1 Frame rate.** Record a 30 s DevTools performance trace of a
      run at Fast. Expect a steady 60 fps (or the screen's rate), no long
      tasks while playing, and no garbage-collection pauses that drop
      frames.
- [ ] **16.2 Twenty runs.** Play or deal twenty runs with New Game, then
      take a heap snapshot. Memory stays flat after the first few runs. The
      console never warns of too many WebGL contexts.
- [ ] **16.3 A slow machine.** Under CPU throttling at 6×, the game stays
      playable and keeps its speed (6.3).
- [ ] **16.4 A lost context.** Lose the board's WebGL context and restore
      it (A.6), with a run paused. The board, the apple and the snake are
      drawn again, and the run goes on. Record what the player sees in
      between.
- [ ] **16.5 Left for an hour.** Leave a paused run in a background tab
      for an hour, then come back. It is still paused, and goes on.
- [ ] **16.6 Lighthouse performance** on /play/snake/: the score, LCP and
      CLS, with the drawn board replacing the placeholder adding no layout
      shift.

## 17. Reaching the game from the site

- [ ] **17.1 Home.** On https://fuzzley.games/, the Arcade section,
      "Quick games against the clock, played on reflexes.", shows Snake's
      tile with its thumbnail and a "New" badge (until 30 days after
      2026-10-28).
- [ ] **17.2 Search.** Searching "snake" on the site finds it.
- [ ] **17.3 Arcade's page** (`/category/arcade`, through "See all") lists
      Snake.
- [ ] **17.4 Snake's page** (`/games/snake`): a link back to Arcade,
      "Snake", "Eat, grow and keep clear of your own tail.", one player and
      about 3 minutes, the preview, and "Play Snake". The tab says Snake
      with the site's name.
- [ ] **17.5 Play.** "Play Snake", and a click on the preview, both open
      /play/snake/ in the same tab. Back returns to the game's page.
- [ ] **17.6 Addresses.** /play/snake (no slash) and /play/snake/index.html
      reach the game, or redirect to it. /play/snake/nope gives the site's
      not-found page or a plain 404, not a blank page.
- [ ] **17.7 The link preview.** The page's `og:` and `twitter:` tags give
      the title, a description and a 2560 × 1440 image, and the image
      loads.

## 18. Other desktop browsers

Repeat sections 1, 3, 4 and 7, a quick pass of 5 and 8, and 15.1 at three
sizes, in each:

- [ ] **18.1 Edge.**
- [ ] **18.2 Firefox.** Firefox draws through its own WebGL. Check that
      the placeholder board (CSS `round()`, container queries) lines up
      with the drawn one, that the focus on load works without a ring
      (1.6), and that the sounds play.

## Not covered

- **Safari on macOS,** unless a Mac is to hand. Its WebGL, audio unlock
  and `focus()` options differ the most. The mobile plan covers Safari on
  iOS.
- **Gamepads,** which the game turns off.
- **JAWS,** which isn't installed here; NVDA and Narrator stand in for it.

## Reporting

Write the findings as in `docs/archive/sudoku-qa-plan.md`: how it was
tested (browsers, sizes, the build), what works well, "Ruled out" for leads
that weren't real, a summary table, then each finding with its priority,
effort, what happened (with the check's number, a screenshot or a short
recording), options and a recommendation. End with the decisions for the
user. As a guide to priority:

- **High:** a rule broken (a crash that shouldn't be, a turn lost, a wrong
  score or best), a run or stats lost, the game not loading or not
  playable in a supported browser, or a keyboard or screen-reader player
  blocked.
- **Medium:** a control or a message that misleads, a layout that hides or
  clips something at a common size, or a focus or pause that surprises.
- **Low:** polish: alignment, wording, motion and small visual faults.

## Appendix: helpers for the console

Run these in DevTools' console on /play/snake/. Then click the board before
playing, since the console takes the focus.

### A.1 What the announcer says

```js
const announcer = document.querySelector("fz-announcer");
new MutationObserver(() => {
  const said = announcer.textContent.trim();
  if (said) console.log("said:", said);
}).observe(announcer, { subtree: true, childList: true, characterData: true });
```

### A.2 A timer for steps

Logs the time from the first key pressed on the board to each change of
score. Reload to time again.

```js
let pressed = 0;
document.querySelector("app-board").addEventListener(
  "keydown",
  () => {
    pressed ||= performance.now();
  },
  true,
);
const score = document.querySelector("app-bar dd");
new MutationObserver(() => {
  console.log(
    "score",
    score.textContent.trim(),
    Math.round(performance.now() - pressed),
    "ms",
  );
}).observe(score, { subtree: true, childList: true, characterData: true });
```

### A.3 The board's size, and what is kept

```js
const [, , width] = document
  .querySelector("app-board")
  .dataset.board.split(" ")
  .map(Number);
console.log("square:", (width / 17).toFixed(2), "CSS px");
for (const key of ["snake-settings", "snake-stats", "snake-game"]) {
  console.log(key, JSON.parse(localStorage.getItem(key) ?? "null"));
}
```

### A.4 A seeded run

Keeps a run with `eaten` apples in, the snake laid along the rows from the
top left, heading on along them, with the apple on the next square, then
reloads, so the game takes it up, paused. The game writes its own run as the
page goes away, so the seed is written after it. `eaten` runs from 0 to 285.
Seeded with 284, the run wins in two steps (5.12).

```js
function seedRun(eaten, speed = "normal") {
  const size = 17;
  const path = [];
  for (let y = 0; y < size; y++) {
    for (let i = 0; i < size; i++) path.push([y % 2 ? size - 1 - i : i, y]);
  }
  const length = 3 + eaten;
  const snake = path.slice(0, length).reverse();
  const [headX] = snake[0];
  const [appleX, appleY] = path[length];
  const heading = appleX > headX ? "right" : appleX < headX ? "left" : "down";
  const saved = JSON.stringify({
    version: 1,
    snake,
    heading,
    turns: [],
    apple: [appleX, appleY],
    seed: 12345,
    eaten,
    speed,
    steps: length,
  });
  addEventListener("pagehide", () => {
    localStorage.setItem("snake-game", saved);
  });
  location.reload();
}

seedRun(284, "slow");
```

### A.5 Storage it can't trust

Each line, run alone, reloads with one entry spoiled. For the stats or the
settings, change the key and the value. Neither is written as the page goes
away, but the pagehide write does no harm.

```js
function spoil(key, value) {
  addEventListener("pagehide", () => {
    localStorage.setItem(key, value);
  });
  location.reload();
}

spoil("snake-game", "{not json");
spoil("snake-game", JSON.stringify({ version: 2 }));
spoil("snake-settings", JSON.stringify({ version: 1, speed: "warp" }));
spoil("snake-stats", JSON.stringify({ version: 1, normal: { runs: -1 } }));
```

For a snake that crosses itself or an apple under the snake, take a real
save from A.3, edit it, and spoil `snake-game` with it.

### A.6 A lost WebGL context

```js
const canvas = document.querySelector("app-board canvas");
const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
const lose = gl.getExtension("WEBGL_lose_context");
lose.loseContext();
setTimeout(() => {
  lose.restoreContext();
}, 2000);
```
