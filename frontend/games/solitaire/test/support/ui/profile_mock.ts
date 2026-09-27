import {
  Difficulty,
  type GameProfileRegistry,
} from "@/ui/app/model/game_profile.model";

/**
 * Profiles for the two games the mock catalog offers, in place of the real
 * ones so no spec breaks when a tagline is reworded.
 *
 * Klondike's draw mode decides its difficulty, and it has one named variant,
 * which fixes the debug rule so that the draw mode stays the player's choice.
 * FreeCell has every card in view.
 */
export const TEST_PROFILES: GameProfileRegistry = {
  families: [
    { id: "builders", name: "Test builders", description: "They build." },
    { id: "cells", name: "Test cells", description: "They park cards." },
  ],
  games: {
    klondike: {
      family: "builders",
      tagline: "A test tagline.",
      difficulty: {
        optionId: "drawCount",
        byChoice: { 1: Difficulty.EASY, 3: Difficulty.MEDIUM },
      },
      decks: 1,
      allCardsVisible: false,
      variants: [
        {
          name: "Test Nearly Won",
          values: { almostWin: 1 },
          tagline: "A test variant.",
          difficulty: Difficulty.EASY,
        },
      ],
    },
    freecell: {
      family: "cells",
      tagline: "Another test tagline.",
      difficulty: Difficulty.HARD,
      decks: 2,
      allCardsVisible: true,
    },
  },
};
