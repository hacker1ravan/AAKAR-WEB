"use client";
export default function CookieSettings() {
  return (
    <button type="button" className="underline" onClick={() => {
      try { localStorage.removeItem("cookie-consent"); } catch {}
      window.location.reload();
    }}>Cookie settings</button>
  );
}
