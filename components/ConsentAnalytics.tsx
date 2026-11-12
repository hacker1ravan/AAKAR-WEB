"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Script from "next/script";

const KEY = "cookie-consent";

// Google Analytics loads only after the visitor accepts. Login and cart cookies are essential and need no consent.
export default function ConsentAnalytics({ gaId }: { gaId: string }) {
  const [choice, setChoice] = useState<"accepted" | "declined" | null | undefined>(undefined);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      setChoice(saved === "accepted" || saved === "declined" ? saved : null);
    } catch {
      setChoice(null);
    }
  }, []);

  const save = (v: "accepted" | "declined") => {
    try { localStorage.setItem(KEY, v); } catch {}
    setChoice(v);
  };

  if (choice === undefined) return null;
  return (
    <>
      {choice === "accepted" && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`} strategy="afterInteractive" />
          <Script id="ga" strategy="afterInteractive">{`
            window.dataLayer=window.dataLayer||[];
            function gtag(){dataLayer.push(arguments)}
            gtag('js',new Date());gtag('config',${JSON.stringify(gaId)});
          `}</Script>
        </>
      )}
      {choice === null && (
        <div role="dialog" aria-label="Cookie notice" className="fixed bottom-0 inset-x-0 z-30 bg-white border-t shadow-lg p-4 text-sm">
          <div className="max-w-3xl mx-auto flex flex-col sm:flex-row sm:items-center gap-3">
            <p className="flex-1">
              We use cookies to see how many people visit the store (Google Analytics). Cookies needed for login and your cart are always on.{" "}
              <Link href="/privacy-policy" className="underline">Privacy policy</Link>
            </p>
            <div className="flex gap-2">
              <button className="border rounded px-4 py-2" onClick={() => save("declined")}>Decline</button>
              <button className="bg-black text-white rounded px-4 py-2" onClick={() => save("accepted")}>Accept</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
