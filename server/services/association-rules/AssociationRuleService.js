/**
 * AssociationRuleService - Orchestrates the full association rule analysis pipeline.
 *
 * Coordinates: TransactionBuilder → AprioriEngine → RuleGenerator → CorrelationAnalyzer
 * Formats results for the API response including stats, recommendations, and warnings.
 */

const TransactionBuilder = require('./TransactionBuilder');
const AprioriEngine = require('./AprioriEngine');
const RuleGenerator = require('./RuleGenerator');
const CorrelationAnalyzer = require('./CorrelationAnalyzer');

class AssociationRuleService {
  constructor() {
    this.transactionBuilder = new TransactionBuilder();
    this.aprioriEngine = new AprioriEngine();
    this.ruleGenerator = new RuleGenerator();
    this.correlationAnalyzer = new CorrelationAnalyzer();
  }

  /**
   * Run complete association rule analysis.
   * @param {Object} params
   * @param {string} params.type - 'bookings' | 'favorites' | 'transport' | 'categories'
   * @param {number} params.minSupport - Minimum support (0.01-1.0)
   * @param {number} params.minConfidence - Minimum confidence (0.01-1.0)
   * @param {number} params.minLift - Minimum lift (>= 1.0)
   * @param {number} [params.maxItemsetSize=4] - Max items in a set (2-6)
   * @param {number} [params.period=0] - Days to look back (0 = all time)
   * @returns {Promise<AnalysisResult>}
   */
  async analyze(params) {
    const {
      type,
      minSupport = 0.1,
      minConfidence = 0.5,
      minLift = 1.0,
      maxItemsetSize = 4,
      period = 0
    } = params;

    // Step 1: Build transactions
    const transactions = await this._buildTransactions(type, period);

    // Handle insufficient data (< 3 transactions)
    if (transactions.length < 3) {
      return {
        stats: {
          totalTransactions: transactions.length,
          uniqueItems: this._countUniqueItems(transactions),
          avgTransactionSize: this._computeAvgSize(transactions),
          totalRules: 0,
          analysisType: type,
          period: period === 0 ? 'all time' : `${period} days`
        },
        frequentItemsets: [],
        rules: [],
        correlationMatrix: { labels: [], matrix: [] },
        recommendations: [],
        deepInsights: null,
        warning: 'Not enough tourist activity data yet. At least 3 different tourists must have visited 2+ destinations. As more tourists use the platform, patterns will emerge automatically.',
        suggestedMinSupport: null
      };
    }

    // Build combined name map from all transactions
    const nameMap = this._buildNameMap(transactions);

    // Step 2: Find frequent itemsets
    const frequentItemsets = this.aprioriEngine.findFrequentItemsets(
      transactions,
      minSupport,
      maxItemsetSize
    );

    // Handle no frequent itemsets found
    if (frequentItemsets.length === 0) {
      return {
        stats: {
          totalTransactions: transactions.length,
          uniqueItems: this._countUniqueItems(transactions),
          avgTransactionSize: this._computeAvgSize(transactions),
          totalRules: 0,
          analysisType: type,
          period: period === 0 ? 'all time' : `${period} days`
        },
        frequentItemsets: [],
        rules: [],
        correlationMatrix: { labels: [], matrix: [] },
        recommendations: [],
        deepInsights: null,
        warning: 'No destination patterns found at the current support threshold. This means no pair of destinations is visited by enough tourists yet. Try lowering the minimum support.',
        suggestedMinSupport: minSupport / 2
      };
    }

    // Step 3: Generate association rules
    const rules = this.ruleGenerator.generateRules(
      frequentItemsets,
      transactions,
      minConfidence,
      minLift
    );

    // Step 4: Compute correlations
    const correlations = this.correlationAnalyzer.computeCorrelations(transactions);
    const correlationMatrix = this.correlationAnalyzer.buildMatrix(correlations, nameMap);

    // Step 5: Generate recommendations
    const recommendations = this.generateRecommendations(rules, nameMap);

    // Step 6: Deep insights - time patterns, category analysis, tourist segments
    const deepInsights = this._computeDeepInsights(transactions, frequentItemsets, rules, nameMap);

    // Step 7: Enrich frequent itemsets with names
    const enrichedItemsets = frequentItemsets
      .filter(is => is.items.length >= 2)
      .map(itemset => ({
        items: itemset.items,
        itemNames: itemset.items.map(id => nameMap[id] || id),
        support: itemset.support,
        count: itemset.count
      }));

    return {
      stats: {
        totalTransactions: transactions.length,
        uniqueItems: this._countUniqueItems(transactions),
        avgTransactionSize: this._computeAvgSize(transactions),
        totalRules: rules.length,
        analysisType: type,
        period: period === 0 ? 'all time' : `${period} days`
      },
      frequentItemsets: enrichedItemsets,
      rules: rules.map(rule => ({
        antecedent: rule.antecedent.map(id => nameMap[id] || id),
        consequent: rule.consequent.map(id => nameMap[id] || id),
        support: rule.support,
        confidence: rule.confidence,
        lift: rule.lift,
        conviction: rule.conviction
      })),
      correlationMatrix,
      recommendations,
      deepInsights,
      warning: null,
      suggestedMinSupport: null
    };
  }

