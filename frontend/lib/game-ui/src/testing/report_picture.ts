import type { Provider } from "@angular/core";
import { REPORT_PICTURE } from "../bug_report/tokens";

/**
 * Takes every bug report's picture as `picture`, none unless given, in
 * place of the page's, which snapdom can't draw in jsdom and spends long
 * enough failing to time a spec out. A game that takes reports gives it to
 * each test in its setup file.
 */
export function provideReportPicture(picture: Blob | null = null): Provider {
  return { provide: REPORT_PICTURE, useValue: () => Promise.resolve(picture) };
}
