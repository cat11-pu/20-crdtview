// merge.js：LWW 寄存器合并与多副本顺序收敛
import { compare, mergeClocks } from "./clock.js";

// 节点编号排序：n0、n1、n10 按尾部数字比较，否则退化为字典序。
function nodeRank(id) {
  const match = /^([^0-9]*)(\d+)$/.exec(String(id));
  return match ? [match[1], Number(match[2])] : [String(id), -1];
}

function smallerNode(a, b) {
  const rankA = nodeRank(a);
  const rankB = nodeRank(b);
  return rankA[0] === rankB[0]
    ? (rankA[1] < rankB[1] ? a : b)
    : (rankA[0] < rankB[0] ? a : b);
}

function clockSum(clock) {
  let total = 0;
  for (const node of Object.keys(clock)) total += clock[node];
  return total;
}

// mergeRegisters(left, right, clockL, clockR, nodes)
//   after      -> 取左侧
//   before     -> 取右侧
//   equal      -> 取节点编号较小的一侧
//   concurrent -> 先按时钟分量之和、再按节点编号取较大的一侧
// 返回 { value, by, concurrent, clock }，不修改任何入参。
export function mergeRegisters(left, right, clockL, clockR, nodes) {
  const relation = compare(clockL, clockR, nodes);
  const clock = mergeClocks(clockL, clockR, nodes);

  let winner;
  if (relation === "after") {
    winner = left;
  } else if (relation === "before") {
    winner = right;
  } else if (relation === "equal") {
    winner = smallerNode(left.id, right.id) === left.id ? left : right;
  } else {
    const sumL = clockSum(clockL);
    const sumR = clockSum(clockR);
    if (sumL !== sumR) {
      winner = sumL > sumR ? left : right;
    } else {
      winner = smallerNode(left.id, right.id) === left.id ? right : left;
    }
  }

  return { value: winner.value, by: winner.id,
           concurrent: relation === "concurrent", clock };
}

// 按 order 给出的副本下标顺序依次折叠合并。
function fold(replicas, order, nodes) {
  let accumulator = {
    id: replicas[order[0]].id,
    value: replicas[order[0]].value,
    clock: Object.assign({}, replicas[order[0]].clock)
  };
  for (let index = 1; index < order.length; index += 1) {
    const replica = replicas[order[index]];
    const merged = mergeRegisters(
      accumulator, replica, accumulator.clock, replica.clock, nodes
    );
    accumulator = { id: merged.by, value: merged.value, clock: merged.clock };
  }
  return accumulator;
}

function permutations(length) {
  let results = [[]];
  for (let index = 0; index < length; index += 1) {
    const next = [];
    for (const prefix of results) {
      for (let value = 0; value < length; value += 1) {
        if (!prefix.includes(value)) next.push(prefix.concat(value));
      }
    }
    results = next;
  }
  return results;
}

// 基于线性同余的确定性伪随机，避免对任何时钟分量做排序。
function shuffledOrders(length, seed) {
  let state = seed;
  const random = () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
  const orders = [];
  for (let sample = 0; sample < 6; sample += 1) {
    const order = Array.from({ length }, (_, index) => index);
    for (let index = length - 1; index > 0; index -= 1) {
      const swap = Math.floor(random() * (index + 1));
      [order[index], order[swap]] = [order[swap], order[index]];
    }
    orders.push(order);
  }
  return orders;
}

// converge(replicas, order, nodes) 按给定顺序合并，并验证打乱顺序后
// 是否仍收敛到同一取值；只有换序重算结果完全一致 stable 才为 true。
export function converge(replicas, order, nodes) {
  if (!replicas.length) return { value: null, by: null, stable: true, clock: {} };

  const sequence = (order && order.length === replicas.length)
    ? order.slice()
    : replicas.map((_, index) => index);
  const primary = fold(replicas, sequence, nodes);

  const candidates = replicas.length <= 6
    ? permutations(replicas.length)
    : [sequence.slice().reverse()].concat(shuffledOrders(replicas.length, 7));

  let stable = true;
  for (const candidate of candidates) {
    if (candidate.every((value, index) => value === sequence[index])) continue;
    const alternate = fold(replicas, candidate, nodes);
    if (alternate.by !== primary.by || alternate.value !== primary.value) {
      stable = false;
      break;
    }
  }

  return { value: primary.value, by: primary.id, stable, clock: primary.clock };
}
