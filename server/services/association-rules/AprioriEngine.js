/**
 * AprioriEngine - Implements the Apriori algorithm for frequent itemset mining.
 *
 * Generates candidate itemsets of increasing size, pruning those below
 * the minimum support threshold. Enforces the Apriori property: all subsets
 * of a frequent itemset must also be frequent.
 *
 * @typedef {Object} Transaction
 * @property {string} userId - User identifier
 * @property {string[]} items - Array of place IDs in this transaction
 *
 * @typedef {Object} FrequentItemset
 * @property {string[]} items - Place IDs in this itemset
 * @property {number} support - Proportion of transactions containing all items (0-1)
 * @property {number} count - Absolute number of transactions containing this itemset
 */

class AprioriEngine {
  /**
   * Find all frequent itemsets above minimum support.
   *
   * @param {Transaction[]} transactions - Input transactions
   * @param {number} minSupport - Minimum support threshold (0-1)
   * @param {number} [maxSize=4] - Maximum itemset size to discover
   * @returns {FrequentItemset[]} All frequent itemsets sorted by support descending
   */
  findFrequentItemsets(transactions, minSupport, maxSize = 4) {
    if (!transactions || transactions.length === 0) {
      return [];
    }

    const n = transactions.length;
    const minCount = Math.ceil(minSupport * n);
    const allFrequent = [];

    // Step 1: Find frequent 1-itemsets
    const itemCounts = new Map();
    for (const tx of transactions) {
      for (const item of tx.items) {
        itemCounts.set(item, (itemCounts.get(item) || 0) + 1);
      }
    }

    let currentLevel = [];
    for (const [item, count] of itemCounts) {
      if (count >= minCount) {
        currentLevel.push({ items: [item], support: count / n, count });
        allFrequent.push({ items: [item], support: count / n, count });
      }
    }

    // Sort current level items for consistent candidate generation
    currentLevel.sort((a, b) => a.items[0].localeCompare(b.items[0]));

    // Step 2: Iteratively find k-itemsets from (k-1)-itemsets
    let k = 2;
    while (currentLevel.length > 0 && k <= maxSize) {
      const candidates = this.generateCandidates(currentLevel, k);
      const nextLevel = [];

      for (const candidate of candidates) {
        const count = this._countSupport(candidate, transactions);
        if (count >= minCount) {
          const itemset = { items: candidate, support: count / n, count };
          nextLevel.push(itemset);
          allFrequent.push(itemset);
        }
      }

      currentLevel = nextLevel;
      k++;
    }

    // Return sorted by support descending
    return allFrequent.sort((a, b) => b.support - a.support);
  }

  /**
   * Calculate support for a specific itemset.
   *
   * @param {string[]} itemset - Items to check
   * @param {Transaction[]} transactions - Transaction dataset
   * @returns {number} Support value (0-1)
   */
  calculateSupport(itemset, transactions) {
    if (!transactions || transactions.length === 0) {
      return 0;
    }
    const count = this._countSupport(itemset, transactions);
    return count / transactions.length;
  }

  /**
   * Generate candidate k-itemsets from frequent (k-1)-itemsets.
   * Uses join step + prune step of Apriori.
   *
   * @param {FrequentItemset[]} prevLevel - Frequent (k-1)-itemsets
   * @param {number} k - Target itemset size
   * @returns {string[][]} Candidate itemsets (sorted arrays of item IDs)
   */
  generateCandidates(prevLevel, k) {
    const candidates = [];
    const seen = new Set();
    const prevItemsSorted = prevLevel.map((x) => x.items.slice().sort());

    // Build a set of frequent (k-1)-itemset keys for fast subset checking
    const frequentKeys = new Set(prevItemsSorted.map((items) => items.join(',')));

    for (let i = 0; i < prevItemsSorted.length; i++) {
      for (let j = i + 1; j < prevItemsSorted.length; j++) {
        // Join step: merge two (k-1)-itemsets that share first (k-2) items
        const a = prevItemsSorted[i];
        const b = prevItemsSorted[j];

        // Check if the first (k-2) items are identical
        let canJoin = true;
        for (let p = 0; p < k - 2; p++) {
          if (a[p] !== b[p]) {
            canJoin = false;
            break;
          }
        }

        if (!canJoin) continue;

        // Create candidate by merging
        const merged = [...new Set([...a, ...b])].sort();

        if (merged.length !== k) continue;

        // Deduplicate using sorted string key
        const key = merged.join(',');
        if (seen.has(key)) continue;
        seen.add(key);

        // Prune step: check all (k-1)-subsets are frequent
        if (this._allSubsetsFrequent(merged, frequentKeys)) {
          candidates.push(merged);
        }
      }
    }

    return candidates;
  }

  /**
   * Count how many transactions contain all items in the itemset.
   *
   * @param {string[]} itemset - Items to check
   * @param {Transaction[]} transactions - Transaction dataset
   * @returns {number} Count of transactions containing all items
   * @private
   */
  _countSupport(itemset, transactions) {
    let count = 0;
    for (const tx of transactions) {
      if (this._isSubset(itemset, tx.items)) {
        count++;
      }
    }
    return count;
  }

  /**
   * Check if all items in the itemset exist in the transaction items.
   *
   * @param {string[]} itemset - Items to check
   * @param {string[]} txItems - Transaction item list
   * @returns {boolean}
   * @private
   */
  _isSubset(itemset, txItems) {
    for (const item of itemset) {
      if (!txItems.includes(item)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Check that all (k-1)-subsets of a candidate are in the frequent set.
   * Enforces the Apriori property.
   *
   * @param {string[]} candidate - Candidate itemset (sorted)
   * @param {Set<string>} frequentKeys - Set of frequent (k-1)-itemset keys
   * @returns {boolean}
   * @private
   */
  _allSubsetsFrequent(candidate, frequentKeys) {
    // Generate all (k-1)-subsets by removing one item at a time
    for (let i = 0; i < candidate.length; i++) {
      const subset = [...candidate.slice(0, i), ...candidate.slice(i + 1)];
      const key = subset.join(',');
      if (!frequentKeys.has(key)) {
        return false;
      }
    }
    return true;
  }
}

module.exports = AprioriEngine;
