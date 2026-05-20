/**
 * TransactionBuilder
 * Transforms raw database records into transaction format suitable for association rule mining.
 * Each transaction represents a single user's set of interacted places.
 */

const { queryAll } = require('../../config/neon');

class TransactionBuilder {
  /**
   * Build transactions from booking data.
   * Groups all places booked by the same user into one transaction.
   * @param {Object} options
   * @param {number} [options.minDays=0] - Only include bookings from last N days (0 = all)
   * @param {string[]} [options.statuses] - Filter by booking status
   * @returns {Promise<Transaction[]>}
   */
  async buildFromBookings(options = {}) {
    const { minDays = 0, statuses = ['confirmed', 'completed'] } = options;

    let sql = `
      SELECT 
        b.user_id,
        array_agg(DISTINCT b.place_id::text) AS place_ids,
        json_object_agg(DISTINCT b.place_id::text, p.name) AS item_names
      FROM bookings b
      JOIN places p ON p.id = b.place_id
      WHERE b.status = ANY($1)
    `;
    const params = [statuses];

    if (minDays > 0) {
      sql += ` AND b.created_at >= NOW() - INTERVAL '1 day' * $2`;
      params.push(minDays);
    }

    sql += `
      GROUP BY b.user_id
      HAVING COUNT(DISTINCT b.place_id) >= 2
    `;

    const rows = await queryAll(sql, params);

    return rows.map(row => ({
      userId: row.user_id,
      items: row.place_ids,
      itemNames: row.item_names
    }));
  }

  /**
   * Build transactions from user favorites.
   * Each user's complete favorite list is one transaction.
   * @returns {Promise<Transaction[]>}
   */
  async buildFromFavorites() {
    const sql = `
      SELECT 
        uf.user_id,
        array_agg(DISTINCT uf.place_id::text) AS place_ids,
        json_object_agg(DISTINCT uf.place_id::text, p.name) AS item_names
      FROM user_favorites uf
      JOIN places p ON p.id = uf.place_id
      GROUP BY uf.user_id
      HAVING COUNT(DISTINCT uf.place_id) >= 2
    `;

    const rows = await queryAll(sql);

    return rows.map(row => ({
      userId: row.user_id,
      items: row.place_ids,
      itemNames: row.item_names
    }));
  }

  /**
   * Build transactions from transport requests.
   * Groups pickup/destination place correlations per user.
   * Extracts place references from pickup/destination JSONB fields and resolves to place IDs via name matching.
   * @returns {Promise<Transaction[]>}
   */
  async buildFromTransport() {
    // Extract place names from pickup/destination JSONB, then match to places table
    const sql = `
      WITH transport_places AS (
        SELECT 
          tr.user_id,
          p.id::text AS place_id,
          p.name
        FROM transport_requests tr
        JOIN places p ON (
          p.name = tr.pickup->>'placeName'
          OR p.name = tr.destination->>'placeName'
        )
        WHERE tr.status != 'cancelled'
      )
      SELECT 
        user_id,
        array_agg(DISTINCT place_id) AS place_ids,
        json_object_agg(DISTINCT place_id, name) AS item_names
      FROM transport_places
      GROUP BY user_id
      HAVING COUNT(DISTINCT place_id) >= 2
    `;

    const rows = await queryAll(sql);

    return rows.map(row => ({
      userId: row.user_id,
      items: row.place_ids,
      itemNames: row.item_names
    }));
  }

  /**
   * Build category-level transactions.
   * Resolves place IDs to their category labels before grouping.
   * @param {string} sourceType - 'bookings' | 'favorites' | 'transport'
   * @returns {Promise<Transaction[]>}
   */
  async buildCategoryTransactions(sourceType) {
    let sql;

    if (sourceType === 'bookings') {
      sql = `
        SELECT 
          b.user_id,
          array_agg(DISTINCT p.category) AS place_ids,
          json_object_agg(DISTINCT p.category, p.category) AS item_names
        FROM bookings b
        JOIN places p ON p.id = b.place_id
        WHERE b.status IN ('confirmed', 'completed')
        GROUP BY b.user_id
        HAVING COUNT(DISTINCT p.category) >= 2
      `;
    } else if (sourceType === 'favorites') {
      sql = `
        SELECT 
          uf.user_id,
          array_agg(DISTINCT p.category) AS place_ids,
          json_object_agg(DISTINCT p.category, p.category) AS item_names
        FROM user_favorites uf
        JOIN places p ON p.id = uf.place_id
        GROUP BY uf.user_id
        HAVING COUNT(DISTINCT p.category) >= 2
      `;
    } else if (sourceType === 'transport') {
      sql = `
        WITH transport_categories AS (
          SELECT 
            tr.user_id,
            p.category
          FROM transport_requests tr
          JOIN places p ON (
            p.name = tr.pickup->>'placeName'
            OR p.name = tr.destination->>'placeName'
          )
          WHERE tr.status != 'cancelled'
        )
        SELECT 
          user_id,
          array_agg(DISTINCT category) AS place_ids,
          json_object_agg(DISTINCT category, category) AS item_names
        FROM transport_categories
        GROUP BY user_id
        HAVING COUNT(DISTINCT category) >= 2
      `;
    } else {
      throw new Error(`Invalid sourceType for category transactions: ${sourceType}`);
    }

    const rows = await queryAll(sql);

    return rows.map(row => ({
      userId: row.user_id,
      items: row.place_ids,
      itemNames: row.item_names
    }));
  }
}

module.exports = TransactionBuilder;
