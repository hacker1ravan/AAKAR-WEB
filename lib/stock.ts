import { prisma } from "./prisma";
import { sendMail } from "./mailer";
import { getSettings } from "./settings";

export async function alertLowStock(variantIds: string[]) {
  if (!variantIds.length) return;
  const s = await getSettings();
  const vs = await prisma.variant.findMany({
    where: { id: { in: variantIds } },
    include: { product: { select: { name: true, category: true } } },
  });
  await sendMail(
    s.contactEmail,
    `Low stock alert (${vs.length} item${vs.length > 1 ? "s" : ""})`,
    vs.map((v) => `${v.product.category} · ${v.product.name} (${v.color}, ${v.size}): ${v.stock} left`),
    { text: "View low stock", url: `${s.siteUrl}/admin/low-stock` }
  );
}
