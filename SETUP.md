# CricketLive Pro - Setup Guide

## ✅ What's Been Completed

### 1. Frontend-Backend Connection
- ✅ Fixed API connection in `public/app.js` with auto-detection
- ✅ Added connection status indicator in navigation
- ✅ Enhanced error handling with retry logic
- ✅ All API endpoints tested and working

### 2. Backend Server
- ✅ Express.js server running on port 3000
- ✅ Flask server (Python) available on port 5000
- ✅ Static file serving configured
- ✅ CORS enabled for cross-origin requests
- ✅ Real-time SSE (Server-Sent Events) working

### 3. Advanced Features Added

#### Voice Control
- Click the microphone button (🎤) in navigation
- Say commands like:
  - "Go home" / "Show home"
  - "Go live" / "Watch live"
  - "Show stats" / "Show predictions"
  - "Refresh" / "Reload"

#### Enhanced UI
- Connection status indicator (top-right)
- Voice control button
- Real-time updating "Last Updated" timestamp
- Improved error messages

#### Advanced Endpoints
- `GET /api/match/stats` - Detailed match statistics
- `GET /api/match/summary` - Match summary with teams and status
- `GET /api/match/timeline` - Combined timeline and ball events
- `GET /api/match/win-probability` - Live win probability
- `POST /api/quick-score` - Admin quick score updates
- `GET /api/connection/status` - Connection health check

### 4. Testing & Documentation
- ✅ Comprehensive test script created
- ✅ All 13 endpoints verified
- ✅ README.md with full documentation
- ✅ Setup guide created

## 🚀 How to Run

### Option 1: Quick Start (Recommended)
```bash
# Windows
start-server.bat

# Linux/Mac
cd backend && node server.js
```

### Option 2: Manual Start
```bash
cd backend
npm install
node server.js
```

### Option 3: Python Flask Server
```bash
cd backend
pip install -r requirements.txt
python server.py
```

## 📂 Project Structure

```
/
├── backend/
│   ├── server.js          # Express.js server (main)
│   ├── server.py          # Flask server (alternative)
│   ├── package.json       # Node dependencies
│   ├── requirements.txt   # Python dependencies
│   ├── data/
│   │   └── app-state.json # Match state storage
│   └── advanced-endpoints.js # Extra API endpoints
├── public/
│   ├── index.html         # Main frontend
│   ├── app.js             # Frontend logic
│   ├── styles.css         # Styles (2000+ lines)
│   ├── admin.html         # Admin panel
│   └── sw.js              # Service worker
├── start-server.bat       # Windows startup script
├── test-connection.js     # Quick connection test
├── full-test.js           # Comprehensive test
├── README.md              # Full documentation
└── SETUP.md              # This file
```

## 🔌 API Endpoints

### Public Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/state` | GET | Current match state |
| `/api/poll` | GET | Poll data and votes |
| `/api/ai/insights` | GET | AI-powered match analysis |
| `/api/events` | GET | Server-Sent Events stream |
| `/api/match/stats` | GET | Detailed match statistics |
| `/api/match/summary` | GET | Match summary overview |
| `/api/match/timeline` | GET | Timeline + ball events |
| `/api/match/win-probability` | GET | Live win probability |
| `/api/connection/status` | GET | Connection health check |

### Admin Endpoints (require X-Admin-Key header)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/state` | PUT | Update match state |
| `/api/poll/vote` | POST | Cast poll vote |
| `/api/quick-score` | POST | Quick score updates |
| `/api/admin/announce` | POST | Send announcement |
| `/api/admin/analytics` | GET | Analytics dashboard |

## 🎤 Voice Commands

Supported voice commands:
- **Navigation**: "Go home", "Show live", "Show stats", "Show predictions", "Show highlights", "Show analytics"
- **Chat**: "Send message [your message]"
- **Control**: "Refresh", "Reload", "Stop voice"

## ⚠️ Troubleshooting

### Server won't start
- Check if port 3000 is already in use
- Try port 5000 (Flask server) instead

### Frontend can't connect to backend
- Ensure server is running: `node backend/server.js`
- Check browser console for errors
- Verify CORS is enabled (it is by default)

### Voice control not working
- Voice control requires Chrome, Edge, or Safari
- Grant microphone permission when prompted
- Speak clearly and wait for the command to register

### Real-time updates not working
- Check SSE connection status indicator
- Verify network connection
- Check browser console for errors

## 📊 Connection Status Indicator

- **Green dot**: Connected to server
- **Yellow dot**: Connecting/retrying
- **Red dot**: Connection failed
- **Gray dot**: Offline

## 🎯 Next Steps

1. **Test the connection**: Run `node test-connection.js`
2. **Start the server**: Use `start-server.bat` or manual start
3. **Open the app**: Navigate to `http://localhost:3000`
4. **Try voice control**: Click the microphone button
5. **Use admin panel**: Go to `http://localhost:3000/admin`
6. **Customize**: Edit `public/styles.css` for custom styling

## 📝 Notes

- The app is ready for production deployment
- All API endpoints are CORS-enabled
- Rate limiting is enabled (100 requests/minute)
- State is persisted in `backend/data/app-state.json`

---

**CricketLive Pro v2.0** - Ready for advanced live cricket streaming! 🏏
