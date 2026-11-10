// The flight, the bricks and the wall's step, as the design's feasibility
// sketch played them. Throwaway code written to test the design in
// ../design.md, not the game's: see README.md for how it differs from it.

/** The field's width in cells, and the fuzzball's radius. */
export const C = 9,
  R = 0.25;
/** How far a 45° face stands off from the fuzzball's middle: R times the square root of 2. */
const H = 0.35355339059327373;
/** The length of the short flat that cuts a ramp's or a gem's point. */
const TIP = H - R;
const EPS = 1e-9;

/**
 * The numbers the reports vary: how many strikes earn a flight's first floor
 * bounce, how many more each further one costs than the last, and how many a
 * flight can hold; how many times the hatches hold a flight up; how far a
 * fuzzball flies without a strike before it is bored, the cap on a flight,
 * and whether corners are cut (the design's) or round (what a real ball
 * would do).
 */
export const TUNING = {
  netFirst: 10,
  netMore: 5,
  netCap: 3,
  hatchHolds: 3,
  bored: 60,
  maxDist: 4000,
  roundCorners: false,
};

/** The 657 aims, a quarter of a degree apart, from 8° above the floor either way. */
export const AIMS = [];
for (let q = 32; q <= 688; q++) {
  const a = (q / 4) * (Math.PI / 180);
  AIMS.push([Math.cos(a), Math.sin(a), q / 4]);
}

/** What each kind is: `needed` to clear a level, or one that `never` breaks. */
export const K = {
  plain: { needed: true },
  tough: { needed: true },
  steel: { never: true },
  ramp: { never: true },
  hatch: { never: true },
  spring: { needed: true },
  plated: { needed: true },
  moss: { needed: true },
  lock: { needed: true },
  gem: { needed: true },
  portal: { never: true, sensor: true },
};

const BOTTOM = 1,
  TOP = 2,
  LEFT = 4,
  RIGHT = 8;
const OPPOSITE = { 1: 2, 2: 1, 4: 8, 8: 4 };
const TOWARD = { 1: [0, -1], 2: [0, 1], 4: [-1, 0], 8: [1, 0] };

/** A wall's characters: a kind, its hits, its shape, and a plate's faces or a lock's bounces. */
export const LEGEND = {
  o: ["plain", 1, "sq"],
  2: ["tough", 2, "sq"],
  3: ["tough", 3, "sq"],
  4: ["tough", 4, "sq"],
  5: ["tough", 5, "sq"],
  6: ["tough", 6, "sq"],
  "#": ["steel", 0, "sq"],
  L: ["ramp", 0, "L"],
  J: ["ramp", 0, "J"],
  F: ["ramp", 0, "F"],
  7: ["ramp", 0, "7"],
  "=": ["hatch", 0, "hatch"],
  S: ["spring", 1, "sq"],
  v: ["plated", 2, "sq", BOTTOM],
  V: ["plated", 3, "sq", BOTTOM],
  U: ["plated", 2, "sq", BOTTOM | LEFT | RIGHT],
  M: ["moss", 2, "sq"],
  N: ["moss", 3, "sq"],
  x: ["lock", 1, "sq", 4],
  y: ["lock", 1, "sq", 8],
  z: ["lock", 1, "sq", 12],
  G: ["gem", 1, "gem"],
  "@": ["portal", 0, "portal"],
  "&": ["portal", 0, "portal"],
};

/** The sides of its cell a shape fills from end to end, as bits. */
const EDGES = {
  sq: 15,
  wall: 15,
  L: BOTTOM | LEFT,
  J: BOTTOM | RIGHT,
  F: TOP | LEFT,
  7: TOP | RIGHT,
  hatch: 0,
  gem: 0,
  portal: 0,
};
/**
 * The corners of its cell a shape reaches: bottom left 1, bottom right 2, top
 * left 4, top right 8. A hatch reaches none: its bar is air to a fuzzball
 * under it, so a brick's corner beside one is cut like any open corner.
 */
const CORNERS = {
  sq: 15,
  wall: 15,
  L: 7,
  J: 11,
  F: 13,
  7: 14,
  hatch: 0,
  gem: 0,
  portal: 0,
};

