# 🌴 BuenaVisit Tourism Platform - Full Stack

A modern, full-stack tourism management system for Buenavista, Agusan del Sur built with **React**, **Node.js**, **Express**, and **MongoDB**.

## ✨ Features

### Public Website
- 🏠 **Home**: Interactive carousel, real-time visitor statistics
- 📍 **Places**: Dynamic place listings with AI-powered suggestions
- 🗺️ **Maps**: Interactive Leaflet maps with markers
- 🚌 **Transport**: Booking system for local transportation
- 👤 **Profile**: User dashboard with bookings, reviews, and favorites
- 🔐 **Authentication**: Secure login/register system

### Admin Dashboard
- 📊 **Analytics**: Real-time visitor statistics and trends
- 🏢 **Places Management**: CRUD operations for tourist spots
- 👥 **User Management**: Manage tourists and business accounts
- 💼 **Business Management**: Track business performance
- ⭐ **Reviews**: Moderate and respond to reviews
- 📈 **Reports**: Generate tourism reports

### Technical Features
- ✅ JWT Authentication
- ✅ Role-based access control (Tourist, Business, Admin)
- ✅ Real-time updates with WebSocket support
- ✅ Image upload and management
- ✅ Responsive design (Mobile & Desktop)
- ✅ RESTful API architecture
- ✅ MongoDB with Mongoose ODM
- ✅ Form validation
- ✅ Error handling & logging

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI library
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **React Router** - Routing
- **Zustand** - State management
- **React Query** - Data fetching
- **Axios** - HTTP client
- **Chart.js** - Data visualization
- **Leaflet** - Interactive maps
- **React Hot Toast** - Notifications
- **Framer Motion** - Animations

### Backend
- **Node.js** - Runtime
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **Bcrypt** - Password hashing
- **Multer** - File uploads
- **Socket.io** - Real-time communication
- **Helmet** - Security
- **Express Validator** - Input validation

## 📦 Installation

### Prerequisites
- **Node.js** >= 18.x
- **MongoDB** >= 6.x (local or Atlas)
- **npm** or **yarn**

### Step 1: Clone Repository
```bash
git clone <repository-url>
cd BuenaBisita
```

### Step 2: Install Dependencies
```bash
# Install root dependencies
npm install

# Install client dependencies
cd client
npm install
cd ..
```

Or use the convenience script:
```bash
npm run install-all
```

### Step 3: Environment Configuration

Create a `.env` file in the root directory:

