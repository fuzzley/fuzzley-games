# What the sketch printed

The output of `node report.mjs` and `node flights.mjs`, run on 2026-11-10
over the drafts in [`../levels/`](../levels/), as [the plan](../plan.md)
quotes them. Both give the same numbers every run, but the times.

## `node report.mjs`

Each level on every field depth from 11 to 22. "Solver's rounds" is the
fewest and the most rounds the solver's lines took over the twelve depths,
no brick the level needs ever in the row over the floor's. The rest is the
careless player's forty games a depth: how often it cleared the level, its
rounds in the games it won and the wall's jumps, at the mean, on fields 11,
16 and 22 deep.

| #   | Level          | Boon   | Rows | Bricks | Hits | Solver's rounds | Cleared, %      | Its rounds   | Its jumps       |
| --- | -------------- | ------ | ---- | ------ | ---- | --------------- | --------------- | ------------ | --------------- |
| 1   | Hello, wall    | hot    | 17   | 64     | 64   | 2-5             | 100 / 100 / 100 | 6 / 4 / 4    | 3.8 / 1.7 / 1.0 |
| 2   | Stripes        | hot    | 18   | 74     | 74   | 2-5             | 100 / 100 / 100 | 6 / 4 / 4    | 4.0 / 2.1 / 1.4 |
| 3   | Pips           | hot    | 19   | 110    | 140  | 3-6             | 100 / 100 / 100 | 8 / 6 / 6    | 3.8 / 1.9 / 1.1 |
| 4   | Punch through  | hot    | 15   | 83     | 116  | 3-5             | 100 / 100 / 100 | 7 / 7 / 7    | 2.2 / 1.0 / 0.6 |
| 5   | Girder         | hot    | 19   | 78     | 86   | 2-6             | 100 / 100 / 100 | 8 / 8 / 8    | 4.2 / 1.8 / 1.0 |
| 6   | Zip line       | hot    | 21   | 134    | 198  | 4-7             | 100 / 100 / 100 | 9 / 7 / 7    | 4.3 / 1.9 / 1.1 |
| 7   | Plumb line     | hot    | 23   | 162    | 282  | 4-8             | 95 / 100 / 98   | 12 / 9 / 9   | 3.6 / 2.3 / 1.2 |
| 8   | Pyramid        | hot    | 23   | 100    | 120  | 4-8             | 100 / 100 / 100 | 8 / 6 / 6    | 5.6 / 3.0 / 1.8 |
| 9   | Gatehouse      | hot    | 27   | 154    | 230  | 5-10            | 90 / 100 / 100  | 13 / 12 / 15 | 4.6 / 2.6 / 1.4 |
| 10  | Fuse           | triple | 23   | 162    | 280  | 5-9             | 98 / 100 / 100  | 13 / 13 / 13 | 4.1 / 1.8 / 1.1 |
| 11  | Crossroads     | hot    | 23   | 162    | 322  | 4-8             | 100 / 100 / 100 | 11 / 9 / 8   | 4.1 / 1.9 / 1.4 |
| 12  | Chain reaction | triple | 26   | 189    | 258  | 3-8             | 100 / 100 / 100 | 8 / 5 / 4    | 7.0 / 4.1 / 2.0 |
| 13  | Crisscross     | hot    | 27   | 105    | 251  | 6-10            | 100 / 100 / 100 | 12 / 9 / 10  | 5.7 / 3.0 / 1.9 |
| 14  | Wool socks     | triple | 23   | 156    | 256  | 5-8             | 100 / 100 / 100 | 13 / 10 / 10 | 4.2 / 2.3 / 1.2 |
| 15  | Jailbreak      | hot    | 23   | 103    | 244  | 4-8             | 100 / 100 / 100 | 10 / 7 / 6   | 4.7 / 2.3 / 1.5 |
| 16  | Honeycomb      | triple | 27   | 115    | 155  | 4-9             | 100 / 100 / 100 | 10 / 8 / 7   | 7.2 / 3.9 / 2.6 |
| 17  | Switchboard    | hot    | 26   | 173    | 318  | 5-10            | 93 / 100 / 100  | 14 / 13 / 14 | 4.1 / 2.1 / 1.2 |
| 18  | Powder keg     | hot    | 26   | 198    | 437  | 5-10            | 100 / 100 / 100 | 12 / 10 / 10 | 4.9 / 2.5 / 1.5 |
| 19  | Pinball        | hot    | 27   | 147    | 192  | 5-10            | 100 / 100 / 100 | 13 / 12 / 13 | 5.8 / 2.9 / 1.4 |
| 20  | Prism break    | triple | 23   | 162    | 258  | 3-8             | 95 / 100 / 100  | 11 / 8 / 7   | 4.6 / 2.4 / 1.3 |
| 21  | Wormhole       | hot    | 22   | 123    | 142  | 3-7             | 100 / 100 / 100 | 8 / 7 / 7    | 4.8 / 2.1 / 1.4 |
| 22  | Shutters       | triple | 27   | 142    | 192  | 5-9             | 98 / 100 / 100  | 16 / 14 / 14 | 4.5 / 2.5 / 1.4 |
| 23  | Kaleidoscope   | hot    | 27   | 91     | 211  | 3-9             | 100 / 100 / 100 | 10 / 6 / 5   | 6.9 / 3.6 / 2.1 |
| 24  | Bumper cars    | triple | 27   | 85     | 145  | 4-10            | 100 / 100 / 100 | 14 / 12 / 13 | 5.8 / 3.0 / 1.9 |
| 25  | Split decision | hot    | 25   | 118    | 201  | 3-8             | 100 / 100 / 100 | 10 / 6 / 6   | 6.5 / 3.4 / 2.4 |
| 26  | Back door      | triple | 23   | 82     | 108  | 4-8             | 90 / 100 / 100  | 13 / 12 / 9  | 4.3 / 2.3 / 1.7 |
| 27  | Fun house      | hot    | 27   | 122    | 191  | 4-9             | 98 / 95 / 100   | 12 / 9 / 9   | 6.2 / 3.3 / 2.2 |
| 28  | Nutcracker     | triple | 21   | 116    | 132  | 4-7             | 100 / 100 / 100 | 10 / 10 / 9  | 4.7 / 2.1 / 1.5 |
| 29  | Moss garden    | hot    | 27   | 162    | 234  | 6-10            | 90 / 100 / 100  | 15 / 12 / 12 | 4.2 / 2.4 / 1.8 |
| 30  | Thunderhead    | triple | 23   | 180    | 444  | 5-9             | 100 / 100 / 100 | 14 / 11 / 9  | 3.7 / 1.9 / 1.3 |
| 31  | Overgrown      | hot    | 23   | 171    | 326  | 4-8             | 90 / 90 / 98    | 12 / 10 / 9  | 3.1 / 1.7 / 1.2 |
| 32  | Armory         | triple | 23   | 161    | 267  | 7-10            | 83 / 88 / 98    | 14 / 16 / 16 | 2.5 / 0.8 / 0.3 |
| 33  | Bank vault     | hot    | 23   | 123    | 198  | 5-9             | 93 / 95 / 100   | 11 / 12 / 13 | 3.4 / 1.4 / 0.8 |
| 34  | Labyrinth      | triple | 23   | 126    | 198  | 11-14           | 78 / 98 / 100   | 19 / 17 / 19 | 1.0 / 0.6 / 0.3 |
| 35  | Six-pack       | hot    | 21   | 118    | 276  | 5-8             | 43 / 68 / 100   | 14 / 15 / 16 | 0.9 / 0.5 / 0.2 |
| 36  | The Great Wall | triple | 33   | 252    | 580  | 9-15            | 83 / 98 / 100   | 29 / 22 / 18 | 2.6 / 2.2 / 1.9 |