/** Returns a new game of a level on a field D rows deep. */
export function makeState(level, D) {
  const rows = level.bricks;
  const bricks = new Map();
  const portals = {};
  rows.forEach((line, i) => {
    if (line.length !== C)
      throw new Error(`${level.name}: row ${i} is ${line.length} wide`);
    const w = rows.length - 1 - i;
    [...line].forEach((ch, c) => {
      if (ch === ".") return;
      const spec = LEGEND[ch];
      if (!spec) throw new Error(`${level.name}: unknown ${ch}`);
      const b = {
        ch,
        k: spec[0],
        hp: spec[1],
        full: spec[1],
        shape: spec[2],
        plate: spec[0] === "plated" ? spec[3] : 0,
        lock: spec[0] === "lock" ? spec[3] : 0,
        open: false,
        c,
        w,
        pair: null,
      };
      if (b.k === "portal") (portals[ch] ??= []).push(b);
      bricks.set(w * C + c, b);
    });
  });
  for (const pair of Object.values(portals)) {
    if (pair.length !== 2) throw new Error(`${level.name}: portal pair`);
    pair[0].pair = pair[1];
    pair[1].pair = pair[0];
  }
  return {
    D,
    base: startOf(D),
    bricks,
    x: 4.5,
    // Whether the next shot is a hot shot, earned by the last round's jump.
    hot: false,
    rounds: 0,
    jumps: 0,
    lost: false,
    cleared: false,
  };
}
/** Returns the row a wall's lowest row starts in on a field D deep: where a jump would leave it. */
export function startOf(D) {
  return D - 2 * jumpOf(D);
}
/** Returns how many rows the wall jumps on a field D deep: a third, in whole rows. */
export function jumpOf(D) {
  return Math.floor((D - 1) / 3);
}
export function cloneState(s) {
  const bricks = new Map();
  const copies = new Map();
  for (const [key, b] of s.bricks) {
    const n = { ...b };
    bricks.set(key, n);
    copies.set(b, n);
  }
  for (const n of bricks.values())
    if (n.pair) n.pair = copies.get(n.pair) ?? null;
  return { ...s, bricks };
}

/** Returns the shape in a cell of the field: "wall" outside it, undefined for air. */
function shapeAt(s, c, fr) {
  if (c < 0 || c >= C || fr >= s.D) return "wall";
  const b = s.bricks.get((fr - s.base) * C + c);
  return b === undefined || b.open ? undefined : b.shape;
}
/** Says whether the flat on one side of a cell is open: nothing beside it fills that side. */
function flatOpen(s, c, fr, side, self) {
  const [dx, dy] = TOWARD[side];
  const n = shapeAt(s, c + dx, fr + dy);
  if (n === undefined) return true;
  // A hatch is air to the bricks beside it, so a fuzzball in its cell still
  // meets them, and two hatches side by side are one bar.
  if (n === "hatch") return !(self === "hatch" && side >= LEFT);
  return !(EDGES[n] & OPPOSITE[side]);
}
/** Says whether nothing but the cell itself reaches the corner point (px, py). */
function cornerFree(s, c, fr, px, py) {
  for (let i = 0; i < 2; i++)
    for (let j = 0; j < 2; j++) {
      const cc = px - 1 + i,
        rr = py - 1 + j;
      if (cc === c && rr === fr) continue;
      const shape = shapeAt(s, cc, rr);
      if (shape && CORNERS[shape] & (1 << (1 - i + 2 * (1 - j)))) return false;
    }
  return true;
}

/**
 * Offers each face of a brick the fuzzball's middle can meet: flats a quarter
 * of a unit off its sides, and 45° cuts across its corners.
 */
