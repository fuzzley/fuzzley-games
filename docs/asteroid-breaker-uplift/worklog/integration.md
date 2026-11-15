# Work log: the integration

The integrator's log for the build `implementation-plan.md` lays out: each
package started and landed, its checks, what collided and how it was
settled, the rebases onto `main`, and the verify runs. The newest entry is
last. Each package keeps its own log beside this one, `<package>.md`.

- **Branch:** `asteroid-breaker-uplift`, in the worktree
  `.claude/worktrees/abu`, cut from `origin/main` at `e6740e04`.
- **Packages:** each on `abu/<package>`, in `.claude/worktrees/abu-<package>`.

## What was asked (2026-11-15)

Implement the Asteroid Breaker uplift's design, reusing library code
between the games where possible, with close attention to readability,
engineering practice and each framework's, language's and library's style;
keep a detailed work log and commit regularly, each commit through the
`commit-review-process` skill; write a detailed implementation design first,
with a strategy for agents to work in parallel, and go on without waiting
for approval; when done, delete the work log, merge into `main` and push.
Another session is speeding up CI; once its changes land on `main`, take
them into the working branches.

## Log

### 2026-11-15, the implementation plan

- **Read:** `plan.md` whole, its mocks, the art's and the sound's kits, and
  the Brick Breaker uplift's implementation plan for how its build ran.
  Four read-only agents mapped the code at `e6740e04`: the sound, the art,
  the rules and the shell. What they found is folded into
  `implementation-plan.md`'s §3 to §6.
- **Measured** at `e6740e04`, warm: the game's tests 42 s on eight workers
  (5,219 specs in 95 files), its lint 23 s, its typecheck 14 s.
- **Found:** ffmpeg isn't on this machine, though the kit was encoded with
  it. Fetching a packaged ffmpeg was refused by the session's permissions,
  and isn't worked around. So the encodes the user heard ship as they are
  (C2), and `build:sounds` encodes only where ffmpeg is installed.
- **Found:** the main checkout is on `local-pipeline`, another session's,
  with its changes staged, four commits ahead of `origin/main`. Nothing is
  done there.
- **Wrote** `implementation-plan.md`: twenty-five settled points, five lifts,
  twenty-one packages in five streams, up to five agents at once.

### 2026-11-15, the plan's review, and a pause

The commit review of the plan found twelve points, each checked against the
code and taken:

1. P1 shows L6's `faceOf()` and R3 adds kinds whose art is L1's: both now
   wait on them.
2. A `halos` layer under the shots lay over the rocks, pickups and comets
   it glows round: it is now just above the place and the field.
3. A `Graphics` has no radial gradient and a texture made from one shows
   none: the backdrop's washes are painted on a canvas through
   `drawCanvasTexture()`, by a painter of commands L3 adds; `svgOf()` writes
   them as SVG gradients.
4. R1 gave `home` and `lost` new meanings unsaid: C17 now says which events
   count as a stray brought home (`joined` and `home`, never `floated`),
   that `lost` is the run's end and `knocked` buzzes too, that a clean wave
   is one with no hit taken (`Field.hits`), that `FIRST_SHIPS` and
   `MAX_SHIPS` are renamed, and that a hit's 1.5 s is `guardShip()`'s.
5. C15 read `pods.json`'s `pilot` wrongly: the fuzzball's whole grid is
   drawn 1.18 field units wide.
6. Up to three L packages run at once over one stream's files: §7.3 now
   gives each package its own files, the shared ones add-only.
7. Three sound handoffs were unsaid: whichever of a rule and its sound
   lands second wires it (§5.1), and the weapon on `fired` is S3's, which L4
   waits on.
8. The mix would have existed twice, the sound lab's beside the player's:
   the rules are pure in `@fz/core/sound_mix`, which both take up; and C8
   now keeps today's sprite as the lab's "before", as `plan.md` asks.
9. The packer must lay the sprite out as the kit's `encode.mjs` did (a
   0.06 s gap, no fade), and the spec holds each take's start and end.
10. Under a normal map a face's color is the shader's: the view works out
    the lit and shaded extremes for the contrast spec.
11. The root's whole `yarn test` would take the machine: a library's
    commit tests only the workspaces using the changed entry; the frame
    budget is measured side by side in one sitting; a package cut before a
    rebase onto `main` lands with `git rebase --onto`.
12. The smaller points: `mono` joins the sound settings, `SAVED_GAME_VERSION`
    rises once for the branch, the tuning record is `Sparking` apart from
    the `charge` state, the tally keeps static's extra apart from the
    sparks' points, and Endless's boulders stay as they are.

- **Paused at the user's ask (2026-11-15):** nothing is built, and nothing
  heavy runs, until the session optimizing CI has finished and verified its
  gains, so the build doesn't weigh on its measurements. The plan's commit
  waits too, since its checks run the root's lint across every workspace.

### 2026-11-15, the plan's second review

The fixes reshaped the plan's dependencies, contracts and ownership, so it
had a second review, which found fourteen points, each checked and taken:

1. The art four look packages port draws at part strength (cracks, glints,
   auras, halos), and only L3 added alpha: a small first package, L0, adds
   it, and L1, L3 and L5 wait on it.
2. L4 and L6 both drew the flame: it is L6's.
3. `EVENT_EFFECTS` holds each event's sound and flourishes on one line: S3's
   first commit splits it, the sounds into `sounds.ts`, the flourishes
   staying in `effects.ts`, which F owns.
4. S1 deleting today's sprite broke the sound lab, which imports it: S1 no
   longer touches the game's sprite; S3 moves it into `tools/sound-lab/` and
   repoints the lab in one commit.
5. S1 loaded two formats, which S2 makes: the game switches to the new
   sprite in S3, after both.
6. A rules package landing while a sound package worked would have its
   events unwired: a sound package wires every event on the tip it lands on.
7. A `wash` member of `DrawCommand` would break the games' exhaustive
   switches over it: it is a `WashCommand`, in `PaintCommand`, which only
   `svgOf()` and the canvas painter take.
8. The sprite writer must learn the gap and the fade as well.
9. `isUntouchable()` doesn't exist: the guard is read by `isGuarded()`, and
   `HIT_GUARD_MS` is a new number.
10. F1's shot flash is L4's art: F1 waits on L4.
11. Five files had no owner: `stray_painter.ts` is L6's, `ring_painter.ts`
    F's, `warning.ts` L4's, and `frame.ts` and `painter.ts` add-only.
12. R1's reshape of `Crew` and its renames are covered as its removals were.
13. §5.2's tones are C9's way's, the extremes under a normal map.
14. Two wordings: the kit's `sounds.json` names no events, only its
    sounds' uses in words; the build is twenty-one packages and Z1.

Also taken: `@fz/phaser` comes to depend on `@fz/core`, and `@fz/dev`
imports it only from `sound_lab_mix.ts`, never from what Node runs.
