// The flight, the bricks and the wall's step, as the plan's feasibility
// sketch played them. Throwaway code written to test the design in
// ../plan.md, not the game's: see README.md for how it differs from the plan.
export const C = 9,
  BR = 0.25,
  CHARGE_MAX = 5,
  ZAP = 2,
  MAX_DIST = 600,
  BORED = 60,
  FRIEND_GAP = 0.7;
const COS30 = 0.8660254037844386,
  SIN30 = 0.5;
export const AIMS = [];
for (let a = 8; a <= 172; a += 1)
  AIMS.push([Math.cos((a * Math.PI) / 180), Math.sin((a * Math.PI) / 180), a]);

// kinds: needed = must be broken to clear; solid = box collider
const K = {
  plain: { needed: true },
  tough: { needed: true },
  steel: { never: true },
  plated: { needed: true },
  shell: { needed: true },
  moss: { needed: true },
  row: { needed: true, pattern: "row" },
  col: { needed: true, pattern: "col" },
  cross: { needed: true, pattern: "cross" },
  bomb: { needed: true, pattern: "bomb" },
  xb: { needed: true, pattern: "x" },
  prism: { needed: true },
  wool: { needed: true },
  cage: { needed: true },
  bumper: { never: true, round: true },
  portal: { never: true, sensor: true },
};
const LEGEND = {
  o: ["plain", 1],
  2: ["tough", 2],
  3: ["tough", 3],
  4: ["tough", 4],
  5: ["tough", 5],
  6: ["tough", 6],
  "#": ["steel", 0],
  "-": ["row", 1],
  "|": ["col", 1],
  "+": ["cross", 1],
  "*": ["bomb", 1],
  x: ["xb", 1],
  P: ["prism", 1],
  W: ["wool", 1],
  C: ["cage", 2],
  B: ["bumper", 0],
  "@": ["portal", 0],
  "&": ["portal", 0],
  S: ["shell", 2],
  T: ["shell", 3],
  M: ["moss", 2],
  N: ["moss", 3],
  v: ["plated", 2, 1],
  V: ["plated", 3, 1],
  U: ["plated", 2, 1 | 4 | 8],
  "^": ["plated", 2, 2],
};
export function makeState(level, D) {
  const rows = level.rows;
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
        k: spec[0],
        hp: spec[1],
        full: spec[1],
        plate: spec[2] ?? 0,
        c,
        w,
        pair: null,
      };
      if (b.k === "portal") {
        (portals[ch] ??= []).push(b);
      }
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
    friends: level.friends ?? 0,
    boonKind: level.boon ?? "hot",
    // The boon the next shot has, earned by the last round's jump.
    boon: null,
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
/**
 * Returns how many rows the wall jumps on a field D deep: a third of them,
 * in whole rows, the odd rows left to the third over the floor.
 */
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
const at = (s, c, fr) =>
  c < 0 || c >= C || fr >= s.D
    ? undefined
    : s.bricks.get((fr - s.base) * C + c);
const solidAt = (s, c, fr) => {
  const b = at(s, c, fr);
  return b !== undefined && !K[b.k].round && !K[b.k].sensor;
};

