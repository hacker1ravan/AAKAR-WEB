import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

// Any logged-in admin (used by the two-factor setup pages themselves)
export async function requireAdminAny() {
  const session = await getServerSession(authOptions);
  return (session?.user as any)?.role === "admin" ? session : null;
}

// An admin who is allowed to use the panel. If ADMIN_REQUIRE_2FA=1, that means two-factor login is switched on.
export async function requireAdmin() {
  const session = await requireAdminAny();
  if (!session) return null;
  if (process.env.ADMIN_REQUIRE_2FA === "1" && !(session.user as any).tf) return null;
  return session;
}
