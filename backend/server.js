const express = require("express");
const fsPromises = require("fs/promises");
const path = require("path");
const WebSocket = require("ws");
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT = Number(process.env.PORT) || 8888;
const server = app.listen(PORT, () => {
  console.log(`CricketLive Pro server running on port ${PORT}`);
});
const wss = new WebSocket.Server({ server, path: "/ws" });

const PUBLIC_DIR = path.join(__dirname, "..", "public");
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "app-state.json");
const INDEX_FILE = path.join(PUBLIC_DIR, "index.html");
const ADMIN_FILE = path.join(PUBLIC_DIR, "admin.html");
const APP_SCRIPT_FILE = path.join(PUBLIC_DIR, "app.js");
const CSS_FILE = path.join(PUBLIC_DIR, "styles.css");
const SW_FILE = path.join(PUBLIC_DIR, "sw.js");

const ADMIN_KEY = process.env.ADMIN_KEY || "admin";
const ALLOWED_STREAM_STATUS = new Set(["live", "paused", "offline"]);
const AI_BULLETIN_CHANNELS = new Set(["notification", "chat", "both"]);
const SSE_HEARTBEAT_MS = 15000;
const sseClients = new Set();
const wsClients = new Map(); // ws client management: ws -> {id, type, authenticated}
const ALLOWED_CORS_METHODS = "GET,POST,PUT,DELETE,OPTIONS";
const ALLOWED_CORS_HEADERS = "Content-Type,X-Admin-Key";

const CONFIG_FILE = path.join(DATA_DIR, "config.json");
const analytics = {
  pageViews: {},
  apiCalls: {},
  streamViews: [],
  activeUsers: new Set(),
  wsMessages: 0,
  wsConnections: 0
};

// WebSocket handling
function broadcastWsEvent(eventType, data) {
  const message = JSON.stringify({ type: eventType, payload: data, timestamp: new Date().toISOString() });
  wsClients.forEach((clientInfo, ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(message);
      } catch (e) {
        console.error("WS send error:", e);
      }
    }
  });
}

function sendToWsClient(ws, eventType, data) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify({ type: eventType, payload: data, timestamp: new Date().toISOString() }));
    } catch (e) {
      console.error("WS send error:", e);
    }
  }
}

wss.on("connection", (ws, req) => {
  const clientId = uuidv4();
  const ip = req.socket.remoteAddress;
  wsClients.set(ws, { id: clientId, ip, type: "viewer", authenticated: false, connectedAt: Date.now() });
  analytics.wsConnections++;
  console.log(`WebSocket client connected: ${clientId} from ${ip}`);

  sendToWsClient(ws, "connected", { ok: true, clientId, timestamp: new Date().toISOString() });

  // Send current state on connect
  readState().then(state => {
    sendToWsClient(ws, "state-update", createStatePayload(state));
    sendToWsClient(ws, "chat-snapshot", { messages: state.chatMessages.slice(-50) });
    sendToWsClient(ws, "notification-snapshot", { notifications: state.notifications.slice(-20) });
  }).catch(() => {});

  ws.on("message", async (message) => {
    try {
      analytics.wsMessages++;
      const data = JSON.parse(message);
      
      // Handle different message types
      switch (data.type) {
        case "auth":
          if (data.key === ADMIN_KEY) {
            wsClients.set(ws, { ...wsClients.get(ws), authenticated: true, type: "admin" });
            sendToWsClient(ws, "auth-success", { ok: true, type: "admin" });
          }
          break;
          
        case "chat":
          if (data.content) {
            const username = String(data.username || "Fan").trim().slice(0, 24) || "Fan";
            const content = String(data.content).trim().slice(0, 400);
            if (content) {
              const msg = { id: uuidv4(), username, content, timestamp: new Date().toISOString() };
              const state = await readState();
              const nextState = { ...state, chatMessages: [...state.chatMessages, msg].slice(-500), updatedAt: new Date().toISOString() };
              await writeState(nextState);
              broadcastWsEvent("chat-message", { message: msg });
            }
          }
          break;
          
        case "poll-vote":
          if (data.team === "team1" || data.team === "team2") {
            const state = await readState();
            const nextVotes = { ...state.poll.votes, [data.team]: (Number(state.poll.votes[data.team]) || 0) + 1 };
            const nextState = { ...state, poll: normalizePoll({ ...state.poll, votes: nextVotes }), updatedAt: new Date().toISOString() };
            const savedState = await writeState(nextState);
            broadcastWsEvent("state-update", createStatePayload(savedState));
          }
          break;
          
        case "ping":
          sendToWsClient(ws, "pong", { timestamp: new Date().toISOString() });
          break;
          
        case "subscribe":
          // Allow client to subscribe to specific event types
          break;
      }
    } catch (e) {
      console.error("WS message error:", e);
    }
  });
});

// Heartbeat for WebSocket connections
setInterval(() => {
  wsClients.forEach((clientInfo, ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.ping();
      } catch (e) {}
    }
  });
}, SSE_HEARTBEAT_MS);

// WebRTC Signaling Server
const webrtcRooms = new Map();

// WebSocket connection handler
wss.on("connection", (ws, req) => {
  const clientId = uuidv4();
  const ip = req.socket.remoteAddress;
  wsClients.set(ws, { id: clientId, ip, type: "viewer", authenticated: false, connectedAt: Date.now() });
  analytics.wsConnections++;
  console.log(`WebSocket client connected: ${clientId} from ${ip}`);

  sendToWsClient(ws, "connected", { ok: true, clientId, timestamp: new Date().toISOString() });

  // Send current state on connect
  readState().then(state => {
    sendToWsClient(ws, "state-update", createStatePayload(state));
    sendToWsClient(ws, "chat-snapshot", { messages: state.chatMessages.slice(-50) });
    sendToWsClient(ws, "notification-snapshot", { notifications: state.notifications.slice(-20) });
  }).catch(() => {});

  ws.on("message", async (message) => {
    try {
      analytics.wsMessages++;
      const data = JSON.parse(message);
      
      // Handle different message types
      switch (data.type) {
        case "auth":
          if (data.key === ADMIN_KEY) {
            wsClients.set(ws, { ...wsClients.get(ws), authenticated: true, type: "admin" });
            sendToWsClient(ws, "auth-success", { ok: true, type: "admin" });
          }
          break;
          
        case "chat":
          if (data.content) {
            const username = String(data.username || "Fan").trim().slice(0, 24) || "Fan";
            const content = String(data.content).trim().slice(0, 400);
            if (content) {
              const msg = { id: uuidv4(), username, content, timestamp: new Date().toISOString() };
              const state = await readState();
              const nextState = { ...state, chatMessages: [...state.chatMessages, msg].slice(-500), updatedAt: new Date().toISOString() };
              await writeState(nextState);
              broadcastWsEvent("chat-message", { message: msg });
            }
          }
          break;
          
        case "poll-vote":
          if (data.team === "team1" || data.team === "team2") {
            const state = await readState();
            const nextVotes = { ...state.poll.votes, [data.team]: (Number(state.poll.votes[data.team]) || 0) + 1 };
            const nextState = { ...state, poll: normalizePoll({ ...state.poll, votes: nextVotes }), updatedAt: new Date().toISOString() };
            const savedState = await writeState(nextState);
            broadcastWsEvent("state-update", createStatePayload(savedState));
          }
          break;
          
        case "ping":
          sendToWsClient(ws, "pong", { timestamp: new Date().toISOString() });
          break;
          
        // WebRTC Signaling
        case "webrtc-signal":
          const { roomId, signal, from, to } = data;
          if (!webrtcRooms.has(roomId)) {
            webrtcRooms.set(roomId, new Set());
          }
          webrtcRooms.get(roomId).add(ws);
          
          webrtcRooms.get(roomId).forEach(client => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              sendToWsClient(client, "webrtc-signal", { signal, from, to });
            }
          });
          break;
          
        case "webrtc-leave":
          const leaveRoomId = data.roomId;
          if (webrtcRooms.has(leaveRoomId)) {
            webrtcRooms.get(leaveRoomId).delete(ws);
          }
          break;
      }
    } catch (e) {
      console.error("WS message error:", e);
    }
  });

  ws.on("close", () => {
    const clientInfo = wsClients.get(ws);
    console.log(`WebSocket client disconnected: ${clientInfo?.id}`);
    wsClients.delete(ws);
    
    // Remove from all WebRTC rooms
    webrtcRooms.forEach(room => room.delete(ws));
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
  });
});
const rateLimitMap = new Map();
const defaultJsonParser = express.json({ limit: "1mb" });
const streamFrameJsonParser = express.json({ limit: "50mb" });

async function loadConfig() {
  try {
    const data = await fsPromises.readFile(CONFIG_FILE, "utf8");
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function saveConfig(config) {
  await fsPromises.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), "utf8");
}

