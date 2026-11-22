# Text inventory: measures

Kept from before the rewrite, as the scripts wrote it at commit `3279d5c0`.
No script writes this file now.

Written by `measure.mjs`; do not edit by hand. Sentences are measured only
in entries that read as prose (a full stop, or eight words or more); a
value put in, such as `{{ score }}`, counts as one word. The grade is the
Flesch-Kincaid grade, worked out roughly.

## How to play, by game

|                      | Words | Sentences | Mean | Median | 9 in 10 under | Longest | 25 words or more | Commas a sentence | Semicolons per 1,000 words | Colons per 1,000 | Em dashes per 1,000 | Grade |
| -------------------- | ----: | --------: | ---: | -----: | ------------: | ------: | ---------------: | ----------------: | -------------------------: | ---------------: | ------------------: | ----: |
| Solitaire Collection | 10024 |       646 | 15.5 |     14 |            25 |      43 |              12% |               0.7 |                        2.4 |             13.4 |                 6.3 |   5.6 |
| Minesweeper          |    62 |         6 | 10.3 |     13 |            20 |      20 |               0% |               0.5 |                       16.1 |                – |                   – |   1.8 |
| Sudoku               |   167 |        11 | 15.2 |     13 |            33 |      38 |              18% |               0.9 |                        6.0 |                – |                   – |   4.3 |
| Snake                |   135 |        12 | 11.3 |     10 |            21 |      30 |               8% |               0.9 |                        7.4 |              7.4 |                   – |   3.2 |
| Brick Breaker        |   233 |        18 | 12.9 |     14 |            25 |      39 |              11% |               0.8 |                       17.2 |              4.3 |                   – |   3.6 |
| Asteroid Breaker     |   471 |        26 | 18.1 |     15 |            39 |      55 |              19% |               1.5 |                       12.7 |              6.4 |                   – |   5.1 |
| Brick Fuzz Pop       |   775 |        49 | 15.8 |     13 |            36 |      44 |              20% |               1.1 |                        9.0 |              5.2 |                   – |   4.5 |

## Every category, all games and both sites

