# Text inventory: lib/ui

Written by `extract.mjs`; do not edit by hand. Each entry gives its line,
where it sits, and its text, with `{{ … }}` or `{…}` where a value is put
in, keys in square brackets and bold lead-ins in asterisks.

## Names: games, modes, levels and things

### src/theme/theme.service.ts

- 80 `modeName:` Dark
- 80 `modeName:` Light

## Labels: buttons, menus, headings, readouts and settings

### src/confirm/confirm.service.ts

- 31 `confirmLabel:` Confirm
- 32 `cancelLabel:` Cancel

### src/confirm/confirm_dialog.component.html

- 4 `<fz-dialog [label]>` {{ confirm.prompt().title }}

### src/theme/theme_menu.component.html

- 11 `<span>` Theme
- 23 `<p>` Theme

### src/theme/theme_menu.component.ts

- 34 `computed()` Theme: {this.options().find((option) =\> option.checked)?.name ?? ""}

### src/theme/theme_picker.component.ts

- 25 `input()` Theme

### src/wordmark/wordmark.component.html

- 2 `(text)` Fuzzley Games

## Spoken text: labels and announcements for screen readers

### src/dialog/dialog.component.html

- 12 `<dialog [aria-label]>` {{ label() \|\| null }}

### src/theme/theme_menu.component.html

- 7 `<button [aria-label]>` {{ label() }}
- 19 `<div aria-label>` Theme

### src/theme/theme_picker.component.html

- 1 `<div [aria-label]>` {{ label() }}
