import { prisma } from "@/lib/prisma";
import { getInvoice } from "@/lib/invoice";
import { invoicePdf } from "@/lib/invoicePdf";
import { canAccessOrder } from "@/lib/orderAccess";
import { reportError } from "@/lib/monitor";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const t = new URL(req.url).searchParams.get("t");

  const base = await prisma.order.findUnique({ where: { id }, select: { userId: true, accessToken: true } });
  if (!base || !(await canAccessOrder(base, t))) return new Response("Not found", { status: 404 });
  const d = await getInvoice(id);
  if (!d) return new Response("Not found", { status: 404 });

  try {
    const pdf = await invoicePdf(d);
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="invoice-${d.no}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    await reportError(e, `GET /invoice/${id}/pdf`);
    return new Response("Could not create the PDF", { status: 500 });
  }
}
