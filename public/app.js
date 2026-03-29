(function() {
  'use strict';
  
  // ============================================
  // Configuration & State
  // ============================================
  
  const API_BASE = window.location.origin + '/api';
  const WS_BASE = window.location.origin.replace(/^http/, 'ws') + '/ws';
  
  let appState = {
    match: null,
    innings: [],
    ballFeed: [],
    players: [],
    currentInnings: 0,
    selectedTab: 'live',
    selectedTeam: 'mi',
    selectedInnings: 2
  };
  
  let charts = {};
  let wsConnection = null;
  let reconnectTimer = null;
  
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
  
  function showToast(message, type = 'info') {
    const container = $('#toast-container');
    const toast = document.createElement('div');
    
    const bgColors = {
      info: 'bg-blue-600',
      success: 'bg-green-600',
      warning: 'bg-yellow-600',
      error: 'bg-red-600'
    };
    
    toast.className = `toast ${bgColors[type]} px-4 py-3 rounded-lg shadow-lg flex items-center gap-3`;
    toast.innerHTML = `
      <i class="ri-information-line"></i>
      <span class="text-sm font-medium">${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
  
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
      updateUI();
    }
  }
  
  async function loadMatchStats() {
    const data = await fetchAPI('/match/stats');
    if (data) {
      appState.stats = data;
      renderStats();
    }
  }
  
  async function loadAIInsights() {
    const data = await fetchAPI('/ai/insights');
    if (data) {
      renderAIInsights(data);
    }
  }
  
  // ============================================
  // WebSocket Connection
  // ============================================
  
  function initWebSocket() {
    try {
      wsConnection = new WebSocket(WS_BASE);
      
      wsConnection.onopen = () => {
        console.log('WebSocket connected');
      };
      
      wsConnection.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWSMessage(data);
        } catch (e) {
          console.error('WS parse error:', e);
        }
      };
      
      wsConnection.onclose = () => {
        console.log('WebSocket disconnected');
        reconnectTimer = setTimeout(initWebSocket, 3000);
      };
      
      wsConnection.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (e) {
      console.error('WebSocket init failed:', e);
    }
  }
  
  function handleWSMessage(data) {
    const { type, payload } = data;
    
    switch (type) {
      case 'state-update':
        if (payload) {
          appState.match = { ...appState.match, ...payload };
          updateUI();
        }
        break;
      case 'ball-update':
        if (payload) {
          addBallToFeed(payload);
          updateScoreDisplay();
        }
        break;
      case 'notification':
        if (payload) {
          showToast(payload.message, 'info');
          addNotification(payload);
        }
        break;
    }
  }
  
  // ============================================
  // UI Update Functions
  // ============================================
  
  function updateUI() {
    if (!appState.match) return;
    
    updateMatchHeader();
    updateScoreDisplay();
    updateQuickStats();
    updateBallFeed();
    updateBattingCard();
    updateBowlingCard();
    updateTimeline();
    renderCharts();
    loadAIInsights();
  }
  
  function updateMatchHeader() {
    const match = appState.match;
    if (!match || !match.score) return;
    
    const score = match.score;
    
    $('#team1-name').textContent = score.team1;
    $('#team2-name').textContent = score.team2;
    $('#team1-captain').textContent = score.team1Captain || '';
    $('#team2-captain').textContent = score.team2Captain || '';
    $('#match-venue').textContent = score.venue;
    $('#match-title').textContent = score.league + ' - ' + score.matchTitle;
  }
  
  function updateScoreDisplay() {
    const match = appState.match;
    if (!match || !match.score) return;
    
    const score = match.score;
    
    $('#team1-score').textContent = score.team1Score;
    $('#team1-overs').textContent = `(${score.overs} ov)`;
    $('#team2-score').textContent = score.team2Score;
    $('#team2-overs').textContent = score.team2Score === 'Yet to bat' ? '' : `(20.0 ov)`;
    
    $('#current-rr').textContent = score.runRate || '0.00';
    $('#required-rr').textContent = score.reqRR || '--';
    
    // Update match status
    let status = '';
    if (score.batsman) {
      status = `${score.batsman} & ${score.onStrike || 'Partner'} at crease`;
    }
    $('#match-status').textContent = status;
  }
  
  function updateQuickStats() {
    const match = appState.match;
    if (!match || !match.score) return;
    
    const score = match.score;
    
    $('#partnership').textContent = score.partnership || '--';
    $('#last-wicket').textContent = score.fow || '--';
    $('#powerplay').textContent = score.pp || '--';
    $('#recent-overs').textContent = score.recent || '--';
  }
  
  function updateBallFeed() {
    const feed = appState.ballFeed || [];
    const container = $('#ball-feed');
    
    if (feed.length === 0) {
      container.innerHTML = `
        <div class="text-center py-8 text-slate-500">
          <i class="ri-ball-line text-4xl mb-2"></i>
          <p>No ball updates yet</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = feed.slice(0, 20).map(ball => `
      <div class="flex items-start gap-3 p-3 bg-slate-800/50 rounded-xl">
        <div class="ball-dot ball-${ball.runs || '0'} flex-shrink-0 mt-1"></div>
        <div class="flex-1">
          <div class="flex items-center justify-between mb-1">
            <span class="text-sm font-semibold">${ball.over} ${ball.batter || ''}</span>
            <span class="text-xs text-slate-500">${getTimeAgo(ball.timestamp)}</span>
          </div>
          <p class="text-sm text-slate-300">${ball.commentary || ball.description || ''}</p>
        </div>
      </div>
    `).join('');
    
    // Update current over balls
    updateCurrentOverBalls();
  }
  
  function updateCurrentOverBalls() {
    const feed = appState.ballFeed || [];
    const currentOver = feed.filter(b => b.isCurrentOver).slice(-6);
    const container = $('#current-over-balls');
    
    container.innerHTML = currentOver.map(ball => {
      let bgColor = 'bg-slate-700';
      if (ball.runs === 4) bgColor = 'bg-yellow-500';
      if (ball.runs === 6) bgColor = 'bg-red-500';
      if (ball.isWicket) bgColor = 'bg-red-600';
      if (ball.extras === 'wide' || ball.extras === 'no-ball') bgColor = 'bg-orange-500';
      
      return `<div class="over-ball ${bgColor}">${ball.isWicket ? 'W' : ball.runs || '.'}</div>`;
    }).join('');
  }
  
  function addBallToFeed(ball) {
    if (!appState.ballFeed) appState.ballFeed = [];
    appState.ballFeed.unshift(ball);
    updateBallFeed();
  }
  
  function updateBattingCard() {
    const match = appState.match;
    if (!match) return;
    
    // Sample batting data
    const batting = [
      { name: 'Rohit Sharma', runs: 45, balls: 32, fours: 5, sixes: 2, sr: 140.62, status: 'not out' },
      { name: 'Suryakumar Yadav', runs: 28, balls: 18, fours: 3, sixes: 1, sr: 155.56, status: 'c Narine b Varun' },
      { name: 'Tilak Varma', runs: 12, balls: 8, fours: 1, sixes: 0, sr: 150.00, status: 'not out' }
    ];
    
    const container = $('#batting-card');
    container.innerHTML = batting.map(b => `
      <div class="player-card p-3 bg-slate-800/50 rounded-xl cursor-pointer" onclick="openPlayerProfile('${b.name}')">
        <div class="flex items-center justify-between">
          <div>
            <p class="font-semibold">${b.name}</p>
            <p class="text-xs text-slate-400">${b.status === 'not out' ? '<span class="text-green-400">not out</span>' : b.status}</p>
          </div>
          <div class="text-right">
            <p class="text-xl font-bold">${b.runs}</p>
            <p class="text-xs text-slate-400">(${b.balls} balls)</p>
          </div>
        </div>
        <div class="flex items-center gap-4 mt-2 text-xs text-slate-400">
          <span>4s: ${b.fours}</span>
          <span>6s: ${b.sixes}</span>
          <span>SR: ${b.sr}</span>
        </div>
      </div>
    `).join('');
  }
  
  function updateBowlingCard() {
    const match = appState.match;
    if (!match) return;
    
    // Sample bowling data
    const bowling = [
      { name: 'Varun Chakravarthy', overs: 4, maidens: 0, runs: 28, wickets: 2, econ: 7.00 },
      { name: 'Sunil Narine', overs: 3, maidens: 0, runs: 24, wickets: 1, econ: 8.00 }
    ];
    
    const container = $('#bowling-card');
    container.innerHTML = bowling.map(b => `
      <div class="player-card p-3 bg-slate-800/50 rounded-xl cursor-pointer" onclick="openPlayerProfile('${b.name}')">
        <div class="flex items-center justify-between">
          <p class="font-semibold">${b.name}</p>
          <div class="text-right">
            <p class="text-lg font-bold text-red-400">${b.wickets}/${b.runs}</p>
          </div>
        </div>
        <div class="flex items-center gap-4 mt-2 text-xs text-slate-400">
          <span>${b.overs} ov</span>
          <span>M: ${b.maidens}</span>
          <span>Econ: ${b.econ}</span>
        </div>
      </div>
    `).join('');
  }
  
  function updateTimeline() {
    const events = appState.match?.timelineEvents || [];
    const container = $('#match-timeline');
    
    if (events.length === 0) {
      container.innerHTML = '<p class="text-slate-500 text-sm">No events yet</p>';
      return;
    }
    
    container.innerHTML = events.slice(0, 5).map(event => `
      <div class="flex items-start gap-3">
        <div class="timeline-dot border-blue-500 flex-shrink-0 mt-1"></div>
        <div class="flex-1">
          <p class="font-semibold text-sm">${event.title}</p>
          <p class="text-xs text-slate-400">${event.detail || ''}</p>
          <p class="text-xs text-slate-500 mt-1">${formatTime(event.timestamp)}</p>
        </div>
      </div>
    `).join('');
  }
  
  // ============================================
  // Chart Functions
  // ============================================
  
  function renderCharts() {
    renderWinProbabilityChart();
    renderRunRateChart();
    renderPhaseChart();
    renderBoundaryChart();
  }
  
  function renderWinProbabilityChart() {
    const ctx = document.getElementById('win-prob-chart');
    if (!ctx) return;
    
    if (charts.winProb) charts.winProb.destroy();
    
    const overs = Array.from({ length: 20 }, (_, i) => i + 1);
    const team1Prob = [50, 52, 48, 45, 42, 40, 38, 36, 35, 38, 42, 45, 43, 40, 38, 42, 45, 48, 52, 42];
    const team2Prob = [50, 48, 52, 55, 58, 60, 62, 64, 65, 62, 58, 55, 57, 60, 62, 58, 55, 52, 48, 58];
    
    charts.winProb = new Chart(ctx, {
      type: 'line',
      data: {
        labels: overs.map(o => o + ' ov'),
        datasets: [
          {
            label: 'Mumbai Indians',
            data: team1Prob,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: true,
            tension: 0.4
          },
          {
            label: 'KKR',
            data: team2Prob,
            borderColor: '#8b5cf6',
            backgroundColor: 'rgba(139, 92, 246, 0.1)',
            fill: true,
            tension: 0.4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            min: 0,
            max: 100,
            grid: { color: 'rgba(148, 163, 184, 0.1)' },
            ticks: { color: '#94a3b8' }
          },
          x: {
            grid: { color: 'rgba(148, 163, 184, 0.1)' },
            ticks: { color: '#94a3b8' }
          }
        }
      }
    });
  }
  
  function renderRunRateChart() {
    const ctx = document.getElementById('run-rate-chart');
    if (!ctx) return;
    
    if (charts.runRate) charts.runRate.destroy();
    
    const overs = Array.from({ length: 17 }, (_, i) => i + 1);
    const actualRR = [0, 6.5, 7.2, 8.1, 8.5, 9.2, 9.8, 9.5, 9.2, 9.0, 9.3, 9.5, 9.8, 9.6, 9.4, 9.5, 9.54];
    const requiredRR = [9.5, 9.8, 10.2, 10.5, 10.8, 11.0, 11.2, 11.5, 11.3, 11.1, 11.4, 11.6, 11.5, 11.4, 11.6, 11.7, 11.73];
    
    charts.runRate = new Chart(ctx, {
      type: 'line',
      data: {
        labels: overs.map(o => o + ' ov'),
        datasets: [
          {
            label: 'Current RR',
            data: actualRR,
            borderColor: '#22c55e',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            fill: true,
            tension: 0.4
          },
          {
            label: 'Required RR',
            data: requiredRR,
            borderColor: '#f59e0b',
            borderDash: [5, 5],
            fill: false,
            tension: 0.4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: 'top', labels: { color: '#94a3b8' } }
        },
        scales: {
          y: {
            grid: { color: 'rgba(148, 163, 184, 0.1)' },
            ticks: { color: '#94a3b8' }
          },
          x: {
            grid: { color: 'rgba(148, 163, 184, 0.1)' },
            ticks: { color: '#94a3b8' }
          }
        }
      }
    });
  }
  
  function renderPhaseChart() {
    const ctx = document.getElementById('phase-chart');
    if (!ctx) return;
    
    if (charts.phase) charts.phase.destroy();
    
    charts.phase = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Powerplay (1-6)', 'Middle (7-15)', 'Death (16-20)'],
        datasets: [
          {
            label: 'MI',
            data: [62, 58, 36],
            backgroundColor: 'rgba(59, 130, 246, 0.8)',
            borderRadius: 4
          },
          {
            label: 'KKR',
            data: [55, 72, 71],
            backgroundColor: 'rgba(139, 92, 246, 0.8)',
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: 'top', labels: { color: '#94a3b8' } }
        },
        scales: {
          y: {
            grid: { color: 'rgba(148, 163, 184, 0.1)' },
            ticks: { color: '#94a3b8' }
          },
          x: {
            grid: { display: false },
            ticks: { color: '#94a3b8' }
          }
        }
      }
    });
  }
  
  function renderBoundaryChart() {
    const ctx = document.getElementById('boundary-chart');
    if (!ctx) return;
    
    if (charts.boundary) charts.boundary.destroy();
    
    charts.boundary = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Fours', 'Sixes'],
        datasets: [{
          data: [24, 12],
          backgroundColor: ['#fbbf24', '#ef4444'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        cutout: '70%'
      }
    });
  }
  
  // ============================================
  // Scorecard Functions
  // ============================================
  
  function renderScorecard(innings) {
    renderBattingScorecard(innings);
    renderBowlingScorecard(innings);
    renderFallOfWickets(innings);
    renderPartnerships(innings);
  }
  
  function renderBattingScorecard(innings) {
    const batting = innings === 1 ? [
      { name: 'Finn Allen', dismissal: 'c de Kock b Chahar', runs: 34, balls: 22, fours: 4, sixes: 2, sr: 154.55 },
      { name: 'Ajinkya Rahane', dismissal: 'b Bumrah', runs: 18, balls: 15, fours: 2, sixes: 0, sr: 120.00 },
      { name: 'Angkrish Raghuvanshi', dismissal: 'c Yadav b Boult', runs: 12, balls: 10, fours: 1, sixes: 0, sr: 120.00 },
      { name: 'Cameron Green', dismissal: 'c Pandya b Chahar', runs: 42, balls: 28, fours: 3, sixes: 3, sr: 150.00 },
      { name: 'Rinku Singh', dismissal: 'not out', runs: 56, balls: 35, fours: 4, sixes: 4, sr: 160.00 },
      { name: 'Ramandeep Singh', dismissal: 'b Bumrah', runs: 8, balls: 6, fours: 1, sixes: 0, sr: 133.33 },
      { name: 'Sunil Narine', dismissal: 'c Sharma b Boult', runs: 15, balls: 12, fours: 1, sixes: 1, sr: 125.00 },
      { name: 'Anukul Roy', dismissal: 'not out', runs: 5, balls: 2, fours: 1, sixes: 0, sr: 250.00 }
    ] : [
      { name: 'Rohit Sharma', dismissal: 'c Narine b Varun', runs: 45, balls: 32, fours: 5, sixes: 2, sr: 140.62 },
      { name: 'Quinton de Kock', dismissal: 'b Arora', runs: 23, balls: 18, fours: 3, sixes: 0, sr: 127.78 },
      { name: 'Suryakumar Yadav', dismissal: 'c Allen b Varun', runs: 28, balls: 18, fours: 3, sixes: 1, sr: 155.56 },
      { name: 'Tilak Varma', dismissal: 'not out', runs: 35, balls: 22, fours: 3, sixes: 2, sr: 159.09 },
      { name: 'Hardik Pandya', dismissal: 'c Rahane b Narine', runs: 12, balls: 8, fours: 1, sixes: 0, sr: 150.00 },
      { name: 'Naman Dhir', dismissal: 'b Muzarabani', runs: 8, balls: 6, fours: 1, sixes: 0, sr: 133.33 },
      { name: 'Sherfane Rutherford', dismissal: 'not out', runs: 5, balls: 4, fours: 0, sixes: 0, sr: 125.00 }
    ];
    
    const container = $('#batting-scorecard');
    container.innerHTML = batting.map(b => `
      <tr>
        <td>
          <div class="flex items-center gap-2">
            <span class="font-semibold">${b.name}</span>
            ${b.dismissal === 'not out' ? '<span class="text-xs text-green-400">(*)</span>' : ''}
          </div>
          <p class="text-xs text-slate-500">${b.dismissal}</p>
        </td>
        <td class="text-center">${b.runs}</td>
        <td class="text-center">${b.balls}</td>
        <td class="text-center">${b.fours}</td>
        <td class="text-center">${b.sixes}</td>
        <td class="text-center">${b.sr.toFixed(2)}</td>
      </tr>
    `).join('');
  }
  
  function renderBowlingScorecard(innings) {
    const bowling = innings === 1 ? [
      { name: 'Jasprit Bumrah', overs: 4, maidens: 0, runs: 28, wickets: 2, econ: 7.00, dots: 14 },
      { name: 'Trent Boult', overs: 4, maidens: 0, runs: 35, wickets: 2, econ: 8.75, dots: 12 },
      { name: 'Deepak Chahar', overs: 4, maidens: 0, runs: 42, wickets: 2, econ: 10.50, dots: 10 },
      { name: 'Hardik Pandya', overs: 2, maidens: 0, runs: 18, wickets: 0, econ: 9.00, dots: 5 },
      { name: 'AM Ghazanfar', overs: 4, maidens: 0, runs: 38, wickets: 0, econ: 9.50, dots: 8 }
    ] : [
      { name: 'Varun Chakravarthy', overs: 4, maidens: 0, runs: 28, wickets: 2, econ: 7.00, dots: 14 },
      { name: 'Sunil Narine', overs: 3, maidens: 0, runs: 24, wickets: 1, econ: 8.00, dots: 9 },
      { name: 'Vaibhav Arora', overs: 4, maidens: 0, runs: 38, wickets: 1, econ: 9.50, dots: 11 },
      { name: 'Blessing Muzarabani', overs: 3.2, maidens: 0, runs: 32, wickets: 1, econ: 9.60, dots: 8 },
      { name: 'Anukul Roy', overs: 1, maidens: 0, runs: 12, wickets: 0, econ: 12.00, dots: 2 }
    ];
    
    const container = $('#bowling-scorecard');
    container.innerHTML = bowling.map(b => `
      <tr>
        <td class="font-semibold">${b.name}</td>
        <td class="text-center">${b.overs}</td>
        <td class="text-center">${b.maidens}</td>
        <td class="text-center">${b.runs}</td>
        <td class="text-center font-bold ${b.wickets > 0 ? 'text-red-400' : ''}">${b.wickets}</td>
        <td class="text-center">${b.econ.toFixed(2)}</td>
        <td class="text-center">${b.dots}</td>
      </tr>
    `).join('');
  }
  
  function renderFallOfWickets(innings) {
    const fow = innings === 1 ? [
      { wicket: 1, score: '45/1', over: '5.2', batsman: 'Finn Allen', bowler: 'Deepak Chahar' },
      { wicket: 2, score: '68/2', over: '8.4', batsman: 'Ajinkya Rahane', bowler: 'Jasprit Bumrah' },
      { wicket: 3, score: '89/3', over: '11.1', batsman: 'Angkrish Raghuvanshi', bowler: 'Trent Boult' },
      { wicket: 4, score: '112/4', over: '13.5', batsman: 'Cameron Green', bowler: 'Deepak Chahar' },
      { wicket: 5, score: '145/5', over: '17.2', batsman: 'Ramandeep Singh', bowler: 'Jasprit Bumrah' },
      { wicket: 6, score: '168/6', over: '19.1', batsman: 'Sunil Narine', bowler: 'Trent Boult' }
    ] : [
      { wicket: 1, score: '52/1', over: '6.3', batsman: 'Quinton de Kock', bowler: 'Vaibhav Arora' },
      { wicket: 2, score: '78/2', over: '9.4', batsman: 'Rohit Sharma', bowler: 'Varun Chakravarthy' },
      { wicket: 3, score: '95/3', over: '11.5', batsman: 'Suryakumar Yadav', bowler: 'Varun Chakravarthy' },
      { wicket: 4, score: '118/4', over: '14.2', batsman: 'Hardik Pandya', bowler: 'Sunil Narine' },
      { wicket: 5, score: '132/5', over: '15.6', batsman: 'Naman Dhir', bowler: 'Blessing Muzarabani' }
    ];
    
    const container = $('#fall-of-wickets');
    container.innerHTML = fow.map(f => `
      <div class="flex items-center gap-2 px-3 py-2 bg-slate-800/50 rounded-lg">
        <span class="text-sm font-bold">${f.wicket}</span>
        <span class="text-sm">${f.score}</span>
        <span class="text-xs text-slate-500">(${f.over} ov)</span>
        <span class="text-xs text-slate-400">${f.batsman}</span>
      </div>
    `).join('');
  }
  
  function renderPartnerships(innings) {
    const partnerships = innings === 1 ? [
      { wickets: '1st', runs: 45, balls: 38, batsmen: 'Allen & Rahane' },
      { wickets: '2nd', runs: 23, balls: 22, batsmen: 'Rahane & Raghuvanshi' },
      { wickets: '3rd', runs: 21, balls: 17, batsmen: 'Raghuvanshi & Green' },
      { wickets: '4th', runs: 23, balls: 19, batsmen: 'Green & Rinku' },
      { wickets: '5th', runs: 33, balls: 24, batsmen: 'Rinku & Ramandeep' },
      { wickets: '6th', runs: 23, balls: 14, batsmen: 'Rinku & Narine' },
      { wickets: '7th*', runs: 30, balls: 16, batsmen: 'Rinku & Roy' }
    ] : [
      { wickets: '1st', runs: 52, balls: 39, batsmen: 'Sharma & de Kock' },
      { wickets: '2nd', runs: 26, balls: 21, batsmen: 'Sharma & Yadav' },
      { wickets: '3rd', runs: 17, balls: 15, batsmen: 'Yadav & Varma' },
      { wickets: '4th', runs: 23, balls: 18, batsmen: 'Varma & Pandya' },
      { wickets: '5th', runs: 14, balls: 11, batsmen: 'Varma & Dhir' },
      { wickets: '6th*', runs: 24, balls: 16, batsmen: 'Varma & Rutherford' }
    ];
    
    const maxRuns = Math.max(...partnerships.map(p => p.runs));
    const container = $('#partnerships-chart');
    
    container.innerHTML = partnerships.map(p => {
      const width = (p.runs / maxRuns) * 100;
      return `
        <div class="space-y-1">
          <div class="flex items-center justify-between text-sm">
            <span class="text-slate-400">${p.wickets} Wicket</span>
            <span class="font-semibold">${p.runs} (${p.balls} balls)</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${width}%"></div>
          </div>
          <p class="text-xs text-slate-500">${p.batsmen}</p>
        </div>
      `;
    }).join('');
  }
  
  // ============================================
  // Commentary Functions
  // ============================================
  
  function renderFullCommentary() {
    const commentary = [
      { over: '16.2', ball: '4', batter: 'Tilak Varma', bowler: 'Varun Chakravarthy', text: 'FOUR! Driven through covers with authority! Varla gets the length slightly wrong and Varma punishes it.', isBoundary: true },
      { over: '16.1', ball: '1', batter: 'Rohit Sharma', bowler: 'Varun Chakravarthy', text: 'Pushed to mid-off for a single. Good fielding restricts it to one.' },
      { over: '15.6', ball: 'W', batter: 'Suryakumar Yadav', bowler: 'Varun Chakravarthy', text: 'WICKET! Yadav tries the ramp but gets a top edge. Allen takes a comfortable catch at short third man!', isWicket: true },
      { over: '15.5', ball: '6', batter: 'Suryakumar Yadav', bowler: 'Varun Chakravarthy', text: 'SIX! MASSIVE! Yadav advances and launches it over long-on for a huge maximum!', isBoundary: true },
      { over: '15.4', ball: '2', batter: 'Suryakumar Yadav', bowler: 'Varun Chakravarthy', text: 'Worked to mid-wicket for two quick runs. Good running between the wickets.' },
      { over: '15.3', ball: '1', batter: 'Tilak Varma', bowler: 'Varun Chakravarthy', text: 'Single to long-on. Rotating the strike well in this crucial phase.' },
      { over: '15.2', ball: '0', batter: 'Suryakumar Yadav', bowler: 'Varun Chakravarthy', text: 'Defended back to the bowler. Good change of pace from Varun.' },
      { over: '15.1', ball: '4', batter: 'Suryakumar Yadav', bowler: 'Varun Chakravarthy', text: 'FOUR! Pulled away! Short ball and Yadav was ready for it. Beats deep square leg.', isBoundary: true }
    ];
    
    const container = $('#full-commentary');
    container.innerHTML = commentary.map(c => `
      <div class="flex items-start gap-4 p-4 bg-slate-800/50 rounded-xl ${c.isWicket ? 'border-l-4 border-red-500' : c.isBoundary ? 'border-l-4 border-yellow-500' : ''}">
        <div class="flex-shrink-0">
          <div class="w-12 h-12 rounded-full ${c.isWicket ? 'bg-red-500/20' : c.isBoundary ? 'bg-yellow-500/20' : 'bg-slate-700'} flex items-center justify-center">
            <span class="font-bold ${c.isWicket ? 'text-red-400' : c.isBoundary ? 'text-yellow-400' : 'text-white'}">${c.ball}</span>
          </div>
        </div>
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-1">
            <span class="font-semibold">${c.over}</span>
            <span class="text-slate-500">|</span>
            <span class="text-sm text-slate-400">${c.batter} b ${c.bowler}</span>
          </div>
          <p class="text-sm">${c.text}</p>
        </div>
      </div>
    `).join('');
  }
  
  // ============================================
  // Stats Functions
  // ============================================
  
  function renderStats() {
    renderMatchStats();
    renderTopPerformers();
  }
  
  function renderMatchStats() {
    const stats = [
      { label: 'Total Runs', value: '354', icon: 'ri-run-line' },
      { label: 'Total Wickets', value: '11', icon: 'ri-user-minus-line' },
      { label: 'Total Boundaries', value: '36', icon: 'ri-arrow-right-circle-line' },
      { label: 'Total Sixes', value: '15', icon: 'ri-arrow-up-circle-line' },
      { label: 'Average Run Rate', value: '8.85', icon: 'ri-speed-line' },
      { label: 'Extras', value: '24', icon: 'ri-add-circle-line' }
    ];
    
    const container = $('#match-stats');
    container.innerHTML = stats.map(s => `
      <div class="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center">
            <i class="${s.icon} text-blue-400"></i>
          </div>
          <span class="text-slate-400">${s.label}</span>
        </div>
        <span class="text-xl font-bold">${s.value}</span>
      </div>
    `).join('');
  }
  
  function renderTopPerformers() {
    const performers = [
      { name: 'Rinku Singh', team: 'KKR', type: 'Batsman', stat: '56 (35)', icon: 'ri-user-star-line' },
      { name: 'Rohit Sharma', team: 'MI', type: 'Batsman', stat: '45 (32)', icon: 'ri-user-star-line' },
      { name: 'Varun Chakravarthy', team: 'KKR', type: 'Bowler', stat: '2/28', icon: 'ri-boxing-line' },
      { name: 'Jasprit Bumrah', team: 'MI', type: 'Bowler', stat: '2/28', icon: 'ri-boxing-line' }
    ];
    
    const container = $('#top-performers');
    container.innerHTML = performers.map(p => `
      <div class="flex items-center gap-4 p-3 bg-slate-800/50 rounded-xl cursor-pointer hover:bg-slate-700/50 transition" onclick="openPlayerProfile('${p.name}')">
        <div class="w-12 h-12 rounded-full bg-gradient-to-br ${p.team === 'MI' ? 'from-blue-500 to-blue-700' : 'from-purple-500 to-purple-700'} flex items-center justify-center">
          <i class="${p.icon} text-xl"></i>
        </div>
        <div class="flex-1">
          <p class="font-semibold">${p.name}</p>
          <p class="text-xs text-slate-400">${p.type} • ${p.team}</p>
        </div>
        <div class="text-right">
          <p class="text-lg font-bold">${p.stat}</p>
        </div>
      </div>
    `).join('');
  }
  
  // ============================================
  // Head to Head Functions
  // ============================================
  
  function renderHeadToHead() {
    const recent = [
      { date: '2025-04-15', winner: 'MI', margin: 'MI won by 6 wickets', venue: 'Eden Gardens' },
      { date: '2025-03-28', winner: 'KKR', margin: 'KKR won by 18 runs', venue: 'Wankhede Stadium' },
      { date: '2024-05-11', winner: 'MI', margin: 'MI won by 12 runs', venue: 'Eden Gardens' },
      { date: '2024-04-03', winner: 'KKR', margin: 'KKR won by 7 wickets', venue: 'Wankhede Stadium' },
      { date: '2023-05-16', winner: 'MI', margin: 'MI won by 5 wickets', venue: 'Eden Gardens' }
    ];
    
    const container = $('#h2h-recent');
    container.innerHTML = recent.map(r => `
      <div class="flex items-center gap-4 p-3 bg-slate-800/50 rounded-xl">
        <div class="w-10 h-10 rounded-full ${r.winner === 'MI' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'} flex items-center justify-center font-bold">
          ${r.winner}
        </div>
        <div class="flex-1">
          <p class="font-semibold">${r.margin}</p>
          <p class="text-xs text-slate-400">${formatDate(r.date)} • ${r.venue}</p>
        </div>
      </div>
    `).join('');
  }
  
  // ============================================
  // Player Functions
  // ============================================
  
  function renderPlayers(team) {
    const players = team === 'mi' ? [
      { name: 'Rohit Sharma', role: 'Batsman', country: 'India', stats: { matches: 243, runs: 6211, sr: 130.39, avg: 29.44 } },
      { name: 'Suryakumar Yadav', role: 'Batsman', country: 'India', stats: { matches: 138, runs: 3456, sr: 147.32, avg: 32.15 } },
      { name: 'Jasprit Bumrah', role: 'Bowler', country: 'India', stats: { matches: 120, wickets: 145, econ: 7.39, avg: 23.31 } },
      { name: 'Hardik Pandya', role: 'All-rounder', country: 'India', stats: { matches: 127, runs: 2345, wickets: 78, sr: 152.91 } },
      { name: 'Quinton de Kock', role: 'Wicket-keeper', country: 'South Africa', stats: { matches: 98, runs: 2876, sr: 139.67, avg: 31.28 } },
      { name: 'Trent Boult', role: 'Bowler', country: 'New Zealand', stats: { matches: 86, wickets: 98, econ: 8.12, avg: 25.64 } },
      { name: 'Tilak Varma', role: 'Batsman', country: 'India', stats: { matches: 54, runs: 1567, sr: 138.45, avg: 34.82 } },
      { name: 'Deepak Chahar', role: 'Bowler', country: 'India', stats: { matches: 68, wickets: 72, econ: 8.45, avg: 27.32 } }
    ] : [
      { name: 'Andre Russell', role: 'All-rounder', country: 'West Indies', stats: { matches: 115, runs: 2225, wickets: 89, sr: 177.88 } },
      { name: 'Sunil Narine', role: 'All-rounder', country: 'West Indies', stats: { matches: 167, runs: 1089, wickets: 184, sr: 162.74 } },
      { name: 'Shreyas Iyer', role: 'Batsman', country: 'India', stats: { matches: 101, runs: 2876, sr: 128.92, avg: 31.54 } },
      { name: 'Nitish Rana', role: 'Batsman', country: 'India', stats: { matches: 89, runs: 2156, sr: 134.67, avg: 28.34 } },
      { name: 'Venkatesh Iyer', role: 'All-rounder', country: 'India', stats: { matches: 45, runs: 987, wickets: 12, sr: 135.21 } },
      { name: 'Varun Chakravarthy', role: 'Bowler', country: 'India', stats: { matches: 52, wickets: 58, econ: 7.45, avg: 24.89 } },
      { name: 'Rinku Singh', role: 'Batsman', country: 'India', stats: { matches: 42, runs: 1123, sr: 149.87, avg: 35.09 } },
      { name: 'Phil Salt', role: 'Wicket-keeper', country: 'England', stats: { matches: 28, runs: 876, sr: 165.23, avg: 31.29 } }
    ];
    
    const container = $('#player-grid');
    container.innerHTML = players.map(p => `
      <div class="player-card glass-card rounded-xl p-4 cursor-pointer" onclick="openPlayerProfile('${p.name}')">
        <div class="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br ${team === 'mi' ? 'from-blue-500 to-blue-700' : 'from-purple-500 to-purple-700'} flex items-center justify-center">
          <i class="ri-user-3-line text-2xl"></i>
        </div>
        <h4 class="font-semibold text-center">${p.name}</h4>
        <p class="text-xs text-slate-400 text-center">${p.role} • ${p.country}</p>
        <div class="mt-3 pt-3 border-t border-slate-700/50 text-xs text-slate-400">
          ${p.role === 'Bowler' || p.role === 'All-rounder' ? 
            `<div class="flex justify-between"><span>Wickets</span><span class="font-semibold text-white">${p.stats.wickets}</span></div>
             <div class="flex justify-between mt-1"><span>Econ</span><span class="font-semibold text-white">${p.stats.econ}</span></div>` :
            `<div class="flex justify-between"><span>Runs</span><span class="font-semibold text-white">${formatNumber(p.stats.runs)}</span></div>
             <div class="flex justify-between mt-1"><span>SR</span><span class="font-semibold text-white">${p.stats.sr}</span></div>`
          }
        </div>
      </div>
    `).join('');
  }
  
  window.openPlayerProfile = function(playerName) {
    const modal = $('#player-modal');
    const content = $('#player-modal-content');
    
    // Sample player data
    const player = {
      name: playerName,
      team: 'Mumbai Indians',
      role: 'Batsman',
      country: 'India',
      age: 29,
      battingStyle: 'Right-handed',
      bowlingStyle: 'Right-arm off-break',
      stats: {
        matches: 243,
        runs: 6211,
        highestScore: '109*',
        average: 29.44,
        strikeRate: 130.39,
        hundreds: 2,
        fifties: 42,
        fours: 558,
        sixes: 247
      }
    };
    
    content.innerHTML = `
      <div class="p-6 bg-gradient-to-br ${player.team.includes('Mumbai') ? 'from-blue-900 to-blue-800' : 'from-purple-900 to-purple-800'}">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div class="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center">
              <i class="ri-user-3-line text-4xl"></i>
            </div>
            <div>
              <h2 class="text-2xl font-display font-bold">${player.name}</h2>
              <p class="text-slate-300">${player.role} • ${player.team}</p>
              <p class="text-sm text-slate-400">${player.country} • ${player.age} years</p>
            </div>
          </div>
          <button onclick="closePlayerModal()" class="p-2 hover:bg-white/10 rounded-lg">
            <i class="ri-close-line text-xl"></i>
          </button>
        </div>
      </div>
      <div class="p-6">
        <div class="grid grid-cols-2 gap-4 mb-6">
          <div class="p-3 bg-slate-800/50 rounded-lg">
            <p class="text-xs text-slate-500">Batting Style</p>
            <p class="font-semibold">${player.battingStyle}</p>
          </div>
          <div class="p-3 bg-slate-800/50 rounded-lg">
            <p class="text-xs text-slate-500">Bowling Style</p>
            <p class="font-semibold">${player.bowlingStyle}</p>
          </div>
        </div>
        <h3 class="font-display font-bold text-lg mb-4">Career Statistics</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div class="p-3 bg-slate-800/50 rounded-lg text-center">
            <p class="text-2xl font-bold text-blue-400">${player.stats.matches}</p>
            <p class="text-xs text-slate-400">Matches</p>
          </div>
          <div class="p-3 bg-slate-800/50 rounded-lg text-center">
            <p class="text-2xl font-bold text-green-400">${formatNumber(player.stats.runs)}</p>
            <p class="text-xs text-slate-400">Runs</p>
          </div>
          <div class="p-3 bg-slate-800/50 rounded-lg text-center">
            <p class="text-2xl font-bold text-yellow-400">${player.stats.average}</p>
            <p class="text-xs text-slate-400">Average</p>
          </div>
          <div class="p-3 bg-slate-800/50 rounded-lg text-center">
            <p class="text-2xl font-bold text-purple-400">${player.stats.strikeRate}</p>
            <p class="text-xs text-slate-400">Strike Rate</p>
          </div>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
          <div class="p-3 bg-slate-800/50 rounded-lg text-center">
            <p class="text-xl font-bold">${player.stats.hundreds}</p>
            <p class="text-xs text-slate-400">100s</p>
          </div>
          <div class="p-3 bg-slate-800/50 rounded-lg text-center">
            <p class="text-xl font-bold">${player.stats.fifties}</p>
            <p class="text-xs text-slate-400">50s</p>
          </div>
          <div class="p-3 bg-slate-800/50 rounded-lg text-center">
            <p class="text-xl font-bold">${player.stats.highestScore}</p>
            <p class="text-xs text-slate-400">Highest</p>
          </div>
          <div class="p-3 bg-slate-800/50 rounded-lg text-center">
            <p class="text-xl font-bold">${player.stats.fours}/${player.stats.sixes}</p>
            <p class="text-xs text-slate-400">4s/6s</p>
          </div>
        </div>
      </div>
    `;
    
    modal.classList.remove('hidden');
  };
  
  window.closePlayerProfile = function() {
    $('#player-modal').classList.add('hidden');
  };
  
  // ============================================
  // Schedule Functions
  // ============================================
  
  function renderSchedule() {
    const schedule = [
      { match: 2, team1: 'MI', team2: 'KKR', date: 'Today', time: '7:30 PM', venue: 'Wankhede Stadium', status: 'live' },
      { match: 3, team1: 'RR', team2: 'CSK', date: 'Mar 30', time: '7:30 PM', venue: 'Guwahati', status: 'upcoming' },
      { match: 4, team1: 'PBKS', team2: 'GT', date: 'Mar 31', time: '7:30 PM', venue: 'New Chandigarh', status: 'upcoming' },
      { match: 5, team1: 'LSG', team2: 'DC', date: 'Apr 1', time: '7:30 PM', venue: 'Lucknow', status: 'upcoming' },
      { match: 6, team1: 'KKR', team2: 'SRH', date: 'Apr 2', time: '7:30 PM', venue: 'Eden Gardens', status: 'upcoming' },
      { match: 7, team1: 'CSK', team2: 'PBKS', date: 'Apr 3', time: '7:30 PM', venue: 'Chennai', status: 'upcoming' },
      { match: 8, team1: 'RCB', team2: 'MI', date: 'Apr 4', time: '7:30 PM', venue: 'Bengaluru', status: 'upcoming' }
    ];
    
    const container = $('#schedule-content');
    container.innerHTML = `
      <div class="space-y-4">
        ${schedule.map(s => `
          <div class="match-card glass-card rounded-xl p-4 cursor-pointer hover:bg-slate-800/80 transition" onclick="selectMatch(${s.match})">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <span class="text-xs font-bold text-slate-500">MATCH ${s.match}</span>
                ${s.status === 'live' ? '<span class="status-live px-2 py-0.5 rounded text-xs font-bold">LIVE</span>' : ''}
              </div>
              <span class="text-sm text-slate-400">${s.date} • ${s.time}</span>
            </div>
            <div class="flex items-center justify-between mt-3">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-lg team-${s.team1.toLowerCase()} flex items-center justify-center font-display font-bold">${s.team1}</div>
                <span class="font-bold">vs</span>
                <div class="w-10 h-10 rounded-lg team-${s.team2.toLowerCase()} flex items-center justify-center font-display font-bold">${s.team2}</div>
              </div>
              <div class="text-right">
                <p class="text-sm text-slate-400">${s.venue}</p>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
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
  // Search Functions
  // ============================================
  
  window.openSearch = function() {
    $('#search-modal').classList.remove('hidden');
    $('#search-input').focus();
  };
  
  window.closeSearch = function() {
    $('#search-modal').classList.add('hidden');
    $('#search-input').value = '';
    $('#search-results').innerHTML = '';
  };
  
  window.handleSearch = function(query) {
    const results = $('#search-results');
    if (!query.trim()) {
      results.innerHTML = '';
      return;
    }
    
    const players = ['Rohit Sharma', 'Virat Kohli', 'Jasprit Bumrah', 'Suryakumar Yadav', 'Hardik Pandya', 'Andre Russell', 'Sunil Narine', 'Shreyas Iyer'];
    const teams = ['Mumbai Indians', 'Chennai Super Kings', 'Royal Challengers Bengaluru', 'Kolkata Knight Riders', 'Rajasthan Royals', 'Delhi Capitals'];
    
    const filteredPlayers = players.filter(p => p.toLowerCase().includes(query.toLowerCase()));
    const filteredTeams = teams.filter(t => t.toLowerCase().includes(query.toLowerCase()));
    
    results.innerHTML = `
      ${filteredPlayers.length > 0 ? `
        <div class="mb-3">
          <p class="text-xs text-slate-500 uppercase tracking-wider mb-2">Players</p>
          ${filteredPlayers.map(p => `
            <div class="flex items-center gap-3 p-2 hover:bg-slate-800 rounded-lg cursor-pointer" onclick="openPlayerProfile('${p}'); closeSearch();">
              <div class="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                <i class="ri-user-line text-sm"></i>
              </div>
              <span>${p}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
      ${filteredTeams.length > 0 ? `
        <div>
          <p class="text-xs text-slate-500 uppercase tracking-wider mb-2">Teams</p>
          ${filteredTeams.map(t => `
            <div class="flex items-center gap-3 p-2 hover:bg-slate-800 rounded-lg cursor-pointer">
              <div class="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                <i class="ri-shield-line text-sm"></i>
              </div>
              <span>${t}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
      ${filteredPlayers.length === 0 && filteredTeams.length === 0 ? `
        <p class="text-center text-slate-500 py-4">No results found</p>
      ` : ''}
    `;
  };
  
  // ============================================
  // Notification Functions
  // ============================================
  
  window.openNotifications = function() {
    const panel = $('#notification-panel');
    panel.style.transform = 'translateX(0)';
    renderNotifications();
  };
  
  window.closeNotifications = function() {
    const panel = $('#notification-panel');
    panel.style.transform = 'translateX(100%)';
  };
  
  function renderNotifications() {
    const notifications = [
      { id: 1, message: 'WICKET! Suryakumar Yadav dismissed for 28', time: '2 min ago', type: 'wicket' },
      { id: 2, message: 'FOUR! Rohit Sharma hits a boundary', time: '5 min ago', type: 'boundary' },
      { id: 3, message: 'Powerplay Score: 62/2', time: '15 min ago', type: 'milestone' },
      { id: 4, message: 'Match started at Wankhede Stadium', time: '45 min ago', type: 'info' }
    ];
    
    const container = $('#notification-list');
    container.innerHTML = notifications.map(n => `
      <div class="flex items-start gap-3 p-3 bg-slate-800/50 rounded-xl">
        <div class="w-8 h-8 rounded-full ${n.type === 'wicket' ? 'bg-red-500/20 text-red-400' : n.type === 'boundary' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/20 text-blue-400'} flex items-center justify-center flex-shrink-0">
          <i class="${n.type === 'wicket' ? 'ri-user-minus-line' : n.type === 'boundary' ? 'ri-arrow-right-circle-line' : 'ri-information-line'}"></i>
        </div>
        <div class="flex-1">
          <p class="text-sm">${n.message}</p>
          <p class="text-xs text-slate-500 mt-1">${n.time}</p>
        </div>
      </div>
    `).join('');
  }
  
  function addNotification(notification) {
    const badge = $('#notification-badge');
    badge.classList.remove('hidden');
    const count = parseInt(badge.textContent) || 0;
    badge.textContent = count + 1;
  }
  
  // ============================================
  // Modal Functions
  // ============================================
  
  window.openMatchSchedule = function() {
    renderSchedule();
    $('#schedule-modal').classList.remove('hidden');
  };
  
  window.closeScheduleModal = function() {
    $('#schedule-modal').classList.add('hidden');
  };
  
  window.closePlayerModal = function() {
    $('#player-modal').classList.add('hidden');
  };
  
  // ============================================
  // Theme Functions
  // ============================================
  
  window.toggleTheme = function() {
    document.body.classList.toggle('light');
    const icon = $('#theme-icon');
    if (document.body.classList.contains('light')) {
      icon.className = 'ri-moon-line text-lg';
    } else {
      icon.className = 'ri-sun-line text-lg';
    }
  };
  
  // ============================================
  // Tab Navigation
  // ============================================
  
  function initTabs() {
    const tabs = $$('.tab-btn');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        switchTab(tabName);
      });
    });
  }
  
  function switchTab(tabName) {
    // Update tab buttons
    $$('.tab-btn').forEach(btn => {
      if (btn.dataset.tab === tabName) {
        btn.classList.add('tab-active');
        btn.classList.remove('text-slate-400');
      } else {
        btn.classList.remove('tab-active');
        btn.classList.add('text-slate-400');
      }
    });
    
    // Update tab content
    $$('.tab-pane').forEach(pane => {
      pane.classList.add('hidden');
    });
    
    const activePane = $(`#tab-${tabName}`);
    if (activePane) {
      activePane.classList.remove('hidden');
      
      // Load tab-specific content
      switch (tabName) {
        case 'scorecard':
          renderScorecard(appState.selectedInnings);
          break;
        case 'commentary':
          renderFullCommentary();
          break;
        case 'stats':
          renderStats();
          break;
        case 'headtohead':
          renderHeadToHead();
          break;
        case 'players':
          renderPlayers(appState.selectedTeam);
          break;
      }
    }
    
    appState.selectedTab = tabName;
  }
  
  // ============================================
  // Innings & Team Selection
  // ============================================
  
  function initInningsButtons() {
    $$('.innings-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const innings = parseInt(btn.dataset.innings);
        appState.selectedInnings = innings;
        
        $$('.innings-btn').forEach(b => {
          b.classList.remove('bg-blue-600');
          b.classList.add('bg-slate-700');
        });
        btn.classList.add('bg-blue-600');
        btn.classList.remove('bg-slate-700');
        
        renderScorecard(innings);
      });
    });
  }
  
  function initTeamButtons() {
    $$('.team-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const team = btn.dataset.team;
        appState.selectedTeam = team;
        
        $$('.team-btn').forEach(b => {
          b.classList.remove('team-mi', 'team-kkr');
          b.classList.add('bg-slate-700');
        });
        btn.classList.remove('bg-slate-700');
        btn.classList.add(`team-${team}`);
        
        renderPlayers(team);
      });
    });
  }
  
  // ============================================
  // Bottom Navigation
  // ============================================
  
  function initBottomNav() {
    $$('.bottom-nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const page = item.dataset.page;
        
        $$('.bottom-nav-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        
        // Handle navigation
        switch (page) {
          case 'home':
            window.scrollTo({ top: 0, behavior: 'smooth' });
            break;
          case 'live':
            switchTab('live');
            break;
          case 'schedule':
            openMatchSchedule();
            break;
          case 'stats':
            switchTab('stats');
            break;
          case 'more':
            // Show more options
            break;
        }
      });
    });
  }
  
  // ============================================
  // Initialization
  // ============================================
  
  function init() {
    // Hide loading screen
    setTimeout(() => {
      const loadingScreen = $('#loading-screen');
      if (loadingScreen) {
        loadingScreen.style.opacity = '0';
        setTimeout(() => loadingScreen.remove(), 300);
      }
    }, 1000);
    
    // Initialize components
    initTabs();
    initInningsButtons();
    initTeamButtons();
    initBottomNav();
    
    // Load initial data
    loadMatchData();
    
    // Initialize WebSocket
    initWebSocket();
    
    // Set up periodic refresh
    setInterval(loadMatchData, 30000);
  }
  
  // Start the app
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
})();