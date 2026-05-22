// Per-tool visual thumbnail. Each tool renders its actual output shape,
// not numbers. See PER_DOMAIN_UX.md § Operator tool cards.

interface ToolThumbnailProps {
  tool: string;
  businessName?: string;
  apex?: string;
}

// Defaults are neutral placeholders so a forgotten caller doesn't leak
// the original placeholder business into the operator's thumbnail. Real
// callers should pass {businessName, apex} for this business.
export function ToolThumbnail({ tool, businessName = 'your business', apex = 'example.com' }: ToolThumbnailProps) {
  switch (tool) {
    case 'brand-forge':
      return <BrandThumb name={businessName} />;
    case 'site-forge':
      return <SiteThumb apex={apex} name={businessName} />;
    case 'ad-reel':
      return <VideoThumb />;
    case 'ledger-spawn':
    case 'crm-spawn':
    case 'ecom-forge':
      return <SchemaThumb />;
    case 'email-forge':
      return <EmailThumb name={businessName} />;
    case 'legal-forge':
      return <LegalThumb />;
    case 'content-factory':
      return <ContentThumb />;
    case 'social-forge':
      return <SocialThumb />;
    case 'analytics-forge':
    case 'bi-forge':
      return <ChartThumb />;
    case 'dns-forge':
      return <DnsThumb apex={apex} />;
    case 'monitor-forge':
      return <UptimeThumb />;
    case 'admin-spawn':
      return <AdminThumb />;
    case 'desk-forge':
      return <DeskThumb />;
    case 'booking-forge':
      return <BookingThumb />;
    case 'voice-forge':
      return <VoiceThumb />;
    case 'academy-forge':
      return <AcademyThumb />;
    case 'lead-hunter':
      return <LeadThumb />;
    case 'payment-forge':
      return <PaymentThumb />;
    case 'automation-forge':
      return <AutomationThumb />;
    case 'compliance-forge':
      return <ComplianceThumb />;
    case 'proposal-forge':
      return <ProposalThumb />;
    default:
      return <GenericThumb tool={tool} />;
  }
}

function Box({ children }: { children: React.ReactNode }) {
  return (
    <div className="aspect-[4/3] w-full overflow-hidden rounded-md bg-[var(--allonce-bg-soft)] border border-[var(--allonce-line-soft)]">
      {children}
    </div>
  );
}

function BrandThumb({ name }: { name: string }) {
  return (
    <Box>
      <div className="flex h-full items-center justify-center bg-white">
        <span className="text-2xl font-semibold tracking-[-0.04em] text-[var(--allonce-ink)]">
          {name}
        </span>
      </div>
    </Box>
  );
}

function SiteThumb({ apex, name }: { apex: string; name: string }) {
  return (
    <Box>
      <div className="flex h-full flex-col bg-white">
        <div className="flex h-5 items-center gap-1 border-b border-[var(--allonce-line-soft)] bg-[var(--allonce-bg-soft)] px-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--allonce-ink-dim)]" />
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--allonce-ink-dim)]" />
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--allonce-ink-dim)]" />
          <span className="ml-1 truncate text-[8px] text-[var(--allonce-ink-faint)]">{apex}</span>
        </div>
        <div className="flex-1 space-y-1.5 p-2.5">
          <div className="h-1 w-1/3 bg-[var(--allonce-ink-dim)] rounded-full" />
          <div className="h-3 w-3/4 bg-[var(--allonce-ink)] rounded-sm" />
          <div className="h-1 w-2/3 bg-[var(--allonce-ink-faint)] rounded-full" />
          <div className="mt-2 grid grid-cols-3 gap-1">
            <div className="h-5 rounded-sm bg-[var(--allonce-line-soft)]" />
            <div className="h-5 rounded-sm bg-[var(--allonce-line-soft)]" />
            <div className="h-5 rounded-sm bg-[var(--allonce-line-soft)]" />
          </div>
        </div>
      </div>
    </Box>
  );
}

function VideoThumb() {
  return (
    <Box>
      <div className="relative h-full bg-gradient-to-br from-[var(--allonce-gray-800)] to-[var(--allonce-gray-1000)]">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[var(--allonce-ink)]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
        <div className="absolute bottom-1.5 right-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-mono text-white">
          15s
        </div>
      </div>
    </Box>
  );
}

