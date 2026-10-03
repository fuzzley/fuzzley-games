// @vitest-environment jsdom
import { vi, describe, it, expect, beforeEach } from "vitest";
import { HostedGame, PhaserHost } from "@/engine/render/phaser/phaser_host";
import { FakeTableGame } from "@test/support/fake_table/game";
import { makeFakeTableBoardScene } from "@test/support/fake_table/scene";
import { TestPresentation } from "@test/support/presentation";

vi.mock("phaser", async () => {
  const mocks = await import("@test/support/phaser_mocks");
  return {
    ...mocks.boardScenePhaserMock(),
    AUTO: 0,
    Scale: { ScaleModes: { NONE: 0 } },
    Core: { Events: { READY: "ready", DESTROY: "destroy" } },
  };
});

/** Stands in for the `WEBGL_lose_context` extension of a context. */
class FakeLoseContext {
  /** How many times the context has been released. */
  losses = 0;

  loseContext(): void {
    this.losses++;
  }
}

/**
 * Stands in for a `Phaser.Game`, which, like the real one, is only marked for
 * destruction until its next frame tears it down.
 */
class FakeGame implements HostedGame {
  readonly canvas = { style: { width: "", height: "" } };
  readonly scale = { setZoom: vi.fn(), resize: vi.fn() };
  readonly loseContext = new FakeLoseContext();
  readonly renderer: HostedGame["renderer"];
  private readonly listeners = new Map<string, (() => void)[]>();
  /** Whether the host has asked for the game to be destroyed. */
  destroyed = false;

  /**
   * Creates a game drawing through WebGL, or through a canvas renderer, which
   * has no context to release.
   */
  constructor(webgl = true) {
    const gl = {
      getExtension: (name: string) =>
        name === "WEBGL_lose_context" ? this.loseContext : null,
    } as unknown as WebGLRenderingContext;
    this.renderer = webgl ? { type: 2, gl } : { type: 1 };
  }

  readonly events = {
    once: (event: string, listener: () => void) => {
      this.listeners.set(event, [
        ...(this.listeners.get(event) ?? []),
        listener,
      ]);
    },
  };

  destroy(): void {
    this.destroyed = true;
  }

  /** Runs the next frame, which tears down a game marked for destruction. */
  step(): void {
    if (!this.destroyed) return;
    const listeners = this.listeners.get("destroy") ?? [];
    this.listeners.delete("destroy");
    for (const listener of listeners) listener();
  }
}

describe("PhaserHost", () => {
  let games: FakeGame[];
  let webgl: boolean;

  beforeEach(() => {
    games = [];
    webgl = true;
  });

  /** Builds a host whose games are fakes this suite can inspect. */
  function makeHost(): PhaserHost {
    const presentation = new TestPresentation();
    const game = new FakeTableGame();
    game.startNewGame();
    return new PhaserHost(
      window,
      document.createElement("div"),
      () => makeFakeTableBoardScene(game, presentation),
      () => {
        const created = new FakeGame(webgl);
        games.push(created);
        return created;
      },
    );
  }

  describe("destroy", () => {
    it("destroys the game it started", () => {
      const host = makeHost();
      host.start();

      host.destroy();

      expect(games.map((game) => game.destroyed)).toEqual([true]);
    });

    it("releases the game's WebGL context once Phaser tears the game down", () => {
      const host = makeHost();
      host.start();
      host.destroy();

      games[0]?.step();

      expect(games[0]?.loseContext.losses).toBe(1);
    });

    it("keeps the context until then, while the renderer still listens for its loss", () => {
      const host = makeHost();
      host.start();

      host.destroy();

      expect(games[0]?.loseContext.losses).toBe(0);
    });

    it("releases the context only once when destroyed twice", () => {
      const host = makeHost();
      host.start();
      host.destroy();
      host.destroy();

      games[0]?.step();

      expect(games[0]?.loseContext.losses).toBe(1);
    });

    it("tears down a game drawn without WebGL", () => {
      webgl = false;
      const host = makeHost();
      host.start();
      host.destroy();

      games[0]?.step();

      expect(games.map((game) => game.destroyed)).toEqual([true]);
    });

    it("does nothing for a host that never started", () => {
      const host = makeHost();

      host.destroy();

      expect(games).toEqual([]);
    });
  });
});
