import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/requireUser";
import ProfileForm from "./ProfileForm";
import PasswordForm from "./PasswordForm";
import AddressBook from "./AddressBook";
import PrivacyForm from "./PrivacyForm";

export const metadata = { title: "My account", robots: { index: false } };

export default async function Account() {
  const user = await requireUser();
  if (!user) redirect("/login?next=/account");

  const [row, addresses] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id }, select: { name: true, email: true } }),
    prisma.address.findMany({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] }),
  ]);
  if (!row) redirect("/login");

  return (
    <main className="max-w-xl mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My account</h1>
        <p className="text-sm">{row.email} · <Link href="/orders" className="underline">My orders</Link></p>
      </div>
      <ProfileForm name={row.name ?? ""} />
      <PasswordForm />
      <AddressBook
        initial={addresses.map(({ id, label, name, phone, pincode, state, address, isDefault }) => ({
          id, label, name, phone, pincode, state, address, isDefault,
        }))}
      />
      <PrivacyForm />
    </main>
  );
}
