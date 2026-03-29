// CricketLive Pro - Advanced Frontend Application
// ================================================

// Global State
window.appState = {
  match: null,
  innings: [],
  ballFeed: [],
  players: [],
  currentInnings: 0,
  selectedTab: 'live',
  selectedTeam: 'mi',
  selectedInnings: 2,
  notifications: [],
  connected: false
};

window.charts = {};
window.wsConnection = null;
window.reconnectTimer = null;

// Configuration
const API_BASE = window.location.origin + '/api';
const WS_BASE = window.location.origin.replace(/^http/, 'ws') + '/ws';

// ============================================
// Utility Functions
// ============================================

function $(selector) {
  return document.querySelector(selector);
}

function $$(selector) {
  return document.querySelectorAll(selector);
}

function formatNumber(num) {
  return new Intl.NumberFormat('en-IN').format(num);
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function getTimeAgo(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  
  if (diff < 60) return 'Just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function parseScoreText(scoreText) {
  const match = String(scoreText || '').trim().match(/^(\d+)(?:\/(\d+))?/);
  return {
    runs: match ? Number(match[1]) : 0,
    wickets: match && match[2] ? Number(match[2]) : 0
  };
}

function getPrimaryLiveCard(state) {
  return asArray(state?.liveMatches)[0] || null;
}

function getScoreSnapshot(state) {
  const score = state?.score || {};
  const liveCard = getPrimaryLiveCard(state) || {};
  return {
    title: score.matchTitle || liveCard.matchTitle || [score.team1, score.team2].filter(Boolean).join(' vs ') || 'Match Centre',
    venue: score.venue || liveCard.venue || 'Venue update pending',
    status: score.matchStatus || liveCard.result || 'Live coverage underway',
    team1: {
      name: score.team1 || liveCard.team1 || 'Team 1',
      code: score.team1Flag || liveCard.team1Flag || 'T1',
      score: score.team1Score || liveCard.score || '0/0',
      overs: score.overs ? `(${score.overs} ov)` : '',
      captain: score.team1Captain || ''
    },
    team2: {
      name: score.team2 || liveCard.team2 || 'Team 2',
      code: score.team2Flag || liveCard.team2Flag || 'T2',
      score: score.team2Score || state?.content?.matchCenter?.team2Score || 'Yet to bat',
      overs: score.team2Score ? '' : '',
      captain: score.team2Captain || ''
    },
    partnership: score.partnership || 'Partnership building',
    lastWicket: score.fow || 'Fall of wickets updating',
    powerplay: score.pp || 'Powerplay benchmark loading',
    recentOver: asArray(state?.ballFeed).slice(-6).map((ball) => ball.label || '.').join(' ') || '- - - - - -',
    currentRR: score.runRate || '0.00',
    requiredRR: score.reqRR || '0.00'
  };
}

function getLiveBattingRows(state) {
  const rows = asArray(state?.content?.analytics?.battingRows);
  if (rows.length) {
    return rows.map((row, index) => ({
      name: row.name || 'Batter',
      balls: row.balls || '-',
      runs: row.runs || '0',
      strikeRate: row.strikeRate || '-',
      fours: row.fours || '0',
      sixes: row.sixes || '0',
      role: index === 0 ? 'Set batter' : 'Support batter'
    }));
  }

  return asArray(state?.content?.performers?.batsmen).map((row, index) => ({
    name: row.name || 'Batter',
    balls: row.balls || '-',
    runs: row.runs || '0',
    strikeRate: row.strikeRate || row.sr || '-',
    fours: row.fours || '0',
    sixes: row.sixes || '0',
    role: index === 0 ? 'Set batter' : 'Support batter'
  }));
}

function getLiveBowlingRows(state) {
  const rows = asArray(state?.content?.analytics?.bowlingRows);
  if (rows.length) {
    return rows.map((row, index) => ({
      name: row.name || 'Bowler',
      overs: row.overs || '-',
      runs: row.runs || '0',
      wickets: row.wickets || '0',
      economy: row.economy || '-',
      isCurrent: index === 0
    }));
  }

  return asArray(state?.content?.performers?.bowlers).map((row, index) => ({
    name: row.name || 'Bowler',
    overs: row.overs || '-',
    runs: row.runs || '0',
    wickets: row.wickets || '0',
    economy: row.economy || '-',
    isCurrent: index === 0
  }));
}

function getTimelineRows(state) {
  return asArray(state?.timelineEvents).map((event) => ({
    title: event.title || 'Match event',
    detail: event.detail || '',
    type: event.type || 'update',
    timestamp: event.timestamp || new Date().toISOString(),
    over: event.over || event.badge || ''
  }));
}

function getScheduleCards(state) {
  return []
    .concat(asArray(state?.liveMatches))
    .concat(asArray(state?.upcomingMatches))
    .concat(asArray(state?.recentResults));
}

function formatScheduleCardTime(match) {
  const dateValue = match?.matchDateTime || match?.date;
  if (!dateValue) return 'Date TBA';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return String(dateValue);
  return `${formatDate(dateValue)} • ${formatTime(dateValue)}`;
}

function getBallEntryTone(ball) {
  if (ball?.wickets > 0 || ball?.type === 'wicket' || ball?.label === 'W') return 'wicket';
  if (Number(ball?.runs) === 6 || ball?.label === '6') return '6';
  if (Number(ball?.runs) === 4 || ball?.label === '4') return '4';
  if (ball?.type === 'wide' || ball?.type === 'noball') return 'wide';
  return Number(ball?.runs) === 0 ? 'dot' : String(ball?.runs || 1);
}

function getSearchDataset(state) {
  const teams = new Set();
  const players = new Set();

  getScheduleCards(state).forEach((match) => {
    if (match?.team1) teams.add(match.team1);
    if (match?.team2) teams.add(match.team2);
  });

  getLiveBattingRows(state).forEach((row) => players.add(row.name));
  getLiveBowlingRows(state).forEach((row) => players.add(row.name));

  return {
    teams: Array.from(teams),
    players: Array.from(players)
  };
}

function updateInningsButtons() {
  const snapshot = getScoreSnapshot(appState.match);
  const buttons = $$('.innings-btn');
  if (buttons[0]) buttons[0].textContent = `1st Innings - ${snapshot.team2.name}`;
  if (buttons[1]) buttons[1].textContent = `2nd Innings - ${snapshot.team1.name}`;
}

// ============================================
// Toast Notifications
// ============================================

window.showToast = function(message, type = 'info') {
  const container = $('#toast-container');
  if (!container) return;
  
  const toast = document.createElement('div');
  
  const bgColors = {
    info: 'bg-blue-600',
    success: 'bg-green-600',
    warning: 'bg-yellow-600',
    error: 'bg-red-600'
  };
  
  const icons = {
    info: 'ri-information-line',
    success: 'ri-check-line',
    warning: 'ri-alert-line',
    error: 'ri-close-circle-line'
  };
  
  toast.className = `toast ${bgColors[type]} px-4 py-3 rounded-lg shadow-lg flex items-center gap-3`;
  toast.innerHTML = `
    <i class="${icons[type]}"></i>
    <span class="text-sm font-medium">${message}</span>
  `;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
};

// ============================================
// API Functions
// ============================================

async function fetchAPI(endpoint) {
  try {
    const response = await fetch(API_BASE + endpoint);
    if (!response.ok) throw new Error('API Error');
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    return null;
  }
}

async function loadMatchData() {
  const data = await fetchAPI('/state');
  if (data) {
    appState.match = data;
    appState.notifications = asArray(data.notifications).slice().reverse();
    updateUI();
    renderNotifications();
    updateNotificationBadge();
  }
}

async function loadAIInsights() {
  const response = await fetchAPI('/ai/insights');
  if (response && response.insights) {
    const insights = response.insights;
    const transformedInsights = [
      { title: 'Match Summary', text: insights.briefing?.summary || 'Analyzing match...', type: 'analysis' },
      { title: 'Prediction', text: `Projected: ${insights.prediction?.projectedTotal || '-'} runs`, type: 'prediction' },
      { title: 'Momentum', text: `${insights.briefing?.momentum || 'Neutral'} - ${insights.recommendation || ''}`, type: 'stats' },
      { title: 'Key Signal', text: insights.keySignals?.[0] || 'Analyzing...', type: 'alert' }
    ];
    renderAIInsights(transformedInsights);
  } else {
    renderAIInsights(null);
  }
}

// ============================================
// WebSocket Connection
// ============================================

function initWebSocket() {
  try {
    if (wsConnection) {
      wsConnection.close();
    }
    
    wsConnection = new WebSocket(WS_BASE);
    
    wsConnection.onopen = () => {
      console.log('WebSocket connected');
      appState.connected = true;
      showToast('Connected to live updates', 'success');
    };
    
    wsConnection.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      } catch (e) {
        console.error('WebSocket message error:', e);
      }
    };
    
    wsConnection.onclose = () => {
      console.log('WebSocket disconnected');
      appState.connected = false;
      scheduleReconnect();
    };
    
    wsConnection.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  } catch (error) {
    console.error('WebSocket init failed:', error);
    scheduleReconnect();
  }
}

