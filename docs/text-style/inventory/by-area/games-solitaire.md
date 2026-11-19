# Text inventory: games/solitaire

Written by `extract.mjs`; do not edit by hand. Each entry gives its line,
where it sits, and its text, with `{{ … }}` or `{…}` where a value is put
in, keys in square brackets and bold lead-ins in asterisks.

## How to play and rules

### src/ui/app/component/game_help_modal/game_help_modal.component.html

- 3 `<fz-dialog [label]>` {{ dialogLabel() }}
- 22 `<span>` Wikipedia
- 47 `<button>` Overview
- 62 `<button>` Rules
- 78 `<button>` Options
- 112 `<h3>` Goal
- 138 `<p>` Couldn't load the picture
- 160 `<h3>` Layout
- 172 `<h3>` Moves
- 182 `<h3>` Good to know
- 227 `<h3>` No rules yet
- 235 `<button>` Close

### src/ui/app/component/game_help_modal/game_help_modal.component.ts

- 69 `computed()` How to play {this.modalTitle()}

### src/ui/app/provider/game_documentation_data.ts

- 47 `facts:` 1 deck. Draw 1 or Draw 3.
- 48 `goal:` Move all 52 cards to the 4 foundations, building each suit up from Ace to King.
- 52 `layout[]:` Stock: the cards left over, face down.
- 53 `layout[]:` Waste: the cards you turn over. You can play the top one.
- 54 `layout[]:` Foundations: 4 empty piles.
- 55 `layout[]:` Tableau: 7 columns of 1 to 7 cards. Only the top card is face up.
- 58 `moves[]:` Foundations: build up by suit, from Ace to King.
- 59 `moves[]:` Tableau: build down in alternating colors. A red 9 goes on a black 10.
- 60 `moves[]:` Click the stock to turn over 1 card, or 3 in Draw 3.
- 61 `moves[]:` You can move a face-up run as one.
- 62 `moves[]:` Only a King can fill an empty column.
- 63 `moves[]:` When the stock runs out, click it to turn the waste over and go through it again.
- 65 `goodToKnow[]:` You can take a card back from a foundation.
- 134 `facts:` 1 deck, all dealt face up. No stock.
- 135 `goal:` Move all 52 cards to the 4 foundations, building each suit up from Ace to King.
- 139 `layout[]:` Free cells: 4 spaces, for 1 card each.
- 140 `layout[]:` Foundations: 4 empty piles.
- 141 `layout[]:` Tableau: 8 columns of 6 or 7 cards.
- 144 `moves[]:` Foundations: build up by suit, from Ace to King.
- 145 `moves[]:` Tableau: build down in alternating colors. A red 9 goes on a black 10.
- 146 `moves[]:` You can move the top card of a column to an empty free cell.
- 147 `moves[]:` Any card can fill an empty column.
- 148 `moves[]:` You can move several cards at once if there are enough free cells and empty columns to move them one at a time. With 2 free cells and no empty column, that is 3 cards.
- 151 `goodToKnow[]:` When you move cards into an empty column, that column doesn't count toward how many you can move.
- 167 `facts:` 2 decks. 1, 2 or 4 suits. No redeal.
- 168 `goal:` Clear the table by building 8 runs, each from King down to Ace in a single suit.
- 172 `layout[]:` Stock: the 50 cards left over, face down.
- 173 `layout[]:` Foundations: 8 empty piles, where finished runs go.
- 174 `layout[]:` Tableau: 10 columns of 5 or 6 cards. Only the top card is face up.
- 177 `moves[]:` Tableau: build down in any suit. Any 9 goes on any 10.
- 178 `moves[]:` You can move several cards at once only if they run down in the same suit.
- 179 `moves[]:` Any card or run can fill an empty column.
- 180 `moves[]:` Click the stock to deal 1 card face up onto every column.
- 181 `moves[]:` When you finish a run from King to Ace in a single suit, it moves to a foundation on its own.
- 183 `goodToKnow[]:` You can't deal from the stock while a column is empty.
- 217 `facts:` 1 deck, all dealt to the columns. No stock.
- 218 `goal:` Move all 52 cards to the 4 foundations, building each suit up from Ace to King.
- 222 `layout[]:` Foundations: 4 empty piles.
- 223 `layout[]:` Tableau: 7 columns. The first has 1 card. The others have 1 to 6 face-down cards under 5 face-up ones.
- 226 `moves[]:` Foundations: build up by suit, from Ace to King.
- 227 `moves[]:` Tableau: build down in alternating colors. A red 9 goes on a black 10.
- 228 `moves[]:` You can pick up any face-up card, with all the cards on top of it.
- 229 `moves[]:` Only a King can fill an empty column.
- 232 `goodToKnow[]:` The cards on top don't need to be in order. Only the card you pick up has to fit where it goes.
- 273 `facts:` FreeCell, building by suit. 1 deck, all dealt face up.
- 274 `goal:` Move all 52 cards to the 4 foundations, building each suit up from Ace to King.
- 278 `layout[]:` Free cells: 4 spaces, for 1 card each.
- 279 `layout[]:` Foundations: 4 empty piles.
- 280 `layout[]:` Tableau: 8 columns of 6 or 7 cards.
- 283 `moves[]:` Foundations: build up by suit, from Ace to King.
- 284 `moves[]:` Tableau: build down by suit. The 9 of spades goes on the 10 of spades.
- 285 `moves[]:` You can move the top card of a column to an empty free cell.
- 286 `moves[]:` Any card can fill an empty column, unless you choose Kings only.
- 287 `moves[]:` You can move several cards at once if there are enough free cells and empty columns to move them one at a time.
- 290 `goodToKnow[]:` When you move cards into an empty column, that column doesn't count toward how many you can move.
- 321 `facts:` FreeCell with every Ace and 2 dealt to the bottom. 1 deck, all face up.
- 322 `goal:` Move all 52 cards to the 4 foundations, building each suit up from Ace to King.
- 326 `layout[]:` Free cells: 4 spaces, for 1 card each.
- 327 `layout[]:` Foundations: 4 empty piles.
- 328 `layout[]:` Tableau: 8 columns of 6 or 7 cards.
- 331 `moves[]:` Foundations: build up by suit, from Ace to King.
- 332 `moves[]:` Tableau: build down in alternating colors. A red 9 goes on a black 10.
- 333 `moves[]:` You can move the top card of a column to an empty free cell.
- 334 `moves[]:` Any card can fill an empty column, unless you choose Kings only.
- 335 `moves[]:` You can move several cards at once if there are enough free cells and empty columns to move them one at a time.
- 338 `goodToKnow[]:` You can't start a foundation until you clear all the cards off an Ace.
- 339 `goodToKnow[]:` If you move cards into an empty column, that column doesn't count.
- 369 `facts:` 1 deck, all dealt face up. No stock.
- 370 `goal:` Move all 52 cards to the 4 foundations, building each suit up from Ace to King.
- 374 `layout[]:` Free cells: 8 spaces, for 1 card each. 4 of them start with a card.
- 375 `layout[]:` Foundations: 4 empty piles.
- 376 `layout[]:` Tableau: 8 columns of 6 cards.
- 379 `moves[]:` Foundations: build up by suit, from Ace to King.
- 380 `moves[]:` Tableau: build down by suit. The 9 of spades goes on the 10 of spades.
- 381 `moves[]:` You can move the top card of a column to an empty free cell.
- 382 `moves[]:` Only a King can fill an empty column.
- 383 `moves[]:` You can move several cards at once if there are enough empty free cells to move them one at a time. With 4 empty free cells, that is 5 cards.
- 386 `goodToKnow[]:` Unlike in FreeCell, you can't use an empty column to move more cards at once.
- 402 `facts:` 1 deck. A stock of 3 cards, dealt once.
- 403 `goal:` Clear the table by building 4 runs, each from King down to Ace in a single suit.
- 407 `layout[]:` Stock: the 3 cards left over, face down.
- 408 `layout[]:` Foundations: 4 empty piles, where finished runs go.
- 409 `layout[]:` Tableau: 7 columns of 7 cards. The first 4 have 3 face-down cards under 4 face-up ones.
- 412 `moves[]:` Tableau: build down by suit. The 9 of spades goes on the 10 of spades.
- 413 `moves[]:` You can pick up any face-up card, with all the cards on top of it.
- 414 `moves[]:` Only a King can fill an empty column.
- 415 `moves[]:` Click the stock to deal its 3 cards face up onto the first 3 columns.
- 416 `moves[]:` When you finish a run from King to Ace in a single suit, it moves to a foundation on its own.
- 418 `goodToKnow[]:` The cards on top don't need to be in order.
- 453 `facts:` 1 deck, all dealt face up. No stock.
- 454 `goal:` Clear the table by building 4 runs, each from King down to Ace in a single suit.
- 458 `layout[]:` Foundations: 4 empty piles, where finished runs go.
- 459 `layout[]:` Tableau: 10 columns. The first 3 have 8 cards, and the rest go down from 7 to 1.
- 462 `moves[]:` Tableau: build down in any suit. Any 9 goes on any 10.
- 463 `moves[]:` You can move several cards at once only if they run down in the same suit.
- 464 `moves[]:` Any card or run can fill an empty column.
- 465 `moves[]:` When you finish a run from King to Ace in a single suit, it moves to a foundation on its own.
- 480 `facts:` Simple Simon with 2 decks, on 13 columns. No stock.
- 481 `goal:` Clear the table by building 8 runs, each from King down to Ace in a single suit.
- 485 `layout[]:` Foundations: 8 empty piles, where finished runs go.
- 486 `layout[]:` Tableau: 13 columns of 8 cards, all face up.
- 489 `moves[]:` Tableau: build down in any suit. Any 9 goes on any 10.
- 490 `moves[]:` You can move several cards at once only if they run down in the same suit.
- 491 `moves[]:` Any card or run can fill an empty column.
- 492 `moves[]:` When you finish a run from King to Ace in a single suit, it moves to a foundation on its own.
- 508 `facts:` 1 deck, all dealt face up. No stock.
- 509 `goal:` Move all 52 cards to the 4 foundations, building each suit up from Ace to King.
- 513 `layout[]:` Foundations: 4 empty piles.
- 514 `layout[]:` Tableau: 13 columns of 4 cards.
- 517 `moves[]:` Foundations: build up by suit, from Ace to King.
- 518 `moves[]:` Tableau: build down in any suit. Any 9 goes on any 10.
- 519 `moves[]:` You can only move the top card of a column, 1 card at a time.
- 520 `moves[]:` Nothing can fill an empty column, so once a column is empty it stays empty.
- 523 `goodToKnow[]:` A King can never move to another column. So the deal puts every King under the other cards in its column.
- 524 `goodToKnow[]:` You can take a card back from a foundation.
- 539 `facts:` 1 deck, all dealt face up. No stock.
- 540 `goal:` Move all 52 cards to the 4 foundations, building each suit up from Ace to King.
- 544 `layout[]:` Free cells: 4 spaces, for 1 card each. 2 of them start with a card.
- 545 `layout[]:` Foundations: 4 empty piles.
- 546 `layout[]:` Tableau: 10 columns of 5 cards.
- 549 `moves[]:` Foundations: build up by suit, from Ace to King.
- 550 `moves[]:` Tableau: build down by suit. The 9 of spades goes on the 10 of spades.
- 551 `moves[]:` You can move the top card of a column to an empty free cell.
- 552 `moves[]:` Only a King can fill an empty column.
- 553 `moves[]:` You can move several cards at once if there are enough empty free cells to move them one at a time. With 2 empty free cells, that is 3 cards.
- 556 `goodToKnow[]:` Unlike in FreeCell, you can't use an empty column to move more cards at once.
- 572 `facts:` Spider with 1 deck, on 7 columns. No redeal.
- 573 `goal:` Clear the table by building 4 runs, each from King down to Ace in a single suit.
- 577 `layout[]:` Stock: the 24 cards left over, face down.
- 578 `layout[]:` Foundations: 4 empty piles, where finished runs go.
- 579 `layout[]:` Tableau: 7 columns of 1 to 7 cards. Only the top card is face up.
- 582 `moves[]:` Tableau: build down in any suit. Any 9 goes on any 10.
- 583 `moves[]:` You can move several cards at once only if they run down in the same suit.
- 584 `moves[]:` Any card or run can fill an empty column.
- 585 `moves[]:` Click the stock to deal 1 card face up onto every column.
- 586 `moves[]:` When you finish a run from King to Ace in a single suit, it moves to a foundation on its own.
- 589 `goodToKnow[]:` Unlike in Spider, you can deal from the stock while a column is empty.
- 621 `facts:` 1 deck. The stock deals a row at a time. No redeal.
- 622 `goal:` Move all 52 cards to the 4 foundations, building each suit up from Ace to King.
- 626 `layout[]:` Stock: the 31 cards left over, face down.
- 627 `layout[]:` Foundations: 4 empty piles.
- 628 `layout[]:` Tableau: 7 columns of 3 cards. Only the top card is face up.
- 631 `moves[]:` Foundations: build up by suit, from Ace to King.
- 632 `moves[]:` Tableau: build down in alternating colors. A red 9 goes on a black 10.
- 633 `moves[]:` You can move several cards at once only if they run down in alternating colors.
- 634 `moves[]:` Only a King can fill an empty column.
- 635 `moves[]:` Click the stock to deal 1 card face up onto every column.
- 638 `goodToKnow[]:` You can't deal from the stock while a column is empty.
- 639 `goodToKnow[]:` You can take a card back from a foundation.
- 655 `facts:` 2 decks. Draw 1. No redeal.
- 656 `goal:` Move all 104 cards to the 8 foundations, building each suit up from Ace to King.
- 660 `layout[]:` Stock: the 64 cards left over, face down.
- 661 `layout[]:` Waste: the cards you turn over. You can play the top one.
- 662 `layout[]:` Foundations: 8 empty piles.
- 663 `layout[]:` Tableau: 10 columns of 4 cards, all face up.
- 666 `moves[]:` Foundations: build up by suit, from Ace to King.
- 667 `moves[]:` Tableau: build down by suit. The 9 of spades goes on the 10 of spades.
- 668 `moves[]:` You can only move 1 card at a time, from the top of a column or the waste.
- 669 `moves[]:` Any card can fill an empty column.
- 670 `moves[]:` Click the stock to turn over 1 card.
- 672 `goodToKnow[]:` You can take a card back from a foundation.
- 718 `facts:` Forty Thieves on 9 columns, in alternating colors. 2 decks. Draw 1. No redeal.
- 719 `goal:` Move all 104 cards to the 8 foundations, building each suit up from Ace to King.
- 723 `layout[]:` Stock: the 68 cards left over, face down.
- 724 `layout[]:` Waste: the cards you turn over. You can play the top one.
- 725 `layout[]:` Foundations: 8 empty piles.
- 726 `layout[]:` Tableau: 9 columns of 4 cards, all face up.
- 729 `moves[]:` Foundations: build up by suit, from Ace to King.
- 730 `moves[]:` Tableau: build down in alternating colors. A red 9 goes on a black 10.
- 731 `moves[]:` You can move several cards at once only if they run down in alternating colors.
- 732 `moves[]:` Any card can fill an empty column.
- 733 `moves[]:` Click the stock to turn over 1 card.
- 735 `goodToKnow[]:` You can take a card back from a foundation.
- 750 `facts:` 2 decks. Draw 1. No redeal.
- 751 `goal:` Move all 104 cards to the 8 foundations, building each suit up from Ace to King.
- 755 `layout[]:` Stock: the 68 cards left over, face down.
- 756 `layout[]:` Waste: the cards you turn over. You can play the top one.
- 757 `layout[]:` Foundations: 8 empty piles.
- 758 `layout[]:` Tableau: 12 columns of 3 cards, all face up.
- 761 `moves[]:` Foundations: build up by suit, from Ace to King.
- 762 `moves[]:` Tableau: build down by suit. A 9 of spades goes on a 10 of spades.
- 763 `moves[]:` You can move several cards at once if they run down in the same suit.
- 764 `moves[]:` Any card can fill an empty column.
- 765 `moves[]:` Click the stock to turn over 1 card.
- 768 `goodToKnow[]:` It is Forty Thieves on 12 columns of 3, except that you can move runs.
- 769 `goodToKnow[]:` You can take a card back from a foundation.
- 784 `facts:` 2 decks. Draw 1. No redeal.
- 785 `goal:` Move all 104 cards to the 8 foundations, building each suit up from Ace to King.
- 789 `layout[]:` Stock: the 57 cards left over, face down.
- 790 `layout[]:` Waste: the cards you turn over. You can play the top one.
- 791 `layout[]:` Foundations: 8 piles, each started with an Ace.
- 792 `layout[]:` Tableau: 13 columns of 3 cards, all face up.
- 795 `moves[]:` Foundations: build up by suit, from Ace to King.
- 796 `moves[]:` Tableau: build down by suit. A 9 of spades goes on a 10 of spades.
- 797 `moves[]:` You can move several cards at once if they run down in the same suit.
- 798 `moves[]:` Any card can fill an empty column.
- 799 `moves[]:` Click the stock to turn over 1 card.
- 802 `goodToKnow[]:` It is Forty Thieves on 13 columns of 3, with the Aces dealt first. Here you can move runs.
- 803 `goodToKnow[]:` You can take a card back from a foundation.
- 817 `facts:` 2 decks. Draw 3. No limit on redeals.
- 818 `goal:` Move all 104 cards to the 8 foundations, building each suit up from Ace to King.
- 822 `layout[]:` Stock: the cards left over, face down.
- 823 `layout[]:` Waste: the cards you turn over. You can play the top one.
- 824 `layout[]:` Foundations: 8 empty piles.
- 825 `layout[]:` Tableau: 9 columns of 1 to 9 cards. Only the top card is face up.
- 828 `moves[]:` Foundations: build up by suit, from Ace to King.
- 829 `moves[]:` Tableau: build down in alternating colors. A red 9 goes on a black 10.
- 830 `moves[]:` You can move a face-up run as one.
- 831 `moves[]:` Only a King can fill an empty column.
- 832 `moves[]:` Click the stock to turn over 3 cards.
- 833 `moves[]:` When the stock runs out, click it to turn the waste over and go through it again.
- 836 `goodToKnow[]:` After the 3rd redeal, each one costs 20 points.
- 837 `goodToKnow[]:` You can take a card back from a foundation.
- 852 `facts:` 1 deck without the Aces, all dealt face up. 2 or 3 redeals.
- 853 `goal:` Put each row in order in one suit, from 2 at the left to King.
- 857 `layout[]:` Grid: 4 rows of 13 spaces, with 48 cards and 4 gaps.
- 858 `layout[]:` Redeal: a button that shuffles the cards out of place. Its dots show the redeals you have left.
- 861 `moves[]:` You can fill a gap with the card 1 rank higher than the card left of the gap, in the same suit. The 7 of hearts goes after the 6 of hearts.
- 862 `moves[]:` Any 2 can go in a gap at the left end of a row.
- 863 `moves[]:` Nothing can go in a gap after a King.
- 866 `goodToKnow[]:` When you redeal, the cards already in order at the left of a row stay put. The rest are shuffled and dealt again. Each row gets 1 gap, just after the cards that stayed.
- 894 `facts:` 1 deck, all dealt face up. 2 redeals.
- 895 `goal:` Put each row in order in one suit, from the Ace at the left to King.
- 899 `layout[]:` Grid: 4 rows of 14 spaces. Each row starts with an Ace, and there are 4 gaps.
- 900 `layout[]:` Redeal: a button that shuffles the cards out of place. Its dots show the redeals you have left.
- 903 `moves[]:` You can fill a gap with the card 1 rank higher than the card left of the gap, in the same suit. The 7 of hearts goes after the 6 of hearts.
- 904 `moves[]:` Nothing can go in a gap after a King.
- 905 `moves[]:` The Aces never move.
- 908 `goodToKnow[]:` It is Montana with the Aces in play.
- 909 `goodToKnow[]:` When you redeal, the cards already in order at the left of a row stay put. The rest are shuffled and dealt again. Each row gets 1 gap, just after the cards that stayed.
- 940 `facts:` 1 deck, all dealt face up. No stock.
- 941 `goal:` Move all 52 cards to the foundations, building each suit up from its Ace and down from its King.
- 945 `layout[]:` Ace foundations: 4 piles, each started with an Ace.
- 946 `layout[]:` King foundations: 4 empty piles.
- 947 `layout[]:` Tableau: 13 columns, 4 of them with 3 cards and 9 with 4.
- 950 `moves[]:` Ace foundations: build up by suit.
- 951 `moves[]:` King foundations: the Kings go in the same suit order as the Aces. Then build down by suit.
- 952 `moves[]:` Tableau: build up or down by suit. The 7 of clubs goes on the 6 or the 8 of clubs.
- 953 `moves[]:` You can only move the top card of a column.
- 954 `moves[]:` An empty column stays empty.
- 957 `goodToKnow[]:` The 2 foundations of a suit can meet at any rank. When they hold all 13 cards, that suit is done.
- 958 `goodToKnow[]:` You can take a card back from a foundation.
- 974 `facts:` 1 deck. No redeal.
- 975 `goal:` Discard every card except the 4 Aces.
- 979 `layout[]:` Stock: the 48 cards left over, face down.
- 980 `layout[]:` Tableau: 4 columns, each dealt 1 card to start.
- 981 `layout[]:` Discard: where the cards you discard go.
- 984 `moves[]:` You can discard the top card of a column if another column has a higher card of the same suit on top.
- 985 `moves[]:` Aces are high, so you can never discard one.
- 986 `moves[]:` You can move the top card of a column into an empty column.
- 987 `moves[]:` Click the stock to deal 1 card onto each column.
- 990 `goodToKnow[]:` You can deal whenever you like, even with moves left.
- 991 `goodToKnow[]:` Each deal covers the cards below. To reach them, discard the top card or move it into an empty column.
- 1021 `facts:` 1 deck. No redeal.
- 1022 `goal:` Clear all 7 columns by playing their cards onto the foundation.
- 1026 `layout[]:` Stock: the 16 cards left over, face down.
- 1027 `layout[]:` Foundation: 1 pile, started with a card from the deal.
- 1028 `layout[]:` Tableau: 7 columns of 5 cards, all face up.
- 1031 `moves[]:` You can play the top card of a column on the foundation if it is 1 rank higher or lower, in any suit. A 9 or a Jack goes on a 10.
- 1032 `moves[]:` Click a card to play it, or drag it.
- 1033 `moves[]:` Nothing goes on a King, and only a 2 goes on an Ace.
- 1034 `moves[]:` Click the stock to turn its top card onto the foundation, whatever its rank.
- 1037 `goodToKnow[]:` You win when the columns are empty, even with cards left in the stock.
- 1038 `goodToKnow[]:` You can't take a card back from the foundation.
- 1074 `facts:` 1 deck. No redeal.
- 1075 `goal:` Build all 4 foundations up to King, each counting by its own step, in any suit.
- 1079 `layout[]:` Stock: the cards left over, face down.
- 1080 `layout[]:` Hand: the card you just turned over.
- 1081 `layout[]:` Foundations: 4 piles, started with an Ace, 2, 3 and 4.
- 1082 `layout[]:` Waste: 4 empty piles, for cards you can't play yet.
- 1085 `moves[]:` Foundations: build up in any suit, each by the rank it started on.
- 1086 `moves[]:` The foundation started on a 2 goes 2 4 6 8 10 Q A 3 5 7 9 J K.
- 1087 `moves[]:` Click the stock to turn a card into your hand. Place it before you turn the next.
- 1088 `moves[]:` You can put the card in your hand on a foundation or on any waste pile.
- 1089 `moves[]:` You can only move the top card of a waste pile, and only to a foundation.
- 1091 `goodToKnow[]:` You can't take a card back from a foundation.
- 1120 `facts:` 1 deck, all dealt face up. No stock.
- 1121 `goal:` Move all 52 cards to the 4 foundations, building each suit up from Ace to King.
- 1125 `layout[]:` Bouquet: 16 cards. You can play any of them.
- 1126 `layout[]:` Foundations: 4 empty piles.
- 1127 `layout[]:` Tableau: 6 columns of 6 cards.
- 1130 `moves[]:` Foundations: build up by suit, from Ace to King.
- 1131 `moves[]:` Tableau: build down in any suit. Any 9 goes on any 10.
- 1132 `moves[]:` You can play any card in the bouquet on a foundation or a column.
- 1133 `moves[]:` You can only move the top card of a column.
- 1134 `moves[]:` Any card can fill an empty column.
- 1135 `moves[]:` Nothing goes back into the bouquet.
- 1137 `goodToKnow[]:` You can take a card back from a foundation.
- 1152 `facts:` 1 deck. No redeal.
- 1153 `goal:` Move all 52 cards to the 4 foundations, building each up from Ace to King in any suit.
- 1157 `layout[]:` Stock: the 25 cards left over, face down.
- 1158 `layout[]:` Reserves: 3 piles the stock deals onto. You can play the top card of each.
- 1159 `layout[]:` Foundations: 4 empty piles.
- 1160 `layout[]:` Tableau: 8 columns of 3 cards, all face up.
- 1163 `moves[]:` Foundations: any Ace starts one. Then build up in any suit.
- 1164 `moves[]:` Tableau: build down in any suit. Any 9 goes on any 10.
- 1165 `moves[]:` You can only move the top card of a column or a reserve.
- 1166 `moves[]:` Click the stock to deal 1 card onto each reserve.
- 1169 `goodToKnow[]:` An empty column stays empty.
- 1170 `goodToKnow[]:` Kings are dealt to the bottom of their columns, since a King can only go to a foundation.
- 1171 `goodToKnow[]:` Dealing covers the reserve cards, so play what you can first.
- 1172 `goodToKnow[]:` You can take a card back from a foundation.
- 1203 `facts:` 1 deck, all dealt face up. No stock.
- 1204 `goal:` Discard all 52 cards in pairs of the same rank.
- 1208 `layout[]:` Reserve: 4 cards. You can play any of them.
- 1209 `layout[]:` Discard: where the pairs go.
- 1210 `layout[]:` Tableau: 8 columns of 6 cards.
- 1213 `moves[]:` You can pair 2 cards of the same rank, in any suit. A 7 pairs with any 7.
- 1214 `moves[]:` You can only use the top card of a column, or any reserve card.
- 1215 `moves[]:` Drag one card onto the other, and both go to the discard.
- 1218 `goodToKnow[]:` No column is dealt 2 cards of the same rank, unless the deal can't avoid it.
- 1233 `facts:` 1 deck. No redeal.
- 1234 `goal:` Discard all 52 cards in pairs of the same rank that touch.
- 1238 `layout[]:` Stock: the 27 cards left over, face down.
- 1239 `layout[]:` Grid: 5 rows of 5 cards, all face up.
- 1240 `layout[]:` Discard: where the pairs go.
- 1243 `moves[]:` You can pair 2 cards of the same rank if they touch, even at a corner.
- 1244 `moves[]:` Drag one card onto the other, and both go to the discard.
- 1245 `moves[]:` Click the stock to close the gaps. The cards left slide along in reading order to fill them. Then the stock fills the spaces at the end.
- 1248 `goodToKnow[]:` Closing the gaps changes which cards touch, so choose your pairs with that in mind.
- 1249 `goodToKnow[]:` When the stock is empty, click its place to close the gaps.
- 1280 `facts:` 1 deck, all dealt face up. No stock. 2 redeals.
- 1281 `goal:` Move all 52 cards to the 4 foundations, building each suit up from Ace to King.
- 1285 `layout[]:` Foundations: 4 empty piles.
- 1286 `layout[]:` Tableau: 17 fans of 3 cards and 1 fan of 1 card.
- 1287 `layout[]:` Redeal: the space you click to redeal. Its dots show the redeals left.
- 1290 `moves[]:` Foundations: build up by suit, from Ace to King.
- 1291 `moves[]:` Tableau: build down by suit. The 9 of hearts goes on the 10 of hearts.
- 1292 `moves[]:` You can only move the top card of a fan.
- 1293 `moves[]:` An empty fan stays empty.
- 1294 `moves[]:` When you redeal, the cards left in the fans are shuffled and dealt out again in fans of 3.
- 1297 `goodToKnow[]:` A King can only go to a foundation. If it covers lower cards of the same suit, they are stuck until you redeal.
- 1298 `goodToKnow[]:` You can take a card back from a foundation.
- 1335 `facts:` La Belle Lucie with the Aces already on the foundations. 1 deck, all face up. 2 redeals.
- 1336 `goal:` Move all 52 cards to the 4 foundations, building each suit up from Ace to King.
- 1340 `layout[]:` Foundations: 4 piles, each started with an Ace.
- 1341 `layout[]:` Tableau: 16 fans of 3 cards.
- 1342 `layout[]:` Redeal: the space you click to redeal. Its dots show the redeals left.
- 1345 `moves[]:` Foundations: build up by suit, from Ace to King.
- 1346 `moves[]:` Tableau: build down by suit. The 9 of hearts goes on the 10 of hearts.
- 1347 `moves[]:` You can only move the top card of a fan.
- 1348 `moves[]:` An empty fan stays empty.
- 1349 `moves[]:` When you redeal, the cards left in the fans are shuffled and dealt out again in fans of 3.
- 1352 `goodToKnow[]:` A King can only go to a foundation. If it covers lower cards of the same suit, they are stuck until you redeal.
- 1353 `goodToKnow[]:` You can take a card back from a foundation.
- 1368 `facts:` 1 deck. Draw 3. Unlimited redeals.
- 1369 `goal:` Move all 52 cards to the 4 foundations, building each suit up from the rank the deal turns over.
- 1373 `layout[]:` Stock: the cards left over.
- 1374 `layout[]:` Waste: the cards you turn over.
- 1375 `layout[]:` Reserve: 13 cards. You can play the top one.
- 1376 `layout[]:` Foundations: 4 piles, 1 started by the deal.
- 1377 `layout[]:` Tableau: 4 columns of 1 card.
- 1380 `moves[]:` Foundations: build up by suit. If the first card is a 7, each suit goes 7 to King, then Ace to 6.
- 1381 `moves[]:` Tableau: build down in alternating colors, and a King can go on an Ace.
- 1382 `moves[]:` You can move a run as one.
- 1383 `moves[]:` Click the stock to turn over 3 cards, and the empty stock to turn the waste back over.
- 1386 `goodToKnow[]:` The top card of the reserve fills an empty column at once. Once the reserve is gone, only the top card of the waste can fill it.
- 1427 `facts:` 1 deck, all face up. No stock.
- 1428 `goal:` Move all 52 cards to the 4 foundations, building up by suit from the rank of the first card dealt.
- 1432 `layout[]:` Tableau: 7 columns of 7. The first card dealt is under 6 others in the first column.
- 1433 `layout[]:` Foundations: 4 piles, 3 started by the deal.
- 1434 `layout[]:` Free cells: 7 spaces, for 1 card each.
- 1437 `moves[]:` Foundations: build up by suit. After the King comes the Ace.
- 1438 `moves[]:` Tableau: build down by suit. A King goes on an Ace.
- 1439 `moves[]:` You can move a run as one, however few free cells are empty.
- 1440 `moves[]:` You can move the top card of a column to an empty free cell.
- 1441 `moves[]:` Only a card 1 rank below the first card dealt, or a run starting with one, can fill an empty column. If it is a 5, that is a 4.
- 1444 `goodToKnow[]:` To start the fourth foundation, dig out the first card dealt.
- 1458 `facts:` 1 deck, all dealt face up. No stock.
- 1459 `goal:` Play every card into the hole.
- 1463 `layout[]:` Hole: 1 pile, started with the Ace of spades.
- 1464 `layout[]:` Tableau: 17 fans of 3 cards.
- 1467 `moves[]:` You can play the top card of a fan into the hole if it is 1 rank above or below the top card there. Suits don't matter, so any 5 goes on any 4 or 6.
- 1468 `moves[]:` A King and an Ace count as 1 rank apart, so either can go on the other.
- 1469 `moves[]:` Click a top card to play it, or drag it.
- 1470 `moves[]:` Nothing goes on a fan. Cards only leave it.
- 1472 `goodToKnow[]:` You can't take a card back out of the hole.
- 1486 `facts:` Black Hole with 13 columns and nothing on the foundation. 1 deck, all dealt face up. No stock.
- 1487 `goal:` Play every card onto the foundation.
- 1490 `layout[]:` Foundation: 1 empty pile.
- 1490 `layout[]:` Tableau: 13 columns of 4 cards.
- 1492 `moves[]:` You can start the foundation with the top card of any column.
- 1493 `moves[]:` After that, you can play a top card onto the foundation if it is 1 rank above or below the top card there. Suits don't matter, so any 5 goes on any 4 or 6.
- 1494 `moves[]:` A King and an Ace count as 1 rank apart, so either can go on the other.
- 1495 `moves[]:` Click a top card to play it, or drag it.
- 1496 `moves[]:` Nothing goes on a column. Cards only leave it.
- 1499 `goodToKnow[]:` The card you start with matters most. Look ahead before you play it.
- 1500 `goodToKnow[]:` You can't take a card back off the foundation.
- 1515 `facts:` 1 deck, all dealt face up. No stock.
- 1516 `goal:` Build each of the 12 foundations up by suit until its top card matches its hour on the clock.
- 1520 `layout[]:` Foundations: 12 piles laid out like a clock face. Each hour starts 1 rank higher, from the 2 of spades at 5 o'clock to the King of diamonds at 4.
- 1521 `layout[]:` Tableau: 8 columns of 5 cards.
- 1524 `moves[]:` Foundations: build up by suit. After the King comes the Ace.
- 1525 `moves[]:` A Jack counts as 11, a Queen 12 and an Ace 1. The foundation at 3 o'clock goes from the Queen of clubs to the 3.
- 1526 `moves[]:` Tableau: build down in any suit. Any 9 goes on any 10.
- 1527 `moves[]:` You can only move the top card of a column.
- 1528 `moves[]:` Any card can fill an empty column.
- 1530 `goodToKnow[]:` You can't take a card back off a foundation.
- 1544 `facts:` 1 deck. 1 or 3 passes.
- 1545 `goal:` Discard all 52 cards, in pairs that add up to 13 and Kings on their own.
- 1549 `layout[]:` Pyramid: 28 cards in 7 rows, each row overlapping the one above.
- 1550 `layout[]:` Stock: the other 24 cards.
- 1551 `layout[]:` Hand: the card just turned over.
- 1552 `layout[]:` Waste: the cards you turned over before.
- 1553 `layout[]:` Discard: where pairs and Kings go.
- 1556 `moves[]:` Aces count as 1, Jacks 11, Queens 12 and Kings 13.
- 1557 `moves[]:` You can only use free cards. They are the uncovered cards in the pyramid, the card in the hand and the top card of the waste.
- 1558 `moves[]:` To pair 2 free cards that add up to 13, drag one onto the other. A 6 pairs with a 7, and a Jack with a 2.
- 1559 `moves[]:` A King needs no pair. Drag it to the discard.
- 1560 `moves[]:` Click the stock to turn a card into the hand. The card already there goes to the waste.
- 1604 `facts:` 1 deck. Draw 1. No redeal.
- 1605 `goal:` Clear all 3 peaks by playing their cards onto the waste.
- 1609 `layout[]:` Peaks: 28 cards in 4 rows. Only the bottom 10 are face up.
- 1610 `layout[]:` Stock: the cards left over.
- 1611 `layout[]:` Waste: the pile you play onto, started with 1 card.
- 1614 `moves[]:` You can play a card from the peaks onto the waste if it is 1 rank above or below the top card there. Suits don't matter, so any 5 goes on any 4 or 6.
- 1615 `moves[]:` A King and an Ace count as 1 rank apart, so either can go on the other.
- 1616 `moves[]:` You can only play a card with nothing over it.
- 1617 `moves[]:` Click a card to play it, or drag it.
- 1618 `moves[]:` Click the stock to turn a card onto the waste.
- 1621 `goodToKnow[]:` You win when the peaks are clear, even with cards left in the stock.
- 1636 `facts:` 1 deck, all dealt face up. No stock.
- 1637 `goal:` Move all 52 cards to the 4 foundations, building each suit up from Ace to King.
- 1641 `layout[]:` Foundations: 4 piles, each started with an Ace.
- 1642 `layout[]:` Tableau: 8 rows of 6 cards, fanned sideways.
- 1645 `moves[]:` Foundations: build up by suit, from Ace to King.
- 1646 `moves[]:` Tableau: build down in any suit. Any 9 goes on any 10.
- 1647 `moves[]:` You can only move the top card of a row, the one you can see whole.
- 1648 `moves[]:` Any card can fill an empty row.
- 1651 `goodToKnow[]:` There are no free cells, so an empty row is the only place to park a card.
- 1652 `goodToKnow[]:` You can take a card back from a foundation.
- 1685 `facts:` 1 deck, all dealt face up. No stock.
- 1686 `goal:` Move all 52 cards to the 4 foundations, building each suit up from Ace to King.
- 1690 `layout[]:` Foundations: 4 empty piles.
- 1691 `layout[]:` Tableau: 10 rows, fanned sideways. 2 have 6 cards and the rest have 5.
- 1694 `moves[]:` Foundations: build up by suit, from Ace to King.
- 1695 `moves[]:` Tableau: build up or down by suit. The 9 of hearts goes on the 8 or the 10 of hearts.
- 1696 `moves[]:` A row can change direction as often as you like.
- 1697 `moves[]:` You can only move the top card of a row, the one you can see whole.
- 1698 `moves[]:` Any card can fill an empty row.
- 1701 `goodToKnow[]:` There are no free cells, so an empty row is the only place to park a card.
- 1702 `goodToKnow[]:` You can take a card back from a foundation.
- 1716 `facts:` 1 deck. Only 25 cards are played.
- 1717 `goal:` Fill the 5 by 5 grid so its rows and columns make poker hands worth 200 points or more, or 70 in English scoring.
- 1721 `layout[]:` Stock: the cards still to come, face down.
- 1722 `layout[]:` Next card: the card you place now.
- 1723 `layout[]:` Grid: 25 empty squares, in 5 rows of 5.
- 1726 `moves[]:` Drag the next card into any empty square. Once a card is placed, it stays there.
- 1727 `moves[]:` Each row and column scores for the poker hand it makes. A straight can run from Ace to 5 or from 10 to Ace.
- 1728 `moves[]:` A pair, two pair, three of a kind or four of a kind scores as soon as it is in a line. Straights and flushes score when the line is full.
- 1729 `moves[]:` Royal flush: 100 American, 30 English.
- 1730 `moves[]:` Straight flush: 75 American, 30 English.
- 1731 `moves[]:` Four of a kind: 50 American, 16 English.
- 1732 `moves[]:` Full house: 25 American, 10 English.
- 1735 `moves[]:` Three of a kind: 10 American, 6 English.
- 1736 `moves[]:` Two pair: 5 American, 3 English.
- 1737 `moves[]:` One pair: 2 American, 1 English.
- 1740 `goodToKnow[]:` Each card counts in a row and in a column. Try to build flushes or straights one way and pairs the other.

