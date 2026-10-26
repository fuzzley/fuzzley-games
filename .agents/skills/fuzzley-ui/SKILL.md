---
name: fuzzley-ui
description: The shared UI libraries under frontend/lib/ that the site and the games are built on — @fz/style (palettes, tokens, the surfaces over a game, fragments such as .fz-button, Sass mixins, theme.js, the fuzzball and the page's icons), @fz/ui (Angular dialog, confirmation, announcer, theme menu and picker, icons, radio group, storage, wordmark) and @fz/game-ui (the game bar, its overflow menu, the games' viewport and breakpoints, and the stopwatch) — which piece to reach for, and how an app adopts them. Triggers on: @fz/style, @fz/ui, @fz/game-ui, fz-, design tokens, palette, theme, fuzzball, favicon, wordmark, light or dark mode, surface, glass, game bar, dialog, confirm, announcer, live region, stopwatch, timer, icon, button, shared component, new game.
---

# The shared UI libraries

The site and the games share how they look and much of how they behave
through three libraries under `frontend/lib/`. Each library's `AGENTS.md` is
the full account of what it holds and the rules it keeps; this skill says
which piece to reach for, and how an app takes them up.

| Library       | Folder                 | For                                                                                                                                                                        | Its rules                        |
| ------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `@fz/style`   | `frontend/lib/style`   | Every app, Angular or not: the palettes and tokens, the global stylesheet, fragments, Sass mixins, `theme.js`, the fuzzball and the page's icons, and the stylelint preset | `frontend/lib/style/AGENTS.md`   |
| `@fz/ui`      | `frontend/lib/ui`      | Every Angular app: dialogs, the confirmation, the announcer, the theme's service and pickers, icons, the radio group, storage and the wordmark                             | `frontend/lib/ui/AGENTS.md`      |
| `@fz/game-ui` | `frontend/lib/game-ui` | Angular games only: the game bar, its overflow menu, the viewport and breakpoints, the stopwatch                                                                           | `frontend/lib/game-ui/AGENTS.md` |

Imports go one way: an app may import a library, a library another library,
and a library never an app. `yarn constraints` fails a library that depends
on an app.

## Reach for the library first

Before writing a style or a component, look for it here. An app writes its
own only for what is its alone.

