"use client";

import { useEffect, useRef, useState } from "react";

export interface CascadingComboboxProps {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  /** Endpoint to fetch options. Called with `?<filterParam>=<filterValue>` when filterValue is set. */
  endpoint: string;
  filterParam?: string;
  filterValue?: number | null;
  placeholder?: string;
}

type Option = { id: number; name: string };

/**
 * Self-contained controlled combobox over a catalog endpoint.
 *
 * - Refetches when `filterValue` changes.
 * - When `filterParam` is provided but `filterValue` is null, the control is
 *   disabled and shows no options (cascading parent not yet picked).
 * - On filter change with an active value, parent is told to clear via
 *   `onChange(null)` so we don't leave a stale child selection.
 */
export function CascadingCombobox({
  label,
  value,
  onChange,
  endpoint,
  filterParam,
  filterValue,
  placeholder = "— Select —",
}: CascadingComboboxProps) {
  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(false);
  const lastFilter = useRef<number | null | undefined>(filterValue);

  const disabled = !!filterParam && filterValue == null;

  useEffect(() => {
    // If a parent filter was previously set and changed, clear the child value.
    // Skip the very first effect run so we don't wipe an initial-loaded value.
    if (filterParam) {
      if (
        lastFilter.current !== filterValue &&
        lastFilter.current !== undefined
      ) {
        if (value != null) onChange(null);
      }
      lastFilter.current = filterValue;
    }

    if (disabled) {
      setOptions([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    const url = new URL(endpoint, window.location.origin);
    if (filterParam && filterValue != null) {
      url.searchParams.set(filterParam, String(filterValue));
    }
    fetch(url.toString())
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (j.ok && Array.isArray(j.data)) {
          setOptions(j.data as Option[]);
        } else {
          setOptions([]);
        }
      })
      .catch(() => {
        if (!cancelled) setOptions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, filterParam, filterValue]);

  return (
    <label className="grid gap-1.5">
      <span className="text-[11px] uppercase tracking-wider text-[var(--ink-500)]">
        {label}
      </span>
      <select
        value={value == null ? "" : String(value)}
        disabled={disabled || loading}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === "" ? null : Number(v));
        }}
        className="w-full rounded-[var(--radius-xs)] border border-[var(--allonce-line)] bg-[var(--bg-surface)] px-3 py-1.5 text-[13px] disabled:opacity-50"
      >
        <option value="">
          {disabled ? "—" : loading ? "Loading…" : placeholder}
        </option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.name}
          </option>
        ))}
      </select>
    </label>
  );
}
