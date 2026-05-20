/**
 * Unit tests for CorrelationAnalyzer
 * Run with: node server/services/association-rules/CorrelationAnalyzer.test.js
 */

const CorrelationAnalyzer = require('./CorrelationAnalyzer');

const analyzer = new CorrelationAnalyzer();
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.log(`  ✗ ${message}`);
  }
}

function assertClose(actual, expected, message, tolerance = 0.0001) {
  assert(Math.abs(actual - expected) < tolerance, `${message} (expected ~${expected}, got ${actual})`);
}

// --- Test: Empty input ---
console.log('\nTest: Empty input');
(() => {
  const result = analyzer.computeCorrelations([], 2);
  assert(Array.isArray(result) && result.length === 0, 'returns empty array for empty transactions');
})();

// --- Test: Single item transactions (no pairs possible) ---
console.log('\nTest: Insufficient qualified items');
(() => {
  const transactions = [
    { userId: 'u1', items: ['A'] },
    { userId: 'u2', items: ['A'] },
    { userId: 'u3', items: ['B'] }
  ];
  // A appears 2 times, B appears 1 time. With minOccurrence=2, only A qualifies -> no pairs
  const result = analyzer.computeCorrelations(transactions, 2);
  assert(result.length === 0, 'returns empty when fewer than 2 items qualify');
})();

// --- Test: Perfect positive correlation ---
console.log('\nTest: Perfect positive correlation');
(() => {
  // A and B always appear together
  const transactions = [
    { userId: 'u1', items: ['A', 'B'] },
    { userId: 'u2', items: ['A', 'B'] },
    { userId: 'u3', items: ['C'] },
    { userId: 'u4', items: ['C'] }
  ];
  const result = analyzer.computeCorrelations(transactions, 2);
  const abPair = result.find(r => 
    (r.itemA === 'A' && r.itemB === 'B') || (r.itemA === 'B' && r.itemB === 'A')
  );
  assert(abPair !== undefined, 'finds A-B pair');
  assertClose(abPair.correlation, 1, 'phi = 1 for perfect positive correlation');
  assert(abPair.cooccurrence === 2, 'cooccurrence = 2');
})();

// --- Test: Perfect negative correlation ---
console.log('\nTest: Perfect negative correlation');
(() => {
  // A and B never appear together, but both appear enough
  const transactions = [
    { userId: 'u1', items: ['A'] },
    { userId: 'u2', items: ['A'] },
    { userId: 'u3', items: ['B'] },
    { userId: 'u4', items: ['B'] }
  ];
  const result = analyzer.computeCorrelations(transactions, 2);
  const abPair = result.find(r => 
    (r.itemA === 'A' && r.itemB === 'B') || (r.itemA === 'B' && r.itemB === 'A')
  );
  assert(abPair !== undefined, 'finds A-B pair');
  assertClose(abPair.correlation, -1, 'phi = -1 for perfect negative correlation');
  assert(abPair.cooccurrence === 0, 'cooccurrence = 0');
})();

// --- Test: Zero variance (item in all transactions) ---
console.log('\nTest: Zero variance');
(() => {
  // A appears in every transaction -> zero variance for A
  const transactions = [
    { userId: 'u1', items: ['A', 'B'] },
    { userId: 'u2', items: ['A', 'C'] },
    { userId: 'u3', items: ['A', 'B'] },
    { userId: 'u4', items: ['A', 'C'] }
  ];
  const result = analyzer.computeCorrelations(transactions, 2);
  const abPair = result.find(r =>
    (r.itemA === 'A' && r.itemB === 'B') || (r.itemA === 'B' && r.itemB === 'A')
  );
  assert(abPair !== undefined, 'finds A-B pair');
  assertClose(abPair.correlation, 0, 'phi = 0 when one item has zero variance');
})();

