import { ApplicationRef, Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { render } from "@testing-library/angular";
import { DialogComponent } from "./dialog.component";
import { DialogService } from "./dialog.service";

/** Hosts two dialogs as an app does, the second only while it is shown. */
@Component({
  selector: "fz-test-dialogs-host",
  imports: [DialogComponent],
  template: `
    <fz-dialog label="Settings" [open]="settingsOpen()" />
    @if (helpShown()) {
      <fz-dialog label="How to play" [open]="helpOpen()" />
    }
  `,
})
class DialogsHostComponent {
  readonly settingsOpen = signal(false);
  readonly helpOpen = signal(false);
  readonly helpShown = signal(true);
}

describe("DialogService", () => {
  /** Renders the host with its dialogs shut, and returns it. */
  async function renderHost(): Promise<DialogsHostComponent> {
    const { fixture } = await render(DialogsHostComponent);
    return fixture.componentInstance;
  }

  /** Lets the host's change reach its dialogs' inputs. */
  async function settle(): Promise<void> {
    await TestBed.inject(ApplicationRef).whenStable();
  }

  /** Returns what the service says of the page's dialogs. */
  function anyOpen(): boolean {
    return TestBed.inject(DialogService).anyOpen();
  }

  it("says none is open in a page without a dialog", () => {
    expect(anyOpen()).toBe(false);
  });

  it("says none is open while every dialog is shut", async () => {
    await renderHost();

    expect(anyOpen()).toBe(false);
  });

  it("says one is open while a dialog's host holds it open", async () => {
    const host = await renderHost();

    host.settingsOpen.set(true);
    await settle();

    expect(anyOpen()).toBe(true);
  });

  it("says none is open once the last open dialog shuts", async () => {
    const host = await renderHost();
    host.settingsOpen.set(true);
    host.helpOpen.set(true);
    await settle();

    host.settingsOpen.set(false);
    host.helpOpen.set(false);
    await settle();

    expect(anyOpen()).toBe(false);
  });

  it("says one is still open while another of the open dialogs shuts", async () => {
    const host = await renderHost();
    host.settingsOpen.set(true);
    host.helpOpen.set(true);
    await settle();

    host.settingsOpen.set(false);
    await settle();

    expect(anyOpen()).toBe(true);
  });

  it("stops counting a dialog that leaves the page while open", async () => {
    const host = await renderHost();
    host.helpOpen.set(true);
    await settle();

    host.helpShown.set(false);
    await settle();

    expect(anyOpen()).toBe(false);
  });
});
