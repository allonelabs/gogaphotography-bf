// app/lib/pinterest.ts
import "server-only";

const API = "https://api.pinterest.com/v5";

export function isPinterestConfigured(): boolean {
  return !!process.env.PINTEREST_APP_ID && !!process.env.PINTEREST_APP_SECRET;
}

function basicAuth(): string {
  const id = process.env.PINTEREST_APP_ID ?? "";
  const secret = process.env.PINTEREST_APP_SECRET ?? "";
  return Buffer.from(`${id}:${secret}`).toString("base64");
}

export interface TokenSet {
  access_token: string;
  refresh_token?: string;
  expires_in: number; // seconds
}

async function tokenRequest(body: URLSearchParams): Promise<TokenSet> {
  const res = await fetch(`${API}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth()}`,
    },
    body: body.toString(),
  });
  if (!res.ok)
    throw new Error(`pinterest token (${res.status}): ${await res.text()}`);
  return (await res.json()) as TokenSet;
}

export function authorizeUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.PINTEREST_APP_ID ?? "",
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "boards:read,pins:read,pins:write,user_accounts:read",
    state,
  });
  return `https://www.pinterest.com/oauth/?${params.toString()}`;
}

export function exchangeCode(
  code: string,
  redirectUri: string,
): Promise<TokenSet> {
  return tokenRequest(
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  );
}

export function refreshAccessToken(refreshToken: string): Promise<TokenSet> {
  return tokenRequest(
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  );
}

export async function getUserAccount(
  accessToken: string,
): Promise<{ username?: string }> {
  const res = await fetch(`${API}/user_account`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return {};
  return (await res.json()) as { username?: string };
}

export async function listBoards(
  accessToken: string,
): Promise<{ id: string; name: string }[]> {
  const res = await fetch(`${API}/boards?page_size=100`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok)
    throw new Error(`pinterest boards (${res.status}): ${await res.text()}`);
  const data = (await res.json()) as {
    items?: { id: string; name: string }[];
  };
  return (data.items ?? []).map((b) => ({ id: b.id, name: b.name }));
}

export interface CreatePinInput {
  board_id: string;
  title: string;
  description: string;
  link: string;
  image_url: string;
}
export async function createPin(
  accessToken: string,
  input: CreatePinInput,
): Promise<{ id: string }> {
  const res = await fetch(`${API}/pins`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      board_id: input.board_id,
      title: input.title,
      description: input.description,
      link: input.link,
      media_source: { source_type: "image_url", url: input.image_url },
    }),
  });
  if (!res.ok)
    throw new Error(`pinterest createPin (${res.status}): ${await res.text()}`);
  return (await res.json()) as { id: string };
}
