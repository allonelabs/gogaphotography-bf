"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/app/components/app/AppShell";
import { toast } from "@/app/components/app/Toast";

type Role = "owner" | "admin" | "operator" | "viewer";
const ROLES: Role[] = ["owner", "admin", "operator", "viewer"];

interface Member {
  id: string;
  name: string;
  email: string;
  role: Role;
  lastActive: string;
  status: "active" | "suspended";
}

interface Invite {
  id: string;
  email: string;
  role: Role;
  sent: string;
}

// Members + invites come from /api/organization/{members,invites}. The old
// SEED_MEMBERS fixture (5 hardcoded allonelabs.com people) and the
// allonce.members localStorage keys were dead code — neither path runs after
// the page was wired to the real API. Removed so they can't drift back in.

export default function Page() {
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [mounted, setMounted] = useState(false);
  const [invEmail, setInvEmail] = useState("");
  const [invRole, setInvRole] = useState<Role>("operator");

  useEffect(() => {
    setMounted(true);
    void reload();
  }, []);

  async function reload() {
    try {
      const [mr, ir] = await Promise.all([
        fetch("/api/organization/members", { cache: "no-store" }).then((r) =>
          r.json(),
        ),
        fetch("/api/organization/invites", { cache: "no-store" }).then((r) =>
          r.json(),
        ),
      ]);
      if (mr.ok) {
        setMembers(
          (mr.members ?? []).map(
            (m: {
              id: string;
              name: string | null;
              email: string;
              role: Role;
              status: "active" | "suspended";
              last_active: string | null;
            }) => ({
              id: m.id,
              name: m.name ?? m.email.split("@")[0],
              email: m.email,
              role: m.role,
              status: m.status,
              lastActive: m.last_active
                ? new Date(m.last_active).toLocaleString()
                : "—",
            }),
          ),
        );
      }
      if (ir.ok) {
        setInvites(
          (ir.invites ?? []).map(
            (i: {
              id: string;
              email: string;
              role: Role;
              sent_at: string;
            }) => ({
              id: i.id,
              email: i.email,
              role: i.role,
              sent: i.sent_at?.slice(0, 10) ?? "",
            }),
          ),
        );
      }
    } catch (err) {
      toast(
        `Could not load · ${err instanceof Error ? err.message : "unknown"}`,
        "err",
      );
    }
  }

  async function sendInvite() {
    const e = invEmail.trim().toLowerCase();
    if (!e || !e.includes("@")) return toast("Enter a valid email", "warn");
    if (members.some((m) => m.email === e))
      return toast("Already a member", "warn");
    if (invites.some((i) => i.email === e))
      return toast("Invite already sent", "warn");
    try {
      const r = await fetch("/api/organization/invites", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: e, role: invRole }),
      });
      const b = await r.json();
      if (!b.ok || !b.invite) throw new Error(b.error ?? "invite failed");
      setInvites((prev) => [
        {
          id: b.invite.id,
          email: b.invite.email,
          role: b.invite.role,
          sent: b.invite.sent_at?.slice(0, 10) ?? "",
        },
        ...prev,
      ]);
      setInvEmail("");
      toast(`Invite sent to ${e}`, "ok");
    } catch (err) {
      toast(
        `Invite failed · ${err instanceof Error ? err.message : "unknown"}`,
        "err",
      );
    }
  }

  async function resendInvite(id: string) {
    const inv = invites.find((i) => i.id === id);
    if (!inv) return;
    // Re-POST to upsert sent_at to now.
    try {
      await fetch("/api/organization/invites", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: inv.email, role: inv.role }),
      });
      setInvites((prev) =>
        prev.map((i) =>
          i.id === id
            ? { ...i, sent: new Date().toISOString().slice(0, 10) }
            : i,
        ),
      );
      toast("Invite re-sent", "ok");
    } catch {
      toast("Re-send failed", "err");
    }
  }

  async function revokeInvite(id: string) {
    try {
      await fetch(`/api/organization/invites?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      setInvites((prev) => prev.filter((i) => i.id !== id));
      toast("Invite revoked", "info");
    } catch {
      toast("Revoke failed", "err");
    }
  }

  function acceptInvite(_id: string) {
    // Real accept-flow happens when the invitee signs in; this UI button is
    // only a manual override left for demo. No-op for now.
    toast("Acceptance happens server-side on first sign-in", "info");
  }

  async function setRole(id: string, role: Role) {
    try {
      const r = await fetch("/api/organization/members", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, role }),
      });
      const b = await r.json();
      if (!b.ok) throw new Error(b.error ?? "update failed");
      setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, role } : m)));
      toast("Role updated", "ok");
    } catch (err) {
      toast(
        `Update failed · ${err instanceof Error ? err.message : "unknown"}`,
        "err",
      );
    }
  }

  async function toggleSuspend(id: string) {
    const m = members.find((x) => x.id === id);
    if (!m) return;
    const next = m.status === "active" ? "suspended" : "active";
    try {
      const r = await fetch("/api/organization/members", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, status: next }),
      });
      const b = await r.json();
      if (!b.ok) throw new Error(b.error ?? "update failed");
      setMembers((prev) =>
        prev.map((x) => (x.id === id ? { ...x, status: next } : x)),
      );
      toast(next === "suspended" ? "Suspended" : "Reactivated", "info");
    } catch (err) {
      toast(
        `Update failed · ${err instanceof Error ? err.message : "unknown"}`,
        "err",
      );
    }
  }

  async function remove(id: string) {
    try {
      const r = await fetch(
        `/api/organization/members?id=${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
      const b = await r.json();
      if (!b.ok) throw new Error(b.error ?? "remove failed");
      setMembers((prev) => prev.filter((m) => m.id !== id));
      toast("Removed from org", "info");
    } catch (err) {
      toast(
        `Remove failed · ${err instanceof Error ? err.message : "unknown"}`,
        "err",
      );
    }
  }

  return (
    <AppShell
      breadcrumb={[
        { label: "Organization", href: "/app/organization" },
        { label: "Members" },
      ]}
      chatScope={{ level: "org" }}
      chatScopeLabel="organization/members"
    >
      <div className="px-10 py-12">
        <div className="mx-auto max-w-[760px]">
          <h1
            className="text-[var(--ink-900)]"
            style={{
              fontSize: "clamp(22px, 2.4vw, 28px)",
              fontWeight: 500,
              letterSpacing: "-0.01em",
              lineHeight: 1.2,
            }}
          >
            Members
          </h1>
          <p className="mt-1 text-[13.5px] text-[var(--ink-500)]">
            Who can operate here.
          </p>

          {/* Invite form */}
          <div className="mt-10 flex flex-wrap items-center gap-2">
            <input
              value={invEmail}
              onChange={(e) => setInvEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendInvite()}
              placeholder="name@company.com"
              type="email"
              className="h-10 flex-1 min-w-[220px] rounded-full border border-[var(--allonce-line)] bg-white px-4 text-[13.5px] text-[var(--ink-900)] placeholder:text-[var(--ink-400)] outline-none transition focus:border-[var(--ink-900)]"
            />
            <select
              value={invRole}
              onChange={(e) => setInvRole(e.target.value as Role)}
              className="h-10 rounded-full border border-[var(--allonce-line)] bg-white px-3 text-[13px] text-[var(--ink-900)] outline-none transition focus:border-[var(--ink-900)]"
            >
              {ROLES.filter((r) => r !== "owner").map((r) => (
                <option key={r} value={r}>
                  {r[0].toUpperCase() + r.slice(1)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={sendInvite}
              className="inline-flex h-10 items-center rounded-full bg-[var(--ink-900)] px-5 text-[13px] text-white transition hover:bg-black"
              style={{ fontWeight: 500 }}
            >
              Send invite
            </button>
          </div>

          {/* Pending invites */}
          {mounted && invites.length > 0 && (
            <section className="mt-12">
              <h2
                className="text-[12.5px] text-[var(--ink-400)]"
                style={{ fontWeight: 500 }}
              >
                Pending invites · {invites.length}
              </h2>
              <ul className="mt-4">
                {invites.map((inv, i, arr) => (
                  <li
                    key={inv.id}
                    className={`flex items-center justify-between gap-4 py-3.5 ${
                      i < arr.length - 1
                        ? "border-b border-[var(--allonce-line-soft)]"
                        : ""
                    } ${i === 0 ? "border-t border-[var(--allonce-line-soft)]" : ""}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p
                        className="truncate text-[14px] text-[var(--ink-900)]"
                        style={{ fontWeight: 500 }}
                      >
                        {inv.email}
                      </p>
                      <p className="mt-0.5 text-[12px] text-[var(--ink-500)]">
                        {inv.role} · sent {inv.sent}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-[12.5px]">
                      <button
                        type="button"
                        onClick={() => acceptInvite(inv.id)}
                        className="text-[var(--ink-900)] transition hover:underline"
                        title="Mock: simulate invite accepted"
                      >
                        Simulate accept
                      </button>
                      <button
                        type="button"
                        onClick={() => resendInvite(inv.id)}
                        className="text-[var(--ink-500)] transition hover:text-[var(--ink-900)]"
                      >
                        Resend
                      </button>
                      <button
                        type="button"
                        onClick={() => revokeInvite(inv.id)}
                        className="text-[#b91c1c] transition hover:underline"
                      >
                        Revoke
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Active members */}
          <section className="mt-12">
            <h2
              className="text-[12.5px] text-[var(--ink-400)]"
              style={{ fontWeight: 500 }}
            >
              Members · {members.length}
            </h2>
            <ul className="mt-4">
              {members.map((m, i, arr) => (
                <li
                  key={m.id}
                  className={`flex items-center justify-between gap-4 py-3.5 ${
                    i < arr.length - 1
                      ? "border-b border-[var(--allonce-line-soft)]"
                      : ""
                  } ${i === 0 ? "border-t border-[var(--allonce-line-soft)]" : ""} ${
                    m.status === "suspended" ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] text-[var(--ink-900)]"
                      style={{
                        backgroundColor: "var(--bg-sunken)",
                        fontWeight: 500,
                      }}
                    >
                      {m.name
                        .split(" ")
                        .map((p) => p[0])
                        .slice(0, 2)
                        .join("")}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p
                          className="truncate text-[14px] text-[var(--ink-900)]"
                          style={{ fontWeight: 500 }}
                        >
                          {m.name}
                        </p>
                        {m.status === "suspended" && (
                          <span className="rounded-full bg-[var(--bg-sunken)] px-2 py-0.5 text-[10.5px] text-[var(--ink-400)]">
                            Suspended
                          </span>
                        )}
                      </div>
                      <p className="truncate text-[11.5px] text-[var(--ink-500)]">
                        {m.email} · {m.lastActive}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <select
                      value={m.role}
                      disabled={m.role === "owner"}
                      onChange={(e) => setRole(m.id, e.target.value as Role)}
                      className="h-8 rounded-full border border-[var(--allonce-line)] bg-white px-3 text-[12.5px] text-[var(--ink-900)] outline-none transition focus:border-[var(--ink-900)] disabled:opacity-50"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r[0].toUpperCase() + r.slice(1)}
                        </option>
                      ))}
                    </select>
                    {m.role !== "owner" && (
                      <>
                        <button
                          type="button"
                          onClick={() => toggleSuspend(m.id)}
                          className="text-[12px] text-[var(--ink-500)] transition hover:text-[var(--ink-900)]"
                        >
                          {m.status === "active" ? "Suspend" : "Reactivate"}
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(m.id)}
                          className="text-[12px] text-[#b91c1c] transition hover:underline"
                        >
                          Remove
                        </button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
