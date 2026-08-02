---
name: github-actions-ci-cd
description: Authoring, debugging, and maintaining GitHub Actions workflows (.github/workflows/deploy.yml), asset sync pipelines across repositories, quality gates, and automated deployment for fSolitaire. Triggers on: github actions, workflow, ci/cd, deploy pipeline, quality gate, deploy.yml.
---

# GitHub Actions CI/CD Pipeline & Deployment

> Workflow guidelines, quality gates, and automated deployment sync rules for fSolitaire.

## Workflow Structure (`.github/workflows/deploy.yml`)

Deployments are automated via GitHub Actions on every push to `main` (or manual `workflow_dispatch`):

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  verify:
    name: Quality Gate Verification
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'yarn'
      - run: corepack enable
      - run: yarn install --immutable
      - run: yarn verify # runs yarn lint && yarn tsc && yarn build && yarn test

  build-and-sync:
    name: Build & Sync Assets
    needs: verify
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'yarn'
      - run: corepack enable
      - run: yarn install --immutable
      - run: yarn build
      # Sync dist/ assets to target host site repository (fuzzley/fuzzley)
```

## Key Pipeline Principles

1. **Quality Gate Primacy:** The `build-and-sync` job MUST depend on `verify`. Never bypass linting, type-checking, or unit tests during automated deployment.
2. **Immutable Package Installation:** Always run `yarn install --immutable` in CI to ensure exact lockfile (`yarn.lock`) reproducibility.
3. **Corepack Enablement:** Always enable Corepack (`corepack enable`) before invoking Yarn commands so `yarn@4.17.1` is used.
4. **Cross-Repository Sync:** Production assets from `dist/*` are copied to `main-website/frontend/public/project/solitaire` in the host repo (`fuzzley/fuzzley`).
5. **No Secrets Leakage:** Never echo tokens or write personal access tokens (PATs) to build log outputs.

## Troubleshooting Pipeline Failures

- **Lint Failures:** Check `yarn lint` locally using `register.cjs`. Fix restricted import violations (`@typescript-eslint/no-restricted-imports`).
- **Type-Check Failures:** Run `yarn tsc` to check app code and `yarn tsc:test` for test files.
- **Coverage Floor Violations:** Ensure statement/function/line coverage stays above 90% and branch coverage above 80% when adding or editing code.
