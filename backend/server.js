const express = require("express");
const cors = require("cors");
const path = require("path");
const OpenAI = require("openai");
const admin = require("firebase-admin");

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// ==================== FIREBASE INITIALIZATION ====================
try {
    // For Railway deployment, use environment credentials
    // For local development, use serviceAccount.json if available
    let credential;
    
    if (process.env.RAILWAY_ENVIRONMENT || process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        // Railway or environment-based credentials
        credential = admin.credential.applicationDefault();
        console.log("✓ Using environment credentials for Firebase");
    } else {
        // Try serviceAccount.json for local development
        try {
            credential = admin.credential.cert(require("./serviceAccount.json"));
            console.log("✓ Using serviceAccount.json for Firebase");
        } catch (e) {
            // Fallback to application default
            credential = admin.credential.applicationDefault();
            console.log("✓ Using application default credentials");
        }
    }
    
    admin.initializeApp({
        credential: credential,
        databaseURL: "https://cricketsix26-default-rtdb.firebaseio.com"
    });
    console.log("✓ Firebase Admin initialized");
} catch (error) {
    console.log("⚠ Firebase initialization failed:", error.message);
    console.log("→ Running in offline mode");
}

const db = admin.database();

// ==================== MIDDLEWARE ====================
app.use(cors({
    origin: ["http://localhost:3000", "https://cricketsix26.web.app"],
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, "..", "public")));

// ==================== ADMIN KEY ====================
const ADMIN_KEY = process.env.ADMIN_KEY || "cricketlive2026";

// ==================== HELPER FUNCTIONS ====================
function requireAdmin(req, res, next) {
    const key = req.headers['x-admin-key'] || req.body.adminKey;
    if (key !== ADMIN_KEY) {
        return res.status(401).json({ error: "Unauthorized - Invalid admin key" });
    }
    next();
}

function buildMessageId() {
    return String(Date.now()) + "-" + Math.random().toString(36).slice(2, 8);
}

// ==================== REAL-TIME EVENT HANDLING ====================
const sseClients = new Set();

function broadcastEvent(type, data) {
    const eventData = `data: ${JSON.stringify({ type, data })}\n\n`;
    sseClients.forEach(client => {
        try {
            client.res.write(eventData);
        } catch (e) {
            // Client disconnected
        }
    });
}

// ==================== API ROUTES ====================

// Health check
app.get("/api/health", (req, res) => {
    res.json({ ok: true, service: "cricketlive-pro-api" });
});

// ==================== ADMIN ROUTES ====================

// Admin login verification
app.post("/api/admin/verify", (req, res) => {
    const { key } = req.body;
    if (key === ADMIN_KEY) {
        res.json({ ok: true, message: "Admin verified" });
    } else {
        res.status(401).json({ error: "Invalid admin key" });
    }
});

