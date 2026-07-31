"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  /** Renders the cell; defaults to the row property named by `key`. */
  render?: (row: T) => React.ReactNode;
  className?: string;
}

export interface DataTableProps<T> {
  columns: Array<DataTableColumn<T>>;
  rows: T[];
  /** Enables the search box; matches against these row properties. */
  searchKeys?: Array<keyof T>;
  searchPlaceholder?: string;
  emptyMessage?: string;
  /** Extra toolbar content (filter selects, add buttons…). */
  toolbar?: React.ReactNode;
  onRowClick?: (row: T) => void;
}

/** Searchable table for records: bookings, customers, orders, inventory…
 *  Client-side and dependency-free — pass rows from state or a server page. */
export function DataTable<T extends Record<string, unknown>>({
  columns,
  rows,
  searchKeys,
  searchPlaceholder = "Search…",
  emptyMessage = "Nothing here yet.",
  toolbar,
  onRowClick,
}: DataTableProps<T>) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    if (!query.trim() || !searchKeys?.length) return rows;
    const q = query.toLowerCase();
    return rows.filter((r) =>
      searchKeys.some((k) => String(r[k] ?? "").toLowerCase().includes(q)),
    );
  }, [rows, query, searchKeys]);

  return (
    <div>
      {(searchKeys?.length || toolbar) && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {searchKeys?.length ? (
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-64 pl-8"
              />
            </div>
          ) : null}
          {toolbar}
        </div>
      )}
      <Card className="overflow-hidden border-border py-0">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) => (
                <TableHead key={c.key} className={c.className}>
                  {c.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row, i) => (
                <TableRow
                  key={i}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={onRowClick ? "cursor-pointer" : undefined}
                >
                  {columns.map((c) => (
                    <TableCell key={c.key} className={c.className}>
                      {c.render ? c.render(row) : String(row[c.key] ?? "")}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
