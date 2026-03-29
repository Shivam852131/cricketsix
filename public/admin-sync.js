// Advanced Admin Sync Functions
// Add these to admin.html for enhanced bidirectional sync

// ==================== ADVANCED SYNC FEATURES ====================

// Real-time state synchronization
async function syncToUser() {
  try {
    const state = await apiCall('/state');
    
    // Update user-facing elements
    if (window.CricketLive) {
      window.CricketLive.state = state;
      window.CricketLive.refreshData();
    }
    
    logActivity('State synced to user view');
    showToast('Synced to user view!', 'success');
  } catch (error) {
    console.error('Sync error:', error);
    showToast('Sync failed', 'error');
  }
}

// Enhanced stream URL sync
async function syncStreamUrl() {
  const url = document.getElementById('stream-url').value;
  const platform = document.getElementById('stream-platform').value;
  
  try {
    const response = await apiCall('/state', {
      method: 'PUT',
      body: JSON.stringify({
        streamUrl: url,
        streamPlatform: platform
      })
    });
    
    if (response.ok) {
      logActivity(`Stream URL synced: ${url.substring(0, 30)}...`);
      showToast('Stream URL updated!', 'success');
    }
  } catch (error) {
    console.error('Stream sync error:', error);
  }
}

// Bulk update multiple fields at once
async function bulkUpdate(data) {
  try {
    const response = await apiCall('/admin/bulk-update', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    
    if (response.ok) {
      logActivity('Bulk update completed');
      return response;
    }
  } catch (error) {
    console.error('Bulk update error:', error);
  }
}

// Reset match data safely
async function resetMatchData() {
  if (!confirm('Are you sure you want to reset all match data? This cannot be undone.')) {
    return;
  }
  
  try {
    const response = await apiCall('/admin/reset-match', {
      method: 'POST'
    });
    
    if (response.ok) {
      logActivity('Match data reset');
      showToast('Match data reset!', 'success');
      
      // Reload state
      await loadState();
    }
  } catch (error) {
    console.error('Reset error:', error);
    showToast('Reset failed', 'error');
  }
}

// Get win probability over time
async function fetchWinProbability() {
  try {
    const response = await fetch('/api/match/win-probability');
    const data = await response.json();
    
    if (data.ok) {
      const team1El = document.getElementById('ai-chaseable');
      const team2El = document.getElementById('ai-required-rr');
      
      if (team1El) team1El.textContent = `${data.team1Probability}%`;
      if (team2El) team2El.textContent = `${data.team2Probability}%`;
    }
  } catch (error) {
    console.error('Win probability error:', error);
  }
}

// Get match timeline
async function fetchMatchTimeline() {
  try {
    const response = await fetch('/api/match/timeline');
    const data = await response.json();
    
    if (data.ok && data.timeline) {
      renderTimeline(data.timeline);
    }
  } catch (error) {
    console.error('Timeline error:', error);
  }
}

// Connection status monitoring
let connectionMonitor = null;

function startConnectionMonitor() {
  if (connectionMonitor) clearInterval(connectionMonitor);
  
  connectionMonitor = setInterval(async () => {
    try {
      const response = await fetch('/api/connection/status');
      const data = await response.json();
      
      if (data.ok) {
        updateConnectionIndicator('connected');
        
        // Update connection text if exists
        const statusEl = document.getElementById('connection-text');
        if (statusEl) {
          statusEl.textContent = 'Connected';
          statusEl.className = 'text-xs text-green-400';
        }
      }
    } catch (error) {
      updateConnectionIndicator('disconnected');
      
      const statusEl = document.getElementById('connection-text');
      if (statusEl) {
        statusEl.textContent = 'Disconnected';
        statusEl.className = 'text-xs text-red-400';
      }
    }
  }, 5000);
}

function updateConnectionIndicator(status) {
  const indicator = document.getElementById('connection-indicator');
  if (!indicator) return;
  
  const tone = status === 'connected' ? 'is-live' : status === 'connecting' ? 'is-warn' : 'is-offline';
  indicator.className = `status-dot ${tone}`;
}

// Enhanced activity logging
function logActivity(message, type = 'info') {
  const activityLog = document.getElementById('activity-log');
  if (!activityLog) return;
  
  const timestamp = new Date().toLocaleTimeString();
  const entry = document.createElement('div');
  entry.className = 'flex items-center gap-2 text-sm py-1';
  
  const typeColors = {
    info: 'text-blue-400',
    success: 'text-green-400',
    warning: 'text-yellow-400',
    error: 'text-red-400'
  };
  
  entry.innerHTML = `
    <span class="text-slate-500">${timestamp}</span>
    <span class="${typeColors[type] || typeColors.info}">${escapeHtml(message)}</span>
  `;
  
  activityLog.insertBefore(entry, activityLog.firstChild);
  
  // Keep only last 50 entries
  while (activityLog.children.length > 50) {
    activityLog.removeChild(activityLog.lastChild);
  }
}

// Toast notification system
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container') || createToastContainer();
  
  const toast = document.createElement('div');
  toast.className = `px-4 py-3 rounded-lg shadow-lg mb-2 ${
    type === 'success' ? 'bg-green-600' : 
    type === 'error' ? 'bg-red-600' : 
    type === 'warning' ? 'bg-yellow-600' : 'bg-blue-600'
  } text-white text-sm animate-[fadeIn_0.3s_ease-out]`;
  
  toast.textContent = message;
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function createToastContainer() {
  const container = document.createElement('div');
  container.id = 'toast-container';
  container.className = 'fixed bottom-4 right-4 z-50 flex flex-col items-end';
  document.body.appendChild(container);
  return container;
}

// Export functions
window.syncToUser = syncToUser;
window.syncStreamUrl = syncStreamUrl;
window.bulkUpdate = bulkUpdate;
window.resetMatchData = resetMatchData;
window.fetchWinProbability = fetchWinProbability;
window.fetchMatchTimeline = fetchMatchTimeline;
window.startConnectionMonitor = startConnectionMonitor;
window.logActivity = logActivity;
window.showToast = showToast;

// ==================== NEW ADVANCED FEATURES ====================

// WebSocket connection for admin
let adminWs = null;
let adminWsConnected = false;

function initAdminWebSocket() {
  const wsUrl = (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host + '/ws';
  
  try {
    adminWs = new WebSocket(wsUrl);
    
    adminWs.onopen = function() {
      console.log("Admin WebSocket connected");
      adminWsConnected = true;
      
      // Authenticate as admin
      const adminKey = localStorage.getItem('adminKey') || 'admin';
      sendAdminWsMessage('auth', { key: adminKey });
      
      logActivity('WebSocket connected', 'success');
      updateWsIndicator('connected');
    };
    
    adminWs.onmessage = function(event) {
      try {
        const data = JSON.parse(event.data);
        handleAdminWsMessage(data);
      } catch (e) {
        console.error('WS message error:', e);
      }
    };
    
    adminWs.onclose = function() {
      console.log("Admin WebSocket disconnected");
      adminWsConnected = false;
      updateWsIndicator('disconnected');
      logActivity('WebSocket disconnected, reconnecting...', 'warning');
      setTimeout(initAdminWebSocket, 3000);
    };
    
    adminWs.onerror = function(error) {
      console.error('WebSocket error:', error);
      logActivity('WebSocket error', 'error');
    };
  } catch (e) {
    console.error('WebSocket init failed:', e);
  }
}

function sendAdminWsMessage(type, data) {
  if (adminWs && adminWs.readyState === WebSocket.OPEN) {
    adminWs.send(JSON.stringify({ type, ...data }));
    return true;
  }
  return false;
}

function handleAdminWsMessage(data) {
  const { type, payload } = data;
  
  switch (type) {
    case 'auth-success':
      logActivity('Admin authenticated via WebSocket', 'success');
      break;
    case 'state-update':
      // Update local state if needed
      if (window.loadState) window.loadState();
      break;
    case 'chat-message':
      // Could update chat preview
      break;
  }
}

function updateWsIndicator(status) {
  const indicator = document.getElementById('ws-indicator');
  if (indicator) {
    indicator.className = `w-3 h-3 rounded-full ${status === 'connected' ? 'bg-green-500' : 'bg-red-500'}`;
  }
}

// ML Predictions
async function fetchMLPredictions() {
  try {
    const response = await apiCall('/prediction/ml');
    const data = await response.json();
    
    if (data.ok && data.winProbability) {
      // Update UI elements
      const wp1 = document.getElementById('ml-team1-win');
      const wp2 = document.getElementById('ml-team2-win');
      if (wp1) wp1.textContent = `${data.winProbability.team1WinProbability}%`;
      if (wp2) wp2.textContent = `${data.winProbability.team2WinProbability}%`;
      
      // Score prediction
      const sp = document.getElementById('ml-projected-score');
      if (sp && data.scorePrediction) {
        sp.textContent = data.scorePrediction.projectedScore;
      }
      
      logActivity('ML predictions updated', 'success');
      return data;
    }
  } catch (error) {
    console.error('ML prediction error:', error);
    logActivity('ML prediction failed', 'error');
  }
}

// Analytics Dashboard
async function fetchAnalyticsDashboard() {
  try {
    const response = await apiCall('/analytics/dashboard');
    const data = await response.json();
    
    if (data.ok && data.dashboard) {
      const dash = data.dashboard;
      
      // Update overview
      const totalRuns = document.getElementById('dash-total-runs');
      const totalWickets = document.getElementById('dash-total-wickets');
      const runRate = document.getElementById('dash-run-rate');
      
      if (totalRuns) totalRuns.textContent = dash.overview?.totalRuns || 0;
      if (totalWickets) totalWickets.textContent = dash.overview?.totalWickets || 0;
      if (runRate) runRate.textContent = dash.overview?.currentRunRate || '0.00';
      
      // Update server metrics
      const uptime = document.getElementById('dash-uptime');
      const wsConn = document.getElementById('dash-ws-connections');
      const apiCalls = document.getElementById('dash-api-calls');
      
      if (uptime) uptime.textContent = formatUptime(dash.serverMetrics?.uptime || 0);
      if (wsConn) wsConn.textContent = dash.serverMetrics?.wsConnections || 0;
      if (apiCalls) apiCalls.textContent = dash.serverMetrics?.totalApiCalls || 0;
      
      logActivity('Analytics dashboard updated', 'success');
      return data;
    }
  } catch (error) {
    console.error('Dashboard error:', error);
    logActivity('Dashboard fetch failed', 'error');
  }
}

function formatUptime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

// Social Media Integration
async function fetchShareOptions() {
  try {
    const response = await fetch('/api/social/share-options');
    const data = await response.json();
    
    if (data.ok && data.options) {
      // Update share buttons
      const twitterBtn = document.getElementById('share-twitter');
      const fbBtn = document.getElementById('share-facebook');
      const waBtn = document.getElementById('share-whatsapp');
      
      if (twitterBtn) twitterBtn.href = data.options.twitter.url;
      if (fbBtn) fbBtn.href = data.options.facebook.url;
      if (waBtn) waBtn.href = data.options.whatsapp.url;
      
      return data.options;
    }
  } catch (error) {
    console.error('Share options error:', error);
  }
}

async function fetchSentiment() {
  try {
    const response = await fetch('/api/social/sentiment');
    const data = await response.json();
    
    if (data.ok && data.sentiment) {
      const sent = data.sentiment;
      
      const positiveEl = document.getElementById('sentiment-positive');
      const negativeEl = document.getElementById('sentiment-negative');
      const neutralEl = document.getElementById('sentiment-neutral');
      const trendingEl = document.getElementById('sentiment-trending');
      
      if (positiveEl) positiveEl.textContent = `${sent.positive}%`;
      if (negativeEl) negativeEl.textContent = `${sent.negative}%`;
      if (neutralEl) neutralEl.textContent = `${sent.neutral}%`;
      if (trendingEl) trendingEl.textContent = sent.trending;
      
      // Update sentiment bar
      const bar = document.getElementById('sentiment-bar');
      if (bar) {
        bar.style.background = `linear-gradient(90deg, #22c55e ${sent.positive}%, #eab308 ${sent.positive + sent.neutral}%, #ef4444 100%)`;
      }
      
      return data;
    }
  } catch (error) {
    console.error('Sentiment error:', error);
  }
}

// WebRTC Room Management
async function createWebRTCRoom() {
  try {
    const response = await apiCall('/webrtc/room', {
      method: 'POST',
      body: JSON.stringify({})
    });
    const data = await response.json();
    
    if (data.ok) {
      logActivity(`WebRTC room created: ${data.roomId}`, 'success');
      return data.roomId;
    }
  } catch (error) {
    console.error('WebRTC room error:', error);
    logActivity('WebRTC room creation failed', 'error');
  }
}

// Export new functions
window.initAdminWebSocket = initAdminWebSocket;
window.fetchMLPredictions = fetchMLPredictions;
window.fetchAnalyticsDashboard = fetchAnalyticsDashboard;
window.fetchShareOptions = fetchShareOptions;
window.fetchSentiment = fetchSentiment;
window.createWebRTCRoom = createWebRTCRoom;

// Initialize when admin dashboard loads
window.addEventListener('adminDashboardLoaded', function() {
  initAdminWebSocket();
  
  // Set up periodic updates
  setInterval(fetchMLPredictions, 30000);
  setInterval(fetchAnalyticsDashboard, 10000);
  setInterval(fetchSentiment, 15000);
  
  logActivity('Advanced features initialized', 'info');
});