function nextContact(s, ball) {
  const { x, y, dx, dy } = ball;
  let best = Infinity;
  let hits = [];
  const offer = (t, hit) => {
    if (t < best) {
      best = t;
      hits = [hit];
    } else if (t === best && t !== Infinity) hits.push(hit);
  };
  const line = (across, dAcross, along, dAlong, lineAt, facing, from, to) => {
    const toward = dAcross * facing;
    if (toward >= 0) return Infinity;
    const inFront = (across - lineAt) * facing;
    if (inFront < 0) return Infinity;
    const gap = inFront - BR;
    const t = gap <= 0 ? 0 : gap / -toward;
    const where = along + dAlong * t;
    return where >= from && where <= to ? t : Infinity;
  };
  const point = (px, py, rad) => {
    const ox = x - px,
      oy = y - py;
    const approach = ox * dx + oy * dy;
    if (approach >= 0) return Infinity;
    const outside = ox * ox + oy * oy - rad * rad;
    if (outside <= 0) return 0;
    const disc = approach * approach - outside;
    if (disc <= 0) return Infinity;
    return -approach - Math.sqrt(disc);
  };
  offer(line(y, dy, x, dx, 0, 1, -1e9, 1e9), { wall: "floor" });
  offer(line(y, dy, x, dx, s.D, -1, -1e9, 1e9), { wall: "ceil" });
  offer(line(x, dx, y, dy, 0, 1, -1e9, 1e9), { wall: "side" });
  offer(line(x, dx, y, dy, C, -1, -1e9, 1e9), { wall: "side" });
  for (const b of s.bricks.values()) {
    const fr = s.base + b.w;
    if (fr >= s.D) continue;
    const c = b.c;
    const kind = K[b.k];
    if (kind.round) {
      offer(point(c + 0.5, fr + 0.5, BR + 0.38), { b, round: true });
      continue;
    }
    if (kind.sensor) {
      if (ball.ignore === b) continue;
      // entering the cell itself (not inflated): the centre crosses an edge
      const tx = dx > 0 ? (c - x) / dx : dx < 0 ? (c + 1 - x) / dx : -Infinity;
      const ty =
        dy > 0 ? (fr - y) / dy : dy < 0 ? (fr + 1 - y) / dy : -Infinity;
      const tIn = Math.max(tx, ty, 0);
      const px = x + dx * tIn,
        py = y + dy * tIn;
      if (
        px >= c - 1e-12 &&
        px <= c + 1 + 1e-12 &&
        py >= fr - 1e-12 &&
        py <= fr + 1 + 1e-12 &&
        tIn !== -Infinity
      ) {
        const inside = x > c && x < c + 1 && y > fr && y < fr + 1;
        if (!inside || tIn === 0) offer(tIn, { b, sensor: true });
      }
      continue;
    }
    const below = solidAt(s, c, fr - 1),
      above = solidAt(s, c, fr + 1),
      left = solidAt(s, c - 1, fr),
      right = solidAt(s, c + 1, fr);
    if (!below) offer(line(y, dy, x, dx, fr, -1, c, c + 1), { b, face: 1 });
    if (!above) offer(line(y, dy, x, dx, fr + 1, 1, c, c + 1), { b, face: 2 });
    if (!left) offer(line(x, dx, y, dy, c, -1, fr, fr + 1), { b, face: 4 });
    if (!right) offer(line(x, dx, y, dy, c + 1, 1, fr, fr + 1), { b, face: 8 });
    if (!below && !left)
      offer(point(c, fr, BR), { b, corner: [c, fr], faces: 1 | 4 });
    if (!below && !right)
      offer(point(c + 1, fr, BR), { b, corner: [c + 1, fr], faces: 1 | 8 });
    if (!above && !left)
      offer(point(c, fr + 1, BR), { b, corner: [c, fr + 1], faces: 2 | 4 });
    if (!above && !right)
      offer(point(c + 1, fr + 1, BR), {
        b,
        corner: [c + 1, fr + 1],
        faces: 2 | 8,
      });
  }
  return { t: best, hits };
}

