const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');

admin.initializeApp();
const db = admin.database();
const app = express();

app.use(cors({ origin: true }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'cricketlive-pro-api' });
});

// Get state endpoint
app.get('/api/state', async (req, res) => {
  try {
    const snapshot = await db.ref('state').once('value');
    res.json(snapshot.val() || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update state endpoint
app.put('/api/state', async (req, res) => {
  try {
    await db.ref('state').set({
      ...req.body,
      updatedAt: admin.database.ServerValue.TIMESTAMP
    });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// AI insights endpoint
app.get('/api/ai/insights', async (req, res) => {
  try {
    // Return mock AI insights
    res.json({
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

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const message = {
      id: Date.now().toString(),
      username: req.body.username || 'Anonymous',
      content: req.body.content,
      timestamp: new Date().toISOString()
    };
    await db.ref('chat').push().set(message);
    res.json({ ok: true, message });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Events endpoint (SSE)
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  const listener = db.ref('state').on('value', (snapshot) => {
    res.write(`data: ${JSON.stringify({ type: 'state-update', data: snapshot.val() })}\n\n`);
  });
  
  req.on('close', () => {
    db.ref('state').off('value', listener);
  });
});

exports.api = functions.https.onRequest(app);
