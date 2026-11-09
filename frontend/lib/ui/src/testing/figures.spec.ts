import { figure, figureValue, figures } from "./figures";

/** Puts markup on the page until the test finishes, and returns its element. */
function show(html: string): HTMLElement {
  const shown = document.createElement("div");
  shown.innerHTML = html;
  document.body.append(shown);
  onTestFinished(() => {
    shown.remove();
  });
  return shown;
}

/** A bar's figures, a value's text broken over lines as a template breaks it. */
const BAR = `
  <dl>
    <dt>Score</dt><dd> 1,250 </dd>
    <dt>Mines</dt><dd>3
      / 10</dd>
  </dl>`;

describe("figure", () => {
  it("reads a figure's value by its term, as it reads", () => {
    show(BAR);

    expect([figure("Score"), figure("Mines")]).toEqual(["1,250", "3 / 10"]);
  });

  it("reads within an element, leaving the rest of the page alone", () => {
    show(BAR);
    const card = show("<dl><dt>Score</dt><dd>90</dd></dl>");

    expect(figure("Score", card)).toBe("90");
  });

  it("throws for a term not shown", () => {
    show(BAR);

    expect(() => figure("Best")).toThrow("No figure Best shown.");
  });

  it("throws for a term with no value after it", () => {
    show("<dl><dt>Best</dt></dl>");

    expect(() => figure("Best")).toThrow("No value for the figure Best.");
  });

  it("throws for a term another term follows, rather than reading it", () => {
    show("<dl><dt>Best</dt><dt>Score</dt><dd>90</dd></dl>");

    expect(() => figure("Best")).toThrow("No value for the figure Best.");
  });
});

describe("figureValue", () => {
  it("finds the element that gives a figure's value", () => {
    show(BAR);

    expect(figureValue("Mines")).toHaveTextContent("3 / 10");
  });
});

describe("figures", () => {
  it("reads every figure, each as its term and its value, in order", () => {
    show(BAR);

    expect(figures()).toEqual([
      ["Score", "1,250"],
      ["Mines", "3 / 10"],
    ]);
  });

  it("reads within an element", () => {
    show(BAR);
    const card = show("<dl><dt>Best</dt><dd>90</dd></dl>");

    expect(figures(card)).toEqual([["Best", "90"]]);
  });

  it("throws for a term with no value after it", () => {
    show("<dl><dt>Best</dt></dl>");

    expect(() => figures()).toThrow("No value for the figure Best.");
  });

  it("throws for a term another term follows, rather than reading it", () => {
    show("<dl><dt>Best</dt><dt>Score</dt><dd>90</dd></dl>");

    expect(() => figures()).toThrow("No value for the figure Best.");
  });
});
