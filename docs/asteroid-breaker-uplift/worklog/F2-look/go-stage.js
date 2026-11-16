async () => {
  // Goes on with the kept run, the pod left waiting (untouchable), then logs
  // F2's events through the field's own logger at and about the pod, 0.8 s
  // apart: a knock (twice, 0.4 s apart, past the flash's gap), one
  // recaught, static stepping up, a burr popped and three shaken off, a
  // vent and a piece shed. Last it dashes, which zaps only at full static;
  // static had drained below full by then in every sitting, which showed a
  // plain dash. Needs the dev server, for `ng`.
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
  const BEAT = 800;
  at(100, (e, f) => e.addKnocked(x, y, 2, f.crew, 1, 0.3));
  at(500, (e, f) => e.addKnocked(x, y, 1, f.crew, -1, 0.3));
  at(100 + BEAT, (e, f) => e.addPilot("recaught", x + 3, y + 3, 2, f.crew));
  at(100 + 2 * BEAT, (e) => e.addStep(x, y, 2, false));
  at(100 + 3 * BEAT, (e) => {
    e.addBurr("popped", x - 4, y - 3);
    e.addShaken(x, y, 0, 3);
  });
  at(100 + 4 * BEAT, (e) => {
    e.addRock(
      "vented",
      { x: x + 6, y: y - 4, kind: "stormheart", size: "boulder", slot: 0 },
      6,
    );
    e.addRock("shed", {
      x: x - 6,
      y: y + 4,
      kind: "iron",
      size: "medium",
      slot: 1,
    });
  });
  setTimeout(
    () => {
      send("keydown", "ShiftLeft", "Shift");
      setTimeout(() => send("keyup", "ShiftLeft", "Shift"), 40);
    },
    100 + 5 * BEAT,
  );
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
