# Labels, settings, tooltips and prompts

The short text a player reads while playing: buttons, menu items, headings,
readouts, setting names and the line under them, tooltips, and the prompt that
says what to press.

Most of this was already right. Change it lightly, and only where it breaks a
rule here.

## Lines to copy

From shipped games:

- Buttons: New Game, Cancel, OK, Continue, Restart, Undo, Close, Play again, Try
  again, Next level.
- Readouts: Score, Best, Time, Mines, Lives, Level 3.
- Setting names: Show Minimap, Screen Shake, Music Volume, Pause When Unfocused.
  Those games use Title Case. We use sentence case.
- Under a setting: "When enabled, the game will pause when it is not in focus."
  (Mindustry) "Higher values may increase power consumption."
- Tooltips: "Undo the last move", "Get a hint for your next move", "Pause the
  game" (AisleRiot).
- Prompts: "Press [key] to fire the ball" (KBreakOut), "Tap a location to move
  and interact."

From these games, as they should read:

- Buttons: New game, Next level, Resume, Restart, Try again, Choose a level,
  Close.
- A setting: "Auto-fire" with "The ship fires on its own. On a touch screen,
  only the Dash button shows."
- A setting: "Play sounds" with "Turns all sound on or off. Same as the Sound
  button."
- A setting: "Play sounds" in Snake, with no line under it. The name says it.
- A setting: "Shot speed" with "Fast-forward stays on until you turn it off.
  Drop ends a shot early and keeps what it has broken."
- Prompts: "Tap to launch." "Swipe to start." "Press Enter to resume."

## Buttons and menu items

2 words, 3 at most. A verb first: Resume, Restart, Undo, Choose a level. "New"
or "Next" and a noun is the other common shape: New game, Next level.

Sentence case. No full stop. Leave out "the" when the label is clear without it.

A button in a dialog is named for what it does: Restart, Discard, Keep playing.
Not Yes and No.

Use the same label for the same action in every game. The [word list](words.md)
has the ones that are settled.

## Headings and readouts

A readout is one word where one will do: Score, Best, Lives, Level, Wave. The
number follows it with no colon.

A heading names what is under it in one to three words: Controls, Scoring,
Bricks.

## Setting names

3 words. Either the thing (Shot speed, Card back, Theme) or a verb and the thing
for a switch (Play sounds, Show timer, Mark mistakes).

Name a switch for what happens when it is on. "Play sounds", not "Mute".

Options are one word each where they can be: Slow, Normal, Fast. Off, Low, High.

## The line under a setting

One sentence of 14 words, two at most. Say what the game does when the setting
is on, or what the choice changes.

- "The ship fires on its own."
- "Shows where the shot will go, up to its first bounce."
- "Each mine you open costs 1 life."

A second sentence is for what the player would not guess: a side effect
("Changing this starts a new game.") or another button that does the same ("Same
as the Sound button.").

Leave the line out when the name already says it. A line that only lists what
the player can hear or see for themselves is not helping.

Do not explain the interface. "Off, it mutes the effects, the voice and the bed,
as the bar's Sound button does" explains three things nobody asked about, with a
made-up word in it. "Turns all sound on or off. Same as the Sound button." is
the whole of it.

## Tooltips

3 to 7 words. The button again, with its object: "Undo the last move", "Start a
new game". No full stop. If the button's label already says everything, the
tooltip can repeat it. If you have nothing to add and the label is visible,
leave the tooltip off.

## Prompts

9 words. An order that names the key or the touch, then what it does.

- "Tap to launch."
- "Press Space to launch the ball."
- "Swipe to start."

Write one prompt for each way of playing, and show the one for the way the
player is using. Do not fold three inputs into one sentence.

## Keys and touches

- A key by its name: P, Space, Esc, Enter, Shift, the arrow keys, W A S D.
- "Press" a key. "Hold" a key that is held. "Tap" a touch screen. "Click" a
  mouse. "Drag" and "Swipe" for both where both work.
- In a template, each key goes in its own `<kbd>`.
