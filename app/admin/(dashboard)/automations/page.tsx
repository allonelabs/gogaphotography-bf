import { AppShell } from "@/app/components/app/AppShell";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { getServerTr } from "@/app/lib/i18n/server";
import { RuleEditor } from "./_editor";
import { RecentLog } from "./_log";

export const dynamic = "force-dynamic";
export const metadata = { title: "Automations" };

const RULE_ORDER = [
  "booking_received",
  "contract_sent",
  "contract_signed",
  "shoot_reminder",
  "delivery_ready",
  "upsell",
] as const;

function getRuleLabels(
  tr: (en: string, ka: string) => string,
): Record<(typeof RULE_ORDER)[number], string> {
  return {
    booking_received: tr("Booking received", "ჯავშანი მიღებულია"),
    contract_sent: tr("Contract sent", "ხელშეკრულება გაგზავნილია"),
    contract_signed: tr("Contract signed", "ხელშეკრულება ხელმოწერილია"),
    shoot_reminder: tr("Shoot reminder", "გადაღების შეხსენება"),
    delivery_ready: tr("Delivery ready", "მიწოდება მზადაა"),
    upsell: tr("Upsell", "დამატებითი შეთავაზება"),
  };
}

const RULE_PLACEHOLDERS: Record<(typeof RULE_ORDER)[number], string[]> = {
  booking_received: [
    "client_name",
    "package",
    "shoot_date",
    "total",
    "deposit",
  ],
  contract_sent: ["client_name", "sign_url"],
  contract_signed: ["client_name", "contract_url"],
  shoot_reminder: ["client_name", "shoot_date", "shoot_time", "location"],
  delivery_ready: ["client_name", "gallery_url"],
  upsell: ["client_name", "store_url", "site_url"],
};

const COMMON_PLACEHOLDERS = [
  "client_name",
  "site_url",
  "studio_email",
  "studio_phone",
];

export default async function AutomationsPage() {
  const tr = await getServerTr();
  const RULE_LABELS = getRuleLabels(tr);
  const sb = gogaAdmin();
  const [{ data: rules }, { data: log }] = await Promise.all([
    sb.from("automation_rules").select("*"),
    sb
      .from("automation_log")
      .select("id, rule_key, entity_id, recipient, status, error, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  const byKey = new Map((rules ?? []).map((r) => [r.key, r]));

  return (
    <AppShell
      breadcrumb={[
        { label: tr("Site", "საიტი") },
        { label: tr("Automations", "ავტომატიზაცია") },
      ]}
      chatScope={{ level: "tool", tool: "automations" }}
      chatScopeLabel={tr("Automations", "ავტომატიზაცია")}
    >
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <header>
          <h1 className="text-xl font-semibold tracking-[-0.022em] text-[var(--ink-900)] sm:text-2xl">
            {tr("Automations", "ავტომატიზაცია")}
          </h1>
          <p className="mt-1 max-w-prose text-[13px] text-[var(--ink-500)]">
            {tr(
              "The lifecycle emails GOGA Photography sends automatically — lead → consultation → contract → shoot → delivery → upsell. Every send is idempotent per booking/contract/delivery and logged below.",
              "წერილები, რომლებსაც GOGA Photography ავტომატურად აგზავნის მთელი ციკლის განმავლობაში — ლიდი → კონსულტაცია → ხელშეკრულება → გადაღება → მიწოდება → დამატებითი შეთავაზება. ყოველი გაგზავნა ერთჯერადია ჯავშანზე/ხელშეკრულებაზე/მიწოდებაზე და ჩანს ქვემოთ ჟურნალში.",
            )}
          </p>
        </header>

        <div className="space-y-4">
          {RULE_ORDER.map((key) => {
            const rule = byKey.get(key);
            if (!rule) return null;
            return (
              <RuleEditor
                key={key}
                ruleKey={key}
                label={RULE_LABELS[key]}
                placeholders={[
                  ...new Set([
                    ...COMMON_PLACEHOLDERS,
                    ...RULE_PLACEHOLDERS[key],
                  ]),
                ]}
                initial={{
                  enabled: rule.enabled,
                  delay_days: rule.delay_days,
                  notify_studio: rule.notify_studio,
                  subject_en: rule.subject_en,
                  subject_ka: rule.subject_ka,
                  subject_ru: rule.subject_ru,
                  body_en: rule.body_en,
                  body_ka: rule.body_ka,
                  body_ru: rule.body_ru,
                }}
              />
            );
          })}
        </div>

        <RecentLog rows={log ?? []} />
      </div>
    </AppShell>
  );
}