## Reference: what each thing, option and variant does

### src/ui/app/provider/game_documentation_data.ts

- 73 `effect:` The usual game.
- 78 `effect:` Every card in the columns is dealt face up. Columns build down in the same color. Any card can fill an empty column.
- 83 `effect:` A 9 of hearts goes on any 10 except the 10 of hearts. Any card can fill an empty column.
- 88 `effect:` Every card in the columns is dealt face up. The other rules are the same as Klondike.
- 98 `effect:` You turn over 1 card at a time, so you can reach every card in the stock.
- 103 `effect:` You turn over 3 cards at a time, and you can only play the top one.
- 113 `effect:` You score 10 points for each card you put on a foundation. Going through the stock again can cost points.
- 118 `effect:` You pay $52 for the deck and win $5 for each card on a foundation. 1 pass through the stock in Draw 1, 3 in Draw 3.
- 192 `effect:` All 104 cards are spades, so any run you build can be moved and finished.
- 196 `effect:` Half the cards are spades and half are hearts.
- 201 `effect:` 2 full decks in all 4 suits. This is the usual game, and the hardest.
- 241 `effect:` The usual game. Columns build down in alternating colors.
- 246 `effect:` Columns build up or down by suit. A 9 of hearts goes on the 8 or the 10 of hearts.
- 251 `effect:` Columns build down by suit instead of alternating colors. It is much harder than Yukon.
- 256 `effect:` Columns build down in another suit. A 9 of hearts goes on any 10 except the 10 of hearts.
- 300 `effect:` Any card can fill an empty column. Each empty column doubles how many cards you can move at once.
- 305 `effect:` Only a King can fill an empty column, and you can't use empty columns to move more cards at once.
- 349 `effect:` Any card can fill an empty column. Each empty column doubles how many cards you can move at once.
- 354 `effect:` Only a King can fill an empty column, and you can't use empty columns to move more cards at once.
- 427 `effect:` The usual game. Only a King can fill an empty column, and 4 columns start with 3 face-down cards.
- 432 `effect:` Scorpion, but any card can fill an empty column, with all the cards on top of it.
- 437 `effect:` Only the first 3 columns have face-down cards, so 9 start hidden instead of 12.
- 599 `effect:` Columns of 1 to 7 cards, like Klondike, with 24 cards in the stock.
- 604 `effect:` Spiderette with 3 cards in every column, 1 face up. Fewer cards start hidden, and the stock has 31.
- 681 `effect:` The usual game. Columns build down by suit, and you move 1 card at a time.
- 686 `effect:` Forty Thieves, but you can move a run of cards in the same suit as one.
- 691 `effect:` Build down in alternating colors and move runs as one. Each column has 3 face-down cards under 1 face-up card.
- 696 `effect:` Columns of 3 cards, 1 face down. Build down in any other suit, 1 card at a time.
- 701 `effect:` Build down in alternating colors and move runs as one. Each column has 2 face-down cards under 2 face-up ones.
- 875 `effect:` The usual game.
- 879 `effect:` Montana with 3 redeals instead of 2.
- 919 `effect:` The Aces move to the start of the rows, and the gaps are left where the Aces were dealt.
- 924 `effect:` Each Ace starts a row with a gap right after it, so every row can take its 2 at once.
- 1000 `effect:` The usual game. Any top card can fill an empty column.
- 1005 `effect:` Only an Ace can fill an empty column, which makes the game much harder.
- 1048 `effect:` The usual game. Nothing goes on a King, so a King blocks play until you turn the next card.
- 1053 `effect:` Golf where a Queen can go on a King, so a King no longer blocks the foundation.
- 1058 `effect:` Golf where Ace and King count as 1 rank apart, so no card blocks the foundation.
- 1099 `effect:` The usual game.
- 1104 `effect:` Calculation with empty foundations. Any Ace starts one, and each builds up by 1 in any suit.
- 1181 `effect:` The usual game. Every foundation starts empty.
- 1186 `effect:` Bristol with 1 Ace already on a foundation, and 24 cards in the stock.
- 1258 `effect:` The usual game. Pair touching cards of the same rank.
- 1263 `effect:` Pair touching cards that add up to 13, with Jack 11 and Queen 12. Drag a King to the discard.
- 1307 `effect:` The usual game.
- 1312 `effect:` La Belle Lucie with no redeal, but a King can fill an empty fan.
- 1317 `effect:` La Belle Lucie with no redeal. Fans build up or down in any suit, and hold 3 cards at most.
- 1395 `effect:` The usual game.
- 1400 `effect:` Canfield with the 4 Twos dealt to the foundations. Columns build down by suit. Draw 1, with 2 redeals.
- 1405 `effect:` Canfield with the reserve face up. You fill empty columns yourself, with any card or run.
- 1410 `effect:` Canfield with columns that build down in any suit. Draw 1, and no redeal.
- 1570 `effect:` You win only when every card is discarded, the stock and waste too.
- 1575 `effect:` Pyramid, but you win once the pyramid is clear, even with cards left in the stock and waste.
- 1584 `effect:` You go through the stock once.
- 1589 `effect:` When the stock runs out, click it to turn the waste back over. You can do this twice.
- 1661 `effect:` The usual game.
- 1666 `effect:` Beleaguered Castle with the Aces shuffled into the rows. 4 rows get 7 cards instead of 6.
- 1671 `effect:` Beleaguered Castle, but any card that fits a foundation goes there while the cards are dealt.
- 1750 `effect:` Flushes score more than straights. You need 200 points to win.
- 1755 `effect:` Straights score more than flushes and full houses. You need 70 points to win.

