"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/app/components/app/AppShell";
import { toast } from "@/app/components/app/Toast";

interface Role {
  id: string;
  name: string;
  description: string;
  builtin: boolean;
  permissions: Record<string, boolean>;
}

const PERM_GROUPS: { label: string; perms: { id: string; label: string }[] }[] =
  [
    {
      label: "Businesses",
      perms: [
        { id: "biz.read", label: "View businesses" },
        { id: "biz.spawn", label: "Spawn new business" },
        { id: "biz.edit", label: "Edit identity / brand" },
        { id: "biz.archive", label: "Archive or destroy" },
      ],
    },
    {
      label: "Content & proposals",
      perms: [
        { id: "prop.read", label: "View proposals" },
        { id: "prop.apply", label: "Auto-apply (tune-mode)" },
        { id: "prop.pr", label: "Open PR (mechanism-mode)" },
        { id: "prop.publish", label: "Publish to live" },
      ],
    },
    {
      label: "Organization",
      perms: [
        { id: "org.members", label: "Manage members + roles" },
        { id: "org.billing", label: "Manage billing + plan" },
        { id: "org.webhooks", label: "Configure webhooks" },
        { id: "org.audit", label: "View audit log" },
      ],
    },
    {
      label: "Developer",
      perms: [
        { id: "dev.keys", label: "Issue API keys" },
        { id: "dev.deploy", label: "Deploy via CI" },
      ],
    },
  ];
const ALL_PERMS = PERM_GROUPS.flatMap((g) => g.perms.map((p) => p.id));
const setAll = (val: boolean) =>
  Object.fromEntries(ALL_PERMS.map((p) => [p, val])) as Record<string, boolean>;

const SEED: Role[] = [
  {
    id: "owner",
    name: "Owner",
    description: "Full access. Cannot be edited or deleted.",
    builtin: true,
    permissions: setAll(true),
  },
  {
    id: "admin",
    name: "Admin",
    description: "All permissions except destructive org-wide actions.",
    builtin: true,
    permissions: {
      ...setAll(true),
      "biz.archive": false,
    },
  },
  {
    id: "operator",
    name: "Operator",
    description: "Everyday operating. No billing, no org-level config.",
    builtin: true,
    permissions: {
      ...setAll(false),
      "biz.read": true,
      "biz.edit": true,
      "prop.read": true,
      "prop.apply": true,
      "prop.pr": true,
      "prop.publish": true,
      "dev.keys": true,
      "dev.deploy": true,
    },
  },
  {
    id: "viewer",
    name: "Viewer",
    description: "Read-only access across all businesses.",
    builtin: true,
    permissions: {
      ...setAll(false),
      "biz.read": true,
      "prop.read": true,
      "org.audit": true,
    },
  },
];

const KEY = "allonce.roles";

