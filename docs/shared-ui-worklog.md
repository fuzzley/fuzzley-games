# Shared UI work log

The running record of [the shared UI plan](shared-ui-plan.md): what is done,
what was found, and where to pick up. The newest entry is last. Delete this
file in the commit that finishes the plan; it stays in that commit's parent.

## Where things stand

- **Branch:** `shared-ui`, from `main` at `70f3d97`. Not pushed: a push to
  `main` deploys, so each shipping point waits for the user's go-ahead.
- **Phase:** 0, the spike.
- **Next step:** scaffold `lib/style` and `lib/ui` and prove the plumbing.

| Phase                             | State       |
| --------------------------------- | ----------- |
| 0. Spike                          | in progress |
| 1. Scaffold the libraries         | to do       |
| 2. Tokens and theme; site moves   | to do       |
| 3. Components; site moves         | to do       |
| 4. Plumbing in Solitaire          | to do       |
| 5. Solitaire follows the theme    | to do       |
| 6. Solitaire's pieces move to lib | to do       |
| 7. The game bar                   | to do       |
| 8. Retire Solitaire's token names | to do       |
| 9. Light chrome                   | to do       |
| 10. Skills, and the next consumer | to do       |

## How to check the work

From `frontend/`: `yarn verify` runs every check. On this machine, Docker is
usually off and port 4200 is taken (see the dev-environment notes in Claude's
memory); start Vite with `--port <n> --strictPort`.

## Log

### 2026-10-24: the plan agreed

- The user confirmed every decision in the plan, and added: a library may be
  split further where something fits neither `lib/style` nor `lib/ui`
  cleanly, and everything is built to be reused and extended by future games,
  for accessibility, reuse, extensibility, maintainability and testability.
- `.agents/AGENTS.md` now lets the site and the games import `lib/`, one way.
- The libraries are named `@fz/style` and `@fz/ui`, not the bare folder names.
  A scope marks an import as a library's at a glance, and keeps clear of the
  public `style` and `ui` packages on npm. `yarn.config.cjs` needs to allow it
  (Phase 1).
