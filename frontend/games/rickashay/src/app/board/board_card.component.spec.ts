import { installFakeViewport } from "@fz/game-ui/testing";
import { render, screen, within } from "@testing-library/angular";
import { userEvent } from "@testing-library/user-event";
import type { Pictures } from "../../scene/pictures";
import {
  type BoardCard,
  BoardCardComponent,
  type ClearedCard,
  type ReadyCard,
} from "./board_card.component";

/** A level waiting for its first shot, which brings in the tough brick. */
const READY: ReadyCard = {
  kind: "ready",
  level: 4,
  name: "Pips",
  around: "The first tough bricks, as chimney walls",
  par: 8,
  mark: 24,
  newKind: "tough",
};

/** A level cleared within par but short of its rally mark. */
const CLEARED: ClearedCard = {
  kind: "cleared",
  level: 2,
  rounds: 7,
  par: 9,
  mark: 24,
  stars: { cleared: true, par: true, mark: false },
  bestRally: 14,
  points: { strikes: 1240, bounces: 100, jumps: 0, stars: 400 },
  score: 3640,
};

/** The pictures of the drawn kinds and the springs, as the scene hands them. */
const PICTURES: Pictures = {
  bricks: { brick: "data:image/png;brick", tough: "data:image/png;tough" },
  springs: { off: "data:image/png;off", on: "data:image/png;on" },
};

/** What a card's buttons emitted, in order. */
type Emitted = "resumeRun" | "nextLevel" | "tryAgain" | "newGame";

/** Renders a card, the pictures given, and returns what its buttons emit. */
async function renderCard(
  card: BoardCard | null,
  {
    pictures = null,
    restoring = false,
  }: {
    readonly pictures?: Pictures | null;
    readonly restoring?: boolean;
  } = {},
): Promise<Emitted[]> {
  const emitted: Emitted[] = [];
  await render(BoardCardComponent, {
    inputs: { card, pictures, restoring },
    on: {
      resumeRun: () => emitted.push("resumeRun"),
      nextLevel: () => emitted.push("nextLevel"),
      tryAgain: () => emitted.push("tryAgain"),
      newGame: () => emitted.push("newGame"),
    },
  });
  return emitted;
}

/** Returns each line of a card's figures, its name and its value. */
function figuresIn(group: HTMLElement): string[][] {
  return within(group)
    .getAllByRole("term")
    .map((term) => [
      term.textContent.trim(),
      term.nextElementSibling?.textContent.trim() ?? "",
    ]);
}

describe("BoardCardComponent", () => {
  describe("Ready", () => {
    it("names the level, says what its wall is built around, and gives its par and its rally mark", async () => {
      await renderCard(READY);

      const card = screen.getByRole("group", { name: "Level 4: Pips" });

      expect([
        within(card).getByText("The first tough bricks, as chimney walls."),
        figuresIn(card),
      ]).toEqual([
        expect.anything(),
        [
          ["Par", "8 shots"],
          ["Rally mark", "24"],
        ],
      ]);
    });

    it("says what the kind of brick the level brings in does", async () => {
      await renderCard(READY);

      expect(
        screen.getByText("New: Tough brick.").parentElement,
      ).toHaveTextContent(
        "New: Tough brick. Takes 2 to 6 strikes. The pips show how many are left.",
      );
    });

    it("shows the new kind's picture once the scene has drawn it", async () => {
      await renderCard(READY, { pictures: PICTURES });

      expect(
        screen.getByRole("group").querySelector("img")?.getAttribute("src"),
      ).toBe("data:image/png;tough");
    });

    it("shows no picture of a new kind before the scene has drawn one", async () => {
      await renderCard(READY);

      expect(screen.getByRole("group").querySelector("img")).toBeNull();
    });

    it("says nothing new where the level brings no kind in", async () => {
      await renderCard({ ...READY, newKind: null });

      expect(screen.queryByText(/^New:/)).toBeNull();
    });

    it("asks for the phone upright, for a bigger board, on a phone on its side", async () => {
      installFakeViewport(800, 380).setCoarsePointer(true);

      await renderCard(READY);

      expect(
        screen.getByText("Turn your phone upright for a bigger board."),
      ).toBeInTheDocument();
    });
  });

  describe("Paused", () => {
    it("says the score, and Resume goes on with the level", async () => {
      const emitted = await renderCard({ kind: "paused", score: 1640 });
      const card = screen.getByRole("group", { name: "Paused" });

      await userEvent.click(
        within(card).getByRole("button", { name: "Resume" }),
      );

      expect([within(card).getByText("Score 1,640"), emitted]).toEqual([
        expect.anything(),
        ["resumeRun"],
      ]);
    });
  });

  describe("Cleared", () => {
    it("names each of the three stars, the one missed said so", async () => {
      await renderCard(CLEARED);

      expect(
        within(screen.getByRole("list"))
          .getAllByRole("listitem")
          .map((star) => star.textContent.replace(/\s+/g, " ").trim()),
      ).toEqual(["Cleared", "Within 9 shots", "Missed: A rally of 24"]);
    });

    it("says how many stars it earned, since they are pictures", async () => {
      await renderCard(CLEARED);

      expect(screen.getByText("2 of 3 stars")).toBeInTheDocument();
    });

    it("gives the shots against par, the best rally and how the points added up", async () => {
      await renderCard(CLEARED);

      expect(
        figuresIn(screen.getByRole("group", { name: "Level 2 cleared!" })),
      ).toEqual([
        ["Shots", "7, par 9"],
        ["Best rally", "14"],
        ["Strikes", "1,240"],
        ["Floor bounces", "100"],
        ["Jumps", "0"],
        ["Stars", "400"],
      ]);
    });

    it("says the score, and Next level goes on", async () => {
      const emitted = await renderCard(CLEARED);

      await userEvent.click(screen.getByRole("button", { name: "Next level" }));

      expect([screen.getByText("Score 3,640"), emitted]).toEqual([
        expect.anything(),
        ["nextLevel"],
      ]);
    });
  });

  describe("Ended", () => {
    it("says where a lost run was lost, and tries the level again", async () => {
      const emitted = await renderCard({
        kind: "ended",
        outcome: "over",
        level: 3,
        name: "Columns",
        score: 1240,
      });
      const card = screen.getByRole("group", { name: "Game over" });

      await userEvent.click(
        within(card).getByRole("button", { name: "Try again from level 3" }),
      );

      expect([
        within(card).getByText("Lost on level 3, Columns"),
        emitted,
      ]).toEqual([expect.anything(), ["tryAgain"]]);
    });

    it("starts a new game once every level is cleared", async () => {
      const emitted = await renderCard({
        kind: "ended",
        outcome: "won",
        score: 9120,
      });

      await userEvent.click(screen.getByRole("button", { name: "New game" }));

      expect(emitted).toEqual(["newGame"]);
    });
  });

  it("says the board is being restored in place of any card", async () => {
    await renderCard(READY, { restoring: true });

    expect(
      screen.getByRole("group", { name: "Graphics stopped" }),
    ).toBeInTheDocument();
  });

  it("shows no card of its own when handed none", async () => {
    await renderCard(null);

    expect(screen.queryByRole("group")).toBeNull();
  });
});
