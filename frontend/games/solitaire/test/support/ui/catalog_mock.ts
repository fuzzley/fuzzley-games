import { vi } from "vitest";
import { signal, computed } from "@angular/core";
import {
  KLONDIKE_LAYOUT,
  KLONDIKE_ARRANGED_LAYOUTS,
} from "@/games/klondike/klondike_layout";
import { FREECELL_LAYOUT } from "@/games/freecell/freecell_layout";
import { YUKON_LAYOUT } from "@/games/yukon/yukon_layout";
import type { GameOptionSpec } from "@/ui/app/provider/game_catalog";
import type { GameCatalogService } from "@/ui/app/service/game_catalog.service";
import { asGameModel, type MockGameModel } from "./game_mock";

/** The rules the mock catalog offers: Klondike's draw mode and debug board. */
const OPTIONS: readonly GameOptionSpec[] = [
  {
    id: "drawCount",
    label: "Draw Mode",
    description: "Draw 1 is easier.",
    choices: [
      { value: 1, rule: 1, label: "Draw 1" },
      { value: 3, rule: 3, label: "Draw 3" },
    ],
    defaultValue: 3,
  },
  {
    id: "almostWin",
    label: "Almost Win Mode",
    choices: [
      { value: 0, rule: 0, label: "Normal" },
      { value: 1, rule: 1, label: "Almost Win" },
    ],
    defaultValue: 0,
    debugOnly: true,
  },
];

/**
 * Stands in for the catalog service with three games, typed as a `Pick` of it
 * so the mock cannot drift from the real shape: Klondike, arranged with a side
 * pile; Yukon, arranged without one; and FreeCell, standing in for a game that
 * is not arranged.
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
  | "optionValuesFor"
  | "optionSpec"
  | "valueOf"
  | "select"
  | "setOption"
  | "load"
>;

/** Holds the mock catalog and the handles a spec needs to drive it. */
export interface MockCatalogHarness {
  readonly catalog: MockCatalog;
  /** Puts a different dealt game on the table, as re-dealing does. */
  deal(game: MockGameModel): void;
  readonly select: ReturnType<typeof vi.fn<(id: string) => void>>;
  readonly setOption: ReturnType<
    typeof vi.fn<(id: string, value: number) => void>
  >;
  readonly load: ReturnType<
    typeof vi.fn<(id: string, values: Record<string, number>) => void>
  >;
}

/** Builds a mock catalog around one dealt game. */
export function createMockCatalog(model: MockGameModel): MockCatalogHarness {
  const games = [
    {
      id: "klondike",
      name: "Klondike",
      options: OPTIONS,
      layout: KLONDIKE_LAYOUT,
      arrangement: {
        layouts: KLONDIKE_ARRANGED_LAYOUTS,
        pilesName: "stock and foundations",
        sideName: "stock",
      },
    },
    { id: "freecell", name: "FreeCell", options: [], layout: FREECELL_LAYOUT },
    {
      id: "yukon",
      name: "Yukon",
      options: [],
      layout: YUKON_LAYOUT,
      // Klondike's grids stand in, without the side pile Yukon lacks.
      arrangement: {
        layouts: { ...KLONDIKE_ARRANGED_LAYOUTS, side: undefined },
        pilesName: "foundations",
      },
    },
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
  const load = vi.fn((id: string, chosen: Record<string, number>) => {
    selectedId.set(id);
    values.set({ ...values(), ...chosen });
  });

  const catalog = {
    games,
    selectedId: selectedId.asReadonly(),
    session: session.asReadonly(),
    options,
    ruleOptions: computed(() => options().filter((o) => !o.debugOnly)),
    debugOptions: computed(() => options().filter((o) => o.debugOnly)),
    optionValues: computed(() => values()),
    // One store of rules for every game, which is all a spec needs.
    optionValuesFor: () => values(),
    get selectedEntry() {
      return games.find((game) => game.id === selectedId()) ?? games[0];
    },
    optionSpec: (id: string) => options().find((option) => option.id === id),
    valueOf: (id: string) => values()[id] ?? null,
    select,
    setOption,
    load,
  } as unknown as MockCatalog;

  return {
    catalog,
    deal: (game: MockGameModel) => session.set({ game: asGameModel(game) }),
    select,
    setOption,
    load,
  };
}

/** Casts the mock to the service type the UI injects. */
export function asCatalog(mock: MockCatalog): GameCatalogService {
  return mock as unknown as GameCatalogService;
}