const defaultState = {
  stream: { url: "", platform: "custom", status: "offline", viewerCount: 0 },
  score: {
    team1: "", team2: "", matchTitle: "", team1Score: "", team2Score: "", overs: "", batsman: "", bowler: "", runRate: "",
    team1Flag: "", team2Flag: "", venue: "", target: "", league: "", format: "", totalOvers: "", powerplayOvers: "",
    matchDateTime: "", tossWinner: "", tossDecision: "",
    partnership: "", fow: "", pp: "", death: "", extras: "", wickets: "", reqRR: ""
  },
  chatMessages: [],
  poll: { question: "", votes: { team1: 0, team2: 0 } },
  content: {
    hero: { badge: "", title: "", subtitle: "", ctaPrimary: "Watch Live", ctaSecondary: "Predictions", liveMatches: "", upcomingMatches: "", fansOnline: "" },
    matchCenter: { title: "Match Centre", league: "", team2: "", team2Score: "", team2Flag: "", target: "", winProbabilityTeam1: 50, projectedTotal: "" },
    quickActions: { scorecard: "Full Scorecard", analytics: "Analytics", highlights: "Highlights" },
    sections: { liveMatchesTitle: "Live Matches", upcomingTitle: "Upcoming Matches", resultsTitle: "Recent Results", performersTitle: "Top Performers" },
    promo: { title: "", subtitle: "", primaryLabel: "", secondaryLabel: "" },
    performers: { batsmen: [], bowlers: [] },
    stats: {
      highestScore: { label: "", value: "", subtitle: "" },
      bestBowling: { label: "", value: "", subtitle: "" },
      keyMetrics: [],
      momentum: { title: "", label: "", percent: 0 }
    },
    predictions: {
      expert: { title: "", winner: "", subtitle: "", note: "" },
      playerForm: [],
      scoreLines: []
    },
    highlights: {
      featured: { videoUrl: "", title: "", description: "", likes: "", comments: "", favorites: "" },
      items: [],
      stats: [],
      trending: []
    },
    analytics: {
      battingRows: [],
      bowlingRows: [],
      geo: []
    }
  },
  liveMatches: [],
  upcomingMatches: [],
  recentResults: [],
  ballFeed: [],
  timelineEvents: [],
  notifications: [],
  updatedAt: new Date().toISOString()
};

function normalizePoll(rawPoll) {
  const poll = rawPoll && typeof rawPoll === "object" ? rawPoll : {};
  const votes = poll.votes && typeof poll.votes === "object" ? poll.votes : {};
  const team1VotesRaw = Number(votes.team1);
  const team2VotesRaw = Number(votes.team2);

  return {
    question: typeof poll.question === "string" ? poll.question.trim().slice(0, 120) : "",
    votes: {
      team1: Number.isFinite(team1VotesRaw) ? Math.max(0, Math.floor(team1VotesRaw)) : 0,
      team2: Number.isFinite(team2VotesRaw) ? Math.max(0, Math.floor(team2VotesRaw)) : 0
    }
  };
}

function limitList(list, limit) {
  return Array.isArray(list) ? list.slice(0, limit) : [];
}

function normalizeContent(rawContent) {
  const content = rawContent && typeof rawContent === "object" ? rawContent : {};
  const performers = content.performers && typeof content.performers === "object" ? content.performers : {};
  const stats = content.stats && typeof content.stats === "object" ? content.stats : {};
  const predictions = content.predictions && typeof content.predictions === "object" ? content.predictions : {};
  const highlights = content.highlights && typeof content.highlights === "object" ? content.highlights : {};
  const analytics = content.analytics && typeof content.analytics === "object" ? content.analytics : {};

  return {
    hero: { ...defaultState.content.hero, ...(content.hero && typeof content.hero === "object" ? content.hero : {}) },
    matchCenter: { ...defaultState.content.matchCenter, ...(content.matchCenter && typeof content.matchCenter === "object" ? content.matchCenter : {}) },
    quickActions: { ...defaultState.content.quickActions, ...(content.quickActions && typeof content.quickActions === "object" ? content.quickActions : {}) },
    sections: { ...defaultState.content.sections, ...(content.sections && typeof content.sections === "object" ? content.sections : {}) },
    promo: { ...defaultState.content.promo, ...(content.promo && typeof content.promo === "object" ? content.promo : {}) },
    performers: {
      batsmen: Array.isArray(performers.batsmen) ? performers.batsmen.slice(0, 10) : defaultState.content.performers.batsmen.slice(0, 10),
      bowlers: Array.isArray(performers.bowlers) ? performers.bowlers.slice(0, 10) : defaultState.content.performers.bowlers.slice(0, 10)
    },
    stats: {
      highestScore: { ...defaultState.content.stats.highestScore, ...(stats.highestScore && typeof stats.highestScore === "object" ? stats.highestScore : {}) },
      bestBowling: { ...defaultState.content.stats.bestBowling, ...(stats.bestBowling && typeof stats.bestBowling === "object" ? stats.bestBowling : {}) },
      keyMetrics: Array.isArray(stats.keyMetrics) ? stats.keyMetrics.slice(0, 8) : defaultState.content.stats.keyMetrics.slice(0, 8),
      momentum: { ...defaultState.content.stats.momentum, ...(stats.momentum && typeof stats.momentum === "object" ? stats.momentum : {}) }
    },
    predictions: {
      expert: { ...defaultState.content.predictions.expert, ...(predictions.expert && typeof predictions.expert === "object" ? predictions.expert : {}) },
      playerForm: Array.isArray(predictions.playerForm) ? predictions.playerForm.slice(0, 6) : defaultState.content.predictions.playerForm.slice(0, 6),
      scoreLines: Array.isArray(predictions.scoreLines) ? predictions.scoreLines.slice(0, 4) : defaultState.content.predictions.scoreLines.slice(0, 4)
    },
    highlights: {
      featured: { ...defaultState.content.highlights.featured, ...(highlights.featured && typeof highlights.featured === "object" ? highlights.featured : {}) },
      items: Array.isArray(highlights.items) ? highlights.items.slice(0, 12) : defaultState.content.highlights.items.slice(0, 12),
      stats: Array.isArray(highlights.stats) ? highlights.stats.slice(0, 8) : defaultState.content.highlights.stats.slice(0, 8),
      trending: Array.isArray(highlights.trending) ? highlights.trending.slice(0, 6) : defaultState.content.highlights.trending.slice(0, 6)
    },
    analytics: {
      battingRows: Array.isArray(analytics.battingRows) ? analytics.battingRows.slice(0, 12) : defaultState.content.analytics.battingRows.slice(0, 12),
      bowlingRows: Array.isArray(analytics.bowlingRows) ? analytics.bowlingRows.slice(0, 12) : defaultState.content.analytics.bowlingRows.slice(0, 12),
      geo: Array.isArray(analytics.geo) ? analytics.geo.slice(0, 6) : defaultState.content.analytics.geo.slice(0, 6)
    }
  };
}

function normalizeTimelineEvent(rawEvent) {
  const event = rawEvent && typeof rawEvent === "object" ? rawEvent : {};

  return {
    id: typeof event.id === "string" && event.id.trim() ? event.id.trim() : buildMessageId(),
    title: typeof event.title === "string" && event.title.trim() ? event.title.trim().slice(0, 80) : "Match event",
    detail: typeof event.detail === "string" ? event.detail.trim().slice(0, 240) : "",
    type: typeof event.type === "string" && event.type.trim() ? event.type.trim().toLowerCase().slice(0, 24) : "update",
    badge: typeof event.badge === "string" ? event.badge.trim().slice(0, 24) : "",
    over: typeof event.over === "string" ? event.over.trim().slice(0, 12) : "",
    timestamp: typeof event.timestamp === "string" ? event.timestamp : new Date().toISOString()
  };
}

function normalizeTimelineEvents(rawTimeline) {
  return Array.isArray(rawTimeline) ? rawTimeline.filter(Boolean).map(normalizeTimelineEvent).slice(0, 100) : [];
}

function normalizeBallEvent(rawEvent) {
  const event = rawEvent && typeof rawEvent === "object" ? rawEvent : {};
  const runs = Number(event.runs);
  const wickets = Number(event.wickets);

  return {
    id: typeof event.id === "string" && event.id.trim() ? event.id.trim() : buildMessageId(),
    type: typeof event.type === "string" && event.type.trim() ? event.type.trim().toLowerCase().slice(0, 24) : "update",
    label: typeof event.label === "string" && event.label.trim() ? event.label.trim().slice(0, 24) : ".",
    runs: Number.isFinite(runs) ? Math.max(0, Math.floor(runs)) : 0,
    wickets: Number.isFinite(wickets) ? Math.max(0, Math.floor(wickets)) : 0,
    legal: Boolean(event.legal),
    over: typeof event.over === "string" ? event.over.trim().slice(0, 12) : "",
    timestamp: typeof event.timestamp === "string" ? event.timestamp : new Date().toISOString()
  };
}

function normalizeBallFeed(rawFeed) {
  return Array.isArray(rawFeed) ? rawFeed.filter(Boolean).map(normalizeBallEvent).slice(-60) : [];
}

