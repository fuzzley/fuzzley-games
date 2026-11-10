// Prints the figures in the design's "The sketch": `node flights.mjs`. How
// long flights are and what they earn, what a hot shot adds, what the aim is
// worth, what a guide of each length lets a player plan, and what cut
// corners change.
import { LEVELS } from "./levels.mjs";
import {
  AIMS,
  TUNING,
  cloneState,
  fly,
  makeState,
  score,
  shoot,
} from "./sim.mjs";
import { blind, casual, everyAim, guided, rng, sweetSpot } from "./solve.mjs";

const DEPTHS = [11, 16, 22];
/**
 * The design's first guesses at a flight's speed, in units a second: what it
 * leaves at, what it quickens to from each rally, and how many times faster
 * it dashes home after its last strike.
 */
const SPEED = 14,
  QUICKER = [
    [10, 17],
    [25, 20],
    [45, 24],
  ],
  DASH = 3;

/** Returns the value a share `p` of a list lies under. */
function quantile(list, p) {
  const sorted = [...list].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
}
/** Returns a list's mean, to one decimal place. */
function mean(list) {
  return (list.reduce((a, b) => a + b, 0) / Math.max(list.length, 1)).toFixed(
    1,
  );
}
/** Returns a share as a whole number of hundredths. */
function share(part, whole) {
  return Math.round((100 * part) / Math.max(whole, 1));
}

/** Returns the solid part of a brick's cell as a polygon, counter-clockwise; a hatch and a portal have none. */
function solidOf(b, fr) {
  const c = b.c;
  if (b.shape === "sq")
    return [
      [c, fr],
      [c + 1, fr],
      [c + 1, fr + 1],
      [c, fr + 1],
    ];
  if (b.shape === "gem")
    return [
      [c + 0.5, fr],
      [c + 1, fr + 0.5],
      [c + 0.5, fr + 1],
      [c, fr + 0.5],
    ];
  if (b.shape === "hatch" || b.shape === "portal") return null;
  const fx = b.shape === "J" || b.shape === "7",
    fy = b.shape === "F" || b.shape === "7";
  const ax = fx ? c + 1 : c,
    sx = fx ? -1 : 1,
    ay = fy ? fr + 1 : fr,
    sy = fy ? -1 : 1;
  const across = [ax + sx, ay],
    up = [ax, ay + sy];
  return sx * sy > 0 ? [[ax, ay], across, up] : [[ax, ay], up, across];
}
/** Returns how far the leg from p to q runs inside a polygon. */
function lengthInside(p, q, polygon) {
  const dx = q[0] - p[0],
    dy = q[1] - p[1];
  let from = 0,
    to = 1;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i],
      b = polygon[(i + 1) % polygon.length];
    const nx = b[1] - a[1],
      ny = a[0] - b[0];
    const out = (p[0] - a[0]) * nx + (p[1] - a[1]) * ny;
    const away = dx * nx + dy * ny;
    if (Math.abs(away) < 1e-12) {
      if (out >= 0) return 0;
      continue;
    }
    if (away < 0) from = Math.max(from, -out / away);
    else to = Math.min(to, -out / away);
    if (from >= to) return 0;
  }
  return (to - from) * Math.hypot(dx, dy);
}
/**
 * Says whether a flight strayed: whether its middle passed inside a brick
 * still standing as it ended, or came nearer a wall, the ceiling or the
 * floor than a fuzzball's radius. `s` is the wall as the flight left it,
 * before its step, and `trace` the flight's path.
 */
function strayed(s, trace) {
  const solids = [];
  for (const b of s.bricks.values()) {
    const fr = s.base + b.w;
    const polygon = fr < s.D ? solidOf(b, fr) : null;
    if (polygon) solids.push(polygon);
  }
  return trace.some((p, i) => {
    if (!p) return false;
    const [x, y] = p;
    if (x < 0.25 - 1e-9 || x > 9 - 0.25 + 1e-9) return true;
    if (y < 0.25 - 1e-9 || y > s.D - 0.25 + 1e-9) return true;
    const q = trace[i + 1];
    return !!q && solids.some((polygon) => lengthInside(p, q, polygon) > 1e-6);
  });
}
/** Returns where a flight ended against the wall it left: under it, among its bricks, or over it. */
function endedWhere(s, trace) {
  let low = Infinity,
    high = -Infinity;
  for (const b of s.bricks.values()) {
    const fr = s.base + b.w;
    if (fr >= s.D) continue;
    low = Math.min(low, fr);
    high = Math.max(high, fr + 1);
  }
  const y = trace[trace.length - 1][1];
  return y < low ? "under" : y > high ? "over" : "among";
}
/**
 * Returns how many seconds a flight lasts at the design's speeds, its
 * strikes taken as spread evenly along it up to the last.
 */
