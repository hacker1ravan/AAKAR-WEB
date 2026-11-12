import { cache } from "react";
import { prisma } from "./prisma";

// The settings row is created the first time anything asks for it.
export const getSettings = cache(async () => {
  const s = await prisma.siteSettings.findUnique({ where: { id: "main" } });
  if (s) return s;
  try {
    return await prisma.siteSettings.create({ data: { id: "main" } });
  } catch {
    // another request created it at the same moment
    return prisma.siteSettings.findUniqueOrThrow({ where: { id: "main" } });
  }
});
