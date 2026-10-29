# Plan: choosing the level from the game bar

Written 2026-10-28, and built the same day on the branch `bar-choice`, cut
from `main`, with a commit for each step. The user's decisions are at the
end, and "As built" below says where the code differs from the plan. The
plan describes the code as it was, so check a path against the tree before
following one. Sudoku, Minesweeper and Snake each show a badge in the game
bar: Sudoku's level, Minesweeper's difficulty and Snake's speed. This plan
makes each badge a button that opens a menu of the choices, so a player can
change them in two taps instead of going through the Settings drawer. The
menu is one component in `@fz/game-ui`, and all three games use it. Paths
are relative to `frontend/`.

## As built

- **The chevron stays on the rail,** under the name. "Normal", the widest
  word, fits across Snake's 64px rail with it, so the fallback of dropping
  it was never needed.
- **`menu_side.ts` holds `opensFromRail()` too,** which the choice menu
  uses to set itself smaller on a rail.
- **Snake hands the board the focus after Cancel,** not the button: its
  shell gives the board the focus whenever the last dialog closes, from
  the bar or the drawer alike. The run stays paused until the player goes
  on.
- **Sudoku's bar spec names the overflow menu** ("More actions") on a
  phone, where the bar now holds two menus.

## Where things stand

- **The badges show the choice but do nothing.** Each is a
  `<span fzBarTitle class="fz-badge …">` in the game's
  `src/app/bar/bar.component.html`:

  | Game        | Shows                               | Where it shows                                           | Rail rule                |
  | ----------- | ----------------------------------- | -------------------------------------------------------- | ------------------------ |
  | Sudoku      | `LEVEL_INFO[game.level()].name`     | at every size                                            | smaller type on the rail |
  | Minesweeper | `difficultyName(game.difficulty())` | only on a roomy screen from desktop width, to leave room | (never on a rail)        |
  | Snake       | `SPEED_INFO[game.run().speed].name` | at every size                                            | smaller type on the rail |

  Each game shows the choice that the game on the board was started with,
  not the one in the settings.

- **Changing it takes three steps, four on a phone.** The player opens
  Settings (the gear, or the overflow menu and then Settings on a compact
  screen), picks from the radios, and closes the drawer. The drawer calls
  `changeLevel()` in Sudoku, `changeSettings({ difficulty })` in
  Minesweeper, and `changeSpeed()` in Snake. Each of these asks "Start a new
  game?" through `ConfirmService` if a game is under way, keeps the choice
  in the settings, and starts a new game with it.
- **The parts already exist.**
  - `ThemeMenuComponent` (`lib/ui/src/theme/`) is a button that opens an
    Angular Aria menu of `menuitemradio` items, one checked and marked with
    a tick, and its button is named for what it does and what is chosen
    ("Theme: Classic felt"). That is the pattern this plan needs.
  - `BarOverflowComponent` (`lib/game-ui/src/bar_overflow/`) opens a menu
    inside `<fz-game-bar>`. It opens on the side away from the bar's edge
    (below a top bar, above a bottom bar, toward the board from a rail), and
    a transparent layer catches the tap that closes it, so the tap doesn't
    reach the board.
  - Angular Aria's `ngMenuItem` takes `role="menuitemradio"`, and the
    template binds `aria-checked`, as the theme menu does.

## What the player gets

```
 ┌───────────────────────────────────────────────────────────────┐
 │ fuzzley │ Sudoku [Medium ▾]    ⏱ 2:13      Notes Restart New │
 └─────────────────┬─────────────────────────────────────────────┘
                   │ Easy     Singles only               │
                   │ Medium   Pairs and pointing      ✓  │
                   │ Hard     Triples and X-Wings        │
                   │ Expert   Swordfish and XY-Wings     │
                   └─────────────────────────────────────┘
```

- **The badge becomes a button that still looks like a badge,** with a
  small chevron after the name. A screen reader names it by what it
  chooses and the current choice ("Level: Medium", "Difficulty: Hard",
  "Speed: Normal"). Angular Aria's trigger gives it `aria-haspopup` and
  `aria-expanded`. Its hit area is at least the tap size
  (`--fz-tap-target`), while the badge drawn inside it keeps its current
  size.
- **Pressing it opens a menu of the choices,** each with its name and a few
  words about it: what a Sudoku level asks of the player, the size of a
  Minesweeper field, and what a Snake speed is like. The choice of the game
  on the board is checked and marked with a tick, as in the theme menu.
