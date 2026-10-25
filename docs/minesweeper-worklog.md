# Minesweeper work log

The running record of [Minesweeper's plan](minesweeper-ui-plan.md): what is
done, what was found, and where to pick up. The newest entry is last. Delete
this file in the commit that finishes the plan; it stays in that commit's
parent.

## Where things stand

- **Branch:** `minesweeper-angular`, from `main` at `d1b77db`. Not pushed: a
  push to `main` deploys, so shipping waits for the user's go-ahead.
- **Phase:** M0, the mock and the spike.
- **Next step:** build the mock and send it to the user; run the spike.

| Phase                 | State       |
| --------------------- | ----------- |
| M0. Mock and spike    | in progress |
| M1. Scaffold          | to do       |
| M2. The rules         | to do       |
| M3. The new icons     | to do       |
| M4. The board         | to do       |
| M5. Bar and dialogs   | to do       |
| M6. Storage           | to do       |
| M7. The checks        | to do       |
| M8. Screenshots, docs | to do       |
| M9. Ship              | to do       |

## How to check the work

From `frontend/`: `yarn verify` runs every check. On this machine, Docker is
usually off and port 4200 is taken (see the dev-environment notes in Claude's
memory); start Vite with `--port <n> --strictPort`, and run one headless
Chrome at a time.

## Log

### 2026-10-25: the plan agreed

- The user answered "Yes proceed" to the plan and to committing it, which
  takes every decision as recommended. Decision 4 (the numbers' inks) is
  still shown both ways in the mock, and nothing in Minesweeper changes until
  the user approves the mock.
