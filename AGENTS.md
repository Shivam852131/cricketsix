# CricketLive Pro - Agent Guidelines

## Project Overview
This is a full-stack cricket streaming platform with:
- User website (index.html) for viewers
- Admin dashboard (admin.html) for content management
- Node.js backend (server.js) for API and real-time updates

## Key Files

### Backend
- `backend/server.js` - Main Express.js server with API endpoints
- `backend/advanced-endpoints.js` - Additional advanced features
- `backend/data/app-state.json` - Persistent application state

### Frontend
- `public/index.html` - User-facing website with live streaming
- `public/admin.html` - Admin control panel
- `public/app.js` - User website JavaScript logic
- `public/admin-sync.js` - Admin sync and utility functions

## API Endpoints

### Public Endpoints (no auth)
- `GET /api/state` - Current application state
- `GET /api/events` - Server-Sent Events stream
- `GET /api/poll` - Poll status
- `GET /api/ai/insights` - AI analysis
- `GET /api/match/stats` - Match statistics

### Admin Endpoints (requires X-Admin-Key header)
- `POST /api/admin/verify` - Verify admin key
- `PUT /api/state` - Update application state
- `POST /api/ai/bulletin` - Publish AI bulletin
- `POST /api/timeline` - Add timeline event
- `POST /api/quick-score` - Quick score update

## Connection Flow

1. User visits `http://localhost:3000`
2. Admin visits `http://localhost:3000/admin`
3. Admin authenticates with key (default: "admin")
4. Both sites connect to backend via SSE for real-time updates
5. Admin changes propagate to user site instantly

## Adding New Features

### 1. Backend API
```javascript
// Add to server.js
app.get('/api/my-endpoint', async (req, res) => {
  try {
    const state = await readState();
    res.json({ ok: true, data: state });
  } catch {
    res.status(500).json({ error: 'Failed' });
  }
});
```

### 2. Admin Panel
- Add UI component in admin.html
- Add JavaScript handler in admin-sync.js
- Use `apiCall()` helper for authenticated requests

### 3. User Website
- Add UI component in index.html
- Add JavaScript handler in app.js
- Use `fetchJson()` helper for API requests

## Testing

Run connection test:
```bash
node test-connection.js
```

## Environment Variables
- `PORT` - Server port (default: 3000)
- `ADMIN_KEY` - Admin authentication key (default: admin)

## Common Tasks

### Update Stream URL
1. Admin panel → Stream tab
2. Enter URL and select platform
3. Click "Go Live"

### Update Score
1. Admin panel → Score tab
2. Enter team score, overs, run rate
3. Click "Update Score" or use quick buttons

### Publish AI Insights
1. Admin panel → AI tab
2. Click "Refresh AI" to generate
3. Click "Push Both" to send to chat and notifications
