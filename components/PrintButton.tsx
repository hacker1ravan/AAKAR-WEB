"use client";
export default function PrintButton({ label = "Print" }: { label?: string }) {
  return (
    <button onClick={() => window.print()} className="print:hidden border rounded px-4 py-2">
      {label}
    </button>
  );
}