| You need                                             | Use                                                                                                                                                                                                                                                                                                |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A color                                              | A palette role, `var(--fz-<role>)` (`--fz-text`, `--fz-muted`, `--fz-accent`, `--fz-panel-raised`), or a tint (`--fz-wash-1` to `-4`, `--fz-edge-1` to `-4`). Never a literal: stylelint rejects one.                                                                                              |
| A label on a filled color                            | Its pair: `--fz-on-accent`, `--fz-on-warning`, `--fz-on-danger`, and `--fz-on-felt` for what is drawn on a game's table                                                                                                                                                                            |
| A bar, drawer, modal, card or well over a game       | A surface: `--fz-bar-glass`, `--fz-panel-glass`, `--fz-float`, `--fz-well`. Each is glass in a dark palette and solid in a light one                                                                                                                                                               |
| Space, type, radius, shadow, motion                  | The scales: `--fz-space-*`, `--fz-font-*`, `--fz-leading-*`, `--fz-radius-*`, `--fz-shadow-*`, `--fz-ease-*`, `--fz-duration-*`, `--fz-tap-target`                                                                                                                                                 |
| A button                                             | `class="fz-button"`, with a tone (`fz-button-secondary`, `-warning`, `-danger`) or a shape (`fz-button-circle`, `-block`, `-large`) beside it                                                                                                                                                      |
| A small label                                        | `class="fz-badge"`, or `fz-badge fz-badge-accent`                                                                                                                                                                                                                                                  |
| Text only a screen reader reads                      | `class="fz-visually-hidden"`, or the `visually-hidden` mixin                                                                                                                                                                                                                                       |
| A frosted surface, an icon button, a tap target      | The mixins, through `@use "@fz/style" as fz;`: `fz.glass()`, `fz.icon-button()`, `fz.tap-target`, `fz.transition()`, `fz.flex-center`, `fz.visually-hidden`                                                                                                                                        |
| A modal                                              | `<fz-dialog>` from `@fz/ui/dialog`: a native modal `<dialog>`, whose host owns `open` and styles the panel                                                                                                                                                                                         |
| A yes-or-no question                                 | `ConfirmService.ask()` from `@fz/ui/confirm`, with one `<fz-confirm-dialog />` in the app's root template                                                                                                                                                                                          |
| Telling a screen reader what changed                 | `AnnouncerService.say()` from `@fz/ui/announcer`, with one `<fz-announcer />` in the app's root template                                                                                                                                                                                           |
| Choosing a palette                                   | `<fz-theme-menu>` in a header, `<fz-theme-picker>` in a settings panel, both from `@fz/ui/theme`; `ThemeService` for the rest                                                                                                                                                                      |
| A palette role's value in code, such as for a canvas | `ThemeService.role("felt")`, a signal that follows the palette                                                                                                                                                                                                                                     |
| An icon                                              | `<fz-icon name="…">` from `@fz/ui/icon`. A new one is a name in `ICON_NAMES` and a case in its template, never an inline `<svg>`                                                                                                                                                                   |
| Radio buttons where choosing costs something         | `[fzRadioGroup]` from `@fz/ui/radio_group`, on a group of `role="radio"` buttons                                                                                                                                                                                                                   |
| `localStorage`                                       | `LocalStorageService` from `@fz/ui/storage`, which survives a browser that refuses storage                                                                                                                                                                                                         |
| The "Fuzzley Games" name                             | `<fz-wordmark>` from `@fz/ui/wordmark`, the fuzzball in the palette's accent and the name in lower case, inside the app's own link                                                                                                                                                                 |
| The tab's icon                                       | `favicon.svg`, `favicon.ico` and `apple-touch-icon.png`, which `fuzzleyStyle()` writes, linked with `vite-ignore` (step 3 below); `ThemeService` recolors the SVG to the palette in use                                                                                                            |
| The fuzzball anywhere else                           | `FUZZBALL`, its shapes, or `fuzzballSvg()`, a file of it, from `@fz/style/fuzzball`                                                                                                                                                                                                                |
| A game's bar                                         | `<fz-game-bar>` from `@fz/game-ui/game_bar`, filled through `fzBarTitle`, `fzBarStatus` and `fzBarActions`; `<fz-bar-overflow>` from `@fz/game-ui/bar_overflow` for what it has no room for; and `@use "@fz/game-ui" as game-ui;` for `game-ui.bar-size()`, which publishes its size for the board |
| A game's shape: compact, upright, what fits its bar  | `GameViewportService` from `@fz/game-ui/viewport` in code; `@fz/game-ui`'s `below()`, `from()`, `compact`, `phone-portrait` and `phone-landscape` in a stylesheet; `@fz/game-ui/breakpoints` without Angular; `installFakeViewport()` from `@fz/game-ui/testing` in specs                          |
| A game's clock                                       | `StopwatchService` from `@fz/game-ui/stopwatch`: whole seconds, counted only while the page is in view                                                                                                                                                                                             |

## Palettes and their modes

- The palette in use is `data-theme` on `<html>`, which `theme.js` sets
  before anything paints and `ThemeService` changes. Each palette sets every
  role, and its `color-scheme`, from `frontend/lib/style/src/tokens/_palettes.scss`;
  `frontend/lib/style/src/themes.ts` lists them with their modes.
- There are light palettes and dark ones, and an app's chrome wears whichever
  is in use. So read roles, and never branch on a palette's id.
- A tint of `--fz-text` turns with the mode: dark in a light palette, light
  in a dark one. What lies on a game's table rather than on its chrome takes
  `--fz-on-felt`, the felt's own ink, instead.
