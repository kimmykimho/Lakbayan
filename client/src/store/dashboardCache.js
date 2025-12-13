/**
 * Dashboard Cache Store
 * Caches dashboard data to prevent re-fetching on navigation
 */
import { create } from 'zustand'

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000

const useDashboardCache = create((set, get) => ({
    // Admin dashboard cache
    adminStats: null,
    adminStatsTimestamp: null,
    adminLoading: false,

    // Driver dashboard cache
    driverProfile: null,
    driverStats: null,
    driverTimestamp: null,

    // Owner dashboard cache
    ownerProfile: null,
    ownerStats: null,
    ownerReviews: null,
    ownerTimestamp: null,

    // Check if cache is valid
    isCacheValid: (timestamp) => {
        if (!timestamp) return false
        return Date.now() - timestamp < CACHE_DURATION
    },

    // Admin dashboard actions
    setAdminStats: (data) => set({
        adminStats: data,
        adminStatsTimestamp: Date.now(),
        adminLoading: false
    }),
    setAdminLoading: (loading) => set({ adminLoading: loading }),
    getAdminStats: () => {
        const state = get()
        if (state.isCacheValid(state.adminStatsTimestamp)) {
            return state.adminStats
        }
        return null
    },

    // Driver dashboard actions
    setDriverData: (profile, stats) => set({
        driverProfile: profile,
        driverStats: stats,
        driverTimestamp: Date.now()
    }),
    getDriverData: () => {
        const state = get()
        if (state.isCacheValid(state.driverTimestamp)) {
            return { profile: state.driverProfile, stats: state.driverStats }
        }
        return null
    },

    // Owner dashboard actions
    setOwnerData: (profile, stats, reviews) => set({
        ownerProfile: profile,
        ownerStats: stats,
        ownerReviews: reviews,
        ownerTimestamp: Date.now()
    }),
    getOwnerData: () => {
        const state = get()
        if (state.isCacheValid(state.ownerTimestamp)) {
            return {
                profile: state.ownerProfile,
                stats: state.ownerStats,
                reviews: state.ownerReviews
            }
        }
        return null
    },

    // Clear all dashboard cache
    clearDashboardCache: () => set({
        adminStats: null,
        adminStatsTimestamp: null,
        driverProfile: null,
        driverStats: null,
        driverTimestamp: null,
        ownerProfile: null,
        ownerStats: null,
        ownerReviews: null,
        ownerTimestamp: null
    })
}))

export default useDashboardCache
