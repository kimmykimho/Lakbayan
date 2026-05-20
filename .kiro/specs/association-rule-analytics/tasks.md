# Implementation Plan: Association Rule Analytics

## Overview

Implement Market Basket Analysis for the Lakbayan sa Kitcharao admin dashboard using a pure JavaScript Apriori algorithm. The feature mines transactional data (bookings, favorites, transport requests) to discover destination co-visitation patterns and presents results through interactive Chart.js visualizations. The implementation follows existing Express/React patterns with no new dependencies.

## Tasks

- [x] 1. Implement backend service classes
  - [x] 1.1 Create TransactionBuilder class
    - Create `server/services/association-rules/TransactionBuilder.js`
    - Implement `buildFromBookings(options)` - query bookings table, group places by user_id using array_agg, filter by status (confirmed/completed) and optional period
    - Implement `buildFromFavorites()` - query user_favorites table, group place_ids by user_id
    - Implement `buildFromTransport()` - query transport_requests table, extract place references from pickup/destination jsonb fields, group by user_id
    - Implement `buildCategoryTransactions(sourceType)` - resolve place IDs to category labels before grouping
    - Filter out transactions with fewer than 2 items
    - Resolve place IDs to names via places table join
    - Use `queryAll` from `server/config/neon.js` for all database queries
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [x] 1.2 Create AprioriEngine class
    - Create `server/services/association-rules/AprioriEngine.js`
    - Implement `findFrequentItemsets(transactions, minSupport, maxSize)` using iterative candidate generation and pruning
    - Implement `calculateSupport(itemset, transactions)` helper
    - Implement `generateCandidates(prevLevel, k)` with join + prune steps
    - Implement subset frequency check for Apriori property enforcement
    - Deduplicate candidates using sorted string keys
    - Return results sorted by support descending
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 1.3 Create RuleGenerator class
    - Create `server/services/association-rules/RuleGenerator.js`
    - Implement `generateRules(itemsets, transactions, minConfidence, minLift)` 
    - For each frequent itemset of size >= 2, generate all non-empty proper subsets as antecedents
    - Compute confidence = support(A∪B) / support(A)
    - Compute lift = confidence / support(B)
    - Compute conviction = (1 - support(B)) / (1 - confidence)
    - Filter by minConfidence and minLift thresholds
    - Return rules sorted by lift descending
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

  - [x] 1.4 Create CorrelationAnalyzer class
    - Create `server/services/association-rules/CorrelationAnalyzer.js`
    - Implement `computeCorrelations(transactions, minOccurrence)` using phi coefficient formula
    - Implement `buildMatrix(correlations, nameMap)` to produce labels array and 2D matrix for heatmap
    - Handle zero-variance edge cases (return 0)
    - Ensure symmetric output and diagonal values of 1
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 1.5 Create AssociationRuleService orchestrator
    - Create `server/services/association-rules/AssociationRuleService.js`
    - Implement `analyze(params)` that coordinates TransactionBuilder → AprioriEngine → RuleGenerator → CorrelationAnalyzer
    - Implement `generateRecommendations(rules, nameMap)` to produce bundle suggestions from top-lift rules
    - Handle insufficient data (< 3 transactions): return empty results with warning message and suggestions
    - Handle no frequent itemsets: include `suggestedMinSupport` at half the current value
    - Compute stats: totalTransactions, uniqueItems, avgTransactionSize, totalRules
    - _Requirements: 6.1, 6.2, 6.3, 9.1, 9.2, 9.3, 11.2_

- [x] 2. Implement API route and controller
  - [x] 2.1 Create association rules API route
    - Add `GET /api/analytics/association-rules` endpoint in `server/routes/analytics.js`
    - Apply `protect` and `authorize('admin')` middleware
    - Parse and validate query parameters: type, minSupport, minConfidence, minLift, maxSize, period
    - Return HTTP 400 with descriptive errors for invalid parameters
    - Implement in-memory caching using `getCached`/`setCache` from neon.js with 5-minute TTL (300000ms)
    - Construct cache key from type + minSupport + minConfidence + period
    - Call AssociationRuleService.analyze() and return JSON response with `{ success: true, data: {...} }` structure
    - _Requirements: 1.1, 1.2, 1.3, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 8.1, 8.2, 8.3, 11.1, 11.3, 11.4, 11.5, 11.6_

