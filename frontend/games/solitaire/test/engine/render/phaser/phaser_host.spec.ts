// @vitest-environment jsdom
import { vi, describe, it, expect, beforeEach } from "vitest";
import { BoardScene } from "@/engine/render/phaser/board_scene";
import { HostedGame, PhaserHost } from "@/engine/render/phaser/phaser_host";
import { Insets } from "@/engine/render/layout/viewport";
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

/** Stands in for a game's scene manager, recording what it was told to do. */
class FakeSceneManager {
  /** Every operation, in order, as `<op>:<key>`. */
  readonly operations: string[] = [];
  /** The keys of the scenes added and not yet removed. */
  readonly mounted: string[] = [];

  add(key: string, _scene: BoardScene, autoStart: boolean): void {
    this.operations.push(`add:${key}`);
    if (autoStart) this.mounted.push(key);
  }

  stop(key: string): void {
    this.operations.push(`stop:${key}`);
  }

  remove(key: string): void {
    this.operations.push(`remove:${key}`);
    this.mounted.splice(this.mounted.indexOf(key), 1);
  }
}

/**
 * Stands in for a `Phaser.Game`, which, like the real one, boots
 * asynchronously and is only marked for destruction until its next frame tears
 * it down.
 */
class FakeGame implements HostedGame {
  readonly canvas = { style: { width: "", height: "" } };
  readonly scale = { setZoom: vi.fn(), resize: vi.fn() };
  readonly scene = new FakeSceneManager();
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

  /** Finishes booting, as the real game does once its textures are ready. */
  boot(): void {
    this.emit("ready");
  }

  /** Runs the next frame, which tears down a game marked for destruction. */
  step(): void {
    if (this.destroyed) this.emit("destroy");
  }

  private emit(event: string): void {
    const listeners = this.listeners.get(event) ?? [];
    this.listeners.delete(event);
    for (const listener of listeners) listener();
  }
}

describe("PhaserHost", () => {
  let games: FakeGame[];
  let webgl: boolean;
  let host: PhaserHost;

  beforeEach(() => {
    games = [];
    webgl = true;
    host = new PhaserHost(window, document.createElement("div"), () => {
      const created = new FakeGame(webgl);
      games.push(created);
      return created;
    });
  });

  /** Returns the one game the host has started. */
  function game(): FakeGame {
    const [only, ...others] = games;
    if (!only || others.length > 0) {
      throw new Error(`Expected one game, found ${games.length}`);
    }
    return only;
  }

  /** Builds a board drawing a freshly dealt game. */
  function makeBoard(): BoardScene {
    const dealt = new FakeTableGame();
    dealt.startNewGame();
    return makeFakeTableBoardScene(dealt, new TestPresentation());
  }

  /** Shows a board and returns it, once it has been built. */
  function show(): () => BoardScene | undefined {
    let built: BoardScene | undefined;
    host.show(() => {
      built = makeBoard();
      return built;
    });
    return () => built;
  }

  it("tells a board the inset its parent declares", () => {
    const parent = document.createElement("div");
    parent.style.setProperty("--board-inset-top", "40px");
    const inset = new PhaserHost(window, parent, () => {
      const created = new FakeGame(webgl);
      games.push(created);
      return created;
    });
    let insets: (() => Insets) | undefined;
    inset.show((surroundings) => {
      insets = surroundings.insets;
      return makeBoard();
    });

    game().boot();

    expect(insets?.().top).toBe(40);
  });

  it("reads the insets again when asked, without the window resizing", () => {
    const parent = document.createElement("div");
    // In the document, since jsdom keeps a detached element's computed style.
    document.body.append(parent);
    parent.style.setProperty("--board-inset-left", "64px");
    const railed = new PhaserHost(window, parent, () => {
      const created = new FakeGame(webgl);
      games.push(created);
      return created;
    });
    let insets: (() => Insets) | undefined;
    railed.show((surroundings) => {
      insets = surroundings.insets;
      return makeBoard();
    });
    game().boot();
    // The rail moves to the other edge, as a change of hand moves it.
    parent.style.setProperty("--board-inset-left", "0px");
    parent.style.setProperty("--board-inset-right", "64px");

    railed.refreshInsets();
    parent.remove();

    expect([insets?.().left, insets?.().right]).toEqual([0, 64]);
  });

  describe("show", () => {
    it("starts one game however many boards it shows", () => {
      show();
      games[0]?.boot();

      show();
      show();

      expect(games).toHaveLength(1);
    });

    it("mounts nothing until the game has booted", () => {
      show();

      expect(game().scene.mounted).toEqual([]);
    });

    it("mounts the board once the game has booted", () => {
      const board = show();

      game().boot();

      expect(game().scene.mounted).toEqual([board()?.key]);
    });

    it("replaces the board on the table with the next one", () => {
      show();
      game().boot();

      const next = show();

      expect(game().scene.mounted).toEqual([next()?.key]);
    });

    it("stops the board it replaces before removing it", () => {
      const first = show();
      game().boot();
      const key = first()?.key;

      show();

      // Phaser destroys a removed scene without shutting it down.
      expect(
        game().scene.operations.filter((op) => op.endsWith(`:${key}`)),
      ).toEqual([`add:${key}`, `stop:${key}`, `remove:${key}`]);
    });

    it("builds only the latest board shown while the game boots", () => {
      const first = show();
      const second = show();

      game().boot();

      expect({
        firstBuilt: first() !== undefined,
        mounted: game().scene.mounted,
      }).toEqual({ firstBuilt: false, mounted: [second()?.key] });
    });

    it("mounts nothing when the game finishes booting after it was destroyed", () => {
      show();
      host.destroy();

      game().boot();

      expect(game().scene.mounted).toEqual([]);
    });
  });

  describe("destroy", () => {
    it("destroys the game it started", () => {
      show();

      host.destroy();

      expect(game().destroyed).toBe(true);
    });

    it("releases the game's WebGL context once Phaser tears the game down", () => {
      show();
      host.destroy();

      game().step();

      expect(game().loseContext.losses).toBe(1);
    });

    it("keeps the context until then, while the renderer still listens for its loss", () => {
      show();

      host.destroy();

      expect(game().loseContext.losses).toBe(0);
    });

    it("releases the context only once when destroyed twice", () => {
      show();
      host.destroy();
      host.destroy();

      game().step();

      expect(game().loseContext.losses).toBe(1);
    });

    it("tears down a game drawn without WebGL", () => {
      webgl = false;
      show();
      host.destroy();

      game().step();

      expect(game().destroyed).toBe(true);
    });

    it("does nothing for a host that never showed a board", () => {
      host.destroy();

      expect(games).toEqual([]);
    });
  });
});
