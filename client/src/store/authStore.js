import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../services/api'

// Token refresh interval (50 minutes - tokens expire in 60 minutes)
let tokenRefreshInterval = null

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      // Initialize auth from localStorage or Supabase session
      initAuth: async () => {
        // Skip if we're on the OAuth callback page - let OAuthCallback handle it
        if (window.location.pathname === '/oauth/callback') {
          console.log('📱 On OAuth callback page, skipping initAuth')
          return
        }

        // FIRST: Check for valid Supabase OAuth session (most common case)
        try {
          const { supabase } = await import('../config/supabase')
          const { data: { session } } = await supabase.auth.getSession()

          if (session?.access_token) {
            console.log('✅ Found valid Supabase OAuth session, restoring auth state')
            set({
              isAuthenticated: true,
              token: session.access_token
            })
            // Fetch user data with the OAuth token
            get().fetchUser()
            return
          }
        } catch (error) {
          console.error('Error checking Supabase session:', error)
        }

        // SECOND: Check for stored token (email/password login) - only if no OAuth session
        const token = localStorage.getItem('token')
        if (token) {
          // Validate the token by fetching user - if it fails, clear state
          try {
            set({ isAuthenticated: true, token })
            await get().fetchUser()
          } catch {
            // Token invalid, clear state
            console.log('Stored token invalid, clearing auth state')
            set({ isAuthenticated: false, user: null, token: null })
            localStorage.removeItem('token')
          }
          return
        }

        // No valid session found - ensure clean state
        // This clears any stale persisted state from previous sessions
        const currentState = get()
        if (currentState.isAuthenticated || currentState.user) {
          console.log('Clearing stale auth state - no valid session found')
          set({ isAuthenticated: false, user: null, token: null })
        }
      },

      // Register with backend API
      register: async (userData) => {
        set({ isLoading: true })
        try {
          const response = await api.post('/auth/register', {
            name: userData.name,
            email: userData.email,
            password: userData.password,
            captchaToken: userData.captchaToken
          })

          if (response.data.success) {
            const { user, token } = response.data.data

            localStorage.setItem('token', token)

            set({
              user: {
                id: user.id,
                email: user.email,
                name: user.name,
                avatar: user.avatar,
                role: user.role || 'tourist'
              },
              token,
              isAuthenticated: true,
              isLoading: false
            })

            return { success: true }
          } else {
            throw new Error(response.data.message)
          }
        } catch (error) {
          set({ isLoading: false })
          const message = error.response?.data?.message || error.message || 'Registration failed'
          return { success: false, message }
        }
      },

      // Login with backend API
      login: async (credentials) => {
        set({ isLoading: true })
        try {
          const response = await api.post('/auth/login', {
            email: credentials.email,
            password: credentials.password,
            captchaToken: credentials.captchaToken
          })

          if (response.data.success) {
            const { user, token } = response.data.data

            localStorage.setItem('token', token)

            set({
              user: {
                id: user.id,
                email: user.email,
                name: user.name,
                avatar: user.avatar,
                phone: user.phone,
                role: user.role || 'tourist'
              },
              token,
              isAuthenticated: true,
              isLoading: false
            })

            console.log('Login successful - User role:', user.role)
            return { success: true }
          } else {
            throw new Error(response.data.message)
          }
        } catch (error) {
          set({ isLoading: false })
          const message = error.response?.data?.message || error.message || 'Login failed'
          return { success: false, message }
        }
      },

      // Google Sign In with Supabase OAuth
      googleSignIn: async () => {
        set({ isLoading: true })
        try {
          const { supabase } = await import('../config/supabase')

          // Use the /oauth/callback path for better mobile support
          const redirectUrl = `${window.location.origin}/oauth/callback`
          console.log('OAuth redirect URL:', redirectUrl)

          const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: redirectUrl,
              skipBrowserRedirect: false
            }
          })

          if (error) {
            set({ isLoading: false })
            return { success: false, message: error.message }
          }

          // OAuth redirects to Google, so this will only return if there's an issue
          set({ isLoading: false })
          return { success: true }
        } catch (error) {
          set({ isLoading: false })
          return {
            success: false,
            message: error.message || 'Google sign in failed'
          }
        }
      },

      // Handle OAuth callback (call this after redirect)
      handleOAuthCallback: async () => {
        try {
          const { supabase } = await import('../config/supabase')

          // First, try to extract tokens from URL hash (Supabase OAuth puts them there)
          const hashParams = new URLSearchParams(window.location.hash.substring(1))
          const accessToken = hashParams.get('access_token')
          const refreshToken = hashParams.get('refresh_token')

          let session = null

          // If tokens are in the URL hash, set the session manually
          if (accessToken && refreshToken) {
            console.log('📱 Found tokens in URL hash, setting session...')
            const { data, error: setSessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            })

            if (setSessionError) {
              console.error('📱 setSession error:', setSessionError)
              return { success: false, message: setSessionError.message }
            }

            session = data.session
          } else {
            // Try getting existing session (in case Supabase already processed it)
            const { data: { session: existingSession }, error } = await supabase.auth.getSession()

            if (error) {
              console.error('📱 getSession error:', error)
              return { success: false, message: error.message }
            }

            session = existingSession
          }

          if (!session) {
            return { success: false, message: 'No session found' }
          }

          console.log('📱 OAuth session established, checking user in database...')
          const supabaseUser = session.user

          // Check if user exists in our database, if not create them
          const api = (await import('../services/api')).default

          try {
            // Optimization: Call oauth-register directly (it handles both login and registration)
            // This avoids the double round-trip of /auth/me -> 404 -> /auth/oauth-register
            console.log('📱 Calling /auth/oauth-register to sync user...')

            const response = await api.post('/auth/oauth-register', {
              email: supabaseUser.email,
              name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0],
              avatar: supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture
            })

            console.log('📱 /auth/oauth-register response:', response.data)

            if (response.data.success) {
              const { user, token } = response.data.data

              // Store our internal token
              localStorage.setItem('token', token)

              set({
                user: {
                  id: user.id,
                  email: user.email,
                  name: user.name,
                  avatar: user.avatar,
                  role: user.role || 'tourist'
                },
                token: token,
                isAuthenticated: true,
                isLoading: false
              })
              console.log('📱 User authenticated successfully:', user.email)
              return { success: true }
            }
          } catch (err) {
            console.error('📱 Auth error:', err)
            set({ user: null, token: null, isAuthenticated: false, isLoading: false })
            return { success: false, message: err.response?.data?.message || 'Authentication failed' }
          }

          return { success: false, message: 'Failed to process OAuth login' }
        } catch (error) {
          console.error('OAuth callback error:', error)
          return { success: false, message: error.message }
        }
      },

      // Logout
      logout: async () => {
        try {
          // Clear localStorage token
          localStorage.removeItem('token')

          // Clear the Zustand persisted storage
          localStorage.removeItem('auth-storage')

          // Clear token refresh interval
          if (tokenRefreshInterval) clearInterval(tokenRefreshInterval)

          // Sign out from Supabase OAuth (important for Google OAuth users)
          try {
            const { supabase } = await import('../config/supabase')
            await supabase.auth.signOut()
            console.log('✅ Signed out from Supabase OAuth')
          } catch (supabaseError) {
            console.error('Supabase signOut error:', supabaseError)
          }

          // Clear Zustand state
          set({
            user: null,
            token: null,
            isAuthenticated: false
          })
        } catch (error) {
          console.error('Logout error:', error)
        }
      },

      // Update user profile
      updateUser: async (userData) => {
        try {
          const response = await api.put('/auth/update', userData)
          if (response.data.success) {
            set({ user: { ...get().user, ...response.data.data } })
            return { success: true }
          }
        } catch (error) {
          console.error('Update profile error:', error)
          return { success: false, message: error.message }
        }
      },

      // Fetch current user from backend
      fetchUser: async () => {
        try {
          // Check for localStorage token OR Supabase session
          const token = localStorage.getItem('token')
          let hasAuth = !!token

          // If no localStorage token, check for Supabase OAuth session
          if (!hasAuth) {
            const { supabase } = await import('../config/supabase')
            const { data: { session } } = await supabase.auth.getSession()
            hasAuth = !!session?.access_token
          }

          if (!hasAuth) {
            console.log('No auth token found, skipping fetchUser')
            return
          }

          const response = await api.get('/auth/me')
          if (response.data.success) {
            const user = response.data.data
            set({
              user: {
                id: user.id,
                email: user.email,
                name: user.name,
                avatar: user.avatar,
                phone: user.phone,
                role: user.role || 'tourist'
              },
              isAuthenticated: true
            })
          }
        } catch (error) {
          console.error('Failed to fetch user:', error)
          // Only logout if we HAD a valid token/session but it became invalid
          // Don't logout on fresh page loads where there simply is no session
          if (error.response?.status === 401) {
            const currentUser = get().user
            // Only call logout if we thought we were authenticated
            if (currentUser || get().isAuthenticated) {
              console.log('Session expired, logging out')
              get().logout()
            } else {
              // Just ensure clean state for unauthenticated users
              set({ isAuthenticated: false, user: null, token: null })
            }
          }
        }
      },

      // Refresh user role
      refreshUserRole: async () => {
        try {
          const response = await api.get('/auth/me')
          if (response.data.success) {
            const user = response.data.data
            const currentUser = get().user
            set({
              user: {
                ...currentUser,
                role: user.role || 'tourist'
              }
            })
            console.log('✅ Role refreshed:', user.role)
            return user.role
          }
        } catch (error) {
          console.error('Failed to refresh role:', error)
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
)
