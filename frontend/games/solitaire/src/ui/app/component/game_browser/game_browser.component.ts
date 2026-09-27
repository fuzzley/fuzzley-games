import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from "@angular/core";
import {
  GameOptionSpec,
  GameOptionValues,
  sameOptionValues,
} from "../../provider/game_catalog";
import { GAME_PROFILES } from "../../provider/game_profile_data";
import {
  GameBrowserItem,
  browserItems,
  isPlayedBy,
} from "../../model/game_browser_item";
import {
  DIFFICULTY_LABELS,
  Difficulty,
  difficultyFor,
  difficultyRange,
} from "../../model/game_profile.model";
import {
  GameFilters,
  NO_FILTERS,
  TextSegment,
  hasFilters,
  searchGames,
} from "../../model/game_search";
import { GameBrowserService } from "../../service/game_browser.service";
import { GameCatalogService } from "../../service/game_catalog.service";
import { GameDocumentationService } from "../../service/game_documentation.service";
import { GameLifecycleService } from "../../service/game_lifecycle.service";
import { RecentGamesService } from "../../service/recent_games.service";
import { ViewportService } from "../../service/viewport.service";
import { ModalDialogComponent } from "../modal_dialog/modal_dialog.component";
import { GamePreviewComponent } from "../game_preview/game_preview.component";

/** How many recent games the list shows. */
const RECENT_SHOWN = 4;

/**
 * How many recent games there must be before the list shows them, since the
 * one game on the table is already marked in its family.
 */
const RECENT_MIN = 2;

/** How long typing must pause before the result count is announced. */
const ANNOUNCE_DELAY_MS = 500;

/** Describes one row of the browser's list. */
interface BrowserRow {
  /** The row's element id, distinct even for a game listed twice. */
  readonly id: string;
  readonly item: GameBrowserItem;
  /** The rules the row deals its game by. */
  readonly values: GameOptionValues;
  /** Whether it is listed as a recent game, by the rules it was played by. */
  readonly recent: boolean;
  readonly nameSegments: readonly TextSegment[];
  /** The rules a recent row was played by, such as "Draw 1". */
  readonly rules: string;
  readonly difficulty: string;
  /** Which of the three difficulty dots are filled. */
  readonly dots: readonly boolean[];
  readonly playing: boolean;
  /** The id of the element holding the tagline, which describes the row. */
  readonly taglineId: string;
  /** What a screen reader calls the row. */
  readonly label: string;
}

/** Describes a titled run of rows. */
interface BrowserSection {
  readonly id: string;
  readonly headingId: string;
  readonly name: string;
  readonly rows: readonly BrowserRow[];
}

/** Describes one filter a player can turn on or off. */
interface FilterChip {
  readonly label: string;
  readonly pressed: boolean;
  readonly toggle: () => void;
}

/**
 * Lets the player find a game by name or by what it is like, see it before
 * dealing it, and play it.
 *
 * Focus stays in the search field while the arrow keys move through the list
 * and the preview follows. On a narrow screen the preview is a page of its
 * own, reached by tapping a game.
 */
@Component({
  selector: "app-game-browser",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalDialogComponent, GamePreviewComponent],
  templateUrl: "./game_browser.component.html",
  styleUrl: "./game_browser.component.scss",
})
export class GameBrowserComponent {
  protected readonly browser = inject(GameBrowserService);
  protected readonly viewport = inject(ViewportService);
  private readonly catalog = inject(GameCatalogService);
  private readonly lifecycle = inject(GameLifecycleService);
  private readonly recentGames = inject(RecentGamesService);
  private readonly docs = inject(GameDocumentationService);
  private readonly profiles = inject(GAME_PROFILES);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  /** Every game the browser offers, in the order it lists them. */
  private readonly items = browserItems(this.catalog.games, this.profiles);

  protected readonly placeholder = `Search ${this.items.length} games`;

  protected readonly query = signal("");
  protected readonly filters = signal<GameFilters>(NO_FILTERS);

