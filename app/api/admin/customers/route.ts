import { adminRoute, ok } from "@/lib/api";
import { loadCustomers } from "@/lib/customers";

const PAGE_SIZE = 25;

// Customers with order stats. Filters: ?q= (name/email/phone) &sort=new|spent|orders &page=
// loadCustomers() aggregates every customer (also used by the CSV export); we filter, sort
// and slice here so the browser only receives one page.
export const GET = adminRoute(async (req) => {
  const sp = new URL(req.url).searchParams;
  const term = (sp.get("q") ?? "").trim().toLowerCase();
  const sort = sp.get("sort") ?? "new";

  let rows = await loadCustomers();
  if (term) rows = rows.filter((c: any) => `${c.name} ${c.email} ${c.phone}`.toLowerCase().includes(term));
  if (sort === "spent") rows = [...rows].sort((a: any, b: any) => b.spent - a.spent);
  else if (sort === "orders") rows = [...rows].sort((a: any, b: any) => b.orders - a.orders);
  // "new" keeps loadCustomers' newest-first order

  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(1, Math.floor(Number(sp.get("page"))) || 1), pages);
  const customers = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  return ok({ customers, total, page, pages });
});
