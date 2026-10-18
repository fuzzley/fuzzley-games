import { TAGS, withAnalytics } from "./inject-analytics.mjs";

describe("withAnalytics", () => {
  it("adds the tags just before the page's </head>", () => {
    expect(withAnalytics("<head><title>Game</title></head><body></body>")).toBe(
      `<head><title>Game</title>${TAGS}</head><body></body>`,
    );
  });

  it("finds </head> in any case", () => {
    expect(withAnalytics("<HEAD></HEAD>")).toBe(`<HEAD>${TAGS}</HEAD>`);
  });

  it("leaves a page that already has the tags as it is", () => {
    const tagged = `<head>${TAGS}</head>`;

    expect(withAnalytics(tagged)).toBe(tagged);
  });

  it("refuses a page with no </head> to put them in", () => {
    expect(() => withAnalytics("<body></body>")).toThrow("no </head>");
  });
});