  /** The row the player moved to, or null for the first. */
  private readonly activeId = signal<string | null>(null);

  /** Whether a narrow screen is showing the preview rather than the list. */
  protected readonly showingDetail = signal(false);

  /** The count of games found, read out once the player stops typing. */
  protected readonly announcement = signal("");

  private readonly preview = viewChild(GamePreviewComponent);
  private readonly heading =
    viewChild.required<ElementRef<HTMLHeadingElement>>("heading");

  /** Whether any filter is on. */
  protected readonly filtering = computed(() => hasFilters(this.filters()));

  /** Whether the search or the filters are narrowing the list. */
  protected readonly narrowing = computed(
    () => this.query().trim() !== "" || this.filtering(),
  );

  /**
   * The list: the matches of a search, best first; or else the recent games
   * and then every game family by family.
   */
  protected readonly sections = computed<readonly BrowserSection[]>(() => {
    const query = this.query();
    const results = searchGames(this.items, query, this.filters());
    if (query.trim() !== "") {
      const rows = results.map((result) =>
        this.row(`match-${result.item.key}`, result.item, result.nameSegments),
      );
      return rows.length > 0 ? [section("matches", "Best matches", rows)] : [];
    }

    const recent = this.filtering() ? [] : this.recentRows();
    const families = this.profiles.families.map((family) =>
      section(
        family.id,
        family.name,
        results
          .filter((result) => result.item.family.id === family.id)
          .map((result) =>
            this.row(
              `game-${result.item.key}`,
              result.item,
              result.nameSegments,
            ),
          ),
      ),
    );
    return [
      ...(recent.length >= RECENT_MIN
        ? [section("recent", "Recent", recent)]
        : []),
      ...families.filter((family) => family.rows.length > 0),
    ];
  });

  /** Every row, in the order the arrow keys move through them. */
  private readonly rows = computed(() =>
    this.sections().flatMap((s) => s.rows),
  );

  /** The row the preview shows, which Enter plays. */
  protected readonly activeRow = computed<BrowserRow | null>(() => {
    const rows = this.rows();
    return rows.find((row) => row.id === this.activeId()) ?? rows[0] ?? null;
  });

  /** The rules the active game lets the player choose before dealing it. */
  protected readonly activeOptions = computed<readonly GameOptionSpec[]>(() => {
    const item = this.activeRow()?.item;
    if (!item) return [];
    return this.optionsOf(item.gameId).filter(
      (option) => !option.debugOnly && !(option.id in item.pinned),
    );
  });

  /** How the active game plays, from its rules page. */
  protected readonly activeOverview = computed(() => {
    const item = this.activeRow()?.item;
    return item ? this.overviewOf(item) : "";
  });

  /** The filters, grouped by facet. */
  protected readonly filterGroups = computed<readonly FilterChip[][]>(() => {
    const filters = this.filters();
    return [
      Object.values(Difficulty).map((level) => ({
        label: DIFFICULTY_LABELS[level],
        pressed: filters.difficulties.includes(level),
        toggle: () =>
          this.updateFilters((f) => ({
            ...f,
            difficulties: toggled(f.difficulties, level),
          })),
      })),
      [1, 2].map((decks) => ({
        label: decks === 1 ? "1 deck" : "2 decks",
        pressed: filters.decks.includes(decks),
        toggle: () =>
          this.updateFilters((f) => ({ ...f, decks: toggled(f.decks, decks) })),
      })),
      [
        {
          label: "All cards visible",
          pressed: filters.allCardsVisible,
          toggle: () =>
            this.updateFilters((f) => ({
              ...f,
              allCardsVisible: !f.allCardsVisible,
            })),
        },
      ],
    ];
  });

  /** What the list says when nothing is in it. */
  protected readonly emptyMessage = computed(() =>
    this.query().trim() !== ""
      ? `No games match “${this.query().trim()}”.`
      : "No games match these filters.",
  );

