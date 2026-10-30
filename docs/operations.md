# Operations

How fuzzley.games is built, served, deployed and configured, and how the games
it hosts are built and served. The live site is https://fuzzley.games.

## Architecture

- **Frontend**: Angular standalone components, Signals, Vite bundler (`@analogjs/vite-plugin-angular`), Yarn Berry (v4). See [README.md](../README.md) for development commands.
- **Container Build**: Multi-stage Docker image, Node on Alpine for the build stage and nginx on Alpine for serving, both pinned by version and digest in the `Dockerfile`. Dependabot (`.github/dependabot.yml`) proposes new ones, and the npm packages and GitHub Actions, weekly, a day after their release.
- **Node version**: `.node-version` names the major version the workflows run (26). The `Dockerfile` names its own image, and `verify.yml` fails if their major versions differ.
- **Serving & SPA Routing**: Nginx automatically reads the Cloud Run `$PORT` variable via `/etc/nginx/templates/default.conf.template`. SPA client-side routes fall back to `index.html`, which browsers must revalidate (`no-cache`). An address naming a folder's `index.html` (`/index.html`, `/play/solitaire/index.html`) is redirected (301) to the folder's, so each page has one URL. The site's pages also name theirs in a canonical link, set after each navigation by `CanonicalLink` (`frontend/site/src/app/service/canonical_link.service.ts`); each game's `index.html` names its own. Long-lived caching is applied to the fingerprinted files in `/assets/`.
- **Games**: each game is built here, in a workspace of its own, and served as static files under `/play/<slug>/`, with no fallback to the site's `index.html`. See [Games](#games).
- **Build info**: the build writes `version.json` (package version, short commit, build time, and the build of each game), served with `Cache-Control: no-store`, so the live site says which commit it is running. The site's footer names the same commit, with a link to it on GitHub, and the day of the build.
- **Runtime Configuration**: Environment variables such as `GA_AG_MEASUREMENT_ID` are injected at container startup into `/usr/share/nginx/html/env.js` via `/docker-entrypoint.d/40-generate-env-config.sh`, with `Cache-Control: no-store`. See [Runtime Configuration](#runtime-configuration).

## Docker Build & Run (Local Testing)

From the repository root:

1. **Build the Docker Image**:

   ```sh
   docker build -t fuzzley-games .
   ```

2. **Run the Container Locally**:

   ```sh
   docker run -d --name games-container -p 8080:8080 -e PORT=8080 fuzzley-games
   ```

3. **Verify**:
   Open [http://localhost:8080](http://localhost:8080) in your browser.

4. **Cleanup**:
   ```sh
   docker stop games-container
   docker rm games-container
   ```

## Games

Every game is built here. The Solitaire Collection is built in
`frontend/games/solitaire/` and played at `/play/solitaire/`, which picks a
game by hash route (`/play/solitaire/#/klondike`). Minesweeper is built in
`frontend/games/minesweeper/` and played at `/play/minesweeper/`, Sudoku
in `frontend/games/sudoku/`, at `/play/sudoku/`, Snake in
`frontend/games/snake/`, at `/play/snake/`, and Brick Breaker in
`frontend/games/brick-breaker/`, at `/play/brick-breaker/`.

`frontend/site/games.json` lists each game's build, by the slug it is served
at: a Yarn workspace under `frontend/games/`, named by its folder in
`frontend/` (`{ "workspace": "games/minesweeper" }`). `yarn build:games` runs
every one's `build`, and `frontend/site/tools/copy-games.mjs` copies each
one's `dist/` into `frontend/site/public/play/<slug>/`. A game goes live with
the commit that changes it, like the site itself.

git ignores `frontend/site/public/play/`. `yarn start` and `yarn build`, run
from `frontend/`, build the workspaces, and the site's own `start` and
`build` run `copy-games.mjs` before Vite, so the Docker build makes and
copies the games too. `frontend/site/tools/inject-analytics.mjs` then adds
the site's `env.js` and `analytics.js` tags to each game's `index.html` in
`frontend/site/dist/`, since the games carry no analytics code of their own.
`version.json` names each game's build by its workspace and the site's own
commit.

`yarn dev:all` serves the games another way, for working on them:
`frontend/site/tools/dev-all.mjs` starts each game's own Vite dev server
in its workspace, at `/play/<slug>/` and on a port after the site's, and
the site's dev server sends each game's folder there, websocket and all, so
an edit to a game shows at the site's address as soon as it is saved: a
component's template or styles, a library's included, swap into the running
page, and anything else reloads it.

The site's catalog (`frontend/site/src/app/provider/games.ts`) names each
hosted game's build and id, and shows the screenshots the build ships in
`docs/screenshots/<id>/`. Each game also writes a `game.json` at
the top of its build, through `@fz/dev`'s `gameConfig()`: its name and, for a
collection, the id and name of every game it opens. The build fails if the
catalog links a game a build doesn't have, such as one renamed in its
workspace, or names one differently from its build, apostrophes aside.

- **Roll a game back:** revert the change, as for the site (see
  [Deployment](#deployment)).
- **Add a game:** give it a folder under `frontend/games/` with a
  `package.json`, named after the folder, whose `build` script writes
  `dist/`, with `index.html` at its top level, the `game.json` that
  `gameConfig()` writes, and its screenshots in `docs/screenshots/<id>/`. Run `yarn install`, add
  `{ "workspace": "games/<folder>" }` to `games.json`, and list its games in
  the catalog. The `Dockerfile` copies all of `frontend/`, so it needs no
  change.

The Solitaire Collection and Minesweeper began in repositories of their
own, fSolitaire and fMinesweeper, and were branched off into this one with
their history; Sudoku, Snake and Brick Breaker began here. Nothing here
builds from those repositories or links to them, and each game may diverge
from its own.

## Security headers

`nginx/security-headers.conf` gives every response, errors included,
`X-Content-Type-Options: nosniff`, a `Referrer-Policy`, `X-Frame-Options:
DENY`, a `Permissions-Policy` that turns off what the site never uses, and
HSTS. nginx drops inherited `add_header` lines in any location that adds its
own, so each location in `nginx.conf.template` that sets `Cache-Control`
includes the file again.

The site's own pages (`location /`) also carry
`nginx/content-security-policy.conf`: scripts from the site and Google
Analytics only (the page has no inline script; `theme.js`, `env.js` and
`analytics.js` are files), styles from the site with `'unsafe-inline'`
(Angular adds each component's styles as a `<style>` element), fonts from
the site (Figtree comes with `@fz/style`), Google Analytics' measurement
endpoints, and no framing. The policy
is written for the site's pages, and the games under `/play/` load what their
engines need (the Solitaire Collection's Phaser draws from `blob:` URLs), so
they get the common headers but no policy.

A new third-party script, font or endpoint needs adding to the policy, or the
browser blocks it and says so in the console. `check-image.sh` checks the
headers on the site's pages, its files, an error, and each game.

## Deployment

https://fuzzley.games is the site. Cloud Run serves it from the Docker image
above, which a Cloud Build trigger (`cloudrun-fuzzley-games-git-us-central1`,
in `europe-west1`) rebuilds and deploys on every push to the `live` branch.
Apart from a rollback, nothing is pushed to `live` by hand: when Verify
(`.github/workflows/verify.yml`) passes on a commit of `main`, its `promote`
job moves `live` forward to it. A
commit whose checks fail never goes live, and the site stays on the last one
that passed.

To deploy `live` again without a push:

```sh
gcloud builds triggers run cloudrun-fuzzley-games-git-us-central1 --region=europe-west1 --branch=live
```

To roll back, revert the commit on `main`; the revert goes live once Verify
passes on it. For a faster rollback, move `live` back to a good commit of
`main` (`git push --force origin <commit>:live`). That lasts until Verify next
passes on `main` and moves `live` forward again, so revert on `main` too.

To check what is live:

```sh
curl https://fuzzley.games/version.json
```

## Runtime Configuration

The frontend is a static build, but a few values (currently the GA ID) are
injected at **container startup** rather than baked into the build. This keeps
IDs out of the repository and the image layers, and lets the same image run
anywhere with different configuration.

### How it works

1. `frontend/site/public/env.js` ships a placeholder
   `window.__ENV = { GA_ID: "" }` with no real values, which Vite copies into
   the build.
2. On startup, `docker-entrypoint.d/40-generate-env-config.sh` (run
   automatically by the nginx base image) overwrites the served `env.js` from
   the container's environment variables.
3. `frontend/site/index.html` loads `theme.js` (which picks the palette; the
   build makes it), then `env.js`, then `analytics.js`, the Google
   Analytics bootstrap, which initializes only when a measurement ID is
   present. With nothing set, the feature stays off — so local dev and
   unconfigured containers run with analytics disabled.
4. nginx serves `env.js` with `Cache-Control: no-store`, so a configuration
   change is never served from a stale cache. Rotating the ID therefore needs a
   container restart, not a rebuild.

Angular changes pages with the History API, so `analytics.js` sends only the
first page view. GA4 counts the rest itself while the web data stream's
enhanced measurement has "Page changes based on browser history events" on.

### Supported variables

| Environment variable   | Purpose                                                              | Example        |
| ---------------------- | -------------------------------------------------------------------- | -------------- |
| `GA_AG_MEASUREMENT_ID` | Google Analytics 4 measurement ID. Leave unset to disable analytics. | `G-XXXXXXXXXX` |

### Providing values

On Cloud Run, the ID lives in Secret Manager as
`ga-fuzzley-games-measurement-id`, separate from fuzzley.info's
`ga-ag-measurement-id`. To set it up or change where it points:

```sh
# Once: create the secret and let the service's account read it.
printf '%s' 'G-XXXXXXXXXX' | gcloud secrets create ga-fuzzley-games-measurement-id --data-file=-
gcloud secrets add-iam-policy-binding ga-fuzzley-games-measurement-id \
  --member=serviceAccount:1073972095824-compute@developer.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor

# Expose it to the container; this starts a new revision.
gcloud run services update fuzzley-games-git --region=us-central1 \
  --set-secrets=GA_AG_MEASUREMENT_ID=ga-fuzzley-games-measurement-id:latest
```

Cloud Run reads the secret when an instance starts, so a new secret version
(`gcloud secrets versions add`) reaches the site as instances restart; the
next deploy restarts them all.

Local Docker example:

```sh
docker run -d --name games-container -p 8080:8080 \
  -e PORT=8080 \
  -e GA_AG_MEASUREMENT_ID=G-XXXXXXXXXX \
  fuzzley-games
```
