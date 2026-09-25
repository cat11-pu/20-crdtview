// merge.js：合并寄存器（按因果定序，并发用确定性仲裁）
import { compare, mergeClocks } from "./clock.js";

function clockSum(clock) {
  let total = 0;
  for (const key of Object.keys(clock)) total += clock[key];
  return total;
}

export function mergeRegisters(left, right, clockL, clockR) {
  const relation = compare(clockL, clockR);
  let winner;
  let concurrent = false;
  if (relation === "after") {
    winner = left;
  } else if (relation === "before") {
    winner = right;
  } else if (relation === "equal") {
    winner = left.id <= right.id ? left : right;
  } else {
    concurrent = true;
    const sumL = clockSum(clockL);
    const sumR = clockSum(clockR);
    if (sumL !== sumR) {
      winner = sumL > sumR ? left : right;
    } else {
      winner = left.id >= right.id ? left : right;
    }
  }
  return { value: winner.value, by: winner.id, concurrent: concurrent };
}

function mergeSequence(replicas, order) {
  let acc = null;
  for (const index of order) {
    const replica = replicas[index];
    if (acc === null) {
      acc = { id: replica.id, value: replica.value, clock: replica.clock };
      continue;
    }
    const merged = mergeRegisters(acc, replica, acc.clock, replica.clock);
    acc = { id: merged.by, value: merged.value, clock: mergeClocks(acc.clock, replica.clock) };
  }
  return acc;
}

function permutations(items) {
  if (items.length <= 1) return [items.slice()];
  const result = [];
  for (let i = 0; i < items.length; i += 1) {
    const rest = items.slice(0, i).concat(items.slice(i + 1));
    for (const tail of permutations(rest)) {
      result.push([items[i]].concat(tail));
    }
  }
  return result;
}

function alternateOrders(order) {
  if (order.length <= 8) return permutations(order);
  const orders = [order.slice().reverse()];
  for (let shift = 1; shift < order.length && orders.length < 8; shift += 1) {
    orders.push(order.slice(shift).concat(order.slice(0, shift)));
  }
  return orders;
}

export function converge(replicas, order) {
  if (!replicas.length) return { value: null, stable: true };
  const first = mergeSequence(replicas, order);
  let stable = true;
  for (const alt of alternateOrders(order)) {
    const again = mergeSequence(replicas, alt);
    if (again.value !== first.value || again.id !== first.id) {
      stable = false;
      break;
    }
  }
  return { value: first.value, stable: stable };
}
