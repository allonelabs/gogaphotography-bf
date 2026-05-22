"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/app/components/app/AppShell";
import { toast } from "@/app/components/app/Toast";

interface Profile {
  name: string;
  email: string;
  role: string;
  timezone: string;
  bio: string;
  twitter: string;
  github: string;
}

// Empty until /api/account/profile resolves. The form shouldn't pre-populate
// with a real person's name, bio, or socials — every signed-in user used to
// see "Luka Adamia / Growth Director / @lukaadamia" until their own profile
// loaded.
const DEFAULT: Profile = {
  name: "",
  email: "",
  role: "",
  timezone: "",
  bio: "",
  twitter: "",
  github: "",
};

// localStorage cache key kept ONLY so we can purge stale identity data
// from older sessions. Identity is no longer pre-painted from localStorage —
// that caused a Luka-Adamia-style ghost: a different user's name + role
// would show on the form before the API resolved.
const STALE_CACHE_KEY = "allonce.profile";
const TIMEZONES = [
  "Europe/Tbilisi",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Tokyo",
  "Asia/Dubai",
];

function formatSavedAt(iso: string | null): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString();
  } catch {
    return "";
  }
}

function pickProfileFields(p: Record<string, unknown>): Profile {
  return {
    name: typeof p["name"] === "string" ? p["name"] : DEFAULT.name,
    email: typeof p["email"] === "string" ? p["email"] : DEFAULT.email,
    role: typeof p["role"] === "string" ? p["role"] : DEFAULT.role,
    timezone:
      typeof p["timezone"] === "string" ? p["timezone"] : DEFAULT.timezone,
    bio: typeof p["bio"] === "string" ? p["bio"] : DEFAULT.bio,
    twitter: typeof p["twitter"] === "string" ? p["twitter"] : DEFAULT.twitter,
    github: typeof p["github"] === "string" ? p["github"] : DEFAULT.github,
  };
}

