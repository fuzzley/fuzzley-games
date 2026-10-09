import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  resource,
} from "@angular/core";
import { GameCatalogService } from "../../service/game_catalog.service";
import { GameLifecycleService } from "../../service/game_lifecycle.service";
import { TABLE_THEMES, THEME_KEYS, ThemeKey } from "../../model/table_theme";
import { GameDocumentationService } from "../../service/game_documentation.service";
import { BugReportService } from "../../service/bug_report.service";
import {
  CardStyle,
  PresentationSettingsService,
} from "../../service/presentation_settings.service";
import {
  AUTO_ARRANGEMENTS,
  OrAuto,
  PilePosition,
  StockSide,
} from "@/engine/render/layout/board_layouts";
import { FormFactor } from "@/engine/render/layout/form_factor";
import { GameOptionChoice, GameOptionSpec } from "../../provider/game_catalog";
import {
  DESKTOP_CARD_DECKS,
  DesktopCardDeckSpec,
} from "@/engine/render/card_deck";
import {
  CARD_BACKS,
  CardBackSpec,
  CardBackStyle,
} from "@/engine/render/card_back";
import { DebugPanelComponent } from "../debug_panel/debug_panel.component";
import { OptionGroupComponent } from "../option_group/option_group.component";
import { ModalDialogComponent } from "../modal_dialog/modal_dialog.component";
import { RadioGroupDirective } from "../../directive/radio_group.directive";

/** Describes one card back a player can choose, resolved for rendering. */
interface CardBackChoice extends CardBackSpec {
  readonly selected: boolean;
  /** The class that draws its preview. */
  readonly patternClass: string;
}

/** The class that draws each card back's preview. */
const CARD_BACK_PATTERNS: Record<CardBackStyle, string> = {
  "card-back-blue": "lattice-blue",
  "card-back-red": "lattice-red",
  "card-back-classic-blue": "weave-blue",
  "card-back-classic-red": "weave-red",
};

/** Describes one card in a deck's preview, as a fan would leave it showing. */
interface CardDeckPreviewCard {
  /** The index the strip shows, and what the card is tracked by. */
  readonly rank: string;
  /** Where the strip sits in the preview's viewBox. */
  readonly x: number;
  /** Whether this deck marks this card in its top right corner. */
  readonly hasPip: boolean;
}

/** Describes one desktop deck a player can choose, resolved for rendering. */
interface CardDeckChoice extends DesktopCardDeckSpec {
  readonly selected: boolean;
  /** Whether the board is still fetching this deck's artwork. */
  readonly pending: boolean;
  readonly preview: readonly CardDeckPreviewCard[];
}

/**
 * The two cards every deck preview shows: a court and a spot card, which
 * together tell the three decks apart.
 */
const PREVIEW_CARDS: readonly { rank: string; x: number; court: boolean }[] = [
  { rank: "K", x: 0, court: true },
  { rank: "7", x: 72, court: false },
];

/** The card style a player starts on. */
const AUTO_CARD_STYLE: GameOptionChoice<CardStyle> = {
  value: 0,
  rule: "auto",
  label: "Auto",
  description:
    "Mobile cards on a phone, upright or on its side; desktop cards on a larger screen.",
};

/**
 * The card styles on offer, in the order they are shown, each known to the
 * option group by its number.
 */
const CARD_STYLE_CHOICES: readonly GameOptionChoice<CardStyle>[] = [
  AUTO_CARD_STYLE,
  {
    value: 1,
    rule: "mobile",
    label: "Mobile",
    description: "A big rank and suit and no artwork, on every screen.",
  },
  {
    value: 2,
    rule: "desktop",
    label: "Desktop",
    description:
      "The card artwork, with the pips chosen below, on every screen.",
  },
];

/**
 * Leaving where the piles go to the screen, which a player starts with. It is
 * described by what it picks, which depends on the screen.
 */
const AUTO_PILES: GameOptionChoice<OrAuto<PilePosition>> = {
  value: 0,
  rule: "auto",
  label: "Auto",
};

/**
 * The places the piles can go, in the order shown, each described in the
 * game's own words by {@link pilesDescription}.
 */
const PILES_CHOICES: readonly GameOptionChoice<OrAuto<PilePosition>>[] = [
  AUTO_PILES,
  { value: 1, rule: "top", label: "Top" },
  { value: 2, rule: "bottom", label: "Bottom" },
];

/** Returns what putting a game's piles at the top or the bottom does. */
function pilesDescription(position: PilePosition, pilesName: string): string {
  return position === "top"
    ? `The ${pilesName} along the top, or at the top of a sideways phone's rails.`
    : `The ${pilesName} along the bottom, under your thumb, or at the foot of a sideways phone's rails.`;
}