function secondsOf(shot) {
  const at = (rally) =>
    shot.rally ? (shot.last * Math.min(rally, shot.rally)) / shot.rally : 0;
  let seconds = 0,
    speed = SPEED,
    from = 0;
  for (const [rally, quicker] of QUICKER) {
    if (shot.rally < rally) break;
    seconds += (at(rally) - from) / speed;
    from = at(rally);
    speed = quicker;
  }
  return (
    seconds +
    (shot.last - from) / speed +
    (shot.dist - shot.last) / speed / DASH
  );
}

/**
 * Plays every level as the careless player does, ten games on each of three
 * depths, and returns each round's flight.
 */
function carelessFlights() {
  const shots = [];
  let games = 0,
    won = 0;
  for (const level of LEVELS)
    for (const D of DEPTHS)
      for (let seed = 1; seed <= 10; seed++) {
        const random = rng(seed);
        const s = makeState(level, D);
        while (!s.lost && !s.cleared && s.rounds < 150) {
          let best = 0,
            bestScore = -Infinity;
          for (let i = 0; i < 16; i++) {
            const aim = Math.floor(random() * AIMS.length);
            const t = cloneState(s);
            shoot(t, aim);
            if (score(t) > bestScore) {
              bestScore = score(t);
              best = aim;
            }
          }
          const [dx, dy] = AIMS[best];
          // The flight alone first, to look at the wall as it left it.
          const flown = cloneState(s);
          const trace = [];
          fly(flown, best, trace);
          const shot = shoot(s, best);
          shot.strayed = strayed(flown, trace);
          shot.ended = endedWhere(flown, trace);
          // Every leg of a flight should lie along its aim, mirrored or swapped.
          shot.eight = trace.every((p, i) => {
            const q = trace[i + 1];
            if (!p || !q) return true;
            const lx = Math.abs(q[0] - p[0]),
              ly = Math.abs(q[1] - p[1]);
            const len = Math.hypot(lx, ly);
            if (len < 1e-9) return true;
            const along = Math.abs(lx / len - Math.abs(dx)) < 1e-6;
            const across = Math.abs(lx / len - Math.abs(dy)) < 1e-6;
            return along || across;
          });
          shot.D = D;
          shots.push(shot);
        }
        games++;
        if (s.cleared) won++;
      }
  return { shots, games, won };
}

const started = Date.now();
const { shots, games, won } = carelessFlights();
const plain = shots.filter((s) => !s.hot),
  hot = shots.filter((s) => s.hot);
