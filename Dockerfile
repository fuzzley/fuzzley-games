# Stage 1: Build the Vite application
#
# Both base images are pinned by version and digest, so a rebuild of the same
# commit gets the same image; Dependabot proposes the updates. The Node major
# version here matches .node-version, which verify.yml checks.
FROM node:26.12.0-alpine3.24@sha256:6f08a523443ddedf52941874c203475b0ad503e859ad70cb26ab8be9a517dbd5 AS build

ARG COMMIT_SHA
ARG GITHUB_SHA
ENV COMMIT_SHA=${COMMIT_SHA:-$GITHUB_SHA}

WORKDIR /app

# Copy package files, lock files, and yarnrc. Every workspace's package.json
# has to be here before the install, or `--immutable` finds the lockfile out
# of date.
COPY frontend/package.json frontend/yarn.lock* frontend/.yarnrc.yml* ./frontend/
COPY frontend/site/package.json ./frontend/site/
COPY frontend/games/minesweeper/package.json ./frontend/games/minesweeper/

# Install dependencies with Yarn 4 through Corepack, which Node 26 no longer
# bundles.
WORKDIR /app/frontend
RUN npm install -g corepack@0.36.0 && corepack enable && yarn install --immutable

# Copy the rest of the frontend source code
WORKDIR /app
COPY frontend/ ./frontend/

# Build the games, then the site
WORKDIR /app/frontend
RUN yarn build

# Stage 2: Serve the application using Nginx
FROM nginx:1.31.7-alpine3.24@sha256:892bb2152464f0c5d8972593a5f5afaf8054552580b699d95f8ff4af08c2d33d

# Copy the build output to Nginx's default public directory
COPY --from=build /app/frontend/site/dist /usr/share/nginx/html

# Copy our custom Nginx template that uses the PORT environment variable, and
# the header snippets it includes.
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY nginx/ /etc/nginx/snippets/

# Generate runtime config (e.g. GA_AG_MEASUREMENT_ID) into env.js at container
# startup. The nginx image runs every /docker-entrypoint.d/*.sh before starting;
# chmod is required because git on Windows does not preserve the exec bit.
COPY docker-entrypoint.d/40-generate-env-config.sh /docker-entrypoint.d/40-generate-env-config.sh
RUN chmod +x /docker-entrypoint.d/40-generate-env-config.sh

# The official Nginx image automatically substitutes $PORT in
# /etc/nginx/templates/default.conf.template and outputs to
# /etc/nginx/conf.d/default.conf on startup.
EXPOSE 8080
