// Load environment variables FIRST before any other imports
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// Supabase connection (needs env vars, so must come after dotenv)
const { supabase, testConnection } = require('./config/supabase');

const app = express();

// CORS configuration - allow multiple origins
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.CLIENT_URL,
  'https://tj4g10w9-5173.asse.devtunnels.ms'
].filter(Boolean);

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('⚠️ CORS blocked origin:', origin);
      callback(null, true); // For development, allow anyway but log
    }
  },
  credentials: true
}));
// Increase payload size limit for image uploads (50MB)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static('uploads'));

// Trust proxy for dev tunnels and production proxies
app.set('trust proxy', 1);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  validate: { xForwardedForHeader: false } // Disable X-Forwarded-For validation for dev tunnels
});
app.use('/api/', limiter);

// Test Supabase connection on startup
testConnection();

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/places', require('./routes/places'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/businesses', require('./routes/businesses'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/events', require('./routes/events'));
app.use('/api/transport', require('./routes/transport'));
app.use('/api/transport-requests', require('./routes/transport-requests'));
app.use('/api/favorites', require('./routes/favorites'));
app.use('/api/owners', require('./routes/owners'));
app.use('/api/drivers', require('./routes/drivers'));
app.use('/api/password', require('./routes/password'));
app.use('/api/chatbot', require('./routes/chatbot'));
app.use('/api/about', require('./routes/about'));
app.use('/api', require('./routes/api'));

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const { data, error } = await supabase.from('users').select('count').limit(1);
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      database: error ? 'tables not ready' : 'connected'
    });
  } catch (err) {
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      database: 'error'
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 API: http://localhost:${PORT}/api`);
  console.log(`🗄️ Database: Supabase PostgreSQL`);
});
