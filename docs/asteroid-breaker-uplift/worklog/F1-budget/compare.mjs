// Sets parts.mjs' or nodes.mjs' outputs side by side, in milliseconds a frame, sorted by how much the second gains over the first.
// Usage: node compare.mjs <kind: part|rules|source|outside> <top N> <name=parts.json>...
import { readFileSync } from "node:fs";
const [kind, topArg, ...pairs] = process.argv.slice(2);
const builds = pairs.map((p) => {
  const [name, file] = p.split("=");
  return { name, data: JSON.parse(readFileSync(file, "utf8")) };
});
const keys = new Set(builds.flatMap((b) => Object.keys(b.data[kind])));
const value = (b, k) => b.data[kind][k] ?? 0;
const rows = [...keys].map((k) => ({
  k,
  values: builds.map((b) => value(b, k)),
}));
rows.sort(
  (a, b) =>
    Math.abs(b.values[1] - b.values[0]) - Math.abs(a.values[1] - a.values[0]),
);
const fix = (n) => n.toFixed(3).padStart(7);
console.log(
  `${builds.map((b) => b.name.padStart(7)).join(" ")}   gain  ${kind}`,
);
console.log(
  `${builds.map((b) => fix(b.data.sampled)).join(" ")} ${fix(builds[1].data.sampled - builds[0].data.sampled)}  (all sampled)`,
);
for (const { k, values } of rows.slice(0, Number(topArg)))
  console.log(
    `${values.map(fix).join(" ")} ${fix(values[1] - values[0])}  ${k}`,
  );
