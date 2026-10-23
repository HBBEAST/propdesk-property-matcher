"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, User, apiFetch, saveAuthSession } from "@/lib/api";

interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 bg-slate-50">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8">
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 font-bold text-slate-900 text-xl mb-1">
            <span className="bg-indigo-600 text-white px-2.5 py-0.5 rounded text-sm">PD</span>
            <span>PropDesk Property Matcher</span>
          </div>
          <p className="text-sm text-slate-500">
            Indore Real Estate Brokerage CRM — Sign in to continue
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium text-sm transition-colors"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
