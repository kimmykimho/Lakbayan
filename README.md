# 🌴 Lakbayan sa Kitcharao - Tourism Management Platform

A comprehensive **full-stack tourism management system** for Kitcharao, Agusan del Norte, Philippines. Built with **React**, **Node.js**, **Express**, and **Supabase (PostgreSQL)** with AI-powered chatbot assistance.

---

## 📋 Statement of the Problem

The municipality of Kitcharao, Agusan del Norte possesses rich natural attractions, cultural heritage, and local businesses with significant tourism potential. However, several challenges hinder the growth of local tourism:

### 1. **Lack of Digital Presence**
Local tourist destinations, restaurants, accommodations, and shops have minimal to no online visibility. Potential visitors struggle to discover what Kitcharao has to offer, resulting in lost tourism opportunities and revenue.

### 2. **Fragmented Tourism Information**
Information about tourist spots, operating hours, pricing, and amenities is scattered and often outdated. There is no centralized platform where tourists can access comprehensive, up-to-date information about all destinations.

### 3. **Transportation Barriers**
Tourists face difficulties arranging reliable transportation to various destinations. There is no organized system connecting visitors with verified local drivers, leading to:
- Uncertainty about fare pricing
- Safety concerns with unverified drivers
- No real-time tracking of transport services
- Difficulty in booking rides in advance

### 4. **Limited Business Management Tools**
Local business owners lack affordable digital tools to:
- Showcase their products and services online
- Manage customer bookings efficiently
- Track visitor analytics and business performance
- Respond to customer reviews and feedback

### 5. **Absence of Visitor Analytics**
The local government and tourism office have no data-driven insights on:
- Visitor trends and patterns
- Popular destinations and peak hours
- Tourist demographics and preferences
- Overall tourism performance metrics

### 6. **Communication Gap**
There is no interactive way for tourists to get immediate answers about destinations, recommendations, or platform guidance, especially outside business hours.

---

**Lakbayan sa Kitcharao** addresses these problems by providing a unified digital platform that connects tourists, local businesses, transport providers, and administrators—enabling seamless tourism experiences while supporting local economic growth.

---

## 🎯 Project Objectives

1. **Promote Local Tourism** - Digitize and showcase Kitcharao's tourist destinations, local businesses, and cultural heritage to increase visibility and attract visitors.

2. **Streamline Tourist Experience** - Provide an easy-to-use platform for tourists to discover places, book visits, and arrange transportation services.

3. **Enable Transport Booking** - Connect tourists with verified local drivers (tricycle, motorcycle, van, car) with real-time tracking capabilities.

4. **Support Local Businesses** - Allow business owners to manage their establishments, menus, services, and track customer bookings.

5. **Centralized Management** - Provide administrators with analytics, user management, and oversight of all platform activities.

6. **AI-Powered Assistance** - Integrate an intelligent chatbot (Gemini AI) to assist tourists with recommendations and platform navigation.

---

## ✨ Features & Functionalities

### 🏠 Public Tourist Features
| Feature | Description |
|---------|-------------|
| **Home Page** | Interactive carousel showcasing featured destinations, real-time visitor statistics |
| **Places Discovery** | Browse tourist spots by category (nature, cultural, beach, food, adventure, historical, shopping, accommodation) |
| **Place Details** | View comprehensive information including location, hours, pricing, menu, amenities, reviews, and ratings |
| **Interactive Maps** | Leaflet-powered maps with markers for all destinations |
| **Transport Booking** | Request rides from verified local drivers with vehicle selection |
| **Transport Tracking** | Real-time GPS tracking of booked transport with ETA |
| **User Profile** | Personal dashboard with bookings, reviews, and favorites management |
| **Favorites** | Save and organize favorite places for quick access |
| **AI Chatbot** | Gemini-powered tourism assistant for recommendations and guidance |
| **Reviews & Ratings** | Leave reviews with ratings, images, and helpfulness voting |