// Get all state data
app.get("/api/state", async (req, res) => {
    try {
        const snapshot = await db.ref('state').once('value');
        res.json(snapshot.val() || {});
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update state
app.put("/api/state", requireAdmin, async (req, res) => {
    try {
        await db.ref('state').set({
            ...req.body,
            updatedAt: admin.database.ServerValue.TIMESTAMP
        });
        broadcastEvent('state-update', req.body);
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== MATCH MANAGEMENT ====================

// Get all matches
app.get("/api/matches", async (req, res) => {
    try {
        const liveSnapshot = await db.ref('matches/live').once('value');
        const upcomingSnapshot = await db.ref('matches/upcoming').once('value');
        const resultsSnapshot = await db.ref('matches/results').once('value');
        
        res.json({
            live: liveSnapshot.val() || [],
            upcoming: upcomingSnapshot.val() || [],
            results: resultsSnapshot.val() || []
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update match
app.put("/api/matches/:id", requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await db.ref(`matches/live/${id}`).set({
            ...req.body,
            updatedAt: admin.database.ServerValue.TIMESTAMP
        });
        broadcastEvent('match-update', { id, ...req.body });
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== SCORE MANAGEMENT ====================

// Get current score
app.get("/api/score", async (req, res) => {
    try {
        const snapshot = await db.ref('state/score').once('value');
        res.json(snapshot.val() || {});
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update score
app.put("/api/score", requireAdmin, async (req, res) => {
    try {
        await db.ref('state/score').set({
            ...req.body,
            updatedAt: admin.database.ServerValue.TIMESTAMP
        });
        broadcastEvent('score-update', req.body);
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Quick score events
app.post("/api/score/event", requireAdmin, async (req, res) => {
    try {
        const { type, runs, wickets } = req.body;
        const event = {
            id: buildMessageId(),
            type,
            runs: runs || 0,
            wickets: wickets || 0,
            timestamp: new Date().toISOString()
        };
        
        await db.ref('ballFeed').push(event);
        broadcastEvent('ball-feed', event);
        res.json({ ok: true, event });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== STREAM MANAGEMENT ====================

// Get stream info
app.get("/api/stream", async (req, res) => {
    try {
        const snapshot = await db.ref('state/stream').once('value');
        res.json(snapshot.val() || {});
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update stream
app.put("/api/stream", requireAdmin, async (req, res) => {
    try {
        await db.ref('state/stream').set({
            ...req.body,
            updatedAt: admin.database.ServerValue.TIMESTAMP
        });
        broadcastEvent('stream-update', req.body);
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== CHAT MANAGEMENT ====================

// Get chat messages
app.get("/api/chat", async (req, res) => {
    try {
        const snapshot = await db.ref('chat').limitToLast(50).once('value');
        const messages = [];
        snapshot.forEach(child => {
            messages.push(child.val());
        });
        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Post chat message
app.post("/api/chat", async (req, res) => {
    try {
        const { username, content } = req.body;
        const message = {
            id: buildMessageId(),
            username: username || "Anonymous",
            content,
            timestamp: new Date().toISOString()
        };
        
        await db.ref('chat').push(message);
        broadcastEvent('chat-message', message);
        res.json({ ok: true, message });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete chat message (admin)
app.delete("/api/chat/:id", requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        // Find and delete message by ID
        const snapshot = await db.ref('chat').once('value');
        snapshot.forEach(child => {
            if (child.val().id === id) {
                child.ref.remove();
            }
        });
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== POLL MANAGEMENT ====================

// Get poll
app.get("/api/poll", async (req, res) => {
    try {
        const snapshot = await db.ref('state/poll').once('value');
        res.json(snapshot.val() || { question: "", votes: { team1: 0, team2: 0 } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update poll (admin)
app.put("/api/poll", requireAdmin, async (req, res) => {
    try {
        await db.ref('state/poll').set(req.body);
        broadcastEvent('poll-update', req.body);
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Vote in poll
app.post("/api/poll/vote", async (req, res) => {
    try {
        const { team } = req.body;
        const pollRef = db.ref('state/poll/votes');
        
        if (team === 1) {
            await pollRef.transaction(current => (current || 0) + 1);
        } else if (team === 2) {
            await pollRef.transaction(current => (current || 0) + 1);
        }
        
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== AI INSIGHTS ====================

// Get AI insights
app.get("/api/ai/insights", async (req, res) => {
    try {
        const snapshot = await db.ref('state/aiInsights').once('value');
        res.json(snapshot.val() || {
            summary: "Match in progress",
            narrative: "Both teams are performing well in this exciting match.",
            phase: "Middle Overs",
            momentum: "Balanced",
            projected: "280-300",
            chaseable: "Yes",
            requiredRR: "6.5"
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update AI insights (admin)
app.put("/api/ai/insights", requireAdmin, async (req, res) => {
    try {
        await db.ref('state/aiInsights').set(req.body);
        broadcastEvent('ai-insights-update', req.body);
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== CONTENT MANAGEMENT ====================

// Get all content
app.get("/api/content", async (req, res) => {
    try {
        const snapshot = await db.ref('content').once('value');
        res.json(snapshot.val() || {});
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update content section
app.put("/api/content/:section", requireAdmin, async (req, res) => {
    try {
        const { section } = req.params;
        await db.ref(`content/${section}`).set(req.body);
        broadcastEvent('content-update', { section, data: req.body });
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== TIMELINE EVENTS ====================

// Get timeline events
app.get("/api/timeline", async (req, res) => {
    try {
        const snapshot = await db.ref('timelineEvents').limitToLast(50).once('value');
        const events = [];
        snapshot.forEach(child => {
            events.push(child.val());
        });
        res.json(events.reverse());
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add timeline event
app.post("/api/timeline", requireAdmin, async (req, res) => {
    try {
        const event = {
            id: buildMessageId(),
            ...req.body,
            timestamp: new Date().toISOString()
        };
        
        await db.ref('timelineEvents').push(event);
        broadcastEvent('timeline-event', event);
        res.json({ ok: true, event });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete timeline event
app.delete("/api/timeline/:id", requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const snapshot = await db.ref('timelineEvents').once('value');
        snapshot.forEach(child => {
            if (child.val().id === id) {
                child.ref.remove();
            }
        });
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Clear all timeline events
app.delete("/api/timeline", requireAdmin, async (req, res) => {
    try {
        await db.ref('timelineEvents').remove();
        broadcastEvent('timeline-clear', {});
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== NOTIFICATIONS ====================

// Push notification
app.post("/api/notifications", requireAdmin, async (req, res) => {
    try {
        const notification = {
            id: buildMessageId(),
            message: req.body.message,
            timestamp: new Date().toISOString()
        };
        
        await db.ref('notifications').push(notification);
        broadcastEvent('notification', notification);
        res.json({ ok: true, notification });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== LANGUAGE MANAGEMENT ====================

// Get translations
app.get("/api/translations", async (req, res) => {
    try {
        const snapshot = await db.ref('translations').once('value');
        res.json(snapshot.val() || {});
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update translation
app.put("/api/translations/:lang/:key", requireAdmin, async (req, res) => {
    try {
        const { lang, key } = req.params;
        await db.ref(`translations/${lang}/${key}`).set(req.body.value);
        broadcastEvent('translation-update', { lang, key, value: req.body.value });
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== HIGHLIGHTS MANAGEMENT ====================

// Get highlights
app.get("/api/highlights", async (req, res) => {
    try {
        const snapshot = await db.ref('highlights').once('value');
        res.json(snapshot.val() || { featured: {}, items: [], stats: [], trending: [] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add highlight
app.post("/api/highlights", requireAdmin, async (req, res) => {
    try {
        const highlight = {
            id: buildMessageId(),
            ...req.body,
            timestamp: new Date().toISOString()
        };
        
        await db.ref('highlights/items').push(highlight);
        broadcastEvent('highlight-add', highlight);
        res.json({ ok: true, highlight });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== REAL-TIME EVENTS (SSE) ====================

app.get("/api/events", (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const client = { res };
    sseClients.add(client);
    
    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Real-time connection established' })}\n\n`);
    
    req.on('close', () => {
        sseClients.delete(client);
    });
});

// ==================== SERVE STATIC FILES ====================

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

app.get("/admin", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "public", "admin.html"));
});

app.get("/admin.html", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "public", "admin.html"));
});

// ==================== START SERVER ====================

app.listen(PORT, () => {
    console.log(`\n🏏 CricketLive Pro Backend`);
    console.log(`✓ Server running on port ${PORT}`);
    console.log(`✓ Admin key: ${ADMIN_KEY}`);
    console.log(`✓ Firebase: ${db ? 'Connected' : 'Offline mode'}`);
    console.log(`\nAccess:`);
    console.log(`  Main Site: http://localhost:${PORT}`);
    console.log(`  Admin Panel: http://localhost:${PORT}/admin`);
    console.log(`  API Base: http://localhost:${PORT}/api`);
    console.log(`\nPress Ctrl+C to stop\n`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down gracefully...');
    sseClients.forEach(client => {
        client.res.end();
    });
    process.exit(0);
});
