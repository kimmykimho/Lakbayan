/**
 * Basic verification tests for RuleGenerator.
 * Run with: node server/services/association-rules/RuleGenerator.test.js
 */

const RuleGenerator = require('./RuleGenerator');

const generator = new RuleGenerator();

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${msg}`);
  } else {
    failed++;
    console.log(`  ✗ ${msg}`);
  }
}

function approxEqual(a, b, epsilon = 0.0001) {
  return Math.abs(a - b) < epsilon;
}

// Test dataset
const transactions = [
  { userId: 'u1', items: ['A', 'B', 'C'] },
  { userId: 'u2', items: ['A', 'B'] },
  { userId: 'u3', items: ['A', 'C'] },
  { userId: 'u4', items: ['B', 'C'] },
  { userId: 'u5', items: ['A', 'B', 'C'] },
];

// Pre-computed frequent itemsets (minSupport=0.4)
const itemsets = [
  { items: ['A'], support: 4 / 5, count: 4 },
  { items: ['B'], support: 4 / 5, count: 4 },
  { items: ['C'], support: 4 / 5, count: 4 },
  { items: ['A', 'B'], support: 3 / 5, count: 3 },
  { items: ['A', 'C'], support: 3 / 5, count: 3 },
  { items: ['B', 'C'], support: 3 / 5, count: 3 },
  { items: ['A', 'B', 'C'], support: 2 / 5, count: 2 },
];

console.log('=== RuleGenerator Tests ===\n');

// Test 1: Basic rule generation (use low thresholds to get rules)
console.log('Test: Basic rule generation');
const rules = generator.generateRules(itemsets, transactions, 0.5, 0.5);
assert(rules.length > 0, 'Generates at least one rule');

// Test 2: Confidence calculation correctness
console.log('\nTest: Confidence calculation');
// For rule A -> B: confidence = support({A,B}) / support({A}) = 0.6 / 0.8 = 0.75
const ruleAB = rules.find(
  r => r.antecedent.join(',') === 'A' && r.consequent.join(',') === 'B'
);
if (ruleAB) {
  assert(approxEqual(ruleAB.confidence, 0.75), `A->B confidence = 0.75 (got ${ruleAB.confidence})`);
} else {
  assert(false, 'Rule A->B should exist');
}

// Test 3: Lift calculation correctness
console.log('\nTest: Lift calculation');
// For rule A -> B: lift = confidence / support({B}) = 0.75 / 0.8 = 0.9375
if (ruleAB) {
  const expectedLift = 0.75 / (4 / 5);
  assert(approxEqual(ruleAB.lift, expectedLift), `A->B lift = ${expectedLift} (got ${ruleAB.lift})`);
}

// Test 4: Conviction calculation correctness
console.log('\nTest: Conviction calculation');
// conviction = (1 - support(B)) / (1 - confidence) = (1 - 0.8) / (1 - 0.75) = 0.2 / 0.25 = 0.8
if (ruleAB) {
  const expectedConviction = (1 - 4 / 5) / (1 - 0.75);
  assert(approxEqual(ruleAB.conviction, expectedConviction), `A->B conviction = ${expectedConviction} (got ${ruleAB.conviction})`);
}

// Test 5: All rules meet minConfidence threshold
console.log('\nTest: MinConfidence filtering');
const minConf = 0.5;
const allMeetConf = rules.every(r => r.confidence >= minConf);
assert(allMeetConf, `All rules have confidence >= ${minConf}`);

// Test 6: All rules meet minLift threshold
console.log('\nTest: MinLift filtering');
const minLift = 1.0;
const rulesWithLift = generator.generateRules(itemsets, transactions, 0.5, minLift);
const allMeetLift = rulesWithLift.every(r => r.lift >= minLift);
assert(allMeetLift, `All rules have lift >= ${minLift}`);

// Test 7: Antecedent and consequent are disjoint
console.log('\nTest: Antecedent/Consequent disjoint');
const allDisjoint = rules.every(r => {
  const antSet = new Set(r.antecedent);
  return r.consequent.every(item => !antSet.has(item));
});
assert(allDisjoint, 'Antecedent and consequent are always disjoint');

// Test 8: Rules sorted by lift descending
console.log('\nTest: Sort order');
let sorted = true;
for (let i = 1; i < rules.length; i++) {
  if (rules[i].lift > rules[i - 1].lift) {
    sorted = false;
    break;
  }
}
assert(sorted, 'Rules are sorted by lift descending');

// Test 9: Higher minConfidence filters more rules
console.log('\nTest: Higher threshold filters more');
const rulesLow = generator.generateRules(itemsets, transactions, 0.3, 0.5);
const rulesHigh = generator.generateRules(itemsets, transactions, 0.9, 0.5);
assert(rulesHigh.length <= rulesLow.length, 'Higher minConfidence yields fewer or equal rules');

// Test 10: No rules generated from 1-itemsets
console.log('\nTest: No rules from 1-itemsets');
const singleItemsets = [
  { items: ['A'], support: 0.8, count: 4 },
  { items: ['B'], support: 0.8, count: 4 },
];
const noRules = generator.generateRules(singleItemsets, transactions, 0.1, 0.5);
assert(noRules.length === 0, 'No rules generated from only 1-itemsets');

// Test 11: Support value in rules matches itemset support
console.log('\nTest: Support value correctness');
const allSupportCorrect = rules.every(r => {
  const fullSet = [...r.antecedent, ...r.consequent].sort().join(',');
  const matchingItemset = itemsets.find(is => is.items.slice().sort().join(',') === fullSet);
  return matchingItemset && approxEqual(r.support, matchingItemset.support);
});
assert(allSupportCorrect, 'Rule support matches source itemset support');

// Test 12: Empty itemsets returns empty rules
console.log('\nTest: Edge cases');
assert(generator.generateRules([], transactions, 0.5).length === 0, 'Empty itemsets returns empty rules');
assert(generator.generateRules(itemsets, [], 0.5).length === 0, 'Empty transactions returns empty rules');

// Test 13: Rules from 3-itemset generate proper subsets
console.log('\nTest: 3-itemset generates multiple rules');
const threeItemOnly = [
  { items: ['A'], support: 4 / 5, count: 4 },
  { items: ['B'], support: 4 / 5, count: 4 },
  { items: ['C'], support: 4 / 5, count: 4 },
  { items: ['A', 'B'], support: 3 / 5, count: 3 },
  { items: ['A', 'C'], support: 3 / 5, count: 3 },
  { items: ['B', 'C'], support: 3 / 5, count: 3 },
  { items: ['A', 'B', 'C'], support: 2 / 5, count: 2 },
];
const threeRules = generator.generateRules(threeItemOnly, transactions, 0.1, 0.1);
// From {A,B,C}: antecedents are {A},{B},{C},{A,B},{A,C},{B,C} = 6 rules
// Plus rules from 2-itemsets: {A,B} gives A->B, B->A; {A,C} gives A->C, C->A; {B,C} gives B->C, C->B = 6 rules
// Total potential = 12, but some may be filtered
assert(threeRules.length > 6, `3-itemset generates many rules (got ${threeRules.length})`);

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
