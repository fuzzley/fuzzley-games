import { TestBed } from "@angular/core/testing";
import { aimToward } from "@fz/brick-wall/view/aiming";
import { STRAIGHT_UP } from "@fz/brick-wall/view/aim_settings";
import { RADIUS } from "@fz/brick-wall/rules/field";
import {
  MARGIN_CSS_PX,
  type Place,
  toCanvas,
} from "@fz/brick-wall/view/field_metrics";
import { AIMS_PER_DEGREE, type Aim } from "@fz/brick-wall/rules/aims";
import { levelAt } from "@fz/core/levels";
import { FRAME_MS } from "@fz/core/testing";
import { DEBUG_MENU } from "@fz/game-ui/debug_menu";
import type { HostedScene } from "@fz/phaser/host";
import {
  FakePhaserCanvas,
  type SceneRun,
  provideFakePhaserCanvas,
  resize,
  runShownScene,
} from "@fz/phaser/testing";
import { viewport } from "@fz/phaser/testing/pure";
import { paintRoles } from "@fz/style/testing";
import { render, screen } from "@testing-library/angular";
import { userEvent } from "@testing-library/user-event";
import type { Shot } from "../rules/shot";
import { PALETTES } from "../testing/roles";
import {
  SPEC_LEVELS,
  type SpecRound,
  provideSpecPlay,
  scriptedRounds,
} from "../testing/spec_play";
import { FIELD_ROLES } from "../view/colors/palette";
import { AppComponent } from "./app.component";
import { provideBugReports } from "./bug_report/bug_report_source";
import { GameService } from "./play/game.service";
import { ProgressService } from "./stats/progress.service";

// The game, the board, its scene and its steering, played together as a
// player plays them: each case plays the first level through, a round
// stepping the wall down and then one clearing it, by one way of aiming, and
// goes on to the next.

/** An upright phone's canvas, 390 by 700 CSS px, at one device pixel to each. */
const UPRIGHT = { width: 390, height: 700 } as const;

/** The longest a spec draws the scene's frames waiting for something, in ms: a flight's and a card's wait, many times over. */
const PLAY_LIMIT_MS = 120_000;

/** The rounds the first level is played through in: one that steps the wall down, then one that clears it. */
const THROUGH: readonly SpecRound[] = ["step", "cleared"];

/** The id of the level each case plays through. */
const FIRST_ID = levelAt(SPEC_LEVELS, 1).data.id;

/** The app played through its scene, and what a spec reads of it. */
interface PlayedApp {
  readonly game: GameService;
  readonly run: SceneRun<HostedScene>;
  /** The shots the round player was handed, in turn. */
  readonly shots: readonly Shot[];
  readonly detectChanges: () => void;
}

/**
 * Renders the app on a fake canvas, its rounds played as {@link THROUGH}
 * says, and runs the scene the board loads, for real, on an upright
 * phone's canvas, laid out as a browser lays the board out, its first frame
 * drawn.
 */
async function playApp(): Promise<PlayedApp> {
  const shots: Shot[] = [];
  const play = scriptedRounds(...THROUGH);
  const { fixture } = await render(AppComponent, {
    providers: [
      provideFakePhaserCanvas(),
      ...provideSpecPlay((start, shot, rules) => {
        shots.push(shot);
        return play(start, shot, rules);
      }),
      ...provideBugReports(),
      { provide: DEBUG_MENU, useValue: false },
    ],
  });
  await fixture.whenStable();
  const host = (
    fixture.nativeElement as HTMLElement
  ).querySelector<HTMLElement>("fz-wall-board")!;
  // jsdom works out no `var()`, which the stylesheet declares the insets in.
  const margin = MARGIN_CSS_PX.roomy;
  for (const edge of ["top", "right", "bottom", "left"]) {
    host.style.setProperty(`--fz-canvas-inset-${edge}`, `${String(margin)}px`);
  }
  resize(host, UPRIGHT.width, UPRIGHT.height);
  fixture.detectChanges();
  const run = await runShownScene(TestBed.inject(FakePhaserCanvas), host, {
    ...UPRIGHT,
    insets: viewport(UPRIGHT.width, UPRIGHT.height, 1, {
      top: margin,
      right: margin,
      bottom: margin,
      left: margin,
    }).insets,
  });
  run.advance(FRAME_MS);
  fixture.detectChanges();
  return {
    game: TestBed.inject(GameService),
    run,
    shots,
    detectChanges: () => {
      fixture.detectChanges();
    },
  };
}

/** Draws the scene's frames until `done` says so, failing after {@link PLAY_LIMIT_MS} of them. */
function advanceUntil(run: SceneRun<HostedScene>, done: () => boolean): void {
  for (let ms = 0; !done(); ms += FRAME_MS) {
    if (ms >= PLAY_LIMIT_MS) throw new Error("The scene never got there.");
    run.advance(FRAME_MS);
  }
}