/**
 * Leaving the stock's side to the screen, which a player starts with,
 * described like {@link AUTO_PILES}.
 */
const AUTO_STOCK_SIDE: GameOptionChoice<OrAuto<StockSide>> = {
  value: 0,
  rule: "auto",
  label: "Auto",
};

/**
 * The sides the stock, or the pile standing in for it, can go on, in the order
 * shown.
 */
const STOCK_SIDE_CHOICES: readonly GameOptionChoice<OrAuto<StockSide>>[] = [
  AUTO_STOCK_SIDE,
  { value: 1, rule: "left", label: "Left" },
  { value: 2, rule: "right", label: "Right" },
];

/** Returns a name as a label, each word starting with a capital. */
function titleCase(name: string): string {
  return name.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/**
 * Returns what Auto does with a part of the board's arrangement: what it picks
 * on a phone and on a larger screen, and so what it picks on this screen.
 *
 * @param picks What Auto picks on a shape of screen.
 */
function autoDescription<T>(
  choices: readonly GameOptionChoice<T>[],
  picks: (formFactor: FormFactor) => T,
  here: T,
): string {
  const label = (rule: T) =>
    choices.find((choice) => choice.rule === rule)?.label ?? String(rule);
  return (
    `${label(picks("phone-portrait"))} on a phone, upright or on its side, ` +
    `and ${label(picks("roomy"))} on a larger screen: ${label(here)} here.`
  );
}

/** Describes one table felt swatch, resolved for rendering. */
interface ThemeSwatch {
  readonly key: ThemeKey;
  readonly name: string;
  readonly color: string;
  readonly selected: boolean;
}

/**
 * Offers the running game's rules, the card back, style, deck and felt, and
 * links to the rules page and a bug report.
 */
@Component({
  selector: "app-settings-drawer",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DebugPanelComponent,
    OptionGroupComponent,
    ModalDialogComponent,
    RadioGroupDirective,
  ],
  templateUrl: "./settings_drawer.component.html",
  styleUrl: "./settings_drawer.component.scss",
})
export class SettingsDrawerComponent {
  protected readonly catalog = inject(GameCatalogService);
  private readonly lifecycle = inject(GameLifecycleService);

  protected readonly presentation = inject(PresentationSettingsService);
  private readonly docService = inject(GameDocumentationService);
  private readonly bugReport = inject(BugReportService);

  /** Whether this is a development build, which shows the debug panel. */
  protected readonly isDevMode = import.meta.env.DEV;

  /** Title of the game currently active. */
  protected readonly activeGameTitle = computed(
    () => this.docService.activeGameDoc()?.title ?? "Solitaire",
  );

  /** The card backs on offer, with the chosen one marked. */
  protected readonly cardBackChoices = computed<readonly CardBackChoice[]>(
    () => {
      const selected = this.presentation.cardBackStyle();
      return CARD_BACKS.map((back) => ({
        ...back,
        selected: back.style === selected,
        patternClass: CARD_BACK_PATTERNS[back.style],
      }));
    },
  );

  /**
   * How the game on the table may be arranged: where its piles go is offered
   * for a game with arranged grids, on every screen.
   */
  private readonly arrangement = computed(
    () => this.catalog.selectedEntry.arrangement,
  );

  /** Whether the game on the table has grids for every arrangement. */
  protected readonly hasArrangedGrids = computed(
    () => this.arrangement() !== undefined,
  );

  /**
   * What the game on the table calls its side pile, when it has one, which is
   * when the side setting is offered.
   */
  protected readonly sideName = computed(() => this.arrangement()?.sideName);

  /** Where the piles go, as checked. */
  protected readonly pilesChoice = computed(
    () =>
      PILES_CHOICES.find(
        (choice) => choice.rule === this.presentation.piles(),
      ) ?? AUTO_PILES,
  );

  /** Where the piles go, offered like a rule, described by the choice checked. */
  protected readonly pilesOption = computed<
    GameOptionSpec<OrAuto<PilePosition>>
  >(() => ({
    id: "piles",
    label: "Piles",
    description: this.describePiles(this.pilesChoice().rule),
    choices: PILES_CHOICES,
    defaultValue: AUTO_PILES.value,
  }));

  /** The stock's side, as checked. */
  protected readonly stockSideChoice = computed(
    () =>
      STOCK_SIDE_CHOICES.find(
        (choice) => choice.rule === this.presentation.stockSide(),
      ) ?? AUTO_STOCK_SIDE,
  );

  /** The stock's side, offered like a rule, described by the choice checked. */
  protected readonly stockSideOption = computed<
    GameOptionSpec<OrAuto<StockSide>>
  >(() => ({
    id: "stockSide",
    label: `${titleCase(this.sideName() ?? "stock")} Side`,
    description: this.describeSide(this.stockSideChoice().rule),
    choices: STOCK_SIDE_CHOICES,
    defaultValue: AUTO_STOCK_SIDE.value,
  }));

