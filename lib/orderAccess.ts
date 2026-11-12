import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { sameToken } from "./token";

// An order can be opened by its owner, by an admin, or by anyone holding its private link (guest orders).
export async function canAccessOrder(
  order: { userId: string; accessToken: string },
  token?: string | null
) {
  if (token && sameToken(token, order.accessToken)) return true;
  const user = (await getServerSession(authOptions))?.user as any;
  return !!user && (user.id === order.userId || user.role === "admin");
}
