import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = { title: "Page not found" };

// Shown for addresses that do not exist on the site
export default function NotFound() {
  return (
    <>
      <Header />
      <main className="max-w-xl mx-auto p-8 text-center space-y-4">
        <h1 className="text-3xl font-bold">We could not find that page</h1>
        <p>The link may be old, or the product may no longer be available.</p>
        <div className="flex gap-3 justify-center">
          <Link href="/products" className="bg-[var(--primary)] text-[var(--secondary)] rounded px-5 py-2">Browse the shop</Link>
          <Link href="/" className="border rounded px-5 py-2">Home</Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
