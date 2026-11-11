// The types the scene's options take that other packages write, named here
// while the shell still takes them from here. R6's guide has landed, so
// `Guide` is the rules' own, which the shell can take from
// `src/rules/flight/guide.ts`, as the scene does, and this file can go.

export type { Guide } from "../rules/flight/guide";
