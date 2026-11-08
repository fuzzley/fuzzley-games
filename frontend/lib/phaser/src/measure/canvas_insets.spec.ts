import { type Insets, NO_INSETS } from "../insets";
import { CANVAS_INSET_PROPERTIES, canvasInsetsOf } from "./canvas_insets";

/** Returns an element of the page that declares the insets given, by edge. */
function declaring(insets: Partial<Record<keyof Insets, string>>): HTMLElement {
  const element = document.createElement("div");
  const { top, right, bottom, left } = CANVAS_INSET_PROPERTIES;
  element.style.setProperty(top, insets.top ?? "");
  element.style.setProperty(right, insets.right ?? "");
  element.style.setProperty(bottom, insets.bottom ?? "");
  element.style.setProperty(left, insets.left ?? "");
  document.body.append(element);
  return element;
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("canvasInsetsOf", () => {
  it("reads the inset an element declares on every edge", () => {
    const element = declaring({
      top: "1px",
      right: "2px",
      bottom: "3.5px",
      left: "4px",
    });

    expect(canvasInsetsOf(element)).toEqual({
      top: 1,
      right: 2,
      bottom: 3.5,
      left: 4,
    });
  });

  it("reads an inset the element takes from around it", () => {
    const parent = declaring({ top: "73px" });
    const element = document.createElement("div");
    parent.append(element);

    expect(canvasInsetsOf(element).top).toBe(73);
  });

  it("reads no inset on an edge the element declares none for", () => {
    const element = declaring({ left: "64px" });

    expect(canvasInsetsOf(element)).toEqual({ ...NO_INSETS, left: 64 });
  });

  it("reads no inset that isn't a number", () => {
    const element = declaring({ top: "auto" });

    expect(canvasInsetsOf(element).top).toBe(0);
  });

  it("reads no inset in a document with no window", () => {
    const detached = document.implementation.createHTMLDocument();
    const element = detached.createElement("div");
    element.style.setProperty(CANVAS_INSET_PROPERTIES.top, "73px");

    expect(canvasInsetsOf(element)).toEqual(NO_INSETS);
  });
});
