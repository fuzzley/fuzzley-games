# @fz/ui

The `@fz/ui` library (`frontend/lib/ui`): the Angular components, services
and tokens the site and the games share, so each app's frame looks and
behaves alike. Its styles come from `@fz/style`
([frontend/lib/style/AGENTS.md](../style/AGENTS.md)), which it depends on.
The repository's rules, which apply here too, are in
[.agents/AGENTS.md](../../../.agents/AGENTS.md). Paths are relative to
`frontend/lib/ui/`.

## What it holds

One folder under `src/` per entry point, each with an `index.ts` that names
what it exports; an app imports it as `@fz/ui/<folder>`.

- `src/storage/`: `BROWSER_STORAGE`, the browser's `localStorage`, or `null`
  where the browser refuses it, which a service injects rather than reading
  the global, so a spec can hand it another; and `LocalStorageService`, which
  reads and writes strings and JSON through it, warning rather than throwing
  where the store is missing or refuses.
- `src/theme/`: `ThemeService`, which applies the palette in use, remembers
  it, takes up one chosen in another tab, and gives a role's color as a
  signal (`role("felt")`); `<fz-theme-menu>`, the menu a player picks one
  from; and `<fz-theme-picker>`, the same choice as radios, for a settings
  panel. `THEME_COLOR_ROLE` names the palette role the browser's own toolbar
  takes (`bar` unless an app provides another, such as `felt` for a game
  whose table runs to the top, or `null` for an app that sets it itself).
- `src/confirm/`: `ConfirmService`, whose `ask()` takes a title, a
  message, the buttons' labels and a tone (`accent`, or `danger` for what
  can't be undone) and resolves to the player's answer; and
  `<fz-confirm-dialog>`, the alert dialog that shows it, which an app puts
  in its root template once. Cancel comes first, so the dialog focuses it,
  and Escape or a click outside answers no. It wears `@fz/style`'s
  `.fz-button` classes, on a card of its `--fz-float`.
- `src/dialog/`: `<fz-dialog>`, which shows what it holds in a native
  modal `<dialog>`, so the browser traps focus, makes the page behind it
  inert and gives focus back on close. The host owns `open`: the dialog
  asks to close through `closed`, on Escape or a backdrop click unless
  `dismissible` is off, and never closes itself. It paints only the
  backdrop, which an app tints with `--fz-dialog-backdrop`; the host styles
  the panel.
- `src/icon/`: `<fz-icon name="…">`, the icons, drawn as outlines but for
  a few filled ones; `ICON_NAMES` lists them. A new icon is a name there and
  a case in the template. An icon takes the text's color. Its size comes
  from `width` and `height`, or from `--fz-icon-size`, which it inherits,
  so a fragment in one of `@fz/style`'s layers can size it too, though the
  component's unlayered `:host` outranks the fragment's own `width`. An
  outline's weight comes from `--fz-icon-stroke`.
- `src/radio_group/`: `[fzRadioGroup]`, which gives a group of
  `role="radio"` buttons one tab stop and the arrow keys, Home and End.
  Angular Aria has no radio group. The arrows move focus without choosing,
  since a choice can cost something, such as a game's rule dealing a new
  game; a group where choosing is free can use native radios instead, as
  `<fz-theme-picker>` does.
- `src/testing/`: what an app's specs need to drive these components, for
  its spec setup file only: `installDialogPolyfill`, which gives jsdom's
  `<dialog>` the `showModal()`, `close()` and Escape it lacks.
- `src/wordmark/`: `<fz-wordmark>`, the "Fuzzley Games" name in its own
  type. It is text: an app that links it puts it in its own `<a>`, with a
  `routerLink` or an `href`, and the link takes its name from it.

## How an app uses it

- **From source, never built.** An app lists `"@fz/ui": "workspace:*"` in its
  `package.json`, beside `@fz/style`, and imports the entry points `exports`
  names (`@fz/ui/theme`). Its Angular compiler compiles the library's
  components along with its own.
- **An app loads `@fz/style`'s global stylesheet.** The components read its
  tokens with `var()` and style nothing outside themselves.
- **Imports go one way.** This library imports `@fz/style` and Angular, never
  the site or a game; `yarn constraints` fails a dependency on either.

## Rules

- **Everything it defines carries `fz`**: `fz-theme-menu`, `--fz-icon-stroke`.
  ESLint requires the prefix on every component and directive selector, so an
  app's own `app-` components never collide with the library's.
- **A component knows nothing of the page around it.** It reads no viewport
  width and no app's breakpoint: what changes with the layout is an input,
  such as the theme menu's `compact`, which the app binds to its own
  breakpoint. What differs between apps is an injection token with a default,
  such as `THEME_COLOR_ROLE`.
- **Relative imports name the folder or the file, without an extension**
  (`../storage`, `./theme.service`). Only bundlers load this library, unlike
  `@fz/style`'s Vite plugin, which Node does.
- **Accessibility is the component's job.** Each one meets the
  `web-game-accessibility` skill's rules by itself, so an app can't forget
  them: menus are built on Angular Aria, every control has an accessible
  name at every size, and the specs find elements by role and name.
- **The strictest compiler options.** `tsconfig.json` holds the site's and
  the games' strict flags together, and Angular's strict template checks,
  since each app compiles these files with its own.

## Checks

The root's `yarn lint`, `yarn typecheck` and `yarn test` run the library's
own, which `yarn workspace @fz/ui <script>` runs alone.

- **`lint`** runs ESLint (`eslint.config.js`): the site's TypeScript and
  template rules, with Angular's template accessibility checks, and the `fz`
  selector prefix. Then `lint:styles` runs stylelint with `@fz/style`'s
  preset.
- **`typecheck`** runs the Angular compiler's checks over the sources
  (`tsconfig.lib.json`), emitting nothing, then `tsc` over the specs
  (`tsconfig.spec.json`) and the Vitest config (`tsconfig.node.json`).
- **`test`** runs Vitest with jsdom and Testing Library, as the site's specs
  do; the site's `vitest-testing` skill
  ([frontend/site/.agents/skills/vitest-testing/SKILL.md](../../site/.agents/skills/vitest-testing/SKILL.md))
  covers the patterns. Each spec sits
  beside the file it tests.
