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
import { getServerTr, getServerLocale } from "@/app/lib/i18n/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pinterest" };

export default async function PinterestPage() {
  const tr = await getServerTr();
  const locale = await getServerLocale();
  const dateLocale = locale === "ka" ? "ka-GE" : "en-US";
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
      breadcrumb={[
        { label: tr("Content", "კონტენტი") },
        { label: tr("Pinterest", "Pinterest") },
      ]}
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
              {tr("Set", "დააყენეთ")} <code>PINTEREST_APP_ID</code>{" "}
              {tr("and", "და")} <code>PINTEREST_APP_SECRET</code>{" "}
              {tr(
                "in the project env to enable the connection.",
                "პროექტის გარემოში (env), რომ ჩართოთ კავშირი.",
              )}
            </p>
          )}
          {configured && !connected && (
            <a
              href="/api/pinterest/oauth/start"
              className="inline-block rounded-full bg-black px-5 py-2.5 text-sm text-white"
            >
              {tr("Connect Pinterest", "დააკავშირე Pinterest")}
            </a>
          )}
          {connected && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm">
                  {tr("Connected as", "დაკავშირებულია როგორც")}{" "}
                  <strong>{settings.connected_account}</strong>
                </p>
                <form action={disconnectPinterest}>
                  <button className="text-xs text-red-600 underline">
                    {tr("Disconnect", "კავშირის გაწყვეტა")}
                  </button>
                </form>
              </div>
              <form action={savePinterestSettings} className="space-y-3">
                <label className="block text-sm">
                  {tr("Default board", "ნაგულისხმევი დაფა")}
                  <select
                    name="default_board_id"
                    defaultValue={settings.default_board_id ?? ""}
                    className="mt-1 block rounded border px-2 py-1 text-sm"
                  >
                    <option value="">{tr("— none —", "— არცერთი —")}</option>
                    {boards.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  {tr("Board map (JSON, e.g.", "დაფების რუკა (JSON, მაგ.")}{" "}
                  {`{"blog:weddings":"<id>","product":"<id>"}`})
                  <textarea
                    name="board_map"
                    rows={3}
                    defaultValue={JSON.stringify(settings.board_map)}
                    className="mt-1 block w-full rounded border px-2 py-1 font-mono text-xs"
                  />
                </label>
                <label className="block text-sm">
                  {tr("Pins per run", "პინები გაშვებაზე")}
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
                  {tr("Automation enabled", "ავტომატიზაცია ჩართულია")}
                </label>
                <button className="rounded-full bg-[var(--ao-accent)] px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-white">
                  {tr("Save", "შენახვა")}
                </button>
              </form>
              <p className="mt-1 text-xs text-neutral-400">
                {tr("Available boards", "ხელმისაწვდომი დაფები")}:{" "}
                {boards.map((b) => `${b.name} (${b.id})`).join(", ") || "—"}
              </p>
            </div>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {tr("Queue", "რიგი")} ({queue.length})
            </h2>
            <form action={backfillPins}>
              <button className="rounded-full border px-3 py-1.5 text-xs">
                {tr(
                  "Backfill eligible content",
                  "შესაბამისი კონტენტის დამატება",
                )}
              </button>
            </form>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-neutral-500">
                <th className="py-2">{tr("Type", "ტიპი")}</th>
                <th>{tr("Status", "სტატუსი")}</th>
                <th>{tr("Scheduled", "დაგეგმილია")}</th>
                <th>{tr("Pin / error", "პინი / შეცდომა")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {queue.map((p: PinterestPinRow) => (
                <tr key={p.id} className="border-t border-black/5">
                  <td className="py-2">{p.content_type}</td>
                  <td>{p.status}</td>
                  <td>
                    {new Date(p.scheduled_for).toLocaleString(dateLocale)}
                  </td>
                  <td className="max-w-[240px] truncate text-xs text-neutral-500">
                    {p.pin_id ?? p.error ?? "—"}
                  </td>
                  <td className="space-x-2 text-right">
                    <form
                      action={requeuePin.bind(null, p.id)}
                      className="inline"
                    >
                      <button className="text-xs underline">
                        {tr("re-queue", "თავიდან რიგში")}
                      </button>
                    </form>
                    <form action={skipPin.bind(null, p.id)} className="inline">
                      <button className="text-xs text-red-600 underline">
                        {tr("skip", "გამოტოვება")}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {queue.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-neutral-400">
                    {tr("Queue is empty.", "რიგი ცარიელია.")}
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
