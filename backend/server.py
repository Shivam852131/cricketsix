import os
import json
import time
import math
import random
import string
from datetime import datetime
from functools import wraps
from flask import Flask, request, jsonify, send_file, Response
from flask_socketio import SocketIO, emit
import threading

app = Flask(__name__, static_folder='../public', static_url_path='')
socketio = SocketIO(app, cors_allowed_origins="*", ping_timeout=30, ping_interval=10)

PORT = int(os.environ.get('PORT', 3000))
ADMIN_KEY = os.environ.get('ADMIN_KEY', 'admin')
PUBLIC_DIR = os.path.join(os.path.dirname(__file__), '..', 'public')
DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
DATA_FILE = os.path.join(DATA_DIR, 'app-state.json')
CONFIG_FILE = os.path.join(DATA_DIR, 'config.json')
INDEX_FILE = os.path.join(PUBLIC_DIR, 'index.html')
ADMIN_FILE = os.path.join(PUBLIC_DIR, 'admin.html')
APP_SCRIPT_FILE = os.path.join(PUBLIC_DIR, 'app.js')
CSS_FILE = os.path.join(PUBLIC_DIR, 'styles.css')
SW_FILE = os.path.join(PUBLIC_DIR, 'sw.js')

ALLOWED_STREAM_STATUS = {'live', 'paused', 'offline'}
AI_BULLETIN_CHANNELS = {'notification', 'chat', 'both'}
SSE_HEARTBEAT_MS = 15000
sse_clients = set()
ALLOWED_CORS_METHODS = "GET,POST,PUT,DELETE,OPTIONS"
ALLOWED_CORS_HEADERS = "Content-Type,X-Admin-Key"

analytics = {
    'pageViews': {},
    'apiCalls': {},
    'streamViews': [],
    'activeUsers': set()
}
rate_limit_map = {}
latest_mobile_frame = {'frame': None, 'quality': 'medium', 'timestamp': 0}

default_state = {
    'stream': {'url': '', 'platform': 'custom', 'status': 'offline', 'viewerCount': 0},
    'score': {
        'team1': '', 'team2': '', 'matchTitle': '', 'team1Score': '', 'team2Score': '', 'overs': '', 'batsman': '', 'bowler': '', 'runRate': '',
        'team1Flag': '', 'team2Flag': '', 'venue': '', 'target': '', 'league': '', 'format': '', 'totalOvers': '', 'powerplayOvers': '',
        'matchDateTime': '', 'tossWinner': '', 'tossDecision': '',
        'partnership': '', 'fow': '', 'pp': '', 'death': '', 'extras': '', 'wickets': '', 'reqRR': ''
    },
    'chatMessages': [],
    'poll': {'question': '', 'votes': {'team1': 0, 'team2': 0}},
    'content': {
        'hero': {'badge': '', 'title': '', 'subtitle': '', 'ctaPrimary': 'Watch Live', 'ctaSecondary': 'Predictions', 'liveMatches': '', 'upcomingMatches': '', 'fansOnline': ''},
        'matchCenter': {'title': 'Match Centre', 'league': '', 'team2': '', 'team2Score': '', 'team2Flag': '', 'target': '', 'winProbabilityTeam1': 50, 'projectedTotal': ''},
        'quickActions': {'scorecard': 'Full Scorecard', 'analytics': 'Analytics', 'highlights': 'Highlights'},
        'sections': {'liveMatchesTitle': 'Live Matches', 'upcomingTitle': 'Upcoming Matches', 'resultsTitle': 'Recent Results', 'performersTitle': 'Top Performers'},
        'promo': {'title': '', 'subtitle': '', 'primaryLabel': '', 'secondaryLabel': ''},
        'performers': {'batsmen': [], 'bowlers': []},
        'stats': {
            'highestScore': {'label': '', 'value': '', 'subtitle': ''},
            'bestBowling': {'label': '', 'value': '', 'subtitle': ''},
            'keyMetrics': [],
            'momentum': {'title': '', 'label': '', 'percent': 0}
        },
        'predictions': {
            'expert': {'title': '', 'winner': '', 'subtitle': '', 'note': ''},
            'playerForm': [],
            'scoreLines': []
        },
        'highlights': {
            'featured': {'videoUrl': '', 'title': '', 'description': '', 'likes': '', 'comments': '', 'favorites': ''},
            'items': [],
            'stats': [],
            'trending': []
        },
        'analytics': {
            'battingRows': [],
            'bowlingRows': [],
            'geo': []
        }
    },
    'liveMatches': [],
    'upcomingMatches': [],
    'recentResults': [],
    'ballFeed': [],
    'timelineEvents': [],
    'notifications': [],
    'updatedAt': datetime.now().isoformat()
}


def ensure_data_file():
    os.makedirs(DATA_DIR, exist_ok=True)
    if not os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'w') as f:
            json.dump(default_state, f, indent=2)


def read_state():
    ensure_data_file()
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            return normalize_state(json.load(f))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return normalize_state({})


def write_state(state):
    normalized = normalize_state(state)
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(normalized, f, indent=2)
    return normalized


def load_config():
    try:
        with open(CONFIG_FILE, 'r') as f:
            return json.load(f)
    except:
        return {}


def save_config(config):
    with open(CONFIG_FILE, 'w') as f:
        json.dump(config, f, indent=2)


def build_message_id():
    return str(int(time.time() * 1000)) + '-' + ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))


def normalize_poll(raw_poll):
    poll = raw_poll if raw_poll and isinstance(raw_poll, dict) else {}
    votes = poll.get('votes', {}) if isinstance(poll.get('votes'), dict) else {}
    team1_votes = int(votes.get('team1', 0)) if isinstance(votes.get('team1'), (int, float)) else 0
    team2_votes = int(votes.get('team2', 0)) if isinstance(votes.get('team2'), (int, float)) else 0

    return {
        'question': poll.get('question', '')[:120] if isinstance(poll.get('question'), str) else '',
        'votes': {
            'team1': max(0, math.floor(team1_votes)) if math.isfinite(team1_votes) else 0,
            'team2': max(0, math.floor(team2_votes)) if math.isfinite(team2_votes) else 0
        }
    }


def limit_list(lst, limit):
    return lst[:limit] if isinstance(lst, list) else []


