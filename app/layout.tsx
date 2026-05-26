import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Single typeface across the operator surface. Matches the reference
// landing page (localhost:3038/index.html) which loads Inter directly.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const viewport: Viewport = {
  themeColor: "#FAFAFA",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: "GOGA Photography — studio admin",
    template: "%s · GOGA Photography",
  },
  description: "Studio admin for goga.photography — wedding & editorial.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32", type: "image/x-icon" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: { url: "/apple-touch-icon.png" },
  },
};

// Apply saved theme + accent before the first paint so light/dark/system
// don't flash. 2026-05-14 — operator asked for working themes.
const THEME_BOOT_SCRIPT = `
(function(){
  try {
    var raw = localStorage.getItem('allonce.prefs');
    var p = raw ? JSON.parse(raw) : null;
    var theme = (p && p.theme) || 'light';
    var accent = (p && p.accent) || '#0A0A0A';
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.setProperty('--ao-accent', accent);
    document.documentElement.style.colorScheme = theme === 'dark'
      ? 'dark'
      : (theme === 'auto'
          ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
          : 'light');
  } catch(e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={inter.variable}
      style={{ "--ai-chat-panel-width": "0px" } as React.CSSProperties}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="tailwind tailwind-no-preflight">{children}</body>
    </html>
  );
}
