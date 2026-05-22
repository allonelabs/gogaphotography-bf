// Client-safe helper that rewrites a public-asset path on a spawn site
// (`/videos/foo.mp4`, `/audio/bar.mp3`, `/images/baz.jpg`, `/exports/qux.mp4`)
// to the operator-UI passthrough route (`/api/spawn/<id>/asset/<root>/<file>`).
// Leaves http(s):, data:, and unrecognized roots untouched so external assets
// (Pexels, fal.ai delivery, brand assets) still flow direct.
//
// The on-disk project state always stores the canonical `/<root>/<file>` form
// — only the in-memory copy passed to the operator-UI's `<Player>` / `<video>`
// / `<audio>` / `<a href>` is rewritten. Lets the spawn site (port 4000) keep
// reading from its own /public while the operator UI (port 3100) goes through
// the API.

const ROOT_RE = /^\/?(videos|audio|images|exports)\/(.+)$/;

export function assetUrlForOperator(spawnId: string, ref: string): string {
  if (!ref || /^https?:\/\//i.test(ref) || /^data:/.test(ref)) return ref;
  const m = ROOT_RE.exec(ref);
  if (!m) return ref;
  return `/api/spawn/${encodeURIComponent(spawnId)}/asset/${m[1]}/${m[2]}`;
}
