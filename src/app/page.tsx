"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getStoredUser } from "@/lib/api";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const user = getStoredUser();
    if (user) {
      router.replace("/requirements");
    } else {
      router.replace("/login");
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center text-slate-500 text-sm">
      Loading PropDesk...
    </div>
  );
}
