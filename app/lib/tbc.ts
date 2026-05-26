import "server-only";

/**
 * TBC Bank TPay API client. Ported from the Walkby integration — same
 * shape, scoped here to the photographer studio's deposit flow.
 *
 * Auth: client_credentials → 24h access token. Cache in module memory
 * with a 60s safety buffer. Every call adds the static `apikey` header
 * alongside the Bearer token.
 *
 * Bank-as-source-of-truth: on webhook receipt we DON'T trust the body —
 * we GET /payments/{payId} with our key to confirm status. See
 * `app/lib/goga/finalize-tbc.ts`.
 */

const TBC_API_URL = process.env["TBC_API_URL"] || "https://api.tbcbank.ge";
const TBC_API_KEY = process.env["TBC_API_KEY"] || "";
const TBC_CLIENT_ID = process.env["TBC_CLIENT_ID"] || "";
const TBC_CLIENT_SECRET = process.env["TBC_CLIENT_SECRET"] || "";

let cachedToken: { token: string; expiresAt: number } | null = null;

function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = 15_000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(timer),
  );
}

export function isTbcConfigured(): boolean {
  return !!TBC_CLIENT_ID && !!TBC_CLIENT_SECRET && !!TBC_API_KEY;
}

export async function getTbcAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }
  const res = await fetchWithTimeout(`${TBC_API_URL}/v1/tpay/access-token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      apikey: TBC_API_KEY,
    },
    body: new URLSearchParams({
      client_id: TBC_CLIENT_ID,
      client_secret: TBC_CLIENT_SECRET,
    }).toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`TBC auth failed (${res.status}): ${text}`);
  }
  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return cachedToken.token;
}

interface CreateTbcPaymentParams {
  externalOrderId: string;
  totalAmount: number;
  currency?: string;
  callbackUrl: string;
  returnUrl: string;
  locale?: "ka" | "en";
  description?: string;
}

interface TbcLink {
  rel: string;
  uri: string;
}

interface TbcPaymentResponse {
  payId: string;
  redirectUrl: string;
}

export async function createTbcPayment(
  params: CreateTbcPaymentParams,
): Promise<TbcPaymentResponse> {
  const token = await getTbcAccessToken();
  const body = {
    amount: {
      currency: params.currency || "GEL",
      total: params.totalAmount,
    },
    returnurl: params.returnUrl,
    callbackUrl: params.callbackUrl,
    merchantPaymentId: params.externalOrderId,
    language: (params.locale || "ka").toUpperCase(),
    description: params.description?.slice(0, 30),
  };
  const res = await fetchWithTimeout(`${TBC_API_URL}/v1/tpay/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: TBC_API_KEY,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`TBC create payment failed (${res.status}): ${text}`);
  }
  const data = (await res.json()) as {
    payId?: string;
    links?: TbcLink[];
  };
  const approval = data.links?.find((l) => l.rel === "approval_url");
  if (!approval?.uri || !data.payId) {
    throw new Error(`TBC payment malformed response: ${JSON.stringify(data)}`);
  }
  return { payId: data.payId, redirectUrl: approval.uri };
}

export interface TbcPaymentDetails {
  payId: string;
  status?: string;
  merchantPaymentId?: string;
  amount?: { total?: number; currency?: string };
  paymentMethod?: string;
  recurringCard?: { recId?: string; cardMask?: string; expiryDate?: string };
}

export async function getTbcPaymentDetails(
  payId: string,
): Promise<TbcPaymentDetails> {
  const token = await getTbcAccessToken();
  const res = await fetchWithTimeout(
    `${TBC_API_URL}/v1/tpay/payments/${payId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: TBC_API_KEY,
        Accept: "application/json",
      },
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`TBC get payment failed (${res.status}): ${text}`);
  }
  return (await res.json()) as TbcPaymentDetails;
}

export async function cancelTbcPayment(payId: string, amount?: number) {
  const token = await getTbcAccessToken();
  const res = await fetchWithTimeout(
    `${TBC_API_URL}/v1/tpay/payments/${payId}/cancel`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        apikey: TBC_API_KEY,
      },
      body: amount ? JSON.stringify({ amount }) : "{}",
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`TBC cancel failed (${res.status}): ${text}`);
  }
  return res.json();
}
