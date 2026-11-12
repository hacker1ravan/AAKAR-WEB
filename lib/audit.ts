import { prisma } from "./prisma";

type Actor = { id?: string; email?: string | null } | null | undefined;

// Records who did what in the admin panel (and sign-ins and privacy requests). Never breaks the request.
export async function audit(a: { actor?: Actor; action: string; target?: string; details?: string; ip?: string }) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: a.actor?.id ?? "",
        userEmail: a.actor?.email ?? "",
        action: a.action.slice(0, 120),
        target: (a.target ?? "").slice(0, 200),
        details: (a.details ?? "").slice(0, 800),
        ip: (a.ip ?? "").slice(0, 60),
      },
    });
  } catch (e) {
    console.error("audit failed", e);
  }
}

// A short, safe description of a request body: passwords and tokens are never written down.
export function summarize(body: unknown) {
  if (!body || typeof body !== "object") return "";
  const clean = Object.fromEntries(
    Object.entries(body as Record<string, unknown>).map(([k, v]) => [k, /pass|secret|token|code/i.test(k) ? "[hidden]" : v])
  );
  return JSON.stringify(clean).slice(0, 600);
}
