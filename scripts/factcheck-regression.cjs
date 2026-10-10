const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/money.js'), 'utf8'), context);
const MN = context.window.MN;

// Check exact integer-rate arithmetic against floating-point calculation.
for (let base = 1000; base <= 20000000; base += 1000) {
  const expected = Number(BigInt(base) * 9n / 10000n) * 10;
  assert.equal(MN.insurance(base).emp, expected, `employment insurance at ${base}`);
}
assert.equal(MN.floor10(25200 - 0.001), 25190);
assert.equal(MN.floor10(25200 + 0.001), 25200);
assert.equal(MN.payroll(36e6).monthly.emp, 25200);
assert.equal(MN.payroll(36e6).monthly.net, 2655830);
assert.equal(MN.payroll(36e6).annual.base, 18545040);

// July changes the pension cap/floor, not the other monthly rates.
for (const month of [1, 6, 7, 12]) {
  const cap = month <= 6 ? 6370000 : 6590000;
  const floor = month <= 6 ? 400000 : 410000;
  for (const base of [100000, floor, 2800000, cap, 7000000]) {
    const clamped = Math.min(Math.max(base, floor), cap);
    const expected = Number(BigInt(clamped) * 475n / 100000n) * 10;
    assert.equal(MN.insurance(base, { month }).nps, expected);
  }
}
assert.equal(MN.insurance(7e6, { month: 7 }).nps - MN.insurance(7e6, { month: 6 }).nps, 10450);
assert.equal(MN.insurance(7e6).nps, MN.insurance(7e6, { month: 7 }).nps);
assert.equal(MN.payroll(86.4e6, { month: 1 }).monthly.nps, MN.insurance(7e6, { month: 1 }).nps);
assert.throws(() => MN.insurance(1e6, { month: 13 }), /month/);
assert.throws(() => MN.insurance(1e6, { month: 0 }), /month/);
console.log('Passed: 20000 integer-rate cases, payroll example, pension month boundaries.');

// Pension bases discard sub-1000-won income before clamping; LTC uses NHIS's ratio.
let insuranceCases = 0;
for (const month of [1, 7]) for (let base = 100001; base <= 9000000; base += 7919) {
  const actual = MN.insurance(base, { month });
  const pensionBase = Math.min(Math.max(Math.floor(base / 1000) * 1000, month === 1 ? 400000 : 410000), month === 1 ? 6370000 : 6590000);
  const pension = Number(BigInt(pensionBase) * 475n / 100000n) * 10;
  const health = Number(BigInt(base) * 3595n / 1000000n) * 10;
  const ltc = Number(BigInt(health) * 9448n / 719000n) * 10;
  const emp = Number(BigInt(base) * 9n / 10000n) * 10;
  assert.equal(actual.nps, pension); assert.equal(actual.health, health); assert.equal(actual.ltc, ltc); assert.equal(actual.emp, emp);
  assert.equal(actual.total, pension + health + ltc + emp); insuranceCases++;
}
assert.equal(MN.insurance(2800999).nps, 133000);
assert.equal(MN.insurance(125000).ltc, 590);
console.log({ insuranceCases });
