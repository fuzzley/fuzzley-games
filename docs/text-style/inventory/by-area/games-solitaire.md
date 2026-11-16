# Text inventory: games/solitaire

Written by `extract.mjs`; do not edit by hand. Each entry gives its line,
where it sits, and its text, with `{{ … }}` or `{…}` where a value is put
in, keys in square brackets and bold lead-ins in asterisks.

## How to play and rules

### src/ui/app/component/game_help_modal/game_help_modal.component.html

- 3 `<fz-dialog [label]>` {{ `${modalTitle()} rules and documentation` }}
- 22 `<span>` Wikipedia
- 51 `<button>` Summary
- 66 `<button>` Detailed Rules
- 82 `<button>` Options & Variants
- 112 `<h3>` Objective & Win Condition
- 113 `<p>` **Objective:** {{ activeDoc.summary.objective }}
- 117 `<p>` **Win Condition:** {{ activeDoc.summary.winCondition }}
- 124 `<h4>` Game Overview
- 152 `<p>` Screenshot unavailable
- 172 `<h4>` Board Layout
- 184 `<h4>` Sequence Building Rules
- 196 `<h4>` Card Movement & Grabbing
- 210 `<h4>` Special Game Mechanics
- 256 `<h3>` Documentation Unavailable
- 257 `<p>` Rules for this game aren't written yet.
- 265 `<button>` Close

### src/ui/app/provider/game_documentation_data.ts

