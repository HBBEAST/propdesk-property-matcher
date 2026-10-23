"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { User, apiFetch, clearAuthSession } from "@/lib/api";

interface NavbarProps {
  user: User | null;
}

export default function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();

  if (!user) return null;

  const handleLogout = async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch {}
    clearAuthSession();
    router.push("/login");
  };

  const navLinkClass = (active: boolean) =>
    `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
      active
        ? "nav-active bg-indigo-600 text-white"
        : "text-slate-700 hover:bg-slate-100"
    }`;

  return (
    <header className="app-navbar bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-6">
          <Link
            href="/requirements"
            className="flex items-center gap-2 font-bold text-slate-900 text-lg"
          >
            <span className="bg-indigo-600 text-white px-2 py-0.5 rounded text-sm">
              🏢 PD
            </span>
            <span>PropDesk Indore</span>
          </Link>

          <nav className="flex items-center gap-1.5 flex-wrap">
            <Link
              href="/requirements"
              className={navLinkClass(pathname === "/requirements")}
            >
              Requirements
            </Link>
            <Link
              href="/requirements/new"
              className={navLinkClass(pathname === "/requirements/new")}
            >
              + Add Requirement
            </Link>
            <Link
              href="/properties"
              className={navLinkClass(pathname.startsWith("/properties"))}
            >
              Properties
            </Link>
            {user.role === "manager" && (
              <Link
                href="/import"
                className={navLinkClass(pathname === "/import")}
              >
                Import CSV
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-sm font-semibold text-slate-900 leading-tight">
              {user.name}
            </div>
            <div className="text-xs text-slate-500 flex items-center justify-end gap-1">
              <span
                className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wide ${
                  user.role === "manager"
                    ? "bg-purple-100 text-purple-800"
                    : "bg-emerald-100 text-emerald-800"
                }`}
              >
                {user.role}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
          >
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
