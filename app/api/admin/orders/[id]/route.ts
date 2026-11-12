import { z } from "zod";
import { adminRoute, ok, fail } from "@/lib/api";
import { setOrderStatus, OrderError, STATUSES } from "@/lib/orders";
import { getSettings } from "@/lib/settings";
import { trackingLink } from "@/lib/couriers";

const schema = z
  .object({
    status: z.enum(STATUSES),
    note: z.string().max(300),
    courier: z.string().trim().max(60),
    trackingNumber: z.string().trim().max(60),
    trackingUrl: z.string().trim().max(500).refine((v) => v === "" || /^https?:\/\//.test(v), "The tracking link must start with http:// or https://"),
    notify: z.boolean(),
  })
  .refine((d) => d.status !== "shipped" || !!d.trackingNumber, {
    path: ["trackingNumber"],
    message: "required when shipped",
  });

export const PUT = adminRoute(async (_, { params, body }) => {
  // Build the customer's tracking link from the courier's link in Settings, unless one was typed in
  let trackingUrl = body.trackingUrl;
  if (!trackingUrl && body.trackingNumber) trackingUrl = trackingLink((await getSettings()).couriers, body.courier, body.trackingNumber);

  try {
    return ok(await setOrderStatus(params.id, body.status, { ...body, trackingUrl }));
  } catch (e) {
    if (e instanceof OrderError) return fail(e.message, 409);
    throw e;
  }
}, schema);