### 🚗 Driver Features
| Feature | Description |
|---------|-------------|
| **Driver Dashboard** | Overview of active requests, earnings, and statistics |
| **Transport Requests** | View and accept incoming ride requests |
| **Trip History** | Complete history of all completed trips |
| **Real-time Updates** | Location sharing and status updates for passengers |

### 🏪 Business Owner Features
| Feature | Description |
|---------|-------------|
| **Owner Dashboard** | Business performance overview and quick stats |
| **Place Management** | Full CRUD operations for owned establishments |
| **Menu/Services Management** | Update menus, services, and product listings |
| **Booking Management** | View and manage incoming tourist bookings |
| **Arriving Tourists** | Track expected visitors for the day |
| **Analytics** | View visitor trends and business performance |
| **Transport Tracking** | Monitor transport status for guests |

### 🛡️ Admin Features
| Feature | Description |
|---------|-------------|
| **Admin Dashboard** | Platform-wide statistics and activity overview |
| **User Management** | Manage all users (tourists, drivers, business owners) |
| **Places Management** | Full control over all tourist destinations |
| **Driver Verification** | Approve/reject driver applications with document review |
| **Business Owner Verification** | Manage business owner applications |
| **Analytics & Reports** | Comprehensive tourism analytics and trends |
| **About Page Management** | Update platform information and content |

### 🔐 Authentication & Security
- **Multi-role Authentication** - Tourist, Driver, Business Owner, Admin roles
- **JWT-based Security** - Secure token authentication
- **OAuth Integration** - Social login support
- **Rate Limiting** - API protection against abuse
- **Helmet Security** - HTTP security headers

---

## 🗄️ Database Schema

### Core Models

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              USER                                        │
├─────────────────────────────────────────────────────────────────────────┤
│ • name, email, password (bcrypt hashed)                                 │
│ • role: tourist | business_owner | driver | admin                       │
│ • phone, avatar, preferences (language, notifications)                  │
│ • stats: placesVisited, reviewsCount, bookingsCount                     │
│ • favorites: [Place references]                                         │
│ • ownedPlaces: [Place references] (for business owners)                 │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                              PLACE                                       │
├─────────────────────────────────────────────────────────────────────────┤
│ • name, slug, description                                                │
│ • category: nature | cultural | beach | food | adventure | historical  │
│             | shopping | accommodation                                    │
│ • images[], location (address, coordinates, municipality, province)     │
│ • contact (phone, email, website)                                        │
│ • hours: Monday-Sunday schedule                                          │
│ • pricing: entranceFee, adult/child/senior rates, pricePerNight         │
│ • menu[]: For restaurants (name, description, recipe, price, image)     │
│ • accommodation: For hotels (roomTypes, checkIn/Out times)              │
│ • shop: For retail (categories, products[], paymentMethods)             │
│ • entertainment: For cinema (nowShowing[], ticketPrice, facilities)     │
│ • services[]: For service providers                                      │
│ • amenities[], activities[], highlights[]                                │
│ • rating (average, count), visitors (current, total, capacity)          │
│ • accessibility, virtualTour, status, featured                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                             BOOKING                                      │
├─────────────────────────────────────────────────────────────────────────┤
│ • user, place (references)                                               │
│ • bookingType: visit | transport | event                                 │
│ • visitDate, visitTime, numberOfVisitors                                 │
│ • contactInfo, specialRequests                                           │
│ • transport: needed, vehicleType, pickup, dropoff, driver, fare         │
│ • status: pending | confirmed | cancelled | completed                    │
│ • payment: amount, status, method, transactionId                         │
│ • confirmationCode (auto-generated), qrCode                              │
│ • checkIn/checkOut timestamps                                            │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                             DRIVER                                       │
├─────────────────────────────────────────────────────────────────────────┤
│ • user (reference), verified, verificationStatus                         │
│ • vehicle: type, make, model, year, color, plateNumber, capacity        │
│ • license: number, expiryDate, type (professional/non-professional)     │
│ • documents[]: license, registration, insurance, police_clearance       │
│ • rating (average, count), availability (schedule, isAvailable)         │
│ • location (GeoJSON Point for GPS tracking)                              │
│ • serviceAreas[], pricing (baseRate, perKilometer, perMinute)           │
│ • statistics: totalTrips, totalEarnings, completedTrips                 │
│ • status: active | inactive | suspended | offline                        │
│ • bankDetails for payments                                               │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                       TRANSPORT REQUEST                                  │
├─────────────────────────────────────────────────────────────────────────┤
│ • user, driver, booking (references)                                     │
│ • vehicleType: tricycle | motorcycle | van | private_car                │
│ • pickup/destination: address, coordinates, placeName                   │
│ • status: pending → accepted → driver_enroute → arrived →               │
│           in_progress → completed | cancelled                            │
│ • fare (estimated, final), distance, duration                            │
│ • driverLocation (real-time coordinates)                                 │
│ • eta, photos[], rating, timeline (all status timestamps)               │
│ • cancellationReason, cancelledBy                                        │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                             REVIEW                                       │
├─────────────────────────────────────────────────────────────────────────┤
│ • user, place, booking (references)                                      │
│ • rating (1-5), title, comment                                           │
│ • images[], helpful (count, users who voted)                             │
│ • response: text, respondedBy, respondedAt (owner replies)              │
│ • status: pending | approved | rejected                                  │
│ • isVerified (verified visit)                                            │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                            BUSINESS                                      │
├─────────────────────────────────────────────────────────────────────────┤
│ • owner (User reference), name                                           │
│ • type: restaurant | hotel | transport | tour | retail | other          │
│ • description, logo, images[], location                                  │
│ • contact, pricing, menu[], accommodation, shop, entertainment          │
│ • services[], revenue, rating                                            │
│ • permits[], status: active | inactive | pending                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

