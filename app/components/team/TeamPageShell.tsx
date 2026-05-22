// Shared shell for every /s/team/* sub-route. Wraps AppShell + ThemeScope +
// FeatureRail. Hub variant shows the full 4-column index; sub-pages show a
// compact group-tab strip so navigation stays one click away without
// dominating the viewport.

import type { ReactNode } from 'react';
import { AppShell } from '../app/AppShell';
import { TeamThemeScope } from './TeamThemeScope';
import { FeatureRail, buildTeamFeatures, type FeatureItem } from './FeatureRail';
import type { BrandSnapshot } from '@/app/lib/brand-loader';

interface Props {
  spawnId: string;
  businessName: string;
  pageLabel: string;
  pageEyebrow?: string;
  pageRight?: ReactNode;
  brand: BrandSnapshot | null;
  counts: Parameters<typeof buildTeamFeatures>[1];
  /** Currently active feature key (1..20). Hub leaves this undefined. */
  activeFeatureKey?: string;
  /** 'full' for hub, 'compact' for sub-pages. Default 'compact'. */
  railVariant?: 'full' | 'compact';
  /**
   * When set, scopes the chat pane to a specific cellRef artifact
   * (e.g. `academy-forge.course.c-onboarding-…`). Page is responsible
   * for choosing a real, materializer-registered cellRef — otherwise
   * chat won't be able to recompose. Falls through to tool-scope when
   * unset, which narrows resolveEditIntent to academy-forge cells.
   */
  chatArtifact?: string;
  children: ReactNode;
  chatStarters?: string[];
}

export function TeamPageShell({
  spawnId, businessName, pageLabel, pageEyebrow, pageRight,
  brand, counts, activeFeatureKey, railVariant = 'compact',
  chatArtifact, children, chatStarters,
}: Props) {
  const features = buildTeamFeatures(spawnId, counts).map<FeatureItem>((f) => ({
    ...f,
    active: f.k === activeFeatureKey,
  }));

  // Chat scope:
  //   - With a cellRef artifact (course/lesson/slide page), use level:'artifact'
  //     so AppChatPane derives anchor=cellRef and resolveEditIntent narrows to
  //     that one cell.
  //   - Otherwise default to level:'tool' so anchor=academy-forge and chat
  //     scopes to all academy-forge cells (welcome / lesson-body / etc).
  //   - This replaces the prior level:'business' which dropped anchor entirely.
  const chatScope = chatArtifact
    ? { level: 'artifact' as const, business: spawnId, tool: 'academy-forge', artifact: chatArtifact }
    : { level: 'tool' as const, business: spawnId, tool: 'academy-forge' };

  return (
    <AppShell
      breadcrumb={[
        { label: 'Overview', href: '/app' },
        { label: businessName, href: `/app/business/${spawnId}` },
        { label: 'Team', href: `/app/business/${spawnId}/s/team` },
        { label: pageLabel },
      ]}
      chatScope={chatScope}
      chatScopeLabel={chatArtifact ? `${businessName} · ${pageLabel}` : `${businessName} · team`}
      chatStarters={chatStarters}
    >
      <TeamThemeScope brand={brand}>
        <div className="px-8 py-7">
          <div className="mx-auto max-w-7xl">
            <header className="flex flex-wrap items-end justify-between gap-3">
              <div>
                {pageEyebrow && (
                  <p className="text-[10px] font-mono uppercase tracking-[0.08em] text-[var(--allonce-ink-faint)]">
                    {pageEyebrow}
                  </p>
                )}
                <h1
                  className="mt-1 text-2xl font-semibold tracking-tight text-[var(--allonce-ink)]"
                  style={{ fontFamily: 'var(--lms-font-display)' }}
                >
                  {pageLabel}
                </h1>
              </div>
              {pageRight}
            </header>
            <nav className="mt-5">
              <FeatureRail features={features} variant={railVariant} activeKey={activeFeatureKey} />
            </nav>
            <div className="mt-7">{children}</div>
          </div>
        </div>
      </TeamThemeScope>
    </AppShell>
  );
}