function faces(s, b, c, fr, offer) {
  const shape = b.shape;
  if (shape === "gem") {
    for (const [sx, sy] of [
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ]) {
      const k = sx * (c + 0.5) + sy * (fr + 0.5) + 0.5 + H;
      const x0 = c + 0.5 + sx * TIP,
        x1 = c + 0.5 + sx * (0.5 + R);
      offer.diag(b, sx, sy, k, Math.min(x0, x1), Math.max(x0, x1), 0, true);
    }
    offer.flatH(b, fr - R, c + 0.5 - TIP, c + 0.5 + TIP, -1, BOTTOM);
    offer.flatH(b, fr + 1 + R, c + 0.5 - TIP, c + 0.5 + TIP, 1, TOP);
    offer.flatV(b, c - R, fr + 0.5 - TIP, fr + 0.5 + TIP, -1, LEFT);
    offer.flatV(b, c + 1 + R, fr + 0.5 - TIP, fr + 0.5 + TIP, 1, RIGHT);
    return;
  }
  if (shape === "hatch") {
    // A thin bar along the top of its cell, and nothing under it: only a
    // fuzzball coming down meets its flat, and its ends are cut like a
    // brick's corners where nothing stands beside them.
    if (!flatOpen(s, c, fr, TOP, shape)) return;
    offer.flatH(b, fr + 1 + R, c, c + 1, 1, TOP);
    for (const sx of [-1, 1]) {
      const h = sx < 0 ? LEFT : RIGHT;
      const px = sx < 0 ? c : c + 1;
      if (flatOpen(s, c, fr, h, shape) && cornerFree(s, c, fr, px, fr + 1))
        corner(offer, b, px, fr + 1, sx, 1, h | TOP);
    }
    return;
  }
  if (shape === "sq") {
    const open = {
      [BOTTOM]: flatOpen(s, c, fr, BOTTOM, shape),
      [TOP]: flatOpen(s, c, fr, TOP, shape),
      [LEFT]: flatOpen(s, c, fr, LEFT, shape),
      [RIGHT]: flatOpen(s, c, fr, RIGHT, shape),
    };
    if (open[BOTTOM]) offer.flatH(b, fr - R, c, c + 1, -1, BOTTOM);
    if (open[TOP]) offer.flatH(b, fr + 1 + R, c, c + 1, 1, TOP);
    if (open[LEFT]) offer.flatV(b, c - R, fr, fr + 1, -1, LEFT);
    if (open[RIGHT]) offer.flatV(b, c + 1 + R, fr, fr + 1, 1, RIGHT);
    for (const [sx, sy] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ]) {
      const h = sx < 0 ? LEFT : RIGHT,
        v = sy < 0 ? BOTTOM : TOP;
      if (!open[h] || !open[v]) continue;
      const px = sx < 0 ? c : c + 1,
        py = sy < 0 ? fr : fr + 1;
      if (!cornerFree(s, c, fr, px, py)) continue;
      corner(offer, b, px, py, sx, sy, h | v);
    }
    return;
  }
  // A ramp: its right angle at (ax, ay), its legs running sx along x and sy
  // along y from there, and its long face looking the same way.
  const fx = shape === "J" || shape === "7",
    fy = shape === "F" || shape === "7";
  const ax = fx ? c + 1 : c,
    sx = fx ? -1 : 1,
    ay = fy ? fr + 1 : fr,
    sy = fy ? -1 : 1;
  const sideX = fy ? TOP : BOTTOM,
    sideY = fx ? RIGHT : LEFT,
    tipX = fx ? LEFT : RIGHT,
    tipY = fy ? BOTTOM : TOP;
  const legX = flatOpen(s, c, fr, sideX, shape),
    legY = flatOpen(s, c, fr, sideY, shape),
    endX = flatOpen(s, c, fr, tipX, shape),
    endY = flatOpen(s, c, fr, tipY, shape);
  if (legX) offer.flatH(b, ay - sy * R, c, c + 1, -sy, sideX);
  if (legY) offer.flatV(b, ax - sx * R, fr, fr + 1, -sx, sideY);
  if (legX && legY && cornerFree(s, c, fr, ax, ay))
    corner(offer, b, ax, ay, -sx, -sy, sideX | sideY);
  if (endX) {
    const y0 = ay,
      y1 = ay + sy * TIP;
    offer.flatV(
      b,
      ax + sx + sx * R,
      Math.min(y0, y1),
      Math.max(y0, y1),
      sx,
      tipX,
    );
    if (legX && cornerFree(s, c, fr, ax + sx, ay))
      corner(offer, b, ax + sx, ay, sx, -sy, sideX | tipX);
  }
  if (endY) {
    const x0 = ax,
      x1 = ax + sx * TIP;
    offer.flatH(
      b,
      ay + sy + sy * R,
      Math.min(x0, x1),
      Math.max(x0, x1),
      sy,
      tipY,
    );
    if (legY && cornerFree(s, c, fr, ax, ay + sy))
      corner(offer, b, ax, ay + sy, -sx, sy, sideY | tipY);
  }
  const x0 = ax + sx * TIP,
    x1 = ax + sx * (1 + R);
  offer.diag(
    b,
    sx,
    sy,
    sx * ax + sy * ay + 1 + H,
    Math.min(x0, x1),
    Math.max(x0, x1),
    0,
    true,
  );
}
/** Offers the corner at (px, py), looking out along (sx, sy): cut at 45°, or round. */
function corner(offer, b, px, py, sx, sy, sides) {
  if (TUNING.roundCorners) offer.point(b, px, py, sides);
  else {
    const x0 = px,
      x1 = px + sx * R;
    offer.diag(
      b,
      sx,
      sy,
      sx * px + sy * py + R,
      Math.min(x0, x1),
      Math.max(x0, x1),
      sides,
      false,
    );
  }
}