  /**
   * Generate bundle recommendations from association rules.
   * Uses top-lift rules to produce actionable bundle suggestions.
   * @param {AssociationRule[]} rules - Rules sorted by lift descending
   * @param {Object.<string, string>} nameMap - Place ID to name mapping
   * @returns {BundleRecommendation[]}
   */
  generateRecommendations(rules, nameMap) {
    if (!rules || rules.length === 0) {
      return [];
    }

    // Take top rules by lift (already sorted by lift descending)
    const topRules = rules.slice(0, 10);

    return topRules.map(rule => {
      const antecedentNames = rule.antecedent.map(id => nameMap[id] || id);
      const consequentNames = rule.consequent.map(id => nameMap[id] || id);
      const allPlaces = [...antecedentNames, ...consequentNames];
      const liftFormatted = rule.lift.toFixed(1);

      const insight = `Tourists who visit ${antecedentNames.join(', ')} are ${liftFormatted}x more likely to also visit ${consequentNames.join(', ')}`;

      return {
        places: allPlaces,
        confidence: rule.confidence,
        lift: rule.lift,
        insight
      };
    });
  }

  /**
   * Build transactions based on the analysis type and period.
   * @param {string} type - 'bookings' | 'favorites' | 'transport' | 'categories'
   * @param {number} period - Days to look back (0 = all time)
   * @returns {Promise<Transaction[]>}
   * @private
   */
  async _buildTransactions(type, period) {
    switch (type) {
      case 'bookings':
        return this.transactionBuilder.buildFromBookings({
          minDays: period,
          statuses: ['confirmed', 'completed']
        });
      case 'favorites':
        return this.transactionBuilder.buildFromFavorites();
      case 'transport':
        return this.transactionBuilder.buildFromTransport();
      case 'categories':
        return this.transactionBuilder.buildCategoryTransactions('bookings');
      default:
        throw new Error(`Invalid analysis type: ${type}`);
    }
  }

  /**
   * Build a combined name map from all transactions.
   * @param {Transaction[]} transactions
   * @returns {Object.<string, string>}
   * @private
   */
  _buildNameMap(transactions) {
    const nameMap = {};
    for (const tx of transactions) {
      if (tx.itemNames) {
        Object.assign(nameMap, tx.itemNames);
      }
    }
    return nameMap;
  }

  /**
   * Count unique items across all transactions.
   * @param {Transaction[]} transactions
   * @returns {number}
   * @private
   */
  _countUniqueItems(transactions) {
    const items = new Set();
    for (const tx of transactions) {
      for (const item of tx.items) {
        items.add(item);
      }
    }
    return items.size;
  }

  /**
   * Compute average transaction size.
   * @param {Transaction[]} transactions
   * @returns {number}
   * @private
   */
  _computeAvgSize(transactions) {
    if (transactions.length === 0) return 0;
    const total = transactions.reduce((sum, tx) => sum + tx.items.length, 0);
    return parseFloat((total / transactions.length).toFixed(1));
  }

  /**
   * Compute deep insights from the analysis results.
   * Provides tourism-specific interpretations beyond raw numbers.
   * @param {Transaction[]} transactions
   * @param {FrequentItemset[]} itemsets
   * @param {AssociationRule[]} rules
   * @param {Object} nameMap
   * @returns {Object}
   * @private
   */
  _computeDeepInsights(transactions, itemsets, rules, nameMap) {
    const insights = {
      topDestination: null,
      strongestPair: null,
      avgDestinationsPerTourist: 0,
      mostConnectedDestination: null,
      tourismPatterns: [],
      categoryBreakdown: {}
    };

    // Top destination (appears in most transactions)
    const destCounts = new Map();
    for (const tx of transactions) {
      for (const item of tx.items) {
        destCounts.set(item, (destCounts.get(item) || 0) + 1);
      }
    }
    let maxCount = 0;
    let topDest = null;
    for (const [item, count] of destCounts) {
      if (count > maxCount) {
        maxCount = count;
        topDest = item;
      }
    }
    if (topDest) {
      insights.topDestination = {
        name: nameMap[topDest] || topDest,
        visitCount: maxCount,
        percentage: ((maxCount / transactions.length) * 100).toFixed(1)
      };
    }

    // Strongest pair (highest lift rule)
    if (rules.length > 0) {
      const best = rules[0]; // already sorted by lift desc
      insights.strongestPair = {
        from: best.antecedent.map(id => nameMap[id] || id),
        to: best.consequent.map(id => nameMap[id] || id),
        lift: best.lift,
        confidence: best.confidence
      };
    }

    // Avg destinations per tourist
    insights.avgDestinationsPerTourist = this._computeAvgSize(transactions);

    // Most connected destination (appears in most 2+ itemsets)
    const connectionCounts = new Map();
    const multiItemsets = itemsets.filter(is => is.items.length >= 2);
    for (const is of multiItemsets) {
      for (const item of is.items) {
        connectionCounts.set(item, (connectionCounts.get(item) || 0) + 1);
      }
    }
    let maxConnections = 0;
    let mostConnected = null;
    for (const [item, count] of connectionCounts) {
      if (count > maxConnections) {
        maxConnections = count;
        mostConnected = item;
      }
    }
    if (mostConnected) {
      insights.mostConnectedDestination = {
        name: nameMap[mostConnected] || mostConnected,
        connections: maxConnections
      };
    }

    // Tourism patterns (human-readable)
    if (rules.length > 0) {
      insights.tourismPatterns = rules.slice(0, 5).map(rule => {
        const from = rule.antecedent.map(id => nameMap[id] || id).join(', ');
        const to = rule.consequent.map(id => nameMap[id] || id).join(', ');
        return `${(rule.confidence * 100).toFixed(0)}% of tourists who visit ${from} also visit ${to} (${rule.lift.toFixed(1)}x more likely than average)`;
      });
    }

    return insights;
  }
}


module.exports = AssociationRuleService;
