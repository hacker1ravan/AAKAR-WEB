"use client";
export default function PrintButton() {
  return (
    <button onClick={() => window.print()} className="print:hidden border rounded px-4 py-2">
      Print / Save as PDF
    </button>
  );
}
