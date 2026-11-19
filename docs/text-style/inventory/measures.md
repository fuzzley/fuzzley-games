# Text inventory: measures

Written by `measure.mjs`; do not edit by hand. Sentences are measured only
in entries that read as prose (a full stop, or eight words or more); a
value put in, such as `{{ score }}`, counts as one word. The grade is the
Flesch-Kincaid grade, worked out roughly.

## How to play, by game

|                      | Words | Sentences | Mean | Median | 9 in 10 under | Longest | 25 words or more | Commas a sentence | Semicolons per 1,000 words | Colons per 1,000 | Em dashes per 1,000 | Grade |
| -------------------- | ----: | --------: | ---: | -----: | ------------: | ------: | ---------------: | ----------------: | -------------------------: | ---------------: | ------------------: | ----: |
| Solitaire Collection |  5519 |       613 |  9.0 |      8 |            16 |      24 |               0% |               0.4 |                          – |             17.0 |                   – |   1.2 |
| Minesweeper          |    88 |        10 |  8.8 |      9 |            24 |      24 |               0% |               0.3 |                          – |                – |                   – |   2.7 |
| Sudoku               |   168 |        16 | 10.5 |     12 |            17 |      20 |               0% |               0.6 |                          – |                – |                   – |   2.4 |
| Snake                |    93 |        12 |  7.8 |      7 |            14 |      19 |               0% |               0.5 |                          – |                – |                   – |   0.8 |
| Brick Breaker        |   183 |        18 | 10.2 |     10 |            22 |      26 |               6% |               0.5 |                          – |                – |                   – |   2.3 |
| Asteroid Breaker     |   331 |        32 | 10.3 |     10 |            19 |      20 |               0% |               0.8 |                          – |                – |                   – |   2.5 |
| Brick Fuzz Pop       |   382 |        38 | 10.1 |     11 |            14 |      19 |               0% |               0.5 |                          – |                – |                   – |   1.6 |

## Every category, all games and both sites

|              | Words | Sentences | Mean | Median | 9 in 10 under | Longest | 25 words or more | Commas a sentence | Semicolons per 1,000 words | Colons per 1,000 | Em dashes per 1,000 | Grade |
| ------------ | ----: | --------: | ---: | -----: | ------------: | ------: | ---------------: | ----------------: | -------------------------: | ---------------: | ------------------: | ----: |
| how-to-play  |  6764 |       739 |  9.2 |      8 |            16 |      26 |               0% |               0.4 |                          – |             13.9 |                   – |   1.4 |
| reference    |  1657 |       195 |  8.5 |      8 |            14 |      20 |               0% |               0.3 |                          – |                – |                   – |   1.2 |
| description  |  3757 |       366 | 10.3 |      9 |            15 |     114 |               4% |               0.9 |                        0.8 |              0.5 |                   – |   4.3 |
| picture-text |  1328 |        98 | 13.6 |     14 |            15 |      15 |               0% |               1.1 |                          – |                – |                   – |   2.7 |
| hint         |  1588 |       212 |  7.5 |      7 |            12 |      26 |               0% |               0.3 |                          – |                – |                   – |   1.3 |
| message      |   488 |        80 |  6.1 |      5 |            11 |      21 |               0% |               0.2 |                        4.1 |             12.3 |                   – |   0.4 |
| spoken       |   751 |       158 |  4.8 |      4 |            10 |      15 |               0% |               0.3 |                          – |              8.0 |                   – |   0.8 |
| site         |    89 |        13 |  6.8 |      6 |            11 |      11 |               0% |               0.2 |                          – |                – |                   – |   0.7 |
| profile      |   595 |        34 | 17.5 |     18 |            27 |      33 |              24% |               0.9 |                          – |                – |                   – |  13.2 |

## Manuals people wrote, for comparison