/** Returns how far a fuzzball flies before it next meets something, and everything it meets there. */
function nextContact(s, ball) {
  const { x, y, dx, dy } = ball;
  let best = Infinity;
  let hits = [];
  const take = (t, hit) => {
    if (t < best - 1e-12) {
      best = t;
      hits = [hit];
    } else if (t <= best + 1e-12) hits.push(hit);
  };
  const offer = {
    flatH(b, at, x0, x1, ny, side) {
      if (dy * ny >= 0) return;
      let t = (at - y) / dy;
      if (t < -EPS) return;
      if (t < 0) t = 0;
      const px = x + dx * t;
      if (px < x0 - EPS || px > x1 + EPS) return;
      take(t, { b, flip: "y", side });
    },
    flatV(b, at, y0, y1, nx, side) {
      if (dx * nx >= 0) return;
      let t = (at - x) / dx;
      if (t < -EPS) return;
      if (t < 0) t = 0;
      const py = y + dy * t;
      if (py < y0 - EPS || py > y1 + EPS) return;
      take(t, { b, flip: "x", side });
    },
    diag(b, mx, my, k, x0, x1, sides, long) {
      const toward = mx * dx + my * dy;
      if (toward >= 0) return;
      let t = (k - (mx * x + my * y)) / toward;
      if (t < -EPS) return;
      if (t < 0) t = 0;
      const px = x + dx * t;
      if (px < x0 - EPS || px > x1 + EPS) return;
      take(t, { b, swap: mx * my, mx, my, sides, long });
    },
    point(b, px, py, sides) {
      const ox = x - px,
        oy = y - py;
      const approach = ox * dx + oy * dy;
      if (approach >= 0) return;
      const outside = ox * ox + oy * oy - R * R;
      if (outside <= 0) return take(0, { b, round: [px, py], sides });
      const disc = approach * approach - outside;
      if (disc <= 0) return;
      take(-approach - Math.sqrt(disc), { b, round: [px, py], sides });
    },
  };
  if (dy < 0) take(Math.max(0, (R - y) / dy), { wall: "floor" });
  if (dy > 0) take(Math.max(0, (s.D - R - y) / dy), { wall: "ceiling" });
  if (dx < 0) take(Math.max(0, (R - x) / dx), { wall: "side" });
  if (dx > 0) take(Math.max(0, (C - R - x) / dx), { wall: "side" });
  for (const b of s.bricks.values()) {
    const fr = s.base + b.w;
    if (fr >= s.D || b.open) continue;
    const c = b.c;
    if (K[b.k].sensor) {
      if (ball.ignore === b) continue;
      // The fuzzball's middle crossing into the portal's eye, the middle
      // half of its cell: no nearer the cell's edge than a face stands off,
      // so its twin never sets a fuzzball down behind a neighbor's face.
      const x0 = c + R,
        x1 = c + 1 - R,
        y0 = fr + R,
        y1 = fr + 1 - R;
      const tx = dx > 0 ? (x0 - x) / dx : dx < 0 ? (x1 - x) / dx : -Infinity;
      const ty = dy > 0 ? (y0 - y) / dy : dy < 0 ? (y1 - y) / dy : -Infinity;
      const tIn = Math.max(tx, ty, 0);
      const px = x + dx * tIn,
        py = y + dy * tIn;
      if (
        px >= x0 - 1e-12 &&
        px <= x1 + 1e-12 &&
        py >= y0 - 1e-12 &&
        py <= y1 + 1e-12
      ) {
        const inside = x > x0 && x < x1 && y > y0 && y < y1;
        if (!inside || tIn === 0) take(tIn, { b, sensor: true });
      }
      continue;
    }
    faces(s, b, c, fr, offer);
  }
  return { t: best, hits };
}

