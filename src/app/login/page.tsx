"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, User, apiFetch, saveAuthSession } from "@/lib/api";
import { PaletteSwatchStrip, useThemePalette } from "@/components/ThemeBanner";

interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export default function LoginPage() {
  const router = useRouter();
  const { showToast } = useThemePalette();
  const [email, setEmail] = useState("neha@example.com");
  const [password, setPassword] = useState("Neha@PropDesk2026");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      saveAuthSession(res.access_token, res.user);
      showToast(`Signed in as ${res.user.name} (${res.user.role})`);
      router.push("/requirements");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Unable to sign in. Please verify your credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  const fillDemoUser = (demoEmail: string, demoPwd: string, label: string) => {
    setEmail(demoEmail);
    setPassword(demoPwd);
    setError(null);
    showToast(`Filled ${label} credentials`);
  };

  return (
    <div className="flex-1 flex flex-col">
      <PaletteSwatchStrip />

      <div className="flex-1 flex flex-col justify-center items-center px-4 py-10">
        <div className="login-card w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8">
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold mb-3 border border-indigo-200">
              🏢 PropDesk CRM
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">Sign In</h1>
            <p className="text-sm text-slate-600">
              Access PropDesk Property Matcher (Indore)
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold text-sm transition shadow"
            >
              {loading ? "Signing in..." : "Sign In to Dashboard"}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Quick Demo Accounts (Seed Data)
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() =>
                  fillDemoUser("neha@example.com", "Neha@PropDesk2026", "Manager (Neha)")
                }
                className="px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium transition text-center"
              >
                Neha (Manager)
              </button>
              <button
                type="button"
                onClick={() =>
                  fillDemoUser("ravi@example.com", "Ravi@PropDesk2026", "Agent (Ravi)")
                }
                className="px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium transition text-center"
              >
                Ravi (Agent #2)
              </button>
              <button
                type="button"
                onClick={() =>
                  fillDemoUser("sana@example.com", "Sana@PropDesk2026", "Agent (Sana)")
                }
                className="px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium transition text-center"
              >
                Sana (Agent #3)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
