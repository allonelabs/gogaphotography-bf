/**
 * Outbox handler registry — side-effect imports register each known kind
 * with the drain. The drain `import("./handlers")` lazily on first
 * `drainOutbox()` call so adding a new handler is just adding a line
 * here.
 *
 * Unknown kinds (not registered here) are still drained: the drain marks
 * them `sent` with `last_error = "no_handler_registered:<kind>"`. This
 * keeps the queue draining even when an action is added before its
 * handler ships.
 */
import "server-only";

import { registerHandler } from "./drain";
import { handleEmailSend } from "@/app/lib/email/handler";

registerHandler("email.send", handleEmailSend);

// Future:
//   registerHandler("stripe.charge", handleStripeCharge);
//   registerHandler("webhook.outbound", handleOutboundWebhook);
//   registerHandler("whatsapp.message", handleWhatsAppMessage);
