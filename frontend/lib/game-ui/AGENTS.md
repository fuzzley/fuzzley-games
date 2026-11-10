# @fz/game-ui

The `@fz/game-ui` library (`frontend/lib/game-ui`): the Angular chrome the
games share and the site doesn't, so every game is framed alike. It builds
on `@fz/ui` ([frontend/lib/ui/AGENTS.md](../ui/AGENTS.md)) and `@fz/style`
([frontend/lib/style/AGENTS.md](../style/AGENTS.md)), and keeps their rules:
everything carries `fz`, a component reads no viewport, accessibility is the
component's job, and the same strict compiler options and checks. The
frontend's rules are in [frontend/AGENTS.md](../../AGENTS.md), and the
repository's in [.agents/AGENTS.md](../../../.agents/AGENTS.md). Paths are
relative to `frontend/lib/game-ui/`.

## What it holds

One folder under `src/` per TypeScript entry point, each with an
`index.ts` that names what it exports, which an app imports as
`@fz/game-ui/<folder>`, but for `src/fixtures/`, which holds only the
stylesheets `bar.spec.ts` and `frame.spec.ts` compile and is no entry
point. The Sass entry points, `@fz/game-ui`, `@fz/game-ui/toolkit` and
`@fz/game-ui/global`, are `src/_index.scss`, `src/_toolkit.scss` and
`src/global.scss`.

- `src/game_bar/`: `<fz-game-bar>`, the bar a game sits under. It leads with
  the link home (`home`: the wordmark, the round home button, or `none`; a
  rail shows the button), then lays out what the app projects into it: its
  title (`fzBarTitle`), its status (`fzBarStatus`) and each of its actions
  (`fzBarActions`). `placement` stands it across the `top`, along the
  `bottom`, or down the `start` or `end` side as a rail; `reversed` runs a
  row from its end, and `compact` makes it shorter and tighter. At the top
  it takes its place in the flow; elsewhere it stands against that edge of
  its containing block, which the app positions. The app styles what it
  projects, and can tune a bar that isn't compact through `--fz-bar-gap`
  and `--fz-bar-actions-gap`. Its surface is `@fz/style`'s
  `--fz-bar-glass`: glass over the game in a dark palette, solid in a light
  one.
- `src/bar_overflow/`: `<fz-bar-overflow>`, the "More actions" button and
  the Angular Aria menu it opens, of what the bar has no room for. The items
  are data, since Angular Aria finds a menu's items in the template that
  declares the menu: a `BarOverflowLink`, with an `href`, which the browser
  follows, or a `BarOverflowAction<Id>`, which emits its `id` through
  `choose`. The component takes `Id` from the items it is given, so an app
  that names its actions' ids (`BarOverflowItem<MenuAction>`) gets them back
  typed, and a misspelled one fails to compile. Inside a `<fz-game-bar>`
  the menu opens away from the bar's edge. While it is open, a transparent
  layer over the window takes the tap that closes it, so the tap doesn't
  reach the board. `withHomeLink(items, barHome)` leads the items with the
  link home where the bar has no room for it (`barHome` is `none`), and
  gives them back as they are where it has. The link leads to `/`, as the
  bar's does, unless given another `href`; an app that gives the bar its own
  `homeHref` passes it here too. `HELP_MENU_ACTION` and
  `SETTINGS_MENU_ACTION` are the items that open How to play and the
  settings, worded once for the games, as `soundMenuAction()` is the
  Sound's; the Solitaire Collection takes Settings but words its own How to
  Play.
