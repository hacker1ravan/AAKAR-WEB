import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export type SessionUser = { id: string; email: string; role: string; name?: string | null; tf?: boolean };

// The logged-in customer or admin, or null
export async function requireUser(): Promise<SessionUser | null> {
  const u = (await getServerSession(authOptions))?.user as any;
  return u?.id ? (u as SessionUser) : null;
}