function scheduleReconnect() {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => {
    console.log('Attempting WebSocket reconnect...');
    initWebSocket();
  }, 5000);
}

function handleWebSocketMessage(data) {
  switch (data.type) {
    case 'state_update':
      appState.match = data.state;
      updateUI();
      break;
    case 'ball_update':
      addBallToFeed(data.ball);
      break;
    case 'score_update':
      updateScoreDisplay(data.score);
      break;
    case 'notification':
      showToast(data.message, data.level || 'info');
      addNotification(data);
      break;
    default:
      console.log('Unknown WS message:', data);
  }
}

// ============================================
// UI Update Functions
// ============================================

function updateUI() {
  if (!appState.match) return;
  
  updateMatchHeader();
  updateScoreCards();
  updateBallFeed();
  updateCurrentOverBalls();
  updateBattingCard();
  updateBowlingCard();
  updateTimeline();
  updateMatchTabs();
  updateInningsButtons();
  updateScorecard(appState.selectedInnings);
}

function updateMatchHeader() {
  const snapshot = getScoreSnapshot(appState.match);
  
  const matchTitle = $('#match-title');
  const matchVenue = $('#match-venue');
  const matchStatus = $('#match-status');
  
  if (matchTitle) matchTitle.textContent = snapshot.title;
  if (matchVenue) matchVenue.textContent = snapshot.venue;
  if (matchStatus) matchStatus.textContent = snapshot.status || getMatchStatusText(appState.match);
}

function getMatchStatusText(match) {
  const snapshot = getScoreSnapshot(match);
  return snapshot.status || 'Match in progress';
}

