# Stage 1: Build the Vite application
#
# Both base images are pinned by version and digest, so a rebuild of the same
# commit gets the same image; Dependabot proposes the updates. The Node major
# version here matches .node-version, which verify.yml checks.
FROM node:26.12.1-alpine3.24@sha256:40cd011b55415bc894e45b02fdd5a5dfde056921b7d23a64c74f80497af48797 AS build

ARG COMMIT_SHA
ARG GITHUB_SHA
ENV COMMIT_SHA=${COMMIT_SHA:-$GITHUB_SHA}

WORKDIR /app/frontend

# The whole frontend, so every workspace's package.json is here for the
# install and a new workspace needs no line of its own. Copying the
# package.json files first would let the install's layer outlive a change to
# the code, but no build keeps this stage's layers: the workflows start
# empty, and Cloud Build's --cache-from pulls only the final nginx image.
COPY frontend/ ./

# Install dependencies with Yarn 4 through Corepack, which Node 26 no longer
# bundles, then build the games and the site.
RUN npm install -g corepack@0.36.0 && corepack enable && yarn install --immutable
RUN yarn build

# Stage 2: Serve the application using Nginx
FROM nginx:1.31.8-alpine3.24@sha256:785835ea65db4bba6f021acc0f3be91b0fef76a53fe41f8588c6698d2aed0606

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