function zapCells(s, b) {
  const fr = s.base + b.w,
    c = b.c,
    out = [];
  const p = K[b.k].pattern;
  const push = (cc, rr) => {
    const o = at(s, cc, rr);
    if (o && o !== b && rr >= 1) out.push(o);
  };
  if (p === "row" || p === "cross") for (let cc = 0; cc < C; cc++) push(cc, fr);
  if (p === "col" || p === "cross")
    for (let rr = 1; rr < s.D; rr++) push(c, rr);
  if (p === "bomb")
    for (let i = -1; i <= 1; i++)
      for (let j = -1; j <= 1; j++) if (i || j) push(c + i, fr + j);
  if (p === "x")
    for (let d = 1; d < 4; d++)
      for (const [i, j] of [
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
      ])
        push(c + i * d, fr + j * d);
  return out;
}
function breakBrick(s, b, shot, ball) {
  if (!s.bricks.delete(b.w * C + b.c)) return;
  shot.broken++;
  if (b.k === "cage") shot.freed++;
  if (b.k === "prism" && ball) shot.spawn.push(ball);
  if (b.k === "wool" && ball) ball.recharge = true;
  if (K[b.k].pattern)
    for (const o of zapCells(s, b)) {
      if (K[o.k].never) continue;
      o.hp -= ZAP;
      if (o.hp <= 0) breakBrick(s, o, shot, null);
    }
}
function strike(s, ball, hit, shot) {
  const b = hit.b;
  const kind = K[b.k];
  if (!s.bricks.has(b.w * C + b.c)) return "pierce";
  if (!kind.never) ball.idle = 0;
  const plated = hit.face
    ? (b.plate & hit.face) !== 0
    : hit.faces
      ? (b.plate & hit.faces) === hit.faces
      : false;
  if (kind.never || plated) {
    if (!ball.hot) ball.charge = 0;
    return "bounce";
  }
  if (ball.charge > 0) {
    const spend = Math.min(ball.charge, b.hp);
    b.hp -= spend;
    // A hot shot's charge never runs down.
    if (!ball.hot) ball.charge -= spend;
    if (b.hp <= 0) {
      breakBrick(s, b, shot, ball);
      return "pierce";
    }
    return "bounce";
  }
  if (b.k === "shell") return "bounce";
  b.hp -= 1;
  if (b.hp <= 0) breakBrick(s, b, shot, ball);
  return "bounce";
}
/** Plays one shot and the wall's step after it, changing the state. Returns what happened. */
export function shoot(s, aim, charge, trace) {
  const [dx, dy] = AIMS[aim];
  const shot = {
    broken: 0,
    freed: 0,
    spawn: [],
    contacts: 0,
    tired: 0,
    dist: 0,
  };
  const hot = s.boon === "hot";
  const mates = s.boon === "triple" ? 2 : 0;
  shot.boon = s.boon;
  const balls = [
    {
      x: s.x,
      y: BR,
      dx,
      dy,
      // A hot shot flies at full charge, keeps it, and bounces off the floor once.
      charge: hot ? CHARGE_MAX : charge,
      hot,
      lives: hot ? 1 : 0,
      lead: true,
      time: 0,
      dist: 0,
      alive: true,
      ignore: null,
      landX: s.x,
    },
  ];
  // A triple shot's two mates carry the charge too; friends carry none.
  for (let i = 0; i < mates + s.friends; i++)
    balls.push({
      x: s.x,
      y: BR,
      dx,
      dy,
      charge: i < mates ? charge : 0,
      hot: false,
      lives: 0,
      lead: false,
      time: (i + 1) * FRIEND_GAP,
      dist: 0,
      alive: true,
      ignore: null,
      landX: s.x,
    });
  let guard = 0;
  while (guard++ < 200000) {
    let pick = null,
      pickAt = Infinity,
      pickContact = null;
    for (const ball of balls) {
      if (!ball.alive) continue;
      const cn = nextContact(s, ball);
      const when = ball.time + cn.t;
      if (when < pickAt) {
        pick = ball;
        pickAt = when;
        pickContact = cn;
      }
    }
    if (!pick) break;
    const ball = pick,
      { t, hits } = pickContact;
    ball.x += ball.dx * t;
    ball.y += ball.dy * t;
    ball.time += t;
    ball.dist += t;
    shot.contacts++;
    if (trace && ball.lead) trace.push([ball.x, ball.y]);
    ball.idle = (ball.idle ?? 0) + t;
    ball.still = t === 0 ? (ball.still ?? 0) + 1 : 0;
    if (ball.still > 8) shot.stuck = (shot.stuck ?? 0) + 1;
    if (ball.dist > MAX_DIST || ball.idle > BORED || ball.still > 8) {
      ball.alive = false;
      ball.landX = ball.x;
      shot.tired++;
      shot.dist += ball.dist;
      continue;
    }
    let flipX = false,
      flipY = false,
      landed = false,
      corner = null,
      kick = null,
      bounced = false;
    const seen = new Set();
    for (const hit of hits) {
      if (hit.wall === "floor") {
        if (ball.lives > 0) {
          ball.lives--;
          flipY = true;
          bounced = true;
        } else landed = true;
        continue;
      }
      if (hit.wall === "ceil") {
        flipY = true;
        bounced = true;
        continue;
      }
      if (hit.wall === "side") {
        flipX = true;
        bounced = true;
        continue;
      }
      if (hit.sensor) {
        const o = hit.b.pair;
        const fr = s.base + hit.b.w,
          fo = s.base + o.w;
        if (fo < s.D) {
          ball.x += o.c - hit.b.c;
          ball.y += fo - fr;
          ball.ignore = o;
        } else ball.ignore = hit.b;
        continue;
      }
      if (hit.round) {
        kick = [ball.x - (hit.b.c + 0.5), ball.y - (s.base + hit.b.w + 0.5)];
        if (!ball.hot) ball.charge = 0;
        bounced = true;
        continue;
      }
      if (seen.has(hit.b) && !hit.corner) continue;
      const first = !seen.has(hit.b);
      seen.add(hit.b);
      const result = first ? strike(s, ball, hit, shot) : hit.result;
      hit.result = result;
      if (result === "pierce") continue;
      bounced = true;
      if (hit.face) {
        if (hit.face & 3) flipY = true;
        else flipX = true;
      } else corner ??= hit.corner;
    }
    if (landed) {
      ball.alive = false;
      ball.landX = ball.x;
      shot.dist += ball.dist;
      continue;
    }
    if (bounced && !hits.some((h) => h.sensor)) ball.ignore = null;
    if (kick) {
      const n = Math.sqrt(kick[0] * kick[0] + kick[1] * kick[1]);
      ball.dx = kick[0] / n;
      ball.dy = kick[1] / n;
    } else if (flipX || flipY) {
      if (flipX) ball.dx = -ball.dx;
      if (flipY) ball.dy = -ball.dy;
    } else if (corner) {
      const nx = (ball.x - corner[0]) / BR,
        ny = (ball.y - corner[1]) / BR;
      const dot = ball.dx * nx + ball.dy * ny;
      if (dot < 0) {
        ball.dx -= 2 * dot * nx;
        ball.dy -= 2 * dot * ny;
        const n = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
        ball.dx /= n;
        ball.dy /= n;
      }
    }
    if (ball.recharge) {
      ball.charge = CHARGE_MAX;
      ball.recharge = false;
    }
    while (shot.spawn.length) {
      const from = shot.spawn.pop();
      for (const sgn of [1, -1])
        balls.push({
          x: from.x,
          y: from.y,
          dx: from.dx * COS30 - sgn * from.dy * SIN30,
          dy: sgn * from.dx * SIN30 + from.dy * COS30,
          charge: 0,
          hot: false,
          lives: 0,
          lead: false,
          time: from.time,
          dist: from.dist,
          alive: true,
          ignore: null,
          landX: from.x,
        });
    }
  }
  if (guard >= 200000) throw new Error("flight never ended");
  s.rounds++;
  s.x = Math.min(C - 0.5, Math.max(0.5, balls[0].landX));
  s.friends += shot.freed;
  let needed = 0;
  for (const b of s.bricks.values()) if (K[b.k].needed) needed++;
  shot.steps = 0;
  if (needed === 0) {
    s.cleared = true;
    return shot;
  }
  // The wall steps a row, unless the round left the lower two thirds of the
  // field clear: then it jumps a third of the field, and the next shot has
  // the level's boon.
  const jump = jumpOf(s.D);
  const jumped = lowestNeeded(s) >= s.D - jump;
  const steps = jumped ? jump : 1;
  shot.steps = steps;
  shot.jumped = jumped;
  s.boon = jumped ? s.boonKind : null;
  if (jumped) s.jumps++;
  for (const b of s.bricks.values())
    if (b.k === "moss" && b.hp < b.full) b.hp++;
  s.base -= steps;
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
export function lowestNeeded(s) {
  let low = Infinity;
  for (const b of s.bricks.values())
    if (K[b.k].needed) low = Math.min(low, s.base + b.w);
  return low;
}
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
  return (
    -total -
    (low <= 1 ? 500 : low === 2 ? 60 : 0) +
    s.friends * 6 +
    (s.boon ? 25 : 0)
  );
}
export { K };