function SchemaThumb() {
  return (
    <Box>
      <div className="relative h-full bg-white p-2">
        <svg viewBox="0 0 120 90" className="h-full w-full" aria-hidden>
          <rect x="6" y="10" width="34" height="26" rx="3" fill="none" stroke="var(--allonce-ink-dim)" strokeWidth="1" />
          <rect x="6" y="12" width="34" height="5" fill="var(--allonce-bg-soft)" />
          <line x1="10" y1="22" x2="36" y2="22" stroke="var(--allonce-ink-faint)" strokeWidth="0.5" />
          <line x1="10" y1="27" x2="30" y2="27" stroke="var(--allonce-ink-faint)" strokeWidth="0.5" />
          <line x1="10" y1="32" x2="32" y2="32" stroke="var(--allonce-ink-faint)" strokeWidth="0.5" />

          <rect x="68" y="10" width="34" height="26" rx="3" fill="none" stroke="var(--allonce-ink-dim)" strokeWidth="1" />
          <rect x="68" y="12" width="34" height="5" fill="var(--allonce-bg-soft)" />
          <line x1="72" y1="22" x2="98" y2="22" stroke="var(--allonce-ink-faint)" strokeWidth="0.5" />
          <line x1="72" y1="27" x2="96" y2="27" stroke="var(--allonce-ink-faint)" strokeWidth="0.5" />

          <rect x="36" y="52" width="34" height="26" rx="3" fill="none" stroke="var(--allonce-ink)" strokeWidth="1.3" />
          <rect x="36" y="54" width="34" height="5" fill="var(--allonce-bg-soft)" />
          <line x1="40" y1="64" x2="66" y2="64" stroke="var(--allonce-ink-faint)" strokeWidth="0.5" />
          <line x1="40" y1="69" x2="60" y2="69" stroke="var(--allonce-ink-faint)" strokeWidth="0.5" />

          <path d="M 23 36 L 23 46 L 46 46 L 46 52" stroke="var(--allonce-ink-dim)" strokeWidth="0.8" fill="none" />
          <path d="M 85 36 L 85 46 L 60 46 L 60 52" stroke="var(--allonce-ink-dim)" strokeWidth="0.8" fill="none" />
        </svg>
      </div>
    </Box>
  );
}

function EmailThumb({ name }: { name: string }) {
  return (
    <Box>
      <div className="h-full bg-white p-2.5">
        <div className="space-y-1.5">
          <div className="h-2 w-1/2 bg-[var(--allonce-ink)] rounded-sm" />
          <div className="h-1 w-3/4 bg-[var(--allonce-ink-dim)] rounded-full" />
          <div className="h-1 w-2/3 bg-[var(--allonce-ink-faint)] rounded-full" />
          <div className="h-1 w-4/5 bg-[var(--allonce-ink-faint)] rounded-full" />
          <div className="pt-1.5">
            <div className="h-3 w-16 rounded-sm bg-[var(--allonce-ink)]" />
          </div>
          <div className="pt-2 text-[7px] text-[var(--allonce-ink-faint)]">{name}@{name}.ge</div>
        </div>
      </div>
    </Box>
  );
}

function LegalThumb() {
  return (
    <Box>
      <div className="h-full bg-white p-2.5">
        <div className="space-y-1.5">
          <div className="h-1 w-1/4 bg-[var(--allonce-ink)] rounded-full" />
          <div className="h-1 w-3/4 bg-[var(--allonce-ink-faint)] rounded-full" />
          <div className="h-1 w-2/3 bg-[var(--allonce-ink-faint)] rounded-full" />
          <div className="h-1 w-4/5 bg-[var(--allonce-ink-faint)] rounded-full" />
          <div className="h-1 w-3/5 bg-[var(--allonce-ink-faint)] rounded-full" />
          <div className="pt-1 text-[8px] font-medium text-[var(--allonce-ink)]">
            § 6(1)(b) GDPR
          </div>
          <div className="h-1 w-5/6 bg-[var(--allonce-ink-faint)] rounded-full" />
          <div className="h-1 w-3/4 bg-[var(--allonce-ink-faint)] rounded-full" />
        </div>
      </div>
    </Box>
  );
}

function ContentThumb() {
  return (
    <Box>
      <div className="h-full space-y-1.5 bg-white p-2.5">
        {['Article · pillar piece', 'Article · weekly cadence', 'Article · team profile'].map((t, i) => (
          <div key={i} className="rounded border border-[var(--allonce-line-soft)] bg-[var(--allonce-bg-soft)] px-1.5 py-1">
            <div className="text-[8px] leading-tight text-[var(--allonce-ink)]">{t}</div>
            <div className="mt-0.5 text-[6px] text-[var(--allonce-ink-faint)]">
              Apr {18 + i} · 4 min read
            </div>
          </div>
        ))}
      </div>
    </Box>
  );
}

function SocialThumb() {
  return (
    <Box>
      <div className="h-full bg-white p-2">
        <div className="grid h-full grid-cols-3 gap-1">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="rounded-sm"
              style={{ background: `hsl(0 0% ${92 - ((i * 7) % 40)}%)` }}
            />
          ))}
        </div>
      </div>
    </Box>
  );
}

