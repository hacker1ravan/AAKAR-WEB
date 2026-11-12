import crypto from "crypto";
import { rateLimit } from "./rateLimit";
import { sendMail } from "./mailer";
import { getSettings } from "./settings";

// Logs an unexpected error and tells you about it. The same error alerts you at most once every 30 minutes.
// Set ALERT_WEBHOOK_URL (Slack, Discord or Google Chat) to get alerts there instead of by email.
export async function reportError(err: unknown, where: string) {
  try {
    const e = err instanceof Error ? err : new Error(String(err));
    console.error(`[error] ${where}:`, e);

    const key = "alert:" + crypto.createHash("sha1").update(where + e.message).digest("hex").slice(0, 16);
    if (!(await rateLimit(key, 1, 1800))) return;

    const text = [`Store error at ${where}`, e.message, ...(e.stack ?? "").split("\n").slice(1, 6)].join("\n");
    const hook = process.env.ALERT_WEBHOOK_URL;
    if (hook) {
      await fetch(hook, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, content: text.slice(0, 1900) }),
      }).catch(() => {});
    } else {
      const s = await getSettings();
      await sendMail(s.contactEmail, "Store error alert", text.split("\n"));
    }
  } catch {
    // monitoring must never break the request
  }
}
