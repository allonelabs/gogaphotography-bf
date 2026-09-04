/**
 * `redirect()` in a server action signals the navigation by throwing. When the
 * client component that called the action wraps it in try/catch, that signal
 * lands in the catch and gets shown to the operator as a failure — e.g.
 * "Delete failed: NEXT_REDIRECT" on a delete that actually succeeded.
 *
 * Re-throw it so Next can perform the navigation, and only treat what is left
 * as a real error.
 *
 *   } catch (e) {
 *     rethrowIfRedirect(e);
 *     toast.show(...);
 *   }
 *
 * Detected via the `digest` field rather than `next/dist/...` internals, which
 * are not a public API and move between releases.
 */
export function isRedirectError(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    typeof (e as { digest?: unknown }).digest === "string" &&
    (e as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

export function rethrowIfRedirect(e: unknown): void {
  if (isRedirectError(e)) throw e;
}
