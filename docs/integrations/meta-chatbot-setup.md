# Messenger + Instagram chatbot setup — for the person managing GOGA's Facebook

Connect GOGA Photography's Facebook Page and Instagram account so the studio's
AI assistant answers DMs automatically, captures leads, and hands off to a
human when needed. Every conversation lands in the studio admin at
**gogaphotography-bf.vercel.app → Messages**, where the studio can take over
any thread.

**Time:** ~30 minutes (+ Meta's app review, a few days, for messaging the
general public)
**Cost:** free
**Prerequisites:** you must be an **admin of the GOGA Photography Facebook
Page**, and the Instagram account must be a **Business/Creator account linked
to that Page** (Instagram app → Settings → Business tools → connect Page).

---

## Step 1 — Meta Business Account

If the studio doesn't have one: go to https://business.facebook.com and create
a Business Account. This is separate from any personal Facebook profile.

## Step 2 — Meta App (Business type)

1. Visit https://developers.facebook.com/apps
2. **Create App** → type **Business**
3. Name it (e.g. "GOGA Photography Bot") and link it to the Business Account

## Step 3 — Add Messenger + Instagram products

In the app dashboard sidebar, **Add Product**:

1. **Messenger** → Set up
2. **Instagram** → Set up (needs the IG Business account linked to the Page)

## Step 4 — Page access token

On **Messenger → API settings** (or **Messenger → Settings** depending on
dashboard version):

1. Under **Access Tokens**, click **Add or remove Pages** → select the GOGA
   Photography Page → grant everything it asks
2. Click **Generate token** next to the Page. Copy it — this is the
   **Page access token**.
3. Note the **Page ID** shown next to the Page name (also visible at
   facebook.com → the Page → About).

For a token that never expires, mirror the WhatsApp doc's System User approach
(Business Settings → System Users → generate token with `pages_messaging` +
`instagram_manage_messages` permissions). The quick token above is fine to
start.

## Step 5 — Webhook

Still in Messenger settings, under **Webhooks**:

1. **Callback URL:** `https://gogaphotography-bf.vercel.app/api/meta/webhook`
2. **Verify token:** invent a random string (e.g. run `openssl rand -hex 24`
   or just mash 30+ random characters). **Save it** — it goes into the admin
   in step 7.

⚠️ **Do step 7 BEFORE clicking "Verify and Save"** — Meta checks the URL
immediately, and the check only passes once the same verify token is saved in
the studio admin.

3. After verifying, **Subscribe** the Page to webhook fields: `messages`
   (required), `messaging_postbacks` (optional).
4. On the **Instagram** product page, subscribe to `messages` there too.

## Step 6 — App secret

App dashboard → **App Settings → Basic** → **App Secret** → Show → copy.
This is how the studio verifies webhook posts really come from Meta —
**the bot will not process any messages until it is set.**

## Step 7 — Plug values into the studio admin

In the studio admin: **gogaphotography-bf.vercel.app → Messages → Settings**
(direct URL: `/app/messages/settings`). You'll need the studio admin password
— ask Goga/the studio.

| Field | Value from |
| --- | --- |
| Page ID | Step 4 |
| Page access token | Step 4 |
| Verify token | Step 5 (the random string you invented) |
| App secret | Step 6 |
| IG user ID | Instagram product page (the IG account's ID), if asked |
| Bot enabled | switch ON when ready |

Save, then go back to Meta's webhook config and click **Verify and Save**
(step 5) — it should turn green.

## Step 8 — Test

From a personal account, DM the GOGA Facebook Page (as long as your account
has a role on the app — admin/developer/tester — this works before app
review). The bot should reply within a few seconds, grounded in the studio's
services and prices. The thread appears in **Messages** in the admin; open it
and press the takeover control to pause the bot on that thread and reply as a
human.

Try Instagram DMs the same way.

## Step 9 — App review (to message the general public)

Until review, only people with a role on the app get bot replies. In the app
dashboard → **App Review → Permissions and Features**, request **Advanced
Access** for:

- `pages_messaging`
- `instagram_manage_messages`

Meta asks for a screen recording of the bot in action (record step 8) and a
short description ("AI assistant answering FAQs about photography services;
human takeover available"). Approval typically takes a few days.

---

## Troubleshooting

**Webhook verification fails** — the verify token in Meta must EXACTLY match
what's saved in the admin (case-sensitive), and the admin settings must be
saved BEFORE clicking Verify.

**Bot doesn't reply but threads appear in the admin** — check "Bot enabled" is
ON in `/app/messages/settings`, and that the thread isn't in human-takeover
mode.

**Bot doesn't reply and no thread appears** — the app secret is probably
missing or wrong (unsigned/badly-signed events are dropped by design), or the
Page isn't subscribed to the `messages` webhook field.

**Instagram messages don't arrive** — the IG account must be Business/Creator
AND linked to the Page, and the Instagram product's webhook subscription is
separate from Messenger's (step 5.4).
