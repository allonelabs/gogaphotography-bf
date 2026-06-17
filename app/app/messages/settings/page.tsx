// app/app/messages/settings/page.tsx
import { AppShell } from "@/app/components/app/AppShell";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { saveMetaSettings } from "@/app/lib/goga/actions-meta";

export const dynamic = "force-dynamic";
export const metadata = { title: "Messages settings" };

export default async function MetaSettingsPage() {
  const { data: s } = await gogaAdmin()
    .from("meta_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  const field =
    "mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm";
  return (
    <AppShell
      breadcrumb={[
        { label: "Inbox" },
        { label: "Messages", href: "/app/messages" },
        { label: "Settings" },
      ]}
      chatScope={{ level: "tool", tool: "messages" }}
      chatScopeLabel="Messages"
    >
      <div className="mx-auto max-w-xl px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="mb-4 text-lg font-semibold">Meta connection</h1>
        <p className="mb-4 text-sm text-neutral-500">
          Webhook URL: <code>/api/meta/webhook</code>. Set the same Verify token
          in the Meta app webhook config.
        </p>
        <form action={saveMetaSettings} className="space-y-3">
          <label className="block text-sm">
            Page ID
            <input
              name="page_id"
              defaultValue={s?.page_id ?? ""}
              className={field}
            />
          </label>
          <label className="block text-sm">
            Page access token
            <input
              name="page_access_token"
              defaultValue={s?.page_access_token ?? ""}
              className={field}
            />
          </label>
          <label className="block text-sm">
            Verify token
            <input
              name="verify_token"
              defaultValue={s?.verify_token ?? ""}
              className={field}
            />
          </label>
          <label className="block text-sm">
            App secret
            <input
              name="app_secret"
              defaultValue={s?.app_secret ?? ""}
              className={field}
            />
          </label>
          <label className="block text-sm">
            Instagram user ID
            <input
              name="ig_user_id"
              defaultValue={s?.ig_user_id ?? ""}
              className={field}
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="bot_enabled"
              defaultChecked={s?.bot_enabled ?? false}
            />{" "}
            Bot enabled
          </label>
          <button className="rounded-full bg-[var(--ao-accent)] px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-white">
            Save
          </button>
        </form>
      </div>
    </AppShell>
  );
}