- 47 `objective:` Build all 52 cards onto the four foundation piles by suit in ascending order from Ace to King.
- 49 `winCondition:` All cards are transferred to the foundations (Ace through King for Hearts, Diamonds, Clubs, and Spades).
- 51 `quickOverview:` Klondike is the classic solitaire game. Cards are dealt into 7 tableau columns with increasing hidden cards. Players draw cards from the stock to the waste pile and build tableau runs in descending rank with alternating colors.
- 55 `layout[]:` Tableau: 7 columns containing 1 to 7 cards respectively (top card face-up).
- 56 `layout[]:` Foundations: 4 suit piles, initially empty.
- 57 `layout[]:` Stock: Remaining cards face-down in top-left.
- 58 `layout[]:` Waste: Face-up pile where drawn cards land.
- 61 `cardMovement[]:` Cards on the waste pile or tableau columns can be moved to foundations or other tableau columns.
- 62 `cardMovement[]:` Face-up sequences of cards in alternating colors can be moved together as a unit.
- 63 `cardMovement[]:` Only a King (or a stack headed by a King) can be placed into an empty tableau column.
- 66 `sequenceBuilding[]:` Foundations: Built UP in the SAME SUIT from Ace (1) to King (13).
- 67 `sequenceBuilding[]:` Tableau: Built DOWN in ALTERNATING COLORS (e.g., Red 9 on Black 10).
- 70 `specialRules[]:` Draw Mode: Configurable between Draw 1 (draw one card at a time from stock) and Draw 3 (draw three cards at a time).
- 71 `specialRules[]:` Stock Recycle: When the stock empties, clicking it recycles cards from the waste pile back into the stock — as often as you like under standard scoring, and a limited number of times under Vegas scoring.
- 143 `objective:` Move all 52 cards to the four foundation piles, built up by suit from Ace to King.
- 145 `winCondition:` All 52 cards are sorted into their respective suit foundations from Ace through King.
- 147 `quickOverview:` FreeCell is a highly strategic solitaire game played with all cards dealt face-up into 8 columns. Four free cells act as temporary storage locations while you arrange columns in descending order with alternating colors.
- 151 `layout[]:` Free Cells: 4 single-card holding cells at top-left.
- 152 `layout[]:` Foundations: 4 suit piles at top-right, initially empty.
- 153 `layout[]:` Tableau: 8 columns with all 52 cards dealt completely face-up.
- 156 `cardMovement[]:` Any single card can be placed into an empty Free Cell.
- 157 `cardMovement[]:` Any card can start an empty tableau column.
- 158 `cardMovement[]:` Multi-card moves (supermoves) simulate moving cards through open Free Cells and empty tableau columns.
- 161 `sequenceBuilding[]:` Foundations: Built UP in SAME SUIT from Ace to King.
- 162 `sequenceBuilding[]:` Tableau: Built DOWN in ALTERNATING COLORS.
- 165 `specialRules[]:` Supermove Capacity Formula: Maximum cards moved at once is (Free Cells + 1) * 2^(Empty Tableaus).
- 166 `specialRules[]:` No Stock: FreeCell has no stock or hidden cards; all cards are visible from the deal.
- 182 `objective:` Assemble 8 full same-suit sequences from King down to Ace on the tableau to clear them.
- 184 `winCondition:` All 8 13-card sequences (King to Ace of same suit) are completed and removed from the board.
- 186 `quickOverview:` Spider uses two 52-card decks (104 cards total). Players build descending sequences in 10 tableau columns. Completed King-to-Ace same-suit runs are automatically cleared to foundation slots.
- 190 `layout[]:` Tableau: 10 columns (first 4 columns have 6 cards, remaining 6 have 5 cards; top card face-up).
- 191 `layout[]:` Stock: Holds remaining 50 cards (dealt 10 cards at a time, one to each column).
- 192 `layout[]:` Foundations: Holds completed 13-card sequences.
- 195 `cardMovement[]:` Cards can be placed on any tableau card of next higher rank, regardless of suit (e.g. 7 of Clubs on 8 of Hearts).
- 196 `cardMovement[]:` Only same-suit runs can be moved together as a stack.
- 197 `cardMovement[]:` Any card or valid same-suit run can fill an empty tableau column.
- 200 `sequenceBuilding[]:` Tableau: Built DOWN by RANK (regardless of suit for single cards, same suit for multi-card moves).
- 201 `sequenceBuilding[]:` Completion: Complete King-down-to-Ace sequence of the SAME suit automatically moves to foundations.
- 204 `specialRules[]:` Stock Dealing: Dealing from stock places 1 face-up card on top of every tableau column.
- 205 `specialRules[]:` Empty Column Requirement: All tableau columns must contain at least 1 card before dealing from the stock.
- 242 `objective:` Build all 52 cards onto four foundations by suit from Ace to King.
- 243 `winCondition:` All cards are placed in order on the foundations.
- 245 `quickOverview:` Yukon is a fast-paced game with no stock pile. All cards are dealt to the tableau at the start. The signature rule of Yukon is that ANY face-up card can be moved regardless of how many cards are sitting on top of it.
- 249 `layout[]:` Tableau: 7 columns (column 1 has 1 face-up card; columns 2-7 have 1-6 face-down cards plus 5 face-up cards).
- 250 `layout[]:` Foundations: 4 suit piles at top-right, built Ace to King.
- 253 `cardMovement[]:` Any face-up card anywhere in a column can be grabbed and moved, taking all cards above it along for the ride.
- 254 `cardMovement[]:` The grabbed card must land on a valid receiving card according to the variant build rule.
- 255 `cardMovement[]:` Only Kings (and stacks led by a King) can fill empty tableau columns.
- 258 `sequenceBuilding[]:` Foundations: Built UP in SAME SUIT from Ace to King.
- 259 `sequenceBuilding[]:` Tableau (Yukon): Built DOWN in ALTERNATING COLORS.
- 260 `sequenceBuilding[]:` Tableau (Alaska): Built UP or DOWN in SAME SUIT.
- 261 `sequenceBuilding[]:` Tableau (Russian): Built DOWN in SAME SUIT.
- 262 `sequenceBuilding[]:` Tableau (Moosehide): Built DOWN in ANY SUIT BUT THE CARD'S OWN.
- 265 `specialRules[]:` No Staging Penalty: Stacks being moved do not need to be in sequence; only the targeted card and destination card must match placement rules.
- 307 `objective:` Move all 52 cards to the foundations from Ace to King by suit.
- 308 `winCondition:` All four foundations completed from Ace through King.
- 310 `quickOverview:` Baker's Game is the direct predecessor to FreeCell. It shares FreeCell's deal and 4 free cells, but requires tableau columns to be built strictly in the SAME SUIT rather than alternating colors.
- 314 `layout[]:` Free Cells: 4 single-card holding cells.
- 315 `layout[]:` Foundations: 4 suit piles, Ace to King.
- 316 `layout[]:` Tableau: 8 columns, all 52 cards dealt face-up.
- 319 `cardMovement[]:` Single cards can move to any empty free cell.
- 320 `cardMovement[]:` Supermove limits apply based on available free cells and empty columns.
- 321 `cardMovement[]:` Cards on tableau columns must build DOWN in the SAME SUIT.
- 324 `sequenceBuilding[]:` Foundations: Built UP in SAME SUIT from Ace to King.
- 325 `sequenceBuilding[]:` Tableau: Built DOWN in SAME SUIT (e.g. 9 of Spades on 10 of Spades).
- 328 `specialRules[]:` Empty Columns Rule: Configurable between Any Card or Kings Only.
- 329 `specialRules[]:` Kings Only Staging Limit: When empty columns accept Kings only, empty columns contribute zero staging capacity for supermoves, making multi-card moves strictly (Free Cells + 1).
- 360 `objective:` Move all 52 cards to the four foundation piles, built up by suit from Ace to King.
- 362 `winCondition:` All 52 cards are sorted into their suit foundations from Ace through King.
- 364 `quickOverview:` Challenge FreeCell is FreeCell with the deal rigged against you: the four Aces and four Twos are dealt first, one to the bottom of each column, so every foundation starts at the very bottom of the board. Super Challenge FreeCell also lets only Kings fill an empty column.
- 368 `layout[]:` Free Cells: 4 single-card holding cells at top-left.
- 369 `layout[]:` Foundations: 4 suit piles at top-right, initially empty.
- 370 `layout[]:` Tableau: 8 columns with all 52 cards dealt face-up, an Ace or a Two at the bottom of each.
- 373 `cardMovement[]:` Any single card can be placed into an empty free cell.
- 374 `cardMovement[]:` Any card can start an empty column, or only a King under Super Challenge.
- 375 `cardMovement[]:` Multi-card moves (supermoves) simulate moving cards through open free cells and empty columns.
- 378 `sequenceBuilding[]:` Foundations: Built UP in SAME SUIT from Ace to King.
- 379 `sequenceBuilding[]:` Tableau: Built DOWN in ALTERNATING COLORS.
- 382 `specialRules[]:` Buried Foundations: no foundation can be started until a whole column has been dismantled down to its Ace, so the opening is spent clearing columns rather than playing up.
- 383 `specialRules[]:` Supermove Capacity: (Free Cells + 1) * 2^(Empty Columns) with any card in a space; strictly (Free Cells + 1) when only Kings fill a space, because a moving run's only King is its bottom card.
- 415 `objective:` Move all 52 cards to the four suit foundation piles, built Ace to King.
- 417 `winCondition:` All cards transferred to suit foundations Ace through King.
- 419 `quickOverview:` Eight Off is a cousin of FreeCell and Baker's Game featuring 8 free cells instead of 4. Four of the cells start occupied by cards during deal. Tableau columns build strictly down in the same suit, and empty columns accept Kings only.
- 423 `layout[]:` Free Cells: 8 single-card holding cells (4 dealt with cards at start, 4 empty).
- 424 `layout[]:` Foundations: 4 suit piles, initially empty.
- 425 `layout[]:` Tableau: 8 columns of 6 cards each, all dealt face-up.
- 428 `cardMovement[]:` Single cards can move to any empty free cell.
- 429 `cardMovement[]:` Tableau columns build strictly DOWN in the SAME SUIT.
- 430 `cardMovement[]:` Only Kings can fill an empty tableau column.
- 433 `sequenceBuilding[]:` Foundations: Built UP in SAME SUIT from Ace to King.
- 434 `sequenceBuilding[]:` Tableau: Built DOWN in SAME SUIT.
- 437 `specialRules[]:` Supermove Capacity: Because empty columns accept Kings only, multi-card supermoves are strictly capped at (Free Cells + 1).
- 453 `objective:` Build four 13-card same-suit sequences from King down to Ace on the tableau.
- 455 `winCondition:` All 4 suits assembled in complete King-to-Ace runs on the board.
- 457 `quickOverview:` Scorpion combines the open-stack dragging mechanics of Yukon with the same-suit sequence completion goals of Spider. Players move any face-up card along with all cards on top of it to build same-suit descending runs.
- 461 `layout[]:` Tableau: 7 columns of 7 cards each (columns 1-4 have 3 face-down cards and 4 face-up; columns 5-7 have 7 face-up cards).
- 462 `layout[]:` Stock: 3 remaining cards dealt in a single press.
- 463 `layout[]:` Foundations: Automated slots for completed King-to-Ace same-suit runs.
- 466 `cardMovement[]:` Any face-up card in a column can be moved regardless of what is on top of it.
- 467 `cardMovement[]:` The grabbed card must land on a card of the SAME SUIT and exactly 1 rank higher (e.g., 7 of Spades on 8 of Spades).
- 468 `cardMovement[]:` Only Kings (or stacks led by a King) can fill empty tableau columns.
- 471 `sequenceBuilding[]:` Tableau: Built DOWN in SAME SUIT.
- 472 `sequenceBuilding[]:` Completion: Complete King-to-Ace same-suit runs automatically clear to foundation slots.
- 475 `specialRules[]:` Reserve Deal: Clicking the 3-card stock deals 1 card face-up onto each of the first 3 tableau columns.
- 512 `objective:` Build four 13-card same-suit sequences from King down to Ace on the tableau.
- 514 `winCondition:` All 4 suits assembled in complete King-to-Ace runs and cleared to the foundations.
- 516 `quickOverview:` Simple Simon plays by Spider's rules on an open board: one deck, ten columns, every card face-up, and no stock at all. Columns build down by rank in any suit, but only a same-suit run can be picked up, so the whole game is deciding which mixed piles you can afford to build.
- 520 `layout[]:` Tableau: 10 columns dealt 8, 8, 8, 7, 6, 5, 4, 3, 2, 1 cards, all face-up.
- 521 `layout[]:` Foundations: 4 automated slots for completed King-to-Ace same-suit runs.
- 522 `layout[]:` No Stock: every one of the 52 cards is on the tableau from the first move.
- 525 `cardMovement[]:` A card can be picked up only with an unbroken same-suit descending run resting on it.
- 526 `cardMovement[]:` Any card, or any run, can be moved into an empty tableau column.
- 527 `cardMovement[]:` There is no limit on how many cards move at once: a run travels in one piece rather than being staged through spare squares.
- 530 `sequenceBuilding[]:` Tableau: Built DOWN by RANK in ANY SUIT.
- 531 `sequenceBuilding[]:` Lifting: Only unbroken SAME SUIT descending runs can be moved.
- 532 `sequenceBuilding[]:` Completion: Complete King-to-Ace same-suit runs clear to the foundations automatically.
- 535 `specialRules[]:` No Recovery: with no stock and no face-down cards, a position played into a corner cannot be rescued — every deal is winnable or not from the opening move.
- 536 `specialRules[]:` The Staircase: the short columns on the right are the cheapest to clear, and opening a column early is usually worth more than any single run.
- 552 `objective:` Build eight 13-card same-suit sequences from King down to Ace on the tableau.
- 554 `winCondition:` All 8 runs, two per suit, assembled from King to Ace and cleared to the foundations.
- 556 `quickOverview:` Mrs. Mop is Spider with nothing hidden: both decks are dealt face-up into thirteen columns of eight, and there is no stock at all. Columns build down by rank in any suit, but only a same-suit run can be picked up. Charles Jewell invented it.
- 560 `layout[]:` Tableau: 13 columns of 8 cards, all 104 cards face-up.
- 561 `layout[]:` Foundations: 8 automated slots for completed King-to-Ace same-suit runs.
- 562 `layout[]:` No Stock: every card is on the tableau from the first move.
- 565 `cardMovement[]:` A card can be picked up only with an unbroken same-suit descending run resting on it.
- 566 `cardMovement[]:` Any card, or any run, can be moved into an empty column.
- 567 `cardMovement[]:` There is no limit on how many cards move at once: a run travels in one piece.
- 570 `sequenceBuilding[]:` Tableau: Built DOWN by RANK in ANY SUIT.
- 571 `sequenceBuilding[]:` Lifting: Only unbroken SAME SUIT descending runs can be moved.
- 572 `sequenceBuilding[]:` Completion: Complete King-to-Ace same-suit runs clear to the foundations automatically.
- 575 `specialRules[]:` Open Information: with both decks visible and no stock, every deal can be planned from the first move, as in Simple Simon.
- 576 `specialRules[]:` Two of Everything: each card has a twin, so a run can often be finished from either of two places — and blocked in either of two.
- 592 `objective:` Move all 52 cards to the four foundation piles, built up by suit from Ace to King.
- 594 `winCondition:` All 52 cards are sorted into their suit foundations from Ace through King.
- 596 `quickOverview:` Baker's Dozen deals thirteen columns of four cards face-up with the Kings sunk to the bottom of their columns. Cards move one at a time and build down by rank in any suit — but an emptied column can never be refilled, which inverts the instinct every other solitaire teaches.
- 600 `layout[]:` Tableau: 13 columns of 4 cards each, all face-up.
- 601 `layout[]:` Foundations: 4 suit piles at the right of the top row, initially empty.
- 602 `layout[]:` No Stock: all 52 cards are on the tableau from the first move.
- 605 `cardMovement[]:` Only the top card of a column can be moved, one card at a time.
- 606 `cardMovement[]:` A card can go onto any column whose top card is exactly 1 rank higher, of any suit.
- 607 `cardMovement[]:` Empty columns cannot be filled by any card — once a column is cleared it stays empty for the rest of the game.
- 610 `sequenceBuilding[]:` Foundations: Built UP in SAME SUIT from Ace to King.
- 611 `sequenceBuilding[]:` Tableau: Built DOWN by RANK in ANY SUIT.
- 614 `specialRules[]:` Kings Sink: after the deal, every King is moved to the bottom of its column. A King can never be moved, so one left on top would bury the cards beneath it for the whole game.
- 615 `specialRules[]:` Dead Columns: because empty columns cannot be refilled, clearing one is a loss of working space rather than a gain — the opposite of Klondike, FreeCell and Spider.
- 616 `specialRules[]:` No Staging: with no free cells and no usable empty columns, there is nowhere to park a card, so multi-card moves are impossible by construction.
- 632 `objective:` Move all 52 cards to the four foundation piles, built up by suit from Ace to King.
- 634 `winCondition:` All 52 cards are sorted into their suit foundations from Ace through King.
- 636 `quickOverview:` Seahaven Towers deals ten columns of five face-up cards, with the two leftover cards already filling two of its four cells. Columns build down in a single suit and open only to a King, which makes it the tightest of the cell games.
- 640 `layout[]:` Cells: 4 single-card holding cells at top-left, two of them filled by the deal.
- 641 `layout[]:` Foundations: 4 suit piles at top-right, initially empty.
- 642 `layout[]:` Tableau: 10 columns of 5 cards, all face-up.
- 645 `cardMovement[]:` Any single card can be placed into an empty cell.
- 646 `cardMovement[]:` Only a King (or a run headed by a King) can start an empty column.
- 647 `cardMovement[]:` Multi-card moves simulate moving cards one at a time through the open cells.
- 650 `sequenceBuilding[]:` Foundations: Built UP in SAME SUIT from Ace to King.
- 651 `sequenceBuilding[]:` Tableau: Built DOWN in SAME SUIT.
- 654 `specialRules[]:` Supermove Capacity: strictly (Free Cells + 1), with no doubling for empty columns. Because an empty column accepts only a King and a moving run's only King is its bottom card, an empty column can never stage part of a run.
- 655 `specialRules[]:` Opening Squeeze: the deal spends two of the four cells, so the game begins with the least slack of any cell game here — freeing those two cells is usually the first task.
- 671 `objective:` Build four 13-card same-suit sequences from King down to Ace on the tableau.
- 673 `winCondition:` All 4 suits assembled in complete King-to-Ace runs and cleared to the foundations.
- 675 `quickOverview:` Spiderette is Spider played with one deck on seven columns. Columns build down by rank in any suit but only same-suit runs can be lifted, and the stock deals a card onto every column at once rather than turning cards into a waste.
- 679 `layout[]:` Tableau: 7 columns dealt 1 to 7 cards, only the top card of each face-up.
- 680 `layout[]:` Stock: the remaining 24 cards, dealt a row at a time.
- 681 `layout[]:` Foundations: 4 automated slots for completed King-to-Ace same-suit runs.
- 684 `cardMovement[]:` A card can be picked up only with an unbroken same-suit descending run resting on it.
- 685 `cardMovement[]:` Any card, or any run, can be moved into an empty column.
- 686 `cardMovement[]:` Turning over a column's newly exposed card happens automatically.
- 689 `sequenceBuilding[]:` Tableau: Built DOWN by RANK in ANY SUIT.
- 690 `sequenceBuilding[]:` Lifting: Only unbroken SAME SUIT descending runs can be moved.
- 691 `sequenceBuilding[]:` Completion: Complete King-to-Ace same-suit runs clear to the foundations automatically.
- 694 `specialRules[]:` Row Deal: pressing the stock deals one card face-up onto every column at once.
- 695 `specialRules[]:` Deals Onto Empty Columns: unlike Spider, the stock will deal even when a column is empty. Neither deal divides evenly by seven, so the final row is always short and refusing would strand it.
- 727 `objective:` Move all 52 cards to the four foundation piles, built up by suit from Ace to King.
- 729 `winCondition:` All 52 cards are sorted into their suit foundations from Ace through King.
- 731 `quickOverview:` Easthaven joins Spider's stock to Klondike's objective. Seven columns of three build down in alternating colours, but the stock deals a card onto every column at once — and it refuses to deal at all while any column stands empty.
- 735 `layout[]:` Tableau: 7 columns of 3 cards, two face-down under one face-up.
- 736 `layout[]:` Stock: the remaining 31 cards, dealt a row at a time.
- 737 `layout[]:` Foundations: 4 suit piles, filled by the player one card at a time.
- 740 `cardMovement[]:` A card can be picked up only with an unbroken alternating-colour descending run resting on it — stricter than Klondike, which allows a broken pile to be dragged.
- 741 `cardMovement[]:` Only a King (or a run headed by a King) can fill an empty column.
- 742 `cardMovement[]:` Turning over a column's newly exposed card happens automatically.
- 745 `sequenceBuilding[]:` Foundations: Built UP in SAME SUIT from Ace to King.
- 746 `sequenceBuilding[]:` Tableau: Built DOWN in ALTERNATING COLORS.
- 749 `specialRules[]:` Row Deal: pressing the stock deals one card face-up onto every column at once. The stock holds 31 against 7 columns, so the final row is a short one of three.
- 750 `specialRules[]:` No Deal Onto Empty Columns: the stock refuses while any column stands empty. Combined with Kings-only spaces, a player holding an empty column and no free King has neither a move that fills it nor a stock that will deal — which is how Easthaven is lost outright rather than merely stalled.
- 766 `objective:` Move all 104 cards from two decks onto the eight foundation piles, built up by suit from Ace to King.
- 768 `winCondition:` All 104 cards are sorted onto the eight foundations, two per suit.
- 770 `quickOverview:` Forty Thieves deals two decks into ten columns of four and turns the stock one card at a time onto a waste that is never recycled. Columns build down in a single suit and move one card at a time, which makes it one of the hardest classic patiences.
- 774 `layout[]:` Tableau: 10 columns of 4 cards, all face-up in the standard game.
- 775 `layout[]:` Foundations: 8 suit piles, two per suit for the two decks.
- 776 `layout[]:` Stock: the remaining 64 cards, drawn one at a time.
- 777 `layout[]:` Waste: a single face-up card where the drawn card lands.
- 780 `cardMovement[]:` The top card of any column, or the card on the waste, can be moved.
- 781 `cardMovement[]:` Any card can start an empty column — the only real generosity in the game, since there are no free cells.
- 782 `cardMovement[]:` The top card of a foundation can be taken back down onto a column.
- 785 `sequenceBuilding[]:` Foundations: Built UP in SAME SUIT from Ace to King.
- 786 `sequenceBuilding[]:` Tableau: Built DOWN in SAME SUIT.
- 789 `specialRules[]:` No Recycle: the stock is dealt through exactly once. When the 64 cards are gone they are gone, so every drawn card must be placed now or buried under the next.
- 790 `specialRules[]:` One Card At A Time: the standard game moves a single card per move, with no free cells and no staging, so a column is dismantled card by card or not at all.
- 837 `objective:` Move all 104 cards from two decks onto the eight foundation piles, built up by suit from Ace to King.
- 839 `winCondition:` All 104 cards are sorted onto the eight foundations, two per suit.
- 841 `quickOverview:` Maria is Forty Thieves on a narrower board: nine columns of four instead of ten, built down in alternating colours with runs moving as a unit. Fewer columns means a smaller tableau and a longer stock to work through.
- 845 `layout[]:` Tableau: 9 columns of 4 cards, all face-up.
- 846 `layout[]:` Foundations: 8 suit piles, two per suit.
- 847 `layout[]:` Stock: the remaining 68 cards, drawn one at a time onto a waste.
- 850 `cardMovement[]:` A card can be picked up with an unbroken alternating-colour descending run resting on it.
- 851 `cardMovement[]:` Any card can start an empty column.
- 852 `cardMovement[]:` The top card of a foundation can be taken back down onto a column.
- 855 `sequenceBuilding[]:` Foundations: Built UP in SAME SUIT from Ace to King.
- 856 `sequenceBuilding[]:` Tableau: Built DOWN in ALTERNATING COLORS.
- 859 `specialRules[]:` No Recycle: the stock is dealt through exactly once, as in the rest of the Forty Thieves family.
- 860 `specialRules[]:` Narrow Board: nine columns hold only 36 of the 104 cards, so more of the deck arrives through the stock than in Forty Thieves proper.
- 876 `objective:` Move all 104 cards from two decks onto the eight foundation piles, built up by suit from Ace to King.
- 878 `winCondition:` All 104 cards are sorted onto the eight foundations, two per suit.
- 880 `quickOverview:` Limited spreads Forty Thieves wider and shallower: twelve columns of three, built down in a single suit with runs moving as a unit. Every column is only two cards deep beneath its top, so far more of the tableau is immediately playable.
- 884 `layout[]:` Tableau: 12 columns of 3 cards, all face-up.
- 885 `layout[]:` Foundations: 8 suit piles, two per suit.
- 886 `layout[]:` Stock: the remaining 68 cards, drawn one at a time onto a waste.
- 889 `cardMovement[]:` A card can be picked up with an unbroken same-suit descending run resting on it.
- 890 `cardMovement[]:` Any card can start an empty column.
- 891 `cardMovement[]:` The top card of a foundation can be taken back down onto a column.
- 894 `sequenceBuilding[]:` Foundations: Built UP in SAME SUIT from Ace to King.
- 895 `sequenceBuilding[]:` Tableau: Built DOWN in SAME SUIT.
- 898 `specialRules[]:` No Recycle: the stock is dealt through exactly once, as in the rest of the Forty Thieves family.
- 899 `specialRules[]:` Shallow Columns: with only three cards per column, almost the whole tableau is reachable from the opening position.
- 915 `objective:` Move all 104 cards from two decks onto the eight foundation piles, built up by suit from Ace to King.
- 917 `winCondition:` All 104 cards are sorted onto the eight foundations, two per suit.
- 919 `quickOverview:` Lucas is Forty Thieves with a head start: the eight Aces begin on the foundations, and the rest is dealt into thirteen shallow columns of three. Columns build down in suit and a same-suit run moves as a unit, but the stock still goes through only once.
- 923 `layout[]:` Foundations: 8 suit piles, each dealt one of the eight Aces.
- 924 `layout[]:` Tableau: 13 columns of 3 cards, all face-up — the widest board in the family.
- 925 `layout[]:` Stock: the remaining 57 cards, drawn one at a time onto a waste.
- 928 `cardMovement[]:` A card can be picked up with an unbroken same-suit descending run resting on it.
- 929 `cardMovement[]:` Any card can start an empty column.
- 930 `cardMovement[]:` The top card of a foundation can be taken back down onto a column.
- 933 `sequenceBuilding[]:` Foundations: Built UP in SAME SUIT from the Ace already there to King.
- 934 `sequenceBuilding[]:` Tableau: Built DOWN in SAME SUIT.
- 937 `specialRules[]:` Aces Home: with every foundation already started, any Two that turns up can go straight home.
- 938 `specialRules[]:` No Recycle: the stock is dealt through exactly once, as in the rest of the Forty Thieves family. About one deal in three can be won.
- 954 `objective:` Build all 104 cards from two decks onto the eight foundation piles by suit, from Ace to King.
- 956 `winCondition:` All 104 cards are transferred to the eight foundations, two per suit.
- 958 `quickOverview:` Double Klondike is Klondike dealt from two decks: nine columns in the familiar staircase, eight foundations, and a stock of 59 drawn three at a time with unlimited recycles.
- 962 `layout[]:` Tableau: 9 columns containing 1 to 9 cards respectively, top card face-up.
- 963 `layout[]:` Foundations: 8 suit piles, two per suit for the two decks.
- 964 `layout[]:` Stock: the remaining 59 cards, face-down at top-left.
- 965 `layout[]:` Waste: face-up pile where drawn cards land, fanned three at a time.
- 968 `cardMovement[]:` Any face-up card can be moved along with everything stacked on it, ordered or not.
- 969 `cardMovement[]:` Only a King (or a stack headed by a King) can be placed into an empty column — but with two decks there are eight Kings, so spaces are far easier to fill than in Klondike.
- 970 `cardMovement[]:` Cards on the waste or the tableau can be moved to foundations or other columns.
- 973 `sequenceBuilding[]:` Foundations: Built UP in SAME SUIT from Ace to King.
- 974 `sequenceBuilding[]:` Tableau: Built DOWN in ALTERNATING COLORS.
- 977 `specialRules[]:` Stock Recycle: when the stock empties, clicking it recycles the waste back into the stock, as often as you like.
- 978 `specialRules[]:` Congested Middle Game: eight foundations must be fed from a tableau only two columns wider than Klondike's, so twice the cards does not mean twice the room.
- 979 `specialRules[]:` Scoring: the same scoring as Klondike — 10 points to a foundation, 5 for a waste card onto a column, 5 for turning a card over, and a penalty for recycling past the free passes.
- 995 `objective:` Arrange each of the four rows into a single suit running from Two up to King.
- 997 `winCondition:` Every row reads Two through King in one suit, with the gap parked at the end.
- 999 `quickOverview:` Montana, also played as Gaps, deals 48 cards — a deck without its Aces — into a grid of four rows by thirteen, leaving four gaps. You move a card into a gap only if it continues the run to the gap's left, and you win by sorting all four rows.
- 1003 `layout[]:` Grid: 4 rows of 13 cells, each holding at most one card.
- 1004 `layout[]:` Gaps: 4 empty cells, where the Aces would have fallen.
- 1005 `layout[]:` Redeal: a marker beside the grid, worth two uses per game, or three in Addiction. Its pips count them: filled for each redeal left, hollow for each one spent.
- 1008 `cardMovement[]:` A gap accepts the card one rank higher than the card immediately to its left, in the same suit.
- 1009 `cardMovement[]:` A gap in the leftmost column accepts any Two.
- 1010 `cardMovement[]:` A gap immediately to the right of a King accepts nothing — it is dead for the rest of the deal, and creating one is the mistake to avoid.
- 1011 `cardMovement[]:` Moving a card leaves a new gap behind it, so every move both opens and closes an opportunity.
- 1014 `sequenceBuilding[]:` Rows: Built UP in SAME SUIT from Two to King, left to right.
- 1015 `sequenceBuilding[]:` There are no foundations and no stacking — cards only ever move between cells.
- 1018 `specialRules[]:` Redeals: pressing the marker gathers every card that is not yet part of its row's run from the left, shuffles them, and lays them back out after each run — leaving one fresh gap per row. Two redeals per game, or three in Addiction; once they are spent, or nothing is left to gather, the marker becomes a plain outline and pressing it does nothing.
- 1019 `specialRules[]:` No Aces: the Aces are not in play at all, which is what creates the four gaps.
- 1020 `specialRules[]:` Won by Arrangement: unlike every other game here, nothing is gathered onto a pile — the cards end where they started, in cells, just in the right order.
- 1051 `objective:` Arrange each of the four rows into a single suit running from its Ace up to King.
- 1053 `winCondition:` Every row reads Ace through King in one suit, with the gap parked at the end.
- 1055 `quickOverview:` Blue Moon is Montana played with the whole deck. The 52 cards are dealt in four rows, then each Ace is moved to the head of a row of its own, leaving a gap where it was. A gap takes the card that continues the run to its left, and each Ace decides which suit its row is built in.
- 1059 `layout[]:` Grid: 4 rows of 14 cells, each holding at most one card.
- 1060 `layout[]:` Aces: one at the start of every row, fixed there for the whole game.
- 1061 `layout[]:` Gaps: 4 empty cells, where the Aces were dealt.
- 1062 `layout[]:` Redeal: a marker beside the grid, worth two uses per game. Its pips count them: filled for each redeal left, hollow for each one spent.
- 1065 `cardMovement[]:` A gap accepts the card one rank higher than the card immediately to its left, in the same suit.
- 1066 `cardMovement[]:` A gap beside an Ace accepts that Ace's Two.
- 1067 `cardMovement[]:` A gap immediately to the right of a King accepts nothing until the King moves on.
- 1068 `cardMovement[]:` The Aces never move, and nothing can be placed in front of them.
- 1071 `sequenceBuilding[]:` Rows: Built UP in SAME SUIT from the Ace to King, left to right.
- 1072 `sequenceBuilding[]:` There are no foundations and no stacking — cards only ever move between cells.
- 1075 `specialRules[]:` Redeals: pressing the marker gathers every card that is not yet part of its row's run from the Ace, shuffles them, and lays them back out after each run — leaving one fresh gap per row. Two redeals per game; once they are spent, or nothing is left to gather, the marker becomes a plain outline.
- 1076 `specialRules[]:` Won by Arrangement: as in Montana, nothing is gathered onto a pile — the cards end in cells, just in the right order.
- 1108 `objective:` Move all 52 cards onto the foundations, each suit climbing from its Ace and descending from its King until the two meet.
- 1110 `winCondition:` Every card is on a foundation, whichever of its suit's two piles it ended on.
- 1112 `quickOverview:` Bisley lays the four Aces out first and deals the rest face-up into thirteen columns. Each suit has two foundations: one building up from the Ace, and one building down from the King once a King is free. The columns build up or down in suit, one card at a time, and an emptied column stays empty.
- 1116 `layout[]:` Ace Foundations: the four Aces, at the left of the top row, one per suit.
- 1117 `layout[]:` King Foundations: 4 empty slots at the right of the top row, in the same suit order as the Aces.
- 1118 `layout[]:` Tableau: 13 face-up columns — 3 cards in each of the first four, 4 cards in each of the other nine.
- 1119 `layout[]:` No Stock: all 52 cards are in view from the first move.
- 1122 `cardMovement[]:` Only the top card of a column can be moved, one card at a time.
- 1123 `cardMovement[]:` A card can go onto a column whose top card is the same suit and exactly 1 rank higher or lower.
- 1124 `cardMovement[]:` A free King can start the King foundation of its own suit.
- 1125 `cardMovement[]:` Empty columns cannot be filled — once a column is cleared it stays empty.
- 1128 `sequenceBuilding[]:` Ace Foundations: Built UP in SAME SUIT from the Ace.
- 1129 `sequenceBuilding[]:` King Foundations: Built DOWN in SAME SUIT from the King.
- 1130 `sequenceBuilding[]:` Tableau: Built UP or DOWN in SAME SUIT, and a column may change direction.
- 1133 `specialRules[]:` Meeting Foundations: a suit's two foundations may meet at any rank. Once they hold all thirteen cards between them, that suit is done.
- 1134 `specialRules[]:` Two-Way Building: a column can climb and then fall, so the same suit can be gathered around a card from either side.
- 1150 `objective:` Discard all 48 cards that are not Aces, leaving only the four Aces on the table.
- 1152 `winCondition:` The stock is dealt out and nothing but Aces remains in the columns.
- 1154 `quickOverview:` Aces Up deals one card to each of four columns. Whenever two columns show cards of the same suit, the lower one can be discarded; Aces rank high, so they can never be. When nothing more can go, deal another card onto every column, and keep going until the stock runs out.
- 1158 `layout[]:` Stock: 48 face-down cards at the left, dealt four at a time.
- 1159 `layout[]:` Tableau: 4 columns, each dealt one face-up card to start.
- 1160 `layout[]:` Discard: a single pile at the right, initially empty.
- 1163 `cardMovement[]:` The top card of a column can be discarded while another column's top card is the same suit and higher.
- 1164 `cardMovement[]:` The top card of a column can be moved into an empty column.
- 1165 `cardMovement[]:` Pressing the stock deals one card face-up onto each column.
- 1166 `cardMovement[]:` Double-press a card to discard it, or to move it into a space when it cannot be discarded.
- 1169 `sequenceBuilding[]:` Nothing is built: cards are only ever discarded or moved into a space.
- 1170 `sequenceBuilding[]:` Aces rank above Kings, so an Ace can never be discarded.
- 1173 `specialRules[]:` Buried Cards: a card dealt over another hides it until the top card is discarded or moved into a space — spaces are what dig a buried card out.
- 1174 `specialRules[]:` The stock can be dealt at any time, but it is dealt only once.
- 1206 `objective:` Clear all seven columns by playing their cards onto the foundation, one rank up or down at a time.
- 1208 `winCondition:` Every column is empty. Cards left in the stock do not matter.
- 1210 `quickOverview:` Golf deals seven columns of five cards face-up and starts the foundation with one more. Any column's top card can be played onto the foundation if it is one rank above or below the foundation's top card, in any suit. When nothing can be played, turn the next stock card onto the foundation and carry on — but the stock goes through only once.
- 1214 `layout[]:` Stock: 16 face-down cards at the top-left, turned one at a time.
- 1215 `layout[]:` Foundation: a single pile beside the stock, started with one card from the deal.
- 1216 `layout[]:` Tableau: 7 columns of 5 cards, all face-up.
- 1219 `cardMovement[]:` Press a column's top card to play it onto the foundation, or drag it there.
- 1220 `cardMovement[]:` Press the stock to turn its top card onto the foundation, whatever its rank.
- 1221 `cardMovement[]:` Nothing is ever placed on a column: cards only leave them.
- 1224 `sequenceBuilding[]:` Foundation: one rank HIGHER or LOWER than its top card, in ANY SUIT — a run can go up and down as it likes.
- 1225 `sequenceBuilding[]:` Nothing may be played on a King, so a King ends the run until the stock is turned.
- 1228 `specialRules[]:` One Pass: the stock is never recycled; once it is gone, the game ends when nothing more can be played.
- 1229 `specialRules[]:` Long Runs: the trick is to plan a chain up and down through several columns before turning the next stock card.
- 1266 `objective:` Build all four foundations up to their King, each by its own interval, regardless of suit.
- 1268 `winCondition:` All 52 cards are on the foundations, each ending on a King.
- 1270 `quickOverview:` Calculation starts four foundations with an Ace, a Two, a Three and a Four. The first counts up in ones, the second in twos, the third in threes and the fourth in fours, counting on past the King from the Ace. Turn the stock one card at a time and put each card on a foundation or park it on one of four waste piles — where it waits, buried under whatever you park on it later.
- 1274 `layout[]:` Stock: the face-down cards at the top-left, turned one at a time.
- 1275 `layout[]:` Hand: the card just turned, beside the stock, waiting to be placed.
- 1276 `layout[]:` Foundations: 4 piles started with an Ace, a Two, a Three and a Four, in any suits.
- 1277 `layout[]:` Waste: 4 piles beneath the foundations, initially empty.
- 1280 `cardMovement[]:` Press the stock to turn its top card into the hand. The next card can be turned only once the hand is empty.
- 1281 `cardMovement[]:` The card in the hand must go to a foundation or onto any waste pile.
- 1282 `cardMovement[]:` Only the top card of a waste pile can move, and only to a foundation.
- 1283 `cardMovement[]:` Double-press a card in the hand or on a waste pile to send it to a foundation that takes it.
- 1286 `sequenceBuilding[]:` Foundation 1: A 2 3 4 5 6 7 8 9 10 J Q K — up in ones.
- 1287 `sequenceBuilding[]:` Foundation 2: 2 4 6 8 10 Q A 3 5 7 9 J K — up in twos.
- 1288 `sequenceBuilding[]:` Foundation 3: 3 6 9 Q 2 5 8 J A 4 7 10 K — up in threes.
- 1289 `sequenceBuilding[]:` Foundation 4: 4 8 Q 3 7 J 2 6 10 A 5 9 K — up in fours.
- 1290 `sequenceBuilding[]:` Suits never matter, and every foundation ends on its King.
- 1293 `specialRules[]:` One Pass: the stock is never recycled.
- 1294 `specialRules[]:` Waste Discipline: a waste pile is a stack, not a store — plan each one to come off in the order its foundation will want, high cards underneath. Kings are usually best kept to one pile, since every foundation ends on one.
- 1326 `objective:` Move all 52 cards to the four foundation piles, built up by suit from Ace to King.
- 1327 `winCondition:` All 52 cards are sorted into their suit foundations.
- 1329 `quickOverview:` Flower Garden deals thirty-six cards face-up into six beds of six, and fans the other sixteen out as the bouquet. Every card in the bouquet is free to play at any time — onto a foundation or onto a bed — while the beds build down regardless of suit, one card at a time.
- 1333 `layout[]:` Bouquet: 16 face-up cards fanned across the top-left, every one of them available.
- 1334 `layout[]:` Foundations: 4 suit piles at the top-right, initially empty.
- 1335 `layout[]:` Beds: 6 columns of 6 face-up cards.
- 1338 `cardMovement[]:` Any bouquet card can be played onto a foundation or a bed, wherever it sits in the fan.
- 1339 `cardMovement[]:` Only the top card of a bed can be moved, one card at a time.
- 1340 `cardMovement[]:` An empty bed can be filled with any card, from the bouquet or another bed.
- 1341 `cardMovement[]:` Nothing is ever put back into the bouquet.
- 1344 `sequenceBuilding[]:` Foundations: Built UP in SAME SUIT from Ace to King.
- 1345 `sequenceBuilding[]:` Beds: Built DOWN by RANK in ANY SUIT.
- 1348 `specialRules[]:` The Bouquet as a Reserve: the bouquet is like sixteen free cells that start full — the art is spending its cards to dig out the low cards buried in the beds.
- 1349 `specialRules[]:` No Stock: every card is in view from the first move.
- 1365 `objective:` Build all 52 cards onto the four foundations, each from an Ace up to a King, regardless of suit.
- 1366 `winCondition:` All 52 cards are on the foundations.
- 1368 `quickOverview:` Bristol deals eight fans of three cards face-up, with any King moved to the bottom of its fan, and three more cards to start three reserves. The stock deals three cards at a time, one onto each reserve, burying what was there. Fans build down regardless of suit and are never refilled once emptied.
- 1372 `layout[]:` Stock: 25 face-down cards at the top-left, dealt three at a time.
- 1373 `layout[]:` Reserves: 3 piles beside the stock, one card each to start; only the top card of each is free.
- 1374 `layout[]:` Foundations: 4 piles at the top-right, initially empty.
- 1375 `layout[]:` Tableau: 8 fans of 3 face-up cards, with Kings sunk to the bottom.
- 1378 `cardMovement[]:` Only the top card of a fan or a reserve can be moved, one card at a time.
- 1379 `cardMovement[]:` A card can go onto a fan whose top card is exactly 1 rank higher, in any suit.
- 1380 `cardMovement[]:` Nothing can be placed on a reserve; only the stock adds to them.
- 1381 `cardMovement[]:` An empty fan can never be filled again.
- 1382 `cardMovement[]:` Pressing the stock deals one card face-up onto each reserve.
- 1385 `sequenceBuilding[]:` Foundations: any Ace starts one, then Built UP by RANK in ANY SUIT to the King.
- 1386 `sequenceBuilding[]:` Fans: Built DOWN by RANK in ANY SUIT.
- 1389 `specialRules[]:` Kings Sink: a King cannot move onto a fan, so the deal puts each one at the bottom of its fan, where it buries nothing.
- 1390 `specialRules[]:` One Pass: the stock is dealt only once, and each deal buries the reserve cards beneath it — play what you can before dealing.
- 1420 `objective:` Discard the whole deck in pairs of the same rank.
- 1421 `winCondition:` All 52 cards are on the discard.
- 1423 `quickOverview:` Nestor deals eight columns of six cards face-up, with no two cards of the same rank in any one column, and leaves the last four as a reserve. Pair the free cards — the top of each column and every reserve card — two of the same rank at a time, until the board is clear.
- 1427 `layout[]:` Reserve: 4 face-up cards at the top-left, every one of them free.
- 1428 `layout[]:` Discard: a single pile at the top-right, initially empty.
- 1429 `layout[]:` Tableau: 8 columns of 6 face-up cards, no column holding two cards of a rank.
- 1432 `cardMovement[]:` Drag a free card onto another free card of the same rank, in any suit, and both go to the discard.
- 1433 `cardMovement[]:` Double-press a free card to pair it with the first free card of its rank.
- 1434 `cardMovement[]:` Cards are never moved anywhere but onto their partner.
- 1437 `sequenceBuilding[]:` Nothing is built: cards only leave the board, two at a time.
- 1438 `sequenceBuilding[]:` A free card is the top card of a column, or any reserve card.
- 1441 `specialRules[]:` The Deal: a card that would repeat a rank already in its column goes to the bottom of the deck and the next card is dealt instead, so no column starts with a pair in it. If every card left would repeat a rank, the rule gives way.
- 1442 `specialRules[]:` Choosing Pairs: four cards of each rank make two pairs, and which two pair first can decide whether a column's buried cards ever come free.
- 1457 `objective:` Discard the whole deck in pairs of touching cards.
- 1458 `winCondition:` All 52 cards are on the discard.
- 1460 `quickOverview:` Monte Carlo deals twenty-five cards face-up into a five-by-five grid. Remove pairs of the same rank that touch — side by side, one above the other, or corner to corner. Then consolidate: the remaining cards close up towards the top left, in reading order, and the stock fills the gaps left at the end.
- 1464 `layout[]:` Stock: 27 face-down cards at the left of the grid.
- 1465 `layout[]:` Grid: 5 rows of 5 face-up cards.
- 1466 `layout[]:` Discard: a single pile at the right of the grid, initially empty.
- 1469 `cardMovement[]:` Drag a card onto a touching card of the same rank, in any suit, and both go to the discard. Diagonal neighbours count.
- 1470 `cardMovement[]:` Double-press a card to pair it with the first touching card of its rank.
- 1471 `cardMovement[]:` Press the stock to consolidate: every card left slides towards the top left in reading order, closing the gaps, and the stock deals into the cells left empty at the end.
- 1472 `cardMovement[]:` Once the stock is gone, its empty slot still consolidates the grid.
- 1475 `sequenceBuilding[]:` Nothing is built: cards only leave the grid, two at a time.
- 1476 `sequenceBuilding[]:` Cards keep their reading order when they slide, so a card's neighbours change with every consolidation.
- 1479 `specialRules[]:` Lost Game: if no touching pair is left and consolidating changes nothing, the game is over.
- 1480 `specialRules[]:` Choosing Pairs: which pairs you take decides how the grid closes up, and so which cards end up touching next.
- 1511 `objective:` Move all 52 cards to the four foundation piles, built up by suit from Ace to King.
- 1512 `winCondition:` All 52 cards are sorted into their suit foundations.
- 1514 `quickOverview:` La Belle Lucie deals the whole deck face-up into seventeen fans of three cards and one of a single card. Only the top card of a fan can move, onto a foundation or onto the next higher card of its suit. An emptied fan stays empty — and when you are stuck, the fans can be gathered, shuffled and dealt again in threes, twice per game.
- 1518 `layout[]:` Foundations: 4 suit piles at the top-right, initially empty.
- 1519 `layout[]:` Redeal: a marker at the top-left, worth two uses per game. Its pips count them: filled for each redeal left, hollow for each one spent.
- 1520 `layout[]:` Tableau: 17 fans of 3 face-up cards and 1 fan of a single card, in two rows.
- 1523 `cardMovement[]:` Only the top card of a fan can be moved, one card at a time.
- 1524 `cardMovement[]:` A card can go onto a fan whose top card is the same suit and exactly 1 rank higher.
- 1525 `cardMovement[]:` An empty fan can never be filled again.
- 1526 `cardMovement[]:` Press the redeal marker to gather every card left in the fans, shuffle them, and deal them out again in threes from the first fan.
- 1529 `sequenceBuilding[]:` Foundations: Built UP in SAME SUIT from Ace to King.
- 1530 `sequenceBuilding[]:` Fans: Built DOWN in SAME SUIT.
- 1533 `specialRules[]:` Two Redeals: each redeal deals the cards in threes, so the fans grow fewer as the foundations fill. Once both are spent, or no card is left in the fans, the marker becomes a plain outline.
- 1534 `specialRules[]:` Buried Kings: a King can never move except to its foundation, so one dealt above lower cards of its suit blocks them until a redeal.
- 1571 `objective:` Move all 52 cards to the four foundation piles, built up by suit from Ace to King.
- 1572 `winCondition:` All 52 cards are sorted into their suit foundations.
- 1574 `quickOverview:` Trefoil is La Belle Lucie with the four Aces already on the foundations. The other 48 cards are dealt face-up into sixteen fans of three. Only the top card of a fan moves, an emptied fan stays empty, and the fans can be gathered and dealt again twice.
- 1578 `layout[]:` Foundations: 4 suit piles at the top-right, each started with an Ace.
- 1579 `layout[]:` Redeal: a marker at the top-left, worth two uses per game. Its pips count them: filled for each redeal left, hollow for each one spent.
- 1580 `layout[]:` Tableau: 16 fans of 3 face-up cards, in two rows of eight.
- 1583 `cardMovement[]:` Only the top card of a fan can be moved, one card at a time.
- 1584 `cardMovement[]:` A card can go onto a fan whose top card is the same suit and exactly 1 rank higher.
- 1585 `cardMovement[]:` An empty fan can never be filled again.
- 1586 `cardMovement[]:` Press the redeal marker to gather every card left in the fans, shuffle them, and deal them out again in threes from the first fan.
- 1589 `sequenceBuilding[]:` Foundations: Built UP in SAME SUIT from the Ace to King.
- 1590 `sequenceBuilding[]:` Fans: Built DOWN in SAME SUIT.
- 1593 `specialRules[]:` Two Redeals: once both are spent, or no card is left in the fans, the marker becomes a plain outline.
- 1594 `specialRules[]:` With the Aces out of the way from the start, every Two can go home as soon as it is free, which makes Trefoil easier than La Belle Lucie.
- 1610 `objective:` Build all 52 cards onto the four foundations, each in suit from the rank the deal chose, round past the King to the Ace.
- 1611 `winCondition:` All 52 cards are on the foundations.
- 1613 `quickOverview:` Canfield deals thirteen cards to a reserve, turns the next card onto a foundation — its rank is where every foundation starts — and one card to each of four columns. The columns build down in alternating colours, turning the corner from Ace to King, and a space is filled from the reserve at once. The stock is drawn three at a time, as often as you like.
- 1617 `layout[]:` Stock: the face-down cards at the top-left, drawn three at a time onto the waste beside it.
- 1618 `layout[]:` Foundations: 4 piles at the top-right, the first started by the deal.
- 1619 `layout[]:` Reserve: 13 cards under the stock, face-down but for the top card.
- 1620 `layout[]:` Tableau: 4 columns under the foundations, one face-up card each.
- 1623 `cardMovement[]:` The top card of the waste, the top card of the reserve and any properly built run in a column can be moved.
- 1624 `cardMovement[]:` When a column empties, the reserve's top card fills it at once. Once the reserve is gone, a space can be filled from the waste.
- 1625 `cardMovement[]:` Taking a card off the reserve turns up the one beneath it.
- 1626 `cardMovement[]:` Pressing the stock draws three cards onto the waste; pressing the empty stock turns the waste back over.
- 1629 `sequenceBuilding[]:` Foundations: start on the rank of the card the deal turned up, then Built UP in SAME SUIT, from King round to Ace.
- 1630 `sequenceBuilding[]:` Tableau: Built DOWN in ALTERNATING COLORS, from Ace round to King.
- 1633 `specialRules[]:` Unlimited Redeals: the waste can be turned back over as often as you like.
- 1634 `specialRules[]:` The Reserve Is the Game: getting through the reserve's thirteen cards is the usual path to a win, since the stock always comes round again.
- 1676 `objective:` Build all 52 cards onto the four foundations, in suit from the beak's rank, round past the King to the Ace.
- 1677 `winCondition:` All 52 cards are on the foundations.
- 1679 `quickOverview:` Penguin deals the deck face-up into seven columns of seven. The first card dealt, at the top of the first column, is the beak: the other three cards of its rank go straight to the foundations, and every foundation builds up in suit from that rank. Columns build down in suit, turning the corner from Ace to King, and whole runs move at once. Seven cells — the flipper — hold a card each.
- 1683 `layout[]:` Flipper: 7 single-card cells at the top-left.
- 1684 `layout[]:` Foundations: 4 piles at the top-right, three of them started by the deal with the other cards of the beak's rank.
- 1685 `layout[]:` Tableau: 7 columns of 7 face-up cards, the beak at the top of the first.
- 1688 `cardMovement[]:` Any single card can go into an empty cell.
- 1689 `cardMovement[]:` A same-suit run moves as a unit, however long it is and however many cells are free.
- 1690 `cardMovement[]:` An empty column takes only a card of the rank below the beak, or a run headed by one.
- 1693 `sequenceBuilding[]:` Foundations: start on the beak's rank, then Built UP in SAME SUIT, from King round to Ace.
- 1694 `sequenceBuilding[]:` Tableau: Built DOWN in SAME SUIT, from Ace round to King.
- 1697 `specialRules[]:` The Beak: the card at the top of the first column sets the rank every foundation starts on, and it is buried under six more — freeing it is often the first job.
- 1698 `specialRules[]:` Nearly Always Winnable: David Parlett's game can be won from almost every deal with careful play.
- 1714 `objective:` Play every card into the black hole, one rank up or down at a time.
- 1715 `winCondition:` All 52 cards are in the hole.
- 1717 `quickOverview:` Black Hole starts the hole with the Ace of Spades and deals the other 51 cards face-up into seventeen fans of three. The top card of any fan can go into the hole if it is one rank above or below the hole's top card, in any suit — and Ace and King count as neighbours. There is no stock: every card is in view from the start.
- 1721 `layout[]:` Hole: a single foundation in the middle of the top row, started with the Ace of Spades.
- 1722 `layout[]:` Tableau: 17 fans of 3 face-up cards.
- 1725 `cardMovement[]:` Press a fan's top card to play it into the hole, or drag it there.
- 1726 `cardMovement[]:` Nothing is ever placed on a fan: cards only leave them.
- 1729 `sequenceBuilding[]:` Hole: one rank HIGHER or LOWER than its top card, in ANY SUIT, with King and Ace adjacent — a run can climb, fall and turn the corner as it likes.
- 1732 `specialRules[]:` Plan Ahead: with every card in view and no stock to fall back on, the whole game can be worked out before the first move. David Parlett, who invented it, made it a game of foresight rather than luck; most deals can be won.
- 1747 `objective:` Play every card onto the single foundation, one rank up or down at a time.
- 1748 `winCondition:` All 52 cards are on the foundation.
- 1750 `quickOverview:` All in a Row deals the whole deck face-up into thirteen columns of four. Any column's top card can start the foundation; after that, a top card can go onto it if it is one rank above or below the foundation's top card, in any suit, with Ace and King counting as neighbours.
- 1754 `layout[]:` Foundation: a single pile in the middle of the top row, initially empty.
- 1755 `layout[]:` Tableau: 13 columns of 4 face-up cards.
- 1758 `cardMovement[]:` Press a column's top card to play it onto the foundation, or drag it there.
- 1759 `cardMovement[]:` Any top card can start the foundation.
- 1760 `cardMovement[]:` Nothing is ever placed on a column, and an emptied column stays empty.
- 1763 `sequenceBuilding[]:` Foundation: one rank HIGHER or LOWER than its top card, in ANY SUIT, with King and Ace adjacent.
- 1766 `specialRules[]:` The First Card: choosing which card starts the foundation is the most important decision of the game.
- 1781 `objective:` Build each of the twelve foundations round the dial up in suit until its top card shows the hour it stands at.
- 1783 `winCondition:` All 52 cards are on the dial, every foundation ending on its hour — Jack at eleven, Queen at twelve.
- 1785 `quickOverview:` Grandfather's Clock lays twelve cards round a dial, the Two of Spades at five o'clock and each hour clockwise one rank higher, to the King of Diamonds at four. Each builds up in suit, turning the corner from King to Ace, until it reaches its hour. The other forty cards are dealt face-up into eight columns of five, which build down regardless of suit.
- 1789 `layout[]:` Dial: 12 foundations in a circle at the left, started with the Two of Spades at five o'clock through to the King of Diamonds at four o'clock, the suits taken in turn: spades, hearts, clubs, diamonds.
- 1790 `layout[]:` Tableau: 8 columns of 5 face-up cards beside the dial.
- 1793 `cardMovement[]:` Only the top card of a column can be moved, one card at a time.
- 1794 `cardMovement[]:` A card can go onto a column whose top card is exactly 1 rank higher, in any suit.
- 1795 `cardMovement[]:` Any card can fill an empty column.
- 1796 `cardMovement[]:` Double-press a card to send it to the foundation that takes it; each card fits only one.
- 1799 `sequenceBuilding[]:` Foundations: Built UP in SAME SUIT from their starting card, from King round to Ace, until the top card's rank is the hour — so those from five to twelve o'clock take three more cards, and those from one to four o'clock take four.
- 1800 `sequenceBuilding[]:` Tableau: Built DOWN by RANK in ANY SUIT.
- 1803 `specialRules[]:` Telling the Time: Ace counts one, Jack eleven and Queen twelve; once a foundation shows its hour it is complete and takes nothing more.
- 1804 `specialRules[]:` One of the more forgiving patiences: with spaces open to any card, most deals come out.
- 1820 `objective:` Discard the whole deck in pairs that total thirteen, and Kings on their own.
- 1822 `winCondition:` Every card is on the discard — or, under the Pyramid Only goal, the pyramid is cleared.
- 1824 `quickOverview:` Pyramid deals twenty-eight cards face-up in a pyramid of seven rows, each row half covering the one above. A card is free once no card lies over it. Pair free cards that add up to thirteen — Ace and Queen, Two and Jack, and so on — and discard Kings on their own. The stock is turned one card at a time into the hand, where it can pair too.
- 1828 `layout[]:` Pyramid: 28 face-up cards in 7 rows, each card half covered by the two below it.
- 1829 `layout[]:` Stock: the other 24 cards, face-down at the top-left, with the hand beside it.
- 1830 `layout[]:` Waste: the turned cards that found no pair, at the top-right; only its top card is free.
- 1831 `layout[]:` Discard: a single pile at the top-right, initially empty.
- 1834 `cardMovement[]:` Drag a free card onto another free card that adds up to thirteen with it, and both go to the discard.
- 1835 `cardMovement[]:` Drag a King to the discard, or double-press it; it needs no partner.
- 1836 `cardMovement[]:` Double-press a free card to pair it with the first free partner.
- 1837 `cardMovement[]:` Press the stock to turn its top card into the hand; the card held there moves to the waste.
- 1840 `sequenceBuilding[]:` Nothing is built: cards only leave, two at a time or a King alone.
- 1841 `sequenceBuilding[]:` Values: Ace 1, Two to Ten as marked, Jack 11, Queen 12, King 13.
- 1842 `sequenceBuilding[]:` A free card is a pyramid card with nothing over it, the card in the hand, or the waste's top card.
- 1845 `specialRules[]:` Covered Cards: each pyramid card is held by the two cards that overlap it from below; it frees once both are gone.
- 1846 `specialRules[]:` Passes: the stock is gone through once, or three times with the 3 Passes option, counted in pips on the empty stock.
- 1892 `objective:` Clear all three peaks by playing their cards onto the waste, one rank up or down at a time.
- 1894 `winCondition:` Every card in the peaks has been played. Cards left in the stock do not matter.
- 1896 `quickOverview:` TriPeaks deals twenty-eight cards as three overlapping peaks: rows of three, six and nine face-down cards over a base of ten face-up ones, with one more card starting the waste. Any uncovered card can be played onto the waste if it is one rank above or below the waste's top card, in any suit, with King and Ace adjacent — and a face-down card turns up as soon as nothing covers it.
- 1900 `layout[]:` Peaks: 28 cards — rows of 3, 6 and 9 face-down cards over a base of 10 face-up cards, each row half covering the one above.
- 1901 `layout[]:` Stock: 23 face-down cards beneath the peaks, turned one at a time.
- 1902 `layout[]:` Waste: a single pile beside the stock, started with one card from the deal.
- 1905 `cardMovement[]:` Press an uncovered card to play it onto the waste, or drag it there.
- 1906 `cardMovement[]:` A card is uncovered once both cards overlapping it from below are gone, and turns face-up at that moment.
- 1907 `cardMovement[]:` Press the stock to turn its top card onto the waste, whatever its rank.
- 1910 `sequenceBuilding[]:` Waste: one rank HIGHER or LOWER than its top card, in ANY SUIT, with King and Ace adjacent — a chain can climb, fall and turn the corner.
- 1913 `specialRules[]:` One Pass: the stock is never recycled.
- 1914 `specialRules[]:` Long Chains: the art is to keep a chain going as long as you can before turning the next stock card, and to uncover the face-down cards of all three peaks evenly.
- 1930 `objective:` Move all 52 cards to the four foundation piles, built up by suit from Ace to King.
- 1931 `winCondition:` All 52 cards are sorted into their suit foundations.
- 1933 `quickOverview:` Beleaguered Castle lays the four Aces out in a column and deals the other 48 cards face-up into eight rows of six, four on each side of the Aces. Only the card at the open end of a row can move, one at a time, onto a foundation or onto a card one rank higher in any suit — and an empty row takes any card.
- 1937 `layout[]:` Foundations: 4 piles in a column down the middle, each started with an Ace.
- 1938 `layout[]:` Rows: 8 rows of 6 face-up cards, fanned sideways, four on each side of the foundations.
- 1939 `layout[]:` No Stock: every card is in view from the first move.
- 1942 `cardMovement[]:` Only the last card of a row — the one fully in view — can be moved, one card at a time.
- 1943 `cardMovement[]:` A card can go onto a row whose last card is exactly 1 rank higher, in any suit.
- 1944 `cardMovement[]:` Any card can fill an empty row.
- 1947 `sequenceBuilding[]:` Foundations: Built UP in SAME SUIT from Ace to King.
- 1948 `sequenceBuilding[]:` Rows: Built DOWN by RANK in ANY SUIT.
- 1951 `specialRules[]:` Every row fans to the right, so the free card of a row in the left wing is the one nearest the foundations.
- 1952 `specialRules[]:` Empty Rows: with no cells, an empty row is the only place to park a card — they are worth more than any single move.
- 1988 `objective:` Move all 52 cards to the four foundation piles, built up by suit from Ace to King.
- 1989 `winCondition:` All 52 cards are sorted into their suit foundations.
- 1991 `quickOverview:` Fortress deals the whole deck face-up into ten rows, five on each side of a column of empty foundations. Only the card at the open end of a row can move, one at a time, onto a foundation or onto a card of its own suit one rank higher or lower.
- 1995 `layout[]:` Foundations: 4 empty piles in a column down the middle.
- 1996 `layout[]:` Rows: 10 face-up rows fanned sideways, five on each side — the first two of six cards, the rest of five.
- 1997 `layout[]:` No Stock: every card is in view from the first move.
- 2000 `cardMovement[]:` Only the last card of a row can be moved, one card at a time.
- 2001 `cardMovement[]:` A card can go onto a row whose last card is the same suit and exactly 1 rank higher or lower.
- 2002 `cardMovement[]:` Any card can fill an empty row.
- 2005 `sequenceBuilding[]:` Foundations: Built UP in SAME SUIT from Ace to King.
- 2006 `sequenceBuilding[]:` Rows: Built UP or DOWN in SAME SUIT, and a row may change direction.
- 2009 `specialRules[]:` A Very Hard Game: with the Aces buried and no cells, PySol calls it a very hard game; plan the order the suits come home in before the first move.
- 2025 `objective:` Place twenty-five cards in a five-by-five grid so its five rows and five columns make the best poker hands you can.
- 2027 `winCondition:` The grid is full and scores at least 200 under American scoring, or 70 under English.
- 2029 `quickOverview:` Poker Squares turns up one card at a time. Drag each into any empty square of a five-by-five grid, where it stays for good. Every row and every column is scored as a poker hand, so each card counts twice — the score in the header keeps the running total as the lines fill.
- 2033 `layout[]:` Stock: the face-down cards at the top-left.
- 2034 `layout[]:` Hand: the card to place next, beneath the stock.
- 2035 `layout[]:` Grid: 25 empty squares in five rows of five.
- 2038 `cardMovement[]:` Drag the card in the hand into any empty square; the next card turns up at once.
- 2039 `cardMovement[]:` A placed card never moves.
- 2040 `cardMovement[]:` Only 25 of the 52 cards are played: the game ends when the grid is full.
- 2043 `sequenceBuilding[]:` American scoring: royal flush 100, straight flush 75, four of a kind 50, full house 25, flush 20, straight 15, three of a kind 10, two pair 5, one pair 2.
- 2044 `sequenceBuilding[]:` English scoring: royal or straight flush 30, four of a kind 16, straight 12, full house 10, three of a kind 6, flush 5, two pair 3, one pair 1.
- 2045 `sequenceBuilding[]:` A straight can run from Ace to Five or from Ten to Ace, but not round the corner.
- 2048 `specialRules[]:` Running Score: a line counts the pairs, threes and fours it already holds, so the score rises as you go; straights and flushes count once all five cards are in.
- 2049 `specialRules[]:` Every Card Counts Twice: each square sits in one row and one column, so the art is to build flushes one way and pairs the other.

