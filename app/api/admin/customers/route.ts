import { adminRoute, ok } from "@/lib/api";
import { loadCustomers } from "@/lib/customers";

export const GET = adminRoute(async () => ok(await loadCustomers()));