/** Takes a strike off a brick, if the strike counts, and says whether it did. */
function strike(s, ball, hit, shot) {
  const b = hit.b;
  // The hatches hold a flight up a few times between them, then every one
  // hangs open until it lands.
  if (b.k === "hatch" && ++shot.propped >= TUNING.hatchHolds)
    for (const other of s.bricks.values())
      if (other.k === "hatch") other.open = true;
  if (K[b.k].never) return false;
  if (!s.bricks.has(b.w * C + b.c)) return false;
  if (b.k === "plated") {
    const sides = hit.side ?? hit.sides ?? 0;
    if (sides !== 0 && (b.plate & sides) === sides) return false;
  }
  // A lock is shut until the flight has turned as often as its number.
  if (b.k === "lock" && shot.bounces < b.lock) {
    shot.locked++;
    return false;
  }
  ball.idle = 0;
  ball.rally++;
  shot.last = ball.dist;
  if (ball.rally >= ball.nextNet) {
    ball.netStep += TUNING.netMore;
    ball.nextNet += ball.netStep;
    if (ball.held < TUNING.netCap) {
      ball.held++;
      shot.earned++;
    }
  }
  b.hp -= ball.hot ? 2 : 1;
  if (b.hp <= 0) {
    s.bricks.delete(b.w * C + b.c);
    shot.broken++;
    if (b.k === "spring" && ball.held < TUNING.netCap) {
      ball.held++;
      shot.earned++;
    }
  }
  return true;
}

/**
 * Flies one shot without the wall's step after it, breaking what it breaks.
 * Returns what happened: the bricks struck (`rally`) and broken, every turn
 * (`bounces`), the floor bounces earned and used, how far it flew (`dist`),
 * and how far it had flown at its last strike (`last`).
 * `trace`, if given, takes the fuzzball's path, a point a turn. With `turns`,
 * the flight is cut short after that many, as an aim guide would show it:
 * `cut` then says it was still in the air, and `height` how high.
 */
export function fly(s, aim, trace, turns = Infinity) {
  const [dx, dy] = AIMS[aim];
  const shot = {
    rally: 0,
    broken: 0,
    bounces: 0,
    banks: 0,
    earned: 0,
    saves: 0,
    locked: 0,
    // How often the hatches have held it up.
    propped: 0,
    bored: false,
    dist: 0,
    // How far it had flown at its last strike.
    last: 0,
    hot: s.hot,
  };
  const ball = {
    x: s.x,
    y: R,
    dx,
    dy,
    hot: s.hot,
    // A hot shot leaves with a floor bounce in hand.
    held: s.hot ? 1 : 0,
    nextNet: TUNING.netFirst,
    netStep: TUNING.netFirst,
    rally: 0,
    idle: 0,
    still: 0,
    dist: 0,
    ignore: null,
    offWall: false,
  };
  if (trace) trace.push([ball.x, ball.y]);
  let guard = 0;
  for (;;) {
    if (guard++ > 400000) throw new Error("flight never ended");
    const { t, hits } = nextContact(s, ball);
    ball.x += ball.dx * t;
    ball.y += ball.dy * t;
    ball.dist += t;
    ball.idle += t;
    ball.still = t === 0 ? ball.still + 1 : 0;
    if (trace) trace.push([ball.x, ball.y]);
    if (
      ball.dist > TUNING.maxDist ||
      ball.idle > TUNING.bored ||
      ball.still > 8
    ) {
      shot.bored = true;
      if (ball.still > 8) shot.stuck = true;
      break;
    }
    let flipX = false,
      flipY = false,
      landed = false,
      turned = false,
      struck = false,
      wall = false;
    const seen = new Set();
    const hitOnce = (hit) => {
      if (seen.has(hit.b)) return;
      seen.add(hit.b);
      if (strike(s, ball, hit, shot)) struck = true;
    };
    for (const hit of hits) {
      if (hit.wall === "floor") {
        if (ball.held > 0) {
          ball.held--;
          shot.saves++;
          flipY = true;
        } else landed = true;
      } else if (hit.wall === "ceiling") {
        flipY = true;
        wall = true;
      } else if (hit.wall === "side") {
        flipX = true;
        wall = true;
      } else if (hit.sensor) {
        const o = hit.b.pair;
        if (s.base + o.w < s.D) {
          ball.x += o.c - hit.b.c;
          ball.y += o.w - hit.b.w;
          ball.ignore = o;
          if (trace) trace.push(null, [ball.x, ball.y]);
        } else ball.ignore = hit.b;
      } else if (hit.flip) {
        if (hit.flip === "x") flipX = true;
        else flipY = true;
        hitOnce(hit);
      }
    }
    if (landed) break;
    if (flipX) ball.dx = -ball.dx;
    if (flipY) ball.dy = -ball.dy;
    turned = flipX || flipY;
    // A long 45° face turns it after the flats, if it still flies into it.
    for (const hit of hits) {
      if (!hit.long || hit.mx * ball.dx + hit.my * ball.dy >= 0) continue;
      swap(ball, hit.swap);
      turned = true;
      hitOnce(hit);
    }
    // A corner turns it only where nothing else did.
    if (!turned) {
      const hit = hits.find((h) => h.swap !== undefined && !h.long);
      const round = hits.find((h) => h.round);
      if (hit) {
        swap(ball, hit.swap);
        turned = true;
        hitOnce(hit);
      } else if (round) {
        const nx = (ball.x - round.round[0]) / R,
          ny = (ball.y - round.round[1]) / R;
        const dot = ball.dx * nx + ball.dy * ny;
        if (dot < 0) {
          ball.dx -= 2 * dot * nx;
          ball.dy -= 2 * dot * ny;
          const n = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
          ball.dx /= n;
          ball.dy /= n;
          turned = true;
          hitOnce(round);
        }
      }
    }
    if (turned) {
      shot.bounces++;
      if (shot.bounces >= turns) {
        shot.cut = true;
        shot.height = ball.y;
        break;
      }
      if (!hits.some((h) => h.sensor)) ball.ignore = null;
      // A bank is a strike that comes straight off a side wall or the ceiling.
      if (struck && ball.offWall) shot.banks++;
      if (struck) ball.offWall = false;
      else if (wall) ball.offWall = true;
    }
  }
  for (const b of s.bricks.values()) if (b.k === "hatch") b.open = false;
  shot.rally = ball.rally;
  shot.dist = ball.dist;
  shot.landed = ball.x;
  return shot;
}

