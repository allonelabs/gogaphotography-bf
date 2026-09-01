# Handoff — what needs Goga's logins

Everything in the code is done and deployed. The items below are blocked on
accounts only Goga can sign into; each is a few minutes of clicking. Nothing
here needs a developer.

He cannot be reached remotely, so this is written to be worked straight down
in one sitting at the office. Item 1 is the only one customers can see — do
that one even if the rest get skipped.

Georgian translation to hand him: `HANDOFF.ka.md`.

---

## 0. Email — DONE, nothing to do

Sending runs through `alerts@allonelabs.com`, which was already verified in
Resend. Contract emails, store receipts and the new booking and enquiry alerts
all work and are deployed. `goga.photography` itself never needed verifying,
which is why this section shrank from five steps to none.

One loose end, 30 seconds while signed in: open **Resend → Logs** and confirm
the two test sends to `info@goga.photography` read *Delivered* rather than
*Bounced*. Same check from the other end: look in that mailbox, including
spam, for "GOGA booking alerts — system test".

Optional: a full-access Resend API key would let the smoke test watch for
bounces automatically. The key in use is send-only by design, so it cannot
read logs.

---

## 1. Domain — the only item customers can see

Customers currently land on the old WordPress site, or on `gogaphotography.ge`
whose TLS certificate expired on 27 July 2026 (browsers show a security
warning). Everything built here is invisible until this is done.

1. Cloudflare → `gogaphotography.ge` → **DNS**
2. Edit the `A` record for `@` → value `76.76.21.21`
3. Set proxy status to **DNS only** (grey cloud, not orange)

The domain is already attached to the Vercel project, so it goes live within
minutes and the certificate is issued and renewed automatically.

Safe to do: `gogaphotography.ge` has no MX records, so no email can break.

**If the Cloudflare login is lost** — it is the blocker, not the registrar. Use
<https://my.cloud9.ge> instead (log in with the email, not a username; reset at
`/password/reset` goes to `gio.mikeladze@gmail.com`), open `gogaphotography.ge`
→ Nameservers, and replace both `*.ns.cloudflare.com` entries with:

```
ns1.vercel-dns.com
ns2.vercel-dns.com
```

That moves DNS to Vercel, where the developer can manage every record by API
and no further logins are needed. Either route works; only one is required.

---

## 2. Instagram and Messenger — never actually connected

The access tokens are stored, but `page_id` and `ig_user_id` are empty and no
message has ever arrived (0 threads, 0 messages), so the webhook was never
subscribed.

Already done, no action needed:

- The app is **GOGA Bot** (`1055886090265029`) and its Page token is valid and
  does not expire.
- The Page ID `537072563068657` has been filled into the admin.
- The callback URL already answers Meta's verification handshake correctly —
  tested by replaying the exact request Meta sends.

What is missing is the subscription itself, which needs a permission the stored
token does not have (`pages_manage_metadata`), so it has to be clicked by hand:

1. <https://developers.facebook.com> → app **GOGA Bot** → **Messenger** →
   **Settings**
2. Under **Webhooks**, add the callback URL:
   `https://gogaphotography-bf.vercel.app/api/meta/webhook`
   - Verify token: the value saved in the admin under Messages → Settings
   - Subscribe to the fields `messages` and `messaging_postbacks`
3. Under **Access Tokens**, connect the studio's Facebook Page and press
   **Add Subscriptions** for that Page
4. For Instagram: **Instagram** → **API setup with Instagram login** → connect
   the professional account, then paste its **Instagram user ID** into the
   admin under Messages → Settings

Until step 3 is done Meta accepts messages but delivers them nowhere, which is
why the admin inbox has never shown a single conversation.

---

## 3. Pinterest — needs a developer app, not a password

The Pinterest API has no password login; it uses OAuth, so an App ID and secret
are required.

Unlike Meta, there is nothing to recover here — no token, refresh token or
connected account was ever stored, and no Pinterest event was ever logged, so
the account has genuinely never been connected. All of it has to be created.

1. <https://developer.pinterest.com> → log in → **Create app**
2. Redirect URI, exactly:
   `https://gogaphotography-bf.vercel.app/api/pinterest/oauth/callback`
3. Scopes: `boards:read`, `pins:read`, `pins:write`, `user_accounts:read`
4. Send the **App ID** and **App secret** to the developer, who sets two Vercel
   variables. Goga then clicks **Connect** in the admin.

Worth doing at some point: 10 pins are already queued and waiting, the oldest
scheduled for July. They will publish once the connection exists. Nothing else
depends on this, so it is the least urgent item here.

---

## Security

Rotate the password `Gogaphotography123`. It was shared in a chat log and is
reused across Pinterest and hosting. Use a different password for each.

---

## Checking the site after any deploy

Deploys to the public site are manual (`vercel deploy --prod`) and must be run
from a **full** checkout — a deploy from a partial clone once published only the
API routes and every page 404'd.

```
npm run smoke
```

Checks the 21 real pages, the 7 admin-backed APIs, and that the leftover
template pages stay out of Google. Non-zero exit means something is wrong.

The repository is ~200 MB, so a clone often stalls. When only environment
variables have changed and no file has, skip the clone entirely:

```
vercel redeploy <last-good-production-url> --scope allonelabs
```

That rebuilds the previous deployment with the current variables and cannot
drop files, which is the failure mode above.
