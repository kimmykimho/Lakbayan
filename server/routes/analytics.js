const express = require('express');
const router = express.Router();
const { queryAll, queryOne, query } = require('../config/neon');
const { protect, authorize } = require('../middleware/auth');

function getDateRange(days) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  return { start: start.toISOString(), end: end.toISOString() };
}

function getDayLabels(days) {
  const labels = [];
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  // Generate labels for the last 'days' days, ending today
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    labels.push(daysOfWeek[date.getDay()]);
  }
  return labels;
}

// @route   GET /api/analytics/dashboard
// @desc    Get dashboard statistics
// @access  Private/Admin
router.get('/dashboard', protect, authorize('admin'), async (req, res) => {
  try {
    // Get user counts
    const totalUsers = await queryOne('SELECT COUNT(*) as count FROM users');
    const touristCount = await queryOne("SELECT COUNT(*) as count FROM users WHERE role = 'tourist'");
    const ownerCount = await queryOne("SELECT COUNT(*) as count FROM users WHERE role = 'business_owner'");
    const driverCount = await queryOne("SELECT COUNT(*) as count FROM users WHERE role = 'driver'");

    // Get place and booking stats
    const totalPlaces = await queryOne("SELECT COUNT(*) as count FROM places WHERE status = 'active'");
    const totalBookings = await queryOne('SELECT COUNT(*) as count FROM bookings');
    const totalReviews = await queryOne('SELECT COUNT(*) as count FROM reviews');

    // Get visitors and revenue from places
    const visitorStats = await queryOne("SELECT COALESCE(SUM((visitors->>'total')::int), 0) as total_visitors FROM places");
    const avgRating = await queryOne("SELECT COALESCE(AVG((rating->>'average')::float), 0) as avg FROM places");

    // Estimate total revenue: Sum of (booking.visitors * place.pricing.entryFee)
    // Note: This is an estimation as not all bookings might be paid or pricing might have changed.
    const revenueStats = await queryOne(`
        SELECT SUM(
            COALESCE(b.number_of_visitors, 1) * 
            COALESCE((p.pricing->>'entranceFee')::int, 0)
        ) as total_revenue
        FROM bookings b
        JOIN places p ON b.place_id = p.id
        WHERE b.status IN ('confirmed', 'completed')
    `);
    const totalRevenue = parseInt(revenueStats?.total_revenue || 0);

    // Get recent bookings
    const recentBookings = await queryAll(
      `SELECT b.*, u.name as user_name, u.email as user_email, p.name as place_name 
       FROM bookings b 
       LEFT JOIN users u ON b.user_id = u.id 
       LEFT JOIN places p ON b.place_id = p.id 
       ORDER BY b.created_at DESC LIMIT 5`
    );

    // Get recent reviews
    const recentReviews = await queryAll(
      `SELECT r.*, u.name as user_name, p.name as place_name 
       FROM reviews r 
       LEFT JOIN users u ON r.user_id = u.id 
       LEFT JOIN places p ON r.place_id = p.id 
       ORDER BY r.created_at DESC LIMIT 5`
    );

    // --- REAL CHART DATA ---
    const days = 7;
    const labels = getDayLabels(days);

    // Initialize data arrays with 0
    const weeklyVisitorsData = new Array(days).fill(0);
    const weeklyBookingsData = new Array(days).fill(0);

    // Fetch daily stats for the last 7 days
    const dailyStats = await queryAll(`
        SELECT 
            DATE(created_at) as date,
            COUNT(*) as booking_count,
            SUM(number_of_visitors) as visitor_count
        FROM bookings 
        WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY DATE(created_at)
    `);

    // Map DB results to the correct index in our arrays
    // We iterate backwards from today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    dailyStats.forEach(stat => {
      const statDate = new Date(stat.date);
      statDate.setHours(0, 0, 0, 0);

      // Calculate difference in days from today
      const diffTime = Math.abs(today - statDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // If within range (0 to 6 days ago)
      if (diffDays < days) {
        // Index 6 is today, 5 is yesterday... 0 is 6 days ago
        const index = (days - 1) - diffDays;
        if (index >= 0 && index < days) {
          weeklyBookingsData[index] = parseInt(stat.booking_count);
          weeklyVisitorsData[index] = parseInt(stat.visitor_count || 0);
        }
      }
    });

    res.json({
      success: true,
      data: {
        overview: {
          totalUsers: parseInt(totalUsers?.count) || 0,
          totalPlaces: parseInt(totalPlaces?.count) || 0,
          totalBookings: parseInt(totalBookings?.count) || 0,
          totalReviews: parseInt(totalReviews?.count) || 0,
          totalVisitors: parseInt(visitorStats?.total_visitors) || 0,
          avgRating: parseFloat(avgRating?.avg) || 0,
          totalRevenue: totalRevenue,
          usersByRole: {
            tourists: parseInt(touristCount?.count) || 0,
            owners: parseInt(ownerCount?.count) || 0,
            drivers: parseInt(driverCount?.count) || 0
          }
        },
        recentBookings: recentBookings || [],
        recentReviews: recentReviews || [],
        charts: {
          weeklyVisitors: {
            labels: labels,
            data: weeklyVisitorsData
          },
          weeklyBookings: {
            labels: labels,
            data: weeklyBookingsData
          }
        }
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/analytics/bookings
// @desc    Get booking analytics
// @access  Private/Admin
router.get('/bookings', protect, authorize('admin'), async (req, res) => {
  try {
    const { period = '7' } = req.query;
    const { start, end } = getDateRange(parseInt(period));

    const bookings = await queryAll(
      `SELECT * FROM bookings WHERE created_at >= $1 AND created_at <= $2`,
      [start, end]
    );

    const statusCounts = await queryAll(
      `SELECT status, COUNT(*) as count FROM bookings GROUP BY status`
    );

    res.json({
      success: true,
      data: {
        total: bookings.length,
        byStatus: statusCounts.reduce((acc, s) => ({ ...acc, [s.status]: parseInt(s.count) }), {})
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/analytics/places
// @desc    Get places analytics
// @access  Private/Admin
router.get('/places', protect, authorize('admin'), async (req, res) => {
  try {
    const places = await queryAll('SELECT id, name, category, rating, status FROM places');
    const byCategory = await queryAll('SELECT category, COUNT(*) as count FROM places GROUP BY category');

    res.json({
      success: true,
      data: {
        total: places.length,
        byCategory: byCategory.reduce((acc, c) => ({ ...acc, [c.category]: parseInt(c.count) }), {})
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/analytics/users
// @desc    Get users analytics
// @access  Private/Admin
router.get('/users', protect, authorize('admin'), async (req, res) => {
  try {
    const byRole = await queryAll('SELECT role, COUNT(*) as count FROM users GROUP BY role');
    const totalActive = await queryOne('SELECT COUNT(*) as count FROM users WHERE is_active = true');

    res.json({
      success: true,
      data: {
        byRole: byRole.reduce((acc, r) => ({ ...acc, [r.role]: parseInt(r.count) }), {}),
        totalActive: parseInt(totalActive.count) || 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/analytics/overview
// @desc    Get overview stats
// @access  Private/Admin
router.get('/overview', protect, authorize('admin'), async (req, res) => {
  try {
    const users = await queryOne('SELECT COUNT(*) as count FROM users');
    const places = await queryOne('SELECT COUNT(*) as count FROM places');
    const bookings = await queryOne('SELECT COUNT(*) as count FROM bookings');
    const reviews = await queryOne('SELECT COUNT(*) as count FROM reviews');

    res.json({
      success: true,
      data: {
        users: parseInt(users.count) || 0,
        places: parseInt(places.count) || 0,
        bookings: parseInt(bookings.count) || 0,
        reviews: parseInt(reviews.count) || 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/analytics/generate-report
// @desc    Generate AI analytics report
// @access  Private/Admin
router.post('/generate-report', protect, authorize('admin'), async (req, res) => {
  try {
    const { period = '7' } = req.body;

    // Get summary data for report
    const totalUsers = await queryOne('SELECT COUNT(*) as count FROM users');
    const totalPlaces = await queryOne("SELECT COUNT(*) as count FROM places WHERE status = 'active'");
    const totalBookings = await queryOne('SELECT COUNT(*) as count FROM bookings');
    const avgRating = await queryOne("SELECT COALESCE(AVG((rating->>'average')::float), 0) as avg FROM places");

    // Get top performing place
    const topPlace = await queryOne(`
        SELECT p.name, COUNT(b.id) as booking_count 
        FROM bookings b 
        JOIN places p ON b.place_id = p.id 
        GROUP BY p.name 
        ORDER BY booking_count DESC 
        LIMIT 1
    `);

    // Generate dynamic report with REAL insights
    // In a real scenario, this would call an AI service. Here we construct a smart template.
    const report = {
      title: `Analytics Report - Last ${period} Days`,
      generatedAt: new Date().toISOString(),
      dataSnapshot: {
        totalUsers: parseInt(totalUsers?.count || 0),
        totalPlaces: parseInt(totalPlaces?.count || 0),
        totalBookings: parseInt(totalBookings?.count || 0),
        avgRating: parseFloat(avgRating?.avg || 0).toFixed(1)
      },
      report: `EXECUTIVE SUMMARY\n` +
        `The Lakbayan sa Kitcharao platform is currently serving ${totalUsers?.count || 0} users with ${totalPlaces?.count || 0} active destinations. ` +
        `Engagement is healthy with a total of ${totalBookings?.count || 0} bookings processed to date. The average user rating across all places is ${parseFloat(avgRating?.avg || 0).toFixed(1)} stars.\n\n` +

        `USER ENGAGEMENT\n` +
        `Recent activity shows consistent user interest. ` +
        (topPlace ? `The most popular destination by booking volume is "${topPlace.name}", indicating a strong preference for this type of attraction. ` : `Booking data is accumulating across various destinations. `) +
        `User base growth is being driven by both tourists and local business owners joining the platform.\n\n` +

        `OPERATIONAL INSIGHTS\n` +
        `• Booking Fulfillment: Ensure drivers are available to match the booking demand, especially during weekends.\n` +
        `• Content Quality: High-rated places typically have detailed descriptions and multiple photos. Encourage lower-rated places to improve their profiles.\n` +
        `• Revenue Opportunities: Promoting under-utilized places through "Featured" status could balance visitor distribution.\n\n` +

        `RECOMMENDATIONS\n` +
        `1. Marketing: Launch a campaign highlighting "${topPlace ? topPlace.name : 'hidden gems'}" to capitalize on current trends.\n` +
        `2. Driver Recruitment: Verify if transport request fulfillment matches booking times to prevent cancellations.\n` +
        `3. Feedback Loop: actively solicit reviews from users with completed bookings to boost social proof.`
    };

    res.json({ success: true, data: report });
  } catch (error) {
    console.error('Generate report error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/analytics/export/csv
// @desc    Export analytics data as CSV
// @access  Private/Admin
router.get('/export/csv', protect, authorize('admin'), async (req, res) => {
  try {
    const { type = 'bookings' } = req.query;

    let data = [];
    let headers = '';

    if (type === 'bookings') {
      data = await queryAll(`
        SELECT b.id, b.status, b.visit_date, b.number_of_visitors, 
               u.name as user_name, p.name as place_name, b.created_at
        FROM bookings b
        LEFT JOIN users u ON b.user_id = u.id
        LEFT JOIN places p ON b.place_id = p.id
        ORDER BY b.created_at DESC
      `);
      headers = 'ID,Status,Visit Date,Visitors,User,Place,Created At\n';
    } else if (type === 'users') {
      data = await queryAll('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC');
      headers = 'ID,Name,Email,Role,Created At\n';
    } else if (type === 'places') {
      data = await queryAll('SELECT id, name, category, status, rating, created_at FROM places ORDER BY created_at DESC');
      headers = 'ID,Name,Category,Status,Rating,Created At\n';
    }

    let csv = headers;
    data.forEach(row => {
      // Escape CSV values
      const rowValues = Object.values(row).map(v => {
        if (v === null || v === undefined) return '';
        const str = String(v).replace(/"/g, '""'); // Escape double quotes
        return `"${str}"`;
      });
      csv += rowValues.join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${type}_export.csv`);
    res.send(csv);
  } catch (error) {
    console.error('CSV export error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
