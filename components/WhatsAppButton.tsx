import { getSettings } from "@/lib/settings";

export default async function WhatsAppButton() {
  const s = await getSettings();
  if (!s.whatsappNumber) return null;
  const text = encodeURIComponent(`Hi ${s.siteName}, I need help with an order.`);
  return (
    <a
      href={`https://wa.me/${s.whatsappNumber}?text=${text}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-4 right-4 z-20 bg-green-500 text-white rounded-full px-4 py-3 text-sm shadow-lg"
    >
      WhatsApp
    </a>
  );
}
