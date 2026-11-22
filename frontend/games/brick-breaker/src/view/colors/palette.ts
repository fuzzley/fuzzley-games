import {
  FUZZBALL_INKS,
  TILE_INKS,
  colorNumber,
  mixColors,
} from "@fz/phaser/color";
import type { ColorMode } from "@fz/style/themes";
import type { BallKindId } from "../../rules/catalog/balls";
import type { BrickKindId } from "../../rules/catalog/bricks";
import type { CapsuleTone } from "../../rules/catalog/capsules";

/** The palette roles the field is drawn in, as the page sets them, in hex. */
export interface PaletteRoles {
  readonly panel: string;
  readonly text: string;
  readonly accent: string;
  readonly danger: string;
  readonly warning: string;
}

/** The brick kinds drawn in a color of their own, rather than a tint. */
export type UntintedKind = Extract<
  BrickKindId,
  "steel" | "blast" | "gift" | "regrow" | "cage" | "key" | "gate" | "bumper"
>;

/** The inks a brick's marks take beside the marks' own color, mixed as the art kit mixes them. */
export interface KindInks {
  /** A steel brick's frame and rivets: the steel at {@link STEEL_LINE_SHADE} black. */
  readonly steelLine: number;
  /** A blast brick's spark: the warning color. */
  readonly spark: number;
  /** A gift brick's ribbon and bow: the accent at {@link RIBBON_LIGHT} white for the palette's mode. */
  readonly ribbon: number;
  /** A regrowing brick's cap of moss: the green tint at {@link MOSS_LIGHT} white for the palette's mode. */
  readonly moss: number;
  /** The shadow under each scallop of its cap: the green tint at {@link MOSS_SHADE} black. */
  readonly mossShadow: number;
  /** The ring a broken regrowing brick fills as it grows back, and its sprout: the green tint. */
  readonly regrowRing: number;
  /** The track that ring fills along: the green tint at {@link REGROW_TRACK} over the field. */
  readonly regrowTrack: number;
  /** A plated brick's plate along its foot, and the teeth it points down: the steel. */
  readonly plate: number;
  /** The shine along the top of a plate: the steel at {@link PLATE_SHINE} white. */
  readonly plateShine: number;
}

/** The inks a pair of portals is drawn in beside the marks' color, which fills its middle and its badge's disc. */
export interface PortalPairInks {
  /** Its ring: the pair's tint, {@link PORTAL_TINTS}. */
  readonly ring: number;
  /** Its arms and its badge: the ring {@link PORTAL_GLOW} of the way to the text. */
  readonly glyph: number;
}

/** The inks of the field's edge, mixed as the art kit mixes them. */
export interface FieldInks {
  /** The lip at the foot of the rim round the field: the wall at {@link RIM_LIP_SHADE} black. */
  readonly rimLip: number;
  /** The gutter under the paddle, where a ball is lost: the danger color at {@link GUTTER_DANGER} over the field. */
  readonly gutter: number;
  /** The chevrons down the gutter: the danger color at {@link CHEVRON_DANGER} over the field. */
  readonly chevron: number;
}

/** The inks the paddle's parts take beside its body, in the accent, mixed as the art kit mixes them. */
export interface PaddleInks {
  /** Its lip, under its bar, and a cannon's base: the accent at {@link PADDLE_LIP_SHADE} black. */
  readonly lip: number;
  /** The cap at each of its ends: the accent toward the text by {@link CAP_TOWARD_TEXT} for the palette's mode. */
  readonly cap: number;
  /** The pad along its top: the accent at {@link PAD_LIGHT} white. */
  readonly pad: number;
  /** A catching paddle's velcro hooks: the text. */
  readonly hook: number;
  /** A laser's cannons, and the bolts they fire: the warning color. */
  readonly cannon: number;
}

/** The colors a ghost brick takes by its tint, 0 to 7, while it is hidden and once it shows. */
export interface GhostTints {
  /** Each tint at {@link GHOST_FADE} of the field, so a hidden ghost shows faintly. */
  readonly hidden: readonly number[];
  /** Each tint at {@link GHOST_LIGHT} white for the palette's mode, paler than a brick. */
  readonly shown: readonly number[];
}

