# Fuzz Flux

These rules are Fuzz Flux's own. Every game's, in
[frontend/games/AGENTS.md](../AGENTS.md), the frontend's, in
[frontend/AGENTS.md](../../AGENTS.md), and the repository's apply too.

- **The design's sketch is the oracle.** The rules are a port of
  `docs/fuzz-flux/sketch/engine.mjs`, held to it by the golden games, and
  where the two differ, the port is at fault until shown otherwise. A
  failed golden game, certificate or floor is a fault to find in the port,
  as the `fuzz-flux-testing` skill's "When One Fails" says, never one to
  pass by changing the sketch to match. A rule changes only at the owner's
  word, and a rule so changed, or a fault shown in the sketch, is changed
  in the sketch in the same commit as in the port.
- **A move played by hand that fails is the port's bug.** Its record is
  the sketch's play, never written again from what `play()` makes.
- **No level is eased past its floor.** What each level asks of the casual
  player, the `TARGETS` of the sketch's `report.mjs`, and the floors'
  leeway are the design's: neither is lowered or widened to let a level
  pass. A level is redrawn only for a failed check or at the owner's word,
  as the `fuzz-flux-content` skill's "Redrawing a Level" says.
- **Before writing or changing a spec, read the `fuzz-flux-testing`
  skill.** It has the three Vitest projects and what runs in each, the
  boards drawn as pictures and the moves the sketch played, what the
  golden games, the certificates and the floors hold, and the feel's, the
  timeline's, the scene's and the shell's helpers.
- **Before redrawing a level, adding a set, or bringing in an element,
  read the `fuzz-flux-content` skill.** It has the design's scripts each
  runs first, the files each takes in the game, the order they land in and
  the checks that hold each.