console.log(`## The careless player's flights\n`);
console.log(
  `${shots.length} rounds in ${games} games, ${won} of them won; ${hot.length} hot shots, which the table and the lines that say "plain" leave out.\n`,
);
console.log("| Of a plain flight | Middle | 9th in 10 | 99th in 100 | Most |");
console.log("| --- | --- | --- | --- | --- |");
for (const [name, f] of [
  ["Bricks struck, its rally", (s) => s.rally],
  ["Bricks broken", (s) => s.broken],
  ["Turns of every kind", (s) => s.bounces],
  ["Units flown", (s) => Math.round(s.dist)],
  ["Units flown after its last strike", (s) => Math.round(s.dist - s.last)],
]) {
  const list = plain.map(f);
  console.log(
    `| ${name} | ${quantile(list, 0.5)} | ${quantile(list, 0.9)} | ${quantile(list, 0.99)} | ${Math.max(...list)} |`,
  );
}
const seconds = plain.map(secondsOf);
console.log(
  `| Seconds at ${SPEED} units a second | ${[0.5, 0.9, 0.99, 1]
    .map((p) =>
      (
        quantile(
          plain.map((s) => s.dist),
          p,
        ) / SPEED
      ).toFixed(0),
    )
    .join(" | ")} |`,
);
console.log(
  `| Seconds, quickening and dashing home | ${[0.5, 0.9, 0.99, 1]
    .map((p) => quantile(seconds, p).toFixed(0))
    .join(" | ")} |`,
);
console.log("");
for (const D of DEPTHS) {
  const on = shots.filter((s) => s.D === D);
  console.log(
    `- On a field ${D} deep: a rally of ${quantile(
      on.map((s) => s.rally),
      0.5,
    )} at the middle and ${quantile(
      on.map((s) => s.rally),
      0.9,
    )} at the 9th in 10; ${share(on.filter((s) => s.jumped).length, on.length)} rounds in 100 ended in a jump.`,
  );
}
console.log(
  `- Floor bounces: ${share(plain.filter((s) => s.earned > 0).length, plain.length)} plain flights in 100 earned one or more, ${share(plain.filter((s) => s.saves > 0).length, plain.length)} used one, ${share(plain.filter((s) => s.saves > 1).length, plain.length)} used two or more; ${mean(plain.map((s) => s.saves))} a flight at the mean.`,
);
console.log(
  `- Bank shots, strikes straight off a side wall or the ceiling: ${mean(plain.map((s) => s.banks))} a flight at the mean; ${share(plain.filter((s) => s.banks > 0).length, plain.length)} plain flights in 100 had one.`,
);
console.log(
  `- Duds: ${share(plain.filter((s) => s.rally <= 1).length, plain.length)} plain flights in 100 struck one brick or none.`,
);
const bored = shots.filter((s) => s.bored);
console.log(
  `- Bored: ${share(bored.length, shots.length)} flights in 100 ended bored, ${bored.length} of them, at a rally of ${quantile(
    bored.map((s) => s.rally),
    0.5,
  )} at the middle; ${share(bored.filter((s) => s.ended === "under").length, bored.length)} in 100 of those yawned under the wall, ${share(bored.filter((s) => s.ended === "among").length, bored.length)} among its bricks and ${share(bored.filter((s) => s.ended === "over").length, bored.length)} over it, and ${bored.filter((s) => s.rally === 0).length} had struck nothing. ${shots.filter((s) => s.stuck).length} flights stuck in place.`,
);
console.log(
  `- Through a brick: ${shots.filter((s) => s.strayed).length} flights passed inside a brick still standing as they ended, or outside the field.`,
);
console.log(
  `- Eight directions: ${shots.filter((s) => !s.eight).length} flights left their aim's eight.`,
);
console.log(
  `- A hot shot: a rally of ${quantile(
    hot.map((s) => s.rally),
    0.5,
  )} at the middle against ${quantile(
    plain.map((s) => s.rally),
    0.5,
  )}, and ${quantile(
    hot.map((s) => s.broken),
    0.5,
  )} bricks broken against ${quantile(
    plain.map((s) => s.broken),
    0.5,
  )}; in the best tenth, ${quantile(
    hot.map((s) => s.broken),
    0.9,
  )} against ${quantile(
    plain.map((s) => s.broken),
    0.9,
  )}.`,
);

// What the aim is worth: every aim from every level's opening.
console.log(`\n## Every aim, as each level opens\n`);
const perAim = [];
let sweet8 = 0,
  sweet15 = 0,
  count = 0,
  stuck = 0,
  strays = 0;
for (const level of LEVELS)
  for (const D of DEPTHS)
    for (const x of [1.5, 4.5, 7.5]) {
      const s = makeState(level, D);
      s.x = x;
      const rallies = AIMS.map((_, aim) => {
        const flown = cloneState(s);
        const trace = [];
        const shot = fly(flown, aim, trace);
        if (shot.stuck) stuck++;
        if (strayed(flown, trace)) strays++;
        return shot.rally;
      });
      perAim.push(...rallies);
      sweet8 += sweetSpot(rallies, 8);
      sweet15 += sweetSpot(rallies, 15);
      count++;
    }
