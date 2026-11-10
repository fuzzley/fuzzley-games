# What the sketch printed

The output of `node report.mjs` and `node flights.mjs`, run on 2026-11-10
over the drafts in [`../levels/`](../levels/), as [the design](../design.md)
quotes them. Both give the same numbers every run, but the times.

## `node report.mjs`

Each level on every field depth from 11 to 22. Three numbers with strokes
between them are for fields 11, 16 and 22 deep.

- **Solver's rounds** is the fewest and the most rounds the solver's lines
  took over the twelve depths, no brick the level needs ever in the row
  over the floor's, and **Its best rally** the fewest and the most bricks
  the longest flight of those lines struck.
- **Cleared** is how often the careless player cleared the level in forty
  games a depth, and **Least** its worst depth of the twelve. **Its rounds**
  and **Its jumps** are means over the games it won.
- **A round's rally** is the middle one of all its rounds, and **A game's
  best rally** the middle one of each game's longest flight: what a level's
  rally mark is set from.
- **Floor bounces** is how many a game spent, at the mean.
- **Sweet spot** is the widest run of neighboring aims that each rally 8 or
  more as the level opens, at the mean of a fuzzball waiting at the left,
  the middle and the right, and **Narrowest** the least of that over the
  twelve depths and the first depth it fell to.
- **Blind** is how often aims drawn at random cleared the level, in forty
  games, and **Most** the most of that over the twelve depths.

