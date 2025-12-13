/**
 * Global Data Cache Store
 * Caches API responses to prevent re-fetching on navigation
 * Covers: Places, About, Users, Drivers, Owners, Bookings, Favorites, Transport, Weather
 */
import { create } from 'zustand'

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000

const useDataCache = create((set, get) => ({
    // ============ PUBLIC DATA ============
    // Places cache
    places: null,
    placesTimestamp: null,
    placesLoading: false,

    // About items cache
    aboutItems: null,
    aboutItemsTimestamp: null,
    aboutItemsLoading: false,

    // Featured places cache
    featuredPlaces: null,
    featuredPlacesTimestamp: null,

    // Weather cache
    weather: null,
    weatherTimestamp: null,

    // Transport/Drivers cache (public list)
    availableDrivers: null,
    driversTimestamp: null,

    // ============ USER DATA ============
    // User favorites cache
    favorites: null,
    favoritesTimestamp: null,

    // User bookings cache
    bookings: null,
    bookingsTimestamp: null,

    // User profile cache
    userProfile: null,
    userProfileTimestamp: null,

    // ============ ADMIN DATA ============
    // Users list cache
    users: null,
    usersTimestamp: null,

    // Owners list cache
    owners: null,
    ownersTimestamp: null,

    // Drivers list cache (admin)
    adminDrivers: null,
    adminDriversTimestamp: null,

    // Reviews cache
    reviews: null,
    reviewsTimestamp: null,

    // Analytics cache
    analytics: null,
    analyticsTimestamp: null,

    // ============ ITEM DETAILS CACHE ============
    // Cache individual items by ID
    placeDetails: {},
    aboutDetails: {},

    // ============ HELPER FUNCTIONS ============
    isCacheValid: (timestamp) => {
        if (!timestamp) return false
        return Date.now() - timestamp < CACHE_DURATION
    },

    // ============ PUBLIC DATA ACTIONS ============
    setPlaces: (data) => set({
        places: data,
        placesTimestamp: Date.now(),
        placesLoading: false
    }),
    setPlacesLoading: (loading) => set({ placesLoading: loading }),
    getPlaces: () => {
        const state = get()
        if (state.isCacheValid(state.placesTimestamp)) {
            return state.places
        }
        return null
    },

    setAboutItems: (data) => set({
        aboutItems: data,
        aboutItemsTimestamp: Date.now(),
        aboutItemsLoading: false
    }),
    setAboutItemsLoading: (loading) => set({ aboutItemsLoading: loading }),
    getAboutItems: () => {
        const state = get()
        if (state.isCacheValid(state.aboutItemsTimestamp)) {
            return state.aboutItems
        }
        return null
    },

    setFeaturedPlaces: (data) => set({
        featuredPlaces: data,
        featuredPlacesTimestamp: Date.now()
    }),
    getFeaturedPlaces: () => {
        const state = get()
        if (state.isCacheValid(state.featuredPlacesTimestamp)) {
            return state.featuredPlaces
        }
        return null
    },

    setWeather: (data) => set({
        weather: data,
        weatherTimestamp: Date.now()
    }),
    getWeather: () => {
        const state = get()
        if (state.isCacheValid(state.weatherTimestamp)) {
            return state.weather
        }
        return null
    },

    setAvailableDrivers: (data) => set({
        availableDrivers: data,
        driversTimestamp: Date.now()
    }),
    getAvailableDrivers: () => {
        const state = get()
        if (state.isCacheValid(state.driversTimestamp)) {
            return state.availableDrivers
        }
        return null
    },

    // ============ USER DATA ACTIONS ============
    setFavorites: (data) => set({
        favorites: data,
        favoritesTimestamp: Date.now()
    }),
    getFavorites: () => {
        const state = get()
        if (state.isCacheValid(state.favoritesTimestamp)) {
            return state.favorites
        }
        return null
    },

    setBookings: (data) => set({
        bookings: data,
        bookingsTimestamp: Date.now()
    }),
    getBookings: () => {
        const state = get()
        if (state.isCacheValid(state.bookingsTimestamp)) {
            return state.bookings
        }
        return null
    },

    setUserProfile: (data) => set({
        userProfile: data,
        userProfileTimestamp: Date.now()
    }),
    getUserProfile: () => {
        const state = get()
        if (state.isCacheValid(state.userProfileTimestamp)) {
            return state.userProfile
        }
        return null
    },

    // ============ ADMIN DATA ACTIONS ============
    setUsers: (data) => set({
        users: data,
        usersTimestamp: Date.now()
    }),
    getUsers: () => {
        const state = get()
        if (state.isCacheValid(state.usersTimestamp)) {
            return state.users
        }
        return null
    },

    setOwners: (data) => set({
        owners: data,
        ownersTimestamp: Date.now()
    }),
    getOwners: () => {
        const state = get()
        if (state.isCacheValid(state.ownersTimestamp)) {
            return state.owners
        }
        return null
    },

    setAdminDrivers: (data) => set({
        adminDrivers: data,
        adminDriversTimestamp: Date.now()
    }),
    getAdminDrivers: () => {
        const state = get()
        if (state.isCacheValid(state.adminDriversTimestamp)) {
            return state.adminDrivers
        }
        return null
    },

    setReviews: (data) => set({
        reviews: data,
        reviewsTimestamp: Date.now()
    }),
    getReviews: () => {
        const state = get()
        if (state.isCacheValid(state.reviewsTimestamp)) {
            return state.reviews
        }
        return null
    },

    setAnalytics: (data) => set({
        analytics: data,
        analyticsTimestamp: Date.now()
    }),
    getAnalytics: () => {
        const state = get()
        if (state.isCacheValid(state.analyticsTimestamp)) {
            return state.analytics
        }
        return null
    },

    // ============ ITEM DETAILS ACTIONS ============
    setPlaceDetail: (id, data) => set((state) => ({
        placeDetails: {
            ...state.placeDetails,
            [id]: { data, timestamp: Date.now() }
        }
    })),
    getPlaceDetail: (id) => {
        const state = get()
        const cached = state.placeDetails[id]
        if (cached && state.isCacheValid(cached.timestamp)) {
            return cached.data
        }
        return null
    },

    setAboutDetail: (id, data) => set((state) => ({
        aboutDetails: {
            ...state.aboutDetails,
            [id]: { data, timestamp: Date.now() }
        }
    })),
    getAboutDetail: (id) => {
        const state = get()
        const cached = state.aboutDetails[id]
        if (cached && state.isCacheValid(cached.timestamp)) {
            return cached.data
        }
        return null
    },

    // ============ CACHE INVALIDATION ============
    invalidatePlaces: () => set({ placesTimestamp: null }),
    invalidateAboutItems: () => set({ aboutItemsTimestamp: null }),
    invalidateUsers: () => set({ usersTimestamp: null }),
    invalidateFavorites: () => set({ favoritesTimestamp: null }),
    invalidateBookings: () => set({ bookingsTimestamp: null }),
    invalidateOwners: () => set({ ownersTimestamp: null }),
    invalidateDrivers: () => set({ adminDriversTimestamp: null, driversTimestamp: null }),
    invalidateReviews: () => set({ reviewsTimestamp: null }),

    // Clear all cache
    clearCache: () => set({
        places: null,
        placesTimestamp: null,
        aboutItems: null,
        aboutItemsTimestamp: null,
        featuredPlaces: null,
        featuredPlacesTimestamp: null,
        weather: null,
        weatherTimestamp: null,
        availableDrivers: null,
        driversTimestamp: null,
        favorites: null,
        favoritesTimestamp: null,
        bookings: null,
        bookingsTimestamp: null,
        userProfile: null,
        userProfileTimestamp: null,
        users: null,
        usersTimestamp: null,
        owners: null,
        ownersTimestamp: null,
        adminDrivers: null,
        adminDriversTimestamp: null,
        reviews: null,
        reviewsTimestamp: null,
        analytics: null,
        analyticsTimestamp: null,
        placeDetails: {},
        aboutDetails: {}
    })
}))

export default useDataCache