- [x] 3. Checkpoint - Backend verification
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement frontend page
  - [x] 4.1 Create AssociationRules admin page component
    - Create `client/src/pages/admin/AssociationRules.jsx`
    - Add state for parameters (minSupport, minConfidence, minLift, type, period) with sensible defaults
    - Implement API fetch using existing axios/fetch pattern to `GET /api/analytics/association-rules`
    - Add loading state with spinner/skeleton indicator
    - Display stats summary (totalTransactions, uniqueItems, avgTransactionSize, totalRules)
    - Display insufficient data warning prominently when returned
    - Use Tailwind CSS consistent with existing admin pages
    - _Requirements: 10.5, 10.6, 10.7, 10.8_

  - [x] 4.2 Implement results tables and controls
    - Add parameter input controls: sliders/inputs for minSupport, minConfidence, minLift; select for analysis type; input for period
    - Implement Frequent Itemsets table showing item names, support %, and occurrence count
    - Implement Association Rules table showing antecedent → consequent, support, confidence, lift columns
    - Implement Bundle Recommendations section showing place names, confidence, lift, and insight text
    - Re-fetch on parameter change (debounced)
    - _Requirements: 10.1, 10.2, 10.4, 10.5, 10.6_

  - [x] 4.3 Implement correlation heatmap chart
    - Use `react-chartjs-2` Matrix/scatter chart or custom heatmap rendering with Chart.js
    - Render correlation matrix with place name labels on axes
    - Color-code cells from negative (red) to positive (green) correlation
    - Handle empty/small matrices gracefully
    - _Requirements: 10.3_

- [x] 5. Register routes and wire together
  - [x] 5.1 Register frontend route in App.jsx
    - Import AssociationRules page component in `client/src/App.jsx`
    - Add `<Route path="association-rules" element={<AssociationRules />} />` inside the admin routes section
    - _Requirements: 10.1_

  - [x] 5.2 Add navigation link in AdminLayout
    - Add "Association Rules" or "Market Basket" link in `client/src/components/layouts/AdminLayout.jsx` sidebar navigation under analytics section
    - _Requirements: 10.1_

- [x] 6. Checkpoint - Full integration verification
  - Ensure all tests pass, ask the user if questions arise.

- [ ]* 7. Property-based tests
  - [ ]* 7.1 Write property test for Support Monotonicity
    - **Property 1: Support Monotonicity (Apriori Property)**
    - Use fast-check to generate random transaction sets, verify all subsets of returned frequent itemsets are also present with support >= child support
    - **Validates: Requirements 3.1, 3.3**

  - [ ]* 7.2 Write property test for Rule Metric Correctness
    - **Property 2: Rule Metric Correctness**
    - Generate random itemsets/transactions, verify confidence = support(A∪B)/support(A), lift = confidence/support(B)
    - **Validates: Requirements 4.2, 4.3, 4.4**

  - [ ]* 7.3 Write property test for Rule Threshold Filtering
    - **Property 3: Rule Threshold Filtering**
    - Generate rules with random thresholds, verify every rule satisfies confidence >= minConfidence AND lift >= minLift, and antecedent/consequent are disjoint
    - **Validates: Requirements 4.5, 4.6**

  - [ ]* 7.4 Write property test for Transaction Invariants
    - **Property 4: Transaction Invariants**
    - Verify TransactionBuilder output has at most one transaction per user and every transaction has >= 2 items
    - **Validates: Requirements 2.5, 2.6**

  - [ ]* 7.5 Write property test for Correlation Matrix Validity
    - **Property 5: Correlation Matrix Validity**
    - Generate random transactions, verify matrix symmetry, diagonal = 1, all values in [-1, 1]
    - **Validates: Requirements 5.2, 5.3, 5.4**

  - [ ]* 7.6 Write property test for Input Validation Rejection
    - **Property 7: Input Validation Rejection**
    - Generate random invalid parameter combinations, verify HTTP 400 response
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6**

- [x] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- No new dependencies needed - uses existing chart.js, react-chartjs-2, and pure JS for Apriori
- All service classes go in `server/services/association-rules/` directory
- The API route is added to the existing `server/routes/analytics.js` file (already mounted at `/api/analytics`)
- Frontend uses existing Tailwind CSS patterns from other admin pages
- Real data only - graceful empty state when insufficient data exists

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3", "1.4"] },
    { "id": 1, "tasks": ["1.5"] },
    { "id": 2, "tasks": ["2.1"] },
    { "id": 3, "tasks": ["4.1", "5.1", "5.2"] },
    { "id": 4, "tasks": ["4.2", "4.3"] },
    { "id": 5, "tasks": ["7.1", "7.2", "7.3", "7.4", "7.5", "7.6"] }
  ]
}
```
