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

console.log("5 cases, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