/** Names where on the field a shot is aimed, across and up from where the fuzzball waits. */
type Toward = readonly [across: number, up: number];

/** Where each case's pointer aims the level's two shots, apart, so each round's aim is the pointer's own. */
const TOWARD: readonly [Toward, Toward] = [
  [-2, 5],
  [1, 4],
];

/**
 * Plays the first level's two shots, each aimed and let fly by `shoot`
 * toward its place in {@link TOWARD}, a frame of the scene's at a time,
 * until the card over its end opens, and renders it.
 */
function playLevel(app: PlayedApp, shoot: (toward: Toward) => void): void {
  const [first, second] = TOWARD;
  shoot(first);
  advanceUntil(app.run, () => app.game.rounds() === 1);
  advanceUntil(app.run, () => app.game.phase() === "aiming");
  shoot(second);
  advanceUntil(app.run, () => app.game.card() !== null);
  app.detectChanges();
}

/** Returns the aims a pointer aimed the level's two shots at, toward their places in {@link TOWARD}. */
function aimsToward(): Aim[] {
  return TOWARD.map(([across, up]) => aimToward(across, up));
}

/** Returns a place on the field, across it and up it from where the fuzzball waits, on the canvas. */
function fieldPlace(game: GameService, [across, up]: Toward): Place {
  const metrics = game.metrics();
  if (metrics === null) throw new Error("The scene hasn't laid the field out.");
  return toCanvas(metrics, game.start().x + across, RADIUS + up);
}

/** Describes what a spec reads once the level is played through and the next begun. */
interface PlayedThrough {
  /** The aims of the shots the round player was handed, in turn. */
  readonly aims: readonly Aim[];
  /** The ids of the levels kept cleared. */
  readonly cleared: readonly string[];
  /** The level in play. */
  readonly level: number;
  /** The next level's Ready card, or null. */
  readonly ready: HTMLElement | null;
}

/** Returns what a spec reads once the level is played through and the next begun. */
function playedThrough({ game, shots }: PlayedApp): PlayedThrough {
  return {
    aims: shots.map((shot) => shot.aim),
    cleared: [...TestBed.inject(ProgressService).cleared()],
    level: game.run().level,
    ready: screen.queryByRole("group", { name: "Level 2: Side door" }),
  };
}

describe("a level played through", () => {
  beforeEach(() => {
    // The board draws its field in the palette's inks, which jsdom has no
    // stylesheet to give it.
    paintRoles(FIELD_ROLES, PALETTES.rolesIn("classic", FIELD_ROLES));
  });

  it("by the keys: aimed with Left, let fly at Space, and on to the next level at Enter", async () => {
    const app = await playApp();

    playLevel(app, () => {
      app.run.key("keydown", "ArrowLeft", "ArrowLeft");
      app.run.key("keyup", "ArrowLeft", "ArrowLeft");
      app.run.key("keydown", "Space", " ");
      app.run.key("keyup", "Space", " ");
    });
    app.run.key("keydown", "Enter", "Enter");
    app.run.key("keyup", "Enter", "Enter");
    app.run.advance(FRAME_MS);
    app.detectChanges();

    expect(playedThrough(app)).toEqual({
      aims: [STRAIGHT_UP + AIMS_PER_DEGREE, STRAIGHT_UP + 2 * AIMS_PER_DEGREE],
      cleared: [FIRST_ID],
      level: 2,
      ready: expect.any(HTMLElement) as HTMLElement,
    });
  });

  it("by the mouse: pointed at the field, let fly as its press lets go, and on to the next level by Next level", async () => {
    const app = await playApp();

    playLevel(app, (toward) => {
      const at = fieldPlace(app.game, toward);
      app.run.pointer("move", at.x, at.y);
      app.run.pointer("down", at.x, at.y);
      app.run.advance(FRAME_MS);
      app.run.pointer("up", at.x, at.y);
    });
    await userEvent.click(screen.getByRole("button", { name: "Next level" }));

    expect(playedThrough(app)).toEqual({
      aims: aimsToward(),
      cleared: [FIRST_ID],
      level: 2,
      ready: expect.any(HTMLElement) as HTMLElement,
    });
  });

  it("by a finger: pressed on the field, let fly as it lifts, and on to the next level by a tap on Next level", async () => {
    const app = await playApp();

    playLevel(app, (toward) => {
      const at = fieldPlace(app.game, toward);
      app.run.touch("start", at.x, at.y);
      app.run.advance(FRAME_MS);
      app.run.touch("end", at.x, at.y);
    });
    await userEvent.pointer({
      keys: "[TouchA]",
      target: screen.getByRole("button", { name: "Next level" }),
    });

    expect(playedThrough(app)).toEqual({
      aims: aimsToward(),
      cleared: [FIRST_ID],
      level: 2,
      ready: expect.any(HTMLElement) as HTMLElement,
    });
  });
});