export default function Page() {
  const [profile, setProfile] = useState<Profile>(DEFAULT);
  const [draft, setDraft] = useState<Profile>(DEFAULT);
  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    // Scrub stale identity cache from older sessions — keeping it would
    // ghost a previous user's name/email/role onto this form.
    try {
      localStorage.removeItem(STALE_CACHE_KEY);
    } catch {}

    let cancelled = false;
    fetch("/api/account/profile")
      .then((r) => r.json())
      .then((b: { profile?: Record<string, unknown> }) => {
        if (cancelled || !b.profile) return;
        const server = pickProfileFields(b.profile);
        setProfile(server);
        setDraft(server);
        setSavedAt(
          typeof b.profile["updatedAt"] === "string"
            ? (b.profile["updatedAt"] as string)
            : null,
        );
      })
      .catch(() => {
        toast("Could not load profile", "warn");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const dirty =
    mounted &&
    (draft.name !== profile.name ||
      draft.email !== profile.email ||
      draft.role !== profile.role ||
      draft.timezone !== profile.timezone ||
      draft.bio !== profile.bio ||
      draft.twitter !== profile.twitter ||
      draft.github !== profile.github);

  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as { profile?: Record<string, unknown> };
      const saved = pickProfileFields(
        body.profile ?? (draft as unknown as Record<string, unknown>),
      );
      setProfile(saved);
      setDraft(saved);
      setSavedAt(
        typeof body.profile?.["updatedAt"] === "string"
          ? (body.profile["updatedAt"] as string)
          : new Date().toISOString(),
      );
      toast("Profile saved", "ok");
    } catch (err) {
      toast(
        `Save failed · ${err instanceof Error ? err.message : "unknown"}`,
        "err",
      );
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setDraft(profile);
  }

  const initials = draft.name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <AppShell
      breadcrumb={[
        { label: "Account", href: "/app/account" },
        { label: "Profile" },
      ]}
      chatScope={{ level: "org" }}
      chatScopeLabel="account/profile"
    >
      <div className="p-10">
        <div className="max-w-3xl">
          <p className="eyebrow">Profile</p>
          <h1
            className="display-h2 mt-3"
            style={{ fontSize: "clamp(30px, 3.8vw, 44px)" }}
          >
            How you show up
          </h1>
          <p
            className="mt-3 text-[var(--ink-500)]"
            style={{ fontSize: "17px", fontWeight: 300 }}
          >
            This is what teammates, operators, and activity logs see.
          </p>

          {/* Avatar + identity */}
          <div className="mt-10 flex items-center gap-6">
            <div
              className="flex h-20 w-20 items-center justify-center rounded-full text-[28px] text-white"
              style={{
                backgroundColor: "var(--ao-accent)",
                fontWeight: 500,
                fontVariationSettings: '"opsz" 48',
              }}
            >
              {initials || "·"}
            </div>
            <div>
              <p className="text-[10.5px] font-medium uppercase tracking-[0.22em] text-[var(--ink-500)]">
                Avatar
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    toast("Avatar upload · ships next round", "info")
                  }
                  className="h-8 rounded-full bg-[var(--bg-surface-alt)] px-4 text-[12.5px] font-medium text-[var(--ink-900)] transition hover:bg-[var(--bg-sunken)]"
                >
                  Upload image
                </button>
                <span className="inline-flex h-8 items-center text-[12.5px] text-[var(--ink-500)]">
                  Initials are the default for now
                </span>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="mt-10 grid gap-5">
            <Field label="Full name">
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className="input"
              />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Email">
                <input
                  type="email"
                  value={draft.email}
                  onChange={(e) =>
                    setDraft({ ...draft, email: e.target.value })
                  }
                  className="input"
                />
              </Field>
              <Field label="Role">
                <input
                  value={draft.role}
                  onChange={(e) => setDraft({ ...draft, role: e.target.value })}
                  className="input"
                />
              </Field>
            </div>
            <Field label="Timezone">
              <select
                value={draft.timezone}
                onChange={(e) =>
                  setDraft({ ...draft, timezone: e.target.value })
                }
                className="input"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz}>{tz}</option>
                ))}
              </select>
            </Field>
            <Field label="Short bio">
              <textarea
                rows={3}
                value={draft.bio}
                onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
                className="input resize-none"
              />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Twitter / X">
                <input
                  value={draft.twitter}
                  onChange={(e) =>
                    setDraft({ ...draft, twitter: e.target.value })
                  }
                  className="input"
                  placeholder="@handle"
                />
              </Field>
              <Field label="GitHub">
                <input
                  value={draft.github}
                  onChange={(e) =>
                    setDraft({ ...draft, github: e.target.value })
                  }
                  className="input"
                  placeholder="username"
                />
              </Field>
            </div>
          </div>

          {/* Save bar */}
          <div className="mt-6 flex items-center justify-end gap-3">
            {savedAt && !dirty && !saving ? (
              <span className="text-[11.5px] text-[var(--ink-500)]">
                Saved {formatSavedAt(savedAt)}
              </span>
            ) : null}
            <button
              type="button"
              onClick={reset}
              disabled={!dirty || saving}
              className="h-10 rounded-full px-5 text-[13px] font-medium text-[var(--ink-500)] transition hover:text-[var(--ink-900)] disabled:opacity-40"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={save}
              disabled={!dirty || saving}
              className="h-10 rounded-full bg-[var(--ink-900)] px-6 text-[13px] font-medium text-white transition hover:bg-black disabled:opacity-40"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .input {
          width: 100%;
          height: 40px;
          border-radius: 10px;
          background-color: var(--bg-surface-alt);
          padding: 0 14px;
          font-size: 14px;
          color: var(--ink-900);
          outline: none;
          border: 1px solid transparent;
          transition:
            border-color 150ms,
            background-color 150ms;
        }
        textarea.input {
          height: auto;
          padding: 10px 14px;
          line-height: 1.5;
        }
        .input:focus {
          background-color: var(--bg-surface);
          border-color: var(--ao-accent);
        }
      `}</style>
    </AppShell>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10.5px] font-medium uppercase tracking-[0.22em] text-[var(--ink-500)]">
        {label}
      </span>
      {children}
    </label>
  );
}
