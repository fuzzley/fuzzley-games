# Mobile performance: the remaining options

Cards dragged slowly in phone browsers because every card had its own shadow
filter. Commit `db1114c` replaced those filters with one baked shadow texture,
which was option 1A of the original plan. This file lists the options that plan
left for later, so we can choose what to do next. Options 4, 4′ and 5 are
built; none of the others is yet.

## Where things stand

These were measured on a dev build in Chrome, emulating a 390×844 phone at pixel
ratio 3 with the CPU slowed 4×, on a desktop GPU. Frame times include the GPU's
work. Differences under about 0.1 ms are noise.

| Scenario                 | Before 1A                                 | After 1A                  | Shadows switched off |
| ------------------------ | ----------------------------------------- | ------------------------- | -------------------- |
| Klondike, idle           | 3.03 ms, 158 draws, 156 framebuffer binds | 0.52 ms, 2 draws, 0 binds | 0.62 ms              |
| Klondike, dragging       | 3.65 ms                                   | 0.55 ms                   | 0.60 ms              |
| Spider, idle (104 cards) | 6.73 ms, 314 draws, 312 framebuffer binds | 1.03 ms, 2 draws, 0 binds | 0.60 ms              |

What is left:

- **Spider still spends about 0.4 ms a frame on shadows.** It draws 104 shadow
  sprites over the full card area, and most of them are stacked out of sight in
  the stock. Option 2 addresses this.
- **The atlas download is still about 1.6 MB per deck.** On a phone, option 5
  (done) cut the atlas's GPU memory from about 62 MB to 16 MB. Option 4 (done)
  uploads it once per session instead of once per game switch. The PNG itself
  shrank only from 1.9 MB. Option 14 addresses the download.
- **The board redraws every frame even when nothing moves.** That is 60 to 120
  times a second, which costs battery and heat over a long game. Option 3
  addresses this.
- **Emulation is not a phone.** Draw calls and framebuffer switches are the same
  on every device, but the frame times are only relative. The first step is to
  try the deployed build on a real phone.

## At a glance

S, M and L are rough relative sizes.

| #   | Option                                        | Mainly helps              | Expected gain                                | Effort | Risk                                       |
| --- | --------------------------------------------- | ------------------------- | -------------------------------------------- | ------ | ------------------------------------------ |
| 2   | Don't draw cards that are fully covered       | Frame time (Spider)       | Most of Spider's 0.4 ms; less in other games | M      | Medium: hidden cards must reappear to move |
| 3   | Stop rendering when nothing changes           | Battery, heat             | Idle frames drop to zero                     | M      | Medium-high: a missed wake-up freezes it   |
| 4   | **Done:** keep one Phaser game across games   | Memory, switch time       | One WebGL context; atlas uploaded once       | M–L    | Medium: scene cleanup must be complete     |
| 4′  | **Done:** release the context when destroying | Memory                    | Old contexts freed straight away             | S      | Low                                        |
| 5   | **Done:** half-resolution atlas where it fits | Memory, load time         | 63 MB → 17 MB of textures on a phone         | M      | Low-medium                                 |
| 6   | Turn off WebGL multisampling                  | Memory, GPU bandwidth     | Unknown; may be small on phone GPUs          | S      | Low                                        |
| 7   | Lighter effects over the canvas               | Compositing time          | Measurable only on a device                  | S      | Low (visible design change)                |
| 8   | Set depth only when it changes                | Frame time                | One full display-list sort per frame removed | S      | Low                                        |
| 9   | Stop the hidden loading overlay's animations  | Main-thread time          | 23 endless CSS animations stopped            | S      | Low                                        |
| 10  | Fewer allocations per frame                   | Garbage-collection pauses | Only if traces show GC pauses                | M      | Low                                        |
| 11  | Hover hit-testing on move only, on touch      | Frame time                | Small                                        | S      | Low                                        |
| 12  | Lower the pixel-ratio cap on phones           | Frame time, memory        | 44% fewer pixels at 1.5                      | S      | Visible: softer cards                      |
| 13  | Cap the frame rate at 60                      | Battery                   | Half the frames on 120 Hz screens            | S      | Visible: less smooth dragging              |
| 14  | WebP atlas images                             | Download size             | Smaller download only                        | S      | Low                                        |