function updateScoreCards() {
  if (!appState.match) return;
  const snapshot = getScoreSnapshot(appState.match);
  
  // Team 1
  const team1Name = $('#team1-name');
  const team1Score = $('#team1-score');
  const team1Overs = $('#team1-overs');
  const team1Captain = $('#team1-captain');
  
  if (team1Name) team1Name.textContent = snapshot.team1.name;
  if (team1Score) team1Score.textContent = snapshot.team1.score;
  if (team1Overs) team1Overs.textContent = snapshot.team1.overs;
  if (team1Captain) team1Captain.textContent = snapshot.team1.captain;
  
  // Team 2
  const team2Name = $('#team2-name');
  const team2Score = $('#team2-score');
  const team2Overs = $('#team2-overs');
  const team2Captain = $('#team2-captain');
  
  if (team2Name) team2Name.textContent = snapshot.team2.name;
  if (team2Score) team2Score.textContent = snapshot.team2.score;
  if (team2Overs) team2Overs.textContent = snapshot.team2.overs;
  if (team2Captain) team2Captain.textContent = snapshot.team2.captain;
  
  // Stats
  const partnership = $('#partnership');
  const lastWicket = $('#last-wicket');
  const powerplay = $('#powerplay');
  const recentOvers = $('#recent-overs');
  const currentRR = $('#current-rr');
  const requiredRR = $('#required-rr');
  
  if (partnership) partnership.textContent = snapshot.partnership;
  if (lastWicket) lastWicket.textContent = snapshot.lastWicket;
  if (powerplay) powerplay.textContent = snapshot.powerplay;
  if (recentOvers) recentOvers.textContent = snapshot.recentOver;
  if (currentRR) currentRR.textContent = snapshot.currentRR;
  if (requiredRR) requiredRR.textContent = snapshot.requiredRR;
}

function updateBallFeed() {
  const container = $('#ball-feed');
  if (!container || !appState.match?.ballFeed) return;

  const feed = appState.match.ballFeed.slice(-20).reverse();
  container.innerHTML = feed.map(ball => {
    const tone = getBallEntryTone(ball);
    const borderClass = tone === 'wicket'
      ? 'border-l-4 border-red-500'
      : tone === '4'
        ? 'border-l-4 border-yellow-500'
        : tone === '6'
          ? 'border-l-4 border-red-400'
          : '';
    const summary = tone === 'wicket'
      ? 'Wicket ball'
      : ball.label === '.'
        ? 'Dot ball'
        : `${ball.label || ball.runs || 0} on the scoreboard`;
    return `
      <div class="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl ${borderClass}">
        <div class="ball-dot ball-${tone}"></div>
        <div class="flex-1">
          <p class="font-semibold text-sm">${summary}</p>
          <p class="text-xs text-slate-400">${ball.type || 'Live update'} • ${getTimeAgo(ball.timestamp || new Date())}</p>
        </div>
        <span class="text-xs text-slate-500">${ball.over || '-'}</span>
      </div>
    `;
  }).join('');
}

function addBallToFeed(ball) {
  if (!appState.match.ballFeed) appState.match.ballFeed = [];
  appState.match.ballFeed.unshift(ball);
  updateBallFeed();
  updateCurrentOverBalls();
}

function updateCurrentOverBalls() {
  const container = $('#current-over-balls');
  if (!container) return;

  const currentOver = asArray(appState.match?.ballFeed).slice(-6);
  container.innerHTML = currentOver.map(ball => `
    <div class="ball-dot ball-${getBallEntryTone(ball)}" title="${ball.label || ball.runs || 0}"></div>
  `).join('');
}

function updateBattingCard() {
  const container = $('#batting-card');
  if (!container) return;

  const battingRows = getLiveBattingRows(appState.match);
  if (!battingRows.length) {
    container.innerHTML = '<div class="text-sm text-slate-400">Live batting card will appear once score data arrives.</div>';
    return;
  }

  container.innerHTML = battingRows.map(batsman => `
    <div class="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center font-bold">
          ${batsman.name?.charAt(0) || 'B'}
        </div>
        <div>
          <p class="font-semibold text-sm">${batsman.name}</p>
          <p class="text-xs text-slate-400">${batsman.role || 'Live batter'}</p>
        </div>
      </div>
      <div class="text-right">
        <p class="font-bold">${batsman.runs} (${batsman.balls})</p>
        <p class="text-xs text-slate-400">${batsman.fours}x4 ${batsman.sixes}x6 | SR: ${batsman.strikeRate}</p>
      </div>
    </div>
  `).join('');
}

function updateBowlingCard() {
  const container = $('#bowling-card');
  if (!container) return;

  const bowlingRows = getLiveBowlingRows(appState.match);
  if (!bowlingRows.length) {
    container.innerHTML = '<div class="text-sm text-slate-400">Live bowling card will appear once score data arrives.</div>';
    return;
  }

  container.innerHTML = bowlingRows.map(bowler => `
    <div class="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center font-bold">
          ${bowler.name?.charAt(0) || 'B'}
        </div>
        <div>
          <p class="font-semibold text-sm">${bowler.name}</p>
          <p class="text-xs text-slate-400">${bowler.isCurrent ? 'Current' : ''}</p>
        </div>
      </div>
      <div class="text-right">
        <p class="font-bold">${bowler.overs}-${bowler.maidens}-${bowler.runs}-${bowler.wickets}</p>
        <p class="text-xs text-slate-400">Econ: ${bowler.economy}</p>
      </div>
    </div>
  `).join('');
}

function updateTimeline() {
  const container = $('#match-timeline');
  if (!container) return;

  const timelineRows = getTimelineRows(appState.match).slice(0, 10);
  if (!timelineRows.length) {
    container.innerHTML = '<div class="text-sm text-slate-400">Timeline updates will appear here as the match unfolds.</div>';
    return;
  }

  container.innerHTML = timelineRows.map(event => `
    <div class="flex items-start gap-3">
      <div class="timeline-dot border-${event.type === 'wicket' ? 'red' : event.type === 'boundary' ? 'yellow' : 'blue'}-500"></div>
      <div class="flex-1">
        <p class="text-sm font-medium">${event.title}</p>
        <p class="text-xs text-slate-400">${event.detail || event.over || getTimeAgo(event.timestamp)}</p>
      </div>
    </div>
  `).join('');
}