How often the careless player cleared each level, in 100, by depth:

| #   | Level          | 11  | 12  | 13  | 14  | 15  | 16  | 17  | 18  | 19  | 20  | 21  | 22  | Least |
| --- | -------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | ----- |
| 1   | Hello, wall    | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100   |
| 2   | Stripes        | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100   |
| 3   | Pips           | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100   |
| 4   | Punch through  | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100   |
| 5   | Girder         | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100   |
| 6   | Zip line       | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 98  | 100 | 100 | 100 | 98    |
| 7   | Plumb line     | 95  | 98  | 93  | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 98  | 93    |
| 8   | Pyramid        | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100   |
| 9   | Gatehouse      | 90  | 100 | 98  | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 90    |
| 10  | Fuse           | 98  | 100 | 98  | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 98    |
| 11  | Crossroads     | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100   |
| 12  | Chain reaction | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100   |
| 13  | Crisscross     | 100 | 100 | 100 | 98  | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 98    |
| 14  | Wool socks     | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100   |
| 15  | Jailbreak      | 100 | 100 | 98  | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 98    |
| 16  | Honeycomb      | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100   |
| 17  | Switchboard    | 93  | 93  | 98  | 95  | 98  | 100 | 98  | 100 | 100 | 100 | 98  | 100 | 93    |
| 18  | Powder keg     | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100   |
| 19  | Pinball        | 100 | 100 | 100 | 100 | 98  | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 98    |
| 20  | Prism break    | 95  | 100 | 98  | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 95    |
| 21  | Wormhole       | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100   |
| 22  | Shutters       | 98  | 100 | 90  | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 90    |
| 23  | Kaleidoscope   | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100   |
| 24  | Bumper cars    | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100   |
| 25  | Split decision | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100   |
| 26  | Back door      | 90  | 100 | 90  | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 90    |
| 27  | Fun house      | 98  | 100 | 95  | 100 | 100 | 95  | 100 | 100 | 100 | 100 | 100 | 100 | 95    |
| 28  | Nutcracker     | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100   |
| 29  | Moss garden    | 90  | 100 | 90  | 100 | 100 | 100 | 100 | 100 | 98  | 100 | 100 | 100 | 90    |
| 30  | Thunderhead    | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100   |
| 31  | Overgrown      | 90  | 98  | 83  | 98  | 95  | 90  | 98  | 100 | 100 | 100 | 100 | 98  | 83    |
| 32  | Armory         | 83  | 93  | 80  | 93  | 98  | 88  | 100 | 98  | 100 | 98  | 95  | 98  | 80    |
| 33  | Bank vault     | 93  | 95  | 90  | 98  | 100 | 95  | 98  | 100 | 95  | 100 | 100 | 100 | 90    |
| 34  | Labyrinth      | 78  | 85  | 93  | 98  | 100 | 98  | 98  | 100 | 100 | 100 | 100 | 100 | 78    |
| 35  | Six-pack       | 43  | 78  | 53  | 73  | 98  | 68  | 95  | 100 | 95  | 100 | 100 | 100 | 43    |
| 36  | The Great Wall | 83  | 100 | 100 | 100 | 100 | 98  | 100 | 100 | 98  | 100 | 100 | 100 | 83    |