## The options

### 2. Don't draw cards that are fully covered

Some piles stack their cards exactly on top of each other: stocks, wastes and
foundations. Only the top card or two can be seen, yet every card and every
shadow beneath them is drawn. Spider's stock alone holds 50 cards.

The view builder (`src/engine/tableau/view/table_view_builder.ts`) would mark a
card hidden when the card above covers it completely. The renderer would then
hide that card's sprite and its shadow. Cards in fanned columns stay visible,
because part of each one shows.

**Pros**

- Removes most of Spider's remaining 0.4 ms, and some of Klondike's (24 stock
  cards and the foundations).
- It removes overdraw rather than moving it. Phone GPUs are usually limited by
  how many pixels they fill.
- Leaves fewer sprites to sort and hit-test.

**Cons**

- A hidden card must be shown again before it moves. That includes being drawn
  from the stock, being uncovered by an undo, or flying to another pile.
  `CardView` in `src/engine/render/view/table_view_state.ts` would need a
  visibility flag, with tests for each of those cases.
- Shadows stacked exactly on top of each other darken one another, so the halo
  around a deep stock is probably darker today than the one around a single
  card. Hiding the covered cards would lighten it. We would compare screenshots
  and, if needed, keep a couple of cards visible under the top one.

**How to measure:** compare idle and drag frame times in Spider and Klondike,
and count the visible sprites. A screenshot diff of the same deal confirms the
piles look unchanged.

### 3. Stop rendering when nothing changes

Phaser redraws every frame, but in solitaire nothing on the board moves most of
the time. Phaser's loop can be put to sleep with `game.loop.sleep()` and woken
again.

The board would sleep once no card is travelling and no drag or hover change is
in progress. It would wake on any of these:

- pointer input;
- any change to the game;
- a resize;
- a deck or felt change;
- a WebGL context restore.

**Pros**

- An idle board costs nothing. That saves battery and stops a phone heating up
  and throttling its CPU over a long game.
- While the board is idle, the browser also stops re-blurring the header over
  the canvas (see option 7).

**Cons**

- If anything forgets to wake the loop, the board stays frozen until the next
  tap. This is the riskiest change on the list, and it needs a test for each
  wake-up source.
- Phaser's tweens and timers stop while the loop sleeps, so anything that uses
  them has to wake it first.
- It saves nothing during a drag, which is when speed matters most.

**How to measure:** count the frames rendered during a minute of idle play,
which should be near zero. On a real phone, compare battery drain and whether
the CPU throttles over a 10-minute session.

### 4. Keep one Phaser game across game switches

**Done, with 4′.** Over ten switches the session now creates 2 contexts instead
of 12, and a forced collection leaves one `BoardScene` instead of 11. The median
switch fell from 124 ms to 17 ms. The "three contexts still alive" below was a
leak, not a slow collector: a destroyed board never unsubscribed from the
presentation service (`a571377`). The host keeps one game and swaps boards into
it (`03472aa`), and loses the context when it is destroyed (`abbe7a6`).

`PhaserHost` (`src/engine/render/phaser/phaser_host.ts`) creates a new
`Phaser.Game` every time the player switches games. Each one brings a new WebGL
context, compiles its shaders again and uploads the deck's atlas again. In
testing, three contexts were still alive after a single switch. Browsers cap
how many contexts a page can hold and drop the oldest once the cap is reached.
iOS Safari is the strictest about this.

**Pros**

- Switching games gets faster. There is no new context to create, no 65 MB atlas
  to upload again and no shaders to compile.
- Memory stays flat over many switches, instead of depending on when the browser
  gets round to freeing old contexts.

**Cons**

- `PhaserHost` would swap the board scene instead of rebuilding the game.
  Scene shutdown would then have to clean up completely. Today a leak is
  discarded along with the game; it would instead build up over a session.
- It is a sizeable change to code that works today.

**Cheaper stopgap (4′):** when the host destroys a game, call `loseContext()`
from the `WEBGL_lose_context` extension, so the browser frees the context's
memory at once. That is a few lines of code, but switching gets no faster.