// --- Test: Known phi coefficient calculation ---
console.log('\nTest: Known phi coefficient');
(() => {
  // n=10, A in 6, B in 5
  // n11=3, n10=3, n01=2, n00=2
  // phi = (3*2 - 3*2)/sqrt(6*4*5*5) = 0/sqrt(600) = 0
  const transactions = [
    { userId: 'u1', items: ['A', 'B'] },
    { userId: 'u2', items: ['A', 'B'] },
    { userId: 'u3', items: ['A', 'B'] },
    { userId: 'u4', items: ['A'] },
    { userId: 'u5', items: ['A'] },
    { userId: 'u6', items: ['A'] },
    { userId: 'u7', items: ['B'] },
    { userId: 'u8', items: ['B'] },
    { userId: 'u9', items: ['C'] },
    { userId: 'u10', items: ['C'] }
  ];
  const result = analyzer.computeCorrelations(transactions, 2);
  const abPair = result.find(r =>
    (r.itemA === 'A' && r.itemB === 'B') || (r.itemA === 'B' && r.itemB === 'A')
  );
  assert(abPair !== undefined, 'finds A-B pair');
  assertClose(abPair.correlation, 0, 'phi = 0 when independent');
})();

// --- Test: Correlation values in range [-1, 1] ---
console.log('\nTest: Values in range');
(() => {
  const transactions = [
    { userId: 'u1', items: ['A', 'B', 'C'] },
    { userId: 'u2', items: ['A', 'C'] },
    { userId: 'u3', items: ['B', 'C'] },
    { userId: 'u4', items: ['A', 'B'] },
    { userId: 'u5', items: ['C'] }
  ];
  const result = analyzer.computeCorrelations(transactions, 2);
  const allInRange = result.every(r => r.correlation >= -1 && r.correlation <= 1);
  assert(allInRange, 'all correlation values in [-1, 1]');
})();

// --- Test: buildMatrix - symmetric output ---
console.log('\nTest: buildMatrix symmetry');
(() => {
  const correlations = [
    { itemA: 'A', itemB: 'B', correlation: 0.5, cooccurrence: 3 },
    { itemA: 'A', itemB: 'C', correlation: -0.3, cooccurrence: 1 },
    { itemA: 'B', itemB: 'C', correlation: 0.7, cooccurrence: 4 }
  ];
  const nameMap = { A: 'Place A', B: 'Place B', C: 'Place C' };
  const { labels, matrix } = analyzer.buildMatrix(correlations, nameMap);

  assert(labels.length === 3, 'labels has 3 entries');
  assert(labels.includes('Place A') && labels.includes('Place B') && labels.includes('Place C'), 'labels mapped correctly');
  assert(matrix.length === 3, 'matrix is 3x3');

  // Check symmetry
  let symmetric = true;
  for (let i = 0; i < matrix.length; i++) {
    for (let j = 0; j < matrix.length; j++) {
      if (matrix[i][j] !== matrix[j][i]) symmetric = false;
    }
  }
  assert(symmetric, 'matrix is symmetric');

  // Check diagonal
  const diagOnes = matrix.every((row, i) => row[i] === 1);
  assert(diagOnes, 'diagonal values are 1');
})();

// --- Test: buildMatrix - empty correlations ---
console.log('\nTest: buildMatrix empty input');
(() => {
  const { labels, matrix } = analyzer.buildMatrix([], {});
  assert(labels.length === 0, 'empty labels for empty correlations');
  assert(matrix.length === 0, 'empty matrix for empty correlations');
})();

// --- Test: buildMatrix with missing nameMap entries ---
console.log('\nTest: buildMatrix fallback to item ID');
(() => {
  const correlations = [
    { itemA: 'X', itemB: 'Y', correlation: 0.4, cooccurrence: 2 }
  ];
  const { labels } = analyzer.buildMatrix(correlations, {});
  assert(labels.includes('X') && labels.includes('Y'), 'uses item IDs when nameMap has no entry');
})();

// --- Summary ---
console.log(`\n${'='.repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
