# Requirements Document

## Introduction

The Association Rule Analytics feature provides Market Basket Analysis capabilities for the Lakbayan sa Kitcharao tourism platform admin dashboard. It mines real transactional data (bookings, favorites, transport requests) to discover which tourism destinations are frequently visited together, enabling data-driven decisions for destination bundling, cross-promotion, and route planning. The system implements the Apriori algorithm in pure JavaScript, presents results through interactive visualizations, and gracefully handles scenarios where insufficient real data exists.

## Glossary

- **Admin**: A user with the `admin` role in the system, authorized to access analytics features
- **Association_Rule**: A relationship of the form A→B indicating that tourists who visit places in set A also tend to visit places in set B, quantified by support, confidence, and lift metrics
- **Apriori_Engine**: The server-side component implementing the Apriori algorithm for frequent itemset mining
- **Transaction**: A user-level aggregation of place interactions (bookings, favorites, or transport requests) representing one "basket" in market basket analysis
- **Transaction_Builder**: The component responsible for querying the database and constructing transactions from raw booking, favorite, and transport data
- **Rule_Generator**: The component that produces association rules from frequent itemsets and computes confidence, lift, and conviction metrics
- **Correlation_Analyzer**: The component that computes pairwise phi coefficients between places for heatmap visualization
- **Association_Rule_Service**: The orchestrator component that coordinates the full analysis pipeline
- **Frequent_Itemset**: A set of places that co-occur in transactions at or above the minimum support threshold
- **Support**: The proportion of transactions containing a given itemset (range 0 to 1)
- **Confidence**: The conditional probability P(B|A) for a rule A→B (range 0 to 1)
- **Lift**: The ratio of observed confidence to expected confidence if items were independent (lift > 1 indicates positive correlation)
- **Phi_Coefficient**: A measure of pairwise correlation between two binary variables, ranging from -1 to 1
- **API_Endpoint**: The server route `GET /api/analytics/association-rules` that serves analysis results
- **Cache**: An in-memory store with a 5-minute TTL used to avoid recomputing expensive analysis on repeated requests

## Requirements

### Requirement 1: Access Control

**User Story:** As a platform administrator, I want only admin users to access association rule analytics, so that sensitive business intelligence is restricted to authorized personnel.

#### Acceptance Criteria

1. WHEN a user with `admin` role requests the API_Endpoint, THE API_Endpoint SHALL process the request and return analysis results
2. WHEN a user without `admin` role requests the API_Endpoint, THE API_Endpoint SHALL reject the request with HTTP 403 status
3. WHEN an unauthenticated request is made to the API_Endpoint, THE API_Endpoint SHALL reject the request with HTTP 401 status

### Requirement 2: Transaction Building

**User Story:** As an administrator, I want the system to aggregate real user interactions into transactions, so that association rule mining operates on actual tourist behavior data.

#### Acceptance Criteria

1. WHEN the analysis type is `bookings`, THE Transaction_Builder SHALL group all places booked by the same user into a single transaction, filtering by confirmed or completed status
2. WHEN the analysis type is `favorites`, THE Transaction_Builder SHALL treat each user's complete favorites list as one transaction
3. WHEN the analysis type is `transport`, THE Transaction_Builder SHALL group pickup and destination places per user into transactions
4. WHEN the analysis type is `categories`, THE Transaction_Builder SHALL abstract places to their category labels before building transactions
5. THE Transaction_Builder SHALL exclude transactions containing fewer than 2 items
6. THE Transaction_Builder SHALL produce exactly one transaction per user for any given analysis type
7. WHEN a `period` parameter greater than zero is specified, THE Transaction_Builder SHALL include only interactions from within that number of days

### Requirement 3: Frequent Itemset Mining

**User Story:** As an administrator, I want the system to identify sets of destinations frequently visited together, so that I can understand tourist behavior patterns.

#### Acceptance Criteria

1. THE Apriori_Engine SHALL return only itemsets with support greater than or equal to the specified `minSupport` threshold
2. THE Apriori_Engine SHALL discover all frequent itemsets up to the specified `maxSize` (default 4, maximum 6)
3. THE Apriori_Engine SHALL enforce the Apriori property: for every returned frequent itemset of size k, all its (k-1)-subsets are also frequent
4. THE Apriori_Engine SHALL return itemsets sorted by support in descending order
5. WHEN no itemsets meet the minimum support threshold, THE Apriori_Engine SHALL return an empty array

### Requirement 4: Association Rule Generation

**User Story:** As an administrator, I want the system to generate association rules with confidence and lift metrics, so that I can identify meaningful destination relationships.

#### Acceptance Criteria

1. THE Rule_Generator SHALL produce rules only from frequent itemsets of size 2 or greater
2. THE Rule_Generator SHALL compute confidence as `support(A∪B) / support(A)` for each rule A→B
3. THE Rule_Generator SHALL compute lift as `confidence(A→B) / support(B)` for each rule A→B
4. THE Rule_Generator SHALL compute conviction as `(1 - support(B)) / (1 - confidence)` for each rule A→B
5. THE Rule_Generator SHALL return only rules where confidence is greater than or equal to `minConfidence` AND lift is greater than or equal to `minLift`
6. THE Rule_Generator SHALL ensure that antecedent and consequent of every rule are disjoint (no shared items)
7. THE Rule_Generator SHALL return rules sorted by lift in descending order

### Requirement 5: Correlation Analysis

**User Story:** As an administrator, I want to see pairwise correlation between destinations, so that I can visualize which places are positively or negatively associated.

