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
  CardBackStyle,
  CardStyle,
  PresentationSettingsService,
} from "../../service/presentation_settings.service";
import { ViewportService } from "../../service/viewport.service";
import { Hand, PhonePilePosition } from "@/engine/render/layout/board_layouts";
import { GameOptionChoice, GameOptionSpec } from "../../provider/game_catalog";
import {
  DESKTOP_CARD_DECKS,
  DesktopCardDeckSpec,
} from "@/engine/render/card_deck";
import { DebugPanelComponent } from "../debug_panel/debug_panel.component";
import { OptionGroupComponent } from "../option_group/option_group.component";
import { ModalDialogComponent } from "../modal_dialog/modal_dialog.component";
import { RadioGroupDirective } from "../../directive/radio_group.directive";

/** Describes one card back a player can choose, and how to preview it. */
interface CardBackDesign {
  readonly style: CardBackStyle;
  readonly label: string;
  readonly patternClass: string;
}

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

/** Where an upright phone puts the piles that are not columns, first. */
const PILES_BELOW: GameOptionChoice<PhonePilePosition> = {
  value: 0,
  rule: "bottom",
  label: "Piles Below",
  description: "The stock and foundations along the bottom, under your thumb.",
};

/** The places an upright phone can put the piles, in the order shown. */
const PHONE_PILE_CHOICES: readonly GameOptionChoice<PhonePilePosition>[] = [
  PILES_BELOW,
  {
    value: 1,
    rule: "top",
    label: "Piles Above",
    description:
      "The stock and foundations above the columns, as on a larger screen.",
  },
];

/** The hand a player starts with. */
const RIGHT_HAND: GameOptionChoice<Hand> = {
  value: 0,
  rule: "right",
  label: "Right Hand",
  description: "The table as it is usually laid out.",
};

/** The hands on offer, in the order shown. */
const HAND_CHOICES: readonly GameOptionChoice<Hand>[] = [
  RIGHT_HAND,
  {
    value: 1,
    rule: "left",
    label: "Left Hand",
    description: "The table mirrored, with the stock on the other side.",
  },
];

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
  private readonly viewport = inject(ViewportService);
  private readonly docService = inject(GameDocumentationService);
  private readonly bugReport = inject(BugReportService);

  /** Whether this is a development build, which shows the debug panel. */
  protected readonly isDevMode = import.meta.env.DEV;

  /** Title of the game currently active. */
  protected readonly activeGameTitle = computed(
    () => this.docService.activeGameDoc()?.title ?? "Solitaire",
  );

  /** The card backs on offer. */
  protected readonly cardBackDesigns: readonly CardBackDesign[] = [
    {
      style: "card-back-blue",
      label: "Classic Blue",
      patternClass: "blue-pattern",
    },
    {
      style: "card-back-red",
      label: "Royal Red",
      patternClass: "red-pattern",
    },
  ];

  /** Whether the game on the table has grids of its own for a phone. */
  protected readonly hasPhoneGrids = computed(
    () => this.catalog.selectedEntry.phoneLayouts !== undefined,
  );

  /**
   * Whether to offer where an upright phone puts the piles: on a phone, in a
   * game with phone grids.
   */
  protected readonly offersPhonePiles = computed(
    () => this.hasPhoneGrids() && this.viewport.isCompact(),
  );

  /** Where an upright phone puts the piles, as checked. */
  protected readonly phonePilesChoice = computed(
    () =>
      PHONE_PILE_CHOICES.find(
        (choice) => choice.rule === this.presentation.phonePiles(),
      ) ?? PILES_BELOW,
  );

  /** Where an upright phone puts the piles, offered like a rule. */
  protected readonly phonePilesOption = computed<
    GameOptionSpec<PhonePilePosition>
  >(() => ({
    id: "phonePiles",
    label: "Upright Phone Layout",
    description: this.phonePilesChoice().description,
    choices: PHONE_PILE_CHOICES,
    defaultValue: PILES_BELOW.value,
  }));

  /** The hand the table is laid out for, as checked. */
  protected readonly handChoice = computed(
    () =>
      HAND_CHOICES.find((choice) => choice.rule === this.presentation.hand()) ??
      RIGHT_HAND,
  );

  /** The hand the table is laid out for, offered like a rule. */
  protected readonly handOption = computed<GameOptionSpec<Hand>>(() => ({
    id: "hand",
    label: "Layout For",
    description: this.handChoice().description,
    choices: HAND_CHOICES,
    defaultValue: RIGHT_HAND.value,
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

  /** Puts an upright phone's piles where the option group handed back. */
  protected choosePhonePiles(value: number): void {
    const choice = PHONE_PILE_CHOICES.find((pile) => pile.value === value);
    if (choice) this.presentation.setPhonePiles(choice.rule);
  }

  /** Lays the table out for the hand the option group handed back. */
  protected chooseHand(value: number): void {
    const choice = HAND_CHOICES.find((hand) => hand.value === value);
    if (choice) this.presentation.setHand(choice.rule);
  }

  /** Draws the cards in the style the option group handed back. */
  protected chooseCardStyle(value: number): void {
    const choice = CARD_STYLE_CHOICES.find((style) => style.value === value);
    if (choice) this.presentation.setCardStyle(choice.rule);
  }
}
