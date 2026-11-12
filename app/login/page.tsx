import LoginForm from "./LoginForm";
import { safeNext } from "@/lib/safeNext";

export const metadata = { title: "Login", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; verified?: string }> }) {
  const sp = await searchParams;
  return <LoginForm next={safeNext(sp.next)} verified={sp.verified === "1"} />;
}