|              | Words | Sentences | Mean | Median | 9 in 10 under | Longest | 25 words or more | Commas a sentence | Semicolons per 1,000 words | Colons per 1,000 | Em dashes per 1,000 | Grade |
| ------------ | ----: | --------: | ---: | -----: | ------------: | ------: | ---------------: | ----------------: | -------------------------: | ---------------: | ------------------: | ----: |
| how-to-play  | 11867 |       768 | 15.5 |     14 |            26 |      55 |              13% |               0.8 |                        3.7 |             12.1 |                 5.3 |   5.4 |
| reference    |  2532 |       161 | 15.7 |     14 |            29 |      45 |              17% |               1.1 |                        4.3 |             23.3 |                 4.7 |   5.4 |
| description  |  4394 |       294 | 14.9 |     11 |            29 |     114 |              14% |               1.4 |                        4.1 |              8.2 |                   – |   7.3 |
| picture-text |  1121 |        57 | 19.7 |     19 |            29 |      41 |              25% |               1.5 |                          – |              0.9 |                   – |   8.3 |
| hint         |  1979 |       166 | 11.9 |     11 |            22 |      37 |               6% |               0.7 |                       16.7 |              4.5 |                 0.5 |   3.8 |
| message      |   457 |        67 |  6.8 |      6 |            12 |      20 |               0% |               0.2 |                        4.4 |                – |                 2.2 |   0.8 |
| spoken       |   950 |       125 |  7.6 |      5 |            16 |      55 |               3% |               0.6 |                        2.1 |              6.3 |                   – |   1.5 |
| site         |    92 |        11 |  8.4 |      8 |            14 |      19 |               0% |               0.5 |                          – |             10.9 |                   – |   2.2 |
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
| Words                                                                                                            |                        12668 |                3454 |                       2001 |                                            5837 |                                     793 |         1594 |                26299 |
| A word in capitals for stress (UP, SAME SUIT)                                                                    |                   12.7 (161) |                   – |                    0.5 (1) |                                               – |                                       – |      2.5 (4) |             1.4 (36) |
| A Title Case lead-in and a colon (Stock Recycle: …)                                                              |                   24.1 (305) |             0.6 (2) |                    2.5 (5) |                                         1.0 (6) |                                 1.3 (1) |      0.6 (1) |              0.1 (2) |
| Stock words (initially, respectively, automatically, successfully, e.g., configurable, valid, simply)            |                     4.0 (51) |             1.7 (6) |                          – |                                               – |                                       – |      1.3 (2) |             3.0 (79) |
| Are you sure / Congratulations / will be lost                                                                    |                            – |            3.5 (12) |                          – |                                               – |                                       – |            – |                    – |
| Em dash                                                                                                          |                     6.0 (76) |             0.3 (1) |                          – |                                               – |                                       – |            – |                    – |
| Semicolon                                                                                                        |                     4.0 (51) |            4.9 (17) |                    2.0 (4) |                                        7.4 (43) |                                 1.3 (1) |            – |            3.8 (101) |
| Colon inside a sentence                                                                                          |                   14.6 (185) |             1.7 (6) |                   6.0 (12) |                                        7.2 (42) |                                 6.3 (5) |      3.8 (6) |             1.9 (49) |
| “as” for when or how (as it breaks, as a rock does)                                                              |                     2.4 (31) |             1.2 (4) |                    1.0 (2) |                                        6.2 (36) |                                 1.3 (1) |      1.3 (2) |             2.2 (57) |
| “as … does” and “do as … do”                                                                                     |                            – |                   – |                          – |                                         0.9 (5) |                                       – |            – |              0.0 (1) |
| A thing’s possessive (the floor’s row, the level’s boon)                                                         |                     2.3 (29) |             0.3 (1) |                    1.0 (2) |                                        5.1 (30) |                                 1.3 (1) |            – |              0.3 (9) |
| whichever, whatever, wherever, however (as a pronoun)                                                            |                     0.8 (10) |             0.3 (1) |                    1.5 (3) |                                         1.2 (7) |                                       – |            – |              0.1 (2) |
| “go on” for resume or continue                                                                                   |                      0.2 (3) |                   – |                    3.0 (6) |                                        4.6 (27) |                                       – |            – |                    – |
| “by itself”, “of its own”, “alone” after a noun                                                                  |                      0.6 (7) |                   – |                    2.0 (4) |                                        1.7 (10) |                                 1.3 (1) |      0.6 (1) |              0.0 (1) |
| A thing given a person’s verb (holds, wears, waits, stands, lets, says, asks, keeps, pays, sheds, earths, vents) |                     1.9 (24) |             0.6 (2) |                   6.0 (12) |                                        5.3 (31) |                                       – |            – |             0.5 (12) |
| A trailing phrase with no verb (…, paused. …, physics included.)                                                 |                      0.1 (1) |                   – |                    1.0 (2) |                                         1.0 (6) |                                       – |            – |                    – |
| A key named by the finger that rests on it                                                                       |                            – |                   – |                          – |                                        2.1 (12) |                                       – |            – |                    – |
| Three things in a row (a, b and c)                                                                               |                     2.8 (36) |            9.0 (31) |                  13.0 (26) |                                        8.6 (50) |                               12.6 (10) |    10.7 (17) |             1.7 (44) |

## The words people’s rules lean on, per thousand words

How to play, the catalogs and the hints under settings. The count is in
brackets.

