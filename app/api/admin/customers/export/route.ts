import { adminRoute } from "@/lib/api";
import { loadCustomers } from "@/lib/customers";
import { csvResponse } from "@/lib/csv";

export const GET = adminRoute(async () => {
  const list = await loadCustomers();
  const date = (d: Date | null) => (d ? d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) : "");
  return csvResponse("customers.csv", [
    ["Name", "Email", "Phone", "Orders", "Total spent (INR)", "Last order", "Joined"],
    ...list.map((c) => [c.name, c.email, c.phone, c.orders, c.spent / 100, date(c.lastOrder), date(c.joined)]),
  ]);
});
