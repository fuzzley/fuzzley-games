import { ApplicationRef } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { readCertificates } from "@fz/brick-wall/app/certificates";
import { DEPTHS } from "@fz/brick-wall/rules/field";
import { DEBUG_MENU } from "@fz/game-ui/debug_menu";
import { loadsSettled } from "@fz/ui/testing";
import { LEVEL_SETS, LEVELS } from "../../rules/levels/levels";
import { playRound } from "../../rules/round/round";
import { filesHolding } from "../../testing/lines";
import {
  playRoundOut,
  playUntilCard,
  provideSpecPlay,
} from "../../testing/spec_play";
import { GameService } from "../play/game.service";
import { DebugService } from "./debug.service";
import {
  CERTIFICATE_FILES,
  CertificatesService,
  RALLY_LINE_FILES,
  RallyLinesService,
  readLineShot,
} from "./certificates.service";

// What the certificates offer and play, and when they load, is
// `@fz/brick-wall/app/certificates`' `DebugCertificates`, whose spec holds
// it: this one holds the game's files, its codec and its game.

/** Returns the field's depth, as the game lays it out. */
function fieldDepth(): number {
  return TestBed.inject(GameService).shape().depth;
}

/** Waits for what the services load to load, their effects run first. */
function settled(): Promise<void> {
  return loadsSettled(TestBed.inject(ApplicationRef));
}

describe("readLineShot", () => {
  it("reads an aim's index back", () => {
    expect(readLineShot(328)).toBe(328);
  });

  it.each([-1, 657, 1.5, "328", null])("reads %o as no shot", (kept) => {
    expect(readLineShot(kept)).toBeNull();
  });
});

describe.each([
  ["CERTIFICATE_FILES", CERTIFICATE_FILES],
  ["RALLY_LINE_FILES", RALLY_LINE_FILES],
] as const)("%s", (_, token) => {
  it("holds no file but a set's", () => {
    const ids = LEVEL_SETS.map(({ id }) => id);

    const files = TestBed.inject(token);

    expect(Object.keys(files).filter((id) => !ids.includes(id))).toEqual([]);
  });

  it("holds a line for every level of the first set on every depth, each of which reads", async () => {
    const [set] = LEVEL_SETS;
    const levels = LEVELS.filter((entry) => entry.set.id === set?.id);

    const lines = readCertificates(
      await TestBed.inject(token)[set?.id ?? ""]?.(),
      readLineShot,
    );

    expect(levels.map(({ data }) => lines.get(data.id)?.size)).toEqual(
      levels.map(() => DEPTHS.length),
    );
  });
});

describe.each([
  ["CertificatesService", CERTIFICATE_FILES, CertificatesService],
  ["RallyLinesService", RALLY_LINE_FILES, RallyLinesService],
] as const)("%s", (_, token, service) => {
  it("offers the level in play's line on the field's depth", async () => {
    TestBed.configureTestingModule({
      providers: [
        ...provideSpecPlay(),
        { provide: DEBUG_MENU, useValue: true },
        { provide: token, useValue: filesHolding(fieldDepth) },
        service,
      ],
    });
    const lines = TestBed.inject(service);
    await settled();

    expect(lines.offer()).toEqual({
      level: 1,
      depth: fieldDepth(),
      rounds: 2,
    });
  });
});

describe("the lines the game ships", () => {
  /** Returns the service over the game's own files and rounds, once its line for the first level is offered. */
  async function shipped(
    service: typeof CertificatesService | typeof RallyLinesService,
  ): Promise<CertificatesService | RallyLinesService> {
    TestBed.configureTestingModule({
      providers: [
        ...provideSpecPlay(playRound),
        { provide: DEBUG_MENU, useValue: true },
        service,
      ],
    });
    const lines = TestBed.inject(service);
    // The game's own file, a dynamic import, may outlast the settling.
    await vi.waitFor(() => {
      expect(lines.offer()).not.toBeNull();
    });
    return lines;
  }

  it("plays the first level's certificate to its Cleared card", async () => {
    const certificates = await shipped(CertificatesService);
    const game = TestBed.inject(GameService);
    await certificates.play();

    playUntilCard(game);

    expect([game.card(), game.rounds()]).toEqual([
      "cleared",
      certificates.offer()?.rounds,
    ]);
  });

  it("plays the first level's rally line to its rally mark", async () => {
    const rallyLines = await shipped(RallyLinesService);
    const game = TestBed.inject(GameService);
    await rallyLines.play();

    for (let shot = 0; shot < (rallyLines.offer()?.rounds ?? 0); shot++) {
      playRoundOut(game);
    }

    expect(game.bestRally()).toBeGreaterThanOrEqual(game.rallyMark());
  });

  it("keeps a run that plays one off the record", async () => {
    const certificates = await shipped(CertificatesService);

    await certificates.play();

    expect(TestBed.inject(DebugService).runOffRecord()).toBe(true);
  });
});
