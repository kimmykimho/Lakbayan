import { createClient } from '@supabase/supabase-js'

// Supabase configuration - MUST be set via environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('⚠️ Missing Supabase credentials in environment variables!')
    console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        detectSessionInUrl: true,
        flowType: 'implicit',
        autoRefreshToken: true,
        persistSession: true,
        storage: localStorage,
        storageKey: 'supabase.auth.token'
    }
})
