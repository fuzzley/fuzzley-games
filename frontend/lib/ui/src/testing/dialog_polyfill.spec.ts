/** Opens a dialog holding the markup given, and returns what took the focus. */
function focusOnOpening(markup: string): Element | null {
  const dialog = document.createElement("dialog");
  dialog.innerHTML = markup;
  document.body.append(dialog);
  dialog.showModal();
  return document.activeElement;
}

describe("installDialogPolyfill", () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it("focuses the first child the Tab key reaches", () => {
    const focused = focusOnOpening(
      '<h2 tabindex="-1">Title</h2><button>First</button><button>Second</button>',
    );

    expect(focused?.textContent).toBe("First");
  });

  it("focuses what asks for it, even what only a script may focus", () => {
    const focused = focusOnOpening(
      '<button>First</button><h2 tabindex="-1" autofocus>Title</h2>',
    );

    expect(focused?.textContent).toBe("Title");
  });

  it("passes over what asks for the focus but can't take it", () => {
    const focused = focusOnOpening(
      "<p autofocus>Words</p><button>First</button>",
    );

    expect(focused?.textContent).toBe("First");
  });

  it("passes over a disabled control that asks for the focus", () => {
    const focused = focusOnOpening(
      "<button disabled autofocus>Off</button><button>First</button>",
    );

    expect(focused?.textContent).toBe("First");
  });
});
