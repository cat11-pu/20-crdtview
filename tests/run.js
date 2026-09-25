import assert from "node:assert";
import { compare, mergeClocks } from "../clock.js";
import { mergeRegisters, converge } from "../merge.js";
import { render } from "../app.js";

let failed = 0;
function check(name, fn) {
  try { fn(); console.log("ok   " + name); } catch (e) { failed += 1; console.log("FAIL " + name + " :: " + e.message); }
}

const left = { id: "n0", value: 1, clock: { n0: 1 } };
const right = { id: "n1", value: 2, clock: { n0: 1, n1: 1 } };

check("compare returns a relation", () => {
  assert.ok(["before", "after", "equal", "concurrent"].includes(compare(left.clock, right.clock)));
});

check("mergeClocks unions nodes", () => {
  assert.ok("n1" in mergeClocks(left.clock, right.clock));
});

check("mergeRegisters returns value", () => {
  assert.strictEqual(mergeRegisters(left, right, left.clock, right.clock).value, right.value);
});

check("converge reports stable flag", () => {
  assert.strictEqual(typeof converge([left, right], [0, 1]).stable, "boolean");
});

check("render exposes relation", () => {
  assert.ok(typeof render({ left: left, right: right, order: [0, 1] }).relation === "string");
});

const rep = (id, value, clock) => ({ id, value, clock });

check("compare distinguishes all four relations", () => {
  assert.strictEqual(compare({ n0: 2, n1: 1 }, { n0: 2, n1: 2 }), "before");
  assert.strictEqual(compare({ n0: 2, n1: 2 }, { n0: 2, n1: 1 }), "after");
  assert.strictEqual(compare({ n0: 1, n1: 0 }, { n0: 0, n1: 1 }), "concurrent");
  assert.strictEqual(compare({ n0: 1, n1: 2 }, { n0: 1, n1: 2 }), "equal");
});

check("compare handles nodes present on only one side", () => {
  assert.strictEqual(compare({ n0: 1 }, { n0: 1, n1: 1 }), "before");
  assert.strictEqual(compare({ n0: 1 }, {}), "after");
  assert.strictEqual(compare({}, {}), "equal");
});

check("mergeClocks takes componentwise maximum", () => {
  assert.deepStrictEqual(mergeClocks({ n0: 3, n1: 1 }, { n0: 2, n1: 4, n2: 1 }),
                         { n0: 3, n1: 4, n2: 1 });
});

check("mergeClocks does not mutate its arguments", () => {
  const clockA = { n0: 1 };
  const clockB = { n0: 2, n1: 1 };
  const snapshotA = JSON.parse(JSON.stringify(clockA));
  const snapshotB = JSON.parse(JSON.stringify(clockB));
  mergeClocks(clockA, clockB);
  assert.deepStrictEqual(clockA, snapshotA);
  assert.deepStrictEqual(clockB, snapshotB);
});

check("mergeRegisters honors causal order", () => {
  const older = rep("n0", "alpha", { n0: 2, n1: 1 });
  const newer = rep("n1", "beta", { n0: 2, n1: 2 });
  const newerWins = mergeRegisters(older, newer, older.clock, newer.clock);
  assert.strictEqual(newerWins.value, "beta");
  assert.strictEqual(newerWins.by, "n1");
  assert.strictEqual(newerWins.concurrent, false);
  const olderWins = mergeRegisters(newer, older, newer.clock, older.clock);
  assert.strictEqual(olderWins.value, "beta");
  assert.strictEqual(olderWins.by, "n1");
});

check("mergeRegisters breaks equal clocks by smaller node id", () => {
  const clock = { n0: 1, n1: 1 };
  const a = rep("n0", "from-n0", clock);
  const b = rep("n1", "from-n1", clock);
  assert.strictEqual(mergeRegisters(b, a, b.clock, a.clock).by, "n0");
  assert.strictEqual(mergeRegisters(a, b, a.clock, b.clock).by, "n0");
});

