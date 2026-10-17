# Work log: code health pass

Temporary. It records the pass while it is under way and is deleted in the
last commit once the pass is merged.

## Goal

Set a strong foundation while the site is small: act on every finding of the
code review of 2026-10-17 (numbered as there), and move the styles to Sass.

## Plan

Each item lands as its own commit on `code-health`, with `yarn verify` green.

1. Type-check the specs and `vite.config.ts`.
2. Zoneless change detection, an `app.config.ts`, global error listeners.
3. An injectable game catalog; specs run against a fixture, not the live list.
4. Enforce the written rules: palette consistency, `index.html` drift,
   hard-coded colors, stricter ESLint.
5. A `TitleStrategy` for page titles.
6. One not-found page.
7. Template logic into `computed()` view models; one plural form.
8. Shared icons, layout classes and visually-hidden rules.
9. Coming-soon thumbnails as SVG files.
10. Unions derived from their data.
11. Consistency: `protected` template members, `viewChild`, one URL parse,
    injected storage, no explicit `OnPush`.
12. Structured, `readonly` game data, split from the catalog's logic.
13. Specs for the header, category page, titles and "New" badge.
14. Test style: Testing Library queries, one act per test, explicit imports.
15. Testable tools: pure functions, `import.meta.main`, specs, Vite plugins
    out of `vite.config.ts`.
16. Search results announced through a persistent live region.
17. The theme picker as a menu of radio items with arrow keys.
18. One play link per destination; a search landmark.
19. Infra: one Node version, pinned images, Dependabot, security headers,
    no `@angular/forms`, one README, no hard-coded game count.
20. Sass: SCSS modules (`@use`), palettes generated from maps and checked at
    compile time, shared tokens and mixins, stylelint.

## Decisions

1. Work happens on `code-health`, committed but not pushed: Cloud Run
   deploys every push to `main`.

## Log

### 2026-10-17

- Baseline on `main` at `44adc61`: `yarn lint`, `yarn typecheck` and
  `yarn test` (30 tests) pass.

#### 1. Type-check the specs and the Vite config

- `tsconfig.app.json` starts at `main.ts`, so `ngc` never saw a spec, and
  `vite.config.ts` was in no tsconfig at all (`tsc --listFilesOnly` over
  `tsconfig.app.json` lists no spec). A deliberate type error in a spec now
  fails `yarn typecheck`.
- `yarn typecheck` now also runs `tsc` over `tsconfig.spec.json` and a new
  `tsconfig.node.json` (for `vite.config.ts`).
- That found a real error at once: the `test` block isn't part of Vite's
  `UserConfig`, and `/// <reference types="vitest" />` no longer adds it.
  `defineConfig` now comes from `vitest/config`.

#### 2. Zoneless, `app.config.ts`, global error listeners

- Angular 22 runs zoneless by default; `main.ts` had opted back into zone.js.
  Removed zone.js from `main.ts`, `test-setup.ts` and the dependencies.
- The providers moved into `app.config.ts` (with
  `provideBrowserGlobalErrorListeners()`), and `routes.ts` now only declares
  the pages. `app.component.spec.ts` renders with `appConfig.providers`, the
  router the app ships, instead of a `provideRouter(routes)` of its own.
- The Chrome extension wasn't connected, so the app was checked in headless
  Chrome over the DevTools protocol, driven by a scratch script (not
  committed): search refines in place and Escape clears it, the theme menu
  opens, applies, saves, sets `theme-color` and closes on a choice or an
  outside click, a tile's link routes to its game, and the titles are right,
  on desktop and phone widths.
- Found on the way, and true on `main` too: Angular warns (NG0913) that the
  home page's largest image, a thumbnail, is `loading="lazy"`. Fixed with
  item 9.
- Angular 22's `RouterLink` writes absolute hrefs in a browser
  (`http://…/games/klondike`), while jsdom gets relative ones.