|                                                          | Words | Sentences | Mean | Median | 9 in 10 under | Longest | 25 words or more | Commas a sentence | Semicolons per 1,000 words | Colons per 1,000 | Em dashes per 1,000 | Grade |
| -------------------------------------------------------- | ----: | --------: | ---: | -----: | ------------: | ------: | ---------------: | ----------------: | -------------------------: | ---------------: | ------------------: | ----: |
| AisleRiot: Klondike (GNOME, 2001)                        |   494 |        47 | 10.5 |     10 |            19 |      23 |               0% |               0.1 |                          – |                – |                   – |   3.7 |
| AisleRiot: FreeCell                                      |   235 |        20 | 11.8 |     10 |            27 |      30 |              10% |               0.2 |                          – |                – |                   – |   4.8 |
| AisleRiot: Spider                                        |   411 |        39 | 10.5 |     10 |            17 |      31 |               3% |               0.3 |                          – |                – |                   – |   4.3 |
| AisleRiot: Golf                                          |   121 |        15 |  8.1 |      8 |            16 |      16 |               0% |                 – |                          – |                – |                   – |   2.8 |
| KBreakOut handbook (KDE)                                 |  1095 |        67 | 16.3 |     14 |            26 |      59 |              16% |               0.7 |                        0.9 |                – |                   – |   6.6 |
| KMines handbook (KDE)                                    |   801 |        60 | 13.3 |     13 |            23 |      37 |               8% |               0.6 |                        7.5 |                – |                   – |   6.0 |
| KSudoku handbook (KDE)                                   |  3013 |       180 | 16.7 |     15 |            29 |      58 |              16% |               0.7 |                          – |              2.7 |                   – |   8.0 |
| KSnakeDuel handbook (KDE)                                |   944 |        80 | 11.8 |     11 |            18 |      28 |               1% |               0.2 |                        8.5 |              2.1 |                   – |   7.4 |
| Simon Tatham’s Puzzles manual (Mines, Solo and the rest) | 19185 |      1024 | 18.7 |     16 |            32 |      66 |              26% |               0.8 |                        4.5 |              2.0 |                   – |   8.7 |
| **All of them**                                          | 26299 |      1532 | 17.2 |     15 |            29 |      66 |              21% |               0.7 |                        3.8 |              1.9 |                   – |   8.0 |

## Constructions, per thousand words

Every entry counts here, labels included. The count is in brackets.

| Construction                                                                                                     | Solitaire: rules and options | Solitaire: the rest | Minesweeper, Sudoku, Snake | Brick Breaker, Asteroid Breaker, Brick Fuzz Pop | fuzzley.games site and shared libraries | fuzzley.info | Manuals people wrote |
| ---------------------------------------------------------------------------------------------------------------- | ---------------------------: | ------------------: | -------------------------: | ----------------------------------------------: | --------------------------------------: | -----------: | -------------------: |
| Words                                                                                                            |                         7327 |                3232 |                       1921 |                                            4357 |                                     854 |         1495 |                26299 |
| A word in capitals for stress (UP, SAME SUIT)                                                                    |                            – |                   – |                    0.5 (1) |                                               – |                                       – |      2.7 (4) |             1.4 (36) |
| A Title Case lead-in and a colon (Stock Recycle: …)                                                              |                   22.9 (168) |             0.6 (2) |                    2.1 (4) |                                         1.6 (7) |                                 1.2 (1) |      0.7 (1) |              0.1 (2) |
| Stock words (initially, respectively, automatically, successfully, e.g., configurable, valid, simply)            |                      0.1 (1) |             1.2 (4) |                          – |                                               – |                                       – |      0.7 (1) |             3.0 (79) |
| Are you sure / Congratulations / will be lost                                                                    |                            – |                   – |                          – |                                               – |                                       – |            – |                    – |
| Em dash                                                                                                          |                            – |                   – |                          – |                                               – |                                       – |            – |                    – |
| Semicolon                                                                                                        |                            – |             0.6 (2) |                          – |                                         1.8 (8) |                                 1.2 (1) |            – |            3.8 (101) |
| Colon inside a sentence                                                                                          |                    12.8 (94) |             0.3 (1) |                    1.6 (3) |                                         2.1 (9) |                                       – |      1.3 (2) |             1.9 (49) |
| “as” for when or how (as it breaks, as a rock does)                                                              |                     1.4 (10) |                   – |                    2.1 (4) |                                         1.4 (6) |                                       – |      1.3 (2) |             2.2 (57) |
| “as … does” and “do as … do”                                                                                     |                            – |                   – |                          – |                                         0.2 (1) |                                       – |            – |              0.0 (1) |
| A thing’s possessive (the floor’s row, the level’s boon)                                                         |                            – |                   – |                    0.5 (1) |                                         0.5 (2) |                                 1.2 (1) |            – |              0.3 (9) |
| whichever, whatever, wherever, however (as a pronoun)                                                            |                      0.1 (1) |                   – |                    1.6 (3) |                                         0.7 (3) |                                       – |            – |              0.1 (2) |
| “go on” for resume or continue                                                                                   |                            – |                   – |                          – |                                               – |                                       – |            – |                    – |
| “by itself”, “of its own”, “alone” after a noun                                                                  |                            – |                   – |                    1.6 (3) |                                               – |                                       – |      0.7 (1) |              0.0 (1) |
| A thing given a person’s verb (holds, wears, waits, stands, lets, says, asks, keeps, pays, sheds, earths, vents) |                            – |                   – |                          – |                                         1.4 (6) |                                 1.2 (1) |            – |             0.5 (12) |
| A trailing phrase with no verb (…, paused. …, physics included.)                                                 |                            – |                   – |                    1.0 (2) |                                         1.4 (6) |                                       – |            – |                    – |
| A key named by the finger that rests on it                                                                       |                            – |                   – |                          – |                                               – |                                       – |            – |                    – |
| Three things in a row (a, b and c)                                                                               |                      1.0 (7) |            4.3 (14) |                   6.8 (13) |                                        3.0 (13) |                                 3.5 (3) |    11.4 (17) |             1.7 (44) |

