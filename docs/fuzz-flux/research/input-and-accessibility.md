# Fuzz Flux research: input, controls and accessibility in match-three games

These notes come from web reading on 2026-11-25: standards (WCAG 2.2, the
ARIA Authoring Practices, MDN prose), game accessibility guidelines (Game
Accessibility Guidelines, Xbox, Apple, IGDA, Can I Play That, AbleGamers),
wikis, reviews, essays and player forums. No game source code, repository,
decompilation or coded tutorial was read, and no art or audio was fetched.
Pages that refused the fetch (AppleVis, Medium, King support, Bulbapedia,
audiogames.net and others) are cited from the search listing and marked
"(listing)". The search allowance ran out before four lookups: Android's
reduced-motion guidance, mouse controls on web portals, matchers with undo,
and saving mid-level. Those read "not found". Section 4's palette figures and
every "(inferred)" line are this note's own work, not a source's.

## 1. Touch input models in swap matchers

- **Bejeweled 3, drag or click-click.** The PC readme gives two ways to swap:
  "clicking on a gem and dragging it left, right, up or down (no diagonal
  moves)", or "clicking one gem and then clicking on an adjacent gem". "Gems
  can only be moved if the move makes a match." [Bejeweled 3 readme]
- **Zoo Keeper DS, touch then tap or drag.** The player touches an animal,
  then taps or drags to a neighbor. A D-pad cursor is the fallback, and the
  reviewer calls touch "much faster and more responsive". [NWR]
- **Pokémon Shuffle, free drag.** An icon can be dragged anywhere in the 6 by
  6 puzzle area, not only to a neighbor. A drop that makes no match is
  refused and the pair goes back (listing). [Bulbapedia]
- **Royal Match, tap for power-ups, big pieces.** Power-ups fire on a tap,
  as in Homescapes, and the game "uses bigger pieces than most other
  switcher games". [Deconstructor of Fun]
- **Candy Crush, Royal Match, Homescapes: swipe versus tap-tap.** Whether
  each takes tap-then-tap as well as a swipe: not found. Candy Crush Soda
  has a magnifier that shows which candy is about to move (listing).
  [King support]
- **Gems of War, direction by the larger axis.** A swap fires once a drag
  passes a tolerance, when the game "checks whether the x or y is larger".
  Players report wrong swaps when a drag starts with a small wobble, and ask
  for a mode that waits for two selected gems. [Gems of War forum: swap]
- **Swipe thresholds and follow-the-finger.** No distance in px or as a
  fraction of a cell, and no account of a piece following the finger, was
  found for any named game: not found.
- **A swipe needs a tap alternative, and a release can cancel.** WCAG 2.5.1
  (A) counts a directional swipe as a path-based gesture that needs a
  single-pointer alternative; keyboard support alone does not meet it. WCAG
  2.5.7 (AA) asks the same for drags and names "tap one item, then tap its
  match". WCAG 2.5.2 (A) wants the action to complete on the up-event, with
  a way to abort. [WCAG 2.5.1] [WCAG 2.5.7] [WCAG 2.5.2]
- **Target sizes.** WCAG 2.5.8 (AA): 24 by 24 CSS px, or spacing so that
  24 px circles do not overlap. WCAG 2.5.5 (AAA): 44 by 44 CSS px. Apple:
  44 pt (listing). Google: 48 dp, about 9 mm, with 8 dp between targets.
  XAG 107: 15 mm on phones. Game Accessibility Guidelines: 0.96 cm at least
  on phones. [WCAG 2.5.8] [WCAG 2.5.5] [Google] [XAG 107] [GAG: targets]
- **Cells on small phones.** Eight columns across a 320 px viewport give
  cells of at most 40 CSS px; 360 px gives 45, 390 px gives 48 and 430 px
  gives 53. All pass 24 px. Only the narrowest fall under 44 px (inferred).
- **A cool-down between inputs.** An advanced guideline asks for 0.5 s after
  an accepted input in which no further input counts, for players with a
  tremor. [GAG: cool-down]

## 2. Input during animation

