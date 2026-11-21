# @fz/dev

These rules hold for `@fz/dev`, the library every workspace is linted,
compiled, tested and built with, and whose helpers their scripts share. The
frontend's, in [frontend/AGENTS.md](../../AGENTS.md), and the repository's
apply too. Paths are relative to `frontend/lib/dev/`.

- **A rule or a fence added to a preset gets two cases in
  `src/eslint.spec.ts`: code it catches, and code it lets by.** A block's
  rules are data, so coverage reads full whatever they match, and a selector
  or a pattern that matches nothing passes every check.
- **Before changing a rule's options in `src/eslint.ts`, search it and every
  workspace's `eslint.config.js` for the rule's name.** A block that sets
  the rule again, a later one here or a workspace's own, replaces the
  options and merges nothing, so what is added to the earlier list goes
  unchecked in that block's files, without a word, until it is added there
  too.
- **A preset turns a rule off only where every workspace of a kind needs it
  off,** as `phaser()` does for every folder that drives Phaser. Anything
  narrower is one workspace's exception, which the frontend's rules put in
  its own config.
- **Nothing here reaches an app's bundle.** This library checks, builds and
  scripts a workspace, so code an app runs goes in another library. Where
  the two must agree, as on the names of the build stamp's meta tags, each
  keeps its own, and the other library's spec imports this one's to hold
  them together.
