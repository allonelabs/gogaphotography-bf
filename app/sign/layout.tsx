import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign your contract — GOGA Photography",
  robots: { index: false, follow: false },
};

/**
 * Bare layout for the public sign flow. Lives outside `/app` so it has no
 * admin chrome — clients see only the contract and the signing form.
 *
 * The root layout.tsx already provides <html>/<body>, so this just passes
 * children through.
 */
type Props = { params: Promise<unknown>; children: React.ReactNode };

export default function SignLayout({ children }: Props) {
  return <>{children}</>;
}
