// V4 stub — heavy logic proxied to Hetzner runner.
import { proxyToRunner } from '@/app/lib/hetzner-proxy';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(req: Request) { return proxyToRunner(req); }
