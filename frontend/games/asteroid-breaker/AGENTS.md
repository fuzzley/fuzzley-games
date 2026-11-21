# Asteroid Breaker

These rules hold for Asteroid Breaker, a game drawn with Phaser. The games',
in [frontend/games/AGENTS.md](../AGENTS.md), the frontend's and the
repository's apply too. Paths are relative to
`frontend/games/asteroid-breaker/`.

- **Before writing or running a spec, read the `asteroid-breaker-testing`
  skill.** It says which of the three Vitest projects a spec runs in, and
  what `src/testing/` already holds for one: fields drawn as pictures, the
  autopilot, the scene run on a fake shell.
- **Before adding a wave, a sector, a formation, a rock kind or trait, a
  pickup or its effect, or a weapon, or changing Endless, read the
  `asteroid-breaker-content` skill.** It lists the records the compiler
  asks for, and the specs and the report to run after.
- **Measure across the wrap.** The field is a torus, so the way and the
  distance between two things on it come from `src/rules/torus.ts`
  (`across()`, `distance()`), never from the difference of their
  coordinates. That is right mid-field, where a spec lays its things, and
  wrong either side of an edge. The scene draws a thing that wraps through
  `Copies` (`src/scene/painters/copies.ts`), by a reach its art exports, so
  it shows on both sides of an edge it reaches across.
- **Whatever a change adds to `Field` or `Run` is named in
  `src/rules/field/kept_field.ts` or `src/rules/run/saved_game.ts`, and in
  `src/rules/run/saved_game.spec.ts`, or left out on purpose,** as every
  game's rules ask. A once-a-wave flag left out lets its thing happen twice
  after a reload.
- **Raise `RULES_VERSION` (`src/rules/run/stats.ts`) in a change that
  alters what a run scores.** A best is kept with the number it was made
  under, and gives way to the next run to score once the number is raised.
  Without the raise, bests made under the old scoring stand against runs
  scored by the new.
- **Count the scene's lights before adding one.** Phaser lights an image by
  the ten lights nearest the camera's middle (`maxLights`) and drops the
  rest without a word. The first to go is the field's own, far off, which
  lights every rock. The scene makes seven (`addLight()` under
  `src/scene/`), and a headless spec, which draws nothing, sees none
  dropped.
