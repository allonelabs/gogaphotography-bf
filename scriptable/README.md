# GOGA iPhone widget — install on your phone

A small Scriptable script that renders live studio stats as iPhone widgets — works on the home screen AND the lock screen.

## What you'll see

- **Small home widget** — active leads (big number), open shoots, contracts awaiting signature.
- **Medium home widget** — 3 stats across the top + next 2 shoots.
- **Large home widget** — 3 stats + next 4 shoots + 4 most-recent audit events.
- **Lock-screen circular** — active leads count.
- **Lock-screen inline** — `5 leads · Jun 14 Anna Tabidze` text strip above the clock.
- **Lock-screen rectangular** — title row + next shoot.

Tap any widget to open the admin in Safari.

## One-time setup

1. Install **Scriptable** (free, App Store).
2. On the phone, open Scriptable → `+` (new script).
3. Paste the entire contents of `goga-widget.js` from this folder.
4. At the top, replace `PASTE_TOKEN_HERE` with the widget token. Ask team@allonelabs.com if you don't have it — it's a long random string Goga should treat like a password.
5. Tap **Done**. Rename the script to **GOGA**.
6. Run it once inside Scriptable to confirm it can fetch — you'll see a small/medium/large preview.

## Add to the home screen

1. Long-press an empty area on the home screen → `+` (top-left).
2. Search **Scriptable** → pick a widget size (small / medium / large).
3. Tap the placeholder widget → **Edit Widget** → **Script** → choose **GOGA**.
4. Set **When Interacting** to **Open URL** if you want taps to launch the admin.
5. Done.

## Add to the lock screen (iOS 16+)

1. Long-press the lock screen → **Customise** → **Lock Screen**.
2. Tap the widget area below the clock (or above for the inline strip).
3. **Add Widgets** → search **Scriptable** → pick the size:
   - **Circular** → leads count
   - **Inline** → quick status strip
   - **Rectangular** → next shoot card
4. Tap the placed widget → choose **GOGA** as the script.

## Refresh cadence

- The widget refreshes itself **every 10 minutes**.
- Long-press → **Edit Widget** → **Show Script** doesn't force a refresh; iOS schedules its own.
- For an instant refresh, swipe the widget off the screen and add it back.

## Security

- The token is sent as `?t=<token>` in the URL — only over HTTPS to `gogaphotography-bf.vercel.app`.
- Constant-time comparison on the server.
- Rotate any time by minting a new value in Keychain (`security add-generic-password -s goga-widget-token -a token -w '<new>'`), updating the Vercel env var, and pasting the new value into the script.
- If lost or compromised, just rotate — no other surface uses this token.
