export type Col<T> = { header: string; render: (row: T) => React.ReactNode };

export function DataTable<T extends { id: string }>({
  rows, cols, actions,
}: {
  rows: T[];
  cols: Col<T>[];
  actions?: (row: T) => React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border">
        <thead className="bg-gray-100 text-left">
          <tr>
            {cols.map((c) => <th key={c.header} className="p-2">{c.header}</th>)}
            {actions && <th className="p-2">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t">
              {cols.map((c) => <td key={c.header} className="p-2 align-top">{c.render(r)}</td>)}
              {actions && <td className="p-2 space-x-2 whitespace-nowrap align-top">{actions(r)}</td>}
            </tr>
          ))}
          {!rows.length && (
            <tr><td className="p-4 text-center" colSpan={cols.length + (actions ? 1 : 0)}>Nothing here yet</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