function ChartThumb() {
  return (
    <Box>
      <div className="h-full bg-white p-2">
        <svg viewBox="0 0 100 60" className="h-full w-full" aria-hidden>
          <polyline
            points="2,48 14,40 26,42 38,28 50,30 62,16 74,18 86,8 98,12"
            fill="none"
            stroke="var(--allonce-ink)"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
          <polyline
            points="2,48 14,40 26,42 38,28 50,30 62,16 74,18 86,8 98,12 98,58 2,58"
            fill="var(--allonce-bg-soft)"
            stroke="none"
          />
          <line x1="0" y1="58" x2="100" y2="58" stroke="var(--allonce-line)" strokeWidth="0.3" />
        </svg>
      </div>
    </Box>
  );
}

function DnsThumb({ apex }: { apex: string }) {
  return (
    <Box>
      <div className="flex h-full flex-col items-start justify-center gap-1 bg-white px-3 font-mono text-[9px] text-[var(--allonce-ink-muted)]">
        <div><span className="text-[var(--allonce-ink)]">A</span>    {apex}  →  76.223.105.1</div>
        <div><span className="text-[var(--allonce-ink)]">CNAME</span> www  →  vercel-dns.com</div>
        <div><span className="text-[var(--allonce-ink)]">MX</span>   10 mx1.resend.com</div>
        <div><span className="text-[var(--allonce-ink)]">TXT</span>  "v=spf1 include:_spf.resend.com"</div>
        <div className="text-[var(--allonce-ok)]">● 8 records · healthy</div>
      </div>
    </Box>
  );
}

function UptimeThumb() {
  return (
    <Box>
      <div className="flex h-full items-end gap-[2px] bg-white p-2">
        {Array.from({ length: 32 }).map((_, i) => {
          const low = i === 5 || i === 20;
          const h = low ? 30 : 100;
          return (
            <div
              key={i}
              className="flex-1 rounded-sm"
              style={{
                height: `${h}%`,
                backgroundColor: low ? 'var(--allonce-warn)' : 'var(--allonce-ok)',
                opacity: 0.8,
              }}
            />
          );
        })}
      </div>
    </Box>
  );
}

function AdminThumb() {
  return (
    <Box>
      <div className="h-full bg-white p-2 space-y-1">
        {['owner@example.com', 'co@example.com', 'ops@example.com', 'lead@example.com'].map((e, i) => (
          <div key={i} className="flex items-center gap-1.5 border-b border-[var(--allonce-line-soft)] pb-1 last:border-b-0">
            <span className="h-3 w-3 rounded-full bg-[var(--allonce-ink-dim)]" />
            <span className="truncate text-[8px] text-[var(--allonce-ink)]">{e}</span>
            <span className="ml-auto text-[6px] text-[var(--allonce-ink-faint)]">
              {i === 0 ? 'OWNER' : 'OPS'}
            </span>
          </div>
        ))}
      </div>
    </Box>
  );
}

function DeskThumb() {
  return (
    <Box>
      <div className="h-full bg-white p-2 space-y-1.5">
        {['Order delay · tier-1', 'Refund request · tier-2', 'Shipping inquiry · tier-1'].map((t, i) => (
          <div key={i} className="rounded border border-[var(--allonce-line-soft)] p-1">
            <div className="text-[8px] text-[var(--allonce-ink)]">{t}</div>
          </div>
        ))}
      </div>
    </Box>
  );
}

function BookingThumb() {
  return (
    <Box>
      <div className="grid h-full grid-cols-7 gap-[1px] bg-white p-2">
        {Array.from({ length: 21 }).map((_, i) => (
          <div
            key={i}
            className={`rounded-sm ${i === 10 || i === 15 ? 'bg-[var(--allonce-ink)]' : 'bg-[var(--allonce-bg-soft)]'}`}
          />
        ))}
      </div>
    </Box>
  );
}

function VoiceThumb() {
  return (
    <Box>
      <div className="flex h-full items-center gap-0.5 bg-white px-3">
        {Array.from({ length: 40 }).map((_, i) => {
          const h = 20 + Math.abs(Math.sin(i * 0.6)) * 60 + (i % 7) * 4;
          return (
            <div
              key={i}
              className="w-[2px] rounded-full bg-[var(--allonce-ink)]"
              style={{ height: `${h}%` }}
            />
          );
        })}
      </div>
    </Box>
  );
}