- **Bejeweled 3, swap while gems fall.** The readme says "it is possible to
  make matches while gems are falling in from previous matches" and "Use
  this ability for extra speed!" Earlier Bejeweled games did not allow it.
  [Bejeweled 3 readme] [Wikipedia: Bejeweled 3]
- **Royal Match, no lock.** "I can make matches regardless of whether there
  is a cascade of other movements on the board." The essay calls it "one of
  the fastest switchers live". A second essay lists "Don't slow down" among
  its five lessons. [Deconstructor of Fun] [This Week in LiveOps]
- **Pokémon Shuffle, locked.** "Once the combo is started, you have no
  control so the move is absolutely final." [Serebii]
- **Candy Crush.** Whether it locks swaps during a cascade: not found.
- **Players on slow cascades.** Gems of War players complain of a cascade
  that "should take not more than 5 seconds" taking 20, and say a speed
  change "needs to be an option" (listing). [Gems of War forum: speed]
- **Queued swaps can break.** Posts on small web matchers describe a queued
  swap that sticks when one of its pieces is cleared before the swap runs
  (listing). [itch.io posts]
- **How long a lock feels acceptable.** No figure for match-three: not
  found. The general limits are 0.1 s to feel instant, 1 s to keep a train
  of thought, and 10 s to hold attention (listing). [NN/g]
- **What free input buys.** Both games that allow it reward speed. With a
  moves limit and no clock it buys feel only, and it costs the announcer a
  fixed order of events (inferred).

## 3. Mouse and keyboard play

- **Bejeweled 3, arrows and WASD.** The arrow keys move a reticle, and W, A,
  S and D move the gem under it up, left, down and right: one key per swap,
  no grab step. A Hint button beside the board "costs nothing, other than
  time" and has a cooldown. [Bejeweled 3 readme] [Wikipedia: Bejeweled 3]
- **Bejeweled Blitz LIVE, a face button per direction.** The D-pad or left
  stick moves the cursor, and the face button that matches the wanted
  direction swaps. [Bejeweled wiki: Blitz LIVE]
- **Small web matchers.** One offers WASD with Space or arrows with Enter,
  in two steps: the action key, then a direction. Another uses arrows to
  move and Z and X to select and cancel. Players ask for WASD beside the
  arrows, and find some arrow keys unresponsive or too sensitive (listing).
  [itch.io posts]
- **Puzzle Quest, web portals and Steam matchers.** Their key maps, and
  click-click versus drag on portal games: not found.
- **Grid keys.** The grid pattern gives the whole grid one tab stop. Arrows
  move one cell and stop at the edges, Home and End go to the row's ends,
  and Ctrl with Home or End goes to the first or last cell. [APG: grid]
- **Keyboard alone, one key at a time.** XAG 107 asks that a keyboard reach
  everything, with no two keys at once and no held key. [XAG 107]
- **The site's own rule.** A board of squares here is a grid with one tab
  stop, arrow keys, Home and End, Enter or Space for the click, a name on
  every square, and an announcement of what a move did.
  [site accessibility skill]

## 4. Color-blind support

- **How common, and what is confused.** Red-green deficiency affects about
  8% of men and 0.5% of women; tritan deficiency under 0.01%. Protan and
  deutan confuse red, green, orange and brown; blue and purple; yellow and
  neon green; pink and gray. Tritan confuses blue and green, yellow and
  gray. Protans also see red as much darker. [Wikipedia: Color blindness]
- **Candy Crush, a shape per color, no color mode.** In Soda Saga red is a
  sausage, orange a cabochon, yellow a teardrop, green a pillow, blue a
  planet and purple a flower (listing). King's support pages send
  color-blind players to the phone's own color filters (listing).
  [Candy Crush Soda wiki] [King support]
- **Bejeweled, a cut per color.** The red gem is square, the blue a diamond,
  the purple a flat prism and the white a ball (listing). An in-game
  color-blind option: not found. [Bejeweled wiki: Gem]
- **Royal Match, simple colors.** Its high-contrast primary colors are
  credited for a readable board. A color-blind mode in Royal Match or
  Homescapes: not found. [This Week in LiveOps]
- **Two Dots and Hue, symbols on request.** Two Dots' color-blind mode lays
  a symbol over each dot; the symbols mean nothing else. Hue has the same
  kind of option (listing). [APX] [GAG: color]