def normalize_content(raw_content):
    content = raw_content if raw_content and isinstance(raw_content, dict) else {}
    performers = content.get('performers', {}) if isinstance(content.get('performers'), dict) else {}
    stats = content.get('stats', {}) if isinstance(content.get('stats'), dict) else {}
    predictions = content.get('predictions', {}) if isinstance(content.get('predictions'), dict) else {}
    highlights = content.get('highlights', {}) if isinstance(content.get('highlights'), dict) else {}
    analytics_data = content.get('analytics', {}) if isinstance(content.get('analytics'), dict) else {}

    return {
        'hero': {**default_state['content']['hero'], **({} if not isinstance(content.get('hero'), dict) else content.get('hero', {}))},
        'matchCenter': {**default_state['content']['matchCenter'], **({} if not isinstance(content.get('matchCenter'), dict) else content.get('matchCenter', {}))},
        'quickActions': {**default_state['content']['quickActions'], **({} if not isinstance(content.get('quickActions'), dict) else content.get('quickActions', {}))},
        'sections': {**default_state['content']['sections'], **({} if not isinstance(content.get('sections'), dict) else content.get('sections', {}))},
        'promo': {**default_state['content']['promo'], **({} if not isinstance(content.get('promo'), dict) else content.get('promo', {}))},
        'performers': {
            'batsmen': limit_list(performers.get('batsmen', []), 10) or default_state['content']['performers']['batsmen'][:10],
            'bowlers': limit_list(performers.get('bowlers', []), 10) or default_state['content']['performers']['bowlers'][:10]
        },
        'stats': {
            'highestScore': {**default_state['content']['stats']['highestScore'], **({} if not isinstance(stats.get('highestScore'), dict) else stats.get('highestScore', {}))},
            'bestBowling': {**default_state['content']['stats']['bestBowling'], **({} if not isinstance(stats.get('bestBowling'), dict) else stats.get('bestBowling', {}))},
            'keyMetrics': limit_list(stats.get('keyMetrics', []), 8) or default_state['content']['stats']['keyMetrics'][:8],
            'momentum': {**default_state['content']['stats']['momentum'], **({} if not isinstance(stats.get('momentum'), dict) else stats.get('momentum', {}))}
        },
        'predictions': {
            'expert': {**default_state['content']['predictions']['expert'], **({} if not isinstance(predictions.get('expert'), dict) else predictions.get('expert', {}))},
            'playerForm': limit_list(predictions.get('playerForm', []), 6) or default_state['content']['predictions']['playerForm'][:6],
            'scoreLines': limit_list(predictions.get('scoreLines', []), 4) or default_state['content']['predictions']['scoreLines'][:4]
        },
        'highlights': {
            'featured': {**default_state['content']['highlights']['featured'], **({} if not isinstance(highlights.get('featured'), dict) else highlights.get('featured', {}))},
            'items': limit_list(highlights.get('items', []), 12) or default_state['content']['highlights']['items'][:12],
            'stats': limit_list(highlights.get('stats', []), 8) or default_state['content']['highlights']['stats'][:8],
            'trending': limit_list(highlights.get('trending', []), 6) or default_state['content']['highlights']['trending'][:6]
        },
        'analytics': {
            'battingRows': limit_list(analytics_data.get('battingRows', []), 12) or default_state['content']['analytics']['battingRows'][:12],
            'bowlingRows': limit_list(analytics_data.get('bowlingRows', []), 12) or default_state['content']['analytics']['bowlingRows'][:12],
            'geo': limit_list(analytics_data.get('geo', []), 6) or default_state['content']['analytics']['geo'][:6]
        }
    }


def normalize_timeline_event(raw_event):
    event = raw_event if raw_event and isinstance(raw_event, dict) else {}

    return {
        'id': event.get('id', '').strip() if isinstance(event.get('id'), str) else build_message_id(),
        'title': (event.get('title', '')[:80] if isinstance(event.get('title'), str) else 'Match event'),
        'detail': event.get('detail', '')[:240] if isinstance(event.get('detail'), str) else '',
        'type': event.get('type', 'update')[:24].lower() if isinstance(event.get('type'), str) else 'update',
        'badge': event.get('badge', '')[:24] if isinstance(event.get('badge'), str) else '',
        'over': event.get('over', '')[:12] if isinstance(event.get('over'), str) else '',
        'timestamp': event.get('timestamp', datetime.now().isoformat()) if isinstance(event.get('timestamp'), str) else datetime.now().isoformat()
    }


def normalize_timeline_events(raw_timeline):
    return [normalize_timeline_event(e) for e in raw_timeline[:100]] if isinstance(raw_timeline, list) else []


def normalize_ball_event(raw_event):
    event = raw_event if raw_event and isinstance(raw_event, dict) else {}
    runs = int(event.get('runs', 0)) if isinstance(event.get('runs'), (int, float)) else 0
    wickets = int(event.get('wickets', 0)) if isinstance(event.get('wickets'), (int, float)) else 0

    return {
        'id': event.get('id', '').strip() if isinstance(event.get('id'), str) else build_message_id(),
        'type': event.get('type', 'update')[:24].lower() if isinstance(event.get('type'), str) else 'update',
        'label': event.get('label', '.')[:24] if isinstance(event.get('label'), str) else '.',
        'runs': max(0, math.floor(runs)) if math.isfinite(runs) else 0,
        'wickets': max(0, math.floor(wickets)) if math.isfinite(wickets) else 0,
        'legal': bool(event.get('legal', False)),
        'over': event.get('over', '')[:12] if isinstance(event.get('over'), str) else '',
        'timestamp': event.get('timestamp', datetime.now().isoformat()) if isinstance(event.get('timestamp'), str) else datetime.now().isoformat()
    }


def normalize_ball_feed(raw_feed):
    return [normalize_ball_event(e) for e in raw_feed[-60:]] if isinstance(raw_feed, list) else []


def normalize_state(raw_state):
    raw = raw_state if raw_state and isinstance(raw_state, dict) else {}
    legacy_content = raw.get('content', {}) if isinstance(raw.get('content'), dict) else {}
    legacy_live_matches = legacy_content.get('liveMatches', []) if isinstance(legacy_content.get('liveMatches'), list) else []
    legacy_upcoming_matches = legacy_content.get('upcomingMatches', []) if isinstance(legacy_content.get('upcomingMatches'), list) else []
    legacy_recent_results = legacy_content.get('recentResults', []) if isinstance(legacy_content.get('recentResults'), list) else []

    return {
        'stream': {**default_state['stream'], **({} if not isinstance(raw.get('stream'), dict) else raw.get('stream', {}))},
        'score': {**default_state['score'], **({} if not isinstance(raw.get('score'), dict) else raw.get('score', {}))},
        'chatMessages': raw.get('chatMessages', [])[-500:] if isinstance(raw.get('chatMessages'), list) else [],
        'poll': normalize_poll(raw.get('poll')),
        'content': normalize_content(raw.get('content')),
        'liveMatches': (raw.get('liveMatches', []) if isinstance(raw.get('liveMatches'), list) and raw.get('liveMatches') else legacy_live_matches)[:10],
        'upcomingMatches': (raw.get('upcomingMatches', []) if isinstance(raw.get('upcomingMatches'), list) and raw.get('upcomingMatches') else legacy_upcoming_matches)[:10],
        'recentResults': (raw.get('recentResults', []) if isinstance(raw.get('recentResults'), list) and raw.get('recentResults') else legacy_recent_results)[:10],
        'ballFeed': normalize_ball_feed(raw.get('ballFeed')) if isinstance(raw.get('ballFeed'), list) else [],
        'timelineEvents': normalize_timeline_events(raw.get('timelineEvents', [])),
        'notifications': raw.get('notifications', [])[-200:] if isinstance(raw.get('notifications'), list) else [],
        'updatedAt': raw.get('updatedAt', datetime.now().isoformat()) if isinstance(raw.get('updatedAt'), str) else datetime.now().isoformat()
    }


