import fs from "node:fs";
import { compare, mergeClocks } from "./clock.js";
import { mergeRegisters, converge } from "./merge.js";
import { render } from "./app.js";

const spec = JSON.parse(fs.readFileSync(process.argv[2] || "sample/crdt.json", "utf8"));
const relation = compare(spec.left.clock, spec.right.clock);
const merged = mergeRegisters(spec.left, spec.right, spec.left.clock, spec.right.clock);
const unordered = converge([spec.left, spec.right], spec.order || [1, 0]);
const out = render(spec);
let unknownCode = "NONE";
try {
  compare({ n9: 1 }, {}, spec.nodes);
} catch (error) {
  unknownCode = error.code;
}

console.log("因果关系 =", relation);
console.log("合并后的值 =", merged.value);
console.log("取值来自副本 =", merged.by);
console.log("是否并发冲突 =", merged.concurrent);
console.log("合并后的时钟 =", JSON.stringify(mergeClocks(spec.left.clock, spec.right.clock)));
console.log("打乱顺序后是否收敛到同一结果 =", unordered.stable);
console.log("未知节点的错误码 =", unknownCode);
