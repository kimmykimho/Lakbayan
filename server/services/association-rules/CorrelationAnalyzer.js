/**
 * CorrelationAnalyzer
 *
 * Computes pairwise phi coefficients between places/categories
 * to identify strong positive and negative associations.
 *
 * @typedef {Object} Transaction
 * @property {string} userId - User identifier
 * @property {string[]} items - Array of place IDs in this transaction
 *
 * @typedef {Object} CorrelationEntry
 * @property {string} itemA - First place/category
 * @property {string} itemB - Second place/category
 * @property {number} correlation - Phi coefficient (-1 to 1)
 * @property {number} cooccurrence - Times both appear together
 */

class CorrelationAnalyzer {
  /**
   * Compute pairwise phi coefficients for all item pairs.
   * Only considers items that appear in at least `minOccurrence` transactions.
   *
   * Phi coefficient formula:
   * phi(A,B) = (n11*n00 - n10*n01) / sqrt((n11+n10)(n01+n00)(n11+n01)(n10+n00))
   *
   * Where:
   * - n11 = both A and B present
   * - n10 = A present, B absent
   * - n01 = A absent, B present
   * - n00 = both absent
   *
   * If denominator is 0 (zero-variance), returns 0.
   *
   * @param {Transaction[]} transactions
   * @param {number} [minOccurrence=2] - Minimum times an item must appear
   * @returns {CorrelationEntry[]}
   */
  computeCorrelations(transactions, minOccurrence = 2) {
    if (!transactions || transactions.length === 0) {
      return [];
    }

    const n = transactions.length;

    // Count occurrences of each item
    const itemCounts = new Map();
    for (const tx of transactions) {
      const uniqueItems = [...new Set(tx.items)];
      for (const item of uniqueItems) {
        itemCounts.set(item, (itemCounts.get(item) || 0) + 1);
      }
    }

    // Filter items by minimum occurrence
    const qualifiedItems = [];
    for (const [item, count] of itemCounts) {
      if (count >= minOccurrence) {
        qualifiedItems.push(item);
      }
    }

    // Sort for deterministic output
    qualifiedItems.sort();

    if (qualifiedItems.length < 2) {
      return [];
    }

    // Build a set-based lookup for each transaction for O(1) membership tests
    const txSets = transactions.map(tx => new Set(tx.items));

    // Compute phi coefficient for each pair
    const correlations = [];

    for (let i = 0; i < qualifiedItems.length; i++) {
      for (let j = i + 1; j < qualifiedItems.length; j++) {
        const itemA = qualifiedItems[i];
        const itemB = qualifiedItems[j];

        let n11 = 0;
        let n10 = 0;
        let n01 = 0;
        let n00 = 0;

        for (const txSet of txSets) {
          const hasA = txSet.has(itemA);
          const hasB = txSet.has(itemB);

          if (hasA && hasB) n11++;
          else if (hasA && !hasB) n10++;
          else if (!hasA && hasB) n01++;
          else n00++;
        }

        const numerator = (n11 * n00) - (n10 * n01);
        const denominator = Math.sqrt(
          (n11 + n10) * (n01 + n00) * (n11 + n01) * (n10 + n00)
        );

        const correlation = denominator === 0 ? 0 : numerator / denominator;

        correlations.push({
          itemA,
          itemB,
          correlation,
          cooccurrence: n11
        });
      }
    }

    return correlations;
  }

  /**
   * Build correlation matrix for heatmap visualization.
   * Produces a symmetric matrix with diagonal values of 1.
   *
   * @param {CorrelationEntry[]} correlations
   * @param {Object.<string, string>} nameMap - ID to name mapping
   * @returns {{ labels: string[], matrix: number[][] }}
   */
  buildMatrix(correlations, nameMap) {
    if (!correlations || correlations.length === 0) {
      return { labels: [], matrix: [] };
    }

    // Collect all unique items from correlations
    const itemSet = new Set();
    for (const entry of correlations) {
      itemSet.add(entry.itemA);
      itemSet.add(entry.itemB);
    }

    // Sort items for deterministic ordering
    const items = [...itemSet].sort();

    // Map items to display labels
    const labels = items.map(item =>
      (nameMap && nameMap[item]) ? nameMap[item] : item
    );

    // Create index lookup
    const indexMap = new Map();
    items.forEach((item, idx) => {
      indexMap.set(item, idx);
    });

    // Initialize matrix with diagonal = 1
    const size = items.length;
    const matrix = [];
    for (let i = 0; i < size; i++) {
      const row = new Array(size).fill(0);
      row[i] = 1; // diagonal
      matrix.push(row);
    }

    // Fill in correlation values (symmetric)
    for (const entry of correlations) {
      const i = indexMap.get(entry.itemA);
      const j = indexMap.get(entry.itemB);
      if (i !== undefined && j !== undefined) {
        matrix[i][j] = entry.correlation;
        matrix[j][i] = entry.correlation;
      }
    }

    return { labels, matrix };
  }
}

module.exports = CorrelationAnalyzer;