- **Puyo Puyo, shapes that had to be earned.** Puyo Puyo Tetris made players
  earn credits to unlock its letter-marked puyos, which a critic called
  gating access. Its sequel added color-vision settings in an update
  (listing). [AbleGamers] [Nintendo Life]
- **Grindstone, dim everything else.** Its fix was not a palette. Picking an
  enemy darkens the screen and leaves lit only those of the same color and
  shape. The designer who asked for it confused red with green and blue
  with purple, most of all at similar lightness. [Vice]
- **Diamond Diaries Saga, one piece broke the rule.** Five colors each have
  an icon, but birds and keys show their kind, not their color, so a
  color-blind player must guess. [We Are Colorblind]
- **Gems of War, blue against purple.** Players mix up blue and purple even
  with symbols, and ask for a lighter blue, a darker purple and more
  distinct shapes. [Gems of War forum: colors]
- **What the guidelines say.** Use color as a backup to a shape, symbol or
  pattern. Design for full severity. Whole-screen filters are "a blunt
  instrument". A setting is "a last resort"; the default should already
  work. Test in grayscale and with a simulator, then with players.
  [GAG: color] [Apple: color] [Can I Play That] [IGDA GA-SIG]
- **A palette built for this.** Okabe and Ito's set includes vermilion,
  reddish purple, bluish green, sky blue and blue. They advise vermilion in
  place of red, bluish green in place of green, and a clear difference in
  brightness between any two warm or two cool colors. [Okabe and Ito]
- **Six of those, simulated.** With vermilion, yellow, bluish green, sky
  blue, blue and reddish purple, the closest pairs are sky blue and reddish
  purple (protan), bluish green and reddish purple (deutan), and bluish
  green and sky blue (tritan), at a CIE76 distance of 16 to 21. Normal
  vision's closest pair is 26 (inferred, computed with the Machado
  matrices).
- **Tools and contrast.** Color Oracle filters the whole screen, free on
  Windows, macOS and Linux. Chrome DevTools emulates protanopia,
  deuteranopia, tritanopia, achromatopsia and blur (listing). WCAG 1.4.11
  (AA) asks 3:1 against adjacent colors for graphics needed to understand
  content. [Color Oracle] [Chrome: CVD] [WCAG 1.4.11]

## 5. Blind and low-vision play

- **Blindfold Color Crush, a matcher by ear.** The store page calls it "a
  fully accessible tile game" for "rapid audio play", with gems named as
  colors, fruits, animals or numbers. Players flick along a column and
  listen for a "click-woop" that marks a gem with a swap. A double tap
  enters swap mode, a flick picks the neighbor, and a "ting" confirms a
  match (listing). New players call it very hard at first.
  [App Store: Blindfold Color Crush] [AppleVis]
- **Final Fortress and Eldershyft, the board is the hard part.** Final
  Fortress swaps tiles from VoiceOver's actions menu, and reviewers call it
  fully playable. Even so, players of both say they cannot tell where a
  swap is possible, or cannot picture the board at first (listing).
  [AppleVis]
- **Audio games.** A forum describes Bejeweled 2 as "an eight by eight
  grid" and judges Bejeweled Twist too hard to turn into audio (listing).
  [audiogames.net]
- **The application role, and the grid before it.** The role hands every
  key to the page and turns off the screen reader's reading keys. The
  author then owns all key handling, must name the region, should describe
  its keys, and must leave a way out. MDN says to try known widgets such as
  a grid first. In a grid each cell takes focus, which is what a screen
  reader speaks. [MDN: application role] [APG: grid]
- **Live regions.** Polite waits for a pause and suits most updates;
  assertive interrupts and is for urgent news. "Even frequent polite
  updates can become annoying." Keep game announcements short, about
  turning points, in fixed wording, and consider a verbosity setting.
  [MDN: live regions] [ARIA for Web Games]
- **How much to say after a cascade.** No guidance specific to matchers:
  not found.

## 6. Cognitive and motor accessibility

- **Hints on request.** Bejeweled 3's Hint button shows one match and costs
  only time. [Bejeweled 3 readme]