function updateMatchTabs() {
  const container = $('#match-tabs');
  if (!container) return;

  const matches = getScheduleCards(appState.match).slice(0, 5);
  if (!matches.length) {
    container.innerHTML = `
      <div class="flex items-center gap-2 px-4 py-2 bg-blue-600/30 text-blue-400 rounded-full text-sm font-semibold">
        <span>Match hub loading</span>
      </div>
    `;
    return;
  }

  container.innerHTML = matches.map((match, index) => `
    <div class="flex items-center gap-2 px-4 py-2 ${match.status === 'live' && index === 0 ? 'bg-blue-600/30 text-blue-400' : 'bg-slate-800/80 text-slate-300'} rounded-full text-sm font-semibold cursor-pointer" onclick="selectMatch('${match.id}')">
      <span>${match.team1Flag || match.team1?.slice(0, 3)} vs ${match.team2Flag || match.team2?.slice(0, 3)}</span>
      ${match.status === 'live' ? '<span class="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>' : ''}
    </div>
  `).join('');
}

// ============================================
// AI Insights
// ============================================

function renderAIInsights(insights) {
  const defaultInsights = [
    { title: 'Win Probability Shift', text: 'KKR\'s win probability increased to 58% after the wicket of Suryakumar Yadav.', type: 'analysis' },
    { title: 'Key Matchup', text: 'Varun Chakravarthy has now dismissed Yadav 3 times in IPL. A crucial advantage for KKR.', type: 'stats' },
    { title: 'Required Rate Alert', text: 'MI need 11.73 runs per over. They\'ll need to accelerate significantly in the death overs.', type: 'alert' },
    { title: 'Prediction', text: 'Based on current trajectory, KKR are favorites with 58% win probability.', type: 'prediction' }
  ];
  
  const data = insights || defaultInsights;
  const container = $('#ai-insights');
  if (!container) return;
  
  const icons = {
    analysis: 'ri-line-chart-line',
    stats: 'ri-bar-chart-box-line',
    alert: 'ri-alert-line',
    prediction: 'ri-crystal-ball-line'
  };
  
  const colors = {
    analysis: 'from-blue-500 to-cyan-500',
    stats: 'from-green-500 to-emerald-500',
    alert: 'from-yellow-500 to-orange-500',
    prediction: 'from-purple-500 to-pink-500'
  };
  
  container.innerHTML = data.map(i => `
    <div class="flex items-start gap-3 p-3 bg-slate-800/50 rounded-xl">
      <div class="w-8 h-8 rounded-lg bg-gradient-to-br ${colors[i.type] || colors.analysis} flex items-center justify-center flex-shrink-0">
        <i class="${icons[i.type] || icons.analysis} text-sm"></i>
      </div>
      <div>
        <p class="font-semibold text-sm">${i.title}</p>
        <p class="text-xs text-slate-400 mt-1">${i.text}</p>
      </div>
    </div>
  `).join('');
}

// ============================================
// Schedule Functions
// ============================================

function renderSchedule() {
  const container = $('#schedule-content');
  if (!container) return;

  const schedule = getScheduleCards(appState.match);
  if (!schedule.length) {
    container.innerHTML = '<div class="text-sm text-slate-400">Schedule data will appear here once fixtures are published.</div>';
    return;
  }
  
  container.innerHTML = `
    <div class="space-y-4">
      ${schedule.map(s => `
        <div class="match-card glass-card rounded-xl p-4 cursor-pointer hover:bg-slate-800/80 transition" onclick="selectMatch('${s.id}')">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="text-xs font-bold text-slate-500">MATCH ${s.id}</span>
              ${s.status === 'live' ? '<span class="status-live px-2 py-0.5 rounded text-xs font-bold">LIVE</span>' : s.status === 'completed' ? '<span class="status-completed px-2 py-0.5 rounded text-xs font-bold">DONE</span>' : '<span class="status-upcoming px-2 py-0.5 rounded text-xs font-bold">UPCOMING</span>'}
            </div>
            <span class="text-sm text-slate-400">${formatScheduleCardTime(s)}</span>
          </div>
          <div class="flex items-center justify-between mt-3">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center font-display font-bold">${s.team1Flag || s.team1?.slice(0, 3)}</div>
              <span class="font-bold">vs</span>
              <div class="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center font-display font-bold">${s.team2Flag || s.team2?.slice(0, 3)}</div>
            </div>
            <div class="text-right">
              <p class="text-sm text-slate-400">${s.venue || s.result || 'Venue TBA'}</p>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// ============================================
// Tab Functions
// ============================================

function initTabs() {
  const tabButtons = $$('.tab-btn');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      switchTab(tab);
    });
  });
}

function switchTab(tabName) {
  appState.selectedTab = tabName;
  
  // Update buttons
  $$('.tab-btn').forEach(btn => {
    if (btn.dataset.tab === tabName) {
      btn.classList.add('tab-active');
      btn.classList.remove('text-slate-400');
    } else {
      btn.classList.remove('tab-active');
      btn.classList.add('text-slate-400');
    }
  });
  
  // Update panes
  $$('.tab-pane').forEach(pane => {
    pane.classList.add('hidden');
  });
  
  const activePane = $(`#tab-${tabName}`);
  if (activePane) {
    activePane.classList.remove('hidden');
  }
}

