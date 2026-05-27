// GOGA Photography — iPhone widget
//
// Install once: open Scriptable on the phone, "+" → paste this whole
// script, save as "GOGA". Long-press your home/lock screen, add a
// Scriptable widget, edit it, pick the GOGA script, and set "When
// Interacting" to "Open URL" with the admin URL below if you want
// taps to launch the admin in-place.
//
// Set these two before saving:
const ADMIN_URL = "https://gogaphotography-bf.vercel.app";
const TOKEN = "PASTE_TOKEN_HERE"; // Goga: ask team@allonelabs.com

// ── Theme ─────────────────────────────────────────────────────────────
const INK = new Color("#0a0a0a");
const PAPER = new Color("#fafafa");
const MUTED = new Color("#71717a");
const ACCENT = new Color("#0a0a0a");
const RED = new Color("#dc2626");

const FAM = config.widgetFamily || "medium";

// ── Fetch ─────────────────────────────────────────────────────────────
let payload = null;
let fetchErr = null;
try {
  const url = `${ADMIN_URL}/api/widget?t=${encodeURIComponent(TOKEN)}`;
  const req = new Request(url);
  req.timeoutInterval = 8;
  payload = await req.loadJSON();
  if (!payload.ok) throw new Error(payload.error || "feed_error");
} catch (e) {
  fetchErr = e.message || String(e);
}

