"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import {
  ApiError,
  PaginatedResponse,
  Requirement,
  User,
  apiFetch,
  getStoredUser,
} from "@/lib/api";

export default function AddRequirementPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [agents, setAgents] = useState<User[]>([]);

  const [clientName, setClientName] = useState("");
  const [phone, setPhone] = useState("");
  const [deal, setDeal] = useState<"sale" | "rent">("sale");
  const [propType, setPropType] = useState<"flat" | "house" | "plot" | "shop">("flat");
  const [localitiesInput, setLocalitiesInput] = useState("");
  const [bhkInput, setBhkInput] = useState("");
  const [budgetInput, setBudgetInput] = useState("");
  const [assignedToInput, setAssignedToInput] = useState<string>("");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) {
      router.push("/login");
      return;
    }
    setUser(stored);
    if (stored.role === "manager") {
      apiFetch<PaginatedResponse<User>>("/users/agents")
        .then((res) => {
          setAgents(res.items);
          if (res.items.length > 0) {
            setAssignedToInput(String(res.items[0].id));
          }
        })
        .catch(() => {});
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setGeneralError(null);
    setSubmitting(true);

    const localities = localitiesInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const payload: Record<string, unknown> = {
      client_name: clientName,
      phone,
      deal,
      type: propType,
      localities,
      bhk: bhkInput.trim() === "" ? null : bhkInput.trim(),
      budget_max: budgetInput.trim() === "" ? null : budgetInput.trim(),
    };

    if (user?.role === "manager") {
      payload.assigned_to = assignedToInput.trim() === "" ? null : Number(assignedToInput);
    }

    try {
      const created = await apiFetch<Requirement>("/requirements", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      router.push(`/requirements/${created.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        if (Object.keys(err.fieldErrors).length > 0) {
          setFieldErrors(err.fieldErrors);
        } else {
          setGeneralError(err.message);
        }
      } else {
        setGeneralError("Failed to create requirement");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} />

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6">
        <div className="mb-4">
          <Link href="/requirements" className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
            ← Back to Requirements
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h1 className="text-xl font-bold text-slate-900 mb-1">Add Client Requirement</h1>
          <p className="text-sm text-slate-500 mb-6">
            Validation errors from the API are displayed next to the corresponding fields.
          </p>

          {generalError && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              {generalError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Client Name *</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                {fieldErrors.client_name && (
                  <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.client_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone (10 digits) *</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                {fieldErrors.phone && (
                  <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.phone}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Deal *</label>
                <select
                  value={deal}
                  onChange={(e) => setDeal(e.target.value as "sale" | "rent")}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                >
                  <option value="sale">Sale</option>
                  <option value="rent">Rent</option>
                </select>
                {fieldErrors.deal && (
                  <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.deal}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Property Type *</label>
                <select
                  value={propType}
                  onChange={(e) => setPropType(e.target.value as "flat" | "house" | "plot" | "shop")}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                >
                  <option value="flat">Flat</option>
                  <option value="house">House</option>
                  <option value="plot">Plot</option>
                  <option value="shop">Shop</option>
                </select>
                {fieldErrors.type && (
                  <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.type}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Localities (comma-separated) *
              </label>
              <input
                type="text"
                value={localitiesInput}
                onChange={(e) => setLocalitiesInput(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              {fieldErrors.localities && (
                <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.localities}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">BHK</label>
                <input
                  type="text"
                  value={bhkInput}
                  onChange={(e) => setBhkInput(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                {fieldErrors.bhk && (
                  <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.bhk}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Max Budget (₹) *</label>
                <input
                  type="text"
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                {fieldErrors.budget_max && (
                  <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.budget_max}</p>
                )}
              </div>
            </div>

            {user?.role === "manager" && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Assign to Agent *</label>
                <select
                  value={assignedToInput}
                  onChange={(e) => setAssignedToInput(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                >
                  <option value="">-- Select Agent --</option>
                  {agents.map((ag) => (
                    <option key={ag.id} value={ag.id}>
                      {ag.name} ({ag.email})
                    </option>
                  ))}
                </select>
                {fieldErrors.assigned_to && (
                  <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.assigned_to}</p>
                )}
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-3">
              <Link
                href="/requirements"
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold"
              >
                {submitting ? "Creating..." : "Create Requirement"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
