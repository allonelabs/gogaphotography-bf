// Same shape as the team FeatureRail — twelve features grouped into three
// columns. Numbered index + label, no glyphs.

import Link from 'next/link';

export type FeatureGroup = 'workflows' | 'observability' | 'integrations';

export interface FeatureItem {
  k: string;
  label: string;
  href: string;
  badge?: number | string;
  active?: boolean;
  group: FeatureGroup;
}

interface Props {
  features: FeatureItem[];
  variant?: 'full' | 'compact';
  activeKey?: string;
}

const GROUP_LABEL: Record<FeatureGroup, string> = {
  workflows: 'Workflows',
  observability: 'Observability',
  integrations: 'Integrations',
};

export function FeatureRail({ features, variant = 'full', activeKey }: Props) {
  if (variant === 'compact') return <CompactRail features={features} activeKey={activeKey} />;
  return <FullRail features={features} />;
}

function FullRail({ features }: { features: FeatureItem[] }) {
  const grouped: Record<FeatureGroup, FeatureItem[]> = { workflows: [], observability: [], integrations: [] };
  for (const f of features) grouped[f.group].push(f);

  return (
    <div className="rounded-md border border-[var(--allonce-line)] bg-white">
      <div className="grid grid-cols-1 divide-y divide-[var(--allonce-line)] md:grid-cols-3 md:divide-x md:divide-y-0">
        {(Object.keys(grouped) as FeatureGroup[]).map((g) => (
          <div key={g} className="p-4">
            <p className="mb-2 text-[10px] font-mono uppercase tracking-[0.08em] text-[var(--allonce-ink-faint)]">
              {GROUP_LABEL[g]}
            </p>
            <ul className="grid gap-0.5">
              {grouped[g].map((f) => (
                <li key={f.k}>
                  <Link
                    href={f.href}
                    className={`group flex items-baseline gap-3 rounded px-2 py-1.5 text-[13px] transition ${
                      f.active
                        ? 'bg-[var(--allonce-ink)] text-white'
                        : 'text-[var(--allonce-ink)] hover:bg-[var(--allonce-bg-soft)]'
                    }`}
                  >
                    <span
                      className={`tabular-nums font-mono text-[10px] ${
                        f.active ? 'text-white/60' : 'text-[var(--allonce-ink-faint)]'
                      }`}
                    >
                      {f.k}
                    </span>
                    <span className="flex-1 truncate">{f.label}</span>
                    {f.badge !== undefined && (
                      <span
                        className={`rounded-full px-1.5 text-[10px] font-medium tabular-nums ${
                          f.active ? 'bg-white text-white' : 'bg-[var(--allonce-bg-soft)] text-[var(--allonce-ink-muted)]'
                        }`}
                      >
                        {f.badge}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function CompactRail({ features, activeKey }: { features: FeatureItem[]; activeKey?: string }) {
  const active = features.find((f) => f.k === activeKey) ?? null;
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--allonce-line)] pb-3">
      <div className="flex items-center gap-3 text-[12px]">
        {(Object.keys(GROUP_LABEL) as FeatureGroup[]).map((g) => {
          const isActive = active?.group === g;
          const first = features.find((f) => f.group === g);
          return (
            <Link
              key={g}
              href={first?.href ?? '#'}
              className={`text-[12px] transition ${
                isActive
                  ? 'font-medium text-[var(--allonce-ink)]'
                  : 'text-[var(--allonce-ink-muted)] hover:text-[var(--allonce-ink)]'
              }`}
            >
              {GROUP_LABEL[g]}
            </Link>
          );
        })}
      </div>
      <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--allonce-ink-faint)]">
        {active ? `${active.k} · ${active.label}` : `${features.length} features`}
      </span>
    </div>
  );
}

export function buildAutomationFeatures(
  spawnId: string,
  counts: {
    workflows: number;
    paused: number;
    failed24h: number;
    expiredAuth: number;
  },
): FeatureItem[] {
  const root = `/app/business/${spawnId}/s/automations`;
  return [
    // Workflows
    { k: '01', label: 'Workflow library',  href: `${root}/workflows`,                                     badge: counts.workflows,    group: 'workflows' },
    { k: '02', label: 'New workflow',      href: `${root}/workflows/new`,                                                            group: 'workflows' },
    { k: '03', label: 'Templates',         href: `${root}/templates`,                                                                group: 'workflows' },
    { k: '04', label: 'Paused',            href: `${root}/workflows?status=paused`,                       badge: counts.paused,       group: 'workflows' },
    { k: '05', label: 'Triggers catalog',  href: `${root}/triggers`,                                                                 group: 'workflows' },
    { k: '06', label: 'Actions catalog',   href: `${root}/actions`,                                                                  group: 'workflows' },
    // Observability
    { k: '07', label: 'Recent executions', href: `${root}/executions`,                                                               group: 'observability' },
    { k: '08', label: 'Failures',          href: `${root}/executions?status=failed`,                       badge: counts.failed24h,    group: 'observability' },
    { k: '09', label: 'Cost tracking',     href: `${root}/cost`,                                                                     group: 'observability' },
    { k: '10', label: 'Queue depth',       href: `${root}/queue`,                                                                    group: 'observability' },
    // Integrations
    { k: '11', label: 'OAuth connections', href: `${root}/integrations`,                                  badge: counts.expiredAuth,  group: 'integrations' },
    { k: '12', label: 'Webhook endpoints', href: `${root}/webhooks`,                                                                 group: 'integrations' },
  ];
}