// ── Helpers ───────────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-GB", { month: "short", day: "numeric" });
}
function relTime(iso) {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
function eventLabel(kind) {
  const map = {
    "deposit.paid": "Paid",
    "deposit.link_created": "Deposit",
    "contract.sent": "Contract sent",
    "contract.signed": "Contract signed",
    "booking.created": "New booking",
    "booking.status_changed": "Status",
    "lead.stage_changed": "Stage",
    "lead.archived": "Archived",
  };
  return map[kind] || kind;
}

// ── Build widget ──────────────────────────────────────────────────────
const w = new ListWidget();
w.backgroundColor = PAPER;
w.url = `${ADMIN_URL}/app`;
w.refreshAfterDate = new Date(Date.now() + 10 * 60 * 1000); // 10 min

if (fetchErr) {
  renderError(w, fetchErr);
} else {
  const c = payload.counts;
  switch (FAM) {
    case "accessoryCircular":
      renderCircular(w, c.active_leads);
      break;
    case "accessoryInline":
      renderInline(w, c, payload.next_shoots[0]);
      break;
    case "accessoryRectangular":
      renderRectangular(w, c, payload.next_shoots[0]);
      break;
    case "small":
      renderSmall(w, c);
      break;
    case "large":
    case "extraLarge":
      renderLarge(w, c, payload.next_shoots, payload.recent_events);
      break;
    default:
      renderMedium(w, c, payload.next_shoots);
  }
}

if (config.runsInWidget) {
  Script.setWidget(w);
} else {
  // Live preview when run inside the Scriptable app
  switch (FAM) {
    case "small":
      await w.presentSmall();
      break;
    case "large":
      await w.presentLarge();
      break;
    case "accessoryCircular":
    case "accessoryInline":
    case "accessoryRectangular":
      await w.presentAccessoryRectangular();
      break;
    default:
      await w.presentMedium();
  }
}
Script.complete();

// ── Renderers ─────────────────────────────────────────────────────────
function renderSmall(w, c) {
  w.setPadding(14, 14, 14, 14);
  const head = w.addText("GOGA");
  head.font = Font.systemFont(10);
  head.textColor = MUTED;
  head.textOpacity = 0.75;
  w.addSpacer(6);

  const big = w.addText(String(c.active_leads));
  big.font = Font.boldSystemFont(44);
  big.textColor = INK;
  const sub = w.addText("active leads");
  sub.font = Font.systemFont(11);
  sub.textColor = MUTED;

  w.addSpacer();
  const row = w.addStack();
  row.layoutHorizontally();
  pill(row, String(c.open_bookings), "shoots", ACCENT);
  row.addSpacer(8);
  pill(
    row,
    String(c.awaiting_signature),
    "sign",
    c.awaiting_signature > 0 ? RED : MUTED,
  );
}

function renderMedium(w, c, shoots) {
  w.setPadding(14, 16, 14, 16);
  // Top row: 3 counts
  const top = w.addStack();
  top.layoutHorizontally();
  top.spacing = 0;
  bigStat(top, c.active_leads, "Leads");
  top.addSpacer();
  bigStat(top, c.open_bookings, "Bookings");
  top.addSpacer();
  bigStat(
    top,
    c.awaiting_signature,
    "To sign",
    c.awaiting_signature > 0 ? RED : INK,
  );

  w.addSpacer(10);
  const divider = w.addStack();
  divider.size = new Size(0, 1);
  divider.backgroundColor = new Color("#e4e4e7");

  w.addSpacer(8);
  const label = w.addText("Next shoots");
  label.font = Font.semiboldSystemFont(10);
  label.textColor = MUTED;
  label.textOpacity = 0.85;
  w.addSpacer(4);

  if (!shoots || shoots.length === 0) {
    const none = w.addText("Nothing scheduled.");
    none.font = Font.systemFont(11);
    none.textColor = MUTED;
  } else {
    shoots.slice(0, 2).forEach((s, i) => {
      if (i > 0) w.addSpacer(2);
      shootLine(w, s);
    });
  }
}

function renderLarge(w, c, shoots, events) {
  w.setPadding(16, 18, 16, 18);
  const top = w.addStack();
  top.layoutHorizontally();
  bigStat(top, c.active_leads, "Leads");
  top.addSpacer();
  bigStat(top, c.open_bookings, "Bookings");
  top.addSpacer();
  bigStat(
    top,
    c.awaiting_signature,
    "To sign",
    c.awaiting_signature > 0 ? RED : INK,
  );

  w.addSpacer(14);
  const lab1 = w.addText("Next shoots");
  lab1.font = Font.semiboldSystemFont(11);
  lab1.textColor = MUTED;
  w.addSpacer(4);
  if (!shoots || shoots.length === 0) {
    const none = w.addText("Nothing scheduled.");
    none.font = Font.systemFont(11);
    none.textColor = MUTED;
  } else {
    shoots.slice(0, 4).forEach((s) => {
      shootLine(w, s);
      w.addSpacer(2);
    });
  }

  w.addSpacer(12);
  const lab2 = w.addText("Recent activity");
  lab2.font = Font.semiboldSystemFont(11);
  lab2.textColor = MUTED;
  w.addSpacer(4);
  (events || []).slice(0, 4).forEach((e) => {
    const row = w.addStack();
    row.layoutHorizontally();
    const t = row.addText(eventLabel(e.kind));
    t.font = Font.systemFont(12);
    t.textColor = INK;
    row.addSpacer();
    const ts = row.addText(relTime(e.at));
    ts.font = Font.systemFont(10);
    ts.textColor = MUTED;
    w.addSpacer(2);
  });
}

function renderCircular(w, n) {
  w.backgroundColor = new Color("#000");
  const t = w.addText(String(n));
  t.font = Font.boldSystemFont(22);
  t.textColor = Color.white();
  t.centerAlignText();
  const sub = w.addText("LEADS");
  sub.font = Font.systemFont(8);
  sub.textColor = Color.white();
  sub.textOpacity = 0.7;
  sub.centerAlignText();
}

function renderInline(w, c, next) {
  const parts = [];
  parts.push(`${c.active_leads} leads`);
  if (next) parts.push(`${fmtDate(next.date)} ${next.client || ""}`.trim());
  const t = w.addText(parts.join(" · "));
  t.font = Font.systemFont(13);
}

function renderRectangular(w, c, next) {
  w.backgroundColor = new Color("#000", 0.6);
  const top = w.addText(`GOGA · ${c.active_leads} leads`);
  top.font = Font.semiboldSystemFont(12);
  top.textColor = Color.white();
  w.addSpacer(2);
  if (next) {
    const s = w.addText(
      `Next: ${fmtDate(next.date)}${next.time ? " " + next.time.slice(0, 5) : ""}`,
    );
    s.font = Font.systemFont(11);
    s.textColor = Color.white();
    s.textOpacity = 0.85;
    if (next.client) {
      w.addSpacer(1);
      const c2 = w.addText(next.client);
      c2.font = Font.boldSystemFont(13);
      c2.textColor = Color.white();
    }
  } else {
    const s = w.addText("Nothing scheduled");
    s.font = Font.systemFont(11);
    s.textColor = Color.white();
    s.textOpacity = 0.7;
  }
}

function bigStat(stack, n, label, color) {
  const col = stack.addStack();
  col.layoutVertically();
  const t = col.addText(String(n));
  t.font = Font.boldSystemFont(28);
  t.textColor = color || INK;
  const l = col.addText(label);
  l.font = Font.systemFont(10);
  l.textColor = MUTED;
  l.textOpacity = 0.85;
}

function shootLine(stack, s) {
  const row = stack.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();
  const date = row.addText(fmtDate(s.date));
  date.font = Font.semiboldSystemFont(11);
  date.textColor = INK;
  row.addSpacer(6);
  if (s.time) {
    const t = row.addText(s.time.slice(0, 5));
    t.font = Font.systemFont(10);
    t.textColor = MUTED;
    row.addSpacer(6);
  }
  const client = row.addText(s.client || "(no client)");
  client.font = Font.systemFont(11);
  client.textColor = INK;
  client.lineLimit = 1;
}

function pill(stack, n, label, color) {
  const p = stack.addStack();
  p.layoutHorizontally();
  p.cornerRadius = 6;
  p.borderColor = color;
  p.borderWidth = 0.5;
  p.setPadding(2, 6, 2, 6);
  const a = p.addText(n);
  a.font = Font.boldSystemFont(11);
  a.textColor = color;
  p.addSpacer(3);
  const b = p.addText(label);
  b.font = Font.systemFont(10);
  b.textColor = color;
  b.textOpacity = 0.8;
}

function renderError(w, msg) {
  w.setPadding(14, 14, 14, 14);
  const head = w.addText("GOGA · widget");
  head.font = Font.systemFont(11);
  head.textColor = MUTED;
  w.addSpacer(6);
  const t = w.addText(msg.slice(0, 80));
  t.font = Font.systemFont(11);
  t.textColor = RED;
  w.addSpacer(6);
  const hint = w.addText("Check the script TOKEN value");
  hint.font = Font.systemFont(10);
  hint.textColor = MUTED;
}
