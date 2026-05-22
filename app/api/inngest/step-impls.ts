// V4 stub — Inngest step impls run on Hetzner via the runner.
export type RunContext = unknown;
export const createBridgeDispatcher = () => ({ dispatch: async () => null });
export const STEP_IMPLS: Record<string, (ctx: unknown) => Promise<unknown>> = {};
