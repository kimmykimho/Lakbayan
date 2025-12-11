const axios = require('axios');

class PlacesService {
  constructor() {
    this.apiKey = process.env.FOURSQUARE_API_KEY;
    this.baseUrl = 'https://api.foursquare.com/v3/places';
  }

  /**
   * Search for nearby places
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @param {string} category - Place category
   * @param {number} radius - Search radius in meters (default: 5000)
   */
  async searchNearby(lat, lng, category = null, radius = 5000) {
    try {
      const params = {
        ll: `${lat},${lng}`,
        radius: radius,
        limit: 50
      };

      if (category) {
        params.categories = category;
      }

      const response = await axios.get(`${this.baseUrl}/search`, {
        params: params,
        headers: {
          'Authorization': this.apiKey,
          'Accept': 'application/json'
        }
      });

      return {
        success: true,
        data: response.data.results.map(place => ({
          foursquareId: place.fsq_id,
          name: place.name,
          location: {
            address: place.location.address || '',
            city: place.location.locality || '',
            coordinates: {
              lat: place.geocodes.main.latitude,
              lng: place.geocodes.main.longitude
            }
          },
          categories: place.categories.map(cat => ({
            id: cat.id,
            name: cat.name,
            icon: cat.icon
          })),
          distance: place.distance
        }))
      };
    } catch (error) {
      console.error('Foursquare API Error:', error.message);
      return {
        success: false,
        message: 'Failed to search nearby places',
        error: error.message
      };
    }
  }

  /**
   * Get place details
   * @param {string} fsqId - Foursquare place ID
   */
  async getPlaceDetails(fsqId) {
    try {
      const response = await axios.get(`${this.baseUrl}/${fsqId}`, {
        headers: {
          'Authorization': this.apiKey,
          'Accept': 'application/json'
        }
      });

      const place = response.data;

      return {
        success: true,
        data: {
          id: place.fsq_id,
          name: place.name,
          description: place.description || '',
          location: {
            address: place.location.address || '',
            city: place.location.locality || '',
            coordinates: {
              lat: place.geocodes.main.latitude,
              lng: place.geocodes.main.longitude
            }
          },
          categories: place.categories,
          hours: place.hours,
          rating: place.rating,
          photos: place.photos?.map(photo => ({
            url: `${photo.prefix}original${photo.suffix}`,
            width: photo.width,
            height: photo.height
          })) || [],
          website: place.website,
          tel: place.tel
        }
      };
    } catch (error) {
      console.error('Foursquare Details API Error:', error.message);
      return {
        success: false,
        message: 'Failed to get place details',
        error: error.message
      };
    }
  }

  /**
   * Get popular categories for Foursquare
   */
  getCategories() {
    return {
      tourist_attraction: '16000',
      beach: '16001',
      mountain: '16019',
      park: '16026',
      restaurant: '13065',
      cafe: '13035',
      hotel: '19014',
      shopping: '17000',
      cultural: '10000',
      entertainment: '10000'
    };
  }

  /**
   * Discover trending places
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   */
  async getTrending(lat, lng) {
    try {
      const response = await axios.get(`${this.baseUrl}/search`, {
        params: {
          ll: `${lat},${lng}`,
          radius: 10000,
          sort: 'POPULARITY',
          limit: 20
        },
        headers: {
          'Authorization': this.apiKey,
          'Accept': 'application/json'
        }
      });

      return {
        success: true,
        data: response.data.results
      };
    } catch (error) {
      console.error('Foursquare Trending API Error:', error.message);
      return {
        success: false,
        message: 'Failed to get trending places',
        error: error.message
      };
    }
  }
}

module.exports = new PlacesService();

