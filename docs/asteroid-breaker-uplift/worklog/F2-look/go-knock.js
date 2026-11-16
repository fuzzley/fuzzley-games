async () => {
  // Goes on with the kept run, the pod left waiting, and logs a knock at the
  // pod every 0.4 s, past the flash's gap. Needs the dev server, for `ng`.
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  let board = document.querySelector("app-board");
  for (let i = 0; i < 150 && !board?.querySelector("canvas"); i++) {
    await wait(100);
    board = document.querySelector("app-board");
  }
  await wait(1500);
  const send = (type, code, key) =>
    board.dispatchEvent(new KeyboardEvent(type, { code, key, bubbles: true }));
  send("keydown", "Enter", "Enter");
  send("keyup", "Enter", "Enter");
  await wait(500);
  const game = window.ng.getComponent(board).game;
  const field = () => game.wavePlay.field;
  const { x, y } = field().ship;
  const { width, height } = field().torus;
  const at = (ms, act) =>
    setTimeout(() => {
      const f = field();
      act(f.events, f);
    }, ms);
  at(100, (e, f) => e.addKnocked(x, y, 2, f.crew, 1, 0.3));
  at(500, (e, f) => e.addKnocked(x, y, 2, f.crew, -1, 0.3));
  at(900, (e, f) => e.addKnocked(x, y, 2, f.crew, 1, 0.3));
  at(1300, (e, f) => e.addKnocked(x, y, 2, f.crew, -1, 0.3));
  at(1700, (e, f) => e.addKnocked(x, y, 2, f.crew, 1, 0.3));
  at(2100, (e, f) => e.addKnocked(x, y, 2, f.crew, -1, 0.3));
  at(2500, (e, f) => e.addKnocked(x, y, 2, f.crew, 1, 0.3));
  at(2900, (e, f) => e.addKnocked(x, y, 2, f.crew, -1, 0.3));
  const canvas = board.querySelector("canvas").getBoundingClientRect();
  return {
    ship: { x, y },
    torus: { width, height },
    canvas: {
      left: canvas.left,
      top: canvas.top,
      width: canvas.width,
      height: canvas.height,
    },
    screen: {
      x: Math.round(canvas.left + (x / width) * canvas.width),
      y: Math.round(canvas.top + (y / height) * canvas.height),
    },
  };
};
