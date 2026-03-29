(function () {
  const PAGE_META = {
    home: {
      eyebrow: "CricketLive Pro",
      title: "A fuller cricket product around the live match centre",
      subtitle: "Build the home page out with stories, fixtures, table context, and quick pathways into the rest of the site."
    },
    stream: {
      eyebrow: "Live Stream",
      title: "Watch the live stream with a real match companion layer",
      subtitle: "Keep the video, score, pressure, alerts, and your own scout watchlist in one responsive stream surface."
    },
    matches: {
      eyebrow: "Match Hub",
      title: "Live matches, fixture flow, and result context",
      subtitle: "Track what is on now, what is coming next, and what just finished from one central surface."
    },
    schedule: {
      eyebrow: "Season Schedule",
      title: "Fixture list built like a real cricket calendar",
      subtitle: "A clean schedule view with status, venue, timing, and stream availability for every listed match."
    },
    stats: {
      eyebrow: "Analytics Centre",
      title: "Pressure, table context, and player rankings",
      subtitle: "Blend live pressure reads with league-table context and performer leaderboards."
    },
    teams: {
      eyebrow: "Team Hub",
      title: "All clubs in one scouting-style overview",
      subtitle: "Browse the league clubs, their identities, home venues, captains, and watch-list names."
    },
    players: {
      eyebrow: "Player Hub",
      title: "Scouting-style player pages built for matchday browsing",
      subtitle: "Search by team, compare roles, and pin a personal watchlist that travels with you across the site."
    },
    news: {
      eyebrow: "Newsroom",
      title: "Editorial packaging for live cricket stories",
      subtitle: "Turn the live data, timeline, and AI context into a proper matchday newsroom experience."
    },
    videos: {
      eyebrow: "Video Hub",
      title: "Featured highlights, reels, and replay-style cards",
      subtitle: "Surface stream access and highlight moments in a way that feels closer to a broadcast product."
    }
  };

  const NAV_ITEMS = [
    { page: "home", label: "Home", icon: "ri-home-5-line", href: "/" },
    { page: "stream", label: "Stream", icon: "ri-broadcast-line", href: "/stream" },
    { page: "matches", label: "Matches", icon: "ri-live-line", href: "/matches" },
    { page: "schedule", label: "Schedule", icon: "ri-calendar-event-line", href: "/schedule" },
    { page: "stats", label: "Stats", icon: "ri-bar-chart-grouped-line", href: "/stats" },
    { page: "teams", label: "Teams", icon: "ri-shield-star-line", href: "/teams" },
    { page: "players", label: "Players", icon: "ri-user-star-line", href: "/players" },
    { page: "news", label: "News", icon: "ri-newspaper-line", href: "/news" },
    { page: "videos", label: "Videos", icon: "ri-movie-line", href: "/videos" }
  ];

  const TEAM_CATALOG = [
    {
      code: "MI",
      name: "Mumbai Indians",
      city: "Mumbai",
      home: "Wankhede Stadium",
      captain: "Hardik Pandya",
      coach: "Mahela Jayawardene",
      titles: 5,
      accent: "from-blue-500 to-cyan-500",
      summary: "High-ceiling batting backed by elite pace resources and deep big-match experience.",
      keyPlayers: ["Rohit Sharma", "Suryakumar Yadav", "Jasprit Bumrah"]
    },
    {
      code: "CSK",
      name: "Chennai Super Kings",
      city: "Chennai",
      home: "M. A. Chidambaram Stadium",
      captain: "Ruturaj Gaikwad",
      coach: "Stephen Fleming",
      titles: 5,
      accent: "from-yellow-400 to-amber-500",
      summary: "A control-heavy side built on clarity of role, game awareness, and spin-friendly home conditions.",
      keyPlayers: ["Ruturaj Gaikwad", "Ravindra Jadeja", "Matheesha Pathirana"]
    },
    {
      code: "RCB",
      name: "Royal Challengers Bengaluru",
      city: "Bengaluru",
      home: "M. Chinnaswamy Stadium",
      captain: "Rajat Patidar",
      coach: "Andy Flower",
      titles: 0,
      accent: "from-rose-500 to-red-600",
      summary: "Explosive batting power, short boundaries, and a high-variance identity that keeps every chase alive.",
      keyPlayers: ["Virat Kohli", "Phil Salt", "Mohammed Siraj"]
    },
    {
      code: "KKR",
      name: "Kolkata Knight Riders",
      city: "Kolkata",
      home: "Eden Gardens",
      captain: "Ajinkya Rahane",
      coach: "Chandrakant Pandit",
      titles: 3,
      accent: "from-violet-500 to-fuchsia-500",
      summary: "Mystery spin, middle-over squeeze, and aggressive tempo shifts define the Kolkata blueprint.",
      keyPlayers: ["Sunil Narine", "Andre Russell", "Rinku Singh"]
    },
    {
      code: "SRH",
      name: "Sunrisers Hyderabad",
      city: "Hyderabad",
      home: "Rajiv Gandhi International Stadium",
      captain: "Pat Cummins",
      coach: "Daniel Vettori",
      titles: 1,
      accent: "from-orange-500 to-amber-600",
      summary: "A high-octane six-hitting lineup paired with decisive fast-bowling options at the death.",
      keyPlayers: ["Travis Head", "Abhishek Sharma", "Pat Cummins"]
    },
    {
      code: "DC",
      name: "Delhi Capitals",
      city: "Delhi",
      home: "Arun Jaitley Stadium",
      captain: "Rishabh Pant",
      coach: "Ricky Ponting",
      titles: 0,
      accent: "from-sky-500 to-indigo-600",
      summary: "An athletic, power-heavy unit that looks strongest when the middle order controls tempo.",
      keyPlayers: ["Rishabh Pant", "Kuldeep Yadav", "Axar Patel"]
    },
    {
      code: "PBKS",
      name: "Punjab Kings",
      city: "Mullanpur",
      home: "Maharaja Yadavindra Singh Stadium",
      captain: "Shikhar Dhawan",
      coach: "Trevor Bayliss",
      titles: 0,
      accent: "from-red-500 to-orange-500",
      summary: "Aggressive top-order intent and fearless batting depth remain Punjab's clearest route to control.",
      keyPlayers: ["Shikhar Dhawan", "Arshdeep Singh", "Sam Curran"]
    },
    {
      code: "GT",
      name: "Gujarat Titans",
      city: "Ahmedabad",
      home: "Narendra Modi Stadium",
      captain: "Shubman Gill",
      coach: "Ashish Nehra",
      titles: 1,
      accent: "from-slate-700 to-slate-900",
      summary: "Structured pace plans, sharp fielding, and efficient chase setups make Gujarat difficult to rush.",
      keyPlayers: ["Shubman Gill", "Rashid Khan", "Mohit Sharma"]
    },
    {
      code: "RR",
      name: "Rajasthan Royals",
      city: "Jaipur",
      home: "Sawai Mansingh Stadium",
      captain: "Sanju Samson",
      coach: "Kumar Sangakkara",
      titles: 1,
      accent: "from-pink-500 to-rose-500",
      summary: "A tactically versatile side with high-end batting touch and matchup-driven bowling usage.",
      keyPlayers: ["Sanju Samson", "Yashasvi Jaiswal", "Yuzvendra Chahal"]
    },
    {
      code: "LSG",
      name: "Lucknow Super Giants",
      city: "Lucknow",
      home: "Bharat Ratna Shri Atal Bihari Vajpayee Ekana Stadium",
      captain: "KL Rahul",
      coach: "Justin Langer",
      titles: 0,
      accent: "from-emerald-400 to-cyan-500",
      summary: "Built for control phases, bowling flexibility, and calm chase management under pressure.",
      keyPlayers: ["KL Rahul", "Nicholas Pooran", "Ravi Bishnoi"]
    }
  ];

  const TEAM_DETAIL_OVERRIDES = {
    MI: {
      identity: "Explosive powerplay batting backed by elite pace control late in the innings.",
      gameModel: "Attack the first six overs, protect the middle with batting depth, and trust pace at the death.",
      venueEdge: "Wankhede rewards clean swing hitting and hard-length execution under lights.",
      fanPulse: "Big-match expectation and star power keep the pressure bar high every night."
    },
    CSK: {
      identity: "Role clarity, spin control, and calm endgame management remain the Chennai staples.",
      gameModel: "Slow the game into favorable matchups, squeeze the middle, and finish with experience.",
      venueEdge: "Chepauk tilts matches toward sides with stronger spin options and better strike rotation.",
      fanPulse: "One of the league's strongest crowd identities, especially in home control games."
    },
    RCB: {
      identity: "High-ceiling batting and short-boundary pressure create a constant shootout profile.",
      gameModel: "Win the boundary race early, keep pace through the middle, and survive the high-variance finish.",
      venueEdge: "Chinnaswamy amplifies both reward and risk for batters and death bowlers alike.",
      fanPulse: "Emotion and momentum swings are usually louder here than anywhere else in the league."
    },
    KKR: {
      identity: "Spin leverage and explosive phase changes define Kolkata's strongest version.",
      gameModel: "Force mistakes in the middle overs and strike hard when matchups open up.",
      venueEdge: "Eden supports aggressive batting but rewards smart spin pacing too.",
      fanPulse: "A side that thrives when mystery and momentum begin to feed each other."
    },
    SRH: {
      identity: "Power-hitting intent with decisive pace options late makes Hyderabad dangerous fast.",
      gameModel: "Launch early, keep the foot down, and use pace variation to defend hard totals.",
      venueEdge: "Hyderabad can reward fast outfields and strong back-end bowling plans.",
      fanPulse: "The ceiling feels huge whenever the top order gets through the first two overs."
    },
    DC: {
      identity: "Athletic cricket, matchup flexibility, and middle-order pace give Delhi tactical range.",
      gameModel: "Stay alive through the powerplay and let all-round depth shape the middle phase.",
      venueEdge: "Delhi games can become frantic quickly if the square boundaries come into play.",
      fanPulse: "Support rises sharply when the side starts with intent instead of rebuilding."
    },
    PBKS: {
      identity: "Punjab lean into fearless top-order tempo and emotion-driven momentum surges.",
      gameModel: "Push the scoring line early and trust the batting depth to carry the risk profile.",
      venueEdge: "Home surfaces can create fast starts and reward aggressive fielding pressure.",
      fanPulse: "A volatile but exciting team when the top order lands clean punches first."
    },
    GT: {
      identity: "Structured, efficient, and difficult to rush when Gujarat control the pace of the innings.",
      gameModel: "Bank control early, own the matchups, and punish teams that over-accelerate.",
      venueEdge: "Ahmedabad gives room for both pace and batting depth if execution stays disciplined.",
      fanPulse: "The side often looks cold-blooded rather than noisy when in command."
    },
    RR: {
      identity: "Rajasthan mix touch batting with tactical flexibility and matchup-heavy bowling decisions.",
      gameModel: "Build one strong batting platform, then attack with targeted overs instead of chaos.",
      venueEdge: "Jaipur tends to reward control and timing more than pure brute force.",
      fanPulse: "There is belief when the side feels one step ahead tactically."
    },
    LSG: {
      identity: "Lucknow thrive when control, tempo, and bowling versatility all stay aligned.",
      gameModel: "Keep wickets in hand, squeeze through the middle, and pick a disciplined launch point.",
      venueEdge: "Ekana generally favors sides that can read pace change and field placements well.",
      fanPulse: "Support rises when the game stays in calculation mode rather than pure chaos."
    }
  };

  const PLAYER_SEEDS = {
    "Rohit Sharma": { teamCode: "MI", role: "Opener", country: "India", battingStyle: "Right-hand bat", bowlingStyle: "Right-arm offbreak", impact: 95, powerplay: 94, middle: 78, death: 68, fielding: 72 },
    "Suryakumar Yadav": { teamCode: "MI", role: "Middle-order batter", country: "India", battingStyle: "Right-hand bat", bowlingStyle: "Part-time right-arm offbreak", impact: 96, powerplay: 72, middle: 95, death: 90, fielding: 76 },
    "Jasprit Bumrah": { teamCode: "MI", role: "Fast bowler", country: "India", battingStyle: "Right-hand bat", bowlingStyle: "Right-arm fast", impact: 97, powerplay: 88, middle: 84, death: 98, fielding: 74 },
    "Ruturaj Gaikwad": { teamCode: "CSK", role: "Opener", country: "India", battingStyle: "Right-hand bat", bowlingStyle: "Right-arm offbreak", impact: 90, powerplay: 88, middle: 82, death: 62, fielding: 70 },
    "Ravindra Jadeja": { teamCode: "CSK", role: "All-rounder", country: "India", battingStyle: "Left-hand bat", bowlingStyle: "Left-arm orthodox", impact: 92, powerplay: 54, middle: 86, death: 76, fielding: 95 },
    "Matheesha Pathirana": { teamCode: "CSK", role: "Fast bowler", country: "Sri Lanka", battingStyle: "Right-hand bat", bowlingStyle: "Right-arm fast", impact: 89, powerplay: 64, middle: 76, death: 94, fielding: 63 },
    "Virat Kohli": { teamCode: "RCB", role: "Top-order batter", country: "India", battingStyle: "Right-hand bat", bowlingStyle: "Right-arm medium", impact: 95, powerplay: 90, middle: 88, death: 70, fielding: 80 },
    "Phil Salt": { teamCode: "RCB", role: "Opener", country: "England", battingStyle: "Right-hand bat", bowlingStyle: "Wicketkeeper", impact: 87, powerplay: 93, middle: 70, death: 65, fielding: 74 },
    "Mohammed Siraj": { teamCode: "RCB", role: "Fast bowler", country: "India", battingStyle: "Right-hand bat", bowlingStyle: "Right-arm fast", impact: 84, powerplay: 86, middle: 66, death: 79, fielding: 67 },
    "Sunil Narine": { teamCode: "KKR", role: "Spin all-rounder", country: "West Indies", battingStyle: "Left-hand bat", bowlingStyle: "Right-arm offbreak", impact: 93, powerplay: 88, middle: 94, death: 64, fielding: 78 },
    "Andre Russell": { teamCode: "KKR", role: "Power all-rounder", country: "West Indies", battingStyle: "Right-hand bat", bowlingStyle: "Right-arm fast-medium", impact: 94, powerplay: 50, middle: 84, death: 96, fielding: 79 },
    "Rinku Singh": { teamCode: "KKR", role: "Finisher", country: "India", battingStyle: "Left-hand bat", bowlingStyle: "Right-arm offbreak", impact: 88, powerplay: 46, middle: 78, death: 93, fielding: 72 },
    "Travis Head": { teamCode: "SRH", role: "Opener", country: "Australia", battingStyle: "Left-hand bat", bowlingStyle: "Right-arm offbreak", impact: 91, powerplay: 96, middle: 76, death: 64, fielding: 72 },
    "Abhishek Sharma": { teamCode: "SRH", role: "Batting all-rounder", country: "India", battingStyle: "Left-hand bat", bowlingStyle: "Left-arm orthodox", impact: 87, powerplay: 92, middle: 70, death: 62, fielding: 71 },
    "Pat Cummins": { teamCode: "SRH", role: "Fast-bowling all-rounder", country: "Australia", battingStyle: "Right-hand bat", bowlingStyle: "Right-arm fast", impact: 88, powerplay: 82, middle: 77, death: 86, fielding: 78 },
    "Rishabh Pant": { teamCode: "DC", role: "Wicketkeeper-batter", country: "India", battingStyle: "Left-hand bat", bowlingStyle: "Wicketkeeper", impact: 92, powerplay: 62, middle: 86, death: 84, fielding: 75 },
    "Kuldeep Yadav": { teamCode: "DC", role: "Wrist spinner", country: "India", battingStyle: "Left-hand bat", bowlingStyle: "Left-arm wrist-spin", impact: 87, powerplay: 42, middle: 92, death: 58, fielding: 68 },
    "Axar Patel": { teamCode: "DC", role: "All-rounder", country: "India", battingStyle: "Left-hand bat", bowlingStyle: "Left-arm orthodox", impact: 86, powerplay: 50, middle: 81, death: 74, fielding: 82 },
    "Shikhar Dhawan": { teamCode: "PBKS", role: "Opener", country: "India", battingStyle: "Left-hand bat", bowlingStyle: "Right-arm offbreak", impact: 83, powerplay: 86, middle: 72, death: 52, fielding: 70 },
    "Arshdeep Singh": { teamCode: "PBKS", role: "Fast bowler", country: "India", battingStyle: "Left-hand bat", bowlingStyle: "Left-arm fast-medium", impact: 84, powerplay: 80, middle: 72, death: 88, fielding: 66 },
    "Sam Curran": { teamCode: "PBKS", role: "All-rounder", country: "England", battingStyle: "Left-hand bat", bowlingStyle: "Left-arm fast-medium", impact: 85, powerplay: 72, middle: 78, death: 79, fielding: 76 },
    "Shubman Gill": { teamCode: "GT", role: "Opener", country: "India", battingStyle: "Right-hand bat", bowlingStyle: "Right-arm offbreak", impact: 93, powerplay: 88, middle: 90, death: 66, fielding: 78 },
    "Rashid Khan": { teamCode: "GT", role: "Leg-spinner", country: "Afghanistan", battingStyle: "Right-hand bat", bowlingStyle: "Right-arm leg-spin", impact: 94, powerplay: 58, middle: 95, death: 74, fielding: 83 },
    "Mohit Sharma": { teamCode: "GT", role: "Fast bowler", country: "India", battingStyle: "Right-hand bat", bowlingStyle: "Right-arm medium-fast", impact: 78, powerplay: 62, middle: 72, death: 84, fielding: 62 },
    "Sanju Samson": { teamCode: "RR", role: "Wicketkeeper-batter", country: "India", battingStyle: "Right-hand bat", bowlingStyle: "Wicketkeeper", impact: 90, powerplay: 76, middle: 84, death: 80, fielding: 77 },
    "Yashasvi Jaiswal": { teamCode: "RR", role: "Opener", country: "India", battingStyle: "Left-hand bat", bowlingStyle: "Legbreak", impact: 89, powerplay: 94, middle: 76, death: 60, fielding: 73 },
    "Yuzvendra Chahal": { teamCode: "RR", role: "Leg-spinner", country: "India", battingStyle: "Right-hand bat", bowlingStyle: "Right-arm leg-spin", impact: 86, powerplay: 40, middle: 93, death: 56, fielding: 65 },
    "KL Rahul": { teamCode: "LSG", role: "Top-order batter", country: "India", battingStyle: "Right-hand bat", bowlingStyle: "Wicketkeeper", impact: 88, powerplay: 82, middle: 84, death: 58, fielding: 76 },
    "Nicholas Pooran": { teamCode: "LSG", role: "Middle-order batter", country: "West Indies", battingStyle: "Left-hand bat", bowlingStyle: "Wicketkeeper", impact: 91, powerplay: 58, middle: 82, death: 94, fielding: 74 },
    "Ravi Bishnoi": { teamCode: "LSG", role: "Leg-spinner", country: "India", battingStyle: "Right-hand bat", bowlingStyle: "Right-arm leg-spin", impact: 83, powerplay: 44, middle: 88, death: 61, fielding: 69 }
  };

  const WATCHLIST_STORAGE_KEY = "cricketlive-pro-watchlist";
  let globalActionsBound = false;

  const FALLBACK_STANDINGS = [
    { team: "GT", played: 10, won: 7, lost: 3, nrr: "+0.923", points: 14 },
    { team: "DC", played: 10, won: 7, lost: 3, nrr: "+0.611", points: 14 },
    { team: "RCB", played: 10, won: 6, lost: 4, nrr: "+0.402", points: 12 },
    { team: "MI", played: 10, won: 6, lost: 4, nrr: "+0.188", points: 12 },
    { team: "PBKS", played: 10, won: 5, lost: 5, nrr: "+0.074", points: 10 },
    { team: "KKR", played: 10, won: 5, lost: 5, nrr: "-0.008", points: 10 },
    { team: "LSG", played: 10, won: 4, lost: 6, nrr: "-0.144", points: 8 },
    { team: "SRH", played: 10, won: 4, lost: 6, nrr: "-0.358", points: 8 },
    { team: "RR", played: 10, won: 3, lost: 7, nrr: "-0.544", points: 6 },
    { team: "CSK", played: 10, won: 3, lost: 7, nrr: "-0.781", points: 6 }
  ];

  function qs(selector, root = document) {
    return root.querySelector(selector);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function toArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function fetchJSON(url) {
    return fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error("Request failed");
        return response.json();
      })
      .catch(() => null);
  }

  function normalizeTeamCode(input) {
    const raw = String(input || "").trim();
    if (!raw) return "T1";
    const direct = TEAM_CATALOG.find((team) => team.code === raw.toUpperCase());
    if (direct) return direct.code;
    const named = TEAM_CATALOG.find((team) => team.name.toLowerCase() === raw.toLowerCase());
    if (named) return named.code;
    const parts = raw.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 3).toUpperCase();
    return parts.map((part) => part[0]).join("").slice(0, 3).toUpperCase();
  }

  function getTeamMeta(input) {
    const code = normalizeTeamCode(input);
    const team = TEAM_CATALOG.find((entry) => entry.code === code) || {
      code,
      name: String(input || code),
      city: "League club",
      home: "Venue to be announced",
      captain: "Captain to be confirmed",
      coach: "Coaching staff",
      titles: 0,
      accent: "from-slate-500 to-slate-700",
      summary: "Current club profile is being updated.",
      keyPlayers: []
    };
    return { ...team, ...(TEAM_DETAIL_OVERRIDES[code] || {}) };
  }

  function slugify(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function getTeamHref(teamCode) {
    return "/teams/" + slugify(normalizeTeamCode(teamCode));
  }

  function getPlayerSlug(name, teamCode) {
    return slugify(name) + "-" + slugify(teamCode || "player");
  }

  function getPlayerHref(player) {
    return "/players/" + encodeURIComponent(player.slug);
  }

  function buildRoleSummary(seed, team) {
    if (seed.role.includes("Opener")) return seed.name + " shapes the first six overs and sets the ceiling for " + team.name + ".";
    if (seed.role.includes("All-rounder")) return seed.name + " changes the game in multiple phases and keeps " + team.name + " tactically flexible.";
    if (seed.role.includes("Fast")) return seed.name + " is part of the pace control plan that defines how " + team.name + " close innings out.";
    if (seed.role.includes("spinner") || seed.role.includes("Spin") || seed.role.includes("spinner")) return seed.name + " gives " + team.name + " control through the middle overs and matchup leverage.";
    if (seed.role.includes("Wicketkeeper")) return seed.name + " anchors tempo shifts while carrying the communication load from behind the stumps.";
    return seed.name + " remains a core match-up piece in the current " + team.name + " structure.";
  }

  function getRecentForm(seed) {
    const impactLabel = seed.impact >= 92 ? "high-impact" : seed.impact >= 86 ? "front-line" : "support-core";
    return [
      impactLabel + " role in current match plans",
      "best phase rating: " + Math.max(seed.powerplay, seed.middle, seed.death),
      "fielding value: " + seed.fielding + "/100"
    ];
  }

  function createFallbackPlayerSeed(name, teamCode) {
    return {
      name,
      teamCode,
      role: "Squad member",
      country: "International",
      battingStyle: "Right-hand bat",
      bowlingStyle: "Part-time option",
      impact: 76,
      powerplay: 70,
      middle: 72,
      death: 68,
      fielding: 70
    };
  }

  function getPlayerProfileByName(name, teamCode) {
    const seed = PLAYER_SEEDS[name] || createFallbackPlayerSeed(name, teamCode || "");
    const team = getTeamMeta(seed.teamCode || teamCode || "");
    const slug = getPlayerSlug(name, team.code);
    const topPhase = [
      { key: "powerplay", label: "Powerplay", value: seed.powerplay },
      { key: "middle", label: "Middle overs", value: seed.middle },
      { key: "death", label: "Death overs", value: seed.death }
    ].sort((left, right) => right.value - left.value)[0];

    return {
      ...seed,
      name,
      teamCode: team.code,
      teamName: team.name,
      slug,
      href: "/players/" + slug,
      summary: buildRoleSummary({ ...seed, name }, team),
      trend: topPhase.label + " specialist",
      watch: "Watch for " + topPhase.label.toLowerCase() + " involvement and how that changes the pressure line.",
      specialties: [seed.battingStyle, seed.bowlingStyle, topPhase.label + " impact"],
      recentForm: getRecentForm(seed)
    };
  }

  function getAllPlayerProfiles() {
    return TEAM_CATALOG.flatMap((team) => team.keyPlayers.map((name) => getPlayerProfileByName(name, team.code)));
  }

  function getPlayerProfileBySlug(slug) {
    return getAllPlayerProfiles().find((player) => player.slug === slug) || null;
  }

  function getPlayersForTeam(teamCode) {
    return getAllPlayerProfiles().filter((player) => player.teamCode === normalizeTeamCode(teamCode));
  }

  function getWatchlistState() {
    try {
      const raw = window.localStorage.getItem(WATCHLIST_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      return {
        teams: toArray(parsed && parsed.teams).slice(0, 8),
        players: toArray(parsed && parsed.players).slice(0, 12)
      };
    } catch {
      return { teams: [], players: [] };
    }
  }

  function saveWatchlistState(state) {
    window.localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify({
      teams: toArray(state && state.teams).slice(0, 8),
      players: toArray(state && state.players).slice(0, 12)
    }));
  }

  function isWatched(type, id) {
    const watchlist = getWatchlistState();
    return toArray(watchlist[type + "s"] || []).includes(id);
  }

  function renderWatchButton(type, id) {
    const watched = isWatched(type, id);
    return `
      <button class="site-watch-button ${watched ? 'is-active' : ''}" data-watch-type="${type}" data-watch-id="${id}" aria-pressed="${watched}">
        <i class="${watched ? 'ri-bookmark-fill' : 'ri-bookmark-line'}"></i>
        <span data-watch-text>${watched ? 'Watching' : 'Watchlist'}</span>
      </button>
    `;
  }

  function hydrateWatchButtons() {
    document.querySelectorAll("[data-watch-type][data-watch-id]").forEach((button) => {
      const watched = isWatched(button.getAttribute("data-watch-type"), button.getAttribute("data-watch-id"));
      button.classList.toggle("is-active", watched);
      button.setAttribute("aria-pressed", String(watched));
      const icon = qs("i", button);
      const label = qs("[data-watch-text]", button);
      if (icon) icon.className = watched ? "ri-bookmark-fill" : "ri-bookmark-line";
      if (label) label.textContent = watched ? "Watching" : "Watchlist";
    });
  }

  function formatNumber(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? new Intl.NumberFormat("en-IN").format(numeric) : "0";
  }

  function formatDateTime(value) {
    if (!value) return "Date TBA";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return escapeHtml(value);
    return date.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function formatShortDate(value) {
    if (!value) return "Date TBA";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return escapeHtml(value);
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  }

  function formatRelative(value) {
    if (!value) return "Just updated";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Just updated";
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return "moments ago";
    if (diff < 3600) return Math.floor(diff / 60) + "m ago";
    if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
    return Math.floor(diff / 86400) + "d ago";
  }

  function parseScore(scoreText) {
    const match = String(scoreText || "").trim().match(/^(\d+)(?:\/(\d+))?/);
    return {
      runs: match ? Number(match[1]) : 0,
      wickets: match && match[2] ? Number(match[2]) : 0
    };
  }

  function getLiveCard(state) {
    return toArray(state && state.liveMatches)[0] || null;
  }

  function getCurrentMatch(state) {
    const liveCard = getLiveCard(state) || {};
    const score = state && state.score ? state.score : {};
    return {
      title: score.matchTitle || liveCard.matchTitle || [score.team1, score.team2].filter(Boolean).join(" vs ") || "Match Centre",
      team1: score.team1 || liveCard.team1 || "Team 1",
      team2: score.team2 || liveCard.team2 || "Team 2",
      team1Code: score.team1Flag || liveCard.team1Flag || normalizeTeamCode(score.team1 || liveCard.team1),
      team2Code: score.team2Flag || liveCard.team2Flag || normalizeTeamCode(score.team2 || liveCard.team2),
      team1Score: score.team1Score || liveCard.score || "0/0",
      team2Score: score.team2Score || (state && state.content && state.content.matchCenter && state.content.matchCenter.team2Score) || "Yet to bat",
      venue: score.venue || liveCard.venue || "Venue update pending",
      matchDateTime: score.matchDateTime || liveCard.matchDateTime || liveCard.date || "",
      status: score.matchStatus || liveCard.result || "Live coverage underway",
      target: score.target || (state && state.content && state.content.matchCenter && state.content.matchCenter.target) || "",
      format: score.format || liveCard.format || "T20",
      league: score.league || liveCard.league || liveCard.tournament || "League Match",
      runRate: score.runRate || "-",
      reqRR: score.reqRR || "-",
      overs: score.overs || "",
      updatedAt: state && state.updatedAt ? state.updatedAt : ""
    };
  }

  function getAllFixtures(state) {
    return []
      .concat(toArray(state && state.liveMatches))
      .concat(toArray(state && state.upcomingMatches))
      .concat(toArray(state && state.recentResults));
  }

  function sortFixtures(fixtures) {
    return fixtures.slice().sort((left, right) => {
      const leftScore = left.status === "live" ? -1 : left.status === "upcoming" ? 0 : 1;
      const rightScore = right.status === "live" ? -1 : right.status === "upcoming" ? 0 : 1;
      if (leftScore !== rightScore) return leftScore - rightScore;
      const leftTime = new Date(left.matchDateTime || left.date || 0).getTime() || 0;
      const rightTime = new Date(right.matchDateTime || right.date || 0).getTime() || 0;
      return leftTime - rightTime;
    });
  }

  function getStandings(bundle) {
    const seasonTable = toArray(bundle.state && bundle.state.content && bundle.state.content.analytics && bundle.state.content.analytics.seasonTable);
    if (seasonTable.length) {
      return seasonTable.slice(0, 10).map((row, index) => ({
        team: normalizeTeamCode(row.team || row.name || row.code || "T" + (index + 1)),
        played: Number(row.played || row.p || row.matches || 0),
        won: Number(row.won || row.w || 0),
        lost: Number(row.lost || row.l || 0),
        nrr: String(row.nrr || row.netRunRate || "0.000"),
        points: Number(row.points || row.pts || 0)
      }));
    }
    return FALLBACK_STANDINGS;
  }

  function getPollSummary(bundle) {
    const votes = (bundle.state && bundle.state.poll && bundle.state.poll.votes) || { team1: 0, team2: 0 };
    const total = Math.max(Number(votes.team1 || 0) + Number(votes.team2 || 0), 1);
    return {
      question: (bundle.state && bundle.state.poll && bundle.state.poll.question) || "Who takes control from here?",
      team1Percent: Math.round((Number(votes.team1 || 0) * 100) / total),
      team2Percent: Math.round((Number(votes.team2 || 0) * 100) / total),
      totalVotes: Number(votes.team1 || 0) + Number(votes.team2 || 0)
    };
  }

  function getPressure(bundle) {
    return bundle.pressure || {
      pressureIndex: 52,
      pressureLabel: "Managed",
      summary: "Pressure centre is waiting for richer live scoring input.",
      focusLine: "Load the match stream and publish live scoring to deepen the decision layers.",
      winSwing: {
        team1: bundle.currentMatch.team1,
        team2: bundle.currentMatch.team2,
        team1Percent: 50,
        team2Percent: 50,
        label: "Match balanced"
      },
      pace: {
        currentRate: Number(bundle.currentMatch.runRate || 0),
        benchmarkRate: Number(bundle.currentMatch.reqRR || 0),
        margin: 0,
        benchmarkLabel: "Required rate"
      },
      levers: [],
      windows: [],
      lanes: [],
      assistant: {
        trendLabel: "Standby",
        urgency: "Waiting",
        smartCall: "Use the admin panel to start live scoring for richer pressure modelling.",
        recentBalls: []
      }
    };
  }

  function getInsights(bundle) {
    return bundle.insights || {
      briefing: {
        summary: bundle.currentMatch.team1 + " vs " + bundle.currentMatch.team2 + " is the centre of the current site experience.",
        narrative: "The newsroom layer is synthesizing live score, match flow, and schedule context.",
        keyInsights: ["Live state loaded", "Editorial cards active", "Site hub online"]
      },
      keySignals: ["Coverage active", "Fixture cards linked", "Standings fallback applied"],
      tactical: {
        commentary: "The next site iteration can go deeper into full editorial workflows.",
        battingPlan: "Scorecard-driven views are live.",
        bowlingPlan: "Pressure metrics are available in the stats hub.",
        nextOverPlan: "Use the new pages to spread cricket context beyond the live centre."
      },
      prediction: {
        projectedTotal: 0,
        fanConfidenceTeam1: 50,
        fanConfidenceTeam2: 50,
        pressureIndex: 50,
        momentumLabel: "Balanced"
      }
    };
  }

  function getPerformers(bundle) {
    const playerStats = bundle.players || {};
    const batsmen = toArray(playerStats.batsmen).length
      ? toArray(playerStats.batsmen)
      : toArray(bundle.state && bundle.state.content && bundle.state.content.performers && bundle.state.content.performers.batsmen);
    const bowlers = toArray(playerStats.bowlers).length
      ? toArray(playerStats.bowlers)
      : toArray(bundle.state && bundle.state.content && bundle.state.content.performers && bundle.state.content.performers.bowlers);
    return { batsmen, bowlers };
  }

  function buildTickerItems(bundle) {
    const notifications = toArray(bundle.state && bundle.state.notifications).slice(-3).reverse();
    const upcoming = toArray(bundle.state && bundle.state.upcomingMatches).slice(0, 2);
    const items = [];
    items.push({
      icon: '<span class="site-live-dot"></span>',
      text: "<strong>Live:</strong> " + escapeHtml(bundle.currentMatch.team1 + " vs " + bundle.currentMatch.team2) + " · " + escapeHtml(bundle.currentMatch.status || "Coverage live")
    });
    if (bundle.currentMatch.target) {
      items.push({
        icon: '<i class="ri-focus-3-line text-blue-400"></i>',
        text: "<strong>Target:</strong> " + escapeHtml(bundle.currentMatch.target)
      });
    }
    upcoming.forEach((match) => {
      items.push({
        icon: '<i class="ri-calendar-event-line text-cyan-400"></i>',
        text: "<strong>Next:</strong> " + escapeHtml(match.team1 + " vs " + match.team2) + " · " + escapeHtml(formatDateTime(match.matchDateTime || match.date))
      });
    });
    notifications.forEach((notification) => {
      items.push({
        icon: '<i class="ri-notification-3-line text-amber-400"></i>',
        text: "<strong>Alert:</strong> " + escapeHtml(notification.message || "Match update")
      });
    });
    return items.slice(0, 6);
  }

  function buildStories(bundle) {
    const insights = getInsights(bundle);
    const timeline = toArray(bundle.state && bundle.state.timelineEvents);
    const stories = [];
    stories.push({
      tag: "Lead Story",
      title: bundle.currentMatch.team1 + " vs " + bundle.currentMatch.team2 + " moves through " + (bundle.pressure && bundle.pressure.phase ? bundle.pressure.phase.toLowerCase() : "the live cycle"),
      summary: insights.briefing && insights.briefing.summary ? insights.briefing.summary : bundle.currentMatch.status,
      meta: bundle.currentMatch.venue + " · " + formatRelative(bundle.currentMatch.updatedAt)
    });

    timeline.slice(0, 4).forEach((event) => {
      stories.push({
        tag: event.badge || event.type || "Update",
        title: event.title || "Match update",
        summary: event.detail || "The live timeline has published a new update.",
        meta: (event.over ? event.over + " ov" : "Timeline") + " · " + formatRelative(event.timestamp)
      });
    });

    toArray(insights.keySignals).slice(0, 3).forEach((signal, index) => {
      stories.push({
        tag: "Signal " + (index + 1),
        title: signal,
        summary: insights.tactical && insights.tactical.commentary ? insights.tactical.commentary : "Analyst layer has attached a tactical view to the match.",
        meta: "AI desk · " + formatRelative(bundle.state && bundle.state.updatedAt)
      });
    });

    return stories.slice(0, 7);
  }

  function buildVideos(bundle) {
    const highlights = toArray(bundle.state && bundle.state.content && bundle.state.content.highlights && bundle.state.content.highlights.items);
    const timeline = toArray(bundle.state && bundle.state.timelineEvents);
    if (highlights.length) {
      return highlights.slice(0, 6).map((item, index) => ({
        title: item.title || item.label || "Highlight package",
        summary: item.description || item.subtitle || "Quick-cut match package.",
        duration: item.duration || ["02:38", "01:54", "03:12", "01:27", "02:06", "00:58"][index % 6],
        href: item.videoUrl || (bundle.state && bundle.state.stream && bundle.state.stream.url) || "/",
        tag: item.tag || "Highlight"
      }));
    }
    return timeline.slice(0, 6).map((event, index) => ({
      title: event.title || "Moment replay",
      summary: event.detail || "Replay card generated from the live timeline.",
      duration: ["01:22", "00:48", "02:11", "01:06", "00:59", "01:37"][index % 6],
      href: "/stream",
      tag: event.badge || "Replay"
    }));
  }

  function getPathSegments() {
    return window.location.pathname.split("/").filter(Boolean);
  }

  function getCurrentTeamCodeFromPath() {
    const segments = getPathSegments();
    return normalizeTeamCode(segments[1] || "");
  }

  function getCurrentPlayerSlugFromPath() {
    const segments = getPathSegments();
    return segments[1] || "";
  }

  function getTeamFixtures(bundle, teamCode) {
    return sortFixtures(getAllFixtures(bundle.state).filter((match) => normalizeTeamCode(match.team1Flag || match.team1) === teamCode || normalizeTeamCode(match.team2Flag || match.team2) === teamCode));
  }

  function getStreamConfig(bundle) {
    const stream = (bundle.state && bundle.state.stream) || {};
    const platform = String(stream.platform || "custom").toLowerCase();
    const url = stream.url || "";
    const embeddable = Boolean(url) && ["iframe", "custom"].includes(platform);
    return {
      url,
      platform,
      status: stream.status || "offline",
      viewerCount: Number(stream.viewerCount || 0),
      embeddable
    };
  }

  function getWatchlistEntries() {
    const watchlist = getWatchlistState();
    return {
      teams: toArray(watchlist.teams).map((code) => getTeamMeta(code)),
      players: toArray(watchlist.players).map((slug) => getPlayerProfileBySlug(slug)).filter(Boolean)
    };
  }

  function buildFeatureCards(bundle) {
    const fixtures = sortFixtures(getAllFixtures(bundle.state)).slice(0, 4);
    return fixtures.map((match) => {
      const team1 = getTeamMeta(match.team1Flag || match.team1);
      const team2 = getTeamMeta(match.team2Flag || match.team2);
      return `
        <article class="site-card-panel site-card-hover p-5">
          <div class="flex items-center justify-between gap-3">
            ${renderStatus(match.status)}
            <span class="text-xs text-slate-400">${escapeHtml(formatDateTime(match.matchDateTime || match.date))}</span>
          </div>
          <div class="mt-4 flex items-center justify-between gap-4">
            <div class="flex items-center gap-3">
              ${renderTeamStamp(team1.code, team1.accent)}
              <div>
                <p class="font-semibold text-white">${escapeHtml(match.team1)}</p>
                <p class="text-xs text-slate-400">${escapeHtml(team1.home)}</p>
              </div>
            </div>
            <span class="text-slate-500 font-display text-xl">VS</span>
            <div class="flex items-center gap-3 text-right">
              <div>
                <p class="font-semibold text-white">${escapeHtml(match.team2)}</p>
                <p class="text-xs text-slate-400">${escapeHtml(match.venue || team2.home)}</p>
              </div>
              ${renderTeamStamp(team2.code, team2.accent)}
            </div>
          </div>
          <div class="mt-4 text-sm text-slate-300">${escapeHtml(match.result || match.score || bundle.currentMatch.status)}</div>
        </article>
      `;
    }).join("");
  }

  function renderStatus(status) {
    const normalized = status === "completed" ? "completed" : status === "upcoming" ? "upcoming" : "live";
    const icon = normalized === "live" ? "ri-live-line" : normalized === "upcoming" ? "ri-calendar-event-line" : "ri-checkbox-circle-line";
    const label = normalized === "live" ? "Live" : normalized === "upcoming" ? "Upcoming" : "Completed";
    return `<span class="site-status-${normalized}"><i class="${icon}"></i>${label}</span>`;
  }

  function renderTeamStamp(code, accent) {
    return `<div class="w-12 h-12 rounded-2xl bg-gradient-to-br ${accent} flex items-center justify-center font-display text-base font-bold text-white shadow-lg">${escapeHtml(code)}</div>`;
  }

  function renderFixtureRows(fixtures, emptyLabel) {
    if (!fixtures.length) {
      return `<div class="site-empty-state">${escapeHtml(emptyLabel)}</div>`;
    }
    return fixtures.map((match) => {
      const team1 = getTeamMeta(match.team1Flag || match.team1);
      const team2 = getTeamMeta(match.team2Flag || match.team2);
      return `
        <article class="site-card-panel site-card-hover p-5">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              ${renderStatus(match.status)}
              <span class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">${escapeHtml(match.league || match.tournament || match.format || "League Match")}</span>
            </div>
            <span class="text-sm text-slate-400">${escapeHtml(formatDateTime(match.matchDateTime || match.date))}</span>
          </div>
          <div class="mt-4 grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
            <a href="${getTeamHref(team1.code)}" class="flex items-center gap-3 min-w-0">
              ${renderTeamStamp(team1.code, team1.accent)}
              <div>
                <p class="font-semibold text-white">${escapeHtml(match.team1)}</p>
                <p class="text-sm text-slate-400">${escapeHtml(match.score || (match.status === "live" ? "Coverage active" : team1.city))}</p>
              </div>
            </a>
            <div class="text-center text-slate-500 font-display text-2xl">VS</div>
            <a href="${getTeamHref(team2.code)}" class="flex items-center justify-start gap-3 min-w-0 md:justify-end">
              <div class="text-left md:text-right">
                <p class="font-semibold text-white">${escapeHtml(match.team2)}</p>
                <p class="text-sm text-slate-400">${escapeHtml(match.result || match.venue || team2.city)}</p>
              </div>
              ${renderTeamStamp(team2.code, team2.accent)}
            </a>
          </div>
          <div class="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-400">
            <span class="site-meta-chip"><i class="ri-map-pin-line"></i>${escapeHtml(match.venue || "Venue TBA")}</span>
            <span class="site-meta-chip"><i class="ri-broadcast-line"></i>${escapeHtml(match.streamPlatform || (match.status === "live" ? "Live stream linked" : "Platform TBA"))}</span>
            ${match.status === 'live' ? '<a href="/stream" class="site-meta-chip"><i class="ri-broadcast-line"></i>Open stream</a>' : ''}
          </div>
        </article>
      `;
    }).join("");
  }

  function renderStories(stories) {
    return stories.map((story, index) => `
      <article class="site-editorial-card ${index === 0 ? 'p-6 md:p-7' : 'p-5'}">
        <div class="flex items-center justify-between gap-3">
          <span class="site-section-label">${escapeHtml(story.tag)}</span>
          <span class="text-xs text-slate-500 uppercase tracking-[0.18em]">${index === 0 ? 'Featured' : 'Desk'}</span>
        </div>
        <h3 class="mt-4 ${index === 0 ? 'text-2xl md:text-3xl' : 'text-xl'} font-semibold leading-tight text-white">${escapeHtml(story.title)}</h3>
        <p class="mt-3 text-sm leading-6 text-slate-300">${escapeHtml(story.summary)}</p>
        <p class="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">${escapeHtml(story.meta)}</p>
      </article>
    `).join("");
  }

  function renderVideoCards(videos) {
    return videos.map((video) => `
      <a href="${escapeHtml(video.href || '/')}" class="site-card-panel site-card-hover block p-5">
        <div class="aspect-[16/9] rounded-2xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 border border-slate-700 flex items-center justify-center">
          <div class="w-16 h-16 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-2xl text-white">
            <i class="ri-play-fill"></i>
          </div>
        </div>
        <div class="mt-4 flex items-center justify-between gap-3">
          <span class="site-section-label">${escapeHtml(video.tag)}</span>
          <span class="text-xs text-slate-400">${escapeHtml(video.duration)}</span>
        </div>
        <h3 class="mt-3 text-lg font-semibold text-white">${escapeHtml(video.title)}</h3>
        <p class="mt-2 text-sm leading-6 text-slate-300">${escapeHtml(video.summary)}</p>
      </a>
    `).join("");
  }

  function renderPlayerCard(player) {
    const team = getTeamMeta(player.teamCode);
    return `
      <article class="site-card-panel site-card-hover p-5" data-player-card data-player-name="${escapeHtml(player.name.toLowerCase())}" data-player-team="${escapeHtml(player.teamCode)}" data-player-team-name="${escapeHtml(team.name.toLowerCase())}" data-player-role="${escapeHtml(player.role.toLowerCase())}">
        <div class="flex items-start justify-between gap-3">
          <a href="${getPlayerHref(player)}" class="flex items-center gap-3 min-w-0">
            ${renderTeamStamp(player.teamCode, team.accent)}
            <div class="min-w-0">
              <p class="font-semibold text-white truncate">${escapeHtml(player.name)}</p>
              <p class="text-sm text-slate-400 truncate">${escapeHtml(team.name)} · ${escapeHtml(player.role)}</p>
            </div>
          </a>
          ${renderWatchButton('player', player.slug)}
        </div>
        <p class="mt-4 text-sm leading-6 text-slate-300">${escapeHtml(player.summary)}</p>
        <div class="mt-5 grid grid-cols-3 gap-3 text-center">
          <div class="site-rating-card"><p class="text-xs uppercase tracking-[0.18em] text-slate-500">Impact</p><p class="mt-2 text-2xl font-bold text-white">${escapeHtml(player.impact)}</p></div>
          <div class="site-rating-card"><p class="text-xs uppercase tracking-[0.18em] text-slate-500">Best Phase</p><p class="mt-2 text-sm font-bold text-white">${escapeHtml(player.trend)}</p></div>
          <div class="site-rating-card"><p class="text-xs uppercase tracking-[0.18em] text-slate-500">Fielding</p><p class="mt-2 text-2xl font-bold text-white">${escapeHtml(player.fielding)}</p></div>
        </div>
        <div class="mt-4 site-chip-grid">
          ${player.specialties.map((item) => `<span class="site-meta-chip">${escapeHtml(item)}</span>`).join('')}
        </div>
      </article>
    `;
  }

  function renderTeamMiniCard(team) {
    return `
      <article class="site-card-panel site-card-hover p-5">
        <div class="flex items-start justify-between gap-3">
          <a href="${getTeamHref(team.code)}" class="flex items-center gap-3 min-w-0">
            ${renderTeamStamp(team.code, team.accent)}
            <div class="min-w-0">
              <p class="font-semibold text-white truncate">${escapeHtml(team.name)}</p>
              <p class="text-sm text-slate-400 truncate">${escapeHtml(team.city)} · ${escapeHtml(team.home)}</p>
            </div>
          </a>
          ${renderWatchButton('team', team.code)}
        </div>
        <p class="mt-4 text-sm leading-6 text-slate-300">${escapeHtml(team.identity || team.summary)}</p>
      </article>
    `;
  }

  function renderWatchlistDock() {
    const host = qs("#site-watchlist-dock");
    if (!host) return;
    const entries = getWatchlistEntries();
    if (!entries.teams.length && !entries.players.length) {
      host.innerHTML = "";
      return;
    }
    host.innerHTML = `
      <div class="site-watchlist-dock">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span class="site-section-label">Scout Watchlist</span>
            <h3 class="mt-3 text-xl font-semibold text-white">Your pinned teams and players</h3>
          </div>
          <p class="text-sm text-slate-400">Saved locally on this device</p>
        </div>
        <div class="site-watchlist-grid md:grid-cols-2">
          ${entries.teams.map((team) => `
            <div class="site-watchlist-item">
              <a href="${getTeamHref(team.code)}" class="flex items-center gap-3 min-w-0">
                ${renderTeamStamp(team.code, team.accent)}
                <div class="min-w-0">
                  <p class="font-semibold text-white truncate">${escapeHtml(team.name)}</p>
                  <p class="text-sm text-slate-400 truncate">${escapeHtml(team.city)} · team page</p>
                </div>
              </a>
              ${renderWatchButton('team', team.code)}
            </div>
          `).join('')}
          ${entries.players.map((player) => `
            <div class="site-watchlist-item">
              <a href="${getPlayerHref(player)}" class="min-w-0">
                <p class="font-semibold text-white truncate">${escapeHtml(player.name)}</p>
                <p class="text-sm text-slate-400 truncate">${escapeHtml(player.teamName)} · ${escapeHtml(player.role)}</p>
              </a>
              ${renderWatchButton('player', player.slug)}
            </div>
          `).join('')}
        </div>
      </div>
    `;
    hydrateWatchButtons();
  }

  function createMobileNav(page) {
    if (page === 'home') return;
    let nav = qs('#site-mobile-nav');
    if (!nav) {
      nav = document.createElement('nav');
      nav.id = 'site-mobile-nav';
      nav.className = 'site-mobile-nav';
      document.body.appendChild(nav);
    }
    const mobileItems = [
      { page: 'home', label: 'Home', icon: 'ri-home-5-line', href: '/' },
      { page: 'stream', label: 'Stream', icon: 'ri-broadcast-line', href: '/stream' },
      { page: 'matches', label: 'Matches', icon: 'ri-live-line', href: '/matches' },
      { page: 'teams', label: 'Teams', icon: 'ri-shield-star-line', href: '/teams' },
      { page: 'players', label: 'Players', icon: 'ri-user-star-line', href: '/players' }
    ];
    nav.innerHTML = mobileItems.map((item) => `
      <a href="${item.href}" class="${item.page === page ? 'is-active' : ''}">
        <i class="${item.icon}"></i>
        <span>${escapeHtml(item.label)}</span>
      </a>
    `).join('');
  }

  function renderStandingsTable(rows) {
    return `
      <div class="site-table-wrap">
        <table class="site-data-table">
          <thead>
            <tr>
              <th>Pos</th>
              <th>Team</th>
              <th>P</th>
              <th>W</th>
              <th>L</th>
              <th>NRR</th>
              <th>Pts</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((row, index) => {
              const meta = getTeamMeta(row.team);
              return `
                <tr>
                  <td class="font-semibold text-white">${index + 1}</td>
                  <td>
                    <div class="flex items-center gap-3">
                      ${renderTeamStamp(meta.code, meta.accent)}
                      <div>
                        <p class="font-semibold text-white">${escapeHtml(meta.name)}</p>
                        <p class="text-xs text-slate-400">${escapeHtml(meta.city)}</p>
                      </div>
                    </div>
                  </td>
                  <td>${escapeHtml(row.played)}</td>
                  <td>${escapeHtml(row.won)}</td>
                  <td>${escapeHtml(row.lost)}</td>
                  <td>${escapeHtml(row.nrr)}</td>
                  <td class="font-bold text-white">${escapeHtml(row.points)}</td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderLeaderRows(title, rows, mode) {
    if (!rows.length) {
      return `<div class="site-empty-state">${escapeHtml(title + ' will populate once live performer data is richer.')}</div>`;
    }
    return `
      <div class="site-card-panel p-6">
        <div class="flex items-center justify-between gap-3 mb-5">
          <div>
            <p class="site-section-label">${escapeHtml(mode === 'batting' ? 'Run Charts' : 'Wicket Charts')}</p>
            <h3 class="mt-3 text-2xl font-semibold text-white">${escapeHtml(title)}</h3>
          </div>
          <i class="${mode === 'batting' ? 'ri-bat-line' : 'ri-focus-2-line'} text-2xl text-slate-500"></i>
        </div>
        <div class="space-y-4">
          ${rows.slice(0, 6).map((row, index) => {
            const value = mode === 'batting'
              ? (row.runs != null ? row.runs : row.value || row.strikeRate || '-')
              : (row.wickets != null ? row.wickets : row.value || row.economy || '-');
            const note = mode === 'batting'
              ? ((row.balls != null ? row.balls + ' balls' : row.detail || 'Live batting sample'))
              : ((row.overs != null ? row.overs + ' overs' : row.detail || 'Live bowling sample'));
            return `
              <div class="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-white">${index + 1}</div>
                  <div>
                    <p class="font-semibold text-white">${escapeHtml(row.name || row.player || 'Performer')}</p>
                    <p class="text-sm text-slate-400">${escapeHtml(note)}</p>
                  </div>
                </div>
                <div class="text-right">
                  <p class="text-2xl font-extrabold text-white">${escapeHtml(value)}</p>
                  <p class="text-xs uppercase tracking-[0.18em] text-slate-500">${mode === 'batting' ? 'Runs' : 'Wickets'}</p>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }

  function createShellHeader(page, bundle) {
    const header = qs("#site-shell-header");
    if (!header) return;
    const activePage = getNavPage(page);
    header.innerHTML = `
      <header class="site-topbar">
        <div class="max-w-7xl mx-auto px-4">
          <div class="site-topbar-inner">
            <a href="/" class="flex items-center gap-3">
              <div class="site-brand-badge w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xl">
                <i class="ri-cricket-line"></i>
              </div>
              <div>
                <div class="font-display text-xl font-bold leading-none">CricketLive</div>
                <div class="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-400">Pro</div>
              </div>
            </a>
            <nav class="site-nav-row">
              ${NAV_ITEMS.map((item) => `
                <a href="${item.href}" class="site-nav-link ${item.page === activePage ? 'is-active' : ''}" data-site-nav="${item.page}">
                  <i class="${item.icon}"></i>
                  <span>${escapeHtml(item.label)}</span>
                </a>
              `).join("")}
            </nav>
            <div class="site-action-row flex items-center gap-3">
              <a href="/stream" class="site-action-link site-action-secondary">
                <i class="ri-broadcast-line"></i>
                <span>Watch Live</span>
              </a>
              <a href="/admin" class="site-action-link site-action-primary">
                <i class="ri-settings-4-line"></i>
                <span>Admin</span>
              </a>
            </div>
          </div>
        </div>
      </header>
      <div class="site-ticker-bar">
        <div class="max-w-7xl mx-auto px-4 py-3">
          <div id="site-ticker-track" class="site-ticker-track"></div>
        </div>
      </div>
    `;
    renderTicker(bundle);
  }

  function renderTicker(bundle) {
    const track = qs("#site-ticker-track");
    if (!track) return;
    track.innerHTML = buildTickerItems(bundle)
      .map((item) => `<div class="site-ticker-pill">${item.icon}<span>${item.text}</span></div>`)
      .join("");
  }

  function markActiveNav(page) {
    const activePage = getNavPage(page);
    document.querySelectorAll("[data-site-nav]").forEach((link) => {
      link.classList.toggle("is-active", link.getAttribute("data-site-nav") === activePage);
    });
  }

  function createShellFooter(bundle) {
    const footer = qs("#site-shell-footer") || qs("#site-global-footer");
    if (!footer) return;
    const standings = getStandings(bundle);
    footer.innerHTML = `
      <footer class="site-footer mt-12">
        <div class="max-w-7xl mx-auto px-4 py-10">
          <div id="site-watchlist-dock"></div>
          <div class="grid gap-8 lg:grid-cols-[1.3fr,1fr,1fr]">
            <div>
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xl">
                  <i class="ri-cricket-line"></i>
                </div>
                <div>
                  <p class="font-display text-xl text-white">CricketLive Pro</p>
                  <p class="text-sm text-slate-400">Live scoring, fixtures, stats, stories, and admin-powered control.</p>
                </div>
              </div>
              <p class="mt-5 max-w-2xl text-sm leading-6 text-slate-400">This build now behaves more like a proper cricket product: a live centre plus surrounding match context, dedicated pages, and real navigation paths into fixtures, analytics, teams, newsroom, and video surfaces.</p>
            </div>
            <div>
              <p class="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Navigate</p>
              <div class="mt-4 grid gap-3">
                ${NAV_ITEMS.map((item) => `<a class="site-footer-link text-sm" href="${item.href}">${escapeHtml(item.label)}</a>`).join("")}
              </div>
            </div>
            <div>
              <p class="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Top of table</p>
              <div class="mt-4 space-y-3">
                ${standings.slice(0, 3).map((row, index) => {
                  const meta = getTeamMeta(row.team);
                  return `
                    <div class="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3">
                      <div class="flex items-center gap-3">
                        <span class="text-sm font-bold text-slate-500">${index + 1}</span>
                        <span class="font-semibold text-white">${escapeHtml(meta.name)}</span>
                      </div>
                      <span class="text-sm font-bold text-cyan-400">${escapeHtml(row.points)} pts</span>
                    </div>
                  `;
                }).join("")}
              </div>
            </div>
          </div>
          <div class="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-6 text-sm text-slate-500">
            <p>Updated ${escapeHtml(formatRelative(bundle.state && bundle.state.updatedAt))}</p>
            <p>${escapeHtml(bundle.currentMatch.league)} · ${escapeHtml(bundle.currentMatch.format)}</p>
          </div>
        </div>
      </footer>
    `;
  }

  function renderHero(page, bundle) {
    const meta = PAGE_META[page];
    return `
      <section class="site-page-hero p-6 md:p-8">
        <div class="grid gap-8 xl:grid-cols-[1.3fr,1fr] xl:items-end">
          <div>
            <span class="site-section-label">${escapeHtml(meta.eyebrow)}</span>
            <h1 class="site-section-heading mt-5 text-4xl md:text-5xl text-white">${escapeHtml(meta.title)}</h1>
            <p class="mt-4 max-w-3xl text-base leading-7 text-slate-300 md:text-lg">${escapeHtml(meta.subtitle)}</p>
            <div class="site-meta-list mt-6">
              <span class="site-meta-chip"><i class="ri-timer-line"></i>${escapeHtml(bundle.currentMatch.status)}</span>
              <span class="site-meta-chip"><i class="ri-map-pin-line"></i>${escapeHtml(bundle.currentMatch.venue)}</span>
              <span class="site-meta-chip"><i class="ri-calendar-event-line"></i>${escapeHtml(formatDateTime(bundle.currentMatch.matchDateTime))}</span>
            </div>
          </div>
          <div class="site-card-panel p-5 md:p-6">
            <div class="flex items-center justify-between gap-3">
              ${renderStatus("live")}
              <span class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Match Centre</span>
            </div>
            <div class="mt-5 grid gap-4 sm:grid-cols-2 sm:items-center">
              <div class="space-y-3">
                <div class="flex items-center gap-3">
                  ${renderTeamStamp(bundle.currentMatch.team1Code, getTeamMeta(bundle.currentMatch.team1Code).accent)}
                  <div>
                    <p class="font-semibold text-white">${escapeHtml(bundle.currentMatch.team1)}</p>
                    <p class="text-sm text-slate-400">${escapeHtml(bundle.currentMatch.team1Score)}</p>
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  ${renderTeamStamp(bundle.currentMatch.team2Code, getTeamMeta(bundle.currentMatch.team2Code).accent)}
                  <div>
                    <p class="font-semibold text-white">${escapeHtml(bundle.currentMatch.team2)}</p>
                    <p class="text-sm text-slate-400">${escapeHtml(bundle.currentMatch.team2Score)}</p>
                  </div>
                </div>
              </div>
              <div class="grid gap-3">
                <div class="site-mini-metric">
                  <span class="site-mini-metric-label">Run Rate</span>
                  <span class="site-mini-metric-value">${escapeHtml(bundle.currentMatch.runRate || '-')}</span>
                </div>
                <div class="site-mini-metric">
                  <span class="site-mini-metric-label">Required RR</span>
                  <span class="site-mini-metric-value">${escapeHtml(bundle.currentMatch.reqRR || '-')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  function renderHomeExtension(bundle) {
    const container = qs("#advanced-home-hub");
    if (!container) return;
    const stories = buildStories(bundle);
    const videos = buildVideos(bundle);
    const standings = getStandings(bundle);
    const poll = getPollSummary(bundle);
    const pressure = getPressure(bundle);
    container.innerHTML = `
      <section class="mt-10 space-y-8">
        <div class="grid gap-6 xl:grid-cols-[1.35fr,1fr]">
          <div class="site-card-panel p-6 md:p-7">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <span class="site-section-label">Matchday Lead</span>
              <a href="/news" class="text-sm font-semibold text-cyan-400">Open newsroom</a>
            </div>
            <h2 class="site-section-heading mt-5 text-3xl text-white">${escapeHtml(stories[0] ? stories[0].title : bundle.currentMatch.title)}</h2>
            <p class="mt-4 max-w-3xl text-base leading-7 text-slate-300">${escapeHtml(stories[0] ? stories[0].summary : bundle.currentMatch.status)}</p>
            <div class="mt-6 grid gap-4 md:grid-cols-3">
              <div class="site-mini-metric">
                <span class="site-mini-metric-label">Pressure Index</span>
                <span class="site-mini-metric-value">${escapeHtml(pressure.pressureIndex)}</span>
              </div>
              <div class="site-mini-metric">
                <span class="site-mini-metric-label">Fan Pulse</span>
                <span class="site-mini-metric-value">${escapeHtml(poll.team1Percent)}%</span>
              </div>
              <div class="site-mini-metric">
                <span class="site-mini-metric-label">Updated</span>
                <span class="site-mini-metric-value text-lg">${escapeHtml(formatRelative(bundle.state && bundle.state.updatedAt))}</span>
              </div>
            </div>
          </div>
          <div class="space-y-6">
            <div class="site-card-panel p-6">
              <div class="flex items-center justify-between gap-3">
                <span class="site-section-label">Pressure Centre</span>
                <a href="/stats" class="text-sm font-semibold text-cyan-400">Full stats</a>
              </div>
              <h3 class="mt-4 text-2xl font-semibold text-white">${escapeHtml(pressure.pressureLabel || 'Managed')}</h3>
              <p class="mt-3 text-sm leading-6 text-slate-300">${escapeHtml(pressure.summary)}</p>
              <div class="mt-4 site-progress"><span style="width:${Math.max(8, Math.min(100, Number(pressure.pressureIndex || 0)))}%"></span></div>
              <p class="mt-4 text-sm text-slate-400">${escapeHtml(pressure.focusLine)}</p>
            </div>
            <div class="site-card-panel p-6">
              <div class="flex items-center justify-between gap-3">
                <span class="site-section-label">Fan Poll</span>
                <span class="text-xs uppercase tracking-[0.18em] text-slate-500">${escapeHtml(formatNumber(poll.totalVotes))} votes</span>
              </div>
              <p class="mt-4 text-white font-semibold">${escapeHtml(poll.question)}</p>
              <div class="mt-4 grid gap-3">
                <div>
                  <div class="flex items-center justify-between text-sm text-slate-300"><span>${escapeHtml(bundle.currentMatch.team1)}</span><span>${escapeHtml(poll.team1Percent)}%</span></div>
                  <div class="mt-2 site-progress"><span style="width:${poll.team1Percent}%"></span></div>
                </div>
                <div>
                  <div class="flex items-center justify-between text-sm text-slate-300"><span>${escapeHtml(bundle.currentMatch.team2)}</span><span>${escapeHtml(poll.team2Percent)}%</span></div>
                  <div class="mt-2 site-progress"><span style="width:${poll.team2Percent}%"></span></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="grid gap-5 md:grid-cols-3">
          <a href="/stream" class="site-card-panel site-card-hover p-5">
            <span class="site-section-label">Watch</span>
            <h3 class="mt-4 text-xl font-semibold text-white">Open live stream page</h3>
            <p class="mt-3 text-sm leading-6 text-slate-300">Video, live score, pressure board, and watchlist in one responsive screen.</p>
          </a>
          <a href="/players" class="site-card-panel site-card-hover p-5">
            <span class="site-section-label">Scout</span>
            <h3 class="mt-4 text-xl font-semibold text-white">Browse player profiles</h3>
            <p class="mt-3 text-sm leading-6 text-slate-300">Search roles, open richer player pages, and pin your watchlist for matchday.</p>
          </a>
          <a href="/teams" class="site-card-panel site-card-hover p-5">
            <span class="site-section-label">Clubs</span>
            <h3 class="mt-4 text-xl font-semibold text-white">Open team-specific pages</h3>
            <p class="mt-3 text-sm leading-6 text-slate-300">Move from the league hub into deeper club identity, fixtures, and squad cores.</p>
          </a>
        </div>

        <div>
          <div class="flex items-center justify-between gap-3 mb-4">
            <div>
              <span class="site-section-label">Matches</span>
              <h3 class="site-section-heading mt-3 text-2xl text-white">Broader match slate</h3>
            </div>
            <a href="/matches" class="text-sm font-semibold text-cyan-400">View all matches</a>
          </div>
          <div class="grid gap-5 xl:grid-cols-4 md:grid-cols-2">${buildFeatureCards(bundle)}</div>
        </div>

        <div class="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
          <div>
            <div class="flex items-center justify-between gap-3 mb-4">
              <div>
                <span class="site-section-label">Newsroom</span>
                <h3 class="site-section-heading mt-3 text-2xl text-white">Stories around the live game</h3>
              </div>
              <a href="/news" class="text-sm font-semibold text-cyan-400">Open news</a>
            </div>
            <div class="grid gap-5 md:grid-cols-2">${renderStories(stories.slice(0, 4))}</div>
          </div>
          <div class="site-card-panel p-6">
            <div class="flex items-center justify-between gap-3">
              <div>
                <span class="site-section-label">Table Snapshot</span>
                <h3 class="site-section-heading mt-3 text-2xl text-white">Playoff watch</h3>
              </div>
              <a href="/stats" class="text-sm font-semibold text-cyan-400">Standings</a>
            </div>
            <div class="mt-5 space-y-3">
              ${standings.slice(0, 5).map((row, index) => {
                const meta = getTeamMeta(row.team);
                return `
                  <div class="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3">
                    <div class="flex items-center gap-3">
                      <span class="text-sm font-bold text-slate-500">${index + 1}</span>
                      <span class="font-semibold text-white">${escapeHtml(meta.name)}</span>
                    </div>
                    <div class="text-right">
                      <p class="font-bold text-cyan-400">${escapeHtml(row.points)} pts</p>
                      <p class="text-xs text-slate-500">NRR ${escapeHtml(row.nrr)}</p>
                    </div>
                  </div>
                `;
              }).join("")}
            </div>
          </div>
        </div>

        <div>
          <div class="flex items-center justify-between gap-3 mb-4">
            <div>
              <span class="site-section-label">Video Hub</span>
              <h3 class="site-section-heading mt-3 text-2xl text-white">Highlights and quick replay cards</h3>
            </div>
            <a href="/videos" class="text-sm font-semibold text-cyan-400">Open videos</a>
          </div>
          <div class="grid gap-5 md:grid-cols-2 xl:grid-cols-3">${renderVideoCards(videos.slice(0, 3))}</div>
        </div>
      </section>
    `;
  }

  function renderMatchesPage(bundle) {
    const liveMatches = toArray(bundle.state && bundle.state.liveMatches);
    const upcomingMatches = toArray(bundle.state && bundle.state.upcomingMatches);
    const recentResults = toArray(bundle.state && bundle.state.recentResults);
    const timeline = toArray(bundle.state && bundle.state.timelineEvents).slice(0, 6);
    const pressure = getPressure(bundle);
    return `
      ${renderHero('matches', bundle)}
      <section class="mt-8 grid gap-6 xl:grid-cols-[1.25fr,0.75fr]">
        <div class="site-card-panel p-6 md:p-7">
          <div class="flex items-center justify-between gap-3">
            <div>
              <span class="site-section-label">Now Live</span>
              <h2 class="site-section-heading mt-3 text-3xl text-white">${escapeHtml(bundle.currentMatch.team1)} vs ${escapeHtml(bundle.currentMatch.team2)}</h2>
            </div>
            <a href="/stream" class="site-action-link site-action-primary">Open stream page</a>
          </div>
          <div class="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div class="site-mini-metric"><span class="site-mini-metric-label">Score</span><span class="site-mini-metric-value text-xl">${escapeHtml(bundle.currentMatch.team1Score)}</span></div>
            <div class="site-mini-metric"><span class="site-mini-metric-label">Overs</span><span class="site-mini-metric-value text-xl">${escapeHtml(bundle.currentMatch.overs || '-')}</span></div>
            <div class="site-mini-metric"><span class="site-mini-metric-label">Run Rate</span><span class="site-mini-metric-value text-xl">${escapeHtml(bundle.currentMatch.runRate || '-')}</span></div>
            <div class="site-mini-metric"><span class="site-mini-metric-label">Req RR</span><span class="site-mini-metric-value text-xl">${escapeHtml(bundle.currentMatch.reqRR || '-')}</span></div>
          </div>
          <p class="mt-5 text-sm leading-7 text-slate-300">${escapeHtml(bundle.currentMatch.status)}</p>
        </div>
        <div class="site-card-panel p-6">
          <span class="site-section-label">Pressure Read</span>
          <h3 class="mt-4 text-2xl font-semibold text-white">${escapeHtml(pressure.pressureLabel)}</h3>
          <p class="mt-3 text-sm leading-6 text-slate-300">${escapeHtml(pressure.summary)}</p>
          <div class="mt-5 site-progress"><span style="width:${Math.max(10, Math.min(100, Number(pressure.pressureIndex || 0)))}%"></span></div>
          <div class="mt-5 grid gap-3">
            ${(pressure.levers || []).slice(0, 3).map((lever) => `
              <div class="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <div class="flex items-center justify-between gap-3">
                  <p class="font-semibold text-white">${escapeHtml(lever.label)}</p>
                  <span class="text-sm font-bold text-cyan-400">${escapeHtml(lever.value)}</span>
                </div>
                <p class="mt-2 text-sm text-slate-400">${escapeHtml(lever.note)}</p>
              </div>
            `).join("")}
          </div>
        </div>
      </section>

      <section class="mt-8 grid gap-8 xl:grid-cols-[1fr,1fr]">
        <div>
          <div class="mb-4">
            <span class="site-section-label">Live and Next</span>
            <h2 class="site-section-heading mt-3 text-2xl text-white">Current coverage window</h2>
          </div>
          <div class="space-y-5">${renderFixtureRows(liveMatches.concat(upcomingMatches.slice(0, 3)), 'No live or upcoming fixtures are listed yet.')}</div>
        </div>
        <div>
          <div class="mb-4">
            <span class="site-section-label">Results</span>
            <h2 class="site-section-heading mt-3 text-2xl text-white">Recent scorelines</h2>
          </div>
          <div class="space-y-5">${renderFixtureRows(recentResults.slice(0, 4), 'Recent result cards will appear here after matches conclude.')}</div>
        </div>
      </section>

      <section class="mt-8">
        <div class="mb-4">
          <span class="site-section-label">Moments</span>
          <h2 class="site-section-heading mt-3 text-2xl text-white">Timeline that matters</h2>
        </div>
        <div class="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          ${timeline.length ? timeline.map((event) => `
            <article class="site-card-panel site-card-hover p-5">
              <div class="flex items-center justify-between gap-3">
                <span class="site-section-label">${escapeHtml(event.badge || event.type || 'Update')}</span>
                <span class="text-xs text-slate-500">${escapeHtml(formatRelative(event.timestamp))}</span>
              </div>
              <h3 class="mt-4 text-xl font-semibold text-white">${escapeHtml(event.title || 'Match event')}</h3>
              <p class="mt-3 text-sm leading-6 text-slate-300">${escapeHtml(event.detail || '')}</p>
            </article>
          `).join('') : '<div class="site-empty-state">Timeline items will appear here as the match story develops.</div>'}
        </div>
      </section>
    `;
  }

  function renderSchedulePage(bundle) {
    const fixtures = sortFixtures(getAllFixtures(bundle.state));
    const venues = Array.from(new Set(fixtures.map((match) => match.venue).filter(Boolean))).slice(0, 6);
    return `
      ${renderHero('schedule', bundle)}
      <section class="mt-8 grid gap-6 xl:grid-cols-[1.25fr,0.75fr]">
        <div class="site-card-panel p-6">
          <div class="grid gap-4 sm:grid-cols-3">
            <div class="site-mini-metric"><span class="site-mini-metric-label">Fixtures Listed</span><span class="site-mini-metric-value">${escapeHtml(fixtures.length)}</span></div>
            <div class="site-mini-metric"><span class="site-mini-metric-label">Live Right Now</span><span class="site-mini-metric-value">${escapeHtml(toArray(bundle.state && bundle.state.liveMatches).length)}</span></div>
            <div class="site-mini-metric"><span class="site-mini-metric-label">Upcoming</span><span class="site-mini-metric-value">${escapeHtml(toArray(bundle.state && bundle.state.upcomingMatches).length)}</span></div>
          </div>
        </div>
        <div class="site-card-panel p-6">
          <span class="site-section-label">Venue Watch</span>
          <div class="mt-4 flex flex-wrap gap-2">
            ${venues.map((venue) => `<span class="site-meta-chip"><i class="ri-map-pin-line"></i>${escapeHtml(venue)}</span>`).join('') || '<span class="site-empty-state">Venue list will build out as fixtures are added.</span>'}
          </div>
        </div>
      </section>

      <section class="mt-8">
        <div class="mb-4">
          <span class="site-section-label">All Fixtures</span>
          <h2 class="site-section-heading mt-3 text-2xl text-white">Season flow</h2>
        </div>
        <div class="space-y-5">${renderFixtureRows(fixtures, 'No fixtures are currently available.')}</div>
      </section>
    `;
  }

  function renderStatsPage(bundle) {
    const standings = getStandings(bundle);
    const performers = getPerformers(bundle);
    const pressure = getPressure(bundle);
    const paceMargin = Number(pressure.pace && pressure.pace.margin || 0);
    const formattedPaceMargin = `${paceMargin > 0 ? '+' : ''}${paceMargin.toFixed(2)}`;
    return `
      ${renderHero('stats', bundle)}
      <section class="mt-8 grid gap-6 lg:grid-cols-4">
        <div class="site-mini-metric"><span class="site-mini-metric-label">Pressure Index</span><span class="site-mini-metric-value">${escapeHtml(pressure.pressureIndex)}</span></div>
        <div class="site-mini-metric"><span class="site-mini-metric-label">Win Swing</span><span class="site-mini-metric-value text-xl">${escapeHtml(pressure.winSwing && pressure.winSwing.label || 'Balanced')}</span></div>
        <div class="site-mini-metric"><span class="site-mini-metric-label">Current Pace</span><span class="site-mini-metric-value">${escapeHtml(pressure.pace && pressure.pace.currentRate || '-')}</span></div>
        <div class="site-mini-metric"><span class="site-mini-metric-label">Margin vs Benchmark</span><span class="site-mini-metric-value">${escapeHtml(formattedPaceMargin)}</span></div>
      </section>

      <section class="mt-8 grid gap-8 xl:grid-cols-[1.15fr,0.85fr]">
        <div>
          <div class="mb-4">
            <span class="site-section-label">League Table</span>
            <h2 class="site-section-heading mt-3 text-2xl text-white">Playoff picture</h2>
          </div>
          ${renderStandingsTable(standings)}
        </div>
        <div class="space-y-6">
          <div class="site-card-panel p-6">
            <span class="site-section-label">Pressure Summary</span>
            <h3 class="mt-4 text-2xl font-semibold text-white">${escapeHtml(pressure.pressureLabel)}</h3>
            <p class="mt-3 text-sm leading-6 text-slate-300">${escapeHtml(pressure.summary)}</p>
            <div class="mt-4 site-progress"><span style="width:${Math.max(10, Math.min(100, Number(pressure.pressureIndex || 0)))}%"></span></div>
            <div class="mt-5 space-y-3">
              ${(pressure.windows || []).slice(0, 3).map((window) => `
                <div class="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                  <div class="flex items-center justify-between gap-3">
                    <p class="font-semibold text-white">${escapeHtml(window.title)}</p>
                    <span class="text-sm font-bold text-cyan-400">${escapeHtml(window.target)}</span>
                  </div>
                  <p class="mt-2 text-sm text-slate-400">${escapeHtml(window.note)}</p>
                </div>
              `).join('') || '<div class="site-empty-state">Pressure windows will appear here when richer match data is available.</div>'}
            </div>
          </div>
          <div class="site-card-panel p-6">
            <span class="site-section-label">Tactical Line</span>
            <p class="mt-4 text-base leading-7 text-white">${escapeHtml(pressure.focusLine)}</p>
            <div class="mt-5 grid gap-3">
              ${(pressure.lanes || []).slice(0, 3).map((lane) => `
                <div class="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                  <div class="flex items-center justify-between gap-3">
                    <p class="font-semibold text-white">${escapeHtml(lane.title)}</p>
                    <span class="text-sm font-bold text-cyan-400">${escapeHtml(lane.overTarget)} runs</span>
                  </div>
                  <p class="mt-2 text-sm text-slate-400">${escapeHtml(lane.note)}</p>
                </div>
              `).join('') || '<div class="site-empty-state">Live lanes will appear once the match engine has enough ball-by-ball context.</div>'}
            </div>
          </div>
        </div>
      </section>

      <section class="mt-8 grid gap-8 xl:grid-cols-2">
        ${renderLeaderRows('Batting leaders', performers.batsmen, 'batting')}
        ${renderLeaderRows('Bowling leaders', performers.bowlers, 'bowling')}
      </section>
    `;
  }

  function renderTeamsPage(bundle) {
    const currentTeams = [bundle.currentMatch.team1, bundle.currentMatch.team2].filter(Boolean).map((team) => getTeamMeta(team));
    return `
      ${renderHero('teams', bundle)}
      <section class="mt-8 grid gap-6 xl:grid-cols-[1fr,1fr]">
        ${currentTeams.map((team) => `
          <div class="site-card-panel p-6 md:p-7">
            <div class="flex items-start justify-between gap-4">
              <div class="flex items-center gap-4">
                ${renderTeamStamp(team.code, team.accent)}
                <div>
                  <span class="site-section-label">Current spotlight</span>
                  <h2 class="site-section-heading mt-3 text-3xl text-white">${escapeHtml(team.name)}</h2>
                </div>
              </div>
              ${renderWatchButton('team', team.code)}
            </div>
            <p class="mt-4 text-sm leading-6 text-slate-300">${escapeHtml(team.summary)}</p>
            <div class="mt-5 grid gap-4 sm:grid-cols-3">
              <div class="site-mini-metric"><span class="site-mini-metric-label">Home</span><span class="site-mini-metric-value text-lg">${escapeHtml(team.home)}</span></div>
              <div class="site-mini-metric"><span class="site-mini-metric-label">Captain</span><span class="site-mini-metric-value text-lg">${escapeHtml(team.captain)}</span></div>
              <div class="site-mini-metric"><span class="site-mini-metric-label">Titles</span><span class="site-mini-metric-value">${escapeHtml(team.titles)}</span></div>
            </div>
            <div class="mt-5 flex items-center justify-between gap-3">
              <a href="${getTeamHref(team.code)}" class="site-inline-link">Open team page</a>
              <span class="text-sm text-slate-500">${escapeHtml(team.identity || team.summary)}</span>
            </div>
          </div>
        `).join('')}
      </section>

      <section class="mt-8">
        <div class="mb-4">
          <span class="site-section-label">Clubs</span>
          <h2 class="site-section-heading mt-3 text-2xl text-white">League-wide team pages</h2>
        </div>
        <div class="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          ${TEAM_CATALOG.map((team) => renderTeamMiniCard(getTeamMeta(team.code))).join('')}
        </div>
      </section>
    `;
  }

  function renderStreamPage(bundle) {
    const stream = getStreamConfig(bundle);
    const pressure = getPressure(bundle);
    const poll = getPollSummary(bundle);
    const stories = buildStories(bundle).slice(0, 3);
    const timeline = toArray(bundle.state && bundle.state.timelineEvents).slice(0, 5);
    const assistantBalls = toArray(pressure.assistant && pressure.assistant.recentBalls).slice(-8);
    const watched = getWatchlistEntries();
    const watchCards = []
      .concat(watched.players.slice(0, 3).map((player) => `<div class="site-watchlist-item"><a href="${getPlayerHref(player)}" class="min-w-0"><p class="font-semibold text-white">${escapeHtml(player.name)}</p><p class="text-sm text-slate-400">${escapeHtml(player.teamName)}</p></a>${renderWatchButton('player', player.slug)}</div>`))
      .concat(watched.teams.slice(0, 2).map((team) => `<div class="site-watchlist-item"><a href="${getTeamHref(team.code)}" class="min-w-0"><p class="font-semibold text-white">${escapeHtml(team.name)}</p><p class="text-sm text-slate-400">${escapeHtml(team.city)}</p></a>${renderWatchButton('team', team.code)}</div>`));
    return `
      ${renderHero('stream', bundle)}
      <section class="mt-8 grid gap-6 xl:grid-cols-[1.35fr,0.65fr]">
        <div class="space-y-6">
          <div class="site-stream-frame">
            ${stream.embeddable ? `<iframe src="${escapeHtml(stream.url)}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen loading="lazy"></iframe>` : `
              <div class="site-stream-placeholder">
                <div>
                  <div class="mx-auto w-20 h-20 rounded-full border border-slate-700 bg-slate-900 flex items-center justify-center text-3xl text-white"><i class="ri-live-line"></i></div>
                  <h2 class="mt-5 text-2xl font-semibold text-white">Live stream panel ready</h2>
                  <p class="mt-3 max-w-xl text-sm leading-7 text-slate-300">A direct embeddable stream is not available in the current state, but the full match companion remains active and the stream link can still open in a new tab.</p>
                </div>
              </div>
            `}
          </div>
          <div class="grid gap-4 md:grid-cols-4">
            <div class="site-mini-metric"><span class="site-mini-metric-label">Status</span><span class="site-mini-metric-value text-lg">${escapeHtml(stream.status || 'offline')}</span></div>
            <div class="site-mini-metric"><span class="site-mini-metric-label">Platform</span><span class="site-mini-metric-value text-lg">${escapeHtml(stream.platform || 'custom')}</span></div>
            <div class="site-mini-metric"><span class="site-mini-metric-label">Viewers</span><span class="site-mini-metric-value text-lg">${escapeHtml(formatNumber(stream.viewerCount || 0))}</span></div>
            <div class="site-mini-metric"><span class="site-mini-metric-label">Open</span><a class="site-inline-link mt-2" href="${escapeHtml(stream.url || '/')}" target="_blank" rel="noreferrer">Launch source</a></div>
          </div>
          <div class="site-card-panel p-6">
            <div class="flex items-center justify-between gap-3">
              <div>
                <span class="site-section-label">Companion Mode</span>
                <h2 class="site-section-heading mt-3 text-2xl text-white">Stream plus match intelligence</h2>
              </div>
              <a href="/matches" class="site-inline-link">Match hub</a>
            </div>
            <div class="mt-5 grid gap-4 md:grid-cols-3">
              <div class="site-mini-metric"><span class="site-mini-metric-label">Pressure</span><span class="site-mini-metric-value">${escapeHtml(pressure.pressureIndex)}</span></div>
              <div class="site-mini-metric"><span class="site-mini-metric-label">Trend</span><span class="site-mini-metric-value text-lg">${escapeHtml(pressure.assistant && pressure.assistant.trendLabel || 'Live')}</span></div>
              <div class="site-mini-metric"><span class="site-mini-metric-label">Urgency</span><span class="site-mini-metric-value text-lg">${escapeHtml(pressure.assistant && pressure.assistant.urgency || 'Managed')}</span></div>
            </div>
            <p class="mt-5 text-sm leading-7 text-slate-300">${escapeHtml(pressure.focusLine)}</p>
            <div class="mt-4 site-chip-grid">
              ${assistantBalls.length ? assistantBalls.map((ball) => `<span class="site-meta-chip">${escapeHtml(ball)}</span>`).join('') : '<span class="site-empty-state">Recent-ball intelligence will appear here as the feed grows.</span>'}
            </div>
          </div>
          <div class="site-card-panel p-6">
            <span class="site-section-label">Timeline</span>
            <div class="mt-5 site-compact-list">
              ${timeline.map((event) => `
                <div class="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                  <div class="flex items-center justify-between gap-3">
                    <p class="font-semibold text-white">${escapeHtml(event.title || 'Update')}</p>
                    <span class="text-xs text-slate-500">${escapeHtml(formatRelative(event.timestamp))}</span>
                  </div>
                  <p class="mt-2 text-sm text-slate-400">${escapeHtml(event.detail || '')}</p>
                </div>
              `).join('') || '<div class="site-empty-state">Timeline events will populate as live updates are published.</div>'}
            </div>
          </div>
        </div>
        <div class="space-y-6">
          <div class="site-card-panel p-6">
            <span class="site-section-label">Score Pulse</span>
            <h3 class="mt-4 text-2xl font-semibold text-white">${escapeHtml(bundle.currentMatch.team1)} vs ${escapeHtml(bundle.currentMatch.team2)}</h3>
            <div class="mt-5 space-y-3">
              <div class="site-watchlist-item"><span class="font-semibold text-white">${escapeHtml(bundle.currentMatch.team1)}</span><span class="text-cyan-400 font-bold">${escapeHtml(bundle.currentMatch.team1Score)}</span></div>
              <div class="site-watchlist-item"><span class="font-semibold text-white">${escapeHtml(bundle.currentMatch.team2)}</span><span class="text-cyan-400 font-bold">${escapeHtml(bundle.currentMatch.team2Score)}</span></div>
            </div>
            <p class="mt-4 text-sm leading-6 text-slate-300">${escapeHtml(bundle.currentMatch.status)}</p>
          </div>
          <div class="site-card-panel p-6">
            <div class="flex items-center justify-between gap-3">
              <span class="site-section-label">Fan Split</span>
              <span class="text-xs uppercase tracking-[0.18em] text-slate-500">${escapeHtml(formatNumber(poll.totalVotes))} votes</span>
            </div>
            <div class="mt-5 grid gap-3">
              <div>
                <div class="flex items-center justify-between text-sm text-slate-300"><span>${escapeHtml(bundle.currentMatch.team1)}</span><span>${escapeHtml(poll.team1Percent)}%</span></div>
                <div class="mt-2 site-progress"><span style="width:${poll.team1Percent}%"></span></div>
              </div>
              <div>
                <div class="flex items-center justify-between text-sm text-slate-300"><span>${escapeHtml(bundle.currentMatch.team2)}</span><span>${escapeHtml(poll.team2Percent)}%</span></div>
                <div class="mt-2 site-progress"><span style="width:${poll.team2Percent}%"></span></div>
              </div>
            </div>
          </div>
          <div class="site-card-panel p-6">
            <div class="flex items-center justify-between gap-3">
              <span class="site-section-label">Advanced Feature</span>
              <span class="text-xs uppercase tracking-[0.18em] text-slate-500">Scout Watchlist</span>
            </div>
            <p class="mt-4 text-sm leading-6 text-slate-300">Pin players and teams from any page. They stay visible across the site so the stream page can double as a personal scouting desk.</p>
            <div class="mt-5 site-compact-list">
              ${watchCards.length ? watchCards.join('') : '<div class="site-empty-state">Use the watchlist buttons on team and player cards to build your own live scouting stack.</div>'}
            </div>
          </div>
          <div class="site-card-panel p-6">
            <span class="site-section-label">Desk Notes</span>
            <div class="mt-5 site-compact-list">${renderStories(stories)}</div>
          </div>
        </div>
      </section>
    `;
  }

  function renderPlayersPage(bundle) {
    const allPlayers = getAllPlayerProfiles();
    const watchlist = getWatchlistEntries();
    return `
      ${renderHero('players', bundle)}
      <section class="mt-8 grid gap-6 xl:grid-cols-[0.9fr,1.1fr]">
        <div class="site-card-panel p-6">
          <span class="site-section-label">Watchlist</span>
          <h2 class="mt-4 text-2xl font-semibold text-white">Personal scouting board</h2>
          <p class="mt-3 text-sm leading-6 text-slate-300">Save players and teams from around the site. This is the extra feature layer added on top of the new pages so your browsing flow can become more intentional than a generic cricket portal.</p>
          <div class="mt-5 grid gap-4 sm:grid-cols-2">
            <div class="site-mini-metric"><span class="site-mini-metric-label">Saved players</span><span class="site-mini-metric-value">${escapeHtml(watchlist.players.length)}</span></div>
            <div class="site-mini-metric"><span class="site-mini-metric-label">Saved teams</span><span class="site-mini-metric-value">${escapeHtml(watchlist.teams.length)}</span></div>
          </div>
          <div class="mt-5 site-compact-list">
            ${watchlist.players.slice(0, 4).map((player) => `<div class="site-watchlist-item"><a href="${getPlayerHref(player)}" class="min-w-0"><p class="font-semibold text-white">${escapeHtml(player.name)}</p><p class="text-sm text-slate-400">${escapeHtml(player.teamName)} · ${escapeHtml(player.role)}</p></a>${renderWatchButton('player', player.slug)}</div>`).join('') || '<div class="site-empty-state">No players pinned yet. Use the watchlist buttons below to build your shortlist.</div>'}
          </div>
        </div>
        <div class="site-card-panel p-6">
          <span class="site-section-label">Directory Controls</span>
          <div class="mt-5 grid gap-4">
            <input id="player-search" class="site-filter-search" type="search" placeholder="Search players, roles, or teams">
            <div class="site-filter-row" id="player-team-filters">
              <button class="site-filter-button is-active" data-filter-kind="team" data-filter-value="all">All Teams</button>
              ${TEAM_CATALOG.map((team) => `<button class="site-filter-button" data-filter-kind="team" data-filter-value="${team.code}">${escapeHtml(team.code)}</button>`).join('')}
            </div>
            <div class="site-filter-row" id="player-role-filters">
              <button class="site-filter-button is-active" data-filter-kind="role" data-filter-value="all">All Roles</button>
              <button class="site-filter-button" data-filter-kind="role" data-filter-value="opener">Openers</button>
              <button class="site-filter-button" data-filter-kind="role" data-filter-value="batter">Batters</button>
              <button class="site-filter-button" data-filter-kind="role" data-filter-value="all-rounder">All-rounders</button>
              <button class="site-filter-button" data-filter-kind="role" data-filter-value="bowler">Bowlers</button>
              <button class="site-filter-button" data-filter-kind="role" data-filter-value="keeper">Keepers</button>
            </div>
          </div>
        </div>
      </section>

      <section class="mt-8">
        <div class="mb-4 flex items-center justify-between gap-3">
          <div>
            <span class="site-section-label">Player Directory</span>
            <h2 class="site-section-heading mt-3 text-2xl text-white">Matchday profiles</h2>
          </div>
          <span id="players-grid-count" class="text-sm text-slate-400">${allPlayers.length} profiles</span>
        </div>
        <div id="players-grid" class="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          ${allPlayers.map((player) => renderPlayerCard(player)).join('')}
        </div>
        <div id="players-grid-empty" class="site-empty-state mt-5 hidden">No players match the current filters.</div>
      </section>
    `;
  }

  function renderPlayerDetailPage(bundle) {
    const player = getPlayerProfileBySlug(getCurrentPlayerSlugFromPath());
    if (!player) {
      return `<section class="site-card-panel p-8"><p class="text-white text-xl font-semibold">Player profile not found.</p><p class="mt-3 text-slate-400">Return to the <a href="/players" class="site-inline-link">players hub</a> and choose another profile.</p></section>`;
    }
    const team = getTeamMeta(player.teamCode);
    const relatedPlayers = getPlayersForTeam(player.teamCode).filter((entry) => entry.slug !== player.slug).slice(0, 3);
    const fixtures = getTeamFixtures(bundle, player.teamCode).slice(0, 3);
    return `
      <section class="site-profile-hero">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="flex items-center gap-4">
            ${renderTeamStamp(team.code, team.accent)}
            <div>
              <span class="site-section-label">Player Profile</span>
              <h1 class="mt-4 text-4xl font-semibold text-white">${escapeHtml(player.name)}</h1>
              <p class="mt-2 text-base text-slate-300">${escapeHtml(team.name)} · ${escapeHtml(player.role)} · ${escapeHtml(player.country)}</p>
            </div>
          </div>
          ${renderWatchButton('player', player.slug)}
        </div>
        <p class="text-base leading-8 text-slate-300">${escapeHtml(player.summary)}</p>
        <div class="site-meta-list">
          <span class="site-meta-chip"><i class="ri-bat-line"></i>${escapeHtml(player.battingStyle)}</span>
          <span class="site-meta-chip"><i class="ri-focus-2-line"></i>${escapeHtml(player.bowlingStyle)}</span>
          <a class="site-meta-chip" href="${getTeamHref(team.code)}"><i class="ri-shield-star-line"></i>${escapeHtml(team.name)}</a>
        </div>
        <div class="site-rating-grid">
          <div class="site-rating-card"><p class="text-xs uppercase tracking-[0.18em] text-slate-500">Impact</p><p class="mt-3 text-3xl font-bold text-white">${escapeHtml(player.impact)}</p></div>
          <div class="site-rating-card"><p class="text-xs uppercase tracking-[0.18em] text-slate-500">Powerplay</p><div class="mt-3 site-progress"><span style="width:${player.powerplay}%"></span></div><p class="mt-2 text-sm text-slate-300">${escapeHtml(player.powerplay)}/100</p></div>
          <div class="site-rating-card"><p class="text-xs uppercase tracking-[0.18em] text-slate-500">Middle overs</p><div class="mt-3 site-progress"><span style="width:${player.middle}%"></span></div><p class="mt-2 text-sm text-slate-300">${escapeHtml(player.middle)}/100</p></div>
          <div class="site-rating-card"><p class="text-xs uppercase tracking-[0.18em] text-slate-500">Death phase</p><div class="mt-3 site-progress"><span style="width:${player.death}%"></span></div><p class="mt-2 text-sm text-slate-300">${escapeHtml(player.death)}/100</p></div>
        </div>
      </section>

      <section class="mt-8 grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
        <div class="site-card-panel p-6">
          <span class="site-section-label">Scouting Report</span>
          <p class="mt-4 text-base leading-7 text-white">${escapeHtml(player.watch)}</p>
          <div class="mt-5 site-chip-grid">
            ${player.specialties.map((item) => `<span class="site-meta-chip">${escapeHtml(item)}</span>`).join('')}
          </div>
          <div class="mt-5 site-compact-list">
            ${player.recentForm.map((item) => `<div class="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-300">${escapeHtml(item)}</div>`).join('')}
          </div>
        </div>
        <div class="site-card-panel p-6">
          <span class="site-section-label">Team Context</span>
          <h2 class="mt-4 text-2xl font-semibold text-white">How ${escapeHtml(player.name)} fits ${escapeHtml(team.name)}</h2>
          <p class="mt-3 text-sm leading-7 text-slate-300">${escapeHtml(team.gameModel || team.summary)}</p>
          <div class="mt-5 grid gap-4 md:grid-cols-2">
            <div class="site-rating-card"><p class="text-xs uppercase tracking-[0.18em] text-slate-500">Club identity</p><p class="mt-3 text-sm leading-6 text-slate-300">${escapeHtml(team.identity || team.summary)}</p></div>
            <div class="site-rating-card"><p class="text-xs uppercase tracking-[0.18em] text-slate-500">Venue edge</p><p class="mt-3 text-sm leading-6 text-slate-300">${escapeHtml(team.venueEdge || team.home)}</p></div>
          </div>
        </div>
      </section>

      <section class="mt-8 grid gap-6 xl:grid-cols-[1fr,1fr]">
        <div>
          <div class="mb-4"><span class="site-section-label">Related Players</span><h2 class="site-section-heading mt-3 text-2xl text-white">Same squad core</h2></div>
          <div class="grid gap-5 md:grid-cols-2">${relatedPlayers.map((entry) => renderPlayerCard(entry)).join('') || '<div class="site-empty-state">Related player cards will appear here.</div>'}</div>
        </div>
        <div>
          <div class="mb-4"><span class="site-section-label">Fixtures</span><h2 class="site-section-heading mt-3 text-2xl text-white">Upcoming team window</h2></div>
          <div class="space-y-5">${renderFixtureRows(fixtures, 'No team fixtures are available right now.')}</div>
        </div>
      </section>
    `;
  }

  function renderTeamDetailPage(bundle) {
    const team = getTeamMeta(getCurrentTeamCodeFromPath());
    if (!team.code || team.code === 'T1') {
      return `<section class="site-card-panel p-8"><p class="text-white text-xl font-semibold">Team page not found.</p><p class="mt-3 text-slate-400">Return to the <a href="/teams" class="site-inline-link">teams hub</a> and choose another club.</p></section>`;
    }
    const players = getPlayersForTeam(team.code);
    const fixtures = getTeamFixtures(bundle, team.code);
    const stories = buildStories(bundle).filter((story) => (story.title + ' ' + story.summary).toLowerCase().includes(team.code.toLowerCase()) || (story.title + ' ' + story.summary).toLowerCase().includes(team.name.toLowerCase())).slice(0, 3);
    return `
      <section class="site-profile-hero">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="flex items-center gap-4">
            ${renderTeamStamp(team.code, team.accent)}
            <div>
              <span class="site-section-label">Team Profile</span>
              <h1 class="mt-4 text-4xl font-semibold text-white">${escapeHtml(team.name)}</h1>
              <p class="mt-2 text-base text-slate-300">${escapeHtml(team.city)} · ${escapeHtml(team.home)}</p>
            </div>
          </div>
          ${renderWatchButton('team', team.code)}
        </div>
        <p class="text-base leading-8 text-slate-300">${escapeHtml(team.identity || team.summary)}</p>
        <div class="site-rating-grid">
          <div class="site-rating-card"><p class="text-xs uppercase tracking-[0.18em] text-slate-500">Captain</p><p class="mt-3 text-lg font-semibold text-white">${escapeHtml(team.captain)}</p></div>
          <div class="site-rating-card"><p class="text-xs uppercase tracking-[0.18em] text-slate-500">Coach</p><p class="mt-3 text-lg font-semibold text-white">${escapeHtml(team.coach)}</p></div>
          <div class="site-rating-card"><p class="text-xs uppercase tracking-[0.18em] text-slate-500">Titles</p><p class="mt-3 text-3xl font-bold text-white">${escapeHtml(team.titles)}</p></div>
          <div class="site-rating-card"><p class="text-xs uppercase tracking-[0.18em] text-slate-500">Fan Pulse</p><p class="mt-3 text-sm leading-6 text-slate-300">${escapeHtml(team.fanPulse || team.summary)}</p></div>
        </div>
      </section>

      <section class="mt-8 grid gap-6 xl:grid-cols-[0.85fr,1.15fr]">
        <div class="space-y-6">
          <div class="site-card-panel p-6">
            <span class="site-section-label">Game Model</span>
            <p class="mt-4 text-sm leading-7 text-slate-300">${escapeHtml(team.gameModel || team.summary)}</p>
          </div>
          <div class="site-card-panel p-6">
            <span class="site-section-label">Venue Edge</span>
            <p class="mt-4 text-sm leading-7 text-slate-300">${escapeHtml(team.venueEdge || team.home)}</p>
          </div>
        </div>
        <div class="site-card-panel p-6">
          <div class="flex items-center justify-between gap-3">
            <div>
              <span class="site-section-label">Squad Core</span>
              <h2 class="site-section-heading mt-3 text-2xl text-white">Key players</h2>
            </div>
            <a href="/players" class="site-inline-link">All players</a>
          </div>
          <div class="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            ${players.map((player) => renderPlayerCard(player)).join('')}
          </div>
        </div>
      </section>

      <section class="mt-8 grid gap-6 xl:grid-cols-[1fr,1fr]">
        <div>
          <div class="mb-4"><span class="site-section-label">Fixtures</span><h2 class="site-section-heading mt-3 text-2xl text-white">Club schedule</h2></div>
          <div class="space-y-5">${renderFixtureRows(fixtures.slice(0, 5), 'No fixtures are linked to this team yet.')}</div>
        </div>
        <div>
          <div class="mb-4"><span class="site-section-label">Storylines</span><h2 class="site-section-heading mt-3 text-2xl text-white">Current club narratives</h2></div>
          <div class="grid gap-5">${stories.length ? renderStories(stories) : '<div class="site-empty-state">Team-specific storylines will appear here as match updates reference this club.</div>'}</div>
        </div>
      </section>
    `;
  }

  function renderNewsPage(bundle) {
    const stories = buildStories(bundle);
    const sideStories = stories.slice(1);
    const insights = getInsights(bundle);
    return `
      ${renderHero('news', bundle)}
      <section class="mt-8 grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
        <div class="site-editorial-card p-7 md:p-8">
          <span class="site-section-label">Top Story</span>
          <h2 class="mt-5 text-4xl font-semibold leading-tight text-white">${escapeHtml(stories[0] ? stories[0].title : bundle.currentMatch.title)}</h2>
          <p class="mt-5 max-w-3xl text-base leading-8 text-slate-300">${escapeHtml(stories[0] ? stories[0].summary : bundle.currentMatch.status)}</p>
          <div class="mt-6 flex flex-wrap items-center gap-3 text-sm text-slate-400">
            <span class="site-meta-chip"><i class="ri-map-pin-line"></i>${escapeHtml(bundle.currentMatch.venue)}</span>
            <span class="site-meta-chip"><i class="ri-time-line"></i>${escapeHtml(formatRelative(bundle.state && bundle.state.updatedAt))}</span>
          </div>
        </div>
        <div class="site-card-panel p-6">
          <span class="site-section-label">Analyst Desk</span>
          <h3 class="mt-4 text-2xl font-semibold text-white">${escapeHtml(bundle.currentMatch.team1)} vs ${escapeHtml(bundle.currentMatch.team2)}</h3>
          <p class="mt-3 text-sm leading-6 text-slate-300">${escapeHtml(insights.briefing && insights.briefing.narrative ? insights.briefing.narrative : bundle.currentMatch.status)}</p>
          <div class="mt-5 space-y-3">
            ${toArray(insights.briefing && insights.briefing.keyInsights).slice(0, 4).map((item) => `
              <div class="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-300">${escapeHtml(item)}</div>
            `).join('')}
          </div>
        </div>
      </section>

      <section class="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        ${renderStories(sideStories.length ? sideStories : stories.slice(0, 3))}
      </section>
    `;
  }

  function renderVideosPage(bundle) {
    const videos = buildVideos(bundle);
    const featured = videos[0] || {
      title: bundle.currentMatch.title,
      summary: bundle.currentMatch.status,
      duration: "Live",
      href: "/stream",
      tag: "Live"
    };
    return `
      ${renderHero('videos', bundle)}
      <section class="mt-8 grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
        <a href="${escapeHtml(featured.href || '/')}" class="site-card-panel site-card-hover block p-6 md:p-7">
          <div class="aspect-[16/9] rounded-[1.4rem] bg-gradient-to-br from-blue-900 via-slate-900 to-purple-900 border border-slate-700 flex items-center justify-center">
            <div class="w-20 h-20 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-3xl text-white">
              <i class="ri-play-fill"></i>
            </div>
          </div>
          <div class="mt-5 flex items-center justify-between gap-3">
            <span class="site-section-label">${escapeHtml(featured.tag)}</span>
            <span class="text-sm text-slate-400">${escapeHtml(featured.duration)}</span>
          </div>
          <h2 class="mt-4 text-3xl font-semibold text-white">${escapeHtml(featured.title)}</h2>
          <p class="mt-3 text-sm leading-7 text-slate-300">${escapeHtml(featured.summary)}</p>
        </a>
        <div class="site-card-panel p-6">
          <span class="site-section-label">Watch Next</span>
          <div class="mt-5 space-y-4">
            ${videos.slice(1, 5).map((video) => `
              <a href="${escapeHtml(video.href || '/')}" class="flex items-start gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 transition hover:border-slate-700 hover:bg-slate-900">
                <div class="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center text-xl text-white"><i class="ri-play-fill"></i></div>
                <div class="min-w-0 flex-1">
                  <p class="font-semibold text-white">${escapeHtml(video.title)}</p>
                  <p class="mt-1 text-sm text-slate-400">${escapeHtml(video.summary)}</p>
                </div>
                <span class="text-xs text-slate-500">${escapeHtml(video.duration)}</span>
              </a>
            `).join('') || '<div class="site-empty-state">As more highlight items are published they will appear here.</div>'}
          </div>
        </div>
      </section>

      <section class="mt-8">
        <div class="mb-4">
          <span class="site-section-label">Library</span>
          <h2 class="site-section-heading mt-3 text-2xl text-white">Replay-style cards</h2>
        </div>
        <div class="grid gap-5 md:grid-cols-2 xl:grid-cols-3">${renderVideoCards(videos)}</div>
      </section>
    `;
  }

  function getNavPage(page) {
    if (page === 'player-detail') return 'players';
    if (page === 'team-detail') return 'teams';
    return page;
  }

  function bindPlayersFilters() {
    const searchInput = qs('#player-search');
    if (!searchInput) return;

    let activeTeam = 'all';
    let activeRole = 'all';

    const applyFilters = () => {
      const query = searchInput.value.trim().toLowerCase();
      let visibleCount = 0;
      document.querySelectorAll('[data-player-card]').forEach((card) => {
        const cardName = (card.getAttribute('data-player-name') || '').toLowerCase();
        const cardTeam = (card.getAttribute('data-player-team') || '').toLowerCase();
        const cardTeamName = (card.getAttribute('data-player-team-name') || '').toLowerCase();
        const cardRole = (card.getAttribute('data-player-role') || '').toLowerCase();
        const matchesQuery = !query || cardName.includes(query) || cardRole.includes(query) || cardTeam.includes(query) || cardTeamName.includes(query);
        const matchesTeam = activeTeam === 'all' || cardTeam === activeTeam.toLowerCase();
        const matchesRole = activeRole === 'all' || cardRole.includes(activeRole.toLowerCase());
        const visible = matchesQuery && matchesTeam && matchesRole;
        card.classList.toggle('hidden', !visible);
        if (visible) visibleCount += 1;
      });

      const count = qs('#players-grid-count');
      const empty = qs('#players-grid-empty');
      if (count) count.textContent = visibleCount + ' profiles';
      if (empty) empty.classList.toggle('hidden', visibleCount !== 0);
    };

    searchInput.addEventListener('input', applyFilters);

    document.querySelectorAll('[data-filter-kind="team"]').forEach((button) => {
      button.addEventListener('click', () => {
        activeTeam = button.getAttribute('data-filter-value') || 'all';
        document.querySelectorAll('[data-filter-kind="team"]').forEach((item) => item.classList.toggle('is-active', item === button));
        applyFilters();
      });
    });

    document.querySelectorAll('[data-filter-kind="role"]').forEach((button) => {
      button.addEventListener('click', () => {
        activeRole = button.getAttribute('data-filter-value') || 'all';
        document.querySelectorAll('[data-filter-kind="role"]').forEach((item) => item.classList.toggle('is-active', item === button));
        applyFilters();
      });
    });

    applyFilters();
  }

  function toggleWatchItem(type, id) {
    const watchlist = getWatchlistState();
    const key = type + 's';
    const values = new Set(toArray(watchlist[key]));
    if (values.has(id)) values.delete(id);
    else values.add(id);
    saveWatchlistState({ ...watchlist, [key]: Array.from(values) });
    hydrateWatchButtons();
    renderWatchlistDock();
  }

  function bindGlobalActions() {
    if (globalActionsBound) return;
    globalActionsBound = true;
    document.addEventListener('click', (event) => {
      const watchButton = event.target.closest('[data-watch-type][data-watch-id]');
      if (!watchButton) return;
      event.preventDefault();
      toggleWatchItem(watchButton.getAttribute('data-watch-type'), watchButton.getAttribute('data-watch-id'));
    });
  }

  function renderPage(page, bundle) {
    const container = qs("#site-page-content");
    if (!container) return;
    if (page === "stream") container.innerHTML = renderStreamPage(bundle);
    else if (page === "matches") container.innerHTML = renderMatchesPage(bundle);
    else if (page === "schedule") container.innerHTML = renderSchedulePage(bundle);
    else if (page === "stats") container.innerHTML = renderStatsPage(bundle);
    else if (page === "teams") container.innerHTML = renderTeamsPage(bundle);
    else if (page === "players") container.innerHTML = renderPlayersPage(bundle);
    else if (page === "player-detail") container.innerHTML = renderPlayerDetailPage(bundle);
    else if (page === "team-detail") container.innerHTML = renderTeamDetailPage(bundle);
    else if (page === "news") container.innerHTML = renderNewsPage(bundle);
    else if (page === "videos") container.innerHTML = renderVideosPage(bundle);
  }

  async function loadBundle(page) {
    const requests = [
      fetchJSON("/api/state"),
      fetchJSON("/api/ai/insights"),
      fetchJSON("/api/match/pressure-center")
    ];
    if (page === "stats") requests.push(fetchJSON("/api/players/advanced"));
    else requests.push(Promise.resolve(null));
    const [state, aiResponse, pressureResponse, playersResponse] = await Promise.all(requests);
    const safeState = state || {};
    return {
      page,
      state: safeState,
      currentMatch: getCurrentMatch(safeState),
      insights: aiResponse && aiResponse.insights ? aiResponse.insights : null,
      pressure: pressureResponse && pressureResponse.pressureCenter ? pressureResponse.pressureCenter : null,
      players: playersResponse || null
    };
  }

  async function init() {
    const page = document.body && document.body.dataset && document.body.dataset.page ? document.body.dataset.page : "home";
    const bundle = await loadBundle(page);
    createShellHeader(page, bundle);
    renderTicker(bundle);
    createShellFooter(bundle);
    markActiveNav(page);
    if (page === "home") {
      renderHomeExtension(bundle);
    } else {
      renderPage(page, bundle);
    }
    renderWatchlistDock();
    hydrateWatchButtons();
    createMobileNav(getNavPage(page));
    if (page === 'players') bindPlayersFilters();
    bindGlobalActions();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