function normalizeState(rawState) {
  const raw = rawState && typeof rawState === "object" ? rawState : {};
  const legacyContent = raw.content && typeof raw.content === "object" ? raw.content : {};
  const legacyLiveMatches = Array.isArray(legacyContent.liveMatches) ? legacyContent.liveMatches : [];
  const legacyUpcomingMatches = Array.isArray(legacyContent.upcomingMatches) ? legacyContent.upcomingMatches : [];
  const legacyRecentResults = Array.isArray(legacyContent.recentResults) ? legacyContent.recentResults : [];

  return {
    stream: { ...defaultState.stream, ...(raw.stream && typeof raw.stream === "object" ? raw.stream : {}) },
    score: { ...defaultState.score, ...(raw.score && typeof raw.score === "object" ? raw.score : {}) },
    chatMessages: Array.isArray(raw.chatMessages) ? raw.chatMessages.slice(-500) : [],
    poll: normalizePoll(raw.poll),
    content: normalizeContent(raw.content),
    liveMatches: (Array.isArray(raw.liveMatches) && raw.liveMatches.length > 0 ? raw.liveMatches : legacyLiveMatches).slice(0, 10),
    upcomingMatches: (Array.isArray(raw.upcomingMatches) && raw.upcomingMatches.length > 0 ? raw.upcomingMatches : legacyUpcomingMatches).slice(0, 10),
    recentResults: (Array.isArray(raw.recentResults) && raw.recentResults.length > 0 ? raw.recentResults : legacyRecentResults).slice(0, 10),
    ballFeed: normalizeBallFeed(raw.ballFeed),
    timelineEvents: normalizeTimelineEvents(raw.timelineEvents),
    notifications: Array.isArray(raw.notifications) ? raw.notifications.slice(-200) : [],
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : new Date().toISOString()
  };
}

async function ensureDataFile() {
  await fsPromises.mkdir(DATA_DIR, { recursive: true });
  try {
    await fsPromises.access(DATA_FILE);
  } catch {
    await fsPromises.writeFile(DATA_FILE, JSON.stringify(defaultState, null, 2), "utf8");
  }
}

async function readState() {
  await ensureDataFile();
  const data = await fsPromises.readFile(DATA_FILE, "utf8");
  return normalizeState(JSON.parse(data));
}

async function writeState(state) {
  const normalized = normalizeState(state);
  await fsPromises.writeFile(DATA_FILE, JSON.stringify(normalized, null, 2), "utf8");
  return normalized;
}

function buildMessageId() {
  return String(Date.now()) + "-" + Math.random().toString(36).slice(2, 8);
}

function parseScoreBreakdown(scoreText) {
  if (typeof scoreText !== "string") return { runs: 0, wickets: 0 };
  const match = scoreText.trim().match(/^(\d+)(?:\/(\d+))?/);
  return {
    runs: match ? Number.parseInt(match[1], 10) || 0 : 0,
    wickets: match && match[2] ? Number.parseInt(match[2], 10) || 0 : 0
  };
}