It took 231 s on twenty-four cores.

## `node flights.mjs`

The careless player's rounds over every draft on fields 11, 16 and 22
deep, ten games each. A list of four numbers is the middle, the ninth in
ten, the ninety-ninth in a hundred and the most; `bricksBroken` and
`bricksBrokenByBoon` are the worst tenth, the middle, the best tenth and
the most.

```js
{
  games: 1080,
  won: 1057,
  rounds: 11306,
  microsecondsARound: 185,
  unitsFlown: [ 95, 292, 950, 3551 ],
  thingsMet: [ 25, 74, 223, 874 ],
  bricksBroken: [ 2, 9, 27, 97 ],
  bricksBrokenByBoon: {
    plain: '8400 rounds, 2 / 8 / 23 / 97',
    hot: '1888 rounds, 3 / 17 / 33 / 91',
    triple: '1018 rounds, 3 / 16 / 36 / 97'
  },
  boredBalls: 3217,
  stuck: 0,
  roundsByCharge: [ 790, 1005, 1456, 1943, 2646, 3466 ],
  byDepth: {
    '11': {
      rounds: 4210,
      roundsWithABoredBall: 674,
      jumps: 1585,
      longestRunOfJumps: 8,
      runsOfThreeOrMore: 275
    },
    '16': {
      rounds: 3532,
      roundsWithABoredBall: 638,
      jumps: 820,
      longestRunOfJumps: 5,
      runsOfThreeOrMore: 108
    },
    '22': {
      rounds: 3564,
      roundsWithABoredBall: 731,
      jumps: 501,
      longestRunOfJumps: 3,
      runsOfThreeOrMore: 17
    }
  }
}
```