## The words people’s rules lean on, per thousand words

How to play, the catalogs and the hints under settings. The count is in
brackets.

|                                     |  Solitaire | The six newer games | Manuals people wrote |
| ----------------------------------- | ---------: | ------------------: | -------------------: |
| Words                               |       7327 |                3211 |                26299 |
| if                                  |   3.3 (24) |            8.7 (28) |            8.1 (212) |
| when                                |   3.1 (23) |            8.7 (28) |             3.4 (89) |
| can                                 | 24.4 (179) |            6.9 (22) |           10.0 (264) |
| you can                             | 15.6 (114) |             2.5 (8) |            5.7 (149) |
| will, for what the game does next   |    0.1 (1) |             0.6 (2) |           11.0 (288) |
| must                                |    0.1 (1) |                   – |             1.2 (31) |
| you, your                           | 25.7 (188) |          36.7 (118) |           25.6 (673) |
| A contraction (don’t, you’ll, it’s) |   3.1 (23) |            8.1 (26) |             2.1 (54) |
| Exclamation mark                    |          – |             0.3 (1) |              0.3 (8) |
| Brackets                            |    0.1 (1) |             0.9 (3) |           10.5 (277) |
| A count in figures                  | 74.2 (544) |           28.3 (91) |            7.9 (207) |
| A count in words (two to fifty)     |   1.4 (10) |                   – |            6.8 (179) |

## How labels and hints of two words or more are cased

Names of games, variants and people are left out by category, not by
reading each, so a Title Case count holds a few proper names.

|                           | Sentence case | Title Case | ALL CAPS |
| ------------------------- | ------------: | ---------: | -------: |
| Solitaire Collection      |            63 |         26 |        1 |
| Minesweeper               |            13 |          1 |        – |
| Sudoku                    |            15 |          – |        1 |
| Snake                     |            21 |          2 |        – |
| Brick Breaker             |            35 |          7 |        2 |
| Asteroid Breaker          |            38 |          6 |        – |
| Brick Fuzz Pop            |            28 |          6 |        – |
| Site and shared libraries |            27 |         14 |        1 |
| fuzzley.info              |            21 |          7 |        – |

## The same sentence kept in more than one place

117 texts of six words or more are written out more than once, 352 entries in all. The most repeated:

- 19 times: “Foundations: build up by suit, from Ace to King.” (games/solitaire/src/ui/app/provider/game_documentation_data.ts)
- 15 times: “You can take a card back from a foundation.” (games/solitaire/src/ui/app/provider/game_documentation_data.ts)
- 14 times: “Move all 52 cards to the 4 foundations, building each suit up from Ace to King.” (games/solitaire/src/ui/app/provider/game_documentation_data.ts)
- 12 times: “1 deck, all dealt face up. No stock.” (games/solitaire/src/ui/app/provider/game_documentation_data.ts)
- 9 times: “Tableau: build down in any suit. Any 9 goes on any 10.” (games/solitaire/src/ui/app/provider/game_documentation_data.ts)
- 7 times: “Tableau: build down in alternating colors. A red 9 goes on a black 10.” (games/solitaire/src/ui/app/provider/game_documentation_data.ts)
- 7 times: “Only a King can fill an empty column.” (games/solitaire/src/ui/app/provider/game_documentation_data.ts)
- 7 times: “Any card can fill an empty column.” (games/solitaire/src/ui/app/provider/game_documentation_data.ts)
- 6 times: “Waste: the cards you turn over. You can play the top one.” (games/solitaire/src/ui/app/provider/game_documentation_data.ts)
- 6 times: “You can move the top card of a column to an empty free cell.” (games/solitaire/src/ui/app/provider/game_documentation_data.ts)
- 5 times: “When you finish a run from King to Ace in a single suit, it moves to a foundation on its own.” (games/solitaire/src/ui/app/provider/game_documentation_data.ts)
- 5 times: “Tableau: build down by suit. The 9 of spades goes on the 10 of spades.” (games/solitaire/src/ui/app/provider/game_documentation_data.ts)

## Spellings and names that differ

| One way     | Count | The other    | Count |
| ----------- | ----: | ------------ | ----: |
| color       |    33 | colour       |     0 |
| toward      |     6 | towards      |     0 |
| face-up     |    23 | face up      |    79 |
| How to play |    23 | How to Play  |     0 |
| Settings    |    21 | Game Options |     0 |