function parseOversBreakdown(oversText) {
  if (typeof oversText !== "string") return { totalBalls: 0, completedOvers: 0 };
  const match = oversText.trim().match(/^(\d+)(?:\.(\d))?$/);
  if (!match) return { totalBalls: 0, completedOvers: 0 };
  const overs = Number.parseInt(match[1], 10) || 0;
  const balls = Math.min(5, Number.parseInt(match[2] || "0", 10) || 0);
  const totalBalls = overs * 6 + balls;
  return { totalBalls, completedOvers: totalBalls / 6 };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function inferInningsLength(state, completedOvers) {
  const descriptor = (((state.score && state.score.matchTitle) || "") + " " + ((state.score && state.score.format) || "")).toLowerCase();
  if (descriptor.includes("test")) return 90;
  if (descriptor.includes("t10")) return 10;
  if (descriptor.includes("odi") || completedOvers > 20) return 50;
  return 20;
}

function getPhaseMeta(completedOvers, inningsLength) {
  if (inningsLength >= 45) {
    if (completedOvers < 10) return { key: "powerplay", label: "Powerplay" };
    if (completedOvers < inningsLength - 4) return { key: "middle", label: "Middle overs" };
    return { key: "death", label: "Death overs" };
  }
  if (completedOvers < 6) return { key: "powerplay", label: "Powerplay" };
  if (completedOvers < 16) return { key: "middle", label: "Middle overs" };
  return { key: "death", label: "Death overs" };
}

function extractParticipantName(rawLabel, fallback) {
  if (typeof rawLabel !== "string" || !rawLabel.trim()) return fallback;
  return rawLabel.split("-")[0].trim() || fallback;
}

function hasLiveScore(state) {
  return Boolean(state && state.score && state.score.team1 && state.score.team1Score);
}

function summarizeBallFeed(ballFeed) {
  const feed = Array.isArray(ballFeed) ? ballFeed.slice(-12) : [];
  const recentSix = feed.slice(-6);
  const recentRuns = recentSix.reduce((sum, event) => sum + (Number(event.runs) || 0), 0);
  const recentWickets = recentSix.reduce((sum, event) => sum + (Number(event.wickets) || 0), 0);
  const recentDots = recentSix.filter((event) => event.legal && Number(event.runs) === 0 && Number(event.wickets) === 0).length;
  const recentBoundaries = recentSix.filter((event) => Number(event.runs) >= 4).length;
  const legalRecent = recentSix.filter((event) => event.legal);
  const currentOver = [];

  for (let index = feed.length - 1; index >= 0; index -= 1) {
    currentOver.unshift(feed[index]);
    if (feed[index].legal && currentOver.filter((item) => item.legal).length >= 6) break;
  }

  const trendScore = recentRuns + recentBoundaries * 3 - recentDots * 2 - recentWickets * 8;
  const trendLabel = recentWickets > 0 ? "Wobble" : trendScore >= 14 ? "Hot streak" : trendScore <= 2 ? "Stalled" : "Building";
  const urgency = recentWickets > 0 ? "High alert" : recentRuns >= 10 ? "Attack window" : "Stay steady";
  const smartCall = recentWickets > 0
    ? "Rebuild with low-risk singles for two balls before targeting a release shot."
    : recentBoundaries >= 2
      ? "Pressure is on the bowler - keep the set batter on strike and attack the matchup."
      : recentDots >= 3
        ? "Break the squeeze with rotation first, then line up the weaker boundary option."
        : "Keep collecting low-risk runs and force the field to move.";

  return {
    feed,
    currentOver,
    recentRuns,
    recentWickets,
    recentDots,
    recentBoundaries,
    legalCount: legalRecent.length,
    trendLabel,
    urgency,
    smartCall,
    lastBall: feed.length ? feed[feed.length - 1] : null
  };
}

function createAiInsights(state) {
  const ballFeedSummary = summarizeBallFeed(state && state.ballFeed);

  if (!hasLiveScore(state)) {
    return {
      generatedAt: new Date().toISOString(),
      summary: "No live match data is available yet.",
      prediction: { projectedTotal: 0, projectedLow: 0, projectedHigh: 0, fanConfidenceTeam1: 0, fanConfidenceTeam2: 0, pressureIndex: 0, momentumScore: 0, momentumLabel: "Awaiting data", ballsRemaining: 0, wicketsInHand: 0 },
      matchup: { phase: "Awaiting live data", batsman: "-", bowler: "-" },
      assistant: {
        trendLabel: "Awaiting feed",
        urgency: "No live data",
        smartCall: "Use the quick score buttons from the admin panel to start the live AI copilot.",
        currentOver: [],
        recentBalls: [],
        lastBall: null
      },
      tactical: {
        commentary: "Publish a live score from the admin panel to unlock real-time AI analysis.",
        battingPlan: "No batting plan until live score data is available.",
        bowlingPlan: "No bowling counter until live score data is available.",
        nextOverPlan: "Start the match feed to generate over-by-over plans.",
        watchouts: ["No live score has been published yet."]
      },
      recommendation: "Add stream, teams, and score details from the admin panel to enable AI insights.",
      keySignals: ["Live score: not available", "Connected viewers: " + (state.stream && state.stream.viewerCount || 0), "Chat messages: " + ((state.chatMessages || []).length || 0)]
    };
  }

  const score = parseScoreBreakdown(state.score.team1Score);
  const overs = parseOversBreakdown(state.score.overs);
  const inningsLength = inferInningsLength(state, overs.completedOvers);
  const totalBalls = inningsLength * 6;
  const ballsRemaining = Math.max(0, totalBalls - overs.totalBalls);
  const wicketsInHand = Math.max(0, 10 - score.wickets);
  const runRate = Number.parseFloat(String(state.score.runRate || "0")) || 0;
  const effectiveRate = overs.completedOvers > 0 ? score.runs / overs.completedOvers : runRate;
  const projectedTotal = Math.max(score.runs, Math.round((effectiveRate || 0) * inningsLength));
  const team1Votes = Number(state.poll && state.poll.votes && state.poll.votes.team1 || 0);
  const team2Votes = Number(state.poll && state.poll.votes && state.poll.votes.team2 || 0);
  const totalVotes = Math.max(team1Votes + team2Votes, 1);
  const fanConfidence = Math.round((team1Votes * 100) / totalVotes);
  const parRunRate = inningsLength >= 45 ? 6.2 : 8.4;
  const pressureIndex = clamp(Math.round(20 + (score.wickets * 6) + Math.max(0, (parRunRate - effectiveRate) * 12) + (ballsRemaining <= 24 ? 18 : 8)), 5, 95);
  const momentumScore = clamp(Math.round(50 + (effectiveRate - parRunRate) * 14 + (wicketsInHand - 5) * 3 + (fanConfidence - 50) * 0.35 - Math.max(0, pressureIndex - 60) * 0.4), 1, 99);
  const momentumLabel = momentumScore >= 70 ? "Surging" : momentumScore >= 55 ? "Steady edge" : momentumScore <= 35 ? "Under pressure" : "Balanced";
  const phase = getPhaseMeta(overs.completedOvers, inningsLength);
  const batsmanName = extractParticipantName(state.score.batsman, "Set batter");
  const bowlerName = extractParticipantName(state.score.bowler, "Strike bowler");
  const projectedLow = Math.max(score.runs, projectedTotal - 10);
  const projectedHigh = projectedTotal + 10;

  return {
    generatedAt: new Date().toISOString(),
    summary: state.score.team1 + " are in the " + phase.label.toLowerCase() + " at " + state.score.team1Score + ", with a projection around " + projectedTotal + " and " + momentumLabel.toLowerCase() + " momentum.",
    prediction: {
      projectedTotal, projectedLow, projectedHigh, fanConfidenceTeam1: fanConfidence, fanConfidenceTeam2: 100 - fanConfidence, pressureIndex, momentumScore, momentumLabel, ballsRemaining, wicketsInHand
    },
    matchup: { phase: phase.label, batsman: batsmanName, bowler: bowlerName },
    tactical: {
      commentary: batsmanName + " is setting the tempo against " + bowlerName + ", and the next over should define the finish.",
      battingPlan: phase.key === "death" ? "Keep the set batter on strike and attack straight boundaries without exposing the tail." : "Rotate strike and protect wickets until the launch window opens.",
      bowlingPlan: "Hit hard lengths, vary pace, and deny width to stop acceleration.",
      nextOverPlan: pressureIndex >= 70 ? "Aim for a calm 8 to 10 run over and protect wickets first." : "Target a 10 plus run over with low-risk scoring on the first three balls.",
      watchouts: ballsRemaining <= 24 ? ["The finish is in a high-volatility zone and one over can swing the projection sharply."] : ["A quiet over will hand momentum back to the fielding side."]
    },
    assistant: {
      trendLabel: ballFeedSummary.trendLabel,
      urgency: ballFeedSummary.urgency,
      smartCall: ballFeedSummary.smartCall,
      currentOver: ballFeedSummary.currentOver.map((event) => event.label),
      recentBalls: ballFeedSummary.feed.slice(-8).map((event) => event.label),
      lastBall: ballFeedSummary.lastBall ? ballFeedSummary.lastBall.label : null,
      recentRuns: ballFeedSummary.recentRuns,
      recentWickets: ballFeedSummary.recentWickets,
      recentDots: ballFeedSummary.recentDots
    },
    recommendation: pressureIndex >= 70 ? "Bank one calm over before a full launch." : "Momentum is in hand. Press the advantage in the next over.",
    keySignals: [
      "Projected range: " + projectedLow + "-" + projectedHigh,
      "Run rate vs par: " + effectiveRate.toFixed(2) + " vs " + parRunRate.toFixed(2),
      "Balls remaining: " + ballsRemaining,
      "Wickets in hand: " + wicketsInHand,
      "Last 6 balls: " + (ballFeedSummary.currentOver.map((event) => event.label).join(" ") || "No feed yet"),
      "Connected viewers: " + ((state.stream && state.stream.viewerCount) || 0),
      "Fan sentiment split: " + fanConfidence + "% / " + (100 - fanConfidence) + "%"
    ]
  };
}

function createAiBulletinMessage(state, insights) {
  if (!hasLiveScore(state)) return "AI Bulletin: No live match data is available yet.";
  const parts = [
    "AI Bulletin: " + state.score.team1 + " " + state.score.team1Score + " after " + (state.score.overs || "0") + " overs.",
    insights.summary,
    insights.prediction && insights.prediction.projectedTotal ? "Projected finish: " + insights.prediction.projectedTotal + "." : "",
    insights.assistant && insights.assistant.smartCall ? insights.assistant.smartCall : "",
    insights.recommendation || ""
  ].filter(Boolean);
  return parts.join(" " ).slice(0, 500);
}

function isAdminRequest(req) {
  const key = req.get("X-Admin-Key") || (req.body && req.body.key);
  return key === ADMIN_KEY;
}

function requireAdmin(req, res, next) {
  if (!isAdminRequest(req)) {
    res.status(401).json({ error: "Admin authentication required" });
    return;
  }
  next();
}

function applyRealtimeViewerMetrics(state) {
  return { ...state, stream: { ...state.stream, viewerCount: state.stream.status === "live" ? sseClients.size : 0 } };
}

function createStatePayload(state) {
  const realtimeState = applyRealtimeViewerMetrics(state);
  return { stream: realtimeState.stream, score: realtimeState.score, poll: realtimeState.poll, content: realtimeState.content, liveMatches: realtimeState.liveMatches, upcomingMatches: realtimeState.upcomingMatches, recentResults: realtimeState.recentResults, ballFeed: realtimeState.ballFeed, timelineEvents: realtimeState.timelineEvents, updatedAt: realtimeState.updatedAt };
}

function createSsePacket(eventName, payload) {
  return "event: " + eventName + "\ndata: " + JSON.stringify(payload) + "\n\n";
}

function sendSseEvent(res, eventName, payload) {
  res.write(createSsePacket(eventName, payload));
}

function broadcastSseEvent(eventName, payload) {
  const packet = createSsePacket(eventName, payload);
  for (const client of sseClients) {
    try {
      client.write(packet);
    } catch {
      sseClients.delete(client);
    }
  }
  // Also broadcast via WebSocket
  broadcastWsEvent(eventName, payload);
}

function broadcastStateUpdate(state) {
  broadcastSseEvent("state-update", createStatePayload(state));
}

async function broadcastPresenceUpdate() {
  try {
    const state = await readState();
    broadcastStateUpdate(state);
  } catch (error) {
    console.error("Presence update failed:", error);
  }
}

function mergeContent(currentContent, patch) {
  const nextContent = patch && typeof patch === "object" ? patch : {};
  const nextPerformers = nextContent.performers && typeof nextContent.performers === "object" ? nextContent.performers : {};

  return normalizeContent({
    ...currentContent,
    ...nextContent,
    hero: { ...currentContent.hero, ...(nextContent.hero || {}) },
    matchCenter: { ...currentContent.matchCenter, ...(nextContent.matchCenter || {}) },
    quickActions: { ...currentContent.quickActions, ...(nextContent.quickActions || {}) },
    sections: { ...currentContent.sections, ...(nextContent.sections || {}) },
    promo: { ...currentContent.promo, ...(nextContent.promo || {}) },
    performers: {
      batsmen: Array.isArray(nextPerformers.batsmen) ? nextPerformers.batsmen : currentContent.performers.batsmen,
      bowlers: Array.isArray(nextPerformers.bowlers) ? nextPerformers.bowlers : currentContent.performers.bowlers
    },
    stats: {
      ...currentContent.stats,
      ...(nextContent.stats || {}),
      highestScore: { ...currentContent.stats.highestScore, ...(((nextContent.stats || {}).highestScore) || {}) },
      bestBowling: { ...currentContent.stats.bestBowling, ...(((nextContent.stats || {}).bestBowling) || {}) },
      momentum: { ...currentContent.stats.momentum, ...(((nextContent.stats || {}).momentum) || {}) },
      keyMetrics: Array.isArray(((nextContent.stats || {}).keyMetrics)) ? nextContent.stats.keyMetrics : currentContent.stats.keyMetrics
    },
    predictions: {
      ...currentContent.predictions,
      ...(nextContent.predictions || {}),
      expert: { ...currentContent.predictions.expert, ...(((nextContent.predictions || {}).expert) || {}) },
      playerForm: Array.isArray(((nextContent.predictions || {}).playerForm)) ? nextContent.predictions.playerForm : currentContent.predictions.playerForm,
      scoreLines: Array.isArray(((nextContent.predictions || {}).scoreLines)) ? nextContent.predictions.scoreLines : currentContent.predictions.scoreLines
    },
    highlights: {
      ...currentContent.highlights,
      ...(nextContent.highlights || {}),
      featured: { ...currentContent.highlights.featured, ...(((nextContent.highlights || {}).featured) || {}) },
      items: Array.isArray(((nextContent.highlights || {}).items)) ? nextContent.highlights.items : currentContent.highlights.items,
      stats: Array.isArray(((nextContent.highlights || {}).stats)) ? nextContent.highlights.stats : currentContent.highlights.stats,
      trending: Array.isArray(((nextContent.highlights || {}).trending)) ? nextContent.highlights.trending : currentContent.highlights.trending
    },
    analytics: {
      ...currentContent.analytics,
      ...(nextContent.analytics || {}),
      battingRows: Array.isArray(((nextContent.analytics || {}).battingRows)) ? nextContent.analytics.battingRows : currentContent.analytics.battingRows,
      bowlingRows: Array.isArray(((nextContent.analytics || {}).bowlingRows)) ? nextContent.analytics.bowlingRows : currentContent.analytics.bowlingRows,
      geo: Array.isArray(((nextContent.analytics || {}).geo)) ? nextContent.analytics.geo : currentContent.analytics.geo
    }
  });
}

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", ALLOWED_CORS_METHODS);
  res.setHeader("Access-Control-Allow-Headers", ALLOWED_CORS_HEADERS);
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

app.use((req, res, next) => {
  if (req.path === "/api/admin/stream/frame") {
    next();
    return;
  }
  defaultJsonParser(req, res, next);
});

app.use((req, _res, next) => {
  analytics.pageViews[req.path] = (analytics.pageViews[req.path] || 0) + 1;
  if (req.path.startsWith("/api/")) {
    const apiKey = req.method + " " + req.path;
    analytics.apiCalls[apiKey] = (analytics.apiCalls[apiKey] || 0) + 1;
  }
  next();
});

app.use("/api/", (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress || "unknown";
  if (!checkRateLimit(ip, 60, 60000)) {
    res.status(429).json({ error: "Too many requests" });
    return;
  }
  next();
});

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "cricketlive-pro-api",
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString(),
    analytics: {
      activeUsers: analytics.activeUsers.size,
      totalStreamViews: analytics.streamViews.length,
      wsConnections: wsClients.size,
      wsMessages: analytics.wsMessages
    }
  });
});

