import { vi } from "vitest";
import { signal, computed } from "@angular/core";
import { KLONDIKE_LAYOUT } from "@/games/klondike/klondike_layout";
import { FREECELL_LAYOUT } from "@/games/freecell/freecell_layout";
import type { GameOptionSpec } from "@/ui/app/provider/game_catalog";
import type { GameCatalogService } from "@/ui/app/service/game_catalog.service";
import { asGameModel, type MockGameModel } from "./game_mock";

/**
 * The rules the mock catalog offers.
 *
 * Klondike's — a draw mode and a debug board — since that is the game whose
 * controls the shell specs exercise.
 */
const OPTIONS: readonly GameOptionSpec[] = [
  {
    id: "drawCount",
    label: "Draw Mode",
    description: "Draw 1 is easier.",
    choices: [
      { value: 1, label: "Draw 1" },
      { value: 3, label: "Draw 3" },
    ],
    defaultValue: 3,
  },
  {
    id: "almostWin",
    label: "Almost Win Mode",
    choices: [
      { value: 0, label: "Normal" },
      { value: 1, label: "Almost Win" },
    ],
    defaultValue: 0,
    debugOnly: true,
  },
];

/**
 * A catalog holding two games, for specs that care what the UI does with a
 * catalog rather than which games are in the real one.
 *
 * Typed as a `Pick` of the real service, so a member the UI starts using — or
 * one that changes shape — fails to compile here rather than reading as
 * `undefined` at runtime. That is not hypothetical: `selectedEntry` was added
 * to the service and missed here, and the game canvas read a layout off
 * nothing for as long as no spec happened to render it.
 */
export type MockCatalog = Pick<
  GameCatalogService,
  | "games"
  | "selectedId"
  | "selectedEntry"
  | "session"
  | "options"
  | "ruleOptions"
  | "debugOptions"
  | "optionValues"
  | "optionSpec"
  | "valueOf"
  | "select"
  | "setOption"
>;

/** The mock, plus the handles a spec needs to drive it. */
export interface MockCatalogHarness {
  readonly catalog: MockCatalog;
  /** Puts a different dealt game on the table, as re-dealing does. */
  deal(game: MockGameModel): void;
  readonly select: ReturnType<typeof vi.fn>;
  readonly setOption: ReturnType<typeof vi.fn>;
}

/** Builds a mock catalog around one dealt game. */
export function createMockCatalog(model: MockGameModel): MockCatalogHarness {
  const games = [
    {
      id: "klondike",
      name: "Klondike",
      options: OPTIONS,
      layout: KLONDIKE_LAYOUT,
    },
    { id: "freecell", name: "FreeCell", options: [], layout: FREECELL_LAYOUT },
  ];

  const selectedId = signal("klondike");
  const session = signal({ game: asGameModel(model) });
  const values = signal<Record<string, number>>({ drawCount: 3, almostWin: 0 });
  const options = computed(
    () => games.find((game) => game.id === selectedId())?.options ?? [],
  );

  const select = vi.fn((id: string) => {
    selectedId.set(id);
  });
  const setOption = vi.fn((id: string, value: number) => {
    values.set({ ...values(), [id]: value });
  });

  const catalog = {
    games,
    selectedId: selectedId.asReadonly(),
    session: session.asReadonly(),
    options,
    ruleOptions: computed(() => options().filter((o) => !o.debugOnly)),
    debugOptions: computed(() => options().filter((o) => o.debugOnly)),
    optionValues: computed(() => values()),
    get selectedEntry() {
      return games.find((game) => game.id === selectedId()) ?? games[0];
    },
    optionSpec: (id: string) => options().find((option) => option.id === id),
    valueOf: (id: string) => values()[id] ?? null,
    select,
    setOption,
  } as unknown as MockCatalog;

  return {
    catalog,
    deal: (game: MockGameModel) => session.set({ game: asGameModel(game) }),
    select,
    setOption,
  };
}

/** Casts the mock to the service type the UI injects. */
export function asCatalog(mock: MockCatalog): GameCatalogService {
  return mock as unknown as GameCatalogService;
}
