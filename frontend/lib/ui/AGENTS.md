# @fz/ui

These rules hold for `@fz/ui`, the Angular components and services the site
and the games share. The frontend's, in
[frontend/AGENTS.md](../../AGENTS.md), and the repository's apply too.

- **What differs between apps is an injection token with a default,** as
  `THEME_COLOR_ROLE` is, which an app provides once. With a default, an app
  that wants the usual provides nothing, and neither do the specs.
