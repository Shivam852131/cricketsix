# CricketLive Pro

A comprehensive cricket streaming platform with real-time analytics, AI-powered insights, and multi-language support.

## Features

### User Website (index.html)
- Live cricket streaming with video player
- Real-time scores and AI match briefing
- Multi-page navigation (Home, Live, Stats, Predictions, Highlights)
- Personalized watchlists and favorite teams
- Live chat and fan engagement
- Mobile-responsive design with bottom navigation

### Admin Panel (admin.html)
- **Dashboard**: Real-time viewer analytics and charts
- **AI Match Briefing**: AI-powered tactical analysis and predictions
- **Analytics**: Viewer trends, engagement metrics, and geographic distribution
- **Stream Control**: Live streaming management with AI camera features
- **Match Management**: Score updates, team configurations, and timeline events
- **Poll Management**: Create and manage fan polls
- **Chat Moderation**: Real-time chat monitoring
- **Content Scheduling**: Calendar-based content planning
- **Multi-Language**: Translation management for 6+ languages
- **Highlights**: Automated highlight generation

### Firebase Integration
- Real-time database synchronization between admin and user websites
- Live updates without page refresh
- Persistent data storage
- Cross-device synchronization

## Deployment

### Quick Deploy (Windows)
```powershell
.\deploy.ps1
```

### Manual Deploy
```bash
firebase deploy --only hosting,database
```

### Access After Deployment
- **Main Site**: https://cricketsix26.web.app
- **Admin Panel**: https://cricketsix26.web.app/admin.html
- **Admin Key**: `cricketlive2026`

## Local Development

### Start Backend Server
```bash
cd backend
npm start
```

### Access Locally
- **Main Site**: http://localhost:3000
- **Admin Panel**: http://localhost:3000/admin.html

## Technology Stack

- **Frontend**: HTML5, Tailwind CSS, Vanilla JavaScript
- **Backend**: Node.js, Express
- **Database**: Firebase Realtime Database
- **AI**: OpenAI Integration
- **Charts**: Chart.js
- **PWA**: Service Worker for offline support

## Project Structure

```
project-root/
├── public/
│   ├── index.html      # Main website
│   ├── admin.html      # Admin panel
│   ├── app.js          # Main JavaScript
│   └── styles.css      # Custom styles
├── backend/
│   ├── server.js       # Express server
│   └── data/           # Data storage
├── firebase.json       # Firebase config
├── .firebaserc         # Project config
├── database.rules.json # DB rules
└── DEPLOYMENT.md       # Deployment guide
```

## Configuration

Firebase configuration is embedded in both `index.html` and `admin.html`:

```javascript
const firebaseConfig = {
    apiKey: "AIzaSyDQkuUYyoBH1M6RnmaMhehWG7xInO2SvRw",
    authDomain: "cricketsix26.firebaseapp.com",
    databaseURL: "https://cricketsix26-default-rtdb.firebaseio.com",
    projectId: "cricketsix26",
    storageBucket: "cricketsix26.firebasestorage.app",
    messagingSenderId: "429796170500",
    appId: "1:429796170500:web:d9d1b7d2a4b920bb18ce51",
    measurementId: "G-RDZ9WBVBXG"
};
```

## License

© 2026 CricketLive Pro. All rights reserved.
