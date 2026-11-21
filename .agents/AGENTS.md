# Fuzzley Games

The Fuzzley Games site (https://fuzzley.games) and the games it serves. All
client code is under `frontend/`, a Yarn workspace root: the site, the games
and the libraries they share. `docs/operations.md` says how it is built,
served, deployed and configured.

## Checking and Shipping

- **Run every `yarn` command from `frontend/`,** with Yarn 4, never NPM.
- **Check with `yarn verify:changed` while working.** It lints, type-checks,
  tests and builds only the workspaces a branch's changes reach.
  `yarn verify` does so for every workspace, and `yarn verify:full` is what
  CI runs, with each workspace's coverage held to its floor.
- **A commit follows the `commit-review-process` skill, a merge into `main`
  the `merge-to-main` skill, and a plan built by several agents at once the
  `multi-agent-build` skill.**
- **A push to `main` deploys.** When `.github/workflows/verify.yml` passes,
  its `promote` job moves `live` to that commit, and Cloud Run builds from
  `live`. Never push to `live` yourself, except to roll back. The
  `github-actions-ci-cd` skill covers the workflow.
- **`docs/archive/` holds plans as they were built.** They describe the
  code as it was, so check a path against the tree before following one.

## Content Security Policy

nginx sends the site's own pages, not the games under `/play/`, a Content
Security Policy from `nginx/content-security-policy.conf`.

- **A new origin goes into the policy in the same change.** Anything the
  site starts loading from another origin (a script, stylesheet, font,
  image, API call, iframe or embed) is added there with it. Otherwise
  browsers block it in production, and only there: `yarn start` and
  `yarn preview` send no policy, so it works locally.
- **No inline scripts.** The policy doesn't allow them. Don't add a
  `<script>` with a body to `index.html`, or an `on…=` attribute anywhere.
- **Check it in the image.** Build and serve the image as
  `docs/operations.md` shows, open the page, and look for "Refused to load"
  in the console. `.github/scripts/check-image.sh` checks the policy is
  there, not that what the page loads fits it.

## Agent Configuration

- **An `AGENTS.md` holds instructions, and nothing else:** specific
  strategies that keep the code's quality and health, and the rare major
  caveat. It does not list files, describe features or how the code works,
  tell history, or repeat a doc comment, a skill, a check or another
  `AGENTS.md`. A file left with no rule of its own is removed.
- **A rule is written once, in the highest layer it holds for:** this file
  for the whole repository, `frontend/AGENTS.md` for every workspace,
  `frontend/games/AGENTS.md` for every game, and a workspace's own in its
  folder. An agent reads a layer once it works on a file beneath it.
- **Edit this file, not the root's `AGENTS.md` and `CLAUDE.md`,** which
  only point here. Every other `AGENTS.md` has a `CLAUDE.md` beside it that
  imports it (`@AGENTS.md`), since Claude Code reads no `AGENTS.md`.
- **How to do one kind of task is a skill.** One every workspace can use
  is `.agents/skills/<name>/SKILL.md`. One about a single workspace is in
  that workspace's own `.agents/skills/`, and its name starts with the
  workspace's (`site-testing`). Name a skill in the `AGENTS.md` of the
  layer its task belongs to: agents come to a skill by a name they were
  given far more often than by its description.
- **Run `node .agents/link-claude-skills.mjs` after adding a skill or an
  agent definition, a fresh clone or a move.** Claude Code finds the
  skills, and the agent types in `.agents/agents/`, only through the links
  it makes in the gitignored `.claude/` folders, and a dangling link drops
  a skill without a word. A session started in a folder above the clone is
  offered the agent types only once `--also-in <folder>` has linked them
  there.
- **A skill, an agent definition and an `AGENTS.md` describe code that
  exists.** They are read as authoritative, so an agent follows an invented
  path into a compile error rather than looking. A design for something not
  yet built belongs in a doc under `docs/`.
  `node .agents/check-skill-references.mjs`, part of `yarn lint`, fails a
  relative link that does not resolve and a backticked path that does not
  exist.
- **`.agents/agents/commit-reviewer.md` changes in the same commit as the
  rules it condenses:** this file's for code, doc comments and specs, and
  `frontend/AGENTS.md`'s for Angular and Sass.
- **Don't hand-edit a vendored skill.** `angular-developer` and
  `angular-new-app` are hash-locked in `skills-lock.json`, and the
  `phaser-*` skills, all but `phaser-core` and `phaser-canvas-performance`,
  are copies from Phaser's package. `phaser-core` says how to add one.

## Coding Best Practices

- **Dependency Injection:** Avoid hardcoded dependencies. Prefer taking dependencies in the constructor or function parameters.
- **TypeScript Style:** Follow Google's TypeScript style guide (https://google.github.io/styleguide/tsguide.html).
- **No `as any`.** Use generics, or `unknown` plus a type guard. `instance as unknown as Target` is a last resort worth a comment explaining why.
- **Explicit return types** on exported functions and public methods.
- **An optional property is left out, not set to `undefined`.** `@fz/dev`'s
  presets check `exactOptionalPropertyTypes`, so a record that may lack a
  key leaves it out (`...(x === undefined ? {} : { x })`); a field always
  written, but maybe empty, is `x: T | undefined`; and only an option a
  caller hands on, given or not, is typed `x?: T | undefined`.
- **`readonly` collections** for data that is not meant to change, such as the game catalog.
- **A union of ids is derived from its list** (`as const satisfies`), so the two can't disagree.

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

## Writing for Players

These rules cover every word a player or visitor reads or hears: labels,
help, messages, announcements, blurbs and page descriptions.

- **Load the `player-text` skill first,** even for one label inside a larger
  change. It has a shape, a word budget and examples for each kind of text.
- **Talk to the player.** Write "If the ball gets past your paddle, you lose
  a life", not "A ball that falls past the paddle costs a life".
- **Use the word on the button, and the ordinary word.** Resume, Cancel,
  Close, Settings. Name a key: P, Space, Esc.
- **One idea in a sentence.** Digits for numbers. American spelling.
  Sentence case for labels.
- **Keep to the budget.** A button is 1 to 3 words. The line under a setting
  is one or two short sentences. A catalog line is about 12 words, never over 20.
- **Say less.** Leave out what the player will see for themselves.

## Writing Unit Tests

These rules hold for every workspace's specs. Before writing one in an
Angular workspace, read the `angular-testing` skill. An app's own
`AGENTS.md` names its testing skill.

- **Test Coverage:** Cover new and changed code with specs.
- **Arrange, Act, Assert:** Structure each test case cleanly: arrange block, act block, assert block. Avoid multiple AAA cycles per test case; create focused test cases instead.
- **Simple Test Logic:** Avoid complex conditional logic in unit tests. Keep tests readable and explicit.
- **Test Helpers:** Abstract verbose setup into helper functions, ensuring test intent remains clear.
- **Test via Public API:** Avoid accessing private fields or methods (and avoid using `as any` or bracket property accessors to bypass visibility).
- **Verifying State > Verifying Interaction:** Prefer asserting resulting state over checking call counts/interactions, reserving interaction mocks only for when state cannot be inspected directly.
- **Real Objects > Mocks:** Use real object instances instead of mocks whenever feasible.
- **Avoid Any Casts:** Avoid `as any`. Use proper typing or `instance as unknown as TargetType` as a last resort.
- **No code bends to its specs.** Where a spec can't run something, change the harness or the fake. Never give the code a branch for it.
