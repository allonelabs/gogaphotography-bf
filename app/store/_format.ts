// app/store/_format.ts — plain (non-client) helpers usable from server and client.
export function formatGel(cents: number): string {
  return `${(cents / 100).toFixed(2)} ₾`;
}