|                                     |  Solitaire | The six newer games | Manuals people wrote |
| ----------------------------------- | ---------: | ------------------: | -------------------: |
| Words                               |      12668 |                4227 |                26299 |
| if                                  |    0.6 (7) |                   – |            8.1 (212) |
| when                                |   1.1 (14) |            3.3 (14) |             3.4 (89) |
| can                                 | 12.9 (163) |            2.8 (12) |           10.0 (264) |
| you can                             |    0.3 (4) |             0.2 (1) |            5.7 (149) |
| will, for what the game does next   |    0.5 (6) |                   – |           11.0 (288) |
| must                                |    0.6 (8) |                   – |             1.2 (31) |
| you, your                           |   1.8 (23) |           10.4 (44) |           25.6 (673) |
| A contraction (don’t, you’ll, it’s) |    0.1 (1) |             1.9 (8) |             2.1 (54) |
| Exclamation mark                    |          – |                   – |              0.3 (8) |
| Brackets                            |   3.6 (46) |                   – |           10.5 (277) |
| A count in figures                  | 30.9 (392) |            6.9 (29) |            7.9 (207) |
| A count in words (two to fifty)     | 27.5 (349) |           11.1 (47) |            6.8 (179) |

## How labels and hints of two words or more are cased

Names of games, variants and people are left out by category, not by
reading each, so a Title Case count holds a few proper names.

|                           | Sentence case | Title Case | ALL CAPS |
| ------------------------- | ------------: | ---------: | -------: |
| Solitaire Collection      |            35 |         51 |        1 |
| Minesweeper               |            14 |          – |        – |
| Sudoku                    |            16 |          – |        1 |
| Snake                     |            20 |          2 |        – |
| Brick Breaker             |            36 |          7 |        2 |
| Asteroid Breaker          |            38 |          6 |        – |
| Brick Fuzz Pop            |            33 |          6 |        – |
| Site and shared libraries |            27 |         12 |        1 |
| fuzzley.info              |            21 |          7 |        – |

## The same sentence kept in more than one place

96 texts of six words or more are written out more than once, 255 entries in all. The most repeated:

- 16 times: “Foundations: Built UP in SAME SUIT from Ace to King.” (games/solitaire/src/ui/app/provider/game_documentation_data.ts)
- 10 times: “Move all 52 cards to the four foundation piles, built up by suit from Ace to King.” (games/solitaire/src/ui/app/provider/game_documentation_data.ts)
- 6 times: “Tableau: Built DOWN in SAME SUIT.” (games/solitaire/src/ui/app/provider/game_documentation_data.ts)
- 5 times: “Tableau: Built DOWN in ALTERNATING COLORS.” (games/solitaire/src/ui/app/provider/game_documentation_data.ts)
- 5 times: “Tableau: Built DOWN by RANK in ANY SUIT.” (games/solitaire/src/ui/app/provider/game_documentation_data.ts)
- 5 times: “All 52 cards are sorted into their suit foundations.” (games/solitaire/src/ui/app/provider/game_documentation_data.ts)
- 4 times: “Start again, once a run has ended” (games/asteroid-breaker/src/app/help/help.component.html, games/brick-breaker/src/app/help/help.component.html, games/brick-fuzz-pop/src/app/help/help.component.html)
- 4 times: “All 52 cards are sorted into their suit foundations from Ace through King.” (games/solitaire/src/ui/app/provider/game_documentation_data.ts)
- 4 times: “Move all 104 cards from two decks onto the eight foundation piles, built up by suit from Ace to King.” (games/solitaire/src/ui/app/provider/game_documentation_data.ts)
- 4 times: “All 104 cards are sorted onto the eight foundations, two per suit.” (games/solitaire/src/ui/app/provider/game_documentation_data.ts)
- 4 times: “The top card of a foundation can be taken back down onto a column.” (games/solitaire/src/ui/app/provider/game_documentation_data.ts)
- 3 times: “Play Asteroid Breaker free in your browser: fly a small ship through a field that wraps at every edge, and bla…” (games/asteroid-breaker/index.html)

## Spellings and names that differ

| One way     | Count | The other    | Count |
| ----------- | ----: | ------------ | ----: |
| color       |    17 | colour       |    32 |
| toward      |     8 | towards      |     2 |
| face-up     |   127 | face up      |     1 |
| How to play |    17 | How to Play  |     4 |
| Settings    |    16 | Game Options |     2 |
