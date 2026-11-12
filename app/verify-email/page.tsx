import VerifyClient from "./VerifyClient";

export const metadata = { title: "Confirm your email", robots: { index: false } };

export default async function VerifyEmail({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <VerifyClient token={token ?? ""} />;
}
