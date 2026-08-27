# Handoff — what needs Goga's logins

Everything in the code is done and deployed. The items below are blocked on
accounts only Goga can sign into; each is a few minutes of clicking. Nothing
here needs a developer.

Send him the four sections as-is.

---

## 1. Email — do this one first

Fixes two things at once: contract emails currently fail, and new-booking
alerts are wired but dormant.

1. Log in at <https://resend.com> → **Domains** → **Add Domain**
2. Enter `goga.photography`
3. Resend shows three DNS records (DKIM, SPF, DMARC). Copy them.
4. Add all three in Cloudflare: `goga.photography` → **DNS** → **Add record**
5. Back in Resend, click **Verify**

Nothing else is needed afterwards — `ALERT_TO` and `RESEND_API_KEY` are already
set in Vercel, so booking and enquiry alerts start arriving at
`info@goga.photography` on their own.

**Why it is broken today:** no domain is verified, so Resend rejects every send
with `403 domain_not_verified`. Contracts can still be sent by copying the
signing link out of the admin and messaging it to the client by hand.

---

## 2. Domain — point the .ge name at the working site

Customers currently land on the old WordPress site, or on `gogaphotography.ge`
whose TLS certificate expired on 27 July 2026 (browsers show a security
warning).

1. Cloudflare → `gogaphotography.ge` → **DNS**
2. Edit the `A` record for `@` → value `76.76.21.21`
3. Set proxy status to **DNS only** (grey cloud, not orange)

The domain is already attached to the Vercel project, so it goes live within
minutes and the certificate is issued and renewed automatically.

Safe to do: `gogaphotography.ge` has no MX records, so no email can break.

---

## 3. Instagram and Messenger — never actually connected

The access tokens are stored, but `page_id` and `ig_user_id` are empty and no
message has ever arrived (0 threads, 0 messages), so the webhook was never
subscribed.

1. <https://developers.facebook.com> → the existing app
2. Link the **Facebook Page** for the studio
3. Subscribe the webhook to `messages` and `messaging_postbacks`
   - Callback URL: `https://gogaphotography-bf.vercel.app/api/meta/webhook`
   - Verify token: the value already saved in the admin under Messages
4. Copy the **Page ID** and **Instagram user ID** into the admin's Messages
   settings

---

## 4. Pinterest — needs a developer app, not a password

The Pinterest API has no password login; it uses OAuth, so an App ID and secret
are required.

1. <https://developer.pinterest.com> → log in → **Create app**
2. Redirect URI, exactly:
   `https://gogaphotography-bf.vercel.app/api/pinterest/oauth/callback`
3. Scopes: `boards:read`, `pins:read`, `pins:write`, `user_accounts:read`
4. Send the **App ID** and **App secret** to the developer, who sets two Vercel
   variables. Goga then clicks **Connect** in the admin.

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
