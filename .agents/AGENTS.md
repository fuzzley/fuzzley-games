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
  like the site; see `frontend/games/solitaire/AGENTS.md`. Minesweeper is an
  Angular app, with Vite and Vitest, on the shared libraries alone; see
  `frontend/games/minesweeper/AGENTS.md`.
- **Package Manager:** Yarn 4 via Corepack, pinned in `frontend/package.json`
- **Serving:** nginx in a Docker image, on Google Cloud Run

---

## Repository Layout

- **`frontend/`** — the Yarn workspace root for all client code, and nothing
  else: the site (`frontend/site/`), the games built here
  (`frontend/games/`) and the libraries they share (`frontend/lib/`), one
  workspace each. Its layout, its Yarn commands and the rules every
  workspace keeps are in `frontend/AGENTS.md`, what every game keeps in
  `frontend/games/AGENTS.md`, and each workspace's own in its folder's.
- **`Dockerfile`, `nginx.conf.template`, `nginx/`, `docker-entrypoint.d/`** —
  the image that serves the build, its nginx config, the security header
  snippets it includes, and the startup script that writes `env.js` from the
  container's environment. `docs/operations.md` explains each.
- **`docs/operations.md`** — how the site is built, served, deployed and
  configured, and how the games are pinned and updated. `README.md` is only a
  short summary for GitHub.
- **`docs/archive/`** — plans that were built and shipped, kept for their
  decisions. They describe the code as it was, so check a path against the
  tree before following one.

---

## Build & Deploy System

### Building and Checking

Run every `yarn` command from `frontend/`, with Yarn 4, never NPM.
`yarn start` serves the site and the games at `http://localhost:4200/`, and
`yarn verify` runs what CI runs: lint, type-check, test, then build.
`frontend/AGENTS.md` lists every command and what it checks.

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
and Google Analytics, styles and fonts from the site (inline styles too, which
Angular needs), images and requests to Google Analytics' endpoints, and
nothing else.

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

## Agent Configuration (`.agents/`)

`.agents/` is the committed, tool-neutral home for what agents read about the
whole repository. What concerns one workspace sits with it instead: its
`AGENTS.md`, and its skills in its own `.agents/skills/`. The per-tool
directories (`.claude/`, `.gemini/`) are gitignored and machine-local.

- **Instructions:** this file. The root `AGENTS.md` and `CLAUDE.md` are thin
  pointers to it, because those are the filenames agents actually look for —
  `AGENTS.md` for Codex, Cursor, Copilot, and Amp; `CLAUDE.md` for Claude Code,
  which does not read `AGENTS.md`. Edit this file, not the pointers.
- **The frontend's instructions** sit in layers below this file, each an
  `AGENTS.md` with a `CLAUDE.md` beside it that imports it (`@AGENTS.md`),
  which agents read once they work on a file beneath it:
  `frontend/AGENTS.md`, for every workspace; `frontend/games/AGENTS.md`, for
  every game; and each workspace's in its folder:
  `frontend/site/AGENTS.md`, `frontend/lib/style/AGENTS.md`,
  `frontend/lib/ui/AGENTS.md`, `frontend/lib/game-ui/AGENTS.md`,
  `frontend/lib/dev/AGENTS.md`, `frontend/games/solitaire/AGENTS.md` and
  `frontend/games/minesweeper/AGENTS.md`. So the site's rules never reach a
  game, nor a game's the site. A rule is written once, in the highest layer
  it holds for: one for the whole repository, such as how code, comments
  and tests are written, belongs here.