console.log(
  `Over ${perAim.length} flights: a rally of ${quantile(perAim, 0.5)} at the middle, ${quantile(perAim, 0.75)} at the 3rd in 4, ${quantile(perAim, 0.9)} at the 9th in 10, ${quantile(perAim, 0.99)} at the 99th in 100. ${share(perAim.filter((r) => r >= 8).length, perAim.length)} aims in 100 rally 8 or more, and the widest run of them is ${(sweet8 / count).toFixed(1)}° at the mean; of 15 or more, ${(sweet15 / count).toFixed(1)}°. ${stuck} of the flights stuck in place, and ${strays} passed inside a brick still standing as they ended, or outside the field.`,
);

// What a guide of each length lets a player plan.
console.log(`\n## Players, by what they see\n`);
console.log("| Player | Levels cleared, % | A round's rally, mean | Middle |");
console.log("| --- | --- | --- | --- |");
const players = [
  ["Blind: any aim", (l, D, seed) => blind(l, D, seed)],
  ["A guide to the 1st turn", (l, D, seed) => guided(l, D, seed, 1)],
  ["A guide to the 2nd turn", (l, D, seed) => guided(l, D, seed, 2)],
  ["A guide to the 3rd turn", (l, D, seed) => guided(l, D, seed, 3)],
  ["A guide to the 5th turn", (l, D, seed) => guided(l, D, seed, 5)],
  ["A guide to the 8th turn", (l, D, seed) => guided(l, D, seed, 8)],
  [
    "Careless: the best of 16 whole flights",
    (l, D, seed) => casual(l, D, seed),
  ],
];
for (const [name, play] of players) {
  let cleared = 0,
    played = 0;
  const rallies = [];
  for (const level of LEVELS)
    for (const D of DEPTHS)
      for (let seed = 1; seed <= 3; seed++) {
        const game = play(level, D, seed);
        played++;
        if (game.won) cleared++;
        rallies.push(...game.rallies);
      }
  console.log(
    `| ${name} | ${share(cleared, played)} | ${mean(rallies)} | ${quantile(rallies, 0.5)} |`,
  );
}

// What cut corners change.
console.log(`\n## Cut corners against round ones\n`);
console.log(
  "| Corners | Aims in 100 that rally 8 or more | Of those, with both neighbors as long | Widest run, ° | Careless player's levels cleared, % | Its rally, mean |",
);
console.log("| --- | --- | --- | --- | --- | --- |");
for (const round of [false, true]) {
  TUNING.roundCorners = round;
  let long = 0,
    steady = 0,
    aims = 0,
    widest = 0,
    spots = 0,
    cleared = 0,
    played = 0;
  const rallies = [];
  for (const level of LEVELS) {
    // Round corners are only drawn for squares: leave out the walls with slopes.
    if (level.bricks.some((row) => /[LJF7G]/.test(row))) continue;
    for (const D of DEPTHS) {
      for (const x of [1.5, 4.5, 7.5]) {
        const s = makeState(level, D);
        s.x = x;
        const r = everyAim(s);
        widest += sweetSpot(r, 8);
        spots++;
        for (let i = 1; i < r.length - 1; i++) {
          aims++;
          if (r[i] < 8) continue;
          long++;
          if (r[i - 1] >= 8 && r[i + 1] >= 8) steady++;
        }
      }
      for (let seed = 1; seed <= 4; seed++) {
        const game = casual(level, D, seed);
        played++;
        if (game.won) cleared++;
        rallies.push(...game.rallies);
      }
    }
  }
  console.log(
    `| ${round ? "Round" : "Cut"} | ${((100 * long) / aims).toFixed(1)} | ${share(steady, long)} in 100 | ${(widest / spots).toFixed(2)} | ${share(cleared, played)} | ${mean(rallies)} |`,
  );
}
TUNING.roundCorners = false;

// What a round costs to decide.
const level = LEVELS[35];
const s = makeState(level, 22);
const t0 = performance.now();
let n = 0;
for (let aim = 0; aim < AIMS.length; aim++, n++) fly(cloneState(s), aim);
console.log(
  `\nA flight costs ${(((performance.now() - t0) * 1000) / n).toFixed(0)} microseconds to decide, on the last level's opening, a field 22 deep.`,
);
console.log(`\n${((Date.now() - started) / 1000).toFixed(0)} s`);