check("mergeRegisters resolves concurrent by sum then node id", () => {
  const lowSum = rep("n0", "low", { n0: 1, n1: 0 });
  const highSum = rep("n1", "high", { n0: 0, n1: 2 });
  assert.strictEqual(mergeRegisters(lowSum, highSum, lowSum.clock, highSum.clock).by, "n1");

  const tieA = rep("n0", "tie0", { n0: 1 });
  const tieB = rep("n1", "tie1", { n1: 1 });
  const tieResult = mergeRegisters(tieA, tieB, tieA.clock, tieB.clock);
  assert.strictEqual(tieResult.concurrent, true);
  assert.strictEqual(tieResult.by, "n1");
});

check("mergeRegisters is commutative and idempotent", () => {
  const a = rep("n0", "a", { n0: 3, n1: 1 });
  const b = rep("n1", "b", { n0: 2, n1: 4 });
  const ab = mergeRegisters(a, b, a.clock, b.clock);
  const ba = mergeRegisters(b, a, b.clock, a.clock);
  assert.deepStrictEqual(ab, ba);
  const aa = mergeRegisters(a, a, a.clock, a.clock);
  assert.strictEqual(aa.value, "a");
  assert.strictEqual(aa.by, "n0");
  assert.strictEqual(aa.concurrent, false);
  assert.deepStrictEqual(aa.clock, a.clock);
});

check("converge is stable when order does not change winner", () => {
  const a = rep("n0", "alpha", { n0: 2, n1: 1 });
  const b = rep("n1", "beta", { n0: 2, n1: 2 });
  const result = converge([a, b], [1, 0]);
  assert.strictEqual(result.value, "beta");
  assert.strictEqual(result.by, "n1");
  assert.strictEqual(result.stable, true);
});

check("converge flags unstable for order-sensitive winners", () => {
  const a = rep("n0", "a", { n0: 2 });
  const b = rep("n1", "b", { n1: 1 });
  const c = rep("n2", "c", { n0: 1, n1: 1 });
  const firstAB = converge([a, b, c], [0, 1, 2]);
  const firstBC = converge([a, b, c], [1, 2, 0]);
  assert.notStrictEqual(firstAB.by, firstBC.by);
  assert.strictEqual(firstBC.by, "n2");
  assert.strictEqual(firstAB.stable, false);
  assert.strictEqual(firstBC.stable, false);
});

check("unknown node throws E_UNKNOWN_NODE", () => {
  assert.throws(
    () => compare({ n0: 1 }, { nX: 1 }, ["n0"]),
    (error) => error.code === "E_UNKNOWN_NODE"
  );
  assert.throws(
    () => mergeClocks({ n0: 1 }, { nX: 1 }, ["n0"]),
    (error) => error.code === "E_UNKNOWN_NODE"
  );
});

check("100k components merge in a single linear pass", () => {
  const size = 100000;
  const clockA = {};
  const clockB = {};
  for (let index = 0; index < size; index += 1) {
    clockA["n" + index] = index;
    clockB["n" + index] = index + 1;
  }
  const started = Date.now();
  const merged = mergeClocks(clockA, clockB);
  const elapsed = Date.now() - started;
  assert.strictEqual(Object.keys(merged).length, size);
  assert.strictEqual(merged["n0"], 1);
  assert.strictEqual(merged["n" + (size - 1)], size);
  assert.ok(elapsed < 3000, "merge took " + elapsed + "ms");
});

check("render keeps the six documented keys", () => {
  const result = render({
    nodes: ["n0", "n1"], order: [1, 0],
    left: rep("n0", "alpha", { n0: 2, n1: 1 }),
    right: rep("n1", "beta", { n0: 2, n1: 2 })
  });
  assert.deepStrictEqual(Object.keys(result).sort(),
                         ["by", "clock", "concurrent", "converged", "relation", "value"]);
  assert.strictEqual(result.relation, "before");
  assert.strictEqual(result.value, "beta");
  assert.strictEqual(result.by, "n1");
  assert.strictEqual(result.concurrent, false);
  assert.deepStrictEqual(result.clock, { n0: 2, n1: 2 });
  assert.strictEqual(result.converged, true);
});

const total = 5 + 13;
console.log(total + " cases, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
