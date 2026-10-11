# Fuzzley Games Frontend

This is the frontend skeleton for **Fuzzley Games**, built with **Angular (Standalone & Signals)**, powered by **Vite**, written in **TypeScript**, and managed by **Yarn**.

## Tech Stack

- **Angular**: Modern standalone components, Signals reactivity, and fine-grained change detection.
- **Vite**: Ultra-fast ESM development server and production bundler via `@analogjs/vite-plugin-angular`.
- **TypeScript**: Strict compile-time safety.
- **Vitest**: Blazing-fast unit test runner with jsdom environment.
- **Yarn (Berry 4.x)**: Deterministic dependency management with `nodeLinker: node-modules`.

## Getting Started

### 1. Install Dependencies
```bash
yarn install
```

### 2. Development Server
Start Vite development server with instant Hot Module Replacement (HMR):
```bash
yarn start
# or
yarn dev
```
Navigate to `http://localhost:4200`.

### 3. Production Build
Build for production into `dist/`:
```bash
yarn build
```

Preview the production build locally:
```bash
yarn preview
```

### 4. Run Unit Tests
Run unit tests with Vitest:
```bash
yarn test
```

### 5. Type Checking
Run Angular and TypeScript strict type checking:
```bash
yarn typecheck
```
