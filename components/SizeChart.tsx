export default function SizeChart({ text }: { text: string }) {
  const rows = text
    .split("\n")
    .map((l) => l.split("|").map((c) => c.trim()))
    .filter((r) => r.some(Boolean));
  if (rows.length < 2) return null;
  const [head, ...body] = rows;

  return (
    <details className="border rounded p-3 text-sm">
      <summary className="cursor-pointer font-medium">Size chart</summary>
      <div className="overflow-x-auto mt-2">
        <table className="w-full text-left border">
          <thead className="bg-gray-100">
            <tr>{head.map((h, i) => <th key={i} className="p-2">{h}</th>)}</tr>
          </thead>
          <tbody>
            {body.map((r, i) => (
              <tr key={i} className="border-t">{r.map((c, j) => <td key={j} className="p-2">{c}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