```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/buenavisit

# JWT
JWT_SECRET=your-super-secret-key-change-this
JWT_EXPIRE=7d

# Client URL
CLIENT_URL=http://localhost:5173

# Optional: Email (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

Create `.env.local` in the `client` directory:

```env
VITE_API_URL=http://localhost:5000/api
```

### Step 4: Start MongoDB

**Option A: Local MongoDB**
```bash
mongod
```

**Option B: MongoDB Atlas**
- Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- Get your connection string
- Update `MONGODB_URI` in `.env`

### Step 5: Seed Database (Optional)

Create sample data:
```bash
node server/seeders/seed.js
```

### Step 6: Start Development Servers

**Option A: Start both servers concurrently**
```bash
npm run dev
```

**Option B: Start separately**

Terminal 1 (Backend):
```bash
npm run server
```

Terminal 2 (Frontend):
```bash
npm run client
```

## 🚀 Usage

### Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000/api
- **API Health**: http://localhost:5000/api/health

### Default Admin Account

After seeding, use these credentials:

```
Email: admin@buenavisit.com
Password: admin123
```

### API Documentation

#### Authentication Endpoints
```
POST /api/auth/register       - Register new user
POST /api/auth/login          - Login
GET  /api/auth/me             - Get current user
PUT  /api/auth/update         - Update profile
PUT  /api/auth/change-password - Change password
```

#### Places Endpoints
```
GET    /api/places            - Get all places
GET    /api/places/:id        - Get single place
POST   /api/places            - Create place (Admin)
PUT    /api/places/:id        - Update place (Admin)
DELETE /api/places/:id        - Delete place (Admin)
POST   /api/places/:id/visit  - Update visitor count
GET    /api/places/:id/reviews - Get place reviews
```

#### Bookings Endpoints
```
GET    /api/bookings          - Get user bookings
POST   /api/bookings          - Create booking
GET    /api/bookings/:id      - Get booking details
PUT    /api/bookings/:id/cancel - Cancel booking
```

#### Reviews Endpoints
```
POST   /api/reviews           - Create review
GET    /api/reviews/user      - Get user reviews
PUT    /api/reviews/:id       - Update review
DELETE /api/reviews/:id       - Delete review
```

#### Analytics Endpoints (Admin)
```
GET    /api/analytics/dashboard  - Dashboard stats
GET    /api/analytics/places     - Places analytics
GET    /api/analytics/businesses - Business performance
```

## 📁 Project Structure

```
BuenaBisita/
├── client/                    # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/       # Reusable components
│   │   │   ├── layouts/      # Layout components
│   │   │   ├── common/       # Common components
│   │   │   └── features/     # Feature-specific components
│   │   ├── pages/            # Page components
│   │   │   ├── admin/        # Admin pages
│   │   │   └── ...           # Public pages
│   │   ├── services/         # API services
│   │   ├── store/            # Zustand stores
│   │   ├── utils/            # Utility functions
│   │   ├── hooks/            # Custom React hooks
│   │   ├── App.jsx           # Main app component
│   │   ├── main.jsx          # Entry point
│   │   └── index.css         # Global styles
│   ├── package.json
│   └── vite.config.js
│
├── server/                    # Node.js backend
│   ├── models/               # Mongoose models
│   │   ├── User.js
│   │   ├── Place.js
│   │   ├── Booking.js
│   │   ├── Review.js
│   │   └── Business.js
│   ├── routes/               # Express routes
│   │   ├── auth.js
│   │   ├── places.js
│   │   ├── bookings.js
│   │   ├── reviews.js
│   │   ├── users.js
│   │   ├── businesses.js
│   │   ├── analytics.js
│   │   └── transport.js
│   ├── middleware/           # Custom middleware
│   │   └── auth.js
│   ├── utils/                # Utility functions
│   ├── config/               # Configuration files
│   ├── seeders/              # Database seeders
│   └── index.js              # Server entry point
│
├── images/                    # Image assets
│   ├── places/
│   ├── hero/
│   └── logo/
│
├── uploads/                   # User uploads
├── .env                       # Environment variables
├── .gitignore
├── package.json
└── README.md
```

## 🎨 Adding Images

Place your images in the following structure:

```
images/
├── logo/
│   └── buenavisit-logo.png
├── hero/
│   ├── masao-beach.jpg
│   ├── manlangit-park.jpg
│   └── municipal-plaza.jpg
└── places/
    ├── manlangit-nature-park/
    │   └── main.jpg
    ├── masao-public-beach/
    │   └── main.jpg
    ├── municipal-plaza/
    │   └── main.jpg
    └── andis-snackbreak/
        └── main.jpg
```

## 🔧 Development

### Available Scripts

```bash
# Development
npm run dev              # Start both frontend & backend
npm run server           # Start backend only
npm run client           # Start frontend only

# Build
npm run build            # Build frontend for production

# Production
npm start                # Start production server
```

### Code Style

- Use **ES6+** features
- Follow **Airbnb** style guide
- Use **Prettier** for formatting
- Use **ESLint** for linting

## 🚢 Deployment

### Deploy Backend (Heroku)

```bash
# Login to Heroku
heroku login

# Create app
heroku create buenavisit-api

# Set environment variables
heroku config:set MONGODB_URI=your_mongodb_uri
heroku config:set JWT_SECRET=your_jwt_secret

# Deploy
git push heroku main
```

### Deploy Frontend (Vercel/Netlify)

**Vercel:**
```bash
cd client
vercel
```

**Netlify:**
```bash
cd client
npm run build
netlify deploy --prod --dir=dist
```

### Environment Variables for Production

Update your production environment variables:
- `MONGODB_URI` - MongoDB Atlas connection string
- `JWT_SECRET` - Strong random secret
- `CLIENT_URL` - Your frontend domain
- `NODE_ENV=production`

## 📝 API Testing

Use the included Postman collection or test with curl:

```bash
# Health check
curl http://localhost:5000/api/health

# Register user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123"
  }'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# Get places
curl http://localhost:5000/api/places
```

## 🐛 Troubleshooting

### Port already in use
```bash
# Kill process on port 5000
npx kill-port 5000

# Kill process on port 5173
npx kill-port 5173
```

### MongoDB connection error
- Ensure MongoDB is running
- Check connection string in `.env`
- Verify network access if using Atlas

### Module not found
```bash
# Clear cache and reinstall
rm -rf node_modules client/node_modules
npm run install-all
```

## 📚 Learning Resources

- [React Documentation](https://react.dev/)
- [Express.js Guide](https://expressjs.com/)
- [MongoDB Manual](https://www.mongodb.com/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 👥 Support

For support, email tourism@buenavista.gov.ph or contact the Buenavista Tourism Office.

## 🙏 Acknowledgments

- Buenavista LGU Tourism Office
- Agusan del Sur Provincial Tourism
- Local businesses and community

---

Made with ❤️ for Buenavista, Agusan del Sur
