# Fuzzley Games

The Fuzzley Games portal and gallery (https://fuzzley.games): an Angular
single-page app built with Vite, served by nginx from a Docker image on Google
Cloud Run. The games are served as static pages under `/play/<slug>/`:
Minesweeper is built here, under `frontend/apps/`, and the Solitaire Collection
in its own repository.

## Technology Stack

- **UI:** [Angular](https://angular.dev/) (standalone components, Signals,
  zoneless change detection)
- **Build Toolchain:** [Vite](https://vitejs.dev/) + [AnalogJS Vite Angular Plugin](https://analogjs.org/)
- **Test Framework:** [Vitest](https://vitest.dev/) with jsdom
- **Language:** TypeScript (ES2022 output target) / HTML / SCSS (Dart Sass)
- **Package Manager:** Yarn 4 via Corepack, pinned in `frontend/package.json`
- **Serving:** nginx in a Docker image, on Google Cloud Run

---

## Repository Layout

- **`frontend/`** — the Angular app, and the Yarn workspace root for all
  client code. Run every `yarn` command from here;
  `yarn workspace <name> <script>` runs a script of one workspace. A backend,
  when there is one, goes in a folder of its own beside it.
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
  - `src/app/styles/` holds the one global stylesheet, `global.scss`, and
    the Sass partials it and the components `@use`: `_palettes.scss` (the
    color palettes as Sass maps, emitted as custom properties under
    `[data-theme]`), `_breakpoints.scss` (`below(sm | md | lg | xl)`),
    `_a11y.scss` (the `visually-hidden` mixin), `_shadows.scss`, `_base.scss`
    (the reset and element defaults) and `_shared.scss` (the few classes
    components share).
  - Every spec sits beside the file it tests, named after it.
  - `public/` is copied into the build as is, including the runtime config
    placeholder `env.js` and `thumbnails/<slug>.svg`, the drawing of each
    game still to come. A hosted game's thumbnail is its build's own
    screenshot. The build fails if either is missing. The games are put
    into `public/play/`, which git ignores.
  - `apps/` holds the games built here, one Yarn workspace each (see
    [Minesweeper](#minesweeper)). Each builds into its own `dist/`.
  - `games.json` lists each game's build: a workspace under `apps/`, or one
    build pinned from its repository's `site-build` release. `tools/` holds
    the scripts that put the games in `public/play/` before every build
    (`fetch-games.mjs`), move the pins (`update-games.mjs`), and add
    the analytics tags to each game's page, with what they share in
    `script.mjs`, and the site's Vite plugins in `vite-plugins.ts`. One of
    them makes `/theme.js`, the first script `index.html` loads, which picks
    the palette before the page paints, from `src/app/provider/themes.ts`,
    so the page's list of palettes can't drift from the app's.
    `docs/operations.md` covers the details.
  - A script exports its logic as functions and runs only when it is the
    file Node was started with (`if (import.meta.main)`), so
    `tools/*.spec.ts` can import and test it. A dependency a test needs to
    replace, such as `fetch`, is a parameter with the real one as default.
- **`Dockerfile`, `nginx.conf.template`, `nginx/`, `docker-entrypoint.d/`** —
  the image that serves the build, its nginx config, the security header
  snippets it includes, and the startup script that writes `env.js` from the
  container's environment. `docs/operations.md` explains each.
- **`docs/operations.md`** — how the site is built, served, deployed and
  configured, and how the games are pinned and updated. `README.md` is only a
  short summary for GitHub.

### Angular & Styling

- **Templates bind, they do not compute.** Expose a `computed()` view model
  instead of calling a method from a template, which re-runs on every change
  detection pass, or working out a label, a comparison or a plural there.
  Wording that depends on data ("1 game", "2–4 players") comes from the
  `describe*` functions in `src/app/model/game.ts`. An ICU plural would
  need `@angular/localize` at runtime (`$localize`), which the site doesn't
  load.
- **Colors come from the palette.** Anything that should follow the theme
  reads a palette variable with `var()`; stylelint rejects a color written
  anywhere else. A new role is added to every palette in
  `src/app/styles/_palettes.scss` at once: the build fails if a palette lacks
  a role the default has, or has one it lacks, and
  `src/app/styles/palettes.spec.ts` fails if the palettes and `THEMES`
  disagree.
- **`@keyframes` are global.** Angular's emulated encapsulation rewrites
  selectors, not at-rule names, so two components defining the same animation
  name silently overwrite each other. Declare them once, in a partial that
  `src/app/styles/global.scss` uses.

### Sass

Every stylesheet is SCSS, compiled by Dart Sass (`sass`).

- **Modules, never `@import`.** A stylesheet loads a partial with `@use`
  and reaches its members through the namespace:
  `@use "../../styles/breakpoints" as bp;` then `@include bp.below(sm)`.
  `@import` is deprecated in Dart Sass. A partial's private members start
  with `-`.
- **Runtime values are custom properties; build-time values are Sass.**
  Palette colors and `--gutter` change while the page runs, so they are CSS
  custom properties read with `var()`. Sass variables and mixins hold what
  is fixed at build time: breakpoints, shadows, the visually-hidden rules.
- **Breakpoints by name.** `@include bp.below(sm) { … }`, never a bare
  `max-width`; the widths live in `_breakpoints.scss`.
- **Nest for states and parts** (`&:hover`, `&::before`, `> span`), no more
  than three levels deep. Rules whose order decides the cascade, such as
  media queries that override one another, stay flat and together, in
  order.
- **`//` comments.** Sass drops them from the output; a `/* */` comment
  ships, and inside a nested rule it even leaves an empty rule behind.
- **Icons are `<app-icon name="…">`.** A new icon is a new `IconName` and
  a case in `IconComponent`'s template, never an `<svg>` pasted into
  another template. The parent sizes it (`width`/`height` on `app-icon`)
  and colors it (`color`); `--icon-stroke` sets an outline's weight. Icons
  are hidden from assistive technology, so the text beside one, or the
  control's label, says what it means.
- **Visible state is announced state.** A control that looks selected carries
  `aria-checked`/`aria-current`/`aria-pressed`. See the
  `web-game-accessibility` skill.

### Minesweeper

`frontend/apps/minesweeper/` is Minesweeper, written in 2016 and moved here
from fuzzley/fMinesweeper with its history. The rules above are the site's;
this workspace keeps its own.

- **Classic scripts and a namespace.** jQuery 1.10, Knockout 3.4 and
  Bootstrap 3 load as classic scripts from `public/vendor/`, which the build
  copies and minifies. Vite bundles `src/main.js`, and the game's modules hang
  off the `fMinesweeper` object it exports.
- **Left as written.** Prettier skips its `index.html`, `src/` and `public/`
  (see `.prettierignore`), and its own ESLint config, `eslint.config.cjs`,
  skips `src/fMinesweeper/` and `public/`.
- **Saved games outlive the code.** Players' settings and statistics are in
  `localStorage` under `fMinesweeper.Settings` and `fMinesweeper.Statistics`.
  Renaming those keys loses them.
- **Its screenshots are the site's.** `public/docs/screenshots/minesweeper/`
  holds the thumbnail and preview the catalog shows.
- **Work on it alone** with `yarn workspace minesweeper dev`, on port 9000.
  The site's dev server serves the build `yarn start` made when it started.

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

Run from `frontend/`:

- **Run Development Server:** `yarn start` or `yarn dev` (builds the workspaces under `apps/`, puts the games in `public/play/`, and launches the Vite dev server at `http://localhost:4200/`).
- **Production Build:** `yarn build` (builds the workspaces under `apps/` with `yarn build:apps`, puts every game `games.json` lists into `public/play/`, bundles into `frontend/dist/`, writes `version.json` with the commit it was built from and the games' builds, then adds the analytics tags to each game). It fails if the catalog links a game the games' builds don't have.
- **Fetch the Games:** `yarn games` (builds the workspaces and puts every game into `public/play/`; `yarn start` and `yarn build` do it first).
- **Preview Build:** `yarn preview` (serves the production build locally).
- **Run Unit Tests:** `yarn test` (runs Vitest once).
- **Type Checking:** `yarn typecheck` (runs the Angular compiler's checks over the app, emitting nothing, then `tsc` over the specs (`tsconfig.spec.json`), over `vite.config.ts` (`tsconfig.node.json`), and over the `tools` and `.agents` scripts from their JSDoc (`tsconfig.scripts.json`)). Vitest strips types without checking them, so this is the only check a spec's types get.
- **Linting:** `yarn lint` (checks the skills' references, runs ESLint over `src`, `tools`, `vite.config.ts` and `.agents`, lints each workspace under `apps/` with its own config (`yarn lint:apps`), runs stylelint, then checks formatting with `yarn prettier:check`). ESLint's config is `frontend/eslint.config.js`: typescript-eslint's strict and stylistic type-checked rules, explicit return types on exported functions and public methods, `import type` for type-only imports, Angular's recommended and template accessibility rules, and JSDoc types on every script. Each file is type-checked with the tsconfig that includes it, found through the solution in `frontend/tsconfig.json`. `yarn lint:styles` runs stylelint (`frontend/stylelint.config.js`, the standard SCSS rules) over every stylesheet: no hex, named or functional color outside `_palettes.scss` and `_shadows.scss`, no `@import`, nesting at most three deep.
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
