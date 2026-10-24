# Fuzzley Games

The Fuzzley Games portal and gallery (https://fuzzley.games): an Angular
single-page app built with Vite, served by nginx from a Docker image on Google
Cloud Run. The games are built here too, under `frontend/games/`, and
served as static pages under `/play/<slug>/`: the Solitaire Collection and
Minesweeper.

## Technology Stack

- **Site:** Angular, Vite and Vitest, in TypeScript and SCSS; see
  `frontend/site/AGENTS.md`.
- **Games built here:** each keeps its own stack. The Solitaire Collection's
  is Phaser 4 for the table and Angular for its shell, with Vite and Vitest
  like the site; see `frontend/games/solitaire/AGENTS.md`. Minesweeper's is
  jQuery, Knockout and Bootstrap 3, bundled by Vite.
- **Package Manager:** Yarn 4 via Corepack, pinned in `frontend/package.json`
- **Serving:** nginx in a Docker image, on Google Cloud Run

---

## Repository Layout

- **`frontend/`** — the Yarn workspace root for all client code, and nothing
  else. Run every `yarn` command from here; `yarn workspace <name> <script>`
  runs a script of one workspace. A backend, when there is one, goes in a
  folder of its own beside it.
  - The root's `package.json` declares the workspaces and pins Yarn and
    Node. Its scripts run the workspaces' own (`yarn build`, `yarn verify`),
    picking them by path (`--include "games/*"`), and its dependencies are
    only the tools that run from here: Prettier, and ESLint and TypeScript
    for the `.agents/` scripts, with the `eslint.config.js` and
    `tsconfig.scripts.json` beside it. `yarn.lock` and `.yarnrc.yml` exist
    only here.
  - `yarn.config.cjs` holds the constraints `yarn lint` checks every
    `package.json` against: a package has the same range in every workspace
    that depends on it (when two differ, give both the higher one), only the
    root sets `packageManager`, `workspaces` and `engines`, each
    workspace is private and named after its folder, and a library depends
    on no workspace but another library.
  - Each workspace is self-contained: its `package.json` lists everything
    it imports or runs, and its configs sit in its folder and cover only it.
    The site and the games never import each other's code; the site takes a
    game's built `dist/`, through `games.json`, and nothing else.
  - `lib/` holds the libraries the site and the games share, one workspace
    each, named after its folder under the `@fz` scope (`lib/style` is
    `@fz/style`). Imports go one way only: the site and the games may import
    a library, through a `workspace:` dependency in their `package.json`,
    and a library may import another library, but never the site or a game.
    An app compiles a library from its source; nothing in `lib/` is built
    on its own. Each keeps its own rules in an `AGENTS.md` in its folder:
    `frontend/lib/style/AGENTS.md`.
  - `games/` holds the games built here, one workspace each, named after its
    folder. A game knows nothing of the site, even when both use the same
    library: it builds into its own `dist/`, with `index.html` at its top level and its screenshots in
    `docs/screenshots/<slug>/`. Each keeps its own rules in an `AGENTS.md`
    in its folder: `frontend/games/solitaire/AGENTS.md` and
    `frontend/games/minesweeper/AGENTS.md`.
- **`frontend/site/`** — the site, the Angular app (workspace `site`), and
  the build the image serves, with the games under `/play/`. Its layout,
  checks and rules are in `frontend/site/AGENTS.md`.
- **`Dockerfile`, `nginx.conf.template`, `nginx/`, `docker-entrypoint.d/`** —
  the image that serves the build, its nginx config, the security header
  snippets it includes, and the startup script that writes `env.js` from the
  container's environment. `docs/operations.md` explains each.
- **`docs/operations.md`** — how the site is built, served, deployed and
  configured, and how the games are pinned and updated. `README.md` is only a
  short summary for GitHub.

---

## Build & Deploy System

### Package Manager

This project uses **Yarn 4**. Always use Yarn commands instead of NPM (`yarn <command>`).

`frontend/.yarnrc.yml` sets `npmMinimalAgeGate` to a day: Yarn won't install a
version published less than a day ago (it says the versions are
"quarantined"). Take the newest version past the gate rather than lifting
it. Dependabot waits the same day before proposing an update.

Node is version 26, as `.node-version` says; `frontend/package.json`'s
`engines` says so too.

### Development Commands

Run from `frontend/`. Each of these builds or checks every workspace; a
workspace's own scripts, such as `yarn workspace site lint:styles`, run one
step, and its `AGENTS.md` says what they do.

- **Run Development Server:** `yarn start` or `yarn dev` (builds the workspaces under `games/`, then the site puts the games in `site/public/play/` and launches the Vite dev server at `http://localhost:4200/`).
- **Production Build:** `yarn build` (builds the workspaces under `games/` with `yarn build:games`, then the site's `build` puts every game `games.json` lists into `site/public/play/`, bundles into `site/dist/`, writes `version.json` with the commit it was built from and the games' builds, then adds the analytics tags to each game). It fails if the catalog links a game the games' builds don't have.
- **Fetch the Games:** `yarn games` (builds the workspaces and puts every game into `site/public/play/`; `yarn start` and `yarn build` do it first).
- **Preview Build:** `yarn preview` (serves the site's production build locally).
- **Run Unit Tests:** `yarn test` (runs each workspace's `test`: the site's runs Vitest once).
- **Type Checking:** `yarn typecheck` (runs `tsc` over the `.agents` scripts and the constraints from their JSDoc (`frontend/tsconfig.scripts.json`), then each workspace's `typecheck`). Vitest strips types without checking them, so this is the only check a spec's types get.
- **Linting:** `yarn lint` (checks the skills' references, checks every `package.json` against the constraints in `frontend/yarn.config.cjs` (`yarn constraints`), runs ESLint over `.agents` and those constraints with `frontend/eslint.config.js`, runs each workspace's `lint` with its own config, then checks formatting with `yarn prettier:check`).
- **Full Verification Pipeline:** `yarn verify` (runs `yarn lint && yarn typecheck && yarn test && yarn build`).
- **Format Codebase:** `yarn prettier` (formats the whole repository with
  Prettier); `yarn prettier:check` only reports what it would change.

To test the image itself, build and run it with Docker as `docs/operations.md`
shows.

### Deployment

Cloud Run builds and deploys the `Dockerfile` from the `live` branch, never
from `main`. When `.github/workflows/verify.yml` passes on a push to `main`,
its `promote` job moves `live` to that commit, so a red run means the commit
never went live. Don't push to `live` yourself except to roll back. Every 15
minutes, `.github/workflows/update-games.yml` moves the games' pins to their
newest builds, pushes to `main` once the image builds and passes its checks,
and runs Verify on `main` to deploy it. `docs/operations.md` covers the
deployment, the games and runtime configuration; the `github-actions-ci-cd`
skill covers the workflows.

### Content Security Policy

nginx sends security headers on every response, and the site's own pages (not
the games under `/play/`) carry a Content Security Policy, from
`nginx/content-security-policy.conf`. It allows scripts from the site itself
and Google Analytics, styles from the site (inline too, which Angular needs)
and Google Fonts, fonts from Google Fonts, images and requests to Google
Analytics' endpoints, and nothing else.

- **A new origin goes into the policy in the same change.** Anything the site
  starts loading from another origin (a script, stylesheet, font, image, API
  call, iframe or embed) is added to `nginx/content-security-policy.conf`
  with it. Otherwise browsers block it in production, and only there:
  `yarn start` and `yarn preview` send no policy, so it works locally.
- **No inline scripts.** The policy doesn't allow them, which is why
  `theme.js`, `env.js` and `analytics.js` are files. Don't add a `<script>`
  with a body to `index.html`, or an `on…=` attribute anywhere.
- **Check it in the image.** Build and serve the image (`docs/operations.md`),
  open the page, and look for "Refused to load" in the console.
  `.github/scripts/check-image.sh` checks the policy is there, not that what
  the page loads fits it.

---

## Running & Debugging

- **Local Testing:** Start the server with `yarn start` and navigate to `http://localhost:4200/`.
- **Chrome DevTools MCP:** Use the `chrome-devtools-mcp` server to inspect and
  verify the local running site when making UI or behavioral changes.
- **Browser Tools:** Close any browser instance you start for debugging when
  you are done with it, so none are left running.

---

## Agent Configuration (`.agents/`)

`.agents/` is the committed, tool-neutral home for what agents read about the
whole repository. What concerns one workspace sits with it instead: its
`AGENTS.md`, and its skills in its own `.agents/skills/`. The per-tool
directories (`.claude/`, `.gemini/`) are gitignored and machine-local.

- **Instructions:** this file. The root `AGENTS.md` and `CLAUDE.md` are thin
  pointers to it, because those are the filenames agents actually look for —
  `AGENTS.md` for Codex, Cursor, Copilot, and Amp; `CLAUDE.md` for Claude Code,
  which does not read `AGENTS.md`. Edit this file, not the pointers.
- **A workspace's instructions** sit in its folder:
  `frontend/site/AGENTS.md`, `frontend/lib/style/AGENTS.md`,
  `frontend/games/solitaire/AGENTS.md` and
  `frontend/games/minesweeper/AGENTS.md`, each with a `CLAUDE.md` beside it
  that imports it (`@AGENTS.md`). Agents read them when they work in that
  folder, so the site's rules never reach a game. A rule for the whole
  repository, such as how code, comments and tests are written, belongs here
  instead, once.
- **Skills:** a skill every workspace can use lives in
  `.agents/skills/<name>/SKILL.md`; a skill about one workspace lives in that
  workspace's `.agents/skills/<name>/SKILL.md` (`frontend/site/.agents/skills/`,
  `frontend/games/solitaire/.agents/skills/`), and cites paths from its
  folder. Gemini CLI reads the repository's directly. Claude Code only
  discovers `.claude/skills/<name>/SKILL.md`, so
  **`node .agents/link-claude-skills.mjs`** links each skill into the
  `.claude/skills/` beside its `.agents/skills/` (a junction on Windows). It
  loads the repository's at startup and a workspace's once it reads or edits a
  file in that workspace; two skills of one name, such as the site's and the
  Solitaire Collection's `vitest-testing`, both load, and the one whose folder
  holds the files at hand applies. The links hold absolute paths inside
  gitignored `.claude/`, so re-run the script after a fresh clone or a move —
  a dangling link silently drops the skill. Restart Claude Code if
  `.claude/skills` did not exist when the session started.
- **Flat skills directories.** Every skill lives directly under an
  `.agents/skills/` folder, as `<name>/SKILL.md`, including the Solitaire
  Collection's namespaced `phaser-*` ones. Adding a skill means a new
  top-level directory there plus a re-run of the link script.
- **A skill describes code that exists.** Skills are read as authoritative, so
  an agent follows an invented path into a compile error rather than looking.
  A design for something not yet built belongs in a doc or an issue, not in a
  skill. `node .agents/check-skill-references.mjs` (part of `yarn lint`)
  enforces the checkable half of this, for every folder of skills: every
  relative markdown link between skills must resolve, and every backticked
  path must exist. Run it after changing a skill. Skills quoting another
  project's source tree, the vendored Angular ones and the Phaser ones
  generated from Phaser's documentation, are listed as upstream exceptions
  there; a skill about this repository is checked by default.
- **Vendored skills:** `angular-developer` and `angular-new-app` come from
  upstream and are hash-locked in `skills-lock.json`, so `.prettierignore`
  leaves them unformatted. Do not hand-edit them.

---

## Coding Best Practices

- **Dependency Injection:** Avoid hardcoded dependencies. Prefer taking dependencies in the constructor or function parameters.
- **TypeScript Style:** Follow Google's TypeScript style guide (https://google.github.io/styleguide/tsguide.html).
- **No `as any`.** Use generics, or `unknown` plus a type guard. `instance as unknown as Target` is a last resort worth a comment explaining why.
- **Explicit return types** on exported functions and public methods.
- **`readonly` collections** for data that is not meant to change, such as the game catalog.

---

## Writing Documentation

These rules cover every doc comment: classes, interfaces, functions, HTML, CSS, workflows and scripts.

- **Open with one sentence.** The first paragraph is a single sentence that briefly says what the thing does or what it is for.
- **Classes and interfaces:** Write the sentence as if "This class", "This interface", or "An instance of this class" came before it, e.g. `Remembers the palette the player chose.`, not `This class remembers…` or `A class that remembers…`.
- **Functions and methods:** Write in the third person, always starting with a verb phrase, as if "This function" came before it, e.g. `Returns the game a slug names.` or `Applies a palette to the page.`
- **Further paragraphs are rare.** Add additional paragraphs only when it stops a caller from misusing the code, or when it answers a "why" that a reader is very likely to ask and cannot answer from the name or the code itself. Don't use one to restate the implementation, list alternatives you rejected, or tell the history of the code.
- **`@param` and `@returns` only when they add something.** In TypeScript, leave them out when they only repeat the name and type or when they are already described sufficiently in the description.
- **A script writes down every type.** The `.mjs` scripts, under `.agents/` and each workspace's `tools/`, are plain JavaScript, so a JSDoc tag is the only place a type can go. Every parameter has an `@param {Type} name`, and every function that returns a value has an `@returns {Type}`, described only when the description adds something. A shape used more than once is a `@typedef`, which another script takes with `@import` rather than spelling it out again. `yarn lint` requires the tags (`eslint-plugin-jsdoc`), and `yarn typecheck` checks the types under `strict`.
- **Inline comments follow the same rules:** Only write implementation comments for what the code cannot say for itself (e.g. disambiguate a "why" that a user is very likely to ask after reading the code).

```ts
// Too much
/**
 * Subscribes a listener to a specific event.
 *
 * Subscriptions are managed using a registry that maps event names to arrays of
 * listener functions. This allows for efficient registration and unregistration
 * of listeners without the need for manual cleanup.
 *
 * @param event The name of the event to listen for.
 * @param listener The callback function to invoke when the event is emitted.
 * @returns Unsubscribes the listener. Handing back a disposer means a caller
 *   that subscribes an inline closure can still let go of it, without having
 *   to keep a reference around to pass to {@link off}.
 */

// Enough
/** Subscribes a listener to an event and returns a function that unsubscribes it. */
```

---

## Writing Unit Tests

These rules hold for every workspace's specs. A workspace with specs has a
`vitest-testing` skill of its own for its runner setup and patterns, and its
`AGENTS.md` says where its specs go.

- **Test Coverage:** Cover new and changed code with specs.
- **Arrange, Act, Assert:** Structure each test case cleanly: arrange block, act block, assert block. Avoid multiple AAA cycles per test case; create focused test cases instead.
- **Simple Test Logic:** Avoid complex conditional logic in unit tests. Keep tests readable and explicit.
- **Test Helpers:** Abstract verbose setup into helper functions, ensuring test intent remains clear.
- **Test via Public API:** Avoid accessing private fields or methods (and avoid using `as any` or bracket property accessors to bypass visibility).
- **Verifying State > Verifying Interaction:** Prefer asserting resulting state over checking call counts/interactions, reserving interaction mocks only for when state cannot be inspected directly.
- **Real Objects > Mocks:** Use real object instances instead of mocks whenever feasible.
- **Avoid Any Casts:** Avoid `as any`. Use proper typing or `instance as unknown as TargetType` as a last resort.
