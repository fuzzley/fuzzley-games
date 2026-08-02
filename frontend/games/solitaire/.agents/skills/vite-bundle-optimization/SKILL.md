---
name: vite-bundle-optimization
description: Vite 8 configuration, manual chunking strategies (Phaser vs Angular), texture atlas build toolchain (build-card-atlas.mjs), dev server setup, and production bundling for fSolitaire. Triggers on: vite, bundle, chunk, vite.config, build:atlas, atlas generation, rollup, manualChunks.
---

# Vite 8 Build System & Texture Atlas Toolchain

> Build setup, dev server configuration, manual chunk isolation, and card atlas generation rules for fSolitaire.

## Development & Build Commands

- **Development Server:** `yarn start` or `yarn dev` (launches Vite dev server at `http://localhost:9000/`).
- **Build Card Atlas:** `yarn build:atlas` (runs `tools/build-card-atlas.mjs` to convert SVG assets into WebP texture atlas files).
- **Production Build:** `yarn build` (generates bundled production assets in `dist/`).
- **Build Preview:** `yarn preview` (serves production output locally).

## Chunk Splitting Strategy

Phaser 4 canvas rendering engine and AnalogJS/Angular 22 application shell are isolated into separate vendor manual chunks in `vite.config.ts` to maximize HTTP cache reuse:

```ts
export default defineConfig({
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/phaser')) {
            return 'vendor-phaser';
          }
          if (id.includes('node_modules/@angular') || id.includes('node_modules/rxjs')) {
            return 'vendor-angular';
          }
        },
      },
    },
  },
});
```

## Texture Atlas Generation (`tools/build-card-atlas.mjs`)

- Card vector artwork lives in `assets/svg/` (cards, suits, ranks, card backs, table badges).
- Running `yarn build:atlas` reads SVG sources, renders frame graphics, and packs them into atlas sprite sheets (`public/assets/atlas/cards.json` & `public/assets/atlas/cards.webp`).
- **Rule:** Whenever SVG card graphics or card frame dimensions change, run `yarn build:atlas` before building or testing.

## Asset Base Href & Relative Paths

- Built production assets are deployed to a subdirectory path (`/project/solitaire/`).
- Router uses **hash location strategy** (`useHash: true` in Angular router setup) so static hosts serve deep variant URLs without requiring server rewrite rules.
