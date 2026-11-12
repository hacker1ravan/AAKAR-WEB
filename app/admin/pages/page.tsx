import Link from "next/link";
import { PAGE_TITLES } from "@/lib/pages";
import { DataTable } from "@/components/admin/DataTable";

export default function AdminPages() {
  const rows = Object.entries(PAGE_TITLES).map(([slug, title]) => ({ id: slug, title }));
  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold">Pages</h1>
      <DataTable
        rows={rows}
        cols={[
          { header: "Page", render: (r) => r.title },
          { header: "Link", render: (r) => `/${r.id}` },
        ]}
        actions={(r) => <Link href={`/admin/pages/${r.id}`} className="underline">Edit</Link>}
      />
      <p className="text-sm">The Return Policy is edited in Settings.</p>
    </div>
  );
}