- **Hints on a timer.** Candy Crush is reported to show a hint after 10 s
  without a move, one that "appears to have no rhyme or reason". Candy
  Crush Friends lets players turn move hints off. [Yukai Chou]
  [App Store story]
- **No clock, no way to lose.** Bejeweled 3's Zen mode cannot run out of
  moves (listing). A color-blind reviewer found Diamond Diaries Saga
  playable only because it has no time limit and adds pieces slowly.
  [Wikipedia: Bejeweled 3] [We Are Colorblind]
- **Speed is a setting.** The guidelines list a game-speed option at the
  basic level, and players object when a speed is forced on them.
  [GAG: full list] [Gems of War forum: speed]
- **Simple, hold-free input, with a way back.** No holds, no repeated
  presses, no click-drag or swipe as the only way. XAG 107 adds a way to
  cancel a press by sliding off, or an Undo. A swap matcher with undo: not
  found. [GAG: full list] [XAG 107]
- **Switch and voice.** XAG 107 asks mobile games to work with the
  platform's switch and voice control, which need plain taps. [XAG 107]
- **Reminders and saves.** Remind players of controls and goals during
  play, autosave, and remember settings. Saving mid-level in matchers: not
  found. [GAG: full list]

## 7. Reduced motion and photosensitivity

- **The flash rule.** WCAG 2.3.1 (A): nothing flashes more than three times
  in a second, unless the flashes are dim or small. The area limit is 25%
  of a 10-degree field of view, estimated as a 341 by 256 px block. A flash
  is a pair of opposite luminance changes of 10% or more with the darker
  state below 0.80. Saturated red has its own, stricter test. [WCAG 2.3.1]
- **The games version.** XAG 118: about 1 person in 4,000 is at risk;
  flashes fail at over three a second across about 20% of the screen.
  Fixes are less contrast, lower rate, smaller area and desaturated red.
  [XAG 118]
- **Patterns and names.** Avoid more than 8 static or 5 moving
  high-contrast stripes, and flashing that runs over 5 s. Name the setting
  for what it does ("screen flash effects"), never "epilepsy safe".
  [GAG: flicker]
- **Motion, started by the player or by itself.** WCAG 2.3.3 (AAA): motion
  animation an interaction starts can be turned off unless it is essential;
  changes of color or opacity are not motion. WCAG 2.2.2 (A): motion that
  starts by itself, runs over 5 s and sits beside other content needs a way
  to pause or hide it. [WCAG 2.3.3] [WCAG 2.2.2]
- **What triggers.** Scaling and zooming, spinning, parallax and other
  multi-speed motion, plane shifts, and motion at the edge of vision.
  [WebKit] [Apple: motion]
- **Replace, do not strip.** If motion carries meaning, "don't remove the
  animation entirely"; use "a dissolve, highlight fade, or color shift".
  Purely decorative motion can stop. [Apple: motion]
- **Options seen in games.** Candy Crush Friends: stop end-of-episode
  animations, reduce screen shake, remove flashing. Halo Infinite: sliders
  from 0 to 100% for screen shake and full-screen effects. Final Fortress:
  a calm mode that softens flashes and haptics (listing).
  [App Store story] [XAG 117] [AppleVis]
- **Android's guidance.** Not found. The site's own rule under reduced
  motion is no shake, no crumbs, and the result shown at once.
  [site accessibility skill]

## 8. Haptics and sound as redundant channels

- **Haptics follow, never lead.** Use them to complement other feedback,
  keep one meaning per pattern, keep them short, do not overuse them, and
  let people turn them off. Royal Match's haptics are named as one of its
  five UX lessons. [Apple HIG: haptics] [This Week in LiveOps]
- **No haptics in iPhone browsers.** The Vibration API has never shipped in
  Safari on iOS (listing). [caniuse]
- **Sound is never the only cue, and each cue is distinct.** Give key
  events sounds that differ from each other, separate volume controls, and
  a toggle for haptics. [GAG: full list] [IGDA GA-SIG]
- **What a matcher by ear signals.** Blindfold Color Crush has sounds for
  "a swap is here", "swap mode" and "that matched", and a reviewer asks for
  "bigger explosion sounds" for four or more.
  [App Store: Blindfold Color Crush] [AppleVis]
