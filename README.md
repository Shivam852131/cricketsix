# CricketLive Pro - Advanced Live Cricket Streaming

A full-stack cricket streaming platform with real-time updates, AI insights, and advanced analytics.

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation & Running

1. **Install dependencies:**
```bash
cd backend
npm install
```

2. **Start the server:**
```bash
cd backend
node server.js
```

3. **Access the websites:**
- User Website: http://localhost:3000
- Admin Panel: http://localhost:3000/admin
- Admin Key: `admin`

## 📁 Project Structure

```
├── backend/
│   ├── server.js           # Node.js Express server
│   ├── server.py           # Python Flask server (optional)
│   ├── advanced-endpoints.js # Additional API endpoints
│   └── data/
│       └── app-state.json  # Application state storage
├── public/
│   ├── index.html          # User-facing website
│   ├── admin.html          # Admin dashboard
│   ├── app.js              # User website JavaScript
│   ├── admin-sync.js       # Admin sync functions
│   ├── styles.css          # Common styles
│   └── sw.js               # Service worker for PWA
├── test-connection.js      # Connection test script
└── README.md               # This file
```

## 🔧 Features

### User Website (index.html)
- **Live Streaming**: Multi-platform support (YouTube, Kick, Twitch, etc.)
- **Real-time Stats**: Live score updates with ball-by-ball feed
- **AI Insights**: Machine learning predictions and analytics
- **Fan Chat**: Real-time chat with viewers
- **Poll System**: Interactive voting on match outcomes
- **Highlights**: Video highlights and trending moments

### Admin Dashboard (admin.html)
- **Stream Management**: Control live stream URLs and quality
- **Score Updates**: Quick score editing with ball-by-ball control
- **AI Control**: Generate and publish AI insights
- **Content Management**: Edit hero section, stats, predictions
- **Real-time Sync**: Instant updates to user website

### Backend Features
- **Real-time Updates**: Server-Sent Events (SSE) for live data
- **AI Insights**: Rule-based match analysis and predictions
- **State Management**: Persistent application state
- **Rate Limiting**: Protection against excessive requests

## 🔗 API Endpoints

### User Endpoints
- `GET /api/state` - Current application state
- `GET /api/events` - Real-time event stream (SSE)
- `GET /api/poll` - Current poll status
- `GET /api/ai/insights` - AI-generated match insights
- `POST /api/chat` - Send chat message
- `POST /api/poll/vote` - Cast vote in poll

### Admin Endpoints
- `POST /api/admin/verify` - Verify admin key
- `PUT /api/state` - Update application state
- `POST /api/ai/bulletin` - Publish AI bulletin
- `POST /api/timeline` - Add timeline event
- `POST /api/quick-score` - Quick score update

### Advanced Endpoints
- `GET /api/match/timeline` - Combined timeline and ball feed
- `GET /api/match/win-probability` - Win probability over time
- `GET /api/match/summary` - Match summary
- `GET /api/connection/status` - Connection status

## 🔐 Admin Authentication

The admin panel requires an admin key for authentication. The default key is `admin` (configurable via environment variable `ADMIN_KEY`).

## 📊 Data Structure

The application state is stored in `backend/data/app-state.json` with the following structure:

```json
{
  "stream": {
    "url": "stream-url",
    "platform": "custom",
    "status": "live",
    "viewerCount": 0
  },
  "score": {
    "team1": "Team 1",
    "team2": "Team 2",
    "team1Score": "287/6",
    "overs": "45.3",
    "runRate": "6.31"
  },
  "poll": {
    "question": "Who will win?",
    "votes": { "team1": 1234, "team2": 567 }
  },
  "content": {
    "hero": { ... },
    "matchCenter": { ... },
    "predictions": { ... }
  }
}
```

## 🎯 Advanced Features

### AI Match Analysis
- Projected score calculations
- Win probability predictions
- Momentum analysis
- Tactical recommendations

### Real-time Streaming
- Multiple platform support
- Mobile camera streaming
- Adaptive quality selection
- Picture-in-picture support

### Analytics Dashboard
- Viewer trends
- Geographic distribution
- Performance metrics

## 🚨 Troubleshooting

### Server won't start
```bash
# Check if port 3000 is in use
netstat -ano | findstr :3000

# Kill existing process
taskkill /F /PID <PID>

# Or use a different port
PORT=3001 node server.js
```

### Connection issues
- Check if backend server is running
- Verify port 3000 is not blocked
- Check browser console for errors

### Data not updating
- Refresh the page
- Check server logs
- Verify SSE connection is active

## 🔄 Development

### Running both Node.js and Python servers
```bash
# Terminal 1 - Node.js server
cd backend && node server.js

# Terminal 2 - Python server (optional)
cd backend && python server.py
```

### Testing the connection
```bash
node test-connection.js
```

## 📝 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |
| `ADMIN_KEY` | admin | Admin authentication key |

## 🔒 Security Notes

- The admin key should be changed in production
- Enable HTTPS for secure connections
- Consider adding rate limiting for chat messages
- Validate and sanitize all user inputs

## 🎨 Customization

### Changing Colors
Edit the `styles.css` file or the Tailwind config in `index.html`:

```css
:root {
  --primary: #ef4444;  /* Red */
  --secondary: #f97316; /* Orange */
}
```

### Adding New Features
1. Add API endpoint in `server.js`
2. Add UI component in `index.html` or `admin.html`
3. Add JavaScript handler in `app.js` or admin scripts

## 📚 License

This project is provided as-is for educational and development purposes.

## 🙏 Credits

- Built with Node.js, Express, and vanilla JavaScript
- Real-time updates using Server-Sent Events (SSE)
- Streaming support for YouTube, Kick, Twitch, and more
