async () => {
  // Goes on with the kept run, at full static, holds the gun and thrusts for 0.7 s, then dashes, which zaps.
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
  send("keydown", "ArrowUp", "ArrowUp");
  await wait(700);
  send("keydown", "ShiftLeft", "Shift");
  await wait(40);
  send("keyup", "ShiftLeft", "Shift");
};
