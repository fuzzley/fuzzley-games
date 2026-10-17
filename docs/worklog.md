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