- **Events that need a non-visual cue.** Piece picked up, swap refused,
  match by size, each cascade step, special piece made, goal met, few moves
  left, reshuffle, win and loss (inferred).

## 9. Phone-specific layout

- **How phones are held.** Of 780 people seen touching a phone, 49% used
  one hand, 36% cradled it and 15% used two; 67% of one-handed use was the
  right thumb. The author later asked readers to ignore his reach drawings
  and said people touch the center fastest and most accurately. [Hoober]
- **Where popular matchers put things.** A sourced teardown of the goal
  bar, board and booster positions: not found. Royal Match dropped the
  level-goal banner to shorten each attempt. [Deconstructor of Fun]
- **Safe areas.** The safe-area-inset environment variables give the
  distance to keep clear of a notch or home bar, and need viewport-fit set
  to cover (listing). [MDN: env()] [Chrome: edge-to-edge]
- **Browser gestures on the board.** touch-action: none hands a surface's
  gestures to the page, which MDN says suits a game surface, though it can
  block zoom. Without it the browser may take over a touch and cancel it.
  [MDN: touch-action]
- **Pull-to-refresh and the back-swipe.** overscroll-behavior set to
  contain or none on html and body stops pull-to-refresh and scroll
  chaining (listing). Whether a page can block the iOS edge back-swipe: not
  found. [MDN: overscroll-behavior] [Chrome: overscroll]
- **Both orientations, and dead space.** XAG 107 asks for portrait and
  landscape, since a phone may be fixed to a wheelchair mount, and suggests
  a ring of inactive space round each touch target. [XAG 107]

## 10. Text in games for all ages

- **Reading age.** "14% of adults in the USA and UK have a reading age
  below 11." Keep text short and plain. [GAG: language]
- **Never text alone.** Back instructions with pictures or speech, teach
  with interactive tutorials, and keep the goal on show. [GAG: full list]
- **Players skip tutorial text.** One figure says 80 to 90% do not read it;
  in one developer's tests no young player read the instructions. Players
  read once they are stuck (listing). [Mobile Free to Play] [Puzzledorf]
- **Icons with counts versus words, words per screen, a grade level.** No
  source compares or sets them: not found.

## What this suggests for Fuzz Flux

1. **Give one swap three ways in: swipe, tap-tap and keys.** WCAG 2.5.1 and
   2.5.7 need the tap route, and Bejeweled 3 and Zoo Keeper offer both.
2. **Read a swipe on release.** Under 0.2 cell of travel is a tap. At
   0.4 cell or more along one axis, with that axis at least 1.5 times the
   other, it is a swap that way. Anything else does nothing. Using the whole
   travel avoids Gems of War's wobble error, and sliding back cancels.
3. **Let the piece follow the finger along one axis, at most one cell,**
   with the neighbor sliding the other way. A refused swap slides out and
   back in 250 ms, spends no move and says "No match"; Bejeweled 3 and
   Pokémon Shuffle refuse such swaps too.
4. **Tap-tap: the first tap picks, a tap on a neighbor swaps,** a tap on
   any other piece moves the pick, and Escape or a tap off the board clears
   it. Mark the pick with a ring and a lift, since a tint is color alone.
5. **Tile the cells with no gaps and never go under 40 CSS px.** That is
   what 8 columns leave on a 320 px phone. It passes WCAG's 24 px, and the
   key and tap routes cover the 44 px shortfall. Buttons are 48 px with 8 px
   between, as Google advises.
6. **Lock the board while it settles, and keep one swap in a buffer.** Run
   it after settling if it is still legal. With no clock, free input buys
   only feel, and one fixed order keeps the announcer right.
7. **Keep a plain move under 0.7 s:** swap 150 ms, clear 200 ms, fall 70 ms
   a row. Speed each cascade step by 15%, let a tap or key finish the rest
   at once, and offer Animation speed: Normal or Fast. A second is where a
   train of thought breaks.
8. **Use the site's grid keys.** Arrows move the cursor without wrapping;
   Home and End go to the row's ends. Enter or Space grabs, an arrow then
   swaps, and Escape lets go. W, A, S and D swap the piece under the cursor
   in one press, as in Bejeweled 3. H hints, G reads the goals and moves
   left, and P pauses. No action needs two keys or a hold.