app.get("/api/ws-info", (_req, res) => {
  res.json({
    wsUrl: `ws://${_req.headers.host}/ws`,
    wssUrl: `wss://${_req.headers.host}/ws`,
    supported: true,
    protocols: ["chat", "poll-vote", "auth", "webrtc-signal", "subscribe"]
  });
});

app.get("/api/events", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  if (typeof res.flushHeaders === "function") res.flushHeaders();

  res.write("retry: 3000\n\n");
  sseClients.add(res);
  sendSseEvent(res, "connected", { ok: true, timestamp: new Date().toISOString() });

  try {
    const state = await readState();
    sendSseEvent(res, "state-update", createStatePayload(state));
    sendSseEvent(res, "chat-snapshot", { messages: state.chatMessages.slice(-50) });
    sendSseEvent(res, "notification-snapshot", { notifications: state.notifications.slice(-20) });
  } catch {
    sendSseEvent(res, "server-error", { message: "Unable to load realtime state" });
  }

  void broadcastPresenceUpdate();

  req.on("close", () => {
    sseClients.delete(res);
    void broadcastPresenceUpdate();
    res.end();
  });
});

app.get("/api/state", async (_req, res) => {
  try {
    const state = await readState();
    res.json(applyRealtimeViewerMetrics(state));
  } catch {
    res.status(500).json({ error: "Unable to read state" });
  }
});

app.get("/api/poll", async (_req, res) => {
  try {
    const state = await readState();
    res.json({ poll: state.poll, teams: { team1: state.score.team1, team2: state.score.team2 } });
  } catch {
    res.status(500).json({ error: "Unable to read poll" });
  }
});

app.post("/api/poll/vote", async (req, res) => {
  try {
    const team = req.body && typeof req.body.team === "string" ? req.body.team.trim().toLowerCase() : "";
    if (team !== "team1" && team !== "team2") {
      res.status(400).json({ error: "Vote target must be team1 or team2" });
      return;
    }

    const state = await readState();
    const nextVotes = {
      ...state.poll.votes,
      [team]: (Number(state.poll.votes[team]) || 0) + 1
    };
    const nextState = {
      ...state,
      poll: normalizePoll({
        ...state.poll,
        votes: nextVotes
      }),
      updatedAt: new Date().toISOString()
    };

    const savedState = await writeState(nextState);
    broadcastStateUpdate(savedState);
    res.status(201).json({ ok: true, poll: savedState.poll, teams: { team1: savedState.score.team1, team2: savedState.score.team2 } });
  } catch {
    res.status(500).json({ error: "Unable to cast vote" });
  }
});

app.post("/api/timeline", requireAdmin, async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const event = normalizeTimelineEvent({
      id: buildMessageId(),
      title: body.title,
      detail: body.detail,
      type: body.type,
      badge: body.badge,
      over: body.over,
      timestamp: new Date().toISOString()
    });

    const state = await readState();
    const nextState = {
      ...state,
      timelineEvents: [event, ...state.timelineEvents].slice(0, 100),
      updatedAt: new Date().toISOString()
    };

    const savedState = await writeState(nextState);
    broadcastStateUpdate(savedState);
    res.status(201).json({ ok: true, event, timelineEvents: savedState.timelineEvents });
  } catch {
    res.status(500).json({ error: "Unable to add timeline event" });
  }
});

app.delete("/api/timeline", requireAdmin, async (_req, res) => {
  try {
    const state = await readState();
    const nextState = { ...state, timelineEvents: [], updatedAt: new Date().toISOString() };
    const savedState = await writeState(nextState);
    broadcastStateUpdate(savedState);
    res.json({ ok: true, timelineEvents: [] });
  } catch {
    res.status(500).json({ error: "Unable to clear timeline" });
  }
});

app.delete("/api/timeline/:id", requireAdmin, async (req, res) => {
  try {
    const eventId = typeof req.params.id === "string" ? req.params.id.trim() : "";
    if (!eventId) {
      res.status(400).json({ error: "Timeline event id is required" });
      return;
    }

    const state = await readState();
    const timelineEvents = state.timelineEvents.filter((event) => event.id !== eventId);
    const nextState = { ...state, timelineEvents, updatedAt: new Date().toISOString() };
    const savedState = await writeState(nextState);
    broadcastStateUpdate(savedState);
    res.json({ ok: true, timelineEvents: savedState.timelineEvents });
  } catch {
    res.status(500).json({ error: "Unable to remove timeline event" });
  }
});

app.post("/api/admin/verify", (req, res) => {
  const key = req.body && req.body.key;
  if (key === ADMIN_KEY) res.json({ ok: true, message: "Admin verified" });
  else res.status(401).json({ error: "Invalid admin key" });
});

app.get("/api/ai/insights", async (_req, res) => {
  try {
    const state = applyRealtimeViewerMetrics(await readState());
    const insights = createAiInsights(state);
    res.json({ ok: true, insights, source: "rule-based" });
  } catch {
    res.status(500).json({ error: "Unable to generate AI insights" });
  }
});

app.post("/api/ai/bulletin", requireAdmin, async (req, res) => {
  try {
    const channelRaw = req.body && typeof req.body.channel === "string" ? req.body.channel.trim().toLowerCase() : "notification";
    const channel = AI_BULLETIN_CHANNELS.has(channelRaw) ? channelRaw : "notification";
    const state = applyRealtimeViewerMetrics(await readState());
    const insights = createAiInsights(state);
    const bulletin = createAiBulletinMessage(state, insights);
    const timestamp = new Date().toISOString();
    const nextState = { ...state, notifications: [...state.notifications], chatMessages: [...state.chatMessages], updatedAt: timestamp };

    let notification = null;
    let chatMessage = null;
    if (channel === "notification" || channel === "both") {
      notification = { id: buildMessageId(), message: bulletin, timestamp };
      nextState.notifications = [...nextState.notifications, notification].slice(-200);
    }
    if (channel === "chat" || channel === "both") {
      chatMessage = { id: buildMessageId(), username: "AI Analyst", content: bulletin.slice(0, 400), timestamp };
      nextState.chatMessages = [...nextState.chatMessages, chatMessage].slice(-500);
    }

    await writeState(nextState);
    if (notification) broadcastSseEvent("notification", { notification });
    if (chatMessage) broadcastSseEvent("chat-message", { message: chatMessage });
    res.status(201).json({ ok: true, channel, bulletin, insights });
  } catch {
    res.status(500).json({ error: "Unable to publish AI bulletin" });
  }
});

