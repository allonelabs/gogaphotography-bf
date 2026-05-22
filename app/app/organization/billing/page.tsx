import type { Metadata } from "next";
import { AppShell } from "../../../components/app/AppShell";
import { StubPage } from "../../../components/app/StubPage";

export const metadata: Metadata = { title: "Billing (org) — AllOnce" };

export default function Page() {
  return (
    <AppShell
      breadcrumb={[{label:"Orchestrator",href:"/app"},{label:"Organization",href:"/app/organization"},{label:"Billing"}]}
      chatScope={{ level: "org" }}
      chatScopeLabel="organization/billing"
    >
      <StubPage
        eyebrow="BILLING"
        title="Billing (org)"
        body="Org-level plan, seats, usage meters."
        phase={6}
        features={[
          "Plan + seat count",
          "Usage meters",
          "Invoice history",
          "Payment method",
          "Cost by business",
        ]}
      />
    </AppShell>
  );
}
