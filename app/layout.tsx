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
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  // Lock the rendered viewport into the safe area on iOS so the PWA
  // sits flush behind the notch + home indicator. Without `viewport-fit`
  // the standalone shell leaves a default grey strip under the status bar.
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: {
    default: "GOGA Photography — studio admin",
    template: "%s · GOGA Photography",
  },
  description: "Studio admin for goga.photography — wedding & editorial.",
  applicationName: "GOGA Studio",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "GOGA",
    statusBarStyle: "black-translucent",
    startupImage: ["/apple-touch-icon.png"],
  },
  formatDetection: {
    telephone: false,
  },
  // Next 16 only emits the modern `mobile-web-app-capable`. iOS Safari
  // still respects the older Apple-prefixed name, so include both.
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32", type: "image/x-icon" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-256.png", sizes: "256x256", type: "image/png" },
      { url: "/favicon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
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