### Frontend (React Client)
| Technology | Purpose |
|------------|---------|
| React 18 | UI Library |
| Vite | Build Tool & Dev Server |
| Tailwind CSS | Utility-first Styling |
| React Router | Client-side Routing |
| Zustand | State Management |
| Axios | HTTP Client |
| Leaflet | Interactive Maps |
| Framer Motion | Animations |

### Backend (Node.js Server)
| Technology | Purpose |
|------------|---------|
| Node.js | JavaScript Runtime |
| Express.js | Web Framework |
| Supabase | PostgreSQL Database |
| Google Gemini AI | Chatbot Intelligence |
| JWT | Authentication Tokens |
| Bcrypt | Password Hashing |
| Multer | File Upload Handling |
| Socket.io | Real-time Communication |
| Helmet | Security Headers |
| Express Validator | Input Validation |
| Firebase | Additional Services |

### Infrastructure
| Technology | Purpose |
|------------|---------|
| Supabase | Database & Auth |
| Firebase | Storage/Analytics |
| Nodemailer | Email Services |

---

## 📁 Project Structure

```
Lakbayan/
├── client/                      # React Frontend
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   ├── pages/               # Page components
│   │   │   ├── admin/           # Admin dashboard pages
│   │   │   ├── driver/          # Driver portal pages
│   │   │   └── owner/           # Business owner pages
│   │   ├── services/            # API service layer
│   │   ├── store/               # Zustand state stores
│   │   ├── config/              # Configuration files
│   │   └── assets/              # Static assets
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── server/                      # Node.js Backend
│   ├── config/                  # Supabase & app config
│   ├── controllers/             # Request handlers
│   ├── middleware/              # Auth & validation middleware
│   ├── models/                  # Database models (Mongoose)
│   ├── routes/                  # API route definitions
│   │   ├── auth.js              # Authentication routes
│   │   ├── users.js             # User management
│   │   ├── places.js            # Tourist places CRUD
│   │   ├── bookings.js          # Booking management
│   │   ├── reviews.js           # Review system
│   │   ├── drivers.js           # Driver management
│   │   ├── transport-requests.js # Transport bookings
│   │   ├── chatbot.js           # AI chatbot endpoint
│   │   ├── analytics.js         # Statistics & reports
│   │   └── ...                  # Other routes
│   ├── services/                # Business logic services
│   ├── seeders/                 # Database seeders
│   └── index.js                 # Server entry point
│
├── admin/                       # Legacy admin dashboard
├── js/                          # Vanilla JS scripts
├── css/                         # Vanilla CSS styles
├── images/                      # Image assets
├── uploads/                     # User uploaded files
└── scripts/                     # Utility scripts
```

