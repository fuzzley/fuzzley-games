# Text inventory: lib/game-ui

Written by `extract.mjs`; do not edit by hand. Each entry gives its line,
where it sits, and its text, with `{{ … }}` or `{…}` where a value is put
in, keys in square brackets and bold lead-ins in asterisks.

## How to play and rules

### src/help_catalog/help_catalog.component.html

- 13 `<div>` **{{ entry.name }}.** {{ entry.about }}

### src/help_dialog/help_dialog.component.html

- 1 `<fz-dialog label>` How to play
- 11 `<h2>` How to play

## Labels: buttons, menus, headings, readouts and settings

### src/bar_overflow/bar_overflow.component.ts

- 59 `input()` More actions

### src/bar_overflow/home_link.ts

- 21 `label:` Fuzzley Games

### src/bar_overflow/menu_actions.ts

- 10 `label:` How to play
- 20 `label:` Settings

### src/bar_pause/bar_pause.component.ts

- 71 `label:` Resume
- 72 `label:` Pause

### src/bar_sound/sound_menu_action.ts

- 10 `label:` Turn sound off
- 11 `label:` Turn sound on

### src/run_lifecycle/run_lifecycle.ts

- 10 `confirmLabel:` New game

### src/settings_drawer/settings_drawer.component.html

- 1 `<fz-dialog label>` Settings
- 4 `<h2>` Settings

## Hints: setting descriptions, tooltips and prompts

### src/bar_overflow/bar_overflow.component.html

- 7 `<button [title]>` {{ label() }}

### src/bar_sound/bar_sound.component.ts

- 18 `title:` Sound

### src/game_bar/game_bar.component.html

- 19 `<a title>` Fuzzley Games

## Messages: notices, confirmations, explanations and errors

### src/run_lifecycle/run_lifecycle.ts

- 8 `title:` Start a new game?
- 9 `message:` The run in progress will be lost.
- 16 `title:` Start a new {speedName} game?

## Spoken text: labels and announcements for screen readers

### src/bar_choice/bar_choice.component.html

- 7 `<button [aria-label]>` {{ badgeLabel() }}
- 33 `<div [aria-label]>` {{ label() }}

### src/bar_overflow/bar_overflow.component.html

- 33 `<div [aria-label]>` {{ label() }}

### src/game_bar/game_bar.component.html

- 18 `<a aria-label>` Fuzzley Games

### src/help_dialog/help_dialog.component.html

- 6 `<button aria-label>` Close How to play

### src/settings_drawer/settings_drawer.component.html

- 8 `<button aria-label>` Close settings
