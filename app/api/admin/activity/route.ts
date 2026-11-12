import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { adminRoute, ok } from "@/lib/api";

const PAGE_SIZE = 50;

// Who did what, newest first. ?q= searches the person, action, target and details. ?page=
export const GET = adminRoute(async (req) => {
  const q = new URL(req.url).searchParams;
  const term = (q.get("q") ?? "").trim().slice(0, 60);
  const where: Prisma.AuditLogWhereInput = term
    ? {
        OR: [
          { userEmail: { contains: term, mode: "insensitive" } },
          { action: { contains: term, mode: "insensitive" } },
          { target: { contains: term, mode: "insensitive" } },
          { details: { contains: term, mode: "insensitive" } },
        ],
      }
    : {};
  const total = await prisma.auditLog.count({ where });
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(1, Math.floor(Number(q.get("page"))) || 1), pages);
  const rows = await prisma.auditLog.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });
  return ok({ rows, total, page, pages });
});
