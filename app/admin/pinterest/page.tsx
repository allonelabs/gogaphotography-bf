// app/app/pinterest/page.tsx
import { AppShell } from "@/app/components/app/AppShell";
import { isPinterestConfigured, listBoards } from "@/app/lib/pinterest";
import {
  getSettings,
  isConnected,
  getValidAccessToken,
} from "@/app/lib/goga/pinterest-settings";
import { listQueue } from "@/app/lib/goga/pinterest-queue";
import {
  savePinterestSettings,
  disconnectPinterest,
  backfillPins,
  skipPin,
  requeuePin,
} from "@/app/lib/goga/actions-pinterest";
import type { PinterestPinRow } from "@/app/lib/db/pinterest-types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pinterest" };

export default async function PinterestPage() {
  const configured = isPinterestConfigured();
  const settings = await getSettings();
  const connected = isConnected(settings);
  const queue = await listQueue();

  let boards: { id: string; name: string }[] = [];
  if (connected) {
    try {
      const token = await getValidAccessToken();
      if (token) boards = await listBoards(token);
    } catch {
      boards = [];
    }
  }

  return (
    <AppShell
      breadcrumb={[{ label: "Content" }, { label: "Pinterest" }]}
      chatScope={{ level: "tool", tool: "pinterest" }}
      chatScopeLabel="Pinterest"
    >
      <div className="mx-auto max-w-5xl space-y-10 px-4 py-6 sm:px-6 sm:py-8">
        <section>
          <h1 className="mb-4 text-xl font-semibold text-[var(--ink-900)]">
            Pinterest
          </h1>
          {!configured && (
            <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
              Set <code>PINTEREST_APP_ID</code> and{" "}
              <code>PINTEREST_APP_SECRET</code> in the project env to enable the
              connection.
            </p>
          )}
          {configured && !connected && (
            <a
              href="/api/pinterest/oauth/start"
              className="inline-block rounded-full bg-black px-5 py-2.5 text-sm text-white"
            >
              Connect Pinterest
            </a>
          )}
          {connected && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm">
                  Connected as <strong>{settings.connected_account}</strong>
                </p>
                <form action={disconnectPinterest}>
                  <button className="text-xs text-red-600 underline">
                    Disconnect
                  </button>
                </form>
              </div>
              <form action={savePinterestSettings} className="space-y-3">
                <label className="block text-sm">
                  Default board
                  <select
                    name="default_board_id"
                    defaultValue={settings.default_board_id ?? ""}
                    className="mt-1 block rounded border px-2 py-1 text-sm"
                  >
                    <option value="">— none —</option>
                    {boards.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  Board map (JSON, e.g.{" "}
                  {`{"blog:weddings":"<id>","product":"<id>"}`})
                  <textarea
                    name="board_map"
                    rows={3}
                    defaultValue={JSON.stringify(settings.board_map)}
                    className="mt-1 block w-full rounded border px-2 py-1 font-mono text-xs"
                  />
                </label>
                <label className="block text-sm">
                  Pins per run
                  <input
                    name="pins_per_run"
                    type="number"
                    min="1"
                    defaultValue={settings.pins_per_run}
                    className="ml-2 w-20 rounded border px-2 py-1 text-sm"
                  />
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    name="enabled"
                    type="checkbox"
                    defaultChecked={settings.enabled}
                  />{" "}
                  Automation enabled
                </label>
                <button className="rounded-full bg-[var(--ao-accent)] px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-white">
                  Save
                </button>
              </form>
              <p className="mt-1 text-xs text-neutral-400">
                Available boards:{" "}
                {boards.map((b) => `${b.name} (${b.id})`).join(", ") || "—"}
              </p>
            </div>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Queue ({queue.length})</h2>
            <form action={backfillPins}>
              <button className="rounded-full border px-3 py-1.5 text-xs">
                Backfill eligible content
              </button>
            </form>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-neutral-500">
                <th className="py-2">Type</th>
                <th>Status</th>
                <th>Scheduled</th>
                <th>Pin / error</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {queue.map((p: PinterestPinRow) => (
                <tr key={p.id} className="border-t border-black/5">
                  <td className="py-2">{p.content_type}</td>
                  <td>{p.status}</td>
                  <td>{new Date(p.scheduled_for).toLocaleString()}</td>
                  <td className="max-w-[240px] truncate text-xs text-neutral-500">
                    {p.pin_id ?? p.error ?? "—"}
                  </td>
                  <td className="space-x-2 text-right">
                    <form
                      action={requeuePin.bind(null, p.id)}
                      className="inline"
                    >
                      <button className="text-xs underline">re-queue</button>
                    </form>
                    <form action={skipPin.bind(null, p.id)} className="inline">
                      <button className="text-xs text-red-600 underline">
                        skip
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {queue.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-neutral-400">
                    Queue is empty.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
    </AppShell>
  );
}
