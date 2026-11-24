export type Col<T> = { header: string; render: (row: T) => React.ReactNode };

export function DataTable<T extends { id: string }>({
  rows, cols, actions,
}: {
  rows: T[];
  cols: Col<T>[];
  actions?: (row: T) => React.ReactNode;
}) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {cols.map((c) => <th key={c.header}>{c.header}</th>)}
            {actions && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              {cols.map((c) => <td key={c.header}>{c.render(r)}</td>)}
              {actions && <td className="whitespace-nowrap"><div className="flex flex-wrap items-center gap-1">{actions(r)}</div></td>}
            </tr>
          ))}
          {!rows.length && (
            <tr><td className="p-6 text-center text-[var(--ink-soft)]" colSpan={cols.length + (actions ? 1 : 0)}>Nothing here yet</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
