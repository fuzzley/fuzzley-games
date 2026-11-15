async () => {
  // Goes on with the kept run and holds the gun down, once the board is drawn.
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  let board = document.querySelector("app-board");
  for (let i = 0; i < 100 && !board?.querySelector("canvas"); i++) {
    await wait(100);
    board = document.querySelector("app-board");
  }
  await wait(1500);
  const send = (type, code, key) =>
    board.dispatchEvent(new KeyboardEvent(type, { code, key, bubbles: true }));
  send("keydown", "Enter", "Enter");
  send("keyup", "Enter", "Enter");
  await wait(300);
  send("keydown", "Space", " ");
  await wait(1000);
  const c = board.querySelector("canvas");
  return {
    w: c.width,
    h: c.height,
    paused: !!document.querySelector("app-board-card, [role=dialog]"),
  };
};
