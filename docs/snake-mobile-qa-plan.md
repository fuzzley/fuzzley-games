# Plan: QA of Snake on phones and tablets, upright and sideways

A plan for a hands-on pass over Snake on the live site,
https://fuzzley.games/play/snake/, with a finger, on phones and tablets
held both ways. It runs the whole flow, from the site's home page to a run
and back, once upright and once sideways, then checks what is particular to
touch and small screens: the layout at each size, turning the device
mid-run, swipes and the on-screen arrows, and what the browser and the
system do around the page. Written 2026-10-28 from the code on `main` at
`cfd56a6`. Paths are relative to `frontend/games/snake/`.

The desktop plan, `docs/snake-qa-plan.md`, tests the rules, the timing and
the storage in depth, and this plan doesn't repeat them. It borrows that
plan's console helpers (its appendix, A.1 to A.6) and its way of reporting:
findings shaped like `docs/archive/sudoku-qa-plan.md`. Where both plans
find the same thing, report it once and say where it shows.

## Before starting

- **Note the build** from `https://fuzzley.games/version.json`, as the
  desktop plan does.
- **Emulation, for the sizes.** Chrome's device toolbar, with the device
  type set to Mobile. This gives a touch pointer (`pointer: coarse`),
  which shows the arrows, and the rotate button turns the device. For an
  agent, use the DevTools MCP's visible Chrome with `emulate` and
  `resize_page`, not the desktop app's hidden browser pane.
- **Real devices, for what emulation can't show:** an iPhone with Safari,
  an Android phone with Chrome, and an iPad with Safari if there is one.
  Samsung Internet and Firefox on Android are worth a quick pass if they
  are to hand. Connect the phone for remote debugging (Safari's Web
  Inspector, or `chrome://inspect`) to read the console and run the
  helpers.
- **A fresh start.** Clear the site's data, or use a private tab, for the
  first walk through.
- **Analytics off,** as in the desktop plan. On a real phone, a private tab
  and a content blocker, or remote debugging with request blocking.
- **Sound on,** and the ring/silent switch noted on an iPhone.
- **Record** a screenshot at each size, and a screen recording of each
  orientation change and of anything that moves wrongly.

## The shapes to expect

