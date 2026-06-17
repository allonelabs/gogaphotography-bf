// app/lib/goga/store-email.ts
export interface DownloadEmailItem {
  title: string;
  token: string;
}
export interface DownloadEmailInput {
  origin: string;
  items: DownloadEmailItem[];
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Pure builder for the post-purchase download email. */
export function buildDownloadEmail(input: DownloadEmailInput): {
  subject: string;
  html: string;
} {
  const rows = input.items
    .map((it) => {
      const url = `${input.origin}/api/store/download/${it.token}`;
      return `<p style="margin:12px 0"><strong>${esc(it.title)}</strong><br/>
        <a href="${url}">${url}</a></p>`;
    })
    .join("\n");
  const html = `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#111">
    <h2>Your GOGA downloads</h2>
    <p>Thank you for your purchase. Your download links are below. They expire in 7 days and allow up to 5 downloads each.</p>
    ${rows}
    <p style="color:#666;font-size:13px;margin-top:24px">GOGA Photography</p>
  </div>`;
  return { subject: "Your GOGA downloads", html };
}
