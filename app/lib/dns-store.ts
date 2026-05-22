// dns-store — server-only persistence for DNS records.
import 'server-only';

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { resolveOutRoot } from './spawn-loader';

export const VALID_SPAWN_ID = /^[a-z0-9][a-z0-9.\-_]*$/i;

export type DnsType = 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS' | 'CAA' | 'SRV';

export interface DnsRecord {
  id: string;
  type: DnsType;
  /** Subdomain prefix, e.g. "@", "www", "mail". */
  name: string;
  value: string;
  /** TTL in seconds. */
  ttl: number;
  /** MX priority (only used when type === 'MX'). */
  priority?: number;
  /** Verified by deployer (set after a real DNS check). */
  verified: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

const DEFAULT: DnsRecord[] = [];

function dnsFile(id: string): string | null {
  if (!VALID_SPAWN_ID.test(id)) return null;
  return path.join(resolveOutRoot(), id, 'site', '.bf', 'dns.json');
}

export async function readDns(spawnId: string): Promise<DnsRecord[]> {
  const f = dnsFile(spawnId);
  if (!f) return DEFAULT;
  try {
    const raw = await readFile(f, 'utf8');
    const parsed = JSON.parse(raw) as DnsRecord[];
    return Array.isArray(parsed) ? parsed : DEFAULT;
  } catch { return DEFAULT; }
}

export async function writeDns(spawnId: string, records: DnsRecord[]): Promise<void> {
  const f = dnsFile(spawnId);
  if (!f) throw new Error('invalid spawn id');
  await mkdir(path.dirname(f), { recursive: true });
  await writeFile(f, JSON.stringify(records, null, 2), 'utf8');
}
