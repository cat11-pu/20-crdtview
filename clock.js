// clock.js：向量时钟（基线：只比总和大小）
export function compare(left, right) {
  const sum = (clock) => Object.values(clock).reduce((total, value) => total + value, 0);
  if (sum(left) === sum(right)) return "equal";
  return sum(left) < sum(right) ? "before" : "after";
}

export function mergeClocks(left, right) {
  return Object.assign({}, left, right);
}
