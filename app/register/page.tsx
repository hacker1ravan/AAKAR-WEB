import RegisterForm from "./RegisterForm";

export const metadata = { title: "Create account", robots: { index: false } };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const sp = await searchParams;
  return <RegisterForm initialEmail={typeof sp.email === "string" ? sp.email.slice(0, 120) : ""} />;
}
