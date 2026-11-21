"use client";
export default function PrintButton() {
  return (
    <button onClick={() => window.print()} className="btn btn-outline print:hidden">
      Print / Save as PDF
    </button>
  );
}
