# Work log: the borders between the site, the games and the libraries

The log of [the workspace borders plan](workspace-borders-plan.md), kept so
the work can pause and resume. Newest entries last. It is deleted when the
work is done; git history keeps it.

## How to resume

- The work is on the branch `workspace-borders`, cut from `main` at
  `20788a2`. Nothing is pushed: a push to `main` deploys.
- The user said "Implement" (2026-10-26), taking every recommended decision:
  `game.json` checking ids and names, with the site keeping its own copy; the
  `frontend/AGENTS.md` and `frontend/games/AGENTS.md` layers; 14 Phaser
  skills deleted; the pinned-game pipeline retired after the archives; no
  catalogs yet.
- P8 waits on archiving fSolitaire and fMinesweeper, which is outside this
  repository and needs the user's go-ahead.
- Each phase ends with `yarn verify` green from `frontend/`, and a commit.
- The status table says where things stand; the entries below it say what
  was found on the way.

## Status

| Phase | What                                 | State   |
| ----- | ------------------------------------ | ------- |
| P1    | Close the checks                     | next    |
| P2    | Housekeeping                         | to do   |
| P3    | Vitest and game presets in `@fz/dev` | to do   |
| P4    | The site's images                    | to do   |
| P5    | `game.json`                          | to do   |
| P6    | The instruction layers and skills    | to do   |
| P7    | The Phaser skills                    | to do   |
| P8    | Retire the pinned-game pipeline      | waiting |

## Entries

### 2026-10-26: start

- Branch `workspace-borders` created; the plan and this log committed first.
