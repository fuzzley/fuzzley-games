import { DOCUMENT } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { HEADLESS, Scene } from "phaser";
import type { HostOptions, HostedScene, MakeScene } from "../host";
import { type CanvasHost, PHASER_CANVAS_HOST } from "./canvas_host";

/** A scene that says it is ready as soon as it is created. */
class ReadyScene extends Scene implements HostedScene {
  private static built = 0;

  readonly key: string;

  constructor(private readonly ready: () => void) {
    const key = `ready-${++ReadyScene.built}`;
    super(key);
    this.key = key;
  }

  create(): void {
    this.ready();
  }
}

/** Builds a {@link ReadyScene}, recording that it was asked to. */
function makeReadyScene(built: string[], name: string): MakeScene {
  return ({ ready }) => {
    built.push(name);
    return new ReadyScene(ready);
  };
}

/** Real Phaser, headless, which jsdom can run. */
const OPTIONS: HostOptions = {
  title: "Snake",
  background: "transparent",
  config: { type: HEADLESS, autoFocus: false, banner: false },
};

describe("PHASER_CANVAS_HOST", () => {
  let parent: HTMLElement;
  let host: CanvasHost;

  beforeEach(() => {
    parent = document.createElement("div");
    document.body.append(parent);
    host = TestBed.inject(PHASER_CANVAS_HOST)(parent, OPTIONS);
  });

  afterEach(() => {
    host.destroy();
    parent.remove();
  });

  /** Shows a scene, and resolves once it says it is ready. */
  async function showUntilReady(make: MakeScene): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      host.show(() => make, resolve).catch(reject);
    });
  }

  it("loads Phaser and shows the scene its source makes", async () => {
    const built: string[] = [];

    await showUntilReady(makeReadyScene(built, "board"));

    expect({ built, canvas: parent.querySelector("canvas") !== null }).toEqual({
      built: ["board"],
      canvas: true,
    });
  });

  it("waits for a source that loads the scene", async () => {
    const built: string[] = [];
    const make = makeReadyScene(built, "board");

    await new Promise<void>((resolve, reject) => {
      host.show(() => Promise.resolve(make), resolve).catch(reject);
    });

    expect(built).toEqual(["board"]);
  });

  it("fails when the source does", async () => {
    const shown = host.show(
      () => Promise.reject(new Error("offline")),
      () => undefined,
    );

    await expect(shown).rejects.toThrow("offline");
  });

  it("shows only the latest of two scenes when the first is slower to load", async () => {
    const built: string[] = [];
    let loadSlow: (make: MakeScene) => void = () => undefined;
    const slow = host.show(
      () =>
        new Promise<MakeScene>((resolve) => {
          loadSlow = resolve;
        }),
      () => undefined,
    );
    await showUntilReady(makeReadyScene(built, "fast"));

    loadSlow(makeReadyScene(built, "slow"));
    await slow;

    expect(built).toEqual(["fast"]);
  });

  it("shows nothing once destroyed", async () => {
    const built: string[] = [];
    const shown = host.show(
      () => makeReadyScene(built, "board"),
      () => undefined,
    );

    host.destroy();
    await shown;

    expect({ built, canvas: parent.querySelector("canvas") }).toEqual({
      built: [],
      canvas: null,
    });
  });

  it("reads no insets before it has a game to tell", () => {
    expect(() => {
      host.refreshInsets();
    }).not.toThrow();
  });
});

describe("PHASER_CANVAS_HOST without a window", () => {
  it("can't be made", () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: DOCUMENT,
          useValue: document.implementation.createHTMLDocument(),
        },
      ],
    });

    expect(() => TestBed.inject(PHASER_CANVAS_HOST)).toThrow(
      "A Phaser canvas needs a window",
    );
  });
});
