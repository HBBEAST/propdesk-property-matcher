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
import { useThemePalette } from "@/components/ThemeBanner";

const PAGE_SIZE = 10;

export default function PropertiesPage() {
  const router = useRouter();
  const { showToast } = useThemePalette();
  const [user, setUser] = useState<User | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState("");
  const [locality, setLocality] = useState("");
  const [deal, setDeal] = useState<"sale" | "rent">("sale");
  const [propType, setPropType] = useState<"flat" | "house" | "plot" | "shop">("flat");
  const [bhkInput, setBhkInput] = useState("");
  const [priceInput, setPriceInput] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

  const handleCreateProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setGeneralError(null);
    setSubmitting(true);

    try {
      await apiFetch<Property>("/properties", {
        method: "POST",
        body: JSON.stringify({
          title,
          locality,
          deal,
          type: propType,
          bhk: bhkInput.trim() === "" ? null : bhkInput.trim(),
          price: priceInput.trim() === "" ? null : priceInput.trim(),
        }),
      });
      setShowAddModal(false);
      setTitle("");
      setLocality("");
      setBhkInput("");
      setPriceInput("");
      showToast("Created property successfully");
      loadProperties(offset);
    } catch (err) {
      if (err instanceof ApiError) {
        if (Object.keys(err.fieldErrors).length > 0) {
          setFieldErrors(err.fieldErrors);
        } else {
          setGeneralError(err.message);
        }
      } else {
        setGeneralError("Failed to create property");
      }
    } finally {
      setSubmitting(false);
    }
  };

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
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setFieldErrors({});
                  setGeneralError(null);
                  setShowAddModal(true);
                }}
                className="px-4 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-sm font-semibold shadow-sm transition"
              >
                + Add Property
              </button>
              <Link
                href="/import"
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow transition"
              >
                Import CSV
              </Link>
            </div>
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

        {showAddModal && user?.role === "manager" && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200">
              <h2 className="text-lg font-bold text-slate-900 mb-1">Add New Property</h2>
              <p className="text-xs text-slate-500 mb-4">Manager-only action (`POST /properties`)</p>

              {generalError && (
                <div className="mb-3 p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                  {generalError}
                </div>
              )}

              <form onSubmit={handleCreateProperty} noValidate className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Title *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., 3BHK Flat, Vijay Nagar"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  {fieldErrors.title && (
                    <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.title}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Locality *</label>
                  <input
                    type="text"
                    value={locality}
                    onChange={(e) => setLocality(e.target.value)}
                    placeholder="e.g., Vijay Nagar"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  {fieldErrors.locality && (
                    <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.locality}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Deal *</label>
                    <select
                      value={deal}
                      onChange={(e) => setDeal(e.target.value as "sale" | "rent")}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                    >
                      <option value="sale">Sale</option>
                      <option value="rent">Rent</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Type *</label>
                    <select
                      value={propType}
                      onChange={(e) =>
                        setPropType(e.target.value as "flat" | "house" | "plot" | "shop")
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                    >
                      <option value="flat">Flat</option>
                      <option value="house">House</option>
                      <option value="plot">Plot</option>
                      <option value="shop">Shop</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      BHK (flat/house only)
                    </label>
                    <input
                      type="text"
                      value={bhkInput}
                      onChange={(e) => setBhkInput(e.target.value)}
                      placeholder={propType === "plot" || propType === "shop" ? "Leave empty" : "e.g., 3"}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                    {fieldErrors.bhk && (
                      <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.bhk}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Price (₹) *</label>
                    <input
                      type="text"
                      value={priceInput}
                      onChange={(e) => setPriceInput(e.target.value)}
                      placeholder="e.g., 5000000"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                    {fieldErrors.price && (
                      <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.price}</p>
                    )}
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
                  >
                    {submitting ? "Creating..." : "Create Property"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
