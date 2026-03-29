(function() {
  window.firebase = window.firebase || null;
  
  function safeLocalStorage() {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return localStorage;
    } catch (e) {
      return {
        getItem: function() { return null; },
        setItem: function() {},
        removeItem: function() {},
        clear: function() {}
      };
    }
  }
  const localStorage = safeLocalStorage();
  
  // Enhanced API connection with fallback detection
  const detectApiBaseUrl = function() {
    // If running from file://, use localhost:3000
    if (window.location.protocol === "file:") {
      return "http://localhost:3000";
    }
    // If running from localhost with specific port, use that
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      return window.location.origin;
    }
    // Otherwise use relative path (same origin)
    return "";
  };
  
  const APP_BASE_URL = detectApiBaseUrl();
  const API_BASE = APP_BASE_URL + "/api";
  const WS_BASE = APP_BASE_URL.replace(/^http/, "ws") + "/ws";
  
  // WebSocket support
  let wsConnection = null;
  let wsReconnectTimer = null;
  let wsConnected = false;
  
  function initWebSocket() {
    if (wsConnection) {
      wsConnection.close();
    }
    
    try {
      wsConnection = new WebSocket(WS_BASE);
      
      wsConnection.onopen = function() {
        console.log("WebSocket connected");
        wsConnected = true;
        clearTimeout(wsReconnectTimer);
      };
      
      wsConnection.onmessage = function(event) {
        try {
          const data = JSON.parse(event.data);
          handleWsMessage(data);
        } catch (e) {
          console.error("WS message parse error:", e);
        }
      };
      
      wsConnection.onclose = function() {
        console.log("WebSocket disconnected");
        wsConnected = false;
        // Attempt to reconnect
        wsReconnectTimer = setTimeout(initWebSocket, 3000);
      };
      
      wsConnection.onerror = function(error) {
        console.error("WebSocket error:", error);
      };
    } catch (e) {
      console.error("WebSocket initialization failed:", e);
    }
  }
  
  function handleWsMessage(data) {
    const { type, payload } = data;
    
    switch (type) {
      case "connected":
        console.log("WS: Server acknowledged connection");
        break;
      case "state-update":
        if (payload) {
          applyFullState(Object.assign({}, appState, payload, {
            chatMessages: appState.chatMessages,
            notifications: appState.notifications
          }));
          scheduleAiRefresh();
          schedulePressureRefresh();
        }
        break;
      case "chat-message":
        if (payload && payload.message) {
          appState.chatMessages = appendUniqueItem(appState.chatMessages, payload.message, 50);
          renderChats();
        }
        break;
      case "notification":
        if (payload && payload.notification) {
          appState.notifications = appendUniqueItem(appState.notifications, payload.notification, 20);
          clearSystemNotice();
          renderNotifications();
        }
        break;
      case "announcement":
        if (payload && payload.message) {
          showSystemNotice("📢 " + payload.message);
        }
        break;
      case "mobile-stream-frame":
        if (payload && payload.frame) {
          updateMobileStreamFrame(payload);
        }
        break;
    }
  }
  
  function sendWsMessage(type, data) {
    if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
      wsConnection.send(JSON.stringify({ type, ...data }));
      return true;
    }
    return false;
  }
  
  // Send chat via WebSocket
  window.sendWsChat = function(content) {
    return sendWsMessage("chat", { content, username: fanAlias });
  };
  
  // Vote via WebSocket
  window.sendWsVote = function(team) {
    return sendWsMessage("poll-vote", { team });
  };
  
  // Connection status tracking
  let connectionStatus = "disconnected";
  let retryCount = 0;
  const MAX_RETRIES = 5;
  const PAGE_NAMES = new Set([
    "getstarted",
    "home",
    "live",
    "stats",
    "predictions",
    "scenario",
    "pressure",
    "highlights",
    "analytics"
  ]);
  const MOBILE_NAV_PAGES = new Set(["home", "live", "stats", "scenario"]);

  const FALLBACK_STATE = {
    stream: {
      url: "",
      platform: "custom",
      status: "offline",
      viewerCount: 0
    },
    score: {
      team1: "",
      team2: "",
      matchTitle: "",
      team1Score: "",
      team2Score: "",
      overs: "",
      batsman: "",
      bowler: "",
      runRate: "",
      team1Flag: "",
      team2Flag: "",
      target: "",
      venue: "",
      format: ""
    },
    chatMessages: [],
    poll: {
      question: "",
      votes: { team1: 0, team2: 0 }
    },
    content: {
      hero: {
        badge: "",
        title: "",
        subtitle: "",
        ctaPrimary: "Watch Live",
        ctaSecondary: "Predictions",
        liveMatches: "",
        upcomingMatches: "",
        fansOnline: ""
      },
      matchCenter: {
        title: "Match Centre",
        league: "",
        team2: "",
        team2Score: "",
        team2Flag: "",
        target: "",
        winProbabilityTeam1: 50,
        projectedTotal: ""
      },
      quickActions: {
        scorecard: "Full Scorecard",
        analytics: "Analytics",
        highlights: "Highlights"
      },
      sections: {
        liveMatchesTitle: "Live Matches",
        upcomingTitle: "Upcoming Matches",
        resultsTitle: "Recent Results",
        performersTitle: "Top Performers"
      },
      promo: {
        title: "",
        subtitle: "",
        primaryLabel: "",
        secondaryLabel: ""
      },
      performers: {
        batsmen: [],
        bowlers: []
      },
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
        geo: [],
        seasonTable: [],
        fixtureList: [],
        storylines: [],
        seasonPulse: []
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

  let appState = clone(FALLBACK_STATE);
  let aiInsights = null;
  let realtime = null;
  let runrateChart = null;
  let wicketChart = null;
  let scenarioChart = null;
  let pressureCenterData = null;
  let scenarioAutoSeed = true;
  let renderedStreamKey = "";
  let aiRefreshTimer = null;
  let pressureRefreshTimer = null;
  let systemNotice = null;
  let systemNoticeTimer = null;
  let matchCountdownTimer = null;
  const reactionCounts = Object.create(null);
  const TEAM_META = {
    rcb: {
      names: ["royal challengers bengaluru", "royal challengers bangalore", "bengaluru", "rcb"],
      code: "RCB",
      badgeClass: "team-badge--rcb",
      textClass: "team-text--rcb",
      lineupClass: "team-lineup-card--rcb"
    },
    srh: {
      names: ["sunrisers hyderabad", "hyderabad", "srh"],
      code: "SRH",
      badgeClass: "team-badge--srh",
      textClass: "team-text--srh",
      lineupClass: "team-lineup-card--srh"
    },
    mi: {
      names: ["mumbai indians", "mumbai", "mi"],
      code: "MI",
      badgeClass: "team-badge--mi",
      textClass: "team-text--mi",
      lineupClass: "team-lineup-card--mi"
    },
    kkr: {
      names: ["kolkata knight riders", "kolkata", "kkr"],
      code: "KKR",
      badgeClass: "team-badge--kkr",
      textClass: "team-text--kkr",
      lineupClass: "team-lineup-card--kkr"
    },
    csk: {
      names: ["chennai super kings", "chennai", "csk"],
      code: "CSK",
      badgeClass: "team-badge--csk",
      textClass: "team-text--csk",
      lineupClass: "team-lineup-card--csk"
    },
    dc: {
      names: ["delhi capitals", "delhi", "dc"],
      code: "DC",
      badgeClass: "team-badge--dc",
      textClass: "team-text--dc",
      lineupClass: "team-lineup-card--dc"
    },
    gt: {
      names: ["gujarat titans", "gujarat", "gt"],
      code: "GT",
      badgeClass: "team-badge--gt",
      textClass: "team-text--gt",
      lineupClass: "team-lineup-card--gt"
    },
    lsg: {
      names: ["lucknow super giants", "lucknow", "lsg"],
      code: "LSG",
      badgeClass: "team-badge--lsg",
      textClass: "team-text--lsg",
      lineupClass: "team-lineup-card--lsg"
    },
    pbks: {
      names: ["punjab kings", "punjab", "pbks"],
      code: "PBKS",
      badgeClass: "team-badge--pbks",
      textClass: "team-text--pbks",
      lineupClass: "team-lineup-card--pbks"
    },
    rr: {
      names: ["rajasthan royals", "rajasthan", "rr"],
      code: "RR",
      badgeClass: "team-badge--rr",
      textClass: "team-text--rr",
      lineupClass: "team-lineup-card--rr"
    }
  };
  const TEAM_TEXT_CLASSES = Object.freeze(Object.keys(TEAM_META).map(function(key) {
    return TEAM_META[key].textClass;
  }).filter(Boolean));
  const fanAlias = getFanAlias();

  window.addEventListener("load", init);
  window.addEventListener("hashchange", function() {
    showPage(getRequestedPage(), { syncHash: false });
  });
  window.addEventListener("beforeunload", function() {
    if (realtime) realtime.close();
  });
  
  // Voice Control Setup
  let recognition = null;
  let voiceEnabled = false;
  
  function setupVoiceControl() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.log("Voice control not supported in this browser");
      return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    
    recognition.onresult = function(event) {
      const last = event.results.length - 1;
      const command = event.results[last][0].transcript.toLowerCase().trim();
      processVoiceCommand(command);
    };
    
    recognition.onerror = function(event) {
      console.log("Voice recognition error:", event.error);
      if (event.error === 'no-speech') {
        // Restart recognition
        if (voiceEnabled) recognition.start();
      }
    };
    
    recognition.onend = function() {
      if (voiceEnabled) {
        try { recognition.start(); } catch(e) {}
      }
    };
  }
  
  function processVoiceCommand(command) {
    console.log("Voice command:", command);
    
    // Navigation commands
    if (command.includes("go home") || command.includes("show home")) showPage('home');
    else if (command.includes("go live") || command.includes("watch live")) showPage('live');
    else if (command.includes("stats") || command.includes("statistics")) showPage('stats');
    else if (command.includes("predictions")) showPage('predictions');
    else if (command.includes("highlights")) showPage('highlights');
    else if (command.includes("analytics")) showPage('analytics');
    else if (command.includes("pressure") || command.includes("momentum")) showPage('pressure');
    else if (command.includes("refresh") || command.includes("reload")) location.reload();
    
    // Chat commands
    else if (command.includes("send message") || command.includes("chat")) {
      const input = document.getElementById("chat-input");
      if (input) {
        input.focus();
        const message = command.replace(/send message|chat|say/gi, '').trim();
        if (message) {
          input.value = message;
          sendChatMessage();
        }
      }
    }
    
    // Voice control toggle
    else if (command.includes("stop voice") || command.includes("disable voice")) {
      toggleVoiceControl(false);
    }
  }
  
  window.toggleVoiceControl = function(forceState) {
    if (!recognition) {
      setupVoiceControl();
      if (!recognition) {
        showSystemNotice("Voice control not supported in this browser");
        return;
      }
    }
    
    voiceEnabled = typeof forceState === 'boolean' ? forceState : !voiceEnabled;
    
    try {
      if (voiceEnabled) {
        recognition.start();
        showSystemNotice("Voice control enabled - try saying 'go live' or 'show stats'");
      } else {
        recognition.stop();
        showSystemNotice("Voice control disabled");
      }
    } catch(e) {
      console.log("Voice control error:", e);
    }
    
    return voiceEnabled;
  };

  window.showPage = function(page, options) {
    showPage(page, options);
  };

  window.sendChatMessage = function() {
    void sendChatFromInput("chat-input");
  };

  window.sendHomeChatMessage = function() {
    void sendChatFromInput("home-chat-input");
  };

  window.votePoll = function(teamKey) {
    void submitPollVote(teamKey);
  };

  window.playHighlight = function(title, desc, videoUrl) {
    setText("highlight-title", title);
    setText("highlight-desc", desc);
    const video = document.getElementById("highlight-video");
    if (!video) return;
    video.src = videoUrl || "https://commondatastorage.googleapis.com/gtv-videos-library/sample/BigBuckBunny.mp4";
    video.play().catch(function() {});
  };

  window.setReminder = function() {
    const matchTime = appState && appState.score ? appState.score.matchDateTime : "";
    const fixture = getFixtureTeams();
    if (!matchTime) {
      showSystemNotice("Match time has not been published yet.");
      return;
    }
    localStorage.setItem("cricketlive_match_reminder", matchTime);
    showSystemNotice("Reminder saved for " + fixture.team1 + " vs " + fixture.team2 + ".");
  };

  window.sendReaction = function(emoji) {
    const key = String(emoji || "🔥");
    reactionCounts[key] = (reactionCounts[key] || 0) + 1;
    showSystemNotice(key + " reaction sent · " + reactionCounts[key] + " from this device");
  };

  async function init() {
    // Hide loading screen
    const loadingScreen = document.getElementById("loading-screen");
    if (loadingScreen) {
      loadingScreen.style.opacity = "0";
      setTimeout(function() {
        loadingScreen.style.display = "none";
      }, 300);
    }
    
    bindKeyboardShortcuts();
    initCharts();
    await loadInitialData();
    connectRealtime();
    initWebSocket(); // Initialize WebSocket connection
    showPage(getRequestedPage(), { syncHash: false });
    
    // Initialize voice control setup
    setupVoiceControl();
    updateConnectionStatus();
    
    // Auto-refresh AI insights every 30 seconds
    setInterval(function() {
      refreshAiInsights();
    }, 30000);
    
    // Auto-refresh state every 10 seconds as backup
    setInterval(function() {
      fetchJson("/state").then(function(state) {
        if (state) {
          applyFullState(state);
          schedulePressureRefresh();
        }
      }).catch(function() {});
    }, 10000);
    
    // Fetch live match stats every 15 seconds for additional real-time data
    setInterval(function() {
      fetchJson("/match/stats").then(function(stats) {
        if (stats && stats.ok) {
          // Update match stats if available
          if (stats.score) {
            appState.score = Object.assign({}, appState.score, stats.score);
            renderAll();
          }
        }
      }).catch(function() {});
    }, 15000);
    
    // Fetch poll status every 5 seconds
    setInterval(function() {
      fetchJson("/poll/status").then(function(poll) {
        if (poll && poll.ok && appState.poll) {
          // Poll status for real-time vote counts
          renderPoll();
        }
      }).catch(function() {});
    }, 5000);
    
    // Fetch live sync status every 20 seconds
    setInterval(function() {
      fetchJson("/live-sync/status").then(function(sync) {
        if (sync && sync.ok && sync.active) {
          // Live sync is active - score is being updated automatically
        }
      }).catch(function() {});
    }, 20000);
    
    // Update connection status periodically
    setInterval(updateConnectionStatus, 5000);
    
    console.log("Auto-refresh enabled: AI insights every 30s, state every 10s, WebSocket ready");
    console.log("Voice control ready - say 'go live' or 'show stats'");
  }

  async function loadInitialData() {
    try {
      const results = await Promise.all([
        fetchJson("/state"),
        fetchJson("/ai/insights").catch(function() {
          return null;
        }),
        fetchJson("/match/pressure-center").catch(function() {
          return null;
        })
      ]);

      applyFullState(results[0]);
      if (results[1] && results[1].insights) {
        aiInsights = results[1].insights;
        updateAiSourceBadge(results[1].source);
        renderPredictions();
        renderMatchCentre();
        updateCharts();
      }
      if (results[2] && results[2].pressureCenter) {
        pressureCenterData = results[2].pressureCenter;
        renderPressureCenter();
      }
      clearSystemNotice();
    } catch (error) {
      console.error("Failed to load live data:", error);
      applyFullState(clone(FALLBACK_STATE));
      showSystemNotice("Backend is offline. Connect the live API to load real content.");
    }
  }

  function connectRealtime() {
    if (realtime) realtime.close();

    try {
      connectionStatus = "connecting";
      updateConnectionStatus();
      
      realtime = new EventSource(API_BASE + "/events");
      realtime.onopen = function() {
        clearSystemNotice();
        connectionStatus = "connected";
        retryCount = 0;
        updateConnectionStatus();
        console.log("Realtime connected to server");
      };
      realtime.onerror = function() {
        connectionStatus = "retrying";
        updateConnectionStatus();
        showSystemNotice("Realtime feed interrupted. Reconnecting...");
        console.warn("Realtime connection error, retrying...");
      };
      
      // Handle different event types from admin
      realtime.addEventListener("announcement", function(event) {
        const payload = safeJsonParse(event.data);
        if (payload && payload.message) {
          showSystemNotice("📢 " + payload.message);
        }
      });
      
      // Handle mobile stream frame updates
      realtime.addEventListener("mobile-stream-frame", function(event) {
        const payload = safeJsonParse(event.data);
        if (payload && payload.frame) {
          updateMobileStreamFrame(payload);
        }
      });

      realtime.addEventListener("state-update", function(event) {
        const payload = safeJsonParse(event.data);
        if (!payload) return;
        applyFullState(Object.assign({}, appState, payload, {
          chatMessages: appState.chatMessages,
          notifications: appState.notifications
        }));
        scheduleAiRefresh();
        schedulePressureRefresh();
        // Force immediate render of all dynamic sections
        renderAll();
        renderLiveScore();
        renderMatchDetails();
        renderPoll();
        renderChats();
      });

      realtime.addEventListener("chat-snapshot", function(event) {
        const payload = safeJsonParse(event.data) || {};
        appState.chatMessages = Array.isArray(payload.messages) ? payload.messages.slice(-50) : [];
        renderChats();
      });

      realtime.addEventListener("chat-message", function(event) {
        const payload = safeJsonParse(event.data) || {};
        if (!payload.message) return;
        appState.chatMessages = appendUniqueItem(appState.chatMessages, payload.message, 50);
        renderChats();
      });

      realtime.addEventListener("notification-snapshot", function(event) {
        const payload = safeJsonParse(event.data) || {};
        appState.notifications = Array.isArray(payload.notifications) ? payload.notifications.slice(-20) : [];
        renderNotifications();
      });

      realtime.addEventListener("notification", function(event) {
        const payload = safeJsonParse(event.data) || {};
        if (!payload.notification) return;
        appState.notifications = appendUniqueItem(appState.notifications, payload.notification, 20);
        clearSystemNotice();
        renderNotifications();
      });
    } catch (error) {
      console.error("Realtime connection failed:", error);
      showSystemNotice("Realtime updates are unavailable right now.");
    }
  }

  function scheduleAiRefresh() {
    clearTimeout(aiRefreshTimer);
    aiRefreshTimer = setTimeout(function() {
      void refreshAiInsights();
    }, 300);
  }

  function schedulePressureRefresh() {
    clearTimeout(pressureRefreshTimer);
    pressureRefreshTimer = setTimeout(function() {
      void refreshPressureCenter();
    }, 350);
  }

  let lastUpdateTime = null;
  
  function updateLastUpdatedIndicator() {
    lastUpdateTime = new Date();
    const indicator = document.getElementById("last-updated");
    if (indicator && lastUpdateTime) {
      indicator.textContent = "Updated: " + lastUpdateTime.toLocaleTimeString();
    }
  }

  function updateAiSourceBadge(source) {
    const badge = document.getElementById("ai-source-badge");
    if (!badge) return;
    badge.textContent = "Source: " + String(source || "rule-based").toUpperCase();
  }
  
  // Update connection status indicator
  function updateConnectionStatus() {
    const dot = document.getElementById("connection-dot");
    const text = document.getElementById("connection-text");
    
    if (!dot || !text) return;
    
    const statusColors = {
      "connected": "bg-green-500",
      "connecting": "bg-yellow-500",
      "retrying": "bg-orange-500",
      "failed": "bg-red-500",
      "disconnected": "bg-slate-500"
    };
    
    const statusTexts = {
      "connected": "Connected",
      "connecting": "Connecting...",
      "retrying": "Reconnecting...",
      "failed": "Disconnected",
      "disconnected": "Offline"
    };
    
    dot.className = "w-2 h-2 rounded-full " + (statusColors[connectionStatus] || statusColors["disconnected"]);
    text.textContent = statusTexts[connectionStatus] || statusTexts["disconnected"];
  }

  async function refreshAiInsights() {
    try {
      const payload = await fetchJson("/ai/insights");
      if (!payload || !payload.insights) return;
      aiInsights = payload.insights;
      updateAiSourceBadge(payload.source);
      renderPredictions();
      renderMatchCentre();
      updateCharts();
    } catch (error) {
      console.error("Failed to refresh AI insights:", error);
    }
  }

  async function refreshPressureCenter() {
    try {
      const payload = await fetchJson("/match/pressure-center");
      if (!payload || !payload.pressureCenter) return;
      pressureCenterData = payload.pressureCenter;
      renderPressureCenter();
    } catch (error) {
      console.error("Failed to refresh pressure center:", error);
    }
  }

  function showPage(page, options) {
    const nextPage = PAGE_NAMES.has(page) ? page : "getstarted";
    const pageElement = document.getElementById(nextPage + "-page");
    if (!pageElement) return;

    document.querySelectorAll(".page").forEach(function(element) {
      element.classList.add("hidden");
    });
    pageElement.classList.remove("hidden");
    syncMobileNavigation(nextPage);
    if (typeof window.closeMobileMenu === "function") {
      window.closeMobileMenu();
    }

    if (!options || options.syncHash !== false) {
      const nextLocation = nextPage === "getstarted" ? window.location.pathname : "#" + nextPage;
      history.replaceState(null, "", nextLocation);
    }

    if (nextPage === "live") renderStreamPlayer();
    if (nextPage === "scenario") renderScenarioLab();
    if (nextPage === "pressure") renderPressureCenter();
    if (nextPage === "analytics") updateCharts();
  }

  function syncMobileNavigation(page) {
    const activePage = String(page || "").toLowerCase();
    document.querySelectorAll("[data-mobile-nav-page]").forEach(function(button) {
      const targetPage = String(button.getAttribute("data-mobile-nav-page") || "").toLowerCase();
      const isShortcut = MOBILE_NAV_PAGES.has(activePage);
      const isActive = targetPage === activePage || (targetPage === "menu" && !isShortcut);
      button.classList.toggle("active", isActive);
      if (isActive) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
  }

  function applyFullState(nextState) {
    appState = hydrateState(nextState);
    renderAll();
    updateLastUpdatedIndicator();
  }

  function hydrateState(rawState) {
    const raw = rawState && typeof rawState === "object" ? rawState : {};
    const content = raw.content && typeof raw.content === "object" ? raw.content : {};
    const performers = content.performers && typeof content.performers === "object" ? content.performers : {};
    const poll = raw.poll && typeof raw.poll === "object" ? raw.poll : {};
    const votes = poll.votes && typeof poll.votes === "object" ? poll.votes : {};

    return {
      stream: Object.assign({}, FALLBACK_STATE.stream, raw.stream || {}),
      score: Object.assign({}, FALLBACK_STATE.score, raw.score || {}),
      chatMessages: Array.isArray(raw.chatMessages) ? raw.chatMessages.slice(-50) : clone(FALLBACK_STATE.chatMessages),
      poll: {
        question: typeof poll.question === "string" && poll.question.trim() ? poll.question.trim() : FALLBACK_STATE.poll.question,
        votes: Object.assign({}, FALLBACK_STATE.poll.votes, votes)
      },
      content: {
        hero: Object.assign({}, FALLBACK_STATE.content.hero, content.hero || {}),
        matchCenter: Object.assign({}, FALLBACK_STATE.content.matchCenter, content.matchCenter || {}),
        quickActions: Object.assign({}, FALLBACK_STATE.content.quickActions, content.quickActions || {}),
        sections: Object.assign({}, FALLBACK_STATE.content.sections, content.sections || {}),
        promo: Object.assign({}, FALLBACK_STATE.content.promo, content.promo || {}),
        performers: {
          batsmen: resolveCollection(performers.batsmen, null, FALLBACK_STATE.content.performers.batsmen, 10),
          bowlers: resolveCollection(performers.bowlers, null, FALLBACK_STATE.content.performers.bowlers, 10)
        },
        stats: {
          highestScore: Object.assign({}, FALLBACK_STATE.content.stats.highestScore, (content.stats || {}).highestScore || {}),
          bestBowling: Object.assign({}, FALLBACK_STATE.content.stats.bestBowling, (content.stats || {}).bestBowling || {}),
          keyMetrics: resolveCollection((content.stats || {}).keyMetrics, null, FALLBACK_STATE.content.stats.keyMetrics, 8),
          momentum: Object.assign({}, FALLBACK_STATE.content.stats.momentum, (content.stats || {}).momentum || {})
        },
        predictions: {
          expert: Object.assign({}, FALLBACK_STATE.content.predictions.expert, (content.predictions || {}).expert || {}),
          playerForm: resolveCollection((content.predictions || {}).playerForm, null, FALLBACK_STATE.content.predictions.playerForm, 6),
          scoreLines: resolveCollection((content.predictions || {}).scoreLines, null, FALLBACK_STATE.content.predictions.scoreLines, 4)
        },
        highlights: {
          featured: Object.assign({}, FALLBACK_STATE.content.highlights.featured, (content.highlights || {}).featured || {}),
          items: resolveCollection((content.highlights || {}).items, null, FALLBACK_STATE.content.highlights.items, 12),
          stats: resolveCollection((content.highlights || {}).stats, null, FALLBACK_STATE.content.highlights.stats, 8),
          trending: resolveCollection((content.highlights || {}).trending, null, FALLBACK_STATE.content.highlights.trending, 6)
        },
        analytics: {
          battingRows: resolveCollection((content.analytics || {}).battingRows, null, FALLBACK_STATE.content.analytics.battingRows, 12),
          bowlingRows: resolveCollection((content.analytics || {}).bowlingRows, null, FALLBACK_STATE.content.analytics.bowlingRows, 12),
          geo: resolveCollection((content.analytics || {}).geo, null, FALLBACK_STATE.content.analytics.geo, 6),
          seasonTable: resolveCollection((content.analytics || {}).seasonTable, null, FALLBACK_STATE.content.analytics.seasonTable, 12),
          fixtureList: resolveCollection((content.analytics || {}).fixtureList, null, FALLBACK_STATE.content.analytics.fixtureList, 12),
          storylines: resolveCollection((content.analytics || {}).storylines, null, FALLBACK_STATE.content.analytics.storylines, 8),
          seasonPulse: resolveCollection((content.analytics || {}).seasonPulse, null, FALLBACK_STATE.content.analytics.seasonPulse, 6)
        }
      },
      liveMatches: resolveCollection(raw.liveMatches, content.liveMatches, FALLBACK_STATE.liveMatches, 10),
      upcomingMatches: resolveCollection(raw.upcomingMatches, content.upcomingMatches, FALLBACK_STATE.upcomingMatches, 10),
      recentResults: resolveCollection(raw.recentResults, content.recentResults, FALLBACK_STATE.recentResults, 10),
      ballFeed: resolveCollection(raw.ballFeed, null, [], 60),
      timelineEvents: resolveCollection(raw.timelineEvents, null, [], 20),
      notifications: Array.isArray(raw.notifications) ? raw.notifications.slice(-20) : [],
      updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : FALLBACK_STATE.updatedAt
    };
  }

  function renderAll() {
    renderHero();
    renderMatchTicker();
    renderPromo();
    renderMatchCentre();
    renderBroadcastIntel();
    renderMatchCards();
    renderPerformers();
    renderPoll();
    renderChats();
    renderLiveExperience();
    renderTimeline();
    renderStats();
    renderPredictions();
    renderScenarioLab();
    renderPressureCenter();
    renderHighlights();
    renderAnalyticsTables();
    renderNotifications();
    renderAiBriefing();
    renderStreamMeta();
    updateCharts();
  }

  function renderHero() {
    const hero = appState.content.hero;
    const liveLabel = metricText(hero.liveMatches, appState.liveMatches.length, "Live Match", "Live Matches");
    const upcomingLabel = metricText(hero.upcomingMatches, appState.upcomingMatches.length, "Upcoming Match", "Upcoming");
    const fansLabel = hero.fansOnline || ((Number(appState.stream.viewerCount) || 0) > 0 ? compactNumber(appState.stream.viewerCount) + " Fans Online" : "Fans Joining Live");

    setText("hero-badge", hero.badge || FALLBACK_STATE.content.hero.badge);
    setHtml("hero-title", escapeHtml(hero.title || FALLBACK_STATE.content.hero.title).replace(/\n/g, "<br>"));
    setText("hero-subtitle", hero.subtitle || FALLBACK_STATE.content.hero.subtitle);
    setText("hero-cta-primary", hero.ctaPrimary || FALLBACK_STATE.content.hero.ctaPrimary);
    setText("hero-cta-secondary", hero.ctaSecondary || FALLBACK_STATE.content.hero.ctaSecondary);
    setText("hero-live-count", liveLabel);
    setText("hero-upcoming-count", upcomingLabel);
    setText("hero-fans-count", fansLabel);
  }

  function renderMatchTicker() {
    const fixture = getFixtureTeams();
    setText("next-match-teams", fixture.team1 + " vs " + fixture.team2);

    const countdownEl = document.getElementById("match-countdown");
    if (!countdownEl) return;

    const matchTime = Date.parse(appState.score.matchDateTime || "");
    if (!Number.isFinite(matchTime)) {
      countdownEl.textContent = "TBA";
      return;
    }

    if (matchCountdownTimer) clearInterval(matchCountdownTimer);

    const updateCountdown = function() {
      const diff = matchTime - Date.now();
      if (diff <= 0) {
        countdownEl.textContent = (parseScore(appState.score.team1Score).runs > 0 || (appState.ballFeed || []).length) ? "LIVE NOW" : "LIVE BUILD-UP";
        return;
      }
      const totalSeconds = Math.floor(diff / 1000);
      const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
      const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
      const seconds = String(totalSeconds % 60).padStart(2, "0");
      countdownEl.textContent = hours + ":" + minutes + ":" + seconds;
    };

    updateCountdown();
    matchCountdownTimer = setInterval(updateCountdown, 1000);
  }

  function renderStreamMeta() {
    setText("stream-title", appState.score.matchTitle || appState.content.matchCenter.league || "Live match");

    const uptimeEl = document.getElementById("stream-uptime");
    if (!uptimeEl) return;
    const matchTime = Date.parse(appState.score.matchDateTime || "");
    if (Number.isFinite(matchTime) && matchTime > Date.now()) {
      uptimeEl.textContent = "Starts " + new Date(matchTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      return;
    }
    if (parseScore(appState.score.team1Score).runs > 0 || (appState.ballFeed || []).length) {
      uptimeEl.textContent = (appState.score.overs || "0.0") + " overs live";
      return;
    }
    uptimeEl.textContent = appState.stream.status === "live" ? "Build-up live" : "Offline";
  }

  function renderPromo() {
    const promo = appState.content.promo || FALLBACK_STATE.content.promo;
    setText("promo-title", promo.title || FALLBACK_STATE.content.promo.title);
    setText("promo-subtitle", promo.subtitle || FALLBACK_STATE.content.promo.subtitle);
    setText("promo-primary-btn", promo.primaryLabel || FALLBACK_STATE.content.promo.primaryLabel);
    setText("promo-secondary-btn", promo.secondaryLabel || FALLBACK_STATE.content.promo.secondaryLabel);
  }

  function renderMatchCentre() {
    const score = appState.score;
    const matchCenter = appState.content.matchCenter;
    const pollBreakdown = getPollBreakdown();
    const winProbability = firstFinite([
      aiInsights && aiInsights.prediction ? aiInsights.prediction.fanConfidenceTeam1 : null,
      matchCenter.winProbabilityTeam1,
      pollBreakdown.team1Percent
    ], 50);
    const projectedTotal = firstFinite([
      aiInsights && aiInsights.prediction ? aiInsights.prediction.projectedTotal : null,
      numericValue(matchCenter.projectedTotal)
    ], null);

    setText("home-match-title", matchCenter.title || FALLBACK_STATE.content.matchCenter.title);
    setText("home-match-league", matchCenter.league || score.matchTitle || FALLBACK_STATE.content.matchCenter.league);
    setHtml("home-team1-flag", renderTeamBadge(score.team1, score.team1Flag || FALLBACK_STATE.score.team1Flag, "team-badge--xl"));
    setText("home-team1-name", score.team1 || FALLBACK_STATE.score.team1);
    setText("home-team1-score", score.team1Score || FALLBACK_STATE.score.team1Score);
    setText("home-overs", (score.overs || FALLBACK_STATE.score.overs) + " overs");
    setText("home-team2-name", score.team2 || matchCenter.team2 || FALLBACK_STATE.score.team2);
    setHtml("home-team2-flag", renderTeamBadge(score.team2 || matchCenter.team2, score.team2Flag || matchCenter.team2Flag || FALLBACK_STATE.score.team2Flag, "team-badge--xl"));
    setText("home-team2-score", score.team2Score || matchCenter.team2Score || "Yet to bat");
    setText("home-target", score.target || matchCenter.target || buildTossSummary(score) || "Target updates live");
    setText("home-batsman", score.batsman || "Waiting for batter data");
    setText("home-bowler", score.bowler || "Waiting for bowler data");
    setText("home-runrate", score.runRate || "0.00");
    setText("home-projected", projectedTotal === null ? "--" : String(projectedTotal));
    setText("home-team1-win", clampPercent(winProbability) + "%");
    setText("home-team2-win", 100 - clampPercent(winProbability) + "%");
    setText("home-team1-short", abbreviateTeam(score.team1 || "Team 1"));
    setText("home-team2-short", abbreviateTeam(score.team2 || matchCenter.team2 || "Team 2"));
    applyTeamTextTone("home-team1-name", score.team1);
    applyTeamTextTone("home-team2-name", score.team2 || matchCenter.team2);

    const winBar = document.getElementById("home-win-bar");
    if (winBar) winBar.style.width = clampPercent(winProbability) + "%";

    setText("quick-action-scorecard", appState.content.quickActions.scorecard || FALLBACK_STATE.content.quickActions.scorecard);
    setText("quick-action-analytics", appState.content.quickActions.analytics || FALLBACK_STATE.content.quickActions.analytics);
    setText("quick-action-highlights", appState.content.quickActions.highlights || FALLBACK_STATE.content.quickActions.highlights);
  }

  function renderBroadcastIntel() {
    const score = appState.score || {};
    const intel = buildBroadcastIntel();

    setText("home-broadcast-status", intel.status);
    setText("home-venue", intel.venue);
    setText("home-venue-note", intel.venueNote);
    setText("home-match-phase", intel.phase);
    setText("home-last-ball", intel.lastBall);
    setText("home-required-rr", intel.requiredRate);
    setText("home-momentum", intel.momentum);
    setText("home-crowd", intel.crowd);
    setText("home-story-title", intel.storyTitle);
    setText("home-story-body", intel.storyBody);
    setText("home-powerplay", intel.powerplay);
    setText("home-projected-range", intel.projectedRange);
    setText("home-projected-range-alt", intel.projectedRange);

    setText("live-broadcast-status", intel.status);
    setText("live-venue", intel.venue);
    setText("live-crowd", intel.crowd);
    setText("live-phase", intel.phase);
    setText("live-last-ball", intel.lastBall);
    setText("live-required-rr", intel.requiredRate);
    setText("live-partnership", score.partnership || "Partnership building");
    setText("live-projected-range", intel.projectedRange);
  }

  function buildBroadcastIntel() {
    const score = appState.score || {};
    const stream = appState.stream || {};
    const feed = Array.isArray(appState.ballFeed) ? appState.ballFeed : [];
    const matchTime = Date.parse(score.matchDateTime || "");
    const hasLiveFeed = feed.length > 0 || (parseScore(score.team1Score).runs || 0) > 0;
    const phase = getMatchPhaseLabel(score, matchTime, hasLiveFeed);
    const status = getBroadcastStatusLabel(stream.status, matchTime, hasLiveFeed);
    const lastBall = getLastBallSummary(feed);
    const projectedRange = getProjectedRangeLabel();
    const momentum = getMomentumLabel();
    const crowd = getCrowdLabel(stream.viewerCount, stream.status);
    const venue = score.venue || "Venue pending";
    const tossSummary = buildTossSummary(score);
    const venueNote = tossSummary !== "Toss pending" ? tossSummary : (score.matchTitle || "Match context pending");
    const powerplay = getPowerplayLabel(score);
    const requiredRate = score.reqRR ? "Req RR " + score.reqRR : (score.target ? "Target " + score.target : "--");
    const venueText = venue === "Venue pending" ? "the broadcast desk" : venue;
    const storyTitle = aiInsights && aiInsights.briefing && aiInsights.briefing.phase
      ? String(aiInsights.briefing.phase) + " Brief"
      : (status.indexOf("LIVE") >= 0 ? "Live Pulse" : "Match Day Pulse");
    const storyBody = aiInsights && aiInsights.summary
      ? aiInsights.summary
      : (score.team1 || score.team2
        ? "The desk is tracking " + (score.team1 || "the batting side") + " against " + (score.team2 || "the chasing side") + " at " + venueText + "."
        : "The desk is tracking the fixture in real time.");

    return {
      status: status,
      venue: venue,
      venueNote: venueNote,
      phase: phase,
      lastBall: lastBall,
      requiredRate: requiredRate,
      momentum: momentum,
      crowd: crowd,
      storyTitle: storyTitle,
      storyBody: storyBody,
      powerplay: powerplay,
      projectedRange: projectedRange
    };
  }

  function renderMatchCards() {
    const liveMatches = appState.liveMatches || [];
    const upcomingMatches = appState.upcomingMatches || [];
    const recentResults = appState.recentResults || [];
    const sections = appState.content.sections;

    setText("live-matches-title", sections.liveMatchesTitle || FALLBACK_STATE.content.sections.liveMatchesTitle);
    setText("upcoming-title", sections.upcomingTitle || FALLBACK_STATE.content.sections.upcomingTitle);
    setText("results-title", sections.resultsTitle || FALLBACK_STATE.content.sections.resultsTitle);

    const liveGrid = document.getElementById("live-matches-grid");
    if (liveGrid) {
      liveGrid.innerHTML = liveMatches.length ? liveMatches.map(function(match, index) {
        return ""
          + '<div class="card-gradient rounded-2xl p-6 border border-slate-700 slide-in" style="animation-delay: ' + (index * 0.08) + 's">'
          + '<div class="flex flex-wrap items-start justify-between gap-2 mb-4">'
          + '<span class="text-xs text-slate-400 uppercase tracking-wider">' + escapeHtml(match.tournament || "Live Fixture") + "</span>"
          + '<div class="flex gap-2"><span class="text-xs bg-red-500/30 text-red-300 px-2 py-1 rounded">' + escapeHtml(match.league || "LIVE") + '</span><span class="text-xs bg-orange-500/30 text-orange-300 px-2 py-1 rounded">' + escapeHtml(match.format || "T20") + "</span></div>"
          + "</div>"
          + '<div class="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-3 mb-6">'
          + '<div class="text-center min-w-0"><div class="mb-2 flex justify-center">' + renderTeamBadge(match.team1, match.team1Flag || "T1", "team-badge--lg") + '</div><span class="font-semibold text-sm leading-tight break-words ' + getTeamTextClass(match.team1) + '">' + escapeHtml(match.team1 || "Team 1") + "</span></div>"
          + '<div class="flex flex-col items-center gap-2"><span class="text-red-400 live-pulse">LIVE</span><span class="text-lg font-bold text-slate-500">VS</span></div>'
          + '<div class="text-center min-w-0"><div class="mb-2 flex justify-center">' + renderTeamBadge(match.team2, match.team2Flag || "T2", "team-badge--lg") + '</div><span class="font-semibold text-sm leading-tight break-words ' + getTeamTextClass(match.team2) + '">' + escapeHtml(match.team2 || "Team 2") + "</span></div>"
          + "</div>"
          + '<button onclick="showPage(\'live\')" class="w-full accent-gradient py-3 rounded-xl font-bold hover:opacity-90 transition-all">Watch Live</button>'
          + "</div>";
      }).join("") : emptyCard("No live matches published yet.");
    }

    const upcomingList = document.getElementById("upcoming-mini-list");
    if (upcomingList) {
      upcomingList.innerHTML = upcomingMatches.length ? upcomingMatches.map(function(match) {
        return ""
          + '<div class="card-gradient rounded-xl p-4 border border-slate-700 flex items-start gap-3 sm:items-center">'
          + '<div class="flex gap-2"><span>' + renderTeamBadge(match.team1, match.team1Flag || "T1", "team-badge--sm") + '</span><span>' + renderTeamBadge(match.team2, match.team2Flag || "T2", "team-badge--sm") + '</span></div>'
          + '<div class="flex-1 min-w-0"><p class="font-semibold leading-tight break-words ' + getTeamTextClass(match.team1) + '">' + escapeHtml(match.team1 || "Team 1") + '</p><p class="text-xs leading-tight break-words ' + getTeamTextClass(match.team2) + '">' + escapeHtml(match.team2 || "Team 2") + '</p><p class="text-xs text-slate-400">' + escapeHtml(match.date || "TBD") + "</p></div>"
          + '<span class="shrink-0 text-xs bg-orange-500/30 text-orange-300 px-2 py-1 rounded">' + escapeHtml(match.format || match.league || "Match") + "</span>"
          + "</div>";
      }).join("") : emptyCard("Upcoming fixtures will appear here.");
    }

    const resultsGrid = document.getElementById("results-grid");
    if (resultsGrid) {
      resultsGrid.innerHTML = recentResults.length ? recentResults.map(function(match, index) {
        return ""
          + '<div class="card-gradient rounded-2xl p-6 border border-slate-700 slide-in" style="animation-delay: ' + (index * 0.08) + 's">'
          + '<div class="flex flex-wrap items-start justify-between gap-2 mb-4"><span class="text-xs text-slate-400">' + escapeHtml(match.league || "Result") + '</span><span class="text-xs bg-orange-500/30 text-orange-300 px-2 py-1 rounded">' + escapeHtml(match.format || "Match") + "</span></div>"
          + '<div class="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-3 mb-4">'
          + '<div class="text-center min-w-0"><div class="mb-2 flex justify-center">' + renderTeamBadge(match.team1, match.team1Flag || "T1", "team-badge--sm") + '</div><span class="font-semibold text-sm leading-tight break-words ' + getTeamTextClass(match.team1) + '">' + escapeHtml(match.team1 || "Team 1") + "</span></div>"
          + '<span class="text-lg font-bold text-slate-500">VS</span>'
          + '<div class="text-center min-w-0"><div class="mb-2 flex justify-center">' + renderTeamBadge(match.team2, match.team2Flag || "T2", "team-badge--sm") + '</div><span class="font-semibold text-sm leading-tight break-words ' + getTeamTextClass(match.team2) + '">' + escapeHtml(match.team2 || "Team 2") + "</span></div>"
          + "</div>"
          + '<div class="text-center"><p class="text-green-400 font-semibold text-sm mb-1">' + escapeHtml(match.result || "Result pending") + '</p><p class="text-slate-500 text-xs">' + escapeHtml(match.score || "") + "</p></div>"
          + "</div>";
      }).join("") : emptyCard("Recent results will show after the next finish.");
    }
  }

  function renderPerformers() {
    const performers = appState.content.performers;
    setText("performers-title", appState.content.sections.performersTitle || FALLBACK_STATE.content.sections.performersTitle);

    const batsmenList = document.getElementById("performers-batsmen-list");
    if (batsmenList) {
      batsmenList.innerHTML = performers.batsmen.length ? performers.batsmen.map(function(player, index) {
        return '<div class="flex items-center justify-between gap-3"><span class="flex min-w-0 items-center gap-2"><span class="w-6 shrink-0 text-center">'
          + escapeHtml(String(player.rank || index + 1))
          + '</span><span class="min-w-0 leading-tight">'
          + escapeHtml((player.name || "Player") + " (" + (player.team || "TEAM") + ")")
          + "</span>"
          + '</span><span class="font-bold '
          + (index === 0 ? "text-green-400" : "")
          + '">'
          + escapeHtml(String(player.runs || 0))
          + "</span></div>";
      }).join("") : '<div class="text-sm text-slate-400">No batting leaderboard published yet.</div>';
    }

    const bowlersList = document.getElementById("performers-bowlers-list");
    if (bowlersList) {
      bowlersList.innerHTML = performers.bowlers.length ? performers.bowlers.map(function(player, index) {
        return '<div class="flex items-center justify-between gap-3"><span class="flex min-w-0 items-center gap-2"><span class="w-6 shrink-0 text-center">'
          + escapeHtml(String(player.rank || index + 1))
          + '</span><span class="min-w-0 leading-tight">'
          + escapeHtml((player.name || "Player") + " (" + (player.team || "TEAM") + ")")
          + "</span>"
          + '</span><span class="font-bold '
          + (index === 0 ? "text-red-400" : "")
          + '">'
          + escapeHtml(String(player.wickets || 0))
          + "</span></div>";
      }).join("") : '<div class="text-sm text-slate-400">No bowling leaderboard published yet.</div>';
    }
  }

  function renderPoll() {
    const pollBreakdown = getPollBreakdown();
    const fixture = getFixtureTeams();
    const team1 = fixture.team1;
    const team2 = fixture.team2;

    setText("poll-question", appState.poll.question || FALLBACK_STATE.poll.question);
    setText("poll-team1-label", team1);
    setText("poll-team2-label", team2);
    setText("poll-team1-percent", pollBreakdown.team1Percent + "%");
    setText("poll-team2-percent", pollBreakdown.team2Percent + "%");
    setText("poll-total-votes", "Fans voted: " + pollBreakdown.total.toLocaleString());
    setText("poll-vote-team1", "Vote " + team1);
    setText("poll-vote-team2", "Vote " + team2);

    const team1Bar = document.getElementById("poll-team1-bar");
    const team2Bar = document.getElementById("poll-team2-bar");
    if (team1Bar) team1Bar.style.width = pollBreakdown.team1Percent + "%";
    if (team2Bar) team2Bar.style.width = pollBreakdown.team2Percent + "%";
  }

  function renderChats() {
    renderHomeChatPreview();
    renderLiveChat();
    renderViewerCounts();
  }

  function renderHomeChatPreview() {
    const preview = document.getElementById("home-chat-preview");
    if (!preview) return;

    const messages = appState.chatMessages.slice(-3);
    if (!messages.length) {
      preview.innerHTML = '<div class="bg-slate-800 p-3 rounded text-slate-400">No fan messages yet. Start the conversation.</div>';
      return;
    }

    preview.innerHTML = messages.map(function(message) {
      return '<div class="bg-slate-800 p-2 rounded"><span class="text-orange-400">'
        + escapeHtml(message.username || "Fan")
        + ":</span> "
        + escapeHtml(message.content || "")
        + "</div>";
    }).join("");
    preview.scrollTop = preview.scrollHeight;
  }

  function renderLiveChat() {
    const container = document.getElementById("chat-messages");
    if (!container) return;

    const messages = appState.chatMessages.slice(-25);
    if (!messages.length) {
      container.innerHTML = '<div class="text-center text-slate-500 py-8"><span class="text-3xl mb-2 block">Chat</span><p>No messages yet. Be the first to chat!</p></div>';
      return;
    }

    container.innerHTML = messages.map(function(message) {
      return ""
        + '<div class="bg-slate-800 rounded-lg p-3">'
        + '<div class="flex items-center gap-2 mb-1"><span class="text-xs font-bold text-orange-400">'
        + escapeHtml(message.username || "Fan")
        + '</span><span class="text-xs text-slate-500">'
        + escapeHtml(formatClock(message.timestamp))
        + "</span></div>"
        + '<p class="text-sm">' + escapeHtml(message.content || "") + "</p>"
        + "</div>";
    }).join("");
    container.scrollTop = container.scrollHeight;
  }

  async function sendChatFromInput(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;

    const content = input.value.trim();
    if (!content) return;

    input.disabled = true;
    try {
      await fetchJson("/chat", {
        method: "POST",
        body: JSON.stringify({ username: fanAlias, content: content })
      });
      input.value = "";
      clearSystemNotice();
    } catch (error) {
      console.error("Failed to send chat message:", error);
      showSystemNotice("Chat is unavailable right now.");
    } finally {
      input.disabled = false;
      input.focus();
    }
  }

  async function submitPollVote(teamKey) {
    if (teamKey !== "team1" && teamKey !== "team2") return;

    togglePollButtons(true);
    setText("poll-feedback", "Submitting your vote...");
    try {
      const payload = await fetchJson("/poll/vote", {
        method: "POST",
        body: JSON.stringify({ team: teamKey })
      });

      appState.poll = hydrateState({ poll: payload.poll }).poll;
      if (payload.teams) {
        appState.score.team1 = payload.teams.team1 || appState.score.team1;
        appState.score.team2 = payload.teams.team2 || appState.score.team2;
      }

      renderPoll();
      renderPredictions();
      scheduleAiRefresh();
      clearSystemNotice();
      setText("poll-feedback", "Vote counted for " + (teamKey === "team1" ? appState.score.team1 : appState.score.team2) + ".");
    } catch (error) {
      console.error("Failed to submit vote:", error);
      setText("poll-feedback", "Unable to count your vote right now.");
      showSystemNotice("Poll voting is temporarily unavailable.");
    } finally {
      togglePollButtons(false);
    }
  }

  function renderViewerCounts() {
    const viewers = Number(appState.stream.viewerCount) || 0;
    const watching = appState.stream.status === "live"
      ? (viewers > 0 ? compactNumber(viewers) + " watching" : "Live now")
      : "Waiting for stream";
    const online = appState.stream.status === "live"
      ? (viewers > 0 ? compactNumber(viewers) + " online" : "Fans joining now")
      : "Offline";

    setText("viewer-count", watching);
    setText("home-chat-online", online);
    setText("quick-strip-viewers", "Streaming in 4K - " + watching);
  }

  function renderLiveExperience() {
    renderStreamPlayer();
    renderLiveScore();
    renderMatchDetails();
    renderLiveBallFeed();
    renderLiveAiCopilot();
  }

  function renderStreamPlayer() {
    const videoPlayer = document.getElementById("live-player");
    const framePlayer = document.getElementById("youtube-player");
    const emptyState = document.getElementById("no-stream-message");
    const mobileContainer = document.getElementById("mobile-stream-container");
    if (!videoPlayer || !framePlayer || !emptyState) return;

    const stream = appState.stream || {};
    const url = typeof stream.url === "string" ? stream.url.trim() : "";
    const status = stream.status || "offline";
    const platform = inferPlatform(url, stream.platform || "custom");
    const streamKey = [status, platform, url].join("|");
    if (streamKey === renderedStreamKey) return;
    renderedStreamKey = streamKey;

    // Hide all players
    videoPlayer.classList.add("hidden");
    framePlayer.classList.add("hidden");
    emptyState.classList.add("hidden");
    if (mobileContainer) mobileContainer.classList.add("hidden");
    framePlayer.removeAttribute("src");
    videoPlayer.pause();
    videoPlayer.removeAttribute("src");

    // Update UI elements
    const platformBadge = document.getElementById("stream-platform-badge");
    if (platformBadge) {
      platformBadge.textContent = platform.toUpperCase();
      platformBadge.className = status === "live" ? "bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold" : "bg-slate-600 text-white px-3 py-1 rounded-full text-xs font-bold";
    }
    
    const viewerCount = document.getElementById("viewer-count");
    if (viewerCount) {
      const count = Number(stream.viewerCount) || 0;
      viewerCount.textContent = count > 0 ? compactNumber(count) + " watching" : (status === "live" ? "Live now" : "0 watching");
    }

    if (status !== "live" || !url) {
      setStreamPlaceholder(
        status === "paused" ? "Stream paused" : "No stream available",
        status === "paused"
          ? "The admin paused the broadcast. Check back shortly."
          : "Admin can start the live stream from the dashboard."
      );
      return;
    }

    if (platform === "mobile" || url === "/stream/mobile") {
      loadMobileStream();
      return;
    }

    if (platform === "iframe") {
      framePlayer.src = url;
      framePlayer.classList.remove("hidden");
      return;
    }

    if (platform === "starsports" || url.indexOf("starsports") >= 0 || url.indexOf("no-ball") >= 0) {
      const streamId = extractNoBallId(url);
      if (streamId) {
        framePlayer.src = "https://no-ball.pages.dev/?id=" + streamId;
        framePlayer.classList.remove("hidden");
        return;
      }
      // Fallback to direct embedding
      framePlayer.src = url;
      framePlayer.classList.remove("hidden");
      return;
    }

    if (platform === "youtube") {
      const videoId = extractYouTubeId(url);
      if (videoId) {
        framePlayer.src = "https://www.youtube.com/embed/" + videoId + "?autoplay=1&mute=1";
        framePlayer.classList.remove("hidden");
        return;
      }
    }

    if (platform === "kick") {
      const username = url.indexOf("kick.com/") >= 0 ? url.split("kick.com/")[1].split("?")[0] : "";
      if (username) {
        framePlayer.src = "https://kick.com/embed/" + username;
        framePlayer.classList.remove("hidden");
        return;
      }
    }

    if (platform === "twitch") {
      const username = url.indexOf("twitch.tv/") >= 0 ? url.split("twitch.tv/")[1].split("?")[0] : "cricket";
      framePlayer.src = "https://player.twitch.tv/?channel=" + username + "&parent=" + window.location.hostname + "&autoplay=false";
      framePlayer.classList.remove("hidden");
      return;
    }

    if (platform === "streamtape" || url.indexOf("streamtape.com") >= 0) {
      const videoId = extractStreamId(url, "streamtape");
      if (videoId) {
        framePlayer.src = "https://streamtape.com/e/" + videoId;
        framePlayer.classList.remove("hidden");
        return;
      }
    }

    if (platform === "doodstream" || url.indexOf("doodstream.com") >= 0 || url.indexOf("dood.watch") >= 0) {
      const videoId = extractStreamId(url, "dood");
      if (videoId) {
        framePlayer.src = "https://doodstream.com/e/" + videoId;
        framePlayer.classList.remove("hidden");
        return;
      }
    }

    if (platform === "jioembed" || url.indexOf("jio") >= 0 || url.indexOf("hotstar") >= 0) {
      if (url.indexOf("no-ball.pages.dev") >= 0 || url.indexOf("sportify") >= 0 || url.indexOf("cricflux") >= 0) {
        framePlayer.src = url;
        framePlayer.classList.remove("hidden");
        return;
      }
      framePlayer.src = url || "https://no-ball.pages.dev/?id=jio-hotstar";
      framePlayer.classList.remove("hidden");
      return;
    }

    if (platform === "vidplay" || url.indexOf("vidplay") >= 0 || url.indexOf("vidplay") >= 0) {
      const videoId = extractStreamId(url, "vidplay");
      if (videoId) {
        framePlayer.src = "https://vidplay.com/e/" + videoId;
        framePlayer.classList.remove("hidden");
        return;
      }
    }

    if (platform === "video" || platform === "hls" || platform === "custom") {
      videoPlayer.src = url;
      videoPlayer.classList.remove("hidden");
      videoPlayer.play().catch(function() {});
      return;
    }

    setStreamPlaceholder("Stream unavailable", "Select a streaming platform from the admin panel.");
  }

  function extractStreamId(url, service) {
    if (!url) return null;
    try {
      if (service === "streamtape") {
        const match = url.match(/streamtape\.com\/[ve]\/([a-zA-Z0-9]+)/);
        return match ? match[1] : null;
      }
      if (service === "dood") {
        const match = url.match(/(?:doodstream|dood\.watch)\.com\/(?:e|d)\/([a-zA-Z0-9]+)/);
        return match ? match[1] : null;
      }
      if (service === "vidplay") {
        const match = url.match(/vidplay\.com\/(?:e|v)\/([a-zA-Z0-9]+)/);
        return match ? match[1] : null;
      }
    } catch (e) {
      return null;
    }
    return null;
  }

  function extractNoBallId(url) {
    if (!url) return null;
    try {
      const match = url.match(/[?&]id=([a-zA-Z0-9]+)/);
      return match ? match[1] : null;
    } catch (e) {
      return null;
    }
  }

  function loadMobileStream() {
    const framePlayer = document.getElementById("youtube-player");
    const videoPlayer = document.getElementById("live-player");
    const emptyState = document.getElementById("no-stream-message");
    const mobileContainer = document.getElementById("mobile-stream-container");
    
    // Hide other players, show mobile container
    if (emptyState) emptyState.classList.add("hidden");
    if (framePlayer) { framePlayer.classList.add("hidden"); framePlayer.src = ""; }
    if (videoPlayer) { videoPlayer.classList.add("hidden"); videoPlayer.pause(); }
    if (mobileContainer) mobileContainer.classList.remove("hidden");
    
    const img = document.getElementById("mobile-stream-img");
    const waiting = document.getElementById("mobile-stream-waiting");
    const statusEl = document.getElementById("mobile-stream-status");
    const fpsEl = document.getElementById("mobile-fps-counter");
    const resEl = document.getElementById("mobile-res-indicator");
    let lastTimestamp = 0;
    let frameCount = 0;
    let lastFpsTime = Date.now();
    let currentFps = 0;
    
    console.log("Mobile stream loader initialized");
    
    // Poll for frames
    async function pollForFrames() {
      try {
        const response = await fetch('/api/stream/frame/latest?' + Date.now());
        if (response.ok) {
          const data = await response.json();
          if (data.frame && data.timestamp > lastTimestamp) {
            lastTimestamp = data.timestamp;
            frameCount++;
            
            // Calculate FPS
            const now = Date.now();
            if (now - lastFpsTime >= 1000) {
              currentFps = frameCount;
              frameCount = 0;
              lastFpsTime = now;
              if (fpsEl) fpsEl.textContent = currentFps + ' fps';
            }
            
            if (img) {
              img.src = data.frame;
              img.classList.remove("hidden");
            }
            if (waiting) waiting.classList.add("hidden");
            if (statusEl) statusEl.textContent = "Live";
            if (resEl) resEl.textContent = data.quality || 'Medium';
          } else if (!data.frame && waiting) {
            if (statusEl) statusEl.textContent = "Waiting for stream...";
          }
        }
      } catch (e) {
        console.log('Polling error:', e);
        if (statusEl) statusEl.textContent = "Connection error";
      }
    }
    
    // Start polling
    pollForFrames();
    setInterval(pollForFrames, 100);
  }

  // Update mobile stream frame from SSE event
  function updateMobileStreamFrame(payload) {
    const img = document.getElementById("mobile-stream-img");
    const waiting = document.getElementById("mobile-stream-waiting");
    const statusEl = document.getElementById("mobile-stream-status");
    
    if (payload.frame && img) {
      img.src = payload.frame;
      img.classList.remove("hidden");
      if (waiting) waiting.classList.add("hidden");
      if (statusEl) statusEl.textContent = "Live";
    }
  }

  // Stream control functions
  window.retryStream = function() {
    const stream = appState.stream || {};
    renderStreamPlayer();
  };

  window.changeStreamQuality = function(quality) {
    console.log('Quality changed to:', quality);
  };

  window.toggleFullscreen = function() {
    const container = document.getElementById('video-container');
    if (!container) return;
    
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      container.requestFullscreen().catch(function(e) {
        console.log('Fullscreen error:', e);
      });
    }
  };

  window.togglePiP = function() {
    const videoPlayer = document.getElementById('live-player');
    const mobileImg = document.getElementById('mobile-stream-img');
    
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture();
    } else if (videoPlayer && !videoPlayer.classList.contains('hidden')) {
      videoPlayer.requestPictureInPicture().catch(function(e) {
        console.log('PiP error:', e);
      });
      } else if (mobileImg && !mobileImg.classList.contains('hidden')) {
      //List.contains('hidden For mobile stream, create a video element for PiP
      const video = document.createElement('video');
      video.src = document.getElementById('mobile-stream-img').src;
      video.muted = true;
      video.play().then(function() {
        video.requestPictureInPicture().catch(function(e) {
          console.log('Mobile PiP error:', e);
        });
      }).catch(function(e) {
        console.log('Mobile PiP play error:', e);
      });
    }
  };

  window.toggleMobileStreamMute = function() {
    const btn = document.getElementById('mobile-mute-btn');
    if (btn) {
      const isMuted = btn.textContent === '🔇';
      btn.textContent = isMuted ? '🔊' : '🔇';
    }
  };

  function setStreamPlaceholder(title, detail) {
    const emptyState = document.getElementById("no-stream-message");
    const mobileContainer = document.getElementById("mobile-stream-container");
    
    // Hide mobile container when showing placeholder
    if (mobileContainer) mobileContainer.classList.add("hidden");
    
    if (!emptyState) return;
    emptyState.classList.remove("hidden");
    emptyState.innerHTML = '<span class="text-6xl">TV</span><p class="text-slate-400 text-lg">'
      + escapeHtml(title)
      + '</p><p class="text-slate-500 text-sm">'
      + escapeHtml(detail)
      + '</p><div class="mt-4 flex gap-2"><button onclick="retryStream()" class="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm">🔄 Retry</button></div>';
  }

  function renderLiveScore() {
    const container = document.getElementById("live-score-display");
    if (!container) return;

    const score = appState.score;
    const oppositionScore = score.team2Score || appState.content.matchCenter.team2Score || "Yet to bat";
    const target = score.target || appState.content.matchCenter.target || "Target pending";

    container.innerHTML = ""
      + '<div class="bg-slate-800 rounded-xl p-4">'
      + '<div class="flex flex-col gap-3 mb-3 sm:flex-row sm:items-center sm:justify-between"><div class="flex min-w-0 items-center gap-3"><span>' + renderTeamBadge(score.team1, score.team1Flag || "T1", "team-badge--sm") + '</span><span class="font-semibold leading-tight ' + getTeamTextClass(score.team1) + '">' + escapeHtml(score.team1 || "Team 1") + '</span></div><span class="text-2xl font-bold text-green-400">' + escapeHtml(score.team1Score || "--") + "</span></div>"
      + '<div class="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between"><span class="text-slate-400">Overs: ' + escapeHtml(score.overs || "0.0") + '</span><span class="text-orange-400 font-semibold">RR: ' + escapeHtml(score.runRate || "0.00") + "</span></div>"
      + "</div>"
      + '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">'
      + '<div class="bg-slate-800 rounded-xl p-3"><p class="text-xs text-slate-400 mb-1">🏏 Batsmen</p><p class="font-semibold text-sm">' + escapeHtml(score.batsman || "Awaiting update") + "</p></div>"
      + '<div class="bg-slate-800 rounded-xl p-3"><p class="text-xs text-slate-400 mb-1">🎯 Bowler</p><p class="font-semibold text-sm">' + escapeHtml(score.bowler || "Awaiting update") + "</p></div>"
      + "</div>"
      + '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">'
      + '<div class="bg-slate-800 rounded-xl p-3"><p class="text-xs text-slate-400 mb-1">Opposition</p><p class="font-semibold text-sm">' + escapeHtml((score.team2 || "Team 2") + ": " + oppositionScore) + "</p></div>"
      + '<div class="bg-slate-800 rounded-xl p-3"><p class="text-xs text-slate-400 mb-1">🎯 Target</p><p class="font-semibold text-sm">' + escapeHtml(target) + "</p></div>"
      + "</div>"
      + (score.partnership ? '<div class="bg-slate-800 rounded-xl p-3"><p class="text-xs text-slate-400 mb-1">🤝 Partnership</p><p class="font-semibold text-sm text-purple-400">' + escapeHtml(score.partnership) + "</p></div>" : "")
      + (score.fow ? '<div class="bg-slate-800 rounded-xl p-3"><p class="text-xs text-slate-400 mb-1">📉 Fall of Wickets</p><p class="font-semibold text-sm text-red-400">' + escapeHtml(score.fow) + "</p></div>" : "")
      + '<div class="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">'
      + '<div class="bg-slate-800 rounded-lg p-2 text-center"><p class="text-[10px] text-slate-400">Extras</p><p class="font-bold text-sm">' + escapeHtml(score.extras || "0") + "</p></div>"
      + '<div class="bg-slate-800 rounded-lg p-2 text-center"><p class="text-[10px] text-slate-400">Req RR</p><p class="font-bold text-sm text-blue-400">' + escapeHtml(score.reqRR || "--") + "</p></div>"
      + '<div class="bg-slate-800 rounded-lg p-2 text-center"><p class="text-[10px] text-slate-400">PP</p><p class="font-bold text-sm text-purple-400">' + escapeHtml(score.pp || "--") + "</p></div>"
      + "</div>";
  }

  function renderMatchDetails() {
    const container = document.getElementById("match-details");
    if (!container) return;

    const score = appState.score;
    const details = [score.matchTitle, score.venue, score.format].filter(Boolean).join(" | ");
    const tossSummary = buildTossSummary(score);
    const team1XI = normalizeTeamList(score.team1XI);
    const team2XI = normalizeTeamList(score.team2XI);
    const lineupLabel = isPreMatchLineup(score, appState.ballFeed) ? "Probable XI" : "Playing XI";

    container.innerHTML = ""
      + '<div class="flex flex-col gap-4 bg-slate-800 rounded-xl p-4 sm:flex-row sm:items-center sm:justify-between">'
      + '<div class="text-center flex-1 min-w-0"><div class="mb-2 flex justify-center">' + renderTeamBadge(score.team1, score.team1Flag || "T1", "team-badge--lg") + '</div><span class="font-bold leading-tight break-words ' + getTeamTextClass(score.team1) + '">' + escapeHtml(score.team1 || "Team 1") + "</span></div>"
      + '<div class="text-center flex-1 min-w-0 order-first sm:order-none"><span class="text-sm text-slate-400">' + escapeHtml(details || "Live fixture") + '</span><span class="text-2xl font-bold block my-2 text-red-400">VS</span><span class="text-xs text-slate-500">Broadcast synced with admin dashboard</span></div>'
      + '<div class="text-center flex-1 min-w-0"><div class="mb-2 flex justify-center">' + renderTeamBadge(score.team2, score.team2Flag || "T2", "team-badge--lg") + '</div><span class="font-bold leading-tight break-words ' + getTeamTextClass(score.team2) + '">' + escapeHtml(score.team2 || "Team 2") + "</span></div>"
      + "</div>"
      + '<div class="grid gap-3 mt-4 md:grid-cols-3">'
      + '<div class="rounded-xl bg-slate-800 p-4"><div class="text-[11px] uppercase tracking-[0.2em] text-slate-500 mb-1">Toss</div><div class="text-sm text-slate-200">' + escapeHtml(tossSummary) + "</div></div>"
      + '<div class="rounded-xl bg-slate-800 p-4"><div class="text-[11px] uppercase tracking-[0.2em] text-slate-500 mb-1">Captains</div><div class="text-sm text-slate-200">' + escapeHtml((score.team1Captain || score.team1 || "Team 1") + ' / ' + (score.team2Captain || score.team2 || "Team 2")) + "</div></div>"
      + '<div class="rounded-xl bg-slate-800 p-4"><div class="text-[11px] uppercase tracking-[0.2em] text-slate-500 mb-1">Match Feed</div><div class="text-sm text-slate-200">Venue: ' + escapeHtml(score.venue || "Venue updates live") + '<br>Stream status: ' + escapeHtml(appState.stream.status || "offline") + "</div></div>"
      + "</div>"
      + renderLineupGrid(score.team1, score.team2, team1XI, team2XI, lineupLabel);
  }

  function renderLiveBallFeed() {
    const feed = Array.isArray(appState.ballFeed) ? appState.ballFeed : [];
    const currentOver = getCurrentOverFeed(feed);
    const recentBalls = feed.slice(-12);
    renderBallChipList("live-current-over", currentOver, "No over started yet.");
    renderBallChipList("live-ball-feed", recentBalls, "No ball-by-ball feed yet.");
  }

  function renderBallChipList(elementId, events, emptyMessage) {
    const container = document.getElementById(elementId);
    if (!container) return;

    if (!events.length) {
      container.innerHTML = '<div class="text-sm text-slate-500">' + escapeHtml(emptyMessage) + "</div>";
      return;
    }

    container.innerHTML = events.map(function(event) {
      const label = typeof event === "string" ? event : (event.label || event.type || ".");
      const toneClass = getBallToneClass(typeof event === "string" ? label : event.type, label);
      return '<span class="inline-flex min-w-10 justify-center rounded-full px-3 py-2 text-sm font-bold ' + toneClass + '">' + escapeHtml(label) + "</span>";
    }).join("");
  }

  function renderLiveAiCopilot() {
    const assistant = aiInsights && aiInsights.assistant ? aiInsights.assistant : null;
    setText("live-ai-urgency", assistant && assistant.urgency ? assistant.urgency : "Stand by");
    setText("live-ai-summary", aiInsights && aiInsights.summary ? aiInsights.summary : "Live AI guidance will appear after score updates start coming in.");
    setText("live-ai-trend", assistant && assistant.trendLabel ? assistant.trendLabel : "Awaiting feed");
    setText("live-ai-lastball", assistant && assistant.lastBall ? assistant.lastBall : "-");
    setText("live-ai-plan", assistant && assistant.smartCall ? assistant.smartCall : "Use the admin quick score buttons to activate live AI suggestions.");
    renderBallChipList("live-current-over", assistant && Array.isArray(assistant.currentOver) ? assistant.currentOver : getCurrentOverFeed(appState.ballFeed || []), "No over started yet.");
  }

  function renderAiBriefing() {
    const briefing = aiInsights && aiInsights.briefing ? aiInsights.briefing : null;
    const section = document.getElementById("ai-briefing-section");
    if (!section) return;

    if (!briefing) {
      setText("ai-summary", "AI briefing loading...");
      setText("ai-narrative", "Generating narrative...");
      return;
    }

    setText("ai-summary", briefing.summary || "No briefing available");
    setText("ai-narrative", briefing.narrative || "Generating narrative...");
    setText("ai-phase", briefing.phase || "-");
    setText("ai-momentum", briefing.momentum || "-");
    setText("ai-projected", briefing.projected || "-");
    setText("ai-pressure", briefing.pressure || "-");
    setText("ai-range", briefing.projectionRange || "-");
    setText("ai-chaseable", briefing.chaseable || "-");
    setText("ai-required-rr", briefing.requiredRR || "-");
    setText("ai-player-name", briefing.playerSpotlight && briefing.playerSpotlight.name ? briefing.playerSpotlight.name : "-");
    setText("ai-player-impact", briefing.playerSpotlight && briefing.playerSpotlight.impact ? briefing.playerSpotlight.impact : "-");
    setText("ai-player-form", briefing.playerSpotlight && briefing.playerSpotlight.form ? briefing.playerSpotlight.form : "-");
    setText("ai-turning-point", briefing.turningPoint || "-");
    setText("ai-batting", briefing.battingStrategy || "-");
    setText("ai-bowling", briefing.bowlingCounter || "-");

    const gameChangers = briefing.gameChangers && Array.isArray(briefing.gameChangers) ? briefing.gameChangers : [];
    const gcContainer = document.getElementById("ai-game-changers");
    if (gcContainer) {
      gcContainer.innerHTML = gameChangers.length > 0 
        ? gameChangers.map(function(player) { return '<span class="px-3 py-1 bg-slate-700 rounded-full text-sm">' + escapeHtml(player) + "</span>"; }).join("")
        : '<span class="text-slate-500 text-sm">No game changers identified</span>';
    }

    const signals = briefing.keyInsights && Array.isArray(briefing.keyInsights) ? briefing.keyInsights : [];
    const signalsContainer = document.getElementById("ai-signals");
    if (signalsContainer) {
      signalsContainer.innerHTML = signals.length > 0
        ? signals.map(function(sig) { return "<li>" + escapeHtml(sig) + "</li>"; }).join("")
        : "<li class='text-slate-500'>-</li>";
    }

    const watchouts = briefing.watchouts && Array.isArray(briefing.watchouts) ? briefing.watchouts : [];
    const watchoutsContainer = document.getElementById("ai-watchouts");
    if (watchoutsContainer) {
      watchoutsContainer.innerHTML = watchouts.length > 0
        ? watchouts.map(function(w) { return "<li>" + escapeHtml(w) + "</li>"; }).join("")
        : "<li class='text-slate-500'>-</li>";
    }

    if (briefing.timestamp) {
      setText("ai-timestamp", new Date(briefing.timestamp).toLocaleTimeString());
    }
  }

  function getCurrentOverFeed(feed) {
    const items = Array.isArray(feed) ? feed : [];
    const over = [];
    let legalCount = 0;
    for (let index = items.length - 1; index >= 0; index -= 1) {
      const event = items[index];
      over.unshift(event);
      if (event.legal) {
        legalCount += 1;
        if (legalCount >= 6) break;
      }
    }
    return over;
  }

  function getBallToneClass(type, label) {
    const normalizedType = String(type || label || "").toLowerCase();
    const normalizedLabel = String(label || "").toLowerCase();
    if (normalizedType === "wicket" || normalizedLabel === "w") return "bg-rose-500/20 text-rose-200 border border-rose-500/30";
    if (normalizedType === "six" || normalizedLabel === "6") return "bg-orange-500/20 text-orange-200 border border-orange-500/30";
    if (normalizedType === "four" || normalizedLabel === "4" || normalizedType === "boundary") return "bg-emerald-500/20 text-emerald-200 border border-emerald-500/30";
    if (normalizedType === "wide" || normalizedType === "noball" || normalizedLabel === "wd" || normalizedLabel === "nb") return "bg-sky-500/20 text-sky-200 border border-sky-500/30";
    return "bg-slate-800 text-slate-200 border border-slate-700";
  }

  function renderTimeline() {
    const container = document.getElementById("timeline-live-list");
    if (!container) return;

    const timelineEvents = Array.isArray(appState.timelineEvents) ? appState.timelineEvents.slice(0, 8) : [];
    if (!timelineEvents.length) {
      container.innerHTML = '<div class="rounded-xl border border-dashed border-slate-700 bg-slate-900/60 p-4 text-sm text-slate-400">Key moments will appear here as the admin publishes live match events.</div>';
      return;
    }

    container.innerHTML = timelineEvents.map(function(event) {
      const theme = getTimelineTheme(event.type);
      const metaParts = [event.over ? "Over " + event.over : "", formatClock(event.timestamp)].filter(Boolean);

      return ""
        + '<div class="rounded-xl border border-slate-700 bg-slate-900/70 p-4">'
        + '<div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-2">'
        + '<div><div class="flex items-center gap-2 flex-wrap"><span class="inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold tracking-[0.2em] ' + theme.badge + '">' + escapeHtml(event.badge || event.type || "UPDATE") + '</span><h5 class="font-semibold text-white">' + escapeHtml(event.title || "Match event") + "</h5></div></div>"
        + '<span class="text-xs text-slate-500 whitespace-nowrap">' + escapeHtml(metaParts.join(" | ")) + "</span>"
        + "</div>"
        + '<p class="text-sm ' + theme.text + '">' + escapeHtml(event.detail || "Live update from the match centre.") + "</p>"
        + "</div>";
    }).join("");
  }

  function getTimelineTheme(type) {
    switch (String(type || "").toLowerCase()) {
      case "boundary":
        return { badge: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20", text: "text-emerald-100" };
      case "wicket":
        return { badge: "bg-rose-500/15 text-rose-300 border border-rose-500/20", text: "text-rose-100" };
      case "milestone":
        return { badge: "bg-amber-500/15 text-amber-300 border border-amber-500/20", text: "text-amber-50" };
      case "review":
        return { badge: "bg-sky-500/15 text-sky-300 border border-sky-500/20", text: "text-sky-100" };
      case "alert":
        return { badge: "bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/20", text: "text-fuchsia-100" };
      default:
        return { badge: "bg-slate-700 text-slate-200 border border-slate-600", text: "text-slate-200" };
    }
  }

  function renderStats() {
    const score = appState.score;
    const stats = appState.content.stats || FALLBACK_STATE.content.stats;
    const scoreBreakdown = parseScore(score.team1Score);
    const oppositionBreakdown = parseScore(score.team2Score || appState.content.matchCenter.team2Score || "0/0");
    const totalRuns = Math.max(scoreBreakdown.runs + oppositionBreakdown.runs, 1);
    const team1Share = Math.max(5, Math.min(100, Math.round((scoreBreakdown.runs / totalRuns) * 100) || 50));
    const team2Share = Math.max(5, Math.min(100, 100 - team1Share));

    setText("team1-stat-name", score.team1 || "Team 1");
    setText("team1-stat-val", score.team1Score || "--");
    setText("team2-stat-name", score.team2 || "Team 2");
    setText("team2-stat-val", score.team2Score || appState.content.matchCenter.team2Score || "--");

    const team1Bar = document.getElementById("team1-stat-bar");
    const team2Bar = document.getElementById("team2-stat-bar");
    if (team1Bar) team1Bar.style.width = team1Share + "%";
    if (team2Bar) team2Bar.style.width = team2Share + "%";

    setText("stats-highest-label", stats.highestScore.label || FALLBACK_STATE.content.stats.highestScore.label);
    setText("stats-highest-value", stats.highestScore.value || FALLBACK_STATE.content.stats.highestScore.value);
    setText("stats-highest-subtitle", stats.highestScore.subtitle || FALLBACK_STATE.content.stats.highestScore.subtitle);
    setText("stats-bowling-label", stats.bestBowling.label || FALLBACK_STATE.content.stats.bestBowling.label);
    setText("stats-bowling-value", stats.bestBowling.value || FALLBACK_STATE.content.stats.bestBowling.value);
    setText("stats-bowling-subtitle", stats.bestBowling.subtitle || FALLBACK_STATE.content.stats.bestBowling.subtitle);
    setText("stats-momentum-title", stats.momentum.title || FALLBACK_STATE.content.stats.momentum.title);
    setText("stats-momentum-label", stats.momentum.label || FALLBACK_STATE.content.stats.momentum.label);

    const momentumBar = document.getElementById("stats-momentum-bar");
    if (momentumBar) momentumBar.style.width = clampPercent(stats.momentum.percent || 0) + "%";

    const metricsContainer = document.getElementById("stats-key-metrics");
    if (metricsContainer) {
      const metrics = Array.isArray(stats.keyMetrics) ? stats.keyMetrics : [];
      metricsContainer.innerHTML = metrics.map(function(metric) {
        return '<div class="flex justify-between"><span class="text-slate-400">' + escapeHtml(metric.label || "Metric") + '</span><span class="font-bold ' + escapeHtml(getMetricToneClass(metric.tone)) + '">' + escapeHtml(metric.value || "0") + "</span></div>";
      }).join("") || '<div class="text-sm text-slate-400">No stats configured yet.</div>';
    }
  }

  function renderPredictions() {
    const score = appState.score;
    const predictions = appState.content.predictions || FALLBACK_STATE.content.predictions;
    const pollBreakdown = getPollBreakdown();
    const team1Percent = clampPercent(firstFinite([
      aiInsights && aiInsights.prediction ? aiInsights.prediction.fanConfidenceTeam1 : null,
      pollBreakdown.team1Percent
    ], 50));
    const team2Percent = 100 - team1Percent;
    const leader = team1Percent === team2Percent ? null : (team1Percent > team2Percent ? "team1" : "team2");
    const leaderName = leader === "team1" ? (score.team1 || "Team 1") : leader === "team2" ? (score.team2 || "Team 2") : "Match Balanced";
    const leaderFlag = leader === "team1" ? (score.team1Flag || "") : leader === "team2" ? (score.team2Flag || "") : "";
    const projectedLow = firstFinite([aiInsights && aiInsights.prediction ? aiInsights.prediction.projectedLow : null], null);
    const projectedHigh = firstFinite([aiInsights && aiInsights.prediction ? aiInsights.prediction.projectedHigh : null], null);
    const projectedValue = projectedLow !== null && projectedHigh !== null
      ? projectedLow + "-" + projectedHigh
      : String(firstFinite([
          aiInsights && aiInsights.prediction ? aiInsights.prediction.projectedTotal : null,
          numericValue(appState.content.matchCenter.projectedTotal)
        ], "--"));
    const scoreLines = Array.isArray(predictions.scoreLines) && predictions.scoreLines.length ? predictions.scoreLines : FALLBACK_STATE.content.predictions.scoreLines;
    const resultValue = scoreLines[2] && scoreLines[2].value
      ? scoreLines[2].value
      : leader ? abbreviateTeam(leaderName) + " with a " + Math.abs(team1Percent - team2Percent) + "% fan edge" : "Too close to call";
    const expert = predictions.expert || FALLBACK_STATE.content.predictions.expert;

    setText("prediction-team1-name", score.team1 || "Team 1");
    setText("prediction-team1-percent", team1Percent + "%");
    setText("prediction-team2-name", score.team2 || "Team 2");
    setText("prediction-team2-percent", team2Percent + "%");
    setText("prediction-expert-title", expert.title || FALLBACK_STATE.content.predictions.expert.title);
    setText("prediction-expert-team", expert.winner || (leader ? (leaderName + (leaderFlag ? " " + leaderFlag : "")) : "Match Balanced"));
    setText("prediction-expert-copy", expert.subtitle || (leader ? "Most Likely Winner" : "Win probability is split"));
    setText("prediction-expert-note", expert.note || (aiInsights && aiInsights.summary ? aiInsights.summary : "Predictions refresh automatically from the live score, fan poll, and AI engine."));
    setText("prediction-total-label", (scoreLines[0] && scoreLines[0].label ? scoreLines[0].label : ((score.team1 || "Team 1") + " Total")) + ":");
    setText("prediction-total-value", scoreLines[0] && scoreLines[0].value ? scoreLines[0].value : projectedValue);
    setText("prediction-target-label", (scoreLines[1] && scoreLines[1].label ? scoreLines[1].label : (abbreviateTeam(score.team2 || "Team 2") + " Target")) + ":");
    setText("prediction-target-value", scoreLines[1] && scoreLines[1].value ? scoreLines[1].value : (score.target || appState.content.matchCenter.target || "Awaiting chase scenario"));
    setText("prediction-result-value", resultValue);

    const team1Bar = document.getElementById("prediction-team1-bar");
    const team2Bar = document.getElementById("prediction-team2-bar");
    if (team1Bar) team1Bar.style.width = team1Percent + "%";
    if (team2Bar) team2Bar.style.width = team2Percent + "%";

    renderPredictionPlayerForm();
  }

  function renderPredictionPlayerForm() {
    const container = document.getElementById("prediction-player-form");
    if (!container) return;

    const score = appState.score;
    const configuredCards = Array.isArray(appState.content.predictions.playerForm) && appState.content.predictions.playerForm.length
      ? appState.content.predictions.playerForm
      : [
          {
            name: extractPrimaryName(score.batsman || "Current batter"),
            status: "Batting Pulse",
            tone: "green",
            detail: score.batsman || "Waiting for batting data"
          },
          {
            name: extractPrimaryName(score.bowler || "Current bowler"),
            status: "Bowling Watch",
            tone: "blue",
            detail: score.bowler || "Waiting for bowling data"
          },
          {
            name: "AI Next Over",
            status: "Tactical Note",
            tone: "orange",
            detail: aiInsights && aiInsights.tactical ? aiInsights.tactical.nextOverPlan : "Publish live score updates to unlock the next-over plan."
          }
        ];

    container.innerHTML = configuredCards.map(function(card) {
      return ""
        + '<div class="bg-slate-800 rounded-lg p-3">'
        + '<div class="flex justify-between mb-1"><span class="font-semibold">' + escapeHtml(card.name || card.title || "Player") + '</span><span class="' + escapeHtml(getToneTextClass(card.tone)) + '">' + escapeHtml(card.status || "Update") + "</span></div>"
        + '<div class="text-xs text-slate-400">' + escapeHtml(card.detail) + "</div>"
        + "</div>";
    }).join("");
  }

  function parseFirstNumber(value, fallback) {
    const match = String(value || "").match(/-?\d+(?:\.\d+)?/);
    if (!match) return fallback;
    const numeric = Number(match[0]);
    return Number.isFinite(numeric) ? numeric : fallback;
  }

  function parseTargetValue(value) {
    const text = String(value || "").trim();
    if (!text) return null;
    if (/^\d+(?:\.\d+)?$/.test(text)) return Number.parseFloat(text);
    const explicitMatch = text.match(/\b(\d{2,3})\b/);
    if (explicitMatch) return Number.parseInt(explicitMatch[1], 10);
    return null;
  }

  function parseCricketOvers(value) {
    const text = String(value || "").trim();
    const match = text.match(/^(\d+)(?:\.(\d))?/);
    if (!match) {
      return { overs: 0, balls: 0, completed: 0, ballsTotal: 0 };
    }

    const overs = Number.parseInt(match[1], 10) || 0;
    const balls = Math.min(5, Number.parseInt(match[2] || "0", 10) || 0);
    return {
      overs: overs,
      balls: balls,
      completed: overs + (balls / 6),
      ballsTotal: (overs * 6) + balls
    };
  }

  function formatBallsAsOvers(balls) {
    const safeBalls = Math.max(0, Math.round(Number(balls) || 0));
    return Math.floor(safeBalls / 6) + "." + (safeBalls % 6);
  }

  function formatRate(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric.toFixed(2) : "--";
  }

  function getScenarioTotalOvers(score) {
    return firstFinite([
      numericValue(score && score.totalOvers),
      parseFirstNumber(score && score.totalOvers, null)
    ], inferInningsLength(score ? score.matchTitle : "", score ? score.overs : ""));
  }

  function getScenarioSeedValues() {
    const score = appState.score || {};
    const parsedScore = parseScore(score.team1Score);
    const totalOvers = getScenarioTotalOvers(score);
    const target = parseTargetValue(score.target);
    const runRate = Number.parseFloat(String(score.runRate || "0")) || 0;

    const aggressionSeed = target !== null ? (runRate >= 9 ? 64 : 56) : (runRate >= 8 ? 58 : 46);
    const pressureSeed = target !== null ? (parsedScore.wickets >= 5 ? 60 : 42) : (parsedScore.wickets >= 4 ? 36 : 26);

    return {
      score: score.team1Score || (parsedScore.runs || parsedScore.wickets ? parsedScore.runs + "/" + parsedScore.wickets : "0/0"),
      overs: score.overs || "0.0",
      wickets: String(Math.max(0, parsedScore.wickets || 0)),
      target: target !== null ? String(target) : "",
      totalOvers: String(totalOvers),
      aggression: String(clampPercent(aggressionSeed)),
      pressure: String(clampPercent(pressureSeed))
    };
  }

  function setScenarioField(id, value) {
    const element = document.getElementById(id);
    if (!element) return;
    element.value = value;
    element.dataset.scenarioDirty = "false";
  }

  function syncScenarioFieldsFromLive() {
    const seed = getScenarioSeedValues();
    setScenarioField("scenario-score", seed.score);
    setScenarioField("scenario-overs", seed.overs);
    setScenarioField("scenario-wickets", seed.wickets);
    setScenarioField("scenario-target", seed.target);
    setScenarioField("scenario-total-overs", seed.totalOvers);
    setScenarioField("scenario-aggression", seed.aggression);
    setScenarioField("scenario-pressure", seed.pressure);
  }

  function updateScenarioLab() {
    scenarioAutoSeed = false;
    renderScenarioLab();
  }

  function resetScenarioLab() {
    scenarioAutoSeed = true;
    ["scenario-score", "scenario-overs", "scenario-wickets", "scenario-target", "scenario-total-overs", "scenario-aggression", "scenario-pressure"].forEach(function(id) {
      const element = document.getElementById(id);
      if (element) element.dataset.scenarioDirty = "false";
    });
    renderScenarioLab();
    showToast("Scenario lab reset to live data", "success");
  }

  function applyScenarioPreset(mode) {
    scenarioAutoSeed = false;
    const presets = {
      safe: { aggression: 28, pressure: 22, wickets: 2 },
      balanced: { aggression: 54, pressure: 36, wickets: 3 },
      attack: { aggression: 78, pressure: 48, wickets: 4 },
      defend: { aggression: 42, pressure: 18, wickets: 5 }
    };
    const preset = presets[String(mode || "balanced").toLowerCase()] || presets.balanced;
    [
      ["scenario-wickets", preset.wickets],
      ["scenario-aggression", preset.aggression],
      ["scenario-pressure", preset.pressure]
    ].forEach(function(pair) {
      const element = document.getElementById(pair[0]);
      if (element) {
        element.value = String(pair[1]);
        element.dataset.scenarioDirty = "true";
      }
    });
    renderScenarioLab();
  }

  function buildScenarioModel() {
    const score = appState.score || {};
    const currentScoreInput = document.getElementById("scenario-score");
    const oversInput = document.getElementById("scenario-overs");
    const wicketsInput = document.getElementById("scenario-wickets");
    const targetInput = document.getElementById("scenario-target");
    const totalOversInput = document.getElementById("scenario-total-overs");
    const aggressionInput = document.getElementById("scenario-aggression");
    const pressureInput = document.getElementById("scenario-pressure");

    const currentScoreText = String(currentScoreInput && currentScoreInput.value ? currentScoreInput.value : score.team1Score || "0/0").trim();
    const parsedScore = parseScore(currentScoreText || "0/0");
    const oversText = String(oversInput && oversInput.value ? oversInput.value : score.overs || "0.0").trim();
    const overs = parseCricketOvers(oversText);
    const wicketsValue = parseFirstNumber(wicketsInput && wicketsInput.value, parsedScore.wickets);
    const totalOversValue = Math.max(1, Math.round(parseFirstNumber(totalOversInput && totalOversInput.value, getScenarioTotalOvers(score))));
    const targetValue = targetInput ? parseTargetValue(targetInput.value) : parseTargetValue(score.target);
    const aggression = clampPercent(parseFirstNumber(aggressionInput && aggressionInput.value, 54));
    const pressure = clampPercent(parseFirstNumber(pressureInput && pressureInput.value, 36));

    const currentRuns = Math.max(0, parsedScore.runs || 0);
    const completedBalls = overs.ballsTotal;
    const totalBalls = totalOversValue * 6;
    const ballsRemaining = Math.max(0, totalBalls - completedBalls);
    const oversRemaining = ballsRemaining / 6;
    const completedOvers = completedBalls > 0 ? (completedBalls / 6) : overs.completed;
    const currentRunRate = completedOvers > 0 ? currentRuns / completedOvers : firstFinite([numericValue(score.runRate)], 0);
    const wicketsLost = Math.max(0, Math.min(10, Number(wicketsValue) || 0));
    const wicketsInHand = Math.max(0, 10 - wicketsLost);
    const pressureLoad = pressure + Math.max(0, 5 - wicketsInHand) * 4;
    const aggressionFactor = 1 + ((aggression - 50) / 180);
    const stressFactor = 1 + (pressureLoad / 220);
    const wicketFactor = 1 + (Math.max(0, 7 - wicketsInHand) / 18);

    const safeRate = Math.max(0.5, (currentRunRate * (0.82 * aggressionFactor)) / stressFactor - ((10 - wicketsInHand) * 0.05));
    const balancedRate = Math.max(0.5, (currentRunRate * aggressionFactor) / Math.max(0.85, stressFactor) - ((10 - wicketsInHand) * 0.03));
    const attackRate = Math.max(0.5, (currentRunRate * (1.12 + (aggression / 160))) / Math.max(0.8, stressFactor * 0.92) / Math.max(0.85, wicketFactor) + (aggression / 28) - ((10 - wicketsInHand) * 0.02));

    const safeProjected = Math.round(currentRuns + (oversRemaining * safeRate));
    const balancedProjected = Math.round(currentRuns + (oversRemaining * balancedRate));
    const attackProjected = Math.round(currentRuns + (oversRemaining * attackRate));
    const parReference = targetValue !== null
      ? targetValue
      : firstFinite([
          aiInsights && aiInsights.prediction ? aiInsights.prediction.projectedTotal : null,
          numericValue(appState.content.matchCenter.projectedTotal)
        ], Math.max(balancedProjected, currentRuns));

    const requiredRuns = targetValue !== null ? Math.max(0, targetValue - currentRuns) : 0;
    const requiredRR = targetValue !== null
      ? (oversRemaining > 0 ? requiredRuns / oversRemaining : requiredRuns)
      : Math.max(0, parReference - currentRuns);
    const rateMargin = targetValue !== null ? (balancedRate - requiredRR) : (balancedProjected - parReference);

    let chance = targetValue !== null
      ? 50 + (rateMargin * 16) + (wicketsInHand * 1.8) + (aggression * 0.08) - (pressureLoad * 0.18)
      : 50 + (rateMargin * 0.9) + (wicketsInHand * 1.2) + (aggression * 0.06) - (pressureLoad * 0.12);

    if (targetValue !== null && currentRuns >= targetValue) chance = 100;
    if (targetValue !== null && oversRemaining <= 0) chance = currentRuns >= targetValue ? 100 : 0;

    const chancePercent = clampPercent(Math.round(chance));
    const modeLabel = aggression >= 72 ? "ATTACK" : pressureLoad >= 62 ? "UNDER PRESSURE" : wicketsInHand <= 4 ? "WICKET SAVING" : "BALANCED";
    const phaseLabel = getMatchPhaseLabel(score, Date.parse(score.matchDateTime || ""), currentRuns > 0 || (appState.ballFeed || []).length > 0);
    const modeState = targetValue !== null ? "CHASE MODE" : "PAR BUILD";

    const statusLine = targetValue !== null
      ? (currentRuns >= targetValue
        ? "Target already reached. Keep it calm."
        : requiredRR > balancedRate
          ? "Need a sharper finish than the balanced plan."
          : "Balanced tempo keeps the chase alive.")
      : (balancedProjected >= parReference
        ? "Balanced tempo is projecting above par."
        : "The lab wants a late acceleration to reach par.");

    const summaryLine = targetValue !== null
      ? "Need " + requiredRuns + " from " + formatBallsAsOvers(ballsRemaining) + " overs at " + formatRate(requiredRR) + " RR."
      : "Projected finish " + safeProjected + "-" + attackProjected + " depending on the risk dial.";

    const planLine = targetValue !== null
      ? (currentRuns >= targetValue
        ? "Target locked. Focus on strike rotation and wickets in hand."
        : pressureLoad > 55
          ? "Protect wickets and pick one over to target."
          : "You can keep a balanced chase path without over-correcting.")
      : (attackProjected > parReference + 15
        ? "This setup is beating par if the finish stays clean."
        : "A single power over could move the projection into strong territory.");

    const seriesPoints = 6;
    const labels = Array.from({ length: seriesPoints }, function(_, index) {
      if (index === 0) return "Now";
      if (index === seriesPoints - 1) return "Finish";
      const segmentBalls = Math.round((ballsRemaining * index) / (seriesPoints - 1));
      return "+" + formatBallsAsOvers(segmentBalls) + " ov";
    });

    function buildSeries(rate) {
      return Array.from({ length: seriesPoints }, function(_, index) {
        const fraction = index / (seriesPoints - 1);
        return Math.round(currentRuns + (rate * oversRemaining * fraction));
      });
    }

    return {
      currentRuns: currentRuns,
      wicketsLost: wicketsLost,
      wicketsInHand: wicketsInHand,
      currentOversText: oversText,
      currentRunRate: currentRunRate,
      oversRemaining: oversRemaining,
      ballsRemaining: ballsRemaining,
      totalOvers: totalOversValue,
      targetValue: targetValue,
      aggression: aggression,
      pressure: pressureLoad,
      phaseLabel: phaseLabel,
      modeLabel: modeLabel,
      modeState: modeState,
      chancePercent: chancePercent,
      statusLine: statusLine,
      summaryLine: summaryLine,
      planLine: planLine,
      requiredRR: requiredRR,
      safeProjected: safeProjected,
      balancedProjected: balancedProjected,
      attackProjected: attackProjected,
      parReference: parReference,
      safeSeries: buildSeries(safeRate),
      balancedSeries: buildSeries(balancedRate),
      attackSeries: buildSeries(attackRate),
      referenceSeries: Array.from({ length: seriesPoints }, function() {
        return parReference;
      }),
      chartLabels: labels
    };
  }

  function renderScenarioLab() {
    const scenarioPage = document.getElementById("scenario-page");
    if (!scenarioPage) return;

    if (scenarioAutoSeed) {
      syncScenarioFieldsFromLive();
    }

    const model = buildScenarioModel();
    const targetActive = model.targetValue !== null;

    setText("scenario-title", targetActive ? "Chase Scenario Lab" : "Par Scenario Lab");
    setText("scenario-subtitle", targetActive
      ? "Stress-test the chase, wickets in hand, and final-overs pressure."
      : "Model the innings finish and compare it against the projected par line.");
    setText("scenario-mode", model.modeState + " · " + model.modeLabel);
    setText("scenario-phase", model.phaseLabel);
    setText("scenario-current", model.currentRuns + "/" + model.wicketsLost + " · " + model.currentOversText);
    setText("scenario-overs-left", formatBallsAsOvers(model.ballsRemaining) + " overs left");
    setText("scenario-required-label", targetActive ? "Required RR" : "Par RR");
    setText("scenario-required-rr", targetActive ? formatRate(model.requiredRR) : formatRate(model.parReference / Math.max(1, model.totalOvers)));
    setText("scenario-projected-total", String(model.balancedProjected));
    setText("scenario-projected-range", model.safeProjected + " - " + model.attackProjected);
    setText("scenario-chance", model.chancePercent + "%");
    setText("scenario-chance-label", targetActive ? "Win chance" : "Par-beat chance");
    setText("scenario-target-line", targetActive ? ("Target " + model.targetValue) : ("Par " + model.parReference));
    setText("scenario-safe-total", String(model.safeProjected));
    setText("scenario-balanced-total", String(model.balancedProjected));
    setText("scenario-attack-total", String(model.attackProjected));
    setText("scenario-summary", model.summaryLine);
    setText("scenario-status", model.modeState);
    setText("scenario-plan", model.planLine);
    setText("scenario-ai-note", aiInsights && aiInsights.summary ? aiInsights.summary : model.statusLine);
    setText("scenario-aggression-value", String(model.aggression));
    setText("scenario-pressure-value", String(model.pressure));
    setText("scenario-current-rate", "RR " + formatRate(model.currentRunRate));
    setText("scenario-current-rate-readout", formatRate(model.currentRunRate));

    const chartElement = document.getElementById("scenarioChart");
    const canRenderChart = scenarioChart || (!scenarioPage.classList.contains("hidden") && chartElement);
    if (!canRenderChart || !chartElement) return;

    const datasets = [
      {
        label: "Safe",
        data: model.safeSeries,
        borderColor: "#22c55e",
        backgroundColor: "rgba(34, 197, 94, 0.12)",
        fill: false,
        borderWidth: 2,
        tension: 0.32,
        pointRadius: 0
      },
      {
        label: "Balanced",
        data: model.balancedSeries,
        borderColor: "#f97316",
        backgroundColor: "rgba(249, 115, 22, 0.12)",
        fill: false,
        borderWidth: 2,
        tension: 0.32,
        pointRadius: 0
      },
      {
        label: "Attack",
        data: model.attackSeries,
        borderColor: "#38bdf8",
        backgroundColor: "rgba(56, 189, 248, 0.12)",
        fill: false,
        borderWidth: 2,
        tension: 0.32,
        pointRadius: 0
      },
      {
        label: targetActive ? "Target" : "Par line",
        data: model.referenceSeries,
        borderColor: "#f43f5e",
        backgroundColor: "rgba(244, 63, 94, 0.08)",
        fill: false,
        borderDash: [6, 6],
        borderWidth: 2,
        tension: 0,
        pointRadius: 0
      }
    ];

    if (!scenarioChart) {
      scenarioChart = new Chart(chartElement.getContext("2d"), {
        type: "line",
        data: {
          labels: model.chartLabels,
          datasets: datasets
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: {
                color: "#cbd5e1",
                usePointStyle: true,
                pointStyle: "line"
              }
            }
          },
          scales: {
            x: {
              ticks: { color: "#94a3b8" },
              grid: { color: "rgba(148, 163, 184, 0.06)" }
            },
            y: {
              ticks: { color: "#94a3b8" },
              grid: { color: "rgba(148, 163, 184, 0.1)" }
            }
          }
        }
      });
      return;
    }

    scenarioChart.data.labels = model.chartLabels;
    scenarioChart.data.datasets.forEach(function(dataset, index) {
      dataset.data = datasets[index].data;
      dataset.borderColor = datasets[index].borderColor;
      dataset.backgroundColor = datasets[index].backgroundColor;
      dataset.borderDash = datasets[index].borderDash;
    });
    scenarioChart.update();
  }

  window.updateScenarioLab = updateScenarioLab;
  window.resetScenarioLab = resetScenarioLab;
  window.applyScenarioPreset = applyScenarioPreset;
  window.renderScenarioLab = renderScenarioLab;

  function getPressureToneClass(tone) {
    switch (String(tone || "").toLowerCase()) {
      case "green":
      case "emerald":
        return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20";
      case "orange":
      case "amber":
        return "bg-orange-500/15 text-orange-300 border border-orange-500/20";
      case "rose":
      case "red":
        return "bg-rose-500/15 text-rose-300 border border-rose-500/20";
      case "blue":
      case "sky":
        return "bg-sky-500/15 text-sky-300 border border-sky-500/20";
      default:
        return "bg-slate-700 text-slate-200 border border-slate-600";
    }
  }

  function getPressureLaneToneClass(id) {
    switch (String(id || "").toLowerCase()) {
      case "stabilize":
        return getPressureToneClass("emerald");
      case "launch":
        return getPressureToneClass("sky");
      default:
        return getPressureToneClass("orange");
    }
  }

  function renderPressureCenter() {
    const page = document.getElementById("pressure-page");
    if (!page) return;

    const data = pressureCenterData;
    const lanesContainer = document.getElementById("pressure-lanes");
    const leversContainer = document.getElementById("pressure-levers");
    const windowsContainer = document.getElementById("pressure-windows");

    if (!data) {
      setText("pressure-title", "Pressure Center");
      setText("pressure-summary", "The live pressure engine is syncing with the match feed.");
      setText("pressure-mode", "SYNCING");
      setText("pressure-phase", "Awaiting live state");
      setText("pressure-control-span", "Loading windows");
      setText("pressure-index", "--");
      setText("pressure-index-note", "Pressure score will appear here");
      setText("pressure-win", "--");
      setText("pressure-win-note", "Win swing will update from the live model");
      setText("pressure-benchmark", "--");
      setText("pressure-benchmark-note", "Current rate vs benchmark");
      setText("pressure-wickets", "--");
      setText("pressure-wickets-note", "Wickets and overs remaining");
      setText("pressure-focus", "Waiting for the next-over plan from the pressure engine.");
      setText("pressure-trend", "- ");
      setText("pressure-urgency", "- ");
      setText("pressure-recent", "No recent balls yet");
      if (lanesContainer) lanesContainer.innerHTML = '<div class="rounded-xl border border-dashed border-slate-700 bg-slate-900/60 p-4 text-sm text-slate-400">Pressure lanes will appear as soon as live score context is available.</div>';
      if (leversContainer) leversContainer.innerHTML = "";
      if (windowsContainer) windowsContainer.innerHTML = '<div class="rounded-xl border border-dashed border-slate-700 bg-slate-900/60 p-4 text-sm text-slate-400">Pressure windows are loading.</div>';
      return;
    }

    const paceMargin = Number(data.pace && data.pace.margin);
    const paceMarginLabel = Number.isFinite(paceMargin)
      ? ((paceMargin > 0 ? "+" : "") + paceMargin.toFixed(2) + " RR")
      : "--";
    const recentBallsLabel = data.assistant && Array.isArray(data.assistant.recentBalls) && data.assistant.recentBalls.length
      ? data.assistant.recentBalls.join(" ")
      : "No recent balls logged";

    setText("pressure-title", data.mode || "Pressure Center");
    setText("pressure-summary", data.summary || "Pressure summary unavailable.");
    setText("pressure-mode", (data.pressureLabel || "Live").toUpperCase());
    setText("pressure-phase", data.phase || "Live");
    setText("pressure-control-span", data.controlSpanLabel || "Live window");
    setText("pressure-index", String(data.pressureIndex || 0));
    setText("pressure-index-note", data.scoreline || "Live score");
    setText("pressure-win", data.winSwing && data.winSwing.label ? data.winSwing.label : "Match balanced");
    setText("pressure-win-note", data.winSwing ? (data.winSwing.team1Percent + "% vs " + data.winSwing.team2Percent + "%") : "Win swing unavailable");
    setText("pressure-benchmark", formatRate(data.pace && data.pace.currentRate) + " vs " + formatRate(data.pace && data.pace.benchmarkRate));
    setText("pressure-benchmark-note", (data.pace && data.pace.benchmarkLabel ? data.pace.benchmarkLabel : "Benchmark") + " · " + paceMarginLabel);
    setText("pressure-wickets", String(data.wicketsInHand || 0));
    setText("pressure-wickets-note", (data.oversRemaining || "0.0") + " overs left");
    setText("pressure-focus", data.focusLine || "Pressure focus unavailable.");
    setText("pressure-trend", data.assistant && data.assistant.trendLabel ? data.assistant.trendLabel : "Live");
    setText("pressure-urgency", data.assistant && data.assistant.urgency ? data.assistant.urgency : "Steady");
    setText("pressure-recent", recentBallsLabel);

    if (lanesContainer) {
      lanesContainer.innerHTML = (data.lanes || []).map(function(lane) {
        return ''
          + '<div class="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">'
          + '<div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">'
          + '<div class="min-w-0">'
          + '<div class="flex items-center gap-2 flex-wrap"><span class="inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold tracking-[0.2em] ' + getPressureLaneToneClass(lane.id) + '">' + escapeHtml((lane.title || 'Lane').toUpperCase()) + '</span><span class="text-xs text-slate-400">' + escapeHtml((lane.risk || 'Managed') + ' risk') + '</span></div>'
          + '<p class="text-sm text-slate-300 mt-3 leading-6">' + escapeHtml(lane.note || 'Live lane guidance.') + '</p>'
          + '<p class="text-xs text-slate-500 mt-2">' + escapeHtml((lane.finishLabel || '') + ' · ' + (lane.swingLabel || '')) + '</p>'
          + '</div>'
          + '<div class="grid grid-cols-3 gap-3 lg:w-[320px]">'
          + '<div class="rounded-xl bg-slate-950/60 border border-slate-800 p-3"><div class="text-[11px] uppercase tracking-[0.18em] text-slate-500">Burst</div><div class="text-lg font-bold text-white mt-1">' + escapeHtml(String(lane.overTarget || 0)) + '</div></div>'
          + '<div class="rounded-xl bg-slate-950/60 border border-slate-800 p-3"><div class="text-[11px] uppercase tracking-[0.18em] text-slate-500">Projection</div><div class="text-lg font-bold text-white mt-1">' + escapeHtml(String(lane.projected || 0)) + '</div></div>'
          + '<div class="rounded-xl bg-slate-950/60 border border-slate-800 p-3"><div class="text-[11px] uppercase tracking-[0.18em] text-slate-500">Win</div><div class="text-lg font-bold text-white mt-1">' + escapeHtml(String(lane.winChance || 0)) + '%</div></div>'
          + '</div>'
          + '</div>'
          + '<div class="mt-4 flex flex-wrap gap-2">'
          + ((lane.sequence || []).map(function(ball) {
              return '<span class="inline-flex min-w-[2.25rem] justify-center rounded-full border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-semibold text-white">' + escapeHtml(ball) + '</span>';
            }).join('') || '<span class="text-sm text-slate-500">No ball-by-ball lane needed right now.</span>')
          + '</div>'
          + '</div>';
      }).join('') || '<div class="rounded-xl border border-dashed border-slate-700 bg-slate-900/60 p-4 text-sm text-slate-400">No live pressure lanes are available yet.</div>';
    }

    if (leversContainer) {
      leversContainer.innerHTML = (data.levers || []).map(function(item) {
        return ''
          + '<div class="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">'
          + '<div class="flex items-center justify-between gap-3 mb-3"><span class="text-xs uppercase tracking-[0.18em] text-slate-400">' + escapeHtml(item.label || 'Lever') + '</span><span class="inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ' + getPressureToneClass(item.tone) + '">' + escapeHtml(item.value || '-') + '</span></div>'
          + '<p class="text-sm text-slate-300 leading-6">' + escapeHtml(item.note || 'Live trigger.') + '</p>'
          + '</div>';
      }).join('');
    }

    if (windowsContainer) {
      windowsContainer.innerHTML = (data.windows || []).map(function(windowItem) {
        return ''
          + '<div class="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">'
          + '<div class="flex items-start justify-between gap-3 mb-3"><div><h4 class="font-semibold text-white">' + escapeHtml(windowItem.title || 'Window') + '</h4><p class="text-xs text-slate-500 mt-1">' + escapeHtml(windowItem.subtitle || '') + '</p></div><span class="inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ' + getPressureToneClass(windowItem.risk === 'High' ? 'rose' : windowItem.risk === 'Medium' ? 'orange' : 'emerald') + '">' + escapeHtml(windowItem.risk || 'Managed') + '</span></div>'
          + '<div class="grid grid-cols-2 gap-3 mb-3"><div class="rounded-xl bg-slate-950/60 border border-slate-800 p-3"><div class="text-[11px] uppercase tracking-[0.18em] text-slate-500">Target</div><div class="text-base font-bold text-white mt-1">' + escapeHtml(windowItem.target || '-') + '</div></div><div class="rounded-xl bg-slate-950/60 border border-slate-800 p-3"><div class="text-[11px] uppercase tracking-[0.18em] text-slate-500">Swing</div><div class="text-base font-bold text-white mt-1">' + escapeHtml(windowItem.swingLabel || '-') + '</div></div></div>'
          + '<p class="text-sm text-slate-300 leading-6">' + escapeHtml(windowItem.note || 'Pressure note unavailable.') + '</p>'
          + '</div>';
      }).join('') || '<div class="rounded-xl border border-dashed border-slate-700 bg-slate-900/60 p-4 text-sm text-slate-400">No pressure windows available.</div>';
    }
  }

  window.renderPressureCenter = renderPressureCenter;

  function renderHighlights() {
    const highlights = appState.content.highlights || FALLBACK_STATE.content.highlights;
    const featured = highlights.featured || FALLBACK_STATE.content.highlights.featured;
    const video = document.getElementById("highlight-video");
    if (video && featured.videoUrl && video.src !== featured.videoUrl) {
      video.src = featured.videoUrl;
    }

    setText("highlight-title", featured.title || FALLBACK_STATE.content.highlights.featured.title);
    setText("highlight-desc", featured.description || FALLBACK_STATE.content.highlights.featured.description);
    setText("highlight-likes", "👍 " + (featured.likes || FALLBACK_STATE.content.highlights.featured.likes));
    setText("highlight-comments", "💬 " + (featured.comments || FALLBACK_STATE.content.highlights.featured.comments));
    setText("highlight-favorites", "❤️ " + (featured.favorites || FALLBACK_STATE.content.highlights.featured.favorites));

    const list = document.getElementById("highlights-list");
    if (list) {
      const items = Array.isArray(highlights.items) ? highlights.items : [];
      list.innerHTML = items.map(function(item) {
        const title = escapeHtml(item.title || "Highlight");
        const description = escapeHtml(item.description || "Watch the moment");
        return ""
          + '<div class="card-gradient rounded-xl p-4 border border-slate-700 cursor-pointer hover:border-orange-500 transition-all" onclick=\'playHighlight(' + JSON.stringify(item.title || "Highlight") + ', ' + JSON.stringify(item.description || "Watch the moment") + ', ' + JSON.stringify(item.videoUrl || featured.videoUrl || "") + ')\'>'
          + '<div class="flex flex-col gap-4 sm:flex-row"><div class="w-20 h-20 bg-slate-800 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">' + escapeHtml(item.icon || "🎬") + '</div><div class="flex-1 min-w-0"><p class="font-semibold">' + title + '</p><p class="text-sm text-slate-400">' + description + '</p><span class="text-xs text-orange-400">' + escapeHtml(item.time || "Just now") + '</span></div></div>'
          + "</div>";
      }).join("") || '<div class="text-sm text-slate-400">No highlight clips configured yet.</div>';
    }

    const statsList = document.getElementById("highlight-stats-list");
    if (statsList) {
      statsList.innerHTML = (highlights.stats || []).map(function(item, index) {
        return '<div class="flex justify-between"><span class="text-slate-400">' + escapeHtml(item.label || ("Stat " + (index + 1))) + '</span><span class="font-bold ' + escapeHtml(index % 2 === 0 ? "text-orange-400" : "text-green-400") + '">' + escapeHtml(item.value || "0") + "</span></div>";
      }).join("") || '<div class="text-sm text-slate-400">No highlight stats configured.</div>';
    }

    const trendingList = document.getElementById("highlight-trending-list");
    if (trendingList) {
      trendingList.innerHTML = (highlights.trending || []).map(function(item) {
        return '<div class="p-3 bg-slate-800 rounded-lg"><div class="font-semibold text-orange-400 mb-1">' + escapeHtml(item.title || "Trending Moment") + '</div><div class="text-slate-400">' + escapeHtml(item.value || "Live now") + "</div></div>";
      }).join("") || '<div class="text-sm text-slate-400">No trending moments configured.</div>';
    }
  }

  function renderAnalyticsTables() {
    const analytics = appState.content.analytics || FALLBACK_STATE.content.analytics;
    const battingBody = document.getElementById("analytics-batting-body");
    if (battingBody) {
      battingBody.innerHTML = (analytics.battingRows || []).map(function(row, index) {
        return '<tr class="' + (index < (analytics.battingRows.length - 1) ? 'border-b border-slate-700 ' : '') + 'hover:bg-slate-800"><td class="py-3 px-4 font-semibold">' + escapeHtml(row.name || "Batsman") + '</td><td class="text-center">' + escapeHtml(row.runs || "0") + '</td><td class="text-center">' + escapeHtml(row.balls || "0") + '</td><td class="text-center text-green-400">' + escapeHtml(row.strikeRate || "0") + '</td><td class="text-center">' + escapeHtml(row.fours || "0") + '</td><td class="text-center text-orange-400">' + escapeHtml(row.sixes || "0") + '</td></tr>';
      }).join("") || '<tr><td colspan="6" class="py-4 px-4 text-center text-slate-400">No batting rows configured.</td></tr>';
    }

    const bowlingBody = document.getElementById("analytics-bowling-body");
    if (bowlingBody) {
      bowlingBody.innerHTML = (analytics.bowlingRows || []).map(function(row, index) {
        return '<tr class="' + (index < (analytics.bowlingRows.length - 1) ? 'border-b border-slate-700 ' : '') + 'hover:bg-slate-800"><td class="py-3 px-4 font-semibold">' + escapeHtml(row.name || "Bowler") + '</td><td class="text-center">' + escapeHtml(row.overs || "0") + '</td><td class="text-center">' + escapeHtml(row.runs || "0") + '</td><td class="text-center text-red-400">' + escapeHtml(row.wickets || "0") + '</td><td class="text-center text-green-400">' + escapeHtml(row.economy || "0") + '</td></tr>';
      }).join("") || '<tr><td colspan="5" class="py-4 px-4 text-center text-slate-400">No bowling rows configured.</td></tr>';
    }

    const geoList = document.getElementById("analytics-geo-list");
    if (geoList) {
      geoList.innerHTML = (analytics.geo || []).map(function(item) {
        const percent = clampPercent(item.value || 0);
        return '<div class="flex items-center justify-between bg-slate-800 rounded-lg p-3"><span>' + escapeHtml(item.label || "Region") + '</span><div class="flex items-center gap-2"><div class="w-24 bg-slate-700 rounded-full h-2"><div class="' + escapeHtml(getGeoBarClass(item.tone)) + ' h-2 rounded-full" style="width:' + percent + '%"></div></div><span class="text-sm font-bold">' + percent + '%</span></div></div>';
      }).join("") || '<div class="text-sm text-slate-400">No geographic distribution configured.</div>';
    }

    const seasonTableBody = document.getElementById("analytics-season-table-body");
    if (seasonTableBody) {
      seasonTableBody.innerHTML = (analytics.seasonTable || []).map(function(row, index) {
        const teamName = row.team || row.code || "Team";
        const rank = row.pos || index + 1;
        return ''
          + '<tr class="' + (index < (analytics.seasonTable.length - 1) ? 'border-b border-slate-700 ' : '') + 'hover:bg-slate-800/70">'
          + '<td class="py-3 px-4 text-slate-500">' + escapeHtml(String(rank)) + '</td>'
          + '<td class="py-3 px-4"><div class="flex items-center gap-3"><span>' + renderTeamBadge(teamName, row.code || abbreviateTeam(teamName), "team-badge--sm") + '</span><span class="font-semibold ' + getTeamTextClass(teamName) + '">' + escapeHtml(teamName) + '</span></div></td>'
          + '<td class="py-3 px-4 text-center">' + escapeHtml(String(row.played != null ? row.played : 0)) + '</td>'
          + '<td class="py-3 px-4 text-center text-green-400">' + escapeHtml(String(row.won != null ? row.won : 0)) + '</td>'
          + '<td class="py-3 px-4 text-center text-rose-400">' + escapeHtml(String(row.lost != null ? row.lost : 0)) + '</td>'
          + '<td class="py-3 px-4 text-center font-semibold text-orange-300">' + escapeHtml(String(row.points != null ? row.points : 0)) + '</td>'
          + '<td class="py-3 px-4 text-right text-slate-300">' + escapeHtml(String(row.nrr || "0.000")) + '</td>'
          + '</tr>';
      }).join("") || '<tr><td colspan="7" class="py-4 px-4 text-center text-slate-400">Season table will appear here.</td></tr>';
    }

    const seasonPulse = document.getElementById("analytics-season-pulse");
    if (seasonPulse) {
      seasonPulse.innerHTML = (analytics.seasonPulse || []).map(function(item) {
        return ''
          + '<div class="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">'
          + '<div class="text-[11px] uppercase tracking-[0.18em] text-slate-500">' + escapeHtml(item.label || 'Metric') + '</div>'
          + '<div class="mt-2 text-xl font-bold ' + getMetricToneClass(item.tone) + '">' + escapeHtml(item.value || '--') + '</div>'
          + '<div class="mt-2 text-sm text-slate-400 leading-6">' + escapeHtml(item.note || 'Season note unavailable.') + '</div>'
          + '</div>';
      }).join("") || '<div class="rounded-xl border border-dashed border-slate-700 bg-slate-900/60 p-4 text-sm text-slate-400">Season pulse cards are not configured yet.</div>';
    }

    const fixtureList = document.getElementById("analytics-fixture-list");
    if (fixtureList) {
      fixtureList.innerHTML = (analytics.fixtureList || []).map(function(item) {
        const team1 = item.team1 || "Team 1";
        const team2 = item.team2 || "Team 2";
        return ''
          + '<div class="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">'
          + '<div class="flex items-start justify-between gap-3 mb-3"><div><p class="text-[11px] uppercase tracking-[0.18em] text-slate-500">' + escapeHtml(item.match || 'Fixture') + '</p><h4 class="font-semibold text-white mt-1">' + escapeHtml(team1 + ' vs ' + team2) + '</h4></div><span class="inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold bg-slate-800 text-slate-200 border border-slate-700">' + escapeHtml(item.tag || 'Radar') + '</span></div>'
          + '<div class="flex items-center gap-2 mb-3"><span>' + renderTeamBadge(team1, item.team1Flag || abbreviateTeam(team1), "team-badge--sm") + '</span><span>' + renderTeamBadge(team2, item.team2Flag || abbreviateTeam(team2), "team-badge--sm") + '</span><span class="text-sm text-slate-400">' + escapeHtml(item.date || 'TBD') + '</span></div>'
          + '<p class="text-sm text-slate-300">' + escapeHtml(item.venue || 'Venue TBA') + '</p>'
          + '<p class="text-sm text-slate-500 mt-2 leading-6">' + escapeHtml(item.focus || 'Fixture note unavailable.') + '</p>'
          + '</div>';
      }).join("") || '<div class="rounded-xl border border-dashed border-slate-700 bg-slate-900/60 p-4 text-sm text-slate-400">Fixture radar is empty.</div>';
    }

    const storylines = document.getElementById("analytics-storylines");
    if (storylines) {
      storylines.innerHTML = (analytics.storylines || []).map(function(item) {
        const title = item && typeof item === "object" ? item.title : item;
        const detail = item && typeof item === "object" ? item.detail : "";
        return ''
          + '<div class="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">'
          + '<div class="flex items-center gap-2 mb-2"><span class="inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ' + getPressureToneClass(item && item.tone) + '">' + escapeHtml((item && item.tone ? item.tone : 'watch').toUpperCase()) + '</span><h4 class="font-semibold text-white">' + escapeHtml(title || 'Match storyline') + '</h4></div>'
          + '<p class="text-sm text-slate-400 leading-6">' + escapeHtml(detail || 'Storyline note unavailable.') + '</p>'
          + '</div>';
      }).join("") || '<div class="rounded-xl border border-dashed border-slate-700 bg-slate-900/60 p-4 text-sm text-slate-400">No storylines configured.</div>';
    }
  }

  function renderNotifications() {
    const banner = document.getElementById("notification-banner");
    if (!banner) return;

    const latest = appState.notifications.length ? appState.notifications[appState.notifications.length - 1] : null;
    const activeNotice = systemNotice || (latest ? {
      message: latest.message,
      timeLabel: formatBannerTime(latest.timestamp)
    } : null);

    if (!activeNotice) {
      banner.classList.add("hidden");
      return;
    }

    banner.classList.remove("hidden");
    setText("notification-message", activeNotice.message || "Live alert");
    setText("notification-time", activeNotice.timeLabel || "LIVE");
  }

  function showSystemNotice(message) {
    systemNotice = { message: message, timeLabel: "SYSTEM" };
    clearTimeout(systemNoticeTimer);
    systemNoticeTimer = setTimeout(function() {
      systemNotice = null;
      renderNotifications();
    }, 6000);
    renderNotifications();
  }

  function clearSystemNotice() {
    clearTimeout(systemNoticeTimer);
    systemNotice = null;
    renderNotifications();
  }

  function initCharts() {
    const runrateElement = document.getElementById("runrateChart");
    if (runrateElement && !runrateChart) {
      runrateChart = new Chart(runrateElement.getContext("2d"), {
        type: "line",
        data: {
          labels: ["Powerplay", "Middle", "Death", "Projection"],
          datasets: [{
            label: "Run Rate",
            data: [0, 0, 0, 0],
            borderColor: "#f97316",
            backgroundColor: "rgba(249,115,22,0.2)",
            tension: 0.35,
            fill: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { labels: { color: "#cbd5e1" } } },
          scales: {
            x: { ticks: { color: "#94a3b8" }, grid: { color: "rgba(148,163,184,0.1)" } },
            y: { ticks: { color: "#94a3b8" }, grid: { color: "rgba(148,163,184,0.1)" } }
          }
        }
      });
    }

    const wicketElement = document.getElementById("wicketChart");
    if (wicketElement && !wicketChart) {
      wicketChart = new Chart(wicketElement.getContext("2d"), {
        type: "bar",
        data: {
          labels: ["Wkts Lost", "In Hand", "Pressure", "Fan Edge"],
          datasets: [{
            label: "Match Pulse",
            data: [0, 0, 0, 0],
            backgroundColor: ["#dc2626", "#22c55e", "#f97316", "#38bdf8"]
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { labels: { color: "#cbd5e1" } } },
          scales: {
            x: { ticks: { color: "#94a3b8" }, grid: { display: false } },
            y: { ticks: { color: "#94a3b8" }, grid: { color: "rgba(148,163,184,0.1)" } }
          }
        }
      });
    }
  }

  function updateCharts() {
    const runRate = Number.parseFloat(String(appState.score.runRate || "0")) || 0;
    const inningsLength = inferInningsLength(appState.score.matchTitle, appState.score.overs);
    const projectedTotal = firstFinite([
      aiInsights && aiInsights.prediction ? aiInsights.prediction.projectedTotal : null,
      numericValue(appState.content.matchCenter.projectedTotal)
    ], 0);
    const wickets = parseScore(appState.score.team1Score).wickets;
    const wicketsInHand = Math.max(0, 10 - wickets);
    const fanEdge = Math.round(getPollBreakdown().team1Percent / 10);
    const pressure = Math.round(firstFinite([aiInsights && aiInsights.prediction ? aiInsights.prediction.pressureIndex : null], 0) / 10);
    const projectedRate = inningsLength > 0 && projectedTotal > 0 ? Number((projectedTotal / inningsLength).toFixed(2)) : Number((runRate + 0.4).toFixed(2));
    const runSeries = [
      Math.max(0, Number((runRate - 1.1).toFixed(2))),
      Math.max(0, Number((runRate - 0.4).toFixed(2))),
      Number(runRate.toFixed(2)),
      Math.max(0, projectedRate)
    ];

    if (runrateChart) {
      runrateChart.data.datasets[0].data = runSeries;
      runrateChart.update();
    }

    if (wicketChart) {
      wicketChart.data.datasets[0].data = [wickets, wicketsInHand, pressure, fanEdge];
      wicketChart.update();
    }
  }

  function bindKeyboardShortcuts() {
    document.addEventListener("keydown", function(event) {
      if (event.key !== "Enter") return;
      if (event.target.id === "chat-input") {
        event.preventDefault();
        window.sendChatMessage();
      }
      if (event.target.id === "home-chat-input") {
        event.preventDefault();
        window.sendHomeChatMessage();
      }
    });
  }

  async function fetchJson(path, options) {
    const requestOptions = Object.assign({}, options || {});
    const headers = Object.assign({}, requestOptions.headers || {});
    if (requestOptions.method && requestOptions.method !== "GET" && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }
    requestOptions.headers = headers;

    const url = API_BASE + path;
    
    try {
      const response = await fetch(url, requestOptions);
      const payload = await response.json().catch(function() {
        return {};
      });
      if (!response.ok) {
        throw new Error(payload.error || "Request failed");
      }
      connectionStatus = "connected";
      retryCount = 0;
      return payload;
    } catch (error) {
      retryCount++;
      if (retryCount >= MAX_RETRIES) {
        connectionStatus = "failed";
        console.error("API connection failed after", MAX_RETRIES, "retries:", error);
        showSystemNotice("Unable to connect to server at " + API_BASE + ". Please ensure the backend is running.");
      } else {
        connectionStatus = "retrying";
      }
      throw error;
    }
  }

  function togglePollButtons(disabled) {
    const team1Button = document.getElementById("poll-vote-team1");
    const team2Button = document.getElementById("poll-vote-team2");
    if (team1Button) team1Button.disabled = disabled;
    if (team2Button) team2Button.disabled = disabled;
  }

  function getRequestedPage() {
    const hash = window.location.hash.replace("#", "").trim().toLowerCase();
    return PAGE_NAMES.has(hash) ? hash : "getstarted";
  }

  function inferPlatform(url, currentPlatform) {
    const platform = typeof currentPlatform === "string" ? currentPlatform.toLowerCase() : "custom";
    if (!url) return platform;
    if (platform !== "custom") return platform;
    if (url.indexOf("pages.dev") >= 0 || url.indexOf("/match?") >= 0) return "iframe";
    if (url.indexOf("youtube.com") >= 0 || url.indexOf("youtu.be") >= 0) return "youtube";
    if (url.indexOf("kick.com") >= 0) return "kick";
    if (url.indexOf("twitch.tv") >= 0) return "twitch";
    if (url.indexOf(".m3u8") >= 0) return "hls";
    return "video";
  }

  function extractYouTubeId(url) {
    try {
      if (url.indexOf("youtube.com/watch") >= 0) return new URL(url).searchParams.get("v");
      if (url.indexOf("youtu.be/") >= 0) return url.split("youtu.be/")[1].split("?")[0];
      if (url.indexOf("youtube.com/embed/") >= 0) return url.split("embed/")[1].split("?")[0];
    } catch (error) {
      console.error("Could not parse YouTube URL:", error);
    }
    return "";
  }

  function resolveCollection(primary, legacy, fallback, limit) {
    if (Array.isArray(primary) && primary.length) return primary.slice(0, limit);
    if (Array.isArray(legacy) && legacy.length) return legacy.slice(0, limit);
    if (Array.isArray(primary)) return [];
    if (Array.isArray(legacy)) return [];
    return clone(fallback).slice(0, limit);
  }

  function appendUniqueItem(list, item, maxItems) {
    const items = Array.isArray(list) ? list.slice() : [];
    const existingIndex = items.findIndex(function(entry) {
      return entry && item && entry.id && item.id && entry.id === item.id;
    });
    if (existingIndex >= 0) items.splice(existingIndex, 1);
    items.push(item);
    return items.slice(-maxItems);
  }

  function getPollBreakdown() {
    const team1Votes = Math.max(0, Number(appState.poll.votes.team1) || 0);
    const team2Votes = Math.max(0, Number(appState.poll.votes.team2) || 0);
    const total = team1Votes + team2Votes;
    const team1Percent = total > 0 ? Math.round((team1Votes / total) * 100) : 50;
    return {
      total: total,
      team1Percent: team1Percent,
      team2Percent: 100 - team1Percent
    };
  }

  function getFixtureTeams() {
    const primary = Array.isArray(appState.liveMatches) && appState.liveMatches.length ? appState.liveMatches[0] : null;
    return {
      team1: primary && primary.team1 ? primary.team1 : (appState.score.team1 || "Team 1"),
      team2: primary && primary.team2 ? primary.team2 : (appState.score.team2 || "Team 2")
    };
  }

  function getBroadcastStatusLabel(streamStatus, matchTime, hasLiveFeed) {
    const status = String(streamStatus || "").toLowerCase();
    if (status === "live") return "LIVE BROADCAST";
    if (status === "paused") return "PAUSED";
    if (Number.isFinite(matchTime) && matchTime > Date.now()) return "BUILD-UP LIVE";
    if (hasLiveFeed) return "LIVE SCORE";
    return status === "offline" ? "MATCH DESK" : "LIVE DESK";
  }

  function getMatchPhaseLabel(score, matchTime, hasLiveFeed) {
    if (Number.isFinite(matchTime) && matchTime > Date.now()) return "Pre-match";

    const overs = Number.parseFloat(String(score && score.overs || "0")) || 0;
    const inningsLength = inferInningsLength(score ? score.matchTitle : "", score ? score.overs : "");

    if (!hasLiveFeed && overs <= 0) return "Build-up";
    if (inningsLength >= 50) {
      if (overs < 10) return "Powerplay";
      if (overs < 40) return "Middle overs";
      return "Death overs";
    }
    if (inningsLength >= 20) {
      if (overs < 6) return "Powerplay";
      if (overs < 15) return "Middle overs";
      return "Death overs";
    }
    if (overs < 3) return "Powerplay";
    if (overs < 6) return "Middle overs";
    return "Pressure overs";
  }

  function getLastBallSummary(feed) {
    if (!Array.isArray(feed) || !feed.length) return "Last ball: awaiting update";

    const last = feed[feed.length - 1] || {};
    const label = typeof last === "string"
      ? last
      : (last.label !== undefined && last.label !== null
        ? String(last.label)
        : (last.runs !== undefined && last.runs !== null
          ? String(last.runs)
          : String(last.type || ".")));
    const over = typeof last === "object" && last.over ? "Over " + last.over + " · " : "";

    return "Last ball: " + over + label;
  }

  function getProjectedRangeLabel() {
    const prediction = aiInsights && aiInsights.prediction ? aiInsights.prediction : null;
    const low = firstFinite([prediction ? prediction.projectedLow : null], null);
    const high = firstFinite([prediction ? prediction.projectedHigh : null], null);
    if (low !== null && high !== null) {
      return low === high ? String(low) : low + "-" + high;
    }

    const projected = firstFinite([
      prediction ? prediction.projectedTotal : null,
      appState.content && appState.content.matchCenter ? appState.content.matchCenter.projectedTotal : null
    ], null);

    return projected === null ? "--" : String(projected);
  }

  function getMomentumLabel() {
    const briefing = aiInsights && aiInsights.briefing ? aiInsights.briefing : null;
    if (briefing && briefing.momentum) return String(briefing.momentum);

    const statsMomentum = appState.content && appState.content.stats ? appState.content.stats.momentum : null;
    if (statsMomentum && statsMomentum.label) return String(statsMomentum.label);

    const runRate = Number.parseFloat(String(appState.score && appState.score.runRate || "0")) || 0;
    if (runRate >= 10) return "Batting surge";
    if (runRate >= 8) return "Balanced tempo";
    if (runRate > 0) return "Pressure building";
    return "Momentum pending";
  }

  function getCrowdLabel(viewerCount, streamStatus) {
    const viewers = Number(viewerCount) || 0;
    if (viewers > 0) return compactNumber(viewers) + " watching";
    return String(streamStatus || "").toLowerCase() === "live" ? "Fans joining now" : "Crowd warming up";
  }

  function getPowerplayLabel(score) {
    if (score && score.powerplayOvers) {
      const label = String(score.powerplayOvers).trim();
      return /overs?/i.test(label) ? label : label + " overs";
    }

    const inningsLength = inferInningsLength(score ? score.matchTitle : "", score ? score.overs : "");
    if (inningsLength >= 50) return "10 overs";
    if (inningsLength >= 20) return "6 overs";
    if (inningsLength >= 10) return "3 overs";
    return "Powerplay";
  }

  function parseScore(scoreText) {
    if (typeof scoreText !== "string") return { runs: 0, wickets: 0 };
    const match = scoreText.trim().match(/^(\d+)(?:\/(\d+))?/);
    return {
      runs: match ? Number.parseInt(match[1], 10) || 0 : 0,
      wickets: match && match[2] ? Number.parseInt(match[2], 10) || 0 : 0
    };
  }

  function inferInningsLength(matchTitle, oversText) {
    const descriptor = String(matchTitle || "").toLowerCase();
    const overs = Number.parseFloat(String(oversText || "0")) || 0;
    if (descriptor.indexOf("test") >= 0) return 90;
    if (descriptor.indexOf("odi") >= 0 || overs > 20) return 50;
    if (descriptor.indexOf("t10") >= 0) return 10;
    return 20;
  }

  function firstFinite(values, fallback) {
    for (let index = 0; index < values.length; index += 1) {
      const value = numericValue(values[index]);
      if (value !== null) return value;
    }
    return fallback;
  }

  function numericValue(value) {
    if (value === null || value === undefined || value === "") return null;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }

  function clampPercent(value) {
    return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  }

  function metricText(rawValue, fallbackCount, singular, plural) {
    if (typeof rawValue === "string" && rawValue.trim()) {
      return /^\d+$/.test(rawValue.trim()) ? rawValue.trim() + " " + plural : rawValue.trim();
    }
    return fallbackCount === 1 ? "1 " + singular : fallbackCount + " " + plural;
  }

  function getMetricToneClass(tone) {
    switch (String(tone || "").toLowerCase()) {
      case "red": return "text-red-400";
      case "yellow": return "text-yellow-400";
      case "green": return "text-green-400";
      case "blue": return "text-blue-400";
      default: return "text-orange-400";
    }
  }

  function getToneTextClass(tone) {
    switch (String(tone || "").toLowerCase()) {
      case "red": return "text-red-400";
      case "yellow": return "text-yellow-400";
      case "green": return "text-green-400";
      case "blue": return "text-blue-400";
      default: return "text-orange-400";
    }
  }

  function getGeoBarClass(tone) {
    switch (String(tone || "").toLowerCase()) {
      case "green": return "bg-green-500";
      case "blue": return "bg-blue-500";
      case "yellow": return "bg-yellow-500";
      case "red": return "bg-red-500";
      default: return "bg-orange-500";
    }
  }

  function getTeamMeta(name) {
    const normalized = String(name || "").trim().toLowerCase();
    if (!normalized) return null;
    for (const key in TEAM_META) {
      if (TEAM_META[key].names.some(function(alias) { return normalized.indexOf(alias) >= 0; })) {
        return TEAM_META[key];
      }
    }
    return null;
  }

  function getTeamTextClass(name) {
    const meta = getTeamMeta(name);
    return meta ? meta.textClass : "text-white";
  }

  function applyTeamTextTone(id, name) {
    const element = document.getElementById(id);
    if (!element) return;
    TEAM_TEXT_CLASSES.forEach(function(className) {
      element.classList.remove(className);
    });
    const meta = getTeamMeta(name);
    if (meta && meta.textClass) element.classList.add(meta.textClass);
  }

  function renderTeamBadge(name, fallbackLabel, sizeClass) {
    const meta = getTeamMeta(name);
    const label = meta ? meta.code : (String(fallbackLabel || "").trim() || abbreviateTeam(name || "Team"));
    return '<span class="team-badge ' + escapeHtml(sizeClass || "") + ' ' + escapeHtml(meta ? meta.badgeClass : "team-badge--neutral") + '">' + escapeHtml(label) + "</span>";
  }

  function normalizeTeamList(value) {
    if (Array.isArray(value)) return value.filter(Boolean).map(function(item) { return String(item).trim(); }).filter(Boolean);
    if (typeof value !== "string") return [];
    return value.split(/\n|,/).map(function(item) { return item.trim(); }).filter(Boolean);
  }

  function buildTossSummary(score) {
    if (!score || !score.tossWinner) return "Toss pending";
    return score.tossWinner + " won the toss" + (score.tossDecision ? " and chose to " + score.tossDecision : "") + ".";
  }

  function isPreMatchLineup(score, ballFeed) {
    const innings = parseScore((score && score.team1Score) || "0/0");
    const overs = parseCricketOvers((score && score.overs) || "0.0");
    return innings.runs === 0 && innings.wickets === 0 && overs.ballsTotal === 0 && !(Array.isArray(ballFeed) && ballFeed.length);
  }

  function renderLineupGrid(team1, team2, team1XI, team2XI, label) {
    if (!team1XI.length && !team2XI.length) return "";
    return ""
      + '<div class="team-lineup-grid mt-4">'
      + renderLineupCard(team1, team1XI, label)
      + renderLineupCard(team2, team2XI, label)
      + "</div>";
  }

  function renderLineupCard(teamName, players, label) {
    if (!players.length) return "";
    const meta = getTeamMeta(teamName);
    return ""
      + '<div class="team-lineup-card ' + escapeHtml(meta ? meta.lineupClass : "") + '">'
      + '<div class="flex items-center gap-3 mb-3"><span>' + renderTeamBadge(teamName, abbreviateTeam(teamName), "team-badge--sm") + '</span><div><div class="text-xs uppercase tracking-[0.2em] text-slate-500">' + escapeHtml(label || "Playing XI") + '</div><div class="font-semibold ' + getTeamTextClass(teamName) + '">' + escapeHtml(teamName || "Team") + "</div></div></div>"
      + '<div class="text-sm text-slate-300 leading-6">' + escapeHtml(players.join(" | ")) + "</div>"
      + "</div>";
  }

  function abbreviateTeam(name) {
    const label = String(name || "").trim();
    if (!label) return "TEAM";
    const tokens = label.split(/\s+/).filter(Boolean);
    if (tokens.length === 1) return tokens[0].slice(0, 3).toUpperCase();
    return tokens.slice(0, 3).map(function(token) {
      return token[0];
    }).join("").toUpperCase();
  }

  function extractPrimaryName(value) {
    const label = String(value || "").trim();
    if (!label) return "Player";
    return label.split("-")[0].trim();
  }

  function compactNumber(value) {
    const numeric = Number(value) || 0;
    if (numeric >= 1000000) return (numeric / 1000000).toFixed(numeric >= 10000000 ? 0 : 1).replace(/\.0$/, "") + "M";
    if (numeric >= 1000) return (numeric / 1000).toFixed(numeric >= 100000 ? 0 : 1).replace(/\.0$/, "") + "k";
    return String(numeric);
  }

  function formatClock(timestamp) {
    if (!timestamp) return "now";
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return "now";
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function formatBannerTime(timestamp) {
    if (!timestamp) return "LIVE";
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return "LIVE";
    return "Updated " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function safeJsonParse(value) {
    try {
      return JSON.parse(value);
    } catch (_error) {
      return null;
    }
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  function setHtml(id, value) {
    const element = document.getElementById(id);
    if (element) element.innerHTML = value;
  }

  function emptyCard(message) {
    return '<div class="card-gradient rounded-2xl p-6 border border-slate-700 text-sm text-slate-400">' + escapeHtml(message) + "</div>";
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function getFanAlias() {
    const key = "cricketlive_fan_alias";
    const stored = localStorage.getItem(key);
    if (stored && stored.trim()) return stored.trim().slice(0, 24);
    const generated = "Fan" + Math.floor(Math.random() * 900 + 100);
    localStorage.setItem(key, generated);
    return generated;
  }

  // ==================== ADVANCED FEATURES ====================

  // Network status handling
  function handleNetworkStatus() {
    function updateOnlineStatus() {
      const statusEl = document.getElementById('network-status');
      if (navigator.onLine) {
        if (statusEl) statusEl.classList.add('hidden');
        // Reconnect to SSE
        if (window.initSseConnection) window.initSseConnection();
      } else {
        if (statusEl) {
          statusEl.classList.remove('hidden');
          statusEl.innerHTML = '<span class="text-orange-400">⚠️ You are offline. Some features may not work.</span>';
        }
      }
    }
    
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
  }

  // ==================== ALIAS FUNCTIONS ====================
  // Make functions available globally
  window.initSseConnection = function() {
    connectRealtime();
  };

  window.shareMatch = async function() {
    const shareData = {
      title: 'CricketLive Pro',
      text: 'Watch live cricket with real-time analytics and AI insights!',
      url: window.location.href
    };
    
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  // ==================== ALIAS FUNCTIONS ====================

  // Performance optimization - lazy load images
  function lazyLoadImages() {
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          if (entry.isIntersecting) {
            const img = entry.target;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.removeAttribute('data-src');
              imageObserver.unobserve(img);
            }
          }
        });
      });
      
      document.querySelectorAll('img[data-src]').forEach(function(img) {
        imageObserver.observe(img);
      });
    }
  }

  // Smooth scroll to element
  window.smoothScrollTo = function(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Keyboard shortcuts
  function initKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
      // Ignore if typing in input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      switch(e.key) {
        case '1':
          window.showPage('home');
          break;
        case '2':
          window.showPage('live');
          break;
        case '3':
          window.showPage('stats');
          break;
        case '4':
          window.showPage('predictions');
          break;
        case '7':
          window.showPage('scenario');
          break;
        case '5':
          window.showPage('highlights');
          break;
        case '6':
          window.showPage('analytics');
          break;
        case 'm':
          // Mute/unmute
          const video = document.getElementById('live-player');
          if (video) {
            video.muted = !video.muted;
          }
          break;
        case 'f':
          // Fullscreen
          const container = document.getElementById('video-container');
          if (container) {
            if (document.fullscreenElement) {
              document.exitFullscreen();
            } else {
              container.requestFullscreen();
            }
          }
          break;
        case 'Escape':
          // Close any modals
          document.querySelectorAll('.modal.open').forEach(function(modal) {
            modal.classList.remove('open');
          });
          break;
      }
    });
  }

  // Initialize advanced features
  handleNetworkStatus();
  lazyLoadImages();
  initKeyboardShortcuts();

  // Cache management
  window.clearAppCache = function() {
    if ('caches' in window) {
      caches.keys().then(function(cacheNames) {
        cacheNames.forEach(function(cacheName) {
          caches.delete(cacheName);
        });
      });
    }
    localStorage.removeItem('cricketlive_data');
    localStorage.removeItem('streamUrl');
    localStorage.removeItem('currentScore');
    alert('Cache cleared! Refreshing...');
    window.location.reload();
  };

  // Export functions for global use
  window.getAppState = function() {
    return appState;
  };

  window.refreshData = function() {
    fetchState();
  };

  // Quality of life improvements
  window.copyToClipboard = function(text) {
    navigator.clipboard.writeText(text).then(function() {
      alert('Copied to clipboard!');
    }).catch(function() {
      alert('Failed to copy');
    });
  };

  // Live stream quality detection
  window.getOptimalStreamQuality = function() {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection) {
      const effectiveType = connection.effectiveType;
      switch(effectiveType) {
        case 'slow-2g':
        case '2g':
          return 'low';
        case '3g':
          return 'medium';
        case '4g':
          return 'high';
        default:
          return 'auto';
      }
    }
    return 'auto';
  };

  // Handle visibility change for battery saving
  document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
      // Reduce refresh rate when tab is hidden
      console.log('Tab hidden - reducing refresh rate');
    } else {
      // Restore normal refresh rate
      console.log('Tab visible - restoring refresh rate');
      fetchState();
    }
  });

  // Touch gesture support for mobile
  function initTouchGestures() {
    let touchStartX = 0;
    let touchStartY = 0;
    
    document.addEventListener('touchstart', function(e) {
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });
    
    document.addEventListener('touchend', function(e) {
      const touchEndX = e.changedTouches[0].screenX;
      const touchEndY = e.changedTouches[0].screenY;
      
      const diffX = touchEndX - touchStartX;
      const diffY = touchEndY - touchStartY;
      
      // Horizontal swipe - change pages
      if (Math.abs(diffX) > 100 && Math.abs(diffX) > Math.abs(diffY)) {
        const pages = ['home', 'live', 'stats', 'predictions', 'scenario', 'pressure', 'highlights', 'analytics'];
        const currentPage = document.querySelector('.page:not(.hidden)');
        
        if (currentPage) {
          const currentId = currentPage.id.replace('-page', '');
          const currentIndex = pages.indexOf(currentId);
          
          if (diffX > 0 && currentIndex > 0) {
            window.showPage(pages[currentIndex - 1]);
          } else if (diffX < 0 && currentIndex < pages.length - 1) {
            window.showPage(pages[currentIndex + 1]);
          }
        }
      }
    }, { passive: true });
  }
  
  initTouchGestures();

  // Initialize on load
  if (window.initSseConnection) {
    window.initSseConnection();
  }

  // Hide loading screen
  const loadingScreen = document.getElementById('loading-screen');
  if (loadingScreen) {
    setTimeout(function() {
      loadingScreen.classList.add('hidden');
    }, 1500);
  }

  // ==================== PWA SUPPORT ====================
  
  // Register service worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
      navigator.serviceWorker.register('/sw.js').then(function(registration) {
        console.log('ServiceWorker registered:', registration.scope);
        
        // Check for updates
        registration.addEventListener('updatefound', function() {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', function() {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content available
              if (confirm('New version available! Refresh to update?')) {
                window.location.reload();
              }
            }
          });
        });
      }).catch(function(err) {
        console.log('ServiceWorker registration failed:', err);
      });
    });
  }

  // ==================== ADVANCED SYNC FROM ADMIN ====================
  
  // Listen for admin announcements
  window.addEventListener('storage', function(e) {
    if (e.key === 'admin_announcement') {
      try {
        const announcement = JSON.parse(e.newValue);
        if (announcement && announcement.message) {
          showSystemNotice('📢 ' + announcement.message);
        }
      } catch (err) {
        console.log('Storage event error:', err);
      }
    }
  });

  // Enhanced sync from admin
  window.syncFromAdmin = function() {
    fetchJson('/state').then(function(state) {
      if (state) {
        applyFullState(state);
        console.log('Synced from admin');
      }
    }).catch(function(err) {
      console.error('Sync failed:', err);
    });
  };

  // Listen for page visibility changes to sync when tab becomes active
  document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
      window.syncFromAdmin();
    }
  });

  // Handle online/offline status
  window.addEventListener('online', function() {
    console.log('Back online!');
    fetchState();
  });

  window.addEventListener('offline', function() {
    console.log('Gone offline');
  });

  // ==================== ADVANCED STREAMING ====================

  // Adaptive streaming quality
  window.adaptiveStreamQuality = function() {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!connection) return 'auto';
    
    const effectiveType = connection.effectiveType;
    const downlink = connection.downlink;
    
    if (effectiveType === 'slow-2g' || effectiveType === '2g' || downlink < 1) {
      return 'low';
    } else if (effectiveType === '3g' || downlink < 5) {
      return 'medium';
    } else if (effectiveType === '4g' || downlink >= 5) {
      return 'high';
    }
    return 'auto';
  };

  // Picture-in-Picture for mobile stream
  window.enableMobilePiP = async function() {
    const img = document.getElementById('mobile-stream-img');
    if (!img || !img.src) return;
    
    try {
      // Create a video element from the image stream
      const video = document.createElement('video');
      video.srcObject = img.src;
      video.muted = true;
      await video.play();
      await video.requestPictureInPicture();
    } catch (err) {
      console.log('PiP not supported:', err);
    }
  };

  // Stream quality auto-switch
  window.autoSwitchQuality = function(quality) {
    console.log('Switching to quality:', quality);
    const video = document.getElementById('live-player');
    if (video && video.getVideoPlaybackQuality) {
      const quality = video.getVideoPlaybackQuality();
      console.log('Current quality:', quality);
    }
  };

  // ==================== ANALYTICS ====================

  // Track stream views
  window.trackStreamView = async function() {
    const viewerId = localStorage.getItem('viewer_id') || 'viewer_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('viewer_id', viewerId);
    
    try {
      await fetch('/api/stream/view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ viewerId })
      });
    } catch (e) {
      console.log('Tracking failed:', e);
    }
  };

  // Track page views
  window.trackPageView = function(page) {
    console.log('Page view:', page);
  };

  // ==================== ADVANCED NOTIFICATIONS ====================

  // Request notification permission with fallback
  window.requestNotifications = async function() {
    if (!('Notification' in window)) {
      console.log('Notifications not supported');
      return false;
    }
    
    if (Notification.permission === 'granted') {
      return true;
    }
    
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    
    return false;
  };

  // Show notification
  window.showNotification = function(title, options = {}) {
    if (Notification.permission === 'granted') {
      new Notification(title, {
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        ...options
      });
    }
  };

  // ==================== DATA SYNC ====================

  // Sync data between tabs
  window.addEventListener('storage', function(e) {
    if (e.key === 'cricketlive_data') {
      const newData = JSON.parse(e.newValue);
      console.log('Data synced from another tab');
      // Optionally refresh UI
    }
  });

  // ==================== ERROR HANDLING ====================

  window.addEventListener('error', function(e) {
    console.error('Global error:', e.error);
  });

  window.addEventListener('unhandledrejection', function(e) {
    console.error('Unhandled promise rejection:', e.reason);
  });

  // ==================== PERFORMANCE MONITORING ====================

  window.performanceMetrics = {
    getMetrics: function() {
      if (performance && performance.getEntriesByType) {
        const paint = performance.getEntriesByType('paint');
        const navigation = performance.getEntriesByType('navigation');
        return { paint, navigation };
      }
      return null;
    },
    
    measureFCP: function() {
      if (performance && performance.getEntriesByType) {
        const paint = performance.getEntriesByType('paint');
        const fcp = paint.find(entry => entry.name === 'first-contentful-paint');
        return fcp ? fcp.startTime : null;
      }
      return null;
    },
    
    measureLCP: function() {
      if (performance && performance.getEntriesByType) {
        const paint = performance.getEntriesByType('paint');
        const lcp = paint.find(entry => entry.name === 'largest-contentful-paint');
        return lcp ? lcp.startTime : null;
      }
      return null;
    }
  };

  // Log performance metrics
  window.addEventListener('load', function() {
    setTimeout(function() {
      const metrics = window.performanceMetrics;
      console.log('FCP:', metrics.measureFCP());
      console.log('LCP:', metrics.measureLCP());
    }, 3000);
  });

  // ==================== EXPORT FUNCTIONS ====================

  window.CricketLive = {
    version: '3.0.0',
    state: appState,
    showPage: window.showPage,
    openScenarioLab: function() { window.showPage('scenario'); },
    openPressureCenter: function() { window.showPage('pressure'); },
    refreshData: window.refreshData,
    getAppState: window.getAppState,
    shareMatch: window.shareMatch,
    toggleTheme: window.toggleTheme,
    requestNotifications: window.requestNotifications,
    showNotification: window.showNotification,
    trackStreamView: window.trackStreamView,
    getOptimalStreamQuality: window.getOptimalStreamQuality,
    performanceMetrics: window.performanceMetrics
  };

  // ==================== PWA INSTALL ====================
  
  let deferredPrompt;
  const pwaPrompt = document.getElementById('pwa-prompt');
  
  window.addEventListener('beforeinstallprompt', function(e) {
    e.preventDefault();
    deferredPrompt = e;
    if (pwaPrompt) {
      pwaPrompt.classList.remove('hidden');
    }
  });

  window.installPWA = async function() {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (pwaPrompt) {
      pwaPrompt.classList.add('hidden');
    }
    deferredPrompt = null;
  };

  window.addEventListener('appinstalled', function() {
    if (pwaPrompt) {
      pwaPrompt.classList.add('hidden');
    }
    console.log('PWA installed');
  });

  // ==================== TOAST NOTIFICATIONS ====================
  
  window.showToast = function(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = 'bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 shadow-lg animate-[slideIn_0.3s_ease-out]';
    toast.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="${type === 'success' ? 'text-green-400' : type === 'error' ? 'text-red-400' : 'text-blue-400'}">${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
        <span class="text-sm">${message}</span>
      </div>
    `;
    
    container.appendChild(toast);
    
    setTimeout(function() {
      toast.remove();
    }, 3000);
  };

  // ==================== ADVANCED MENU ====================
  
  window.showAdvancedMenu = function() {
    const menu = document.getElementById('advanced-menu');
    if (menu) {
      menu.classList.remove('hidden');
    }
  };

  window.closeAdvancedMenu = function() {
    const menu = document.getElementById('advanced-menu');
    if (menu) {
      menu.classList.add('hidden');
    }
  };

  // Close modal on escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      closeAdvancedMenu();
    }
  });

  // Close modal on backdrop click
  document.getElementById('advanced-menu')?.addEventListener('click', function(e) {
    if (e.target === this) {
      closeAdvancedMenu();
    }
  });

  // ==================== ADVANCED FEATURES ====================

  // ==================== BIOMETRIC AUTHENTICATION ====================
  window.enableBiometricAuth = async function() {
    if ('credentials' in navigator) {
      try {
        const credential = await navigator.credentials.create({
          publicKey: {
            challenge: new Uint8Array(32),
            rp: { name: 'CricketLive Pro' },
            user: { id: new Uint8Array(16), name: 'user' },
            pubKeyCredParams: [{ type: 'public-key', alg: -7 }]
          }
        });
        return credential;
      } catch (e) {
        console.log('Biometric not available:', e);
        return null;
      }
    }
    return null;
  };

  // ==================== SPEECH RECOGNITION ====================
  window.enableVoiceControl = function() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      
      recognition.onresult = function(event) {
        const command = event.results[0][0].transcript.toLowerCase();
        console.log('Voice command:', command);
        
        if (command.includes('scenario') || command.includes('what if') || command.includes('scenario lab')) window.showPage('scenario');
        else if (command.includes('pressure') || command.includes('momentum')) window.showPage('pressure');
        else if (command.includes('home')) window.showPage('home');
        else if (command.includes('live')) window.showPage('live');
        else if (command.includes('stats')) window.showPage('stats');
        else if (command.includes('play')) document.getElementById('live-player')?.play();
        else if (command.includes('pause')) document.getElementById('live-player')?.pause();
      };
      
      return recognition;
    }
    return null;
  };

  // Start voice recognition
  let voiceRecognition = null;
  window.toggleVoiceControl = function() {
    if (!voiceRecognition) {
      voiceRecognition = window.enableVoiceControl();
      if (voiceRecognition) {
        voiceRecognition.start();
        window.showToast('Voice control enabled', 'success');
      }
    } else {
      voiceRecognition.stop();
      voiceRecognition = null;
      window.showToast('Voice control disabled', 'info');
    }
  };

  // ==================== WEBRTC PEER CONNECTION ====================
  window.createPeerConnection = function() {
    const config = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };
    
    const pc = new RTCPeerConnection(config);
    
    pc.onicecandidate = function(event) {
      if (event.candidate) {
        console.log('ICE candidate:', event.candidate);
      }
    };
    
    pc.ontrack = function(event) {
      console.log('Track received:', event.track.kind);
    };
    
    return pc;
  };

  // ==================== MEDIA DEVICES ====================
  window.getMediaDevices = async function() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return [];
    }
    
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return {
        video: devices.filter(d => d.kind === 'videoinput'),
        audio: devices.filter(d => d.kind === 'audioinput'),
        output: devices.filter(d => d.kind === 'audiooutput')
      };
    } catch (e) {
      console.error('Error getting devices:', e);
      return [];
    }
  };

  // ==================== SCREEN RECORDING ====================
  window.startScreenRecording = async function() {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: false
      });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9'
      });
      
      const chunks = [];
      mediaRecorder.ondataavailable = function(e) {
        if (e.data.size > 0) chunks.push(e.data);
      };
      
      mediaRecorder.onstop = function() {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        console.log('Recording URL:', url);
      };
      
      mediaRecorder.start();
      return { mediaRecorder, stream };
    } catch (e) {
      console.error('Screen recording error:', e);
      return null;
    }
  };

  // ==================== GEOLOCATION ====================
  window.getUserLocation = async function() {
    if (!navigator.geolocation) {
      console.log('Geolocation not supported');
      return null;
    }
    
    return new Promise(function(resolve) {
      navigator.geolocation.getCurrentPosition(
        function(position) {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        function(error) {
          console.error('Geolocation error:', error);
          resolve(null);
        }
      );
    });
  };

  // ==================== VIBRATION API ====================
  window.vibrate = function(pattern) {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  };

  // ==================== BATTERY API ====================
  window.getBatteryInfo = async function() {
    if ('getBattery' in navigator) {
      try {
        const battery = await navigator.getBattery();
        return {
          level: battery.level * 100,
          charging: battery.charging,
          chargingTime: battery.chargingTime,
          dischargingTime: battery.dischargingTime
        };
      } catch (e) {
        return null;
      }
    }
    return null;
  };

  // ==================== NETWORK INFORMATION ====================
  window.getNetworkInfo = function() {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!connection) return null;
    
    return {
      type: connection.type,
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData
    };
  };

  // ==================== FILE API ====================
  window.handleFileSelect = function(callback) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*';
    
    input.onchange = function(e) {
      const file = e.target.files[0];
      if (file) {
        callback(file);
      }
    };
    
    input.click();
  };

  // ==================== CLIPBOARD API ====================
  window.readClipboard = async function() {
    try {
      const text = await navigator.clipboard.readText();
      return text;
    } catch (e) {
      console.error('Clipboard read error:', e);
      return null;
    }
  };

  window.writeClipboard = async function(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      console.error('Clipboard write error:', e);
      return false;
    }
  };

  // ==================== WEB WORKER ====================
  window.createWorker = function(script) {
    const blob = new Blob([script], { type: 'application/javascript' });
    const worker = new Worker(URL.createObjectURL(blob));
    return worker;
  };

  // ==================== SHARED WORKER ====================
  window.connectSharedWorker = function() {
    if ('SharedWorker' in window) {
      const worker = new SharedWorker('/sw.js');
      worker.port.start();
      return worker;
    }
    return null;
  };

  // ==================== CACHE API ====================
  window.cacheManager = {
    add: async function(url) {
      if ('caches' in window) {
        const cache = await caches.open('cricketlive-resources');
        await cache.add(url);
      }
    },
    
    has: async function(url) {
      if ('caches' in window) {
        const cache = await caches.open('cricketlive-resources');
        return await cache.match(url);
      }
      return false;
    },
    
    clear: async function() {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(key => caches.delete(key)));
      }
    }
  };

  // ==================== IDB (INDEXEDDB) ====================
  window.openDatabase = function(name, version) {
    return new Promise(function(resolve, reject) {
      const request = indexedDB.open(name, version);
      
      request.onerror = function() {
        reject(request.error);
      };
      
      request.onsuccess = function() {
        resolve(request.result);
      };
      
      request.onupgradeneeded = function(event) {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('matches')) {
          db.createObjectStore('matches', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('chat')) {
          db.createObjectStore('chat', { keyPath: 'id' });
        }
      };
    });
  };

  // ==================== PAYMENT REQUEST ====================
  window.requestPayment = async function() {
    if (!('PaymentRequest' in window)) {
      console.log('Payment API not supported');
      return null;
    }
    
    const methodData = [{ supportedMethods: 'basic-card' }];
    const details = {
      total: { label: 'Premium Subscription', amount: { currency: 'USD', value: '9.99' } }
    };
    
    const request = new PaymentRequest(methodData, details);
    return request;
  };

  // ==================== CONTACTS API ====================
  window.getContacts = async function() {
    if (!('contacts' in navigator)) {
      return null;
    }
    
    const properties = ['name', 'tel', 'email'];
    try {
      const contacts = await navigator.contacts.select(properties, { multiple: true });
      return contacts;
    } catch (e) {
      console.error('Contacts error:', e);
      return null;
    }
  };

  // ==================== ADVANCED RENDERING ====================
  
  // Canvas-based effects
  window.applyCanvasEffect = function(videoElement, canvasElement) {
    const ctx = canvasElement.getContext('2d');
    const width = canvasElement.width = videoElement.videoWidth;
    const height = canvasElement.height = videoElement.videoHeight;
    
    return function() {
      ctx.drawImage(videoElement, 0, 0, width, height);
      requestAnimationFrame(applyCanvasEffect);
    };
  };

  // WebGL renderer
  window.initWebGL = function(canvas) {
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      console.error('WebGL not supported');
      return null;
    }
    
    const vertexShaderSource = `
      attribute vec4 aVertexPosition;
      void main() {
        gl_Position = aVertexPosition;
      }
    `;
    
    const fragmentShaderSource = `
      precision mediump float;
      void main() {
        gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
      }
    `;
    
    function createShader(type, source) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return shader;
    }
    
    const program = gl.createProgram();
    gl.attachShader(program, createShader(gl.VERTEX_SHADER, vertexShaderSource));
    gl.attachShader(program, createShader(gl.FRAGMENT_SHADER, fragmentShaderSource));
    gl.linkProgram(program);
    
    return { gl, program };
  };

  // ==================== PERFORMANCE MARKERS ====================
  window.performance.mark = function(name) {
    if (performance && performance.mark) {
      performance.mark(name);
    }
  };

  window.performance.measure = function(name, start, end) {
    if (performance && performance.measure) {
      performance.measure(name, start, end);
    }
  };

  // ==================== FINAL EXPORT ====================
  window.CricketLive = Object.assign(window.CricketLive || {}, {
    version: '3.0.0',
    build: '20260312',
    enableBiometricAuth: window.enableBiometricAuth,
    enableVoiceControl: window.enableVoiceControl,
    toggleVoiceControl: window.toggleVoiceControl,
    getMediaDevices: window.getMediaDevices,
    startScreenRecording: window.startScreenRecording,
    getUserLocation: window.getUserLocation,
    vibrate: window.vibrate,
    getBatteryInfo: window.getBatteryInfo,
    getNetworkInfo: window.getNetworkInfo,
    handleFileSelect: window.handleFileSelect,
    readClipboard: window.readClipboard,
    writeClipboard: window.writeClipboard,
    createWorker: window.createWorker,
    cacheManager: window.cacheManager,
    openDatabase: window.openDatabase,
    requestPayment: window.requestPayment,
    getContacts: window.getContacts,
    showToast: window.showToast,
    trackStreamView: window.trackStreamView
  });

})();
