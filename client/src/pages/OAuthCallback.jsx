import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'

export default function OAuthCallback() {
    const navigate = useNavigate()
    const { handleOAuthCallback } = useAuthStore()
    const [processing, setProcessing] = useState(true)
    const [error, setError] = useState(null)
    const hasProcessed = useRef(false) // Prevent multiple processing

    useEffect(() => {
        let authListener = null
        let timeoutId = null

        const processOAuth = async () => {
            // Prevent duplicate processing
            if (hasProcessed.current) {
                console.log('📱 Already processed, skipping...')
                return
            }
            hasProcessed.current = true

            console.log('📱 Processing OAuth callback...')
            const result = await handleOAuthCallback()
            console.log('📱 Callback result:', result)

            if (result.success) {
                toast.success('Welcome!')
                // Clear URL hash and navigate
                window.history.replaceState(null, '', '/')
                navigate('/', { replace: true })
            } else {
                console.error('📱 OAuth failed:', result.message)
                setError(result.message)
                toast.error(result.message || 'Login failed')
                setTimeout(() => navigate('/login'), 2000)
            }
            setProcessing(false)
        }

        const initCallback = async () => {
            console.log('📱 OAuthCallback: Initializing...')
            console.log('📱 Hash:', window.location.hash ? 'present' : 'empty')
            console.log('📱 Full URL:', window.location.href)

            try {
                const { supabase } = await import('../config/supabase')

                // Check if we have tokens in the hash
                const hashParams = new URLSearchParams(window.location.hash.substring(1))
                const hasTokens = hashParams.has('access_token')

                if (hasTokens) {
                    console.log('📱 Tokens found in hash, processing directly...')
                    // Process directly - the handleOAuthCallback will extract tokens
                    await processOAuth()
                    return
                }

                // If no tokens in hash, check for existing session
                const { data: { session } } = await supabase.auth.getSession()

                if (session) {
                    console.log('📱 Existing session found, processing...')
                    await processOAuth()
                    return
                }

                // No tokens and no session - wait a bit for auth state change
                console.log('📱 No tokens or session, waiting for auth state change...')

                const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
                    console.log('📱 Auth state change:', event)

                    if (event === 'SIGNED_IN' && session && !hasProcessed.current) {
                        await processOAuth()
                    }
                })

                authListener = subscription

                // Set a timeout
                timeoutId = setTimeout(() => {
                    if (!hasProcessed.current) {
                        console.log('📱 Timeout waiting for auth')
                        setError('Authentication timeout. Please try again.')
                        toast.error('Authentication timeout. Please try again.')
                        setProcessing(false)
                        setTimeout(() => navigate('/login'), 2000)
                    }
                }, 10000)

            } catch (err) {
                console.error('📱 OAuthCallback error:', err)
                setError(err.message)
                setProcessing(false)
            }
        }

        initCallback()

        // Cleanup
        return () => {
            if (authListener) {
                authListener.unsubscribe()
            }
            if (timeoutId) {
                clearTimeout(timeoutId)
            }
        }
    }, [handleOAuthCallback, navigate])

    if (processing) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-beige-50 via-beige-50 to-beige-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-beige-500 mx-auto mb-4"></div>
                    <p className="text-gray-600 text-lg">Completing sign in...</p>
                    <p className="text-gray-400 text-sm mt-2">Please wait...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-beige-50 via-beige-50 to-beige-50">
                <div className="text-center">
                    <div className="text-red-500 text-5xl mb-4">❌</div>
                    <p className="text-gray-900 text-lg font-semibold">Authentication Failed</p>
                    <p className="text-gray-600 text-sm mt-2">{error}</p>
                    <p className="text-gray-400 text-sm mt-4">Redirecting to login...</p>
                </div>
            </div>
        )
    }

    return null
}
