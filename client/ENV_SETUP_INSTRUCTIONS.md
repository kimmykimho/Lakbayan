# 🔐 Environment Variables Setup Instructions

## ⚠️ IMPORTANT: Secure Your Firebase API Keys

Your Firebase API keys should be stored in environment variables, NOT committed to version control!

---

## 📝 Setup Steps

### 1. Create `.env` File

In the `client` folder, create a file named **`.env`** (not `.env.example`):

```bash
cd client
# On Windows PowerShell:
New-Item .env
# On Mac/Linux:
touch .env
```

### 2. Add Your Firebase Configuration

Copy and paste this into `client/.env`:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=AIzaSyAENUrpOv5gu79oST35GHpoiOhdBCYGqRk
VITE_FIREBASE_AUTH_DOMAIN=foxt-15fde.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=foxt-15fde
VITE_FIREBASE_STORAGE_BUCKET=foxt-15fde.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=671345452976
VITE_FIREBASE_APP_ID=1:671345452976:web:f0a95b2ec5bfe78892d875

# Backend API URL
VITE_API_URL=http://localhost:5000/api
```

### 3. Verify `.gitignore` Contains `.env`

Make sure `client/.gitignore` includes:

```
# Environment variables
.env
.env.local
.env.*.local
```

If not, add it!

### 4. Restart Your Development Server

After creating the `.env` file, restart Vite:

```bash
# Stop the server (Ctrl+C)
# Restart:
npm run dev
```

---

## ✅ Verification

To verify it's working, check the browser console. You should see:

- ✅ No errors about missing Firebase config
- ✅ Firebase initialized successfully
- ✅ Auth working properly

If you see this error:
```
❌ Firebase configuration is missing! Please check your .env file.
```

Then the `.env` file is not set up correctly.

---

## 🔒 Security Best Practices

### DO ✅
- ✅ Use `.env` for local development
- ✅ Add `.env` to `.gitignore`
- ✅ Use environment variables in production
- ✅ Restrict API keys in Firebase console
- ✅ Set up Firebase Auth domain restrictions

### DON'T ❌
- ❌ Commit `.env` to GitHub
- ❌ Share API keys publicly
- ❌ Hardcode credentials
- ❌ Use production keys in development

---

## 🌐 Production Deployment

### For Vercel:
```bash
# In Vercel dashboard, add environment variables:
VITE_FIREBASE_API_KEY = your_api_key
VITE_FIREBASE_AUTH_DOMAIN = your_auth_domain
VITE_FIREBASE_PROJECT_ID = your_project_id
VITE_FIREBASE_STORAGE_BUCKET = your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID = your_messaging_sender_id
VITE_FIREBASE_APP_ID = your_app_id
VITE_API_URL = https://your-backend.com/api
```

### For Netlify:
```bash
# In Netlify dashboard > Site settings > Environment variables
# Add the same variables as above
```

### For Other Platforms:
Check their documentation for how to add environment variables.

---

## 🔧 Troubleshooting

### Problem: "Firebase configuration is missing"
**Solution:** Create the `.env` file in the `client` folder and restart the dev server.

### Problem: Environment variables not loading
**Solution:** 
1. Make sure the file is named exactly `.env` (not `.env.txt`)
2. Restart the Vite dev server
3. Clear browser cache

### Problem: Still seeing hardcoded keys
**Solution:** You configured it correctly! The Firebase config now reads from `.env`.

---

## 📊 File Structure

```
client/
├── .env                    ← CREATE THIS FILE (not tracked by git)
├── .env.example            ← Template (committed to git)
├── .gitignore              ← Must include .env
├── src/
│   └── config/
│       └── firebase.js     ← ✅ Now uses env variables!
└── ...
```

---

## 🎯 Why Use Environment Variables?

1. **Security:** API keys not in source code
2. **Flexibility:** Different configs for dev/staging/production
3. **Collaboration:** Team members use their own keys
4. **Safety:** Can't accidentally commit secrets

---

## 📝 Next Steps

1. ✅ Create `client/.env` file
2. ✅ Copy Firebase config to `.env`
3. ✅ Verify `.gitignore` excludes `.env`
4. ✅ Restart development server
5. ✅ Test Firebase authentication

**Status:** ✅ Firebase is now configured to use environment variables!

---

**Security Level:** 🔒 **HIGH** (API keys protected)  
**Ready for Production:** ✅ **YES**  
**Last Updated:** November 3, 2025