- **Choosing another option calls the method the Settings drawer uses.**
  With no game under way, the new game starts at once. With a game under
  way, the game asks first, and the question names the choice: "Start a
  new Hard game?" If the player cancels, nothing changes. Choosing the
  option that is already checked just closes the menu.
- **The keyboard works as it does in the theme menu.** Enter, Space or the
  down arrow opens the menu. The arrow keys, Home, End and typing a name
  move through it, Enter chooses, and Escape closes it and returns focus to
  the button. After a new game starts, the board takes the focus, as it does
  after New Game.
- **The menu opens wherever the badge is,** below the top bar, above the
  bottom bar, or toward the board from the rail. A tap outside the menu
  closes it without pressing anything on the board.
- **The Settings drawers keep their radios,** where a player who looks for
  the choice among the settings will still find it.

## The design

### 1. A choice menu for the bar, in `@fz/game-ui`

Add a new entry point, `lib/game-ui/src/bar_choice/`, holding
`<fz-bar-choice>`: a badge in a bar's title that opens a menu of choices,
with one of them checked. Its items are data, as the overflow's are, because
Angular Aria finds a menu's items in the template that declares the menu.

```ts
/** Describes one choice the menu offers. */
export interface BarChoiceOption<Id extends string = string> {
  readonly id: Id;
  readonly name: string;
  /** A few words after the name, such as what a level asks of the player. */
  readonly detail?: string;
}

/**
 * Shows a badge in a game bar's title that opens a menu of choices, one of
 * them checked, such as a game's level.
 */
@Component({ selector: "fz-bar-choice", ... })
export class BarChoiceComponent<Id extends string = string> {
  /** What is being chosen, such as "Level": the menu's name, and the button's with the choice. */
  readonly label = input.required<string>();
  /** The choices, in order. */
  readonly options = input.required<readonly BarChoiceOption<Id>[]>();
  /** The choice checked, which the badge shows. */
  readonly value = input.required<Id>();
  /** Emits the id of a choice other than the one checked. */
  readonly choose = output<Id>();
}
```

- **The trigger** is a `<button ngMenuTrigger>` holding a `.fz-badge` span
  with the name and an `<fz-icon name="chevron">` (the icon already points
  down). The button is transparent and at least `--fz-tap-target` in each
  direction. Its accessible name is `` `${label}: ${name}` ``, built in a
  `computed()` as the theme menu builds its own.
- **The menu** is `ngMenu` with `aria-label` set to the label, and one
  `ngMenuItem role="menuitemradio"` per option, with
  `[attr.aria-checked]`, `[searchTerm]` set to the name, the detail in the
  muted color, and a tick on the checked option. `(itemSelected)` emits
  `choose` only for an id other than `value`.
- **Where the menu opens.** The component injects `GameBarComponent`
  (optional), as the overflow does, and takes the side from the bar's
  placement. The overflow sits at the end of the bar, so its menu hangs from
  its button's end edge, or from its bottom on a rail. The choice menu sits
  in the title, at the start of the bar, so its menu hangs from its button's
  start edge, or from its top on a rail. A reversed bar mirrors both.
- **The dismiss layer** is the overflow's: a fixed, transparent `div` that
  is present while the menu is open and closes it on a click.
- **The host doesn't shrink** (`flex: none`), which is the `.level`,
  `.difficulty` and `.speed` rule each game has today.
- **On a rail** the component sets the badge in smaller type, which is the
  `:host(.rail)` rule Sudoku and Snake each have today. The rail is 64px
  wide and "Medium" or "Normal" barely fits across it, so the chevron moves
  under the name there. If the layout check shows the rail crowded, the
  chevron is dropped on the rail, and the button's border on hover is the
  only sign it can be pressed.

**Shared with the overflow, without changing how it looks:**

- `lib/game-ui/src/game_bar/menu_side.ts` gets a small function,
  `menuSide(placement)`, that maps a bar's placement to the side a menu
  opens on. It is internal to the library and isn't exported from
  `index.ts`. It comes with a table spec, and `BarOverflowComponent.side`
  calls it.
- A private Sass partial, `lib/game-ui/src/_bar_menu.scss`, holds the
  panel's look, its entry animation, the item rows, the rule between groups
  and the `[data-side]` offsets. Both components `@use` it. Each component
  keeps its own alignment, end or start.

The library's rule that nothing inside the bar may become a containing block
already covers this component: its dismiss layer is fixed, like the
overflow's.

### 2. Sudoku uses it

