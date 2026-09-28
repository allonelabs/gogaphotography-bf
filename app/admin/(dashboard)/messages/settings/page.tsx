// app/app/messages/settings/page.tsx
import { AppShell } from "@/app/components/app/AppShell";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { saveMetaSettings } from "@/app/lib/goga/actions-meta";
import { getServerTr } from "@/app/lib/i18n/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Messages settings" };

export default async function MetaSettingsPage() {
  const { data: s } = await gogaAdmin()
    .from("meta_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  const tr = await getServerTr();
  const field =
    "mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm";
  return (
    <AppShell
      breadcrumb={[
        { label: tr("Inbox", "შემოსული") },
        { label: tr("Messages", "მესიჯები"), href: "/admin/messages" },
        { label: tr("Settings", "პარამეტრები") },
      ]}
      chatScope={{ level: "tool", tool: "messages" }}
      chatScopeLabel={tr("Messages", "მესიჯები")}
    >
      <div className="mx-auto max-w-xl px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="mb-4 text-lg font-semibold">
          {tr("Meta connection", "Meta კავშირი")}
        </h1>
        <p className="mb-4 text-sm text-neutral-500">
          {tr("Webhook URL", "Webhook URL")}: <code>/api/meta/webhook</code>.{" "}
          {tr(
            "Set the same Verify token in the Meta app webhook config.",
            "დააყენეთ იგივე Verify token Meta აპის webhook კონფიგურაციაში.",
          )}
        </p>
        <form action={saveMetaSettings} className="space-y-3">
          <label className="block text-sm">
            {tr("Page ID", "გვერდის ID")}
            <input
              name="page_id"
              defaultValue={s?.page_id ?? ""}
              className={field}
            />
          </label>
          <label className="block text-sm">
            {tr("Page access token", "გვერდის წვდომის ტოკენი")}
            <input
              name="page_access_token"
              defaultValue={s?.page_access_token ?? ""}
              className={field}
            />
          </label>
          <label className="block text-sm">
            {tr("Verify token", "Verify token")}
            <input
              name="verify_token"
              defaultValue={s?.verify_token ?? ""}
              className={field}
            />
          </label>
          <label className="block text-sm">
            {tr("App secret", "აპლიკაციის საიდუმლო")}
            <input
              name="app_secret"
              defaultValue={s?.app_secret ?? ""}
              className={field}
            />
          </label>
          <label className="block text-sm">
            {tr("Instagram user ID", "Instagram-ის მომხმარებლის ID")}
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
            {tr("Bot enabled", "ბოტი ჩართულია")}
          </label>
          <button className="rounded-full bg-[var(--ao-accent)] px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-white">
            {tr("Save", "შენახვა")}
          </button>
        </form>
      </div>
    </AppShell>
  );
}
