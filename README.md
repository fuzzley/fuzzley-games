# Fuzzley Games

Fuzzley Games portal and gallery built with Angular and Vite, containerized with Docker, and served on Google Cloud Run via Nginx: https://fuzzley.games

## Architecture

- **Frontend**: Angular standalone components, Signals, Vite bundler (`@analogjs/vite-plugin-angular`), Yarn Berry (v4). See [frontend/README.md](frontend/README.md) for development commands.
- **Container Build**: Multi-stage Docker image using `node:26-alpine` for the build stage and `nginx:alpine` for serving.
- **Serving & SPA Routing**: Nginx automatically reads the Cloud Run `$PORT` variable via `/etc/nginx/templates/default.conf.template`. SPA client-side routes fall back to `index.html`, which browsers must revalidate (`no-cache`). Long-lived caching is applied to the fingerprinted files in `/assets/`.
- **Games**: each game is built in its own repository and served as static files under `/play/<slug>/`, with no fallback to the site's `index.html`. See [Games](#games).
- **Build info**: the build writes `version.json` (package version, short commit, build time, and the build of each game), served with `Cache-Control: no-store`, so the live site says which commit it is running.
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

The games are built in their own repositories. Today that is the Solitaire
Collection, [fuzzley/fSolitaire](https://github.com/fuzzley/fSolitaire),
played at `/play/solitaire/`, which picks a game by hash route
(`/play/solitaire/#/klondike`). Every push to a game's `main` builds it and
uploads the build to that repository's `site-build` release as
`<slug>-<short sha>.tar.gz`, then replaces `latest.json` there, which names
the newest archive.

`frontend/games.json` pins one archive per game, by name and SHA-256.
`frontend/tools/fetch-games.mjs` downloads each pinned archive (cached in
`node_modules/.cache/games/`), checks its SHA-256 and unpacks it into
`frontend/public/play/<slug>/`, which git ignores. `yarn start` and
`yarn build` run it first, so the Docker build fetches the games too.
`frontend/tools/inject-analytics.mjs` then adds the site's `env.js` and
`analytics.js` tags to each game's `index.html` in `dist/`, since the games
carry no analytics code of their own.

The dashboard's catalog (`frontend/src/app/provider/game_catalog.ts`) names
each hosted game's build and id, and shows the screenshots the build ships in
`docs/screenshots/<id>/`. The build fails if the catalog links a game the
fetched build doesn't have, such as one renamed upstream.

Every 15 minutes, `.github/workflows/update-games.yml` moves each pin to the
newest build, builds the image and checks it, and pushes the change to `main`
if both pass; Cloud Run then deploys it. It uses only its own `GITHUB_TOKEN`,
and no game repository can push here. If the image fails, it opens a
"Game update failed" issue and skips that archive until the issue is closed or
a newer build appears. GitHub turns scheduled workflows off after 60 days
without activity, so if a game's update never arrives, check that Update games
is enabled under Actions.

- **Roll a game back:** set its entry in `games.json` to an older archive from
  its release (`gh release view site-build --repo fuzzley/<repo>`), with that
  archive's SHA-256 and commit, and push. The next scheduled run moves it
  forward again once the game has a newer build than that. A game's release
  keeps its ten newest archives and the one pinned here.
- **Add a game:** give its repository a deploy job like fSolitaire's, push once
  so its release exists, add its entry to `games.json` from its
  `latest.json`, and list its games in the catalog.

fuzzley.info pins and fetches its own games the same way; these scripts
started as its own.

## Deployment

fuzzley.games is the site. Cloud Run serves it from the Docker image above,
and rebuilds and deploys that image on every push to `main` by itself, without
waiting for the checks that follow.

| Piece             | Where                                                                                                        |
| ----------------- | ------------------------------------------------------------------------------------------------------------ |
| Cloud Run service | `fuzzley-games-git` in `us-central1` (project `agavel-personal`)                                             |
| Build trigger     | Cloud Build, `europe-west1`, through the Developer Connect GitHub connection `connection-bvfiiae`            |
| Images            | Artifact Registry `us-central1-docker.pkg.dev/agavel-personal/cloud-run-source-deploy/fuzzley-fuzzley-games` |

The trigger pulls the previous `:latest` image as a layer cache, builds the
Dockerfile with `COMMIT_SHA`, pushes `:<commit>` and `:latest`, then runs
`gcloud run services update --image`, which changes only the image and keeps
the service's other settings and secrets. The repository's cleanup policy
keeps the 30 newest versions, about ten builds since each build also stores
two small provenance records, and deletes any other once it is a week old.
fuzzley's repository in `northamerica-northeast2` has the same policy. Cloud
Run keeps its own copy of the image a serving revision runs, so the policy
never takes the live site down; it only limits how far back a rollback can go.

Pushes to `main` and pull requests also run `.github/workflows/verify.yml`,
which type-checks, tests and builds, then builds the Docker image, serves it
and checks its pages, games, cache headers, `env.js` and `version.json`
(`.github/scripts/check-image.sh`). Cloud Run
doesn't wait for it, so a failed run there means `main` is already live.

To deploy `main` again without a push:

```sh
gcloud builds triggers run cloudrun-fuzzley-games-git-us-central1 --region=europe-west1 --branch=main
```

To check what is live:

```sh
curl https://fuzzley.games/version.json
```

### Domain Mapping

Map a custom domain using either:

- **Cloud Run Console**: [Manage Custom Domains](https://console.cloud.google.com/run/domains?project=agavel-personal)
- **gcloud CLI**:
  ```sh
  gcloud beta run domain-mappings create --service fuzzley-games-git --domain fuzzley.games --region us-central1
  ```

## Runtime Configuration

The frontend is a static build, but a few values (currently the GA ID) are
injected at **container startup** rather than baked into the build. This keeps
IDs out of the repository and the image layers, and lets the same image run
anywhere with different configuration.

### How it works

1. `frontend/public/env.js` ships a placeholder `window.__ENV = { GA_ID: "" }`
   with no real values, which Vite copies into the build.
2. On startup, `docker-entrypoint.d/40-generate-env-config.sh` (run
   automatically by the nginx base image) overwrites the served `env.js` from
   the container's environment variables.
3. `frontend/index.html` loads `env.js` and then `analytics.js`, the Google
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