- `src/bar_choice/`: `<fz-bar-choice>`, a badge in a bar's title, such as a
  game's level, that opens an Angular Aria menu of the choices, one of them
  checked (`menuitemradio`). The choices are data too (`BarChoiceOption<Id>`:
  a name and a few words of detail), `@fz/ui`'s `ChoiceOption<Id>`, so one
  list of them feeds the settings' `<fz-choice-list>` as well. `value` is the
  one checked, which the badge shows, and `choose` emits the id of any other.
  The badge is named by its `label` and the choice ("Level:
  Medium"), and is drawn as `.fz-badge` but takes a press anywhere in the
  tap size around it. What the app projects as `fzBarChoiceExtra`, such as
  a slider for the choice checked, shows in the menu beneath the choices,
  where Tab reaches it, and its keys are its own but Escape, which closes
  the menu. It is none of the menu's items, which a screen reader counts
  and the arrow keys move between, so it holds one simple control, and
  what it does is offered elsewhere too, as Brick Breaker's settings offer
  its slider. Its menu hangs from the badge's start, as the badge leads the
  bar, but on a compact bar across the window from the bar's start, or its
  end when reversed, no wider than the bar, its details wrapping where they
  must; on a rail the badge is set smaller, over its chevron. It opens and
  closes as the overflow's does: `menuSide()` in `src/game_bar/menu_side.ts`
  gives both the side, and the private partial `src/_bar_menu.scss` draws
  both panels.
- `src/bar_pause/`: `button[fzBarPause]` (`BarPauseComponent`), which makes
  a button among the app's actions its Pause, filling it with its icon and
  label: Pause while the run its `outcome` names is `playing`, Resume while
  it is `paused`, and dimmed otherwise, `aria-disabled` rather than
  disabled, so the focus never falls off it, a press then doing nothing.
  A press emits `pauseRun` or `resumeRun`, for the app to pause or go on,
  handing the board back the focus as it goes on, since a press from the
  keyboard took it; one with a mouse or a finger leaves the focus where it
  was. Inside a compact `<fz-game-bar>` it is round, and it shows its label
  where `fitsLabel` says the bar has room, else a screen reader alone hears
  it: the bar's stylesheet can't reach inside it, as `bar-actions` reaches
  the `.btn-text` of the app's own actions.
- `src/bar_sound/`: `button[fzBarSound]` (`BarSoundComponent`), which makes
  a button its Sound: a round speaker, named Sound, pressed while `soundOn`,
  which keeps the focus where it was through a press with a mouse or a
  finger. The app turns the sound on or off as it is clicked, and where the
  bar has no room for it offers `soundMenuAction(soundOn)` in its overflow
  menu instead: "Turn sound off" while it is on, "Turn sound on" while it is
  off. Both components take the app's own button, which keeps its `type`
  and its `.action`, by an attribute, so `eslint.config.js` names their
  selectors as a directive's, and `@fz/dev`'s `templates()` takes
  `fzBarPause` and `fzBarSound` as what the button says.
- `src/viewport/`: `GameViewportService`, which follows the shape of the
  window: its `formFactor` (`roomy`, `phone-portrait` or
  `phone-landscape`), `isCompact` and `isPortrait`, where the bar stands
  (`barPlacement`), whether the bar has room for its actions' labels
  (`fitsActionLabels`, from 1200 CSS px, as the `desktop` breakpoint), and
  how it shows the link home, as the room for the wordmark and the home
  button allows (`barHome`: the wordmark on a roomy window from 1280 CSS
  px, the button below that or on a compact one, and `none` below 360
  wide, or on a rail under 380 tall). `allowsMotion` says whether the
  player has no wish for less motion, the one case in which the
  stylesheets animate, for code that waits on an animation, and
  `isTouchScreen` whether the main pointer is a finger (`pointer: coarse`),
  for controls only a touch screen needs. It asks the window of Angular's
  `DOCUMENT`, and a document without one, or a window without
  `matchMedia`, reads as roomy, as asking for no motion, and as pointed at
  with a mouse.
- `src/breakpoints/`: the widths every game changes shape at. `index.ts`
  holds them as constants, with `formFactorAt()`, and imports no Angular,
  so a game's renderer can read them as well as its shell. `_index.scss`
  holds them for Sass: `below()` and `from()` a named width (`tablet`,
  `desktop`), and `compact`, `phone-portrait` and `phone-landscape`, which
  apply the service's tests, and `short-rail`, under which a rail loses its
  home button and tightens its gaps. `breakpoints.spec.ts` compiles the mixins and
  holds them to the constants.
- `src/play_room/`: `[fzPlayRoom]` (`PlayRoomDirective`), on the element
  that holds a game's board and the controls whose keys steer it, which
  says through `away` why the game should pause, whenever the player looks
  away: `"focus"` once the focus leaves it, `"hidden"` as the page goes out
  of sight, `"turned"` as the screen turns (from `GameViewportService`'s
  `isPortrait`). Pausing is the app's. While the focus is in the room, a
  press anywhere on the page on what can't take the focus keeps it there,
  so the keys aren't stranded. It reads the viewport, unlike the
  library's components: telling a turn is what it is for. Beside it,
  `refocusWhenUncovered(board, runs)`, called from an app's constructor,
  hands the board the focus as each run begins and whenever the last
  dialog over it closes, from `@fz/ui/dialog`'s `DialogService`.
- `src/settings_drawer/`: `<fz-settings-drawer>`, a game's settings
  drawer: a dialog named Settings down the right of the window, its heading
  and the button that closes it over the settings the game projects. As
  `<fz-dialog>`, it only asks to close, through `closed`, and the game
  lowers `open`. It draws its frame with `@fz/style`'s
  `settings-drawer-frame`, whose rules can't reach what it projects, so the
  stylesheet of the game's settings component includes `setting-fields` at
  its top level.
- `src/help_dialog/`: `<fz-help-dialog>`, a game's How to play: a card
  over the dimmed page, a dialog named How to play, with its heading and
  the button in the corner that closes it, over what the game says, which
  it projects. As `<fz-dialog>`, it only asks to close, through `closed`,
  and the game lowers `open`. Its rules can't reach what it projects, so
  the stylesheet of the game's How to play component includes `@fz/style`'s
  `help-text` and `help-controls` at its top level.
- `src/help_catalog/`: `<fz-help-catalog>`, a catalog for How to play of
  what a game's field can hold (a `HelpCatalog`), as a section its heading
  names, with what to know first and each entry's picture beside its name
  and what it does, and `helpEntries()`, which makes a catalog's entries,
  each with its picture once the game has drawn it. The pictures stand in a
  column `--fz-help-picture-width` by `--fz-help-picture-height` (48 by
  24 CSS px unless the app sets them), so the words line up and nothing
  moves as they come in.
- `src/stopwatch/`: `StopwatchService`, a game's clock, in whole seconds,
  which counts only while the page is in view. It reads the time from the
  clock rather than counting its ticks, so a pause keeps the part of a
  second under way and a late tick loses nothing; `reset()` holds the time
  of a game taken up again. It reads the clock through `NOW`, `Date.now()`
  at each reading unless a spec provides a clock of its own.
  `formatClock()` writes a time as a game's clock shows it, "2:13", or
  "1:02:13" past an hour.
- `src/random/`: `GAME_RANDOM`, where a game draws the seeds of its new
  runs and deals from: `Math.random` unless a spec provides a source of its
  own, as a spec that plays to a known end does.
- `src/run_lifecycle/`: `RunLifecycle`, the abstract class a game's
  `GameService` extends, which holds what every game's run does around its
  play. `command()` does what the keys every game shares ask: `"pause"`,
  `"toggle"`, which pauses, goes on or starts another run, and `"go"`,
  which goes on, starts another run, or goes on to the next stage through
  `nextStage()`, which does nothing unless a game whose runs clear waves or
  levels overrides it; a game with keys of its own overrides `command()`
  and hands it the rest. It holds the drawn gate (`drawn`, set through
  `setDrawn()`, which the game's `resume()` waits for), counts the runs
  begun (`runs`), which `began()`, called by the game as each run begins,
  raises before it clears the live region, and asks, through
  `@fz/ui/confirm`, before a run in progress is lost (`mayLoseRun()`), with
  New game's question or `speedQuestion(name)`'s. The game gives its run's
  stage (`outcome`), its end (`ended`), whether it is in progress
  (`inProgress`) and whether the card over it is put away
  (`resultClosed`), and pauses, goes on and starts runs (`pause()`,
  `resume()`, `newGame()`) as its rules say. It is undecorated and has no
  constructor, so a game's `@Injectable` class needs none either, and it
  reads nothing the game gives while it is made, so the game's fields and
  constructor may lay out its first run. Asteroid Breaker's, Brick
  Breaker's and Snake's `GameService`s extend it. The stages and the
  commands it takes, `RunStage` and `RunCommand`, are `@fz/core/run`'s,
  which a game's rules and view can import, and the entry hands them on.
- `src/testing/`: what a game's specs share: `installFakeViewport()`, which
  answers the queries `GameViewportService` asks, handed on from
  `@fz/ui/testing`, which [frontend/lib/ui/AGENTS.md](../ui/AGENTS.md)
  describes; and the bar's menus driven as a player drives them, by the
  names this library gives them (`bar_menus.ts`): `barChoice()`, a choice's
  badge by its label, whatever it shows, `chooseInBar()`, a choice made
  from its menu, and `openBarMenu()`, which opens the overflow menu and
  returns what it offers.
- `src/_index.scss`: the Sass an app reaches with `@use "@fz/game-ui"`. It
  forwards the breakpoints' mixins and the bar's, and its `bar-size()` mixin
  publishes the bar's size as `--fz-bar-height` and `--fz-rail-width` for
  what lays itself out around the bar, such as a game's board:
  `@fz/game-ui/global` includes it on `:root`, and `game-frame` with
  `$compact: true` on a compact host, while an app without them, such as
  the Solitaire Collection, includes it itself in the same places. The bar
  can't declare them itself, since a custom property reaches only what sits
  inside its element. Its `game-frame` mixin, which an app's own stylesheet
  includes at its top, frames the page: the `:host` fixed over the window,
  `bar-size()` again on `:host(.compact)`, and the `.stage` inset by the bar
  on the side its `data-bar` names (the top, the `bottom` or the `end`), a
  size container named `stage`. The app binds its host's `compact` class
  and `data-bar` to `GameViewportService`'s `isCompact` and `barPlacement`,
  and adds its own rules for the stage after the include.
- `src/_toolkit.scss`, `@fz/game-ui/toolkit`: the toolkit a game's component
  stylesheets share, which its `styles/_index.scss` forwards whole:
  `@fz/style`'s mixins, the breakpoints' and the bar's, mixins alone, and
  no CSS.
- `src/global.scss`, `@fz/game-ui/global`: the global stylesheet a game
  loads once, at the top of its own: `@fz/style`'s, then the bar's size on
  `:root`, and `overscroll-behavior: none`, so a finger dragging down the
  board never pulls the page to refresh. These two sit in `@fz/style`'s
  `fz.tokens` and `fz.base` layers, so a game's own rules win over them, as
  over `@fz/style`'s. `src/frame.spec.ts` compiles the toolkit, the global
  stylesheet and `game-frame` through the fixtures in `src/fixtures/`, as a
  game's stylesheets load them.
- `src/_bar.scss`: the bar's mixins, which style what a game projects into
  its bar alike in every game, each naming the classes it styles. A bar's
  stylesheet includes them at its top, in this order, its own rules
  between them where they fall: `bar-title`, the `.title` on one line;
  `bar-figures($min-width, $gap)`, the figures as a `<dl class="metrics">`
  of `.metric` cards, each its `dt` in capitals, holding its `.label` and
  its `fz-icon`, over its `.value` in monospace digits; and `bar-actions`,
  each `.action` a finger's tap, one marked `aria-disabled`, such as
  Pause, dimmed, the `.settings` gear turning, and below `desktop` the
  actions round and their `.btn-text` heard but not seen (Pause hides its
  label itself, through `fitsLabel`), the bar's gaps tightened. Then, inside
  the host's state that calls for them,
  `bar-figures-inline($icon-gap, $padding)` sets each figure's icon beside
  its value, for a bar with no room for the cards; `bar-figures-paired`, after
  it, sets two such figures one over the other in a single card, such as Brick
  Breaker's score over its lives, for a bar across the window with no room for
  them side by side, kept off a rail, since `bar-figures-stacked` doesn't take
  its card away; and, after those, since a rail is compact too,
  `bar-figures-stacked` stacks the figures on a rail. The
  mixins hide and show an `fz-icon` alone: a bar that puts something else
  in a label's place, as Asteroid Breaker does its pilot, hides and shows
  it with rules of its own.
  `src/bar.spec.ts` compiles the bars in `src/fixtures/`, which include
  them as a game's does, with `@fz/style/testing`'s `compileStylesheet()`.

## How an app uses it

- **From source, never built**, as `@fz/ui` is: an app lists
  `"@fz/game-ui": "workspace:*"` beside `@fz/ui` and `@fz/style`, and its
  global stylesheet is `@use "@fz/game-ui/global";`, which loads
  `@fz/style`'s.
- **The app decides the layout.** It binds `placement`, `reversed`,
  `compact` and `home` to what `GameViewportService` says (`home` to
  `barHome`, with the overflow menu led by `withHomeLink()` when that is
  `none`), and Pause's `fitsLabel` to `fitsActionLabels`; the bar never
  asks the window. A game's stylesheets take the same widths from the
  mixins, and its bar's stylesheet the bar's mixins, through
  `@fz/game-ui/toolkit`, which the game's own toolkit forwards, as
  `frontend/games/minesweeper/src/app/styles/_index.scss` does; its app's
  stylesheet frames the page with `game-frame`, as
  `frontend/games/minesweeper/src/app/app.component.scss` does.
- **Imports go one way.** This library imports `@fz/ui`, `@fz/style`,
  `@fz/core` and Angular, never the site or a game, and the site has no use
  for it; its testing entry imports Testing Library too, `@testing-library/dom`
  and `@testing-library/user-event`'s types, with which `barChoice()`,
  `chooseInBar()` and `openBarMenu()` drive the bar's menus, and which
  `package.json` declares optional peers, as `@fz/phaser` does Vitest.

## Rules

- **A width every game changes shape at is written once**, in
  `src/breakpoints/`, for TypeScript and for Sass, which its spec keeps
  equal. A width only one game means something by stays in that game.
- **Nothing inside the bar may become a containing block.** The menus'
  dismiss layers are `position: fixed` to cover the window, which a
  `backdrop-filter`, `transform`, `filter`, `contain` or container query on
  an ancestor would trap inside that ancestor. So the bar's glass is on its
  `::before`, beneath an `isolation: isolate` that keeps it behind the bar's
  content, and the bar takes its layout from inputs, not container queries.

## Checks

The root's `yarn lint`, `yarn typecheck` and `yarn test` run the library's
own, which `yarn workspace @fz/game-ui <script>` runs alone. They are
`@fz/ui`'s, with the same configs: ESLint and stylelint, the Angular
compiler's checks, and Vitest with jsdom and Testing Library, each spec
beside the file it tests. The `test:coverage` run fails below the
coverage floor `vitest.config.ts` sets, which sits just under the figures and rises as
they rise. Coverage counts `src/testing/`, as `frontend/AGENTS.md` asks of
every library.
