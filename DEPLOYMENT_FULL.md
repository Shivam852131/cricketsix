# CricketLive Pro - Complete Deployment Guide

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Firebase Hosting                           │
│  (https://cricketsix26.web.app)                        │
│                                                         │
│  - index.html (Main website)                           │
│  - admin.html (Admin panel)                            │
│  - styles.css, app.js, sw.js (Static assets)           │
│  - Firebase Realtime Database (Real-time data sync)    │
└─────────────────────────────────────────────────────────┘
                            │
                            │ API Calls
                            ▼
┌─────────────────────────────────────────────────────────┐
│         Backend Server (Node.js + Express)             │
│  (Run separately - e.g., on Render, Railway, etc.)     │
│                                                         │
│  - Handles API endpoints (/api/*)                      │
│  - Manages real-time events (SSE)                      │
│  - Connects to Firebase for data storage               │
└─────────────────────────────────────────────────────────┘
```

## Step 1: Deploy Frontend to Firebase Hosting

✅ **COMPLETED** - Website is live at:
- Main Site: https://cricketsix26.web.app
- Admin Panel: https://cricketsix26.web.app/admin.html
- Admin Key: `cricketlive2026`

## Step 2: Deploy Backend Server

The backend needs to run on a separate hosting service (not Firebase Hosting). Options:

### Option A: Deploy to Render (Free Tier)
1. Create account at render.com
2. Connect your GitHub repository
3. Create new Web Service
4. Set build command: `cd backend && npm install`
5. Set start command: `cd backend && npm start`
6. Set environment variables:
   - `PORT`: 10000
   - `ADMIN_KEY`: `cricketlive2026`

### Option B: Deploy to Railway
1. Create account at railway.app
2. Connect GitHub repository
3. Deploy backend folder
4. Set environment variables

### Option C: Run Locally (Development)
```bash
cd backend
npm install
npm start
```

## Step 3: Configure Frontend to Use Backend

Update the API base URL in `public/app.js`:

```javascript
// Line 22-24: Change from:
const USE_FIREBASE = window.location.hostname.includes('web.app');
const APP_BASE_URL = window.location.protocol === "file:" ? "http://localhost:3000" : "";
const API_BASE = USE_FIREBASE ? "" : APP_BASE_URL + "/api";

// To (if using Render):
const API_BASE = "https://your-backend-service.onrender.com/api";
```

## Step 4: Deploy Updated Files

```bash
firebase deploy --only hosting
```

## Step 5: Configure CORS (if needed)

Add CORS headers to your backend server.js:

```javascript
const cors = require('cors');
app.use(cors({
  origin: ['https://cricketsix26.web.app', 'http://localhost:3000'],
  credentials: true
}));
```

## Current Status

✅ **Frontend**: Deployed to Firebase Hosting  
✅ **Database**: Firebase Realtime Database configured  
✅ **Admin Panel**: Working with key `cricketlive2026`  
⚠️ **Backend**: Needs to be deployed separately  

## Access URLs

- **Main Site**: https://cricketsix26.web.app
- **Admin Panel**: https://cricketsix26.web.app/admin.html
- **Admin Key**: `cricketlive2026`

## Next Steps

1. Deploy backend server to Render/Railway/Heroku
2. Update app.js with backend URL
3. Redeploy frontend to Firebase

## Troubleshooting

### 404 Errors on API Calls
- Backend server not running
- Backend URL not configured in app.js
- CORS issues

### Service Worker Errors
- sw.js must be in public folder (✅ Done)
- Service worker only registers on HTTPS (Firebase Hosting provides this)

### Styles Not Loading
- styles.css must be in public folder (✅ Done)
- Clear browser cache and reload