**How to measure:**

- Count the contexts created, by wrapping `HTMLCanvasElement.prototype.getContext`.
- Time how long it takes from choosing a game to its first frame.
- Take heap snapshots before and after 10 game switches.

### 5. Half-resolution atlas on small screens

**Done.** A board now draws from a half-size atlas whenever its layout scale is
at most 1, so its cards are never drawn larger than the art. That covers phones
in both orientations and most 1080p desktops.

On the phone benchmark:

| Measurement    | Before                 | After            |
| -------------- | ---------------------- | ---------------- |
| Textures       | 63.1 MB                | 16.7 MB          |
| Atlas pages    | 4032×3732 and 1792×622 | one 3420×1260    |
| Shadow texture | 504×710                | 252×356          |
| Atlas download | 1863 KB                | 1585 KB          |
| Klondike, idle | 0.52 ms, 2 draws       | 0.54 ms, 2 draws |
| Klondike, drag | 0.55 ms                | 0.57 ms          |
| Spider, idle   | 1.03 ms, 2 draws       | 1.03 ms, 2 draws |

- **Download:** it barely shrank. A filtered shrink leaves in-between colours,
  which PNG compresses poorly.
- **Look:** screenshots of the same deal show smoother pips, indices and face
  cards. The full-size art had been skipping texels.
- **Growing past scale 1:** a desktop window that grows past scale 1 draws the
  half-size art enlarged for three frames while the full set loads, then
  releases the half-size set.

How it was built:

- Every deck is built at 1× and 2×; the 1× frames are shrunk from the finished
  2× ones (`1034d12`).
- View state stays in design units, and only the renderer divides by the
  atlas's density (`916a0c4`). The con below about the layout maths did not
  arise.
- The board chooses the density, and moves up to 2× when a resize calls for it,
  but never back down (`65d3277`).

Before this, card art was 440×614, 2 texels per design unit. A phone shows a card
about 107 device pixels wide, so the GPU held about 16 times as many pixels as it
showed.

The atlas build would also produce a half-size set. The board scene, which
loads the deck, would choose it when its card scale is small enough.

**Pros**

- GPU memory per deck falls from about 65 MB to about 16 MB, and the atlas
  downloads and decodes faster.
- Cards probably look better on phones too. Without mipmaps, shrinking a card
  fourfold samples only some of its pixels, so pips and corner indices can look
  grainy. A pre-shrunk atlas averages them properly.

**Cons**

- It adds a second set of atlas files per deck to build, ship and keep in step.
- The art's density would become a value chosen at load time instead of a
  constant, which reaches into the layout maths.
- If a phone is rotated or a window enlarged past the threshold, the cards stay
  soft until the full-size set is loaded.
- Mipmaps alone are not an alternative. The context is WebGL1, which cannot
  mipmap the atlas pages because their sizes are not powers of two.

**How to measure:** read texture memory from Phaser's texture manager, time the
atlas download and decode, and compare screenshots at phone size.

### 6. Turn off WebGL multisampling

The WebGL context is created with antialiasing on, because Phaser's
`render.antialiasGL` defaults to true. The `render.antialias: true` in
`phaser_host.ts` is a different setting: it controls texture smoothing and stays
on. Cards are straight-sided rectangles whose rounded corners come from
transparency in the art. In practice, then, multisampling mostly smooths the
highlight borders.

**Pros**

- Saves the multisample buffer, roughly 20 MB at a phone's canvas size by a
  rough estimate, and the work of resolving it every frame.
- It is a one-line change.

**Cons**

- The highlight borders' rounded corners get slightly rougher.
- Phone GPUs usually multisample cheaply, so the gain may be small. Only a
  real-device measurement can tell.

**How to measure:** compare GPU frame time on a real device, using Chrome remote
tracing or Android GPU Inspector, and screenshots of a highlighted pile.

### 7. Lighter effects over the canvas

Two effects sit over the canvas, and the browser recomposites them every time
the canvas redraws:

- **The header blur.** The header's frosted glass (`glass(12px)` in
  `src/ui/app/component/header_bar/header_bar.component.scss`) blurs the canvas
  behind it every frame.
