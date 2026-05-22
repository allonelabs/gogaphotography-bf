// FeatureRail — the 20-feature index, two display modes:
//   - 'full'    : hub-only — 4-column grid showing every feature
//   - 'compact' : sub-page — slim group switcher + breadcrumb-style active label
//
// No emoji / decorative glyphs (per design language: Apple-inspired minimal).
// Numbering carries the index; weight + color carry hierarchy.

import Link from 'next/link';

export type FeatureGroup = 'people' | 'authoring' | 'learning' | 'ai';

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
  /** 'full' for the hub, 'compact' for sub-pages. Default 'full'. */
  variant?: 'full' | 'compact';
  /** Active feature key (1..20) so the rail highlights it. */
  activeKey?: string;
}

const GROUP_LABEL: Record<FeatureGroup, string> = {
  people: 'People',
  authoring: 'Authoring',
  learning: 'Learning',
  ai: 'AI',
};

export function FeatureRail({ features, variant = 'full', activeKey }: Props) {
  if (variant === 'compact') return <CompactRail features={features} activeKey={activeKey} />;
  return <FullRail features={features} />;
}

function FullRail({ features }: { features: FeatureItem[] }) {
  const grouped: Record<FeatureGroup, FeatureItem[]> = { people: [], authoring: [], learning: [], ai: [] };
  for (const f of features) grouped[f.group].push(f);

  return (
    <div className="rounded-md border border-[var(--allonce-line)] bg-white">
      <div className="grid grid-cols-1 divide-y divide-[var(--allonce-line)] md:grid-cols-4 md:divide-x md:divide-y-0">
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

  // Group counts (for the right-side mini index)
  const groupCounts: Record<FeatureGroup, number> = { people: 0, authoring: 0, learning: 0, ai: 0 };
  for (const f of features) groupCounts[f.group] += 1;

  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--allonce-line)] pb-3">
      <div className="flex items-center gap-3 text-[12px]">
        {(Object.keys(GROUP_LABEL) as FeatureGroup[]).map((g) => {
          const isActive = active?.group === g;
          // Pick first feature in this group as the click-target
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
      <Link
        href={active?.href.replace(/\/[^/]+$/, '') ?? '#'}
        className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--allonce-ink-faint)] transition hover:text-[var(--allonce-ink)]"
      >
        {active ? `${active.k} · ${active.label}` : `${features.length} features`}
      </Link>
    </div>
  );
}

/** Build the canonical 20-feature list for a spawn. Stable order. */
export function buildTeamFeatures(
  spawnId: string,
  counts: {
    members: number;
    courses: number;
    drafts: number;
    groups: number;
    assignments: number;
    overdue: number;
    discussions: number;
    certificates: number;
  },
): FeatureItem[] {
  const root = `/app/business/${spawnId}/s/team`;
  return [
    // People
    { k: '01', label: 'Roster',         href: `${root}/members`,         badge: counts.members,     group: 'people' },
    { k: '02', label: 'Invite member',  href: `${root}/invite`,                                     group: 'people' },
    { k: '03', label: 'Roles & access', href: `${root}/roles`,                                      group: 'people' },
    { k: '04', label: 'Groups',         href: `${root}/groups`,          badge: counts.groups,      group: 'people' },
    { k: '05', label: 'Member detail',  href: `${root}/members`,                                    group: 'people' },
    // Authoring
    { k: '06', label: 'Course library', href: `${root}/courses`,         badge: counts.courses,     group: 'authoring' },
    { k: '07', label: 'Create course',  href: `${root}/courses/new`,                                group: 'authoring' },
    { k: '08', label: 'Course editor',  href: `${root}/courses`,                                    group: 'authoring' },
    { k: '09', label: 'Lesson editor',  href: `${root}/courses`,                                    group: 'authoring' },
    { k: '10', label: 'Slide editor',   href: `${root}/courses`,                                    group: 'authoring' },
    { k: '11', label: 'Quiz builder',   href: `${root}/courses`,                                    group: 'authoring' },
    { k: '12', label: 'Drafts',         href: `${root}/courses?status=draft`, badge: counts.drafts, group: 'authoring' },
    { k: '13', label: 'Preview mode',   href: `${root}/courses`,                                    group: 'authoring' },
    // Learning
    { k: '14', label: 'Assignments',    href: `${root}/assignments`,     badge: counts.assignments, group: 'learning' },
    { k: '15', label: 'Progress',       href: `${root}/progress`,                                   group: 'learning' },
    { k: '16', label: 'Overdue',        href: `${root}/progress?filter=overdue`, badge: counts.overdue, group: 'learning' },
    { k: '17', label: 'Discussions',    href: `${root}/discussions`,     badge: counts.discussions, group: 'learning' },
    { k: '18', label: 'Certificates',   href: `${root}/certificates`,    badge: counts.certificates, group: 'learning' },
    // AI
    { k: '19', label: 'Course generator', href: `${root}/ai/generate`,                              group: 'ai' },
    { k: '20', label: 'Tutor',            href: `${root}/ai/tutor`,                                 group: 'ai' },
  ];
}