/** The field's colors, as the numbers Phaser takes. */
export interface BricksPalette {
  /** The field under everything: the `panel` role, as Snake's board is, not `--fz-field`. */
  readonly field: number;
  /**
   * The outline around every ball and capsule, so it stands out from any
   * brick it crosses: the field's color, which every brick keeps 3:1 from.
   */
  readonly outline: number;
  /**
   * The marks a brick's kind and state are told apart by, and a capsule's
   * symbol: the field's color, which every brick and capsule keeps 3:1 from.
   */
  readonly mark: number;
  /** The rim round the field, on its left, its top and its right: text at {@link WALL_WASH}. */
  readonly wall: number;
  /** The frame around each of the last bricks a level needs, once they glow: the text. */
  readonly glow: number;
  /** The serve's guide, its dots and its outline round each brick the serve would meet: the text. */
  readonly guide: number;
  /** The text, which a place's pattern is washed from over the field (`src/view/places/`). */
  readonly text: number;
  /** The paddle's body: the accent. */
  readonly paddle: number;
  /** The inks of the paddle's other parts. */
  readonly paddleInks: PaddleInks;
  readonly balls: Readonly<Record<BallKindId, number>>;
  readonly capsules: Readonly<Record<CapsuleTone, number>>;
  /**
   * The lip each tone of capsule sits on: a good one's its body at
   * {@link CAPSULE_LIP_SHADE} black, and a bad one's gold, the warning
   * color, as it pays double.
   */
  readonly capsuleLips: Readonly<Record<CapsuleTone, number>>;
  /** The shine along a good capsule's top: the accent at {@link CAPSULE_SHINE} white. */
  readonly capsuleShine: number;
  /** The sparks about a normal ball once the streak reaches its top multiplier: the warning color. */
  readonly streakSparks: number;
  /**
   * The inks a friend a cage frees wears, by its ball's `ink`, and the friend
   * a cage holds: {@link FUZZBALL_INKS} of the palette's mode.
   */
  readonly friendInks: readonly number[];
  /**
   * Steel in text at {@link STEEL_WASH}, a blast brick in the danger color, a
   * gift in the accent, a regrowing brick's earth in the amber tint, a cage
   * and a gate in the steel, a key in the warning color, and a bumper in the
   * accent.
   */
  readonly bricks: Readonly<Record<UntintedKind, number>>;
  /** Each pair of portals' inks, by its brick's `pair`: the first's ring violet and the second's teal. */
  readonly portals: readonly PortalPairInks[];
  /** The inks the kinds' marks take beside the marks' own color. */
  readonly kindInks: KindInks;
  /** The colors a brick takes by its tint, 0 to 7: the {@link TILE_INKS} of the palette's mode. */
  readonly tints: readonly number[];
  /** The deeper colors a tough brick takes by its tint: each toward the text by {@link TOUGH_DEEPEN}. */
  readonly toughTints: readonly number[];
  /** The chevrons trailing the lit one a slider shows its heading by, by its tint: each tint at {@link SLIDER_TRAIL} over the marks' color. */
  readonly sliderTrails: readonly number[];
  /** The colors a ghost brick takes by its tint, hidden and shown. */
  readonly ghostTints: GhostTints;
  /** The inks of the field's edge: its rim's lip, and the gutter under the paddle and its chevrons. */
  readonly fieldInks: FieldInks;
}

/** How much of the text the wall takes. */
export const WALL_WASH = 0.2;

/** How much of the text a steel brick takes, enough for 3:1 against the field in every palette. */
export const STEEL_WASH = 0.55;

/** How much of the text a tough brick's tint takes, deepening it away from the field. */
export const TOUGH_DEEPEN = 0.12;

/**
 * How much black a steel brick's frame and rivets take over the steel: the
 * art kit's 0.34 deepened, so they keep 3:1 against the steel in every
 * palette, as a mark that tells a kind does.
 */
export const STEEL_LINE_SHADE = 0.6;

/** How much white a gift's ribbon takes over the accent, in each mode. */
export const RIBBON_LIGHT: Readonly<Record<ColorMode, number>> = {
  light: 0.72,
  dark: 0.62,
};

/** How much white a regrowing brick's cap of moss takes over the green tint, in each mode. */
export const MOSS_LIGHT: Readonly<Record<ColorMode, number>> = {
  light: 0.12,
  dark: 0.3,
};

/** How much black the shadow under the moss's scallops takes over the green tint. */
export const MOSS_SHADE = 0.38;

/** How much black the paddle's lip takes over the accent. */
export const PADDLE_LIP_SHADE = 0.32;

/** How far the paddle's caps move from the accent toward the text, in each mode, so they stand out pale on a dark field and deep on a light one. */
export const CAP_TOWARD_TEXT: Readonly<Record<ColorMode, number>> = {
  light: 0.45,
  dark: 0.6,
};

/** How much white the paddle's pad takes over the accent. */
export const PAD_LIGHT = 0.55;

/** How much black a good capsule's lip takes over its body. */
export const CAPSULE_LIP_SHADE = 0.3;

/** How much white the shine along a good capsule's top takes over the accent. */
export const CAPSULE_SHINE = 0.5;

/** How much white the shine along a plated brick's plate takes over the steel. */
export const PLATE_SHINE = 0.4;

/** How much of the green tint a regrowing brick's ring's track takes over the field. */
export const REGROW_TRACK = 0.3;

/** How much black the lip at the foot of the field's rim takes over the wall. */
export const RIM_LIP_SHADE = 0.3;

/** How much of the danger color the gutter under the paddle takes over the field. */
export const GUTTER_DANGER = 0.1;

