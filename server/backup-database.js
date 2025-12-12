/**
 * Database Backup Script
 * Exports all tables to JSON files in /backups folder
 * Run: node server/backup-database.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Initialize Supabase
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Tables to backup
const TABLES = [
    'users',
    'places',
    'about_items',
    'bookings',
    'reviews',
    'favorites',
    'owner_applications',
    'driver_applications',
    'drivers',
    'transport_requests'
];

async function backupTable(tableName) {
    try {
        const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .limit(1000);

        if (error) {
            console.log(`⚠️ Skipping ${tableName}: ${error.message}`);
            return null;
        }

        console.log(`✅ ${tableName}: ${data?.length || 0} records`);
        return { table: tableName, count: data?.length || 0, data };
    } catch (err) {
        console.log(`⚠️ Skipping ${tableName}: ${err.message}`);
        return null;
    }
}

async function runBackup() {
    console.log('\n📦 Starting Database Backup...\n');

    // Create backups folder
    const backupDir = path.join(__dirname, '..', 'backups');
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().split('T')[0];
    const backupFile = path.join(backupDir, `backup_${timestamp}.json`);

    const backup = {
        timestamp: new Date().toISOString(),
        tables: {}
    };

    // Backup each table
    for (const table of TABLES) {
        const result = await backupTable(table);
        if (result && result.data) {
            backup.tables[table] = result.data;
        }
    }

    // Write to file
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));

    console.log(`\n✅ Backup saved to: ${backupFile}`);
    console.log(`📊 Total tables backed up: ${Object.keys(backup.tables).length}`);
}

runBackup().catch(console.error);
