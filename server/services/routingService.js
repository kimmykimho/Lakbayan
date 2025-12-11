const axios = require('axios');

class RoutingService {
  constructor() {
    this.apiKey = process.env.OPENROUTESERVICE_API_KEY;
    this.baseUrl = 'https://api.openrouteservice.org/v2';
  }

  /**
   * Calculate route between two points
   * @param {Array} start - [longitude, latitude]
   * @param {Array} end - [longitude, latitude]
   * @param {string} profile - driving-car, cycling-regular, foot-walking
   */
  async getRoute(start, end, profile = 'driving-car') {
    try {
      const response = await axios.post(
        `${this.baseUrl}/directions/${profile}/geojson`,
        {
          coordinates: [start, end]
        },
        {
          headers: {
            'Authorization': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      const route = response.data.features[0];
      const properties = route.properties.summary;

      return {
        success: true,
        data: {
          distance: properties.distance, // meters
          duration: properties.duration, // seconds
          geometry: route.geometry,
          distanceKm: (properties.distance / 1000).toFixed(2),
          durationMin: Math.round(properties.duration / 60),
          bounds: route.bbox
        }
      };
    } catch (error) {
      console.error('Routing API Error:', error.message);
      return {
        success: false,
        message: 'Failed to calculate route',
        error: error.message
      };
    }
  }

  /**
   * Calculate matrix (multiple origins to multiple destinations)
   * @param {Array} locations - Array of [longitude, latitude] pairs
   */
  async getMatrix(locations) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/matrix/driving-car`,
        {
          locations: locations,
          metrics: ['distance', 'duration']
        },
        {
          headers: {
            'Authorization': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        data: {
          distances: response.data.distances,
          durations: response.data.durations
        }
      };
    } catch (error) {
      console.error('Matrix API Error:', error.message);
      return {
        success: false,
        message: 'Failed to calculate matrix',
        error: error.message
      };
    }
  }

  /**
   * Calculate fare based on distance and vehicle type
   * @param {number} distanceKm - Distance in kilometers
   * @param {string} vehicleType - tricycle, jeepney, habal, van
   */
  calculateFare(distanceKm, vehicleType) {
    const fareRates = {
      tricycle: {
        base: 15,
        perKm: 10,
        maxBase: 2 // km before additional charges
      },
      jeepney: {
        base: 13,
        perKm: 1.50,
        maxBase: 4
      },
      habal: {
        base: 20,
        perKm: 15,
        maxBase: 1
      },
      van: {
        base: 100,
        perKm: 20,
        maxBase: 0,
        hourlyRate: 500
      }
    };

    const rate = fareRates[vehicleType] || fareRates.tricycle;
    
    let fare = rate.base;
    
    if (distanceKm > rate.maxBase) {
      const extraKm = distanceKm - rate.maxBase;
      fare += Math.ceil(extraKm) * rate.perKm;
    }

    return {
      estimatedFare: Math.round(fare),
      minFare: Math.round(fare * 0.9),
      maxFare: Math.round(fare * 1.2),
      currency: 'PHP',
      vehicleType: vehicleType,
      distance: distanceKm
    };
  }

  /**
   * Get optimized route for multiple waypoints
   * @param {Array} waypoints - Array of [longitude, latitude] pairs
   */
  async getOptimizedRoute(waypoints) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/optimization`,
        {
          jobs: waypoints.map((wp, index) => ({
            id: index,
            location: wp
          })),
          vehicles: [{
            id: 0,
            profile: 'driving-car',
            start: waypoints[0],
            end: waypoints[0]
          }]
        },
        {
          headers: {
            'Authorization': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Optimization API Error:', error.message);
      return {
        success: false,
        message: 'Failed to optimize route',
        error: error.message
      };
    }
  }
}

module.exports = new RoutingService();