## Reference: what each thing, option and variant does

### src/ui/app/provider/game_documentation_data.ts

- 81 `effect:` The original: columns build down in alternating colours and only a King can fill an empty column.
- 86 `effect:` Whitehead: every card is dealt face-up, columns build down in the SAME COLOUR, any card can fill an empty column, and only proper runs can be lifted. Nothing is hidden, so the whole game is planning.
- 91 `effect:` Thumb and Pouch: a card can land on any suit except its own, and any card can fill an empty column — a much looser build than the original, though the deal still hides most of the board.
- 96 `effect:` Saratoga: the original rules, but all 28 column cards are dealt face-up. Only proper alternating-colour runs can be lifted, and only a King can fill an empty column; the stock is the only thing left hidden.
- 106 `effect:` Easier mode. Flips 1 card at a time, making every stock card directly accessible.
- 111 `effect:` Standard challenge. Flips 3 cards at a time; only the top card of the 3 is immediately playable.
- 121 `effect:` Standard scoring: 10 points for each card to a foundation, 5 for a waste card onto a column and for each card turned over, minus 15 for taking a card back off a foundation, and a penalty for recycling the stock past the free passes. The score never drops below zero, and the stock can be recycled as often as you like.
- 126 `effect:` Las Vegas scoring: you start $52 down, having bought the deck at a dollar a card, and win $5 back for every card you put on a foundation (taking one back costs $5). The score can stay negative. The stock can be gone through only once in Draw 1, or three times in Draw 3; pips on the empty stock count the recycles left, and once they are spent it becomes a plain outline.
- 215 `effect:` Easiest mode (104 Spades). Every run is in suit, allowing easy multi-card moves and sequence builds.
- 220 `effect:` Medium mode (Spades & Hearts). Requires balancing mixed-suit building with same-suit runs.
- 225 `effect:` Classic hard challenge (Spades, Hearts, Diamonds, Clubs). Highly tactical and tight sequence control.
- 275 `effect:` Standard game. Tableau columns build down in alternating colors.
- 280 `effect:` Gentler suit variant. Tableau columns build either UP or DOWN in the SAME SUIT.
- 285 `effect:` Hardest variant. Tableau columns build DOWN in the SAME SUIT.
- 290 `effect:` Moosehide: tableau columns build DOWN in any suit except the card's own — Thumb and Pouch's rule on Yukon's deal, and looser than alternating colours.
- 339 `effect:` Standard Baker's Game. Any card can enter an empty column, providing full supermove staging capacity.
- 344 `effect:` Harder variant. Only Kings can enter empty columns, restricting supermoves to (Free Cells + 1).
- 393 `effect:` Challenge FreeCell. Any card can enter an empty column, giving full supermove staging capacity.
- 398 `effect:` Super Challenge FreeCell. Only Kings can enter an empty column, restricting supermoves to (Free Cells + 1).
- 485 `effect:` The original: only a King, or a run headed by one, can fill an empty column, and the first four columns each hide three cards.
- 490 `effect:` Wasp: any card, with everything resting on it, can fill an empty column. Clearing a column becomes a real gain rather than a parking place for one King.
- 495 `effect:` Scorpion II: only the first three columns hide cards, so 40 of the 49 dealt cards are visible from the start. Empty columns still take Kings only.
- 705 `effect:` The standard deal: Klondike's staircase of 1 to 7 cards, burying 21 cards and leaving 24 in the stock.
- 710 `effect:` Will o' the Wisp: a flat 3 cards to every column, burying only 14 but leaving 31 in the stock — fewer hidden cards up front, more forced deals later.
- 800 `effect:` The original and the hardest: build down in suit and move exactly one card at a time.
- 805 `effect:` Josephine (also called Streets): the same same-suit build, but a complete same-suit run can be moved as a unit, which is a large easing.
- 810 `effect:` Rank and File: columns build down in alternating colours and runs move as a unit, but three of every four dealt cards start face-down.
- 815 `effect:` Indian: only three cards to a column, the bottom one face-down, leaving 74 in the stock. A card lands on any suit except its own, one card at a time.
- 820 `effect:` Number Ten: four cards to a column with the bottom two face-down. Columns build down in alternating colours, and a run in sequence moves as a unit.
- 1029 `effect:` Montana as it is usually played: two redeals per game.
- 1034 `effect:` Addiction: three redeals per game. The marker shows three pips, and the extra shuffle rescues many games that two would leave stuck.
- 1086 `effect:` Blue Moon: the gaps are wherever the Aces happened to be dealt, so a row may have to wait for its first gap to open.
- 1091 `effect:` Red Moon: the Aces are dealt straight to the head of the rows and the gaps right beside them, so every row can start building with its Two from the first move. The easier of the two.
- 1184 `effect:` Any Card: the usual game — the top card of any other column can be moved into a space.
- 1189 `effect:` Aces Only: a space can take only an Ace. An Ace dealt on top of a buried card can be lifted off, but no other card can, which makes the game much harder.
- 1239 `effect:` Golf: the original — a King on the foundation blocks it until the next stock card is turned, and an Ace can only take a Two.
- 1244 `effect:` Queens on Kings: a common house rule — a Queen can be played on a King, so a King no longer blocks the foundation. Kings and Aces are still not adjacent.
- 1249 `effect:` Putt Putt: the ranks turn the corner, so a King takes a Queen or an Ace, and an Ace takes a Two or a King. Nothing ever blocks the foundation, which makes it the easiest of the three.
- 1304 `effect:` Calculation: the foundations start on an Ace, a Two, a Three and a Four, and build by ones, twos, threes and fours.
- 1309 `effect:` Sir Tommy, also called Old Patience: the foundations start empty, each begun by an Ace as one turns up and built up by one to the King, regardless of suit. The waste piles work just as in Calculation.
- 1399 `effect:` Bristol: every foundation waits for an Ace to turn up.
- 1404 `effect:` Belvedere: the deal puts one Ace straight onto a foundation, leaving 24 cards in the stock.
- 1489 `effect:` Monte Carlo: touching pairs of the same rank.
- 1494 `effect:` Monte Carlo Thirteens: touching pairs that add up to thirteen — Ace and Queen, Two and Jack, Three and Ten, and so on, with the Ace counting one, the Jack eleven and the Queen twelve. A King adds up to thirteen by itself, so it goes to the discard alone: drag it there or double-press it.
- 1544 `effect:` La Belle Lucie: fans build down in suit, empty fans stay empty, and the fans can be redealt twice.
- 1549 `effect:` The Fan: as La Belle Lucie, but a King — and only a King — can fill an empty fan, and there is no redeal. Each emptied fan becomes a place to free a buried King.
- 1554 `effect:` Shamrocks: fans build up or down by rank in any suit, but no fan may ever hold more than three cards, and there is no redeal. Empty fans stay empty.
- 1644 `effect:` Canfield: columns build down in alternating colours, the reserve fills spaces at once, and the stock is drawn in threes with unlimited redeals.
- 1649 `effect:` Storehouse: the four Twos start the foundations, columns build down in suit, and the stock is drawn one card at a time with two redeals, counted in pips on the empty stock. Easier than Canfield.
- 1654 `effect:` Superior Canfield: the reserve is dealt face-up and fanned so every card in it can be read, and spaces are not filled automatically — any card or run can fill one, whenever you choose.
- 1659 `effect:` Rainbow: columns build down regardless of colour, and the stock is drawn one card at a time with no redeal.
- 1856 `effect:` All Cards: the game is won only once every card, stock and waste included, is discarded.
- 1861 `effect:` Pyramid Only: Relaxed Pyramid — clearing the pyramid wins, whatever is left in the stock and waste.
- 1870 `effect:` 1 Pass: the stock is gone through once.
- 1875 `effect:` 3 Passes: once the stock is out, pressing its slot turns the waste back over, twice per game — Par Pyramid's allowance.
- 1962 `effect:` Beleaguered Castle: the Aces start on the foundations and the rows are dealt six each.
- 1967 `effect:` Streets and Alleys: the Aces are shuffled in, so the left wing's rows are dealt seven cards and the right wing's six, and every foundation waits for its Ace to be dug out. Harder.
- 1972 `effect:` Citadel: as Beleaguered Castle, but while the cards are dealt, any card that can go onto a foundation goes there at once, so the rows start shorter. Easier.
- 2059 `effect:` American: flushes outscore straights, and a score of 200 wins.
- 2064 `effect:` English: a straight is worth more than a flush or a full house, reflecting how hard straights are to build in the grid, and a score of 70 wins.