---

## 🚀 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | User login |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/update` | Update profile |
| PUT | `/api/auth/change-password` | Change password |

### Places
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/places` | Get all places |
| GET | `/api/places/:id` | Get place details |
| POST | `/api/places` | Create place (Admin/Owner) |
| PUT | `/api/places/:id` | Update place |
| DELETE | `/api/places/:id` | Delete place |
| POST | `/api/places/:id/visit` | Update visitor count |

### Bookings
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/bookings` | Get user bookings |
| POST | `/api/bookings` | Create booking |
| GET | `/api/bookings/:id` | Get booking details |
| PUT | `/api/bookings/:id/cancel` | Cancel booking |

### Transport
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/transport-requests` | Get transport requests |
| POST | `/api/transport-requests` | Create transport request |
| PUT | `/api/transport-requests/:id/accept` | Driver accepts request |
| PUT | `/api/transport-requests/:id/status` | Update trip status |
| PUT | `/api/transport-requests/:id/location` | Update driver location |

### Drivers
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/drivers` | Get available drivers |
| POST | `/api/drivers/register` | Register as driver |
| PUT | `/api/drivers/:id/verify` | Admin verify driver |
| GET | `/api/drivers/statistics` | Get driver stats |

### Reviews
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reviews` | Get reviews |
| POST | `/api/reviews` | Create review |
| PUT | `/api/reviews/:id` | Update review |
| DELETE | `/api/reviews/:id` | Delete review |

### AI Chatbot
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chatbot` | Send message to AI assistant |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/dashboard` | Dashboard statistics |
| GET | `/api/analytics/places` | Places analytics |
| GET | `/api/analytics/businesses` | Business performance |

---

## 📦 Installation

### Prerequisites
- **Node.js** >= 18.x
- **npm** or **yarn**
- **Supabase** account (PostgreSQL database)
- **Google AI API Key** (for Gemini chatbot)

### Setup Steps

```bash
# 1. Clone repository
git clone <repository-url>
cd Lakbayan

# 2. Install all dependencies
npm run install-all

# 3. Configure environment variables
# Copy ENV_TEMPLATE.txt to .env and fill in values

# 4. Start development servers
npm run dev
```

### Environment Variables

Create a `.env` file with:

```env
# Server
PORT=5000
NODE_ENV=development

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# JWT
JWT_SECRET=your_secret_key
JWT_EXPIRE=7d

# Google AI (Chatbot)
GEMINI_API_KEY=your_gemini_api_key

# Client
CLIENT_URL=http://localhost:5173

# Email (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email
SMTP_PASS=your_app_password
```

---

## 🔧 Available Scripts

```bash
npm run dev          # Start both frontend & backend
npm run server       # Start backend only
npm run client       # Start frontend only
npm run build        # Build frontend for production
npm start            # Start production server
npm run seed         # Seed database with sample data
npm run set-admin    # Set admin role for a user
```

---

## 📍 Access Points

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:5000/api |
| Health Check | http://localhost:5000/api/health |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the ISC License.

---

## 🙏 Acknowledgments

- Kitcharao LGU Tourism Office
- Agusan del Norte Provincial Tourism
- Local businesses and community partners

---

*Made with ❤️ for Kitcharao, Agusan del Norte, Philippines*
