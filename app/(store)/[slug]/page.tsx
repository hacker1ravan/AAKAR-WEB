import { notFound } from "next/navigation";
import { getPage } from "@/lib/pages";
import { getSettings } from "@/lib/settings";
import ContactForm from "./ContactForm";

type P = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: P) {
  const page = await getPage((await params).slug);
  return page ? { title: page.title } : {};
}

export default async function InfoPage({ params }: P) {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page) notFound();
  const s = await getSettings();

  return (
    <main className="max-w-2xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">{page.title}</h1>
      <p className="whitespace-pre-line text-sm leading-6">{page.content}</p>
      {slug === "contact" && (
        <>
          <div className="border rounded p-3 text-sm space-y-1">
            {s.contactEmail && <p>Email: <a className="underline" href={`mailto:${s.contactEmail}`}>{s.contactEmail}</a></p>}
            {s.contactPhone && <p>Phone: <a className="underline" href={`tel:${s.contactPhone}`}>{s.contactPhone}</a></p>}
            {s.address && <p>Address: {s.address}</p>}
          </div>
          <ContactForm />
        </>
      )}
    </main>
  );
}