// ============================================
// Modal Functions
// ============================================

window.openScheduleModal = function() {
  const modal = $('#schedule-modal');
  if (modal) {
    renderSchedule();
    modal.classList.remove('hidden');
  }
};

window.closeScheduleModal = function() {
  const modal = $('#schedule-modal');
  if (modal) modal.classList.add('hidden');
};

window.openSearch = function() {
  const modal = $('#search-modal');
  if (modal) {
    modal.classList.remove('hidden');
    const input = $('#search-input');
    if (input) input.focus();
  }
};

window.closeSearch = function() {
  const modal = $('#search-modal');
  if (modal) {
    modal.classList.add('hidden');
    const input = $('#search-input');
    const results = $('#search-results');
    if (input) input.value = '';
    if (results) results.innerHTML = '';
  }
};

window.handleSearch = function(query) {
  const results = $('#search-results');
  if (!results) return;
  
  if (!query.trim()) {
    results.innerHTML = '';
    return;
  }
  
  const dataset = getSearchDataset(appState.match);
  const players = dataset.players;
  const teams = dataset.teams;
  
  const filteredPlayers = players.filter(p => p.toLowerCase().includes(query.toLowerCase()));
  const filteredTeams = teams.filter(t => t.toLowerCase().includes(query.toLowerCase()));
  
  results.innerHTML = `
    ${filteredTeams.length ? `
      <div class="mb-3">
        <p class="text-xs text-slate-500 uppercase tracking-wider mb-2">Teams</p>
        ${filteredTeams.map(team => `
          <div class="p-3 bg-slate-800/50 rounded-lg hover:bg-slate-700/50 cursor-pointer transition">
            <p class="font-medium">${team}</p>
          </div>
        `).join('')}
      </div>
    ` : ''}
    ${filteredPlayers.length ? `
      <div>
        <p class="text-xs text-slate-500 uppercase tracking-wider mb-2">Players</p>
        ${filteredPlayers.map(player => `
          <div class="p-3 bg-slate-800/50 rounded-lg hover:bg-slate-700/50 cursor-pointer transition">
            <p class="font-medium">${player}</p>
          </div>
        `).join('')}
      </div>
    ` : ''}
    ${!filteredPlayers.length && !filteredTeams.length ? '<p class="text-slate-400 text-center py-4">No results found</p>' : ''}
  `;
};

window.openNotifications = function() {
  const panel = $('#notification-panel');
  if (panel) {
    panel.style.transform = 'translateX(0)';
  }
};

window.closeNotifications = function() {
  const panel = $('#notification-panel');
  if (panel) {
    panel.style.transform = 'translateX(100%)';
  }
};

function addNotification(data) {
  appState.notifications.unshift(data);
  updateNotificationBadge();
  renderNotifications();
}

function updateNotificationBadge() {
  const badge = $('#notification-badge');
  if (badge) {
    const count = appState.notifications.length;
    badge.textContent = count > 9 ? '9+' : count;
    badge.classList.toggle('hidden', count === 0);
  }
}

function renderNotifications() {
  const container = $('#notification-list');
  if (!container) return;
  
  if (appState.notifications.length === 0) {
    container.innerHTML = '<p class="text-slate-400 text-center py-8">No notifications</p>';
    return;
  }
  
  container.innerHTML = appState.notifications.slice(0, 20).map(n => `
    <div class="p-3 bg-slate-800/50 rounded-xl">
      <p class="font-medium text-sm">${n.message}</p>
      <p class="text-xs text-slate-400 mt-1">${getTimeAgo(n.timestamp || new Date())}</p>
    </div>
  `).join('');
}

// ============================================
// Match Selection
// ============================================

window.selectMatch = function(matchNum) {
  closeScheduleModal();
  const liveMatchId = String(getPrimaryLiveCard(appState.match)?.id || '');
  if (String(matchNum) === liveMatchId) {
    showToast('This is the current live match', 'info');
  } else {
    showToast('Use the full Matches and Schedule pages to follow the broader fixture list', 'info');
  }
};

// ============================================
// Theme Toggle
// ============================================

window.toggleTheme = function() {
  document.documentElement.classList.toggle('dark');
  const icon = $('#theme-icon');
  if (icon) {
    icon.classList.toggle('ri-sun-line');
    icon.classList.toggle('ri-moon-line');
  }
};

// ============================================
// Innnings Selection
// ============================================

window.selectInnings = function(innings) {
  appState.selectedInnings = innings;
  
  $$('.innings-btn').forEach(btn => {
    if (parseInt(btn.dataset.innings) === innings) {
      btn.classList.add('bg-blue-600');
      btn.classList.remove('bg-slate-700');
    } else {
      btn.classList.remove('bg-blue-600');
      btn.classList.add('bg-slate-700');
    }
  });
  
  updateScorecard(innings);
};

