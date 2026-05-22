# WhatsApp Business setup — for travelplace operators

Connect your organization's WhatsApp Business account so client messages land directly in travelplace and your operators (and the AI assistant) can reply from the platform.

**Time:** ~20 minutes
**Cost:** Free for the first 1,000 conversations/month, then ~$0.005-0.02 per conversation depending on country
**Prerequisites:** A real phone number that doesn't currently have a personal WhatsApp account, OR a brand-new SIM

---

## Step 1 — Meta Business Account

If you don't have one yet: go to https://business.facebook.com and create a Business Account for your travel agency.

This is separate from your personal Facebook account. It holds your WhatsApp Business profile, your Meta apps, and your billing.

---

## Step 2 — Meta App (Business type)

1. Visit https://developers.facebook.com/apps
2. Click **Create App** → choose **Business** type
3. Name it (e.g. "Acme Travel WhatsApp")
4. Link it to your Business Account from step 1

---

## Step 3 — Add WhatsApp to the app

In your app's dashboard sidebar:

1. Click **Add Product** → find **WhatsApp** → **Set up**
2. You'll land on the WhatsApp → **API Setup** page

On this page, Meta gives you a **test phone number** for free. You can use this for the first weeks. Later, add your real business number (separate ~5 min verification).

**Capture three values from the API Setup page:**

- **Phone number ID** (15-digit number under "From")
- **WhatsApp Business Account ID** (from the dropdown above "From")
- **Temporary access token** (24-hour test token — replace with a permanent one in step 5)

---

## Step 4 — Webhook subscription

Still on the WhatsApp section, click **Configuration** under **Webhooks**.

1. **Callback URL**: `https://travelplace-bf.vercel.app/api/webhooks/whatsapp`
   (replace `travelplace-bf.vercel.app` with your platform host if different)
2. **Verify token**: invent a random string. Easiest: run `openssl rand -hex 24` and paste the output. **Save this** — you'll need it again in step 7.
3. Click **Verify and Save**
4. Once saved, click **Manage** next to "Webhook fields" and **Subscribe** to:
   - `messages` (required — inbound messages from clients)
   - `message_template_status_update` (optional — for tracking template approval)

---

## Step 5 — Long-lived access token

The test token in step 3 expires in 24 hours. Generate a permanent one:

1. Go to https://business.facebook.com → **Business Settings** → **Users → System Users**
2. Click **Add** → name it e.g. "Travelplace WhatsApp Bot" → role **Admin**
3. Click your new System User → **Add Assets** → **Apps** → select your Meta App from step 2 → grant **Full Control**
4. Click **Generate New Token**:
   - App: your Meta App
   - Token expiration: **Never**
   - Permissions: `whatsapp_business_messaging`, `whatsapp_business_management`
5. Copy the long token. This is your **permanent access token**.

⚠️ Never paste this token into chat, email, or anywhere outside the travelplace integration form. Treat it like a password.

---

## Step 6 — App Secret (for inbound webhook signature)

1. Back in your Meta App dashboard → **App Settings** → **Basic**
2. Copy the **App Secret** (click "Show")

This is what travelplace uses to verify incoming webhook POSTs are actually from Meta and not a malicious actor.

---

## Step 7 — Plug values into travelplace

In travelplace, go to **Operations → WhatsApp → Settings** (`/app/integrations/whatsapp`).

Fill in the 6 fields:

| Field                        | Value from                                                 |
| ---------------------------- | ---------------------------------------------------------- |
| Phone number ID              | Step 3                                                     |
| WhatsApp Business Account ID | Step 3                                                     |
| Phone display                | The number you'll show operators (e.g. `+995 555 123 456`) |
| Access token                 | Step 5 (long-lived, permanent)                             |
| Webhook verify token         | Step 4 (the random string you invented)                    |
| Webhook app secret           | Step 6                                                     |

Click **Save**, then **Enable**. The integration becomes active.

---

## Step 8 — Test

In the travelplace chat (`/app`), type:

