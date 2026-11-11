import {
  Component,
  ErrorHandler,
  InjectionToken,
  type Type,
  ViewContainerRef,
  inject,
  input,
  inputBinding,
  output,
  outputBinding,
  signal,
  viewChild,
} from "@angular/core";
import type { ComponentFixture } from "@angular/core/testing";
import { render, screen } from "@testing-library/angular";
import { userEvent } from "@testing-library/user-event";
import { onDemand } from "./on_demand";

/** Counts the components a spec's host has had made. */
interface Made {
  count: number;
}

/** Where `<app-loaded>` counts itself as it is made. */
const MADE = new InjectionToken<Made>("MADE");

/** Loads the component a spec's host puts on demand. */
const LOAD = new InjectionToken<() => Promise<Type<unknown>>>("LOAD");

/** Shows its words on a button, and says when it is pressed. */
@Component({
  selector: "app-loaded",
  template: `<button type="button" (click)="pressed.emit()">
    {{ words() }}
  </button>`,
})
class LoadedComponent {
  readonly words = input.required<string>();
  readonly pressed = output();

  constructor() {
    inject(MADE).count += 1;
  }
}

/** Puts what `LOAD` loads on demand, its words bound to a signal and its presses counted. */
@Component({ template: `<ng-container #host />` })
class HostComponent {
  readonly words = signal("Loaded");
  readonly presses = signal(0);
  private readonly host = viewChild.required("host", {
    read: ViewContainerRef,
  });
  readonly show = onDemand(inject(LOAD), () => this.host(), [
    inputBinding("words", this.words),
    outputBinding("pressed", () => {
      this.presses.update((presses) => presses + 1);
    }),
  ]);
}

/** What a spec gets back from rendering the host. */
interface RenderedHost {
  readonly fixture: ComponentFixture<HostComponent>;
  readonly show: () => Promise<void>;
  readonly made: Made;
  /** What reached the app's `ErrorHandler`. */
  readonly reported: readonly unknown[];
}

/** Returns a load that hands over `<app-loaded>` once a timer has run, as a chunk fetched does. */
function slowLoad(): Promise<Type<unknown>> {
  return new Promise((resolve) => setTimeout(resolve, 10, LoadedComponent));
}

/** Renders the host, loading through `load`. */
async function renderHost(
  load: () => Promise<Type<unknown>> = slowLoad,
): Promise<RenderedHost> {
  const made: Made = { count: 0 };
  const reported: unknown[] = [];
  const { fixture } = await render(HostComponent, {
    providers: [
      { provide: LOAD, useValue: load },
      { provide: MADE, useValue: made },
      {
        provide: ErrorHandler,
        useValue: {
          handleError: (error: unknown) => {
            reported.push(error);
          },
        },
      },
    ],
  });
  return { fixture, show: fixture.componentInstance.show, made, reported };
}

/** Renders the host and has it show what it loads, once the page has settled. */
async function shownHost(): Promise<RenderedHost> {
  const host = await renderHost();
  await host.show();
  await host.fixture.whenStable();
  return host;
}

describe("onDemand", () => {
  it("creates nothing until it is first asked for", async () => {
    await renderHost();

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("creates the component once asked for, with its inputs bound", async () => {
    await shownHost();

    expect(screen.getByRole("button", { name: "Loaded" })).toBeVisible();
  });

  it("keeps its inputs bound as they change", async () => {
    const { fixture } = await shownHost();

    fixture.componentInstance.words.set("Changed");
    await fixture.whenStable();

    expect(screen.getByRole("button", { name: "Changed" })).toBeVisible();
  });

  it("hands on what its outputs emit", async () => {
    const { fixture } = await shownHost();

    await userEvent.setup().click(screen.getByRole("button"));

    expect(fixture.componentInstance.presses()).toBe(1);
  });

  it("loads and creates it once, however often it is asked for", async () => {
    const { fixture, show } = await renderHost();

    await Promise.all([show(), show()]);
    await show();
    await fixture.whenStable();

    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("keeps the page from settling until the component is created", async () => {
    const { fixture, show } = await renderHost();

    void show();
    await fixture.whenStable();

    expect(screen.getByRole("button", { name: "Loaded" })).toBeVisible();
  });

  it("hands a load that failed to the app's error handler, creating nothing", async () => {
    const offline = new Error("Offline");
    const { show, made, reported } = await renderHost(() =>
      Promise.reject(offline),
    );

    await show();

    expect({ made: made.count, reported }).toEqual({
      made: 0,
      reported: [offline],
    });
  });

  it("tries a load that failed again at the next ask", async () => {
    const load = vi
      .fn<() => Promise<Type<unknown>>>()
      .mockRejectedValueOnce(new Error("Offline"))
      .mockImplementation(slowLoad);
    const { fixture, show } = await renderHost(load);
    await show();

    await show();
    await fixture.whenStable();

    expect(screen.getByRole("button", { name: "Loaded" })).toBeVisible();
  });

  it("creates nothing once the component it was asked from has gone", async () => {
    const { fixture, show, made, reported } = await renderHost();
    const showing = show();

    fixture.destroy();
    await showing;

    expect({ made: made.count, reported }).toEqual({ made: 0, reported: [] });
  });
});
