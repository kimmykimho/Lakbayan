/**
 * Basic verification tests for AprioriEngine.
 * Run with: node server/services/association-rules/AprioriEngine.test.js
 */

const AprioriEngine = require('./AprioriEngine');

const engine = new AprioriEngine();

// Test dataset: simple transactions
const transactions = [
  { userId: 'u1', items: ['A', 'B', 'C'] },
  { userId: 'u2', items: ['A', 'B'] },
  { userId: 'u3', items: ['A', 'C'] },
  { userId: 'u4', items: ['B', 'C'] },
  { userId: 'u5', items: ['A', 'B', 'C'] },
];

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

console.log('=== AprioriEngine Tests ===\n');

// Test 1: calculateSupport
console.log('Test: calculateSupport');
assert(engine.calculateSupport(['A'], transactions) === 4 / 5, 'Support of {A} = 4/5');
assert(engine.calculateSupport(['B'], transactions) === 4 / 5, 'Support of {B} = 4/5');
assert(engine.calculateSupport(['C'], transactions) === 4 / 5, 'Support of {C} = 4/5');
assert(engine.calculateSupport(['A', 'B'], transactions) === 3 / 5, 'Support of {A,B} = 3/5');
assert(engine.calculateSupport(['A', 'C'], transactions) === 3 / 5, 'Support of {A,C} = 3/5');
assert(engine.calculateSupport(['B', 'C'], transactions) === 3 / 5, 'Support of {B,C} = 3/5');
assert(engine.calculateSupport(['A', 'B', 'C'], transactions) === 2 / 5, 'Support of {A,B,C} = 2/5');
assert(engine.calculateSupport(['D'], transactions) === 0, 'Support of {D} = 0');

// Test 2: findFrequentItemsets with low threshold
console.log('\nTest: findFrequentItemsets (minSupport=0.4)');
const result = engine.findFrequentItemsets(transactions, 0.4);
const itemsetKeys = result.map((r) => r.items.slice().sort().join(','));
assert(itemsetKeys.includes('A'), 'Contains {A}');
assert(itemsetKeys.includes('B'), 'Contains {B}');
assert(itemsetKeys.includes('C'), 'Contains {C}');
assert(itemsetKeys.includes('A,B'), 'Contains {A,B}');
assert(itemsetKeys.includes('A,C'), 'Contains {A,C}');
assert(itemsetKeys.includes('B,C'), 'Contains {B,C}');
assert(itemsetKeys.includes('A,B,C'), 'Contains {A,B,C}');

// Test 3: All returned itemsets have support >= minSupport
console.log('\nTest: All results meet minSupport threshold');
const minSup = 0.4;
const results2 = engine.findFrequentItemsets(transactions, minSup);
const allAbove = results2.every((r) => r.support >= minSup);
assert(allAbove, 'All itemsets have support >= 0.4');

// Test 4: Results sorted by support descending
console.log('\nTest: Results sorted by support descending');
let sorted = true;
for (let i = 1; i < results2.length; i++) {
  if (results2[i].support > results2[i - 1].support) {
    sorted = false;
    break;
  }
}
assert(sorted, 'Results are sorted by support descending');

// Test 5: Apriori property - all subsets of frequent itemsets are also frequent
console.log('\nTest: Apriori property enforcement');
const allKeys = new Set(results2.map((r) => r.items.slice().sort().join(',')));
let aprioriHolds = true;
for (const itemset of results2) {
  if (itemset.items.length < 2) continue;
  // Check all (k-1) subsets
  for (let i = 0; i < itemset.items.length; i++) {
    const subset = [...itemset.items.slice(0, i), ...itemset.items.slice(i + 1)].sort();
    if (!allKeys.has(subset.join(','))) {
      aprioriHolds = false;
      break;
    }
  }
}
assert(aprioriHolds, 'All subsets of frequent itemsets are also in results');

// Test 6: maxSize parameter limits itemset size
console.log('\nTest: maxSize limits results');
const limited = engine.findFrequentItemsets(transactions, 0.3, 2);
const maxLen = Math.max(...limited.map((r) => r.items.length));
assert(maxLen <= 2, 'No itemset exceeds maxSize=2');

// Test 7: Empty transactions
console.log('\nTest: Edge cases');
assert(engine.findFrequentItemsets([], 0.5).length === 0, 'Empty transactions returns empty');
assert(engine.findFrequentItemsets(null, 0.5).length === 0, 'Null transactions returns empty');
assert(engine.calculateSupport(['A'], []) === 0, 'Support with empty transactions = 0');

// Test 8: High minSupport filters correctly
console.log('\nTest: High minSupport filters correctly');
const highSup = engine.findFrequentItemsets(transactions, 0.9);
// Only items appearing in >= 5 transactions (none in this dataset)
assert(highSup.length === 0, 'minSupport=0.9 returns empty for this dataset');

// Test 9: Count accuracy
console.log('\nTest: Count accuracy');
const withCounts = engine.findFrequentItemsets(transactions, 0.3);
const abItemset = withCounts.find((r) => r.items.slice().sort().join(',') === 'A,B');
assert(abItemset && abItemset.count === 3, '{A,B} count = 3');
assert(abItemset && abItemset.support === 3 / 5, '{A,B} support = 0.6');

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
