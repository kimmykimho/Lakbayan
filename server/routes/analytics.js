const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../config/supabase');
const { protect, authorize } = require('../middleware/auth');

// Helper function to get date range
function getDateRange(days) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  return { start: start.toISOString(), end: end.toISOString() };
}

// Helper to get day labels for last N days
function getDayLabels(days) {
  const labels = [];
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    labels.push(daysOfWeek[date.getDay()]);
  }
  return labels;
}

// Helper to get month labels
function getMonthLabels(months) {
  const labels = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    labels.push(monthNames[date.getMonth()]);
  }
  return labels;
}

// @route   GET /api/analytics/dashboard
// @desc    Get dashboard statistics with real data
// @access  Private/Admin
router.get('/dashboard', protect, authorize('admin'), async (req, res) => {
  try {
    // Total users (ALL users)
    const { count: totalUsersCount } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true });

    // Count by role
    const { count: touristCount } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'tourist');

    const { count: ownerCount } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'business_owner');

    const { count: driverCount } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'driver');

    const { count: adminCount } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'admin');

    // Total bookings count
    const { count: totalBookingsCount } = await supabaseAdmin
      .from('bookings')
      .select('*', { count: 'exact', head: true });

    // Active places
    const { count: activePlaces } = await supabaseAdmin
      .from('places')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    // Get all places for average rating and category distribution
    const { data: places } = await supabaseAdmin
      .from('places')
      .select('rating, visitors, category');

    const avgRating = places && places.length > 0
      ? places.reduce((sum, p) => sum + (p.rating?.average || 0), 0) / places.length
      : 0;

    const totalVisitorCount = places
      ? places.reduce((sum, p) => sum + (p.visitors?.total || 0), 0)
      : 0;

    // Category distribution from real data
    const categoryCount = {};
    (places || []).forEach(p => {
      const cat = p.category || 'other';
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    });

    // Get weekly visitors/bookings data (last 7 days)
    const { start: weekStart } = getDateRange(7);
    const { data: weeklyBookings } = await supabaseAdmin
      .from('bookings')
      .select('created_at, number_of_visitors')
      .gte('created_at', weekStart)
      .order('created_at', { ascending: true });

    // Aggregate bookings by day
    const dailyData = {};
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      dailyData[dateKey] = { visitors: 0, bookings: 0 };
    }

    (weeklyBookings || []).forEach(b => {
      const dateKey = b.created_at.split('T')[0];
      if (dailyData[dateKey]) {
        dailyData[dateKey].bookings += 1;
        dailyData[dateKey].visitors += b.number_of_visitors || 1;
      }
    });

    const weeklyVisitors = Object.values(dailyData).map(d => d.visitors);
    const weeklyBookingsData = Object.values(dailyData).map(d => d.bookings);

    // Get monthly bookings data (last 6 months)
    const { start: monthStart } = getDateRange(180);
    const { data: monthlyBookings } = await supabaseAdmin
      .from('bookings')
      .select('created_at, number_of_visitors')
      .gte('created_at', monthStart)
      .order('created_at', { ascending: true });

    // Aggregate by month
    const monthlyData = {};
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[monthKey] = { bookings: 0, revenue: 0 };
    }

    (monthlyBookings || []).forEach(b => {
      const date = new Date(b.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].bookings += 1;
        // Estimate revenue per booking (can be adjusted based on actual pricing)
        monthlyData[monthKey].revenue += (b.number_of_visitors || 1) * 50; // ₱50 per visitor estimate
      }
    });

    const monthlyBookingsChart = Object.values(monthlyData).map(d => d.bookings);
    const monthlyRevenueChart = Object.values(monthlyData).map(d => Math.round(d.revenue / 1000)); // In thousands

    // Calculate total revenue
    const totalRevenue = Object.values(monthlyData).reduce((sum, m) => sum + m.revenue, 0);

    // Recent bookings
    const { data: recentBookings } = await supabaseAdmin
      .from('bookings')
      .select(`
        id, status, created_at,
        users!user_id(name),
        places!place_id(name)
      `)
      .order('created_at', { ascending: false })
      .limit(5);

    // Recent reviews
    const { data: recentReviews } = await supabaseAdmin
      .from('reviews')
      .select(`
        id, rating, comment, created_at,
        users!user_id(name),
        places!place_id(name)
      `)
      .order('created_at', { ascending: false })
      .limit(5);

    res.json({
      success: true,
      data: {
        overview: {
          totalUsers: totalUsersCount || 0,
          usersByRole: {
            tourists: touristCount || 0,
            owners: ownerCount || 0,
            drivers: driverCount || 0,
            admins: adminCount || 0
          },
          totalPlaces: activePlaces || 0,
          totalBookings: totalBookingsCount || 0,
          totalVisitors: totalVisitorCount,
          avgRating: avgRating || 0,
          totalRevenue: totalRevenue
        },
        charts: {
          weeklyVisitors: {
            labels: getDayLabels(7),
            data: weeklyVisitors
          },
          weeklyBookings: {
            labels: getDayLabels(7),
            data: weeklyBookingsData
          },
          monthlyBookings: {
            labels: getMonthLabels(6),
            data: monthlyBookingsChart
          },
          monthlyRevenue: {
            labels: getMonthLabels(6),
            data: monthlyRevenueChart
          },
          categoryDistribution: {
            labels: Object.keys(categoryCount).map(c => c.charAt(0).toUpperCase() + c.slice(1)),
            data: Object.values(categoryCount)
          }
        },
        recentBookings: (recentBookings || []).map(b => ({
          _id: b.id,
          user: b.users?.name || 'Unknown',
          place: b.places?.name || 'Unknown',
          date: b.created_at,
          status: b.status || 'pending'
        })),
        recentReviews: (recentReviews || []).map(r => ({
          _id: r.id,
          user: r.users?.name || 'Anonymous',
          place: r.places?.name || 'Unknown',
          rating: r.rating || 0,
          comment: r.comment || '',
          date: r.created_at
        }))
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/analytics/places
// @desc    Get places analytics
// @access  Private/Admin
router.get('/places', protect, authorize('admin'), async (req, res) => {
  try {
    const { data: places, error } = await supabaseAdmin
      .from('places')
      .select('id, name, category, visitors, rating')
      .eq('status', 'active')
      .order('visitors->total', { ascending: false, nullsLast: true })
      .limit(10);

    if (error) throw new Error(error.message);

    res.json({
      success: true,
      data: places
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/analytics/businesses
// @desc    Get business performance
// @access  Private/Admin
router.get('/businesses', protect, authorize('admin'), async (req, res) => {
  try {
    const { data: businesses, error } = await supabaseAdmin
      .from('businesses')
      .select(`
        id, name, type, revenue, rating,
        users!owner_id(name)
      `)
      .eq('status', 'active')
      .order('revenue', { ascending: false });

    if (error) throw new Error(error.message);

    // Format and calculate totals
    const formattedBusinesses = (businesses || []).map(b => ({
      ...b,
      owner: b.users,
      users: undefined
    }));

    const totalRevenue = formattedBusinesses.reduce((sum, b) => sum + (b.revenue || 0), 0);
    const avgRating = formattedBusinesses.length > 0
      ? formattedBusinesses.reduce((sum, b) => sum + (b.rating?.average || 0), 0) / formattedBusinesses.length
      : 0;

    res.json({
      success: true,
      data: {
        businesses: formattedBusinesses,
        summary: {
          totalBusinesses: formattedBusinesses.length,
          totalRevenue,
          avgRating: avgRating.toFixed(1)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
