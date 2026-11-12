import { getSettings } from "@/lib/settings";

export const metadata = { title: "Return Policy" };

export default async function ReturnPolicy() {
  const s = await getSettings();
  return (
    <main className="max-w-xl mx-auto p-4 space-y-3">
      <h1 className="text-2xl font-bold">Return Policy</h1>
      <p className="font-medium">Returns accepted within {s.returnWindowDays} days of delivery.</p>
      <p className="whitespace-pre-line">{s.returnPolicy}</p>
    </main>
  );
}
