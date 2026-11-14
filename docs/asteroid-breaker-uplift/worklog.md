# Work log: an uplift for Asteroid Breaker

The newest entry is last. Each says what was done, what it decided and what
comes next, so the work can be picked up from the last entry alone.

- **Branch:** `claude/asteroid-breaker-uplift-a0bd76`, a worktree at
  `.claude/worktrees/asteroid-breaker-uplift-a0bd76`, cut from `main` at
  `eb560e1f`. Nothing here is pushed.
- **Folder:** everything made for the uplift is in
  `docs/asteroid-breaker-uplift/`. Nothing in the game is changed.

## What was asked (2026-11-14)

Design one more uplift for Asteroid Breaker, wearing the game, graphics and
sound design hats:

1. Research similar games, without looking at any source code and without
   copying any asset. Everything made must be original.
2. Find where the visual fidelity and the sound effects can improve (the
   sounds are "quite bad right now"), then make detailed mocks, then real
   assets the uplift can use.
3. Look for changes and additions to the gameplay, and say what to remove
   where a part is weak or clashes with a better idea.
4. Look at how the fuzzball is used now, and make it better: how it looks,
   and how much of the play it is part of.
5. Keep a later progression system in mind (RPG-style levels, powers or
   stats chosen from a random few), without designing it yet.
6. Use subagents where the work runs in parallel, commit design notes, mocks
   and assets regularly on a dedicated branch, and keep this log.

## The order of work

| Step | What                                                               | State |
| ---- | ------------------------------------------------------------------ | ----- |
| 1    | Read the earlier designs and the game as it is                     | done  |
| 2    | Research: mechanics, look and feel, sound; an audit of the game    | begun |
| 3    | The design: `plan.md`, with its decisions                          |       |
| 4    | Mocks: the art sheets and the scenes, now and after                |       |
| 5    | Real art: sprites, atlases and backdrops                           |       |
| 6    | Real sound: a synth, the effects, the bed, and a page to hear them |       |
| 7    | Review, format, and a last entry here                              |       |

## Log

### 2026-11-14, step 1: reading

- Read `docs/brick-breaker-uplift/plan.md` for the shape an uplift plan
  takes here: research notes by agents from prose sources, concept art drawn
  by scripts, mocks, decisions the user settles, phases and risks.
- Read the game's `AGENTS.md`, `src/rules/tuning.ts`, the three catalogs
  (rocks, pickups, weapons), `tools/build-sounds.mjs`, `@fz/dev/sounds`, the
  sound lab's notes and `src/view/effects/effects.ts`, and the "As built"
  part of `docs/archive/asteroid-breaker-execution-plan.md`.
- **What stands out, before any research:**
  - The look is flat: rocks are one-tone blobs with dots, the backdrop is
    grey specks on the field's color, shots are white dashes. Nothing glows,
    nothing is lit, and no sector looks different from another.
  - The sounds are fourteen, at 16,000 samples a second, from sines and one
    dull noise, dry, one take each. The sound lab's own notes say why they
    fall short and that they "need designing again".
  - The fuzzball is a passenger. It shows in the ship's small window, in the
    bar as the ships left, as a stray in a bubble worth 500 points, and
    bailing out of a lost ship. A stray brought home changes nothing in the
    wave it was caught in.
  - Five of the eight pickups are timed, which a later progression system
    would clash with or lean on, depending on what the uplift makes of them.
- **Tools on this machine:** Node 26.12, Chrome and ffmpeg are installed.
  The worktree had no `node_modules`; `yarn install --immutable` was run in
  `frontend/` so that the game's own report, sharp and Prettier can run.

### 2026-11-14, step 2: research begun

Four agents, each writing one note in `research/`:

- `mechanics.md`: what games like this one add to the genre, what players
  praise and resent, and what a later progression system would need the
  base game to have.
- `look-and-feel.md`: how such games reach their look, what keeps a busy
  field readable, and what feel costs.
- `sound.md`: how arcade shooters sound, how their effects are built, mixed
  and varied, and what a browser asks of them.
- `the-game-today.md`: an inventory of the game as it is, from its own
  code: every piece of art, flourish and sound, every place the fuzzball
  shows, and the autopilot's figures for every wave.