def parse_score_breakdown(score_text):
    if not isinstance(score_text, str):
        return {'runs': 0, 'wickets': 0}
    import re
    match = re.match(r'^(\d+)(?:\/(\d+))?', score_text.strip())
    if match:
        return {
            'runs': int(match.group(1)) if match.group(1) else 0,
            'wickets': int(match.group(2)) if match.group(2) else 0
        }
    return {'runs': 0, 'wickets': 0}


def parse_overs_breakdown(overs_text):
    if not isinstance(overs_text, str):
        return {'totalBalls': 0, 'completedOvers': 0}
    import re
    match = re.match(r'^(\d+)(?:\.(\d))?$', overs_text.strip())
    if not match:
        return {'totalBalls': 0, 'completedOvers': 0}
    overs = int(match.group(1)) if match.group(1) else 0
    balls = min(5, int(match.group(2)) if match.group(2) else 0)
    total_balls = overs * 6 + balls
    return {'totalBalls': total_balls, 'completedOvers': total_balls / 6}


def clamp(value, min_val, max_val):
    return min(max_val, max(min_val, value))


def infer_innings_length(state, completed_overs):
    descriptor = ((state.get('score', {}).get('matchTitle', '') or '') + ' ' + (state.get('score', {}).get('format', '') or '')).lower()
    if 'test' in descriptor:
        return 90
    if 't10' in descriptor:
        return 10
    if 'odi' in descriptor or completed_overs > 20:
        return 50
    return 20


def get_phase_meta(completed_overs, innings_length):
    if innings_length >= 45:
        if completed_overs < 10:
            return {'key': 'powerplay', 'label': 'Powerplay'}
        if completed_overs < innings_length - 4:
            return {'key': 'middle', 'label': 'Middle overs'}
        return {'key': 'death', 'label': 'Death overs'}
    if completed_overs < 6:
        return {'key': 'powerplay', 'label': 'Powerplay'}
    if completed_overs < 16:
        return {'key': 'middle', 'label': 'Middle overs'}
    return {'key': 'death', 'label': 'Death overs'}


def extract_participant_name(raw_label, fallback):
    if not isinstance(raw_label, str) or not raw_label.strip():
        return fallback
    return raw_label.split('-')[0].strip() or fallback


def has_live_score(state):
    return bool(state and state.get('score') and state.get('score').get('team1') and state.get('score').get('team1Score'))


def summarize_ball_feed(ball_feed):
    feed = ball_feed[-12:] if isinstance(ball_feed, list) else []
    recent_six = feed[-6:]
    recent_runs = sum(int(e.get('runs', 0)) or 0 for e in recent_six)
    recent_wickets = sum(int(e.get('wickets', 0)) or 0 for e in recent_six)
    recent_dots = sum(1 for e in recent_six if e.get('legal') and int(e.get('runs', 0)) == 0 and int(e.get('wickets', 0)) == 0)
    recent_boundaries = sum(1 for e in recent_six if int(e.get('runs', 0)) >= 4)
    legal_recent = [e for e in recent_six if e.get('legal')]
    current_over = []

    for i in range(len(feed) - 1, -1, -1):
        current_over.insert(0, feed[i])
        if feed[i].get('legal') and sum(1 for item in current_over if item.get('legal')) >= 6:
            break

    trend_score = recent_runs + recent_boundaries * 3 - recent_dots * 2 - recent_wickets * 8
    trend_label = 'Wobble' if recent_wickets > 0 else ('Hot streak' if trend_score >= 14 else ('Stalled' if trend_score <= 2 else 'Building'))
    urgency = 'High alert' if recent_wickets > 0 else ('Attack window' if recent_runs >= 10 else 'Stay steady')

    if recent_wickets > 0:
        smart_call = "Rebuild with low-risk singles for two balls before targeting a release shot."
    elif recent_boundaries >= 2:
        smart_call = "Pressure is on the bowler - keep the set batter on strike and attack the matchup."
    elif recent_dots >= 3:
        smart_call = "Break the squeeze with rotation first, then line up the weaker boundary option."
    else:
        smart_call = "Keep collecting low-risk runs and force the field to move."

    return {
        'feed': feed,
        'currentOver': current_over,
        'recentRuns': recent_runs,
        'recentWickets': recent_wickets,
        'recentDots': recent_dots,
        'recentBoundaries': recent_boundaries,
        'legalCount': len(legal_recent),
        'trendLabel': trend_label,
        'urgency': urgency,
        'smartCall': smart_call,
        'lastBall': feed[-1] if feed else None
    }


