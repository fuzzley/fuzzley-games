/// <reference types="vitest" />
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import angular from '@analogjs/vite-plugin-angular';

// COMMIT_SHA comes first: the Docker build passes it in, and the image has no
// .git to ask.
function commitHash(): string {
  if (process.env['COMMIT_SHA']) {
    return process.env['COMMIT_SHA'].slice(0, 7);
  }
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return 'dev';
  }
}

// Writes dist/version.json, which nginx serves uncached, so the live site says
// which commit it was built from.
function versionJson(): Plugin {
  return {
    name: 'version-json',
    apply: 'build',
    generateBundle() {
      const pkg = JSON.parse(readFileSync(new URL('package.json', import.meta.url), 'utf8'));
      const buildInfo = { version: pkg.version, commit: commitHash(), buildTime: new Date().toISOString() };
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify(buildInfo, null, 2) });
    },
  };
}

export default defineConfig({
  plugins: [angular(), versionJson()],
  server: {
    port: 4200,
    host: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.{test,spec}.ts'],
  },
});
