import { getSettings } from "@/lib/settings";
import { pinInfo } from "@/lib/pricing";
import { ok, fail } from "@/lib/api";

export async function GET(req: Request) {
  const pin = new URL(req.url).searchParams.get("pin") ?? "";
  if (!/^[1-9]\d{5}$/.test(pin)) return fail("Enter a valid 6 digit pincode");
  const r = pinInfo(pin, await getSettings());
  return ok({ deliverable: r.deliverable, codAllowed: r.codAllowed });
}
