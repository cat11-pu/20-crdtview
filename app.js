// app.js：渲染结果
import { compare, mergeClocks, declareNodes } from "./clock.js";
import { mergeRegisters, converge } from "./merge.js";

export function render(spec) {
  declareNodes(Array.isArray(spec.nodes) ? spec.nodes : null);
  const left = spec.left;
  const right = spec.right;
  const relation = compare(left.clock, right.clock);
  const merged = mergeRegisters(left, right, left.clock, right.clock);
  const unordered = converge([left, right], spec.order || [1, 0]);
  return { relation: relation, value: merged.value, by: merged.by,
           concurrent: merged.concurrent, clock: mergeClocks(left.clock, right.clock),
           converged: unordered.stable };
}
