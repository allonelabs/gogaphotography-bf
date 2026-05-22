import "server-only";

import { cookies } from "next/headers";
import { gogaAdmin } from "@/app/lib/supabase/goga";

const enc = new TextEncoder();
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function b64url(bytes: ArrayBuffer): string {
  const arr = new Uint8Array(bytes);
  let bin = "";
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]!);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(s: string): Uint8Array {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}
async function hmac(secret: string, msg: string): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return crypto.subtle.sign("HMAC", key, enc.encode(msg));
}
function safeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}
function cookieName(token: string): string {
  return `gp_delivery_${token}`;
}
function secret(): string {
  // NextAuth secret doubles as the per-delivery HMAC secret here. We don't
  // need a separate ADMIN_SESSION_SECRET — this cookie scope is its own,
  // and NEXTAUTH_SECRET is always available.
  return (
    process.env["NEXTAUTH_SECRET"] ??
    process.env["AUTH_SECRET"] ??
    "delivery-fallback-secret"
  );
}

export async function setDeliveryCookie(token: string): Promise<{
  name: string;
  value: string;
  options: {
    httpOnly: true;
    secure: boolean;
    sameSite: "lax";
    path: string;
    maxAge: number;
  };
}> {
  const expiresAt = Date.now() + TTL_MS;
  const sig = await hmac(secret(), String(expiresAt));
  const value = `${expiresAt}.${b64url(sig)}`;
  return {
    name: cookieName(token),
    value,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: Math.floor(TTL_MS / 1000),
    },
  };
}

export async function hasDeliveryCookie(token: string): Promise<boolean> {
  const c = (await cookies()).get(cookieName(token))?.value;
  if (!c) return false;
  const dot = c.indexOf(".");
  if (dot <= 0) return false;
  const expStr = c.slice(0, dot);
  const sigStr = c.slice(dot + 1);
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp <= Date.now()) return false;
  const expected = await hmac(secret(), expStr);
  return safeEqual(new Uint8Array(expected), fromB64url(sigStr));
}

export type DeliveryRow = {
  id: string;
  booking_id: string;
  token: string;
  password_hash: string | null;
  intro_en: string | null;
  intro_ka: string | null;
  expires_at: string | null;
  downloads_enabled: boolean;
  archived: boolean;
};

export async function loadDelivery(token: string): Promise<DeliveryRow | null> {
  const { data } = await gogaAdmin()
    .from("deliveries")
    .select(
      "id, booking_id, token, password_hash, intro_en, intro_ka, expires_at, downloads_enabled, archived",
    )
    .eq("token", token)
    .maybeSingle();
  return data;
}

export function deliveryExpired(d: DeliveryRow): boolean {
  if (!d.expires_at) return false;
  return new Date(d.expires_at).getTime() < Date.now();
}
