// app.js：渲染结果（返回结构保持 relation/value/by/concurrent/clock/converged 六键）
import { compare, mergeClocks } from "./clock.js";
import { mergeRegisters, converge } from "./merge.js";

export function render(spec) {
  const left = spec.left;
  const right = spec.right;
  const nodes = spec.nodes;
  const order = spec.order || [1, 0];

  const relation = compare(left.clock, right.clock, nodes);
  const merged = mergeRegisters(left, right, left.clock, right.clock, nodes);
  const unordered = converge([left, right], order, nodes);
  return { relation: relation, value: merged.value, by: merged.by,
           concurrent: merged.concurrent,
           clock: mergeClocks(left.clock, right.clock, nodes),
           converged: unordered.stable };
}
