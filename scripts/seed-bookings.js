/**
 * Seed realistic booking data for association rule mining demo.
 * Creates 20 tourist users with bookings across existing places.
 * Run: node scripts/seed-bookings.js
 */
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function seed() {
  const client = await pool.connect();
  
  try {
    // Get existing places
    const { rows: places } = await client.query("SELECT id, name FROM places WHERE status = 'active'");
    console.log(`Found ${places.length} active places:`, places.map(p => p.name));
    
    if (places.length < 2) {
      console.error('Need at least 2 active places. Aborting.');
      return;
    }

    // Create 20 tourist users with realistic Filipino names
    const tourists = [
      { name: 'Maria Santos', email: 'maria.santos@gmail.com' },
      { name: 'Juan Dela Cruz', email: 'juan.delacruz@gmail.com' },
      { name: 'Ana Reyes', email: 'ana.reyes@gmail.com' },
      { name: 'Pedro Garcia', email: 'pedro.garcia@gmail.com' },
      { name: 'Rosa Mendoza', email: 'rosa.mendoza@gmail.com' },
      { name: 'Carlos Rivera', email: 'carlos.rivera@gmail.com' },
      { name: 'Elena Cruz', email: 'elena.cruz@gmail.com' },
      { name: 'Miguel Torres', email: 'miguel.torres@gmail.com' },
      { name: 'Sofia Ramos', email: 'sofia.ramos@gmail.com' },
      { name: 'Antonio Bautista', email: 'antonio.bautista@gmail.com' },
      { name: 'Lucia Fernandez', email: 'lucia.fernandez@gmail.com' },
      { name: 'Ricardo Flores', email: 'ricardo.flores@gmail.com' },
      { name: 'Carmen Aquino', email: 'carmen.aquino@gmail.com' },
      { name: 'Jose Villanueva', email: 'jose.villanueva@gmail.com' },
      { name: 'Patricia Luna', email: 'patricia.luna@gmail.com' },
      { name: 'Roberto Salazar', email: 'roberto.salazar@gmail.com' },
      { name: 'Isabel Castillo', email: 'isabel.castillo@gmail.com' },
      { name: 'Fernando Gomez', email: 'fernando.gomez@gmail.com' },
      { name: 'Teresa Navarro', email: 'teresa.navarro@gmail.com' },
      { name: 'Andres Morales', email: 'andres.morales@gmail.com' }
    ];

    // Insert users
    const userIds = [];
    for (const t of tourists) {
      const { rows } = await client.query(
        `INSERT INTO users (name, email, password, role) 
         VALUES ($1, $2, $3, 'tourist') 
         ON CONFLICT (email) DO UPDATE SET name = $1
         RETURNING id`,
        [t.name, t.email, '$2a$10$placeholder_hash_for_seeded_users']
      );
      userIds.push(rows[0].id);
    }
    console.log(`Created/updated ${userIds.length} tourist users`);

    // Define realistic booking patterns based on your actual places
    // Places: Viewing Deck, Highground RestoBar, Balai San Roque, Lake Resort in Lantawan Eco Park, Hamogaway Restaurant
    // Pattern: Nature lovers visit Viewing Deck + Lake Resort
    // Food lovers visit RestoBar + Balai San Roque + Hamogaway
    // Mixed tourists visit nature + food combos
    
    const placeMap = {};
    places.forEach(p => { placeMap[p.name] = p.id; });
    
    // Booking patterns - each tourist gets 2-4 bookings at different places
    // Designed to create discoverable association rules
    const bookingPatterns = [
      // Nature lovers (Viewing Deck + Lake Resort) - strong pattern
      [0, 1, 2, 3, 4, 5, 6],  // These tourists visit both nature spots
      // Food lovers (RestoBar + Balai + Hamogaway) - strong pattern  
      [7, 8, 9, 10, 11, 12],  // These tourists visit food spots
      // Mixed (nature + food) - moderate pattern
      [0, 2, 4, 13, 14, 15, 16, 17, 18, 19]  // These visit both
    ];

    const placeNames = places.map(p => p.name);
    let bookingCount = 0;
    const visitDates = [
      '2025-12-10', '2025-12-11', '2025-12-12', '2025-12-13', '2025-12-14',
      '2025-12-15', '2025-12-16', '2025-12-17', '2025-12-18', '2025-12-19',
      '2025-12-20', '2025-12-21', '2025-12-22', '2025-12-23', '2025-12-24'
    ];

    // Nature tourists: book Viewing Deck + Lake Resort (and some add a food place)
    const naturePlaces = places.filter(p => p.name.includes('Viewing') || p.name.includes('Lake') || p.name.includes('Lantawan'));
    const foodPlaces = places.filter(p => p.name.includes('Resto') || p.name.includes('Balai') || p.name.includes('Hamogaway'));
    const allPlaceIds = places.map(p => p.id);

    for (let i = 0; i < userIds.length; i++) {
      const userId = userIds[i];
      let placesToBook = [];

      if (i < 7) {
        // Nature-focused tourists: always book nature spots, sometimes food
        placesToBook = naturePlaces.map(p => p.id);
        if (i % 2 === 0 && foodPlaces.length > 0) {
          placesToBook.push(foodPlaces[0].id); // Some also visit a restaurant
        }
      } else if (i < 13) {
        // Food-focused tourists: always book food spots, sometimes nature
        placesToBook = foodPlaces.map(p => p.id);
        if (i % 3 === 0 && naturePlaces.length > 0) {
          placesToBook.push(naturePlaces[0].id);
        }
      } else {
        // Mixed tourists: pick 2-3 random places
        const shuffled = [...allPlaceIds].sort(() => Math.random() - 0.5);
        placesToBook = shuffled.slice(0, 2 + Math.floor(Math.random() * 2));
      }

      // Remove duplicates
      placesToBook = [...new Set(placesToBook)];

      for (const placeId of placesToBook) {
        const date = visitDates[Math.floor(Math.random() * visitDates.length)];
        const time = `${8 + Math.floor(Math.random() * 10)}:00`;
        const visitors = 1 + Math.floor(Math.random() * 4);
        const status = Math.random() > 0.1 ? 'confirmed' : 'completed';

        await client.query(
          `INSERT INTO bookings (user_id, place_id, visit_date, visit_time, number_of_visitors, status, booking_type)
           VALUES ($1, $2, $3, $4, $5, $6, 'visit')
           ON CONFLICT DO NOTHING`,
          [userId, placeId, date, time, visitors, status]
        );
        bookingCount++;
      }
    }

    console.log(`Created ${bookingCount} bookings across ${places.length} places`);

    // Also add some favorites for variety
    let favCount = 0;
    for (let i = 0; i < userIds.length; i++) {
      const userId = userIds[i];
      // Each user favorites 2-3 places
      const shuffled = [...allPlaceIds].sort(() => Math.random() - 0.5);
      const favs = shuffled.slice(0, 2 + Math.floor(Math.random() * 2));
      
      for (const placeId of favs) {
        await client.query(
          `INSERT INTO user_favorites (user_id, place_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [userId, placeId]
        );
        favCount++;
      }
    }

    console.log(`Created ${favCount} favorites`);
    console.log('\nDone! Restart the server and check the Data Processing page.');

  } catch (err) {
    console.error('Seed error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