- An element can carry a palette of its own (`data-theme` on it, as a swatch
  does): the tints and surfaces are declared wherever a palette is, so they
  follow it there too.

## Adopting the libraries in an app

The Solitaire Collection is the worked example; the site does the same, and
so does Minesweeper (`frontend/games/minesweeper/`), a game built from the
libraries alone, which shows the same steps with nothing else around them.

1. **Depend on them.** List `"@fz/style": "workspace:*"` in the app's
   `package.json`, and for an Angular app `@fz/ui` and, for a game,
   `@fz/game-ui`, with their peers `@angular/aria` and `@angular/cdk`. Run
   `yarn install` from `frontend/`. Nothing in `lib/` is built: the app
   compiles each library from its source.
2. **Add the Vite plugin.** `fuzzleyStyle()` from `@fz/style/vite`, as in
   `frontend/games/solitaire/vite.config.ts`. It writes `theme.js` and the
   page's icons into the build and serves them in development.
3. **Load `theme.js` first.** A plain tag at the top of `<head>`, with no
   body, since the Content Security Policy allows no inline script:
   `<script src="theme.js" vite-ignore></script>`, as in
   `frontend/games/solitaire/index.html` (the site's, at its root, is
   `/theme.js`). Link the icons beside it the same way, the ICO before the
   SVG, as that page does: `favicon.ico` with `sizes="32x32"`, so a browser
   that draws both picks the SVG, then `favicon.svg`, then
   `apple-touch-icon.png` as `rel="apple-touch-icon"`.
4. **Load the global stylesheet first.** `@use "@fz/style/global";` at the
   top of the app's own, as in
   `frontend/games/solitaire/src/ui/app/styles/global.scss`, or
   `@use "@fz/style/tokens";` alone for a page that keeps its own reset and
   element styles. Every library rule sits in a cascade layer and the app's
   rules in none, so the app's always win: adjust a shared style by writing
   your own, never by out-specifying the library's.
5. **Lint with the preset.** `extends: ["@fz/style/stylelint"]`, as in
   `frontend/games/solitaire/stylelint.config.js`, listing in its
   `overrides` only a file that must write a color, such as a drawing's.
6. **Wire the Angular pieces.** Provide `THEME_COLOR_ROLE` where the
   browser's toolbar should take another role than `bar` (Solitaire's
   `frontend/games/solitaire/src/ui/app/main.ts` sets its own, so it
   provides `null`), and have the specs' setup call `installDialogPolyfill`
   from `@fz/ui/testing`, as `frontend/games/solitaire/test/test-setup.ts`
   does.
7. **Check text on the table.** Text on glass over the app's own table
   depends on the table too: hold it to 4.5:1 over every table color, as
   `frontend/games/solitaire/test/ui/app/styles/contrast.spec.ts` does. A
   game that draws on the palette's own roles checks what it draws in every
   palette instead, as
   `frontend/games/minesweeper/src/app/board/contrast.spec.ts` holds
   Minesweeper's numbers on their squares. Both compile the app's global
   stylesheet and measure it with `@fz/style/testing`.

Keep the players' `localStorage` keys as they are, whatever the app moves
onto `LocalStorageService`: renaming one loses what players saved.

## Changing a library

- **Everything shared carries `fz`**: tokens, classes, layers, selectors.
  An app's own names carry none.
- **A component reads no viewport.** What changes with the layout is an
  input the app binds, such as the bar's `compact`, to what a game's
  `GameViewportService` says or the site's own breakpoints.
- **A thing belongs in a library only when the apps mean the same by it.**
  Otherwise it stays in the app, until a second one needs it.
- **A palette role goes into every palette at once**, and a role that
  carries text, or sits behind it, gets a pair in
  `frontend/lib/style/src/tokens/contrast.spec.ts`.
- **Accessibility is the component's job**, by the `web-game-accessibility`
  skill's rules, so an app can't forget them.
- Run `yarn verify` from `frontend/`: every app compiles the libraries, so a
  change to one is checked by all of them.
