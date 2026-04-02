import { type NextAuthOptions } from "next-auth";

const DEPLOY_VERSION = "v8-fix-jwt-expiry";

console.log(`[fantasy-auth] Loading auth config ${DEPLOY_VERSION}`, {
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  hasClientId: !!process.env.YAHOO_CLIENT_ID,
  hasClientSecret: !!process.env.YAHOO_CLIENT_SECRET,
  clientIdLength: process.env.YAHOO_CLIENT_ID?.length,
});

export const authOptions: NextAuthOptions = {
  debug: true,
  logger: {
    error(code, metadata) {
      console.error(`[fantasy-auth][${DEPLOY_VERSION}] ERROR`, code, JSON.stringify(metadata, null, 2));
    },
    warn(code) {
      console.warn(`[fantasy-auth][${DEPLOY_VERSION}] WARN`, code);
    },
    debug(code, metadata) {
      console.log(`[fantasy-auth][${DEPLOY_VERSION}] DEBUG`, code, JSON.stringify(metadata, null, 2));
    },
  },
  providers: [
    {
      id: "yahoo",
      name: "Yahoo",
      type: "oauth",
      wellKnown:
        "https://api.login.yahoo.com/.well-known/openid-configuration",
      authorization: {
        params: { scope: "openid fspt-r" },
      },
      clientId: process.env.YAHOO_CLIENT_ID,
      clientSecret: process.env.YAHOO_CLIENT_SECRET,
      client: {
        token_endpoint_auth_method: "client_secret_basic",
      },
      checks: ["state"],
      idToken: false,
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name || profile.nickname || profile.preferred_username,
          email: profile.email,
          image: profile.picture,
        };
      },
    },
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        console.log(`[fantasy-auth] JWT callback with account`, {
          hasAccessToken: !!account.access_token,
          hasRefreshToken: !!account.refresh_token,
          expiresAt: account.expires_at,
          expiresIn: account.expires_in,
        });
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        // Yahoo may return expires_in (seconds) instead of expires_at (timestamp)
        token.expiresAt =
          account.expires_at ??
          Math.floor(Date.now() / 1000) + (Number(account.expires_in) || 3600);
      }

      // Return token if it hasn't expired (or if expiresAt is not set)
      if (!token.expiresAt || Date.now() < (token.expiresAt as number) * 1000) {
        return token;
      }

      // Refresh the token
      try {
        const response = await fetch(
          "https://api.login.yahoo.com/oauth2/get_token",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              Authorization: `Basic ${Buffer.from(
                `${process.env.YAHOO_CLIENT_ID}:${process.env.YAHOO_CLIENT_SECRET}`
              ).toString("base64")}`,
            },
            body: new URLSearchParams({
              grant_type: "refresh_token",
              refresh_token: token.refreshToken as string,
            }),
          }
        );

        const refreshed = await response.json();

        if (!response.ok) throw refreshed;

        return {
          ...token,
          accessToken: refreshed.access_token,
          refreshToken: refreshed.refresh_token ?? token.refreshToken,
          expiresAt: Math.floor(Date.now() / 1000) + refreshed.expires_in,
        };
      } catch (error) {
        console.error("Error refreshing access token", error);
        return { ...token, error: "RefreshAccessTokenError" };
      }
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      session.error = token.error as string | undefined;
      return session;
    },
  },
  pages: {
    signIn: "/",
    error: "/auth/error",
  },
};
