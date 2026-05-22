/**
 * Seed 100 realistic Filipino tourist users with bookings and favorites.
 * Names sourced from common Filipino surnames and given names.
 * Run: node scripts/seed-100-users.js
 */
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Common Filipino first names and surnames
const firstNames = [
  'Maria', 'Juan', 'Jose', 'Ana', 'Pedro', 'Rosa', 'Carlos', 'Elena', 'Miguel', 'Sofia',
  'Antonio', 'Lucia', 'Ricardo', 'Carmen', 'Fernando', 'Patricia', 'Roberto', 'Isabel', 'Andres', 'Teresa',
  'Marco', 'Angelica', 'Rafael', 'Cristina', 'Gabriel', 'Veronica', 'Emmanuel', 'Diana', 'Christian', 'Angela',
  'Marlon', 'Josephine', 'Romeo', 'Rosalie', 'Benedict', 'Maricel', 'Jayson', 'Rhea', 'Mark', 'Joanne',
  'Dennis', 'Catherine', 'Ariel', 'Sheila', 'Vincent', 'Grace', 'Jerome', 'Mylene', 'Ronaldo', 'Jennifer',
  'Danilo', 'Lorna', 'Ernesto', 'Marites', 'Reynaldo', 'Jocelyn', 'Rolando', 'Aileen', 'Eduardo', 'Rowena',
  'Alfredo', 'Evelyn', 'Raul', 'Melinda', 'Joel', 'Glenda', 'Ricky', 'Hazel', 'Bryan', 'Precious',
  'Kenneth', 'Kathleen', 'Allan', 'Jasmine', 'Randy', 'Cherry', 'Alvin', 'April', 'Jomar', 'Maribel',
  'Leo', 'Lea', 'Noel', 'Joy', 'Rex', 'Faith', 'Ace', 'Hope', 'Ian', 'Mae',
  'Neil', 'Ivy', 'Ray', 'Gem', 'Jun', 'Lyn', 'Art', 'May', 'Dan', 'Zel'
];

const surnames = [
  'Santos', 'Reyes', 'Cruz', 'Bautista', 'Garcia', 'Mendoza', 'Torres', 'Villanueva', 'Ramos', 'Flores',
  'Rivera', 'Gonzales', 'Fernandez', 'Castillo', 'Aquino', 'Salazar', 'Navarro', 'Morales', 'Luna', 'Gomez',
  'Dela Cruz', 'De Leon', 'Del Rosario', 'Hernandez', 'Lopez', 'Martinez', 'Rodriguez', 'Perez', 'Sanchez', 'Diaz',
  'Soriano', 'Pascual', 'Mercado', 'Santiago', 'Aguilar', 'Valdez', 'Domingo', 'Medina', 'Magno', 'Tolentino',
  'Manalo', 'Ilagan', 'Buenaventura', 'Pangilinan', 'Cunanan', 'Bagalso', 'Lacsamana', 'Dalisay', 'Magtanggol', 'Dimaculangan'
];

const emailDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com'];

function randomFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

