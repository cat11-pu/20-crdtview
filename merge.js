// merge.js：合并寄存器（基线：直接取后一个）
export function mergeRegisters(left, right, clockL, clockR) {
  return { value: right.value, by: right.id, concurrent: false };
}

export function converge(replicas, order) {
  return { value: replicas.length ? replicas[replicas.length - 1].value : null, stable: false };
}