  /** The card style that is checked. */
  protected readonly cardStyleChoice = computed(
    () =>
      CARD_STYLE_CHOICES.find(
        (choice) => choice.rule === this.presentation.cardStyle(),
      ) ?? AUTO_CARD_STYLE,
  );

  /** The card style, offered like a rule, described by the style checked. */
  protected readonly cardStyleOption = computed<GameOptionSpec<CardStyle>>(
    () => ({
      id: "cardStyle",
      label: "Card Style",
      description: this.cardStyleChoice().description,
      choices: CARD_STYLE_CHOICES,
      defaultValue: AUTO_CARD_STYLE.value,
    }),
  );

  /**
   * The desktop decks on offer, with the chosen one marked and its preview
   * resolved.
   */
  protected readonly deckChoices = computed<readonly CardDeckChoice[]>(() => {
    const selected = this.presentation.desktopCardDeck();
    const pending = this.presentation.pendingCardDeck();
    return DESKTOP_CARD_DECKS.map((deck) => ({
      ...deck,
      selected: deck.id === selected,
      pending: deck.id === pending,
      preview: PREVIEW_CARDS.map((card) => ({
        rank: card.rank,
        x: card.x,
        hasPip:
          deck.pipCoverage === "all" ||
          (deck.pipCoverage === "courts" && card.court),
      })),
    }));
  });

  /** The felt swatches, with the chosen one marked. */
  protected readonly themeSwatches = computed<readonly ThemeSwatch[]>(() => {
    const selected = this.presentation.theme();
    return THEME_KEYS.map((key) => ({
      key,
      name: TABLE_THEMES[key].name,
      color: TABLE_THEMES[key].color,
      selected: key === selected,
    }));
  });

  /** The name of the felt currently on the table. */
  protected readonly selectedThemeName = computed(
    () => TABLE_THEMES[this.presentation.theme()].name,
  );

  /** Whether the side settings drawer is visible. */
  readonly open = input<boolean>(false);

  /**
   * The bug report link, rebuilt each time the drawer opens and whenever
   * something it describes changes while open.
   */
  private readonly bugReportLink = resource({
    params: () => (this.open() ? this.bugReport.draft() : undefined),
    loader: ({ params }) => this.bugReport.issueUrl(params),
  });

  /** Where "Report a Bug" leads, once the link is ready. */
  protected readonly bugReportUrl = computed(() =>
    this.bugReportLink.hasValue() ? this.bugReportLink.value() : null,
  );

  /**
   * Emitted when the player asks to close the drawer; not `close`, which would
   * be confused with the native DOM event.
   */
  readonly closed = output();

  protected openRules(): void {
    this.closed.emit();
    this.docService.openHelp();
  }

  /**
   * Plays the current game by a different rule, dealt afresh after the prompt
   * that changing one raises.
   */
  protected chooseRule(optionId: string, value: number): void {
    void this.lifecycle.setRuleOption(optionId, value);
  }

  /** Returns what a choice of where the piles go does, in the game's words. */
  private describePiles(rule: OrAuto<PilePosition>): string {
    return rule === "auto"
      ? autoDescription(
          PILES_CHOICES,
          (formFactor) => AUTO_ARRANGEMENTS[formFactor].piles,
          this.presentation.resolvedArrangement().piles,
        )
      : pilesDescription(rule, this.arrangement()?.pilesName ?? "piles");
  }

  /** Returns what a choice of the side pile's side does, in the game's words. */
  private describeSide(rule: OrAuto<StockSide>): string {
    return rule === "auto"
      ? autoDescription(
          STOCK_SIDE_CHOICES,
          (formFactor) => AUTO_ARRANGEMENTS[formFactor].stockSide,
          this.presentation.resolvedArrangement().stockSide,
        )
      : `The ${this.sideName() ?? "stock"} at the ${rule} of the table.`;
  }

  /** Puts the piles where the option group handed back. */
  protected choosePiles(value: number): void {
    const choice = PILES_CHOICES.find((piles) => piles.value === value);
    if (choice) this.presentation.setPiles(choice.rule);
  }

  /** Puts the side pile on the side the option group handed back. */
  protected chooseStockSide(value: number): void {
    const choice = STOCK_SIDE_CHOICES.find((side) => side.value === value);
    if (choice) this.presentation.setStockSide(choice.rule);
  }

  /** Draws the cards in the style the option group handed back. */
  protected chooseCardStyle(value: number): void {
    const choice = CARD_STYLE_CHOICES.find((style) => style.value === value);
    if (choice) this.presentation.setCardStyle(choice.rule);
  }
}