/** Plays one shot and the wall's step after it, changing the state. Returns what `fly()` does. */
export function shoot(s, aim, trace) {
  const shot = fly(s, aim, trace);
  s.rounds++;
  s.x = Math.min(C - 0.5, Math.max(0.5, shot.landed));
  let needed = 0;
  for (const b of s.bricks.values()) if (K[b.k].needed) needed++;
  shot.steps = 0;
  if (needed === 0) {
    s.cleared = true;
    return shot;
  }
  // The wall steps a row, unless the round left the lower two thirds of the
  // field clear: then it jumps a third of the field, and the next shot is a
  // hot shot.
  const jump = jumpOf(s.D);
  const jumped = lowestNeeded(s) >= s.D - jump;
  shot.steps = jumped ? jump : 1;
  shot.jumped = jumped;
  s.hot = jumped;
  if (jumped) s.jumps++;
  for (const b of s.bricks.values())
    if (b.k === "moss" && b.hp < b.full) b.hp++;
  s.base -= shot.steps;
  for (const [key, b] of [...s.bricks])
    if (s.base + b.w <= 0) {
      if (K[b.k].needed) s.lost = true;
      else {
        s.bricks.delete(key);
        if (b.pair) s.bricks.delete(b.pair.w * C + b.pair.c);
      }
    }
  return shot;
}
/** Turns a fuzzball off a 45° face: its two speeds change places. */
function swap(ball, sign) {
  const { dx, dy } = ball;
  if (sign > 0) {
    ball.dx = -dy;
    ball.dy = -dx;
  } else {
    ball.dx = dy;
    ball.dy = dx;
  }
}
/** Returns the lowest row a brick the level needs stands in. */
export function lowestNeeded(s) {
  let low = Infinity;
  for (const b of s.bricks.values())
    if (K[b.k].needed) low = Math.min(low, s.base + b.w);
  return low;
}
/** Scores a wall for the solver and the careless player: less left, and higher up, is better. */
export function score(s) {
  if (s.lost) return -1e9;
  if (s.cleared) return 1e9 - s.rounds * 1000;
  let total = 0,
    low = Infinity;
  for (const b of s.bricks.values()) {
    if (!K[b.k].needed) continue;
    const row = s.base + b.w;
    low = Math.min(low, row);
    total += (b.hp + 1.5) * (1 + 14 / (row * row));
  }
  return -total - (low <= 1 ? 500 : low === 2 ? 60 : 0) + (s.hot ? 25 : 0);
}