def create_ai_insights(state):
    ball_feed_summary = summarize_ball_feed(state.get('ballFeed') if state else [])

    if not has_live_score(state):
        return {
            'generatedAt': datetime.now().isoformat(),
            'summary': 'No live match data is available yet.',
            'prediction': {'projectedTotal': 0, 'projectedLow': 0, 'projectedHigh': 0, 'fanConfidenceTeam1': 0, 'fanConfidenceTeam2': 0, 'pressureIndex': 0, 'momentumScore': 0, 'momentumLabel': 'Awaiting data', 'ballsRemaining': 0, 'wicketsInHand': 0},
            'matchup': {'phase': 'Awaiting live data', 'batsman': '-', 'bowler': '-'},
            'assistant': {
                'trendLabel': 'Awaiting feed',
                'urgency': 'No live data',
                'smartCall': 'Use the quick score buttons from the admin panel to start the live AI copilot.',
                'currentOver': [],
                'recentBalls': [],
                'lastBall': None
            },
            'tactical': {
                'commentary': 'Publish a live score from the admin panel to unlock real-time AI analysis.',
                'battingPlan': 'No batting plan until live score data is available.',
                'bowlingPlan': 'No bowling counter until live score data is available.',
                'nextOverPlan': 'Start the match feed to generate over-by-over plans.',
                'watchouts': ['No live score has been published yet.']
            },
            'recommendation': 'Add stream, teams, and score details from the admin panel to enable AI insights.',
            'keySignals': ['Live score: not available', 'Connected viewers: ' + str(state.get('stream', {}).get('viewerCount', 0) if state else 0), 'Chat messages: ' + str(len(state.get('chatMessages', [])) if state else 0)]
        }

    score = parse_score_breakdown(state['score'].get('team1Score', ''))
    overs = parse_overs_breakdown(state['score'].get('overs', ''))
    innings_length = infer_innings_length(state, overs['completedOvers'])
    total_balls = innings_length * 6
    balls_remaining = max(0, total_balls - overs['totalBalls'])
    wickets_in_hand = max(0, 10 - score['wickets'])
    run_rate = float(state['score'].get('runRate', '0') or 0)
    effective_rate = score['runs'] / overs['completedOvers'] if overs['completedOvers'] > 0 else run_rate
    projected_total = max(score['runs'], round((effective_rate or 0) * innings_length))
    team1_votes = int(state.get('poll', {}).get('votes', {}).get('team1', 0) or 0)
    team2_votes = int(state.get('poll', {}).get('votes', {}).get('team2', 0) or 0)
    total_votes = max(team1_votes + team2_votes, 1)
    fan_confidence = round((team1_votes * 100) / total_votes)
    par_run_rate = 6.2 if innings_length >= 45 else 8.4
    pressure_index = clamp(round(20 + (score['wickets'] * 6) + max(0, (par_run_rate - effective_rate) * 12) + (18 if balls_remaining <= 24 else 8)), 5, 95)
    momentum_score = clamp(round(50 + (effective_rate - par_run_rate) * 14 + (wickets_in_hand - 5) * 3 + (fan_confidence - 50) * 0.35 - max(0, pressure_index - 60) * 0.4), 1, 99)
    momentum_label = 'Surging' if momentum_score >= 70 else ('Steady edge' if momentum_score >= 55 else ('Under pressure' if momentum_score <= 35 else 'Balanced'))
    phase = get_phase_meta(overs['completedOvers'], innings_length)
    batsman_name = extract_participant_name(state['score'].get('batsman', ''), 'Set batter')
    bowler_name = extract_participant_name(state['score'].get('bowler', ''), 'Strike bowler')
    projected_low = max(score['runs'], projected_total - 10)
    projected_high = projected_total + 10

    return {
        'generatedAt': datetime.now().isoformat(),
        'summary': f"{state['score'].get('team1', 'Team')} are in the {phase['label'].lower()} at {state['score'].get('team1Score', '')}, with a projection around {projected_total} and {momentum_label.lower()} momentum.",
        'prediction': {
            'projectedTotal': projected_total, 'projectedLow': projected_low, 'projectedHigh': projected_high, 'fanConfidenceTeam1': fan_confidence, 'fanConfidenceTeam2': 100 - fan_confidence, 'pressureIndex': pressure_index, 'momentumScore': momentum_score, 'momentumLabel': momentum_label, 'ballsRemaining': balls_remaining, 'wicketsInHand': wickets_in_hand
        },
        'matchup': {'phase': phase['label'], 'batsman': batsman_name, 'bowler': bowler_name},
        'tactical': {
            'commentary': f"{batsman_name} is setting the tempo against {bowler_name}, and the next over should define the finish.",
            'battingPlan': "Keep the set batter on strike and attack straight boundaries without exposing the tail." if phase['key'] == 'death' else "Rotate strike and protect wickets until the launch window opens.",
            'bowlingPlan': "Hit hard lengths, vary pace, and deny width to stop acceleration.",
            'nextOverPlan': "Aim for a calm 8 to 10 run over and protect wickets first." if pressure_index >= 70 else "Target a 10 plus run over with low-risk scoring on the first three balls.",
            'watchouts': ["The finish is in a high-volatility zone and one over can swing the projection sharply."] if balls_remaining <= 24 else ["A quiet over will hand momentum back to the fielding side."]
        },
        'assistant': {
            'trendLabel': ball_feed_summary['trendLabel'],
            'urgency': ball_feed_summary['urgency'],
            'smartCall': ball_feed_summary['smartCall'],
            'currentOver': [e.get('label', '') for e in ball_feed_summary['currentOver']],
            'recentBalls': [e.get('label', '') for e in ball_feed_summary['feed'][-8:]],
            'lastBall': ball_feed_summary['lastBall'].get('label') if ball_feed_summary['lastBall'] else None,
            'recentRuns': ball_feed_summary['recentRuns'],
            'recentWickets': ball_feed_summary['recentWickets'],
            'recentDots': ball_feed_summary['recentDots']
        },
        'recommendation': "Bank one calm over before a full launch." if pressure_index >= 70 else "Momentum is in hand. Press the advantage in the next over.",
        'keySignals': [
            f"Projected range: {projected_low}-{projected_high}",
            f"Run rate vs par: {effective_rate:.2f} vs {par_run_rate:.2f}",
            f"Balls remaining: {balls_remaining}",
            f"Wickets in hand: {wickets_in_hand}",
            "Last 6 balls: " + (' '.join(e.get('label', '') for e in ball_feed_summary['currentOver']) or "No feed yet"),
            f"Connected viewers: {state.get('stream', {}).get('viewerCount', 0)}",
            f"Fan sentiment split: {fan_confidence}% / {100 - fan_confidence}%"
        ]
    }


def create_ai_bulletin_message(state, insights):
    if not has_live_score(state):
        return "AI Bulletin: No live match data is available yet."
    parts = [
        f"AI Bulletin: {state['score'].get('team1', 'Team')} {state['score'].get('team1Score', '')} after {state['score'].get('overs', '0')} overs.",
        insights.get('summary', ''),
        f"Projected finish: {insights['prediction']['projectedTotal']}." if insights.get('prediction', {}).get('projectedTotal') else '',
        insights.get('assistant', {}).get('smartCall', ''),
        insights.get('recommendation', '')
    ]
    return ' '.join([p for p in parts if p])[:500]


def is_admin_request(req):
    key = request.headers.get('X-Admin-Key') or (request.json.get('key') if request.json else None)
    return key == ADMIN_KEY


