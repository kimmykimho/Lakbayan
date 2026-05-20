/**
 * RuleGenerator - Generates association rules from frequent itemsets
 * and computes confidence, lift, and conviction metrics.
 *
 * @typedef {Object} FrequentItemset
 * @property {string[]} items - Place IDs in this itemset
 * @property {number} support - Proportion of transactions containing all items (0-1)
 * @property {number} count - Absolute number of transactions containing this itemset
 *
 * @typedef {Object} Transaction
 * @property {string} userId - User identifier
 * @property {string[]} items - Array of place IDs in this transaction
 *
 * @typedef {Object} AssociationRule
 * @property {string[]} antecedent - Left-hand side (IF items)
 * @property {string[]} consequent - Right-hand side (THEN items)
 * @property {number} support - Support of the full rule itemset
 * @property {number} confidence - P(consequent | antecedent)
 * @property {number} lift - confidence / P(consequent)
 * @property {number} conviction - (1 - P(consequent)) / (1 - confidence)
 */

class RuleGenerator {
  /**
   * Generate all valid association rules from frequent itemsets.
   * For each frequent itemset of size >= 2, generates all non-empty proper subsets
   * as antecedents, computes metrics, and filters by thresholds.
   *
   * @param {FrequentItemset[]} itemsets - Frequent itemsets from Apriori
   * @param {Transaction[]} transactions - Original transactions for metric calculation
   * @param {number} minConfidence - Minimum confidence threshold (0-1)
   * @param {number} [minLift=1.0] - Minimum lift threshold
   * @returns {AssociationRule[]} Rules sorted by lift descending
   */
  generateRules(itemsets, transactions, minConfidence, minLift = 1.0) {
    const rules = [];
    const supportMap = this._buildSupportMap(itemsets, transactions);

    for (const itemset of itemsets) {
      if (itemset.items.length < 2) continue;

      const subsets = this._getNonEmptyProperSubsets(itemset.items);

      for (const antecedent of subsets) {
        const consequent = itemset.items.filter(item => !antecedent.includes(item));

        // Ensure consequent is non-empty (antecedent must be a proper subset)
        if (consequent.length === 0) continue;

        const supportAB = itemset.support;
        const supportA = this._getSupport(antecedent, supportMap, transactions);
        const supportB = this._getSupport(consequent, supportMap, transactions);

        // Skip if we can't compute metrics
        if (supportA === 0 || supportB === 0) continue;

        const confidence = supportAB / supportA;
        const lift = confidence / supportB;
        const conviction = confidence >= 1
          ? Infinity
          : (1 - supportB) / (1 - confidence);

        if (confidence >= minConfidence && lift >= minLift) {
          rules.push({
            antecedent: [...antecedent].sort(),
            consequent: [...consequent].sort(),
            support: supportAB,
            confidence,
            lift,
            conviction
          });
        }
      }
    }

    // Sort by lift descending
    return rules.sort((a, b) => b.lift - a.lift);
  }

  /**
   * Build a lookup map from sorted itemset key to support value.
   * @param {FrequentItemset[]} itemsets
   * @param {Transaction[]} transactions
   * @returns {Map<string, number>}
   */
  _buildSupportMap(itemsets, transactions) {
    const map = new Map();
    for (const itemset of itemsets) {
      const key = [...itemset.items].sort().join(',');
      map.set(key, itemset.support);
    }
    return map;
  }

  /**
   * Get support for a given set of items, first checking the precomputed map,
   * then falling back to computing from transactions.
   * @param {string[]} items
   * @param {Map<string, number>} supportMap
   * @param {Transaction[]} transactions
   * @returns {number}
   */
  _getSupport(items, supportMap, transactions) {
    const key = [...items].sort().join(',');
    if (supportMap.has(key)) {
      return supportMap.get(key);
    }

    // Compute support directly from transactions
    if (transactions.length === 0) return 0;
    const count = transactions.filter(tx =>
      items.every(item => tx.items.includes(item))
    ).length;
    const support = count / transactions.length;

    // Cache for future lookups
    supportMap.set(key, support);
    return support;
  }

  /**
   * Generate all non-empty proper subsets of an itemset.
   * A proper subset excludes the empty set and the full set itself.
   * @param {string[]} items
   * @returns {string[][]}
   */
  _getNonEmptyProperSubsets(items) {
    const subsets = [];
    const n = items.length;
    // Use bitmask to enumerate all subsets
    // From 1 (at least one element) to 2^n - 2 (not the full set)
    const total = 1 << n;

    for (let mask = 1; mask < total - 1; mask++) {
      const subset = [];
      for (let i = 0; i < n; i++) {
        if (mask & (1 << i)) {
          subset.push(items[i]);
        }
      }
      subsets.push(subset);
    }

    return subsets;
  }
}

module.exports = RuleGenerator;
