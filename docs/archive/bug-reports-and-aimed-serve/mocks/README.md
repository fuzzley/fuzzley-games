# Aimed serve mocks

Brick Breaker's aimed serve isn't built yet. These mocks draw it over real
captures of the game, taken from the run the game's preview shows: level 9,
Rocket, with the ball waiting on the paddle. The dotted guide, the outline
and the finger's ring come from `make-mocks.mjs`, not from the game. It
traces a circle the ball's size from the ball, against the walls and each
standing brick, and turns it once, as a mirror would.

- `aim-ready.webp`: the Ready card over the waiting ball, its words changed in
  the page to "Press Space or click to launch." and "Hold to aim."
- `aim-aiming.webp`: the launch held at −35°, with the card hidden. The guide
  meets the bottom-right corner of the worn tough brick at column 1, row 11
  (the left fin's foot). It turns there and runs 3 units on.
- `aim-steep.webp`: the same at +12°. The guide meets the left side of the
  green flame brick at column 8, row 12, and turns left. It stops 1.39 units
  on, where it would meet the pink brick at column 7, row 10.
- `aim-phone.webp`: a phone, 390 × 844 at 3 pixels to the CSS pixel, aimed
  −25° with the card hidden. The guide meets the left wall and turns. The
  ring is a finger dragged up from 40 CSS px below the paddle, under the
  ball, along the aim. It lies where that line comes nearest to 90 CSS px
  above the paddle and 40 left of the ball: 80 above and 61 left.
- `aim-sheet.webp`: the four side by side, with captions set in the page's
  font.

To make them again, serve the game and run both scripts from the repository
root:

```sh
(cd frontend/games/brick-breaker && npx -y corepack yarn dev --port 9110 --strictPort) &
node docs/archive/bug-reports-and-aimed-serve/mocks/capture.mjs
node docs/archive/bug-reports-and-aimed-serve/mocks/make-mocks.mjs
```

`capture.mjs` writes PNG captures to `shots/`, and writes `shots.json` with
where the field lies in each and which bricks stand. `make-mocks.mjs` needs
no server. It writes the WebP mocks, then deletes `shots/` unless it is given
`--keep-shots`.

Field units map to pixels from what the board reports about itself: its
`data-field` rectangle, offset by the canvas, and its `--across` and
`--down`. A unit is the field's width over 26, and the script checks it
against the height over `--down`. With `make-mocks.mjs --check <folder>`
(and the shots kept), it puts a dot on the ball's middle and on every brick's
corners instead, to show that they land where the game draws them.
