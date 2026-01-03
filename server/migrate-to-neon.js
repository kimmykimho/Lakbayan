/**
 * Migrate Data from Supabase to Neon
 * Reads backup from Supabase and inserts into Neon
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool, testConnection } = require('./config/neon');

// Find most recent backup
const backupsDir = path.join(__dirname, '..', 'backups');

async function migrateData() {
    console.log('\n🔄 Supabase → Neon Data Migration\n');

    // Test Neon connection
    const connected = await testConnection();
    if (!connected) {
        console.error('❌ Cannot connect to Neon. Check DATABASE_URL in .env');
        process.exit(1);
    }

    // Find backup files
    if (!fs.existsSync(backupsDir)) {
        console.error('❌ No backups directory found');
        console.log('   Run: node server/backup-database.js first');
        process.exit(1);
    }

    const backupFiles = fs.readdirSync(backupsDir)
        .filter(f => f.endsWith('.json'))
        .sort()
        .reverse();

    if (backupFiles.length === 0) {
        console.error('❌ No backup files found');
        console.log('   Run: node server/backup-database.js first');
        process.exit(1);
    }

    const latestBackup = backupFiles[0];
    const backupPath = path.join(backupsDir, latestBackup);

    console.log(`📦 Using backup: ${latestBackup}\n`);

    const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    // Handle different backup formats: backup.data, backup.tables, or direct
    const backupData = backup.tables || backup.data || backup;

    const client = await pool.connect();

    try {
        // Define valid columns for each table (matching Neon schema)
        const schemaColumns = {
            users: ['id', 'email', 'password', 'name', 'role', 'avatar', 'phone', 'is_active', 'last_login', 'created_at', 'updated_at'],
            places: ['id', 'name', 'description', 'category', 'images', 'location', 'contact_info', 'opening_hours', 'entry_fee', 'facilities', 'activities', 'rating', 'visitors', 'virtual_tour', 'status', 'featured', 'owner_id', 'created_at', 'updated_at'],
            about_items: ['id', 'title', 'slug', 'short_description', 'content', 'images', 'category', 'order_index', 'status', 'created_at', 'updated_at'],
            reviews: ['id', 'user_id', 'place_id', 'rating', 'comment', 'images', 'status', 'created_at', 'updated_at'],
            bookings: ['id', 'user_id', 'place_id', 'visit_date', 'visit_time', 'number_of_visitors', 'special_requests', 'transport', 'contact_info', 'status', 'total_amount', 'created_at', 'updated_at'],
            business_owners: ['id', 'user_id', 'business_name', 'business_type', 'license_number', 'documents', 'status', 'created_at', 'updated_at'],
            drivers: ['id', 'user_id', 'license_number', 'vehicle_type', 'vehicle_plate', 'vehicle_capacity', 'rate_per_km', 'documents', 'is_available', 'current_location', 'rating', 'status', 'created_at', 'updated_at'],
            transport_requests: ['id', 'user_id', 'driver_id', 'booking_id', 'pickup_location', 'dropoff_location', 'vehicle_type', 'scheduled_time', 'status', 'fare', 'distance', 'created_at', 'updated_at'],
            user_favorites: ['user_id', 'place_id', 'created_at']
        };

        // Migration order (respect foreign keys)
        const tables = [
            'users',
            'places',
            'about_items',
            'reviews',
            'bookings',
            'business_owners',
            'drivers',
            'transport_requests',
            'user_favorites'
        ];

        for (const table of tables) {
            const data = backupData[table];

            if (!data || data.length === 0) {
                console.log(`⏭️  ${table}: No data to migrate`);
                continue;
            }

            console.log(`📋 Migrating ${table}...`);
            let inserted = 0;
            let errors = 0;

            for (const row of data) {
                try {
                    // Get valid columns for this table
                    const validColumns = schemaColumns[table] || [];

                    // Clean the row - only include valid columns
                    const cleanRow = {};
                    for (const [key, value] of Object.entries(row)) {
                        // Skip if not a valid column or value is undefined
                        if (!validColumns.includes(key) || value === undefined) continue;

                        // Convert objects to JSON strings for JSONB columns
                        if (typeof value === 'object' && value !== null) {
                            cleanRow[key] = JSON.stringify(value);
                        } else {
                            cleanRow[key] = value;
                        }
                    }

                    const keys = Object.keys(cleanRow);
                    const values = Object.values(cleanRow);
                    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
                    const columns = keys.join(', ');

                    // Use ON CONFLICT to handle duplicates
                    let conflictClause = '';
                    if (table === 'users') conflictClause = 'ON CONFLICT (email) DO NOTHING';
                    else if (table === 'user_favorites') conflictClause = 'ON CONFLICT (user_id, place_id) DO NOTHING';
                    else conflictClause = 'ON CONFLICT (id) DO NOTHING';

                    const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) ${conflictClause}`;
                    await client.query(sql, values);
                    inserted++;
                } catch (err) {
                    errors++;
                    if (err.message.includes('violates foreign key')) {
                        // Skip foreign key errors silently (dependent record doesn't exist)
                    } else {
                        console.log(`   ⚠️ Row error: ${err.message.substring(0, 50)}...`);
                    }
                }
            }

            console.log(`   ✅ ${inserted} rows inserted, ${errors} skipped`);
        }

        console.log('\n✅ Data migration complete!\n');

    } catch (err) {
        console.error('❌ Migration error:', err.message);
        throw err;
    } finally {
        client.release();
        await pool.end();
    }
}

migrateData()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
