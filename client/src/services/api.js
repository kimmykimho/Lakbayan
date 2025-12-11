import axios from 'axios'

// Determine the API URL based on current hostname
const getApiUrl = () => {
  // If running on dev tunnel, use the corresponding backend tunnel
  // Replace the frontend port (5173) with backend port (5000) in the tunnel URL
  if (window.location.hostname.includes('devtunnels.ms')) {
    // Dev tunnel format: https://xxx-5173.asse.devtunnels.ms
    // Change to: https://xxx-5000.asse.devtunnels.ms
    const tunnelUrl = window.location.origin.replace('-5173.', '-5000.')
    console.log('📡 Using dev tunnel API:', tunnelUrl + '/api')
    return tunnelUrl + '/api'
  }

  // Default to localhost or env variable
  return import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
}

const api = axios.create({
  baseURL: getApiUrl(),
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor - get token from Supabase (OAuth) or localStorage fallback
api.interceptors.request.use(
  async (config) => {
    try {
      // Try Supabase session (for Google OAuth)
      const { supabase } = await import('../config/supabase')
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`
        return config
      }

      // Fallback to stored token from Zustand
      const authStorage = localStorage.getItem('auth-storage')
      if (authStorage) {
        const parsed = JSON.parse(authStorage)
        const token = parsed?.state?.token
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
      }
    } catch (error) {
      console.error('Error getting token:', error)
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor - handle token expiration with automatic retry
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // If token expired and we haven't retried yet
    if (
      error.response?.status === 401 &&
      error.response?.data?.error === 'id-token-expired' &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true

      try {
        // Try to refresh Supabase session
        const { supabase } = await import('../config/supabase')
        const { data: { session }, error: refreshError } = await supabase.auth.refreshSession()

        if (session?.access_token && !refreshError) {
          console.log('🔄 Token refreshed, retrying request')
          originalRequest.headers.Authorization = `Bearer ${session.access_token}`
          return api(originalRequest)
        }
      } catch (refreshError) {
        console.error('❌ Token refresh failed:', refreshError)
        localStorage.removeItem('auth-storage')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    // For other 401 errors or if retry failed
    if (error.response?.status === 401 && originalRequest._retry) {
      localStorage.removeItem('auth-storage')
      window.location.href = '/login'
    }

    return Promise.reject(error)
  }
)

export default api
