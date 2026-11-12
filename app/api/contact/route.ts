import { z } from "zod";
import { sendMail } from "@/lib/mailer";
import { getSettings } from "@/lib/settings";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { ok, fail } from "@/lib/api";

const schema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().email(),
  message: z.string().trim().min(5).max(1000),
  website: z.string().max(0), // spam trap
});

export async function POST(req: Request) {
  if (!(await rateLimit(`contact:${clientIp(req)}`, 5, 3600))) return fail("Too many messages. Try later.", 429);
  const p = schema.safeParse(await req.json().catch(() => null));
  if (!p.success) return fail("Please fill all fields correctly");
  const s = await getSettings();
  const name = p.data.name.replace(/[\r\n]+/g, " ");
  await sendMail(s.contactEmail, `Contact form: ${name}`, [
    `From: ${name} (${p.data.email})`,
    p.data.message,
  ]);
  return ok();
}
