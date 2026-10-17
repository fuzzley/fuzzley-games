import { Location } from "@angular/common";
import { provideLocationMocks } from "@angular/common/testing";
import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { Router, provideRouter } from "@angular/router";
import { render, screen } from "@testing-library/angular";
import { type UserEvent, userEvent } from "@testing-library/user-event";
import { provideTestCatalog } from "../../testing/catalog";
import { SiteHeaderComponent } from "./site_header.component";

@Component({ template: "" })
class PageComponent {}

describe("SiteHeaderComponent", () => {
  /** Renders the header, then goes through each address in turn. */
  async function renderAt(...urls: string[]): Promise<UserEvent> {
    const { fixture } = await render(SiteHeaderComponent, {
      providers: [
        provideRouter([
          { path: "", component: PageComponent },
          { path: "category/:id", component: PageComponent },
        ]),
        provideLocationMocks(),
        provideTestCatalog(),
      ],
    });
    const router = TestBed.inject(Router);
    for (const url of urls) await router.navigateByUrl(url);
    await fixture.whenStable();
    return userEvent.setup();
  }

  function path(): string {
    return TestBed.inject(Location).path();
  }

  function searchBox(): HTMLElement {
    return screen.getByRole("searchbox", { name: "Search games" });
  }

  it("offers search as a landmark", async () => {
    await renderAt("/");

    expect(screen.getByRole("search")).toContainElement(searchBox());
  });

  it("shows the search in the address", async () => {
    await renderAt("/?q=klon");

    expect(searchBox()).toHaveValue("klon");
  });

  it("searches as the player types", async () => {
    const user = await renderAt("/");

    await user.type(searchBox(), "klon");

    expect(path()).toBe("/?q=klon");
  });

  it("refines a search on the home page in place, so Back leaves it", async () => {
    const user = await renderAt("/category/solitaire", "/");
    await user.type(searchBox(), "klon");

    TestBed.inject(Location).back();

    expect(path()).toBe("/category/solitaire");
  });

  it("starts a new search from any other page, so Back returns to it", async () => {
    const user = await renderAt("/category/solitaire");
    await user.type(searchBox(), "k");

    TestBed.inject(Location).back();

    expect(path()).toBe("/category/solitaire");
  });

  it("clears the search on Escape", async () => {
    const user = await renderAt("/?q=klon");
    await user.click(searchBox());

    await user.keyboard("{Escape}");

    expect(path()).toBe("/");
  });

  it("links each category", async () => {
    await renderAt("/");

    expect(screen.getByRole("link", { name: "Classics" })).toHaveAttribute(
      "href",
      "/category/classics",
    );
  });

  it("marks the category in view as the current page", async () => {
    await renderAt("/category/solitaire");

    expect(screen.getByRole("link", { name: "Solitaire" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
