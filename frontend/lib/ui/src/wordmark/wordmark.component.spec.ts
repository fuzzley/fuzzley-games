import { Component } from "@angular/core";
import { render, screen } from "@testing-library/angular";
import { WordmarkComponent } from "./wordmark.component";

@Component({
  imports: [WordmarkComponent],
  template: `<a href="/"><fz-wordmark /></a>`,
})
class LinkedWordmarkComponent {}

describe("WordmarkComponent", () => {
  it("names the site", async () => {
    await render(WordmarkComponent);

    expect(screen.getByText("Fuzzley Games")).toBeInTheDocument();
  });

  it("names the link it sits in", async () => {
    await render(LinkedWordmarkComponent);

    expect(screen.getByRole("link", { name: "Fuzzley Games" })).toHaveAttribute(
      "href",
      "/",
    );
  });
});
