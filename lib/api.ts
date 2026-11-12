import { NextResponse } from "next/server";
import type { ZodType } from "zod";
import { requireAdmin } from "./requireAdmin";
import { audit, summarize } from "./audit";
import { clientIp } from "./rateLimit";
import { reportError } from "./monitor";

export const ok = (data: unknown = { success: true }, status = 200) =>
  NextResponse.json(data, { status });
export const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

// Next.js 15 passes route params as a Promise; the type must match exactly for the build to pass
type Ctx = { params: Promise<Record<string, string>> };

// Wraps an admin-only API route: admin check + optional body validation + error handling.
// Every change an admin makes (and every data export) is written to the activity log.
export function adminRoute<T = any>(
  handler: (
    req: Request,
    c: { params: Record<string, string>; body: T }
  ) => Promise<Response>,
  schema?: ZodType<T, any, any>
) {
  return async (req: Request, ctx: Ctx) => {
    const session = await requireAdmin();
    if (!session) return fail("Forbidden", 403);
    let body = undefined as T;
    if (schema) {
      const p = schema.safeParse(await req.json().catch(() => null));
      if (!p.success) {
        const i = p.error.issues[0];
        return fail(`${i.path.join(".") || "request"}: ${i.message}`);
      }
      body = p.data;
    }
    try {
      const res = await handler(req, { params: (await ctx?.params) ?? {}, body });
      const path = new URL(req.url).pathname;
      if ((req.method !== "GET" || path.includes("/export")) && res.status < 400)
        await audit({
          actor: session.user as any,
          action: `${req.method} ${path}`,
          details: summarize(body),
          ip: clientIp(req),
        });
      return res;
    } catch (e) {
      await reportError(e, `${req.method} ${new URL(req.url).pathname}`);
      return fail("Server error", 500);
    }
  };
}