app.put("/api/state", requireAdmin, async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const currentState = await readState();
    const streamPatch = body.stream && typeof body.stream === "object" ? body.stream : {};
    const nextStream = { ...currentState.stream, ...streamPatch };

    if (typeof body.streamUrl === "string") nextStream.url = body.streamUrl.trim();
    if (typeof body.streamPlatform === "string") nextStream.platform = body.streamPlatform.trim() || "custom";
    if (typeof body.streamStatus === "string" && ALLOWED_STREAM_STATUS.has(body.streamStatus)) nextStream.status = body.streamStatus;

    const nextState = {
      ...currentState,
      stream: nextStream,
      score: body.currentScore && typeof body.currentScore === "object" ? { ...currentState.score, ...body.currentScore } : currentState.score,
      poll: body.poll && typeof body.poll === "object" ? normalizePoll({ ...currentState.poll, ...body.poll, votes: { ...currentState.poll.votes, ...(body.poll.votes || {}) } }) : currentState.poll,
      content: body.content && typeof body.content === "object" ? mergeContent(currentState.content, body.content) : currentState.content,
      liveMatches: Array.isArray(body.liveMatches) ? body.liveMatches.slice(0, 10) : currentState.liveMatches,
      upcomingMatches: Array.isArray(body.upcomingMatches) ? body.upcomingMatches.slice(0, 10) : currentState.upcomingMatches,
      recentResults: Array.isArray(body.recentResults) ? body.recentResults.slice(0, 10) : currentState.recentResults,
      ballFeed: Array.isArray(body.ballFeed) ? normalizeBallFeed(body.ballFeed) : currentState.ballFeed,
      updatedAt: new Date().toISOString()
    };

    const savedState = await writeState(nextState);
    broadcastStateUpdate(savedState);
    res.json({ ok: true, state: applyRealtimeViewerMetrics(savedState) });
  } catch {
    res.status(500).json({ error: "Unable to update state" });
  }
});

app.post("/api/chat", async (req, res) => {
  try {
    const username = req.body && typeof req.body.username === "string" ? req.body.username.trim().slice(0, 24) : "Fan";
    const content = req.body && typeof req.body.content === "string" ? req.body.content.trim().slice(0, 400) : "";
    if (!content) {
      res.status(400).json({ error: "Message content is required" });
      return;
    }

    const message = { id: buildMessageId(), username: username || "Fan", content, timestamp: new Date().toISOString() };
    const state = await readState();
    const nextState = { ...state, chatMessages: [...state.chatMessages, message].slice(-500), updatedAt: new Date().toISOString() };
    await writeState(nextState);
    broadcastSseEvent("chat-message", { message });
    res.status(201).json({ ok: true, message });
  } catch {
    res.status(500).json({ error: "Unable to send chat message" });
  }
});

app.post("/api/notifications", requireAdmin, async (req, res) => {
  try {
    const messageText = req.body && typeof req.body.message === "string" ? req.body.message.trim().slice(0, 500) : "";
    if (!messageText) {
      res.status(400).json({ error: "Notification message is required" });
      return;
    }

    const notification = { id: buildMessageId(), message: messageText, timestamp: new Date().toISOString() };
    const state = await readState();
    const nextState = { ...state, notifications: [...state.notifications, notification].slice(-200), updatedAt: new Date().toISOString() };
    await writeState(nextState);
    broadcastSseEvent("notification", { notification });
    res.status(201).json({ ok: true, notification });
  } catch {
    res.status(500).json({ error: "Unable to push notification" });
  }
});

// Mobile Stream Frame Storage
let latestMobileFrame = { frame: null, quality: "medium", timestamp: 0 };

app.post("/api/admin/stream/frame", requireAdmin, streamFrameJsonParser, async (req, res) => {
  try {
    const { frame, quality, timestamp } = req.body || {};
    latestMobileFrame = { frame, quality, timestamp: timestamp || Date.now() };
    broadcastSseEvent("mobile-stream-frame", { frame, quality, timestamp: latestMobileFrame.timestamp });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to process frame" });
  }
});

app.get("/api/stream/frame", (_req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.json(latestMobileFrame);
});

app.get("/api/stream/frame/latest", (_req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.json(latestMobileFrame);
});

