# Fuzzley Games site

The site is the Angular app at fuzzley.games, and its build is what the image
serves, with the games copied under `/play/`. These rules are its own; the
frontend's, in [frontend/AGENTS.md](../AGENTS.md), and the repository's, in
[.agents/AGENTS.md](../../.agents/AGENTS.md), apply too.

- **Before writing or running a spec, read the `site-testing` skill,** for
  the site's two Vitest projects, its coverage floors and the small catalog
  its specs play on.
- **A component asks `GameCatalog` for the games and the categories,** and
  never imports `GAMES` or `CATEGORIES` from `src/app/provider/` itself. A
  spec gives the catalog a small list of its own, so a component that reads
  the site's list shows the real games there, and its spec breaks when a
  game is added.
- **A page that says something through `AnnouncerService` clears it when it
  is destroyed.** The one `<fz-announcer>` sits in the root template and
  outlives every page, so the words would stay in it on the next one.