function updateScorecard(innings) {
  const liveBatting = getLiveBattingRows(appState.match);
  const liveBowling = getLiveBowlingRows(appState.match);

  // Update batting scorecard
  const battingContainer = $('#batting-scorecard');
  if (battingContainer) {
    const battingData = liveBatting.length
      ? liveBatting.map((row) => ({
          name: row.name,
          status: row.role || 'Live innings',
          runs: row.runs,
          balls: row.balls,
          fours: row.fours,
          sixes: row.sixes,
          sr: row.strikeRate
        }))
      : (innings === 1 ? getKKRBatting() : getMIBatting());
    battingContainer.innerHTML = battingData.map(b => `
      <tr>
        <td class="font-medium">${b.name}</td>
        <td class="text-slate-400">${b.status}</td>
        <td class="text-center font-bold">${b.runs}</td>
        <td class="text-center">${b.balls}</td>
        <td class="text-center">${b.fours}</td>
        <td class="text-center">${b.sixes}</td>
        <td class="text-center">${b.sr}</td>
      </tr>
    `).join('');
  }
  
  // Update bowling scorecard
  const bowlingContainer = $('#bowling-scorecard');
  if (bowlingContainer) {
    const bowlingData = liveBowling.length
      ? liveBowling.map((row) => ({
          name: row.name,
          overs: row.overs,
          maidens: row.maidens || 0,
          runs: row.runs,
          wickets: row.wickets,
          econ: row.economy,
          dots: row.dots || '-'
        }))
      : (innings === 1 ? getMIBowling() : getKKRBowling());
    bowlingContainer.innerHTML = bowlingData.map(b => `
      <tr>
        <td class="font-medium">${b.name}</td>
        <td class="text-center">${b.overs}</td>
        <td class="text-center">${b.maidens}</td>
        <td class="text-center">${b.runs}</td>
        <td class="text-center font-bold">${b.wickets}</td>
        <td class="text-center">${b.econ}</td>
        <td class="text-center">${b.dots}</td>
      </tr>
    `).join('');
  }

  const fallOfWickets = $('#fall-of-wickets');
  if (fallOfWickets) {
    const fowEntries = String(appState.match?.score?.fow || '')
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
    fallOfWickets.innerHTML = fowEntries.length
      ? fowEntries.map((entry) => `<span class="px-3 py-2 bg-slate-800/70 rounded-full text-sm">${entry}</span>`).join('')
      : '<span class="text-sm text-slate-400">Fall of wickets will appear once live data is available.</span>';
  }

  const partnershipsChart = $('#partnerships-chart');
  if (partnershipsChart) {
    const partnershipLabel = appState.match?.score?.partnership || 'Partnership data updating';
    partnershipsChart.innerHTML = `
      <div class="p-4 bg-slate-800/50 rounded-xl">
        <div class="flex items-center justify-between gap-3 mb-3">
          <span class="text-sm font-semibold text-white">Current stand</span>
          <span class="text-xs uppercase tracking-wider text-slate-500">Live</span>
        </div>
        <p class="text-sm text-slate-300">${partnershipLabel}</p>
      </div>
    `;
  }
}

function getKKRBatting() {
  return [
    { name: 'Quinton de Kock', status: 'c Rickelton b Bumrah', runs: 45, balls: 32, fours: 5, sixes: 2, sr: 140.63 },
    { name: 'Sunil Narine', status: 'b Chahar', runs: 28, balls: 18, fours: 3, sixes: 2, sr: 155.56 },
    { name: 'Ajinkya Rahane', status: 'c Tilak b Pandya', runs: 62, balls: 44, fours: 6, sixes: 3, sr: 140.91 },
    { name: 'Shreyas Iyer', status: 'not out', runs: 48, balls: 30, fours: 4, sixes: 3, sr: 160.00 },
    { name: 'Andre Russell', status: 'c Rohit b Bumrah', runs: 15, balls: 8, fours: 1, sixes: 1, sr: 187.50 }
  ];
}

function getKKRBowling() {
  return [
    { name: 'Vaibhav Arora', overs: 4, maidens: 0, runs: 38, wickets: 1, econ: 9.50, dots: 12 },
    { name: 'Harshit Rana', overs: 4, maidens: 0, runs: 45, wickets: 1, econ: 11.25, dots: 10 },
    { name: 'Sunil Narine', overs: 4, maidens: 0, runs: 32, wickets: 0, econ: 8.00, dots: 14 },
    { name: 'Varun Chakravarthy', overs: 4, maidens: 0, runs: 28, wickets: 2, econ: 7.00, dots: 16 },
    { name: 'Andre Russell', overs: 2, maidens: 0, runs: 18, wickets: 0, econ: 9.00, dots: 5 }
  ];
}

function getMIBatting() {
  return [
    { name: 'Rohit Sharma', status: 'not out', runs: 71, balls: 35, fours: 8, sixes: 4, sr: 202.86 },
    { name: 'Ryan Rickelton', status: 'not out', runs: 66, balls: 33, fours: 7, sixes: 3, sr: 200.00 },
    { name: 'Suryakumar Yadav', status: 'c Narine b Varun', runs: 45, balls: 28, fours: 4, sixes: 3, sr: 160.71 },
    { name: 'Tilak Varma', status: '-', runs: 0, balls: 0, fours: 0, sixes: 0, sr: 0 },
    { name: 'Hardik Pandya', status: '-', runs: 0, balls: 0, fours: 0, sixes: 0, sr: 0 }
  ];
}

function getMIBowling() {
  return [
    { name: 'Jasprit Bumrah', overs: 4, maidens: 0, runs: 32, wickets: 2, econ: 8.00, dots: 18 },
    { name: 'Deepak Chahar', overs: 4, maidens: 0, runs: 38, wickets: 1, econ: 9.50, dots: 12 },
    { name: 'Hardik Pandya', overs: 3, maidens: 0, runs: 28, wickets: 1, econ: 9.33, dots: 8 },
    { name: 'Mitchell Santner', overs: 4, maidens: 0, runs: 35, wickets: 0, econ: 8.75, dots: 10 },
    { name: 'Tilak Varma', overs: 2, maidens: 0, runs: 18, wickets: 0, econ: 9.00, dots: 4 }
  ];
}

// ============================================
// Team Selection (Players Tab)
// ============================================