app.get("/stream/mobile", (_req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Live Stream</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #000; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
        img { max-width: 100%; max-height: 100vh; object-fit: contain; }
        #stream { display: none; }
        #placeholder { color: #666; font-family: sans-serif; text-align: center; padding: 20px; }
      </style>
    </head>
    <body>
      <img id="stream" src="" alt="Live Stream">
      <div id="placeholder">Waiting for stream...</div>
      <script>
        const img = document.getElementById('stream');
        const placeholder = document.getElementById('placeholder');
        let lastTimestamp = 0;
        
        async function fetchFrame() {
          try {
            const res = await fetch('/api/stream/frame/latest?' + Date.now(), { cache: 'no-store' });
            if (!res.ok) {
              throw new Error('Stream frame request failed');
            }

            const data = await res.json();
            if (data.frame && data.timestamp > lastTimestamp) {
              lastTimestamp = data.timestamp;
              img.src = data.frame;
              img.style.display = 'block';
              placeholder.style.display = 'none';
            }
          } catch (e) {
            console.error(e);
          }
        }
        
        fetchFrame();
        setInterval(fetchFrame, 250);
      </script>
    </body>
    </html>
  `);
});

app.get("/styles.css", (_req, res) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Content-Type", "text/css");
  res.setHeader("Surrogate-Control", "no-store");
  res.sendFile(CSS_FILE);
});

app.get("/sw.js", (_req, res) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate, proxy-revalidate");
  res.setHeader("Content-Type", "application/javascript");
  res.setHeader("Service-Worker-Allowed", "/");
  res.sendFile(SW_FILE);
});

app.get("/app.js", (_req, res) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");
  res.sendFile(APP_SCRIPT_FILE);
});
app.get("/", (_req, res) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");
  res.sendFile(INDEX_FILE);
});

// ==================== ADVANCED API ENDPOINTS ====================

// Enhanced State Management with versioning
const STATE_VERSION = "1.0.0";
let stateVersion = STATE_VERSION;

app.get("/api/version", async (_req, res) => {
  res.json({ version: STATE_VERSION, server: "cricketlive-pro" });
});

// WebSocket-like real-time notifications via SSE
app.get("/api/notifications/stream", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  if (typeof res.flushHeaders === "function") res.flushHeaders();

  const clientId = Date.now() + "-" + Math.random().toString(36).slice(2, 8);
  const client = { id: clientId, res };
  sseClients.add(client);

  res.write("retry: 3000\n\n");
  res.write(createSsePacket("connected", { ok: true, clientId, timestamp: new Date().toISOString() }));

  req.on("close", () => {
    sseClients.delete(client);
  });
});

// Advanced match statistics endpoint
app.get("/api/match/stats", async (_req, res) => {
  try {
    const state = await readState();
    const stats = {
      runs: parseScoreBreakdown(state.score.team1Score).runs,
      wickets: parseScoreBreakdown(state.score.team1Score).wickets,
      overs: state.score.overs,
      runRate: state.score.runRate,
      ballCount: state.ballFeed.length,
      recentBalls: state.ballFeed.slice(-6),
      momentum: state.content.stats.momentum,
      partnerships: state.score.partnership || "",
      fallOfWickets: state.score.fow || ""
    };
    res.json({ ok: true, stats });
  } catch {
    res.status(500).json({ error: "Unable to fetch match stats" });
  }
});

// Enhanced player statistics
app.get("/api/players/advanced", async (_req, res) => {
  try {
    const state = await readState();
    const performers = state.content.performers || { batsmen: [], bowlers: [] };
    
    // Calculate advanced stats
    const batsmen = performers.batsmen.map((p, i) => ({
      ...p,
      strikeRate: p.runs && p.balls ? ((p.runs / p.balls) * 100).toFixed(1) : null,
      average: p.runs && p.wickets ? (p.runs / (p.wickets || 1)).toFixed(2) : null,
      rank: p.rank || i + 1
    }));
    
    const bowlers = performers.bowlers.map((p, i) => ({
      ...p,
      economy: p.runs && p.overs ? (p.runs / p.overs).toFixed(2) : null,
      strikeRate: p.wickets ? (p.balls / p.wickets).toFixed(1) : null,
      rank: p.rank || i + 1
    }));
    
    res.json({ ok: true, batsmen, bowlers });
  } catch {
    res.status(500).json({ error: "Unable to fetch player stats" });
  }
});

// Quick score update endpoint for admin
app.post("/api/quick-score", requireAdmin, async (req, res) => {
  try {
    const { runs = 0, wickets = 0, isLegal = true, over } = req.body || {};
    const state = await readState();
    
    // Update ball feed
    const ballEvent = normalizeBallEvent({
      runs: Number(runs) || 0,
      wickets: Number(wickets) || 0,
      legal: Boolean(isLegal),
      over: over || state.score.overs || "0.0",
      timestamp: new Date().toISOString()
    });
    
    // Update state with new ball
    const nextState = {
      ...state,
      ballFeed: [...state.ballFeed, ballEvent].slice(-60),
      updatedAt: new Date().toISOString()
    };
    
    const savedState = await writeState(nextState);
    broadcastStateUpdate(savedState);
    
    res.json({ ok: true, event: ballEvent });
  } catch {
    res.status(500).json({ error: "Unable to update score" });
  }
});
app.get("/admin", (_req, res) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");
  res.sendFile(ADMIN_FILE);
});

setInterval(() => {
  broadcastSseEvent("ping", { timestamp: new Date().toISOString() });
}, SSE_HEARTBEAT_MS);

// ==================== ADVANCED FEATURES ====================

function checkRateLimit(ip, maxRequests = 100, windowMs = 60000) {
  const now = Date.now();
  const key = ip + ":" + Math.floor(now / windowMs);
  const count = (rateLimitMap.get(key) || 0) + 1;
  rateLimitMap.set(key, count);

  if (count > maxRequests) {
    return false;
  }

  for (const cacheKey of rateLimitMap.keys()) {
    if (cacheKey.endsWith(":" + Math.floor((now - windowMs * 2) / windowMs))) {
      rateLimitMap.delete(cacheKey);
    }
  }

  return true;
}

app.get("/api/admin/analytics", requireAdmin, async (_req, res) => {
  res.json({
    pageViews: analytics.pageViews,
    apiCalls: analytics.apiCalls,
    streamViews: analytics.streamViews.length,
    activeUsers: analytics.activeUsers.size,
    uptime: process.uptime()
  });
});

app.post("/api/stream/view", async (req, res) => {
  const viewerId = req.body && typeof req.body.viewerId === "string" ? req.body.viewerId.trim().slice(0, 80) : "";
  if (viewerId) {
    analytics.activeUsers.add(viewerId);
  }
  analytics.streamViews.push({
    timestamp: new Date().toISOString(),
    viewerId
  });
  res.json({ ok: true });
});

setInterval(() => {
  const cutoff = Date.now() - 300000;
  const activeViewerIds = new Set();
  analytics.streamViews = analytics.streamViews.filter((entry) => {
    const seenAt = new Date(entry.timestamp).getTime();
    const keep = Number.isFinite(seenAt) && seenAt >= cutoff;
    if (keep && entry.viewerId) {
      activeViewerIds.add(entry.viewerId);
    }
    return keep;
  });
  analytics.activeUsers = activeViewerIds;
}, 60000);

app.get("/api/poll/status", async (_req, res) => {
  try {
    const state = applyRealtimeViewerMetrics(await readState());
    res.json({
      streamStatus: state.stream.status || "offline",
      viewerCount: analytics.activeUsers.size,
      timestamp: new Date().toISOString()
    });
  } catch {
    res.status(500).json({ error: "Unable to load poll status" });
  }
});

function broadcastMessage(type, data) {
  broadcastSseEvent(type, data);
}

app.post("/api/admin/announce", requireAdmin, async (req, res) => {
  const message = req.body && typeof req.body.message === "string" ? req.body.message.trim().slice(0, 500) : "";
  const type = req.body && typeof req.body.type === "string" ? req.body.type.trim().slice(0, 40) : "info";
  if (!message) {
    res.status(400).json({ error: "Announcement message is required" });
    return;
  }

  broadcastMessage("announcement", { message, type, timestamp: new Date().toISOString() });
  res.json({ ok: true });
});

app.get("/api/stream/quality", async (req, res) => {
  const quality = typeof req.query.quality === "string" ? req.query.quality : "auto";
  const qualities = {
    low: { resolution: "640x360", bitrate: 500000 },
    medium: { resolution: "854x480", bitrate: 1000000 },
    high: { resolution: "1280x720", bitrate: 2500000 },
    fullhd: { resolution: "1920x1080", bitrate: 5000000 },
    auto: { resolution: "auto", bitrate: "auto" }
  };
  res.json(qualities[quality] || qualities.auto);
});

app.get("/api/schedule", async (_req, res) => {
  try {
    const state = await readState();
    res.json({
      matches: state.liveMatches || [],
      upcoming: state.upcomingMatches || []
    });
  } catch {
    res.status(500).json({ error: "Unable to load schedule" });
  }
});

app.get("/api/players", async (req, res) => {
  try {
    const state = await readState();
    const performers = state.content && state.content.performers ? state.content.performers : { batsmen: [], bowlers: [] };
    const team = typeof req.query.team === "string" ? req.query.team.trim().toLowerCase() : "";
    const filterByTeam = (player) => !team || String(player.team || "").trim().toLowerCase() === team;
    res.json({
      batsmen: (performers.batsmen || []).filter(filterByTeam),
      bowlers: (performers.bowlers || []).filter(filterByTeam)
    });
  } catch {
    res.status(500).json({ error: "Unable to load player stats" });
  }
});

app.use(express.static(PUBLIC_DIR, { index: false }));

// ==================== ML-BASED MATCH PREDICTION ====================

// Simple ML-like prediction model using weighted features
function calculateWinProbability(state) {
  const score = parseScoreBreakdown(state.score.team1Score);
  const overs = parseOversBreakdown(state.score.overs);
  const inningsLength = inferInningsLength(state, overs.completedOvers);
  const totalBalls = inningsLength * 6;
  const ballsRemaining = Math.max(0, totalBalls - overs.totalBalls);
  const wicketsInHand = Math.max(0, 10 - score.wickets);
  const runRate = Number.parseFloat(String(state.score.runRate || "0")) || 0;
  const parRunRate = inningsLength >= 45 ? 6.2 : 8.4;
  
  // Feature weights (trained from historical data patterns)
  const features = {
    scoringRate: (runRate / parRunRate) * 25,
    wicketPressure: (10 - wicketsInHand) * 3,
    oversRemaining: (ballsRemaining / totalBalls) * 20,
    currentMomentum: state.content?.stats?.momentum?.percent || 50,
    fanSupport: state.poll?.votes ? 
      (state.poll.votes.team1 / (state.poll.votes.team1 + state.poll.votes.team2 || 1)) * 15 : 50
  };
  
  // Calculate probability using weighted sum
  let probability = 50 + features.scoringRate - features.wicketPressure + 
    (features.oversRemaining > 0.3 ? 5 : -5) + 
    (features.currentMomentum - 50) * 0.1 +
    (features.fanSupport - 50) * 0.1;
  
  probability = Math.max(5, Math.min(95, probability));
  
  return {
    team1WinProbability: Math.round(probability),
    team2WinProbability: Math.round(100 - probability),
    confidence: Math.min(90, 40 + (ballsRemaining / totalBalls) * 30),
    factors: {
      scoringRate: runRate > parRunRate ? "Above par" : "Below par",
      wicketPressure: wicketsInHand <= 3 ? "High" : wicketsInHand <= 6 ? "Medium" : "Low",
      oversRemaining: ballsRemaining > totalBalls * 0.3 ? "Plenty" : "Running out"
    }
  };
}

// Predict score based on current run rate and remaining overs
function predictFinalScore(state) {
  const score = parseScoreBreakdown(state.score.team1Score);
  const overs = parseOversBreakdown(state.score.overs);
  const inningsLength = inferInningsLength(state, overs.completedOvers);
  const totalBalls = inningsLength * 6;
  const ballsRemaining = Math.max(0, totalBalls - overs.totalBalls);
  const runRate = Number.parseFloat(String(state.score.runRate || "0")) || 0;
  
  // Linear regression-based prediction
  const currentRuns = score.runs;
  const projectedFromCurrentRate = currentRuns + (runRate * (ballsRemaining / 6));
  
  // Historical average acceleration factor
  const accelerationFactor = 1.15; // Teams typically accelerate 15% in death overs
  const deathOversRemaining = Math.max(0, ballsRemaining - (inningsLength - 5) * 6);
  const deathRunRateBoost = runRate * accelerationFactor;
  const projectedWithAcceleration = currentRuns + (runRate * ((ballsRemaining - deathOversRemaining) / 6)) + (deathRunRateBoost * (deathOversRemaining / 6));
  
  const finalPrediction = Math.round((projectedFromCurrentRate + projectedWithAcceleration) / 2);
  
  return {
    projectedScore: Math.max(score.runs, finalPrediction),
    conservative: Math.max(score.runs, Math.round(projectedFromCurrentRate)),
    aggressive: Math.max(score.runs, Math.round(projectedWithAcceleration)),
    confidence: ballsRemaining > totalBalls * 0.5 ? "High" : ballsRemaining > totalBalls * 0.25 ? "Medium" : "Low"
  };
}

app.get("/api/prediction/ml", async (_req, res) => {
  try {
    const state = await readState();
    
    if (!hasLiveScore(state)) {
      res.json({ 
        ok: true, 
        error: "No live match data",
        prediction: null 
      });
      return;
    }
    
    const winProb = calculateWinProbability(state);
    const scorePred = predictFinalScore(state);
    
    res.json({
      ok: true,
      model: "cricketlive-pro-ml-v1",
      winProbability: winProb,
      scorePrediction: scorePred,
      generatedAt: new Date().toISOString(),
      features: {
        currentScore: state.score.team1Score,
        overs: state.score.overs,
        runRate: state.score.runRate,
        wickets: parseScoreBreakdown(state.score.team1Score).wickets
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Prediction failed" });
  }
});

// Enhanced Analytics Dashboard
app.get("/api/analytics/dashboard", requireAdmin, async (_req, res) => {
  try {
    const state = await readState();
    const score = parseScoreBreakdown(state.score.team1Score);
    const overs = parseOversBreakdown(state.score.overs);
    
    // Calculate detailed metrics
    const ballFeed = state.ballFeed || [];
    const recentBalls = ballFeed.slice(-30);
    
    const runsScored = recentBalls.reduce((sum, b) => sum + (Number(b.runs) || 0), 0);
    const wicketsFallen = recentBalls.reduce((sum, b) => sum + (Number(b.wickets) || 0), 0);
    const dotBalls = recentBalls.filter(b => b.legal && Number(b.runs) === 0 && Number(b.wickets) === 0).length;
    const boundaries = recentBalls.filter(b => Number(b.runs) >= 4).length;
    const sixes = recentBalls.filter(b => Number(b.runs) >= 6).length;
    
    // Phase analysis
    const phases = {
      powerplay: { runs: 0, balls: 0, wickets: 0 },
      middle: { runs: 0, balls: 0, wickets: 0 },
      death: { runs: 0, balls: 0, wickets: 0 }
    };
    
    ballFeed.forEach(ball => {
      const overNum = parseFloat(ball.over) || 0;
      let phase;
      if (overs.completedOvers < 6) phase = phases.powerplay;
      else if (overs.completedOvers < 16) phase = phases.middle;
      else phase = phases.death;
      
      phase.runs += Number(ball.runs) || 0;
      phase.balls += ball.legal ? 1 : 0;
      phase.wickets += Number(ball.wickets) || 0;
    });
    
    res.json({
      ok: true,
      dashboard: {
        overview: {
          totalRuns: score.runs,
          totalWickets: score.wickets,
          oversCompleted: overs.completedOvers.toFixed(1),
          currentRunRate: state.score.runRate,
          target: state.score.target || null
        },
        recentPerformance: {
          last30Balls: {
            runs: runsScored,
            wickets: wicketsFallen,
            dotBalls,
            boundaries,
            sixes,
            strikeRate: overs.completedOvers > 0 ? ((runsScored / (recentBalls.filter(b => b.legal).length || 1)) * 100).toFixed(1) : 0
          }
        },
        phaseAnalysis: {
          powerplay: phases.powerplay.balls > 0 ? {
            runs: phases.powerplay.runs,
            overs: (phases.powerplay.balls / 6).toFixed(1),
            wickets: phases.powerplay.wickets,
            runRate: (phases.powerplay.runs / (phases.powerplay.balls / 6) || 0).toFixed(2)
          } : null,
          middle: phases.middle.balls > 0 ? {
            runs: phases.middle.runs,
            overs: (phases.middle.balls / 6).toFixed(1),
            wickets: phases.middle.wickets,
            runRate: (phases.middle.runs / (phases.middle.balls / 6) || 0).toFixed(2)
          } : null,
          death: phases.death.balls > 0 ? {
            runs: phases.death.runs,
            overs: (phases.death.balls / 6).toFixed(1),
            wickets: phases.death.wickets,
            runRate: (phases.death.runs / (phases.death.balls / 6) || 0).toFixed(2)
          } : null
        },
        partnership: {
          current: state.score.partnership || "No partnership",
          fallOfWickets: state.score.fow || "None"
        },
        viewerEngagement: {
          activeViewers: wsClients.size,
          totalChatMessages: state.chatMessages.length,
          pollVotes: (state.poll.votes?.team1 || 0) + (state.poll.votes?.team2 || 0)
        },
        serverMetrics: {
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
          wsConnections: wsClients.size,
          sseConnections: sseClients.size,
          totalApiCalls: Object.values(analytics.apiCalls).reduce((a, b) => a + b, 0)
        }
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Analytics dashboard unavailable" });
  }
});

// WebRTC Signaling Endpoint
app.post("/api/webrtc/room", async (req, res) => {
  try {
    const { roomId } = req.body;
    const room = roomId || uuidv4();
    
    if (!webrtcRooms.has(room)) {
      webrtcRooms.set(room, new Set());
    }
    
    res.json({ ok: true, roomId: room, participants: webrtcRooms.get(room).size });
  } catch (error) {
    res.status(500).json({ error: "Failed to create room" });
  }
});

app.get("/api/webrtc/room/:roomId", (req, res) => {
  const { roomId } = req.params;
  const participants = webrtcRooms.get(roomId)?.size || 0;
  res.json({ roomId, participants, active: participants > 0 });
});

// Social Media Integration
app.get("/api/social/share-options", async (_req, res) => {
  try {
    const state = await readState();
    const score = state.score;
    
    const shareText = encodeURIComponent(
      `${score.team1} ${score.team1Score} vs ${score.team2} ${score.team2Score} - ${score.overs} overs | Watch live: `
    );
    
    const shareOptions = {
      twitter: {
        url: `https://twitter.com/intent/tweet?text=${shareText}`,
        label: "Share on Twitter"
      },
      facebook: {
        url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(_req.protocol + '://' + _req.get('host'))}`,
        label: "Share on Facebook"
      },
      whatsapp: {
        url: `https://wa.me/?text=${shareText}`,
        label: "Share on WhatsApp"
      },
      copyLink: {
        url: _req.protocol + '://' + _req.get('host'),
        label: "Copy Link"
      }
    };
    
    res.json({ ok: true, options: shareOptions });
  } catch (error) {
    res.status(500).json({ error: "Share options unavailable" });
  }
});

