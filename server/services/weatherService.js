const axios = require('axios');

class WeatherService {
  constructor() {
    this.apiKey = process.env.OPENWEATHER_API_KEY;
    this.baseUrl = 'https://api.openweathermap.org/data/2.5';
  }

  /**
   * Get current weather by coordinates
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   */
  async getCurrentWeather(lat, lon) {
    try {
      const response = await axios.get(`${this.baseUrl}/weather`, {
        params: {
          lat,
          lon,
          appid: this.apiKey,
          units: 'metric'
        }
      });

      return {
        success: true,
        data: {
          temperature: Math.round(response.data.main.temp),
          feelsLike: Math.round(response.data.main.feels_like),
          humidity: response.data.main.humidity,
          description: response.data.weather[0].description,
          main: response.data.weather[0].main,
          icon: response.data.weather[0].icon,
          windSpeed: response.data.wind.speed,
          pressure: response.data.main.pressure,
          visibility: response.data.visibility,
          sunrise: response.data.sys.sunrise,
          sunset: response.data.sys.sunset
        }
      };
    } catch (error) {
      console.error('Weather API Error:', error.message);
      return {
        success: false,
        message: 'Failed to fetch weather data',
        error: error.message
      };
    }
  }

  /**
   * Get weather forecast (5 day / 3 hour)
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   */
  async getForecast(lat, lon) {
    try {
      const response = await axios.get(`${this.baseUrl}/forecast`, {
        params: {
          lat,
          lon,
          appid: this.apiKey,
          units: 'metric'
        }
      });

      return {
        success: true,
        data: response.data.list.map(item => ({
          timestamp: item.dt,
          temperature: Math.round(item.main.temp),
          description: item.weather[0].description,
          icon: item.weather[0].icon,
          humidity: item.main.humidity,
          windSpeed: item.wind.speed
        }))
      };
    } catch (error) {
      console.error('Forecast API Error:', error.message);
      return {
        success: false,
        message: 'Failed to fetch forecast data',
        error: error.message
      };
    }
  }

  /**
   * Get weather recommendations
   */
  getWeatherRecommendations(weather) {
    const temp = weather.temperature;
    const main = weather.main.toLowerCase();
    
    const recommendations = [];

    // Temperature-based
    if (temp > 32) {
      recommendations.push({
        type: 'hot',
        icon: '🌡️',
        message: 'Very hot! Visit waterfalls or beaches for a cool escape.',
        suggestedPlaces: ['beach', 'waterfalls']
      });
    } else if (temp > 28) {
      recommendations.push({
        type: 'warm',
        icon: '☀️',
        message: 'Perfect weather! Great time for outdoor activities.',
        suggestedPlaces: ['nature', 'hiking']
      });
    } else if (temp < 24) {
      recommendations.push({
        type: 'cool',
        icon: '🌤️',
        message: 'Cool weather! Ideal for mountain viewdecks.',
        suggestedPlaces: ['viewdeck', 'mountains']
      });
    }

    // Weather condition-based
    if (main.includes('rain')) {
      recommendations.push({
        type: 'rain',
        icon: '🌧️',
        message: 'Rainy weather. Visit indoor attractions or covered areas.',
        suggestedPlaces: ['cultural', 'indoor']
      });
    } else if (main.includes('clear')) {
      recommendations.push({
        type: 'clear',
        icon: '☀️',
        message: 'Clear skies! Perfect for photography and sightseeing.',
        suggestedPlaces: ['viewdeck', 'nature', 'beach']
      });
    }

    return recommendations;
  }
}

module.exports = new WeatherService();