| #   | Level           | Rows | Bricks | Hits | Solver's rounds | Its best rally | Cleared, %      | Least     | Its rounds   | Its jumps       | A round's rally | A game's best rally | Floor bounces      | Sweet spot, °   | Narrowest   | Blind, %     | Most      |
| --- | --------------- | ---- | ------ | ---- | --------------- | -------------- | --------------- | --------- | ------------ | --------------- | --------------- | ------------------- | ------------------ | --------------- | ----------- | ------------ | --------- |
| 1   | First bounce    | 17   | 64     | 64   | 3-6             | 18-50          | 100 / 100 / 100 | 100       | 8 / 6 / 5    | 3.6 / 1.6 / 1.1 | 7 / 8 / 8       | 18 / 24 / 36        | 6.0 / 4.3 / 3.9    | 2.2 / 1.3 / 3.0 | 1.25, on 14 | 3 / 10 / 38  | 38, on 18 |
| 2   | Side door       | 17   | 72     | 72   | 3-6             | 16-54          | 100 / 100 / 100 | 100       | 9 / 8 / 8    | 3.3 / 1.6 / 0.8 | 6 / 6 / 6       | 18 / 23 / 24        | 6.1 / 4.5 / 3.6    | 1.9 / 2.0 / 1.7 | 1.50, on 21 | 0 / 0 / 3    | 15, on 21 |
| 3   | Columns         | 15   | 60     | 60   | 3-6             | 19-48          | 100 / 100 / 100 | 100       | 8 / 6 / 4    | 2.8 / 1.6 / 0.4 | 6 / 7 / 6       | 15 / 28 / 40        | 4.9 / 4.3 / 2.9    | 2.1 / 2.9 / 2.1 | 2.08, on 11 | 0 / 8 / 23   | 30, on 21 |
| 4   | Pips            | 15   | 54     | 84   | 3-6             | 26-69          | 100 / 100 / 100 | 100       | 8 / 7 / 5    | 2.9 / 1.5 / 0.6 | 7 / 7 / 6       | 24 / 42 / 56        | 5.8 / 5.0 / 4.4    | 5.3 / 4.9 / 3.7 | 3.67, on 18 | 0 / 5 / 15   | 23, on 21 |
| 5   | Alleys          | 20   | 87     | 87   | 4-7             | 24-45          | 100 / 100 / 100 | 100       | 11 / 9 / 7   | 4.4 / 2.3 / 1.6 | 7 / 7 / 8       | 19 / 29 / 30        | 7.5 / 5.9 / 5.5    | 4.0 / 3.3 / 2.8 | 2.42, on 21 | 3 / 5 / 8    | 18, on 21 |
| 6   | Stairs          | 16   | 64     | 64   | 3-6             | 14-32          | 100 / 100 / 100 | 100       | 10 / 7 / 7   | 2.4 / 1.3 / 0.7 | 5 / 6 / 6       | 16 / 23 / 21        | 4.1 / 3.6 / 3.3    | 2.2 / 1.4 / 1.9 | 1.33, on 12 | 0 / 8 / 5    | 13, on 21 |
| 7   | Girders         | 15   | 30     | 60   | 3-5             | 16-45          | 100 / 100 / 100 | 100       | 7 / 7 / 5    | 2.8 / 1.3 / 0.8 | 6 / 6 / 4       | 13 / 23 / 40        | 3.4 / 3.0 / 2.7    | 2.7 / 3.8 / 2.6 | 2.50, on 21 | 3 / 0 / 10   | 10, on 22 |
| 8   | Attic           | 17   | 78     | 117  | 4-6             | 21-76          | 98 / 95 / 100   | 95, on 12 | 11 / 9 / 8   | 2.7 / 1.5 / 0.8 | 6 / 7 / 5       | 29 / 42 / 67        | 7.1 / 6.4 / 5.4    | 2.4 / 1.8 / 2.8 | 1.75, on 12 | 0 / 0 / 3    | 8, on 21  |
| 9   | Gatehouse       | 21   | 64     | 96   | 3-7             | 19-57          | 100 / 100 / 100 | 100       | 9 / 6 / 6    | 5.3 / 2.7 / 1.7 | 8 / 10 / 9      | 17 / 33 / 43        | 8.5 / 6.0 / 4.5    | 3.4 / 2.7 / 2.8 | 2.58, on 12 | 0 / 3 / 15   | 15, on 22 |
| 10  | Launcher        | 19   | 92     | 92   | 4-7             | 20-45          | 100 / 100 / 100 | 98, on 13 | 11 / 9 / 8   | 3.5 / 2.1 / 1.3 | 7 / 6 / 8       | 20 / 33 / 30        | 7.2 / 5.9 / 5.3    | 1.4 / 1.8 / 1.5 | 1.25, on 15 | 0 / 0 / 0    | 8, on 19  |
| 11  | Banked turn     | 15   | 36     | 52   | 3-5             | 17-38          | 98 / 100 / 100  | 95, on 13 | 7 / 6 / 6    | 2.3 / 1.1 / 0.3 | 5 / 5 / 3       | 15 / 22 / 31        | 3.1 / 2.3 / 1.7    | 3.1 / 3.3 / 2.6 | 2.58, on 18 | 0 / 3 / 5    | 5, on 22  |
| 12  | Trapdoor        | 15   | 54     | 90   | 3-6             | 17-66          | 100 / 100 / 100 | 100       | 6 / 5 / 5    | 3.2 / 1.4 / 0.7 | 12 / 14 / 16    | 21 / 34 / 42        | 6.7 / 5.3 / 4.9    | 4.7 / 3.9 / 3.2 | 3.17, on 18 | 3 / 30 / 50  | 60, on 21 |
| 13  | Springboard     | 15   | 54     | 54   | 2-5             | 22-49          | 100 / 100 / 100 | 100       | 6 / 4 / 3    | 3.3 / 1.6 / 0.9 | 8 / 12 / 7      | 20 / 33 / 42        | 12.3 / 10.2 / 6.7  | 4.9 / 4.4 / 3.4 | 2.67, on 21 | 30 / 55 / 58 | 70, on 18 |
| 14  | Loft            | 17   | 66     | 132  | 3-6             | 32-94          | 100 / 100 / 100 | 100       | 7 / 6 / 5    | 3.4 / 1.6 / 0.9 | 11 / 16 / 16    | 32 / 42 / 62        | 8.6 / 7.3 / 6.9    | 2.2 / 2.9 / 1.9 | 1.83, on 21 | 0 / 8 / 8    | 10, on 14 |
| 15  | Slalom          | 23   | 96     | 138  | 4-9             | 34-64          | 98 / 100 / 100  | 95, on 12 | 13 / 11 / 10 | 4.6 / 2.3 / 1.6 | 7 / 8 / 8       | 24 / 35 / 46        | 9.4 / 8.5 / 7.0    | 3.0 / 3.3 / 2.7 | 2.33, on 21 | 0 / 0 / 0    | 3, on 19  |
| 16  | Skylight        | 15   | 54     | 132  | 3-5             | 42-112         | 100 / 100 / 100 | 95, on 14 | 6 / 5 / 4    | 3.1 / 1.5 / 0.4 | 14 / 15 / 9     | 40 / 68 / 102       | 8.8 / 7.0 / 5.3    | 5.4 / 4.7 / 3.5 | 3.17, on 21 | 5 / 15 / 25  | 43, on 21 |
| 17  | Bounce house    | 17   | 68     | 68   | 2-5             | 22-40          | 100 / 100 / 100 | 100       | 7 / 5 / 5    | 4.1 / 2.1 / 1.3 | 9 / 12 / 8      | 18 / 30 / 37        | 19.5 / 16.3 / 13.4 | 2.2 / 1.8 / 2.0 | 1.75, on 21 | 25 / 30 / 58 | 63, on 21 |
| 18  | Clockwork       | 19   | 73     | 100  | 3-6             | 23-61          | 100 / 100 / 100 | 100       | 8 / 8 / 7    | 3.8 / 1.6 / 0.9 | 9 / 8 / 8       | 27 / 37 / 47        | 10.8 / 8.0 / 6.4   | 2.0 / 2.1 / 1.8 | 1.42, on 21 | 0 / 5 / 5    | 10, on 21 |
| 19  | Gems            | 15   | 60     | 100  | 4-7             | 22-79          | 100 / 100 / 100 | 100       | 10 / 8 / 6   | 2.1 / 1.1 / 0.5 | 7 / 8 / 7       | 29 / 35 / 62        | 5.5 / 5.3 / 4.3    | 2.9 / 3.5 / 2.8 | 2.50, on 15 | 0 / 0 / 10   | 10, on 21 |
| 20  | Chandelier      | 15   | 64     | 64   | 3-7             | 15-41          | 100 / 100 / 100 | 98, on 13 | 9 / 7 / 6    | 2.5 / 1.4 / 0.4 | 6 / 7 / 6       | 17 / 23 / 32        | 4.6 / 3.5 / 3.1    | 1.0 / 0.9 / 1.0 | 0.83, on 15 | 0 / 5 / 0    | 8, on 20  |
| 21  | Elevator        | 17   | 38     | 76   | 2-6             | 14-57          | 93 / 98 / 100   | 88, on 13 | 8 / 7 / 8    | 3.3 / 1.7 / 0.8 | 6 / 7 / 5       | 18 / 28 / 35        | 4.2 / 3.2 / 3.0    | 3.5 / 3.3 / 2.7 | 2.33, on 15 | 0 / 0 / 5    | 5, on 21  |
| 22  | Shutters        | 15   | 54     | 96   | 3-7             | 37-84          | 90 / 100 / 100  | 90, on 11 | 9 / 7 / 5    | 2.3 / 1.3 / 0.4 | 6 / 7 / 5       | 29 / 50 / 73        | 5.3 / 5.6 / 4.5    | 5.3 / 4.1 / 3.3 | 2.83, on 21 | 0 / 3 / 0    | 8, on 17  |
| 23  | Kaleidoscope    | 15   | 56     | 56   | 3-6             | 15-49          | 100 / 100 / 100 | 100       | 8 / 6 / 6    | 3.0 / 1.7 / 0.7 | 7 / 7 / 6       | 15 / 19 / 25        | 8.7 / 7.6 / 6.3    | 0.9 / 0.8 / 0.9 | 0.75, on 21 | 8 / 3 / 18   | 30, on 21 |
| 24  | Awning          | 17   | 54     | 81   | 4-6             | 16-49          | 100 / 100 / 100 | 98, on 13 | 10 / 8 / 7   | 3.0 / 1.6 / 0.9 | 6 / 6 / 7       | 20 / 32 / 37        | 5.1 / 4.5 / 4.3    | 1.7 / 2.8 / 2.2 | 1.67, on 11 | 0 / 0 / 3    | 5, on 18  |
| 25  | Back door       | 13   | 56     | 86   | 2-5             | 28-75          | 100 / 100 / 100 | 100       | 10 / 8 / 7   | 1.6 / 0.8 / 0.3 | 6 / 5 / 6       | 22 / 36 / 50        | 4.6 / 4.4 / 3.4    | 3.1 / 2.7 / 2.6 | 1.92, on 17 | 0 / 3 / 0    | 3, on 14  |
| 26  | Prism hall      | 15   | 68     | 80   | 3-6             | 26-48          | 93 / 100 / 100  | 93, on 11 | 9 / 8 / 7    | 2.5 / 1.2 / 0.6 | 7 / 7 / 8       | 21 / 30 / 27        | 5.2 / 4.3 / 3.9    | 1.5 / 1.5 / 1.0 | 0.83, on 21 | 0 / 0 / 3    | 3, on 18  |
| 27  | Fun house       | 21   | 69     | 110  | 4-7             | 27-59          | 98 / 100 / 100  | 98, on 11 | 9 / 7 / 7    | 4.4 / 2.0 / 1.1 | 9 / 9 / 9       | 26 / 44 / 57        | 7.4 / 5.3 / 4.8    | 1.8 / 1.5 / 0.9 | 0.92, on 18 | 0 / 0 / 3    | 8, on 18  |
| 28  | Moss garden     | 15   | 54     | 78   | 2-5             | 27-72          | 95 / 98 / 100   | 95, on 11 | 8 / 6 / 4    | 2.7 / 1.5 / 0.7 | 8 / 9 / 7       | 24 / 35 / 56        | 5.6 / 5.2 / 4.5    | 4.6 / 4.1 / 3.1 | 2.67, on 21 | 3 / 0 / 3    | 5, on 20  |
| 29  | Combination     | 15   | 54     | 100  | 3-6             | 29-78          | 98 / 100 / 100  | 95, on 13 | 9 / 6 / 5    | 2.3 / 1.3 / 0.3 | 7 / 8 / 7       | 27 / 51 / 77        | 5.9 / 5.5 / 4.0    | 5.3 / 4.1 / 3.3 | 2.83, on 21 | 0 / 0 / 13   | 18, on 20 |
| 30  | Greenhouse      | 15   | 40     | 68   | 3-5             | 15-48          | 100 / 100 / 98  | 95, on 13 | 7 / 5 / 5    | 2.9 / 1.3 / 0.6 | 8 / 11 / 11     | 19 / 29 / 38        | 4.5 / 4.5 / 3.8    | 1.7 / 2.3 / 2.6 | 0.83, on 12 | 0 / 3 / 10   | 20, on 18 |
| 31  | Overgrown       | 13   | 58     | 100  | 1-5             | 36-100         | 90 / 95 / 88    | 80, on 13 | 10 / 8 / 6   | 1.8 / 0.8 / 0.2 | 7 / 8 / 6       | 37 / 46 / 68        | 6.0 / 6.1 / 5.2    | 5.9 / 4.9 / 3.5 | 3.50, on 18 | 0 / 0 / 0    | 3, on 21  |
| 32  | Vault           | 15   | 64     | 138  | 3-5             | 39-106         | 95 / 95 / 98    | 93, on 13 | 7 / 6 / 6    | 2.8 / 1.6 / 0.5 | 14 / 13 / 13    | 39 / 65 / 66        | 8.8 / 7.1 / 6.5    | 5.5 / 4.4 / 3.6 | 3.33, on 21 | 0 / 0 / 3    | 5, on 21  |
| 33  | Deadbolt        | 19   | 72     | 136  | 3-7             | 35-98          | 63 / 90 / 73    | 63, on 11 | 11 / 9 / 7   | 3.0 / 1.6 / 1.1 | 7 / 8 / 4       | 32 / 54 / 84        | 7.3 / 7.0 / 6.1    | 4.7 / 4.3 / 3.3 | 2.83, on 21 | 0 / 0 / 18   | 18, on 22 |
| 34  | Thicket         | 15   | 52     | 86   | 3-6             | 20-52          | 63 / 88 / 93    | 63, on 11 | 10 / 8 / 9   | 2.4 / 1.1 / 0.4 | 7 / 7 / 5       | 20 / 31 / 36        | 4.1 / 4.7 / 3.6    | 1.6 / 1.2 / 1.0 | 0.92, on 21 | 0 / 0 / 0    | 3, on 18  |
| 35  | Six-pack        | 13   | 44     | 180  | 3-7             | 74-162         | 88 / 100 / 100  | 88, on 11 | 10 / 8 / 6   | 1.9 / 0.9 / 0.2 | 9 / 9 / 6       | 67 / 90 / 130       | 9.1 / 8.7 / 6.5    | 5.9 / 5.8 / 4.0 | 3.75, on 21 | 0 / 3 / 8    | 10, on 20 |
| 36  | The long way up | 29   | 99     | 207  | 6-10            | 40-89          | 75 / 90 / 80    | 75, on 11 | 12 / 10 / 11 | 6.8 / 3.6 / 2.2 | 12 / 11 / 8     | 33 / 52 / 65        | 16.0 / 13.2 / 8.1  | 5.4 / 4.3 / 3.4 | 3.00, on 21 | 0 / 0 / 0    | 3, on 20  |

