"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import {
  ApiError,
  PaginatedResponse,
  Property,
  User,
  apiFetch,
  getStoredUser,
} from "@/lib/api";
import { formatIndianPrice } from "@/lib/format";

const PAGE_SIZE = 10;

export default function PropertiesPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadProperties = useCallback(
    async (currentOffset: number) => {
      setLoading(true);
      try {
        const res = await apiFetch<PaginatedResponse<Property>>(
          `/properties?limit=${PAGE_SIZE}&offset=${currentOffset}`
        );
        setProperties(res.items);
        setTotal(res.total);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          router.push("/login");
        }
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) {
      router.push("/login");
      return;
    }
    setUser(stored);
    loadProperties(offset);
  }, [offset, loadProperties, router]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Properties Inventory ({total})</h1>
            <p className="text-sm text-slate-500">
              Available property listings database in Indore
            </p>
          </div>
          {user?.role === "manager" && (
            <Link
              href="/import"
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow transition"
            >
              Import CSV
            </Link>
          )}
        </div>

        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-500">
            Loading properties...
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                    <th className="py-3 px-4">ID</th>
                    <th className="py-3 px-4">Title</th>
                    <th className="py-3 px-4">Locality</th>
                    <th className="py-3 px-4">Deal / Type</th>
                    <th className="py-3 px-4">BHK</th>
                    <th className="py-3 px-4">Price</th>
                    <th className="py-3 px-4 text-right">Reverse Match</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {properties.map((p) => (
                    <tr key={p.id}>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-500">#{p.id}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">{p.title}</td>
                      <td className="py-3.5 px-4 text-slate-700">{p.locality.trim()}</td>
                      <td className="py-3.5 px-4 capitalize text-slate-700">{p.deal} • {p.type}</td>
                      <td className="py-3.5 px-4 text-slate-700">{p.bhk !== null ? `${p.bhk} BHK` : "—"}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {formatIndianPrice(p.price, p.deal)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/properties/${p.id}`}
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                        >
                          Find Buyers →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {total > PAGE_SIZE && (
              <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                <span>
                  Showing {Math.min(offset + 1, total)}–{Math.min(offset + properties.length, total)} of {total}
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={offset === 0}
                    onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                    className="px-3 py-1 rounded border border-slate-300 bg-white disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    disabled={offset + PAGE_SIZE >= total}
                    onClick={() => setOffset(offset + PAGE_SIZE)}
                    className="px-3 py-1 rounded border border-slate-300 bg-white disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