- **`games/sudoku/src/app/bar/bar.component.html`:** replace the badge
  `span` with:

  ```html
  <fz-bar-choice
    fzBarTitle
    label="Level"
    [options]="levels"
    [value]="game.level()"
    (choose)="changeLevel($event)"
  />
  ```

- **`bar.component.ts`:** add a constant,
  `LEVEL_CHOICES: readonly BarChoiceOption<Level>[]`, built from `LEVELS`
  and `LEVEL_INFO` (with `detail` set to `asks`), and a method
  `changeLevel(level)` that calls `void this.game.changeLevel(level)`.
  Remove the `level` computed, and update the class's doc comment: the
  level is now a menu.
- **`bar.component.scss`:** remove the `.level` rule and the
  `:host(.rail) .level` rule, since both move into the component.
- **The question:** `GameService.changeLevel()` asks with the title
  `` `Start a new ${LEVEL_INFO[level].name} game?` ``.
- **What is checked** is `game.level()`, the level of the game on the
  board. The Settings radios check `settings().level`. These two agree:
  `changeLevel()` updates the settings before it deals, and
  `SavedGameService` forgets a saved game that isn't under way.

### 3. Minesweeper uses it

- **Where it shows doesn't change.** The badge shows only on a roomy screen
  from desktop width, where the bar has room for it, and so does the menu.
  It stays inside the `@if (!viewport.isCompact())` block, and keeps the
  class `difficulty`, so the `below("desktop")` rule that hides it still
  applies. On a phone, the difficulty is still in Settings. (This change
  makes the badge choosable where it is shown. It doesn't add it where it
  isn't.)
- **`games/minesweeper/src/app/bar/bar.component.html`:**

  ```html
  @if (!viewport.isCompact()) {
  <fz-bar-choice
    fzBarTitle
    class="difficulty"
    label="Difficulty"
    [options]="difficulties()"
    [value]="game.difficulty()"
    (choose)="changeDifficulty($event)"
  />
  }
  ```

- **The choices** are `DIFFICULTY_IDS` (Easy, Medium, Hard, Custom), named
  by `difficultyName()`. Each detail is its field's size, such as
  "9 × 9, 10 mines". Custom's detail is the size of the custom field kept
  in the settings (`settings().custom`, "20 × 20, 100 mines" until the
  player sets one), so `difficulties` is a `computed()` that reads
  `SettingsService`.
- **Choosing Custom starts a game on the custom field kept in the
  settings,** through `game.changeSettings({ difficulty: "custom" })`, as
  `SettingsService.size()` reads it. In the drawer, choosing Custom opens
  the form for rows, columns and mines instead. Changing the custom field's
  size stays in Settings, and the menu's detail shows which field it will
  start.
- **One wording for a field's size.** The drawer's `describeDifficulty()`
  (in `settings.component.ts`) writes "9 × 9, 10 mines" for a preset. Move
  that wording into `rules/difficulty.ts` as `describeSize(size)`, using
  `count()` from `@fz/core/format`, since a custom field may hide a single
  mine. Both the bar and the drawer then call it. The drawer keeps "Your
  own size and mines" for Custom, since there Custom opens the form.
- **`bar.component.ts`:** replace the `difficulty` computed with
  `difficulties`, add `changeDifficulty(id)`, which calls
  `void this.game.changeSettings({ difficulty: id })`, and update the
  class's doc comment.
- **`bar.component.scss`:** remove the `.difficulty { flex: none; }` rule.
  The `below("desktop")` rule that hides it stays.
- **The question:** `changeSettings()` names the difficulty when the change
  sets one, as in "Start a new Hard game?" (or "Start a new Custom game?"
  from the drawer's form). A change of lives alone keeps "Start a new
  game?".

### 4. Snake uses it

- **`games/snake/src/app/bar/bar.component.html`:** replace the badge
  `span` with:

  ```html
  <fz-bar-choice
    fzBarTitle
    label="Speed"
    [options]="speeds"
    [value]="game.run().speed"
    (choose)="changeSpeed($event)"
  />
  ```

- **The choices** are `SPEEDS`, named by `SPEED_INFO[speed].name`, with
  `says` as the detail ("The classic pace."), as the drawer shows them. Add
  a constant, `SPEED_CHOICES: readonly BarChoiceOption<Speed>[]`, and a
  method `changeSpeed(speed)` that calls `void this.game.changeSpeed(speed)`.
  Remove the `speed` computed.
- **`bar.component.scss`:** remove the `.speed` rule and the
  `:host(.rail) .speed` rule.
- **The run pauses while the player chooses.** Pressing the button takes the
  focus off the board, and the board pauses the run when it loses the focus,
  as it does for the gear. The keys reach the game only while the board has
  the focus, so the arrow keys move through the menu without turning the
  snake. After a new run starts, the board takes the focus (the `runs`
  effect in `app.component.ts`). After Cancel, the run stays paused and the
  board takes the focus, as it does after any dialog closes.
- **The question:** `changeSpeed()` asks with the title
  `` `Start a new ${SPEED_INFO[speed].name} game?` ``. The message stays
  "The run in progress will be lost." The result card's "play at another
  speed" buttons call `changeSpeed()` only after a run has ended, so they
  never ask.

### 5. The questions, side by side

| Game        | Asked by                         | Title                         |
| ----------- | -------------------------------- | ----------------------------- |
| Sudoku      | `changeLevel(level)`             | Start a new Hard game?        |
| Minesweeper | `changeSettings({ difficulty })` | Start a new Hard game?        |
| Minesweeper | `changeSettings({ lives })`      | Start a new game? (unchanged) |
| Snake       | `changeSpeed(speed)`             | Start a new Fast game?        |
| Every game  | `newGame()`                      | Start a new game? (unchanged) |

The bar and the Settings drawer call the same methods, so the drawer's
questions name the choice too.

### 6. Docs

- `lib/game-ui/AGENTS.md`: add a `src/bar_choice/` entry under "What it
  holds", next to `src/bar_overflow/`, and mention the shared side and
  panel.
- `lib/game-ui/package.json`: add the choice menu to `description`. The
  `./*` export already serves the new folder.
- `.agents/skills/fuzzley-ui/SKILL.md`: add `<fz-bar-choice>` to the "A
  game's bar" row.
- `games/sudoku/AGENTS.md`, `games/minesweeper/AGENTS.md` and
  `games/snake/AGENTS.md`: in each `bar/` entry, say that the level,
  difficulty or speed opens a menu of the choices. Minesweeper's entry
  doesn't mention the difficulty today, so it gains it, with where it shows.

## Tests

The repository's rules for specs apply. Use Testing Library by role,
user-event, and real services rather than mocks.

- **`lib/game-ui/src/bar_choice/bar_choice.component.spec.ts`**, written in
  the style of the theme menu's and the overflow's specs:
  - names its button with the label and the choice ("Level: Medium"), and
    shows the choice's name;
  - starts closed (`aria-expanded="false"`);
  - opens a menu, named by the label, with a `menuitemradio` for each
    choice in order, and only the current choice checked;
  - emits the id of another choice when that choice is clicked, and when
    the arrow keys and Enter pick it;
  - emits nothing for the checked choice, and closes;
  - closes on Escape and returns focus to the button;
  - closes when the dismiss layer is clicked;
  - inside a `<fz-game-bar>` at each placement, opens on the side away
    from the bar's edge (`data-side`), and lines up with the button's start,
    mirrored in a reversed bar.
- **`lib/game-ui/src/game_bar/menu_side.spec.ts`:** one row per
  placement. The overflow's spec must still pass unchanged.
- **Sudoku:**
  - `bar.component.spec.ts`:
    - Change "shows the level of the game on the board" (both the roomy and
      the phone cases) to look for the button named "Level: Hard".
    - Add these cases:
      - opens a menu of the four levels with Hard checked;
      - with the game under way, asks "Start a new Medium game?", and
        Cancel leaves the game at Hard;
      - agreeing deals a Medium game and keeps Medium in the settings;
      - on a phone, the level button stays in the bar and isn't in the
        overflow menu.
  - `game.service.spec.ts`: add a case showing that `changeLevel()` names
    the level. The existing case for `newGame()` keeps "Start a new game?".
- **Minesweeper:**
  - `bar.component.spec.ts`:
    - Change "shows the difficulty of the game on the board" to look for
      the button named "Difficulty: Hard".
    - Add these cases:
      - opens a menu of the four difficulties with Hard checked, each with
        its size, and Custom's as the settings keep it;
      - with the game under way, asks "Start a new Easy game?", and
        agreeing deals a 9 × 9 field;
      - choosing Custom deals the custom field the settings keep;
      - on a phone, there is no difficulty button.
  - `game.service.spec.ts`: add cases showing that `changeSettings()`
    names the difficulty, and that a change of lives alone asks the plain
    question.
  - `rules/difficulty.spec.ts`: add a case for `describeSize()`, including
    the singular "1 mine".
- **Snake:**
  - `bar.component.spec.ts`:
    - Change "shows the speed of the run" to look for the button named
      "Speed: …".
    - Add these cases:
      - opens a menu of the three speeds with the run's checked;
      - with a run under way, asks before starting another, and agreeing
        starts a run at the speed chosen and keeps it in the settings;
      - on a phone, the speed button stays in the bar.
  - `game.service.spec.ts`: add a case showing that `changeSpeed()` names
    the speed.
  - `settings.component.spec.ts`: "asks before a new speed throws away the
    run under way" now expects "Start a new Slow game?".
- **Coverage:** the floors in `@fz/game-ui`'s, Sudoku's, Minesweeper's and
  Snake's `vitest.config.ts` must still hold.

## Checking it

1. `yarn verify` from `frontend/`.
2. `yarn build`, then `yarn check:layout`. This checks Sudoku and Snake at
   a roomy window, an upright phone and a phone on its side, with the new
   button on the rail. Minesweeper has no layout check, and its button
   shows only on a roomy screen.
3. Check it by hand in the browser with `yarn dev:all`, at
   `http://localhost:4200/play/sudoku/`, `/play/minesweeper/` and
   `/play/snake/`, at each size where the button shows:
   - the menu opens on the right side;
   - a tap outside closes it without reaching the board;
   - the keyboard alone opens it, moves through it, chooses, and escapes;
   - focus lands on the board after a new game, and returns to the button
     after Cancel (in Snake, to the board);
   - the badge and chevron are legible in every palette, and the focus
     ring shows on the bar;
   - in Snake, the run pauses as the menu opens and the arrow keys don't
     turn the snake;
   - in Minesweeper, the bar still fits at desktop width with the title,
     the three figures and the actions.
4. Listen with NVDA or Narrator: the button's name, the menu's name, the
   checked item, and the question that names the choice.
5. `yarn capture:screenshots` in Sudoku, Minesweeper and Snake, because the
   bar in each site preview now shows the chevron.

## Suggested order

Each step is its own commit, on one branch cut from `main`.

1. **`refactor(game-ui)`** (S): `menuSide()` and `_bar_menu.scss`, with the
   overflow moved onto them. Nothing should look different.
2. **`feat(game-ui)`** (M): `<fz-bar-choice>`, its spec, and the library's
   docs.
3. **`feat(sudoku)`** (S): the bar uses it, the question names the level,
   and the specs and `AGENTS.md` are updated.
4. **`feat(minesweeper)`** (S–M): `describeSize()`, the bar uses it with
   Custom, the question names the difficulty, and the specs and `AGENTS.md`
   are updated.
5. **`feat(snake)`** (S): the bar uses it, the question names the speed,
   and the specs and `AGENTS.md` are updated.
6. **`docs`** (S): the three games' screenshots captured again.

Steps 1 and 2 touch only `lib/game-ui/` and the `fuzzley-ui` skill. Steps 3
to 5 each touch only their own game, so they can be built in any order
once step 2 is in.

## Considered and left alone

- **A native `<select>`** would be the least code, and phones open it
  natively. But its closed form is drawn by the browser, not as a badge,
  and its open list can't show the details or the tick. The theme menu and
  the overflow already use Angular Aria's menu.
- **Angular Aria's combobox and listbox, as a select.** A select sets a
  value in a form. Here, choosing starts a new game and may first ask
  whether to lose the current one, which makes it a command. A menu of
  radio items, as the theme menu uses, describes that better.
- **Moving to the next option on each tap** can't skip one, and can cost a
  game on every tap.
- **Opening the Settings drawer from the badge** saves one tap, but still
  opens a drawer for a single choice.
- **Adding radio items and a custom button to `<fz-bar-overflow>`** would
  turn one control into two behind one name.
- **Showing Minesweeper's difficulty on a phone.** Its badge was left out of
  the compact bar to give the mines, the lives and the time room. This
  plan keeps that; adding it there would be a separate change.
- **Editing Minesweeper's custom field from the menu.** Rows, columns and
  mines need a form, which belongs in the drawer. The menu starts a game on
  the field the drawer last kept.

## Decisions

The user decided on 2026-10-28:

1. **Where the menu lives:** shared, as `<fz-bar-choice>` in
   `@fz/game-ui`.
2. **Minesweeper and Snake:** adopt it now, in the same branch as Sudoku.
3. **The question names the choice,** in every game, from the bar and from
   the Settings drawer.