82 s

## `node flights.mjs`

The careless player over every level on fields 11, 16 and 22 deep, ten games
each, with how many seconds its flights would last at the design's speeds;
then every aim from every opening; then six players who see different
amounts of a flight before they choose; then the careless player again
with round corners in place of cut ones.

### The careless player's flights

7967 rounds in 1080 games, 1050 of them won; 1944 hot shots, which the table and the lines that say "plain" leave out.

| Of a plain flight                    | Middle | 9th in 10 | 99th in 100 | Most |
| ------------------------------------ | ------ | --------- | ----------- | ---- |
| Bricks struck, its rally             | 7      | 33        | 79          | 162  |
| Bricks broken                        | 5      | 20        | 43          | 57   |
| Turns of every kind                  | 17     | 60        | 127         | 249  |
| Units flown                          | 81     | 228       | 469         | 897  |
| Units flown after its last strike    | 16     | 62        | 68          | 79   |
| Seconds at 14 units a second         | 6      | 16        | 33          | 64   |
| Seconds, quickening and dashing home | 5      | 13        | 23          | 47   |

- On a field 11 deep: a rally of 7 at the middle and 19 at the 9th in 10; 34 rounds in 100 ended in a jump.
- On a field 16 deep: a rally of 8 at the middle and 32 at the 9th in 10; 23 rounds in 100 ended in a jump.
- On a field 22 deep: a rally of 7 at the middle and 41 at the 9th in 10; 13 rounds in 100 ended in a jump.
- Floor bounces: 39 plain flights in 100 earned one or more, 38 used one, 15 used two or more; 0.6 a flight at the mean.
- Bank shots, strikes straight off a side wall or the ceiling: 5.0 a flight at the mean; 91 plain flights in 100 had one.
- Duds: 11 plain flights in 100 struck one brick or none.
- Bored: 17 flights in 100 ended bored, 1354 of them, at a rally of 9 at the middle; 40 in 100 of those yawned under the wall, 38 among its bricks and 22 over it, and 53 had struck nothing. 0 flights stuck in place.
- Through a brick: 0 flights passed inside a brick still standing as they ended, or outside the field.
- Eight directions: 0 flights left their aim's eight.
- A hot shot: a rally of 8 at the middle against 7, and 8 bricks broken against 5; in the best tenth, 16 against 20.