export default function Page() {
  const [roles, setRoles] = useState<Role[]>(SEED);
  const [selected, setSelected] = useState<string>("owner");
  const [mounted, setMounted] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setRoles(JSON.parse(raw));
    } catch {}
  }, []);

  function persist(next: Role[]) {
    setRoles(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
  }

  const role = roles.find((r) => r.id === selected) || roles[0];

  function togglePerm(permId: string) {
    if (!role || role.id === "owner") return;
    persist(
      roles.map((r) =>
        r.id === role.id
          ? {
              ...r,
              permissions: {
                ...r.permissions,
                [permId]: !r.permissions[permId],
              },
            }
          : r,
      ),
    );
  }

  function createRole() {
    const name = newName.trim();
    if (!name) return toast("Name the role", "warn");
    const id = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    if (roles.some((r) => r.id === id))
      return toast("Name already taken", "warn");
    const next: Role = {
      id,
      name,
      description: "Custom role",
      builtin: false,
      permissions: setAll(false),
    };
    persist([...roles, next]);
    setSelected(id);
    setCreating(false);
    setNewName("");
    toast("Role created", "ok");
  }

  function deleteRole(id: string) {
    const r = roles.find((x) => x.id === id);
    if (!r || r.builtin) return;
    persist(roles.filter((x) => x.id !== id));
    setSelected("owner");
    toast("Role deleted", "info");
  }

  if (!role) return null;

  return (
    <AppShell
      breadcrumb={[
        { label: "Organization", href: "/app/organization" },
        { label: "Roles" },
      ]}
      chatScope={{ level: "org" }}
      chatScopeLabel="organization/roles"
    >
      <div className="px-10 py-12">
        <div className="mx-auto max-w-[920px]">
          <h1
            className="text-[var(--ink-900)]"
            style={{
              fontSize: "clamp(22px, 2.4vw, 28px)",
              fontWeight: 500,
              letterSpacing: "-0.01em",
              lineHeight: 1.2,
            }}
          >
            Roles
          </h1>
          <p className="mt-1 text-[13.5px] text-[var(--ink-500)]">
            Who can do what.
          </p>

          <p className="mt-3 text-[12.5px] text-[var(--ink-400)]">
            Local preview — changes save to this browser only. Server-side roles
            and per-permission enforcement land with multi-tenant auth.
          </p>

          <div className="mt-8 grid gap-8 lg:grid-cols-[240px_1fr]">
            {/* Role list */}
            <aside>
              <ul>
                {roles.map((r, i, arr) => {
                  const active = mounted && r.id === selected;
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => setSelected(r.id)}
                        className={`flex w-full items-center justify-between py-3 text-left transition ${
                          i < arr.length - 1
                            ? "border-b border-[var(--allonce-line-soft)]"
                            : ""
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p
                            className="truncate text-[13.5px] text-[var(--ink-900)]"
                            style={{ fontWeight: active ? 600 : 500 }}
                          >
                            {r.name}
                          </p>
                          <p className="truncate text-[11.5px] text-[var(--ink-500)]">
                            {
                              Object.values(r.permissions).filter(Boolean)
                                .length
                            }{" "}
                            of {ALL_PERMS.length} perms
                          </p>
                        </div>
                        {active && (
                          <span
                            className="ml-2 text-[10px] text-[var(--ink-900)]"
                            style={{ fontWeight: 500 }}
                          >
                            ●
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="mt-4 inline-flex h-9 items-center rounded-full bg-[var(--bg-surface-alt)] px-4 text-[12.5px] text-[var(--ink-900)] transition hover:bg-[var(--bg-sunken)]"
                style={{ fontWeight: 500 }}
              >
                + Create custom role
              </button>
            </aside>

            {/* Permission matrix */}
            <section>
              <div className="flex items-start justify-between gap-4 border-b border-[var(--allonce-line-soft)] pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <h2
                      className="text-[20px] text-[var(--ink-900)]"
                      style={{ fontWeight: 500, letterSpacing: "-0.01em" }}
                    >
                      {role.name}
                    </h2>
                    {role.builtin && (
                      <span className="rounded-full bg-[var(--bg-sunken)] px-2 py-0.5 text-[10.5px] text-[var(--ink-500)]">
                        Built-in
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[13px] text-[var(--ink-500)]">
                    {role.description}
                  </p>
                </div>
                {!role.builtin && (
                  <button
                    type="button"
                    onClick={() => deleteRole(role.id)}
                    className="text-[12.5px] text-[#b91c1c] transition hover:underline"
                  >
                    Delete role
                  </button>
                )}
              </div>

              {role.id === "owner" && (
                <p className="mt-4 text-[12.5px] text-[var(--ink-400)]">
                  Owner permissions are locked to prevent lockout. Transfer
                  ownership from Members.
                </p>
              )}

              <div className="mt-8 space-y-10">
                {PERM_GROUPS.map((g) => (
                  <div key={g.label}>
                    <h3
                      className="text-[12.5px] text-[var(--ink-400)]"
                      style={{ fontWeight: 500 }}
                    >
                      {g.label}
                    </h3>
                    <div className="mt-3">
                      {g.perms.map((p, i, arr) => {
                        const on = !!role.permissions[p.id];
                        return (
                          <div
                            key={p.id}
                            className={`flex items-center justify-between py-3 ${
                              i < arr.length - 1
                                ? "border-b border-[var(--allonce-line-soft)]"
                                : ""
                            } ${i === 0 ? "border-t border-[var(--allonce-line-soft)]" : ""}`}
                          >
                            <div>
                              <p
                                className="text-[13.5px] text-[var(--ink-900)]"
                                style={{ fontWeight: 500 }}
                              >
                                {p.label}
                              </p>
                              <p className="font-mono text-[11px] text-[var(--ink-400)]">
                                {p.id}
                              </p>
                            </div>
                            <Toggle
                              on={on}
                              disabled={role.id === "owner"}
                              onClick={() => togglePerm(p.id)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>

      {creating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fade-in">
          <div className="w-full max-w-[400px] rounded-[20px] bg-white p-6 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.25)]">
            <h2
              className="text-[18px] text-[var(--ink-900)]"
              style={{ fontWeight: 500, letterSpacing: "-0.01em" }}
            >
              Custom role
            </h2>
            <p className="mt-1 text-[12.5px] text-[var(--ink-500)]">Name it.</p>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createRole()}
              placeholder="e.g. Brand Reviewer"
              className="mt-5 h-10 w-full rounded-[12px] border border-[var(--allonce-line)] bg-white px-3.5 text-[13.5px] text-[var(--ink-900)] placeholder:text-[var(--ink-400)] outline-none transition focus:border-[var(--ink-900)]"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="inline-flex h-9 items-center px-3 text-[13px] text-[var(--ink-500)] transition hover:text-[var(--ink-900)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={createRole}
                className="inline-flex h-9 items-center rounded-full bg-[var(--ink-900)] px-4 text-[13px] text-white transition hover:bg-black"
                style={{ fontWeight: 500 }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function Toggle({
  on,
  onClick,
  disabled,
}: {
  on: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className="relative h-6 w-11 shrink-0 rounded-full transition disabled:cursor-not-allowed disabled:opacity-50"
      style={{ backgroundColor: on ? "var(--ao-accent)" : "var(--bg-sunken)" }}
    >
      <span
        className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all"
        style={{ left: on ? "22px" : "2px" }}
      />
    </button>
  );
}