#### Acceptance Criteria

1. THE Correlation_Analyzer SHALL compute the phi coefficient for every pair of items appearing in at least 2 transactions
2. THE Correlation_Analyzer SHALL produce a symmetric matrix where `matrix[i][j]` equals `matrix[j][i]`
3. THE Correlation_Analyzer SHALL set diagonal values to 1 (perfect self-correlation)
4. THE Correlation_Analyzer SHALL return phi values in the range [-1, 1]
5. WHEN an item has zero variance (appears in all or no transactions), THE Correlation_Analyzer SHALL return 0 for that pair

### Requirement 6: Insufficient Data Handling

**User Story:** As an administrator, I want clear feedback when there is insufficient data for analysis, so that I understand why results are empty and what action to take.

#### Acceptance Criteria

1. WHEN fewer than 3 transactions are available for the selected analysis type, THE Association_Rule_Service SHALL return a successful response with empty results and a warning message indicating insufficient data
2. WHEN no frequent itemsets are found due to a high support threshold, THE Association_Rule_Service SHALL include a `suggestedMinSupport` value equal to half the current threshold
3. WHEN insufficient data is detected, THE Association_Rule_Service SHALL suggest trying a different analysis type or broader time period

### Requirement 7: Input Validation

**User Story:** As an administrator, I want the system to validate my parameter inputs, so that I receive clear error messages instead of unexpected behavior.

#### Acceptance Criteria

1. WHEN `minSupport` is outside the range [0.01, 1.0], THE API_Endpoint SHALL reject the request with HTTP 400 and a descriptive error
2. WHEN `minConfidence` is outside the range [0.01, 1.0], THE API_Endpoint SHALL reject the request with HTTP 400 and a descriptive error
3. WHEN `minLift` is less than 1.0, THE API_Endpoint SHALL reject the request with HTTP 400 and a descriptive error
4. WHEN `maxSize` is outside the range [2, 6], THE API_Endpoint SHALL reject the request with HTTP 400 and a descriptive error
5. WHEN `type` is not one of `bookings`, `favorites`, `transport`, or `categories`, THE API_Endpoint SHALL reject the request with HTTP 400 and a descriptive error
6. WHEN `period` is a negative integer, THE API_Endpoint SHALL reject the request with HTTP 400 and a descriptive error

### Requirement 8: Response Caching

**User Story:** As an administrator, I want repeated requests to return quickly, so that I can adjust filters and explore results without long waits.

#### Acceptance Criteria

1. WHEN a request with identical parameters is made within 5 minutes of the first request, THE API_Endpoint SHALL return the cached result without recomputing
2. WHEN cache TTL of 5 minutes has elapsed, THE API_Endpoint SHALL recompute the analysis with fresh data
3. THE API_Endpoint SHALL construct cache keys from the combination of `type`, `minSupport`, `minConfidence`, and `period` parameters

### Requirement 9: Bundle Recommendations

**User Story:** As an administrator, I want actionable bundle recommendations derived from the rules, so that I can create tourism packages based on data-driven insights.

#### Acceptance Criteria

1. THE Association_Rule_Service SHALL generate bundle recommendations from rules with the highest lift values
2. THE Association_Rule_Service SHALL include place names, confidence, lift, and a human-readable insight string in each recommendation
3. THE Association_Rule_Service SHALL format the insight as a sentence describing how much more likely tourists are to visit the consequent given the antecedent

### Requirement 10: Frontend Visualization

**User Story:** As an administrator, I want to view analysis results through interactive tables and charts, so that I can explore patterns visually.

#### Acceptance Criteria

1. WHEN results are loaded, THE Admin_Dashboard SHALL display a frequent itemsets table showing item names, support percentage, and occurrence count
2. WHEN results are loaded, THE Admin_Dashboard SHALL display an association rules table showing antecedent, consequent, support, confidence, and lift
3. WHEN results are loaded, THE Admin_Dashboard SHALL render a correlation heatmap using Chart.js showing pairwise phi coefficients between places
4. WHEN results are loaded, THE Admin_Dashboard SHALL display bundle recommendations with place names, confidence, lift, and insight text
5. THE Admin_Dashboard SHALL provide input controls for `minSupport`, `minConfidence`, `minLift`, analysis type, and time period
6. WHEN the admin adjusts threshold parameters, THE Admin_Dashboard SHALL re-fetch results with the updated parameters
7. WHEN data is loading, THE Admin_Dashboard SHALL display a loading indicator
8. WHEN insufficient data warning is returned, THE Admin_Dashboard SHALL display the warning message prominently instead of empty charts

### Requirement 11: API Response Structure

**User Story:** As a frontend developer, I want a consistent API response structure, so that the client can reliably parse and display results.

#### Acceptance Criteria

1. THE API_Endpoint SHALL return a JSON response with `success` boolean and `data` object on successful analysis
2. THE API_Endpoint SHALL include `stats` object containing `totalTransactions`, `uniqueItems`, `avgTransactionSize`, `totalRules`, `analysisType`, and `period`
3. THE API_Endpoint SHALL include `frequentItemsets` array where each entry contains `items`, `itemNames`, `support`, and `count`
4. THE API_Endpoint SHALL include `rules` array where each entry contains `antecedent`, `consequent`, `support`, `confidence`, `lift`, and `conviction`
5. THE API_Endpoint SHALL include `correlationMatrix` object with `labels` array and `matrix` 2D array
6. THE API_Endpoint SHALL include `recommendations` array where each entry contains `places`, `confidence`, `lift`, and `insight`
