// Advanced API Endpoints for CricketLive Pro
// Add these functions to your server.js file

// ==================== ADVANCED ANALYTICS ENDPOINTS ====================

// Get detailed match timeline
app.get("/api/match/timeline", async (_req, res) => {
  try {
    const state = await readState();
    const timeline = state.timelineEvents || [];
    const ballFeed = state.ballFeed || [];
    
    // Combine timeline events with ball events
    const combined = [
      ...timeline.map(e => ({ ...e, type: 'timeline' })),
      ...ballFeed.slice(-20).map(e => ({ ...e, type: 'ball' }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    res.json({ ok: true, timeline: combined.slice(0, 50) });
  } catch {
    res.status(500).json({ error: "Unable to fetch timeline" });
  }
});

// Get win probability over time (simulated)
app.get("/api/match/win-probability", async (_req, res) => {
  try {
    const state = await readState();
    const ballFeed = state.ballFeed || [];
    
    // Calculate win probability based on recent balls
    const recentBalls = ballFeed.slice(-12);
    let team1Prob = 50;
    
    recentBalls.forEach(ball => {
      const runs = ball.runs || 0;
      const wickets = ball.wickets || 0;
      
      if (wickets > 0) team1Prob -= 5;
      else if (runs >= 6) team1Prob += 3;
      else if (runs >= 4) team1Prob += 2;
      else if (runs === 0) team1Prob -= 1;
    });
    
    team1Prob = Math.max(10, Math.min(90, team1Prob));
    
    res.json({
      ok: true,
      team1Probability: team1Prob,
      team2Probability: 100 - team1Prob,
      lastUpdated: new Date().toISOString()
    });
  } catch {
    res.status(500).json({ error: "Unable to calculate win probability" });
  }
});

// Get live match summary
app.get("/api/match/summary", async (_req, res) => {
  try {
    const state = await readState();
    const score = state.score;
    const stream = state.stream;
    
    const summary = {
      match: score.matchTitle,
      teams: {
        team1: { name: score.team1, score: score.team1Score, flag: score.team1Flag },
        team2: { name: score.team2, score: score.team2Score, flag: score.team2Flag }
      },
      status: stream.status,
      overs: score.overs,
      runRate: score.runRate,
      target: score.target,
      batsman: score.batsman,
      bowler: score.bowler,
      lastUpdated: state.updatedAt
    };
    
    res.json({ ok: true, summary });
  } catch {
    res.status(500).json({ error: "Unable to fetch match summary" });
  }
});

// ==================== ENHANCED ADMIN ENDPOINTS ====================

// Bulk update multiple state fields
app.post("/api/admin/bulk-update", requireAdmin, async (req, res) => {
  try {
    const updates = req.body || {};
    const state = await readState();
    const nextState = { ...state };
    
    // Apply updates
    if (updates.score) {
      nextState.score = { ...state.score, ...updates.score };
    }
    if (updates.stream) {
      nextState.stream = { ...state.stream, ...updates.stream };
    }
    if (updates.poll) {
      nextState.poll = { ...state.poll, ...updates.poll };
    }
    
    nextState.updatedAt = new Date().toISOString();
    
    const savedState = await writeState(nextState);
    broadcastStateUpdate(savedState);
    
    res.json({ ok: true, state: savedState });
  } catch {
    res.status(500).json({ error: "Unable to bulk update state" });
  }
});

// Reset match data
app.post("/api/admin/reset-match", requireAdmin, async (req, res) => {
  try {
    const state = await readState();
    const nextState = {
      ...state,
      ballFeed: [],
      timelineEvents: [],
      chatMessages: [],
      updatedAt: new Date().toISOString()
    };
    
    const savedState = await writeState(nextState);
    broadcastStateUpdate(savedState);
    
    res.json({ ok: true, message: "Match data reset successfully" });
  } catch {
    res.status(500).json({ error: "Unable to reset match data" });
  }
});

// ==================== PWA ENDPOINTS ====================

// Service worker manifest
app.get("/manifest.json", (_req, res) => {
  res.json({
    name: "CricketLive Pro",
    short_name: "CricketLive",
    description: "Live cricket streaming and analytics",
    start_url: "/",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#ef4444",
    icons: [
      {
        src: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect fill='%23ef4444' width='100' height='100' rx='20'/><text x='50' y='70' text-anchor='middle' font-size='60'>🏏</text></svg>",
        sizes: "192x192",
        type: "image/svg+xml"
      }
    ]
  });
});

// ==================== REALTIME CONNECTION STATUS ====================

app.get("/api/connection/status", async (_req, res) => {
  res.json({
    ok: true,
    status: "connected",
    server: "CricketLive Pro",
    timestamp: new Date().toISOString(),
    activeConnections: sseClients.size,
    uptime: process.uptime()
  });
});

// ==================== END OF ADVANCED ENDPOINTS ====================
