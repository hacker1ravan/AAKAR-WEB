"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { api } from "@/lib/fetcher";

type Ctx = { has: (id: string) => boolean; toggle: (id: string) => Promise<void> };
const W = createContext<Ctx>(null as unknown as Ctx);
export const useWishlist = () => useContext(W);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();
  const [ids, setIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (status === "authenticated")
      api("/api/wishlist").then((r: string[]) => setIds(new Set(r))).catch(() => {});
    else if (status === "unauthenticated") setIds(new Set());
  }, [status]);

  const toggle = async (id: string) => {
    if (status !== "authenticated") return router.push("/login");
    try {
      const r = await api("/api/wishlist", "POST", { productId: id });
      setIds((prev) => {
        const n = new Set(prev);
        if (r.saved) n.add(id);
        else n.delete(id);
        return n;
      });
    } catch {}
  };

  return <W.Provider value={{ has: (id) => ids.has(id), toggle }}>{children}</W.Provider>;
}
