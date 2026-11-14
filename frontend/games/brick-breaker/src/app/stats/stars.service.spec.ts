import { TestBed } from "@angular/core/testing";
import { MemoryStorage, provideMemoryStorage } from "@fz/ui/testing";
import { STAR } from "../../rules/run/stars";
import { provideSpecLevels } from "../../testing/play";
import { PROGRESS_KEY } from "./progress.service";
import { STARS_KEY, StarsService } from "./stars.service";

/** What the player's browser keeps, empty for each test. */
let storage: MemoryStorage;

/** Starts the app's services afresh over what the browser keeps. */
function startOver(): void {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [provideMemoryStorage(storage), ...provideSpecLevels()],
  });
}

beforeEach(() => {
  storage = new MemoryStorage();
  startOver();
});

/** Stores an entry under a key as a player's browser would hold it. */
function store(key: string, value: unknown): void {
  storage.setItem(key, JSON.stringify(value));
}

describe("StarsService", () => {
  it("holds no star for a new player", () => {
    const stars = TestBed.inject(StarsService);

    expect(stars.heldBy("blasts")).toEqual([]);
  });

  it("reads the stars stored, by level", () => {
    store(STARS_KEY, {
      version: 1,
      levels: { blasts: STAR.clear | STAR.streak, steel: STAR.clear },
    });

    const stars = TestBed.inject(StarsService);

    expect([stars.heldBy("blasts"), stars.heldBy("steel")]).toEqual([
      ["clear", "streak"],
      ["clear"],
    ]);
  });

  it("gives a level cleared before stars were kept its first star", () => {
    store(PROGRESS_KEY, { version: 1, cleared: ["steel"] });

    const stars = TestBed.inject(StarsService);

    expect(stars.heldBy("steel")).toEqual(["clear"]);
  });

  it("reads stars kept in another shape as none", () => {
    store(STARS_KEY, { version: 2, levels: { blasts: STAR.clear } });

    const stars = TestBed.inject(StarsService);

    expect(stars.heldBy("blasts")).toEqual([]);
  });

  it("keeps the stars a level's play won for the next visit", () => {
    TestBed.inject(StarsService).recordWon("blasts", STAR.clear | STAR.clean);

    startOver();

    expect(TestBed.inject(StarsService).heldBy("blasts")).toEqual([
      "clear",
      "clean",
    ]);
  });

  it("returns the stars a play won that the level didn't hold before", () => {
    const stars = TestBed.inject(StarsService);
    stars.recordWon("blasts", STAR.clear | STAR.clean);

    const won = stars.recordWon("blasts", STAR.clear | STAR.streak);

    expect(won).toEqual(["streak"]);
  });

  it("keeps a star won for good, whatever a later play wins", () => {
    const stars = TestBed.inject(StarsService);
    stars.recordWon("blasts", STAR.clear | STAR.clean);

    stars.recordWon("blasts", STAR.clear);

    expect(stars.heldBy("blasts")).toEqual(["clear", "clean"]);
  });
});
