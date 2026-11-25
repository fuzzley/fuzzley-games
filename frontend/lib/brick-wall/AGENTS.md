# @fz/brick-wall

These rules hold for `@fz/brick-wall`, what the wall games share, laid out
in a game's own layers. The frontend's, in
[frontend/AGENTS.md](../../AGENTS.md), and the repository's apply too.

- **Before writing or changing a spec here, read the `brick-wall-testing`
  skill.** It says which of the wall games' cases go in the specs here,
  over the made-up games, and what the games' own specs share through the
  testing entries.
- **Nothing here names a game.** Doc comments speak of "a wall game", and
  specs use kinds made up for them, never a game's own. What differs
  between the games is data, a function or a type parameter
  (`K extends string` for a kind's id), never a mode flag.
- **Every rule is a pure function, its retunable numbers handed in,** never
  read from a game's tuning.
- **Work goes in the lowest layer that can hold it,** as in a game: what a
  move does in `src/rules/`, what to draw in `src/view/`, and the scene only
  draws it. `phaserGameLayers()` fences the layers as it does a game's, so
  no folder inside a layer is named `view`, `scene`, `app` or `testing`,
  which its fences match anywhere in a path.
- **An entry is a file at the top of its layer's folder,**
  `src/<layer>/<entry>.ts`, which a game imports as
  `@fz/brick-wall/<layer>/<entry>`. What only the entries use goes in a
  folder beside them, which a game's fences refuse it.
- **A testing entry that a game's file held as the rules are takes, such as
  the solver its scripts load, goes on `HELD_AS_RULES` in
  `eslint.config.js`.** A game's lint reads only its import of it, so
  nothing else holds it to the rules' fence and their exact arithmetic.