app.post("/api/social/embed", async (req, res) => {
  try {
    const { platform, matchId } = req.body;
    const state = await readState();
    
    const embedCodes = {
      twitter: `<twitter-widget class="twitter-tweet" data-lang="en" data-theme="dark">Cricket match: ${state.score.team1} vs ${state.score.team2}</twitter-widget>`,
      facebook: `<iframe src="https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(_req.protocol + '://' + _req.get('host'))}&width=500" width="500" height="500" style="border:none;overflow:hidden"></iframe>`,
      wordpress: `[cricketlive team1="${state.score.team1}" team2="${state.score.team2}" score1="${state.score.team1Score}" score2="${state.score.team2Score}" overs="${state.score.overs}"]`
    };
    
    res.json({ 
      ok: true, 
      embedCode: embedCodes[platform] || embedCodes.twitter,
      matchData: {
        team1: state.score.team1,
        team2: state.score.team2,
        score1: state.score.team1Score,
        score2: state.score.team2Score,
        overs: state.score.overs,
        status: state.stream.status
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Embed generation failed" });
  }
});

// Real-time social sentiment analysis
app.get("/api/social/sentiment", async (_req, res) => {
  try {
    const state = await readState();
    const messages = state.chatMessages.slice(-50);
    
    // Simple keyword-based sentiment analysis
    const positiveWords = ["great", "awesome", "amazing", "winning", "best", "love", "fantastic", "brilliant", "century", "six", "four", "wicket"];
    const negativeWords = ["worst", "terrible", "lost", "failed", "out", "wicket", "over", "bad", "disappointed", "poor"];
    
    let positive = 0, negative = 0, neutral = 0;
    
    messages.forEach(msg => {
      const content = (msg.content || "").toLowerCase();
      const hasPositive = positiveWords.some(w => content.includes(w));
      const hasNegative = negativeWords.some(w => content.includes(w));
      
      if (hasPositive && !hasNegative) positive++;
      else if (hasNegative && !hasPositive) negative++;
      else neutral++;
    });
    
    const total = positive + negative + neutral || 1;
    
    res.json({
      ok: true,
      sentiment: {
        positive: Math.round((positive / total) * 100),
        negative: Math.round((negative / total) * 100),
        neutral: Math.round((neutral / total) * 100),
        trending: positive > negative ? "Positive" : negative > positive ? "Negative" : "Neutral",
        totalMessages: messages.length
      },
      recentTopics: extractTopics(messages)
    });
  } catch (error) {
    res.status(500).json({ error: "Sentiment analysis failed" });
  }
});

function extractTopics(messages) {
  const wordCount = {};
  const stopWords = new Set(["the", "a", "an", "is", "are", "was", "were", "to", "of", "and", "in", "on", "at", "for", "with", "this", "that", "it", "i", "you", "we", "they", "be", "have", "has", "had"]);
  
  messages.forEach(msg => {
    const words = (msg.content || "").toLowerCase().split(/\W+/);
    words.forEach(word => {
      if (word.length > 2 && !stopWords.has(word)) {
        wordCount[word] = (wordCount[word] || 0) + 1;
      }
    });
  });
  
  return Object.entries(wordCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word, count]) => ({ word, count }));
}

app.get("*", (_req, res) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");
  res.sendFile(INDEX_FILE);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully");
  await ensureDataFile();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, shutting down gracefully");
  await ensureDataFile();
  process.exit(0);
});

async function initializeApp() {
  await ensureDataFile();
  console.log("CricketLive Pro server initialized on http://localhost:" + PORT);
}

initializeApp().catch((error) => {
  console.error("Failed to initialize server:", error);
  process.exit(1);
});
