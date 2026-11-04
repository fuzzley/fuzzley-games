import { Component, computed, inject, input, output } from "@angular/core";
import { formatPoints } from "@fz/core/format";
import { DialogComponent } from "@fz/ui/dialog";
import { IconComponent } from "@fz/ui/icon";
import { sectorSpans } from "../../rules/progress";
import { GameService } from "../play/game.service";
import { ProgressService } from "../stats/progress.service";
import { StatsService } from "../stats/stats.service";
import { GAME_WAVES } from "../tokens";

/** Describes a sector as the dialog offers it. */
interface SectorChoice {
  readonly id: string;
  readonly name: string;
  readonly firstWave: number;
  /** The waves it holds, as its tile says them. */
  readonly waves: string;
  /** Whether the wave on the board is one of its. */
  readonly current: boolean;
  /** Whether a run may start there. */
  readonly open: boolean;
  /** What its tile says under its waves: "Locked", its best at the speed in play, or nothing. */
  readonly status: string | null;
}

/**
 * Shows the Sectors dialog: each sector as a button, with its name, its
 * waves and its best at the speed in play, and the run's own marked.
 *
 * Choosing an open one starts a run at its first wave, asking first if one
 * is under way, and closes the dialog once it has; backing out leaves it
 * open. A sector not yet reached is shown, locked, and can't be chosen.
 */
@Component({
  selector: "app-sectors",
  imports: [DialogComponent, IconComponent],
  templateUrl: "./sectors.component.html",
  styleUrl: "./sectors.component.scss",
})
export class SectorsComponent {
  private readonly game = inject(GameService);
  private readonly spans = sectorSpans(inject(GAME_WAVES));
  private readonly progress = inject(ProgressService);
  private readonly stats = inject(StatsService);

  /** Whether the dialog is showing. */
  readonly open = input.required<boolean>();

  /** Emitted when the dialog asks to close, or has started a run. */
  readonly closed = output();

  protected readonly sectors = computed<readonly SectorChoice[]>(() => {
    const current = this.game.wave().sector.id;
    const speed = this.game.speed();
    const bests = this.stats.stats().sectors;
    return this.spans.map(({ id, name, firstWave, lastWave }) => {
      const open = this.progress.isOpen(id);
      const best = bests[id]?.[speed];
      return {
        id,
        name,
        firstWave,
        waves: wavesInWords(firstWave, lastWave),
        current: id === current,
        open,
        status: statusOf(open, best),
      };
    });
  });

  /** Starts a run at an open sector, asking first if one is under way, and closes once it has. */
  protected async choose(sector: SectorChoice): Promise<void> {
    if (!sector.open) return;
    if (await this.game.startAt(sector.firstWave)) this.closed.emit();
  }
}

/** Returns what a sector's tile says under its waves, or null for nothing. */
function statusOf(open: boolean, best: number | undefined): string | null {
  if (!open) return "Locked";
  return best === undefined ? null : `Best ${formatPoints(best)}`;
}

/** Returns the waves a sector holds, in words: "Waves 1 to 5", or "Wave 6" for one. */
function wavesInWords(first: number, last: number): string {
  return first === last
    ? `Wave ${String(first)}`
    : `Waves ${String(first)} to ${String(last)}`;
}
