import {
  type ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from "@angular/core";
import {
  TitleStrategy,
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
} from "@angular/router";
import { routes } from "./routes";
import { SiteTitleStrategy } from "./service/site_title.strategy";

/**
 * The app's providers.
 *
 * Change detection is zoneless, Angular's default, which works because every
 * component reads signals.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: "enabled" }),
    ),
    { provide: TitleStrategy, useClass: SiteTitleStrategy },
  ],
};
