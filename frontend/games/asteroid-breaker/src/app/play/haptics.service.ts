import { DOCUMENT } from "@angular/common";
import { Injectable, inject } from "@angular/core";
import type { Buzz } from "../../view/effects/haptics";
import { SettingsService } from "../settings/settings.service";

/** Buzzes the phone as the game asks, where the browser can and the settings say to. */
@Injectable({ providedIn: "root" })
export class HapticsService {
  private readonly settings = inject(SettingsService).settings;
  private readonly navigator = inject(DOCUMENT).defaultView?.navigator;

  /** Buzzes the phone in a pattern, where the browser can and the settings say to. */
  buzz(pattern: Buzz): void {
    const { navigator } = this;
    if (this.settings().haptics && typeof navigator?.vibrate === "function") {
      navigator.vibrate(pattern);
    }
  }
}
