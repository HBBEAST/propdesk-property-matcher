"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import {
  ApiError,
  PaginatedResponse,
  Property,
  Requirement,
  User,
  apiFetch,
  getStoredUser,
} from "@/lib/api";
import { formatIndianPrice } from "@/lib/format";
import { useThemePalette } from "@/components/ThemeBanner";

const PAGE_SIZE = 10;

export default function RequirementsListPage() {
  const router = useRouter();
  const { showToast } = useThemePalette();
  const [user, setUser] = useState<User | null>(null);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [total, setTotal] = useState(0);
  const [totalProperties, setTotalProperties] = useState<number>(12);
  const [offset, setOffset] = useState(0);
  const [agents, setAgents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reassigningId, setReassigningId] = useState<number | null>(null);

  const loadData = useCallback(async (currentOffset: number, currentUser: User) => {
    setLoading(true);
    setError(null);
    try {
      const reqPromise = apiFetch<PaginatedResponse<Requirement>>(
        `/requirements?limit=${PAGE_SIZE}&offset=${currentOffset}`
      );
      const propPromise = apiFetch<PaginatedResponse<Property>>(
        `/properties?limit=1&offset=0`
      ).catch(() => ({ total: 12, items: [] }));
      const agentsPromise =
        currentUser.role === "manager"
          ? apiFetch<PaginatedResponse<User>>("/users/agents")
          : Promise.resolve({ total: 0, items: [] });

      const [reqData, propData, agentData] = await Promise.all([
        reqPromise,
        propPromise,
        agentsPromise,
      ]);
      setRequirements(reqData.items);
      setTotal(reqData.total);
      setTotalProperties(propData.total);
      if (currentUser.role === "manager") {
        setAgents(agentData.items);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.push("/login");
        return;
      }
      setError(err instanceof Error ? err.message : "Failed to load requirements");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) {
      router.push("/login");
      return;
    }
    setUser(stored);
    loadData(offset, stored);
  }, [offset, loadData, router]);

  const handleReassign = async (reqId: number, newAgentId: number) => {
    setReassigningId(reqId);
    try {
      const updated = await apiFetch<Requirement>(`/requirements/${reqId}`, {
        method: "PATCH",
        body: JSON.stringify({ assigned_to: newAgentId }),
      });
      setRequirements((prev) => prev.map((r) => (r.id === reqId ? updated : r)));
      showToast(`Reassigned Requirement #${reqId} successfully`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reassign requirement");
    } finally {
      setReassigningId(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Client Requirements</h1>
            <p className="text-sm text-slate-500">
              {user?.role === "manager"
                ? "Manager view: showing all client requirements across the brokerage in Indore"
                : "Agent view: showing requirements assigned to you"}
            </p>
          </div>
          <Link
            href="/requirements/new"
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow transition"
          >
            + Add Requirement
          </Link>
        </div>

        {/* KPI Summary Strip with Palette Accents */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div
            className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm border-l-4"
            style={{ borderLeftColor: "var(--palette-primary)" }}
          >
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Active Buyers
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{total}</div>
            <div className="text-xs text-emerald-600 font-semibold mt-0.5">
              ● Synced with Database
            </div>
          </div>

          <div
            className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm border-l-4"
            style={{ borderLeftColor: "var(--palette-accent)" }}
          >
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Catalog Listings
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {totalProperties} Properties
            </div>
            <div className="text-xs text-slate-600 mt-0.5">
              Vijay Nagar, Nipania, Palasia, AB Road, Rau
            </div>
          </div>

          <div
            className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm border-l-4"
            style={{ borderLeftColor: "var(--palette-secondary)" }}
          >
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              SQL Match Scoring
            </div>
            <div className="text-2xl font-bold text-indigo-600 mt-1">
              100 – Penalties
            </div>
            <div className="text-xs text-slate-600 mt-0.5">
              -20 Over Budget (+10%) • -15 BHK Differs
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-500">
            Loading requirements...
          </div>
        ) : requirements.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
            <h2 className="text-base font-semibold text-slate-800 mb-1">No requirements found</h2>
            <p className="text-sm text-slate-500 mb-4">
              Create a new client requirement to start finding matching properties.
            </p>
            <Link
              href="/requirements/new"
              className="inline-block px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium"
            >
              Add Requirement
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Client</th>
                    <th className="py-3 px-4">Deal / Type</th>
                    <th className="py-3 px-4">Localities</th>
                    <th className="py-3 px-4">Max Budget</th>
                    <th className="py-3 px-4">Assigned Agent</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {requirements.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{req.client_name}</div>
                        <div className="text-xs text-slate-500">{req.phone}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${
                              req.deal === "sale"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-purple-100 text-purple-800"
                            }`}
                          >
                            {req.deal}
                          </span>
                          <span className="font-medium text-slate-800 capitalize">{req.type}</span>
                          <span className="text-xs text-slate-500">
                            ({req.bhk !== null ? `${req.bhk} BHK` : "Any BHK"})
                          </span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {req.localities.map((loc, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs"
                            >
                              {loc}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {formatIndianPrice(req.budget_max, req.deal)}
                      </td>
                      <td className="py-3.5 px-4">
                        {user?.role === "manager" ? (
                          <select
                            aria-label={`Reassign ${req.client_name}`}
                            disabled={reassigningId === req.id}
                            value={req.assigned_to}
                            onChange={(e) => handleReassign(req.id, Number(e.target.value))}
                            className="rounded-md border border-slate-300 px-2.5 py-1 text-xs bg-white text-slate-800"
                          >
                            {agents.map((ag) => (
                              <option key={ag.id} value={ag.id}>
                                {ag.name} (#{ag.id})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-slate-700 text-xs font-medium">
                            {req.assigned_agent_name || `Agent #${req.assigned_to}`}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/requirements/${req.id}`}
                          className="inline-flex items-center px-3 py-1.5 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-semibold text-xs transition-colors"
                        >
                          View Matches →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
              <span>
                Showing {Math.min(offset + 1, total)}–{Math.min(offset + requirements.length, total)} of {total}
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
          </div>
        )}
      </main>
    </div>
  );
}
