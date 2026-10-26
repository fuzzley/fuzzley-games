import { Component } from "@angular/core";
import { FUZZBALL } from "@fz/style/fuzzball";

/**
 * Sets the "Fuzzley Games" name in its own type, after the fuzzball in the
 * palette's accent.
 *
 * It is text, not a link: an app puts it in one (`<a routerLink="/">`, or an
 * `href` from a game), which then takes its name from the words.
 */
@Component({
  selector: "fz-wordmark",
  templateUrl: "./wordmark.component.html",
  styleUrl: "./wordmark.component.scss",
})
export class WordmarkComponent {
  protected readonly mark = FUZZBALL;
}