The game changes shape by the window's size in CSS pixels
(`@fz/game-ui`'s breakpoints). A window is compact when it is narrower
than 720 px or shorter than 500 px.

| Window                                | Bar                      | Link home                | Arrows, by default |
| ------------------------------------- | ------------------------ | ------------------------ | ------------------ |
| Compact, upright, 360 px wide or more | Along the bottom         | Home button, in the bar  | Under the board    |
| Compact, upright, under 360 px wide   | Along the bottom         | First item of the ⋮ menu | Under the board    |
| Compact, sideways                     | Down the right-hand side | Home button, in the bar  | Beside the board   |
| Roomy (a tablet), under 1280 px wide  | Across the top           | Home button              | Under or beside    |
| Roomy, 1280 px wide or more           | Across the top           | Fuzzley Games wordmark   | Beside the board   |

On a compact screen the bar keeps the speed badge, Score, Best, Pause and
New Game, as round buttons without labels. Sound ("Turn sound off" or
"Turn sound on"), How to play and Settings move into the ⋮ menu. On a
roomy screen the actions have labels from 1200 px wide. The arrows show on
a touch screen, unless Settings says Always or Never.

## Sizes

Run section 1 on the starred sizes. Run section 3, the layout checks, on
all of them. Each is in CSS pixels, at the device's pixel ratio.

| Upright                              | Sideways                             |
| ------------------------------------ | ------------------------------------ |
| ★ 390 × 844, iPhone 15, 3×           | ★ 844 × 390, iPhone 15, 3×           |
| 390 × 664, the same in Safari's bars | 750 × 342, the same in Safari's bars |
| 430 × 932, iPhone Pro Max, 3×        | 932 × 430, iPhone Pro Max, 3×        |
| 375 × 667, iPhone SE, 2×             | 667 × 375, iPhone SE, 2×             |
| ★ 375 × 553, iPhone SE in Safari     | ★ 667 × 320, iPhone SE in Safari     |
| ★ 412 × 915, Pixel 8, 2.6×           | ★ 915 × 412, Pixel 8, 2.6×           |
| 360 × 640, a small Android, 3×       | 640 × 360, a small Android, 3×       |
| ★ 320 × 480, the smallest, 2×        | ★ 568 × 320, the smallest, 2×        |
| ★ 768 × 1024, iPad, 2×               | ★ 1024 × 768, iPad, 2×               |
| 820 × 1180, iPad Air, 2×             | 1180 × 820, iPad Air, 2×             |
| 1024 × 1366, iPad Pro, 2×            | 1366 × 1024, iPad Pro, 2×            |

## Leads to confirm or rule out

Reading the code suggests these. Each is a question for the pass, not yet
a finding.

1. **Small squares on short screens.** With the arrows showing, the board
   gets what the arrows and the bar leave. At 320 × 480 upright, and at
   568 × 320 sideways, a square may fall under the 16 CSS px that
   `yarn check:layout` holds the board to. That check measures only three
   shapes.
2. **Turning the phone doesn't pause the run.** The snake keeps moving
   while the layout changes, and a turn takes the browser half a second or
   more.
3. **Screen readers and the arrows.** An arrow turns the snake when a
   pointer goes down on it, or on a click from the keyboard, whose
   `detail` is 0 (`arrows.component.ts`). A VoiceOver or TalkBack double
   tap may send a click with a `detail` of 1 and no pointer before it,
   and then turn nothing.
4. **The edges belong to the system.** Upright, the board runs close to
   the screen's sides, so a swipe that starts near an edge may be taken as
   the browser's or the system's Back gesture.
5. **The Ready card speaks of keys.** "Press an arrow key, or swipe, to
   start." On a phone the arrows are buttons under the board, and with the
   arrows set to Never only a swipe works.
6. **The result card on a short screen.** It holds a title, a subtitle,
   three figures, New Game, two other speeds and Close. At 320 px tall it
   may need to scroll, or clip.
7. **No safe areas.** The page doesn't set `viewport-fit=cover`, so iOS
   should keep it clear of the notch and the home indicator by itself.
   Check that it does, sideways both ways, and in a home-screen web app.
8. **Slow phones on slow networks.** The board fails after 8 s without a
   drawn scene, and an arrow can start a run before Phaser arrives (the
   desktop plan's leads 6 and 7). A phone on a weak signal is where they
   would show.

## 1. The whole flow

Walk through it on each starred size: first upright, then sideways from
the start. Step 1.12 turns the device mid-flow. Each step lists what to
check.

### 1.1 From the site to the game

- [ ] **The home page** loads at the size, with the Arcade section,
      "Quick games against the clock, played on reflexes.", and Snake's
      tile with its thumbnail and a "New" badge. The tile is easy to tap.
- [ ] **Search.** "snake" in the site's search finds it.
- [ ] **Snake's page** (`/games/snake`): the link back to Arcade, "Snake",
      the blurb, one player and about 3 minutes, the preview and "Play
      Snake", all fitting without sideways scrolling.
- [ ] **Play** opens /play/snake/ in the same tab.

### 1.2 The first load

- [ ] **The order of paint.** The bar and a CSS drawing of the empty board
      come first, with the Ready card. The drawn board takes over in the
      same place, with no jump or flash. On a real phone, try it on mobile
      data too.
- [ ] **The layout** matches "The shapes to expect": the bar's place, the
      link home, the arrows under or beside the board, the speed badge,
      Score 0 and Best 0. Nothing scrolls.
- [ ] **The browser's toolbar** takes the page's color, on Android Chrome
      and in iOS Safari's tinted bars.
- [ ] **The Ready card** sits over the board's lower half, inside the
      board, readable at the size (lead 5).

### 1.3 A run steered by swipes

- [ ] **Starting.** A swipe right starts the run straight on. Up or down
      starts it with a turn. A swipe left (back into the snake) does
      nothing.
- [ ] **The threshold.** A swipe shorter than about 24 CSS px does
      nothing. A slow swipe counts as much as a quick one.
- [ ] **Diagonals** turn along the axis the finger moved most.
- [ ] **Two turns in one gesture.** An L-shaped swipe, such as up then
      left, makes both turns, one square apart.
- [ ] **A tap** on the board, without moving, neither starts, pauses nor
      turns the run.
- [ ] **The page doesn't move.** No swipe on the board scrolls, zooms,
      selects text, pulls to refresh, or shows a callout from a long press.
- [ ] **Swipes over the cards.** A swipe that starts on the Ready or
      Paused card steers, except on its Resume button.
- [ ] **Off the board.** A swipe that starts on the arrows or the bar
      doesn't steer. One that starts on the board and leaves it turns as
      it goes, and lifting the finger outside ends it.
- [ ] **Two fingers.** A second finger during a swipe doesn't turn the
      snake wildly or zoom the page.
- [ ] **Eating and the score.** The apple goes as the head reaches it. The
      bite sound plays, and Score in the bar counts up.

### 1.4 A run steered by the arrows

- [ ] **The pad:** four keys, up above, down below, and left and right
      between them, each about 64 px. They sit off the board and inside
      the window, clear of the bar and the screen's edges. Their chevrons
      point the right ways.
- [ ] **A press turns at once,** as the finger lands, not as it lifts.
      Holding a key turns once and doesn't repeat.
- [ ] **Quick presses.** Two keys tapped within one step are both taken. A
      third is dropped.
- [ ] **The key shows its press** in the accent color, with no blue flash
      from Android and no double-tap zoom.
- [ ] **Starting with the arrows.** At Ready, Right or Up starts the run.
      Left does nothing.
- [ ] **Thumbs.** Steer a whole run by thumb, upright with one hand and
      sideways with two. Note whether the keys sit where a thumb rests, and
      any missed or doubled presses.
- [ ] **Swipes still work** with the arrows showing.

### 1.5 Pausing and going on

- [ ] **Pause in the bar** pauses the run without taking the focus from
      the board. The Paused card shows "Score N" and Resume. The bar's
      button shows the play icon.
- [ ] **Going on** works from the card's Resume, the bar's button, a swipe
      or an arrow, in a direction other than straight back. Note what
      happens with a swipe straight back (desktop lead 1).
- [ ] **The ⋮ menu** pauses the run when it opens, and closing it leaves
      the run paused.
- [ ] **A tap beside the board,** on the stage or on the bar's score.
      Record whether it pauses the run. On iOS a tap on something that
      can't take the focus may not move it.

### 1.6 The end of a run

- [ ] **The crash:** the shake, the fade, the bump (or the chime for a new
      best), then the result card.
- [ ] **The card fits.** Title, subtitle, Score, Best and Length, New Game,
      "Or another speed" with its two buttons, and Close, all readable and
      reachable, scrolling inside the card if it must (lead 6). Each button
      is at least 44 px tall.
- [ ] **New Game** deals a run at the same speed. **Another speed** deals
      one at that speed and updates the badge and Best. **Close** leaves
      the faded snake to look at. Record how a player starts again after
      Close (desktop lead 2).

### 1.7 New Game mid-run

- [ ] **The question.** "Start a new game?" / "The run in progress will be
      lost." fits, with Cancel and "New game" easy to tap. The run is
      paused behind it. Cancel keeps the run, paused. "New game" deals
      a new one at Ready.

### 1.8 The ⋮ menu

- [ ] **It opens** within the screen, upward from the bottom bar when
      upright and beside the rail when sideways, and nothing is cut off.
      Tapping outside it closes it.
- [ ] **Sound.** "Turn sound off" turns the sound off and becomes "Turn
      sound on". The Settings checkbox follows.
- [ ] **The link home** is its first item on a screen under 360 px wide,
      and it takes you to the site.

### 1.9 How to play

- [ ] **It fits.** The words wrap, the table of controls fits without
      sideways scrolling, or scrolls inside the dialog, and the close
      button is easy to reach and tap.
- [ ] **The words are right for touch.** The "Touch or mouse" column says
      to swipe or use the arrows, and to tap Pause and then Resume.

### 1.10 Settings

- [ ] **The drawer** fits, scrolls inside itself on a short screen, and
      every setting can be reached, the palettes at the end included. The
      close button is easy to tap.
- [ ] **A speed mid-run** asks first, over the drawer. Cancel leaves the
      old speed checked.
- [ ] **Movement.** Glide and Step both play smoothly on the device.
- [ ] **On-screen arrows: Never.** The arrows go, and the board grows into
      their room. Swipes still steer. The Ready card's words still make
      sense (lead 5). Back to "On a touch screen", the arrows return.
- [ ] **Palettes.** Each of the four reads well on the device's screen,
      in daylight and in a dim room. The snake, its head and the apple
      stand out from both shades of square.
- [ ] **Kept.** The choices survive a reload.

### 1.11 Back to the site and back again

- [ ] **The link home,** mid-run, goes to the site's home page. Browser
      Back, or the system Back gesture, returns to the game with the run
      paused where it was.
- [ ] **The palette** chosen in the game is the site's too, and the other
      way round.

### 1.12 Turning the device

At each of these moments, turn the device to the other orientation, then
back:

- [ ] **At Ready.** The bar moves between the bottom and the side, the
      arrows between under and beside the board, and the board grows or
      shrinks to fit. The Ready card stays over the board. Nothing is left
      blurred, and the focus ring and cards line up with the board.
- [ ] **Mid-run (lead 2).** Record whether the snake keeps moving through
      the turn, whether it crashes before the player can see the board
      again, and whether the score and the snake's place are kept.
- [ ] **Paused.** The run stays paused, and the Paused card is placed
      right.
- [ ] **With each overlay open:** the ⋮ menu, Settings, How to play, the
      New Game question and the result card. Each lays itself out again
      and can still be used and closed. Closing it gives the board the
      focus.
- [ ] **Five quick turns in a row.** No blur, no wrong size, and no
      warning in the console.

### 1.13 Leaving and coming back

- [ ] **Another app.** Mid-run, switch to another app and back. The run
      is paused.
- [ ] **The lock screen.** Lock the phone mid-run and unlock it. The run
      is paused.
- [ ] **A notification** pulled down over the page, or a call. Record
      whether the run pauses.
- [ ] **A reload mid-run** takes the run up, paused, with the same snake,
      apple and score.
- [ ] **A closed tab.** Mid-run, close the tab from the tab switcher and
      open the game again. The run is taken up, paused, because it was
      written as the page went away.
- [ ] **A discarded tab.** Leave the game in a background tab for a long
      time, or open many heavy tabs, until the browser reloads it. The run
      is taken up, paused.

## 2. Touch details

- [ ] **2.1 Missed starts.** Count missed or wrong turns over ten runs of
      swipes, and ten of arrows. A swipe meant as a turn that registers
      as nothing, or as the wrong way, is a finding.
- [ ] **2.2 Speed.** At Fast near its floor (a seeded run, A.4), swipes
      and arrows still keep up.
- [ ] **2.3 A finger resting on the pad.** With one thumb resting on a
      key, the other can still press another, and the snake turns.
- [ ] **2.4 Big fingers, small board.** At 320 × 480 and 568 × 320, swipe
      steering stays possible, with no turns from a finger brushing the
      board by accident.
- [ ] **2.5 A keyboard on a tablet.** With a hardware keyboard on an iPad
      or an Android tablet, the keys steer, the arrows still show, and
      tapping an arrow doesn't stop the keys working.
- [ ] **2.6 Edges (lead 4).** Start a swipe near the screen's left and
      right edges, upright and sideways. On iOS Safari and on Android with
      gesture navigation, record whether the system's Back gesture takes
      it.

## 3. The layout at each size

At each size in "Sizes", with the arrows on (the default on touch), then
with them set to Never at the starred sizes:

- [ ] **3.1 Measure it.** Run A.3 for the square size, and record it. A
      square under 16 CSS px is a finding (lead 1).
- [ ] **3.2 The board** is square, whole, inside the window, and clear of
      the bar and the arrows. It is centered with the arrows in the room
      the bar leaves.
- [ ] **3.3 Nothing scrolls,** the page or the stage, and nothing is cut
      off.
- [ ] **3.4 The bar.** The badge, Score and Best fit next to the buttons
      without wrapping or clipping, with Score at two digits and Best at
      three. To seed the best, run this and reload:
      `localStorage.setItem("snake-stats", JSON.stringify({ version: 1, normal: { runs: 1, best: 286, longest: 289 } }))`.
- [ ] **3.5 The cards** (Ready and Paused) fit inside the board, with
      their words and the Resume button readable and tappable.
- [ ] **3.6 Tap targets.** Every button in the bar, the menu and the
      dialogs is at least 44 × 44 px.
- [ ] **3.7 Crisp.** The board, the apple and the snake are sharp at the
      device's pixel ratio, with no seams between squares.
- [ ] **3.8 Larger text.** On Android, with the system font size at its
      largest, or in Chrome's text scaling at 150 % or more, the bar,
      cards, menu and dialogs still fit and read.

## 4. The browser and the system (real devices)

- [ ] **4.1 Safari's moving bars.** In iOS Safari, upright and sideways,
      the toolbars expand and collapse. The board resizes without a jump,
      and the bottom bar is never hidden under Safari's toolbar or the home
      indicator.
- [ ] **4.2 The notch (lead 7).** Turn the iPhone sideways both ways,
      with the notch on the left and then on the right. Nothing sits under
      the notch or the camera, and the rail is fully visible.
- [ ] **4.3 On the home screen.** Add the game to the home screen in iOS
      Safari and in Android Chrome, and open it from there. Note how it
      opens (a browser tab or a window of its own) and whether the safe
      areas hold.
- [ ] **4.4 Pull to refresh.** In Android Chrome, swiping down on the
      board, the arrows or the bar never refreshes the page.
- [ ] **4.5 Sound.** The first sound plays after the first touch. On an
      iPhone, note what the silent switch does. Sound off in the ⋮ menu is
      silent. Sounds go on working after the app comes back from the
      background.
- [ ] **4.6 Low Power Mode** (iOS) and battery saver (Android), which may
      halve the frame rate. The snake keeps its speed and still glides.
- [ ] **4.7 Other browsers.** A quick pass of section 1 in Samsung
      Internet and Firefox on Android, if they are to hand.

## 5. Accessibility on touch

- [ ] **5.1 VoiceOver (iOS) and TalkBack (Android).** Swipe through the
      page. The board is announced as "Snake, 17 by 17", a game board.
      The arrows are a group, "Arrows", with Up, Left, Right and Down. The
      bar's buttons and the ⋮ menu's items are named.
- [ ] **5.2 Steering with a screen reader on (lead 3).** Focus Up and
      double-tap. Record whether the snake turns, and whether a run can be
      played this way at Slow.
- [ ] **5.3 Announcements.** The start, a pause, going on, the end and a
      run taken up after a reload are each heard (desktop plan, 14.3).
- [ ] **5.4 Dialogs** trap the screen reader's focus while open, and
      return it to the board when they close.
- [ ] **5.5 Reduced motion.** With the system's reduce motion setting on,
      there is no apple pop, no crumbs and no shake, the snake fades at
      once, and the result card opens straight away.
- [ ] **5.6 Zoom.** Pinch zoom on the page, outside the board, works where
      the browser allows it, and the game is still usable while zoomed.

## 6. Performance on phones

- [ ] **6.1 A mid-range Android,** or Chrome's emulation with the CPU
      throttled 4× and 6×. A run at Fast keeps a steady frame rate, and
      its speed (desktop plan, 6.1). Swipes and arrows answer without
      lag.
- [ ] **6.2 Heat and battery.** Ten minutes of play doesn't heat the phone
      much, and the frame rate holds. A paused game left on screen uses
      little. Note the battery drop over the ten minutes.
- [ ] **6.3 A weak network (lead 8).** On a throttled "3G", or a real weak
      signal: the time to the drawn board, whether "The board couldn't be
      drawn" shows, and what an arrow pressed before the board is drawn
      does.
- [ ] **6.4 Twenty runs.** The game is as quick at the twentieth run as
      at the first.

## Not covered

- **Old devices and browsers** before the ones listed, and iOS before 17.
- **Foldables,** unless one is to hand. Unfolded, one reads as a tablet.
- **Game controllers,** which the game turns off.

## Reporting

As in the desktop plan, shaped like `docs/archive/sudoku-qa-plan.md`. Name
the device or the emulated size, the orientation and the browser for every
finding, attach a screenshot or a short recording, and say whether a real
device showed it or only emulation did. List what emulation couldn't show
under "Not covered" in the write-up.