window.selectTeam = function(team) {
  appState.selectedTeam = team;
  
  $$('.team-btn').forEach(btn => {
    if (btn.dataset.team === team) {
      btn.classList.add(team === 'mi' ? 'team-mi' : 'team-kkr');
      btn.classList.remove('bg-slate-700');
    } else {
      btn.classList.remove('team-mi', 'team-kkr');
      btn.classList.add('bg-slate-700');
    }
  });
  
  renderPlayers(team);
};

function renderPlayers(team) {
  const container = $('#player-grid');
  if (!container) return;
  
  const players = team === 'mi' ? getMIPlayers() : getKKRPlayers();
  
  container.innerHTML = players.map(player => `
    <div class="player-card glass-card rounded-xl p-4 cursor-pointer" onclick="openPlayerProfile(${JSON.stringify(player).replace(/"/g, '&quot;')})">
      <div class="flex items-center gap-3 mb-3">
        <div class="w-12 h-12 rounded-full bg-gradient-to-br ${team === 'mi' ? 'from-blue-500 to-cyan-500' : 'from-purple-500 to-pink-500'} flex items-center justify-center font-bold text-lg">
          ${player.name.split(' ').map(n => n[0]).join('')}
        </div>
        <div>
          <p class="font-semibold text-sm">${player.name}</p>
          <p class="text-xs text-slate-400">${player.role}</p>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-2 text-center">
        <div class="p-2 bg-slate-800/50 rounded-lg">
          <p class="text-lg font-bold">${player.stats.runs}</p>
          <p class="text-xs text-slate-400">Runs</p>
        </div>
        <div class="p-2 bg-slate-800/50 rounded-lg">
          <p class="text-lg font-bold">${player.stats.wickets}</p>
          <p class="text-xs text-slate-400">Wickets</p>
        </div>
      </div>
    </div>
  `).join('');
}

function getMIPlayers() {
  return [
    { name: 'Rohit Sharma', role: 'Batsman', stats: { runs: 6520, wickets: 15, fifties: 42, hundreds: 2, highestScore: '109*' } },
    { name: 'Suryakumar Yadav', role: 'Batsman', stats: { runs: 3245, wickets: 0, fifties: 22, hundreds: 1, highestScore: '103*' } },
    { name: 'Hardik Pandya', role: 'All-rounder', stats: { runs: 2580, wickets: 78, fifties: 10, hundreds: 0, highestScore: '91' } },
    { name: 'Jasprit Bumrah', role: 'Bowler', stats: { runs: 56, wickets: 156, fifties: 0, hundreds: 0, highestScore: '10*' } },
    { name: 'Ishan Kishan', role: 'Wicketkeeper', stats: { runs: 2012, wickets: 0, fifties: 12, hundreds: 1, highestScore: '99' } },
    { name: 'Tilak Varma', role: 'Batsman', stats: { runs: 1125, wickets: 2, fifties: 6, hundreds: 0, highestScore: '84' } },
    { name: 'Tim David', role: 'Batsman', stats: { runs: 892, wickets: 0, fifties: 4, hundreds: 0, highestScore: '72*' } },
    { name: 'Piyush Chawla', role: 'Bowler', stats: { runs: 625, wickets: 180, fifties: 0, hundreds: 0, highestScore: '28' } }
  ];
}

function getKKRPlayers() {
  return [
    { name: 'Shreyas Iyer', role: 'Batsman', stats: { runs: 3450, wickets: 0, fifties: 24, hundreds: 1, highestScore: '96' } },
    { name: 'Andre Russell', role: 'All-rounder', stats: { runs: 2280, wickets: 89, fifties: 8, hundreds: 0, highestScore: '88*' } },
    { name: 'Sunil Narine', role: 'All-rounder', stats: { runs: 1120, wickets: 175, fifties: 3, hundreds: 1, highestScore: '102' } },
    { name: 'Nitish Rana', role: 'Batsman', stats: { runs: 2890, wickets: 8, fifties: 18, hundreds: 1, highestScore: '87' } },
    { name: 'Venkatesh Iyer', role: 'All-rounder', stats: { runs: 1450, wickets: 22, fifties: 7, hundreds: 0, highestScore: '83' } },
    { name: 'Quinton de Kock', role: 'Wicketkeeper', stats: { runs: 2680, wickets: 0, fifties: 16, hundreds: 2, highestScore: '108' } },
    { name: 'Varun Chakravarthy', role: 'Bowler', stats: { runs: 45, wickets: 92, fifties: 0, hundreds: 0, highestScore: '8*' } },
    { name: 'Harshit Rana', role: 'Bowler', stats: { runs: 22, wickets: 48, fifties: 0, hundreds: 0, highestScore: '5*' } }
  ];
}

window.openPlayerProfile = function(player) {
  const modal = $('#player-modal');
  const content = $('#player-modal-content');
  
  if (!modal || !content) return;
  
  content.innerHTML = `
    <div class="p-6 border-b border-slate-800">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <div class="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center font-bold text-2xl">
            ${player.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div>
            <h2 class="font-display font-bold text-xl">${player.name}</h2>
            <p class="text-slate-400">${player.role}</p>
          </div>
        </div>
        <button onclick="closePlayerProfile()" class="p-2 hover:bg-slate-800 rounded-lg">
          <i class="ri-close-line text-xl"></i>
        </button>
      </div>
    </div>
    <div class="p-6">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="p-4 bg-slate-800/50 rounded-xl text-center">
          <p class="text-2xl font-bold text-blue-400">${player.stats.runs}</p>
          <p class="text-xs text-slate-400">Total Runs</p>
        </div>
        <div class="p-4 bg-slate-800/50 rounded-xl text-center">
          <p class="text-2xl font-bold text-green-400">${player.stats.wickets}</p>
          <p class="text-xs text-slate-400">Wickets</p>
        </div>
        <div class="p-4 bg-slate-800/50 rounded-xl text-center">
          <p class="text-2xl font-bold text-yellow-400">${player.stats.fifties}</p>
          <p class="text-xs text-slate-400">50s</p>
        </div>
        <div class="p-4 bg-slate-800/50 rounded-xl text-center">
          <p class="text-2xl font-bold text-purple-400">${player.stats.highestScore}</p>
          <p class="text-xs text-slate-400">Highest</p>
        </div>
      </div>
    </div>
  `;
  
  modal.classList.remove('hidden');
};

