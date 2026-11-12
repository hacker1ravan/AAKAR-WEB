import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import { maybeExpireStaleOrders } from "@/lib/expiry";
import ConsentAnalytics from "@/components/ConsentAnalytics";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  await maybeExpireStaleOrders();
  const session = await getServerSession(authOptions);
  const isAdmin = (session?.user as any)?.role === "admin";

  if (s.maintenanceMode && !isAdmin) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center text-center p-6 gap-4">
        {s.logoUrl && <img src={s.logoUrl} alt={s.siteName} className="h-16" />}
        <h1 className="text-3xl font-bold">{s.siteName}</h1>
        <p className="max-w-md">{s.maintenanceMessage}</p>
      </main>
    );
  }

  return (
    <>
      {s.maintenanceMode && (
        <div className="bg-yellow-400 text-black text-center text-sm p-2">
          Maintenance mode is ON. Only admins can see the store.
        </div>
      )}
      {s.announcement && (
        <div className="text-center text-sm p-2 bg-[var(--primary)] text-[var(--secondary)]">{s.announcement}</div>
      )}
      <Header />
      {children}
      <Footer />
      <WhatsAppButton />
      {s.googleAnalyticsId.trim() && <ConsentAnalytics gaId={s.googleAnalyticsId.trim()} />}
    </>
  );
}