- **The vignette.** The vignette (`:host::after` in
  `src/ui/app/component/game_canvas/game_canvas.component.scss`) is a
  full-screen translucent gradient blended over the canvas every frame.

The fix would be a solid header below the tablet breakpoint. The vignette could
move into Phaser as a single image, but blending it there costs about the same,
so the blur is the more promising half.

**Pros**

- Removes a blur of the header strip from every frame during a drag.

**Cons**

- The header visibly changes on phones.
- The gain can only be measured on a device, because desktop compositors hide
  it.
- With option 3 in place, an idle board stops paying for both effects anyway.

**How to measure:** on a real device, switch the header blur off in DevTools and
compare GPU compositing time per frame during a drag.

### 8. Set depth only when it changes

Phaser sorts the whole display list in any frame where an object's depth is set,
even to the value it already had. `PhaserTableRenderer`
(`src/engine/render/phaser/phaser_table_renderer.ts`) sets the depth of every
card, shadow and placeholder every frame, so the list is sorted every frame. In
Spider that list holds over 200 objects. Highlight borders already skip
unchanged depths; cards, shadows and placeholders would do the same.

**Pros**

- Removes a sort from nearly every frame. Even during a drag, depths change only
  when the drag starts and ends.
- It is a few lines of code.

**Cons**

- None of note. Comparing against `sprite.depth` avoids keeping a separate
  cache that could fall out of step.

**How to measure:** count depth sorts per frame, which should drop from one to
zero while the board is idle, and time the sort.

### 9. Stop the hidden loading overlay's animations

Once loading finishes, the overlay in
`src/ui/app/component/game_canvas/game_canvas.component.html` is hidden with
`visibility: hidden`. Its 23 endless CSS animations keep running even so. They
are the skeleton slots' `shimmerSweep`, the badge's `pulseGlow` (which animates
a box-shadow) and the spinners. The browser keeps updating their styles every
frame.

The fix is to pause them under `.hidden` with `animation-play-state: paused`,
or to render the overlay's contents only while loading.

**Pros**

- A small, safe change that frees main-thread time on every frame.

**Cons**

- Removing the contents with `@if` would cut the fade-out short. Pausing the
  animations avoids that.

**How to measure:** after loading, count the running animations with
`document.getAnimations().filter((a) => a.playState === "running")`. Today
there are 23; there should be none. Also compare "Recalculate style" time in a
trace.

### 10. Fewer allocations per frame

Each frame rebuilds the view state for every card, and the renderer builds a new
map of the cards still travelling. All the game's per-frame logic measured
0.05–0.14 ms, so this matters only if a trace shows garbage-collection pauses
during a drag.

**Pros**

- Frame times would be steadier on phones that pause for garbage collection, if
  any do.

**Cons**

- Reusing objects makes the view code harder to read and test. It is not worth
  doing without evidence.

**How to measure:** check the allocation rate and garbage-collection events in a
trace of a 10-second drag.

### 11. Hover hit-testing on move only, on touch screens

`BoardScene` calls `input.setPollAlways()`, so a mouse hover updates when a card
moves under a pointer that is standing still. Touch screens have no hover, but
the hit test still runs every frame. On devices that match
`matchMedia("(hover: none)")`, the scene could use `setPollOnMove()` instead.

**Pros**

- A few lines of code that remove a per-frame hit test against every interactive
  sprite on phones.

**Cons**

- A tablet with a mouse attached has to be detected correctly.
- The gain is small.

**How to measure:** time Phaser's input update per frame.

### 12. Lower the pixel-ratio cap on phones

`ViewportScaler.MAX_PIXEL_RATIO` is 2. At 1.5, the GPU fills 44% fewer pixels and
the canvas's buffers shrink to match.

**Pros**

- A one-line change that cuts fill and memory on every frame.

**Cons**

- Cards and their corner indices look visibly softer.
- A dynamic version, which lowers the cap only when frames run long, avoids that
  but adds complexity and a visible change in sharpness when it switches.

**How to measure:** compare frame times on a real device, and screenshots side
by side.

### 13. Cap the frame rate at 60