```
Send a WhatsApp test message to +995XXXXXXXXX saying "hello from travelplace"
```

(Substitute a real number you control — Meta requires the recipient to have messaged your business number first OR be on your verified test recipients list during the trial period.)

If it works: ✅ done.
If it doesn't:

- Check **WhatsApp → Settings → Test diagnostics** in travelplace
- Check Meta App dashboard → **WhatsApp → API Setup → Logs** for the actual error code
- Common issue: the recipient hasn't initiated a conversation in the last 24 hours — they need to message you first, OR you need to use a pre-approved Message Template (not just freeform text)

---

## Step 9 — Going live with your real number (later)

The test number Meta gives you is fine for staff testing but has a 24-hour-conversation rule + only 5 verified recipients. To send to real clients:

1. In Meta App → WhatsApp → **Phone Numbers** → **Add phone number**
2. Provide your business number (must be on a Business display name)
3. Verify via SMS or voice call
4. Once verified, copy the new **Phone number ID** + update the same field in travelplace

Optional but recommended for non-EN/KA markets: submit **Message Templates** for approval (booking confirmation, payment receipt, etc.) — Meta approval takes a few hours, lets you initiate conversations outside the 24-hour window.

---

## How travelplace uses the integration

**Inbound (client → you):**

- Meta POSTs each message to `/api/webhooks/whatsapp`
- The webhook signature is verified against your App Secret
- Message gets attached to a `whatsapp_thread` keyed by the sender's phone
- If the phone number matches an existing `hotel_contact` or `p_order.client_phone` row, the thread is auto-linked to that entity
- Unread count increments; the thread appears at the top of `/app/whatsapp`

**Outbound (you → client):**

- Send via `/app/whatsapp/[id]` (manual reply box) OR via chat ("WhatsApp Mr. Adamia: ...")
- Message gets queued in the outbox (durable, retry-safe)
- Outbox handler calls `https://graph.facebook.com/v18.0/{phone_number_id}/messages`
- Status updates (sent / delivered / read) come back via webhook → updates the message row in real time

**AI assistant integration:**

- The chatbot has a `send_whatsapp` tool — operators can ask it to draft + send replies
- Permission `whatsapp.send` gates the tool (granted to admin / manager / operator roles by default)
- The assistant respects organization memory: if you've told it "Mr. Adamia prefers Georgian", it'll draft in Georgian

---

## Troubleshooting

**"Configuration → Webhook callback URL verification failed"**

- The verify token in Meta must EXACTLY match what you saved in travelplace. Case-sensitive.
- Travelplace must be reachable publicly (Meta's verification fetch can't see localhost). Test with `curl` first from outside your network.

**"Message Failed: (#131030) Recipient phone number not in allowed list"**

- During the test-number phase, only verified recipients can receive messages.
- Go to WhatsApp → API Setup → **Manage recipient list** → add the recipient number → they confirm via WhatsApp.

**"Message Failed: (#131047) Re-engagement message"**

- You're trying to start a conversation outside the 24-hour window. Either:
  - Get the client to message you first, OR
  - Submit and use a pre-approved Message Template

**"Webhook signature mismatch"**

- App Secret in travelplace doesn't match Meta. Double-check step 6 — App Settings → Basic → App Secret (the "Show" button).

---

## Cost expectations

| Volume / month       | Approximate cost                                                    |
| -------------------- | ------------------------------------------------------------------- |
| < 1000 conversations | Free                                                                |
| 1000-10000           | Free up to 1000, then ~$0.005-0.04/conversation (varies by country) |
| 10000+               | Same per-conversation cost; consider Meta's volume pricing          |

A **conversation** is a 24-hour window of message exchange with one user. Multiple messages in the same window = 1 conversation. Pricing differs by country (Georgia ~ €0.025/conversation, India €0.007, Brazil €0.012, US €0.04).

You can monitor usage in Meta Business Suite → **Billing**. travelplace shows a per-org monthly counter at `/app/integrations/whatsapp` once the integration is live.
