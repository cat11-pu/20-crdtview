// clock.js：向量时钟（逐分量比较 / 逐分量最大合并）

let knownNodes = null;

export function declareNodes(nodes) {
  knownNodes = Array.isArray(nodes) ? new Set(nodes) : null;
}

function unknownNodeError(key) {
  const error = new Error("unknown node: " + key);
  error.code = "E_UNKNOWN_NODE";
  return error;
}

function assertKnown(clock) {
  if (knownNodes === null) return;
  for (const key of Object.keys(clock)) {
    if (!knownNodes.has(key)) throw unknownNodeError(key);
  }
}

export function compare(left, right) {
  assertKnown(left);
  assertKnown(right);
  let hasGreater = false;
  let hasLess = false;
  for (const key of Object.keys(left)) {
    const l = left[key];
    const r = Object.prototype.hasOwnProperty.call(right, key) ? right[key] : 0;
    if (l > r) hasGreater = true;
    else if (l < r) hasLess = true;
    if (hasGreater && hasLess) return "concurrent";
  }
  for (const key of Object.keys(right)) {
    if (Object.prototype.hasOwnProperty.call(left, key)) continue;
    if (right[key] > 0) {
      hasLess = true;
      if (hasGreater) return "concurrent";
    }
  }
  if (hasGreater) return "after";
  if (hasLess) return "before";
  return "equal";
}

export function mergeClocks(left, right) {
  assertKnown(left);
  assertKnown(right);
  const merged = {};
  for (const key of Object.keys(left)) merged[key] = left[key];
  for (const key of Object.keys(right)) {
    if (!Object.prototype.hasOwnProperty.call(merged, key) || right[key] > merged[key]) {
      merged[key] = right[key];
    }
  }
  return merged;
}
