// Shared shell for /s/automations/* sub-routes. Mirrors TeamPageShell.

import type { ReactNode } from 'react';
import { AppShell } from '../app/AppShell';
import { FeatureRail, buildAutomationFeatures, type FeatureItem } from './FeatureRail';

interface Props {
  spawnId: string;
  businessName: string;
  pageLabel: string;
  pageEyebrow?: string;
  pageRight?: ReactNode;
  counts: Parameters<typeof buildAutomationFeatures>[1];
  activeFeatureKey?: string;
  railVariant?: 'full' | 'compact';
  children: ReactNode;
  chatStarters?: string[];
}

export function AutomationPageShell({
  spawnId, businessName, pageLabel, pageEyebrow, pageRight,
  counts, activeFeatureKey, railVariant = 'compact', children, chatStarters,
}: Props) {
  const features = buildAutomationFeatures(spawnId, counts).map<FeatureItem>((f) => ({
    ...f,
    active: f.k === activeFeatureKey,
  }));

  return (
    <AppShell
      breadcrumb={[
        { label: 'Overview', href: '/app' },
        { label: businessName, href: `/app/business/${spawnId}` },
        { label: 'Automations', href: `/app/business/${spawnId}/s/automations` },
        { label: pageLabel },
      ]}
      chatScope={{ level: 'tool', business: spawnId, tool: 'automation-forge' }}
      chatScopeLabel={`${businessName} · automations`}
      chatStarters={chatStarters}
    >
      <div className="px-8 py-7">
        <div className="mx-auto max-w-7xl">
          <header className="flex flex-wrap items-end justify-between gap-3">
            <div>
              {pageEyebrow && (
                <p className="text-[10px] font-mono uppercase tracking-[0.08em] text-[var(--allonce-ink-faint)]">
                  {pageEyebrow}
                </p>
              )}
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--allonce-ink)]">
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
    </AppShell>
  );
}
