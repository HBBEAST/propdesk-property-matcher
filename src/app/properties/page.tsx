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
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-slate-900">Properties Inventory ({total})</h1>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-500">
            Loading properties...
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
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
                    <td className="py-3 px-4 font-mono text-xs">#{p.id}</td>
                    <td className="py-3 px-4 font-semibold">{p.title}</td>
                    <td className="py-3 px-4">{p.locality.trim()}</td>
                    <td className="py-3 px-4 capitalize">{p.deal} • {p.type}</td>
                    <td className="py-3 px-4">{p.bhk !== null ? `${p.bhk} BHK` : "—"}</td>
                    <td className="py-3 px-4 font-semibold">{formatIndianPrice(p.price, p.deal)}</td>
                    <td className="py-3 px-4 text-right">
                      <Link href={`/properties/${p.id}`} className="text-xs font-medium text-indigo-600">
                        Matching Requirements →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
