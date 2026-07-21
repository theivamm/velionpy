"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@velion/shared";

export default function HomeRedirect() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      router.replace("/clients");
    }
  }, [router, loading]);

  return null;
}