  constructor() {
    // Open on the game on the table, with the search cleared. The filters
    // stay as they were left.
    effect(() => {
      if (!this.browser.isOpen()) return;
      untracked(() => {
        this.query.set("");
        this.showingDetail.set(false);
        const playing = this.rows().find((row) => row.playing && !row.recent);
        this.activeId.set(playing?.id ?? null);
      });
    });

    // Say how many games were found once typing pauses, and nothing while
    // the whole list shows.
    effect((onCleanup) => {
      const count = this.rows().filter((row) => !row.recent).length;
      const text = !this.narrowing()
        ? ""
        : count === 0
          ? "No games match."
          : `${count} ${count === 1 ? "game" : "games"}.`;
      const timer = setTimeout(
        () => this.announcement.set(text),
        ANNOUNCE_DELAY_MS,
      );
      onCleanup(() => clearTimeout(timer));
    });
  }

  /** Searches for the given text, moving back to the best match. */
  protected setQuery(query: string): void {
    this.query.set(query);
    this.activeId.set(null);
  }

  /** Turns off every filter and clears the search. */
  protected clearAll(): void {
    this.filters.set(NO_FILTERS);
    this.setQuery("");
  }

  /** Turns off every filter. */
  protected clearFilters(): void {
    this.updateFilters(() => NO_FILTERS);
  }

  /** Moves through the list, plays the active game, or clears the search. */
  protected onSearchKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case "ArrowDown":
        this.moveActive(1);
        break;
      case "ArrowUp":
        this.moveActive(-1);
        break;
      case "Enter": {
        const row = this.activeRow();
        if (row) void this.play(row, row.values);
        break;
      }
      case "Escape":
        // A first Escape clears the search, and only a second closes.
        if (this.query() === "") return;
        this.setQuery("");
        event.stopPropagation();
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  /**
   * Shows a row in the preview, which a narrow screen does as a page of its
   * own.
   */
  protected select(row: BrowserRow): void {
    this.activeId.set(row.id);
    if (!this.viewport.isCompact()) return;

    this.showingDetail.set(true);
    afterNextRender(() => this.preview()?.focusTitle(), {
      injector: this.injector,
    });
  }

  /** Goes back from a narrow screen's preview to the list. */
  protected back(): void {
    this.showingDetail.set(false);
    afterNextRender(() => this.heading().nativeElement.focus(), {
      injector: this.injector,
    });
  }

  /**
   * Handles Escape or a click outside, which from a narrow screen's preview
   * goes back to the list rather than closing.
   */
  protected onCloseRequest(): void {
    if (this.showingDetail()) {
      this.back();
      return;
    }
    this.browser.close();
  }

  /** Deals a row's game by the given rules, closing once it is dealt. */
  protected async play(
    row: BrowserRow,
    values: GameOptionValues,
  ): Promise<void> {
    const played = await this.lifecycle.playGame(
      row.item.gameId,
      values,
      row.item.name,
    );
    if (played) this.browser.close();
  }

  /** Opens the full rules of a row's game over the browser. */
  protected showRules(row: BrowserRow): void {
    this.docs.openHelp(row.item.gameId);
  }

  /** Changes the filters, moving back to the best match. */
  private updateFilters(change: (filters: GameFilters) => GameFilters): void {
    this.filters.update(change);
    this.activeId.set(null);
  }

  /** Moves the active row by a step, stopping at either end. */
  private moveActive(step: number): void {
    const rows = this.rows();
    const index = rows.findIndex((row) => row.id === this.activeRow()?.id);
    const next = rows[Math.min(rows.length - 1, Math.max(0, index + step))];
    if (!next) return;

    this.activeId.set(next.id);
    afterNextRender(
      () => {
        this.host.nativeElement
          .querySelector(`#${next.id}`)
          ?.scrollIntoView({ block: "nearest" });
      },
      { injector: this.injector },
    );
  }

