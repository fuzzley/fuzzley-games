# Text inventory: lib/phaser

Written by `extract.mjs`; do not edit by hand. Each entry gives its line,
where it sits, and its text, with `{{ … }}` or `{…}` where a value is put
in, keys in square brackets and bold lead-ins in asterisks.

## Labels: buttons, menus, headings, readouts and settings

### src/canvas/canvas_cards.component.html

- 19 `<p>` The board couldn't be drawn
- 21 `<button>` Reload

## Hints: setting descriptions, tooltips and prompts

### src/canvas/canvas_cards.component.ts

- 14 `title:` Still loading the board
- 15 `line:` It can take a while on a slow connection.

## Messages: notices, confirmations, explanations and errors

### src/canvas/canvas_cards.component.html

- 20 `<p>` Reloading the page may help.

## Spoken text: labels and announcements for screen readers

### src/canvas/phaser_canvas.component.html

- 5 `<div [aria-label]>` {{ surfaceAria().label }}
