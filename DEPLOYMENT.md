# CricketLive Pro - Firebase Deployment Guide

## Prerequisites

1. Install Firebase CLI:
```bash
npm install -g firebase-tools
```

2. Login to Firebase:
```bash
firebase login
```

## Project Configuration

The project is configured to use:
- **Project ID**: `cricketsix26`
- **Realtime Database**: `https://cricketsix26-default-rtdb.firebaseio.com`
- **Hosting**: Firebase Hosting

## Deployment Steps

### 1. Deploy to Firebase

```bash
# Navigate to project directory
cd "C:\Users\shiva\OneDrive\Desktop\New folder (7)"

# Deploy hosting and database
firebase deploy --only hosting,database
```

### 2. Deploy Only Hosting

```bash
firebase deploy --only hosting
```

### 3. Deploy Only Database

```bash
firebase deploy --only database
```

## Files Structure

```
project-root/
├── public/
│   ├── index.html (Main website)
│   ├── admin.html (Admin panel)
│   ├── styles.css
│   ├── app.js
│   └── other assets
├── firebase.json (Hosting configuration)
├── .firebaserc (Project configuration)
└── database.rules.json (Database rules)
```

## Firebase Configuration

The following Firebase configuration is already added to both websites:

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

## Real-time Data Synchronization

- **Admin Panel** → Updates Firebase database in real-time
- **User Website** → Listens to Firebase for live updates
- **Both** → Synchronized through Firebase Realtime Database

## Access After Deployment

- **Main Website**: `https://cricketsix26.web.app`
- **Admin Panel**: `https://cricketsix26.web.app/admin.html`

## Firebase Console

- **Project**: https://console.firebase.google.com/project/cricketsix26
- **Realtime Database**: https://console.firebase.google.com/project/cricketsix26/database
- **Hosting**: https://console.firebase.google.com/project/cricketsix26/hosting