/**
 * How much of the danger color the gutter's chevrons take over the field:
 * the art kit's 0.3 deepened, so they keep 2:1 against the gutter in every
 * palette, faint as the gutter is.
 */
export const CHEVRON_DANGER = 0.55;

/**
 * How much of a slider's tint the chevrons trailing its lit one take over
 * the marks' color: the art kit's 0.55 lightened toward the marks, so they
 * keep 2:1 against the slider in every palette, faint as a trail is.
 */
export const SLIDER_TRAIL = 0.45;

/** How much of the field a hidden ghost's tint takes, fading it toward the field. */
export const GHOST_FADE = 0.35;

/**
 * How much white a shown ghost's tint takes, in each mode: the art kit's,
 * but in a light palette 0.12 rather than 0.18, so it keeps 3:1 against
 * Soft pastel's field.
 */
export const GHOST_LIGHT: Readonly<Record<ColorMode, number>> = {
  light: 0.12,
  dark: 0.3,
};

/** The tints each pair of portals' ring takes, by its brick's `pair`: violet, then teal. */
export const PORTAL_TINTS: readonly number[] = [6, 4];

/** How far a portal's arms and badge move from its ring toward the text. */
export const PORTAL_GLOW = 0.34;

/** The tint a regrowing brick's earth takes: amber. */
export const EARTH_TINT = 2;

/** The tint a regrowing brick's moss is mixed from: green. */
export const MOSS_TINT = 3;

const WHITE = 0xffffff;
const BLACK = 0x000000;

/** Returns the field's colors in a palette's roles, with the inks of its mode. */
export function bricksPalette(
  roles: PaletteRoles,
  mode: ColorMode,
): BricksPalette {
  const panel = colorNumber(roles.panel);
  const text = colorNumber(roles.text);
  const accent = colorNumber(roles.accent);
  const danger = colorNumber(roles.danger);
  const warning = colorNumber(roles.warning);
  const tints = TILE_INKS[mode];
  const steel = mixColors(text, panel, STEEL_WASH);
  const green = tintAt(tints, MOSS_TINT);
  const wall = mixColors(text, panel, WALL_WASH);
  return {
    field: panel,
    outline: panel,
    mark: panel,
    wall,
    glow: text,
    guide: text,
    text,
    paddle: accent,
    paddleInks: {
      lip: mixColors(BLACK, accent, PADDLE_LIP_SHADE),
      cap: mixColors(text, accent, CAP_TOWARD_TEXT[mode]),
      pad: mixColors(WHITE, accent, PAD_LIGHT),
      hook: text,
      cannon: warning,
    },
    balls: { normal: text, fire: warning, blast: danger },
    capsules: { good: accent, bad: danger },
    capsuleLips: {
      good: mixColors(BLACK, accent, CAPSULE_LIP_SHADE),
      bad: warning,
    },
    capsuleShine: mixColors(WHITE, accent, CAPSULE_SHINE),
    streakSparks: warning,
    friendInks: FUZZBALL_INKS[mode],
    bricks: {
      steel,
      blast: danger,
      gift: accent,
      regrow: tintAt(tints, EARTH_TINT),
      cage: steel,
      key: warning,
      gate: steel,
      bumper: accent,
    },
    portals: PORTAL_TINTS.map((at) => {
      const ring = tintAt(tints, at);
      return { ring, glyph: mixColors(text, ring, PORTAL_GLOW) };
    }),
    kindInks: {
      steelLine: mixColors(BLACK, steel, STEEL_LINE_SHADE),
      spark: warning,
      ribbon: mixColors(WHITE, accent, RIBBON_LIGHT[mode]),
      moss: mixColors(WHITE, green, MOSS_LIGHT[mode]),
      mossShadow: mixColors(BLACK, green, MOSS_SHADE),
      regrowRing: green,
      regrowTrack: mixColors(green, panel, REGROW_TRACK),
      plate: steel,
      plateShine: mixColors(WHITE, steel, PLATE_SHINE),
    },
    tints,
    toughTints: tints.map((tint) => mixColors(text, tint, TOUGH_DEEPEN)),
    sliderTrails: tints.map((tint) => mixColors(tint, panel, SLIDER_TRAIL)),
    ghostTints: {
      hidden: tints.map((tint) => mixColors(panel, tint, GHOST_FADE)),
      shown: tints.map((tint) => mixColors(WHITE, tint, GHOST_LIGHT[mode])),
    },
    fieldInks: {
      rimLip: mixColors(BLACK, wall, RIM_LIP_SHADE),
      gutter: mixColors(danger, panel, GUTTER_DANGER),
      chevron: mixColors(danger, panel, CHEVRON_DANGER),
    },
  };
}

/** Returns the color at a place in a palette's list of tints, which holds one for every tint a level can name. */
export function tintAt(tints: readonly number[], at: number): number {
  const tint = tints[at];
  if (tint === undefined) throw new Error(`No tint ${String(at)}.`);
  return tint;
}
