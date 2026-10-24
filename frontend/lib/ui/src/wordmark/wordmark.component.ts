import { Component } from "@angular/core";

/**
 * Sets the "Fuzzley Games" name in its own type.
 *
 * It is text, not a link: an app puts it in one (`<a routerLink="/">`, or an
 * `href` from a game), which then takes its name from the words.
 */
@Component({
  selector: "fz-wordmark",
  templateUrl: "./wordmark.component.html",
  styleUrl: "./wordmark.component.scss",
})
export class WordmarkComponent {}
