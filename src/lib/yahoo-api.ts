const YAHOO_API_BASE = "https://fantasysports.yahooapis.com/fantasy/v2";

interface YahooRequestOptions {
  accessToken: string;
  path: string;
}

async function yahooFetch({ accessToken, path }: YahooRequestOptions) {
  const url = `${YAHOO_API_BASE}${path}?format=json`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Yahoo API error ${response.status}: ${text}`);
  }

  return response.json();
}

// Get all MLB leagues for the current user
export async function getUserLeagues(accessToken: string) {
  const data = await yahooFetch({
    accessToken,
    path: "/users;use_login=1/games;game_codes=mlb/leagues",
  });
  return data;
}

// Get a specific league's details
export async function getLeague(accessToken: string, leagueKey: string) {
  const data = await yahooFetch({
    accessToken,
    path: `/league/${leagueKey}`,
  });
  return data;
}

// Get league standings
export async function getStandings(accessToken: string, leagueKey: string) {
  const data = await yahooFetch({
    accessToken,
    path: `/league/${leagueKey}/standings`,
  });
  return data;
}

// Get league scoreboard
export async function getScoreboard(accessToken: string, leagueKey: string) {
  const data = await yahooFetch({
    accessToken,
    path: `/league/${leagueKey}/scoreboard`,
  });
  return data;
}

// Get team roster
export async function getTeamRoster(accessToken: string, teamKey: string) {
  const data = await yahooFetch({
    accessToken,
    path: `/team/${teamKey}/roster/players/stats`,
  });
  return data;
}

// Get team details
export async function getTeam(accessToken: string, teamKey: string) {
  const data = await yahooFetch({
    accessToken,
    path: `/team/${teamKey}`,
  });
  return data;
}

// Get user's teams for a league
export async function getUserTeams(accessToken: string, leagueKey: string) {
  const data = await yahooFetch({
    accessToken,
    path: `/league/${leagueKey}/teams;use_login=1`,
  });
  return data;
}

// Search players in a league
export async function searchPlayers(
  accessToken: string,
  leagueKey: string,
  query: string,
  position?: string
) {
  let path = `/league/${leagueKey}/players;search=${encodeURIComponent(query)}`;
  if (position) {
    path += `;position=${position}`;
  }
  path += "/stats";
  const data = await yahooFetch({ accessToken, path });
  return data;
}

// Get free agents in a league
export async function getFreeAgents(
  accessToken: string,
  leagueKey: string,
  position?: string,
  start = 0,
  count = 25
) {
  let path = `/league/${leagueKey}/players;status=FA;start=${start};count=${count}`;
  if (position) {
    path += `;position=${position}`;
  }
  path += "/stats";
  const data = await yahooFetch({ accessToken, path });
  return data;
}

// Get league settings (stat categories, roster positions)
export async function getLeagueSettings(accessToken: string, leagueKey: string) {
  const data = await yahooFetch({
    accessToken,
    path: `/league/${leagueKey}/settings`,
  });
  return data;
}

// Get league transactions
export async function getTransactions(
  accessToken: string,
  leagueKey: string,
  type?: string
) {
  let path = `/league/${leagueKey}/transactions`;
  if (type) {
    path += `;type=${type}`;
  }
  const data = await yahooFetch({ accessToken, path });
  return data;
}

// Add/drop player
export async function addDropPlayer(
  accessToken: string,
  leagueKey: string,
  addPlayerKey: string,
  dropPlayerKey?: string
) {
  const url = `${YAHOO_API_BASE}/league/${leagueKey}/transactions?format=json`;

  let xml: string;
  if (dropPlayerKey) {
    xml = `<?xml version="1.0" encoding="UTF-8"?>
<fantasy_content>
  <transaction>
    <type>add/drop</type>
    <players>
      <player>
        <player_key>${addPlayerKey}</player_key>
        <transaction_data>
          <type>add</type>
        </transaction_data>
      </player>
      <player>
        <player_key>${dropPlayerKey}</player_key>
        <transaction_data>
          <type>drop</type>
        </transaction_data>
      </player>
    </players>
  </transaction>
</fantasy_content>`;
  } else {
    xml = `<?xml version="1.0" encoding="UTF-8"?>
<fantasy_content>
  <transaction>
    <type>add</type>
    <players>
      <player>
        <player_key>${addPlayerKey}</player_key>
        <transaction_data>
          <type>add</type>
        </transaction_data>
      </player>
    </players>
  </transaction>
</fantasy_content>`;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/xml",
    },
    body: xml,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Yahoo API error ${response.status}: ${text}`);
  }

  return response.json();
}