9. **Start from six hues stepped in lightness:** yellow #F0E442 (L* 89),
   sky #7CC8F0 (77), pink #D37FB0 (63), vermilion #D55E00 (54), green
   #007F5F (47) and blue #1F4E9E (34). Simulated, the closest pairs are sky
   and pink (20, protan) and green and blue (20, tritan); normal vision's
   closest is 52 (inferred, computed).
10. **Give each color its own silhouette, since 20 is too close to read at
    a glance.** Keep the round body and change one bold feature: plain
    round, spiked, two ear tufts, one top curl, square-cut and teardrop.
    Give sky and pink, and green and blue, the most different pairs.
11. **Offer a Symbols setting, off by default,** that stamps a circle,
    triangle, square, diamond, star or cross on each color, as Two Dots
    and Hue do. Shapes already carry the default, so this is an extra.
12. **Ring every piece in the palette's ink color.** Yellow, sky and pink
    fall under 3:1 on white, and blue falls under 3:1 on a near-black
    board (computed against #FFFFFF and #1B1B1F, both assumed).
13. **Pass two tests before art is final:** every pair told apart in
    grayscale at 40 px, and under Chrome's four emulations. Apple asks for
    the grayscale pass, and the guidelines for a simulator before players.
14. **Lay a DOM grid over the canvas** with one tab stop and a name per
    cell ("Yellow, row 3, column 4"), like Minesweeper's grid here. MDN
    says to try a grid before role="application".
15. **Say one polite sentence per move, after the board settles:**
    "Cleared 7. 2 cascades. 12 moves left." Add the goal only when it
    changes, and offer Brief and Full, since frequent updates annoy.
16. **Hint on request only.** H or the button outlines one move, pulses it
    three times in under 5 s and says "Try row 4, column 2, right." An idle
    timer, if any, is a setting that starts off.
17. **Set no clock anywhere, and save the board after every settled move,**
    so a tab switch or reload resumes the level. Announce a reshuffle.
18. **Under reduced motion keep fades and drop travel.** Pieces fade out
    and in within 200 ms. There is no shake, bounce, scale pop, particle or
    finger-follow; the target cell lights instead. Apple says to replace
    motion that carries meaning, not strip it.
19. **Stay inside the flash rule in every mode.** No full-board flash, no
    saturated red flash, and at most three brightness pulses a second.
20. **Pair every event with a sound,** rising in pitch with each cascade
    step, and add optional haptics where the browser has them. Set
    touch-action: none on the board and overscroll-behavior: none on the
    page, and keep the board 12 px clear of the screen's sides. Show goals
    as an icon with a count, named "Collect 12 yellow", and teach each rule
    with one short sentence and one move, since players skip longer text.

## Sources

- Bejeweled wiki, under https://bejeweled.wiki.gg/wiki/ : Bejeweled 3 readme
  (Bejeweled_3/readme.html), Blitz LIVE (Bejeweled_Blitz_LIVE), Gem (Gem)
- Wikipedia, under https://en.wikipedia.org/wiki/ : Bejeweled_3,
  Color_blindness
- NWR: https://www.nintendoworldreport.com/review/4327/zoo-keeper-nintendo-ds
- Bulbapedia: https://bulbapedia.bulbagarden.net/wiki/Pokémon_Shuffle
- Serebii: https://serebii.net/shuffle/mechanics.shtml
- Deconstructor of Fun: https://www.deconstructoroffun.com/blog/2021/3/21/royal-match-the-new-king-from-turkey
- This Week in LiveOps: https://thisweekinliveops.substack.com/p/5-simple-ux-lessons-from-royal-match
- King support: https://kingcare.zendesk.com/hc/en-us/articles/4453967759389-Accessibility-visual-options
- App Store story: https://apps.apple.com/story/id1618279292
- App Store: Blindfold Color Crush: https://apps.apple.com/app/id1062421079
- Gems of War forum: swap: https://community.gemsofwar.com/t/finally-on-film-not-a-bug-lol-but-reported-caught-the-a-match-4-bug-on-video/68344
- Gems of War forum: colors: https://community.gemsofwar.com/t/colors-blue-purple-too-similar-for-colorblindness/3224
- Gems of War forum: speed: https://community.gemsofwar.com/t/the-1-0-7-speed-change-complaint-dogpile-thread/1119
- itch.io posts: search listings of itch.io game pages and comments, such
  as https://bryony-s.itch.io/blockswap ; the posts were not opened
- NN/g: https://www.nngroup.com/alertbox/response-times.html
- WCAG 2.2 Understanding pages, under
  https://www.w3.org/WAI/WCAG22/Understanding/ : non-text-contrast (1.4.11),
  pause-stop-hide (2.2.2), three-flashes-or-below-threshold (2.3.1),
  animation-from-interactions (2.3.3), pointer-gestures (2.5.1),
  pointer-cancellation (2.5.2), target-size-enhanced (2.5.5),
  dragging-movements (2.5.7), target-size-minimum (2.5.8)
- APG: grid: https://www.w3.org/WAI/ARIA/apg/patterns/grid/
- XAG 107, 117, 118: https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/107
  (and /117, /118)
- GAG (Game Accessibility Guidelines): https://gameaccessibilityguidelines.com/full-list/
  ; the color, targets, cool-down, flicker and language pages are linked
  from that list by their titles
- Google: https://support.google.com/accessibility/android/answer/7101858
- Apple: color: https://developer.apple.com/help/app-store-connect/manage-app-accessibility/differentiate-without-color-alone-evaluation-criteria
- Apple: motion: https://developer.apple.com/help/app-store-connect/manage-app-accessibility/reduced-motion-evaluation-criteria
- Apple HIG: haptics: https://developer.apple.com/design/human-interface-guidelines/playing-haptics
- WebKit: https://webkit.org/blog/7551/responsive-design-for-motion/
- MDN, under https://developer.mozilla.org/en-US/docs/Web/ : application
  role (Accessibility/ARIA/Reference/Roles/application_role), live regions
  (Accessibility/ARIA/Guides/Live_regions), CSS/touch-action,
  CSS/overscroll-behavior, CSS/env
- Chrome, under https://developer.chrome.com/ : blog/overscroll-behavior,
  docs/css-ui/edge-to-edge, blog/cvd
- caniuse: https://caniuse.com/vibration
- ARIA for Web Games: https://ianeress.substack.com/p/aria-for-web-games-november-13-2024
- APX: https://accessible.games/accessible-player-experiences/access-patterns/distinguish-this-from-that/
- We Are Colorblind: https://wearecolorblind.com/examples/diamond-diaries-saga/
- Vice: https://vice.com/en/article/how-grindstone-a-game-about-matching-colors-solved-its-colorblind-issue
- AbleGamers: https://ablegamers.org/?p=2554
- Nintendo Life: https://www.nintendolife.com/news/2021/02/puyo_puyo_tetris_2s_second_post-launch_update_adds_colourblind_support_and_more
- Candy Crush Soda wiki: https://candycrushsoda.fandom.com/wiki/Candies
- Okabe and Ito: https://jfly.uni-koeln.de/color/
- Color Oracle: https://colororacle.org/
- Can I Play That: https://caniplaythat.com/color-blindness-accessibility-guide/
- IGDA GA-SIG: https://igda-gasig.org/get-involved/sig-initiatives/resources-for-game-developers/sig-guidelines/
- AppleVis: https://applevis.com/comment/81276 (Blindfold Color Crush),
  https://applevis.com/apps/ios/games/final-fortress and
  https://applevis.com/comment/204806 (Eldershyft)
- audiogames.net: https://forum.audiogames.net/post/318478/
- Yukai Chou: https://yukaichou.com/gamification-study/game-mechanics-research-candy-crush-addicting/
- Hoober: https://www.uxmatters.com/mt/archives/2013/02/how-do-users-really-hold-mobile-devices.php
- Mobile Free to Play: https://mobilefreetoplay.com/?p=143
- Puzzledorf: https://www.gamedeveloper.com/game-platforms/tutorial-design-in-puzzledorf-reflections
- site accessibility skill: `.agents/skills/web-game-accessibility/SKILL.md`
  in this repository
