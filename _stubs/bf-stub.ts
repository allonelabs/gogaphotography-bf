// V3 stub — every @bf/* import resolves here at build time so webpack
// doesn't pull spawn-pipeline lib code into business-zone's bundle.
// Real functionality flows from Hetzner via lib/hetzner.ts in V3-F.
//
// This module exports proxies that match the most common shapes so
// destructured imports don't crash at compile. Anything that's actually
// CALLED at runtime will throw — and that's intentional, surfaces
// which functions need restoring.

const handler: ProxyHandler<object> = {
  get(_target: object, prop: string | symbol): unknown {
    if (prop === "__esModule") return true;
    if (prop === Symbol.toPrimitive) return () => "";
    if (typeof prop === "symbol") return undefined;
    // Return a function that throws so client-side calls surface clearly,
    // but allows server-side type imports / destructuring to succeed.
    const stub = (...args: unknown[]) => {
      void args;
      throw new Error(
        `@bf stub: ${String(prop)} is not implemented in business-zone — restore via Hetzner endpoint (see SPLIT-V3-PLAN V3-F)`,
      );
    };
    // Common type-like fields that some destructures expect to exist
    Object.defineProperty(stub, "__bfStubProp", { value: prop });
    return stub;
  },
};

const stub = new Proxy({}, handler);

// Default export
export default stub;

// Common named exports — any string-keyed access through the Proxy works,
// but TypeScript needs SOME explicit names for the import * pattern.
// These are bound dynamically via the Proxy.
export const __any: unknown = stub;

// ── Explicit named stubs for preserved surfaces that still typecheck ────
// Webhook signature verifier — billing UI is preserved (Task 25 wires real
// Stripe). Returns a typed shape so the webhook route compiles; throws at
// runtime so unconfigured deployments fail loudly instead of silently
// accepting unverified payloads.
export function verifyStripeSignature(
  _rawBody: string,
  _header: string | null,
  _secret: string,
): { ok: true } | { ok: false; reason: string } {
  throw new Error(
    "@bf stub: verifyStripeSignature is not implemented — wire real Stripe verifier in Task 25",
  );
}