window.closePlayerProfile = function() {
  const modal = $('#player-modal');
  if (modal) modal.classList.add('hidden');
};

window.closePlayerModal = window.closePlayerProfile;

// ============================================
// Charts
// ============================================

function initCharts() {
  initWinProbChart();
  initRunRateChart();
  initPhaseChart();
  initBoundaryChart();
}

function initWinProbChart() {
  const canvas = $('#win-prob-chart');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  
  if (charts.winProb) charts.winProb.destroy();
  
  charts.winProb = new Chart(ctx, {
    type: 'line',
    data: {
      labels: Array.from({length: 20}, (_, i) => `${i+1}`),
      datasets: [
        {
          label: 'MI',
          data: [50, 48, 45, 42, 40, 38, 35, 33, 35, 38, 40, 42, 45, 48, 50, 52, 55, 58, 60, 62],
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4
        },
        {
          label: 'KKR',
          data: [50, 52, 55, 58, 60, 62, 65, 67, 65, 62, 60, 58, 55, 52, 50, 48, 45, 42, 40, 38],
          borderColor: '#a855f7',
          backgroundColor: 'rgba(168, 85, 247, 0.1)',
          fill: true,
          tension: 0.4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { min: 0, max: 100, grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#94a3b8' } },
        x: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#94a3b8' } }
      }
    }
  });
}

function initRunRateChart() {
  const canvas = $('#run-rate-chart');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  
  if (charts.runRate) charts.runRate.destroy();
  
  charts.runRate = new Chart(ctx, {
    type: 'line',
    data: {
      labels: Array.from({length: 16}, (_, i) => `${i+1}`),
      datasets: [
        {
          label: 'MI Run Rate',
          data: [8.5, 9.2, 9.8, 10.2, 10.5, 11.0, 11.2, 11.5, 11.8, 12.0, 12.2, 12.45],
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          fill: true,
          tension: 0.4
        },
        {
          label: 'Required Rate',
          data: [9.28, 9.5, 9.8, 10.2, 10.6, 11.1, 11.7, 12.4, 13.2, 14.1, 15.2, 16.5],
          borderColor: '#ef4444',
          borderDash: [5, 5],
          fill: false,
          tension: 0.4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: true, labels: { color: '#94a3b8' } } },
      scales: {
        y: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#94a3b8' } },
        x: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#94a3b8' } }
      }
    }
  });
}

function initPhaseChart() {
  const canvas = $('#phase-chart');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  
  if (charts.phase) charts.phase.destroy();
  
  charts.phase = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Powerplay (1-6)', 'Middle (7-15)', 'Death (16-20)'],
      datasets: [
        {
          label: 'KKR',
          data: [62, 76, 60],
          backgroundColor: 'rgba(168, 85, 247, 0.7)',
          borderRadius: 8
        },
        {
          label: 'MI',
          data: [0, 0, 139],
          backgroundColor: 'rgba(59, 130, 246, 0.7)',
          borderRadius: 8
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#94a3b8' } } },
      scales: {
        y: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#94a3b8' } },
        x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
      }
    }
  });
}

function initBoundaryChart() {
  const canvas = $('#boundary-chart');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  
  if (charts.boundary) charts.boundary.destroy();
  
  charts.boundary = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Fours', 'Sixes'],
      datasets: [{
        data: [24, 12],
        backgroundColor: ['rgba(250, 204, 21, 0.8)', 'rgba(239, 68, 68, 0.8)'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8' } } }
    }
  });
}

// ============================================
// Match Schedule Modal Trigger
// ============================================

window.openMatchSchedule = function() {
  openScheduleModal();
};

// ============================================
// Initialize Application
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  console.log('CricketLive Pro initializing...');
  
  // Hide loading screen after a short delay
  setTimeout(() => {
    const loadingScreen = $('#loading-screen');
    if (loadingScreen) {
      loadingScreen.style.opacity = '0';
      loadingScreen.style.transition = 'opacity 0.5s ease';
      setTimeout(() => loadingScreen.remove(), 500);
    }
  }, 1000);
  
  // Initialize tabs
  initTabs();
  
  // Load initial data
  await loadMatchData();
  
  // Load AI insights
  await loadAIInsights();
  
  // Initialize WebSocket
  initWebSocket();
  
  // Initialize charts after a delay
  setTimeout(() => {
    initCharts();
  }, 1500);
  
  // Initialize innings buttons
  $$('.innings-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectInnings(parseInt(btn.dataset.innings));
    });
  });
  
  // Initialize team buttons
  $$('.team-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectTeam(btn.dataset.team);
    });
  });
  
  // Initial renders
  renderPlayers('mi');
  renderNotifications();
  
  console.log('CricketLive Pro initialized!');
});

// Periodic updates
setInterval(async () => {
  await loadMatchData();
}, 30000);

setInterval(async () => {
  await loadAIInsights();
}, 60000);
