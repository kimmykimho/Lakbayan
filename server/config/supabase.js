const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

// Regular client for general queries (respects RLS)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for server-side operations that need to bypass RLS (like user creation)
// Falls back to anon key if service role key not provided
const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
  : supabase;

// Test connection
const testConnection = async () => {
  try {
    const { data, error } = await supabase.from('users').select('count').limit(1);
    if (error && error.code !== 'PGRST116') {
      // PGRST116 means table doesn't exist yet, which is fine during setup
      console.log('⚠️ Supabase connected but tables may not exist yet');
    } else {
      console.log('✅ Supabase connected successfully');
    }

    if (supabaseServiceKey) {
      console.log('✅ Supabase Admin (Service Role) enabled');
    } else {
      console.log('⚠️ SUPABASE_SERVICE_ROLE_KEY not set - using anon key (RLS applies)');
    }
  } catch (err) {
    console.error('❌ Supabase connection error:', err.message);
  }
};

module.exports = { supabase, supabaseAdmin, testConnection };
