# The picture's library, chosen

`draw-pages.mjs` draws Brick Breaker, Sudoku and the Solitaire Collection at
1280 × 720 at 1× in headless Chrome, as a bug report's picture would be
drawn, with modern-screenshot 4.7.0 and with snapdom 3.8.1 (3.8.2, a day old,
was still behind the age gate), beside Chrome's own screenshot. Every
`<dialog>` and whatever shows nothing is left out, and each canvas is
swapped for a frame of it. `results.json` holds what it measured, run on
2026-11-22 with the machine's load at about 20 on 24 cores, from the other
worktrees' checks.

**The pick is snapdom.** modern-screenshot draws the Solitaire Collection
wrong, by the plan's rule: it can't draw it within the report's 3 seconds,
so the Collection's report would have no picture. It takes three to eleven
times as long as snapdom elsewhere. Every picture either library finished
matches Chrome's, once each is handed what is below. snapdom is 114 KB
gzipped to modern-screenshot's 9.7 KB, but either loads only as a picture
is taken.

| Game          | Library           | Draws, ms (the first cold) | Differs from Chrome | PNG    |
| ------------- | ----------------- | -------------------------- | ------------------- | ------ |
| Brick Breaker | modern-screenshot | 1,240 · 1,185 · 1,115      | 0%                  | 202 KB |
|               | snapdom           | 764 · 333 · 285            | 0%                  | 202 KB |
| Sudoku        | modern-screenshot | 548 · 548 · 552            | 0.01%               | 91 KB  |
|               | snapdom           | 219 · 53 · 48              | 0.01%               | 91 KB  |
| Solitaire     | modern-screenshot | 34,155 · 32,497 · 32,851   | 0%                  | 274 KB |
|               | snapdom           | 2,146 · 1,773 · 1,668      | 0%                  | 274 KB |

A pixel differs where a channel moved more than 48 of 255; Sudoku's are
its clock, a second on. Every picture is Chrome's size, which the script
checks.

## What each drew wrong

The script runs each library only as it was finally set up. What follows
the word "by hand" was measured once, in a page the same script opened,
while that setup was found, and the script doesn't reproduce it.

**modern-screenshot** waits for every `<img>` in what it draws to load
before it starts, hidden ones too, for up to its `timeout`, 30 seconds by
default. The Solitaire Collection's game browser, closed, holds thumbnails
loaded lazily, which never load while it is closed, so every picture of it
waits the whole 30 seconds. A shorter `timeout` would bound that wait, but
its own code bounds the load of the drawing it makes with the same limit,
which on a slow phone would draw a blank picture. Elsewhere, most of its
time goes on copying each element's computed style: by hand, with the
closed dialogs left in, Brick Breaker took 4 seconds.

**snapdom** drew three things wrong until it was handed what fixed each,
all by hand:

- **The page's background.** It paints the root's background only behind
  the root's box, and leaves the rest transparent, where the browser
  paints the whole window from the root or the body: 19% of Brick
  Breaker's picture and 46% of Sudoku's, which GitHub's dark theme would
  show black. Given the page's background color, it matches.
- **The frame, put in as an image.** An `<img>` of the frame put into its
  copy of the page is drawn blurred, as from a quarter of its pixels. The
  frame laid as the background of the copy of the element the canvas is
  drawn in, with that element's children dropped, is drawn sharp.
- **Its viewport clip.** Drawn with `clip: "viewport"`, every edge of
  Brick Breaker's page moved a pixel. Drawn at the root's own size, which a
  game's page fits to the window, it matches.

By hand, its own PNG encoder, through `toBlob()`, took about a second
longer on Brick Breaker than the browser's, through `toCanvas()` and
`canvas.toBlob()`, which the times above are.

The Solitaire Collection's picture takes 1.7 seconds even with snapdom. By
hand, cloning its page took about 60 ms, and nearly all the rest went on
the browser drawing and encoding the picture. That is past the second the
plan allows, but within the report's 3.

## The pictures

Each game's `<game>-chrome.webp`, `<game>-modern-screenshot.webp` and
`<game>-snapdom.webp` are the last draw of each, at quality 75.