function AcademyThumb() {
  return (
    <Box>
      <div className="h-full bg-white p-2 space-y-1">
        <div className="text-[8px] font-medium text-[var(--allonce-ink)]">Coffee 101</div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-[var(--allonce-line)]">
          <div className="h-full w-3/4 bg-[var(--allonce-ink)]" />
        </div>
        <div className="text-[7px] text-[var(--allonce-ink-faint)]">12 of 16 lessons</div>
        <div className="pt-1 text-[8px] font-medium text-[var(--allonce-ink)]">Brewing methods</div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-[var(--allonce-line)]">
          <div className="h-full w-1/3 bg-[var(--allonce-ink)]" />
        </div>
        <div className="text-[7px] text-[var(--allonce-ink-faint)]">4 of 12 lessons</div>
      </div>
    </Box>
  );
}

function LeadThumb() {
  return (
    <Box>
      <div className="h-full bg-white p-2">
        <div className="grid h-full grid-cols-2 gap-1 text-[8px]">
          {['Anon · 92', 'Enter. Cafe · 78', 'VakeCo · 67', 'Soho · 54'].map((l, i) => (
            <div key={i} className="rounded border border-[var(--allonce-line-soft)] px-1.5 py-1 text-[var(--allonce-ink)]">
              {l}
            </div>
          ))}
        </div>
      </div>
    </Box>
  );
}

function PaymentThumb() {
  return (
    <Box>
      <div className="flex h-full flex-col justify-center gap-1 bg-white px-3">
        <div className="flex justify-between text-[8px]">
          <span className="text-[var(--allonce-ink-muted)]">Starter</span>
          <span className="text-[var(--allonce-ink)]">₾ 29 / mo</span>
        </div>
        <div className="flex justify-between text-[8px]">
          <span className="text-[var(--allonce-ink-muted)]">Regular</span>
          <span className="text-[var(--allonce-ink)]">₾ 49 / mo</span>
        </div>
        <div className="flex justify-between rounded bg-[var(--allonce-bg-soft)] px-1 py-0.5 text-[8px]">
          <span className="font-medium text-[var(--allonce-ink)]">Connoisseur</span>
          <span className="font-medium text-[var(--allonce-ink)]">₾ 89 / mo</span>
        </div>
      </div>
    </Box>
  );
}

function AutomationThumb() {
  return (
    <Box>
      <div className="flex h-full items-center justify-center bg-white">
        <svg viewBox="0 0 100 60" className="h-full w-full p-2" aria-hidden>
          <circle cx="15" cy="30" r="6" fill="var(--allonce-ink)" />
          <circle cx="50" cy="15" r="5" fill="none" stroke="var(--allonce-ink)" strokeWidth="1" />
          <circle cx="50" cy="45" r="5" fill="none" stroke="var(--allonce-ink)" strokeWidth="1" />
          <circle cx="85" cy="30" r="6" fill="var(--allonce-ink-dim)" />
          <path d="M 21 30 L 45 17" stroke="var(--allonce-ink)" strokeWidth="0.8" />
          <path d="M 21 30 L 45 43" stroke="var(--allonce-ink)" strokeWidth="0.8" />
          <path d="M 55 17 L 79 28" stroke="var(--allonce-ink-dim)" strokeWidth="0.8" />
          <path d="M 55 43 L 79 32" stroke="var(--allonce-ink-dim)" strokeWidth="0.8" />
        </svg>
      </div>
    </Box>
  );
}

function ComplianceThumb() {
  return (
    <Box>
      <div className="grid h-full grid-cols-2 gap-1 bg-white p-2">
        {['SOC 2', 'GDPR', 'ISO 27001', 'DPA'].map((c, i) => (
          <div key={i} className="flex items-center gap-1 rounded border border-[var(--allonce-line-soft)] px-1.5 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--allonce-ok)]" />
            <span className="text-[8px] text-[var(--allonce-ink)]">{c}</span>
          </div>
        ))}
      </div>
    </Box>
  );
}

function ProposalThumb() {
  return (
    <Box>
      <div className="h-full bg-white p-2 space-y-1">
        <div className="flex items-center gap-1">
          <span className="inline-block rounded bg-[var(--allonce-ink)] px-1 text-[6px] font-medium uppercase text-white">TUNE</span>
          <span className="text-[8px] text-[var(--allonce-ink)]">EU OSS flag on</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block rounded border border-[var(--allonce-ink)] px-1 text-[6px] font-medium uppercase text-[var(--allonce-ink)]">TUNE</span>
          <span className="text-[8px] text-[var(--allonce-ink)]">weekly cadence</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block rounded bg-[var(--allonce-ink)] px-1 text-[6px] font-medium uppercase text-white">MECH</span>
          <span className="text-[8px] text-[var(--allonce-ink)]">promote wordmark v7</span>
        </div>
      </div>
    </Box>
  );
}

function GenericThumb({ tool }: { tool: string }) {
  return (
    <Box>
      <div className="flex h-full items-center justify-center bg-white">
        <span className="font-mono text-xs text-[var(--allonce-ink-faint)]">{tool}</span>
      </div>
    </Box>
  );
}
