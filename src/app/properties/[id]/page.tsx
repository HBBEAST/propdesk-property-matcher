"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import {
  PaginatedResponse,
  ReverseMatchItem,
  User,
  apiFetch,
  getStoredUser,
} from "@/lib/api";
import { formatIndianPrice } from "@/lib/format";

export default function PropertyReverseMatchesPage() {
  const params = useParams();
  const router = useRouter();
  const propId = Number(params?.id);

  const [user, setUser] = useState<User | null>(null);
  const [items, setItems] = useState<ReverseMatchItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) {
      router.push("/login");
      return;
    }
    setUser(stored);
    apiFetch<PaginatedResponse<ReverseMatchItem>>(
      `/properties/${propId}/matching-requirements`
    )
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
      })
      .finally(() => setLoading(false));
  }, [propId, router]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
        <Link href="/properties" className="text-sm font-medium text-indigo-600">
          ← Back to Properties
        </Link>
        <h1 className="text-xl font-bold text-slate-900 mt-3 mb-4">
          Reverse Match — Requirements Fitting Property #{propId} ({total})
        </h1>
        {loading ? (
          <p className="text-sm text-slate-500">Loading...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-slate-500">No matching requirements found.</p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.requirement.id} className="bg-white rounded-xl border border-slate-200 p-4 flex justify-between">
                <div>
                  <div className="font-bold">{item.requirement.client_name}</div>
                  <div className="text-xs text-slate-500">
                    Max Budget: {formatIndianPrice(item.requirement.budget_max, item.requirement.deal)}
                  </div>
                </div>
                <div className="text-xs font-bold text-indigo-700">Score: {item.score}</div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
