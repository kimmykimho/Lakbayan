import { createClient } from '@supabase/supabase-js'

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://hcorhxpinogbcqrlbrvj.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhjb3JoeHBpbm9nYmNxcmxicnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyOTEwMjMsImV4cCI6MjA4MDg2NzAyM30.sAszIPEOThdDJoH4GxXIDNONShIQj3qWL8K3g2MN0nE'

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
