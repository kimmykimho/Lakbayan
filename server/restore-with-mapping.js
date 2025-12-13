/**
 * Smart Database Restore Script
 * Restores data from backup with user ID mapping for new Supabase project
 * 
 * This script:
 * 1. Reads backup file
 * 2. Maps old user IDs to current user by email
 * 3. Restores business_owners, drivers, bookings with correct user_id
 */

require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

// Create Supabase admin client
const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Find the latest backup file - backups folder is in project root
const backupsDir = path.join(__dirname, '..', 'backups')
const backupFile = 'backup_2025-12-12.json'
const backupPath = path.join(backupsDir, backupFile)

async function restoreWithMapping() {
    console.log('\n🔄 Smart Database Restore with User ID Mapping\n')

    // Read backup file
    if (!fs.existsSync(backupPath)) {
        console.error(`❌ Backup file not found: ${backupPath}`)
        process.exit(1)
    }

    const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'))
    console.log(`📦 Loaded backup from: ${backup.timestamp}\n`)

    // Step 1: Get current users in database
    console.log('📋 Step 1: Getting current users from database...')
    const { data: currentUsers, error: usersError } = await supabaseAdmin
        .from('users')
        .select('id, email, name')

    if (usersError) {
        console.error('❌ Failed to fetch users:', usersError.message)
        return
    }

    console.log(`   Found ${currentUsers.length} users in database\n`)

    // Create email to new ID mapping
    const emailToNewId = {}
    currentUsers.forEach(user => {
        emailToNewId[user.email.toLowerCase()] = user.id
    })

    // Get backup data - handle both formats (backup.data.X or backup.X)
    const backupData = backup.data || backup

    // Step 2: Create user ID mapping from backup
    console.log('📋 Step 2: Creating user ID mapping...')
    const backupUsers = backupData.users || []
    const oldIdToNewId = {}

    backupUsers.forEach(oldUser => {
        const email = oldUser.email?.toLowerCase()
        if (email && emailToNewId[email]) {
            oldIdToNewId[oldUser.id] = emailToNewId[email]
            console.log(`   ✅ ${oldUser.name || oldUser.email}: ${oldUser.id.substring(0, 8)}... → ${emailToNewId[email].substring(0, 8)}...`)
        } else {
            console.log(`   ⚠️ ${oldUser.name || oldUser.email}: No matching user in new database`)
        }
    })

    console.log('')

    // Step 3: Get your admin user ID (kimmykimho@gmail.com)
    const adminEmail = 'kimmykimho@gmail.com'
    const adminNewId = emailToNewId[adminEmail]

    if (!adminNewId) {
        console.error('❌ Admin user not found in database. Please login first.')
        console.log('   Expected email:', adminEmail)
        return
    }

    console.log(`🔑 Admin user ID: ${adminNewId}\n`)

    // Step 4: Restore business_owners
    console.log('📋 Step 3: Restoring business_owners...')
    const backupOwners = backupData.business_owners || []
    for (const owner of backupOwners) {
        const newUserId = oldIdToNewId[owner.user_id] || adminNewId

        const { error } = await supabaseAdmin
            .from('business_owners')
            .upsert({
                ...owner,
                user_id: newUserId,
                id: undefined // Let Supabase generate new ID
            }, { onConflict: 'user_id' })

        if (error) {
            console.log(`   ⚠️ Owner ${owner.business_name}: ${error.message}`)
        } else {
            console.log(`   ✅ Restored: ${owner.business_name}`)
        }
    }
    if (backupOwners.length === 0) console.log('   ⏭️ No business owners to restore')
    console.log('')

    // Step 5: Restore drivers
    console.log('📋 Step 4: Restoring drivers...')
    const backupDrivers = backupData.drivers || []
    for (const driver of backupDrivers) {
        const newUserId = oldIdToNewId[driver.user_id] || adminNewId

        const { error } = await supabaseAdmin
            .from('drivers')
            .upsert({
                ...driver,
                user_id: newUserId,
                id: undefined
            }, { onConflict: 'user_id' })

        if (error) {
            console.log(`   ⚠️ Driver: ${error.message}`)
        } else {
            console.log(`   ✅ Restored driver: ${driver.vehicle_type || 'Unknown vehicle'}`)
        }
    }
    if (backupDrivers.length === 0) console.log('   ⏭️ No drivers to restore')
    console.log('')

    // Step 6: Restore bookings
    console.log('📋 Step 5: Restoring bookings...')
    const backupBookings = backupData.bookings || []
    for (const booking of backupBookings) {
        const newUserId = oldIdToNewId[booking.user_id] || adminNewId

        const { error } = await supabaseAdmin
            .from('bookings')
            .insert({
                ...booking,
                user_id: newUserId,
                id: undefined
            })

        if (error) {
            console.log(`   ⚠️ Booking: ${error.message}`)
        } else {
            console.log(`   ✅ Restored booking for place: ${booking.place_id?.substring(0, 8) || 'Unknown'}...`)
        }
    }
    if (backupBookings.length === 0) console.log('   ⏭️ No bookings to restore')
    console.log('')

    // Step 7: Restore transport_requests
    console.log('📋 Step 6: Restoring transport_requests...')
    const backupRequests = backupData.transport_requests || []
    for (const request of backupRequests) {
        const newUserId = oldIdToNewId[request.user_id] || adminNewId

        const { error } = await supabaseAdmin
            .from('transport_requests')
            .insert({
                ...request,
                user_id: newUserId,
                id: undefined
            })

        if (error) {
            console.log(`   ⚠️ Transport request: ${error.message}`)
        } else {
            console.log(`   ✅ Restored transport request`)
        }
    }
    if (backupRequests.length === 0) console.log('   ⏭️ No transport requests to restore')

    console.log('\n✅ Smart restore complete!\n')
}

// Run the restore
restoreWithMapping()
    .catch(console.error)
