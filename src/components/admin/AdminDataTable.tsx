import { useMemo, useState, type ReactNode } from "react";
import { Search, X } from "lucide-react";

import { SelectMenu } from "../ui/SelectMenu";

export type AdminColumn<T> = {
  header: string;
  render: (row: T) => ReactNode;
};

export type AdminTableFilter<T> = {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
  valueForRow: (row: T) => string | string[];
};

export function AdminDataTable<T>({
  title,
  description,
  rows,
  getKey,
  getSearchText,
  columns,
  emptyMessage,
  filters = [],
}: {
  title: string;
  description?: string;
  rows: T[];
  getKey: (row: T) => string;
  getSearchText: (row: T) => string;
  columns: AdminColumn<T>[];
  emptyMessage: string;
  filters?: AdminTableFilter<T>[];
}) {
  const [search, setSearch] = useState("");
  const visibleRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesSearch =
        !query || getSearchText(row).toLowerCase().includes(query);
      const matchesFilters = filters.every((filter) => {
        if (filter.value === "all") return true;
        const values = filter.valueForRow(row);
        return Array.isArray(values)
          ? values.includes(filter.value)
          : values === filter.value;
      });
      return matchesSearch && matchesFilters;
    });
  }, [filters, getSearchText, rows, search]);

  return (
    <section className="min-w-0 w-full max-w-full overflow-hidden rounded-2xl border border-cream-100 bg-white shadow-sm">
      <div className="flex min-w-0 flex-col gap-4 border-b border-cream-100 p-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
          {description && (
            <p className="mt-1 text-sm text-slate-600">{description}</p>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end">
          {filters.map((filter) => (
            <label
              key={filter.label}
              className="text-xs font-medium text-slate-600"
            >
              {filter.label}
              <SelectMenu
                value={filter.value}
                onChange={filter.onChange}
                options={filter.options}
                ariaLabel={filter.label}
                placeholder={filter.options[0]?.label ?? filter.label}
                size="md"
                className="mt-1 w-full sm:min-w-36"
              />
            </label>
          ))}
          <label className="text-xs font-medium text-slate-600">
            Search {title.toLowerCase()}
            <span className="relative mt-1 block">
              <Search
                size={16}
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={`Search ${title.toLowerCase()}`}
                className="min-h-11 w-full rounded-lg border border-cream-100 bg-white pl-9 pr-10 text-sm text-ink outline-none focus:ring-2 focus:ring-teal-600 sm:w-64"
              />
              {search && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-slate-600 hover:bg-cream-50 focus:outline-none focus:ring-2 focus:ring-teal-600"
                >
                  <X size={16} aria-hidden="true" />
                </button>
              )}
            </span>
          </label>
          {(search || filters.some((filter) => filter.value !== "all")) && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                filters.forEach((filter) => filter.onChange("all"));
              }}
              className="min-h-11 rounded-lg px-3 text-sm font-medium text-teal-700 hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-teal-600"
            >
              Reset filters
            </button>
          )}
        </div>
      </div>
      {visibleRows.length === 0 ? (
        <p
          className="px-5 py-12 text-center text-sm text-slate-600"
          role="status"
        >
          {rows.length === 0 ? emptyMessage : "No records match your filters."}
        </p>
      ) : (
        <div className="w-full max-w-full overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-left text-sm">
            <thead className="bg-[#F7F8F7] text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.header}
                    scope="col"
                    className="px-5 py-3 font-semibold"
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleRows.map((row) => (
                <tr key={getKey(row)} className="bg-white">
                  {columns.map((column) => (
                    <td key={column.header} className="px-5 py-4 align-middle">
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p
        className="border-t border-cream-100 px-5 py-3 text-xs text-slate-600"
        role="status"
      >
        Showing {visibleRows.length} of {rows.length} records
      </p>
    </section>
  );
}
