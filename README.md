# Fantasy Baseball Manager

A Next.js app for managing your Yahoo Fantasy Baseball team with agent-friendly evaluation APIs.

**Live:** https://fantasy-lyart.vercel.app

## Features

- **Dashboard** - League overview with stat cards
- **My Team** - Roster with player stats, split by batters/pitchers
- **Standings** - League standings with W-L records
- **Players** - Sortable stats table, player search, free agent browser
- **Evaluate** - AI-ready roster evaluation comparing your players vs top free agents per position
- **Trades** - Scan all league rosters for mutually beneficial trade opportunities
- **Transactions** - View league transaction history filtered by type

### Stat Coverage Toggle

Switch between stat views on Team and Players pages:
- **Season** - Full YTD totals
- **Last 30 Days** - Recent performance
- **Last 7 Days** - Current hot/cold streaks

### Deep Scan Mode

Toggle on the Evaluate page to fetch 25 free agents per position (vs default 5) and re-rank them by your league's actual scoring categories instead of Yahoo's default ranking.

## Agent API Endpoints

All endpoints require authentication via Yahoo OAuth session.

### GET /api/yahoo/evaluate

Analyzes your roster against available free agents.

```
?leagueKey={key}
&deepScan=true          # optional: fetch 25 FAs and re-rank by league scoring
&coverage=season        # optional: season | lastmonth | lastweek
```

Returns: scoring categories, roster with stats, per-position free agent comparisons with diffs, recommended moves.

### GET /api/yahoo/trades?mode=scan

Scans all league rosters for trade opportunities.

```
?leagueKey={key}&mode=scan
```

Returns: your team strengths/weaknesses, trade targets with suggested mutually beneficial swaps.

### GET /api/yahoo/trades?mode=evaluate

Evaluates a specific player-for-player trade.

```
?leagueKey={key}&mode=evaluate&give={playerKey}&get={playerKey}
```

Returns: category-by-category impact, net score, verdict (favorable/neutral/unfavorable).

### GET /api/yahoo/settings

Returns league scoring categories and roster positions.

```
?leagueKey={key}
&debug=true             # optional: returns raw Yahoo API response
```

## Setup

### Prerequisites

1. Register an app at https://developer.yahoo.com/apps/
   - Type: **Confidential Client**
   - Permissions: **Fantasy Sports (Read)**
   - Redirect URI: `http://localhost:3000/api/auth/callback/yahoo`

2. Copy your Client ID and Client Secret

### Install

```bash
npm install
```

### Configure

Copy `.env.example` to `.env.local` and fill in your values:

```
YAHOO_CLIENT_ID=your_client_id
YAHOO_CLIENT_SECRET=your_client_secret
NEXTAUTH_SECRET=output_of_openssl_rand_-base64_32
NEXTAUTH_URL=http://localhost:3000
```

### Run

```bash
npm run dev
```

Visit http://localhost:3000 and sign in with Yahoo.

### Deploy to Vercel

1. Push to GitHub
2. Link to Vercel: `npx vercel link`
3. Set environment variables in Vercel project settings
4. Add production redirect URI in Yahoo app: `https://your-domain.vercel.app/api/auth/callback/yahoo`
5. Deploy: `npx vercel deploy --prod`

## Tech Stack

- **Next.js 16** (App Router)
- **NextAuth.js** with Yahoo OAuth 2.0 (OIDC)
- **Tailwind CSS**
- **Yahoo Fantasy Sports API**