  /** Returns the rows of the games played most recently. */
  private recentRows(): BrowserRow[] {
    return this.recentGames
      .games()
      .slice(0, RECENT_SHOWN)
      .flatMap((game, index) => {
        const item = this.items.find((i) =>
          isPlayedBy(i, game.gameId, game.values),
        );
        return item ? [this.row(`recent-${index}`, item, [], game.values)] : [];
      });
  }

  /**
   * Returns a row of the list: a game dealt by its pinned rules and the
   * player's other choices or, for a recent game, by the rules it was
   * played by.
   */
  private row(
    id: string,
    item: GameBrowserItem,
    nameSegments: readonly TextSegment[],
    remembered?: GameOptionValues,
  ): BrowserRow {
    const recent = remembered !== undefined;
    const values = remembered ?? {
      ...this.catalog.optionValuesFor(item.gameId),
      ...item.pinned,
    };
    const onTable = this.catalog.selectedId();
    const playing = recent
      ? item.gameId === onTable &&
        sameOptionValues(values, this.catalog.optionValues())
      : isPlayedBy(item, onTable, this.catalog.optionValues());
    // A recent game was played by known rules; any other spans its rules.
    const exact = difficultyFor(item.difficulty, values);
    const [easiest, hardest] = recent
      ? ([exact, exact] as const)
      : difficultyRange(item.difficulty);
    const difficulty =
      easiest === hardest
        ? DIFFICULTY_LABELS[hardest]
        : `${DIFFICULTY_LABELS[easiest]}–${DIFFICULTY_LABELS[hardest]}`;
    const rules = recent ? this.rulesOf(item, values) : "";
    const elementId = `game-browser-${id}`;
    return {
      id: elementId,
      item,
      values,
      recent,
      nameSegments:
        nameSegments.length > 0
          ? nameSegments
          : [{ text: item.name, match: false }],
      rules,
      difficulty,
      dots: Object.values(Difficulty).map((level) => level <= hardest),
      playing,
      taglineId: `${elementId}-tagline`,
      label: [
        item.name,
        item.parentName ? `variant of ${item.parentName}` : "",
        rules,
        difficulty,
        item.decks === 2 ? "2 decks" : "",
        playing ? "playing now" : "",
      ]
        .filter(Boolean)
        .join(", "),
    };
  }

  /** Names the rules a row deals by that its game lets the player choose. */
  private rulesOf(item: GameBrowserItem, values: GameOptionValues): string {
    return this.optionsOf(item.gameId)
      .filter((option) => !option.debugOnly && !(option.id in item.pinned))
      .flatMap((option) => {
        const choice = option.choices.find(
          (c) => c.value === values[option.id],
        );
        return choice ? [choice.label] : [];
      })
      .join(" · ");
  }

  /** Returns the rules a game offers. */
  private optionsOf(gameId: string): readonly GameOptionSpec[] {
    return (
      this.catalog.games.find((entry) => entry.id === gameId)?.options ?? []
    );
  }

  /**
   * Returns how a game plays: a named variant's own explanation from its
   * game's rules page, or else the page's overview.
   */
  private overviewOf(item: GameBrowserItem): string {
    const doc = this.docs.getDocumentation(item.gameId);
    if (!doc) return item.tagline;
    if (item.parentName) {
      for (const [optionId, value] of Object.entries(item.pinned)) {
        const explanation = doc.settingsAndVariants
          .find((option) => option.optionId === optionId)
          ?.choicesExplanation.find((choice) => choice.value === value);
        if (explanation) return explanation.effect;
      }
    }
    return doc.summary.quickOverview;
  }
}

/** Returns a list with a value added if it was missing, or removed if not. */
function toggled<T>(list: readonly T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

/** Returns a titled run of rows. */
function section(
  id: string,
  name: string,
  rows: readonly BrowserRow[],
): BrowserSection {
  return { id, headingId: `game-browser-section-${id}`, name, rows };
}
