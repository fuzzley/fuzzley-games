import { TestBed } from "@angular/core/testing";
import { describe, it, expect, beforeEach } from "vitest";
import { AppComponent } from "./app.component";
import { appConfig } from "../../app.config";

describe("AppComponent", () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: appConfig.providers,
    }).compileComponents();
  });

  it("should create the app", () => {
    const fixture = TestBed.createComponent(AppComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