## Descriptions: blurbs, taglines, page metadata and write-ups

### README.md

- 1 `heading` # Solitaire Collection
- 3 `paragraph` A browser-based Solitaire game engine supporting multiple solitaire variants, built with [Phaser 4](https://phaser.io/) canvas rendering, an [Angular 22](https://angular.dev/) application shell, and [Sass](https://sass-lang.com/) for UI styling.
- 5 `paragraph` Play it at https://fuzzley.games/play/solitaire/.
- 7 `heading` ## Included Solitaire Games
- 9 `list item` - **Klondike**: Classic solitaire supporting Draw 1 and Draw 3 modes and standard or Vegas scoring, with Whitehead, Thumb and Pouch, and Saratoga rule variants.
- 10 `list item` - **FreeCell**: The classic open-information solitaire puzzle game with four reserve cells.
- 11 `list item` - **Spider**: Multi-suit spider solitaire with options for 1-Suit (Easy), 2-Suit (Medium), and 4-Suit (Hard) games.
- 12 `list item` - **Yukon**: Playable in standard Yukon, Alaska, Russian Solitaire, and Moosehide variants.
- 13 `list item` - **Baker's Game**: Predecessor to FreeCell with same-suit column building, with choices for Any Card or Kings Only empty columns.
- 14 `list item` - **Challenge FreeCell**: FreeCell with the Aces and Twos dealt to the bottom of the columns, with Super Challenge FreeCell's Kings-only empty columns as an option.
- 15 `list item` - **Eight Off**: FreeCell cousin featuring eight reserve cells, same-suit column building, and Kings-only empty columns.
- 16 `list item` - **Scorpion**: Yukon-style unconstrained card group moves to build same-suit descending runs, with a 3-card reserve stock; playable as Scorpion, Wasp, or Scorpion II.
- 17 `list item` - **Simple Simon**: Spider-style building and completion on an open board of ten columns with all 52 cards dealt face-up and no stock.
- 18 `list item` - **Mrs. Mop**: Simple Simon's rules with two decks dealt face-up across thirteen 8-card columns.
- 19 `list item` - **Baker's Dozen**: Thirteen 4-card columns with Kings sunk to the bottom; columns build down by rank in any suit, and cleared columns cannot be refilled.
- 20 `list item` - **Seahaven Towers**: Tight reserve-cell game with ten 5-card columns, four cells, same-suit building, and Kings-only empty columns.
- 21 `list item` - **Spiderette**: Single-deck Spider on seven columns with row-dealing stock; playable in standard staircase deal or Will o' the Wisp (flat 3 cards per column).
- 22 `list item` - **Easthaven**: Blends Klondike's alternating-colour building and foundations with Spider's row-dealing stock across seven columns.
- 23 `list item` - **Forty Thieves**: Two-deck patience with 10 columns of 4 cards, eight foundations, single-card moves, and no stock recycling; supports standard Forty Thieves, Josephine, Rank and File, Indian, and Number Ten variants.
- 24 `list item` - **Maria**: Forty Thieves variant on a 9-column grid, building down in alternating colours with multi-card run moves.
- 25 `list item` - **Limited**: Forty Thieves variant on a wide 12-column grid of 3-card columns with same-suit building and multi-card run moves.
- 26 `list item` - **Lucas**: Forty Thieves variant with the eight Aces dealt to the foundations and thirteen 3-card columns, building in suit with same-suit runs.
- 27 `list item` - **Double Klondike**: Two-deck Klondike dealt across nine columns with eight foundations and unlimited stock recycles.
- 28 `list item` - **Montana**: Gaps-style solitaire played on a 4×13 grid without Aces; sort rows from Two to King in suit into spaces left by moved cards, featuring two redeals, or three as Addiction.
- 29 `list item` - **Blue Moon**: Montana with the Aces in play, fixed at the start of four 14-cell rows; Red Moon, which deals the gaps beside the Aces, is its deal option.
- 30 `list item` - **Bisley**: Thirteen open columns building up or down in suit, played onto foundations that climb from each Ace and descend from each King.
- 31 `list item` - **Aces Up**: Four columns dealt a card at a time, discarding every card a higher card of its suit outranks until only the Aces remain; spaces can take any card, or only Aces.
- 32 `list item` - **Golf**: Seven open columns cleared onto a single foundation one rank up or down at a time, with a one-pass stock; Golf, Queens on Kings, and Putt Putt, which turns the corner from King to Ace.
- 33 `list item` - **Calculation**: Four foundations built regardless of suit by ones, twos, threes and fours, from a stock turned a card at a time onto four waste piles; Sir Tommy, which builds every foundation up from an Ace, is its variant option.
- 34 `list item` - **Flower Garden**: Six open beds built down regardless of suit, and a sixteen-card bouquet whose every card is free to play.
- 35 `list item` - **Bristol**: Eight fans of three built down regardless of suit, three reserves the stock deals onto, and foundations built up regardless of suit; Belvedere, which starts with one Ace on a foundation, is its variant option.
- 36 `list item` - **Nestor**: Eight open columns and a four-card reserve, cleared by pairing free cards of the same rank.
- 37 `list item` - **Monte Carlo**: A five-by-five grid cleared by pairing touching cards of the same rank, then closed up and refilled from the stock; Monte Carlo Thirteens, which pairs cards adding up to thirteen, is its variant option.
- 38 `list item` - **La Belle Lucie**: Seventeen fans of three and one single card, built down in suit, with two redeals; The Fan and Shamrocks are its variant options.
- 39 `list item` - **Trefoil**: La Belle Lucie with the Aces dealt to the foundations and the rest in sixteen fans of three.
- 40 `list item` - **Canfield**: Four columns fed from a thirteen-card reserve onto foundations that start on a rank the deal chooses and turn the corner from King to Ace; Storehouse, Superior Canfield and Rainbow are its variant options.
- 41 `list item` - **Penguin**: Seven open columns built down in suit round the corner, a seven-cell flipper, and foundations that start on the rank of the first card dealt.
- 42 `list item` - **Black Hole**: Seventeen open fans of three played into a single foundation started with the Ace of Spades, one rank up or down with King and Ace adjacent.
- 43 `list item` - **All in a Row**: Black Hole's rules on thirteen columns of four, with the foundation started by any card.
- 44 `list item` - **Grandfather's Clock**: Twelve foundations laid round a dial, each built up in suit round the corner to the hour it stands at, from eight open columns.
- 45 `list item` - **Pyramid**: A pyramid of twenty-eight cards taken apart by pairing free cards that total thirteen, with Kings going alone and a stock turned one card at a time; the goal can be every card or the pyramid alone (Relaxed Pyramid), with one pass or three.
- 46 `list item` - **TriPeaks**: Three overlapping peaks cleared onto a single waste one rank up or down with King and Ace adjacent, each face-down card turning up once nothing covers it.
- 47 `list item` - **Beleaguered Castle**: Eight open rows fanned sideways around a column of Aces, built down regardless of suit one card at a time; Streets and Alleys and Citadel are its variant options.
- 48 `list item` - **Fortress**: Ten open rows fanned sideways, built up or down in suit, with every Ace buried.
- 49 `list item` - **Poker Squares**: Twenty-five cards placed one at a time in a five-by-five grid, every row and column scored as a poker hand, by American or English scoring.

### index.html

- 25 `<meta description>` Play free solitaire in your browser: Klondike, Spider, FreeCell, Pyramid, TriPeaks, Golf, Yukon, Canfield and dozens more card games. No download, no sign-up.
- 36 `<meta og:description>` Play free solitaire in your browser: Klondike, Spider, FreeCell, Pyramid, TriPeaks, Golf, Yukon, Canfield and dozens more card games. No download, no sign-up.
- 53 `JSON-LD description` Play free solitaire in your browser: Klondike, Spider, FreeCell, Pyramid, TriPeaks, Golf, Yukon, Canfield and dozens more card games. No download, no sign-up.
- 53 `JSON-LD genre` Solitaire, Card game
- 73 `<noscript> <p>` Free solitaire card games to play in your browser. Turn on JavaScript to play any of them:

### src/ui/app/provider/game_profile_data.ts

- 46 `description:` Turn cards from a stock and build down the columns, uncovering the cards dealt face-down.
- 52 `description:` Every card is dealt face-up, with free cells to park cards in while you sort the columns.
- 58 `description:` Build complete King-to-Ace runs in one suit, which then clear from the board.
- 64 `description:` No stock: move any face-up card, taking every card on top of it along.
- 70 `description:` Two decks dealt into shallow columns, with a long stock to work through.
- 76 `description:` Play cards one rank up or down onto a single pile until the tableau is clear.
- 82 `description:` Short fans of cards played off one at a time, with no free cells to fall back on.
- 88 `description:` Clear the board two cards at a time, pairing cards that match or add up.
- 94 `description:` Feed four columns from a reserve, with foundations that start wherever the deal says.
- 100 `description:` Rows fanned sideways either side of the foundations, every card in view and moved one at a time.
- 105 `description:` Games that follow a pattern of their own.
- 116 `tagline:` The classic: turn the stock, build down in alternating colours.
- 129 `tagline:` Klondike dealt face-up, building down in one colour.
- 137 `tagline:` Klondike where a card lands on any suit but its own.
- 145 `tagline:` Klondike with every column card dealt face-up.
- 152 `tagline:` Every card face-up, with four cells to park cards in.
- 159 `tagline:` Build King-to-Ace runs by suit across ten columns.
- 173 `tagline:` No stock: move any face-up card with everything on it.
- 181 `tagline:` Yukon building up or down in the same suit.
- 187 `tagline:` Yukon building down in the same suit only.
- 193 `tagline:` Yukon where a card lands on any suit but its own.
- 200 `tagline:` FreeCell's ancestor: columns build in a single suit.
- 207 `tagline:` FreeCell with every Ace and Two dealt to the bottom.
- 215 `tagline:` Challenge FreeCell where only Kings fill a space.
- 222 `tagline:` Eight cells, half of them filled, and same-suit columns.
- 229 `tagline:` Drag any face-up card to build Spider's same-suit runs.
- 237 `tagline:` Scorpion where any card can fill an empty column.
- 245 `tagline:` Scorpion with cards hidden in only three columns.
- 252 `tagline:` Spider on an open board: every card face-up, no stock.
- 259 `tagline:` Two decks dealt face-up across thirteen columns, no stock.
- 266 `tagline:` Thirteen open columns, Kings sunk, and spaces never refill.
- 273 `tagline:` Ten columns and four cells, building in suit, Kings to spaces.
- 280 `tagline:` One-deck Spider on seven columns.
- 290 `tagline:` Spiderette dealt three cards to every column.
- 297 `tagline:` Klondike's building with Spider's row-dealing stock.
- 304 `tagline:` One card at a time, from a waste that never recycles.
- 314 `tagline:` Forty Thieves where same-suit runs move as a unit.
- 323 `tagline:` Alternating colours, but most of the deal face-down.
- 331 `tagline:` Columns of three, building on any suit but a card's own.
- 339 `tagline:` Alternating colours with runs, half the deal face-down.
- 346 `tagline:` Forty Thieves on nine columns, in alternating colours.
- 353 `tagline:` Forty Thieves spread over twelve shallow columns.
- 360 `tagline:` Thirteen columns of three, with the Aces already home.
- 367 `tagline:` Klondike from two decks, on nine columns.
- 374 `tagline:` Move cards into the gaps to sort four rows of thirteen.
- 383 `tagline:` Montana with a third redeal.
- 390 `tagline:` Montana with the Aces in play, fixed at the head of each row.
- 400 `tagline:` Blue Moon with every gap dealt beside its Ace.
- 407 `tagline:` Build each suit up from its Ace and down from its King.
- 414 `tagline:` Discard every card a higher card of its suit outranks.
- 422 `tagline:` Play cards a rank up or down onto one pile to clear seven columns.
- 432 `tagline:` Golf where a Queen can be played onto a King.
- 438 `tagline:` Golf where the ranks turn the corner from King to Ace.
- 445 `tagline:` Build four foundations by ones, twos, threes and fours.
- 457 `tagline:` Four foundations from Ace to King, any suit, four waste piles.
- 466 `tagline:` Six beds and a sixteen-card bouquet, every bouquet card in play.
- 474 `tagline:` Eight fans and three reserves the stock deals onto.
- 484 `tagline:` Bristol with one Ace already on a foundation.
- 491 `tagline:` Pair free cards of the same rank until the board is clear.
- 498 `tagline:` Pair touching cards in a five-by-five grid, then close it up.
- 509 `tagline:` Monte Carlo pairing cards that add up to thirteen.
- 516 `tagline:` Eighteen fans built down in suit, with two redeals.
- 528 `tagline:` La Belle Lucie where Kings fill empty fans, with no redeal.
- 536 `tagline:` Fans of at most three, built up or down in any suit.
- 543 `tagline:` La Belle Lucie with the Aces already on the foundations.
- 551 `tagline:` Work through a thirteen-card reserve onto foundations of any rank.
- 562 `tagline:` Canfield from the Twos, building in suit.
- 571 `tagline:` Canfield with the reserve face-up and spaces left open.
- 579 `tagline:` Canfield building regardless of colour, one pass.
- 586 `tagline:` Seven columns in suit, a seven-cell flipper, and a dealt beak.
- 594 `tagline:` Play every card into the hole, a rank up or down round the corner.
- 601 `tagline:` Thirteen columns of four, played onto one pile from any start.
- 608 `tagline:` Build twelve foundations round a dial, each to its hour.
- 616 `tagline:` Pair free cards totalling thirteen to take the pyramid apart.
- 624 `tagline:` Pyramid won once the pyramid itself is cleared.
- 631 `tagline:` Clear three peaks onto the waste, a rank up or down at a time.
- 639 `tagline:` Eight open rows around the Aces, one card at a time.
- 649 `tagline:` Beleaguered Castle with the Aces dealt into the rows.
- 657 `tagline:` Beleaguered Castle sending cards home as they are dealt.
- 664 `tagline:` Ten open rows built up or down in suit, Aces buried.
- 671 `tagline:` Place 25 cards in a grid to make ten poker hands.

## Picture text: alt text and captions

### index.html

- 48 `<meta og:image:alt>` A new game of Klondike solitaire on a green felt table, below the score, time, moves and game controls.

### src/ui/app/component/game_help_modal/game_help_modal.component.html

- 140 `<img [alt]>` {{ screenshot.altText }}

### src/ui/app/component/game_preview/game_preview.component.html

- 14 `<img [alt]>` {{ imageAlt() }}

### src/ui/app/provider/game_documentation_data.ts

- 42 `caption:` Klondike initial deal showing seven tableau columns, stock, waste, and four foundation piles.
- 43 `altText:` Klondike solitaire board overview
- 138 `caption:` FreeCell board with 4 free cells top-left, 4 foundations top-right, and 8 fully face-up tableau columns.
- 139 `altText:` FreeCell board overview
- 177 `caption:` Spider board featuring 10 tableau columns and stock deals at bottom-left.
- 178 `altText:` Spider solitaire board overview
- 237 `caption:` Yukon board featuring 7 tableau columns with face-down and face-up card groups, and 4 foundations.
- 238 `altText:` Yukon solitaire board overview
- 302 `caption:` Baker's Game board with 4 free cells, 4 foundations, and 8 same-suit building tableau columns.
- 303 `altText:` Baker's Game board overview
- 355 `caption:` Challenge FreeCell board with 4 free cells, 4 foundations, and 8 face-up columns, each with an Ace or a Two at the bottom.
- 356 `altText:` Challenge FreeCell board overview
- 410 `caption:` Eight Off board featuring 8 free cells, 4 foundations, and 8 tableau columns.
- 411 `altText:` Eight Off board overview
- 448 `caption:` Scorpion board featuring 7 tableau columns, stock reserve, and foundation area.
- 449 `altText:` Scorpion solitaire board overview
- 507 `caption:` Simple Simon board showing ten fully face-up tableau columns and four foundation slots.
- 508 `altText:` Simple Simon solitaire board overview
- 547 `caption:` Mrs. Mop board showing thirteen face-up columns of eight cards and eight foundation slots.
- 548 `altText:` Mrs. Mop solitaire board overview
- 587 `caption:` Baker's Dozen board showing thirteen face-up columns of four cards and four foundation slots.
- 588 `altText:` Baker's Dozen solitaire board overview
- 627 `caption:` Seahaven Towers board with 4 cells top-left, 4 foundations top-right, and 10 face-up columns of five.
- 628 `altText:` Seahaven Towers solitaire board overview
- 666 `caption:` Spiderette board showing seven columns dealt in a staircase, the row-dealing stock, and four foundation slots.
- 667 `altText:` Spiderette solitaire board overview
- 722 `caption:` Easthaven board showing seven columns of three, the row-dealing stock, and four foundation piles.
- 723 `altText:` Easthaven solitaire board overview
- 761 `caption:` Forty Thieves board with stock and waste top-left, eight foundations across the top, and ten columns of four.
- 762 `altText:` Forty Thieves solitaire board overview
- 832 `caption:` Maria board showing nine face-up columns of four centred beneath the stock, waste and eight foundations.
- 833 `altText:` Maria solitaire board overview
- 871 `caption:` Limited board showing twelve shallow face-up columns of three beneath the stock, waste and eight foundations.
- 872 `altText:` Limited solitaire board overview
- 910 `caption:` Lucas board showing the eight Aces on the foundations and thirteen face-up columns of three beneath them.
- 911 `altText:` Lucas solitaire board overview
- 949 `caption:` Double Klondike board showing nine tableau columns, stock and waste, and eight foundation piles.
- 950 `altText:` Double Klondike solitaire board overview
- 990 `caption:` Montana board showing 48 cards laid in a grid of four rows by thirteen, with four gaps and the redeal marker beside it.
- 991 `altText:` Montana solitaire board overview
- 1046 `caption:` Blue Moon board showing all 52 cards in four rows of fourteen, an Ace at the head of each row, four gaps, and the redeal marker beside the grid.
- 1047 `altText:` Blue Moon solitaire board overview
- 1103 `caption:` Bisley board showing the four Aces at the left of the top row, four empty King foundations at its right, and thirteen face-up columns.
- 1104 `altText:` Bisley solitaire board overview
- 1145 `caption:` Aces Up board showing the stock at the left, four columns of one card each, and the empty discard at the right.
- 1146 `altText:` Aces Up solitaire board overview
- 1201 `caption:` Golf board showing the stock and the foundation along the top, and seven face-up columns of five cards beneath.
- 1202 `altText:` Golf solitaire board overview
- 1261 `caption:` Calculation board showing the stock and the hand at the left, the four foundations started with an Ace, a Two, a Three and a Four, and four empty waste piles beneath them.
- 1262 `altText:` Calculation solitaire board overview
- 1321 `caption:` Flower Garden board showing the sixteen-card bouquet fanned across the top left, four empty foundations at the top right, and six face-up beds of six cards beneath.
- 1322 `altText:` Flower Garden solitaire board overview
- 1360 `caption:` Bristol board showing the stock and three reserves at the top left, four empty foundations at the top right, and eight fans of three cards beneath.
- 1361 `altText:` Bristol solitaire board overview
- 1416 `caption:` Nestor board showing the four reserve cards at the top left, the empty discard at the top right, and eight face-up columns of six cards beneath.
- 1417 `altText:` Nestor solitaire board overview
- 1453 `caption:` Monte Carlo board showing the stock at the left, twenty-five face-up cards in a five-by-five grid, and the empty discard at the right.
- 1454 `altText:` Monte Carlo solitaire board overview
- 1506 `caption:` La Belle Lucie board showing the redeal marker and four empty foundations along the top, and eighteen face-up fans in two rows of nine.
- 1507 `altText:` La Belle Lucie solitaire board overview
- 1566 `caption:` Trefoil board showing the redeal marker at the top-left, the four Aces on their foundations, and sixteen face-up fans of three in two rows of eight.
- 1567 `altText:` Trefoil solitaire board overview
- 1605 `caption:` Canfield board showing the stock and waste at the top-left, the first foundation started by the deal, the thirteen-card reserve under the stock, and four columns of one card each.
- 1606 `altText:` Canfield solitaire board overview
- 1671 `caption:` Penguin board showing the seven cells of the flipper and four foundations along the top, three of them started with the beak's rank, and seven face-up columns of seven beneath.
- 1672 `altText:` Penguin solitaire board overview
- 1709 `caption:` Black Hole board showing the Ace of Spades in the hole at the middle of the top row, and seventeen face-up fans of three around it.
- 1710 `altText:` Black Hole solitaire board overview
- 1742 `caption:` All in a Row board showing the empty foundation in the middle of the top row and thirteen face-up columns of four beneath.
- 1743 `altText:` All in a Row solitaire board overview
- 1776 `caption:` Grandfather's Clock board showing twelve foundations laid round a dial at the left, from the Nine of Diamonds at twelve o'clock round to the Eight of Clubs at eleven, and eight face-up columns of five beside it.
- 1777 `altText:` Grandfather's Clock solitaire board overview
- 1815 `caption:` Pyramid board showing twenty-eight face-up cards in a pyramid of seven rows, the stock and hand at the top-left and the waste and discard at the top-right.
- 1816 `altText:` Pyramid solitaire board overview
- 1887 `caption:` TriPeaks board showing three overlapping peaks of face-down cards over a base of ten face-up cards, with the stock and the waste centred beneath.
- 1888 `altText:` TriPeaks solitaire board overview
- 1925 `caption:` Beleaguered Castle board showing the four Aces in a column down the middle, and eight rows of six cards fanned sideways, four on each side.
- 1926 `altText:` Beleaguered Castle solitaire board overview
- 1983 `caption:` Fortress board showing four empty foundations in a column down the middle and ten rows fanned sideways, five on each side.
- 1984 `altText:` Fortress solitaire board overview
- 2020 `caption:` Poker Squares board showing the stock and the card to place at the left, and the empty five-by-five grid beside them.
- 2021 `altText:` Poker Squares board overview

## Names: games, modes, levels and things

### index.html

- 5 `<title>` Solitaire Collection
- 35 `<meta og:title>` Solitaire Collection
- 53 `JSON-LD name` Solitaire Collection
- 72 `<noscript> <h1>` Solitaire Collection

### src/engine/render/deck/card_back.ts

- 27 `name:` Lattice Blue
- 28 `name:` Lattice Red
- 29 `name:` Classic Blue
- 30 `name:` Royal Red

### src/engine/render/deck/card_deck.ts

- 45 `name:` Classic
- 51 `name:` Corner Pips
- 57 `name:` All Corner Pips
- 64 `name:` Mobile

### src/ui/app/model/table_felt.ts

- 12 `name:` Emerald Felt
- 13 `name:` Deep Ocean
- 14 `name:` Midnight Charcoal
- 15 `name:` Royal Velvet

### src/ui/app/provider/game_catalog.ts

- 934 `pilesName:` free cells and foundations
- 935 `sideName:` free cells
- 945 `name:` Klondike
- 955 `pilesName:` stock and foundations
- 971 `name:` FreeCell
- 980 `name:` Spider
- 985 `pilesName:` stock and foundations
- 998 `name:` Yukon
- 1008 `name:` Baker's Game
- 1031 `name:` Challenge FreeCell
- 1048 `name:` Eight Off
- 1053 `pilesName:` cells and foundations
- 1061 `name:` Scorpion
- 1066 `pilesName:` stock and foundations
- 1075 `name:` Simple Simon
- 1101 `name:` Baker's Dozen
- 1113 `name:` Seahaven Towers
- 1118 `pilesName:` cells and foundations
- 1126 `name:` Forty Thieves
- 1131 `pilesName:` stock, waste and foundations
- 1149 `name:` Maria
- 1154 `pilesName:` stock, waste and foundations
- 1163 `name:` Limited
- 1168 `pilesName:` stock, waste and foundations
- 1177 `name:` Lucas
- 1182 `pilesName:` stock, waste and foundations
- 1191 `name:` Montana
- 1205 `name:` Blue Moon
- 1214 `name:` Double Klondike
- 1219 `pilesName:` stock, waste and foundations
- 1227 `name:` Easthaven
- 1232 `pilesName:` stock and foundations
- 1240 `name:` Spiderette
- 1245 `pilesName:` stock and foundations
- 1256 `name:` Bisley
- 1264 `name:` Aces Up
- 1269 `pilesName:` stock and discard
- 1278 `name:` Golf
- 1283 `pilesName:` stock and foundation
- 1292 `name:` Calculation
- 1297 `pilesName:` stock, hand and foundations
- 1310 `name:` Flower Garden
- 1315 `pilesName:` bouquet and foundations
- 1322 `name:` Bristol
- 1327 `pilesName:` stock, reserves and foundations
- 1336 `name:` Nestor
- 1341 `pilesName:` reserve and discard
- 1349 `name:` Monte Carlo
- 1354 `pilesName:` stock and discard
- 1365 `name:` La Belle Lucie
- 1382 `name:` Trefoil
- 1391 `name:` Canfield
- 1396 `pilesName:` stock, waste and foundations
- 1405 `name:` Penguin
- 1410 `pilesName:` flipper and foundations
- 1418 `name:` Black Hole
- 1430 `name:` All in a Row
- 1439 `name:` Grandfather's Clock
- 1447 `name:` Pyramid
- 1452 `pilesName:` stock, hand, waste and discard
- 1466 `name:` TriPeaks
- 1474 `name:` Beleaguered Castle
- 1487 `name:` Fortress
- 1495 `name:` Poker Squares
- 1500 `pilesName:` stock and the card to place

### src/ui/app/provider/game_documentation_data.ts

- 37 `title:` Klondike Solitaire
- 133 `title:` FreeCell
- 172 `title:` Spider Solitaire
- 232 `title:` Yukon Solitaire
- 297 `title:` Baker's Game
- 351 `title:` Challenge FreeCell
- 405 `title:` Eight Off
- 443 `title:` Scorpion Solitaire
- 502 `title:` Simple Simon
- 582 `title:` Baker's Dozen
- 622 `title:` Seahaven Towers
- 661 `title:` Spiderette
- 717 `title:` Easthaven
- 756 `title:` Forty Thieves
- 827 `title:` Maria
- 866 `title:` Limited
- 905 `title:` Lucas
- 944 `title:` Double Klondike
- 985 `title:` Montana
- 1041 `title:` Blue Moon
- 1098 `title:` Bisley
- 1140 `title:` Aces Up
- 1196 `title:` Golf
- 1256 `title:` Calculation
- 1316 `title:` Flower Garden
- 1355 `title:` Bristol
- 1411 `title:` Nestor
- 1448 `title:` Monte Carlo
- 1501 `title:` La Belle Lucie
- 1561 `title:` Trefoil
- 1600 `title:` Canfield
- 1666 `title:` Penguin
- 1704 `title:` Black Hole
- 1738 `title:` All in a Row
- 1772 `title:` Grandfather's Clock
- 1810 `title:` Pyramid
- 1882 `title:` TriPeaks
- 1920 `title:` Beleaguered Castle
- 1979 `title:` Fortress
- 2015 `title:` Poker Squares

### src/ui/app/provider/game_profile_data.ts

- 44 `name:` Klondike family
- 50 `name:` FreeCell family
- 56 `name:` Spider family
- 62 `name:` Yukon family
- 68 `name:` Forty Thieves family
- 74 `name:` Golf family
- 80 `name:` Fan family
- 86 `name:` Pairing games
- 92 `name:` Canfield family
- 98 `name:` Castle family
- 104 `name:` More games
- 125 `name:` Whitehead
- 133 `name:` Thumb and Pouch
- 141 `name:` Saratoga
- 179 `name:` Alaska
- 185 `name:` Russian Solitaire
- 191 `name:` Moosehide
- 213 `name:` Super Challenge FreeCell
- 235 `name:` Wasp
- 241 `name:` Scorpion II
- 286 `name:` Will o' the Wisp
- 310 `name:` Josephine
- 316 `aliases[]:` Streets
- 319 `name:` Rank and File
- 327 `name:` Indian
- 335 `name:` Number Ten
- 378 `aliases[]:` Gaps
- 381 `name:` Addiction
- 396 `name:` Red Moon
- 428 `name:` Queens on Kings
- 436 `name:` Putt Putt
- 449 `aliases[]:` Broken Intervals
- 452 `name:` Sir Tommy
- 459 `aliases[]:` Old Patience
- 470 `aliases[]:` The Garden
- 470 `aliases[]:` Bouquet
- 480 `name:` Belvedere
- 502 `aliases[]:` Weddings
- 505 `name:` Monte Carlo Thirteens
- 520 `aliases[]:` Fair Lucy
- 520 `aliases[]:` Midnight Oil
- 523 `name:` The Fan
- 532 `name:` Shamrocks
- 555 `aliases[]:` Demon
- 555 `aliases[]:` Fascination
- 558 `name:` Storehouse
- 564 `aliases[]:` Thirteen Up
- 564 `aliases[]:` Reserve
- 567 `name:` Superior Canfield
- 575 `name:` Rainbow
- 612 `aliases[]:` Clock
- 622 `name:` Relaxed Pyramid
- 635 `aliases[]:` Three Peaks
- 635 `aliases[]:` Tri Towers
- 645 `name:` Streets and Alleys
- 653 `name:` Citadel
- 675 `aliases[]:` Poker Solitaire

## Labels: buttons, menus, headings, readouts and settings

### src/ui/app/component/app/app.component.ts

- 81 `setTitle()` {this.catalog.selectedEntry.name} · Solitaire Collection

### src/ui/app/component/game_browser/game_browser.component.html

- 3 `<fz-dialog label>` Choose a game
- 9 `<h2>` Choose a game
- 43 `<input [placeholder]>` {{ placeholder }}
- 69 `<button>` @if (chip.pressed) { } {{ chip.label }}
- 84 `<button>` Clear
- 163 `<span>` &nbsp;· {{ row.rules }}
- 172 `<span>` Playing
- 183 `<span>` 2 decks
- 195 `<button>` Show every game

### src/ui/app/component/game_browser/game_browser.component.ts

- 134 `placeholder =` Search {this.items.length} games
- 170 `section()` Best matches
- 191 `section()` Recent
- 246 `label:` All cards visible
- 503 `label[]:` variant of {item.parentName}
- 507 `label[]:` playing now

### src/ui/app/component/game_canvas/game_canvas.component.html

- 5 `<fz-phaser-canvas [label]>` {{ boardLabel() }}

### src/ui/app/component/game_preview/game_preview.component.html

- 3 `<button>` All games
- 55 `<button>` How to play

### src/ui/app/component/game_preview/game_preview.component.ts

- 88 `computed()` The {this.item().name} board, as dealt
- 113 `computed()` Variant of {item.parentName}
- 116 `computed()` All cards visible
- 122 `computed()` Play {this.item().name}
- 124 `computed()` Keep playing
- 125 `computed()` Deal with these rules

### src/ui/app/component/header_bar/header_bar.component.html

- 35 `<span>` SCORE
- 39 `<span>` TIME
- 43 `<span>` MOVES
- 58 `<span>` Undo
- 76 `<span>` Restart
- 89 `<span>` New game

### src/ui/app/component/header_bar/header_bar.component.ts

- 25 `label:` Restart
- 26 `label:` How to Play
- 27 `label:` Report a Bug
- 63 `computed()` {this.gameName()}, choose a game
- 67 `switcherTitle =` Choose a game ({this.browser.shortcutLabel})

### src/ui/app/component/settings_drawer/settings_drawer.component.html

- 1 `<fz-dialog label>` Game options
- 4 `<h2>` Game Options
- 46 `<span>` Card Back Design
- 90 `<span>` Desktop Cards
- 155 `<span>` Theme
- 162 `<span>` Felt
- 164 `<button>` From the theme
- 199 `<span>` Game Rules & Documentation
- 200 `<button>` How to Play {{ activeGameTitle() }}
- 234 `<button>` Done

### src/ui/app/component/settings_drawer/settings_drawer.component.ts

- 100 `label:` Auto
- 114 `label:` Mobile
- 120 `label:` Desktop
- 133 `label:` Auto
- 142 `label:` Top
- 143 `label:` Bottom
- 160 `label:` Auto
- 169 `label:` Left
- 170 `label:` Right
- 236 `computed()` Solitaire
- 283 `label:` Piles
- 302 `label:` {titleCase(this.sideName() ?? "stock")} Side
- 320 `label:` Card Style
- 370 `computed()` Felt: {TABLE\_FELTS[felt].name}
- 372 `computed()` Felt: from the theme ({palette?.name ?? this.palette()})

### src/ui/app/model/game_profile.model.ts

- 15 `[Difficulty.EASY]:` Easy
- 16 `[Difficulty.MEDIUM]:` Medium
- 17 `[Difficulty.HARD]:` Hard

### src/ui/app/model/game_search.ts

- 149 `decks =` two decks
- 149 `decks =` one deck
- 150 `visible =` open face up

### src/ui/app/provider/game_catalog.ts

- 375 `label:` Draw Mode
- 378 `label:` Draw 1
- 379 `label:` Draw 3
- 386 `label:` Scoring
- 390 `label:` Standard
- 391 `label:` Vegas
- 398 `label:` Almost Win Mode
- 402 `label:` Normal
- 403 `label:` Almost Win
- 411 `label:` Empty Columns
- 415 `label:` Any Card
- 416 `label:` Kings Only
- 423 `label:` Empty Columns
- 427 `label:` Any Card
- 428 `label:` Kings Only
- 435 `label:` Suits
- 449 `label:` Variant
- 456 `label:` Yukon
- 462 `label:` Alaska
- 468 `label:` Russian Solitaire
- 474 `label:` Moosehide
- 485 `label:` Variant
- 492 `label:` Klondike
- 499 `label:` Whitehead
- 506 `label:` Thumb and Pouch
- 513 `label:` Saratoga
- 524 `label:` Variant
- 531 `label:` Forty Thieves
- 537 `label:` Josephine
- 543 `label:` Rank and File
- 550 `label:` Indian
- 557 `label:` Number Ten
- 569 `label:` Variant
- 576 `label:` Scorpion
- 583 `label:` Wasp
- 589 `label:` Scorpion II
- 600 `label:` Redeals
- 613 `label:` Deal
- 620 `label:` Blue Moon
- 626 `label:` Red Moon
- 638 `label:` Deal
- 645 `label:` Spiderette
- 652 `label:` Will o' the Wisp
- 664 `label:` Empty Columns
- 668 `label:` Any Card
- 669 `label:` Aces Only
- 677 `label:` Variant
- 684 `label:` Golf
- 691 `label:` Queens on Kings
- 697 `label:` Putt Putt
- 709 `label:` Variant
- 716 `label:` Calculation
- 723 `label:` Sir Tommy
- 734 `label:` Variant
- 741 `label:` Bristol
- 747 `label:` Belvedere
- 759 `label:` Variant
- 766 `label:` Monte Carlo
- 772 `label:` Thirteens
- 784 `label:` Variant
- 791 `label:` La Belle Lucie
- 798 `label:` The Fan
- 804 `label:` Shamrocks
- 816 `label:` Variant
- 823 `label:` Canfield
- 830 `label:` Storehouse
- 837 `label:` Superior Canfield
- 844 `label:` Rainbow
- 856 `label:` Goal
- 860 `label:` All Cards
- 864 `label:` Pyramid Only
- 873 `label:` Passes
- 886 `label:` Variant
- 893 `label:` Beleaguered Castle
- 899 `label:` Streets and Alleys
- 905 `label:` Citadel
- 917 `label:` Scoring
- 924 `label:` American
- 926 `label:` English

### src/ui/app/service/game_browser.service.ts

- 22 `shortcutLabel =` Ctrl K

## Hints: setting descriptions, tooltips and prompts

### src/engine/render/deck/card_deck.ts

- 46 `description:` Card artwork unchanged.
- 52 `description:` Marks every ace, king, queen, and jack with suit pips.
- 58 `description:` Marks every card with suit pips.

### src/ui/app/component/header_bar/header_bar.component.html

- 20 `<button [title]>` {{ switcherTitle }}
- 54 `<button title>` Undo last move
- 72 `<button title>` Restart current game
- 85 `<button title>` Start a brand new game
- 98 `<button title>` How to Play / Game Rules
- 111 `<button title>` Report a Bug
- 132 `<button title>` Game Settings

### src/ui/app/component/settings_drawer/settings_drawer.component.html

- 157 `<p>` Shared with fuzzley.games and every game.
- 212 `<span>` Found a Problem?
- 213 `<a>` Report a Bug (opens GitHub in a new tab)

### src/ui/app/component/settings_drawer/settings_drawer.component.ts

- 102 `description:` Mobile cards on a phone, upright or on its side; desktop cards on a larger screen.
- 115 `description:` A big rank and suit and no artwork, on every screen.
- 122 `description:` The card artwork, with the pips chosen below, on every screen.
- 149 `pilesDescription() returns` The {pilesName} along the top, or at the top of a sideways phone's rails.
- 150 `pilesDescription() returns` The {pilesName} along the bottom, under your thumb, or at the foot of a sideways phone's rails.
- 192 `autoDescription() returns` {label(picks("phone-portrait"))} on a phone, upright or on its side,
- 193 `autoDescription() returns` and {label(picks("roomy"))} on a larger screen: {label(here)} here.

### src/ui/app/provider/game_catalog.ts

- 376 `description:` Draw 1 is easier; Draw 3 is the standard Solitaire challenge.
- 388 `description:` Vegas buys the deck for $52 and pays $5 for every card on a foundation, but allows only one pass through the stock in Draw 1 and three in Draw 3.
- 400 `description:` Pre-populates foundations so that dragging the remaining Kings will win the game.
- 413 `description:` Kings Only is the harder variant: it also caps how many cards move at once, because a run can no longer be staged in an empty column.
- 425 `description:` Kings Only is Super Challenge FreeCell: it also caps how many cards move at once, because a run can no longer be staged in an empty column.
- 437 `description:` Always 104 cards — fewer suits means more copies of each, and a far gentler game.
- 451 `description:` Alaska and Russian Solitaire deal like Yukon but build the columns by suit rather than by alternating color; Moosehide lets a card land on any suit but its own.
- 457 `description:` Build down in alternating colours.
- 463 `description:` Build up or down in suit.
- 469 `description:` Build down in suit; the hardest of the four.
- 475 `description:` Build down on any suit but a card's own.
- 487 `description:` Whitehead deals every card face-up and builds in one colour; Thumb and Pouch lets a card land on any suit but its own. Both let any card fill an empty column. Saratoga is Klondike with every column card dealt face-up.
- 494 `description:` Build down in alternating colours; only a King fills an empty column.
- 501 `description:` Every card face-up, building down in one colour; any card fills an empty column.
- 508 `description:` Build on any suit but a card's own; any card fills an empty column.
- 514 `description:` Klondike with every column card dealt face-up.
- 526 `description:` Josephine lets same-suit runs move as a unit; Rank and File builds in alternating colours but buries three of every four cards. Indian deals three to a column and builds on any other suit; Number Ten buries two of four and builds in alternating colours.
- 532 `description:` Build down in suit, one card at a time.
- 538 `description:` Build down in suit, and move a same-suit run as a unit.
- 545 `description:` Alternating colours and runs, but three in four cards dealt face-down.
- 552 `description:` Three cards to a column, building on any suit but a card's own.
- 559 `description:` Alternating colours and runs, with half the deal face-down.
- 571 `description:` Wasp lets any card or run fill an empty column; Scorpion II buries cards in only the first three columns.
- 578 `description:` Only a King fills an empty column; four columns hide three cards.
- 584 `description:` Any card, with all it carries, fills an empty column.
- 590 `description:` Only the first three columns hide cards.
- 602 `description:` Three redeals is the game called Addiction: one more chance to shuffle the stuck cards back out.
- 615 `description:` Red Moon deals the gaps right beside the Aces, so every row can start building at once; Blue Moon leaves them wherever the Aces fell.
- 621 `description:` The gaps lie wherever the Aces were dealt.
- 628 `description:` The gaps are dealt beside the Aces, so every row starts at once.
- 640 `description:` Will o' the Wisp deals a flat three cards to every column instead of Klondike's staircase, burying fewer cards but leaving more in the stock.
- 647 `description:` Klondike's staircase of one to seven cards, with 24 in the stock.
- 654 `description:` Three cards to every column, burying fewer but leaving 31 in the stock.
- 666 `description:` Aces Only is the harder game: a space can only take an Ace, so every other card has to wait for the discard.
- 679 `description:` Golf lets nothing onto a King; one house rule lets a Queen go there. Putt Putt turns the corner, so a King and an Ace are a rank apart both ways.
- 686 `description:` Nothing goes on a King, so a King blocks until the next stock card.
- 692 `description:` A Queen can go on a King, so a King no longer blocks.
- 699 `description:` The ranks turn the corner: a King takes an Ace, and an Ace a King.
- 711 `description:` Sir Tommy builds every foundation up by one from an Ace, which the player has to wait for, rather than by Calculation's four intervals.
- 718 `description:` Foundations start on A, 2, 3 and 4, and build by ones, twos, threes and fours.
- 724 `description:` Each foundation starts on an Ace and builds up by one.
- 736 `description:` Belvedere starts one foundation with an Ace, so there is somewhere to play from the first move.
- 742 `description:` Every foundation waits for an Ace to turn up.
- 749 `description:` One Ace starts on a foundation, so there is a play from the first move.
- 761 `description:` Thirteens pairs touching cards that add up to thirteen, and lets a King go on its own.
- 767 `description:` Pair touching cards of the same rank.
- 774 `description:` Pair touching cards that add up to thirteen; a King goes alone.
- 786 `description:` The Fan lets a King fill an empty fan but allows no redeal; Shamrocks builds up or down in any suit, but never past three cards to a fan.
- 793 `description:` Build down in suit, with two redeals; empty fans stay empty.
- 799 `description:` Only a King fills an empty fan, and there is no redeal.
- 806 `description:` Build up or down in any suit, never past three cards; no redeal.
- 818 `description:` Storehouse starts the foundations with the Twos and builds in suit; Superior Canfield deals the reserve face-up and leaves spaces for you to fill; Rainbow builds regardless of colour from a one-pass stock.
- 825 `description:` Alternating colours, with the stock drawn in threes and redealt freely.
- 832 `description:` The Twos start the foundations; build in suit, one card at a time.
- 839 `description:` The reserve is dealt face-up, and you fill spaces yourself.
- 846 `description:` Build regardless of colour, one card at a time, with no redeal.
- 858 `description:` Pyramid Only is Relaxed Pyramid: clearing the pyramid wins, whatever is left in the stock and waste.
- 875 `description:` Three passes turns the waste back over twice, as Par Pyramid allows.
- 888 `description:` Streets and Alleys deals the Aces into the rows instead of the foundations; Citadel sends every card it can home while dealing.
- 894 `description:` The Aces start on the foundations; six cards to a row.
- 900 `description:` The Aces are shuffled in, and have to be dug out.
- 907 `description:` Cards go home as they are dealt, so the rows start shorter.
- 919 `description:` American scoring pays most for flushes and wins at 200; English scoring pays more for a straight than a flush and wins at 70.

### src/ui/app/service/game_lifecycle.service.ts

- 152 `title:` Confirm Action

## Messages: notices, confirmations, explanations and errors

### src/ui/app/component/game_browser/game_browser.component.html

- 174 `<span>` @for (on of row.dots; track $index) { } {{ row.difficulty }}

### src/ui/app/component/game_browser/game_browser.component.ts

- 262 `computed()` No games match “{this.query().trim()}”.
- 263 `computed()` No games match these filters.
- 286 `text =` No games match.

### src/ui/app/component/game_canvas/game_canvas.component.html

- 37 `(text)` Loading {{ gameName() }}...
- 58 `(text)` Loading {{ deckName }} cards...

### src/ui/app/service/game_lifecycle.service.ts

- 10 `SWITCH_GAME_MESSAGE =` Are you sure you want to switch games? Your current progress will be lost.
- 47 `message =` Switch to {name}? Your current progress will be lost.
- 48 `message =` Deal a new game of {name} by these rules? Your current progress will be lost.
- 72 `confirmIfInProgress()` Are you sure you want to restart this game? Your current progress will be lost.
- 85 `confirmIfInProgress()` Are you sure you want to start a new game? Your current progress will be lost.
- 99 `confirmIfInProgress()` Changing this will deal a new game. Are you sure you want to proceed?
- 129 `confirmIfInProgress()` Are you sure you want to load this game? Your current progress will be lost.

### src/ui/app/service/presentation_settings.service.ts

- 231 `computed()` Couldn't load {deckName(failed)} — still using {deckName( this.drawnCardDeckSignal(), )}.

## Results: win, lose, clear and records

### src/ui/app/component/victory_overlay/victory_overlay.component.html

- 4 `<fz-dialog label>` You won
- 12 `<h2>` Congratulations!
- 13 `<p>` You have successfully cleared the board!
- 21 `<dt>` Score
- 25 `<dt>` Time
- 29 `<dt>` Moves
- 35 `<button>` New game
- 43 `<button>` Choose another game

## Spoken text: labels and announcements for screen readers

### src/ui/app/component/game_browser/game_browser.component.html

- 14 `<button aria-label>` Close game browser
- 37 `<input aria-label>` Search games
- 62 `<div aria-label>` Filter games
- 113 `<div aria-label>` Games
- 135 `<div [aria-label]>` {{ row.label }}

### src/ui/app/component/game_help_modal/game_help_modal.component.html

- 37 `<button aria-label>` Close documentation
- 49 `<div aria-label>` Documentation sections

### src/ui/app/component/game_preview/game_preview.component.html

- 29 `<ul aria-label>` At a glance

### src/ui/app/component/header_bar/header_bar.component.html

- 18 `<button [aria-label]>` {{ switcherLabel() }}
- 55 `<button aria-label>` Undo last move
- 73 `<button aria-label>` Restart current game
- 86 `<button aria-label>` New game
- 99 `<button aria-label>` How to Play / Game Rules
- 112 `<button aria-label>` Report a Bug (opens GitHub in a new tab)
- 133 `<button aria-label>` Game Settings

### src/ui/app/component/settings_drawer/settings_drawer.component.html

- 9 `<button aria-label>` Close game options
- 184 `<button [aria-label]>` {{ swatch.name }}

### src/ui/app/component/settings_drawer/settings_drawer.component.ts

- 430 `describeSide() returns` The {this.sideName() ?? "stock"} at the {rule} of the table.
