import { Component } from "@angular/core";
import { fireEvent, render, screen } from "@testing-library/angular";
import type { HostedScene } from "../host";
import { onKeyDown, onKeyUp } from "../scene";
import { type SceneRun, runBareScene } from "../testing";
import { KeepKeysDirective } from "./keep_keys.directive";

/** Space as a browser sends it, with the key code Phaser's capture reads. */
const SPACE = { key: " ", code: "Space", keyCode: 32 } as const;

@Component({
  imports: [KeepKeysDirective],
  template: `
    <div role="application" aria-label="Board" tabindex="0">
      <button type="button" fzKeepKeys>Kept</button>
      <button type="button">Plain</button>
    </div>
  `,
})
class TestBoardComponent {}

describe("KeepKeysDirective", () => {
  let run: SceneRun<HostedScene> | null = null;

  afterEach(() => {
    run?.destroy();
    run = null;
  });

  /**
   * Renders a board with two buttons on it, and runs a scene that hears its
   * keys and captures Space, gathering the codes of the keys it hears.
   */
  async function renderBoard(): Promise<string[]> {
    await render(TestBoardComponent);
    const board = screen.getByRole("application");
    run = await runBareScene({
      config: { input: { keyboard: { target: board } } },
    });
    run.scene.input.keyboard?.addCapture("SPACE");
    const heard: string[] = [];
    onKeyDown(run.scene, (event) => heard.push(event.code));
    onKeyUp(run.scene, (event) => heard.push(event.code));
    return heard;
  }

  /** Presses and lets go of Space on a button, returning whether neither was cancelled. */
  function pressSpace(name: string): boolean[] {
    const button = screen.getByRole("button", { name });
    return [fireEvent.keyDown(button, SPACE), fireEvent.keyUp(button, SPACE)];
  }

  it("keeps a key on its element from the scene, down and up", async () => {
    const heard = await renderBoard();

    const kept = pressSpace("Kept");
    run?.advance(16);

    expect(kept).toEqual([true, true]);
    expect(heard).toEqual([]);
  });

  it("is what keeps it: a key on an element without it reaches the scene, which cancels it", async () => {
    const heard = await renderBoard();

    const kept = pressSpace("Plain");
    run?.advance(16);

    expect(kept).toEqual([false, false]);
    expect(heard).toEqual(["Space", "Space"]);
  });
});