- **Skills:** a skill every workspace can use lives in
  `.agents/skills/<name>/SKILL.md`; a skill about one workspace lives in that
  workspace's `.agents/skills/<name>/SKILL.md` (`frontend/site/.agents/skills/`,
  `frontend/games/solitaire/.agents/skills/`,
  `frontend/games/minesweeper/.agents/skills/`), and cites paths from its
  folder. Gemini CLI reads the repository's directly. Claude Code only
  discovers `.claude/skills/<name>/SKILL.md`, so
  **`node .agents/link-claude-skills.mjs`** links each skill into the
  `.claude/skills/` beside its `.agents/skills/` (a junction on Windows). It
  loads the repository's at startup and a workspace's once it reads or edits a
  file in that workspace, and keeps every one it loaded, so a workspace's
  skills start with its name (`site-testing`, `solitaire-styles`) and their
  triggers name it. The links hold absolute paths inside gitignored
  `.claude/`, so re-run the script after a fresh clone or a move — a
  dangling link silently drops the skill. Outside CI, the reference check
  below warns about a skill with no link, or a link that leads nowhere.
  Restart Claude Code if `.claude/skills` did not exist when the session
  started.
- **Flat skills directories.** Every skill lives directly under an
  `.agents/skills/` folder, as `<name>/SKILL.md`, including the Solitaire
  Collection's namespaced `phaser-*` ones. Adding a skill means a new
  top-level directory there plus a re-run of the link script.
- **A skill describes code that exists,** and so does an `AGENTS.md`. Both
  are read as authoritative, so an agent follows an invented path into a
  compile error rather than looking. A design for something not yet built
  belongs in a doc or an issue, not in a skill.
  `node .agents/check-skill-references.mjs` (part of `yarn lint`) enforces
  the checkable half of this, for every folder of skills and every `AGENTS.md`:
  every relative markdown link must resolve, and every backticked path must
  exist, unless git ignores it, as it does what a build writes. Run it after
  changing a skill or an `AGENTS.md`. Skills quoting another
  project's source tree, the vendored Angular ones and the Phaser ones
  copied from Phaser's package, are listed as upstream exceptions there; a
  skill about this repository is checked by default.
- **Vendored skills:** `angular-developer` and `angular-new-app` come from
  upstream and are hash-locked in `skills-lock.json`, so `.prettierignore`
  leaves them unformatted. Do not hand-edit them. The Solitaire
  Collection's Phaser skills, all but `phaser-core` and
  `phaser-canvas-performance`, are copies of the `skills/` folder in
  Phaser's package, for the parts of Phaser the game uses, which
  `.prettierignore` leaves as copied too; `phaser-core` says how to add one.

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
- **A script writes down every type.** The `.mjs` scripts, under `.agents/` and each workspace's `tools/`, are plain JavaScript, so a JSDoc tag is the only place a type can go. Every parameter has an `@param {Type} name`, and every function that returns a value has an `@returns {Type}`, described only when the description adds something. A shape used more than once is a `@typedef`, which another script takes with `@import` rather than spelling it out again. `yarn lint` requires the tags (`eslint-plugin-jsdoc`, in `@fz/dev`'s `scripts()` block), and `yarn typecheck` checks the types under `strict`.
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

These rules hold for every workspace's specs. The `angular-testing` skill
holds the patterns every Angular workspace's specs share: Testing Library by
role, user-event, jest-dom and zoneless change detection. An app also has a
skill of its own for its runner setup, fixtures and floors
(`site-testing`, `minesweeper-testing`, `solitaire-testing`), and its
`AGENTS.md` says where its specs go.

- **Test Coverage:** Cover new and changed code with specs.
- **Arrange, Act, Assert:** Structure each test case cleanly: arrange block, act block, assert block. Avoid multiple AAA cycles per test case; create focused test cases instead.
- **Simple Test Logic:** Avoid complex conditional logic in unit tests. Keep tests readable and explicit.
- **Test Helpers:** Abstract verbose setup into helper functions, ensuring test intent remains clear.
- **Test via Public API:** Avoid accessing private fields or methods (and avoid using `as any` or bracket property accessors to bypass visibility).
- **Verifying State > Verifying Interaction:** Prefer asserting resulting state over checking call counts/interactions, reserving interaction mocks only for when state cannot be inspected directly.
- **Real Objects > Mocks:** Use real object instances instead of mocks whenever feasible.
- **Avoid Any Casts:** Avoid `as any`. Use proper typing or `instance as unknown as TargetType` as a last resort.
