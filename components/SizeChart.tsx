export default function SizeChart({ text }: { text: string }) {
  const rows = text
    .split("\n")
    .map((l) => l.split("|").map((c) => c.trim()))
    .filter((r) => r.some(Boolean));
  if (rows.length < 2) return null;
  const [head, ...body] = rows;

  return (
    <details className="surface p-3 text-sm">
      <summary className="cursor-pointer font-medium text-[var(--ink)] select-none">Size chart</summary>
      <div className="table-wrap mt-3">
        <table className="table">
          <thead>
            <tr>{head.map((h, i) => <th key={i}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {body.map((r, i) => (
              <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
