// clock.js：向量时钟（逐分量比较 / 逐分量取最大，均为一次线性遍历）
//
// compare(left, right) 对两个时钟的并集节点做一次遍历：
//   left 全部分量不小于且至少一个大 -> "after"
//   left 全部分量不大于且至少一个小 -> "before"
//   互有大小                       -> "concurrent"
//   完全相同                       -> "equal"
// 第三个可选参数 nodes 为声明过的节点集合；时钟中一旦出现未声明的节点
// 分量即抛出 code 为 E_UNKNOWN_NODE 的错误，绝不静默忽略该分量。

export class ClockError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ClockError";
    this.code = code;
  }
}

function toKnownSet(nodes) {
  if (nodes == null) return null;
  return nodes instanceof Set ? nodes : new Set(nodes);
}

function assertKnownNodes(clock, knownNodes) {
  if (knownNodes == null) return;
  for (const node of Object.keys(clock)) {
    if (!knownNodes.has(node)) {
      throw new ClockError("E_UNKNOWN_NODE", "clock contains undeclared node: " + node);
    }
  }
}

export function compare(left, right, nodes) {
  const knownNodes = toKnownSet(nodes);
  assertKnownNodes(left, knownNodes);
  assertKnownNodes(right, knownNodes);

  let leftHasGreater = false;
  let leftHasLesser = false;
  for (const node of Object.keys(left)) {
    const delta = left[node] - (node in right ? right[node] : 0);
    if (delta > 0) leftHasGreater = true;
    else if (delta < 0) leftHasLesser = true;
  }
  for (const node of Object.keys(right)) {
    if (!(node in left) && right[node] > 0) leftHasLesser = true;
  }

  if (leftHasGreater && leftHasLesser) return "concurrent";
  if (leftHasGreater) return "after";
  if (leftHasLesser) return "before";
  return "equal";
}

export function mergeClocks(left, right, nodes) {
  const knownNodes = toKnownSet(nodes);
  assertKnownNodes(left, knownNodes);
  assertKnownNodes(right, knownNodes);

  const merged = {};
  for (const node of Object.keys(left)) merged[node] = left[node];
  for (const node of Object.keys(right)) {
    if (!(node in merged) || right[node] > merged[node]) merged[node] = right[node];
  }
  return merged;
}
