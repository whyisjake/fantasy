import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getTransactions, addDropPlayer } from "@/lib/yahoo-api";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const leagueKey = searchParams.get("leagueKey");
  const type = searchParams.get("type") || undefined;

  if (!leagueKey) {
    return NextResponse.json({ error: "leagueKey required" }, { status: 400 });
  }

  try {
    const data = await getTransactions(session.accessToken, leagueKey, type);
    const transactions = parseTransactions(data);
    return NextResponse.json({ transactions });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { leagueKey, addPlayerKey, dropPlayerKey } = body;

    if (!leagueKey || !addPlayerKey) {
      return NextResponse.json(
        { error: "leagueKey and addPlayerKey required" },
        { status: 400 }
      );
    }

    const data = await addDropPlayer(
      session.accessToken,
      leagueKey,
      addPlayerKey,
      dropPlayerKey
    );
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error creating transaction:", error);
    return NextResponse.json(
      { error: "Failed to create transaction" },
      { status: 500 }
    );
  }
}

function parseTransactions(data: Record<string, unknown>) {
  try {
    const fc = data?.fantasy_content as Record<string, unknown>;
    const league = fc?.league as Array<unknown>;
    const txData = league?.[1] as Record<string, unknown>;
    const transactions = txData?.transactions as Record<string, unknown>;

    const txList: Array<Record<string, unknown>> = [];
    let idx = 0;

    while (transactions?.[String(idx)]) {
      const tx = transactions[String(idx)] as Record<string, unknown>;
      const txInfo = tx?.transaction as Array<unknown>;
      const meta = txInfo?.[0] as Record<string, unknown>;
      const players = txInfo?.[1] as Record<string, unknown>;

      const transaction: Record<string, unknown> = {
        type: meta?.type,
        status: meta?.status,
        timestamp: meta?.timestamp,
      };

      // Parse players involved
      const playerList: Array<Record<string, unknown>> = [];
      const playersObj = players?.players as Record<string, unknown>;
      let pIdx = 0;

      while (playersObj?.[String(pIdx)]) {
        const player = playersObj[String(pIdx)] as Record<string, unknown>;
        const playerData = player?.player as Array<unknown>;
        const info = playerData?.[0] as Array<unknown>;
        const txPlayerData = playerData?.[1] as Record<string, unknown>;

        let playerInfo: Record<string, unknown> = {};
        for (const item of info || []) {
          if (typeof item === "object" && item !== null) {
            const obj = item as Record<string, unknown>;
            if ("player_key" in obj) playerInfo.player_key = obj.player_key;
            if ("name" in obj) playerInfo.name = (obj.name as Record<string, unknown>)?.full;
            if ("editorial_team_abbr" in obj) playerInfo.team = obj.editorial_team_abbr;
            if ("display_position" in obj) playerInfo.position = obj.display_position;
          }
        }

        if (txPlayerData?.transaction_data) {
          const td = (txPlayerData.transaction_data as Array<Record<string, unknown>>)?.[0];
          playerInfo.transaction_type = td?.type;
          playerInfo.destination_team = td?.destination_team_name;
          playerInfo.source_team = td?.source_team_name;
        }

        playerList.push(playerInfo);
        pIdx++;
      }

      transaction.players = playerList;
      txList.push(transaction);
      idx++;
    }

    return txList;
  } catch (e) {
    console.error("Error parsing transactions:", e);
    return [];
  }
}