async function seed() {
  const client = await pool.connect();

  try {
    // Get existing places
    const { rows: places } = await client.query("SELECT id, name, category FROM places WHERE status = 'active'");
    console.log(`Found ${places.length} active places:`, places.map(p => p.name));

    if (places.length < 2) {
      console.error('Need at least 2 active places.');
      return;
    }

    const placeIds = places.map(p => p.id);
    const naturePlaces = places.filter(p => p.category === 'nature').map(p => p.id);
    const foodPlaces = places.filter(p => p.category === 'food').map(p => p.id);

    // Generate 100 unique users
    const users = [];
    const usedEmails = new Set();

    for (let i = 0; i < 100; i++) {
      const firstName = randomFrom(firstNames);
      const surname = randomFrom(surnames);
      const name = `${firstName} ${surname}`;
      
      // Generate unique email
      let email;
      let attempts = 0;
      do {
        const num = randomInt(1, 999);
        email = `${firstName.toLowerCase()}${surname.toLowerCase().replace(/\s/g, '')}${num}@${randomFrom(emailDomains)}`;
        attempts++;
      } while (usedEmails.has(email) && attempts < 50);
      usedEmails.add(email);

      users.push({ name, email });
    }

    // Insert users
    const userIds = [];
    for (const u of users) {
      const { rows } = await client.query(
        `INSERT INTO users (name, email, password, role) 
         VALUES ($1, $2, $3, 'tourist') 
         ON CONFLICT (email) DO UPDATE SET name = $1
         RETURNING id`,
        [u.name, u.email, '$2a$10$seeded_placeholder_hash_not_for_login']
      );
      userIds.push(rows[0].id);
    }
    console.log(`Created ${userIds.length} tourist users`);

    // Generate bookings with realistic patterns
    // Pattern groups:
    // 40% nature lovers (prefer nature spots)
    // 35% food lovers (prefer food spots)  
    // 25% mixed (random combos)
    let bookingCount = 0;

    const dateRange = [];
    for (let d = 0; d < 60; d++) {
      const date = new Date();
      date.setDate(date.getDate() - d);
      dateRange.push(date.toISOString().split('T')[0]);
    }

    for (let i = 0; i < userIds.length; i++) {
      const userId = userIds[i];
      let placesToBook = [];

      if (i < 40) {
        // Nature lovers: always book nature spots, sometimes add food
        placesToBook = [...naturePlaces];
        if (Math.random() > 0.4 && foodPlaces.length > 0) {
          placesToBook.push(randomFrom(foodPlaces));
        }
      } else if (i < 75) {
        // Food lovers: always book food spots, sometimes add nature
        placesToBook = [...foodPlaces];
        if (Math.random() > 0.5 && naturePlaces.length > 0) {
          placesToBook.push(randomFrom(naturePlaces));
        }
      } else {
        // Mixed: 2-3 random places
        const shuffled = [...placeIds].sort(() => Math.random() - 0.5);
        placesToBook = shuffled.slice(0, randomInt(2, Math.min(3, placeIds.length)));
      }

      // Deduplicate
      placesToBook = [...new Set(placesToBook)];

      // Some users book only 1 place (won't show in association rules but adds realism)
      if (Math.random() < 0.15) {
        placesToBook = [placesToBook[0]];
      }

      for (const placeId of placesToBook) {
        const visitDate = randomFrom(dateRange);
        const hour = randomInt(7, 17);
        const visitTime = `${hour.toString().padStart(2, '0')}:${randomInt(0, 1) === 0 ? '00' : '30'}`;
        const visitors = randomInt(1, 6);
        const statusOptions = ['confirmed', 'confirmed', 'confirmed', 'completed', 'completed', 'pending'];
        const status = randomFrom(statusOptions);

        await client.query(
          `INSERT INTO bookings (user_id, place_id, visit_date, visit_time, number_of_visitors, status, booking_type)
           VALUES ($1, $2, $3, $4, $5, $6, 'visit')`,
          [userId, placeId, visitDate, visitTime, visitors, status]
        );
        bookingCount++;
      }
    }
    console.log(`Created ${bookingCount} bookings`);

    // Generate favorites (each user favorites 1-4 places)
    let favCount = 0;
    for (const userId of userIds) {
      const numFavs = randomInt(1, Math.min(4, placeIds.length));
      const shuffled = [...placeIds].sort(() => Math.random() - 0.5);
      const favs = shuffled.slice(0, numFavs);

      for (const placeId of favs) {
        await client.query(
          `INSERT INTO user_favorites (user_id, place_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [userId, placeId]
        );
        favCount++;
      }
    }
    console.log(`Created ${favCount} favorites`);

    // Generate some reviews (30% of users leave a review)
    let reviewCount = 0;
    const reviewComments = [
      'Beautiful place! Highly recommended for families.',
      'Great food and ambiance. Will definitely come back.',
      'The view was breathtaking. Perfect for photography.',
      'Clean facilities and friendly staff.',
      'A hidden gem in Kitcharao. Must visit!',
      'Affordable prices with excellent service.',
      'Best spot for nature lovers in the area.',
      'The food was amazing. Try their local dishes!',
      'Perfect weekend getaway spot.',
      'Very relaxing atmosphere. Great for unwinding.',
      'Kids loved it! Family-friendly destination.',
      'Good value for money. The scenery is worth the trip.',
      'Peaceful environment away from the city noise.',
      'The staff were very accommodating and helpful.',
      'A wonderful experience. The place exceeded my expectations.'
    ];

    for (let i = 0; i < userIds.length; i++) {
      if (Math.random() > 0.7) continue; // 30% chance to skip

      const userId = userIds[i];
      const placeId = randomFrom(placeIds);
      const rating = randomInt(3, 5); // Realistic: mostly positive
      const comment = randomFrom(reviewComments);

      await client.query(
        `INSERT INTO reviews (user_id, place_id, rating, comment, status)
         VALUES ($1, $2, $3, $4, 'approved')`,
        [userId, placeId, rating, comment]
      );
      reviewCount++;
    }
    console.log(`Created ${reviewCount} reviews`);

    console.log('\nDone! Summary:');
    console.log(`  Users: ${userIds.length}`);
    console.log(`  Bookings: ${bookingCount}`);
    console.log(`  Favorites: ${favCount}`);
    console.log(`  Reviews: ${reviewCount}`);
    console.log('\nRestart the server and check the Data Processing page.');

  } catch (err) {
    console.error('Seed error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
