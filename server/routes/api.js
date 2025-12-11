const express = require('express');
const router = express.Router();
const weatherService = require('../services/weatherService');
const routingService = require('../services/routingService');
const placesService = require('../services/placesService');

// @route   GET /api/external/weather
// @desc    Get current weather
// @access  Public
router.get('/external/weather', async (req, res) => {
  try {
    const { lat, lon } = req.query;
    
    if (!lat || !lon) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const weather = await weatherService.getCurrentWeather(
      parseFloat(lat),
      parseFloat(lon)
    );

    if (weather.success) {
      // Add recommendations
      weather.data.recommendations = weatherService.getWeatherRecommendations(weather.data);
    }

    res.json(weather);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/external/forecast
// @desc    Get weather forecast
// @access  Public
router.get('/external/forecast', async (req, res) => {
  try {
    const { lat, lon } = req.query;
    
    if (!lat || !lon) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const forecast = await weatherService.getForecast(
      parseFloat(lat),
      parseFloat(lon)
    );

    res.json(forecast);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/external/route
// @desc    Calculate route between two points
// @access  Public
router.post('/external/route', async (req, res) => {
  try {
    const { start, end, profile } = req.body;
    
    if (!start || !end) {
      return res.status(400).json({
        success: false,
        message: 'Start and end coordinates are required'
      });
    }

    const route = await routingService.getRoute(start, end, profile);

    // Add fare estimation for different vehicle types
    if (route.success) {
      route.data.fareEstimates = {
        tricycle: routingService.calculateFare(route.data.distanceKm, 'tricycle'),
        jeepney: routingService.calculateFare(route.data.distanceKm, 'jeepney'),
        habal: routingService.calculateFare(route.data.distanceKm, 'habal'),
        van: routingService.calculateFare(route.data.distanceKm, 'van')
      };
    }

    res.json(route);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/external/calculate-fare
// @desc    Calculate fare for a specific vehicle type
// @access  Public
router.post('/external/calculate-fare', async (req, res) => {
  try {
    const { distance, vehicleType } = req.body;
    
    if (!distance || !vehicleType) {
      return res.status(400).json({
        success: false,
        message: 'Distance and vehicle type are required'
      });
    }

    const fare = routingService.calculateFare(parseFloat(distance), vehicleType);

    res.json({
      success: true,
      data: fare
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/external/nearby
// @desc    Search nearby places using Foursquare
// @access  Public
router.get('/external/nearby', async (req, res) => {
  try {
    const { lat, lng, category, radius } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const places = await placesService.searchNearby(
      parseFloat(lat),
      parseFloat(lng),
      category,
      radius ? parseInt(radius) : 5000
    );

    res.json(places);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/external/place/:fsqId
// @desc    Get Foursquare place details
// @access  Public
router.get('/external/place/:fsqId', async (req, res) => {
  try {
    const details = await placesService.getPlaceDetails(req.params.fsqId);
    res.json(details);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/external/trending
// @desc    Get trending places
// @access  Public
router.get('/external/trending', async (req, res) => {
  try {
    const { lat, lng } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const trending = await placesService.getTrending(
      parseFloat(lat),
      parseFloat(lng)
    );

    res.json(trending);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;