### Every aim, as each level opens

Over 212868 flights: a rally of 1 at the middle, 1 at the 3rd in 4, 7 at the 9th in 10, 55 at the 99th in 100. 9 aims in 100 rally 8 or more, and the widest run of them is 2.9° at the mean; of 15 or more, 1.8°. 0 of the flights stuck in place, and 0 passed inside a brick still standing as they ended, or outside the field.

### Players, by what they see

| Player                                 | Levels cleared, % | A round's rally, mean | Middle |
| -------------------------------------- | ----------------- | --------------------- | ------ |
| Blind: any aim                         | 5                 | 4.0                   | 1      |
| A guide to the 1st turn                | 9                 | 7.8                   | 3      |
| A guide to the 2nd turn                | 30                | 9.2                   | 4      |
| A guide to the 3rd turn                | 48                | 9.6                   | 6      |
| A guide to the 5th turn                | 64                | 10.4                  | 6      |
| A guide to the 8th turn                | 82                | 11.5                  | 8      |
| Careless: the best of 16 whole flights | 97                | 11.9                  | 7      |

### Cut corners against round ones

| Corners | Aims in 100 that rally 8 or more | Of those, with both neighbors as long | Widest run, ° | Careless player's levels cleared, % | Its rally, mean |
| ------- | -------------------------------- | ------------------------------------- | ------------- | ----------------------------------- | --------------- |
| Cut     | 11.0                             | 64 in 100                             | 3.31          | 98                                  | 12.4            |
| Round   | 10.9                             | 56 in 100                             | 2.89          | 97                                  | 12.3            |

A flight costs 691 microseconds to decide, on the last level's opening, a field 22 deep.

348 s