## Descriptions: blurbs, taglines, page metadata and write-ups

### README.md

- 1 `heading` # Solitaire Collection
- 3 `paragraph` 41 solitaire games, free in your browser. Klondike, Spider and FreeCell are here, and so are Montana, Poker Squares and 36 more. Play it at https://fuzzley.games/play/solitaire/.
- 5 `paragraph` The table is drawn with [Phaser 4](https://phaser.io/), in an [Angular 22](https://angular.dev/) shell styled with [Sass](https://sass-lang.com/).
- 7 `heading` ## The games
- 9 `list item` - **Klondike**: Build down in alternating colors. Draw 3, or Draw 1 for an easier game. Variants: Whitehead, Thumb and Pouch, Saratoga.
- 10 `list item` - **FreeCell**: Build down in alternating colors, with 4 free cells to park cards in.
- 11 `list item` - **Spider**: Build King-to-Ace runs by suit across 10 columns.
- 12 `list item` - **Yukon**: No stock. Move any face-up card, along with everything on top of it. Variants: Alaska, Russian Solitaire, Moosehide.
- 13 `list item` - **Baker's Game**: FreeCell's ancestor. Build the columns down by suit.
- 14 `list item` - **Challenge FreeCell**: FreeCell with every Ace and 2 dealt to the bottom. Variant: Super Challenge FreeCell.
- 15 `list item` - **Eight Off**: 8 cells, 4 of them filled, and columns that build down by suit.
- 16 `list item` - **Scorpion**: Move any face-up card to build King-to-Ace runs by suit, like Spider. Variants: Wasp, Scorpion II.
- 17 `list item` - **Simple Simon**: Spider with 1 deck, every card face up and no stock.
- 18 `list item` - **Mrs. Mop**: 2 decks dealt face up across 13 columns, with no stock.
- 19 `list item` - **Baker's Dozen**: 13 columns with the Kings at the bottom. Empty columns stay empty.
- 20 `list item` - **Seahaven Towers**: 10 columns and 4 cells. Build by suit. Only Kings go in empty columns.
- 21 `list item` - **Spiderette**: Spider with 1 deck, on 7 columns. Variant: Will o' the Wisp.
- 22 `list item` - **Easthaven**: Like Klondike, but the stock deals a card onto every column.
- 23 `list item` - **Forty Thieves**: Build down by suit across 10 columns. Move 1 card at a time. Variants: Josephine, Rank and File, Indian, Number Ten.
- 24 `list item` - **Maria**: Forty Thieves on 9 columns, in alternating colors.
- 25 `list item` - **Limited**: Forty Thieves spread over 12 shallow columns.
- 26 `list item` - **Lucas**: 13 columns of 3, with the Aces already on the foundations.
- 27 `list item` - **Double Klondike**: Klondike from 2 decks, on 9 columns.
- 28 `list item` - **Montana**: Move cards into the gaps to sort each row by suit, 2 to King. Variant: Addiction.
- 29 `list item` - **Blue Moon**: Montana with the Aces in play, at the start of each row. Variant: Red Moon.
- 30 `list item` - **Bisley**: Build each suit up from its Ace and down from its King.
- 31 `list item` - **Aces Up**: Discard any card that has a higher card of its suit showing.
- 32 `list item` - **Golf**: Clear 7 columns by playing cards 1 rank up or down onto 1 pile. Variants: Queens on Kings, Putt Putt.
- 33 `list item` - **Calculation**: Build 4 foundations, counting up by 1s, 2s, 3s and 4s. Variant: Sir Tommy.
- 34 `list item` - **Flower Garden**: 6 beds, and a bouquet of 16 cards you can play at any time.
- 35 `list item` - **Bristol**: 8 fans, and 3 reserves that the stock deals onto. Variant: Belvedere.
- 36 `list item` - **Nestor**: Pair free cards of the same rank until the board is clear.
- 37 `list item` - **Monte Carlo**: Pair touching cards in a 5 by 5 grid, then close the gaps. Variant: Monte Carlo Thirteens.
- 38 `list item` - **La Belle Lucie**: 18 fans built down by suit, with 2 redeals. Variants: The Fan, Shamrocks.
- 39 `list item` - **Trefoil**: La Belle Lucie with the Aces already on the foundations.
- 40 `list item` - **Canfield**: Clear a 13-card reserve. Foundations start at the rank the deal turns up. Variants: Storehouse, Superior Canfield, Rainbow.
- 41 `list item` - **Penguin**: 7 columns, 7 cells. Foundations start at the rank of the first card dealt.
- 42 `list item` - **Black Hole**: Play every card into the hole, 1 rank up or down.
- 43 `list item` - **All in a Row**: 13 columns of 4. Play every card onto 1 pile, starting with any card.
- 44 `list item` - **Grandfather's Clock**: Build 12 foundations around a clock face, each up to its hour.
- 45 `list item` - **Pyramid**: Pair free cards that add up to 13 to take the pyramid apart. Variant: Relaxed Pyramid.
- 46 `list item` - **TriPeaks**: Clear 3 peaks by playing cards 1 rank up or down onto the waste.
- 47 `list item` - **Beleaguered Castle**: 8 open rows around the Aces. Move 1 card at a time. Variants: Streets and Alleys, Citadel.
- 48 `list item` - **Fortress**: Free the Aces from 10 open rows, building up or down by suit.
- 49 `list item` - **Poker Squares**: Place 25 cards in a grid to make 10 poker hands.

### index.html

- 25 `<meta description>` 41 solitaire games, free in your browser. Klondike, Spider, FreeCell and Pyramid are here, and so are Bisley, Penguin, Montana and 34 more.
- 36 `<meta og:description>` 41 solitaire games, free in your browser. Klondike, Spider, FreeCell and Pyramid are here, and so are Bisley, Penguin, Montana and 34 more.
- 53 `JSON-LD description` 41 solitaire games, free in your browser. Klondike, Spider, FreeCell and Pyramid are here, and so are Bisley, Penguin, Montana and 34 more.
- 53 `JSON-LD genre` Solitaire, Card game
- 73 `<noscript> <p>` Turn on JavaScript to play any of these solitaire games and their variants:

### src/ui/app/provider/game_profile_data.ts

- 46 `description:` Build down the columns to turn up the cards dealt face down, with more cards to come from the stock.
- 52 `description:` Every card is dealt face up, with free cells to park cards in while you sort the columns.
- 58 `description:` Build King-to-Ace runs by suit, and each full run leaves the board.
- 64 `description:` You can move any face-up card with everything on top of it, and there is no stock.
- 70 `description:` Build down on shallow columns from 2 decks, with a long stock to work through.
- 76 `description:` Play cards 1 rank up or down onto a single pile until the tableau is clear.
- 82 `description:` Move 1 card at a time between fans of 3, with no free cells to fall back on.
- 87 `description:` Clear the board by pairing cards that match or add up to 13.
- 93 `description:` Play off a 13-card reserve, with foundations that can start at any rank.
- 99 `description:` Move 1 card at a time between open rows on either side of the foundations.
- 104 `description:` Games that don't fit a family.
- 115 `tagline:` Build down in alternating colors. Draw 3, or Draw 1 for an easier game.
- 129 `tagline:` Klondike, but dealt face up, and you build down in the same color.
- 137 `tagline:` Klondike, but you build down on a different suit.
- 145 `tagline:` Klondike, but the columns are dealt face up.
- 153 `tagline:` Build down in alternating colors, with 4 free cells to park cards in.
- 160 `tagline:` Build King-to-Ace runs by suit across 10 columns.
- 175 `tagline:` No stock. Move any face-up card, along with everything on top of it.
- 183 `tagline:` Yukon, but you build up or down by suit.
- 189 `tagline:` Yukon, but you build down by suit.
- 195 `tagline:` Yukon, but you build down on a different suit.
- 202 `tagline:` FreeCell's ancestor. Build the columns down by suit.
- 209 `tagline:` FreeCell with every Ace and 2 dealt to the bottom.
- 218 `tagline:` Challenge FreeCell, but only a King can fill an empty column.
- 226 `tagline:` 8 cells, 4 of them filled, and columns that build down by suit.
- 234 `tagline:` Move any face-up card to build King-to-Ace runs by suit, like Spider.
- 242 `tagline:` Scorpion, but any card can fill an empty column.
- 250 `tagline:` Scorpion, but only 3 columns start with cards face down.
- 257 `tagline:` Spider with 1 deck, every card face up and no stock.
- 264 `tagline:` 2 decks dealt face up across 13 columns, with no stock.
- 272 `tagline:` 13 columns with the Kings at the bottom. Empty columns stay empty.
- 280 `tagline:` 10 columns and 4 cells. Build by suit. Only Kings go in empty columns.
- 287 `tagline:` Spider with 1 deck, on 7 columns.
- 297 `tagline:` Spiderette, but each column is dealt 3 cards.
- 304 `tagline:` Like Klondike, but the stock deals a card onto every column.
- 311 `tagline:` Build down by suit across 10 columns. Move 1 card at a time.
- 321 `tagline:` Forty Thieves, but you can move runs of the same suit.
- 331 `tagline:` Forty Thieves, but you build in alternating colors and can move runs.
- 340 `tagline:` Forty Thieves on columns of 3, and you build down on a different suit.
- 349 `tagline:` Like Rank and File, but only 2 cards in each column start face down.
- 356 `tagline:` Forty Thieves on 9 columns, in alternating colors.
- 363 `tagline:` Forty Thieves spread over 12 shallow columns.
- 370 `tagline:` 13 columns of 3, with the Aces already on the foundations.
- 377 `tagline:` Klondike from 2 decks, on 9 columns.
- 384 `tagline:` Move cards into the gaps to sort each row by suit, 2 to King.
- 393 `tagline:` Montana, but you get 3 redeals.
- 400 `tagline:` Montana with the Aces in play, at the start of each row.
- 410 `tagline:` Blue Moon, but each gap starts next to an Ace.
- 417 `tagline:` Build each suit up from its Ace and down from its King.
- 424 `tagline:` Discard any card that has a higher card of its suit showing.
- 432 `tagline:` Clear 7 columns by playing cards 1 rank up or down onto 1 pile.
- 442 `tagline:` Golf, but you can play a Queen on a King.
- 448 `tagline:` Golf, but the ranks wrap around from King to Ace.
- 455 `tagline:` Build 4 foundations, counting up by 1s, 2s, 3s and 4s.
- 467 `tagline:` Calculation, but every foundation goes up by 1 from an Ace.
- 475 `tagline:` 6 beds, and a bouquet of 16 cards you can play at any time.
- 483 `tagline:` 8 fans, and 3 reserves that the stock deals onto.
- 493 `tagline:` Bristol, but 1 Ace starts on a foundation.
- 500 `tagline:` Pair free cards of the same rank until the board is clear.
- 507 `tagline:` Pair touching cards in a 5 by 5 grid, then close the gaps.
- 518 `tagline:` Monte Carlo, but the pairs add up to 13.
- 525 `tagline:` 18 fans built down by suit, with 2 redeals.
- 537 `tagline:` La Belle Lucie with no redeals, and Kings can fill empty fans.
- 546 `tagline:` La Belle Lucie, but you build up or down in any suit, with no redeals.
- 553 `tagline:` La Belle Lucie with the Aces already on the foundations.
- 561 `tagline:` Clear a 13-card reserve. Foundations start at the rank the deal turns up.
- 573 `tagline:` Canfield, but the Twos start the foundations and you build by suit.
- 583 `tagline:` Canfield with the reserve face up, and any card can fill an empty column.
- 592 `tagline:` Canfield, but you build down in any suit. Draw 1, with no redeals.
- 600 `tagline:` 7 columns, 7 cells. Foundations start at the rank of the first card dealt.
- 607 `tagline:` Play every card into the hole, 1 rank up or down.
- 615 `tagline:` 13 columns of 4. Play every card onto 1 pile, starting with any card.
- 622 `tagline:` Build 12 foundations around a clock face, each up to its hour.
- 630 `tagline:` Pair free cards that add up to 13 to take the pyramid apart.
- 638 `tagline:` Pyramid, but you win when the pyramid is clear.
- 646 `tagline:` Clear 3 peaks by playing cards 1 rank up or down onto the waste.
- 654 `tagline:` 8 open rows around the Aces. Move 1 card at a time.
- 664 `tagline:` Beleaguered Castle, but the Aces are dealt into the rows.
- 673 `tagline:` Beleaguered Castle, but cards go to the foundations during the deal.
- 680 `tagline:` Free the Aces from 10 open rows, building up or down by suit.
- 687 `tagline:` Place 25 cards in a grid to make 10 poker hands.

## Picture text: alt text and captions

### index.html

- 48 `<meta og:image:alt>` A new game of Klondike, dealt on a green felt table.

### src/ui/app/component/game_help_modal/game_help_modal.component.html

- 126 `<img [alt]>` {{ screenshot.altText }}

### src/ui/app/component/game_preview/game_preview.component.html

- 14 `<img [alt]>` {{ imageAlt() }}

### src/ui/app/provider/game_documentation_data.ts

- 42 `caption:` A new deal, with the stock at the top left and 7 columns below.
- 44 `altText:` A new game of Klondike, with 1 card face up on each of 7 columns.
- 130 `caption:` A new deal, with the free cells at the top left and 8 columns below.
- 131 `altText:` A new game of FreeCell, with every card face up in 8 columns.
- 162 `caption:` A new deal, with the stock at the top left and 8 foundations beside it.
- 164 `altText:` A new game of Spider, with 10 columns and 1 card face up on each.
- 212 `caption:` A new deal, with 4 foundations at the top and 7 columns below.
- 214 `altText:` A new game of Yukon, with most of the cards face up in 7 columns.
- 268 `caption:` A new deal, with the free cells at the top left and 8 columns below.
- 270 `altText:` A new game of Baker's Game, with every card face up in 8 columns.
- 315 `caption:` A new deal, where every column starts with an Ace or a 2.
- 317 `altText:` A new game of Challenge FreeCell, with every card face up in 8 columns.
- 365 `caption:` A new deal, with 4 of the 8 free cells holding a card.
- 366 `altText:` A new game of Eight Off, with 8 columns of 6 cards face up.
- 397 `caption:` A new deal, with the stock at the top left and 7 columns below.
- 399 `altText:` A new game of Scorpion, with face-down cards in the first 4 columns.
- 448 `caption:` A new deal, with 10 columns stepping down from 8 cards to 1.
- 450 `altText:` A new game of Simple Simon, with every card face up in 10 columns.
- 476 `caption:` A new deal, with 8 foundations at the top and 13 columns below.
- 477 `altText:` A new game of Mrs. Mop, with 13 columns of 8 cards face up.
- 503 `caption:` A new deal, with the foundations at the top right and 13 columns below.
- 505 `altText:` A new game of Baker's Dozen, with 13 columns of 4 cards face up.
- 534 `caption:` A new deal, with 2 of the 4 free cells holding a card.
- 536 `altText:` A new game of Seahaven Towers, with 10 columns of 5 cards face up.
- 567 `caption:` A new deal, with the stock at the top left and 4 foundations beside it.
- 569 `altText:` A new game of Spiderette, with 7 columns and 1 card face up on each.
- 616 `caption:` A new deal, with the stock at the top left and 7 columns below.
- 618 `altText:` A new game of Easthaven, with 1 card face up on each of 7 columns.
- 650 `caption:` A new deal, with the stock at the top left and 8 foundations beside it.
- 652 `altText:` A new game of Forty Thieves, with 10 columns of 4 cards face up.
- 713 `caption:` A new deal, with the stock at the top left and 9 columns below.
- 714 `altText:` A new game of Maria, with 9 columns of 4 cards face up.
- 745 `caption:` A new deal, with the stock and 8 foundations above 12 short columns.
- 747 `altText:` A new game of Limited, with 3 face-up cards on each of 12 columns.
- 780 `caption:` A new deal, with all 8 Aces on the foundations and 13 short columns.
- 781 `altText:` A new game of Lucas, with 8 Aces above 13 columns of 3 cards.
- 813 `caption:` A new deal, with the stock and 8 foundations above 9 columns.
- 814 `altText:` A new game of Double Klondike, with 9 columns of 1 to 9 cards.
- 848 `caption:` A new deal, with 4 rows of cards, 4 gaps and the redeal button.
- 849 `altText:` A new game of Montana, with 48 cards in 4 rows and 4 gaps.
- 890 `caption:` A new deal, with an Ace at the start of each row and 4 gaps.
- 891 `altText:` A new game of Blue Moon, with 52 cards in 4 rows and 4 gaps.
- 936 `caption:` A new deal, with the Aces and the empty King foundations above 13 columns.
- 937 `altText:` A new game of Bisley, with 4 Aces above 13 face-up columns.
- 969 `caption:` A new deal, with the stock, 4 columns of 1 card and the empty discard.
- 971 `altText:` A new game of Aces Up, with 1 face-up card on each of 4 columns.
- 1017 `caption:` A new deal, with the stock, 1 card on the foundation and 7 columns.
- 1018 `altText:` A new game of Golf, with 5 face-up cards on each of 7 columns.
- 1069 `caption:` A new deal, with an Ace, 2, 3 and 4 starting the foundations.
- 1071 `altText:` A new game of Calculation, with 4 foundations started and 4 empty waste piles.
- 1115 `caption:` A new deal, with the bouquet fanned out above 6 columns.
- 1117 `altText:` A new game of Flower Garden, with a 16-card bouquet and 6 columns of 6.
- 1147 `caption:` A new deal, with the stock, 3 reserves, 4 foundations and 8 columns.
- 1149 `altText:` A new game of Bristol, with 3 face-up cards on each of 8 columns.
- 1198 `caption:` A new deal, with 4 reserve cards above 8 columns and the empty discard.
- 1200 `altText:` A new game of Nestor, with 6 face-up cards on each of 8 columns.
- 1228 `caption:` A new deal, with the stock beside 25 cards in a 5 by 5 grid.
- 1230 `altText:` A new game of Monte Carlo, with 25 face-up cards in 5 rows of 5.
- 1275 `caption:` A new deal, with the redeal space at the top left and 18 fans below.
- 1277 `altText:` A new game of La Belle Lucie, with every card face up in 18 fans.
- 1329 `caption:` A new deal, with the 4 Aces on the foundations and 16 fans below.
- 1331 `altText:` A new game of Trefoil, with the 4 Aces on the foundations and 16 fans.
- 1364 `caption:` A new deal, with the reserve under the stock and 4 columns of 1 card.
- 1365 `altText:` A new game of Canfield, with a King on the first foundation.
- 1422 `caption:` A new deal, with 3 foundations started and 7 columns of 7 cards.
- 1424 `altText:` A new game of Penguin, with 49 cards face up in 7 columns of 7.
- 1454 `caption:` A new deal, with the Ace of spades in the hole and 17 fans.
- 1455 `altText:` A new game of Black Hole, with the Ace of spades in the hole.
- 1481 `caption:` A new deal, with the empty foundation above 13 columns of 4 cards.
- 1482 `altText:` A new game of All in a Row, with 13 columns of face-up cards.
- 1510 `caption:` A new deal, with 12 foundations in a circle and 8 columns of 5 cards.
- 1512 `altText:` A new game of Grandfather's Clock, with 12 cards laid out like a clock face.
- 1540 `caption:` A new deal, with the stock face down beside a pyramid of 7 rows.
- 1541 `altText:` A new game of Pyramid, with 28 cards face up in 7 rows.
- 1600 `caption:` A new deal, with 3 peaks of face-down cards over a row of 10.
- 1601 `altText:` A new game of TriPeaks, with 10 cards face up under 3 peaks.
- 1631 `caption:` A new deal, with the 4 Aces in a column between 8 rows.
- 1633 `altText:` A new game of Beleaguered Castle, with 48 cards face up in 8 rows.
- 1681 `caption:` A new deal, with 4 empty foundations and 5 rows on each side.
- 1682 `altText:` A new game of Fortress, with every card face up in 10 rows.
- 1712 `caption:` A new deal, with the first card face up beside an empty grid.
- 1713 `altText:` A new game of Poker Squares, with an empty grid of 25 squares.

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

- 919 `pilesName:` free cells and foundations
- 920 `sideName:` free cells
- 930 `name:` Klondike
- 940 `pilesName:` stock and foundations
- 956 `name:` FreeCell
- 965 `name:` Spider
- 970 `pilesName:` stock and foundations
- 983 `name:` Yukon
- 993 `name:` Baker's Game
- 1016 `name:` Challenge FreeCell
- 1033 `name:` Eight Off
- 1038 `pilesName:` cells and foundations
- 1046 `name:` Scorpion
- 1051 `pilesName:` stock and foundations
- 1060 `name:` Simple Simon
- 1086 `name:` Baker's Dozen
- 1098 `name:` Seahaven Towers
- 1103 `pilesName:` cells and foundations
- 1111 `name:` Forty Thieves
- 1116 `pilesName:` stock, waste and foundations
- 1134 `name:` Maria
- 1139 `pilesName:` stock, waste and foundations
- 1148 `name:` Limited
- 1153 `pilesName:` stock, waste and foundations
- 1162 `name:` Lucas
- 1167 `pilesName:` stock, waste and foundations
- 1176 `name:` Montana
- 1190 `name:` Blue Moon
- 1199 `name:` Double Klondike
- 1204 `pilesName:` stock, waste and foundations
- 1212 `name:` Easthaven
- 1217 `pilesName:` stock and foundations
- 1225 `name:` Spiderette
- 1230 `pilesName:` stock and foundations
- 1241 `name:` Bisley
- 1249 `name:` Aces Up
- 1254 `pilesName:` stock and discard
- 1263 `name:` Golf
- 1268 `pilesName:` stock and foundation
- 1277 `name:` Calculation
- 1282 `pilesName:` stock, hand and foundations
- 1295 `name:` Flower Garden
- 1300 `pilesName:` bouquet and foundations
- 1307 `name:` Bristol
- 1312 `pilesName:` stock, reserves and foundations
- 1321 `name:` Nestor
- 1326 `pilesName:` reserve and discard
- 1334 `name:` Monte Carlo
- 1339 `pilesName:` stock and discard
- 1350 `name:` La Belle Lucie
- 1367 `name:` Trefoil
- 1376 `name:` Canfield
- 1381 `pilesName:` stock, waste and foundations
- 1390 `name:` Penguin
- 1395 `pilesName:` free cells and foundations
- 1396 `sideName:` free cells
- 1403 `name:` Black Hole
- 1415 `name:` All in a Row
- 1424 `name:` Grandfather's Clock
- 1432 `name:` Pyramid
- 1437 `pilesName:` stock, hand, waste and discard
- 1451 `name:` TriPeaks
- 1459 `name:` Beleaguered Castle
- 1472 `name:` Fortress
- 1480 `name:` Poker Squares
- 1485 `pilesName:` stock and the card to place

### src/ui/app/provider/game_documentation_data.ts

- 37 `title:` Klondike Solitaire
- 125 `title:` FreeCell
- 157 `title:` Spider Solitaire
- 208 `title:` Yukon Solitaire
- 263 `title:` Baker's Game
- 312 `title:` Challenge FreeCell
- 361 `title:` Eight Off
- 392 `title:` Scorpion Solitaire
- 444 `title:` Simple Simon
- 498 `title:` Baker's Dozen
- 530 `title:` Seahaven Towers
- 562 `title:` Spiderette
- 611 `title:` Easthaven
- 645 `title:` Forty Thieves
- 708 `title:` Maria
- 740 `title:` Limited
- 775 `title:` Lucas
- 809 `title:` Double Klondike
- 843 `title:` Montana
- 886 `title:` Blue Moon
- 931 `title:` Bisley
- 964 `title:` Aces Up
- 1012 `title:` Golf
- 1065 `title:` Calculation
- 1111 `title:` Flower Garden
- 1142 `title:` Bristol
- 1193 `title:` Nestor
- 1224 `title:` Monte Carlo
- 1270 `title:` La Belle Lucie
- 1324 `title:` Trefoil
- 1359 `title:` Canfield
- 1417 `title:` Penguin
- 1450 `title:` Black Hole
- 1477 `title:` All in a Row
- 1506 `title:` Grandfather's Clock
- 1535 `title:` Pyramid
- 1596 `title:` TriPeaks
- 1627 `title:` Beleaguered Castle
- 1678 `title:` Fortress
- 1708 `title:` Poker Squares

### src/ui/app/provider/game_profile_data.ts

- 44 `name:` Klondike family
- 50 `name:` FreeCell family
- 56 `name:` Spider family
- 62 `name:` Yukon family
- 68 `name:` Forty Thieves family
- 74 `name:` Golf family
- 80 `name:` Fan family
- 86 `name:` Pairing games
- 91 `name:` Canfield family
- 97 `name:` Castle family
- 103 `name:` More games
- 124 `name:` Whitehead
- 133 `name:` Thumb and Pouch
- 141 `name:` Saratoga
- 181 `name:` Alaska
- 187 `name:` Russian Solitaire
- 193 `name:` Moosehide
- 215 `name:` Super Challenge FreeCell
- 240 `name:` Wasp
- 246 `name:` Scorpion II
- 293 `name:` Will o' the Wisp
- 317 `name:` Josephine
- 323 `aliases[]:` Streets
- 326 `name:` Rank and File
- 335 `name:` Indian
- 344 `name:` Number Ten
- 388 `aliases[]:` Gaps
- 391 `name:` Addiction
- 406 `name:` Red Moon
- 438 `name:` Queens on Kings
- 446 `name:` Putt Putt
- 459 `aliases[]:` Broken Intervals
- 462 `name:` Sir Tommy
- 469 `aliases[]:` Old Patience
- 479 `aliases[]:` The Garden
- 479 `aliases[]:` Bouquet
- 489 `name:` Belvedere
- 511 `aliases[]:` Weddings
- 514 `name:` Monte Carlo Thirteens
- 529 `aliases[]:` Fair Lucy
- 529 `aliases[]:` Midnight Oil
- 532 `name:` The Fan
- 541 `name:` Shamrocks
- 565 `aliases[]:` Demon
- 565 `aliases[]:` Fascination
- 568 `name:` Storehouse
- 575 `aliases[]:` Thirteen Up
- 575 `aliases[]:` Reserve
- 578 `name:` Superior Canfield
- 587 `name:` Rainbow
- 626 `aliases[]:` Clock
- 636 `name:` Relaxed Pyramid
- 650 `aliases[]:` Three Peaks
- 650 `aliases[]:` Tri Towers
- 660 `name:` Streets and Alleys
- 668 `name:` Citadel
- 691 `aliases[]:` Poker Solitaire

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
- 195 `<button>` Show all games

### src/ui/app/component/game_browser/game_browser.component.ts

- 134 `placeholder =` Search {this.items.length} games
- 170 `section()` Best matches
- 191 `section()` Recent
- 246 `label:` All cards visible
- 502 `label[]:` variant of {item.parentName}
- 508 `label[]:` playing now

### src/ui/app/component/game_canvas/game_canvas.component.html

- 5 `<fz-phaser-canvas [label]>` {{ boardLabel() }}
- 37 `(text)` Loading {{ gameName() }}…
- 58 `(text)` Loading {{ deckName }} cards…

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

- 35 `<span>` Score
- 39 `<span>` Time
- 43 `<span>` Moves
- 58 `<span>` Undo
- 76 `<span>` Restart
- 89 `<span>` New game

### src/ui/app/component/header_bar/header_bar.component.ts

- 25 `label:` Restart
- 26 `label:` How to play
- 27 `label:` Report a bug
- 63 `computed()` {this.gameName()}, choose a game
- 67 `switcherTitle =` Choose a game ({this.browser.shortcutLabel})

### src/ui/app/component/settings_drawer/settings_drawer.component.html

- 1 `<fz-dialog label>` Settings
- 4 `<h2>` Settings
- 46 `<span>` Card back
- 90 `<span>` Desktop deck
- 155 `<span>` Theme
- 162 `<span>` Felt
- 164 `<button>` From the theme
- 199 `<button>` How to play {{ activeGameTitle() }}
- 236 `<button>` Close

### src/ui/app/component/settings_drawer/settings_drawer.component.ts

- 101 `label:` Auto
- 114 `label:` Mobile
- 120 `label:` Desktop
- 133 `label:` Auto
- 142 `label:` Top
- 143 `label:` Bottom
- 160 `label:` Auto
- 169 `label:` Left
- 170 `label:` Right
- 192 `autoDescription() returns` {label(picks("phone-portrait"))} on a phone and
- 238 `computed()` Solitaire
- 285 `label:` Piles
- 322 `label:` Card style
- 372 `computed()` Felt: {TABLE\_FELTS[felt].name}
- 374 `computed()` Felt: from the theme ({palette?.name ?? this.palette()})

### src/ui/app/model/game_profile.model.ts

- 15 `[Difficulty.EASY]:` Easy
- 16 `[Difficulty.MEDIUM]:` Medium
- 17 `[Difficulty.HARD]:` Hard

### src/ui/app/model/game_search.ts

- 149 `decks =` two decks
- 149 `decks =` one deck
- 150 `visible =` open face up

### src/ui/app/provider/game_catalog.ts

- 375 `label:` Draw
- 379 `label:` Draw 1
- 380 `label:` Draw 3
- 387 `label:` Scoring
- 391 `label:` Standard
- 392 `label:` Vegas
- 399 `label:` Almost Win Mode
- 403 `label:` Normal
- 404 `label:` Almost Win
- 412 `label:` Empty columns
- 415 `label:` Any card
- 416 `label:` Kings only
- 423 `label:` Empty columns
- 427 `label:` Any card
- 428 `label:` Kings only
- 435 `label:` Suits
- 449 `label:` Variant
- 456 `label:` Yukon
- 462 `label:` Alaska
- 468 `label:` Russian Solitaire
- 474 `label:` Moosehide
- 485 `label:` Variant
- 491 `label:` Klondike
- 498 `label:` Whitehead
- 505 `label:` Thumb and Pouch
- 512 `label:` Saratoga
- 523 `label:` Variant
- 530 `label:` Forty Thieves
- 536 `label:` Josephine
- 542 `label:` Rank and File
- 549 `label:` Indian
- 556 `label:` Number Ten
- 568 `label:` Variant
- 574 `label:` Scorpion
- 581 `label:` Wasp
- 588 `label:` Scorpion II
- 599 `label:` Redeals
- 611 `label:` Deal
- 617 `label:` Blue Moon
- 623 `label:` Red Moon
- 635 `label:` Deal
- 641 `label:` Spiderette
- 648 `label:` Will o' the Wisp
- 659 `label:` Empty columns
- 663 `label:` Any card
- 664 `label:` Aces only
- 672 `label:` Variant
- 678 `label:` Golf
- 684 `label:` Queens on Kings
- 690 `label:` Putt Putt
- 702 `label:` Variant
- 708 `label:` Calculation
- 715 `label:` Sir Tommy
- 726 `label:` Variant
- 732 `label:` Bristol
- 738 `label:` Belvedere
- 749 `label:` Variant
- 755 `label:` Monte Carlo
- 761 `label:` Thirteens
- 773 `label:` Variant
- 779 `label:` La Belle Lucie
- 785 `label:` The Fan
- 791 `label:` Shamrocks
- 803 `label:` Variant
- 809 `label:` Canfield
- 816 `label:` Storehouse
- 823 `label:` Superior Canfield
- 830 `label:` Rainbow
- 841 `label:` Goal
- 845 `label:` All cards
- 849 `label:` Pyramid only
- 858 `label:` Passes
- 870 `label:` Variant
- 876 `label:` Beleaguered Castle
- 883 `label:` Streets and Alleys
- 890 `label:` Citadel
- 902 `label:` Scoring
- 909 `label:` American
- 911 `label:` English

### src/ui/app/service/game_browser.service.ts

- 22 `shortcutLabel =` Ctrl K

### src/ui/app/service/game_lifecycle.service.ts

- 16 `confirmLabel:` Switch
- 59 `confirmLabel:` New game
- 90 `confirmLabel:` Restart
- 105 `confirmLabel:` New game
- 121 `confirmLabel:` New game
- 153 `confirmLabel:` Load

## Hints: setting descriptions, tooltips and prompts

### src/engine/render/deck/card_deck.ts

- 46 `description:` Shows the cards as drawn, with no corner pips.
- 52 `description:` Adds a corner pip to every Ace, King, Queen and Jack.
- 58 `description:` Adds a corner pip to every card.

### src/ui/app/component/header_bar/header_bar.component.html

- 20 `<button [title]>` {{ switcherTitle }}
- 54 `<button title>` Undo the last move
- 72 `<button title>` Restart this game
- 85 `<button title>` Start a new game
- 98 `<button title>` How to play
- 111 `<button title>` Report a bug
- 132 `<button title>` Settings

### src/ui/app/component/settings_drawer/settings_drawer.component.html

- 157 `<p>` Shared with fuzzley.games and every game.
- 211 `<span>` Found a problem?
- 212 `<a>` Report a bug (opens GitHub in a new tab)

### src/ui/app/component/settings_drawer/settings_drawer.component.ts

- 102 `description:` Mobile cards on a phone and desktop cards on a larger screen.
- 115 `description:` Plain cards with a big rank and suit, on every screen.
- 122 `description:` The full card artwork, on every screen. Choose the deck below.
- 149 `pilesDescription() returns` Puts the {pilesName} at the top.
- 150 `pilesDescription() returns` Puts the {pilesName} at the bottom.
- 193 `autoDescription() returns` {label(picks("roomy"))} on a larger screen, so {label(here)} here.

### src/ui/app/provider/game_catalog.ts

- 377 `description:` How many cards you turn over from the stock at a time. Draw 3 is harder.
- 389 `description:` In Vegas, you pay $52 and win $5 for each card on a foundation. Vegas gives 1 pass through the stock in Draw 1, 3 in Draw 3.
- 401 `description:` Pre-populates foundations so that dragging the remaining Kings will win the game.
- 413 `description:` Kings only also limits how many cards you can move at once.
- 425 `description:` Kings only is Super Challenge FreeCell. Kings only also limits how many cards you can move at once.
- 437 `description:` You always play with 104 cards. The fewer the suits, the easier the game.
- 451 `description:` All 4 deal like Yukon. They differ in how you build the columns.
- 457 `description:` Build down in alternating colors.
- 463 `description:` Build up or down by suit.
- 469 `description:` Build down by suit. Harder.
- 475 `description:` Build down on a different suit. Easier.
- 486 `description:` The other 3 change how you build, or deal the columns face up.
- 493 `description:` Build down in alternating colors. Only a King can fill an empty column.
- 500 `description:` Build down in the same color on columns dealt face up. Any card can fill an empty column.
- 507 `description:` Build down on a different suit. Any card can fill an empty column.
- 513 `description:` The columns are dealt face up.
- 525 `description:` All 5 are played on 10 columns from 2 decks. The rules for the columns differ.
- 531 `description:` Build down by suit. Move 1 card at a time.
- 537 `description:` Build down by suit, and you can move runs. Easier.
- 544 `description:` Build down in alternating colors, and you can move runs. 3 cards in each column start face down.
- 551 `description:` Build down on a different suit. Each column has 3 cards, and 1 starts face down. Easier.
- 558 `description:` Like Rank and File, but 2 cards in each column start face down. Easier.
- 569 `description:` All 3 deal 7 columns of 7 and a stock of 3.
- 576 `description:` Only a King can fill an empty column. 4 columns start with 3 cards face down.
- 583 `description:` Any card, with the cards on top of it, can fill an empty column. Easier.
- 589 `description:` Only the first 3 columns start with cards face down.
- 600 `description:` 3 redeals is the game called Addiction.
- 612 `description:` Where the 4 gaps are when the game starts.
- 618 `description:` Each gap is where an Ace was dealt.
- 625 `description:` Each gap is next to an Ace, so you can start building every row. Easier.
- 636 `description:` How the cards are dealt to the 7 columns.
- 643 `description:` Columns of 1 to 7 cards, like Klondike, with 24 in the stock.
- 649 `description:` 3 cards in each column, with 31 in the stock. Easier.
- 661 `description:` You can move a top card into an empty column. With Aces only, it must be an Ace.
- 673 `description:` What you can play on a King.
- 679 `description:` Nothing can go on a King, so you turn the next stock card.
- 685 `description:` A Queen can go on a King.
- 692 `description:` The ranks wrap around, so an Ace or a Queen can go on a King. Easier.
- 703 `description:` How you build the 4 foundations.
- 710 `description:` The foundations start on Ace, 2, 3 and 4, and go up by 1s, 2s, 3s and 4s.
- 716 `description:` Every foundation starts on an Ace and goes up by 1.
- 727 `description:` Whether the deal starts 1 foundation for you.
- 733 `description:` Start each foundation with an Ace when you find one.
- 739 `description:` The deal puts 1 Ace on a foundation for you.
- 750 `description:` Which cards make a pair.
- 756 `description:` Pair touching cards of the same rank.
- 763 `description:` Pair touching cards that add up to 13. You discard a King on its own.
- 774 `description:` All 3 are played on the same 18 fans.
- 780 `description:` Build down by suit, with 2 redeals. Empty fans stay empty.
- 786 `description:` Only a King can fill an empty fan. No redeals.
- 793 `description:` Build up or down in any suit, up to 3 cards a fan, with no redeals. Easier.
- 804 `description:` All 4 have a reserve of 13 cards and 4 columns.
- 811 `description:` Build down in alternating colors. Draw 3, with no limit on redeals.
- 818 `description:` The Twos start the foundations, and you build down by suit. Draw 1, with 2 redeals. Easier.
- 825 `description:` The reserve is face up, and any card can fill an empty column. Easier.
- 831 `description:` Build down in any suit. Draw 1, with no redeals.
- 843 `description:` Pyramid only is Relaxed Pyramid. You win when the pyramid is clear, even with cards left over.
- 859 `description:` How many times you can go through the stock.
- 871 `description:` All 3 are played on the same 8 rows.
- 878 `description:` The Aces start on the foundations, with 6 cards in each row.
- 885 `description:` The Aces are shuffled in, so you have to dig them out. Harder.
- 892 `description:` Cards that fit a foundation go there during the deal. Easier.
- 904 `description:` In American scoring, a flush beats a straight and you win at 200. In English scoring, a straight beats a flush and you win at 70.

## Messages: notices, confirmations, explanations and errors

### src/ui/app/component/game_browser/game_browser.component.html

- 174 `<span>` @for (on of row.dots; track $index) { } {{ row.difficulty }}

### src/ui/app/component/game_browser/game_browser.component.ts

- 262 `computed()` No games match “{this.query().trim()}”.
- 263 `computed()` No games match these filters.
- 286 `text =` No games match.

### src/ui/app/service/game_lifecycle.service.ts

- 9 `GAME_LOST =` You'll lose the game in progress.
- 14 `title:` Switch games?
- 14 `title:` Switch to {name}?
- 57 `title:` Start a new game of {name}?
- 88 `title:` Restart this game?
- 89 `message:` You'll lose your progress.
- 103 `title:` Start a new game?
- 119 `title:` Change the rules?
- 151 `title:` Load this game?

### src/ui/app/service/presentation_settings.service.ts

- 231 `computed()` Couldn't load {deckName(failed)}. Still using {deckName( this.drawnCardDeckSignal(), )}.

## Results: win, lose, clear and records

### src/ui/app/component/victory_overlay/victory_overlay.component.html

- 4 `<fz-dialog label>` You won
- 13 `<h2>` You won!
- 21 `<dt>` Score
- 25 `<dt>` Time
- 29 `<dt>` Moves
- 35 `<button>` New game
- 43 `<button>` Choose another game

## Spoken text: labels and announcements for screen readers

### src/ui/app/component/game_browser/game_browser.component.html

- 14 `<button aria-label>` Close game list
- 37 `<input aria-label>` Search games
- 62 `<div aria-label>` Filter games
- 113 `<div aria-label>` Games
- 135 `<div [aria-label]>` {{ row.label }}

### src/ui/app/component/game_help_modal/game_help_modal.component.html

- 37 `<button aria-label>` Close How to play
- 46 `<div aria-label>` Sections

### src/ui/app/component/game_preview/game_preview.component.html

- 29 `<ul aria-label>` At a glance

### src/ui/app/component/header_bar/header_bar.component.html

- 18 `<button [aria-label]>` {{ switcherLabel() }}
- 55 `<button aria-label>` Undo the last move
- 73 `<button aria-label>` Restart this game
- 86 `<button aria-label>` New game
- 99 `<button aria-label>` How to play
- 112 `<button aria-label>` Report a bug (opens GitHub in a new tab)
- 133 `<button aria-label>` Settings

### src/ui/app/component/settings_drawer/settings_drawer.component.html

- 9 `<button aria-label>` Close settings
- 184 `<button [aria-label]>` {{ swatch.name }}

### src/ui/app/component/settings_drawer/settings_drawer.component.ts

- 432 `describeSide() returns` Puts the {this.sideName() ?? "stock"} on the {rule}. On a phone, the buttons are on the other side.
