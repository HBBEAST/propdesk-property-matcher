"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import {
  ApiError,
  MatchItem,
  PaginatedResponse,
  Requirement,
  User,
  apiFetch,
  getStoredUser,
} from "@/lib/api";
import { formatIndianPrice } from "@/lib/format";
import { useThemePalette } from "@/components/ThemeBanner";

const PAGE_SIZE = 10;

export default function RequirementDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useThemePalette();
  const reqId = Number(params?.id);

  const [user, setUser] = useState<User | null>(null);
  const [requirement, setRequirement] = useState<Requirement | null>(null);
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [rejectingPropertyId, setRejectingPropertyId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectFieldError, setRejectFieldError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const loadRequirementAndMatches = useCallback(
    async (currentOffset: number) => {
      if (!reqId || Number.isNaN(reqId)) return;
      setLoading(true);
      setError(null);
      try {
        const [reqData, matchesData] = await Promise.all([
          apiFetch<Requirement>(`/requirements/${reqId}`),
          apiFetch<PaginatedResponse<MatchItem>>(
            `/requirements/${reqId}/matches?limit=${PAGE_SIZE}&offset=${currentOffset}`
          ),
        ]);
        setRequirement(reqData);
        setMatches(matchesData.items);
        setTotal(matchesData.total);
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.status === 401) {
            router.push("/login");
            return;
          }
          if (err.status === 404) {
            setNotFound(true);
            return;
          }
        }
        setError(err instanceof Error ? err.message : "Failed to load requirement matches");
      } finally {
        setLoading(false);
      }
    },
    [reqId, router]
  );

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) {
      router.push("/login");
      return;
    }
    setUser(stored);
    loadRequirementAndMatches(offset);
  }, [offset, loadRequirementAndMatches, router]);

  const handleMarkShared = async (propertyId: number) => {
    setActionLoadingId(propertyId);
    setError(null);
    try {
      await apiFetch(`/requirements/${reqId}/matches/${propertyId}`, {
        method: "PUT",
        body: JSON.stringify({ status: "shared" }),
      });
      showToast(`Marked Property #${propertyId} as Shared with Client`);
      await loadRequirementAndMatches(offset);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark match as shared");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rejectingPropertyId === null) return;
    setRejectFieldError(null);
    setActionLoadingId(rejectingPropertyId);

    try {
      await apiFetch(`/requirements/${reqId}/matches/${rejectingPropertyId}`, {
        method: "PUT",
        body: JSON.stringify({
          status: "rejected",
          reason: rejectReason,
        }),
      });
      showToast(`Rejected Property #${rejectingPropertyId} from matches`);
      setRejectingPropertyId(null);
      setRejectReason("");
      await loadRequirementAndMatches(offset);
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors.reason) {
        setRejectFieldError(err.fieldErrors.reason);
      } else {
        setRejectFieldError(err instanceof Error ? err.message : "Reason is required");
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <Link href="/requirements" className="text-sm font-semibold text-indigo-600 hover:text-indigo-800">
            ← Back to Requirements
          </Link>
          <button
            type="button"
            onClick={() => {
              showToast("Opening print view (@media print hides navbar & controls cleanly)");
              if (typeof window !== "undefined") window.print();
            }}
            className="no-print px-3.5 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition"
          >
            🖨️ Print Client Match Sheet
          </button>
        </div>

        {notFound ? (
          <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
            <h1 className="text-lg font-bold text-slate-900 mb-1">404 — Requirement Not Found</h1>
            <p className="text-sm text-slate-500 mb-4">
              This requirement does not exist or is not assigned to your account.
            </p>
            <Link
              href="/requirements"
              className="inline-block px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium"
            >
              Return to Requirements
            </Link>
          </div>
        ) : loading && !requirement ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-500">
            Loading requirement details and database matches...
          </div>
        ) : (
          requirement && (
            <>
              <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2.5 mb-1">
                      <h1 className="text-xl font-bold text-slate-900">{requirement.client_name}</h1>
                      <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 text-xs font-semibold">
                        Req #{requirement.id}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500">
                      Phone: <strong className="text-slate-700">{requirement.phone}</strong> • Assigned to:{" "}
                      <strong className="text-slate-700">
                        {requirement.assigned_agent_name || `Agent #${requirement.assigned_to}`}
                      </strong>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <div className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-xs text-slate-500 block">Deal &amp; Type</span>
                      <span className="font-semibold text-slate-900 capitalize">
                        {requirement.deal} • {requirement.type}{" "}
                        {requirement.bhk !== null ? `(${requirement.bhk} BHK)` : "(Any BHK)"}
                      </span>
                    </div>
                    <div className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-xs text-slate-500 block">Max Budget</span>
                      <span className="font-semibold text-indigo-600">
                        {formatIndianPrice(requirement.budget_max, requirement.deal)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium text-slate-500">Preferred Localities:</span>
                  {requirement.localities.map((loc, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-200"
                    >
                      {loc}
                    </span>
                  ))}
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-slate-900">Matching Properties ({total})</h2>
                <span className="text-xs text-slate-500">
                  Sorted by score (highest first), then price (lowest first)
                </span>
              </div>

              {matches.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-10 text-center shadow-sm">
                  <div className="text-base font-semibold text-slate-800 mb-1">
                    No matching properties found for this requirement
                  </div>
                  <p className="text-sm text-slate-500 max-w-md mx-auto">
                    No un-rejected properties in inventory currently match{" "}
                    <strong className="capitalize">{requirement.deal}</strong>{" "}
                    <strong className="capitalize">{requirement.type}</strong> in{" "}
                    <strong>{requirement.localities.join(", ")}</strong> within 110% of{" "}
                    <strong>{formatIndianPrice(requirement.budget_max, requirement.deal)}</strong>.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {matches.map((m) => (
                    <div
                      key={m.property.id}
                      className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              m.score >= 85
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            Score: {m.score}%
                          </span>
                          <span className="font-bold text-slate-900 text-base">{m.property.title}</span>
                          <span className="text-xs text-slate-400">(Property #{m.property.id})</span>
                          {m.status === "shared" && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
                              ✓ Shared with Client
                            </span>
                          )}
                        </div>

                        <div className="text-sm text-slate-600 flex flex-wrap items-center gap-x-4 gap-y-1">
                          <span>
                            Locality: <strong className="text-slate-800">{m.property.locality.trim()}</strong>
                          </span>
                          <span className="capitalize">
                            Type: <strong className="text-slate-800">{m.property.type}</strong>
                          </span>
                          {m.property.bhk !== null && (
                            <span>
                              BHK: <strong className="text-slate-800">{m.property.bhk} BHK</strong>
                            </span>
                          )}
                          <span>
                            Price:{" "}
                            <strong className="text-slate-900">
                              {formatIndianPrice(m.property.price, m.property.deal)}
                            </strong>
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          {m.flags.length === 0 ? (
                            <span className="text-xs text-emerald-600 font-semibold">
                              ✓ Perfect Match (No penalties)
                            </span>
                          ) : (
                            m.flags.map((flag) => (
                              <span
                                key={flag}
                                className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-xs font-mono"
                              >
                                {flag}
                              </span>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={actionLoadingId === m.property.id || m.status === "shared"}
                          onClick={() => handleMarkShared(m.property.id)}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            m.status === "shared"
                              ? "bg-emerald-100 text-emerald-800 cursor-default"
                              : "bg-indigo-600 hover:bg-indigo-700 text-white"
                          }`}
                        >
                          {m.status === "shared" ? "Shared" : "Mark Shared"}
                        </button>

                        <button
                          type="button"
                          disabled={actionLoadingId === m.property.id}
                          onClick={() => {
                            setRejectingPropertyId(m.property.id);
                            setRejectReason("");
                            setRejectFieldError(null);
                          }}
                          className="px-3.5 py-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )
        )}

        {rejectingPropertyId !== null && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-lg border border-slate-200">
              <h3 className="text-base font-bold text-slate-900 mb-1">
                Reject Match (Property #{rejectingPropertyId})
              </h3>
              <form onSubmit={handleConfirmReject} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Rejection Reason *
                  </label>
                  <textarea
                    rows={3}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="e.g., Client wants east-facing flat only"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  {rejectFieldError && (
                    <p className="mt-1 text-xs text-red-600 font-medium">{rejectFieldError}</p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setRejectingPropertyId(null)}
                    className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoadingId === rejectingPropertyId}
                    className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
                  >
                    Confirm Reject
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
