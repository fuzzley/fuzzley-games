# Fuzzley Games

The Fuzzley Games portal and gallery (https://fuzzley.games): an Angular
single-page app built with Vite, served by nginx from a Docker image on Google
Cloud Run. The games themselves are built in their own repositories (the Solitaire
Collection and Minesweeper) and served as static pages under
`/play/<slug>/`.

## Technology Stack

- **UI:** [Angular](https://angular.dev/) (standalone components, Signals,
  zoneless change detection)
- **Build Toolchain:** [Vite](https://vitejs.dev/) + [AnalogJS Vite Angular Plugin](https://analogjs.org/)
- **Test Framework:** [Vitest](https://vitest.dev/) with jsdom
- **Language:** TypeScript (ES2022 output target) / HTML / CSS
- **Package Manager:** Yarn 4 via Corepack, pinned in `frontend/package.json`
- **Serving:** nginx in a Docker image, on Google Cloud Run

---

## Repository Layout

- **`frontend/`** — the Angular app, and its own Yarn project. Run every `yarn`
  command from here.
  - `src/app/` is the application, laid out like fSolitaire's shell.
    `main.ts` bootstraps it with the providers in `app.config.ts`, and
    `routes.ts` declares the pages.
  - `src/app/component/` holds one folder per component, named in snake_case
    (`game_tile/game_tile.component.ts`), with its template and stylesheet.
  - `src/app/model/` holds the types the site is built around, such as
    `Game`, with the pure functions over them (a game's play address, its
    screenshot, how its players and length read).
  - `src/app/provider/` holds data and nothing else: the games
    (`games.ts`), the categories and the palettes. A union of ids, such as `CategoryId`, is derived from its
    list (`as const satisfies`), so the two can't disagree.
  - `src/app/service/` holds the injectable services. `GameCatalog` answers
    every question about the games (find, group, search, which are new);
    components ask it rather than importing the data, and specs give it a
    small catalog of their own through `CATALOG_DATA`. `ThemeService`
    applies and remembers the palette.
  - `src/app/testing/` holds what specs share, such as `TEST_CATALOG` and
    `provideTestCatalog()`. The app's tsconfig leaves it out.
  - `src/app/styles/global.css` is the one global stylesheet: the color
    palettes, as custom properties under `[data-theme]`, and the few shared
    classes.
  - Every spec sits beside the file it tests, named after it.
  - `public/` is copied into the build as is, including the runtime config
    placeholder `env.js` and `thumbnails/<slug>.svg`, the drawing of each
    game still to come. A hosted game's thumbnail is its build's own
    screenshot. The build fails if either is missing. The games are fetched
    into `public/play/`, which git ignores.
  - `games.json` pins one build of each game, from its repository's
    `site-build` release. `tools/` holds the scripts that fetch the pinned
    builds before every build, move the pins (`update-games.mjs`), and add
    the analytics tags to each game's page, with what they share in
    `script.mjs`, and the site's Vite plugins in `vite-plugins.ts`.
    `docs/operations.md` covers the details.
  - A script exports its logic as functions and runs only when it is the
    file Node was started with (`if (import.meta.main)`), so
    `tools/*.spec.ts` can import and test it. A dependency a test needs to
    replace, such as `fetch`, is a parameter with the real one as default.
- **`Dockerfile`, `nginx.conf.template`, `docker-entrypoint.d/`** — the image
  that serves the build, its nginx config, and the startup script that writes
  `env.js` from the container's environment. `docs/operations.md` explains
  each.
- **`docs/operations.md`** — how the site is built, served, deployed and
  configured, and how the games are pinned and updated. `README.md` is only a
  short summary for GitHub.

### Angular & Styling

- **Templates bind, they do not compute.** Expose a `computed()` view model
  instead of calling a method from a template, which re-runs on every change
  detection pass.
- **Colors come from the palette.** Anything that should follow the theme
  reads a palette variable with `var()`, and a new variable is added to every
  palette in `src/app/styles/global.css`.
- **`@keyframes` are global.** Angular's emulated encapsulation rewrites
  selectors, not at-rule names, so two components defining the same animation
  name silently overwrite each other. Declare them once in
  `src/app/styles/global.css`.
- **Visible state is announced state.** A control that looks selected carries
  `aria-checked`/`aria-current`/`aria-pressed`. See the
  `web-game-accessibility` skill.

---

## Build & Deploy System

### Package Manager

This project uses **Yarn 4**. Always use Yarn commands instead of NPM (`yarn <command>`).

### Development Commands

Run from `frontend/`:

- **Run Development Server:** `yarn start` or `yarn dev` (launches the Vite dev server at `http://localhost:4200/`).
- **Production Build:** `yarn build` (fetches the games pinned in `games.json`, bundles into `frontend/dist/`, writes `version.json` with the commit it was built from and the games' builds, then adds the analytics tags to each game). It fails if the catalog links a game the fetched builds don't have.
- **Fetch the Games:** `yarn games` (fetches the pinned builds into `public/play/`; `yarn start` and `yarn build` do it first).
- **Preview Build:** `yarn preview` (serves the production build locally).
- **Run Unit Tests:** `yarn test` (runs Vitest once).
- **Type Checking:** `yarn typecheck` (runs the Angular compiler's checks over the app, emitting nothing, then `tsc` over the specs (`tsconfig.spec.json`), over `vite.config.ts` (`tsconfig.node.json`), and over the `tools` and `.agents` scripts from their JSDoc (`tsconfig.scripts.json`)). Vitest strips types without checking them, so this is the only check a spec's types get.
- **Linting:** `yarn lint` (checks the skills' references, runs ESLint over `src`, `tools`, `vite.config.ts` and `.agents`, then checks formatting with `yarn prettier:check`). ESLint's config is `frontend/eslint.config.js`: typescript-eslint's strict and stylistic type-checked rules, explicit return types on exported functions and public methods, `import type` for type-only imports, Angular's recommended and template accessibility rules, and JSDoc types on every script. Each file is type-checked with the tsconfig that includes it, found through the solution in `frontend/tsconfig.json`.
- **Full Verification Pipeline:** `yarn verify` (runs `yarn lint && yarn typecheck && yarn test && yarn build`).
- **Format Codebase:** `yarn prettier` (formats the whole repository with
  Prettier); `yarn prettier:check` only reports what it would change.

To test the image itself, build and run it with Docker as `docs/operations.md`
shows.

### Deployment

Cloud Run builds and deploys the `Dockerfile` from every push to `main` on its
own. `.github/workflows/verify.yml` checks the same commits, but nothing waits
for it, so run `yarn verify` before pushing to `main`. Every 15 minutes,
`.github/workflows/update-games.yml` moves the games' pins to their newest
builds and pushes to `main` once the image builds and passes its checks.
`docs/operations.md` covers the deployment, the games and runtime
configuration; the `github-actions-ci-cd` skill covers the workflows.

---

## Running & Debugging

- **Local Testing:** Start the server with `yarn start` and navigate to `http://localhost:4200/`.
- **Chrome DevTools MCP:** Use the `chrome-devtools-mcp` server to inspect and
  verify the local running site when making UI or behavioral changes.
- **Browser Tools:** Close any browser instance you start for debugging when
  you are done with it, so none are left running.

---

## Agent Configuration (`.agents/`)

`.agents/` is the committed, tool-neutral home for everything agents read. The
per-tool directories (`.claude/`, `.gemini/`) are gitignored and machine-local.

- **Instructions:** this file. The root `AGENTS.md` and `CLAUDE.md` are thin
  pointers to it, because those are the filenames agents actually look for —
  `AGENTS.md` for Codex, Cursor, Copilot, and Amp; `CLAUDE.md` for Claude Code,
  which does not read `AGENTS.md`. Edit this file, not the pointers.
- **Skills:** `.agents/skills/<name>/SKILL.md`. Gemini CLI reads this path
  directly. Claude Code only discovers `.claude/skills/<name>/SKILL.md`, so
  **`node .agents/link-claude-skills.mjs`** links each skill across (a junction
  on Windows). The links hold absolute paths inside gitignored `.claude/`, so
  re-run it after a fresh clone or a move — a dangling link silently drops the
  skill. Restart Claude Code if `.claude/skills` did not exist when the session
  started.
- **Flat skills directory.** Every skill lives directly under
  `.agents/skills/<name>/SKILL.md`. Adding a skill means a new top-level
  directory plus a re-run of the link script.
- **A skill describes code that exists.** Skills are read as authoritative, so
  an agent follows an invented path into a compile error rather than looking.
  A design for something not yet built belongs in a doc or an issue, not in a
  skill. `node .agents/check-skill-references.mjs` enforces the checkable half
  of this: every relative markdown link between skills must resolve, and every
  backticked repo path must exist. Run it after changing a skill. Skills quoting
  another project's source tree are listed as upstream exceptions in
  `.agents/check-skill-references.mjs`; a skill about this repository is checked
  by default.
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
- **A script writes down every type.** The `.mjs` scripts under `.agents/` are plain JavaScript, so a JSDoc tag is the only place a type can go. Every parameter has an `@param {Type} name`, and every function that returns a value has an `@returns {Type}`, described only when the description adds something. A shape used more than once is a `@typedef`.
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

See the `vitest-testing` skill for the runner setup and Angular TestBed patterns.

- **Test Coverage:** Cover new and changed code with specs, beside the file they test.
- **Arrange, Act, Assert:** Structure each test case cleanly: arrange block, act block, assert block. Avoid multiple AAA cycles per test case; create focused test cases instead.
- **Simple Test Logic:** Avoid complex conditional logic in unit tests. Keep tests readable and explicit.
- **Test Helpers:** Abstract verbose setup into helper functions, ensuring test intent remains clear.
- **Test via Public API:** Avoid accessing private fields or methods (and avoid using `as any` or bracket property accessors to bypass visibility).
- **Verifying State > Verifying Interaction:** Prefer asserting resulting state over checking call counts/interactions, reserving interaction mocks only for when state cannot be inspected directly.
- **Real Objects > Mocks:** Use real object instances instead of mocks whenever feasible.
- **Avoid Any Casts:** Avoid `as any`. Use proper typing or `instance as unknown as TargetType` as a last resort.
