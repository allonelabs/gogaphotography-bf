"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

export function SignPad({
  token,
  defaultName,
}: {
  token: string;
  defaultName: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastRef = useRef<{ x: number; y: number } | null>(null);
  const [hasInk, setHasInk] = useState(false);
  const [name, setName] = useState(defaultName);
  const [agreed, setAgreed] = useState(false);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale(dpr, dpr);
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = "#111";
      }
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  function pos(e: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }
  function onDown(e: ReactPointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    drawingRef.current = true;
    lastRef.current = pos(e);
    canvasRef.current?.setPointerCapture(e.pointerId);
  }
  function onMove(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const p = pos(e);
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx && lastRef.current) {
      ctx.beginPath();
      ctx.moveTo(lastRef.current.x, lastRef.current.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      lastRef.current = p;
      if (!hasInk) setHasInk(true);
    }
  }
  function onUp(e: ReactPointerEvent<HTMLCanvasElement>) {
    drawingRef.current = false;
    lastRef.current = null;
    try {
      canvasRef.current?.releasePointerCapture(e.pointerId);
    } catch {}
  }
  function onClear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
  }

  async function onSign() {
    setErr(null);
    if (!name.trim()) return setErr("Please type your full name.");
    if (!hasInk) return setErr("Please draw your signature in the box.");
    if (!agreed) return setErr("Please check the agreement box to proceed.");
    const canvas = canvasRef.current;
    if (!canvas) return;
    const signatureDataUrl = canvas.toDataURL("image/png");

    setSending(true);
    try {
      const res = await fetch(`/api/sign/${token}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ signerName: name.trim(), signatureDataUrl }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (res.ok && data.ok) {
        setDone(true);
      } else {
        setErr(
          data.error === "already_signed"
            ? "This contract has already been signed."
            : data.error === "rate_limited"
              ? "Too many attempts. Wait a minute."
              : "Could not record signature. Please try again.",
        );
      }
    } catch {
      setErr("Network error. Try again.");
    }
    setSending(false);
  }

  if (done) {
    return (
      <section className="rounded-2xl bg-white p-12 text-center ring-1 ring-black/5">
        <h2
          className="text-3xl font-semibold"
          style={{ fontVariationSettings: '"wght" 640' }}
        >
          Signed.
        </h2>
        <p className="mt-3 text-[var(--ink-500)]">
          Thank you, {name.trim()}. A copy of the contract has been saved. The
          studio will reach out with next steps.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl bg-white p-7 ring-1 ring-black/5">
      <h2 className="mb-5 text-[14px] font-medium uppercase tracking-[0.22em] text-[var(--ink-900)]">
        Sign below
      </h2>

      <label className="mb-4 block">
        <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--ink-500)]">
          Full legal name
        </span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          required
          className="block w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-[16px] outline-none focus:border-[var(--ink-900)]"
        />
      </label>

      <label className="mb-4 block">
        <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--ink-500)]">
          Signature
        </span>
        <div className="relative">
          <canvas
            ref={canvasRef}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            style={{ touchAction: "none" }}
            className="block h-[180px] w-full cursor-crosshair rounded-xl border border-dashed border-black/20 bg-slate-50"
          />
          <button
            type="button"
            onClick={onClear}
            className="absolute right-2 top-2 rounded-full border border-black/10 bg-white px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-[var(--ink-700)] hover:bg-slate-50"
          >
            Clear
          </button>
        </div>
      </label>

      <label className="my-5 flex items-start gap-2 text-[14px] leading-[1.5] text-[var(--ink-800)]">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-[3px] h-4 w-4 rounded border-black/20"
        />
        <span>
          I have read and agree to the terms of this Photography Service
          Agreement.
        </span>
      </label>

      <button
        type="button"
        onClick={onSign}
        disabled={sending}
        className="rounded-full bg-[var(--ink-900)] px-7 py-3.5 text-[11px] font-medium uppercase tracking-[0.22em] text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {sending ? "Recording…" : "Sign contract"}
      </button>

      {err ? <p className="mt-3 text-[13px] text-rose-700">{err}</p> : null}
    </section>
  );
}