def require_admin(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not is_admin_request(request):
            return jsonify({'error': 'Admin authentication required'}), 401
        return f(*args, **kwargs)
    return decorated_function


def apply_realtime_viewer_metrics(state):
    return {**state, 'stream': {**state.get('stream', {}), 'viewerCount': state.get('stream', {}).get('status') == 'live' and len(sse_clients) or 0}}


def create_state_payload(state):
    realtime_state = apply_realtime_viewer_metrics(state)
    return {
        'stream': realtime_state.get('stream'),
        'score': realtime_state.get('score'),
        'poll': realtime_state.get('poll'),
        'content': realtime_state.get('content'),
        'liveMatches': realtime_state.get('liveMatches'),
        'upcomingMatches': realtime_state.get('upcomingMatches'),
        'recentResults': realtime_state.get('recentResults'),
        'ballFeed': realtime_state.get('ballFeed'),
        'timelineEvents': realtime_state.get('timelineEvents'),
        'updatedAt': realtime_state.get('updatedAt')
    }


def create_sse_packet(event_name, payload):
    return f"event: {event_name}\ndata: {json.dumps(payload)}\n\n"


def send_sse_event(response, event_name, payload):
    response.write(create_sse_packet(event_name, payload))


def broadcast_sse_event(event_name, payload):
    packet = create_sse_packet(event_name, payload)
    for client in list(sse_clients):
        try:
            client.write(packet)
        except:
            sse_clients.discard(client)


def broadcast_state_update(state):
    broadcast_sse_event('state-update', create_state_payload(state))


def merge_content(current_content, patch):
    next_content = patch if patch and isinstance(patch, dict) else {}
    next_performers = next_content.get('performers', {}) if isinstance(next_content.get('performers'), dict) else {}

    return normalize_content({
        **current_content,
        **next_content,
        'hero': {**current_content.get('hero', {}), **next_content.get('hero', {})},
        'matchCenter': {**current_content.get('matchCenter', {}), **next_content.get('matchCenter', {})},
        'quickActions': {**current_content.get('quickActions', {}), **next_content.get('quickActions', {})},
        'sections': {**current_content.get('sections', {}), **next_content.get('sections', {})},
        'promo': {**current_content.get('promo', {}), **next_content.get('promo', {})},
        'performers': {
            'batsmen': next_performers.get('batsmen', current_content.get('performers', {}).get('batsmen', [])),
            'bowlers': next_performers.get('bowlers', current_content.get('performers', {}).get('bowlers', []))
        },
        'stats': {
            **current_content.get('stats', {}),
            **next_content.get('stats', {}),
            'highestScore': {**current_content.get('stats', {}).get('highestScore', {}), **next_content.get('stats', {}).get('highestScore', {})},
            'bestBowling': {**current_content.get('stats', {}).get('bestBowling', {}), **next_content.get('stats', {}).get('bestBowling', {})},
            'momentum': {**current_content.get('stats', {}).get('momentum', {}), **next_content.get('stats', {}).get('momentum', {})},
            'keyMetrics': next_content.get('stats', {}).get('keyMetrics', current_content.get('stats', {}).get('keyMetrics', []))
        },
        'predictions': {
            **current_content.get('predictions', {}),
            **next_content.get('predictions', {}),
            'expert': {**current_content.get('predictions', {}).get('expert', {}), **next_content.get('predictions', {}).get('expert', {})},
            'playerForm': next_content.get('predictions', {}).get('playerForm', current_content.get('predictions', {}).get('playerForm', [])),
            'scoreLines': next_content.get('predictions', {}).get('scoreLines', current_content.get('predictions', {}).get('scoreLines', []))
        },
        'highlights': {
            **current_content.get('highlights', {}),
            **next_content.get('highlights', {}),
            'featured': {**current_content.get('highlights', {}).get('featured', {}), **next_content.get('highlights', {}).get('featured', {})},
            'items': next_content.get('highlights', {}).get('items', current_content.get('highlights', {}).get('items', [])),
            'stats': next_content.get('highlights', {}).get('stats', current_content.get('highlights', {}).get('stats', [])),
            'trending': next_content.get('highlights', {}).get('trending', current_content.get('highlights', {}).get('trending', []))
        },
        'analytics': {
            **current_content.get('analytics', {}),
            **next_content.get('analytics', {}),
            'battingRows': next_content.get('analytics', {}).get('battingRows', current_content.get('analytics', {}).get('battingRows', [])),
            'bowlingRows': next_content.get('analytics', {}).get('bowlingRows', current_content.get('analytics', {}).get('bowlingRows', [])),
            'geo': next_content.get('analytics', {}).get('geo', current_content.get('analytics', {}).get('geo', []))
        }
    })


@app.after_request
def after_request(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = ALLOWED_CORS_METHODS
    response.headers['Access-Control-Allow-Headers'] = ALLOWED_CORS_HEADERS
    if request.method == 'OPTIONS':
        return '', 204
    return response


@app.before_request
def before_request():
    analytics['pageViews'][request.path] = analytics['pageViews'].get(request.path, 0) + 1
    if request.path.startswith('/api/'):
        api_key = f"{request.method} {request.path}"
        analytics['apiCalls'][api_key] = analytics['apiCalls'].get(api_key, 0) + 1


def check_rate_limit(ip, max_requests=100, window_ms=60000):
    now = int(time.time() * 1000)
    key = f"{ip}:{now // window_ms}"
    count = rate_limit_map.get(key, 0) + 1
    rate_limit_map[key] = count

    if count > max_requests:
        return False

    for cache_key in list(rate_limit_map.keys()):
        if cache_key.endswith(f":{(now - window_ms * 2) // window_ms}"):
            del rate_limit_map[cache_key]

    return True


@app.route('/api/health')
def health():
    return jsonify({
        'status': 'ok',
        'service': 'cricketlive-pro-api',
        'uptime': time.time() - app.config.get('START_TIME', time.time()),
        'timestamp': datetime.now().isoformat(),
        'analytics': {
            'activeUsers': len(analytics['activeUsers']),
            'totalStreamViews': len(analytics['streamViews'])
        }
    })


@app.route('/api/events')
def events():
    def generate():
        yield "retry: 3000\n\n"
        yield create_sse_packet('connected', {'ok': True, 'timestamp': datetime.now().isoformat()})

        try:
            state = read_state()
            yield create_sse_packet('state-update', create_state_payload(state))
            yield create_sse_packet('chat-snapshot', {'messages': state.get('chatMessages', [])[-50:]})
            yield create_sse_packet('notification-snapshot', {'notifications': state.get('notifications', [])[-20:]})
        except:
            yield create_sse_packet('server-error', {'message': 'Unable to load realtime state'})

        try:
            state = read_state()
            broadcast_state_update(state)
        except:
            pass

        while True:
            time.sleep(25)

    return Response(generate(), mimetype='text/event-stream', headers={'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no'})


@app.route('/api/state')
def get_state():
    try:
        state = read_state()
        return jsonify(apply_realtime_viewer_metrics(state))
    except:
        return jsonify({'error': 'Unable to read state'}), 500


@app.route('/api/poll')
def get_poll():
    try:
        state = read_state()
        return jsonify({'poll': state.get('poll'), 'teams': {'team1': state.get('score', {}).get('team1'), 'team2': state.get('score', {}).get('team2')}})
    except:
        return jsonify({'error': 'Unable to read poll'}), 500


@app.route('/api/poll/vote', methods=['POST'])
def vote_poll():
    try:
        team = request.json.get('team', '').strip().lower() if request.json else ''
        if team not in ('team1', 'team2'):
            return jsonify({'error': 'Vote target must be team1 or team2'}), 400

        state = read_state()
        next_votes = {**state.get('poll', {}).get('votes', {}), team: (int(state.get('poll', {}).get('votes', {}).get(team, 0)) or 0) + 1}
        next_state = {
            **state,
            'poll': normalize_poll({**state.get('poll', {}), 'votes': next_votes}),
            'updatedAt': datetime.now().isoformat()
        }

        saved_state = write_state(next_state)
        broadcast_state_update(saved_state)
        return jsonify({'ok': True, 'poll': saved_state.get('poll'), 'teams': {'team1': saved_state.get('score', {}).get('team1'), 'team2': saved_state.get('score', {}).get('team2')}}), 201
    except:
        return jsonify({'error': 'Unable to cast vote'}), 500


@app.route('/api/timeline', methods=['POST'])
@require_admin
def add_timeline():
    try:
        body = request.json if request.json else {}
        event = normalize_timeline_event({
            'id': build_message_id(),
            'title': body.get('title'),
            'detail': body.get('detail'),
            'type': body.get('type'),
            'badge': body.get('badge'),
            'over': body.get('over'),
            'timestamp': datetime.now().isoformat()
        })

        state = read_state()
        next_state = {
            **state,
            'timelineEvents': [event, *state.get('timelineEvents', [])][:100],
            'updatedAt': datetime.now().isoformat()
        }

        saved_state = write_state(next_state)
        broadcast_state_update(saved_state)
        return jsonify({'ok': True, 'event': event, 'timelineEvents': saved_state.get('timelineEvents')}), 201
    except:
        return jsonify({'error': 'Unable to add timeline event'}), 500


@app.route('/api/timeline', methods=['DELETE'])
@require_admin
def clear_timeline():
    try:
        state = read_state()
        next_state = {**state, 'timelineEvents': [], 'updatedAt': datetime.now().isoformat()}
        saved_state = write_state(next_state)
        broadcast_state_update(saved_state)
        return jsonify({'ok': True, 'timelineEvents': []})
    except:
        return jsonify({'error': 'Unable to clear timeline'}), 500


@app.route('/api/timeline/<event_id>', methods=['DELETE'])
@require_admin
def delete_timeline_event(event_id):
    try:
        if not event_id:
            return jsonify({'error': 'Timeline event id is required'}), 400

        state = read_state()
        timeline_events = [e for e in state.get('timelineEvents', []) if e.get('id') != event_id]
        next_state = {**state, 'timelineEvents': timeline_events, 'updatedAt': datetime.now().isoformat()}
        saved_state = write_state(next_state)
        broadcast_state_update(saved_state)
        return jsonify({'ok': True, 'timelineEvents': saved_state.get('timelineEvents')})
    except:
        return jsonify({'error': 'Unable to remove timeline event'}), 500


@app.route('/api/admin/verify', methods=['POST'])
def verify_admin():
    try:
        data = request.get_json(silent=True) or {}
        key = data.get('key')
    except:
        key = None
    
    if key == ADMIN_KEY:
        return jsonify({'ok': True, 'message': 'Admin verified'})
    return jsonify({'error': 'Invalid admin key'}), 401


@app.route('/api/ai/insights')
def get_ai_insights():
    try:
        state = apply_realtime_viewer_metrics(read_state())
        insights = create_ai_insights(state)
        return jsonify({'ok': True, 'insights': insights, 'source': 'rule-based'})
    except:
        return jsonify({'error': 'Unable to generate AI insights'}), 500


@app.route('/api/ai/bulletin', methods=['POST'])
@require_admin
def post_ai_bulletin():
    try:
        channel_raw = request.json.get('channel', 'notification').strip().lower() if request.json else 'notification'
        channel = channel_raw if channel_raw in AI_BULLETIN_CHANNELS else 'notification'
        state = apply_realtime_viewer_metrics(read_state())
        insights = create_ai_insights(state)
        bulletin = create_ai_bulletin_message(state, insights)
        timestamp = datetime.now().isoformat()
        next_state = {**state, 'notifications': list(state.get('notifications', [])), 'chatMessages': list(state.get('chatMessages', [])), 'updatedAt': timestamp}

        notification = None
        chat_message = None
        if channel in ('notification', 'both'):
            notification = {'id': build_message_id(), 'message': bulletin, 'timestamp': timestamp}
            next_state['notifications'] = next_state['notifications'] + [notification]
            next_state['notifications'] = next_state['notifications'][-200:]
        if channel in ('chat', 'both'):
            chat_message = {'id': build_message_id(), 'username': 'AI Analyst', 'content': bulletin[:400], 'timestamp': timestamp}
            next_state['chatMessages'] = next_state['chatMessages'] + [chat_message]
            next_state['chatMessages'] = next_state['chatMessages'][-500:]

        write_state(next_state)
        if notification:
            broadcast_sse_event('notification', {'notification': notification})
        if chat_message:
            broadcast_sse_event('chat-message', {'message': chat_message})
        return jsonify({'ok': True, 'channel': channel, 'bulletin': bulletin, 'insights': insights}), 201
    except:
        return jsonify({'error': 'Unable to publish AI bulletin'}), 500


@app.route('/api/state', methods=['PUT'])
@require_admin
def update_state():
    try:
        body = request.json if request.json else {}
        current_state = read_state()
        stream_patch = body.get('stream', {})
        next_stream = {**current_state.get('stream', {}), **stream_patch}

        if isinstance(body.get('streamUrl'), str):
            next_stream['url'] = body.get('streamUrl').strip()
        if isinstance(body.get('streamPlatform'), str):
            next_stream['platform'] = body.get('streamPlatform').strip() or 'custom'
        if isinstance(body.get('streamStatus'), str) and body.get('streamStatus') in ALLOWED_STREAM_STATUS:
            next_stream['status'] = body.get('streamStatus')

        next_state = {
            **current_state,
            'stream': next_stream,
            'score': {**current_state.get('score', {}), **body.get('currentScore', {})} if isinstance(body.get('currentScore'), dict) else current_state.get('score', {}),
            'poll': normalize_poll({**current_state.get('poll', {}), **body.get('poll', {}), 'votes': {**current_state.get('poll', {}).get('votes', {}), **body.get('poll', {}).get('votes', {})}}) if isinstance(body.get('poll'), dict) else current_state.get('poll', {}),
            'content': merge_content(current_state.get('content', {}), body.get('content', {})) if isinstance(body.get('content'), dict) else current_state.get('content', {}),
            'liveMatches': body.get('liveMatches', current_state.get('liveMatches', []))[:10] if isinstance(body.get('liveMatches'), list) else current_state.get('liveMatches', []),
            'upcomingMatches': body.get('upcomingMatches', current_state.get('upcomingMatches', []))[:10] if isinstance(body.get('upcomingMatches'), list) else current_state.get('upcomingMatches', []),
            'recentResults': body.get('recentResults', current_state.get('recentResults', []))[:10] if isinstance(body.get('recentResults'), list) else current_state.get('recentResults', []),
            'ballFeed': normalize_ball_feed(body.get('ballFeed')) if isinstance(body.get('ballFeed'), list) else current_state.get('ballFeed', []),
            'updatedAt': datetime.now().isoformat()
        }

        saved_state = write_state(next_state)
        broadcast_state_update(saved_state)
        return jsonify({'ok': True, 'state': apply_realtime_viewer_metrics(saved_state)})
    except:
        return jsonify({'error': 'Unable to update state'}), 500


@app.route('/api/chat', methods=['POST'])
def post_chat():
    try:
        username = request.json.get('username', 'Fan').strip()[:24] if request.json else 'Fan'
        content = request.json.get('content', '').strip()[:400] if request.json else ''
        if not content:
            return jsonify({'error': 'Message content is required'}), 400

        message = {'id': build_message_id(), 'username': username or 'Fan', 'content': content, 'timestamp': datetime.now().isoformat()}
        state = read_state()
        next_state = {**state, 'chatMessages': [*state.get('chatMessages', []), message][-500:], 'updatedAt': datetime.now().isoformat()}
        write_state(next_state)
        broadcast_sse_event('chat-message', {'message': message})
        return jsonify({'ok': True, 'message': message}), 201
    except:
        return jsonify({'error': 'Unable to send chat message'}), 500


@app.route('/api/notifications', methods=['POST'])
@require_admin
def post_notification():
    try:
        message_text = request.json.get('message', '').strip()[:500] if request.json else ''
        if not message_text:
            return jsonify({'error': 'Notification message is required'}), 400

        notification = {'id': build_message_id(), 'message': message_text, 'timestamp': datetime.now().isoformat()}
        state = read_state()
        next_state = {**state, 'notifications': [*state.get('notifications', []), notification][-200:], 'updatedAt': datetime.now().isoformat()}
        write_state(next_state)
        broadcast_sse_event('notification', {'notification': notification})
        return jsonify({'ok': True, 'notification': notification}), 201
    except:
        return jsonify({'error': 'Unable to push notification'}), 500


@app.route('/api/admin/stream/frame', methods=['POST'])
@require_admin
def post_stream_frame():
    try:
        global latest_mobile_frame
        data = request.json or {}
        latest_mobile_frame = {
            'frame': data.get('frame'),
            'quality': data.get('quality', 'medium'),
            'timestamp': data.get('timestamp') or int(time.time() * 1000)
        }
        broadcast_sse_event('mobile-stream-frame', {'frame': latest_mobile_frame['frame'], 'quality': latest_mobile_frame['quality'], 'timestamp': latest_mobile_frame['timestamp']})
        return jsonify({'ok': True})
    except:
        return jsonify({'error': 'Failed to process frame'}), 500


@app.route('/api/stream/frame')
def get_stream_frame():
    return jsonify(latest_mobile_frame)


@app.route('/api/stream/frame/latest')
def get_stream_frame_latest():
    response = jsonify(latest_mobile_frame)
    response.headers['Access-Control-Allow-Origin'] = '*'
    return response


@app.route('/stream/mobile')
def mobile_stream():
    html = '''<!DOCTYPE html>
<html>
<head>
  <title>Live Stream</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #000; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    img { max-width: 100%; max-height: 100vh; object-fit: contain; }
    #stream { display: none; }
    #placeholder { color: #666; font-family: sans-serif; text-align: center; padding: 20px; }
    #status { position: fixed; top: 10px; right: 10px; color: #fff; background: rgba(0,0,0,0.7); padding: 5px 10px; border-radius: 5px; font-family: sans-serif; font-size: 14px; }
    #viewers { position: fixed; top: 10px; left: 10px; color: #fff; background: rgba(0,0,0,0.7); padding: 5px 10px; border-radius: 5px; font-family: sans-serif; font-size: 14px; }
  </style>
</head>
<body>
  <img id="stream" src="" alt="Live Stream">
  <div id="placeholder">Connecting to stream...</div>
  <div id="status">Connecting...</div>
  <div id="viewers"></div>
  <script>
    const img = document.getElementById('stream');
    const placeholder = document.getElementById('placeholder');
    const statusEl = document.getElementById('status');
    const viewersEl = document.getElementById('viewers');
    let lastTimestamp = 0;
    let reconnectAttempts = 0;
    const maxReconnects = 50;
    
    // WebSocket connection
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = io(wsProtocol + '//' + window.location.host, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: maxReconnects,
      reconnectionDelay: 1000
    });
    
    socket.on('connect', () => {
      console.log('Connected to stream server');
      socket.emit('join_stream');
      statusEl.textContent = 'Live';
      statusEl.style.background = 'rgba(0,200,0,0.7)';
    });
    
    socket.on('disconnect', () => {
      console.log('Disconnected from stream server');
      statusEl.textContent = 'Reconnecting...';
      statusEl.style.background = 'rgba(200,100,0,0.7)';
    });
    
    socket.on('stream_frame', (data) => {
      if (data.frame && data.timestamp > lastTimestamp) {
        lastTimestamp = data.timestamp;
        img.src = data.frame;
        img.style.display = 'block';
        placeholder.style.display = 'none';
      }
    });
    
    socket.on('stream_ended', () => {
      statusEl.textContent = 'Stream ended';
      statusEl.style.background = 'rgba(200,0,0,0.7)';
      placeholder.textContent = 'Stream has ended';
      placeholder.style.display = 'block';
      img.style.display = 'none';
    });
    
    socket.on('stream_viewers', (data) => {
      viewersEl.textContent = '👁 ' + (data.count || 0);
    });
    
    socket.on('stream_started', () => {
      statusEl.textContent = 'Live';
      statusEl.style.background = 'rgba(0,200,0,0.7)';
      placeholder.style.display = 'none';
    });
    
    // Fallback to HTTP polling if WebSocket fails
    async function fetchFrame() {
      try {
        const res = await fetch('/api/stream/frame/latest?' + Date.now(), { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (data.frame && data.timestamp > lastTimestamp) {
          lastTimestamp = data.timestamp;
          img.src = data.frame;
          img.style.display = 'block';
          placeholder.style.display = 'none';
        }
      } catch (e) {}
    }
    
    // Backup polling every 5 seconds if WebSocket not connected
    setInterval(() => {
      if (!socket.connected) fetchFrame();
    }, 5000);
  </script>
</body>
</html>'''
    return html, 200, {'Content-Type': 'text/html'}


@app.route('/styles.css')
def styles_css():
    return send_file(CSS_FILE, mimetype='text/css')


@app.route('/sw.js')
def service_worker():
    response = send_file(SW_FILE, mimetype='application/javascript')
    response.headers['Service-Worker-Allowed'] = '/'
    return response


@app.route('/app.js')
def app_js():
    return send_file(APP_SCRIPT_FILE, mimetype='application/javascript')


@app.route('/')
def index():
    return send_file(INDEX_FILE)


@app.route('/admin')
def admin():
    return send_file(ADMIN_FILE)


@app.route('/api/admin/analytics')
@require_admin
def get_analytics():
    return jsonify({
        'pageViews': analytics['pageViews'],
        'apiCalls': analytics['apiCalls'],
        'streamViews': len(analytics['streamViews']),
        'activeUsers': len(analytics['activeUsers']),
        'uptime': time.time() - app.config.get('START_TIME', time.time())
    })


@app.route('/api/stream/view', methods=['POST'])
def stream_view():
    viewer_id = request.json.get('viewerId', '').strip()[:80] if request.json else ''
    if viewer_id:
        analytics['activeUsers'].add(viewer_id)
    analytics['streamViews'].append({
        'timestamp': datetime.now().isoformat(),
        'viewerId': viewer_id
    })
    return jsonify({'ok': True})


@app.route('/api/poll/status')
def poll_status():
    try:
        state = apply_realtime_viewer_metrics(read_state())
        return jsonify({
            'streamStatus': state.get('stream', {}).get('status', 'offline'),
            'viewerCount': len(analytics['activeUsers']),
            'timestamp': datetime.now().isoformat()
        })
    except:
        return jsonify({'error': 'Unable to load poll status'}), 500


@app.route('/api/admin/announce', methods=['POST'])
@require_admin
def admin_announce():
    message = request.json.get('message', '').strip()[:500] if request.json else ''
    msg_type = request.json.get('type', 'info').strip()[:40] if request.json else 'info'
    if not message:
        return jsonify({'error': 'Announcement message is required'}), 400

    broadcast_sse_event('announcement', {'message': message, 'type': msg_type, 'timestamp': datetime.now().isoformat()})
    return jsonify({'ok': True})


@app.route('/api/stream/quality')
def stream_quality():
    quality = request.args.get('quality', 'auto')
    qualities = {
        'low': {'resolution': '640x360', 'bitrate': 500000},
        'medium': {'resolution': '854x480', 'bitrate': 1000000},
        'high': {'resolution': '1280x720', 'bitrate': 2500000},
        'fullhd': {'resolution': '1920x1080', 'bitrate': 5000000},
        'auto': {'resolution': 'auto', 'bitrate': 'auto'}
    }
    return jsonify(qualities.get(quality, qualities['auto']))


@app.route('/api/schedule')
def schedule():
    try:
        state = read_state()
        return jsonify({
            'matches': state.get('liveMatches', []),
            'upcoming': state.get('upcomingMatches', [])
        })
    except:
        return jsonify({'error': 'Unable to load schedule'}), 500


@app.route('/api/players')
def players():
    try:
        state = read_state()
        performers = state.get('content', {}).get('performers', {'batsmen': [], 'bowlers': []})
        team = request.args.get('team', '').strip().lower()
        def filter_by_team(player):
            return not team or str(player.get('team', '')).strip().lower() == team
        return jsonify({
            'batsmen': [p for p in performers.get('batsmen', []) if filter_by_team(p)],
            'bowlers': [p for p in performers.get('bowlers', []) if filter_by_team(p)]
        })
    except:
        return jsonify({'error': 'Unable to load player stats'}), 500


@app.route('/<path:path>')
def catch_all(path):
    return send_file(INDEX_FILE)


def cleanup_analytics():
    while True:
        time.sleep(60)
        cutoff = int(time.time() * 1000) - 300000
        active_viewer_ids = set()
        analytics['streamViews'] = [
            entry for entry in analytics['streamViews']
            if (seen_at := int(datetime.fromisoformat(entry['timestamp']).timestamp() * 1000)) >= cutoff
            and (active_viewer_ids.add(entry['viewerId']) or True if entry.get('viewerId') else True)
        ]
        analytics['activeUsers'] = active_viewer_ids


def sse_heartbeat():
    while True:
        time.sleep(SSE_HEARTBEAT_MS / 1000)
        broadcast_sse_event('ping', {'timestamp': datetime.now().isoformat()})


# WebSocket handlers for real-time streaming
stream_viewers = set()
stream_admin = None

@socketio.on('connect')
def handle_connect():
    emit('connected', {'status': 'ok', 'timestamp': datetime.now().isoformat()})

@socketio.on('disconnect')
def handle_disconnect():
    global stream_viewers
    stream_viewers.discard(request.sid)

@socketio.on('join_stream')
def handle_join_stream(data):
    global stream_viewers
    stream_viewers.add(request.sid)
    emit('stream_status', {'viewers': len(stream_viewers), 'streaming': stream_admin is not None})
    emit('stream_viewers', {'count': len(stream_viewers)}, broadcast=True)

@socketio.on('leave_stream')
def handle_leave_stream():
    global stream_viewers
    stream_viewers.discard(request.sid)
    emit('stream_viewers', {'count': len(stream_viewers)}, broadcast=True)

@socketio.on('stream_frame')
def handle_stream_frame(data):
    global stream_admin
    if stream_admin is None:
        stream_admin = request.sid
        emit('stream_started', {'timestamp': datetime.now().isoformat()}, broadcast=True)
    
    frame_data = data.get('frame')
    timestamp = data.get('timestamp', int(time.time() * 1000))
    
    emit('stream_frame', {
        'frame': frame_data,
        'timestamp': timestamp,
        'viewers': len(stream_viewers)
    }, broadcast=True, skip_sid=request.sid)

@socketio.on('stream_stop')
def handle_stream_stop():
    global stream_admin
    if stream_admin == request.sid:
        stream_admin = None
        emit('stream_ended', {'timestamp': datetime.now().isoformat()}, broadcast=True)

@socketio.on('stream_ping')
def handle_stream_ping():
    emit('stream_pong', {'timestamp': datetime.now().isoformat(), 'viewers': len(stream_viewers)})

@socketio.on_error_default
def default_error_handler(e):
    print(f'SocketIO error: {e}')


if __name__ == '__main__':
    app.config['START_TIME'] = time.time()
    ensure_data_file()

    print(f"CricketLive Pro server running on http://localhost:{PORT}")
    print("WebSocket streaming enabled!")
    socketio.run(app, host='0.0.0.0', port=PORT, debug=False)
