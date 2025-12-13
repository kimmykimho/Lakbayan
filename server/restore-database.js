/**
 * Database Restore Script
 * Restores data from backup JSON to a new Supabase project
 * 
 * Usage:
 * 1. Create new Supabase project
 * 2. Run the schema SQL (server/database/schema.sql or recreate tables)
 * 3. Update .env with new SUPABASE_URL and keys
 * 4. Run: node server/restore-database.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Initialize Supabase with NEW project credentials
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// EXACT 11 TABLES in correct dependency order for restore
const RESTORE_ORDER = [
    // No dependencies - restore first
    'users',
    'places',
    'about_items',

    // Depends on users
    'business_owners',
    'businesses',
    'drivers',

    // Depends on users and places
    'bookings',
    'reviews',

    // Depends on users and drivers
    'transport_requests',

    // Junction tables (depends on users and places)
    'user_favorites',
    'user_owned_places'
];

async function restoreTable(tableName, records) {
    if (!records || records.length === 0) {
        console.log(`⏭️ ${tableName}: No records to restore`);
        return;
    }

    try {
        // Insert in batches of 50 to avoid timeout
        const batchSize = 50;
        let restored = 0;

        for (let i = 0; i < records.length; i += batchSize) {
            const batch = records.slice(i, i + batchSize);

            const { error } = await supabase
                .from(tableName)
                .upsert(batch, { onConflict: 'id' });

            if (error) {
                console.log(`⚠️ ${tableName}: ${error.message}`);
                return;
            }

            restored += batch.length;
        }

        console.log(`✅ ${tableName}: ${restored} records restored`);
    } catch (err) {
        console.log(`⚠️ ${tableName}: ${err.message}`);
    }
}

async function runRestore() {
    // Find the most recent backup file
    const backupDir = path.join(__dirname, '..', 'backups');

    if (!fs.existsSync(backupDir)) {
        console.log('❌ No backups folder found!');
        return;
    }

    const files = fs.readdirSync(backupDir)
        .filter(f => f.startsWith('backup_') && f.endsWith('.json'))
        .sort()
        .reverse();

    if (files.length === 0) {
        console.log('❌ No backup files found!');
        return;
    }

    const latestBackup = path.join(backupDir, files[0]);
    console.log(`\n📦 Restoring from: ${files[0]}\n`);

    const backup = JSON.parse(fs.readFileSync(latestBackup, 'utf8'));
    console.log(`📅 Backup created: ${backup.timestamp}\n`);

    // Restore tables in order
    for (const tableName of RESTORE_ORDER) {
        if (backup.tables[tableName]) {
            await restoreTable(tableName, backup.tables[tableName]);
        }
    }

    console.log('\n✅ Restore complete!');
}

runRestore().catch(console.error);
