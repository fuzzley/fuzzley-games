import { GAMES } from "./game_catalog";
import { hasThumbnail, thumbnailFor } from "./game_thumbnails";

describe("thumbnails", () => {
  it("draws a thumbnail for every game still to come", () => {
    GAMES.filter((game) => !game.play).forEach((game) => {
      expect(hasThumbnail(game.slug), game.slug).toBe(true);
      expect(thumbnailFor(game.slug).shapes.length, game.slug).toBeGreaterThan(
        0,
      );
    });
  });
});
