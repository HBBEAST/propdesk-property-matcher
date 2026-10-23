"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import {
  ApiError,
  CsvImportResponse,
  User,
  apiFetch,
  getStoredUser,
} from "@/lib/api";

export default function CsvImportPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<CsvImportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) {
      router.push("/login");
      return;
    }
    setUser(stored);
  }, [router]);

  const handleUploadFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError("Please select a CSV file to upload.");
      return;
    }
    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      const res = await apiFetch<CsvImportResponse>("/properties/import", {
        method: "POST",
        body: formData,
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to import CSV file.");
    } finally {
      setUploading(false);
    }
  };

  if (user && user.role !== "manager") {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar user={user} />
        <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-12 text-center">
          <div className="bg-white rounded-xl border border-slate-200 p-8">
            <h1 className="text-lg font-bold text-slate-900 mb-1">403 — Manager Access Required</h1>
            <Link href="/requirements" className="inline-block mt-4 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium">
              Back to Requirements
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-slate-900 mb-1">Import Properties from CSV</h1>
        <p className="text-sm text-slate-500 mb-6">
          Columns: <code>title,locality,deal,type,bhk,price</code>
        </p>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm mb-6">
          <form onSubmit={handleUploadFile} className="space-y-4">
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-slate-700"
            />
            <button
              type="submit"
              disabled={uploading}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold"
            >
              {uploading ? "Importing..." : "Upload & Import CSV"}
            </button>
          </form>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        {result && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                Imported: {result.imported}
              </span>
              <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                Row Errors: {result.errors.length}
              </span>
            </div>

            {result.errors.length > 0 && (
              <table className="w-full text-left border-collapse text-sm border border-slate-200">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                    <th className="py-2 px-3">Line #</th>
                    <th className="py-2 px-3">Field</th>
                    <th className="py-2 px-3">Message</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {result.errors.map((err, idx) => (
                    <tr key={idx}>
                      <td className="py-2 px-3 font-mono text-xs">Line {err.line}</td>
                      <td className="py-2 px-3 font-mono text-xs text-red-700">{err.field}</td>
                      <td className="py-2 px-3 text-xs">{err.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