On 120 Hz phones, Phaser's loop runs at 120 frames a second, which doubles the
work. Phaser's `fps.limit` setting can cap it.

**Pros**

- Halves the per-frame work and the power it uses on those phones.
- Card easing is based on elapsed time, so cards keep their speed.

**Cons**

- Dragging is visibly less smooth on a 120 Hz screen, and smooth dragging is the
  point of this whole effort.
- A 90 Hz screen cannot divide its frames evenly into 60, so motion judders.
- If option 3 is done, a cap is mostly redundant.

**How to measure:** compare frames per second and power use on a 120 Hz
device.

### 14. WebP atlas images

The atlas pages are PNGs. Lossless WebP is typically about a quarter smaller.

**Pros**

- The first load is faster on a slow connection.

**Cons**

- No effect on GPU memory or frame rate, because both formats are decoded to raw
  pixels.
- It adds another output to the atlas build.

**How to measure:** compare transfer size, and time to the first board frame on
a throttled connection.

## How to measure

The numbers above came from a probe run through Chrome DevTools. The same setup
works for every option.

1. **A repeatable benchmark.**
   - **Setup:** a fixed phone viewport and a 4× CPU throttle, on Klondike and
     Spider, with 3 seconds idle and a 3-second scripted drag.
   - **Record:** frame time (median and 95th percentile), draw calls and
     framebuffer switches per frame, the time the game's own logic takes, and
     JS heap size.
   - Draw calls and framebuffer switches do not depend on the hardware, so they
     are the most dependable comparison.
2. **An optional `?perf` overlay** that also works in the production build. It
   would show:
   - frames per second and frame-time percentiles;
   - the share of frames over 16.7 ms and over 33 ms;
   - draw calls and texture memory;
   - how far the dragged card trails the finger, which measures "dragging feels
     slow" directly.
3. **Real devices as the final check.**
   - **Serve:** run `yarn build` then `vite preview --host`, and open the build
     on a phone on the same network.
   - **Android:** use Chrome remote debugging and its Frame Rendering Stats
     overlay.
   - **iOS:** use Safari Web Inspector's Rendering Frames timeline.
   - **Compare:** average frames per second, and the share of slow frames,
     during a 10-second drag.
4. **Memory.**
   - Total texture size, from Phaser's texture manager.
   - The number of WebGL contexts created.
   - Heap snapshots before and after 10 game switches.
5. **Guards in tests.** Unit tests can keep the cheap wins in place:
   - card sprites have no filters (already tested);
   - depth is not set when it has not changed;
   - hidden cards are shown before they move.

   A screenshot comparison of a fixed deal catches visual changes.

### The probe

To take the same measurements again:

1. **Count WebGL calls.** Load the page with an init script that wraps the draw,
   `bindFramebuffer`, `useProgram`, `clear` and `texImage2D` methods of
   `WebGLRenderingContext.prototype`. Count the calls per animation frame.
2. **Find the running game.** Get it from Phaser's canvas pool:
   `(await import(<phaser.js URL from the page's resource entries>)).Display.Canvas.CanvasPool.pool.find((e) => e.parent?.game).parent.game`.
3. **Time a frame.** Time `game.loop.callback`, calling `gl.finish()` at its end
   so the GPU's work counts.
4. **Time the game's logic.** Time `scene.sys.sceneUpdate`. Patching
   `scene.update` does not work, because Phaser keeps its own reference to it.
5. **Drive drags.** Send synthetic mouse events to the canvas.
6. **Isolate one effect.** Switch it on and off on the same deal and compare.

## Suggested order

1. **Try the deployed build on a real phone.** If dragging keeps up now, the rest
   of this list is about memory, battery and heat rather than drag speed. That
   changes the priorities.
2. **Options 8 and 9.** They are small and safe, and each fits in one commit.
3. **Option 2.** It removes Spider's remaining shadow overdraw.
4. **Option 3.** It saves battery and heat, and makes option 7 free while the
   board is idle.
5. **The rest, only on evidence.** Do options 6, 7, 12 and 13 only if a
   real-device trace points at them. Do options 10, 11 and 14 only if a
   measurement shows they are worth it.
